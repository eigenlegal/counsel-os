import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('desktop startup chooses its own port, enforces origin/auth and stops on parent EOF', async () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-desktop-lease-'));
  const launch = join(import.meta.dir, 'launch.ts'), database = join(root, 'workspace.sqlite3');
  const children: ReturnType<typeof Bun.spawn>[] = [];
  const start = () => { const child = Bun.spawn([process.execPath, launch, '--desktop', '--skip-build', '--database', database], {
    env: { HOME: root, PATH: '/usr/bin:/bin' }, stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
  }); children.push(child); return child; };
  try {
    for (let run = 0; run < 2; run++) {
      const child = start(), reader = child.stdout.getReader();
      const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
      try {
        let text = '';
        while (!text.includes('\n')) { const chunk = await reader.read(); if (chunk.done) break; text += new TextDecoder().decode(chunk.value); }
        const ready = JSON.parse(text.trim());
        expect(ready.protocol).toBe(1); expect(ready.pid).toBe(child.pid); expect(ready.databasePath).toBe(database);
        expect(ready.origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/); expect(new URL(ready.origin).port).not.toBe('0');
        const endpoint = ready.origin + '/api/workspace';
        expect((await fetch(endpoint)).status).toBe(401);
        expect((await fetch(endpoint, { headers: { Authorization: `Bearer ${ready.token}` } })).status).toBe(200);
        expect((await fetch(endpoint, { headers: { Authorization: `Bearer ${ready.token}`, Origin: 'https://outside.invalid' } })).status).toBe(403);
        if (!run) {
          const other = start(); other.stdin.end();
          expect(await other.exited).not.toBe(0);
          expect((await new Response(other.stderr).text())).toContain('already running');
        }
        child.stdin.end(); expect(await child.exited).toBe(0);
        await expect(fetch(endpoint)).rejects.toThrow();
      } finally { clearTimeout(timer); reader.releaseLock(); }
    }
  } finally {
    for (const child of children) { if (child.exitCode === null) child.kill('SIGKILL'); await child.exited; }
    rmSync(root, { recursive: true, force: true });
  }
}, 25_000);
