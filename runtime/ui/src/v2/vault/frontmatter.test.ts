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

  test('a # line inside a fence is an example, not the title — and stays in the body', () => {
    const model = readerModel('```\n# install\n```\n# Real title\nBody.\n', 'matters/x.md');
    expect(model.title).toBe('Real title');
    expect(model.body).toContain('# install');
    expect(model.body).not.toContain('# Real title');
  });

  test('the H1 is cut where it sits, not wherever its text first appears', () => {
    const model = readerModel('Talk about # Acme first.\n\n# Acme\nBody.\n', 'matters/x.md');
    expect(model.title).toBe('Acme');
    expect(model.body).toContain('Talk about # Acme first.');
    expect(model.body).toContain('Body.');
  });
});

describe('prettifyName', () => {
  test('date prefix and extension off, dashes spaced, first letter up', () => {
    expect(prettifyName('2026-06-vendora-worldpay.md')).toBe('Vendora worldpay');
    expect(prettifyName('acme_nda.md')).toBe('Acme nda');
  });

  test('a date-only name stays whole — the lookahead stops the day group backtracking', () => {
    expect(prettifyName('2026-06-01.md')).toBe('2026 06 01');
  });
});

describe('frontmatter cleanup (founder feedback 2026-08-31)', () => {
  test('plumbing keys are hidden and hyphens humanize like underscores', () => {
    const { rows } = splitFrontmatter('---\ncounsel-os-type: matter\nmatter-id: 2026-06-acme\nclient: Acme\n---\nBody.\n');
    expect(rows).toEqual([
      { key: 'matter id', value: '2026-06-acme' },
      { key: 'client', value: 'Acme' },
    ]);
  });
});

describe('the privacy flag in the facts block (providers spec §7)', () => {
  test('stays_local reads as yes / no, never true / false', () => {
    expect(splitFrontmatter('---\nstays_local: true\nstage: working\n---\nbody\n').rows).toEqual([
      { key: 'stays local', value: 'yes' },
      { key: 'stage', value: 'working' },
    ]);
    expect(splitFrontmatter('---\nstays-local: FALSE\n---\n').rows).toEqual([{ key: 'stays local', value: 'no' }]);
  });
});
