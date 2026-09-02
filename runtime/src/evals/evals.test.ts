import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { simpleDocx } from '../docx/test/builder';
import { estimateCost, needsConfirmation } from './cost';
import { loadFixtures, loadPracticeFixtures, loadShippedFixtures, parseFixture, taskForScorer, type LoadedFixture } from './fixture';
import { appendResult, readResults, resultsPath, type EvalResult } from './results';
import { FindingsAnswer, outputSchemaFor } from './schemas';
import { scoreClassification, scoreExtraction, scoreFindings, scoreOutput, scoreRedline, scoreRubric } from './scorers/index';
import { prepareFixtureVault } from './vault-prep';

const repoRoot = resolve(import.meta.dir, '..', '..', '..');

const v1 = {
  id: 'law-beats-practice',
  title: 'Law beats practice',
  vault: 'law-beats-practice',
  task: 'Review the attached agreement.',
  expected_catches: [
    { id: 'wrong-cap', severity: 'red', match_any: ['cap', 'limitation of liability'] },
    { id: 'notice', severity: 'green', match_any: ['notice period'] },
  ],
  negative_checks: [{ id: 'no-indemnity-flag', match_any: ['indemnif'] }],
  expected_citations: [{ id: 'law-cap', aliases: ['law/contracts/liability.md'] }],
  allowed_citation_aliases: ['law/', 'practice/'],
};

const good = {
  findings: [
    { title: 'Cap below the statutory floor', severity: 'red', clause: '9.1', rationale: 'The limitation of liability cap is under the floor.', citations: ['law/contracts/liability.md'] },
    { title: 'Notice period short', severity: 'green', clause: '14', rationale: 'The notice period is 5 days.', citations: [] },
  ],
  citations: [],
};

describe('fixture v2', () => {
  test('a v1 fixture parses with the findings scorer', () => {
    const f = parseFixture(v1);
    expect(f.scorer).toBe('findings');
    expect(f.expected_catches).toHaveLength(2);
    expect(f.negative_checks[0]!.match_any).toEqual(['indemnif']);
    expect(taskForScorer(f.scorer)).toBe('review');
  });

  test('every shipped fixture parses', () => {
    const all = loadShippedFixtures(repoRoot);
    expect(all.length).toBeGreaterThanOrEqual(13);
    expect(all.every(l => l.fixture.scorer === 'findings')).toBe(true);
  });

  test('a v2 extraction fixture parses; a rubric fixture without criteria does not', () => {
    const f = parseFixture({ id: 'parties', scorer: 'extraction', task: 'Extract the parties.', expected: { fields: { buyer: { match_any: ['acme'] } } } });
    expect(f.scorer).toBe('extraction');
    expect(() => parseFixture({ id: 'memo', scorer: 'rubric', task: 'Draft a memo.', expected: { criteria: [] } })).toThrow(/rubric scorer needs/);
    expect(() => parseFixture({ id: 'Bad Id', task: 'x' })).toThrow(/slug/);
  });

  test('documents[] carry their own expected block and are checked per document', () => {
    expect(() =>
      parseFixture({ id: 'batch', scorer: 'classification', vault: 'v', documents: [{ id: 'a', task: 'Which?', expected: { answer: 'nda' } }, { id: 'b', task: 'Which?', expected: {} }] }),
    ).toThrow(/documents\.b/);
  });

  test('practice fixtures load from <vault>/practice/evals and the two sets concatenate', () => {
    const vaultRoot = mkdtempSync(join(tmpdir(), 'evals-vault-'));
    mkdirSync(join(vaultRoot, 'practice', 'evals'), { recursive: true });
    writeFileSync(join(vaultRoot, 'practice', 'evals', 'mine.json'), JSON.stringify({ ...v1, id: 'mine', source: { kind: 'practice' } }), 'utf8');
    const practice = loadPracticeFixtures(vaultRoot);
    expect(practice).toHaveLength(1);
    expect(practice[0]!.set).toBe('practice');
    expect(practice[0]!.vaultsDir).toBe(join(vaultRoot, 'practice', 'evals', 'vaults'));
    expect(loadFixtures({ repoRoot, vaultRoot }).map(l => l.fixture.id)).toContain('mine');
    expect(loadPracticeFixtures(mkdtempSync(join(tmpdir(), 'evals-empty-')))).toEqual([]);
  });
});

