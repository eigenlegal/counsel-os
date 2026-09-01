/**
 * Two-document compare → native tracked changes (spec §4.9), replacing
 * Word Compare for the one job it still had: a counterparty returns a
 * clean revised draft with no edit list, and the lawyer wants a redline
 * against the original.
 *
 * The paragraphs of both documents (their accept-all views) are aligned the
 * way `diff_rounds` aligns rounds — whitespace-normalized similarity with
 * fuzzy pairing inside replace blocks — then each paired paragraph that
 * differs gets the word-level tracked regions `apply_redlines` writes, a
 * paragraph with no counterpart is struck (its runs into `w:del`, its
 * paragraph mark marked deleted), and a paragraph only the revised document
 * has is inserted after its predecessor (its runs inside `w:ins`, its mark
 * marked inserted). The result is written INTO a copy of the original, so
 * accepting all changes in Word yields the revised text and rejecting them
 * yields the original.
 *
 * Paragraphs inside tables are compared in place but never inserted or
 * deleted — a row cannot be conjured from a paragraph — and such a paragraph
 * with no counterpart is reported as skipped.
 */
import type { Document, Element } from '@xmldom/xmldom';
import { revisionDate } from './comments';
import { computeReplacementRegions } from './diff';
import { children, isW, modelOf, W_NS, type DocxParagraph } from './model';
import { DOCUMENT_PART, type DocxPackage } from './package';
import { editableRuns, paragraphEditText, revisionElement, revisionIdAllocator, trackedReplaceInParagraph, truncate, type RedlineResult } from './redline';
import { align, norm } from './rounds';

export interface CompareOptions {
  author: string;
  now?: Date;
}

export interface CompareResult extends RedlineResult {
  paragraphs: {
    /** Paragraphs matched across the two documents. */
    paired: number;
    changed: number;
    inserted: number;
    deleted: number;
    unchanged: number;
  };
}

const TABLE_REASON = 'Paragraph inside a table has no counterpart in the other document; table rows are compared in place, never inserted or deleted';
const NESTED_REASON =
  'Changed text lies inside a hyperlink or an existing tracked insertion; nested revision markup is not supported — accept or reject the original document\'s revisions first';

function w(doc: Document, local: string): Element {
  return doc.createElementNS(W_NS, `w:${local}`);
}

/** Marks the paragraph MARK inserted or deleted (`w:pPr/w:rPr/w:ins|del`),
 * so accepting the change adds or removes the paragraph itself, not only
 * its text. */
function markParagraph(p: Element, tag: 'ins' | 'del', author: string, when: string, alloc: () => number): void {
  const doc = p.ownerDocument as Document;
  let pPr = children(p).find(c => isW(c, 'pPr')) ?? null;
  if (pPr === null) {
    pPr = w(doc, 'pPr');
    p.insertBefore(pPr, p.firstChild);
  }
  let rPr = children(pPr).find(c => isW(c, 'rPr')) ?? null;
  if (rPr === null) {
    rPr = w(doc, 'rPr');
    pPr.appendChild(rPr);
  }
  rPr.appendChild(revisionElement(doc, tag, author, when, alloc));
}

/** A paragraph the revised document has and the original does not: its
 * paragraph properties and runs cloned into the original, runs under one
 * `w:ins`, the mark marked inserted. */
function insertedParagraph(target: Document, source: Element, author: string, when: string, alloc: () => number): Element {
  const p = w(target, 'p');
  const pPr = children(source).find(c => isW(c, 'pPr'));
  if (pPr !== undefined) {
    const imported = target.importNode(pPr, true) as Element;
    // The source's own paragraph-mark revisions do not travel.
    for (const rPr of children(imported)) if (isW(rPr, 'rPr')) for (const c of [...children(rPr)]) if (isW(c, 'ins') || isW(c, 'del')) rPr.removeChild(c);
    p.appendChild(imported);
  }
  const ins = revisionElement(target, 'ins', author, when, alloc);
  for (const r of editableRuns(source)) ins.appendChild(target.importNode(r, true));
  p.appendChild(ins);
  markParagraph(p, 'ins', author, when, alloc);
  return p;
}

function bodyOf(pkg: DocxPackage): Element {
  const root = pkg.document.documentElement;
  if (root === null) throw new Error('word/document.xml has no root');
  for (const c of children(root)) if (isW(c, 'body')) return c;
  throw new Error('word/document.xml has no w:body');
}

/**
 * Writes the revised document's differences into `original` as tracked
 * changes attributed to `author`. Returns the `apply_redlines`-shaped report
 * (one `applied` entry per paragraph changed, inserted or deleted, by
 * location) plus the paragraph tally.
 */
