import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Tenant } from '../core/types';

/**
 * Run logs live at `<vaultRoot>/.counsel/runs/<tenant>/<runId>.log.jsonl`
 * (spec §4.3). Like `ThreadStore`, this writes `.counsel/` through `node:fs`
 * rather than `VaultStore` — `FsVaultStore` deliberately refuses that prefix
 * so no model-reachable tool can reach the runtime's own bookkeeping.
 */
const RUNS_DIR = join('.counsel', 'runs');

// `tenant` and `runId` both land in a filesystem path. Same rule, and the
// same regexes, as `ThreadStore`: a value like `../../etc` would otherwise
// escape the runs directory.
const RUN_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TENANT_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export interface ToolCallLog {
  name: string;
  /** Wall-clock ms between the `tool_call` and its matching `tool_result`. */
  ms: number;
  isError: boolean;
}

export interface RunLogEntry {
  at: string;
  provider: string;
  task?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
  durationMs: number;
  toolCalls: ToolCallLog[];
}

export function runLogPath(vaultRoot: string, tenant: Tenant, runId: string): string {
  if (!TENANT_RE.test(tenant)) throw new Error('invalid tenant');
  if (!RUN_ID_RE.test(runId)) throw new Error('invalid run id');
  return join(vaultRoot, RUNS_DIR, tenant, `${runId}.log.jsonl`);
}

/**
 * Appends one JSON line per entry. Append rather than overwrite: a run id
 * names a whole run, and a run that grows into several steps (the flow
 * engine, later) must accumulate rather than lose everything but the last.
 */
export function writeRunLog(vaultRoot: string, tenant: Tenant, runId: string, entries: RunLogEntry[]): void {
  if (entries.length === 0) return;
  const path = runLogPath(vaultRoot, tenant, runId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, entries.map(e => JSON.stringify(e) + '\n').join(''), { flag: 'a' });
}
