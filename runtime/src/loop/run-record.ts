import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Tenant, Usage } from '../core/types';
import { runFilePath, runsDir, type ToolCallLog } from './run-log';

/**
 * The run RECORD: one inspectable file per user request — what counsel read,
 * ran, proposed, produced, and cost (spec §4.3). It sits beside that run's
 * `.log.jsonl` telemetry line at
 * `<vaultRoot>/.counsel/runs/<tenant>/<runId>.json` and, unlike the log, is
 * rewritten as the step progresses: opened `running` before the provider is
 * even chosen, finalized `done` / `error` / `timeout` when the step ends. A
 * record left `running` is itself the signal — the process died mid-step.
 *
 * Like `run-log.ts` and `ThreadStore`, this writes `.counsel/` through
 * `node:fs` rather than `VaultStore`, which deliberately refuses that prefix
 * so no model-reachable tool can reach the runtime's own bookkeeping.
 */
export type RunStatus = 'running' | 'done' | 'error' | 'timeout';

export interface RunRecord {
  runId: string;
  threadId: string;
  tenant: Tenant;
  startedAt: string;
  finishedAt?: string;
  status: RunStatus;
  /** The user turn that started the step. */
  message: string;
  /** Empty until the router (or the caller's `providerId`) resolves one. */
  provider: string;
  task?: string;
  /** Unique `read_primitive` names, in the order the step first read them. */
  primitivesRead: string[];
  toolCalls: ToolCallLog[];
  /** Ids of the proposals this step raised. */
  proposals: string[];
  /** The parsed structured answer — only when the step asked for one. */
  output?: unknown;
  usage?: Usage;
  /** Lifted out of `usage` so a cost column needs no unwrapping. */
  costUsd?: number;
  durationMs?: number;
  error?: string;
}

/**
 * What `finishRun` may change. A run's identity — who it belongs to, when it
 * opened — is set once, by `startRun`, and a later patch cannot rewrite it:
 * these fields are how a record is found and ordered.
 */
export type RunPatch = Partial<Omit<RunRecord, 'runId' | 'threadId' | 'tenant' | 'startedAt'>>;

export function runRecordPath(vaultRoot: string, tenant: Tenant, runId: string): string {
  return runFilePath(vaultRoot, tenant, runId, '.json');
}

/**
 * Writes a whole record, atomically: a reader (`GET /runs`) never sees a
 * half-written file, only the old one or the new one. `.tmp` sits in the
 * same directory so the rename stays on one filesystem.
 */
function writeRecord(vaultRoot: string, rec: RunRecord): void {
  const path = runRecordPath(vaultRoot, rec.tenant, rec.runId);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(rec, null, 2), 'utf8');
  renameSync(tmp, path);
}

/** Opens a run's record. Called before the provider is resolved, so the file
 * exists for the whole life of the step. */
export function startRun(vaultRoot: string, rec: RunRecord): void {
  writeRecord(vaultRoot, rec);
}

/**
 * Applies `patch` to an open record. Read-modify-write rather than append:
 * one step writes this file a handful of times at most, and every writer is
 * the loop that owns the step, so there is nothing to interleave with.
 */
export function finishRun(vaultRoot: string, tenant: Tenant, runId: string, patch: RunPatch): void {
  const current = readRun(vaultRoot, tenant, runId);
  // The record is opened before anything can fail; if it is gone, the open
  // failed (a read-only vault) and there is nothing to finalize. The caller
  // reports it rather than inventing a record with no message or thread.
  if (!current) throw new Error(`unknown run: ${runId}`);
  writeRecord(vaultRoot, { ...current, ...patch });
}

/** The record, or `null` when no run by that id was ever opened. */
export function readRun(vaultRoot: string, tenant: Tenant, runId: string): RunRecord | null {
  const path = runRecordPath(vaultRoot, tenant, runId);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  return JSON.parse(raw) as RunRecord;
}

/**
 * Every run of one thread, newest first. `threadId` is matched against the
 * records' contents, never used as a path segment, so it needs no validation
 * of its own — an id that names no thread simply matches nothing.
 */
export function listRuns(vaultRoot: string, tenant: Tenant, threadId: string): RunRecord[] {
  const dir = runsDir(vaultRoot, tenant);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const runs: RunRecord[] = [];
  for (const name of names) {
    // Records only: this leaves out `<runId>.log.jsonl` and any `.json.tmp`
    // a crashed write left mid-rename.
    if (!name.endsWith('.json')) continue;
    let rec: RunRecord;
    try {
      rec = JSON.parse(readFileSync(join(dir, name), 'utf8')) as RunRecord;
    } catch (err) {
      // One unreadable record must not cost the caller every other run of
      // the thread; the operator gets the detail on stderr.
      console.error(`run-record: skipping unreadable record ${name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (rec.threadId === threadId) runs.push(rec);
  }
  // Newest first. `startedAt` is an ISO string, so it sorts lexically; the
  // run id breaks ties so the order is stable rather than readdir's.
  runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.runId.localeCompare(a.runId));
  return runs;
}
