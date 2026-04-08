---
counsel-os-type: practice
content-version: "2026-04-08"
---
# Vendor Onboarding Playbook

## When to Use
Use this playbook when engaging a new vendor or renewing/expanding a relationship with an existing vendor. This covers the end-to-end process from initial assessment through contract execution and ongoing management.

## Prerequisites
- Business case for the vendor engagement approved
- Budget allocated and procurement process initiated
- Vendor identified and initial discussions completed
- Risk tier determined based on data access, spend, and business criticality
- Check `the counterparty entity file (discovered via QMD)` for any prior vendor relationship history

## Process

### Step 1: Vendor Risk Assessment
Classify the vendor by risk tier using the following criteria matrix:

**Risk Tier Classification:**

| Factor | Tier 1 (Critical) | Tier 2 (Important) | Tier 3 (Routine) |
|---|---|---|---|
| Data Access | Accesses, processes, or stores sensitive/personal data (PII, PHI, financial) | Moderate data access (business data, non-sensitive employee data) | No data access or only publicly available data |
| Annual Spend | >$500K | $100K-$500K | <$100K |
| Business Criticality | Business-critical service; outage directly impacts revenue or operations | Significant but non-critical; workarounds exist | Commodity service; easily replaceable |
| Regulatory Impact | Vendor's services are subject to specific regulation (HIPAA, PCI, SOX) | Some regulatory touchpoints | No regulatory considerations |
| Replaceability | Few alternatives; high switching cost; 3+ month transition | Moderate alternatives; 1-3 month transition | Many alternatives; <1 month transition |

**Scoring:** If ANY factor qualifies as Tier 1 → classify as Tier 1. If any factor is Tier 2 and none are Tier 1 → classify as Tier 2. Otherwise → Tier 3.

Additional risk factors to evaluate:
- Geographic location and cross-border considerations (data residency requirements, sanctions screening)
- Vendor's financial stability and going-concern risk
- Concentration risk: does this vendor already provide other services? What is total spend across all engagements?
- Fourth-party risk: does the vendor rely on sub-processors or subcontractors for material portions of the service?

**Decision — Risk Tier Drives Process Depth:**
- **Tier 1:** Full process, all steps. Target: 6-12 weeks. Requires Legal, Security, Privacy, and executive approval.
- **Tier 2:** Standard process, Steps 1-5 with abbreviated Step 2. Target: 3-6 weeks. Requires Legal and Security approval.
- **Tier 3:** Streamlined process, abbreviated Steps 1-3 and Step 5. Target: 1-2 weeks. Legal review of contract terms only.

### Step 2: Security and Compliance Assessment
Based on the risk tier, conduct the appropriate level of diligence:

**Tier 1 — Full Assessment:**
- Security questionnaire (SIG Lite, CAIQ, or custom). Review all responses; follow up on any incomplete answers.
- Review SOC 2 Type II report (or ISO 27001 certification). Read the full report, not just the opinion letter. Flag any qualified opinions, exceptions, or noted deficiencies.
- Penetration test results (within last 12 months). Verify critical/high findings have been remediated.
- Business continuity and disaster recovery plans. Confirm RTO/RPO align with your requirements.
- Data processing assessment: types of data processed, processing purposes, data retention schedule, deletion procedures, sub-processor list
- Sub-processor review: who are the vendor's material sub-processors? Where do they process data? Are they contractually bound to equivalent protections?
- Insurance coverage verification: commercial general liability, professional liability/E&O, cyber liability. Confirm coverage limits meet your minimum requirements per `positions/insurance-requirements.md`.
- Financial stability assessment: D&B report, annual report, or financial statements
- Reference checks: contact 2-3 existing customers in similar industry/use case
- On-site or virtual assessment (for vendors handling highly sensitive data or providing critical infrastructure)

**Tier 2 — Standard Assessment:**
- Security questionnaire (abbreviated — focus on top 20 questions covering encryption, access control, incident response, data handling)
- SOC 2 Type II report or ISO 27001 certification (review opinion letter and exceptions summary)
- Privacy policy review and DPA adequacy assessment. Load `positions/data-protection.md`.
- Insurance certificate confirming adequate coverage
- Basic financial assessment (public information, D&B rating)

