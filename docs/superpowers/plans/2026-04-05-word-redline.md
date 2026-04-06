# Word Tracked Changes Redline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Word tracked changes pipeline to `/deliver` that produces .docx files with revision marks and comments attributed to the user.

**Architecture:** Two scripts (`apply_redlines.py` for text replacement + comments via python-docx, `word_compare.sh` for AppleScript-driven Word Compare) orchestrated by a new section in the deliver skill. Capability detection enables graceful degradation across three tiers.

**Tech Stack:** python-docx 1.2.0 (already installed), Microsoft Word for Mac AppleScript (`compare` command with `author name` parameter), osascript.

---

### Task 1: Create `scripts/apply_redlines.py`

**Files:**
- Create: `scripts/apply_redlines.py`

- [ ] **Step 1: Create the scripts directory and write `apply_redlines.py`**

```python
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
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/apply_redlines.py`

- [ ] **Step 3: Test with the test_comment.docx we already have**

Run:
```bash
# Create a test document
python3 -c "
from docx import Document
doc = Document()
doc.add_paragraph('The Company shall not be liable for any indirect damages arising from this agreement.')
doc.add_paragraph('This agreement shall be governed by the laws of Delaware.')
doc.save('/tmp/test_original.docx')
print('Created test document')
"

# Create test redlines JSON
cat > /tmp/test_redlines.json << 'ENDJSON'
[
  {
    "current": "The Company shall not be liable for any indirect damages arising from this agreement.",
    "proposed": "The Company's liability for indirect damages shall be limited to the total fees paid in the preceding 12 months.",
    "comment": "Market standard is to cap indirect damages rather than exclude entirely.",
    "author": "Sarah Chen"
  },
  {
    "current": "laws of Delaware",
    "proposed": "laws of the State of New York",
    "comment": null,
    "author": "Sarah Chen"
  }
]
ENDJSON

# Run the script
python3 scripts/apply_redlines.py /tmp/test_original.docx /tmp/test_redlines.json /tmp/test_modified.docx
```

Expected: JSON output showing 2 applied, 0 skipped. File at `/tmp/test_modified.docx`.

- [ ] **Step 4: Verify the modified document content**

Run:
```bash
python3 -c "
from docx import Document
doc = Document('/tmp/test_modified.docx')
for p in doc.paragraphs:
    print(p.text)
print('---')
comments = doc.part.comments
for c in comments:
    print(f'Comment by {c.author}: {c.text}')
"
```

Expected:
```
The Company's liability for indirect damages shall be limited to the total fees paid in the preceding 12 months.
This agreement shall be governed by the laws of the State of New York.
---
Comment by Sarah Chen: Market standard is to cap indirect damages rather than exclude entirely.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/apply_redlines.py
git commit -m "feat: add apply_redlines.py for docx text replacement + comments"
```

---

### Task 2: Create `scripts/word_compare.sh`

**Files:**
- Create: `scripts/word_compare.sh`

- [ ] **Step 1: Write the AppleScript wrapper**

```bash
#!/bin/bash
# word_compare.sh — Use Microsoft Word to compare two documents and produce
# a tracked changes document with revisions attributed to a specified author.
#
# Usage:
#   ./word_compare.sh <original.docx> <modified.docx> <author_name> <output.docx>
#
# Requires: Microsoft Word for Mac

set -euo pipefail

if [ $# -ne 4 ]; then
    echo "Usage: $0 <original.docx> <modified.docx> <author_name> <output.docx>"
    exit 1
fi

ORIGINAL="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
MODIFIED="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
AUTHOR="$3"
OUTPUT="$(cd "$(dirname "$4")" 2>/dev/null && pwd)/$(basename "$4")" || OUTPUT="$4"

# Check Word is installed
if [ ! -d "/Applications/Microsoft Word.app" ]; then
    echo "Error: Microsoft Word not found at /Applications/Microsoft Word.app"
    exit 1
fi

# Check input files exist
if [ ! -f "$ORIGINAL" ]; then
    echo "Error: Original document not found: $ORIGINAL"
    exit 1
fi

if [ ! -f "$MODIFIED" ]; then
    echo "Error: Modified document not found: $MODIFIED"
    exit 1
fi

echo "Comparing documents..."
echo "  Original: $ORIGINAL"
echo "  Modified: $MODIFIED"
echo "  Author:   $AUTHOR"
echo "  Output:   $OUTPUT"

osascript << ENDSCRIPT
tell application "Microsoft Word"
    activate
    
    -- Open the original document
    set origDoc to open file name POSIX file "$ORIGINAL"
    
    -- Compare with the modified document, author name set to specified author
    compare origDoc path "$MODIFIED" author name "$AUTHOR" target compare target new add to recent files false
    
    -- The comparison result is now the active document
    set compDoc to active document
    
    -- Save the comparison document
    save as compDoc file name POSIX file "$OUTPUT" file format format document
    
    -- Close all documents
    close compDoc saving no
    close origDoc saving no
end tell
ENDSCRIPT

COMPARE_EXIT=$?

if [ $COMPARE_EXIT -eq 0 ]; then
    echo "Success: Tracked changes document saved to $OUTPUT"
    
    # Clean up the intermediate modified file
    rm -f "$MODIFIED"
    echo "Cleaned up intermediate file: $MODIFIED"
else
    echo "Error: Word Compare failed with exit code $COMPARE_EXIT"
    exit 1
fi
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/word_compare.sh`

