# Loop Trust and Evals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-step timeout, a live `proposal` event, an inspectable run record with a read-only API, typed answers on demand, and an evals runner that scores the counsel loop on any provider.

**Architecture:** All five land inside the existing loop/server: the timeout races the provider iterator inside `runStep`; the `proposal` event is synthesized from the `propose_update` tool result; the run record is derived from events the loop already sees; typed answers reuse `outputSchema`; the evals runner drives the existing `step` CLI. No flow engine, no gates.

**Tech Stack:** Bun 1.3.x, TypeScript, `bun test`, zod 4, Python 3 (`scripts/run_evals.py`), existing `runtime/`.

**Spec:** `docs/superpowers/specs/2026-08-29-loop-trust-and-evals-design.md`

## Global Constraints

- Providers and the loop yield events, never throw; every step ends with `done` or `error`.
- No new model-reachable write path; `.counsel/` stays runtime-only.
- No flow engine, gates, or contract-shaped structure. The runtime never chooses an output schema; clients do.
- Markdown under `skills/`, `primitives/`, `knowledge/` unchanged except the one preamble line lives in code (`runtime/src/loop/prompt.ts`), not in the skill.
- Tests beside source; commit messages `runtime: <what>` (`plugin:` / `evals:` / `docs:` where apt); no Co-Authored-By trailer.
- Live calls only in Task 6 (≤ 2 subscription calls; Ollama free).

---

## File structure

```
runtime/src/
  core/types.ts              + StepEvent 'proposal' variant (modify)
  loop/
    counsel-loop.ts          + timeout race, proposal synthesis, run record start/finish (modify)
    run-record.ts            RunRecord read/write (new)
    run-record.test.ts
    prompt.ts                + typed-answer preamble line (modify)
  providers/registry.ts      + stepTimeoutMs (modify)
  server/
    routes.ts                + /runs, outputSchema on StepBody (modify)
    serve.ts                 + --step-timeout / stepTimeoutMs dep (modify)
    sse.ts                   + proposal frame passthrough (modify if needed)
  cli.ts                     + --step-timeout (modify)
scripts/runtime_step.sh      + proposal line (modify)
scripts/run_evals.py         + --runner runtime (modify)
scripts/eval_runtime_runner.py  parse CLI JSON lines (new, unit-testable)
scripts/eval_runtime_runner_test.py
evals/findings.schema.json   (new)
package.json                 + evals:runtime script (modify)
```

---

### Task 1: Step timeout

**Files:** modify `runtime/src/loop/counsel-loop.ts`, `counsel-loop.test.ts`, `runtime/src/providers/registry.ts`, `registry.test.ts`, `runtime/src/server/serve.ts`, `serve.test.ts`, `runtime/src/server/routes.ts`, `routes.test.ts`, `runtime/src/cli.ts`.

**Interfaces:**
- `CounselLoopDeps.stepTimeoutMs?: number` (default 600_000); `RunStepOptions.timeoutMs?: number` overrides.
- `loadRegistry` reads optional top-level `stepTimeoutMs` from `providers.yaml` and returns it (`{ providers, router, defaultId, stepTimeoutMs? }`).
- `startServer({ stepTimeoutMs? })`; CLI `serve --step-timeout <ms>` and `step --step-timeout <ms>`.
- Timeout event message: `step timed out after ${Math.round(ms/1000)}s`.

- [ ] **Step 1: Failing loop test.** A fake provider whose `run()` yields `text 'a'` then `await new Promise(() => {})` (never resolves). `runStep(..., { timeoutMs: 50 })` → events end with `error` matching /timed out after/, the thread log has `user, step, text('a'), error`, and a `finally` flag on the fake shows its iterator was closed. Run → FAIL.
- [ ] **Step 2: Implement** in `counsel-loop.ts`: a `deadline` (`Date.now() + timeoutMs`); in the manual `next()` loop (`chain()` / `stream()`), `await Promise.race([it.next(), sleepUntil(deadline)])`; on expiry: `await closeQuietly(it)`, flush buffered text, `tryPersist(error)`, yield the error, return. Use an injectable `now`/`setTimeout` only if the existing code already has one; otherwise a real 50 ms timer is fine in the test. Run → PASS.
- [ ] **Step 3: Server test.** `createApp` with `stepTimeoutMs: 50` and the hanging fake: SSE ends with `error` (timed out); immediately `POST` a second step on the same thread with a normal fake → 200 and `done` (lock released). Implement `stepTimeoutMs` in `ServerDeps` → `CounselLoopDeps`. Run → PASS.
- [ ] **Step 4: Registry + serve + CLI.** `stepTimeoutMs` in `RegistryFile` (zod, positive int), returned by `loadRegistry`; `startServer` precedence: option > registry > default; CLI flags. Tests: registry parses it; `serve.test.ts` `/health` includes `stepTimeoutMs`.
- [ ] **Step 5: Typecheck, full tests, commit.** `runtime: per-step timeout — closes the provider, releases the lock, terminal error`

