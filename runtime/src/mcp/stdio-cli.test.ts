import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { mcpStdioCommand } from '../providers/codex-harness';

/** One JSON-RPC frame, the way the stdio transport reads them: a line. */
function frame(msg: unknown): string {
  return `${JSON.stringify(msg)}\n`;
}

describe('counsel-os mcp-stdio', () => {
  test('the subcommand answers initialize over stdio, the way the Codex bridge needs', async () => {
    const vault = mkdtempSync(join(tmpdir(), 'mcp-vault-'));
    mkdirSync(join(vault, 'matters'), { recursive: true });
    writeFileSync(join(vault, 'config.md'), 'counsel-os-config: true\nlegal_root: .\n', 'utf8');
    const cli = resolve(import.meta.dir, '..', 'cli.ts');
    const proc = Bun.spawn(['bun', cli, 'mcp-stdio'], {
      env: { ...process.env, COUNSEL_VAULT: vault },
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    proc.stdin.write(frame({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } } }));
    proc.stdin.flush();
    const reader = proc.stdout.getReader();
    let text = '';
    const deadline = Date.now() + 20_000;
    while (!text.includes('\n') && Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    proc.kill();
    const first = JSON.parse(text.split('\n')[0]!) as { id: number; result?: { serverInfo?: { name: string } } };
    expect(first.id).toBe(1);
    expect(first.result?.serverInfo?.name).toBe('counsel');
  }, 30_000);

  test('the bridge command is bun + the module in a checkout, the binary itself when compiled', () => {
    expect(mcpStdioCommand(false)).toEqual({ command: 'bun', args: [resolve(import.meta.dir, 'stdio.ts')] });
    expect(mcpStdioCommand(true)).toEqual({ command: process.execPath, args: ['mcp-stdio'] });
  });
});
