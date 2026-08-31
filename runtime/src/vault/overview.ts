import type { Entry, Tenant, VaultStore } from '../core/types';
import type { VaultConfig } from './resolve-root';

/**
 * `GET /vault/overview` (redesign spec §4): one read-only call that feeds
 * the home page and the vault tree's top — the matters with their
 * frontmatter, humanized titles and recency, plus how much lives under the
 * other root groups. No writes, no new state, no model calls.
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

/**
 * Splits `---` frontmatter off a markdown source. `Bun.YAML` (the same
 * parser `providers/registry.ts` trusts) reads the block; anything that is
 * not a flat map of scalars degrades to `{}` rather than failing the
 * listing — a matter with odd frontmatter is still a matter.
 */
export function parseFrontmatter(source: string): { frontmatter: Record<string, string>; body: string } {
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) return { frontmatter: {}, body: source };
  const firstNl = source.indexOf('\n');
  const end = source.indexOf('\n---', firstNl);
  if (end === -1) return { frontmatter: {}, body: source };
  const bodyNl = source.indexOf('\n', end + 1);
  const body = bodyNl === -1 ? '' : source.slice(bodyNl + 1);
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(source.slice(firstNl + 1, end));
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
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}(-\d{2})?-/, '');
  const spaced = stem.replace(/[-_]+/g, ' ').trim();
  return spaced === '' ? fileName : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function titleOf(source: string, path: string): string {
  const { frontmatter, body } = parseFrontmatter(source);
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
  const matters: MatterOverview[] = [];
  for (const entry of await listOr(vault, tenant, cfg.mattersPath)) {
    if (entry.kind !== 'file' || !entry.path.endsWith('.md')) continue;
    let source: string;
    try {
      source = await vault.read(tenant, entry.path);
    } catch {
      continue; // vanished between list and read — skip, never fail the call
    }
    const { frontmatter } = parseFrontmatter(source);
    matters.push({
      path: entry.path,
      title: titleOf(source, entry.path),
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
