# Counsel OS Evals

Golden-matter evals measure whether Counsel OS output catches the issues a competent reviewer should catch, cites the right knowledge areas, and avoids known false positives.

## Fixture Schema

Fixtures live in `evals/fixtures/*.json`:

- `input.contract_text` is synthetic matter text.
- `expected_catches` lists issues that should be flagged. `match_any` terms are deterministic scoring anchors.
- `expected_citations` lists knowledge areas or authorities that should be loaded or cited. `aliases` are accepted citation strings.
- `negative_checks` lists issues the model should not flag.
- `allowed_citation_aliases` bounds the citation set so fabricated structured citations can be detected.

## Output Schema

Place model outputs in `evals/outputs/{fixture_id}.json`:

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

**Generate + score** (runs the counsel agent headlessly against each vault fixture — costs API tokens; ~2–5 min per fixture):

```bash
python3 scripts/run_evals.py --generate [--model claude-opus-4-8] [--only fixture-id] --fail-under 0.80
```

Per fixture, the runner copies the mini-vault to a temp dir, rewrites `config.md`'s `__VAULT_PATH__`, and runs `claude -p` with `--plugin-dir <repo>` (evaluating the WORKING TREE) and `COUNSEL_OS_LEGAL_ROOT` pointed at the temp vault — the resolver's env override makes the whole knowledge system read the fixture. The task prompt instructs the agent to write findings JSON to `evals/outputs/{id}.json`; the temp vault is destroyed afterward. Legacy fixtures without a `vault` field still require manually produced outputs.

**Score only** (free):

```bash
python3 scripts/run_evals.py --fixtures evals/fixtures --outputs evals/outputs --fail-under 0.80   # full scored gate — run pre-release
python3 scripts/run_evals.py --self-test                                                            # scorer self-test — this is what CI runs
```

CI runs `--self-test` only; the full scored gate is a pre-release step (it needs generated outputs, which CI does not produce). The self-test scores bundled sample outputs to verify the scorer itself. It does not call an LLM. When adding a fixture, also add a passing output to `evals/sample-outputs/` or CI's self-test will report it missing.

**Cadence:** full generate+score before each release and when qualifying a new model (compare per-fixture scores across `--model` runs). Anchors must stay decisive — a fixture that flakes gets its anchors tightened or runs N=3/require-2; never leave a known-flaky fixture in the suite.

## Fixture-Authoring Lessons (from the 2026-06 calibration pass)

- **`allowed_citation_aliases` must include every vault-internal path** the agent may legitimately consult (`memory/`, `patterns.md`, `profile.md`, entity files) — the effective-position procedure instructs checking them, and citing them is correct behavior.
- **Include the doctrine's canonical real-world authorities.** A capable model cites genuine case law and statutes from training (e.g., *Abry Partners*, Cal. Civ. Code § 1668 for fraud-cap unenforceability). The fabricated-citation detector must not punish correct lawyering — anticipate the leading authorities for whatever doctrine the fixture touches, especially when the vault ships no `law/` file.
- **Negative-check anchors must be phrases that can ONLY appear in wrong answers** ("acceptable because it matches our reference"), never words a correct answer might use while rejecting the trap ("reference", "Aurelia"). Substring matching has no negation.
- **Generation runs are MCP-isolated** (`--strict-mcp-config` in the runner): a connected content index over the user's real vault would hijack Knowledge Base Search away from the fixture and leak real entities into eval runs. Don't remove that flag.
- **Vaults must look completely real** — no test markers, no hints. The decisiveness lives in the *content* (unambiguous violations, hard-line positions), not in labels.
