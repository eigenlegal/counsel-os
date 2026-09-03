import { beforeEach, describe, expect, test } from 'bun:test';
import { readWritten } from '../outcomes/written';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { readRoutingPolicy, writeRoutingPolicy } from '../router/policy';
import { Router } from '../router/router';
import { ThreadStore, type ThreadEvent } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { fsSearch } from '../vault/search';
import { memoryStore } from '../providers/secrets';
import { readOutcomes } from '../outcomes/store';
import { buildDocx } from '../docx/test/builder';
import { API_PREFIXES, createApp, safeBasename, suffixed, TRUNCATED_HEADER, UPLOAD_MAX_BYTES, type App, type ServerDeps } from './routes';
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
  // The retro method is shipped content too (`retro/`): a retro step reads it.
  mkdirSync(join(pluginRoot, 'skills', 'retro'), { recursive: true });
  writeFileSync(join(pluginRoot, 'skills', 'retro', 'SKILL.md'), '---\nname: retro\n---\n# Retro\n\nStep 6: harvest promotable knowledge.\n', 'utf8');
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

  test('an approved proposal into a matter is recorded as counsel\'s version of that file (spec §7, lawyer edits)', async () => {
    const app = appWithFake([
      { toolCalls: [{ name: 'propose_update', input: { path: 'matters/acme/notes.md', content: 'NOTE\n', rationale: 'log it' } }], text: 'proposed' },
    ]);
    const { threadId, proposalId } = await seedProposal(app);
    const res = await call(app, 'POST', `/threads/${threadId}/approve`, { body: { proposalId, decision: 'approve' } });
    expect(res.status).toBe(200);
    const entry = readWritten(vaultRoot).files['matters/acme/notes.md'];
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('proposal');
    expect(entry!.threadId).toBe(threadId);
  });

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

describe('POST /vault/upload and /vault/move (docx intake, stage 1 step 3)', () => {
  const AT = '2026-08-28T10:00:00Z';
  function upload(app: App, name: string, bytes: Uint8Array, dest?: string, token: string | null = TOKEN): Promise<Response> {
    const form = new FormData();
    form.set('file', new File([bytes], name, { type: 'application/octet-stream' }));
    if (dest !== undefined) form.set('dest', dest);
    const headers: Record<string, string> = {};
    if (token !== null) headers['authorization'] = `Bearer ${token}`;
    return app(new Request('http://127.0.0.1:7431/vault/upload', { method: 'POST', headers, body: form }));
  }
  const nda = () => buildDocx({ blocks: [{ runs: ['Term: ', { text: 'two', del: { author: 'R', date: AT } }, { text: 'one', ins: { author: 'R', date: AT } }] }] });

  test('lands in matters/inbox by default, never overwrites, and reads back converted', async () => {
    const app = appWithFake();
    const first = await upload(app, 'Acme NDA v3.docx', nda());
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({ path: 'matters/inbox/Acme NDA v3.docx', size: nda().byteLength });
    const second = await upload(app, 'Acme NDA v3.docx', nda());
    expect((await second.json()) as { path: string }).toMatchObject({ path: 'matters/inbox/Acme NDA v3-2.docx' });
    const third = await upload(app, 'Acme NDA v3.docx', nda());
    expect((await third.json()) as { path: string }).toMatchObject({ path: 'matters/inbox/Acme NDA v3-3.docx' });
    const read = (await (await call(app, 'GET', `/vault/read?path=${encodeURIComponent('matters/inbox/Acme NDA v3.docx')}`)).json()) as { kind: string; content: string };
    expect(read.kind).toBe('docx');
    expect(read.content).toContain('{--two--}{++one++}');
    expect(readFileSync(join(vaultRoot, 'matters/inbox/Acme NDA v3.docx')).byteLength).toBe(nda().byteLength);
  });

  test('a matter folder as dest; a path outside matters/, an escape, or the runtime dir is 400', async () => {
    const app = appWithFake();
    const ok = await upload(app, 'nda.docx', nda(), 'matters/acme');
    expect(ok.status).toBe(201);
    expect((await ok.json()) as { path: string }).toMatchObject({ path: 'matters/acme/nda.docx' });
    for (const dest of ['practice/standards', '../x', 'matters/../practice', '.counsel', 'mattersx']) {
      const res = await upload(app, 'nda.docx', nda(), dest);
      expect(res.status).toBe(400);
    }
  });

  test('the filename is reduced to a safe basename', async () => {
    const app = appWithFake();
    const res = await upload(app, '../../evil/..secret:ver|sion?.docx', nda());
    expect(res.status).toBe(201);
    expect((await res.json()) as { path: string }).toMatchObject({ path: 'matters/inbox/secret_ver_sion_.docx' });
    expect(safeBasename('')).toBe('document');
    expect(suffixed('a.b.docx', 2)).toBe('a.b-2.docx');
    expect(suffixed('noext', 3)).toBe('noext-3');
  });

  test('only .docx (415), a non-Word .docx (415), a DOCTYPE part (422), over the cap (413)', async () => {
    const app = appWithFake();
    expect((await upload(app, 'Acme-NDA.pages', nda())).status).toBe(415);
    const pdf = await upload(app, 'scan.pdf', new TextEncoder().encode('%PDF-1.4'));
    expect(pdf.status).toBe(415);
    expect(((await pdf.json()) as { error: string }).error).toContain('only Word documents (.docx)');
    expect((await upload(app, 'fake.docx', new TextEncoder().encode('not a zip'))).status).toBe(415);
    const hostile = '<?xml version="1.0"?><!DOCTYPE hdr [ <!ENTITY x SYSTEM "file:///etc/hostname"> ]><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>&x;</w:t></w:r></w:p></w:hdr>';
    const bad = await upload(app, 'bad.docx', buildDocx({ blocks: [{ runs: ['x'] }], rawParts: { 'word/header1.xml': hostile } }));
    expect(bad.status).toBe(422);
    expect(((await bad.json()) as { error: string }).error).toContain('word/header1.xml');
    expect(existsSync(join(vaultRoot, 'matters/inbox/bad.docx'))).toBe(false);
    const big = new Uint8Array(UPLOAD_MAX_BYTES + 1);
    expect((await upload(app, 'big.docx', big)).status).toBe(413);
    expect((await upload(app, 'nda.docx', nda(), undefined, null)).status).toBe(401);
    const noFile = await app(new Request('http://127.0.0.1:7431/vault/upload', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: new FormData() }));
    expect(noFile.status).toBe(400);
  });

  test('move: inbox → a matter folder, never overwriting; outside matters/ is 400; missing is 404', async () => {
    const app = appWithFake();
    await upload(app, 'nda.docx', nda());
    await upload(app, 'nda.docx', nda(), 'matters/acme');
    const moved = await call(app, 'POST', '/vault/move', { body: { from: 'matters/inbox/nda.docx', to: 'matters/acme' } });
    expect(moved.status).toBe(200);
    expect(await moved.json()).toEqual({ path: 'matters/acme/nda-2.docx' });
    expect(existsSync(join(vaultRoot, 'matters/inbox/nda.docx'))).toBe(false);
    expect(existsSync(join(vaultRoot, 'matters/acme/nda-2.docx'))).toBe(true);
    expect((await call(app, 'POST', '/vault/move', { body: { from: 'practice/standards/nda.md', to: 'matters/acme' } })).status).toBe(400);
    expect((await call(app, 'POST', '/vault/move', { body: { from: 'matters/acme/nda.docx', to: 'practice' } })).status).toBe(400);
    expect((await call(app, 'POST', '/vault/move', { body: { from: 'matters/inbox/none.docx', to: 'matters/acme' } })).status).toBe(404);
    expect((await call(app, 'POST', '/vault/move', { body: { from: '' } })).status).toBe(400);
  });
});

