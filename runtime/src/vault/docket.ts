import type { Entry, Tenant, VaultStore } from '../core/types';
import { MAX_MATTER_BYTES, MAX_MATTERS, parseFrontmatter, splitFrontmatterBlock, titleOf } from './overview';
import { listMatterFiles } from './overview';
import type { VaultConfig } from './resolve-root';

/**
 * The deadline docket (`GET /docket`): every dated obligation the matter
 * files carry, classified against today. The runtime's own sweep, in
 * TypeScript — the plugin's `scripts/docket_sweep.py` does the same job for
 * the Claude Code front end, and the standalone app cannot assume Python.
 * Read-only: it changes nothing, emits into nothing (roadmap §1).
 *
 * Frontmatter convention (primitives/remember.md, mirrored from the Python
 * sweep — the same shapes, nothing more):
 *
 *     deadlines:
 *       - date: 2026-07-15
 *         action: "renewal notice due"
 *         type: renewal          # optional
 *         source: "MSA §9.2"     # optional
 *         done: false            # true/done/yes… hides it, kept for audit
 *
 * plus the scalar `deadline:` / `due:` key the home page already reads,
 * which counts as one entry whose action is the matter's next action.
 */

export type DocketStatus = 'overdue' | 'soon' | 'later';

export interface DocketEntry {
  /** `YYYY-MM-DD`, as written. */
  date: string;
  action: string;
  type?: string;
  source?: string;
  matter: { path: string; title: string };
  status: DocketStatus;
}

export interface DocketView {
  /** Sorted by date, then matter title. */
  deadlines: DocketEntry[];
  /** Entries whose date could not be read (missing, or not `YYYY-MM-DD`).
   * Counted so a malformed deadline is a number on the page, never a
   * silent absence — a missed date is the practice's #1 malpractice vector. */
  skipped: number;
}

/** A matter as the sweep reads it: the whole note, already located. */
export interface DocketMatter {
  path: string;
  title: string;
  source: string;
}

/** "Due soon" = within this many calendar days, the home page's own edge. */
export const SOON_DAYS = 14;

const DONE_VALUES: ReadonlySet<string> = new Set(['true', 'yes', 'done', '1', 'satisfied', 'complete', 'completed']);
const ENTRY_KEYS: ReadonlySet<string> = new Set(['date', 'action', 'type', 'source', 'done', 'status']);
const KEY_LINE = /^([A-Za-z0-9_-]+):\s*(.*)$/;

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && v[0] === v[v.length - 1] && (v[0] === '"' || v[0] === "'")) return v.slice(1, -1);
  return v;
}

/**
 * The `deadlines:` block as the Python sweep reads it: a block sequence of
 * mappings, the first field allowed on the dash line. Blank lines, indented
 * lines and column-0 `- ` items belong to the block; the next top-level key
 * ends it. Not a YAML parser — the schema is fixed and this stays
 * deterministic on the hand-edited notes it will meet.
 */
export function parseDeadlineEntries(block: string): Array<Record<string, string>> {
  const lines = block.split(/\r?\n/);
  const start = lines.findIndex(line => /^deadlines:\s*(.*)$/.test(line));
  if (start === -1) return [];
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') continue;
    if (/^[ \t]/.test(line) || line.trimStart().startsWith('-')) {
      body.push(line);
      continue;
    }
    break;
  }
  const entries: Array<Record<string, string>> = [];
  let current: Record<string, string> | null = null;
  const apply = (entry: Record<string, string>, text: string): void => {
    const m = KEY_LINE.exec(text);
    if (m === null) return;
    const key = m[1]!.toLowerCase();
    if (ENTRY_KEYS.has(key)) entry[key] = unquote(m[2]!);
  };
  for (const line of body) {
    const stripped = line.trim();
    if (stripped.startsWith('-')) {
      if (current !== null) entries.push(current);
      current = {};
      const rest = stripped.slice(1).trim();
      if (rest !== '') apply(current, rest);
    } else if (current !== null) {
      apply(current, stripped);
    }
  }
  if (current !== null) entries.push(current);
  return entries;
}