**Tier 3 — Basic Assessment:**
- Self-certification or attestation (vendor confirms compliance with your minimum security standards)
- Standard contract terms review (see Step 3)
- Insurance certificate (if the vendor provides professional services or accesses any company systems)

**Decision — Assessment Blockers:**
- If a Tier 1 vendor refuses to complete the security questionnaire or provide a SOC 2 report → escalate to the business owner. Recommend either (1) selecting an alternative vendor, or (2) proceeding with enhanced contractual protections and a right-to-audit clause. Document the risk acceptance.
- If a Tier 1 vendor's security assessment reveals critical deficiencies → do not proceed until the vendor provides a remediation plan with timeline. Re-assess after remediation.

### Step 3: Contract Review and Negotiation
Execute the appropriate contract(s). The contract package varies by tier:

**Tier 1 Contract Package:**
- NDA (if not already in place — see `playbooks/nda-triage.md`)
- Master Services Agreement (MSA) or SaaS Agreement — apply `playbooks/contract-review.md` with full position-file review
- Data Processing Agreement (DPA) — required if personal data is processed. Load `positions/data-protection.md`.
- Order Form / Statement of Work — specific scope, pricing, SLAs, and deliverables
- Business Associate Agreement (BAA) — required if HIPAA applies. Load `law/healthcare/`.
- SLA Exhibit — with measurable uptime, response time, and remedies. Load `positions/service-levels.md`.

**Tier 2 Contract Package:**
- NDA (if needed)
- MSA or SaaS Agreement — apply `playbooks/contract-review.md` with standard review depth
- DPA (if personal data is involved)
- Order Form / SOW

**Tier 3 Contract Package:**
- Review vendor's standard terms (click-through or order form)
- Focus review on: limitation of liability (`positions/limitation-of-liability.md`), data handling, auto-renewal terms (`positions/termination-renewal.md`), and governing law (`positions/dispute-resolution.md`)
- NDA only if confidential information will be shared

**Key focus areas for all vendor contracts** (load corresponding position files):
| Provision | Position File | Priority by Tier |
|---|---|---|
| Data protection & security | `positions/data-protection.md` | Tier 1: Critical. Tier 2: High. Tier 3: If applicable. |
| Limitation of liability | `positions/limitation-of-liability.md` | All tiers: High. Ensure carve-outs for data breaches and IP infringement. |
| Indemnification | `positions/indemnification.md` | Tier 1: Critical. Tier 2: High. Tier 3: Standard. |
| Termination rights | `positions/termination-renewal.md` | All tiers: High. Ensure convenience termination and transition assistance. |
| Service levels | `positions/service-levels.md` | Tier 1: Critical. Tier 2: High. Tier 3: N/A. |
| Insurance requirements | `positions/insurance-requirements.md` | Tier 1: Critical. Tier 2: Standard. Tier 3: If applicable. |
| Audit rights | — | Tier 1: Required. Tier 2: Recommended. Tier 3: N/A. |
| Sub-contracting restrictions | — | Tier 1: Required (prior written consent). Tier 2: Notice required. Tier 3: N/A. |

### Step 4: Internal Approvals
Obtain necessary approvals before execution. Approval requirements vary by tier:

| Approver | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Business owner | Required | Required | Required |
| Legal | Required (senior counsel) | Required | Review only |
| Information Security | Required | Required | Not required |
| Privacy / DPO | Required (if personal data) | Required (if personal data) | Not required |
| Procurement | Required | Required | Required |
| Finance | Required (budget confirmation) | Required | Required |
| Executive (per DOA matrix) | Required (if above threshold) | If above threshold | Not required |

**Decision — Approval Escalation:**
- If any approver raises a material concern (e.g., Security flags critical deficiency, Privacy identifies GDPR violation) → do not proceed to execution. Return to Step 2 or Step 3 to address the concern.
- If approvers disagree (e.g., Business wants to proceed, Security recommends against) → escalate to the executive sponsor for a documented risk acceptance decision.

### Step 5: Onboarding Execution
Complete the operational onboarding:
- Execute contracts and file in the contract management system with metadata tags: vendor name, tier, contract dates, data processing flag
- Set up the vendor in financial systems (payment terms, banking details, tax documentation)
- Configure technical access and integrations with IT/Security oversight:
  - Tier 1: Formal access provisioning with Security review, SSO integration where possible, monitoring enabled
  - Tier 2: Standard access provisioning with Security notification
  - Tier 3: Self-service or standard procurement process
