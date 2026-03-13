# Vendor Onboarding Playbook

## When to Use
Use this playbook when engaging a new vendor or renewing/expanding a relationship with an existing vendor. This covers the end-to-end process from initial assessment through contract execution and ongoing management.

## Prerequisites
- Business case for the vendor engagement approved
- Budget allocated and procurement process initiated
- Vendor identified and initial discussions completed
- Vendor onboarding checklist prepared (see checklists/vendor-onboarding.md)
- Risk tier determined based on data access, spend, and business criticality

## Process

### Step 1: Vendor Risk Assessment
Classify the vendor by risk tier:
- **Tier 1 (Critical):** Vendors that access, process, or store sensitive/personal data; provide business-critical services; or have annual spend exceeding $500K. Requires full due diligence.
- **Tier 2 (Important):** Vendors with moderate data access, non-critical but significant services, or annual spend of $100K-$500K. Requires standard assessment.
- **Tier 3 (Routine):** Vendors with no data access, commodity services, or annual spend under $100K. Requires basic assessment.

Factors to evaluate:
- Type and volume of data the vendor will access or process
- Business continuity impact if the vendor fails
- Regulatory requirements applicable to the vendor's services
- Geographic location and cross-border considerations
- Replaceability and switching costs

### Step 2: Security and Compliance Assessment
Based on the risk tier, conduct appropriate diligence:

**Tier 1 — Full Assessment:**
- Security questionnaire (SIG Lite or custom)
- Review SOC 2 Type II report or ISO 27001 certification
- Penetration test results (within last 12 months)
- Business continuity and disaster recovery plans
- Data processing assessment (types of data, processing purposes, retention, deletion)
- Sub-processor review
- Insurance coverage verification
- Financial stability assessment (D&B report or financials)
- Reference checks
- On-site assessment (if warranted)

**Tier 2 — Standard Assessment:**
- Security questionnaire (abbreviated)
- SOC 2 Type II or ISO 27001 certification
- Privacy policy and DPA review
- Insurance certificate
- Basic financial assessment

**Tier 3 — Basic Assessment:**
- Self-certification or attestation
- Standard terms review
- Insurance certificate (if applicable)

### Step 3: Contract Review and Negotiation
Execute the appropriate contract(s):
- **NDA:** If not already in place (see playbooks/nda-triage.md)
- **Master Services Agreement (MSA) or SaaS Agreement:** Apply the contract review playbook (playbooks/contract-review.md)
- **Data Processing Agreement (DPA):** Required for any vendor processing personal data
- **Order Form / Statement of Work:** Specific scope, pricing, and deliverables
- **Business Associate Agreement (BAA):** If HIPAA applies

Key focus areas for vendor contracts:
- Data protection and security obligations
- Service level commitments
- Limitation of liability (ensure adequate recovery for data incidents)
- Indemnification (especially for IP and data breaches)
- Termination rights and transition assistance
- Insurance requirements
- Audit rights
- Sub-contracting restrictions

### Step 4: Internal Approvals
Obtain necessary approvals before execution:
- Business owner approval
- Legal approval
- Information Security approval (for Tier 1 and 2)
- Privacy/DPO approval (if personal data is involved)
- Procurement approval
- Finance approval (budget confirmation)
- Executive approval (if required by the signing authority matrix)

### Step 5: Onboarding Execution
Complete the operational onboarding:
- Execute contracts and file in the contract management system
- Set up the vendor in financial systems (payment terms, banking details)
- Configure technical access and integrations (with IT/Security oversight)
- Establish communication channels and escalation contacts
- Document the vendor in the vendor registry with key metadata:
  - Contract dates (start, end, renewal)
  - Risk tier
  - Data processing summary
  - Key contacts (business owner, vendor contacts)
  - SLA commitments
  - Insurance expiration dates
- Set up calendar reminders for key dates (renewal, insurance expiry, SLA reviews)

### Step 6: Ongoing Management
Establish a vendor management cadence:
- **Tier 1:** Quarterly business reviews, annual security reassessment, SLA monitoring
- **Tier 2:** Semi-annual reviews, biennial security reassessment, SLA monitoring
- **Tier 3:** Annual check-in, contract renewal review
- Monitor vendor performance against SLAs
- Track and manage incidents and escalations
- Reassess risk tier upon material changes (scope expansion, data access changes)
- Review and update contracts at renewal

## Output Format
1. **Vendor Risk Assessment:** Risk tier classification with supporting analysis
2. **Security Assessment Summary:** Key findings and any conditions for approval
3. **Contract Package:** Executed agreements filed in CMS
4. **Vendor Registry Entry:** Metadata record for ongoing management
5. **Onboarding Checklist:** Completed checklist confirming all steps are done

## Calibration
- **Simple (Tier 3):** Routine vendor, no data access, low spend. Target: 1-2 weeks.
- **Standard (Tier 2):** Moderate risk vendor, some data access or significant spend. Target: 3-6 weeks.
- **Complex (Tier 1):** Critical vendor, sensitive data access, high spend, regulatory implications. Target: 6-12 weeks.
