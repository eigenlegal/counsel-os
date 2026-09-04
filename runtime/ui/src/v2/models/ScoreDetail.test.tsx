import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { EvalResult } from '../../api/types';
import { ScoreDetail } from './ScoreDetail';

const realFetch = globalThis.fetch;

const result = (over: Partial<EvalResult> & Pick<EvalResult, 'fixtureId'>): EvalResult => ({
  at: '2026-09-03T10:00:00.000Z',
  task: 'review',
  source: 'shipped',
  providerId: 'claude-sub/claude-opus-5',
  modelVersion: 'claude-opus-5',
  score: 0.82,
  terms: { recall: 0.9, precision: 0.75 },
  notes: [],
  durationMs: 4200,
  ...over,
});

function install(results: EvalResult[]): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input) === '/evals/results') {
      return new Response(JSON.stringify({ results }), { headers: { 'content-type': 'application/json' } });
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

describe('what a score is made of', () => {
  test('names the fixtures behind the number, and what the scorer counted', async () => {
    // A board cell used to be a number with nothing behind it: 0.82 on
    // review, and no way to ask which documents it got right.
    install([result({ fixtureId: 'demo-nda' }), result({ fixtureId: 'escalation-trigger', score: 0.4, notes: ['missed the escalation clause'] })]);
    render(<ScoreDetail task="review" set="shipped" providerId="claude-sub/claude-opus-5" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('demo-nda')).toBeTruthy());
    expect(screen.getByText('0.82')).toBeTruthy();
    // Both fixtures carry the same terms; each row shows its own.
    expect(screen.getAllByText('recall 0.90')).toHaveLength(2);
    expect(screen.getByText('missed the escalation clause')).toBeTruthy();
  });

  test('only this task, this SET and this provider', async () => {
    // A board cell is one (set, provider, model) triple. Filtering on task
    // and provider alone mixed the shipped suite into "how does this model
    // do on MY matters", which is the question the practice set exists for.
    install([
      result({ fixtureId: 'mine' }),
      result({ fixtureId: 'other-task', task: 'draft' }),
      result({ fixtureId: 'other-set', source: 'practice' }),
      result({ fixtureId: 'other-model', providerId: 'ollama/gemma4:e4b' }),
    ]);
    render(<ScoreDetail task="review" set="shipped" providerId="claude-sub/claude-opus-5" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('mine')).toBeTruthy());
    expect(screen.queryByText('other-task')).toBeNull();
    expect(screen.queryByText('other-set')).toBeNull();
    expect(screen.queryByText('other-model')).toBeNull();
  });

  test('two model versions of one provider are two rows, and say which is which', async () => {
    // Same run, same fixture, two versions: the key omitted the version, so
    // React saw a duplicate and the rows looked identical.
    install([
      result({ fixtureId: 'demo-nda', modelVersion: 'claude-opus-5', score: 0.8 }),
      result({ fixtureId: 'demo-nda', modelVersion: 'claude-sonnet-5', score: 0.6 }),
    ]);
    render(<ScoreDetail task="review" set="shipped" providerId="claude-sub/claude-opus-5" onClose={() => {}} />);
    await waitFor(() => expect(screen.getAllByText('demo-nda').length).toBe(2));
    expect(screen.getByText('claude-opus-5')).toBeTruthy();
    expect(screen.getByText('claude-sonnet-5')).toBeTruthy();
  });

  test('a failed run says failed rather than showing a number it does not have', async () => {
    install([result({ fixtureId: 'broke', score: null, terms: {} })]);
    render(<ScoreDetail task="review" set="shipped" providerId="claude-sub/claude-opus-5" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('failed')).toBeTruthy());
  });

  test('an unscored pair says so, and where to score it', async () => {
    install([]);
    render(<ScoreDetail task="review" set="shipped" providerId="claude-sub/claude-opus-5" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Run it from the board above/)).toBeTruthy());
  });

  test('it can be closed', async () => {
    install([]);
    let closed = false;
    render(<ScoreDetail task="review" set="shipped" providerId="claude-sub/claude-opus-5" onClose={() => (closed = true)} />);
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(closed).toBe(true);
  });
});
