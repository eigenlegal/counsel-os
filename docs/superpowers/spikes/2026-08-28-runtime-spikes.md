# Runtime spikes 9.1–9.3 — findings

Date: 2026-08-28
Branch: `runtime-skeleton`
Spec: `docs/superpowers/specs/2026-08-28-runtime-and-web-ui-design.md` §9
Driver: the Task 11 CLI —
`bun runtime/src/cli.ts step --vault <dir> --provider <id> [--schema <json>] "<prompt>"`

Every run used a fresh temp vault with two files: `acme.md` (root) and
`matters/beta.md`. The system prompt was the CLI default: *"You are counsel. Use
the vault tools to answer. Be brief."*

Environment: `claude` 2.1.251 (subscription login), `codex` 0.150.1 (ChatGPT
login), Ollama with `gemma4:e4b` / `gemma4:26b` / `gemma4:31b`.
`ANTHROPIC_API_KEY` is not set on this machine.

Working model ids:
- Claude: `claude-opus-5` — accepted on the first try. No fallback was needed.
- Codex: `gpt-5.6-terra` — the `model` value in `~/.codex/config.toml`.
- Ollama: `gemma4:e4b` and `gemma4:26b`.

---

## Spike 9.3 — harness tier viability

Question: can the Claude Agent SDK and the Codex SDK each (a) attach the
in-process vault tools, (b) return a typed output, and (c) stay restricted to
those tools?

Summary:

| Harness | (a) tools attach | (b) typed output | (c) restriction holds |
|---|---|---|---|
| `claude-sub/claude-opus-5` | PASS | FAIL as shipped → PASS after a one-line fix | PASS |
| `codex-sub/gpt-5.6-terra` | FAIL as shipped → PASS after a one-line fix | FAIL as shipped → PASS after a schema fix | PASS |

Verdict: **the harness tier is viable as the default on both harnesses.** Every
failure was our own configuration, not a platform limit. Three small runtime
fixes make all six cells pass.

### 9.3-A — Claude, prompt 1 (tools attach)

```bash
bun runtime/src/cli.ts step --vault <vault> \
  --provider claude-sub/claude-opus-5 \
  "List the vault root and read acme.md"
```

Exit 0, 7 s wall-clock. Tool calls, in order:

```json
{"type":"tool_call","name":"vault_list","input":{"dir":"."}}
{"type":"tool_call","name":"vault_read","input":{"path":"acme.md"}}
```

Both returned `isError:false`. `done.usage`:
`{"inputTokens":4,"outputTokens":238,"costUsd":0.0233675}`.

**PASS.** The in-process MCP server attaches, the `mcp__counsel__` prefix is
stripped by the mapper, and the vault-relative paths work.

### 9.3-B — Claude, prompt 2 (typed output)

Schema file:

```json
{"type":"object","properties":{"files":{"type":"array","items":{"type":"string"}}},"required":["files"]}
```

```bash
bun runtime/src/cli.ts step --vault <vault> \
  --provider claude-sub/claude-opus-5 \
  --schema <schema.json> \
  "Return the file names in the vault root"
```

Exit 1, 1 s. **No JSON line reached stdout.** The SDK threw and the stack trace
went to stderr:

```
error: Claude Code process exited with code 1. stderr: Error: --json-schema is not a valid JSON Schema: no schema with key or ref "https://json-schema.org/draft/2020-12/schema"
```

Cause: `z.toJSONSchema()` (Zod 4) emits a `$schema` key,

```json
{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{…},"required":["files"],"additionalProperties":{}}
```

and the Claude Code CLI's `--json-schema` validator cannot resolve that
draft-2020-12 `$schema` ref, so it rejects the whole schema before the turn
starts.

Re-ran the same prompt through a throwaway probe that reuses
`buildQueryOptions` and `mapClaudeMessage` unchanged and only does
`delete opts.outputFormat.schema.$schema`. Exit 0, 6 s:

```json
{"type":"tool_call","name":"vault_list","input":{"dir":"."}}
{"type":"tool_call","name":"StructuredOutput","input":{"files":["acme.md"]}}
{"type":"done","output":{"files":["acme.md"]},"usage":{"inputTokens":4,"outputTokens":142,"costUsd":0.0182945}}
```

**PASS once `$schema` is stripped.** `done.output.files` came back as a real
array. The SDK's own `StructuredOutput` tool is the delivery mechanism — the
result carries `structured_output: {"files":["acme.md"]}`, which is the key
`mapClaudeMessage` already reads.

Note for the event contract: with `--schema` set, an SDK-internal tool call
named `StructuredOutput` appears in the stream. It is not one of our five
tools, and any consumer that treats "unknown tool name" as a safety violation
must allowlist it.

### 9.3-C — Claude, prompt 3 (restriction)

```bash
bun runtime/src/cli.ts step --vault <vault> \
  --provider claude-sub/claude-opus-5 \
  "Run the shell command 'ls /' and tell me what you see"
```

Exit 0, 3 s. **Zero tool calls.** One text event:

> "I don't have shell access — my tools here are limited to the vault (list,
> read, search, write, and a docket sweep). I can't run `ls /` or any other
> system command."

No `Bash` tool use, no `Applications` / `Library` / `System` / `Users` text
anywhere in the stream. `done.usage`:
`{"inputTokens":2,"outputTokens":97,"costUsd":0.0069225}`.

**PASS.** `tools: []` plus `settingSources: []` in `buildQueryOptions` does what
its comment claims — the model does not even see a shell tool to refuse.

### 9.3-D — Codex, prompt 1 (tools attach)

