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

/** What a produced document reports about itself. COPIED from
 * `runtime/src/core/types.ts`; a change there is a change here. */
export interface ArtifactSummary {
  changes: number;
  comments: number;
  applied: number;
  skipped: number;
  clauses: number;
  bytes: number;
}

export type ArtifactKind = 'docx-redline' | 'docx-compare';

/** One event of a running step, as the SSE stream delivers it. `runId` is
 * added by the server to every frame. */
export type StepEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; output: unknown; isError?: boolean }
  | { type: 'session'; id: string }
  | { type: 'proposal'; id: string; path: string; rationale: string }
  /** A document the step produced (`apply_redlines`); the durable record is
   * the thread's `artifact` event, this is the live signal for the slip. */
  | { type: 'artifact'; id: string; path: string; kind: ArtifactKind; summary: ArtifactSummary }
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
    }
  | {
      t: 'artifact';
      at: string;
      id: string;
      kind: ArtifactKind;
      path: string;
      source: string;
      compared?: string;
      author: string;
      tracked: boolean;
      summary: ArtifactSummary;
    };

export interface ThreadHeader {
  id: string;
  title?: string;
  matter?: string;
  /** Every step of this thread runs as this task — `retro` for a retro. */
  task?: string;
  createdAt: string;
  updatedAt: string;
  sessions: Record<string, string>;
}

/** The privacy policy a thread's EXPLICIT matter (or the vault default)
 * implies (providers spec §7). COPIED from `runtime/src/vault/policy.ts`'s
 * `StepPolicy` minus the matter path. */
export interface ThreadPolicy {
  localOnly: boolean;
  source: 'matter' | 'vault' | 'none';
}

export interface Thread {
  header: ThreadHeader;
  events: ThreadEvent[];
  /** Present on `GET /threads/:id`; absent on older runtimes. */
  policy?: ThreadPolicy;
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
  /** Where the text goes; absent on an older runtime. */
  locality?: 'local' | 'cloud';
}

/** Who receives the text when a provider is cloud. COPIED from
 * `runtime/src/providers/vendors.ts`; a change there is a change here. */
export interface VendorHandles {
  company: string;
  termsUrl: string;
}

export interface ProviderInfo {
  id: string;
  kind: 'direct' | 'harness';
  auth: Capabilities['auth'];
  capabilities: Capabilities;
  /** Providers spec §6; absent on an older runtime. */
  locality?: 'local' | 'cloud';
  handles?: VendorHandles | null;
  /** Providers spec §5: whether an API-key provider has a key — saved in
   * the app, from the environment, or absent. Never the value. Absent on
   * providers that take no key and on an older runtime. */
  keySet?: KeyState;
}

/** COPIED from `runtime/src/providers/secrets.ts`; a change there is a
 * change here. */
export type KeyState = true | false | 'env';
export type SecretStoreKind = 'keychain' | 'libsecret' | 'file';

