import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The law frontmatter policy (`knowledge/law/frontmatter-policy.json`): the
 * per-area review cadence the doctor's currency check measures against. The
 * file is maintainer documentation, not shipped content, so it is read from
 * the plugin root directly; a runtime without it (a future embedded build
 * that forgot it) falls back to the policy's own default of twelve months.
 */
export interface LawPolicy {
  reviewCadenceMonths: Record<string, number>;
  /** The areas the policy names — the shipped areas. A vault area outside
   * this set is a custom, user-owned area. */
  areas: ReadonlySet<string>;
}

export const DEFAULT_CADENCE_MONTHS = 12;

export function parseLawPolicy(text: string): LawPolicy {
  const raw = JSON.parse(text) as { review_cadence_months?: Record<string, unknown> };
  const reviewCadenceMonths: Record<string, number> = {};
  for (const [area, months] of Object.entries(raw.review_cadence_months ?? {})) {
    if (typeof months === 'number' && Number.isFinite(months) && months > 0) reviewCadenceMonths[area] = months;
  }
  const areas = new Set(Object.keys(reviewCadenceMonths).filter(a => a !== 'default'));
  return { reviewCadenceMonths, areas };
}

export function loadLawPolicy(pluginRoot: string): LawPolicy {
  try {
    return parseLawPolicy(readFileSync(join(pluginRoot, 'knowledge', 'law', 'frontmatter-policy.json'), 'utf8'));
  } catch {
    return { reviewCadenceMonths: { default: DEFAULT_CADENCE_MONTHS }, areas: new Set() };
  }
}

export function cadenceFor(policy: LawPolicy, area: string): number {
  return policy.reviewCadenceMonths[area] ?? policy.reviewCadenceMonths['default'] ?? DEFAULT_CADENCE_MONTHS;
}
