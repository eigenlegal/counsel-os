import { describe, expect, test } from 'bun:test';
import { prettifyName, readerModel, splitFrontmatter } from './frontmatter';

describe('splitFrontmatter', () => {
  test('simple key: value rows, underscores spaced for display', () => {
    const { rows, body } = splitFrontmatter('---\nstage: working\nnext_action: send document list\n---\n# H1\nBody.\n');
    expect(rows).toEqual([
      { key: 'stage', value: 'working' },
      { key: 'next action', value: 'send document list' },
    ]);
    expect(body).toBe('# H1\nBody.\n');
  });

  test('no frontmatter and unterminated frontmatter are just a body', () => {
    expect(splitFrontmatter('# H1\n').rows).toEqual([]);
    expect(splitFrontmatter('---\nstage: working\n').rows).toEqual([]);
    expect(splitFrontmatter('---\nstage: working\n').body).toBe('---\nstage: working\n');
  });

  test('nested and valueless lines are skipped, not mangled', () => {
    const { rows } = splitFrontmatter('---\nstage: working\nnested:\n  a: 1\n---\nBody.\n');
    expect(rows).toEqual([{ key: 'stage', value: 'working' }]);
  });
});

describe('readerModel', () => {
  test('frontmatter title beats the H1 beats the prettified filename; the H1 leaves the body', () => {
    const fm = readerModel('---\ntitle: From FM\n---\n# From H1\nBody.\n', 'matters/x.md');
    expect(fm.title).toBe('From FM');
    expect(fm.body).not.toContain('# From H1');

    const h1 = readerModel('# From H1\nBody.\n', 'matters/x.md');
    expect(h1.title).toBe('From H1');
    expect(h1.body).toBe('Body.\n');

    const bare = readerModel('no headings\n', 'matters/2026-06-vendora-worldpay.md');
    expect(bare.title).toBe('Vendora worldpay');
  });
});

describe('prettifyName', () => {
  test('date prefix and extension off, dashes spaced, first letter up', () => {
    expect(prettifyName('2026-06-vendora-worldpay.md')).toBe('Vendora worldpay');
    expect(prettifyName('acme_nda.md')).toBe('Acme nda');
  });
});
