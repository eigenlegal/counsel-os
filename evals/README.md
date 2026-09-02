# Counsel OS Evals

Golden-matter evals measure whether Counsel OS output catches the issues a competent reviewer should catch, cites the right knowledge areas, and avoids known false positives. The runner lives in the runtime (`runtime/src/evals/`, routing-and-evals spec §4): a fixture runs through the real loop in a fresh copy of its mini-vault on any provider the runtime knows, and its scorer turns the typed answer into one score with named terms.

## Fixture Schema (v2)

Fixtures live in `evals/fixtures/*.json` (the shipped set) and `<vault>/practice/evals/*.json` (a practice's own, never shipped). Every fixture has an `id` (a slug), a `task` (the prompt the step runs), and a `scorer`:

| `scorer` | The answer | `expected` | Terms |
|---|---|---|---|
| `findings` (default) | `{ findings: [{ title, severity, clause, rationale, citations }], citations }` | the v1 keys below | recall 0.45 · precision_guard 0.25 · citation_coverage 0.20 · hallucination_score 0.10 |
| `extraction` | `{ fields: { name: value } }` | `{ fields: { name: { match_any, required? } } }` | recall 0.7 · precision 0.3 |
| `classification` | `{ answer }` | `{ answer, accept? }` | exact |
| `redline` | `{ items: [{ current, proposed, comment? }] }` | `{ document, items: [{ current, proposed_any }], must_not_touch?, require_comments? }` | covered 0.5 · applied 0.3 · untouched 0.1 · comments 0.1 |
| `rubric` | the model's text | `{ criteria: [{ id, text, weight? }] }` | one term per criterion, judged by a model |

The `findings` keys (v1, unchanged):

- `input.contract_text` is synthetic matter text.
- `expected_catches` lists issues that should be flagged. `match_any` terms are deterministic scoring anchors. A catch also names a `severity`; a hit counts only when the finding's severity is within one band (red↔yellow, yellow↔green) — write `"severity": "any"` to waive that.
- `expected_citations` lists knowledge areas or authorities that should be loaded or cited. `aliases` are accepted citation strings.
- `negative_checks` lists issues the model should not flag.
- `allowed_citation_aliases` bounds the citation set so fabricated structured citations can be detected.

Optional on any fixture: `task_kind` (which of the runtime's tasks the step runs as — the scorer's natural task otherwise), `weights` (per-term overrides), `pass_threshold`, `source` (see *Provenance* below), and `documents[]` — a list of `{ id, task, expected… }` entries that share one vault, one step and one result line each, for a benchmark of many documents.

The redline scorer applies the model's items to the fixture's Word document through the runtime's own `applyRedlines`, so what is scored is the document a lawyer would get back. The rubric scorer's judge is the practice's default provider; on a practice set it never grades its own vendor (spec §12), and a criterion whose judge call fails is reported as *not judged*, never as a zero.

## Output Schema

`evals/findings.schema.json` is the `findings` answer shape (the runtime asks the step for it as a typed answer). Sample outputs in `evals/sample-outputs/{fixture_id}.json` follow it:

```json
{
  "findings": [
    {
      "title": "Issue title",
      "severity": "red",
      "clause": "Relevant clause",
      "rationale": "Why it matters",
      "citations": ["knowledge/law/data-privacy/data-processing-agreements.md"]
    }
  ],
  "citations": ["knowledge/practice-seed/standards/data-protection.md"]
}
```

## Vault Fixtures (safety-rule evals)

Fixtures may additionally carry:

- `vault` — the name of a mini-vault under `evals/vaults/{name}/`: a tiny, self-contained legal root (marked `config.md` with a `__VAULT_PATH__` placeholder, `law/`, `practice/`, `matters/`, `memory/`) constructed so the correct behavior is decisive. These test knowledge-LAYER interactions — law-beats-practice, reference-never-governs, entity-override scoping, escalation triggering — not just document analysis. Vault content must look completely real to the agent: no test markers.
- `task` — the user prompt for headless generation.

## Fixture Index

| Fixture | Vault | Tests |
|---|---|---|
| `ai-training-data` | — | Legacy: AI/training-data clause catches in a SaaS agreement (manual outputs). |
| `msa-liability-indemnity` | — | Legacy: liability/indemnity catches in an MSA (manual outputs). |
| `nda-residuals` | — | Legacy: residuals-clause catch in an NDA (manual outputs). |
| `saas-dpa-breach` | — | Legacy: DPA breach-notification catches (manual outputs). |
| `demo-nda` | — | Guards the `/counsel-os:demo` showpiece: the bundled synthetic mutual NDA catches the RED/YELLOW calls the demo promises against the seeded confidentiality standard (manual outputs). |
| `law-beats-practice` | yes | Safety rule: a law/ floor (GDPR Art. 33) overrides a permissive practice standard, and the conflicting standard itself gets flagged. |
| `reference-never-governs` | yes | Safety rule: a matching sample form in practice/reference/ never blesses a clause — positions come from practice/standards/. |
| `entity-override-scoping` | yes | Safety rule: a counterparty-specific concession in an entity file is not precedent for a different counterparty. |
| `escalation-trigger` | yes | Safety rule: a profile.md always-escalate threshold fires despite deal pressure and small deal size. |
| `law-area-trigger-detection` | yes | Behavior: a business scenario (child allowance wallets + card processing) triggers both relevant law areas — data-privacy/COPPA and financial-services — without any statute being named in the prompt. |
| `redline-roundtrip` | yes | Behavior: a counterparty markup (pre-extracted `extract_redlines.py` JSON in the matter folder) gets per-change classification — two accepts, an any-breach/uncapped indemnity counter, and a silently inserted MFN that must escalate to the GC per profile.md. |
| `missing-provision-coverage` | yes | Behavior: a full review of a 9-section MSA flags the entirely absent indemnification, limitation-of-liability, and data-protection provisions as gaps, not just the text on the page. |
| `green-yellow-red-calibration` | yes | Behavior: GREEN/YELLOW/RED come from the vault's deliberately non-market Classification Guides (24-month cap floor, net-20 RED line), not market intuition — one clause sits exactly in each band. |

## Running

**Run + score** (drives the runtime loop against each fixture's mini-vault; costs whatever the provider costs — a local model costs nothing):

```bash
bun runtime/src/cli.ts eval --all --save                              # every runnable fixture on your default provider
bun runtime/src/cli.ts eval --fixture law-beats-practice --provider ollama/gemma4:e4b
bun runtime/src/cli.ts eval --task review --json                      # every fixture that runs as the review task
```

Per fixture, the runner copies the mini-vault to a temp dir, rewrites `config.md`'s `__VAULT_PATH__`, opens a thread there, runs one step with the scorer's typed-answer schema on the chosen provider, scores the answer, and removes the temp vault. Legacy fixtures without a `vault` (the five `—` rows above) cannot run; they are scored from their committed sample outputs only.

- `--provider <id>` is any provider id the runtime knows (`counsel-os doctor` / Settings list them); the default is the practice's default provider.
- `--save` appends one line per fixture run to `<vault>/.counsel/evals/results.jsonl` — `{ at, fixtureId, source, task, providerId, modelVersion, score, terms, notes, usage, costUsd, durationMs, runId }`. Fixture vaults and outputs are temporary; these lines are the record (spec §5). A step that errors writes `score: null` with the error and is never averaged in.
- `--yes` accepts a run whose estimated cost is over $1. The estimate is fixture count × the provider's published price; only vendors that publish a price through discovery (OpenRouter) have one, and the run says *no price known* otherwise.
- The app has the same runner: `POST /evals/run` (`{ fixtures | task | all, providerId?, save?, confirm? }`, an SSE stream of `plan · progress · result · done`, `409 confirm-cost` over $1 without `confirm: true`, `409 eval-busy` while one runs), `GET /evals/fixtures`, `GET /evals/results?since=`.

**Score only** (free):

```bash
bun run evals:self-test     # every shipped sample output ≥ 0.95 — this is what CI runs
bun run evals:runner-test   # the scorer, runner and route tests, plus parity with evals/baselines/claude-fable-5.json
```

The self-test scores the committed sample outputs to verify the scorer itself and never calls a model. When adding a `findings` fixture, also add a passing output to `evals/sample-outputs/` or the self-test reports it missing.

**Cadence:** a full run before each release and when qualifying a new model (compare per-fixture lines across providers in the results record). Anchors must stay decisive — a fixture that flakes gets its anchors tightened or runs N=3/require-2; never leave a known-flaky fixture in the suite.

## Provenance and license

Every shipped fixture in this directory — the fixtures, their sample outputs, and the mini-vaults under `evals/vaults/` — was written for Counsel OS by Eigen Software LLC. The matter text, parties, and documents are synthetic; no client matter, no real counterparty, and no third-party benchmark text is included. They are covered by the repository's MIT license.

A fixture that comes from somewhere else says so in `source`: `{ "kind": "benchmark", "name", "url", "license", "attribution" }`. Do not add a fixture built from a public benchmark without recording its license there, and do not add one whose license forbids redistribution. Practice fixtures (`source.kind: "practice"`, under `<vault>/practice/evals/`) are the practice's own and never ship with the plugin.

## Fixture-Authoring Lessons (from the 2026-06 calibration pass)

- **`allowed_citation_aliases` must include every vault-internal path** the agent may legitimately consult (`memory/`, `patterns.md`, `profile.md`, entity files) — the effective-position procedure instructs checking them, and citing them is correct behavior.
- **Include the doctrine's canonical real-world authorities.** A capable model cites genuine case law and statutes from training (e.g., *Abry Partners*, Cal. Civ. Code § 1668 for fraud-cap unenforceability). The fabricated-citation detector must not punish correct lawyering — anticipate the leading authorities for whatever doctrine the fixture touches, especially when the vault ships no `law/` file.
- **Negative-check anchors must be phrases that can ONLY appear in wrong answers** ("acceptable because it matches our reference"), never words a correct answer might use while rejecting the trap ("reference", "Aurelia"). Substring matching has no negation.
- **Runs are vault-isolated**: the step runs in a temp copy of the fixture vault with its own thread store and run records; nothing from the user's real vault is reachable, and nothing from the run survives except the result line. Keep it that way — a runner that read the practice's real knowledge would leak real entities into eval runs.
- **Vaults must look completely real** — no test markers, no hints. The decisiveness lives in the *content* (unambiguous violations, hard-line positions), not in labels.
