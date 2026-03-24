---
counsel-os-type: playbook
counsel-os-version: "0.3.1"
---

# Negotiation Playbook

## When to Use
Use this playbook when preparing for and conducting contract negotiations with a counterparty. This applies to both initial deal negotiations and renegotiations of existing agreements.

## Prerequisites
- Completed contract review (see `playbooks/contract-review.md`)
- Issues list with prioritized items (RED/YELLOW/GREEN with tier assignments)
- Business owner alignment on must-haves vs. nice-to-haves
- Understanding of the deal dynamics: leverage, alternatives, timeline, relationship importance
- Knowledge of counterparty's likely positions and constraints
- Load relevant position files from `knowledge/defaults/positions.md`
- Load relevant clause library files from `knowledge/defaults/clause-library.md`
- Check `the counterparty entity file (discovered via QMD)` for prior negotiation history and known counterparty patterns

## Process

### Step 1: Pre-Negotiation Strategy
Prepare the negotiation framework:
- **BATNA (Best Alternative to Negotiated Agreement):** What happens if we walk away? Quantify the cost of no-deal (delay, alternative vendor, lost revenue).
- **Reservation Price:** The worst acceptable outcome on each key issue. Document this before the negotiation begins — do not let it shift under pressure.
- **Target:** The ideal outcome on each key issue
- **Trade-offs:** Which concessions can we make in exchange for what we need? Map dependencies (e.g., "We can accept a lower liability cap if they agree to a broader termination right").
- **Sequencing:** Order issues from easiest to hardest to build momentum

Create a concession tracker:

| Issue | Our Opening Position | Fallback Position | Walk-Away Point | Counterparty Position | Current Status |
|---|---|---|---|---|---|
| Liability Cap | 12-month fees | 18-month fees | 24-month fees | Unlimited | Open |
| _[populate for each open issue]_ | | | | | |

**Decision — Walk-Away Threshold:**
- Before starting negotiations, define the specific combination of terms that would make the deal unacceptable. A deal is a walk-away if: (1) any single Tier 1 item hits the walk-away point, OR (2) three or more Tier 2 items hit their walk-away points simultaneously. Document this threshold and get business owner sign-off.

### Step 2: Issue Prioritization
Categorize all open issues into tiers. Load position files for classification guidance:
- **Tier 1 — Must Have:** Deal-breakers if not resolved. Non-negotiable legal or business requirements.
  - Examples: liability cap within acceptable range (`positions/limitation-of-liability.md`), data protection compliance (`positions/data-protection.md`), IP ownership of custom work (`positions/ip-ownership.md`)
  - These are non-negotiable. If the counterparty cannot accept any Tier 1 item, escalate to senior leadership before conceding.
- **Tier 2 — Important:** Strong preference but room for creative solutions.
  - Examples: SLA levels (`positions/service-levels.md`), termination convenience rights (`positions/termination-renewal.md`), indemnification scope (`positions/indemnification.md`)
  - Fallback positions are available from the position files.
- **Tier 3 — Nice to Have:** Preferred but expendable as trade currency.
  - Examples: governing law preference (`positions/dispute-resolution.md`), audit frequency, notice periods, force majeure breadth (`positions/force-majeure.md`)
  - These are concession chips. Plan which ones to concede and in what order.

### Step 3: Draft the Redline
Prepare the redline with a strategic approach:
- Include all Tier 1 and Tier 2 positions in the initial redline
- Include selected Tier 3 positions as negotiation currency — plan to concede 2-3 of these early to build goodwill
- Pull proposed language from `clause-library/` files where available. Use proven language rather than drafting from scratch.
- Add comments explaining the rationale for significant changes. Frame in terms of mutual benefit or market standard, not "our policy requires."

**Tactical sub-steps for preparing the redline:**
1. Work section by section through the contract, marking changes in track changes
2. For each RED item: propose complete replacement language from `clause-library/`; add a comment citing the specific concern
3. For each YELLOW item: propose targeted edits (not full rewrites); add a comment with a brief rationale
4. Accept GREEN items explicitly — showing acceptance builds credibility
5. Review the redline in full before sending. Verify that your changes do not create internal inconsistencies (e.g., changing a definition in one place but not another).
6. Avoid over-marking — excessive redlines (more than 40% of provisions changed) signal inexperience or bad faith. If the contract needs that much revision, consider proposing your template instead.

