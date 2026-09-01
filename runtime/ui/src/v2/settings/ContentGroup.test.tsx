import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { ContentItem, ContentStatus } from '../../api/types';
import { ContentGroup, stateOf, summaryOf } from './ContentGroup';

const realFetch = globalThis.fetch;

function item(over: Partial<ContentItem> & { path: string; status: ContentItem['status'] }): ContentItem {
  return { shipped: `knowledge/${over.path}`, group: over.path.startsWith('law/') ? 'law' : 'practice', area: 'x', applicable: false, ...over };
}

function status(items: ContentItem[]): ContentStatus {
  const counts = { current: 0, 'update-available': 0, 'user-modified': 0, 'vault-only': 0, missing: 0, 'upstream-changed': 0 };
  for (const i of items) counts[i.status] += 1;
  return { shippedVersion: '0.12.0', vaultVersion: '0.11.3', receivedAt: '2026-09-01T00:00:00.000Z', lawManagement: 'plugin', autoApplyLawUpdates: false, items, counts };
}

let current: ContentStatus;
let posts: unknown[];
let failApply = false;

function json(body: unknown, statusCode = 200): Response {
  return new Response(JSON.stringify(body), { status: statusCode, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  posts = [];
  failApply = false;
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/content/status') return json(current);
    if (url === '/content/apply' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { paths: string[] };
      posts.push(body);
      if (failApply) return json({ error: 'not applicable: practice/standards/x.md — only law updates and missing files can be applied', paths: body.paths }, 400);
      // The apply makes the paths current.
      current = status(current.items.map(i => (body.paths.includes(i.path) ? { ...i, status: 'current', applicable: false } : i)));
      return json({ applied: body.paths, skipped: [] });
    }
    throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('ContentGroup', () => {
  test('everything current: versions and one quiet line, no list', async () => {
    current = status([item({ path: 'law/data-privacy/gdpr.md', status: 'current' })]);
    render(<ContentGroup />);
    await waitFor(() => expect(screen.getByText('Everything is current.')).toBeTruthy());
    expect(screen.getByText(/Shipped/).textContent).toContain('0.12.0');
    expect(screen.queryByRole('button', { name: 'review' })).toBeNull();
    expect(screen.queryByRole('button', { name: /apply all/ })).toBeNull();
  });

  test('updates: the summary, review opens the ledger, apply posts the path and the row goes current', async () => {
    current = status([
      item({ path: 'law/data-privacy/gdpr.md', status: 'update-available', applicable: true }),
      item({ path: 'law/employment/flsa.md', status: 'missing', applicable: true }),
      item({ path: 'law/corporate/x.md', status: 'user-modified', reason: 'edited' }),
      item({ path: 'law/mine/notes.md', status: 'vault-only', shipped: null }),
    ]);
    render(<ContentGroup />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('1 law file has updates · 1 new file can be added'));
    await userEvent.click(screen.getByRole('button', { name: 'review' }));
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(rows[0]!.textContent).toContain('update available');
    expect(rows[1]!.textContent).toContain('new — can be added');
    expect(rows[2]!.textContent).toContain('yours — edited, left alone');
    expect(rows[3]!.textContent).toContain('yours — not shipped');
    // Only the applicable rows carry an action — and it reads add/apply by kind.
    expect(screen.getAllByRole('button', { name: /^(apply|add)$/ })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'apply' }));
    await waitFor(() => expect(posts).toEqual([{ paths: ['law/data-privacy/gdpr.md'] }]));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('1 new file can be added'));
    expect(screen.getByText('Applied 1 file.')).toBeTruthy();
  });

  test('apply all posts every applicable path at once', async () => {
    current = status([
      item({ path: 'law/a/1.md', status: 'update-available', applicable: true }),
      item({ path: 'law/a/2.md', status: 'update-available', applicable: true }),
      item({ path: 'practice/standards/x.md', status: 'upstream-changed', diff: '--- a\n+++ b\n@@ -1,1 +1,1 @@\n-old\n+new\n' }),
    ]);
    render(<ContentGroup />);
    await userEvent.click(await waitFor(() => screen.getByRole('button', { name: 'apply all updates (2)' })));
    await waitFor(() => expect(posts).toEqual([{ paths: ['law/a/1.md', 'law/a/2.md'] }]));
  });

  test('a practice seed that changed upstream offers its diff inline and nothing else', async () => {
    current = status([item({ path: 'practice/standards/x.md', status: 'upstream-changed', baseline: 'received', diff: '--- a\n+++ b\n@@ -1,1 +1,1 @@\n-old\n+new\n' })]);
    render(<ContentGroup />);
    await userEvent.click(await waitFor(() => screen.getByRole('button', { name: 'review' })));
    expect(screen.getByText('changed upstream — merge by hand')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^(apply|add)$/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'show diff' }));
    expect(document.querySelector('.v2-content-diff')?.textContent).toContain('+new');
    await userEvent.click(screen.getByRole('button', { name: 'hide diff' }));
    expect(document.querySelector('.v2-content-diff')).toBeNull();
  });

  test('a refused apply shows the server sentence inline', async () => {
    current = status([item({ path: 'law/a/1.md', status: 'update-available', applicable: true })]);
    failApply = true;
    render(<ContentGroup />);
    await userEvent.click(await waitFor(() => screen.getByRole('button', { name: 'apply all updates (1)' })));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('not applicable'));
  });
});

describe('stateOf / summaryOf', () => {
  test('words per status', () => {
    expect(stateOf(item({ path: 'p', status: 'user-modified', reason: 'managed-by' })).word).toContain('managed-by: user');
    expect(stateOf(item({ path: 'p', status: 'user-modified', reason: 'no-baseline' })).word).toContain('no record');
    expect(stateOf(item({ path: 'p', status: 'upstream-changed', baseline: 'vault' })).word).toContain('your copy');
    expect(summaryOf(status([item({ path: 'p', status: 'upstream-changed' }), item({ path: 'q', status: 'upstream-changed' })]))).toBe('2 practice seeds changed upstream');
  });
});
