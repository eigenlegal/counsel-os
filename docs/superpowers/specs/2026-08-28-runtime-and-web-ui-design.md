# Counsel OS runtime + web UI — design

Date: 2026-08-28
Status: approved in brainstorm; awaiting founder review of this spec

## 1. Goal

Make Counsel OS the easiest legal AI tool for a lawyer to install and use, on any
model. Today Counsel OS is a Claude Code plugin: markdown skills plus scripts, with
no model calls of its own. The host supplies the model, the agent loop, and the UX.
That caps the product at what a chat transcript can show.

This design adds a **runtime** that owns the model calls and the agent loop, and a
**local web UI** on top of it. The markdown knowledge layer stays the shared,
portable core. The plugin becomes a thin adapter over that core.

Primary driver: ease of install and use for lawyers. Secondary: model
independence (OpenAI, Google, open-weight via Ollama) and a hosted option later.

## 2. Decisions made

| Decision | Choice | Why |
|---|---|---|
| Local vs hosted first | Local (`counsel-os serve` on localhost) | Keeps the local / no-telemetry / your-vault thesis. Hosted is additive later. |
| Hosted-readiness | Three seams (`ModelProvider`, `VaultStore`, `Tools`) + tenant ID on every call from day one | Without the seams, hosted is a rewrite. |
| Shared markdown | Methodology (`primitives/`), law areas (`knowledge/`), positions, vault format stay markdown, one source for plugin and runtime | This is the content lawyers and contributors edit; it is the open-source value. |
| Hero tasks | Code-shaped flows in the runtime (not markdown) | Deterministic steps, per-clause state, progress UI, stricter evals. |
| Freeform work | A tool-calling loop over the same primitives | Escape hatch for everything a flow does not cover. |
| Model library | Vercel AI SDK **core only** (`ai` + `@ai-sdk/*` + `ai-sdk-ollama`) behind `ModelProvider` | Widest provider coverage; Apache-2.0; no hosting tie. Never import Gateway, Workflows, Sandbox, AI Elements. |
| Fallback library | pi-ai or raw SDKs, if the AI SDK blocks a native feature | The `ModelProvider` seam must be small enough to swap in about a week. |
| Default model | Claude; others supported, not co-equal | Evals and the founder's own practice tune against it. |
| Auth tiers | Subscription first (Claude Agent SDK on a Pro/Max login; Codex SDK on a ChatGPT login). API keys and Ollama are Settings options. | Lawyers should not need an API key. Verified 2026-08-28: Anthropic permits third-party Agent SDK apps on subscriptions since 2026-06-15 (monthly Agent SDK credit); OpenAI permits ChatGPT-login Codex SDK for personal, single-user use. |
| Hosted auth | API keys only | Both vendors' terms restrict subscription auth to personal/local use. |
| Router | Config table: one default + a few per-task rows | No clever routing. Add rows only when a task proves it needs one. |
| Language | TypeScript on Bun | Same toolchain as `browse/`. Python scripts stay as subprocess tools. |
| Web stack | Vite + React + TypeScript, static files served by the Bun server | No Next.js; no server rendering needed; avoids Vercel gravity. |
| Plugin | Adapter: call the runtime API when present; fall back to today's freeform behavior when absent | Keeps the no-runtime install alive; Codex/OpenCode portability falls out of the same adapter. |

## 3. Architecture

New package: `runtime/` in the counsel-os repo. Entry: `counsel-os serve`.

```
web UI (browser)  ─┐
plugin adapter     ├─►  Runtime API (HTTP + SSE)
CLI                ─┘         │
                    ┌─────────┴──────────┐
                    │   Flow engine       │  hero tasks, code-shaped
                    │   Counsel loop      │  freeform chat, tool loop
                    └─────────┬──────────┘
              ┌───────────────┼───────────────┐
        ModelProvider      VaultStore        Tools
        (AI SDK core)    (fs | tenant db)  (py scripts, browse, docx)
                    knowledge/ + primitives/ (shared markdown)
```

