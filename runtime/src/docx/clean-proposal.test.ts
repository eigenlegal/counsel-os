import { expect, test } from 'bun:test';
import { cleanProposal } from './clean-proposal';
import { buildDocx, simpleDocx } from './test/builder';
import { openDocx, DOCUMENT_PART } from './package';
import { modelOf, textOf, W_NS } from './model';
import { applyRedlines } from './redline';
import { prepareBlockInsertions } from './insert';

test('clean proposal retains accepted text, paragraph formatting, comments and all other exact parts', () => {
  const original = openDocx(buildDocx({ blocks: [{ style: 'Heading1', runs: ['Notices'] }, { runs: ['Notices may be given orally.'] },
    { table: { rows: [[{ paragraphs: [{ runs: ['Payment in thirty days.'] }] }]] } }, { style: 'Heading1', runs: ['Signatures'] }],
    header: [{ runs: ['Unchanged header'] }], rawParts: { 'customXml/item1.xml': '<root>Retain this metadata.</root>' } }));
  const redline = openDocx(original.save());
  const insert = prepareBlockInsertions(redline, [{ anchor: 'Signatures', position: 'before', paragraphs: [
    { text: 'Electronic copies', styleFrom: 'Notices' }, { text: 'Copies may be exchanged electronically.', styleFrom: 'Notices may be given orally.' },
  ], comment: 'Explain the new section.' }], 'Avery');
  applyRedlines(redline, [{ current: 'orally', proposed: 'in writing', comment: 'Explain the notice change.' },
    { current: 'thirty', proposed: 'forty-five' }], { track: true, defaultAuthor: 'Avery' });
  insert();
  const saved = openDocx(redline.save()), before = new Map(saved.partNames().map(name => [name, saved.partBytes(name)]));
  const expected = modelOf(saved).paragraphs.map(p => textOf(p, 'accept'));
  expect(cleanProposal(original, saved, 'Avery')).toEqual({ revisionsApplied: 8, commentsRetained: true });
  const clean = openDocx(saved.save());
  expect(modelOf(clean).paragraphs.map(p => textOf(p, 'accept'))).toEqual(expected);
  expect(modelOf(clean).paragraphs.map(p => textOf(p, 'reject'))).toEqual(expected);
  expect(modelOf(clean).paragraphs.find(p => textOf(p, 'accept') === 'Electronic copies')!.style).toBe('Heading1');
  expect(clean.partText(DOCUMENT_PART)).not.toMatch(/<w:(ins|del|delText)\b/);
  for (const name of clean.partNames().filter(name => name !== DOCUMENT_PART)) expect(clean.partBytes(name)).toEqual(before.get(name)!);
  expect(clean.partText('word/comments.xml')).toContain('Explain the notice change.');
  expect(clean.partText('word/comments.xml')).toContain('Explain the new section.');
  expect(clean.partText(DOCUMENT_PART)).toContain('w:commentRangeStart');
});

test('earlier changes anywhere, including same-author revisions, are never silently accepted', () => {
  const mark = { author: 'Avery', date: '2026-01-01T00:00:00Z' };
  for (const spec of [
    { blocks: [{ runs: [{ text: 'Earlier', ins: mark }] }] },
    { blocks: [{ runs: ['Body'] }], header: [{ runs: [{ text: 'Earlier header', del: mark }] }] },
    { blocks: [{ runs: ['Body'] }], rawParts: { 'word/styles.xml': `<w:styles xmlns:w="${W_NS}"><w:rPrChange w:id="4"/></w:styles>` } },
  ]) {
    const original = openDocx(buildDocx(spec)), redline = openDocx(simpleDocx('Unchanged'));
    const before = redline.partText(DOCUMENT_PART);
    expect(() => cleanProposal(original, redline, 'Avery')).toThrow('original already contains');
    expect(redline.partText(DOCUMENT_PART)).toBe(before);
  }
});

test('unexpected authors, move revisions and deleted paragraph marks fail before mutation', () => {
  const original = openDocx(simpleDocx('Original'));
  for (const xml of [
    '<w:ins w:author="Other"><w:r><w:t>New</w:t></w:r></w:ins>',
    '<w:moveTo w:author="Avery"><w:r><w:t>New</w:t></w:r></w:moveTo>',
    '<w:pPr><w:rPr><w:del w:author="Avery"/></w:rPr></w:pPr><w:r><w:t>New</w:t></w:r>',
  ]) {
    const redline = openDocx(simpleDocx('Original'));
    redline.setPart(DOCUMENT_PART, `<w:document xmlns:w="${W_NS}"><w:body><w:p>${xml}</w:p></w:body></w:document>`);
    const before = redline.partText(DOCUMENT_PART);
    expect(() => cleanProposal(original, redline, 'Avery')).toThrow();
    expect(redline.partText(DOCUMENT_PART)).toBe(before);
  }
});
