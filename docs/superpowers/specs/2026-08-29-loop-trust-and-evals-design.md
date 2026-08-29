# Loop trust and evals — design (build step 3)

Date: 2026-08-29
Status: approved in brainstorm
Parent spec: `2026-08-28-runtime-and-web-ui-design.md` — **supersedes its §5.2** (see §2)
Prior work: PR #21 (skeleton), PR #22 (counsel loop, server, adapter)

## 1. Goal

Make the counsel loop trustworthy and measurable without adding structure the
methodology does not have. Counsel OS is five composable primitives applied to legal
knowledge work — not a contract-review pipeline. The founder's rule (2026-08-29):
*do not impose structure where it is not absolutely necessary.*

Five deliverables:

1. **Step timeout** — a hung provider cannot hold a thread forever.
2. **`proposal` event** — proposals reach clients live on the step stream.
3. **Run record** — one inspectable record per user request: what counsel read, ran,
   proposed, produced, and cost. A record, not a pipeline.
4. **Evals through the loop** — the existing scorer runs against the runtime on any
   provider; this becomes the gate for prompt and primitive changes.
5. **Typed answers on demand** — a client may ask for structured output on any step;
   the runtime never decides what a "review" looks like.

## 2. What this supersedes

Parent spec §5.2 ("Flow engine — hero tasks": Review / Ingest markup / Compliance /
Docket as code-shaped step pipelines with per-clause user gates) is **withdrawn**. The
counsel loop is the engine; the primitives compose inside it as they do in the plugin.
Parent spec §6 (web UI) is re-read accordingly: chat + vault + run record + settings; no
"review run" screen. The Word-redline scripts remain tools the loop calls when the
primitives say so.

## 3. Decisions

| Decision | Choice | Why |
|---|---|---|
| Timeout scope | One deadline per step, enforced in the loop (`runStep`), default 600 s, configurable (`stepTimeoutMs` in `providers.yaml`; `--step-timeout` on `serve`) | The loop owns the provider iterator; closing it there releases the server's lock through the existing `finally` |
| Timeout semantics | On expiry: close the provider iterator, append + yield one terminal `error` ("step timed out after Ns"), run record `status: 'timeout'` | Spec §5 of step 2: never a dropped stream without a terminal event |
| `proposal` event | New `StepEvent` variant `{ type: 'proposal'; id; path; rationale }`, synthesized by the loop right after the `tool_result` of a successful `propose_update`; forwarded on SSE; NOT appended to the thread log (the `proposal` ThreadEvent already is) | Works for in-process (Claude, direct) and stdio (Codex) tools alike — both surface the tool result |
| Run record | `.counsel/runs/<tenant>/<runId>.json` written at step start (`status: 'running'`) and finalized at end; the `.log.jsonl` entry stays as the per-step telemetry line | Crash/timeout visibility; the UI's "what did counsel do" view |
| Run record shape | `{ runId, threadId, tenant, startedAt, finishedAt?, status, message, provider, task?, primitivesRead: string[], toolCalls: [{name, ms, isError}], proposals: string[], output?: unknown, usage?, costUsd?, durationMs?, error? }` | Everything is derived from events the loop already sees; no new model calls |
| Runs API | `GET /runs?thread=<id>` (list, newest first), `GET /runs/:runId` | Read-only |
| Typed answers | `POST /threads/:id/steps { outputSchema?: <JSON Schema> }` → `z.fromJSONSchema` → `StepRequest.outputSchema`; `done.output` carries the parsed object; preamble gains one line: when the request carries an output schema, do the work with the primitives first, then answer in exactly that structure | Already supported by the loop and CLI; this exposes it to clients without the runtime choosing a schema |
| Evals runner | `scripts/run_evals.py --generate --runner runtime [--provider <id>]` copies the fixture mini-vault, runs `bun runtime/src/cli.ts step --vault … --provider … --schema <findings schema> "<task>"`, takes `done.output` as the output JSON; default runner stays `claude` (unchanged) | Measures the methodology on Claude, Codex, and Ollama with the scorer that already exists |
| Findings schema | `evals/findings.schema.json` = the README's output schema (`findings[] {title, severity, clause, rationale, citations[]}`, `citations[]`) | One source for the scorer and the runner |
| Not built | Flow engine, gates, per-clause anything, redline viewer, resumable multi-step runs | Founder rule |

