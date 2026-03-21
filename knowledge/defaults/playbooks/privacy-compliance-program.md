# Privacy Compliance Program Playbook

## When to Use
Use this playbook when building a new privacy compliance program from the ground up, auditing an existing program, or significantly expanding a program to address new jurisdictions or data processing activities. This provides a comprehensive framework for achieving and maintaining compliance with data privacy laws.

## Prerequisites
- Executive sponsor for the privacy program identified (DPO, CPO, General Counsel, or CISO)
- Inventory of business units and products/services that process personal data
- Identification of applicable jurisdictions where the company operates or has data subjects
- Load `knowledge/law/data-privacy/` — load all sub-files relevant to the applicable jurisdictions
- Load `knowledge/law/cybersecurity/` for security requirements
- Load `positions/data-protection.md` for contractual data protection standards
- Budget and staffing plan for the privacy program
- Current state assessment: what privacy measures exist today (if any)?

## Process

### Step 1: Data Inventory and Mapping
Build a comprehensive understanding of what personal data the company processes:

**Data Inventory:**
For each business unit/product/service, document:
- **Categories of data subjects:** customers, employees, job applicants, website visitors, business contacts, minors
- **Categories of personal data:** names, email, phone, address, payment data, health data, biometric data, device identifiers, browsing behavior, geolocation
- **Sensitive/special category data:** racial/ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, sex life/orientation, criminal records
- **Sources of data:** directly from data subjects, third-party data providers, automated collection (cookies, SDKs), publicly available sources
- **Purposes of processing:** service delivery, marketing, analytics, HR administration, fraud prevention, legal compliance
- **Legal basis for each processing activity:** consent, contract performance, legitimate interest, legal obligation, vital interest, public task (GDPR Article 6 basis)

**Data Flow Mapping:**
- Map how data moves through systems: collection → storage → processing → sharing → deletion
- Identify all systems/databases where personal data resides
- Identify all third parties who receive personal data (vendors, partners, affiliates, government)
- Identify cross-border data transfers: which data leaves the country/region of collection? Where does it go?
- Document data retention periods for each data category and system

**Decision — DPIA Requirement:**
- If any processing activity involves: (1) systematic and extensive profiling with significant effects, (2) large-scale processing of sensitive data, (3) systematic monitoring of a publicly accessible area, OR (4) new technology with high risk to individuals → conduct a Data Protection Impact Assessment (DPIA) before the processing begins. This is mandatory under GDPR Article 35 and recommended as best practice in all jurisdictions.

### Step 2: Assess Legal Obligations
Determine which privacy laws apply and what they require:

**Jurisdiction Identification:**
| Trigger | Law/Regulation | Key Requirements |
|---|---|---|
| EU/EEA data subjects | GDPR | Full compliance framework required: legal basis, DPO, DPIA, 72-hour breach notification, data subject rights, cross-border transfer mechanisms |
| UK data subjects | UK GDPR | Similar to EU GDPR; separate ICO registration; UK adequacy determinations |
| California residents | CCPA/CPRA | Notice at collection, opt-out of sale/sharing, data subject rights, service provider contracts |
| Other US states (CO, CT, VA, etc.) | State privacy laws | Vary by state; generally: notice, opt-out, data subject rights; check effective dates |
| Canadian data subjects | PIPEDA / provincial laws | Consent framework, accountability principle, breach notification |
| Brazilian data subjects | LGPD | Legal basis, DPO, data subject rights, ANPD registration |
| Children under 13 (US) | COPPA | Verifiable parental consent, limited collection, FTC enforcement |
| Health data (US) | HIPAA | BAAs, minimum necessary, breach notification, administrative/physical/technical safeguards |
| Financial data (US) | GLBA | Privacy notices, opt-out rights, safeguards rule |

Load the relevant `knowledge/law/data-privacy/` sub-files for each applicable law. Within each sub-file, identify the specific requirements that apply based on the data inventory.

**Decision — Compliance Standard:**
- **Single jurisdiction:** Comply with that jurisdiction's requirements.
- **Multiple jurisdictions:** Assess whether to build to the highest standard (usually GDPR) and apply uniformly, or maintain jurisdiction-specific compliance programs. Recommendation: build to GDPR standard as the baseline and layer on jurisdiction-specific requirements (e.g., CCPA opt-out, HIPAA BAAs).

