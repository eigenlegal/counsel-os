import { beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider } from '../core/fake-provider';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { Router } from '../router/router';
import { ThreadStore, type ThreadEvent } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { createApp, type App, type ServerDeps } from './routes';

const TOKEN = 'test-token-0123456789';

let vaultRoot: string;
let pluginRoot: string;
let vault: FsVaultStore;
let store: ThreadStore;

beforeEach(() => {
  vaultRoot = mkdtempSync(join(tmpdir(), 'routes-vault-'));
  pluginRoot = mkdtempSync(join(tmpdir(), 'routes-plugin-'));
  mkdirSync(join(pluginRoot, 'skills', 'counsel'), { recursive: true });
  writeFileSync(join(pluginRoot, 'skills', 'counsel', 'SKILL.md'), '---\nname: counsel\n---\n\nBODY.\n', 'utf8');
  mkdirSync(join(pluginRoot, 'primitives'), { recursive: true });
  writeFileSync(join(pluginRoot, 'primitives', 'draft.md'), 'DRAFT.\n', 'utf8');
  vault = new FsVaultStore(vaultRoot);
  store = new ThreadStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'routes-codex-')) });
});

function appWith(providers: ModelProvider[]): App {
  const deps: ServerDeps = {
    token: TOKEN,
    tenant: 'default',
    vaultRoot,
    pluginRoot,
    vault,
    store,
    providers,
    router: new Router({ default: providers[0]!.id }, providers),
    platform: 'macos',
  };
  return createApp(deps);
}

function appWithFake(script: ConstructorParameters<typeof FakeModelProvider>[0] = [{ text: 'hello there' }]): App {
  return appWith([new FakeModelProvider(script)]);
}

interface CallOptions {
  body?: unknown;
  token?: string | null;
}

function call(app: App, method: string, path: string, opts: CallOptions = {}): Promise<Response> {
  const token = opts.token === undefined ? TOKEN : opts.token;
  const headers: Record<string, string> = {};
  if (token !== null) headers['authorization'] = `Bearer ${token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  return app(
    new Request(`http://127.0.0.1:7431${path}`, {
      method,
      headers,
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    }),
  );
}

interface Frame {
  event: string;
  data: Record<string, unknown>;
}

function parseSse(text: string): Frame[] {
  return text
    .split('\n\n')
    .filter(block => block.trim() !== '')
    .map(block => {
      const lines = block.split('\n');
      const eventLine = lines.find(l => l.startsWith('event: '))!;
      const data = lines.filter(l => l.startsWith('data: ')).map(l => l.slice(6)).join('\n');
      return { event: eventLine.slice('event: '.length), data: JSON.parse(data) as Record<string, unknown> };
    });
}

async function newThread(app: App): Promise<string> {
  const res = await call(app, 'POST', '/threads', { body: { title: 'a thread' } });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function step(app: App, id: string, body: Record<string, unknown>): Promise<{ res: Response; frames: Frame[] }> {
  const res = await call(app, 'POST', `/threads/${id}/steps`, { body });
  const frames = res.headers.get('content-type') === 'text/event-stream' ? parseSse(await res.text()) : [];
  return { res, frames };
}

function kindOf(ev: ThreadEvent): string {
  return 't' in ev ? ev.t : ev.type;
}

describe('auth', () => {
  test('every route needs a bearer token', async () => {
    const app = appWithFake();
    for (const path of ['/health', '/threads', '/vault/list']) {
      expect((await call(app, 'GET', path, { token: null })).status).toBe(401);
      expect((await call(app, 'GET', path, { token: 'wrong-token' })).status).toBe(401);
      // A prefix of the real token must not pass either.
      expect((await call(app, 'GET', path, { token: TOKEN.slice(0, -1) })).status).toBe(401);
    }
  });

  test('an unknown route is 404, even with a good token', async () => {
    expect((await call(appWithFake(), 'GET', '/nope')).status).toBe(404);
  });
});

describe('GET /health', () => {
  test('lists the providers and the default', async () => {
    const res = await call(appWithFake(), 'GET', '/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      vault: string;
      tenant: string;
      default: string;
      providers: Array<{ id: string; kind: string; auth: string; capabilities: Capabilities }>;
    };
    expect(body.vault).toBe(vaultRoot);
    expect(body.tenant).toBe('default');
    expect(body.default).toBe('fake/fake');
    expect(body.providers).toHaveLength(1);
    expect(body.providers[0]!.id).toBe('fake/fake');
    expect(body.providers[0]!.kind).toBe('direct');
    expect(body.providers[0]!.auth).toBe('local');
    expect(body.providers[0]!.capabilities.tools).toBe(true);
  });
});

describe('threads', () => {
  test('POST creates (201), GET lists and reads, DELETE removes', async () => {
    const app = appWithFake();
    const id = await newThread(app);

    const listed = (await (await call(app, 'GET', '/threads')).json()) as Array<{ id: string; title?: string }>;
    expect(listed.map(h => h.id)).toEqual([id]);
    expect(listed[0]!.title).toBe('a thread');

    const one = (await (await call(app, 'GET', `/threads/${id}`)).json()) as {
      header: { id: string };
      events: ThreadEvent[];
    };
    expect(one.header.id).toBe(id);
    expect(one.events).toEqual([]);

    expect((await call(app, 'DELETE', `/threads/${id}`)).status).toBe(204);
    expect((await call(app, 'GET', `/threads/${id}`)).status).toBe(404);
  });

  test('POST accepts no body at all', async () => {
    const res = await call(appWithFake(), 'POST', '/threads');
    expect(res.status).toBe(201);
  });

  test('an unknown thread is 404 and a malformed id is 400', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', `/threads/${randomUUID()}`)).status).toBe(404);
    expect((await call(app, 'GET', '/threads/not-a-uuid')).status).toBe(400);
    expect((await call(app, 'POST', `/threads/${randomUUID()}/steps`, { body: { message: 'hi' } })).status).toBe(404);
  });

  test('a bad body is 400', async () => {
    const app = appWithFake();
    const id = await newThread(app);
    expect((await call(app, 'POST', `/threads/${id}/steps`, { body: { nope: 1 } })).status).toBe(400);
    expect((await call(app, 'POST', '/threads', { body: { title: 42 } })).status).toBe(400);
  });
});

