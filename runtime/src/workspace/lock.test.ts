import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, existsSync, lstatSync, writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lockWorkspace } from './lock';
import { WorkspaceStore } from './store';

test('concurrent launch and stale-owner recovery admit exactly one process; SIGKILL releases the OS lock', async () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-lock-test-')), path = join(root, 'workspace.sqlite3');
  const children: ReturnType<typeof Bun.spawn>[] = [];
  const deadline = setTimeout(() => { for (const child of children) if (child.exitCode === null) child.kill('SIGKILL'); }, 12_000);
  try {
    for (let round = 0; round < 3; round++) {
      const contenders = Array.from({ length: 8 }, () => Bun.spawn([process.execPath, join(import.meta.dir, 'fixtures/lock-contender.ts'), path], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }));
      children.push(...contenders);
      for (const child of contenders) child.stdin.end();
      const results = await Promise.all(contenders.map(async child => {
        const reader = child.stdout.getReader(); const first = await reader.read(); reader.releaseLock();
        if (!first.value) throw new Error('Lock contender did not report: ' + await new Response(child.stderr).text());
        return JSON.parse(new TextDecoder().decode(first.value)) as { acquired: boolean; pid?: number; error?: string };
      }));
      expect(results.filter(value => value.acquired)).toHaveLength(1);
      expect(results.filter(value => !value.acquired).every(value => value.error?.includes('already running'))).toBe(true);
      const winner = contenders[results.findIndex(value => value.acquired)]!;
      expect(readFileSync(path + '.lock', 'utf8')).toBe(String(winner.pid));
      expect(() => lockWorkspace(path)).toThrow('already running');
      // The launcher mutex must not hold any transaction in the actual data DB.
      const store = new WorkspaceStore({ databasePath: path });
      store.createMatter({ title: `Preserved round ${round}` }); store.close();
      winner.kill('SIGKILL'); await Promise.all(contenders.map(child => child.exited));
      expect(winner.signalCode).toBe('SIGKILL');
      expect(existsSync(path + '.lock')).toBe(true);
    }
    const release = lockWorkspace(path), inode = lstatSync(path + '.launcher-lock.sqlite3').ino;
    release(); release();
    const next = lockWorkspace(path); release();
    expect(() => lockWorkspace(path)).toThrow('already running');
    expect(lstatSync(path + '.launcher-lock.sqlite3').ino).toBe(inode);
    next();
    const store = new WorkspaceStore({ databasePath: path });
    expect(store.listMatters()).toHaveLength(3); store.close();
  } finally {
    clearTimeout(deadline); for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
    await Promise.all(children.map(child => child.exited)); rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('legacy live/invalid locks and symlinks fail closed without removing other files', () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-lock-test-')), path = join(root, 'workspace.sqlite3');
  try {
    writeFileSync(path + '.lock', String(process.pid));
    expect(() => lockWorkspace(path)).toThrow('already running');
    expect(readFileSync(path + '.lock', 'utf8')).toBe(String(process.pid));
    writeFileSync(path + '.lock', 'incomplete');
    expect(() => lockWorkspace(path)).toThrow('inspection');
    expect(readFileSync(path + '.lock', 'utf8')).toBe('incomplete');
    const other = join(root, 'other.sqlite3');
    symlinkSync(path + '.lock', other + '.launcher-lock.sqlite3');
    expect(() => lockWorkspace(other)).toThrow('inspection');
    expect(readFileSync(path + '.lock', 'utf8')).toBe('incomplete');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
