import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FakeModelProvider } from '../core/fake-provider';
import type { ModelProvider } from '../core/types';
import { Router } from '../router/router';
import { loadShippedFixtures, parseFixture, type LoadedFixture } from './fixture';
import { modelVersionOf, runFixture, runSet, summarize, type EvalDeps } from './runner';
import { scoreFindings } from './scorers/findings';
import { sampleOutputPath, selfTest, SELF_TEST_BAR } from './self-test';

const repoRoot = resolve(import.meta.dir, '..', '..', '..');
const shipped = loadShippedFixtures(repoRoot);
const lawBeatsPractice = shipped.find(l => l.fixture.id === 'law-beats-practice')!;

function deps(providers: ModelProvider[], extra: Partial<EvalDeps> = {}): EvalDeps {
  return {
    pluginRoot: repoRoot,
    providers,
    router: new Router({ default: providers[0]!.id }, providers),
    tmpDir: mkdtempSync(join(tmpdir(), 'evals-run-')),
    now: () => new Date('2026-09-02T10:00:00.000Z'),
    ...extra,
  };
}

const sampleOf = (id: string): unknown => JSON.parse(readFileSync(sampleOutputPath(repoRoot, id), 'utf8'));

describe('runFixture', () => {
  test('runs the fixture through the loop in a temp vault and scores the typed answer', async () => {
    const fake = new FakeModelProvider([{ output: sampleOf('law-beats-practice'), usage: { inputTokens: 1200, outputTokens: 300, costUsd: 0.02 } }]);
    const d = deps([fake]);
    const [r] = await runFixture({ loaded: lawBeatsPractice, providerId: 'fake/fake', deps: d });
    expect(r!.score).toBe(1);
    expect(r!.terms.recall).toBe(1);
    expect(r!.fixtureId).toBe('law-beats-practice');
    expect(r!.source).toBe('shipped');
    expect(r!.task).toBe('review');
    expect(r!.providerId).toBe('fake/fake');
    expect(r!.modelVersion).toBe('fake');
    expect(r!.at).toBe('2026-09-02T10:00:00.000Z');
    expect(r!.usage).toEqual({ inputTokens: 1200, outputTokens: 300, costUsd: 0.02 });
    expect(r!.costUsd).toBe(0.02);
    expect(typeof r!.runId).toBe('string');
    expect(r!.durationMs).toBeGreaterThanOrEqual(0);
    expect(r!.error).toBeUndefined();
    // The temp vault is gone once the line is back.
    expect(existsSync(join(d.tmpDir!, 'counsel-eval-'))).toBe(false);
  });

  test('a fixture task override changes the task the line records', async () => {
    const fake = new FakeModelProvider([{ output: sampleOf('law-beats-practice') }]);
    const [r] = await runFixture({ loaded: lawBeatsPractice, providerId: 'fake/fake', task: 'redline', deps: deps([fake]) });
    expect(r!.task).toBe('redline');
  });

  test('a step error yields score null with the message, never a zero', async () => {
    const fake = new FakeModelProvider([{ error: 'provider exploded' }]);
    const [r] = await runFixture({ loaded: lawBeatsPractice, providerId: 'fake/fake', deps: deps([fake]) });
    expect(r!.score).toBeNull();
    expect(r!.error).toMatch(/provider exploded/);
    expect(r!.terms).toEqual({});
  });

  test('an answer that fails the scorer schema is an error line too', async () => {
    const fake = new FakeModelProvider([{ output: { findings: 'nope' } }]);
    const [r] = await runFixture({ loaded: lawBeatsPractice, providerId: 'fake/fake', deps: deps([fake]) });
    expect(r!.score).toBeNull();
    expect(typeof r!.error).toBe('string');
  });

  test('a legacy fixture with no vault is an error line, not a throw', async () => {
    const legacy = shipped.find(l => l.fixture.id === 'demo-nda')!;
    const [r] = await runFixture({ loaded: legacy, providerId: 'fake/fake', deps: deps([new FakeModelProvider([{ text: 'x' }])]) });
    expect(r!.score).toBeNull();
    expect(r!.error).toMatch(/has no vault/);
  });

  test('documents[] run one step each in the same vault, one line per document', async () => {
    const loaded: LoadedFixture = {
      ...lawBeatsPractice,
      fixture: parseFixture({
        id: 'batch',
        scorer: 'classification',
        vault: 'law-beats-practice',
        documents: [
          { id: 'one', task: 'Which kind of agreement is this?', expected: { answer: 'msa' } },
          { id: 'two', task: 'And this one?', expected: { answer: 'nda' } },
        ],
      }),
    };
    const fake = new FakeModelProvider([{ output: { answer: 'MSA' } }, { output: { answer: 'sow' } }]);
    const rs = await runFixture({ loaded, providerId: 'fake/fake', deps: deps([fake]) });
    expect(rs.map(r => [r.documentId, r.score])).toEqual([
      ['one', 1],
      ['two', 0],
    ]);
    expect(rs[0]!.fixtureId).toBe('batch');
  });

  test('a rubric fixture runs untyped and is judged', async () => {
    const loaded: LoadedFixture = {
      ...lawBeatsPractice,
      fixture: parseFixture({ id: 'memo', scorer: 'rubric', vault: 'law-beats-practice', task: 'Draft a short memo on the cap.', expected: { criteria: [{ id: 'mentions-cap', text: 'Mentions the cap.' }] } }),
    };
    const fake = new FakeModelProvider([{ text: 'The cap is too low.' }]);
    const seen: string[] = [];
    const judge = async (_c: { id: string }, answer: string) => {
      seen.push(answer);
      return { pass: answer.includes('cap') };
    };
    const [r] = await runFixture({ loaded, providerId: 'fake/fake', deps: deps([fake], { judge }) });
    expect(r!.score).toBe(1);
    expect(seen).toEqual(['The cap is too low.']);
    expect(r!.task).toBe('draft');
  });

  test('modelVersionOf strips the vendor prefix', () => {
    expect(modelVersionOf('anthropic/claude-opus-5')).toBe('claude-opus-5');
    expect(modelVersionOf('ollama/llama3.1:8b')).toBe('llama3.1:8b');
    expect(modelVersionOf('bare')).toBe('bare');
  });
});