describe('content updates and doctor (spec 2026-09-01 §6–§7)', () => {
  const LAW = '---\ncounsel-os-type: law-area\nlast-reviewed: "2026-06-11"\n---\n# GDPR\n\n72 hours.\n';

  /** A plugin root that ships one law file and one standard, and a vault
   * seeded from it by hand with the content state `runSetup` would write. */
  function seed(): { shippedGdpr: string } {
    const shippedGdpr = join(pluginRoot, 'knowledge', 'law', 'data-privacy', 'gdpr.md');
    mkdirSync(join(pluginRoot, 'knowledge', 'law', 'data-privacy'), { recursive: true });
    writeFileSync(shippedGdpr, LAW, 'utf8');
    mkdirSync(join(pluginRoot, 'knowledge', 'practice-seed', 'standards'), { recursive: true });
    writeFileSync(join(pluginRoot, 'knowledge', 'practice-seed', 'standards', 'confidentiality.md'), '# Conf\n\n## Our Position\n**Our standard:** 3 years.\n', 'utf8');
    mkdirSync(join(vaultRoot, 'law', 'data-privacy'), { recursive: true });
    writeFileSync(join(vaultRoot, 'law', 'data-privacy', 'gdpr.md'), LAW, 'utf8');
    mkdirSync(join(vaultRoot, 'practice', 'standards'), { recursive: true });
    writeFileSync(join(vaultRoot, 'practice', 'standards', 'confidentiality.md'), '# Conf\n\n## Our Position\n**Our standard:** 5 years.\n', 'utf8');
    writeFileSync(join(vaultRoot, 'config.md'), `counsel-os-config: true\nlegal_root: ${vaultRoot}\n`, 'utf8');
    mkdirSync(join(vaultRoot, '.counsel'), { recursive: true });
    const hash = (text: string): string => createHash('sha256').update(text.replace(/^---[ \t]*\n[\s\S]*?\n---[ \t]*\n/, ''), 'utf8').digest('hex');
    writeFileSync(
      join(vaultRoot, '.counsel', 'content-state.json'),
      JSON.stringify({ version: '0.0.1', receivedAt: '2026-08-01T00:00:00.000Z', files: { 'law/data-privacy/gdpr.md': { hash: hash(LAW), from: 'knowledge/law/data-privacy/gdpr.md' }, 'practice/standards/confidentiality.md': { hash: hash('# Conf\n\n## Our Position\n**Our standard:** 3 years.\n'), from: 'knowledge/practice-seed/standards/confidentiality.md' } } }),
      'utf8',
    );
    return { shippedGdpr };
  }

  test('GET /content/status classifies; an upstream law change is update-available, the edited standard is current', async () => {
    const { shippedGdpr } = seed();
    const app = appWithFake();
    let res = await call(app, 'GET', '/content/status');
    expect(res.status).toBe(200);
    let status = (await res.json()) as { items: Array<{ path: string; status: string }>; vaultVersion: string; counts: Record<string, number> };
    expect(status.vaultVersion).toBe('0.0.1');
    expect(status.items.map(i => [i.path, i.status])).toEqual([
      ['law/data-privacy/gdpr.md', 'current'],
      ['practice/standards/confidentiality.md', 'current'],
    ]);

    writeFileSync(shippedGdpr, LAW + 'Upstream note.\n', 'utf8');
    res = await call(app, 'GET', '/content/status');
    status = (await res.json()) as typeof status;
    expect(status.items[0]).toMatchObject({ path: 'law/data-privacy/gdpr.md', status: 'update-available' });
    expect(status.counts['update-available']).toBe(1);
  });

  test('POST /content/apply writes an applicable path and refuses everything else with a 400', async () => {
    const { shippedGdpr } = seed();
    writeFileSync(shippedGdpr, LAW + 'Upstream note.\n', 'utf8');
    const app = appWithFake();
    const bad = await call(app, 'POST', '/content/apply', { body: { paths: ['practice/standards/confidentiality.md'] } });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { paths: string[] }).paths).toEqual(['practice/standards/confidentiality.md']);
    expect((await call(app, 'POST', '/content/apply', { body: { paths: [] } })).status).toBe(400);

    const ok = await call(app, 'POST', '/content/apply', { body: { paths: ['law/data-privacy/gdpr.md'] } });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { applied: string[] }).applied).toEqual(['law/data-privacy/gdpr.md']);
    expect(readFileSync(join(vaultRoot, 'law', 'data-privacy', 'gdpr.md'), 'utf8')).toBe(LAW + 'Upstream note.\n');
    const after = (await (await call(app, 'GET', '/content/status')).json()) as { items: Array<{ status: string }> };
    expect(after.items[0]!.status).toBe('current');
  });

  test('GET /doctor runs the vault checks read-only and reports a verdict', async () => {
    seed();
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { git: null });
    const res = await call(app, 'GET', '/doctor');
    expect(res.status).toBe(200);
    const report = (await res.json()) as { findings: Array<{ check: string; severity: string }>; verdict: string; vault: string };
    expect(report.vault).toBe(vaultRoot);
    expect(report.findings.map(f => f.check)).toEqual(['root-config', 'structure', 'law-currency', 'git', 'consistency', 'law-impact', 'edits-after-counsel']);
    expect(report.findings[0]!.severity).toBe('ok');
    expect(report.findings.find(f => f.check === 'git')!.severity).toBe('warn');
    expect(['warnings', 'broken']).toContain(report.verdict);
    // Nothing was written.
    expect(readFileSync(join(vaultRoot, 'law', 'data-privacy', 'gdpr.md'), 'utf8')).toBe(LAW);
  });

  test('both prefixes need the token', async () => {
    seed();
    const app = appWithFake();
    expect((await call(app, 'GET', '/content/status', { token: null })).status).toBe(401);
    expect((await call(app, 'GET', '/doctor', { token: null })).status).toBe(401);
  });
});

