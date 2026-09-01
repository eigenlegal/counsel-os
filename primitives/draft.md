# draft

Generate any output — text, redlines, documents, summaries.

---

## When to use

- User needs something written: counter-language, a memo, an email, a summary, a redline
- After evaluate, to propose revisions for findings
- When the user asks for output in a specific format or for a specific audience
- When packaging work product for delivery

## Consults

- `practice/profile.md` ## Voice — tone, structure, language, formality, risk language calibration
- `practice/library/` — proven clause language variants (standard, aggressive, vendor-favorable)
- `practice/standards/` — Key Negotiation Points, Common Traps sections
- `practice/profile.md` ## Identity — for attribution and privilege marking
- Findings from evaluate (when drafting based on analysis)
- Entity file (when drafting for a specific counterparty relationship)

## Produces

Finished output ready for the user, counterparty, or internal stakeholders. Format varies by mode.

---

## Core instructions

### Voice

Always load `practice/profile.md` ## Voice before generating any output. Apply:

1. **Tone** — match the user's preferred tone
2. **Structure** — follow structure patterns (executive summary first, bullets over paragraphs, etc.)
3. **Language** — use preferred language, avoid banned phrases
4. **Formality** — calibrate to the audience
5. **Risk language** — use the correct calibration (GREEN/YELLOW/RED language from the Voice section)

If profile.md has no ## Voice section, default to: professional, measured tone. Lead with the bottom line. Plain English. Executive summary first. Bullet points for findings, prose for analysis.

### Audience adaptation (--for)

The `--for` parameter adjusts depth, format, and language:

| Audience | Adaptation |
|---|---|
| **Business team** | Plain-language summary. Risk level and action items. No legal jargon. Focus on business impact. |
| **Executive** | 3-bullet brief. Decision needed, deadline, risk level. Bottom line first. |
| **Counterparty** | Professional, measured. Lead with business rationale, not legal citation. Frame changes as mutually beneficial. Never expose internal strategy, risk appetite, or fallback positions. |
| **Internal legal** | Full analysis with citations. Privilege marked. Technical precision. Show the work. |

When no audience is specified, default to internal legal.

### Privilege marking

All internal memos and analysis documents are marked:
```
PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION
```

Counterparty-facing output is NEVER privilege-marked. Summaries for business teams omit the privilege header unless the user's voice preferences say otherwise.

---

## --counter-language

Generate specific alternative clause language for findings from evaluate.

### Instructions

For each finding that needs revision:

1. **Draft exact replacement language.** Not vague suggestions — specific text that could be dropped into the contract.
   ```
   Current: "[exact current language]"
   Proposed: "[exact replacement language]"
   ```

2. **Anchor to the effective position.** Propose what the practice standard calls for, not a pre-compromised middle ground. Start from strength.

3. **Consult the clause library.** Find the matching file in `practice/library/` for proven variants — standard, aggressive, and vendor-favorable options. Check `practice/library/_index.md` first: library files group related clause types, so the slug may not match the standards filename (e.g., limitation-of-liability and indemnification share `liability-and-indemnification.md`). Use proven language where available.

4. **Check against law.** If a law area creates a floor (e.g., GDPR 72-hour breach notification), the proposed language must meet it. Note: "This revision reflects a regulatory requirement, not a negotiation preference."

5. **Write counterparty-facing rationale.** For each revision:
   - Lead with business justification, not legal citation
   - Frame as mutually beneficial where possible
   - Reference market standards when aligned
   - Cite regulatory requirements when law mandates the change
   - Do NOT include: internal strategy, risk appetite, concession plans, privileged analysis

6. **Define fallback positions.** For each item:
   - **Primary position:** what we proposed (our opening)
   - **Fallback position:** what we'd accept as a compromise
   - **Walk-away point:** where we stop negotiating
   - For Tier 1 items, the fallback may be narrow or identical. Some positions are non-negotiable.
   - For Tier 3 items, the fallback may be "accept as drafted" — concession candidates.

7. **Note related law constraints.** If a law area creates a hard floor/ceiling, note it so the user and counterparty understand which positions are legal requirements vs. business preferences.

---

## --memo

Generate an internal legal memorandum.

### Format

```
# MEMORANDUM

PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION

**To:** [recipient]
**From:** [user's name/team from profile.md]
**Date:** [date]
**Re:** [subject]

## Question Presented
[The legal question being addressed]

## Brief Answer
[1-2 paragraph summary of the conclusion]

## Background
[Relevant facts and context]

## Analysis
[Detailed legal analysis]

## Conclusion and Recommendation
[Clear recommendation with reasoning]
```