describe('POST /threads/:id/steps', () => {
  test('streams the step as SSE, ends with done, and reports the run id', async () => {
    const app = appWithFake([{ text: 'hello there' }]);
    const id = await newThread(app);

    const { res, frames } = await step(app, id, { message: 'hi' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('x-run-id')).toBeTruthy();
    expect(frames.map(f => f.event)).toEqual(['text', 'done']);
    expect(frames[0]!.data['text']).toBe('hello there');

    // The thread now shows the whole turn.
    const one = (await (await call(app, 'GET', `/threads/${id}`)).json()) as { events: ThreadEvent[] };
    expect(one.events.map(kindOf)).toEqual(['user', 'step', 'text', 'done']);
  });

  test('an unknown provider id is 422', async () => {
    const app = appWithFake();
    const id = await newThread(app);
    const res = await call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'hi', provider: 'nope/nope' } });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toContain('nope/nope');
  });

  test('an unsatisfiable task route is 422', async () => {
    const fake = new FakeModelProvider([{ text: 'x' }]);
    const app = createApp({
      token: TOKEN,
      tenant: 'default',
      vaultRoot,
      pluginRoot,
      vault,
      store,
      providers: [fake],
      router: new Router(
        { default: 'fake/fake', tasks: { heavy: { prefer: 'missing/model', require: { contextTokens: 99_000_000 } } } },
        [fake],
      ),
      platform: 'macos',
    });
    const id = await newThread(app);
    const res = await call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'hi', task: 'heavy' } });
    expect(res.status).toBe(422);
  });

  test('concurrent steps on one thread run one after the other', async () => {
    const app = appWith([new SlowProvider()]);
    const id = await newThread(app);

    const [a, b] = await Promise.all([
      call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'first' } }),
      call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'second' } }),
    ]);
    await Promise.all([a.text(), b.text()]);

    // Interleaved runs would produce user,user,step,step,…; serialized runs
    // produce two clean turns.
    const { events } = await store.get('default', id);
    expect(events.map(kindOf)).toEqual(['user', 'step', 'text', 'done', 'user', 'step', 'text', 'done']);
    const users = events.filter((e): e is Extract<ThreadEvent, { t: 'user' }> => 't' in e && e.t === 'user');
    expect(users.map(u => u.content)).toEqual(['first', 'second']);
  });
});

