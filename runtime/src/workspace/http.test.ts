import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { workspaceHandler } from './http';
import { WorkspaceStore } from './store';
import practice from './fixtures/practice.json';
import type { WorkspaceCatalog } from './catalog';
import type { Knowledge, Matter, SearchResult, Source, Work } from './types';
import type { ModelProvider } from '../core/types';
import { FakeModelProvider } from '../core/fake-provider';
import { memoryStore } from '../providers/secrets';
import { WorkspaceChat } from './chat';
import { WorkspaceConnection, type ConnectionStatus } from './connection';
import type { Conversation, Turn } from './conversations';

const roots: string[] = [];
const stores: WorkspaceStore[] = [];
const chats: WorkspaceChat[] = [];
const origin = 'http://127.0.0.1:7432';
const token = 'synthetic-test-token';
async function json<T>(response: Response | Promise<Response>): Promise<T> {
  return (await response).json() as Promise<T>;
}
afterEach(async () => {
  for (const chat of chats.splice(0)) {
    chat.stop();
    await chat.idle();
  }
  stores.splice(0).forEach((s) => s.close());
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});
function fixture(provider?: ModelProvider, syntheticClaude = false) {
  const root = mkdtempSync(join(tmpdir(), 'counsel-workspace-http-'));
  roots.push(root);
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  stores.push(store);
  // Test-only public static fixtures, never user workspace content.
  writeFileSync(join(root, 'workspace.html'), '<h1>Workspace</h1>');
  writeFileSync(join(root, 'index.html'), '<h1>Legacy</h1>');
  const chat = provider ? new WorkspaceChat(store, () => provider) : undefined;
  if (chat) chats.push(chat);
  const connection = new WorkspaceConnection(
    store,
    memoryStore(),
    syntheticClaude
      ? {
          claudeRuntime: {
            command: [process.execPath, resolve(import.meta.dir, 'fixtures/claude-cli.ts')],
            env: { HOME: root, USER: 'fixture-user', PATH: process.env.PATH },
          },
        }
      : {},
  );
  const handler = workspaceHandler({
    store,
    token,
    origin,
    distDir: root,
    demo: true,
    chat,
    connection,
  });
  const call = (path = '', input?: unknown) =>
    handler(
      new Request(`${origin}/api/workspace${path}`, {
        method: input === undefined ? 'GET' : 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', origin },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      }),
    );
  return { store, handler, call, chat };
}

describe('workspace HTTP boundary', () => {
  test('desktop updates and connection tests require authentication and explicit model consent', async () => {
    const { call, handler, store } = fixture(undefined, true);
    for (const path of ['/updates/check', '/updates/download', '/connection/test', '/connection/check-sign-in']) {
      expect((await handler(new Request(`${origin}/api/workspace${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }))).status).toBe(401);
    }
    expect(await json(call('/updates'))).toMatchObject({ enabled: false });
    expect((await call('/updates/check', {})).status).toBe(409);
    expect((await call('/updates/check', { url: 'https://example.invalid' })).status).toBe(400);
    expect((await call('/updates/download', { id: 'unverified', consent: true })).status).toBe(409);
    expect((await call('/updates/download', { id: 'unverified' })).status).toBe(400);
    expect((await call('/connection/test', { choice: { kind: 'claude-code', model: 'sonnet' } })).status).toBe(400);
    expect((await call('/connection/test', { choice: { kind: 'claude-code', model: 'sonnet' }, consent: false })).status).toBe(400);
    expect((await call('/connection/check-sign-in', { kind: 'claude-code', command: 'arbitrary' })).status).toBe(400);
    const result = await call('/connection/check-sign-in', { kind: 'claude-code' });
    expect(result.status).toBe(200); expect(await result.text()).not.toMatch(/private@example|private-org|NEVER-EXPOSE/);
    expect(store.conversations.list()).toHaveLength(0); expect(store.listWork()).toHaveLength(0);
    expect(store.setting('highest-desktop-update')).toBeNull();
  });
  test('recovery drafts require authentication and never change profile or sent work', async () => {
    const { store, call, handler } = fixture();
    expect((await handler(new Request(`${origin}/api/workspace/drafts`))).status).toBe(401);
    const key = `chat:new::${crypto.randomUUID()}`;
    const saved = await call('/drafts', {key,expectedRevisionId:null,writeId:crypto.randomUUID(),value:{message:'Synthetic unsent note',scope:'conversation',attachments:[],clientId:crypto.randomUUID()}});
    expect(saved.status).toBe(200); expect(await json(call('/drafts'))).toHaveLength(1);
    expect(store.conversations.list()).toHaveLength(0); expect(store.getWorkingPreferences()).toBeNull();
    expect((await call('/drafts', {key:'connection',value:{token:'synthetic-only'}})).status).toBe(400);
  });
  test('navigation is authenticated and validates commands without exposing a generic settings writer', async () => {
    const { store, call, handler } = fixture();
    const matter = store.createMatter({ title: 'Visited matter' });
    expect((await handler(new Request(`${origin}/api/workspace/navigation`))).status).toBe(401);
    expect((await call('/navigation', { action: 'visit', kind: 'matter', id: matter.id, at: '2099-01-01T00:00:00Z' })).status).toBe(400);
    expect((await call('/navigation', { action: 'visit', kind: 'matter', id: matter.id })).status).toBe(200);
    expect((await call('/navigation', { action: 'pin', kind: 'matter', id: matter.id, pinned: true })).status).toBe(200);
    expect((await json<{ pinned: { id: string }[] }>(call('/navigation'))).pinned[0]?.id).toBe(matter.id);
    expect((await call('/navigation/unexpected', {})).status).toBe(404);
  });
  test('conversation management validates lifecycle, version, and authentication and blocks sends from Trash', async () => {
    const { store, call, handler } = fixture(new FakeModelProvider([{ text: 'Unused synthetic response' }]));
    const conversation = store.conversations.create({ title: 'Synthetic chat' });
    const path = `/conversations/${conversation.id}`;
    expect((await handler(new Request(`${origin}/api/workspace${path}/impact`))).status).toBe(401);
    const impact = await json<{ version: string }>(call(path + '/impact'));
    expect((await call(path + '/manage', { action: 'trash', expectedVersion: impact.version, unexpected: true })).status).toBe(400);
    expect((await call(path + '/manage', { action: 'trash', expectedVersion: impact.version })).status).toBe(200);
    expect(await json<Conversation[]>(call('/conversations'))).toEqual([]);
    expect((await json<Conversation[]>(call('/conversations?state=trashed')))[0]?.id).toBe(conversation.id);
    expect((await call('/conversations?state=invalid')).status).toBe(400);
    expect((await call(path + '/send', { clientId: crypto.randomUUID(), message: 'Do not send' })).status).toBe(409);
    expect((await call(path + '/manage', { action: 'restore', expectedVersion: impact.version })).status).toBe(409);
    const current = await json<{ version: string }>(call(path + '/impact'));
    expect((await call(path + '/manage', { action: 'restore', expectedVersion: current.version })).status).toBe(200);
  });
  test('local Claude sign-in checks require authentication, reject extra input, and return no account details', async () => {
    const { handler, call, store } = fixture(undefined, true);
    expect(
      (
        await handler(
          new Request(`${origin}/api/workspace/connection/check-claude`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          }),
        )
      ).status,
    ).toBe(401);
    expect((await call('/connection/check-claude', { command: '/anything' })).status).toBe(400);
    const checked = await call('/connection/check-claude', {});
    expect(checked.status).toBe(200);
    const result = await checked.text();
    expect(JSON.parse(result)).toMatchObject({ loggedIn: true, billing: 'subscription' });
    expect(result).not.toMatch(/private@example|private-org|NEVER-EXPOSE/);
    expect(store.setting('model-connection')).toBeNull();
    expect(store.listWork()).toHaveLength(0);
    const configured = await call('/connection', { kind: 'claude-code', model: 'sonnet' });
    expect(configured.status).toBe(200);
    expect(await json(configured)).toMatchObject({
      config: { kind: 'claude-code', claudeBilling: 'subscription' },
    });
  });
  test('chat sends are authenticated, idempotent, durable, and independently cancellable', async () => {
    const provider = new FakeModelProvider([
      { text: 'First answer', delayMs: 40 },
      { text: 'Second answer', delayMs: 40 },
    ]);
    const { call, handler, chat, store } = fixture(provider);
    const a = await json<Conversation>(call('/conversations', {}));
    const b = await json<Conversation>(call('/conversations', {}));
    const input = { clientId: crypto.randomUUID(), message: 'Question', attachments: [] };
    expect(
      (
        await handler(
          new Request(`${origin}/api/workspace/conversations/${a.id}/send`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(input),
          }),
        )
      ).status,
    ).toBe(401);
    expect(store.conversations.turns(a.id)).toHaveLength(0);
    const response = await call(`/conversations/${a.id}/send`, input);
    expect(response.status).toBe(202);
    const first = await json<Turn>(response);
    expect((await json<Turn>(call(`/conversations/${a.id}/send`, input))).id).toBe(first.id);
    expect(
      (await call(`/conversations/${a.id}/send`, { ...input, message: 'Changed' })).status,
    ).toBe(409);
    const second = await json<Turn>(
      call(`/conversations/${b.id}/send`, { ...input, clientId: crypto.randomUUID() }),
    );
    expect(store.conversations.list().filter((item) => item.running)).toHaveLength(2);
    expect((await call(`/conversations/${b.id}/stop`, { turnId: first.id })).status).toBe(409);
    expect((await call(`/conversations/${a.id}/stop`, { turnId: first.id })).status).toBe(200);
    await chat!.idle();
    const reopened = await json<{ turns: Turn[] }>(call(`/conversations/${b.id}`));
    expect(reopened.turns[0]?.id).toBe(second.id);
    expect(reopened.turns[0]?.status).toBe('complete');
    expect(store.conversations.turn(first.id).status).toBe('cancelled');
    expect(store.listWork()).toHaveLength(1);
  });
  test('connection configuration never returns or persists its key in workspace records', async () => {
    const { call, store } = fixture();
    const key = 'synthetic-secret-for-http-test';
    const configured = await call('/connection', {
      kind: 'openai-api',
      model: 'gpt-5.6-sol',
      apiKey: key,
    });
    expect(configured.status).toBe(200);
    const status = await json<ConnectionStatus>(configured);
    expect(status).toMatchObject({ ready: true, qualification: 'not-live-qualified' });
    expect(JSON.stringify(status)).not.toContain(key);
    expect(await (await call()).text()).not.toContain(key);
    expect(JSON.stringify(store.setting('model-connection'))).not.toContain(key);
    expect(
      (await call('/connection', { kind: 'claude-sub', model: 'claude-sonnet-5' })).status,
    ).toBe(400);
    expect(
      (await call('/connection', { kind: 'codex', model: 'gpt-5.6-sol', apiKey: key })).status,
    ).toBe(409);
    expect(
      (
        await call('/connection', {
          kind: 'openai-api',
          model: 'gpt-5.6-sol',
          endpoint: 'https://example.com',
        })
      ).status,
    ).toBe(400);
  });
  test('conversation boundaries and upload formats are validated before writes', async () => {
    const { call, store } = fixture();
    expect((await call('/conversations', { scope: 'matter' })).status).toBe(400);
    expect(
      (await call('/conversations', { scope: 'conversation', matterId: crypto.randomUUID() }))
        .status,
    ).toBe(400);
    expect(store.conversations.list()).toHaveLength(0);
    expect((await call('/files', { name: 'document.pdf', base64: '' })).status).toBe(409);
    expect((await call('/files', { name: '../escape.txt', base64: '' })).status).toBe(400);
    expect(store.catalog().totals.sources).toBe(0);
    const response = await call('/files', {
      name: 'Note.txt',
      base64: Buffer.from('Original text.').toString('base64'),
    });
    expect(response.status).toBe(201);
    expect((await json<Source>(response)).latest.body).toBe('Original text.');
  });
  test('shell loads without credentials, workspace data never does', async () => {
    const { handler } = fixture();
    const shell = await handler(new Request(origin));
    expect(await shell.text()).toContain('Workspace');
    expect(shell.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(shell.headers.get('referrer-policy')).toBe('no-referrer');
    expect((await handler(new Request(`${origin}/api/workspace`))).status).toBe(401);
    expect(
      (
        await handler(
          new Request(`${origin}/api/workspace`, {
            headers: { cookie: `counsel_session=${token}` },
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handler(
          new Request(`${origin}/api/workspace`, {
            headers: { authorization: 'Bearer incorrect' },
          }),
        )
      ).status,
    ).toBe(401);
  });
  test('rejects hostile origins, host headers, and unknown routes', async () => {
    const { handler, call } = fixture();
    const hostileHeaders: Record<string, string>[] = [
      { origin: 'https://attacker.example' },
      { origin: 'http://127.0.0.1:9999' },
      { host: 'attacker.example:7432' },
    ];
    for (const headers of hostileHeaders) {
      expect(
        (
          await handler(
            new Request(`${origin}/api/workspace`, {
              headers: { authorization: `Bearer ${token}`, ...headers },
            }),
          )
        ).status,
      ).toBe(403);
    }
    expect(
      (
        await handler(
          new Request('http://attacker.example:7432/api/workspace', {
            headers: { authorization: `Bearer ${token}` },
          }),
        )
      ).status,
    ).toBe(403);
    expect((await call('/missing')).status).toBe(404);
    expect((await call('/work/not-an-id')).status).toBe(400);
  });
  test('catalog is bounded and does not return whole source bodies', async () => {
    const { store, call } = fixture();
    store.importSeed(practice);
    const source = store.createSource({
      kind: 'reference',
      revision: {
        title: 'Large source',
        body: 'a'.repeat(10_000),
        provenance: { origin: 'manual:test' },
      },
    });
    const response = await call();
    expect(response.headers.get('cache-control')).toBe('no-store');
    const result = await json<WorkspaceCatalog>(response);
    expect(result.totals).toEqual({ matters: 3, sources: 4, knowledge: 3, work: 4, pending: 1 });
    expect(result.sources.find((s) => s.id === source.id)!.preview.length).toBe(220);
    expect(
      Object.hasOwn(
        result.sources.find((s) => s.id === source.id)!,
        'body',
      ),
    ).toBe(false);
    expect(store.catalog(1).sources).toHaveLength(1);
    expect(store.catalog(1).totals.sources).toBe(4);
    expect((await json<Source>(call(`/sources/${source.id}`))).latest.body).toHaveLength(10_000);
  });
  test('matter catalogs apply scope before the limit and count all linked work', async () => {
    const { store, call } = fixture();
    const first = store.createMatter({ title: 'First' });
    const second = store.createMatter({ title: 'Second' });
    const firstWork = store.recordWork({
      title: 'First work',
      request: 'Question',
      answer: 'Answer',
      matterId: first.id,
    });
    for (let i = 0; i < 3; i++)
      store.recordWork({
        title: 'Other work',
        request: 'Question',
        answer: 'Answer',
        matterId: second.id,
      });
    const scoped = store.catalog(1, first.id);
    expect(scoped.work.map((w) => w.id)).toEqual([firstWork.id]);
    expect(scoped.totals.work).toBe(1);
    expect(store.catalog().matters.find((m) => m.id === second.id)!.workCount).toBe(3);
    const context = await json<WorkspaceCatalog & { matter: Matter }>(
      call(`/matters/${first.id}/context`),
    );
    expect(context.matter.title).toBe('First');
    expect(context.work.map((w) => w.id)).toEqual([firstWork.id]);
  });
  test('validates input and body size before creating any records', async () => {
    const { handler, call, store } = fixture();
    expect((await call('/matters', { title: '' })).status).toBe(400);
    expect((await call('/matters', { title: 'Matter', unexpected: true })).status).toBe(400);
    expect(
      (
        await handler(
          new Request(`${origin}/api/workspace/matters`, {
            method: 'POST',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain' },
            body: '{}',
          }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await handler(
          new Request(`${origin}/api/workspace/matters`, {
            method: 'POST',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: '{',
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          new Request(`${origin}/api/workspace/matters`, {
            method: 'POST',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: JSON.stringify({ title: 'Oversized', summary: 'a'.repeat(2_200_001) }),
          }),
        )
      ).status,
    ).toBe(413);
    expect(store.listMatters()).toHaveLength(0);
  });
  test('creates matter, reference, note, and human decision, with durable assignment', async () => {
    const { call, store } = fixture();
    const profile = store.saveProfile({ name: 'Local lawyer', expectedRevisionId: null });
    const matterResponse = await call('/matters', { title: 'Advice', kind: 'advisory' });
    expect(matterResponse.status).toBe(201);
    const matter = await json<Matter>(matterResponse);
    const note = await json<Work>(
      call('/work', { title: 'Note', request: 'Context', answer: 'Preserved note' }),
    );
    const linked = await call(`/work/${note.id}/assign`, { matterId: matter.id });
    expect(linked.status).toBe(200);
    expect((await json<Work>(linked)).matterId).toBe(matter.id);
    const decision = await json<Work>(
      call('/work', {
        title: 'Decision',
        request: 'Record decision',
        answer: 'Wait for evidence',
        matterId: matter.id,
        disposition: 'decision',
        expectedProfileRevisionId: profile.revisionId,
      }),
    );
    expect(decision.disposition).toBe('decision');
    expect(
      (
        await call('/sources', {
          kind: 'reference',
          matterIds: [matter.id],
          revision: {
            title: 'Source',
            body: 'Reference text',
            provenance: { origin: 'manual:test' },
          },
        })
      ).status,
    ).toBe(201);
    expect((await json<Work>(call(`/work/${note.id}`))).answer).toBe('Preserved note');
  });
  test('new knowledge cannot skip review or claim maintained ownership', async () => {
    const { call, store } = fixture();
    const input = { kind: 'position', revision: { title: 'Proposal', body: 'Proposed rule' } };
    expect(
      (
        await call('/knowledge', {
          ...input,
          revision: { ...input.revision, status: 'approved', approvedBy: 'Model' },
        })
      ).status,
    ).toBe(400);
    expect((await call('/knowledge', { ...input, ownership: 'maintained' })).status).toBe(400);
    expect(store.catalog().totals.knowledge).toBe(0);
    expect((await call('/knowledge', input)).status).toBe(201);
  });
  test('approval creates a decision journal with the proposed version and rejects stale repeat clicks', async () => {
    const { call, store } = fixture();
    const profile = store.saveProfile({ name: 'Reviewer', expectedRevisionId: null });
    const proposed = await json<Knowledge>(
      call('/knowledge', {
        kind: 'position',
        revision: { title: 'Review me', body: 'Quasar proposed approach' },
      }),
    );
    expect(store.search({ query: 'Quasar' }).hits).toHaveLength(0);
    const response = await call(`/knowledge/${proposed.id}/review`, {
      expectedRevisionId: proposed.latest.id,
      action: 'approve',
      expectedProfileRevisionId: profile.revisionId,
    });
    expect(response.status).toBe(200);
    const approved = await json<Knowledge>(response);
    expect(approved.active!.status).toBe('approved');
    expect(approved.latest.number).toBe(2);
    expect(store.getKnowledgeRevision(proposed.latest.id).status).toBe('pending');
    const decision = store.listWork()[0]!;
    expect(decision.decisionBy).toBe('Reviewer');
    expect(decision.evidence[0]!.target).toEqual({
      kind: 'knowledge',
      revisionId: proposed.latest.id,
    });
    expect(decision.evidence[0]!.quote).toBe('Quasar proposed approach');
    expect(
      (
        await call(`/knowledge/${proposed.id}/review`, {
          expectedRevisionId: proposed.latest.id,
          action: 'reject',
          expectedProfileRevisionId: profile.revisionId,
        })
      ).status,
    ).toBe(409);
    expect(store.listWork()).toHaveLength(1);
    expect(store.search({ query: 'Quasar', kinds: ['knowledge'] }).hits).toHaveLength(1);
  });
  test('rejection preserves the earlier approved knowledge and records the reviewer', async () => {
    const { call, store } = fixture();
    const profile = store.saveProfile({ name: 'Second reviewer', expectedRevisionId: null });
    const item = store.createKnowledge({
      kind: 'position',
      revision: {
        title: 'Existing',
        body: 'Previous approved position',
        status: 'approved',
        approvedBy: 'First reviewer',
      },
    });
    const proposal = store.reviseKnowledge(item.id, item.latest.id, {
      title: 'Proposed replacement',
      body: 'Unapproved replacement',
    });
    const response = await call(`/knowledge/${item.id}/review`, {
      expectedRevisionId: proposal.id,
      action: 'reject',
      expectedProfileRevisionId: profile.revisionId,
    });
    expect(response.status).toBe(200);
    const result = await json<Knowledge>(response);
    expect(result.active!.id).toBe(item.latest.id);
    expect(result.latest.status).toBe('rejected');
    expect(store.listWork()[0]!.decisionBy).toBe('Second reviewer');
    expect((await call(`/knowledge-revisions/${proposal.id}`)).status).toBe(200);
  });
  test('search retains scope and honest missing-text coverage through HTTP', async () => {
    const { call, store } = fixture();
    const receipt = store.importSeed(practice);
    const matterId = receipt.records.matters.investigation!;
    store.createSource({
      kind: 'document',
      matterIds: [matterId],
      revision: {
        title: 'Missing document',
        body: null,
        textStatus: 'unavailable',
        provenance: { origin: 'manual:test' },
      },
    });
    const result = await json<SearchResult>(call(`/search?q=witness&matter=${matterId}`));
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.every((h: { matterIds: string[] }) => h.matterIds.includes(matterId))).toBe(
      true,
    );
    expect(result.coverage.complete).toBe(false);
    expect(result.coverage.gaps[0]!.title).toBe('Missing document');
    expect((await call(`/search?q=${'word%20'.repeat(65)}`)).status).toBe(400);
  });
});
