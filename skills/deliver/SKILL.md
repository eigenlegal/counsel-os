---
name: deliver
description: "Phase 4: Package output, apply voice styling, post to connected services. Use after negotiate or analyze."
---

# Deliver — Phase 4

You are packaging the final work product for delivery. Your job is to format the output according to the user's preferences, apply voice styling, and deliver through the appropriate channels.


## Step 0: Resolve Paths

Read `config.local.md` (if it exists) or `config.md` from the plugin root to get:

- **Legal root** (`{legal_root}`) — contains law/, practice/, matters/, memory/
- **Entity discovery** — QMD query on `counsel-os-type` frontmatter property
- **Specific entity lookup** — QMD search for company name + `counsel-os-type` value

All framework content (law areas, default positions, practice files, memory) is read from `{legal_root}/`. Entity files (companies, counterparties) are discovered via QMD queries — they can live anywhere in the user's vault.

## Prerequisites

Before delivering, verify you have completed the necessary prior phases:

- For **contract reviews and negotiations:** Analysis (Phase 2) is required. Negotiation (Phase 3) is optional but recommended for YELLOW/RED findings.
- For **memos and research:** The substantive work is complete.
- For **compliance reviews:** The compliance assessment is finalized.

## Step 0b: Load Matter File

Check for a matter file:

1. If the user referenced a specific matter ID, load it via QMD.
2. Otherwise, search QMD for `counsel-os-type: matter` + the counterparty name. Prefer matters with `stage: negotiate`, then `analyze`, then `deliver`.
3. If found, read the matter file for context — parties, documents, findings, negotiation items, and effective positions.
4. If no matter file exists, proceed using conversation context.

When a matter file is loaded:
- Use `## Parties` for attribution in deliverables
- Use `## Findings` and `## Negotiation` for content
- Use the `type` frontmatter to select the default output format in Step 1

**Stage transition warning:** If the matter's current stage is `intake` (skipping analyze), warn:
> This matter hasn't been analyzed yet (stage: intake). Would you like to run `/counsel-os:analyze` first?

## Step 1: Determine Output Format

Based on the matter type and user preferences, select the appropriate output format:

### By Matter Type

| Matter Type | Default Output Format |
|------------|----------------------|
| contract-review | Analysis report with risk matrix |
| nda-triage | Brief assessment with pass/flag/fail |
| negotiation | Redline package or negotiation memo |
| compliance | Compliance matrix with remediation items |
| dispute | Response strategy memo or letter draft |
| policy | Policy document with tracked changes |
| diligence | Diligence report with findings table |
| governance | Resolution drafts or governance memo |
| memo | Legal memorandum |
| amendment | Amendment analysis with comparison to original |
| vendor-onboarding | Vendor assessment scorecard |

### User Override

If the user requests a specific format, use that instead. Common requests:
- "Give me a quick summary" — Executive summary only, 5-10 bullet points
- "I need a full memo" — Detailed legal memorandum with analysis, citations, and recommendation
- "Just the redlines" — Clean redline package without strategy commentary
- "Send it as a checklist" — Checklist format with pass/fail for each item
- "Draft an email" — Email to counterparty or internal stakeholder

## Step 2: Apply Voice Styling

Load the ## Voice section from `{legal_root}/practice/profile.md` and apply the user's preferences:

1. **Tone:** Match the specified tone (e.g., professional but approachable, formal, direct)
2. **Structure:** Follow structure patterns (e.g., executive summary first, bullets over paragraphs)
3. **Language:** Use preferred language and avoid banned phrases
4. **Formality:** Calibrate to the audience (internal memo vs. counterparty communication vs. board materials)
5. **Risk language:** Use the correct GREEN/YELLOW/RED language calibration

If `profile.md` doesn't exist or has no ## Voice section, use these defaults:
- Professional, measured tone
- Lead with the bottom line
- Use plain English
- Executive summary first
- Bullet points for findings, prose for analysis

## Step 3: Format the Deliverable

### Analysis Report

