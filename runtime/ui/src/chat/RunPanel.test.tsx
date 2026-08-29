import { cleanup, render, screen } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import type { RunRecord } from '../api/types';
import { RunPanel } from './RunPanel';

function record(over: Partial<RunRecord> = {}): RunRecord {
  return {
    runId: 'r-1',
    threadId: 't-1',
    tenant: 'default',
    startedAt: '2026-08-29T10:00:00.000Z',
    finishedAt: '2026-08-29T10:00:04.000Z',
    status: 'done',
    message: 'Review the Acme NDA.',
    provider: 'ollama/qwen3',
    primitivesRead: ['read', 'evaluate'],
    toolCalls: [
      { name: 'vault_read', ms: 12, isError: false },
      { name: 'propose_update', ms: null, isError: null },
    ],
    proposals: ['p-1'],
    usage: { inputTokens: 900, outputTokens: 120 },
    costUsd: 0.0042,
    durationMs: 4000,
    ...over,
  };
}

afterEach(cleanup);

describe('RunPanel', () => {
  test('renders the status, provider, primitives, tools and proposals', () => {
    render(<RunPanel run={record()} />);

    expect(screen.getByText('done')).toBeTruthy();
    expect(screen.getByText('ollama/qwen3')).toBeTruthy();
    expect(screen.getByText('read, evaluate')).toBeTruthy();
    expect(screen.getByText('vault_read')).toBeTruthy();
    expect(screen.getByText('12 ms')).toBeTruthy();
    expect(screen.getByText('p-1')).toBeTruthy();
    expect(screen.getByText('4.0 s')).toBeTruthy();
    expect(screen.getByText('$0.0042')).toBeTruthy();
  });

  test('is collapsed by default', () => {
    const { container } = render(<RunPanel run={record()} />);
    expect(container.querySelector('details')!.hasAttribute('open')).toBe(false);
  });

  test('a tool call with no result shows an unknown duration, not zero', () => {
    render(<RunPanel run={record()} />);
    expect(screen.getByText('unknown')).toBeTruthy();
  });

  test('an errored run shows the message and the raw answer that survived it', () => {
    render(
      <RunPanel
        run={record({ status: 'error', error: 'structured output did not match the schema', errorText: 'The cap is 12 months of fees.' })}
      />,
    );
    expect(screen.getByText('error')).toBeTruthy();
    expect(screen.getByText('structured output did not match the schema')).toBeTruthy();
    expect(screen.getByText('The cap is 12 months of fees.')).toBeTruthy();
  });

  test('an empty run says so instead of rendering empty lists', () => {
    render(<RunPanel run={record({ toolCalls: [], proposals: [], primitivesRead: [] })} />);
    expect(screen.getByText('No tools ran.')).toBeTruthy();
    expect(screen.getByText('No proposals.')).toBeTruthy();
    expect(screen.getByText('none')).toBeTruthy();
  });
});
