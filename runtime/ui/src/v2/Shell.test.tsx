import { act, cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import { routeFromHash, vaultPathFromHash } from '../app';
import type { Health, SettingsView, Thread, ThreadEvent, ThreadHeader } from '../api/types';
import { VAULT_CHANGED_EVENT } from './intake';
import { Shell } from './Shell';
import * as streams from './chat/streams';

const realFetch = globalThis.fetch;
const at = '2026-08-30T10:00:00.000Z';

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [
    { id: 'fake/fake', kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } },
  ],
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
    if (url.startsWith('/vault/overview')) return json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
    if (url.startsWith('/proposals')) return json([]);
    if (url.startsWith('/docket')) return json({ deadlines: [], skipped: 0 });
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

    // Scoped to the rail: the thread's title is also the chat's own heading
    // now, so the bare text names two elements.
    await userEvent.click(document.querySelector('li.v2-thread[aria-current="true"] .v2-thread-title') as HTMLElement);

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

  test('a conversation keeps working while you read another one, and its answer survives', async () => {
    // The bug this fixes: switching conversations re-keyed the chat pane,
    // which aborted the step and recorded the run `abandoned`. A ninety
    // second review, thrown away because the lawyer looked at something
    // else while it worked.
    let openGate!: () => void;
    const gate = new Promise<void>(resolve => (openGate = resolve));
    let answered = false;
    const answeredEvents: ThreadEvent[] = [
      { t: 'user', at, content: 'Review the cap.' },
      { t: 'step', at, runId: 'r-9', provider: 'fake/fake' },
      { type: 'text', at, text: 'the cap is low' },
      { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
    ];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/steps')) {
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            void gate.then(() => {
              c.enqueue(new TextEncoder().encode('event: message\ndata: {"type":"text","text":"the cap is low"}\n\n'));
              c.close();
              answered = true;
            });
          },
        });
        return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
      }
      if (url.startsWith('/health')) return json(health);
      if (url.startsWith('/runs')) return json([]);
      if (url === '/threads') return json([acme, beta]);
      if (url.startsWith('/vault/overview')) return json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
      if (url.startsWith('/proposals')) return json([]);
      if (url.startsWith('/docket')) return json({ deadlines: [], skipped: 0 });
      if (url.startsWith('/vault/list')) return json([]);
      if (url.startsWith('/settings')) return json(settings);
      const match = /^\/threads\/(.+)$/.exec(url);
      if (match !== null) {
        const header = match[1] === 't-2' ? beta : acme;
        // The server's transcript once the step has finished — which is what
        // makes the answer survive the walk away.
        return json({ header, events: match[1] === 't-1' && answered ? answeredEvents : [] } satisfies Thread);
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Review the cap.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy());

    // Walk away mid-step. The rail says that thread is still working, and
    // THIS conversation's composer is free — it is not the one working.
    await userEvent.click(screen.getByText('Beta MSA scope'));
    await waitFor(() => expect(document.querySelector('.v2-thread-running')).toBeTruthy());
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();

    // The step finishes while nobody is looking at it.
    openGate();
    await waitFor(() => expect(document.querySelector('.v2-thread-running')).toBeNull());

    // Back to the first: the answer is there, not an abandoned run.
    await userEvent.click(screen.getByText('Acme NDA term'));
    await waitFor(() => expect(screen.getByText('the cap is low')).toBeTruthy());
  }, 20_000);

  test('coming back BEFORE it finishes still lands the answer', async () => {
    // The ending belongs to whoever is mounted. When the pane that sent had
    // it, its `load` ran on an unmounted instance and dropped the entry from
    // under the pane the reader was actually looking at — question and
    // answer both gone, on a transcript that pane had never reloaded.
    let openGate!: () => void;
    const gate = new Promise<void>(resolve => (openGate = resolve));
    let answered = false;
    const answeredEvents: ThreadEvent[] = [
      { t: 'user', at, content: 'Review the cap.' },
      { t: 'step', at, runId: 'r-9', provider: 'fake/fake' },
      { type: 'text', at, text: 'the cap is low' },
      { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
    ];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/steps')) {
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            void gate.then(() => {
              c.enqueue(new TextEncoder().encode('event: message\ndata: {"type":"text","text":"the cap is low"}\n\n'));
              c.close();
              answered = true;
            });
          },
        });
        return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
      }
      if (url.startsWith('/health')) return json(health);
      if (url.startsWith('/runs')) return json([]);
      if (url === '/threads') return json([acme, beta]);
      if (url.startsWith('/vault/overview')) return json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
      if (url.startsWith('/proposals')) return json([]);
      if (url.startsWith('/docket')) return json({ deadlines: [], skipped: 0 });
      if (url.startsWith('/vault/list')) return json([]);
      if (url.startsWith('/settings')) return json(settings);
      const match = /^\/threads\/(.+)$/.exec(url);
      if (match !== null) {
        const header = match[1] === 't-2' ? beta : acme;
        return json({ header, events: match[1] === 't-1' && answered ? answeredEvents : [] } satisfies Thread);
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Review the cap.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy());

    // Away and straight back, while it is still working.
    await userEvent.click(screen.getByText('Beta MSA scope'));
    await waitFor(() => expect(document.querySelector('.v2-thread-running')).toBeTruthy());
    await userEvent.click(screen.getByText('Acme NDA term'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy());

    openGate();
    await waitFor(() => expect(screen.getByText('the cap is low')).toBeTruthy());
    // And it stays: the sending pane's own reload must not drop it.
    await new Promise(r => setTimeout(r, 30));
    expect(screen.getByText('the cap is low')).toBeTruthy();
    expect(screen.queryByText('No messages yet. Ask counsel something.')).toBeNull();
  }, 20_000);

  test('a create that lands after you moved on does not take the screen with it', async () => {
    // The step is no longer aborted on unmount, so `POST /threads` can
    // finish for a pane that is gone. Taking the selection then put the
    // rail, the URL and the pane on three different conversations.
    let openGate!: () => void;
    const gate = new Promise<void>(resolve => (openGate = resolve));
    const fresh: ThreadHeader = { id: 't-9', title: 'A brand new one', createdAt: at, updatedAt: at, sessions: {} };
    let created = false;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/threads' && init?.method === 'POST') {
        await gate;
        created = true;
        return json(fresh);
      }
      if (url.endsWith('/steps')) return new Response('', { status: 200, headers: { 'content-type': 'text/event-stream' } });
      if (url.startsWith('/health')) return json(health);
      if (url.startsWith('/runs')) return json([]);
      if (url === '/threads') return json(created ? [fresh, acme, beta] : [acme, beta]);
      if (url.startsWith('/vault/overview')) return json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
      if (url.startsWith('/proposals')) return json([]);
      if (url.startsWith('/docket')) return json({ deadlines: [], skipped: 0 });
      if (url.startsWith('/vault/list')) return json([]);
      if (url.startsWith('/settings')) return json(settings);
      const match = /^\/threads\/(.+)$/.exec(url);
      if (match !== null) return json({ header: match[1] === 't-2' ? beta : acme, events: [] } satisfies Thread);
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'A brand new one');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    // Away before the create returns.
    await userEvent.click(screen.getByText('Beta MSA scope'));
    await waitFor(() => expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope'));

    openGate();
    await waitFor(() => expect(screen.getByText('A brand new one')).toBeTruthy());

    // The reader is left where they went, and the URL agrees with the pane.
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
    expect(location.hash).toBe('#/chat?thread=t-2');
    // And the new conversation opens on a click, rather than being stranded.
    await userEvent.click(screen.getByText('A brand new one'));
    await waitFor(() => expect(location.hash).toBe('#/chat?thread=t-9'));
  }, 20_000);

  test('deleting a conversation stops the step it was running', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    streams.open('t-1', 'Review the cap.');
    await waitFor(() => expect(document.querySelector('.v2-thread-running')).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Delete Acme NDA term' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    // Not left running against a conversation that no longer exists.
    await waitFor(() => expect(streams.streamOf('t-1')).toBeNull());
    expect(document.querySelector('.v2-thread-running')).toBeNull();
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

  // cou-88 regression: a draft left for another surface must be reachable
  // again — the Chat nav and the rail's draft row both return to the SAME
  // draft, never to a thread and never to a fresh (wiped) one.
  test('the Chat nav returns to the live draft, not to a thread', async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'half-typed');

    goTo('#/');
    expect(workNode()?.hasAttribute('hidden')).toBe(true);
    goTo('#/chat');

    expect(workNode()?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeNull();
    expect(document.querySelector('.v2-thread-head')).toBeNull();
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('half-typed');
  });

  test("the rail's draft row navigates back to the draft from Home", async () => {
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'keep me');

    goTo('#/');
    const pane = chatNode();
    await userEvent.click(screen.getByRole('button', { name: 'Open the new conversation' }));

    expect(workNode()?.hasAttribute('hidden')).toBe(false);
    expect(location.hash).toBe('#/chat');
    // The same pane: a return, not a re-keyed (wiped) draft.
    expect(chatNode()).toBe(pane);
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('keep me');
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
    // The drawer is not a route: the fragment still points at chat, never at
    // the vault. (Whether it carries `?thread=` is F3a's business, not this
    // test's — happy-dom fires a hashchange on replaceState and browsers do
    // not, so asserting the exact string here would pin the wrong thing.)
    expect(routeFromHash(location.hash)).toBe('chat');
    expect(vaultPathFromHash(location.hash)).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('aside[aria-label="Vault drawer"]')).toBeNull();
  });

  test('a bare #/chat keeps the open thread and re-stamps the fragment', async () => {
    history.replaceState(null, '', '/#/chat?thread=t-2');
    render(<Shell />);
    await waitFor(() => expect(chatNode()).toBeTruthy());
    await waitFor(() => expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope'));
    const before = chatNode();

    // The rail's Chat link has no `?thread=` in its href.
    goTo('#/chat');

    // The thread stays open — and the URL says so again, so copying the link
    // or reloading lands back on it.
    expect(chatNode()).toBe(before);
    expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope');
    expect(location.hash).toBe('#/chat?thread=t-2');
  });

  test('a #/chat?thread= naming no known thread opens a draft and says so', async () => {
    history.replaceState(null, '', '/#/chat?thread=t-gone');
    render(<Shell />);

    await waitFor(() => expect(screen.getByText('that conversation was not found')).toBeTruthy());
    // A draft — NOT some other conversation opened silently.
    expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy();
    expect(document.querySelector('li.v2-thread[aria-current="true"]')).toBeNull();
    // And the fragment stops claiming a thread it cannot show.
    expect(location.hash).toBe('#/chat');

    // Picking a real thread clears the notice.
    await userEvent.click(screen.getByText('Acme NDA term'));
    await waitFor(() => expect(screen.queryByText('that conversation was not found')).toBeNull());
  });

  test('deleting the open thread from Home stays on Home', async () => {
    try {
      history.replaceState(null, '', '/#/');
      const base = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/threads' && (init?.method ?? 'GET') === 'DELETE') return json(null);
        if (/^\/threads\/.+$/.test(String(input)) && init?.method === 'DELETE') return json(null);
        return await (base as unknown as typeof fetch)(input, init);
      }) as unknown as typeof fetch;

      render(<Shell />);
      await waitFor(() => expect(document.querySelector('.v2-home')).toBeTruthy());
      // Twice on the visible page: the rail's row and home's conversations
      // column. The hidden chat workspace (mounted for the keep-stream
      // invariant) shows the same title in its header, so it is left out.
      await waitFor(() => expect((screen.getAllByText('Acme NDA term') as HTMLElement[]).filter(el => el.closest('.v2-work') === null)).toHaveLength(2));

      await userEvent.click(screen.getByRole('button', { name: 'Delete Acme NDA term' }));
      // No window.confirm: the rail row asks, and Delete answers.
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      // Home is still the page, and the fragment never became a chat one.
      await waitFor(() => expect(document.querySelector('.v2-home')).toBeTruthy());
      expect(routeFromHash(location.hash)).toBe('home');
      expect(workNode()?.hasAttribute('hidden')).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('a send that lands after the reader opened the vault does not rewrite the URL', async () => {
    const fresh: ThreadHeader = {
      id: 't-9',
      title: 'Check the cap.',
      createdAt: '2026-08-29T12:00:00.000Z',
      updatedAt: '2026-08-29T12:00:00.000Z',
      sessions: {},
    };
    let releaseCreate = (): void => {};
    const createHeld = new Promise<void>(resolve => {
      releaseCreate = resolve;
    });

    let created = false;
    // `onThreadCreated` calls `loadThreads()`, so a GET that arrives after the
    // POST resolved proves the callback ran — the only deterministic signal
    // available here, since the collapsed vault rail renders no thread list.
    let listsAfterCreate = 0;
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if ((init?.method ?? 'GET') === 'POST' && url === '/threads') {
        await createHeld;
        created = true;
        return json(fresh);
      }
      if (url === '/threads') {
        if (created) listsAfterCreate += 1;
        return json(created ? [fresh, acme, beta] : [acme, beta]);
      }
      if (url.endsWith('/steps')) {
        return new Response('event: done\ndata: {"type":"done","output":null}\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        });
      }
      return await (base as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'New conversation' }));
    await userEvent.type(await screen.findByLabelText('Message'), 'Check the cap.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    // The reader walks away mid-send.
    goTo('#/vault?path=practice/standards/nda.md');
    await waitFor(() => expect(document.querySelector('.v2-vault')).toBeTruthy());

    releaseCreate();
    await waitFor(() => expect(listsAfterCreate).toBeGreaterThan(0));

    // The vault page is still the page, and the URL still names its file.
    expect(location.hash).toBe('#/vault?path=practice/standards/nda.md');
    expect(document.querySelector('.v2-vault')).toBeTruthy();
  });

  /**
   * What `history.replaceState` was told, WITHOUT letting it move the hash.
   *
   * happy-dom fires a `hashchange` on `replaceState`; real browsers do not.
   * That difference silently repairs a bare `#/chat` here (the shell's own
   * hashchange listener re-stamps), so a test that only reads
   * `location.hash` cannot see the bug at all. Recording the calls pins what
   * the code actually writes.
   */
  function recordReplaceState(): { calls: string[]; restore(): void } {
    const calls: string[] = [];
    const real = globalThis.history.replaceState;
    globalThis.history.replaceState = ((_data: unknown, _unused: string, url?: string | URL | null) => {
      calls.push(String(url));
    }) as typeof globalThis.history.replaceState;
    return {
      calls,
      restore: () => {
        globalThis.history.replaceState = real;
      },
    };
  }

  test('the ask bar seeds the composer and keeps the thread in the fragment', async () => {
    install({ events: proposalEvents });
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('[data-testid="proposal-p-1"]')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Ask counsel about this file/ })).toBeTruthy());

    const history = recordReplaceState();
    try {
      await userEvent.click(screen.getByRole('button', { name: /Ask counsel about this file/ }));
    } finally {
      history.restore();
    }

    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Regarding `practice/standards/nda.md`: ');
    // The fragment must end up naming the open thread: a bare `#/chat`
    // reopens the most-recent thread on reload, not this one.
    expect(history.calls.at(-1)).toBe('#/chat?thread=t-1');
  });

  test('the ask bar on a draft leaves a bare #/chat — there is no thread to name', async () => {
    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'New conversation' }));
    goTo('#/vault?path=practice/standards/nda.md');
    await waitFor(() => expect(screen.getByRole('button', { name: /Ask counsel about this file/ })).toBeTruthy());

    const history = recordReplaceState();
    try {
      await userEvent.click(screen.getByRole('button', { name: /Ask counsel about this file/ }));
    } finally {
      history.restore();
    }

    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    expect(history.calls).toEqual(['#/chat']);
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Regarding `practice/standards/nda.md`: ');
  });

  test('a seed fires once: a new draft does not inherit the ask prefill', async () => {
    install({ events: proposalEvents });
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('[data-testid="proposal-p-1"]')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'open in vault' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Ask counsel about this file/ })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /Ask counsel about this file/ }));
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain('Regarding');

    // `Chat` is re-keyed here, which remounts the composer. A seed left in
    // the shell's state would refill the fresh box with a path the reader
    // has walked away from.
    await userEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    await waitFor(() => expect(document.querySelector('li.v2-draft[aria-current="true"]')).toBeTruthy());
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('');
  });

  /** Home's ask box: `POST /threads` then one step, with the thread listed
   * afterwards so the rail can show it. */
  function installAsk(): { steps: unknown[] } {
    const fresh: ThreadHeader = {
      id: 't-9',
      title: 'Review the Acme NDA.',
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:00:00.000Z',
      sessions: {},
    };
    const steps: unknown[] = [];
    let created = false;
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (method === 'POST' && url === '/threads') {
        created = true;
        return json(fresh);
      }
      if (url === '/threads') return json(created ? [fresh, acme, beta] : [acme, beta]);
      if (url.endsWith('/steps')) {
        steps.push(JSON.parse(String(init?.body)));
        return new Response('event: done\ndata: {"type":"done","output":null}\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        });
      }
      if (/^\/threads\/t-9$/.test(url)) return json({ header: fresh, events: [] } satisfies Thread);
      return await (base as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;
    return { steps };
  }

  test("home's ask box opens a draft chat and sends the message", async () => {
    history.replaceState(null, '', '/#/');
    const { steps } = installAsk();
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('.v2-home')).toBeTruthy());

    await userEvent.type(await screen.findByRole('textbox', { name: 'Ask counsel' }), 'Review the Acme NDA.');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    // The workspace is the page now, and the message went as typed — on the
    // default provider, since home has no picker.
    await waitFor(() => expect(workNode()?.hasAttribute('hidden')).toBe(false));
    await waitFor(() => expect(steps).toEqual([{ message: 'Review the Acme NDA.', provider: 'fake/fake' }]));
    // And the fragment names the thread the send created.
    await waitFor(() => expect(location.hash).toBe('#/chat?thread=t-9'));
  });

  test('an ask fires once: opening another thread does not send it again', async () => {
    history.replaceState(null, '', '/#/');
    const { steps } = installAsk();
    render(<Shell />);
    await waitFor(() => expect(document.querySelector('.v2-home')).toBeTruthy());
    await userEvent.type(await screen.findByRole('textbox', { name: 'Ask counsel' }), 'Review the Acme NDA.');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await waitFor(() => expect(steps).toHaveLength(1));

    // A different thread re-keys `Chat`. An ask left in the shell's state
    // would be sent again here — into a conversation that never asked it.
    await userEvent.click(screen.getByText('Beta MSA scope'));
    await waitFor(() => expect(document.querySelector('li.v2-thread[aria-current="true"]')?.textContent).toContain('Beta MSA scope'));
    expect(steps).toHaveLength(1);
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

  test('the footer switcher saves the picked default through PUT /settings and the plate updates in place (cou-90)', async () => {
    const claude = {
      id: 'claude-sub/claude-opus-5',
      kind: 'harness',
      auth: 'subscription',
      capabilities: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' },
    };
    const two: Health = { ...health, providers: [...health.providers, claude] as Health['providers'] };
    const puts: unknown[] = [];
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/health')) return json(two);
      if (url.startsWith('/settings') && method === 'PUT') {
        const body = JSON.parse(String(init?.body)) as { default?: string };
        puts.push(body);
        return json({
          ...settings,
          registry: { ...settings.registry, default: body.default },
          effective: { default: body.default ?? null, stepTimeoutMs: 600_000, providers: two.providers },
        } satisfies SettingsView);
      }
      return await (base as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(document.querySelector('.v2-foot .v2-plate-detail')?.textContent).toBe('fake/fake · local'));

    await userEvent.click(document.querySelector('.v2-foot') as HTMLElement);
    await userEvent.click(screen.getByText('Claude'));

    // The PUT is a read-modify-write of the FILE: only `default` changed;
    // the registry's own providers list (empty — the built-ins live in no
    // file) went back untouched.
    await waitFor(() => expect(puts).toEqual([{ default: 'claude-sub/claude-opus-5', providers: [] }]));
    // And the plate re-rendered from the PUT's own `effective` — no reload.
    await waitFor(() => expect(document.querySelector('.v2-foot .v2-plate-vendor')?.textContent).toBe('Claude'));
    expect(document.querySelector('.v2-foot .v2-plate-detail')?.textContent).toBe('Opus 5 · subscription');
    expect(document.querySelector('.v2-foot .v2-dot')?.classList.contains('v2-dot-amber')).toBe(false);
  });
});

