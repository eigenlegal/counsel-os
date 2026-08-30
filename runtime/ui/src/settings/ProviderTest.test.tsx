import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { ProviderTest } from './ProviderTest';

/**
 * The one control in settings that SPENDS something. Its confirm used to be
 * covered through the v1 providers form; that form went with the classic
 * design on 2026-08-30, and the guard is too important to lose with it.
 */

const PROVIDER = 'claude-sub/claude-opus-5';

const realFetch = globalThis.fetch;
let calls: { url: string; body: unknown }[] = [];

function respond(body: unknown, status = 200): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('ProviderTest', () => {
  test('asks before it spends a call, then shows the result', async () => {
    render(<ProviderTest providerId={PROVIDER} />);

    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    // The warning is on the page, not in a dialog nothing can drive.
    expect(screen.getByText(`This uses one call on ${PROVIDER}.`)).toBeTruthy();
    expect(calls).toHaveLength(0);

    respond({ ok: true, usage: { inputTokens: 12, outputTokens: 3 }, ms: 640 });
    await userEvent.click(screen.getByRole('button', { name: 'Run the test' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('ok'));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('/settings/test');
    expect(calls[0]!.body).toEqual({ provider: PROVIDER });
    expect(screen.getByRole('status').textContent).toContain('640 ms');
    expect(screen.getByRole('status').textContent).toContain('12 in / 3 out');
  });

  test('Cancel on the confirm spends nothing', async () => {
    render(<ProviderTest providerId={PROVIDER} />);
    respond({ ok: true, ms: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(calls).toHaveLength(0);
    expect(screen.queryByText(/This uses one call/)).toBeNull();
  });

  test('a provider that does not work is a result, not an error', async () => {
    render(<ProviderTest providerId={PROVIDER} />);
    respond({ ok: false, error: 'ANTHROPIC_API_KEY is not set', ms: 12 });

    await userEvent.click(screen.getByRole('button', { name: 'Test' }));
    await userEvent.click(screen.getByRole('button', { name: 'Run the test' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('failed'));
    expect(screen.getByRole('status').textContent).toContain('ANTHROPIC_API_KEY is not set');
  });
});
