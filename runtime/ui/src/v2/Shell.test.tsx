import { act, cleanup, fireEvent, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../api/token';
import { routeFromHash, vaultPathFromHash } from '../app';
import type { Health, SettingsView, Thread, ThreadEvent, ThreadHeader } from '../api/types';
import { Shell } from './Shell';

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
      // Twice, from here on: the rail's row and home's conversations column.
      await waitFor(() => expect(screen.getAllByText('Acme NDA term')).toHaveLength(2));

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
  test('health.setup → the setup page, nothing else is fetched; Check again re-reads health and lands on Home', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'test-token');
    let setup = true;
    const fetched: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      fetched.push(url);
      if (url.startsWith('/health')) return json(setup ? { setup: true, vault: null, tenant: 'default', providers: [], default: null, stepTimeoutMs: 600_000 } : { ...health, setup: false });
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
    expect(fetched.filter(u => u === '/threads')).toEqual([]);
    expect(document.querySelector('.v2-rail')).toBeNull();

    setup = false;
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(screen.queryByText('Set up counsel-os.')).toBeNull());
    await waitFor(() => expect(fetched).toContain('/threads'));
    expect(document.querySelector('.v2-rail')).toBeTruthy();
  });
});