---

## --email

Generate an external communication.

### Instructions

- Load the counterparty context from the entity file if available
- Use the counterparty-appropriate formality level from ## Voice
- Lead with the business context, then specific items
- Attach or reference documents rather than embedding full legal text
- Close with clear next steps and timeline

For negotiation emails: include the proposed changes organized by priority. Frame collaboratively. Never expose internal strategy.

---

## --summary

Package findings for a specific audience.

### Instructions

Adapt the same underlying content for different audiences:

**Quick summary** (default when no audience specified):
```
## [Matter Name] — Summary

**Bottom line:** [one sentence assessment]

**Key issues:**
- [Issue 1] — [one line description and recommendation]
- [Issue 2] — [one line description and recommendation]

**Acceptable areas:** [brief list of what's fine]

**Recommendation:** [proceed / revise / escalate]
```

**Analysis report** (for internal legal):
```
# [Matter Name] — Analysis Report

**Date:** [date]
**Prepared by:** [user's name] with Counsel OS
**Classification:** PRIVILEGED AND CONFIDENTIAL

## Executive Summary
[2-4 sentences: overall assessment, key risks, recommendation]

## Key Findings
[Top issues, ranked by priority]

## Detailed Analysis
[Full clause-by-clause findings from evaluate]

## Recommendation
[Clear recommendation with reasoning]

## Next Steps
[Actionable items with owners and timelines]
```

---

## --clause

Draft new clause language from scratch (not revising existing language).

### Instructions

1. Research the clause type: load `practice/standards/{clause-type}.md` for your position and the matching `practice/library/` file (see `_index.md` — library slugs group related clause types) for proven language.
2. Draft language that reflects the practice standard.
3. Check against applicable law/ areas.
4. Provide the clause in both standard and aggressive variants if useful.

---

## --document (net-new .docx)

Generate a brand-new Word document from scratch — a drafted agreement, letter, or memo the user will edit and circulate. This is the only supported pipeline for net-new .docx output; `--redline` and `clean_format.py` operate on documents that already exist.

### Instructions

1. Write the document as markdown in a temp file alongside the intended output location. Write for the pipeline's flattened output model: citations and footnote content go inline in the body text, URLs appear as visible text (not `[label](url)` links), and everything lives in one section with simple tables. Separate every line of an address block or signature block into its own paragraph (blank line between lines) — pandoc treats single newlines as soft breaks and merges them into one flowing paragraph ("By: ___ Thang Tran President").
2. Convert with pandoc, then normalize with `clean_format.py`:
```bash
pandoc "{draft.md}" -o "{draft-raw.docx}"
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/clean_format.py" "{draft-raw.docx}" "{output.docx}"
```
The clean-format pass sets uniform Times New Roman, justified body text, bold headings, and pins `docDefaults` fonts so theme fonts cannot leak through. Delete the temp markdown and `{draft-raw.docx}` intermediate after the pipeline succeeds — a stray raw file beside a client deliverable is a mix-up waiting to happen.

**Know what the normalize pass flattens.** `clean_format.py` rebuilds the document from plain paragraphs and tables: hyperlinks collapse to their anchor text (URL lost), footnotes/endnotes are dropped entirely, images and fields are not carried over, merged/nested table structure flattens, later sections disappear, and headings in a heading-styled document get auto-numbered — all without warnings. That is why step 1 says inline citations and visible URLs. For a document that genuinely needs live hyperlinks, footnotes, multi-section layout, or an unnumbered heading structure (e.g. a memo with `# Background` / `# Analysis` headings that must stay unnumbered), skip the normalize pass and build the document directly with python-docx instead.

### Output naming

Default: `{Client} - {Document Title} - {Person or Counterparty} ({INITIALS} {STATUS} {YYYY-MM-DD}).docx`

