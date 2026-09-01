import { describe, expect, test } from 'bun:test';
import { formatNumber, modelOf, textOf } from './model';
import { openDocx } from './package';
import { buildDocx, simpleDocx } from './test/builder';

const AT = '2026-08-28T10:00:00Z';

describe('DocxModel paragraphs and locations', () => {
  test('body paragraphs and table-cell paragraphs enumerate in document order with Python-grammar locations', () => {
    const model = modelOf(
      openDocx(
        buildDocx({
          blocks: [
            { runs: ['First'] },
            {
              table: {
                rows: [
                  [{ paragraphs: [{ runs: ['A1'] }, { runs: ['A1b'] }] }, { paragraphs: [{ runs: ['B1'] }] }],
                  [{ paragraphs: [{ runs: ['A2'] }] }, { paragraphs: [{ runs: ['B2'] }] }],
                ],
              },
            },
            { runs: ['Last'] },
          ],
        }),
      ),
    );
    expect(model.paragraphs.map(p => [p.location, textOf(p, 'accept')])).toEqual([
      ['body[0]', 'First'],
      ['table[0].row[0].cell[0].p[0]', 'A1'],
      ['table[0].row[0].cell[0].p[1]', 'A1b'],
      ['table[0].row[0].cell[1].p[0]', 'B1'],
      ['table[0].row[1].cell[0].p[0]', 'A2'],
      ['table[0].row[1].cell[1].p[0]', 'B2'],
      ['body[1]', 'Last'],
    ]);
    expect(model.paragraphs.map(p => p.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(model.tables[0]!.rows).toEqual([[[1, 2], [3]], [[4], [5]]]);
  });

  test('a merged cell is one w:tc and so one location — never listed twice', () => {
    const model = modelOf(
      openDocx(
        buildDocx({
          blocks: [{ table: { rows: [[{ paragraphs: [{ runs: ['wide'] }], gridSpan: 2 }], [{ paragraphs: [{ runs: ['x'] }] }, { paragraphs: [{ runs: ['y'] }] }]] } }],
        }),
      ),
    );
    expect(model.paragraphs.map(p => textOf(p, 'accept'))).toEqual(['wide', 'x', 'y']);
  });

  test('style, numbering and comment anchors are read off the paragraph', () => {
    const model = modelOf(
      openDocx(
        buildDocx({
          blocks: [{ style: 'Heading1', numId: '1', ilvl: 1, runs: ['Scope'], comment: '7' }],
          comments: [{ id: '7', author: 'R', date: AT, text: 'why' }],
        }),
      ),
    );
    const p = model.paragraphs[0]!;
    expect(p.style).toBe('Heading1');
    expect(p.numbering).toEqual({ numId: '1', level: 1 });
    expect(p.commentIds).toEqual(['7']);
  });
});

describe('text views', () => {
  const doc = () =>
    modelOf(
      openDocx(
        buildDocx({
          blocks: [
            {
              runs: [
                'The term is ',
                { text: 'two (2) years', del: { author: 'R. Patel', date: AT } },
                { text: 'one (1) year', ins: { author: 'R. Patel', date: AT } },
                { text: ' from signing', hyperlink: 'rId9' },
                { tab: true },
                { text: 'end' },
              ],
            },
          ],
        }),
      ),
    );

  test('accept-all keeps insertions and hyperlink runs, drops deletions; tabs are one space', () => {
    expect(textOf(doc().paragraphs[0]!, 'accept')).toBe('The term is one (1) year from signing end');
  });

  test('reject-all keeps deletions (delText), drops insertions', () => {
    expect(textOf(doc().paragraphs[0]!, 'reject')).toBe('The term is two (2) years from signing end');
  });

  test('runs carry their change mark, hyperlink flag, and author/date', () => {
    const runs = doc().paragraphs[0]!.runs;
    expect(runs.map(r => r.change?.kind ?? null)).toEqual([null, 'del', 'ins', null, null, null]);
    expect(runs[1]!.change?.author).toBe('R. Patel');
    expect(runs[2]!.change?.date).toBe(AT);
    expect(runs.map(r => r.inHyperlink)).toEqual([false, false, false, true, false, false]);
  });

  test('moveTo/moveFrom read as ins/del', () => {
    const model = modelOf(
      openDocx(buildDocx({ blocks: [{ runs: [{ text: 'gone', moveFrom: { author: 'A', date: AT } }, { text: 'here', moveTo: { author: 'A', date: AT } }] }] })),
    );
    expect(textOf(model.paragraphs[0]!, 'accept')).toBe('here');
    expect(textOf(model.paragraphs[0]!, 'reject')).toBe('gone');
  });

  test('dropped content is flagged on the run', () => {
    const model = modelOf(openDocx(buildDocx({ blocks: [{ runs: [{ drawing: true }, { text: 'x', footnoteRef: '1' }, { text: 'y' }] }] })));
    expect(model.paragraphs[0]!.runs.map(r => r.dropped)).toEqual(['drawing', 'footnote reference', null]);
  });
});

describe('numbering', () => {
  test('labels render from numbering.xml with per-level counters and resets', () => {
    const model = modelOf(
      openDocx(
        buildDocx({
          numbering: { '1': [{ lvlText: '%1.' }, { lvlText: '%1.%2' }, { lvlText: '(%3)', numFmt: 'lowerLetter' }] },
          blocks: [
            { numId: '1', ilvl: 0, runs: ['Definitions'] },
            { numId: '1', ilvl: 1, runs: ['Confidential Information'] },
            { numId: '1', ilvl: 2, runs: ['marked'] },
            { numId: '1', ilvl: 2, runs: ['oral'] },
            { numId: '1', ilvl: 1, runs: ['Purpose'] },
            { runs: ['(unnumbered)'] },
            { numId: '1', ilvl: 0, runs: ['Obligations'] },
            { numId: '1', ilvl: 1, runs: ['Care'] },
          ],
        }),
      ),
    );
    expect(model.paragraphs.map(p => p.numberLabel)).toEqual(['1.', '1.1', '(a)', '(b)', '1.2', null, '2.', '2.1']);
  });

  test('a numId with no definition, or no numbering part, leaves the label null', () => {
    const model = modelOf(openDocx(buildDocx({ blocks: [{ numId: '9', runs: ['x'] }] })));
    expect(model.paragraphs[0]!.numberLabel).toBeNull();
  });

  test('formatNumber covers the formats Word uses', () => {
    expect(formatNumber(4, 'decimal')).toBe('4');
    expect(formatNumber(3, 'lowerLetter')).toBe('c');
    expect(formatNumber(27, 'upperLetter')).toBe('AA');
    expect(formatNumber(14, 'lowerRoman')).toBe('xiv');
    expect(formatNumber(9, 'upperRoman')).toBe('IX');
    expect(formatNumber(1, 'bullet')).toBe('•');
  });
});

describe('the demo NDA', () => {
  test('opens and walks without error', async () => {
    const bytes = new Uint8Array(await Bun.file(new URL('../../../skills/demo/assets/sample-mutual-nda.docx', import.meta.url)).arrayBuffer());
    const model = modelOf(openDocx(bytes));
    expect(model.paragraphs.length).toBeGreaterThan(10);
    expect(textOf(model.paragraphs[0]!, 'accept').length).toBeGreaterThan(0);
  });
});

describe('simpleDocx', () => {
  test('one paragraph per string', () => {
    const model = modelOf(openDocx(simpleDocx('a', 'b')));
    expect(model.paragraphs.map(p => textOf(p, 'accept'))).toEqual(['a', 'b']);
  });
});
