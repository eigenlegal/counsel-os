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
        "author": "Author Name",
        "match": {
          "location": "body[12]",
          "before": "optional immediately preceding text",
          "after": "optional immediately following text"
        }
      }
    ]

If `current` appears more than once, the script refuses to apply that item
unless `match` selects exactly one occurrence. Supported match selectors:
`location`, `paragraph_index`, `occurrence`, `before`, `after`, and `context`.
"""

import json
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional
from xml.etree import ElementTree as ET

from docx import Document

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
UNSUPPORTED_PARTS = (
    ("word/footnotes.xml", "footnote", "footnote"),
    ("word/endnotes.xml", "endnote", "endnote"),
    ("word/comments.xml", "comment", "comment"),
)


@dataclass
class TextMatch:
    location: str
    occurrence: int
    start: int
    end: int
    text: str
    before: str
    after: str
    replaceable: bool
    paragraph: Optional[Any] = None
    paragraph_index: Optional[int] = None


def get_paragraph_text(paragraph):
    """Get the full text of a paragraph by joining all runs."""
    return "".join(run.text for run in paragraph.runs)


def find_occurrence_starts(text, current):
    """Return non-overlapping start offsets for current in text."""
    if not current:
        return []

    starts = []
    start = 0
    while True:
        index = text.find(current, start)
        if index == -1:
            return starts
        starts.append(index)
        start = index + len(current)


def context_before(text, start_idx, size=160):
    return text[max(0, start_idx - size) : start_idx]


def context_after(text, end_idx, size=160):
    return text[end_idx : end_idx + size]


def truncate(text, length=80):
    return text[:length] + "..." if len(text) > length else text


def replace_in_paragraph(paragraph, current, proposed, start_idx=None):
    """Replace `current` text with `proposed` in a paragraph, preserving formatting.

    Joins run text to find the match, then reconstructs runs so the first
    matched run gets the replacement text and subsequent matched runs are
    cleared. Formatting of the first matched run is preserved.

    Returns True if a replacement was made, False otherwise.
    """
    full_text = get_paragraph_text(paragraph)
    if start_idx is None:
        start_idx = full_text.find(current)
    if start_idx == -1 or full_text[start_idx : start_idx + len(current)] != current:
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


def collect_matches_from_paragraph(paragraph, current, location, occurrence, paragraph_index=None):
    full_text = get_paragraph_text(paragraph)
    matches = []

    for start in find_occurrence_starts(full_text, current):
        end = start + len(current)
        matches.append(
            TextMatch(
                location=location,
                occurrence=occurrence + len(matches),
                start=start,
                end=end,
                text=full_text,
                before=context_before(full_text, start),
                after=context_after(full_text, end),
                replaceable=True,
                paragraph=paragraph,
                paragraph_index=paragraph_index,
            )
        )

    return matches


def collect_replaceable_matches(document, current):
    matches = []

    for paragraph_index, paragraph in enumerate(document.paragraphs):
        matches.extend(
            collect_matches_from_paragraph(
                paragraph,
                current,
                f"body[{paragraph_index}]",
                len(matches),
                paragraph_index=paragraph_index,
            )
        )

    for table_index, table in enumerate(document.tables):
        for row_index, row in enumerate(table.rows):
            for cell_index, cell in enumerate(row.cells):
                for paragraph_index, paragraph in enumerate(cell.paragraphs):
                    matches.extend(
                        collect_matches_from_paragraph(
                            paragraph,
                            current,
                            (
                                f"table[{table_index}].row[{row_index}]"
                                f".cell[{cell_index}].p[{paragraph_index}]"
                            ),
                            len(matches),
                        )
                    )

    return matches


def paragraph_text_from_xml(paragraph):
    return "".join(node.text or "" for node in paragraph.iter(f"{W_NS}t"))


def collect_unsupported_matches(docx_path, current, occurrence):
    matches = []

    try:
        with zipfile.ZipFile(docx_path) as package:
            names = set(package.namelist())
            part_specs = list(UNSUPPORTED_PARTS)
            part_specs.extend(
                (name, "header", Path(name).stem)
                for name in names
                if name.startswith("word/header") and name.endswith(".xml")
            )
            part_specs.extend(
                (name, "footer", Path(name).stem)
                for name in names
                if name.startswith("word/footer") and name.endswith(".xml")
            )

            for part_name, part_kind, part_label in part_specs:
                if part_name not in names:
                    continue

                root = ET.fromstring(package.read(part_name))
                paragraph_index = 0
                for paragraph in root.iter(f"{W_NS}p"):
                    full_text = paragraph_text_from_xml(paragraph)
                    for start in find_occurrence_starts(full_text, current):
                        end = start + len(current)
                        matches.append(
                            TextMatch(
                                location=f"{part_label}[{paragraph_index}]",
                                occurrence=occurrence + len(matches),
                                start=start,
                                end=end,
                                text=full_text,
                                before=context_before(full_text, start),
                                after=context_after(full_text, end),
                                replaceable=False,
                            )
                        )
                    paragraph_index += 1
    except (zipfile.BadZipFile, ET.ParseError):
        return matches

    return matches


def collect_matches(document, docx_path, current):
    matches = collect_replaceable_matches(document, current)
    matches.extend(collect_unsupported_matches(docx_path, current, len(matches)))
    return matches


def format_match(match):
    return {
        "location": match.location,
        "occurrence": match.occurrence,
        "start": match.start,
        "replaceable": match.replaceable,
        "before": truncate(match.before.strip(), 80),
        "after": truncate(match.after.strip(), 80),
    }


def select_match(matches, match_spec):
    selected = matches

    if not match_spec:
        if len(matches) == 1:
            return matches[0], None
        return None, f"Found {len(matches)} matches; add a match disambiguator"

    if not isinstance(match_spec, dict):
        return None, "match must be an object"

    if "occurrence" in match_spec:
        try:
            occurrence = int(match_spec["occurrence"])
        except (TypeError, ValueError):
            return None, "match.occurrence must be an integer"
        selected = [match for match in selected if match.occurrence == occurrence]

    if "location" in match_spec:
        selected = [
            match for match in selected if match.location == str(match_spec["location"])
        ]

    if "paragraph_index" in match_spec:
        try:
            paragraph_index = int(match_spec["paragraph_index"])
        except (TypeError, ValueError):
            return None, "match.paragraph_index must be an integer"
        selected = [
            match for match in selected if match.paragraph_index == paragraph_index
        ]

    if "before" in match_spec:
        before = str(match_spec["before"])
        selected = [match for match in selected if match.before.endswith(before)]

    if "after" in match_spec:
        after = str(match_spec["after"])
        selected = [match for match in selected if match.after.startswith(after)]

    if "context" in match_spec:
        context = str(match_spec["context"])
        selected = [match for match in selected if context in match.text]

    if len(selected) == 1:
        return selected[0], None
    if len(selected) == 0:
        return None, "match disambiguator selected no matches"
    return None, f"match disambiguator still selected {len(selected)} matches"


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
        match_spec = item.get("match")

        if not current:
            results["skipped"].append(
                {
                    "index": i,
                    "current": "",
                    "reason": "current text must not be empty",
                }
            )
            continue

        matches = collect_matches(doc, original_path, current)
        if not matches:
            results["skipped"].append(
                {
                    "index": i,
                    "current": truncate(current),
                    "reason": "Text not found in document",
                }
            )
            continue

        selected_match, reason = select_match(matches, match_spec)
        if selected_match is None:
            results["skipped"].append(
                {
                    "index": i,
                    "current": truncate(current),
                    "reason": reason,
                    "matches": [format_match(match) for match in matches],
                }
            )
            continue

        if not selected_match.replaceable:
            results["skipped"].append(
                {
                    "index": i,
                    "current": truncate(current),
                    "reason": f"Selected match is in unsupported content: {selected_match.location}",
                    "matches": [format_match(selected_match)],
                }
            )
            continue

        replaced = replace_in_paragraph(
            selected_match.paragraph, current, proposed, selected_match.start
        )
        if replaced:
            if comment_text:
                add_comment_to_paragraph(
                    doc, selected_match.paragraph, comment_text, author
                )
            results["applied"].append(
                {
                    "index": i,
                    "location": selected_match.location,
                    "occurrence": selected_match.occurrence,
                }
            )
            continue

        results["skipped"].append(
            {
                "index": i,
                "current": truncate(current),
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
