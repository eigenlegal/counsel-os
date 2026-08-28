import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { buildCodexConfig, buildCodexEnv, buildThreadOptions, CodexHarnessProvider, cleanupIsolatedHome, mapCodexEvent, prepareIsolatedHome, resolveCodexHome } from './codex-harness';

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

  test('web search disabled (index.d.ts:255-256 → --config web_search="disabled"; round-1 review, Important 3)', () => {
    const opts = buildThreadOptions('gpt-5-codex', '/tmp/counsel-cwd-abc123');
    expect(opts.webSearchEnabled).toBe(false);
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

  test('pre-approves the counsel server\'s tools with default_tools_approval_mode "approve" — '
    + 'the thread\'s `approvalPolicy` default of `never` means DENY, so without this every MCP '
    + 'tool call fails with "MCP tool call requires approval, but approval policy is never" and '
    + 'the step still exits 0 with a wrong answer (spike 9.3-D). "auto" does NOT work; "approve" does', () => {
    const cfg = buildCodexConfig({ vaultRoot: '/vaults/acme', tenant: 'acme' });
    const mcp = cfg.config!.mcp_servers as Record<string, unknown>;
    const counsel = mcp.counsel as Record<string, unknown>;
    expect(counsel.default_tools_approval_mode).toBe('approve');
  });

  test('disables the shell tool entirely — sandboxMode alone only restricts shell writes, it does not remove the tool ' +
    '(codex exec --help: "-s/--sandbox ... policy to use when executing model-generated shell commands"); ' +
    '`codex features list` shows shell_tool: stable, default true, toggled via `-c features.shell_tool=false` ' +
    '(same mechanism `--disable <FEATURE>` uses per its own --help text)', () => {
    const cfg = buildCodexConfig({ vaultRoot: '/vaults/acme', tenant: 'acme' });
    const features = cfg.config!.features as Record<string, unknown>;
    expect(features.shell_tool).toBe(false);
  });

  test('disables all seven exec/side-channel feature flags (round-1 review, Important 2 — each confirmed present via `codex features list`)', () => {
    const cfg = buildCodexConfig({ vaultRoot: '/vaults/acme', tenant: 'acme' });
    const features = cfg.config!.features as Record<string, unknown>;
    expect(features).toEqual({
      shell_tool: false,
      unified_exec: false,
      view_image: false,
      multi_agent: false,
      hooks: false,
      image_generation: false,
      request_permissions_tool: false,
    });
  });
});

describe('buildCodexEnv', () => {
  test('contains exactly PATH/HOME/CODEX_HOME — no other keys from `base` leak through (index.d.ts:236-239: env "replaces", it does not extend, process.env)', () => {
    const base = { PATH: '/usr/bin:/bin', HOME: '/Users/jack', OPENAI_API_KEY: 'sk-secret', SOME_OTHER_TOKEN: 'x' } as unknown as NodeJS.ProcessEnv;
    const env = buildCodexEnv('/tmp/isolated-home', '/Users/jack/.codex', base);
    expect(env).toEqual({ PATH: '/usr/bin:/bin', HOME: '/Users/jack', CODEX_HOME: '/tmp/isolated-home' });
  });

  test('throws if isolatedHome === realHome — refuses to hand the real credentials dir to the "isolated" slot', () => {
    expect(() => buildCodexEnv('/Users/jack/.codex', '/Users/jack/.codex', { PATH: '/bin', HOME: '/Users/jack' } as unknown as NodeJS.ProcessEnv)).toThrow();
  });
});

describe('prepareIsolatedHome', () => {
  test('copies auth.json into the isolated home when present in the real one', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'counsel-real-codex-home-'));
    writeFileSync(join(realHome, 'auth.json'), '{"token":"real-secret"}');

    const isolatedHome = prepareIsolatedHome(realHome);

    expect(isolatedHome).not.toBe(realHome);
    expect(existsSync(join(isolatedHome, 'auth.json'))).toBe(true);
    expect(readFileSync(join(isolatedHome, 'auth.json'), 'utf8')).toBe('{"token":"real-secret"}');
  });

  test('still returns a usable dir when the real home has no auth.json (not logged in)', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'counsel-real-codex-home-empty-'));

    const isolatedHome = prepareIsolatedHome(realHome);

    expect(existsSync(isolatedHome)).toBe(true);
    expect(existsSync(join(isolatedHome, 'auth.json'))).toBe(false);
  });

  test('returns a dir even when the real home does not exist at all', () => {
    const isolatedHome = prepareIsolatedHome('/nonexistent/does-not-exist-codex-home');
    expect(existsSync(isolatedHome)).toBe(true);
  });
});

describe('cleanupIsolatedHome', () => {
  test('removes the isolated home and the plaintext auth.json copy inside it', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'counsel-real-codex-home-'));
    writeFileSync(join(realHome, 'auth.json'), '{"token":"real-secret"}');

    const isolatedHome = prepareIsolatedHome(realHome);
    expect(existsSync(join(isolatedHome, 'auth.json'))).toBe(true);

    cleanupIsolatedHome(isolatedHome);

    expect(existsSync(join(isolatedHome, 'auth.json'))).toBe(false);
    expect(existsSync(isolatedHome)).toBe(false);
    // The credentials it was copied FROM must be untouched.
    expect(existsSync(join(realHome, 'auth.json'))).toBe(true);
  });

  test('is safe to call from a finally on a directory that is already gone', () => {
    const isolatedHome = prepareIsolatedHome(mkdtempSync(join(tmpdir(), 'counsel-real-codex-home-')));
    cleanupIsolatedHome(isolatedHome);
    expect(() => cleanupIsolatedHome(isolatedHome)).not.toThrow();
  });

  test('transport vars (proxy / CA) pass through buildCodexEnv only when set', () => {
    const bare = buildCodexEnv('/iso', '/real', { PATH: '/p', HOME: '/h' });
    expect(Object.keys(bare).sort()).toEqual(['CODEX_HOME', 'HOME', 'PATH']);
    const proxied = buildCodexEnv('/iso', '/real', { PATH: '/p', HOME: '/h', HTTP_PROXY: 'http://px', OPENAI_API_KEY: 'sk' });
    expect(proxied.HTTP_PROXY).toBe('http://px');
    expect(proxied.OPENAI_API_KEY).toBeUndefined();
  });
});

describe('sessions', () => {
  test('thread.started → session event with the thread id', () => {
    expect(mapCodexEvent({ type: 'thread.started', thread_id: 'th-1' })).toEqual([{ type: 'session', id: 'th-1' }]);
  });
  test('a persistent homeDir is used as CODEX_HOME and is not removed by run()', async () => {
    const home = mkdtempSync(join(tmpdir(), 'persist-home-'));
    const p = new CodexHarnessProvider({ model: 'm', vaultRoot: '/v', homeDir: home });
    expect(p.homeDir).toBe(home);
    // run() is not executed here (live); the contract is asserted via the exported helper:
    expect(resolveCodexHome({ homeDir: home, realHome: '/real' })).toEqual({ isolatedHome: home, ephemeral: false });
    expect(resolveCodexHome({ realHome: '/real' }).ephemeral).toBe(true);
  });
});