describe('the session cookie', () => {
  const cookie = (token: string): string => `counsel_session=${token}`;

  test('a bearer-authenticated response signs the browser in; a cookie-authenticated one sets nothing new', async () => {
    const app = appWithFake();
    const first = await call(app, 'GET', '/health');
    expect(first.status).toBe(200);
    expect(first.headers.get('set-cookie')).toBe(`counsel_session=${TOKEN}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict`);

    const again = await app(new Request('http://127.0.0.1:7431/health', { headers: { cookie: cookie(TOKEN), 'sec-fetch-site': 'same-origin' } }));
    expect(again.status).toBe(200);
    expect(again.headers.get('set-cookie')).toBeNull();
  });

  test('a wrong cookie, or the right one from another site, is 401; a static path never gets a cookie', async () => {
    const app = appWithFake();
    const wrong = await app(new Request('http://127.0.0.1:7431/threads', { headers: { cookie: cookie('nope'), 'sec-fetch-site': 'same-origin' } }));
    expect(wrong.status).toBe(401);
    // Another local tool's page on 127.0.0.1:8080 — same-site, so a Strict
    // cookie would ride along; the origin rule is what keeps it out.
    const elsewhere = await app(new Request('http://127.0.0.1:7431/threads', { headers: { cookie: cookie(TOKEN), 'sec-fetch-site': 'same-site', origin: 'http://127.0.0.1:8080', host: '127.0.0.1:7431' } }));
    expect(elsewhere.status).toBe(401);
    const unauth = await call(app, 'GET', '/threads', { token: null });
    expect(unauth.status).toBe(401);
    expect(unauth.headers.get('set-cookie')).toBeNull();
  });

  test('a cookie is good for the whole API, the step stream included', async () => {
    const app = appWithFake([{ text: 'hello there' }]);
    const created = await app(new Request('http://127.0.0.1:7431/threads', { method: 'POST', headers: { cookie: cookie(TOKEN), 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: '{}' }));
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const res = await app(new Request(`http://127.0.0.1:7431/threads/${id}/steps`, { method: 'POST', headers: { cookie: cookie(TOKEN), 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hi' }) }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    await res.text();
  });

  test('POST /session/clear signs this browser out and needs a credential itself', async () => {
    const app = appWithFake();
    const res = await app(new Request('http://127.0.0.1:7431/session/clear', { method: 'POST', headers: { cookie: cookie(TOKEN), 'sec-fetch-site': 'same-origin' } }));
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toBe('counsel_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');
    expect((await call(app, 'POST', '/session/clear', { token: null })).status).toBe(401);
    // Signing out from a tab that still holds the bearer must not re-sign
    // the browser in on the way out: one Set-Cookie, the clearing one.
    const viaBearer = await call(app, 'POST', '/session/clear');
    expect(viaBearer.status).toBe(204);
    expect(viaBearer.headers.getSetCookie()).toEqual(['counsel_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict']);
  });
});

describe('retro (skills/retro in the runtime)', () => {
  test('GET /retro says whether one is due; POST /retro opens the thread and records it', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', '/retro', { token: null })).status).toBe(401);

    const before = (await (await call(app, 'GET', '/retro')).json()) as { due: boolean; lastRetroAt: string | null; cadenceDays: number };
    expect(before).toMatchObject({ due: false, lastRetroAt: null, cadenceDays: 90 });

    // Three matters make a first retro worth running.
    for (const n of ['a', 'b', 'c']) await vault.write('default', `matters/${n}.md`, `---\ncounsel-os-type: matter\n---\n# ${n}\n`);
    expect(((await (await call(app, 'GET', '/retro')).json()) as { due: boolean }).due).toBe(true);

    expect((await call(app, 'POST', '/retro', { body: { since: 'not a date' } })).status).toBe(400);

    const res = await call(app, 'POST', '/retro', { body: { since: '2026-06-01' } });
    expect(res.status).toBe(201);
    const start = (await res.json()) as { threadId: string; title: string; message: string; period: { from: string | null }; status: { due: boolean; threadId: string } };
    expect(start.title).toMatch(/^Retro · 2026-06-01 to \d{4}-\d{2}-\d{2}$/);
    expect(start.period.from).toBe('2026-06-01T00:00:00.000Z');
    expect(start.message).toContain('as a proposal');
    expect(start.status).toMatchObject({ due: false, threadId: start.threadId });

    const header = (await store.list('default')).find(h => h.id === start.threadId)!;
    expect(header.task).toBe('retro');
    expect(header.title).toBe(start.title);
    expect(existsSync(join(vaultRoot, '.counsel', 'retro.json'))).toBe(true);
  });

  test('a step on the retro thread runs as the retro task, with the method and the evidence in its prompt', async () => {
    const provider = new FakeModelProvider([{ text: 'Running in harvest mode.' }]);
    const app = appWith([provider]);
    const { threadId, message } = (await (await call(app, 'POST', '/retro', { body: {} })).json()) as { threadId: string; message: string };
    const res = await call(app, 'POST', `/threads/${threadId}/steps`, { body: { message } });
    expect(res.status).toBe(200);
    await res.text();
    const { events } = await store.get('default', threadId);
    const step = events.find(ev => 't' in ev && ev.t === 'step') as { task?: string } | undefined;
    expect(step?.task).toBe('retro');
    // The caller named no task; the thread did — and the prompt carries the
    // method and the record, with every write re-stated as a proposal.
    const system = provider.lastRequest?.system ?? '';
    expect(system).toContain('## Retro method');
    expect(system).toContain('propose_update');
    expect(system).toContain('## Retro evidence (from the runtime)');
    expect(system).toContain('Period: all time to');
  });
});

describe('matter privacy policy over HTTP (providers spec §7)', () => {
  const localCaps: Capabilities = { tools: true, caching: false, thinking: false, contextTokens: 1_000_000, auth: 'local' };
  function cloudFake(id: string): ModelProvider {
    const fake = new FakeModelProvider([{ text: 'cloud' }]);
    return { id, kind: 'direct', capabilities: { ...localCaps, auth: 'apikey' }, run: req => fake.run(req) };
  }
  function localFake(id: string): ModelProvider {
    const fake = new FakeModelProvider([{ text: 'local' }]);
    return { id, kind: 'direct', capabilities: localCaps, run: req => fake.run(req) };
  }

  test('GET /threads/:id carries the policy its explicit matter implies', async () => {
    const app = appWith([cloudFake('anthropic/c'), localFake('ollama/l')]);
    await vault.write('default', 'matters/acme.md', '---\nstays_local: true\n---\n# Acme\n');
    const id = await newThread(app);
    let body = (await (await call(app, 'GET', `/threads/${id}`)).json()) as { policy: unknown };
    expect(body.policy).toEqual({ localOnly: false, source: 'none' });
    expect((await call(app, 'PATCH', `/threads/${id}`, { body: { matter: 'matters/acme.md' } })).status).toBe(200);
    body = (await (await call(app, 'GET', `/threads/${id}`)).json()) as { policy: unknown };
    expect(body.policy).toEqual({ localOnly: true, source: 'matter' });
  });

  test('a cloud provider named for a stays-local matter is a 409 before anything streams', async () => {
    const app = appWith([cloudFake('anthropic/c'), localFake('ollama/l')]);
    await vault.write('default', 'matters/acme.md', '---\nstays_local: true\n---\n# Acme\n');
    const id = await newThread(app);
    await call(app, 'PATCH', `/threads/${id}`, { body: { matter: 'matters/acme.md' } });
    const res = await call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'hi', provider: 'anthropic/c' } });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'matter-stays-local', message: 'This matter stays on this machine; anthropic/c is not a local model.' });
    const { events } = (await (await call(app, 'GET', `/threads/${id}`)).json()) as { events: unknown[] };
    expect(events).toHaveLength(0);
  });

  test('no local provider loaded is the founder\'s sentence, 409', async () => {
    const app = appWith([cloudFake('anthropic/c')]);
    await vault.write('default', 'matters/acme.md', '---\nstays_local: true\n---\n# Acme\n');
    const id = await newThread(app);
    await call(app, 'PATCH', `/threads/${id}`, { body: { matter: 'matters/acme.md' } });
    const res = await call(app, 'POST', `/threads/${id}/steps`, { body: { message: 'hi' } });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { message: string }).message).toBe('This matter stays on this machine, and no local model is loaded.');
  });

  test('with a local provider the step streams on it', async () => {
    const app = appWith([cloudFake('anthropic/c'), localFake('ollama/l')]);
    await vault.write('default', 'matters/acme.md', '---\nstays_local: true\n---\n# Acme\n');
    const id = await newThread(app);
    await call(app, 'PATCH', `/threads/${id}`, { body: { matter: 'matters/acme.md' } });
    const { res } = await step(app, id, { message: 'hi' });
    expect(res.status).toBe(200);
    const { events } = (await (await call(app, 'GET', `/threads/${id}`)).json()) as { events: Array<Record<string, unknown>> };
    expect(events.find(e => e['t'] === 'step')?.['provider']).toBe('ollama/l');
  });
});

describe('providers carry their locality and handles (providers spec §6)', () => {
  test('/health and /settings say where the text goes and who receives it', async () => {
    const app = appWithFake();
    const health = (await (await call(app, 'GET', '/health')).json()) as { providers: Array<{ id: string; locality: string; handles: { company: string; termsUrl: string } | null }> };
    const fake = health.providers.find(p => p.id === 'fake/fake')!;
    // The fake provider runs in this process: local, nobody receives the text.
    expect(fake.locality).toBe('local');
    expect(fake.handles).toBeNull();
    const claude = health.providers.find(p => p.id.startsWith('claude-sub/'));
    if (claude !== undefined) {
      expect(claude.locality).toBe('cloud');
      expect(claude.handles?.company).toBe('Anthropic');
      expect(claude.handles?.termsUrl.startsWith('https://')).toBe(true);
    }
    const settings = (await (await call(app, 'GET', '/settings')).json()) as { effective: { providers: Array<{ id: string; locality: string }> } };
    expect(settings.effective.providers.find(p => p.id === 'fake/fake')?.locality).toBe('local');
  });
});

describe('model discovery (providers spec §4)', () => {
  const listing = { object: 'list', data: [{ id: 'gpt-5.6' }, { id: 'gpt-5.6-mini' }] };
  function recording(body: unknown = listing): { fetch: typeof fetch; urls: string[] } {
    const urls: string[] = [];
    const f = (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    return { fetch: f, urls };
  }

  test('a keyed vendor with no key is a sentence, and the vendor is never called', async () => {
    const rec = recording();
    // An empty environment on purpose: the developer's own OPENAI_API_KEY
    // must never turn a route test into a real request.
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { discovery: { fetch: rec.fetch, env: {} } });
    const res = await call(app, 'GET', '/providers/openai/models');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ models: [], source: 'list', error: 'No key for OpenAI yet.' });
    expect(rec.urls).toEqual([]);
  });

  test('with a key in the environment: the vendor lists; a full id resolves its vendor; the cache holds until ?refresh=1', async () => {
    const rec = recording();
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { discovery: { fetch: rec.fetch, env: { OPENAI_API_KEY: 'sk-t' } } });
    const first = await (await call(app, 'GET', '/providers/openai/models')).json();
    expect(first).toEqual({ models: [{ id: 'gpt-5.6' }, { id: 'gpt-5.6-mini' }], source: 'list' });
    // A full id (with its own slash) names the same vendor and hits the cache.
    const byId = await (await call(app, 'GET', '/providers/openai%2Fgpt-5.6/models')).json();
    expect(byId).toEqual(first);
    const again = await (await call(app, 'GET', '/providers/openai/gpt-5.6/models')).json();
    expect(again).toEqual(first);
    expect(rec.urls).toEqual(['https://api.openai.com/v1/models']);
    await call(app, 'GET', '/providers/openai/models?refresh=1');
    expect(rec.urls).toHaveLength(2);
  });

  test("a registry entry's apiKeyEnv and baseURL win over the vendor's defaults", async () => {
    const rec = recording({ data: [{ id: 'local-model' }] });
    const file = join(mkdtempSync(join(tmpdir(), 'routes-disc-')), 'providers.yaml');
    writeFileSync(file, 'providers:\n  - id: openai-compatible/mine\n    baseURL: http://127.0.0.1:1234/v1\n    apiKeyEnv: MY_KEY\n');
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { settings: { file, reload: () => {} }, discovery: { fetch: rec.fetch, env: { MY_KEY: 'k' } } });
    const res = await (await call(app, 'GET', '/providers/openai-compatible%2Fmine/models')).json();
    expect(res).toEqual({ models: [{ id: 'local-model' }], source: 'list' });
    expect(rec.urls).toEqual(['http://127.0.0.1:1234/v1/models']);
  });

  test('?baseURL= reaches a local runner and is held to the base-URL rule', async () => {
    const rec = recording({ models: [{ name: 'gemma4:e4b' }] });
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { discovery: { fetch: rec.fetch, env: {} } });
    const ok = await (await call(app, 'GET', '/providers/ollama/models?baseURL=http%3A%2F%2F127.0.0.1%3A11435')).json();
    expect(ok).toEqual({ models: [{ id: 'gemma4:e4b' }], source: 'list' });
    expect(rec.urls).toEqual(['http://127.0.0.1:11435/api/tags']);
    expect((await call(app, 'GET', '/providers/ollama/models?baseURL=http%3A%2F%2Fevil.example%2Fv1')).status).toBe(400);
  });

  test('a curated vendor answers from the catalog; an unknown prefix is 404; no token is 401', async () => {
    const rec = recording();
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { discovery: { fetch: rec.fetch, env: {} } });
    const curated = (await (await call(app, 'GET', '/providers/perplexity/models')).json()) as { source: string; models: Array<{ id: string }> };
    expect(curated.source).toBe('curated');
    expect(curated.models.map((m: { id: string }) => m.id)).toContain('sonar');
    expect(rec.urls).toEqual([]);
    expect((await call(app, 'GET', '/providers/nope/models')).status).toBe(404);
    expect((await call(app, 'GET', '/providers/openai/models', { token: null })).status).toBe(401);
  });
});

