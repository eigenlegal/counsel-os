import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { WorkspaceStore } from './store';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { seedPluginContext } from './fixtures/plugin-context';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { chatTools } from './chat-tools';
import { WorkspaceChat } from './chat';
import { workspaceHandler } from './http';
let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-record-lifecycle-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const source = () => store.createSource({ kind: 'document', revision: { title: 'Filecanary', body: 'Filecanary text', provenance: { origin: 'fixture' } } });
const boundary = { all: true, matterId: null, sourceRevisionIds: [], workIds: [] };
const send = (attachments: string[] = []) => ({ clientId: crypto.randomUUID(), message: 'Synthetic question', attachments });
const change = (kind: 'source' | 'work', id: string, action: 'trash' | 'restore') => store.changeRecord(kind, id, { action, confirm: true, expectedVersion: store.recordImpact(kind, id).version });

test('explicit matter filing and unlinking preserve originals, other links and exact citations, with stale protection', () => {
  const file = source(), a = store.createMatter({ title: 'A' }), b = store.createMatter({ title: 'B' });
  const before = store.sourceMatters(file.id);
  store.changeSourceMatter(file.id, { action: 'link', matterId: a.id, expectedVersion: before.version, confirm: true });
  expect(() => store.changeSourceMatter(file.id, { action: 'link', matterId: b.id, expectedVersion: before.version, confirm: true })).toThrow('changed');
  store.changeSourceMatter(file.id, { action: 'link', matterId: b.id, expectedVersion: store.sourceMatters(file.id).version, confirm: true });
  const work = store.recordWork({ title: 'Recorded advice', request: 'Check', answer: 'Preserved conclusion', matterId: a.id, evidence: [{ target: { kind: 'source', revisionId: file.latest.id }, quote: file.latest.body!, start: 0 }] });
  store.changeSourceMatter(file.id, { action: 'unlink', matterId: a.id, expectedVersion: store.sourceMatters(file.id).version, confirm: true });
  expect(store.getSource(file.id).matterIds).toEqual([b.id]);
  expect(store.getSource(file.id).latest).toEqual(file.latest);
  expect(store.getWork(work.id).evidence).toEqual(work.evidence);
  expect(store.search({ query: 'Filecanary', matterId: a.id }).hits).toHaveLength(0);
  expect(store.search({ query: 'Filecanary', matterId: b.id }).hits).toHaveLength(1);
});

test('source Trash excludes all revisions from every discovery path and tools, including attached IDs; restore retains evidence', async () => {
  const file = source();
  const latest = store.reviseSource(file.id, file.latest.id, { title: 'Filecanary later', body: 'Filecanary later text', textStatus: 'partial', provenance: { origin: 'fixture:later' } });
  const work = store.recordWork({ title: 'Advice', request: 'Review', answer: 'Conclusion', evidence: [{ target: { kind: 'source', revisionId: file.latest.id }, quote: file.latest.body!, start: 0 }] });
  const template = store.templates.create({ clientId: crypto.randomUUID(), title: 'Starting point', sourceRevisionId: file.latest.id, whenToUse: 'Synthetic', practiceWideUse: true });
  expect(store.recordImpact('source', file.id).retained.map(r => r.kind).sort()).toEqual(['template', 'work']);
  change('source', file.id, 'trash');
  expect(store.catalog().sources).toHaveLength(0);
  expect(store.sourceLibrary({ collection: 'practice' }).total).toBe(0);
  expect(store.search({ query: 'Filecanary', includeHistory: true }).hits).toHaveLength(0);
  expect(store.search({ query: 'missing' }).coverage.gaps).toHaveLength(0);
  expect(store.listRecords({ kind: 'source' }, boundary).total).toBe(0);
  expect(store.rankContext({ terms: ['Filecanary'] }, boundary)).toHaveLength(0);
  expect(store.sourceRevisionAvailable(file.latest.id)).toBe(false);
  expect(store.sourceRevisionAvailable(latest.id)).toBe(false);
  expect(store.templates.list().find(t => t.id === template.id)?.available).toBe(false);
  expect(store.getWork(work.id).evidence).toEqual(work.evidence);
  const c = store.conversations.create({});
  expect(() => store.conversations.begin(c.id, send([file.latest.id]), 'fixture')).toThrow('Trash');
  const turn = store.conversations.begin(c.id, send(), 'fixture').turn;
  expect(() => chatTools({ store, conversation: c, turn, attachments: [file.latest.id], signal: new AbortController().signal, save: () => {} })).toThrow('Trash');
  const { tools } = chatTools({ store, conversation: c, turn, attachments: [], signal: new AbortController().signal, save: () => {} });
  const result = await runToolDef(tools, 'counsel_read_record', { kind: 'source', id: file.latest.id }, 'workspace');
  expect(result.isError).toBe(true);
  change('source', file.id, 'restore');
  expect(store.getSource(file.id).latest).toEqual(latest);
  expect(store.templates.list().find(t => t.id === template.id)?.available).toBe(true);
  expect(store.search({ query: 'Filecanary', includeHistory: true }).hits).toHaveLength(2);
});

