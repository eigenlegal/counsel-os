import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import { Breadcrumb, crumbs, VaultPage } from './VaultPage';

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://127.0.0.1:7431');
    // Answered per directory, as the server does. One flat answer for every
    // level would draw `acme.md` twice once `matters` is opened, and the
    // click below could not name the one it means.
    if (url.pathname === '/vault/list') {
      const dir = url.searchParams.get('dir') ?? '';
      return json(dir === '' ? [{ path: 'matters', kind: 'dir' }] : [{ path: 'matters/acme.md', kind: 'file' }]);
    }
    if (url.pathname === '/vault/read') return json({ path: 'matters/acme.md', content: '# Acme\n\nTerm: 2 years\n', version: 'abc1234def' });
    throw new Error(`unexpected fetch: ${url.pathname}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('crumbs', () => {
  test('splits a path into its segments', () => {
    expect(crumbs('practice/standards/nda.md')).toEqual(['practice', 'standards', 'nda.md']);
    expect(crumbs('nda.md')).toEqual(['nda.md']);
  });
});

describe('Breadcrumb', () => {
  test('renders every segment, the last one marked', () => {
    render(<Breadcrumb path="practice/standards/nda.md" />);
    expect(document.querySelectorAll('.v2-crumb')).toHaveLength(3);
    expect(document.querySelector('.v2-crumb-last')?.textContent).toBe('nda.md');
  });
});

describe('VaultPage', () => {
  test('with no path, the tree loads and asks for a file', async () => {
    render(<VaultPage path={null} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText('matters')).toBeTruthy());
    expect(screen.getByText('Pick a file to read it.')).toBeTruthy();
  });

  test('with a path, the file renders under its breadcrumb and version', async () => {
    const opened: string[] = [];
    render(<VaultPage path="matters/acme.md" onOpen={path => opened.push(path)} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy());
    expect(document.querySelector('.v2-crumb-last')?.textContent).toBe('acme.md');
    expect(screen.getByText(/version abc1234def/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'matters' }));
    await userEvent.click(await screen.findByRole('button', { name: 'acme.md' }));
    expect(opened).toEqual(['matters/acme.md']);
  });
});
