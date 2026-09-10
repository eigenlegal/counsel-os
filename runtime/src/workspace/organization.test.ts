import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { workspaceHandler } from './http';
let root: string, store: WorkspaceStore;
const active: WorkspaceChat[] = [];
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-organization-test-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(async () => {
  for (const chat of active.splice(0)) {
    chat.stop();
    await chat.idle();
  }
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const outputCall = {
  name: 'counsel_prepare_output',
  input: { title: 'Interview memorandum', kind: 'memo' as const },
};
function chatFor(provider: FakeModelProvider) {
  const chat = new WorkspaceChat(store, () => provider);
  active.push(chat);
  return chat;
}
const send = () => ({ clientId: crypto.randomUUID(), message: 'Draft the memorandum.' });

test('ordinary replies remain searchable history but do not crowd saved outputs; named outputs link to their conversation', async () => {
  const matter = store.createMatter({ title: 'Investigation' });
  const c = store.conversations.create({ scope: 'matter', matterId: matter.id });
  const chat = chatFor(
    new FakeModelProvider([
      { text: 'A conversational answer.' },
      { toolCalls: [outputCall], text: 'A substantive memorandum.' },
    ]),
  );
  const first = chat.start(c.id, send());
  await chat.idle();
  expect(store.catalog().savedWork).toEqual([]);
  expect(store.search({ query: 'conversational' }).hits).toHaveLength(1);
  expect(store.getWork(store.conversations.turn(first.id).workId!).origin).toEqual({
    conversationId: c.id,
    turnId: first.id,
  });
  const second = chat.start(c.id, send());
  await chat.idle();
  const result = store.conversations.turn(second.id);
  expect(result.status).toBe('complete');
  expect(result.state.output).toMatchObject(outputCall.input);
  expect(store.catalog().savedWork).toHaveLength(1);
  expect(store.catalog().savedWork[0]).toMatchObject({
    title: 'Interview memorandum',
    outputKind: 'memo',
    conversationId: c.id,
  });
  const saved = store.getWork(result.workId!);
  expect(saved.answer).toBe('A substantive memorandum.');
  expect(saved.disposition).toBe('draft');
  expect(store.saveOutput(saved.id, outputCall.input)).toEqual(saved);
  expect(() => store.saveOutput(saved.id, { title: 'Replace', kind: 'other' })).toThrow(
    'already saved',
  );
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.getWork(saved.id)).toEqual(saved);
});

test('saved notes and decisions survive; filtering occurs before the catalog limit', async () => {
  const m = store.createMatter({ title: 'Keep my notes' });
  const note = store.recordWork({
    title: 'Existing note',
    request: 'Remember',
    answer: 'Retained',
    matterId: m.id,
  });
  const decision = store.recordWork({
    title: 'Existing decision',
    request: 'Record',
    answer: 'Wait',
    decisionBy: 'Historical reviewer',
    matterId: m.id,
  });
  const chat = chatFor(
    new FakeModelProvider([{ text: 'Recent chat noise' }, { text: 'More recent chat noise' }]),
  );
  const c = store.conversations.create({ scope: 'matter', matterId: m.id });
  chat.start(c.id, send());
  await chat.idle();
  chat.start(c.id, send());
  await chat.idle();
  const saved = store.catalog(2, m.id).savedWork;
  expect(saved.map((w) => w.id).sort()).toEqual([note.id, decision.id].sort());
  expect(() => store.saveOutput(decision.id, { title: 'A memo', kind: 'memo' })).toThrow(
    'decision',
  );
  expect(store.getWork(decision.id).decisionBy).toBe('Historical reviewer');
});

test('manually keeping an answer updates its receipt without copying text or losing citations', async () => {
  const source = store.createSource({
    kind: 'reference',
    revision: { title: 'Evidence', body: 'Exact text.', provenance: { origin: 'fixture' } },
  });
  const work = store.recordWork({
    title: 'Original title',
    request: 'Assess',
    answer: 'Analysis',
    evidence: [
      { target: { kind: 'source', revisionId: source.latest.id }, start: 0, quote: 'Exact text.' },
    ],
  });
  const before = work.evidence;
  const saved = store.saveOutput(work.id, { title: 'Named assessment', kind: 'assessment' });
  expect(saved.evidence).toEqual(before);
  expect(saved.contentHash).toBe(work.contentHash);
  expect(store.search({ query: 'Named assessment' }).hits[0]?.recordId).toBe(work.id);
  expect(store.search({ query: 'Named assessment' }).hits[0]?.title).toBe('Named assessment');
  expect(store.listWork()).toHaveLength(1);
});

test('failed responses cannot leave a named output behind', async () => {
  const chat = chatFor(
    new FakeModelProvider([
      { toolCalls: [outputCall], text: 'Partial', error: 'Synthetic failure' },
    ]),
  );
  const turn = chat.start(store.conversations.create({}).id, send());
  await chat.idle();
  expect(store.conversations.turn(turn.id).status).toBe('failed');
  expect(store.listWork()).toHaveLength(0);
  expect(store.catalog().savedWork).toEqual([]);
});

test('manual output promotion updates only the output receipt of an already completed response', async () => {
  const chat = chatFor(new FakeModelProvider([{ text: 'Keep this completed answer.' }]));
  const turn = chat.start(store.conversations.create({}).id, send());
  await chat.idle();
  const before = store.conversations.turn(turn.id);
  const work = store.saveOutput(before.workId!, { title: 'Kept answer', kind: 'other' });
  expect(store.conversations.turn(turn.id)).toEqual({
    ...before,
    state: { ...before.state, output: work.output },
  });
  expect(store.saveOutput(work.id, { title: 'Kept answer', kind: 'other' })).toEqual(work);
  expect(store.listWork()).toHaveLength(1);
});

test('matter briefs are revision checked, scoped to the matter, and preserved in response context', async () => {
  const matter = store.createMatter({ title: 'Advice', summary: 'Original context' });
  const fields = {
    status: 'open' as const,
    summary: 'Current context',
    questions: 'Who witnessed it?',
    nextActions: 'Arrange an interview',
    expectedRevisionId: null,
  };
  const brief = store.saveMatterBrief(matter.id, fields);
  expect(store.catalog().matters.find((m) => m.id === matter.id)?.summary).toBe('Current context');
  expect(() => store.saveMatterBrief(matter.id, fields)).toThrow('changed');
  const provider = new FakeModelProvider([{ text: 'Answer' }]);
  const chat = chatFor(provider);
  const c = store.conversations.create({ scope: 'matter', matterId: matter.id });
  const turn = chat.start(c.id, send());
  await chat.idle();
  expect(provider.lastRequest!.system).toContain('Who witnessed it?');
  store.saveMatterBrief(matter.id, {
    ...fields,
    expectedRevisionId: brief.id,
    summary: 'Changed later',
    status: 'closed',
  });
  expect(store.conversations.turn(turn.id).state.matterContext).toMatchObject({
    summary: 'Current context',
    briefRevisionId: brief.id,
    status: 'open',
  });
  const other = store.createMatter({ title: 'Other' });
  for (let n = 0; n < 201; n++) store.conversations.create({ scope: 'matter', matterId: other.id });
  expect(store.conversations.list(matter.id).map((v) => v.id)).toEqual([c.id]);
});

test('version-two upgrade preserves earlier records and does not classify every reply as an output', () => {
  const before = store.recordWork({ title: 'Legacy note', request: 'Keep', answer: 'Preserved' });
  const path = store.databasePath;
  store.close();
  const db = new Database(path);
  db.exec(
    DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; DROP TABLE conversation_lifecycle; DROP TABLE conversation_clients; DROP TABLE matter_clients; DROP TABLE clients; DROP TABLE source_placements; DROP TABLE import_entries; DROP TABLE import_batches; DROP TABLE template_revisions; DROP TABLE practice_templates; DROP TABLE work_exports; DROP TABLE source_extractions; DROP TABLE work_outputs; DROP TABLE matter_briefs; DROP INDEX turn_by_work; PRAGMA user_version = 2;',
  );
  db.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.getWork(before.id)).toEqual(before);
  expect(store.catalog().savedWork[0]?.outputKind).toBeNull();
});

