import { cleanup, render, screen, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { FileView } from './FileView';

const realFetch = globalThis.fetch;

function serve(status: number, body: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('FileView', () => {
  test('renders markdown headings and shows the path and version', async () => {
    serve(200, {
      path: 'practice/standards/indemnification.md',
      content: '# Indemnification\n\nThe cap is **mutual**.\n',
      version: 'abc123',
    });
    render(<FileView path="practice/standards/indemnification.md" />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Indemnification' })).toBeTruthy());
    expect(screen.getByText(/version abc123/)).toBeTruthy();
    expect(screen.getByText('practice/standards/indemnification.md')).toBeTruthy();
    expect(document.querySelector('.markdown strong')?.textContent).toBe('mutual');
  });

  test('a file that tries to script the page renders as inert text', async () => {
    serve(200, {
      path: 'matters/hostile.md',
      content:
        '# Notes\n\n<script>globalThis.__pwned = true;</script>\n\n<img src=x onerror="globalThis.__pwned = true">\n\n[click](javascript:alert(1))\n',
      version: 'v1',
    });
    render(<FileView path="matters/hostile.md" />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Notes' })).toBeTruthy());

    const rendered = document.querySelector('.markdown');
    expect(rendered).not.toBeNull();
    expect(rendered!.querySelector('script')).toBeNull();
    expect(rendered!.querySelector('img')).toBeNull();
    expect(rendered!.innerHTML).not.toContain('onerror');
    expect(rendered!.innerHTML).not.toContain('javascript:');
    expect((globalThis as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  test('a file that is not markdown is shown verbatim, not parsed', async () => {
    serve(200, { path: 'data/notes.txt', content: '# not a heading\n*not emphasis*', version: 'v2' });
    render(<FileView path="data/notes.txt" />);

    await waitFor(() => expect(document.querySelector('.vault-raw')).not.toBeNull());
    expect(document.querySelector('.vault-raw')?.textContent).toBe('# not a heading\n*not emphasis*');
    expect(document.querySelector('.markdown')).toBeNull();
  });

  test('a missing file shows the server’s message', async () => {
    serve(404, { error: 'no such file: matters/gone.md' });
    render(<FileView path="matters/gone.md" />);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('no such file'));
  });
});
