import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { Database } from 'bun:sqlite';
import { runToolDef } from '../core/fake-provider';
import type { Turn } from './conversations';
import { chatTools } from './chat-tools';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let store: WorkspaceStore;
let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-chat-lifecycle-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const send = (message = 'promptcanary') => ({ clientId: crypto.randomUUID(), message, attachments: [] });
const boundary = { all: true, matterId: null, sourceRevisionIds: [], workIds: [] };
function change(id: string, action: 'trash' | 'restore' | 'archive' | 'rename', title?: string) {
  return store.conversations.change(id, { expectedVersion: store.conversations.impact(id).version, action, ...(title ? { title } : {}) });
}
async function complete(options: { attachments?: string[]; prepare?: (turn: Turn, matterId: string) => void } = {}) {
  const matter = store.createMatter({ title: 'Synthetic advice' });
  const conversation = store.conversations.create({ scope: 'matter', matterId: matter.id });
  const { turn } = store.conversations.begin(conversation.id, { ...send(), attachments: options.attachments ?? [] }, 'fixture');
  turn.workId = store.recordWork({ title: 'promptcanary', request: 'promptcanary', answer: 'answercanary', matterId: matter.id }).id;
  options.prepare?.(turn, matter.id);
  turn.state.answer = 'answercanary'; turn.status = 'complete'; turn.finishedAt = new Date().toISOString();
  store.conversations.save(turn);
  return { matter, conversation, turn: store.conversations.turn(turn.id) };
}

test('rename, archive and restore preserve history; Trash excludes copies from every discovery path and direct model reads', async () => {
  const { conversation, turn } = await complete();
  change(conversation.id, 'rename', 'A meaningful name');
  expect(store.conversations.get(conversation.id).title).toBe('A meaningful name');
  change(conversation.id, 'archive');
  expect(store.conversations.list()).toHaveLength(0);
  expect(store.conversations.list(undefined, undefined, 'archived')).toHaveLength(1);
  expect(store.search({ query: 'answercanary' }).hits).toHaveLength(1);
  expect(() => store.conversations.begin(conversation.id, send(), 'fake')).toThrow('Restore');
  change(conversation.id, 'trash');
  expect(store.conversations.list(undefined, undefined, 'trashed')).toHaveLength(1);
  expect(store.search({ query: 'answercanary', includeHistory: true }).hits).toHaveLength(0);
  expect(store.listRecords({ kind: 'work' }, boundary).total).toBe(0);
  expect(store.rankContext({ terms: ['answercanary'] }, boundary)).toHaveLength(0);
  expect(store.catalog().work).toHaveLength(0);
  expect(store.listWork()).toHaveLength(0);
  expect(() => store.getWork(turn.workId!)).toThrow();
  const next = store.conversations.create({ scope: 'workspace' });
  const current = store.conversations.begin(next.id, send('Another question'), 'fixture').turn;
  const { tools } = chatTools({ store, conversation: next, turn: current, attachments: [], signal: new AbortController().signal, save: () => {} });
  const read = await runToolDef(tools, 'counsel_read_record', { kind: 'work', id: turn.workId! }, 'workspace');
  expect(read.isError).toBe(true);
  expect(String(read.output)).toContain('unknown work');
  change(conversation.id, 'restore');
  expect(store.search({ query: 'promptcanary' }).hits).toHaveLength(1);
  expect(store.getWork(turn.workId!).answer).toBe('answercanary');
  expect(store.conversations.turns(conversation.id)).toHaveLength(1);
});

