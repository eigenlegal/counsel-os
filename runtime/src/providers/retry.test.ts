import { describe, expect, test } from 'bun:test';
import { withRetry } from './retry';
import type { ModelProvider, StepEvent } from '../core/types';
function flaky(fails: number, msg: string): ModelProvider & { calls: number } {
  const p = { id: 'x/y', kind: 'direct' as const, calls: 0, capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1, auth: 'apikey' as const },
    async *run(): AsyncIterable<StepEvent> { p.calls++; if (p.calls <= fails) { yield { type: 'error', message: msg }; return; } yield { type: 'done', output: 'ok', usage: { inputTokens: 0, outputTokens: 0 } }; } };
  return p;
}
async function last(it: AsyncIterable<StepEvent>) { let e: StepEvent | undefined; for await (const x of it) e = x; return e!; }
const req = { tenant: 'default', system: '', messages: [], tools: [] };

// A provider that always fails retryably, tracking whether each attempt's
// generator ran its `finally` (i.e. was actually closed, not abandoned
// mid-stream when `withRetry` moves on to the next attempt).
function flakyWithCleanup(msg: string): ModelProvider & { closed: number } {
  const p = { id: 'x/y', kind: 'direct' as const, closed: 0, capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1, auth: 'apikey' as const },
    async *run(): AsyncIterable<StepEvent> {
      try { yield { type: 'error', message: msg }; }
      finally { p.closed++; }
    } };
  return p;
}

// A successful multi-event provider, to check cleanup when the *caller* of
// `withRetry`'s output abandons the stream early (a `break` out of a
// `for await`), which should propagate a `.return()` down to the real
// provider's generator so its `finally` still runs.
function textThenMore(): ModelProvider & { closed: number } {
  const p = { id: 'x/y', kind: 'direct' as const, closed: 0, capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1, auth: 'apikey' as const },
    async *run(): AsyncIterable<StepEvent> {
      try {
        yield { type: 'text', text: 'hi' };
        yield { type: 'text', text: 'more' };
        yield { type: 'done', output: 'ok', usage: { inputTokens: 0, outputTokens: 0 } };
      } finally { p.closed++; }
    } };
  return p;
}

describe('withRetry', () => {
  test('retries a 429/5xx-shaped error and succeeds', async () => {
    const p = flaky(2, 'HTTP 429 rate limited'); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    expect((await last(r.run(req))).type).toBe('done'); expect(p.calls).toBe(3);
  });
  test('does not retry other errors', async () => {
    const p = flaky(5, 'structured output failed validation'); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    expect((await last(r.run(req))).type).toBe('error'); expect(p.calls).toBe(1);
  });
  test('gives up after tries and yields the last error', async () => {
    const p = flaky(5, 'HTTP 503'); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    expect((await last(r.run(req))).type).toBe('error'); expect(p.calls).toBe(3);
  });
  test('closes every abandoned attempt when retrying (no leaked generators)', async () => {
    const p = flakyWithCleanup('HTTP 503'); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    await last(r.run(req));
    expect(p.closed).toBe(3);
  });
  test('closes the underlying provider when the caller breaks early', async () => {
    const p = textThenMore(); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    for await (const _e of r.run(req)) { break; }
    expect(p.closed).toBe(1);
  });
});
