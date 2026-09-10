import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('credential lease waits are cancellable and OS releases the lease after a real host SIGKILL', async () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-cache-test-'));
  mkdirSync(join(root, 'source'));
  writeFileSync(join(root, 'source', 'auth.json'), JSON.stringify({ auth_mode: 'chatgpt', tokens: { fixtureGeneration: 1 } }), { mode: 0o600 });
  const spawn = (flag = '') => Bun.spawn([process.execPath, join(import.meta.dir, 'fixtures/codex-cache-worker.ts'), flag], { env: { HOME: root, PATH: process.env.PATH }, stdout: 'pipe', stderr: 'pipe' });
  const child = spawn('--hold'), timeout = setTimeout(() => child.kill('SIGKILL'), 6_000);
  try {
    const reader = child.stdout.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('acquired'); reader.releaseLock();
    const cancelled = spawn('--cancel');
    expect(await new Response(cancelled.stdout).text()).toBe('cancelled\n');
    expect(await cancelled.exited).toBe(0);
    child.kill('SIGKILL'); await child.exited;
    expect(child.signalCode).toBe('SIGKILL');
    const next = spawn();
    expect(await new Response(next.stdout).text()).toBe('acquired\n');
    expect(await next.exited).toBe(0);
  } finally { clearTimeout(timeout); if (child.exitCode === null) child.kill('SIGKILL'); await child.exited; rmSync(root, { recursive: true, force: true }); }
}, 10_000);
