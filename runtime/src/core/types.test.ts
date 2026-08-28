import { describe, expect, test } from 'bun:test';
import { VaultConflictError, RouterError, isTerminal } from './types';

describe('core types', () => {
  test('errors carry a code', () => {
    expect(new VaultConflictError('a.md', 'v1', 'v2').code).toBe('vault_conflict');
    expect(new RouterError('no model').code).toBe('router');
  });

  test('isTerminal recognises the terminal event', () => {
    expect(isTerminal({ type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } })).toBe(true);
    expect(isTerminal({ type: 'text', text: 'hi' })).toBe(false);
  });
});
