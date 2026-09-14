import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { FilenamePattern, WorkingPreferenceInput, wordFilename, wordOutputFilename, reviewInstructions } from './working-preferences';
import { PracticeDraftInput } from './practice-drafting';
import { workspaceHandler } from './http';
import { workspaceCodexConfig, workspaceCodexPrompt } from './codex';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-preferences-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const draft = { title: 'NDA review approach', body: 'Make surgical edits.', kind: 'method' as const };
const input = { instruction: 'Refine my wording, keeping the meaning.', draft, matterId: null, modelChoice: { kind: 'codex' as const, model: 'synthetic' } };
test('tool-free Codex drafting has no required MCP server and retains the restricted configuration', () => {
  const config = workspaceCodexConfig('', '/synthetic/codex', false).config!;
  expect(config.mcp_servers).toEqual({});
  expect(config.features).toMatchObject({ code_mode_host: false, apps: false, plugins: false, memories: false, browser_use: false });
  expect(workspaceCodexPrompt({ tenant: 'workspace', tools: [], system: 'Write only.', messages: [] })).toContain('No tools or file access');
  expect(workspaceCodexConfig('http://127.0.0.1/mcp', '/synthetic/codex').config?.mcp_servers).toMatchObject({ counsel: { required: true } });
});
test('preferences are explicit, versioned, durable and conflict-checked; they are not practice approvals', () => {
  expect(store.getWorkingPreferences()).toBeNull();
  const prefs = store.saveWorkingPreferences({ expectedRevisionId: null, ndaReview: 'Make surgical edits.' });
  expect(prefs.version).toBe(1);
  expect(store.catalog().knowledge).toHaveLength(0);
  expect(() => store.saveWorkingPreferences({ expectedRevisionId: null })).toThrow('another window');
  expect(() => store.saveWorkingPreferences({ expectedRevisionId: prefs.revisionId, authorMode: 'profile' })).toThrow('profile name');
  store.close(); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  expect(store.getWorkingPreferences()).toEqual(prefs);
});
test('new responses pin working instructions independently of search and later edits', async () => {
  store.saveProfile({ name: 'Synthetic Avery', applyToChats: false, expectedRevisionId: null });
  const writing = '## Writing\n\n' + 'Preserve meaningful distinctions. '.repeat(150) + 'END OF FULL WRITING GUIDANCE';
  const prefs = store.saveWorkingPreferences({ expectedRevisionId: null, writingInstructions: writing, signingInstructions: 'Ask about unknown agreement value.', generalReview: 'Preserve structure.', ndaReview: 'Make surgical NDA edits.', authorMode: 'profile' });
  const model = new FakeModelProvider([{ text: 'Synthetic answer.' }]);
  const chat = new WorkspaceChat(store, () => model), conversation = store.conversations.create({});
  const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Review this confidentiality undertaking.' });
  store.saveWorkingPreferences({ expectedRevisionId: prefs.revisionId, ndaReview: 'Different later preference.' });
  await chat.idle();
  expect(model.lastRequest!.system).toContain('Make surgical NDA edits.');
  expect(model.lastRequest!.system).toContain('END OF FULL WRITING GUIDANCE');
  expect(model.lastRequest!.system).toContain('Ask about unknown agreement value.');
  expect(store.conversations.turn(turn.id).state.workingPreferences?.writingInstructions).toBe(writing);
  expect(model.lastRequest!.system).not.toContain('Different later preference.');
  expect(model.lastRequest!.system).not.toContain('Synthetic Avery'); // Local attribution does not turn profile sharing back on.
  expect(store.conversations.turn(turn.id).state.workingPreferences?.word.author).toBe('Synthetic Avery');
  expect(store.conversations.turn(turn.id).state.workingPreferences?.revisionId).toBe(prefs.revisionId);
});
test('legacy clients preserve new instruction fields while explicit clearing works', async () => {
  const prefs = store.saveWorkingPreferences({ expectedRevisionId: null, writingInstructions: 'Keep this writing.', signingInstructions: 'Keep this rule.' });
  const handler = workspaceHandler({ store, distDir: root, token: 'test-only', origin: 'http://127.0.0.1:7432', demo: true });
  const response = await handler(new Request('http://127.0.0.1:7432/api/workspace/working-preferences', {
    method: 'POST', headers: { authorization: 'Bearer test-only', 'content-type': 'application/json' },
    body: JSON.stringify({ expectedRevisionId: prefs.revisionId, ndaReview: 'Old client update.' }),
  }));
  expect(response.status).toBe(200);
  const updated = store.getWorkingPreferences()!;
  expect(updated.writingInstructions).toBe(prefs.writingInstructions);
  expect(updated.signingInstructions).toBe(prefs.signingInstructions);
  const cleared = store.saveWorkingPreferences({ expectedRevisionId: updated.revisionId, writingInstructions: '' });
  expect(cleared.writingInstructions).toBe('');
  expect(cleared.signingInstructions).toBe(prefs.signingInstructions);
  expect(() => store.saveWorkingPreferences({ expectedRevisionId: prefs.revisionId, writingInstructions: 'Stale' })).toThrow('another window');
});
test('legacy stored preferences and snapshots remain readable; overlong fields fail rather than truncate', () => {
  const value = store.saveWorkingPreferences({ expectedRevisionId: null });
  const { writingInstructions, signingInstructions, ...legacy } = value;
  store.setSetting('working-preferences', legacy);
  expect(store.getWorkingPreferences()).toEqual(value);
  expect(reviewInstructions({ revisionId: value.revisionId, version: 1, generalReview: '', ndaReview: '', word: { author: 'Counsel OS', filenamePattern: '{document}' } })?.writingInstructions).toBe('');
  for (const [key, max] of [['writingInstructions', 16000], ['signingInstructions', 4000]] as const) {
    expect(WorkingPreferenceInput.safeParse({ expectedRevisionId: null, [key]: 'x'.repeat(max) }).success).toBe(true);
    expect(WorkingPreferenceInput.safeParse({ expectedRevisionId: null, [key]: 'x'.repeat(max + 1) }).success).toBe(false);
  }
});
test('filename tokens are bounded and cannot introduce paths, devices or unknown placeholders', () => {
  for (const pattern of ['../{document}', '{client}', '{date', 'name\n.docx']) expect(FilenamePattern.safeParse(pattern).success).toBe(false);
  expect(WorkingPreferenceInput.safeParse({ expectedRevisionId: null, authorMode: 'custom' }).success).toBe(false);
  expect(wordFilename('{document}_{author}_{variant}', { document: '../NDA', author: 'A/B', variant: 'redline', date: '2026-01-01' })).toBe('-NDA_A-B_redline.docx');
  expect(wordFilename('CON', { document: '', author: '', variant: '', date: '' })).toBe('Counsel OS CON.docx');
  expect(Buffer.byteLength(wordFilename('{document}', { document: '通'.repeat(1000), author: '', variant: '', date: '' }))).toBeLessThanOrEqual(185);
});
test('filename labels are explicit, validated, preserved by older clients and optional on historical snapshots', () => {
  const prefs = store.saveWorkingPreferences({expectedRevisionId:null, redlineLabel:'ExampleCo redline', draftLabel:'Draft'});
  const legacyWrite = store.saveWorkingPreferences({expectedRevisionId:prefs.revisionId, ndaReview:'Another NDA preference.'});
  expect(legacyWrite.redlineLabel).toBe('ExampleCo redline');
  expect(legacyWrite.draftLabel).toBe('Draft');
  for (const redlineLabel of ['', '../name', '{author}', 'a\nb', 'x'.repeat(81)]) {
    expect(WorkingPreferenceInput.safeParse({expectedRevisionId:null, redlineLabel}).success).toBe(false);
  }
  const oldWord = {author:'Counsel OS', filenamePattern:'{document} - {variant}'};
  expect(wordOutputFilename(oldWord, {document:'NDA', variant:'redline', date:'2026-01-01'})).toBe('NDA - redline.docx');
  expect(wordOutputFilename(oldWord, {document:'Review', variant:'draft', date:'2026-01-01'})).toBe('Review - draft.docx');
  const {redlineLabel, draftLabel, ...legacyStored} = legacyWrite;
  store.setSetting('working-preferences', legacyStored);
  expect(store.getWorkingPreferences()).toMatchObject({redlineLabel:'redline', draftLabel:'draft'});
});
test('in-place drafting receives only declared context and cannot create records or approve anything', async () => {
  store.saveProfile({ name: 'Not shared', organizationContext: 'Private profile sentinel', applyToChats: false, expectedRevisionId: null });
  store.createSource({ kind: 'reference', revision: { title: 'Unrelated source', body: 'Unrelated source sentinel', provenance: { origin: 'fixture' } } });
  const model = new FakeModelProvider([{ output: { ...draft, question: '' } }]);
  const chat = new WorkspaceChat(store, () => model);
  expect(await chat.draftPractice(input, new AbortController().signal)).toEqual({ ...draft, question: '' });
  expect(model.lastRequest!.tools).toHaveLength(0);
  expect(model.lastRequest!.system).not.toContain('Private profile sentinel');
  expect(model.lastRequest!.system).not.toContain('Unrelated source sentinel');
  expect(store.catalog().knowledge).toHaveLength(0);
  expect(store.listWork()).toHaveLength(0);
  expect(store.conversations.list()).toHaveLength(0);
  expect(store.getWorkingPreferences()).toBeNull();
});
test('drafting accepts structured or JSON results and rejects malformed/oversized output and unauthorized fields', async () => {
  const model = new FakeModelProvider([{ output: JSON.stringify({ ...draft, question: 'Which approach should this express?' }) }, { output: { ...draft, question: '', approved: true } }, { error: 'api_key=secret fixture diagnostic' }]);
  const chat = new WorkspaceChat(store, () => model);
  expect((await chat.draftPractice(input, new AbortController().signal)).question).toContain('Which approach');
  await expect(chat.draftPractice(input, new AbortController().signal)).rejects.toThrow('usable form draft');
  try { await chat.draftPractice(input, new AbortController().signal); } catch (e) { expect(String(e)).not.toContain('secret'); }
  expect(PracticeDraftInput.safeParse({ ...input, draft: { ...draft, body: 'x'.repeat(20_001) } }).success).toBe(false);
});
test('drafting respects scope, cancellation, concurrency and workspace shutdown', async () => {
  const model = new FakeModelProvider([{ output: { ...draft, question: '' }, delayMs: 25 }, { output: { ...draft, question: '' }, delayMs: 25 }]);
  const chat = new WorkspaceChat(store, () => model), abort = new AbortController();
  const first = chat.draftPractice(input, abort.signal).catch(e => e.message);
  const second = chat.draftPractice(input, new AbortController().signal).catch(e => e.message);
  expect(() => chat.draftPractice(input, new AbortController().signal)).toThrow('Two drafting helpers');
  abort.abort(); chat.stop();
  expect(await first).toContain('stopped'); expect(await second).toContain('stopped');
  await chat.idle();
  await expect(chat.draftPractice({ ...input, matterId: crypto.randomUUID() }, new AbortController().signal)).rejects.toThrow();
  expect(store.listWork()).toHaveLength(0);
});
test('preferences and drafting HTTP routes require authentication and reject extra fields', async () => {
  const model = new FakeModelProvider([{ output: { ...draft, question: '' } }]);
  const chat = new WorkspaceChat(store, () => model);
  const handler = workspaceHandler({ store, chat, distDir: root, token: 'test-only', origin: 'http://127.0.0.1:7432', demo: true });
  const call = (path: string, body: unknown, token = 'test-only') => handler(new Request('http://127.0.0.1:7432/api/workspace' + path,
    { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  expect((await call('/practice-drafting', input, 'wrong')).status).toBe(401);
  expect((await call('/working-preferences', { expectedRevisionId: null }, 'wrong')).status).toBe(401);
  expect((await call('/practice-drafting', { ...input, approve: true })).status).toBe(400);
  expect((await call('/working-preferences', { expectedRevisionId: null, ndaReview: 'Surgical edits.' })).status).toBe(200);
  expect((await call('/practice-drafting', input)).status).toBe(200);
});