---

### Task 2: `proposal` event

**Files:** modify `runtime/src/core/types.ts`, `runtime/src/loop/counsel-loop.ts` + test, `runtime/src/server/sse.ts` + test (only if the frame writer filters by type), `runtime/src/server/routes.test.ts`, `scripts/runtime_step.sh` + `scripts/runtime_step.test.ts`.

**Interfaces:** `StepEvent` gains `{ type: 'proposal'; id: string; path: string; rationale: string }`. Loop: after appending a `tool_result` with `name === 'propose_update'` and `isError !== true`, parse `output` (string JSON or object) for `proposalId`; look up the matching `tool_call` by id for `input.path`/`input.rationale`; yield the `proposal` event (do not append it — the ThreadEvent already exists). `window()` must ignore it (it has `type`, not text — confirm).

- [ ] **Step 1: Failing loop test.** Fake with a scripted `propose_update` call against a temp vault → events contain `proposal` with the right `path` and an `id` equal to the thread log's proposal event id. Run → FAIL.
- [ ] **Step 2: Implement; PASS.**
- [ ] **Step 3: Server + adapter.** `routes.test.ts`: the SSE frames for that step include `event: proposal`. `runtime_step.sh`: on `proposal` print `→ proposal <path> (<id>)` to stderr; test asserts it. Run → PASS.
- [ ] **Step 4: Commit.** `runtime: proposal event on the step stream`

---

### Task 3: Run record + `/runs` API

**Files:** create `runtime/src/loop/run-record.ts` + test; modify `counsel-loop.ts` + test, `routes.ts` + test.

**Interfaces:**
```ts
interface RunRecord { runId; threadId; tenant; startedAt; finishedAt?; status: 'running'|'done'|'error'|'timeout'; message; provider; task?; primitivesRead: string[]; toolCalls: ToolCallLog[]; proposals: string[]; output?: unknown; usage?: Usage; costUsd?: number; durationMs?: number; error?: string }
startRun(vaultRoot, rec): void   // writes .counsel/runs/<tenant>/<runId>.json (tmp+rename)
finishRun(vaultRoot, tenant, runId, patch): void
readRun(vaultRoot, tenant, runId): RunRecord | null
listRuns(vaultRoot, tenant, threadId): RunRecord[]   // newest first by startedAt
```
Validation as in `run-log.ts`. Loop: `startRun` before resolving the provider (status running, provider filled once resolved); `finishRun` on `done` (status done, output when a schema was given), `error` (status error, `error` text), timeout (status timeout). Derived `primitivesRead` from `read_primitive` tool calls' `input.name`; `proposals` from Task 2's events. Write failures → stderr only.

- [ ] **Step 1: Failing tests** for `run-record.ts` (write/read/list order/validation) and loop integration (done/error/timeout statuses; `primitivesRead` and `proposals` populated). Run → FAIL. **Step 2: Implement; PASS.**
- [ ] **Step 3: Routes.** `GET /runs?thread=` (400 missing, 404 unknown thread, list), `GET /runs/:runId` (404 unknown, 400 malformed). Tests. PASS.
- [ ] **Step 4: Commit.** `runtime: run record per step and read-only /runs API`

---

### Task 4: Typed answers on the API + preamble line

**Files:** modify `routes.ts` + test, `runtime/src/loop/prompt.ts` + test (+ snapshot).

- [ ] **Step 1: Failing tests.** `POST …/steps { message, outputSchema: {type:'object', properties:{files:{type:'array',items:{type:'string'}}}, required:['files']} }` with a fake that yields `done.output = { files: ['a'] }` → the SSE `done` frame carries `output`; an invalid schema (`{ type: 'nope' }`) → 400. Prompt test: preamble contains the typed-answer sentence. Run → FAIL.
- [ ] **Step 2: Implement.** `StepBody.outputSchema: z.record(z.string(), z.unknown()).optional()` → `z.fromJSONSchema` in a try → 400 on throw; pass `outputSchema` into `runStep`. Preamble line (in `HOST_PREAMBLE`): "If the request carries an output schema, do the work with the primitives first, then give the final answer in exactly that structure — nothing else in the final answer." PASS.
- [ ] **Step 3: Commit.** `runtime: outputSchema on the steps API; preamble typed-answer rule`

