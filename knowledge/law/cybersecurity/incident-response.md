---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, industry-standard]
---
# Incident Response

## Applicability

Applies to any organization experiencing or preparing for a cybersecurity incident. Covers legal obligations at each stage of incident response, forensic investigation privilege, regulatory reporting, law enforcement engagement, and insurance notification. Critical intersection of legal, technical, and business functions.

## Key Requirements

### Legal Obligations by Phase

#### Phase 1 — Detection and Initial Assessment

- **Preservation of Evidence** / Immediately implement litigation hold and evidence preservation protocols upon detection of a potential incident / **Consequence**: Spoliation of evidence = adverse inference in litigation; regulatory penalties; obstruction charges if federal investigation
- **Privilege Engagement** / Engage outside counsel to direct forensic investigation under attorney-client privilege; counsel retains forensic firm to protect work product / **Consequence**: Failure to establish privilege at outset may result in discoverable forensic reports; see privilege section below
- **Initial Scoping** / Assess scope, nature of data involved, systems affected, and whether incident is ongoing / **Timeline**: First 24-72 hours critical for containment decisions and notification clock assessment / **Consequence**: Delayed scoping may extend breach duration and increase regulatory exposure

#### Phase 2 — Containment and Eradication

- **Containment Decisions** / Balance between immediate containment (stopping data loss) and evidence preservation (monitoring threat actor) / **Consequence**: Over-aggressive containment may destroy evidence; under-containment increases data loss; document rationale for decisions
- **Business Continuity** / Assess operational impact; determine whether systems can remain operational or must be taken offline / **Consequence**: Extended downtime triggers business interruption; contractual SLA breaches; customer notification obligations
- **Regulatory Notification Assessment** / Begin assessing which notification obligations apply: state breach laws, federal regulators (SEC, HHS, banking regulators), international (GDPR 72-hour, etc.) / **Timeline**: Notification clock typically starts when breach is "discovered" or organization "becomes aware" — definition varies by jurisdiction / **Consequence**: Missing early notification deadlines = compounding regulatory violations

#### Phase 3 — Recovery

- **System Restoration** / Restore systems from clean backups; validate integrity before reconnection / **Consequence**: Premature restoration without eradication = re-compromise; extended incident; additional notification obligations
- **Enhanced Monitoring** / Implement heightened monitoring post-recovery to detect threat actor return / **Consequence**: Standard of care expectation; failure to monitor may be evidence of negligence in subsequent litigation

#### Phase 4 — Post-Incident

- **Notification Execution** / Execute required notifications: individuals, state AGs, regulators, law enforcement, contractual counterparties / **Timeline**: Varies by jurisdiction (30-90 days typical for state breach laws; 72 hours for GDPR; 4 business days for SEC material incidents) / **Consequence**: Late notification = per-violation penalties; AG enforcement; private litigation
- **Remediation** / Implement security improvements to prevent recurrence / **Consequence**: FTC, state AGs, and private plaintiffs will examine whether reasonable remediation was implemented; failure to remediate = evidence of ongoing negligence
- **Lessons Learned** / Conduct post-incident review; update incident response plan / **Consequence**: Documented improvement demonstrates good faith; regulatory agencies and courts view favorably

### Forensic Investigation Privilege

- **Attorney-Client Privilege** / Forensic investigation directed by counsel for purpose of providing legal advice may be privileged / **Threshold**: Counsel must be genuinely directing investigation for legal purpose; dual-purpose investigations (legal + business) create risk / **Consequence**: Courts increasingly scrutinizing privilege claims over forensic reports
- **Genesco Decision (2023)** / Court held forensic report prepared by firm retained by insurer (not counsel) was discoverable; privilege requires counsel's direction and legal purpose / **Consequence**: Ensure forensic firm is retained by and reports to outside counsel, not IT or management
- **Capital One Decision (2020)** / Court ordered disclosure of Mandiant forensic report because it served dual business/legal purpose and would have been prepared in substantially similar form regardless of litigation / **Consequence**: "But-for" test: would the report have been prepared in the same form absent litigation? If yes, not privileged
- **Best Practices for Privilege** / (1) Outside counsel retains forensic firm directly; (2) engagement letter specifies legal purpose; (3) forensic reports addressed to counsel; (4) separate business-purpose investigation if needed; (5) mark communications "privileged and confidential — attorney work product" / **Consequence**: No guarantee of privilege; but structured approach maximizes protection

