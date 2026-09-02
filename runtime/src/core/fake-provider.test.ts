import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { FakeModelProvider } from './fake-provider';
import type { StepEvent, ToolDef } from './types';

const echo: ToolDef<{ s: string }, string> = {
  name: 'echo',
  description: 'echo',
  inputSchema: z.object({ s: z.string() }),
  execute: async ({ s }) => `echo:${s}`,
};

async function collect(it: AsyncIterable<StepEvent>) {
  const out: StepEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe('FakeModelProvider', () => {
  test('runs scripted tool calls against real tools and finishes with done', async () => {
    const p = new FakeModelProvider([{ toolCalls: [{ name: 'echo', input: { s: 'x' } }], text: 'ok', output: { a: 1 } }]);
    const events = await collect(p.run({ tenant: 'default', system: '', messages: [], tools: [echo] }));
    expect(events.map(e => e.type)).toEqual(['tool_call', 'tool_result', 'text', 'done']);
    expect((events[1] as any).output).toBe('echo:x');
    expect((events[3] as any).output).toEqual({ a: 1 });
  });

  test('unknown tool yields an error tool_result, not a throw', async () => {
    const p = new FakeModelProvider([{ toolCalls: [{ name: 'nope', input: {} }] }]);
    const events = await collect(p.run({ tenant: 'default', system: '', messages: [], tools: [] }));
    expect((events[1] as any).isError).toBe(true);
  });

  test('invalid input yields an error tool_result, not a throw', async () => {
    const p = new FakeModelProvider([{ toolCalls: [{ name: 'echo', input: { s: 123 } }] }]);
    const events = await collect(p.run({ tenant: 'default', system: '', messages: [], tools: [echo] }));
    expect((events[1] as any).isError).toBe(true);
    expect(String((events[1] as any).output)).toMatch(/invalid input/);
  });
});

test('a scripted step can be made to take time, so one can be caught in flight', async () => {
  // `--fake` answers instantly, which makes a streaming UI impossible to
  // watch: two conversations overlapping, a Stop with something to stop.
  const provider = new FakeModelProvider([{ text: 'slow', delayMs: 40 }]);
  const t0 = performance.now();
  const events: string[] = [];
  for await (const ev of provider.run({ system: '', messages: [{ role: 'user', content: 'go' }], tools: [], tenant: 'default' } as never)) {
    events.push(ev.type);
  }
  expect(performance.now() - t0).toBeGreaterThanOrEqual(35);
  expect(events).toContain('text');
  expect(events.at(-1)).toBe('done');
});