- Establish communication channels and escalation contacts (primary contact, escalation contact, executive sponsor for Tier 1)
- Document the vendor in the vendor registry with key metadata:
  - Contract dates (start, end, renewal notification date)
  - Risk tier and classification rationale
  - Data processing summary (data types, purposes, sub-processors)
  - Key contacts (internal business owner, vendor contacts)
  - SLA commitments and measurement method
  - Insurance expiration dates
  - Next assessment due date
- Set up calendar reminders for key dates: renewal notice deadline (typically 60-90 days before auto-renewal), insurance certificate expiry, annual/biennial security reassessment

### Step 6: Ongoing Management
Establish a vendor management cadence by tier:

**Tier 1 — Continuous Oversight:**
- Quarterly business reviews (QBRs) with vendor: performance, SLAs, roadmap, issues
- Annual security reassessment (request updated SOC 2, re-issue security questionnaire)
- Annual DPA review (sub-processor changes, DPIA updates)
- Continuous SLA monitoring with monthly reporting
- Incident tracking and post-incident review for any service disruption or security event
- Annual contract review: are the terms still market-appropriate? Load current position files and compare.

**Tier 2 — Periodic Oversight:**
- Semi-annual business reviews
- Biennial security reassessment
- SLA monitoring (monthly or quarterly depending on criticality)
- Annual contract renewal review

**Tier 3 — Light-Touch Oversight:**
- Annual check-in with business owner: is the vendor still needed? Still performing?
- Contract renewal review: check auto-renewal terms, price increases
- Re-tier if the vendor's scope or data access has changed

**Decision — Re-Tiering Triggers:**
- Vendor begins processing personal data or sensitive data → upgrade to Tier 1
- Vendor's annual spend exceeds tier threshold → upgrade tier
- Vendor becomes business-critical (e.g., sole-source for a key function) → upgrade to Tier 1
- Vendor scope decreases or contract value drops → consider downgrading tier
- Vendor experiences a security breach or material service failure → reassess tier and consider enhanced monitoring or replacement

## Output Format
1. **Vendor Risk Assessment:** Tier classification with scoring matrix and supporting rationale
2. **Security Assessment Summary:** Key findings, conditions for approval, and any risk acceptances
3. **Contract Package:** Executed agreements filed in contract management system
4. **Approval Record:** Sign-offs from all required approvers with dates
5. **Vendor Registry Entry:** Complete metadata record for ongoing management
6. **Onboarding Checklist:** Completed `checklists/vendor-onboarding.md` confirming all steps are done

## Calibration
- **Simple (Tier 3):** Routine vendor, no data access, low spend. Abbreviated process. Target: 1-2 weeks.
- **Standard (Tier 2):** Moderate risk vendor, some data access or significant spend. Standard process. Target: 3-6 weeks.
- **Complex (Tier 1):** Critical vendor, sensitive data access, high spend, regulatory implications. Full process with all assessments. Target: 6-12 weeks.

---

# Vendor Onboarding Checklist

## Initial Assessment

### Must-Check (Tier 1)
- Business case and justification documented — establishes necessity and prevents unauthorized commitments
- Budget confirmed and allocated — avoids contractual obligations without funding
- Vendor risk tier determined (Tier 1: Critical / Tier 2: Important / Tier 3: Routine) — tier drives the scope of diligence and contract requirements
- Existing relationship check (prior contracts, NDAs, disputes) — prior agreements may conflict with new terms

### Should-Check (Tier 2)
- Alternative vendors evaluated (competitive bid or sole source justification)
- Conflict of interest check (related parties, employee connections)
- Business continuity impact assessment (what happens if this vendor fails)

### Nice-to-Check (Tier 3)
- Market reputation and customer references reviewed
- Vendor financial stability assessed (D&B report or financial statements)

## Security and Compliance Due Diligence

