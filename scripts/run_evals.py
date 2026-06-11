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
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
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


# ─── Baselines (per-model score snapshots) ──────────────────────────────────

# A fixture regresses against a baseline when its score drops by more than
# REGRESSION_DROP, or lands below its pass threshold (optional fixture
# "pass_threshold", defaulting to the README's --fail-under convention).
REGRESSION_DROP = 0.1
DEFAULT_PASS_THRESHOLD = 0.80


def sanitize_model_id(model_id: str) -> str:
    return re.sub(r"[/:]+", "-", model_id.strip())


def baseline_path_for(repo_root: Path, model_id: str) -> Path:
    return repo_root / "evals" / "baselines" / f"{sanitize_model_id(model_id)}.json"


def pass_thresholds(fixtures_dir: Path) -> dict[str, float]:
    thresholds: dict[str, float] = {}
    for fixture_path in fixture_paths(fixtures_dir):
        fixture = load_json(fixture_path)
        thresholds[fixture["id"]] = float(fixture.get("pass_threshold", DEFAULT_PASS_THRESHOLD))
    return thresholds


def save_baseline(path: Path, model_id: str, date_str: str, reports: list[dict[str, Any]]) -> None:
    scores = {report["fixture"]: report["score"] for report in reports}
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump({
            "model": model_id,
            "date": date_str,
            "scores": scores,
            "mean": round(sum(scores.values()) / len(scores), 4),
        }, f, indent=2)
        f.write("\n")


def compare_to_baseline(
    baseline: dict[str, Any],
    reports: list[dict[str, Any]],
    thresholds: dict[str, float],
) -> int:
    """Print a per-fixture delta table to stderr; return the regression count."""
    base_scores = {k: float(v) for k, v in baseline.get("scores", {}).items()}
    rows: list[tuple[str, str, str, str, str]] = []
    regressions = 0

    for report in reports:
        fixture_id = report["fixture"]
        now = report["score"]
        threshold = thresholds.get(fixture_id, DEFAULT_PASS_THRESHOLD)
        reasons: list[str] = []
        if now < threshold - 1e-9:
            reasons.append(f"below pass threshold {threshold:g}")

        base = base_scores.pop(fixture_id, None)
        if base is None:
            if reasons:
                regressions += 1
            flag = f"REGRESSION ({'; '.join(reasons)})" if reasons else "new (no baseline)"
            rows.append((fixture_id, "—", f"{now:.4f}", "—", flag))
            continue

        if base - now > REGRESSION_DROP + 1e-9:
            reasons.append(f"dropped more than {REGRESSION_DROP:g}")
        if reasons:
            regressions += 1
        flag = f"REGRESSION ({'; '.join(reasons)})" if reasons else ""
        rows.append((fixture_id, f"{base:.4f}", f"{now:.4f}", f"{now - base:+.4f}", flag))

    # Baselined fixtures with no current output regressed by definition.
    for fixture_id in sorted(base_scores):
        regressions += 1
        rows.append((fixture_id, f"{base_scores[fixture_id]:.4f}", "—", "—", "REGRESSION (missing output)"))

    mean_now = sum(report["score"] for report in reports) / len(reports) if reports else 0.0
    base_mean = float(baseline.get("mean", 0.0))
    rows.append(("mean", f"{base_mean:.4f}", f"{mean_now:.4f}", f"{mean_now - base_mean:+.4f}", ""))

    width = max(len(row[0]) for row in rows)
    print(f"[compare] vs baseline {baseline.get('model', '?')} ({baseline.get('date', '?')})", file=sys.stderr)
    print(f"{'fixture':<{width}}  {'baseline':>8}  {'now':>8}  {'Δ':>8}  flag", file=sys.stderr)
    for fixture_id, base, now, delta, flag in rows:
        print(f"{fixture_id:<{width}}  {base:>8}  {now:>8}  {delta:>8}  {flag}".rstrip(), file=sys.stderr)
    return regressions


# ─── Generation (headless agent runs against fixture mini-vaults) ──────────

OUTPUT_CONTRACT = """

OUTPUT REQUIREMENT — this is a non-interactive run; do not ask questions, decide and proceed.
When your analysis is complete, write your findings as a single valid JSON file at exactly this path:
{out_path}
Schema:
{{"findings": [{{"title": str, "severity": "red|yellow|green", "clause": str, "rationale": str, "citations": [str]}}], "citations": [str]}}
The citations arrays must name the knowledge files and legal authorities you actually relied on
(e.g., "law/data-privacy.md", "GDPR Art. 33", "practice/standards/data-protection.md").
Write ONLY the JSON to that file — no markdown fences, no prose. Other than that output file and
any matter notes inside your legal root, do not create or modify files."""

EVAL_ALLOWED_TOOLS = "Skill Task Bash Read Write Edit MultiEdit Glob Grep LS WebFetch WebSearch TodoWrite"


