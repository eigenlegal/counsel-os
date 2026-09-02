import { describe, expect, test, beforeEach } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { FakeModelProvider } from '../core/fake-provider';
import type { ModelProvider, StepEvent } from '../core/types';
import { Router } from '../router/router';
import { ThreadStore, type ThreadEvent } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { runStep, withStepTimeout, RESUME_WARNING, type CounselLoopDeps } from './counsel-loop';
import type { RunLogEntry } from './run-log';
import { listRuns, readRun } from './run-record';

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
  test('(z) abandoning the step closes the provider — a hand-rolled next() loop does not forward it', async () => {
    let closed = false;
    const provider: ModelProvider = {
      id: 'endless/endless',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1_000_000, auth: 'local' },
      async *run() {
        try {
          yield { type: 'text', text: 'first' };
          yield { type: 'text', text: 'second' };
          yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
        } finally {
          closed = true;
        }
      },
    };
    const { id } = await store.create('default', {});

    const it = runStep(deps([provider]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    expect((await it.next()).value!.type).toBe('text');
    await it.return?.(undefined);

    expect(closed).toBe(true);
  });

  test('(z2) abandoning the step ABORTS the provider, so one parked on an await settles and unwinds', async () => {
    // Closing the iterator is not enough on its own. A real harness answers
    // `return()` only once the await it is parked on settles — here the
    // teardown every tier does on the way out — and the only thing that
    // settles that await is the request's signal. Without the abort the
    // bounded close waits out its whole budget and the provider is still
    // running when the step is reported over.
    let unwound = false;
    const abortable: ModelProvider = {
      id: 'abortable/abortable',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(req): AsyncIterable<StepEvent> {
        try {
          yield { type: 'text', text: 'a' };
        } finally {
          await new Promise<void>((_, reject) => {
            if (req.signal?.aborted) return reject(new Error('aborted'));
            req.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
          }).catch(() => {
            /* the abort IS how this settles */
          });
          unwound = true;
        }
      },
    };
    const { id } = await store.create('default', {});

    // The default 600 s deadline: nothing here may depend on it expiring.
    const it = runStep(deps([abortable]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    const first = await it.next();
    expect(first.value!.type).toBe('text');
    const startedAt = Date.now();
    await it.return?.(undefined);

    expect(unwound).toBe(true);
    // Not "eventually": the close budget alone is 2 s, so a pass here is the
    // abort and nothing else. The bound is 1 s, not the close budget: shared
    // CI runners jitter — this measured 117 ms on a GitHub runner and failed
    // — and 1 s is still 2x under the budget it has to tell apart.
    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(readRun(vaultRoot, 'default', first.value!.runId)!.status).toBe('abandoned');
  });

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

  test('(a3) a successful propose_update synthesizes a proposal StepEvent right after its tool_result, not logged twice', async () => {
    const fake = new FakeModelProvider([
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
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'propose it' }));

    expect(events.map(e => e.type)).toEqual(['tool_call', 'tool_result', 'proposal', 'text', 'done']);
    const proposalEvent = events.find(e => e.type === 'proposal') as Extract<StepEvent, { type: 'proposal' }> & {
      runId: string;
    };
    expect(proposalEvent.path).toBe('practice/standards/x.md');
    expect(proposalEvent.rationale).toBe('because');
    expect(proposalEvent.runId).toBe(events[0]!.runId);

    // The `id` matches the thread log's `proposal` ThreadEvent — the durable
    // record the tool itself wrote — and that ThreadEvent appears exactly
    // once: the synthesized StepEvent is yielded to the caller, not appended.
    expect(await logKinds(id)).toEqual(['user', 'step', 'tool_call', 'proposal', 'tool_result', 'text', 'done']);
    const { events: log } = await store.get('default', id);
    const loggedProposal = log.find(
      (ev): ev is Extract<ThreadEvent, { t: 'proposal' }> => 't' in ev && ev.t === 'proposal',
    )!;
    expect(proposalEvent.id).toBe(loggedProposal.id);
  });

  test('(a5) a successful apply_redlines synthesizes an artifact StepEvent after its tool_result; the thread keeps the durable artifact event', async () => {
    const { buildDocx } = await import('../docx/test/builder');
    mkdirSync(join(vaultRoot, 'matters'), { recursive: true });
    writeFileSync(join(vaultRoot, 'matters', 'nda.docx'), buildDocx({ blocks: [{ runs: ['Payment is due within 30 days.'] }] }));
    const fake = new FakeModelProvider([
      {
        toolCalls: [{ name: 'apply_redlines', input: { original: 'matters/nda.docx', items: [{ current: '30 days', proposed: '45 days', comment: 'Market.', author: 'Counsel OS' }], track: true } }],
        text: 'redlined',
      },
    ]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'redline it' }));

    expect(events.map(e => e.type)).toEqual(['tool_call', 'tool_result', 'artifact', 'text', 'done']);
    const artifact = events.find(e => e.type === 'artifact') as Extract<StepEvent, { type: 'artifact' }> & { runId: string };
    expect(artifact.path).toMatch(/^matters\/nda-redline-\d{4}-\d{2}-\d{2}\.docx$/);
    expect(artifact.kind).toBe('docx-redline');
    expect(artifact.summary).toMatchObject({ changes: 1, comments: 1, applied: 1, skipped: 0, clauses: 1 });
    expect(artifact.runId).toBe(events[0]!.runId);

    // Logged once, by the tool — the synthesized StepEvent is never appended.
    expect(await logKinds(id)).toEqual(['user', 'step', 'tool_call', 'artifact', 'tool_result', 'text', 'done']);
    const { events: log } = await store.get('default', id);
    const logged = log.find((ev): ev is Extract<ThreadEvent, { t: 'artifact' }> => 't' in ev && ev.t === 'artifact')!;
    expect(logged.id).toBe(artifact.id);
    expect(logged.source).toBe('matters/nda.docx');
    expect(logged.tracked).toBe(true);
  });

  test('(a4) an unsuccessful propose_update yields no proposal StepEvent', async () => {
    const fake = new FakeModelProvider([
      { toolCalls: [{ name: 'propose_update', input: { path: 'not/a/knowledge/path.md' } }], text: 'nope' },
    ]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'propose it' }));

    expect(events.map(e => e.type)).not.toContain('proposal');
    const result = events.find(e => e.type === 'tool_result') as Extract<StepEvent, { type: 'tool_result' }>;
    expect(result.isError).toBe(true);
  });

  test('(a5) propose_update output as a JSON string (the Codex/MCP round-trip) still synthesizes the proposal event', async () => {
    // Hand-rolled, like the timeout fakes above: yields the raw tool_call /
    // tool_result / done sequence directly, so `output` can be shaped
    // exactly as a stdio harness would round-trip it — a JSON string, not
    // the object `runToolDef` hands back in-process.
    const provider: ModelProvider = {
      id: 'stringout/stringout',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1_000_000, auth: 'local' },
      async *run() {
        yield {
          type: 'tool_call',
          id: 'c1',
          name: 'propose_update',
          input: { path: 'practice/standards/x.md', content: 'NEW\n', rationale: 'because' },
        };
        yield {
          type: 'tool_result',
          id: 'c1',
          name: 'propose_update',
          output: JSON.stringify({ proposalId: 'p-1' }),
          isError: false,
        };
        yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
      },
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([provider]), { threadId: id, message: 'propose it' }));

    expect(events.map(e => e.type)).toEqual(['tool_call', 'tool_result', 'proposal', 'done']);
    const proposalEvent = events.find(e => e.type === 'proposal') as Extract<StepEvent, { type: 'proposal' }>;
    expect(proposalEvent.id).toBe('p-1');
    expect(proposalEvent.path).toBe('practice/standards/x.md');
    expect(proposalEvent.rationale).toBe('because');

    // This hand-rolled provider never ran `proposeUpdateTool.execute` — it
    // emitted the tool_call/tool_result shape directly — so there is no
    // `proposal` ThreadEvent to begin with; the log holds only what
    // `stream()` itself appends, and the synthesized StepEvent is not among
    // them.
    expect(await logKinds(id)).toEqual(['user', 'step', 'tool_call', 'tool_result', 'done']);
  });

  test('(a6) propose_update output that fails to parse yields no proposal event, and the step still completes with done', async () => {
    const badOutputs: unknown[] = ['not json', { nope: 1 }];
    let call = 0;
    const provider: ModelProvider = {
      id: 'badout/badout',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1_000_000, auth: 'local' },
      async *run() {
        const output = badOutputs[call++];
        yield {
          type: 'tool_call',
          id: 'c1',
          name: 'propose_update',
          input: { path: 'practice/standards/x.md', content: 'NEW\n', rationale: 'because' },
        };
        yield { type: 'tool_result', id: 'c1', name: 'propose_update', output, isError: false };
        yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
      },
    };
    const { id } = await store.create('default', {});

    for (let i = 0; i < badOutputs.length; i++) {
      const events = await collect(runStep(deps([provider]), { threadId: id, message: 'propose it' }));
      expect(events.map(e => e.type)).toEqual(['tool_call', 'tool_result', 'done']);
      expect(events.some(e => e.type === 'proposal')).toBe(false);
    }
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

  test('(f) a router hard error yields a single error, with nothing appended — the provider is chosen before the user turn is written', async () => {
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
    expect(await logKinds(id)).toEqual([]);
    expect(fake.lastRequest).toBeUndefined();
  });

  test('(f2) an unknown explicit provider id yields a single error', async () => {
    const fake = new FakeModelProvider([{ text: 'never' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hi', providerId: 'nope/nope' }));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('error');
    expect(await logKinds(id)).toEqual([]);
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

    // The `text` reaches the caller before it is logged — deliberately, so a
    // streaming client never waits on a disk write — so the failure shows up
    // on the flush that follows it rather than in place of it. What matters
    // is that the stream still ends on a terminal `error`.
    expect(events.map(e => e.type)).toEqual(['text', 'error']);
    const last = events[events.length - 1] as Extract<StepEvent, { type: 'error' }>;
    expect(last.message).toContain('thread log write failed');
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

describe('runStep — the step clock', () => {
  test('durationMs covers the whole turn, including the wait for the first event', async () => {
    // The harness tiers produce nothing at all until the model turn is over,
    // so a clock started after the first event measures almost nothing. This
    // provider reproduces that shape: a 60 ms wait, then the events.
    const slow: ModelProvider = {
      id: 'fake/slow',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        await new Promise(r => setTimeout(r, 60));
        yield { type: 'text', text: 'late' };
        yield { type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } };
      },
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([slow]), { threadId: id, message: 'hello' }));
    const runId = events[0]!.runId;
    const entry = JSON.parse(
      readFileSync(join(vaultRoot, '.counsel', 'runs', 'default', `${runId}.log.jsonl`), 'utf8').trim(),
    ) as RunLogEntry;

    expect(entry.durationMs).toBeGreaterThanOrEqual(50);
  });
});

describe('runStep — logged text coalescing', () => {
  /** The `text` events in a thread's log, in order. */
  async function loggedText(threadId: string): Promise<string[]> {
    const { events } = await store.get('default', threadId);
    return events.filter(ev => 'type' in ev && ev.type === 'text').map(ev => (ev as { text: string }).text);
  }

  function streaming(script: StepEvent[]): ModelProvider {
    return {
      id: 'fake/streaming',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        for (const ev of script) yield ev;
      },
    };
  }

  test('a run of text deltas becomes one logged text event, but still streams as three', async () => {
    const provider = streaming([
      { type: 'text', text: 'a' },
      { type: 'text', text: 'b' },
      { type: 'text', text: 'c' },
      { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } },
    ]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([provider]), { threadId: id, message: 'hello' }));

    // The caller still sees every delta as it arrives.
    expect(events.map(e => e.type)).toEqual(['text', 'text', 'text', 'done']);
    expect(await loggedText(id)).toEqual(['abc']);
    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'done']);
  });

  test('a non-text event between two runs of text keeps them separate', async () => {
    const provider = streaming([
      { type: 'text', text: 'a' },
      { type: 'tool_call', id: 'c1', name: 'vault_read', input: { path: 'x.md' } },
      { type: 'tool_result', id: 'c1', name: 'vault_read', output: 'x', isError: false },
      { type: 'text', text: 'b' },
      { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } },
    ]);
    const { id } = await store.create('default', {});

    await collect(runStep(deps([provider]), { threadId: id, message: 'hello' }));

    expect(await loggedText(id)).toEqual(['a', 'b']);
    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'tool_call', 'tool_result', 'text', 'done']);
  });

  test('an abandoned step still leaves its buffered text in the log', async () => {
    // The SSE layer's `cancel()` reaches this generator as `return()`, which
    // unwinds it at the `yield` in the text branch — so nothing after the
    // loop runs. Without the `finally` flush the deltas the user already saw
    // would be missing from the transcript entirely.
    const provider = streaming([
      { type: 'text', text: 'a' },
      { type: 'text', text: 'b' },
    ]);
    const stalling: ModelProvider = {
      ...provider,
      async *run(): AsyncIterable<StepEvent> {
        yield { type: 'text', text: 'a' };
        yield { type: 'text', text: 'b' };
        // The client hangs up here, mid-turn: the step is still in flight.
        await new Promise(r => setTimeout(r, 10_000));
        yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
      },
    };
    const { id } = await store.create('default', {});

    const it = runStep(deps([stalling]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    expect((await it.next()).value!.type).toBe('text');
    expect((await it.next()).value!.type).toBe('text');
    await it.return?.(undefined);

    expect(await loggedText(id)).toEqual(['ab']);
    expect(await logKinds(id)).toEqual(['user', 'step', 'text']);
  });

  test('text with no terminal event still reaches the log', async () => {
    const provider = streaming([
      { type: 'text', text: 'a' },
      { type: 'text', text: 'b' },
    ]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([provider]), { threadId: id, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['text', 'text', 'error']);
    expect(await loggedText(id)).toEqual(['ab']);
    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'error']);
  });
});

