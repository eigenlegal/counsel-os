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
