/**
 * What the compiled binary carries that a checkout reads from disk (spec
 * 2026-09-01 packaging §3.2): the built UI, the shipped content, and the
 * few extra files the runtime reads at start that are not content.
 *
 * The generated modules under `runtime/src/generated/` (git-ignored; written
 * by `bun run build:runtime`) import every embedded file with
 * `with { type: 'file' }` and REGISTER here from the binary's generated entry
 * before `cli.ts` runs. Nothing in the checkout imports a generated file, so
 * the checkout type-checks and tests without a build, and the registry is
 * simply empty there: every reader asks it first and falls back to disk.
 */
import type { ContentSource } from '../content/source';

export interface EmbeddedUi {
  /** Request path relative to the dist root (`index.html`,
   * `assets/index-abc.js`) → the embedded file's path (`$bunfs`). */
  files: Record<string, string>;
}

export interface Embedded {
  ui: EmbeddedUi | null;
  content: ContentSource | null;
  /** Shipped files that are read at start but are not content — today
   * only `knowledge/law/frontmatter-policy.json` (doctor's cadences). Keyed
   * by repo-relative path → embedded file path. */
  extras: Record<string, string>;
}

const registry: Embedded = { ui: null, content: null, extras: {} };

/** Called once, by the generated entry, before anything else runs. */
export function registerEmbedded(next: Partial<Embedded>): void {
  if (next.ui !== undefined) registry.ui = next.ui;
  if (next.content !== undefined) registry.content = next.content;
  if (next.extras !== undefined) registry.extras = { ...registry.extras, ...next.extras };
}

/** Tests only: back to the checkout's empty registry. */
export function resetEmbeddedForTests(): void {
  registry.ui = null;
  registry.content = null;
  registry.extras = {};
}

export function embeddedUi(): EmbeddedUi | null {
  return registry.ui;
}

export function embeddedContent(): ContentSource | null {
  return registry.content;
}

export function embeddedExtra(path: string): string | null {
  return registry.extras[path] ?? null;
}

/** Bun's virtual root for a compiled binary's own files: `/$bunfs/root` on
 * POSIX, `B:\~BUN\root` on Windows. `import.meta.dir` of this module lives
 * there when compiled and nowhere else. */
function inBunfs(dir: string): boolean {
  return dir.startsWith('/$bunfs/') || dir.startsWith('B:\\~BUN\\');
}

/**
 * Running as the compiled `counsel-os` binary (rather than `bun cli.ts`).
 * True when the generated entry registered the embedded set — the
 * authoritative signal — or when this module itself lives in `$bunfs` (a
 * compiled binary whose entry forgot to register, which the readers below
 * then treat as a build error rather than falling back to a disk that has
 * nothing at the checkout's paths).
 */
export function isCompiled(): boolean {
  return registry.content !== null || registry.ui !== null || inBunfs(import.meta.dir);
}
