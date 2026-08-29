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
import { runStep, type CounselLoopDeps } from './counsel-loop';
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

    // Nothing from the abandoned attempt reached the log.
    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'done', 'user', 'step', 'text', 'done']);
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

  test('a codex-sub provider is rebound to the thread\'s persistent codex home', async () => {
    const homes: string[] = [];
    const fake = new FakeModelProvider([{ text: 'ok' }]);
    const codexish: ModelProvider & { withHome(dir: string): ModelProvider } = {
      id: 'codex-sub/gpt-5.6-terra',
      kind: 'harness',
      capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' },
      run: fake.run.bind(fake),
      withHome(dir: string) {
        homes.push(dir);
        return { ...this, run: fake.run.bind(fake) };
      },
    };
    const { id } = await store.create('default', {});

    await collect(runStep(deps([codexish]), { threadId: id, message: 'hello', providerId: 'codex-sub/gpt-5.6-terra' }));

    expect(homes).toEqual([store.codexHomeFor(id)]);
  });
});