test('original-file and saved-output downloads block in Trash; restore retains exact bytes, related matter and transcript', async () => {
  const file = await store.importDocument({ name: 'original.txt', base64: Buffer.from('Original canary bytes').toString('base64') });
  const provider = new FakeModelProvider([{ text: 'Synthetic answer' }]), chat = new WorkspaceChat(store, () => provider);
  const c = store.conversations.create({}); const turn = chat.start(c.id, send([file.latest.id])); await chat.idle();
  const workId = store.conversations.turn(turn.id).workId!;
  store.saveOutput(workId, { title: 'Saved canary', kind: 'memo' });
  const exported = await store.exports.create(workId), bytes = store.exports.download(exported.id).bytes;
  change('work', workId, 'trash');
  expect(store.getWork(workId, true).lifecycle).toBe('trashed');
  expect(() => store.getWork(workId)).toThrow();
  expect(() => store.exports.download(exported.id)).toThrow('Trash');
  expect(store.catalog().savedWork).toHaveLength(0);
  expect(store.conversations.turns(c.id)[0]?.state.answer).toBe('Synthetic answer');
  expect(store.recordTrash({ kind: 'work' }).records[0]?.id).toBe(workId);
  change('work', workId, 'restore'); expect(store.exports.download(exported.id).bytes).toEqual(bytes);
  change('source', file.id, 'trash');
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://127.0.0.1:7432', distDir: root, demo: false });
  const download = () => handler(new Request(`http://127.0.0.1:7432/api/workspace/source-revisions/${file.latest.id}/original`, { headers: { authorization: 'Bearer fixture' } }));
  expect((await download()).status).toBe(409);
  change('source', file.id, 'restore'); expect((await download()).status).toBe(200);
  expect(store.originalFile(file.latest.id).bytes.toString()).toBe('Original canary bytes');
});

test('new turns omit inherited trashed attachments, while transcripts stay intact and explicit reattachment fails before a model call', async () => {
  const file = source(), c = store.conversations.create({});
  const provider = new FakeModelProvider([{ text: 'First answer' }, { text: 'Second answer' }]);
  let calls = 0; const chat = new WorkspaceChat(store, () => { calls++; return provider; });
  const t = chat.start(c.id, send([file.latest.id])); await chat.idle();
  change('source', file.id, 'trash');
  expect(() => chat.start(c.id, send([file.latest.id]))).toThrow(); expect(calls).toBe(1);
  chat.start(c.id, send()); await chat.idle();
  expect(provider.lastRequest?.system).not.toContain(file.latest.id);
  expect(store.conversations.turn(t.id).attachments).toEqual([file.latest.id]);
});

