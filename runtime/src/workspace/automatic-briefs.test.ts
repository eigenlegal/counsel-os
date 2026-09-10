import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { workspaceHandler } from './http';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { briefReviewRequested } from './brief-proposals';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-auto-brief-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const suggestion = { status: 'open' as const, summary: 'User reports the interview is complete. Timing is unresolved.',
  questions: 'Which timing account is correct?', nextActions: 'Compare the contemporaneous record.', reason: 'The user supplied an interview update.' };
function begin(matterId: string, extra = {}, delayMs = 0, message = 'The interview is complete, but we still need to resolve timing.') {
  const conversation = store.conversations.create({ scope: 'matter', matterId });
  const provider = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_propose_matter_brief', input: { ...suggestion, ...extra } }], text: 'The timing question remains open.', delayMs }]);
  const chat = new WorkspaceChat(store, () => provider);
  const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message });
  return { chat, turn, conversation };
}
test('routine notes save on successful completion without approval; undo is versioned and survives reopen', async () => {
  const matter = store.createMatter({ title: 'Interview', summary: 'Interview pending.' });
  const { chat, turn } = begin(matter.id);
  await chat.idle();
  const saved = store.conversations.turn(turn.id);
  const brief = store.matterBrief(matter.id)!;
  expect(saved.state.briefProposal).toMatchObject({ mode: 'automatic', review: 'applied', appliedRevisionId: brief.id });
  expect(brief.summary).toBe(suggestion.summary);
  expect(saved.state.matterContext!.summary).toBe('Interview pending.');
  expect(store.listWork()).toHaveLength(1);
  expect(store.listWork()[0]!.disposition).toBe('draft');
  const undone = store.undoBriefUpdate(turn.id, saved.state.briefProposal!.id);
  expect(store.matterBrief(matter.id)).toMatchObject({ number: 2, summary: 'Interview pending.' });
  expect(undone.state.answer).toBe(saved.state.answer);
  expect(store.undoBriefUpdate(turn.id, saved.state.briefProposal!.id)).toEqual(undone);
  const db = store.databasePath; store.close(); store = new WorkspaceStore({ databasePath: db });
  expect(store.conversations.turn(turn.id).state.briefProposal!.undoRevisionId).toBe(store.matterBrief(matter.id)!.id);
});
test('explicit review/no-save instructions override a model claiming routine notes, including at final commit', async () => {
  for (const message of [
    'Prepare a matter-brief suggestion for review.',
    'Suggest updates to the working notes for my approval.',
    'I want to review the matter brief before saving.',
    'Do not update the matter brief. Just suggest changes.',
    'Update the brief, but don’t save it yet.',
    'Suggest a next action. Let me review it first.',
  ]) {
    const matter = store.createMatter({ title: 'Review-only', summary: 'Unchanged.' });
    const { chat, turn } = begin(matter.id, { needsReview: false }, 0, message);
    await chat.idle();
    const saved = store.conversations.turn(turn.id), proposal = saved.state.briefProposal!;
    expect(saved.status).toBe('complete');
    expect(proposal).toMatchObject({ review: 'pending', mode: 'review', needsReview: true, deferredReason: 'requested-review' });
    expect(saved.state.activity.find(item => item.name === 'counsel_propose_matter_brief')!.output).toMatchObject({ status: 'prepared_for_review' });
    expect(store.matterBrief(matter.id)).toBeNull();
    expect(store.prepareCompletedBrief(saved, { ...proposal, needsReview: false })).toMatchObject({ mode: 'review', deferredReason: 'requested-review', needsReview: true });
    expect(store.getMatter(matter.id).summary).toBe('Unchanged.');
    const applied = store.reviewBriefProposal(turn.id, { proposalId: proposal.id, action: 'apply' });
    expect(applied.state.briefProposal!.review).toBe('applied');
  }
});
test('ordinary contract review and routine updates do not become review-only brief instructions', () => {
  for (const message of ['Review this NDA.', 'Update the matter after the interview.', 'Prepare an agreement for review.', 'Review the contract before signing.'])
    expect(briefReviewRequested(message)).toBe(false);
});
test('parallel updates retain both responses without overwriting a newer brief', async () => {
  const matter = store.createMatter({ title: 'Parallel matter' });
  const first = begin(matter.id, {}, 50), second = begin(matter.id, { summary: 'A different update.' }, 100);
  await Promise.all([first.chat.idle(), second.chat.idle()]);
  expect(store.matterBrief(matter.id)!.summary).toBe(suggestion.summary);
  expect(store.conversations.turn(first.turn.id).status).toBe('complete');
  expect(store.conversations.turn(second.turn.id).state.briefProposal).toMatchObject({ review: 'pending', mode: 'review', deferredReason: 'concurrent-change' });
  expect(store.listWork()).toHaveLength(2);
});
test('status changes and expressly uncertain updates remain reviewable; undo cannot overwrite a later edit', async () => {
  const matter = store.createMatter({ title: 'Guarded status' });
  const closing = begin(matter.id, { status: 'closed' }); await closing.chat.idle();
  expect(store.matterBrief(matter.id)).toBeNull();
  expect(store.conversations.turn(closing.turn.id).state.briefProposal).toMatchObject({ review: 'pending', deferredReason: 'status-change' });
  const uncertain = begin(matter.id, { needsReview: true }); await uncertain.chat.idle();
  expect(store.conversations.turn(uncertain.turn.id).state.briefProposal!.deferredReason).toBe('requested-review');
  const automatic = begin(matter.id); await automatic.chat.idle();
  const current = store.matterBrief(matter.id)!;
  store.saveMatterBrief(matter.id, { expectedRevisionId: current.id, status: 'open', summary: 'A later correction.', questions: '', nextActions: '' });
  expect(() => store.undoBriefUpdate(automatic.turn.id, store.conversations.turn(automatic.turn.id).state.briefProposal!.id)).toThrow('changed');
  expect(store.matterBrief(matter.id)!.summary).toBe('A later correction.');
});
test('a completion write failure rolls the automatic update and saved work back together', async () => {
  const matter = store.createMatter({ title: 'Atomic completion' });
  const save = store.conversations.save.bind(store.conversations);
  store.conversations.save = turn => { if (turn.status === 'complete') throw new Error('Synthetic failure after brief write'); return save(turn); };
  const { chat, turn } = begin(matter.id); await chat.idle();
  expect(store.conversations.turn(turn.id).status).toBe('failed');
  expect(store.matterBrief(matter.id)).toBeNull();
  expect(store.listWork()).toHaveLength(0);
});
test('undo authenticates and accepts only the saved update identity; backup retains automatic receipts', async () => {
  const matter = store.createMatter({ title: 'Recovery' });
  const { chat, turn } = begin(matter.id); await chat.idle();
  const proposalId = store.conversations.turn(turn.id).state.briefProposal!.id;
  const origin = 'http://127.0.0.1:7473', token = 'auto-test-only';
  const handler = workspaceHandler({ store, token, origin, distDir: root, demo: false });
  const call = (body: unknown, auth = true) => handler(new Request(`${origin}/api/workspace/turns/${turn.id}/brief-undo`, { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
  expect((await call({ proposalId }, false)).status).toBe(401);
  expect((await call({ proposalId, summary: 'Injected text' })).status).toBe(400);
  expect((await call({ proposalId: crypto.randomUUID() })).status).toBe(409);
  expect((await call({ proposalId })).status).toBe(200);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root);
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.conversations.turn(turn.id).state.briefProposal).toEqual(store.conversations.turn(turn.id).state.briefProposal); }
  finally { copy.close(); }
});
