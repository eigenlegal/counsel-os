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
- Entity file (via QMD) — for counterparty-specific overrides that supersede practice standards
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

### The 4-layer precedence

When evaluating any clause, apply the knowledge layers in strict order:

1. **law/** — Hard floor/ceiling. If a law area sets a requirement (e.g., GDPR 72-hour breach notification), the clause MUST meet it. Any violation is automatically flagged as requiring action. Cite the specific regulation, article, and requirement.

2. **Entity file** — Deal-specific overrides. If the counterparty's entity file says "accepted 24-month liability cap," that is the effective position for this counterparty — it supersedes the practice standard for this deal.

3. **practice/standards/** — Your standard position. The ## Our Position section defines: our standard, what we'll accept, what we won't accept, and what triggers escalation.

4. **memory/** — Informs but doesn't override. "We've accepted this 3 times before" is useful context for the rationale, not a reason to change the classification.

**Strictest wins for law/**: When multiple law areas apply to the same clause, apply the strictest requirement.

**Compound, don't replace**: If data-privacy requires a DPA and financial-services requires PCI compliance, the contract needs BOTH.

### Building the effective position

Before evaluating a clause, assemble the effective position:

1. Read `practice/standards/{clause-type}.md` — the ## Our Position section
2. Query QMD for the counterparty's entity file. If found, check for agreed positions or deal-specific overrides on this clause type. Entity overrides win on conflict with practice.
3. Cross-reference against loaded law/ areas. Note any regulatory floors or ceilings.

The effective position is: practice standard, adjusted by entity overrides, bounded by law constraints.

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

2. **Load the effective position.** Read `practice/standards/{clause-type}.md`. Check the entity file for overrides. The ## Our Position section defines: our standard, what we'll accept, what we won't accept, auto-escalate triggers.

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
