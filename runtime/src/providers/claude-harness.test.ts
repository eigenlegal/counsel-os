import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { buildQueryOptions, mapClaudeMessage } from './claude-harness';
import { toHarnessJsonSchema } from './schema';
import type { StepRequest } from '../core/types';

describe('mapClaudeMessage', () => {
  test('assistant text → text event', () => {
    const ev = mapClaudeMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'hello' }] } });
    expect(ev).toEqual([{ type: 'text', text: 'hello' }]);
  });

  test('assistant tool_use → tool_call with the mcp prefix stripped', () => {
    const ev = mapClaudeMessage({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'mcp__counsel__vault_read', input: { path: 'a.md' } }] } });
    expect(ev).toEqual([{ type: 'tool_call', id: 't1', name: 'vault_read', input: { path: 'a.md' } }]);
  });

  test('user tool_result → tool_result event', () => {
    const ev = mapClaudeMessage({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: '{"x":1}' }], is_error: false }] } });
    expect(ev).toEqual([{ type: 'tool_result', id: 't1', name: '', output: '{"x":1}', isError: false }]);
  });

  test('result with valid structured output → done', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', output: { a: 1 }, usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.01 }, z.object({ a: z.number() }));
    expect(ev).toEqual([{ type: 'done', output: { a: 1 }, usage: { inputTokens: 10, outputTokens: 5, costUsd: 0.01 } }]);
  });

  test('result with invalid structured output → error', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', output: { a: 'no' }, usage: {} }, z.object({ a: z.number() }));
    expect(ev[0]!.type).toBe('error');
  });

  test('result error subtype → error', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'error_max_turns', usage: {} });
    expect(ev[0]!.type).toBe('error');
  });

  test('result success with is_error:true → error (not done)', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', is_error: true, result: 'boom', usage: {} });
    expect(ev[0]!.type).toBe('error');
  });

  test('inputTokens sums input + cache_read + cache_creation — `input_tokens` alone counts only '
    + 'the uncached remainder and under-reports by ~600x (spike 9.3-B)', () => {
    const ev = mapClaudeMessage({
      type: 'result',
      subtype: 'success',
      result: 'ok',
      usage: { input_tokens: 4, cache_read_input_tokens: 1195, cache_creation_input_tokens: 1316, output_tokens: 5 },
    });
    expect(ev).toEqual([{ type: 'done', output: 'ok', usage: { inputTokens: 2515, outputTokens: 5 } }]);
  });

  test('a usage object with no cache fields still reports plain input_tokens', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', result: 'ok', usage: { input_tokens: 10, output_tokens: 5 } });
    expect(ev).toEqual([{ type: 'done', output: 'ok', usage: { inputTokens: 10, outputTokens: 5 } }]);
  });

  test('result with the real SDK field name structured_output → done', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', structured_output: { a: 1 }, usage: {} }, z.object({ a: z.number() }));
    expect(ev).toEqual([{ type: 'done', output: { a: 1 }, usage: { inputTokens: 0, outputTokens: 0 } }]);
  });
});

