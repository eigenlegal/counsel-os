import { describe, expect, test, beforeEach } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider } from '../core/fake-provider';
import type { ModelProvider, StepEvent } from '../core/types';
import { Router } from '../router/router';
import { ThreadStore, type ThreadEvent } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { runStep, RESUME_WARNING, type CounselLoopDeps } from './counsel-loop';
import type { RunLogEntry } from './run-log';

let vaultRoot: string;
let pluginRoot: string;
let vault: FsVaultStore;
let store: ThreadStore;

beforeEach(() => {
  vaultRoot = mkdtempSync(join(tmpdir(), 'loop-vault-'));
  pluginRoot = mkdtempSync(join(tmpdir(), 'loop-plugin-'));
  mkdirSync(join(pluginRoot, 'skills', 'counsel'), { recursive: true });
  writeFileSync(
    join(pluginRoot, 'skills', 'counsel', 'SKILL.md'),
    '---\nname: counsel\n---\n\nTHE METHODOLOGY BODY.\n',
    'utf8',
  );
  mkdirSync(join(pluginRoot, 'primitives'), { recursive: true });
  writeFileSync(join(pluginRoot, 'primitives', 'draft.md'), 'DRAFT PRIMITIVE STEPS.\n', 'utf8');
  vault = new FsVaultStore(vaultRoot);
  store = new ThreadStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'loop-codex-')) });
});

function deps(providers: ModelProvider[], router?: Router): CounselLoopDeps {
  return {
    tenant: 'default',
    vaultRoot,
    pluginRoot,
    vault,
    store,
    providers,
    router: router ?? new Router({ default: providers[0]!.id }, providers),
    platform: 'macos',
  };
}

async function collect(it: AsyncIterable<StepEvent & { runId: string }>): Promise<Array<StepEvent & { runId: string }>> {
  const out: Array<StepEvent & { runId: string }> = [];
  for await (const ev of it) out.push(ev);
  return out;
}

/** The log's discriminator: thread-only events carry `t`, StepEvents `type`. */
function kindOf(ev: ThreadEvent): string {
  return 't' in ev ? ev.t : ev.type;
}

async function logKinds(threadId: string): Promise<string[]> {
  const { events } = await store.get('default', threadId);
  return events.map(kindOf);
}