describe('findings scorer', () => {
  test('a full match scores 1.0 with the Python term names', () => {
    const r = scoreFindings(parseFixture(v1), good);
    expect(r.score).toBe(1);
    expect(r.terms).toEqual({ recall: 1, precision_guard: 1, citation_coverage: 1, hallucination_score: 1 });
    expect(r.notes).toEqual([]);
  });

  test('a missed catch, a false positive, a missed citation and an unknown citation each cost their term', () => {
    const out = {
      findings: [{ title: 'Indemnification is one-sided', severity: 'yellow', clause: '10', rationale: 'indemnify only the buyer', citations: ['https://example.com/blog'] }],
      citations: [],
    };
    const r = scoreFindings(parseFixture(v1), out);
    expect(r.terms).toEqual({ recall: 0, precision_guard: 0, citation_coverage: 0, hallucination_score: 0 });
    expect(r.score).toBe(0);
    expect(r.detail.missed_catches).toEqual(['wrong-cap', 'notice']);
    expect(r.detail.false_positives).toEqual(['no-indemnity-flag']);
    expect(r.detail.unknown_citations).toEqual(['https://example.com/blog']);
    expect(r.notes.join(' ')).toMatch(/Missed: wrong-cap, notice/);
  });

  test('recall alone gives 0.45 × fraction (the Python weights)', () => {
    const out = { findings: [{ title: 'Cap too low', severity: 'red', clause: '9', rationale: '', citations: ['law/contracts/liability.md'] }], citations: [] };
    const r = scoreFindings(parseFixture(v1), out);
    expect(r.terms.recall).toBe(0.5);
    expect(r.score).toBe(0.775);
  });

  test('the severity band: one band off still matches, two bands off does not, `any` waives it', () => {
    const green = { findings: [{ title: 'Cap too low', severity: 'green', clause: '9', rationale: '', citations: [] }], citations: [] };
    const yellow = { findings: [{ title: 'Cap too low', severity: 'yellow', clause: '9', rationale: '', citations: [] }], citations: [] };
    const only = (severity: string) => parseFixture({ ...v1, expected_catches: [{ id: 'wrong-cap', severity, match_any: ['cap'] }], expected_citations: [] });
    expect(scoreFindings(only('red'), green).detail.wrong_band).toEqual(['wrong-cap']);
    expect(scoreFindings(only('red'), green).terms.recall).toBe(0);
    expect(scoreFindings(only('red'), green).notes.join(' ')).toMatch(/wrong severity: wrong-cap/);
    expect(scoreFindings(only('red'), yellow).terms.recall).toBe(1);
    expect(scoreFindings(only('any'), green).terms.recall).toBe(1);
  });

  test('matching is normalized: case and whitespace do not matter, and citations inside findings count', () => {
    const out = { findings: [{ title: 'LIMITATION   OF\nLIABILITY', severity: 'red', clause: '', rationale: '', citations: ['LAW/contracts/Liability.md'] }, { title: 'notice period', severity: 'green', clause: '', rationale: '', citations: [] }], citations: [] };
    expect(scoreFindings(parseFixture(v1), out).score).toBe(1);
  });

  test('fixture weights override the defaults', () => {
    const f = parseFixture({ ...v1, weights: { recall: 1, precision_guard: 0, citation_coverage: 0, hallucination_score: 0 } });
    expect(scoreFindings(f, { findings: [], citations: ['nowhere'] }).score).toBe(0);
    expect(scoreFindings(f, { ...good, citations: ['nowhere'] }).score).toBe(1);
  });
});

describe('extraction scorer', () => {
  const expected = { fields: { buyer: { match_any: ['acme'] }, seller: { match_any: ['globex'] }, term: { match_any: ['3 years', 'three years'], required: false } } };
  test('all required fields found, nothing extra → 1', () => {
    expect(scoreExtraction(expected, { fields: { buyer: 'Acme Corp.', seller: ['Globex LLC'] } }).score).toBe(1);
  });
  test('a missed required field lowers recall; a field never asked for lowers precision', () => {
    const r = scoreExtraction(expected, { fields: { buyer: 'Acme Corp.', governing_law: 'Delaware' } });
    expect(r.terms.recall).toBe(0.5);
    expect(r.terms.precision).toBe(0.5);
    expect(r.score).toBe(0.5);
    expect(r.notes).toEqual(['Missed: seller.', 'Not asked for: governing_law.']);
  });
  test('an optional field wrong does not hurt recall', () => {
    expect(scoreExtraction(expected, { fields: { buyer: 'acme', seller: 'globex', term: 'one year' } }).terms.recall).toBe(1);
  });
});

