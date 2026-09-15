import { createHash } from "node:crypto";
import { z } from "zod";
import type { ModelProvider } from "../core/types";
import { directProviderFromId } from "../providers/direct";
import { locateCli } from "../providers/cli-locate";
import type { SecretStore } from "../providers/secrets";
import { WorkspaceCodexProvider } from "./codex";
import {
  WorkspaceClaudeCodeProvider,
  checkClaudeSignIn,
  type ClaudeRuntime,
} from "./claude-code";
import type { WorkspaceStore } from "./store";
import { WorkspaceConflictError } from "./types";
import {
  ConnectionKind,
  ModelId,
  ModelChoice,
  sameConnection,
  type ModelCatalog,
} from "./model-choice";
import { boundedText, bundledCodexModels, uniqueModels } from "./model-catalog";
import { checkCodexSignIn, testModelConnection } from './connection-setup';

export const ConnectionInput = z
  .object({
    kind: ConnectionKind,
    model: ModelId,
    apiKey: z.string().trim().min(1).max(1_000).optional(),
    claudeBilling: z.enum(["subscription", "api"]).optional(),
  })
  .strict();
export type ConnectionConfig = Omit<z.infer<typeof ConnectionInput>, "apiKey">;
export interface ConnectionStatus {
  config: ConnectionConfig | null;
  ready: boolean;
  label: string;
  storage: string;
  codexInstalled: boolean;
  claudeInstalled: boolean;
  qualification: "not-live-qualified" | "test-fixture";
}
export class WorkspaceConnection {
  private testing = false;
  private catalogs = new Map<
    string,
    { at: number; result: Promise<ModelCatalog> }
  >();
  constructor(
    private store: WorkspaceStore,
    private secrets: SecretStore,
    private options: {
      claudeRuntime?: ClaudeRuntime;
      fetch?: typeof fetch;
      codexCatalog?: () => Promise<ModelCatalog["models"]>;
    } = {},
  ) {}
  private config(): ConnectionConfig | null {
    const value = this.store.setting("model-connection");
    return value === null
      ? null
      : ConnectionInput.omit({ apiKey: true }).parse(value);
  }
  private keyId(kind: string): string {
    // Separate identity from both the model name and legacy provider keys.
    const workspace = createHash("sha256")
      .update(this.store.databasePath)
      .digest("hex")
      .slice(0, 24);
    return `workspace/${workspace}/${kind}/official-endpoint`;
  }
  status(): ConnectionStatus {
    const config = this.config();
    const codexInstalled = locateCli("codex") !== null;
    const claudeInstalled =
      !!this.options.claudeRuntime?.command || locateCli("claude") !== null;
    return {
      config,
      ready:
        !!config &&
        (config.kind !== "codex" || codexInstalled) &&
        (config.kind !== "claude-code" || claudeInstalled),
      label:
        config?.kind === "claude-code"
          ? `Claude Code · ${config.claudeBilling === "api" ? "API-billed" : "subscription"}`
          : config?.kind === "codex"
            ? "Codex · ChatGPT subscription"
            : config?.kind === "anthropic-api"
              ? "Anthropic API"
              : config?.kind === "openai-api"
                ? "OpenAI API"
                : "Not connected",
      storage: this.secrets.where(),
      codexInstalled,
      claudeInstalled,
      qualification: "not-live-qualified",
    };
  }
  configure(raw: z.input<typeof ConnectionInput>): ConnectionStatus {
    const input = ConnectionInput.parse(raw);
    const cli = input.kind === "codex" || input.kind === "claude-code";
    if (cli && input.apiKey)
      throw new WorkspaceConflictError(
        "CLI connections do not take API keys. Sign in through the CLI itself.",
      );
    if (input.kind !== "claude-code" && input.claudeBilling)
      throw new WorkspaceConflictError(
        "Claude Code billing only applies to the Claude Code connection.",
      );
    if (!cli) {
      if (input.apiKey) this.secrets.set(this.keyId(input.kind), input.apiKey);
      else if (!this.secrets.get(this.keyId(input.kind)))
        throw new WorkspaceConflictError(
          "Paste an API key for this connection.",
        );
    }
    this.store.setSetting("model-connection", {
      kind: input.kind,
      model: input.model,
      ...(input.kind === "claude-code"
        ? { claudeBilling: input.claudeBilling ?? "subscription" }
        : {}),
    });
    this.catalogs.clear();
    return this.status();
  }
  assertChoice(raw: ModelChoice): ModelChoice {
    const choice = ModelChoice.parse(raw);
    const config = this.config();
    if (!config || !sameConnection(config, choice))
      throw new WorkspaceConflictError(
        "The AI connection or billing method changed. Review the model choice before sending.",
      );
    return choice;
  }
  async models(rawKind: z.input<typeof ConnectionKind>): Promise<ModelCatalog> {
    const kind = ConnectionKind.parse(rawKind);
    const cached = this.catalogs.get(kind);
    if (cached && Date.now() - cached.at < 300_000) return cached.result;
    const result = this.loadModels(kind);
    this.catalogs.set(kind, { at: Date.now(), result });
    void result.then(catalog => {
      if (catalog.source === 'unavailable' && this.catalogs.get(kind)?.result === result) this.catalogs.delete(kind);
    });
    return result;
  }
  private async loadModels(kind: ModelCatalog["kind"]): Promise<ModelCatalog> {
    try {
      if (kind === "claude-code")
        return {
          kind,
          source: "cli-aliases",
          // Documented aliases: https://code.claude.com/docs/en/model-config
          models: ["sonnet", "opus", "haiku", "fable"].map((id) => ({
            id,
            label: id[0]!.toUpperCase() + id.slice(1),
          })),
          note: "Aliases resolve through your installed Claude Code and can change over time. Fable may require usage credits; in this non-interactive integration, Claude Code can bill those credits without another prompt. This list does not verify account access or Counsel OS performance. Use an exact model ID to pin a version.",
        };
      if (kind === "codex")
        return {
          kind,
          source: "cli-bundled",
          models: await (this.options.codexCatalog ?? bundledCodexModels)(),
          note: "From your installed Codex catalog, including the publicly documented Astra entry even if the bundle marks it hidden. This is not an account-access or Counsel OS performance check. No login credentials or chat content are used to read this list.",
        };
      if (this.config()?.kind !== kind)
        return {
          kind,
          source: "unavailable",
          models: [],
          note: "Save this API connection before loading its model list. You can enter a model ID now.",
        };
      const key = this.secrets.get(this.keyId(kind));
      if (!key) throw new Error("Key unavailable");
      const anthropic = kind === "anthropic-api";
      const response = await (this.options.fetch ?? fetch)(
        anthropic
          ? "https://api.anthropic.com/v1/models?limit=100"
          : "https://api.openai.com/v1/models",
        {
          headers: anthropic
            ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
            : { authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(8_000),
          redirect: "error",
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("Listing refused");
      }
      const json = JSON.parse(await boundedText(response.body));
      if (!Array.isArray(json.data)) throw new Error("Invalid listing");
      const listed = uniqueModels(
        json.data
          .filter((item: any) => item && typeof item === "object")
          .map((item: any) => ({ id: item.id, label: item.display_name })),
      );
      // A heuristic shortlist, not a claim of tool/Responses compatibility. Typed IDs remain possible.
      const models = anthropic
        ? listed
        : listed.filter(
            (item) =>
              /^(gpt-|o[1-9]|chatgpt-)/.test(item.id) &&
              !/(audio|realtime|image|search|deep-research|transcribe|tts)/.test(
                item.id,
              ),
          );
      return {
        kind,
        source: "api",
        models,
        note: `From the saved API connection. ${anthropic && json.has_more ? "Showing the first page only. " : ""}${!anthropic ? "Filtered to likely text models; this is not a compatibility check. " : ""}Listing does not run a chat, verify tool support, or qualify a model for Counsel OS. No workspace content is sent.`,
      };
    } catch {
      return {
        kind,
        source: "unavailable",
        models: [],
        note: "The model list is unavailable. Check your connection or enter an exact model ID. Your current choice has not changed.",
      };
    }
  }
  checkClaudeSignIn() {
    return checkClaudeSignIn(this.options.claudeRuntime);
  }
  async checkSignIn(kind: 'codex' | 'claude-code') {
    // A newly installed CLI or renewed login must not reuse a stale catalog.
    this.catalogs.delete(kind);
    return kind === 'codex' ? checkCodexSignIn() : this.checkClaudeSignIn();
  }
  async test(choice: ModelChoice, signal: AbortSignal) {
    if (this.testing) throw new WorkspaceConflictError('A connection test is already running. Cancel it or wait for it to finish.');
    this.assertChoice(choice);
    this.testing = true;
    try { return await testModelConnection(this.resolve(choice), AbortSignal.any([signal, AbortSignal.timeout(60_000)])); }
    catch { throw new WorkspaceConflictError('The selected model could not complete the test. Check your sign-in, model access and account limits. No fallback connection was used.'); }
    finally { this.testing = false; }
  }
  resolve(choice?: ModelChoice): ModelProvider {
    const config = this.config();
    if (!config)
      throw new WorkspaceConflictError(
        "Choose a connection in Settings before sending a message.",
      );
    const model = choice ? this.assertChoice(choice).model : config.model;
    if (config.kind === "codex") return new WorkspaceCodexProvider(model);
    if (config.kind === "claude-code")
      return new WorkspaceClaudeCodeProvider(
        model,
        config.claudeBilling,
        this.options.claudeRuntime,
      );
    const key = this.secrets.get(this.keyId(config.kind));
    if (!key)
      throw new WorkspaceConflictError(
        "The API key is unavailable. Reconnect in Settings.",
      );
    const vendor = config.kind === "anthropic-api" ? "anthropic" : "openai";
    const baseURL =
      vendor === "anthropic"
        ? "https://api.anthropic.com/v1"
        : "https://api.openai.com/v1";
    return directProviderFromId(`${vendor}/${model}`, {
      apiKey: key,
      baseURL,
    });
  }
}
