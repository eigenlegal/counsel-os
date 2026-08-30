import { lstat, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import type { Hit } from '../core/types';
import { RESERVED_DIR, type SearchFn } from './fs-store';

/** Text formats a vault actually holds. Anything else (PDF, DOCX, images) is
 * bytes as far as a substring scan is concerned — reading it would burn the
 * file-size budget to produce mojibake matches. */
const DEFAULT_EXTENSIONS = ['.md', '.txt', '.json', '.yaml', '.yml', '.csv'];

/** Directories that are never a user's knowledge, at any depth. `.counsel/` is
 * the store's own bookkeeping (version history); dotfiles and dotdirs are
 * tooling; `node_modules` is a dependency tree someone checked into a matter. */
const SKIP_DIRS = new Set(['node_modules']);

const DEFAULT_MAX_HITS = 50;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const SNIPPET_CHARS = 200;

/** Non-overlapping occurrences of `term` in `haystack`; both already lowercased. */
function countOccurrences(haystack: string, term: string): number {
  let n = 0;
  let i = haystack.indexOf(term);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(term, i + term.length);
  }
  return n;
}

/**
 * A literal, whole-vault substring search — no index, no ranking model.
 *
 * It exists because the alternative shipped for months: every entry point
 * built `FsVaultStore` without a `search`, so `vault_search` returned `[]`
 * unconditionally and a live model concluded from an empty result that a
 * document the user had written did not exist. An empty answer and "no such
 * document" are indistinguishable to the caller, so a search that cannot find
 * anything is worse than no search tool at all.
 *
 * Scale note: a vault is a person's or a firm's document set, walked and read
 * per query. That is fine at thousands of files and wrong at millions; when it
 * stops being fine, the fix is an index behind this same `SearchFn` seam, not
 * a smarter walk.
 */
export function fsSearch(opts: { maxHits?: number; maxFileBytes?: number; extensions?: string[] } = {}): SearchFn {
  const maxHits = opts.maxHits ?? DEFAULT_MAX_HITS;
  const maxFileBytes = opts.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const extensions = new Set((opts.extensions ?? DEFAULT_EXTENSIONS).map(e => e.toLowerCase()));

  return async function search(query: string, root: string): Promise<Hit[]> {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const hits: Hit[] = [];

    async function walk(dir: string): Promise<void> {
      let names: string[];
      try {
        names = await readdir(dir);
      } catch {
        return; // Unreadable directory: skip it, never fail the whole search.
      }
      for (const name of names) {
        // `.counsel` is caught by the dot rule, but name it too: the ban is a
        // rule of its own and should not depend on the directory's spelling.
        if (name.startsWith('.') || name.toLowerCase() === RESERVED_DIR || SKIP_DIRS.has(name)) continue;
        const full = join(dir, name);
        let st;
        try {
          st = await lstat(full);
        } catch {
          continue;
        }
        // `lstat`, not `stat`: a symlink is never followed. A link inside the
        // vault pointing at `~/.ssh` would otherwise put its contents in a
        // snippet the model reads out loud.
        if (st.isSymbolicLink()) continue;
        if (st.isDirectory()) {
          await walk(full);
          continue;
        }
        if (!st.isFile()) continue;
        if (!extensions.has(extname(name).toLowerCase())) continue;
        if (st.size > maxFileBytes) continue;
        const hit = await scan(full);
        if (hit) hits.push(hit);
      }
    }

    async function scan(full: string): Promise<Hit | null> {
      let content: string;
      try {
        content = await readFile(full, 'utf8');
      } catch {
        return null; // Permissions, a race, a deleted file: skip it.
      }
      const path = relative(root, full).split(sep).join('/');
      const lowerPath = path.toLowerCase();
      const lowerContent = content.toLowerCase();

      let score = 0;
      for (const term of terms) {
        const inContent = countOccurrences(lowerContent, term);
        const inPath = lowerPath.includes(term) ? 1 : 0;
        // Every term must appear somewhere — in the body or in the path.
        // AND, not OR: a two-word query that matched either word would return
        // most of the vault and rank the answer out of the top hits.
        if (inContent === 0 && inPath === 0) return null;
        score += inContent + inPath;
      }

      return { path, snippet: snippetFor(content, path), score };
    }

    function snippetFor(content: string, path: string): string {
      for (const line of content.split('\n')) {
        const lower = line.toLowerCase();
        if (terms.some(t => lower.includes(t))) return line.trim().slice(0, SNIPPET_CHARS);
      }
      // Matched on the path alone; the path is the only evidence there is.
      return path.slice(0, SNIPPET_CHARS);
    }

    await walk(root);
    hits.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    return hits.slice(0, maxHits);
  };
}
