import { describe, expect, test } from 'bun:test';
import { docxToMarkdown, headingLevel } from './markdown';
import { openDocx } from './package';
import { buildDocx, simpleDocx } from './test/builder';

const AT = '2026-08-28T10:00:00Z';

describe('docxToMarkdown', () => {
  test('headings from styles, body paragraphs separated by blank lines, trailing newline', () => {
    const { markdown, warnings } = docxToMarkdown(
      openDocx(buildDocx({ blocks: [{ style: 'Title', runs: ['Mutual NDA'] }, { style: 'Heading2', runs: ['2. Obligations'] }, { runs: ['Each Party shall.'] }] })),
    );
    // With a Title present the headings shift down one level.
    expect(markdown).toBe('# Mutual NDA\n\n### 2. Obligations\n\nEach Party shall.\n');
    expect(warnings).toEqual([]);
  });

  test('without a Title, Heading 1 is the H1', () => {
    const { markdown } = docxToMarkdown(openDocx(buildDocx({ blocks: [{ style: 'Heading1', runs: ['1. Purpose'] }, { runs: ['Body.'] }] })));
    expect(markdown).toBe('# 1. Purpose\n\nBody.\n');
  });

  test('numbering renders as literal text; bullets as list items', () => {
    const { markdown } = docxToMarkdown(
      openDocx(
        buildDocx({
          numbering: { '1': [{ lvlText: '%1.' }, { lvlText: '%1.%2' }], '2': [{ lvlText: '', numFmt: 'bullet' }] },
          blocks: [
            { numId: '1', ilvl: 0, runs: ['Definitions'] },
            { numId: '1', ilvl: 1, runs: ['Confidential Information'] },
            { numId: '2', runs: ['marked'] },
          ],
        }),
      ),
    );
    expect(markdown).toBe('1. Definitions\n\n1.1 Confidential Information\n\n- marked\n');
  });

  test('tracked changes as CriticMarkup by default; accept and reject give clean views', () => {
    const pkg = () =>
      openDocx(
        buildDocx({
          blocks: [{ runs: ['The term is ', { text: 'two', del: { author: 'R', date: AT } }, { text: 'one', ins: { author: 'R', date: AT } }, ' year.'] }],
        }),
      );
    expect(docxToMarkdown(pkg()).markdown).toBe('The term is {--two--}{++one++} year.\n');
    expect(docxToMarkdown(pkg(), { changes: 'accept' }).markdown).toBe('The term is one year.\n');
    expect(docxToMarkdown(pkg(), { changes: 'reject' }).markdown).toBe('The term is two year.\n');
  });

  test('adjacent runs of one change kind merge into one mark', () => {
    const { markdown } = docxToMarkdown(
      openDocx(buildDocx({ blocks: [{ runs: [{ text: 'a ', ins: { author: 'R', date: AT } }, { text: 'b', ins: { author: 'R', date: AT }, bold: true }] }] })),
    );
    expect(markdown).toBe('{++a b++}\n');
  });

  test('comments follow the paragraph they anchor in, with author and date', () => {
    const { markdown } = docxToMarkdown(
      openDocx(
        buildDocx({
          blocks: [{ runs: ['Reasonable care is market.'], comment: '3' }],
          comments: [{ id: '3', author: 'R. Patel', date: '2026-08-28T10:00:00Z', text: 'We cannot commit to same degree.' }],
        }),
      ),
    );
    expect(markdown).toBe('Reasonable care is market. {>>We cannot commit to same degree. (R. Patel, 2026-08-28)<<}\n');
    expect(docxToMarkdown(openDocx(buildDocx({ blocks: [{ runs: ['x'], comment: '3' }], comments: [{ id: '3', author: 'R', date: AT, text: 'c' }] })), { comments: false }).markdown).toBe('x\n');
  });

  test('tables become pipe tables; multi-paragraph cells join with <br>; pipes are escaped', () => {
    const { markdown } = docxToMarkdown(
      openDocx(
        buildDocx({
          blocks: [
            { runs: ['Before'] },
            {
              table: {
                rows: [
                  [{ paragraphs: [{ runs: ['Item'] }] }, { paragraphs: [{ runs: ['Fee'] }] }],
                  [{ paragraphs: [{ runs: ['Setup'] }, { runs: ['one-time'] }] }, { paragraphs: [{ runs: ['$5,000 | net 30'] }] }],
                ],
              },
            },
            { runs: ['After'] },
          ],
        }),
      ),
    );
    expect(markdown).toBe('Before\n\n| Item | Fee |\n| --- | --- |\n| Setup<br>one-time | $5,000 \\| net 30 |\n\nAfter\n');
  });

  test('tabs and breaks are one space; empty paragraphs vanish', () => {
    const { markdown } = docxToMarkdown(openDocx(buildDocx({ blocks: [{ runs: ['By:', { tab: true }, '____'] }, { runs: [] }, { runs: ['Name'] }] })));
    expect(markdown).toBe('By: ____\n\nName\n');
  });

  test('dropped content is a warning naming the paragraph, never a silent hole', () => {
    const { markdown, warnings } = docxToMarkdown(openDocx(buildDocx({ blocks: [{ runs: ['See', { drawing: true }, { text: '1', footnoteRef: '1' }] }] })));
    expect(markdown).toBe('See1\n');
    expect(warnings).toEqual(['body[0]: a drawing was left out', 'body[0]: a footnote reference was left out']);
  });

  test('headingLevel', () => {
    expect(headingLevel('Heading1')).toBe(1);
    expect(headingLevel('Heading 3')).toBe(3);
    expect(headingLevel('heading9')).toBe(6);
    expect(headingLevel('Title')).toBe(1);
    expect(headingLevel('Heading1', true)).toBe(2);
    expect(headingLevel('Title', true)).toBe(1);
    expect(headingLevel('Normal')).toBeNull();
    expect(headingLevel(null)).toBeNull();
  });

  test('simpleDocx round trip', () => {
    expect(docxToMarkdown(openDocx(simpleDocx('a', 'b'))).markdown).toBe('a\n\nb\n');
  });
});

describe('the demo NDA', () => {
  test('matches the committed golden', async () => {
    const dir = new URL('../../../skills/demo/assets/', import.meta.url);
    const bytes = new Uint8Array(await Bun.file(new URL('sample-mutual-nda.docx', dir)).arrayBuffer());
    const { markdown, warnings } = docxToMarkdown(openDocx(bytes));
    expect(warnings).toEqual([]);
    const goldenFile = Bun.file(new URL('./test/golden/sample-mutual-nda.md', import.meta.url));
    if (process.env['UPDATE_GOLDEN'] === '1') {
      await Bun.write(goldenFile, markdown);
    }
    expect(markdown).toBe(await goldenFile.text());
  });
});
