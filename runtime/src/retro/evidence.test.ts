import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DoctorReport } from '../doctor/index';
import { startRun, finishRun } from '../loop/run-record';
import { ThreadStore } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { readVaultConfig } from '../vault/resolve-root';
import { gatherRetroEvidence, renderRetroEvidence } from './evidence';
import { appendOutcome } from '../outcomes/store';
import { recordWritten } from '../outcomes/written';

const NOW = new Date('2026-09-01T12:00:00.000Z');
const SINCE = '2026-07-01T00:00:00.000Z';

async function seed(): Promise<{ vaultRoot: string; store: ThreadStore; vault: FsVaultStore }> {
  const vaultRoot = mkdtempSync(join(tmpdir(), 'retro-evidence-'));
  const store = new ThreadStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'retro-codex-')) });
  const vault = new FsVaultStore(vaultRoot);

  // Two matters: one touched in the period, one before it.
  mkdirSync(join(vaultRoot, 'matters'), { recursive: true });
  writeFileSync(join(vaultRoot, 'matters', 'acme-nda.md'), '---\ncounsel-os-type: matter\ntitle: Acme — NDA\nstage: working\n---\n# Acme\n', 'utf8');
  writeFileSync(join(vaultRoot, 'matters', 'old-msa.md'), '---\ncounsel-os-type: matter\ntitle: Old — MSA\n---\n# Old\n', 'utf8');
  utimesSync(join(vaultRoot, 'matters', 'acme-nda.md'), new Date('2026-08-10T00:00:00Z'), new Date('2026-08-10T00:00:00Z'));
  utimesSync(join(vaultRoot, 'matters', 'old-msa.md'), new Date('2026-05-10T00:00:00Z'), new Date('2026-05-10T00:00:00Z'));

  // Memory: four pattern entries and one previous snapshot.
  mkdirSync(join(vaultRoot, 'memory'), { recursive: true });
  writeFileSync(join(vaultRoot, 'memory', 'patterns.md'), '# Patterns\n\n- one\n- two\n- three\n- four\n\ntrailing prose\n', 'utf8');
  writeFileSync(join(vaultRoot, 'memory', 'retro-2026-05-01.md'), '# Retro\n', 'utf8');

  // A thread in the period with a step, three proposals and an artifact.
  const t1 = await store.create('default', { title: 'Check the Acme NDA term.' });
  await store.append('default', t1.id, { t: 'user', at: '2026-08-10T10:00:00.000Z', content: 'Check the Acme NDA term.' });
  await store.append('default', t1.id, { t: 'step', at: '2026-08-10T10:00:01.000Z', runId: 'r-1', provider: 'fake/fake', task: 'review' });
  await store.append('default', t1.id, { t: 'proposal', at: '2026-08-10T10:01:00.000Z', id: 'p-1', path: 'practice/standards/nda.md', content: 'x', rationale: 'Record the residuals fallback\nmore', status: 'approved', expectedVersion: null });
  await store.append('default', t1.id, { t: 'proposal', at: '2026-08-10T10:02:00.000Z', id: 'p-2', path: 'memory/patterns.md', content: 'x', rationale: 'Log the pattern', status: 'rejected', expectedVersion: null });
  await store.append('default', t1.id, { t: 'proposal', at: '2026-08-10T10:03:00.000Z', id: 'p-3', path: 'practice/methods/nda-triage.md', content: 'x', rationale: 'Promote the triage method', status: 'pending', expectedVersion: null });
  await store.append('default', t1.id, {
    t: 'artifact',
    at: '2026-08-10T10:04:00.000Z',
    id: 'a-1',
    kind: 'docx-redline',
    path: 'matters/acme/acme-nda-redline-2026-08-10.docx',
    source: 'matters/acme/acme-nda.docx',
    author: 'Jack Wang',
    tracked: true,
    summary: { changes: 9, comments: 3, applied: 5, skipped: 1, clauses: 3, bytes: 41000 },
  });
  await store.append('default', t1.id, { t: 'step', at: '2026-08-11T10:00:01.000Z', runId: 'r-2', provider: 'ollama/gemma4:e4b' });
  // Pin the header's updatedAt into the period (append stamps "now").
  writeFileSync(join(vaultRoot, '.counsel', 'threads', 'default', `${t1.id}.json`), JSON.stringify({ ...(await store.header('default', t1.id)), updatedAt: '2026-08-11T10:00:01.000Z' }), 'utf8');

  // A thread from before the period: not read at all.
  const t0 = await store.create('default', { title: 'Old question' });
  await store.append('default', t0.id, { t: 'step', at: '2026-04-01T10:00:00.000Z', runId: 'r-0', provider: 'fake/fake' });
  writeFileSync(join(vaultRoot, '.counsel', 'threads', 'default', `${t0.id}.json`), JSON.stringify({ ...(await store.header('default', t0.id)), updatedAt: '2026-04-01T10:00:00.000Z' }), 'utf8');

  // Run records: done, error, timeout in the period; one before it.
  const base = { threadId: t1.id, tenant: 'default' as const, message: 'm', provider: 'fake/fake', primitivesRead: ['evaluate'], toolCalls: [{ name: 'vault_read', ms: 3, isError: false }], proposals: [] };
  const runId = (n: number): string => `00000000-0000-4000-8000-00000000000${n}`;
  startRun(vaultRoot, { ...base, runId: runId(1), startedAt: '2026-08-10T10:00:01.000Z', status: 'running' });
  finishRun(vaultRoot, 'default', runId(1), { status: 'done', costUsd: 0.46, usage: { inputTokens: 10, outputTokens: 5 } });
  startRun(vaultRoot, { ...base, runId: runId(2), startedAt: '2026-08-11T10:00:01.000Z', status: 'running', primitivesRead: ['evaluate', 'draft'], toolCalls: [{ name: 'vault_read', ms: 3, isError: false }, { name: 'apply_redlines', ms: 900, isError: false }] });
  finishRun(vaultRoot, 'default', runId(2), { status: 'error', error: 'claude harness: Not logged in', costUsd: 0.1 });
  startRun(vaultRoot, { ...base, runId: runId(3), startedAt: '2026-08-12T10:00:01.000Z', status: 'running', primitivesRead: [], toolCalls: [] });
  finishRun(vaultRoot, 'default', runId(3), { status: 'timeout', error: 'step timed out after 600s' });
  startRun(vaultRoot, { ...base, runId: runId(4), startedAt: '2026-04-01T10:00:01.000Z', status: 'running' });
  finishRun(vaultRoot, 'default', runId(4), { status: 'done', costUsd: 9 });

  return { vaultRoot, store, vault };
}

