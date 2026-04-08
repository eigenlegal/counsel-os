---
name: analyze
description: "Phase 2: Deep review against effective positions. Clause-by-clause analysis with GREEN/YELLOW/RED classification. Use after intake."
---

# Analyze — Phase 2

You are performing a deep analysis of a legal document or matter against the effective positions established during intake. Your job is to systematically review every relevant clause, classify risk, and produce a comprehensive analysis report.


## Step 0: Resolve Paths

Read `config.local.md` (if it exists) or `config.md` from the plugin root to get:

- **Legal root** (`{legal_root}`) — contains law/, practice/, matters/, memory/
- **Entity discovery** — QMD query on `counsel-os-type` frontmatter property
- **Specific entity lookup** — QMD search for company name + `counsel-os-type` value

All framework content (law areas, default positions, practice files, memory) is read from `{legal_root}/`. Entity files (companies, counterparties) are discovered via QMD queries — they can live anywhere in the user's vault.

## Prerequisites

Before starting analysis, verify:

1. **Intake is complete.** Check that you have an intake summary with: matter type, applicable law areas, effective positions, and complexity track. If intake hasn't been run, tell the user:
   > I need to classify this matter first. Let me run intake before analysis. Would you like me to proceed with `/counsel-os:intake`?

2. **Practice files are loaded.** You should already have the user's identity, principles, positions, voice, and thresholds from intake. If not, load them now.

3. **Effective positions are built.** You need the merged positions from practice/standards/ + entity overrides + law constraints.

## Step 0b: Load Matter File

Check for a matter file from the intake phase:

1. If the user referenced a specific matter ID, use QMD `get` to load it directly by path or ID.
2. Otherwise, search QMD for `counsel-os-type: matter` + the counterparty name from the conversation. Prefer matters with `stage: intake` or `stage: analyze`.
3. If found, read the matter file. It contains the intake summary, effective positions, law areas, and document references — use these instead of relying solely on conversation history.
4. If no matter file exists, proceed normally using conversation context. The matter system is optional.

When a matter file is loaded:
- Use the effective positions from the matter's `## Effective Positions` section
- Use the law areas from the matter's `## Context` section
- Use the document references from the matter's `## Documents` section

## Step 1: Load the Method

Based on the matter type from intake, load the matching method file from `{legal_root}/practice/methods/`. Look for a file that corresponds to the matter type (e.g., `contract-review.md` for a contract review, `nda-triage.md` for an NDA).

If no method file exists for this matter type, proceed with the general analysis framework below. Note the gap for future content development.

## Step 2: Load Applicable Checklists

If the method file loaded in Step 1 contains a `## Checklist` section, use it for completeness tracking. Additional document-type-specific checklists may exist in `{legal_root}/practice/methods/` (e.g., `saas-agreement.md` for SaaS deals). Load all that apply — checklists catch items that might be missed in clause-by-clause review.

**Priority tiers in checklists:** Checklists include priority tier guidance (Tier 1 / Tier 2 / Tier 3) for each item. Use these tiers as input when assigning priority in Step 3f — if a checklist marks an item as Tier 1, treat a gap in that area as higher priority than one the checklist marks as Tier 3.

## Step 3: Execute Clause-by-Clause Analysis

Go through the document systematically. For each clause or section:

### 3a. Identify the Clause Type

Map each clause to a known clause type (e.g., limitation of liability, indemnification, confidentiality, data protection, IP ownership, termination, warranty, governing law, force majeure, assignment, etc.).

### 3b. Compare Against Effective Position

For each clause, compare the actual language against the effective position:

- **What does our position say?** (from practice/standards/ + entity overrides)
- **What does the document say?** (the actual clause language)
- **Where's the gap?** (identify specific deviations)

### 3c. Check Against Law Constraints

For each clause, cross-reference against all loaded law area constraints:

- Does this clause comply with all applicable law area requirements?
- Are there regulatory minimums or maximums that the clause violates?
- Are there mandatory provisions that are missing entirely?

**Any law conflict = automatic RED.** Cite the specific regulation, article, and requirement.

### 3d. Classify: GREEN / YELLOW / RED

Apply the classification:

**GREEN — Acceptable as Drafted**
- Meets or exceeds our effective position
- No law area conflicts
- Standard market terms
- No action needed

**YELLOW — Needs Attention**
- Deviates from our position but within acceptable range
- Below our standard but not a dealbreaker
- Missing preferred protections that aren't legally required
- Worth negotiating if there's room

**RED — Requires Action**
- Significantly deviates from our position
- Conflicts with law area requirements (automatic RED)
- Creates material risk exposure
- Exceeds our escalation thresholds
- Missing legally required provisions

### 3e. Assess Risk: Severity x Likelihood

For YELLOW and RED items, assess:

- **Severity:** If this risk materializes, how bad is it? (Low / Medium / High / Critical)
- **Likelihood:** How likely is this risk to materialize? (Low / Medium / High)
- **Combined risk:** Severity x Likelihood determines priority

### 3f. Assign Priority Tier