## 4. Interfaces

### 4.1 Timeout

```ts
interface RunStepOptions { …; timeoutMs?: number }   // default from deps.stepTimeoutMs ?? 600_000
```
Implementation: a deadline promise raced against each `next()` of the provider iterator
(not one race for the whole step — the loop must keep streaming). On expiry: `await
closeQuietly(it)`, flush buffered text, append `{ type:'error', message }`, finalize the
run record with `status:'timeout'`, yield the error, return.

Amended after build: the close is FIRED, not awaited — `return()` on an iterator parked on a
never-resolving `await` is queued behind that `await` and would hang the timeout itself — and
the step's `AbortSignal` (`StepRequest.signal`, forwarded by every tier: `abortController` for
the Claude harness, the turn's `signal` for Codex, `abortSignal` for direct) is aborted first,
which is what actually settles the SDK so the provider unwinds and its child process dies.
Every close the loop DOES await (`chain`'s `finally`, the resume fallback) is bounded by
`min(2000ms, what is left of the step)`, so a provider that will not close cannot wedge the
thread one step later.

### 4.2 `proposal` StepEvent

```ts
| { type: 'proposal'; id: string; path: string; rationale: string }
```
Emitted after a `tool_result` whose `name === 'propose_update'` and whose output parses
to `{ proposalId }`; `path`/`rationale` come from the matching `tool_call` input. SSE:
`event: proposal`. The adapter prints `→ proposal <path> (<id>)` to stderr.

### 4.3 Run record

`RunRecord` (shape in §3). `startRun()` writes `status:'running'` before the provider is
called; `finishRun()` rewrites with the final status (`done | error | timeout`). Derived
fields: `primitivesRead` from `read_primitive` tool calls; `proposals` from `proposal`
events; `toolCalls` as today's log entry; `output` from `done.output` when a schema was
given. Tenant/runId validated as in `run-log.ts`. `.log.jsonl` keeps one line per step.

### 4.4 Runs API

| Method | Path | Response |
|---|---|---|
| GET | `/runs?thread=<uuid>` | `RunRecord[]` newest first (400 without `thread`, 404 unknown thread) |
| GET | `/runs/:runId` | `RunRecord` (404 unknown) |

### 4.5 Typed answers

`StepBody.outputSchema?: Record<string, unknown>`; invalid schema → 400. Passed through
`toHarnessJsonSchema` by the providers as today.

### 4.6 Evals runner

`run_evals.py`: `--runner {claude,runtime}` (default `claude`), `--provider <id>` (runtime
only; default `ollama/gemma4:e4b` so a local run is free), `--step-timeout` (default 540).
The runtime runner parses the CLI's JSON lines and writes `done.output` to
`evals/outputs/<id>.json`; a run that ends in `error` is reported like a timeout today.
`bun run evals:runtime` = `python3 scripts/run_evals.py --generate --runner runtime`.

## 5. Errors

- Timeout → terminal `error`, run `status:'timeout'`, lock released (existing `finally`).
- Run-record write failure → stderr, never an exception out of the loop (same as run log).
- `/runs` for a thread that exists but has no runs → `[]`.
- Evals: a step that yields `error` → `generate_output` returns `(False, message)`.

## 6. Testing

- Loop: timeout with a fake that never yields (fake timer/injectable `now`); proposal event
  synthesized after `propose_update`; run record start/finish for done/error/timeout;
  `primitivesRead`/`proposals` derived correctly.
- Server: `/runs` list + get; step with `outputSchema` → `done.output` parsed; invalid
  schema → 400; timeout via `stepTimeoutMs: 50` in deps → SSE ends with `error`, a second
  step on the same thread proceeds (lock released).
- Adapter: `proposal` frame printed to stderr.
- Evals: `run_evals.py --self-test` unchanged; a unit test of the runtime runner's JSON-line
  parsing with a canned CLI transcript (no live call); one live run of one vault fixture on
  `ollama/gemma4:e4b` (free) recorded in the spikes doc; one on `claude-sub` (1 call).

## 7. Build order

1. Timeout (loop + serve option + registry key).
2. `proposal` event + SSE + adapter line.
3. Run record + `/runs` API.
4. `outputSchema` on the API + preamble line.
5. Evals runtime runner + `findings.schema.json` + `bun run evals:runtime`.
6. Live smokes + findings.
