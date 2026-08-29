import { chmodSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
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
  test('resolveCodexHome reports ephemeral:false for a persistent homeDir', () => {
    const home = mkdtempSync(join(tmpdir(), 'persist-home-'));
    const p = new CodexHarnessProvider({ model: 'm', vaultRoot: '/v', homeDir: home });
    expect(p.homeDir).toBe(home);
    // run() is not executed here (live); the contract is asserted via the exported helper:
    expect(resolveCodexHome({ homeDir: home, realHome: '/real' })).toEqual({ isolatedHome: home, ephemeral: false });
    expect(resolveCodexHome({ realHome: '/real' }).ephemeral).toBe(true);
  });
});

describe('resolveCodexHome — real-home guard (normalized)', () => {
  test('throws when homeDir equals the real CODEX_HOME', () => {
    expect(() => resolveCodexHome({ homeDir: '/real/home', realHome: '/real/home' })).toThrow();
  });

  test('throws on a trailing-slash variant of the real CODEX_HOME', () => {
    expect(() => resolveCodexHome({ homeDir: '/real/home/', realHome: '/real/home' })).toThrow();
  });

  test('throws when homeDir is nested inside the real CODEX_HOME', () => {
    expect(() => resolveCodexHome({ homeDir: '/real/home/nested', realHome: '/real/home' })).toThrow();
  });

  test('passes for an unrelated homeDir', () => {
    const home = mkdtempSync(join(tmpdir(), 'unrelated-home-'));
    expect(resolveCodexHome({ homeDir: home, realHome: '/real/home' })).toEqual({ isolatedHome: home, ephemeral: false });
  });
});

describe('resolveCodexHome — credential re-seed', () => {
  test('re-copies auth.json when the real file is newer than the existing copy', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'real-home-'));
    const homeDir = mkdtempSync(join(tmpdir(), 'persist-home-'));
    writeFileSync(join(realHome, 'auth.json'), '{"token":"first"}');

    resolveCodexHome({ homeDir, realHome }); // initial copy
    expect(readFileSync(join(homeDir, 'auth.json'), 'utf8')).toBe('{"token":"first"}');

    const future = new Date(Date.now() + 60_000);
    writeFileSync(join(realHome, 'auth.json'), '{"token":"second"}');
    utimesSync(join(realHome, 'auth.json'), future, future);

    resolveCodexHome({ homeDir, realHome });
    expect(readFileSync(join(homeDir, 'auth.json'), 'utf8')).toBe('{"token":"second"}');
  });

  test('leaves the copy untouched when the real file is not newer', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'real-home-'));
    const homeDir = mkdtempSync(join(tmpdir(), 'persist-home-'));
    writeFileSync(join(realHome, 'auth.json'), '{"token":"first"}');

    resolveCodexHome({ homeDir, realHome }); // initial copy

    const past = new Date(Date.now() - 60_000);
    writeFileSync(join(realHome, 'auth.json'), '{"token":"stale-but-untouched"}');
    utimesSync(join(realHome, 'auth.json'), past, past);

    resolveCodexHome({ homeDir, realHome });
    expect(readFileSync(join(homeDir, 'auth.json'), 'utf8')).toBe('{"token":"first"}');
  });

  test('the copy is 0600 however permissive the real auth.json is', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'real-home-'));
    const homeDir = mkdtempSync(join(tmpdir(), 'persist-home-'));
    writeFileSync(join(realHome, 'auth.json'), '{"token":"first"}');
    chmodSync(join(realHome, 'auth.json'), 0o644);

    // Initial copy: copyFileSync would otherwise give it the source's mode.
    resolveCodexHome({ homeDir, realHome });
    expect(statSync(join(homeDir, 'auth.json')).mode & 0o777).toBe(0o600);

    // Re-seed: an overwrite keeps the DESTINATION's mode, so a copy loosened
    // in between has to be tightened again too.
    chmodSync(join(homeDir, 'auth.json'), 0o644);
    const future = new Date(Date.now() + 60_000);
    writeFileSync(join(realHome, 'auth.json'), '{"token":"second"}');
    utimesSync(join(realHome, 'auth.json'), future, future);

    resolveCodexHome({ homeDir, realHome });
    expect(readFileSync(join(homeDir, 'auth.json'), 'utf8')).toBe('{"token":"second"}');
    expect(statSync(join(homeDir, 'auth.json')).mode & 0o777).toBe(0o600);
  });

  test('a symlink planted at the destination is replaced by a real 0600 copy', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'real-home-'));
    const homeDir = mkdtempSync(join(tmpdir(), 'persist-home-'));
    const elsewhere = mkdtempSync(join(tmpdir(), 'elsewhere-'));
    writeFileSync(join(realHome, 'auth.json'), '{"token":"real"}');
    // Someone else's file, aimed at by a link where our copy belongs.
    const target = join(elsewhere, 'target.json');
    writeFileSync(target, 'NOT OURS');
    symlinkSync(target, join(homeDir, 'auth.json'));

    resolveCodexHome({ homeDir, realHome });

    // A real file, not a link: copyFileSync and chmodSync both FOLLOW links,
    // so writing through it would have leaked the credential to `target`.
    expect(lstatSync(join(homeDir, 'auth.json')).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(homeDir, 'auth.json'), 'utf8')).toBe('{"token":"real"}');
    expect(statSync(join(homeDir, 'auth.json')).mode & 0o777).toBe(0o600);
    // The link's target was never touched.
    expect(readFileSync(target, 'utf8')).toBe('NOT OURS');
  });

  test('a logout removes the copy rather than leaving a revoked credential behind', () => {
    const realHome = mkdtempSync(join(tmpdir(), 'real-home-'));
    const homeDir = mkdtempSync(join(tmpdir(), 'persist-home-'));
    writeFileSync(join(realHome, 'auth.json'), '{"token":"first"}');

    resolveCodexHome({ homeDir, realHome });
    expect(existsSync(join(homeDir, 'auth.json'))).toBe(true);

    // The operator logs out: the real auth.json is gone. A persistent home
    // outlives it, so the copy must not survive the credential.
    rmSync(join(realHome, 'auth.json'));
    resolveCodexHome({ homeDir, realHome });
    expect(existsSync(join(homeDir, 'auth.json'))).toBe(false);
    // Still a usable home, just an unauthenticated one.
    expect(existsSync(homeDir)).toBe(true);
  });
});