Tenant ID is a parameter on every `VaultStore` and `Tools` call. Local always
passes `default`.

Out of scope for the first build: hosted deployment, auth, billing, multi-user.

## 4. Interfaces

### 4.1 `ModelProvider`

```ts
interface ModelProvider {
  id: string;                       // "claude-sub/opus-5", "codex-sub/gpt-5", "anthropic/claude-opus-5", "ollama/qwen3"
  kind: "direct" | "harness";
  run(req: StepRequest): AsyncIterable<StepEvent>;
  capabilities: {
    tools: boolean;
    caching: boolean;
    thinking: boolean;
    contextTokens: number;
    auth: "subscription" | "apikey" | "local";
  };
}
```

`StepRequest` = system prompt, messages, tool definitions, optional output
schema, max tokens. `run` executes one step *to completion*: the model may call
tools any number of times; the caller receives events (text, tool call, tool
result, final typed output) and one terminal event. The counsel loop and every
flow step are the same call.

Two kinds:

- **direct** — wraps the AI SDK core. The runtime runs the tool loop itself
  (`ToolLoopAgent`). API keys, Ollama, any AI SDK provider.
- **harness** — wraps the Claude Agent SDK or the Codex SDK. The vendor's own
  agent loop runs the step. The runtime exposes `VaultStore` and `Tools` to it
  as an in-process MCP server. Subscription auth; no keys. Prompt caching and
  thinking are the harness's concern.

`capabilities` is read by the router and shown by the UI. The default install
uses a harness provider ("sign in with Claude or ChatGPT").

### 4.2 `VaultStore`

```ts
interface VaultStore {
  read(tenant: string, path: string): Promise<string>;
  write(tenant: string, path: string, content: string,
        opts?: { expectedVersion?: Version }): Promise<Version>;
  list(tenant: string, dir: string): Promise<Entry[]>;
  search(tenant: string, query: string): Promise<Hit[]>;   // qmd today
  history(tenant: string, path: string): Promise<Version[]>;
}
```

Local adapter = filesystem + qmd. `write` uses optimistic versioning so a flow
and the lawyer's editor cannot silently clobber each other. The `remember`
primitive writes through `VaultStore` and nowhere else.

### 4.3 `Tools`

```ts
interface Tool {
  name: string;
  platforms: Set<"macos" | "linux" | "windows" | "hosted">;
  run(tenant: string, input: unknown): Promise<ToolResult>;
}
```

Existing Python scripts and `browse` become tools with a subprocess wrapper.
`platforms` is the README platform matrix as code. The loop only offers tools that
can run here; the UI shows why a tool is grey. Hosted later means adding
`"hosted"` to tools that can run server-side.

### 4.4 Router

Configuration, not code:

```yaml
default: anthropic/claude-opus-5
tasks:
  long_read: { prefer: anthropic/claude-opus-5, require: { contextTokens: 200000 } }
  classify:  { prefer: anthropic/claude-haiku-4-5 }
  privacy:   { prefer: ollama/qwen3, allow_remote: false }
```

Resolution: task row → `prefer` if its capabilities satisfy `require` → else
`default` → else a hard error. Never a silent downgrade.

## 5. Flow engine and counsel loop

### 5.1 Counsel loop (freeform)

A plain tool-calling loop on `ModelProvider`. System prompt = `primitives/*.md` +
practice profile + applicable law areas. Tools = `VaultStore` ops + the `Tools`
registry filtered by platform. Step cap and token budget per turn. Events stream
to the UI. This is the current plugin behavior moved into the runtime.

### 5.2 Flow engine (hero tasks)

A flow is a TypeScript definition: ordered steps. Each step is one of:
- a model call with a typed output schema,
- a tool call,
- a user gate.

Run state persists in the vault at `matters/<m>/runs/<id>.json`. A refresh or a
crash resumes. Every step's input and output is inspectable.

Flows, in build order:

1. **Review** — `read` document → detect law areas → per clause, `evaluate`
   against positions (parallel model calls; typed verdict: green/yellow/red +
   rationale + citation) → user gate per clause (accept / override / ask) →
   `draft` redline edits → `redline-output` tool.
