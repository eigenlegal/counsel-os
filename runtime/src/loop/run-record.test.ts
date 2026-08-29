import { beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { writeRunLog } from './run-log';
import { finishRun, listRuns, readRun, runRecordPath, startRun, type RunRecord } from './run-record';

let vaultRoot: string;

beforeEach(() => {
  vaultRoot = mkdtempSync(join(tmpdir(), 'run-record-'));
});

function record(over: Partial<RunRecord> = {}): RunRecord {
  return {
    runId: randomUUID(),
    threadId: randomUUID(),
    tenant: 'default',
    startedAt: '2026-08-29T10:00:00.000Z',
    status: 'running',
    message: 'review this NDA',
    provider: 'fake/fake',
    primitivesRead: [],
    toolCalls: [],
    proposals: [],
    ...over,
  };
}

describe('runRecordPath', () => {
  test('the record sits beside its log, under the tenant', () => {
    const runId = randomUUID();
    expect(runRecordPath(vaultRoot, 'default', runId)).toBe(
      join(vaultRoot, '.counsel', 'runs', 'default', `${runId}.json`),
    );
  });

  test('a tenant or run id that would escape the runs directory is refused', () => {
    expect(() => runRecordPath(vaultRoot, '../../etc', randomUUID())).toThrow('invalid tenant');
    expect(() => runRecordPath(vaultRoot, 'default', '../../etc/passwd')).toThrow('invalid run id');
    // Not a uuid: the ids are minted by `randomUUID`, so anything else is
    // either a caller's mistake or an attempt at a path.
    expect(() => runRecordPath(vaultRoot, 'default', 'not-a-uuid')).toThrow('invalid run id');
  });
});

describe('startRun / readRun', () => {
  test('writes the record where readRun finds it, field for field', () => {
    const rec = record();
    startRun(vaultRoot, rec);
    expect(readRun(vaultRoot, rec.tenant, rec.runId)).toEqual(rec);
  });

  test('leaves no temp file behind — the write is tmp + rename', () => {
    const rec = record();
    startRun(vaultRoot, rec);
    const names = readdirSync(dirname(runRecordPath(vaultRoot, rec.tenant, rec.runId)));
    expect(names).toEqual([`${rec.runId}.json`]);
  });

  test('a well-formed run id with nothing behind it reads as null, not a throw', () => {
    expect(readRun(vaultRoot, 'default', randomUUID())).toBeNull();
  });

  test('a malformed id is a caller error, not a missing run', () => {
    expect(() => readRun(vaultRoot, 'default', 'nope')).toThrow('invalid run id');
  });
});

describe('finishRun', () => {
  test('merges the patch over the opened record and keeps everything else', () => {
    const rec = record();
    startRun(vaultRoot, rec);

    finishRun(vaultRoot, rec.tenant, rec.runId, {
      status: 'done',
      finishedAt: '2026-08-29T10:00:04.000Z',
      durationMs: 4000,
      usage: { inputTokens: 12, outputTokens: 34, costUsd: 0.5 },
      costUsd: 0.5,
      output: { findings: [] },
      primitivesRead: ['draft'],
      toolCalls: [{ name: 'read_primitive', ms: 3, isError: false }],
      proposals: ['p1'],
    });

    const after = readRun(vaultRoot, rec.tenant, rec.runId)!;
    expect(after.status).toBe('done');
    expect(after.finishedAt).toBe('2026-08-29T10:00:04.000Z');
    expect(after.durationMs).toBe(4000);
    expect(after.usage).toEqual({ inputTokens: 12, outputTokens: 34, costUsd: 0.5 });
    expect(after.costUsd).toBe(0.5);
    expect(after.output).toEqual({ findings: [] });
    expect(after.primitivesRead).toEqual(['draft']);
    expect(after.toolCalls).toEqual([{ name: 'read_primitive', ms: 3, isError: false }]);
    expect(after.proposals).toEqual(['p1']);
    // Untouched by the patch.
    expect(after.runId).toBe(rec.runId);
    expect(after.threadId).toBe(rec.threadId);
    expect(after.message).toBe('review this NDA');
    expect(after.startedAt).toBe(rec.startedAt);
  });

  test('a second patch is applied to the first one, not to the opened record', () => {
    const rec = record();
    startRun(vaultRoot, rec);
    // The loop's own sequence: the provider is filled in once resolved, then
    // the step finishes.
    finishRun(vaultRoot, rec.tenant, rec.runId, { provider: 'claude-sub/opus-5' });
    finishRun(vaultRoot, rec.tenant, rec.runId, { status: 'timeout', error: 'step timed out after 600s' });

    const after = readRun(vaultRoot, rec.tenant, rec.runId)!;
    expect(after.provider).toBe('claude-sub/opus-5');
    expect(after.status).toBe('timeout');
    expect(after.error).toBe('step timed out after 600s');
  });

  test('finishing a run that was never started is an error, not a fabricated record', () => {
    const runId = randomUUID();
    expect(() => finishRun(vaultRoot, 'default', runId, { status: 'done' })).toThrow(`unknown run: ${runId}`);
  });
});

describe('listRuns', () => {
  test('a tenant with no runs at all is an empty list', () => {
    expect(listRuns(vaultRoot, 'default', randomUUID())).toEqual([]);
  });

  test('only this thread, newest first by startedAt', () => {
    const threadId = randomUUID();
    const other = randomUUID();
    const middle = record({ threadId, startedAt: '2026-08-29T10:01:00.000Z', message: 'middle' });
    const oldest = record({ threadId, startedAt: '2026-08-29T10:00:00.000Z', message: 'oldest' });
    const newest = record({ threadId, startedAt: '2026-08-29T10:02:00.000Z', message: 'newest' });
    for (const rec of [middle, oldest, newest]) startRun(vaultRoot, rec);
    startRun(vaultRoot, record({ threadId: other, startedAt: '2026-08-29T10:03:00.000Z', message: 'elsewhere' }));

    expect(listRuns(vaultRoot, 'default', threadId).map(r => r.message)).toEqual(['newest', 'middle', 'oldest']);
  });

  test('ignores the run LOG sitting in the same directory', () => {
    const threadId = randomUUID();
    const rec = record({ threadId });
    startRun(vaultRoot, rec);
    writeRunLog(vaultRoot, 'default', rec.runId, [
      { at: rec.startedAt, provider: 'fake/fake', inputTokens: 1, outputTokens: 2, durationMs: 3, toolCalls: [] },
    ]);

    expect(listRuns(vaultRoot, 'default', threadId).map(r => r.runId)).toEqual([rec.runId]);
  });

  test('a corrupt record is skipped rather than failing the whole listing', () => {
    const threadId = randomUUID();
    const rec = record({ threadId });
    startRun(vaultRoot, rec);
    writeFileSync(join(dirname(runRecordPath(vaultRoot, 'default', rec.runId)), `${randomUUID()}.json`), '{ not json', 'utf8');

    expect(listRuns(vaultRoot, 'default', threadId).map(r => r.runId)).toEqual([rec.runId]);
  });

  test('a tenant that would escape the runs directory is refused', () => {
    expect(() => listRuns(vaultRoot, '../../etc', randomUUID())).toThrow('invalid tenant');
  });
});
