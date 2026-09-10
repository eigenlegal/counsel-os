import { afterEach, beforeEach, expect, test } from 'bun:test';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { BriefDraftInput } from './brief-drafting';
import { workspaceHandler } from './http';

let store: WorkspaceStore;
beforeEach(() => { store = new WorkspaceStore({ databasePath: ':memory:' }); });
afterEach(() => store.close());
const fields = { status: 'open' as const, summary: 'Original summary.', questions: 'Unresolved.', nextActions: '' };
const result = { ...fields, summary: 'Revised synthetic brief.', question: '' };
function input() {
  const matter = store.createMatter({ title: 'Selected matter', summary: 'Imported pointer only.' });
  return { matterId: matter.id, expectedRevisionId: null, instruction: 'Use saved history to update the brief.',
    draft: fields, modelChoice: { kind: 'codex' as const, model: 'synthetic' } };
}
test('brief helper reads actual scoped notes, pins exact passages, and never saves or broadens to a client', async () => {
  const request = input(), other = store.createMatter({ title: 'Other matter' });
  store.saveProfile({ name: 'Private author', applyToChats: false, expectedRevisionId: null });
  store.saveWorkingPreferences({ expectedRevisionId: null, writingInstructions: 'Writing sentinel.' });
  const note = store.createSource({ kind: 'reference', matterIds: [request.matterId], revision: {
    title: 'Historical imported note', body: 'START MATTER HISTORY ' + 'middle '.repeat(2000) + 'LATEST END HISTORY', provenance: { origin: 'plugin:matters/old.md' } } });
  for (let i = 0; i < 6; i++) store.createSource({ kind: 'reference', matterIds: [request.matterId], revision: {
    title: `Document ${i}`, body: 'Supporting text.', provenance: { origin: 'fixture' } } });
  store.createSource({ kind: 'reference', matterIds: [other.id], revision: {
    title: 'Private other matter', body: 'OUT OF SCOPE SENTINEL', provenance: { origin: 'plugin:matters/other.md' } } });
  store.recordWork({ matterId: request.matterId, title: 'Prior advice', request: 'Advise.', answer: 'DRAFT ADVICE SENTINEL' });
  const before = store.listWork().length, model = new FakeModelProvider([{ output: result }]);
  const response = await new WorkspaceChat(store, () => model).draftBrief(request, new AbortController().signal);
  expect(response.draft).toEqual(result);
  expect(response.records[0]!.id).toBe(note.latest.id);
  expect(response.records[0]!.partial).toBe(true);
  expect(response.records[0]!.passages[1]!.text).toEndWith('LATEST END HISTORY');
  expect(response.omittedRecords).toBe(3);
  expect(response.records).toHaveLength(5);
  expect(model.lastRequest!.system).toContain('START MATTER HISTORY');
  expect(model.lastRequest!.system).toContain('DRAFT ADVICE SENTINEL');
  expect(model.lastRequest!.system).toContain('Writing sentinel.');
  expect(model.lastRequest!.system).not.toContain('OUT OF SCOPE SENTINEL');
  expect(model.lastRequest!.system).not.toContain('Private author');
  expect(model.lastRequest!.tools).toHaveLength(0);
  expect(store.matterBrief(request.matterId)).toBeNull();
  expect(store.getMatter(request.matterId).summary).toBe('Imported pointer only.');
  expect(store.listWork()).toHaveLength(before);
  expect(store.catalog().knowledge).toHaveLength(0);
  expect(store.conversations.list()).toHaveLength(0);
});
test('missing history is explicit; clarifications preserve the form and stale versions are rejected', async () => {
  const request = input(), model = new FakeModelProvider([{ output: { ...fields, question: 'What changed?' } }]);
  const chat = new WorkspaceChat(store, () => model);
  const response = await chat.draftBrief(request, new AbortController().signal);
  expect(response.draft.question).toBe('What changed?');
  expect(response.records).toEqual([]);
  store.saveMatterBrief(request.matterId, { ...fields, expectedRevisionId: null });
  await expect(chat.draftBrief(request, new AbortController().signal)).rejects.toThrow('changed');
});
test('brief updates retrieve deep passages from old notes and advice beyond the newest 300, with exact bounded receipts', async () => {
  const request = { ...input(), instruction: 'Update the brief with the Heliotrope novation consent requirement.' };
  const other = store.createMatter({ title: 'Another client matter' });
  const quote = 'Café Heliotrope novation requires written consent; the request is still pending.';
  const body = 'Background 🧭 paragraph.\n'.repeat(1000) + quote + '\n' + 'Other dated history.\n'.repeat(1000);
  const note = store.createSource({ kind: 'reference', matterIds: [request.matterId], revision: {
    title: 'Older general correspondence', body, provenance: { origin: 'fixture:history' } } });
  const work = store.recordWork({ matterId: request.matterId, title: 'Earlier advice', request: 'What should we do?', answer: body });
  const outdated = store.createSource({ kind: 'reference', matterIds: [request.matterId], revision: {
    title: 'Heliotrope novation old draft', body: 'OUTDATED-CANARY: Heliotrope novation was waived.', provenance: { origin: 'fixture' } } });
  store.reviseSource(outdated.id, outdated.latest.id, { title: 'Routine billing', body: 'Current billing contact.', provenance: { origin: 'fixture:replacement' } });
  for (let i = 0; i < 330; i++) {
    store.createSource({ kind: 'reference', matterIds: [request.matterId], revision: {
      title: `Newer unrelated file ${i}`, body: 'General operational background.', provenance: { origin: 'fixture' } } });
    store.recordWork({ matterId: request.matterId, title: `Recent unrelated advice ${i}`, request: 'Help.', answer: 'Routine background.' });
  }
  for (let i = 0; i < 35; i++) store.createSource({ kind: 'reference', matterIds: [other.id], revision: {
    title: 'Heliotrope novation', body: 'OTHER-MATTER-CANARY Heliotrope novation.', provenance: { origin: 'fixture' } } });
  store.createSource({ kind: 'reference', revision: { title: 'Heliotrope novation unassigned', body: 'UNASSIGNED-CANARY', provenance: { origin: 'fixture' } } });
  const model = new FakeModelProvider([{ output: result }]);
  const response = await new WorkspaceChat(store, () => model).draftBrief(request, new AbortController().signal);
  for (const id of [note.latest.id, work.id]) {
    const receipt = response.records.find(record => record.id === id)!;
    expect(receipt).toBeDefined();
    expect(receipt.passages.some(passage => passage.text.includes(quote))).toBe(true);
    expect(receipt.passages.reduce((sum, passage) => sum + passage.text.length, 0)).toBeLessThanOrEqual(8000);
    expect(receipt.partial).toBe(true);
    for (const passage of receipt.passages) expect(passage.text).toBe(body.slice(passage.start, passage.end));
  }
  expect(response.records.filter(r => r.kind === 'source')).toHaveLength(4);
  expect(response.records.filter(r => r.kind === 'work')).toHaveLength(3);
  expect(response.omittedRecords).toBe(656);
  expect(model.lastRequest!.system).not.toContain('OTHER-MATTER-CANARY');
  expect(model.lastRequest!.system).not.toContain('OUTDATED-CANARY');
  expect(model.lastRequest!.system).not.toContain('UNASSIGNED-CANARY');
  expect(store.matterBrief(request.matterId)).toBeNull();
});
test('malformed results, cancellation and shutdown do not mutate records', async () => {
  const request = input(), model = new FakeModelProvider([{ output: { ...result, approve: true } }, { output: result, delayMs: 30 }, { output: result, delayMs: 30 }]);
  const chat = new WorkspaceChat(store, () => model);
  await expect(chat.draftBrief(request, new AbortController().signal)).rejects.toThrow('usable matter brief');
  const abort = new AbortController();
  const first = chat.draftBrief(request, abort.signal).catch(e => e.message);
  const second = chat.draftPractice({ instruction: 'Draft.', matterId: null, draft: { title: '', body: '', kind: 'method' }, modelChoice: request.modelChoice }, new AbortController().signal).catch(e => e.message);
  expect(() => chat.draftBrief(request, new AbortController().signal)).toThrow('Two drafting helpers');
  abort.abort(); chat.stop();
  expect(await first).toContain('stopped'); expect(await second).toContain('stopped');
  await chat.idle();
  expect(store.matterBrief(request.matterId)).toBeNull();
});
test('brief route is authenticated, strict and bounded', async () => {
  const request = input(), chat = new WorkspaceChat(store, () => new FakeModelProvider([{ output: result }]));
  const handler = workspaceHandler({ store, chat, distDir: '/tmp', token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const call = (body: unknown, token = 'fixture') => handler(new Request('http://127.0.0.1:7432/api/workspace/brief-drafting', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  expect((await call(request, 'wrong')).status).toBe(401);
  expect((await call({ ...request, allMatters: true })).status).toBe(400);
  expect((await call(request)).status).toBe(200);
  expect(BriefDraftInput.safeParse({ ...request, draft: { ...fields, summary: 'x'.repeat(12001) } }).success).toBe(false);
});
