import type { MatterOverview } from '../../api/types';

/** Serif greeting by time of day (spec §3.2). */
export function greetingFor(now: Date = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.';
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const;

function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/**
 * The italic subline (spec §3.2): counts from real data, omitting what is
 * zero — never an invented "all quiet". `null` means say nothing.
 */
export function sublineFor(counts: { nextActions: number; pending: number }): string | null {
  const parts: string[] = [];
  if (counts.nextActions > 0) {
    parts.push(
      `${countWord(counts.nextActions)} matter${counts.nextActions === 1 ? ' has' : 's have'} open next-actions`,
    );
  }
  if (counts.pending > 0) {
    parts.push(
      counts.pending === 1
        ? 'one proposal is waiting on you below'
        : `${countWord(counts.pending)} proposals are waiting on you below`,
    );
  }
  if (parts.length === 0) return null;
  const joined = parts.join(', and ');
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

/**
 * Deadlines come only from frontmatter the plugin conventions already
 * define (spec §4) — absent or unparseable fields simply don't render.
 */
export function parseDeadline(fm: Record<string, string>): Date | null {
  const raw = fm['deadline'] ?? fm['due'];
  if (raw === undefined) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

/** The next action, or `null`. An EMPTY string is `null` too: the server's
 * frontmatter filter keeps `next_action: ""`, and a row that prints a bare
 * `next:` label with nothing after it reads as a rendering bug. */
export function nextActionOf(fm: Record<string, string>): string | null {
  const raw = (fm['next_action'] ?? fm['nextAction'] ?? '').trim();
  return raw === '' ? null : raw;
}

/**
 * Matters sorted by deadline then recency (spec §3.2).
 *
 * Nothing filters on `stage`: the vault conventions define no closed-matter
 * marker yet, so a closed matter carrying a stale `next_action` still shows
 * here and still counts toward the subline. Recorded rather than guessed at.
 */
export function sortMatters(matters: MatterOverview[]): MatterOverview[] {
  return [...matters].sort((a, b) => {
    const da = parseDeadline(a.frontmatter)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = parseDeadline(b.frontmatter)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return b.mtimeMs - a.mtimeMs;
  });
}

export interface Due {
  text: string;
  /** Amber inside 14 days — and past the date, which is later, not calmer. */
  hot: boolean;
}

/**
 * Whole days from today to the deadline, on the CALENDAR rather than the
 * clock: the deadline is a UTC midnight (that is how `2026-09-12` parses)
 * and `now` is local, so subtracting the two instants would move the 14-day
 * edge by the reader's offset — amber arriving an afternoon early in Tokyo
 * and an afternoon late in California. Comparing date parts makes "14 days"
 * mean 14 of the reader's own days.
 */
function daysUntil(deadline: Date, now: Date): number {
  const then = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((then - today) / 86_400_000);
}

export function dueLabel(fm: Record<string, string>, now: Date = new Date()): Due {
  const deadline = parseDeadline(fm);
  if (deadline === null) return { text: 'no deadline', hot: false };
  // Read in UTC, because that is how a bare `2026-09-12` was parsed: local
  // formatting would print Sep 11 for every reader west of Greenwich.
  const date = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const days = daysUntil(deadline, now);
  // A date already gone by says so. Sorted to the top and painted amber, an
  // overdue matter otherwise reads as the most imminent upcoming one.
  if (days < 0) return { text: `overdue ${date}`, hot: true };
  return { text: `due ${date}`, hot: days <= 14 };
}

/**
 * `＋ attach from vault` inserts a path chip into the MESSAGE (spec §3.2):
 * the chips ride along as backticked paths on their own line.
 */
export function withAttachments(text: string, paths: string[]): string {
  const trimmed = text.trim();
  if (paths.length === 0) return trimmed;
  const chips = paths.map(p => `\`${p}\``).join(' ');
  return trimmed === '' ? chips : `${trimmed}\n\n${chips}`;
}

/**
 * Prompt-fills only — they put words in the box and nothing else (founder
 * rule: starters are never flows).
 */
export const STARTERS: readonly string[] = [
  'Review a contract',
  "What's our position on…",
  'Draft a response',
  'What changed this week?',
];

export function starterFill(label: string): string {
  if (label === 'Review a contract') return 'Review this contract: ';
  if (label === "What's our position on…") return "What's our position on ";
  if (label === 'Draft a response') return 'Draft a response to ';
  return 'What changed in the vault this week?';
}