def generate_output(
    fixture: dict[str, Any],
    repo_root: Path,
    outputs_dir: Path,
    model: str | None,
) -> tuple[bool, str]:
    """Run the counsel agent headlessly against the fixture's mini-vault."""
    vault_name = fixture.get("vault")
    task = fixture.get("task")
    if not vault_name or not task:
        return False, "fixture has no vault/task — legacy fixture, generate its output manually"

    vault_src = repo_root / "evals" / "vaults" / vault_name
    if not vault_src.is_dir():
        return False, f"vault not found: {vault_src}"

    outputs_dir.mkdir(parents=True, exist_ok=True)
    out_path = (outputs_dir / f"{fixture['id']}.json").resolve()
    out_path.unlink(missing_ok=True)

    tmp = Path(tempfile.mkdtemp(prefix="counsel-eval-"))
    try:
        vault = tmp / "vault"
        shutil.copytree(vault_src, vault)
        cfg = vault / "config.md"
        cfg.write_text(cfg.read_text(encoding="utf-8").replace("__VAULT_PATH__", str(vault)), encoding="utf-8")

        prompt = task + OUTPUT_CONTRACT.format(out_path=out_path)
        cmd = [
            "claude", "-p", prompt,
            "--plugin-dir", str(repo_root),
            "--allowedTools", EVAL_ALLOWED_TOOLS,
            "--max-turns", "40",
            # Isolate from the user's MCP servers: a connected content index
            # (e.g. QMD over the user's real vault) would hijack Knowledge Base
            # Search away from the fixture vault and leak real entities in.
            "--strict-mcp-config",
        ]
        if model:
            cmd += ["--model", model]

        env = dict(os.environ)
        env["COUNSEL_OS_LEGAL_ROOT"] = str(vault)

        try:
            proc = subprocess.run(
                cmd, cwd=tmp, env=env, capture_output=True, text=True, timeout=540,
            )
        except subprocess.TimeoutExpired:
            return False, "agent run timed out (540s)"

        if not out_path.exists():
            tail = (proc.stdout or "")[-500:] + (proc.stderr or "")[-300:]
            return False, f"agent exited {proc.returncode} without writing output. Tail: {tail}"

        try:
            load_json(out_path)
        except json.JSONDecodeError as exc:
            return False, f"output is not valid JSON: {exc}"

        return True, f"output written ({out_path.stat().st_size} bytes)"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Score Counsel OS golden-matter eval outputs.")
    parser.add_argument("--fixtures", type=Path, default=None)
    parser.add_argument("--outputs", type=Path, default=None)
    parser.add_argument("--fail-under", type=float, default=None)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--generate", action="store_true",
                        help="run the agent headlessly against each fixture's mini-vault to produce outputs before scoring")
    parser.add_argument("--model", type=str, default=None, help="model for --generate runs (default: user's default)")
    parser.add_argument("--only", type=str, default=None, help="restrict to a single fixture id")
    parser.add_argument("--save-baseline", type=str, default=None, metavar="MODEL_ID",
                        help="after scoring, snapshot per-fixture scores to evals/baselines/<model-id>.json (refuses if any fixture lacks an output)")
    parser.add_argument("--compare-baseline", type=str, default=None, metavar="MODEL_ID",
                        help="after scoring, print a per-fixture delta table vs the saved baseline (stderr; stdout stays JSON) and exit 1 on any regression")
    parser.add_argument("--date", type=str, default=None,
                        help="date recorded by --save-baseline (default: today)")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    if args.self_test:
        return self_test(repo_root)

    # Anchor defaults to the repo root so a bare invocation works from any cwd.
    fixtures = args.fixtures if args.fixtures is not None else repo_root / "evals" / "fixtures"
    outputs = args.outputs if args.outputs is not None else repo_root / "evals" / "outputs"

    if args.generate:
        for fixture_path in fixture_paths(fixtures):
            fixture = load_json(fixture_path)
            if args.only and fixture["id"] != args.only:
                continue
            ok, msg = generate_output(fixture, repo_root, outputs, args.model)
            print(f"[generate] {fixture['id']}: {'OK' if ok else 'FAILED'} — {msg}", file=sys.stderr)

    reports, missing = run_scores(fixtures, outputs)
    if args.only:
        reports = [r for r in reports if r["fixture"] == args.only]
        missing = [m for m in missing if m == args.only]
    print_report(reports, missing)

    regressions = 0
    if args.compare_baseline:
        baseline_path = baseline_path_for(repo_root, args.compare_baseline)
        if not baseline_path.exists():
            print(f"[compare] no baseline for {args.compare_baseline} at {baseline_path} — save one with --save-baseline first.", file=sys.stderr)
            return 2
        baseline = load_json(baseline_path)
        if args.only:
            baseline["scores"] = {k: v for k, v in baseline.get("scores", {}).items() if k == args.only}
        regressions = compare_to_baseline(baseline, reports, pass_thresholds(fixtures))

    if args.save_baseline:
        scored = {report["fixture"] for report in reports}
        # Baseline scope = generable fixtures only. A fixture with no vault can
        # never appear in a --generate run, so its absence is structural, not a
        # partial run. Fixtures WITH vaults must all be present — partial runs lie.
        vaults_dir = repo_root / "evals" / "vaults"
        generable = {fid for fid in pass_thresholds(fixtures) if (vaults_dir / fid).is_dir()}
        unscored = [fid for fid in sorted(generable) if fid not in scored]
        if unscored or not reports:
            reason = f"no output for {', '.join(unscored)}" if unscored else "nothing was scored"
            print(f"[baseline] refusing to save {args.save_baseline}: {reason} — a partial baseline lies.", file=sys.stderr)
            return 2
        skipped_legacy = sorted(fid for fid in pass_thresholds(fixtures) if fid not in generable)
        if skipped_legacy:
            print(f"[baseline] scope is vault fixtures only; excluding non-generable: {', '.join(skipped_legacy)}", file=sys.stderr)
        reports = [r for r in reports if r["fixture"] in generable]
        baseline_path = baseline_path_for(repo_root, args.save_baseline)
        save_baseline(baseline_path, args.save_baseline, args.date or date.today().isoformat(), reports)
        print(f"[baseline] saved {baseline_path}", file=sys.stderr)

    if missing:
        return 2

    if not reports:
        print(f"No fixtures found under {fixtures} — nothing was scored.", file=sys.stderr)
        return 2

    if args.fail_under is not None:
        if not reports:
            return 2
        aggregate = sum(report["score"] for report in reports) / len(reports)
        if aggregate < args.fail_under:
            return 1

    if regressions:
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
