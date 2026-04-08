---
counsel-os-type: practice
content-version: "2026-04-08"
---
# Contract Review Playbook

## When to Use
Use this playbook when reviewing any commercial contract (SaaS, services, licensing, procurement) received from a counterparty or drafted internally. This is the primary workflow for evaluating contract risk and producing a redline or issues list.

## Prerequisites
- Load applicable position files from `practice/standards/`
- Load relevant legal area files from `knowledge/law/`
- Identify the contract type and counterparty relationship (vendor, customer, partner)
- Obtain any prior correspondence or term sheets that inform the deal context
- Confirm the business owner and their priorities
- Check `entity files (discovered via QMD)` for any existing counterparty context file

## Process

### Step 1: Initial Classification
Classify the contract by type, value, and risk tier:
- **Type:** SaaS, Professional Services, License, Procurement, Partnership, Reseller, etc.
- **Value:** Annual contract value (ACV) and total contract value (TCV)
- **Risk Tier:** Low (<$100K ACV, standard terms), Medium ($100K-$1M ACV or non-standard terms), High (>$1M ACV, strategic relationship, or significant data processing)

**Decision — Depth of Review:**
- If **Low Risk AND standard contract type** (simple SaaS subscription, routine procurement): skip Steps 2-3, go directly to Step 4 with abbreviated review. Focus only on the five highest-impact position files: `positions/limitation-of-liability.md`, `positions/data-protection.md`, `positions/indemnification.md`, `positions/termination-renewal.md`, `positions/ip-ownership.md`. Target: 1-2 hours.
- If **Medium Risk**: complete all steps. Full position-file comparison. Target: 4-8 hours.
- If **High Risk**: complete all steps with deep analysis. Cross-reference `knowledge/law/` areas. Engage subject-matter experts. Consider board/executive approval requirements. Target: 1-3 days.

### Step 2: Structural Review
Verify the contract contains all necessary components. Load `checklists/contract-review.md` and check each item:
- Parties correctly identified (legal entity names, jurisdiction of incorporation). Verify against public records if unfamiliar counterparty.
- Recitals/background accurately describe the relationship
- Definitions section is complete and internally consistent. Flag defined terms that are used but not defined, or defined but not used.
- Exhibits, schedules, and order forms are attached and referenced. Confirm page/section references are accurate.
- Signature blocks match the parties. Verify signing authority per your delegation of authority matrix.
- Effective date and term are clearly stated
- Order of precedence clause addresses conflicts between main agreement and exhibits

**Decision — Structural Deficiency:**
- If the contract is missing key structural elements (no defined term, no exhibits referenced): return to the counterparty with a structural issues list before conducting substantive review. Do not redline an incomplete document.

### Step 3: Commercial Terms Review
Evaluate core commercial terms against business requirements:
- Scope of services/license matches what was negotiated. Compare against any proposal, SOW, or term sheet.
- Pricing, payment terms, and fee structure align with the proposal. Load `positions/fees-payment.md` for payment term standards.
- Term length and renewal mechanics are acceptable. Load `positions/termination-renewal.md` for auto-renewal and notice period standards.
- SLAs and performance standards meet operational requirements. Load `positions/service-levels.md` for SLA benchmarks.
- Acceptance criteria for deliverables are defined (for services/development contracts)
- Change order process is workable and requires mutual written agreement

### Step 4: Risk Assessment — Apply Position Files
For each major clause category, load the specific position file, compare the contract language against it, and assign a GREEN/YELLOW/RED classification:

| Clause Category | Position File to Load | Clause Library Reference |
|---|---|---|
| Limitation of Liability | `positions/limitation-of-liability.md` | `clause-library/liability-and-indemnification.md` |
| Indemnification | `positions/indemnification.md` | `clause-library/liability-and-indemnification.md` |
| Termination & Renewal | `positions/termination-renewal.md` | `clause-library/termination-and-renewal.md` |
| Data Protection | `positions/data-protection.md` | `clause-library/data-protection.md` |
| Confidentiality | `positions/confidentiality.md` | `clause-library/ip-and-confidentiality.md` |
| IP Ownership | `positions/ip-ownership.md` | `clause-library/ip-and-confidentiality.md` |
| Dispute Resolution | `positions/dispute-resolution.md` | `clause-library/dispute-resolution.md` |
| Assignment & Change of Control | `positions/assignment-change-of-control.md` | — |
| Force Majeure | `positions/force-majeure.md` | — |
| Insurance Requirements | `positions/insurance-requirements.md` | — |
| Representations & Warranties | `positions/representations-warranties.md` | — |
| Fees & Payment | `positions/fees-payment.md` | — |
| Service Levels | `positions/service-levels.md` | `clause-library/sla-and-performance.md` |

