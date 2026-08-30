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

/**
 * Words that carry no signal in a literal substring search but, under AND,
 * veto every file that happens not to spell them. Models do not send keyword
 * queries — they send questions ("what is our indemnity position"), and
 * `what`/`is`/`our` would each have to appear verbatim in the file.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'and', 'or', 'is', 'are',
  'what', 'our', 'my', 'your', 'with', 'by', 'at', 'this', 'that',
]);

const DEFAULT_MAX_HITS = 50;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const SNIPPET_CHARS = 200;

/** In the OR fallback, one more distinct term matched always outranks any
 * number of repetitions of a term already counted. Five mentions of one word
 * are weaker evidence than one mention each of two. */
const DISTINCT_TERM_WEIGHT = 1000;

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

/** A file that matched at least one term, with its per-term counts kept so the
 * AND and OR passes can both be scored from a single read of the file. */
interface Candidate {
  path: string;
  snippet: string;
  counts: number[];
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
 * Matching is AND-first, OR-as-fallback. AND keeps a deliberate query precise;
 * the fallback keeps a conversational one from returning nothing, which is the
 * exact failure this function was written to end. Stopwords are dropped before
 * either pass.
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
    const raw = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (raw.length === 0) return [];
    // Someone searching for `the` means it. Only drop stopwords when there is
    // something left to search for.
    const stripped = raw.filter(t => !STOPWORDS.has(t));
    const terms = stripped.length > 0 ? stripped : raw;

    const candidates: Candidate[] = [];

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
        const candidate = await scan(full);
        if (candidate) candidates.push(candidate);
      }
    }

    async function scan(full: string): Promise<Candidate | null> {
      let content: string;
      try {
        content = await readFile(full, 'utf8');
      } catch {
        return null; // Permissions, a race, a deleted file: skip it.
      }
      const path = relative(root, full).split(sep).join('/');
      const lowerPath = path.toLowerCase();
      const lowerContent = content.toLowerCase();

      // A term counts once for appearing anywhere in the path, plus once per
      // occurrence in the body.
      const counts = terms.map(term =>
        countOccurrences(lowerContent, term) + (lowerPath.includes(term) ? 1 : 0));
      if (counts.every(c => c === 0)) return null;

      return { path, snippet: snippetFor(content, path), counts };
    }

    function snippetFor(content: string, path: string): string {
      for (const line of content.split('\n')) {
        const lower = line.toLowerCase();
        if (terms.some(t => lower.includes(t))) return line.trim().slice(0, SNIPPET_CHARS);
      }
      // Matched on the path alone; the path is the only evidence there is.
      return path.slice(0, SNIPPET_CHARS);
    }

    function finish(matched: Candidate[], score: (c: Candidate) => number): Hit[] {
      return matched
        .map(c => ({ path: c.path, snippet: c.snippet, score: score(c) }))
        .sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
        .slice(0, maxHits);
    }

    const sum = (c: Candidate): number => c.counts.reduce((a, b) => a + b, 0);

    await walk(root);

    // AND first: if some file spells every word, a looser pass could only
    // bury it under files that spell one.
    const all = candidates.filter(c => c.counts.every(n => n > 0));
    if (all.length > 0) return finish(all, sum);

    // Nothing matched everything. Returning `[]` here is what taught a model
    // that an existing document did not exist, so answer with what did match,
    // ranked by how much of the query each file accounts for.
    return finish(candidates, c => c.counts.filter(n => n > 0).length * DISTINCT_TERM_WEIGHT + sum(c));
  };
}