describe('Shell, a tab with no usable key (spec §5)', () => {
  const hex = '0123456789abcdef'.repeat(4);

  test('no token → the session-lost screen; a pasted address gets back in without a reload', async () => {
    sessionStorage.clear();
    const bearers: string[] = [];
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string> | undefined)?.['authorization'];
      if (url === '/threads' && auth !== undefined) bearers.push(auth);
      // The probe carries no token: the runtime says who-are-you.
      if (url.startsWith('/health') && auth === undefined) return new Response('{"error":"unauthorized"}', { status: 401 });
      return base(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(screen.getByLabelText('Session lost')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('The runtime is running'));
    expect(document.querySelector('.v2-rail')).toBeNull();

    await userEvent.type(screen.getByLabelText('Paste the address the runtime printed'), `http://127.0.0.1:7431/#token=${hex}`);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    // Home renders, the list was fetched with the NEW bearer, and the URL
    // never carried the token.
    await waitFor(() => expect(screen.getAllByText('Acme NDA term').length).toBeGreaterThan(0));
    expect(bearers).toContain(`Bearer ${hex}`);
    expect(globalThis.location.hash).not.toContain('token');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(hex);
  });
});

describe('Shell in setup mode (spec 2026-09-01 §4)', () => {
  test('health.setup → the first-run screen, nothing else is fetched; Create → POST /setup → health re-read → Home', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'test-token');
    let setup = true;
    const fetched: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetched.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.startsWith('/health')) return json(setup ? { setup: true, vault: null, tenant: 'default', providers: [], default: null, stepTimeoutMs: 600_000 } : { ...health, setup: false });
      if (url.startsWith('/setup/detect')) return json({ locations: [{ path: '/Users/jack/Documents/Counsel OS', kind: 'new', exists: false, writable: true, suggested: true }] });
      if (url.startsWith('/setup/providers')) return json({ providers: [] });
      if (url === '/setup' && init?.method === 'POST') {
        setup = false;
        return json({ vault: '/Users/jack/Documents/Counsel OS', result: {} });
      }
      if (url === '/threads') return json([]);
      if (url.startsWith('/vault/overview')) return json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
      if (url.startsWith('/vault/index')) return json([]);
      if (url.startsWith('/proposals')) return json([]);
      if (url.startsWith('/docket')) return json({ deadlines: [], skipped: 0 });
      return new Response('{"error":"setup-required"}', { status: 409, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    globalThis.location.hash = '#/';

    render(<Shell />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Set up counsel-os.'));
    expect(fetched.filter(u => u === 'GET /threads')).toEqual([]);
    expect(document.querySelector('.v2-rail')).toBeNull();

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    await userEvent.type(screen.getByLabelText('Name'), 'Jack');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(fetched).toContain('POST /setup'));
    await waitFor(() => expect(screen.queryByText('Set up counsel-os.')).toBeNull(), { timeout: 3000 });
    await waitFor(() => expect(fetched).toContain('GET /threads'));
    expect(document.querySelector('.v2-rail')).toBeTruthy();
  });
});