describe('runStep', () => {
  test('(a) first step appends user, step, the model events, and done; the request replays the window with no session', async () => {
    const fake = new FakeModelProvider([{ text: 'hi there' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['text', 'done']);
    expect(events[0]!.runId).toBeTruthy();
    expect(new Set(events.map(e => e.runId)).size).toBe(1);

    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'done']);

    expect(fake.lastRequest).toBeDefined();
    expect(fake.lastRequest!.session).toBeUndefined();
    expect(fake.lastRequest!.messages).toEqual([{ role: 'user', content: 'hello' }]);
    // The system prompt is the assembled one: host preamble + SKILL.md body.
    expect(fake.lastRequest!.system).toContain('THE METHODOLOGY BODY.');
    expect(fake.lastRequest!.system).toContain('Host: Counsel OS runtime');
    // Tools: the guarded vault tools, propose_update, read_primitive, scripts.
    const toolNames = fake.lastRequest!.tools.map(t => t.name);
    expect(toolNames).toContain('vault_read');
    expect(toolNames).toContain('vault_write');
    expect(toolNames).toContain('propose_update');
    expect(toolNames).toContain('read_primitive');
    expect(toolNames).toContain('docket_sweep');

    // The step event records the run id and the provider that served it.
    const { events: log } = await store.get('default', id);
    const step = log.find(ev => 't' in ev && ev.t === 'step') as Extract<ThreadEvent, { t: 'step' }>;
    expect(step.runId).toBe(events[0]!.runId);
    expect(step.provider).toBe('fake/fake');
  });

  test('(a2) vault_write on a knowledge path is refused — the loop hands the model the guarded tools', async () => {
    const fake = new FakeModelProvider([
      { toolCalls: [{ name: 'vault_write', input: { path: 'practice/standards/x.md', content: 'nope' } }] },
    ]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'write it' }));

    const result = events.find(e => e.type === 'tool_result') as Extract<StepEvent, { type: 'tool_result' }>;
    expect(result.isError).toBe(true);
    expect(String(result.output)).toContain('propose_update');
  });

  test('(b) a session event is stored on the header and never yielded to the caller', async () => {
    const fake = new FakeModelProvider([{ session: 's1', text: 'ok' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['text', 'done']);
    const { header } = await store.get('default', id);
    expect(header.sessions['fake/fake']).toBe('s1');
    // Nor is it written to the log — it is consumed, not recorded.
    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'done']);
  });

  test('(c) a second step on the same thread resumes the session and sends only the new message', async () => {
    const fake = new FakeModelProvider([{ session: 's1', text: 'one' }, { text: 'two' }]);
    const { id } = await store.create('default', {});

    await collect(runStep(deps([fake]), { threadId: id, message: 'first' }));
    await collect(runStep(deps([fake]), { threadId: id, message: 'second' }));

    expect(fake.lastRequest!.session).toEqual({ id: 's1' });
    expect(fake.lastRequest!.messages).toEqual([{ role: 'user', content: 'second' }]);
  });

  test('(d) a run log records the provider, tokens, duration, and each tool call', async () => {
    const fake = new FakeModelProvider([
      {
        toolCalls: [{ name: 'read_primitive', input: { name: 'draft' } }],
        text: 'drafted',
        usage: { inputTokens: 12, outputTokens: 34, costUsd: 0.5 },
      },
    ]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'draft it', task: 'draft' }));
    const runId = events[0]!.runId;

    const raw = readFileSync(join(vaultRoot, '.counsel', 'runs', 'default', `${runId}.log.jsonl`), 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!) as RunLogEntry;

    expect(entry.provider).toBe('fake/fake');
    expect(entry.task).toBe('draft');
    expect(entry.inputTokens).toBe(12);
    expect(entry.outputTokens).toBe(34);
    expect(entry.costUsd).toBe(0.5);
    expect(typeof entry.durationMs).toBe('number');
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof entry.at).toBe('string');
    expect(entry.toolCalls).toHaveLength(1);
    expect(entry.toolCalls[0]!.name).toBe('read_primitive');
    expect(entry.toolCalls[0]!.isError).toBe(false);
    expect(typeof entry.toolCalls[0]!.ms).toBe('number');
    expect(entry.toolCalls[0]!.ms).toBeGreaterThanOrEqual(0);
  });

  test('(e) an unknown thread yields a single error and writes nothing', async () => {
    const fake = new FakeModelProvider([{ text: 'never' }]);

    const events = await collect(runStep(deps([fake]), { threadId: randomUUID(), message: 'hello' }));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('error');
    expect(fake.lastRequest).toBeUndefined();
  });

  test('(e2) a malformed thread id yields an error rather than throwing', async () => {
    const fake = new FakeModelProvider([{ text: 'never' }]);

    const events = await collect(runStep(deps([fake]), { threadId: '../../etc', message: 'hello' }));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('error');
  });

  test('(f) a router hard error yields a single error, with only the user event appended', async () => {
    const fake = new FakeModelProvider([{ text: 'never' }]);
    const router = new Router(
      { default: 'fake/fake', tasks: { classify: { prefer: 'nope/nope', require: { contextTokens: 10_000_000 } } } },
      [fake],
    );
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake], router), { threadId: id, message: 'classify this', task: 'classify' }));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('error');
    expect((events[0] as Extract<StepEvent, { type: 'error' }>).message).toContain('classify');
    expect(await logKinds(id)).toEqual(['user']);
    expect(fake.lastRequest).toBeUndefined();
  });

  test('(f2) an unknown explicit provider id yields a single error', async () => {
    const fake = new FakeModelProvider([{ text: 'never' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hi', providerId: 'nope/nope' }));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('error');
    expect(await logKinds(id)).toEqual(['user']);
  });

  test('a resume failure drops the stored session and replays the log once', async () => {
    const fake = new FakeModelProvider([
      { session: 's1', text: 'one' },
      { error: 'session not found' },
      { text: 'recovered' },
    ]);
    const { id } = await store.create('default', {});

    await collect(runStep(deps([fake]), { threadId: id, message: 'first' }));
    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'second' }));

    // The caller never sees the resume failure — only the replayed answer.
    expect(events.map(e => e.type)).toEqual(['text', 'done']);
    expect((events[0] as Extract<StepEvent, { type: 'text' }>).text).toBe('recovered');

    // The dead session id is dropped from the header.
    const { header } = await store.get('default', id);
    expect(header.sessions['fake/fake']).toBeUndefined();

    // The replay sends the windowed log, not just the new message.
    expect(fake.lastRequest!.session).toBeUndefined();
    expect(fake.lastRequest!.messages).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'one' },
      { role: 'user', content: 'second' },
    ]);

    // Nothing from the abandoned attempt reached the log except spec §5's
    // warning — in particular the user turn is not appended twice.
    expect(await logKinds(id)).toEqual([
      'user', 'step', 'text', 'done',
      'user', 'step', 'warning', 'text', 'done',
    ]);
  });

  test('a session-shaped error on a step with no session is a real error, not a retry', async () => {
    const fake = new FakeModelProvider([{ error: 'session not found' }, { text: 'should never run' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['error']);
    expect(await logKinds(id)).toEqual(['user', 'step', 'error']);
  });

  test('a provider error mid-stream is appended to the log and yielded', async () => {
    const fake = new FakeModelProvider([{ text: 'partial', error: 'model exploded' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['text', 'error']);
    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'error']);
  });

  test('a provider that ends without a terminal event gets one synthesized', async () => {
    const silent: ModelProvider = {
      id: 'fake/silent',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      // Ends its stream with no `done` and no `error` — the failure mode
      // spec §5 forbids the caller from ever seeing.
      async *run(): AsyncIterable<StepEvent> {},
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([silent]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['error']);
    expect(await logKinds(id)).toEqual(['user', 'step', 'error']);
  });

  test('a codex-sub provider is bound to the thread: home, thread id, and plugin root', async () => {
    const bindings: Array<{ homeDir: string; threadId: string; pluginRoot: string }> = [];
    const fake = new FakeModelProvider([{ text: 'ok' }]);
    const codexish: ModelProvider & { withThread(o: { homeDir: string; threadId: string; pluginRoot: string }): ModelProvider } = {
      id: 'codex-sub/gpt-5.6-terra',
      kind: 'harness',
      capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' },
      run: fake.run.bind(fake),
      withThread(o) {
        bindings.push(o);
        return { ...this, run: fake.run.bind(fake) };
      },
    };
    const { id } = await store.create('default', {});

    await collect(runStep(deps([codexish]), { threadId: id, message: 'hello', providerId: 'codex-sub/gpt-5.6-terra' }));

    expect(bindings).toEqual([{ homeDir: store.codexHomeFor(id), threadId: id, pluginRoot }]);
  });

  test('a non-codex provider is never re-bound', async () => {
    let bound = false;
    const fake = new FakeModelProvider([{ text: 'ok' }]);
    const bindable: ModelProvider & { withThread(): ModelProvider } = {
      id: 'claude-sub/claude-opus-5',
      kind: 'harness',
      capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' },
      run: fake.run.bind(fake),
      withThread() {
        bound = true;
        return this;
      },
    };
    const { id } = await store.create('default', {});

    await collect(runStep(deps([bindable]), { threadId: id, message: 'hi', providerId: 'claude-sub/claude-opus-5' }));

    expect(bound).toBe(false);
  });
});

describe('runStep — resume detection behind leading session events', () => {
  test('the first NON-session event decides: a session then a resume failure still falls back', async () => {
    const fake = new FakeModelProvider([
      { session: 's1', text: 'one' },
      // Attempt 1 of step 2: the harness opens with a fresh session event
      // (Claude's `system/init`) and only then reports the dead session.
      { session: 'new', error: 'session not found' },
      { session: 'ok', text: 'recovered' },
    ]);
    const { id } = await store.create('default', {});

    await collect(runStep(deps([fake]), { threadId: id, message: 'first' }));
    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'second' }));

    expect(events.map(e => e.type)).toEqual(['text', 'done']);
    expect((events[0] as Extract<StepEvent, { type: 'text' }>).text).toBe('recovered');

    // The failed attempt's session id is discarded unread; the successful
    // one is what sticks.
    const { header } = await store.get('default', id);
    expect(header.sessions['fake/fake']).toBe('ok');

    // Exactly one warning, and the user turn is not duplicated.
    const { events: log } = await store.get('default', id);
    const warnings = log.filter(ev => 't' in ev && ev.t === 'warning');
    expect(warnings).toHaveLength(1);
    expect((warnings[0] as Extract<ThreadEvent, { t: 'warning' }>).message).toBe(RESUME_WARNING);
    expect(log.map(kindOf)).toEqual(['user', 'step', 'text', 'done', 'user', 'step', 'warning', 'text', 'done']);
    expect(log.filter(ev => 't' in ev && ev.t === 'user')).toHaveLength(2);

    // The replay sends the windowed history, not just the new turn.
    expect(fake.lastRequest!.session).toBeUndefined();
    expect(fake.lastRequest!.messages).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'one' },
      { role: 'user', content: 'second' },
    ]);
  });

  test('a failed attempt\'s session id is never written to disk at all', async () => {
    // Stronger than checking the final header: `clearSession` would erase an
    // eagerly-written id anyway, so the only way to prove the write was
    // deferred is to watch the writes themselves. A session id that briefly
    // lands on disk is a real hazard — a crash in the fallback would leave
    // the thread pinned to a session the vendor is already rejecting.
    const writes: string[] = [];
    class RecordingThreadStore extends ThreadStore {
      override async setSession(tenant: string, id: string, providerId: string, sessionId: string): Promise<void> {
        writes.push(sessionId);
        return super.setSession(tenant, id, providerId, sessionId);
      }
    }
    const recording = new RecordingThreadStore(vaultRoot, {
      codexHomeRoot: mkdtempSync(join(tmpdir(), 'loop-codex-')),
    });
    const fake = new FakeModelProvider([
      { session: 's1', text: 'one' },
      { session: 'new', error: 'session not found' },
      { session: 'ok', text: 'recovered' },
    ]);
    const { id } = await recording.create('default', {});
    const d = { ...deps([fake]), store: recording };

    await collect(runStep(d, { threadId: id, message: 'first' }));
    await collect(runStep(d, { threadId: id, message: 'second' }));

    expect(writes).toEqual(['s1', 'ok']);
    expect(writes).not.toContain('new');
  });

  test('a leading session event on a healthy step is still stored', async () => {
    const fake = new FakeModelProvider([{ session: 's1', text: 'ok' }]);
    const { id } = await store.create('default', {});

    await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));

    const { header } = await store.get('default', id);
    expect(header.sessions['fake/fake']).toBe('s1');
  });
});

