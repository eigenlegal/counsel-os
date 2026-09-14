import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { openWorkspaceDatabase, WORKSPACE_SCHEMA_VERSION } from './database';
import { ImportChoice, suggestImport } from './import-types';
import type { ModelProvider, StepRequest } from '../core/types';
import { FakeModelProvider } from '../core/fake-provider';
import { workspaceHandler } from './http';
import { prepareWorkspaceUpgrade } from './upgrade-safety';

let root: string, store: WorkspaceStore;
const chats: WorkspaceChat[] = [];
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-import-ai-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(async () => { for (const chat of chats.splice(0)) { chat.stop(); await chat.idle(); } store.close(); rmSync(root, { recursive: true, force: true }); });
type FileInput = { entryId: string; path: string; evidence: Array<{ id: string; text: string }> };
function model(hook?: (request: StepRequest, call: number) => Promise<void> | void,
  change?: (suggestions: Array<Record<string, unknown>>, files: FileInput[], call: number) => unknown): ModelProvider & { requests: StepRequest[] } {
  const requests: StepRequest[] = [];
  const base = new FakeModelProvider([]);
  return { id: 'synthetic-import-only', kind: base.kind, capabilities: base.capabilities, requests,
    async *run(request) {
      requests.push(request); await hook?.(request, requests.length); request.signal?.throwIfAborted();
      const context = JSON.parse(request.system.split('Context:\n').at(-1)!);
      const suggestions = context.files.map((file: FileInput) => {
        const text = file.evidence.map(item => item.text).join('\n');
        const uncertain = text.includes('UNCERTAIN');
        const employment = text.includes('employment dispute');
        const title = employment ? 'Acme employment dispute' : 'Acme NDA';
        const existing = context.candidateMatters.find((item: { title: string }) => item.title === title);
        return { entryId: file.entryId, destination: 'source', collection: 'unfiled', matterId: uncertain ? null : existing?.id ?? null,
          matterTitle: uncertain || existing ? null : title, whenToUse: '', reason: uncertain ? 'Company background does not identify a specific matter.' : 'The document identifies this specific engagement.',
          confidence: uncertain ? 'low' : 'high', evidenceRef: file.evidence[1]!.id };
      });
      yield { type: 'done', output: change ? change(suggestions, context.files, requests.length) : { suggestions }, usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };
}
async function stage(files: Record<string, string>) {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Unstructured files', files: Object.entries(files).map(([path, text]) => ({ path, byteCount: Buffer.byteLength(text) })) });
  for (const entry of batch.entries) if (entry.status !== 'skipped') store.imports.receive(batch.id, entry.id, Buffer.from(files[entry.path]!).toString('base64'));
  await store.imports.idle(); return store.imports.get(batch.id);
}
function start(batch: ReturnType<typeof store.imports.get>, provider = model()) {
  const chat = new WorkspaceChat(store, () => provider); chats.push(chat);
  const input = { requestId: crypto.randomUUID(), expectedRevisionId: batch.revisionId,
    modelChoice: { kind: 'codex' as const, model: 'synthetic-import-only' }, shareForSuggestions: true as const };
  chat.startImportOrganization(batch.id, input); return { chat, provider, input };
}

test('discovered practice instructions remain counted after automatic preparation and are retained without activation', async () => {
  const batch = await stage({ 'Loose/notes-17.txt': 'I prefer short sentences. Attribute new Word comments to Avery Example.' });
  const provider = model(undefined, suggestions => ({ suggestions: suggestions.map(item => ({ ...item, destination: 'profile',
    collection: 'unfiled', matterId: null, matterTitle: null, reason: 'Personal working preferences, not matter evidence.' })) }));
  const { chat } = start(batch, provider); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job).toMatchObject({ status: 'complete', eligible: 1, analyzed: 1, applied: 1, remaining: 0, skipped: 0 });
  expect(job.suggestions).toHaveLength(1); expect(job.summary.profiles).toBe(1);
  expect(store.imports.organization.next(batch.id).entries).toHaveLength(0);
  const ready = store.imports.get(batch.id);
  expect(ready.entries[0]!.choice.destination).toBe('profile');
  store.imports.commit(batch.id, { expectedRevisionId: ready.revisionId, profile: null });
  expect(store.practiceSources({ batch: batch.id }).items).toHaveLength(1);
  expect(store.getProfile()).toBeNull(); expect(store.getWorkingPreferences()).toBeNull();
});

test('arbitrary layouts are analyzed across batches, keep separate deals, and only reviewed choices enter retrieval', async () => {
  const existing = store.createMatter({ title: 'Acme NDA', summary: 'PRIVATE EXISTING MATTER BODY' });
  const files = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`Loose/2026/file-${i}.txt`, `Acme NDA negotiation record ${i}.`]));
  Object.assign(files, { 'elsewhere/scan-notes.txt': 'Acme employment dispute correspondence.', 'company.txt': 'UNCERTAIN Acme company-wide background.' });
  const batch = await stage(files), { chat, provider } = start(batch);
  await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job.status).toBe('complete'); expect(job.analyzed).toBe(11); expect(job.calls).toBe(2);
  expect(job.high).toBe(0); expect(job.applied).toBe(10); expect(job.attention).toBe(1);
  expect(provider.requests.every(r => !r.system.includes('PRIVATE EXISTING MATTER BODY'))).toBe(true);
  expect(job.summary).toMatchObject({ matters: 10, unfiled: 1, groupCount: 2 });
  expect(store.catalog().sources).toHaveLength(0);
  const reviewed = store.imports.get(batch.id);
  expect(reviewed.entries.filter(e => e.choice.matterId === existing.id)).toHaveLength(9);
  expect(reviewed.entries.find(e => e.path === 'company.txt')!.choice.matterId).toBeNull();
  const result = store.imports.commit(batch.id, { expectedRevisionId: reviewed.revisionId });
  expect(result.receipt!.matterIds).toHaveLength(1);
  const employment = result.receipt!.matterIds[0]!;
  expect(store.getMatter(employment).title).toBe('Acme employment dispute');
  expect(store.search({ matterId: existing.id, query: 'negotiation' }).hits.length).toBeGreaterThan(0);
  expect(store.search({ matterId: existing.id, query: 'employment' }).hits).toHaveLength(0);
  expect(store.catalog().knowledge).toHaveLength(0);
});

