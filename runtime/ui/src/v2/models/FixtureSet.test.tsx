import { cleanup, render, screen, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { EvalFixture } from '../../api/types';
import { FixtureSet } from './FixtureSet';

const realFetch = globalThis.fetch;

function install(fixtures: EvalFixture[]): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input) === '/evals/fixtures') {
      return new Response(JSON.stringify({ fixtures }), { headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected fetch: ${String(input)}`);
  }) as unknown as typeof fetch;
}

const fixture = (over: Partial<EvalFixture> & Pick<EvalFixture, 'id'>): EvalFixture => ({
  scorer: 'findings',
  task: 'review',
  source: 'shipped',
  set: 'shipped',
  runnable: true,
  ...over,
});

beforeEach(() => sessionStorage.setItem(TOKEN_KEY, 'test-token'));
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('the eval set', () => {
  test('says how many fixtures can actually be scored, and why the rest cannot', async () => {
    // The practice had thirteen fixtures and five that could not run, and
    // the app never said so — you read a board of scores with no way to
    // learn what was behind it.
    install([fixture({ id: 'a' }), fixture({ id: 'b' }), fixture({ id: 'c', runnable: false })]);
    render(<FixtureSet />);
    await waitFor(() => expect(screen.getByText(/3 fixtures/)).toBeTruthy());
    expect(screen.getByText(/2 can run/)).toBeTruthy();
    expect(screen.getByText(/1 carries no documents/)).toBeTruthy();
    expect(screen.getByText('no documents to read')).toBeTruthy();
  });

  test('your own work comes before the suite that ships with the tool', async () => {
    install([
      fixture({ id: 'ship', set: 'shipped' }),
      fixture({ id: 'bench', set: 'benchmark' }),
      fixture({ id: 'mine', set: 'practice' }),
    ]);
    render(<FixtureSet />);
    await waitFor(() => expect(screen.getAllByRole('heading').length).toBe(3));
    // Annotated: the late-bound `screen` (test/dom.ts) returns untyped nodes.
    expect((screen.getAllByRole('heading') as HTMLElement[]).map((h: HTMLElement) => h.textContent)).toEqual(['practice', 'shipped', 'benchmark']);
    // And each set says what it IS: the names alone do not.
    expect(screen.getByText(/the only set that measures this practice/)).toBeTruthy();
  });

  test('a fixture is named by its title, not its slug', async () => {
    install([fixture({ id: 'ai-training-data', title: 'AI vendor addendum with customer-data training rights' })]);
    render(<FixtureSet />);
    await waitFor(() => expect(screen.getByText('AI vendor addendum with customer-data training rights')).toBeTruthy());
    expect(screen.queryByText('ai-training-data')).toBeNull();
  });

  test('an empty set says what would fill it', async () => {
    install([]);
    render(<FixtureSet />);
    await waitFor(() => expect(screen.getByText(/Save one from a conversation/)).toBeTruthy());
  });
});
