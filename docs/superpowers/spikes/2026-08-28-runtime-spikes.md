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
