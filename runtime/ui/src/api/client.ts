/**
 * The whole API surface the page uses (spec §4.4), and nothing else.
 *
 * Same origin, so there is no base URL to configure: the runtime serves this
 * build itself, and `vite dev` proxies the API prefixes back to it. Every
 * call carries the bearer token; a 401 is reported once, centrally, so the
 * app can show the spec §5 message instead of each caller inventing its own.
 */
import { parseSseChunk } from './sse';
import { clearToken, readToken } from './token';
import { reportUnauthorized } from './unauthorized';
import type { StepBody, StreamEvent } from './types';

/** A request that came back with a status the caller has to reason about.
 * `body` is the parsed JSON when there was any — 409 on approve carries the
 * two versions, 400 carries `issues` — and the raw text otherwise. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message?: string,
  ) {
    super(message ?? errorMessage(status, body));
    this.name = 'ApiError';
  }
}

function errorMessage(status: number, body: unknown): string {
  const detail =
    typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : typeof body === 'string' && body !== ''
        ? body
        : '';
  return detail === '' ? `request failed (${status})` : `${detail} (${status})`;
}

/**
 * The `Authorization` header when this tab holds the token, else nothing:
 * the browser may be carrying the sign-in cookie the runtime set on an
 * earlier visit (same secret, `HttpOnly`, same-origin only — see
 * `runtime/src/server/auth.ts`), and `fetch` attaches it by itself on a
 * same-origin request. Whether either credential is good is the server's
 * call; a 401 is what says neither was.
 */
function authHeaders(): Record<string, string> {
  const token = readToken();
  return token === null || token === '' ? {} : { authorization: `Bearer ${token}` };
}

/**
 * Signs THIS browser out: the runtime clears its cookie, the tab forgets
 * its token, and the app shows the session-lost screen. The runtime's
 * token stands — other browsers stay signed in; `serve --new-token` is the
 * way to sign everyone out.
 */
export async function signOut(): Promise<void> {
  try {
    await request('/session/clear', { method: 'POST' });
  } finally {
    clearToken();
    reportUnauthorized();
  }
}

/** `PUT /providers/<id>/key` (providers spec §5): the one request that
 * carries a key. Slashes in the id are path segments. 204 on success. */
