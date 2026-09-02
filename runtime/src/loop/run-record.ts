import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Tenant, Usage } from '../core/types';
import { runFilePath, runsDir, type ToolCallLog } from './run-log';

/**
 * The run RECORD: one inspectable file per user request — what counsel read,
 * ran, proposed, produced, and cost (spec §4.3). It sits beside that run's
 * `.log.jsonl` telemetry line at
 * `<vaultRoot>/.counsel/runs/<tenant>/<runId>.json` and, unlike the log, is
 * rewritten as the step progresses: opened `running` before the provider is
 * even chosen, finalized when the step ends — `done` / `error` / `timeout`, or
 * `abandoned` when the caller hung up mid-step (a closed browser tab, not a
 * failure). Every way out of the loop finalizes, so a record left `running`
 * is itself the signal: the process died mid-step.
 *
 * Like `run-log.ts` and `ThreadStore`, this writes `.counsel/` through
 * `node:fs` rather than `VaultStore`, which deliberately refuses that prefix
 * so no model-reachable tool can reach the runtime's own bookkeeping.
 */
export type RunStatus = 'running' | 'done' | 'error' | 'timeout' | 'abandoned';

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
  /** Where the task came from (routing-and-evals spec §3): the caller, the
   * thread, a rule, a model guess, the `chat` default, or a later
   * correction by the lawyer. */
  taskSource?: 'caller' | 'rule' | 'model' | 'default' | 'corrected';
  /** The lawyer's mark on this answer (spec §7), kept here so the strip can
   * show it on reload; the outcomes record has the full line. */
  mark?: { mark: 'useful' | 'not-right'; reason?: string; at: string };
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
  /** The model's RAW answer when a typed step could not honor its schema
   * (web-ui spec §4.3): `error` says what went wrong, this says what the
   * model actually wrote. Unset for every other kind of failure. */
  errorText?: string;
  /** `stays-local` when the matter's privacy policy chose the provider
   * (providers spec §7) — the record shows the policy was in force. */
  policy?: 'stays-local';
  /** Why this provider (routing-and-evals spec §6): the scoreboard, a pin,
   * the configured route, or the default. */
  routeReason?: { kind: string; text: string };
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

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Parses one record file. A record that will not parse is treated as one that
 * is not there — the detail goes to stderr for the operator. Every reader
 * agrees on this: `listRuns` skips it rather than failing the whole listing,
 * and `GET /runs/:runId` answers 404 rather than 500, because to a caller an
 * unreadable record and a missing one are the same thing.
 */
function parseRecord(path: string, raw: string): RunRecord | null {
  try {
    return JSON.parse(raw) as RunRecord;
  } catch (err) {
    console.error(`run-record: unreadable record ${path}: ${detail(err)}`);
    return null;
  }
}

/**
 * One record file, or `null` if anything about it is unreadable. The READ is
 * inside the guard, not just the parse: a record can vanish between a
 * `readdir` and the read, or be something that is not a readable file at all
 * — a directory sitting where a record should be — and neither may cost the
 * caller the rest of the thread's runs, or turn one run's `GET` into a 500.
 *
 * A record that is simply absent is not an unreadable one, so ENOENT says
 * nothing to the operator: `readRun` answers `null` for every run id that was
 * never opened.
 */
function readRecordAt(path: string): RunRecord | null {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`run-record: unreadable record ${path}: ${detail(err)}`);
    }
    return null;
  }
  return parseRecord(path, raw);
}

/** The record, or `null` when no run by that id was ever opened — or when
 * what is there cannot be read. Deliberately the same reader `listRuns` uses,
 * so the two never disagree about what a record is: an unreadable one is a
 * missing one, and a caller gets a 404 rather than a 500. */
export function readRun(vaultRoot: string, tenant: Tenant, runId: string): RunRecord | null {
  return readRecordAt(runRecordPath(vaultRoot, tenant, runId));
}

/**
 * Every run of the tenant, newest first — the retro's evidence needs the
 * whole period, not one thread. Same file rules as `listRuns`.
 */
export function listAllRuns(vaultRoot: string, tenant: Tenant): RunRecord[] {
  return readRuns(vaultRoot, tenant);
}

/**
 * Every run of one thread, newest first. `threadId` is matched against the
 * records' contents, never used as a path segment, so it needs no validation
 * of its own — an id that names no thread simply matches nothing.
 */
export function listRuns(vaultRoot: string, tenant: Tenant, threadId: string): RunRecord[] {
  return readRuns(vaultRoot, tenant, { threadId });
}

/**
 * Every run this tenant has, newest first — one thread's, or all of them
 * (the routing ledger).
 *
 * A record's name is its run id, which carries no date, so the newest
 * cannot be picked by name. With a `limit` the file's mtime orders the
 * CANDIDATES and only those are read: a `stat` is a syscall, a record is
 * kilobytes of JSON, and this runs on the runtime's only thread while a
 * step may be streaming in another tab. Without a limit every record is
 * read, which is what the retro wants.
 *
 * The mtime is a proxy — a record is rewritten when its step finishes and
 * when it is marked — so the candidate window is deliberately wider than
 * the limit, and `startedAt` still decides the order that is returned.
 */
export function readRuns(vaultRoot: string, tenant: Tenant, opts: { threadId?: string; limit?: number } = {}): RunRecord[] {
  const dir = runsDir(vaultRoot, tenant);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  // Records only: this leaves out `<runId>.log.jsonl` and any `.json.tmp`
  // a crashed write left mid-rename.
  let files = names.filter(name => name.endsWith('.json'));

  if (opts.limit !== undefined && files.length > opts.limit) {
    // Four times the limit, and never fewer than fifty: a run marked long
    // after it finished, or one thread's runs among many, still has room to
    // fall inside the window.
    const window = Math.max(50, opts.limit * 4);
    if (files.length > window) {
      const stamped: Array<{ name: string; at: number }> = [];
      for (const name of files) {
        try {
          stamped.push({ name, at: statSync(join(dir, name)).mtimeMs });
        } catch {
          // Gone between the readdir and the stat: not a run any more.
        }
      }
      stamped.sort((a, b) => b.at - a.at);
      files = stamped.slice(0, window).map(s => s.name);
    }
  }

  const runs: RunRecord[] = [];
  for (const name of files) {
    const rec = readRecordAt(join(dir, name));
    if (rec === null) continue;
    if (opts.threadId !== undefined && rec.threadId !== opts.threadId) continue;
    runs.push(rec);
  }
  // Newest first. `startedAt` is an ISO string, so it sorts lexically; the
  // run id breaks ties so the order is stable rather than readdir's.
  runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.runId.localeCompare(a.runId));
  return opts.limit === undefined ? runs : runs.slice(0, opts.limit);
}
