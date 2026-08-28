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
});
