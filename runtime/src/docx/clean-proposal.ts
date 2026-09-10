import type { Element } from '@xmldom/xmldom';
import { attr, children, isW, modelOf, textOf, W_NS } from './model';
import { DOCUMENT_PART, type DocxPackage } from './package';

const revisionName = /^(ins|del|delText|delInstrText|cellIns|cellDel|cellMerge|numberingChange|move.*|customXml.*Range.*|.*Change|.*Conflict.*)$/i;
function revisions(pkg: DocxPackage): Array<{ part: string; element: Element }> {
  const found: Array<{ part: string; element: Element }> = [];
  let count = 0;
  for (const part of pkg.partNames().filter(name => /\.(xml|rels)$/i.test(name))) {
    const root = pkg.part(part).documentElement;
    if (!root) throw new Error('A Word XML part is empty.');
    const pending: Array<{ element: Element; depth: number }> = [{ element: root, depth: 0 }];
    while (pending.length) {
      const { element, depth } = pending.pop()!;
      if (++count > 200_000 || depth > 100) throw new Error('This Word document exceeds the clean-proposal inspection limits.');
      if (element.namespaceURI === W_NS && revisionName.test(element.localName ?? '')) found.push({ part, element });
      for (const child of children(element)) pending.push({ element: child, depth: depth + 1 });
    }
  }
  return found;
}

/** Only for a verified app-generated redline of an originally revision-free document.
 * Never resolves another reviewer's changes or changes any legal/workflow status.
 * Comments and every untouched package part are retained byte-for-byte. */
export function cleanProposal(original: DocxPackage, redline: DocxPackage, author: string): { revisionsApplied: number; commentsRetained: boolean } {
  if (revisions(original).length)
    throw new Error('The original already contains tracked revisions. Resolve those explicitly in Word before requesting a new redline; no clean proposal was created.');
  const marks = revisions(redline);
  const edits = marks.filter(mark => ['ins', 'del'].includes(mark.element.localName ?? ''));
  if (!edits.length) throw new Error('This saved redline contains no supported tracked changes.');
  for (const { part, element } of marks) {
    // Deleted text is removed only as part of its supported deletion wrapper.
    if (isW(element, 'delText') && isW(element.parentNode, 'r') && isW(element.parentNode.parentNode, 'del')) continue;
    const paragraphMark = isW(element, 'ins') && isW(element.parentNode, 'rPr')
      && isW(element.parentNode.parentNode, 'pPr') && isW(element.parentNode.parentNode.parentNode, 'p') && !element.hasChildNodes();
    const runMark = (isW(element, 'ins') || isW(element, 'del')) && isW(element.parentNode, 'p')
      && children(element).every(child => isW(child, 'r') || (isW(element, 'ins') && (isW(child, 'commentRangeStart') || isW(child, 'commentRangeEnd'))));
    if (part !== DOCUMENT_PART || (!paragraphMark && !runMark) || attr(element, 'author') !== author)
      throw new Error('This redline contains revisions outside the supported Counsel changes. Review them explicitly in Word; no clean proposal was created.');
  }
  const before = modelOf(redline).paragraphs.map(p => textOf(p, 'accept'));
  for (const { element } of edits) {
    const parent = element.parentNode!;
    if (isW(element, 'ins')) while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
  }
  redline.touch(DOCUMENT_PART);
  if (revisions(redline).length || JSON.stringify(modelOf(redline).paragraphs.map(p => textOf(p, 'accept'))) !== JSON.stringify(before))
    throw new Error('The clean proposal failed its content check. No file was saved.');
  return { revisionsApplied: edits.length, commentsRetained: redline.hasPart('word/comments.xml') };
}