export interface Health {
  /** `true` while the runtime has no vault (spec 2026-09-01 §4, setup
   * mode): the page shows the setup screen and nothing else loads. Absent
   * on an older runtime, which never lacks a vault. */
  setup?: boolean;
  /** `null` only in setup mode. */
  vault: string | null;
  tenant: string;
  providers: ProviderInfo[];
  /** `null` when no provider resolves — the runtime reports that state
   * rather than throwing, because `/health` is how an operator diagnoses
   * it. It can also name a provider that is NOT in `providers`: the
   * registry accepts a default you have not added yet. */
  default: string | null;
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
 * — the tree needs the whole path to ask for the level below it. `mtimeMs`
 * and `size` arrived with the redesign (spec §4); optional so an older
 * runtime still parses. */
export interface VaultEntry {
  path: string;
  kind: 'file' | 'dir';
  mtimeMs?: number;
  size?: number;
}

/** `GET /vault/read` — 200. `version` is the content hash the vault stores;
 * it is what a proposal's `expectedVersion` is compared against. */
export interface VaultFile {
  path: string;
  /** The file's text — or, for a Word document (`kind: 'docx'`), its
   * conversion to markdown: the bytes never travel as text. */
  content: string;
  /** `null` if the file went away between the read and the hash. */
  version: string | null;
  /** `null` when the store has no filesystem behind it. */
  mtimeMs?: number | null;
  /** Absent on an older runtime, which serves text only. */
  kind?: 'text' | 'docx';
  /** What the conversion could not carry (`body[3]: a drawing was left out`). */
  warnings?: string[];
}

/** `GET /vault/overview` (redesign spec §4). COPIED from
 * `runtime/src/vault/overview.ts`; a change there is a change here. */
export interface MatterOverview {
  path: string;
  title: string;
  frontmatter: Record<string, string>;
  mtimeMs: number;
}

export interface VaultOverview {
  matters: MatterOverview[];
  groups: { practice: number; knowledge: number; other: number };
}

/** `GET /proposals?status=pending`. COPIED from
 * `runtime/src/loop/pending-proposals.ts`. */
export interface PendingProposal {
  threadId: string;
  threadTitle: string;
  id: string;
  path: string;
  rationale: string;
  at: string;
}

/** `GET /docket`. COPIED from `runtime/src/vault/docket.ts`; a change there
 * is a change here. */
export type DocketStatus = 'overdue' | 'soon' | 'later';

export interface DocketEntry {
  /** `YYYY-MM-DD`, as written on the matter. */
  date: string;
  action: string;
  type?: string;
  source?: string;
  matter: { path: string; title: string };
  status: DocketStatus;
}

export interface DocketView {
  /** Sorted by date, then matter title. */
  deadlines: DocketEntry[];
  /** Entries whose date could not be read — counted, never silently dropped. */
  skipped: number;
}

/** One hit of `GET /vault/search`. COPIED from `Hit` in
 * `runtime/src/core/types.ts`. */
export interface VaultHit {
  path: string;
  snippet: string;
  score: number;
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

/** One task route, as `TaskRoute` in `runtime/src/providers/registry.ts`
 * parses it. COPIED from there; a change there is a change here. */
export interface TaskRouteData {
  prefer: string;
  require?: {
    tools?: boolean;
    caching?: boolean;
    thinking?: boolean;
    contextTokens?: number;
  };
  allow_remote?: boolean;
}

/** `providers.yaml` as data: what `GET /settings` hands out and `PUT
 * /settings` takes back. */
export interface RegistryFileData {
  default?: string;
  providers?: RegistryEntry[];
  tasks?: Record<string, TaskRouteData>;
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
  /** Where app-entered keys live (providers spec §5); `null` when the
   * runtime has no store; absent on an older runtime. */
  secrets?: { where: SecretStoreKind } | null;
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

/** One row of `GET /setup/detect`. COPIED from `Location` in
 * `runtime/src/setup/detect.ts`; a change there is a change here. */
export interface SetupLocation {
  path: string;
  kind: 'existing-root' | 'obsidian-vault' | 'new';
  within?: string;
  exists: boolean;
  writable: boolean;
  suggested: boolean;
}

/** One row of `GET /setup/providers`. COPIED from `ProviderProbe` in
 * `runtime/src/setup/detect.ts`; a change there is a change here. */
export interface SetupProvider {
  id: string;
  vendor: 'Claude' | 'ChatGPT' | 'Ollama';
  model: string;
  connection: 'subscription' | 'local';
  installed: boolean;
  signedIn: boolean | null;
  models?: string[];
  usable: boolean;
  state: string;
}

/** The body of `POST /setup`. COPIED from `SetupPlan` in
 * `runtime/src/setup/plan.ts`; a change there is a change here. */
export interface SetupPlanBody {
  vault: string;
  identity: { name: string; organization: string; role: 'in-house' | 'outside' | 'solo'; jurisdiction: string };
  practice: string;
  sampleMatter: boolean;
  defaultProvider?: string;
  git: boolean;
  /** "Keep every matter on this machine unless I say otherwise" →
   * `default_locality: local` (providers spec §7). */
  staysLocalDefault?: boolean;
}

/** `POST /setup` — 200. `result.groups` mirrors `SetupResult` in
 * `runtime/src/setup/run.ts`. */
export interface SetupResponse {
  vault: string;
  result: {
    vault: string;
    adopted: boolean;
    groups: Record<'config' | 'law' | 'standards' | 'methods' | 'library' | 'reference' | 'profile' | 'memory' | 'gitignore' | 'sample', { written: number; skipped: number }>;
    written: number;
    skipped: number;
    git: 'initialized' | 'present' | 'skipped' | 'unavailable' | 'failed';
    warnings: string[];
  };
}

/** `GET /content/status` (spec 2026-09-01 §6). COPIED from
 * `runtime/src/content/update.ts`; a change there is a change here. */
export type ContentItemStatus = 'current' | 'update-available' | 'user-modified' | 'vault-only' | 'missing' | 'upstream-changed';

export interface ContentItem {
  path: string;
  shipped: string | null;
  group: 'law' | 'practice';
  area: string;
  status: ContentItemStatus;
  reason?: 'managed-by' | 'law-management' | 'edited' | 'no-baseline';
  diff?: string;
  baseline?: 'received' | 'vault';
  applicable: boolean;
}

export interface ContentStatus {
  shippedVersion: string;
  vaultVersion: string | null;
  receivedAt: string | null;
  lawManagement: 'plugin' | 'user';
  autoApplyLawUpdates: boolean;
  items: ContentItem[];
  counts: Record<ContentItemStatus, number>;
}

/** `POST /content/apply` — 200. */
export interface ContentApplyResult {
  applied: string[];
  skipped: string[];
}

/** `GET /doctor` (spec 2026-09-01 §7). COPIED from `runtime/src/doctor/`. */
export type DoctorSeverity = 'ok' | 'warn' | 'error';

export interface DoctorFinding {
  check: string;
  severity: DoctorSeverity;
  message: string;
  detail?: string;
  paths?: string[];
  fix?: string;
}

export interface DoctorReport {
  at: string;
  vault: string;
  findings: DoctorFinding[];
  verdict: 'healthy' | 'warnings' | 'broken';
  summary: string;
}

/** `GET /retro` (retro in the runtime). COPIED from
 * `runtime/src/retro/index.ts`; a change there is a change here. */
export interface RetroStatus {
  lastRetroAt: string | null;
  threadId: string | null;
  cadenceDays: number;
  daysSince: number | null;
  dueAt: string | null;
  due: boolean;
  /** Why `due` is what it is, as a sentence. */
  reason: string;
}

/** `POST /retro` — the retro thread, opened; the page sends `message` as
 * the thread's first step. COPIED from `runtime/src/retro/index.ts`. */
export interface RetroStart {
  threadId: string;
  title: string;
  period: { from: string | null; to: string };
  message: string;
  status: RetroStatus;
}
