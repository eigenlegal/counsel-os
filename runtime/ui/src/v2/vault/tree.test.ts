import { describe, expect, test } from 'bun:test';
import type { VaultEntry, VaultOverview } from '../../api/types';
import { groupRoot, monthLabel } from './tree';

const overview: VaultOverview = {
  matters: [
    { path: 'matters/2026-04-sinai-license.md', title: 'Sinai content license', frontmatter: {}, mtimeMs: 100 },
    { path: 'matters/acme.md', title: 'Acme Corp — NDA', frontmatter: {}, mtimeMs: 200 },
  ],
  groups: { practice: 2, knowledge: 1, other: 4 },
};

const root: VaultEntry[] = [
  { path: 'matters', kind: 'dir' },
  { path: 'practice', kind: 'dir' },
  { path: 'memory', kind: 'dir' },
  { path: 'law', kind: 'dir' },
  { path: 'entities', kind: 'dir' },
  { path: 'config.md', kind: 'file' },
  { path: 'scratch', kind: 'dir' },
];

describe('groupRoot', () => {
  test('matters from the overview; practice, knowledge and the rest from the root listing', () => {
    const groups = groupRoot(root, overview);
    expect(groups.mattersDir).toBe('matters');
    expect(groups.matters.map(m => m.title)).toEqual(['Sinai content license', 'Acme Corp — NDA']);
    expect(groups.practice.map(e => e.path)).toEqual(['practice']);
    expect(groups.knowledge.map(e => e.path)).toEqual(['memory', 'law', 'entities']);
    expect(groups.other.map(e => e.path)).toEqual(['config.md', 'scratch']);
  });

  test('with no matters at all, a root "matters" dir still does not leak into Other', () => {
    const groups = groupRoot(root, { matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
    expect(groups.matters).toEqual([]);
    expect(groups.other.map(e => e.path)).toEqual(['config.md', 'scratch']);
  });

  test('knowledge keeps the spec order even when the caller sorts the root', () => {
    const sorted = [...root].sort((a, b) => a.path.localeCompare(b.path));
    expect(groupRoot(sorted, overview).knowledge.map(e => e.path)).toEqual(['memory', 'law', 'entities']);
  });
});

describe('monthLabel', () => {
  test('the filename date wins; mtime is the fallback', () => {
    expect(monthLabel({ path: 'matters/2026-04-sinai-license.md', mtimeMs: 0 })).toBe('Apr');
    expect(monthLabel({ path: 'matters/acme.md', mtimeMs: new Date('2026-06-15T00:00:00Z').getTime() })).toBe('Jun');
  });
});
