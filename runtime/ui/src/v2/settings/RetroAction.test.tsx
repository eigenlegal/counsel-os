import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { RetroStatus } from '../../api/types';
import { RetroAction, retroDateLabel } from './RetroAction';

const realFetch = globalThis.fetch;
let status: RetroStatus | null = null;

function json(body: unknown, code = 200): Response {
  return new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/retro') return status === null ? json({ error: 'no route' }, 404) : json(status);
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
  status = null;
});

describe('RetroAction', () => {
  test('never run: says so with the cadence, and the button opens a retro', async () => {
    status = { lastRetroAt: null, threadId: null, cadenceDays: 90, daysSince: null, dueAt: null, due: false, reason: 'No retro yet' };
    let started = 0;
    render(<RetroAction onStart={() => (started += 1)} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('No retro yet · due every 90 days'));
    await userEvent.click(screen.getByRole('button', { name: 'Run a retro' }));
    expect(started).toBe(1);
  });

  test('last run and due now, as set text', async () => {
    status = { lastRetroAt: '2026-05-01T10:00:00.000Z', threadId: 't', cadenceDays: 60, daysSince: 123, dueAt: '2026-06-30T10:00:00.000Z', due: true, reason: 'Last retro 123 days ago' };
    render(<RetroAction onStart={() => {}} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('(123 days ago) · due every 60 days · due now'));
    expect(screen.getByRole('status').textContent).toContain(retroDateLabel('2026-05-01T10:00:00.000Z'));
    expect(document.querySelector('.v2-pill')).toBeNull();
  });

  test('an older runtime without /retro keeps the row and the action, with no line', async () => {
    render(<RetroAction onStart={() => {}} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run a retro' })).toBeTruthy());
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