test('later batches receive evidence-backed proposed groups rather than creating a company-level matter', async () => {
  const batch = await stage(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${i}.txt`, `Acme NDA record ${i}.`])));
  const { chat, provider } = start(batch); await chat.idle();
  const second = JSON.parse(provider.requests[1]!.system.split('Context:\n').at(-1)!);
  expect(second.proposedGroups[0].title).toBe('Acme NDA'); expect(second.proposedGroups[0].evidence).toContain('Acme NDA record');
  expect(store.imports.organization.get(batch.id)!.suggestions.every(item => item.choice.matterTitle === 'Acme NDA')).toBe(true);
  expect(suggestImport('matters/2026/2026-nda.md').matterTitle).toBe('2026-nda');
  expect(suggestImport('Downloads/2026/scan.txt').matterTitle).toBeNull();
});

test('pause, edited-file protection, restart and backup preserve completed suggestions without paid replay', async () => {
  const batch = await stage(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${i}.txt`, `Acme NDA note ${i}.`])));
  let began!: () => void; const started = new Promise<void>(resolve => { began = resolve; });
  const provider = model(async (request, call) => {
    if (call === 2) { began(); await new Promise<void>((_, reject) => request.signal!.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })); }
  });
  const { chat } = start(batch, provider); await started;
  const live = store.imports.organization.get(batch.id)!;
  expect(live.analyzed).toBe(8);
  expect(() => store.imports.commit(batch.id, { expectedRevisionId: store.imports.get(batch.id).revisionId })).toThrow('Pause AI');
  expect(() => store.imports.edit(batch.id, batch.entries[0]!.id, { expectedRevisionId: store.imports.get(batch.id).revisionId, choice: batch.entries[0]!.choice })).toThrow('Pause AI');
  chat.controlImportOrganization(batch.id, { action: 'pause', expectedRevisionId: live.revisionId }); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  const edited = job.suggestions[0]!;
  store.imports.edit(batch.id, edited.entryId, { expectedRevisionId: store.imports.get(batch.id).revisionId, choice: { ...edited.before, title: 'My correction' } });
  expect(store.imports.organization.get(batch.id)!.suggestions[0]!.stale).toBe(true);
  expect(() => store.imports.organization.apply(batch.id, { expectedRevisionId: job.revisionId,
    expectedBatchRevisionId: store.imports.get(batch.id).revisionId, selection: 'selected', entryIds: [edited.entryId] })).toThrow();
  const backup = await createWorkspaceBackup(store.databasePath);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(WORKSPACE_SCHEMA_VERSION);
  const backupPath = join(root, 'fixture.counsel-backup'); writeFileSync(backupPath, backup.bytes);
  const restored = await restoreWorkspaceBackup(backupPath, join(root, 'restore'));
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    const noCalls = model(); const copyChat = new WorkspaceChat(copy, () => noCalls);
    copyChat.importOrganizer.recover(); await copyChat.idle(); expect(noCalls.requests).toHaveLength(0);
    const kept = copy.imports.organization.get(batch.id)!; expect(kept.analyzed).toBe(8); expect(kept.suggestions[0]!.stale).toBe(true);
    copyChat.controlImportOrganization(batch.id, { action: 'resume', expectedRevisionId: kept.revisionId }); await copyChat.idle();
    expect(noCalls.requests).toHaveLength(1); expect(copy.imports.organization.get(batch.id)!.analyzed).toBe(10);
    copyChat.stop(); await copyChat.idle();
  } finally { copy.close(); }
});