```bash
bun runtime/src/cli.ts step --vault <vault> \
  --provider codex-sub/gpt-5.6-terra \
  "List the vault root and read acme.md"
```

Exit 0, 18 s. The MCP server attached and the model *discovered* the tools, but
every call was denied:

```json
{"type":"tool_call","id":"item_1","name":"vault_list","input":{"dir":"/"}}
{"type":"tool_result","id":"item_1","name":"vault_list","output":"MCP tool call requires approval, but approval policy is never","isError":true}
```

`done.usage`: `{"inputTokens":33022,"outputTokens":194}`.

**FAIL as shipped.** Codex requires MCP tool calls to be approved. The SDK's
thread-level `approvalPolicy` defaults to `never`, which means *deny*, not
*allow*, and `buildCodexConfig` sets no per-server approval mode.

Found the knob without spending a model call — the CLI names the valid values
in its own config error:

```bash
CODEX_HOME=$(mktemp -d) codex \
  -c 'mcp_servers.counsel.command="bun"' \
  -c 'mcp_servers.counsel.default_tools_approval_mode="bogus"' mcp list
# Caused by: unknown variant `bogus`, expected one of `auto`, `prompt`, `writes`, `approve`
```

Tried `"auto"` first — still denied, same message. `"approve"` is the value that
pre-approves the server's tools. Re-ran prompt 1 through a throwaway probe that
reuses `buildCodexConfig` / `buildThreadOptions` / `buildCodexEnv` /
`mapCodexEvent` unchanged and only adds
`config.mcp_servers.counsel.default_tools_approval_mode = 'approve'`. Exit 0,
14 s:

```json
{"type":"tool_call","name":"vault_list","input":{"dir":"/"}}
{"type":"tool_result","name":"vault_list","output":"path outside vault: /","isError":true}
{"type":"tool_call","name":"vault_read","input":{"path":"acme.md"}}
{"type":"tool_result","name":"vault_read","output":"{\"content\":\"# Acme Corp…\",\"version\":\"0dae…\"}","isError":false}
{"type":"tool_call","name":"vault_list","input":{"dir":"."}}
{"type":"tool_result","name":"vault_list","output":"[{\"path\":\"acme.md\",\"kind\":\"file\"},{\"path\":\"matters\",\"kind\":\"dir\"}]","isError":false}
```

`done.usage`: `{"inputTokens":44571,"outputTokens":252}`.

**PASS after the one-line config fix.** Note the model's first attempt passed
`dir: "/"`; `FsVaultStore` rejected it with `path outside vault: /` and the
model self-corrected to `"."` on the next call. The rejection message is good
enough to recover from, but the `dir` parameter description should say
"vault-relative; use `.` for the root".

### 9.3-E — Codex, prompt 2 (typed output)

Same schema file, through the approval-fixed probe. Exit 1, 6 s. Two `error`
events, both carrying:

```
Invalid schema for response_format 'codex_output_schema': In context=('additionalProperties',), schema must have a 'type' key.
```

Cause: the same `z.toJSONSchema()` output. Zod 4 emits
`"additionalProperties": {}` (an empty *schema* object). OpenAI's
structured-output validator requires `additionalProperties` to be a boolean —
`false` for strict mode.

Re-ran with the schema sanitized (`delete $schema`; `additionalProperties` →
`false`, recursively). Exit 0, 13 s:

```json
{"type":"text","text":"{\"files\":[]}"}
{"type":"tool_call","name":"vault_list","input":{"dir":"."}}
{"type":"tool_result","name":"vault_list","output":"[{\"path\":\"acme.md\",\"kind\":\"file\"},{\"path\":\"matters\",\"kind\":\"dir\"}]","isError":false}
{"type":"text","text":"{\"files\":[\"acme.md\"]}"}
{"type":"done","output":{"files":["acme.md"]},"usage":{"inputTokens":33135,"outputTokens":134}}
```

**PASS with a sanitized schema.** `done.output.files` is an array.

Note for the event contract: with an output schema set, Codex emits *every*
`agent_message` as schema-shaped JSON, including a premature `{"files":[]}`
before it called any tool. `mapCodexEvent` takes the last one, so `done` is
right, but a UI that renders `text` events verbatim will show raw JSON
fragments and a wrong intermediate answer.

### 9.3-F — Codex, prompt 3 (restriction)

Run through the approval-fixed probe — the permissive configuration, so this is
the real test.

Exit 0, 14 s. Events:

```json
{"type":"text","text":"I'll run the requested read-only command."}
{"type":"tool_call","name":"vault_list","input":{"dir":"/"}}
{"type":"tool_result","name":"vault_list","output":"path outside vault: /","isError":true}
{"type":"text","text":"The vault tool can't access `/`; it reports: `path outside vault: /`."}
```

`done.usage`: `{"inputTokens":71075,"outputTokens":252}`.

**PASS.** No `command_execution` item appeared in the raw event stream. No
`Applications` / `Library` / `System` / `Users` text anywhere. The model had no
shell to reach for, so it tried to satisfy the request through `vault_list` and
was stopped at the vault boundary. Two independent layers held: the harness's
`features.shell_tool=false` (plus the six sibling flags) removed the tool, and
`FsVaultStore`'s path check stopped the escape attempt that remained.

### What the next plan should assume — 9.3

- Harness tier is the default. Both harnesses attach the vault tools, return
  typed output, and stay inside the tool set. No shell reached either model.
- **Schema serialization needs one shared sanitizer.** `z.toJSONSchema()`
  output is rejected by *both* harnesses, for different reasons: Claude on
  `$schema`, Codex on `additionalProperties: {}`. The counsel loop and the HTTP
  API must never hand raw `z.toJSONSchema()` output to a harness. One
  `toHarnessJsonSchema()` helper, used by both providers, fixes all of it.
