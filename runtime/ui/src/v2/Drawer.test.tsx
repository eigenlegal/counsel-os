import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { Drawer } from './Drawer';

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** A two-level vault; a read returns one small file. */
function install(read?: () => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/list')) {
      const dir = new URL(url, 'http://127.0.0.1').searchParams.get('dir') ?? '';
      if (dir === '') return json([{ path: 'matters', kind: 'dir' }]);
      if (dir === 'matters') return json([{ path: 'matters/acme.md', kind: 'file' }]);
      return json([]);
    }
    if (url.startsWith('/vault/read'))
      return read === undefined ? json({ path: 'matters/acme.md', content: '# Acme\n', version: 'abc1234def', mtimeMs: null }) : read();
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
    // The Reader's crumbs and meta line replace FileView's path + full hash.
    expect(document.querySelector('.v2-doc-crumbs b')?.textContent).toBe('acme.md');
    expect(document.querySelector('.v2-doc-meta')?.textContent).toBe('version abc1234');
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

  test('a file nothing has written yet is a sentence, not a filesystem error', async () => {
    install(() => json({ error: "ENOENT: no such file or directory, open '/tmp/vault/practice/standards/nda.md'" }, 404));
    render(<Drawer path="practice/standards/nda.md" onOpen={() => {}} onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText(/does not exist yet/)).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toContain('/tmp/vault');
  });

  test('a bumped revision makes the drawer read the file again', async () => {
    let content = '# Acme\nTerm: 2 years\n';
    install(() => json({ path: 'matters/acme.md', content, version: 'v1', mtimeMs: null }));
    const { rerender } = render(<Drawer path="matters/acme.md" revision={0} onOpen={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Term: 2 years/)).toBeTruthy());

    // What an approved proposal does to the file under an open drawer.
    content = '# Acme\nTerm: 3 years\n';
    rerender(<Drawer path="matters/acme.md" revision={1} onOpen={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Term: 3 years/)).toBeTruthy());
  });
});
