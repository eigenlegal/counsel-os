import { randomUUID } from 'node:crypto';
import type { ZodType } from 'zod';
import type { Message, ModelProvider, Platform, StepEvent, StepRequest, Tenant, ToolDef, Usage, VaultStore, ArtifactSummary } from '../core/types';
import { currentPlatform } from '../core/types';
import type { Routed, RouteReason, Router } from '../router/router';
import { ThreadStore, type ThreadEvent, type ThreadHeader } from '../threads/store';
import { window } from '../threads/window';
import { readVaultConfig, type VaultConfig } from '../vault/resolve-root';
import { policyForStep, readerOver, type StepPolicy } from '../vault/policy';
import { isLocal } from '../router/router';
import { taskPolicy, type RoutingPolicy } from '../router/policy';
import type { RouteScores } from '../router/scores';
import { MatterStaysLocalError } from '../core/types';
import { guardedVaultTools, type VaultToolHooks } from '../vault/vault-tools';
import { recordWritten } from '../outcomes/written';
import { builtinTools } from '../tools/builtin';
import { ToolRegistry } from '../tools/registry';
import type { ContentSource } from '../content/source';
import { assembleSystemPrompt } from './prompt';
import { readPrimitiveTool } from './primitives';
import { proposeUpdateTool } from './proposals';
import { writeRunLog, type RunLogEntry, type ToolCallLog } from './run-log';
import { finishRun, startRun, type RunPatch, type RunRecord } from './run-record';
import { RETRO_TASK, retroSections } from '../retro/index';
import { classifyTask, type ModelClassifier } from '../tasks/classify';
import type { TaskSource } from '../tasks/taxonomy';
import { appendOutcome } from '../outcomes/store';

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

/** How long one step may take before the loop gives up on the provider.
 * Ten minutes is past the slowest real step measured on either harness tier
 * and well short of "a wedged provider holds this thread until the process
 * restarts", which is the failure this exists to end. */
export const DEFAULT_STEP_TIMEOUT_MS = 600_000;

export interface CounselLoopDeps {
  tenant: Tenant;
  vaultRoot: string;
  /** The Counsel OS plugin/repo root: `skills/`, `primitives/`, `scripts/`. */
  pluginRoot: string;
  /** The shipped content (the counsel skill, the primitives). Omitted → the
   * repo source over `pluginRoot`, as it always was. */
  content?: ContentSource;
  vault: VaultStore;
  store: ThreadStore;
  providers: ModelProvider[];
  router: Router;
  platform?: Platform;
  /** The per-step deadline, in milliseconds. Default `DEFAULT_STEP_TIMEOUT_MS`. */
  stepTimeoutMs?: number;
  /** The model-backed task classifier (routing-and-evals spec §3), used only
   * when neither the caller nor the thread named a task and no rule fired.
   * Absent → rules then `chat`; serve wires `modelClassifier`. */
  classifier?: ModelClassifier;
  /** What the scoreboard measured and how this practice wants each task
   * routed (routing-and-evals spec §6). Absent → the configured route and
   * the default decide, exactly as before scoring existed. */
  routing?: () => { scores: RouteScores; policy: RoutingPolicy };
}

export interface RunStepOptions {
  threadId: string;
  message: string;
  task?: string;
  providerId?: string;
  outputSchema?: ZodType<unknown>;
  /** Overrides `CounselLoopDeps.stepTimeoutMs` for this step only. */
  timeoutMs?: number;
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

/**
 * The matter's privacy policy for one step (providers spec §7), from the
 * thread's explicit matter, the message's attachment chips, or the vault
 * default — decided before any provider is chosen.
 */
export async function policyForOptions(
  deps: Pick<CounselLoopDeps, 'tenant' | 'vaultRoot' | 'vault'>,
  opts: { matter?: string | undefined; message: string },
): Promise<StepPolicy> {
  return policyForStep({ ...(opts.matter === undefined ? {} : { matter: opts.matter }), message: opts.message }, readVaultConfig(deps.vaultRoot), readerOver(deps.vault, deps.tenant));
}

/**
 * The provider for a step, honouring the policy: an explicit `providerId`
 * that is not local is refused outright under `localOnly` (never a silent
 * swap), and the router's local-only path picks among what is loaded.
 */
export function resolveStepProvider(deps: CounselLoopDeps, opts: RunStepOptions, policy: StepPolicy): Routed {
  if (opts.providerId) {
    const found = deps.providers.find(p => p.id === opts.providerId);
    if (!found) throw new Error(`unknown provider: ${opts.providerId}`);
    if (policy.localOnly && !isLocal(found.capabilities)) {
      throw new MatterStaysLocalError(`This matter stays on this machine; ${found.id} is not a local model.`);
    }
    return { provider: found, reason: { kind: 'default', text: 'you chose this model' } };
  }
  const routing = deps.routing?.();
  return deps.router.route(opts.task, {
    localOnly: policy.localOnly,
    ...(routing === undefined || opts.task === undefined
      ? {}
      : { scores: routing.scores[opts.task] ?? [], policy: taskPolicy(routing.policy, opts.task) }),
  });
}


/**
 * The tools a counsel step gets: the vault tools with the `remember` gate
 * closed (`guardedVaultTools` — knowledge paths refuse `vault_write`),
 * `propose_update` as the way through that gate, `read_primitive` for the
 * methodology's on-demand sections, and the platform's script tools.
 */
function stepTools(deps: CounselLoopDeps, threadId: string, cfg: VaultConfig, scriptTools: ToolDef[], hooks: VaultToolHooks = {}): ToolDef[] {
  return [
    ...guardedVaultTools(deps.vault, cfg, hooks),
    proposeUpdateTool(deps.store, deps.vault, threadId, deps.tenant) as ToolDef,
    readPrimitiveTool(deps.content ?? deps.pluginRoot) as ToolDef,
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
 * header) rather than surfaced. `text` events pass through to the caller
 * exactly as the provider emitted them; coalescing them for a UI is the
 * server's job. The thread LOG stores one `text` event per run of text (see
 * `stream`), which is a different question from what the caller streams.
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
  // The step's clock starts HERE, not inside `stream`. `beginAttempt` already
  // awaits the provider's first non-`session` event, which on both harness
  // tiers is the entire model turn — a clock started after it measured
  // single-digit milliseconds for three-second steps.
  const startedAt = Date.now();
  const runId = randomUUID();
  // Handed to the provider as `req.signal` and fired when the deadline
  // passes. Created up here because it has to be in the request the provider
  // is built from, which is assembled well before the clock starts.
  const cancel = new AbortController();
  const { tenant, store } = deps;
  const { threadId } = opts;

