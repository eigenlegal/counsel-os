import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { VaultHit, VaultOverview } from '../../api/types';
import { VaultPage } from './VaultPage';

const realFetch = globalThis.fetch;

const overview: VaultOverview = {
  matters: [{ path: 'matters/acme.md', title: 'Acme Corp — NDA', frontmatter: {}, mtimeMs: 1 }],
  groups: { practice: 0, knowledge: 0, other: 0 },
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

let hits: VaultHit[] = [];
let searched: string[] = [];
let failSearch = false;

beforeEach(() => {
  hits = [];
  searched = [];
  failSearch = false;
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/vault/overview')) return json(overview);
    if (url === '/vault/list') return json([{ path: 'matters', kind: 'dir' }]);
    if (url.startsWith('/vault/search')) {
      searched.push(new URL(`http://x${url}`).searchParams.get('q') ?? '');
      if (failSearch) return new Response(JSON.stringify({ error: 'index unavailable' }), { status: 500, headers: { 'content-type': 'application/json' } });
      return json(hits);
    }
    if (url.startsWith('/vault/read')) return json({ path: 'matters/acme.md', content: '# Acme\nBody.\n', version: null, mtimeMs: null });
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('VaultPage', () => {
  test('⌘K focuses the search field', async () => {
    render(<VaultPage path={null} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText('Search the vault')).toBeTruthy());
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(document.activeElement).toBe(screen.getByLabelText('Search the vault'));
  });

  test('Enter runs the search; results replace the tree; clear restores it', async () => {
    hits = [{ path: 'matters/acme.md', snippet: 'Term: 2 years', score: 1 }];
    const opened: string[] = [];
    render(<VaultPage path={null} onOpen={path => opened.push(path)} />);
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());

    await userEvent.type(screen.getByLabelText('Search the vault'), 'acme{Enter}');
    expect(searched).toEqual(['acme']);
    await waitFor(() => expect(screen.getByText('matters/acme.md')).toBeTruthy());
    // The grouped tree is replaced until the search clears (spec §3.4).
    expect(screen.queryByText('Acme Corp — NDA')).toBeNull();

    await userEvent.click(screen.getByText('matters/acme.md'));
    expect(opened).toEqual(['matters/acme.md']);

    await userEvent.click(screen.getByRole('button', { name: 'clear' }));
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());
  });

  test('no results is a designed empty state with a way out', async () => {
    hits = [];
    render(<VaultPage path={null} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText('Search the vault')).toBeTruthy());
    await userEvent.type(screen.getByLabelText('Search the vault'), 'zzz{Enter}');
    await waitFor(() => expect(screen.getByText(/No results for “zzz”/)).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Clear the search' }));
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());
  });

  test('a failed search does not strand the tree behind an error', async () => {
    render(<VaultPage path={null} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());
    failSearch = true;
    await userEvent.type(screen.getByLabelText('Search the vault'), 'boom{Enter}');
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());

    // Clearing puts the tree back — the error is the search's, not the vault's.
    failSearch = false;
    fireEvent.keyDown(screen.getByLabelText('Search the vault'), { key: 'Escape' });
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());
  });

  test('a path renders the Reader with its outline', async () => {
    render(<VaultPage path="matters/acme.md" onOpen={() => {}} />);
    await waitFor(() => expect(document.querySelector('.v2-doc')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Acme')).toBeTruthy());
  });
});
