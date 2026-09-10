import { expect, test } from 'bun:test';
import { buildDocx } from './test/builder';
import { openDocx, DOCUMENT_PART } from './package';
import { attr, children, descendants, isW, modelOf, textOf, W_NS } from './model';
import { prepareBlockInsertions } from './insert';
import { applyRedlines } from './redline';

const when = new Date('2026-01-01T12:00:00Z');
test('inserted paragraphs inherit separate heading/body archetypes, track text and paragraph marks, and preserve other authors and parts', () => {
  const pkg = openDocx(buildDocx({ blocks: [{ style: 'Heading1', runs: [{ text: 'Original heading', bold: true }] },
    { runs: ['Existing body paragraph.'] }, { style: 'Title', runs: ['Exhibit B'] },
    { runs: [{ text: 'Earlier reviewer text.', ins: { author: 'Earlier reviewer', date: when.toISOString() } }] }], header: [{ runs: ['Untouched header'] }] }));
  const doc = pkg.part(DOCUMENT_PART), paras = modelOf(pkg).paragraphs;
  for (const [index, align] of [[1, 'both'], [2, 'center']] as const) {
    const paragraph = paras[index]!.element, pPr = children(paragraph).find(el => isW(el, 'pPr')) ?? doc.createElementNS(W_NS, 'w:pPr');
    if (!pPr.parentNode) paragraph.insertBefore(pPr, paragraph.firstChild);
    const jc = doc.createElementNS(W_NS, 'w:jc'); jc.setAttributeNS(W_NS, 'w:val', align); pPr.appendChild(jc);
    const r = paras[index]!.runs[0]!.element, rPr = doc.createElementNS(W_NS, 'w:rPr');
    const font = doc.createElementNS(W_NS, 'w:rFonts'); font.setAttributeNS(W_NS, 'w:ascii', 'Calibri'); font.setAttributeNS(W_NS, 'w:hAnsi', 'Calibri');
    rPr.appendChild(font); r.insertBefore(rPr, r.firstChild);
  }
  pkg.touch(DOCUMENT_PART);
  const header = pkg.partText('word/header1.xml'), original = modelOf(pkg).paragraphs.map(p => textOf(p, 'reject')).filter(Boolean);
  const report = prepareBlockInsertions(pkg, [{ anchor: 'Exhibit B', position: 'before', paragraphs: [
    { text: 'New section heading', styleFrom: 'Original heading' }, { text: 'New body paragraph <with literal markup> & text.', styleFrom: 'Existing body paragraph.' },
  ], comment: 'Draft rationale.' }], 'Synthetic Avery', when)();
  expect(report).toEqual([{ index: 0, location: 'body[2].before', paragraphs: 2, comments: 1 }]);
  const saved = openDocx(pkg.save()), model = modelOf(saved);
  expect(model.paragraphs.map(p => textOf(p, 'reject')).filter(Boolean)).toEqual(original);
  const added = model.paragraphs.find(p => textOf(p, 'accept').startsWith('New body'))!;
  expect(attr([...descendants(added.element)].find(el => isW(el, 'jc'))!, 'val')).toBe('both');
  expect(attr([...descendants(added.element)].find(el => isW(el, 'rFonts'))!, 'ascii')).toBe('Calibri');
  expect(model.paragraphs.find(p => textOf(p, 'accept') === 'New section heading')!.style).toBe('Heading1');
  const marks = [...descendants(saved.part(DOCUMENT_PART).documentElement!)].filter(el => isW(el, 'ins'));
  expect(marks.filter(el => attr(el, 'author') === 'Synthetic Avery')).toHaveLength(4);
  expect(marks.filter(el => attr(el, 'author') === 'Earlier reviewer')).toHaveLength(1);
  expect(new Set(marks.map(el => attr(el, 'id'))).size).toBe(marks.length);
  expect(saved.partText('word/header1.xml')).toBe(header);
  expect(saved.partText('word/comments.xml')).toContain('Synthetic Avery');
  expect(saved.partText('word/comments.xml')).toContain('Draft rationale.');
});
test('anchors and formatting resolve before replacements; adjacent insertion groups preserve input order and numbering', () => {
  const pkg = openDocx(buildDocx({ blocks: [{ numId: '1', ilvl: 0, runs: ['First section.'] }, { numId: '1', ilvl: 0, runs: ['Second section.'] }],
    numbering: { '1': [{ start: 1, numFmt: 'decimal', lvlText: '%1.' }] } }));
  const insert = prepareBlockInsertions(pkg, ['Inserted A.', 'Inserted B.'].map(text => ({ anchor: 'First section.', position: 'after', paragraphs: [{ text, styleFrom: 'First section.' }] })), 'Avery', when);
  applyRedlines(pkg, [{ current: 'First', proposed: 'Revised first' }], { track: true, defaultAuthor: 'Avery', now: when });
  insert();
  const model = modelOf(openDocx(pkg.save()));
  expect(model.paragraphs.map(p => textOf(p, 'accept'))).toEqual(['Revised first section.', 'Inserted A.', 'Inserted B.', 'Second section.']);
  expect(model.paragraphs.map(p => p.numberLabel)).toEqual(['1.', '2.', '3.', '4.']);
});
test('ambiguous, partial, nested, tracked and field anchors fail before mutation', () => {
  const pkg = openDocx(buildDocx({ blocks: [{ runs: ['Duplicate.'] }, { runs: ['Duplicate.'] }, { runs: ['Plain complete paragraph.'] },
    { runs: [{ text: 'Changed.', ins: { author: 'Earlier', date: when.toISOString() } }] },
    { table: { rows: [[{ paragraphs: [{ runs: ['Table text.'] }] }]] } }, { runs: [{ text: 'Field text.', field: 'DATE' }] }] }));
  const before = pkg.partText(DOCUMENT_PART);
  for (const anchor of ['Duplicate.', 'complete paragraph.', 'Changed.', 'Table text.', 'Field text.']) {
    expect(() => prepareBlockInsertions(pkg, [{ anchor, position: 'after', paragraphs: [{ text: 'New.', styleFrom: 'Plain complete paragraph.' }] }], 'Avery')).toThrow();
    expect(pkg.partText(DOCUMENT_PART)).toBe(before);
  }
  expect(() => prepareBlockInsertions(pkg, [{ anchor: 'Plain complete paragraph.', position: 'after', paragraphs: [{ text: 'New.', styleFrom: 'Changed.' }] }], 'Avery')).toThrow('earlier tracked');
  expect(pkg.partText(DOCUMENT_PART)).toBe(before);
});
