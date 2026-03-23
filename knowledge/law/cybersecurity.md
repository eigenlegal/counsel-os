## Overview

# Cybersecurity Law

## Trigger Conditions

Load this area when the matter involves:
- **Keywords**: cybersecurity, security breach, incident response, NIST, SOC 2, ISO 27001, CMMC, FedRAMP, penetration test, vulnerability
- **Document types**: security assessments, incident response plans, vendor security questionnaires, compliance certifications, cyber insurance policies, breach notification letters
- **Scenarios**: security incident response, compliance framework selection, vendor security diligence, government contractor security, SEC cyber disclosure, security certification requirements

## Sub-Topic Triggers

| Sub-Topic File | Load When |
|---|---|
| `nist-frameworks.md` | NIST CSF, 800-171, 800-53, federal security requirements, CUI |
| `sec-cyber-disclosure.md` | Public company cybersecurity, Form 8-K incident, 10-K risk management, board oversight |
| `cmmc.md` | DoD contracts, CMMC certification, FCI, CUI, defense industrial base |
| `state-breach-laws.md` | Data breach, state notification requirements, AG notification, personal information |
| `incident-response.md` | Security incident, breach response, forensic investigation, evidence preservation |
| `security-standards.md` | SOC 2, ISO 27001, FedRAMP, HITRUST, security certifications, audit |

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): breach notification, personal data protection, GDPR/CCPA intersection
- **Securities** (`securities/`): SEC cyber disclosure rules for public companies
- **Insurance** (`insurance/`): cyber insurance coverage, notification requirements
- **International Trade** (`international-trade/`): export controls on encryption and security technologies

---
## Cmmc

# Cybersecurity Maturity Model Certification (CMMC)

## Applicability

Applies to contractors and subcontractors in the Defense Industrial Base (DIB) handling Federal Contract Information (FCI) or Controlled Unclassified Information (CUI). CMMC establishes tiered cybersecurity certification requirements as a condition of DoD contract award. Final rule published October 2024; phased implementation begins 2025.

## Key Requirements

### CMMC Levels

- **Level 1 — Foundational** / 15 basic cyber hygiene practices derived from FAR 52.204-21; applies to organizations handling FCI only / **Assessment**: Annual self-assessment by senior official affirmation / **Consequence**: Failure to self-assess and affirm = ineligible for contracts requiring Level 1; false affirmation = False Claims Act liability
- **Level 2 — Advanced** / 110 security practices aligned with NIST SP 800-171 Rev 2; applies to organizations handling CUI / **Assessment**: Triennial third-party assessment by CMMC Third-Party Assessment Organization (C3PAO) for critical programs; self-assessment permitted for select programs / **Consequence**: Failure to achieve Level 2 certification = ineligible for CUI contracts; assessment costs $50K-$300K+ depending on scope
- **Level 3 — Expert** / 110+ practices from NIST SP 800-171 plus additional requirements from NIST SP 800-172 (enhanced security); applies to highest-priority CUI programs / **Assessment**: Government-led assessment by DCMA DIBCAC / **Consequence**: Failure to achieve = ineligible for the most sensitive DoD programs; limited number of contractors expected to require Level 3

### FCI vs. CUI Scope

- **Federal Contract Information (FCI)** / Information not intended for public release, provided by or generated for the government under contract (excluding simple transactions) / **Threshold**: Any non-public information exchanged under a federal contract / **Consequence**: Minimum Level 1 required
- **Controlled Unclassified Information (CUI)** / Information requiring safeguarding or dissemination controls per law, regulation, or government-wide policy (CUI Registry maintained by NARA) / **Threshold**: CUI markings or identification in contract; includes technical data, export-controlled, ITAR, PII, PHI in government context / **Consequence**: Minimum Level 2 required; Level 3 for critical programs designated by DoD

### Assessment Process

