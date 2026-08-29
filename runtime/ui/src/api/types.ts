/**
 * The wire shapes the page depends on (spec §4.4).
 *
 * COPIED from the runtime, never imported: `runtime/ui` is its own package
 * with its own tsconfig, and a Vite build must not pull `runtime/src` — and
 * everything it transitively imports (zod, the provider SDKs, `node:fs`) —
 * into a browser bundle. The originals live in `runtime/src/core/types.ts`,
 * `runtime/src/threads/store.ts` and `runtime/src/loop/run-record.ts`; a
 * change there is a change here.
 */

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

/** One event of a running step, as the SSE stream delivers it. `runId` is
 * added by the server to every frame. */
export type StepEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; output: unknown; isError?: boolean }
  | { type: 'session'; id: string }
  | { type: 'proposal'; id: string; path: string; rationale: string }
  | { type: 'done'; output: unknown; usage: Usage; sessionId?: string }
  /** `text` is the model's raw answer when a typed step could not honor its
   * schema (spec §4.3) — shown alongside the message, never instead of it. */
  | { type: 'error'; message: string; text?: string };

export type StreamEvent = StepEvent & { runId?: string };

export type ProposalStatus = 'pending' | 'approved' | 'rejected';

/** The durable transcript. Note the two tag keys: the thread's own events use
 * `t`, the step events embedded in the log use `type`. */
export type ThreadEvent =
  | { t: 'user'; at: string; content: string }
  | { t: 'step'; at: string; runId: string; provider: string; task?: string }
  | { t: 'warning'; at: string; message: string }
  | (StepEvent & { at: string })
  | {
      t: 'proposal';
      at: string;
      id: string;
      path: string;
      content: string;
      rationale: string;
      status: ProposalStatus;
      expectedVersion: string | null;
    };

export interface ThreadHeader {
  id: string;
  title?: string;
  matter?: string;
  createdAt: string;
  updatedAt: string;
  sessions: Record<string, string>;
}

export interface Thread {
  header: ThreadHeader;
  events: ThreadEvent[];
}

export interface ToolCallLog {
  name: string;
  /** `null` when the call never paired with a result — unknown, not zero. */
  ms: number | null;
  isError: boolean | null;
}

export type RunStatus = 'running' | 'done' | 'error' | 'timeout' | 'abandoned';

export interface RunRecord {
  runId: string;
  threadId: string;
  tenant: string;
  startedAt: string;
  finishedAt?: string;
  status: RunStatus;
  message: string;
  provider: string;
  task?: string;
  primitivesRead: string[];
  toolCalls: ToolCallLog[];
  proposals: string[];
  output?: unknown;
  usage?: Usage;
  costUsd?: number;
  durationMs?: number;
  error?: string;
  errorText?: string;
}

export interface Capabilities {
  tools: boolean;
  caching: boolean;
  thinking: boolean;
  contextTokens: number;
  auth: 'subscription' | 'apikey' | 'local';
}

export interface ProviderInfo {
  id: string;
  kind: 'direct' | 'harness';
  auth: Capabilities['auth'];
  capabilities: Capabilities;
}

export interface Health {
  vault: string;
  tenant: string;
  providers: ProviderInfo[];
  default: string;
  stepTimeoutMs: number;
}

/** The body of `POST /threads/:id/steps`. */
export interface StepBody {
  message: string;
  provider?: string;
  task?: string;
  outputSchema?: Record<string, unknown>;
}

/** `POST /threads/:id/approve` — 200. */
export interface ApproveResult {
  proposal: Extract<ThreadEvent, { t: 'proposal' }> | null;
  version?: string;
}

/**
 * `POST /threads/:id/approve` — 409, which covers two different situations
 * that the fields tell apart:
 *
 * - `conflict` set — the file moved under the proposal, nothing was written,
 *   and the two versions are the whole story.
 * - `proposal` set — somebody already decided this one. The earlier decision
 *   stands, and the proposal it returns is the current, settled state.
 */
export interface ConflictBody {
  error: string;
  conflict?: { expected: string; actual: string };
  proposal?: Extract<ThreadEvent, { t: 'proposal' }> | null;
}

/** One entry of `GET /vault/list`. `path` is vault-relative, from the root
 * — the tree needs the whole path to ask for the level below it. */
export interface VaultEntry {
  path: string;
  kind: 'file' | 'dir';
}

/** `GET /vault/read` — 200. `version` is the content hash the vault stores;
 * it is what a proposal's `expectedVersion` is compared against. */
export interface VaultFile {
  path: string;
  content: string;
  version: string;
}

/** One provider entry of `providers.yaml`, as `RegistryFile` parses it.
 * COPIED from `runtime/src/providers/registry.ts`; a change there is a
 * change here. */
export interface RegistryEntry {
  id: string;
  baseURL?: string;
  apiKeyEnv?: string;
  capabilities?: Partial<Capabilities>;
}

/** `providers.yaml` as data: what `GET /settings` hands out and `PUT
 * /settings` takes back. `tasks` is left opaque — the form edits it as JSON
 * and the server owns its schema. */
export interface RegistryFileData {
  default?: string;
  providers?: RegistryEntry[];
  tasks?: Record<string, unknown>;
  stepTimeoutMs?: number;
}

/** `GET /settings` and a successful `PUT /settings` (spec §4.1). `registry`
 * is the file as configured; `effective` is the runtime it produced — they
 * differ, because the built-ins and `--fake` appear in no file. */
export interface SettingsView {
  file: string;
  registry: RegistryFileData;
  effective: {
    default: string | null;
    stepTimeoutMs: number;
    providers: ProviderInfo[];
  };
}

/** One zod issue as a 400 reports it. `path` locates the field the form
 * puts the message under. */
export interface SettingsIssue {
  path?: (string | number)[];
  message: string;
}

/** `PUT /settings` — 400 (schema) or 422 (the registry parsed but would not
 * build). Only the 400 carries `issues`. */
export interface SettingsErrorBody {
  error: string;
  issues?: SettingsIssue[];
}

/** `POST /settings/test` — always 200 for a known provider; `ok: false`
 * with the message is the answer "this provider does not work". */
export interface TestResult {
  ok: boolean;
  usage?: Usage;
  error?: string;
  ms: number;
}