```
# [Matter Name] — Analysis Report

**Date:** [date]
**Prepared by:** [user's name from profile.md] with Counsel OS
**Classification:** PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION

## Executive Summary
[2-4 sentences: overall assessment, key risks, recommendation]

## Risk Overview
- **GREEN items:** [count] — acceptable as drafted
- **YELLOW items:** [count] — recommended changes
- **RED items:** [count] — required changes
- **Overall risk level:** [LOW/MEDIUM/HIGH]

## Key Findings
[Top 3-5 issues, ranked by priority]

## Detailed Analysis
[Full clause-by-clause analysis from Phase 2]

## Risk Matrix
[Summary table]

## Recommendation
[Clear recommendation: proceed, revise, escalate, or decline]

## Next Steps
[Actionable items with owners and timelines]
```

### Redline Package

```
# [Matter Name] — Proposed Revisions

**Date:** [date]
**From:** [user's organization]
**Re:** [document name and version]

We have reviewed the [document type] and propose the following revisions, organized by priority.

## Priority 1 — Required Changes
[Tier 1 items with proposed language and comments]

## Priority 2 — Recommended Changes
[Tier 2 items with proposed language and comments]

## Priority 3 — Suggested Improvements
[Tier 3 items with proposed language and comments]

## Items Accepted as Drafted
[Brief acknowledgment of sections that are acceptable]
```

### Legal Memorandum

```
# MEMORANDUM

**PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION**

**To:** [recipient]
**From:** [user's name/team]
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

### Quick Summary

```
## [Matter Name] — Summary

**Bottom line:** [one sentence assessment]

**Key issues:**
- [Issue 1 — RED/YELLOW] — [one line description and recommendation]
- [Issue 2 — RED/YELLOW] — [one line description and recommendation]
- [Issue 3 — RED/YELLOW] — [one line description and recommendation]

