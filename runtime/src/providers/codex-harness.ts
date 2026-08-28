import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { z, type ZodType } from 'zod';
import { Codex, type CodexOptions, type ThreadOptions } from '@openai/codex-sdk';
import type { Capabilities, ModelProvider, StepEvent, StepRequest, Tenant } from '../core/types';

const STDIO_SERVER = resolve(import.meta.dir, '../mcp/stdio.ts');

type AnyEv = { type: string; [k: string]: unknown };

/**
 * Pure event mapper, extracted so it's testable without a live Codex run.
 * Field names verified against the installed SDK (@openai/codex-sdk 0.150.1,
 * node_modules/@openai/codex-sdk/dist/index.d.ts):
 *
 * - ItemCompletedEvent (index.d.ts:153-156) wraps a ThreadItem union
 *   (index.d.ts:104). AgentMessageItem (65-70) has `text`; McpToolCallItem
 *   (42-63) has `id`/`server`/`tool`/`arguments`, `result?.content` (only
 *   "for successful calls" per its doc comment) OR `error?.message` (for
 *   failed calls), and `status`.
 * - TurnCompletedEvent (132-136) carries `usage: Usage` with `input_tokens`/
 *   `output_tokens` (120-131) — matches the brief's fixture as written.
 * - TurnFailedEvent (137-141) carries `error: ThreadError` = `{ message }`
 *   (158-160). The brief's design notes treat `error` (the *event type*,
 *   161-165: `ThreadErrorEvent = { type: "error", message: string }`) the
 *   same way, but that event has no nested `.error` — its message is a
 *   top-level field. Handled separately below; see codex-harness.test.ts's
 *   "top-level error event" case.
 */
