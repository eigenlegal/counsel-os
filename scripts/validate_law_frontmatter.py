#!/usr/bin/env python3
"""Validate Counsel OS law frontmatter without manufacturing review metadata."""

from __future__ import annotations

import argparse
import calendar
import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Optional


REPO_ROOT = Path(__file__).resolve().parents[1]
LAW_ROOT = REPO_ROOT / "knowledge" / "law"
POLICY_PATH = LAW_ROOT / "frontmatter-policy.json"


@dataclass
class Finding:
    path: Path
    level: str
    message: str


def load_policy() -> dict[str, Any]:
    with POLICY_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def law_files() -> list[Path]:
    return sorted(
        path
        for path in LAW_ROOT.rglob("*.md")
        if path.name != "FRONTMATTER.md"
    )


def relative_law_path(path: Path) -> str:
    return path.relative_to(LAW_ROOT).as_posix()


def area_for(path: Path) -> str:
    return path.relative_to(LAW_ROOT).parts[0]


def split_frontmatter(text: str) -> tuple[Optional[str], str]:
    if not text.startswith("---\n"):
        return None, text

    end = text.find("\n---\n", 4)
    if end == -1:
        return None, text

    return text[4:end], text[end + 5 :]


def parse_scalar_frontmatter(frontmatter: Optional[str]) -> dict[str, str]:
    if frontmatter is None:
        return {}

    fields: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if not line or line.startswith(" ") or line.startswith("- "):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    return fields


def parse_inline_list(value: str) -> list[str]:
    value = value.strip()
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [item.strip().strip("\"'") for item in inner.split(",")]
    if not value:
        return []
    return [value.strip().strip("\"'")]


def format_inline_list(values: list[str]) -> str:
    return "[" + ", ".join(values) + "]"


def derived_jurisdiction(policy: dict[str, Any], path: Path) -> list[str]:
    rel = relative_law_path(path)
    overrides = policy.get("jurisdiction_overrides", {})
    if rel in overrides:
        return list(overrides[rel])

    defaults = policy.get("jurisdiction_defaults", {})
    return list(defaults.get(area_for(path), []))


def add_months(value: date, months: int) -> date:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def parse_date(value: str) -> Optional[date]:
    normalized = value.strip().strip("\"'")
    try:
        return date.fromisoformat(normalized)
    except ValueError:
        return None


def review_cadence(policy: dict[str, Any], path: Path) -> int:
    cadences = policy.get("review_cadence_months", {})
    return int(cadences.get(area_for(path), cadences.get("default", 12)))


def has_nonempty_authorities(frontmatter: Optional[str], fields: dict[str, str]) -> bool:
    if "authorities" not in fields:
        return False
    value = fields.get("authorities", "").strip()
    if value and value not in ("[]", "null", "~"):
        return True
    if frontmatter is None:
        return False
    return bool(re.search(r"(?m)^authorities:\s*\n(?:\s+-\s+.+\n?)+", frontmatter))


def insert_jurisdiction(text: str, jurisdictions: list[str]) -> str:
    frontmatter, body = split_frontmatter(text)
    if frontmatter is None:
        generated = [
            "---",
            "counsel-os-type: law-area",
            f"jurisdiction: {format_inline_list(jurisdictions)}",
            "---",
            "",
        ]
        return "\n".join(generated) + body.lstrip("\n")

    lines = frontmatter.splitlines()
    output: list[str] = []
    inserted = False
    for line in lines:
        output.append(line)
        if line.startswith("content-version:") and not inserted:
            output.append(f"jurisdiction: {format_inline_list(jurisdictions)}")
            inserted = True

    if not inserted:
        output.append(f"jurisdiction: {format_inline_list(jurisdictions)}")

    return "---\n" + "\n".join(output) + "\n---\n" + body


def validate_file(policy: dict[str, Any], path: Path, today: date) -> list[Finding]:
    text = path.read_text(encoding="utf-8")
    frontmatter, _ = split_frontmatter(text)
    fields = parse_scalar_frontmatter(frontmatter)
    findings: list[Finding] = []

    if frontmatter is None:
        findings.append(Finding(path, "warning", "missing frontmatter"))
        return findings

    if fields.get("counsel-os-type") != "law-area":
        findings.append(Finding(path, "warning", "counsel-os-type must be law-area"))
    if "content-version" not in fields:
        findings.append(Finding(path, "warning", "missing content-version"))

    expected_jurisdiction = derived_jurisdiction(policy, path)
    raw_jurisdiction = fields.get("jurisdiction")
    if not raw_jurisdiction:
        findings.append(Finding(path, "warning", f"missing derived jurisdiction: {format_inline_list(expected_jurisdiction)}"))
    else:
        actual = parse_inline_list(raw_jurisdiction)
        unknown = [value for value in actual if value not in policy["jurisdiction_values"]]
        if unknown:
            findings.append(Finding(path, "warning", f"unknown jurisdiction values: {format_inline_list(unknown)}"))

    reviewed = fields.get("last-reviewed")
    if not reviewed:
        findings.append(Finding(path, "attestation", "missing last-reviewed"))
    else:
        reviewed_date = parse_date(reviewed)
        if reviewed_date is None:
            findings.append(Finding(path, "warning", "last-reviewed must be YYYY-MM-DD"))
        else:
            stale_after = add_months(reviewed_date, review_cadence(policy, path))
            if today > stale_after:
                findings.append(Finding(path, "attestation", f"review stale after {stale_after.isoformat()}"))

    if not has_nonempty_authorities(frontmatter, fields):
        findings.append(Finding(path, "attestation", "missing reviewed authorities"))

    if "stale-after" in fields:
        findings.append(Finding(path, "warning", "prefer per-area review cadence over per-file stale-after"))

    return findings


def write_derived_fields(policy: dict[str, Any], path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    frontmatter, _ = split_frontmatter(text)
    fields = parse_scalar_frontmatter(frontmatter)
    if fields.get("jurisdiction"):
        return False

    jurisdictions = derived_jurisdiction(policy, path)
    if not jurisdictions:
        return False

    path.write_text(insert_jurisdiction(text, jurisdictions), encoding="utf-8")
    return True


def summarize(findings: list[Finding], details: bool) -> None:
    by_level: dict[str, int] = {}
    for finding in findings:
        by_level[finding.level] = by_level.get(finding.level, 0) + 1

    print(f"Law files scanned: {len(law_files())}")
    print(f"Warnings:          {by_level.get('warning', 0)}")
    print(f"Attestations due:  {by_level.get('attestation', 0)}")

    if details:
        for finding in findings:
            rel = finding.path.relative_to(REPO_ROOT)
            print(f"{finding.level}: {rel}: {finding.message}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate knowledge/law frontmatter.")
    parser.add_argument("--write-derived", action="store_true", help="Add mechanically derived fields only.")
    parser.add_argument("--details", action="store_true", help="Print file-level findings.")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when findings exist.")
    args = parser.parse_args()

    policy = load_policy()

    if args.write_derived:
        changed = 0
        for path in law_files():
            changed += int(write_derived_fields(policy, path))
        print(f"Law files updated with derived fields: {changed}")

    findings: list[Finding] = []
    today = date.today()
    for path in law_files():
        findings.extend(validate_file(policy, path, today))

    summarize(findings, args.details)
    if args.strict and findings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
