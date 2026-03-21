# Due Diligence Playbook

## When to Use
Use this playbook when conducting legal due diligence on a target company in connection with a potential acquisition, merger, investment, or strategic partnership. Also applicable to vendor due diligence for critical/strategic vendor relationships.

## Prerequisites
- Signed NDA with the target/counterparty (see `playbooks/nda-triage.md` — use M&A NDA review criteria)
- Access to the data room or document repository
- Due diligence checklist prepared: load `checklists/due-diligence.md`
- Deal team identified (legal, finance, tax, HR, IT, operations)
- Timeline and key milestones established (signing, closing, long-stop date)
- Materiality thresholds defined with the deal team (e.g., contracts >$100K, litigation >$250K exposure)
- Outside counsel engaged (if applicable)
- Letter of intent or term sheet available for reference

## Process

### Step 1: Organize the Review
Set up the due diligence framework. Assign workstream leads and load the relevant checklists and legal area files for each:

| Workstream | Checklist / Reference | Key Law Areas |
|---|---|---|
| Corporate/Governance | `checklists/due-diligence.md` §Corporate | `law/corporate/` |
| Contracts | `checklists/due-diligence.md` §Contracts | `positions/assignment-change-of-control.md` |
| IP | `checklists/due-diligence.md` §IP | `law/ip-and-technology/` |
| Litigation & Disputes | `checklists/due-diligence.md` §Litigation | `law/litigation/` |
| Employment | `checklists/due-diligence.md` §Employment | `law/employment/` |
| Regulatory/Compliance | `checklists/due-diligence.md` §Regulatory | Varies by industry |
| Data Privacy & Security | `checklists/due-diligence.md` §Privacy | `law/data-privacy/`, `law/cybersecurity/` |
| Real Estate & Assets | `checklists/due-diligence.md` §Assets | `law/real-estate/` |
| Tax | `checklists/due-diligence.md` §Tax | `law/tax/` |
| Insurance | `checklists/due-diligence.md` §Insurance | `law/insurance/` |
| Environmental | `checklists/due-diligence.md` §Environmental | `law/environmental-esg/` |

Operational setup:
- Create a document request list organized by workstream, referencing `checklists/due-diligence.md` line items
- Establish a tracking system for documents requested, received, and reviewed (spreadsheet or deal management tool)
- Set up regular deal team check-ins (at least 2x/week during active diligence)
- Assign a single point of contact for data room access requests

**Decision — Scope by Deal Type:**
- **Full Acquisition:** All workstreams active. Load complete `checklists/due-diligence.md`.
- **Minority Investment:** Focus on Corporate/Governance, Contracts (material only), IP, Litigation, Financial. Skip Employment deep-dive unless the target has significant workforce issues.
- **Vendor Due Diligence:** Focus on Data Privacy, Security, Contracts, Financial stability, Insurance. Use `checklists/vendor-onboarding.md` instead of full DD checklist.
- **Asset Purchase:** Focus on the specific assets being acquired. Emphasize IP chain-of-title, contract assignability, and environmental (if physical assets).

### Step 2: Document Collection
Manage the information gathering process:
- Submit the initial document request list to the target within 48 hours of data room access
- Track responses using a request log: Item | Requested Date | Received Date | Reviewed By | Status
- Follow up on missing documents at each deal team check-in. Escalate persistent gaps to deal counsel.
- Organize received documents by workstream in a structured folder system mirroring the checklist
- Flag documents that are incomplete, redacted, or raise immediate concerns — create a "red flag" tracker
- Request management presentations and Q&A sessions for key areas (IP, litigation, regulatory)
- Conduct site visits if applicable (manufacturing, data centers, offices)

### Step 3: Substantive Review
For each workstream, conduct a thorough review. Load the corresponding law area files and position files.

**Corporate/Governance:** (Load `law/corporate/`)
- Verify entity structure and good standing in all jurisdictions of qualification
- Review organizational documents for unusual provisions (super-majority requirements, drag-along, tag-along, veto rights)
- Review board and shareholder minutes for undisclosed commitments, disputes, or side agreements
- Verify capitalization table against the company's records and any 409A valuations
- Identify any outstanding options, warrants, convertible instruments, or anti-dilution provisions

**Contracts:** (Load `positions/assignment-change-of-control.md`)
- Identify all material contracts (by value, strategic importance, or risk) — apply the materiality threshold
- Review change of control / assignment provisions: will the deal trigger consents?
- Identify contracts with termination-on-change-of-control provisions — quantify revenue at risk
- Review customer concentration risk (any customer >10% of revenue)
- Identify any most-favored-nation, exclusivity, or non-compete provisions that could constrain the buyer

