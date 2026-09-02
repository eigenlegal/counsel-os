/**
 * Which fixtures a run covers, shared by the CLI and the route: one by id,
 * every fixture of a task, or everything runnable. Legacy fixtures (no
 * vault) are never selected by `all` or a task — they can only be scored
 * from a saved output — and are listed so the caller can say so.
 */
import { taskForScorer, type LoadedFixture } from './fixture';
import type { EvalResult } from './results';
import type { SetSummary } from './runner';

export interface Selection {
  fixtures?: string[];
  task?: string;
  all?: boolean;
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

export function selectFixtures(loaded: LoadedFixture[], sel: Selection): Selected {
  const skipped: Selected['skipped'] = [];
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
