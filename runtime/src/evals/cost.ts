/**
 * What a run will probably cost (spec §4.2): fixture count × the provider's
 * discovered pricing, over an assumed step size. `null` when the vendor
 * publishes no price the runtime knows — the guard then cannot fire, and
 * the caller says so rather than pretending it is free.
 */
export interface Pricing {
  /** USD per million tokens, as `DiscoveredModel.pricing` carries it. */
  prompt: number;
  completion: number;
}

/** A review step over a fixture vault reads the document, the standards and
 * the law area: tens of thousands of prompt tokens, a few thousand out. */
export const ASSUMED_STEP = { promptTokens: 40_000, completionTokens: 3_000 } as const;

export const CONFIRM_OVER_USD = 1;

export function estimateCost(count: number, pricing: Pricing | null | undefined, step = ASSUMED_STEP): number | null {
  if (pricing === null || pricing === undefined) return null;
  const perRun = (step.promptTokens * pricing.prompt + step.completionTokens * pricing.completion) / 1_000_000;
  return Math.round(perRun * count * 100) / 100;
}

/**
 * Whether a run must be confirmed first: more than one fixture on a provider
 * whose price is unknown (a whole set on the subscription harness is real
 * money and the window), or any run over the dollar line. A single fixture
 * on an unpriced provider runs without asking — it is the smoke test.
 */
export function needsConfirmation(estimateUsd: number | null, count = 1): boolean {
  if (estimateUsd === null) return count > 1;
  return estimateUsd > CONFIRM_OVER_USD;
}

export function confirmationMessage(estimateUsd: number | null, count: number, providerId: string): string {
  const n = `${count} fixture${count === 1 ? '' : 's'}`;
  return estimateUsd === null
    ? `${n} on ${providerId} with no known price — confirm to run them.`
    : `${n} on ${providerId}, about $${estimateUsd.toFixed(2)} — confirm to run them.`;
}