describe('Shell, signed in by cookie', () => {
  test('no token in the tab but the runtime answers 200 (the cookie): the app renders, no session-lost screen', async () => {
    // The in-memory copy an earlier test's paste left behind, too.
    clearToken();
    sessionStorage.clear();
    const auths: (string | undefined)[] = [];
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/threads') auths.push((init?.headers as Record<string, string> | undefined)?.['authorization']);
      return base(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(screen.getAllByText('Acme NDA term').length).toBeGreaterThan(0));
    expect(screen.queryByLabelText('Session lost')).toBeNull();
    expect(document.querySelector('.v2-rail')).toBeTruthy();
    // The list was fetched with NO bearer — the browser's cookie is the credential.
    expect(auths).toEqual([undefined]);
    expect(globalThis.location.hash).not.toContain('token');
  });
});

describe('Shell, a printed link opened into the session-lost tab', () => {
  test('the fragment token is taken on hashchange — no reload — and the app comes back', async () => {
    clearToken();
    sessionStorage.clear();
    const hex = 'fedcba9876543210'.repeat(4);
    const base = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.['authorization'];
      // No credential at all: the runtime says who-are-you.
      if (auth === undefined) return new Response('{"error":"unauthorized"}', { status: 401 });
      return base(input, init);
    }) as unknown as typeof fetch;

    render(<Shell />);
    await waitFor(() => expect(screen.getByLabelText('Session lost')).toBeTruthy());

    goTo(`#token=${hex}`);
    await waitFor(() => expect(screen.getAllByText('Acme NDA term').length).toBeGreaterThan(0));
    expect(screen.queryByLabelText('Session lost')).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(hex);
    expect(globalThis.location.hash).not.toContain('token');
  });
});

