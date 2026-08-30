import { lstat, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import type { Hit } from '../core/types';
import { RESERVED_DIR, type SearchFn } from './fs-store';

/** Text formats a vault actually holds. Anything else (PDF, DOCX, images) is
 * bytes as far as a substring scan is concerned — reading it would burn the
 * file-size budget to produce mojibake matches. Their FILENAMES are still
 * searched: in a legal vault the signed PDFs are most of the documents, and
 * `MSA-indemnity-signed.pdf` is the most reliable metadata there is. */
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
 *
 * The list is deliberately short. It is a cheap first cut; the real defence
 * against conversational filler is the idf weighting below, which does not
 * need to know a word in advance to discount it.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'and', 'or', 'is', 'are',
  'what', 'our', 'my', 'your', 'with', 'by', 'at', 'this', 'that',
]);

const DEFAULT_MAX_HITS = 50;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const SNIPPET_CHARS = 200;
/** How much of a file's head is inspected for NUL bytes before deciding it is
 * binary. A text file has none; a mislabelled `.txt` of raw bytes has one
 * almost immediately. */
const BINARY_SNIFF_BYTES = 1024;

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
 * exact failure this function was written to end. Both passes are ranked by
 * the same idf-weighted score, so `Hit.score` means one thing regardless of
 * which pass produced it.
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
    // Split on every run of non-alphanumerics, so `indemnity?`, `"indemnity
    // cap"` and `indemnity.` all reduce to the words a model meant. Matching
    // is a literal substring test, so punctuation welded to a token was a
    // silently different term — and a question mark is the single most likely
    // character at the end of a natural-language query.
    const raw = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (raw.length === 0) return [];
    // Someone searching for `the` means it. Only drop stopwords when there is
    // something left to search for.
    const stripped = raw.filter(t => !STOPWORDS.has(t));
    // Deduplicated: repeating a word in the query is not evidence about a file.
    const terms = [...new Set(stripped.length > 0 ? stripped : raw)];

    const candidates: Candidate[] = [];
    let filesScanned = 0;

    async function walk(dir: string): Promise<void> {
      let names: string[];
      try {
        names = await readdir(dir);
      } catch {
        return; // Unreadable or missing directory: skip it, never fail the search.
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
        filesScanned++;
        // The extension and size gates decide whether the CONTENT is read.
        // The file is scanned either way, so its path can still match.
        const readContent = extensions.has(extname(name).toLowerCase()) && st.size <= maxFileBytes;
        const candidate = await scan(full, readContent);
        if (candidate) candidates.push(candidate);
      }
    }

    async function scan(full: string, readContent: boolean): Promise<Candidate | null> {
      const path = relative(root, full).split(sep).join('/');
      const lowerPath = path.toLowerCase();
      const content = readContent ? await readText(full) : '';
      const lowerContent = content.toLowerCase();

      // A term counts once for appearing anywhere in the path, plus once per
      // occurrence in the body.
      const counts = terms.map(term =>
        countOccurrences(lowerContent, term) + (lowerPath.includes(term) ? 1 : 0));
      if (counts.every(c => c === 0)) return null;

      return { path, snippet: snippetFor(content, path), counts };
    }

    async function readText(full: string): Promise<string> {
      let buf: Buffer;
      try {
        buf = await readFile(full);
      } catch {
        return ''; // Permissions, a race, a deleted file: fall back to the path.
      }
      // `readFile(…, 'utf8')` does not throw on invalid UTF-8; it substitutes
      // replacement characters, which reach the model as a snippet of noise.
      // A NUL in the head is the cheap, reliable binary tell.
      if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0)) return '';
      return buf.toString('utf8');
    }

    function snippetFor(content: string, path: string): string {
      for (const line of content.split('\n')) {
        const lower = line.toLowerCase();
        // `.trim()` before `.slice()` also drops the `\r` of a CRLF file.
        if (terms.some(t => lower.includes(t))) return line.trim().slice(0, SNIPPET_CHARS);
      }
      // Matched on the path alone — a PDF, or a text file whose name carries
      // the term. The path is the only evidence there is.
      return path.slice(0, SNIPPET_CHARS);
    }

    await walk(root);

    // Rarity beats repetition. Weighting every term equally let four
    // conversational words ("how do we handle") outrank the one file that
    // actually said "indemnity"; idf discounts a word that half the vault
    // spells, without needing a stopword list to name it in advance.
    const df = terms.map((_, i) => candidates.reduce((n, c) => n + (c.counts[i]! > 0 ? 1 : 0), 0));
    const idf = df.map(d => Math.log(1 + filesScanned / Math.max(d, 1)));
    // Occurrences count, but with a logarithm: the tenth mention of a word is
    // not ten times the evidence of the first.
    const scoreOf = (c: Candidate): number => c.counts.reduce(
      (sum, n, i) => n > 0 ? sum + idf[i]! * (1 + Math.log(n)) : sum, 0);

    const finish = (matched: Candidate[]): Hit[] => matched
      .map(c => ({ path: c.path, snippet: c.snippet, score: scoreOf(c) }))
      .sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
      .slice(0, maxHits);

    // AND first: if some file spells every word, a looser pass could only
    // bury it under files that spell one.
    const all = candidates.filter(c => c.counts.every(n => n > 0));
    if (all.length > 0) return finish(all);

    // Nothing matched everything. Returning `[]` here is what taught a model
    // that an existing document did not exist, so answer with what did match.
    return finish(candidates);
  };
}
