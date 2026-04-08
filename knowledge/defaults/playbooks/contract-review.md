---
counsel-os-type: playbook
content-version: "2026-04-08"
---
# Contract Review Playbook

## When to Use
Use this playbook when reviewing any commercial contract (SaaS, services, licensing, procurement) received from a counterparty or drafted internally. This is the primary workflow for evaluating contract risk and producing a redline or issues list.

## Prerequisites
- Load applicable position files from `knowledge/defaults/positions.md`
- Load relevant legal area files from `knowledge/law/`
- Load `checklists/contract-review.md` for completeness tracking
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
2. Identify the risk classification (RED/YELLOW/GREEN) and cite which layer determined it (law/, practice/, defaults/, or matters/)
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
