import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z, type ZodType } from 'zod';
import { createSdkMcpServer, query, tool, type McpServerConfig, type Options } from '@anthropic-ai/claude-agent-sdk';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { toMcpTools } from '../mcp/bridge';
import { toHarnessJsonSchema } from './schema';

const MCP_PREFIX = 'mcp__counsel__';
const BUILTIN_TOOLS = ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit', 'TodoWrite'];

type AnyMsg = { type: string; [k: string]: unknown };

export function mapClaudeMessage(raw: unknown, outputSchema?: ZodType<unknown>): StepEvent[] {
  const msg = raw as AnyMsg;
  const out: StepEvent[] = [];
  if (msg.type === 'assistant' || msg.type === 'user') {
    const content = ((msg.message as { content?: unknown[] })?.content ?? []) as Array<Record<string, unknown>>;
    for (const block of content) {
      if (block.type === 'text' && typeof block.text === 'string') out.push({ type: 'text', text: block.text });
      else if (block.type === 'tool_use') {
        const name = String(block.name);
        out.push({ type: 'tool_call', id: String(block.id), name: name.startsWith(MCP_PREFIX) ? name.slice(MCP_PREFIX.length) : name, input: block.input });
      } else if (block.type === 'tool_result') {
        const parts = Array.isArray(block.content) ? block.content as Array<{ type: string; text?: string }> : [];
        const text = parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
        out.push({ type: 'tool_result', id: String(block.tool_use_id), name: '', output: text || block.content, isError: Boolean(block.is_error) });
      }
    }
    return out;
  }
  if (msg.type === 'result') {
    const usage = (msg.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    const u = { inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0, ...(typeof msg.total_cost_usd === 'number' ? { costUsd: msg.total_cost_usd } : {}) };
    if (msg.subtype !== 'success') return [{ type: 'error', message: `claude harness: ${String(msg.subtype)}` }];
    // A "success" subtype result can still carry is_error:true (e.g. the turn
    // ended on an API error whose text landed in `result`) — treat that as an
    // error, not a done, per SDKResultSuccess's own `is_error`/`result` fields.
    if (msg.is_error === true) return [{ type: 'error', message: `claude harness: ${String(msg.result ?? msg.subtype)}` }];
    if (outputSchema) {
      // Installed SDK (0.3.250) names this field `structured_output` on
      // SDKResultSuccess (sdk.d.ts:4751), not `output`. Accept either key so
      // the mapper reads real SDK payloads as well as the brief's `output`
      // fixture shape.
      const structuredOutput = 'structured_output' in msg ? msg.structured_output : msg.output;
      const parsed = outputSchema.safeParse(structuredOutput);
      if (!parsed.success) return [{ type: 'error', message: `structured output failed validation: ${parsed.error.message}` }];
      return [{ type: 'done', output: parsed.data, usage: u }];
    }
    return [{ type: 'done', output: typeof msg.result === 'string' ? msg.result : null, usage: u }];
  }
  return out;
}

/**
 * Pure builder for the `query()` options object, extracted so the tool
 * restriction and other safety-relevant settings have direct test coverage
 * without a live model call. `server` is the in-process MCP server instance
 * (typed `unknown` here to avoid this pure function depending on
 * `createSdkMcpServer`'s call site); it's cast to `McpServerConfig` because
 * that's the shape `Options.mcpServers` actually wants.
 */
export function buildQueryOptions(req: StepRequest, model: string, server: unknown, cwd: string): Options {
  return {
    model,
    systemPrompt: req.system,
    mcpServers: { counsel: server as McpServerConfig },
    strictMcpConfig: true,
    // `allowedTools` is an auto-approve list, NOT a restriction — sdk.d.ts:1436-1440
    // ("To restrict which tools are available, use the `tools` option instead").
    // `tools: []` is what actually disables every built-in tool (sdk.d.ts:1487-1499:
    // "`[]` (empty array) - Disable all built-in tools"). `allowedTools` still
    // auto-approves our MCP tools (no interactive prompt) and `disallowedTools`
    // stays as belt-and-braces defense in depth.
    tools: [],
    allowedTools: [`${MCP_PREFIX}*`],
    disallowedTools: BUILTIN_TOOLS,
    // Omitting this loads the operator's `~/.claude/settings.json`, including
    // their hooks, into this session (sdk.d.ts:2047-2052: "When omitted, all
    // sources are loaded"). `[]` disables filesystem settings entirely so the
    // harness's behavior doesn't depend on whatever is on the operator's
    // machine.
    settingSources: [],
    permissionMode: 'bypassPermissions',
    // Required alongside permissionMode: 'bypassPermissions' — sdk.d.ts:1833-1836
    // ("Must be set to `true` when using `permissionMode: 'bypassPermissions'`.
    // This is a safety measure to ensure intentional bypassing of permissions.")
    // Not in the brief's snippet; added because the type's own doc comment
    // says bypassPermissions requires it. Safety still comes from `tools: []`
    // plus the allow/disallow lists above, not from this flag.
    allowDangerouslySkipPermissions: true,
    maxTurns: req.maxToolCalls ?? 20,
    cwd,
    // Never raw `z.toJSONSchema()` — the CLI rejects its `$schema` key
    // outright (spike 9.3-B). See `toHarnessJsonSchema`.
    ...(req.outputSchema ? { outputFormat: { type: 'json_schema' as const, schema: toHarnessJsonSchema(req.outputSchema) } } : {}),
  };
}

export class ClaudeHarnessProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'harness' as const;
  readonly capabilities: Capabilities = { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' };

  constructor(private readonly opts: { model: string; id?: string }) {
    this.id = opts.id ?? `claude-sub/${opts.model}`;
  }

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const specs = toMcpTools(req.tools, req.tenant);
    const sdkTools = specs.map(s => {
      const shape = (s.zodSchema as z.ZodObject<z.ZodRawShape>).shape;
      return tool(s.name, s.description, shape, async (input: unknown) => s.handler(input));
    });
    const server = createSdkMcpServer({ name: 'counsel', version: '0.1.0', tools: sdkTools });
    const prompt = req.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    const cwd = mkdtempSync(join(tmpdir(), 'counsel-cwd-'));

    // `query()` throws on a non-zero CLI exit — e.g. the CLI rejecting the
    // output schema before the turn starts (spike 9.3-B), or not being logged
    // in. Without this the exception propagates out of the async generator:
    // the caller gets a stack trace and ZERO StepEvents, which breaks the
    // "providers report failure as an `error` event, never by throwing"
    // contract every consumer is written against. `CodexHarnessProvider.run`
    // does the same.
    try {
      const stream = query({ prompt, options: buildQueryOptions(req, this.opts.model, server, cwd) });

      for await (const msg of stream) {
        for (const ev of mapClaudeMessage(msg, req.outputSchema)) yield ev;
      }
    } catch (err) {
      yield { type: 'error', message: `claude harness: ${err instanceof Error ? err.message : String(err)}` };
    } finally {
      // One temp cwd per step; without this they accumulate for the life of
      // the process. Also runs when the consumer abandons the generator early.
      rmSync(cwd, { recursive: true, force: true });
    }
  }
}
