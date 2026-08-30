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
 * a title. A single word longer than the limit has no space to back off to,
 * so it is cut hard.
 */
export function titleFor(message: string): string {
  const first = message.split('\n').find(line => line.trim() !== '') ?? '';
  const line = first.trim();
  if (line.length <= TITLE_MAX) return line;
  const cut = line.slice(0, TITLE_MAX);
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : cut).trimEnd();
}

/** `POST /threads` — the route already accepts `title`; no API change. */
export function createThread(init: { title: string }): Promise<ThreadHeader> {
  return fetchJson<ThreadHeader>('/threads', { method: 'POST', body: JSON.stringify(init) });
}
