import { afterEach, beforeEach, expect, test } from 'bun:test';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { ImportOrganizeInput } from './import-organization';
import { workspaceHandler } from './http';

let store: WorkspaceStore;
beforeEach(() => { store = new WorkspaceStore({ databasePath: ':memory:' }); });
afterEach(() => store.close());
async function stage(files: Record<string, string> = { 'Northstar/nda.txt': 'Northstar NDA correspondence. Matter-only concession.' }) {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Fixture',
    files: Object.entries(files).map(([path, text]) => ({ path, byteCount: Buffer.byteLength(text) })) });
  for (const entry of batch.entries) if (entry.status !== 'skipped')
    store.imports.receive(batch.id, entry.id, Buffer.from(files[entry.path as keyof typeof files]!).toString('base64'));
  await store.imports.idle();
  return store.imports.get(batch.id);
}
function input(batch: Awaited<ReturnType<typeof stage>>) {
  return { expectedRevisionId: batch.revisionId, entryIds: batch.entries.map(entry => entry.id),
    modelChoice: { kind: 'codex' as const, model: 'synthetic' }, shareForSuggestions: true as const };
}
const suggestion = (id: string, matterId: string | null = null) => ({ entryId: id, destination: 'source', collection: 'unfiled',
  matterId, matterTitle: null, whenToUse: '', reason: 'Deal-specific correspondence belongs with the NDA matter.', confidence: 'high', evidenceQuote: 'Northstar NDA correspondence.' });

