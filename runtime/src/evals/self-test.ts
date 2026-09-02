/**
 * The scorer self-test (`bun run evals:self-test`): every shipped fixture's
 * committed sample output must score at least 0.95 — the bar
 * `scripts/run_evals.py --self-test` set, kept so a scorer change that
 * quietly moves the goalposts fails CI. Also usable as a library from the
 * parity test.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadShippedFixtures, type LoadedFixture } from './fixture';
import { scoreFindings } from './scorers/findings';

export const SELF_TEST_BAR = 0.95;

export interface SelfTestRow {
  id: string;
  score: number | null;
  missing: string[];
  wrongBand: string[];
  notes: string[];
}

export function sampleOutputPath(repoRoot: string, id: string): string {
  return join(repoRoot, 'evals', 'sample-outputs', `${id}.json`);
}

export function selfTest(repoRoot: string, fixtures: LoadedFixture[] = loadShippedFixtures(repoRoot)): { rows: SelfTestRow[]; ok: boolean } {
  const rows: SelfTestRow[] = [];
  for (const { fixture } of fixtures) {
    if (fixture.scorer !== 'findings') continue;
    const path = sampleOutputPath(repoRoot, fixture.id);
    if (!existsSync(path)) {
      rows.push({ id: fixture.id, score: null, missing: [], wrongBand: [], notes: [`no sample output at evals/sample-outputs/${fixture.id}.json`] });
      continue;
    }
    const r = scoreFindings(fixture, JSON.parse(readFileSync(path, 'utf8')));
    rows.push({ id: fixture.id, score: r.score, missing: r.detail.missed_catches, wrongBand: r.detail.wrong_band, notes: r.notes });
  }
  return { rows, ok: rows.every(r => r.score !== null && r.score >= SELF_TEST_BAR) };
}

if (import.meta.main) {
  const repoRoot = process.argv[2] ?? process.cwd();
  const { rows, ok } = selfTest(repoRoot);
  for (const r of rows) {
    const flag = r.score !== null && r.score >= SELF_TEST_BAR ? 'ok  ' : 'FAIL';
    console.log(`${flag} ${r.id.padEnd(34)} ${r.score === null ? '   -' : r.score.toFixed(4)}${r.notes.length ? `  ${r.notes.join(' ')}` : ''}`);
  }
  console.log(ok ? `self-test passed: ${rows.length} fixtures at or above ${SELF_TEST_BAR}` : 'self-test FAILED');
  process.exit(ok ? 0 : 1);
}
