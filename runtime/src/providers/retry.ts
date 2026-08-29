import type { ModelProvider, StepEvent, StepRequest } from '../core/types';

const RETRYABLE = /\b(429|5\d\d|rate limit|overloaded|ECONNRESET|ETIMEDOUT)\b/i;

export function withRetry(p: ModelProvider, opts: { tries?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {}): ModelProvider {
  const tries = opts.tries ?? 3, baseMs = opts.baseMs ?? 500, sleep = opts.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  return {
    id: p.id, kind: p.kind, capabilities: p.capabilities,
    async *run(req: StepRequest): AsyncIterable<StepEvent> {
      for (let attempt = 1; ; attempt++) {
        const it = p.run(req)[Symbol.asyncIterator]();
        const head: StepEvent[] = []; let first = await it.next();
        while (!first.done && first.value.type === 'session') { head.push(first.value); first = await it.next(); }
        if (!first.done && first.value.type === 'error' && attempt < tries && RETRYABLE.test(first.value.message)) { await sleep(baseMs * 2 ** (attempt - 1)); continue; }
        for (const e of head) yield e;
        if (first.done) return;
        yield first.value;
        if (first.value.type === 'error') return;
        for (let n = await it.next(); !n.done; n = await it.next()) yield n.value;
        return;
      }
    },
  };
}