### Must-Check (Tier 1) — All Tiers
- SOC 2 Type II report reviewed (within last 12 months) or equivalent certification — validates baseline security controls
- Data processing activities mapped (what data, where stored, who accesses) — required for DPA and privacy compliance
- Encryption standards verified (at rest and in transit) — unencrypted data in transit is a critical vulnerability
- Sub-processor list reviewed — sub-processors inherit your data risk

### Should-Check (Tier 2) — Tier 1 and 2 Vendors
- Security questionnaire completed and reviewed (SIG Lite or equivalent)
- ISO 27001 certification verified (if applicable)
- Penetration test results reviewed (within last 12 months)
- Access control and authentication mechanisms reviewed
- Business continuity plan reviewed
- Disaster recovery plan reviewed with RPO/RTO targets
- Incident response plan reviewed
- Cross-border data transfer mechanisms verified
- Employee background check and training programs verified

### Nice-to-Check (Tier 3) — Tier 1 Vendors Only
- Vulnerability management program assessed
- Physical security measures assessed (if applicable)
- On-site assessment conducted (if warranted)
- References checked (2-3 similar customers)

## Contract Execution

### Must-Check (Tier 1)
- NDA executed (if not already in place) — protects confidential information shared during onboarding
- Master Services Agreement or SaaS Agreement executed — establishes the legal framework before services begin
- Data Processing Agreement executed (if vendor processes personal data) — legally required under GDPR and most privacy laws
- Scope of services matches business requirements — misalignment is the top cause of vendor disputes
- Limitation of liability proportionate to risk — uncapped vendor liability may signal pricing risk; inadequate cap leaves you exposed

### Should-Check (Tier 2)
- Business Associate Agreement (if HIPAA applies)
- Order form or Statement of Work
- Service Level Agreement (if not in MSA)
- Pricing and payment terms align with budget and proposal
- Data protection obligations adequate for data being shared
- Indemnification includes IP and data breach coverage
- Termination rights protect business continuity
- Transition assistance provisions included
- SLAs with meaningful service credits

### Nice-to-Check (Tier 3)
- Insurance requirements specified and verified
- Audit rights included
- Sub-contracting restrictions appropriate
- Most-favored-customer pricing clause

## Insurance Verification

### Must-Check (Tier 1)
- Certificate of insurance received — proves current coverage before services begin
- Cyber liability coverage verified (for data-processing vendors) — covers data breach costs that may exceed liability cap
- Coverage amounts meet contractual requirements — insufficient coverage leaves gaps in risk transfer

### Should-Check (Tier 2)
- Commercial general liability coverage verified
- Professional liability / E&O coverage verified
- Workers' compensation coverage verified
- Additional insured status confirmed (if required)

### Nice-to-Check (Tier 3)
- Insurance expiration date calendared for renewal tracking
- Policy exclusions reviewed for relevant gaps

## Internal Approvals

### Must-Check (Tier 1)
- Legal review completed and approved — ensures contractual protections are adequate
- Business owner approval obtained — confirms the relationship aligns with business needs
- Information Security review completed (Tier 1 and 2) — validates the vendor meets security requirements

### Should-Check (Tier 2)
- Privacy/DPO review completed (if personal data involved)
- Procurement review completed
- Finance approval obtained (budget confirmation)
- Executive approval obtained (if required by signing authority matrix)

### Nice-to-Check (Tier 3)
- Cross-functional stakeholder sign-off
- Compliance review (for regulated industries)

## Operational Setup and Tracking

### Must-Check (Tier 1)
- Key dates calendared: contract start/end, auto-renewal notice deadline, insurance expiration — missed deadlines lead to unwanted renewals and coverage gaps
- Vendor registered in vendor management registry — ensures centralized tracking and visibility

### Should-Check (Tier 2)
- Vendor set up in procurement/finance system
- Payment terms and banking details configured
- Technical access provisioned (with IT/Security oversight)
- SLA monitoring and reporting configured
- Communication channels established (primary contacts, escalation path)
- Business owner and vendor contacts documented

### Nice-to-Check (Tier 3)
- Purchase order issued (if applicable)
- Integrations configured and tested
- Data sharing mechanisms established (SFTP, API, etc.)
- Risk tier and data processing summary recorded
- Initial performance review date scheduled
- Annual security reassessment date scheduled (Tier 1)
- Performance review cadence established (quarterly/semi-annual/annual)
