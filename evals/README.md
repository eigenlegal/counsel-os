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

## Running

```bash
python3 scripts/run_evals.py --fixtures evals/fixtures --outputs evals/outputs --fail-under 0.80
python3 scripts/run_evals.py --self-test
```

The self-test scores bundled sample outputs to verify the scorer itself. It does not call an LLM.
