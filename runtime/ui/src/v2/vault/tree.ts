import type { MatterOverview, VaultEntry, VaultOverview } from '../../api/types';

/** The root dirs that read as Knowledge (spec §3.4: memory, law, entities). */
export const KNOWLEDGE_DIRS: ReadonlySet<string> = new Set(['memory', 'law', 'entities']);

export interface TreeGroups {
  mattersDir: string | null;
  matters: MatterOverview[];
  practice: VaultEntry[];
  knowledge: VaultEntry[];
  /** Everything else the server still lists (spec §3.4 "Other files (n)"). */
  other: VaultEntry[];
}

/**
 * The vault root, grouped the way a practice reads it. Matters come from the
 * overview (humanized, dated); the matters DIRECTORY is excluded from Other
 * — the group replaces it. With an empty overview the conventional `matters`
 * dir is still treated as the matters home rather than "other".
 */
export function groupRoot(rootEntries: VaultEntry[], overview: VaultOverview): TreeGroups {
  const first = overview.matters[0]?.path;
  const cut = first?.indexOf('/') ?? -1;
  const mattersDir = first !== undefined && cut > 0 ? first.slice(0, cut) : null;
  const practice: VaultEntry[] = [];
  const knowledge: VaultEntry[] = [];
  const other: VaultEntry[] = [];
  for (const entry of rootEntries) {
    if (entry.kind === 'dir' && (entry.path === mattersDir || (mattersDir === null && entry.path === 'matters'))) continue;
    if (entry.kind === 'dir' && entry.path === 'practice') practice.push(entry);
    else if (entry.kind === 'dir' && KNOWLEDGE_DIRS.has(entry.path)) knowledge.push(entry);
    else other.push(entry);
  }
  return { mattersDir, matters: overview.matters, practice, knowledge, other };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** The quiet right-aligned month (spec §3.4): the filename's `YYYY-MM-`
 * date when it has one, else the file's mtime. */
export function monthLabel(matter: { path: string; mtimeMs: number }): string {
  const base = matter.path.slice(matter.path.lastIndexOf('/') + 1);
  const dated = /^\d{4}-(\d{2})/.exec(base);
  if (dated !== null) {
    const month = Number(dated[1]);
    if (month >= 1 && month <= 12) return MONTHS[month - 1]!;
  }
  return MONTHS[new Date(matter.mtimeMs).getMonth()]!;
}
