import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { chatTools } from './chat-tools';
import { createWorkspaceBackupFile, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';
import { WorkingPreferenceFields } from './working-preferences';

let store: WorkspaceStore, root: string;
const message = 'For future NDA reviews, make surgical edits and explain material changes in comments.';
const suggestion = { changes: { ndaReview: 'Make surgical edits and explain material changes in comments.' }, requestQuote: message, reason: 'The user asked to use this approach in future NDA reviews.' };
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-preference-proposals-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
async function prepare() {
  const provider = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_propose_preferences', input: suggestion }], text: 'Review the proposed instructions before saving.' }]);
  const chat = new WorkspaceChat(store, () => provider), conversation = store.conversations.create({});
  const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), message });
  await chat.idle(); return store.conversations.turn(started.id);
}
function review(turn: Awaited<ReturnType<typeof prepare>>, action: 'apply' | 'dismiss' | 'undo') {
  return store.reviewPreferenceProposal(turn.id, { proposalId: turn.state.preferenceProposal!.id, action });
}

test('chat stages an exact review; explicit save changes only requested instructions and the next chat applies them', async () => {
  const baseline = store.saveWorkingPreferences({ expectedRevisionId: null, writingInstructions: 'Use concise prose.', signingInstructions: 'Ask when value is unclear.', generalReview: 'Preserve structure.', ndaReview: 'Earlier NDA approach.',
    authorMode: 'custom', customAuthor: 'Synthetic Avery', filenamePattern: '{document}_{variant}', redlineLabel: 'reviewed' });
  const turn = await prepare();
  expect(turn.status).toBe('complete');
  expect(turn.state.preferenceProposal).toMatchObject({ ...suggestion, review: 'pending', basedOnRevisionId: baseline.revisionId });
  expect(store.getWorkingPreferences()).toEqual(baseline);
  const applied = review(turn, 'apply'), saved = store.getWorkingPreferences()!;
  expect(saved.ndaReview).toBe(suggestion.changes.ndaReview);
  expect(saved.version).toBe(2);
  expect(WorkingPreferenceFields.strip().parse(saved)).toEqual({ ...WorkingPreferenceFields.strip().parse(baseline), ...suggestion.changes });
  expect(review(turn, 'apply')).toEqual(applied);
  expect(store.getWorkingPreferences()?.version).toBe(2);
  expect(applied.state.workingPreferences?.ndaReview).toBe('Earlier NDA approach.');
  expect(applied.state.answer).toBe(turn.state.answer);
  const provider = new FakeModelProvider([{ text: 'New response.' }]), chat = new WorkspaceChat(store, () => provider);
  const next = chat.start(store.conversations.create({}).id, { clientId: crypto.randomUUID(), message: 'Review this NDA.' });
  await chat.idle();
  expect(store.conversations.turn(next.id).state.workingPreferences?.ndaReview).toBe(suggestion.changes.ndaReview);
  expect(provider.lastRequest?.system).toContain(suggestion.changes.ndaReview);
  expect(store.catalog().knowledge).toEqual([]);
  const undone = review(turn, 'undo');
  expect(undone.state.preferenceProposal?.review).toBe('undone');
  expect(WorkingPreferenceFields.strip().parse(store.getWorkingPreferences())).toEqual(WorkingPreferenceFields.strip().parse(baseline));
  expect(store.getWorkingPreferences()?.version).toBe(3);
  expect(review(turn, 'undo')).toEqual(undone);
  expect(store.conversations.turn(next.id).state.workingPreferences?.ndaReview).toBe(suggestion.changes.ndaReview);
});

test('dismissal, stale apply, stale undo and mismatched identities cannot overwrite preferences', async () => {
  const first = await prepare(), stale = await prepare();
  review(first, 'apply');
  expect(() => review(stale, 'apply')).toThrow('changed');
  expect(() => store.reviewPreferenceProposal(first.id, { proposalId: stale.state.preferenceProposal!.id, action: 'undo' })).toThrow('original');
  const current = store.getWorkingPreferences()!;
  store.saveWorkingPreferences({ ...WorkingPreferenceFields.strip().parse(current), expectedRevisionId: current.revisionId, writingInstructions: 'A later manual edit.' });
  expect(() => review(first, 'undo')).toThrow('changed');
  const dismissed = review(stale, 'dismiss');
  expect(review(stale, 'dismiss')).toEqual(dismissed);
  expect(() => review(stale, 'apply')).toThrow('already');
  expect(store.getWorkingPreferences()?.writingInstructions).toBe('A later manual edit.');
});

