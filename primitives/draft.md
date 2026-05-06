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

3. **Consult the clause library.** Read `practice/library/{clause-type}.md` for proven variants — standard, aggressive, and vendor-favorable options. Use proven language where available.

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

1. Research the clause type: load `practice/standards/{clause-type}.md` for your position and `practice/library/{clause-type}.md` for proven language.
2. Draft language that reflects the practice standard.
3. Check against applicable law/ areas.
4. Provide the clause in both standard and aggressive variants if useful.

---

## --redline

Generate tracked changes against the original document. This is the full document output pipeline.

### Prerequisites

- Source document must be a .docx file
- Findings and proposed revisions must be available (from evaluate + draft --counter-language)

### Capability detection

Check what's available:

1. **python-docx available:** `python3 -c "import docx"` — exits 0
2. **Word installed:** `/Applications/Microsoft Word.app` exists
3. **User name available:** profile.md contains a real name (not a bracket placeholder)

| Tier | Requirements | Action |
|---|---|---|
| Full | All three | Generate tracked changes .docx with comments, attributed to user |
| Partial | python-docx only | Generate modified .docx. Tell user to run Word's Review > Compare manually. |
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

**2. Apply changes:**
```bash
python3 {plugin_root}/scripts/apply_redlines.py "{original.docx}" "{redlines.json}" "{modified.docx}"
```
Parse the JSON output. Report skipped items.

**3. Word Compare (Full tier only):**
```bash
{plugin_root}/scripts/word_compare.sh "{original.docx}" "{modified.docx}" "{author_name}" "{output_path}"
```
Default output: `{original_dir}/{original_name}-redline-{YYYY-MM-DD}.docx`
The script retains `{modified.docx}`. Delete it only if it is a generated intermediate file and the user no longer needs it.

**4. Clean format option.** Default to preserving formatting for contract redlines.
- **(A) Preserve formatting** — tracked changes show content edits only (standard for redlines)
- **(B) Clean format** — use only for simple letters, memos, or drafts where the user explicitly accepts document flattening.

Do not offer clean formatting as a routine option for negotiated contracts, signed documents, or files with comments, tracked changes, fields, hyperlinks, images, footnotes/endnotes, complex numbering, or section-specific formatting. `clean_format.py` rebuilds the document from body paragraphs and tables; it can drop or flatten those structures. If clean format is appropriate, warn the user before running it.

For clean format:
```bash
python3 {plugin_root}/scripts/clean_format.py "{input.docx}" "{clean_output.docx}"
```

**5. Report results:**
- Where the file was saved
- How many changes applied vs. skipped
- Items that need manual attention
