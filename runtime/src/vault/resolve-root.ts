import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Port of `scripts/resolve_legal_root.sh` — the canonical, non-interactive
 * Counsel OS legal-root discovery algorithm. Keep this in lockstep with the
 * shell script; it owns the search order, the "marked root" rule, the depth
 * limits, and the conventional-paths list.
 */

export interface ResolveRootOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  home?: string;
  /** Overrides the conventional vault locations scanned in step 4. */
  conventional?: string[];
}

export type ResolveRootResult = { ok: true; root: string } | { ok: false; code: 1 | 2; candidates: string[] };

export interface VaultConfig {
  entitiesPath: string;
  mattersPath: string;
  /** `auto_apply_law_updates: true` — law `update-available` items are
   * applied at serve start without a person (spec 2026-09-01 §6). Never
   * touches a user-owned file. */
  autoApplyLawUpdates: boolean;
  /** `law_management: user` — the user owns ALL law content; the runtime
   * never syncs it (the plugin's `law-refresh` maintains it). */
  lawManagement: 'plugin' | 'user';
  /** `retro_cadence_days: 60` — how often the practice retro is due. Absent
   * → the retro module's default (quarterly). Optional so the many literal
   * `VaultConfig`s in tests stay as they are. */
  retroCadenceDays?: number;
  /** `default_locality: local` — every matter stays on this machine unless
   * its own frontmatter says `stays_local: false` (providers spec §7).
   * Absent → `any`. Optional so the literal `VaultConfig`s in tests stay. */
  defaultLocality?: 'local' | 'any';
}

const CWD_WALK_MAX_DEPTH = 3;
const CONVENTIONAL_SCAN_MAX_DEPTH = 3;

/** The conventional local vault locations, verbatim from resolve_legal_root.sh's `known_roots`. */
function defaultConventionalRoots(home: string): string[] {
  return [
    join(home, 'Documents', 'Obsidian Vault'),
    join(home, 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents'),
    join(home, 'Dropbox', 'Obsidian'),
    join(home, 'legal'),
    join(home, 'counsel-os'),
    join(home, 'Documents', 'Counsel OS'),
  ];
}

/** A marked legal root is a directory containing config.md with both
 * `counsel-os-config: true` and a `legal_root:` line — mirrors `is_marked_root`. */
export function isMarkedRoot(root: string): boolean {
  let stat;
  try {
    stat = statSync(root);
  } catch {
    return false;
  }
  if (!stat.isDirectory()) return false;

  let text: string;
  try {
    text = readFileSync(join(root, 'config.md'), 'utf8');
  } catch {
    return false;
  }
  const lines = text.split('\n');
  const hasConfigMarker = lines.some(l => l === 'counsel-os-config: true');
  const hasLegalRoot = lines.some(l => l.startsWith('legal_root:'));
  return hasConfigMarker && hasLegalRoot;
}

/** Finds config.md files under `base`, up to `maxDepth` levels deep —
 * mirrors `find "$base" -maxdepth <maxDepth> -type f -name config.md`. */
function findConfigFiles(base: string, maxDepth: number): string[] {
  const results: string[] = [];
  const walk = (dir: string, depth: number) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isFile() && entry.name === 'config.md') {
        results.push(full);
      } else if (entry.isDirectory() && depth < maxDepth) {
        walk(full, depth + 1);
      }
    }
  };
  walk(base, 1);
  return results;
}

/**
 * Every marked legal root the machine-wide search can see — the env var,
 * the pointer, and the conventional locations — without the current
 * working directory (a server's cwd says nothing about a lawyer's vault).
 * What the first-run screen lists (spec 2026-09-01 §4). Sorted, deduped.
 */
export function findMarkedRoots(opts: Omit<ResolveRootOptions, 'cwd'> = {}): string[] {
  const env = opts.env ?? process.env;
  const home = opts.home ?? env.HOME ?? homedir();
  const conventional = opts.conventional ?? defaultConventionalRoots(home);
  const found = new Set<string>();
  const envRoot = env.COUNSEL_OS_LEGAL_ROOT;
  if (envRoot && isMarkedRoot(envRoot)) found.add(envRoot);
  const pointerPath = join(home, '.counsel-os', 'legal-root');
  if (existsSync(pointerPath)) {
    let pointer = '';
    try {
      pointer = readFileSync(pointerPath, 'utf8').replace(/\n/g, '');
    } catch {
      pointer = '';
    }
    if (pointer && isMarkedRoot(pointer)) found.add(pointer);
  }
  for (const base of conventional) {
    let baseStat;
    try {
      baseStat = statSync(base);
    } catch {
      continue;
    }
    if (!baseStat.isDirectory()) continue;
    for (const configPath of findConfigFiles(base, CONVENTIONAL_SCAN_MAX_DEPTH)) {
      const root = dirname(configPath);
      if (isMarkedRoot(root)) found.add(root);
    }
  }
  return [...found].sort();
}

