/**
 * A Word document as markdown — what the model reads, and what the reader
 * renders. Replaces `pandoc --track-changes=all -f docx -t markdown`, and
 * keeps its dialect for changes and comments (CriticMarkup: `{++ins++}`,
 * `{--del--}`, `{>>comment<<}`), so prompts written for pandoc's output keep
 * working. Where it differs from pandoc, it differs on purpose:
 *
 * - Word auto-numbering is RENDERED (`3.2` where Word shows `3.2`) from
 *   `numbering.xml`; pandoc dropped it, so a lawyer's "see 3.2" had nothing
 *   to point at.
 * - Anything the text views cannot carry — drawings, fields, footnote
 *   references — is dropped with a warning that names the paragraph, never
 *   silently.
 */
import { commentsOf, modelOf, type DocxComment, type DocxModel, type DocxParagraph, type DocxRun, type DocxTable } from './model';
import type { DocxPackage } from './package';

export type ChangesMode = 'all' | 'accept' | 'reject';

export interface MarkdownOptions {
  /** `all` (default) marks insertions and deletions inline; `accept` and
   * `reject` render one clean view. */
  changes?: ChangesMode;
  /** Render comments inline (default true). */
  comments?: boolean;
}

export interface MarkdownResult {
  markdown: string;
  warnings: string[];
}

const HEADING_STYLE = /^heading\s*(\d)$/i;

/**
 * The heading level a paragraph style carries: `Title` → 1, `Heading N` →
 * N (capped at 6); anything else is body text. When the document HAS a
 * Title, its headings shift one level down (`Heading 1` → `##`), so the
 * title is the single H1 and the sections read as sections — which is also
 * what the reader's outline column lists.
 */
export function headingLevel(style: string | null, hasTitle = false): number | null {
  if (style === null) return null;
  if (/^title$/i.test(style)) return 1;
  const m = HEADING_STYLE.exec(style);
  if (m === null) return null;
  return Math.min(6, Math.max(1, Number(m[1]) + (hasTitle ? 1 : 0)));
}

/** Runs grouped into segments by change kind, in order, dropped content
 * left out. */
function segmentsOf(runs: DocxRun[]): Array<{ kind: 'ins' | 'del' | null; text: string }> {
  const out: Array<{ kind: 'ins' | 'del' | null; text: string }> = [];
  for (const r of runs) {
    if (r.text === '') continue;
    const kind = r.change?.kind ?? null;
    const last = out[out.length - 1];
    if (last !== undefined && last.kind === kind) last.text += r.text;
    else out.push({ kind, text: r.text });
  }
  return out;
}

export function inlineText(p: DocxParagraph, mode: ChangesMode): string {
  const parts: string[] = [];
  for (const seg of segmentsOf(p.runs)) {
    if (seg.kind === null) parts.push(seg.text);
    else if (seg.kind === 'ins') {
      if (mode === 'all') parts.push(`{++${seg.text}++}`);
      else if (mode === 'accept') parts.push(seg.text);
    } else {
      if (mode === 'all') parts.push(`{--${seg.text}--}`);
      else if (mode === 'reject') parts.push(seg.text);
    }
  }
  return parts.join('');
}

function commentMark(c: DocxComment): string {
  const who = [c.author, c.date.slice(0, 10)].filter(s => s !== '').join(', ');
  return who === '' ? `{>>${c.text}<<}` : `{>>${c.text} (${who})<<}`;
}

function paragraphLine(p: DocxParagraph, mode: ChangesMode, comments: Map<string, DocxComment>, withComments: boolean): string {
  let text = inlineText(p, mode);
  if (p.numberLabel !== null && p.numberLabel !== '') {
    text = p.numberLabel === '•' ? `- ${text}` : `${p.numberLabel} ${text}`;
  }
  if (withComments) {
    for (const id of p.commentIds) {
      const c = comments.get(id);
      if (c !== undefined) text += ` ${commentMark(c)}`;
    }
  }
  return text;
}

function tableMarkdown(table: DocxTable, model: DocxModel, mode: ChangesMode, comments: Map<string, DocxComment>, withComments: boolean): string {
  const width = Math.max(1, ...table.rows.map(r => r.length));
  const cell = (paraIdx: number[]): string =>
    paraIdx
      .map(i => paragraphLine(model.paragraphs[i]!, mode, comments, withComments).trim())
      .filter(s => s !== '')
      .join('<br>')
      .replace(/\|/g, '\\|');
  const rows = table.rows.map(r => {
    const cells = r.map(cell);
    while (cells.length < width) cells.push('');
    return `| ${cells.join(' | ')} |`;
  });
  const sep = `| ${Array.from({ length: width }, () => '---').join(' | ')} |`;
  if (rows.length === 0) return '';
  return [rows[0]!, sep, ...rows.slice(1)].join('\n');
}

export function docxToMarkdown(pkg: DocxPackage, opts: MarkdownOptions = {}): MarkdownResult {
  const mode = opts.changes ?? 'all';
  const withComments = opts.comments ?? true;
  const model = modelOf(pkg);
  const comments = new Map(commentsOf(pkg).map(c => [c.id, c]));
  const warnings: string[] = [];
  const blocks: string[] = [];
  const renderedTables = new Set<number>();
  const hasTitle = model.paragraphs.some(p => p.style !== null && /^title$/i.test(p.style));

  for (const p of model.paragraphs) {
    for (const r of p.runs) {
      if (r.dropped !== null && (mode !== 'accept' || r.change?.kind !== 'del') && (mode !== 'reject' || r.change?.kind !== 'ins')) {
        warnings.push(`${p.location}: a ${r.dropped} was left out`);
      }
    }
    if (p.cell !== null) {
      if (renderedTables.has(p.cell.table)) continue;
      renderedTables.add(p.cell.table);
      const md = tableMarkdown(model.tables[p.cell.table]!, model, mode, comments, withComments);
      if (md !== '') blocks.push(md);
      continue;
    }
    const line = paragraphLine(p, mode, comments, withComments).trim();
    if (line === '') continue;
    const level = headingLevel(p.style, hasTitle);
    blocks.push(level === null ? line : `${'#'.repeat(level)} ${line}`);
  }

  return { markdown: blocks.join('\n\n') + (blocks.length > 0 ? '\n' : ''), warnings };
}
