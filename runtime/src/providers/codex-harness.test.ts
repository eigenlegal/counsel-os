import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { buildCodexConfig, buildThreadOptions, mapCodexEvent } from './codex-harness';

describe('mapCodexEvent', () => {
  test('agent_message → text', () => {
    expect(mapCodexEvent({ type: 'item.completed', item: { type: 'agent_message', text: 'hi' } })).toEqual([{ type: 'text', text: 'hi' }]);
  });

  test('mcp_tool_call → tool_call + tool_result', () => {
    const ev = mapCodexEvent({ type: 'item.completed', item: { id: 'c1', type: 'mcp_tool_call', server: 'counsel', tool: 'vault_read', arguments: { path: 'a.md' }, result: { content: [{ type: 'text', text: '{"x":1}' }] }, status: 'completed' } });
    expect(ev).toEqual([
      { type: 'tool_call', id: 'c1', name: 'vault_read', input: { path: 'a.md' } },
      { type: 'tool_result', id: 'c1', name: 'vault_read', output: '{"x":1}', isError: false },
    ]);
  });

  test('failed mcp_tool_call → tool_result with isError:true, output from item.error.message', () => {
    // McpToolCallItem (index.d.ts:42-63): `result` is only present "for
    // successful calls"; a failed call instead carries `error: { message }`
    // and `status: "failed"`. There is no `result.content` to read text from.
    const ev = mapCodexEvent({ type: 'item.completed', item: { id: 'c2', type: 'mcp_tool_call', server: 'counsel', tool: 'vault_write', arguments: { path: 'a.md' }, error: { message: 'conflict' }, status: 'failed' } });
    expect(ev).toEqual([
      { type: 'tool_call', id: 'c2', name: 'vault_write', input: { path: 'a.md' } },
      { type: 'tool_result', id: 'c2', name: 'vault_write', output: 'conflict', isError: true },
    ]);
  });

  test('turn.completed with schema parses finalResponse', () => {
    const ev = mapCodexEvent({ type: 'turn.completed', usage: { input_tokens: 3, output_tokens: 4 } }, z.object({ a: z.number() }), '{"a":1}');
    expect(ev).toEqual([{ type: 'done', output: { a: 1 }, usage: { inputTokens: 3, outputTokens: 4 } }]);
  });

  test('turn.completed without schema → done with raw finalResponse text', () => {
    const ev = mapCodexEvent({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 2 } }, undefined, 'plain text answer');
    expect(ev).toEqual([{ type: 'done', output: 'plain text answer', usage: { inputTokens: 1, outputTokens: 2 } }]);
  });

  test('turn.completed with schema but non-JSON finalResponse → error', () => {
    const ev = mapCodexEvent({ type: 'turn.completed', usage: {} }, z.object({ a: z.number() }), 'not json');
    expect(ev[0]!.type).toBe('error');
  });

  test('turn.completed with schema but validation failure → error', () => {
    const ev = mapCodexEvent({ type: 'turn.completed', usage: {} }, z.object({ a: z.number() }), '{"a":"no"}');
    expect(ev[0]!.type).toBe('error');
  });

  test('turn.failed → error, reading ThreadError.message (index.d.ts:138-141,158-160)', () => {
    const ev = mapCodexEvent({ type: 'turn.failed', error: { message: 'boom' } });
    expect(ev[0]!.type).toBe('error');
    expect((ev[0] as { message: string }).message).toContain('boom');
  });

  test('top-level error event → error, reading message directly (ThreadErrorEvent has no nested .error — index.d.ts:161-165)', () => {
    const ev = mapCodexEvent({ type: 'error', message: 'stream died' });
    expect(ev[0]!.type).toBe('error');
    expect((ev[0] as { message: string }).message).toContain('stream died');
  });

  test('unhandled item types (reasoning, command_execution, file_change, ...) are ignored, not thrown', () => {
    expect(mapCodexEvent({ type: 'item.completed', item: { type: 'reasoning', text: 'thinking...' } })).toEqual([]);
    expect(mapCodexEvent({ type: 'thread.started', thread_id: 't1' })).toEqual([]);
    expect(mapCodexEvent({ type: 'turn.started' })).toEqual([]);
  });
});

describe('buildThreadOptions', () => {
  test('read-only sandbox + empty temp cwd + skipGitRepoCheck (index.d.ts:243,246-259; codex exec --help: -s/--sandbox restricts "model-generated shell commands")', () => {
    const opts = buildThreadOptions('gpt-5-codex', '/tmp/counsel-cwd-abc123');
    expect(opts.sandboxMode).toBe('read-only');
    expect(opts.workingDirectory).toBe('/tmp/counsel-cwd-abc123');
    expect(opts.skipGitRepoCheck).toBe(true);
    expect(opts.model).toBe('gpt-5-codex');
  });
});

describe('buildCodexConfig', () => {
  test('mcp_servers.counsel points at the stdio server with COUNSEL_VAULT/COUNSEL_TENANT env', () => {
    const cfg = buildCodexConfig({ vaultRoot: '/vaults/acme', tenant: 'acme' });
    const mcp = cfg.config!.mcp_servers as Record<string, unknown>;
    const counsel = mcp.counsel as { command: string; args: string[]; env: Record<string, string> };
    expect(counsel.command).toBe('bun');
    expect(counsel.args[0]).toMatch(/mcp\/stdio\.ts$/);
    expect(counsel.env).toEqual({ COUNSEL_VAULT: '/vaults/acme', COUNSEL_TENANT: 'acme' });
  });

  test('disables the shell tool entirely — sandboxMode alone only restricts shell writes, it does not remove the tool ' +
    '(codex exec --help: "-s/--sandbox ... policy to use when executing model-generated shell commands"); ' +
    '`codex features list` shows shell_tool: stable, default true, toggled via `-c features.shell_tool=false` ' +
    '(same mechanism `--disable <FEATURE>` uses per its own --help text)', () => {
    const cfg = buildCodexConfig({ vaultRoot: '/vaults/acme', tenant: 'acme' });
    const features = cfg.config!.features as Record<string, unknown>;
    expect(features.shell_tool).toBe(false);
  });
});
