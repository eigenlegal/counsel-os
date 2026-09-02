import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tenant, VaultStore } from '../core/types';
import type { DoctorReport } from '../doctor/index';
import { listAllRuns, type RunRecord } from '../loop/run-record';
import type { ThreadEvent, ThreadHeader, ThreadStore } from '../threads/store';
import { vaultOverview, type MatterOverview } from '../vault/overview';
import type { VaultConfig } from '../vault/resolve-root';

/**
 * What the runtime knows about the period, gathered for the retro's system
 * prompt. The plugin's retro reads matter and entity files; the runtime has
 * more — every conversation, every step's tools and cost, every proposal
 * and how it was decided, every document produced — so the retro starts
 * from the record rather than from the model's memory of it.
 *
 * Read-only. Bounded where a vault can be large (threads are read in full
 * only when they were touched in the period).
 */
export interface RetroEvidence {
  period: { from: string | null; to: string };
  threads: {
    inPeriod: number;
    total: number;
    /** Steps (user turns answered) in the period. */
    steps: number;
    byTask: Record<string, number>;
    byProvider: Record<string, number>;
    /** Titles of the period's threads, newest first, capped. */
    titles: string[];
  };
  runs: {
    inPeriod: number;
    done: number;
    error: number;
    timeout: number;
    abandoned: number;
    costUsd: number;
    /** The most-consulted primitives, by step count. */
    primitives: Record<string, number>;
    /** Tool calls by name. */
    tools: Record<string, number>;
    /** Error messages, deduplicated, capped. */
    errors: string[];
  };
  proposals: {
    approved: ProposalNote[];
    rejected: ProposalNote[];
    pending: ProposalNote[];
  };
  artifacts: {
    count: number;
    byKind: Record<string, number>;
    applied: number;
    skipped: number;
    comments: number;
    paths: string[];
  };
  matters: {
    total: number;
    touched: MatterNote[];
  };
  memory: {
    patternsEntries: number | null;
    previousRetros: string[];
  };
  doctor: DoctorReport | null;
}

export interface ProposalNote {
  path: string;
  rationale: string;
  thread: string;
  at: string;
}

export interface MatterNote {
  path: string;
  title: string;
  stage: string | null;
  updated: string;
}

export interface RetroEvidenceDeps {
  vaultRoot: string;
  tenant: Tenant;
  store: ThreadStore;
  vault: VaultStore;
  cfg: VaultConfig;
  /** The period start; `null` = all time. */
  since: string | null;
  now?: Date;
  /** The doctor, injected so the evidence stays pure in tests; `null` skips it. */
  doctor?: () => DoctorReport | null;
}

const TITLE_CAP = 40;
const ERROR_CAP = 10;
const RATIONALE_CAP = 160;