describe('runStep — step timeout', () => {
  /**
   * A provider that emits `script` and then hangs forever: the shape of a
   * wedged harness, where the process is alive and the stream is open but
   * nothing more ever arrives.
   *
   * Hand-rolled rather than an `async function*` on purpose. `return()` on an
   * async generator that is parked on a never-resolving `await` is queued
   * behind that await, so it never runs and never settles — a generator fake
   * could not report being closed at all. That is also why the loop fires the
   * close without waiting for it (see `closeWithoutWaiting`).
   */
  function hangingProvider(script: StepEvent[]): ModelProvider & { closed: boolean } {
    const provider = {
      id: 'hang/hang',
      kind: 'direct' as const,
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' as const },
      closed: false,
      run(): AsyncIterable<StepEvent> {
        let i = 0;
        return {
          [Symbol.asyncIterator]: () => ({
            next: (): Promise<IteratorResult<StepEvent>> => {
              const ev = script[i++];
              if (ev) return Promise.resolve({ value: ev, done: false });
              return new Promise<IteratorResult<StepEvent>>(() => {});
            },
            return: async (): Promise<IteratorResult<StepEvent>> => {
              provider.closed = true;
              return { value: undefined, done: true };
            },
          }),
        };
      },
    };
    return provider;
  }

  function terminal(events: Array<StepEvent & { runId: string }>): StepEvent {
    return events[events.length - 1]!;
  }

  test('a provider that hangs mid-step ends the step with one terminal error', async () => {
    const provider = hangingProvider([{ type: 'text', text: 'a' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([provider]), { threadId: id, message: 'hello', timeoutMs: 50 }));

    expect(events.map(e => e.type)).toEqual(['text', 'error']);
    expect((terminal(events) as Extract<StepEvent, { type: 'error' }>).message).toMatch(/^step timed out after \d+s$/);
    // The partial answer the user already saw is in the transcript, and the
    // step is closed out with the error — not left dangling.
    expect(await logKinds(id)).toEqual(['user', 'step', 'text', 'error']);
    // The provider is released, not left streaming into nothing.
    expect(provider.closed).toBe(true);
  });

  test('the deadline covers the wait for the first event — a provider that never yields at all', async () => {
    const provider = hangingProvider([]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([provider]), { threadId: id, message: 'hello', timeoutMs: 50 }));

    expect(events.map(e => e.type)).toEqual(['error']);
    expect((terminal(events) as Extract<StepEvent, { type: 'error' }>).message).toMatch(/timed out after/);
    expect(await logKinds(id)).toEqual(['user', 'step', 'error']);
    expect(provider.closed).toBe(true);
  });

  test('deps.stepTimeoutMs applies when the caller names no timeout, and the caller overrides it', async () => {
    const byDeps = hangingProvider([]);
    const a = await store.create('default', {});
    const events = await collect(
      runStep({ ...deps([byDeps]), stepTimeoutMs: 50 }, { threadId: a.id, message: 'hello' }),
    );
    expect(events.map(e => e.type)).toEqual(['error']);

    // A per-step timeout wins over the dep — here a short one over a long one,
    // so the assertion cannot pass by waiting.
    const byOpts = hangingProvider([]);
    const b = await store.create('default', {});
    const overridden = await collect(
      runStep({ ...deps([byOpts]), stepTimeoutMs: 600_000 }, { threadId: b.id, message: 'hello', timeoutMs: 50 }),
    );
    expect(overridden.map(e => e.type)).toEqual(['error']);
  });

  /** Long enough for an abort's unwind (a microtask) to have happened. */
  const settle = (): Promise<void> => new Promise(r => setTimeout(r, 20));

  test('the timeout ABORTS the provider, so an SDK-shaped generator unwinds and its finally runs', async () => {
    let unwound = false;
    const abortable: ModelProvider = {
      id: 'abortable/abortable',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(req): AsyncIterable<StepEvent> {
        try {
          yield { type: 'text', text: 'a' };
          // The shape of every real tier: one long await on the SDK, which
          // settles when the request's signal fires.
          await new Promise((_, reject) => {
            req.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
          });
        } finally {
          unwound = true;
        }
      },
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([abortable]), { threadId: id, message: 'hello', timeoutMs: 50 }));

    expect(events.map(e => e.type)).toEqual(['text', 'error']);
    await settle();
    // The provider actually stopped: on a real tier this is the harness child
    // process dying and the HTTP response closing, not just us looking away.
    expect(unwound).toBe(true);
  });

  test('a provider that ignores the signal cannot be unwound — and the step still ends on time', async () => {
    // The limitation the close is fired-not-awaited for: `return()` on an
    // async generator parked on an await that nothing settles is queued
    // behind that await forever, so this `finally` never runs. The step must
    // not wait for it.
    let unwound = false;
    const deaf: ModelProvider = {
      id: 'deaf/deaf',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        try {
          yield { type: 'text', text: 'a' };
          await new Promise(() => {});
        } finally {
          unwound = true;
        }
      },
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([deaf]), { threadId: id, message: 'hello', timeoutMs: 50 }));

    expect(events.map(e => e.type)).toEqual(['text', 'error']);
    await settle();
    expect(unwound).toBe(false);
  });

  test('a provider whose close never settles cannot wedge the step', async () => {
    // `return()` that never resolves — a harness waiting on a child process
    // that will not exit. An unbounded `await closeQuietly` here would hold
    // the caller (and the server's thread lock) forever.
    const stuck: ModelProvider = {
      id: 'stuck/stuck',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      run: (): AsyncIterable<StepEvent> => {
        let sent = false;
        return {
          [Symbol.asyncIterator]: () => ({
            next: (): Promise<IteratorResult<StepEvent>> => {
              if (sent) return new Promise<IteratorResult<StepEvent>>(() => {});
              sent = true;
              return Promise.resolve({ value: { type: 'text', text: 'a' }, done: false });
            },
            return: (): Promise<IteratorResult<StepEvent>> => new Promise(() => {}),
          }),
        };
      },
    };
    const { id } = await store.create('default', {});

    // The close budget is `min(2000, what is left of the step)`, so a short
    // step timeout bounds it tightly.
    const it = runStep(deps([stuck]), { threadId: id, message: 'hello', timeoutMs: 300 })[Symbol.asyncIterator]();
    expect((await it.next()).value!.type).toBe('text');
    const startedAt = Date.now();
    await it.return?.(undefined);

    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  test('a provider that fails after the deadline does not take the process down', async () => {
    // The abandoned read rejects 80 ms in, long after the 20 ms deadline —
    // by then nothing is waiting on it, and an unhandled rejection would be
    // fatal rather than a failed step.
    const dying: ModelProvider = {
      id: 'dying/dying',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      run: (): AsyncIterable<StepEvent> => ({
        [Symbol.asyncIterator]: () => ({
          next: (): Promise<IteratorResult<StepEvent>> =>
            new Promise((_, reject) => setTimeout(() => reject(new Error('provider died')), 80)),
        }),
      }),
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([dying]), { threadId: id, message: 'hello', timeoutMs: 20 }));

    expect(events.map(e => e.type)).toEqual(['error']);
    // Outlive the rejection: an unhandled one surfaces after this test ends.
    await new Promise(r => setTimeout(r, 120));
  });

  test('withStepTimeout puts the same deadline on a raw provider stream (the CLI path)', async () => {
    const provider = hangingProvider([{ type: 'text', text: 'a' }]);

    const seen: StepEvent[] = [];
    const req = { tenant: 'default', system: '', messages: [], tools: [] };
    for await (const ev of withStepTimeout(provider.run(req), 50)) seen.push(ev);

    expect(seen.map(e => e.type)).toEqual(['text', 'error']);
    expect((seen[1] as Extract<StepEvent, { type: 'error' }>).message).toMatch(/timed out after/);
    expect(provider.closed).toBe(true);
  });

  test('withStepTimeout passes a stream that finishes in time straight through', async () => {
    const fake = new FakeModelProvider([{ text: 'hi' }]);
    const req = { tenant: 'default', system: '', messages: [], tools: [] };
    const seen: StepEvent[] = [];
    for await (const ev of withStepTimeout(fake.run(req), 600_000)) seen.push(ev);
    expect(seen.map(e => e.type)).toEqual(['text', 'done']);
  });

  test('a step that finishes normally is unaffected (and leaves no live timer behind)', async () => {
    // Every other test in this suite runs on the 600 s default; if the
    // deadline timer were not cancelled when the step ends, `bun test` would
    // hang for ten minutes after the last assertion.
    const fake = new FakeModelProvider([{ text: 'hi' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello', timeoutMs: 600_000 }));

    expect(events.map(e => e.type)).toEqual(['text', 'done']);
  });

  test('a done with a slow tail behind it ends the step — one terminal event, not a timeout on top of it', async () => {
    // The provider answered. What is left is teardown the caller must not be
    // billed for: reading on would race the deadline against a tail that owes
    // the caller nothing, and append a `timeout` error behind a finished step.
    // Both doors are tested: a `done` that arrives as the step's first event,
    // and one that arrives mid-stream, where the deadline race lives.
    function trailingDone(lead: StepEvent[]): ModelProvider {
      return {
        id: 'trailing/trailing',
        kind: 'direct',
        capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
        async *run(): AsyncIterable<StepEvent> {
          for (const ev of lead) yield ev;
          yield { type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } };
          // Ends 150 ms later — well past the 50 ms deadline below.
          await new Promise(r => setTimeout(r, 150));
        },
      };
    }

    const first = await store.create('default', {});
    const firstEvents = await collect(
      runStep(deps([trailingDone([])]), { threadId: first.id, message: 'hello', timeoutMs: 50 }),
    );
    expect(firstEvents.map(e => e.type)).toEqual(['done']);
    expect(await logKinds(first.id)).toEqual(['user', 'step', 'done']);
    expect(readRun(vaultRoot, 'default', firstEvents[0]!.runId)!.status).toBe('done');

    const mid = await store.create('default', {});
    const midEvents = await collect(
      runStep(deps([trailingDone([{ type: 'text', text: 'a' }])]), {
        threadId: mid.id,
        message: 'hello',
        timeoutMs: 50,
      }),
    );
    expect(midEvents.map(e => e.type)).toEqual(['text', 'done']);
    expect(await logKinds(mid.id)).toEqual(['user', 'step', 'text', 'done']);
    expect(readRun(vaultRoot, 'default', midEvents[0]!.runId)!.status).toBe('done');
  });

  test('a deadline that passes during the resume fallback does not start a second attempt', async () => {
    // Clearing the dead session is a disk write, and it can outlast what is
    // left of the step. Calling the provider again then would hand it an
    // already-aborted signal: a run that can only produce the timeout the
    // caller is owed anyway.
    let runs = 0;
    const provider: ModelProvider = {
      id: 'resume/resume',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        runs++;
        yield { type: 'error', message: 'session not found' };
      },
    };
    class SlowClearStore extends ThreadStore {
      override async clearSession(tenant: string, id: string, providerId: string): Promise<void> {
        await new Promise(r => setTimeout(r, 60));
        return super.clearSession(tenant, id, providerId);
      }
    }
    const slow = new SlowClearStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'loop-codex-')) });
    const { id } = await slow.create('default', {});
    await slow.setSession('default', id, provider.id, 'dead-session');

    const events = await collect(
      runStep({ ...deps([provider]), store: slow }, { threadId: id, message: 'hello', timeoutMs: 30 }),
    );

    expect(events.map(e => e.type)).toEqual(['error']);
    expect((events[0] as Extract<StepEvent, { type: 'error' }>).message).toMatch(/^step timed out after \d+s$/);
    expect(runs).toBe(1);
    // The fallback still did its half: the dead session is gone and the
    // warning is in the transcript.
    expect(await logKinds(id)).toEqual(['user', 'step', 'warning', 'error']);
    const { header } = await slow.get('default', id);
    expect(header.sessions[provider.id]).toBeUndefined();
    expect(readRun(vaultRoot, 'default', events[0]!.runId)!.status).toBe('timeout');
  });
});