describe('Shell, the vault index refresh', () => {
  test('an upload announcement re-reads /vault/index', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'test-token');
    const fetched: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      fetched.push(url);
      if (url.startsWith('/health')) return json({ ...health, setup: false });
      if (url === '/threads') return json([]);
      if (url.startsWith('/vault/overview')) return json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
      if (url.startsWith('/vault/index')) return json(['matters/inbox/nda.docx']);
      if (url.startsWith('/proposals')) return json([]);
      if (url.startsWith('/docket')) return json({ deadlines: [], skipped: 0 });
      return json([]);
    }) as unknown as typeof fetch;
    globalThis.location.hash = '#/';
    render(<Shell />);
    await waitFor(() => expect(fetched.filter(u => u.startsWith('/vault/index'))).toHaveLength(1));
    globalThis.dispatchEvent(new Event(VAULT_CHANGED_EVENT));
    await waitFor(() => expect(fetched.filter(u => u.startsWith('/vault/index'))).toHaveLength(2));
  });
});

describe('Shell, running a retro (skills/retro in the runtime)', () => {
  test('run a retro opens the retro thread and sends its first message as a step', async () => {
    const retroHeader = { id: 't-r', title: 'Retro · all time · to 2026-09-01', task: 'retro', createdAt: at, updatedAt: at, sessions: {} };
    const calls: Array<{ method: string; url: string; body?: unknown }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ method, url, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
      if (url.startsWith('/health')) return json(health);
      if (url.startsWith('/runs')) return json([]);
      if (url === '/threads') return json(calls.some(c => c.method === 'POST' && c.url === '/retro') ? [retroHeader, acme] : [acme]);
      if (url === '/retro' && method === 'GET') {
        return json({ lastRetroAt: '2026-05-01T00:00:00.000Z', threadId: 't-old', cadenceDays: 90, daysSince: 123, dueAt: '2026-07-30T00:00:00.000Z', due: true, reason: 'Last retro 123 days ago' });
      }
      if (url === '/retro' && method === 'POST') {
        return new Response(JSON.stringify({ threadId: 't-r', title: retroHeader.title, period: { from: null, to: at }, message: 'Run the practice retro for all time.', status: { due: false } }), { status: 201, headers: { 'content-type': 'application/json' } });
      }
      if (url === '/threads/t-r/steps') {
        return new Response('event: done\ndata: {"type":"done","output":null}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
      }
      if (url === '/threads/t-r') return json({ header: retroHeader, events: [] } satisfies Thread);
      if (url.startsWith('/threads/')) return json({ header: acme, events: [] } satisfies Thread);
      if (url.startsWith('/vault/overview')) return json({ matters: [], groups: { practice: 0, knowledge: 0, other: 0 } });
      if (url.startsWith('/proposals')) return json([]);
      if (url.startsWith('/docket')) return json({ deadlines: [], skipped: 0 });
      if (url.startsWith('/vault/list') || url.startsWith('/vault/index')) return json([]);
      if (url.startsWith('/settings')) return json(settings);
      throw new Error(`unexpected fetch: ${method} ${url}`);
    }) as unknown as typeof fetch;

    globalThis.history.replaceState(null, '', '#/');
    render(<Shell />);
    await userEvent.click(await screen.findByRole('button', { name: 'run a retro' }));

    await waitFor(() => expect(calls.some(c => c.method === 'POST' && c.url === '/threads/t-r/steps')).toBe(true));
    const step = calls.find(c => c.method === 'POST' && c.url === '/threads/t-r/steps')!;
    expect((step.body as { message: string }).message).toBe('Run the practice retro for all time.');
    // The thread is the one open on screen, and the URL names it.
    expect(globalThis.location.hash).toBe('#/chat?thread=t-r');
    await waitFor(() => expect(document.querySelector('.v2-thread-head h1')?.textContent).toContain('Retro ·'));
    // No thread was created by the page: the runtime opened it.
    expect(calls.some(c => c.method === 'POST' && c.url === '/threads')).toBe(false);
  });
});
