import { cleanup, render, screen, within } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { ThreadEvent } from '../api/types';
import { TurnView } from './TurnView';
import { buildTurns, type AssistantTurn } from './turns';

const at = '2026-08-29T10:00:00.000Z';

/** Two tools called before either answers, and the results out of order —
 * the case that position-based pairing gets wrong. */
const events: ThreadEvent[] = [
  { t: 'user', at, content: 'Check the Acme cap.' },
  { t: 'step', at, runId: 'r-1', provider: 'ollama/qwen3' },
  { type: 'tool_call', at, id: 'call-a', name: 'vault_read', input: { path: 'matters/acme/nda.md' } },
  { type: 'tool_call', at, id: 'call-b', name: 'vault_search', input: { query: 'liability cap' } },
  { type: 'tool_result', at, id: 'call-b', name: 'vault_search', output: 'searched for the cap' },
  { type: 'tool_result', at, id: 'call-a', name: 'vault_read', output: 'read the NDA', isError: false },
  { type: 'text', at, text: 'The cap is 12 months of fees.' },
  { type: 'done', at, output: null, usage: { inputTokens: 10, outputTokens: 5 } },
];

function assistantTurn(): AssistantTurn {
  const turn = buildTurns(events)[1];
  if (turn === undefined || turn.kind !== 'assistant') throw new Error('expected an assistant turn');
  return turn;
}

afterEach(cleanup);

describe('TurnView', () => {
  test('pairs each tool_call with its own result by id', () => {
    render(<TurnView turn={assistantTurn()} threadId="t-1" onReload={() => {}} />);

    const a = within(screen.getByTestId('tool-call-a'));
    expect(a.getByText('vault_read')).toBeTruthy();
    expect(a.getByText('read the NDA')).toBeTruthy();
    expect(a.queryByText('searched for the cap')).toBeNull();

    const b = within(screen.getByTestId('tool-call-b'));
    expect(b.getByText('vault_search')).toBeTruthy();
    expect(b.getByText('searched for the cap')).toBeTruthy();
  });

  test('renders the streamed answer', () => {
    render(<TurnView turn={assistantTurn()} threadId="t-1" onReload={() => {}} />);
    expect(screen.getByText('The cap is 12 months of fees.')).toBeTruthy();
  });

  test('a tool still running shows no result and reads as running', () => {
    const turn = buildTurns(events.slice(0, 4));
    const open = turn[1];
    if (open === undefined || open.kind !== 'assistant') throw new Error('expected an assistant turn');
    render(<TurnView turn={open} threadId="t-1" onReload={() => {}} />);

    const a = within(screen.getByTestId('tool-call-a'));
    expect(a.getByText('running')).toBeTruthy();
    expect(a.queryByText('Result')).toBeNull();
  });

  test('the user turn renders its message', () => {
    const first = buildTurns(events)[0]!;
    render(<TurnView turn={first} threadId="t-1" onReload={() => {}} />);
    expect(screen.getByText('Check the Acme cap.')).toBeTruthy();
  });

  test('an error turn shows the message and the raw text when there is one', () => {
    const turn = buildTurns([
      { t: 'step', at, runId: 'r-2', provider: 'ollama/qwen3' },
      { type: 'error', at, message: 'schema mismatch', text: 'The cap is 12 months.' },
    ])[0]!;
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} />);

    expect(screen.getByText('schema mismatch')).toBeTruthy();
    expect(screen.getByText('The cap is 12 months.')).toBeTruthy();
  });

  test('a warning renders above the answer', () => {
    const turn = buildTurns([
      { t: 'step', at, runId: 'r-3', provider: 'ollama/qwen3' },
      { t: 'warning', at, message: 'the vendor session was gone; the step replayed the history' },
      { type: 'text', at, text: 'Answer.' },
    ])[0]!;
    render(<TurnView turn={turn} threadId="t-1" onReload={() => {}} />);
    expect(screen.getByText('the vendor session was gone; the step replayed the history')).toBeTruthy();
  });
});