const doctor: DoctorReport = {
  at: NOW.toISOString(),
  vault: '/v',
  verdict: 'warnings',
  summary: '1 warning — git first',
  findings: [
    { check: 'root', severity: 'ok', message: 'config.md marks the root' },
    { check: 'git', severity: 'warn', message: 'no commits since 2026-06-01', fix: 'commit' },
  ],
};

describe('gatherRetroEvidence', () => {
  test('counts the period from the runtime record, and only the period', async () => {
    const { vaultRoot, store, vault } = await seed();
    const e = await gatherRetroEvidence({ vaultRoot, tenant: 'default', store, vault, cfg: readVaultConfig(vaultRoot), since: SINCE, now: NOW, doctor: () => doctor });

    expect(e.threads.total).toBe(2);
    expect(e.threads.inPeriod).toBe(1);
    expect(e.threads.steps).toBe(2);
    expect(e.threads.byTask).toEqual({ review: 1, counsel: 1 });
    expect(e.threads.byProvider).toEqual({ 'fake/fake': 1, 'ollama/gemma4:e4b': 1 });
    expect(e.threads.titles).toEqual(['Check the Acme NDA term.']);

    expect(e.runs).toMatchObject({ inPeriod: 3, done: 1, error: 1, timeout: 1, abandoned: 0, costUsd: 0.56 });
    expect(e.runs.primitives).toEqual({ evaluate: 2, draft: 1 });
    expect(e.runs.tools).toEqual({ vault_read: 2, apply_redlines: 1 });
    // Newest first, like the run listing.
    expect(e.runs.errors).toEqual(['step timed out after 600s', 'claude harness: Not logged in']);

    expect(e.proposals.approved.map(p => p.path)).toEqual(['practice/standards/nda.md']);
    expect(e.proposals.approved[0]!.rationale).toBe('Record the residuals fallback');
    expect(e.proposals.rejected.map(p => p.path)).toEqual(['memory/patterns.md']);
    expect(e.proposals.pending.map(p => p.path)).toEqual(['practice/methods/nda-triage.md']);

    expect(e.artifacts).toEqual({ count: 1, byKind: { 'docx-redline': 1 }, applied: 5, skipped: 1, comments: 3, paths: ['matters/acme/acme-nda-redline-2026-08-10.docx'] });

    expect(e.matters.total).toBe(2);
    expect(e.matters.touched).toEqual([{ path: 'matters/acme-nda.md', title: 'Acme — NDA', stage: 'working', updated: '2026-08-10' }]);

    expect(e.memory).toEqual({ patternsEntries: 4, previousRetros: ['retro-2026-05-01.md'] });
    expect(e.doctor).toBe(doctor);
  });

  test('all time reads everything; no doctor is said, not assumed', async () => {
    const { vaultRoot, store, vault } = await seed();
    const e = await gatherRetroEvidence({ vaultRoot, tenant: 'default', store, vault, cfg: readVaultConfig(vaultRoot), since: null, now: NOW });
    expect(e.threads.inPeriod).toBe(2);
    expect(e.runs.inPeriod).toBe(4);
    expect(e.matters.touched).toHaveLength(2);
    expect(e.doctor).toBeNull();
    expect(renderRetroEvidence(e)).toContain('Vault health (doctor)\n- not run.');
  });

  test('renders the period as plain facts for the system prompt', async () => {
    const { vaultRoot, store, vault } = await seed();
    const e = await gatherRetroEvidence({ vaultRoot, tenant: 'default', store, vault, cfg: readVaultConfig(vaultRoot), since: SINCE, now: NOW, doctor: () => doctor });
    expect(renderRetroEvidence(e)).toMatchSnapshot();
  });
});