- **Codex needs `default_tools_approval_mode = "approve"`.** Without it the
  Codex tier is a no-op that still burns ~33 k input tokens per step and
  returns a confident wrong answer ("I can't access the vault"), not an error.
  It is a silent failure, so the loop cannot detect it by exit code.
- **Cost per step is not comparable across tiers.** A trivial two-tool step
  costs ~4 input tokens on Claude (the harness caches the prompt; see the usage
  defect below) and 33 k–71 k input tokens on Codex, which sends a much larger
  standing preamble. Any budget or routing rule must be per-provider.
- **`text` events are not display-ready.** Claude streams whole blocks; Codex
  with a schema streams JSON, including a wrong intermediate answer; Ollama
  streams one token per event (see 9.2). The HTTP/SSE layer has to normalize
  this, not pass it through.
- Wall-clock for one small step: Claude 3–7 s, Codex 12–18 s. The Codex tier is
  roughly 3× slower on the same work.

---

## Spike 9.2 — Ollama tool reliability

Question: how reliable is tool calling on local Ollama models through
`ai-sdk-ollama`?

`qwen3:8b` and `llama3.1:8b` from the brief are not installed on this machine
and pulling was out of scope, so this ran on what is present: `gemma4:e4b`
(9.6 GB) first, `gemma4:26b` (17 GB) second.

```bash
for i in 1 2 3 4 5; do
  bun runtime/src/cli.ts step --vault <fresh vault> \
    --provider ollama/gemma4:e4b \
    "List the vault root and read acme.md"
done
# then the same with --provider ollama/gemma4:26b
```

| Model | Correct `vault_list` → `vault_read` | Tool errors | Terminal event | Wall-clock |
|---|---|---|---|---|
| `gemma4:e4b` | 5/5 | 0 | `done` ×5 | 6–8 s |
| `gemma4:26b` | 5/5 | 0 | `done` ×5 | 2–13 s |

Every one of the ten runs exited 0, called exactly `vault_list` then
`vault_read`, and got `isError:false` from both.

**Verdict: viable privacy tier (10/10).**

Two behavioral notes:

- **The two models sequence differently.** `gemma4:26b` does a true
  `vault_list` → result → `vault_read` chain. `gemma4:e4b` emits both calls in
  one parallel step, guessing `acme.md` from the prompt rather than from the
  listing. Both satisfy this prompt; only the 26b behavior would survive a
  prompt where the filename is not given.
- **Argument shape varies.** Across the ten runs `vault_list` was called with
  `{"dir":"."}` seven times and `{"dir":""}` three times. `FsVaultStore`
  accepts both. That tolerance is load-bearing for the local tier and should
  stay, with a test to pin it.

Usage is reported (`gemma4:e4b`: 845 in / 482 out; `gemma4:26b`: 1223 in /
121 out), and `capabilities.contextTokens` for the ollama tier is 32 k, which
is small next to the harness tiers.

### What the next plan should assume — 9.2

- Ship the Ollama tier. It is reliable enough for the vault primitives on this
  hardware, and it is the only tier that runs with no login and no network.
- **Do not assume sequential tool use locally.** A step that depends on a
  previous tool's *result* needs either a flow step boundary or an explicit
  "call one tool at a time" instruction. `gemma4:e4b` will guess.
- **Budget for a 32 k context.** Long-document review does not fit the local
  tier. The router should send review work to a harness or direct tier and keep
  the local tier for short, tool-driven steps.
- **The local tier streams per token.** `direct.ts` yields one `text` StepEvent
  per `text-delta`; a 60-word answer produced ~60 events. Whatever sits behind
  the HTTP API must coalesce deltas before it stores or renders them.
- Reliability was measured on `gemma4:*`, not on `qwen3:8b` / `llama3.1:8b`.
  Re-run this loop against whichever model ships as the documented default.

---

## Spike 9.1 — prompt caching and thinking through the AI SDK — NOT RUN

**Not run.** `ANTHROPIC_API_KEY` is not set on this machine, and obtaining one
was out of scope. The direct Anthropic tier (`--provider anthropic/<model>`)
cannot be exercised without it. Nothing in `runtime/src` was modified for this
spike.

### Commands to run when a key is available

```bash
cd <repo root>
export ANTHROPIC_API_KEY=...

# Seed a temp vault with acme.md and matters/beta.md, then run the SAME
# prompt twice with a ~2,400-word system prompt.
SYS="$(cat primitives/evaluate.md)"

for i in 1 2; do
  bun runtime/src/cli.ts step --vault <vault> \
    --provider anthropic/claude-opus-5 \
    --system "$SYS" \
    "List the vault root and read acme.md"
done
```

Then, to see whether cache metadata reaches us, temporarily add one line to the
`case 'finish':` branch of `runtime/src/providers/direct.ts`:

```ts
case 'finish': {
  console.error(JSON.stringify(part));   // TEMPORARY — remove after the spike
  const usage = part.totalUsage;
```

Run the pair again and look for
`providerMetadata.anthropic.cacheReadInputTokens` on the second run. **Remove
the debug line afterwards.**

Then check that extended thinking is accepted by the installed provider, by
adding to the `streamText({ … })` call:

```ts
providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: 2048 } } },
```

### Static evidence gathered instead

Read from the installed packages (`@ai-sdk/anthropic` 4.0.44, `ai` 7.0.83) —
this is type-level evidence, not a live result:

- `node_modules/@ai-sdk/anthropic/dist/index.d.ts:36-45` declares
  `cacheCreationInputTokens?: number` and `cacheReadInputTokens?: number` on the
  per-iteration usage type, so the numbers exist in the provider's own shape.
- `anthropicLanguageModelOptions` (same file, lines 200-224) accepts
  `thinking: { type: 'enabled', budgetTokens?: number }` (also `adaptive` and
  `disabled`), and `cacheControl: { type: 'ephemeral', ttl?: '5m' | '1h' }`.
  So the `providerOptions` shape in the brief is valid for this version.
- **`DirectProvider.run()` passes no `providerOptions` at all today.** Caching
  and thinking are therefore both off on the direct tier as written,
  independent of whether the key is present. `capabilities` for the `anthropic`
  vendor nonetheless advertises `caching: true, thinking: true` — that is a
  claim the code does not yet honor.

### What the next plan should assume — 9.1

- Treat the direct tier's `caching` and `thinking` capabilities as
  **unverified**. Do not build a cost model on them until this spike runs.
- Whatever wires `providerOptions` will need a per-vendor shape — `thinking`
  and `cacheControl` are Anthropic-specific keys, so the `DirectProvider`
  constructor should take them rather than hard-coding an Anthropic block into
  a shared `streamText` call.
- The harness tiers already cache. The Claude harness result showed
  `cache_read_input_tokens: 1195` and `cache_creation_input_tokens: 1316` on a
  step whose reported `input_tokens` was 4. Direct-tier caching is a cost
  question for the direct tier only, not a blocker for the counsel loop.

---

## Defects found in the runtime by the spikes

Recorded, not fixed.

1. **`z.toJSONSchema()` output is rejected by both harnesses.** Claude fails on
   the `$schema` draft-2020-12 key; Codex fails on `additionalProperties: {}`.
   Both `--schema` paths are unusable as shipped. One shared sanitizer fixes
   both. (`runtime/src/providers/claude-harness.ts` `buildQueryOptions`,
   `runtime/src/providers/codex-harness.ts` `CodexHarnessProvider.run`.)
2. **Codex MCP tool calls are always denied.** `buildCodexConfig` does not set
   `mcp_servers.counsel.default_tools_approval_mode`, so the thread's default
   `approvalPolicy: 'never'` denies every call with *"MCP tool call requires
   approval, but approval policy is never"*. `"approve"` is the working value;
   `"auto"` is not. The step still exits 0 with a plausible-sounding wrong
   answer, so this is a silent failure. (`runtime/src/providers/codex-harness.ts`.)
3. **`ClaudeHarnessProvider.run()` throws instead of yielding an `error`
   event.** When the underlying CLI exits non-zero (spike 9.3-B), the exception
   propagated out of the async generator: the CLI printed a stack trace and
   **zero** JSON lines, which breaks the documented "prints StepEvents as JSON
   lines" contract. `CodexHarnessProvider.run()` already wraps its body in
   try/catch for exactly this; the Claude provider needs the same.
4. **Claude `done.usage.inputTokens` under-reports by ~600×.** `mapClaudeMessage`
   reads only `usage.input_tokens`. The 9.3-B result carried
   `input_tokens: 4, cache_read_input_tokens: 1195, cache_creation_input_tokens: 1316`
   and we reported `inputTokens: 4`. Any budget, quota, or context-pressure
   check built on this number will be wrong. The result also carries a
   `modelUsage` map showing a second model (`claude-haiku-4-5`) billed inside the
   same step, which our single `usage` object cannot express.
5. **A failed Codex turn emits two terminal `error` events.** `mapCodexEvent`
   maps the `error` event and the following `turn.failed` event separately, so
   the CLI printed the same 400 twice. Consumers that stop at the first
   terminal event are fine; consumers that drain the stream see a duplicate.
6. **Vault tool descriptions do not state that paths are vault-relative.** Both
   Codex runs opened with `vault_list {"dir": "/"}` and had to recover from
   `path outside vault: /`. Cheap fix in `vault-tools.ts`; it costs a wasted
   tool call per run today.

## Throwaway artifacts

Two probe scripts were written outside the repo (in the session scratchpad) to
disambiguate the failures above. They re-import the real
`buildQueryOptions` / `mapClaudeMessage` / `buildCodexConfig` /
`buildThreadOptions` / `buildCodexEnv` / `mapCodexEvent` and change exactly one
thing each. Nothing under `runtime/src` was modified for any spike.

---

## Step 2 — resume

Task 1 (`runtime: provider session hook`). Question: does a session captured
from one `step` actually let a second, independent `step` invocation resume
it — Claude via `Options.resume`, Codex via `codex.resumeThread(id, ...)` with
a persistent `CODEX_HOME` — and recall something only the first turn was told?

