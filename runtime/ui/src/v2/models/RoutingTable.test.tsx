import { cleanup, render, screen, userEvent, waitFor, within } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import { TASK_IDS } from '../../tasks';
import { RoutingTable } from './RoutingTable';

const realFetch = globalThis.fetch;

let puts: unknown[] = [];

function install(tasks: Record<string, unknown>, onPut?: (body: unknown) => Response): void {
  puts = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === '/routing' && init?.method === 'PUT') {
      const body: unknown = JSON.parse(String(init.body));
      puts.push(body);
      return onPut === undefined
        ? new Response(JSON.stringify({ defaults: { minScore: 0.7, prefer: 'quality' }, tasks }), { headers: { 'content-type': 'application/json' } })
        : onPut(body);
    }
    if (String(input) === '/routing') {
      return new Response(JSON.stringify({ defaults: { minScore: 0.7, prefer: 'quality' }, tasks }), {
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`unexpected fetch: ${String(input)}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => sessionStorage.setItem(TOKEN_KEY, 'test-token'));
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('how work is routed', () => {
  test('every kind of work has a row, not just the ones already scored', async () => {
    // `/routing` answers for tasks that carry a policy or a score, so a
    // practice that has scored nothing saw ONE row and could not set a
    // route for the other ten kinds of work it does.
    install({});
    render(<RoutingTable fallback="claude-sub/claude-opus-5" />);
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1));
    const tasks = (screen.getAllByRole('rowheader') as HTMLElement[]).map((h: HTMLElement) => h.textContent);
    expect(tasks).toEqual([...TASK_IDS]);
  });

  test('an untouched task says what answers it, not that nothing does', async () => {
    // "nothing scored yet" on every row reads as "this work does not
    // route". It does route — to the default.
    install({});
    render(<RoutingTable fallback="claude-sub/claude-opus-5" />);
    await waitFor(() => expect(screen.getAllByText('claude-sub/claude-opus-5').length).toBe(TASK_IDS.length));
    expect(screen.getAllByText('the default').length).toBe(TASK_IDS.length);
  });

  test('a task with a rule of its own shows what that rule picks', async () => {
    install({ review: { minScore: 0.8, prefer: 'cost', picked: { providerId: 'ollama/gemma4:e4b', reason: 'review 0.91' } } });
    render(<RoutingTable fallback="claude-sub/claude-opus-5" />);
    await waitFor(() => expect(screen.getByText('ollama/gemma4:e4b')).toBeTruthy());
    expect(screen.getByText(/bar 0\.80 · by cost/)).toBeTruthy();
  });

  test('a rule that nothing clears says so, rather than naming the default', async () => {
    // The server swallows the router's throw, so a task WITH a rule and no
    // pick means nothing cleared the bar — the step would fail. Saying "the
    // default" there names a model that will not run.
    install({ review: { minScore: 0.9, prefer: 'quality' } });
    render(<RoutingTable fallback="claude-sub/claude-opus-5" />);
    await waitFor(() => expect(screen.getByText(/nothing clears this bar/)).toBeTruthy());
  });

  test('changing a bar writes it, for that task alone', async () => {
    install({});
    render(<RoutingTable fallback="claude-sub/claude-opus-5" />);
    await waitFor(() => expect(screen.getAllByRole('rowheader').length).toBeGreaterThan(1));

    const redline = (screen.getAllByRole('row') as HTMLElement[]).find((r: HTMLElement) => (r.textContent ?? '').startsWith('redline'))!;
    await userEvent.click(within(redline).getByRole('button', { name: 'change' }));
    await userEvent.click(within(redline).getByRole('button', { name: '0.9' }));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toEqual({ task: 'redline', minScore: 0.9 });
  });

  test('a change the server refuses is reported on its own row', async () => {
    install({}, () => new Response(JSON.stringify({ error: 'unknown provider: nope/nope' }), { status: 422, headers: { 'content-type': 'application/json' } }));
    render(<RoutingTable fallback="claude-sub/claude-opus-5" />);
    await waitFor(() => expect(screen.getAllByRole('rowheader').length).toBeGreaterThan(1));

    const draft = (screen.getAllByRole('row') as HTMLElement[]).find((r: HTMLElement) => (r.textContent ?? '').startsWith('draft'))!;
    await userEvent.click(within(draft).getByRole('button', { name: 'change' }));
    await userEvent.click(within(draft).getByRole('button', { name: '0.5' }));

    await waitFor(() => expect(within(draft).getByText(/unknown provider/)).toBeTruthy());
    // And only that row: ten other tasks are untouched by one task's failure.
    expect(screen.getAllByText(/unknown provider/)).toHaveLength(1);
  });

  test('a task the taxonomy does not know is still shown', async () => {
    // A practice may route work we have not heard of; dropping its row
    // would hide a rule that is really in force.
    install({ 'due-diligence': { minScore: 0.7, prefer: 'quality' } });
    render(<RoutingTable fallback={null} />);
    await waitFor(() => expect(screen.getByText('due-diligence')).toBeTruthy());
    expect(screen.getAllByText('no model loaded').length).toBeGreaterThan(0);
  });
});
