import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { MatterStaysLocalError, RouterError } from '../core/types';
import { DEFAULT_STEP_TIMEOUT_MS, runStep, type CounselLoopDeps, policyForOptions, resolveStepProvider } from '../loop/counsel-loop';
import { pendingProposals } from '../loop/pending-proposals';
import { applyProposal } from '../loop/proposals';
import { finishRun, listRuns, readRun, readRuns, type RunRecord } from '../loop/run-record';
import { DOCX_CONTENT_TYPE, docxToMarkdown, isDocxPath, NotADocxError, openDocx, UnsafeXmlError } from '../docx';
import { assertSafeXml } from '../docx/safety';
import { BASE_URL_RULE, isAllowedBaseURL, readRegistry, RegistryFile } from '../providers/registry';
import { DiscoveryCache, discoverModels } from '../providers/discovery';
import { prefixOf, vendorFor } from '../providers/vendors';
import { readKey } from '../providers/secrets';
import { isEnterprise, resolveEnterprise } from '../providers/enterprise';
import type { ThreadEvent, ThreadHeader } from '../threads/store';
import { vaultDocket } from '../vault/docket';
import { normalizeVaultPath } from '../vault/knowledge-paths';
import { vaultOverview } from '../vault/overview';
import { readVaultConfig, writeVaultConfigOverride } from '../vault/resolve-root';
import { appendOutcome, readOutcomes, type OutcomeLine } from '../outcomes/store';
import { recordWritten } from '../outcomes/written';
import { isTask, TASK_IDS } from '../tasks/taxonomy';
import { modelClassifier } from '../tasks/classify';
import { applyUpdates, contentStatus, UpdateError } from '../content/update';
import { repoContentSource } from '../content/repo';
import type { ContentSource } from '../content/source';
import { runDoctor } from '../doctor/index';
import { retroStatusFor, startRetro } from '../retro/index';
import { systemGit, type GitRunner } from '../setup/run';
import { authorize, CLEAR_SESSION_COOKIE, withSessionCookie } from './auth';
import {
  applySettings,
  effectiveDefault,
  settingsView,
  testProvider,
  TestBody,
  type RuntimeState,
  type SettingsDeps, providerView, keyContext, putProviderKey, deleteProviderKey, providerKeyState, KeyBody } from './settings';
import { sseFromEvents, type StreamEvent } from './sse';
import { confirmationMessage, estimateCost, needsConfirmation, type Pricing } from '../evals/cost';
import { defaultBenchmarksDir, FIXTURE_SETS, loadFixtures, sourceKindOf } from '../evals/fixture';
import { citationsFor, documentFor, draftFromThread, fixtureFromDraft, NoFixtureHere, pickRun, type FixtureDraft } from '../evals/from-thread';
import { pickJudge, providerJudge } from '../evals/judge';
import { appendResult, readResults } from '../evals/results';
import { runSet, summarize } from '../evals/runner';
import { fixtureCounts, scoreboard } from '../evals/scoreboard';
import { routeScores } from '../router/scores';
import { DEFAULT_MIN_SCORE, DEFAULT_PREFERENCE, readRoutingPolicy, taskPolicy, writeRoutingPolicy, type RoutingPolicy } from '../router/policy';
import type { Judge } from '../evals/scorers/types';
import { runCount, runnable, selectFixtures, taskOf } from '../evals/select';
import { serveStatic, type StaticSource } from './static';

/**
 * Everything the HTTP surface needs, minus the parts a `PUT /settings` can
 * replace. `providers`, `router` and `stepTimeoutMs` are deliberately NOT
 * here: they live in `RuntimeState` behind `state()`, so a handler cannot
 * accidentally capture the set that was live when the server started. The
 * compiler enforces it — there is no `deps.providers` to reach for.
 */
export interface ServerDeps extends Omit<CounselLoopDeps, 'providers' | 'router' | 'stepTimeoutMs'> {
  /** The bearer token every request must present (spec §4.5). */
  token: string;
  /** The live providers, router, default and step timeout, read fresh on
   * every request so a reload takes effect without a restart. */
  state(): RuntimeState;
  /** The registry file `/settings` reads and writes, and the reload that
   * installs a new one. */
  settings: SettingsDeps;
  /** The built UI's `dist/` (spec §4.2). Omitted → no static serving at all,
   * and a non-API path is the 404 it has always been. */
  /** The built UI: a `dist/` directory, or the embedded set in the compiled binary. */
  distDir?: string | StaticSource;
  /** The doctor's git runner (spec 2026-09-01 §7). Default: real git when
   * on PATH; `null` reports "git is not installed". */
  git?: GitRunner | null;
  /** Model discovery (providers spec §4): the fetch the vendor listings go
   * through, the environment the keys are read from, and the ten-minute
   * cache — all injectable so the route tests never touch the network. */
  discovery?: { fetch?: typeof fetch; env?: NodeJS.ProcessEnv; cache?: DiscoveryCache };
  /** The eval runner (routing-and-evals spec §4.2): where the shipped
   * fixtures live (default: the plugin root, i.e. the checkout), the price
   * lookup behind the cost guard (default: none known → no guard, and the
   * response says so), and the rubric judge (default: picked from the live
   * providers per spec §12). */
  evals?: {
    repoRoot?: string;
    pricing?: (providerId: string) => Pricing | null;
    judge?: Judge;
    tmpDir?: string;
    /** Where `counsel-os eval import` put the public benchmarks. Default:
     * `evals/benchmarks/` under the checkout the shipped fixtures come from
     * — without it an imported set is invisible to the app. */
    benchmarksDir?: string;
  };
}

export type App = (req: Request) => Promise<Response>;

/**
 * The first path segment of every route that needs the bearer token. It is
 * the WHOLE definition of the API surface: anything not on this list is
 * static, served with no credential, so a new route whose prefix is missing
 * here would be reachable by anyone who can reach the port.
 */
export const API_PREFIXES: readonly string[] = ['health', 'threads', 'runs', 'vault', 'settings', 'proposals', 'docket', 'setup', 'content', 'doctor', 'session', 'retro', 'providers', 'outcomes', 'evals', 'routing', 'fixtures'];

/** True when `pathname` belongs to the API (and so needs a token). `/` and
 * every client-side route are false. */
export function isApiPath(pathname: string): boolean {
  const first = pathname.split('/').find(s => s !== '');
  return first !== undefined && API_PREFIXES.includes(first);
}

const CreateThreadBody = z.object({ title: z.string().optional(), matter: z.string().optional() });

/** A vault-relative matter path a thread may link to: no absolute paths, no
 * `..` segments, no backslashes, never the store's own `.counsel/`. The same
 * shape the vault tools enforce, checked here so a header can never point
 * outside the vault. */
const MATTER_PATH = z
  .string()
  .min(1)
  .max(500)
  .refine(p => !p.startsWith('/') && !p.includes('\\') && !p.split('/').includes('..') && !p.toLowerCase().startsWith('.counsel'), {
    message: 'matter must be a vault-relative path',
  });

/** `PATCH /threads/:id` — housekeeping only: a title (trimmed, `''` clears
 * it) and/or a matter link (`null` unlinks). Nothing else on the header is
 * client-writable. */
const PatchThreadBody = z
  .object({ title: z.string().max(200).optional(), matter: MATTER_PATH.nullable().optional() })
  .strict()
  .refine(b => b.title !== undefined || b.matter !== undefined, { message: 'nothing to change' });

/** `POST /retro`: an optional period start; a bad date is a 400 like any
 * other schema failure rather than a silently ignored one. */
const RetroBody = z.object({
  since: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'since must be a date').optional(),
});

const EvalRunBody = z.object({
  fixtures: z.array(z.string()).optional(),
  task: z.string().optional(),
  all: z.boolean().optional(),
  /** Narrow to one set (`shipped` · `practice` · `benchmark`). */
  set: z.enum(FIXTURE_SETS).optional(),
  providerId: z.string().optional(),
  save: z.boolean().optional(),
  /** Accepts a run the cost guard would otherwise refuse (over $1). */
  confirm: z.boolean().optional(),
});

const StepBody = z.object({
  message: z.string().min(1),
  task: z.string().optional(),
  provider: z.string().optional(),
  /** A JSON Schema, converted to zod for the provider's structured output. */
  outputSchema: z.record(z.string(), z.unknown()).optional(),
});

const ApproveBody = z.object({
  proposalId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  /** Why (spec §7) — optional, kept in the outcomes record, never required. */
  reason: z.string().trim().max(500).optional(),
});

const MarkBody = z.object({
  mark: z.enum(['useful', 'not-right']),
  reason: z.string().trim().max(500).optional(),
});

const TaskBody = z.object({
  task: z.string().trim().min(1).max(40),
});

const VaultSettingsBody = z.object({
  outcomes: z.boolean(),
});

function text(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function fail(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, status);
}

/** An `HttpError` is a route saying "answer with this status" from anywhere
 * in its body; everything else that throws becomes a 500. */
class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly extra: Record<string, unknown> = {}) {
    super(message);
  }
}

/**
 * Parses a JSON request body against `schema`. An absent body is `{}`, so a
 * route whose fields are all optional (`POST /threads`) works with no body
 * at all. Malformed JSON and schema violations are both 400 (spec §5).
 */
