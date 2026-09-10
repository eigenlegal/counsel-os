import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { chatTools } from './chat-tools';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-citation-tools-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const source = (matterId: string, body: string) => store.createSource({ kind: 'reference', matterIds: [matterId], revision: { title: 'Synthetic record', body, provenance: { origin: 'fixture' } } });
function bundle(matterId: string) {
  const conversation = store.conversations.create({ matterId, scope: 'matter' });
  const turn = store.conversations.begin(conversation.id, { message: 'Verify this record.', clientId: crypto.randomUUID() }, 'fixture').turn;
  const kit = chatTools({ store, conversation, turn, attachments: [], signal: new AbortController().signal, save: () => {} });
  return { ...kit, turn, call: (name: string, input: unknown) => runToolDef(kit.tools, name, input, 'workspace') };
}

test('quote-only citations and wrong legacy offsets resolve exact read text, deduplicate and preserve read boundaries', async () => {
  const matter = store.createMatter({ title: 'Aster' });
  const text = '🧭 Opening. Exact evidence. UNREAD-CANARY';
  const record = source(matter.id, text), { call, turn } = bundle(matter.id);
  const input = { kind: 'source', id: record.latest.id, quote: 'Exact evidence.' };
  expect((await call('counsel_cite_passage', input)).isError).toBe(true);
  const read = await call('counsel_read_record', { kind: 'source', id: record.latest.id, length: text.indexOf('UNREAD-CANARY') });
  const handle = (read.output as { readHandle: string }).readHandle;
  for (const start of [undefined, 0, 2874]) {
    const result = await call('counsel_cite_passage', { ...input, id: handle, ...(start === undefined ? {} : { start }) });
    expect(result.isError).toBe(false);
    expect(result.output).toMatchObject({ marker: '[S1]', id: record.latest.id, quote: input.quote, start: text.indexOf(input.quote) });
  }
  expect(turn.state.citations).toHaveLength(1);
  for (const quote of ['UNREAD-CANARY', 'Exact Evidence.', 'Exact evidence. UNREAD-CANARY'])
    expect((await call('counsel_cite_passage', { ...input, quote })).isError).toBe(true);
  expect(turn.state.citations).toHaveLength(1);
  const outside = source(store.createMatter({ title: 'Outside' }).id, input.quote);
  expect((await call('counsel_cite_passage', { ...input, id: outside.latest.id })).isError).toBe(true);
});

test('ambiguous quotes never receive a citation until disambiguated, and unread duplicates stay undisclosed', async () => {
  const matter = store.createMatter({ title: 'Aster' });
  const text = 'First: accepted. Second: accepted. PRIVATE accepted.';
  const record = source(matter.id, text), { call, turn } = bundle(matter.id);
  await call('counsel_read_record', { kind: 'source', id: record.latest.id, length: text.indexOf('PRIVATE') });
  const input = { kind: 'source', id: record.latest.id, quote: 'accepted.' };
  const result = await call('counsel_cite_passage', input);
  expect(result.isError).toBe(true);
  expect(result.output).toContain('7, 25');
  expect(result.output).not.toContain('PRIVATE');
  expect(result.output).not.toContain(String(text.lastIndexOf('accepted.')));
  expect(turn.state.citations).toEqual([]);
  expect((await call('counsel_cite_passage', { ...input, start: 8 })).isError).toBe(true);
  expect((await call('counsel_cite_passage', { ...input, start: 25 })).isError).toBe(false);
  expect(turn.state.citations[0]?.start).toBe(25);
});

test('location applies to approved Practice and prior work without weakening revision checks', async () => {
  const matter = store.createMatter({ title: 'Aster' });
  const knowledge = store.createKnowledge({ kind: 'position', revision: { title: 'Position', body: 'Our exact position.' } });
  const approved = store.reviseKnowledge(knowledge.id, knowledge.latest.id, { title: 'Position', body: 'Our exact position.', status: 'approved', approvedBy: 'Synthetic reviewer' });
  const work = store.recordWork({ matterId: matter.id, title: 'Earlier advice', request: 'Question', answer: 'Earlier exact advice.' });
  const { call, turn } = bundle(matter.id);
  for (const [kind, id, quote] of [['knowledge', approved.id, 'exact position.'], ['work', work.id, 'exact advice.']]) {
    expect((await call('counsel_read_record', { kind, id })).isError).toBe(false);
    expect((await call('counsel_cite_passage', { kind, id, quote })).isError).toBe(false);
  }
  expect(turn.state.citations.map(c => c.target.kind)).toEqual(['knowledge', 'work']);
  expect((await call('counsel_cite_passage', { kind: 'knowledge', id: knowledge.latest.id, quote: 'exact position.' })).isError).toBe(true);
});

test('moving a read source to Trash still blocks quote-only citation', async () => {
  const matter = store.createMatter({ title: 'Aster' }), record = source(matter.id, 'Exact evidence.');
  const { call, turn } = bundle(matter.id);
  await call('counsel_read_record', { kind: 'source', id: record.latest.id });
  store.changeRecord('source', record.id, { action: 'trash', confirm: true, expectedVersion: store.recordImpact('source', record.id).version });
  expect((await call('counsel_cite_passage', { kind: 'source', id: record.latest.id, quote: 'Exact evidence.' })).isError).toBe(true);
  expect(turn.state.citations).toEqual([]);
});

test('computed offsets persist in completed evidence through revised sources, restart and backup restore', async () => {
  const matter = store.createMatter({ title: 'Aster' });
  const body = '🧭 Preface.\nVerified quote.';
  const record = source(matter.id, body);
  const conversation = store.conversations.create({ matterId: matter.id, scope: 'matter' });
  const chat = new WorkspaceChat(store, () => new FakeModelProvider([{ toolCalls: [
    { name: 'counsel_read_record', input: { kind: 'source', id: record.latest.id } },
    { name: 'counsel_cite_passage', input: { kind: 'source', id: record.latest.id, quote: 'Verified quote.' } },
  ], text: 'Verified quote. [S1]' }]));
  try {
    const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Verify the quote.' });
    await chat.idle();
    const saved = store.conversations.turn(started.id);
    expect(saved.status).toBe('complete');
    expect(saved.state.citations[0]).toMatchObject({ target: { kind: 'source', revisionId: record.latest.id }, quote: 'Verified quote.', start: body.indexOf('Verified quote.') });
    expect(store.getWork(saved.workId!).evidence[0]).toMatchObject({ quote: 'Verified quote.', start: body.indexOf('Verified quote.') });
    store.reviseSource(record.id, record.latest.id, { title: 'Revised', body: 'Changed record.', provenance: { origin: 'fixture:new' } });
    const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
    writeFileSync(path, backup.bytes);
    const restored = await restoreWorkspaceBackup(path, root);
    const copy = new WorkspaceStore({ databasePath: restored.databasePath });
    try {
      expect(copy.conversations.turn(started.id).state.citations).toEqual(saved.state.citations);
      expect(copy.getWork(saved.workId!).evidence[0]).toMatchObject({ quote: 'Verified quote.', start: body.indexOf('Verified quote.') });
      expect(copy.getSourceRevision(record.latest.id).body).toBe(body);
    } finally { copy.close(); }
  } finally { chat.stop(); await chat.idle(); }
});