describe('CodexHarnessProvider.withThread / withHome', () => {
  test('returns a new instance with the same id, pinned to the given home', () => {
    const provider = new CodexHarnessProvider({ model: 'gpt-5.6-terra', vaultRoot: '/v', id: 'codex-sub/gpt-5.6-terra' });
    const bound = provider.withHome('/homes/thread-1');

    expect(bound).not.toBe(provider);
    expect(bound.id).toBe('codex-sub/gpt-5.6-terra');
    expect(bound.homeDir).toBe('/homes/thread-1');
    // The original is untouched, so one registry entry can serve many threads.
    expect(provider.homeDir).toBeUndefined();
  });

  test('two threads get independent homes off one provider', () => {
    const provider = new CodexHarnessProvider({ model: 'm', vaultRoot: '/v' });
    expect(provider.withHome('/a').homeDir).toBe('/a');
    expect(provider.withHome('/b').homeDir).toBe('/b');
  });

  test('withThread carries the thread id and plugin root into the stdio server env', () => {
    const provider = new CodexHarnessProvider({ model: 'm', vaultRoot: '/v' });
    const bound = provider.withThread({ homeDir: '/homes/t1', threadId: 'thread-1', pluginRoot: '/plugin' });

    expect(bound.homeDir).toBe('/homes/t1');
    // The binding is what reaches the out-of-process MCP server.
    const env = mcpEnv(buildCodexConfig({ vaultRoot: '/v', tenant: 'default', threadId: 'thread-1', pluginRoot: '/plugin' }));
    expect(env.COUNSEL_THREAD_ID).toBe('thread-1');
    expect(env.COUNSEL_PLUGIN_ROOT).toBe('/plugin');
  });
});

/** The `mcp_servers.counsel.env` block `buildCodexConfig` flattens into
 * `--config` overrides for the child CLI. */
function mcpEnv(cfg: ReturnType<typeof buildCodexConfig>): Record<string, string> {
  const servers = (cfg.config as { mcp_servers: { counsel: { env: Record<string, string> } } }).mcp_servers;
  return servers.counsel.env;
}

describe('buildCodexConfig — stdio server environment', () => {
  test('always passes the vault and tenant', () => {
    const env = mcpEnv(buildCodexConfig({ vaultRoot: '/vault', tenant: 'acme' }));
    expect(env.COUNSEL_VAULT).toBe('/vault');
    expect(env.COUNSEL_TENANT).toBe('acme');
  });

  test('omits COUNSEL_THREAD_ID and COUNSEL_PLUGIN_ROOT when not given', () => {
    const env = mcpEnv(buildCodexConfig({ vaultRoot: '/vault', tenant: 'default' }));
    expect('COUNSEL_THREAD_ID' in env).toBe(false);
    expect('COUNSEL_PLUGIN_ROOT' in env).toBe(false);
  });

  test('includes both when given — this is what unlocks propose_update and read_primitive', () => {
    const env = mcpEnv(buildCodexConfig({
      vaultRoot: '/vault',
      tenant: 'default',
      threadId: 'e4d0d0b2-0000-4000-8000-000000000000',
      pluginRoot: '/repo',
    }));
    expect(env.COUNSEL_THREAD_ID).toBe('e4d0d0b2-0000-4000-8000-000000000000');
    expect(env.COUNSEL_PLUGIN_ROOT).toBe('/repo');
  });
});

describe('CodexHarnessProvider.run — resume precondition', () => {
  test('resuming without a persistent homeDir yields a single error event, before any SDK call', async () => {
    const provider = new CodexHarnessProvider({ model: 'm', vaultRoot: '/v' });
    const events: unknown[] = [];
    for await (const ev of provider.run({ tenant: 'default', system: 's', messages: [], tools: [], session: { id: 'x' } })) {
      events.push(ev);
    }
    expect(events).toEqual([{ type: 'error', message: 'codex harness: resuming a thread requires a persistent homeDir' }]);
  });
});
