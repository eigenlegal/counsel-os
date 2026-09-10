import { mkdtempSync, rmSync } from 'node:fs';
import { locatedCli } from './cli-locate';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { mapClaudeMessage } from './claude-messages';
export { mapClaudeMessage } from './claude-messages';
import { createSdkMcpServer, query, tool, type McpServerConfig, type Options } from '@anthropic-ai/claude-agent-sdk';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { toMcpTools } from '../mcp/bridge';
import { toHarnessJsonSchema } from './schema';
import { transportEnv } from './env';

const MCP_PREFIX = 'mcp__counsel__';
const BUILTIN_TOOLS = ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit', 'TodoWrite'];


/**
 * Bridges the step's `AbortSignal` to the `AbortController` the SDK's
 * `query()` takes (sdk.d.ts:1389-1392 — "Controller for cancelling the
 * query. When aborted, the query will stop and clean up resources"). A
 * `StepRequest` carries a signal because that is what every other tier
 * accepts; only this SDK asks for the controller itself, so one is made here
 * and wired to fire from the signal. A signal that has ALREADY fired aborts
 * the controller immediately — the query must not start.
 */
export function abortControllerFor(signal: AbortSignal | undefined): AbortController | undefined {
  if (!signal) return undefined;
  const controller = new AbortController();
  if (signal.aborted) controller.abort(signal.reason);
  else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  return controller;
}

/**
 * Pure builder for the `query()` options object, extracted so the tool
 * restriction and other safety-relevant settings have direct test coverage
 * without a live model call. `server` is the in-process MCP server instance
 * (typed `unknown` here to avoid this pure function depending on
 * `createSdkMcpServer`'s call site); it's cast to `McpServerConfig` because
 * that's the shape `Options.mcpServers` actually wants.
 */
export function buildQueryOptions(req: StepRequest, model: string, server: unknown, cwd: string, base: NodeJS.ProcessEnv = process.env, claudePath: string | undefined = locatedCli('claude')): Options {
  const abortController = abortControllerFor(req.signal);
  return {
    model,
    // The user's own `claude` CLI (packaging spec §3.4). Without this the
    // SDK resolves its bundled binary through `node_modules`, which the
    // compiled counsel-os binary does not carry; with it, the SDK spawns the
    // path it is given and never looks.
    ...(claudePath === undefined ? {} : { pathToClaudeCodeExecutable: claudePath }),
    // The step's cancellation: an aborted query stops the CLI child process
    // rather than leaving it running with nobody reading it.
    ...(abortController ? { abortController } : {}),
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
    ...(req.session?.id ? { resume: req.session.id } : {}),
    // `env` REPLACES the child CLI process's environment. Pinned to the three
    // variables the CLI needs to run at all: `PATH` (so `bun` and the CLI's
    // own subprocesses resolve), `HOME`, and `USER`. Everything else in
    // `base` is deliberately dropped; in particular an ambient
    // `ANTHROPIC_API_KEY` would silently switch this harness off the
    // subscription login and onto metered API billing. The codex harness pins
    // its child env the same way (`buildCodexEnv`).
    //
    // `USER` is not optional, and the failure mode is not obvious: with only
    // PATH+HOME the CLI reports "Not logged in · Please run /login" even on a
    // live subscription login, because on macOS the credentials live in the
    // Keychain and the lookup is keyed on `USER`, not on `HOME`. Verified by
    // bisection against the CLI directly:
    //   env -i PATH=$PATH HOME=$HOME claude -p "say ok"            → not logged in
    //   env -i PATH=$PATH HOME=$HOME USER=$USER claude -p "say ok" → ok
    // Adding LOGNAME / SHELL / TMPDIR / LANG instead does not help.
    // Plus proxy / CA transport vars when set (see `transportEnv`); never keys.
    env: { PATH: base.PATH ?? '', HOME: base.HOME ?? '', USER: base.USER ?? '', ...transportEnv(base) },
    // Never raw `z.toJSONSchema()` — the CLI rejects its `$schema` key
    // outright (spike 9.3-B). See `toHarnessJsonSchema`.
    ...(req.outputSchema ? { outputFormat: { type: 'json_schema' as const, schema: toHarnessJsonSchema(req.outputSchema) } } : {}),
  };
}

/**
 * Pure decision for `run()`'s `finally`: a caller-supplied `cwd` (the CLI's
 * debug-only `--cwd`) is reused as-is and must survive the run, so cleanup
 * only ever removes a directory `run()` created itself (`mkdtempSync`, when
 * no `cwd` was supplied).
 */
export function shouldCleanupCwd(suppliedCwd?: string): boolean {
  return !suppliedCwd;
}

export class ClaudeHarnessProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'harness' as const;
  readonly capabilities: Capabilities = { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' };
  readonly cwd: string | undefined;

  constructor(private readonly opts: { model: string; id?: string; cwd?: string }) {
    this.id = opts.id ?? `claude-sub/${opts.model}`;
    this.cwd = opts.cwd;
  }

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const specs = toMcpTools(req.tools, req.tenant);
    const sdkTools = specs.map(s => {
      const shape = (s.zodSchema as z.ZodObject<z.ZodRawShape>).shape;
      return tool(s.name, s.description, shape, async (input: unknown) => s.handler(input));
    });
    const server = createSdkMcpServer({ name: 'counsel', version: '0.1.0', tools: sdkTools });
    const prompt = req.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    // Acquired inside the try so a failure here (e.g. tmpdir unwritable)
    // reaches the caller as an `error` event and the finally can clean up
    // whatever was created. A caller-supplied `opts.cwd` (debug-only, used by
    // the CLI's `--cwd` option to pin the resume spike to a stable directory)
    // is reused as-is and never removed here — the cleanup below only ever
    // touches a directory this run created itself.
    let cwd: string | undefined;

    // `query()` throws on a non-zero CLI exit — e.g. the CLI rejecting the
    // output schema before the turn starts (spike 9.3-B), or not being logged
    // in. Without this the exception propagates out of the async generator:
    // the caller gets a stack trace and ZERO StepEvents, which breaks the
    // "providers report failure as an `error` event, never by throwing"
    // contract every consumer is written against. `CodexHarnessProvider.run`
    // does the same.
    try {
      cwd = this.opts.cwd ?? mkdtempSync(join(tmpdir(), 'counsel-cwd-'));
      const stream = query({ prompt, options: buildQueryOptions(req, this.opts.model, server, cwd) });

      let sessionId: string | undefined;
      // tool_use → tool_result pairing across messages: results name their
      // call only by id, so the names live for the run and fill each result.
      const toolNames = new Map<string, string>();
      for await (const msg of stream) {
        for (const ev of mapClaudeMessage(msg, req.outputSchema, toolNames)) {
          if (ev.type === 'session') { sessionId = ev.id; yield ev; continue; }
          yield ev.type === 'done' && sessionId ? { ...ev, sessionId } : ev;
        }
      }
    } catch (err) {
      yield { type: 'error', message: `claude harness: ${err instanceof Error ? err.message : String(err)}` };
    } finally {
      // One temp cwd per step; without this they accumulate for the life of
      // the process. Also runs when the consumer abandons the generator
      // early. Never removes a caller-supplied `opts.cwd` — this run didn't
      // create it (see `shouldCleanupCwd`).
      if (cwd && shouldCleanupCwd(this.opts.cwd)) rmSync(cwd, { recursive: true, force: true });
    }
  }
}