export async function setProviderKey(id: string, value: string): Promise<void> {
  await fetchJson<void>(`/providers/${id.split('/').map(encodeURIComponent).join('/')}/key`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

/** `DELETE /providers/<id>/key` — idempotent. */
export async function deleteProviderKey(id: string): Promise<void> {
  await fetchJson<void>(`/providers/${id.split('/').map(encodeURIComponent).join('/')}/key`, { method: 'DELETE' });
}

/** Best-effort body parse. A failure here must not mask the status code —
 * that is the part the caller acts on. */
async function readBody(res: Response): Promise<unknown> {
  const raw = await res.text().catch(() => '');
  if (raw === '') return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function failure(res: Response): Promise<ApiError> {
  if (res.status === 401) {
    // The server has rejected this token, so it will reject every later use
    // of it. Dropping it stops the page from replaying a credential it knows
    // is dead, and leaves the tab in the same state as one that never got a
    // token — which is exactly what the message on screen says it is.
    clearToken();
    reportUnauthorized();
  }
  return new ApiError(res.status, await readBody(res));
}

/** The one request path: auth, the JSON headers, and the error translation
 * every JSON caller shares. */
async function request(path: string, init: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...authHeaders(), accept: 'application/json' };
  if (init.body !== undefined && init.body !== null) headers['content-type'] = 'application/json';

  const res = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  if (!res.ok) throw await failure(res);
  return res;
}

/**
 * One JSON call. `T` is what the route documents; a 204 (`DELETE /threads/:id`)
 * resolves to `undefined`, which every 204 caller already treats as void.
 */
export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * A vault file as bytes (`GET /vault/download`). The bearer rides in the
 * header, as everywhere else — a plain `<a href>` cannot carry it, and a
 * token in a URL would land in history, logs and referrers. The caller
 * hands the blob to `saveBlob`.
 */
export async function fetchBlob(path: string): Promise<Blob> {
  const res = await fetch(path, { headers: authHeaders() });
  if (!res.ok) throw await failure(res);
  return res.blob();
}

export interface Uploaded {
  path: string;
  size: number;
}

/**
 * A Word document into the vault (`POST /vault/upload`): into `dest` (a
 * matter folder under the matters directory) or, with no `dest`, the inbox.
 * Multipart, so the browser sets the boundary; the bearer rides in the
 * header as everywhere else.
 */
export async function uploadFile(file: File, dest?: string): Promise<Uploaded> {
  const form = new FormData();
  form.set('file', file, file.name);
  if (dest !== undefined && dest !== '') form.set('dest', dest);
  const res = await fetch('/vault/upload', { method: 'POST', headers: authHeaders(), body: form });
  if (!res.ok) throw await failure(res);
  return (await res.json()) as Uploaded;
}

/** Moves a vault file into another matter folder (`POST /vault/move`). */
export async function moveFile(from: string, to: string): Promise<{ path: string }> {
  return fetchJson<{ path: string }>('/vault/move', { method: 'POST', body: JSON.stringify({ from, to }) });
}

/**
 * Hands `blob` to the browser as a download named `filename`, through a
 * one-shot object URL that is revoked once the click has been dispatched.
 * Returns `false` where object URLs are unavailable (a test DOM), so a
 * caller can say the download did not happen rather than pretend it did.
 */
export function saveBlob(blob: Blob, filename: string): boolean {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const href = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(href);
  }
  return true;
}

/**
 * The same call, with the response's headers.
 *
 * Some routes put a fact about the BODY in a header rather than in the body
 * itself, so that adding it changes no caller's shape — `x-counsel-truncated`
 * on `GET /proposals` says the scan was bounded, which the docket has to
 * repeat or else it asserts a count it cannot support. A separate function
 * rather than an option, so `fetchJson`'s own callers stay untouched.
 */
export async function fetchJsonWithHeaders<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ body: T; headers: Headers }> {
  const res = await request(path, init);
  const body = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  return { body, headers: res.headers };
}

/**
 * Runs one step and delivers its events as they arrive.
 *
 * Resolves when the stream ends — the server guarantees a terminal `done` or
 * `error` frame before that, so a resolve with no terminal event seen is a
 * transport failure, not a finished step, and the caller can say so.
 * Rejects on a non-200 (the request never started: an unknown provider is a
 * 422, a bad body a 400) and on `signal` aborting, which is the "Stop"
 * button: the server sees the hangup and marks the run `abandoned`.
 *
 * A frame whose data will not parse is skipped rather than fatal. The stream
 * is a sequence of independent events; losing one must not lose the answer.
 */
export async function streamStep(
  threadId: string,
  body: StepBody,
  onEvent: (ev: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`/threads/${encodeURIComponent(threadId)}/steps`, {
    method: 'POST',
    headers: { ...authHeaders(), 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await failure(res);
  if (res.body === null) throw new ApiError(res.status, null, 'the step stream had no body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let rest = '';

  const deliver = (chunk: string): void => {
    const parsed = parseSseChunk(rest, chunk);
    rest = parsed.rest;
    for (const frame of parsed.frames) {
      let ev: StreamEvent;
      try {
        ev = JSON.parse(frame.data) as StreamEvent;
      } catch {
        console.warn(`counsel-os: unparsable ${frame.event} frame, skipped`);
        continue;
      }
      onEvent(ev);
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      deliver(decoder.decode(value, { stream: true }));
    }
    // Flush the decoder's partial code point, then close any frame the
    // server ended without its final blank line.
    deliver(decoder.decode());
    deliver(FRAME_TERMINATOR);
  } finally {
    // An aborted or errored stream may already have released it; a throw
    // here would replace the real failure with a bookkeeping one.
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}

/** Fed in after the last chunk so a frame missing its terminator is still
 * delivered rather than silently dropped with the connection. */
const FRAME_TERMINATOR = '\n\n';
