import { describe, expect, test } from 'bun:test';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { knownCliDirs, locateCli, searchDirs } from './cli-locate';
import { accessSync, constants, statSync } from 'node:fs';

/** The real check, confined to `root`: the machine's own /opt/homebrew/bin
 * must not answer for a test about a temp PATH. */
function under(root: string): (path: string) => boolean {
  return path => {
    if (!path.startsWith(root)) return false;
    try {
      if (!statSync(path).isFile()) return false;
      accessSync(path, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  };
}

function fakeBin(dir: string, name: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, '#!/bin/sh\necho hi\n', 'utf8');
  chmodSync(path, 0o755);
  return path;
}

describe('locateCli', () => {
  test('PATH wins, in PATH order', () => {
    const root = mkdtempSync(join(tmpdir(), 'cli-locate-'));
    const first = fakeBin(join(root, 'a'), 'claude');
    fakeBin(join(root, 'b'), 'claude');
    const env = { PATH: `${join(root, 'a')}:${join(root, 'b')}`, HOME: join(root, 'home') };
    expect(locateCli('claude', { env, home: env.HOME, isExecutable: under(root) })).toBe(first);
  });

  test('a CLI missing from PATH is found in the vendors\' known directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'cli-locate-'));
    const home = join(root, 'home');
    const native = fakeBin(join(home, '.claude', 'local'), 'claude');
    const env = { PATH: join(root, 'nothing-here'), HOME: home };
    expect(locateCli('claude', { env, home, isExecutable: under(root) })).toBe(native);
    expect(locateCli('codex', { env, home, isExecutable: under(root) })).toBeNull();
  });

  test('a non-executable file does not count', () => {
    const root = mkdtempSync(join(tmpdir(), 'cli-locate-'));
    mkdirSync(join(root, 'bin'), { recursive: true });
    writeFileSync(join(root, 'bin', 'codex'), 'not a program\n', 'utf8');
    chmodSync(join(root, 'bin', 'codex'), 0o644);
    expect(locateCli('codex', { env: { PATH: join(root, 'bin'), HOME: root }, home: root, isExecutable: under(root) })).toBeNull();
  });

  test('the search order is PATH, then the known dirs, without repeats', () => {
    const env = { PATH: '/opt/homebrew/bin:/usr/bin', HOME: '/Users/x', NPM_CONFIG_PREFIX: '/Users/x/npm' };
    const dirs = searchDirs({ env, home: '/Users/x' });
    expect(dirs.slice(0, 2)).toEqual(['/opt/homebrew/bin', '/usr/bin']);
    expect(dirs.filter(d => d === '/opt/homebrew/bin')).toHaveLength(1);
    expect(dirs).toContain('/Users/x/.claude/local');
    expect(dirs).toContain('/Users/x/npm/bin');
    expect(knownCliDirs('/Users/x', {})[0]).toBe('/Users/x/.claude/local');
  });
});
