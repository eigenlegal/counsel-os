/**
 * The results record (spec §5): `<vault>/.counsel/evals/results.jsonl`,
 * append-only, one line per fixture run. Fixture vaults and outputs are
 * temporary; these lines are what the scoreboard reads.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Usage } from '../core/types';
import type { FixtureSource } from './fixture';

export interface EvalResult {
  at: string;
  fixtureId: string;
  /** `<fixtureId>#<documentId>` runs carry the document here. */
  documentId?: string;
  source: FixtureSource['kind'];
  task: string;
  providerId: string;
  /** The model part of the provider id, e.g. `claude-opus-5`. */
  modelVersion: string;
  score: number | null;
  terms: Record<string, number>;
  notes: string[];
  usage?: Usage;
  costUsd?: number;
  durationMs: number;
  runId?: string;
  error?: string;
}

export function resultsPath(vaultRoot: string): string {
  return join(vaultRoot, '.counsel', 'evals', 'results.jsonl');
}

export function appendResult(vaultRoot: string, line: EvalResult): void {
  const path = resultsPath(vaultRoot);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  appendFileSync(path, `${JSON.stringify(line)}\n`, { encoding: 'utf8', mode: 0o600 });
}

export function readResults(vaultRoot: string, opts: { since?: string | null } = {}): EvalResult[] {
  const path = resultsPath(vaultRoot);
  if (!existsSync(path)) return [];
  const since = opts.since ?? null;
  const out: EvalResult[] = [];
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    try {
      const line = JSON.parse(raw) as EvalResult;
      if (since !== null && line.at < since) continue;
      out.push(line);
    } catch {
      // A torn line from an interrupted write is skipped, never fatal.
    }
  }
  return out;
}
