import { randomUUID } from 'node:crypto';
import type { ZodType } from 'zod';
import type { Message, ModelProvider, Platform, StepEvent, StepRequest, Tenant, ToolDef, VaultStore } from '../core/types';
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

/** A provider that can be re-bound to a per-thread home directory — today
 * only `CodexHarnessProvider`, whose sessions live inside `CODEX_HOME` and
 * so cannot be resumed from a different one. Duck-typed rather than an
 * `instanceof` check so this module does not pull in the Codex SDK. */
interface HomeBindable {
  withHome(dir: string): ModelProvider;
}

function isHomeBindable(p: ModelProvider): p is ModelProvider & HomeBindable {
  return typeof (p as Partial<HomeBindable>).withHome === 'function';
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Codex keeps a thread's state under its `CODEX_HOME`, so a registry-built
 * `codex-sub/*` provider — shared by every thread — has to be re-bound to
 * this thread's own persistent home before it can resume anything. Every
 * other provider is returned unchanged.
 */
function bindToThread(provider: ModelProvider, store: ThreadStore, threadId: string): ModelProvider {
  if (!provider.id.startsWith('codex-sub/') || !isHomeBindable(provider)) return provider;
  return provider.withHome(store.codexHomeFor(threadId));
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

  await store.append(tenant, threadId, { t: 'user', at: nowIso(), content: opts.message });

  let provider: ModelProvider;
  try {
    provider = bindToThread(resolveProvider(deps, opts), store, threadId);
  } catch (err) {
    yield { type: 'error', message: message(err), runId };
    return;
  }

  await store.append(tenant, threadId, {
    t: 'step',
    at: nowIso(),
    runId,
    provider: provider.id,
    ...(opts.task ? { task: opts.task } : {}),
  });

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

    budgetTokens = provider.capabilities.contextTokens - estimateTokens(system) - REPLY_RESERVE_TOKENS;
    base = {
      tenant,
      system,
      messages: [],
      tools: stepTools(deps, threadId, cfg, scriptTools),
      ...(opts.outputSchema ? { outputSchema: opts.outputSchema } : {}),
    };
  } catch (err) {
    const ev: StepEvent = { type: 'error', message: message(err) };
    await store.append(tenant, threadId, { ...ev, at: nowIso() });
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

  let it = provider.run(req)[Symbol.asyncIterator]();
  let first = await it.next();

  // Resume failure (spec §5): the vendor's session is gone. Drop the dead id
  // and replay the log once for this same step — the caller never sees the
  // failed attempt, and nothing from it reaches the thread log. Only the
  // very first event counts: once real output has streamed, a later error
  // is a real error, not a bad session id.
  if (!first.done && sessionId && isResumeFailure(first.value)) {
    await it.return?.(undefined);
    await store.clearSession(tenant, threadId, provider.id);
    req = await replay();
    it = provider.run(req)[Symbol.asyncIterator]();
    first = await it.next();
  }

  yield* stream(deps, opts, provider, runId, it, first);
}

function isResumeFailure(ev: StepEvent): boolean {
  return ev.type === 'error' && RESUME_FAILURE_RE.test(ev.message);
}

/**
 * Drains the provider's stream: every event but `session` is appended to the
 * thread log and yielded with the run id; `session` (and `done.sessionId`)
 * updates the thread header instead. Tool-call durations are measured
 * between a `tool_call` and the `tool_result` carrying the same id, and the
 * whole tally is written to the run log when the step completes.
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
  it: AsyncIterator<StepEvent>,
  first: IteratorResult<StepEvent>,
): AsyncIterable<StepEvent & { runId: string }> {
  const { tenant, store } = deps;
  const startedAt = Date.now();
  const pending = new Map<string, number>();
  const toolCalls: ToolCallLog[] = [];
  let sawTerminal = false;

  let res = first;
  while (!res.done) {
    const ev = res.value;

    if (ev.type === 'session') {
      await store.setSession(tenant, opts.threadId, provider.id, ev.id);
      res = await it.next();
      continue;
    }

    await store.append(tenant, opts.threadId, { ...ev, at: nowIso() } as ThreadEvent);

    if (ev.type === 'tool_call') {
      pending.set(ev.id, Date.now());
    } else if (ev.type === 'tool_result') {
      const at = pending.get(ev.id);
      pending.delete(ev.id);
      toolCalls.push({ name: ev.name, ms: at === undefined ? 0 : Date.now() - at, isError: ev.isError === true });
    } else if (ev.type === 'done') {
      sawTerminal = true;
      if (ev.sessionId) await store.setSession(tenant, opts.threadId, provider.id, ev.sessionId);
      const entry: RunLogEntry = {
        at: nowIso(),
        provider: provider.id,
        ...(opts.task ? { task: opts.task } : {}),
        inputTokens: ev.usage.inputTokens,
        outputTokens: ev.usage.outputTokens,
        ...(ev.usage.costUsd === undefined ? {} : { costUsd: ev.usage.costUsd }),
        durationMs: Date.now() - startedAt,
        toolCalls,
      };
      writeRunLog(deps.vaultRoot, tenant, runId, [entry]);
    } else if (ev.type === 'error') {
      sawTerminal = true;
    }

    yield { ...ev, runId };
    res = await it.next();
  }

  if (!sawTerminal) {
    const ev: StepEvent = { type: 'error', message: `${provider.id} ended the step without a done or error event` };
    await store.append(tenant, opts.threadId, { ...ev, at: nowIso() });
    yield { ...ev, runId };
  }
}
