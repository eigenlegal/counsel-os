import { describe, expect, test } from 'bun:test';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { z } from 'zod';
import { DirectProvider } from './direct';
import type { StepEvent, ToolDef } from '../core/types';

async function collect(it: AsyncIterable<StepEvent>) {
  const out: StepEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

// The installed ai@7.0.83 / @ai-sdk/provider represents `finishReason` and
// `usage` on raw LanguageModelV3 stream chunks differently than the 7.x docs
// snippet in the task brief (a flat `finishReason: 'stop'` string and a flat
// `{inputTokens, outputTokens, totalTokens}` usage object). The installed
// `LanguageModelV3FinishReason` type (node_modules/@ai-sdk/provider/dist/index.d.ts:3627)
// is `{ unified: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other'; raw: string | undefined }`,
// and `LanguageModelV3Usage` (same file, line 3665) nests token counts as
// `{ inputTokens: { total, noCache, cacheRead, cacheWrite }, outputTokens: { total, text, reasoning } }`.
// These two helpers build chunks in the shape the installed SDK actually
// expects; the mapper in `direct.ts` itself is unaffected because the
// *public* `TextStreamPart` `finish`/`text-delta`/`tool-call`/`tool-result`
// shapes (node_modules/ai/dist/index.d.ts:2966-2986) match the brief exactly
// — streamText flattens the raw provider shapes back down before they reach
// `fullStream`.
function finishReason(unified: 'stop' | 'tool-calls') {
  return { unified, raw: undefined };
}
function usage(inputTotal: number, outputTotal: number) {
  return {
    inputTokens: { total: inputTotal, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: outputTotal, text: undefined, reasoning: undefined },
  };
}

describe('DirectProvider', () => {
  test('streams text and finishes with done + usage', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: '1' },
            { type: 'text-delta', id: '1', delta: 'hello' },
            { type: 'text-end', id: '1' },
            { type: 'finish', finishReason: finishReason('stop'), usage: usage(5, 2) },
          ],
        }),
      }),
    });
    const p = new DirectProvider({ id: 'mock/m', model, capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'apikey' } });
    const events = await collect(p.run({ tenant: 'default', system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [] }));
    expect(events.filter(e => e.type === 'text').map(e => (e as any).text).join('')).toBe('hello');
    const done = events.at(-1) as any;
    expect(done.type).toBe('done');
    expect(done.usage).toEqual({ inputTokens: 5, outputTokens: 2 });
  });

  test('maps a tool call to a real ToolDef and returns tool_call/tool_result events', async () => {
    const echoTool: ToolDef<{ msg: string }, { echoed: string }> = {
      name: 'echo',
      description: 'echoes the input message',
      inputSchema: z.object({ msg: z.string() }),
      async execute(input) {
        return { echoed: input.msg };
      },
    };

    // Two-step script: step 1 calls the tool (finishReason 'tool-calls', so
    // the SDK's own tool-execution loop runs `echoTool.execute` and appends
    // a tool-result to the stream), step 2 replies with text and finishes
    // with 'stop' so the loop actually terminates instead of looping until
    // `stepCountIs(20)` (a real model would see the tool-result and stop on
    // its own; the mock has to be told to, in two scripted calls).
    let call = 0;
    const model = new MockLanguageModelV3({
      doStream: async () => {
        call += 1;
        if (call === 1) {
          return {
            stream: simulateReadableStream({
              chunks: [
                { type: 'tool-input-start', id: 'call-1', toolName: 'echo' },
                { type: 'tool-input-delta', id: 'call-1', delta: '{"msg":"hi"}' },
                { type: 'tool-input-end', id: 'call-1' },
                { type: 'tool-call', toolCallId: 'call-1', toolName: 'echo', input: JSON.stringify({ msg: 'hi' }) },
                { type: 'finish', finishReason: finishReason('tool-calls'), usage: usage(3, 1) },
              ],
            }),
          };
        }
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: '2' },
              { type: 'text-delta', id: '2', delta: 'echoed hi' },
              { type: 'text-end', id: '2' },
              { type: 'finish', finishReason: finishReason('stop'), usage: usage(4, 2) },
            ],
          }),
        };
      },
    });

    const p = new DirectProvider({
      id: 'mock/tool',
      model,
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'apikey' },
    });
    const events = await collect(
      p.run({ tenant: 'default', system: 's', messages: [{ role: 'user', content: 'echo hi' }], tools: [echoTool] })
    );

    const toolCall = events.find(e => e.type === 'tool_call') as any;
    expect(toolCall).toBeDefined();
    expect(toolCall.name).toBe('echo');
    expect(toolCall.input).toEqual({ msg: 'hi' });

    const result = events.find(e => e.type === 'tool_result') as any;
    expect(result).toBeDefined();
    expect(result.name).toBe('echo');
    expect(result.isError).toBe(false);
    expect(result.output).toEqual({ echoed: 'hi' });

    const done = events.at(-1) as any;
    expect(done.type).toBe('done');
  });

  test('with outputSchema set, done.output is the parsed structured object', async () => {
    const schema = z.object({ answer: z.string() });

    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: '1' },
            { type: 'text-delta', id: '1', delta: '{"answer":"42"}' },
            { type: 'text-end', id: '1' },
            { type: 'finish', finishReason: finishReason('stop'), usage: usage(4, 3) },
          ],
        }),
      }),
    });

    const p = new DirectProvider({
      id: 'mock/structured',
      model,
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'apikey' },
    });
    const events = await collect(
      p.run({ tenant: 'default', system: 's', messages: [{ role: 'user', content: 'what is the answer' }], tools: [], outputSchema: schema })
    );

    const done = events.at(-1) as any;
    expect(done.type).toBe('done');
    expect(done.output).toEqual({ answer: '42' });
  });

  test('invalid tool input maps tool-error to a failed tool_result (no orphaned tool_call)', async () => {
    const echoTool: ToolDef<{ msg: string }, { echoed: string }> = {
      name: 'echo',
      description: 'echoes the input message',
      inputSchema: z.object({ msg: z.string() }),
      async execute(input) {
        return { echoed: input.msg };
      },
    };

    // Step 1: the model sends input that fails `echo`'s zod schema ({ s: 123 }
    // instead of { msg: string }). The AI SDK never calls `execute` for this —
    // it enqueues `tool-call` (marked `invalid: true`) then a `tool-error` part
    // (node_modules/ai/dist/index.js ~8874-8894). Step 2 recovers with text and
    // `finishReason: 'stop'` so the loop terminates.
    let call = 0;
    const model = new MockLanguageModelV3({
      doStream: async () => {
        call += 1;
        if (call === 1) {
          return {
            stream: simulateReadableStream({
              chunks: [
                { type: 'tool-call', toolCallId: 'call-1', toolName: 'echo', input: JSON.stringify({ s: 123 }) },
                { type: 'finish', finishReason: finishReason('tool-calls'), usage: usage(3, 1) },
              ],
            }),
          };
        }
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: '2' },
              { type: 'text-delta', id: '2', delta: 'sorry, bad input' },
              { type: 'text-end', id: '2' },
              { type: 'finish', finishReason: finishReason('stop'), usage: usage(4, 2) },
            ],
          }),
        };
      },
    });

    const p = new DirectProvider({
      id: 'mock/tool-error',
      model,
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'apikey' },
    });
    const events = await collect(
      p.run({ tenant: 'default', system: 's', messages: [{ role: 'user', content: 'echo something' }], tools: [echoTool] })
    );

    const toolCall = events.find(e => e.type === 'tool_call') as any;
    expect(toolCall).toBeDefined();
    expect(toolCall.id).toBe('call-1');

    const result = events.find(e => e.type === 'tool_result' && (e as any).id === 'call-1') as any;
    expect(result).toBeDefined();
    expect(result.isError).toBe(true);
    expect(typeof result.output).toBe('string');

    const done = events.at(-1) as any;
    expect(done.type).toBe('done');
  });

  test('structured-output parse failure yields an error event instead of throwing', async () => {
    const schema = z.object({ a: z.number() });

    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: '1' },
            { type: 'text-delta', id: '1', delta: '{"a":"no"}' },
            { type: 'text-end', id: '1' },
            { type: 'finish', finishReason: finishReason('stop'), usage: usage(4, 3) },
          ],
        }),
      }),
    });

    const p = new DirectProvider({
      id: 'mock/bad-structured',
      model,
      capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'apikey' },
    });

    // `run()` must not throw: the whole point of the fix is that a rejected
    // `result.output` (schema mismatch) surfaces as a `StepEvent` the caller
    // can see, not an exception that unwinds out of the async generator.
    const events = await collect(
      p.run({ tenant: 'default', system: 's', messages: [{ role: 'user', content: 'give me a' }], tools: [], outputSchema: schema })
    );

    const last = events.at(-1) as any;
    expect(last.type).toBe('error');
    expect(last.message).toContain('structured output failed validation');
  });
});