### Step 4: Conduct the Negotiation
Follow these principles during negotiation calls or exchanges:

**Opening:**
- Summarize areas of agreement first to establish common ground
- Present the redline thematically (commercial terms, risk allocation, compliance) rather than page-by-page
- State the number of open issues and your expectation for resolution timeline

**During:**
- Lead with rationale before stating positions ("Given that your product will process our customer PII, we need...")
- Use objective standards to justify positions (market practice, regulatory requirements, industry benchmarks)
- Make concessions conditional ("We can accept X if you agree to Y")
- Take notes on all agreements and commitments in real time
- If stuck, propose alternatives rather than repeating the same position

**Deadlock-Breaking Strategies:**
- **Reframe:** Move from positions to interests ("What are you trying to protect against?")
- **Bracket:** Propose a range and negotiate within it ("Can we agree the cap is somewhere between 12 and 24 months?")
- **Unbundle:** Split a bundled issue into components and negotiate each separately
- **Defer with a trigger:** "Let's use X for now, and if Y happens, we revisit" (sunset clauses, step-ups)
- **Escalate jointly:** If counsel-to-counsel is stuck, propose a joint business-owner call to reset priorities
- **Objective benchmark:** Cite specific market data, survey results, or regulatory requirements to depersonalize the disagreement

**Closing:**
- Summarize all agreed points before ending the session. Read them back for confirmation.
- Confirm next steps, deadlines, and who will prepare the next draft
- Document any oral agreements immediately in a follow-up email ("Per our call, we agreed to...")

### Step 5: Track and Close
After each negotiation session, update the concession tracker:
- Record what was offered, what was accepted, what remains open
- Flag any positions where we have moved past the fallback and are approaching the walk-away point
- Circulate a summary of agreed/open points to the internal team
- Prepare the next draft incorporating agreed changes. Turn on track changes from the prior version so the counterparty can see only the new changes.
- Identify remaining open issues and develop strategies for resolution
- Escalate unresolved Tier 1 issues to senior leadership with a specific recommendation (accept counterparty position / hold firm / propose creative alternative)

**Decision — Escalation Triggers:**
- Any Tier 1 issue unresolved after 2 rounds of negotiation → escalate to senior counsel or business leadership
- Negotiation has exceeded 4 rounds with no material progress → assess whether to (1) escalate to executive-level discussion, (2) propose a term sheet reset, or (3) walk away
- Counterparty introduces new material issues after round 2 → flag as bad-faith risk; reassess deal dynamics

### Step 6: Final Review
Before execution, conduct a final verification pass:
- Verify all negotiated changes are accurately reflected in the final draft. Compare against the concession tracker line by line.
- Confirm no provisions were inadvertently changed or omitted during turn-tracking
- Conduct a final read-through for internal consistency (defined terms, cross-references, exhibit alignment)
- Run the contract through `checklists/contract-review.md` one final time
- Obtain necessary internal approvals per the signing authority matrix
- Verify signing authority for the counterparty (officer, authorized representative)
- If the final terms deviate from standard positions, document the deviations for potential updating the entity file with the deviation

## Output Format
1. **Negotiation Prep Memo:** Summary of strategy, priorities, BATNA, and walk-away threshold
2. **Redline:** Marked-up contract with comments, organized by theme
3. **Concession Tracker:** Running log of offers, counteroffers, agreements, and remaining walk-away room
4. **Session Notes:** Summary of each negotiation session (date, attendees, agreements, open items)
5. **Final Issues List:** Remaining open items with specific recommendations and escalation path

## Calibration
- **Simple:** Few open issues, low value, standard terms. Single exchange of redlines. Target: 1-3 rounds over 1-2 weeks.
- **Standard:** Moderate number of issues, medium value. 2-4 rounds of negotiation. Target: 2-4 weeks.
- **Complex:** Many issues, high value, strategic relationship, multiple stakeholders. 4+ rounds with live negotiation sessions. Target: 4-12 weeks. Consider appointing a lead negotiator and maintaining a separate internal strategy document.
