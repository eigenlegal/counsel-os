import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { VaultConflictError } from '../core/types';

let root: string;
let store: FsVaultStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'vault-'));
  store = new FsVaultStore(root);
});

describe('FsVaultStore', () => {
  test('write then read round-trips and returns a content-hash version', async () => {
    const v = await store.write('default', 'matters/acme/notes.md', '# Acme\n');
    expect(v).toMatch(/^[0-9a-f]{64}$/);
    expect(await store.read('default', 'matters/acme/notes.md')).toBe('# Acme\n');
    expect(await store.version('default', 'matters/acme/notes.md')).toBe(v);
  });

  test('write with a stale expectedVersion throws VaultConflictError', async () => {
    const v1 = await store.write('default', 'a.md', 'one');
    await store.write('default', 'a.md', 'two');
    await expect(store.write('default', 'a.md', 'three', { expectedVersion: v1 })).rejects.toBeInstanceOf(VaultConflictError);
    expect(await store.read('default', 'a.md')).toBe('two');
  });

  test('write with the current expectedVersion succeeds', async () => {
    const v1 = await store.write('default', 'a.md', 'one');
    const v2 = await store.write('default', 'a.md', 'two', { expectedVersion: v1 });
    expect(v2).not.toBe(v1);
  });

  test('list returns files and dirs, history is newest first', async () => {
    await store.write('default', 'd/x.md', '1');
    await store.write('default', 'd/x.md', '2');
    await store.write('default', 'd/sub/y.md', 'y');
    const entries = await store.list('default', 'd');
    expect(entries.map(e => `${e.kind}:${e.path}`).sort()).toEqual(['dir:d/sub', 'file:d/x.md']);
    const h = await store.history('default', 'd/x.md');
    expect(h).toHaveLength(2);
    const currentVersion = await store.version('default', 'd/x.md');
    expect(h[0]).toBe(currentVersion!);
  });

  test('paths that escape the root are rejected', async () => {
    await expect(store.read('default', '../etc/passwd')).rejects.toThrow(/outside vault/);
  });

  test('version of a missing file is null', async () => {
    expect(await store.version('default', 'missing.md')).toBeNull();
  });

  test('history rejects paths that escape the root', async () => {
    await expect(store.history('default', '../../etc/passwd')).rejects.toThrow(/outside vault/);
  });

  test('write into .counsel/ is rejected — the version history is not model-writable', async () => {
    await expect(store.write('default', '.counsel/history/default/x.jsonl', 'tampered')).rejects.toThrow(/reserved/);
  });

  test('read from .counsel/ is rejected', async () => {
    await expect(store.read('default', '.counsel/anything')).rejects.toThrow(/reserved/);
  });

  test('the reserved check is on the whole first segment, not a prefix', async () => {
    // `.counselor.md` is an ordinary vault file; only `.counsel` itself is reserved.
    const v = await store.write('default', '.counselor.md', 'fine');
    expect(await store.read('default', '.counselor.md')).toBe('fine');
    expect(v).toMatch(/^[0-9a-f]{64}$/);
  });

  test('a root file whose name starts with two dots is a normal file, not an escape', async () => {
    // The old `rel.startsWith('..')` clause rejected this; `rel.split(sep)[0] === '..'`
    // is the correct escape check and the only one left.
    await store.write('default', '..foo.md', 'not an escape');
    expect(await store.read('default', '..foo.md')).toBe('not an escape');
  });
});
