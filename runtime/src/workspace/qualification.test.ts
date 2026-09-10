import { expect, test } from 'bun:test';
import { FakeModelProvider } from '../core/fake-provider';
import { qualificationEvidence, qualificationOptions, runQualification } from './qualification';
import type { Turn } from './conversations';

test('qualification defaults to a plan, requires explicit usage consent and has no API path or user database argument', () => {
  expect(qualificationOptions([])).toEqual({ mode: 'plan' });
  expect(qualificationOptions(['--help'])).toEqual({ mode: 'plan' });
  expect(qualificationOptions(['--fixture'])).toEqual({ mode: 'fixture' });
  const valid = [
    '--live',
    '--provider',
    'codex',
    '--model',
    'explicit-test-model',
    '--allow-plan-usage',
  ];
  expect(qualificationOptions(valid)).toEqual({
    mode: 'live',
    provider: 'codex',
    model: 'explicit-test-model',
  });
  for (const args of [
    valid.slice(0, -1),
    [...valid, '--database', '/existing/workspace.sqlite3'],
    valid.map((v) => (v === 'codex' ? 'openai-api' : v)),
    [...valid, '--api-key', 'not-accepted'],
    [...valid, '--model', 'another-model'],
    ['--fixture', '--live'],
    [...valid, '--live'],
  ])
    expect(() => qualificationOptions(args)).toThrow();
});

test('the model-free qualification path checks real scoped tools, citations, output, pending briefs and byte-exact reopen without claiming model quality', async () => {
  const report = await runQualification({ label: 'deterministic-fixture' });
  expect(report.mode).toBe('model-free-fixture');
  expect(report.databasePath).toBeUndefined();
  expect(report.cases).toHaveLength(3);
  expect(report.structuralChecksPassed).toBe(true);
  expect(report.reopened).toBe(true);
  expect(report.qualification).toBe('manual-review-required');
  for (const item of report.cases) {
    expect(Object.values(item.checks).every(Boolean)).toBe(true);
    expect(item.citations.length).toBeGreaterThan(0);
    expect(item.manualReview.length).toBeGreaterThan(0);
  }
});

test('plausible-looking uncited replies fail qualification even when the app prepares context', async () => {
  let calls = 0;
  const report = await runQualification({
    label: 'unqualified-fake',
    provider: () => {
      calls++;
      return new FakeModelProvider([{ text: 'This looks plausible, but I read no records. [S1]' }]);
    },
  });
  expect(calls).toBe(3);
  expect(report.structuralChecksPassed).toBe(false);
  expect(
    report.cases.every(
      (c) => !c.checks.citedExpected && !c.checks.savedAsDraftOutput,
    ),
  ).toBe(true);
  expect(report.cases.some(c => c.checks.readExpected)).toBe(true);
  expect(report.qualification).toBe('manual-review-required');
});

test('failed providers cannot pass by omitting their output and an aborted run never starts another provider', async () => {
  const report = await runQualification({
    label: 'failed-fake',
    provider: () => new FakeModelProvider([{ error: 'Synthetic provider failure' }]),
  });
  expect(report.structuralChecksPassed).toBe(false);
  expect(
    report.cases.every((c) => c.status === 'failed' && !c.checks.completed && !c.checks.wordExport),
  ).toBe(true);
  const abort = new AbortController();
  abort.abort();
  let calls = 0;
  await expect(
    runQualification({
      label: 'aborted',
      signal: abort.signal,
      provider: () => {
        calls++;
        return new FakeModelProvider([]);
      },
    }),
  ).rejects.toThrow();
  expect(calls).toBe(0);
});

test('prepared or directly read evidence can pass without redundant search; search alone cannot pass missing reads/citations', () => {
  const expected = [{ kind: 'source' as const, id: 'source', quote: 'Required evidence.' }];
  const turn = { state: { context: [{ kind: 'source', id: 'source', ranges: [{ start: 0, end: 18 }] }],
    citations: [{ key: 'S1', target: { kind: 'source', revisionId: 'source' }, quote: 'Required evidence.', start: 0 }],
    answer: 'Assessment based on the supplied evidence. [S1]', activity: [] } } as unknown as Turn;
  expect(qualificationEvidence(turn, expected)).toEqual({ readExpected: true, citedExpected: true });
  turn.state.activity = [{ name: 'counsel_search_records', status: 'complete' }] as Turn['state']['activity'];
  turn.state.context = []; turn.state.citations = [];
  expect(qualificationEvidence(turn, expected)).toEqual({ readExpected: false, citedExpected: false });
});