function isDone(entry: Record<string, string>): boolean {
  return DONE_VALUES.has((entry['done'] ?? '').trim().toLowerCase()) || DONE_VALUES.has((entry['status'] ?? '').trim().toLowerCase());
}

/** `YYYY-MM-DD` and a real calendar date, or `null`. Anything looser (a
 * month name, a time, `TBD`) is malformed and counted, not guessed at. */
export function parseIsoDate(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (m === null) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/**
 * Whole calendar days from `now` to the deadline — date parts, not
 * instants, so the 14-day edge does not move with the reader's timezone
 * (the same rule as the home page's `daysUntil`).
 */
export function daysUntil(deadline: Date, now: Date): number {
  const then = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((then - today) / 86_400_000);
}

export function statusFor(days: number): DocketStatus {
  if (days < 0) return 'overdue';
  if (days <= SOON_DAYS) return 'soon';
  return 'later';
}

/** Pure: the docket for these matters as of `now`. */
export function sweepDocket(matters: DocketMatter[], now: Date = new Date()): DocketView {
  const deadlines: DocketEntry[] = [];
  let skipped = 0;
  for (const matter of matters) {
    const { block } = splitFrontmatterBlock(matter.source);
    if (block === null) continue;
    const { frontmatter } = parseFrontmatter(matter.source);
    const raw: Array<Record<string, string>> = parseDeadlineEntries(block);
    // The scalar key the home page reads: one entry, the matter's next
    // action as its action, so a matter dated the old way is not undated
    // here. Missing next action → the row says "deadline" and no more.
    const scalar = (frontmatter['deadline'] ?? frontmatter['due'] ?? '').trim();
    if (scalar !== '') {
      const action = (frontmatter['next_action'] ?? frontmatter['nextAction'] ?? '').trim();
      raw.push({ date: scalar, action: action === '' ? 'deadline' : action });
    }
    for (const entry of raw) {
      if (isDone(entry)) continue;
      const date = parseIsoDate(entry['date'] ?? '');
      if (date === null) {
        skipped += 1;
        continue;
      }
      const out: DocketEntry = {
        date: (entry['date'] ?? '').trim(),
        action: (entry['action'] ?? '').trim(),
        matter: { path: matter.path, title: matter.title },
        status: statusFor(daysUntil(date, now)),
      };
      const type = (entry['type'] ?? '').trim();
      const source = (entry['source'] ?? '').trim();
      if (type !== '') out.type = type;
      if (source !== '') out.source = source;
      deadlines.push(out);
    }
  }
  deadlines.sort((a, b) => a.date.localeCompare(b.date) || a.matter.title.localeCompare(b.matter.title));
  return { deadlines, skipped };
}

async function listOr(vault: VaultStore, tenant: Tenant, dir: string): Promise<Entry[]> {
  try {
    return await vault.list(tenant, dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return [];
    throw err;
  }
}

/**
 * The matters the sweep reads: the SAME discovery and bounds as the
 * overview (newest `MAX_MATTERS` markdown files under the matters dir; a
 * file over `MAX_MATTER_BYTES` is not read), so the docket can never name a
 * matter the home page does not list. Every matter file counts — a note
 * without `counsel-os-type: matter` still carries dates a lawyer cares
 * about, and the home page lists it too.
 */
export async function vaultDocket(vault: VaultStore, tenant: Tenant, cfg: VaultConfig, now: Date = new Date()): Promise<DocketView> {
  const candidates = (await listMatterFiles(vault, tenant, cfg))
    .filter(entry => entry.size === undefined || entry.size <= MAX_MATTER_BYTES)
    .sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0))
    .slice(0, MAX_MATTERS);
  const matters: DocketMatter[] = [];
  for (const entry of candidates) {
    let source: string;
    try {
      source = await vault.read(tenant, entry.path);
    } catch {
      continue; // vanished between list and read — skip, never fail the call
    }
    matters.push({ path: entry.path, title: titleOf(source, entry.path), source });
  }
  return sweepDocket(matters, now);
}
