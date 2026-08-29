import { randomUUID } from 'node:crypto';
import type { ZodType } from 'zod';
import type { Message, ModelProvider, Platform, StepEvent, StepRequest, Tenant, ToolDef, Usage, VaultStore } from '../core/types';
import { currentPlatform } from '../core/types';
import type { Router } from '../router/router';
import { ThreadStore, type ThreadEvent, type ThreadHeader } from '../threads/store';
import { window } from '../threads/window';
import { readVaultConfig, type VaultConfig } from '../vault/resolve-root';
import { guardedVaultTools } from '../vault/vault-tools';
import { builtinTools } from '../tools/builtin';
import { ToolRegistry } from '../tools/registry';
import { assembleSystemPrompt } from './prompt';
import { readPrimitiveTool } from './primitives';
import { proposeUpdateTool } from './proposals';
import { writeRunLog, type RunLogEntry, type ToolCallLog } from './run-log';

/**
 * Headroom left in the context window for the model's own reply and for the
 * slack between our 4-chars-per-token estimate and the vendor's real
 * tokenizer. Deliberately generous: overshooting the window is a hard
 * provider error, while undershooting only drops the oldest turns.
 */
const REPLY_RESERVE_TOKENS = 2000;

/** The same cheap estimator `window()` defaults to, applied to the system
 * prompt as well so both halves of the budget are measured the same way. */
const estimateTokens = (s: string): number => Math.ceil(s.length / 4);

/**
 * A vendor session that no longer exists reads differently on every harness
 * ("session not found", "thread ... has expired", "cannot resume"), so the
 * fallback matches on shape rather than on an exact string. False positives
 * are cheap — the worst case is one wasted replay of a step that would have
 * failed anyway — and the match only ever applies to a step that actually
 * sent a `session`, and only to its very first event.
 */
const RESUME_FAILURE_RE = /session|thread|resume|not found/i;

/** The `warning` event the fallback leaves in the transcript (spec §5). */
export const RESUME_WARNING = 'session expired; replaying history';

export interface CounselLoopDeps {
  tenant: Tenant;
  vaultRoot: string;
  /** The Counsel OS plugin/repo root: `skills/`, `primitives/`, `scripts/`. */
  pluginRoot: string;
  vault: VaultStore;
  store: ThreadStore;
  providers: ModelProvider[];
  router: Router;
  platform?: Platform;
}

export interface RunStepOptions {
  threadId: string;
  message: string;
  task?: string;
  providerId?: string;
  outputSchema?: ZodType<unknown>;
}

/** A provider that can be re-bound to one thread — today only
 * `CodexHarnessProvider`, which runs out of process and so learns about the
 * thread only through what this binding passes it. Duck-typed rather than an
 * `instanceof` check so this module does not pull in the Codex SDK. */
interface ThreadBindable {
  withThread(opts: { homeDir: string; threadId: string; pluginRoot: string }): ModelProvider;
}

