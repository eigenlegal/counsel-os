import { act, cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../api/token';
import type { Health, Thread, ThreadEvent } from '../api/types';
import { Chat } from './Chat';

const at = '2026-08-29T10:00:00.000Z';
const ANSWER = 'Hello from the model.';
const QUESTION = 'Check the Acme cap.';

const health: Health = {
  vault: '/tmp/vault',
  tenant: 'default',
  providers: [
    {
      id: 'fake/fake',
      kind: 'direct',
      auth: 'local',
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'local' },
    },
  ],
  default: 'fake/fake',
  stepTimeoutMs: 600_000,
};

function thread(events: ThreadEvent[]): Thread {
  return { header: { id: 't-1', createdAt: at, updatedAt: at, sessions: {} }, events };
}

/** The transcript the server has once the step has landed. */
const answered = thread([
  { t: 'user', at, content: QUESTION },
  { t: 'step', at, runId: 'r-1', provider: 'fake/fake' },
  { type: 'text', at, text: ANSWER },
  { type: 'done', at, output: null, usage: { inputTokens: 1, outputTokens: 2 } },
]);

function frame(ev: Record<string, unknown>): string {
  return `event: ${String(ev['type'])}\ndata: ${JSON.stringify({ ...ev, runId: 'r-1' })}\n\n`;
}

const DONE = frame({ type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } });
const SSE = frame({ type: 'text', text: ANSWER }) + DONE;

/** The same step, but it also raises a proposal — which is what puts a card
 * with its own Reload button inside the live turn. */
const SSE_WITH_PROPOSAL =
  frame({ type: 'text', text: ANSWER })
  + frame({ type: 'proposal', id: 'p-1', path: 'practice/standards/cap.md', rationale: 'Write the cap down.' })
  + DONE;

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

const realFetch = globalThis.fetch;

interface Options {
  /** What the step streams. */
  sse?: string;
  /** What `POST /threads/:id/approve` answers. */
  approve?: () => Response;
}

/** `threadFor(n)` answers the nth `GET /threads/:id`; runs are always empty. */
function install(threadFor: (n: number) => Promise<Response>, opts: Options = {}): void {
  let calls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/runs')) return json([]);
    // Before the `/threads/` prefix: these are thread sub-routes.
    if (url.endsWith('/steps')) return stream(opts.sse ?? SSE);
    if (url.endsWith('/approve')) {
      if (opts.approve === undefined) throw new Error('no approve response configured');
      return opts.approve();
    }
    if (url.startsWith('/threads/')) {
      calls += 1;
      return threadFor(calls);
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

/** What every "the composer works again" assertion checks. */
function composerIsUsable(): void {
  expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
  expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(false);
}

async function ask(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Message'), QUESTION);
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
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

describe('Chat, when the end-of-stream refetch fails', () => {
  test('keeps the answer, frees the composer, and offers Retry', async () => {
    install(async n => {
      if (n === 1) return json(thread([]));
      if (n === 2) return json({ error: 'the vault went away' }, 500);
      return json(answered);
    });

    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByText('No messages yet. Ask counsel something.')).toBeTruthy());

    await ask();

    // The streamed turn survives the failed refresh — both halves of it.
    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());
    expect(screen.getByText(QUESTION)).toBeTruthy();

    // And the step is over as far as the composer is concerned: no Stop, an
    // editable box, and Send live again as soon as there is something to send.
    composerIsUsable();
    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    await userEvent.type(box, 'and again');
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(false);

    // The failure is on screen, with the way out next to it.
    expect(screen.getByText(/the vault went away/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.queryByText(/the vault went away/)).toBeNull());
    // The frozen turn is gone, replaced by the server's copy — not shown twice.
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
  });
});

describe('Chat, when two loads are in flight', () => {
  test('a slow older load cannot overwrite a newer transcript', async () => {
    let release!: () => void;
    const held = new Promise<void>(resolve => {
      release = resolve;
    });

    install(async n => {
      // The FIRST load — the one the thread opened with — answers last, and
      // answers with the transcript as it was before the step ran.
      if (n === 1) {
        await held;
        return json(thread([]));
      }
      return json(answered);
    });

    render(<Chat threadId="t-1" health={health} />);
    await ask();

    // The step's own refetch (load 2) has landed.
    await waitFor(() => expect(screen.getByText(ANSWER)).toBeTruthy());

    await act(async () => {
      release();
      await Promise.resolve();
    });

    // The stale answer is dropped, not applied: the turn is still there and
    // the empty-thread message never comes back.
    expect(screen.getByText(ANSWER)).toBeTruthy();
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    expect(screen.queryByText('No messages yet. Ask counsel something.')).toBeNull();
  });
});

describe('Chat, when a Reload supersedes the end-of-stream refetch', () => {
  test('the Reload that fails is the one that settles the finished turn', async () => {
    // The step's own refetch never answers. A Reload fired on top of it takes
    // the ticket, fails, and is therefore the load that owns the finished
    // stream — the case where settling from inside `send` did nothing at all.
    let release!: () => void;
    const held = new Promise<void>(resolve => {
      release = resolve;
    });
    let healthy = false;

    install(
      async n => {
        if (n === 1) return json(thread([]));
        if (n === 2) {
          await held;
          return json(thread([]));
        }
        return healthy ? json(answered) : json({ error: 'the vault went away' }, 500);
      },
      {
        sse: SSE_WITH_PROPOSAL,
        approve: () => json({ error: 'vault conflict', conflict: { expected: 'exp-hash', actual: 'act-hash' } }, 409),
      },
    );

    render(<Chat threadId="t-1" health={health} />);
    await waitFor(() => expect(screen.getByText('No messages yet. Ask counsel something.')).toBeTruthy());

    await ask();

    // The stream has ended and `send` is stuck awaiting its own refetch, so
    // the live turn — proposal card and all — is still on screen.
    await waitFor(() => expect(screen.getByRole('button', { name: /approve/i })).toBeTruthy());

    // A conflict is how a Reload button gets on screen mid-turn.
    await userEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(screen.getByText(/exp-hash/)).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: /reload/i }));

    // That Reload failed — and it, not `send`, had to hand the turn back.
    await waitFor(() => expect(screen.getByText(/the vault went away/)).toBeTruthy());
    expect(screen.getByText(ANSWER)).toBeTruthy();
    expect(screen.getByText(QUESTION)).toBeTruthy();
    composerIsUsable();

    // The superseded refetch answering late changes nothing.
    await act(async () => {
      release();
      await Promise.resolve();
    });
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    composerIsUsable();

    healthy = true;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.queryByText(/the vault went away/)).toBeNull());
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
  });
});
