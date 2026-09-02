/**
 * The rubric judge (spec §12): one provider, one criterion, one answer, one
 * pass/fail with a quote. The judge is the practice's default provider by
 * default, and it never grades its own vendor on the practice set — the
 * caller uses `pickJudge` to enforce that and falls back to another vendor
 * or to no judge at all (rubric fixtures then fail to score, visibly).
 */
import { z } from 'zod';
import type { ModelProvider, StepEvent } from '../core/types';
import type { Router } from '../router/router';
import type { Judge } from './scorers/types';

export const JUDGE_TIMEOUT_MS = 60_000;

const Verdict = z.object({ pass: z.boolean(), quote: z.string().optional() });

export function providerJudge(provider: ModelProvider, opts: { tenant?: string; timeoutMs?: number } = {}): Judge {
  return async (criterion, answer) => {
    const cancel = new AbortController();
    const timer = setTimeout(() => cancel.abort(), opts.timeoutMs ?? JUDGE_TIMEOUT_MS);
    try {
      let output: unknown = null;
      let error: string | undefined;
      for await (const ev of provider.run({
        tenant: opts.tenant ?? 'default',
        system: [
          'You grade one criterion against one answer written by a lawyer\'s assistant.',
          'Answer with `pass` (true when the answer meets the criterion) and `quote` (the shortest span of the answer that shows why).',
          'Judge only the criterion given. Do not reward length or confidence.',
        ].join('\n'),
        messages: [{ role: 'user', content: `Criterion (${criterion.id}): ${criterion.text}\n\nAnswer:\n${answer}` }],
        tools: [],
        outputSchema: Verdict,
        maxTokens: 200,
        maxToolCalls: 0,
        signal: cancel.signal,
      })) {
        const e = ev as StepEvent;
        if (e.type === 'done') output = e.output;
        if (e.type === 'error') error = e.message;
      }
      if (error !== undefined) throw new Error(error);
      const parsed = Verdict.safeParse(output);
      if (!parsed.success) throw new Error('the judge did not answer in the verdict shape');
      return parsed.data;
    } finally {
      clearTimeout(timer);
    }
  };
}

export function vendorOf(providerId: string): string {
  const i = providerId.indexOf('/');
  return i === -1 ? providerId : providerId.slice(0, i);
}

export interface PickedJudge {
  provider: ModelProvider;
  /** Set when the default had to be passed over. */
  note?: string;
}

/** The judge for a run of `providerId` over a set that includes practice
 * fixtures: the default provider, unless it shares the vendor under test,
 * in which case the first provider of another vendor — or none. A shipped-
 * only set may be judged by anyone. */
export function pickJudge(opts: { providers: readonly ModelProvider[]; router: Router; providerId: string; practiceSet: boolean }): PickedJudge | null {
  let fallback: ModelProvider;
  try {
    fallback = opts.router.resolve();
  } catch {
    return null;
  }
  if (!opts.practiceSet || vendorOf(fallback.id) !== vendorOf(opts.providerId)) return { provider: fallback };
  const other = opts.providers.find(p => vendorOf(p.id) !== vendorOf(opts.providerId));
  if (other === undefined) return null;
  return { provider: other, note: `${fallback.id} shares a vendor with ${opts.providerId}; ${other.id} judges the practice rubrics instead.` };
}
