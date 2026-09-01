import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Content hashing, byte-for-byte the algorithm of
 * `scripts/bump_content_versions.py`, so a hash the runtime computes agrees
 * with `.content-versions.json` and with what the plugin's `update` skill
 * compares against. Keep the two in lockstep: a change here is a change
 * there.
 */

/** The Python's `FRONTMATTER_RE`: `^---\s*\n(.*?\n)---\s*\n`, DOTALL. */
const FRONTMATTER_RE = /^---[ \t\r\f\v]*\n([\s\S]*?\n)---[ \t\r\f\v]*\n/;

/** The text after a leading `--- … ---` YAML block, or the text unchanged. */
export function stripFrontmatter(text: string): string {
  const m = FRONTMATTER_RE.exec(text);
  return m === null ? text : text.slice(m[0].length);
}

/** SHA-256 of one file's frontmatter-stripped body. */
export function bodyHash(text: string): string {
  return createHash('sha256').update(stripFrontmatter(text), 'utf8').digest('hex');
}

/**
 * The group hash of a directory: every top-level `*.md`, sorted by name,
 * each contributing `--- <name> ---\n` then its stripped body to ONE digest.
 * Nested directories are not descended into (the Python's `glob("*.md")`).
 */
export function groupHash(dir: string, readFile: (path: string) => string = p => readFileSync(p, 'utf8')): string {
  const hasher = createHash('sha256');
  const names = readdirSync(dir).filter(name => name.endsWith('.md')).sort();
  for (const name of names) {
    hasher.update(`--- ${name} ---\n`, 'utf8');
    hasher.update(stripFrontmatter(readFile(join(dir, name))), 'utf8');
  }
  return hasher.digest('hex');
}
