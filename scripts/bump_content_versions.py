#!/usr/bin/env python3
"""Bump content-version dates for Counsel OS knowledge areas.

Discovers all content groups (subdirs of knowledge/law/ and knowledge/defaults/),
hashes the body content (stripping YAML frontmatter), and updates the
content-version date in frontmatter only when content has actually changed.

Usage:
    python3 scripts/bump_content_versions.py              # uses today's date
    python3 scripts/bump_content_versions.py --date 2026-04-08  # override date
"""

import argparse
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = REPO_ROOT / "knowledge"
VERSIONS_FILE = REPO_ROOT / ".content-versions.json"

CONTENT_DIRS = ["law", "defaults"]

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?\n)---\s*\n", re.DOTALL)


def discover_groups() -> list[tuple[str, Path]]:
    """Return (group_key, dir_path) for each content group."""
    groups = []
    for content_dir in CONTENT_DIRS:
        base = KNOWLEDGE_DIR / content_dir
        if not base.is_dir():
            continue
        for subdir in sorted(base.iterdir()):
            if subdir.is_dir() and not subdir.name.startswith("."):
                key = f"{content_dir}/{subdir.name}"
                groups.append((key, subdir))
    return groups


def strip_frontmatter(text: str) -> str:
    """Remove YAML frontmatter (between first --- and second ---) from text."""
    m = FRONTMATTER_RE.match(text)
    if m:
        return text[m.end():]
    return text


def hash_group(dir_path: Path) -> str:
    """Hash concatenated body content of all .md files in a directory."""
    hasher = hashlib.sha256()
    md_files = sorted(dir_path.glob("*.md"))
    for f in md_files:
        text = f.read_text(encoding="utf-8")
        body = strip_frontmatter(text)
        hasher.update(f"--- {f.name} ---\n".encode("utf-8"))
        hasher.update(body.encode("utf-8"))
    return hasher.hexdigest()


def update_frontmatter(file_path: Path, version_date: str) -> bool:
    """Update frontmatter: remove counsel-os-version, set content-version.

    Returns True if the file was modified.
    """
    text = file_path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        return False

    fm_block = m.group(1)
    rest = text[m.end():]

    # Remove counsel-os-version line if present
    new_fm = re.sub(r'counsel-os-version:\s*"[^"]*"\s*\n', "", fm_block)

    # Update or add content-version
    if re.search(r"content-version:", new_fm):
        new_fm = re.sub(
            r'content-version:\s*"[^"]*"',
            f'content-version: "{version_date}"',
            new_fm,
        )
    else:
        # Add after counsel-os-type line if present, otherwise at end
        if "counsel-os-type:" in new_fm:
            new_fm = re.sub(
                r"(counsel-os-type:\s*[^\n]*\n)",
                rf'\1content-version: "{version_date}"\n',
                new_fm,
            )
        else:
            new_fm += f'content-version: "{version_date}"\n'

    new_text = f"---\n{new_fm}---\n{rest}"

    if new_text == text:
        return False

    file_path.write_text(new_text, encoding="utf-8")
    return True


def main():
    parser = argparse.ArgumentParser(description="Bump content-version dates")
    parser.add_argument(
        "--date",
        type=str,
        default=date.today().isoformat(),
        help="Version date in YYYY-MM-DD format (default: today)",
    )
    args = parser.parse_args()

    version_date = args.date
    # Validate date format
    try:
        date.fromisoformat(version_date)
    except ValueError:
        print(f"Error: invalid date format '{version_date}', expected YYYY-MM-DD")
        sys.exit(1)

    # Load existing versions
    if VERSIONS_FILE.exists():
        versions = json.loads(VERSIONS_FILE.read_text(encoding="utf-8"))
    else:
        versions = {}

    groups = discover_groups()
    total_files_modified = 0
    groups_changed = []
    groups_unchanged = []

    for key, dir_path in groups:
        current_hash = hash_group(dir_path)
        prev = versions.get(key, {})
        prev_hash = prev.get("hash", "")

        if current_hash == prev_hash:
            groups_unchanged.append(key)
            continue

        # Group has changed (or is new)
        groups_changed.append(key)
        versions[key] = {
            "content-version": version_date,
            "hash": current_hash,
        }

        # Update frontmatter in all .md files in this group
        md_files = sorted(dir_path.glob("*.md"))
        files_modified = 0
        for f in md_files:
            if update_frontmatter(f, version_date):
                files_modified += 1
        total_files_modified += files_modified

    # Save versions file
    VERSIONS_FILE.write_text(
        json.dumps(versions, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    # Print summary
    print(f"Content version date: {version_date}")
    print(f"Groups discovered:    {len(groups)}")
    print(f"Groups changed:       {len(groups_changed)}")
    print(f"Groups unchanged:     {len(groups_unchanged)}")
    print(f"Files modified:       {total_files_modified}")

    if groups_changed:
        print("\nChanged groups:")
        for key in groups_changed:
            print(f"  {key}")

    if not groups_changed:
        print("\nNo content changes detected.")


if __name__ == "__main__":
    main()