### Step 3: Draft or Update Privacy Policy
Prepare a privacy policy (external-facing) that meets all applicable legal requirements:

**Required Disclosures (GDPR + CCPA combined for maximum coverage):**
- Identity and contact details of the controller/business
- DPO contact information (if appointed)
- Categories of personal data collected
- Purposes of processing and legal basis for each purpose
- Categories of recipients (third parties who receive the data)
- Cross-border transfers and the safeguards in place (SCCs, adequacy decisions, BCRs)
- Retention periods (or criteria for determining retention)
- Data subject rights and how to exercise them
- Right to lodge a complaint with a supervisory authority
- Whether providing data is a statutory/contractual requirement
- Automated decision-making and profiling (if applicable)
- CCPA-specific: categories of data sold or shared; right to opt out; do-not-sell link; financial incentive programs
- CCPA-specific: metrics on data subject requests (if >10M consumers)

**Drafting Guidelines:**
- Use clear, plain language (GDPR requires language that is "concise, transparent, intelligible and easily accessible")
- Layer the policy: executive summary at the top, detailed disclosures below
- Use a table of contents for policies exceeding 2 pages
- Include a "Last Updated" date
- Make the policy accessible: prominent website link, mobile-friendly format
- If the company processes children's data: maintain a separate children's privacy policy

### Step 4: Implement Data Subject Rights Process
Build an operational process for responding to data subject requests:

**Rights to Support:**
| Right | GDPR | CCPA | Response Deadline |
|---|---|---|---|
| Access / Right to Know | Yes (Art. 15) | Yes | GDPR: 30 days. CCPA: 45 days. |
| Deletion / Erasure | Yes (Art. 17) | Yes | GDPR: 30 days. CCPA: 45 days. |
| Correction / Rectification | Yes (Art. 16) | Yes | GDPR: 30 days. CCPA: 45 days. |
| Portability | Yes (Art. 20) | Limited | GDPR: 30 days. |
| Opt-Out of Sale/Sharing | No | Yes | CCPA: 15 business days. |
| Restriction of Processing | Yes (Art. 18) | No | GDPR: 30 days. |
| Object to Processing | Yes (Art. 21) | No | GDPR: 30 days. |

**Operational Requirements:**
- Establish intake channels: web form, email address (privacy@company.com), toll-free number (CCPA)
- Implement identity verification process (verify the requestor is the data subject — prevent unauthorized disclosure)
- Build fulfillment workflows: who receives the request, who searches the systems, who compiles the response, who reviews and sends
- Automate where possible: data subject access request portals, automated data retrieval from key systems
- Train customer support and front-line staff to recognize and route data subject requests
- Track all requests: Date Received | Type | Requestor | Verification Status | Systems Searched | Response Date | Outcome

**Decision — Exception Handling:**
- If a request would adversely affect the rights of others → partial fulfillment with explanation
- If a request is manifestly unfounded or excessive → may refuse or charge a reasonable fee (GDPR); must still respond within the deadline explaining the refusal
- If the company cannot verify the requestor's identity → request additional verification; do not extend beyond 90 days total response time

### Step 5: Establish Breach Response Plan
Create a documented incident response plan for personal data breaches:

**Breach Response Process:**
1. **Detection and Reporting (Hour 0-4):** Any employee who discovers a potential breach reports to the privacy/security team immediately. Establish a clear reporting channel (security@company.com, hotline, Slack channel).
2. **Initial Assessment (Hour 4-24):** Determine: Is personal data involved? What categories of data? How many data subjects are affected? Is the breach ongoing or contained?
3. **Containment (Hour 0-72):** Stop the breach (revoke access, patch vulnerability, isolate affected systems). Preserve forensic evidence.
4. **Notification Assessment (Hour 24-48):** Determine whether notification obligations are triggered:
   - **GDPR:** Notify supervisory authority within 72 hours of becoming aware, unless unlikely to result in risk to individuals. Notify data subjects without undue delay if high risk.
   - **CCPA:** Notify affected California residents if unencrypted personal information is breached.
   - **State breach notification laws:** Check all states where affected individuals reside (notification timelines vary: 30-90 days).
   - **HIPAA:** Notify HHS within 60 days (or 60 days from discovery if <500 individuals; immediately if 500+). Notify affected individuals within 60 days.
   - **Contractual obligations:** Check customer and partner contracts for breach notification requirements (often 24-72 hours).
