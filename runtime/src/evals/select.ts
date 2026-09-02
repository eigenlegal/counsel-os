/**
 * Which fixtures a run covers, shared by the CLI and the route: one by id,
 * every fixture of a task, or everything runnable. Legacy fixtures (no
 * vault) are never selected by `all` or a task — they can only be scored
 * from a saved output — and are listed so the caller can say so.
 */
import { sourceKindOf, taskForScorer, type FixtureSet, type LoadedFixture } from './fixture';
import type { EvalResult } from './results';
import type { SetSummary } from './runner';

export interface Selection {
  fixtures?: string[];
  task?: string;
  all?: boolean;
  /** Narrow to one set first; alone it means every runnable fixture of it. */
  set?: FixtureSet;
}

export interface Selected {
  fixtures: LoadedFixture[];
  /** Selected explicitly but not runnable. */
  skipped: Array<{ id: string; reason: string }>;
  error?: string;
}

export function taskOf(l: LoadedFixture): string {
  return l.fixture.task_kind ?? taskForScorer(l.fixture.scorer);
}

export function runnable(l: LoadedFixture): boolean {
  return l.fixture.vault !== undefined;
}

/**
 * How many model calls a set of fixtures makes: one per fixture, or one per
 * entry of `documents[]`. The cost guard counts THESE, not files — an
 * imported benchmark is one fixture holding hundreds of contracts, and
 * counting files would wave a 510-call run through with no confirmation.
 */
export function runCount(fixtures: LoadedFixture[]): number {
  return fixtures.reduce((n, l) => n + Math.max(1, l.fixture.documents?.length ?? 1), 0);
}

export function selectFixtures(all: LoadedFixture[], sel: Selection): Selected {
  const skipped: Selected['skipped'] = [];
  // The same bucketing the scoreboard uses (`sourceKindOf`): a fixture that
  // declares its own `source.kind` shows on that tab, and has to run from
  // it too, or the tab offers a score the run then refuses.
  const loaded = sel.set === undefined ? all : all.filter(l => sourceKindOf(l) === sel.set);
  if (sel.set !== undefined && loaded.length === 0) {
    return { fixtures: [], skipped, error: sel.set === 'benchmark' ? 'no benchmark is imported — run `counsel-os eval import <set>` first' : `no ${sel.set} fixtures` };
  }
  if (sel.set !== undefined && sel.fixtures === undefined && sel.task === undefined && sel.all === undefined) sel = { ...sel, all: true };
  if (sel.fixtures !== undefined && sel.fixtures.length > 0) {
    const out: LoadedFixture[] = [];
    for (const id of sel.fixtures) {
      const hit = loaded.find(l => l.fixture.id === id);
      if (hit === undefined) return { fixtures: [], skipped, error: `no fixture with id ${id}` };
      if (!runnable(hit)) skipped.push({ id, reason: 'a legacy fixture with no vault cannot be run' });
      else out.push(hit);
    }
    return { fixtures: out, skipped };
  }
  if (sel.task !== undefined) {
    const out = loaded.filter(l => taskOf(l) === sel.task);
    if (out.length === 0) return { fixtures: [], skipped, error: `no fixture runs as the ${sel.task} task` };
    return { fixtures: out.filter(runnable), skipped: out.filter(l => !runnable(l)).map(l => ({ id: l.fixture.id, reason: 'a legacy fixture with no vault cannot be run' })) };
  }
  if (sel.all === true) {
    return { fixtures: loaded.filter(runnable), skipped: loaded.filter(l => !runnable(l)).map(l => ({ id: l.fixture.id, reason: 'a legacy fixture with no vault cannot be run' })) };
  }
  return { fixtures: [], skipped, error: 'say which fixtures: --fixture <id>, --task <task>, or --all' };
}

export function renderResult(r: EvalResult): string {
  const score = r.score === null ? 'FAIL  ' : r.score.toFixed(4);
  const id = r.documentId === undefined ? r.fixtureId : `${r.fixtureId}#${r.documentId}`;
  const tail = r.error !== undefined ? `  ${r.error}` : r.notes.length > 0 ? `  ${r.notes.join(' ')}` : '';
  const cost = r.costUsd === undefined ? '' : `  $${r.costUsd.toFixed(4)}`;
  return `${score}  ${id.padEnd(34)} ${(r.durationMs / 1000).toFixed(1)}s${cost}${tail}`;
}

export function renderSummary(s: SetSummary): string {
  const mean = s.mean === null ? 'no score' : `mean ${s.mean.toFixed(4)}`;
  return `${s.scored} of ${s.count} scored, ${s.failed} failed · ${mean}${s.costUsd > 0 ? ` · $${s.costUsd.toFixed(4)}` : ''}`;
}
