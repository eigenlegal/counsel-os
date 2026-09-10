import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { workspaceHandler } from './http';

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-brief-proposal-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const suggestion = {
  status: 'open' as const,
  summary: 'The interview is complete; timing remains unresolved.',
  questions: 'Which account of the timing is correct?',
  nextActions: 'Compare the interview with the contemporaneous record.',
  reason: 'The user confirmed that the interview is complete.',
  needsReview: true, // Exercise the explicitly review-gated path; automatic notes have separate coverage.
};
const send = () => ({
  clientId: randomUUID(),
  message: 'The interview is complete. Keep the timing issue open and update the matter.',
});
async function prepare(matterId: string | null, delayMs = 0) {
  const conversation = store.conversations.create(matterId ? { scope: 'matter', matterId } : {});
  const provider = new FakeModelProvider([
    {
      toolCalls: [{ name: 'counsel_propose_matter_brief', input: suggestion }],
      text: 'The proposed matter update is ready for review.',
      delayMs,
    },
  ]);
  const chat = new WorkspaceChat(store, () => provider);
  const turn = chat.start(conversation.id, send());
  await chat.idle();
  return { turn: store.conversations.turn(turn.id), provider, chat };
}

test('a completed chat retains a pending brief with its base version and does not change the matter until the user applies it', async () => {
  const matter = store.createMatter({ title: 'Investigation', summary: 'Interview outstanding.' });
  const { turn } = await prepare(matter.id);
  expect(turn.status).toBe('complete');
  expect(turn.state.briefProposal).toMatchObject({
    ...suggestion,
    matterId: matter.id,
    basedOnRevisionId: null,
    review: 'pending',
  });
  expect(store.matterBrief(matter.id)).toBeNull();
  const reviewed = store.reviewBriefProposal(turn.id, {
    proposalId: turn.state.briefProposal!.id,
    action: 'apply',
  });
  const brief = store.matterBrief(matter.id)!;
  expect(brief).toMatchObject({
    number: 1,
    summary: suggestion.summary,
    questions: suggestion.questions,
  });
  expect(reviewed.state.briefProposal).toMatchObject({
    review: 'applied',
    appliedRevisionId: brief.id,
  });
  expect(reviewed.state.matterContext?.summary).toBe('Interview outstanding.');
  expect(
    store.reviewBriefProposal(turn.id, {
      proposalId: turn.state.briefProposal!.id,
      action: 'apply',
    }),
  ).toEqual(reviewed);
  expect(store.matterBrief(matter.id)?.number).toBe(1);
  expect(() =>
    store.reviewBriefProposal(turn.id, {
      proposalId: turn.state.briefProposal!.id,
      action: 'dismiss',
    }),
  ).toThrow('already been reviewed');
  expect(store.listWork()).toHaveLength(1); // no invented legal decision record
});

test('dismissal is durable and idempotent without changing the brief', async () => {
  const matter = store.createMatter({ title: 'Advice matter' });
  const { turn } = await prepare(matter.id);
  const input = { proposalId: turn.state.briefProposal!.id, action: 'dismiss' as const };
  const dismissed = store.reviewBriefProposal(turn.id, input);
  expect(store.reviewBriefProposal(turn.id, input)).toEqual(dismissed);
  expect(store.matterBrief(matter.id)).toBeNull();
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.conversations.turn(turn.id).state.briefProposal?.review).toBe('dismissed');
});

test('a later manual update or another accepted proposal cannot be overwritten by a stale suggestion', async () => {
  const matter = store.createMatter({ title: 'Concurrent matter' });
  const first = await prepare(matter.id),
    second = await prepare(matter.id);
  store.reviewBriefProposal(first.turn.id, {
    proposalId: first.turn.state.briefProposal!.id,
    action: 'apply',
  });
  expect(() =>
    store.reviewBriefProposal(second.turn.id, {
      proposalId: second.turn.state.briefProposal!.id,
      action: 'apply',
    }),
  ).toThrow('changed');
  expect(store.conversations.turn(second.turn.id).state.briefProposal?.review).toBe('pending');
  const prior = store.matterBrief(matter.id)!;
  store.saveMatterBrief(matter.id, {
    expectedRevisionId: prior.id,
    status: 'on-hold',
    summary: 'A user made this later update.',
    questions: '',
    nextActions: '',
  });
  const retry = store.reviewBriefProposal(first.turn.id, {
    proposalId: first.turn.state.briefProposal!.id,
    action: 'apply',
  });
  expect(retry.state.briefProposal?.appliedRevisionId).toBe(prior.id);
  expect(store.matterBrief(matter.id)?.summary).toBe('A user made this later update.');
});