**For each clause:** (1) Read the contract language, (2) compare against the position file classification guide, (3) assign GREEN/YELLOW/RED, (4) if YELLOW or RED, pull recommended counter-language from the clause library.

**Decision — Overlay Practice Positions:**
- After loading default positions, check `knowledge/practice/positions.md` for any overrides. Practice positions supersede defaults.
- Check `the counterparty entity file (discovered via QMD)` for deal-specific overrides. Counterparty overrides supersede practice positions.

### Step 5: Legal Compliance Check
Scan the contract against applicable legal requirements. Auto-detect which `knowledge/law/` areas apply:

| Trigger | Law Area to Load |
|---|---|
| Personal data processing | `law/data-privacy/` |
| International counterparty or services | `law/international-trade/` |
| Government payments or officials | `law/white-collar-investigations/` |
| Financial services or payments | `law/financial-services/` |
| Healthcare data (PHI) | `law/healthcare/` |
| AI/ML services | `law/ai-and-automation/` |
| Consumer-facing product | `law/consumer-protection/` |
| Employment-related services | `law/employment/` |

Verify:
- Data protection / privacy law compliance (GDPR, CCPA, etc.) — is a DPA required?
- Export control and sanctions provisions — are restricted countries/persons involved?
- Anti-corruption / anti-bribery provisions — does the counterparty interact with government?
- Industry-specific regulatory requirements
- Governing law and jurisdiction appropriateness. Flag if governing law is in an unfamiliar or adverse jurisdiction.

### Step 6: Produce Issues List or Redline
For each identified issue:
1. State the clause reference (section number) and quote the current language
2. Identify the risk classification (RED/YELLOW/GREEN) and cite which layer determined it (law/, practice/, or entity files)
3. Explain the concern in plain language
4. Propose specific alternative language from `clause-library/` or draft custom language
5. Assign priority tier: Tier 1 (must-have), Tier 2 (strong preference), Tier 3 (nice-to-have)

**Tactical sub-steps for preparing the redline:**
- Use track changes (not clean edits) so the counterparty can see every modification
- Add margin comments explaining the rationale for each change — this builds credibility and speeds negotiation
- Group related changes together (e.g., all liability-related changes)
- Do not over-mark: accept acceptable provisions explicitly to show good faith

### Step 7: Internal Alignment
- Share the issues list with the business owner. Walk through RED items first, then YELLOW.
- Identify which issues are Tier 1 (must-have) vs. Tier 2/3 (negotiation leverage)
- Agree on the negotiation strategy before sending the redline
- Document any business-approved deviations from standard positions. If a deviation is approved, note it for potential updating the entity file with the deviation.
- If the contract is High Risk, confirm executive approval before sending the redline.

## Output Format
Produce a structured issues list or memorandum with:
1. **Executive Summary:** Contract type, counterparty, value, risk tier, overall assessment (1-2 paragraphs)
2. **Issues Table:** Clause | Section | Risk Level | Knowledge Layer | Issue | Proposed Resolution | Priority Tier
3. **Redline:** If applicable, marked-up contract with track changes and comments
4. **Recommendation:** Approve, approve with conditions, or reject — with clear rationale

## Calibration
- **Simple (Low Risk):** Focus on Steps 1, 4 (abbreviated), and 6. Spot-check five key position files. Target: 1-2 hours.
- **Standard (Medium Risk):** Complete all steps. Full position-file comparison across all 13 categories. Target: 4-8 hours.
- **Complex (High Risk):** Complete all steps with deep analysis. Cross-reference all triggered `knowledge/law/` areas. Engage subject-matter experts. Consider board/executive approval requirements. Target: 1-3 days.

---

# Contract Review Checklist

## Structural Completeness

### Must-Check (Tier 1)
- Parties correctly identified with full legal entity names — incorrect entity names can void the agreement
- Effective date clearly stated — ambiguity creates disputes about when obligations begin
- Definitions section is complete and internally consistent — undefined terms create interpretation risk
- All exhibits, schedules, and order forms attached and referenced — missing attachments may be unenforceable
- Signature blocks match the identified parties — mismatch raises authority and enforceability concerns
- Order of precedence clause addresses conflicts between documents — without this, conflicting terms create litigation risk

### Should-Check (Tier 2)
- Jurisdiction of incorporation/formation stated for each party
- Recitals accurately describe the relationship and purpose
- Amendment clause specifies requirements for modifications
- Notices clause with current addresses and acceptable delivery methods
- Entire agreement / integration clause present
- Counterparts clause (if applicable)

### Nice-to-Check (Tier 3)
- Severability clause included
- Waiver clause (no waiver unless in writing)
- No blank fields or placeholder text remaining
- Cross-references are accurate
- Defined terms used consistently throughout