describe('model discovery reads the secret store first (providers spec §5)', () => {
  test('a key set only in the store makes the listing call the vendor instead of answering "No key … yet"', async () => {
    const urls: string[] = [];
    const seen: { auth: string | null } = { auth: null };
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      urls.push(String(input));
      seen.auth = new Headers(init?.headers).get('authorization');
      return new Response(JSON.stringify({ data: [{ id: 'gpt-5.6' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const file = join(mkdtempSync(join(tmpdir(), 'routes-disc-key-')), 'providers.yaml');
    writeFileSync(file, 'providers:\n  - id: openai/gpt-5.6\n');
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], {
      settings: { file, reload: () => {}, secrets: memoryStore({ 'openai/gpt-5.6': 'sk-from-store' }) },
      discovery: { fetch: f, env: {} },
    });
    const res = await (await call(app, 'GET', '/providers/openai/models')).json();
    expect(res).toEqual({ models: [{ id: 'gpt-5.6' }], source: 'list' });
    expect(urls).toEqual(['https://api.openai.com/v1/models']);
    expect(seen.auth).toBe('Bearer sk-from-store');
  });
});

describe('GET /providers/:id/models for an enterprise vendor (providers spec §3 step 5)', () => {
  function capture(body: unknown): { fetch: typeof fetch; requests: Request[] } {
    const requests: Request[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(input instanceof Request ? input : new Request(String(input), init));
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    return { fetch: f, requests };
  }

  test('bedrock with no credentials answers the curated list without a request; the row’s region rides in the query', async () => {
    const rec = capture({ modelSummaries: [] });
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { discovery: { fetch: rec.fetch, env: {} }, settings: { file: join(mkdtempSync(join(tmpdir(), 'routes-ent-')), 'providers.yaml'), reload: () => {}, home: mkdtempSync(join(tmpdir(), 'routes-ent-home-')) } });
    const res = await call(app, 'GET', '/providers/bedrock/models?region=us-west-2');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { source: string; models: unknown[] };
    expect(body.source).toBe('curated');
    expect(body.models.length).toBeGreaterThan(0);
    expect(rec.requests).toEqual([]);
  });

  test('bedrock with AWS keys in the environment signs a listing for the row’s region; azure lists its deployments with the stored key', async () => {
    const rec = capture({ modelSummaries: [{ modelId: 'amazon.nova-pro-v1:0', outputModalities: ['TEXT'], inferenceTypesSupported: ['ON_DEMAND'] }] });
    const home = mkdtempSync(join(tmpdir(), 'routes-ent-home-'));
    const file = join(mkdtempSync(join(tmpdir(), 'routes-ent-')), 'providers.yaml');
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { discovery: { fetch: rec.fetch, env: { AWS_ACCESS_KEY_ID: 'AKIA-r', AWS_SECRET_ACCESS_KEY: 's-r' } }, settings: { file, reload: () => {}, home } });
    const body = (await (await call(app, 'GET', '/providers/bedrock/models?region=ap-southeast-2')).json()) as { source: string; models: Array<{ id: string }> };
    expect(body).toEqual({ source: 'list', models: [{ id: 'amazon.nova-pro-v1:0' }] });
    expect(rec.requests[0]?.url).toBe('https://bedrock.ap-southeast-2.amazonaws.com/foundation-models?byOutputModality=TEXT');
    expect(rec.requests[0]?.headers.get('authorization')?.startsWith('AWS4-HMAC-SHA256')).toBe(true);

    const az = capture({ data: [{ id: 'gpt-5-prod', status: 'succeeded' }] });
    writeFileSync(file, 'providers:\n  - id: azure/gpt-5-prod\n    extra:\n      resourceName: firm\n', 'utf8');
    const store = memoryStore({ 'azure/gpt-5-prod': '{"v":1,"fields":{"apiKey":"az-route-key"}}' });
    const app2 = appWith([new FakeModelProvider([{ text: 'x' }])], { discovery: { fetch: az.fetch, env: {} }, settings: { file, reload: () => {}, home, secrets: store } });
    const listed = (await (await call(app2, 'GET', '/providers/azure/gpt-5-prod/models')).json()) as { source: string; models: Array<{ id: string }> };
    expect(listed).toEqual({ source: 'list', models: [{ id: 'gpt-5-prod' }] });
    expect(az.requests[0]?.url).toBe('https://firm.openai.azure.com/openai/deployments?api-version=2023-03-15-preview');
    expect(az.requests[0]?.headers.get('api-key')).toBe('az-route-key');
  });
});

describe('the outcomes record (routing-and-evals spec §7)', () => {
  const proposal = {
    toolCalls: [{ name: 'propose_update', input: { path: 'practice/standards/x.md', content: 'NEW TEXT\n', rationale: 'because' } }],
    text: 'proposed',
  };

  async function seedProposal(app: App): Promise<{ threadId: string; proposalId: string }> {
    const threadId = await newThread(app);
    await step(app, threadId, { message: 'remember this' });
    const { events } = await store.get('default', threadId);
    const ev = events.find((e): e is Extract<ThreadEvent, { t: 'proposal' }> => 't' in e && e.t === 'proposal')!;
    return { threadId, proposalId: ev.id };
  }

  test('a decision is recorded with its optional reason; a conflict is not', async () => {
    const app = appWithFake([proposal, proposal]);
    const { threadId, proposalId } = await seedProposal(app);
    const res = await call(app, 'POST', `/threads/${threadId}/approve`, { body: { proposalId, decision: 'reject', reason: 'Too broad for the standard.' } });
    expect(res.status).toBe(200);

    const lines = readOutcomes(vaultRoot);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: 'proposal.decided', threadId, path: 'practice/standards/x.md', detail: { proposalId, decision: 'rejected', reason: 'Too broad for the standard.' } });

    const second = await seedProposal(app);
    await vault.write('default', 'practice/standards/x.md', 'SOMEONE ELSE\n');
    const conflict = await call(app, 'POST', `/threads/${second.threadId}/approve`, { body: { proposalId: second.proposalId, decision: 'approve' } });
    expect(conflict.status).toBe(409);
    expect(readOutcomes(vaultRoot)).toHaveLength(1);
  });

  test('a mark lands on the run record and in the record; a foreign run is 404', async () => {
    const app = appWithFake([{ text: 'answer' }, { text: 'other' }]);
    const id = await newThread(app);
    const { res: stepRes } = await step(app, id, { message: 'Summarize where we stand.' });
    const runId = stepRes.headers.get('x-run-id')!;

    const res = await call(app, 'POST', `/threads/${id}/turns/${runId}/mark`, { body: { mark: 'not-right', reason: 'missed the term' } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { mark: { mark: string } }).mark.mark).toBe('not-right');
    const run = (await (await call(app, 'GET', `/runs/${runId}`)).json()) as { mark?: { mark: string; reason?: string } };
    expect(run.mark).toMatchObject({ mark: 'not-right', reason: 'missed the term' });
    expect(readOutcomes(vaultRoot, { kind: 'answer.marked' })[0]).toMatchObject({ threadId: id, runId, task: 'summarize', providerId: 'fake/fake', detail: { mark: 'not-right', reason: 'missed the term' } });

    const other = await newThread(app);
    expect((await call(app, 'POST', `/threads/${other}/turns/${runId}/mark`, { body: { mark: 'useful' } })).status).toBe(404);
    expect((await call(app, 'POST', `/threads/${id}/turns/${runId}/mark`, { body: { mark: 'meh' } })).status).toBe(400);
  });

  test('a task correction rewrites the step event and the record, and is recorded; an unknown task is 400', async () => {
    const app = appWithFake([{ text: 'answer' }]);
    const id = await newThread(app);
    const { res: stepRes } = await step(app, id, { message: 'hi' });
    const runId = stepRes.headers.get('x-run-id')!;
    expect(readRunTask()).toEqual(['chat', 'default']);

    expect((await call(app, 'PATCH', `/threads/${id}/steps/${runId}/task`, { body: { task: 'classify' } })).status).toBe(400);
    const res = await call(app, 'PATCH', `/threads/${id}/steps/${runId}/task`, { body: { task: 'review' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ task: 'review', taskSource: 'corrected' });
    expect(readRunTask()).toEqual(['review', 'corrected']);
    const { events } = await store.get('default', id);
    const stepEv = events.find((e): e is Extract<ThreadEvent, { t: 'step' }> => 't' in e && e.t === 'step')!;
    expect([stepEv.task, stepEv.taskSource]).toEqual(['review', 'corrected']);
    expect(readOutcomes(vaultRoot, { kind: 'task.corrected' })[0]).toMatchObject({ threadId: id, runId, task: 'review', detail: { from: 'chat', to: 'review', was: 'default' } });

    function readRunTask(): [string | undefined, string | undefined] {
      const raw = JSON.parse(readFileSync(join(vaultRoot, '.counsel', 'runs', 'default', `${runId}.json`), 'utf8')) as { task?: string; taskSource?: string };
      return [raw.task, raw.taskSource];
    }
  });

  test('deleting a thread is recorded; GET /outcomes lists since a date; a bad date is 400', async () => {
    const app = appWithFake([{ text: 'answer' }]);
    const id = await newThread(app);
    expect((await call(app, 'DELETE', `/threads/${id}`)).status).toBe(204);

    const all = (await (await call(app, 'GET', '/outcomes')).json()) as Array<{ kind: string; threadId: string }>;
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ kind: 'thread.deleted', threadId: id });
    const later = (await (await call(app, 'GET', '/outcomes?since=2999-01-01T00:00:00.000Z')).json()) as unknown[];
    expect(later).toEqual([]);
    expect((await call(app, 'GET', '/outcomes?since=yesterday')).status).toBe(400);
  });

  test('PATCH /settings/vault flips the switch in config.md, /health shows it, and nothing is written while off', async () => {
    writeFileSync(join(vaultRoot, 'config.md'), 'counsel-os-config: true\nlegal_root: x\n', 'utf8');
    const app = appWithFake([{ text: 'answer' }]);
    expect(((await (await call(app, 'GET', '/health')).json()) as { outcomes: boolean }).outcomes).toBe(true);

    const off = await call(app, 'PATCH', '/settings/vault', { body: { outcomes: false } });
    expect(off.status).toBe(200);
    expect(await off.json()).toEqual({ outcomes: false });
    expect(readFileSync(join(vaultRoot, 'config.md'), 'utf8')).toContain('outcomes: off');
    expect(((await (await call(app, 'GET', '/health')).json()) as { outcomes: boolean }).outcomes).toBe(false);

    const id = await newThread(app);
    expect((await call(app, 'DELETE', `/threads/${id}`)).status).toBe(204);
    expect(readOutcomes(vaultRoot)).toEqual([]);

    const on = await call(app, 'PATCH', '/settings/vault', { body: { outcomes: true } });
    expect(await on.json()).toEqual({ outcomes: true });
    expect((await call(app, 'PATCH', '/settings/vault', { body: { outcomes: 'yes' } })).status).toBe(400);
  });
});

