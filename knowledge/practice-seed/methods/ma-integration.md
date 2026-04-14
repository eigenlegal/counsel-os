---
counsel-os-type: practice
content-version: "2026-04-08"
---
# M&A Integration Playbook

## When to Use
Use this playbook for post-closing legal integration following a completed acquisition, merger, or significant asset purchase. This covers the legal workstreams required to integrate the acquired entity or assets into the buyer's operations, compliance programs, and corporate structure.

## Prerequisites
- Executed acquisition agreement (merger agreement, stock purchase agreement, or asset purchase agreement)
- Due diligence report and findings: load `methods/due-diligence.md` output
- Closing deliverables and consents tracker
- Post-closing covenants and obligations from the acquisition agreement
- Integration team identified (legal, HR, IT, Finance, Operations, Compliance)
- Integration timeline and milestones from the deal team
- Load `knowledge/law/corporate/` for entity structure matters
- Load `methods/due-diligence.md` for reference to open items

## Process

### Step 1: Identify Contracts Requiring Consent or Novation
The most time-sensitive post-closing legal workstream. Begin within the first week after closing.

**Consent Analysis:**
- From the due diligence report, extract all contracts with change-of-control, assignment, or consent provisions triggered by the transaction
- Classify each contract by priority:
  - **Critical (Day 1-30):** Contracts where failure to obtain consent could result in termination, material breach, or loss of rights. Includes: key customer agreements, critical vendor/supplier contracts, technology licenses essential to operations, facility leases.
  - **Important (Day 31-90):** Contracts where consent is required but the counterparty is unlikely to terminate. Includes: non-critical vendor agreements, partnership agreements, distribution agreements.
  - **Administrative (Day 91-180):** Contracts requiring notice only, or where consent is a technical requirement with no practical enforcement risk.

**Consent Process:**
- Prepare consent request letters for each counterparty, customized by relationship importance
- For Critical contracts: personal outreach from the relationship owner (business development, account manager) before sending the formal consent letter
- Track consents in a log: Contract | Counterparty | Consent Status | Follow-Up Date | Risk if Refused
- If consent is refused: assess remedies (negotiate, find alternative supplier/partner, invoke dispute resolution)

**Decision — Anti-Assignment Clauses:**
- If the transaction was a stock purchase/merger (not an asset purchase): many anti-assignment clauses are not triggered because the contracting entity has not changed. But some clauses specifically cover "change of control" — read each clause carefully.
- If the transaction was an asset purchase: virtually all contracts require assignment consent. Prioritize based on business criticality.

### Step 2: Assess Change-of-Control Triggers Beyond Contracts
Identify non-contractual change-of-control implications:

**Regulatory Approvals and Licenses:**
- Government contracts: may require novation or re-certification. Load `law/government-contracts/`.
- Regulated industry licenses: banking, insurance, healthcare, securities, telecommunications — may require regulatory approval for change of control. Some approvals must be obtained pre-closing; others are post-closing notifications.
- Export control licenses: specific licenses may not transfer automatically. Load `law/international-trade/`.
- Data privacy registrations: DPA registrations, GDPR representative appointments, CCPA service provider notifications.

