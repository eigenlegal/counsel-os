import type { StepEvent } from '../core/types';

/** What the loop yields: a `StepEvent` tagged with the run that produced it. */
export type StreamEvent = StepEvent & { runId?: string };

export interface SseOptions {
  /** Quiet time after which buffered text deltas are flushed. `0` disables
   * the timer, so text then flushes only on the size bound or on the next
   * non-text event — what the tests use to get deterministic frames. */
  coalesceMs?: number;
  /** Buffered characters after which text is flushed regardless of the timer. */
  maxChars?: number;
}

/** Spec §2: Ollama streams per token; the UI must not. */
export const DEFAULT_COALESCE_MS = 50;
export const DEFAULT_MAX_CHARS = 200;

/** The synthesized terminal for a source that just stopped (spec §5: never a
 * dropped connection without a terminal event). */
export const NO_TERMINAL_EVENT = 'provider ended without a terminal event';

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** One SSE frame: the event type on the `event:` line, the whole event object
 * (type included, so a client can switch on either) as JSON on `data:`. */
function frame(ev: StreamEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

/**
 * Renders a step's events as `text/event-stream`.
 *
 * Text deltas are coalesced — buffered until the stream goes quiet for
 * `coalesceMs`, until `maxChars` have piled up, or until any non-text event
 * needs to go out (the buffer is flushed first, so a `tool_call` never
 * overtakes the text that preceded it).
 *
 * The stream ALWAYS ends with a `done` or an `error`: a source that throws
 * ends with the thrown message, and a source that simply stops gets
 * `NO_TERMINAL_EVENT` synthesized. A client can therefore treat a closed
 * connection with no terminal frame as a transport failure, never as a
 * finished step.
 *
 * The first event is read before the `Response` is constructed — that is
 * what puts its `runId` in the `x-run-id` header — so this returns a
 * promise. Everything after it streams.
 */
export async function sseFromEvents(
  source: AsyncIterable<StreamEvent>,
  opts: SseOptions = {},
): Promise<Response> {
  const coalesceMs = opts.coalesceMs ?? DEFAULT_COALESCE_MS;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;

  const it = source[Symbol.asyncIterator]();
  let first: IteratorResult<StreamEvent> | undefined;
  let startupError: string | undefined;
  try {
    first = await it.next();
  } catch (err) {
    startupError = message(err);
  }
  const runId = first && !first.done ? first.value.runId : undefined;

  const encoder = new TextEncoder();
  // Hoisted out of `start` so `cancel` can stop the pump: after the client
  // hangs up, an `enqueue`/`close` on the controller throws.
  let closed = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let buffer = '';
      let bufferRunId: string | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const send = (ev: StreamEvent): void => {
        if (closed) return;
        controller.enqueue(encoder.encode(frame(ev)));
      };

      const flush = (): void => {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        if (buffer === '') return;
        const text = buffer;
        const evRunId = bufferRunId;
        buffer = '';
        bufferRunId = undefined;
        send({ type: 'text', text, ...(evRunId === undefined ? {} : { runId: evRunId }) });
      };

      const bufferText = (ev: Extract<StreamEvent, { type: 'text' }>): void => {
        buffer += ev.text;
        bufferRunId ??= ev.runId;
        if (buffer.length >= maxChars) {
          flush();
        } else if (coalesceMs > 0 && timer === undefined) {
          timer = setTimeout(() => {
            timer = undefined;
            flush();
          }, coalesceMs);
        }
      };

      const pump = async (): Promise<void> => {
        let sawTerminal = false;
        try {
          if (startupError !== undefined) {
            send({ type: 'error', message: startupError });
            sawTerminal = true;
          } else {
            for (let next = first!; !next.done; next = await it.next()) {
              const ev = next.value;
              if (ev.type === 'text') {
                bufferText(ev);
                continue;
              }
              flush();
              send(ev);
              if (ev.type === 'done' || ev.type === 'error') sawTerminal = true;
            }
          }
        } catch (err) {
          flush();
          send({ type: 'error', message: message(err) });
          sawTerminal = true;
        }
        flush();
        if (!sawTerminal) send({ type: 'error', message: NO_TERMINAL_EVENT });
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      // Detached on purpose: the source is drained as fast as it produces,
      // rather than one event per reader pull. A step's events are small and
      // few, and draining them promptly is what lets the caller release its
      // per-thread lock as soon as the step is really over.
      void pump();
    },
    cancel(): void {
      // The client hung up: stop the provider rather than run it to
      // completion into a socket nobody is reading.
      closed = true;
      void it.return?.(undefined);
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
      ...(runId === undefined ? {} : { 'x-run-id': runId }),
    },
  });
}