describe('runSet', () => {
  test('runs fixtures one at a time, reporting progress and each line; summarize never averages a null', async () => {
    const two = shipped.filter(l => l.fixture.id === 'law-beats-practice' || l.fixture.id === 'escalation-trigger');
    const fake = new FakeModelProvider([{ output: sampleOf(two[0]!.fixture.id), usage: { inputTokens: 1, outputTokens: 1, costUsd: 0.5 } }, { error: 'boom' }]);
    const progress: string[] = [];
    const lines: string[] = [];
    const rs = await runSet({
      fixtures: two,
      providerId: 'fake/fake',
      deps: deps([fake]),
      onProgress: p => progress.push(`${p.phase}:${p.index + 1}/${p.total}:${p.fixtureId}`),
      onResult: l => lines.push(l.fixtureId),
    });
    expect(progress).toEqual([`start:1/2:${two[0]!.fixture.id}`, `result:1/2:${two[0]!.fixture.id}`, `start:2/2:${two[1]!.fixture.id}`, `result:2/2:${two[1]!.fixture.id}`]);
    expect(lines).toEqual(two.map(l => l.fixture.id));
    expect(summarize(rs)).toEqual({ count: 2, scored: 1, failed: 1, mean: 1, costUsd: 0.5 });
    expect(summarize([])).toEqual({ count: 0, scored: 0, failed: 0, mean: null, costUsd: 0 });
  });
});

describe('self-test and parity with the Python scorer', () => {
  test('every shipped sample output scores at or above the bar', () => {
    const { rows, ok } = selfTest(repoRoot);
    expect(ok).toBe(true);
    expect(rows.length).toBe(shipped.length);
    for (const r of rows) expect(r.score).toBeGreaterThanOrEqual(SELF_TEST_BAR);
  });

  test('the saved baseline (scripts/run_evals.py on the sample outputs) reproduces exactly', () => {
    const baseline = JSON.parse(readFileSync(join(repoRoot, 'evals', 'baselines', 'claude-fable-5.json'), 'utf8')) as { scores: Record<string, number>; mean: number };
    const ids = Object.keys(baseline.scores).sort();
    expect(ids.length).toBe(8);
    let sum = 0;
    for (const id of ids) {
      const loaded = shipped.find(l => l.fixture.id === id)!;
      const r = scoreFindings(loaded.fixture, sampleOf(id));
      expect([id, r.score]).toEqual([id, baseline.scores[id]!]);
      sum += r.score!;
    }
    expect(Math.round((sum / ids.length) * 10_000) / 10_000).toBe(baseline.mean);
  });
});
