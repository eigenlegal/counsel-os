---
counsel-os-type: law-area
content-version: "2026-05-06"
---
## Breach Notification

# Breach Notification

## Applicability

This sub-file covers mandatory data breach notification requirements across jurisdictions. Load when:

- A contract contains breach notification clauses or incident response provisions.
- A data breach has occurred or is suspected, and notification obligations must be assessed.
- Incident response timelines are being negotiated in DPAs or service agreements.
- Cross-jurisdiction notification requirements must be harmonized (e.g., a breach affecting individuals in multiple countries/states).
- The matter involves breach response planning, tabletop exercises, or compliance program design.

## Key Requirements

### GDPR (EU/EEA) — Articles 33-34

- **Notification to supervisory authority (Art. 33):** Within **72 hours** of the controller becoming aware of the breach. If notification is delayed beyond 72 hours, the controller must provide reasons for the delay. Notification must include: nature of the breach, categories and approximate numbers of data subjects and records, DPO contact details, likely consequences, and remedial measures.
- **Notification to data subjects (Art. 34):** Without undue delay when the breach is likely to result in a **high risk** to rights and freedoms. Not required if: (a) effective encryption or other measures render data unintelligible; (b) controller has taken subsequent measures eliminating the high risk; or (c) individual notification would require disproportionate effort (in which case public communication is required).
- **Processor obligation:** Must notify the controller **without undue delay** after becoming aware. No independent obligation to notify the supervisory authority.
- **"Becoming aware" standard:** The EDPB interprets this as when the controller has a reasonable degree of certainty that a breach has occurred — not when all details are known.
- **Consequence:** Failure to notify — fine up to **EUR 10 million or 2% of global annual turnover** (Art. 83(4)). Failure to notify can be an independent violation even if the underlying breach had minimal impact.

### UK GDPR — Articles 33-34

- **Timeline:** Same **72-hour** notification to the ICO. Substantially identical to EU GDPR requirements.
- **Reporting portal:** Breaches reported through the ICO's online portal. Preliminary notification accepted if full details are not yet available.
- **Consequence:** Fines up to **GBP 8.7 million or 2% of global turnover** (standard maximum) or **GBP 17.5 million or 4% of global turnover** (higher maximum).

### CCPA (California) — Section 1798.150

