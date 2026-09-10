// Pure protocol mapping, shared without importing or redistributing the Agent SDK.
import type { ZodType } from 'zod';
import type { StepEvent } from '../core/types';
const MCP_PREFIX = 'mcp__counsel__';
type AnyMsg = { type: string; [k: string]: unknown };

export function mapClaudeMessage(raw: unknown, outputSchema?: ZodType<unknown>, toolNames?: Map<string, string>): StepEvent[] {
  const msg = raw as AnyMsg;
  const out: StepEvent[] = [];
  if (msg.type === 'system' && msg.subtype === 'init' && typeof msg.session_id === 'string') {
    return [{ type: 'session', id: msg.session_id }];
  }
  if (msg.type === 'assistant' || msg.type === 'user') {
    const content = ((msg.message as { content?: unknown[] })?.content ?? []) as Array<Record<string, unknown>>;
    for (const block of content) {
      if (block.type === 'text' && typeof block.text === 'string') out.push({ type: 'text', text: block.text });
      else if (block.type === 'tool_use') {
        const name = String(block.name);
        const mapped = name.startsWith(MCP_PREFIX) ? name.slice(MCP_PREFIX.length) : name;
        toolNames?.set(String(block.id), mapped);
        out.push({ type: 'tool_call', id: String(block.id), name: mapped, input: block.input });
      } else if (block.type === 'tool_result') {
        const parts = Array.isArray(block.content) ? block.content as Array<{ type: string; text?: string }> : [];
        const text = parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
        // The SDK's tool_result block carries no tool name — only the
        // `tool_use_id`. The paired call's name (recorded above, in an
        // earlier message of the same run) fills it, so consumers never see
        // a nameless result (cou-78 / cou-93 item 2).
        const id = String(block.tool_use_id);
        out.push({ type: 'tool_result', id, name: toolNames?.get(id) ?? '', output: text || block.content, isError: Boolean(block.is_error) });
      }
    }
    return out;
  }
  if (msg.type === 'result') {
    const usage = (msg.usage ?? {}) as { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
    // The harness caches the prompt, so `input_tokens` alone counts only the
    // uncached remainder and under-reports by orders of magnitude: spike 9.3-B
    // saw input_tokens 4 against cache_read 1195 + cache_creation 1316. Every
    // budget, quota, and context-pressure check reads this number, so it has
    // to be the whole input.
    const inputTokens = (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
    const u = { inputTokens, outputTokens: usage.output_tokens ?? 0, ...(typeof msg.total_cost_usd === 'number' ? { costUsd: msg.total_cost_usd } : {}) };
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
      if (!parsed.success) {
        // `msg.result` is the turn's raw text. The typed request was not
        // honored — so this stays an error — but the answer the model DID
        // give rides along for the caller to show (web-ui spec §4.3).
        const raw = typeof msg.result === 'string' && msg.result !== '' ? msg.result : undefined;
        return [{ type: 'error', message: `structured output failed validation: ${parsed.error.message}`, ...(raw === undefined ? {} : { text: raw }) }];
      }
      return [{ type: 'done', output: parsed.data, usage: u }];
    }
    return [{ type: 'done', output: typeof msg.result === 'string' ? msg.result : null, usage: u }];
  }
  return out;
}
