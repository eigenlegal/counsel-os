import { describe, expect, test } from 'bun:test';
import type { StepEvent } from '../core/types';
import { NO_TERMINAL_EVENT, sseFromEvents } from './sse';

type Ev = StepEvent & { runId?: string };

interface Frame {
  event: string;
  data: Record<string, unknown>;
}

/** Parses an SSE body back into frames. Deliberately dumb: the point is to
 * assert the wire format this module promises, not to re-use its encoder. */
function parseSse(text: string): Frame[] {
  return text
    .split('\n\n')
    .filter(block => block.trim() !== '')
    .map(block => {
      const lines = block.split('\n');
      const eventLine = lines.find(l => l.startsWith('event: '));
      if (!eventLine) throw new Error(`frame has no event line: ${block}`);
      const data = lines
        .filter(l => l.startsWith('data: '))
        .map(l => l.slice('data: '.length))
        .join('\n');
      return { event: eventLine.slice('event: '.length), data: JSON.parse(data) as Record<string, unknown> };
    });
}

async function* from(events: Ev[]): AsyncIterable<Ev> {
  for (const ev of events) yield ev;
}

async function frames(res: Response): Promise<Frame[]> {
  return parseSse(await res.text());
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('sseFromEvents', () => {
  test('coalesces adjacent text deltas and flushes them before any other event', async () => {
    const res = await sseFromEvents(
      from([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
        { type: 'tool_call', id: 't1', name: 'vault_read', input: { path: 'x.md' } },
        { type: 'text', text: 'c' },
        { type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 2 } },
      ]),
      { coalesceMs: 0 },
    );

    const got = await frames(res);
    expect(got.map(f => f.event)).toEqual(['text', 'tool_call', 'text', 'done']);
    expect(got[0]!.data['text']).toBe('ab');
    expect(got[2]!.data['text']).toBe('c');
    expect(got[1]!.data['name']).toBe('vault_read');
  });

  test('is a text/event-stream carrying the first event\'s runId', async () => {
    const res = await sseFromEvents(
      from([
        { type: 'text', text: 'hi', runId: 'run-1' },
        { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 }, runId: 'run-1' },
      ]),
      { coalesceMs: 0 },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('x-run-id')).toBe('run-1');
    expect((await frames(res)).map(f => f.event)).toEqual(['text', 'done']);
  });

  test('flushes on the size bound', async () => {
    const res = await sseFromEvents(
      from([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
        { type: 'text', text: 'c' },
        { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } },
      ]),
      { coalesceMs: 0, maxChars: 2 },
    );

    const got = await frames(res);
    expect(got.map(f => f.event)).toEqual(['text', 'text', 'done']);
    expect(got[0]!.data['text']).toBe('ab');
    expect(got[1]!.data['text']).toBe('c');
  });

  test('flushes on the max-latency timer, without waiting for the source to finish', async () => {
    async function* slow(): AsyncIterable<Ev> {
      yield { type: 'text', text: 'a' };
      await sleep(60);
      yield { type: 'text', text: 'b' };
      yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const got = await frames(await sseFromEvents(slow(), { coalesceMs: 10 }));
    expect(got.map(f => f.event)).toEqual(['text', 'text', 'done']);
    expect(got[0]!.data['text']).toBe('a');
    expect(got[1]!.data['text']).toBe('b');
  });

  test('a source that ends without a terminal event still ends with error', async () => {
    const got = await frames(
      await sseFromEvents(from([{ type: 'text', text: 'half a sentence' }]), { coalesceMs: 0 }),
    );

    expect(got.map(f => f.event)).toEqual(['text', 'error']);
    expect(got.at(-1)!.data['message']).toBe(NO_TERMINAL_EVENT);
  });

  test('a source that throws mid-stream ends with error, buffered text first', async () => {
    async function* boom(): AsyncIterable<Ev> {
      yield { type: 'text', text: 'partial' };
      throw new Error('provider exploded');
    }

    const got = await frames(await sseFromEvents(boom(), { coalesceMs: 0 }));
    expect(got.map(f => f.event)).toEqual(['text', 'error']);
    expect(got[0]!.data['text']).toBe('partial');
    expect(got[1]!.data['message']).toBe('provider exploded');
  });

  test('a source that throws before its first event still yields a terminal error', async () => {
    async function* boom(): AsyncIterable<Ev> {
      throw new Error('could not start');
      yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const got = await frames(await sseFromEvents(boom(), { coalesceMs: 0 }));
    expect(got.map(f => f.event)).toEqual(['error']);
    expect(got[0]!.data['message']).toBe('could not start');
  });

  test('an empty source ends with error', async () => {
    const got = await frames(await sseFromEvents(from([]), { coalesceMs: 0 }));
    expect(got.map(f => f.event)).toEqual(['error']);
  });

  test('a preamble goes out once, before the first frame', async () => {
    const res = await sseFromEvents(
      from([
        { type: 'text', text: 'a' },
        { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } },
      ]),
      { coalesceMs: 0, preamble: ': typed\n\n' },
    );

    const body = await res.text();
    expect(body.startsWith(': typed\n\n')).toBe(true);
    // An SSE comment is not a frame: the events after it are untouched.
    expect(parseSse(body.slice(': typed\n\n'.length)).map(f => f.event)).toEqual(['text', 'done']);
  });

  test('a preamble is written even when the source starts by throwing', async () => {
    async function* boom(): AsyncIterable<Ev> {
      throw new Error('could not start');
      yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const body = await (await sseFromEvents(boom(), { coalesceMs: 0, preamble: ': typed\n\n' })).text();
    expect(body.startsWith(': typed\n\n')).toBe(true);
    expect(parseSse(body.slice(': typed\n\n'.length)).map(f => f.event)).toEqual(['error']);
  });
});
