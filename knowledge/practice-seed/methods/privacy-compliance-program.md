---
counsel-os-type: practice
content-version: "2026-04-08"
---
# Privacy Compliance Program

Reference guide for building a new privacy compliance program, auditing an existing program, or expanding a program to address new jurisdictions or data processing activities.

---

## Data Inventory Field Checklist

For each business unit/product/service, document:

- **Categories of data subjects:** customers, employees, job applicants, website visitors, business contacts, minors
- **Categories of personal data:** names, email, phone, address, payment data, health data, biometric data, device identifiers, browsing behavior, geolocation
- **Sensitive/special category data:** racial/ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, sex life/orientation, criminal records
- **Sources of data:** directly from data subjects, third-party data providers, automated collection (cookies, SDKs), publicly available sources
- **Purposes of processing:** service delivery, marketing, analytics, HR administration, fraud prevention, legal compliance
- **Legal basis for each processing activity:** consent, contract performance, legitimate interest, legal obligation, vital interest, public task (GDPR Article 6)
- **Data flow:** collection --> storage --> processing --> sharing --> deletion
- **Systems/databases** where personal data resides
- **Third parties** who receive personal data (vendors, partners, affiliates, government)
- **Cross-border transfers:** which data leaves the country/region of collection, and where it goes
- **Retention periods** for each data category and system

---

## DPIA Trigger Conditions

Conduct a Data Protection Impact Assessment before processing begins if any activity involves:

1. Systematic and extensive profiling with significant effects
2. Large-scale processing of sensitive data
3. Systematic monitoring of a publicly accessible area
4. New technology with high risk to individuals

Mandatory under GDPR Article 35; recommended as best practice in all jurisdictions.

---

## Jurisdiction Identification Table

| Trigger | Law/Regulation | Key Requirements |
|---|---|---|
| EU/EEA data subjects | GDPR | Full compliance framework: legal basis, DPO, DPIA, 72-hour breach notification, data subject rights, cross-border transfer mechanisms |
| UK data subjects | UK GDPR | Similar to EU GDPR; separate ICO registration; UK adequacy determinations |
| California residents | CCPA/CPRA | Notice at collection, opt-out of sale/sharing, data subject rights, service provider contracts |
| Other US states (CO, CT, VA, etc.) | State privacy laws | Vary by state; generally: notice, opt-out, data subject rights; check effective dates |
| Canadian data subjects | PIPEDA / provincial laws | Consent framework, accountability principle, breach notification |
| Brazilian data subjects | LGPD | Legal basis, DPO, data subject rights, ANPD registration |
| Children under 13 (US) | COPPA | Verifiable parental consent, limited collection, FTC enforcement |
| Health data (US) | HIPAA | BAAs, minimum necessary, breach notification, administrative/physical/technical safeguards |
| Financial data (US) | GLBA | Privacy notices, opt-out rights, safeguards rule |

### Compliance Standard Decision
- **Single jurisdiction:** Comply with that jurisdiction's requirements.
- **Multiple jurisdictions:** Build to GDPR standard as the baseline and layer on jurisdiction-specific requirements (e.g., CCPA opt-out, HIPAA BAAs).

---

## Required Privacy Policy Disclosures

Combined GDPR + CCPA for maximum coverage:

- [ ] Identity and contact details of the controller/business
- [ ] DPO contact information (if appointed)
- [ ] Categories of personal data collected
- [ ] Purposes of processing and legal basis for each purpose
- [ ] Categories of recipients (third parties who receive the data)
- [ ] Cross-border transfers and the safeguards in place (SCCs, adequacy decisions, BCRs)
- [ ] Retention periods (or criteria for determining retention)
- [ ] Data subject rights and how to exercise them
- [ ] Right to lodge a complaint with a supervisory authority
- [ ] Whether providing data is a statutory/contractual requirement
- [ ] Automated decision-making and profiling (if applicable)
- [ ] CCPA-specific: categories of data sold or shared; right to opt out; do-not-sell link; financial incentive programs
- [ ] CCPA-specific: metrics on data subject requests (if >10M consumers)

Drafting guidelines: use clear, plain language (GDPR requires "concise, transparent, intelligible and easily accessible"); layer the policy with executive summary at top; include "Last Updated" date; maintain separate children's privacy policy if processing children's data.

---

## Data Subject Rights Comparison