test('interrupted running jobs pause on recovery; schema 14 migration is additive', () => {
  const old = openWorkspaceDatabase(':memory:', 14);
  const path = join(root, 'old.sqlite3'); old.exec(`VACUUM INTO '${path}'`); old.close();
  const migrated = new WorkspaceStore({ databasePath: path });
  try { expect(migrated.imports.list()).toEqual([]); expect(migrated.catalog().matters).toEqual([]); }
  finally { migrated.close(); }
  const db = new Database(path); expect(db.query('PRAGMA user_version').get()).toEqual({ user_version: WORKSPACE_SCHEMA_VERSION }); db.close();
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Interrupted upload', files: [{ path: 'loose.txt', byteCount: 1 }] });
  store.imports.organization.start(batch.id, { requestId: crypto.randomUUID(), expectedRevisionId: batch.revisionId,
    modelChoice: { kind: 'codex', model: 'fixture' }, shareForSuggestions: true });
  const unused = model(), chat = new WorkspaceChat(store, () => unused); chats.push(chat);
  chat.importOrganizer.recover();
  expect(store.imports.organization.get(batch.id)!.status).toBe('paused'); expect(unused.requests).toHaveLength(0);
});

test('malformed model output gets one isolated retry, then remains reviewable without blocking or spinning', async () => {
  const batch = await stage({ 'random.txt': 'Acme NDA evidence.' });
  let calls = 0;
  const broken = { ...model(), id: 'broken-fixture', async *run() { calls++; yield { type: 'done' as const, output: { suggestions: [] }, usage: { inputTokens: 0, outputTokens: 0 } }; } };
  const { chat } = start(batch, broken as ReturnType<typeof model>); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job.status).toBe('complete'); expect(calls).toBe(2);
  expect(job.failed).toBe(1); expect(job.attention).toBe(1); expect(job.remaining).toBe(0);
  expect(job.failures[0]!.attempts).toBe(2);
  chat.controlImportOrganization(batch.id, { action: 'resume', expectedRevisionId: job.revisionId }); await chat.idle();
  expect(calls).toBe(2);
  expect(store.imports.inspect(batch.id, batch.entries[0]!.id).body).toBe('Acme NDA evidence.');
  expect(store.catalog().sources).toHaveLength(0);
});

