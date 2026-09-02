/** What every scorer returns (routing-and-evals spec §4.1). `score` is
 * `null` when nothing could be judged (a rubric whose every criterion's
 * judge call failed) — never averaged, shown as "failed" (spec §9). */
export interface ScoreResult {
  score: number | null;
  /** The named terms behind the score, each in `[0, 1]`. */
  terms: Record<string, number>;
  /** Plain sentences a reader can act on: what matched, what was missed. */
  notes: string[];
}

/** What a scorer may need beyond the fixture and the answer. */
export interface ScoreContext {
  /** Reads a vault-relative file from the prepared fixture vault (the redline
   * scorer opens the source document). */
  readDocument?: (path: string) => Uint8Array;
  /** The rubric judge: one criterion, one answer, one verdict. */
  judge?: Judge;
  /** Term weights from the fixture, when it overrides the scorer's defaults. */
  weights?: Record<string, number>;
}

export interface JudgeVerdict {
  pass: boolean;
  quote?: string;
}

export type Judge = (criterion: { id: string; text: string }, answer: string) => Promise<JudgeVerdict>;

/** `normalize` from `run_evals.py:48` — lowercase, whitespace collapsed. */
export function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsAny(text: string, terms: readonly string[]): boolean {
  return terms.some(term => text.includes(normalize(term)));
}

/** A weighted mean over the given terms; a weight absent from the override
 * keeps its default. Weights are normalized so a fixture may write any
 * positive numbers. */
export function weighted(terms: Record<string, number>, defaults: Record<string, number>, override?: Record<string, number>): number {
  const w: Record<string, number> = { ...defaults };
  for (const [k, v] of Object.entries(override ?? {})) if (k in w) w[k] = v;
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return round(Object.entries(w).reduce((sum, [k, weight]) => sum + (terms[k] ?? 0) * weight, 0) / total);
}

export function round(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
