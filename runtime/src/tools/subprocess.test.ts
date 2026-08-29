import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pythonScriptTool } from './subprocess';

describe('pythonScriptTool', () => {
  test('runs a script with args and returns stdout/exit code', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'py-'));
    const script = join(dir, 'hello.py');
    writeFileSync(script, 'import sys; print("hello " + sys.argv[1]); sys.exit(3)\n');
    const tool = pythonScriptTool({
      name: 'hello', description: 'hello', script, platforms: ['macos', 'linux'],
      inputSchema: z.object({ who: z.string() }),
      args: ({ who }) => [who],
    });
    const r = await tool.execute({ who: 'world' }, { tenant: 'default' });
    expect(r.stdout.trim()).toBe('hello world');
    expect(r.exitCode).toBe(3);
  });

  test('captures stderr', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'py-'));
    const script = join(dir, 'err.py');
    writeFileSync(script, 'import sys; sys.stderr.write("bad\\n"); sys.exit(1)\n');
    const tool = pythonScriptTool({ name: 'err', description: 'err', script, platforms: ['macos', 'linux'], inputSchema: z.object({}), args: () => [] });
    const r = await tool.execute({}, { tenant: 'default' });
    expect(r.stderr.trim()).toBe('bad');
    expect(r.exitCode).toBe(1);
  });

  test('runs a `command` with no script at all', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sh-'));
    const script = join(dir, 'hello.sh');
    writeFileSync(script, 'echo "hello $1"\n');
    const tool = pythonScriptTool({
      name: 'hello_sh', description: 'hello', command: ['bash', script], platforms: ['macos', 'linux'],
      inputSchema: z.object({ who: z.string() }),
      args: ({ who }) => [who],
    });
    const r = await tool.execute({ who: 'world' }, { tenant: 'default' });
    expect(r.stdout.trim()).toBe('hello world');
    expect(r.exitCode).toBe(0);
  });

  test('needs a script or a command', () => {
    expect(() => pythonScriptTool({
      name: 'nothing', description: 'nothing', platforms: ['macos'],
      inputSchema: z.object({}), args: () => [],
    })).toThrow(/needs a script or a command/);
  });

  test('kills the process on timeout', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'py-'));
    const script = join(dir, 'sleep.py');
    writeFileSync(script, 'import time; time.sleep(10)\n');
    const tool = pythonScriptTool({ name: 'sleep', description: 'sleep', script, platforms: ['macos', 'linux'], inputSchema: z.object({}), args: () => [], timeoutMs: 200 });
    const t0 = Date.now();
    const r = await tool.execute({}, { tenant: 'default' });
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(r.exitCode).not.toBe(0);
  });
});
