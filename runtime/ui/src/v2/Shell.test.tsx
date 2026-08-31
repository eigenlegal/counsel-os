import { act, cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../api/token';
import type { Health, SettingsView, Thread, ThreadEvent, ThreadHeader } from '../api/types';
import { Shell } from './Shell';

const realFetch = globalThis.fetch;
const at = '2026-08-30T10:00:00.000Z';

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

/** A transcript whose finished turn raised a pending proposal — the way the
 * drawer opens now ("open in vault" on the slip; the rail's Vault link is a
 * page, spec §3.1). */
const proposalEvents: ThreadEvent[] = [
  { t: 'user', at, content: 'record it' },
  { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
  {
    t: 'proposal',
    at,
    id: 'p-1',
    path: 'practice/standards/nda.md',
    content: '# NDA\nTerm: 3 years\n',
    rationale: 'Record the fallback.',
    status: 'pending',
    expectedVersion: null,
  },
  { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
];

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function install(opts: { events?: ThreadEvent[] } = {}): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/health')) return json(health);
    if (url.startsWith('/runs')) return json([]);
    if (url === '/threads') return json([acme, beta]);
    if (url.startsWith('/vault/read')) return json({ path: 'practice/standards/nda.md', content: '# NDA\nTerm: 2 years\n', version: 'abc1234def0', mtimeMs: 1 });
    if (url.startsWith('/vault/list')) return json([]);
    if (url.startsWith('/settings')) return json(settings);
    const match = /^\/threads\/(.+)$/.exec(url);
    if (match !== null) {
      const header = match[1] === 't-2' ? beta : acme;
      return json({ header, events: match[1] === 't-1' ? (opts.events ?? []) : [] } satisfies Thread);
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

function chatNode(): Element | null {
  return document.querySelector('section.v2-chat');
}

function workNode(): Element | null {
  return document.querySelector('.v2-work');
}

function goTo(hash: string): void {
  act(() => {
    history.replaceState(null, '', `/${hash}`);
    globalThis.dispatchEvent(new Event('hashchange'));
  });
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  history.replaceState(null, '', '/#/chat');
  install();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
  history.replaceState(null, '', '/');
});

describe('Shell', () => {
  test('on #/chat, opens the most recent thread and lists both in the rail', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    expect(screen.getByText('Beta MSA scope')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Acme NDA term');
    await waitFor(() =>
      expect(document.querySelector('.v2-transcript .v2-empty')?.textContent).toBe('No messages yet. Ask counsel something.'),
    );
  });

  test('#/chat?thread=t-2 in the fragment opens that thread', async () => {
    history.replaceState(null, '', '/#/chat?thread=t-2');
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
  });

  test('#/ is Home: the workspace is hidden but the chat stays mounted', async () => {
    history.replaceState(null, '', '/#/');
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('.v2-home')).toBeTruthy());
    await waitFor(() => expect(chatNode()).toBeTruthy());
    expect(workNode()?.hasAttribute('hidden')).toBe(true);
    expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
  });

  test('re-selecting the thread already open changes nothing', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    const composer = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    await userEvent.type(composer, 'half-written question');

    await userEvent.click(screen.getByText('Acme NDA term'));

    expect(chatNode()).toBe(before);
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('half-written question');
  });

  test('selecting a different thread remounts the chat and rewrites the hash', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    await userEvent.click(screen.getByText('Beta MSA scope'));

    await waitFor(() => expect(chatNode()).not.toBe(before));
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
    expect(location.hash).toBe('#/chat?thread=t-2');
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
        releaseList();
        return json(fresh);
      }
      if (url === '/threads') {
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
    await userEvent.click(await screen.findByRole('button', { name: 'New conversation' }));
    await userEvent.type(await screen.findByLabelText('Message'), 'Check the cap.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeTruthy());
    expect(document.querySelector('li.v2-draft')).toBeNull();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Check the cap.');
    // And the hash now names the thread, without a remount having happened.
    expect(location.hash).toBe('#/chat?thread=t-9');
  });

  test('a draft started while the thread list is loading is not overruled', async () => {
    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'New conversation' }));
    await waitFor(() => expect(screen.getByText('Beta MSA scope')).toBeTruthy());

    expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeNull();
    expect(document.querySelector('.v2-transcript .v2-empty')?.textContent).toContain('the thread is created when you send');
  });

  test('on #/vault the rail collapses to icons and the workspace hides, chat intact', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    const before = chatNode();

    goTo('#/vault');
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeTruthy());
    expect(document.querySelector('.v2-rail.v2-rail-icons')).toBeTruthy();
    expect(workNode()?.hasAttribute('hidden')).toBe(true);
    expect(chatNode()).toBe(before);

    goTo('#/chat');
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    expect(document.querySelector('.v2-rail.v2-rail-icons')).toBeNull();
  });

  test('a step in flight survives a trip to the vault page and back', async () => {
    const step: { signal: AbortSignal | null } = { signal: null };
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/steps')) {
        step.signal = init?.signal ?? null;
        return await new Promise<Response>(() => {});
      }
      return await (base as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.type(await screen.findByLabelText('Message'), 'Is the cap mutual?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy());
    expect(step.signal).not.toBeNull();
    const before = chatNode();

    goTo('#/vault');
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeTruthy());
    expect(chatNode()).toBe(before);
    expect(step.signal?.aborted).toBe(false);

    goTo('#/chat');
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    expect(step.signal?.aborted).toBe(false);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
  });

  test('open in vault on a proposal opens the drawer; Esc closes it', async () => {
    install({ events: proposalEvents });
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('[data-testid="proposal-p-1"]')).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();
    expect(location.hash).toBe('#/chat');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeNull();
  });

  test('the drawer is still open after a trip to settings', async () => {
    install({ events: proposalEvents });
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('[data-testid="proposal-p-1"]')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();

    goTo('#/settings');
    await waitFor(() => expect(document.querySelector('.v2-page')).toBeTruthy());
    expect(workNode()?.hasAttribute('hidden')).toBe(true);

    goTo('#/chat');
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeTruthy();
  });
});
