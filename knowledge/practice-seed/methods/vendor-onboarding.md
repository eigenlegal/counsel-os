---
counsel-os-type: practice
content-version: "2026-04-08"
---
# Vendor Onboarding

Use when engaging a new vendor or renewing/expanding a relationship with an existing vendor. Covers assessment through contract execution and ongoing management.

## Risk Tier Classification

If ANY factor qualifies as Tier 1, classify the vendor as Tier 1. If any factor is Tier 2 and none are Tier 1, classify as Tier 2. Otherwise, Tier 3.

| Factor | Tier 1 (Critical) | Tier 2 (Important) | Tier 3 (Routine) |
|---|---|---|---|
| Data Access | Accesses, processes, or stores sensitive/personal data (PII, PHI, financial) | Moderate data access (business data, non-sensitive employee data) | No data access or only publicly available data |
| Annual Spend | >$500K | $100K-$500K | <$100K |
| Business Criticality | Business-critical service; outage directly impacts revenue or operations | Significant but non-critical; workarounds exist | Commodity service; easily replaceable |
| Regulatory Impact | Vendor's services are subject to specific regulation (HIPAA, PCI, SOX) | Some regulatory touchpoints | No regulatory considerations |
| Replaceability | Few alternatives; high switching cost; 3+ month transition | Moderate alternatives; 1-3 month transition | Many alternatives; <1 month transition |

Additional risk factors: geographic location and cross-border considerations (data residency, sanctions), vendor financial stability, concentration risk (total spend across all engagements), fourth-party risk (sub-processors for material service portions).

## Process Depth by Tier

| | Tier 1 (Critical) | Tier 2 (Important) | Tier 3 (Routine) |
|---|---|---|---|
| **Timeline** | 6-12 weeks | 3-6 weeks | 1-2 weeks |
| **Approvals** | Legal, Security, Privacy, and executive | Legal and Security | Legal review of contract terms only |

## Security Assessment Depth

**Tier 1 -- Full Assessment:**
- Security questionnaire (SIG Lite, CAIQ, or custom) -- review all responses
- SOC 2 Type II report (or ISO 27001). Read full report, not just opinion letter. Flag qualified opinions, exceptions, deficiencies.
- Penetration test results (within last 12 months). Verify critical/high findings remediated.
- BCP/DR plans. Confirm RTO/RPO align with requirements.
- Data processing assessment: types, purposes, retention, deletion, sub-processor list
- Sub-processor review: who, where, contractually bound to equivalent protections?
- Insurance coverage verification: CGL, E&O, cyber liability. Confirm limits meet minimums.
- Financial stability assessment: D&B report, annual report, or financial statements
- Reference checks: 2-3 existing customers in similar industry/use case

**Tier 2 -- Standard Assessment:**
- Abbreviated security questionnaire (top 20 questions: encryption, access control, incident response, data handling)
- SOC 2 or ISO 27001 (opinion letter and exceptions summary)
- Privacy policy review and DPA adequacy assessment
- Insurance certificate confirming adequate coverage
- Basic financial assessment (public information, D&B rating)

**Tier 3 -- Basic Assessment:**
- Self-certification or attestation (vendor confirms minimum security standards)
- Standard contract terms review
- Insurance certificate (if vendor provides professional services or accesses company systems)

## Contract Package by Tier

**Tier 1:** NDA + MSA/SaaS Agreement (full position-file review) + DPA (if personal data) + Order Form/SOW + BAA (if HIPAA) + SLA Exhibit

**Tier 2:** NDA (if needed) + MSA/SaaS Agreement (standard review) + DPA (if personal data) + Order Form/SOW

**Tier 3:** Review vendor's standard terms (click-through or order form). Focus on: limitation of liability, data handling, auto-renewal terms, governing law. NDA only if confidential information shared.

## Key Provision Focus Areas

| Provision | Priority by Tier |
|---|---|
| Data protection & security | Tier 1: Critical. Tier 2: High. Tier 3: If applicable. |
| Limitation of liability | All tiers: High. Ensure carve-outs for data breaches and IP infringement. |
| Indemnification | Tier 1: Critical. Tier 2: High. Tier 3: Standard. |
| Termination rights | All tiers: High. Ensure convenience termination and transition assistance. |
| Service levels | Tier 1: Critical. Tier 2: High. Tier 3: N/A. |
| Insurance requirements | Tier 1: Critical. Tier 2: Standard. Tier 3: If applicable. |
| Audit rights | Tier 1: Required. Tier 2: Recommended. Tier 3: N/A. |
| Sub-contracting restrictions | Tier 1: Required (prior written consent). Tier 2: Notice required. Tier 3: N/A. |

## Internal Approval Matrix

| Approver | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Business owner | Required | Required | Required |
| Legal | Required (senior counsel) | Required | Review only |
| Information Security | Required | Required | Not required |
| Privacy / DPO | Required (if personal data) | Required (if personal data) | Not required |
| Procurement | Required | Required | Required |
| Finance | Required (budget confirmation) | Required | Required |
| Executive (per DOA matrix) | Required (if above threshold) | If above threshold | Not required |

