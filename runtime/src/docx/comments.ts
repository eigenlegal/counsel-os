/**
 * Word comments, written the way python-docx 1.2's comments API wrote them
 * for `apply_redlines.py`: the `word/comments.xml` part (created on first
 * use, with its content-type override and the document relationship), one
 * `w:comment` per note, and the three anchors in the paragraph —
 * `w:commentRangeStart` before the first run, `w:commentRangeEnd` after the
 * last, then a run carrying `w:commentReference`.
 */
import type { Document, Element } from '@xmldom/xmldom';
import { attr, children, descendants, isW, W_NS } from './model';
import { COMMENTS_PART, DOCUMENT_PART, type DocxPackage } from './package';

const CONTENT_TYPES_PART = '[Content_Types].xml';
const DOCUMENT_RELS_PART = 'word/_rels/document.xml.rels';
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const COMMENTS_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml';
const COMMENTS_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const EMPTY_COMMENTS = `${XML_DECL}<w:comments xmlns:w="${W_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"></w:comments>`;
const EMPTY_RELS = `${XML_DECL}<Relationships xmlns="${REL_NS}"></Relationships>`;

/** `Jack Wang` → `JW`, as the Python built it: the first letter of every word. */
export function initialsOf(author: string): string {
  return author
    .split(/\s+/)
    .filter(w => w !== '')
    .map(w => w[0]!)
    .join('')
    .toUpperCase();
}

/** The current run of the `w:date` attribute: UTC to the second, `Z`. */
export function revisionDate(now: Date): string {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function ensureContentType(pkg: DocxPackage): void {
  const doc = pkg.part(CONTENT_TYPES_PART);
  const root = doc.documentElement;
  if (root === null) throw new Error(`${CONTENT_TYPES_PART} has no root`);
  for (const c of children(root)) {
    if (c.localName === 'Override' && c.getAttribute('PartName') === `/${COMMENTS_PART}`) return;
  }
  const override = doc.createElementNS(CT_NS, 'Override');
  override.setAttribute('PartName', `/${COMMENTS_PART}`);
  override.setAttribute('ContentType', COMMENTS_CONTENT_TYPE);
  root.appendChild(override);
  pkg.touch(CONTENT_TYPES_PART);
}

function ensureRelationship(pkg: DocxPackage): void {
  if (!pkg.hasPart(DOCUMENT_RELS_PART)) pkg.setPart(DOCUMENT_RELS_PART, EMPTY_RELS);
  const doc = pkg.part(DOCUMENT_RELS_PART);
  const root = doc.documentElement;
  if (root === null) throw new Error(`${DOCUMENT_RELS_PART} has no root`);
  let maxId = 0;
  for (const c of children(root)) {
    if (c.localName !== 'Relationship') continue;
    if (c.getAttribute('Type') === COMMENTS_REL_TYPE) return;
    const m = /^rId(\d+)$/.exec(c.getAttribute('Id') ?? '');
    if (m !== null) maxId = Math.max(maxId, Number(m[1]));
  }
  const rel = doc.createElementNS(REL_NS, 'Relationship');
  rel.setAttribute('Id', `rId${maxId + 1}`);
  rel.setAttribute('Type', COMMENTS_REL_TYPE);
  rel.setAttribute('Target', 'comments.xml');
  root.appendChild(rel);
  pkg.touch(DOCUMENT_RELS_PART);
}

/** The comments part as a DOM, created (with its plumbing) when absent. */
export function ensureCommentsPart(pkg: DocxPackage): Document {
  if (!pkg.hasPart(COMMENTS_PART)) {
    pkg.setPart(COMMENTS_PART, EMPTY_COMMENTS);
    ensureContentType(pkg);
    ensureRelationship(pkg);
  }
  return pkg.part(COMMENTS_PART);
}

function nextCommentId(commentsRoot: Element): number {
  let max = -1;
  for (const c of children(commentsRoot)) {
    if (!isW(c, 'comment')) continue;
    const id = Number(attr(c, 'id'));
    if (Number.isInteger(id)) max = Math.max(max, id);
  }
  return max + 1;
}

function w(doc: Document, local: string): Element {
  return doc.createElementNS(W_NS, `w:${local}`);
}

/** `w:comment`, python-docx's shape: a `CommentText` paragraph opening with
 * the `w:annotationRef` run, then the text — one paragraph per line. */
function buildComment(doc: Document, id: number, text: string, author: string, date: string): Element {
  const comment = w(doc, 'comment');
  comment.setAttributeNS(W_NS, 'w:id', String(id));
  comment.setAttributeNS(W_NS, 'w:author', author);
  comment.setAttributeNS(W_NS, 'w:date', date);
  comment.setAttributeNS(W_NS, 'w:initials', initialsOf(author));
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const p = w(doc, 'p');
    const pPr = w(doc, 'pPr');
    const pStyle = w(doc, 'pStyle');
    pStyle.setAttributeNS(W_NS, 'w:val', 'CommentText');
    pPr.appendChild(pStyle);
    p.appendChild(pPr);
    if (i === 0) {
      const ref = w(doc, 'r');
      const rPr = w(doc, 'rPr');
      const rStyle = w(doc, 'rStyle');
      rStyle.setAttributeNS(W_NS, 'w:val', 'CommentReference');
      rPr.appendChild(rStyle);
      ref.appendChild(rPr);
      ref.appendChild(w(doc, 'annotationRef'));
      p.appendChild(ref);
    }
    const r = w(doc, 'r');
    const t = w(doc, 't');
    if (/^\s|\s$/.test(line)) t.setAttribute('xml:space', 'preserve');
    t.appendChild(doc.createTextNode(line));
    r.appendChild(t);
    p.appendChild(r);
    comment.appendChild(p);
  });
  return comment;
}

