import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { Drawer } from './Drawer';

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** The tree lists an empty root; a read returns one small file. */
function install(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/list')) return json([{ path: 'matters', kind: 'dir' }]);
    if (url.startsWith('/vault/read')) return json({ path: 'matters/acme.md', content: '# Acme\n', version: 'abc1234def' });
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  install();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('Drawer', () => {
  test('shows the tree, and the file when a path is open', async () => {
    render(<Drawer path="matters/acme.md" onOpen={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('matters')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy());
    expect(screen.getByText(/version abc1234def/)).toBeTruthy();
    // The full page is one link away, at the same path.
    expect((screen.getByRole('link', { name: 'open page' }) as HTMLAnchorElement).getAttribute('href')).toBe(
      '#/vault?path=matters%2Facme.md',
    );
  });

  test('with no path it asks for one', async () => {
    render(<Drawer path={null} onOpen={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('Pick a file to read it.')).toBeTruthy());
    expect(screen.queryByRole('link', { name: 'open page' })).toBeNull();
  });

  test('the close button and Esc both close it', async () => {
    let closed = 0;
    render(
      <Drawer
        path={null}
        onOpen={() => {}}
        onClose={() => {
          closed += 1;
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close vault' }));
    expect(closed).toBe(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toBe(2);
  });
});