## Ongoing Management Cadence

**Tier 1 -- Continuous Oversight:**
- Quarterly business reviews (QBRs): performance, SLAs, roadmap, issues
- Annual security reassessment (updated SOC 2, re-issue security questionnaire)
- Annual DPA review (sub-processor changes, DPIA updates)
- Continuous SLA monitoring with monthly reporting
- Incident tracking and post-incident review
- Annual contract review against current positions

**Tier 2 -- Periodic Oversight:**
- Semi-annual business reviews
- Biennial security reassessment
- SLA monitoring (monthly or quarterly)
- Annual contract renewal review

**Tier 3 -- Light-Touch Oversight:**
- Annual check-in with business owner: still needed? Still performing?
- Contract renewal review: auto-renewal terms, price increases
- Re-tier if scope or data access has changed

## Re-Tiering Triggers

- Vendor begins processing personal or sensitive data: upgrade to Tier 1
- Annual spend exceeds tier threshold: upgrade tier
- Vendor becomes business-critical (sole-source for key function): upgrade to Tier 1
- Vendor scope decreases or contract value drops: consider downgrading
- Vendor experiences a security breach or material service failure: reassess tier, consider enhanced monitoring or replacement

---

# Vendor Onboarding Checklist

## Initial Assessment

### Must-Check (Tier 1)
- Business case and justification documented -- establishes necessity and prevents unauthorized commitments
- Budget confirmed and allocated -- avoids contractual obligations without funding
- Vendor risk tier determined (Tier 1: Critical / Tier 2: Important / Tier 3: Routine) -- tier drives the scope of diligence and contract requirements
- Existing relationship check (prior contracts, NDAs, disputes) -- prior agreements may conflict with new terms

### Should-Check (Tier 2)
- Alternative vendors evaluated (competitive bid or sole source justification)
- Conflict of interest check (related parties, employee connections)
- Business continuity impact assessment (what happens if this vendor fails)

### Nice-to-Check (Tier 3)
- Market reputation and customer references reviewed
- Vendor financial stability assessed (D&B report or financial statements)

## Security and Compliance Due Diligence

### Must-Check (Tier 1) -- All Tiers
- SOC 2 Type II report reviewed (within last 12 months) or equivalent certification -- validates baseline security controls
- Data processing activities mapped (what data, where stored, who accesses) -- required for DPA and privacy compliance
- Encryption standards verified (at rest and in transit) -- unencrypted data in transit is a critical vulnerability
- Sub-processor list reviewed -- sub-processors inherit your data risk

### Should-Check (Tier 2) -- Tier 1 and 2 Vendors
- Security questionnaire completed and reviewed (SIG Lite or equivalent)
- ISO 27001 certification verified (if applicable)
- Penetration test results reviewed (within last 12 months)
- Access control and authentication mechanisms reviewed
- Business continuity plan reviewed
- Disaster recovery plan reviewed with RPO/RTO targets
- Incident response plan reviewed
- Cross-border data transfer mechanisms verified
- Employee background check and training programs verified

### Nice-to-Check (Tier 3) -- Tier 1 Vendors Only
- Vulnerability management program assessed
- Physical security measures assessed (if applicable)
- On-site assessment conducted (if warranted)
- References checked (2-3 similar customers)

## Contract Execution

### Must-Check (Tier 1)
- NDA executed (if not already in place) -- protects confidential information shared during onboarding
- Master Services Agreement or SaaS Agreement executed -- establishes the legal framework before services begin
- Data Processing Agreement executed (if vendor processes personal data) -- legally required under GDPR and most privacy laws
- Scope of services matches business requirements -- misalignment is the top cause of vendor disputes
- Limitation of liability proportionate to risk -- uncapped vendor liability may signal pricing risk; inadequate cap leaves you exposed

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
- Certificate of insurance received -- proves current coverage before services begin
- Cyber liability coverage verified (for data-processing vendors) -- covers data breach costs that may exceed liability cap
- Coverage amounts meet contractual requirements -- insufficient coverage leaves gaps in risk transfer

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
- Legal review completed and approved -- ensures contractual protections are adequate
- Business owner approval obtained -- confirms the relationship aligns with business needs
- Information Security review completed (Tier 1 and 2) -- validates the vendor meets security requirements

### Should-Check (Tier 2)
- Privacy/DPO review completed (if personal data involved)
- Procurement review completed
- Finance approval obtained (budget confirmation)
- Executive approval obtained (if required by signing authority matrix)

### Nice-to-Check (Tier 3)
- Cross-functional stakeholder sign-off
- Compliance review (for regulated industries)

## Operational Setup

### Must-Check (Tier 1)
- Key dates calendared: contract start/end, auto-renewal notice deadline, insurance expiration -- missed deadlines lead to unwanted renewals and coverage gaps
- Vendor registered in vendor management registry -- ensures centralized tracking and visibility

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
