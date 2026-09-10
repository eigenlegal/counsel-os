import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { WorkspaceStore } from './store';
import { workspaceHandler } from './http';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-knowledge-update-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const pending = () =>
  store.createKnowledge({
    kind: 'position',
    revision: { title: 'Notice position', body: 'Use written notice.' },
  });

test('edits always remain pending; previous approved text stays active until explicit approval and its evidence is immutable', () => {
  const original = pending();
  const first = store.reviewKnowledge(
    original.id,
    original.latest.id,
    'approve',
    'Historical Lawyer',
  );
  const work = store.recordWork({
    title: 'Earlier advice',
    request: 'How to give notice?',
    answer: 'Use written notice.',
    evidence: [
      {
        target: { kind: 'knowledge', revisionId: first.active!.id },
        quote: 'Use written notice.',
        start: 0,
      },
    ],
  });
  const proposal = store.proposeKnowledgeUpdate(first.id, {
    expectedRevisionId: first.latest.id,
    title: first.latest.title,
    body: 'Use written notice and retain delivery evidence.',
  });
  expect(proposal.latest.status).toBe('pending');
  expect(proposal.latest.approvedBy).toBeNull();
  expect(proposal.active).toEqual(first.active);
  expect(store.referenceChanges(work.id)).toEqual([]);
  expect(store.search({ query: 'delivery', kinds: ['knowledge'] }).hits).toHaveLength(0);
  expect(store.search({ query: 'written', kinds: ['knowledge'] }).hits[0]?.revisionId).toBe(
    first.active!.id,
  );
  const approved = store.reviewKnowledge(
    proposal.id,
    proposal.latest.id,
    'approve',
    'Current Lawyer',
  );
  expect(approved.active?.body).toContain('delivery evidence');
  expect(store.referenceChanges(work.id)).toMatchObject([
    { kind: 'knowledge', recordId: first.id, citedVersion: 2, currentVersion: 4 },
  ]);
  expect(store.getKnowledgeRevision(first.active!.id).approvedBy).toBe('Historical Lawyer');
  expect(store.getWork(work.id)).toEqual(work);
  expect(store.knowledgeHistory(original.id)).toMatchObject({ totalVersions: 4 });
  expect(store.knowledgeHistory(original.id).versions.some((version) => 'body' in version)).toBe(
    false,
  );
});

test('exact edits/retries reuse a pending revision; stale updates, foreign versions, blank text and maintained ownership are rejected', () => {
  const original = pending(),
    other = pending();
  const input = {
    expectedRevisionId: original.latest.id,
    title: 'Edited position',
    body: 'Keep evidence of written notice.',
  };
  const changed = store.proposeKnowledgeUpdate(original.id, input);
  expect(store.proposeKnowledgeUpdate(original.id, input)).toEqual(changed);
  expect(
    store.proposeKnowledgeUpdate(original.id, { ...input, expectedRevisionId: changed.latest.id }),
  ).toEqual(changed);
  expect(() =>
    store.proposeKnowledgeUpdate(original.id, { ...input, body: 'Stale edit.' }),
  ).toThrow('changed');
  expect(() =>
    store.proposeKnowledgeUpdate(original.id, { ...input, expectedRevisionId: other.latest.id }),
  ).toThrow('different knowledge');
  expect(() => store.proposeKnowledgeUpdate(original.id, { ...input, body: '  ' })).toThrow();
  const maintained = store.createKnowledge({
    ownership: 'maintained',
    kind: 'method',
    revision: { title: 'Managed method', body: 'Managed text.' },
  });
  expect(() =>
    store.proposeKnowledgeUpdate(maintained.id, {
      ...input,
      expectedRevisionId: maintained.latest.id,
    }),
  ).toThrow('Maintained knowledge');
  expect(store.knowledgeHistory(maintained.id).totalVersions).toBe(1);
});

