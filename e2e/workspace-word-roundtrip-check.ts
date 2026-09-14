/** Synthetic-only fidelity corpus. --native opens ONLY newly generated files;
 * never uses active document, changes global Word settings, or quits Word. */
import { mkdtempSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import assert from 'node:assert/strict';
import { buildDocx } from '../runtime/src/docx/test/builder';
import { openDocx, DOCUMENT_PART, serialize } from '../runtime/src/docx/package';
import { modelOf, textOf, descendants, isW, attr } from '../runtime/src/docx/model';
import { applyRedlines } from '../runtime/src/docx/redline';
import { prepareBlockInsertions } from '../runtime/src/docx/insert';
import { cleanProposal } from '../runtime/src/docx/clean-proposal';

const native = process.argv.includes('--native');
if (native && process.platform !== 'darwin') throw new Error('Native qualification requires Microsoft Word for macOS.');
// Word's sandbox asks for a separate grant for each newly generated external
// folder. Keep native-only synthetic artifacts in its existing private temp
// directory; do not ask for wider access or change its sandbox permissions.
const parent = native ? realpathSync(join(homedir(), 'Library/Containers/com.microsoft.Word/Data/tmp')) : tmpdir();
const root = realpathSync(mkdtempSync(join(parent, 'counsel-word-roundtrip-')));
const author = 'Synthetic Avery';
const original = openDocx(buildDocx({
  blocks: [
    { runs: [{ text: 'SYNTHETIC AGREEMENT', bold: true }] },
    { runs: ['Notices'] },
    { runs: ['Notices may be ', { text: 'given orally', italic: true }, ' within thirty days.'] },
    { numId: '1', runs: ['First numbered requirement.'] },
    { numId: '1', runs: ['Second numbered requirement.'] },
    { table: { rows: [[{ paragraphs: [{ runs: ['Payment'] }] }, { paragraphs: [{ runs: ['Pay in thirty days.'] }] }],
      [{ paragraphs: [{ runs: ['Currency'] }] }, { paragraphs: [{ runs: ['USD'] }] }]] } },
    { runs: ['Earlier comment remains.'], comment: '9' },
    { runs: ['Reference note', { footnoteRef: '1' }] },
    { runs: ['The ', { text: 'online terms', hyperlink: 'rIdTerms' }, ' apply.'] },
    { numId: '2', runs: ['Uptime: 99.9%'] },
    { runs: ['Signatures'] },
  ],
  numbering: { '1': [{ lvlText: '%1.', numFmt: 'decimal' }], '2': [{ lvlText: '•', numFmt: 'bullet' }] },
  comments: [{ id: '9', author: 'Synthetic Other Reviewer', date: '2026-01-01T00:00:00Z', text: 'Keep this earlier comment.' }],
  header: [{ runs: ['Synthetic confidential header'] }],
  footnotes: [{ runs: ['Retain this original footnote.'] }],
}));
original.setPart('word/_rels/document.xml.rels', original.partText('word/_rels/document.xml.rels').replace('</Relationships>', '<Relationship Id="rIdTerms" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/terms" TargetMode="External"/></Relationships>'));
// The small unit-test builder deliberately omits layout-only table/section
// metadata. Native qualification needs a fully schema-valid original, not a
// relative validator that merely ignores the same defect in both packages.
original.setPart(DOCUMENT_PART, original.partText(DOCUMENT_PART)
  .replace('<w:tbl>', '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="6960"/></w:tblGrid>')
  .replace(/<w:tc>/g, (() => { let cell = 0; return () => `<w:tc><w:tcPr><w:tcW w:w="${cell++ % 2 ? 6960 : 2400}" w:type="dxa"/></w:tcPr>`; })())
  .replace('<w:sectPr/>', '<w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'));
const redline = openDocx(original.save());
const insert = prepareBlockInsertions(redline, [{ anchor: 'Signatures', position: 'before', paragraphs: [
  { text: 'Electronic copies', styleFrom: 'Notices' },
  { text: 'The parties may exchange electronic copies.', styleFrom: 'Notices may be given orally within thirty days.' },
], comment: 'Explain this added section.' }], author);
const replacements = applyRedlines(redline, [
  { current: 'given orally', proposed: 'given in writing', comment: 'Explain the notice change.' },
  { current: 'Pay in thirty days.', proposed: 'Pay in forty-five days.', comment: 'Explain the table edit.' },
  { current: 'The online terms apply.', proposed: 'The signed schedule applies.', comment: 'Use the negotiated version.' },
  { current: '- Uptime: 99.9%', proposed: '- Uptime: 99.95% each month.', comment: 'Measure uptime monthly.' },
], { track: true, defaultAuthor: author });
assert.equal(replacements.applied.length, 4);
assert.deepEqual(replacements.skipped, []);
assert.deepEqual(replacements.warnings, []);
insert();
const tracked = openDocx(redline.save()), clean = openDocx(tracked.save());
cleanProposal(original, clean, author);
const paragraphText = (bytes: Uint8Array, mode: 'accept' | 'reject') => modelOf(openDocx(bytes)).paragraphs.map(p => textOf(p, mode)).filter(Boolean);
assert.deepEqual(paragraphText(tracked.save(), 'reject'), paragraphText(original.save(), 'accept'));
assert.deepEqual(paragraphText(clean.save(), 'accept'), paragraphText(tracked.save(), 'accept'));
for (const name of original.partNames().filter(name => ![DOCUMENT_PART, 'word/comments.xml', 'word/_rels/document.xml.rels', '[Content_Types].xml'].includes(name)))
  assert.deepEqual(tracked.partBytes(name), original.partBytes(name), `Unchanged part ${name}`);
for (const [name, pkg] of [['original', original], ['redline', tracked], ['clean', clean]] as const)
  writeFileSync(join(root, `${name}.docx`), pkg.save(), { flag: 'wx' });
console.log(`Synthetic corpus: ${root}`);

if (native) {
  const quote = (value: string) => JSON.stringify(value);
  for (const mode of ['preserve', 'accept', 'reject', 'clean'] as const) {
    const input = join(root, `${basename(root)}-${mode}-input.docx`), output = join(root, `${mode}-word.docx`);
    const pdf = join(root, `${mode}-word.pdf`);
    writeFileSync(input, (mode === 'clean' ? clean : tracked).save(), { flag: 'wx' });
    // An exact, unique generated path is required before every mutation. On an
    // automation timeout we stop; we never dismiss arbitrary dialogs or quit Word.
    const script = `set inputPath to (POSIX file ${quote(input)}) as text
set outputPath to (POSIX file ${quote(output)}) as text
with timeout of 25 seconds
tell application "Microsoft Word"
open file name inputPath add to recent files false
set qaDoc to document ${quote(basename(input))}
if posix full name of qaDoc is not ${quote(input)} then error "Wrong test document"
${mode === 'accept' ? 'accept all revisions qaDoc' : mode === 'reject' ? 'reject all revisions qaDoc' : ''}
save as qaDoc file name outputPath file format format document default add to recent files false
set savedDoc to document ${quote(basename(output))}
if posix full name of savedDoc is not ${quote(output)} then error "Wrong saved test document"
close window 1 of savedDoc saving no
open file name outputPath add to recent files false
set savedDoc to document ${quote(basename(output))}
if posix full name of savedDoc is not ${quote(output)} then error "Wrong reopened test document"
save as savedDoc file name ((POSIX file ${quote(pdf)}) as text) file format format PDF add to recent files false
if posix full name of savedDoc is not ${quote(output)} then error "Wrong test document after PDF export"
close window 1 of savedDoc saving no
end tell
end timeout`;
    const child = Bun.spawn(['osascript', '-e', script], { stdout: 'pipe', stderr: 'pipe' });
    const code = await child.exited, error = await new Response(child.stderr).text();
    if (code) throw new Error(`Native ${mode} check stopped: ${error.trim()}. Only the generated test document may remain open.`);
    const bytes = readFileSync(output), pkg = openDocx(bytes);
    const expected = mode === 'reject' ? original.save() : mode === 'clean' ? clean.save() : tracked.save();
    assert.deepEqual(paragraphText(bytes, 'accept'), paragraphText(expected, 'accept'), `${mode}: accepted text`);
    assert.deepEqual(paragraphText(bytes, 'reject'), paragraphText(mode === 'accept' ? clean.save() : expected, 'reject'), `${mode}: rejected text`);
    const model = modelOf(pkg), expectedModel = modelOf(openDocx(expected));
    assert.deepEqual(model.tables.map(table => table.rows.map(row => row.length)), expectedModel.tables.map(table => table.rows.map(row => row.length)), `${mode}: table topology`);
    assert.deepEqual(model.paragraphs.filter(p => p.numbering).map(p => p.numberLabel), expectedModel.paragraphs.filter(p => p.numbering).map(p => p.numberLabel), `${mode}: numbering`);
    for (const [part, text] of [['word/header1.xml', 'Synthetic confidential header'], ['word/footnotes.xml', 'Retain this original footnote.']])
      assert.ok(pkg.part(part).documentElement!.textContent!.includes(text), `${mode}: ${part}`);
    const italicText = model.paragraphs.flatMap(p => p.runs).filter(run => run.change?.kind !== 'del' && [...descendants(run.element)].some(el => isW(el, 'i'))).map(run => run.text).join('');
    assert.ok(italicText.includes(mode === 'reject' ? 'given orally' : 'given in writing'), `${mode}: inherited italic formatting across split runs`);
    assert.ok(pkg.partText('word/comments.xml').includes('Keep this earlier comment.'), `${mode}: earlier comment`);
    if (mode !== 'reject') {
      const comments = [...descendants(pkg.part('word/comments.xml').documentElement!)].filter(el => isW(el, 'comment'));
      assert.equal(comments.filter(el => attr(el, 'author') === author).length, 5, `${mode}: comment attribution`);
    }
    if (mode === 'preserve') {
      const marks = [...descendants(pkg.part(DOCUMENT_PART).documentElement!)].filter(el => isW(el, 'ins') || isW(el, 'del'));
      assert.ok(marks.length >= 8 && marks.every(el => attr(el, 'author') === author), 'Native revisions and attribution');
    } else {
      assert.ok(![...descendants(pkg.part(DOCUMENT_PART).documentElement!)].some(el => isW(el, 'ins') || isW(el, 'del')), `${mode}: no unresolved revisions`);
    }
    if (mode === 'preserve' || mode === 'reject') {
      // Word for Mac may serialize a hyperlink as a HYPERLINK field instead
      // of w:hyperlink/r:id. Either representation must retain the target.
      const paragraph = model.paragraphs.find(p => textOf(p, 'reject').includes('online terms'))!;
      const retainedLink = paragraph.runs.some(run => run.inHyperlink && run.text.includes('online'))
        && pkg.partText('word/_rels/document.xml.rels').includes('https://example.com/terms');
      const retainedField = serialize(paragraph.element).includes('HYPERLINK "https://example.com/terms"');
      assert.ok(retainedLink || retainedField, `${mode}: original hyperlink text and target remain recoverable`);
    }
    assert.ok(readFileSync(pdf).subarray(0, 5).equals(Buffer.from('%PDF-')), `${mode}: native PDF export`);
    console.log(`PASS native Word ${mode}: save/reopen, body/table/numbering/formatting, header/footnote, comments, attribution, PDF export`);
  }
}
console.log(native
  ? 'PASS package and native round-trip checks; inspect all four native PDF exports for visual qualification.'
  : 'PASS package fidelity corpus; native qualification requires --native and visual inspection.');