describe('classification scorer', () => {
  test('exact answer or an accepted alias, normalized', () => {
    const expected = { answer: 'nda', accept: ['non-disclosure agreement'] };
    expect(scoreClassification(expected, { answer: 'NDA' }).score).toBe(1);
    expect(scoreClassification(expected, { answer: 'Non-Disclosure  Agreement' }).score).toBe(1);
    const r = scoreClassification(expected, { answer: 'msa' });
    expect(r.score).toBe(0);
    expect(r.notes[0]).toMatch(/Answered "msa"/);
  });
});

describe('redline scorer', () => {
  const doc = simpleDocx('1. The Term is one year.', '2. Governing law is Delaware.', '3. Confidential for five years.');
  const expected = {
    document: 'matters/x/draft.docx',
    items: [{ current: 'one year', proposed_any: ['two years'] }, { current: 'five years', proposed_any: ['three years', '3 years'] }],
    must_not_touch: ['Governing law is Delaware'],
  };
  const ctx = { readDocument: () => doc };

  test('both expected edits, applied, with comments → 1', () => {
    const out = { items: [{ current: 'one year', proposed: 'two years', comment: 'Standard term.' }, { current: 'five years', proposed: 'three years', comment: 'Practice cap.' }] };
    const r = scoreRedline(expected, out, ctx);
    expect(r.score).toBe(1);
    expect(r.terms).toEqual({ covered: 1, applied: 1, untouched: 1, comments: 1 });
  });

  test('one edit missing, one on protected text, an edit that does not apply, no comments', () => {
    const out = { items: [{ current: 'one year', proposed: 'two years' }, { current: 'Governing law is Delaware', proposed: 'Governing law is New York' }, { current: 'not in the document', proposed: 'x' }] };
    const r = scoreRedline(expected, out, ctx);
    expect(r.terms.covered).toBe(0.5);
    expect(r.terms.untouched).toBe(0);
    expect(r.terms.applied).toBeCloseTo(2 / 3, 4);
    expect(r.terms.comments).toBe(0);
    expect(r.notes.join(' ')).toMatch(/Did not make the expected edit/);
    expect(r.notes.join(' ')).toMatch(/Edited protected text/);
    expect(r.notes.join(' ')).toMatch(/1 of 3 edits did not apply/);
  });

  test('no edits at all scores the covered term 0 and says so', () => {
    const r = scoreRedline(expected, { items: [] }, ctx);
    expect(r.terms.covered).toBe(0);
    expect(r.notes).toContain('No edits were produced.');
  });

  test('the scorer needs a document reader', () => {
    expect(() => scoreRedline(expected, { items: [] })).toThrow(/readDocument/);
  });
});

describe('rubric scorer', () => {
  const expected = { criteria: [{ id: 'cites-the-rule', text: 'Cites the governing rule.', weight: 2 }, { id: 'plain', text: 'Written in plain English.' }] };
  test('weighted pass rate over the judged criteria', async () => {
    const judge = async (c: { id: string }) => ({ pass: c.id === 'cites-the-rule', quote: 'no jargon check' });
    const r = await scoreRubric(expected, 'The rule is Rule 12(b)(6)...', { judge });
    expect(r.score).toBeCloseTo(2 / 3, 4);
    expect(r.terms).toEqual({ 'cites-the-rule': 1, plain: 0 });
    expect(r.notes).toEqual(['plain: not met — "no jargon check".']);
  });
  test('a failed judge call leaves that criterion unjudged; all failed → score null', async () => {
    const flaky = async (c: { id: string }) => {
      if (c.id === 'plain') throw new Error('judge timed out');
      return { pass: true };
    };
    const r = await scoreRubric(expected, { text: 'memo' }, { judge: flaky });
    expect(r.score).toBe(1);
    expect(r.notes).toEqual(['plain: not judged (judge timed out).']);
    const dead = await scoreRubric(expected, 'memo', {
      judge: async () => {
        throw new Error('down');
      },
    });
    expect(dead.score).toBeNull();
  });
  test('the scorer needs a judge', async () => {
    await expect(scoreRubric(expected, 'x')).rejects.toThrow(/judge/);
  });
});

describe('scoreOutput', () => {
  test('dispatches on the fixture scorer and applies fixture weights', async () => {
    const f = parseFixture({ id: 'c', scorer: 'classification', task: 't', expected: { answer: 'nda' } });
    expect((await scoreOutput(f, null, { answer: 'nda' })).score).toBe(1);
    const doc = parseFixture({ id: 'b', scorer: 'classification', task: 't', documents: [{ id: 'one', task: 't', expected: { answer: 'msa' } }] });
    expect((await scoreOutput(doc, doc.documents![0]!, { answer: 'msa' })).score).toBe(1);
  });
});

