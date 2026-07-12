# redline-output

Reference for producing clean tracked-changes redlines via `draft --redline`. Focused on defects that caused issues in past redlines and how to prevent them. Load this file whenever generating a `.docx` redline output.

## Section numbering integrity

Numbering errors are the most common defect. They confuse counterparty reviewers and create ambiguity about scope.

### Before adding a new numbered subsection

- **Verify the target number isn't already in use.** When inserting new content (e.g., a "Carve-outs" subsection after Sec 8.3.2 Direct Losses), check whether the number you'd assign already exists. If 8.3.3 is already taken by Disclaimer, you cannot also number the new Carve-outs section 8.3.3.
- **Resolution options when the number is taken:**
  - Renumber the existing section to a higher number (e.g., Disclaimer 8.3.3 → 8.3.4) to make room for the new content
  - Place the new section at the next available number after the existing ones (e.g., new Carve-outs at 8.3.4 if Disclaimer keeps 8.3.3)
  - Pick the placement based on what reads more logically — sub-clauses qualifying limits typically come right after those limits

### When striking a section entirely

- A struck section's number is left as a numbering gap (e.g., struck Sec 7.3 leaves 7.1, 7.2, [gap], 7.4…).
- **Decide whether to leave the gap or renumber.** Gaps are acceptable in tracked-changes mode (counterparty cleans up at execution). But check whether downstream sections reference the struck section number — if so, fix the references.

### Never use placeholder numbers

- Don't draft "Sec 8.3.X. CARVE-OUTS" expecting the user to fill in X. Pick a real number when drafting.
- If the right number depends on context you don't have, ask before drafting rather than leaving a placeholder.

### Numbering format consistency

- Match the document's numbering style. If existing subsections use 7.2.1, 7.2.2, follow that pattern (don't switch to (a), (b)).
- Be especially careful with mixed conventions: some MSAs use (a), (b), (c) within numbered subsections; some use 7.2.1, 7.2.2.

## Mutual vs. single-party covenants

When converting a single-party obligation to mutual:

- **Do not insert "Each party shall…" into a single-party section.** A "Partner Obligations" section is for Partner-only obligations; mutual language doesn't fit.
- **Place mutual covenants in the right location:**
  - General Legal Terms (Sec 8 in typical MSA) for cross-cutting mutual covenants like insurance
  - Adjacent to the related provision (e.g., reciprocal indemnity goes near the existing indemnity in Sec 8.2)
  - A new Mutual Covenants section if there isn't a natural home
- **Restructure rather than rewrite inline.** If the existing language is single-party, leave it alone and add the parallel mutual obligation in a new location.

## Cross-references after renumbering

- When inserting a section that references other sections (e.g., "subject to Section 8.2"), verify the referenced number is current after all redlines apply.
- When renumbering a section, search the document for cross-references and update.
- Pay special attention to "as defined in Section X" — defined terms become invalid if Section X is renumbered or struck.

## Text cleanup post-replacement

After applying redlines (especially via `apply_redlines.py` + Word Compare), scan the output for:

- **Trailing/orphaned punctuation** — ". ." or " ." stuck at end of paragraphs, often from a struck phrase that left a period behind
- **Double spaces** from text concatenation between original and inserted text
- **Stray formatting markers** — `**` or `*` left over from struck bold/italic content
- **Truncated insertions** — proposed text that was cut off mid-sentence

These are common when the original text and proposed text share enough structure that Word Compare's diff algorithm merges them rather than fully replacing.

## Character-set matching when drafting redline JSON

- Source documents typically use Unicode smart quotes (`"` `"` `'` `'` `—`), not ASCII (`"` `'` `-`).
- **Always extract `current` text from the source** via `python-docx` or `zipfile` + XML parsing. Never type it manually — auto-correct converts ASCII to smart quotes inconsistently.
- If `apply_redlines.py` reports skipped items with "Text not found in document," the most likely cause is mismatched apostrophes or em-dashes.

## Block replacement strategies

`apply_redlines.py` replaces text **within a single paragraph only**. For multi-paragraph rewrites:

- **Split into per-paragraph entries.** Each JSON entry must match a single paragraph. A "current" string spanning two paragraphs will fail.
- **Word Compare's diff optimization** may merge proposed text into original rather than fully replacing when both share substantial text. To force a clean strike + insert visualization:
  - Change the proposed text's opening to be obviously different (different first word, different section number, etc.)
  - Or split the replacement into smaller, more targeted edits

## Formatting inheritance — start matches in the right run

`apply_redlines.py` puts all replacement text into the **first matched run**, inheriting that run's formatting (bold, italic, color, font size, highlighting, etc.). When a paragraph has a formatted leading portion followed by regular-text body — a very common pattern in legal documents — this causes the entire replacement to inherit the leading run's formatting.

### Common patterns where this bites

- **Definitions** (`§1`): `Defined Term` (bold) followed by `means ...` (regular). If `current` starts with the defined term, the whole replacement becomes bold.
- **Section headers** (`Modifications.`, `Suspension.`, `Termination.`, etc.): bold heading followed by regular body text. Same issue.
- **Inline emphasis**: an italicized phrase mid-paragraph followed by regular text.

### The fix

Make `current` start **after** the formatted leading portion, so the first matched run is the regular-text run. The bold/italic/etc. leading portion stays untouched in the source paragraph; only the regular run is replaced.

**Wrong:**
```
"current": "Authorized Persons means officers, employees, agents...",
"proposed": "Authorized Persons means officers, employees, agents and contractors of Program Partner or any of its Affiliates..."
```
Effect: bold `Authorized Persons` is in the first matched run; the entire replacement inherits bold formatting.

**Right:**
```
"current": "means officers, employees, agents...",
"proposed": "means officers, employees, agents and contractors of Program Partner or any of its Affiliates..."
```
Effect: bold `Authorized Persons` is left alone; the regular-text run is replaced; formatting split survives.

### How to detect bold-leading paragraphs when drafting

Before drafting a redline entry that targets a defined term, definition section, or section header, inspect the paragraph's run formatting via python-docx:

```python
from docx import Document
doc = Document('source.docx')
p = doc.paragraphs[INDEX]
for j, run in enumerate(p.runs):
    print(f"run[{j}] bold={run.bold} italic={run.italic} text={run.text[:60]!r}")
```

If `run[0]` is `bold=True` and `run[1]` is `bold=None` (or `False`), the paragraph has a bold-leading pattern. Start the `current` match in `run[1]`.

### When the entire paragraph is bold

Some paragraphs (warnings, all-caps disclaimers, deliberately emphasized provisions) are fully bold by design — e.g., a kill-switch or risk-disclosure paragraph. In those cases, the replacement inheriting bold is correct: it preserves the original formatting intent. Leave it. Only fix paragraphs where bold-on-replacement is **inconsistent** with the original's bold-then-regular structure.

### Same rule applies to italic, color, font size, highlighting

The first-matched-run inheritance applies to all run-level formatting properties. The same fix — start the match after the formatted portion — covers all of them.

## Pre-send verification

Before generating the final redline output via Word Compare:

1. **Run the mechanical QA checker first** — it does the tedious, deterministic part of the scan (cross-references to sections that no longer exist after renumbering, exhibits referenced but not attached, defined-term/party-name drift):
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/check_document.py" "<modified.docx>"
   ```
   Fix any `error`-severity findings (dangling cross-references especially — renumbering is exactly when these appear) before proceeding. See `read --qa`.
2. **Visually scan the modified `.docx`** for what the checker can't judge:
   - Numbering duplicates and gaps
   - Orphan punctuation
   - Section header bold/structure consistency
   - Counterparty placeholder fills (e.g., Partner name correctly inserted)
3. **Open the post-Word-Compare redline in Word** and confirm:
   - Strike and insert markings render where expected
   - No insertions are merged into adjacent text incorrectly
   - The flow reads naturally with tracked changes accepted

Don't ship without visual verification.

## Comments and rationale

Each redline JSON entry should include a counterparty-facing rationale (`comment` field). Rationale should:

- Explain the **why** (business or legal reason)
- Be measured and constructive in tone
- Not expose internal strategy, fallbacks, or risk appetite
- Reference market standards or regulatory requirements when applicable

The strikes and inserts already show the **what**; the comment explains the **why**.
