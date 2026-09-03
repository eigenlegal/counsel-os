import { cleanup, render, screen, waitFor, within } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { Health, Scoreboard } from '../../api/types';
import { ModelsPage } from './ModelsPage';

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [
    { id: 'fake/fake', kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } },
    { id: 'claude-sub/claude-opus-5', kind: 'harness', auth: 'subscription', capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200000, auth: 'subscription' } },
  ],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

const board: Scoreboard = {
  at: '2026-09-02T10:00:00.000Z',
  tasks: [
    {
      task: 'review',
      sets: {
        practice: { fixtures: 0, rows: [] },
        shipped: { fixtures: 8, rows: [] },
        benchmark: { fixtures: 0, rows: [] },
      },
    },
  ],
};

const realFetch = globalThis.fetch;
let ledgerRuns: unknown[] = [];

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 't');
  ledgerRuns = [
    {
      runId: 'r-1',
      threadId: 't-1',
      thread: 'Acme cap',
      at: '2026-09-02T10:00:00.000Z',
      status: 'done',
      provider: 'claude-sub/claude-opus-5',
      task: 'review',
      routeReason: { kind: 'scored', text: 'review 0.90' },
      durationMs: 4200,
    },
  ];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/evals/scoreboard') return json(board);
    if (url.startsWith('/routing/ledger')) return json({ runs: ledgerRuns });
    if (url === '/routing') return json({ defaults: { minScore: 0.7, prefer: 'quality' }, tasks: {} });
    // The eval set the board is scored against.
    if (url === '/evals/fixtures') {
      return json({ fixtures: [{ id: 'demo-nda', scorer: 'findings', task: 'review', source: 'shipped', set: 'shipped', runnable: true }] });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('the Models page', () => {
  test('asks the operator’s three questions in order: how they score, what against, and what ran', async () => {
    render(<ModelsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('table', { name: /scores/ })).toBeTruthy());

    const headings = Array.from(document.querySelectorAll('.v2-group h2'), el => el.textContent);
    // The set sits between the board and the ledger: a score you cannot
    // trace back to a document is a number taken on faith.
    expect(headings).toEqual(['How they score', 'Your eval set', 'What ran']);

    // The board's columns are the providers the runtime actually loaded.
    const table = screen.getByRole('table', { name: /scores/ });
    expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['task', 'fake/fake', 'claude-sub/claude-opus-5']);

    // And the ledger is on the same page, under its own heading.
    await waitFor(() => expect(screen.getByRole('table', { name: 'What ran' })).toBeTruthy());
    expect(within(screen.getByRole('table', { name: 'What ran' })).getByText(/review 0.90/)).toBeTruthy();
  });

  test('says what a scoring run costs before anyone starts one', async () => {
    render(<ModelsPage health={health} />);
    await waitFor(() => expect(screen.getByRole('table', { name: /scores/ })).toBeTruthy());
    // The warning that moved with the page: this is the one screen in the
    // app whose buttons spend the window.
    expect(screen.getByText(/Scoring runs real steps and costs real calls/)).toBeTruthy();
  });
});