- `STATUS` is one of `DRAFT | REDLINE | comments | Final | signed`, always paired with the ISO date. Generated documents are always `({INITIALS} DRAFT {date})` — never deliver an unmarked draft.
- `INITIALS` is the drafter's initials, derived from the name in `practice/profile.md` ## Identity (e.g. "Jack Wang" → `JW`). Include them on authored statuses (`DRAFT`, `REDLINE`, `comments`) so your markup is instantly distinguishable from the counterparty's when files cross in an exchange. Omit them on `Final` and `signed` — execution status belongs to the document, not a drafter. If the profile has no name, drop the initials segment; never guess.
- The stem stays identical across the document's life, so drafts and the executed copy sort together: `... (JW DRAFT 2026-07-30).docx` → `... (JW REDLINE 2026-08-02).docx` → `... (signed 2026-08-04).docx`.
- Omit the person segment when there is no counterparty; use the matter subject instead (e.g. `{Client} - Board Consent - {Subject} (JW DRAFT {date}).docx`).
- **Existing folders win.** When filing into a client or matter folder whose files already follow a different convention, mirror that folder's convention instead — the default is for new folders and loose deliverables.

**Mixed numbering schemes break the mirror-numbering pass.** `clean_format.py` converts literal paragraph numbers into one continuous native Word list — it cannot tell recital lettering (`A.`, `B.`) apart from section numbering (`1.` … `9.`), so a recital-style agreement comes out with the recitals numbered 1-2 and "Section 1" rendering as 3. It also promotes standalone bold lines (signature-block labels like "THE COMPANY:") to Heading style. For agreements with recitals, lettered exhibits, or any numbering scheme that is not one flat sequence, skip `clean_format.py`: run pandoc, then apply fonts directly with python-docx (the fallback in Do-not below) and keep the literal numbers in the text.

### Do not

- **Do not use macOS `textutil` for .docx output.** It ignores CSS point sizes when converting HTML and produces oversized text.
- **Do not pass `scripts/legal-template.docx` as a pandoc `--reference-doc`.** It is `clean_format.py`'s style donor, not a general-purpose reference template; use the pipeline above instead.
- Do not hand-set fonts run-by-run with python-docx as the primary path — that is the fallback when pandoc or `clean_format.py` is unavailable, or when the document needs features the normalize pass flattens (build paragraphs programmatically; set Normal style + all runs to Times New Roman 11pt, matching `clean_format.py`'s `DEFAULT_SIZE`, and pin `w:rFonts` on the style's `rPr`).

---

## --edit (revising an existing .docx in place)

Applies whenever you change text inside a .docx that already exists — revised drafts after counterparty comments, adapting an executed agreement into a new party's version, filling names or numbers into a form. This is NOT the redline path (no tracked changes wanted) and NOT net-new generation.

### Instructions

