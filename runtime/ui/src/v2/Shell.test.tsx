import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../api/token';
import type { Health, Thread, ThreadHeader } from '../api/types';
import { Shell } from './Shell';

const realFetch = globalThis.fetch;

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

const acme: ThreadHeader = {
  id: 't-1',
  title: 'Acme NDA term',
  createdAt: '2026-08-28T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  sessions: {},
};
const beta: ThreadHeader = {
  id: 't-2',
  title: 'Beta MSA scope',
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T11:00:00.000Z',
  sessions: {},
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

/** Two threads, each with an empty transcript and no runs. */
function install(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/health')) return json(health);
    if (url.startsWith('/runs')) return json([]);
    if (url === '/threads') return json([acme, beta]);
    const match = /^\/threads\/(.+)$/.exec(url);
    if (match !== null) {
      const header = match[1] === 't-2' ? beta : acme;
      return json({ header, events: [] } satisfies Thread);
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

/** The mounted v2 `Chat`. Its identity is the test: a remount replaces the node. */
function chatNode(): Element | null {
  return document.querySelector('section.v2-chat');
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  install();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

describe('Shell', () => {
  test('opens the most recent thread and lists both', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    expect(screen.getByText('Beta MSA scope')).toBeTruthy();
    // Newest first, and it is the one on screen.
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Acme NDA term');
    // Its TRANSCRIPT, not a draft: the chat must not mount before the shell
    // knows which thread to open, because the chat adopts its thread once.
    await waitFor(() =>
      expect(document.querySelector('.v2-transcript .v2-empty')?.textContent).toBe('No messages yet. Ask counsel something.'),
    );
  });

  test('a thread list that lands after /health still opens its thread', async () => {
    // The real ordering: `/health` answers, the shell renders, and only
    // THEN does the list arrive. A chat mounted in that gap would have
    // adopted `null` and stayed a draft for good.
    const fast = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input) === '/threads') {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      return (fast as unknown as typeof fetch)(input);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await waitFor(() =>
      expect(document.querySelector('.v2-transcript .v2-empty')?.textContent).toBe('No messages yet. Ask counsel something.'),
    );
  });

  test('re-selecting the thread already open changes nothing', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    // What the reader typed but has not sent yet. A remount would lose it,
    // and so would a streaming answer.
    const composer = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    await userEvent.type(composer, 'half-written question');
    expect(composer.value).toBe('half-written question');

    await userEvent.click(screen.getByText('Acme NDA term'));

    expect(chatNode()).toBe(before);
    expect(document.contains(before)).toBe(true);
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe(
      'half-written question',
    );
  });

  test('selecting a different thread does remount the chat', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    await userEvent.click(screen.getByText('Beta MSA scope'));

    await waitFor(() => expect(chatNode()).not.toBe(before));
    expect(document.contains(before)).toBe(false);
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
  });

  test('a draft started while the thread list is loading is not overruled', async () => {
    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'New' }));
    await waitFor(() => expect(screen.getByText('Beta MSA scope')).toBeTruthy());

    // The draft is still the current row, and no thread was selected behind it.
    expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeNull();
    // The chat is mounted, but as a draft: it fetched no thread and says so.
    // Scoped to the transcript — the rail's draft row says "New conversation" too.
    expect(document.querySelector('.v2-transcript .v2-empty')?.textContent).toContain('the thread is created when you send');
  });
});
