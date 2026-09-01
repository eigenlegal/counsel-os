import { z } from 'zod';
import { RouterError } from '../core/types';
import { DEFAULT_STEP_TIMEOUT_MS, runStep, type CounselLoopDeps } from '../loop/counsel-loop';
import { pendingProposals } from '../loop/pending-proposals';
import { applyProposal } from '../loop/proposals';
import { listRuns, readRun, type RunRecord } from '../loop/run-record';
import { DOCX_CONTENT_TYPE, docxToMarkdown, isDocxPath, NotADocxError, openDocx, UnsafeXmlError } from '../docx';
import { assertSafeXml } from '../docx/safety';
import { RegistryFile } from '../providers/registry';
import type { ThreadEvent, ThreadHeader } from '../threads/store';
import { vaultDocket } from '../vault/docket';
import { normalizeVaultPath } from '../vault/knowledge-paths';
import { vaultOverview } from '../vault/overview';
import { readVaultConfig } from '../vault/resolve-root';
import { applyUpdates, contentStatus, UpdateError } from '../content/update';
import { repoContentSource } from '../content/repo';
import { runDoctor } from '../doctor/index';
import { systemGit, type GitRunner } from '../setup/run';
import { authorize, CLEAR_SESSION_COOKIE, withSessionCookie } from './auth';
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
  /** The doctor's git runner (spec 2026-09-01 §7). Default: real git when
   * on PATH; `null` reports "git is not installed". */
  git?: GitRunner | null;
}

export type App = (req: Request) => Promise<Response>;

/**
 * The first path segment of every route that needs the bearer token. It is
 * the WHOLE definition of the API surface: anything not on this list is
 * static, served with no credential, so a new route whose prefix is missing
 * here would be reachable by anyone who can reach the port.
 */
export const API_PREFIXES: readonly string[] = ['health', 'threads', 'runs', 'vault', 'settings', 'proposals', 'docket', 'setup', 'content', 'doctor', 'session'];

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
      // A vault is live: the setup app (`setup-routes.ts`) is the one that
      // says `true`, and the page keys its first-run screen on this.
      setup: false,
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

  const runProviderTest = async (req: Request): Promise<Response> =>
    testProvider(loopDeps(), (await body(req, TestBody)).provider);

  const createThread = async (req: Request): Promise<Response> => {
    const init = await body(req, CreateThreadBody);
    return json(await deps.store.create(deps.tenant, init), 201);
  };

  const getThread = async (id: string): Promise<Response> => json(await loadThread(deps, id));

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
