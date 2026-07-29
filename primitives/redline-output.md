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

After applying redlines, scan the output for:

- **Trailing/orphaned punctuation** — ". ." or " ." stuck at end of paragraphs, often from a struck phrase that left a period behind
- **Double spaces** from text concatenation between original and inserted text
- **Stray formatting markers** — `**` or `*` left over from struck bold/italic content
- **Truncated insertions** — proposed text that was cut off mid-sentence

With `--track`, punctuation and spacing defects almost always mean the JSON's `current`/`proposed` pair itself was malformed — fix the pair and re-run rather than hand-editing the output. When using Word Compare (the alternative engine), these also arise from its diff algorithm merging shared structure rather than fully replacing.

## Accept-all baseline — never anchor edits to a phantom document

Internally circulated "template" or "prior deal" .docx files often carry a colleague's pending tracked changes. python-docx's `paragraph.text` silently drops runs inside `w:ins` and never surfaces `w:delText` — producing a phantom baseline where pending insertions are invisible and pending deletions still read as present. Section numbers, cross-references, and `current` strings derived from that phantom are wrong.

Before drafting redline JSON against any document that may carry tracked changes:

1. **Detect:** `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/extract_redlines.py" "<source.docx>"` — if it reports pending revisions, the document is not clean.
2. **Decide the baseline with the user.** Usually the accept-all state (the document as it will read once the colleague's changes land) is the right baseline; occasionally the user wants to work from reject-all.
3. **Derive text from the XML for that state**, not from `paragraph.text`: accept-all keeps `w:t` inside `w:ins` and drops `w:delText`; reject-all is the inverse. `apply_redlines.py` matches text the same way its `get_runs` does (insertions visible, deletions invisible) — the accept-all view — so `current` strings must come from that view.

In one real document the phantom baseline shifted two cross-referenced section numbers and showed an entire block as deleted that the accept-all state retained.

## Character-set matching when drafting redline JSON

- Source documents typically use Unicode smart quotes (`"` `"` `'` `'` `—`), not ASCII (`"` `'` `-`).
- **Always extract `current` text from the source** via `python-docx` or `zipfile` + XML parsing. Never type it manually — auto-correct converts ASCII to smart quotes inconsistently.
- If `apply_redlines.py` reports skipped items with "Text not found in document," the most likely cause is mismatched apostrophes or em-dashes.

## Block replacement strategies

`apply_redlines.py` replaces text **within a single paragraph only**. For multi-paragraph rewrites:

- **Split into per-paragraph entries.** Each JSON entry must match a single paragraph. A "current" string spanning two paragraphs will fail.
- **`--track` marks only the changed core** of each pair (common prefix/suffix trimmed at word boundaries). To force a wider strike + insert visualization, split the replacement into smaller edits whose pairs share no prefix. When using Word Compare instead, its diff optimization may merge proposed text into original when both share substantial text — change the proposed opening to be obviously different, or split the replacement.

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

Before shipping the tracked-changes output:

1. **Run the mechanical QA checker first** — it does the tedious, deterministic part of the scan (cross-references to sections that no longer exist after renumbering, exhibits referenced but not attached, defined-term/party-name drift):
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/check_document.py" "<redline.docx>"
   ```
   On a `.docx` it checks the accept-all view — the document as it will read once the changes are accepted. Fix any `error`-severity findings (dangling cross-references especially — renumbering is exactly when these appear) before proceeding. See `read --qa`.
2. **Extract and re-read the revisions** — `extract_redlines.py` on the output lists every insertion/deletion with its paragraph context; confirm each maps to an intended edit and nothing extra crept in.
3. **Open the redline in Word (or ask the user to)** and confirm:
   - Strike and insert markings render where expected
   - No insertions are merged into adjacent text incorrectly
   - The flow reads naturally with tracked changes accepted

Don't ship without visual verification.

### XML-audit gotchas

When auditing output XML by hand or script:

- The regex `<w:t[^>]*>` also matches `w:tbl`, `w:tc`, `w:tr`, and `w:trPr` — the audit returns garbage. Use `<w:t(?: [^>]*)?>` (and `<w:delText(?: [^>]*)?>` for deletions).
- Never dedupe lxml elements by `id()` — element proxy objects are recycled, so `id()` values repeat and the audit undercounts. Track elements by position or identity within a single traversal.
- python-docx `paragraph.text` is not a revision-aware view (see the accept-all baseline section above); compute accept/reject text from the XML.

## Comments and rationale

Each redline JSON entry should include a counterparty-facing rationale (`comment` field). Rationale should:

- Explain the **why** (business or legal reason)
- Be measured and constructive in tone
- Not expose internal strategy, fallbacks, or risk appetite
- Reference market standards or regulatory requirements when applicable

The strikes and inserts already show the **what**; the comment explains the **why**.