2. **Ingest markup** — `extract_redlines` tool → per-change assessment → user
   gate → `remember` proposals.
3. **Compliance assessment** — detect areas → per-area gap checks → report.
4. **Docket** — wraps `docket_sweep`; presents dates.

Rules:
- Steps use the same primitives markdown as the loop for their prompts. The
  engine adds structure, not a second methodology.
- A flow can hand off to the loop with the run's context and come back.
- Every vault write from a flow goes through `remember`'s propose-then-approve
  gate. No silent writes.

## 6. Web UI

Served at localhost by `counsel-os serve`. Four surfaces, in build order:

1. **Matter workspace** (home). Left: matters and counterparties. Center: the
   selected matter — documents, runs, dates, logged decisions. Every item is
   still a markdown file on disk.
2. **Review run**. Document left, clause verdicts right, aligned by clause. Each
   card: color, rationale, citation, gate (accept / override with note / ask
   counsel). Header: progress, model in use, cost so far. Finish → redline
   preview → export `.docx` (macOS + Word) or markdown.
3. **Counsel chat**. The loop as a chat panel, available from any screen, with
   the current matter as context. Tool calls and vault reads render as
   collapsible steps. `remember` proposals appear as approve/reject cards.
4. **Settings**. Vault location; providers (paste key, pick Ollama, test);
   router table as a form; platform capabilities list with reasons.

Constraints:
- Streaming everywhere.
- No client-side model calls; keys never reach the page.
- AI SDK `useChat` for the chat pane only; the review screen is state driven by
  SSE run events.

## 7. Error handling

- Model failure: retry with backoff inside `ModelProvider`, then fail the step.
  The run pauses; the UI offers retry or switch model for that step. No
  automatic fallback to a different model without telling the user.
- Router cannot satisfy `require`: hard error with the reason.
- Vault write conflict: step fails with a diff; the user chooses.
- Tool unavailable on this platform: filtered before the model sees it; the flow
  uses the documented fallback (markdown redline instead of `.docx`).
- Every run writes `runs/<id>.log.jsonl`: per step, the model, tokens, cost,
  duration.

## 8. Testing

- Unit: router resolution; `VaultStore` fs adapter (versions, conflicts); tool
  platform filtering; prompt assembly from markdown (snapshot tests).
- Flow engine: each flow against a `FakeModelProvider` with canned typed outputs.
- Evals: existing `evals/` fixtures through the Review flow, scored per clause;
  baselines per model in `evals/baselines/`. This gates changes to primitives
  and the router.
- Integration: one end-to-end smoke test per flow on the real default model,
  before release.
- UI: component tests for the verdict card and gate; one Playwright run of
  "open matter → review demo NDA → export" against the fake provider.

## 9. Open items to resolve in the first spike

1. Does the AI SDK Anthropic provider expose prompt caching and extended
   thinking cleanly? (Direct tier only; cost of long-document review.)
2. How reliable is tool calling on local Ollama models through `ai-sdk-ollama`?
   (Viability of the privacy tier.)
3. Can the Claude Agent SDK and the Codex SDK each (a) attach an in-process MCP
   server for `VaultStore`/`Tools`, (b) return a typed output for a step, and
   (c) be restricted to those tools only (no shell, no file access outside the
   vault)? (Viability of the harness tier as the default.)

## 10. Build order

1. `runtime/` skeleton: the three interfaces, fs `VaultStore`, harness
   `ModelProvider` (Claude Agent SDK first, Codex SDK second), direct
   `ModelProvider` (AI SDK), subprocess `Tools`, in-process MCP server, router.
   Spike items 9.1–9.3 here.
2. Counsel loop + HTTP/SSE API. Plugin adapter calls it.
3. Flow engine + Review flow. Evals through it.
4. Web UI: matter workspace → review run → chat → settings.
5. Flows 2–4.
6. Launch copy: "free local legal OS, runs on any model, with a real UI."
