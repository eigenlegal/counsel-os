import { beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
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

function appWith(providers: ModelProvider[], extra: Partial<ServerDeps> = {}): App {
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
    ...extra,
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

  test('a hung provider times out, and the thread is free again immediately', async () => {
    // The hang is hand-rolled: `return()` on an async generator parked on a
    // never-resolving `await` never runs, so a generator could not report
    // being closed (see the loop's `closeWithoutWaiting`).
    let closed = false;
    const hanging: ModelProvider = {
      id: 'hang/hang',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      run(): AsyncIterable<StepEvent> {
        let sent = false;
        return {
          [Symbol.asyncIterator]: () => ({
            next: (): Promise<IteratorResult<StepEvent>> => {
              if (sent) return new Promise<IteratorResult<StepEvent>>(() => {});
              sent = true;
              return Promise.resolve({ value: { type: 'text', text: 'thinking' }, done: false });
            },
            return: async (): Promise<IteratorResult<StepEvent>> => {
              closed = true;
              return { value: undefined, done: true };
            },
          }),
        };
      },
    };
    const app = appWith([hanging, new FakeModelProvider([{ text: 'second answer' }])], { stepTimeoutMs: 50 });
    const id = await newThread(app);

    const first = await step(app, id, { message: 'hi' });
    expect(first.res.status).toBe(200);
    expect(first.frames.map(f => f.event)).toEqual(['text', 'error']);
    expect(String(first.frames[1]!.data['message'])).toMatch(/timed out after/);
    expect(closed).toBe(true);

    // The lock came back with the stream: a second step on the SAME thread
    // runs to completion instead of queueing behind a provider nobody is
    // waiting on any more.
    const second = await step(app, id, { message: 'again', provider: 'fake/fake' });
    expect(second.res.status).toBe(200);
    expect(second.frames.map(f => f.event)).toEqual(['text', 'done']);

    const { events } = await store.get('default', id);
    expect(events.map(kindOf)).toEqual(['user', 'step', 'text', 'error', 'user', 'step', 'text', 'done']);
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

describe('one thread at a time', () => {
  test('an approve during a step leaves both the step and the decision intact', async () => {
    // `updateProposal` rewrites the whole log (read → temp → rename). That
    // rewrite is safe only because every ThreadStore mutator happens to be
    // wholly synchronous — no `await` between the read and the rename — so
    // nothing can append into the window. This asserts the end state both
    // ways round; the lock is what keeps it true if that changes (every
    // other store here already uses fs/promises).
    const app = appWith([new SeedThenSlowProvider()]);
    const id = await newThread(app);
    await step(app, id, { message: 'seed' });

    const seeded = (await store.get('default', id)).events;
    expect(seeded.map(kindOf)).toEqual(['user', 'step', 'tool_call', 'proposal', 'tool_result', 'done']);
    const proposalId = (seeded.find(e => 't' in e && e.t === 'proposal') as Extract<ThreadEvent, { t: 'proposal' }>).id;

    const [stepRes, approveRes] = await Promise.all([
      call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'second' } }),
      call(app, 'POST', `/threads/${id}/approve`, { body: { proposalId, decision: 'approve' } }),
    ]);
    await stepRes.text();
    expect(approveRes.status).toBe(200);

    const { events } = await store.get('default', id);
    expect(events.map(kindOf)).toEqual([
      ...['user', 'step', 'tool_call', 'proposal', 'tool_result', 'done'],
      // The provider's three `text` deltas are one logged `text` event —
      // `stream()` coalesces a run of them (they still stream as three).
      ...['user', 'step', 'text', 'done'],
    ]);
    const proposal = events.find(e => 't' in e && e.t === 'proposal') as Extract<ThreadEvent, { t: 'proposal' }>;
    expect(proposal.status).toBe('approved');
    expect(readFileSync(join(vaultRoot, 'practice', 'standards', 'x.md'), 'utf8')).toBe('NEW TEXT\n');
  });

  test('a delete waits for the step in flight instead of pulling the log out from under it', async () => {
    const app = appWith([new SlowProvider()]);
    const id = await newThread(app);

    // The response resolves once the stream is open and the first event has
    // been read — the step is in flight and holds the lock. The delete
    // arrives in that window on purpose; racing the two with Promise.all
    // would only assert which handler reached the lock first.
    const stepRes = await call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'first' } });
    const deleting = call(app, 'DELETE', `/threads/${id}`);
    const streamed = parseSse(await stepRes.text());

    // Deleted mid-stream, the step's next append hits a log that is gone and
    // the run dies with "thread log write failed". Serialized, it finishes.
    expect(streamed.map(f => f.event)).toEqual(['text', 'done']);
    expect((await deleting).status).toBe(204);
    expect((await call(app, 'GET', `/threads/${id}`)).status).toBe(404);
  });

  test('a client that hangs up closes the provider', async () => {
    // Nobody is reading any more: the provider must be told, or a harness
    // subprocess keeps running with no consumer.
    const provider = new EndlessProvider();
    const app = appWith([provider]);
    const id = await newThread(app);

    const res = await call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'hi' } });
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();

    await waitFor(() => provider.closed);
    expect(provider.closed).toBe(true);
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
    // The store's own bookkeeping is not readable either — in any casing,
    // since the filesystem underneath is case-insensitive.
    expect((await call(app, 'GET', '/vault/read?path=.counsel/threads')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/read?path=.Counsel/threads')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/list?dir=.COUNSEL')).status).toBe(400);
  });

  test('a missing file is 404 and a missing path parameter is 400', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', '/vault/read?path=matters/none.md')).status).toBe(404);
    expect((await call(app, 'GET', '/vault/read')).status).toBe(400);
  });

  test('reading a directory is 400, not 404 — the path names the wrong kind of thing', async () => {
    const app = appWithFake();
    await vault.write('default', 'matters/acme/notes.md', 'NOTES\n');
    expect((await call(app, 'GET', '/vault/read?path=matters/acme')).status).toBe(400);
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

/** Polls until `pred` holds or the deadline passes — the provider's `finally`
 * runs a turn or two after the reader is cancelled. */
async function waitFor(pred: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!pred() && Date.now() < deadline) await new Promise(r => setTimeout(r, 5));
}

/** First run: propose a knowledge write (seeding a pending proposal). Second
 * run: dawdle, so an overlapping approve has something to collide with. */
class SeedThenSlowProvider implements ModelProvider {
  readonly id = 'seed/slow';
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities = {
    tools: true,
    caching: false,
    thinking: false,
    contextTokens: 1_000_000,
    auth: 'local',
  };
  private calls = 0;

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    if (this.calls++ === 0) {
      const input = { path: 'practice/standards/x.md', content: 'NEW TEXT\n', rationale: 'because' };
      yield { type: 'tool_call', id: 'seed-0', name: 'propose_update', input };
      const result = await runToolDef(req.tools, 'propose_update', input, req.tenant);
      yield { type: 'tool_result', id: 'seed-0', name: 'propose_update', output: result.output, isError: result.isError };
      yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }
    for (const text of ['one', 'two', 'three']) {
      await new Promise(r => setTimeout(r, 10));
      yield { type: 'text', text };
    }
    yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

/** Streams until someone stops it, and records that it was stopped. Bounded
 * so a regression fails the assertion instead of spinning forever. */
class EndlessProvider implements ModelProvider {
  readonly id = 'endless/endless';
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities = {
    tools: true,
    caching: false,
    thinking: false,
    contextTokens: 1_000_000,
    auth: 'local',
  };
  closed = false;

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    void req;
    try {
      yield { type: 'text', text: 'first' };
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 10));
        yield { type: 'text', text: `chunk ${i}` };
      }
      yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
    } finally {
      this.closed = true;
    }
  }
}
