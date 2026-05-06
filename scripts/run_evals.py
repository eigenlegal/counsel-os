#!/usr/bin/env python3
"""Score Counsel OS golden-matter eval outputs.

The harness is intentionally model-agnostic: fixtures define expected catches,
expected citations, and false-positive guards; outputs are JSON files produced
by any runner. This script scores those outputs deterministically.

Output file schema:
{
  "findings": [
    {
      "title": "...",
      "severity": "red|yellow|green",
      "clause": "...",
      "rationale": "...",
      "citations": ["knowledge/law/data-privacy/gdpr.md", "GDPR Art. 28"]
    }
  ],
  "citations": ["knowledge/law/data-privacy/gdpr.md"]
}
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value).lower()).strip()


def contains_any(text: str, terms: list[str]) -> bool:
    return any(normalize(term) in text for term in terms)


def finding_text(finding: dict[str, Any]) -> str:
    fields = [
        finding.get("id", ""),
        finding.get("title", ""),
        finding.get("severity", ""),
        finding.get("clause", ""),
        finding.get("rationale", ""),
        finding.get("why", ""),
        " ".join(str(c) for c in finding.get("citations", [])),
    ]
    return normalize(" ".join(fields))


def output_citations(output: dict[str, Any]) -> list[str]:
    citations = [str(c) for c in output.get("citations", [])]
    for finding in output.get("findings", []):
      citations.extend(str(c) for c in finding.get("citations", []))
    return citations


def match_expected_catches(
    fixture: dict[str, Any],
    output: dict[str, Any],
) -> tuple[list[str], list[str]]:
    finding_texts = [finding_text(f) for f in output.get("findings", [])]
    matched: list[str] = []
    missed: list[str] = []

    for expected in fixture.get("expected_catches", []):
        terms = expected.get("match_any", [])
        expected_id = expected["id"]
        if any(contains_any(text, terms) for text in finding_texts):
            matched.append(expected_id)
        else:
            missed.append(expected_id)

    return matched, missed


def match_negative_checks(
    fixture: dict[str, Any],
    output: dict[str, Any],
) -> list[str]:
    finding_texts = [finding_text(f) for f in output.get("findings", [])]
    false_positives: list[str] = []

    for negative in fixture.get("negative_checks", []):
        terms = negative.get("match_any", [])
        if terms and any(contains_any(text, terms) for text in finding_texts):
            false_positives.append(negative["id"])

    return false_positives


def match_expected_citations(
    fixture: dict[str, Any],
    output: dict[str, Any],
) -> tuple[list[str], list[str]]:
    citation_text = normalize(" ".join(output_citations(output)))
    matched: list[str] = []
    missed: list[str] = []

    for expected in fixture.get("expected_citations", []):
        aliases = expected.get("aliases", [])
        expected_id = expected["id"]
        if contains_any(citation_text, aliases):
            matched.append(expected_id)
        else:
            missed.append(expected_id)

    return matched, missed


def find_unknown_citations(fixture: dict[str, Any], output: dict[str, Any]) -> list[str]:
    allowed = [normalize(alias) for alias in fixture.get("allowed_citation_aliases", [])]
    unknown: list[str] = []

    for citation in output_citations(output):
        normalized = normalize(citation)
        if normalized and not any(alias in normalized for alias in allowed):
            unknown.append(citation)

    return unknown


def score_fixture(fixture: dict[str, Any], output: dict[str, Any]) -> dict[str, Any]:
    matched_catches, missed_catches = match_expected_catches(fixture, output)
    false_positives = match_negative_checks(fixture, output)
    matched_citations, missed_citations = match_expected_citations(fixture, output)
    unknown_citations = find_unknown_citations(fixture, output)

    expected_count = len(fixture.get("expected_catches", []))
    citation_count = len(fixture.get("expected_citations", []))
    recall = len(matched_catches) / expected_count if expected_count else 1.0
    precision_guard = 1.0 if not false_positives else 0.0
    citation_coverage = len(matched_citations) / citation_count if citation_count else 1.0
    hallucination_score = 1.0 if not unknown_citations else 0.0
    aggregate = (
        recall * 0.45
        + precision_guard * 0.25
        + citation_coverage * 0.20
        + hallucination_score * 0.10
    )

    return {
        "fixture": fixture["id"],
        "score": round(aggregate, 4),
        "recall": round(recall, 4),
        "precision_guard": precision_guard,
        "citation_coverage": round(citation_coverage, 4),
        "hallucination_score": hallucination_score,
        "matched_catches": matched_catches,
        "missed_catches": missed_catches,
        "false_positives": false_positives,
        "matched_citations": matched_citations,
        "missed_citations": missed_citations,
        "unknown_citations": unknown_citations,
    }


def fixture_paths(fixtures_dir: Path) -> list[Path]:
    return sorted(fixtures_dir.glob("*.json"))


def output_path_for(outputs_dir: Path, fixture: dict[str, Any]) -> Path:
    return outputs_dir / f"{fixture['id']}.json"


def run_scores(fixtures_dir: Path, outputs_dir: Path) -> tuple[list[dict[str, Any]], list[str]]:
    reports: list[dict[str, Any]] = []
    missing: list[str] = []

    for fixture_path in fixture_paths(fixtures_dir):
        fixture = load_json(fixture_path)
        output_path = output_path_for(outputs_dir, fixture)
        if not output_path.exists():
            missing.append(fixture["id"])
            continue
        reports.append(score_fixture(fixture, load_json(output_path)))

    return reports, missing


def print_report(reports: list[dict[str, Any]], missing: list[str]) -> None:
    if reports:
        aggregate = sum(report["score"] for report in reports) / len(reports)
    else:
        aggregate = 0.0

    print(json.dumps({
        "aggregate_score": round(aggregate, 4),
        "scored": len(reports),
        "missing_outputs": missing,
        "fixtures": reports,
    }, indent=2))


def self_test(repo_root: Path) -> int:
    reports, missing = run_scores(
        repo_root / "evals" / "fixtures",
        repo_root / "evals" / "sample-outputs",
    )
    print_report(reports, missing)
    if missing:
        return 1
    if not reports:
        return 1
    return 0 if all(report["score"] >= 0.95 for report in reports) else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Score Counsel OS golden-matter eval outputs.")
    parser.add_argument("--fixtures", type=Path, default=Path("evals/fixtures"))
    parser.add_argument("--outputs", type=Path, default=Path("evals/outputs"))
    parser.add_argument("--fail-under", type=float, default=None)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    if args.self_test:
        return self_test(repo_root)

    reports, missing = run_scores(args.fixtures, args.outputs)
    print_report(reports, missing)

    if missing:
        return 2

    if args.fail_under is not None:
        if not reports:
            return 2
        aggregate = sum(report["score"] for report in reports) / len(reports)
        if aggregate < args.fail_under:
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
