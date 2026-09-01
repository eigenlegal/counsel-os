import { describe, expect, test } from 'bun:test';
import type { StepEvent } from '../api/types';
import { applyStepEvent, emptyAssistantTurn } from './turns';

function run(events: StepEvent[]): ReturnType<typeof emptyAssistantTurn> {
  return events.reduce((turn, ev) => applyStepEvent(turn, ev), emptyAssistantTurn({ status: 'streaming' }));
}

describe('applyStepEvent text segments (cou-93 item 1)', () => {
  test('text split around tool work gets a paragraph break, so a heading after a tool still renders', () => {
    const turn = run([
      { type: 'text', text: "I'll look at what's in the vault and check for recent activity." },
      { type: 'tool_call', id: 'c1', name: 'vault_list', input: { dir: 'matters' } },
      { type: 'tool_result', id: 'c1', name: 'vault_list', output: [] },
      { type: 'text', text: '## What changed — week of Aug 24–31' },
    ]);
    expect(turn.text).toBe("I'll look at what's in the vault and check for recent activity.\n\n## What changed — week of Aug 24–31");
  });

  test('deltas streamed within one segment still join seamlessly', () => {
    const turn = run([
      { type: 'text', text: 'The cap ' },
      { type: 'text', text: 'is 2x fees.' },
    ]);
    expect(turn.text).toBe('The cap is 2x fees.');
  });

  test('a tool before any text adds no leading break', () => {
    const turn = run([
      { type: 'tool_call', id: 'c1', name: 'vault_read', input: { path: 'a.md' } },
      { type: 'tool_result', id: 'c1', name: 'vault_read', output: 'x' },
      { type: 'text', text: 'Done.' },
    ]);
    expect(turn.text).toBe('Done.');
  });

  test('a segment that already ends in a blank line is not padded twice', () => {
    const turn = run([
      { type: 'text', text: 'First.\n\n' },
      { type: 'tool_call', id: 'c1', name: 'vault_read', input: { path: 'a.md' } },
      { type: 'text', text: 'Second.' },
    ]);
    expect(turn.text).toBe('First.\n\nSecond.');
  });
});

describe('applyStepEvent tool names (cou-93 item 2)', () => {
  test('a nameless result keeps the name of the call it pairs with', () => {
    const turn = run([
      { type: 'tool_call', id: 'c1', name: 'vault_list', input: { dir: '.' } },
      { type: 'tool_result', id: 'c1', name: '', output: ['matters'] },
    ]);
    expect(turn.tools).toHaveLength(1);
    expect(turn.tools[0]!.name).toBe('vault_list');
    expect(turn.tools[0]!.hasResult).toBe(true);
  });

  test('a named result still wins over the call', () => {
    const turn = run([
      { type: 'tool_call', id: 'c1', name: 'vault_list', input: { dir: '.' } },
      { type: 'tool_result', id: 'c1', name: 'vault_list', output: [] },
    ]);
    expect(turn.tools[0]!.name).toBe('vault_list');
  });
});
