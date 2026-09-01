import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { bodyHash, groupHash, stripFrontmatter } from './hash';

const REPO = resolve(import.meta.dir, '../../..');
const VERSIONS = JSON.parse(readFileSync(join(REPO, '.content-versions.json'), 'utf8')) as Record<string, { hash: string }>;

describe('stripFrontmatter', () => {
  test('removes a leading YAML block and nothing else', () => {
    expect(stripFrontmatter('---\na: 1\n---\nbody\n')).toBe('body\n');
    expect(stripFrontmatter('---  \na: 1\n---\t\nbody')).toBe('body');
    expect(stripFrontmatter('no block\n---\nlater\n---\n')).toBe('no block\n---\nlater\n---\n');
    expect(stripFrontmatter('')).toBe('');
  });

  test('a block that never closes is left alone', () => {
    expect(stripFrontmatter('---\na: 1\nbody')).toBe('---\na: 1\nbody');
  });
});

describe('bodyHash', () => {
  test('is the sha256 of the stripped body', () => {
    expect(bodyHash('---\nx: 1\n---\nhello\n')).toBe(bodyHash('hello\n'));
    expect(bodyHash('hello\n')).toHaveLength(64);
  });
});

describe('groupHash is the Python algorithm', () => {
  test('a fixture hashed by scripts/bump_content_versions.py: top-level *.md only, sorted, name banner + stripped body', () => {
    const dir = mkdtempSync(join(tmpdir(), 'content-hash-'));
    writeFileSync(join(dir, 'b.md'), '---\ncounsel-os-type: x\n---\nbeta\n');
    writeFileSync(join(dir, 'a.md'), 'alpha\n');
    writeFileSync(join(dir, 'notes.txt'), 'ignored\n');
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'sub', 'c.md'), 'nested ignored\n');
    // `python3 -c 'import bump_content_versions as b; print(b.hash_group(dir))'`
    expect(groupHash(dir)).toBe('5f32de715125a0ab4e7428b88ee81ec6ccba5ce763f3c1b9ab034b6b7debeaec');
  });

  test('agrees with .content-versions.json for a group whose record is current', () => {
    // `practice-seed/standards` was edited after its last bump, so the JSON
    // is stale there (the Python disagrees with it too); the law areas are
    // current, and the runtime's manifest carries the live hashes anyway.
    expect(groupHash(join(REPO, 'knowledge', 'law', 'corporate'))).toBe(VERSIONS['law/corporate']!.hash);
    expect(groupHash(join(REPO, 'knowledge', 'law', 'data-privacy'))).toBe(VERSIONS['law/data-privacy']!.hash);
  });
});
