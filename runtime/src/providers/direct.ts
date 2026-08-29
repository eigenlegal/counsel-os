import { Output, stepCountIs, streamText, tool, type LanguageModel } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { ollama } from 'ai-sdk-ollama';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { runToolDef } from '../core/fake-provider';

export class DirectProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities;
  private readonly model: LanguageModel;

  constructor(opts: { id: string; model: LanguageModel; capabilities: Capabilities }) {
    this.id = opts.id;
    this.model = opts.model;
    this.capabilities = opts.capabilities;
  }

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const tools = Object.fromEntries(req.tools.map(t => [
      t.name,
      tool({
        description: t.description,
        inputSchema: t.inputSchema,
        execute: async (input: unknown) => runToolDef(req.tools, t.name, input, req.tenant),
      }),
    ]));

    const result = streamText({
      model: this.model,
      system: req.system,
      messages: req.messages,
      tools,
      stopWhen: stepCountIs(req.maxToolCalls ?? 20),
      ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
      ...(req.outputSchema ? { output: Output.object({ schema: req.outputSchema }) } : {}),
    });

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          yield { type: 'text', text: part.text };
          break;
        case 'tool-call':
          yield { type: 'tool_call', id: part.toolCallId, name: part.toolName, input: part.input };
          break;
        case 'tool-result': {
          const r = part.output as { output: unknown; isError: boolean };
          yield { type: 'tool_result', id: part.toolCallId, name: part.toolName, output: r.output, isError: r.isError };
          break;
        }
        case 'tool-error':
          // Invalid tool arguments or an unknown tool name: the SDK enqueues
          // `tool-call` then `tool-error` without ever calling `execute`
          // (node_modules/ai/dist/index.js ~8874-8894), so without this case
          // consumers would see an orphaned `tool_call` with no matching
          // result. Surface it as a failed tool_result instead, same shape
          // `runToolDef` uses for its own failures, so the model sees it as
          // data it can react to.
          yield { type: 'tool_result', id: part.toolCallId, name: part.toolName, output: part.error instanceof Error ? part.error.message : String(part.error), isError: true };
          break;
        case 'error':
          yield { type: 'error', message: String(part.error) };
          return;
        case 'finish': {
          const usage = part.totalUsage;
          try {
            const output = req.outputSchema ? await result.output : await result.text;
            yield { type: 'done', output, usage: { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 } };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            yield { type: 'error', message: `structured output failed validation: ${msg}` };
            return;
          }
          break;
        }
        default:
          break;
      }
    }
  }
}

const CAPS: Record<string, Capabilities> = {
  anthropic: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'apikey' },
  openai:    { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'apikey' },
  ollama:    { tools: true, caching: false, thinking: false, contextTokens: 32_000, auth: 'local' },
  'openai-compatible': { tools: true, caching: false, thinking: false, contextTokens: 32_000, auth: 'apikey' },
};

export function directProviderFromId(
  id: string,
  reg: { baseURL?: string; apiKey?: string; capabilities?: Partial<Capabilities> } = {},
): DirectProvider {
  const [vendor, ...rest] = id.split('/');
  const name = rest.join('/');
  const caps = CAPS[vendor ?? ''];
  if (!caps || !name) throw new Error(`unknown provider: ${id}`);
  let model: LanguageModel;
  if (vendor === 'anthropic') {
    model = anthropic(name);
  } else if (vendor === 'openai') {
    model = openai(name);
  } else if (vendor === 'openai-compatible') {
    if (!reg.baseURL) throw new Error(`unknown provider: openai-compatible requires baseURL for ${id}`);
    model = createOpenAICompatible({ name, baseURL: reg.baseURL, apiKey: reg.apiKey })(name);
  } else {
    model = ollama(name);
  }
  const capabilities = { ...caps, ...reg.capabilities };
  return new DirectProvider({ id, model, capabilities });
}
