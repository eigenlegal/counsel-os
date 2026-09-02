/**
 * The scoreboard as the router reads it (routing-and-evals spec §6).
 *
 * The scoreboard keeps three sets apart on purpose; routing has to pick one,
 * and it picks the practice's own fixtures whenever they have a score for
 * the task, because those measure the work this practice actually does. The
 * shipped suite stands in until then. Benchmarks never route: they measure
 * generic legal competence, not this practice's positions.
 */
import type { Scoreboard, SetKind } from '../evals/scoreboard';

export interface ProviderScore {
  providerId: string;
  score: number;
  meanCostUsd: number | null;
  medianMs: number | null;
  /** Which set the score came from, so the reason can say. */
  set: SetKind;
}

/** task → the providers with a score, best first. */
export type RouteScores = Record<string, ProviderScore[]>;

function rowsFor(board: Scoreboard, task: string): { rows: ProviderScore[]; set: SetKind } | null {
  const entry = board.tasks.find(t => t.task === task);
  if (!entry) return null;
  for (const set of ['practice', 'shipped'] as const) {
    const scored = entry.sets[set].rows.filter(r => r.score !== null);
    if (scored.length === 0) continue;
    return {
      set,
      rows: scored.map(r => ({ providerId: r.providerId, score: r.score as number, meanCostUsd: r.meanCostUsd, medianMs: r.medianMs, set })),
    };
  }
  return null;
}

export function routeScores(board: Scoreboard): RouteScores {
  const out: RouteScores = {};
  for (const task of board.tasks) {
    const found = rowsFor(board, task.task);
    if (found === null) continue;
    out[task.task] = [...found.rows].sort((a, b) => b.score - a.score);
  }
  return out;
}