/** A store whose `append` starts throwing after `failAfter` successful calls. */
class FlakyThreadStore extends ThreadStore {
  calls = 0;
  constructor(root: string, private readonly failAfter: number, opts?: { codexHomeRoot?: string }) {
    super(root, opts);
  }
  override async append(tenant: string, id: string, ev: ThreadEvent): Promise<void> {
    if (this.calls++ >= this.failAfter) throw new Error('disk full');
    return super.append(tenant, id, ev);
  }
}

describe('runStep — the caller always gets a terminal event', () => {
  test('a thread-log write failure on the step event ends the stream with an error', async () => {
    const fake = new FakeModelProvider([{ text: 'never' }]);
    const flaky = new FlakyThreadStore(vaultRoot, 1, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'loop-codex-')) });
    const { id } = await flaky.create('default', {});

    const events = await collect(runStep({ ...deps([fake]), store: flaky }, { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['error']);
    expect((events[0] as Extract<StepEvent, { type: 'error' }>).message).toContain('thread log write failed');
    expect((events[0] as Extract<StepEvent, { type: 'error' }>).message).toContain('disk full');
  });

  test('a thread-log write failure mid-stream ends the stream with an error', async () => {
    const fake = new FakeModelProvider([{ text: 'partial' }]);
    // user + step succeed; the first event append inside stream() throws.
    const flaky = new FlakyThreadStore(vaultRoot, 2, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'loop-codex-')) });
    const { id } = await flaky.create('default', {});

    const events = await collect(runStep({ ...deps([fake]), store: flaky }, { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['error']);
    expect((events[0] as Extract<StepEvent, { type: 'error' }>).message).toContain('thread log write failed');
  });

  test('a run-log write failure does not cost the caller its done event', async () => {
    const fake = new FakeModelProvider([{ text: 'fine' }]);
    // `.counsel/runs/default` cannot be created because `runs` is a file.
    mkdirSync(join(vaultRoot, '.counsel'), { recursive: true });
    writeFileSync(join(vaultRoot, '.counsel', 'runs'), 'not a directory', 'utf8');
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['text', 'done']);
  });
});

