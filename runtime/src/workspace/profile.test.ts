import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { workspaceHandler } from './http';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { ProfileInput, type WorkspaceProfile } from './profile';

let root: string, store: WorkspaceStore;
const chats: WorkspaceChat[] = [];
const origin = 'http://127.0.0.1:7465',
  token = 'synthetic-profile-test';
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-profile-test-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(async () => {
  for (const chat of chats.splice(0)) {
    chat.stop();
    await chat.idle();
  }
  store.close();
  rmSync(root, { force: true, recursive: true });
});
function http() {
  const handler = workspaceHandler({ store, origin, token, distDir: root, demo: false });
  const call = (path: string, data?: unknown, authenticated = true) =>
    handler(
      new Request(`${origin}/api/workspace${path}`, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {
          'content-type': 'application/json',
          ...(authenticated ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      }),
    );
  return { handler, call };
}
function update(profile: WorkspaceProfile, changes: object) {
  const { id: _id, revisionId, version: _version, updatedAt: _updated, ...fields } = profile;
  return store.saveProfile({ ...fields, ...changes, expectedRevisionId: revisionId });
}
const proposal = () =>
  store.createKnowledge({
    kind: 'method',
    revision: { title: 'Review proposal', body: 'Confirm the evidence first.' },
  });
const send = () => ({ clientId: crypto.randomUUID(), message: 'Draft a brief update.' });

describe('single-user profile', () => {
  test('fresh workspaces have no invented identity; a name-only profile persists and is not indexed as authority', () => {
    expect(store.getProfile()).toBeNull();
    const profile = store.saveProfile({ name: '  Synthetic Counsel OS  ', expectedRevisionId: null });
    expect(profile).toMatchObject({
      name: 'Synthetic Counsel OS',
      version: 1,
      applyToChats: true,
      principles: '',
    });
    expect(store.search({ query: 'Synthetic Counsel OS' }).hits).toHaveLength(0);
    const path = store.databasePath;
    store.close();
    store = new WorkspaceStore({ databasePath: path });
    expect(store.getProfile()).toEqual(profile);
    expect(store.listWork()).toHaveLength(0);
  });
  test('profile updates keep identity, change revision, reject stale writes, and never rewrite historical names', () => {
    const first = store.saveProfile({
      name: 'Original Name',
      voice: 'Plain language.',
      expectedRevisionId: null,
    });
    const item = proposal();
    const approved = store.reviewKnowledge(
      item.id,
      item.latest.id,
      'approve',
      store.profileActor(first.revisionId),
    );
    const second = update(first, { name: 'Changed Name', voice: '' });
    expect(second.id).toBe(first.id);
    expect(second.revisionId).not.toBe(first.revisionId);
    expect(second.version).toBe(2);
    expect(second.voice).toBe('');
    expect(() => update(first, { name: 'Stale Name' })).toThrow('another window');
    expect(() =>
      store.saveProfile({ name: 'Duplicate first setup', expectedRevisionId: null }),
    ).toThrow();
    expect(store.getProfile()).toEqual(second);
    expect(store.getKnowledge(approved.id).latest.approvedBy).toBe('Original Name');
    expect(store.listWork()[0]!.decisionBy).toBe('Original Name');
  });
  test('required identity, field bounds, booleans, and strict input prevent unbounded or extra profile data', () => {
    for (const input of [
      { name: '   ', expectedRevisionId: null },
      { name: 'A' },
      { name: 'A', expectedRevisionId: 'invalid' },
      { name: 'A', expectedRevisionId: null, apiKey: 'not-accepted' },
      { name: 'A', expectedRevisionId: null, principles: 'a'.repeat(3001) },
      { name: 'A', expectedRevisionId: null, applyToChats: 'true' },
    ])
      expect(ProfileInput.safeParse(input).success).toBe(false);
  });
  test('profile endpoints are authenticated, strict, durable, and independent of model setup', async () => {
    const { call } = http();
    expect((await call('/profile', undefined, false)).status).toBe(401);
    expect((await call('/profile', { name: 'A', expectedRevisionId: null }, false)).status).toBe(
      401,
    );
    expect(await (await call('/profile')).json()).toBeNull();
    expect(
      (await call('/profile', { name: 'A', expectedRevisionId: null, userId: 'fake' })).status,
    ).toBe(400);
    const saved = await call('/profile', { name: 'HTTP User', expectedRevisionId: null });
    expect(saved.status).toBe(200);
    const profile = await saved.json();
    expect(await (await call('/profile')).json()).toEqual(profile);
    expect(await (await call('')).json()).toMatchObject({ profile });
    expect((await call('/profile', { name: 'Stale', expectedRevisionId: null })).status).toBe(409);
    expect(store.setting('model-connection')).toBeNull();
    expect(store.listWork()).toHaveLength(0);
  });
  test('approvals use the saved identity only, block a missing or changed profile, and still require the human action', async () => {
    const { call } = http();
    const item = proposal();
    const input = {
      expectedRevisionId: item.latest.id,
      action: 'approve',
      expectedProfileRevisionId: crypto.randomUUID(),
    };
    expect((await call(`/knowledge/${item.id}/review`, input)).status).toBe(409);
    const first = store.saveProfile({ name: 'Only Local User', expectedRevisionId: null });
    expect(store.getKnowledge(item.id).latest.status).toBe('pending');
    expect(
      (
        await call(`/knowledge/${item.id}/review`, {
          ...input,
          expectedProfileRevisionId: first.revisionId,
          actor: 'Forged reviewer',
        })
      ).status,
    ).toBe(400);
    const second = update(first, { name: 'Renamed Local User' });
    expect(
      (
        await call(`/knowledge/${item.id}/review`, {
          ...input,
          expectedProfileRevisionId: first.revisionId,
        })
      ).status,
    ).toBe(409);
    expect(store.listWork()).toHaveLength(0);
    const approved = await call(`/knowledge/${item.id}/review`, {
      ...input,
      expectedProfileRevisionId: second.revisionId,
    });
    expect(approved.status).toBe(200);
    expect(await approved.json()).toMatchObject({ latest: { approvedBy: second.name } });
    expect(store.listWork()[0]!.decisionBy).toBe(second.name);
  });
  test('human decisions cannot impersonate an actor or bypass profile pinning; draft work needs no profile', async () => {
    const { call } = http();
    const work = {
      title: 'Decision',
      request: 'Record my choice.',
      answer: 'Wait for the interview.',
    };
    expect((await call('/work', { ...work, decisionBy: 'Forged' })).status).toBe(400);
    expect((await call('/work', { ...work, disposition: 'decision' })).status).toBe(400);
    expect((await call('/work', work)).status).toBe(201);
    const profile = store.saveProfile({
      name: 'Local Human',
      applyToChats: false,
      expectedRevisionId: null,
    });
    const response = await call('/work', {
      ...work,
      disposition: 'decision',
      expectedProfileRevisionId: profile.revisionId,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      disposition: 'decision',
      decisionBy: 'Local Human',
    });
    expect(
      (await call('/work', { ...work, expectedProfileRevisionId: profile.revisionId })).status,
    ).toBe(400);
  });
  test('concurrent chats pin the profile at send, even when it changes before their provider starts', async () => {
    const first = store.saveProfile({
      name: 'First Name',
      voice: 'Short executive summaries.',
      expectedRevisionId: null,
    });
    const providers = [
      new FakeModelProvider([{ text: 'A', delayMs: 20 }]),
      new FakeModelProvider([{ text: 'B', delayMs: 20 }]),
    ];
    let index = 0;
    const chat = new WorkspaceChat(store, () => providers[index++]!);
    chats.push(chat);
    const a = chat.start(store.conversations.create({}).id, send());
    const second = update(first, { name: 'Second Name', jurisdictions: 'Synthetic jurisdiction' });
    const b = chat.start(store.conversations.create({}).id, send());
    await chat.idle();
    expect(providers[0]!.lastRequest!.system).toContain('First Name');
    expect(providers[0]!.lastRequest!.system).not.toContain('Second Name');
    expect(providers[1]!.lastRequest!.system).toContain('Second Name');
    expect(store.conversations.turn(a.id).state.profileContext).toEqual(first);
    expect(store.conversations.turn(b.id).state.profileContext).toEqual(second);
    const path = store.databasePath;
    store.close();
    store = new WorkspaceStore({ databasePath: path });
    expect(store.conversations.turn(a.id).state.profileContext).toEqual(first);
  });
  test('sharing off omits every profile field from new model context but preserves earlier snapshots', async () => {
    const first = store.saveProfile({
      name: 'Private Name',
      principles: 'Private preferences',
      expectedRevisionId: null,
    });
    const provider = new FakeModelProvider([{ text: 'First' }, { text: 'Second' }]);
    const chat = new WorkspaceChat(store, () => provider);
    chats.push(chat);
    const a = chat.start(store.conversations.create({}).id, send());
    await chat.idle();
    update(first, { applyToChats: false });
    const b = chat.start(store.conversations.create({}).id, send());
    await chat.idle();
    expect(provider.lastRequest!.system).not.toContain('Private Name');
    expect(provider.lastRequest!.system).not.toContain('Private preferences');
    expect(store.conversations.turn(b.id).state).toMatchObject({
      profileContext: null,
      profileStatus: 'disabled',
    });
    expect(store.conversations.turn(a.id).state.profileContext).toEqual(first);
    const names = provider.lastRequest!.tools.map((tool) => tool.name);
    expect(names).toHaveLength(18);
    expect(names).toContain('counsel_read_practice');
    expect(names).toContain('counsel_propose_practice');
    expect(names).toContain('counsel_fetch_webpage');
    expect(names).toContain('counsel_lookup_statute');
    expect(names).toContain('counsel_read_entity');
    expect(names).toContain('counsel_check_signatory');
    expect(names).not.toContain('counsel_update_profile');
    expect(
      (
        await runToolDef(
          provider.lastRequest!.tools,
          'counsel_update_profile',
          { name: 'Forged' },
          'workspace',
        )
      ).isError,
    ).toBe(true);
    expect(store.getProfile()!.name).toBe('Private Name');
  });
  test('chat still works without a profile and reports that no profile was included', async () => {
    const provider = new FakeModelProvider([{ text: 'No profile needed to ask a question.' }]);
    const chat = new WorkspaceChat(store, () => provider);
    chats.push(chat);
    const turn = chat.start(store.conversations.create({}).id, send());
    await chat.idle();
    expect(store.conversations.turn(turn.id)).toMatchObject({
      status: 'complete',
      state: { profileContext: null, profileStatus: 'not-set' },
    });
  });
});