describe('output schemas', () => {
  test('one typed answer per scorer; the rubric runs untyped', () => {
    expect(FindingsAnswer.safeParse(good).success).toBe(true);
    expect(FindingsAnswer.safeParse({ findings: [{ title: 'x', severity: 'purple', clause: '', rationale: '', citations: [] }], citations: [] }).success).toBe(false);
    expect(outputSchemaFor('extraction')!.safeParse({ fields: { a: 'b', c: ['d'] } }).success).toBe(true);
    expect(outputSchemaFor('classification')!.safeParse({ answer: 1 }).success).toBe(false);
    expect(outputSchemaFor('redline')!.safeParse({ items: [{ current: 'a', proposed: 'b', comment: null }] }).success).toBe(true);
    expect(outputSchemaFor('rubric')).toBeUndefined();
  });
});

describe('vault prep', () => {
  test('copies the fixture vault to a temp dir and rewrites __VAULT_PATH__', () => {
    const loaded = loadShippedFixtures(repoRoot).find(l => l.fixture.id === 'law-beats-practice')!;
    const tmpDir = mkdtempSync(join(tmpdir(), 'evals-prep-'));
    const p = prepareFixtureVault(loaded, { tmpDir });
    expect(p.vault).toBe(join(p.tmp, 'vault'));
    const cfg = readFileSync(join(p.vault, 'config.md'), 'utf8');
    expect(cfg).not.toContain('__VAULT_PATH__');
    expect(cfg).toContain(p.vault);
    expect(existsSync(join(p.vault, 'law'))).toBe(true);
    p.remove();
    expect(existsSync(p.tmp)).toBe(false);
  });

  test('a legacy fixture with no vault cannot be prepared', () => {
    const loaded: LoadedFixture = { fixture: parseFixture({ id: 'demo-nda', task: 'x' }), set: 'shipped', file: 'x', vaultsDir: join(repoRoot, 'evals', 'vaults') };
    expect(() => prepareFixtureVault(loaded)).toThrow(/has no vault/);
    const missing: LoadedFixture = { ...loaded, fixture: parseFixture({ id: 'ghost', vault: 'nope', task: 'x' }) };
    expect(() => prepareFixtureVault(missing)).toThrow(/vault not found/);
  });
});

describe('results store', () => {
  const line = (at: string, id: string): EvalResult => ({ at, fixtureId: id, source: 'shipped', task: 'review', providerId: 'fake/fake', modelVersion: 'fake', score: 1, terms: {}, notes: [], durationMs: 1 });
  test('appends under .counsel/evals and reads back, filtered by since', () => {
    const vaultRoot = mkdtempSync(join(tmpdir(), 'evals-results-'));
    expect(readResults(vaultRoot)).toEqual([]);
    appendResult(vaultRoot, line('2026-09-01T00:00:00.000Z', 'a'));
    appendResult(vaultRoot, line('2026-09-02T00:00:00.000Z', 'b'));
    expect(resultsPath(vaultRoot)).toBe(join(vaultRoot, '.counsel', 'evals', 'results.jsonl'));
    expect(readResults(vaultRoot).map(r => r.fixtureId)).toEqual(['a', 'b']);
    expect(readResults(vaultRoot, { since: '2026-09-02T00:00:00.000Z' }).map(r => r.fixtureId)).toEqual(['b']);
  });
  test('a torn line is skipped', () => {
    const vaultRoot = mkdtempSync(join(tmpdir(), 'evals-results-'));
    appendResult(vaultRoot, line('2026-09-01T00:00:00.000Z', 'a'));
    writeFileSync(resultsPath(vaultRoot), `${readFileSync(resultsPath(vaultRoot), 'utf8')}{"at": "2026-`, 'utf8');
    expect(readResults(vaultRoot)).toHaveLength(1);
  });
});

describe('cost estimate', () => {
  test('count × discovered pricing over the assumed step; null without pricing', () => {
    expect(estimateCost(8, { prompt: 3, completion: 15 })).toBe(1.32);
    expect(estimateCost(8, null)).toBeNull();
    expect(needsConfirmation(1.32)).toBe(true);
    expect(needsConfirmation(0.4)).toBe(false);
    expect(needsConfirmation(null)).toBe(false);
  });
});