test('one bad excerpt and one malformed suggestion preserve valid siblings, finish fresh files, then retry individually', async () => {
  const batch = await stage(Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`${String(i).padStart(2, '0')}.txt`, `Acme NDA note ${i}.`])));
  const provider = model(undefined, (suggestions, files, call) => ({ suggestions: suggestions.map((item, i) => {
    if (files[i]!.path === '00.txt') return { ...item, evidenceRef: 'a different file:1:0' };
    if (files[i]!.path === '01.txt' && call === 1) return { ...item, destination: 'invented' };
    return item;
  }) }));
  const { chat } = start(batch, provider); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job).toMatchObject({ status: 'complete', analyzed: 17, applied: 17, failed: 1, retrying: 0, remaining: 0, attention: 1, calls: 5 });
  expect(provider.requests.map(request => JSON.parse(request.system.split('Context:\n').at(-1)!).files.length)).toEqual([8, 8, 2, 1, 1]);
  expect(provider.requests[3]!.system).toContain('one isolated repair attempt');
  expect(provider.requests.every(request => !request.outputSchema)).toBe(true); // validation happens per file, not inside an adapter
  expect(job.suggestions[0]!.evidenceQuote).toContain('Acme NDA note');
  expect(store.catalog().sources).toHaveLength(0);
  const before = store.imports.get(batch.id);
  expect(before.entries.every(entry => !!store.imports.inspect(batch.id, entry.id).body)).toBe(true);
  const copy = await createWorkspaceBackup(store.databasePath);
  expect((await inspectWorkspaceBackup(copy.bytes)).schemaVersion).toBe(WORKSPACE_SCHEMA_VERSION);
  const backupPath = join(root, 'retry.counsel-backup'); writeFileSync(backupPath, copy.bytes);
  const restored = await restoreWorkspaceBackup(backupPath, join(root, 'retry-restore'));
  const reopened = new WorkspaceStore({ databasePath: restored.databasePath });
  const unused = model(), reopenedChat = new WorkspaceChat(reopened, () => unused);
  try {
    reopenedChat.importOrganizer.recover();
    const kept = reopened.imports.organization.get(batch.id)!;
    expect(kept.failed).toBe(1); expect(kept.applied).toBe(17);
    reopenedChat.controlImportOrganization(batch.id, { action: 'resume', expectedRevisionId: kept.revisionId }); await reopenedChat.idle();
    expect(unused.requests).toHaveLength(0);
  } finally { reopenedChat.stop(); await reopenedChat.idle(); reopened.close(); }
});

test('duplicate, missing and cross-file results never replace a valid sibling or get filed without evidence', async () => {
  const batch = await stage({ 'a.txt': 'Acme NDA alpha.', 'b.txt': 'Acme NDA beta.', 'c.txt': 'Acme NDA gamma.', 'd.txt': 'Acme NDA delta.' });
  const provider = model(undefined, (items, files) => ({ suggestions: items.flatMap((item, i) => {
    if (files[i]!.path === 'a.txt') return [item, item];
    if (files[i]!.path === 'b.txt') return [];
    if (files[i]!.path === 'c.txt') return [{ ...item, evidenceRef: `${batch.entries[0]!.id}:1:0` }];
    return [item];
  }) }));
  const { chat } = start(batch, provider); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job).toMatchObject({ status: 'complete', applied: 1, failed: 3, attention: 3, calls: 4, remaining: 0 });
  expect(job.suggestions.map(item => item.path)).toEqual(['d.txt']);
});

test('one action leaves exceptions unfiled and protects the decision without approving practice or importing', async () => {
  const batch = await stage({ 'bad.txt': 'Acme NDA incomplete.', 'clear.txt': 'Acme NDA final.', 'uncertain.txt': 'UNCERTAIN company background.' });
  const provider = model(undefined, (items, files) => ({ suggestions: items.map((item, i) => files[i]!.path === 'bad.txt' ? { ...item, evidenceRef: 'invalid' } : item) }));
  const { chat } = start(batch, provider); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job.attention).toBe(2);
  expect(() => store.imports.organization.apply(batch.id, { expectedRevisionId: job.revisionId, expectedBatchRevisionId: batch.revisionId, selection: 'unfiled' })).toThrow('changed');
  const resolved = store.imports.organization.apply(batch.id, { expectedRevisionId: job.revisionId,
    expectedBatchRevisionId: store.imports.get(batch.id).revisionId, selection: 'unfiled' });
  expect(resolved).toMatchObject({ attention: 0, failed: 0, remaining: 0 });
  expect(resolved.summary).toMatchObject({ unfiled: 2, matters: 1 });
  const calls = provider.requests.length;
  chat.controlImportOrganization(batch.id, { action: 'resume', expectedRevisionId: resolved.revisionId }); await chat.idle();
  expect(provider.requests).toHaveLength(calls);
  expect(store.catalog().sources).toHaveLength(0); expect(store.catalog().knowledge).toHaveLength(0);
});

