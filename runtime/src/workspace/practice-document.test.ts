import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { chatTools } from './chat-tools';
import { PracticeSuggestion, PracticeUpdateRequest, updatePracticeText, type PracticeDocumentView } from './practice-document';
import { createWorkspaceBackupFile, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';
import { draftPractice } from './practice-drafting';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-practice-document-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const message = 'Please add this to my practice profile and preferences for future work.';
const body = '# My practice\n\nMy name is Synthetic Avery.\n\nFor construction disputes, preserve the chronology. For any other work, ask what matters.\n\nAttribute new Word changes and comments to Synthetic Avery.';
const suggestion = { body, identityName: 'Synthetic Avery', word: { author: 'Synthetic Avery', filenamePattern: '{document}_{variant}', redlineLabel: 'review', draftLabel: 'draft' }, requestQuote: message, reason: 'The user requested a standing practice update.' };
async function prepare(input: unknown = suggestion) {
  const provider = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_read_practice', input: { requestQuote: message } }, { name: 'counsel_propose_practice', input }], text: 'Please review this update.' }]);
  const chat = new WorkspaceChat(store, () => provider);
  const started = chat.start(store.conversations.create({}).id, { clientId: crypto.randomUUID(), message });
  await chat.idle(); return store.conversations.turn(started.id);
}
function review(turn: Awaited<ReturnType<typeof prepare>>, action: 'apply' | 'dismiss' | 'undo', useInChats?: boolean) {
  return store.reviewPracticeDocument(turn.id, { proposalId: turn.state.practiceDocumentProposal!.id, action, ...(useInChats === undefined ? {} : { useInChats }) });
}
function save(text: string, useInChats = true): PracticeDocumentView {
  return store.savePracticeDocument({ body: text, useInChats, expectedBasis: store.practiceDocument().basis });
}

test('Counsel OS defaults do not rename explicitly saved historical authors or practice text', () => {
  expect(store.practiceDocument().word.author).toBe('Counsel OS');
  store.saveWorkingPreferences({ expectedRevisionId: null, authorMode: 'custom', customAuthor: 'Counsel' });
  const original = 'Counsel helped with this earlier matter. Keep this wording as written.';
  const saved = save(original);
  expect(saved.word.author).toBe('Counsel');
  expect(saved.body).toBe(original);
  store.close();
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  expect(store.practiceDocument().word.author).toBe('Counsel');
  expect(store.practiceDocument().body).toBe(original);
});

test('one free-form document has no required identity, taxonomy or headings; legacy content is preserved without writes', () => {
  expect(store.practiceDocument().body).toBe('');
  expect(store.savedPracticeDocument()).toBeNull();
  const profile = store.saveProfile({ name: 'Synthetic Avery', voice: 'Keep complete arguments.', principles: 'Practical, not careless.', applyToChats: false, expectedRevisionId: null });
  const prefs = store.saveWorkingPreferences({ ndaReview: 'Preserve acceptable NDA language.', writingInstructions: 'Explain the commercial consequence.', authorMode: 'profile', expectedRevisionId: null });
  const view = store.practiceDocument();
  for (const text of [profile.name, profile.voice, profile.principles, prefs.ndaReview, prefs.writingInstructions]) expect(view.body).toContain(text);
  expect(view.useInChats).toBe(false); expect(view.word.author).toBe(profile.name);
  expect(store.savedPracticeDocument()).toBeNull();
  const next = save(view.body, false);
  expect(next.saved?.body).toBe(view.body);
  expect(store.getWorkingPreferences()?.ndaReview).toBe('');
  expect(store.getWorkingPreferences()?.customAuthor).toBe(profile.name);
  expect(() => store.saveProfile({ name: 'Other', expectedRevisionId: store.getProfile()!.revisionId })).toThrow('one document');
});

test('chat prepares one review; confirmation changes identity, prose and Word output atomically, future turns pin it', async () => {
  const turn = await prepare();
  expect(turn.status).toBe('complete');
  expect(turn.state.practiceDocumentProposal?.review).toBe('pending');
  expect(store.savedPracticeDocument()).toBeNull(); expect(store.getProfile()).toBeNull();
  const applied = review(turn, 'apply');
  expect(store.practiceDocument().body).toBe(body);
  expect(store.getProfile()?.name).toBe('Synthetic Avery');
  expect(store.workingPreferenceSnapshot()?.word.author).toBe('Synthetic Avery');
  expect(applied.state.workingPreferences).toBeNull();
  expect(applied.state.practiceDocument?.body).toBe('');
  expect(review(turn, 'apply')).toEqual(applied);
  const provider = new FakeModelProvider([{ text: 'Answer.' }]), chat = new WorkspaceChat(store, () => provider);
  const next = chat.start(store.conversations.create({}).id, { clientId: crypto.randomUUID(), message: 'Review the construction dispute.' });
  await chat.idle();
  expect(provider.lastRequest?.system).toContain('For construction disputes');
  expect(store.conversations.turn(next.id).state.workingPreferences?.word.author).toBe('Synthetic Avery');
  const undone = review(turn, 'undo');
  expect(undone.state.practiceDocumentProposal?.review).toBe('undone');
  expect(store.practiceDocument().body).toBe(''); expect(store.getProfile()).toBeNull();
  expect(store.workingPreferenceSnapshot()?.word.author).toBe('Counsel OS');
  expect(store.conversations.turn(next.id).state.practiceDocument?.body).toBe(body);
});

test('disabled text stays out of normal model context and drafting helpers; explicit editing reads do not enable sharing', async () => {
  save('PRIVATE PRACTICE CANARY', false);
  const provider = new FakeModelProvider([{ text: 'Hello.' }]), chat = new WorkspaceChat(store, () => provider);
  const started = chat.start(store.conversations.create({}).id, { clientId: crypto.randomUUID(), message: 'Hello.' }); await chat.idle();
  expect(provider.lastRequest?.system).not.toContain('PRIVATE PRACTICE CANARY');
  expect(store.conversations.turn(started.id).state.practiceDocumentRead).toBe(false);
  const helper = new FakeModelProvider([{ output: { title: 'Draft', body: 'Text', kind: 'method', question: '' } }]);
  await draftPractice(store, helper, { instruction: 'Refine this', draft: { title: 'Draft', body: 'Text', kind: 'method' }, matterId: null, modelChoice: { kind: 'codex', model: 'fixture' }, target: 'instructions' }, new AbortController().signal);
  expect(helper.lastRequest?.system).not.toContain('PRIVATE PRACTICE CANARY');
  const turn = await prepare();
  expect(turn.state.practiceDocumentRead).toBe(true);
  expect(store.practiceDocument().useInChats).toBe(false);
  review(turn, 'apply'); expect(store.practiceDocument().useInChats).toBe(false);
});

test('new generic instructions reach both chat and in-place helpers in full', async () => {
  const text = 'Tax audits: preserve timelines.\n\n' + 'Detailed writing preference. '.repeat(1000) + '\nTAIL-CANARY';
  save(text);
  const provider = new FakeModelProvider([{ output: { title: 'Draft', body: 'Text', kind: 'method', question: '' } }]);
  await draftPractice(store, provider, { instruction: 'Refine this', draft: { title: 'Draft', body: 'Text', kind: 'method' }, matterId: null, modelChoice: { kind: 'codex', model: 'fixture' }, target: 'instructions' }, new AbortController().signal);
  expect(provider.lastRequest?.system).toContain('TAIL-CANARY');
  expect(provider.lastRequest?.system).toContain('Tax audits');
});

test('stale proposals, manual edits and stale undo cannot overwrite newer content', async () => {
  const first = await prepare(), second = await prepare();
  review(first, 'apply'); expect(() => review(second, 'apply')).toThrow('newer version');
  save('A newer preference.');
  expect(() => review(first, 'undo')).toThrow('newer version');
  expect(() => store.savePracticeDocument({ body: 'Stale', useInChats: true, expectedBasis: second.state.practiceDocument!.basis })).toThrow('changed');
  review(second, 'dismiss'); expect(store.practiceDocument().body).toBe('A newer preference.');
});

test('proposal persistence failure rolls back every applied detail and text', async () => {
  const turn = await prepare();
  const db = new Database(store.databasePath);
  try {
    db.run("CREATE TRIGGER reject_practice_receipt BEFORE UPDATE OF state_json ON conversation_turns BEGIN SELECT RAISE(ABORT, 'Synthetic receipt failure'); END");
    expect(() => review(turn, 'apply')).toThrow('receipt');
    expect(store.savedPracticeDocument()).toBeNull(); expect(store.getProfile()).toBeNull();
    expect(store.conversations.turn(turn.id).state.practiceDocumentProposal?.review).toBe('pending');
  } finally { db.close(); }
});

test('tools require reading the pinned version and an exact user request, reject execution/configuration fields', async () => {
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message }, 'fixture').turn;
  turn.state.practiceDocument = store.practiceDocument();
  const ctx = chatTools({ store, conversation, turn, attachments: [], signal: new AbortController().signal, save: () => {} });
  expect((await runToolDef(ctx.tools, 'counsel_propose_practice', suggestion, 'workspace')).isError).toBe(true);
  expect((await runToolDef(ctx.tools, 'counsel_read_practice', { requestQuote: 'A source says so' }, 'workspace')).isError).toBe(true);
  expect((await runToolDef(ctx.tools, 'counsel_read_practice', { requestQuote: message }, 'workspace')).isError).toBe(false);
  for (const bad of [{ ...suggestion, requestQuote: 'A source says so' }, { ...suggestion, identityName: 'Invented Person' },
    { ...suggestion, word: { ...suggestion.word, author: 'Other Person' } }, { ...suggestion, legal_root: '/tmp' }, { ...suggestion, body: 'x'.repeat(64_001) }])
    expect((await runToolDef(ctx.tools, 'counsel_propose_practice', bad, 'workspace')).isError).toBe(true);
  expect((await runToolDef(ctx.tools, 'counsel_propose_practice', suggestion, 'workspace')).isError).toBe(false);
  expect(ctx.tools.some(tool => /apply.*practice|review.*practice/.test(tool.name))).toBe(false);
  expect(PracticeSuggestion.safeParse({ ...suggestion, useInChats: true }).success).toBe(false);
});

