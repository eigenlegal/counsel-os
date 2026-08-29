import { z } from 'zod';
import { RouterError } from '../core/types';
import { DEFAULT_STEP_TIMEOUT_MS, runStep, type CounselLoopDeps } from '../loop/counsel-loop';
import { applyProposal } from '../loop/proposals';
import { listRuns, readRun, type RunRecord } from '../loop/run-record';
import { RegistryFile } from '../providers/registry';
import type { ThreadEvent, ThreadHeader } from '../threads/store';
import { normalizeVaultPath } from '../vault/knowledge-paths';
import { isAuthorized } from './auth';
import {
  applySettings,
  effectiveDefault,
  settingsView,
  testProvider,
  TestBody,
  type RuntimeState,
  type SettingsDeps,
} from './settings';
import { sseFromEvents, type StreamEvent } from './sse';
import { serveStatic } from './static';

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
  distDir?: string;
}

export type App = (req: Request) => Promise<Response>;

/**
 * The first path segment of every route that needs the bearer token. It is
 * the WHOLE definition of the API surface: anything not on this list is
 * static, served with no credential, so a new route whose prefix is missing
 * here would be reachable by anyone who can reach the port.
 */
export const API_PREFIXES: readonly string[] = ['health', 'threads', 'runs', 'vault', 'settings'];

/** True when `pathname` belongs to the API (and so needs a token). `/` and
 * every client-side route are false. */
export function isApiPath(pathname: string): boolean {
  const first = pathname.split('/').find(s => s !== '');
  return first !== undefined && API_PREFIXES.includes(first);
}

const CreateThreadBody = z.object({ title: z.string().optional(), matter: z.string().optional() });

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

/** The comment line a typed stream opens with. A client that sees it knows the
 * missing `text` frames are suppression, not silence. */
export const TYPED_PREAMBLE = ': typed\n\n';

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
  const loopDeps = (): CounselLoopDeps => {
    const state = deps.state();
    return {
      tenant: deps.tenant,
      vaultRoot: deps.vaultRoot,
      pluginRoot: deps.pluginRoot,
      vault: deps.vault,
      store: deps.store,
      providers: state.providers,
      router: state.router,
      ...(deps.platform === undefined ? {} : { platform: deps.platform }),
      ...(state.stepTimeoutMs === undefined ? {} : { stepTimeoutMs: state.stepTimeoutMs }),
    };
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
      vault: deps.vaultRoot,
      tenant: deps.tenant,
      providers: state.providers.map(p => ({
        id: p.id,
        kind: p.kind,
        auth: p.capabilities.auth,
        capabilities: p.capabilities,
      })),
      default: effectiveDefault(state),
      // What a step on this runtime actually gets, not what was configured:
      // an operator reading /health wants the effective number.
      stepTimeoutMs: state.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
    });
  };

  /** `PUT /settings` (spec §4.1). The body is the whole registry file, so a
   * schema failure is the shared 400-with-issues every other route gives. */
  const putSettings = async (req: Request): Promise<Response> =>
    applySettings(deps, await body(req, RegistryFile));

  const runProviderTest = async (req: Request): Promise<Response> =>
    testProvider(loopDeps(), (await body(req, TestBody)).provider);

  const createThread = async (req: Request): Promise<Response> => {
    const init = await body(req, CreateThreadBody);
    return json(await deps.store.create(deps.tenant, init), 201);
  };

  const getThread = async (id: string): Promise<Response> => json(await loadThread(deps, id));

  const deleteThread = async (id: string): Promise<Response> =>
    withThreadLock(id, async () => {
      await loadThread(deps, id);
      await deps.store.remove(deps.tenant, id);
      return new Response(null, { status: 204 });
    });

  const steps = async (req: Request, id: string): Promise<Response> => {
    const input = await body(req, StepBody);
    await loadThread(deps, id);
    const loop = loopDeps();
    checkProvider(loop, input);

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

  const vaultRead = async (url: URL): Promise<Response> => {
    const raw = url.searchParams.get('path');
    if (raw === null || raw === '') throw new HttpError(400, 'path is required');
    const path = vaultPath(raw);
    try {
      return json({ path, content: await deps.vault.read(deps.tenant, path), version: await deps.vault.version(deps.tenant, path) });
    } catch (err) {
      vaultFailure(err);
    }
  };

  const vaultList = async (url: URL): Promise<Response> => {
    const dir = vaultPath(url.searchParams.get('dir') ?? '.');
    try {
      return json(await deps.vault.list(deps.tenant, dir));
    } catch (err) {
      vaultFailure(err);
    }
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

      if (!isAuthorized(req, deps.token)) return fail(401, 'unauthorized');

      const segments = url.pathname.split('/').filter(s => s !== '');
      const [first, second, third] = segments;
      const { method } = req;

      if (segments.length === 1 && first === 'health' && method === 'GET') return health();

      if (segments.length === 1 && first === 'threads') {
        if (method === 'GET') return json(await deps.store.list(deps.tenant));
        if (method === 'POST') return await createThread(req);
      }

      if (segments.length === 2 && first === 'threads' && second !== undefined) {
        if (method === 'GET') return await getThread(second);
        if (method === 'DELETE') return await deleteThread(second);
      }

      if (segments.length === 3 && first === 'threads' && second !== undefined && method === 'POST') {
        if (third === 'steps') return await steps(req, second);
        if (third === 'approve') return await approve(req, second);
      }

      if (segments.length === 1 && first === 'runs' && method === 'GET') return await runs(url);

      if (segments.length === 2 && first === 'runs' && second !== undefined && method === 'GET') {
        return getRun(second);
      }

      if (segments.length === 1 && first === 'settings') {
        if (method === 'GET') return json(settingsView(deps));
        if (method === 'PUT') return await putSettings(req);
      }

      if (segments.length === 2 && first === 'settings' && second === 'test' && method === 'POST') {
        return await runProviderTest(req);
      }

      if (segments.length === 2 && first === 'vault' && method === 'GET') {
        if (second === 'read') return await vaultRead(url);
        if (second === 'list') return await vaultList(url);
      }

      return fail(404, `no route for ${method} ${url.pathname}`);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message, err.extra);
      // An unexpected failure is a bug, and its message can carry absolute
      // paths and vault contents. The operator gets the detail on stderr;
      // the client gets a status code.
      console.error(`counsel-os server: ${req.method} ${req.url} failed:`, err);
      return fail(500, 'internal error');
    }
  };
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