- **Self-Assessment (Level 1 and select Level 2)** / Organization conducts internal assessment; senior official provides annual affirmation of compliance in Supplier Performance Risk System (SPRS) / **Consequence**: False or misleading affirmation = potential False Claims Act liability ($13K-$27K per false claim, plus treble damages)
- **Third-Party Assessment (Level 2)** / C3PAO conducts assessment; must be accredited by Cyber AB (formerly CMMC Accreditation Body) / **Timeline**: Assessment typically 1-2 weeks on-site; results valid for 3 years / **Consequence**: Conditional certification possible with POA&M for limited deficiencies (must close within 180 days)
- **Government Assessment (Level 3)** / DCMA Defense Industrial Base Cybersecurity Assessment Center (DIBCAC) conducts assessment / **Timeline**: Government scheduling; potentially lengthy wait / **Consequence**: No conditional status; must fully meet all requirements

### Plan of Action and Milestones (POA&M)

- **Eligibility** / Limited POA&Ms permitted for Level 2 and Level 3; not permitted for Level 1 / **Threshold**: No more than 20% of assessed controls may be on POA&M; certain critical controls cannot be on POA&M (access control, incident response, risk assessment) / **Consequence**: Exceeding POA&M limits = assessment failure
- **Closure Timeline** / POA&M items must be closed within 180 days of conditional certification / **Consequence**: Failure to close = loss of certification; contract eligibility revoked

### Subcontractor Flowdown

- **Requirement** / Prime contractors must flow down CMMC requirements to subcontractors based on the type of information shared / **Threshold**: Subcontractors handling CUI = Level 2 minimum; subcontractors handling FCI only = Level 1 / **Consequence**: Prime responsible for ensuring subcontractor compliance; non-compliant subcontractors = contract performance risk
- **Scope Limitation** / Subcontractor level need not exceed what is required for the information they handle / **Consequence**: Can limit CUI flow to reduce subcontractor certification burden

### Phased Rollout

- **Phase 1 (2025)** / Level 1 self-assessment and Level 2 self-assessment required in applicable solicitations / **Consequence**: Contractors must have SPRS scores posted
- **Phase 2 (2026)** / Level 2 C3PAO certification required for applicable contracts / **Consequence**: Third-party certification becomes mandatory for CUI contracts in critical programs
- **Phase 3 (2027)** / Level 3 government assessment for applicable contracts / **Consequence**: Full implementation of all three levels
- **Phase 4 (2028)** / CMMC required in all applicable DoD contracts; option period exercises included / **Consequence**: No DoD contract with CUI/FCI without CMMC certification

### Cost and Preparation

- **Level 1** / Minimal cost; primarily documentation and self-assessment effort / **Consequence**: Small businesses can typically achieve with internal resources
- **Level 2 Preparation** / Typically 12-18 months to achieve compliance from scratch; costs include technology upgrades, managed security services, documentation, assessment fees / **Threshold**: Assessment fees $50K-$300K+; implementation costs $100K-$1M+ depending on organization size and current posture / **Consequence**: Organizations should begin preparation well before contract deadlines
- **Enclave Strategy** / Organizations may limit CUI handling to a defined enclave to reduce assessment scope / **Consequence**: Reduces cost but requires strict boundary controls and data handling procedures

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): CUI may include PII; privacy controls overlap
- **International Trade** (`international-trade/`): CUI often includes export-controlled technical data (ITAR/EAR)
- Cross-reference: `nist-frameworks.md` for underlying NIST SP 800-171 and 800-53 requirements
- Cross-reference: `security-standards.md` for complementary certifications (FedRAMP, SOC 2)

## Sources

