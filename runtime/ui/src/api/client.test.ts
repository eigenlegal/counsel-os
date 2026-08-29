import '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ApiError, fetchJson, streamStep } from './client';
import { clearToken, TOKEN_KEY } from './token';
import { onUnauthorized } from './unauthorized';
import type { StreamEvent } from './types';

const realFetch = globalThis.fetch;
let seen: { url: string; init: RequestInit | undefined }[] = [];

/** A response whose body arrives in exactly these chunks, so a frame split
 * across a network read is what the parser actually gets. */
function streaming(chunks: string[], status = 200): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), init });
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    return new Response(body, { status, headers: { 'content-type': 'text/event-stream', 'x-run-id': 'r-1' } });
  }) as unknown as typeof fetch;
}

function responds(status: number, body: unknown): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  seen = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('fetchJson', () => {
  test('sends the bearer token and parses the body', async () => {
    responds(200, { vault: '/tmp/vault' });
    expect(await fetchJson<{ vault: string }>('/health')).toEqual({ vault: '/tmp/vault' });
    expect((seen[0]!.init!.headers as Record<string, string>)['authorization']).toBe('Bearer test-token');
  });

  test('a 204 resolves with nothing rather than failing to parse an empty body', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    expect(await fetchJson<void>('/threads/t-1', { method: 'DELETE' })).toBeUndefined();
  });

  test('a failure carries the status and the parsed body', async () => {
    responds(409, { error: 'vault conflict', conflict: { expected: 'a', actual: 'b' } });
    const err = await fetchJson('/threads/t-1/approve', { method: 'POST', body: '{}' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).body).toEqual({ error: 'vault conflict', conflict: { expected: 'a', actual: 'b' } });
  });

  test('a 401 is reported once, centrally', async () => {
    let reports = 0;
    const off = onUnauthorized(() => { reports += 1; });
    responds(401, { error: 'unauthorized' });
    await fetchJson('/health').catch(() => undefined);
    off();
    expect(reports).toBe(1);
  });
});

describe('streamStep', () => {
  test('delivers each event, including a frame split across two reads', async () => {
    streaming([
      ': typed\n\nevent: text\ndata: {"type":"text","text":"Hel',
      'lo","runId":"r-1"}\n\nevent: tool_call\ndata: {"type":"tool_call","id":"c1","name":"vault_read","input":{},"runId":"r-1"}\n\n',
      'event: done\ndata: {"type":"done","output":null,"usage":{"inputTokens":1,"outputTokens":2},"runId":"r-1"}\n\n',
    ]);

    const events: StreamEvent[] = [];
    await streamStep('t-1', { message: 'hi' }, ev => events.push(ev), new AbortController().signal);

    expect(events.map(e => e.type)).toEqual(['text', 'tool_call', 'done']);
    expect((events[0] as { text: string }).text).toBe('Hello');
    expect(events[2]!.runId).toBe('r-1');
    expect(seen[0]!.url).toBe('/threads/t-1/steps');
    expect(seen[0]!.init!.method).toBe('POST');
  });

  test('delivers a final frame the server left without its blank line', async () => {
    streaming(['event: done\ndata: {"type":"done","output":null,"usage":{"inputTokens":0,"outputTokens":0}}']);
    const events: StreamEvent[] = [];
    await streamStep('t-1', { message: 'hi' }, ev => events.push(ev), new AbortController().signal);
    expect(events.map(e => e.type)).toEqual(['done']);
  });

  test('skips an unparsable frame instead of losing the rest of the stream', async () => {
    streaming(['event: text\ndata: {oops\n\nevent: done\ndata: {"type":"done","output":null,"usage":{"inputTokens":0,"outputTokens":0}}\n\n']);
    const events: StreamEvent[] = [];
    await streamStep('t-1', { message: 'hi' }, ev => events.push(ev), new AbortController().signal);
    expect(events.map(e => e.type)).toEqual(['done']);
  });

  test('rejects with the status when the step never started', async () => {
    responds(422, { error: 'unknown provider: nope' });
    const err = await streamStep('t-1', { message: 'hi', provider: 'nope' }, () => {}, new AbortController().signal).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
  });
});
