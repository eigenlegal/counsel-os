import { describe, expect, test } from 'bun:test';
import { compareDocuments, compareOutputName } from './compare';
import { extractRedlines } from './extract';
import { attr, children, descendants, isW, modelOf, textOf } from './model';
import { openDocx, serialize, type DocxPackage } from './package';
import { buildDocx, simpleDocx } from './test/builder';

const AT = new Date('2026-09-01T12:00:00Z');

function accept(pkg: DocxPackage): string[] {
  return modelOf(pkg).paragraphs.map(p => textOf(p, 'accept'));
}
function reject(pkg: DocxPackage): string[] {
  return modelOf(pkg).paragraphs.map(p => textOf(p, 'reject'));
}
/** Paragraphs whose MARK is deleted read as absent once changes are accepted. */
function acceptedParagraphs(pkg: DocxPackage): string[] {
  return modelOf(pkg)
    .paragraphs.filter(p => {
      const pPr = children(p.element).find(c => isW(c, 'pPr'));
      const rPr = pPr === undefined ? undefined : children(pPr).find(c => isW(c, 'rPr'));
      return rPr === undefined || !children(rPr).some(c => isW(c, 'del'));
    })
    .map(p => textOf(p, 'accept'));
}
function revisionIds(pkg: DocxPackage): string[] {
  return [...descendants(pkg.document.documentElement!)].filter(el => isW(el, 'ins') || isW(el, 'del')).map(el => attr(el, 'id') ?? '');
}