| Right | GDPR | CCPA | GDPR Deadline | CCPA Deadline |
|---|---|---|---|---|
| Access / Right to Know | Yes (Art. 15) | Yes | 30 days | 45 days |
| Deletion / Erasure | Yes (Art. 17) | Yes | 30 days | 45 days |
| Correction / Rectification | Yes (Art. 16) | Yes | 30 days | 45 days |
| Portability | Yes (Art. 20) | Limited | 30 days | -- |
| Opt-Out of Sale/Sharing | No | Yes | -- | 15 business days |
| Restriction of Processing | Yes (Art. 18) | No | 30 days | -- |
| Object to Processing | Yes (Art. 21) | No | 30 days | -- |

### Operational Requirements
- Intake channels: web form, email address (privacy@company.com), toll-free number (CCPA)
- Identity verification process required (prevent unauthorized disclosure)
- Tracking fields: Date Received | Type | Requestor | Verification Status | Systems Searched | Response Date | Outcome

### Exception Handling
- Request would adversely affect the rights of others: partial fulfillment with explanation
- Manifestly unfounded or excessive: may refuse or charge a reasonable fee (GDPR); must still respond within deadline
- Cannot verify requestor's identity: request additional verification; do not extend beyond 90 days total

---

## Breach Response Timeline

| Phase | Timing | Actions |
|---|---|---|
| **Detection and Reporting** | Hour 0-4 | Any employee reports potential breach to privacy/security team immediately |
| **Initial Assessment** | Hour 4-24 | Determine: personal data involved? Categories? Number of data subjects? Ongoing or contained? |
| **Containment** | Hour 0-72 | Stop the breach, preserve forensic evidence |
| **Notification Assessment** | Hour 24-48 | Determine notification obligations (see below) |
| **Notification Execution** | Hour 48-72 (authorities); within required period (individuals) | Prepare and send notifications |
| **Remediation** | Week 1-4 | Fix root cause, implement additional safeguards, update policies |
| **Post-Incident Review** | Week 4-8 | Lessons learned, update breach response plan, report to leadership |

### Jurisdiction-Specific Notification Deadlines
- **GDPR:** Supervisory authority within 72 hours of becoming aware (unless unlikely to result in risk). Data subjects without undue delay if high risk.
- **CCPA:** Notify affected California residents if unencrypted personal information is breached.
- **State breach notification laws:** Check all states where affected individuals reside (30-90 days depending on state).
- **HIPAA:** HHS within 60 days (immediately if 500+ individuals). Affected individuals within 60 days.
- **Contractual:** Check customer and partner contracts (often 24-72 hours).

---

## DPA Gap Remediation Priority

| Gap | Remediation Timeframe |
|---|---|
| Vendor processes personal data without a DPA | Highest priority — execute DPA within 30 days or cease data sharing |
| DPA exists but is incomplete (missing GDPR Art. 28 provisions) | Update within 60 days |
| Cross-border transfers lack a valid mechanism | Assess risk and implement SCCs or other mechanism within 90 days |

For GDPR: verify DPA includes subject matter and duration, nature and purpose, types of personal data, categories of data subjects, controller's rights, processor's obligations (security, sub-processors, cooperation, deletion/return, audit). For HIPAA: verify Business Associate Agreements for all vendors handling PHI.

---

## Training Requirements

| Audience | Training Type | Frequency |
|---|---|---|
| All employees | General privacy awareness | Annually + at onboarding |
| Product/engineering teams | Privacy by design, data minimization | Semi-annually |
| Customer support | Data subject request handling | Quarterly refresher |
| Marketing | Consent management, opt-out handling, CAN-SPAM | Semi-annually |
| HR | Employee data privacy, background checks | Annually |
| Executive team | Privacy governance, breach response, regulatory risk | Annually |
| Privacy team | Regulatory updates, enforcement trends | Ongoing |

---

## Monitoring Cadence

| Frequency | Activities |
|---|---|
| **Quarterly** | Review data subject request metrics; review breach log; update data inventory for new products/services |
| **Semi-annually** | Review and update privacy policy; re-assess vendor DPA coverage; review consent mechanisms |
| **Annually** | Full program audit against all applicable laws; training effectiveness assessment; regulatory landscape update; update DPIA for high-risk processing |
| **Triggered** | Regulatory change; new product/service launch; M&A activity; data breach; regulatory inquiry |

Document all monitoring activities and findings. Report to executive sponsor and board (or audit committee) at least annually.
