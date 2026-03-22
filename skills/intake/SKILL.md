---
name: intake
description: "Phase 1: Classify matter, auto-detect applicable law areas, load context, estimate complexity. Use when starting any legal work."
---

# Intake — Phase 1

You are starting a new legal matter. Your job is to classify it, load all relevant context, and set up the working environment for the subsequent phases (analyze, negotiate, deliver, close).

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
4. **Deal context?** Is this a new relationship or an existing counterparty? What's the deal value? Is there a counterparty file in `knowledge/matters/counterparties/`?
5. **Any special instructions?** Anything unusual about this matter?

Be efficient. If the document clearly shows we're reviewing a vendor's SaaS agreement as the customer, don't ask "which side are we on?" — just confirm your understanding.

## Step 3: Auto-Detect Applicable Law Areas

Scan the document text (or matter description) against the trigger conditions in each law area overview file. Check every area:

1. Read each `knowledge/law/*/overview.md` file
2. Check the **Trigger Conditions** section — look for matching keywords, clause types, regulatory references, and relationship patterns
3. Load ALL areas that match — not just the most obvious one
4. Within each matching area, check the **Sub-Files** section to determine which specific sub-files to load based on sub-topic triggers

**Important:** A single contract can trigger multiple law areas. A SaaS agreement might trigger data-privacy, ip-and-technology, and consumer-protection simultaneously. Load them all.

Document which areas matched and why:
```
Applicable law areas:
- data-privacy (keywords: "personal data", "data processing"; loading: gdpr.md, ccpa-cpra.md)
- ip-and-technology (clause types: "license grant", "IP ownership")
```

## Step 4: Classify the Matter Type

Based on the document and context, classify into one of these matter types. The matter type determines which playbook to use in the analyze phase:

Classify into the matter type that best fits the document or matter. The matter type determines which playbook to load in the analyze phase.

To find the matching playbook, look for a file in `knowledge/defaults/playbooks/` whose name corresponds to the matter type (e.g., a contract review maps to `playbooks/contract-review.md`, an NDA maps to `playbooks/nda-triage.md`).

Common matter types include: contract-review, nda-triage, negotiation, compliance, dispute, policy, diligence, governance, memo, amendment, vendor-onboarding — but the available playbooks may expand over time, so always check what's in the directory.

If the matter doesn't fit cleanly, choose the closest match and note the deviation. If no playbook exists for the matter type, proceed with the general analysis framework and note the gap.

## Step 5: Build Effective Positions

For each clause type that is likely relevant to this matter, build the effective position by merging across knowledge layers:

1. **Start with defaults:** Load `knowledge/defaults/positions/<clause-type>.md`
2. **Overlay practice:** Check `knowledge/practice/positions.md` for overrides. Practice positions win on conflict with defaults.
3. **Overlay matters:** Check `knowledge/matters/counterparties/<name>.md` for deal-specific overrides. Matters positions win on conflict with practice.
4. **Check against law:** Cross-reference against all loaded `knowledge/law/` areas. Law constraints ALWAYS win — if a position conflicts with law, flag it as RED and cite the specific regulation.

Document the effective position for each relevant clause type:
```
Effective positions:
- Limitation of liability: 12-month cap (practice override) with data breach carve-out (law requirement: GDPR Art. 82)
- Indemnification: mutual, capped at contract value (default — practice silent)
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
- [ ] Counterparty file: [not found / loaded from matters/counterparties/X.md]
- [ ] Deal file: [not found / loaded from matters/deals/X.md]

### Recommended Next Steps
1. Proceed to `/counsel-os:analyze` for [full review / focused review on specific clauses]
2. [Any other recommendations based on what you found]
```

## Error Handling

- **No document provided:** Ask for one. Don't proceed without something to work on.
- **Practice files not found:** Suggest running `/counsel-os:setup` first. Proceed with defaults only if the user confirms.
- **No matching law areas:** Note this explicitly. It's unusual — most contracts touch at least one law area. Double-check.
- **Counterparty not found:** Note that no prior context exists. Suggest creating a counterparty file after this matter closes.