describe('POST /threads/:id/approve', () => {
  const proposal = {
    toolCalls: [
      {
        name: 'propose_update',
        input: { path: 'practice/standards/x.md', content: 'NEW TEXT\n', rationale: 'because' },
      },
    ],
    text: 'proposed',
  };

  async function seedProposal(app: App): Promise<{ threadId: string; proposalId: string }> {
    const threadId = await newThread(app);
    await step(app, threadId, { message: 'remember this' });
    const { events } = await store.get('default', threadId);
    const ev = events.find((e): e is Extract<ThreadEvent, { t: 'proposal' }> => 't' in e && e.t === 'proposal');
    expect(ev).toBeDefined();
    return { threadId, proposalId: ev!.id };
  }

  test('approve writes the vault file and returns the updated proposal', async () => {
    const app = appWithFake([proposal]);
    const { threadId, proposalId } = await seedProposal(app);

    const res = await call(app, 'POST', `/threads/${threadId}/approve`, {
      body: { proposalId, decision: 'approve' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { proposal: { status: string; path: string }; version: string };
    expect(body.proposal.status).toBe('approved');
    expect(body.proposal.path).toBe('practice/standards/x.md');
    expect(body.version).toBeTruthy();
    expect(readFileSync(join(vaultRoot, 'practice', 'standards', 'x.md'), 'utf8')).toBe('NEW TEXT\n');
  });

  test('reject leaves the vault alone', async () => {
    const app = appWithFake([proposal]);
    const { threadId, proposalId } = await seedProposal(app);

    const res = await call(app, 'POST', `/threads/${threadId}/approve`, {
      body: { proposalId, decision: 'reject' },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { proposal: { status: string } }).proposal.status).toBe('rejected');
    expect(await vault.version('default', 'practice/standards/x.md')).toBeNull();
  });

  test('a path changed since the proposal is 409 with both versions', async () => {
    const app = appWithFake([proposal]);
    const { threadId, proposalId } = await seedProposal(app);
    await vault.write('default', 'practice/standards/x.md', 'SOMEONE ELSE\n');

    const res = await call(app, 'POST', `/threads/${threadId}/approve`, {
      body: { proposalId, decision: 'approve' },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { conflict: { expected: string; actual: string } };
    expect(body.conflict.expected).toBe('missing');
    expect(body.conflict.actual).toBeTruthy();
    expect(readFileSync(join(vaultRoot, 'practice', 'standards', 'x.md'), 'utf8')).toBe('SOMEONE ELSE\n');
  });

  test('an unknown proposal is 404', async () => {
    const app = appWithFake([proposal]);
    const { threadId } = await seedProposal(app);
    const res = await call(app, 'POST', `/threads/${threadId}/approve`, {
      body: { proposalId: randomUUID(), decision: 'approve' },
    });
    expect(res.status).toBe(404);
  });

  test('a decision on an already-decided proposal is 409', async () => {
    const app = appWithFake([proposal]);
    const { threadId, proposalId } = await seedProposal(app);
    await call(app, 'POST', `/threads/${threadId}/approve`, { body: { proposalId, decision: 'reject' } });
    const res = await call(app, 'POST', `/threads/${threadId}/approve`, { body: { proposalId, decision: 'approve' } });
    expect(res.status).toBe(409);
  });
});

describe('vault', () => {
  test('read and list are read-only views of the vault', async () => {
    const app = appWithFake();
    await vault.write('default', 'matters/acme/notes.md', 'NOTES\n');

    const read = await call(app, 'GET', '/vault/read?path=matters/acme/notes.md');
    expect(read.status).toBe(200);
    const body = (await read.json()) as { path: string; content: string; version: string | null };
    expect(body.content).toBe('NOTES\n');
    expect(body.version).toBeTruthy();

    const list = await call(app, 'GET', '/vault/list?dir=matters/acme');
    expect(list.status).toBe(200);
    const entries = (await list.json()) as Array<{ path: string; kind: string }>;
    expect(entries).toEqual([{ path: 'matters/acme/notes.md', kind: 'file' }]);

    // The vault root lists without a dir parameter.
    const root = (await (await call(app, 'GET', '/vault/list')).json()) as Array<{ path: string }>;
    expect(root.map(e => e.path)).toContain('matters');
  });

  test('a path that escapes the vault is 400', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', '/vault/read?path=../x')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/read?path=/etc/passwd')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/list?dir=..')).status).toBe(400);
    // The store's own bookkeeping is not readable either.
    expect((await call(app, 'GET', '/vault/read?path=.counsel/threads')).status).toBe(400);
  });

  test('a missing file is 404 and a missing path parameter is 400', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', '/vault/read?path=matters/none.md')).status).toBe(404);
    expect((await call(app, 'GET', '/vault/read')).status).toBe(400);
  });

  test('writes are not exposed', async () => {
    expect((await call(appWithFake(), 'POST', '/vault/read', { body: { path: 'x' } })).status).toBe(404);
  });
});

/** A provider whose events arrive over a few turns of the event loop, so two
 * overlapping requests would interleave their thread-log writes if the server
 * did not serialize them. */
class SlowProvider implements ModelProvider {
  readonly id = 'slow/slow';
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities = {
    tools: true,
    caching: false,
    thinking: false,
    contextTokens: 1_000_000,
    auth: 'local',
  };

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    void req;
    await new Promise(r => setTimeout(r, 15));
    yield { type: 'text', text: 'slow' };
    await new Promise(r => setTimeout(r, 15));
    yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
