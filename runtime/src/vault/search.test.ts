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
    expect(hits[0]!.score).toBeGreaterThan(0);
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
    expect(hits[0]!.score).toBeGreaterThan(0);
  });

  test('sorts by score descending, then by path ascending', async () => {
    put('b.md', 'cap cap cap\n');
    put('a.md', 'cap\n');
    put('c.md', 'cap\n');
    const hits = await fsSearch()('cap', root);
    expect(hits.map(h => h.path)).toEqual(['b.md', 'a.md', 'c.md']);
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);
    expect(hits[1]!.score).toBe(hits[2]!.score);
  });

  test('honours maxHits', async () => {
    for (let i = 0; i < 10; i++) put(`f${i}.md`, 'indemnity\n');
    const hits = await fsSearch({ maxHits: 3 })('indemnity', root);
    expect(hits).toHaveLength(3);
    // Equal scores, so the path tiebreak makes the survivors deterministic.
    expect(hits.map(h => h.path)).toEqual(['f0.md', 'f1.md', 'f2.md']);
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

  test('scores on one idf scale — rarity times a damped occurrence count', async () => {
    put('a.md', 'indemnity\n');
    // One file scanned, one file matching: idf = ln(1 + 1/1), and a single
    // occurrence contributes (1 + ln 1) = 1.
    expect((await fsSearch()('indemnity', root))[0]!.score).toBeCloseTo(Math.log(2), 10);
    put('b.md', 'cap cap cap\n');
    // Two files scanned now, `cap` in one of them: idf = ln(1 + 2/1).
    const capHit = (await fsSearch()('cap', root))[0]!;
    expect(capHit.score).toBeCloseTo(Math.log(3) * (1 + Math.log(3)), 10);
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

  test('the OR fallback ranks covering a rare term above repeating a common one', async () => {
    // `indemnity` is everywhere in this vault, `arbitration` is in one file.
    for (let i = 0; i < 10; i++) put(`filler-${i}.md`, 'indemnity\n');
    put('one.md', 'indemnity indemnity indemnity indemnity indemnity\n');
    put('two.md', 'indemnity and arbitration\n');
    // No file has all three terms, so the fallback runs.
    const hits = await fsSearch()('indemnity arbitration waiver', root);
    expect(hits[0]!.path).toBe('two.md');
    expect(hits[1]!.path).toBe('one.md');
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

  test('punctuation is not part of a word — a question, a quoted phrase, a full stop', async () => {
    put('matters/acme/notes.md', 'The indemnity cap is 2x fees.\n');
    const s = fsSearch();
    expect((await s('what is our indemnity?', root)).map(h => h.path)).toEqual(['matters/acme/notes.md']);
    expect((await s('"indemnity cap"', root)).map(h => h.path)).toEqual(['matters/acme/notes.md']);
    expect((await s('find the indemnity.', root)).map(h => h.path)).toEqual(['matters/acme/notes.md']);
  });

  test('a comma between two terms still leaves both terms — not one term and one hit', async () => {
    put('both.md', 'the indemnity cap is 2x fees\n');
    put('one.md', 'the cap alone\n');
    // `indemnity, cap` used to tokenize as `indemnity,` + `cap`, dropping to
    // the OR fallback and returning `one.md` as a plausible-looking hit.
    expect((await fsSearch()('indemnity, cap', root)).map(h => h.path)).toEqual(['both.md']);
  });

  test('the OR fallback ranks a rare term above a pile of common ones', async () => {
    for (let i = 0; i < 20; i++) put(`checklist-${i}.md`, 'how do we handle a new client\n');
    put('notes.md', 'the indemnity cap is 2x fees\n');
    const hits = await fsSearch()('how do we handle indemnity', root);
    // No file has all five terms, so the fallback runs. The checklists each
    // match four common words; `notes.md` matches the one word that means
    // something, and must still come first.
    expect(hits[0]!.path).toBe('notes.md');
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);
  });

  test('a non-text file matches on its filename, with the path as the snippet', async () => {
    put('matters/acme/MSA-indemnity-signed.pdf', 'binary-ish contents\n');
    const hits = await fsSearch()('indemnity', root);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.path).toBe('matters/acme/MSA-indemnity-signed.pdf');
    expect(hits[0]!.snippet).toBe('matters/acme/MSA-indemnity-signed.pdf');
  });

  test('an extensionless file matches on its filename too', async () => {
    put('matters/acme/indemnity-README', 'nothing\n');
    expect((await fsSearch()('indemnity', root)).map(h => h.path)).toEqual(['matters/acme/indemnity-README']);
  });

  test('.counsel and node_modules are skipped at depth, not just at the root', async () => {
    put('matters/acme/.counsel/leak.md', 'indemnity\n');
    put('matters/acme/node_modules/p/readme.md', 'indemnity\n');
    put('matters/acme/.hidden/leak.md', 'indemnity\n');
    put('matters/acme/real.md', 'indemnity\n');
    expect((await fsSearch()('indemnity', root)).map(h => h.path)).toEqual(['matters/acme/real.md']);
  });

  test('a CRLF file does not leave a carriage return on the snippet', async () => {
    put('a.md', 'first line\r\nthe indemnity cap\r\nlast line\r\n');
    expect((await fsSearch()('indemnity', root))[0]!.snippet).toBe('the indemnity cap');
  });

  test('a binary file is not searched for content, even under a text extension', async () => {
    writeFileSync(join(root, 'binary.txt'), Buffer.concat([Buffer.from('\u0000\u0001'), Buffer.from('indemnity')]));
    put('real.md', 'indemnity\n');
    expect((await fsSearch()('indemnity', root)).map(h => h.path)).toEqual(['real.md']);
  });

  test('a vault root that does not exist returns no hits rather than throwing', async () => {
    expect(await fsSearch()('indemnity', join(root, 'nope'))).toEqual([]);
  });

  test('a store built with fsSearch actually searches', async () => {
    const store = new FsVaultStore(root, { search: fsSearch() });
    await store.write('default', 'matters/acme/notes.md', 'the indemnity cap\n');
    const hits = await store.search('default', 'indemnity');
    expect(hits.map(h => h.path)).toEqual(['matters/acme/notes.md']);
  });
});
