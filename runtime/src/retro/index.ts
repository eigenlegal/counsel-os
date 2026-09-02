import { repoContentSource } from '../content/repo';
import type { ContentSource } from '../content/source';
import type { Tenant, VaultStore } from '../core/types';
import { runDoctor } from '../doctor/index';
import { stripFrontmatter } from '../loop/prompt';
import type { ThreadHeader, ThreadStore } from '../threads/store';
import type { VaultConfig } from '../vault/resolve-root';
import { gatherRetroEvidence, renderRetroEvidence } from './evidence';
import { readRetroState, writeRetroState, type RetroState } from './state';

export { readRetroState, writeRetroState, retroStatePath, type RetroState } from './state';
export { gatherRetroEvidence, renderRetroEvidence, type RetroEvidence, type RetroEvidenceDeps } from './evidence';

/** Quarterly, as `skills/retro/SKILL.md` says ("run quarterly, or every ~10
 * closed matters"). `retro_cadence_days` in `config.md` overrides it. */
export const DEFAULT_RETRO_CADENCE_DAYS = 90;

/** With no retro ever run, a vault this small has nothing to look back on:
 * the skill puts the useful threshold near ten matters, and three matters
 * or ten conversations is where a first retro starts to say something. */
export const FIRST_RETRO_MIN_MATTERS = 3;
export const FIRST_RETRO_MIN_THREADS = 10;

/** The task name stamped on a retro thread's header; the loop keys the
 * system prompt's retro sections on it. */
export const RETRO_TASK = 'retro';

export function retroCadenceDays(cfg: Pick<VaultConfig, 'retroCadenceDays'>): number {
  return cfg.retroCadenceDays ?? DEFAULT_RETRO_CADENCE_DAYS;
}

export interface RetroStatus {
  lastRetroAt: string | null;
  threadId: string | null;
  cadenceDays: number;
  /** Whole days since the last retro; `null` when there has never been one. */
  daysSince: number | null;
  /** When the next retro falls due; `null` when there has never been one. */
  dueAt: string | null;
  due: boolean;
  /** Why `due` is what it is, as a sentence the UI can show. */
  reason: string;
}

const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * Due when the last retro is older than the cadence — or, with none ever
 * run, when the vault holds enough to look back on (`FIRST_RETRO_MIN_*`).
 * `counts` come from the caller so this stays pure.
 */
export function retroStatus(opts: {
  state: RetroState;
  cfg: Pick<VaultConfig, 'retroCadenceDays'>;
  counts: { matters: number; threads: number };
  now?: Date;
}): RetroStatus {
  const now = opts.now ?? new Date();
  const cadenceDays = retroCadenceDays(opts.cfg);
  const last = opts.state.lastRetroAt === undefined ? null : new Date(opts.state.lastRetroAt);
  if (last === null || Number.isNaN(last.getTime())) {
    const enough = opts.counts.matters >= FIRST_RETRO_MIN_MATTERS || opts.counts.threads >= FIRST_RETRO_MIN_THREADS;
    return {
      lastRetroAt: null,
      threadId: null,
      cadenceDays,
      daysSince: null,
      dueAt: null,
      due: enough,
      reason: enough
        ? 'No retro yet'
        : `No retro yet — worth one once the vault has ${FIRST_RETRO_MIN_MATTERS} matters or ${FIRST_RETRO_MIN_THREADS} conversations`,
    };
  }
  const daysSince = Math.max(0, daysBetween(last, now));
  const dueAt = new Date(last.getTime() + cadenceDays * DAY_MS);
  const due = daysSince >= cadenceDays;
  return {
    lastRetroAt: last.toISOString(),
    threadId: opts.state.threadId ?? null,
    cadenceDays,
    daysSince,
    dueAt: dueAt.toISOString(),
    due,
    reason: due
      ? `Last retro ${daysSince} day${daysSince === 1 ? '' : 's'} ago`
      : `Last retro ${daysSince} day${daysSince === 1 ? '' : 's'} ago · next due ${dueAt.toISOString().slice(0, 10)}`,
  };
}

/** "since 2026-06-01" / "all time" — the period the retro covers, in the
 * thread title and the first message. */
