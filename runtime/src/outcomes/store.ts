/**
 * The outcomes record (routing-and-evals spec §7): what the lawyer did with
 * counsel's work, one JSON line each, appended under the vault's own
 * `.counsel/` and never sent anywhere. Retro reads it; the scoreboard
 * (step 3) will. `outcomes: off` in `config.md` stops every write — the
 * switch is read on each append, so flipping it needs no restart.
 *
 * `node:fs` rather than `VaultStore`, which refuses `.counsel/` so no
 * model-reachable tool can touch the runtime's bookkeeping.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { VaultConfig } from '../vault/resolve-root';

export type OutcomeKind =
  | 'proposal.decided'
  | 'artifact.produced'
  | 'answer.marked'
  | 'task.corrected'
  | 'thread.deleted';

export interface OutcomeLine {
  at: string;
  kind: OutcomeKind;
  threadId?: string;
  runId?: string;
  task?: string;
  providerId?: string;
  matter?: string;
  path?: string;
  detail: Record<string, unknown>;
}

export function outcomesPath(vaultRoot: string): string {
  return join(vaultRoot, '.counsel', 'outcomes.jsonl');
}

/** Whether the vault keeps the record. Absent → on (spec §7). */
export function outcomesEnabled(cfg: Pick<VaultConfig, 'outcomes'>): boolean {
  return cfg.outcomes !== false;
}

/**
 * Appends one line, or nothing when the vault switched the record off.
 * Returns whether a line was written. Failures are the caller's to swallow:
 * the record is telemetry and must never fail a step.
 */
export function appendOutcome(vaultRoot: string, cfg: Pick<VaultConfig, 'outcomes'>, line: Omit<OutcomeLine, 'at'> & { at?: string }): boolean {
  if (!outcomesEnabled(cfg)) return false;
  const path = outcomesPath(vaultRoot);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const full: OutcomeLine = { at: line.at ?? new Date().toISOString(), ...line } as OutcomeLine;
  appendFileSync(path, `${JSON.stringify(full)}\n`, { encoding: 'utf8', mode: 0o600 });
  return true;
}

/** Every line, oldest first; a corrupt line is skipped, never fatal. */
export function readOutcomes(vaultRoot: string, opts: { since?: string | null; kind?: OutcomeKind } = {}): OutcomeLine[] {
  const path = outcomesPath(vaultRoot);
  if (!existsSync(path)) return [];
  const sinceMs = opts.since === undefined || opts.since === null ? 0 : Date.parse(opts.since);
  const out: OutcomeLine[] = [];
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    let line: OutcomeLine;
    try {
      line = JSON.parse(raw) as OutcomeLine;
    } catch {
      continue;
    }
    if (typeof line.at !== 'string' || typeof line.kind !== 'string') continue;
    if (sinceMs > 0 && Date.parse(line.at) < sinceMs) continue;
    if (opts.kind !== undefined && line.kind !== opts.kind) continue;
    out.push(line);
  }
  return out;
}

export interface OutcomeCounts {
  decisions: { approved: number; rejected: number; withReason: number };
  marks: { useful: number; notRight: number };
  corrections: number;
  documents: number;
  deletedThreads: number;
}

export function countOutcomes(lines: OutcomeLine[]): OutcomeCounts {
  const c: OutcomeCounts = { decisions: { approved: 0, rejected: 0, withReason: 0 }, marks: { useful: 0, notRight: 0 }, corrections: 0, documents: 0, deletedThreads: 0 };
  for (const l of lines) {
    if (l.kind === 'proposal.decided') {
      if (l.detail['decision'] === 'approved') c.decisions.approved += 1;
      else if (l.detail['decision'] === 'rejected') c.decisions.rejected += 1;
      if (typeof l.detail['reason'] === 'string' && l.detail['reason'] !== '') c.decisions.withReason += 1;
    } else if (l.kind === 'answer.marked') {
      if (l.detail['mark'] === 'useful') c.marks.useful += 1;
      else if (l.detail['mark'] === 'not-right') c.marks.notRight += 1;
    } else if (l.kind === 'task.corrected') c.corrections += 1;
    else if (l.kind === 'artifact.produced') c.documents += 1;
    else if (l.kind === 'thread.deleted') c.deletedThreads += 1;
  }
  return c;
}