- **Tier 1 — Must-Have:** Non-negotiable. We will not sign without this change. Typically RED items with high severity.
- **Tier 2 — Strong Preference:** We strongly prefer this change and will push for it. Typically RED items with medium severity or YELLOW items with high severity.
- **Tier 3 — Nice-to-Have:** We'd like this change but won't die on this hill. Concession candidate. Typically YELLOW items.

## Step 4: Check for Missing Provisions

After reviewing all clauses that ARE in the document, check for provisions that SHOULD be there but aren't:

1. Run through the loaded checklist — any unchecked items?
2. Check law area requirements — any mandatory provisions missing?
3. Check effective positions — any clause types we have positions for that aren't addressed?

Missing provisions that are legally required = RED.
Missing provisions that are standard practice = YELLOW.

## Step 5: Overall Risk Assessment

Synthesize the findings into an overall risk profile:

- **Total findings:** X GREEN, Y YELLOW, Z RED
- **Top issues:** Ranked by combined risk score (severity x likelihood)
- **Overall risk level:** LOW (mostly GREEN, minor YELLOW) / MEDIUM (several YELLOW, few RED) / HIGH (multiple RED, material risk exposure)
- **Recommendation:** Proceed / Proceed with revisions / Escalate / Do not proceed

## Step 6: Output the Analysis Report

Present the analysis in this format:

```
## Analysis Report

**Matter:** [from intake]
**Type:** [matter type]
**Track:** [GREEN/YELLOW/RED]
**Overall Risk:** [LOW/MEDIUM/HIGH]

### Executive Summary
[2-3 sentences: what is this document, what's the overall assessment, what are the top issues]

### Findings by Severity

#### RED — Requires Action
[For each RED finding:]
1. **[Clause name/section]** — [Classification source: position deviation / law conflict / missing provision]
   - **Current language:** "[quote or summary of what the document says]"
   - **Our position:** [what our effective position requires]
   - **Issue:** [specific problem]
   - **Law citation:** [if applicable — specific regulation, article, requirement]
   - **Risk:** [severity] severity x [likelihood] likelihood
   - **Priority:** Tier [1/2]

#### YELLOW — Needs Attention
[For each YELLOW finding:]
1. **[Clause name/section]** — [Classification source]
   - **Current language:** "[quote or summary]"
   - **Our position:** [what we prefer]
   - **Issue:** [specific concern]
   - **Risk:** [severity] x [likelihood]
   - **Priority:** Tier [2/3]

#### GREEN — Acceptable
[Brief list of clauses that are acceptable as drafted, with one-line confirmation each]

### Missing Provisions
[List any provisions that should be present but aren't, with severity and source]

### Checklist Results
[If a checklist was loaded, show pass/fail for each item]

### Risk Matrix
| Finding | Severity | Likelihood | Priority | Action |
|---------|----------|------------|----------|--------|
| [clause] | [H/M/L] | [H/M/L] | Tier [1/2/3] | [Revise/Negotiate/Accept/Escalate] |

### Recommended Next Steps
1. [If RED items exist:] Proceed to `/counsel-os:negotiate` to generate redlines for [N] findings
2. [If escalation needed:] Escalate [specific items] per thresholds
3. [If clean:] Proceed to `/counsel-os:deliver` to package the analysis
```

## Step 7: Update Matter File

If a matter file was loaded in Step 0b, update it with the analysis results:

1. **Update frontmatter:** Set `stage: analyze` and `updated: {today's date}`.

2. **Populate the working section.** For contract-review matters, replace the empty `## Findings` section with:

```markdown
## Findings

### RED — Requires Action
1. **{Clause name} ({Section ref})** — {one-line issue summary} — Tier {1/2}
   Source: {position deviation / law conflict / missing provision}

### YELLOW — Needs Attention
1. **{Clause name} ({Section ref})** — {one-line issue summary} — Tier {2/3}

### GREEN — Acceptable
{Count} clauses acceptable as drafted.

### Risk Summary
- **Overall:** {LOW/MEDIUM/HIGH}
- RED: {count}, YELLOW: {count}, GREEN: {count}
- **Recommendation:** {Proceed / Proceed with revisions / Escalate / Do not proceed}
```

For other matter types, populate the corresponding working section (Compliance Matrix, Analysis, etc.) with the equivalent structured output.

3. **Update `## Open Issues`** with any missing provisions identified in Step 4.

4. **Update `## Next Action`:**
   - If RED or YELLOW items exist: `Proceed to /counsel-os:negotiate.`
   - If all GREEN: `Proceed to /counsel-os:deliver.`

If no matter file exists, skip this step.

## Special Situations

### Amendment Review
When reviewing an amendment to an existing agreement:
- Load the original agreement context if available
- Focus analysis on what's changing, not the entire base agreement
- Flag any changes that weaken protections from the original deal

### Compliance Review
When reviewing for compliance rather than negotiation:
- Focus on law area requirements rather than negotiation positions
- Output a compliance matrix instead of a negotiation-oriented analysis
- Flag remediation requirements with timelines

### NDA Triage
For NDAs, use a streamlined analysis:
- Key issues: scope of confidential information, term, residuals clause, non-solicitation, governing law
- Most NDAs should be GREEN or YELLOW track
- RED only for unusual provisions (non-compete buried in NDA, overly broad residuals, etc.)