1. **Default to `apply_redlines.py` WITHOUT `--track` for text replacements.** Silent mode applies the same word-level minimal-region matching as the redline path — including its handling of run-level formatting — so replacements inherit the correct formatting from the text they replace:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply_redlines.py" "{original.docx}" "{edits.json}" "{output.docx}"
```
2. **Direct python-docx surgery is for structure only** (deleting paragraphs, inserting new ones, reordering) — and before doing any of it, read `primitives/redline-output.md` → "How to detect bold-leading paragraphs". Its run-formatting rules apply to every in-place edit, not just redlines.

### Run-formatting rules for python-docx edits

- **Never reuse a paragraph's first run to carry full replacement text.** Legal-form paragraphs routinely open with a formatted lead-in run (bold `WHEREAS, `, bold `1.\tSale of Stock.`, bold defined-term). Stuffing the whole paragraph into `runs[0]` makes the entire paragraph inherit that formatting — the fully-bolded-paragraph defect.
- **Mirror the source run structure:** write the lead-in into the formatted run, delete the rest, and append the body as a NEW run with `bold = False` set explicitly (not left as `None` — `None` inherits from the style, `False` overrides it). Same for italic.
- **New runs always get explicit `font.name` and `font.size`** matching the document (theme-font fallback otherwise).

### Post-edit lint (run after EVERY in-place edit, before delivering)

Check programmatically, not by eyeballing:
1. No fully-bolded paragraph longer than ~60 chars that wasn't fully bold in the source document.
2. Zero em/en dashes (practice style), zero non-breaking spaces (pandoc smart-typography inserts `\xa0` after abbreviations like "Inc."), zero straight double-quotes in curly-quote documents.
3. No stale party names, share counts, dates, or dollar amounts from the source document (grep for the old values explicitly).
4. Fonts: single font family across all runs.

If any check fails, fix and re-lint. Never deliver on the first pass without the lint.

---

## --redline

Generate tracked changes against the original document. This is the full document output pipeline.

**Load `primitives/redline-output.md` before drafting redline JSON.** It covers section-numbering integrity, run-level formatting inheritance (the bold-leading-paragraph trap), character-set matching, and post-replacement cleanup — defects that are easy to introduce and hard to catch without explicit checks.

### Prerequisites

- Source document must be a .docx file
- Findings and proposed revisions must be available (from evaluate + draft --counter-language)

### Capability detection

Check what's available:

1. **python-docx available:** `python3 -c "import docx"` — exits 0
2. **User name available:** profile.md contains a real name (not a bracket placeholder)

Tracked changes are generated natively (`apply_redlines.py --track` writes
`w:ins`/`w:del` revision markup directly), so Microsoft Word is NOT required
to produce a redline — and in the counsel-os app the reader shows the result
with its strikes, inserts and comments, so the answer names the redline's
vault path rather than asking the lawyer to open Word to check it.

| Tier | Requirements | Action |
|---|---|---|
| Full | Both | Generate tracked changes .docx with comments, attributed to user |
| Partial | python-docx only | Same tracked changes, attributed to "Counsel OS"; tell the user attribution becomes personal once profile.md has their name |
| Markdown | Neither | Output markdown redline package only |

### Pipeline execution (Full or Partial tier)

**1. Collect revision pairs.** From the counter-language output, gather all Current/Proposed pairs and rationale. Write to a JSON file in the same directory as the original document:

```json
[
  {
    "current": "exact current language",
    "proposed": "exact proposed language",
    "comment": "counterparty-facing rationale, or null",
    "author": "User's Name from profile.md",
    "match": {
      "location": "body[12]",
      "before": "optional immediately preceding text",
      "after": "optional immediately following text"
    }
  }
]
```

`match` is optional only when `current` appears exactly once. If the script reports `Found N matches; add a match disambiguator`, do not accept partial application. Re-read the candidate `matches` in the JSON output, choose the intended occurrence, rewrite that redline item with a precise selector, and run the script again.

Supported selectors:
- `location` — exact candidate location such as `body[12]` or `table[0].row[1].cell[2].p[0]`
- `paragraph_index` — zero-based body paragraph index
- `occurrence` — zero-based occurrence from the candidate list
- `before` / `after` — text immediately before or after the intended match
- `context` — additional text that must appear in the same paragraph or cell

**Important:** Write the JSON file alongside the original document (`{original_dir}/counsel-os-redlines-{timestamp}.json`), NOT in `/tmp`. macOS sandboxing prevents Word from accessing `/tmp`.

**2. Apply changes as tracked changes:**
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply_redlines.py" --track "{original.docx}" "{redlines.json}" "{output_path}"
```
Default output: `{original_dir}/{original_name}-redline-{YYYY-MM-DD}.docx`
Parse the JSON output. Report skipped items — including any refused because the
changed text lies inside an existing tracked insertion or hyperlink (nested
revision markup is not supported; resolve the earlier revision first).

The output IS the redline: native `w:ins`/`w:del` revisions plus comments, in
one step. Only the changed core of each edit is marked (common prefix/suffix
trimmed at word boundaries), and deleted text keeps its original formatting.
There is no intermediate modified.docx — accepting all changes in Word yields
the clean version. Drop `--track` only when the user explicitly wants a
silently-edited copy with no revision marks.

**3. Word Compare (alternative engine, optional):**
```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/word_compare.sh" "{original.docx}" "{modified.docx}" "{author_name}" "{output_path}"
```
Use only when comparing two documents that already exist independently (e.g.
a counterparty returned a clean revised draft and the user wants a redline
against the original), or when the user explicitly asks for Word's own compare
engine. Requires Microsoft Word on macOS with an unlocked GUI session, and
recent Word builds have rejected the AppleScript `compare` verb on some
installations — if it fails, fall back to `--track` when the edit list is
known, or tell the user to run Word's Review > Compare manually.

**4. Clean format option.** Default to preserving formatting for contract redlines.
- **(A) Preserve formatting** — tracked changes show content edits only (standard for redlines)
- **(B) Clean format** — use only for simple letters, memos, or drafts where the user explicitly accepts document flattening.

Do not offer clean formatting as a routine option for negotiated contracts, signed documents, or files with comments, tracked changes, fields, hyperlinks, images, footnotes/endnotes, complex numbering, or section-specific formatting. `clean_format.py` rebuilds the document from body paragraphs and tables; it can drop or flatten those structures. If clean format is appropriate, warn the user before running it.

For clean format:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/clean_format.py" "{input.docx}" "{clean_output.docx}"
```

**5. Report results:**
- Where the file was saved
- How many changes applied vs. skipped
- Items that need manual attention