test('a reviewed file is excluded from background classification even before its first model call', async () => {
  const batch = await stage({ 'manual.txt': 'Acme NDA note.', 'automatic.txt': 'Acme NDA note.' });
  const manual = batch.entries.find(entry => entry.path === 'manual.txt')!;
  const edited = store.imports.edit(batch.id, manual.id, { expectedRevisionId: batch.revisionId, choice: { ...manual.choice, collection: 'practice' } });
  const { chat, provider } = start(edited); await chat.idle();
  const files = JSON.parse(provider.requests[0]!.system.split('Context:\n').at(-1)!).files;
  expect(files.map((file: FileInput) => file.path)).toEqual(['automatic.txt']);
  expect(store.imports.get(batch.id).entries.find(entry => entry.id === manual.id)!.choice.collection).toBe('practice');
  expect(store.imports.organization.get(batch.id)).toMatchObject({ reviewed: 1, analyzed: 1, remaining: 0 });
});

test('provider failures pause the whole job, retain prepared files, and do not spend the per-file repair allowance', async () => {
  const batch = await stage(Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`${i}.txt`, `Acme NDA note ${i}.`])));
  const provider = model((_, call) => { if (call === 2) throw new Error('Authentication expired'); });
  const { chat } = start(batch, provider); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job).toMatchObject({ status: 'failed', analyzed: 8, applied: 8, failed: 0, remaining: 1, calls: 2 });
  expect(provider.requests).toHaveLength(2);
  chat.controlImportOrganization(batch.id, { action: 'resume', expectedRevisionId: job.revisionId }); await chat.idle();
  expect(store.imports.organization.get(batch.id)).toMatchObject({ status: 'complete', analyzed: 9, applied: 9, calls: 3 });
});

test('schema 19 import with 48 retained suggestions upgrades with a verified backup, then resumes without reanalyzing them', async () => {
  const batch = await stage(Object.fromEntries(Array.from({ length: 56 }, (_, i) => [`${String(i).padStart(2, '0')}.txt`, `Acme NDA note ${i}.`])));
  const provider = model((_, call) => { if (call === 7) throw new Error('Interrupted legacy batch'); });
  const { chat } = start(batch, provider); await chat.idle(); chat.stop();
  const databasePath = store.databasePath;
  store.close();
  // Synthetic legacy fixture only: reproduce build 3's unapplied suggestions and schema.
  const legacy = new Database(databasePath);
  legacy.exec(`UPDATE import_entries SET choice_json=(SELECT json_extract(result_json,'$.before') FROM import_organization_results WHERE entry_id=import_entries.id)
    WHERE id IN (SELECT entry_id FROM import_organization_results);
    UPDATE import_organization_results SET applied=0;
    DROP TABLE import_organization_files; PRAGMA user_version=19;`);
  legacy.close();
  const upgrade = await prepareWorkspaceUpgrade(databasePath);
  expect(upgrade?.fromSchema).toBe(19);
  expect((await inspectWorkspaceBackup(upgrade!.backupPath)).counts.stagedFiles).toBe(56);
  store = new WorkspaceStore({ databasePath });
  const retained = store.imports.organization.get(batch.id)!;
  expect(retained).toMatchObject({ analyzed: 48, applied: 0, high: 48, status: 'failed' });
  const resumedModel = model(), resumed = new WorkspaceChat(store, () => resumedModel); chats.push(resumed);
  resumed.importOrganizer.recover(); await resumed.idle(); expect(resumedModel.requests).toHaveLength(0);
  resumed.controlImportOrganization(batch.id, { action: 'resume', expectedRevisionId: retained.revisionId }); await resumed.idle();
  expect(resumedModel.requests).toHaveLength(1);
  expect(store.imports.organization.get(batch.id)).toMatchObject({ status: 'complete', analyzed: 56, applied: 56 });
  expect(store.catalog().sources).toHaveLength(0);
});

test('whole-batch locality checks prevent every AI call and profile files stay excluded', async () => {
  const batch = await stage({ 'policy.txt': 'default_locality: local\n', 'unknown.txt': 'Acme NDA evidence.' });
  const { chat, provider } = start(batch); await chat.idle();
  expect(provider.requests).toHaveLength(0); expect(store.imports.organization.get(batch.id)!.status).toBe('failed');
});