**IP:** (Load `law/ip-and-technology/`)
- Verify ownership chain-of-title for all key IP assets (patents, trademarks, copyrights)
- Review IP assignment agreements from all employees and contractors — flag any gaps
- Assess open-source usage and license compliance (copyleft risk for proprietary software)
- Identify any IP litigation, infringement claims, or opposition proceedings
- Review key technology licenses (inbound and outbound) for assignability and scope

**Litigation & Disputes:** (Load `law/litigation/`)
- Catalog all pending and threatened claims with estimated exposure
- Assess potential exposure for each matter: best case, likely case, worst case
- Review settlement agreements for ongoing obligations (non-competes, compliance commitments, ongoing payments)
- Identify patterns suggesting systemic issues (repeated claims of same type)
- Request litigation counsel's assessment for any matter with exposure exceeding the materiality threshold

**Employment:** (Load `law/employment/`)
- Review key employee agreements, non-competes, and non-solicitation provisions
- Assess retention risk for critical personnel — identify key-person dependencies
- Review benefit plans for unfunded liabilities (pension, deferred compensation)
- Identify any employment disputes, EEOC charges, labor board matters, or wage/hour claims
- Assess WARN Act applicability if headcount reductions are contemplated post-closing

**Data Privacy & Security:** (Load `law/data-privacy/`, `law/cybersecurity/`)
- Assess data processing activities and legal bases for processing
- Review privacy policies and consent mechanisms for adequacy
- Evaluate security posture: SOC 2, ISO 27001, breach history, pen test results
- Identify cross-border data transfer issues (EU-US, China, etc.)
- Review sub-processor relationships and DPA coverage
- Assess GDPR/CCPA compliance maturity

### Step 4: Risk Assessment
Synthesize findings into an actionable risk analysis:
- Categorize findings by severity:
  - **Deal-Breaker:** Issues that could prevent the transaction (material undisclosed liabilities, fatal IP deficiency, uncurable regulatory violation)
  - **Significant:** Issues requiring purchase price adjustment, specific indemnification, or escrow (>$500K estimated exposure)
  - **Moderate:** Issues requiring post-closing remediation within 90 days
  - **Low:** Noted but manageable issues with no material financial impact
- Quantify financial exposure where possible — use ranges (low/likely/high)
- Identify issues requiring specific rep/warranty/indemnity coverage in the acquisition agreement
- Map each finding to a deal protection mechanism: rep & warranty, special indemnity, escrow, price adjustment, closing condition, or post-closing covenant

**Decision — Deal-Breaker Assessment:**
- If any Deal-Breaker issue is identified, immediately escalate to deal leadership with a written assessment before continuing other workstreams. The deal team should decide whether to (1) terminate, (2) renegotiate structure, or (3) accept with enhanced protections.

### Step 5: Diligence Report
Prepare the due diligence report:
- Executive summary (2-3 pages): key findings, deal-breakers, overall recommendation, top 10 risks
- Workstream-by-workstream detailed findings with severity classifications
- Risk matrix: severity (x-axis) vs. likelihood (y-axis) heat map
- Deal protection memo: specific reps, warranties, indemnities, escrow recommendations tied to each finding
- Consent list: all third-party consents required to close, with estimated timeline and risk of refusal
- Post-closing integration items: matters requiring attention within 30/60/90 days after close
- Open items list: outstanding document requests and unresolved questions

### Step 6: Deal Protection
Translate diligence findings into deal terms:
- Draft specific representations and warranties addressing each identified risk
- Recommend indemnification provisions: special indemnities for known issues, general indemnity basket and cap for unknown issues
- Propose escrow or holdback amounts tied to quantified risks (typically 10-15% of purchase price for 12-18 months)
- Identify conditions precedent to closing (consents obtained, no material adverse change, regulatory approvals)
- Draft disclosure schedule items with specificity tied to diligence findings
- Recommend post-closing covenants for remediation items (e.g., "Seller shall cure all identified data privacy gaps within 90 days post-closing")

## Output Format
1. **Executive Summary:** 2-3 pages covering key findings, deal-breakers, and overall recommendation
2. **Detailed Report:** Workstream-by-workstream analysis with findings, risk ratings, and supporting references
3. **Risk Matrix:** Heat map of all identified risks by severity and likelihood
4. **Deal Points Memo:** Recommended deal protections mapped to specific findings
5. **Open Items List:** Outstanding requests and unresolved questions
6. **Consent List:** All third-party consents required for closing with timeline and risk assessment

## Calibration
- **Simple:** Vendor due diligence or small acquisition (<$5M), limited scope. Target: 2-4 weeks.
- **Standard:** Mid-market acquisition ($5M-$100M), standard scope. Target: 4-8 weeks.
- **Complex:** Large acquisition (>$100M), cross-border, regulated industry, carve-out transaction. Target: 8-16 weeks. Dedicated deal team with outside counsel support. Weekly deal team calls, daily workstream check-ins during peak review period.