- **Notification to consumers:** "In the most expedient time possible and without unreasonable delay" — no specific hour/day deadline in the CCPA itself. California's general breach notification statute (Cal. Civ. Code 1798.29, 1798.82) governs timing.
- **California breach notification statute:** Notification required to affected California residents when unencrypted personal information (name plus SSN, driver's license, financial account, medical information, health insurance information, or unique biometric data) is acquired by an unauthorized person. If breach affects **more than 500 California residents**, substitute notice must also be provided to the California AG.
- **Timeline:** "In the most expedient time possible and without unreasonable delay" — California does not specify a numeric deadline. In practice, the AG has scrutinized delays beyond **30-45 days**.
- **Private right of action (CCPA 1798.150):** Consumers may bring private claims for data breaches involving unauthorized access, theft, or disclosure of nonencrypted/nonredacted personal information due to failure to maintain reasonable security. Statutory damages of **$100-$750 per consumer per incident**.
- **Consequence:** AG enforcement plus private right of action. No cap on aggregate damages in class actions.

### HIPAA — 45 C.F.R. 164.400-414

- **Notification to individuals:** Without unreasonable delay and no later than **60 days** after discovery of the breach of unsecured protected health information (PHI).
- **Notification to HHS:** If breach affects **500+ individuals**, notify HHS **contemporaneously** with individual notice (within 60 days). For breaches affecting fewer than 500, annual log submission to HHS no later than **60 days after the end of the calendar year**.
- **Media notice:** If breach affects **500+ residents** of a single state or jurisdiction, prominent media notice is required in addition to individual notification.
- **Business associate obligation:** Must notify the covered entity within **60 days** of discovery (or a shorter contractual timeline). The covered entity bears the ultimate notification obligation.
- **"Discovery" standard:** A breach is "discovered" when the covered entity or business associate first knows or should have known by exercising reasonable diligence.
- **Exception:** Notification not required if a risk assessment demonstrates a **low probability** that the PHI has been compromised (considering: nature and extent of PHI, unauthorized person who accessed it, whether PHI was actually acquired or viewed, and extent of mitigation).
- **Consequence:** Civil penalties of **$100 to $50,000 per violation**, with annual caps of **$25,000 to $1.5 million** per violation category per year. Criminal penalties of up to **$250,000 and 10 years imprisonment** for intentional violations.

### US State Breach Notification Laws

All 50 states, DC, and US territories have breach notification statutes. Key variations:

| Jurisdiction | Timeline | AG Notification Threshold | Notable Features |
|-------------|----------|--------------------------|-------------------|
| **California** | Most expedient time / no unreasonable delay | 500+ residents | Private right of action under CCPA for reasonable security failures |
| **New York** | Most expeditious time / no unreasonable delay | Any number of NY residents | SHIELD Act requires reasonable security; broadened PI definition |
| **Florida** | **30 days** after determination of breach | 500+ residents | Among the strictest numerical deadlines |
| **Texas** | **60 days** after determination of breach | 250+ residents | Lower AG notification threshold |
| **Colorado** | **30 days** after determination of breach | 500+ residents | 30-day hard deadline |
| **Connecticut** | **60 days** after discovery | Any number of CT residents | AG notification for any number of affected residents |
| **Oregon** | **45 days** after discovery | 250+ residents | Lower AG notification threshold |
| **Virginia** | Without unreasonable delay | 1,000+ residents | AG and consumer reporting agencies |
| **Illinois** | Most expedient time / no unreasonable delay | Any number of IL residents | BIPA private right of action for biometric data breaches |
| **Massachusetts** | As soon as practicable / without unreasonable delay | Any number of MA residents | Must also notify AG concurrently with affected individuals |
| **Washington** | **30 days** after discovery | 500+ residents | AG notification within 30 days |

- **Trigger:** Most states define "breach" as unauthorized acquisition of unencrypted computerized personal information that compromises security, confidentiality, or integrity. Definitions of "personal information" vary but typically include name plus SSN, driver's license, financial account number, or login credentials.
- **Safe harbor for encryption:** Most states exempt encrypted data from notification requirements if the encryption key is not also compromised.
- **Content requirements:** Most states require notice to include: description of the incident, type of information affected, steps taken, contact information, and recommended protective actions. Some states mandate free credit monitoring for SSN breaches.

### International Breach Notification Timelines

| Jurisdiction | Authority Notification | Individual Notification | Threshold |
|-------------|----------------------|------------------------|-----------|
| **EU/EEA (GDPR)** | **72 hours** | Without undue delay (high risk) | Any personal data breach |
| **UK (UK GDPR)** | **72 hours** | Without undue delay (high risk) | Any personal data breach |
| **Canada (PIPEDA)** | As soon as feasible | As soon as feasible | Real risk of significant harm |
| **Canada (Quebec Law 25)** | With diligence | With diligence | Risk of serious injury |
| **Brazil (LGPD)** | Reasonable timeframe (2 business days recommended) | Reasonable timeframe | Relevant risk or damage |
| **Singapore (PDPA)** | **3 calendar days** (after assessment) | As soon as practicable | Significant harm or 500+ individuals |
| **Australia** | As soon as practicable | As soon as practicable | Likely serious harm |
| **Japan (APPI)** | Promptly (preliminary) + **30 days** (full) | Promptly | Sensitive PI, property damage, wrongful intent, or 1,000+ individuals |
| **South Korea (PIPA)** | Without delay | Without delay | 1,000+ individuals or sensitive/unique ID information |
| **China (PIPL)** | Immediately | Immediately | Any breach or likely breach |
| **India (DPDP Act)** | To be specified in rules | To be specified in rules | Any personal data breach |

### Cross-Jurisdiction Breach Response Principles

When a breach affects individuals in multiple jurisdictions simultaneously:

- **Apply the shortest timeline:** If GDPR (72 hours), state law (30 days), and HIPAA (60 days) all apply, the 72-hour GDPR timeline controls for the initial regulatory notification. Begin individual notifications in parallel according to each jurisdiction's rules.
- **Multi-state US breaches:** Notify the AG of every state where affected residents reside and where the state law requires AG notification at the applicable threshold. A single breach may require notifications to 15+ state AGs.
- **Document everything:** Maintain a detailed breach log from the moment of discovery, including timestamps for awareness, assessment, decision-making, and notifications. This record is essential for demonstrating good-faith compliance with varying "reasonableness" standards.
- **Coordinate processor/controller notifications:** Contractual breach notification timelines between processors and controllers should be shorter than the shortest regulatory deadline to allow the controller adequate time to assess, prepare, and file regulatory notifications.
- **Content harmonization:** Where different jurisdictions require different notification content, prepare a comprehensive notification that satisfies the most demanding requirements and adapt for each jurisdiction's specific format or submission portal.
- **Credit monitoring obligations:** Several US states require businesses to offer **free credit monitoring** (typically 12-24 months) when a breach involves Social Security numbers. This obligation varies by state and should be assessed as part of breach response cost planning.

### Breach Record-Keeping Requirements

- **GDPR (Art. 33(5)):** Controllers must document all personal data breaches, regardless of whether notification was required. Documentation must include the facts relating to the breach, its effects, and the remedial action taken. This record must be sufficient to allow the supervisory authority to verify compliance.
- **Canada (PIPEDA):** Organizations must maintain a record of **every breach** of security safeguards involving personal information for a period of **24 months** after the breach. The Privacy Commissioner may request access to these records.
- **US State laws:** Several states require businesses to maintain breach logs or records. Even where not explicitly required, maintaining detailed breach records is a best practice for demonstrating compliance with "reasonableness" and "without unreasonable delay" standards.
- **HIPAA:** Covered entities and business associates must maintain documentation of breaches and notifications for **6 years** from the date of creation or the date when the documentation was last in effect.

### Financial Sector Breach Notification Tiers

Financial institutions face a cascade of notification obligations with compressed timelines. These are separate from and additional to state consumer breach notification:

| Timeline | Obligation | Authority | Trigger |
|----------|-----------|-----------|---------|
| **ASAP** | Notify bank partner(s) | Contractual / 12 C.F.R. Part 53 | Computer-security incident materially disrupting covered services for 4+ hours (bank service providers) |
| **24 hours** | Notify card networks | Visa/Mastercard operating rules | Suspected compromise of payment card data (PAN, track data, CVV) |
| **24 hours** | Report ransom payment | NY DFS 23 NYCRR 500.17(b) | Making any extortion/ransom payment |
| **24 hours** | Report ransom payment | CISA (CIRCIA, once effective) | Making any ransom payment related to a covered cyber incident |
| **36 hours** | Notify primary federal regulator | OCC/Fed/FDIC Joint Rule (2022) | "Notification incident" — material disruption to banking operations, business lines, or financial stability |
| **72 hours** | Notify NY DFS Superintendent | 23 NYCRR 500.17(a) | Cybersecurity event requiring notification to any government body OR reasonably likely to materially harm operations |
| **72 hours** | Notify EU supervisory authority | GDPR Art. 33 | Personal data breach (unless unlikely to result in risk to data subjects) |
| **72 hours** | Notify CISA | CIRCIA (once final rule effective) | Covered cyber incident at a critical infrastructure entity |

**Breach triage decision tree for a fintech:**
1. **Hour 0-4:** Activate incident response plan. Determine scope: does it involve payment card data? Banking systems? EU personal data? Engage legal counsel and cyber insurance carrier (check policy notice window — typically 48-72 hours).
2. **Hour 4-24:** If payment card data compromised → notify acquiring bank and card networks. If ransom payment made or contemplated → prepare NY DFS and CISA notifications. Notify bank partners if you are a bank service provider.
3. **Hour 24-36:** If the incident materially disrupts banking operations → file federal regulator notification (OCC/Fed/FDIC). This is a brief alert, not a detailed report.
4. **Hour 36-72:** If NY DFS-licensed → file NY DFS notification. If GDPR applies → file supervisory authority notification (or document why notification is not required). If CIRCIA applies → file CISA notification.
5. **Day 3-30:** Prepare state AG notifications (per `us-breach-notification-50-state.md`). Prepare consumer notifications. Complete SEC Reg S-P individual notifications (if applicable, 30-day deadline). Begin credit monitoring arrangements.

See `financial-sector-privacy-regulators.md` for detailed requirements of each financial regulator's notification regime.

### CIRCIA — Cyber Incident Reporting for Critical Infrastructure

- **Authority:** Cyber Incident Reporting for Critical Infrastructure Act of 2022. CISA NPRM published April 2024; final rule expected 2025-2026.
- **Scope:** Covered entities in designated critical infrastructure sectors, including financial services. Size and significance thresholds defined in the proposed rule.
- **Requirements (proposed):** Report covered cyber incidents to CISA within **72 hours** of reasonable belief. Report ransom payments within **24 hours**. Submit supplemental reports for materially new information.
- **Current status:** Voluntary until final rule is effective. Many financial sector entities already report voluntarily under existing CISA programs.
- **Relationship to other obligations:** CIRCIA includes provisions for satisfying the requirement through reports to other federal agencies (potential harmonization with banking regulator notifications).
- **Source:** [CISA CIRCIA Page](https://www.cisa.gov/topics/cyber-threats-and-advisories/information-sharing/cyber-incident-reporting-critical-infrastructure-act-2022-circia)

### 50-State Reference

For complete state-by-state breach notification requirements (all 50 states + DC + territories) including trigger definitions, timelines, AG notification thresholds, credit monitoring obligations, risk of harm exemptions, and encryption safe harbors, see `us-breach-notification-50-state.md`.

### Insurance and Cost Considerations

- **Average breach cost:** The cost of a data breach varies by jurisdiction, industry, and scale. Breach response costs include investigation, notification, credit monitoring, legal fees, regulatory fines, and reputational damage. US healthcare breaches consistently rank among the most expensive.
- **Cyber insurance:** Breach notification timelines in DPAs and service agreements should be coordinated with cyber insurance policy requirements. Many policies require notice to the insurer within **48-72 hours** of discovery to preserve coverage. Late notice to the insurer may jeopardize coverage even if regulatory timelines are met.
- **Regulatory cooperation:** Demonstrating prompt, thorough notification and remediation is a mitigating factor in enforcement actions across all jurisdictions. GDPR supervisory authorities explicitly consider the controller's cooperation and notification timeliness in determining fines.

## Interaction with Other Areas

- **Financial Services:** GLBA Safeguards Rule and banking regulators impose sector-specific notification requirements. See `financial-sector-privacy-regulators.md` for full details on OCC/Fed/FDIC 36-hour rule, NY DFS 72-hour rule, card network 24-hour notification, and CIRCIA.
- **Data Privacy (50-State Breach):** Complete state-by-state reference. See `us-breach-notification-50-state.md`.
- **Data Privacy (GLBA):** GLBA Safeguards Rule incident response program requirements. See `glba-privacy.md`.
- **Consumer Protection:** State AG enforcement of breach notification statutes overlaps with consumer protection authority. AGs frequently pursue both breach notification violations and unfair/deceptive practices claims arising from the same incident.
- **Employment:** Employee data breaches trigger notification obligations under both general breach notification statutes and, in some jurisdictions, specific employee notification requirements. HIPAA applies to employee health plan data.
- **Data Privacy (GDPR, CCPA):** Breach notification obligations under GDPR and state laws are independent of, and additional to, any contractual notification obligations in DPAs. Contractual timelines must be at least as fast as regulatory timelines.

## Sources

- [GDPR Articles 33-34 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — EU breach notification provisions
- [EDPB Guidelines 9/2022 on Personal Data Breach Notification](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en) — Authoritative guidance on breach notification under GDPR
- [HIPAA Breach Notification Rule — eCFR](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-D) — 45 C.F.R. Part 164, Subpart D
- [California Breach Notification Statute — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.29.&lawCode=CIV) — Cal. Civ. Code 1798.29, 1798.82
- [IAPP US State Data Breach Notification Chart](https://iapp.org/resources/article/state-data-breach-notification-chart/) — Comprehensive 50-state comparison