describe('runStep — context budget', () => {
  test('a system prompt that cannot fit the context window fails the step', async () => {
    const tiny: ModelProvider = {
      id: 'fake/tiny',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 10, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
      },
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([tiny]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['error']);
    expect((events[0] as Extract<StepEvent, { type: 'error' }>).message).toMatch(
      /system prompt exceeds the provider's context window \(\d+ > 10\)/,
    );
    expect(await logKinds(id)).toEqual(['user', 'step', 'error']);
  });
});

describe('runStep — run-log tool call tallies', () => {
  test('an unmatched tool_call is logged with a null duration and outcome', async () => {
    const orphan: ModelProvider = {
      id: 'fake/orphan',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        yield { type: 'tool_call', id: 'c1', name: 'vault_read', input: {} };
        // No tool_result for c1 — the harness dropped it.
        yield { type: 'tool_result', id: 'unknown', name: 'vault_search', output: 'x', isError: false };
        yield { type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } };
      },
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([orphan]), { threadId: id, message: 'hello' }));
    const runId = events[0]!.runId;
    const entry = JSON.parse(
      readFileSync(join(vaultRoot, '.counsel', 'runs', 'default', `${runId}.log.jsonl`), 'utf8').trim(),
    ) as RunLogEntry;

    // The result with no matching call: real outcome, unknown duration.
    expect(entry.toolCalls[0]).toEqual({ name: 'vault_search', ms: null, isError: false });
    // The call that never got a result: both unknown, but still recorded.
    expect(entry.toolCalls[1]).toEqual({ name: 'vault_read', ms: null, isError: null });
  });
});
