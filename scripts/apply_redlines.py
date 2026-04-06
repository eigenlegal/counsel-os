#!/usr/bin/env python3
"""Apply redline changes to a .docx file and add comments.

Usage:
    python3 apply_redlines.py <original.docx> <redlines.json> <output.docx>

The redlines.json file should contain an array of objects:
    [
      {
        "current": "exact text to find",
        "proposed": "replacement text",
        "comment": "rationale for the change (or null)",
        "author": "Author Name"
      }
    ]
"""

import json
import sys
from copy import deepcopy
from pathlib import Path

from docx import Document


def get_paragraph_text(paragraph):
    """Get the full text of a paragraph by joining all runs."""
    return "".join(run.text for run in paragraph.runs)


def replace_in_paragraph(paragraph, current, proposed):
    """Replace `current` text with `proposed` in a paragraph, preserving formatting.

    Joins run text to find the match, then reconstructs runs so the first
    matched run gets the replacement text and subsequent matched runs are
    cleared. Formatting of the first matched run is preserved.

    Returns True if a replacement was made, False otherwise.
    """
    full_text = get_paragraph_text(paragraph)
    start_idx = full_text.find(current)
    if start_idx == -1:
        return False

    end_idx = start_idx + len(current)

    # Map character positions to runs
    char_pos = 0
    run_ranges = []  # [(start_char, end_char, run_index)]
    for i, run in enumerate(paragraph.runs):
        run_start = char_pos
        run_end = char_pos + len(run.text)
        run_ranges.append((run_start, run_end, i))
        char_pos = run_end

    # Find which runs are affected
    affected_runs = []
    for run_start, run_end, run_idx in run_ranges:
        if run_end > start_idx and run_start < end_idx:
            affected_runs.append((run_start, run_end, run_idx))

    if not affected_runs:
        return False

    first_run_start, first_run_end, first_run_idx = affected_runs[0]
    first_run = paragraph.runs[first_run_idx]

    # Text before the match in the first affected run
    prefix = first_run.text[: start_idx - first_run_start]

    # Text after the match in the last affected run
    last_run_start, last_run_end, last_run_idx = affected_runs[-1]
    last_run = paragraph.runs[last_run_idx]
    suffix = last_run.text[end_idx - last_run_start :]

    # Set the first run to prefix + proposed + suffix (if first == last)
    # or prefix + proposed (if multiple runs)
    if first_run_idx == last_run_idx:
        first_run.text = prefix + proposed + suffix
    else:
        first_run.text = prefix + proposed
        # Clear intermediate runs
        for _, _, run_idx in affected_runs[1:-1]:
            paragraph.runs[run_idx].text = ""
        # Set last run to just the suffix
        last_run.text = suffix

    return True


def add_comment_to_paragraph(document, paragraph, comment_text, author):
    """Add a Word comment anchored to the full paragraph.

    Uses python-docx 1.2.0's native comment API with mark_comment_range
    to link the comment to the paragraph's runs.
    """
    if not paragraph.runs:
        return

    comment = document.part.comments.add_comment(
        text=comment_text,
        author=author,
        initials="".join(word[0] for word in author.split() if word).upper(),
    )

    first_run = paragraph.runs[0]
    last_run = paragraph.runs[-1]
    first_run.mark_comment_range(last_run, comment.comment_id)


def main():
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <original.docx> <redlines.json> <output.docx>")
        sys.exit(1)

    original_path = Path(sys.argv[1])
    redlines_path = Path(sys.argv[2])
    output_path = Path(sys.argv[3])

    if not original_path.exists():
        print(f"Error: Original document not found: {original_path}")
        sys.exit(1)

    if not redlines_path.exists():
        print(f"Error: Redlines JSON not found: {redlines_path}")
        sys.exit(1)

    with open(redlines_path) as f:
        redlines = json.load(f)

    doc = Document(str(original_path))

    results = {"applied": [], "skipped": [], "warnings": []}

    for i, item in enumerate(redlines):
        current = item["current"]
        proposed = item["proposed"]
        comment_text = item.get("comment")
        author = item.get("author", "Unknown")

        replaced = False
        match_count = 0

        for paragraph in doc.paragraphs:
            full_text = get_paragraph_text(paragraph)
            if current in full_text:
                match_count += 1

        if match_count == 0:
            # Try searching in tables too
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for paragraph in cell.paragraphs:
                            if current in get_paragraph_text(paragraph):
                                match_count += 1

        if match_count == 0:
            results["skipped"].append(
                {
                    "index": i,
                    "current": current[:80] + "..." if len(current) > 80 else current,
                    "reason": "Text not found in document",
                }
            )
            continue

        if match_count > 1:
            results["warnings"].append(
                {
                    "index": i,
                    "current": current[:80] + "..." if len(current) > 80 else current,
                    "reason": f"Found {match_count} matches, replacing first only",
                }
            )

        # Apply replacement — body paragraphs first, then tables
        for paragraph in doc.paragraphs:
            if replace_in_paragraph(paragraph, current, proposed):
                if comment_text:
                    add_comment_to_paragraph(doc, paragraph, comment_text, author)
                results["applied"].append({"index": i})
                replaced = True
                break

        if not replaced:
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for paragraph in cell.paragraphs:
                            if replace_in_paragraph(paragraph, current, proposed):
                                if comment_text:
                                    add_comment_to_paragraph(
                                        doc, paragraph, comment_text, author
                                    )
                                results["applied"].append({"index": i})
                                replaced = True
                                break
                        if replaced:
                            break
                    if replaced:
                        break
                if replaced:
                    break

        if not replaced:
            results["skipped"].append(
                {
                    "index": i,
                    "current": current[:80] + "..." if len(current) > 80 else current,
                    "reason": "Replacement failed despite text being found",
                }
            )

    doc.save(str(output_path))

    # Print results as JSON for the caller to parse
    print(json.dumps(results, indent=2))

    applied = len(results["applied"])
    skipped = len(results["skipped"])
    warnings = len(results["warnings"])
    print(f"\nSummary: {applied} applied, {skipped} skipped, {warnings} warnings", file=sys.stderr)

    if skipped > 0:
        sys.exit(2)  # Partial success


if __name__ == "__main__":
    main()