test('saved outputs and linked documents remain, without indexing or displaying the deleted prompt', async () => {
  const source = store.createSource({ kind: 'document', revision: { title: 'Attached original', body: 'Document contents', provenance: { origin: 'fixture:document' } } });
  const { conversation, turn } = await complete({ attachments: [source.latest.id] });
  store.saveOutput(turn.workId!, { title: 'Saved advice', kind: 'memo' });
  const impact = store.conversations.impact(conversation.id);
  expect(impact.retained.map(item => item.kind).sort()).toEqual(['source', 'work']);
  change(conversation.id, 'trash');
  expect(store.getSource(source.id).latest.body).toBe('Document contents');
  expect(store.search({ query: 'promptcanary' }).hits).toHaveLength(0);
  expect(store.search({ query: 'answercanary' }).hits[0]?.recordId).toBe(turn.workId!);
  const output = store.getWork(turn.workId!);
  expect(output.title).toBe('Saved advice'); expect(output.request).toBe(''); expect(output.origin).toBeNull();
  expect(store.catalog().savedWork).toHaveLength(1);
  change(conversation.id, 'restore');
  expect(store.getWork(turn.workId!).request).toBe('promptcanary');
  expect(store.search({ query: 'promptcanary' }).hits).toHaveLength(1);
});

test('a stale confirmation cannot hide a new output and running chats cannot be managed', async () => {
  const { conversation, turn } = await complete();
  const before = store.conversations.impact(conversation.id);
  store.saveOutput(turn.workId!, { title: 'Later saved output', kind: 'memo' });
  expect(() => store.conversations.change(conversation.id, { expectedVersion: before.version, action: 'trash' })).toThrow('changed');
  store.conversations.begin(conversation.id, send('Working'), 'fake');
  expect(() => change(conversation.id, 'trash')).toThrow('wait');
  expect(() => change(conversation.id, 'rename', 'A new title')).toThrow('wait');
});

test('applied matter changes and Practice proposals are listed and are not undone', async () => {
  const item = store.createKnowledge({ kind: 'position', revision: { title: 'Practice proposal', body: 'Proposed text' } });
  const { matter, conversation } = await complete({ prepare: (turn, matterId) => {
    const brief = store.saveMatterBrief(matterId, { expectedRevisionId: null, status: 'open', summary: 'Saved matter update', questions: '', nextActions: '' });
    turn.state.proposalIds = [item.id];
    turn.state.briefProposal = { matterId, appliedRevisionId: brief.id } as typeof turn.state.briefProposal;
  } });
  expect(store.conversations.impact(conversation.id).retained.map(item => item.kind).sort()).toEqual(['knowledge', 'matter']);
  change(conversation.id, 'trash');
  expect(store.matterBrief(matter.id)?.summary).toBe('Saved matter update');
  expect(store.getKnowledge(item.id).latest.body).toBe('Proposed text');
});

test('Trash survives reopen and verified backup restore without resurrecting searchable copies', async () => {
  const { conversation } = await complete();
  change(conversation.id, 'trash');
  const path = store.databasePath;
  store.close(); store = new WorkspaceStore({ databasePath: path });
  const backup = await createWorkspaceBackup(store.databasePath);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(19);
  const backupPath = join(root, backup.name); writeFileSync(backupPath, backup.bytes);
  const recovered = await restoreWorkspaceBackup(backupPath, root);
  const restored = new WorkspaceStore({ databasePath: recovered.databasePath });
  try {
    expect(restored.conversations.list()).toHaveLength(0);
    expect(restored.conversations.get(conversation.id).lifecycle).toBe('trashed');
    expect(restored.search({ query: 'answercanary' }).hits).toHaveLength(0);
  } finally { restored.close(); }
});

test('existing schema-eight workspaces and backups upgrade without changing records', async () => {
  const { conversation, turn } = await complete();
  const path = store.databasePath;
  store.close();
  const previous = new Database(path);
  previous.exec(DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; DROP TABLE conversation_lifecycle; PRAGMA user_version = 8;');
  previous.close();
  try {
    const backup = await createWorkspaceBackup(path);
    expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(8);
    const backupPath = join(root, backup.name); writeFileSync(backupPath, backup.bytes);
    const recovered = await restoreWorkspaceBackup(backupPath, root);
    const restored = new WorkspaceStore({ databasePath: recovered.databasePath });
    try {
      expect(restored.conversations.get(conversation.id).lifecycle).toBe('active');
      expect(restored.getWork(turn.workId!).answer).toBe('answercanary');
    } finally { restored.close(); }
  } finally { store = new WorkspaceStore({ databasePath: path }); }
  expect(store.conversations.list()[0]?.id).toBe(conversation.id);
  expect(store.getWork(turn.workId!).request).toBe('promptcanary');
});
