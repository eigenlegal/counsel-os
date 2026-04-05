# Word Tracked Changes Redline Output

## Problem

When `/negotiate` produces redlines, the output is markdown with Current/Proposed text pairs. Claude sometimes improvises .docx generation via python-docx, but the result is a clean document — no tracked changes, no comments, no author attribution. Lawyers need a .docx with Word-native tracked changes and comments attributed to their name, which is the standard format counterparties expect.

## Solution

Add a Word tracked changes pipeline to `/deliver` that takes the negotiate output (Current/Proposed pairs with rationale) and produces a .docx with:

- Tracked changes showing exactly what was modified
- Comments with counterparty-facing rationale on each changed clause
- All revisions and comments attributed to the user's name (from `practice/identity.md`)

## Capability Tiers

Detection runs at the start of deliver when the matter involves a negotiation:

| Check | Method |
|-------|--------|
| Source is .docx | File path from conversation context ends in `.docx` |
| python-docx available | `python3 -c "import docx"` exits 0 |
| Word installed | `/Applications/Microsoft Word.app` exists |
| User name available | `practice/identity.md` has a name that isn't a placeholder (not `[YOUR NAME HERE]` or similar bracket templates) |

Three tiers of output, degrading gracefully:

| Tier | Requirements | Output |
|------|-------------|--------|
| Full | All four checks pass | .docx with tracked changes + comments, author = user |
| Partial | .docx + python-docx, no Word | Clean modified .docx (no tracked changes). User told they can run Word Compare manually |
| Markdown | Missing .docx or python-docx | Current behavior — markdown redline package |

The user is always offered the best available tier. They can decline and get markdown instead.

## Pipeline (Full Tier)

### Step A — Extract Pairs

Parse the negotiate output for all Current/Proposed pairs and counterparty-facing rationale. Write to a temp JSON file:

```json
[
  {
    "current": "The Company shall not be liable for any indirect damages",
    "proposed": "The Company's liability for indirect damages shall be limited to the total fees paid in the preceding 12 months",
    "comment": "Market standard is to cap indirect damages rather than exclude entirely. This protects both parties proportionally.",
    "author": "Sarah Chen"
  }
]
```

- `current`: exact text from the original document
- `proposed`: exact replacement text
- `comment`: counterparty-facing rationale (from negotiate Format A output). Null if no rationale for this item.
- `author`: user's name from `practice/identity.md`, same for all entries

### Step B — Apply Changes + Comments

`scripts/apply_redlines.py` — Python script using python-docx.

**Inputs:**
- Path to original .docx
- Path to temp JSON with redline pairs
- Path for output .docx (temp file)

**Logic:**
1. Open original .docx
2. Save-as to output path (working copy)
3. For each pair in the JSON:
   a. Search all paragraphs for `current` text. Handle text that spans multiple runs within a paragraph by joining run text for matching, then reconstructing runs to preserve formatting.
   b. Replace matched text with `proposed` text. Apply the formatting of the first matched run to the replacement.
   c. If `comment` is non-null, add a Word comment on the replaced paragraph with the comment text, authored as `author`.
4. Save the modified document.

**Edge cases:**
- Text spanning multiple paragraphs: log a warning, skip that pair, report it to the user so they can apply manually.
- No match found: log a warning, skip, report to user.
- Multiple matches: replace only the first occurrence, warn user.

**Formatting preservation:**
- The script operates on a copy of the original .docx, so all styles, headers, footers, page layout, fonts, and tables are preserved.
- Only the text content of matched runs changes. Run-level formatting (bold, italic, font, size) is preserved from the original.

### Step C — Word Compare

`scripts/word_compare.sh` — Shell script wrapping `osascript` to drive Microsoft Word.

**Inputs:**
- Path to original .docx
- Path to modified .docx (from Step B)
- Author name
- Path for final output .docx

**Logic (AppleScript):**
1. Tell Microsoft Word to activate
2. Open the original document
3. Open the modified document
4. Run Compare Documents (original vs modified)
5. Set the revision author on all tracked changes to the provided author name
6. Save the comparison result to the final output path
7. Close all three documents (original, modified, comparison)
8. Delete the temp modified .docx

**Output naming:** `{OriginalName}-redline-{YYYY-MM-DD}.docx` saved alongside the original, unless user specifies otherwise.

### Step D — Return Path

Report the final .docx path to the user. Suggest next steps:
- Review the tracked changes in Word
- Proceed to `/counsel-os:close` to log the matter

## Fallback (Partial Tier)

When Word is not installed but python-docx is available and the source is .docx:

- Run Steps A and B only
- The modified .docx (clean, no tracked changes) is the deliverable
- Tell the user: "Word isn't available for automated Compare. You can open both files in Word and run Tools > Compare Documents to generate tracked changes."

## Package Changes

### New Files

```
scripts/
  apply_redlines.py      # Step B: find/replace + comments via python-docx
  word_compare.sh         # Step C: osascript wrapper for Word Compare
```

### Modified Files

```
skills/deliver/SKILL.md   # Add Word output section between Step 3 and Step 4
```

### Changes to deliver/SKILL.md

Add a new section "Step 3b: Word Tracked Changes Output" between the existing Step 3 (Format the Deliverable) and Step 4 (Connected Service Delivery).

This section:
1. Checks if the matter is a negotiation with a .docx source
2. Runs capability detection
3. Offers the best available tier to the user
4. If accepted, orchestrates the pipeline (extract pairs → apply_redlines.py → word_compare.sh)
5. If declined, proceeds with markdown output as today

### No Config Changes

No changes to `config.md`, `config.local.md`, or `CLAUDE.md`. The feature is auto-detected based on system capabilities. No new user configuration required.

### No New Dependencies

- python-docx is already installed
- Microsoft Word is already installed
- osascript is native to macOS

## Limitations

- **macOS only:** The Word Compare step uses AppleScript, which is macOS-specific. On other platforms, falls back to Partial tier.
- **Multi-paragraph replacements:** Text spanning multiple paragraphs cannot be reliably matched by python-docx's paragraph-level API. These are skipped with a warning.
- **Complex formatting:** Tables, nested lists, and text boxes may not match cleanly. The script handles paragraph-level text only.
- **Word version:** Tested against Word for Mac. The AppleScript API may differ across Word versions.
