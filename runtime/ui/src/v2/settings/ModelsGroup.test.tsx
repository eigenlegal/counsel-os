import { cleanup, render, screen, userEvent, waitFor, within } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { RoutingView, Scoreboard, ScoreboardRow, ScoreboardSet } from '../../api/types';
import { confirmLine, ModelsGroup, runCost, scoredLabel, staleness } from './ModelsGroup';

const realFetch = globalThis.fetch;

const baseRouting: RoutingView = {
  defaults: { minScore: 0.7, prefer: 'quality' },
  tasks: { review: { minScore: 0.7, prefer: 'quality', picked: { providerId: 'claude-sub/claude-opus-5', reason: 'review 0.91' } } },
};
let routing: RoutingView = baseRouting;
let routingPuts: Array<{ task: string; minScore?: number; prefer?: string; pinned?: string | null }> = [];
let routingPutStatus = 200;

function row(over: Partial<ScoreboardRow> & { providerId: string }): ScoreboardRow {
  return {
    modelVersion: over.providerId.slice(over.providerId.indexOf('/') + 1),
    score: 0.82,
    scored: 8,
    sampleSize: 8,
    failed: [],
    medianMs: 4200,
    meanCostUsd: 0.07,
    lastAt: '2026-08-30T00:00:00.000Z',
    staleDays: 3,
    ...over,
  };
}

type Sets = Scoreboard['tasks'][number]['sets'];
const none = (fixtures = 0): ScoreboardSet => ({ fixtures, rows: [] });

const scored: Scoreboard = {
  at: '2026-09-02T00:00:00.000Z',
  tasks: [
    {
      task: 'review',
      sets: {
        practice: { fixtures: 2, rows: [row({ providerId: 'fake/fake', score: 0.5, scored: 2, staleDays: 0 })] },
        shipped: {
          fixtures: 8,
          rows: [
            row({ providerId: 'claude-sub/claude-opus-5', modelVersion: 'claude-opus-5', score: 0.91 }),
            row({ providerId: 'fake/fake', score: null, scored: 0, failed: [{ fixtureId: 'law-beats-practice', reason: 'step timed out' }], meanCostUsd: null }),
          ],
        },
        benchmark: none(),
      } satisfies Sets,
    },
    { task: 'extract', sets: { practice: none(), shipped: none(1), benchmark: none() } },
  ],
};

const nothing: Scoreboard = { at: '2026-09-02T00:00:00.000Z', tasks: [{ task: 'review', sets: { practice: none(), shipped: none(8), benchmark: none() } }] };

let board: Scoreboard = scored;
let estimate: { count: number; estimateUsd: number | null } = { count: 8, estimateUsd: 0.6 };
let runs: unknown[] = [];
let frames = '';
let runStatus = 200;

