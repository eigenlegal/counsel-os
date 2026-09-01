import { describe, expect, test } from 'bun:test';
import { extractRedlines, extractToMarkdown } from './extract';
import { openDocx } from './package';
import { buildDocx } from './test/builder';

const AT = '2026-08-28T10:00:00Z';
const R = { author: 'R. Patel', date: AT };

describe('extractRedlines', () => {
  test('a replacement paragraph: both views, fragments, authors, dates, comment ids, section context', () => {
    const data = extractRedlines(
      openDocx(
        buildDocx({
          blocks: [
            { style: 'Heading1', runs: ['3. Term'] },
            {
              runs: ['This Agreement lasts ', { text: 'two (2) years', del: R }, { text: 'one (1) year', ins: { author: 'J. Wang', date: '2026-08-29T12:00:00Z' } }, '.'],
              comment: '4',
            },
            { runs: ['Unchanged.'] },
          ],
          comments: [{ id: '4', author: 'R. Patel', date: AT, text: 'Standard of care: reasonable is market.' }],
        }),
      ),
      'nda.docx',
    );
    expect(data.file).toBe('nda.docx');
    expect(data.summary).toEqual({
      changed_paragraphs: 1,
      inserted_fragments: 1,
      deleted_fragments: 1,
      non_body_insertions: 0,
      non_body_deletions: 0,
      comments: 1,
      authors: ['J. Wang', 'R. Patel'],
    });
    expect(data.warnings).toEqual([]);
    expect(data.changes).toEqual([
      {
        paragraph_index: 1,
        location: 'body',
        section_context: '3. Term',
        kind: 'replacement',
        original: 'This Agreement lasts two (2) years.',
        revised: 'This Agreement lasts one (1) year.',
        inserted: ['one (1) year'],
        deleted: ['two (2) years'],
        authors: ['J. Wang', 'R. Patel'],
        dates: ['2026-08-28', '2026-08-29'],
        comment_ids: ['4'],
      },
    ]);
    expect(data.comments).toEqual([
      {
        id: '4',
        author: 'R. Patel',
        date: '2026-08-28',
        text: 'Standard of care: reasonable is market.',
        paragraph_index: 1,
        anchor_excerpt: 'This Agreement lasts two (2) yearsone (1) year.',
      },
    ]);
  });

  test('insertion-only and deletion-only kinds; more than three fragments of one kind coalesce', () => {
    const data = extractRedlines(
      openDocx(
        buildDocx({
          blocks: [
            { runs: ['a', { text: 'x', ins: R }, { text: 'y', ins: R }, { text: 'z', ins: R }, { text: 'w', ins: R }] },
            { runs: ['b', { text: 'gone', del: R }] },
            { runs: ['c', { text: 'p', ins: R }, { text: 'q', ins: R }] },
          ],
        }),
      ),
      'x.docx',
    );
    expect(data.changes.map(c => [c.kind, c.inserted, c.deleted])).toEqual([
      ['insertion', ['xyzw'], []],
      ['deletion', [], ['gone']],
      ['insertion', ['p', 'q'], []],
    ]);
    expect(data.summary.inserted_fragments).toBe(6);
    expect(data.summary.deleted_fragments).toBe(1);
  });

  test('section context follows numbered headings without a heading style', () => {
    const data = extractRedlines(
      openDocx(buildDocx({ blocks: [{ runs: ['7.2) Payment terms'] }, { runs: ['Net ', { text: '30', del: R }, { text: '45', ins: R }] }] })),
      'x.docx',
    );
    expect(data.changes[0]!.section_context).toBe('7.2) Payment terms');
  });

  test('changes in a header are reported with a null index and a warning, and count separately', () => {
    const data = extractRedlines(
      openDocx(buildDocx({ blocks: [{ runs: ['body'] }], header: [{ runs: ['Effective ', { text: 'Aug 1', del: R }, { text: 'Sep 1', ins: R }] }] })),
      'x.docx',
    );
    expect(data.summary.non_body_insertions).toBe(1);
    expect(data.summary.non_body_deletions).toBe(1);
    expect(data.summary.authors).toEqual(['R. Patel']);
    expect(data.changes.map(c => [c.paragraph_index, c.location, c.kind, c.original, c.revised])).toEqual([
      [null, 'header1', 'deletion', 'Aug 1', ''],
      [null, 'header1', 'insertion', '', 'Sep 1'],
    ]);
    expect(data.warnings).toEqual([
      'header1: 1 tracked insertion(s) and 1 deletion(s) outside the document body — reported here, but apply_redlines cannot edit this part. Review it directly.',
    ]);
  });

  test('a hostile header is refused and said so, and the body still extracts', () => {
    const hostile =
      '<?xml version="1.0"?><!DOCTYPE hdr [ <!ENTITY leak SYSTEM "file:///etc/hostname"> ]>' +
      '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:ins w:id="1" w:author="x"><w:r><w:t>&leak;</w:t></w:r></w:ins></w:p></w:hdr>';
    const data = extractRedlines(
      openDocx(buildDocx({ blocks: [{ runs: ['a', { text: 'b', ins: R }] }], rawParts: { 'word/header1.xml': hostile } })),
      'x.docx',
    );
    expect(data.changes).toHaveLength(1);
    expect(data.warnings).toEqual(['header1: refused — the part declares a DOCTYPE; review it directly.']);
    expect(JSON.stringify(data)).not.toContain('leak');
  });

  test('a document with no changes and no comments is an empty report', () => {
    const data = extractRedlines(openDocx(buildDocx({ blocks: [{ runs: ['plain'] }] })), 'x.docx');
    expect(data.summary.changed_paragraphs).toBe(0);
    expect(data.changes).toEqual([]);
    expect(data.comments).toEqual([]);
  });

  test('the markdown table', () => {
    const data = extractRedlines(
      openDocx(buildDocx({ blocks: [{ runs: ['Net ', { text: '30', del: R }, { text: '45', ins: R }], comment: '1' }], comments: [{ id: '1', author: 'R', date: AT, text: 'why | not' }] })),
      'dir/x.docx',
    );
    const md = extractToMarkdown(data);
    expect(md).toContain('# Redline extraction — x.docx');
    expect(md).toContain('**1 changed paragraphs** (1 insertions, 1 deletions), 1 comments. Authors: R. Patel.');
    expect(md).toContain('| 0 | body |  | replacement | Net 30 | Net 45 | R. Patel | 1 |');
    expect(md).toContain('- **[1] R** (2026-08-28, ¶0): why \\| not');
  });
});
