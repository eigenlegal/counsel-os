import type { Entry, Tenant, VaultStore } from '../core/types';
import type { VaultConfig } from './resolve-root';

/**
 * `GET /vault/overview` (redesign spec §4): one read-only call that feeds
 * the home page and the vault tree's top — the matters with their
 * frontmatter, humanized titles and recency, plus how much lives under the
 * other root groups. No writes, no new state, no model calls.
 *
 * BOUNDED, because the home page hits this on every load and a matters
 * directory has no size limit of its own: at most `MAX_MATTERS` files are
 * read, newest first, and any single file over `MAX_MATTER_BYTES` is listed
 * without its frontmatter rather than read into memory. Both bounds are
 * applied from `list()`'s `mtimeMs` and `size`, BEFORE any read happens, so
 * a 5,000-matter vault costs 200 reads and a 500 MB file costs none.
 */

export interface MatterOverview {
  path: string;
  /** Frontmatter `title`, else the first H1, else the prettified filename
   * (spec §3.4 "humanized titles"). */
  title: string;
  /** Scalar frontmatter only, every value as a string. The server does not
   * interpret the fields — absent fields simply don't render (spec §4). */
  frontmatter: Record<string, string>;
  mtimeMs: number;
}

export interface VaultOverview {
  /** Sorted by mtime, oldest first — the order the mock tree reads in. */
  matters: MatterOverview[];
  groups: { practice: number; knowledge: number; other: number };
}

/** The fixed knowledge roots; the entities dir comes from config. */
const KNOWLEDGE_ROOTS = ['memory', 'law'] as const;

/** How many matters one overview reads, newest first. The home page shows a
 * recent docket, not an archive; the tree pages for the rest. */
export const MAX_MATTERS = 200;

/** A matter above this is listed but not read. Frontmatter lives in the
 * first few lines of a normal note; a file this large is a transcript or a
 * paste, and reading it whole to find a `title:` is not a trade worth
 * making on a page load. */
export const MAX_MATTER_BYTES = 512 * 1024;

/**
 * Splits `---` frontmatter off a markdown source. `Bun.YAML` (the same
 * parser `providers/registry.ts` trusts) reads the block; anything that is
 * not a flat map of scalars degrades to `{}` rather than failing the
 * listing — a matter with odd frontmatter is still a matter.
 */
export function parseFrontmatter(input: string): { frontmatter: Record<string, string>; body: string } {
  // A leading BOM would fail the `---` check and hide the whole block.
  // Windows-authored and some Obsidian-exported notes carry one.
  const source = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) return { frontmatter: {}, body: source };
  const firstNl = source.indexOf('\n');
  const rest = source.slice(firstNl + 1);
  // The terminator has to BE the line, not just start it: a bare
  // `indexOf('\n---')` let `----` and `--- note` close the block, and would
  // cut a multi-line YAML value short at a `---` in column 0.
  const term = /^---[ \t]*\r?$/m.exec(rest);
  if (term === null) return { frontmatter: {}, body: source };
  const afterTerm = term.index + term[0].length;
  const bodyNl = rest.indexOf('\n', afterTerm);
  const body = bodyNl === -1 ? '' : rest.slice(bodyNl + 1);
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(rest.slice(0, term.index));
  } catch {
    return { frontmatter: {}, body };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { frontmatter: {}, body };
  const frontmatter: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === undefined || typeof value === 'object') continue;
    frontmatter[key] = String(value);
  }
  return { frontmatter, body };
}

/** `2026-06-vendora-worldpay.md` → `Vendora worldpay`: extension off, a
 * leading `YYYY-MM[-DD]-` date off, dashes and underscores to spaces, first
 * letter up. The last-resort title (spec §3.4). */
export function prettifyName(fileName: string): string {
  // The lookahead keeps a date-only name whole: without it the optional day
  // group backtracks, `2026-06-01.md` strips `2026-06-` and titles as `01`.
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}(-\d{2})?-(?=\D)/, '');
  const spaced = stem.replace(/[-_]+/g, ' ').trim();
  return spaced === '' ? fileName : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function titleOf(source: string, path: string): string {
  const { frontmatter, body } = parseFrontmatter(source);
  return titleFrom(frontmatter, body, path);
}

/** `titleOf` over an ALREADY-parsed note, so `vaultOverview` parses each
 * matter's frontmatter once instead of twice. */
function titleFrom(frontmatter: Record<string, string>, body: string, path: string): string {
  const fmTitle = frontmatter['title']?.trim();
  if (fmTitle !== undefined && fmTitle !== '') return fmTitle;
  const h1 = /^#\s+(.+)$/m.exec(body);
  if (h1 !== null) return h1[1]!.trim();
  return prettifyName(path.slice(path.lastIndexOf('/') + 1));
}

/** A listing that treats "the directory is not there" as "it is empty" —
 * `vault/overview` must answer on a vault with no matters dir (spec §5). */
async function listOr(vault: VaultStore, tenant: Tenant, dir: string): Promise<Entry[]> {
  try {
    return await vault.list(tenant, dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return [];
    throw err;
  }
}

export async function vaultOverview(vault: VaultStore, tenant: Tenant, cfg: VaultConfig): Promise<VaultOverview> {
  // Newest first, THEN cut: the cap has to keep the most recent matters, so
  // it is applied to the listing (which already carries `mtimeMs`) and not
  // to whatever order the filesystem handed back.
  const candidates = (await listOr(vault, tenant, cfg.mattersPath))
    .filter(entry => entry.kind === 'file' && entry.path.endsWith('.md'))
    .sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0))
    .slice(0, MAX_MATTERS);

  const matters: MatterOverview[] = [];
  for (const entry of candidates) {
    // Over the cap: still a matter, still listed, just not read. A title
    // from the filename beats stalling the home page on a huge file.
    if (entry.size !== undefined && entry.size > MAX_MATTER_BYTES) {
      matters.push({
        path: entry.path,
        title: prettifyName(entry.path.slice(entry.path.lastIndexOf('/') + 1)),
        frontmatter: {},
        mtimeMs: entry.mtimeMs ?? 0,
      });
      continue;
    }
    let source: string;
    try {
      source = await vault.read(tenant, entry.path);
    } catch {
      continue; // vanished between list and read — skip, never fail the call
    }
    const { frontmatter, body } = parseFrontmatter(source);
    matters.push({
      path: entry.path,
      title: titleFrom(frontmatter, body, entry.path),
      frontmatter,
      mtimeMs: entry.mtimeMs ?? 0,
    });
  }
  matters.sort((a, b) => a.mtimeMs - b.mtimeMs);

  const knowledgeRoots = new Set<string>([...KNOWLEDGE_ROOTS, cfg.entitiesPath]);
  let practice = 0;
  let knowledge = 0;
  let other = 0;
  for (const entry of await listOr(vault, tenant, '.')) {
    if (entry.path === cfg.mattersPath) continue;
    if (entry.kind === 'dir' && entry.path === 'practice') practice += (await listOr(vault, tenant, entry.path)).length;
    else if (entry.kind === 'dir' && knowledgeRoots.has(entry.path)) knowledge += (await listOr(vault, tenant, entry.path)).length;
    else other += 1;
  }
  return { matters, groups: { practice, knowledge, other } };
}
