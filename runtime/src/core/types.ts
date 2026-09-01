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
  session?: { id?: string };
  /** Cancels the step. Every provider forwards it to the SDK underneath it —
   * `abortController` for the Claude harness, the turn's `signal` for Codex,
   * `abortSignal` for the direct tier — so a step that times out actually
   * stops the work: the SDK settles, the generator's `finally` runs, and a
   * harness child process dies instead of streaming into nothing. */
  signal?: AbortSignal;
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
  | { type: 'session'; id: string }
  // Synthesized by the loop right after a successful `propose_update`
  // tool_result (see `counsel-loop.ts`'s `stream`); never appended to the
  // thread log — the `proposal` ThreadEvent the tool itself writes is the
  // durable record.
  | { type: 'proposal'; id: string; path: string; rationale: string }
  | { type: 'done'; output: unknown; usage: Usage; sessionId?: string }
  // `text` is the model's RAW answer when a typed step could not honor its
  // schema (web-ui spec §4.3): the request failed, so this is an `error`, but
  // the words the model produced are still worth showing. Providers fill it
  // only on a structured-output failure — never on a transport or harness
  // error, where there is no answer to keep.
  | { type: 'error'; message: string; text?: string };

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
  /** Filesystem metadata (redesign spec §4): recency for the tree's month
   * labels and the home cards. Optional so in-memory test stores need not
   * fake a filesystem. */
  mtimeMs?: number;
  size?: number;
}

export interface Hit {
  path: string;
  snippet: string;
  score: number;
}

export interface VaultStore {
  read(tenant: Tenant, path: string): Promise<string>;
  // `expectedVersion: null` means "expect the file NOT to exist yet" (the
  // new-file case a proposal records when nothing was there to hash) —
  // distinct from omitting `expectedVersion`, which skips the check
  // entirely and always overwrites.
  write(tenant: Tenant, path: string, content: string, opts?: { expectedVersion?: Version | null }): Promise<Version>;
  list(tenant: Tenant, dir: string): Promise<Entry[]>;
  search(tenant: Tenant, query: string): Promise<Hit[]>;
  history(tenant: Tenant, path: string): Promise<Version[]>;
  version(tenant: Tenant, path: string): Promise<Version | null>;
  /** The path's mtime in ms, or `null` when it does not exist. Optional:
   * only `GET /vault/read` uses it, and only when the store has one. */
  mtime?(tenant: Tenant, path: string): Promise<number | null>;
  /** The file's raw bytes — a Word document, a PDF — under the same path
   * guards as `read`. Optional: an in-memory store may hold only text. */
  readBytes?(tenant: Tenant, path: string): Promise<Uint8Array>;
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