test('unsuccessful finalization leaves no actionable brief proposal or mutation', async () => {
  const matter = store.createMatter({ title: 'Failure case' });
  const conversation = store.conversations.create({ scope: 'matter', matterId: matter.id });
  const originalRecord = store.recordWork.bind(store);
  store.recordWork = () => {
    throw new Error('Synthetic finalize failure');
  };
  const provider = new FakeModelProvider([
    {
      toolCalls: [{ name: 'counsel_propose_matter_brief', input: suggestion }],
      text: 'Suggested update.',
    },
  ]);
  const chat = new WorkspaceChat(store, () => provider);
  const turn = chat.start(conversation.id, send());
  await chat.idle();
  store.recordWork = originalRecord;
  expect(store.conversations.turn(turn.id).status).toBe('failed');
  expect(store.conversations.turn(turn.id).state.briefProposal).toBeUndefined();
  expect(store.matterBrief(matter.id)).toBeNull();
  expect(() =>
    store.reviewBriefProposal(turn.id, { proposalId: randomUUID(), action: 'apply' }),
  ).toThrow('completed response');
});

test('application and review status commit atomically if saving the review fails', async () => {
  const matter = store.createMatter({ title: 'Atomic review' });
  const { turn } = await prepare(matter.id);
  const save = store.conversations.recordBriefReview.bind(store.conversations);
  store.conversations.recordBriefReview = () => {
    throw new Error('Synthetic review write failure');
  };
  try {
    expect(() =>
      store.reviewBriefProposal(turn.id, {
        proposalId: turn.state.briefProposal!.id,
        action: 'apply',
      }),
    ).toThrow('write failure');
    expect(store.matterBrief(matter.id)).toBeNull();
    expect(store.conversations.turn(turn.id).state.briefProposal?.review).toBe('pending');
  } finally {
    store.conversations.recordBriefReview = save;
  }
});

test('cancellation after preparation discards the actionable suggestion and preserves the matter', async () => {
  const matter = store.createMatter({ title: 'Cancelled update' });
  const conversation = store.conversations.create({ scope: 'matter', matterId: matter.id });
  const provider = new FakeModelProvider([
    {
      toolCalls: [{ name: 'counsel_propose_matter_brief', input: suggestion }],
      text: 'Suggested update.',
      delayMs: 60,
    },
  ]);
  const chat = new WorkspaceChat(store, () => provider);
  const turn = chat.start(conversation.id, send());
  await Bun.sleep(15);
  expect(store.conversations.turn(turn.id).state.activity[0]?.status).toBe('complete');
  chat.cancel(conversation.id, turn.id);
  await chat.idle();
  expect(store.conversations.turn(turn.id).status).toBe('cancelled');
  expect(store.conversations.turn(turn.id).state.briefProposal).toBeUndefined();
  expect(store.matterBrief(matter.id)).toBeNull();
});

test('the model cannot propose outside its matter, supply review metadata, or apply the proposal through tools', async () => {
  const { turn, provider } = await prepare(null);
  expect(turn.state.briefProposal).toBeUndefined();
  expect(turn.state.activity[0]?.status).toBe('failed');
  const tools = provider.lastRequest!.tools;
  expect(
    (
      await runToolDef(
        tools,
        'counsel_propose_matter_brief',
        { ...suggestion, matterId: randomUUID() },
        'workspace',
      )
    ).isError,
  ).toBe(true);
  expect(
    (await runToolDef(tools, 'counsel_apply_matter_brief', suggestion, 'workspace')).isError,
  ).toBe(true);
});

test('a truncated starting summary or an unchanged brief cannot produce an actionable replacement', async () => {
  const oversized = store.createMatter({
    title: 'Long initial matter context',
    summary: 'x'.repeat(12_001),
  });
  const long = await prepare(oversized.id);
  expect(long.turn.state.matterContext?.truncated).toBe(true);
  expect(long.turn.state.briefProposal).toBeUndefined();
  expect(long.turn.state.activity[0]?.status).toBe('failed');
  const unchanged = store.createMatter({ title: 'No new facts' });
  store.saveMatterBrief(unchanged.id, {
    expectedRevisionId: null,
    status: suggestion.status,
    summary: suggestion.summary,
    questions: suggestion.questions,
    nextActions: suggestion.nextActions,
  });
  const same = await prepare(unchanged.id);
  expect(same.turn.state.briefProposal).toBeUndefined();
  expect(same.turn.state.activity[0]?.status).toBe('failed');
  expect(store.matterBrief(unchanged.id)?.number).toBe(1);
});

test('brief review HTTP requires authentication and exact proposal identity; callers cannot change proposed fields', async () => {
  const matter = store.createMatter({ title: 'HTTP matter' }),
    { turn } = await prepare(matter.id);
  const origin = 'http://127.0.0.1:7473',
    token = 'brief-review-test';
  const handler = workspaceHandler({ store, token, origin, distDir: root, demo: false });
  const call = (data: unknown, auth = true) =>
    handler(
      new Request(`${origin}/api/workspace/turns/${turn.id}/brief-review`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(auth ? { authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(data),
      }),
    );
  const input = { proposalId: turn.state.briefProposal!.id, action: 'apply' };
  expect((await call(input, false)).status).toBe(401);
  expect((await call({ ...input, summary: 'Injected replacement' })).status).toBe(400);
  expect((await call({ ...input, proposalId: randomUUID() })).status).toBe(409);
  expect((await call(input)).status).toBe(200);
  const get = await handler(
    new Request(`${origin}/api/workspace/matters/${matter.id}/brief`, {
      headers: { authorization: 'Bearer ' + token },
    }),
  );
  expect(await get.json()).toMatchObject({ summary: suggestion.summary });
});