## Commercial Terms

### Must-Check (Tier 1)
- Scope of services or license grant clearly defined — vague scope is the leading cause of commercial disputes
- Pricing and fee structure matches the proposal/negotiation — discrepancies between proposal and contract are common
- Payment terms specified (Net 30, Net 60, etc.) — absent terms default to state law which may be unfavorable
- Price increase caps and notice requirements defined — uncapped increases create budget risk

### Should-Check (Tier 2)
- Invoice dispute process included
- Late payment interest rate specified and reasonable
- Tax allocation and gross-up provisions addressed
- Acceptance criteria for deliverables defined
- Change order process documented

### Nice-to-Check (Tier 3)
- Expenses reimbursement terms (if applicable)
- Currency and exchange rate provisions (for international deals)
- Most-favored-customer pricing provisions

## Term and Termination

### Must-Check (Tier 1)
- Initial term length matches business intent — multi-year commitments require business justification
- Auto-renewal mechanics clearly stated — surprise renewals at increased rates are a top complaint
- Termination for cause with reasonable cure period (30 days) — shorter periods limit ability to remedy
- Post-termination obligations (data return, transition assistance) — without these, business continuity is at risk

### Should-Check (Tier 2)
- Non-renewal notice period and method specified
- Termination for convenience rights (mutual or one-sided)
- Termination for insolvency/bankruptcy
- Change of control termination right
- Survival clause listing provisions that survive termination

### Nice-to-Check (Tier 3)
- Early termination fees (if any) are reasonable
- Transition assistance period and cost allocation

## Risk Allocation

### Must-Check (Tier 1)
- Limitation of liability — mutual cap proportionate to deal value — uncapped liability is unacceptable
- Consequential damages exclusion with appropriate carve-outs — blanket exclusion with no carve-outs favors vendor
- Liability cap carve-outs identified (IP, data breach, confidentiality, willful misconduct) — these are the highest-risk areas
- Vendor IP infringement indemnity with cure path — without this, Customer bears risk for Vendor's IP issues

### Should-Check (Tier 2)
- Indemnification obligations are mutual where appropriate
- Data breach indemnification addressed
- Insurance requirements specified and proportionate
- Force majeure clause is mutual and reasonable

### Nice-to-Check (Tier 3)
- Super-cap or separate cap for excluded claims
- Fee-shifting provisions (prevailing party attorneys' fees)

## Intellectual Property

### Must-Check (Tier 1)
- Customer data ownership confirmed — customer owns its data — most critical IP provision
- Custom work product ownership or license clearly assigned — ambiguity defaults to vendor ownership
- AI/ML training restrictions on customer data — absent restrictions allow vendor to train models on your data
- No broad assignment of customer IP to vendor — sometimes hidden in feedback or improvement clauses

### Should-Check (Tier 2)
- Pre-existing IP ownership retained by each party
- License grant for vendor IP embedded in deliverables
- Open-source disclosure requirements
- Feedback clause (if any) is reasonable

### Nice-to-Check (Tier 3)
- Source code escrow (for critical on-premise software)
- Technology roadmap commitments

## Data Protection

### Must-Check (Tier 1)
- Data Processing Agreement (DPA) included or referenced — legally required when processing personal data
- Data breach notification timeline (72 hours or less) — longer timelines may violate GDPR Article 33
- Data return and deletion upon termination — without this, vendor may retain data indefinitely
- No vendor use of personal data for own purposes — common in vendor paper, violates most privacy laws

### Should-Check (Tier 2)
- Data processing limited to customer instructions
- Sub-processor disclosure and change notification
- Security measures and certifications specified
- Cross-border transfer mechanisms in place
- Audit rights (direct or third-party)

### Nice-to-Check (Tier 3)
- Data localization commitments where required
- Privacy impact assessment cooperation
- Data subject request assistance obligations

## Confidentiality

### Must-Check (Tier 1)
- Mutual confidentiality obligations — one-sided confidentiality only protects the disclosing party
- Standard exclusions present (public knowledge, independent development, prior possession) — missing exclusions create overbroad obligations
- No problematic residuals clause — residuals clauses effectively nullify confidentiality

### Should-Check (Tier 2)
- Reasonable duration (3-5 years, perpetual for trade secrets)
- Need-to-know dissemination limits
- Return or destruction upon termination
- Compelled disclosure with notice
- Injunctive relief acknowledged

### Nice-to-Check (Tier 3)
- Binding confidentiality obligations for permitted recipients
- Specific technical safeguards requirements

## Final Checks
- No internal inconsistencies between sections
- Exhibits and schedules are complete
- Signing authority confirmed for both parties
