import { cleanup, render, screen, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import { TASK_IDS } from '../../tasks';
import { RoutingTable } from './RoutingTable';

const realFetch = globalThis.fetch;

function install(tasks: Record<string, unknown>): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
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

  test('a task the taxonomy does not know is still shown', async () => {
    // A practice may route work we have not heard of; dropping its row
    // would hide a rule that is really in force.
    install({ 'due-diligence': { minScore: 0.7, prefer: 'quality' } });
    render(<RoutingTable fallback={null} />);
    await waitFor(() => expect(screen.getByText('due-diligence')).toBeTruthy());
    expect(screen.getAllByText('no model loaded').length).toBeGreaterThan(0);
  });
});
