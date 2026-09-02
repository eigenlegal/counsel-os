/**
 * The shipped content — the law areas, the practice seed, the memory
 * template, the primitives, and the counsel skill — behind one interface,
 * so the prompt, the primitives tool and setup read the same files whether
 * the runtime runs from a checkout or as a compiled binary (spec §3).
 *
 * One flat namespace, keyed by REPO-RELATIVE path (`knowledge/law/corporate/
 * governance.md`, `primitives/draft.md`, `skills/counsel/SKILL.md`). The
 * roots below are the whole of what ships; a file outside them is not
 * content, whatever else the checkout holds.
 */

export const SHIPPED_ROOTS: readonly string[] = [
  'knowledge/law',
  'knowledge/practice-seed',
  'templates/memory',
  'primitives',
  'skills/counsel',
  // The retro method, read into a retro thread's system prompt (`retro/`).
  'skills/retro',
  // The synthetic NDA the sample matter is made of (spec 2026-09-01 §4).
  'skills/demo/assets',
];

/** Files under a shipped root that are documentation for maintainers, not
 * content a vault receives. */
export const NOT_CONTENT: ReadonlySet<string> = new Set(['knowledge/law/FRONTMATTER.md', 'knowledge/law/frontmatter-policy.json']);

export interface ContentSource {
  readonly kind: 'repo' | 'embedded';
  /** Every shipped file whose path starts with `prefix` (a root or a
   * directory under one), sorted. */
  list(prefix: string): string[];
  has(path: string): boolean;
  /** The file's text. Throws for a path the source does not ship. */
  read(path: string): string;
  /** The file's bytes — for the one shipped binary, the sample `.docx`. */
  readBytes(path: string): Uint8Array;
}

/** A path is shipped only if it sits under a shipped root and is plain:
 * no absolute, no `..`, no backslash, no leading `./`. */
export function isShippedPath(path: string): boolean {
  if (path === '' || path.startsWith('/') || path.includes('\\')) return false;
  const segments = path.split('/');
  if (segments.some(s => s === '' || s === '.' || s === '..')) return false;
  if (NOT_CONTENT.has(path)) return false;
  return SHIPPED_ROOTS.some(root => path === root || path.startsWith(`${root}/`));
}

/**
 * The seam the binary build wires (packaging spec §3.2): a compiled runtime
 * answers with the embedded source the generated entry registered, a
 * checkout with the repo source. A compiled binary whose entry registered
 * nothing is a build error and says so — never a silent fallback to a disk
 * that has nothing at the checkout's paths.
 */
export function contentSourceFor(opts: { compiled: boolean; pluginRoot: string; repo: (pluginRoot: string) => ContentSource; embedded?: () => ContentSource | null }): ContentSource {
  if (opts.compiled) {
    const embedded = opts.embedded?.() ?? null;
    if (embedded === null) throw new Error('this counsel-os binary has no embedded content — a build error; rebuild with `bun run build:runtime`');
    return embedded;
  }
  return opts.repo(opts.pluginRoot);
}