test('automatic preparation covers off-page files and reviewed corrections are kept', async () => {
  const batch = await stage(Object.fromEntries(Array.from({ length: 121 }, (_, i) => [`Notes/note-${i}.txt`, `Acme NDA evidence ${i}.`])));
  const { chat } = start(batch); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job.total).toBe(121); expect(job.suggestions).toHaveLength(50); expect(job.calls).toBe(16);
  expect(store.imports.organization.get(batch.id, 100)!.suggestions).toHaveLength(21);
  const first = job.suggestions[0]!;
  const choice = { ...first.before, matterTitle: 'Acme NDA — corrected group' };
  store.imports.edit(batch.id, first.entryId, { expectedRevisionId: store.imports.get(batch.id).revisionId, choice });
  expect(store.imports.organization.groups(batch.id, 'Acme NDA').some(group => group.title === choice.matterTitle && group.evidence.startsWith('Reviewed filing:'))).toBe(true);
  expect(store.imports.organization.get(batch.id, 0, true)!.total).toBe(0);
  expect(store.imports.organization.get(batch.id)!.applied).toBe(120);
  expect(store.imports.get(batch.id).entries.find(entry => entry.id === first.entryId)!.choice).toEqual(choice);
  expect(store.catalog().sources).toHaveLength(0);
});

test('profile sources never enter background AI context', async () => {
  const batch = await stage({ 'profile.md': 'name: PRIVATE IDENTITY\norganization: PRIVATE ORGANIZATION', 'document.txt': 'Acme NDA document.' });
  const { chat, provider } = start(batch); await chat.idle();
  const job = store.imports.organization.get(batch.id)!;
  expect(job.analyzed).toBe(1); expect(job.skipped).toBe(1);
  expect(provider.requests[0]!.system).not.toContain('PRIVATE IDENTITY'); expect(provider.requests[0]!.system).not.toContain('PRIVATE ORGANIZATION');
});

test('a late pause for another completed batch cannot cancel the current model request', async () => {
  const first = await stage({ 'one.txt': 'Acme NDA note.' });
  let secondBegan!: () => void; const began = new Promise<void>(resolve => { secondBegan = resolve; });
  const provider = model(async (req, call) => { if (call === 2) { secondBegan(); await new Promise(resolve => setTimeout(resolve, 25)); req.signal?.throwIfAborted(); } });
  const { chat } = start(first, provider); await chat.idle();
  const second = await stage({ 'two.txt': 'Acme NDA second note.' });
  chat.startImportOrganization(second.id, { requestId: crypto.randomUUID(), expectedRevisionId: second.revisionId,
    modelChoice: { kind: 'codex', model: 'fixture' }, shareForSuggestions: true });
  await began;
  chat.controlImportOrganization(first.id, { action: 'pause', expectedRevisionId: crypto.randomUUID() });
  await chat.idle();
  expect(store.imports.organization.get(first.id)!.status).toBe('complete');
  expect(store.imports.organization.get(second.id)!.status).toBe('complete');
});

test('HTTP starts durable jobs without depending on request lifetime; consent and revision guards are strict', async () => {
  const batch = await stage({ 'document.txt': 'Acme NDA file.' });
  const provider = model(), chat = new WorkspaceChat(store, () => provider); chats.push(chat);
  const handler = workspaceHandler({ store, chat, token: 'fixture', origin: 'http://127.0.0.1:7458', distDir: join(root, 'none'), demo: false });
  const input = { requestId: crypto.randomUUID(), expectedRevisionId: batch.revisionId, modelChoice: { kind: 'codex', model: 'fixture' }, shareForSuggestions: true };
  const post = (value: unknown, token = 'fixture') => handler(new Request(`http://127.0.0.1:7458/api/workspace/imports/${batch.id}/organization`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(value) }));
  expect((await post(input, 'wrong')).status).toBe(401);
  expect((await post({ ...input, shareForSuggestions: false })).status).toBe(400);
  expect((await post(input)).status).toBe(202); await chat.idle();
  expect((await post(input)).status).toBe(202); expect(provider.requests).toHaveLength(1);
  expect((await post({ ...input, requestId: crypto.randomUUID() })).status).toBe(409);
  const result = await handler(new Request(`http://127.0.0.1:7458/api/workspace/imports/${batch.id}/organization`, { headers: { Authorization: 'Bearer fixture' } }));
  expect((await result.json() as { status: string }).status).toBe('complete');
});
