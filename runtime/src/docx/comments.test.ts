import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addComment, anchorRuns, commentCount, ensureCommentsPart, initialsOf, revisionDate } from './comments';
import { extractRedlines } from './extract';
import { commentsOf, modelOf } from './model';
import { openDocx, serialize } from './package';
import { buildDocx } from './test/builder';

const AT = new Date('2026-09-01T12:00:00Z');

function hasPythonDocx(): boolean {
  try {
    execFileSync('python3', ['-c', 'import docx'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const oracle = hasPythonDocx() ? test : test.skip;

describe('comments', () => {
  test('initials and the revision date', () => {
    expect(initialsOf('Jack Wang')).toBe('JW');
    expect(initialsOf('  counsel   os ')).toBe('CO');
    expect(initialsOf('')).toBe('');
    expect(revisionDate(AT)).toBe('2026-09-01T12:00:00Z');
  });

  test('a document with no comments part gains one, with its content type and relationship', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: ['One.', { text: ' Two.', bold: true }] }] }));
    expect(pkg.hasPart('word/comments.xml')).toBe(false);
    const p = modelOf(pkg).paragraphs[0]!.element;
    expect(addComment(pkg, p, 'Why this changed.', 'Jack Wang', AT)).toBe(true);
    const out = openDocx(pkg.save());
    expect(out.hasPart('word/comments.xml')).toBe(true);
    expect(out.partText('[Content_Types].xml')).toContain('PartName="/word/comments.xml"');
    expect(out.partText('[Content_Types].xml')).toContain('wordprocessingml.comments+xml');
    expect(out.partText('word/_rels/document.xml.rels')).toContain('relationships/comments');
    expect(out.partText('word/_rels/document.xml.rels')).toContain('Target="comments.xml"');
    expect(commentsOf(out)).toEqual([{ id: '0', author: 'Jack Wang', date: '2026-09-01T12:00:00Z', initials: 'JW', text: 'Why this changed.' }]);
    // The anchors: start before the first run, end after the last, then the reference run.
    const xml = serialize(modelOf(out).paragraphs[0]!.element);
    expect(xml).toMatch(/<w:p[^>]*><w:commentRangeStart w:id="0"\/><w:r>.*<w:r>.*<\/w:r><w:commentRangeEnd w:id="0"\/><w:r><w:rPr><w:rStyle w:val="CommentReference"\/><\/w:rPr><w:commentReference w:id="0"\/><\/w:r><\/w:p>/s);
    expect(commentCount(out)).toBe(1);
  });

  test('an existing comments part gets the next id; extract reads it anchored', () => {
    const pkg = openDocx(
      buildDocx({
        blocks: [{ runs: ['First.'], comment: '4' }, { runs: ['Second.'] }],
        comments: [{ id: '4', author: 'R', date: '2026-01-01T00:00:00Z', text: 'earlier' }],
      }),
    );
    const p = modelOf(pkg).paragraphs[1]!.element;
    expect(addComment(pkg, p, 'later\nsecond line', 'Counsel OS', AT)).toBe(true);
    const out = openDocx(pkg.save());
    expect(commentsOf(out).map(c => [c.id, c.text])).toEqual([
      ['4', 'earlier'],
      ['5', 'later second line'],
    ]);
    const extracted = extractRedlines(out, 'x.docx');
    expect(extracted.comments.map(c => ('id' in c ? [c.id, c.paragraph_index, c.anchor_excerpt] : c))).toEqual([
      ['4', 0, 'First.'],
      ['5', 1, 'Second.'],
    ]);
    // The rels file was not duplicated.
    expect(out.partText('word/_rels/document.xml.rels').match(/relationships\/comments/g)).toHaveLength(1);
  });

  test('anchors fall back to hyperlink or insertion runs; nothing to anchor to → false', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: [{ text: 'link', hyperlink: 'rId9' }] }, { runs: [] }] }));
    const [linked, empty] = modelOf(pkg).paragraphs.map(p => p.element);
    expect(anchorRuns(linked!)).toHaveLength(1);
    expect(addComment(pkg, linked!, 'on a link', 'A B', AT)).toBe(true);
    expect(addComment(pkg, empty!, 'nowhere', 'A B', AT)).toBe(false);
    expect(commentCount(pkg)).toBe(1);
    expect(ensureCommentsPart(pkg).documentElement?.localName).toBe('comments');
  });

  oracle('python-docx opens the produced file and reads the comment (oracle)', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: ['The cap is two times fees.'] }] }));
    addComment(pkg, modelOf(pkg).paragraphs[0]!.element, 'Market cap.', 'Jack Wang', AT);
    const dir = mkdtempSync(join(tmpdir(), 'counsel-comments-'));
    try {
      const file = join(dir, 'out.docx');
      writeFileSync(file, pkg.save());
      const out = execFileSync(
        'python3',
        [
          '-c',
          [
            'import sys',
            'from docx import Document',
            'd = Document(sys.argv[1])',
            'cs = list(d.comments)',
            'print(len(cs), cs[0].author, cs[0].initials, cs[0].text)',
          ].join('\n'),
          file,
        ],
        { encoding: 'utf8' },
      );
      expect(out.trim()).toBe('1 Jack Wang JW Market cap.');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
