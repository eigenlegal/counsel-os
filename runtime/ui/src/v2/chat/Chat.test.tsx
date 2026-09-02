import { act, cleanup, render, screen, userEvent, waitFor, within } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { Health, Thread, ThreadEvent } from '../../api/types';
import { Chat } from './Chat';

const at = '2026-08-29T10:00:00.000Z';
const ANSWER = 'Hello from the model.';
const QUESTION = 'Check the Acme cap.';

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [{ id: 'fake/fake', kind: 'direct', auth: 'local', capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' } }],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

function thread(id: string, events: ThreadEvent[]): Thread {
  return { header: { id, createdAt: at, updatedAt: at, sessions: {} }, events };
}

function answered(id: string): Thread {
  return thread(id, [
    { t: 'user', at, content: QUESTION },
    { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
    { type: 'tool_call', at, id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' } },
    { type: 'tool_result', at, id: 'c-1', name: 'vault_read', output: 'x' },
    { type: 'text', at, text: ANSWER },
    { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 2 } },
  ]);
}

function frame(ev: Record<string, unknown>): string {
  return `event: ${String(ev['type'])}\ndata: ${JSON.stringify({ ...ev, runId: 'r-1' })}\n\n`;
}

const SSE =
  frame({ type: 'tool_call', id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' } })
  + frame({ type: 'tool_result', id: 'c-1', name: 'vault_read', output: 'x' })
  + frame({ type: 'text', text: ANSWER })
  + frame({ type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } });

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function stream(body: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream', 'x-run-id': 'r-1' } },
  );
}

interface Call {
  method: string;
  url: string;
  body?: unknown;
}

const realFetch = globalThis.fetch;
let calls: Call[] = [];

/** `threadFor(n)` answers the nth `GET /threads/:id`. */
function install(threadFor: (n: number) => Promise<Response>): void {
  let loads = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    if (url.startsWith('/runs')) return json([]);
    if (url.startsWith('/vault/read')) return json({ path: 'practice/standards/nda.md', content: '# NDA\n', version: 'v1', mtimeMs: 1 });
    if (method === 'POST' && url === '/threads') return json({ id: 't-9', title: QUESTION, createdAt: at, updatedAt: at, sessions: {} });
    if (url.endsWith('/steps')) return stream(SSE);
    if (url.startsWith('/threads/')) {
      loads += 1;
      return threadFor(loads);
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  }) as unknown as typeof fetch;
}

function composerIsUsable(): void {
  expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
  expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(false);
}

async function ask(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Message'), QUESTION);
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
}

beforeEach(() => {
  calls = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('v2 Chat, from a draft', () => {
  test('the first send creates the thread with the first line as its title, then runs the step', async () => {
    install(async () => json(answered('t-9')));
    const created: string[] = [];
    render(<Chat threadId={null} health={health} onThreadCreated={header => created.push(header.id)} />);
    expect(screen.getByText(/New conversation/)).toBeTruthy();
    // A draft makes no request.
    expect(calls).toEqual([]);

    await ask();

    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(calls[0]).toEqual({ method: 'POST', url: '/threads', body: { title: QUESTION } });
    expect(calls[1]!.url).toBe('/threads/t-9/steps');
    expect(created).toEqual(['t-9']);
    // Finished: the answer is prose, the work is a strip, the timeline is folded away.
    // Trimmed: the prose is rendered markdown now, and `marked` ends a
    // block with a newline.
    expect(document.querySelector('.v2-prose')?.textContent?.trim()).toBe(ANSWER);
    expect(document.querySelector('.v2-strip .v2-strip-summary')?.textContent).toBe('1 source');
    composerIsUsable();
  });

  test('a second send while the create is in flight cannot open a second thread', async () => {
    install(async () => json(answered('t-9')));
    const inner = globalThis.fetch;
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => {
      release = resolve;
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      // The create is the widest window in the send: on a real deployment it
      // is a whole round trip during which the box used to stay enabled.
      if ((init?.method ?? 'GET') === 'POST' && String(input) === '/threads') await held;
      return (inner as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Chat threadId={null} health={health} />);
    await ask();

    // The create is on the wire and the composer is already locked.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy());
    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    expect(box.disabled).toBe(true);

    // A second attempt, by the route a user actually has. Typing does
    // nothing to a disabled box, and there is no Send to press: on the
    // unfixed code both the text and the button were there, and ⌘⏎ or a
    // click opened a second thread.
    await userEvent.type(box, 'and another thing');
    expect(box.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();

    release();
    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(calls.filter(c => c.method === 'POST' && c.url === '/threads')).toHaveLength(1);
    expect(calls.filter(c => c.url.endsWith('/steps'))).toHaveLength(1);
    composerIsUsable();
  });

  test('a failed create keeps the message on screen and frees the composer', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'POST' && String(input) === '/threads') return json({ error: 'disk full' }, 500);
      throw new Error(`unexpected fetch: ${String(input)}`);
    }) as unknown as typeof fetch;
    render(<Chat threadId={null} health={health} />);

    await ask();

    await waitFor(() => expect(screen.getByText(/disk full/)).toBeTruthy());
    expect(screen.getByText(QUESTION)).toBeTruthy();
    composerIsUsable();
  });

  test('Retry after a failed create runs the whole send again', async () => {
    install(async () => json(answered('t-9')));
    const inner = globalThis.fetch;
    let attempts = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'POST' && String(input) === '/threads') {
        attempts += 1;
        // Only the first attempt fails — the vault was briefly unwritable.
        if (attempts === 1) return json({ error: 'disk full' }, 500);
      }
      return (inner as unknown as typeof fetch)(input, init);
    }) as unknown as typeof fetch;

    render(<Chat threadId={null} health={health} />);
    await ask();
    await waitFor(() => expect(screen.getByText(/disk full/)).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    // The whole send ran again: a new create, then the step.
    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(attempts).toBe(2);
    expect(screen.queryByText(/disk full/)).toBeNull();
    // The frozen bubble was replaced, not stacked on the server's copy.
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
    composerIsUsable();
  });
});