test('Trash withdraws imported originals, not independent approved practice replacements; receipts survive', () => {
  const ids = seedPluginContext(store), id = ids.sources.position!;
  change('source', id, 'trash');
  expect(store.contextLibrary().records.some(r => r.recordId === id)).toBe(false);
  expect(store.getKnowledge(ids.knowledge.position!).latest.status).toBe('pending');
  const k = store.getKnowledge(ids.knowledge.position!);
  store.reviseKnowledge(k.id, k.latest.id, { title: 'Adopted position', body: 'Independent approved material', status: 'approved', approvedBy: 'Synthetic user' });
  expect(store.contextLibrary().records.some(r => r.recordId === k.id)).toBe(true);
  change('source', id, 'restore');
  expect(store.contextLibrary().records.some(r => r.recordId === id)).toBe(false);
  expect(store.practiceOriginals(k.id)[0]?.sourceId).toBe(id);
});

test('stale previews and running attachments cannot be trashed', () => {
  const file = source(), stale = store.recordImpact('source', file.id);
  store.linkSource(store.createMatter({ title: 'Added later' }).id, file.id);
  expect(() => store.changeRecord('source', file.id, { action: 'trash', expectedVersion: stale.version, confirm: true })).toThrow('changed');
  const c = store.conversations.create({}); store.conversations.begin(c.id, send([file.latest.id]), 'fixture');
  expect(store.recordImpact('source', file.id).inUse).toBe(true);
  expect(() => change('source', file.id, 'trash')).toThrow('response');
});

test('schema-nine backups migrate safely; schema-ten Trash survives reopen and verified restore', async () => {
  const file = source(), path = store.databasePath;
  store.close(); const previous = new Database(path); previous.exec(DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; PRAGMA user_version=9;'); previous.close();
  const oldBackup = await createWorkspaceBackup(path); expect((await inspectWorkspaceBackup(oldBackup.bytes)).schemaVersion).toBe(9);
  store = new WorkspaceStore({ databasePath: path }); expect(store.getSource(file.id).latest).toEqual(file.latest);
  change('source', file.id, 'trash');
  const backup = await createWorkspaceBackup(path); expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(19);
  const saved = join(root, backup.name); writeFileSync(saved, backup.bytes);
  const recovered = await restoreWorkspaceBackup(saved, root), restored = new WorkspaceStore({ databasePath: recovered.databasePath });
  try { expect(restored.recordTrash({ kind: 'source' }).records[0]?.id).toBe(file.id); expect(restored.search({ query: 'Filecanary' }).hits).toHaveLength(0); } finally { restored.close(); }
});

test('record and filing routes authenticate, validate confirmations, and reject unexpected fields', async () => {
  const file = source(), m = store.createMatter({ title: 'Matter' });
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://127.0.0.1:7432', distDir: root, demo: false });
  const req = (path: string, input?: unknown, auth = true) => handler(new Request('http://127.0.0.1:7432/api/workspace' + path, { method: input ? 'POST' : 'GET', headers: { ...(auth ? { authorization: 'Bearer fixture' } : {}), 'content-type': 'application/json' }, ...(input ? { body: JSON.stringify(input) } : {}) }));
  expect((await req('/trash?kind=source', undefined, false)).status).toBe(401);
  expect((await req('/trash?kind=unknown')).status).toBe(400);
  expect((await req(`/sources/${file.id}/manage`, { action: 'trash', expectedVersion: store.recordImpact('source', file.id).version })).status).toBe(400);
  expect((await req(`/sources/${file.id}/matters`, { action: 'link', matterId: m.id, expectedVersion: store.sourceMatters(file.id).version, confirm: true, approve: true })).status).toBe(400);
  expect((await req(`/sources/${file.id}/matters`, { action: 'link', matterId: m.id, expectedVersion: store.sourceMatters(file.id).version, confirm: true })).status).toBe(200);
  expect((await req(`/sources/${file.id}/manage`, { action: 'trash', expectedVersion: store.recordImpact('source', file.id).version, confirm: true })).status).toBe(200);
});