function isThreadBindable(p: ModelProvider): p is ModelProvider & ThreadBindable {
  return typeof (p as Partial<ThreadBindable>).withThread === 'function';
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Binds a `codex-sub/*` provider to this thread. Two things ride along, and
 * both are needed because that harness runs the model in a separate process
 * against an out-of-process MCP server: the thread's persistent
 * `CODEX_HOME`, without which `resumeThread` can never find the session
 * state a previous step left; and the thread id plus plugin root, which
 * reach that MCP server as `COUNSEL_THREAD_ID` / `COUNSEL_PLUGIN_ROOT` and
 * are what let it offer `propose_update` and `read_primitive` — the tools
 * the in-process tiers get directly from `stepTools`. Every other provider
 * is returned unchanged.
 */
function bindToThread(deps: CounselLoopDeps, provider: ModelProvider, threadId: string): ModelProvider {
  if (!provider.id.startsWith('codex-sub/') || !isThreadBindable(provider)) return provider;
  return provider.withThread({
    homeDir: deps.store.codexHomeFor(threadId),
    threadId,
    pluginRoot: deps.pluginRoot,
  });
}

function resolveProvider(deps: CounselLoopDeps, opts: RunStepOptions): ModelProvider {
  if (opts.providerId) {
    const found = deps.providers.find(p => p.id === opts.providerId);
    if (!found) throw new Error(`unknown provider: ${opts.providerId}`);
    return found;
  }
  return deps.router.resolve(opts.task);
}

/**
 * The tools a counsel step gets: the vault tools with the `remember` gate
 * closed (`guardedVaultTools` — knowledge paths refuse `vault_write`),
 * `propose_update` as the way through that gate, `read_primitive` for the
 * methodology's on-demand sections, and the platform's script tools.
 */
function stepTools(deps: CounselLoopDeps, threadId: string, cfg: VaultConfig, scriptTools: ToolDef[]): ToolDef[] {
  return [
    ...guardedVaultTools(deps.vault, cfg),
    proposeUpdateTool(deps.store, deps.vault, threadId, deps.tenant) as ToolDef,
    readPrimitiveTool(deps.pluginRoot) as ToolDef,
    ...scriptTools,
  ];
}

/**
 * One counsel step: append the user turn, resolve a provider, assemble the
 * system prompt and tools, stream the model to completion, and record
 * everything (thread log, vendor session, run log) as it goes.
 *
 * Yields every `StepEvent` the provider produced, tagged with this step's
 * `runId` — except `session`, which is consumed (stored on the thread
 * header) rather than surfaced. `text` events pass through exactly as the
 * provider emitted them; coalescing them for a UI is the server's job.
 *
 * Failures are events, never exceptions: an unknown thread, an unresolvable
 * provider, or a broken prompt assembly each end the stream with a single
 * `error`. An unknown thread appends nothing (there is nothing to append
 * to); the other two leave only the `user` event behind, so the request is
 * still visible in the thread.
 */
export async function* runStep(
  deps: CounselLoopDeps,
  opts: RunStepOptions,
): AsyncIterable<StepEvent & { runId: string }> {
  const runId = randomUUID();
  const { tenant, store } = deps;
  const { threadId } = opts;

  try {
    await store.get(tenant, threadId);
  } catch {
    yield { type: 'error', message: `unknown thread: ${threadId}`, runId };
    return;
  }

  const userFailed = await tryPersist(() =>
    store.append(tenant, threadId, { t: 'user', at: nowIso(), content: opts.message }),
  );
  if (userFailed) {
    yield { type: 'error', message: userFailed, runId };
    return;
  }

  let provider: ModelProvider;
  try {
    provider = bindToThread(deps, resolveProvider(deps, opts), threadId);
  } catch (err) {
    yield { type: 'error', message: message(err), runId };
    return;
  }

  const stepFailed = await tryPersist(() =>
    store.append(tenant, threadId, {
      t: 'step',
      at: nowIso(),
      runId,
      provider: provider.id,
      ...(opts.task ? { task: opts.task } : {}),
    }),
  );
  if (stepFailed) {
    yield { type: 'error', message: stepFailed, runId };
    return;
  }

  // One header read serves both the system prompt (the thread's matter) and
  // the session lookup below — nothing between them can change either.
  let header: ThreadHeader;
  let base: StepRequest;
  let budgetTokens: number;
  try {
    ({ header } = await store.get(tenant, threadId));
    const cfg = readVaultConfig(deps.vaultRoot);
    const platform = deps.platform ?? currentPlatform();
    const registry = new ToolRegistry();
    for (const t of builtinTools({ vaultRoot: deps.vaultRoot, repoRoot: deps.pluginRoot })) registry.register(t);
    const scriptTools = registry.available(platform);

    const system = assembleSystemPrompt({
      pluginRoot: deps.pluginRoot,
      vaultRoot: deps.vaultRoot,
      ...(header.matter ? { matterPath: header.matter } : {}),
      platform,
      cfg,
      tools: {
        available: scriptTools.map(t => t.name),
        unavailable: registry.unavailable(platform),
      },
    });

    // An oversize system prompt is not a windowing problem — no amount of
    // dropped history makes the request fit — so it fails the step outright
    // rather than silently sending a request the provider will reject.
    const systemTokens = estimateTokens(system);
    const contextTokens = provider.capabilities.contextTokens;
    const floor = systemTokens + REPLY_RESERVE_TOKENS;
    if (floor > contextTokens) {
      throw new Error(`system prompt exceeds the provider's context window (${floor} > ${contextTokens})`);
    }
    budgetTokens = Math.max(0, contextTokens - floor);
    base = {
      tenant,
      system,
      messages: [],
      tools: stepTools(deps, threadId, cfg, scriptTools),
      ...(opts.outputSchema ? { outputSchema: opts.outputSchema } : {}),
    };
  } catch (err) {
    const ev: StepEvent = { type: 'error', message: message(err) };
    // Best-effort: the caller gets the error either way (spec §5).
    await tryPersist(() => store.append(tenant, threadId, { ...ev, at: nowIso() }));
    yield { ...ev, runId };
    return;
  }

  const replay = async (): Promise<StepRequest> => {
    const { events } = await store.get(tenant, threadId);
    return { ...base, messages: window(events, budgetTokens, estimateTokens) };
  };

  // A provider that already holds a session for this thread gets only the
  // new turn plus the session id — its own side keeps the history, and
  // re-sending ours would double it. Everyone else replays the window.
  const sessionId = header.sessions[provider.id];
  let req: StepRequest = sessionId
    ? { ...base, messages: [{ role: 'user', content: opts.message } satisfies Message], session: { id: sessionId } }
    : await replay();

  let attempt = await beginAttempt(provider, req);

  // Resume failure (spec §5): the vendor's session is gone. Drop the dead id
  // and replay the log once for this same step. The caller never sees the
  // failed attempt, and the only trace it leaves is the `warning` event —
  // in particular the user turn is NOT appended twice.
  //
  // The event tested is the first NON-session one: the Claude harness opens
  // every stream with a `session` event (from `system/init`), so testing the
  // literal first event would never see the error behind it. Session ids
  // buffered during a failed attempt are discarded unread — persisting one
  // would immediately re-poison the next step with a session the vendor was
  // in the middle of rejecting.
  if (sessionId && !attempt.first.done && isResumeFailure(attempt.first.value)) {
    await closeQuietly(attempt.it);
    await store.clearSession(tenant, threadId, provider.id);
    const warning: ThreadEvent = { t: 'warning', at: nowIso(), message: RESUME_WARNING };
    const appendFailed = await tryPersist(() => store.append(tenant, threadId, warning));
    if (appendFailed) {
      yield { type: 'error', message: appendFailed, runId };
      return;
    }
    req = await replay();
    attempt = await beginAttempt(provider, req);
  }

  yield* stream(deps, opts, provider, runId, chain(attempt));
}

function isResumeFailure(ev: StepEvent): boolean {
  return ev.type === 'error' && RESUME_FAILURE_RE.test(ev.message);
}

interface Attempt {
  it: AsyncIterator<StepEvent>;
  /** Leading `session` events, held back until the attempt proves real. */
  head: StepEvent[];
  /** The first event that is not a `session` — what resume detection tests. */
  first: IteratorResult<StepEvent>;
}

/**
 * Starts one provider run and reads far enough to answer "did this attempt
 * fail to resume?" — buffering the leading `session` events (the same shape
 * `withRetry` buffers) so the first *meaningful* event is the one examined.
 */
async function beginAttempt(provider: ModelProvider, req: StepRequest): Promise<Attempt> {
  const it = provider.run(req)[Symbol.asyncIterator]();
  const head: StepEvent[] = [];
  let first = await it.next();
  while (!first.done && first.value.type === 'session') {
    head.push(first.value);
    first = await it.next();
  }
  return { it, head, first };
}

/**
 * Replays a started attempt as one flat stream: buffered head, the event
 * that broke the buffering, then whatever the provider has left.
 *
 * The provider's iterator is closed on the way out, however the way out
 * comes. A hand-rolled `next()` loop — unlike `for await` or `yield*` — does
 * not forward abandonment to what it is reading, so without this a consumer
 * that stops early (an HTTP client hanging up mid-step) would leave the
 * provider running: a harness subprocess with nobody reading it, or a direct
 * provider holding an open HTTP response.
 */
async function* chain(attempt: Attempt): AsyncIterable<StepEvent> {
  try {
    for (const ev of attempt.head) yield ev;
    if (attempt.first.done) return;
    yield attempt.first.value;
    for (let n = await attempt.it.next(); !n.done; n = await attempt.it.next()) yield n.value;
  } finally {
    await closeQuietly(attempt.it);
  }
}

/** Closes an abandoned provider iterator. A throwing `return()` must not
 * mask the fallback that is already underway. */
async function closeQuietly(it: AsyncIterator<StepEvent>): Promise<void> {
  try {
    await it.return?.(undefined);
  } catch {
    /* ignore */
  }
}

/**
 * Runs one thread-store write, returning a caller-facing message instead of
 * throwing. A failed write means the transcript is now incomplete, so the
 * step has to stop — but it must stop with a terminal `error` the caller
 * actually receives (spec §5), not with an exception thrown out of the
 * async generator mid-stream.
 */
async function tryPersist(write: () => Promise<void>): Promise<string | null> {
  try {
    await write();
    return null;
  } catch (err) {
    return `thread log write failed: ${message(err)}`;
  }
}

/**
 * Drains the provider's stream: every event but `session` is appended to the
 * thread log and yielded with the run id; `session` (and `done.sessionId`)
 * updates the thread header instead. Tool-call durations are measured
 * between a `tool_call` and the `tool_result` carrying the same id, and the
 * whole tally is written to the run log once the step completes.
 *
 * Two things are deliberately ordered around the yield. The run log is
 * written AFTER the `done` reaches the caller, and a failure to write it is
 * swallowed to stderr: telemetry must never cost the caller its terminal
 * event. A failed thread-log write, by contrast, stops the step — but as a
 * yielded `error`, never as a thrown exception.
 *
 * A provider that ends its stream without a `done` or `error` gets one
 * synthesized here: spec §5 promises the caller never sees a stream close
 * without a terminal event, and a server turning these into SSE has no
 * other way to tell "finished" from "the connection died".
 */
async function* stream(
  deps: CounselLoopDeps,
  opts: RunStepOptions,
  provider: ModelProvider,
  runId: string,
  events: AsyncIterable<StepEvent>,
): AsyncIterable<StepEvent & { runId: string }> {
  const { tenant, store } = deps;
  const startedAt = Date.now();
  const pending = new Map<string, { name: string; at: number }>();
  const toolCalls: ToolCallLog[] = [];
  let sawTerminal = false;

  for await (const ev of events) {
    if (ev.type === 'session') {
      const failed = await tryPersist(() => store.setSession(tenant, opts.threadId, provider.id, ev.id));
      if (failed) {
        yield { type: 'error', message: failed, runId };
        return;
      }
      continue;
    }

    const failed = await tryPersist(() => store.append(tenant, opts.threadId, { ...ev, at: nowIso() } as ThreadEvent));
    if (failed) {
      // The store is broken, so the error event cannot be logged either —
      // it only reaches the caller.
      yield { type: 'error', message: failed, runId };
      return;
    }

    if (ev.type === 'tool_call') {
      pending.set(ev.id, { name: ev.name, at: Date.now() });
    } else if (ev.type === 'tool_result') {
      const call = pending.get(ev.id);
      pending.delete(ev.id);
      // A result with no matching call (a harness that reports only the
      // result, or an id that did not round-trip) still happened — it is
      // logged with an unknown duration rather than a fabricated 0.
      toolCalls.push({ name: ev.name, ms: call ? Date.now() - call.at : null, isError: ev.isError === true });
    } else if (ev.type === 'done') {
      sawTerminal = true;
      if (ev.sessionId) {
        const sessionFailed = await tryPersist(() =>
          store.setSession(tenant, opts.threadId, provider.id, ev.sessionId as string),
        );
        if (sessionFailed) {
          yield { type: 'error', message: sessionFailed, runId };
          return;
        }
      }
    } else if (ev.type === 'error') {
      sawTerminal = true;
    }

    yield { ...ev, runId };

    if (ev.type === 'done') {
      recordRun(deps, opts, provider, runId, ev.usage, Date.now() - startedAt, finishToolCalls(toolCalls, pending));
    }
  }

  if (!sawTerminal) {
    const ev: StepEvent = { type: 'error', message: `${provider.id} ended the step without a done or error event` };
    await tryPersist(() => store.append(tenant, opts.threadId, { ...ev, at: nowIso() }));
    yield { ...ev, runId };
  }
}

/**
 * Closes out the run's tool tally. A `tool_call` still pending when the step
 * ended never got a result — the step was cut short, or the harness dropped
 * it — so it is logged with both its duration and its outcome unknown
 * rather than omitted: a call the model made and never heard back from is
 * exactly what a run log should show.
 */
function finishToolCalls(done: ToolCallLog[], pending: Map<string, { name: string; at: number }>): ToolCallLog[] {
  const unmatched = [...pending.values()].map(c => ({ name: c.name, ms: null, isError: null }));
  return [...done, ...unmatched];
}

/** Writes the run log, swallowing failures to stderr — see `stream`. */
function recordRun(
  deps: CounselLoopDeps,
  opts: RunStepOptions,
  provider: ModelProvider,
  runId: string,
  usage: Usage,
  durationMs: number,
  toolCalls: ToolCallLog[],
): void {
  const entry: RunLogEntry = {
    at: nowIso(),
    provider: provider.id,
    ...(opts.task ? { task: opts.task } : {}),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    ...(usage.costUsd === undefined ? {} : { costUsd: usage.costUsd }),
    durationMs,
    toolCalls,
  };
  try {
    writeRunLog(deps.vaultRoot, deps.tenant, runId, [entry]);
  } catch (err) {
    console.error(`counsel-loop: run log write failed for ${runId}: ${message(err)}`);
  }
}