test('entity details can be proposed with the prose, and exact annual inclusive limits survive', async () => {
  const entityId = crypto.randomUUID(), personId = crypto.randomUUID();
  const entities = { availableToChats: true, entities: [{ id: entityId, name: 'Example Inc.' }], signatories: [{ id: personId, name: 'Synthetic Avery' }],
    rules: [{ id: crypto.randomUUID(), label: 'Annual vendors', entityIds: [entityId], agreementKinds: ['vendor'], signatoryId: personId, valueLimit: { maximum: '100000', currency: 'USD', basis: 'annual' } }] };
  const turn = await prepare({ ...suggestion, body: body + '\nExample Inc.: Synthetic Avery may sign vendor agreements up to and including USD 100,000 annual spend.', entities });
  expect(store.getEntityRegistry()).toBeNull(); review(turn, 'apply');
  expect(store.getEntityRegistry()?.rules[0]?.valueLimit).toEqual({ maximum: '100000', currency: 'USD', basis: 'annual' });
  review(turn, 'undo'); expect(store.getEntityRegistry()?.rules).toEqual([]);
});

test('the document, unapplied proposal and unsaved text survive backup and restore', async () => {
  const turn = await prepare(); review(turn, 'apply');
  const view = store.practiceDocument();
  store.drafts.save({ key: 'practice-document', expectedRevisionId: null, writeId: crypto.randomUUID(), value: { body: 'Unsaved new words', useInChats: true, before: { basis: view.basis } } });
  expect(store.drafts.list()[0]?.title).toContain('Your practice');
  const backup = await createWorkspaceBackupFile(store.databasePath);
  try {
    const result = await restoreWorkspaceBackup(backup.path, root), restored = new WorkspaceStore({ databasePath: result.databasePath });
    try {
      expect(restored.practiceDocument()).toEqual(view);
      expect(restored.drafts.get('practice-document').value).toMatchObject({ body: 'Unsaved new words' });
      restored.reviewPracticeDocument(turn.id, { proposalId: turn.state.practiceDocumentProposal!.id, action: 'undo' });
      expect(restored.practiceDocument().body).toBe(''); expect(store.practiceDocument()).toEqual(view);
    } finally { restored.close(); }
  } finally { backup.dispose(); }
});