describe('runStep — the run record', () => {
  /** A provider that emits `script`, then parks until `release()` is called. */
  function pausing(script: StepEvent[]): { provider: ModelProvider; release: () => void } {
    let release!: () => void;
    const parked = new Promise<void>(resolve => {
      release = resolve;
    });
    return {
      release,
      provider: {
        id: 'paused/paused',
        kind: 'direct',
        capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
        async *run(): AsyncIterable<StepEvent> {
          for (const ev of script) yield ev;
          await parked;
          yield { type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } };
        },
      },
    };
  }

  /** A provider that yields `script` and then never says anything again. */
  function hanging(script: StepEvent[]): ModelProvider {
    return {
      id: 'hang/hang',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        for (const ev of script) yield ev;
        await new Promise(() => {});
      },
    };
  }

  test('a step that finishes writes a done record: what it read, ran, proposed, produced, and cost', async () => {
    const fake = new FakeModelProvider([
      {
        toolCalls: [
          { name: 'read_primitive', input: { name: 'draft' } },
          { name: 'read_primitive', input: { name: 'draft' } },
          { name: 'read_primitive', input: { name: 'evaluate' } },
          { name: 'propose_update', input: { path: 'practice/standards/nda.md', content: 'x', rationale: 'because' } },
        ],
        text: 'drafted',
        usage: { inputTokens: 12, outputTokens: 34, costUsd: 0.5 },
      },
    ]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'draft it', task: 'draft' }));
    const runId = events[0]!.runId;
    const rec = readRun(vaultRoot, 'default', runId)!;

    expect(rec.runId).toBe(runId);
    expect(rec.threadId).toBe(id);
    expect(rec.tenant).toBe('default');
    expect(rec.status).toBe('done');
    expect(rec.message).toBe('draft it');
    expect(rec.task).toBe('draft');
    expect(rec.provider).toBe('fake/fake');
    expect(typeof rec.startedAt).toBe('string');
    expect(typeof rec.finishedAt).toBe('string');
    expect(rec.durationMs).toBeGreaterThanOrEqual(0);
    expect(rec.usage).toEqual({ inputTokens: 12, outputTokens: 34, costUsd: 0.5 });
    expect(rec.costUsd).toBe(0.5);
    expect(rec.error).toBeUndefined();

    // Unique, in first-read order — the same primitive read twice is one entry.
    expect(rec.primitivesRead).toEqual(['draft', 'evaluate']);
    // Every tool call, the same list the run log gets.
    expect(rec.toolCalls.map(c => c.name)).toEqual([
      'read_primitive',
      'read_primitive',
      'read_primitive',
      'propose_update',
    ]);
    // The proposal the step raised, by the id the `proposal` event carried.
    const proposal = events.find(e => e.type === 'proposal') as Extract<StepEvent, { type: 'proposal' }>;
    expect(rec.proposals).toEqual([proposal.id]);
  });

  test('the record is open and `running` while the step is still going, with the provider filled in', async () => {
    const { provider, release } = pausing([{ type: 'text', text: 'thinking' }]);
    const { id } = await store.create('default', {});

    const it = runStep(deps([provider]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    const first = await it.next();
    const runId = first.value!.runId;

    const mid = readRun(vaultRoot, 'default', runId)!;
    expect(mid.status).toBe('running');
    expect(mid.provider).toBe('paused/paused');
    expect(mid.message).toBe('hello');
    expect(mid.finishedAt).toBeUndefined();
    expect(listRuns(vaultRoot, 'default', id).map(r => r.runId)).toEqual([runId]);

    release();
    while (!(await it.next()).done) { /* drain */ }
    expect(readRun(vaultRoot, 'default', runId)!.status).toBe('done');
  });

  test('output is recorded only when the step asked for a structured answer', async () => {
    const script = [{ output: { findings: [] }, usage: { inputTokens: 1, outputTokens: 2 } }];

    const untyped = await collect(
      runStep(deps([new FakeModelProvider(script)]), { threadId: (await store.create('default', {})).id, message: 'hi' }),
    );
    expect(readRun(vaultRoot, 'default', untyped[0]!.runId)!.output).toBeUndefined();

    const typed = await collect(
      runStep(deps([new FakeModelProvider(script)]), {
        threadId: (await store.create('default', {})).id,
        message: 'hi',
        outputSchema: z.object({ findings: z.array(z.string()) }),
      }),
    );
    expect(readRun(vaultRoot, 'default', typed[0]!.runId)!.output).toEqual({ findings: [] });
  });

  test('a provider error finalizes the record as error, with the message', async () => {
    const fake = new FakeModelProvider([{ text: 'partial', error: 'the model gave up' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.status).toBe('error');
    expect(rec.error).toBe('the model gave up');
    expect(typeof rec.finishedAt).toBe('string');
  });

  test('a provider error that carries the raw answer records it under errorText', async () => {
    // The typed-answer fallback (web-ui spec §4.3): the message says WHAT
    // went wrong, `errorText` keeps what the model actually said.
    const raw: ModelProvider = {
      id: 'raw/raw',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        yield { type: 'error', message: 'structured output failed validation: bad', text: 'I think the answer is 42.' };
      },
    };
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([raw]), { threadId: id, message: 'hello' }));
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.status).toBe('error');
    expect(rec.error).toBe('structured output failed validation: bad');
    expect(rec.errorText).toBe('I think the answer is 42.');
    // The caller sees the text too — the SSE layer forwards it verbatim.
    expect((events.at(-1) as { text?: string }).text).toBe('I think the answer is 42.');
  });

  test('a provider error with no raw answer leaves errorText unset', async () => {
    const fake = new FakeModelProvider([{ error: 'the model gave up' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.errorText).toBeUndefined();
  });

  test('a timed-out step is `timeout`, not `error` — the two read differently to an operator', async () => {
    const { id } = await store.create('default', {});

    const events = await collect(
      runStep(deps([hanging([{ type: 'text', text: 'a' }])]), { threadId: id, message: 'hello', timeoutMs: 50 }),
    );
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.status).toBe('timeout');
    expect(rec.error).toMatch(/^step timed out after \d+s$/);
    expect(typeof rec.finishedAt).toBe('string');
  });

  test('a tool call that never came back is in the record, with its duration and outcome unknown', async () => {
    const { id } = await store.create('default', {});
    const orphan = hanging([{ type: 'tool_call', id: 'c1', name: 'vault_read', input: {} }]);

    const events = await collect(runStep(deps([orphan]), { threadId: id, message: 'hello', timeoutMs: 50 }));
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.toolCalls).toEqual([{ name: 'vault_read', ms: null, isError: null }]);
  });

  test('a step that dies before a provider is chosen still leaves a record', async () => {
    const { id } = await store.create('default', {});

    const events = await collect(
      runStep(deps([new FakeModelProvider([])]), { threadId: id, message: 'hello', providerId: 'nope/nope' }),
    );
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.status).toBe('error');
    expect(rec.error).toBe('unknown provider: nope/nope');
    // Nothing resolved, so nothing to name.
    expect(rec.provider).toBe('');
  });

  test('an unknown thread leaves no record — there was no run to record', async () => {
    const missing = randomUUID();
    const events = await collect(runStep(deps([new FakeModelProvider([])]), { threadId: missing, message: 'hello' }));

    expect(events.map(e => e.type)).toEqual(['error']);
    expect(readRun(vaultRoot, 'default', events[0]!.runId)).toBeNull();
  });

  test('the run record does not replace the run log — both are written', async () => {
    const fake = new FakeModelProvider([{ text: 'hi', usage: { inputTokens: 1, outputTokens: 2 } }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));
    const runId = events[0]!.runId;

    expect(readRun(vaultRoot, 'default', runId)).not.toBeNull();
    const log = JSON.parse(
      readFileSync(join(vaultRoot, '.counsel', 'runs', 'default', `${runId}.log.jsonl`), 'utf8').trim(),
    ) as RunLogEntry;
    expect(log.provider).toBe('fake/fake');
  });

  test('a caller that cancels the INSTANT it has the `done` records a done run, not an abandoned one', async () => {
    // What a real browser does: it cancels the SSE response the moment the
    // `done` frame lands, and never asks for another event. The cancel
    // reaches the generator as `return()` parked AT the yield of that `done`,
    // so anything the loop leaves until after that yield never runs — which
    // is how five finished steps on a live vault came back `abandoned`.
    const fake = new FakeModelProvider([{ text: 'hi', usage: { inputTokens: 12, outputTokens: 34, costUsd: 0.5 } }]);
    const { id } = await store.create('default', {});

    const it = runStep(deps([fake]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    let last: (StepEvent & { runId: string }) | undefined;
    for (;;) {
      const step = await it.next();
      if (step.done) throw new Error('the step ended without a terminal event');
      last = step.value;
      if (last.type === 'done' || last.type === 'error') break;
    }
    expect(last!.type).toBe('done');
    // The browser shape: hang up on the terminal frame, never pull again.
    await it.return?.(undefined);

    const rec = readRun(vaultRoot, 'default', last!.runId)!;
    expect(rec.status).toBe('done');
    expect(rec.error).toBeUndefined();
    // The telemetry the step actually earned, not an empty husk.
    expect(rec.usage).toEqual({ inputTokens: 12, outputTokens: 34, costUsd: 0.5 });
    expect(rec.costUsd).toBe(0.5);
    expect(typeof rec.finishedAt).toBe('string');
    // The run log is written on the same path, so it lands too.
    const log = JSON.parse(
      readFileSync(join(vaultRoot, '.counsel', 'runs', 'default', `${last!.runId}.log.jsonl`), 'utf8').trim(),
    ) as RunLogEntry;
    expect(log.inputTokens).toBe(12);
  });

  test('a caller that cancels the instant it has the `error` records an error run, not an abandoned one', async () => {
    const fake = new FakeModelProvider([{ error: 'the model gave up' }]);
    const { id } = await store.create('default', {});

    const it = runStep(deps([fake]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    let last: (StepEvent & { runId: string }) | undefined;
    for (;;) {
      const step = await it.next();
      if (step.done) throw new Error('the step ended without a terminal event');
      last = step.value;
      if (last.type === 'done' || last.type === 'error') break;
    }
    expect(last!.type).toBe('error');
    await it.return?.(undefined);

    const rec = readRun(vaultRoot, 'default', last!.runId)!;
    expect(rec.status).toBe('error');
    expect(rec.error).toBe('the model gave up');
  });

  test('a caller that hangs up mid-step leaves an abandoned record, not one stuck at running', async () => {
    // The routine case: an SSE client closes its tab. Nothing failed, but the
    // record must not read as `running` — that now means the process died.
    const { provider } = pausing([
      { type: 'text', text: 'thinking' },
      { type: 'tool_call', id: 'c1', name: 'read_primitive', input: { name: 'draft' } },
    ]);
    const { id } = await store.create('default', {});

    const it = runStep(deps([provider]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    const first = await it.next();
    await it.next();
    await it.return?.(undefined);

    const rec = readRun(vaultRoot, 'default', first.value!.runId)!;
    expect(rec.status).toBe('abandoned');
    expect(rec.error).toBe('the caller abandoned the step');
    expect(typeof rec.finishedAt).toBe('string');
    expect(rec.durationMs).toBeGreaterThanOrEqual(0);
    // What the step had done by then is still recorded.
    expect(rec.primitivesRead).toEqual(['draft']);
  });

  test('a caller that hangs up during the step SETUP still ends abandoned', async () => {
    // Nothing yields during the setup — the user append, the router, the
    // prompt assembly — so the guard has to be in scope for all of it, not
    // just from the provider onward.
    class SlowStore extends ThreadStore {
      override async append(tenant: string, id: string, ev: ThreadEvent): Promise<void> {
        await new Promise(r => setTimeout(r, 50));
        return super.append(tenant, id, ev);
      }
    }
    const slow = new SlowStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'loop-codex-')) });
    const { id } = await slow.create('default', {});

    const it = runStep({ ...deps([new FakeModelProvider([{ text: 'hi' }])]), store: slow }, {
      threadId: id,
      message: 'hello',
    })[Symbol.asyncIterator]();
    // Kick the step off — it parks on the user-turn append — then walk away.
    const pull = it.next();
    await new Promise(r => setTimeout(r, 10));
    await it.return?.(undefined);
    await pull;

    const [rec] = listRuns(vaultRoot, 'default', id);
    expect(rec!.status).toBe('abandoned');
    expect(typeof rec!.finishedAt).toBe('string');
  });

  test('a thread-store read that throws during setup is an error record, not `running`', async () => {
    // `replay()` reads the log outside any of the setup's own try/catches; a
    // failure there escapes as an exception. The record must not be left
    // saying the step is still going.
    class BrokenStore extends ThreadStore {
      reads = 0;
      override async get(tenant: string, id: string): ReturnType<ThreadStore['get']> {
        // The existence check reads the header alone (`store.header`), so
        // `get` runs twice: 1: the header read for the prompt. 2: the window
        // replay.
        if (++this.reads === 2) throw new Error('log read failed');
        return super.get(tenant, id);
      }
    }
    const broken = new BrokenStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'loop-codex-')) });
    const { id } = await broken.create('default', {});

    const d = { ...deps([new FakeModelProvider([{ text: 'hi' }])]), store: broken };
    await expect(collect(runStep(d, { threadId: id, message: 'hello' }))).rejects.toThrow('log read failed');

    const [rec] = listRuns(vaultRoot, 'default', id);
    expect(rec!.status).toBe('error');
    expect(rec!.error).toBe('log read failed');
  });

  test('a provider that THROWS is an error record, not an abandoned one', async () => {
    // The `finally` that marks abandonment also runs when an exception
    // unwinds the step. A provider that threw instead of yielding an `error`
    // failed; nobody walked away.
    const exploding: ModelProvider = {
      id: 'boom/boom',
      kind: 'direct',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 100_000, auth: 'local' },
      async *run(): AsyncIterable<StepEvent> {
        yield { type: 'text', text: 'a' };
        throw new Error('provider exploded');
      },
    };
    const { id } = await store.create('default', {});

    const it = runStep(deps([exploding]), { threadId: id, message: 'hello' })[Symbol.asyncIterator]();
    const runId = (await it.next()).value!.runId;
    await expect(it.next()).rejects.toThrow('provider exploded');

    const rec = readRun(vaultRoot, 'default', runId)!;
    expect(rec.status).toBe('error');
    expect(rec.error).toBe('provider exploded');
  });

  test('a step that ran to completion is NOT re-marked abandoned on the way out', async () => {
    // The `finally` that marks abandonment runs on every exit, the normal one
    // included; a finalized record must survive it untouched.
    const fake = new FakeModelProvider([{ text: 'hi', usage: { inputTokens: 1, outputTokens: 2 } }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.status).toBe('done');
    expect(rec.error).toBeUndefined();
  });

  test('a step that ended in an error is not re-marked abandoned either', async () => {
    const fake = new FakeModelProvider([{ error: 'the model gave up' }]);
    const { id } = await store.create('default', {});

    const events = await collect(runStep(deps([fake]), { threadId: id, message: 'hello' }));
    const rec = readRun(vaultRoot, 'default', events[0]!.runId)!;

    expect(rec.status).toBe('error');
    expect(rec.error).toBe('the model gave up');
  });

  test('every run of a thread is listed, newest first', async () => {
    const fake = new FakeModelProvider([{ text: 'one' }, { text: 'two' }]);
    const { id } = await store.create('default', {});

    const first = await collect(runStep(deps([fake]), { threadId: id, message: 'first' }));
    // The records are ordered by `startedAt`, an ISO timestamp: two steps
    // inside the same millisecond would tie.
    await new Promise(r => setTimeout(r, 2));
    const second = await collect(runStep(deps([fake]), { threadId: id, message: 'second' }));

    expect(listRuns(vaultRoot, 'default', id).map(r => r.runId)).toEqual([second[0]!.runId, first[0]!.runId]);
  });
});

