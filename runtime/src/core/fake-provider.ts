import type { Capabilities, ModelProvider, StepEvent, StepRequest, ToolDef, Usage } from './types';

export interface FakeScript {
  toolCalls?: Array<{ name: string; input: unknown }>;
  /** Emitted before anything else, as a `session` event. */
  session?: string;
  text?: string;
  output?: unknown;
  usage?: Usage;
  /** When set, the step ends with this `error` instead of a `done`. */
  error?: string;
  /** Milliseconds to wait before the answer, so a step can be observed in
   * flight — two conversations overlapping, a Stop that has something to
   * stop. Absent (and in every test) the answer is immediate. */
  delayMs?: number;
}

export async function runToolDef(tools: ToolDef[], name: string, input: unknown, tenant: string):
  Promise<{ output: unknown; isError: boolean }> {
  const tool = tools.find(t => t.name === name);
  if (!tool) return { output: `unknown tool: ${name}`, isError: true };
  const parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) return { output: `invalid input for ${name}: ${parsed.error.message}`, isError: true };
  try {
    return { output: await tool.execute(parsed.data, { tenant }), isError: false };
  } catch (err) {
    return { output: err instanceof Error ? err.message : String(err), isError: true };
  }
}

export class FakeModelProvider implements ModelProvider {
  readonly id = 'fake/fake';
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities = { tools: true, caching: false, thinking: false, contextTokens: 1_000_000, auth: 'local' };
  private calls = 0;

  /** The most recent `StepRequest` this provider was handed — the seam tests
   * use to assert what the caller assembled (system prompt, tools, messages,
   * `session`) without a live model call. */
  lastRequest?: StepRequest;

  constructor(private readonly script: FakeScript[]) {}

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    this.lastRequest = req;
    const s = this.script[this.calls++] ?? {};
    let n = 0;
    if (s.session) yield { type: 'session', id: s.session };
    for (const call of s.toolCalls ?? []) {
      const id = `fake-${this.calls}-${n++}`;
      yield { type: 'tool_call', id, name: call.name, input: call.input };
      const r = await runToolDef(req.tools, call.name, call.input, req.tenant);
      yield { type: 'tool_result', id, name: call.name, output: r.output, isError: r.isError };
    }
    if (s.delayMs !== undefined && s.delayMs > 0) await new Promise(resolve => setTimeout(resolve, s.delayMs));
    if (s.text) yield { type: 'text', text: s.text };
    if (s.error) {
      yield { type: 'error', message: s.error };
      return;
    }
    yield { type: 'done', output: s.output ?? null, usage: s.usage ?? { inputTokens: 0, outputTokens: 0 } };
  }
}