- [ ] **Step 3: Test with the documents from Task 1**

Run:
```bash
# Re-create modified doc (Task 1 test may have been cleaned up)
python3 scripts/apply_redlines.py /tmp/test_original.docx /tmp/test_redlines.json /tmp/test_modified.docx

# Run Word Compare
./scripts/word_compare.sh /tmp/test_original.docx /tmp/test_modified.docx "Sarah Chen" /tmp/test-redline-2026-04-05.docx
```

Expected: Word opens briefly, runs the compare, saves to `/tmp/test-redline-2026-04-05.docx`, cleans up `/tmp/test_modified.docx`.

- [ ] **Step 4: Verify the output has tracked changes**

Open `/tmp/test-redline-2026-04-05.docx` in Word manually. Verify:
- Tracked changes show deletions (red strikethrough) and insertions
- Revision author is "Sarah Chen" on all changes
- Comments from the original modified doc are preserved

- [ ] **Step 5: Commit**

```bash
git add scripts/word_compare.sh
git commit -m "feat: add word_compare.sh for AppleScript-driven tracked changes"
```

---

### Task 3: Update `skills/deliver/SKILL.md`

**Files:**
- Modify: `skills/deliver/SKILL.md` (insert new section between existing Step 3 and Step 4)

- [ ] **Step 1: Add "Step 3b: Word Tracked Changes Output" to deliver skill**

Insert the following after the "Quick Summary" format block (after line 178) and before "## Step 4: Connected Service Delivery" (line 180):

```markdown
## Step 3b: Word Tracked Changes Output

When the matter involves a negotiation and the source document was a .docx file, check if Word tracked changes output is available.

### Capability Detection

Run these checks:

1. **Source is .docx:** The original document path from the conversation ends in `.docx`
2. **python-docx available:** Run `python3 -c "import docx"` — exits 0
3. **Word installed:** `/Applications/Microsoft Word.app` exists
4. **User name available:** `{legal_root}/practice/identity.md` contains a name that isn't a bracket placeholder like `[YOUR NAME HERE]`

### Tier Selection

| Tier | Requirements | Action |
|------|-------------|--------|
| Full | All four checks pass | Offer tracked changes .docx with comments, all attributed to user |
| Partial | Checks 1+2 pass, check 3 fails | Offer clean modified .docx. Tell user: "Word isn't available for automated Compare. You can open both files in Word and run Review > Compare to generate tracked changes." |
| Markdown | Check 1 or 2 fails | Skip this step — proceed with markdown output from Step 3 |

If Full or Partial tier is available, ask the user:

> I can generate a Word document with tracked changes attributed to [user's name]. The redline comments will appear as Word comments from you. Would you like me to generate this?

If they decline, skip to Step 4.

### Pipeline Execution

**A. Extract pairs.** From the negotiate output, collect all Current/Proposed pairs and counterparty-facing rationale. Write to a temp JSON file at `/tmp/counsel-os-redlines-{timestamp}.json`:

```json
[
  {
    "current": "exact current language from negotiate output",
    "proposed": "exact proposed language from negotiate output",
    "comment": "counterparty-facing rationale, or null if none",
    "author": "User's Name from identity.md"
  }
]
```

**B. Apply changes.** Run the apply script:

```bash
python3 {plugin_root}/scripts/apply_redlines.py "{original.docx}" "/tmp/counsel-os-redlines-{timestamp}.json" "/tmp/counsel-os-modified-{timestamp}.docx"
```

Parse the JSON output. Report any skipped items to the user — these need to be applied manually in Word.

**C. Word Compare (Full tier only).** Run the compare script:

```bash
{plugin_root}/scripts/word_compare.sh "{original.docx}" "/tmp/counsel-os-modified-{timestamp}.docx" "{author_name}" "{output_path}"
```

Default output path: `{original_dir}/{original_name}-redline-{YYYY-MM-DD}.docx`

**D. Report results.** Tell the user:
- Where the file was saved
- How many changes were applied vs. skipped
- Any items that need manual attention
- Suggest: "Review the tracked changes in Word, then run `/counsel-os:close` to log this matter."
```

- [ ] **Step 2: Verify the skill reads correctly**

