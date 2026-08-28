import type { ZodType } from 'zod';

// ── Tenancy ───────────────────────────────────────────────────────────────
export type Tenant = string;
export const DEFAULT_TENANT: Tenant = 'default';

// ── Tools (the runtime's own tool definitions, exposed to every provider) ──
export interface ToolDef<I = unknown, O = unknown> {
  name: string;                 // snake_case, e.g. "vault_read"
  description: string;
  inputSchema: ZodType<I>;
  execute(input: I, ctx: ToolContext): Promise<O>;
}

export interface ToolContext {
  tenant: Tenant;
}

// ── Step: one model run to completion ─────────────────────────────────────
export type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };

export interface StepRequest {
  tenant: Tenant;
  system: string;
  messages: Message[];
  tools: ToolDef[];
  outputSchema?: ZodType<unknown>;   // when set, `done.output` is the parsed object
  maxTokens?: number;
  maxToolCalls?: number;             // default 20
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

export type StepEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; output: unknown; isError?: boolean }
  | { type: 'done'; output: unknown; usage: Usage }
  | { type: 'error'; message: string };

export function isTerminal(e: StepEvent): boolean {
  return e.type === 'done' || e.type === 'error';
}

// ── ModelProvider ─────────────────────────────────────────────────────────
export interface Capabilities {
  tools: boolean;
  caching: boolean;
  thinking: boolean;
  contextTokens: number;
  auth: 'subscription' | 'apikey' | 'local';
}

export interface ModelProvider {
  id: string;                        // "claude-sub/opus-5", "anthropic/claude-opus-5", "ollama/qwen3"
  kind: 'direct' | 'harness';
  capabilities: Capabilities;
  run(req: StepRequest): AsyncIterable<StepEvent>;
}

// ── VaultStore ────────────────────────────────────────────────────────────
export type Version = string;        // content hash

export interface Entry {
  path: string;
  kind: 'file' | 'dir';
}

export interface Hit {
  path: string;
  snippet: string;
  score: number;
}

export interface VaultStore {
  read(tenant: Tenant, path: string): Promise<string>;
  write(tenant: Tenant, path: string, content: string, opts?: { expectedVersion?: Version }): Promise<Version>;
  list(tenant: Tenant, dir: string): Promise<Entry[]>;
  search(tenant: Tenant, query: string): Promise<Hit[]>;
  history(tenant: Tenant, path: string): Promise<Version[]>;
  version(tenant: Tenant, path: string): Promise<Version | null>;
}

// ── Tools with platform gating (subprocess scripts, browse, docx) ─────────
export type Platform = 'macos' | 'linux' | 'windows' | 'hosted';

export interface Tool<I = unknown, O = unknown> extends ToolDef<I, O> {
  platforms: Set<Platform>;
}

export function currentPlatform(): Platform {
  switch (process.platform) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return 'linux';
  }
}

// ── Errors ────────────────────────────────────────────────────────────────
export class VaultConflictError extends Error {
  readonly code = 'vault_conflict';
  constructor(readonly path: string, readonly expected: Version, readonly actual: Version) {
    super(`vault conflict on ${path}: expected ${expected}, found ${actual}`);
  }
}

export class RouterError extends Error {
  readonly code = 'router';
}