**Acceptable areas:** [brief list of what's fine]

**Recommendation:** [proceed / revise / escalate]
```

## Step 3a: Clean Document Format (Optional)

When python-docx is available and the source is a .docx file, the user can optionally reformat the document to professional standards before (or instead of) applying tracked changes.

### When to offer

- The user explicitly requests clean formatting ("clean it up", "reformat", "professional format")
- The user is producing a final agreement (not a redline)
- The user asks for a clean version of an existing .docx

### Execution

```bash
python3 {plugin_root}/scripts/clean_format.py "{input.docx}" "{output_dir}/counsel-os-clean-{timestamp}.docx"
```

Parse the JSON output. Report the formatting summary to the user (paragraphs, headings detected, lists converted).

### Integration with redline pipeline

If clean format is used WITH tracked changes (Step 3b):
1. The clean-formatted document becomes the base for `apply_redlines.py`
2. `word_compare.sh` compares the **original** (unformatted) against the clean+revised document
3. Tracked changes reflect both formatting and content changes

If clean format is used WITHOUT tracked changes:
1. The clean-formatted document IS the deliverable
2. Skip Step 3b
3. Report the output path

## Step 3b: Word Tracked Changes Output

When the matter involves a negotiation and the source document was a .docx file, check if Word tracked changes output is available.

### Capability Detection

Run these checks:

1. **Source is .docx:** The original document path from the conversation ends in `.docx`
2. **python-docx available:** Run `python3 -c "import docx"` — exits 0
3. **Word installed:** `/Applications/Microsoft Word.app` exists
4. **User name available:** `{legal_root}/practice/profile.md` contains a name that isn't a bracket placeholder like `[YOUR NAME HERE]`

### Tier Selection

| Tier | Requirements | Action |
|------|-------------|--------|
| Full | All four checks pass | Offer tracked changes .docx with comments, all attributed to user |
| Partial | Checks 1+2 pass, check 3 fails | Offer clean modified .docx. Tell user: "Word isn't available for automated Compare. You can open both files in Word and run Review > Compare to generate tracked changes." |
| Markdown | Check 1 or 2 fails | Skip this step — proceed with markdown output from Step 3 |

If Full or Partial tier is available, ask the user:

> I can generate the Word output in two styles:
> (A) **Preserve formatting** — keeps the original styles with tracked changes showing content edits only (standard for redlines)
> (B) **Clean format** — reformats to professional standards (10pt Calibri, consistent headings, native numbered lists) with tracked changes showing both format and content changes
>
> Option A is standard for redlines. Option B is better when the source document has inconsistent formatting.

If they decline both, skip to Step 4.

### Pipeline Execution

**A. Extract pairs.** From the negotiate output, collect all Current/Proposed pairs and counterparty-facing rationale. Write to a temp JSON file in the same directory as the original document (`{original_dir}/counsel-os-redlines-{timestamp}.json`). **Important:** Do NOT use `/tmp` — macOS sandboxing prevents Word from accessing `/tmp`.

```json
[
  {
    "current": "exact current language from negotiate output",
    "proposed": "exact proposed language from negotiate output",
    "comment": "counterparty-facing rationale, or null if none",
    "author": "User's Name from profile.md"
  }
]
```

**B. Apply changes.** Run the apply script:

```bash
python3 {plugin_root}/scripts/apply_redlines.py "{original.docx}" "{original_dir}/counsel-os-redlines-{timestamp}.json" "{original_dir}/counsel-os-modified-{timestamp}.docx"
```

Parse the JSON output. Report any skipped items to the user — these need to be applied manually in Word.

**C. Word Compare (Full tier only).** Run the compare script:

```bash
{plugin_root}/scripts/word_compare.sh "{original.docx}" "{original_dir}/counsel-os-modified-{timestamp}.docx" "{author_name}" "{output_path}"
```

Default output path: `{original_dir}/{original_name}-redline-{YYYY-MM-DD}.docx`

**D. Report results.** Tell the user:
- Where the file was saved
- How many changes were applied vs. skipped
- Any items that need manual attention
- Suggest: "Review the tracked changes in Word, then run `/counsel-os:close` to log this matter."

## Step 4: Connected Service Delivery

If connected services are available (check `CONNECTORS.md` and `.mcp.json`), offer to deliver through them:

### Cloud Storage
If a cloud storage connector is available:
- Save the deliverable to the appropriate location
- Suggest a file name and folder path
- Confirm before saving

### Chat / Messaging
If a chat connector is available:
- Offer to post a summary (NOT the full privileged document) to the relevant channel
- Default summary format: 3-5 bullet points with overall risk level and key action items
- Always warn: "This summary will be posted to [channel]. It contains no privileged analysis — only the risk rating and action items. Shall I proceed?"

### Email
If an email connector is available:
- Offer to draft an email with the deliverable
- Attach or inline the document depending on user preference
- Suggest recipients based on the matter context

### Document Generation
If an office suite connector is available:
- Offer to generate in the appropriate format (Word for memos, Excel for matrices, PDF for final deliverables)
- Apply any organization-specific formatting/templates

## Step 5: Confirm and Deliver

Before final delivery:

1. **Preview:** Show the user a preview of the formatted deliverable
2. **Confirm:** "This is ready to deliver. Would you like any changes before I finalize?"
3. **Deliver:** Post/save/output in the requested format
4. **Suggest close:** "The deliverable is complete. Would you like me to run `/counsel-os:close` to log this matter and capture any lessons learned?"

## Step 6: Update Matter File

If a matter file was loaded in Step 0b, update it:

1. **Update frontmatter:** Set `stage: deliver` and `updated: {today's date}`.
2. **Add entries to `## Generated Outputs`:**
   ```
   - {output-filename} ({YYYY-MM-DD}) — {format: analysis report / redline package / memo / etc.}
   ```
3. **Update `## Next Action`:** `Deliverable complete. Run /counsel-os:close to finalize.`

If no matter file exists, skip this step.

## Privilege Marking

**Always mark privileged communications.** Every substantive legal analysis should include:

```
PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION
```

Exceptions:
- Redline packages intended for counterparties (these are NOT privileged — they contain only proposed revisions and business rationale)
- Summary posts to chat channels (these should be sanitized of privileged analysis)
- Checklists and compliance matrices that contain only factual pass/fail assessments

When in doubt, mark it privileged. The user can remove the marking if it's not applicable.
