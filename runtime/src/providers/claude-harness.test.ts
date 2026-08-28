import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { mapClaudeMessage } from './claude-harness';

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
});