describe('v2 Chat, when the end-of-stream refetch fails', () => {
  test('keeps the answer, frees the composer, and offers Retry', async () => {
    install(async n => {
      if (n === 1) return json(thread('t-1', []));
      if (n === 2) return json({ error: 'the vault went away' }, 500);
      return json(answered('t-1'));
    });
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByText('No messages yet. Ask counsel something.')).toBeTruthy());

    await ask();

    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(screen.getByText(QUESTION)).toBeTruthy();
    composerIsUsable();
    expect(screen.getByText(/the vault went away/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.queryByText(/the vault went away/)).toBeNull());
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
  });
});

describe("v2 Chat, given home's ask", () => {
  const ASK = 'Review the Acme NDA.';

  test('initialAsk sends once, on the default provider, creating the thread', async () => {
    install(async () => json(answered('t-9')));
    const used: number[] = [];
    render(<Chat threadId={null} health={health} initialAsk={{ text: ASK, nonce: 1 }} onAskUsed={() => used.push(1)} />);

    await waitFor(() => expect(calls.some(c => c.method === 'POST' && c.url === '/threads')).toBe(true));
    const step = calls.find(c => c.url.endsWith('/steps'))!;
    expect(step.body).toEqual({ message: ASK, provider: 'fake/fake' });
    // The shell is told, so the ask is dropped and cannot fire again.
    expect(used).toEqual([1]);

    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(calls.filter(c => c.method === 'POST' && c.url === '/threads')).toHaveLength(1);
    expect(calls.filter(c => c.url.endsWith('/steps'))).toHaveLength(1);
    composerIsUsable();
  });

  test('a re-render with the same ask does not send it again', async () => {
    install(async () => json(answered('t-9')));
    const ask = { text: ASK, nonce: 1 };
    const { rerender } = render(<Chat threadId={null} health={health} initialAsk={ask} />);
    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());

    rerender(<Chat threadId={null} health={health} initialAsk={{ ...ask }} />);
    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(calls.filter(c => c.url.endsWith('/steps'))).toHaveLength(1);
  });

  test('no ask sends nothing — a plain draft still waits for the reader', async () => {
    install(async () => json(answered('t-9')));
    render(<Chat threadId={null} health={health} />);
    expect(calls).toEqual([]);
    composerIsUsable();
  });
});

