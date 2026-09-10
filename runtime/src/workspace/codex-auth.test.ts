import { expect, test } from 'bun:test';
import { resolve } from 'node:path';

test('Codex login copies are private, per-turn, refreshed from source, never API-fallback and removed after success/failure/cancel', async () => {
  const child = Bun.spawn([process.execPath, resolve(import.meta.dir, 'fixtures/codex-auth-lifecycle.ts')], {
    env: { PATH: process.env.PATH }, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe',
  });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 8_000);
  try {
    const [output, errors, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    expect(errors).toBe(''); expect(exit).toBe(0);
    const checks = JSON.parse(output);
    expect(Object.keys(checks)).toHaveLength(20);
    expect(Object.values(checks).every(value => value === true)).toBe(true);
  } finally { clearTimeout(timeout); if (child.exitCode === null) { child.kill('SIGKILL'); await child.exited; } }
}, 10_000);
