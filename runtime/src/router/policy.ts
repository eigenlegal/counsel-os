/**
 * The routing policy (routing-and-evals spec §6): how the practice wants each
 * kind of work routed, given what the scoreboard measured.
 *
 * It lives in the VAULT (`practice/routing.yaml`), beside the standards and
 * the methods, because it is a decision about the practice rather than about
 * this machine — `providers.yaml` in the counsel home stays the place for
 * credentials and endpoints.
 *
 * Nothing here chooses a provider; `Router` does that. This module is the
 * file: its shape, its defaults, and the two directions it travels.
 */
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { writeFileAtomic } from '../core/atomic-write';

/** How the practice picks among the providers that clear the bar. */
export type Preference = 'quality' | 'cost' | 'latency';

export interface TaskPolicy {
  /** The lowest score a provider may carry and still be a candidate. */
  min_score?: number;
  prefer?: Preference;
  /** A provider the lawyer chose by hand. It still has to clear the bar and
   * the matter's locality, so a pin can never quietly send a stays-local
   * matter to the cloud. */
  pinned?: string;
}

export interface RoutingPolicy {
  tasks: Record<string, TaskPolicy>;
}

/** A task with no policy of its own is scored at 0.7 and ranked by quality. */
export const DEFAULT_MIN_SCORE = 0.7;
export const DEFAULT_PREFERENCE: Preference = 'quality';

export const EMPTY_POLICY: RoutingPolicy = { tasks: {} };

export function policyPath(vaultRoot: string): string {
  return join(vaultRoot, 'practice', 'routing.yaml');
}

const PREFERENCES: readonly Preference[] = ['quality', 'cost', 'latency'];

/**
 * Parse the file. A malformed entry is dropped with the rest kept: a typo in
 * one task's block must not cost the practice every other route, and the
 * router's fallback (the default provider) is always safe.
 */
export function parseRoutingPolicy(yamlText: string): RoutingPolicy {
  const raw = Bun.YAML.parse(yamlText) as unknown;
  if (raw === null || typeof raw !== 'object') return { tasks: {} };
  const rawTasks = (raw as { tasks?: unknown }).tasks;
  if (rawTasks === null || typeof rawTasks !== 'object' || rawTasks === undefined) return { tasks: {} };
  const tasks: Record<string, TaskPolicy> = {};
  for (const [task, value] of Object.entries(rawTasks as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const entry: TaskPolicy = {};
    if (typeof v['min_score'] === 'number' && v['min_score'] >= 0 && v['min_score'] <= 1) entry.min_score = v['min_score'];
    if (typeof v['prefer'] === 'string' && PREFERENCES.includes(v['prefer'] as Preference)) entry.prefer = v['prefer'] as Preference;
    if (typeof v['pinned'] === 'string' && v['pinned'] !== '') entry.pinned = v['pinned'];
    if (Object.keys(entry).length > 0) tasks[task] = entry;
  }
  return { tasks };
}

export function readRoutingPolicy(vaultRoot: string): RoutingPolicy {
  const path = policyPath(vaultRoot);
  if (!existsSync(path)) return { tasks: {} };
  try {
    return parseRoutingPolicy(readFileSync(path, 'utf8'));
  } catch {
    // An unreadable or unparseable file routes by the defaults rather than
    // stopping the practice from working.
    return { tasks: {} };
  }
}

/** The file as a lawyer would read it: one block per task, comments kept. */
export function renderRoutingPolicy(policy: RoutingPolicy): string {
  const head = [
    '# How counsel-os routes each kind of work (docs: routing-and-evals spec §6).',
    '# Scores come from the eval fixtures; see Settings › Models.',
    '#   min_score: the lowest score a provider may carry and still be chosen',
    `#   prefer:    quality (default), cost, or latency`,
    '#   pinned:    a provider you chose by hand; it still has to clear the bar',
    '',
  ];
  const names = Object.keys(policy.tasks).sort();
  if (names.length === 0) return `${head.join('\n')}tasks: {}\n`;
  const lines = ['tasks:'];
  for (const task of names) {
    const entry = policy.tasks[task]!;
    lines.push(`  ${task}:`);
    if (entry.min_score !== undefined) lines.push(`    min_score: ${entry.min_score}`);
    if (entry.prefer !== undefined) lines.push(`    prefer: ${entry.prefer}`);
    if (entry.pinned !== undefined) lines.push(`    pinned: ${entry.pinned}`);
  }
  return `${head.join('\n')}${lines.join('\n')}\n`;
}

export function writeRoutingPolicy(vaultRoot: string, policy: RoutingPolicy): void {
  // A practice file, not a secret: readable like the standards beside it.
  writeFileAtomic(policyPath(vaultRoot), renderRoutingPolicy(policy), { mode: 0o644 });
}

export function taskPolicy(policy: RoutingPolicy, task: string | undefined): Required<Pick<TaskPolicy, 'min_score' | 'prefer'>> & { pinned?: string } {
  const entry = (task === undefined ? undefined : policy.tasks[task]) ?? {};
  return {
    min_score: entry.min_score ?? DEFAULT_MIN_SCORE,
    prefer: entry.prefer ?? DEFAULT_PREFERENCE,
    ...(entry.pinned === undefined ? {} : { pinned: entry.pinned }),
  };
}