/** The runs a comment anchors to — python-docx's `paragraph.runs` (direct
 * `w:r` children), else the editable runs (hyperlink / insertion runs). */
export function anchorRuns(p: Element): Element[] {
  const direct = children(p).filter(c => isW(c, 'r'));
  if (direct.length > 0) return direct;
  const out: Element[] = [];
  for (const c of children(p)) {
    if (isW(c, 'hyperlink') || isW(c, 'ins')) for (const r of children(c)) if (isW(r, 'r')) out.push(r);
  }
  return out;
}

/**
 * Adds a comment on `paragraph`, anchored around all of its runs. Returns
 * `false` when there is no run to anchor to (the Python's warning case).
 */
export function addComment(pkg: DocxPackage, paragraph: Element, text: string, author: string, now: Date): boolean {
  const runs = anchorRuns(paragraph);
  if (runs.length === 0) return false;
  const commentsDoc = ensureCommentsPart(pkg);
  const root = commentsDoc.documentElement;
  if (root === null) throw new Error(`${COMMENTS_PART} has no root`);
  const id = nextCommentId(root);
  root.appendChild(buildComment(commentsDoc, id, text, author, revisionDate(now)));
  pkg.touch(COMMENTS_PART);

  const doc = paragraph.ownerDocument as Document;
  const start = w(doc, 'commentRangeStart');
  start.setAttributeNS(W_NS, 'w:id', String(id));
  const end = w(doc, 'commentRangeEnd');
  end.setAttributeNS(W_NS, 'w:id', String(id));
  const refRun = w(doc, 'r');
  const rPr = w(doc, 'rPr');
  const rStyle = w(doc, 'rStyle');
  rStyle.setAttributeNS(W_NS, 'w:val', 'CommentReference');
  rPr.appendChild(rStyle);
  refRun.appendChild(rPr);
  const ref = w(doc, 'commentReference');
  ref.setAttributeNS(W_NS, 'w:id', String(id));
  refRun.appendChild(ref);

  const first = runs[0]!;
  const last = runs[runs.length - 1]!;
  // The anchors wrap the runs where they sit: a run under `w:hyperlink` or
  // `w:ins` gets its marks inside that wrapper, as python-docx's
  // `addprevious`/`addnext` on the run element did.
  first.parentNode!.insertBefore(start, first);
  const afterLast = last.nextSibling;
  last.parentNode!.insertBefore(end, afterLast);
  end.parentNode!.insertBefore(refRun, end.nextSibling);
  // The anchors live in document.xml, which must now be serialized on save.
  pkg.touch(DOCUMENT_PART);
  return true;
}

/** How many comments the part holds — the slip's count. */
export function commentCount(pkg: DocxPackage): number {
  if (!pkg.hasPart(COMMENTS_PART)) return 0;
  const root = pkg.part(COMMENTS_PART).documentElement;
  if (root === null) return 0;
  let n = 0;
  for (const c of descendants(root)) if (isW(c, 'comment')) n += 1;
  return n;
}
