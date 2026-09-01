/**
 * Tracked changes and comments out of a `.docx`, as structured data — the
 * inbound half of the redline pipeline. A port of
 * `scripts/extract_redlines.py`; the JSON is the same shape so the read
 * primitive's `--redline` mode and the evals that consume it are untouched.
 *
 * Each change record is one paragraph that carries tracked changes:
 *   paragraph_index   index over every paragraph in document order (null
 *                     for changes outside the body — see `location`)
 *   location          "body", or the part name (header1, footnotes, …)
 *   section_context   nearest preceding heading (style- or numbering-based)
 *   kind              insertion | deletion | replacement
 *   original          reject-all view of the paragraph
 *   revised           accept-all view of the paragraph
 *   inserted/deleted  the changed fragments
 *   authors, dates    from the w:ins/w:del attributes
 *   comment_ids       comments anchored in this paragraph
 */
import type { Element } from '@xmldom/xmldom';
import { attr, children, commentsOf, descendants, modelOf, runText, W_NS, type DocxParagraph } from './model';
import type { DocxPackage } from './package';
import { MalformedXmlError, UnsafeXmlError } from './safety';

export interface ChangeRecord {
  paragraph_index: number | null;
  location: string;
  section_context: string;
  kind: 'insertion' | 'deletion' | 'replacement';
  original: string;
  revised: string;
  inserted: string[];
  deleted: string[];
  authors: string[];
  dates: string[];
  comment_ids: string[];
}

export interface CommentRecord {
  id: string;
  author: string;
  date: string;
  text: string;
  paragraph_index: number | null;
  anchor_excerpt: string;
}

export interface ExtractResult {
  file: string;
  summary: {
    changed_paragraphs: number;
    inserted_fragments: number;
    deleted_fragments: number;
    non_body_insertions: number;
    non_body_deletions: number;
    comments: number;
    authors: string[];
  };
  warnings: string[];
  changes: ChangeRecord[];
  comments: Array<CommentRecord | { error: string }>;
}

/** Bare numbers need trailing punctuation ("7." / "7.2)") so address lines
 * and quantities do not register as headings; style detection is primary. */
export const HEADING_NUM_RE = /^\s*(ARTICLE\s+[IVXLC\d]+|Section\s+\d|\d+(\.\d+)*[.)]\s+\S)/i;

/** Parts that can carry tracked changes the body walk never reaches. */
const NONBODY_PART_RE = /^word\/(header\d*|footer\d*|footnotes|endnotes)\.xml$/;

const INS = new Set(['ins', 'moveTo']);
const DEL = new Set(['del', 'moveFrom']);

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function wrapperText(wrapper: Element): string {
  const parts: string[] = [];
  for (const node of descendants(wrapper)) {
    if (node.namespaceURI !== W_NS) continue;
    if (node.localName === 't' || node.localName === 'delText') parts.push(node.textContent ?? '');
    else if (node.localName === 'tab' || node.localName === 'br' || node.localName === 'cr') parts.push(' ');
  }
  return parts.join('');
}

/** Tracked changes in headers, footers, footnotes and endnotes: reported
 * as records with `paragraph_index: null` plus a warning per part, because
 * `apply_redlines` cannot edit those parts. */