export function compareDocuments(original: DocxPackage, revised: DocxPackage, opts: CompareOptions): CompareResult {
  const now = opts.now ?? new Date();
  const when = revisionDate(now);
  const alloc = revisionIdAllocator(original);
  const oModel = modelOf(original);
  const rModel = modelOf(revised);
  const oTexts = oModel.paragraphs.map(p => paragraphEditText(p.element));
  const rTexts = rModel.paragraphs.map(p => paragraphEditText(p.element));
  const pairs = align(oTexts.map(norm), rTexts.map(norm));

  const result: CompareResult = {
    applied: [],
    skipped: [],
    warnings: [],
    tracked: true,
    stats: { regions: 0, comments: 0, paragraphs: 0 },
    notes: [],
    paragraphs: { paired: 0, changed: 0, inserted: 0, deleted: 0, unchanged: 0 },
  };
  let index = 0;
  const body = bodyOf(original);
  const doc = original.document;
  /** The last original body-level paragraph handled, where an insertion goes after. */
  let cursor: { element: Element; location: string } | null = null;
  const firstBodyParagraph = oModel.paragraphs.find(p => p.cell === null)?.element ?? null;
  const bodyLevel = (p: DocxParagraph): boolean => p.cell === null;

  for (const [i, j] of pairs) {
    if (i !== null && j !== null) {
      const o = oModel.paragraphs[i]!;
      const oText = oTexts[i]!;
      const rText = rTexts[j]!;
      result.paragraphs.paired += 1;
      if (oText === rText) {
        result.paragraphs.unchanged += 1;
      } else {
        const status = trackedReplaceInParagraph(o.element, oText, rText, 0, opts.author, when, alloc);
        if (status === 'ok') {
          result.applied.push({ index, location: o.location, occurrence: 0 });
          result.stats.regions += computeReplacementRegions(oText, rText).length;
          result.paragraphs.changed += 1;
        } else {
          result.skipped.push({ index, current: truncate(oText), reason: status === 'nested' ? NESTED_REASON : 'Text at the resolved location changed before this edit was applied' });
        }
        index += 1;
      }
      if (bodyLevel(o)) cursor = { element: o.element, location: o.location };
    } else if (i !== null) {
      const o = oModel.paragraphs[i]!;
      const oText = oTexts[i]!;
      if (!bodyLevel(o)) {
        result.skipped.push({ index, current: truncate(oText), reason: TABLE_REASON });
        index += 1;
        continue;
      }
      let status: 'ok' | 'not_found' | 'nested' = 'ok';
      if (oText !== '') status = trackedReplaceInParagraph(o.element, oText, '', 0, opts.author, when, alloc);
      if (status === 'ok') {
        markParagraph(o.element, 'del', opts.author, when, alloc);
        result.applied.push({ index, location: o.location, occurrence: 0 });
        result.stats.regions += oText === '' ? 0 : 1;
        result.paragraphs.deleted += 1;
      } else {
        result.skipped.push({ index, current: truncate(oText), reason: NESTED_REASON });
      }
      index += 1;
      cursor = { element: o.element, location: o.location };
    } else if (j !== null) {
      const r = rModel.paragraphs[j]!;
      const rText = rTexts[j]!;
      if (!bodyLevel(r)) {
        result.skipped.push({ index, current: truncate(rText), reason: TABLE_REASON });
        index += 1;
        continue;
      }
      const p = insertedParagraph(doc, r.element, opts.author, when, alloc);
      if (cursor !== null) cursor.element.parentNode!.insertBefore(p, cursor.element.nextSibling);
      else if (firstBodyParagraph !== null) firstBodyParagraph.parentNode!.insertBefore(p, firstBodyParagraph);
      else {
        const sectPr = children(body).find(c => isW(c, 'sectPr')) ?? null;
        body.insertBefore(p, sectPr);
      }
      const location: string = cursor === null ? 'body[start]' : `after ${cursor.location}`;
      result.applied.push({ index, location, occurrence: 0 });
      result.stats.regions += 1;
      result.paragraphs.inserted += 1;
      index += 1;
      cursor = { element: p, location };
    }
  }

  result.stats.paragraphs = result.paragraphs.changed + result.paragraphs.inserted + result.paragraphs.deleted;
  if (result.applied.length > 0) original.touch(DOCUMENT_PART);
  return result;
}

/** `<original>-compare-<YYYY-MM-DD>.docx` beside the original; `n` is the
 * `-2`, `-3` … suffix (1 = none). */
export function compareOutputName(original: string, now: Date, n = 1): string {
  const stem = original.replace(/\.docx$/i, '');
  const date = now.toISOString().slice(0, 10);
  return `${stem}-compare-${date}${n > 1 ? `-${n}` : ''}.docx`;
}
