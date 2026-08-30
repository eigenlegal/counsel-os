import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

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
    expect(document.querySelector('.v2-prose')?.textContent).toBe(ANSWER);
    expect(document.querySelector('.v2-strip .v2-strip-summary')?.textContent).toBe('read 1 file');
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