function scanNonBody(pkg: DocxPackage): { records: ChangeRecord[]; warnings: string[]; ins: number; del: number } {
  const records: ChangeRecord[] = [];
  const warnings: string[] = [];
  let ins = 0;
  let del = 0;
  const names = pkg.partNames().filter(n => NONBODY_PART_RE.test(n)).sort();
  for (const name of names) {
    const label = name.slice('word/'.length, -'.xml'.length);
    let root: Element | null;
    try {
      root = pkg.part(name).documentElement;
    } catch (err) {
      // The Python skipped a part it could not parse. A DOCTYPE is refused
      // rather than parsed, and that is said out loud instead of dropped.
      if (err instanceof UnsafeXmlError) warnings.push(`${label}: refused — the part declares a DOCTYPE; review it directly.`);
      else if (!(err instanceof MalformedXmlError)) throw err;
      continue;
    }
    if (root === null) continue;
    let partIns = 0;
    let partDel = 0;
    for (const wrapper of descendants(root)) {
      if (wrapper.namespaceURI !== W_NS) continue;
      let kind: 'insertion' | 'deletion';
      if (INS.has(wrapper.localName ?? "")) kind = 'insertion';
      else if (DEL.has(wrapper.localName ?? "")) kind = 'deletion';
      else continue;
      const txt = wrapperText(wrapper).trim();
      if (txt === '') continue;
      const author = attr(wrapper, 'author');
      const date = attr(wrapper, 'date');
      if (kind === 'insertion') partIns += 1;
      else partDel += 1;
      records.push({
        paragraph_index: null,
        location: label,
        section_context: label,
        kind,
        original: kind === 'deletion' ? txt : '',
        revised: kind === 'insertion' ? txt : '',
        inserted: kind === 'insertion' ? [txt] : [],
        deleted: kind === 'deletion' ? [txt] : [],
        authors: author !== null ? [author] : [],
        dates: date !== null ? [date.slice(0, 10)] : [],
        comment_ids: [],
      });
    }
    if (partIns > 0 || partDel > 0) {
      warnings.push(
        `${label}: ${partIns} tracked insertion(s) and ${partDel} deletion(s) outside the document body — reported here, but apply_redlines cannot edit this part. Review it directly.`,
      );
      ins += partIns;
      del += partDel;
    }
  }
  return { records, warnings, ins, del };
}

function anchorExcerpt(p: DocxParagraph): string {
  // Every run's text, deleted ones included — the Python read `run_text`
  // over `p.iter(w:r)` for the excerpt.
  return p.runs
    .map(r => runText(r.element))
    .join('')
    .trim()
    .slice(0, 160);
}

export function extractRedlines(pkg: DocxPackage, file: string): ExtractResult {
  const model = modelOf(pkg);
  const changes: ChangeRecord[] = [];
  let sectionContext = '';
  const authorsAll = new Set<string>();
  let totalIns = 0;
  let totalDel = 0;

  for (const p of model.paragraphs) {
    const originalParts: string[] = [];
    const revisedParts: string[] = [];
    const inserted: string[] = [];
    const deleted: string[] = [];
    const authors = new Set<string>();
    const dates = new Set<string>();

    for (const r of p.runs) {
      const txt = r.text;
      if (txt === '') continue;
      if (r.change?.kind === 'ins') {
        revisedParts.push(txt);
        inserted.push(txt);
        if (r.change.author !== null) authors.add(r.change.author);
        if (r.change.date !== null) dates.add(r.change.date.slice(0, 10));
      } else if (r.change?.kind === 'del') {
        originalParts.push(txt);
        deleted.push(txt);
        if (r.change.author !== null) authors.add(r.change.author);
        if (r.change.date !== null) dates.add(r.change.date.slice(0, 10));
      } else {
        originalParts.push(txt);
        revisedParts.push(txt);
      }
    }

    const revised = revisedParts.join('').trim();
    const original = originalParts.join('').trim();

    const style = (p.style ?? '').toLowerCase();
    if (revised !== '' && (style.startsWith('heading') || HEADING_NUM_RE.test(revised))) sectionContext = revised.slice(0, 120);

    if (inserted.length === 0 && deleted.length === 0) continue;

    totalIns += inserted.length;
    totalDel += deleted.length;
    for (const a of authors) authorsAll.add(a);

    const kind: ChangeRecord['kind'] = inserted.length > 0 && deleted.length > 0 ? 'replacement' : inserted.length > 0 ? 'insertion' : 'deletion';
    changes.push({
      paragraph_index: p.index,
      location: 'body',
      section_context: sectionContext,
      kind,
      original,
      revised,
      inserted: kind === 'insertion' && inserted.length > 3 ? [inserted.join('')] : inserted,
      deleted: kind === 'deletion' && deleted.length > 3 ? [deleted.join('')] : deleted,
      authors: sortedUnique(authors),
      dates: sortedUnique(dates),
      comment_ids: p.commentIds,
    });
  }

  // Comments: anchored to the first paragraph that starts or references them.
  const anchorMap = new Map<string, number>();
  for (const p of model.paragraphs) {
    for (const node of descendants(p.element)) {
      if (node.namespaceURI !== W_NS) continue;
      if (node.localName === 'commentRangeStart' || node.localName === 'commentReference') {
        const id = attr(node, 'id');
        if (id !== null && !anchorMap.has(id)) anchorMap.set(id, p.index);
      }
    }
  }
  const comments: ExtractResult['comments'] = [];
  try {
    for (const c of commentsOf(pkg)) {
      const pidx = anchorMap.get(c.id) ?? null;
      comments.push({
        id: c.id,
        author: c.author,
        date: c.date.slice(0, 10),
        text: c.text,
        paragraph_index: pidx,
        anchor_excerpt: pidx === null ? '' : anchorExcerpt(model.paragraphs[pidx]!),
      });
    }
  } catch (err) {
    // Comments are supplementary — never fail the extraction.
    comments.push({ error: `comment extraction failed: ${err instanceof Error ? err.message : String(err)}` });
  }

  const bodyChangedParagraphs = changes.length;
  const nonBody = scanNonBody(pkg);
  changes.push(...nonBody.records);
  for (const rec of nonBody.records) for (const a of rec.authors) authorsAll.add(a);

  return {
    file,
    summary: {
      changed_paragraphs: bodyChangedParagraphs,
      inserted_fragments: totalIns,
      deleted_fragments: totalDel,
      non_body_insertions: nonBody.ins,
      non_body_deletions: nonBody.del,
      comments: comments.filter(c => !('error' in c)).length,
      authors: sortedUnique(authorsAll),
    },
    warnings: nonBody.warnings,
    changes,
    comments,
  };
}

