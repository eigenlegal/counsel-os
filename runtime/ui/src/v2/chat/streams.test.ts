import '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import * as streams from './streams';

const realFetch = globalThis.fetch;

/**
 * An SSE response whose frames arrive when the gate opens — and which fails
 * the way a real one does when its signal aborts, so Stop is exercised
 * rather than assumed.
 */
function stream(frames: string[], gate: Promise<void>, signal: AbortSignal | null | undefined): Response {
  const bytes = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const fail = (): void => controller.error(new DOMException('The operation was aborted.', 'AbortError'));
      if (signal?.aborted === true) return fail();
      signal?.addEventListener('abort', fail, { once: true });
      // `start` RETURNS before the gate: a body that is not readable until
      // the gate opens never streams at all.
      void gate.then(() => {
        if (signal?.aborted === true) return;
        for (const frame of frames) controller.enqueue(bytes.encode(frame));
        controller.close();
      });
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const TEXT = 'event: message\ndata: {"type":"text","text":"the cap is low"}\n\n';
const DONE = 'event: message\ndata: {"type":"done","output":null,"usage":{"inputTokens":1,"outputTokens":1},"runId":"r-1"}\n\n';

let open!: () => void;
let gate: Promise<void>;

beforeEach(() => {
  sessionStorage.setItem(TOKEN_KEY, 't');
  gate = new Promise<void>(resolve => (open = resolve));
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => stream([TEXT, DONE], gate, init?.signal)) as unknown as typeof fetch;
});

afterEach(() => {
  streams.reset();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('a step that outlives the pane that started it', () => {
  test('two conversations run at once, and each keeps its own answer', async () => {
    streams.open('t-1', 'Review the cap.');
    streams.open('t-2', 'And the indemnity.');
    const both = Promise.all([streams.run('t-1', 'Review the cap.', 'fake/fake'), streams.run('t-2', 'And the indemnity.', 'fake/fake')]);

    expect([...streams.running()].sort()).toEqual(['t-1', 't-2']);
    expect(streams.streamOf('t-1')?.pending).toBe('Review the cap.');
    expect(streams.streamOf('t-2')?.pending).toBe('And the indemnity.');

    open();
    await both;
    expect(streams.running()).toEqual([]);
    for (const id of ['t-1', 't-2']) {
      const done = streams.streamOf(id)!;
      expect(done.status).toBe('done');
      expect(done.turn.text).toBe('the cap is low');
    }
  });

  test('subscribers hear every change, and the running set keeps its identity', async () => {
    let heard = 0;
    const off = streams.subscribe(() => (heard += 1));
    const before = streams.running();

    streams.open('t-1', 'Ask.');
    expect(heard).toBe(1);
    expect(streams.running()).not.toBe(before);
    // Same set, same array: `useSyncExternalStore` compares with Object.is,
    // and a fresh array on every read is an infinite render loop.
    const while1 = streams.running();
    const run = streams.run('t-1', 'Ask.', 'fake/fake');
    open();
    await run;
    expect(heard).toBeGreaterThan(1);
    streams.open('t-2', 'Ask.');
    streams.forget('t-2');
    expect(streams.running()).toEqual([]);
    expect(while1).toEqual(['t-1']);
    off();
  });

  test('stop ends that thread and leaves the other one working', async () => {
    streams.open('t-1', 'Ask.');
    streams.open('t-2', 'Ask.');
    const both = Promise.all([streams.run('t-1', 'Ask.', 'fake/fake'), streams.run('t-2', 'Ask.', 'fake/fake')]);
    streams.stop('t-1');
    open();
    await both;
    expect(streams.streamOf('t-1')?.status).toBe('stopped');
    expect(streams.streamOf('t-2')?.status).toBe('done');
  });

  test('a draft keeps its answer when the thread it created gets its id', async () => {
    streams.open(null, 'A new one.');
    expect(streams.streamOf(null)?.pending).toBe('A new one.');
    streams.rename('t-9');
    expect(streams.streamOf(null)).toBeNull();
    expect(streams.streamOf('t-9')?.pending).toBe('A new one.');

    const run = streams.run('t-9', 'A new one.', 'fake/fake');
    open();
    await run;
    expect(streams.streamOf('t-9')?.turn.text).toBe('the cap is low');
  });

  test('a step the runtime refuses for the matter policy carries its sentence', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'matter-stays-local', message: 'This matter stays on this machine.' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    streams.open('t-1', 'Ask.');
    await streams.run('t-1', 'Ask.', 'cloud/model');
    const ended = streams.streamOf('t-1')!;
    expect(ended.status).toBe('error');
    expect(ended.refused).toBe(true);
    expect(ended.error).toBe('This matter stays on this machine.');
  });

  test('a step that fails keeps the error on the turn as well as on the entry', async () => {
    globalThis.fetch = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    streams.open('t-1', 'Ask.');
    await streams.run('t-1', 'Ask.', 'fake/fake');
    const ended = streams.streamOf('t-1')!;
    expect(ended.status).toBe('error');
    expect(ended.error).not.toBeNull();
    expect(ended.turn.status).toBe('error');
  });

  test('running a thread with no entry does nothing at all', async () => {
    await streams.run('t-nope', 'Ask.', 'fake/fake');
    expect(streams.streamOf('t-nope')).toBeNull();
  });
});