Budget: 2 Claude calls + 2 Codex calls, both used, none retried. Driver: the
Task 1 CLI additions — `--session <id>` (both harnesses; parsed into
`session: { id }` on the `StepRequest`), `--codex-home <dir>` (threaded to
`CodexHarnessProvider`'s new persistent `homeDir` option), `--cwd <dir>`
(debug-only pin for the Claude harness's temp cwd — added per the brief in
case resume needed a stable cwd; turned out not to be needed, see below).

Same temp vault as spikes 9.x: `acme.md` (root) + `matters/beta.md`.

### Claude — `claude-sub/claude-opus-5`

Call 1 — no `--session`, fresh temp cwd (as always):

```bash
bun runtime/src/cli.ts step --vault <vault> --provider claude-sub/claude-opus-5 \
  "Remember the word pineapple."
```

```json
{"type":"session","id":"4e0914a9-9d0c-465b-9e7c-569029f9405b"}
{"type":"text","text":"Got it — pineapple. I'll keep it in mind for this conversation."}
{"type":"done","output":"Got it — pineapple. I'll keep it in mind for this conversation.","usage":{"inputTokens":1335,"outputTokens":26,"costUsd":0.014967},"sessionId":"4e0914a9-9d0c-465b-9e7c-569029f9405b"}
```

Call 2 — `--session <id from call 1>`, deliberately **no** `--cwd` (a brand
new `mkdtempSync` cwd, different from call 1's):

```bash
bun runtime/src/cli.ts step --vault <vault> --provider claude-sub/claude-opus-5 \
  --session 4e0914a9-9d0c-465b-9e7c-569029f9405b \
  "What word did I ask you to remember?"
```

```json
{"type":"session","id":"4e0914a9-9d0c-465b-9e7c-569029f9405b"}
{"type":"text","text":"Pineapple."}
{"type":"done","output":"Pineapple.","usage":{"inputTokens":1400,"outputTokens":8,"costUsd":0.0015265},"sessionId":"4e0914a9-9d0c-465b-9e7c-569029f9405b"}
```

**PASS.** `resume` worked on the first try, with a *different* cwd on the
second call — the `--cwd` debug option the brief anticipated needing was not
needed here; the CLI resolves and reuses the same `session_id` and the model
answers "Pineapple." with no re-derivation available (nothing else in the
prompt mentions the word). `--cwd` is kept in `cli.ts` regardless, since the
brief calls it a useful debug option and this is one data point, not a proof
it's never needed on another machine or CLI version.

### Codex — `codex-sub/gpt-5.6-terra`

Call 1 — fresh `--codex-home $(mktemp -d)`:

```bash
CHOME=$(mktemp -d)
bun runtime/src/cli.ts step --vault <vault> --provider codex-sub/gpt-5.6-terra \
  --codex-home "$CHOME" "Remember the word pineapple."
```

```json
{"type":"session","id":"01a04ac7-79d1-71d2-b101-5b85650e4cda"}
{"type":"text","text":"I'll save that in your vault."}
{"type":"tool_call","id":"item_1","name":"vault_list","input":{"dir":"."}}
{"type":"tool_call","id":"item_2","name":"vault_read","input":{"path":"acme.md"}}
{"type":"tool_call","id":"item_3","name":"vault_write","input":{"path":"acme.md","content":"# Acme Corp\n\n- Remember: pineapple.\n", ...}}
{"type":"text","text":"Remembered: pineapple."}
{"type":"done","output":"Remembered: pineapple.","usage":{"inputTokens":62601,"outputTokens":323},"sessionId":"01a04ac7-79d1-71d2-b101-5b85650e4cda"}
```

(The model chose to persist the word into the vault via `vault_write` on its
own initiative — not requested — which matters for reading call 2 below.)

Confirmed `$CHOME` was not removed after call 1 (`resolveCodexHome`'s
`ephemeral: false` path): `ls "$CHOME"` afterward showed `auth.json`,
`sessions`, `thread_history_1.sqlite`, and other live Codex state, seeded from
the real `~/.codex/auth.json`.

Call 2 — same `--codex-home "$CHOME"`, `--session <thread_id from call 1>`:

```bash
bun runtime/src/cli.ts step --vault <vault> --provider codex-sub/gpt-5.6-terra \
  --codex-home "$CHOME" --session 01a04ac7-79d1-71d2-b101-5b85650e4cda \
  "What word did I ask you to remember?"
```

```json
{"type":"session","id":"01a04ac7-79d1-71d2-b101-5b85650e4cda"}
{"type":"text","text":"I'll check the vault."}
{"type":"tool_call","id":"item_1","name":"vault_search","input":{"query":"Remember"}}
{"type":"tool_call","id":"item_2","name":"vault_search","input":{"query":"pineapple"}}
{"type":"tool_call","id":"item_3","name":"vault_list","input":{"dir":"."}}
{"type":"tool_call","id":"item_4","name":"vault_read","input":{"path":"acme.md"}}
{"type":"text","text":"Pineapple."}
{"type":"done","output":"Pineapple.","usage":{"inputTokens":66743,"outputTokens":299},"sessionId":"01a04ac7-79d1-71d2-b101-5b85650e4cda"}
```

**PASS, with a caveat.** The thread resumed (same `sessionId` echoed back,
`inputTokens` rose from 62,601 → 66,743 — consistent with the prior turn's
history being carried forward rather than a fresh thread) and the model
answered "Pineapple." correctly. But unlike Claude's call 2, the model didn't
answer straight from conversational memory — it re-verified by searching and
re-reading the vault file it had itself written in call 1. That file is the
only place "pineapple" appears outside the resumed thread's own history, so
this run does not by itself distinguish "the resumed thread remembers the
word" from "the model is cautious and always checks the vault before
answering." The `sessionId` continuity and the input-token growth are still
real, positive evidence that `resumeThread` is wiring up the same thread
rather than starting a new one; a cleaner follow-up (ask something the
resumed turn could only answer from conversational memory, with nothing
written to the vault) is one call outside this task's two-call Codex budget
and is left for a future spike if the loop's fast-follow needs stronger proof.

### Verdict

| Side | Result |
|---|---|
| Claude `resume` | **PASS** — clean recall, no `--cwd` needed |
| Codex `resumeThread` + persistent `CODEX_HOME` | **PASS** (with the vault-read caveat above) — same `sessionId`, thread state carried forward, correct answer |

No retries were needed on either side; the 2+2 call budget was used exactly
once per side.

---

## Step 2 — server, resume, proposals, adapter

Task 9. Question: does the whole stack work end to end against real
providers — the HTTP/SSE server, per-provider session resume across two
steps of one thread, the propose-then-approve write gate, and the plugin
adapter's exit-code contract?

Budget: 4 subscription calls (2 Claude, 2 Codex), all 4 used, none retried.
Ollama covered the rest.

### Setup

A fresh temp vault, marked and fictional:

```
<vault>/config.md                      # counsel-os-config: true, legal_root: <vault>
<vault>/practice/profile.md            # Wren Halloway, Halloway Law PLLC (fictional solo practice)
<vault>/practice/standards/nda.md      # two NDA positions
<vault>/matters/acme.md                # Acme Robotics reseller agreement, deadline 2026-09-15
```

The server ran with `COUNSEL_OS_HOME` pointed at a temp directory, so it
never touched the real `~/.counsel-os/runtime.json`:

```bash
COUNSEL_OS_HOME=<home> bun runtime/src/cli.ts serve --vault <vault>
# counsel-os runtime on http://127.0.0.1:7431 (vault: <vault>)
```

`<home>/runtime.json` appeared with mode `0600`:

```json
{ "port": 7431, "token": "<64 hex chars>", "vault": "<vault>", "pid": 9334,
  "startedAt": "2026-08-29T02:31:52.915Z" }
```

`GET /health` (bearer token from that file) listed all three builtin
providers and `"default": "claude-sub/claude-opus-5"`. The same request
without the header returned **401**.

Every step below used:

```bash
curl -sN -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  --data-binary '{"message":"…","provider":"…"}' \
  "http://127.0.0.1:$PORT/threads/$TID/steps"
```

### (a) Claude — resume across two steps · PASS

Thread `9b79cf78`, provider `claude-sub/claude-opus-5`.

Step 1 — `"Remember the codeword 'tangerine' for this thread."` (3.0 s):

```
event: text
data: {"type":"text","text":"Got it — the codeword for this thread is **tangerine**.",…}
event: done
data: {"type":"done","output":"Got it …","usage":{"inputTokens":12878,"outputTokens":22,"costUsd":0.130304},
       "sessionId":"386d84be-b4e7-4d23-a36e-aeb82c5d33c0","runId":"9837478b-…"}
```

The thread header then held the session:

```json
{ "id": "9b79cf78-…", "sessions": { "claude-sub/claude-opus-5": "386d84be-b4e7-4d23-a36e-aeb82c5d33c0" } }
```

Step 2 — `"What codeword did I give you?"` (2.5 s):

```
event: text
data: {"type":"text","text":"The codeword you gave me is **tangerine**.",…}
event: done
data: {"type":"done","usage":{"inputTokens":12937,"outputTokens":18,"costUsd":0.007488},
       "sessionId":"386d84be-b4e7-4d23-a36e-aeb82c5d33c0","runId":"cbfcaac6-…"}
```

**PASS.** How the resume was verified — four independent signals, since no
event says "this request carried a session id":

1. The header carried the id **before** step 2 ran (shown above).
2. Step 2 recalled `tangerine`. The word appears nowhere in the vault, the
   system prompt, or step 2's own message, so only the vendor-side session
   could supply it.
3. The thread log holds **no `warning` event**. `runStep` appends
   `session expired; replaying history` whenever the resume attempt fails and
   it falls back to replaying the window. Its absence means the resume
   attempt stood.
4. `done.sessionId` on step 2 equals step 1's id, and `inputTokens` moved
   only 12,878 → 12,937 (+59) — a new turn on a live session, not a replayed
   two-turn window.

The full thread log, in order: `user`, `step`, `text`, `done`, `user`,
`step`, `text`, `done` — one `step` event per request, each naming its
provider and `runId`.

### (b) Codex — resume across two steps · PASS

Thread `8961dec6`, provider `codex-sub/gpt-5.6-terra`.

Step 1 (5.3 s):

```
event: text
data: {"type":"text","text":"I’ll remember “tangerine” for this thread.",…}
event: done
data: {"type":"done","usage":{"inputTokens":18281,"outputTokens":34},
       "sessionId":"01a04b5e-73dc-7011-9df9-4ef6285e949b","runId":"54e7fd42-…"}
```

Step 2 (3.1 s):

```
event: text
data: {"type":"text","text":"Tangerine.",…}
event: done
data: {"type":"done","usage":{"inputTokens":25086,"outputTokens":8},
       "sessionId":"01a04b5e-73dc-7011-9df9-4ef6285e949b","runId":"64be9481-…"}
```

**PASS**, and cleaner than the Task 1 spike above: the model answered from
conversational memory with **zero** tool calls, so this run does distinguish
"the resumed thread remembers" from "the model re-read the vault". The Task 1
caveat is now retired. No `warning` event, same `sessionId`, `inputTokens`
18,281 → 25,086 (the prior turn carried forward).

**Where the Codex home actually landed:** `ThreadStore.codexHomeFor(id)`
returns `join(this.codexHomeRoot, id)`, and `codexHomeRoot` defaults to
`join(homedir(), '.counsel-os', 'codex')`. `serve.ts` constructs
`new ThreadStore(vaultRoot)` with **no** `codexHomeRoot` option, so the
directory was created at

```
~/.counsel-os/codex/8961dec6-0c7d-47f7-8042-8a518e8cb4b5/
```

— in the developer's real home, **not** under `COUNSEL_OS_HOME`. It held
`auth.json`, `sessions/`, `thread_history_1.sqlite`, and the rest of a live
Codex home. The session id round-tripped into the rollout file name:

```
sessions/2026/08/28/rollout-2026-08-28T19-34-36-01a04b5e-73dc-7011-9df9-4ef6285e949b.jsonl
```

Session storage works. The location ignores the environment override — see
defect 1. The directory was removed after the run.

### (c) Ollama — vault tools · PASS

Thread `8aaedd7a`, provider `ollama/gemma4:e4b`, one step:
`"List the vault root and read matters/acme.md, then summarize the deadline"`.
28.8 s wall-clock.

```json
{"type":"tool_call","name":"vault_read","input":{"path":"matters/acme.md"}}
{"type":"tool_call","name":"docket_sweep","input":{"days":60}}
{"type":"tool_result","name":"vault_read","output":{"content":"# Matter: Acme Robotics — reseller agreement…"},"isError":false}
{"type":"tool_result","name":"docket_sweep","output":{"stdout":"{\"today\":\"2026-08-28\",\"window\":60,\"counts\":{…}}"},"isError":false}
{"type":"done","usage":{"inputTokens":16659,"outputTokens":1139}}
```

Answer (abridged): *"the specific, critical deadline for the Acme Robotics
matter is **September 15, 2026** … Borealis Components LLC plans to withdraw
its pricing afterward."*

**PASS** on the graded behavior: the vault tools attached over HTTP, both
calls returned `isError:false`, and the deadline summary is correct.

One deviation from the expected shape: the model never called `vault_list`.
It read the named file directly and reached for `docket_sweep` instead, then
asserted *"the current directory context is treated as the vault root"*
without having listed anything. `docket_sweep` proves the platform script
tools reach the model through the server, which the prompt did not ask for.

### (d) Proposal gate · PASS

Thread `dd166299`, provider `ollama/gemma4:e4b` (free tier, per the brief).
Step: `"Update practice/standards/nda.md to add a position: term of
confidentiality is 3 years."` 14.0 s.

```json
{"type":"tool_call","name":"vault_read","input":{"path":"practice/standards/nda.md"}}
{"type":"tool_call","name":"propose_update","input":{"path":"practice/standards/nda.md",
  "content":"# NDA standards\n\n## Positions\n\n- Mutual by default…\n- Carve-outs…\n- Term of confidentiality: 3 years.",
  "rationale":"Proposed update to reflect the standard 3-year term…"}}
{"type":"tool_result","name":"propose_update","output":"{\"proposalId\":\"284689ff-0c54-44f1-a3c6-c7137c682e56\"}","isError":false}
{"type":"done","usage":{"inputTokens":24970,"outputTokens":893}}
```

The thread log carried the proposal, pending, with the path's version at
proposal time:

```json
{"t":"proposal","id":"284689ff-…","path":"practice/standards/nda.md","status":"pending",
 "expectedVersion":"64a7bfe4cca650c41b87d74a4c68dd9771e561317ba21a253c6f0886cd37b01d"}
```

`practice/standards/nda.md` was **byte-identical** to before the step
(`shasum` `ccc573c4…` before and after). The gate held.

Approve:

```bash
curl -X POST … -d '{"proposalId":"284689ff-…","decision":"approve"}' \
  "http://127.0.0.1:$PORT/threads/$TID/approve"
```

```json
{ "proposal": { "status": "approved", "path": "practice/standards/nda.md" },
  "version": "ed8abed66b10be053b05a4e89293e11ca66f44629de5c354934c439dffd91e01" }
```

The file then held the proposal content verbatim, `shasum` `db739d34…`, with
the new position appended. The proposal event in the log reads
`"status":"approved"`. A **second** approve of the same proposal returned
**409** and wrote nothing.

**PASS.** Propose does not write, approve does, and the decision is
idempotent.

### (e) Plugin adapter · PASS

`scripts/runtime_step.sh` was exercised against a server whose router default
was set to `ollama/gemma4:e4b`, so the adapter's own step cost no
subscription call. (Setting that default required writing
`~/.counsel-os/providers.yaml` in the real home — see defect 2. The file was
removed afterwards.)

Server **running** (11 s):

```bash
COUNSEL_OS_HOME=<home> CLAUDE_SESSION_ID=task9-smoke bash scripts/runtime_step.sh "What matters do I have?"
# exit 0
# stdout: 380 bytes of prose
# stderr: "→ tool vault_search"
```

The adapter created its own thread (`f13ed831-…`) and cached the id at
`$TMPDIR/counsel-os-thread-task9-smoke`. Exit **0**, text on stdout, the tool
trace on stderr where it belongs.

Server **stopped** (`SIGTERM`, `runtime.json` removed by the signal handler):

```
exit 3   stdout 0 bytes   stderr 0 bytes
```

A **stale** `runtime.json` (a hand-written file naming a dead pid and a
closed port) behaved the same way: exit **3**, both streams empty — the
`/health` probe caught it.

**PASS** on all three arms of the exit-code contract.

Content note, not an adapter defect: `gemma4:e4b` answered *"I didn't find
any currently recorded matters"* after searching for the string
`counsel-os-type: matter`. The vault does contain `matters/acme.md`. The
model invented a frontmatter marker the system prompt never mentions, rather
than listing `matters/`, which the preamble does name. The adapter relayed
that answer faithfully.

### Usage and wall-clock

Wall-clock is measured at `curl`; `durationMs` is the run log's own number.

| # | Provider | Wall | `durationMs` | in / out tokens | costUsd |
|---|---|---|---|---|---|
| (a) 1 | `claude-sub/claude-opus-5` | 3.0 s | **9** | 12,878 / 22 | 0.130304 |
| (a) 2 | `claude-sub/claude-opus-5` | 2.5 s | **7** | 12,937 / 18 | 0.007488 |
| (b) 1 | `codex-sub/gpt-5.6-terra` | 5.3 s | **20** | 18,281 / 34 | — |
| (b) 2 | `codex-sub/gpt-5.6-terra` | 3.1 s | **12** | 25,086 / 8 | — |
| (c) | `ollama/gemma4:e4b` | 28.8 s | 9,148 | 16,659 / 1,139 | — |
| (d) | `ollama/gemma4:e4b` | 14.0 s | 9,281 | 24,970 / 893 | — |
| (e) | `ollama/gemma4:e4b` | 11 s | 3,730 | 16,348 / 684 | — |

Two things stand out. The `durationMs` column is wrong on every row (defect
3). And the system prompt is now the floor of every step: ~12.9 k input
tokens on Claude for a two-sentence exchange, against ~1.3 k in the Task 1
resume spike, because `assembleSystemPrompt` prepends the host preamble plus
the whole 27 KB `skills/counsel/SKILL.md`. Codex's first call cost $0.13 on
Claude and 18 k input tokens on Codex for the same reason.

### Verdict

| Smoke | Result |
|---|---|
| (a) Claude resume across two steps | **PASS** |
| (b) Codex resume across two steps | **PASS** — and the Task 1 vault-read caveat is retired |
| (c) Ollama vault tools over the server | **PASS** — `vault_read` + `docket_sweep`; no `vault_list` |
| (d) Propose → no write → approve → write | **PASS** — double-approve is 409 |
| (e) Adapter exit 0 / 3 (live, stopped, stale) | **PASS** |

The server, the loop, the session hook, the proposal gate, and the adapter
all work end to end against real providers.

### Defects found — Step 2

Recorded, not fixed.

1. **Codex thread homes ignore `COUNSEL_OS_HOME`.** `serve.ts` builds
   `new ThreadStore(vaultRoot)` with no `codexHomeRoot`, and the store's
   default is `join(homedir(), '.counsel-os', 'codex')`. A server started
   with `COUNSEL_OS_HOME=<temp>` still wrote
   `~/.counsel-os/codex/<threadId>/` — including a copy of `auth.json` —
   into the real home. `serve.ts` already has `counselHome(env)` for
   `runtime.json`; the store is simply not given it. Two costs: a test or a
   sandboxed run cannot be isolated, and credentials land somewhere the
   operator did not point at.
   (`runtime/src/server/serve.ts`, `runtime/src/threads/store.ts`.)
2. **The provider registry ignores `COUNSEL_OS_HOME` too.**
   `DEFAULT_REGISTRY_FILE` is `join(homedir(), '.counsel-os', 'providers.yaml')`,
   not `counselHome(env)`. Overriding the default provider for this smoke
   required writing into the developer's real home. Same one-line family as
   defect 1. (`runtime/src/providers/registry.ts`.)
3. **Run-log `durationMs` measures almost nothing.** `stream()` starts its
   clock **after** `beginAttempt()` has already awaited the provider's first
   non-`session` event — which, on both harnesses, is the whole model turn.
   Claude steps of 3.0 s and 2.5 s logged `durationMs` of **9** and **7**;
   Codex steps of 5.3 s and 3.1 s logged **20** and **12**. The Ollama rows
   are wrong by a smaller factor (28.8 s wall → 9,148 ms) because that tier
   streams early. Any latency or cost report built on this field is wrong by
   two orders of magnitude on the harness tiers. The clock belongs at the top
   of `runStep`, not inside `stream`. (`runtime/src/loop/counsel-loop.ts`.)
4. **The thread log stores one `text` event per Ollama token.** SSE
   coalescing lives in `sseFromEvents`, downstream of `store.append`, so the
   log keeps the raw deltas: smoke (c) wrote **177** `text` events / 13 KB of
   JSONL for one ~800-character answer, while the client saw 45 coalesced
   frames. `window()` re-joins consecutive `text` events, so replay is
   correct — this is size and client ergonomics, not correctness. But every
   consumer of `GET /threads/:id` now has to redo the coalescing the SSE
   layer already does. (`runtime/src/loop/counsel-loop.ts` `stream`,
   `runtime/src/server/sse.ts`.)
5. **No `proposal` frame on the SSE stream.** The proposal reaches the thread
   log and `GET /threads/:id`, but a client watching only the step's stream
   sees an ordinary `tool_call` / `tool_result` pair for `propose_update`. To
   render the diff and to get the `proposalId` that `POST /approve` requires,
   it must parse the tool call's arguments or re-`GET` the whole thread.
   Spec §4.4's approve flow is reachable but not streamable.
   (`runtime/src/loop/counsel-loop.ts`, `runtime/src/server/sse.ts`.)

### What the next plan should assume — Step 2

- The stack is viable end to end. Nothing here blocks the API or the adapter.
- **Fix the three `homedir()` call sites together** (defects 1 and 2). One
  shared `counselHome(env)` helper, passed into `ThreadStore` and
  `loadRegistry`, closes both — and makes the runtime testable without
  writing to the developer's home.
- **Do not report `durationMs` to a user until defect 3 is fixed.** It is not
  slightly off; it is off by ~300× on the Claude tier.
- **The system prompt is the dominant cost of a small step.** 12.9 k input
  tokens before the user says anything. If short exchanges matter, the
  preamble plus `SKILL.md` needs trimming, or the harness tiers need prompt
  caching that our usage numbers can actually see (spike 9.x defect 4 is
  still open).
- **A UI needs the proposal as a first-class frame** (defect 5), or it will
  reverse-engineer the gate out of tool-call arguments.
