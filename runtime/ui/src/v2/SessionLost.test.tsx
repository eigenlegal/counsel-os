import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, readToken, TOKEN_KEY } from '../api/token';
import { SERVE_COMMAND, SessionLost } from './SessionLost';

const realFetch = globalThis.fetch;
const hex = 'abcdef0123456789'.repeat(4);

let probes: RequestInit[] = [];
let runtimeUp = true;

beforeEach(() => {
  probes = [];
  runtimeUp = true;
  clearToken();
  sessionStorage.clear();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/health')) {
      probes.push(init ?? {});
      if (!runtimeUp) throw new TypeError('Failed to fetch');
      return new Response('{"error":"unauthorized"}', { status: 401, headers: { 'content-type': 'application/json' } });
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

describe('SessionLost', () => {
  test('the runtime answers 401 → "running, this tab has no key"; the probe carries no token', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'stale-token');
    render(<SessionLost onRestored={() => {}} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('The runtime is running'));
    expect(probes).toHaveLength(1);
    const headers = probes[0]!.headers as Record<string, string> | undefined;
    expect(headers?.['authorization']).toBeUndefined();
  });

  test('nothing listening → "not running", with the command to start it', async () => {
    runtimeUp = false;
    render(<SessionLost onRestored={() => {}} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('counsel-os is not running'));
    expect(screen.getByText(SERVE_COMMAND)).toBeTruthy();
  });

  test('"check again" probes again', async () => {
    runtimeUp = false;
    render(<SessionLost onRestored={() => {}} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('not running'));
    runtimeUp = true;
    await userEvent.click(screen.getByRole('button', { name: 'check again' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('The runtime is running'));
    expect(probes).toHaveLength(2);
  });

  test('a pasted printed URL stores the token in the tab and hands control back', async () => {
    let restored = 0;
    render(<SessionLost onRestored={() => (restored += 1)} />);
    await userEvent.type(screen.getByLabelText('Paste the address the runtime printed'), `http://127.0.0.1:7431/#token=${hex}`);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(restored).toBe(1);
    expect(readToken()).toBe(hex);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(hex);
    expect(globalThis.location.hash).not.toContain('token');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('a paste that is not a token says so inline and stores nothing', async () => {
    let restored = 0;
    render(<SessionLost onRestored={() => (restored += 1)} />);
    const field = screen.getByLabelText('Paste the address the runtime printed');
    await userEvent.type(field, 'http://127.0.0.1:7431/');
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('alert').textContent).toContain('not an address the runtime printed');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(restored).toBe(0);
    expect(readToken()).toBeNull();
    // Typing again clears the error.
    await userEvent.type(field, 'x');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('Open is disabled until something is pasted', async () => {
    render(<SessionLost onRestored={() => {}} />);
    expect((screen.getByRole('button', { name: 'Open' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('SessionLost, already signed in by cookie', () => {
  test('a 2xx probe means the browser holds the session: hand straight back, nothing to paste', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).startsWith('/health')) return new Response('{"vault":"/v"}', { status: 200, headers: { 'content-type': 'application/json' } });
      throw new Error(`unexpected fetch: ${String(input)}`);
    }) as unknown as typeof fetch;
    let restored = 0;
    render(<SessionLost onRestored={() => (restored += 1)} />);
    await waitFor(() => expect(restored).toBe(1));
  });
});