function sse(text: string): Response {
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      // Two chunks, split inside a frame, so the reassembly is exercised.
      c.enqueue(bytes.slice(0, 40));
      c.enqueue(bytes.slice(40));
      c.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const json = (b: unknown, status = 200): Response => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  routing = baseRouting;
  routingPuts = [];
  routingPutStatus = 200;
  board = scored;
  estimate = { count: 8, estimateUsd: 0.6 };
  runs = [];
  runStatus = 200;
  frames =
    'event: plan\ndata: {"count":8,"providerId":"fake/fake","estimateUsd":0.6}\n\n' +
    'event: progress\ndata: {"index":0,"total":8,"fixtureId":"law-beats-practice"}\n\n' +
    'event: result\ndata: {"fixtureId":"law-beats-practice","score":1}\n\n' +
    'event: done\ndata: {"summary":{"count":8,"scored":8,"failed":0,"mean":0.9},"saved":true}\n\n';
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/evals/scoreboard') return json(board);
    if (url.startsWith('/evals/estimate?')) {
      const q = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      return json({ task: q.get('task'), providerId: q.get('providerId'), ...estimate, needsConfirm: estimate.estimateUsd !== null && estimate.estimateUsd > 1 });
    }
    if (url === '/routing' && (init?.method ?? 'GET') === 'GET') return json(routing);
    if (url === '/routing' && init?.method === 'PUT') {
      const change = JSON.parse(String(init.body)) as { task: string; minScore?: number; prefer?: string; pinned?: string | null };
      if (routingPutStatus !== 200) {
        routingPuts.push(change);
        return json({ error: 'the vault is read-only' }, routingPutStatus);
      }
      routingPuts.push(change);
      const entry = { ...(routing.tasks[change.task] ?? { minScore: 0.7, prefer: 'quality' }) };
      if (change.minScore !== undefined) entry.minScore = change.minScore;
      if (change.prefer !== undefined) entry.prefer = change.prefer;
      if (change.pinned === null) delete entry.pinned;
      else if (change.pinned !== undefined) entry.pinned = change.pinned;
      routing = { ...routing, tasks: { ...routing.tasks, [change.task]: entry } };
      return json(routing);
    }
    if (url === '/evals/run' && init?.method === 'POST') {
      runs.push(JSON.parse(String(init.body)));
      if (runStatus !== 200) return json({ error: 'eval-busy' }, runStatus);
      return sse(frames);
    }
    throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('ModelsGroup', () => {
  test('a task × provider ledger with set-text scores, opened on the first set with a score; the tabs keep the sets apart', async () => {
    render(<ModelsGroup providerIds={['claude-sub/claude-opus-5', 'fake/fake']} />);
    // practice has a row, so the tabs open there.
    await waitFor(() => expect(screen.getByRole('table', { name: 'practice scores' })).toBeTruthy());
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t: HTMLElement) => t.textContent)).toEqual(['practice', 'shipped', 'benchmark']);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('0.50')).toBeTruthy();
    expect(screen.queryByText('0.91')).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: 'shipped' }));
    const table = screen.getByRole('table', { name: 'shipped scores' });
    expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['task', 'claude-sub/claude-opus-5', 'fake/fake']);
    // The rowheader also carries the routing line; its own text is the task and its fixture count.
    expect(within(table).getAllByRole('rowheader').map(h => h.querySelector('.v2-models-taskname')!.textContent)).toEqual(['review8 fixtures', 'extract1 fixture']);
    // The score is text, with the facts under it; the failed cell carries its reason and offers a retry.
    expect(screen.getByText('0.91')).toBeTruthy();
    expect(screen.getByText('8/8 · 3d ago · 4.2s · $0.07/run')).toBeTruthy();
    expect(screen.getByText('failed')).toBeTruthy();
    expect(screen.getByText('step timed out')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'retry' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'again' })).toBeTruthy();
    // An unscored cell is a quiet "score" link; nothing scored anywhere is not the case here.
    expect(screen.getAllByRole('button', { name: 'score' })).toHaveLength(2);
    expect(screen.queryByText(/Nothing scored yet/)).toBeNull();
    // No pill, no bar.
    expect(document.querySelector('.v2-pill, progress, .bar')).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: 'benchmark' }));
    expect(screen.queryByText('0.91')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'no fixtures' })).toHaveLength(4);
  });

  test('the empty state', async () => {
    board = nothing;
    render(<ModelsGroup providerIds={['fake/fake']} />);
    await waitFor(() => expect(screen.getByText('Nothing scored yet. Score a provider on a task to fill this in.')).toBeTruthy());
    expect(screen.getByRole('tab', { name: 'shipped' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: 'score' })).toBeTruthy();
  });

  test('score asks once — count and cost on one line — then runs with the progress in place and reloads the board', async () => {
    board = nothing;
    render(<ModelsGroup providerIds={['fake/fake']} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'score' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'score' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Score fake/fake on review' });
    await waitFor(() => expect(confirm.textContent).toContain('Score fake/fake on review · 8 fixtures · about $0.60'));
    expect(runs).toHaveLength(0);

    board = scored;
    await userEvent.click(within(confirm).getByRole('button', { name: 'run' }));
    expect(runs).toEqual([{ task: 'review', providerId: 'fake/fake', save: true, confirm: true }]);
    // The board reloads once the stream ends; the tab stays where it was.
    await waitFor(() => expect(screen.getByText('0.91')).toBeTruthy());
    expect(screen.getByRole('tab', { name: 'shipped' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  test('progress shows on the same line while the stream runs', async () => {
    board = nothing;
    let release: () => void = () => {};
    const gate = new Promise<void>(r => (release = r));
    const inner = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/evals/run') {
        const bytes = new TextEncoder().encode(frames);
        // `start` must RETURN before the stream is readable. Awaiting the
        // gate inside it leaves the response body unstarted until the gate
        // opens, so the progress this test is about never arrives and the
        // test times out rather than failing an assertion (it did, on CI).
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(bytes.slice(0, frames.indexOf('event: result')));
            void gate.then(() => {
              c.enqueue(bytes.slice(frames.indexOf('event: result')));
              c.close();
            });
          },
        });
        runs.push(JSON.parse(String(init?.body)));
        return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
      }
      return inner(input, init);
    }) as unknown as typeof fetch;
    render(<ModelsGroup providerIds={['fake/fake']} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'score' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'score' }));
    await userEvent.click(await screen.findByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('scoring 1 of 8 · law-beats-practice'));
    release();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    // 20s, not the default 5: this test renders the ledger, opens the cost
    // line, runs a stream and waits for four states, and on a loaded
    // two-core CI box the sum of those waits is what times out — the
    // assertions themselves have always held.
  }, 20_000);

  test('cost unknown reads as such; cancel closes the line; a refused run says why on the cell', async () => {
    board = nothing;
    estimate = { count: 8, estimateUsd: null };
    render(<ModelsGroup providerIds={['fake/fake']} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'score' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'score' }));
    await waitFor(() => expect(screen.getByRole('alertdialog').textContent).toContain('8 fixtures · cost unknown'));
    await userEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(runs).toHaveLength(0);

    runStatus = 409;
    await userEvent.click(screen.getByRole('button', { name: 'score' }));
    await userEvent.click(await screen.findByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByText('failed · another run is in progress')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'score' })).toBeTruthy();
  });

  test('a stream error lands on the cell as failed · reason', async () => {
    board = nothing;
    frames = 'event: plan\ndata: {"count":8,"providerId":"fake/fake","estimateUsd":null}\n\nevent: error\ndata: {"message":"vault not found"}\n\n';
    render(<ModelsGroup providerIds={['fake/fake']} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'score' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'score' }));
    await userEvent.click(await screen.findByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByText('failed · vault not found')).toBeTruthy());
  });

  test('the words', () => {
    expect(staleness(0)).toBe('today');
    expect(staleness(3)).toBe('3d ago');
    expect(confirmLine('claude-sub/claude-opus-5', 'review', { task: 'review', providerId: 'x', count: 8, estimateUsd: 0.6, needsConfirm: false })).toBe('Score claude-sub/claude-opus-5 on review · 8 fixtures · about $0.60');
    expect(confirmLine('x', 'draft', { task: 'draft', providerId: 'x', count: 1, estimateUsd: null, needsConfirm: false })).toBe('Score x on draft · 1 fixture · cost unknown');
  });
});

