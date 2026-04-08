---
name: intake
description: "Phase 1: Classify matter, auto-detect applicable law areas, load context, estimate complexity. Use when starting any legal work."
---

# Intake — Phase 1

You are starting a new legal matter. Your job is to classify it, load all relevant context, and set up the working environment for the subsequent phases (analyze, negotiate, deliver, close).


## Step 0: Resolve Paths

Read `config.local.md` (if it exists) or `config.md` from the plugin root to get:

- **Legal root** (`{legal_root}`) — contains law/, practice/, matters/, memory/
- **Entity discovery** — QMD query on `counsel-os-type` frontmatter property
- **Specific entity lookup** — QMD search for company name + `counsel-os-type` value

All framework content (law areas, default positions, practice files, memory) is read from `{legal_root}/`. Entity files (companies, counterparties) are discovered via QMD queries — they can live anywhere in the user's vault.

## Step 1: Accept the Document or Matter

Determine what you are working with. Accept one or more of:

- **File:** A contract, agreement, policy, or legal document provided as a file path. See **File Extraction** below for format-specific handling.
- **URL:** A link to a document in a data room, portal, or web page. Use `/counsel-os:browse` to extract it.
- **Pasted text:** Contract text or clauses pasted directly into the conversation. Capture it.
- **Description:** A verbal description of a legal matter without a specific document (e.g., "We need to draft an NDA for a new partnership discussion with Acme Corp").

If no document is provided, ask the user:
> What would you like me to work on? You can share a file, paste contract text, provide a URL, or describe the matter.

### File Extraction

Choose the extraction method based on file extension:

| Format | Method |
|--------|--------|
| `.pdf` | Use the Read tool directly (native PDF support) |
| `.txt`, `.md`, `.rtf` | Use the Read tool directly |
| `.docx` | Use the **Word Document Extraction** process below |
| `.doc` (legacy) | Ask the user to convert to `.docx` or `.pdf` first |

### Word Document Extraction (.docx)

Word documents are the primary medium for contract negotiation. Tracked changes contain the negotiation history and comments often hold key context from counterparty counsel. **Always extract tracked changes and comments — do not extract only the accepted text.**

**Primary method — pandoc:**

```bash
pandoc --track-changes=all -f docx -t markdown "<file_path>"
```

This renders tracked changes and comments inline:
- Insertions: `{++inserted text++}`
- Deletions: `{--deleted text--}`
- Comments: `{>>comment text<<}`

If pandoc is not installed, tell the user:
> I need `pandoc` to extract tracked changes and comments from Word documents. Install it with `brew install pandoc` (macOS) or `apt-get install pandoc` (Linux), then try again.

**Fallback method — unzip + XML parsing (if pandoc unavailable and user cannot install it):**

```bash
# Extract the XML from the .docx ZIP archive
unzip -o "<file_path>" word/document.xml word/comments.xml -d /tmp/docx-extract 2>/dev/null

# Extract main document text with tracked change markers
# - <w:ins> elements = insertions (added text)
# - <w:del> elements = deletions (removed text)
# - Comment references link to word/comments.xml
```

Then read `/tmp/docx-extract/word/document.xml` and `/tmp/docx-extract/word/comments.xml` to parse:
- `<w:ins>` blocks — text that was inserted (additions in tracked changes)
- `<w:del>` blocks — text that was deleted (removals in tracked changes)
- `<w:commentRangeStart>` / `<w:commentRangeEnd>` — comment anchors
- In `comments.xml`: `<w:comment>` elements with author, date, and comment text

**After extraction, always report to the user:**
- Whether tracked changes were found and how many insertions/deletions
- Whether comments were found, with count and authors
- If the document had no tracked changes or comments, note that explicitly so the user knows it was checked

## Step 2: Gather Context

Ask targeted questions to understand the matter. Do NOT ask all of these — infer what you can from the document and only ask what's missing:

1. **Which side are we on?** Are we the vendor/licensor/service provider, or the customer/licensee/recipient? (Often clear from the document.)
2. **Urgency?** What's the timeline? Is there a signing deadline?
3. **Focus areas?** Are there specific clauses or issues the user wants to prioritize? Or is this a full review?
4. **Deal context?** Is this a new relationship or an existing counterparty? What's the deal value? Use a QMD query to check for an existing entity file.
5. **Any special instructions?** Anything unusual about this matter?

