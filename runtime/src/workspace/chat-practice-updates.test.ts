import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { chatTools } from './chat-tools';
import { seedPluginContext } from './fixtures/plugin-context';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-practice-edit-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const update = { title: 'Employee monitoring position', body: 'Retain location records for 12 days. Document purpose and restrict access.', kind: 'position', scope: 'practice' };
function baseline(body = 'Retain location records for 14 days. Document purpose and restrict access.') {
  return store.createKnowledge({ kind: 'position', revision: { title: update.title, body, status: 'approved', approvedBy: 'Synthetic Lawyer' } });
}
function start(replaces: { kind: 'knowledge' | 'source'; id: string }, delayMs = 0) {
  const conversation = store.conversations.create({});
  const provider = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_propose_knowledge', input: { ...update, replaces } }], text: 'The revised standard is ready for your review.', delayMs }]);
  const chat = new WorkspaceChat(store, () => provider);
  const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Change our employee monitoring standard to a 12-day limit, keeping the other requirements.' });
  return { chat, turn, provider };
}
test('chat changes create a pending version of the existing baseline, with no duplicate standard or inferred approval', async () => {
  const original = baseline();
  const { chat, turn } = start({ kind: 'knowledge', id: original.latest.id }); await chat.idle();
  const saved = store.conversations.turn(turn.id), item = store.getKnowledge(original.id);
  expect(saved.status).toBe('complete');
  expect(saved.state.proposalIds).toEqual([original.id]);
  expect(saved.state.proposalRevisions).toEqual({ [item.id]: item.latest.id });
  expect(item.latest).toMatchObject({ number: 2, status: 'pending', body: update.body });
  expect(item.active!.id).toBe(original.latest.id);
  expect(store.catalog().knowledge).toHaveLength(1);
  const db = store.databasePath; store.close(); store = new WorkspaceStore({ databasePath: db });
  expect(store.conversations.turn(turn.id).state.proposalRevisions![item.id]).toBe(item.latest.id);
});
test('an imported original updates its matching Practice record and approval shadows that original for later chats', async () => {
  const ids = seedPluginContext(store);
  const { chat, turn } = start({ kind: 'source', id: ids.sourceRevisions.position! }); await chat.idle();
  expect(store.conversations.turn(turn.id).state.proposalIds).toEqual([ids.knowledge.position!]);
  const item = store.getKnowledge(ids.knowledge.position!);
  expect(item.latest.number).toBe(2);
  expect(item.active).toBeNull();
  expect(store.contextLibrary().records.some(record => record.id === ids.sourceRevisions.position)).toBe(true);
  store.reviseKnowledge(item.id, item.latest.id, { title: item.latest.title, body: item.latest.body, status: 'approved', approvedBy: 'Synthetic Lawyer' });
  expect(store.contextLibrary().records.some(record => record.id === ids.sourceRevisions.position)).toBe(false);
  expect(store.contextLibrary().records.some(record => record.id === store.getKnowledge(item.id).active!.id)).toBe(true);
  expect(store.catalog().knowledge).toHaveLength(4);
});
test('replacement requires complete base reads and cannot change scope, kind or overwrite an unseen pending edit', async () => {
  const item = baseline('x'.repeat(16_001));
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Change the standard' }, 'fixture').turn;
  const bundle = chatTools({ store, conversation, turn, attachments: [], signal: new AbortController().signal, save: () => {} });
  const input = { ...update, replaces: { kind: 'knowledge', id: item.latest.id } };
  const invoke = (value = input) => runToolDef(bundle.tools, 'counsel_propose_knowledge', value, 'workspace');
  expect((await invoke()).isError).toBe(true);
  await runToolDef(bundle.tools, 'counsel_read_record', { kind: 'knowledge', id: item.latest.id }, 'workspace');
  expect((await invoke()).isError).toBe(true);
  await runToolDef(bundle.tools, 'counsel_read_record', { kind: 'knowledge', id: item.latest.id, start: 16_000 }, 'workspace');
  expect((await invoke({ ...input, kind: 'language' })).isError).toBe(true);
  expect((await invoke()).isError).toBe(false);
  store.proposeKnowledgeUpdate(item.id, { expectedRevisionId: item.latest.id, title: item.latest.title, body: 'A separate pending edit.' });
  expect((await invoke()).isError).toBe(true);
});
test('rejecting a proposed edit keeps the imported baseline and permits a later explicit change without reviving a withdrawn original', async () => {
  const ids = seedPluginContext(store), id = ids.knowledge.position!;
  const first = start({ kind: 'source', id: ids.sourceRevisions.position! }); await first.chat.idle();
  const pending = store.getKnowledge(id).latest;
  store.reviewKnowledge(id, pending.id, 'reject', 'Synthetic Lawyer');
  expect(store.contextLibrary().records.some(record => record.id === ids.sourceRevisions.position)).toBe(true);
  expect(store.getKnowledge(id).importedOriginal?.revisionId).toBe(ids.sourceRevisions.position!);
  const next = start({ kind: 'source', id: ids.sourceRevisions.position! }); await next.chat.idle();
  expect(store.conversations.turn(next.turn.id).state.proposalIds).toEqual([id]);
  expect(store.getKnowledge(id).latest).toMatchObject({ number: 4, status: 'pending' });
  // A review of the original itself is different, and stays withdrawn through later pending edits.
  const method = store.getKnowledge(ids.knowledge.method!);
  store.reviewKnowledge(method.id, method.latest.id, 'reject', 'Synthetic Lawyer');
  store.proposeKnowledgeUpdate(method.id, { expectedRevisionId: store.getKnowledge(method.id).latest.id, title: method.latest.title, body: 'A new method still awaiting approval.' });
  expect(store.contextLibrary().records.some(record => record.id === ids.sourceRevisions.method)).toBe(false);
});
test('a rejected change to approved Practice does not block another explicit chat update to that same baseline', async () => {
  const original = baseline();
  const first = start({ kind: 'knowledge', id: original.latest.id }); await first.chat.idle();
  store.reviewKnowledge(original.id, store.getKnowledge(original.id).latest.id, 'reject', 'Synthetic Lawyer');
  const next = start({ kind: 'knowledge', id: original.latest.id }); await next.chat.idle();
  expect(store.conversations.turn(next.turn.id).state.proposalIds).toEqual([original.id]);
  expect(store.getKnowledge(original.id).latest).toMatchObject({ number: 4, status: 'pending' });
  expect(store.getKnowledge(original.id).active!.id).toBe(original.latest.id);
});
test('an imported source that changes while an update is prepared cannot be replaced from its old text', async () => {
  const ids = seedPluginContext(store);
  const { chat, turn } = start({ kind: 'source', id: ids.sourceRevisions.position! }, 80);
  await Bun.sleep(20);
  store.reviseSource(ids.sources.position!, ids.sourceRevisions.position!, { title: 'Employee monitoring position', body: 'Updated original baseline: retain records for 9 days.', provenance: { origin: 'user revision' } });
  await chat.idle();
  const saved = store.conversations.turn(turn.id);
  expect(saved.status).toBe('complete');
  expect(saved.state.proposalIds).toEqual([]);
  expect(saved.state.practiceUpdateConflicts).toHaveLength(1);
  expect(store.getKnowledge(ids.knowledge.position!).latest.number).toBe(1);
});
test('a concurrent edit survives while the answer completes with an explicit unsaved-change receipt', async () => {
  const original = baseline();
  const { chat, turn } = start({ kind: 'knowledge', id: original.latest.id }, 80);
  await Bun.sleep(20);
  const pending = store.proposeKnowledgeUpdate(original.id, { expectedRevisionId: original.latest.id, title: original.latest.title, body: 'A concurrent user edit.' });
  await chat.idle();
  const saved = store.conversations.turn(turn.id);
  expect(saved.status).toBe('complete');
  expect(saved.state.proposalIds).toEqual([]);
  expect(saved.state.practiceUpdateConflicts).toEqual([{ id: original.id, title: update.title }]);
  expect(store.getKnowledge(original.id).latest.id).toBe(pending.latest.id);
});
test('failed finalization leaves no pending practice edit', async () => {
  const item = baseline();
  store.recordWork = () => { throw new Error('Synthetic finalization failure'); };
  const { chat, turn } = start({ kind: 'knowledge', id: item.latest.id }); await chat.idle();
  expect(store.conversations.turn(turn.id).status).toBe('failed');
  expect(store.getKnowledge(item.id).latest.id).toBe(item.latest.id);
});
