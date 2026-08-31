import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../../api/token';
import type { VaultEntry, VaultOverview } from '../../api/types';
import { VaultTree } from './VaultTree';

const realFetch = globalThis.fetch;

const overview: VaultOverview = {
  matters: [{ path: 'matters/2026-06-vendora.md', title: 'Vendora × Worldpay', frontmatter: {}, mtimeMs: 1 }],
  groups: { practice: 2, knowledge: 1, other: 1 },
};

const root: VaultEntry[] = [
  { path: 'matters', kind: 'dir' },
  { path: 'practice', kind: 'dir' },
  { path: 'memory', kind: 'dir' },
  { path: 'config.md', kind: 'file' },
];

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/vault/list?dir=practice') {
      return json([
        { path: 'practice/standards', kind: 'dir' },
        { path: 'practice/playbooks', kind: 'dir' },
      ] satisfies VaultEntry[]);
    }
    if (url === '/vault/list?dir=practice%2Fstandards') {
      return json([{ path: 'practice/standards/nda.md', kind: 'file' }] satisfies VaultEntry[]);
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('VaultTree', () => {
  test('groups render: humanized matters with a month, practice children, knowledge dirs, Other collapsed', async () => {
    render(<VaultTree overview={overview} root={root} selected={null} onOpen={() => {}} />);
    expect(screen.getByText('Matters')).toBeTruthy();
    expect(screen.getByText('Vendora × Worldpay')).toBeTruthy();
    expect(screen.getByText('Jun')).toBeTruthy();
    // Practice lists the practice/ CHILDREN (the mock's standards/playbooks).
    await waitFor(() => expect(screen.getByText('standards')).toBeTruthy());
    expect(screen.getByText('playbooks')).toBeTruthy();
    // Knowledge lists the knowledge dirs themselves.
    expect(screen.getByText('memory')).toBeTruthy();
    // Other is a collapsed count; its entries are not in the DOM yet.
    expect(screen.getByText('Other files (1)')).toBeTruthy();
    expect(screen.queryByText('config.md')).toBeNull();
  });

  test('the runtime\u2019s private directory never reaches Other, whatever the server lists', async () => {
    render(
      <VaultTree
        overview={overview}
        root={[...root, { path: '.counsel', kind: 'dir' }]}
        selected={null}
        onOpen={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText('standards')).toBeTruthy());
    expect(screen.getByText('Other files (1)')).toBeTruthy();
    expect(screen.queryByText('.counsel')).toBeNull();
  });

  test('a deep-linked file opens the levels above it and marks its row', async () => {
    render(<VaultTree overview={overview} root={root} selected="practice/standards/nda.md" onOpen={() => {}} />);
    // No click: the page arrived on `#/vault?path=practice/standards/nda.md`.
    await waitFor(() => expect(screen.getByText('nda.md')).toBeTruthy());
    expect(screen.getByText('standards').closest('button')?.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('nda.md').closest('button')?.getAttribute('aria-current')).toBe('page');
  });

  test('a dir expands lazily; a file click opens; Other unfolds', async () => {
    const opened: string[] = [];
    render(<VaultTree overview={overview} root={root} selected={null} onOpen={path => opened.push(path)} />);
    await waitFor(() => expect(screen.getByText('standards')).toBeTruthy());

    await userEvent.click(screen.getByText('standards'));
    await waitFor(() => expect(screen.getByText('nda.md')).toBeTruthy());
    await userEvent.click(screen.getByText('nda.md'));
    expect(opened).toEqual(['practice/standards/nda.md']);

    await userEvent.click(screen.getByText('Other files (1)'));
    expect(screen.getByText('config.md')).toBeTruthy();

    await userEvent.click(screen.getByText('Vendora × Worldpay'));
    expect(opened).toEqual(['practice/standards/nda.md', 'matters/2026-06-vendora.md']);
  });
});