---

### Task 5: Evals runtime runner

**Files:** create `evals/findings.schema.json`, `scripts/eval_runtime_runner.py`, `scripts/eval_runtime_runner_test.py`; modify `scripts/run_evals.py`, `package.json`, `evals/README.md`.

**Interfaces:**
- `findings.schema.json`: `{ type:'object', properties:{ findings:{ type:'array', items:{ type:'object', properties:{ title:{type:'string'}, severity:{enum:['red','yellow','green']}, clause:{type:'string'}, rationale:{type:'string'}, citations:{type:'array', items:{type:'string'}} }, required:['title','severity','clause','rationale','citations'] } }, citations:{ type:'array', items:{type:'string'} } }, required:['findings','citations'] }`.
- `eval_runtime_runner.py`: `parse_step_lines(lines: list[str]) -> tuple[bool, dict|str]` — returns `(True, done.output)` or `(False, error message)`; `run_fixture(fixture, repo_root, vault, out_path, provider, timeout_s) -> tuple[bool, str]` — builds the `bun runtime/src/cli.ts step --vault <vault> --provider <provider> --schema evals/findings.schema.json "<task>"` command with `env COUNSEL_OS_LEGAL_ROOT=<vault>`, runs it, parses, writes the output JSON.
- `run_evals.py`: `--runner {claude,runtime}` (default claude), `--provider` (runtime only, default `ollama/gemma4:e4b`), `--step-timeout` (default 540); `generate_output` dispatches by runner. `package.json`: `"evals:runtime": "python3 scripts/run_evals.py --generate --runner runtime"`.

- [ ] **Step 1: Failing Python unit test** (`python3 -m pytest scripts/eval_runtime_runner_test.py` or a plain `python3 scripts/eval_runtime_runner_test.py` using `unittest`): canned transcript lines (`text`, `tool_call`, `done` with `output`) → `(True, output)`; transcript ending in `error` → `(False, msg)`; no terminal line → `(False, …)`. Run → FAIL. **Step 2: Implement; PASS.**
- [ ] **Step 3: Wire `run_evals.py`;** `python3 scripts/run_evals.py --self-test` still passes; `--generate --runner runtime --only <fixture> --provider fake/fake` is not possible (no fake in the CLI) — instead add `--dry-run` printing the command it would run and assert it in the unit test. Update `evals/README.md` (one section: running against the runtime). Add the CI-safe `evals:runtime` script (not added to CI — it needs a model).
- [ ] **Step 4: Commit.** `evals: runtime runner — score the counsel loop on any provider`

---

### Task 6: Live smokes and findings

**Files:** modify `docs/superpowers/spikes/2026-08-28-runtime-spikes.md` (append "Step 3 — timeout, proposal frame, runs, typed answers, evals").

- [ ] (a) Timeout: start `serve --step-timeout 15000` on a temp marked vault; `ollama/gemma4:26b` with a long request → SSE ends with `error` timed out; a second step on the thread succeeds. (b) Proposal frame: Ollama step asking to update `practice/standards/nda.md` → `event: proposal` seen; `GET /runs?thread=` shows the run with `proposals: [id]`, `primitivesRead` non-empty if `read_primitive` was called. (c) Typed answer: `outputSchema` = findings schema on a small NDA in `matters/` via Ollama → `done.output.findings` array. (d) Evals: `python3 scripts/run_evals.py --generate --runner runtime --only green-yellow-red-calibration --provider ollama/gemma4:26b` then score; and the same fixture on `claude-sub/claude-opus-5` (1 subscription call) — record both scores vs the baseline in `evals/baselines/`. Defects found → list, not fixed.
- [ ] Commit: `docs: step-3 live findings — timeout, proposal frame, runs, typed answers, evals`

## Self-review

Spec coverage: §3/4.1 → T1; §4.2 → T2; §4.3/4.4 → T3; §4.5 → T4; §4.6 + findings schema → T5; §6 live → T6. No placeholders. Types: `ToolCallLog` reused from `run-log.ts`; `proposal` StepEvent consumed by T3's `proposals` derivation and T2's adapter line.
