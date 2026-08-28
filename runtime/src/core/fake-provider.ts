import type { Capabilities, ModelProvider, StepEvent, StepRequest, ToolDef } from './types';

export interface FakeScript {
  toolCalls?: Array<{ name: string; input: unknown }>;
  text?: string;
  output?: unknown;
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

  constructor(private readonly script: FakeScript[]) {}

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const s = this.script[this.calls++] ?? {};
    let n = 0;
    for (const call of s.toolCalls ?? []) {
      const id = `fake-${this.calls}-${n++}`;
      yield { type: 'tool_call', id, name: call.name, input: call.input };
      const r = await runToolDef(req.tools, call.name, call.input, req.tenant);
      yield { type: 'tool_result', id, name: call.name, output: r.output, isError: r.isError };
    }
    if (s.text) yield { type: 'text', text: s.text };
    yield { type: 'done', output: s.output ?? null, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