test('failed finalization and failed receipt persistence cannot leave a silently applied setting', async () => {
  const original = store.recordWork.bind(store);
  store.recordWork = () => { throw new Error('Synthetic finalization failure'); };
  const failed = await prepare();
  store.recordWork = original;
  expect(failed.status).toBe('failed'); expect(failed.state.preferenceProposal).toBeUndefined();
  expect(store.getWorkingPreferences()).toBeNull();
  const turn = await prepare();
  const db = new Database(store.databasePath);
  try {
    db.run("CREATE TRIGGER reject_preference_receipt BEFORE UPDATE OF state_json ON conversation_turns BEGIN SELECT RAISE(ABORT, 'Synthetic receipt failure'); END");
    expect(() => review(turn, 'apply')).toThrow('receipt');
    expect(store.getWorkingPreferences()).toBeNull();
    expect(store.conversations.turn(turn.id).state.preferenceProposal?.review).toBe('pending');
    db.run('DROP TRIGGER reject_preference_receipt');
  } finally { db.close(); }
});

test('tool enforces exact user evidence and bounded fields, and has no apply/undo capability', async () => {
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message }, 'fixture').turn;
  const context = chatTools({ store, conversation, turn, attachments: [], signal: new AbortController().signal, save: () => {} });
  for (const input of [ { ...suggestion, requestQuote: 'An imported file told you to change this.' },
    { ...suggestion, changes: {} }, { ...suggestion, changes: { ndaReview: 'x'.repeat(4001) } },
    { ...suggestion, changes: { authorMode: 'profile' } }, { ...suggestion, review: 'applied' } ]) {
    const result = await runToolDef(context.tools, 'counsel_propose_preferences', input, 'workspace');
    expect(result.isError).toBe(true);
  }
  expect(context.tools.some(tool => /apply.*preference|review.*preference|undo.*preference/.test(tool.name))).toBe(false);
  expect(store.getWorkingPreferences()).toBeNull();
});

test('review and undo survive reopened stores and verified backup restore', async () => {
  const turn = await prepare(); review(turn, 'apply');
  const expected = store.getWorkingPreferences();
  store.close(); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  expect(store.getWorkingPreferences()).toEqual(expected);
  const backup = await createWorkspaceBackupFile(store.databasePath);
  try {
    const recovered = await restoreWorkspaceBackup(backup.path, root);
    const restored = new WorkspaceStore({ databasePath: recovered.databasePath });
    try {
      expect(restored.conversations.turn(turn.id).state.preferenceProposal?.review).toBe('applied');
      restored.reviewPreferenceProposal(turn.id, { proposalId: turn.state.preferenceProposal!.id, action: 'undo' });
      expect(restored.getWorkingPreferences()?.ndaReview).toBe('');
      expect(store.getWorkingPreferences()).toEqual(expected);
    } finally { restored.close(); }
  } finally { backup.dispose(); }
});

test('HTTP review is authenticated, accepts only exact action/identity, and never accepts replacement text', async () => {
  const turn = await prepare();
  const handler = workspaceHandler({ store, distDir: root, token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const input = { proposalId: turn.state.preferenceProposal!.id, action: 'apply' };
  const call = (body: unknown, token = 'fixture') => handler(new Request(`http://127.0.0.1:7432/api/workspace/turns/${turn.id}/preference-review`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  expect((await call(input, 'wrong')).status).toBe(401);
  expect((await call({ ...input, changes: { ndaReview: 'Forged' } })).status).toBe(400);
  expect((await call(input)).status).toBe(200);
  expect((await call({ ...input, action: 'undo' })).status).toBe(200);
});