5. **Notification Execution (Hour 48-72 for authorities; within required period for individuals):** Prepare and send notifications per applicable requirements.
6. **Remediation (Week 1-4):** Fix the root cause. Implement additional safeguards. Update policies and training.
7. **Post-Incident Review (Week 4-8):** Conduct a lessons-learned review. Update the breach response plan. Report to leadership.

### Step 6: Vendor DPA Audit
Ensure all vendors processing personal data have adequate contractual protections:

**DPA Audit Process:** Load `positions/data-protection.md`.
- From the data inventory (Step 1), identify all vendors/sub-processors who process personal data on the company's behalf
- For each vendor, verify: (1) a DPA or equivalent data protection terms exist in the contract, (2) the DPA meets the requirements of the applicable law (GDPR Article 28, CCPA service provider provisions)
- For GDPR: verify the DPA includes: subject matter and duration of processing, nature and purpose, types of personal data, categories of data subjects, controller's obligations and rights, processor's obligations (security, sub-processors, cooperation, deletion/return, audit)
- For cross-border transfers: verify adequate transfer mechanisms (Standard Contractual Clauses, adequacy decision, BCRs, or approved derogation)
- For HIPAA: verify Business Associate Agreements are in place for all vendors handling PHI

**Decision — DPA Gap Remediation:**
- If a vendor processes personal data without a DPA → highest priority. Execute DPA within 30 days or cease data sharing.
- If a DPA exists but is incomplete (missing required GDPR Article 28 provisions) → update within 60 days.
- If cross-border transfers lack a valid mechanism → assess risk and implement SCCs or other mechanism within 90 days.

### Step 7: Training Program
Implement a privacy awareness and training program:

**Training Requirements:**
| Audience | Training Type | Frequency |
|---|---|---|
| All employees | General privacy awareness | Annually + at onboarding |
| Product/engineering teams | Privacy by design, data minimization | Semi-annually |
| Customer support | Data subject request handling | Quarterly refresher |
| Marketing | Consent management, opt-out handling, CAN-SPAM | Semi-annually |
| HR | Employee data privacy, background checks | Annually |
| Executive team | Privacy governance, breach response, regulatory risk | Annually |
| Privacy team | Regulatory updates, enforcement trends | Ongoing |

**Training Content:**
- Company's privacy policy and data handling practices
- How to recognize and report a data breach
- Data subject rights and how to route requests
- Cross-border data transfer restrictions
- Secure data handling practices (encryption, access controls, clean desk)
- Role-specific requirements

### Step 8: Ongoing Monitoring
Establish continuous compliance monitoring:

- **Quarterly:** Review data subject request metrics; review breach log; update data inventory for new products/services
- **Semi-annually:** Review and update privacy policy; re-assess vendor DPA coverage; review consent mechanisms
- **Annually:** Full program audit against all applicable laws; training effectiveness assessment; regulatory landscape update; update DPIA for high-risk processing
- **Triggered:** Regulatory change (new law or significant amendment); new product/service launch; M&A activity; data breach; regulatory inquiry

Document all monitoring activities and findings. Report to the executive sponsor and board (or audit committee) at least annually.

## Output Format
1. **Data Inventory and Flow Map:** Comprehensive data processing record (GDPR Article 30 Record of Processing Activities)
2. **Legal Obligations Matrix:** Applicable laws, specific requirements, and compliance status for each
3. **Privacy Policy:** Drafted or updated external-facing privacy policy
4. **Data Subject Rights Procedures:** Documented workflows for each right type
5. **Breach Response Plan:** Documented incident response plan with notification decision tree
6. **Vendor DPA Tracker:** Status of DPAs for all vendors processing personal data
7. **Training Plan:** Training schedule, content, and completion tracking
8. **Program Maturity Assessment:** Current state vs. target state with remediation roadmap

## Calibration
- **Simple:** Small company, single jurisdiction (US-only or EU-only), limited data processing. Target: initial program build in 4-8 weeks.
- **Standard:** Mid-sized company, multiple jurisdictions (US + EU), moderate data processing, some vendor relationships. Target: initial program build in 2-4 months.
- **Complex:** Large company, global operations, heavy data processing, regulated industry (healthcare, financial services), significant vendor ecosystem. Target: initial program build in 4-8 months. Engage specialized privacy counsel and consider appointing a dedicated DPO.
