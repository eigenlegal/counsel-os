import { describe, expect, test } from 'bun:test';
import { window } from './window';
import type { ThreadEvent } from './store';

describe('window', () => {
  test('converts user/text events to Messages, merging consecutive text events and skipping tool events', () => {
    const events: ThreadEvent[] = [
      { t: 'user', at: 't0', content: 'first' },
      { type: 'text', text: 'a', at: 't1' },
      { type: 'text', text: 'b', at: 't2' },
      { type: 'tool_call', id: '1', name: 'vault_read', input: {}, at: 't3' },
      { type: 'tool_result', id: '1', name: 'vault_read', output: 'x', at: 't4' },
      { type: 'text', text: 'c', at: 't5' },
      { t: 'user', at: 't6', content: 'second' },
    ];

    const messages = window(events, 100_000);

    expect(messages).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'ab' },
      { role: 'assistant', content: 'c' },
      { role: 'user', content: 'second' },
    ]);
  });

  test('drops oldest messages first when over budget', () => {
    const events: ThreadEvent[] = [
      { t: 'user', at: 't0', content: 'one' },
      { type: 'text', text: 'reply one', at: 't1' },
      { t: 'user', at: 't2', content: 'two' },
      { type: 'text', text: 'reply two', at: 't3' },
      { t: 'user', at: 't4', content: 'three' },
    ];

    // Budget only big enough for the last user message plus a bit —
    // the oldest turns must be dropped first.
    const messages = window(events, 3);

    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'three' });
    expect(messages.some(m => m.content === 'one')).toBe(false);
    expect(messages.some(m => m.content === 'reply one')).toBe(false);
  });

  test('always keeps the last user message even when it alone exceeds the budget', () => {
    const events: ThreadEvent[] = [
      { t: 'user', at: 't0', content: 'short' },
      { type: 'text', text: 'reply', at: 't1' },
      { t: 'user', at: 't2', content: 'a'.repeat(400) },
    ];

    const messages = window(events, 1);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({ role: 'user', content: 'a'.repeat(400) });
  });

  test('never returns an assistant-first window (Anthropic rejects a non-user first message)', () => {
    const events: ThreadEvent[] = [
      { t: 'user', at: 't0', content: 'A' },
      { type: 'text', text: 'B', at: 't1' },
      { t: 'user', at: 't2', content: 'C' },
      { type: 'text', text: 'D', at: 't3' },
      { t: 'user', at: 't4', content: 'E' },
    ];

    // Before the fix, this budget stopped the drop loop right after
    // {role:'user',content:'A'} was shifted off, leaving the assistant 'B'
    // message as the head: [assistant B, user C, assistant D, user E].
    const messages = window(events, 4);

    expect(messages[0]!.role).toBe('user');
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'E' });
  });

  test('the head is never assistant across a range of budgets', () => {
    const events: ThreadEvent[] = [
      { t: 'user', at: 't0', content: 'A' },
      { type: 'text', text: 'B', at: 't1' },
      { t: 'user', at: 't2', content: 'C' },
      { type: 'text', text: 'D', at: 't3' },
      { t: 'user', at: 't4', content: 'E' },
    ];

    for (const budget of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 100]) {
      const messages = window(events, budget);
      if (messages.length > 0) {
        expect(messages[0]!.role).toBe('user');
      }
      // The last user message ('E') must always survive.
      expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'E' });
    }
  });

  test('the token estimate is injectable', () => {
    const events: ThreadEvent[] = [
      { t: 'user', at: 't0', content: 'one' },
      { type: 'text', text: 'reply one', at: 't1' },
      { t: 'user', at: 't2', content: 'two' },
    ];

    // A custom estimate that counts every message as costing 10 tokens
    // regardless of length forces a drop that length/4 would not.
    const messages = window(events, 15, () => 10);

    expect(messages).toEqual([{ role: 'user', content: 'two' }]);
  });
});