async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await req.text();
  let parsed: unknown = {};
  if (raw.trim() !== '') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'invalid JSON body');
    }
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new HttpError(400, 'invalid request body', { issues: result.error.issues });
  }
  return result.data;
}

/**
 * Reads a thread, turning the store's failure modes into status codes: a
 * malformed id or tenant is the caller's mistake (400), a well-formed id
 * with nothing behind it is 404, and anything else (a broken vault, a
 * permissions problem) is a real 500 rather than a fictional 404.
 */
async function loadThread(deps: ServerDeps, id: string): Promise<{ header: ThreadHeader; events: ThreadEvent[] }> {
  try {
    return await deps.store.get(deps.tenant, id);
  } catch (err) {
    const message = text(err);
    if (message.includes('invalid thread id') || message.includes('invalid tenant')) {
      throw new HttpError(400, message);
    }
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new HttpError(404, `unknown thread: ${id}`);
    throw err;
  }
}

/**
 * Answers "can this step even run?" before a single SSE byte goes out.
 * `runStep` reports both of these as an `error` event inside a 200 stream,
 * which is right for a failure discovered mid-run but wrong for a request
 * that was never going to work: spec §5 wants 422 for an unknown provider
 * id or an unsatisfiable task route, and a status code can only be chosen
 * before the response begins.
 */
function checkProvider(state: RuntimeState, opts: { provider?: string; task?: string }): void {
  if (opts.provider !== undefined) {
    if (!state.providers.some(p => p.id === opts.provider)) {
      throw new HttpError(422, `unknown provider: ${opts.provider}`);
    }
    return;
  }
  try {
    state.router.resolve(opts.task);
  } catch (err) {
    if (err instanceof RouterError) throw new HttpError(422, err.message);
    throw err;
  }
}

/** Vault paths from the query string get the same normalization the model's
 * tools get, so `../` and absolute paths are rejected identically (400). */
function vaultPath(raw: string): string {
  try {
    return normalizeVaultPath(raw);
  } catch (err) {
    throw new HttpError(400, text(err));
  }
}

const CONTENT_TYPES: Record<string, string> = {
  docx: DOCX_CONTENT_TYPE,
  md: 'text/markdown; charset=utf-8',
  markdown: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  pdf: 'application/pdf',
};

export function contentTypeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/** `attachment; filename="…"; filename*=UTF-8''…` — the ASCII fallback for
 * old agents, the encoded form for everyone else, per RFC 6266. */
export function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** How large an upload may be. A contract is tens of kilobytes; a 25 MB
 * Word file is a scanned exhibit, which the reader cannot show anyway. */
export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

/** The folder a drop lands in when no matter is chosen (spec §10). */
export const INBOX_DIR = 'inbox';

/**
 * A safe file name from whatever the browser sent: the basename only (a
 * path in a filename is an escape attempt or a browser quirk, never a
 * wish), control characters and the characters no filesystem accepts
 * replaced, no leading dots (a dotfile would vanish from the tree).
 */
export function safeBasename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return cleaned === '' ? 'document' : cleaned;
}

/** `name-2.ext`, `name-3.ext`, … for the given ordinal (1 = the name itself). */
export function suffixed(name: string, n: number): string {
  if (n <= 1) return name;
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? `${name}-${n}` : `${name.slice(0, dot)}-${n}${name.slice(dot)}`;
}

/** Maps a store failure on a normalized path: `.counsel/` is reserved (400),
 * a missing file is 404. */
function vaultFailure(err: unknown): never {
  const message = text(err);
  if (message.includes('reserved path') || message.includes('path outside vault')) {
    throw new HttpError(400, message);
  }
  const code = (err as NodeJS.ErrnoException).code;
  // EISDIR: `/vault/read` was pointed at a directory (and ENOTDIR, a file
  // used as one). The path is well-formed but names the wrong kind of thing
  // — the caller's mistake, not a missing file.
  if (code === 'EISDIR') throw new HttpError(400, message);
  if (code === 'ENOENT' || code === 'ENOTDIR') throw new HttpError(404, message);
  throw err;
}

/**
 * Runs one function per thread at a time. Two `POST /threads/:id/steps` on
 * the same thread would otherwise interleave their appends — `ThreadStore`
 * does a read-modify-write of the header on every event and has no lock —
 * so the second request waits for the first step's stream to finish before
 * its own run begins. Different threads never wait on each other.
 */
class ThreadLocks {
  private readonly tails = new Map<string, Promise<void>>();

  async acquire(key: string): Promise<() => void> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>(resolve => {
      release = resolve;
    });
    const tail = previous.then(() => mine);
    this.tails.set(key, tail);
    await previous;
    return () => {
      release();
      // Drop the entry once nobody is queued behind it, so a long-lived
      // server does not keep a promise per thread it ever served.
      void tail.then(() => {
        if (this.tails.get(key) === tail) this.tails.delete(key);
      });
    };
  }
}

/** Releases the thread lock when the step's stream ends — normally, by
 * throwing, or because the client hung up and the consumer called
 * `return()` on the generator. */
async function* withRelease(source: AsyncIterable<StreamEvent>, release: () => void): AsyncIterable<StreamEvent> {
  try {
    yield* source;
  } finally {
    release();
  }
}

/** The key `PUT /settings` serializes on. `ThreadLocks` is a keyed mutex,
 * not something that knows about threads; this key is not a thread id and
 * cannot collide with one, since thread ids are uuids. */
const SETTINGS_LOCK = 'settings';

/** The comment line a typed stream opens with. A client that sees it knows the
 * missing `text` frames are suppression, not silence. */
export const TYPED_PREAMBLE = ': typed\n\n';

/** Set to `1` when a listing is bounded and something was left out — see
 * `GET /proposals`. Absent means the response is the whole answer. */
export const TRUNCATED_HEADER = 'x-counsel-truncated';

/**
 * Drops `text` events (web-ui spec §4.3). Under an `outputSchema` the deltas
 * are the model working its way toward JSON, not an answer to show, and a UI
 * that streamed them would render half a JSON object and then replace it.
 * The thread log still keeps them — the loop writes them upstream of this —
 * and a structured-output failure hands the raw answer back on the terminal
 * `error`'s own `text`, which is NOT dropped.
 */
async function* withoutText(source: AsyncIterable<StreamEvent>): AsyncIterable<StreamEvent> {
  for await (const ev of source) {
    if (ev.type !== 'text') yield ev;
  }
}

/**
 * The whole HTTP surface (spec §4.5) as a plain fetch handler: no socket, no
 * Bun.serve, so the route tests drive it directly with `Request` objects.
 * `serve.ts` is the only thing that binds it to a port.
 */