describe('compareDocuments', () => {
  test('changed, inserted, deleted and unchanged paragraphs: accept-all reads as the revised, reject-all as the original', () => {
    const original = openDocx(simpleDocx('Payment is due within 30 days.', 'Liability is unlimited.', 'This clause will be removed.', 'Governing law: Delaware.'));
    const revised = openDocx(simpleDocx('Payment is due within 45 days.', 'Liability is unlimited.', 'Governing law: Delaware.', 'Notices go by courier.'));
    const r = compareDocuments(original, revised, { author: 'Jack Wang', now: AT });
    expect(r.tracked).toBe(true);
    expect(r.paragraphs).toEqual({ paired: 3, changed: 1, inserted: 1, deleted: 1, unchanged: 2 });
    expect(r.applied.map(a => a.location)).toEqual(['body[0]', 'body[2]', 'after body[3]']);
    expect(r.skipped).toEqual([]);
    expect(r.stats).toEqual({ regions: 3, comments: 0, paragraphs: 3 });

    const out = openDocx(original.save());
    expect(acceptedParagraphs(out)).toEqual(['Payment is due within 45 days.', 'Liability is unlimited.', 'Governing law: Delaware.', 'Notices go by courier.']);
    expect(reject(out)).toEqual(['Payment is due within 30 days.', 'Liability is unlimited.', 'This clause will be removed.', 'Governing law: Delaware.', '']);
    // Every revision element is attributed, dated and uniquely numbered.
    const ids = revisionIds(out);
    expect(new Set(ids).size).toBe(ids.length);
    const xml = out.partText('word/document.xml');
    expect(xml).toContain('w:author="Jack Wang"');
    expect(xml).toContain('w:date="2026-09-01T12:00:00Z"');
    // The deleted paragraph's mark and the inserted paragraph's mark.
    expect(xml).toMatch(/<w:pPr><w:rPr><w:del [^>]*\/><\/w:rPr><\/w:pPr><w:del /);
    expect(xml).toMatch(/<w:pPr><w:rPr><w:ins [^>]*\/><\/w:rPr><\/w:pPr><w:ins [^>]*><w:r>/);
    // extract reads it as a redline.
    const extracted = extractRedlines(out, 'x.docx');
    expect(extracted.summary.authors).toEqual(['Jack Wang']);
    expect(extracted.changes.map(c => c.kind)).toEqual(['replacement', 'deletion', 'insertion']);
  });

  test('a reordered document aligns on similarity, and identical documents change nothing', () => {
    const original = openDocx(simpleDocx('Alpha clause about payment terms and invoices.', 'Beta clause about confidentiality.'));
    const revised = openDocx(simpleDocx('Beta clause about confidentiality.', 'Alpha clause about payment terms, invoices and credit.'));
    const r = compareDocuments(original, revised, { author: 'A', now: AT });
    expect(r.paragraphs.changed + r.paragraphs.inserted + r.paragraphs.deleted).toBeGreaterThan(0);
    const out = openDocx(original.save());
    expect(acceptedParagraphs(out).filter(t => t !== '')).toEqual(['Beta clause about confidentiality.', 'Alpha clause about payment terms, invoices and credit.']);

    const same = openDocx(simpleDocx('One.', 'Two.'));
    const r2 = compareDocuments(same, openDocx(simpleDocx('One.', 'Two.')), { author: 'A', now: AT });
    expect(r2.paragraphs).toEqual({ paired: 2, changed: 0, inserted: 0, deleted: 0, unchanged: 2 });
    expect(r2.applied).toEqual([]);
    expect(revisionIds(openDocx(same.save()))).toEqual([]);
  });

  test('formatting travels: a changed bold run keeps bold in the strike, an inserted paragraph keeps its runs', () => {
    const original = openDocx(buildDocx({ blocks: [{ runs: ['The fee is ', { text: 'five percent', bold: true }, '.'] }] }));
    const revised = openDocx(buildDocx({ blocks: [{ runs: ['The fee is ', { text: 'three percent', bold: true }, '.'] }, { style: 'Heading1', runs: [{ text: 'New heading', italic: true }] }] }));
    compareDocuments(original, revised, { author: 'A', now: AT });
    const out = openDocx(original.save());
    const xml = out.partText('word/document.xml');
    expect(xml).toMatch(/<w:del [^>]*><w:r><w:rPr><w:b\/><\/w:rPr><w:delText[^>]*>five<\/w:delText>/);
    const inserted = modelOf(out).paragraphs[1]!;
    expect(inserted.style).toBe('Heading1');
    expect(serialize(inserted.element)).toContain('<w:i/>');
    expect(textOf(inserted, 'accept')).toBe('New heading');
  });

  test('table cells compare in place; a cell paragraph with no counterpart is skipped, never conjured', () => {
    const original = openDocx(buildDocx({ blocks: [{ runs: ['Intro.'] }, { table: { rows: [[{ paragraphs: [{ runs: ['Cell one.'] }] }, { paragraphs: [{ runs: ['Cell two.'] }] }]] } }] }));
    const revised = openDocx(buildDocx({ blocks: [{ runs: ['Intro.'] }, { table: { rows: [[{ paragraphs: [{ runs: ['Cell one, revised.'] }] }, { paragraphs: [{ runs: ['Cell two.'] }, { runs: ['Cell two, more.'] }] }]] } }] }));
    const r = compareDocuments(original, revised, { author: 'A', now: AT });
    expect(r.applied.map(a => a.location)).toEqual(['table[0].row[0].cell[0].p[0]']);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]!.reason).toContain('table');
    expect(accept(openDocx(original.save()))).toEqual(['Intro.', 'Cell one, revised.', 'Cell two.']);
  });

  test('an original that already carries tracked changes refuses to nest, and says so', () => {
    const original = openDocx(buildDocx({ blocks: [{ runs: ['Term is ', { text: 'two', ins: { author: 'R', date: '2026-01-01T00:00:00Z' } }, ' years.'] }] }));
    const revised = openDocx(simpleDocx('Term is three years.'));
    const r = compareDocuments(original, revised, { author: 'A', now: AT });
    expect(r.applied).toEqual([]);
    expect(r.skipped[0]!.reason).toContain('nested');
  });

  test('insertion at the very start, and the output name', () => {
    const original = openDocx(simpleDocx('Body.'));
    const revised = openDocx(simpleDocx('Preamble.', 'Body.'));
    const r = compareDocuments(original, revised, { author: 'A', now: AT });
    expect(r.applied.map(a => a.location)).toEqual(['body[start]']);
    expect(acceptedParagraphs(openDocx(original.save()))).toEqual(['Preamble.', 'Body.']);
    expect(compareOutputName('matters/acme/nda.docx', AT)).toBe('matters/acme/nda-compare-2026-09-01.docx');
    expect(compareOutputName('matters/acme/nda.docx', AT, 3)).toBe('matters/acme/nda-compare-2026-09-01-3.docx');
  });
});