/**
 * Resolves the Counsel OS legal root using the same search order as
 * `scripts/resolve_legal_root.sh`:
 *   1. COUNSEL_OS_LEGAL_ROOT, when set — resolves immediately either way
 *      (ok if marked, code 1 if not; no fallthrough to later steps).
 *   2. ~/.counsel-os/legal-root pointer, when present and marked — resolves
 *      immediately; an unmarked or empty pointer falls through.
 *   3. The current working directory and up to three parents.
 *   4. Conventional local vault locations, scanning up to three levels deep.
 *
 * Exit-code contract (mirrors the script's 0/1/2):
 *   ok:true          — exactly one marked legal root was found.
 *   ok:false, code:1  — no marked legal root was found, or
 *                        COUNSEL_OS_LEGAL_ROOT pointed at an invalid root.
 *   ok:false, code:2  — multiple marked legal roots were found; `candidates`
 *                        lists them.
 */
export function resolveLegalRoot(opts: ResolveRootOptions = {}): ResolveRootResult {
  const env = opts.env ?? process.env;
  const cwd = opts.cwd ?? process.cwd();
  const home = opts.home ?? env.HOME ?? homedir();
  const conventional = opts.conventional ?? defaultConventionalRoots(home);

  const envRoot = env.COUNSEL_OS_LEGAL_ROOT;
  if (envRoot) {
    if (isMarkedRoot(envRoot)) return { ok: true, root: envRoot };
    return { ok: false, code: 1, candidates: [] };
  }

  const pointerPath = join(home, '.counsel-os', 'legal-root');
  if (existsSync(pointerPath)) {
    let pointer = '';
    try {
      pointer = readFileSync(pointerPath, 'utf8').replace(/\n/g, '');
    } catch {
      pointer = '';
    }
    if (pointer && isMarkedRoot(pointer)) return { ok: true, root: pointer };
  }

  const matches: string[] = [];
  const addMatch = (root: string) => {
    if (isMarkedRoot(root) && !matches.includes(root)) matches.push(root);
  };

  let dir = cwd;
  let depth = 0;
  while (dir !== '/' && depth <= CWD_WALK_MAX_DEPTH) {
    addMatch(dir);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
    depth++;
  }

  for (const base of conventional) {
    if (!existsSync(base)) continue;
    let baseStat;
    try {
      baseStat = statSync(base);
    } catch {
      continue;
    }
    if (!baseStat.isDirectory()) continue;
    for (const configPath of findConfigFiles(base, CONVENTIONAL_SCAN_MAX_DEPTH)) {
      addMatch(dirname(configPath));
    }
  }

  if (matches.length === 1) return { ok: true, root: matches[0]! };
  if (matches.length > 1) return { ok: false, code: 2, candidates: matches };
  return { ok: false, code: 1, candidates: [] };
}

/** Reads `entities_path` / `matters_path` overrides from `{root}/config.md`,
 * defaulting to `entities` / `matters` when unset or config.md is missing. */
export function readVaultConfig(root: string): VaultConfig {
  let text = '';
  try {
    text = readFileSync(join(root, 'config.md'), 'utf8');
  } catch {
    text = '';
  }
  const lines = text.split('\n');
  const findOverride = (key: string): string | undefined => {
    const prefix = `${key}:`;
    for (const line of lines) {
      // Trim a trailing slash — `entities_path: entities/` and
      // `entities_path: entities` must resolve to the same prefix; a stray
      // slash otherwise turns `isKnowledgePath`'s `${entitiesPath}/` prefix
      // into `entities//`, which matches nothing.
      if (line.startsWith(prefix)) return line.slice(prefix.length).trim().replace(/\/+$/, '');
    }
    return undefined;
  };

  const flag = (raw: string | undefined): string => (raw ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase();
  // A cadence must be a positive whole number of days; anything else is
  // ignored rather than turned into a surprising schedule.
  const cadence = Number(flag(findOverride('retro_cadence_days')));
  return {
    entitiesPath: findOverride('entities_path') || 'entities',
    mattersPath: findOverride('matters_path') || 'matters',
    autoApplyLawUpdates: flag(findOverride('auto_apply_law_updates')) === 'true',
    lawManagement: flag(findOverride('law_management')) === 'user' ? 'user' : 'plugin',
    ...(Number.isInteger(cadence) && cadence > 0 ? { retroCadenceDays: cadence } : {}),
    ...(flag(findOverride('default_locality')) === 'local' ? { defaultLocality: 'local' as const } : {}),
  };
}
