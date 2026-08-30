import { describe, expect, test, beforeEach } from 'bun:test';
import { chmodSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { fsSearch } from './search';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'search-vault-'));
});

function put(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

describe('fsSearch', () => {
  test('finds a term and returns the vault-relative path with a snippet', async () => {
    put('matters/acme/notes.md', '# Acme\n\nThe indemnity cap is 2x fees.\n');
    const hits = await fsSearch()('indemnity', root);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.path).toBe('matters/acme/notes.md');
    expect(hits[0]!.snippet).toBe('The indemnity cap is 2x fees.');
    expect(hits[0]!.score).toBe(1);
  });

  test('returns nothing when no file contains the term', async () => {
    put('matters/acme/notes.md', 'nothing relevant here\n');
    expect(await fsSearch()('indemnity', root)).toEqual([]);
  });

  test('empty or whitespace-only query returns no hits', async () => {
    put('a.md', 'anything at all\n');
    expect(await fsSearch()('', root)).toEqual([]);
    expect(await fsSearch()('   ', root)).toEqual([]);
  });

  test('skips the reserved .counsel dir, dotfiles, and node_modules', async () => {
    put('.counsel/history/default/a.md', 'indemnity\n');
    put('.hidden/secret.md', 'indemnity\n');
    put('.env.md', 'indemnity\n');
    put('node_modules/pkg/readme.md', 'indemnity\n');
    put('visible.md', 'indemnity\n');
    const hits = await fsSearch()('indemnity', root);
    expect(hits.map(h => h.path)).toEqual(['visible.md']);
  });

  test('matches case-insensitively in both directions', async () => {
    put('a.md', 'The INDEMNITY Cap\n');
    expect((await fsSearch()('indemnity', root)).map(h => h.path)).toEqual(['a.md']);
    expect((await fsSearch()('INDEMNITY', root)).map(h => h.path)).toEqual(['a.md']);
  });

  test('multi-term queries are AND — a file with only one term does not match', async () => {
    put('both.md', 'the indemnity cap is negotiated\n');
    put('one.md', 'the indemnity clause stands alone\n');
    const hits = await fsSearch()('indemnity cap', root);
    expect(hits.map(h => h.path)).toEqual(['both.md']);
  });

  test('a term in the path counts as a match, and the path is the snippet', async () => {
    put('matters/indemnity-review/notes.md', 'no keyword in the body\n');
    const hits = await fsSearch()('indemnity', root);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.path).toBe('matters/indemnity-review/notes.md');
    expect(hits[0]!.snippet).toBe('matters/indemnity-review/notes.md');
    expect(hits[0]!.score).toBe(1);
  });

  test('sorts by score descending, then by path ascending', async () => {
    put('b.md', 'cap cap cap\n');
    put('a.md', 'cap\n');
    put('c.md', 'cap\n');
    const hits = await fsSearch()('cap', root);
    expect(hits.map(h => h.path)).toEqual(['b.md', 'a.md', 'c.md']);
    expect(hits[0]!.score).toBe(3);
  });

  test('honours maxHits', async () => {
    for (let i = 0; i < 10; i++) put(`f${i}.md`, 'indemnity\n');
    const hits = await fsSearch({ maxHits: 3 })('indemnity', root);
    expect(hits).toHaveLength(3);
  });

  test('skips files larger than maxFileBytes', async () => {
    put('big.md', 'indemnity ' + 'x'.repeat(5000) + '\n');
    put('small.md', 'indemnity\n');
    const hits = await fsSearch({ maxFileBytes: 1000 })('indemnity', root);
    expect(hits.map(h => h.path)).toEqual(['small.md']);
  });

  test('only searches known text extensions', async () => {
    put('a.md', 'indemnity\n');
    put('b.pdf', 'indemnity\n');
    put('c.png', 'indemnity\n');
    expect((await fsSearch()('indemnity', root)).map(h => h.path)).toEqual(['a.md']);
    put('d.txt', 'indemnity\n');
    expect((await fsSearch()('indemnity', root)).map(h => h.path).sort()).toEqual(['a.md', 'd.txt']);
  });

  test('never follows symlinks — not a linked file, not a linked directory', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'search-outside-'));
    writeFileSync(join(outside, 'leak.md'), 'indemnity\n', 'utf8');
    put('real.md', 'indemnity\n');
    symlinkSync(join(outside, 'leak.md'), join(root, 'link.md'));
    symlinkSync(outside, join(root, 'linkdir'));
    const hits = await fsSearch()('indemnity', root);
    expect(hits.map(h => h.path)).toEqual(['real.md']);
  });

  // Root can read a mode-000 file, so the premise does not hold there.
  test.skipIf(process.getuid?.() === 0)('an unreadable file is skipped, not thrown on', async () => {
    put('locked.md', 'indemnity\n');
    chmodSync(join(root, 'locked.md'), 0o000);
    put('ok.md', 'indemnity\n');
    const hits = await fsSearch()('indemnity', root);
    expect(hits.map(h => h.path)).toEqual(['ok.md']);
  });

  test('a snippet longer than 200 chars is trimmed', async () => {
    put('a.md', '   indemnity ' + 'y'.repeat(500) + '\n');
    const hits = await fsSearch()('indemnity', root);
    expect(hits[0]!.snippet).toHaveLength(200);
    expect(hits[0]!.snippet.startsWith('indemnity')).toBe(true);
  });

  test('score sums occurrences across every term, path matches counting one each', async () => {
    put('cap/a.md', 'indemnity indemnity cap\n');
    const hits = await fsSearch()('indemnity cap', root);
    // 2 content hits for `indemnity`, 1 content hit + 1 path hit for `cap`.
    expect(hits[0]!.score).toBe(4);
  });

  test('drops English stopwords before matching, so a natural-language query still ANDs', async () => {
    put('a.md', 'indemnity clause\n');
    // `the` never appears in the file; dropped as a stopword, the query is
    // just `indemnity` and still matches under AND.
    expect((await fsSearch()('the indemnity', root)).map(h => h.path)).toEqual(['a.md']);
  });

  test('a query of nothing but stopwords keeps them — otherwise it would match everything', async () => {
    put('a.md', 'the cap is agreed\n');
    put('b.md', 'no such word here\n');
    expect((await fsSearch()('the', root)).map(h => h.path)).toEqual(['a.md']);
  });

  test('falls back to OR when AND finds nothing — a full question finds the one word that hits', async () => {
    put('a.md', 'the indemnity cap is 2x fees\n');
    put('b.md', 'unrelated notes\n');
    const hits = await fsSearch()('what is our indemnity position', root);
    expect(hits.map(h => h.path)).toEqual(['a.md']);
    expect(hits[0]!.snippet).toBe('the indemnity cap is 2x fees');
  });

  test('the OR fallback ranks a file matching more distinct terms above one matching fewer', async () => {
    // No file has all three terms, so the fallback runs. `one.md` mentions its
    // single term five times and must still lose to the file covering two.
    put('one.md', 'indemnity indemnity indemnity indemnity indemnity\n');
    put('two.md', 'indemnity and arbitration\n');
    const hits = await fsSearch()('indemnity arbitration waiver', root);
    expect(hits.map(h => h.path)).toEqual(['two.md', 'one.md']);
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);
  });

  test('AND wins whenever it has hits — the fallback never dilutes a precise query', async () => {
    put('both.md', 'indemnity cap\n');
    put('one.md', 'indemnity indemnity indemnity\n');
    const hits = await fsSearch()('indemnity cap', root);
    expect(hits.map(h => h.path)).toEqual(['both.md']);
  });

  test('the OR fallback still returns nothing when no term matches anywhere', async () => {
    put('a.md', 'unrelated notes\n');
    expect(await fsSearch()('indemnity arbitration', root)).toEqual([]);
  });

  test('a store built with fsSearch actually searches', async () => {
    const store = new FsVaultStore(root, { search: fsSearch() });
    await store.write('default', 'matters/acme/notes.md', 'the indemnity cap\n');
    const hits = await store.search('default', 'indemnity');
    expect(hits.map(h => h.path)).toEqual(['matters/acme/notes.md']);
  });
});