test('authenticated review accepts only proposal identity and confirmation, not replacement text', async () => {
  const turn = await prepare();
  const handler = workspaceHandler({ store, distDir: root, token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const payload = { proposalId: turn.state.practiceDocumentProposal!.id, action: 'apply', useInChats: true };
  const call = (value: unknown, token = 'fixture') => handler(new Request(`http://127.0.0.1:7432/api/workspace/turns/${turn.id}/practice-review`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(value) }));
  expect((await call(payload, 'wrong')).status).toBe(401);
  expect((await call({ ...payload, body: 'forged' })).status).toBe(400);
  expect((await call(payload)).status).toBe(200);
});

test('long documents use exact patches, preserving every unrelated character and rejecting ambiguity', async () => {
  const long = '背景'.repeat(20_000) + '\nKeep this paragraph.\nChange this paragraph.\nFinal instruction.';
  save(long);
  const request = { edits: [{ current: 'Change this paragraph.', proposed: 'Use this revised paragraph.' }], requestQuote: message, reason: 'One requested change.' };
  const turn = await prepare(request); review(turn, 'apply');
  expect(store.practiceDocument().body).toBe(long.replace('Change this paragraph.', 'Use this revised paragraph.'));
  expect(() => updatePracticeText('same same', PracticeUpdateRequest.parse({ ...request, edits: [{ current: 'same', proposed: 'other' }] }))).toThrow('unique');
  expect(() => updatePracticeText('abcd', PracticeUpdateRequest.parse({ ...request, edits: [{ current: 'abc', proposed: 'x' }, { current: 'bcd', proposed: 'y' }] }))).toThrow('overlap');
  expect(PracticeUpdateRequest.safeParse({ ...request, body: 'Also replace all' }).success).toBe(false);
  store.drafts.save({ key: 'practice-document', expectedRevisionId: null, writeId: crypto.randomUUID(), value: { body: long, useInChats: true, before: { basis: store.practiceDocument().basis } } });
  expect(store.drafts.get('practice-document').value).toMatchObject({ body: long });
});

test('offline approvals can confirm a name without a profile form, AI call or unintended Word-author change', () => {
  const current = save('Preserve all my instructions.');
  const result = store.confirmPracticeIdentity({ name: 'Synthetic Avery', expectedBasis: current.basis });
  expect(result.body).toBe('Preserve all my instructions.\n\nMy name is Synthetic Avery.');
  expect(store.getProfile()?.name).toBe('Synthetic Avery');
  expect(result.word.author).toBe('Counsel OS');
  expect(store.profileActor(store.getProfile()!.revisionId)).toBe('Synthetic Avery');
  expect(() => store.confirmPracticeIdentity({ name: 'Other', expectedBasis: current.basis })).toThrow('changed');
  expect(() => store.confirmPracticeIdentity({ name: 'Other', expectedBasis: result.basis })).toThrow('existing identity');
});