test('selected excerpts and candidate titles only; exact review precedes choice changes and no records are imported', async () => {
  const matter = store.createMatter({ title: 'Northstar NDA', summary: 'DO NOT SHARE MATTER BODY' });
  store.createMatter({ title: 'Unrelated confidential dispute', summary: 'PRIVATE SUMMARY' });
  store.saveProfile({ name: 'PRIVATE PROFILE', applyToChats: true, expectedRevisionId: null });
  const batch = await stage({ 'Northstar/nda.txt': 'Northstar NDA correspondence. ' + 'x'.repeat(3000) + 'PRIVATE TAIL',
    'other.txt': 'UNSELECTED FILE CONTENT' });
  const model = new FakeModelProvider([{ output: { suggestions: [suggestion(batch.entries[0]!.id, matter.id)] } }]);
  const request = { ...input(batch), entryIds: [batch.entries[0]!.id] };
  const result = await new WorkspaceChat(store, () => model).organizeImport(batch.id, request, new AbortController().signal);
  expect(model.lastRequest!.tools).toHaveLength(0);
  for (const text of ['DO NOT SHARE MATTER BODY', 'PRIVATE SUMMARY', 'Unrelated confidential dispute', 'PRIVATE PROFILE', 'PRIVATE TAIL', 'UNSELECTED FILE CONTENT'])
    expect(model.lastRequest!.system).not.toContain(text);
  expect(result.sharedMatters).toEqual([{ id: matter.id, title: matter.title }]);
  expect(result.suggestions[0]!.partial).toBe(true);
  expect(store.imports.get(batch.id).revisionId).toBe(batch.revisionId);
  expect(store.imports.get(batch.id).entries[0]!.choice.matterId).toBeNull();
  const saved = store.imports.editChoices(batch.id, { expectedRevisionId: result.revisionId,
    changes: result.suggestions.map(item => ({ entryId: item.entryId, choice: item.choice })) });
  expect(saved.entries[0]!.choice.matterId).toBe(matter.id);
  expect(saved.entries[1]!.choice).toEqual(batch.entries[1]!.choice);
  expect(store.catalog().sources).toHaveLength(0);
  expect(store.catalog().knowledge).toHaveLength(0);
  expect(store.conversations.list()).toHaveLength(0);
});
test('bulk changes cover filtered off-page rows, preserve unrelated fields and roll back invalid/stale selections', async () => {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Folders',
    files: [...Array.from({ length: 151 }, (_, i) => ({ path: `Chosen/${i}.txt`, byteCount: 1 })), { path: 'Other/keep.txt', byteCount: 1 }, { path: 'Chosen/.secret.txt', byteCount: 1 }] });
  const selection = store.imports.selectEntries(batch.id, { query: 'Chosen/' });
  expect(selection.entryIds).toHaveLength(151);
  const matter = store.createMatter({ title: 'Chosen matter' });
  const updated = store.imports.bulkEdit(batch.id, { expectedRevisionId: selection.revisionId, entryIds: selection.entryIds,
    patch: { matterId: matter.id, matterTitle: null, collection: 'external' } });
  expect(updated.entries).toHaveLength(50);
  const all = store.imports.get(batch.id);
  expect(all.entries.filter(entry => entry.choice.matterId === matter.id)).toHaveLength(151);
  expect(all.entries[151]!.choice).toEqual(batch.entries[151]!.choice);
  expect(all.entries[0]!.choice.title).toBe(batch.entries[0]!.choice.title);
  const revision = all.revisionId;
  expect(() => store.imports.bulkEdit(batch.id, { expectedRevisionId: revision,
    entryIds: [all.entries[0]!.id, crypto.randomUUID()], patch: { destination: 'skip' } })).toThrow('not found');
  expect(store.imports.get(batch.id)).toEqual(all);
  expect(() => store.imports.bulkEdit(batch.id, { expectedRevisionId: batch.revisionId,
    entryIds: selection.entryIds, patch: { destination: 'skip' } })).toThrow('changed');
  expect(() => store.imports.bulkEdit(batch.id, { expectedRevisionId: revision,
    entryIds: [all.entries[0]!.id, all.entries[152]!.id], patch: { destination: 'source' } })).toThrow('excluded');
  expect(store.imports.get(batch.id)).toEqual(all);
});
test('malformed suggestions, invented matter IDs, unsupported quotes and missing consent fail without saving', async () => {
  const batch = await stage(), base = suggestion(batch.entries[0]!.id);
  for (const suggestions of [[{ ...base, entryId: crypto.randomUUID() }], [base, base], [{ ...base, matterId: crypto.randomUUID() }],
    [{ ...base, evidenceQuote: 'Fabricated evidence' }], [{ ...base, destination: 'profile' }]]) {
    const model = new FakeModelProvider([{ output: { suggestions } }]);
    await expect(new WorkspaceChat(store, () => model).organizeImport(batch.id, input(batch), new AbortController().signal)).rejects.toThrow();
    expect(store.imports.get(batch.id).revisionId).toBe(batch.revisionId);
  }
  expect(ImportOrganizeInput.safeParse({ ...input(batch), shareForSuggestions: false }).success).toBe(false);
  expect(ImportOrganizeInput.safeParse({ ...input(batch), entryIds: Array.from({ length: 21 }, () => crypto.randomUUID()) }).success).toBe(false);
});
test('workspace local-only policies and unprocessed files block AI sharing, and profile fields never leave with choices', async () => {
  const batch = await stage({ 'policy.md': 'default_locality: local\n', 'Northstar/nda.txt': 'Northstar NDA correspondence.' });
  const model = new FakeModelProvider([]), chat = new WorkspaceChat(store, () => model);
  await expect(chat.organizeImport(batch.id, { ...input(batch), entryIds: [batch.entries[1]!.id] }, new AbortController().signal)).rejects.toThrow('local-only');
  expect(model.lastRequest).toBeUndefined();
  const pending = store.imports.create({ clientId: crypto.randomUUID(), label: 'Unprocessed policy', files: [{ path: 'not-uploaded.txt', byteCount: 1 }] });
  await expect(chat.organizeImport(pending.id, input(pending), new AbortController().signal)).rejects.toThrow('Finish uploading');
  expect(model.lastRequest).toBeUndefined();
});
test('stale bases, excluded/profile files and cross-batch IDs are rejected before provider execution', async () => {
  const batch = await stage(), other = await stage();
  const model = new FakeModelProvider([]), chat = new WorkspaceChat(store, () => model);
  await expect(chat.organizeImport(batch.id, { ...input(batch), entryIds: input(other).entryIds }, new AbortController().signal)).rejects.toThrow('not found');
  store.imports.edit(batch.id, batch.entries[0]!.id, { expectedRevisionId: batch.revisionId,
    choice: { ...batch.entries[0]!.choice, destination: 'profile' } });
  await expect(chat.organizeImport(batch.id, input(batch), new AbortController().signal)).rejects.toThrow('changed');
  await expect(chat.organizeImport(batch.id, input(store.imports.get(batch.id)), new AbortController().signal)).rejects.toThrow('profile');
  expect(model.lastRequest).toBeUndefined();
});
test('cancellation, shutdown and a changed import during a suggestion never change choices', async () => {
  const batch = await stage();
  const model = new FakeModelProvider(Array.from({ length: 3 }, () => ({ output: { suggestions: [suggestion(batch.entries[0]!.id)] }, delayMs: 30 })));
  const chat = new WorkspaceChat(store, () => model);
  const stale = chat.organizeImport(batch.id, input(batch), new AbortController().signal).catch(e => e.message);
  store.imports.bulkEdit(batch.id, { expectedRevisionId: batch.revisionId, entryIds: input(batch).entryIds, patch: { collection: 'external' } });
  expect(await stale).toContain('changed');
  const latest = store.imports.get(batch.id), abort = new AbortController();
  const stopped = chat.organizeImport(batch.id, input(latest), abort.signal).catch(e => e.message);
  const shutdown = chat.organizeImport(batch.id, input(latest), new AbortController().signal).catch(e => e.message);
  expect(() => chat.organizeImport(batch.id, input(latest), new AbortController().signal)).toThrow('Two drafting helpers');
  abort.abort(); chat.stop(); await chat.idle();
  expect(await stopped).toContain('stopped'); expect(await shutdown).toContain('stopped');
  expect(store.imports.get(batch.id)).toEqual(latest);
});
test('organization and bulk routes require authentication and strict inputs', async () => {
  const batch = await stage(), model = new FakeModelProvider([{ output: { suggestions: [suggestion(batch.entries[0]!.id)] } }]);
  const handler = workspaceHandler({ store, chat: new WorkspaceChat(store, () => model), distDir: '/tmp', token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const call = (path: string, data: unknown, token = 'fixture') => handler(new Request(`http://127.0.0.1:7432/api/workspace/imports/${batch.id}/${path}`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(data) }));
  expect((await call('organize', input(batch), 'wrong')).status).toBe(401);
  expect((await call('organize', { ...input(batch), allFiles: true })).status).toBe(400);
  expect((await call('organize', input(batch))).status).toBe(200);
  expect((await call('bulk', { expectedRevisionId: batch.revisionId, entryIds: input(batch).entryIds, patch: { destination: 'skip' } }, 'wrong')).status).toBe(401);
});
