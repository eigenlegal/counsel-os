# Model routing for legal tasks — design (providers phase 2)

**Date:** 2026-09-02 · **Status:** approved direction (founder, 2026-09-01: "model routing for legal tasks, which means we'll need some kind of eval capability"); details decided here. **Builds on:** the providers spec (catalog, locality, discovery with pricing, `router.resolve(task, { localOnly })`), run records, retro evidence, the existing `evals/` suite.

## 1. Why

Phase 1 made any model reachable. Nothing yet says which model does which legal job well enough, so the lawyer chooses by reputation and the router by a hand-written route. The runtime already measures every step (tokens, cost, latency, tools) and already has a deterministic eval suite with 13 fixtures and fixture vaults, but the suite is Python, CLI-only, scores only one shape of answer, and never feeds routing. This phase closes that loop: a task vocabulary, an eval runner inside the runtime, a scoreboard per practice, routes proposed from scores, and the local capture of what the lawyer actually did with counsel's output, which is what makes the scoreboard personal.

## 2. Scope

**In**
1. A canonical **task taxonomy** the runtime recognizes on every step.
2. An **eval runner in TypeScript** inside the runtime, running fixtures through the same loop the lawyer uses, on any provider; fixture format v2 with three scorer kinds; the shipped fixtures ported.
3. A **scoreboard**: results per task × provider × model version, quality, latency, cost, kept locally; a Settings surface; "Score this provider".
4. **Routing from the scoreboard**: per task, candidates above a quality bar, then the matter's locality policy, then cost and latency; proposed routes the lawyer can pin or override; the reason shown on the step.
5. **Outcome capture**, local and opt-in: decisions on proposals with time and reason, documents produced, the lawyer's later edits to files counsel wrote, and an explicit "not right" mark on an answer.
6. **Fixture from a reviewed matter** and **public benchmark import** (LegalBench, CUAD, MAUD, ContractNLI; Harvey's BigLaw Bench subset if its license allows) with provenance and license fields.

**Out**
- Training or fine-tuning (deferred by the founder; the capture schema is designed so that decision stays open).
- Pooling anything across users. Everything here stays on the machine.
- Replacing the Python scorer's numbers for the existing baselines before the port is verified equal.

## 3. Task taxonomy

`runtime/src/tasks/taxonomy.ts`: a closed set, each with a one-line definition the prompt can quote and a default scorer kind.

| task | what it is | scorer |
|---|---|---|
| `review` | evaluate a document against the practice's standards; findings with severity | findings |
| `redline` | produce edits (tracked changes) to a document | redline |
| `draft` | write a new document or clause from the practice's positions | rubric |
| `research` | answer a legal question from the vault's law and reference layers | findings (citation-weighted) |
| `extract` | pull structured facts: parties, terms, dates, defined terms, clauses | extraction |
| `summarize` | brief a document or a matter's state | rubric |
| `compare` | two documents or rounds: what moved | extraction |
| `remember` | promote a learning into memory/standards (proposals) | rubric |
| `docket` | deadlines and next actions | extraction |
| `retro` | the periodic review (exists) | rubric |
| `chat` | anything else | none |

- **Where a task comes from:** the caller (`task` on the step or the thread header, as today); else a cheap classifier: a rule pass on the message and attachments (a `.docx` attachment plus "review" → `review`; "redline"/"tracked changes" → `redline`; "compare"/"what moved" → `compare`; …), and when no rule fires, one small structured call on the default local-or-cheapest provider that returns a task id from the closed set. The classification is stamped on the step and the run record with its source (`caller`, `rule`, `model`) and can be corrected in the UI (a set-text "task · review · change"), which is itself an outcome signal.
- **Task routes** keep their shape; the taxonomy gives the Settings rows a picker instead of a free string.

## 4. Eval runner

### 4.1 Fixture format v2 (`evals/fixtures/*.json`, and practice fixtures in the vault at `practice/evals/*.json`)
Keeps v1 (id, title, document_type, vault, task, input, expected_catches, negative_checks, expected_citations, allowed_citation_aliases) and adds:
- `scorer: 'findings' | 'extraction' | 'classification' | 'redline' | 'rubric'` (default `findings` for v1 files).
- `source: { kind: 'practice' | 'shipped' | 'benchmark', name?, url?, license?, attribution? }` — required for anything not hand-written here.
- `expected` per scorer: `extraction` → `{ fields: { name: { match_any[] , required } } }` scored per field (precision and recall over fields, spurious fields count against); `classification` → `{ answer, accept[] }` exact-or-alias; `redline` → `{ items: [{ current, proposed_any[] }], must_not_touch[] }` scored by applying the model's items through the real `apply_redlines` on the fixture document (applied without skips, touches only allowed text, comments present); `rubric` → `{ criteria: [{ id, text, weight }] }` graded by a judge call with the criterion text, returning pass/fail per criterion with a quote; `findings` unchanged in semantics but severity is now scored (an expected catch also needs the severity within one band unless `severity: any`).
- `weights` per term default to the v1 aggregate for `findings`; each scorer defines its own; a fixture may override.
- `documents[]` for benchmark imports: many documents in one fixture vault, each with its own expected block, so a 500-contract set is one fixture, not 500 vaults.

### 4.2 Runner (`runtime/src/evals/`)
- `runFixture({ fixture, providerId, task })`: prepares the fixture vault in a temp root (port of `prepare_fixture_vault`), runs `runStep` through the real loop with the fixture's task and the scorer's output schema, collects the run record (usage, cost, latency, tools), scores, and returns `{ score, terms, findings, usage, costUsd, durationMs, provider, modelVersion, at }`.
- Parity: the `findings` scorer is ported from `run_evals.py` and checked against the committed `evals/sample-outputs` (every fixture ≥ 0.95, as the Python self-test) and against the Python's numbers on the eight vault fixtures before the Python is retired.
- `counsel-os eval [--fixture id|--task t|--all] [--provider id] [--save]`; `POST /evals/run` (queued, one at a time, SSE progress); `GET /evals/results`. The Python scripts and the CI self-test are replaced by the TypeScript ones in the same PR; CI keeps running the LLM-free self-test and runner test.
- Cost guard: a run reports its expected cost from the fixture count and the provider's pricing (when known) and asks for confirmation over $1 in the UI; the CLI has `--yes`.

## 5. Scoreboard

- **Store:** `<vault>/.counsel/evals/results.jsonl`, append-only, one line per fixture run: `{ at, fixtureId, source, task, providerId, modelVersion, score, terms, usage, costUsd, durationMs, runId }`. Fixture vaults and outputs are temp; the results are the record.
- **View:** `GET /evals/scoreboard` → per task: rows per provider with the latest score per fixture set (practice / shipped / benchmark, kept separate), median latency, mean cost per run, sample size, staleness (days since the last run on that model version).
- **UI:** a "Models" group in Settings between Default provider and Task routes: the task × provider table as a ledger (set-text scores, hairlines, no colour bars), a "score" action per cell or per provider ("Score Claude on review · 8 fixtures · about $0.60"), the fixture sets as small-caps tabs. The rail plate gains nothing. The strip on a step gains one set-text line when a route came from the scoreboard: "routed to Ollama gemma4 · review 0.82 · stays local".

## 6. Routing from the scoreboard

- **Policy per task** (`practice/routing.yaml`, written by Settings, shape mirrored from `TaskRoute` plus `min_score`, `prefer: 'quality' | 'cost' | 'latency'`, `pinned?`): candidates are providers with a score ≥ `min_score` on the practice set (else the shipped set when the practice has none for that task); then the matter's locality policy (§7 of the providers spec) removes cloud ones; then order by the preference; pinned wins when it clears the bar. Below the bar for every candidate → fall back to the default provider and say so on the step.
- **Proposals, not automation:** after a scoring run, the runtime proposes route changes ("review: prefer Claude Opus 5 (0.91) over the default (0.74)") as a proposal in the docket, approved like any knowledge change. Nothing re-routes silently.
- `router.resolve` gains `{ task, localOnly, scoreboard }` and returns `{ provider, reason }`; the reason is stamped on the run record and shown in the strip.

## 7. Outcome capture

- **Store:** `<vault>/.counsel/outcomes.jsonl`, append-only, each line `{ at, kind, threadId?, runId?, task?, providerId?, matter?, path?, detail }`; kinds: `proposal.decided` (decision, decidedAt, reason?), `artifact.produced` (kind, summary), `answer.marked` (`not-right` with an optional sentence, or `useful`), `task.corrected` (from → to), `file.edited-after-counsel` (path, the diff stats and the unified diff of the lawyer's edit against what counsel wrote), `thread.deleted`.
- **Lawyer edits:** when counsel writes a file (an approved proposal, a produced document, a matter log write), the runtime records the written content hash in `.counsel/written.json`. Doctor and retro (and a light watcher on serve, debounced) compare the current file with the written version; a difference is the lawyer's edit and becomes a `file.edited-after-counsel` outcome once per file per day. Word files compare their accept-all text.
- **UI:** every assistant turn gets two quiet links in the strip: "useful" · "not right" (the second opens a one-line reason in set text). Proposal decisions gain an optional reason line on reject. A Settings switch "Keep a local record of decisions and edits" (default on; the record never leaves the machine; retro and the scoreboard read it).
- **Privacy:** the record contains paths, hashes, diffs of the lawyer's own edits, and reasons; it lives in the vault's `.counsel/` like everything else, and is excluded from any share or export by default.

## 8. Fixture from a reviewed matter, and benchmark import

- **From a matter:** on a matter page or thread, "make this a fixture": the runtime takes the document, counsel's findings, and the lawyer's decisions (approved findings become expected catches with the severity the lawyer kept; rejected ones become negative checks; the lawyer's edits become `must_not_touch`/`proposed_any` for redline fixtures), then runs an anonymization pass (party names, amounts, dates, emails replaced consistently, with a review screen showing the before/after in the reader's redline style) and writes `practice/evals/<slug>.json` plus a synthetic copy of the document. Nothing is a fixture until the lawyer approves the anonymized text.
- **Benchmarks:** `counsel-os eval import <set> [--subset n]` with loaders for LegalBench (per-task licenses recorded per fixture), CUAD (CC BY 4.0, attribution field), MAUD, ContractNLI, and a BigLaw Bench loader gated on a license check at import time; each produces one multi-document fixture per task with `source` filled. Imports live under `evals/benchmarks/` (git-ignored) and score under the "benchmark" set.

## 9. Error handling
- A fixture vault that fails to prepare, a step that errors, or a scorer that throws record a result line with `score: null` and the error; the scoreboard shows "failed · <reason>" for that cell and never averages nulls.
- A judge call that fails leaves the rubric criterion unscored and says so.
- Routing never throws for a missing score: no score means not a candidate, and the fallback is the default provider with the reason "no score yet".

## 10. Testing
- Scorers: golden tests per scorer against committed outputs (the ported findings scorer against `evals/sample-outputs` at ≥ 0.95; new fixtures for extraction, classification, redline, rubric with a fake judge).
- Runner: the fake provider with scripted outputs runs a fixture end to end; results append; the cost guard.
- Routing: table tests over scoreboard fixtures (bar, locality, preference, pin, fallback, reason text).
- Outcome capture: each kind appends once; the written-hash comparison detects an edit and ignores an unchanged file; the Word accept-all comparison.
- UI: the Models group table, score action with the cost sentence, the strip's route line, the useful/not-right links, the reject reason, the "make this a fixture" review screen.
- CI keeps the LLM-free self-test and runner test, now in TypeScript.

## 11. Staging and order
1. Taxonomy, classification (rules + the small structured call), task picker in Settings' route rows, task on the step/strip with correction; outcome capture store + `proposal.decided` / `artifact.produced` / `answer.marked` / `task.corrected` / `thread.deleted`; the Settings switch.
2. Eval runner in TypeScript with fixture v2 and the five scorers; the shipped fixtures ported; parity with the Python; CLI `counsel-os eval`; the results store; Python scripts retired; CI switched.
3. Scoreboard API and the Models group in Settings; "score this provider" with the cost guard.
4. Routing from the scoreboard with reasons; the record's line. **Split while building (2026-09-02):** the router, `practice/routing.yaml`, and the reason on every run shipped first; the editing surface (the bar and the preference per task in Settings) and the route-change proposal after a scoring run follow in 4b, because the proposal wants a thread to live on and that is a design question of its own — a route is configuration, not knowledge, so 4b may instead offer it in the Models group with an explicit "use it" rather than in the docket.
5. `file.edited-after-counsel` (written hashes, doctor/retro/watcher comparison) and "make this a fixture" with the anonymization review.
6. Benchmark loaders with license fields.

Each step is one PR, reviewed by a subagent and a real-browser pass before merge (no board).

## 12. Decisions taken here (founder can override)
- The rubric judge is the practice's default provider unless a route pins one; the judge never scores its own vendor's answer on the practice set (it may on the shipped set, with that noted).
- Outcome capture defaults to on; it is local-only and switchable.
- Route changes are proposals in the docket, never automatic.
- Practice, shipped, and benchmark results are kept as three sets and never averaged together.