**Employee Agreements:**
- Executive employment agreements with change-of-control provisions (acceleration of vesting, severance triggers, golden parachute payments)
- Retention agreements and stay bonuses tied to the transaction
- Non-compete agreements: assess enforceability post-acquisition (does the buyer's broader business scope make the non-compete unreasonable?)

**Financial Instruments:**
- Loan agreements and credit facilities with change-of-control provisions (may trigger mandatory prepayment or default)
- Bond indentures with change-of-control put rights
- Lease agreements with change-of-control consent requirements

### Step 3: Merge Entity Structures
Rationalize the corporate structure post-closing:

**Entity Consolidation Assessment:**
- Map the pre-acquisition entity structure of both buyer and target
- Identify redundant entities (two entities in the same jurisdiction performing similar functions)
- Assess which entities can be merged, dissolved, or converted
- Consider tax implications of each restructuring option (consult tax counsel)
- Prioritize: eliminate dormant entities first, then consolidate operating entities

**Entity Actions:**
- File articles of merger for entity consolidations
- File certificates of dissolution for entities being wound down
- Update entity registrations (registered agents, officers, directors) to reflect new ownership
- Qualify the acquired entities to do business in the buyer's jurisdictions (or vice versa)
- Update good standing certificates and annual report filings
- Update EIN/tax registrations, bank accounts, and signing authorities

**Decision — Integration Speed:**
- **Rapid integration (0-90 days):** Appropriate for bolt-on acquisitions where the target's operations will be fully absorbed. Merge entities quickly. Consolidate contracts. Terminate redundant employees.
- **Phased integration (3-12 months):** Appropriate for larger acquisitions where operational continuity requires maintaining separate structures temporarily. Keep the target as a subsidiary initially; integrate in stages.
- **Maintain as subsidiary (indefinite):** Appropriate when regulatory requirements mandate a separate entity, the target has a distinct brand, or there are liability isolation benefits.

### Step 4: Integrate Compliance Programs
Harmonize the compliance and governance frameworks:

**Compliance Program Merger:**
- Compare the buyer's and target's compliance programs across all key areas:
  - Anti-corruption / anti-bribery (FCPA, UK Bribery Act). Load `law/white-collar-investigations/`.
  - Data privacy (GDPR, CCPA, sector-specific). Load `law/data-privacy/`.
  - Antitrust/competition. Load `law/antitrust/`.
  - Export controls and sanctions. Load `law/international-trade/`.
  - Industry-specific compliance (healthcare, financial services, government contracts)
- Identify the higher standard for each area and adopt it as the unified standard
- Extend the buyer's code of conduct and key policies to the acquired entity
- Conduct compliance training for all acquired employees (within 90 days of closing)
- Integrate the target into the buyer's compliance monitoring and reporting systems

**Decision — Compliance Gap Remediation:**
- If the due diligence report identified compliance gaps in the target: remediate within the timeframes specified in the acquisition agreement's post-closing covenants. If no timeframes were specified, use: Critical gaps within 30 days, High gaps within 90 days, Medium gaps within 180 days.
- If the target had no formal compliance program: implement the buyer's program immediately. Prioritize: code of conduct rollout, anti-corruption training, data privacy assessment.

### Step 5: Harmonize Employment Terms
Align employment arrangements across the combined entity:

**Employment Integration Checklist:** Load `law/employment/`.
- Review all acquired employee offer letters and employment agreements for: at-will status, non-competes, non-solicitation, IP assignment, severance provisions
- Determine whether employees will receive new employment agreements with the buyer or continue under existing terms
- Harmonize compensation structures: salary bands, bonus programs, commission plans
- Harmonize benefits: health insurance, retirement plans (401(k) merger or parallel plans), PTO policies, equity plans
- Assess WARN Act implications if any workforce reductions are planned (see `methods/employment-termination.md`)
- Address immigration status: verify work authorization for all acquired employees; assess H-1B transfer requirements
- Conduct employee communication: explain changes, timelines, and points of contact

**Decision — Employment Agreement Approach:**
- **Assumption of existing agreements:** Lower disruption, faster integration. But may result in inconsistent terms across the combined workforce.
- **New agreement rollout:** More disruptive but creates uniform terms. Requires consent from each employee (offer continued employment conditional on signing new agreement).
- **Hybrid approach:** Assume existing agreements for most employees; issue new agreements for executives and key employees with updated terms.

### Step 6: Consolidate IP Portfolio
Integrate the intellectual property assets. Cross-reference `methods/ip-portfolio-management.md`:

**IP Integration Actions:**
- Record assignments of all acquired IP with the relevant registries (USPTO, WIPO, Copyright Office)
- Update trademark ownership records and specimens of use
- Transfer domain name registrations to the buyer's registrar
- Consolidate patent portfolios: identify overlapping patents, assess cross-licensing opportunities
- Review the target's open-source usage and integrate into the buyer's open-source compliance program
- Assess whether any acquired IP conflicts with the buyer's existing licenses or obligations
- Update IP insurance coverage to include acquired assets

**Employee IP Assignments:**
- Verify that all acquired employees have executed IP assignment agreements in favor of the target
- If any gaps exist: obtain IP assignment agreements from the employees as part of the new employment agreement rollout
- For key inventors: confirm that prior inventions are properly excluded and all company inventions are assigned

### Step 7: Post-Closing Obligations and Monitoring
Track and fulfill all post-closing obligations from the acquisition agreement:

**Post-Closing Covenants:**
- Create a comprehensive tracker of all post-closing obligations: Obligation | Source (Agreement Section) | Deadline | Owner | Status
- Common obligations: tax filings, regulatory notifications, employee benefit transitions, non-competition covenants, indemnification claims process, earnout milestones, working capital adjustment
- Calendar all deadlines with advance reminders (30-day and 7-day warnings)

**Integration Monitoring:**
- Conduct integration status reviews: weekly for the first 90 days, biweekly for days 91-180, monthly thereafter
- Track integration milestones against the integration plan
- Escalate delays or issues to the integration steering committee
- Document all integration decisions for the record

**Indemnification Management:**
- Monitor for indemnification claims (from buyer against seller, or third-party claims against the acquired business)
- Track claim notification deadlines and procedures per the acquisition agreement
- Manage escrow/holdback releases per the agreed schedule

## Output Format
1. **Integration Tracker:** Master spreadsheet of all integration workstreams, tasks, owners, deadlines, and status
2. **Consent Log:** Status of all required third-party consents with risk assessment for any that are refused
3. **Entity Structure Plan:** Pre- and post-integration entity charts with timeline for consolidation
4. **Compliance Integration Plan:** Gap remediation tasks with owners and deadlines
5. **Employment Transition Memo:** Summary of employment terms harmonization with employee communication plan
6. **Post-Closing Obligations Tracker:** All covenants, deadlines, and compliance status

## Calibration
- **Simple:** Small bolt-on acquisition, single jurisdiction, limited contracts, no regulatory complexity. Target: integration complete within 90 days.
- **Standard:** Mid-market acquisition, multiple jurisdictions, moderate contract portfolio, some regulatory considerations. Target: integration substantially complete within 6 months.
- **Complex:** Large acquisition, cross-border operations, heavily regulated industry, significant contract portfolio requiring consents, workforce integration with WARN implications. Target: integration substantially complete within 12 months. Dedicated integration management office recommended.
