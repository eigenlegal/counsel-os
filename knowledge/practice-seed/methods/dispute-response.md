---
counsel-os-type: practice
content-version: "2026-04-08"
---
# Dispute Response Playbook

## When to Use
Use this playbook when the company receives a demand letter, threat of litigation, notice of breach, regulatory inquiry, or any formal or informal dispute communication from a counterparty, regulatory body, or third party.

## Prerequisites
- The dispute communication (demand letter, notice, complaint, inquiry)
- Relevant contracts and agreements with the counterparty
- Load position files: `positions/dispute-resolution.md`, `positions/limitation-of-liability.md`, `positions/indemnification.md`
- Load clause library: `clause-library/dispute-resolution.md`
- Internal facts gathered from the business team
- Insurance policies reviewed for potential coverage (CGL, E&O, D&O, cyber)
- Litigation hold assessment completed or in progress (see `checklists/litigation-hold.md`)
- Outside counsel identified (if needed)

## Process

### Step 1: Triage and Classify
Assess the dispute immediately upon receipt. Complete within 24 hours of receiving the communication.

**Severity Classification:**
- **Critical:** Lawsuit filed, regulatory enforcement action, injunction/TRO sought, significant financial exposure (>$500K), or criminal referral. **Response: Same-day assessment. Engage outside counsel within 24 hours.**
- **High:** Formal demand letter with litigation threat, regulatory inquiry or CID, breach notice with termination threat, class action threat. **Response: Assessment within 48 hours.**
- **Medium:** Informal complaint, fee dispute, performance issue, warranty claim, individual consumer complaint. **Response: Assessment within 5 business days.**
- **Low:** Customer complaint, minor contractual disagreement, invoice dispute (<$25K). **Response: Assessment within 10 business days.**

**Deadline Identification:**
- Answer to complaint: typically 20-30 days from service (check jurisdiction-specific rules)
- Cure periods: per the contract's breach/termination provisions
- Regulatory response dates: per the specific inquiry or subpoena
- TRO/preliminary injunction: may require response within days — check court order

**Privilege Assessment:**
- If litigation is reasonably anticipated (demand letter received, complaint filed, regulatory investigation opened), mark all internal communications "PRIVILEGED AND CONFIDENTIAL — ATTORNEY WORK PRODUCT" from this point forward
- Engage outside counsel early to establish attorney-client privilege
- Do not forward the dispute communication broadly — limit distribution to need-to-know

### Step 2: Preserve Evidence
Immediately upon identifying a potential dispute. Load `checklists/litigation-hold.md`:
- Issue a litigation hold notice to all relevant custodians within 24 hours
- Identify custodians: anyone who may have relevant documents or communications (business owners, technical staff, executives)
- Preserve all relevant documents, communications, and electronic records
- Suspend any document retention/destruction schedules for relevant materials
- Preserve electronic data: email, Slack/Teams, shared drives, databases, backup tapes
- Document the preservation steps taken (date, scope, custodians notified)

**Decision — Scope of Hold:**
- **Critical/High severity:** Broad litigation hold. All custodians who interacted with the counterparty or the subject matter. Preserve email, messaging, documents, and system logs.
- **Medium severity:** Targeted hold. Primary business contacts and their direct reports. Preserve email and contract files.
- **Low severity:** Document preservation reminder to the primary business contact. No formal hold required unless the dispute escalates.

### Step 3: Gather Facts
Conduct an internal investigation:
- Interview relevant business stakeholders. Document each interview: date, attendee, key facts, documents referenced. Mark interview notes as privileged.
- Collect and review relevant contracts, correspondence, and records
- Establish a timeline of key events in chronological order
- Identify favorable facts (compliance with contract, timely performance, counterparty fault)
- Identify unfavorable facts (late deliveries, quality issues, missed obligations). Do not ignore these — they must be factored into the strategy.
- Assess the credibility and strength of the counterparty's claims
- Identify potential counterclaims or set-off rights

### Step 4: Legal Analysis
Analyze the dispute on the merits. Load `positions/dispute-resolution.md` and relevant `law/litigation/` files:
- Review the applicable contract provisions: breach definition, cure rights, remedies, dispute resolution mechanism, notice requirements
- Identify applicable legal theories and defenses (statute of limitations, waiver, estoppel, failure to mitigate)
- Assess the counterparty's likely damages claim and our maximum exposure
- Evaluate the strength of our defenses on a scale: Strong (>70% likelihood of prevailing), Moderate (40-70%), Weak (<40%)
- Identify potential counterclaims and quantify their value
- Review the dispute resolution clause — determine the required forum and process (negotiation → mediation → arbitration → litigation)
- Check insurance coverage: does the policy cover defense costs? Indemnity? Is there a duty to defend vs. duty to reimburse? Notify the insurer promptly.
- Assess whether indemnification obligations apply (ours to indemnify, or counterparty to indemnify us under upstream contracts)

