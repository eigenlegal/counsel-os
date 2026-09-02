import { Output, stepCountIs, streamText, tool, type LanguageModel } from 'ai';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { runToolDef } from '../core/fake-provider';
import { baseURLFor, localityFor, prefixOf, vendorFor } from './vendors';

export class DirectProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities;
  /** Where the requests go — the entry's base URL, or the vendor's own
   * endpoint when absent. `/settings` reads it for the data-handling line. */
  readonly baseURL: string | undefined;
  private readonly model: LanguageModel;

  constructor(opts: { id: string; model: LanguageModel; capabilities: Capabilities; baseURL?: string }) {
    this.id = opts.id;
    this.model = opts.model;
    this.capabilities = opts.capabilities;
    this.baseURL = opts.baseURL;
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
      // The step's cancellation. Without it an aborted step leaves the HTTP
      // response open and this loop parked on `fullStream` forever.
      ...(req.signal ? { abortSignal: req.signal } : {}),
      ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
      ...(req.outputSchema ? { output: Output.object({ schema: req.outputSchema }) } : {}),
    });

    // The raw answer, kept only so a structured-output failure can hand it
    // back (web-ui spec §4.3). `result.text` is not usable there: awaiting it
    // after `result.output` already rejected gives the same rejection, so the
    // deltas are collected as they stream instead.
    let raw = '';

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          raw += part.text;
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
            yield { type: 'error', message: `structured output failed validation: ${msg}`, ...(raw === '' ? {} : { text: raw }) };
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

/**
 * A direct provider from its id, built through the vendor catalog (spec §3):
 * the vendor's `make` gets the model name, the key the caller resolved, and
 * the base URL, so nothing here reads the environment and nothing names a
 * vendor by hand. The capabilities are the vendor's defaults, refined by the
 * entry, with the locality derived last — an entry cannot claim a cloud
 * endpoint is local.
 */
export function directProviderFromId(
  id: string,
  reg: { baseURL?: string; apiKey?: string; capabilities?: Partial<Capabilities>; extra?: Record<string, string>; secrets?: Record<string, string> } = {},
): DirectProvider {
  const vendor = vendorFor(prefixOf(id));
  const name = id.slice(prefixOf(id).length + 1);
  if (vendor === undefined || vendor.kind !== 'direct' || vendor.make === undefined || name === '') throw new Error(`unknown provider: ${id}`);
  // The entry's base URL, else the preset's; a template with unfilled
  // fields, or the bare shape with none, is refused here.
  const baseURL = baseURLFor(vendor, reg.baseURL === '' ? undefined : reg.baseURL, id);
  // An enterprise vendor's required non-secret fields (a Vertex project, a
  // Bedrock region) are checked here, in words the row can show, rather
  // than left to the SDK's own message about an environment variable.
  for (const f of vendor.fields ?? []) {
    if (f.secret || !f.required) continue;
    if ((reg.extra?.[f.name] ?? '') === '') throw new Error(`${vendor.name}: ${f.label.toLowerCase()} is required on the provider row (${f.name})`);
  }
  const model = vendor.make({
    model: name,
    ...(reg.apiKey === undefined ? {} : { apiKey: reg.apiKey }),
    ...(baseURL === undefined ? {} : { baseURL }),
    ...(reg.extra === undefined ? {} : { extra: reg.extra }),
    ...(reg.secrets === undefined ? {} : { secrets: reg.secrets }),
  });
  const capabilities: Capabilities = { ...vendor.capabilities, auth: vendor.auth, ...reg.capabilities, locality: localityFor(vendor, baseURL) };
  return new DirectProvider({ id, model, capabilities, ...(baseURL === undefined ? {} : { baseURL }) });
}