test('organization routes require authentication and reject invalid or stale inputs', async () => {
  const origin = 'http://127.0.0.1:7465';
  const handler = workspaceHandler({
    store,
    origin,
    token: 'synthetic',
    distDir: root,
    demo: false,
  });
  const m = store.createMatter({ title: 'HTTP matter' });
  const call = (path: string, input?: unknown, auth = true) =>
    handler(
      new Request(origin + '/api/workspace' + path, {
        method: input ? 'POST' : 'GET',
        headers: {
          ...(auth ? { authorization: 'Bearer synthetic' } : {}),
          'content-type': 'application/json',
        },
        ...(input ? { body: JSON.stringify(input) } : {}),
      }),
    );
  const input = {
    expectedRevisionId: null,
    status: 'open',
    summary: 'HTTP context',
    questions: '',
    nextActions: '',
  };
  expect((await call(`/matters/${m.id}/brief`, input, false)).status).toBe(401);
  expect((await call(`/matters/${m.id}/brief`, { ...input, approvedBy: 'Fake' })).status).toBe(400);
  expect((await call(`/matters/${m.id}/brief`, input)).status).toBe(200);
  expect((await call(`/matters/${m.id}/brief`, input)).status).toBe(409);
  expect(await (await call(`/matters/${m.id}/context`)).json()).toMatchObject({
    conversations: [],
    brief: { summary: 'HTTP context' },
  });
});

