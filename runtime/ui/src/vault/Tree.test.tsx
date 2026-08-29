import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import type { VaultEntry } from '../api/types';
import { isReserved, orderEntries, Tree } from './Tree';

const realFetch = globalThis.fetch;
let requested: string[] = [];

/** Answers `/vault/list` from a directory → entries map. Anything else is a
 * 404, so a request the tree should not have made shows up as one. */
function serve(levels: Record<string, VaultEntry[]>): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://127.0.0.1:7431');
    requested.push(url.pathname + url.search);
    const dir = url.searchParams.get('dir') ?? '';
    const entries = levels[dir];
    if (entries === undefined) return new Response('no such dir', { status: 404 });
    return new Response(JSON.stringify(entries), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  requested = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('orderEntries', () => {
  test('puts directories first, then sorts by name', () => {
    const ordered = orderEntries([
      { path: 'zeta.md', kind: 'file' },
      { path: 'matters', kind: 'dir' },
      { path: 'alpha.md', kind: 'file' },
      { path: 'law', kind: 'dir' },
    ]);
    expect(ordered.map(e => e.path)).toEqual(['law', 'matters', 'alpha.md', 'zeta.md']);
  });
});

describe('isReserved', () => {
  test('matches the runtime directory whatever its case, at any depth', () => {
    expect(isReserved('.counsel')).toBe(true);
    expect(isReserved('.Counsel')).toBe(true);
    expect(isReserved('.COUNSEL/threads/x.jsonl')).toBe(true);
    expect(isReserved('matters/.counsel/x')).toBe(true);
    expect(isReserved('matters/counsel.md')).toBe(false);
  });
});

describe('Tree', () => {
  test('never shows .counsel, whatever the server sends', async () => {
    // The server refuses to list it — but the tree must not depend on that.
    serve({
      '': [
        { path: '.counsel', kind: 'dir' },
        { path: '.Counsel', kind: 'dir' },
        { path: 'matters', kind: 'dir' },
        { path: 'README.md', kind: 'file' },
      ],
    });
    render(<Tree selected={null} onSelect={() => {}} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /matters/ })).toBeTruthy());
    expect(screen.queryByText(/\.counsel/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'README.md' })).toBeTruthy();
  });

  test('lists a folder only when it is opened, and only once', async () => {
    serve({
      '': [{ path: 'matters', kind: 'dir' }],
      matters: [{ path: 'matters/acme.md', kind: 'file' }],
    });
    render(<Tree selected={null} onSelect={() => {}} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /matters/ })).toBeTruthy());
    expect(requested).toEqual(['/vault/list']);

    await userEvent.click(screen.getByRole('button', { name: /matters/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'acme.md' })).toBeTruthy());
    expect(requested).toEqual(['/vault/list', '/vault/list?dir=matters']);

    // Closed and reopened: the level is kept, so nothing is fetched again.
    await userEvent.click(screen.getByRole('button', { name: /matters/ }));
    await userEvent.click(screen.getByRole('button', { name: /matters/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'acme.md' })).toBeTruthy());
    expect(requested).toEqual(['/vault/list', '/vault/list?dir=matters']);
  });

  test('clicking a file reports its full vault path', async () => {
    serve({
      '': [{ path: 'matters', kind: 'dir' }],
      matters: [{ path: 'matters/acme.md', kind: 'file' }],
    });
    const opened: string[] = [];
    render(<Tree selected={null} onSelect={path => opened.push(path)} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /matters/ })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /matters/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'acme.md' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'acme.md' }));

    expect(opened).toEqual(['matters/acme.md']);
  });

  test('a folder that fails to list says so without breaking the tree', async () => {
    serve({ '': [{ path: 'gone', kind: 'dir' }] });
    render(<Tree selected={null} onSelect={() => {}} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /gone/ })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /gone/ }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('404'));
    expect(screen.getByRole('button', { name: /gone/ })).toBeTruthy();
  });
});
