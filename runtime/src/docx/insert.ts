/** Whole-paragraph native revisions. Content and formatting anchors are resolved
 * against the unchanged package before any text replacements are applied. */
import type { Document, Element } from '@xmldom/xmldom';
import { children, descendants, isW, modelOf, textOf, W_NS, type DocxParagraph } from './model';
import { DOCUMENT_PART, type DocxPackage } from './package';
import { revisionElement, revisionIdAllocator, setRunText } from './redline';
import { addComment, revisionDate } from './comments';

export interface BlockInsertion {
  anchor: string; position: 'before' | 'after';
  paragraphs: Array<{ text: string; styleFrom: string }>;
  comment?: string;
}
export interface BlockInsertionReport { index: number; location: string; paragraphs: number; comments: number; }
const paragraphProperties = new Set(['pStyle', 'keepNext', 'keepLines', 'pageBreakBefore', 'widowControl', 'numPr', 'tabs',
  'spacing', 'ind', 'contextualSpacing', 'mirrorIndents', 'jc', 'textAlignment', 'outlineLvl', 'bidi', 'shd', 'pBdr', 'rPr']);
const revisions = new Set(['ins', 'del', 'moveFrom', 'moveTo', 'pPrChange', 'rPrChange']);

export function prepareBlockInsertions(pkg: DocxPackage, items: BlockInsertion[], author: string, now = new Date()): () => BlockInsertionReport[] {
  const paragraphs = modelOf(pkg).paragraphs;
  const resolve = (text: string, role: string): DocxParagraph => {
    const matches = paragraphs.filter(p => textOf(p, 'accept').trim() === text.trim());
    if (matches.length !== 1) throw new Error(`${role} must match one complete, unique paragraph in the original.`);
    const paragraph = matches[0]!;
    if (!isW(paragraph.element.parentNode, 'body') || paragraph.cell !== null)
      throw new Error(`${role} must be a main-body paragraph, not a table, header or nested structure.`);
    if ([...descendants(paragraph.element)].some(el => el.namespaceURI === W_NS && revisions.has(el.localName ?? '')))
      throw new Error(`${role} contains earlier tracked changes. Choose an unchanged paragraph.`);
    if (paragraph.runs.some(run => run.dropped)) throw new Error(`${role} contains a field, drawing or footnote and cannot be used safely.`);
    if ([...descendants(paragraph.element)].some(el => el.namespaceURI === W_NS &&
      ['fldSimple', 'fldChar', 'instrText', 'sdt', 'customXml', 'smartTag', 'sectPr'].includes(el.localName ?? '')))
      throw new Error(`${role} contains a field, section boundary or structured content and cannot be used safely.`);
    return paragraph;
  };
  const plans = items.map((item, index) => {
    const anchor = resolve(item.anchor, 'Insertion anchor');
    const styles = item.paragraphs.map(value => {
      if (!value.text.trim() || /[\r\n]/.test(value.text)) throw new Error('Each inserted paragraph needs one nonempty text value without line breaks.');
      for (const character of value.text) {
        const cp = character.codePointAt(0)!;
        if (!(cp === 9 || (cp >= 32 && cp <= 0xd7ff) || (cp >= 0xe000 && cp <= 0xfffd) || (cp >= 0x10000 && cp <= 0x10ffff)))
          throw new Error('Inserted text contains a character Word cannot store safely.');
      }
      const archetype = resolve(value.styleFrom, 'Formatting example');
      const pPr = children(archetype.element).find(el => isW(el, 'pPr'));
      // A separate archetype is essential: inserting before a centered exhibit
      // heading must not accidentally center ordinary body paragraphs.
      const properties = pPr ? children(pPr).filter(el => paragraphProperties.has(el.localName ?? '')).map(el => el.cloneNode(true) as Element) : [];
      const run = [...archetype.runs].filter(run => !run.change && !run.dropped && run.text.trim())
        .sort((a, b) => b.text.length - a.text.length)[0];
      if (!run) throw new Error('The formatting example has no usable text run.');
      const rPr = children(run.element).find(el => isW(el, 'rPr'))?.cloneNode(true) as Element | undefined;
      return { text: value.text, properties, rPr };
    });
    return { item, index, anchor, styles };
  });
  return () => {
    const alloc = revisionIdAllocator(pkg), when = revisionDate(now), after = new Map<Element, Element>();
    const report: BlockInsertionReport[] = [];
    for (const plan of plans) {
      const parent = plan.anchor.element.parentNode!, doc = plan.anchor.element.ownerDocument as Document;
      let cursor = after.get(plan.anchor.element) ?? plan.anchor.element;
      let comments = 0;
      plan.styles.forEach((style, i) => {
        const paragraph = doc.createElementNS(W_NS, 'w:p'), pPr = doc.createElementNS(W_NS, 'w:pPr');
        for (const property of style.properties) pPr.appendChild(property.cloneNode(true));
        let mark = children(pPr).find(el => isW(el, 'rPr'));
        if (!mark) { mark = doc.createElementNS(W_NS, 'w:rPr'); pPr.appendChild(mark); }
        mark.insertBefore(revisionElement(doc, 'ins', author, when, alloc), mark.firstChild);
        paragraph.appendChild(pPr);
        const run = doc.createElementNS(W_NS, 'w:r');
        if (style.rPr) run.appendChild(style.rPr.cloneNode(true));
        setRunText(run, style.text);
        const insertion = revisionElement(doc, 'ins', author, when, alloc);
        insertion.appendChild(run); paragraph.appendChild(insertion);
        if (plan.item.position === 'before') parent.insertBefore(paragraph, plan.anchor.element);
        else { parent.insertBefore(paragraph, cursor.nextSibling); cursor = paragraph; after.set(plan.anchor.element, paragraph); }
        if (i === 0 && plan.item.comment) {
          if (!addComment(pkg, paragraph, plan.item.comment, author, now)) throw new Error('The insertion comment could not be anchored safely.');
          comments++;
        }
      });
      report.push({ index: plan.index, location: `${plan.anchor.location}.${plan.item.position}`, paragraphs: plan.styles.length, comments });
    }
    if (plans.length) pkg.touch(DOCUMENT_PART);
    return report;
  };
}
