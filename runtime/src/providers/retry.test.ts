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
});
