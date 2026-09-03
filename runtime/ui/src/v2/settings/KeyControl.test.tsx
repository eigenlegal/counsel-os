import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import { KeyControl } from './KeyControl';

const realFetch = globalThis.fetch;
let calls: Array<{ method: string; url: string; body?: unknown }> = [];
let status = 204;

beforeEach(() => {
  calls = [];
  status = 204;
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ method: init?.method ?? 'GET', url: String(input), ...(init?.body === undefined ? {} : { body: JSON.parse(String(init.body)) }) });
    return status === 204 ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ error: 'the key was refused by Google' }), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('KeyControl', () => {
  test('not set: paste a key with the vendor link; paste → PUT with the value, then the field is gone and the value is nowhere', async () => {
    let changed = 0;
    render(<KeyControl id="google/gemini-2.5-pro" keySet={false} getKey="https://aistudio.google.com/apikey" where="keychain" onChanged={() => { changed += 1; }} />);
    expect(screen.getByText('not set')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'get a key' }).getAttribute('href')).toBe('https://aistudio.google.com/apikey');
    await userEvent.click(screen.getByRole('button', { name: 'paste a key' }));
    const field = screen.getByLabelText('Paste the key for google/gemini-2.5-pro') as HTMLInputElement;
    expect(field.type).toBe('password');
    expect(screen.getByText(/It goes to your Keychain/)).toBeTruthy();
    await userEvent.type(field, 'AIza-secret-123');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(changed).toBe(1));
    expect(calls).toEqual([{ method: 'PUT', url: '/providers/google/gemini-2.5-pro/key', body: { value: 'AIza-secret-123' } }]);
    expect(screen.queryByLabelText('Paste the key for google/gemini-2.5-pro')).toBeNull();
    expect(document.body.innerHTML).not.toContain('AIza-secret-123');
  });

  test('set: replace and remove; remove → DELETE', async () => {
    let changed = 0;
    render(<KeyControl id="openrouter/anthropic/claude-x" keySet={true} where="file" onChanged={() => { changed += 1; }} />);
    expect(screen.getByText('set')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'replace' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(changed).toBe(1));
    expect(calls).toEqual([{ method: 'DELETE', url: '/providers/openrouter/anthropic/claude-x/key' }]);
  });

  test('from the environment reads as such and still offers a paste; a refused key is a sentence, not a crash', async () => {
    status = 500;
    render(<KeyControl id="google/gemini-2.5-pro" keySet="env" where="libsecret" onChanged={() => {}} />);
    expect(screen.getByText('from the environment')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'paste a key' }));
    await userEvent.type(screen.getByLabelText('Paste the key for google/gemini-2.5-pro'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('refused'));
  });

  test('a provider not saved yet can still take its key — that is the order the work happens in', async () => {
    // It used to say "save the row, then paste the key here", which could
    // not be done: the row would not save without a model, and the vendor
    // would not list its models without the key.
    const calls: Array<{ url: string; method: string }> = [];
    const realFetch = globalThis.fetch;
    let stored = false;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method });
      if (method === 'GET') return new Response(JSON.stringify({ keySet: stored }), { headers: { 'content-type': 'application/json' } });
      if (method === 'PUT') stored = true;
      if (method === 'DELETE') stored = false;
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    let changed = 0;
    render(<KeyControl id="google/" keySet={undefined} where="keychain" onChanged={() => (changed += 1)} />);
    // It ASKS the runtime rather than guessing: a key set on an earlier
    // visit has to show, or it can never be removed.
    await waitFor(() => expect(calls.some(c => c.method === 'GET')).toBe(true));
    // No empty path segment: `openai/` must not build `/providers/openai//key`.
    expect(calls[0]!.url).toBe('/providers/google/key');

    await userEvent.click(screen.getByRole('button', { name: 'paste a key' }));
    const user = userEvent.setup({ document });
    await user.type(screen.getByLabelText('Paste the key for google'), 'AIza-test');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(changed).toBe(1));
    expect(calls.some(c => c.method === 'PUT' && c.url === '/providers/google/key')).toBe(true);

    // And now it reads as set, with a way to take it back off again.
    await waitFor(() => expect(screen.getByText('set')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'remove' })).toBeTruthy();
    globalThis.fetch = realFetch;
  });

  test('a key already stored for a provider being set up is shown, not asked for again', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ keySet: true }), { headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
    render(<KeyControl id="google/" keySet={undefined} where="keychain" onChanged={() => {}} />);
    await waitFor(() => expect(screen.getByText('set')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'remove' })).toBeTruthy();
    globalThis.fetch = realFetch;
  });

  test('a runtime with no store says what to do instead', () => {
    render(<KeyControl id="google/gemini-2.5-pro" keySet={false} where={null} onChanged={() => {}} />);
    expect(screen.getByText(/no key store; set it in the environment/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'paste a key' })).toBeNull();
  });
});