describe('the matter privacy policy (providers spec §7)', () => {
  function cloud(id = 'anthropic/cloud'): ModelProvider {
    const fake = new FakeModelProvider([{ text: 'from the cloud' }]);
    return { id, kind: 'direct', capabilities: { ...fake.capabilities, auth: 'apikey' }, run: req => fake.run(req) };
  }
  function local(id = 'ollama/local'): ModelProvider {
    const fake = new FakeModelProvider([{ text: 'from this machine' }]);
    return { id, kind: 'direct', capabilities: { ...fake.capabilities, auth: 'local' }, run: req => fake.run(req) };
  }

  test('a linked matter that stays local runs on the best local provider, and the record says so', async () => {
    await vault.write('default', 'matters/acme.md', '---\nstays_local: true\n---\n# Acme\n');
    const providers = [cloud(), local()];
    const { id } = await store.create('default', { matter: 'matters/acme.md' });
    const events = await collect(runStep(deps(providers), { threadId: id, message: 'review it' }));
    expect(events.map(e => e.type)).toContain('done');
    const { events: log } = await store.get('default', id);
    const stepEv = log.find(e => 't' in e && e.t === 'step') as { provider: string };
    expect(stepEv.provider).toBe('ollama/local');
    const [rec] = listRuns(vaultRoot, 'default', id);
    expect(rec!.policy).toBe('stays-local');
    expect(rec!.provider).toBe('ollama/local');
  });

  test('an explicit cloud provider for such a matter is refused before the user turn is appended', async () => {
    await vault.write('default', 'matters/acme.md', '---\nstays_local: true\n---\n# Acme\n');
    const { id } = await store.create('default', { matter: 'matters/acme.md' });
    const events = await collect(runStep(deps([cloud(), local()]), { threadId: id, message: 'review it', providerId: 'anthropic/cloud' }));
    expect(events.map(e => e.type)).toEqual(['error']);
    expect((events[0] as { message: string }).message).toContain('stays on this machine');
    const { events: log } = await store.get('default', id);
    expect(log.filter(e => 't' in e && e.t === 'user')).toHaveLength(0);
    const [rec] = listRuns(vaultRoot, 'default', id);
    expect(rec!.status).toBe('error');
  });

  test('no local provider at all: the step never runs, the sentence is the founder\'s', async () => {
    await vault.write('default', 'matters/acme.md', '---\nstays_local: true\n---\n# Acme\n');
    const { id } = await store.create('default', { matter: 'matters/acme.md' });
    const events = await collect(runStep(deps([cloud()]), { threadId: id, message: 'review it' }));
    expect(events.map(e => e.type)).toEqual(['error']);
    expect((events[0] as { message: string }).message).toBe('This matter stays on this machine, and no local model is loaded.');
    const { events: log } = await store.get('default', id);
    expect(log).toHaveLength(0);
  });

  test('an attached document under a stays-local matter decides for an unlinked thread; an inferred matter never does', async () => {
    await vault.write('default', 'matters/acme/matter.md', '---\nstays_local: true\n---\n# Acme\n');
    const providers = [cloud(), local()];
    const { id } = await store.create('default', {});
    await collect(runStep(deps(providers), { threadId: id, message: 'Review this.\n\n`matters/acme/nda.docx`' }));
    let { events: log } = await store.get('default', id);
    expect((log.find(e => 't' in e && e.t === 'step') as { provider: string }).provider).toBe('ollama/local');

    // The same thread, a plain message, still unlinked: the header carries
    // no matter, so the policy is the vault's (none) — cloud is fine.
    await collect(runStep(deps(providers), { threadId: id, message: 'and now a general question' }));
    ({ events: log } = await store.get('default', id));
    const steps = log.filter(e => 't' in e && e.t === 'step') as Array<{ provider: string }>;
    expect(steps[1]!.provider).toBe('anthropic/cloud');
  });

  test('the vault default applies to every unlinked thread', async () => {
    writeFileSync(join(vaultRoot, 'config.md'), 'counsel-os-config: true\nlegal_root: x\ndefault_locality: local\n', 'utf8');
    const { id } = await store.create('default', {});
    await collect(runStep(deps([cloud(), local()]), { threadId: id, message: 'hello' }));
    const { events: log } = await store.get('default', id);
    expect((log.find(e => 't' in e && e.t === 'step') as { provider: string }).provider).toBe('ollama/local');
  });
});
