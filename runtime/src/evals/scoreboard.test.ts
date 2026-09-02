import { describe, expect, test } from 'bun:test';
import type { EvalResult } from './results';
import { renderScoreboard, scoreboard, staleDays, type FixtureCounts } from './scoreboard';

const NOW = new Date('2026-09-05T12:00:00Z');

function line(over: Partial<EvalResult> & { fixtureId: string; providerId: string; at: string }): EvalResult {
  const model = over.providerId.slice(over.providerId.indexOf('/') + 1);
  return {
    source: 'shipped',
    task: 'review',
    modelVersion: model,
    score: 1,
    terms: {},
    notes: [],
    durationMs: 1000,
    ...over,
  };
}

const FIXTURES: FixtureCounts = { review: { shipped: 2, practice: 1, benchmark: 0 }, extract: { shipped: 1, practice: 0, benchmark: 0 } };

describe('scoreboard', () => {
  test('the latest line per fixture wins, and the row averages the fixtures it scored', () => {
    const results = [
      line({ fixtureId: 'a', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: 0.2 }),
      line({ fixtureId: 'a', providerId: 'x/m', at: '2026-09-03T00:00:00Z', score: 0.8 }),
      line({ fixtureId: 'b', providerId: 'x/m', at: '2026-09-02T00:00:00Z', score: 0.6, durationMs: 3000, costUsd: 0.4 }),
    ];
    const board = scoreboard(results, FIXTURES, NOW);
    const review = board.tasks.find(t => t.task === 'review')!;
    const row = review.sets.shipped.rows[0]!;
    expect(row.providerId).toBe('x/m');
    expect(row.score).toBeCloseTo(0.7, 6);
    expect(row.scored).toBe(2);
    expect(row.sampleSize).toBe(3);
    expect(row.medianMs).toBe(2000);
    expect(row.meanCostUsd).toBeCloseTo(0.4, 6);
    expect(row.lastAt).toBe('2026-09-03T00:00:00Z');
    expect(row.staleDays).toBe(2);
    expect(review.sets.shipped.fixtures).toBe(2);
  });

  test('sets are kept apart and never averaged together', () => {
    const results = [
      line({ fixtureId: 'a', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: 1, source: 'shipped' }),
      line({ fixtureId: 'mine', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: 0, source: 'practice' }),
    ];
    const review = scoreboard(results, FIXTURES, NOW).tasks.find(t => t.task === 'review')!;
    expect(review.sets.shipped.rows[0]!.score).toBe(1);
    expect(review.sets.practice.rows[0]!.score).toBe(0);
    expect(review.sets.benchmark.rows).toEqual([]);
  });

  test('a failed cell carries its reason and is left out of the mean; all failed is a null score', () => {
    const results = [
      line({ fixtureId: 'a', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: null, error: 'step timed out' }),
      line({ fixtureId: 'b', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: 0.5 }),
      line({ fixtureId: 'a', providerId: 'y/n', at: '2026-09-01T00:00:00Z', score: null, error: 'unknown provider' }),
    ];
    const review = scoreboard(results, FIXTURES, NOW).tasks.find(t => t.task === 'review')!;
    const x = review.sets.shipped.rows.find(r => r.providerId === 'x/m')!;
    expect(x.score).toBe(0.5);
    expect(x.failed).toEqual([{ fixtureId: 'a', reason: 'step timed out' }]);
    const y = review.sets.shipped.rows.find(r => r.providerId === 'y/n')!;
    expect(y.score).toBeNull();
    expect(y.scored).toBe(0);
  });

  test('documents of a multi-document fixture are separate cells; a model version is its own row', () => {
    const results = [
      line({ fixtureId: 'cuad', documentId: 'd1', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: 1, source: 'benchmark' }),
      line({ fixtureId: 'cuad', documentId: 'd2', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: 0, source: 'benchmark' }),
      line({ fixtureId: 'cuad', documentId: 'd1', providerId: 'x/m2', at: '2026-09-01T00:00:00Z', score: 1, source: 'benchmark' }),
    ];
    const review = scoreboard(results, { review: { shipped: 0, practice: 0, benchmark: 1 } }, NOW).tasks.find(t => t.task === 'review')!;
    const rows = review.sets.benchmark.rows;
    expect(rows.map(r => r.modelVersion).sort()).toEqual(['m', 'm2']);
    expect(rows.find(r => r.modelVersion === 'm')!.score).toBe(0.5);
    expect(rows.find(r => r.modelVersion === 'm')!.scored).toBe(2);
  });

  test('a task with fixtures and no results still appears, with counts and no rows', () => {
    const board = scoreboard([], FIXTURES, NOW);
    expect(board.tasks.map(t => t.task)).toEqual(['extract', 'review']);
    expect(board.tasks[0]!.sets.shipped).toEqual({ fixtures: 1, rows: [] });
  });

  test('rows sort by score, best first, nulls last', () => {
    const results = [
      line({ fixtureId: 'a', providerId: 'x/m', at: '2026-09-01T00:00:00Z', score: 0.3 }),
      line({ fixtureId: 'a', providerId: 'y/n', at: '2026-09-01T00:00:00Z', score: 0.9 }),
      line({ fixtureId: 'a', providerId: 'z/o', at: '2026-09-01T00:00:00Z', score: null, error: 'x' }),
    ];
    const rows = scoreboard(results, FIXTURES, NOW).tasks.find(t => t.task === 'review')!.sets.shipped.rows;
    expect(rows.map(r => r.providerId)).toEqual(['y/n', 'x/m', 'z/o']);
  });

  test('the CLI ledger: one block per task, one line per set, a row per provider; nothing scored says so', () => {
    const results = [
      line({ fixtureId: 'a', providerId: 'x/m', at: '2026-09-03T00:00:00Z', score: 0.8, durationMs: 2500, costUsd: 0.05 }),
      line({ fixtureId: 'b', providerId: 'x/m', at: '2026-09-03T00:00:00Z', score: null, error: 'timed out' }),
    ];
    const out = renderScoreboard(scoreboard(results, FIXTURES, NOW));
    expect(out).toContain('REVIEW');
    expect(out).toContain('  shipped · 2 fixtures');
    expect(out).toMatch(/0\.80 {3}x\/m\s+1\/2 · 1 failed · 1\.8s · \$0\.050\/run · 2d ago/);
    expect(out).toContain('  practice · 1 fixture\n    nothing scored yet');
    expect(out).not.toContain('benchmark');
    expect(out).toContain('EXTRACT');
    expect(renderScoreboard(scoreboard([], {}, NOW))).toBe('Nothing scored yet.');
  });

  test('staleDays counts whole days', () => {
    expect(staleDays('2026-09-05T11:00:00Z', NOW)).toBe(0);
    expect(staleDays('2026-09-02T12:00:00Z', NOW)).toBe(3);
  });
});