export function periodLabel(from: string | null, to: Date): string {
  const end = to.toISOString().slice(0, 10);
  return from === null ? `all time · to ${end}` : `${from.slice(0, 10)} to ${end}`;
}

export interface StartRetroDeps {
  vaultRoot: string;
  tenant: Tenant;
  store: ThreadStore;
  now?: () => Date;
}

export interface RetroStart {
  threadId: string;
  title: string;
  period: { from: string | null; to: string };
  /** The first user turn. Short on purpose: the method and the evidence
   * travel in the system prompt (keyed on the thread's task), not in the
   * bubble. */
  message: string;
}

/**
 * Opens the retro thread and records it. The period starts at `since` when
 * the caller names one, else at the last retro, else "all time". Writing
 * the state BEFORE the model has said anything is deliberate: the thread
 * exists, the founder can return to it, and "due" should not keep firing
 * while a retro is under way.
 */
export async function startRetro(deps: StartRetroDeps, opts: { since?: string } = {}): Promise<RetroStart> {
  const now = deps.now?.() ?? new Date();
  const previous = readRetroState(deps.vaultRoot);
  const from = normalizeSince(opts.since) ?? previous.lastRetroAt ?? null;
  const period = { from, to: now.toISOString() };
  const title = `Retro · ${periodLabel(from, now)}`;
  const header: ThreadHeader = await deps.store.create(deps.tenant, { title, task: RETRO_TASK });
  writeRetroState(deps.vaultRoot, { lastRetroAt: now.toISOString(), threadId: header.id, period });
  const message =
    `Run the practice retro for ${periodLabel(from, now)}. ` +
    'Work the retro method in your instructions over the evidence there, state which mode you are running and why, ' +
    'and propose every knowledge change — promotions, position updates, the snapshot — as a proposal so I can approve each one.';
  return { threadId: header.id, title, period, message };
}

/** A `since` is a date; a bad one is ignored rather than guessed at. */
function normalizeSince(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === '') return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export interface RetroSectionsDeps {
  vaultRoot: string;
  tenant: Tenant;
  store: ThreadStore;
  vault: VaultStore;
  pluginRoot: string;
  content?: ContentSource;
}

/**
 * The two sections a retro step's system prompt carries (`prompt.ts`
 * `sections`): the retro method — `skills/retro/SKILL.md`, shipped content,
 * frontmatter stripped — and the runtime's evidence for the period recorded
 * in `.counsel/retro.json`. The method's writes are re-stated as proposals,
 * because the skill was written for a host where the model writes files
 * itself and this host never lets it.
 */
export async function retroSections(opts: { deps: RetroSectionsDeps; cfg: VaultConfig; now?: Date }): Promise<Array<{ heading: string; body: string }>> {
  const { deps } = opts;
  const content = deps.content ?? repoContentSource(deps.pluginRoot);
  const method = stripFrontmatter(content.read('skills/retro/SKILL.md'));
  const state = readRetroState(deps.vaultRoot);
  const evidence = await gatherRetroEvidence({
    vaultRoot: deps.vaultRoot,
    tenant: deps.tenant,
    store: deps.store,
    vault: deps.vault,
    cfg: opts.cfg,
    since: state.period?.from ?? null,
    ...(opts.now === undefined ? {} : { now: opts.now }),
    doctor: () => {
      try {
        return runDoctor({ vaultRoot: deps.vaultRoot, pluginRoot: deps.pluginRoot });
      } catch {
        return null; // the doctor failing is a finding for another day, not a reason to skip the retro
      }
    },
  });
  const hostNote =
    'This host is the counsel-os runtime, not Claude Code. Every write the method describes — promoting a playbook, ' +
    'updating a standard, appending to memory/patterns.md, saving the memory/retro-<date>.md snapshot — goes through ' +
    '`propose_update`, one proposal per file, so the lawyer approves each in the docket. Never ask whether to save; propose it. ' +
    'The evidence below is the runtime\'s own record of the period; read matter and entity files for the rest.';
  return [
    { heading: 'Retro method', body: `${hostNote}\n\n${method}` },
    { heading: 'Retro evidence (from the runtime)', body: renderRetroEvidence(evidence) },
  ];
}
