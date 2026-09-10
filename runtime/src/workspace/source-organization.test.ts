import { afterEach, beforeEach, expect, test } from 'bun:test';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { workspaceHandler } from './http';
import { SourceOrganizationSuggest } from './source-organization';
let store: WorkspaceStore;
beforeEach(() => { store = new WorkspaceStore({ databasePath: ':memory:' }); });
afterEach(() => store.close());
function source(title = 'Northstar NDA', body = 'Northstar NDA correspondence. Matter-only concession.') {
  return store.createSource({ kind: 'document', revision: { title, body, provenance: { origin: 'fixture:file' } } });
}
const target = { collection: 'practice' as const, matterId: null, matterTitle: null };
const base = (sourceIds: string[]) => ({ sourceIds, expectedVersion: store.previewSourceOrganization({ sourceIds }).expectedVersion,
  modelChoice: { kind: 'codex' as const, model: 'synthetic' }, shareForSuggestions: true as const });
const suggestion = (sourceId: string, matterId: string | null = null) => ({ sourceId, target: matterId ? { collection: 'matter', matterId, matterTitle: 'Northstar NDA' } : target,
  reason: 'These are the selected file’s instructions.', evidenceQuote: 'Northstar NDA correspondence.', confidence: 'high' });

test('whole-selection filing crosses pages atomically, preserves source versions and cannot adopt practice or alter unselected files', () => {
  const files = Array.from({ length: 61 }, (_, i) => source(`Selected ${i}`, `Original ${i}`)), keep = source('Keep unfiled');
  const ids = files.map(file => file.id), preview = store.previewSourceOrganization({ sourceIds: ids });
  expect(store.sourceLibrary({ collection: 'unfiled' }).records).toHaveLength(50);
  const result = store.organizeSources({ sourceIds: ids, expectedVersion: preview.expectedVersion, confirmAccessChanges: true,
    changes: ids.map(sourceId => ({ sourceId, target })) });
  expect(result.changed).toHaveLength(61);
  expect(store.sourceLibrary({ collection: 'practice' }).total).toBe(61);
  expect(store.sourceLibrary({ collection: 'unfiled' }).records.map(file => file.id)).toEqual([keep.id]);
  for (const file of files) expect(store.getSource(file.id).latest).toEqual(file.latest);
  expect(store.catalog().knowledge).toEqual([]); expect(store.listWork()).toEqual([]);
});
test('stale or foreign selections and renamed/missing matters fail the entire action', () => {
  const first = source(), second = source('Other'), matter = store.createMatter({ title: 'Northstar NDA' });
  const ids = [first.id, second.id], preview = store.previewSourceOrganization({ sourceIds: ids });
  const apply = { sourceIds: ids, expectedVersion: preview.expectedVersion, confirmAccessChanges: true as const };
  for (const changes of [
    [{ sourceId: first.id, target }, { sourceId: crypto.randomUUID(), target }],
    [{ sourceId: first.id, target }, { sourceId: second.id, target: { collection: 'matter' as const, matterId: matter.id, matterTitle: 'Wrong old name' } }],
    [{ sourceId: first.id, target }, { sourceId: second.id, target: { collection: 'matter' as const, matterId: crypto.randomUUID(), matterTitle: 'Missing' } }],
  ]) { expect(() => store.organizeSources({ ...apply, changes })).toThrow(); expect(store.previewSourceOrganization({ sourceIds: ids })).toEqual(preview); }
  store.reviseSource(second.id, second.latest.id, { title: second.latest.title, body: 'Changed text.', provenance: second.latest.provenance });
  expect(() => store.organizeSources({ ...apply, changes: [{ sourceId: first.id, target }] })).toThrow('changed');
  expect(store.sourceLibrary({ collection: 'practice' }).total).toBe(0);
});
test('AI receives selected bounded excerpts and candidate names only; generation never changes placement or approvals', async () => {
  const file = source('Northstar NDA', 'Northstar NDA correspondence. ' + 'x'.repeat(3000) + 'PRIVATE TAIL');
  source('Other file', 'UNSELECTED FILE');
  const matter = store.createMatter({ title: 'Northstar NDA', summary: 'PRIVATE MATTER BODY' });
  store.createMatter({ title: 'Unrelated litigation', summary: 'SECRET' });
  store.saveProfile({ name: 'PRIVATE PROFILE', applyToChats: true, expectedRevisionId: null });
  const model = new FakeModelProvider([{ output: { suggestions: [suggestion(file.id, matter.id)] } }]), chat = new WorkspaceChat(store, () => model);
  const request = base([file.id]), result = await chat.organizeSources(request, new AbortController().signal);
  expect(model.lastRequest!.tools).toEqual([]);
  for (const text of ['PRIVATE TAIL', 'UNSELECTED FILE', 'PRIVATE MATTER BODY', 'PRIVATE PROFILE', 'Unrelated litigation']) expect(model.lastRequest!.system).not.toContain(text);
  expect(result.sharedMatters).toEqual([{ id: matter.id, title: matter.title }]);
  expect(result.suggestions[0]!.partial).toBe(true);
  expect(store.previewSourceOrganization({ sourceIds: [file.id] }).expectedVersion).toBe(request.expectedVersion);
  store.organizeSources({ sourceIds: [file.id], expectedVersion: request.expectedVersion, confirmAccessChanges: true,
    changes: result.suggestions.map(item => ({ sourceId: item.sourceId, target: item.target })) });
  expect(store.getSource(file.id).matterIds).toEqual([matter.id]);
  expect(store.getSource(file.id).latest.id).toBe(file.latest.id);
  expect(store.conversations.list()).toEqual([]); expect(store.catalog().knowledge).toEqual([]);
});
test('unsupported evidence, unknown identities, missing consent and local-only files never change or share unintended content', async () => {
  const file = source(), request = base([file.id]);
  for (const suggestions of [[{ ...suggestion(file.id), evidenceQuote: 'Made up' }], [suggestion(crypto.randomUUID())],
    [suggestion(file.id, crypto.randomUUID())], [suggestion(file.id), suggestion(file.id)]]) {
    const chat = new WorkspaceChat(store, () => new FakeModelProvider([{ output: { suggestions } }]));
    await expect(chat.organizeSources(request, new AbortController().signal)).rejects.toThrow();
    expect(store.previewSourceOrganization({ sourceIds: [file.id] }).expectedVersion).toBe(request.expectedVersion);
  }
  expect(SourceOrganizationSuggest.safeParse({ ...request, shareForSuggestions: false }).success).toBe(false);
  expect(SourceOrganizationSuggest.safeParse({ ...request, sourceIds: Array.from({ length: 21 }, () => crypto.randomUUID()) }).success).toBe(false);
  const local = source('Private local', 'locality: local\nSecret file.'), model = new FakeModelProvider([]);
  await expect(new WorkspaceChat(store, () => model).organizeSources(base([local.id]), new AbortController().signal)).rejects.toThrow('local-only');
  expect(model.lastRequest).toBeUndefined();
});
test('changed files, cancellation and shutdown invalidate suggestions without saving', async () => {
  const file = source(), request = base([file.id]);
  const model = new FakeModelProvider(Array.from({ length: 3 }, () => ({ output: { suggestions: [suggestion(file.id)] }, delayMs: 30 }))), chat = new WorkspaceChat(store, () => model);
  const stale = chat.organizeSources(request, new AbortController().signal).catch(error => error.message);
  store.placeSource(file.id, { collection: 'external', expectedRevisionId: null });
  expect(await stale).toContain('already been organized');
  const next = source('Another Northstar NDA');
  const abort = new AbortController(), cancelled = chat.organizeSources(base([next.id]), abort.signal).catch(error => error.message);
  const shutdown = chat.organizeSources(base([next.id]), new AbortController().signal).catch(error => error.message);
  abort.abort(); chat.stop(); await chat.idle();
  expect(await cancelled).toContain('stopped'); expect(await shutdown).toContain('stopped');
  expect(store.sourceLibrary({ collection: 'unfiled' }).records[0]!.id).toBe(next.id);
});
test('preview, suggestions and apply require authentication and reject extra fields', async () => {
  const file = source(), request = base([file.id]), model = new FakeModelProvider([{ output: { suggestions: [suggestion(file.id)] } }]);
  const handler = workspaceHandler({ store, chat: new WorkspaceChat(store, () => model), distDir: '/tmp', token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const call = (operation: string, data: unknown, token = 'fixture') => handler(new Request(`http://127.0.0.1:7432/api/workspace/source-organization/${operation}`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(data) }));
  for (const operation of ['preview', 'suggest', 'apply']) expect((await call(operation, {}, 'wrong')).status).toBe(401);
  expect((await call('preview', { sourceIds: [file.id], shareAll: true })).status).toBe(400);
  expect((await call('suggest', request)).status).toBe(200);
  expect((await call('apply', { sourceIds: [file.id], expectedVersion: request.expectedVersion, confirmAccessChanges: true, changes: [{ sourceId: file.id, target }] })).status).toBe(200);
});
