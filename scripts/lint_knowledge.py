#!/usr/bin/env python3
"""Lint Counsel OS content conventions.

Checks every markdown file under knowledge/:
  1. No `- [ ]` checkboxes — they pollute Obsidian task lists in user vaults.
  2. No H2 heading before the first H1 — breaks section-boundary inference
     during LLM-driven coverage checks (see commits 9ee36a6, e8a3803).
  3. Frontmatter must exist and carry counsel-os-type.

With --check-versions, also verifies the four manifests agree:
VERSION, package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json.

Exit codes: 0 clean, 1 findings.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
KNOWLEDGE = REPO / "knowledge"


def knowledge_files() -> list[Path]:
    """Lint only git-tracked files. Checkouts can carry gitignored leftovers
    under knowledge/ (e.g. the pre-removal seed templates ignored since
    ae365c1) that aren't repo content and must not fail the gate."""
    try:
        out = subprocess.run(
            ["git", "-C", str(REPO), "ls-files", "knowledge/"],
            capture_output=True, text=True, check=True,
        ).stdout
        files = [REPO / line for line in out.splitlines() if line.endswith(".md")]
        if files:
            return sorted(files)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass  # not a git checkout (e.g. plugin cache) — fall back to the filesystem
    return sorted(KNOWLEDGE.rglob("*.md"))

# Documentation files that live inside knowledge/ but aren't content —
# exempt from frontmatter requirements.
DOC_FILES = {"FRONTMATTER.md"}


def split_frontmatter(text: str) -> tuple[str, str]:
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[: end + 5], text[end + 5 :]
    return "", text


def lint_knowledge() -> list[str]:
    problems = []
    for f in knowledge_files():
        if f.name in DOC_FILES:
            continue
        rel = f.relative_to(REPO)
        text = f.read_text(encoding="utf-8")
        fm, body = split_frontmatter(text)

        if not fm:
            problems.append(f"{rel}: missing frontmatter block")
        elif "counsel-os-type:" not in fm:
            problems.append(f"{rel}: frontmatter lacks counsel-os-type")

        fm_lines = fm.count("\n")
        for i, line in enumerate(body.split("\n"), start=fm_lines + 1):
            if re.match(r"\s*- \[ \]", line):
                problems.append(f"{rel}:{i}: checkbox '- [ ]' is not allowed in knowledge/")

        lines = body.split("\n")
        idxs = [i for i, l in enumerate(lines) if l.strip()][:2]
        if (
            len(idxs) == 2
            and lines[idxs[0]].startswith("## ")
            and lines[idxs[1]].startswith("# ")
            and not lines[idxs[1]].startswith("##")
        ):
            problems.append(f"{rel}: H2 heading appears before the first H1")
    return problems


def check_versions() -> list[str]:
    versions = {
        "VERSION": (REPO / "VERSION").read_text(encoding="utf-8").strip(),
        "package.json": json.loads((REPO / "package.json").read_text(encoding="utf-8"))["version"],
        "plugin.json": json.loads(
            (REPO / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8")
        )["version"],
        "marketplace.json": json.loads(
            (REPO / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8")
        )["plugins"][0]["version"],
    }
    if len(set(versions.values())) != 1:
        listing = ", ".join(f"{k}={v}" for k, v in versions.items())
        return [f"manifest versions disagree: {listing}"]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint knowledge/ conventions and manifest sync")
    parser.add_argument("--check-versions", action="store_true", help="also verify the four version manifests agree")
    args = parser.parse_args()

    problems = lint_knowledge()
    if args.check_versions:
        problems += check_versions()

    for p in problems:
        print(p)
    print(f"{'FAIL' if problems else 'OK'} — {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
