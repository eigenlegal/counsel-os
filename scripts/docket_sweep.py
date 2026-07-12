#!/usr/bin/env python3
"""Deadline docket sweep — read-only.

Walks a matters directory, reads the `deadlines:` frontmatter block on every
`counsel-os-type: matter` file, and classifies each entry as overdue, due
within a window, or upcoming. Date arithmetic across the vault is a
deterministic mechanical task, so it lives here (the /counsel-os:docket skill
formats the result) rather than being eyeballed by the model — a missed date
is the practice's #1 malpractice vector.

Stdlib only — no PyYAML, no python-docx, no third-party deps (there is no
Python requirements manifest; a new dep would ImportError on a fresh install).
The deadline schema is fixed and simple, so a focused frontmatter parser is
enough and stays deterministic.

Deadline frontmatter convention (see primitives/remember.md):

    deadlines:
      - date: 2026-07-15
        action: "renewal notice due"
        type: renewal          # optional: renewal | notice | objection | milestone | filing
        source: "MSA §9.2"     # optional: the clause the date comes from
        done: false            # optional: true/done drops it from the sweep (kept for audit)

Usage:
    docket_sweep.py <matters_dir> [--window N] [--today YYYY-MM-DD]
                                  [--format text|json] [--include-done]
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*(?:\n|$)", re.DOTALL)
TOP_KEY_RE = re.compile(r"^([A-Za-z0-9_-]+):\s*(.*)$")
DONE_VALUES = {"true", "yes", "done", "1", "satisfied", "complete", "completed"}
ENTRY_KEYS = {"date", "action", "type", "source", "done", "status"}


def _unquote(value):
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def extract_frontmatter(text):
    m = FRONTMATTER_RE.match(text)
    return m.group(1) if m else None


def scalar_fields(frontmatter):
    """Top-level scalar keys (stage, matter-id, counterparty, ...)."""
    fields = {}
    for line in frontmatter.splitlines():
        if line.startswith((" ", "\t", "-")):
            continue
        m = TOP_KEY_RE.match(line)
        if m and m.group(2) != "":
            fields[m.group(1)] = _unquote(m.group(2))
    return fields


def parse_deadlines(frontmatter):
    """Parse the `deadlines:` list-of-maps block. Returns list of dicts."""
    lines = frontmatter.splitlines()
    start = None
    for i, line in enumerate(lines):
        if re.match(r"^deadlines:\s*(.*)$", line):
            start = i
            break
    if start is None:
        return []

    # Collect the block: blank lines, indented lines, and column-0 list items
    # ("- ...") all belong; the next top-level key (e.g. "stage:") ends it.
    block = []
    for line in lines[start + 1:]:
        if line.strip() == "":
            block.append(line)
            continue
        if line.startswith((" ", "\t")) or line.lstrip().startswith("-"):
            block.append(line)
            continue
        break

    entries = []
    current = None
    for line in block:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("-"):
            if current is not None:
                entries.append(current)
            current = {}
            rest = stripped[1:].strip()  # first field may follow the dash
            if rest:
                _apply_field(current, rest)
        elif current is not None:
            _apply_field(current, stripped)
    if current is not None:
        entries.append(current)
    return entries


def _apply_field(entry, text):
    m = TOP_KEY_RE.match(text)
    if not m:
        return
    key, value = m.group(1).lower(), _unquote(m.group(2))
    if key in ENTRY_KEYS:
        entry[key] = value


def is_done(entry):
    if str(entry.get("done", "")).strip().lower() in DONE_VALUES:
        return True
    if str(entry.get("status", "")).strip().lower() in DONE_VALUES:
        return True
    return False


def classify(days_until, window):
    if days_until < 0:
        return "overdue"
    if days_until <= window:
        return "due_soon"
    return "upcoming"


def sweep(matters_dir, today, window, include_done):
    deadlines = []
    malformed = []
    skipped_done = 0

    for path in sorted(matters_dir.rglob("*.md")):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        frontmatter = extract_frontmatter(text)
        if frontmatter is None:
            continue
        fields = scalar_fields(frontmatter)
        if fields.get("counsel-os-type") != "matter":
            continue

        matter_id = fields.get("matter-id") or path.stem
        stage = fields.get("stage", "unknown")
        counterparty = fields.get("counterparty", "")

        for entry in parse_deadlines(frontmatter):
            base = {
                "matter_id": matter_id,
                "stage": stage,
                "counterparty": counterparty,
                "file": str(path),
                "action": entry.get("action", ""),
                "type": entry.get("type", ""),
                "source": entry.get("source", ""),
                "date": entry.get("date", ""),
            }
            if is_done(entry) and not include_done:
                skipped_done += 1
                continue
            raw_date = entry.get("date", "").strip()
            try:
                due = date.fromisoformat(raw_date)
            except ValueError:
                base["reason"] = (
                    f"unparseable date {raw_date!r} (want YYYY-MM-DD)"
                    if raw_date
                    else "missing date"
                )
                malformed.append(base)
                continue
            days_until = (due - today).days
            deadlines.append(
                {**base, "days_until": days_until, "status": classify(days_until, window)}
            )

    deadlines.sort(key=lambda d: (d["date"], d["matter_id"]))
    malformed.sort(key=lambda d: d["matter_id"])
    return deadlines, malformed, skipped_done


def render_text(deadlines, malformed, skipped_done, today, window):
    out = []
    groups = [
        ("overdue", "OVERDUE"),
        ("due_soon", f"DUE WITHIN {window} DAYS"),
        ("upcoming", "UPCOMING (beyond window)"),
    ]
    out.append(f"Deadline docket — as of {today.isoformat()} (window: {window} days)")
    out.append("")
    any_shown = False
    for key, heading in groups:
        rows = [d for d in deadlines if d["status"] == key]
        if not rows:
            continue
        any_shown = True
        out.append(f"## {heading} ({len(rows)})")
        for d in rows:
            when = _relative(d["days_until"])
            stage_tag = "" if d["stage"] in ("working", "intake", "unknown") else f" [{d['stage']}]"
            cp = f" — {d['counterparty']}" if d["counterparty"] else ""
            src = f"  ({d['source']})" if d["source"] else ""
            action = d["action"] or "(no action recorded)"
            out.append(f"  {d['date']}  {when:>12}  {action}{src}")
            out.append(f"                            {d['matter_id']}{cp}{stage_tag}")
        out.append("")
    if not any_shown:
        out.append("No open deadlines in range. (Nothing overdue or due within the window.)")
        out.append("")
    if malformed:
        out.append(f"## MALFORMED ({len(malformed)}) — fix these; they were not classified")
        for d in malformed:
            out.append(f"  {d['matter_id']}: {d['reason']}  ({d['file']})")
        out.append("")
    if skipped_done:
        out.append(f"({skipped_done} deadline(s) marked done and hidden — pass --include-done to show.)")
    return "\n".join(out).rstrip() + "\n"


def _relative(days):
    if days < 0:
        n = -days
        return f"{n}d overdue" if n != 1 else "1d overdue"
    if days == 0:
        return "today"
    return f"in {days}d"


def main(argv=None):
    parser = argparse.ArgumentParser(description="Deadline docket sweep (read-only).")
    parser.add_argument("matters_dir", help="Directory holding matter markdown files")
    parser.add_argument("--window", type=int, default=60, help="Look-ahead window in days (default 60)")
    parser.add_argument("--today", help="Override today's date (YYYY-MM-DD), for testing")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    parser.add_argument("--include-done", action="store_true", help="Show deadlines marked done")
    args = parser.parse_args(argv)

    matters_dir = Path(args.matters_dir)
    if not matters_dir.is_dir():
        print(f"error: matters directory not found: {matters_dir}", file=sys.stderr)
        return 2

    if args.today:
        try:
            today = date.fromisoformat(args.today)
        except ValueError:
            print(f"error: --today must be YYYY-MM-DD, got {args.today!r}", file=sys.stderr)
            return 2
    else:
        today = date.today()

    deadlines, malformed, skipped_done = sweep(matters_dir, today, args.window, args.include_done)

    if args.format == "json":
        print(
            json.dumps(
                {
                    "today": today.isoformat(),
                    "window": args.window,
                    "counts": {
                        "overdue": sum(1 for d in deadlines if d["status"] == "overdue"),
                        "due_soon": sum(1 for d in deadlines if d["status"] == "due_soon"),
                        "upcoming": sum(1 for d in deadlines if d["status"] == "upcoming"),
                        "malformed": len(malformed),
                        "done_hidden": skipped_done,
                    },
                    "deadlines": deadlines,
                    "malformed": malformed,
                },
                indent=2,
            )
        )
    else:
        sys.stdout.write(render_text(deadlines, malformed, skipped_done, today, args.window))
    return 0


if __name__ == "__main__":
    sys.exit(main())