describe('gatherRetroEvidence outcomes (routing-and-evals spec §7)', () => {
  test('counts the period\'s decisions, marks, corrections and deletions, and renders them', async () => {
    const { vaultRoot, store, vault } = await seed();
    appendOutcome(vaultRoot, {}, { kind: 'proposal.decided', at: '2026-08-12T00:00:00.000Z', detail: { decision: 'approved' } });
    appendOutcome(vaultRoot, {}, { kind: 'proposal.decided', at: '2026-08-12T00:00:00.000Z', detail: { decision: 'rejected', reason: 'too broad' } });
    appendOutcome(vaultRoot, {}, { kind: 'answer.marked', at: '2026-08-13T00:00:00.000Z', detail: { mark: 'useful' } });
    appendOutcome(vaultRoot, {}, { kind: 'task.corrected', at: '2026-08-13T00:00:00.000Z', detail: { from: 'chat', to: 'review' } });
    appendOutcome(vaultRoot, {}, { kind: 'thread.deleted', at: '2026-08-14T00:00:00.000Z', detail: {} });
    // Before the period: not counted.
    appendOutcome(vaultRoot, {}, { kind: 'answer.marked', at: '2026-05-01T00:00:00.000Z', detail: { mark: 'not-right' } });

    const e = await gatherRetroEvidence({ vaultRoot, tenant: 'default', store, vault, cfg: readVaultConfig(vaultRoot), since: SINCE, now: NOW });
    expect(e.outcomes).toEqual({ decisions: { approved: 1, rejected: 1, withReason: 1 }, marks: { useful: 1, notRight: 0 }, corrections: 1, documents: 0, deletedThreads: 1, edits: { count: 0, files: 0, paths: [] } });
    const text = renderRetroEvidence(e);
    expect(text).toContain('### Decisions and marks');
    expect(text).toContain('1 approved, 1 rejected (1 with a reason)');
    expect(text).toContain('1 useful, 0 not right; 1 task corrections; 1 conversations deleted');
    expect(text).toContain('Files edited after counsel: 0 edits across 0 files.');

    const all = await gatherRetroEvidence({ vaultRoot, tenant: 'default', store, vault, cfg: readVaultConfig(vaultRoot), since: null, now: NOW });
    expect(all.outcomes.marks.notRight).toBe(1);
  });

  test('runs the edit scan first, so a file the lawyer changed since the last look is in this retro', async () => {
    const { vaultRoot, store, vault } = await seed();
    writeFileSync(join(vaultRoot, 'matters', 'acme-nda.md'), '# Acme\n\nTerm: five years.\n', 'utf8');
    recordWritten(vaultRoot, { mattersPath: 'matters' }, { path: 'matters/acme-nda.md', kind: 'write', runId: 'r-1' });
    writeFileSync(join(vaultRoot, 'matters', 'acme-nda.md'), '# Acme\n\nTerm: three years.\n', 'utf8');
    const e = await gatherRetroEvidence({ vaultRoot, tenant: 'default', store, vault, cfg: readVaultConfig(vaultRoot), since: SINCE, now: NOW });
    expect(e.outcomes.edits).toEqual({ count: 1, files: 1, paths: ['matters/acme-nda.md'] });
    const text = renderRetroEvidence(e);
    expect(text).toContain('Files edited after counsel: 1 edit across 1 file.');
    expect(text).toContain('  - matters/acme-nda.md');
  });
});
