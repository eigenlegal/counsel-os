import { act, cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../api/token';
import type { Health, SettingsView, Thread, ThreadHeader } from '../api/types';
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

const settings: SettingsView = {
  file: '/tmp/providers.yaml',
  registry: { default: 'fake/fake', providers: [] },
  effective: { default: 'fake/fake', stepTimeoutMs: 600_000, providers: [] },
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

/** The chat workspace — rail, thread and drawer. It is hidden off `#/`. */
function workNode(): Element | null {
  return document.querySelector('.v2-work');
}

/**
 * A click on a nav link, as far as the shell is concerned: the fragment
 * changes and `hashchange` fires. `replaceState` is what the other tests
 * use, and it does not fire the event by itself.
 */
function goTo(hash: string): void {
  act(() => {
    history.replaceState(null, '', `/${hash}`);
    globalThis.dispatchEvent(new Event('hashchange'));
  });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  install();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
  history.replaceState(null, '', '/');
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

  test('a stale empty list cannot reopen a draft over the thread just created', async () => {
    const fresh: ThreadHeader = {
      id: 't-9',
      title: 'Check the cap.',
      createdAt: '2026-08-29T12:00:00.000Z',
      updatedAt: '2026-08-29T12:00:00.000Z',
      sessions: {},
    };
    let releaseList = (): void => {};
    const listHeld = new Promise<void>(resolve => {
      releaseList = resolve;
    });
    let created = false;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/health')) return json(health);
      if (url.startsWith('/runs')) return json([]);
      if (method === 'POST' && url === '/threads') {
        created = true;
        // The stale list lands in the SAME tick the create resolves. That is
        // the whole race: `setSelected`/`setDraft(false)` have been called
        // but React has not re-rendered, so any mirror of them still reads
        // as "nothing selected, still a draft".
        releaseList();
        return json(fresh);
      }
      if (url === '/threads') {
        // What THIS request saw when it was made — an empty vault.
        const snapshot = created ? [fresh] : [];
        if (!created) await listHeld;
        return json(snapshot);
      }
      if (url.endsWith('/steps')) {
        return new Response('event: done\ndata: {"type":"done","output":null}\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        });
      }
      if (url.startsWith('/threads/')) return json({ header: fresh, events: [] } satisfies Thread);
      throw new Error(`unexpected fetch: ${method} ${url}`);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'New' }));
    await userEvent.type(await screen.findByLabelText('Message'), 'Check the cap.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeTruthy());
    // The draft is gone and the created thread is the current row. If the
    // stale list had won, the rail would show "New conversation" as current
    // and the next click on this row would remount the chat mid-stream.
    expect(document.querySelector('li.v2-draft')).toBeNull();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Check the cap.');
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

  test('nav Vault opens the drawer over the chat; Esc closes it', async () => {
    // An empty vault: the shell opens a draft, so the drawer is the only
    // thing this test can be about.
    history.replaceState(null, '', '/#/');
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/health')) return json(health);
      if (url === '/threads') return json([]);
      if (url.startsWith('/vault/list')) return json([]);
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy());
    expect(screen.getByText('fake/fake')).toBeTruthy();
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeNull();

    await userEvent.click(screen.getByRole('link', { name: 'Vault' }));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();
    // Still on the chat route: the link opened a drawer, not a page.
    expect(location.hash).toBe('#/');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeNull();
  });

  test('a step in flight survives a trip to the vault page and back', async () => {
    // A step that never answers: what the reader does while it runs is the
    // whole test. The signal it was given says whether anything killed it.
    const step: { signal: AbortSignal | null } = { signal: null };
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/steps')) {
        step.signal = init?.signal ?? null;
        return await new Promise<Response>(() => {});
      }
      if (url.startsWith('/vault/list')) return json([]);
      return await (base as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.type(await screen.findByLabelText('Message'), 'Is the cap mutual?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    // Streaming: Stop stands where Send was, and the step is in flight.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy());
    expect(step.signal).not.toBeNull();
    const before = chatNode();

    goTo('#/vault');
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeTruthy());
    // The page is up and the workspace is out of sight — but still MOUNTED.
    expect(workNode()?.hasAttribute('hidden')).toBe(true);
    expect(chatNode()).toBe(before);
    expect(document.contains(before)).toBe(true);
    // The point of all of it: nobody aborted the step, so the run is not
    // recorded `abandoned` for the crime of looking at a file.
    expect(step.signal?.aborted).toBe(false);

    goTo('#/');
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeNull());
    expect(workNode()?.hasAttribute('hidden')).toBe(false);
    expect(chatNode()).toBe(before);
    expect(step.signal?.aborted).toBe(false);
    // And the composer came back exactly as it was left: still streaming.
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
  });

  test('on #/vault the chat is hidden, not gone', async () => {
    history.replaceState(null, '', '/#/vault');
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/vault/list')) return json([]);
      return await (base as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeTruthy());
    await waitFor(() => expect(chatNode()).toBeTruthy());

    expect(workNode()?.hasAttribute('hidden')).toBe(true);
    // `hidden` takes the block out of the accessibility tree, so nothing in
    // there answers a query, takes focus, or is read out while the page is
    // up — a hidden workspace is not a focus trap.
    expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New' })).toBeNull();
    // It is there all the same, holding whatever the chat was doing.
    expect(document.contains(chatNode())).toBe(true);
  });

  test('the drawer is still open after a trip to settings', async () => {
    history.replaceState(null, '', '/#/');
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/health')) return json(health);
      if (url.startsWith('/runs')) return json([]);
      if (url === '/threads') return json([]);
      if (url.startsWith('/vault/list')) return json([]);
      if (url.startsWith('/settings')) return json(settings);
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy());
    await userEvent.click(screen.getByRole('link', { name: 'Vault' }));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();

    goTo('#/settings');
    await waitFor(() => expect(document.querySelector('.v2-page')).toBeTruthy());
    expect(workNode()?.hasAttribute('hidden')).toBe(true);

    goTo('#/');
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    // The drawer belongs to the workspace and was hidden with it, not
    // closed: the file someone was reading is still on screen.
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();
  });
});