function inPeriod(at: string, since: string | null, to: string): boolean {
  return (since === null || at >= since) && at <= to;
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function firstLine(text: string): string {
  const line = text.split('\n').find(l => l.trim() !== '') ?? '';
  return line.length > RATIONALE_CAP ? `${line.slice(0, RATIONALE_CAP - 1)}…` : line;
}

export async function gatherRetroEvidence(deps: RetroEvidenceDeps): Promise<RetroEvidence> {
  const now = deps.now ?? new Date();
  const to = now.toISOString();
  const since = deps.since;

  // Threads: headers for every thread, events only for the period's.
  const headers = await deps.store.list(deps.tenant);
  const period = headers.filter(h => inPeriod(h.updatedAt, since, to)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const threads: RetroEvidence['threads'] = { inPeriod: period.length, total: headers.length, steps: 0, byTask: {}, byProvider: {}, titles: [] };
  const proposals: RetroEvidence['proposals'] = { approved: [], rejected: [], pending: [] };
  const artifacts: RetroEvidence['artifacts'] = { count: 0, byKind: {}, applied: 0, skipped: 0, comments: 0, paths: [] };
  for (const header of period) {
    if (threads.titles.length < TITLE_CAP) threads.titles.push(titleOf(header));
    let events: ThreadEvent[];
    try {
      ({ events } = await deps.store.get(deps.tenant, header.id));
    } catch {
      continue; // deleted mid-scan: not the retro's problem
    }
    for (const ev of events) {
      if (!('t' in ev)) continue;
      if (ev.t === 'step' && inPeriod(ev.at, since, to)) {
        threads.steps += 1;
        bump(threads.byTask, ev.task ?? 'counsel');
        bump(threads.byProvider, ev.provider);
      } else if (ev.t === 'proposal' && inPeriod(ev.at, since, to)) {
        const note: ProposalNote = { path: ev.path, rationale: firstLine(ev.rationale), thread: titleOf(header), at: ev.at };
        proposals[ev.status].push(note);
      } else if (ev.t === 'artifact' && inPeriod(ev.at, since, to)) {
        artifacts.count += 1;
        bump(artifacts.byKind, ev.kind);
        artifacts.applied += ev.summary.applied;
        artifacts.skipped += ev.summary.skipped;
        artifacts.comments += ev.summary.comments;
        if (artifacts.paths.length < TITLE_CAP) artifacts.paths.push(ev.path);
      }
    }
  }

  // Runs: the record of every step — status, cost, what it consulted.
  const runs: RetroEvidence['runs'] = { inPeriod: 0, done: 0, error: 0, timeout: 0, abandoned: 0, costUsd: 0, primitives: {}, tools: {}, errors: [] };
  for (const rec of listAllRuns(deps.vaultRoot, deps.tenant)) {
    if (!inPeriod(rec.startedAt, since, to)) continue;
    runs.inPeriod += 1;
    if (rec.status === 'done') runs.done += 1;
    else if (rec.status === 'error') runs.error += 1;
    else if (rec.status === 'timeout') runs.timeout += 1;
    else if (rec.status === 'abandoned') runs.abandoned += 1;
    runs.costUsd += rec.costUsd ?? 0;
    for (const p of rec.primitivesRead) bump(runs.primitives, p);
    for (const call of rec.toolCalls) bump(runs.tools, call.name === '' ? 'unnamed' : call.name);
    if (rec.error !== undefined && rec.error !== '' && runs.errors.length < ERROR_CAP && !runs.errors.includes(rec.error)) runs.errors.push(rec.error);
  }
  runs.costUsd = Math.round(runs.costUsd * 100) / 100;

  // Matters: the overview, cut to the ones touched in the period.
  const overview = await vaultOverview(deps.vault, deps.tenant, deps.cfg);
  const sinceMs = since === null ? 0 : Date.parse(since);
  const touched = overview.matters
    .filter(m => m.mtimeMs >= sinceMs && m.mtimeMs <= now.getTime())
    .map(matterNote);
  const matters: RetroEvidence['matters'] = { total: overview.matters.length, touched };

  return {
    period: { from: since, to },
    threads,
    runs,
    proposals,
    artifacts,
    matters,
    memory: readMemory(deps.vaultRoot),
    doctor: deps.doctor === undefined ? null : deps.doctor(),
  };
}

function titleOf(header: ThreadHeader): string {
  return header.title?.trim() || 'Untitled';
}

function matterNote(m: MatterOverview): MatterNote {
  const stage = (m.frontmatter['stage'] ?? '').trim();
  return { path: m.path, title: m.title, stage: stage === '' ? null : stage, updated: new Date(m.mtimeMs).toISOString().slice(0, 10) };
}

/** `memory/patterns.md`'s entry count (top-level bullets and headings —
 * the skill's "log bloat" check) and the previous retro snapshots. */
function readMemory(vaultRoot: string): RetroEvidence['memory'] {
  let patternsEntries: number | null = null;
  try {
    const text = readFileSync(join(vaultRoot, 'memory', 'patterns.md'), 'utf8');
    patternsEntries = text.split('\n').filter(l => /^(- |\* |\d+\. |## )/.test(l)).length;
  } catch {
    patternsEntries = null;
  }
  let previousRetros: string[] = [];
  try {
    previousRetros = readdirSync(join(vaultRoot, 'memory'))
      .filter(n => /^retro-\d{4}-\d{2}-\d{2}\.md$/.test(n))
      .sort()
      .reverse();
  } catch {
    previousRetros = [];
  }
  return { patternsEntries, previousRetros };
}

function counts(map: Record<string, number>): string {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries.length === 0 ? 'none' : entries.map(([k, v]) => `${k} ${v}`).join(', ');
}

/** The evidence as the markdown section the system prompt carries. Plain
 * facts, no verdicts: the method decides what they mean. */
export function renderRetroEvidence(e: RetroEvidence): string {
  const from = e.period.from === null ? 'all time' : e.period.from.slice(0, 10);
  const lines: string[] = [];
  lines.push(`Period: ${from} to ${e.period.to.slice(0, 10)}.`);
  lines.push('');
  lines.push('### Conversations');
  lines.push(`- ${e.threads.inPeriod} of ${e.threads.total} conversations touched in the period; ${e.threads.steps} steps answered.`);
  lines.push(`- Steps by task: ${counts(e.threads.byTask)}.`);
  lines.push(`- Steps by provider: ${counts(e.threads.byProvider)}.`);
  if (e.threads.titles.length > 0) {
    lines.push('- Titles (newest first):');
    for (const t of e.threads.titles) lines.push(`  - ${t}`);
  }
  lines.push('');
  lines.push('### Runs');
  lines.push(`- ${e.runs.inPeriod} runs: ${e.runs.done} done, ${e.runs.error} errored, ${e.runs.timeout} timed out, ${e.runs.abandoned} abandoned; cost about $${e.runs.costUsd.toFixed(2)}.`);
  lines.push(`- Primitives consulted: ${counts(e.runs.primitives)}.`);
  lines.push(`- Tools called: ${counts(e.runs.tools)}.`);
  if (e.runs.errors.length > 0) {
    lines.push('- Errors seen:');
    for (const err of e.runs.errors) lines.push(`  - ${err}`);
  }
  lines.push('');
  lines.push('### Proposals (knowledge changes counsel raised)');
  for (const status of ['approved', 'rejected', 'pending'] as const) {
    const list = e.proposals[status];
    lines.push(`- ${status}: ${list.length}`);
    for (const p of list) lines.push(`  - ${p.path} — ${p.rationale} (in “${p.thread}”, ${p.at.slice(0, 10)})`);
  }
  lines.push('');
  lines.push('### Documents produced');
  lines.push(`- ${e.artifacts.count} documents (${counts(e.artifacts.byKind)}); ${e.artifacts.applied} edits applied, ${e.artifacts.skipped} skipped, ${e.artifacts.comments} comments.`);
  for (const p of e.artifacts.paths) lines.push(`  - ${p}`);
  lines.push('');
  lines.push('### Matters');
  lines.push(`- ${e.matters.touched.length} of ${e.matters.total} matters touched in the period:`);
  for (const m of e.matters.touched) lines.push(`  - ${m.path} — ${m.title}${m.stage === null ? '' : ` · ${m.stage}`} · updated ${m.updated}`);
  lines.push('');
  lines.push('### Memory');
  lines.push(`- memory/patterns.md: ${e.memory.patternsEntries === null ? 'absent' : `${e.memory.patternsEntries} entries`}.`);
  lines.push(`- Previous retro snapshots: ${e.memory.previousRetros.length === 0 ? 'none' : e.memory.previousRetros.join(', ')}.`);
  lines.push('');
  lines.push('### Vault health (doctor)');
  if (e.doctor === null) lines.push('- not run.');
  else {
    lines.push(`- ${e.doctor.summary}`);
    for (const f of e.doctor.findings) if (f.severity !== 'ok') lines.push(`  - ${f.severity}: ${f.check} — ${f.message}`);
  }
  return lines.join('\n');
}
