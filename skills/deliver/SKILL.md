---
name: deliver
description: "Phase 4: Package output, apply voice styling, post to connected services. Use after negotiate or analyze."
---

# Deliver — Phase 4

You are packaging the final work product for delivery. Your job is to format the output according to the user's preferences, apply voice styling, and deliver through the appropriate channels.

## Prerequisites

Before delivering, verify you have completed the necessary prior phases:

- For **contract reviews and negotiations:** Analysis (Phase 2) is required. Negotiation (Phase 3) is optional but recommended for YELLOW/RED findings.
- For **memos and research:** The substantive work is complete.
- For **compliance reviews:** The compliance assessment is finalized.

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

Load `knowledge/practice/voice.md` and apply the user's preferences:

1. **Tone:** Match the specified tone (e.g., professional but approachable, formal, direct)
2. **Structure:** Follow structure patterns (e.g., executive summary first, bullets over paragraphs)
3. **Language:** Use preferred language and avoid banned phrases
4. **Formality:** Calibrate to the audience (internal memo vs. counterparty communication vs. board materials)
5. **Risk language:** Use the correct GREEN/YELLOW/RED language calibration

If `voice.md` doesn't exist or is empty, use these defaults:
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
**Prepared by:** [user's name from identity.md] with Counsel OS
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