describe('the eval runner over HTTP (routing-and-evals spec §4.2)', () => {
  const repoRoot = resolve(import.meta.dir, '..', '..', '..');
  const sample = (id: string): unknown => JSON.parse(readFileSync(join(repoRoot, 'evals', 'sample-outputs', `${id}.json`), 'utf8'));
  const evalsDeps = (extra: NonNullable<ServerDeps['evals']> = {}): NonNullable<ServerDeps['evals']> => ({ repoRoot, tmpDir: mkdtempSync(join(tmpdir(), 'routes-evals-')), ...extra });

  // ── Fixtures from a matter (spec §8) ──────────────────────────────────
  const REVIEW = `Here is what I found.

## RED

**Liability cap (Section 5)** — the cap is far below the fees
Current language: "Vendor's aggregate liability shall not exceed $50,000"
Rationale: A cap this size does not survive one incident.
`;

  /** A thread that reviewed a document in the vault, as the composer leaves
   * it: the path as a chip in the message, counsel's answer in the log. */
  async function reviewedThread(app: App): Promise<string> {
    mkdirSync(join(vaultRoot, 'matters'), { recursive: true });
    writeFileSync(join(vaultRoot, 'matters', 'services.md'), "Acme Holdings, Inc. and Bytecraft Labs LLC agree.\n\nVendor's aggregate liability shall not exceed $50,000.\n");
    const id = await newThread(app);
    const { res } = await step(app, id, { message: 'Review this.\n\n`matters/services.md`', task: 'review' });
    expect(res.status).toBe(200);
    return id;
  }

  test('POST /fixtures/draft anonymizes the document and offers each finding', async () => {
    const app = appWith([new FakeModelProvider([{ text: REVIEW }])], { evals: evalsDeps() });
    const id = await reviewedThread(app);

    const res = await call(app, 'POST', '/fixtures/draft', { body: { threadId: id } });
    expect(res.status).toBe(200);
    const draft = (await res.json()) as {
      id: string; text: string; original: string; documentPath: string;
      catches: Array<{ id: string; severity: string; clause: string }>;
      replacements: Array<{ kind: string; from: string; to: string }>;
    };
    expect(draft.documentPath).toBe('matters/services.md');
    expect(draft.text).not.toContain('Acme');
    expect(draft.text).not.toContain('$50,000');
    expect(draft.original).toContain('Acme');
    expect(draft.catches).toHaveLength(1);
    expect(draft.catches[0]!.severity).toBe('red');
    expect(draft.replacements.some(r => r.kind === 'money')).toBe(true);
    // Nothing was written: a draft is a proposal.
    expect(existsSync(join(vaultRoot, 'practice', 'evals'))).toBe(false);
  });

  test('POST /fixtures/save writes the fixture the loader can run, once', async () => {
    const app = appWith([new FakeModelProvider([{ text: REVIEW }])], { evals: evalsDeps() });
    const id = await reviewedThread(app);
    const draft = (await (await call(app, 'POST', '/fixtures/draft', { body: { threadId: id } })).json()) as { catches: Array<{ id: string }> };

    const saved = await call(app, 'POST', '/fixtures/save', { body: { threadId: id, keep: [draft.catches[0]!.id], id: 'acme-services' } });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ path: 'practice/evals/acme-services.json', id: 'acme-services', expected: 1, negative: 0 });

    const written = JSON.parse(readFileSync(join(vaultRoot, 'practice', 'evals', 'acme-services.json'), 'utf8')) as Record<string, unknown>;
    expect(String(JSON.stringify(written))).not.toContain('Acme');
    // The suite picks it up, and its id is now taken.
    const { fixtures } = (await (await call(app, 'GET', '/evals/fixtures')).json()) as { fixtures: Array<{ id: string; source: string; runnable: boolean }> };
    // Runnable, not merely listed: the save wrote the mini-vault beside it.
    expect(fixtures.find(f => f.id === 'acme-services')).toMatchObject({ source: 'practice', runnable: true });
    expect(readFileSync(join(vaultRoot, 'practice', 'evals', 'vaults', 'acme-services', 'matters', 'document.md'), 'utf8')).not.toContain('Acme');
    expect(existsSync(join(vaultRoot, 'practice', 'evals', 'vaults', 'acme-services', 'config.md'))).toBe(true);
    expect((await call(app, 'POST', '/fixtures/save', { body: { threadId: id, keep: [], id: 'acme-services' } })).status).toBe(409);
    expect((await call(app, 'POST', '/fixtures/save', { body: { threadId: id, keep: [], id: 'acme-services', overwrite: true } })).status).toBe(200);
  });

  test('a rejected finding becomes a negative check, and the lawyer’s edited text is what is saved', async () => {
    const app = appWith([new FakeModelProvider([{ text: REVIEW }])], { evals: evalsDeps() });
    const id = await reviewedThread(app);
    const draft = (await (await call(app, 'POST', '/fixtures/draft', { body: { threadId: id } })).json()) as { catches: Array<{ id: string }> };
    const res = await call(app, 'POST', '/fixtures/save', { body: { threadId: id, keep: [], reject: [draft.catches[0]!.id], id: 'acme-neg' } });
    expect(await res.json()).toMatchObject({ expected: 0, negative: 1 });

    // An edit that removes what the finding was about removes the finding:
    // a rejected catch whose words are no longer in the document would
    // penalize every future answer for text this fixture does not contain.
    const edited = await call(app, 'POST', '/fixtures/save', { body: { threadId: id, keep: [], reject: [draft.catches[0]!.id], id: 'acme-edited', text: 'A shorter agreement.' } });
    expect(await edited.json()).toMatchObject({ expected: 0, negative: 0 });
    const written = JSON.parse(readFileSync(join(vaultRoot, 'practice', 'evals', 'acme-edited.json'), 'utf8')) as { input: { contract_text: string } };
    expect(written.input.contract_text).toBe('A shorter agreement.');
  });

  test('a cited path cannot climb out of the knowledge folders', async () => {
    // The citation is MODEL output. A contract that tells the model to cite
    // `practice/../matters/other-client/nda.md` must not pull another
    // client's matter into a fixture.
    mkdirSync(join(vaultRoot, 'matters', 'other-client'), { recursive: true });
    writeFileSync(join(vaultRoot, 'matters', 'other-client', 'nda.md'), 'Zephyr Robotics is the counterparty.\n');
    const cites = `## RED

**Liability cap (Section 5)** - the cap is far below the fees
Current language: "Vendor's aggregate liability shall not exceed $50,000"
Rationale: see practice/../matters/other-client/nda.md, law/../../etc/passwd.md and practice/standards/liability.md.
`;
    const app = appWith([new FakeModelProvider([{ text: cites }])], { evals: evalsDeps() });
    mkdirSync(join(vaultRoot, 'practice', 'standards'), { recursive: true });
    writeFileSync(join(vaultRoot, 'practice', 'standards', 'liability.md'), '# Liability\n\nTwelve months of fees.\n');
    const id = await reviewedThread(app);

    const res = await call(app, 'POST', '/fixtures/draft', { body: { threadId: id } });
    expect(res.status).toBe(200);
    const draft = (await res.json()) as { citations: Array<{ aliases: string[] }>; knowledge: Array<{ path: string }> };
    expect(draft.knowledge.map(k => k.path)).toEqual(['practice/standards/liability.md']);
    expect(JSON.stringify(draft)).not.toContain('Zephyr');
    expect(JSON.stringify(draft.citations)).not.toContain('other-client');

    await call(app, 'POST', '/fixtures/save', { body: { threadId: id, keep: [], id: 'climb' } });
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(dir, entry.name));
        else files.push(join(dir, entry.name));
      }
    };
    walk(join(vaultRoot, 'practice', 'evals', 'vaults', 'climb'));
    expect(files.some(p => p.includes('other-client') || p.includes('passwd'))).toBe(false);
  });

  test('a practice file the lawyer removes takes its citation with it', async () => {
    const cites = `## RED

**Liability cap (Section 5)** - too low
Current language: "Vendor's aggregate liability shall not exceed $50,000"
Rationale: see practice/standards/acme-special-terms.md.
`;
    const app = appWith([new FakeModelProvider([{ text: cites }])], { evals: evalsDeps() });
    mkdirSync(join(vaultRoot, 'practice', 'standards'), { recursive: true });
    writeFileSync(join(vaultRoot, 'practice', 'standards', 'acme-special-terms.md'), '# Special terms\n\nTwelve months.\n');
    const id = await reviewedThread(app);

    await call(app, 'POST', '/fixtures/save', {
      body: { threadId: id, keep: [], id: 'no-files', dropKnowledge: ['practice/standards/acme-special-terms.md'] },
    });
    const written = readFileSync(join(vaultRoot, 'practice', 'evals', 'no-files.json'), 'utf8');
    // The path is the leak — a standard is often named after a client — and
    // a citation the fixture's own vault cannot serve could never score.
    expect(written).not.toContain('acme-special-terms');
    expect(existsSync(join(vaultRoot, 'practice', 'evals', 'vaults', 'no-files', 'practice'))).toBe(false);
  });

  test('a matter that stays on this machine cannot become a fixture', async () => {
    const app = appWith([new FakeModelProvider([{ text: REVIEW }])], { evals: evalsDeps() });
    mkdirSync(join(vaultRoot, 'matters'), { recursive: true });
    writeFileSync(join(vaultRoot, 'matters', 'sealed.md'), '---\nstays_local: true\n---\n\n# Sealed matter\n');
    writeFileSync(join(vaultRoot, 'matters', 'services.md'), "Acme Holdings, Inc. agrees.\n\nVendor's aggregate liability shall not exceed $50,000.\n");
    const id = await newThread(app);
    await call(app, 'PATCH', `/threads/${id}`, { body: { matter: 'matters/sealed.md' } });
    await step(app, id, { message: 'Review this.\n\n`matters/services.md`', task: 'review' });

    const res = await call(app, 'POST', '/fixtures/draft', { body: { threadId: id } });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toMatch(/stays on this machine/);
  });

  test('a conversation with nothing to make a fixture from says why, and both routes need the token', async () => {
    const app = appWith([new FakeModelProvider([{ text: 'Looks fine to me.' }])], { evals: evalsDeps() });
    const bare = await newThread(app);
    const empty = await call(app, 'POST', '/fixtures/draft', { body: { threadId: bare } });
    expect(empty.status).toBe(422);
    expect(((await empty.json()) as { error: string }).error).toMatch(/finished review/);

    const id = await newThread(app);
    await step(app, id, { message: 'Review this.\n\n`matters/nowhere.md`', task: 'review' });
    const missing = await call(app, 'POST', '/fixtures/draft', { body: { threadId: id } });
    expect(missing.status).toBe(422);

    expect((await call(app, 'POST', '/fixtures/draft', { token: null, body: { threadId: id } })).status).toBe(401);
    expect((await call(app, 'POST', '/fixtures/save', { token: null, body: { threadId: id, keep: [] } })).status).toBe(401);
  });

  test('the routes need the bearer token', async () => {
    const app = appWithFake();
    expect((await call(app, 'GET', '/evals/fixtures', { token: null })).status).toBe(401);
    expect((await call(app, 'POST', '/evals/run', { token: null, body: { all: true } })).status).toBe(401);
  });

  test('GET /evals/fixtures lists the shipped set with scorer, task, source and whether it can run', async () => {
    const app = appWith([new FakeModelProvider([{ text: "x" }])], { evals: evalsDeps() });
    const res = await call(app, 'GET', '/evals/fixtures');
    expect(res.status).toBe(200);
    const { fixtures } = (await res.json()) as { fixtures: Array<{ id: string; scorer: string; task: string; source: string; runnable: boolean }> };
    expect(fixtures.length).toBeGreaterThanOrEqual(13);
    const lbp = fixtures.find(f => f.id === 'law-beats-practice')!;
    expect(lbp).toMatchObject({ scorer: 'findings', task: 'review', source: 'shipped', runnable: true });
    expect(fixtures.find(f => f.id === 'demo-nda')!.runnable).toBe(false);
  });

  test('POST /evals/run streams plan, progress, result and done; --save lands in results.jsonl and GET /evals/results reads it', async () => {
    const app = appWith([new FakeModelProvider([{ output: sample('law-beats-practice'), usage: { inputTokens: 10, outputTokens: 2, costUsd: 0.01 } }])], { evals: evalsDeps() });
    const res = await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'], save: true } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    const frames = parseSse(await res.text());
    expect(frames.map(f => f.event)).toEqual(['plan', 'progress', 'result', 'done']);
    expect(frames[0]!.data).toMatchObject({ count: 1, providerId: 'fake/fake', estimateUsd: null, skipped: [] });
    expect(frames[1]!.data).toEqual({ index: 0, total: 1, fixtureId: 'law-beats-practice' });
    expect(frames[2]!.data).toMatchObject({ fixtureId: 'law-beats-practice', score: 1, providerId: 'fake/fake', task: 'review', costUsd: 0.01 });
    expect(frames[3]!.data).toMatchObject({ summary: { count: 1, scored: 1, failed: 0, mean: 1, costUsd: 0.01 }, saved: true });

    const all = await call(app, 'GET', '/evals/results');
    expect(((await all.json()) as { results: unknown[] }).results).toHaveLength(1);
    const none = await call(app, 'GET', '/evals/results?since=2999-01-01');
    expect(((await none.json()) as { results: unknown[] }).results).toHaveLength(0);
    expect((await call(app, 'GET', '/evals/results?since=yesterday')).status).toBe(400);
  });

  test('a run without save leaves no results; a step error is a null-score line, and the set still finishes', async () => {
    const app = appWith([new FakeModelProvider([{ error: 'no model' }])], { evals: evalsDeps() });
    const frames = parseSse(await (await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'] } })).text());
    expect(frames.find(f => f.event === 'result')!.data).toMatchObject({ score: null, error: 'no model' });
    expect(frames.at(-1)!.data).toMatchObject({ summary: { count: 1, scored: 0, failed: 1, mean: null }, saved: false });
    expect(((await (await call(app, 'GET', '/evals/results')).json()) as { results: unknown[] }).results).toEqual([]);
  });

  test('the cost guard: a set on a provider with no known price needs confirm: true; one fixture does not', async () => {
    const app = appWith([new FakeModelProvider([{ output: sample('law-beats-practice') }, { output: sample('law-beats-practice') }])], { evals: evalsDeps() });
    const refused = await call(app, 'POST', '/evals/run', { body: { all: true } });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ error: 'confirm-cost', estimateUsd: null, count: 8, providerId: 'fake/fake', message: '8 runs on fake/fake with no known price — confirm to run them.' });
    expect((await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'] } })).status).toBe(200);
  });

  test('the cost guard: over $1 estimated needs confirm: true', async () => {
    const pricing = () => ({ prompt: 3, completion: 15 });
    const app = appWith([new FakeModelProvider([{ output: sample('law-beats-practice') }])], { evals: evalsDeps({ pricing }) });
    const refused = await call(app, 'POST', '/evals/run', { body: { all: true } });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ error: 'confirm-cost', estimateUsd: 1.32, count: 8, providerId: 'fake/fake' });
    const one = await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'] } });
    expect(one.status).toBe(200);
    const frames = parseSse(await one.text());
    expect(frames[0]!.data).toMatchObject({ estimateUsd: 0.17 });
  });

  test('bad selections: unknown fixture, unknown provider, nothing runnable', async () => {
    const app = appWith([new FakeModelProvider([{ text: "x" }])], { evals: evalsDeps() });
    expect((await call(app, 'POST', '/evals/run', { body: { fixtures: ['ghost'] } })).status).toBe(400);
    expect((await call(app, 'POST', '/evals/run', { body: {} })).status).toBe(400);
    expect((await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'], providerId: 'nope/nope' } })).status).toBe(422);
    const legacy = await call(app, 'POST', '/evals/run', { body: { fixtures: ['demo-nda'] } });
    expect(legacy.status).toBe(400);
    expect(await legacy.json()).toMatchObject({ error: 'nothing to run', skipped: [{ id: 'demo-nda' }] });
  });

  test('GET /evals/scoreboard folds the saved results per task, provider and set, with the fixture counts', async () => {
    const app = appWith([new FakeModelProvider([{ output: sample('law-beats-practice'), usage: { inputTokens: 10, outputTokens: 2, costUsd: 0.01 } }])], { evals: evalsDeps() });
    const empty = (await (await call(app, 'GET', '/evals/scoreboard')).json()) as { tasks: Array<{ task: string; sets: Record<string, { fixtures: number; rows: unknown[] }> }> };
    const review = empty.tasks.find(t => t.task === 'review')!;
    expect(review.sets.shipped!.fixtures).toBe(8);
    expect(review.sets.shipped!.rows).toEqual([]);
    expect(review.sets.practice).toEqual({ fixtures: 0, rows: [] });

    await (await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'], save: true } })).text();
    const board = (await (await call(app, 'GET', '/evals/scoreboard')).json()) as typeof empty;
    const row = board.tasks.find(t => t.task === 'review')!.sets.shipped!.rows[0] as Record<string, unknown>;
    expect(row).toMatchObject({ providerId: 'fake/fake', modelVersion: 'fake', score: 1, scored: 1, sampleSize: 1, failed: [], meanCostUsd: 0.01, staleDays: 0 });
    expect(typeof row.medianMs).toBe('number');
    expect(board.tasks.find(t => t.task === 'review')!.sets.practice!.rows).toEqual([]);
  });

  test('GET /routing reports the bar, the preference and who that picks; PUT changes one task and the next step follows it', async () => {
    const app = appWith([new FakeModelProvider([{ output: sample('law-beats-practice'), usage: { inputTokens: 10, outputTokens: 2, costUsd: 0.01 } }])], { evals: evalsDeps() });
    // Nothing scored yet: the defaults stand and no task claims a pick.
    const bare = (await (await call(app, 'GET', '/routing')).json()) as { defaults: { minScore: number; prefer: string }; tasks: Record<string, unknown> };
    expect(bare.defaults).toEqual({ minScore: 0.7, prefer: 'quality' });

    // Score the fake provider on `review`; it clears the default bar.
    await (await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'], save: true } })).text();
    const scored = (await (await call(app, 'GET', '/routing')).json()) as {
      tasks: Record<string, { minScore: number; prefer: string; pinned?: string; picked?: { providerId: string; reason: string } }>;
    };
    expect(scored.tasks['review']).toMatchObject({ minScore: 0.7, prefer: 'quality' });
    expect(scored.tasks['review']?.picked).toEqual({ providerId: 'fake/fake', reason: 'review 1.00' });

    // Raise the bar above what it scored: the same provider is no longer the
    // scoreboard's pick, and the reason says so.
    const raised = (await (await call(app, 'PUT', '/routing', { body: { task: 'review', minScore: 1 } })).json()) as typeof scored;
    expect(raised.tasks['review']?.minScore).toBe(1);
    const lowered = (await (await call(app, 'PUT', '/routing', { body: { task: 'review', minScore: 0.5, prefer: 'cost', pinned: 'fake/fake' } })).json()) as typeof scored;
    expect(lowered.tasks['review']).toMatchObject({ minScore: 0.5, prefer: 'cost', pinned: 'fake/fake' });
    expect(lowered.tasks['review']?.picked?.reason).toBe('pinned for review · 1.00');

    // Unpinning leaves the rest of the task's policy alone.
    const unpinned = (await (await call(app, 'PUT', '/routing', { body: { task: 'review', pinned: null } })).json()) as typeof scored;
    expect(unpinned.tasks['review']?.pinned).toBeUndefined();
    expect(unpinned.tasks['review']).toMatchObject({ minScore: 0.5, prefer: 'cost' });
  });

  test('GET /routing/ledger says what ran, in what thread, on what model and why', async () => {
    const app = appWith([new FakeModelProvider([{ text: 'one' }, { text: 'two' }])], { evals: evalsDeps() });
    const first = await newThread(app);
    await call(app, 'PATCH', `/threads/${first}`, { body: { title: 'Acme cap' } });
    const { res } = await step(app, first, { message: 'Review this.', task: 'review' });
    expect(res.status).toBe(200);
    const runId = res.headers.get('x-run-id')!;
    await call(app, 'POST', `/threads/${first}/turns/${runId}/mark`, { body: { mark: 'useful' } });
    await new Promise(r => setTimeout(r, 2));
    const second = await newThread(app);
    await step(app, second, { message: 'And this.' });

    const ledger = await call(app, 'GET', '/routing/ledger?limit=10');
    expect(ledger.status).toBe(200);
    const { runs } = (await ledger.json()) as {
      runs: Array<{ runId: string; thread: string; task?: string; provider: string; routeReason?: { kind: string; text: string }; mark?: string; status: string }>;
    };
    // Every thread's runs, newest first — the question the scoreboard and
    // the Models group cannot answer.
    expect(runs).toHaveLength(2);
    expect(runs[1]!.runId).toBe(runId);
    expect(runs[1]).toMatchObject({ thread: 'Acme cap', task: 'review', provider: 'fake/fake', mark: 'useful', status: 'done' });
    // Scoring is on for this app, and nothing has scored `review` yet.
    expect(runs[1]!.routeReason).toEqual({ kind: 'no-score', text: 'no score yet' });
    expect(runs[0]!.thread).not.toBe('Acme cap');

    expect((await call(app, 'GET', '/routing/ledger?limit=0')).status).toBe(400);
    expect((await call(app, 'GET', '/routing/ledger?limit=x')).status).toBe(400);
    expect((await call(app, 'GET', '/routing/ledger?limit=501')).status).toBe(400);
    expect((await call(app, 'GET', '/routing/ledger')).status).toBe(200);
    expect((await call(app, 'GET', '/routing/ledger', { token: null })).status).toBe(401);
  });

  test('the ledger carries what ran, never what was said', async () => {
    // The omission IS the feature: this is one table over every matter in
    // the vault, and Settings is the pane most likely to be on a screen
    // someone else can see.
    const app = appWith([new FakeModelProvider([{ text: 'The cap is far below the fees.' }])], { evals: evalsDeps() });
    // Untitled on purpose: an untitled thread's derived title is the first
    // line of the lawyer's own message.
    const created = await call(app, 'POST', '/threads', { body: {} });
    const id = ((await created.json()) as { id: string }).id;
    await step(app, id, { message: 'Zephyr Robotics wants a $50,000 cap on the Acme deal.', task: 'review' });

    const body = await (await call(app, 'GET', '/routing/ledger')).text();
    for (const secret of ['Zephyr', 'Acme', '$50,000', 'far below the fees']) expect(body).not.toContain(secret);
    const { runs } = JSON.parse(body) as { runs: Array<Record<string, unknown>> };
    expect(Object.keys(runs[0]!).sort()).toEqual(['at', 'durationMs', 'provider', 'routeReason', 'runId', 'status', 'task', 'taskSource', 'thread', 'threadId']);
    expect(runs[0]!.thread).toBe('');

    // A thread the lawyer named does show its name.
    const named = await newThread(app);
    await step(app, named, { message: 'And this.' });
    const after = (await (await call(app, 'GET', '/routing/ledger')).json()) as { runs: Array<{ thread: string }> };
    expect(after.runs[0]!.thread).toBe('a thread');
  });

  test('PUT /routing refuses a body that is not a routing change', async () => {
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { evals: evalsDeps() });
    expect((await call(app, 'PUT', '/routing', { body: { task: '' } })).status).toBe(400);
    expect((await call(app, 'PUT', '/routing', { body: { task: 'review', minScore: 2 } })).status).toBe(400);
    expect((await call(app, 'PUT', '/routing', { body: { task: 'review', prefer: 'cheapest' } })).status).toBe(400);
    // A task name is a name, not free text: it becomes a key in the policy file.
    expect((await call(app, 'PUT', '/routing', { body: { task: 'review: contracts', minScore: 0.5 } })).status).toBe(400);
    expect((await call(app, 'PUT', '/routing', { body: { task: '#urgent', minScore: 0.5 } })).status).toBe(400);
    // A pin names a provider this practice has loaded.
    expect((await call(app, 'PUT', '/routing', { body: { task: 'review', pinned: 'ghost/ghost' } })).status).toBe(422);
  });

  test('a change to one task leaves every other task alone, whatever its name looks like in YAML', async () => {
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { evals: evalsDeps() });
    // A fixture may name any task, and that name reaches the policy file. A
    // name that reads as YAML syntax must survive the write, or the file
    // parses back as no policy at all and every bar in it is lost.
    writeRoutingPolicy(vaultRoot, { tasks: { 'draft: memo': { min_score: 0.9 }, extract: { prefer: 'cost' } } });
    const after = (await (await call(app, 'PUT', '/routing', { body: { task: 'review', minScore: 0.6 } })).json()) as {
      tasks: Record<string, { minScore: number; prefer: string }>;
    };
    expect(after.tasks['review']).toMatchObject({ minScore: 0.6 });
    expect(after.tasks['draft: memo']).toMatchObject({ minScore: 0.9 });
    expect(after.tasks['extract']).toMatchObject({ prefer: 'cost' });
    expect(readRoutingPolicy(vaultRoot).tasks['draft: memo']?.min_score).toBe(0.9);
  });

  test('an imported benchmark is visible to the app, and the guard counts its documents', async () => {
    // Two things this used to get wrong: the server never passed a
    // benchmarks directory, so `set: benchmark` was dead in the API; and
    // the cost guard counted FILES, so one fixture holding 40 contracts ran
    // 40 model calls with no confirmation.
    const dir = mkdtempSync(join(tmpdir(), 'routes-bench-'));
    mkdirSync(join(dir, 'demo', 'fixtures'), { recursive: true });
    mkdirSync(join(dir, 'demo', 'vaults', 'demo', 'matters'), { recursive: true });
    writeFileSync(join(dir, 'demo', 'vaults', 'demo', 'config.md'), '# Counsel OS Configuration\n\ncounsel-os-config: true\nconfig_version: 1\nlegal_root: __VAULT_PATH__\n');
    const documents = Array.from({ length: 40 }, (_, i) => ({ id: `doc-${i}`, task: `Is this clause governed by New York law? Clause ${i}.`, expected: { answer: 'Yes' } }));
    writeFileSync(
      join(dir, 'demo', 'fixtures', 'demo-set.json'),
      JSON.stringify({ id: 'demo-set', vault: 'demo', scorer: 'classification', source: { kind: 'benchmark', name: 'Demo' }, documents }),
    );
    const app = appWith([new FakeModelProvider([{ text: 'Yes' }])], { evals: evalsDeps({ benchmarksDir: dir }) });

    const { fixtures } = (await (await call(app, 'GET', '/evals/fixtures')).json()) as { fixtures: Array<{ id: string; source: string; task: string }> };
    expect(fixtures.find(f => f.id === 'demo-set')).toMatchObject({ source: 'benchmark', task: 'review' });

    const estimate = (await (await call(app, 'GET', '/evals/estimate?task=review&providerId=fake%2Ffake&set=benchmark')).json()) as { count: number; needsConfirm: boolean };
    expect(estimate.count).toBe(40);
    expect(estimate.needsConfirm).toBe(true);

    // And a run for that set selects it, rather than the shipped suite.
    const refused = await call(app, 'POST', '/evals/run', { body: { task: 'review', set: 'benchmark' } });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ error: 'confirm-cost', count: 40 });
  });

  test('GET /evals/estimate says how many fixtures a task runs and what it may cost', async () => {
    const app = appWith([new FakeModelProvider([{ text: 'x' }])], { evals: evalsDeps({ pricing: () => ({ prompt: 3, completion: 15 }) }) });
    const res = await call(app, 'GET', '/evals/estimate?task=review&providerId=fake%2Ffake');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ task: 'review', providerId: 'fake/fake', count: 8, estimateUsd: 1.32, needsConfirm: true });
    const unknown = await call(app, 'GET', '/evals/estimate?task=review&providerId=nope%2Fnope');
    expect(unknown.status).toBe(422);
    expect((await call(app, 'GET', '/evals/estimate?task=review')).status).toBe(400);
    expect((await call(app, 'GET', '/evals/estimate?providerId=fake%2Ffake')).status).toBe(400);
    const noTask = await call(app, 'GET', '/evals/estimate?task=ghost&providerId=fake%2Ffake');
    expect(await noTask.json()).toMatchObject({ count: 0, estimateUsd: 0, needsConfirm: false });
    // A provider with no published price still needs confirming for more
    // than one call — which is what POST /evals/run does, so the line the
    // screen asks with has to say the same.
    const free = appWith([new FakeModelProvider([{ text: 'x' }])], { evals: evalsDeps() });
    expect(await (await call(free, 'GET', '/evals/estimate?task=review&providerId=fake%2Ffake')).json()).toMatchObject({ count: 8, estimateUsd: null, needsConfirm: true });
  });

  test('one run at a time: a second POST while one streams is 409 eval-busy', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(r => (release = r));
    const fake = new FakeModelProvider([{ output: sample('law-beats-practice') }]);
    const slow: ModelProvider = {
      id: fake.id,
      kind: fake.kind,
      capabilities: fake.capabilities,
      run: async function* (req) {
        await gate;
        yield* fake.run(req);
      },
    };
    const app = appWith([slow], { evals: evalsDeps() });
    const first = call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'] } });
    await new Promise(r => setTimeout(r, 20));
    const second = await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'] } });
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: 'eval-busy' });
    release();
    const frames = parseSse(await (await first).text());
    expect(frames.at(-1)!.event).toBe('done');
    // And free again once the stream has ended.
    expect((await call(app, 'POST', '/evals/run', { body: { fixtures: ['law-beats-practice'] } })).status).toBe(200);
  });
});