export function createApp(deps: ServerDeps): App {
  const locks = new ThreadLocks();
  const staticHandler = deps.distDir === undefined ? null : serveStatic(deps.distDir);

  /**
   * The loop's dependencies as of RIGHT NOW: the fixed half of `deps` plus
   * whatever `PUT /settings` has installed. Built per request, never hoisted
   * — a value captured once is exactly the staleness `RuntimeState` exists
   * to prevent.
   */
  /**
   * What the router needs from the scoreboard (routing-and-evals spec §6),
   * read once and kept until a scoring run or a policy save moves it. The
   * results file grows one line per fixture run, so re-reading it on every
   * step would be work for nothing.
   */
  let routingCache: { scores: ReturnType<typeof routeScores>; policy: ReturnType<typeof readRoutingPolicy> } | null = null;
  const routingView = (): { scores: ReturnType<typeof routeScores>; policy: ReturnType<typeof readRoutingPolicy> } => {
    if (routingCache === null) {
      const counts = fixtureCounts(evalLoaded().map(l => ({ task: taskOf(l), set: sourceKindOf(l), runnable: runnable(l) })));
      routingCache = {
        scores: routeScores(scoreboard(readResults(deps.vaultRoot, { since: null }), counts)),
        policy: readRoutingPolicy(deps.vaultRoot),
      };
    }
    return routingCache;
  };
  const forgetRouting = (): void => {
    routingCache = null;
  };

  const loopDeps = (): CounselLoopDeps => {
    const state = deps.state();
    return {
      tenant: deps.tenant,
      vaultRoot: deps.vaultRoot,
      pluginRoot: deps.pluginRoot,
      ...(deps.content === undefined ? {} : { content: deps.content }),
      vault: deps.vault,
      store: deps.store,
      providers: state.providers,
      router: state.router,
      ...(deps.platform === undefined ? {} : { platform: deps.platform }),
      ...(state.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: state.stepTimeoutMs }),
      // The model classifier is opt-in (`classify: model` in config.md): a
      // scripted or metered provider must not spend a turn on it unasked.
      ...(readVaultConfig(deps.vaultRoot).classify === 'model' ? { classifier: modelClassifier(state.providers, state.router, deps.tenant) } : {}),
      routing: routingView,
    };
  };

  /** Appends to the vault's outcomes record; never fails a request. */
  const recordOutcome = (line: Omit<OutcomeLine, 'at'>): void => {
    try {
      appendOutcome(deps.vaultRoot, readVaultConfig(deps.vaultRoot), line);
    } catch (err) {
      console.error(`outcomes: write failed: ${text(err)}`);
    }
  };

  /** Runs `fn` with this thread's lock held for its whole duration — for the
   * handlers that finish inside one function. `steps` cannot use it: its work
   * outlives the handler, so it releases when the stream ends instead. */
  const withThreadLock = async <T>(id: string, fn: () => Promise<T>): Promise<T> => {
    const release = await locks.acquire(`${deps.tenant}/${id}`);
    try {
      return await fn();
    } finally {
      release();
    }
  };

  const health = (): Response => {
    const state = deps.state();
    return json({
      // A vault is live: the setup app (`setup-routes.ts`) is the one that
      // says `true`, and the page keys its first-run screen on this.
      setup: false,
      vault: deps.vaultRoot,
      tenant: deps.tenant,
      providers: state.providers.map(p => providerView(p, keyContext(deps))),
      default: effectiveDefault(state),
      // What a step on this runtime actually gets, not what was configured:
      // an operator reading /health wants the effective number.
      stepTimeoutMs: state.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
      // Whether this vault keeps the local record of decisions and marks
      // (routing-and-evals spec §7).
      outcomes: readVaultConfig(deps.vaultRoot).outcomes !== false,
    });
  };

  /**
   * `PUT /settings` (spec §4.1). The body is the whole registry file, so a
   * schema failure is the shared 400-with-issues every other route gives.
   *
   * Serialized on `SETTINGS_LOCK`, because `applySettings` is a
   * read-modify-write of one file: two overlapping PUTs could otherwise
   * restore each other's contents, and the loser's registry would win. The
   * lock is taken AFTER the body is read — a slow client must not be able to
   * hold the settings surface shut by trickling out a request.
   */
  const putSettings = async (req: Request): Promise<Response> => {
    const next = await body(req, RegistryFile);
    const release = await locks.acquire(SETTINGS_LOCK);
    try {
      return applySettings(deps, next);
    } finally {
      release();
    }
  };

  /** `PUT`/`DELETE /providers/<id>/key` (providers spec §5). The id may
   * carry slashes (`openrouter/anthropic/claude-x`), so it is everything
   * between the prefix and the trailing `key`. Serialized on the settings
   * lock: both reload the registry. */
  const putKey = async (req: Request, id: string): Promise<Response> => {
    const parsed = await body(req, KeyBody);
    const release = await locks.acquire(SETTINGS_LOCK);
    try {
      return putProviderKey(deps, id, parsed);
    } finally {
      release();
    }
  };
  const deleteKey = async (id: string): Promise<Response> => {
    const release = await locks.acquire(SETTINGS_LOCK);
    try {
      return deleteProviderKey(deps, id);
    } finally {
      release();
    }
  };

  /**
   * `GET /providers/:id/models` (providers spec §4): the vendor's own list,
   * or the catalog's curated one. `:id` is a prefix (`openai`) or a full
   * provider id (`openai/gpt-5.6`, which may itself contain slashes). The
   * key is resolved the way the registry resolves it — the secret store,
   * else the entry's `apiKeyEnv`, else the vendor's usual variable — and a keyed vendor is
   * never called without one. Cached per vendor and base URL for ten
   * minutes; `?refresh=1` asks again. Never a throw: a vendor that is down
   * is a sentence in `error`.
   */
  const discoveryCache = deps.discovery?.cache ?? new DiscoveryCache();
  const modelsRoute = async (id: string, url: URL): Promise<Response> => {
    const prefix = prefixOf(id);
    const vendor = vendorFor(prefix);
    if (vendor === undefined) return fail(404, `unknown provider: ${prefix}`);
    const env = deps.discovery?.env ?? process.env;
    let entry: { id: string; baseURL?: string; apiKeyEnv?: string; extra?: Record<string, string> } | undefined;
    try {
      const rows = readRegistry(deps.settings.file).providers ?? [];
      entry = rows.find(e => e.id === id) ?? rows.find(e => prefixOf(e.id) === prefix);
    } catch {
      entry = undefined; // a file that does not parse is /settings' problem, not this listing's
    }
    const queryBase = url.searchParams.get('baseURL');
    if (queryBase !== null && !isAllowedBaseURL(queryBase)) return fail(400, BASE_URL_RULE);
    const baseURL = queryBase ?? entry?.baseURL;
    // An enterprise vendor (providers spec §3 step 5): its fields, resolved
    // the way the registry resolves them, name where to ask and sign it.
    // The row's unsaved non-secret fields ride in the query (`?resourceName=`,
    // `?region=`), so the picker works before the first Save.
    if (isEnterprise(vendor)) {
      const fromQuery: Record<string, string> = {};
      for (const f of vendor.fields) {
        if (f.secret) continue;
        const q = url.searchParams.get(f.name);
        if (q !== null && q.trim() !== '') fromQuery[f.name] = q.trim();
      }
      const r = resolveEnterprise(vendor, { id: entry?.id ?? id, entry: { extra: { ...entry?.extra, ...fromQuery } }, store: deps.settings.secrets, env, home: deps.settings.home });
      const cacheKey = discoveryCache.key(prefix, baseURL ?? JSON.stringify(r.extra));
      if (url.searchParams.get('refresh') !== '1') {
        const hit = discoveryCache.get(cacheKey);
        if (hit !== null) return json(hit);
      }
      const result = await discoverModels(vendor, {
        extra: r.extra,
        secrets: r.secrets,
        ...(baseURL === undefined ? {} : { baseURL }),
        ...(deps.discovery?.fetch === undefined ? {} : { fetch: deps.discovery.fetch }),
      });
      discoveryCache.set(cacheKey, result);
      return json(result);
    }
    // The key, the way the registry resolves it (providers spec §5): the
    // secret store first, then the entry's variable, then the vendor's usual
    // one. `readKey` asks for the key the way the registry files it, so a
    // key pasted against a provider that has no row yet still lists its
    // models — which is the order a lawyer works in: pick the vendor, paste
    // the key, choose a model from what comes back.
    //
    // But NEVER to an address the caller made up. `baseURL` here is a query
    // parameter, `isAllowedBaseURL` admits any https host, and this is the
    // one route that would then put a bearer token on the request. A base
    // URL that does not match the saved row's goes out unauthenticated: it
    // is a row being typed, which has no key yet anyway.
    const keyEnv = entry?.apiKeyEnv ?? vendor.keyEnv;
    // The vendor's OWN address is not made up. A provider still being set
    // up has no registry row, and its row carries the preset the catalog
    // prefilled — comparing against the row alone suppressed the key for
    // every preset vendor, which is exactly the case a key was just pasted
    // to unblock.
    const known = [entry?.baseURL, vendor.defaultBaseURL].map(u => (u ?? '').trim().replace(/\/+$/, '')).filter(u => u !== '');
    const asked = (queryBase ?? '').trim().replace(/\/+$/, '');
    const madeUp = asked !== '' && !known.includes(asked);
    const stored = madeUp ? null : readKey(deps.settings.secrets, entry?.id ?? id, entry ?? {});
    const apiKey = stored ?? (madeUp ? undefined : keyEnv === undefined ? undefined : env[keyEnv]);
    const cacheKey = discoveryCache.key(prefix, baseURL);
    if (url.searchParams.get('refresh') !== '1') {
      const hit = discoveryCache.get(cacheKey);
      if (hit !== null) return json(hit);
    }
    const result = await discoverModels(vendor, {
      ...(apiKey === undefined ? {} : { apiKey }),
      ...(baseURL === undefined ? {} : { baseURL }),
      ...(deps.discovery?.fetch === undefined ? {} : { fetch: deps.discovery.fetch }),
    });
    discoveryCache.set(cacheKey, result);
    return json(result);
  };

  const runProviderTest = async (req: Request): Promise<Response> =>
    testProvider(loopDeps(), (await body(req, TestBody)).provider);

  const createThread = async (req: Request): Promise<Response> => {
    const init = await body(req, CreateThreadBody);
    return json(await deps.store.create(deps.tenant, init), 201);
  };

  /** The thread plus the privacy policy its EXPLICIT matter (or the vault
   * default) implies — what the UI shows before the reader sends anything.
   * Attachment chips are only known at send time and are judged there. */
  const getThread = async (id: string): Promise<Response> => {
    const thread = await loadThread(deps, id);
    const policy = await policyForOptions({ tenant: deps.tenant, vaultRoot: deps.vaultRoot, vault: deps.vault }, { ...(thread.header.matter === undefined ? {} : { matter: thread.header.matter }), message: '' });
    return json({ ...thread, policy: { localOnly: policy.localOnly, source: policy.source } });
  };

  const patchThread = async (req: Request, id: string): Promise<Response> => {
    const patch = await body(req, PatchThreadBody);
    return withThreadLock(id, async () => {
      await loadThread(deps, id);
      return json(
        await deps.store.update(deps.tenant, id, {
          ...(patch.title === undefined ? {} : { title: patch.title.trim() }),
          ...(patch.matter === undefined ? {} : { matter: patch.matter }),
        }),
      );
    });
  };
  const deleteThread = async (id: string): Promise<Response> =>
    withThreadLock(id, async () => {
      const { header } = await loadThread(deps, id);
      await deps.store.remove(deps.tenant, id);
      recordOutcome({ kind: 'thread.deleted', threadId: id, ...(header.matter === undefined ? {} : { matter: header.matter }), detail: { title: header.title ?? '' } });
      return new Response(null, { status: 204 });
    });

  /** The lawyer's mark on an answer (spec §7): recorded, and kept on the run
   * record so the strip shows it after a reload. */
  const markTurn = async (req: Request, id: string, runId: string): Promise<Response> => {
    const input = await body(req, MarkBody);
    const { header } = await loadThread(deps, id);
    const run = readRun(deps.vaultRoot, deps.tenant, runId);
    if (run === null || run.threadId !== id) throw new HttpError(404, `unknown run: ${runId}`);
    const at = new Date().toISOString();
    const mark = { mark: input.mark, at, ...(input.reason === undefined || input.reason === '' ? {} : { reason: input.reason }) };
    finishRun(deps.vaultRoot, deps.tenant, runId, { mark });
    recordOutcome({ kind: 'answer.marked', threadId: id, runId, ...(run.task === undefined ? {} : { task: run.task }), providerId: run.provider, ...(header.matter === undefined ? {} : { matter: header.matter }), detail: { mark: input.mark, ...(input.reason === undefined || input.reason === '' ? {} : { reason: input.reason }) } });
    return json({ mark });
  };

  /** The lawyer corrects a step's task (spec §3): the step event and the run
   * record change, and the correction is an outcome. */
  const correctTask = async (req: Request, id: string, runId: string): Promise<Response> =>
    withThreadLock(id, async () => {
      const input = await body(req, TaskBody);
      const { header } = await loadThread(deps, id);
      const run = readRun(deps.vaultRoot, deps.tenant, runId);
      if (run === null || run.threadId !== id) throw new HttpError(404, `unknown run: ${runId}`);
      if (!isTask(input.task)) return fail(400, `task must be one of ${TASK_IDS.join(', ')}`);
      const from = run.task ?? 'chat';
      if (from === input.task) return json({ task: input.task, taskSource: run.taskSource ?? 'caller' });
      await deps.store.updateStep(deps.tenant, id, runId, { task: input.task, taskSource: 'corrected' });
      finishRun(deps.vaultRoot, deps.tenant, runId, { task: input.task, taskSource: 'corrected' });
      recordOutcome({ kind: 'task.corrected', threadId: id, runId, task: input.task, providerId: run.provider, ...(header.matter === undefined ? {} : { matter: header.matter }), detail: { from, to: input.task, was: run.taskSource ?? 'caller' } });
      return json({ task: input.task, taskSource: 'corrected' });
    });

  const outcomes = (url: URL): Response => {
    const since = url.searchParams.get('since');
    if (since !== null && Number.isNaN(Date.parse(since))) return fail(400, 'since must be a date');
    return json(readOutcomes(deps.vaultRoot, { since }));
  };

  // ── Evals (routing-and-evals spec §4.2) ─────────────────────────────────
  /** The shipped fixtures come through the content source (spec §9), so
   * the compiled binary runs the same suite as a checkout; `evals.repoRoot`
   * points at another checkout. */
  const evalContent = (): ContentSource =>
    deps.evals?.repoRoot !== undefined ? repoContentSource(deps.evals.repoRoot) : (deps.content ?? repoContentSource(deps.pluginRoot));
  const evalBenchmarks = (): string => deps.evals?.benchmarksDir ?? defaultBenchmarksDir(deps.evals?.repoRoot ?? deps.pluginRoot);
  const evalLoaded = () => loadFixtures({ content: evalContent(), vaultRoot: deps.vaultRoot, benchmarksDir: evalBenchmarks() });

  const evalFixtures = (): Response =>
    json({
      fixtures: evalLoaded().map(l => ({
        id: l.fixture.id,
        ...(l.fixture.title === undefined ? {} : { title: l.fixture.title }),
        scorer: l.fixture.scorer,
        task: taskOf(l),
        source: l.fixture.source?.kind ?? l.set,
        set: l.set,
        runnable: runnable(l),
      })),
    });

  const evalResults = (url: URL): Response => {
    const since = url.searchParams.get('since');
    if (since !== null && Number.isNaN(Date.parse(since))) return fail(400, 'since must be a date');
    return json({ results: readResults(deps.vaultRoot, { since }) });
  };

  /** The scoreboard (spec §5): the results record folded per task ×
   * provider × set, with the fixture counts so an unscored task still shows. */
  const evalScoreboard = (): Response => {
    const counts = fixtureCounts(evalLoaded().map(l => ({ task: taskOf(l), set: sourceKindOf(l), runnable: runnable(l) })));
    return json(scoreboard(readResults(deps.vaultRoot, { since: null }), counts));
  };

  /**
   * The routing ledger: what actually ran, newest first, with the model it
   * got and the reason it got it.
   *
   * The scoreboard says how models do on fixtures and the Models group says
   * how each task is meant to route. Neither answers "what happened", which
   * is the question you ask after a morning's work — and it is the only way
   * to find out whether the rule and the practice agree.
   */
  const routingLedger = async (url: URL): Promise<Response> => {
    const raw = url.searchParams.get('limit');
    const limit = raw === null ? 50 : Number(raw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new HttpError(400, 'limit must be a whole number from 1 to 500');
    const runs = readRuns(deps.vaultRoot, deps.tenant, { limit });
    // The title of the threads in THIS page, not of every thread the vault
    // holds — and as stored, never derived. An untitled thread's derived
    // title is the first line of the lawyer's own message, which belongs in
    // the conversation rail, not in a table of every matter at once.
    const titles = new Map<string, string>();
    for (const id of new Set(runs.map(r => r.threadId))) {
      try {
        titles.set(id, (await deps.store.header(deps.tenant, id, { derive: false })).title ?? '');
      } catch {
        // A thread deleted since its run: the row still says what ran.
      }
    }
    return json({
      runs: runs.map(r => ({
        runId: r.runId,
        threadId: r.threadId,
        thread: titles.get(r.threadId) ?? '',
        at: r.startedAt,
        status: r.status,
        provider: r.provider,
        ...(r.task === undefined ? {} : { task: r.task }),
        ...(r.taskSource === undefined ? {} : { taskSource: r.taskSource }),
        ...(r.routeReason === undefined ? {} : { routeReason: r.routeReason }),
        ...(r.policy === undefined ? {} : { policy: r.policy }),
        ...(r.costUsd === undefined ? {} : { costUsd: r.costUsd }),
        ...(r.durationMs === undefined ? {} : { durationMs: r.durationMs }),
        ...(r.mark === undefined ? {} : { mark: r.mark.mark }),
      })),
    });
  };

  /**
   * How the practice routes each task, and who that picks today
   * (routing-and-evals spec §6). The pick runs the router itself, so the
   * Models group marks the provider a step would actually get rather than
   * a second guess at the same rule.
   */
  const routingGet = (): Response => {
    const { scores, policy } = routingView();
    const state = deps.state();
    const tasks: Record<string, { minScore: number; prefer: string; pinned?: string; picked?: { providerId: string; reason: string } }> = {};
    const named = new Set([...Object.keys(policy.tasks), ...Object.keys(scores)]);
    for (const task of named) {
      const entry = taskPolicy(policy, task);
      const row: { minScore: number; prefer: string; pinned?: string; picked?: { providerId: string; reason: string } } = {
        minScore: entry.min_score,
        prefer: entry.prefer,
        ...(entry.pinned === undefined ? {} : { pinned: entry.pinned }),
      };
      try {
        const routed = state.router.route(task, { scores: scores[task] ?? [], policy: entry });
        row.picked = { providerId: routed.provider.id, reason: routed.reason.text };
      } catch {
        // A router that cannot resolve at all (no default loaded) leaves the
        // row without a pick rather than failing the whole view.
      }
      tasks[task] = row;
    }
    return json({ defaults: { minScore: DEFAULT_MIN_SCORE, prefer: DEFAULT_PREFERENCE }, tasks });
  };

  // ── Fixtures from a matter (routing-and-evals spec §8) ──────────────────
  /** The document as text, whatever it is on disk: a Word file is converted
   * the same way `/vault/read` converts one. */
  const documentText = async (path: string): Promise<string> => {
    if (!isDocxPath(path)) return await deps.vault.read(deps.tenant, path);
    const { markdown } = docxToMarkdown(openDocx(await vaultBytes(path)));
    return markdown;
  };

  const Names = z.array(z.object({ name: z.string().min(1).max(200), kind: z.enum(['org', 'person']).optional() })).max(50);
  const DraftBody = z.object({
    threadId: z.string().min(1),
    runId: z.string().min(1).optional(),
    names: Names.optional(),
    title: z.string().max(200).optional(),
  });
  const SaveBody = DraftBody.extend({
    keep: z.array(z.string()).max(200),
    reject: z.array(z.string()).max(200).optional(),
    id: z.string().min(1).max(80).optional(),
    /** The anonymized text as the lawyer left it. */
    text: z.string().max(1_000_000).optional(),
    /** The step's message, as the lawyer left it. */
    message: z.string().max(20_000).optional(),
    /** Cited practice files the lawyer chose not to carry into the fixture. */
    dropKnowledge: z.array(z.string()).max(100).optional(),
    /** Replace a fixture of the same id. Absent, a clash is a 409. */
    overwrite: z.boolean().optional(),
  });

  /** Everything the draft builder needs from this thread. */
  const draftFor = async (input: z.infer<typeof DraftBody>): Promise<FixtureDraft> => {
    const { header, events } = await loadThread(deps, input.threadId);
    const records = listRuns(deps.vaultRoot, deps.tenant, input.threadId)
      .map(r => readRun(deps.vaultRoot, deps.tenant, r.runId))
      .filter((r): r is RunRecord => r !== null);
    // The document is read here, not in the builder: the builder is pure and
    // knows nothing about vaults, and this is the only path that reads one.
    const texts = new Map<string, string | null>();
    const run = pickRun(records, input.runId);
    const path = documentFor(events, run.runId);
    if (path !== null) {
      try {
        texts.set(path, await documentText(vaultPath(path)));
      } catch {
        // Unreadable, moved, or not a document at all: the builder says so
        // in the lawyer's words rather than 500-ing here.
        texts.set(path, null);
      }
    }
    // The cited practice files, read HERE and through the vault store: the
    // paths come from model output, and the store is what refuses `.counsel/`,
    // a symlink out of the vault, and anything `..` climbs to. The builder
    // then only looks up what this map holds.
    const knowledge = new Map<string, string | null>();
    for (const cited of citationsFor(run, events)) {
      try {
        knowledge.set(cited, await deps.vault.read(deps.tenant, vaultPath(cited)));
      } catch {
        knowledge.set(cited, null);
      }
    }
    // A matter that stays on this machine stays on this machine. A fixture
    // runs on whatever model the scoreboard picks, so making one out of that
    // matter would be a way around the policy rather than an exception to it.
    const policy = await policyForOptions(
      { tenant: deps.tenant, vaultRoot: deps.vaultRoot, vault: deps.vault },
      { ...(header.matter === undefined ? {} : { matter: header.matter }), message: run.message },
    );
    if (policy.localOnly) {
      throw new NoFixtureHere('This matter stays on this machine, and a fixture runs on whatever model scores best.');
    }

    return draftFromThread({
      threadId: input.threadId,
      events,
      runs: records,
      readKnowledge: p => knowledge.get(p) ?? null,
      ...(input.runId === undefined ? {} : { runId: input.runId }),
      ...(input.names === undefined ? {} : { names: input.names }),
      ...(input.title === undefined ? {} : { title: input.title }),
      readDocument: p => texts.get(p) ?? null,
    });
  };

  /** The draft behind "make this a fixture": the anonymized document, what
   * was replaced, and every finding as a candidate. Writes nothing — the
   * lawyer reads this first (spec §8). */
  const fixtureDraft = async (req: Request): Promise<Response> => {
    const input = await body(req, DraftBody);
    try {
      return json(await draftFor(input));
    } catch (err) {
      if (err instanceof NoFixtureHere) throw new HttpError(422, err.message);
      throw err;
    }
  };

  /**
   * The lawyer approved the anonymized text: write `practice/evals/<id>.json`.
   * The draft is rebuilt rather than posted back — the anonymizer is
   * deterministic, so the same thread yields the same mapping, and the
   * original document never travels back over the wire.
   */
  const fixtureSave = async (req: Request): Promise<Response> => {
    const input = await body(req, SaveBody);
    const release = await locks.acquire(SETTINGS_LOCK);
    try {
      const built = await draftFor(input);
      // A file the lawyer left out never reaches the fixture's vault.
      const left = new Set(input.dropKnowledge ?? []);
      // A file the lawyer removed is removed from the CITATIONS too: its
      // path is what leaks (a standard is often named after a client), and
      // a fixture that expects a citation to a file its vault does not hold
      // could never score it.
      const draft =
        left.size === 0
          ? built
          : {
              ...built,
              knowledge: built.knowledge.filter(k => !left.has(k.path)),
              citations: built.citations.filter(c => !left.has(c.aliases[0] ?? '')),
            };
      const saved = fixtureFromDraft(draft, {
        keep: input.keep,
        ...(input.reject === undefined ? {} : { reject: input.reject }),
        ...(input.id === undefined ? {} : { id: input.id }),
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.text === undefined ? {} : { text: input.text }),
        ...(input.message === undefined ? {} : { message: input.message }),
      });
      const { fixture, vault, files } = saved;
      const path = `practice/evals/${fixture.id}.json`;
      // Ids must be unique across the whole suite, not just this folder: a
      // result line names its fixture by id and nothing else.
      if (input.overwrite !== true && evalLoaded().some(l => l.fixture.id === fixture.id)) {
        throw new HttpError(409, `a fixture named ${fixture.id} is already here`);
      }
      // A re-save replaces the vault rather than writing into it: keeping a
      // knowledge file the new fixture no longer cites would leave exactly
      // what someone re-saving to scrub it meant to remove.
      rmSync(join(deps.vaultRoot, 'practice', 'evals', 'vaults', vault), { recursive: true, force: true });
      // The mini-vault first: a fixture file whose vault is missing is a
      // fixture that cannot run, and the suite would list it as broken.
      for (const file of files) await deps.vault.write(deps.tenant, `practice/evals/vaults/${vault}/${file.path}`, file.text);
      await deps.vault.write(deps.tenant, path, `${JSON.stringify(fixture, null, 2)}\n`);
      // The scoreboard counts fixtures per task, and the router reads those
      // counts: a new fixture changes both.
      forgetRouting();
      return json({
        path,
        id: fixture.id,
        expected: fixture.expected_catches.length,
        negative: fixture.negative_checks.length,
        files: files.length,
        dropped: saved.dropped,
      });
    } catch (err) {
      if (err instanceof NoFixtureHere) throw new HttpError(422, err.message);
      throw err;
    } finally {
      release();
    }
  };

  const RoutingBody = z.object({
    /** A task name, not free text: it becomes a key in `practice/routing.yaml`
     * and names a row of the ledger. */
    task: z.string().regex(/^[a-z0-9][a-z0-9_.-]{0,63}$/, 'a task is a lowercase name'),
    minScore: z.number().min(0).max(1).optional(),
    prefer: z.enum(['quality', 'cost', 'latency']).optional(),
    /** `null` unpins; a string pins that provider. */
    pinned: z.string().min(1).nullable().optional(),
  });

  /** One task's routing, changed in place. Writes `practice/routing.yaml`
   * and forgets the cached view so the next step routes by it. */
  const routingPut = async (req: Request): Promise<Response> => {
    const input = await body(req, RoutingBody);
    // A pin names a provider this practice actually loaded. Anything else is
    // a pin that can never be honoured, written into a file the lawyer reads.
    if (typeof input.pinned === 'string' && !deps.state().providers.some(p => p.id === input.pinned)) {
      return fail(422, `unknown provider: ${input.pinned}`);
    }
    const release = await locks.acquire(SETTINGS_LOCK);
    try {
      const policy: RoutingPolicy = readRoutingPolicy(deps.vaultRoot);
      const entry = { ...(policy.tasks[input.task] ?? {}) };
      if (input.minScore !== undefined) entry.min_score = input.minScore;
      if (input.prefer !== undefined) entry.prefer = input.prefer;
      if (input.pinned !== undefined) {
        if (input.pinned === null) delete entry.pinned;
        else entry.pinned = input.pinned;
      }
      policy.tasks[input.task] = entry;
      writeRoutingPolicy(deps.vaultRoot, policy);
      forgetRouting();
      // Read back INSIDE the lock: two quick changes from the same screen
      // would otherwise each answer with whatever the file held when they
      // got round to reading it, and the later answer could be the older
      // one.
      return routingGet();
    } finally {
      release();
    }
  };

  /** What scoring a task on a provider would run and roughly cost — the
   * one-line confirmation the Models group shows before a run. */
  const evalEstimate = (url: URL): Response => {
    const task = url.searchParams.get('task');
    const providerId = url.searchParams.get('providerId');
    if (task === null || task === '') return fail(400, 'task is required');
    if (providerId === null || providerId === '') return fail(400, 'providerId is required');
    const state = deps.state();
    if (!state.providers.some(p => p.id === providerId)) return fail(422, `unknown provider: ${providerId}`);
    const set = url.searchParams.get('set');
    if (set !== null && !(FIXTURE_SETS as readonly string[]).includes(set)) return fail(400, `set must be one of ${FIXTURE_SETS.join(', ')}`);
    const selected = selectFixtures(evalLoaded(), { task, ...(set === null ? {} : { set: set as (typeof FIXTURE_SETS)[number] }) });
    // The calls the run makes, not the files it reads: one benchmark fixture
    // can hold hundreds of documents.
    const count = runCount(selected.fixtures);
    // The selector's own words when there is nothing to run — "0 fixtures ·
    // cost unknown" says nothing about why.
    if (selected.error !== undefined) return json({ task, providerId, count: 0, estimateUsd: 0, needsConfirm: false, skipped: selected.skipped, reason: selected.error });
    const estimateUsd = estimateCost(count, deps.evals?.pricing?.(providerId) ?? null);
    // With the count, as the run itself does: a provider whose price is
    // unknown needs confirming for anything but a single call, and this line
    // is what the screen asks with.
    return json({ task, providerId, count, estimateUsd, needsConfirm: needsConfirmation(estimateUsd, count), skipped: selected.skipped });
  };

  /** One run at a time: a set is a queue of steps against the shared
   * window, and two sets at once would only race each other. */
  let evalRunning = false;

  const evalRun = async (req: Request): Promise<Response> => {
    const input = await body(req, EvalRunBody);
    const state = deps.state();
    const providerId = input.providerId ?? effectiveDefault(state);
    if (providerId === null || !state.providers.some(p => p.id === providerId)) throw new HttpError(422, `unknown provider: ${providerId ?? '(none configured)'}`);
    const loaded = evalLoaded();
    const selected = selectFixtures(loaded, {
      ...(input.fixtures === undefined ? {} : { fixtures: input.fixtures }),
      ...(input.task === undefined ? {} : { task: input.task }),
      ...(input.all === undefined ? {} : { all: input.all }),
      ...(input.set === undefined ? {} : { set: input.set }),
    });
    if (selected.error !== undefined) throw new HttpError(400, selected.error);
    if (selected.fixtures.length === 0) throw new HttpError(400, 'nothing to run', { skipped: selected.skipped });
    const runs = runCount(selected.fixtures);
    const estimateUsd = estimateCost(runs, deps.evals?.pricing?.(providerId) ?? null);
    if (needsConfirmation(estimateUsd, runs) && input.confirm !== true) {
      return fail(409, 'confirm-cost', { estimateUsd, count: runs, providerId, message: confirmationMessage(estimateUsd, runs, providerId) });
    }
    if (evalRunning) return fail(409, 'eval-busy');
    evalRunning = true;

    const judge: Judge | undefined =
      deps.evals?.judge ??
      (() => {
        const picked = pickJudge({ providers: state.providers, router: state.router, providerId, practiceSet: selected.fixtures.some(l => l.set === 'practice') });
        return picked === null ? undefined : providerJudge(picked.provider, { tenant: deps.tenant });
      })();

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown): void => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          send('plan', { count: selected.fixtures.length, providerId, estimateUsd, skipped: selected.skipped });
          const results = await runSet({
            fixtures: selected.fixtures,
            providerId,
            deps: {
              pluginRoot: deps.pluginRoot,
              ...(deps.content === undefined ? {} : { content: deps.content }),
              providers: state.providers,
              router: state.router,
              ...(state.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: state.stepTimeoutMs }),
              ...(judge === undefined ? {} : { judge }),
              ...(deps.evals?.tmpDir === undefined ? {} : { tmpDir: deps.evals.tmpDir }),
            },
            onProgress: p => {
              if (p.phase === 'start') send('progress', { index: p.index, total: p.total, fixtureId: p.fixtureId });
            },
            onResult: line => {
              if (input.save === true) appendResult(deps.vaultRoot, line);
              send('result', line);
            },
          });
          if (input.save === true) forgetRouting();
          send('done', { summary: summarize(results), saved: input.save === true });
        } catch (err) {
          send('error', { message: err instanceof Error ? err.message : String(err) });
        } finally {
          evalRunning = false;
          controller.close();
        }
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' } });
  };

  /** The vault-level switches Settings edits in config.md (spec §7). */
  const patchVaultSettings = async (req: Request): Promise<Response> => {
    const input = await body(req, VaultSettingsBody);
    writeVaultConfigOverride(deps.vaultRoot, 'outcomes', input.outcomes ? 'on' : 'off');
    return json({ outcomes: readVaultConfig(deps.vaultRoot).outcomes !== false });
  };

  const steps = async (req: Request, id: string): Promise<Response> => {
    const input = await body(req, StepBody);
    const { header } = await loadThread(deps, id);
    const loop = loopDeps();
    checkProvider(loop, input);
    // The matter's privacy policy, decided here before anything streams
    // (providers spec §7): a refused step is a 409, not an error event in a
    // transcript that never got the question.
    const policy = await policyForOptions(loop, { ...(header.matter === undefined ? {} : { matter: header.matter }), message: input.message });
    try {
      resolveStepProvider(loop, { threadId: id, message: input.message, ...(input.task === undefined ? {} : { task: input.task }), ...(input.provider === undefined ? {} : { providerId: input.provider }) }, policy);
    } catch (err) {
      if (err instanceof MatterStaysLocalError) return json({ error: 'matter-stays-local', message: err.message }, 409);
      throw err;
    }

    let outputSchema: z.ZodType<unknown> | undefined;
    if (input.outputSchema) {
      try {
        outputSchema = z.fromJSONSchema(input.outputSchema as Record<string, unknown>) as z.ZodType<unknown>;
      } catch (err) {
        throw new HttpError(400, `invalid outputSchema: ${text(err)}`);
      }
    }

    const release = await locks.acquire(`${deps.tenant}/${id}`);
    try {
      const events = runStep(loop, {
        threadId: id,
        message: input.message,
        ...(input.task === undefined ? {} : { task: input.task }),
        ...(input.provider === undefined ? {} : { providerId: input.provider }),
        ...(outputSchema === undefined ? {} : { outputSchema }),
      });
      const stream = withRelease(events, release);
      return outputSchema === undefined
        ? await sseFromEvents(stream)
        : await sseFromEvents(withoutText(stream), { preamble: TYPED_PREAMBLE });
    } catch (err) {
      release();
      throw err;
    }
  };

  const approve = async (req: Request, id: string): Promise<Response> => {
    const input = await body(req, ApproveBody);
    // Under the thread lock: `updateProposal` rewrites the whole log
    // (read → temp file → rename), so an approve landing mid-step would drop
    // every event the step appended after that read.
    return withThreadLock(id, () => decide(id, input));
  };

  const decide = async (id: string, input: z.infer<typeof ApproveBody>): Promise<Response> => {
    await loadThread(deps, id);

    let result;
    try {
      result = await applyProposal(deps.store, deps.vault, deps.tenant, id, input.proposalId, input.decision);
    } catch (err) {
      const message = text(err);
      if (message.startsWith('unknown proposal:')) throw new HttpError(404, message);
      throw err;
    }

    if (result.status === 'conflict') {
      return fail(409, `vault conflict on ${await proposalPath(deps, id, input.proposalId)}`, { conflict: result.conflict });
    }
    if (!('error' in result) && (result.status === 'approved' || result.status === 'rejected')) {
      const path = await proposalPath(deps, id, input.proposalId);
      recordOutcome({
        kind: 'proposal.decided',
        threadId: id,
        path,
        detail: { proposalId: input.proposalId, decision: result.status, decidedAt: new Date().toISOString(), ...(input.reason === undefined || input.reason === '' ? {} : { reason: input.reason }) },
      });
      // An approved proposal into a matter is counsel's version of that
      // file from now on (spec §7, lawyer edits).
      if (result.status === 'approved') {
        try {
          recordWritten(deps.vaultRoot, readVaultConfig(deps.vaultRoot), { path, kind: 'proposal', threadId: id });
        } catch (err) {
          console.error(`routes: written record failed for ${path}: ${text(err)}`);
        }
      }
    }
    // The proposal had already been decided — the earlier decision stands
    // and nothing was written.
    if ('error' in result) {
      return fail(409, result.error, { proposal: await findProposal(deps, id, input.proposalId) });
    }
    return json({
      proposal: await findProposal(deps, id, input.proposalId),
      ...(result.status === 'approved' ? { version: result.version } : {}),
    });
  };

  /**
   * Every run of one thread (spec §4.4). The thread is loaded first so an id
   * that names nothing is a 404 rather than an empty list — "no runs yet" and
   * "no such thread" are different answers.
   */
  const runs = async (url: URL): Promise<Response> => {
    const thread = url.searchParams.get('thread');
    if (thread === null || thread === '') throw new HttpError(400, 'thread is required');
    await loadThread(deps, thread);
    return json(listRuns(deps.vaultRoot, deps.tenant, thread));
  };

  const getRun = (runId: string): Response => {
    let record: RunRecord | null;
    try {
      record = readRun(deps.vaultRoot, deps.tenant, runId);
    } catch (err) {
      const message = text(err);
      // A run id that is not a uuid never named a run — the caller's mistake,
      // the same way `loadThread` treats a malformed thread id.
      if (message.includes('invalid run id') || message.includes('invalid tenant')) {
        throw new HttpError(400, message);
      }
      throw err;
    }
    if (record === null) throw new HttpError(404, `unknown run: ${runId}`);
    return json(record);
  };

  /** The bytes of a vault file, or the failures `read` maps. A store with no
   * `readBytes` (in-memory, text only) cannot serve one: 501, not a guess. */
  const vaultBytes = async (path: string): Promise<Uint8Array> => {
    if (deps.vault.readBytes === undefined) throw new HttpError(501, 'this vault store holds text only');
    try {
      return await deps.vault.readBytes(deps.tenant, path);
    } catch (err) {
      vaultFailure(err);
    }
  };

  const vaultRead = async (url: URL): Promise<Response> => {
    const raw = url.searchParams.get('path');
    if (raw === null || raw === '') throw new HttpError(400, 'path is required');
    const path = vaultPath(raw);
    // A Word document is CONVERTED for reading — never sent as text; a
    // `.docx` decoded as UTF-8 is the mojibake this branch exists to end.
    // `kind` is additive: a client that never looks at it sees the old shape.
    if (isDocxPath(path)) {
      const bytes = await vaultBytes(path);
      let markdown: string;
      let warnings: string[];
      try {
        ({ markdown, warnings } = docxToMarkdown(openDocx(bytes)));
      } catch (err) {
        if (err instanceof UnsafeXmlError) throw new HttpError(422, `refused: ${err.message}`);
        if (err instanceof NotADocxError) throw new HttpError(415, err.message);
        throw err;
      }
      try {
        return json({
          path,
          kind: 'docx',
          content: markdown,
          version: await deps.vault.version(deps.tenant, path),
          mtimeMs: (await deps.vault.mtime?.(deps.tenant, path)) ?? null,
          warnings,
        });
      } catch (err) {
        vaultFailure(err);
      }
    }
    try {
      return json({
        path,
        kind: 'text',
        content: await deps.vault.read(deps.tenant, path),
        version: await deps.vault.version(deps.tenant, path),
        // Optional on the interface so in-memory stores need not fake a
        // filesystem; `null` then, the same as "no mtime to show".
        mtimeMs: (await deps.vault.mtime?.(deps.tenant, path)) ?? null,
      });
    } catch (err) {
      vaultFailure(err);
    }
  };

  /** A directory under the matters directory, normalized, or a 400. `''`
   * (omitted) is the inbox. */
  const mattersDest = (raw: string | null): string => {
    const { mattersPath } = readVaultConfig(deps.vaultRoot);
    if (raw === null || raw.trim() === '') return `${mattersPath}/${INBOX_DIR}`;
    const dest = vaultPath(raw).replace(/\/+$/, '');
    if (dest !== mattersPath && !dest.startsWith(`${mattersPath}/`)) {
      throw new HttpError(400, `documents go under ${mattersPath}/ — a matter folder, or the inbox`);
    }
    return dest;
  };

  /** `dir/name`, or `dir/name-2`, … — the first path nothing is at. */
  const freePath = async (dir: string, name: string): Promise<string> => {
    for (let n = 1; n < 1000; n += 1) {
      const candidate = `${dir}/${suffixed(name, n)}`;
      if ((await deps.vault.mtime?.(deps.tenant, candidate)) === null) return candidate;
    }
    throw new HttpError(409, `too many files called ${name} in ${dir}`);
  };

  /**
   * `POST /vault/upload` (multipart: `file`, optional `dest`): a Word
   * document into a matter folder or the inbox. The package is opened once
   * here — not a zip, or not a Word document, is 415; any part with a
   * DOCTYPE is 422 — so nothing the reader will refuse later gets stored.
   * The name is never reused: a second `nda.docx` becomes `nda-2.docx`.
   */
  const vaultUpload = async (req: Request): Promise<Response> => {
    if (deps.vault.writeBytes === undefined) throw new HttpError(501, 'this vault store holds text only');
    let form: Awaited<ReturnType<Request['formData']>>;
    try {
      form = await req.formData();
    } catch {
      throw new HttpError(400, 'expected multipart form data with a `file` field');
    }
    const file = form.get('file');
    if (!(file instanceof Blob)) throw new HttpError(400, 'a `file` field is required');
    const name = safeBasename((file as File).name ?? '');
    if (!isDocxPath(name)) throw new HttpError(415, `only Word documents (.docx) can be added for now: ${name}`);
    if (file.size > UPLOAD_MAX_BYTES) throw new HttpError(413, `${name} is ${Math.round(file.size / 1024 / 1024)} MB; the limit is ${UPLOAD_MAX_BYTES / 1024 / 1024} MB`);
    const destRaw = form.get('dest');
    const dir = mattersDest(typeof destRaw === 'string' ? destRaw : null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const pkg = openDocx(bytes);
      for (const part of pkg.partNames()) {
        if (/\.(xml|rels)$/i.test(part)) assertSafeXml(pkg.partText(part), part);
      }
    } catch (err) {
      if (err instanceof NotADocxError) throw new HttpError(415, `${name} is not a Word document`);
      if (err instanceof UnsafeXmlError) throw new HttpError(422, `refused: ${err.message}`);
      throw err;
    }
    const path = await freePath(dir, name);
    try {
      await deps.vault.writeBytes(deps.tenant, path, bytes);
    } catch (err) {
      vaultFailure(err);
    }
    return json({ path, size: bytes.byteLength }, 201);
  };

  /** `POST /vault/move` `{ from, to }`: a file from one matter folder (or
   * the inbox) to another, never overwriting. Both under the matters dir. */
  const vaultMove = async (req: Request): Promise<Response> => {
    if (deps.vault.rename === undefined) throw new HttpError(501, 'this vault store cannot move files');
    const body = z.object({ from: z.string().min(1), to: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'expected { from, to }');
    const from = vaultPath(body.data.from);
    const { mattersPath } = readVaultConfig(deps.vaultRoot);
    if (!from.startsWith(`${mattersPath}/`)) throw new HttpError(400, `only files under ${mattersPath}/ can be moved`);
    const dir = mattersDest(body.data.to);
    const path = await freePath(dir, from.slice(from.lastIndexOf('/') + 1));
    try {
      await deps.vault.rename(deps.tenant, from, path);
    } catch (err) {
      vaultFailure(err);
    }
    return json({ path });
  };

  /** A vault file as bytes, for the reader's download link. Same path
   * guards as `read`; the content type follows the extension. */
  const vaultDownload = async (url: URL): Promise<Response> => {
    const raw = url.searchParams.get('path');
    if (raw === null || raw === '') throw new HttpError(400, 'path is required');
    const path = vaultPath(raw);
    const bytes = await vaultBytes(path);
    const name = path.slice(path.lastIndexOf('/') + 1);
    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': contentTypeFor(name),
        'content-length': String(bytes.byteLength),
        'content-disposition': contentDisposition(name),
        'cache-control': 'no-store',
      },
    });
  };

  const vaultList = async (url: URL): Promise<Response> => {
    const dir = vaultPath(url.searchParams.get('dir') ?? '.');
    try {
      return json(await deps.vault.list(deps.tenant, dir));
    } catch (err) {
      vaultFailure(err);
    }
  };

  /** One call for home + the tree top (redesign spec §4). The config is
   * re-read per request so a `matters_path` edit takes effect on reload. */
  const vaultOverviewRoute = async (): Promise<Response> =>
    json(await vaultOverview(deps.vault, deps.tenant, readVaultConfig(deps.vaultRoot)));

  /** The deadline docket (roadmap §1, in the runtime): every dated
   * obligation the matter files carry, classified against today. Same
   * matter discovery as the overview, read-only. */
  /**
   * Content updates (spec 2026-09-01 §6): what the vault has against what
   * ships, and the apply that writes only what the rules allow. The content
   * source is the loop's (`deps.content`) or the repo's over `pluginRoot`.
   */
  const updateDeps = () => ({ vaultRoot: deps.vaultRoot, content: deps.content ?? repoContentSource(deps.pluginRoot) });
  const contentStatusRoute = (): Response => json(contentStatus(updateDeps()));
  const ContentApplyBody = z.object({ paths: z.array(z.string().min(1)).min(1) });
  const contentApplyRoute = async (req: Request): Promise<Response> => {
    const input = await body(req, ContentApplyBody);
    try {
      return json(applyUpdates(updateDeps(), input.paths));
    } catch (err) {
      if (err instanceof UpdateError) return fail(400, err.message, { paths: err.paths });
      throw err;
    }
  };

  /** The doctor (spec 2026-09-01 §7): read-only vault checks. */
  const doctorRoute = (): Response =>
    json(runDoctor({ vaultRoot: deps.vaultRoot, pluginRoot: deps.pluginRoot, git: deps.git === undefined ? systemGit() : deps.git }));

  /** `GET /retro` — when the practice last ran a retro and whether one is
   * due (`retro/`); `POST /retro` — open the retro thread. The step itself
   * is the ordinary `POST /threads/:id/steps` with the returned message:
   * the thread's `task` is what makes it a retro. */
  const retroDeps = () => ({ vaultRoot: deps.vaultRoot, tenant: deps.tenant, store: deps.store, vault: deps.vault, cfg: readVaultConfig(deps.vaultRoot) });
  const retroStatusRoute = async (): Promise<Response> => json(await retroStatusFor(retroDeps()));
  const retroStartRoute = async (req: Request): Promise<Response> => {
    const input = await body(req, RetroBody);
    const start = await startRetro(retroDeps(), input.since === undefined ? {} : { since: input.since });
    return json({ ...start, status: await retroStatusFor(retroDeps()) }, 201);
  };

  const docketRoute = async (): Promise<Response> =>
    json(await vaultDocket(deps.vault, deps.tenant, readVaultConfig(deps.vaultRoot)));

  /** The vault search the ⌘K field runs (spec §3.4) — the same `SearchFn`
   * behind the model's `vault_search` tool, read-only. */
  const vaultSearchRoute = async (url: URL): Promise<Response> => {
    const q = url.searchParams.get('q');
    if (q === null || q.trim() === '') throw new HttpError(400, 'q is required');
    return json(await deps.vault.search(deps.tenant, q));
  };

  /** How many file paths `GET /vault/index` returns at most. A vault past
   * this is an archive; the index is a citation gate, not a mirror. */
  const INDEX_MAX_FILES = 5000;

  /**
   * Every file path in the vault, flat (cou-93 item 8): the client's
   * known-path set for turning a path the model wrote in prose into a chip
   * that opens the reader. Built by walking `vault.list` — the SAME listing
   * the tree uses, so `.counsel`, dotfiles and symlinks are already gone and
   * the index can never name a path the tree would not show. Breadth-first
   * and capped, so a pathological vault bounds the walk instead of the walk
   * unbounding the response.
   */
  const vaultIndexRoute = async (): Promise<Response> => {
    const files: string[] = [];
    const queue: string[] = ['.'];
    while (queue.length > 0 && files.length < INDEX_MAX_FILES) {
      const dir = queue.shift()!;
      let entries: Awaited<ReturnType<typeof deps.vault.list>>;
      try {
        entries = await deps.vault.list(deps.tenant, dir);
      } catch {
        continue; // One unreadable directory never fails the whole index.
      }
      for (const entry of entries) {
        if (entry.kind === 'dir') queue.push(entry.path);
        else if (files.length < INDEX_MAX_FILES) files.push(entry.path);
      }
    }
    return json(files);
  };

  /** The docket's feed (spec §4). Only the pending listing exists; an
   * explicit other status is a 400 so a future caller cannot read
   * "everything" as "pending".
   *
   * The body stays a bare array. The scan's thread bound rides on
   * `x-counsel-truncated` instead, so a docket that is missing a founder
   * gate can say so without every existing caller having to change shape. */
  const proposalsRoute = async (url: URL): Promise<Response> => {
    const status = url.searchParams.get('status') ?? 'pending';
    if (status !== 'pending') throw new HttpError(400, `unsupported status: ${status}`);
    const { proposals, scannedAll } = await pendingProposals(deps.store, deps.tenant);
    const res = json(proposals);
    if (!scannedAll) res.headers.set(TRUNCATED_HEADER, '1');
    return res;
  };

  return async function app(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);

      // Static first, and only for non-API paths. The page gets its token
      // from the URL fragment, which never reaches the server, so the shell
      // and its assets have to load unauthenticated. The API list above is
      // what keeps that from becoming a hole: a path that is not on it can
      // only ever reach `serveStatic`, which reads nothing outside `dist/`.
      if (!isApiPath(url.pathname)) {
        const res = staticHandler === null ? null : await staticHandler(req);
        return res ?? fail(404, `no route for ${req.method} ${url.pathname}`);
      }

      const via = authorize(req, deps.token);
      if (via === null) return fail(401, 'unauthorized');

      const res = await dispatch(req, url);
      // A request that proved itself with the bearer — the page's first call
      // after reading the printed link — signs this browser in: from here on
      // the cookie carries the same secret, so a new tab or a restarted
      // runtime needs no pasted address (auth.ts has the threat model). A
      // cookie-authenticated request gets no new cookie: nothing changed.
      // And a route that set a cookie of its own (`/session/clear`, which
      // clears it) is left alone: appending the sign-in after the sign-out
      // would make the browser keep the sign-in.
      return via === 'bearer' && !res.headers.has('set-cookie') ? withSessionCookie(res, deps.token) : res;
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message, err.extra);
      // An unexpected failure is a bug, and its message can carry absolute
      // paths and vault contents. The operator gets the detail on stderr;
      // the client gets a status code.
      console.error(`counsel-os server: ${req.method} ${req.url} failed:`, err);
      return fail(500, 'internal error');
    }
  };

  /** The authenticated API, one route per branch. Throws `HttpError` for a
   * status the caller decided on; `app` above turns it into the response. */
  async function dispatch(req: Request, url: URL): Promise<Response> {
    {
      const segments = url.pathname.split('/').filter(s => s !== '');
      const [first, second, third] = segments;
      const { method } = req;

      if (segments.length === 1 && first === 'health' && method === 'GET') return health();

      // Signs THIS browser out: the cookie is cleared, the token stands. The
      // page forgets its own copy too (client.ts `signOut`).
      if (segments.length === 2 && first === 'session' && second === 'clear' && method === 'POST') {
        return new Response(null, { status: 204, headers: { 'set-cookie': CLEAR_SESSION_COOKIE } });
      }

      if (segments.length === 1 && first === 'threads') {
        if (method === 'GET') return json(await deps.store.list(deps.tenant));
        if (method === 'POST') return await createThread(req);
      }

      if (segments.length === 2 && first === 'threads' && second !== undefined) {
        if (method === 'GET') return await getThread(second);
        if (method === 'PATCH') return await patchThread(req, second);
        if (method === 'DELETE') return await deleteThread(second);
      }

      if (segments.length === 3 && first === 'threads' && second !== undefined && method === 'POST') {
        if (third === 'steps') return await steps(req, second);
        if (third === 'approve') return await approve(req, second);
      }

      if (segments.length === 5 && first === 'threads' && second !== undefined && segments[3] !== undefined) {
        if (third === 'turns' && segments[4] === 'mark' && method === 'POST') return await markTurn(req, second, segments[3]);
        if (third === 'steps' && segments[4] === 'task' && method === 'PATCH') return await correctTask(req, second, segments[3]);
      }

      if (segments.length === 1 && first === 'outcomes' && method === 'GET') return outcomes(url);

      if (segments.length === 2 && first === 'evals') {
        if (second === 'fixtures' && method === 'GET') return evalFixtures();
        if (second === 'results' && method === 'GET') return evalResults(url);
        if (second === 'scoreboard' && method === 'GET') return evalScoreboard();
        if (second === 'estimate' && method === 'GET') return evalEstimate(url);
        if (second === 'run' && method === 'POST') return await evalRun(req);
      }

      if (segments.length === 2 && first === 'fixtures' && method === 'POST') {
        if (second === 'draft') return await fixtureDraft(req);
        if (second === 'save') return await fixtureSave(req);
      }

      if (segments.length === 2 && first === 'routing' && second === 'ledger' && method === 'GET') return await routingLedger(url);

      if (segments.length === 1 && first === 'routing') {
        if (method === 'GET') return routingGet();
        if (method === 'PUT') return await routingPut(req);
      }

      if (segments.length === 2 && first === 'settings' && second === 'vault' && method === 'PATCH') return await patchVaultSettings(req);

      if (segments.length === 1 && first === 'runs' && method === 'GET') return await runs(url);

      if (segments.length === 2 && first === 'runs' && second !== undefined && method === 'GET') {
        return getRun(second);
      }

      if (segments.length === 1 && first === 'settings') {
        if (method === 'GET') return json(settingsView(deps));
        if (method === 'PUT') return await putSettings(req);
      }

      if (segments.length >= 3 && first === 'providers' && segments[segments.length - 1] === 'key') {
        const id = segments.slice(1, -1).map(s => decodeURIComponent(s)).join('/');
        if (method === 'GET') return providerKeyState(deps, id);
        if (method === 'PUT') return await putKey(req, id);
        if (method === 'DELETE') return await deleteKey(id);
      }

      if (segments.length === 2 && first === 'settings' && second === 'test' && method === 'POST') {
        return await runProviderTest(req);
      }

      if (segments.length === 2 && first === 'vault' && method === 'POST') {
        if (second === 'upload') return await vaultUpload(req);
        if (second === 'move') return await vaultMove(req);
      }

      if (segments.length === 2 && first === 'vault' && method === 'GET') {
        if (second === 'read') return await vaultRead(url);
        if (second === 'download') return await vaultDownload(url);
        if (second === 'list') return await vaultList(url);
        if (second === 'overview') return await vaultOverviewRoute();
        if (second === 'search') return await vaultSearchRoute(url);
        if (second === 'index') return await vaultIndexRoute();
      }

      if (segments.length === 1 && first === 'proposals' && method === 'GET') {
        return await proposalsRoute(url);
      }

      if (segments.length === 1 && first === 'docket' && method === 'GET') return await docketRoute();

      if (segments.length === 2 && first === 'content') {
        if (second === 'status' && method === 'GET') return contentStatusRoute();
        if (second === 'apply' && method === 'POST') return await contentApplyRoute(req);
      }

      if (segments.length === 1 && first === 'doctor' && method === 'GET') return doctorRoute();

      if (first === 'providers' && segments.length >= 3 && segments[segments.length - 1] === 'models' && method === 'GET') {
        return await modelsRoute(decodeURIComponent(segments.slice(1, -1).join('/')), url);
      }

      if (segments.length === 1 && first === 'retro') {
        if (method === 'GET') return await retroStatusRoute();
        if (method === 'POST') return await retroStartRoute(req);
      }

      return fail(404, `no route for ${method} ${url.pathname}`);
    }
  }
}

/** The path a proposal targets, for the conflict message. */
async function proposalPath(deps: ServerDeps, threadId: string, proposalId: string): Promise<string> {
  return (await findProposal(deps, threadId, proposalId))?.path ?? 'the proposed path';
}

/** The proposal event as it now stands, which is what `POST /approve`
 * answers with (spec §4.5: "updated proposal event"). */
async function findProposal(
  deps: ServerDeps,
  threadId: string,
  proposalId: string,
): Promise<Extract<ThreadEvent, { t: 'proposal' }> | null> {
  const { events } = await deps.store.get(deps.tenant, threadId);
  return (
    events.find(
      (ev): ev is Extract<ThreadEvent, { t: 'proposal' }> => 't' in ev && ev.t === 'proposal' && ev.id === proposalId,
    ) ?? null
  );
}
