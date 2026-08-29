/**
 * The whole API surface the page uses (spec §4.4), and nothing else.
 *
 * Same origin, so there is no base URL to configure: the runtime serves this
 * build itself, and `vite dev` proxies the API prefixes back to it. Every
 * call carries the bearer token; a 401 is reported once, centrally, so the
 * app can show the spec §5 message instead of each caller inventing its own.
 */
import { parseSseChunk } from './sse';
import { getToken, TokenMissingError } from './token';
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
 * The `Authorization` header, or a reported failure. A missing token is the
 * same user-visible state as a rejected one, so it is announced here rather
 * than surfacing as a bare exception from somewhere deep in a component.
 */
function authHeaders(): Record<string, string> {
  try {
    return { authorization: `Bearer ${getToken()}` };
  } catch (err) {
    if (err instanceof TokenMissingError) reportUnauthorized();
    throw err;
  }
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
  if (res.status === 401) reportUnauthorized();
  return new ApiError(res.status, await readBody(res));
}

/**
 * One JSON call. `T` is what the route documents; a 204 (`DELETE /threads/:id`)
 * resolves to `undefined`, which every 204 caller already treats as void.
 */
export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders(), accept: 'application/json' };
  if (init.body !== undefined && init.body !== null) headers['content-type'] = 'application/json';

  const res = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  if (!res.ok) throw await failure(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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
