import { describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../../chat/turns';
import { linkCitations, readPathsOf } from './cite';

function read(path: string): ToolCallView {
  return { id: `r-${path}`, name: 'vault_read', input: { path }, hasResult: true };
}

describe('readPathsOf', () => {
  test('unique vault_read paths, in first-read order; other tools ignored', () => {
    const tools: ToolCallView[] = [
      { id: 's', name: 'vault_search', input: { query: 'x' }, hasResult: true },
      read('practice/standards/nda.md'),
      read('matters/acme-nda.md'),
      read('practice/standards/nda.md'),
    ];
    expect(readPathsOf(tools)).toEqual(['practice/standards/nda.md', 'matters/acme-nda.md']);
  });
});

describe('linkCitations', () => {
  const paths = ['practice/standards/nda.md', 'memory/decisions.md'];

  test('backticked mentions of read files become vault links, by basename or full path', () => {
    const out = linkCitations('Your standard still says so `nda.md`, per `memory/decisions.md`.', paths);
    expect(out).toContain('[`nda.md`](#/vault?path=practice%2Fstandards%2Fnda.md)');
    expect(out).toContain('[`memory/decisions.md`](#/vault?path=memory%2Fdecisions.md)');
  });

  test('bare prose words and files the step never read are left alone', () => {
    expect(linkCitations('the nda.md file, unquoted', paths)).toBe('the nda.md file, unquoted');
    expect(linkCitations('see `other.md`', paths)).toBe('see `other.md`');
  });

  test('an already-linked mention is not double-wrapped', () => {
    const once = linkCitations('see `nda.md`', paths);
    expect(linkCitations(once, paths)).toBe(once);
  });
});
