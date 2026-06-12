# evaluate

Assess a clause, provision, or document against standards and/or law.

---

## When to use

- Reviewing any clause or term against what it should be
- User asks "is this [clause type] ok?", "how does this compare to our standard?", "is this compliant?"
- As part of a full document review (called for each relevant clause)
- Checking whether a provision meets regulatory requirements

## Consults

- `practice/standards/{clause-type}.md` — the ## Our Position section and ## Classification Guide
- Entity file (via Knowledge Base Search in counsel/SKILL.md) — for counterparty-specific overrides that supersede practice standards
- `law/` area files — hard constraints that always win
- `practice/profile.md` ## Escalation Thresholds — what must be flagged regardless
- `practice/methods/{type}.md` — for full reviews, guidance on what clause types to prioritize

## Produces

Per-issue assessments. Each finding includes:
- What the clause says (quote or summary)
- What the standard requires (source cited)
- The gap between them
- Classification with rationale
- Priority tier for negotiation

---

## Core instructions

### Precedence and assembly

Apply the **4-layer precedence** (law → entity → practice → memory) and the **bottom-up assembly procedure** (practice baseline → entity overrides → law constraints → memory context) defined in `skills/counsel/SKILL.md`. Both are canonical there — don't restate them here.

Reminders specific to evaluation:
- Build the effective position before classifying any clause.
- Strictest wins when multiple `law/` areas apply.
- Compound requirements don't replace each other (data-privacy DPA + financial-services PCI = both).
- Cite specific regulations, not "regulations" — e.g., "GDPR Art. 33 requires 72-hour notification."
- **Staleness flag at point of use:** when a finding relies on a `law/` file, check its `last-reviewed` frontmatter against the area's cadence in `law/frontmatter-policy.json`. If it is past cadence (or has no `last-reviewed`), say so inline in that finding: `⚠️ law last verified {date} — past its {N}-month review cadence; verify before relying`. Never let a Tier 1 call rest silently on stale law.

### Per-issue assessment format

For each finding, produce:

```
**[Clause name] ([Section reference])** — [one-line issue summary]

Current language: "[quote or summary of what the document says]"
Our position: [what the effective position requires, citing the source layer]
Gap: [specific deviation — what's missing, what's wrong, what conflicts]
Rationale: [why this matters — business impact, legal risk, precedent]
Priority: Tier [1/2/3]
```

**Priority tiers:**
- **Tier 1 — Must-have.** Non-negotiable. We will not sign without this change.
- **Tier 2 — Strong preference.** We will push for this. Important but has fallback positions.
- **Tier 3 — Nice-to-have.** Worth raising if there's room. Concession candidate.

### Classification guide

**GREEN — Acceptable as drafted**
- Meets or exceeds the effective position
- No law area conflicts
- Standard market terms
- No action needed

**YELLOW — Needs attention**
- Deviates from our position but within acceptable range
- Below our standard but not a dealbreaker
- Missing preferred protections that aren't legally required
- Worth negotiating if there's room

**RED — Requires action**
- Significantly deviates from our position
- Conflicts with law area requirements (automatic — always)
- Creates material risk exposure
- Exceeds escalation thresholds from profile.md
- Missing legally required provisions

### Escalation

Check each finding against `practice/profile.md` ## Escalation Thresholds. If a finding matches an escalation trigger (uncapped liability, exclusivity, IP assignment, etc.), flag it immediately — don't bury it in a list.

---

## --position

Evaluate against practice/standards/ and entity overrides. This is the most common mode.

### Instructions

For each clause under review:

1. **Identify the clause type.** Map to a known type: limitation of liability, indemnification, confidentiality, data protection, IP ownership, termination, warranty, governing law, force majeure, assignment, fees/payment, etc.

2. **Load the effective position** per the procedure in `skills/counsel/SKILL.md` → Building the Effective Position. From `practice/standards/{clause-type}.md`, the ## Our Position section defines: our standard, what we'll accept, what we won't accept, auto-escalate triggers.

3. **Compare.** What does the clause say vs. what does our position require? Identify every specific deviation.

4. **Classify.** Use the ## Classification Guide in the standards file. GREEN if it meets our position. YELLOW if it deviates but is within the "we'll accept" range. RED if it hits "we won't accept" or an auto-escalate trigger.

5. **Assess.** For YELLOW and RED items: how bad is this if it materializes? How likely? This informs the priority tier — Tier 1 for high-severity items, Tier 3 for low-impact concerns.

6. **Cite the source.** Every classification must say which layer determined it: "practice/standards/limitation-of-liability.md (below 12-month minimum)" or "entity override (Acme accepted 24-month cap in prior deal)."

### When the clause type has no matching standards file

If there's no `practice/standards/{clause-type}.md` for a clause, assess against general market standards and note the gap: "No position file for [clause type] — assessing against market standard. Consider adding a position."

---

## --compliance

Evaluate against law/ constraints. Separate from position checking because law always wins and the output requires specific regulatory citations.

### Instructions

For each clause under review:

1. **Identify which law areas apply.** This should already be done via research --law. If not, scan the clause for triggers: personal data → data-privacy, IP terms → ip-and-technology, payment processing → financial-services, etc.

2. **Load the law area file.** Read `{legal_root}/law/{area}.md` (or the relevant sub-topic files in `law/{area}/`).

3. **Check against requirements.** Does this clause meet the regulatory minimums? Are there mandatory provisions missing? Does any term conflict with a legal requirement?

4. **Cite specifically.** Don't say "this violates data privacy regulations." Say: "This 5-day notification window conflicts with GDPR Article 33, which requires notification to the supervisory authority within 72 hours of becoming aware of a personal data breach."

5. **Flag jurisdictional tension.** If the contract's governing law is one jurisdiction but the obligations implicate another (e.g., Delaware governing law but EU data subjects), flag that governing law doesn't eliminate the foreign regulatory obligations.

6. **Any law conflict = requires action.** No negotiation, no "acceptable range." If the clause violates a legal requirement, it must be fixed. The classification should note: "Law conflict — not a negotiation item."

### Missing mandatory provisions

After checking all clauses that ARE in the document, check what SHOULD be there:
- Does this document type require a DPA? Data breach notification? Specific regulatory disclosures?
- Are there mandatory provisions from the applicable law areas that are entirely absent?

Missing legally required provisions are flagged the same way: specific citation, what's required, why.

---

## Full review (no flag)

When evaluating an entire document (not a single clause), run both position and compliance checks.

### Instructions

1. **Consult the method file.** If a practice/methods/ file exists for this work type, read it for guidance on what to prioritize. A contract review method will list the key clause types to check. An NDA method will have a shorter focus list.

2. **Go through the document systematically.** For each clause or section:
   - Identify the clause type
   - Run --position evaluation
   - Run --compliance evaluation
   - Produce the per-issue assessment

3. **Check for missing provisions.** After reviewing what's there, check what's not:
   - Clauses you have positions for that aren't addressed in the document
   - Law-required provisions that are absent
   - Items from the method file's checklist that aren't covered

4. **Present findings grouped by priority.** RED items first (Tier 1, then Tier 2), then YELLOW (Tier 2, then Tier 3), then GREEN as a brief list of acceptable clauses. Within each group, sort by business impact.

5. **GREEN items get one line each.** Don't over-explain what's acceptable. The lawyer's attention should go to the items that need it.

6. **No holistic risk score.** Present the individual findings. The lawyer synthesizes. If they ask for a summary, that's a draft --summary request.
