/**
 * The reader's client-side frontmatter split (spec §3.4: frontmatter as a
 * two-column dotted-leader block). Simple `key: value` lines only — nested
 * YAML is a structure, not a fact row, and the server's
 * `runtime/src/vault/overview.ts` owns real parsing.
 */

export interface FmRow {
  key: string;
  value: string;
}

export function splitFrontmatter(source: string): { rows: FmRow[]; body: string } {
  if (!/^---\r?\n/.test(source)) return { rows: [], body: source };
  const lines = source.split('\n');
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { rows: [], body: source };
  const rows: FmRow[] = [];
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.+)$/.exec(line);
    if (m !== null) rows.push({ key: m[1]!.replace(/_/g, ' '), value: m[2]!.trim() });
  }
  return { rows, body: lines.slice(end + 1).join('\n') };
}

/** Same rule as the server's `prettifyName` (`runtime/src/vault/overview.ts`)
 * — copied, not imported: `runtime/ui` must not pull `runtime/src` into a
 * browser bundle. A change there is a change here. */
export function prettifyName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}(-\d{2})?-/, '');
  const spaced = stem.replace(/[-_]+/g, ' ').trim();
  return spaced === '' ? fileName : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface ReaderModel {
  title: string;
  rows: FmRow[];
  /** The body with its first H1 removed — the reader draws the title
   * itself, in the dochead (spec §3.4). */
  body: string;
}

/** The first H1 OUTSIDE a code fence, with where it sits. A `# install`
 * line inside a fence is an example, not the document's title. */
function firstH1(body: string): { text: string; start: number; end: number } | null {
  let at = 0;
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^```/.test(line.trim())) fenced = !fenced;
    const m = fenced ? null : /^#\s+(.+)$/.exec(line);
    if (m !== null) return { text: m[1]!.trim(), start: at, end: at + line.length };
    at += line.length + 1;
  }
  return null;
}

export function readerModel(source: string, path: string): ReaderModel {
  const { rows, body } = splitFrontmatter(source);
  const fmTitle = rows.find(r => r.key === 'title')?.value;
  const h1 = firstH1(body);
  const title = fmTitle ?? h1?.text ?? prettifyName(path.slice(path.lastIndexOf('/') + 1));
  // Cut at the match's own offsets: a substring replace would delete an
  // earlier inline copy of the same text and leave the heading behind.
  const stripped = h1 === null ? body : (body.slice(0, h1.start) + body.slice(h1.end)).replace(/^\n+/, '');
  return { title, rows: rows.filter(r => r.key !== 'title'), body: stripped };
}