describe('the facts line', () => {
  test('a scored count the fixture count cannot hold stands on its own', () => {
    // A result left behind by a fixture whose task changed: `1/0` read as a
    // broken fraction.
    expect(scoredLabel(1, 0)).toBe('1 scored');
    expect(scoredLabel(3, 2)).toBe('3 scored');
    expect(scoredLabel(2, 8)).toBe('2/8');
  });

  test('cost is money to the cent, and says so when a run is cheaper than one', () => {
    expect(runCost(0.23)).toBe('$0.23/run');
    expect(runCost(0.005)).toBe('$0.01/run');
    expect(runCost(0.0004)).toBe('<$0.01/run');
  });
});

describe('how a task is routed', () => {
  test('the bar, the preference and who that picks read under the task; changing one saves it', async () => {
    render(<ModelsGroup providerIds={['claude-sub/claude-opus-5', 'fake/fake']} />);
    await waitFor(() => expect(screen.getByRole('table', { name: /scores/ })).toBeTruthy());
    const line = document.querySelector('.v2-routing')!;
    expect(line.textContent).toContain('bar 0.70 · by quality');
    expect(line.textContent).toContain('picks claude-sub/claude-opus-5');

    await userEvent.click(within(line as HTMLElement).getByRole('button', { name: 'change' }));
    await userEvent.click(within(line as HTMLElement).getByRole('button', { name: '0.8' }));
    await waitFor(() => expect(routingPuts).toEqual([{ task: 'review', minScore: 0.8 }]));
    await waitFor(() => expect(document.querySelector('.v2-routing')!.textContent).toContain('bar 0.80'));

    await userEvent.click(within(document.querySelector('.v2-routing') as HTMLElement).getByRole('button', { name: 'cost' }));
    await waitFor(() => expect(routingPuts[1]).toEqual({ task: 'review', prefer: 'cost' }));
  });

  test('a pinned task says so and offers to unpin', async () => {
    routing = { ...baseRouting, tasks: { review: { minScore: 0.7, prefer: 'quality', pinned: 'fake/fake' } } };
    render(<ModelsGroup providerIds={['claude-sub/claude-opus-5', 'fake/fake']} />);
    await waitFor(() => expect(document.querySelector('.v2-routing')!.textContent).toContain('pinned fake/fake'));
    await userEvent.click(within(document.querySelector('.v2-routing') as HTMLElement).getByRole('button', { name: 'change' }));
    await userEvent.click(within(document.querySelector('.v2-routing') as HTMLElement).getByRole('button', { name: 'unpin' }));
    await waitFor(() => expect(routingPuts).toEqual([{ task: 'review', pinned: null }]));
    await waitFor(() => expect(document.querySelector('.v2-routing')!.textContent).not.toContain('pinned'));
  });
});

test('a change that fails says so on its own line and leaves the ledger standing', async () => {
  routingPutStatus = 500;
  render(<ModelsGroup providerIds={['claude-sub/claude-opus-5', 'fake/fake']} />);
  await waitFor(() => expect(screen.getByRole('table', { name: /scores/ })).toBeTruthy());
  const line = document.querySelector('.v2-routing') as HTMLElement;
  await userEvent.click(within(line).getByRole('button', { name: 'change' }));
  await userEvent.click(within(line).getByRole('button', { name: '0.8' }));

  await waitFor(() => expect(document.querySelector('.v2-routing-error')?.textContent).toContain('not changed'));
  // The scores, the tabs and the score actions are all still there.
  expect(screen.getByRole('table', { name: /scores/ })).toBeTruthy();
  expect(document.querySelector('.v2-routing')!.textContent).toContain('bar 0.70');
});
