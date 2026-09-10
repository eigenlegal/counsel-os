import { expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { codexCancellation } from './codex-cancellation';

test('finished Codex runs detach delayed deadlines; active and already-aborted requests still cancel', () => {
  const finished = new AbortController(), active = new AbortController();
  const old = codexCancellation(finished.signal), current = codexCancellation(active.signal);
  old.release(); old.release(); finished.abort();
  expect(old.signal.aborted).toBe(false);
  active.abort('synthetic reason');
  expect(current.signal.aborted).toBe(true);
  expect(current.signal.reason).toBe('synthetic reason');
  expect(codexCancellation(active.signal).signal.aborted).toBe(true);
  current.release();
});
test('real SDK child cleanup cannot crash Bun on a later deadline, and active cancellation is reaped', async () => {
  for (const args of [[], ['--running']]) {
    const child = Bun.spawn([process.execPath, resolve(import.meta.dir, 'fixtures/codex-signal-check.ts'), ...args], {
      env: { PATH: process.env.PATH }, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe',
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), 4_000);
    try {
      const [output, errors, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      expect(errors).toBe(''); expect(exit).toBe(0);
      expect(JSON.parse(output)).toMatchObject({ alive: true, completed: !args.length, aborted: !!args.length });
    } finally { clearTimeout(timer); if (child.exitCode === null) { child.kill('SIGKILL'); await child.exited; } }
  }
});