Be efficient. If the document clearly shows we're reviewing a vendor's SaaS agreement as the customer, don't ask "which side are we on?" — just confirm your understanding.

## Step 3: Auto-Detect Applicable Law Areas

Scan the document text (or matter description) against the trigger conditions in each law area overview file. Check every area:

1. Read each `{legal_root}/law/<area>.md` file (each law area is a single consolidated file containing overview and all sub-topics)
2. Check the **Trigger Conditions** section — look for matching keywords, clause types, regulatory references, and relationship patterns
3. Load ALL areas that match — not just the most obvious one
4. Within each matching area, reference the relevant sections of the consolidated file based on the specific sub-topics triggered

**Important:** A single contract can trigger multiple law areas. A SaaS agreement might trigger data-privacy, ip-and-technology, and consumer-protection simultaneously. Load them all.

Document which areas matched and why:
```
Applicable law areas:
- data-privacy (keywords: "personal data", "data processing"; loading: gdpr.md, ccpa-cpra.md)
- ip-and-technology (clause types: "license grant", "IP ownership")
```

## Step 4: Classify the Matter Type

Based on the document and context, classify into the matter type that best fits. The matter type determines which method to load in the analyze phase.

To find the matching method, look for a method file in `{legal_root}/practice/methods/` that corresponds to the matter type (e.g., a contract review maps to `contract-review.md`, an NDA maps to `nda-triage.md`).

Common matter types include: contract-review, nda-triage, negotiation, compliance, dispute, policy, diligence, governance, memo, amendment, vendor-onboarding — but the available methods may expand over time, so always check what files exist in the directory.

If the matter doesn't fit cleanly, choose the closest match and note the deviation. If no method file exists for the matter type, proceed with the general analysis framework and note the gap.

## Step 5: Build Effective Positions

For each clause type that is likely relevant to this matter, build the effective position by merging across knowledge layers:

1. **Load your standard:** Load `{legal_root}/practice/standards/{clause-type}.md` — the `## Our Position` section defines your standard.
2. **Overlay entity:** Use a QMD query to find the counterparty's entity file and check for deal-specific overrides. Entity overrides win on conflict with your standard.
3. **Check against law:** Cross-reference against all loaded `{legal_root}/law/` areas. Law constraints ALWAYS win — if a position conflicts with law, flag it as RED and cite the specific regulation.

Document the effective position for each relevant clause type:
```
Effective positions:
- Limitation of liability: 12-month cap (practice/standards/limitation-of-liability.md) with data breach carve-out (law requirement: GDPR Art. 82)
- Indemnification: mutual, capped at contract value (practice/standards/indemnification.md)
- Data protection: DPA required (law requirement: GDPR Art. 28) with 72-hour breach notification (law floor)
```

## Step 6: Estimate Complexity

Assign a complexity track based on what you've learned:

### GREEN Track — Simple
- Standard document type (mutual NDA, template-based agreement)
- Low dollar value (below the user's GREEN threshold)
- Known counterparty with established positions
- No RED law area conflicts
- Estimated effort: 15-30 minutes

### YELLOW Track — Standard
- Counterparty paper requiring full review
- Moderate dollar value
- Multiple law areas apply
- Some positions may need negotiation
- New counterparty (first engagement)
- Estimated effort: 1-3 hours

### RED Track — Complex
- High-value or strategic deal
- Multiple law areas with potential conflicts
- Non-standard deal structure
- Counterparty with history of aggressive positions
- Regulatory complexity (cross-border, multi-jurisdiction)
- Estimated effort: 3+ hours, may need multiple sessions

## Step 7: Output the Intake Summary

Present the intake summary in this format:

```
## Intake Summary

**Matter:** [brief description]
**Matter ID:** [matter-id from Step 8, if created]
**Type:** [matter type from Step 4]
**Track:** [GREEN/YELLOW/RED] — [one-line justification]
**Our role:** [vendor/customer/partner/etc.]
**Counterparty:** [name, if known]
**Urgency:** [timeline/deadline]

### Applicable Law Areas
- [area 1] — [why it matched, which sub-files loaded]
- [area 2] — [why it matched, which sub-files loaded]

### Effective Positions Loaded
- [clause type 1]: [summary of effective position and source layer]
- [clause type 2]: [summary of effective position and source layer]

### Context Loaded
- [x] Practice profile (identity, principles, voice, thresholds)
- [x] Default positions for: [list]
- [x] Law areas: [list]
- [ ] Counterparty entity file: [not found / loaded via QMD query]
- [ ] Deal file: [not found / loaded from entity's folder]

### Recommended Next Steps
1. Proceed to `/counsel-os:analyze` for [full review / focused review on specific clauses]
2. [Any other recommendations based on what you found]
```

## Step 8: Create or Resume Matter File

After completing the intake summary, persist the matter state so it survives across conversations.

### 8a. Check for Existing Matter

Search QMD for an existing matter file: query `counsel-os-type: matter` + the counterparty name (if known).

- **Active matter found** (frontmatter `stage` is not `closed`):
  > I found an existing matter for [counterparty]: **[matter-id]** (stage: [stage]).
  > Would you like to:
  > (A) **Resume** this matter (update it with the new context)
  > (B) **Create a new matter** (this is a separate engagement)

  If resuming: read the existing matter file, update any changed fields (documents, context, effective positions), and proceed. Do not create a new file.

- **Only closed matters found:** Note the prior context but proceed to create a new matter.
- **No matters found:** Proceed to create a new matter.

### 8b. Generate Matter ID

Format: `YYYY-MM-{counterparty-slug}-{type-slug}`

- `YYYY-MM`: current year and month
- `counterparty-slug`: lowercase, hyphenated counterparty name (e.g., `acme-corp`). Use `internal` if no counterparty.
- `type-slug`: short form of the matter type (e.g., `msa` for contract-review of an MSA, `nda` for nda-triage, `compliance`, `memo`, `governance`, etc.)

If the ID would collide with an existing file at the target path, append `-2`, `-3`, etc.

### 8c. Create the Matter File

Read `matters_path` from config (default: `matters`). Create the file at `{legal_root}/{matters_path}/{matter-id}.md`.

Write the matter file with this structure:

```markdown
---
counsel-os-type: matter
matter-id: {generated-id}
type: {matter-type from Step 4}
stage: intake
counterparty: {counterparty name, if known}
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
---

# {Counterparty Name} — {Document/Matter Description}

## Parties
- **Counterparty:** [[{Counterparty Name}]] ({role: vendor/customer/partner})
- **Our entity:** {organization name from identity.md}

## Documents
- {filename} (received {YYYY-MM-DD})

## Context
- **Our role:** {vendor/customer/etc.}
- **Track:** {GREEN/YELLOW/RED} — {justification}
- **Urgency:** {timeline from Step 2}
- **Law areas:** {comma-separated list from Step 3}

## Effective Positions
{For each relevant clause type, one line: clause type — effective position — source layer}

{TYPE-SPECIFIC WORKING SECTIONS — see below}

## Decisions
{Empty — populated as decisions are made during analyze/negotiate}

## Open Issues
{Any open items identified during intake, or empty}

## Next Action
Proceed to `/counsel-os:analyze`.

## Generated Outputs
{Empty — populated by deliver phase}
```

**Type-specific working sections** — insert the appropriate empty sections based on the `type` field:

| Matter type | Sections to insert |
|---|---|
| contract-review, nda-triage, vendor-onboarding | `## Findings` |
| board-action, governance | `## Resolution` + `## Approval Chain` |
| compliance | `## Compliance Matrix` |
| advisory, memo | `## Analysis` + `## Recommendation` |
| dispute | `## Response Strategy` |
| Default (any other type) | `## Findings` |

### 8d. Confirm Creation

Tell the user:

> Matter file created: `{legal_root}/{matters_path}/{matter-id}.md`
> Stage: **intake** (complete)
> Next: `/counsel-os:analyze`

## Error Handling

- **No document provided:** Ask for one. Don't proceed without something to work on.
- **Practice files not found:** Suggest running `/counsel-os:setup` first. Proceed with defaults only if the user confirms.
- **No matching law areas:** Note this explicitly. It's unusual — most contracts touch at least one law area. Double-check.
- **Counterparty not found:** Note that no prior context exists. Suggest creating a counterparty file after this matter closes.