- [CMMC Final Rule (48 CFR Part 204)](https://www.federalregister.gov/documents/2024/10/15/2024-22905/cybersecurity-maturity-model-certification-cmmc-program)
- [NIST SP 800-171 Rev 2](https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final)
- [Cyber AB (CMMC Accreditation Body)](https://cyberab.org/)
- [DoD CIO CMMC Website](https://dodcio.defense.gov/CMMC/)

---
## Incident Response

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
## Nist Frameworks

# NIST Cybersecurity Frameworks

## Applicability

Applies to organizations subject to federal cybersecurity requirements, handling Controlled Unclassified Information (CUI), operating federal information systems, or voluntarily adopting NIST frameworks as a security baseline. Covers CSF 2.0, SP 800-171, and SP 800-53.

## Key Requirements

### NIST Cybersecurity Framework (CSF) 2.0

- **Scope** / Voluntary framework applicable to all organizations; widely adopted as industry standard for cybersecurity risk management / **Consequence**: Increasingly referenced in contracts, insurance requirements, and regulatory guidance as baseline expectation
- **Six Core Functions** / (1) Govern — establish cybersecurity risk management strategy, expectations, and policy; (2) Identify — understand organizational context, assets, risks; (3) Protect — implement safeguards to manage risk; (4) Detect — find and analyze cybersecurity events; (5) Respond — take action regarding detected incidents; (6) Recover — restore capabilities and services after incidents / **Consequence**: Framework provides common language for security posture assessment; gaps against CSF used in litigation and regulatory proceedings
- **Implementation Tiers** / Tier 1 (Partial) through Tier 4 (Adaptive); describe rigor of cybersecurity risk management practices / **Consequence**: Tier self-assessment informs risk appetite; contractual partners may require minimum tier
- **Profiles** / Current profile vs. target profile; gap analysis drives remediation roadmap / **Consequence**: Documented gap analysis demonstrates good faith effort; absence of assessment may indicate negligence
- **CSF 2.0 Updates (2024)** / Added Govern function; expanded supply chain risk management; broadened applicability beyond critical infrastructure / **Consequence**: Organizations using CSF 1.1 should update to 2.0; contractual references may need updating

### NIST SP 800-171 — Protecting CUI

- **Scope** / Mandatory for non-federal organizations processing, storing, or transmitting CUI on behalf of federal agencies (primarily DoD contractors under DFARS 252.204-7012) / **Consequence**: Non-compliance = potential loss of federal contracts; False Claims Act liability; debarment
- **110 Security Controls** / Organized in 14 control families: Access Control, Awareness and Training, Audit and Accountability, Configuration Management, Identification and Authentication, Incident Response, Maintenance, Media Protection, Personnel Security, Physical Protection, Risk Assessment, Security Assessment, System and Communications Protection, System and Information Integrity / **Consequence**: All 110 controls must be implemented or documented in Plan of Action and Milestones (POA&M)
- **Self-Assessment** / Contractor self-assessment using NIST SP 800-171A methodology; score submitted to Supplier Performance Risk System (SPRS) / **Threshold**: Maximum score 110; each unimplemented control reduces score by 1-5 points / **Consequence**: Score below contracting officer's threshold = ineligible for award; false score = False Claims Act liability
- **Revision 3 (2024)** / Updated controls aligned with SP 800-53 Rev 5; increased from 110 to 117 controls; enhanced requirements for cloud, mobile, and supply chain / **Consequence**: DoD transition timeline applies; contractors must plan migration

### NIST SP 800-53 — Federal Information Systems

- **Scope** / Mandatory for federal information systems and organizations; basis for FedRAMP and other federal security programs / **Consequence**: Non-compliance = system Authority to Operate (ATO) denied or revoked
- **20 Control Families** / Access Control (AC), Awareness and Training (AT), Audit and Accountability (AU), Assessment/Authorization/Monitoring (CA), Configuration Management (CM), Contingency Planning (CP), Identification and Authentication (IA), Incident Response (IR), Maintenance (MA), Media Protection (MP), Physical and Environmental Protection (PE), Planning (PL), Program Management (PM), Personnel Security (PS), PII Processing and Transparency (PT), Risk Assessment (RA), System and Services Acquisition (SA), System and Communications Protection (SC), System and Information Integrity (SI), Supply Chain Risk Management (SR) / **Consequence**: Control selection based on system categorization (FIPS 199: Low, Moderate, High)
- **Control Baselines** / Low (approx. 130 controls), Moderate (approx. 325 controls), High (approx. 420 controls) / **Consequence**: Baseline selection drives compliance scope and cost
- **Continuous Monitoring** / Ongoing assessment of security controls rather than point-in-time compliance / **Threshold**: NIST SP 800-137 provides monitoring guidance; frequency varies by control / **Consequence**: ATO conditional on continuous monitoring program

### Interaction Between Frameworks

- **CSF to 800-53 Mapping** / NIST provides informative references mapping CSF categories to 800-53 controls / **Consequence**: Organizations can demonstrate CSF alignment through 800-53 implementation
- **800-171 to 800-53 Derivation** / 800-171 controls are derived from moderate baseline of 800-53, tailored for non-federal systems / **Consequence**: Organizations meeting 800-53 Moderate generally meet 800-171
- **Contractual References** / Federal contracts increasingly specify which NIST framework applies; commercial contracts may reference CSF / **Consequence**: Ensure contractual security requirements map to correct framework version

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): NIST Privacy Framework complements CSF; PII controls in 800-53
- **International Trade** (`international-trade/`): CUI handling may intersect with export controls (ITAR/EAR)
- Cross-reference: `cmmc.md` for DoD-specific implementation of 800-171
- Cross-reference: `security-standards.md` for commercial frameworks (SOC 2, ISO 27001)

## Sources

- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
- [NIST SP 800-171 Rev 3](https://csrc.nist.gov/publications/detail/sp/800-171/rev-3/final)
- [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [DFARS 252.204-7012](https://www.acquisition.gov/dfars/252.204-7012)

---
## Sec Cyber Disclosure

# SEC Cybersecurity Disclosure

## Applicability

Applies to public companies subject to SEC reporting requirements. Governs disclosure obligations for material cybersecurity incidents (Form 8-K) and annual cybersecurity risk management, strategy, and governance disclosures (Form 10-K). Rules adopted July 2023, effective December 2023.

## Key Requirements

### Material Incident Disclosure (Form 8-K, Item 1.05)

- **Trigger** / Determination that a cybersecurity incident is material / **Threshold**: Materiality standard — there is a substantial likelihood that a reasonable investor would consider the information important in making an investment decision; must assess both quantitative and qualitative factors / **Consequence**: Failure to timely disclose = Securities Act violations; SEC enforcement action; private securities litigation risk
- **Filing Deadline** / 4 business days after the company determines the incident is material (not 4 days after the incident occurs) / **Consequence**: Unreasonable delay in making materiality determination may itself violate disclosure obligations
- **Required Content** / Material aspects of: (1) nature, scope, and timing of the incident; (2) material impact or reasonably likely material impact on operations, financial condition, and results / **Consequence**: Must provide meaningful disclosure without compromising ongoing remediation; may omit specific technical details
- **National Security Delay** / US Attorney General may authorize delay if disclosure would pose substantial risk to national security or public safety / **Timeline**: Initial delay up to 30 days; may be extended up to 60 days; extraordinary circumstances up to 120 days (SEC approval required beyond 60) / **Consequence**: Must request delay from DOJ before filing deadline; company remains responsible for filing promptly when delay expires
- **Aggregation** / Series of individually immaterial incidents may be material in the aggregate; companies must assess cumulative impact / **Consequence**: Must maintain tracking of all cybersecurity incidents, not just major ones
- **Amendment Obligation** / Must amend Form 8-K if material information was unknown at the time of initial filing / **Consequence**: Ongoing monitoring and supplemental disclosure required

### Annual Disclosure (Form 10-K, Regulation S-K Item 106)

- **Risk Management and Strategy** / Must describe: (1) processes for assessing, identifying, and managing material risks from cybersecurity threats; (2) whether and how processes are integrated into overall risk management; (3) whether the company engages assessors, consultants, auditors, or other third parties; (4) whether the company has processes to oversee and identify risks from third-party service providers; (5) whether risks have materially affected or are reasonably likely to affect business strategy, results, or financial condition / **Consequence**: Boilerplate or generic disclosure may invite SEC comment letters and enforcement scrutiny
- **Governance** / Must describe: (1) board of directors' oversight of cybersecurity risks (committee, reporting frequency); (2) management's role in assessing and managing cybersecurity risks (responsible persons, expertise, reporting lines) / **Consequence**: Must disclose actual governance structure, not aspirational; investors and proxy advisors evaluate governance quality
- **CISO/Expert Disclosure** / Not required to disclose whether the company has a CISO or specific individuals' cybersecurity expertise; however, must describe management's role with sufficient specificity / **Consequence**: Market expectation increasingly favors CISO-level disclosure

### Materiality Standard

- **Quantitative Factors** / Financial impact: remediation costs, lost revenue, litigation costs, regulatory fines, insurance costs / **Threshold**: Traditional 5% of pre-tax income guideline; lower threshold for cyber incidents given qualitative significance / **Consequence**: Must quantify to extent known or reasonably estimable
- **Qualitative Factors** / Reputational harm, customer relationships, intellectual property loss, regulatory consequences, operational disruption, competitive position / **Consequence**: An incident causing minimal financial impact may still be material based on qualitative factors
- **Ongoing Assessment** / Materiality may not be determinable immediately; reasonable investigation required; cannot delay assessment indefinitely / **Consequence**: Must have process to promptly assess materiality; documentation of assessment process is critical

### Penalties and Enforcement

- **Securities Act Violations** / Failure to file timely or accurate 8-K or 10-K disclosure / **Consequence**: SEC enforcement action; civil penalties up to $1M per violation for companies; officer/director liability for materially false or misleading statements
- **Internal Controls** / Cybersecurity processes may be considered part of disclosure controls and procedures under SOX 302/906 / **Consequence**: CEO/CFO certifications extend to adequacy of cyber disclosure processes
- **Private Litigation** / Material misstatements or omissions regarding cybersecurity may give rise to 10b-5 claims / **Consequence**: Securities class action risk; increased D&O insurance costs

### Smaller Reporting Companies

- **Phase-In** / Smaller reporting companies had additional 180 days for initial 8-K compliance (until June 2024) / **Consequence**: All registrants now subject to same timelines
- **Scaled Disclosure** / No scaled disclosure for cybersecurity; same requirements apply regardless of filer status / **Consequence**: Smaller companies must implement same assessment and reporting processes

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): data breach notification obligations run parallel to SEC disclosure
- **Securities** (`securities/`): materiality standard, 10b-5 liability, insider trading (cannot trade on knowledge of undisclosed incident)
- Cross-reference: `state-breach-laws.md` for parallel state notification obligations
- Cross-reference: `incident-response.md` for integration of SEC disclosure into incident response plans

## Sources

- [SEC Final Rule: Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure (Release No. 33-11216)](https://www.sec.gov/rules/final/2023/33-11216.pdf)
- [SEC Regulation S-K Item 106](https://www.law.cornell.edu/cfr/text/17/229.106)
- [SEC Form 8-K Item 1.05](https://www.sec.gov/files/form8-k.pdf)
- [SEC Division of Corporation Finance — Cybersecurity Disclosure Guidance](https://www.sec.gov/corpfin/cybersecurity-disclosure-guidance)

---
## Security Standards

# Security Standards and Certifications

## Applicability

Applies to organizations seeking, maintaining, or contractually required to hold security certifications and audit reports. Covers SOC 2, ISO 27001, FedRAMP, and HITRUST — the primary commercial and government security frameworks used in vendor due diligence, procurement, and regulatory compliance.

## Key Requirements

### SOC 2 (Service Organization Control 2)

- **Scope** / AICPA framework for service organizations; assesses controls relevant to security, availability, processing integrity, confidentiality, and/or privacy (five Trust Services Criteria) / **Consequence**: Widely required in SaaS contracts, vendor assessments, and enterprise procurement; absence = disqualification from many enterprise deals
- **Type I vs. Type II** / Type I: point-in-time assessment of control design at a specific date; Type II: assessment of control design and operating effectiveness over a period (minimum 6 months, typically 12 months) / **Consequence**: Type II is the market standard; Type I accepted only for newly implemented controls or first-year audits
- **Five Trust Services Criteria** / (1) Security (common criteria — required for all SOC 2 reports); (2) Availability (uptime, disaster recovery); (3) Processing Integrity (completeness, accuracy); (4) Confidentiality (data protection); (5) Privacy (PII handling per AICPA privacy criteria) / **Consequence**: Security is mandatory; other criteria selected based on services and customer expectations
- **Report Distribution** / Restricted use report; distributed under NDA to customers and prospects / **Consequence**: Not publicly available; organization controls distribution; misuse of reports = breach of restricted use terms
- **Exceptions and Qualifications** / Auditor may note exceptions (control failures) or issue qualified/adverse opinion / **Threshold**: Material exceptions may result in qualified opinion; pervasive failures = adverse opinion / **Consequence**: Qualified or adverse opinion = customer concern; may be contractual breach; remediation expected before next audit period
- **Complementary User Entity Controls (CUECs)** / Controls the service organization expects the customer to implement / **Consequence**: Customer must implement CUECs for full control environment; failure = gap in security posture

### ISO/IEC 27001

- **Scope** / International standard for Information Security Management Systems (ISMS); published by ISO and IEC / **Consequence**: Globally recognized; required in many international contracts and government procurements
- **Certification Cycle** / 3-year certification cycle: (1) Stage 1 — documentation review; (2) Stage 2 — full audit; (3) Annual surveillance audits in years 2 and 3; (4) Recertification in year 3 / **Timeline**: Initial certification typically 3-6 months preparation + audit / **Consequence**: Lapsed certification = loss of status; must recertify
- **Annex A Controls** / 93 controls in 4 themes (ISO 27001:2022): Organizational (37), People (8), Physical (14), Technological (34) / **Consequence**: Statement of Applicability (SoA) documents which controls apply and justifies exclusions
- **Risk-Based Approach** / Must conduct formal risk assessment (ISO 27005 methodology recommended); controls selected based on identified risks / **Consequence**: Prescriptive control implementation without risk assessment = non-conformity
- **Continuous Improvement** / PDCA (Plan-Do-Check-Act) cycle; management review; internal audit required / **Consequence**: Surveillance audit findings must be addressed; failure to demonstrate improvement = non-conformity or certification suspension

### FedRAMP (Federal Risk and Authorization Management Program)

- **Scope** / Mandatory for cloud service providers (CSPs) offering services to federal agencies / **Consequence**: No FedRAMP authorization = cannot sell cloud services to federal government; growing adoption by state/local governments
- **Impact Levels** / (1) Li-SaaS (Low Impact SaaS — self-attestation for low-risk SaaS); (2) Low (categorized per FIPS 199); (3) Moderate (most common — approx. 325 controls from NIST 800-53); (4) High (highest sensitivity — approx. 420 controls) / **Consequence**: Impact level determines control baseline, assessment rigor, and cost
- **Authorization Paths** / (1) Agency Authorization (single agency sponsor); (2) Joint Authorization Board (JAB) — being replaced by FedRAMP Board under FedRAMP Authorization Act of 2022 / **Timeline**: Agency path: 6-12 months; JAB/Board path: 12-18 months / **Consequence**: Authorization requires 3PAO assessment; continuous monitoring thereafter
- **3PAO Assessment** / Third-Party Assessment Organization (accredited by A2LA) conducts independent security assessment / **Consequence**: 3PAO must be independent; assessment costs $200K-$1M+ depending on impact level and system complexity
- **Continuous Monitoring** / Monthly vulnerability scanning, annual assessment, ongoing POA&M management, significant change reporting / **Consequence**: Failure to maintain continuous monitoring = authorization revocation; agency must stop using service
- **FedRAMP Authorization Act (2022)** / Codified FedRAMP into law; established FedRAMP Board; presumption of adequacy for authorized CSPs across agencies / **Consequence**: Once authorized, other agencies can reuse authorization with limited additional review

### HITRUST CSF (Health Information Trust Alliance)

- **Scope** / Risk-based framework integrating requirements from HIPAA, NIST, ISO 27001, PCI-DSS, and other standards; predominantly used in healthcare / **Consequence**: Widely accepted by healthcare organizations as comprehensive security assessment; increasingly accepted by non-healthcare as integrated framework
- **Assessment Types** / (1) e1 (Essentials, 1-year) — 44 controls, verified assessment for lower-risk organizations; (2) i1 (Implemented, 1-year) — 182 controls, moderate assurance; (3) r2 (Risk-based, 2-year) — comprehensive, risk-based selection of controls / **Consequence**: r2 is gold standard; e1 and i1 provide stepping stones; some organizations require r2 specifically
- **Certification** / HITRUST reviews validated assessment report and issues certification / **Timeline**: Assessment: 2-4 months; HITRUST QA review: 4-8 weeks; total 4-8 months / **Consequence**: Certification demonstrates comprehensive compliance; valid for 1 year (e1/i1) or 2 years (r2) with interim assessment
- **Inheritance** / Controls can be inherited from cloud/hosting providers with HITRUST certification / **Consequence**: Reduces assessment scope; provider must maintain valid certification
- **Cost** / Assessment and certification costs $50K-$200K+ depending on scope and type / **Consequence**: Significant investment; but can satisfy multiple framework requirements simultaneously

### Contractual Considerations

- **Right to Audit** / Many contracts include customer right-to-audit clauses; SOC 2 or ISO 27001 reports often accepted in lieu of direct audit / **Consequence**: Negotiate report acceptance as alternative to on-site audit to reduce audit fatigue
- **Certification Requirements** / Contracts may require specific certifications; ensure alignment between contractual language and achievable certifications / **Consequence**: Mismatched requirements (e.g., requiring SOC 2 Type II before first audit year complete) = compliance gap
- **Subservice Organizations** / SOC 2 addresses subservice providers through carve-out (excluded from scope) or inclusive (included in scope) method / **Consequence**: Carve-out requires customer to assess subservice provider independently; inclusive provides more comprehensive assurance

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): SOC 2 Privacy criteria, ISO 27701 (privacy extension), HITRUST privacy controls
- **Financial Services** (`financial-services/`): PCI-DSS requirements may intersect; FFIEC expectations for vendor security
- Cross-reference: `nist-frameworks.md` for underlying NIST controls in FedRAMP and CMMC
- Cross-reference: `cmmc.md` for DoD-specific certification requirements

## Sources

- [AICPA SOC 2 Trust Services Criteria](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome)
- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [FedRAMP Authorization Act](https://www.fedramp.gov/)
- [HITRUST CSF](https://hitrustalliance.net/hitrust-csf/)

---
## State Breach Laws

# State Data Breach Notification Laws

## Applicability

Applies to any organization that owns, licenses, or maintains personal information of residents of any US state or territory. All 50 states, the District of Columbia, Guam, Puerto Rico, and the US Virgin Islands have enacted data breach notification laws. Triggers, timelines, and requirements vary significantly by jurisdiction.

## Key Requirements

### Trigger — Personal Information Definitions

- **Core Elements (Universal)** / First name or initial + last name combined with: Social Security number, driver's license/state ID number, financial account number with access code / **Consequence**: Breach of any core element triggers notification in virtually all states
- **Expanded Elements (Varies by State)** / Many states add: biometric data (IL, TX, WA, CA), medical/health information (CA, TX, MA), email + password credentials (CA, FL, OR), taxpayer ID, passport number, health insurance information / **Threshold**: Must analyze PI definition in each state where affected residents reside / **Consequence**: Broader definitions = more incidents trigger notification
- **Encryption Safe Harbor** / Most states exempt encrypted data if the encryption key was not also compromised / **Consequence**: Encrypted data breach may not trigger notification; but must demonstrate key was not accessed

### Notification Timelines

- **30 Days or Fewer** / Colorado (30 days), Florida (30 days), Washington (30 days) / **Consequence**: Among the most aggressive timelines; investigation and notification must be rapid
- **45 Days** / Ohio (45 days), Wisconsin (45 days), South Dakota (45 days) / **Consequence**: Moderate timeline; still requires prompt investigation
- **60 Days** / Connecticut (60 days), Maine (60 days), Texas (60 days), Vermont (60 days), Virginia (60 days) / **Consequence**: Most common middle-ground timeline
- **90 Days** / Maryland (45 days, up to 90 with AG extension) / **Consequence**: Extended timelines typically require justification
- **Most Expedient / Without Unreasonable Delay** / Many states (including New York, California, New Jersey) use "most expedient time possible" or "without unreasonable delay" standard / **Threshold**: Generally interpreted as 30-60 days; no bright-line rule / **Consequence**: Subjective standard invites regulatory scrutiny; document diligence
- **Law Enforcement Delay** / Most states permit delay if law enforcement determines notification would impede investigation / **Consequence**: Must obtain written request from law enforcement; delay is temporary

### Attorney General Notification

- **Threshold-Based AG Notice** / Many states require AG notification when breach affects a minimum number of residents: 500 (CA, ME, OR, VT, WA), 250 (IN, NC), 1,000 (NY, FL, IL, TX, MD) / **Timeline**: Same as or before individual notification / **Consequence**: Failure to notify AG = separate violation with additional penalties
- **Content of AG Notice** / Typically must include: nature of breach, types of information, number of affected residents, remediation steps, contact information, copy of notification letter / **Consequence**: Incomplete AG notice may trigger follow-up inquiry or enforcement action
- **No Threshold States** / Some states require AG notification for any breach regardless of number affected / **Consequence**: Must track AG notification requirements for each state

### Consumer Reporting Agency Notification

- **Threshold** / Most states require notification to consumer reporting agencies (CRAs) when breach affects 500-1,000+ residents of that state / **Consequence**: Failure to notify CRAs = separate violation; typically same timeline as individual notification

### Individual Notification Content

- **Required Elements (Typical)** / Description of the incident, types of information involved, steps taken to address, contact information for the organization, contact information for credit reporting agencies, recommendation to review financial statements / **Consequence**: Non-compliant notice = potential AG enforcement action; treated as if no notice provided
- **Credit Monitoring** / Some states require free credit monitoring or identity theft protection services (CT, CA, MA for SSN breaches; DE for SSN and financial account) / **Threshold**: 12-24 months typical required duration / **Consequence**: Failure to offer = separate violation; class action risk
- **Method of Notice** / Written notice (US mail) or electronic notice (if consistent with E-SIGN Act); substitute notice (website + media) permitted if cost exceeds $250K-$500K (varies) or affected class >250K-500K / **Consequence**: Must use compliant notice method for each state

### Private Right of Action

- **Limited States** / California (Civil Code 1798.150 — CCPA/CPRA private right of action: $100-$750 statutory damages per consumer per incident for failure to implement reasonable security), Massachusetts (93H), Louisiana / **Consequence**: Class action risk with statutory damages can be enormous; 1M affected consumers x $100 = $100M minimum
- **Most States** / No express private right of action in breach notification statute; but negligence, state consumer protection (UDAP), and breach of contract theories available / **Consequence**: Absence of statutory private right of action does not eliminate litigation risk

### Key State Variations

- **California** / Broadest PI definition; "most expedient time" timeline; private right of action under CCPA; must notify if encrypted data breached with key compromise / **Consequence**: Set national standard in many areas
- **New York** / SHIELD Act expanded PI definition (biometrics, email credentials); reasonable security requirement; AG enforcement; 250+ resident AG notification / **Consequence**: Imposes affirmative security program obligation beyond breach notification
- **Texas** / 60-day timeline; AG notification for 250+ residents; statutory penalties $100-$250K per violation / **Consequence**: AG actively enforces; significant penalty exposure
- **Illinois** / 500-resident AG threshold; BIPA intersection for biometric data (separate $1K-$5K per violation); no specific timeline (without unreasonable delay) / **Consequence**: Biometric breaches trigger both breach notification and BIPA obligations

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): state privacy laws (CCPA, CDPA, etc.) impose parallel obligations; breach notification is a subset of broader privacy compliance
- **Consumer Protection** (`consumer-protection/`): state UDAP statutes provide AG enforcement authority for breach-related unfair/deceptive practices
- Cross-reference: `data-privacy/breach-notification.md` for federal and international breach notification
- Cross-reference: `incident-response.md` for operational breach response procedures

## Sources

- [National Conference of State Legislatures — Security Breach Notification Laws](https://www.ncsl.org/technology-and-communication/security-breach-notification-laws)
- [California Civil Code 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82)
- [New York SHIELD Act (General Business Law 899-aa)](https://www.nysenate.gov/legislation/bills/2019/S5575)
- [IAPP US State Breach Notification Chart](https://iapp.org/resources/article/state-data-breach-notification-chart/)