test('rejecting edited knowledge retains its prior active version, while old pending approvals cannot approve changed text', () => {
  const original = pending();
  const approved = store.reviewKnowledge(
    original.id,
    original.latest.id,
    'approve',
    'Synthetic Lawyer',
  );
  const first = store.proposeKnowledgeUpdate(original.id, {
    expectedRevisionId: approved.latest.id,
    title: 'First update',
    body: 'Proposed exception.',
  });
  const second = store.proposeKnowledgeUpdate(original.id, {
    expectedRevisionId: first.latest.id,
    title: 'Edited update',
    body: 'Different exception.',
  });
  expect(() =>
    store.reviewKnowledge(original.id, first.latest.id, 'approve', 'Synthetic Lawyer'),
  ).toThrow('changed');
  const rejected = store.reviewKnowledge(
    original.id,
    second.latest.id,
    'reject',
    'Synthetic Lawyer',
  );
  expect(rejected.active).toEqual(approved.active);
  expect(store.getKnowledgeRevision(first.latest.id).body).toBe('Proposed exception.');
});

test('an in-progress response retains approved passages it already read after an approval changes, but cannot read pending replacements', async () => {
  const original = pending(),
    approved = store.reviewKnowledge(
      original.id,
      original.latest.id,
      'approve',
      'Synthetic Lawyer',
    );
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(
    conversation.id,
    { clientId: randomUUID(), message: 'Apply the notice position.' },
    'fixture',
  ).turn;
  const { tools } = chatTools({
    store,
    conversation,
    turn,
    attachments: [],
    signal: new AbortController().signal,
    save: () => {},
  });
  expect(
    (
      await runToolDef(
        tools,
        'counsel_read_record',
        { kind: 'knowledge', id: approved.active!.id },
        'workspace',
      )
    ).isError,
  ).toBeFalsy();
  const update = store.proposeKnowledgeUpdate(original.id, {
    expectedRevisionId: approved.latest.id,
    title: 'Updated',
    body: 'Use written notice and retain evidence.',
  });
  expect(
    (
      await runToolDef(
        tools,
        'counsel_read_record',
        { kind: 'knowledge', id: update.latest.id },
        'workspace',
      )
    ).isError,
  ).toBe(true);
  store.reviewKnowledge(update.id, update.latest.id, 'approve', 'Synthetic Lawyer');
  const read = await runToolDef(
    tools,
    'counsel_read_record',
    { kind: 'knowledge', id: approved.active!.id },
    'workspace',
  );
  expect(read.output).toMatchObject({ text: 'Use written notice.', newerVersionAvailable: true });
  expect(
    (
      await runToolDef(
        tools,
        'counsel_cite_passage',
        { kind: 'knowledge', id: approved.active!.id, quote: 'Use written notice.', start: 0 },
        'workspace',
      )
    ).isError,
  ).toBeFalsy();
});

test('HTTP updates cannot bypass approval, change scope/ownership or supply an actor; review still pins the saved profile', async () => {
  const item = pending(),
    origin = 'http://127.0.0.1:7471',
    token = 'knowledge-update-test';
  const handler = workspaceHandler({ store, token, origin, distDir: root, demo: false });
  const call = (operation: string, data?: unknown, auth = true) =>
    handler(
      new Request(`${origin}/api/workspace/knowledge/${item.id}/${operation}`, {
        method: data ? 'POST' : 'GET',
        headers: {
          'content-type': 'application/json',
          ...(auth ? { authorization: 'Bearer ' + token } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      }),
    );
  const input = {
    expectedRevisionId: item.latest.id,
    title: 'Updated',
    body: 'Retain written notice evidence.',
  };
  expect((await call('revisions', input, false)).status).toBe(401);
  for (const extra of [
    { status: 'approved' },
    { approvedBy: 'Impersonated' },
    { ownership: 'maintained' },
    { matterId: randomUUID() },
  ])
    expect((await call('revisions', { ...input, ...extra })).status).toBe(400);
  expect((await call('revisions', input)).status).toBe(200);
  expect(await (await call('history')).json()).toMatchObject({ totalVersions: 2 });
  expect(store.getKnowledge(item.id).active).toBeNull();
});