  // The header alone: it decides the task (a retro thread runs every step
  // as `retro` unless the caller names one) before the run is recorded.
  let early: ThreadHeader;
  try {
    early = await store.header(tenant, threadId);
  } catch {
    yield { type: 'error', message: `unknown thread: ${threadId}`, runId };
    return;
  }
  // The matter's privacy policy, from the header and the message — before
  // the run opens, before the user turn is appended, before any provider is
  // looked at (providers spec §7) — and before the task classifier, which
  // may itself call a model.
  const policy = await policyForOptions(deps, { ...(early.matter === undefined ? {} : { matter: early.matter }), message: opts.message });
  // The task and where it came from (spec §3): caller, thread, rule, one
  // small model call (local only under the policy), else `chat`. Decided
  // before the run opens so the record and the step event carry the same
  // answer.
  const classified = await classifyTask({ message: opts.message, callerTask: opts.task, threadTask: early.task }, deps.classifier, { localOnly: policy.localOnly });
  const taskSource: TaskSource = classified.source;
  opts = { ...opts, task: classified.task };

  // The run record opens here — before the provider is even chosen — so
  // everything that follows is visible to `/runs` while it is happening and
  // after it dies (spec §4.3). The unknown-thread return above is the one
  // exception: there was no run to record.
  beginRun(deps, opts, runId, new Date(startedAt).toISOString(), taskSource);
  // Tracks whether the record has reached a terminal status yet, so the
  // `finally` below can tell "the step ended" from "the caller walked away".
  const run: RunState = {
    finalized: false,
    outcome: () => ({ finishedAt: nowIso(), durationMs: Date.now() - startedAt }),
  };
  /** Finalizes the record for a step ending in a yielded `error`, before the
   * yield: these paths `return` straight after it, so a consumer that stops
   * reading would leave anything written afterwards unrun. */
  const failRun = (error: string): void => {
    finalizeRun(deps, runId, run, { status: 'error', error });
  };
  /**
   * Tells the provider to stop, for a step the caller walked away from.
   *
   * Closing the provider's iterator only stops US reading it. A real harness
   * or SDK is parked on an `await`, and a `return()` queued behind that await
   * settles only when the await does — so without an abort the provider keeps
   * running (a harness child process with nobody reading it, an open HTTP
   * response) until the bounded close gives up on it. The abort settles the
   * SDK's own promise, which is what actually runs the provider's `finally`.
   *
   * Only for abandonment: a step that reached a terminal status is already
   * over, and an expired deadline aborts with its own reason.
   */
  const abandonProvider = (): void => {
    if (!run.finalized) cancel.abort(new Error(ABANDONED_MESSAGE));
  };

