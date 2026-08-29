import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
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

  test('write with expectedVersion: null succeeds when the path does not exist yet', async () => {
    const v = await store.write('default', 'new.md', 'brand new', { expectedVersion: null });
    expect(v).toMatch(/^[0-9a-f]{64}$/);
    expect(await store.read('default', 'new.md')).toBe('brand new');
  });

  test('write with expectedVersion: null conflicts when the path was created in the meantime', async () => {
    await store.write('default', 'new.md', 'someone got there first');
    const actual = await store.version('default', 'new.md');
    let error: unknown;
    try {
      await store.write('default', 'new.md', 'my content', { expectedVersion: null });
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(VaultConflictError);
    expect((error as VaultConflictError).expected).toBe('missing');
    expect((error as VaultConflictError).actual).toBe(actual!);
    expect(await store.read('default', 'new.md')).toBe('someone got there first');
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

  test('backslash-separated paths are rejected — vault paths are forward-slash only on every host OS', async () => {
    // On a Windows host, `resolve`/`relative` use `path.win32` and would
    // otherwise resolve `a\b.md` *inside* `a/`, disagreeing with
    // `normalizeVaultPath` (`knowledge-paths.ts`), which treats a backslash
    // as one opaque, non-separator character.
    await expect(store.read('default', 'a\\b.md')).rejects.toThrow(/backslash/);
    await expect(store.write('default', 'a\\b.md', 'x')).rejects.toThrow(/backslash/);
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

  test('the reserved check is case-insensitive — APFS and NTFS are', async () => {
    // On a case-insensitive filesystem `.Counsel/` IS `.counsel/`, so a
    // case-sensitive compare would hand a model the audit trail.
    await expect(store.write('default', '.Counsel/history/default/x.jsonl', 'tampered')).rejects.toThrow(/reserved/);
    await expect(store.read('default', '.COUNSEL/anything')).rejects.toThrow(/reserved/);
  });

  test('a symlink pointing out of the vault is rejected', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'outside-'));
    writeFileSync(join(outside, 'secret.txt'), 'SECRET\n', 'utf8');
    // Spells clean, resolves outside: the lexical check alone cannot see it.
    symlinkSync(join(outside, 'secret.txt'), join(root, 'innocent.md'));

    await expect(store.read('default', 'innocent.md')).rejects.toThrow(/symlink/);
    await expect(store.write('default', 'innocent.md', 'overwritten')).rejects.toThrow(/symlink/);
  });

  test('a symlinked directory pointing out of the vault is rejected, even for a file that does not exist yet', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'outside-'));
    symlinkSync(outside, join(root, 'escape'));
    await expect(store.write('default', 'escape/new.md', 'planted')).rejects.toThrow(/symlink/);
    await expect(store.list('default', 'escape')).rejects.toThrow(/symlink/);
  });

  test('a symlink that stays inside the vault still works', async () => {
    mkdirSync(join(root, 'real'), { recursive: true });
    writeFileSync(join(root, 'real', 'notes.md'), 'INSIDE\n', 'utf8');
    symlinkSync(join(root, 'real'), join(root, 'alias'));

    expect(await store.read('default', 'alias/notes.md')).toBe('INSIDE\n');
    await store.write('default', 'alias/added.md', 'also inside');
    expect(await store.read('default', 'real/added.md')).toBe('also inside');
  });

  test('a symlink into .counsel/ is rejected — the lexical ban only sees the first segment', async () => {
    // `matters/x` spells clean: its first segment is `matters`, so `abs()`'s
    // reserved-path check never fires. Following it lands on the runtime's
    // own audit trail, which is exactly what the ban exists to stop.
    mkdirSync(join(root, '.counsel', 'threads'), { recursive: true });
    mkdirSync(join(root, 'matters'), { recursive: true });
    symlinkSync(join('..', '.counsel', 'threads'), join(root, 'matters', 'x'));

    await expect(store.read('default', 'matters/x')).rejects.toThrow(/reserved path/);
    await expect(store.read('default', 'matters/x/default.json')).rejects.toThrow(/reserved path/);
    await expect(store.write('default', 'matters/x/planted.md', 'planted')).rejects.toThrow(/reserved path/);
    await expect(store.list('default', 'matters/x')).rejects.toThrow(/reserved path/);
  });

  test('the reserved check is on the whole first segment, not a prefix', async () => {
    // `.counselor.md` is an ordinary vault file; only `.counsel` itself is reserved.
    const v = await store.write('default', '.counselor.md', 'fine');
    expect(await store.read('default', '.counselor.md')).toBe('fine');
    expect(v).toMatch(/^[0-9a-f]{64}$/);
  });

  test("list accepts both '' and '.' for the root — local models send either", async () => {
    // Across the ten Ollama spike runs `vault_list` was called with `{"dir":"."}`
    // seven times and `{"dir":""}` three times (spike 9.2). Tolerating both is
    // load-bearing for the local tier, so it is pinned here.
    await store.write('default', 'acme.md', '# Acme');
    await store.write('default', 'matters/beta.md', '# Beta');

    const empty = await store.list('default', '');
    const dot = await store.list('default', '.');
    const shape = (entries: Awaited<ReturnType<typeof store.list>>) => entries.map(e => `${e.kind}:${e.path}`).sort();

    expect(shape(empty)).toEqual(['dir:matters', 'file:acme.md']);
    // Identical, not merely equivalent: `join('.', name)` normalizes away the
    // leading `./`, so neither caller sees a different path shape.
    expect(shape(dot)).toEqual(shape(empty));
  });

  test('a root file whose name starts with two dots is a normal file, not an escape', async () => {
    // The old `rel.startsWith('..')` clause rejected this; `rel.split(sep)[0] === '..'`
    // is the correct escape check and the only one left.
    await store.write('default', '..foo.md', 'not an escape');
    expect(await store.read('default', '..foo.md')).toBe('not an escape');
  });
});