### Law Enforcement Notification

- **FBI/CISA Reporting** / Encouraged for significant incidents; may be required for critical infrastructure (CIRCIA: 72-hour reporting for covered entities, 24-hour for ransomware payments — effective ~2026) / **Consequence**: Voluntary reporting may provide delay in public notification; cooperation credit in any enforcement action
- **Ransomware Payments** / No federal law prohibits payment (but OFAC sanctions may apply if payment to sanctioned entity); CIRCIA requires 24-hour reporting of ransomware payments / **Consequence**: Payment to sanctioned entity = strict liability OFAC violation ($330K+ per violation); must conduct sanctions screening before payment
- **Law Enforcement Hold** / Law enforcement may request delay of public notification to preserve investigation / **Consequence**: Provides safe harbor for notification delay in most state breach laws; must be documented

### Insurance Notification

- **Cyber Insurance** / Most policies require notification within 24-72 hours of discovering a potential incident; some require notification before engaging forensic firms or counsel / **Threshold**: Policy-specific notice provisions; failure to comply may jeopardize coverage / **Consequence**: Late notice = coverage denial; failure to use panel firms may void coverage or reduce reimbursement
- **Panel Requirements** / Many cyber policies require use of pre-approved breach counsel and forensic firms / **Consequence**: Using non-panel providers may result in reduced or denied coverage; negotiate exceptions in advance
- **D&O Insurance** / Directors and officers may need to notify D&O carrier if incident gives rise to potential securities claims or derivative litigation / **Consequence**: Late D&O notice = potential coverage gap for individual liability

### Incident Response Plans

- **Regulatory Expectations** / NIST CSF, HIPAA, GLBA, NYDFS, SEC rules, PCI-DSS, and state privacy laws all require or expect documented incident response plans / **Consequence**: Absence of plan = evidence of inadequate security program; regulatory findings; increased penalties
- **Plan Components** / (1) Defined roles and responsibilities; (2) escalation criteria; (3) communication protocols (internal and external); (4) forensic investigation procedures; (5) notification decision matrix; (6) legal counsel engagement; (7) insurance notification; (8) media/communications strategy / **Consequence**: Plan must be tested (tabletop exercises recommended annually); untested plan = plan in name only
- **Board Reporting** / Boards increasingly expected to receive incident briefings; SEC rules require disclosure of board oversight / **Consequence**: Failure to brief board = governance failure; potential D&O exposure

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): breach notification obligations under GDPR, CCPA, HIPAA, state laws
- **Insurance** (`insurance/`): cyber insurance coverage, notification requirements, panel firms
- **Securities** (`securities/`): SEC material incident disclosure (Form 8-K); insider trading restrictions during incident
- Cross-reference: `state-breach-laws.md` for state-by-state notification requirements
- Cross-reference: `sec-cyber-disclosure.md` for public company disclosure obligations

## Sources

- [NIST SP 800-61 Rev 2 — Computer Security Incident Handling Guide](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)
- [CISA Cyber Incident Reporting for Critical Infrastructure Act (CIRCIA)](https://www.cisa.gov/circia)
- [OFAC Advisory on Ransomware Payments](https://ofac.treasury.gov/recent-actions/20201001)
- [Genesco Inc. v. Visa U.S.A. Inc., No. 3:13-cv-00202 (M.D. Tenn. 2023)](https://casetext.com/case/genesco-inc-v-visa-usa-inc-5)
- [In re Capital One Consumer Data Security Breach Litigation, No. 1:19-md-02915 (E.D. Va. 2020)](https://casetext.com/case/in-re-capital-one-consumer-data-sec-breach-litig-4)

---