  // ONE try/finally over the whole step, from the first thing that can be
  // interrupted onward. It has to start here rather than at the provider:
  // a caller that hangs up during the setup — the user append, the router,
  // the prompt assembly — unwinds through whatever `finally` is in scope,
  // and outside this one there is none, which would leave the record at
  // `running` for a step nothing was wrong with.
  let deadline: Deadline | undefined;
  try {
    // The provider is chosen BEFORE the user turn is appended: a step the
    // policy refuses (a cloud provider named for a matter that stays local,
    // or no local model at all) never ran, so the transcript must not show
    // a question nobody answered.
    let provider: ModelProvider;
    // Why this step went where it did, for the record and the strip.
    let routeReason: RouteReason | null = null;
    try {
      const routed = resolveStepProvider(deps, opts, policy);
      routeReason = routed.reason;
      provider = bindToThread(deps, routed.provider, threadId);
    } catch (err) {
      failRun(message(err));
      yield { type: 'error', message: message(err), runId };
      return;
    }
    patchRun(deps, runId, { provider: provider.id, ...(routeReason === null ? {} : { routeReason }), ...(policy.localOnly ? { policy: 'stays-local' as const } : {}) });

    const userFailed = await tryPersist(() =>
      store.append(tenant, threadId, { t: 'user', at: nowIso(), content: opts.message }),
    );
    if (userFailed) {
      failRun(userFailed);
      yield { type: 'error', message: userFailed, runId };
      return;
    }

    const stepFailed = await tryPersist(() =>
      store.append(tenant, threadId, {
        t: 'step',
        at: nowIso(),
        runId,
        provider: provider.id,
        ...(opts.task ? { task: opts.task, taskSource } : {}),
      }),
    );
    if (stepFailed) {
      failRun(stepFailed);
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
      for (const t of builtinTools({
        vaultRoot: deps.vaultRoot,
        repoRoot: deps.pluginRoot,
        vault: deps.vault,
        thread: {
          store: deps.store,
          threadId,
          tenant,
          outcome: line => {
            try {
              appendOutcome(deps.vaultRoot, cfg, { ...line, threadId, runId, ...(opts.task ? { task: opts.task } : {}), providerId: provider.id });
              // A produced document is counsel's version of that file from
              // now on (spec §7, lawyer edits).
              if (line.kind === 'artifact.produced' && typeof line.path === 'string') {
                recordWritten(deps.vaultRoot, cfg, { path: line.path, kind: 'artifact', runId, threadId });
              }
            } catch (err) {
              console.error(`counsel-loop: outcome write failed for ${runId}: ${message(err)}`);
            }
          },
        },
      })) registry.register(t);
      const scriptTools = registry.available(platform);

      const system = assembleSystemPrompt({
        pluginRoot: deps.pluginRoot,
        ...(deps.content === undefined ? {} : { content: deps.content }),
        vaultRoot: deps.vaultRoot,
        ...(header.matter ? { matterPath: header.matter } : {}),
        platform,
        cfg,
        tools: {
          available: scriptTools.map(t => t.name),
          unavailable: registry.unavailable(platform),
        },
        // A retro step carries the retro method and the period's evidence
        // (`retro/`): read fresh on every step of the thread, so a retro
        // that runs over several turns keeps seeing the record.
        ...(opts.task === RETRO_TASK ? { sections: await retroSections({ deps, cfg }) } : {}),
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
        tools: stepTools(deps, threadId, cfg, scriptTools, {
          onWrite: path => {
            recordWritten(deps.vaultRoot, cfg, { path, kind: 'write', runId, threadId });
          },
        }),
        signal: cancel.signal,
        ...(opts.outputSchema ? { outputSchema: opts.outputSchema } : {}),
      };
    } catch (err) {
      const ev: StepEvent = { type: 'error', message: message(err) };
      // Best-effort: the caller gets the error either way (spec §5).
      await tryPersist(() => store.append(tenant, threadId, { ...ev, at: nowIso() }));
      failRun(ev.message);
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

    // The step's deadline starts here — one clock for the whole step, shared
    // by the resume fallback's second attempt, cancelled in the `finally` below
    // however the step ends.
    const timeoutMs = opts.timeoutMs ?? deps.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
    // Aborting is what makes a hung provider actually stop; closing its
    // iterator only stops US reading it. Every tier forwards `req.signal` to
    // its SDK, so this reaches the CLI child process too.
    deadline = deadlineIn(timeoutMs, () => cancel.abort(new Error(timeoutMessage(timeoutMs))));
    let attempt = await beginAttempt(provider, req, deadline);

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
      // Bounded: a vendor that will not close must not strand the replay.
      await closeWithin(attempt.it, deadline);
      await store.clearSession(tenant, threadId, provider.id);
      const warning: ThreadEvent = { t: 'warning', at: nowIso(), message: RESUME_WARNING };
      const appendFailed = await tryPersist(() => store.append(tenant, threadId, warning));
      if (appendFailed) {
        failRun(appendFailed);
        yield { type: 'error', message: appendFailed, runId };
        return;
      }
      req = await replay();
      // The deadline can pass while the dead session is being cleared. A
      // second attempt now would hand the provider an already-aborted signal:
      // a wasted run whose only possible outcome is the timeout the caller is
      // owed anyway. Take that path directly instead.
      attempt = deadline.remaining() === 0 ? expiredAttempt(attempt.it) : await beginAttempt(provider, req, deadline);
    }

    yield* stream(deps, opts, provider, runId, chain(attempt, deadline, timeoutMs, abandonProvider), startedAt, run);
  } catch (err) {
    // Something THREW rather than becoming an event: a provider that rejects,
    // or a thread-store read the setup does not guard (the window replay).
    // The loop turns its own failures into events (spec §5); when one escapes
    // anyway, the record must call it an error rather than let the `finally`
    // below read it as a caller walking away.
    finalizeRun(deps, runId, run, { status: 'error', error: message(err) });
    throw err;
  } finally {
    // Abort FIRST — before the deadline is cancelled, and before anything
    // else gets to give up on the provider. `chain` already fires this on its
    // way through the bounded close; this covers a caller that walked away
    // during the step SETUP, where there is no provider stream yet.
    abandonProvider();
    deadline?.cancel();
    // The consumer walked away — an SSE client that hung up, which reaches
    // this generator as `return()` — so no terminal event was ever produced
    // and nothing above finalized the record. That is not a failure of the
    // step, and it must not be left as `running`, which is now reserved for
    // "the process died". A run that DID reach a terminal status is already
    // finalized, and this never overwrites it.
    if (!run.finalized) {
      finalizeRun(deps, runId, run, { status: 'abandoned', error: ABANDONED_MESSAGE });
    }
  }
}

/** What an abandoned run records as its `error` — the reason it stopped,
 * though nothing actually failed. */
const ABANDONED_MESSAGE = 'the caller abandoned the step';

/**
 * The run record's live state for one step: whether it already reached a
 * terminal status, and how to describe the work done so far. `stream`
 * replaces `outcome` with the richer version — tool calls, primitives,
 * proposals — once it starts reading events; before that there is nothing to
 * report but the clock.
 */
interface RunState {
  finalized: boolean;
  /** `calls` is the step's finished tool tally when the caller already has
   * one — the `done` path computes it for the run log — so a finalization
   * never tallies the same calls twice. */
  outcome: (calls?: ToolCallLog[]) => RunPatch;
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
  /** The deadline passed before the attempt produced that event. The
   * provider has already been told to close; `chain` turns this into the
   * step's terminal error. */
  timedOut?: boolean;
}

/**
 * Starts one provider run and reads far enough to answer "did this attempt
 * fail to resume?" — buffering the leading `session` events (the same shape
 * `withRetry` buffers) so the first *meaningful* event is the one examined.
 *
 * The deadline covers these reads too, so a provider that never yields
 * anything at all — the worst hang, and the one a race placed further down
 * the stream would miss — still ends the step on time.
 */
async function beginAttempt(provider: ModelProvider, req: StepRequest, deadline: Deadline): Promise<Attempt> {
  const it = provider.run(req)[Symbol.asyncIterator]();
  const head: StepEvent[] = [];
  const expired = (): Attempt => {
    closeWithoutWaiting(it);
    return expiredAttempt(it);
  };

  let first = await deadline.race(it.next());
  if (first === TIMED_OUT) return expired();
  while (!first.done && first.value.type === 'session') {
    head.push(first.value);
    const next = await deadline.race(it.next());
    if (next === TIMED_OUT) return expired();
    first = next;
  }
  return { it, head, first };
}

/** An attempt the deadline outran: nothing to replay, nothing to close, and
 * `chain` turns it into the step's one terminal timeout error. */
function expiredAttempt(it: AsyncIterator<StepEvent>): Attempt {
  return { it, head: [], first: { done: true, value: undefined }, timedOut: true };
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
 *
 * This is also where the step's deadline is enforced: each read is raced
 * against it, so an expiry closes the provider and ends the stream with one
 * terminal `error` instead of waiting on an event that is never coming — and
 * where the step stops after the provider's own terminal event, so a
 * provider with a slow tail cannot turn one `done` into a second, contrary
 * terminal event.
 *
 * `onAbandon` fires when the way out is the consumer hanging up, before the
 * close it would otherwise have to outwait.
 */
async function* chain(
  attempt: Attempt,
  deadline: Deadline,
  timeoutMs: number,
  onAbandon: () => void,
): AsyncIterable<StepEvent> {
  // Cleared once a timeout has already fired the close it must not wait for.
  // Set BEFORE the head events go out: a consumer that hangs up while they
  // are streaming would otherwise unwind into a close this provider cannot
  // answer.
  let closeOnExit = !attempt.timedOut;
  // Cleared by every deliberate way out. What is left over is the unwind: the
  // consumer stopped reading, which reaches this generator as `return()` at
  // whichever `yield` it was parked on.
  let abandoned = true;
  try {
    for (const ev of attempt.head) yield ev;
    if (attempt.timedOut) {
      abandoned = false;
      yield timeoutError(timeoutMs);
      return;
    }
    if (attempt.first.done) {
      abandoned = false;
      return;
    }
    yield attempt.first.value;
    if (isTerminal(attempt.first.value)) {
      abandoned = false;
      return;
    }
    for (;;) {
      const n = await deadline.race(attempt.it.next());
      if (n === TIMED_OUT) {
        abandoned = false;
        closeOnExit = false;
        closeWithoutWaiting(attempt.it);
        // The timeout leaves the stream through the same door as any other
        // provider error, so `stream` flushes the buffered text, logs it, and
        // hands the caller its one terminal event with no special case.
        yield timeoutError(timeoutMs);
        return;
      }
      if (n.done) {
        abandoned = false;
        return;
      }
      yield n.value;
      // The provider has said its last word. Stop HERE rather than read on
      // and race the deadline against whatever tail it still has to flush: a
      // slow tail would otherwise append a `timeout` error behind a step that
      // already finished, and the caller would see two terminal events. The
      // `finally` closes the provider within budget.
      if (isTerminal(n.value)) {
        abandoned = false;
        return;
      }
    }
  } finally {
    if (abandoned) onAbandon();
    if (closeOnExit) await closeWithin(attempt.it, deadline);
  }
}

/** The events that end a step: after one, nothing the provider has left to
 * say may reach the caller (spec §5 — one terminal event per step). */
function isTerminal(ev: StepEvent): boolean {
  return ev.type === 'done' || ev.type === 'error';
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
 * Closes a provider that has stopped responding, WITHOUT waiting for the
 * close to complete.
 *
 * The wait is the whole point. `return()` on an async generator that is
 * parked on an `await` — exactly where a wedged provider is — is queued
 * behind that `await` and settles only when it does, which for a hung
 * provider is never. Awaiting it here would hang the timeout itself, so the
 * step would never emit its terminal error and the server would never
 * release the thread lock: the bug this whole path exists to fix. Firing it
 * and moving on still frees a provider that is merely slow (the queued
 * `return()` runs the moment its `await` resolves) and still frees one that
 * closes promptly, which is every provider whose iterator is hand-written.
 */
function closeWithoutWaiting(it: AsyncIterator<StepEvent>): void {
  void closeQuietly(it);
}

/** What `Deadline.race` resolves to when the step's clock ran out first. */
const TIMED_OUT = Symbol('step timed out');

/**
 * One step's deadline: a single timer, raced against each read of the
 * provider's stream. It is one timer for the whole step — not one per event
 * — so the deadline is absolute (a step that streams for the full budget
 * still expires on time, and the resume fallback's second attempt shares the
 * first one's clock) and so a finished step leaves nothing pending: an
 * uncancelled ten-minute timer would keep the process alive long past the
 * work it was watching.
 */
interface Deadline {
  race<T>(p: Promise<T>): Promise<T | typeof TIMED_OUT>;
  /** Milliseconds left, never below zero. */
  remaining(): number;
  cancel(): void;
}

/**
 * `onExpire` fires from the timer itself, not from whoever notices the
 * expiry — so the step's `AbortController` fires the instant the deadline
 * passes, even while the loop is parked on a read that will never return.
 * Aborting is what actually STOPS a wedged provider: it settles the SDK's
 * own promise, which runs the provider generator's `finally` and kills the
 * harness child process. Closing the iterator alone cannot do that (see
 * `closeWithoutWaiting`).
 */
function deadlineIn(ms: number, onExpire?: () => void): Deadline {
  const at = Date.now() + ms;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<typeof TIMED_OUT>(resolve => {
    timer = setTimeout(() => {
      expired = true;
      onExpire?.();
      resolve(TIMED_OUT);
    }, ms);
  });
  // A read the deadline outran is abandoned mid-flight, and a provider that
  // fails a moment later would then reject a promise nobody is watching — an
  // unhandled rejection, which takes the process down. `Promise.race` leaves
  // a handler on the loser, but the early-out below never races at all: a
  // deadline that passed while the last event was being persisted still has
  // the next `next()` in hand. Both paths attach one explicitly.
  const abandon = (p: Promise<unknown>): void => {
    void p.catch(() => {});
  };
  return {
    async race<T>(p: Promise<T>): Promise<T | typeof TIMED_OUT> {
      // Already past it: do not even wait on the read.
      if (expired) {
        abandon(p);
        return TIMED_OUT;
      }
      const result = await Promise.race([p, expiry]);
      if (result === TIMED_OUT) abandon(p);
      return result;
    },
    remaining(): number {
      return Math.max(0, at - Date.now());
    },
    cancel(): void {
      clearTimeout(timer);
    },
  };
}

/** How long the loop waits for a provider to close before giving up on it. */
const CLOSE_BUDGET_MS = 2_000;

/**
 * Closes a provider and waits for it — but not forever, and never past the
 * step's own deadline.
 *
 * The wait matters (a closed provider should be gone before the step is
 * reported finished) but it is not worth a wedged thread: `return()` on an
 * iterator that is parked on an `await` does not settle until that `await`
 * does, so an unbounded wait here would hold the server's thread lock for as
 * long as the provider stays stuck — the same wedge the timeout exists to
 * prevent, moved one step later. The budget is the smaller of
 * `CLOSE_BUDGET_MS` and whatever is left of the step, so a close can never
 * push a step past its deadline. On expiry the close is left running and
 * the loop moves on.
 */
async function closeWithin(it: AsyncIterator<StepEvent>, deadline: Deadline): Promise<void> {
  const budget = deadlineIn(Math.min(CLOSE_BUDGET_MS, deadline.remaining()));
  try {
    await budget.race(closeQuietly(it));
  } finally {
    budget.cancel();
  }
}

/** The message a timed-out step reports — as its terminal event, and as the
 * reason the provider's abort carries. */
function timeoutMessage(ms: number): string {
  return `step timed out after ${Math.round(ms / 1000)}s`;
}

/**
 * The terminal errors this module minted for an expired deadline. The run
 * record has to tell a timed-out step (`status: 'timeout'`) from any other
 * terminal error (`status: 'error'`), and it reads that off the event
 * itself. Identity, not text: a provider that happens to report "timed out"
 * is a provider error, and nothing here has to re-derive a message format
 * that lives in `timeoutMessage`.
 */
const TIMEOUT_ERRORS = new WeakSet<object>();

/** The one terminal event a timed-out step produces (spec §3). */
function timeoutError(ms: number): StepEvent {
  const ev: StepEvent = { type: 'error', message: timeoutMessage(ms) };
  TIMEOUT_ERRORS.add(ev);
  return ev;
}

/** True only for the terminal `error` a timed-out step produced — the exact
 * object `timeoutError` made, before anything copied it. */
function isTimeoutError(ev: StepEvent): boolean {
  return TIMEOUT_ERRORS.has(ev);
}

/**
 * Puts a step deadline on a raw provider stream, for a caller that drives a
 * provider directly instead of through `runStep` — today the CLI's `step`.
 * On expiry the provider is closed and the stream ends with the same
 * terminal `error` the loop produces, so the CLI's existing terminal-event
 * handling reports it and exits non-zero with no special case.
 */
export async function* withStepTimeout(
  source: AsyncIterable<StepEvent>,
  timeoutMs: number,
  onExpire?: () => void,
): AsyncIterable<StepEvent> {
  const deadline = deadlineIn(timeoutMs, onExpire);
  const it = source[Symbol.asyncIterator]();
  let closeOnExit = true;
  try {
    for (;;) {
      const n = await deadline.race(it.next());
      if (n === TIMED_OUT) {
        closeOnExit = false;
        closeWithoutWaiting(it);
        yield timeoutError(timeoutMs);
        return;
      }
      if (n.done) return;
      yield n.value;
    }
  } finally {
    if (closeOnExit) await closeWithin(it, deadline);
    deadline.cancel();
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
 * updates the thread header instead. Consecutive `text` events are the one
 * exception — they reach the caller immediately but are merged into a single
 * logged `text` event, flushed when the run of text ends, when the stream
 * ends, or when the consumer abandons the step (the `finally`). Tool-call
 * durations are measured
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
  startedAt: number,
  run: RunState,
): AsyncIterable<StepEvent & { runId: string }> {
  const { tenant, store } = deps;
  const pending = new Map<string, { name: string; at: number; input: unknown }>();
  const toolCalls: ToolCallLog[] = [];
  // The run record's derived fields (spec §4.3): which primitives the step
  // read, and which proposals it raised. Both are read off events the loop
  // already handles below — no second pass, and no new model call.
  const primitivesRead: string[] = [];
  const proposals: string[] = [];
  let sawTerminal = false;

  // What every finalization of this run's record carries from here on,
  // whatever the outcome — including the `abandoned` one `runStep` writes if
  // the caller hangs up before any of the terminal paths below is reached.
  run.outcome = (calls?: ToolCallLog[]): RunPatch => ({
    finishedAt: nowIso(),
    durationMs: Date.now() - startedAt,
    toolCalls: calls ?? finishToolCalls(toolCalls, pending),
    primitivesRead: [...primitivesRead],
    proposals: [...proposals],
  });

  // `text` deltas are yielded the instant they arrive — a caller streaming to
  // a user must not wait on the next non-text event — but they are held back
  // from the LOG until the run of text ends. The local tier emits one delta
  // per token, which wrote 177 events / 13 KB of JSONL for a single ~800
  // character answer, and left every reader of `GET /threads/:id` to redo the
  // coalescing the SSE layer already does. One run of text is one `text`
  // event in the log; a `tool_call` between two runs still splits them.
  let textBuffer: string[] = [];
  const flushText = async (): Promise<string | null> => {
    if (textBuffer.length === 0) return null;
    const merged = textBuffer.join('');
    textBuffer = [];
    return tryPersist(() => store.append(tenant, opts.threadId, { type: 'text', text: merged, at: nowIso() }));
  };

  try {
    for await (const ev of events) {
      if (ev.type === 'session') {
        const failed = await tryPersist(() => store.setSession(tenant, opts.threadId, provider.id, ev.id));
        if (failed) {
          finalizeRun(deps, runId, run, { status: 'error', error: failed });
          yield { type: 'error', message: failed, runId };
          return;
        }
        continue;
      }

      if (ev.type === 'text') {
        textBuffer.push(ev.text);
        yield { ...ev, runId };
        continue;
      }

      const flushFailed = await flushText();
      if (flushFailed) {
        finalizeRun(deps, runId, run, { status: 'error', error: flushFailed });
        yield { type: 'error', message: flushFailed, runId };
        return;
      }

      const failed = await tryPersist(() => store.append(tenant, opts.threadId, { ...ev, at: nowIso() } as ThreadEvent));
      if (failed) {
        // The store is broken, so the error event cannot be logged either —
        // it only reaches the caller.
        finalizeRun(deps, runId, run, { status: 'error', error: failed });
        yield { type: 'error', message: failed, runId };
        return;
      }

      let proposalToYield: Extract<StepEvent, { type: 'proposal' | 'artifact' }> | null = null;
      if (ev.type === 'tool_call') {
        pending.set(ev.id, { name: ev.name, at: Date.now(), input: ev.input });
        rememberPrimitive(primitivesRead, ev);
      } else if (ev.type === 'tool_result') {
        const call = pending.get(ev.id);
        pending.delete(ev.id);
        // A result with no matching call (a harness that reports only the
        // result, or an id that did not round-trip) still happened — it is
        // logged with an unknown duration rather than a fabricated 0.
        toolCalls.push({ name: ev.name, ms: call ? Date.now() - call.at : null, isError: ev.isError === true });
        if (ev.name === 'propose_update' && ev.isError !== true && call) {
          proposalToYield = proposalEvent(ev.output, call.input);
          if (proposalToYield) proposals.push(proposalToYield.id);
        } else if ((ev.name === 'apply_redlines' || ev.name === 'docx_compare') && ev.isError !== true) {
          // Same shape as a proposal: the tool appended the durable
          // `artifact` ThreadEvent; this is the live signal for the slip.
          proposalToYield = artifactEvent(ev.output);
        }
      } else if (ev.type === 'done') {
        sawTerminal = true;
        if (ev.sessionId) {
          const sessionFailed = await tryPersist(() =>
            store.setSession(tenant, opts.threadId, provider.id, ev.sessionId as string),
          );
          if (sessionFailed) {
            finalizeRun(deps, runId, run, { status: 'error', error: sessionFailed });
            yield { type: 'error', message: sessionFailed, runId };
            return;
          }
        }
      } else if (ev.type === 'error') {
        sawTerminal = true;
      }

      // Telemetry — the run log and the run record's final state — is written
      // BEFORE the terminal event reaches the caller, and its failures go to
      // stderr: neither may cost a caller its `done`. It CANNOT be written
      // after the yield. A real SSE client cancels the response the instant
      // it has the `done` frame; the cancel reaches this generator as
      // `return()` AT that yield, so nothing past it ever runs and the
      // record is left for `runStep`'s `finally` to stamp `abandoned` —
      // a step that finished, filed as one the caller walked away from.
      if (ev.type === 'done') {
        // One tally, two readers: the run log's entry and the record's.
        // Tallying twice would walk the same still-pending calls again for no
        // reason, and leave two lists that only happen to agree.
        const calls = finishToolCalls(toolCalls, pending);
        recordRun(deps, opts, provider, runId, ev.usage, Date.now() - startedAt, calls);
        finalizeRun(
          deps,
          runId,
          run,
          {
            status: 'done',
            usage: ev.usage,
            ...(ev.usage.costUsd === undefined ? {} : { costUsd: ev.usage.costUsd }),
            // Only a step that ASKED for a structured answer records one: a
            // provider's `output` is `null` otherwise, and a null in the record
            // would read as "it produced nothing".
            ...(opts.outputSchema ? { output: ev.output } : {}),
          },
          calls,
        );
      } else if (ev.type === 'error') {
        finalizeRun(deps, runId, run, {
          status: isTimeoutError(ev) ? 'timeout' : 'error',
          error: ev.message,
          // A typed step that could not honor its schema carries the raw
          // answer; the record keeps it beside the message rather than
          // folding the two into one string (web-ui spec §4.3).
          ...(ev.text === undefined ? {} : { errorText: ev.text }),
        });
      }

      yield { ...ev, runId };

      // Synthesized, never logged: the `proposal` ThreadEvent the tool
      // itself appended (during `execute`, before this `tool_result` was
      // even produced) is the durable record. This is the caller-facing
      // signal — SSE clients, the adapter — that a proposal now exists.
      // Terminals never carry one, so the telemetry above cannot displace it.
      if (proposalToYield) yield { ...proposalToYield, runId };
    }

    // A stream that ends on text (no terminal event) still has to leave that
    // text in the log.
    const tailFailed = await flushText();
    if (tailFailed) {
      finalizeRun(deps, runId, run, { status: 'error', error: tailFailed });
      yield { type: 'error', message: tailFailed, runId };
      return;
    }

    if (!sawTerminal) {
      const ev: StepEvent = { type: 'error', message: `${provider.id} ended the step without a done or error event` };
      await tryPersist(() => store.append(tenant, opts.threadId, { ...ev, at: nowIso() }));
      finalizeRun(deps, runId, run, { status: 'error', error: ev.message });
      yield { ...ev, runId };
    }
  } finally {
    // A consumer that abandons the step — an SSE client hanging up, which
    // reaches this generator as `return()` — unwinds it at the `yield` in the
    // text branch above, so neither the mid-loop flush nor the tail flush
    // ever runs and the whole run of deltas is lost. The partial answer was
    // real and the user may have seen it, so it belongs in the transcript.
    //
    // Nothing here may throw or yield: this runs during an unwind, where a
    // thrown error would replace the completion that caused it and a `yield`
    // is illegal outright. A failed flush is reported the way `recordRun`
    // reports its own — to stderr — and the unwind continues.
    const failed = await flushText();
    if (failed) console.error(`counsel-loop: ${failed} (thread ${opts.threadId})`);
  }
}

/**
 * Builds the `proposal` StepEvent for a successful `propose_update` result,
 * or `null` if the output doesn't carry a `proposalId` the way the tool
 * promises to (spec §4.2). `output` may be the object the in-process tiers
 * produce directly, or the JSON-stringified form a stdio harness round-trips
 * it through — both are accepted so this works for Claude/direct and Codex
 * alike. `path`/`rationale` come from the matching `tool_call`'s input,
 * which `proposeUpdateTool`'s own schema already requires to be strings.
 */
function proposalEvent(output: unknown, input: unknown): Extract<StepEvent, { type: 'proposal' }> | null {
  let parsed = output;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const id = (parsed as Record<string, unknown>).proposalId;
  if (typeof id !== 'string') return null;

  if (typeof input !== 'object' || input === null) return null;
  const { path, rationale } = input as Record<string, unknown>;
  if (typeof path !== 'string' || typeof rationale !== 'string') return null;

  return { type: 'proposal', id, path, rationale };
}

/**
 * The `artifact` StepEvent for a successful `apply_redlines` result — the
 * tool's output names the file it wrote, the artifact id it recorded and
 * the summary; a result without an `artifactId` (no thread in play, or a
 * run outside the loop) yields nothing. Accepts the object or its
 * JSON-stringified form, as `proposalEvent` does.
 */
function artifactEvent(output: unknown): Extract<StepEvent, { type: 'artifact' }> | null {
  let parsed = output;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { artifactId, output: path, summary, kind } = parsed as Record<string, unknown>;
  if (typeof artifactId !== 'string' || typeof path !== 'string' || typeof summary !== 'object' || summary === null) return null;
  return { type: 'artifact', id: artifactId, path, kind: kind === 'docx-compare' ? 'docx-compare' : 'docx-redline', summary: summary as ArtifactSummary };
}

/**
 * Records a `read_primitive` call in the run record's `primitivesRead` —
 * unique, in the order the step first read each one. The name comes from the
 * call's input, which `readPrimitiveTool`'s schema requires to be a string;
 * a call the model malformed is simply not a primitive that was read.
 */
function rememberPrimitive(into: string[], ev: Extract<StepEvent, { type: 'tool_call' }>): void {
  if (ev.name !== 'read_primitive') return;
  const input = ev.input;
  if (typeof input !== 'object' || input === null) return;
  const name = (input as Record<string, unknown>).name;
  if (typeof name !== 'string' || into.includes(name)) return;
  into.push(name);
}

/**
 * Opens this step's run record — before the provider is resolved, so a step
 * that dies choosing one still leaves the request behind (spec §4.3).
 * Failures go to stderr, never out of the loop: the record is telemetry.
 */
function beginRun(deps: CounselLoopDeps, opts: RunStepOptions, runId: string, startedAt: string, taskSource?: TaskSource): void {
  const rec: RunRecord = {
    runId,
    threadId: opts.threadId,
    tenant: deps.tenant,
    startedAt,
    status: 'running',
    message: opts.message,
    // Nothing has been resolved yet; `patchRun` fills this in the moment the
    // router (or the caller's `providerId`) names one.
    provider: '',
    ...(opts.task ? { task: opts.task } : {}),
    ...(taskSource === undefined ? {} : { taskSource }),
    primitivesRead: [],
    toolCalls: [],
    proposals: [],
  };
  try {
    startRun(deps.vaultRoot, rec);
  } catch (err) {
    console.error(`counsel-loop: run record write failed for ${runId}: ${message(err)}`);
  }
}

/**
 * Closes out a run record: the outcome so far plus the terminal status, and
 * the flag that stops `runStep`'s `finally` from marking the step abandoned.
 * `patch` wins over `outcome()`, so a caller can override a derived field.
 * `calls` hands `outcome()` a tool tally the caller already finished, so the
 * `done` path tallies once for both the run log and the record.
 */
function finalizeRun(deps: CounselLoopDeps, runId: string, run: RunState, patch: RunPatch, calls?: ToolCallLog[]): void {
  run.finalized = true;
  patchRun(deps, runId, { ...run.outcome(calls), ...patch });
}

/** Updates an open run record, swallowing failures to stderr — same rule as
 * `beginRun` and the run log. */
function patchRun(deps: CounselLoopDeps, runId: string, patch: RunPatch): void {
  try {
    finishRun(deps.vaultRoot, deps.tenant, runId, patch);
  } catch (err) {
    console.error(`counsel-loop: run record write failed for ${runId}: ${message(err)}`);
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
