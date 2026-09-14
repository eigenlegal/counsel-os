import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { Codex, type CodexOptions, type Input } from "@openai/codex-sdk";
import { imageInputLabel } from '../core/image-input';
import type { ModelProvider, StepEvent, StepRequest } from "../core/types";
import {
  buildCodexConfig,
  buildCodexEnv,
  buildThreadOptions,
  buildTurnOptions,
  cleanupIsolatedHome,
  mapCodexEvent,
} from "../providers/codex-harness";
import { locateCli } from "../providers/cli-locate";
import { openToolBridge } from "./tool-bridge";
import { workspaceProviderFailure } from './provider-failure';
import { codexCancellation } from './codex-cancellation';
import { acquireCodexCredentials } from './codex-auth-cache';

export function workspaceCodexConfig(
  url: string,
  codexPath: string,
  useTools = true,
): CodexOptions {
  const inherited = buildCodexConfig({
    vaultRoot: "",
    tenant: "workspace",
    codexPath,
  });
  return {
    ...inherited,
    config: {
      ...inherited.config,
      forced_login_method: "chatgpt",
      cli_auth_credentials_store: "file",
      agents: { enabled: false },
      // Codex 0.153.2 adds default-on host/connector capabilities beyond shell.
      // A fresh CODEX_HOME alone is not an explicit denial of account integrations.
      // 0.153.2 still advertises the code-mode wrapper when it is disabled.
      // Keep its host disabled, exclude built-ins from its executor, and expose
      // our MCP namespace directly; otherwise all Counsel OS tools are deferred
      // behind a disabled executor. Verify with the local transport preflight.
      features: {
        ...(inherited.config?.features as Record<string, boolean>),
        apps: false,
        plugins: false,
        remote_plugin: false,
        browser_use: false,
        browser_use_external: false,
        computer_use: false,
        in_app_browser: false,
        code_mode: {
          enabled: false,
          excluded_tool_namespaces: ["functions"],
          direct_only_tool_namespaces: ["mcp__counsel"],
        },
        code_mode_host: false,
        goals: false,
        memories: false,
        skill_search: false,
        skill_mcp_dependency_install: false,
        skip_host_skill_discovery: true,
        workspace_dependencies: false,
        sleep_tool: false,
        tool_suggest: false,
        unbounded_connection_retries: false,
      },
      mcp_servers: useTools ? {
        counsel: {
          url,
          enabled: true,
          required: true,
          bearer_token_env_var: "COUNSEL_TURN_TOKEN",
          default_tools_approval_mode: "approve",
        },
      } : {},
    },
  };
}

export function workspaceCodexPrompt(req: StepRequest): string {
  const integration = req.tools.length
    ? 'Counsel OS integration: call the provided mcp__counsel tools directly. Do not use functions.exec or functions.wait to invoke them; the code-mode host is intentionally disabled. A disabled executor is not a failure of the directly available Counsel OS tools.'
    : 'This is a self-contained writing request. No tools or file access are available or needed. Answer directly using only the supplied context.';
  return `${integration}\n\n${req.system}\n\nConversation messages (JSON):\n${JSON.stringify(req.messages)}`;
}

/** Only retained, explicitly attached bytes enter the private run directory.
 * This does not enable Codex's filesystem or view_image tools. */
export function workspaceCodexInput(req: StepRequest, cwd: string): Input {
  const prompt = workspaceCodexPrompt(req);
  if (!req.images?.length) return prompt;
  return [{ type: 'text', text: prompt }, ...req.images.flatMap((image, index) => {
    const path = join(cwd, `image-${index + 1}.${image.mediaType === 'image/jpeg' ? 'jpg' : image.mediaType === 'image/webp' ? 'webp' : 'png'}`);
    writeFileSync(path, Buffer.from(image.data, 'base64'), { mode: 0o600, flag: 'wx' });
    return [{ type: 'text' as const, text: imageInputLabel(image, index) }, { type: 'local_image' as const, path }];
  })];
}

/** Uses the official CLI/SDK login. Never sends subscription tokens to an API adapter. */
export class WorkspaceCodexProvider implements ModelProvider {
  readonly kind = "harness" as const;
  readonly capabilities = {
    tools: true,
    caching: true,
    thinking: true,
    contextTokens: 200_000,
    auth: "subscription" as const,
  };
  readonly id: string;
  constructor(private model: string) {
    this.id = `codex-sub/${model}`;
  }
  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const codexPath = locateCli("codex");
    if (!codexPath) {
      yield {
        type: "error",
        message: "Install Codex and run codex login first.",
      };
      return;
    }
    const signal = req.signal ?? new AbortController().signal;
    const cancellation = codexCancellation(signal);
    const realHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
    let isolated: string | undefined;
    let cwd: string | undefined;
    let bridge: ReturnType<typeof openToolBridge> | undefined;
    let credentials: Awaited<ReturnType<typeof acquireCodexCredentials>> | undefined;
    try {
      signal.throwIfAborted();
      // Read-only source login remains authoritative; the private renewal cache
      // is invalidated by logout/account changes and never permits API fallback.
      credentials = await acquireCodexCredentials(realHome, signal);
      isolated = mkdtempSync(join(tmpdir(), 'counsel-workspace-codex-'));
      credentials.seed(isolated);
      chmodSync(join(isolated, "auth.json"), 0o600);
      if (req.tools.length) bridge = openToolBridge(req.tools, signal);
      cwd = mkdtempSync(join(tmpdir(), "counsel-workspace-run-"));
      const codex = new Codex({
        ...workspaceCodexConfig(bridge?.url ?? '', codexPath, !!bridge),
        env: {
          ...buildCodexEnv(isolated, realHome, process.env),
          // No fallback discovery from the user's ~/.agents or other home files.
          HOME: isolated,
          ...(bridge ? { COUNSEL_TURN_TOKEN: bridge.token } : {}),
        },
      });
      // A fresh harness session per turn prevents hidden context and cross-chat resume.
      // Only the explicit SQLite conversation history is passed to the model.
      const thread = codex.startThread(buildThreadOptions(this.model, cwd));
      const prompt = workspaceCodexInput(req, cwd);
      const { events } = await thread.runStreamed(
        prompt,
        buildTurnOptions({ ...req, signal: cancellation.signal }),
      );
      let lastText = "";
      for await (const event of events) {
        credentials.capture(isolated);
        if (
          event.type === "item.completed" &&
          event.item.type === "agent_message"
        )
          lastText = event.item.text;
        for (const mapped of mapCodexEvent(event, undefined, lastText))
          yield mapped.type === 'error' ? { ...mapped, message: workspaceProviderFailure(mapped.message) } : mapped;
      }
    } catch (error) {
      yield {
        type: "error",
        message: workspaceProviderFailure(error),
      };
    } finally {
      cancellation.release();
      bridge?.close();
      try {
        if (isolated) { try { credentials?.capture(isolated); } finally { cleanupIsolatedHome(isolated); } }
      } finally { credentials?.release(); }
      if (cwd) rmSync(cwd, { recursive: true, force: true });
    }
  }
}
