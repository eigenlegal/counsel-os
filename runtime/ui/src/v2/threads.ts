import { fetchJson } from '../api/client';
import type { ThreadHeader } from '../api/types';

/** Spec §2, "Thread titles": the first line, trimmed to 60 characters. */
export const TITLE_MAX = 60;

/**
 * The rail's label for a thread: the message's first non-empty line, cut to
 * `TITLE_MAX`.
 *
 * A cut that lands inside a word backs off to the last space rather than
 * ending on half of one — "…the indemnific" reads as a bug, "…the" reads as
 * a title. The backoff has a floor at half the limit, so a long first word
 * is cut hard rather than trimmed away to nothing.
 */
export function titleFor(message: string): string {
  const first = message.split('\n').find(line => line.trim() !== '') ?? '';
  const line = first.trim();
  if (line.length <= TITLE_MAX) return line;
  const cut = line.slice(0, TITLE_MAX);
  const space = cut.lastIndexOf(' ');
  // Only back off to a space in the second half: `'A ' + 'x'.repeat(70)` has
  // one at index 1, and honouring it would title the thread "A".
  return (space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).trimEnd();
}

/**
 * `POST /threads` — the route already accepts `title`; no API change.
 *
 * `signal` is the sending step's own controller, so Stop reaches the create
 * as well as the stream that follows it.
 */
export function createThread(init: { title: string }, signal?: AbortSignal): Promise<ThreadHeader> {
  return fetchJson<ThreadHeader>('/threads', {
    method: 'POST',
    body: JSON.stringify(init),
    ...(signal === undefined ? {} : { signal }),
  });
}
