import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendOutcome, countOutcomes, outcomesEnabled, outcomesPath, readOutcomes } from './store';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'outcomes-'));
}

describe('the outcomes record (routing-and-evals spec §7)', () => {
  test('append writes one JSON line under .counsel, owner-only, stamped now when no `at` is given', () => {
    const r = root();
    expect(appendOutcome(r, {}, { kind: 'answer.marked', threadId: 't1', runId: 'r1', detail: { mark: 'useful' } })).toBe(true);
    expect(appendOutcome(r, {}, { kind: 'thread.deleted', threadId: 't2', at: '2026-08-01T00:00:00.000Z', detail: {} })).toBe(true);
    const lines = readFileSync(outcomesPath(r), 'utf8').trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]!) as { at: string; kind: string; detail: { mark: string } };
    expect(first.kind).toBe('answer.marked');
    expect(Number.isNaN(Date.parse(first.at))).toBe(false);
    expect(first.detail.mark).toBe('useful');
    expect((JSON.parse(lines[1]!) as { at: string }).at).toBe('2026-08-01T00:00:00.000Z');
    if (process.platform !== 'win32') {
      expect(statSync(outcomesPath(r)).mode & 0o777).toBe(0o600);
      expect(statSync(join(r, '.counsel')).mode & 0o777).toBe(0o700);
    }
  });

  test('`outcomes: off` stops every write; absent means on', () => {
    const r = root();
    expect(outcomesEnabled({})).toBe(true);
    expect(outcomesEnabled({ outcomes: false })).toBe(false);
    expect(appendOutcome(r, { outcomes: false }, { kind: 'thread.deleted', detail: {} })).toBe(false);
    expect(existsSync(outcomesPath(r))).toBe(false);
  });

  test('read returns oldest first, filters by since and kind, and skips a corrupt line', () => {
    const r = root();
    appendOutcome(r, {}, { kind: 'proposal.decided', at: '2026-07-01T00:00:00.000Z', detail: { decision: 'approved' } });
    appendOutcome(r, {}, { kind: 'answer.marked', at: '2026-08-01T00:00:00.000Z', detail: { mark: 'not-right' } });
    writeFileSync(outcomesPath(r), `${readFileSync(outcomesPath(r), 'utf8')}{not json\n`, 'utf8');
    appendOutcome(r, {}, { kind: 'proposal.decided', at: '2026-09-01T00:00:00.000Z', detail: { decision: 'rejected', reason: 'too broad' } });

    expect(readOutcomes(r).map(l => l.at)).toEqual(['2026-07-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z']);
    expect(readOutcomes(r, { since: '2026-07-15T00:00:00.000Z' })).toHaveLength(2);
    expect(readOutcomes(r, { kind: 'proposal.decided' })).toHaveLength(2);
    expect(readOutcomes(root())).toEqual([]);
  });

  test('countOutcomes tallies decisions, reasons, marks, corrections, documents and deletions', () => {
    const counts = countOutcomes([
      { at: 'a', kind: 'proposal.decided', detail: { decision: 'approved' } },
      { at: 'a', kind: 'proposal.decided', detail: { decision: 'rejected', reason: 'no' } },
      { at: 'a', kind: 'answer.marked', detail: { mark: 'useful' } },
      { at: 'a', kind: 'answer.marked', detail: { mark: 'not-right' } },
      { at: 'a', kind: 'answer.marked', detail: { mark: 'not-right' } },
      { at: 'a', kind: 'task.corrected', detail: { from: 'chat', to: 'review' } },
      { at: 'a', kind: 'artifact.produced', detail: {} },
      { at: 'a', kind: 'thread.deleted', detail: {} },
    ]);
    expect(counts).toEqual({ decisions: { approved: 1, rejected: 1, withReason: 1 }, marks: { useful: 1, notRight: 2 }, corrections: 1, documents: 1, deletedThreads: 1 });
  });
});