/** The review table `--format markdown` printed. */
export function extractToMarkdown(data: ExtractResult, fullText = false): string {
  const cap = fullText ? null : 240;
  const trunc = (s: string | null | undefined): string => {
    const t = (s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    return cap === null || t.length <= cap ? t : `${t.slice(0, cap)}…`;
  };
  const name = data.file.slice(data.file.lastIndexOf('/') + 1);
  const out: string[] = [`# Redline extraction — ${name}`, ''];
  const s = data.summary;
  const nonbody = s.non_body_insertions + s.non_body_deletions;
  out.push(
    `**${s.changed_paragraphs} changed paragraphs** (${s.inserted_fragments} insertions, ${s.deleted_fragments} deletions), ${s.comments} comments. Authors: ${s.authors.join(', ') || '—'}.`,
  );
  if (data.warnings.length > 0 || nonbody > 0) {
    out.push('', '## ⚠ Warnings', '');
    for (const w of data.warnings) out.push(`- ${trunc(w)}`);
  }
  out.push('', '| # | Location | Section | Kind | Original | Revised | Author | Comments |', '|---|----------|---------|------|----------|---------|--------|----------|');
  for (const c of data.changes) {
    const idx = c.paragraph_index ?? '—';
    out.push(
      `| ${idx} | ${c.location} | ${trunc(c.section_context)} | ${c.kind} | ${trunc(c.original)} | ${trunc(c.revised)} | ${c.authors.join(', ')} | ${c.comment_ids.join(', ')} |`,
    );
  }
  const real = data.comments.filter((c): c is CommentRecord => !('error' in c));
  if (real.length > 0) {
    out.push('', '## Comments', '');
    for (const c of real) {
      out.push(`- **[${c.id}] ${c.author}** (${c.date}, ¶${c.paragraph_index}): ${trunc(c.text)}`);
      if (c.anchor_excerpt !== '') out.push(`  - anchored at: "${trunc(c.anchor_excerpt)}"`);
    }
  }
  return out.join('\n');
}