test('organizing later preserves IDs, citations and earlier scope while sharing only on explicit confirmation', async () => {
  const source = store.createSource({
    kind: 'reference',
    revision: {
      title: 'Attached evidence',
      body: 'Synthetic evidence',
      provenance: { origin: 'fixture' },
    },
  });
  const chat = chatFor(
    new FakeModelProvider([{ text: 'First discussion' }, { text: 'Matter follow-up' }]),
  );
  const c = store.conversations.create({});
  const first = chat.start(c.id, { ...send(), attachments: [source.latest.id] });
  await chat.idle();
  const before = store.conversations.turn(first.id);
  const input = {
    requestId: crypto.randomUUID(),
    title: 'New matter from discussion',
    confirmShare: true as const,
  };
  expect(() =>
    store.organizeConversation(c.id, { ...input, confirmShare: false as never }),
  ).toThrow();
  const organized = store.organizeConversation(c.id, input);
  expect(organized).toMatchObject({ id: c.id, scope: 'matter' });
  expect(store.organizeConversation(c.id, input)).toEqual(organized);
  expect(store.listMatters()).toHaveLength(1);
  expect(store.getWork(before.workId!).matterId).toBe(organized.matterId);
  expect(store.getSource(source.id).matterIds).toEqual([organized.matterId!]);
  expect(store.conversations.turn(first.id)).toEqual(before);
  const second = chat.start(c.id, send());
  await chat.idle();
  expect(store.conversations.turn(second.id).state.scopeContext).toEqual({
    scope: 'matter',
    matterId: organized.matterId,
  });
  expect(() =>
    store.organizeConversation(c.id, { ...input, requestId: crypto.randomUUID() }),
  ).toThrow();
});

test('organizing refuses running and cross-matter chats and rolls back a conflicting existing work assignment', async () => {
  const chat = chatFor(new FakeModelProvider([{ text: 'Held', delayMs: 20 }]));
  const c = store.conversations.create({});
  const turn = chat.start(c.id, send());
  const input = {
    requestId: crypto.randomUUID(),
    title: 'Do not create prematurely',
    confirmShare: true as const,
  };
  expect(() => store.organizeConversation(c.id, input)).toThrow('Wait');
  expect(store.listMatters()).toHaveLength(0);
  await chat.idle();
  const other = store.createMatter({ title: 'Existing assignment' });
  store.assignWork(store.conversations.turn(turn.id).workId!, other.id);
  expect(() => store.organizeConversation(c.id, input)).toThrow('another matter');
  expect(store.listMatters()).toHaveLength(1);
  expect(store.conversations.get(c.id).scope).toBe('conversation');
  const wide = store.conversations.create({ scope: 'workspace' });
  expect(() => store.organizeConversation(wide.id, input)).toThrow('outside a matter');
});
