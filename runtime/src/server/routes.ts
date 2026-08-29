import { z } from 'zod';
import { RouterError } from '../core/types';
import { runStep, type CounselLoopDeps } from '../loop/counsel-loop';
import { applyProposal } from '../loop/proposals';
import type { ThreadEvent, ThreadHeader } from '../threads/store';
import { normalizeVaultPath } from '../vault/knowledge-paths';
import { isAuthorized } from './auth';
import { sseFromEvents, type StreamEvent } from './sse';

export interface ServerDeps extends CounselLoopDeps {
  /** The bearer token every request must present (spec §4.5). */
  token: string;
  /** The provider `GET /health` reports as the default. Defaults to whatever
   * the router resolves with no task. */
  defaultProviderId?: string;
}

export type App = (req: Request) => Promise<Response>;

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
function checkProvider(deps: ServerDeps, opts: { provider?: string; task?: string }): void {
  if (opts.provider !== undefined) {
    if (!deps.providers.some(p => p.id === opts.provider)) {
      throw new HttpError(422, `unknown provider: ${opts.provider}`);
    }
    return;
  }
  try {
    deps.router.resolve(opts.task);
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

/**
 * The whole HTTP surface (spec §4.5) as a plain fetch handler: no socket, no
 * Bun.serve, so the route tests drive it directly with `Request` objects.
 * `serve.ts` is the only thing that binds it to a port.
 */
export function createApp(deps: ServerDeps): App {
  const locks = new ThreadLocks();

  const defaultProviderId = (): string | null => {
    if (deps.defaultProviderId !== undefined) return deps.defaultProviderId;
    try {
      return deps.router.resolve().id;
    } catch {
      return null;
    }
  };

  const health = (): Response =>
    json({
      vault: deps.vaultRoot,
      tenant: deps.tenant,
      providers: deps.providers.map(p => ({
        id: p.id,
        kind: p.kind,
        auth: p.capabilities.auth,
        capabilities: p.capabilities,
      })),
      default: defaultProviderId(),
    });

  const createThread = async (req: Request): Promise<Response> => {
    const init = await body(req, CreateThreadBody);
    return json(await deps.store.create(deps.tenant, init), 201);
  };

  const getThread = async (id: string): Promise<Response> => json(await loadThread(deps, id));

  const deleteThread = async (id: string): Promise<Response> => {
    await loadThread(deps, id);
    await deps.store.remove(deps.tenant, id);
    return new Response(null, { status: 204 });
  };

  const steps = async (req: Request, id: string): Promise<Response> => {
    const input = await body(req, StepBody);
    await loadThread(deps, id);
    checkProvider(deps, input);

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
      const events = runStep(deps, {
        threadId: id,
        message: input.message,
        ...(input.task === undefined ? {} : { task: input.task }),
        ...(input.provider === undefined ? {} : { providerId: input.provider }),
        ...(outputSchema === undefined ? {} : { outputSchema }),
      });
      return await sseFromEvents(withRelease(events, release));
    } catch (err) {
      release();
      throw err;
    }
  };

  const approve = async (req: Request, id: string): Promise<Response> => {
    const input = await body(req, ApproveBody);
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
      if (!isAuthorized(req, deps.token)) return fail(401, 'unauthorized');

      const url = new URL(req.url);
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

      if (segments.length === 2 && first === 'vault' && method === 'GET') {
        if (second === 'read') return await vaultRead(url);
        if (second === 'list') return await vaultList(url);
      }

      return fail(404, `no route for ${method} ${url.pathname}`);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message, err.extra);
      return fail(500, text(err));
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
