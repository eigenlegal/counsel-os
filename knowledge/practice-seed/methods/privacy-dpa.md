---
counsel-os-type: practice
content-version: "2026-04-08"
---
# Privacy / DPA Checklist

## GDPR Article 28 Compliance

### Must-Check (Tier 1)
- Processing only on documented instructions of the controller — Article 28(3)(a) requirement; absent this, vendor may process data for its own purposes
- Confidentiality obligations for all persons processing data — Article 28(3)(b); must cover employees and contractors
- Appropriate technical and organizational security measures — Article 28(3)(c); measures should be specified, not just referenced generically
- Sub-processor requirements: prior authorization, equivalent obligations, processor liability — Article 28(2)/(4); without these, controller loses oversight of downstream processing
- Assistance with data subject rights requests — Article 28(3)(e); processor must help controller respond within statutory deadlines
- Assistance with security, breach notification, DPIAs, and prior consultation — Article 28(3)(f); processor has affirmative assistance obligations
- Deletion or return of data upon termination — Article 28(3)(g); must specify format, timeline, and certification of deletion
- Audit rights for the controller — Article 28(3)(h); includes right to conduct or commission audits and inspections

### Should-Check (Tier 2)
- Processor shall inform controller if an instruction infringes GDPR
- Processing details documented (subject matter, duration, nature, purpose, categories of data, categories of data subjects)
- DPA is in writing (including electronic form)
- DPA incorporates standard contractual clauses where applicable

### Nice-to-Check (Tier 3)
- DPA references applicable codes of conduct or certifications
- Processor's data protection officer contact information included
- Record of processing activities maintained per Article 30

## Data Processing Details

### Must-Check (Tier 1)
- Categories of personal data clearly identified — ambiguity about what data is processed creates compliance gaps
- Categories of data subjects clearly identified — determines which rights apply and which notices are needed
- Purpose and legal basis for processing specified — processing without a clear legal basis violates Article 6
- Duration of processing aligned with retention requirements — indefinite processing without justification violates data minimization

### Should-Check (Tier 2)
- Special category data (Article 9) handling addressed
- Children's data handling addressed (if applicable)
- Data minimization principles reflected in processing scope
- Purpose limitation restrictions clearly stated

### Nice-to-Check (Tier 3)
- Data flow diagram or processing map attached
- Data inventory or register of processing activities referenced

## Sub-Processor Management

### Must-Check (Tier 1)
- General or specific prior written authorization for sub-processors — Article 28(2) requires one of these two approaches
- Current list of sub-processors provided with name, location, and processing activities — controller needs this for its own compliance records
- Advance notice of new sub-processors (at least 30 days) — provides time to assess and object before new processing begins
- Controller objection right with meaningful remedy (termination without penalty) — objection right without exit right is meaningless
- Sub-processor bound by equivalent data protection obligations — Article 28(4) requires flowing down the same obligations

### Should-Check (Tier 2)
- Processor remains fully liable for sub-processor acts and omissions
- Sub-processor list includes specific processing activities performed
- Mechanism for receiving sub-processor change notifications (email, not just website)
- Process for resolving objections in good faith before termination

### Nice-to-Check (Tier 3)
- Sub-processor due diligence requirements specified
- Sub-processor audit rights
- Sub-processor list update frequency

## International Data Transfers

### Must-Check (Tier 1)
- Transfer mechanism identified for each cross-border transfer (SCCs, adequacy, BCRs) — transfers without a valid mechanism violate Chapter V of GDPR
- Standard Contractual Clauses (2021 version) executed for EU-to-third-country transfers — old 2010 SCCs are no longer valid
- Correct SCC module selected (Module 1: C2C, Module 2: C2P, Module 3: P2P, Module 4: P2C) — incorrect module selection invalidates the SCCs
- Transfer impact assessment completed for transfers to countries without adequacy — Schrems II requires assessment of destination country surveillance laws

### Should-Check (Tier 2)
- Supplementary measures identified and implemented where required
- UK International Data Transfer Agreement or Addendum executed (for UK transfers)
- Swiss-specific transfer mechanisms in place (if applicable)
- Data importer obligations to notify of government access requests
- Data exporter's right to suspend transfers if protections are inadequate

### Nice-to-Check (Tier 3)
- Transfer impact assessment documented and available for supervisory authority review
- Encryption and pseudonymization as supplementary technical measures
- Transparency reporting from data importer

## Breach Notification

### Must-Check (Tier 1)
- Notification to controller "without undue delay" and within a specific timeframe (72 hours maximum) — GDPR requires controller to notify the supervisory authority within 72 hours of becoming aware
- Content of breach notification specified (nature, categories, approximate numbers, consequences, measures taken) — Article 33(3) requires specific content; vague notifications are insufficient
- Processor shall not notify regulators or data subjects without controller's authorization — controller owns the regulatory relationship and notification decision
- Cooperation with controller's investigation and response — processor often has the technical information needed for the controller's response

### Should-Check (Tier 2)
- Obligation to provide ongoing updates until incident is resolved
- Preservation of evidence and forensic data
- Obligation to assist with regulatory inquiries
- Remediation at processor's expense

### Nice-to-Check (Tier 3)
- Incident response plan testing and exercise requirements
- Post-incident root cause analysis with corrective action plan
- Breach notification template or playbook referenced

## Security Measures

### Must-Check (Tier 1)
- Specific technical measures identified (encryption, access controls, logging, network security) — generic "appropriate measures" without specifics are unverifiable
- Specific organizational measures identified (policies, training, background checks) — people are the most common vector for data breaches
- Measures appropriate to the risk level of the processing — Article 32 requires measures proportionate to the risk
- Vendor shall not materially decrease security during the Term — prevents vendor from degrading protections after execution

### Should-Check (Tier 2)
- Security certifications required (SOC 2 Type II, ISO 27001)
- Annual penetration testing requirement
- Vulnerability management program
- Incident detection and response capabilities
- Physical security measures (if data center access)

### Nice-to-Check (Tier 3)
- Security architecture documentation provided
- Employee security awareness training program
- Business continuity and disaster recovery capabilities
- Security metrics and reporting cadence

## Data Subject Rights

### Must-Check (Tier 1)
- Processor obligation to assist controller with data subject requests (access, rectification, erasure, portability, restriction, objection) — processor holds the data needed to fulfill requests
- Response timeline for processor assistance aligned with GDPR deadlines (controller has 30 days) — processor delays can cause controller to miss statutory deadlines
- Technical capability to fulfill requests (data extraction, deletion, restriction) — if the processor cannot technically fulfill requests, the DPA is meaningless

### Should-Check (Tier 2)
- Process for forwarding data subject requests received by processor
- Cost allocation for assistance (included or additional fee)
- Automated decision-making and profiling disclosures (if applicable)

### Nice-to-Check (Tier 3)
- Self-service data subject request tools available
- Data portability format specified
- Data subject complaint escalation process
