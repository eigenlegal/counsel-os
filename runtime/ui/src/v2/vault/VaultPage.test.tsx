import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { VaultHit, VaultOverview } from '../../api/types';
import { cleanSnippet, VaultPage } from './VaultPage';

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
    hits = [
      { path: 'matters/acme.md', snippet: 'Term: 2 years', score: 1 },
      { path: 'practice/reference/corporate-partnering.md', snippet: 'practice/reference/corporate-partnering.md', score: 0.5 },
    ];
    const opened: string[] = [];
    render(<VaultPage path={null} onOpen={path => opened.push(path)} />);
    await waitFor(() => expect(screen.getByText('Acme Corp — NDA')).toBeTruthy());

    await userEvent.type(screen.getByLabelText('Search the vault'), 'acme');
    // Typing alone searches nothing, and the pane says so (cou-93 item 4).
    expect(screen.getByText('Enter to search')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Search the vault'), '{Enter}');
    expect(searched).toEqual(['acme']);
    await waitFor(() => expect(screen.getByRole('region', { name: 'Search results' })).toBeTruthy());
    const results = screen.getByRole('region', { name: 'Search results' }) as HTMLElement;
    // The grouped tree is replaced until the search clears (spec §3.4).
    expect(document.querySelector('.v2-vgroup + .v2-vrow-ind')).toBeNull();
    expect(screen.queryByText('Enter to search')).toBeNull();

    // A hit is a DOCUMENT: the matter's title, its folder as a run-in, the
    // matched line — never a bare truncated path (cou-93 item 4).
    const rows = Array.from(results.querySelectorAll<HTMLElement>('.v2-vhit'));
    expect(rows).toHaveLength(2);
    expect(results.textContent).toContain('Results · 2');
    expect(rows[0]!.querySelector('.v2-vhit-title')?.textContent).toBe('Acme Corp — NDA');
    expect(rows[0]!.querySelector('.v2-vhit-dir')?.textContent).toBe('matters');
    expect(rows[0]!.querySelector('.v2-vhit-line')?.textContent).toContain('Term: 2 years');
    expect(rows[0]!.getAttribute('title')).toBe('matters/acme.md');
    // A filename hit (the server echoes the path as its snippet) prettifies
    // the filename and does not print the path twice.
    expect(rows[1]!.querySelector('.v2-vhit-title')?.textContent).toBe('Corporate partnering');
    expect(rows[1]!.querySelector('.v2-vhit-line')?.textContent).toBe('practice/reference');

    await userEvent.click(rows[0]!);
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

describe('cleanSnippet', () => {
  test('strips the markdown a matched line carries', () => {
    expect(cleanSnippet('## Audit Rights')).toBe('Audit Rights');
    expect(cleanSnippet('- **Our standard:** Net 30')).toBe('Our standard: Net 30');
    expect(cleanSnippet('> quoted')).toBe('quoted');
    expect(cleanSnippet('plain line')).toBe('plain line');
  });
});