describe('v2 Chat, the thread header', () => {
  test('serif title, the matter line from the first matter read, and the date', async () => {
    const events: ThreadEvent[] = [
      { t: 'user', at, content: 'check it' },
      { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
      { type: 'tool_call', at, id: 'c1', name: 'vault_read', input: { path: 'practice/standards/nda.md' } },
      { type: 'tool_call', at, id: 'c2', name: 'vault_read', input: { path: 'matters/acme-nda.md' } },
      { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
    ];
    install(async () =>
      json({ header: { id: 't-1', title: 'NDA residuals fallback', createdAt: at, updatedAt: at, sessions: {} }, events }),
    );
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(document.querySelector('.v2-thread-head h1')?.textContent).toBe('NDA residuals fallback'));
    // The first MATTER file, not the first file read at all — set as a
    // run-in plus the matter's REAL title (its file's H1 here), linked to
    // the file; no pill (cou-93 item 7).
    const line = document.querySelector('a.v2-thread-matter')!;
    expect(line.getAttribute('href')).toBe('#/vault?path=matters%2Facme-nda.md');
    expect(line.querySelector('.v2-tag')?.textContent).toBe('Matter');
    await waitFor(() => expect(line.querySelector('.v2-thread-matter-name')?.textContent).toBe('NDA'));
    expect(document.querySelector('.v2-matter-chip')).toBeNull();
  });

  test('a thread nobody named reads as Untitled, and a thread on no matter shows no matter line', async () => {
    install(async () =>
      json(
        thread('t-1', [
          { t: 'user', at, content: 'check it' },
          { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
          { type: 'tool_call', at, id: 'c1', name: 'vault_read', input: { path: 'practice/standards/nda.md' } },
          { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
        ]),
      ),
    );
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(document.querySelector('.v2-thread-head h1')?.textContent).toBe('Untitled'));
    expect(document.querySelector('.v2-thread-matter')).toBeNull();
  });

  test('a draft has no thread, so it has no header', () => {
    install(async () => json(answered('t-9')));
    render(<Chat threadId={null} health={health} />);
    expect(document.querySelector('.v2-thread-head')).toBeNull();
  });
});

describe('v2 Chat, the docket anchor', () => {
  /** Two pending proposals in one thread — the docket's Review row shape. */
  function withProposals(): Thread {
    return thread('t-1', [
      { t: 'user', at, content: QUESTION },
      { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
      { type: 'text', at, text: ANSWER },
      { t: 'proposal', at, id: 'p-1', path: 'practice/standards/nda.md', content: '# NDA\nTerm: 3 years\n', rationale: 'first', status: 'pending', expectedVersion: null },
      { t: 'proposal', at, id: 'p-2', path: 'practice/standards/msa.md', content: '# MSA\n', rationale: 'second', status: 'pending', expectedVersion: null },
      { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 2 } },
    ]);
  }

  /** Records which element each scroll landed on. happy-dom has no
   * `scrollIntoView`, so this is the whole implementation under test. */
  function recordScrolls(): { ids: string[]; restore: () => void } {
    const ids: string[] = [];
    const proto = Element.prototype as unknown as Record<string, unknown>;
    const had = 'scrollIntoView' in proto;
    const before = proto['scrollIntoView'];
    proto['scrollIntoView'] = function scrollIntoView(this: Element): void {
      console.log(`DIAG recorder hit id=${this.id}`);
      ids.push(this.id);
    };
    console.log(`DIAG recorder installed had=${had} hash=${location.hash} sameElement=${Element === (document.createElement('div').constructor as unknown as typeof Element)} htmlProtoOwn=${Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'scrollIntoView')}`);
    return {
      ids,
      restore: () => {
        if (had) proto['scrollIntoView'] = before;
        else delete proto['scrollIntoView'];
      },
    };
  }

  test('?proposal= scrolls that slip into view once the transcript holds it', async () => {
    const scrolls = recordScrolls();
    history.replaceState(null, '', '/#/chat?thread=t-1&proposal=p-2');
    install(async () => json(withProposals()));
    try {
      render(<Chat threadId="t-1" health={health} />);
      await waitFor(() => expect(document.getElementById('proposal-p-2')).toBeTruthy());
      await waitFor(() => expect(scrolls.ids).toContain('proposal-p-2'));
      expect(scrolls.ids).not.toContain('proposal-p-1');
    } finally {
      scrolls.restore();
      history.replaceState(null, '', '/');
    }
  });

  test('a second Review in the SAME thread still scrolls', async () => {
    const scrolls = recordScrolls();
    history.replaceState(null, '', '/#/chat?thread=t-1&proposal=p-1');
    install(async () => json(withProposals()));
    try {
      render(<Chat threadId="t-1" health={health} />);
      await waitFor(() => expect(scrolls.ids).toEqual(['proposal-p-1']));

      // The reader is already in this thread; the docket's other row only
      // changes the fragment. Nothing about `thread` changes.
      await act(async () => {
        history.replaceState(null, '', '/#/chat?thread=t-1&proposal=p-2');
        globalThis.dispatchEvent(new Event('hashchange'));
      });

      await waitFor(() => expect(scrolls.ids).toEqual(['proposal-p-1', 'proposal-p-2']));
    } finally {
      scrolls.restore();
      history.replaceState(null, '', '/');
    }
  });

  test('no ?proposal= scrolls nothing', async () => {
    const scrolls = recordScrolls();
    history.replaceState(null, '', '/#/chat?thread=t-1');
    install(async () => json(withProposals()));
    try {
      render(<Chat threadId="t-1" health={health} />);
      await waitFor(() => expect(document.getElementById('proposal-p-1')).toBeTruthy());
      expect(scrolls.ids).toEqual([]);
    } finally {
      scrolls.restore();
      history.replaceState(null, '', '/');
    }
  });
});

describe('v2 Chat, retrying a failed step (cou-95)', () => {
  test('Retry on the last failed turn sends the same message again on the default provider', async () => {
    install(async () =>
      json(
        thread('t-1', [
          { t: 'user', at, content: QUESTION },
          { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
          { type: 'error', at, message: 'claude harness: Not logged in · Please run /login' },
        ]),
      ),
    );
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(calls.some(c => c.method === 'POST' && c.url.endsWith('/steps'))).toBe(true));
    const step = calls.find(c => c.method === 'POST' && c.url.endsWith('/steps'))!;
    expect((step.body as { message: string; provider: string }).message).toBe(QUESTION);
    expect((step.body as { message: string; provider: string }).provider).toBe('fake/fake');
  });
});

describe('v2 Chat, rename and matter link', () => {
  const overview = {
    matters: [
      { path: 'matters/acme-nda.md', title: 'Acme Corp — NDA', frontmatter: {}, mtimeMs: 2 },
      { path: 'matters/beta-msa.md', title: 'Beta — MSA', frontmatter: {}, mtimeMs: 1 },
    ],
    groups: { practice: 0, knowledge: 0, other: 0 },
  };

  /** A thread the tests can PATCH: the mock applies the patch and serves the
   * updated header on the next GET, the way the runtime does. */
  function installPatchable(initial: Thread): { patches: Array<Record<string, unknown>> } {
    let current = initial;
    const patches: Array<Record<string, unknown>> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/runs')) return json([]);
      if (url.startsWith('/vault/read')) return json({ path: 'x', content: '# Acme NDA\n', version: 'v1', mtimeMs: 1 });
      if (url.startsWith('/vault/overview')) return json(overview);
      if (method === 'PATCH' && url.startsWith('/threads/')) {
        const patch = JSON.parse(String(init?.body)) as { title?: string; matter?: string | null };
        patches.push(patch);
        const header = { ...current.header };
        if (patch.title !== undefined) header.title = patch.title;
        if (patch.matter === null) delete header.matter;
        else if (patch.matter !== undefined) header.matter = patch.matter;
        current = { ...current, header };
        return json(header);
      }
      if (url.startsWith('/threads/')) return json(current);
      throw new Error(`unexpected fetch: ${method} ${url}`);
    }) as unknown as typeof fetch;
    return { patches };
  }

  const readsAcme: ThreadEvent[] = [
    { t: 'user', at, content: 'check it' },
    { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
    { type: 'tool_call', at, id: 'c1', name: 'vault_read', input: { path: 'matters/acme-nda.md' } },
    { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 1 } },
  ];

  function named(title: string, extra: Partial<Thread['header']> = {}, events: ThreadEvent[] = readsAcme): Thread {
    return { header: { id: 't-1', title, createdAt: at, updatedAt: at, sessions: {}, ...extra }, events };
  }

  test('click the title, type a new one, Enter — PATCH {title}, and the header shows it', async () => {
    const { patches } = installPatchable(named('Old name'));
    let touched = 0;
    render(<Chat threadId="t-1" health={health} onThreadTouched={() => (touched += 1)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Old name' })).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'Old name' }));
    const input = screen.getByLabelText('Conversation title') as HTMLInputElement;
    expect(input.value).toBe('Old name');
    const user = userEvent.setup({ document });
    await user.clear(input);
    await user.type(input, 'Acme — residuals{Enter}');

    await waitFor(() => expect(patches).toEqual([{ title: 'Acme — residuals' }]));
    await waitFor(() => expect(document.querySelector('.v2-thread-head h1')?.textContent).toBe('Acme — residuals'));
    expect(screen.queryByLabelText('Conversation title')).toBeNull();
    // The rail is told, so its row re-reads.
    expect(touched).toBe(1);
  });

  test('Escape puts the old title back and sends nothing', async () => {
    const { patches } = installPatchable(named('Old name'));
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Old name' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Old name' }));
    const input = screen.getByLabelText('Conversation title') as HTMLInputElement;
    await userEvent.type(input, 'zzz{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Old name' })).toBeTruthy());
    expect(patches).toEqual([]);
  });

  test('an unchanged title on blur sends nothing', async () => {
    const { patches } = installPatchable(named('Same'));
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Same' })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'Same' }));
    (screen.getByLabelText('Conversation title') as HTMLInputElement).blur();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Same' })).toBeTruthy());
    expect(patches).toEqual([]);
  });

  test('an inferred matter says so; an explicit link wins over inference', async () => {
    installPatchable(named('T'));
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(document.querySelector('a.v2-thread-matter')).toBeTruthy());
    expect(document.querySelector('a.v2-thread-matter')?.getAttribute('href')).toBe('#/vault?path=matters%2Facme-nda.md');
    expect(screen.getByText('inferred')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'change' })).toBeTruthy();
    cleanup();

    installPatchable(named('T', { matter: 'matters/beta-msa.md' }));
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(document.querySelector('a.v2-thread-matter')).toBeTruthy());
    expect(document.querySelector('a.v2-thread-matter')?.getAttribute('href')).toBe('#/vault?path=matters%2Fbeta-msa.md');
    expect(screen.queryByText('inferred')).toBeNull();
  });

  test('no matter at all offers "link a matter"', async () => {
    installPatchable(named('T', {}, [{ t: 'user', at, content: 'hi' }]));
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'link a matter' })).toBeTruthy());
    expect(document.querySelector('a.v2-thread-matter')).toBeNull();
  });

  test('the picker lists the vault\'s matters; a pick PATCHes {matter}; "No matter" unlinks', async () => {
    const { patches } = installPatchable(named('T'));
    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'change' })).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: 'change' }));
    const menu = await waitFor(() => screen.getByRole('menu', { name: 'Link a matter' }));
    expect(within(menu).getByText('Beta — MSA')).toBeTruthy();
    // Nothing explicit yet, so no unlink row.
    expect(within(menu).queryByText('No matter')).toBeNull();

    await userEvent.click(within(menu).getByText('Beta — MSA'));
    await waitFor(() => expect(patches).toEqual([{ matter: 'matters/beta-msa.md' }]));
    await waitFor(() => expect(document.querySelector('a.v2-thread-matter')?.getAttribute('href')).toBe('#/vault?path=matters%2Fbeta-msa.md'));
    expect(screen.queryByText('inferred')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'change' }));
    const again = await waitFor(() => screen.getByRole('menu', { name: 'Link a matter' }));
    await userEvent.click(within(again).getByText('No matter'));
    await waitFor(() => expect(patches).toEqual([{ matter: 'matters/beta-msa.md' }, { matter: null }]));
    // Back to inference.
    await waitFor(() => expect(screen.getByText('inferred')).toBeTruthy());
  });
});
