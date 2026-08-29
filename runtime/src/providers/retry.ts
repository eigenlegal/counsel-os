import type { ModelProvider, StepEvent, StepRequest } from '../core/types';

/**
 * Providers report a retryable failure as free-form prose, so this matches on
 * shape. Two shapes, deliberately narrow:
 *
 * A status code only counts when the text says it is one. `\b(429|5\d\d)\b`
 * matched any three-digit number in any sentence — "row 512 missing" and
 * "clause 500 of the agreement" both retried a permanent failure three times.
 * So a 429/5xx has to be introduced by `HTTP`, `status`, or `code`, or start
 * the message ("503 Service Unavailable"). The code range is spelled out
 * (`50[0-9]`, `5[1-9]\d`) rather than `5\d\d` so it cannot be read as
 * "anything in the 500s of some other numbering".
 *
 * Or the text names a transient condition outright — a rate limit, an
 * overloaded upstream, a dropped or timed-out socket.
 */
const STATUS_CODE = '(?:429|50[0-9]|5[1-9]\\d)';
const RETRYABLE_STATUS = new RegExp(`(?:\\b(?:HTTP|status|code)\\b[\\s:/=]*${STATUS_CODE}\\b)|(?:^${STATUS_CODE}\\b)`, 'i');
const RETRYABLE_WORDS = /\b(rate limit|overloaded|ECONNRESET|ETIMEDOUT)\b/i;

/** True when `message` looks like a transient provider failure worth
 * retrying. Exported for its own test — the cost of getting it wrong is
 * either three attempts at a permanent error or none at a transient one. */
export function isRetryable(message: string): boolean {
  return RETRYABLE_STATUS.test(message) || RETRYABLE_WORDS.test(message);
}

export function withRetry(p: ModelProvider, opts: { tries?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {}): ModelProvider {
  const tries = opts.tries ?? 3, baseMs = opts.baseMs ?? 500, sleep = opts.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  return {
    id: p.id, kind: p.kind, capabilities: p.capabilities,
    async *run(req: StepRequest): AsyncIterable<StepEvent> {
      for (let attempt = 1; ; attempt++) {
        const it = p.run(req)[Symbol.asyncIterator]();
        try {
          const head: StepEvent[] = []; let first = await it.next();
          while (!first.done && first.value.type === 'session') { head.push(first.value); first = await it.next(); }
          if (!first.done && first.value.type === 'error' && attempt < tries && isRetryable(first.value.message)) { await sleep(baseMs * 2 ** (attempt - 1)); continue; }
          for (const e of head) yield e;
          if (first.done) return;
          yield first.value;
          if (first.value.type === 'error') return;
          for (let n = await it.next(); !n.done; n = await it.next()) yield n.value;
          return;
        } finally {
          // Close the underlying provider's iterator whether we're abandoning
          // it to retry, or our own caller abandoned us mid-stream (a `break`
          // out of a `for await` on this generator resumes us here via an
          // implicit `.return()`). A throwing `return()` must not escape and
          // mask whatever the try block was already doing (yielding/retrying).
          try { await it.return?.(); } catch { /* ignore */ }
        }
      }
    },
  };
}