export function mapCodexEvent(raw: unknown, outputSchema?: ZodType<unknown>, finalResponse?: string): StepEvent[] {
  const ev = raw as AnyEv;

  if (ev.type === 'item.completed') {
    const item = ev.item as Record<string, unknown>;
    if (item.type === 'agent_message') return [{ type: 'text', text: String(item.text ?? '') }];
    if (item.type === 'mcp_tool_call') {
      const id = String(item.id);
      const name = String(item.tool);
      const result = item.result as { content?: Array<{ type: string; text?: string }> } | undefined;
      const error = item.error as { message?: string } | undefined;
      const isError = item.status === 'failed';
      let output: unknown;
      if (result?.content) {
        const text = result.content.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
        output = text || result;
      } else {
        output = error?.message ?? '';
      }
      return [
        { type: 'tool_call', id, name, input: item.arguments },
        { type: 'tool_result', id, name, output, isError },
      ];
    }
    // reasoning / command_execution / file_change / web_search / todo_list /
    // item-level error: no StepEvent equivalent, ignored (mirrors the Claude
    // harness's handling of unrecognized content blocks).
    return [];
  }

  if (ev.type === 'turn.completed') {
    const usage = (ev.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    const u = { inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0 };
    if (!outputSchema) return [{ type: 'done', output: finalResponse ?? null, usage: u }];
    let json: unknown;
    try {
      json = JSON.parse(finalResponse ?? '');
    } catch {
      return [{ type: 'error', message: 'structured output was not JSON' }];
    }
    const parsed = outputSchema.safeParse(json);
    if (!parsed.success) return [{ type: 'error', message: `structured output failed validation: ${parsed.error.message}` }];
    return [{ type: 'done', output: parsed.data, usage: u }];
  }

  if (ev.type === 'turn.failed') {
    const e = ev.error as { message?: string } | undefined;
    return [{ type: 'error', message: `codex harness: ${e?.message ?? 'turn failed'}` }];
  }

  if (ev.type === 'error') {
    // ThreadErrorEvent (index.d.ts:161-165): `message` is a top-level field
    // on the event itself, not nested under `.error`.
    return [{ type: 'error', message: `codex harness: ${String(ev.message ?? 'error')}` }];
  }

  return [];
}

/**
 * Pure builder for the per-thread options, extracted so the sandbox
 * restriction has direct test coverage without a live model call.
 *
 * `sandboxMode: 'read-only'` maps to the CLI's `-s/--sandbox` flag
 * (dist/index.js:200-202: `commandArgs.push("--sandbox", args.sandboxMode)`),
 * documented by `codex exec --help` as "Select the sandbox policy to use
 * when *executing model-generated shell commands*" — i.e. it sandboxes an
 * always-present shell tool (blocks writes; per `codex sandbox --help` this
 * is a real OS-level sandbox — seatbelt/landlock, not just a policy hint),
 * it does not remove the tool. That distinction is the Task 8 lesson
 * repeated here: see `buildCodexConfig`'s `features.shell_tool = false`,
 * which is the mechanism that actually satisfies "no shell".
 *
 * `workingDirectory` + `skipGitRepoCheck: true` (index.d.ts:251-252) keep
 * project files out of reach of whatever filesystem access remains,
 * matching the SDK README's own documented use of `skipGitRepoCheck`
 * ("To avoid unrecoverable errors, Codex requires the working directory to
 * be a Git repository. You can skip the Git repository check...").
 */
export function buildThreadOptions(model: string, cwd: string): ThreadOptions {
  return {
    model,
    sandboxMode: 'read-only',
    workingDirectory: cwd,
    skipGitRepoCheck: true,
  };
}

/**
 * Pure builder for the `Codex` client's constructor options.
 *
 * `mcp_servers` is not a first-class `CodexOptions` field — the SDK's only
 * MCP surface is the generic `config` passthrough (index.d.ts:222-229:
 * "Additional `--config key=value` overrides... flatten[ed]... into dotted
 * paths"). Verified mechanically in dist/index.js:316-349
 * (`flattenConfigOverrides`): `{ mcp_servers: { counsel: { command, args,
 * env } } }` flattens to `--config mcp_servers.counsel.command="bun"`,
 * `--config mcp_servers.counsel.args=[...]`, `--config
 * mcp_servers.counsel.env.COUNSEL_VAULT="..."` — the standard
 * `[mcp_servers.<name>]` table shape Codex CLI's own config.toml uses for
 * external MCP servers (`codex mcp --help`: "Manage external MCP servers
 * for Codex").
 *
 * `features.shell_tool = false` disables the model's shell tool outright.
 * Found via `codex features list` (bundled `@openai/codex` binary,
 * 0.150.1): `shell_tool  stable  true` (enabled by default). `codex
 * --help`'s `--disable <FEATURE>` documents the mechanism as "Equivalent to
 * `-c features.<name>=false`" — the same generic `config` flattening path
 * used above, so passing it through `config` disables it identically.
 * Without this, `sandboxMode: 'read-only'` alone leaves the shell tool
 * present (just write-restricted), which does not satisfy this harness's
 * "no shell" requirement — that gap is documented in `buildThreadOptions`'s
 * comment. `apply_patch`-style file edits run through the same shell
 * mechanism in Codex, so this also covers file writes attempted through it;
 * writes reach the vault only through our own `vault_write` MCP tool.
 */
export function buildCodexConfig(opts: { vaultRoot: string; tenant: Tenant }): CodexOptions {
  return {
    config: {
      mcp_servers: {
        counsel: {
          command: 'bun',
          args: [STDIO_SERVER],
          env: { COUNSEL_VAULT: opts.vaultRoot, COUNSEL_TENANT: opts.tenant },
        },
      },
      features: {
        shell_tool: false,
      },
    },
  };
}

export class CodexHarnessProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'harness' as const;
  readonly capabilities: Capabilities = { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' };

  constructor(private readonly opts: { model: string; vaultRoot: string; id?: string }) {
    this.id = opts.id ?? `codex-sub/${opts.model}`;
  }

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const codex = new Codex(buildCodexConfig({ vaultRoot: this.opts.vaultRoot, tenant: req.tenant }));
    const cwd = mkdtempSync(join(tmpdir(), 'counsel-cwd-'));
    const thread = codex.startThread(buildThreadOptions(this.opts.model, cwd));

    const transcript = req.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    const prompt = `${req.system}\n\n${transcript}`;
    const { events } = await thread.runStreamed(prompt, req.outputSchema ? { outputSchema: z.toJSONSchema(req.outputSchema) } : {});

    let lastText = '';
    for await (const ev of events) {
      const e = ev as AnyEv;
      if (e.type === 'item.completed' && (e.item as { type?: string })?.type === 'agent_message') {
        lastText = String((e.item as { text?: string }).text ?? '');
      }
      for (const out of mapCodexEvent(ev, req.outputSchema, lastText)) yield out;
    }
  }
}
