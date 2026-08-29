/**
 * The SSE reader the page needs and `EventSource` cannot give it: the step
 * endpoint is a POST and it needs a bearer header, neither of which
 * `EventSource` can send (spec §2). So the page reads the response body
 * itself, and this is the parser it feeds.
 *
 * Pure and incremental on purpose. A network chunk has no relationship to a
 * frame boundary — one chunk can hold three frames, or half of one — so the
 * caller keeps the leftover between reads and hands it back on the next
 * call. Nothing here touches the network, which is what makes the framing
 * testable without one.
 */

export interface SseFrame {
  /** The `event:` line, or `message` when the frame did not name one. */
  event: string;
  /** The `data:` lines, joined with newlines, exactly as the SSE spec says. */
  data: string;
}

export interface SseParseResult {
  frames: SseFrame[];
  /** The trailing bytes that are not yet a whole frame. Pass this back in as
   * `rest` on the next call. */
  rest: string;
}

/** The blank line that ends a frame. */
const FRAME_END = '\n\n';

/**
 * Strips one optional space after a field's colon — the SSE spec's rule, and
 * why `data:  x` means `' x'` rather than `'x'`.
 */
function value(line: string, field: string): string {
  const raw = line.slice(field.length + 1);
  return raw.startsWith(' ') ? raw.slice(1) : raw;
}

/**
 * One frame's worth of lines, or `null` when the block carried no field at
 * all — a comment-only block (`: typed`, the typed-stream preamble, or a
 * keepalive) is not an event and must not reach the caller as one.
 */
function parseFrame(block: string): SseFrame | null {
  let event: string | undefined;
  const data: string[] = [];

  for (const line of block.split('\n')) {
    if (line === '' || line.startsWith(':')) continue;
    if (line === 'event' || line.startsWith('event:')) event = value(line, 'event');
    else if (line === 'data' || line.startsWith('data:')) data.push(value(line, 'data'));
    // Any other field (`id:`, `retry:`, something new) is ignored rather
    // than dropped on the floor with the frame: this server sends neither,
    // and a future one that does must not make its frames vanish.
  }

  if (event === undefined && data.length === 0) return null;
  return { event: event ?? 'message', data: data.join('\n') };
}

/**
 * Parses whatever whole frames `rest + chunk` contains.
 *
 * CRLF is normalized first: the server writes `\n`, but a proxy in between
 * may not, and a parser that only knows `\n\n` would treat a CRLF stream as
 * one frame that never ends.
 */
export function parseSseChunk(rest: string, chunk: string): SseParseResult {
  const buffer = (rest + chunk).replace(/\r\n/g, '\n');
  const blocks = buffer.split(FRAME_END);
  // The last piece has no terminator yet — it is the next call's `rest`,
  // even when it is empty (a buffer ending exactly on a frame boundary).
  const tail = blocks.pop() ?? '';

  const frames: SseFrame[] = [];
  for (const block of blocks) {
    const parsed = parseFrame(block);
    if (parsed !== null) frames.push(parsed);
  }
  return { frames, rest: tail };
}
