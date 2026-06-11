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

## Running

**Generate + score** (runs the counsel agent headlessly against each vault fixture — costs API tokens; ~2–5 min per fixture):

```bash
python3 scripts/run_evals.py --generate [--model claude-opus-4-8] [--only fixture-id] --fail-under 0.80
```

Per fixture, the runner copies the mini-vault to a temp dir, rewrites `config.md`'s `__VAULT_PATH__`, and runs `claude -p` with `--plugin-dir <repo>` (evaluating the WORKING TREE) and `COUNSEL_OS_LEGAL_ROOT` pointed at the temp vault — the resolver's env override makes the whole knowledge system read the fixture. The task prompt instructs the agent to write findings JSON to `evals/outputs/{id}.json`; the temp vault is destroyed afterward. Legacy fixtures without a `vault` field still require manually produced outputs.

**Score only** (free, used by CI):

```bash
python3 scripts/run_evals.py --fixtures evals/fixtures --outputs evals/outputs --fail-under 0.80
python3 scripts/run_evals.py --self-test
```

The self-test scores bundled sample outputs to verify the scorer itself. It does not call an LLM. When adding a fixture, also add a passing output to `evals/sample-outputs/` or CI's self-test will report it missing.

**Cadence:** full generate+score before each release and when qualifying a new model (compare per-fixture scores across `--model` runs). Anchors must stay decisive — a fixture that flakes gets its anchors tightened or runs N=3/require-2; never leave a known-flaky fixture in the suite.
