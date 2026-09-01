import { beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { Router } from '../router/router';
import { ThreadStore, type ThreadEvent } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { fsSearch } from '../vault/search';
import { buildDocx } from '../docx/test/builder';
import { API_PREFIXES, createApp, TRUNCATED_HEADER, type App, type ServerDeps } from './routes';
import type { RuntimeState } from './settings';

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

/**
 * A server whose live state is exactly `providers`, with the first as the
 * default. `state` is a getter over one fixed object here — a reload is
 * `settings.test.ts`'s subject, not this file's — and `reload` re-installs
 * that same state, so nothing a route test does can quietly swap the
 * provider it asserts against.
 */
function appWith(
  providers: ModelProvider[],
  extra: Partial<ServerDeps> & { stepTimeoutMs?: number } = {},
): App {
  const { stepTimeoutMs, ...rest } = extra;
  const state: RuntimeState = {
    providers,
    router: new Router({ default: providers[0]!.id }, providers),
    defaultId: providers[0]!.id,
    ...(stepTimeoutMs === undefined ? {} : { stepTimeoutMs }),
  };
  const deps: ServerDeps = {
    token: TOKEN,
    tenant: 'default',
    vaultRoot,
    pluginRoot,
    vault,
    store,
    platform: 'macos',
    state: () => state,
    settings: { file: join(mkdtempSync(join(tmpdir(), 'routes-home-')), 'providers.yaml'), reload: () => {} },
    ...rest,
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
    // SSE comment lines (`: typed`) are not frames — the typed-answer
    // preamble is one, and a client ignores it the same way this does.
    .filter(block => !block.startsWith(':'))
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

async function step(app: App, id: string, body: Record<string, unknown>): Promise<{ res: Response; frames: Frame[]; body: string }> {
  const res = await call(app, 'POST', `/threads/${id}/steps`, { body });
  const sse = res.headers.get('content-type') === 'text/event-stream';
  const raw = sse ? await res.text() : '';
  return { res, frames: sse ? parseSse(raw) : [], body: raw };
}

function kindOf(ev: ThreadEvent): string {
  return 't' in ev ? ev.t : ev.type;
}

describe('auth', () => {
  test('every route needs a bearer token', async () => {
    const app = appWithFake();
    for (const path of ['/health', '/threads', '/vault/list', '/runs']) {
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
    const app = appWith([fake], {
      state: () => ({
        providers: [fake],
        router: new Router(
          { default: 'fake/fake', tasks: { heavy: { prefer: 'missing/model', require: { contextTokens: 99_000_000 } } } },
          [fake],
        ),
      }),
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

  test('a provider whose close never settles does not hold the thread lock', async () => {
    // The step itself finishes cleanly — it is the CLOSE that hangs, a
    // harness waiting on a child process that will not exit. An unbounded
    // wait there would leave the SSE stream open, so the lock would never be
    // released and every later step on this thread would queue behind it.
    const stuckClose: ModelProvider = {
      id: 'stuck/stuck',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      run: (): AsyncIterable<StepEvent> => {
        const script: StepEvent[] = [
          { type: 'text', text: 'answer' },
          { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } },
        ];
        let i = 0;
        return {
          [Symbol.asyncIterator]: () => ({
            next: (): Promise<IteratorResult<StepEvent>> => {
              const ev = script[i++];
              return Promise.resolve(ev ? { value: ev, done: false } : { value: undefined, done: true });
            },
            return: (): Promise<IteratorResult<StepEvent>> => new Promise(() => {}),
          }),
        };
      },
    };
    // A short step timeout also shortens the close budget (`min(2000, what is
    // left of the step)`), so the fall-through is quick.
    const app = appWith([stuckClose, new FakeModelProvider([{ text: 'second answer' }])], { stepTimeoutMs: 300 });
    const id = await newThread(app);

    const first = await step(app, id, { message: 'hi' });
    expect(first.frames.map(f => f.event)).toEqual(['text', 'done']);

    const second = await step(app, id, { message: 'again', provider: 'fake/fake' });
    expect(second.res.status).toBe(200);
    expect(second.frames.map(f => f.event)).toEqual(['text', 'done']);
  });
});

/** A provider that answers a typed request in prose — the shape the fallback
 * exists for. */
function failingTyped(text: string): ModelProvider {
  return {
    id: 'typed/fail',
    kind: 'direct',
    capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1_000_000, auth: 'local' },
    async *run(): AsyncIterable<StepEvent> {
      yield { type: 'text', text };
      yield { type: 'error', message: 'structured output failed validation: not an object', text };
    },
  };
}

describe('typed answers', () => {
  test('an outputSchema on the request reaches the provider, and done carries the parsed output', async () => {
    const app = appWithFake([{ text: 'ok', output: { files: ['a'] } }]);
    const id = await newThread(app);

    const { res, frames } = await step(app, id, {
      message: 'list the files',
      outputSchema: {
        type: 'object',
        properties: { files: { type: 'array', items: { type: 'string' } } },
        required: ['files'],
      },
    });

    expect(res.status).toBe(200);
    const done = frames.find(f => f.event === 'done')!;
    expect(done.data['output']).toEqual({ files: ['a'] });
  });

  test('a typed step does not stream raw text deltas, and says so with a `: typed` comment', async () => {
    // Under a schema the deltas are the model working toward the JSON, not an
    // answer to show; the thread log still keeps them (web-ui spec §4.3).
    const app = appWithFake([{ text: 'thinking out loud', output: { files: ['a'] } }]);
    const id = await newThread(app);

    const { res, frames, body } = await step(app, id, {
      message: 'list the files',
      outputSchema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string' } } }, required: ['files'] },
    });

    expect(res.status).toBe(200);
    expect(body.startsWith(': typed\n\n')).toBe(true);
    expect(frames.map(f => f.event)).toEqual(['done']);
    // Dropped from the wire, kept in the log.
    const log = (await (await call(app, 'GET', `/threads/${id}`)).json()) as { events: ThreadEvent[] };
    expect(log.events.map(kindOf)).toContain('text');
  });

  test('an untyped step still streams its text and carries no preamble', async () => {
    const app = appWithFake([{ text: 'thinking out loud' }]);
    const id = await newThread(app);

    const { frames, body } = await step(app, id, { message: 'hi' });

    expect(body.startsWith(':')).toBe(false);
    expect(frames.map(f => f.event)).toEqual(['text', 'done']);
  });

  test('a typed step whose answer fails validation still delivers the raw text on the error', async () => {
    const app = appWith([failingTyped('I cannot answer in JSON.')]);
    const id = await newThread(app);

    const { frames } = await step(app, id, {
      message: 'list the files',
      outputSchema: { type: 'object', properties: { files: { type: 'array' } }, required: ['files'] },
    });

    expect(frames.map(f => f.event)).toEqual(['error']);
    expect(frames[0]!.data['text']).toBe('I cannot answer in JSON.');
  });

  test('an invalid outputSchema is 400 and never reaches the provider', async () => {
    const app = appWithFake();
    const id = await newThread(app);

    const res = await call(app, 'POST', `/threads/${id}/steps`, {
      body: { message: 'hi', outputSchema: { type: 'nope' } },
    });

    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('invalid outputSchema');
  });
});

describe('proposal event', () => {
  test('the step stream carries a proposal frame after propose_update, with the id the log recorded', async () => {
    const app = appWithFake([
      {
        toolCalls: [
          {
            name: 'propose_update',
            input: { path: 'practice/standards/x.md', content: 'NEW TEXT\n', rationale: 'because' },
          },
        ],
        text: 'proposed',
      },
    ]);
    const id = await newThread(app);

    const { res, frames } = await step(app, id, { message: 'remember this' });

    expect(res.status).toBe(200);
    expect(frames.map(f => f.event)).toEqual(['tool_call', 'tool_result', 'proposal', 'text', 'done']);
    const proposalFrame = frames.find(f => f.event === 'proposal')!;
    expect(proposalFrame.data['path']).toBe('practice/standards/x.md');
    expect(proposalFrame.data['rationale']).toBe('because');

    const { events } = await store.get('default', id);
    const logged = events.find(
      (ev): ev is Extract<ThreadEvent, { t: 'proposal' }> => 't' in ev && ev.t === 'proposal',
    )!;
    expect(proposalFrame.data['id']).toBe(logged.id);

    // Not double-logged: the log has the one ThreadEvent the tool wrote.
    expect(events.map(kindOf)).toEqual(['user', 'step', 'tool_call', 'proposal', 'tool_result', 'text', 'done']);
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
    const entries = (await list.json()) as Array<{ path: string; kind: string; mtimeMs: number; size: number }>;
    expect(entries).toEqual([
      { path: 'matters/acme/notes.md', kind: 'file', mtimeMs: expect.any(Number), size: expect.any(Number) },
    ]);

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

describe('runs', () => {
  /** Runs one step and hands back the run it produced. */
  async function stepped(app: App, id: string, message: string): Promise<string> {
    const { res } = await step(app, id, { message });
    expect(res.status).toBe(200);
    return res.headers.get('x-run-id')!;
  }

  test('GET /runs lists a thread run by run, newest first', async () => {
    const app = appWithFake([{ text: 'one' }, { text: 'two' }]);
    const id = await newThread(app);

    const first = await stepped(app, id, 'first');
    // `startedAt` is an ISO millisecond stamp; two steps inside one
    // millisecond would tie.
    await new Promise(r => setTimeout(r, 2));
    const second = await stepped(app, id, 'second');

    const res = await call(app, 'GET', `/runs?thread=${id}`);
    expect(res.status).toBe(200);
    const runs = (await res.json()) as Array<Record<string, unknown>>;
    expect(runs.map(r => r.runId)).toEqual([second, first]);
    expect(runs[0]!.message).toBe('second');
    expect(runs[0]!.status).toBe('done');
    expect(runs[0]!.threadId).toBe(id);
  });

  test('a thread with no runs yet is an empty list, not a 404', async () => {
    const app = appWithFake();
    const res = await call(app, 'GET', `/runs?thread=${await newThread(app)}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('another thread\'s runs are not listed', async () => {
    const app = appWithFake([{ text: 'one' }, { text: 'two' }]);
    const mine = await newThread(app);
    const theirs = await newThread(app);
    const runId = await stepped(app, mine, 'mine');
    await stepped(app, theirs, 'theirs');

    const runs = (await (await call(app, 'GET', `/runs?thread=${mine}`)).json()) as Array<{ runId: string }>;
    expect(runs.map(r => r.runId)).toEqual([runId]);
  });

  test('the thread parameter is required, well-formed, and must name a real thread', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', '/runs')).status).toBe(400);
    expect((await call(app, 'GET', '/runs?thread=')).status).toBe(400);
    expect((await call(app, 'GET', '/runs?thread=not-a-uuid')).status).toBe(400);
    expect((await call(app, 'GET', '/runs?thread=../../etc/passwd')).status).toBe(400);
    expect((await call(app, 'GET', `/runs?thread=${randomUUID()}`)).status).toBe(404);
  });

  test('GET /runs/:runId returns the one record', async () => {
    const app = appWithFake([{ text: 'hi', usage: { inputTokens: 3, outputTokens: 4, costUsd: 0.25 } }]);
    const id = await newThread(app);
    const runId = await stepped(app, id, 'hello');

    const res = await call(app, 'GET', `/runs/${runId}`);
    expect(res.status).toBe(200);
    const run = (await res.json()) as Record<string, unknown>;
    expect(run.runId).toBe(runId);
    expect(run.threadId).toBe(id);
    expect(run.status).toBe('done');
    expect(run.provider).toBe('fake/fake');
    expect(run.costUsd).toBe(0.25);
  });

  test('an unknown run is 404 and a malformed run id is 400', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', `/runs/${randomUUID()}`)).status).toBe(404);
    expect((await call(app, 'GET', '/runs/not-a-uuid')).status).toBe(400);
  });

  test('a corrupt record is 404, not a 500', async () => {
    const app = appWithFake();
    const id = await newThread(app);
    const runId = await stepped(app, id, 'hello');
    writeFileSync(join(vaultRoot, '.counsel', 'runs', 'default', `${runId}.json`), '{ not json', 'utf8');

    expect((await call(app, 'GET', `/runs/${runId}`)).status).toBe(404);
    // And it is skipped rather than failing the thread's whole listing.
    const res = await call(app, 'GET', `/runs?thread=${id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('the runs API is read-only', async () => {
    const app = appWithFake();
    const id = await newThread(app);
    expect((await call(app, 'POST', `/runs?thread=${id}`, { body: {} })).status).toBe(404);
    expect((await call(app, 'DELETE', `/runs/${randomUUID()}`)).status).toBe(404);
  });
});

describe('static UI', () => {
  /** A built `dist/` next to the fixtures, plus an app that serves it. */
  function appWithDist(): { app: App; dist: string } {
    const dist = mkdtempSync(join(tmpdir(), 'routes-dist-'));
    mkdirSync(join(dist, 'assets'), { recursive: true });
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>counsel-os</title>\n', 'utf8');
    writeFileSync(join(dist, 'assets', 'app.js'), 'console.log(1)\n', 'utf8');
    return { app: appWith([new FakeModelProvider([{ text: 'hi' }])], { distDir: dist }), dist };
  }

  test('the page and its assets need no token; the API still does', async () => {
    const { app } = appWithDist();

    const page = await call(app, 'GET', '/', { token: null });
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(await page.text()).toContain('counsel-os');

    const asset = await call(app, 'GET', '/assets/app.js', { token: null });
    expect(asset.status).toBe(200);
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');

    // The token lives in the URL fragment, which the browser never sends. So
    // the shell has to load unauthenticated — and every API route must not.
    expect((await call(app, 'GET', '/health', { token: null })).status).toBe(401);
    expect((await call(app, 'GET', '/threads', { token: null })).status).toBe(401);
    expect((await call(app, 'GET', '/runs', { token: null })).status).toBe(401);
    expect((await call(app, 'GET', '/vault/list', { token: null })).status).toBe(401);
    expect((await call(app, 'GET', '/settings', { token: null })).status).toBe(401);
  });

  test('a client-side route falls back to the shell', async () => {
    const { app } = appWithDist();
    const res = await call(app, 'GET', '/threads-ui/abc', { token: null });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('counsel-os');
  });

  test('a write to a static path is a 404, not a 401 and not the shell', async () => {
    const { app } = appWithDist();
    const res = await call(app, 'POST', '/', { token: null });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toContain('no route for POST /');
  });

  test('without a dist directory an unknown path is still a 404', async () => {
    // Every route test above builds its app with no `distDir`; that must keep
    // behaving exactly as it did before static serving existed.
    expect((await call(appWithFake(), 'GET', '/nope')).status).toBe(404);
    expect((await call(appWithFake(), 'GET', '/', { token: null })).status).toBe(404);
  });
});

describe('API_PREFIXES', () => {
  test('covers every first path segment the router matches', () => {
    // Static serving runs BEFORE the bearer check for anything not on this
    // list, so a route added under a prefix that is missing from it would be
    // reachable with no token at all. This reads the router's own source so
    // the list cannot drift away from the routes it guards.
    const source = readFileSync(join(import.meta.dir, 'routes.ts'), 'utf8');
    const matched = [...source.matchAll(/\bfirst === '([^']+)'/g)].map(m => m[1]!);
    expect(matched.length).toBeGreaterThan(0);
    for (const segment of new Set(matched)) {
      expect(API_PREFIXES).toContain(segment);
    }
  });

  test('reserves settings, which Task 3 mounts into', () => {
    expect(API_PREFIXES).toContain('settings');
  });

  test('reserves proposals for the redesign docket', () => {
    expect(API_PREFIXES).toContain('proposals');
  });
});

describe('redesign reads (spec §4)', () => {
  test('GET /vault/overview answers matters + groups; an empty vault answers empty', async () => {
    const app = appWithFake();
    const empty = (await (await call(app, 'GET', '/vault/overview')).json()) as { matters: unknown[] };
    expect(empty.matters).toEqual([]);

    mkdirSync(join(vaultRoot, 'matters'), { recursive: true });
    writeFileSync(
      join(vaultRoot, 'matters', '2026-06-vendora.md'),
      '---\ntitle: Vendora × Worldpay\ndeadline: 2026-09-12\nnext_action: send document list\n---\nBody.\n',
    );
    mkdirSync(join(vaultRoot, 'practice'), { recursive: true });
    writeFileSync(join(vaultRoot, 'practice', 'nda.md'), '# NDA\n');
    writeFileSync(join(vaultRoot, 'note.md'), 'stray\n');

    const res = await call(app, 'GET', '/vault/overview');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      matters: Array<{ path: string; title: string; frontmatter: Record<string, string>; mtimeMs: number }>;
      groups: { practice: number; knowledge: number; other: number };
    };
    expect(body.matters.map(m => m.title)).toEqual(['Vendora × Worldpay']);
    expect(body.matters[0]!.frontmatter['next_action']).toBe('send document list');
    expect(body.groups).toEqual({ practice: 1, knowledge: 0, other: 1 });
    // API surface: no token, no answer (the same bar /proposals asserts).
    expect((await call(app, 'GET', '/vault/overview', { token: null })).status).toBe(401);
  });

  test('GET /proposals lists pending only, with thread titles; other statuses are 400', async () => {
    const app = appWithFake();
    const a = await store.create('default', { title: 'NDA residuals fallback' });
    await store.append('default', a.id, {
      t: 'proposal',
      at: '2026-08-30T10:00:00.000Z',
      id: 'p-1',
      path: 'practice/standards/nda.md',
      content: 'X',
      rationale: 'Record the fallback.',
      status: 'pending',
      expectedVersion: null,
    });
    const b = await store.create('default', { title: 'Vendora docs' });
    await store.append('default', b.id, {
      t: 'proposal',
      at: '2026-08-30T11:00:00.000Z',
      id: 'p-2',
      path: 'memory/decisions.md',
      content: 'Y',
      rationale: 'Log it.',
      status: 'approved',
      expectedVersion: null,
    });

    const res = await call(app, 'GET', '/proposals?status=pending');
    expect(res.status).toBe(200);
    const listed = (await res.json()) as Array<{ id: string; threadId: string; threadTitle: string }>;
    expect(listed.map(p => p.id)).toEqual(['p-1']);
    expect(listed[0]!.threadTitle).toBe('NDA residuals fallback');
    // Defaulting to pending is fine; anything else is not implemented.
    expect((await call(app, 'GET', '/proposals')).status).toBe(200);
    expect((await call(app, 'GET', '/proposals?status=approved')).status).toBe(400);
    // And it is API surface: no token, no answer.
    expect((await call(app, 'GET', '/proposals', { token: null })).status).toBe(401);
  });

  test('GET /vault/search runs the store search; a missing q is 400', async () => {
    writeFileSync(join(vaultRoot, 'indemnity.md'), 'The indemnity cap is 12 months.\n');
    const app = appWith([new FakeModelProvider([{ text: 'hi' }])], {
      vault: new FsVaultStore(vaultRoot, { search: fsSearch() }),
    });
    const res = await call(app, 'GET', '/vault/search?q=indemnity');
    expect(res.status).toBe(200);
    const hits = (await res.json()) as Array<{ path: string; snippet: string; score: number }>;
    expect(hits.map(h => h.path)).toEqual(['indemnity.md']);
    expect(hits[0]!.snippet).toContain('indemnity cap');
    expect((await call(app, 'GET', '/vault/search')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/search?q=')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/search?q=indemnity', { token: null })).status).toBe(401);
  });

  test('GET /proposals flags a truncated scan on a header, body still an array', async () => {
    const app = appWithFake();
    // One thread is well inside the 20-thread bound.
    const only = await store.create('default', { title: 'only' });
    await store.append('default', only.id, {
      t: 'proposal',
      at: '2026-08-30T10:00:00.000Z',
      id: 'p-1',
      path: 'practice/standards/nda.md',
      content: 'X',
      rationale: 'Record the fallback.',
      status: 'pending',
      expectedVersion: null,
    });
    const within = await call(app, 'GET', '/proposals');
    expect(within.headers.get(TRUNCATED_HEADER)).toBeNull();
    expect(await within.json()).toHaveLength(1);

    // 21 threads: the scan's bound now hides at least one, and says so.
    for (let i = 0; i < 20; i++) await store.create('default', { title: `t${i}` });
    const over = await call(app, 'GET', '/proposals');
    expect(over.status).toBe(200);
    expect(over.headers.get(TRUNCATED_HEADER)).toBe('1');
    expect(Array.isArray(await over.json())).toBe(true);
  });

  test('GET /vault/overview survives a dangling symlink in matters', async () => {
    mkdirSync(join(vaultRoot, 'matters'), { recursive: true });
    writeFileSync(join(vaultRoot, 'matters', 'acme.md'), '# Acme Corp — NDA\n');
    symlinkSync(join(vaultRoot, 'matters', 'gone.md'), join(vaultRoot, 'matters', 'dangling.md'));
    const app = appWithFake();
    const body = (await (await call(app, 'GET', '/vault/overview')).json()) as {
      matters: Array<{ title: string }>;
    };
    expect(body.matters.map(m => m.title)).toEqual(['Acme Corp — NDA']);
  });

  test('GET /vault/read carries mtimeMs', async () => {
    writeFileSync(join(vaultRoot, 'note.md'), 'A note.\n');
    const app = appWithFake();
    const body = (await (await call(app, 'GET', '/vault/read?path=note.md')).json()) as { mtimeMs: unknown };
    expect(typeof body.mtimeMs).toBe('number');
  });
});

describe('vault index (cou-93 item 8)', () => {
  test('lists every file path, flat, through the same listing the tree uses', async () => {
    const app = appWithFake();
    await vault.write('default', 'matters/acme/notes.md', 'NOTES\n');
    await vault.write('default', 'practice/standards/nda.md', '# NDA\n');
    const res = await call(app, 'GET', '/vault/index');
    expect(res.status).toBe(200);
    const paths = (await res.json()) as string[];
    expect(paths).toContain('matters/acme/notes.md');
    expect(paths).toContain('practice/standards/nda.md');
    // Files only — a directory is not a thing an answer cites.
    expect(paths).not.toContain('matters');
    expect(paths).not.toContain('matters/acme');
    // The store's own bookkeeping never appears.
    expect(paths.some(p => p.toLowerCase().startsWith('.counsel'))).toBe(false);
  });
});

describe('docket', () => {
  test('GET /docket sweeps deadlines off the matter files, dated and classified; malformed dates are counted', async () => {
    const app = appWithFake();
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const soonIso = soon.toISOString().slice(0, 10);
    await vault.write(
      'default',
      'matters/acme.md',
      `---\ntitle: Acme — NDA\ndeadlines:\n  - date: 2020-01-01\n    action: long gone\n  - date: ${soonIso}\n    action: renewal notice\n    type: renewal\n  - date: nope\n    action: bad\n---\n\nBody.\n`,
    );
    await vault.write('default', 'matters/vendora.md', '---\ndeadline: 2099-12-31\nnext_action: send document list\n---\n\n# Vendora\n');
    await vault.write('default', 'matters/quiet.md', '---\nstage: working\n---\n\n# Quiet\n');

    const res = await call(app, 'GET', '/docket');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deadlines: Array<Record<string, unknown>>; skipped: number };
    expect(body.skipped).toBe(1);
    expect(body.deadlines.map(d => [d['date'], d['status'], (d['matter'] as { title: string }).title])).toEqual([
      ['2020-01-01', 'overdue', 'Acme — NDA'],
      [soonIso, 'soon', 'Acme — NDA'],
      ['2099-12-31', 'later', 'Vendora'],
    ]);
    expect(body.deadlines[2]!['action']).toBe('send document list');
    // API surface: no token, no answer.
    expect((await call(app, 'GET', '/docket', { token: null })).status).toBe(401);
    expect(API_PREFIXES).toContain('docket');
  });

  test('GET /docket on a vault with no matters dir is an empty docket, not an error', async () => {
    const app = appWithFake();
    const res = await call(app, 'GET', '/docket');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deadlines: [], skipped: 0 });
  });
});

describe('PATCH /threads/:id (rename + matter link)', () => {
  test('renames, trims, and returns the presented header; updatedAt is unchanged', async () => {
    const app = appWithFake();
    const id = await newThread(app);
    const before = (await (await call(app, 'GET', `/threads/${id}`)).json()) as { header: { updatedAt: string } };
    const res = await call(app, 'PATCH', `/threads/${id}`, { body: { title: '  Acme — residuals  ' } });
    expect(res.status).toBe(200);
    const header = (await res.json()) as { id: string; title?: string; updatedAt: string };
    expect(header.title).toBe('Acme — residuals');
    expect(header.updatedAt).toBe(before.header.updatedAt);
  });

  test('links a matter, then unlinks it with null', async () => {
    const app = appWithFake();
    const id = await newThread(app);
    const linked = (await (await call(app, 'PATCH', `/threads/${id}`, { body: { matter: 'matters/acme.md' } })).json()) as { matter?: string };
    expect(linked.matter).toBe('matters/acme.md');
    const unlinked = (await (await call(app, 'PATCH', `/threads/${id}`, { body: { matter: null } })).json()) as { matter?: string };
    expect(unlinked.matter).toBeUndefined();
  });

  test('404 on an unknown thread, 400 on a bad body', async () => {
    const app = appWithFake();
    expect((await call(app, 'PATCH', `/threads/${randomUUID()}`, { body: { title: 'x' } })).status).toBe(404);
    const id = await newThread(app);
    expect((await call(app, 'PATCH', `/threads/${id}`, { body: { title: 42 } })).status).toBe(400);
    expect((await call(app, 'PATCH', `/threads/${id}`, { body: {} })).status).toBe(400);
    expect((await call(app, 'PATCH', `/threads/${id}`, { body: { sessions: {} } })).status).toBe(400);
    // A matter must be a vault-relative path.
    expect((await call(app, 'PATCH', `/threads/${id}`, { body: { matter: '../etc/passwd' } })).status).toBe(400);
    expect((await call(app, 'PATCH', `/threads/${id}`, { body: { matter: '/abs.md' } })).status).toBe(400);
    expect((await call(app, 'PATCH', `/threads/${id}`, { body: { matter: '.counsel/threads/x.json' } })).status).toBe(400);
  });
});

describe('Word documents (docx read path, stage 1)', () => {
  const AT = '2026-08-28T10:00:00Z';
  function plant(rel: string, bytes: Uint8Array): void {
    mkdirSync(join(vaultRoot, rel.slice(0, rel.lastIndexOf('/'))), { recursive: true });
    writeFileSync(join(vaultRoot, rel), bytes);
  }

  test('GET /vault/read on a .docx converts it — markdown with inline changes, never the bytes', async () => {
    const app = appWithFake();
    plant(
      'matters/acme/nda.docx',
      buildDocx({
        blocks: [{ style: 'Title', runs: ['Mutual NDA'] }, { runs: ['Term: ', { text: 'two', del: { author: 'R', date: AT } }, { text: 'one', ins: { author: 'R', date: AT } }, ' year.', { drawing: true }] }],
      }),
    );
    const res = await call(app, 'GET', '/vault/read?path=matters/acme/nda.docx');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { path: string; kind: string; content: string; version: string | null; warnings: string[] };
    expect(body.kind).toBe('docx');
    expect(body.content).toBe('# Mutual NDA\n\nTerm: {--two--}{++one++} year.\n');
    expect(body.content).not.toContain('PK');
    expect(body.version).toBeTruthy();
    expect(body.warnings).toEqual(['body[1]: a drawing was left out']);
  });

  test('a text file now says kind: text (additive)', async () => {
    const app = appWithFake();
    await vault.write('default', 'matters/acme/notes.md', 'NOTES\n');
    const body = (await (await call(app, 'GET', '/vault/read?path=matters/acme/notes.md')).json()) as { kind: string; content: string };
    expect(body).toMatchObject({ kind: 'text', content: 'NOTES\n' });
  });

  test('a .docx with a DOCTYPE part is 422 naming the part; a non-zip .docx is 415', async () => {
    const app = appWithFake();
    const hostile = '<?xml version="1.0"?><!DOCTYPE d [ <!ENTITY x SYSTEM "file:///etc/hostname"> ]><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>&x;</w:t></w:r></w:p></w:body></w:document>';
    plant('matters/acme/bad.docx', buildDocx({ blocks: [{ runs: ['x'] }], rawParts: { 'word/document.xml': hostile } }));
    const res = await call(app, 'GET', '/vault/read?path=matters/acme/bad.docx');
    expect(res.status).toBe(422);
    const err = (await res.json()) as { error: string };
    expect(err.error).toContain('word/document.xml');
    expect(err.error).not.toContain('hostname');

    plant('matters/acme/fake.docx', new TextEncoder().encode('%PDF-1.4 not a zip'));
    expect((await call(app, 'GET', '/vault/read?path=matters/acme/fake.docx')).status).toBe(415);
  });

  test('GET /vault/download streams the bytes with the right headers, under the same path guards', async () => {
    const app = appWithFake();
    const bytes = buildDocx({ blocks: [{ runs: ['hello'] }] });
    plant('matters/acme/Acme × NDA.docx', bytes);
    const res = await call(app, 'GET', `/vault/download?path=${encodeURIComponent('matters/acme/Acme × NDA.docx')}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="Acme _ NDA.docx"; filename*=UTF-8''${encodeURIComponent('Acme × NDA.docx')}`);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(Buffer.from(await res.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);

    await vault.write('default', 'matters/acme/notes.md', 'NOTES\n');
    const md = await call(app, 'GET', '/vault/download?path=matters/acme/notes.md');
    expect(md.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await md.text()).toBe('NOTES\n');

    expect((await call(app, 'GET', '/vault/download?path=../x')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/download?path=.counsel/threads')).status).toBe(400);
    expect((await call(app, 'GET', '/vault/download?path=matters/none.docx')).status).toBe(404);
    expect((await call(app, 'GET', '/vault/download')).status).toBe(400);
  });

  test('download needs the token like every vault route', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', '/vault/download?path=matters/acme/notes.md', { token: null })).status).toBe(401);
    expect((await call(app, 'GET', '/vault/download?path=matters/acme/notes.md', { token: 'wrong' })).status).toBe(401);
  });
});