describe('buildQueryOptions', () => {
  const baseReq: StepRequest = { tenant: 'default', system: 'You are a helpful assistant.', messages: [], tools: [] };

  test('disables built-in tools with tools:[], auto-approves ours, keeps disallowedTools belt-and-braces', () => {
    const opts = buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    expect(opts.tools).toEqual([]);
    expect(opts.allowedTools).toEqual(['mcp__counsel__*']);
    expect(opts.disallowedTools).toContain('Bash');
  });

  test('isolates from the operator\'s filesystem settings with settingSources:[]', () => {
    const opts = buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    expect(opts.settingSources).toEqual([]);
  });

  test('plain-string system prompt, not the claude_code preset', () => {
    const opts = buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    expect(typeof opts.systemPrompt).toBe('string');
    expect(opts.systemPrompt).toBe(baseReq.system);
  });

  test('bypasses permission prompts with the required safety ack, and locks mcp config to what we pass', () => {
    const opts = buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    expect(opts.permissionMode).toBe('bypassPermissions');
    expect(opts.allowDangerouslySkipPermissions).toBe(true);
    expect(opts.strictMcpConfig).toBe(true);
  });

  test('outputFormat is present only when req.outputSchema is set', () => {
    const without = buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    expect(without.outputFormat).toBeUndefined();

    const withSchema = buildQueryOptions({ ...baseReq, outputSchema: z.object({ a: z.number() }) }, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    expect(withSchema.outputFormat).toEqual({ type: 'json_schema', schema: toHarnessJsonSchema(z.object({ a: z.number() })) });
  });

  test('pins the child env to PATH/HOME/USER so an ambient ANTHROPIC_API_KEY cannot switch the '
    + 'subscription login to metered API billing', () => {
    const base = { PATH: '/x', HOME: '/h', USER: 'u', ANTHROPIC_API_KEY: 'sk' } as unknown as NodeJS.ProcessEnv;
    const opts = buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd', base);
    expect(opts.env).toEqual({ PATH: '/x', HOME: '/h', USER: 'u' });
  });

  test('USER is part of the pin — without it the CLI reports "Not logged in" on a live '
    + 'subscription (macOS Keychain lookup is keyed on USER, verified live 2026-08-28)', () => {
    const base = { PATH: '/x', HOME: '/h', USER: 'u' } as unknown as NodeJS.ProcessEnv;
    const env = buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd', base).env!;
    expect(Object.keys(env).sort()).toEqual(['HOME', 'PATH', 'USER']);
  });

  test('the schema is sanitized — a raw $schema key makes the CLI reject the turn (spike 9.3-B)', () => {
    const opts = buildQueryOptions({ ...baseReq, outputSchema: z.object({ a: z.number() }) }, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    const schema = (opts.outputFormat as { schema: Record<string, unknown> }).schema;
    expect(schema.$schema).toBeUndefined();
  });

  test('transport vars (proxy / CA) pass through the env pin only when set', () => {
    const req = { tenant: 'default', system: 's', messages: [], tools: [] };
    const bare = buildQueryOptions(req, 'm', {}, '/tmp/x', { PATH: '/p', HOME: '/h', USER: 'u' });
    expect(Object.keys(bare.env ?? {}).sort()).toEqual(['HOME', 'PATH', 'USER']);
    const proxied = buildQueryOptions(req, 'm', {}, '/tmp/x', { PATH: '/p', HOME: '/h', USER: 'u', HTTPS_PROXY: 'http://px:3128', NODE_EXTRA_CA_CERTS: '/ca.pem', ANTHROPIC_API_KEY: 'sk' });
    expect(proxied.env?.HTTPS_PROXY).toBe('http://px:3128');
    expect(proxied.env?.NODE_EXTRA_CA_CERTS).toBe('/ca.pem');
    expect(proxied.env?.ANTHROPIC_API_KEY).toBeUndefined();
  });
});

describe('sessions', () => {
  test('system/init → session event with the session id', () => {
    expect(mapClaudeMessage({ type: 'system', subtype: 'init', session_id: 'sess-1', cwd: '/x' })).toEqual([{ type: 'session', id: 'sess-1' }]);
  });
  test('buildQueryOptions passes resume when a session id is given, omits it otherwise', () => {
    const base = { tenant: 'default', system: 's', messages: [], tools: [] };
    expect(buildQueryOptions({ ...base, session: { id: 'sess-1' } }, 'm', {}, '/tmp/x', { PATH: '/p', HOME: '/h', USER: 'u' }).resume).toBe('sess-1');
    expect(buildQueryOptions(base, 'm', {}, '/tmp/x', { PATH: '/p', HOME: '/h', USER: 'u' }).resume).toBeUndefined();
  });
});
