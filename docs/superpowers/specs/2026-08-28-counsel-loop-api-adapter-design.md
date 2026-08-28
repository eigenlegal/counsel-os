# Counsel loop, HTTP/SSE API, and plugin adapter — design (build step 2)

Date: 2026-08-28
Status: approved in brainstorm
Parent spec: `2026-08-28-runtime-and-web-ui-design.md` (build order step 2)
Prior work: PR #21 (`runtime/` skeleton: seams, router, three providers, `step` CLI)

## 1. Goal

Turn the runtime engine into something a lawyer can talk to, from the plugin today and
from the web UI later, with one shared conversation history. Three deliverables:

1. **Counsel loop** — the freeform step with the real methodology as its system prompt and
   the `remember` propose-then-approve gate enforced by tool shape.
2. **`counsel-os serve`** — a local HTTP/SSE server owning threads, runs, and the vault.
3. **Plugin adapter** — the Claude Code skill uses the server when it is running and
   behaves exactly as today when it is not.

Plus two carry-overs: a providers registry file (long-tail direct providers), and
provider retry with backoff.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Conversation state | Runtime-owned persistent threads in the vault; vendor sessions mapped underneath | Plugin, CLI, and UI share one history; harness tiers keep their own context and cache, so history is not re-sent as one forgeable prompt |
| Thread location | `.counsel/threads/<id>.jsonl` + `<id>.json` header | Under `.counsel/` so `vault_write` cannot touch it (guard from PR #21) |
| Harness sessions | Claude: `resume: <session_id>` (sessions live under the real `HOME/.claude`). Codex: `resumeThread(id)` from a **persistent per-thread isolated home** `~/.counsel-os/codex/<threadId>/` (0700), removed with the thread | Codex sessions live inside `CODEX_HOME`; a per-run temp dir cannot resume |
| Direct tier history | Replay the thread log, windowed to `contextTokens` | No vendor session to resume |
| Prompt assembly | Host preamble + `skills/counsel/SKILL.md` body + practice profile + matter file; primitives via a `read_primitive` tool | Keeps the system prompt small and cacheable; mirrors the skill's own on-demand pattern; markdown stays untouched |
| Script conventions | Preamble maps `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/X.py` → tool `X`; scripts registered in `tools/builtin.ts` with platform sets | One methodology source; host differences live in the preamble |
| `remember` gate | Entity/knowledge paths are writable only via `propose_update`; approval applies the write | Spec §5.1 "no silent writes", enforced by tool shape, not prompt |
| Plugin adapter | `~/.counsel-os/runtime.json` (port, token, vault, pid) + `GET /health`; absent or unanswered → today's behavior | Zero change for users without the runtime |
| Vault discovery | Port `scripts/resolve_legal_root.sh`'s algorithm to TS, same search order | One discovery algorithm, not two |
| Long-tail providers | `~/.counsel-os/providers.yaml` registry merged over built-in defaults; `openai-compatible/<name>` with `baseURL` + `apiKeyEnv` | Adding a model is config, not a PR |
| Generic CLI harness | Designed, not built (see parent discussion); built on first real request | Cost is small; demand is unproven |
| Retry | `withRetry` wrapper on direct providers: 429/5xx, 3 tries, exponential backoff | Harness CLIs retry internally |
| Streaming | SSE; text deltas coalesced server-side (≥ 50 ms or ≥ 200 chars) | Ollama streams per token; the UI must not |
| Auth | Loopback only + random bearer token in `runtime.json` | Local product; no multi-user yet |

## 3. Architecture

```
runtime/src/
  server/
    serve.ts         entry: resolve vault, bind 127.0.0.1:<port>, write runtime.json, routes
    routes.ts        handlers (health, threads, steps, approve, vault)
    sse.ts           StepEvent → SSE with delta coalescing
    auth.ts          bearer check
  loop/
    prompt.ts        assembleSystemPrompt(vault, thread) — pure
    counsel-loop.ts  runStep(thread, message, opts) → AsyncIterable<StepEvent>
    proposals.ts     propose_update tool + apply on approval
    primitives.ts    read_primitive tool (reads primitives/<name>.md from the plugin root)
  threads/
    store.ts         ThreadStore over VaultStore paths under .counsel/threads
    window.ts        history windowing to a token budget
  providers/
    registry.ts      built-in defaults + ~/.counsel-os/providers.yaml → ModelProvider[]
    retry.ts         withRetry(provider)
    (claude-harness, codex-harness gain `sessionId` in/out)
  vault/
    resolve-root.ts  port of resolve_legal_root.sh
  tools/builtin.ts   + extract_redlines, check_document, clean_format, apply_redlines, word_compare
scripts/runtime_step.sh   plugin adapter (bash)
skills/counsel/SKILL.md   + one preamble paragraph: use the runtime when present
```

## 4. Interfaces

### 4.1 Threads

```ts
interface ThreadHeader {
  id: string;                 // ulid
  title?: string;
  matter?: string;            // vault-relative matter path
  createdAt: string; updatedAt: string;
  sessions: Record<string, string>;   // providerId → vendor session/thread id
}
type ThreadEvent =
  | { t: 'user'; at: string; content: string }
  | { t: 'step'; at: string; runId: string; provider: string; task?: string }
  | StepEvent & { at: string }          // text (coalesced), tool_call, tool_result, done, error
  | { t: 'proposal'; at: string; id: string; path: string; content: string; rationale: string; status: 'pending'|'approved'|'rejected'; expectedVersion: string|null };

interface ThreadStore {
  create(tenant, init: { title?, matter? }): Promise<ThreadHeader>;
  get(tenant, id): Promise<{ header: ThreadHeader; events: ThreadEvent[] }>;
  list(tenant): Promise<ThreadHeader[]>;
  append(tenant, id, ev: ThreadEvent): Promise<void>;
  setSession(tenant, id, providerId, sessionId): Promise<void>;
  remove(tenant, id): Promise<void>;   // also removes ~/.counsel-os/codex/<id>
}
```

### 4.2 Provider session hook

`StepRequest` gains `session?: { id?: string }`; `StepEvent` `done` gains
`sessionId?: string`. Claude harness passes `resume: session.id` and reports
`session_id` from the result; Codex harness uses `resumeThread(id)` and reports
`thread_id` from `thread.started`. Direct providers ignore both.

### 4.3 Loop

```ts
runStep(opts: {
  tenant; thread: ThreadHeader; message: string; task?: string; providerId?: string;
  outputSchema?: ZodType;
}): AsyncIterable<StepEvent>
```
1. Append `user` event. 2. Resolve provider (explicit id or router by task).
3. Build `StepRequest`: `system = assembleSystemPrompt(vault, thread)`; if the provider has a
   session for this thread → `messages = [message]` + `session`; else `messages = window(log)`.
   Tools = vault tools (with `vault_write` refusing entity/knowledge paths) + `propose_update` +
   `read_primitive` + `builtinTools()` filtered by platform. 4. Stream, appending each event;
   on `done`, store `sessionId` if present and write `runs/<runId>.log.jsonl`
   (per step: provider, tokens, cost, duration, tool calls).

### 4.4 Proposals

`propose_update { path, content, rationale }` → appends a `proposal` event (with the
current version of `path`) and returns the proposal id to the model. `vault_write` on
`entities/**`, `knowledge/**`, `practice/**` (the vault's knowledge-system dirs, read from the
practice config) → error result "use propose_update". `POST /threads/:id/approve
{ proposalId, decision: 'approve'|'reject' }` → on approve, `VaultStore.write(path, content,
{ expectedVersion })`; conflict → 409 with both versions; the event's status is updated.

### 4.5 HTTP API

| Method | Path | Body → Response |
|---|---|---|
| GET | `/health` | → `{ vault, tenant, providers: [{id,kind,auth,capabilities}], default }` |
| GET/POST | `/threads` | POST `{ title?, matter? }` → header |
| GET/DELETE | `/threads/:id` | GET → `{ header, events }` |
| POST | `/threads/:id/steps` | `{ message, task?, provider?, outputSchema? }` → `text/event-stream` of `StepEvent` (+ `runId` on first event) |
| POST | `/threads/:id/approve` | `{ proposalId, decision }` → updated proposal event |
| GET | `/vault/list?dir=` `/vault/read?path=` | read-only |

All routes require `Authorization: Bearer <token>`; bind `127.0.0.1` only.
`runtime.json` = `{ port, token, vault, pid, startedAt }` at `~/.counsel-os/runtime.json`,
mode 0600, removed on SIGINT/SIGTERM.

### 4.6 Providers registry

```yaml
# ~/.counsel-os/providers.yaml (merged over built-ins)
default: claude-sub/claude-opus-5
providers:
  - id: openai-compatible/groq
    baseURL: https://api.groq.com/openai/v1
    apiKeyEnv: GROQ_API_KEY
    capabilities: { contextTokens: 128000, tools: true, caching: false, thinking: false, auth: apikey }
tasks:
  classify: { prefer: ollama/gemma4:e4b }
```
`loadRegistry()` → `{ providers: ModelProvider[], router: Router }`. Unknown id prefix → error
at load time, not at step time.

### 4.7 Plugin adapter

`scripts/runtime_step.sh "<request>"`: reads `runtime.json`; `curl /health` with a 1 s
timeout; on success, creates/reuses a thread id stored at
`${TMPDIR}/counsel-os-thread-${CLAUDE_SESSION_ID:-$$}`, POSTs the step, and prints the
SSE text as it arrives plus a one-line summary of tool calls; exits 0. On any failure it
prints nothing and exits 3. `SKILL.md` gains one paragraph: run the script first; on exit 3,
continue with the existing methodology. Everything else in the skill is unchanged.

## 5. Error handling

- Provider `error` → thread log records it; SSE sends `error` then closes; HTTP 200 (the
  stream carried the failure). Never a dropped connection without a terminal event.
- `withRetry` (direct only): 429/5xx → 3 tries, 500 ms × 2ⁿ; other errors pass through.
- 401 bad token · 404 unknown thread/proposal · 409 approve conflict · 422 unknown provider
  or task requirement unsatisfiable (router error text) · 503 vault not found at startup.
- Resume failure (vendor session gone) → log a warning event, drop the stored session id,
  fall back to replaying the log for that step.

## 6. Testing

- Pure: `assembleSystemPrompt` (snapshot; a primitive edit must not change it, a SKILL.md edit
  must), `window()`, `ThreadStore` (append/read/list/remove incl. codex home cleanup),
  proposals (refusal on knowledge paths; approve/reject/conflict), registry merge and errors,
  `withRetry`, `resolveLegalRoot` (fixture dirs for each search-order case), SSE coalescing.
- Server: routes end-to-end with `FakeModelProvider` (SSE parsed back into events).
- Adapter: `runtime_step.sh` against a local fake-provider server; exit 3 when no server.
- Live (before the PR, two subscription calls): Claude resume across two steps on one thread;
  Codex resume from the persistent per-thread home. Ollama end-to-end via the server.

## 7. Out of scope

Flow engine, web UI, hosted mode, generic CLI harness, multi-tenant auth.

## 8. Build order

1. Provider session hook + registry + retry (`providers/`).
2. `resolve-root.ts`, `ThreadStore`, `window`.
3. Prompt assembly, `read_primitive`, proposals, builtin script tools.
4. Counsel loop (`runStep`) + run logs.
5. Server: auth, routes, SSE, `serve.ts`, `runtime.json`.
6. Plugin adapter script + SKILL.md paragraph.
7. Live smokes; spikes for Claude/Codex resume are the first live checks in task 1.