**Decision — Litigation vs. Settlement Threshold:**
- **Settle if:** (1) Exposure exceeds $250K AND defense strength is Weak (<40%), OR (2) the cost of defense (legal fees + management time) exceeds 60% of the demand, OR (3) the dispute threatens a critical business relationship worth more than the settlement amount, OR (4) reputational risk of public litigation outweighs the settlement cost.
- **Defend if:** (1) Defense strength is Strong (>70%), OR (2) the claim is without merit and settling would create a precedent for future claims, OR (3) insurance covers defense costs with no impact on premiums, OR (4) a counterclaim has significant value.
- **Hybrid approach:** Defend on the merits while simultaneously exploring settlement through the contractual dispute resolution process.

### Step 5: Develop Response Strategy
Determine the approach:
- **Resolve:** The claim has merit or the cost-benefit favors settlement. Negotiate a resolution (settlement, cure, commercial accommodation). Prepare settlement authority range.
- **Defend:** The claim lacks merit. Prepare a formal response disputing the allegations. Engage outside counsel for Critical/High matters.
- **Defer:** More information needed. Respond acknowledging receipt, reserving all rights, without admitting or conceding. Request clarification of the claim.
- **Escalate:** Critical exposure (>$1M), potential criminal liability, or board-level risk. Notify executive leadership and/or board within 48 hours. Brief D&O insurer.

For each approach, document the analysis:
- Cost of resolution vs. cost of defense (estimated legal fees, management distraction, business impact)
- Business relationship implications (can the relationship survive the dispute?)
- Precedent-setting concerns (will settling invite similar claims?)
- Reputational impact (is there media exposure risk?)
- Insurance coverage implications (will the insurer consent to the strategy?)

**Escalation Timeline:**
- **Day 1:** Triage, classify, initiate litigation hold (Critical/High)
- **Day 2-3:** Fact gathering, preliminary legal analysis
- **Day 5:** Strategy recommendation to senior counsel / GC
- **Day 7-10:** Response drafted and reviewed
- **Day 14:** Response sent (or per contractual/legal deadlines if sooner)

### Step 6: Draft Response
Prepare the formal response:
- **Tone:** Professional and measured. Do not escalate. Do not make admissions. Do not use inflammatory language.
- **Content:**
  - Acknowledge receipt of the communication (but not the merits)
  - Reserve all rights and defenses explicitly ("without waiving any rights or defenses")
  - If disputing: state the grounds clearly with reference to specific contract provisions and facts
  - If seeking cure: outline the cure plan, timeline, and verification method
  - If settling: propose terms without admitting liability; use "without prejudice" or "for settlement purposes only"
  - Reference the dispute resolution clause and invoke the required procedures (e.g., "The Agreement requires mediation before litigation; we propose scheduling mediation within 30 days")
- **Review:** Senior counsel review required for all Critical/High responses. Peer review for Medium.
- **Delivery:** Send via the method specified in the contract's notice provisions (certified mail, email to designated contact, overnight courier). Retain proof of delivery.

### Step 7: Manage to Resolution
Track the dispute through resolution:
- Maintain a dispute log: Date | Event | Action Taken | Next Step | Deadline | Owner
- Calendar all deadlines (response dates, cure periods, statute of limitations, discovery deadlines)
- Report status to leadership: weekly for Critical, biweekly for High, monthly for Medium
- Document settlement negotiations and all offers/counteroffers (mark as privileged; notify insurer of any settlement discussions)
- If the dispute escalates to formal proceedings, engage outside counsel and transition to a litigation management framework
- Post-resolution: conduct a lessons-learned review. Consider logging the outcome in the entity file (via QMD discovery) and updating `knowledge/memory/patterns.md` if the dispute reveals a systemic issue.

## Output Format
1. **Triage Assessment:** Severity, exposure estimate (range), response deadline, privilege designation, insurance coverage status
2. **Fact Summary:** Chronological timeline and key facts (favorable and unfavorable)
3. **Legal Analysis:** Merits assessment with defense strength percentage, defenses available, exposure range, counterclaim potential
4. **Strategy Recommendation:** Resolve/Defend/Defer/Escalate with detailed rationale and cost-benefit analysis
5. **Draft Response:** Formal response letter ready for senior review
6. **Action Items:** Next steps with individual owners, deadlines, and escalation triggers

## Calibration
- **Simple:** Low-severity dispute (invoice disagreement, minor service complaint). Target: initial response within 2-3 business days.
- **Standard:** Medium-severity dispute (breach notice, warranty claim, regulatory inquiry). Target: initial response within 5-10 business days; strategy developed within 2 weeks.
- **Complex:** High/Critical-severity dispute (litigation, regulatory enforcement, significant exposure). Target: engage outside counsel within 24-48 hours; preservation notice within 24 hours; initial strategy within 1 week.
