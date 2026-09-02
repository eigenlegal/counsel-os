import { cleanup, render, screen, userEvent, waitFor, within } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { LedgerRun } from '../../api/types';
import { costOf, RoutingLedger, tookOf, whenOf, whyOf } from './RoutingLedger';

const realFetch = globalThis.fetch;
let runs: LedgerRun[] = [];
let status = 200;

function json(body: unknown, code = 200): Response {
  return new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
}

function run(over: Partial<LedgerRun> = {}): LedgerRun {
  return {
    runId: `r-${Math.random().toString(16).slice(2)}`,
    threadId: 't-1',
    thread: 'Acme cap',
    at: '2026-09-02T10:00:00.000Z',
    status: 'done',
    provider: 'claude-sub/claude-opus-5',
    task: 'review',
    routeReason: { kind: 'scored', text: 'review 0.90' },
    durationMs: 78_000,
    costUsd: 0.46,
    ...over,
  };
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 't');
  runs = [run()];
  status = 200;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (!String(input).startsWith('/routing/ledger')) throw new Error(`unexpected fetch: ${String(input)}`);
    return status === 200 ? json({ runs }) : json({ error: 'the record could not be read' }, status);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

const table = (): HTMLElement => screen.getByRole('table', { name: 'What ran' });

describe('the routing ledger', () => {
  test('one row per run: the task, the conversation, the model, why, and what it took', async () => {
    render(<RoutingLedger />);
    await waitFor(() => expect(table()).toBeTruthy());
    const row = within(table()).getAllByRole('row')[1]!;
    expect(row.textContent).toContain('review');
    expect(row.textContent).toContain('Acme cap');
    expect(row.textContent).toContain('claude-sub/claude-opus-5');
    expect(row.textContent).toContain('review 0.90');
    expect(row.textContent).toContain('1m 18s');
    expect(row.textContent).toContain('$0.46');
  });

  test('the mark is the last word, and a run that did not finish says so instead', async () => {
    runs = [run({ mark: 'not-right' }), run({ status: 'timeout', mark: undefined, durationMs: undefined })];
    render(<RoutingLedger />);
    await waitFor(() => expect(table()).toBeTruthy());
    const rows = within(table()).getAllByRole('row');
    expect(rows[1]!.textContent).toContain('not-right');
    expect(rows[2]!.textContent).toContain('timeout');
  });

  test('a long ledger shows the recent ones and unfolds the rest in place', async () => {
    runs = Array.from({ length: 26 }, (_, i) => run({ thread: `thread ${i}` }));
    render(<RoutingLedger />);
    await waitFor(() => expect(table()).toBeTruthy());
    expect(within(table()).getAllByRole('row')).toHaveLength(21); // 20 + the header
    await userEvent.click(screen.getByRole('button', { name: '6 more' }));
    expect(within(table()).getAllByRole('row')).toHaveLength(27);
  });

  test('nothing yet, and a record that cannot be read, both say so', async () => {
    runs = [];
    render(<RoutingLedger />);
    await waitFor(() => expect(screen.getByText(/Nothing has run yet/)).toBeTruthy());
    cleanup();

    status = 500;
    render(<RoutingLedger />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not be read'));
  });

  test('the words', () => {
    const now = new Date('2026-09-02T12:00:00.000Z');
    expect(whenOf('2026-09-02T11:59:30.000Z', now)).toBe('just now');
    expect(whenOf('not a date', now)).toBe('');
    expect(tookOf(1234)).toBe('1.2s');
    expect(tookOf(18_400)).toBe('18s');
    expect(tookOf(124_000)).toBe('2m 04s');
    expect(tookOf(undefined)).toBe('');
    expect(costOf(0.004)).toBe('<$0.01');
    expect(costOf(0.46)).toBe('$0.46');

    // The policy is worth saying, but never twice.
    expect(whyOf(run({ policy: 'stays-local' }))).toBe('review 0.90 · stays on this machine');
    expect(whyOf(run({ policy: 'stays-local', routeReason: { kind: 'stays-local', text: 'stays on this machine' } }))).toBe('stays on this machine');
    expect(whyOf(run({ routeReason: undefined }))).toBe('');
  });
});