Read through the full `skills/deliver/SKILL.md` to confirm the new section integrates cleanly between Step 3 and Step 4. Check that step numbering is consistent (3, 3b, 4, 5).

- [ ] **Step 3: Commit**

```bash
git add skills/deliver/SKILL.md
git commit -m "feat: add Word tracked changes output tier to deliver skill"
```

---

### Task 4: End-to-End Test

**Files:** None (testing only)

- [ ] **Step 1: Create a realistic test contract**

Run:
```bash
python3 -c "
from docx import Document
doc = Document()
doc.add_heading('MASTER SERVICES AGREEMENT', level=1)
doc.add_paragraph('This Master Services Agreement (the \"Agreement\") is entered into by and between Acme Corp (\"Client\") and Vendor Inc. (\"Vendor\").')
doc.add_heading('1. TERM', level=2)
doc.add_paragraph('This Agreement shall commence on the Effective Date and continue for a period of twelve (12) months, automatically renewing for successive twelve (12) month periods unless either party provides sixty (60) days written notice of non-renewal.')
doc.add_heading('2. LIABILITY', level=2)
doc.add_paragraph('Vendor shall not be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability.')
doc.add_heading('3. INDEMNIFICATION', level=2)
doc.add_paragraph('Client shall indemnify and hold harmless Vendor from and against any and all claims, damages, losses, costs, and expenses arising from or related to Client\\'s use of the services.')
doc.add_heading('4. GOVERNING LAW', level=2)
doc.add_paragraph('This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of laws principles.')
doc.save('/tmp/test_msa.docx')
print('Created test MSA')
"
```

- [ ] **Step 2: Create a realistic redlines JSON**

Run:
```bash
cat > /tmp/test_msa_redlines.json << 'ENDJSON'
[
  {
    "current": "automatically renewing for successive twelve (12) month periods unless either party provides sixty (60) days written notice of non-renewal",
    "proposed": "automatically renewing for successive twelve (12) month periods unless either party provides ninety (90) days written notice of non-renewal",
    "comment": "60 days is insufficient lead time for transition planning. 90 days is market standard for enterprise agreements.",
    "author": "Sarah Chen"
  },
  {
    "current": "Vendor shall not be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability.",
    "proposed": "Neither party shall be liable for any indirect, incidental, special, consequential, or punitive damages, except in cases of gross negligence or willful misconduct. In no event shall either party's total aggregate liability exceed the fees paid in the twelve (12) months preceding the claim.",
    "comment": "One-sided liability exclusion is non-standard. Mutual limitation with a cap tied to fees paid is market standard and protects both parties proportionally.",
    "author": "Sarah Chen"
  },
  {
    "current": "Client shall indemnify and hold harmless Vendor from and against any and all claims, damages, losses, costs, and expenses arising from or related to Client's use of the services.",
    "proposed": "Each party shall indemnify and hold harmless the other party from and against any claims, damages, losses, costs, and expenses arising from the indemnifying party's breach of this Agreement, gross negligence, or willful misconduct.",
    "comment": "One-sided indemnification with unlimited scope is heavily vendor-favorable. Mutual indemnification tied to breach and misconduct is balanced and standard.",
    "author": "Sarah Chen"
  },
  {
    "current": "laws of the State of Texas",
    "proposed": "laws of the State of New York",
    "comment": null,
    "author": "Sarah Chen"
  }
]
ENDJSON
```

- [ ] **Step 3: Run the full pipeline**

Run:
```bash
# Step B: Apply redlines
python3 scripts/apply_redlines.py /tmp/test_msa.docx /tmp/test_msa_redlines.json /tmp/test_msa_modified.docx

# Step C: Word Compare
./scripts/word_compare.sh /tmp/test_msa.docx /tmp/test_msa_modified.docx "Sarah Chen" /tmp/MSA-redline-2026-04-05.docx
```

Expected: 4 applied, 0 skipped. Final document at `/tmp/MSA-redline-2026-04-05.docx`.

- [ ] **Step 4: Open and verify in Word**

Open `/tmp/MSA-redline-2026-04-05.docx` in Word. Verify:
- All 4 tracked changes are visible with red strikethrough for deletions and colored text for insertions
- All tracked changes are attributed to "Sarah Chen"
- 3 comments are present (the governing law change has no comment)
- Comments are attributed to "Sarah Chen"
- Document formatting (headings, paragraph styles) is preserved
- No extra artifacts or broken formatting

- [ ] **Step 5: Final commit with all files**

```bash
git add scripts/apply_redlines.py scripts/word_compare.sh skills/deliver/SKILL.md
git commit -m "feat: Word tracked changes redline pipeline for deliver phase

Adds capability-detected pipeline that produces .docx with tracked
changes and comments attributed to the user via python-docx + Word
Compare. Degrades gracefully when Word isn't available."
```
