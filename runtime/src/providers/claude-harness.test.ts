import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { abortControllerFor, buildQueryOptions, mapClaudeMessage, shouldCleanupCwd } from './claude-harness';
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

  test('a tool_result takes the name of the tool_use it pairs with, across messages (cou-78)', () => {
    const names = new Map<string, string>();
    mapClaudeMessage({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'mcp__counsel__vault_list', input: { dir: '.' } }] } }, undefined, names);
    const ev = mapClaudeMessage({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: '[]' }], is_error: false }] } }, undefined, names);
    expect(ev).toEqual([{ type: 'tool_result', id: 't1', name: 'vault_list', output: '[]', isError: false }]);
    // An id the map never saw stays nameless rather than guessing.
    const orphan = mapClaudeMessage({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't9', content: [], is_error: false }] } }, undefined, names);
    expect(orphan[0]).toMatchObject({ type: 'tool_result', id: 't9', name: '' });
  });

  test('result with valid structured output → done', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', output: { a: 1 }, usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.01 }, z.object({ a: z.number() }));
    expect(ev).toEqual([{ type: 'done', output: { a: 1 }, usage: { inputTokens: 10, outputTokens: 5, costUsd: 0.01 } }]);
  });

  test('result with invalid structured output → error', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', output: { a: 'no' }, usage: {} }, z.object({ a: z.number() }));
    expect(ev[0]!.type).toBe('error');
  });

  test('an invalid structured output keeps the raw answer on error.text (web-ui spec §4.3)', () => {
    // `msg.result` is the turn's raw text. A typed request that the model
    // answered in prose is still an error — but the prose is what the reader
    // wants to see, so it rides along instead of being dropped.
    const ev = mapClaudeMessage(
      { type: 'result', subtype: 'success', structured_output: { a: 'no' }, result: 'raw', usage: {} },
      z.object({ a: z.number() }),
    );
    expect(ev).toEqual([{ type: 'error', message: expect.stringContaining('structured output failed validation'), text: 'raw' }]);
  });

  test('an invalid structured output with no raw result omits text rather than inventing one', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', output: { a: 'no' }, usage: {} }, z.object({ a: z.number() }));
    expect(ev[0]).not.toHaveProperty('text');
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

  test('forwards the step signal as the SDK abortController — and omits it when there is none', () => {
    expect(buildQueryOptions(baseReq, 'claude-opus-5', {}, '/tmp/counsel-cwd').abortController).toBeUndefined();

    const cancel = new AbortController();
    const opts = buildQueryOptions({ ...baseReq, signal: cancel.signal }, 'claude-opus-5', {}, '/tmp/counsel-cwd');
    expect(opts.abortController).toBeInstanceOf(AbortController);
    expect(opts.abortController!.signal.aborted).toBe(false);
    // The step's abort has to reach the query, or the CLI child keeps running.
    cancel.abort();
    expect(opts.abortController!.signal.aborted).toBe(true);
  });

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

describe('shouldCleanupCwd', () => {
  test('true when no cwd was supplied — run() created its own temp cwd and must remove it', () => {
    expect(shouldCleanupCwd(undefined)).toBe(true);
  });
  test('false when a cwd was supplied by the caller — run() must not remove it', () => {
    expect(shouldCleanupCwd('/some/persistent/cwd')).toBe(false);
  });
});

describe('abortControllerFor', () => {
  test('a signal that already fired aborts the controller immediately — the query must not start', () => {
    const cancel = new AbortController();
    cancel.abort();
    expect(abortControllerFor(cancel.signal)!.signal.aborted).toBe(true);
  });

  test('no signal, no controller', () => {
    expect(abortControllerFor(undefined)).toBeUndefined();
  });
});
