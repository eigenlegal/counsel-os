## Overview

# Data Privacy

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** personal data, personal information, PII, personally identifiable information, data processing, data controller, data processor, data subject, data protection, privacy policy, privacy notice, consent management, data breach, data retention, data deletion, right to erasure, opt-out, opt-in, cookies, tracking, cross-border data transfer, standard contractual clauses, SCCs, binding corporate rules, data protection officer, DPO, data protection impact assessment, DPIA, data mapping, data inventory, de-identification, anonymization, pseudonymization, behavioral advertising, targeted advertising, biometric data, geolocation data, sensitive personal data, special categories of data, data minimization, purpose limitation, lawful basis, legitimate interest, consumer health data, children's data, COPPA, student data, FERPA, parental consent, age verification, breach notification, data portability, data subject access request, DSAR, cross-context behavioral advertising, global privacy control, GPC, transfer impact assessment, TIA, adequacy decision, sub-processor
**Clause types:** data processing agreement (DPA), data protection addendum, privacy provisions, confidentiality and data handling clauses, data sharing agreements, joint controller agreements, sub-processor clauses, data transfer mechanisms, data breach notification clauses, data retention schedules, data subject access request procedures, consent mechanisms, cookie policies, parental consent provisions, age-gating provisions
**Regulatory references:** GDPR, General Data Protection Regulation, CCPA, California Consumer Privacy Act, CPRA, California Privacy Rights Act, VCDPA, CPA (Colorado Privacy Act), CTDPA, HIPAA, FERPA, COPPA, GLBA, PIPEDA, LGPD, POPIA, PDPA, UK GDPR, UK Data Protection Act 2018, ePrivacy Directive, Privacy Shield, EU-US Data Privacy Framework, APEC CBPR, PIPL, APPI, PIPA, DPDPA, Law 25 (Quebec)
**Relationship patterns:** vendor/service provider handling personal data, SaaS platforms processing user data, adtech or martech agreements, employer-employee data collection, consumer-facing products, cross-border data sharing, B2B data partnerships, analytics providers, cloud service agreements, platforms directed to children, ed-tech providers

## Sub-File Loading

| Sub-File | Load When |
|----------|-----------|
| `gdpr.md` | Parties are in the EU/EEA, data subjects are EU residents, UK GDPR applies, or GDPR is referenced explicitly |
| `ccpa-cpra.md` | California residents' data is involved, "sale" or "sharing" of personal information is discussed, or CCPA/CPRA is referenced |
| `us-state-privacy.md` | Company operates in or targets residents of Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana, Iowa, Indiana, Tennessee, or other states with comprehensive privacy laws |
| `international.md` | Parties or data subjects are in Canada, Brazil, Singapore, Australia, Japan, South Korea, India, China, or other non-US/EU jurisdictions |
| `coppa.md` | Product or service is directed to children under 13, collects data from children, or involves age verification or parental consent |
| `consent-mechanics.md` | Agreement addresses consent collection, cookie consent, opt-in/opt-out mechanisms, consent withdrawal, or granular consent for multiple processing purposes |
| `breach-notification.md` | Agreement contains breach notification clauses, incident response provisions, or regulatory notification timelines |
| `cross-border-transfers.md` | Data flows across national borders, SCCs or BCRs are referenced, adequacy decisions are relied on, or Transfer Impact Assessments are required |
| `data-subject-rights.md` | Agreement addresses consumer/data subject request handling, access rights, deletion rights, portability, or objection mechanisms |
| `data-processing-agreements.md` | A DPA, data protection addendum, or service provider agreement governing personal data processing is being drafted or reviewed |

**Cross-area loading:** If HIPAA applies (healthcare data, covered entity, business associate) → also load `healthcare/hipaa-compliance.md` if available, and flag HIPAA-GDPR interaction if EU health data is involved. If GLBA applies (financial institution data) → also load `financial-services/compliance-licensing.md`. If FERPA applies (student education records) → flag FERPA-COPPA interaction for ed-tech platforms.

## Quick Reference

- **gdpr.md** — EU/EEA data protection: lawful basis, DPAs, DPIAs, 72-hour breach notification, cross-border transfer mechanisms
- **ccpa-cpra.md** — California privacy: $25M/100K thresholds, sale vs. sharing, consumer rights with 45-day response, service provider contracts
- **us-state-privacy.md** — State-by-state comparison: scope thresholds, consumer rights, enforcement models, sensitive data definitions
- **international.md** — Global privacy laws: PIPEDA, LGPD, PDPA, PIPL, APPs, APPI, PIPA, DPDPA with breach timelines and transfer mechanisms
- **coppa.md** — Children's data: under-13 threshold, verifiable parental consent, operator obligations, FTC enforcement
- **consent-mechanics.md** — Consent requirements across jurisdictions: freely given, specific, informed, granular, withdrawal rights
- **breach-notification.md** — Cross-jurisdiction breach timelines: GDPR 72 hours, HIPAA 60 days, state-by-state AG notification thresholds
- **cross-border-transfers.md** — Transfer mechanisms: SCCs (2021), adequacy decisions, Schrems II supplementary measures, TIAs, APEC CBPR
- **data-subject-rights.md** — Rights by jurisdiction: access, deletion, portability, objection with response timelines and exceptions
- **data-processing-agreements.md** — Mandatory DPA clauses: GDPR Art. 28, CCPA service provider requirements, state-law DPA provisions

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

### Insurance and Cost Considerations

- **Average breach cost:** The cost of a data breach varies by jurisdiction, industry, and scale. Breach response costs include investigation, notification, credit monitoring, legal fees, regulatory fines, and reputational damage. US healthcare breaches consistently rank among the most expensive.
- **Cyber insurance:** Breach notification timelines in DPAs and service agreements should be coordinated with cyber insurance policy requirements. Many policies require notice to the insurer within **48-72 hours** of discovery to preserve coverage. Late notice to the insurer may jeopardize coverage even if regulatory timelines are met.
- **Regulatory cooperation:** Demonstrating prompt, thorough notification and remediation is a mitigating factor in enforcement actions across all jurisdictions. GDPR supervisory authorities explicitly consider the controller's cooperation and notification timeliness in determining fines.

## Interaction with Other Areas

- **Financial Services:** GLBA Safeguards Rule and banking regulators (OCC, FDIC, Fed) impose sector-specific breach notification requirements for financial institutions. Computer security incidents affecting banking organizations require notification to the appropriate federal banking agency within **36 hours** (2022 OCC/Fed/FDIC rule). These are independent of and additional to state breach notification laws.
- **Consumer Protection:** State AG enforcement of breach notification statutes overlaps with consumer protection authority. AGs frequently pursue both breach notification violations and unfair/deceptive practices claims arising from the same incident.
- **Employment:** Employee data breaches trigger notification obligations under both general breach notification statutes and, in some jurisdictions, specific employee notification requirements. HIPAA applies to employee health plan data.
- **Data Privacy (GDPR, CCPA):** Breach notification obligations under GDPR and state laws are independent of, and additional to, any contractual notification obligations in DPAs. Contractual timelines must be at least as fast as regulatory timelines.

## Sources

- [GDPR Articles 33-34 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — EU breach notification provisions
- [EDPB Guidelines 9/2022 on Personal Data Breach Notification](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en) — Authoritative guidance on breach notification under GDPR
- [HIPAA Breach Notification Rule — eCFR](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-D) — 45 C.F.R. Part 164, Subpart D
- [California Breach Notification Statute — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.29.&lawCode=CIV) — Cal. Civ. Code 1798.29, 1798.82
- [IAPP US State Data Breach Notification Chart](https://iapp.org/resources/article/state-data-breach-notification-chart/) — Comprehensive 50-state comparison

---
## Ccpa Cpra

# CCPA/CPRA (California Consumer Privacy Act / California Privacy Rights Act)

## Applicability

The California Consumer Privacy Act (Cal. Civ. Code 1798.100 et seq.), as amended by the California Privacy Rights Act (Proposition 24, effective January 1, 2023), applies to **for-profit entities** doing business in California that meet ANY of the following thresholds:

- **(a)** Annual gross revenue exceeding **$25 million** (adjusted for inflation by the CPPA) in the preceding calendar year.
- **(b)** Annually buys, sells, or shares the personal information of **100,000 or more** California residents, households, or devices.
- **(c)** Derives **50% or more** of annual revenue from selling or sharing consumers' personal information.

**Exemptions:** Non-profit entities are exempt. HIPAA-covered entities are exempt for PHI governed by HIPAA. GLBA-covered financial institutions are exempt at the data level (not entity level) for data governed by GLBA. Employee and B2B data exemptions expired January 1, 2023 under CPRA.

**Enforcement:** California Attorney General and the California Privacy Protection Agency (CPPA). The CPPA has rulemaking, investigative, and enforcement authority. Civil penalties up to **$2,500 per violation** (unintentional) or **$7,500 per intentional violation** or violation involving minors' data.

**Private right of action (Section 1798.150):** Limited to data breaches involving unauthorized access, theft, or disclosure of nonencrypted and nonredacted personal information resulting from a business's failure to implement and maintain reasonable security procedures. Statutory damages of **$100 to $750 per consumer per incident**, or actual damages, whichever is greater.

## Key Requirements

### Definitions: Sale vs. Sharing vs. Business Purpose Disclosure

Understanding these distinctions is critical for contract structuring:

- **Sale** (Section 1798.140(ad)): Selling, renting, releasing, disclosing, disseminating, making available, transferring, or otherwise communicating a consumer's personal information to a third party **for monetary or other valuable consideration**. Includes data exchanges where the business receives a benefit (e.g., improved analytics, audience matching).
- **Sharing** (Section 1798.140(ah)): Communicating a consumer's personal information to a third party for **cross-context behavioral advertising**, whether or not for monetary consideration. This captures most adtech, retargeting, and behavioral advertising data flows even where no money changes hands.
- **Business purpose disclosure** (Section 1798.140(e)): Disclosing personal information to a service provider or contractor for a disclosed business purpose under a written contract that restricts use. Not a "sale" or "sharing" if the contractual restrictions are in place.
- **Consequence:** Misclassifying a "sale" or "sharing" as a business purpose disclosure means the business has failed to provide required opt-out rights — a per-consumer, per-incident violation.

### Service Provider vs. Contractor vs. Third Party

- **Service provider** (Section 1798.140(ag)): Processes personal information on behalf of the business pursuant to a written contract that prohibits retaining, using, or disclosing the information for any purpose other than performing the contracted services. Must not sell or share the information. Must comply with the CCPA. Must notify the business if it can no longer meet its CCPA obligations.
- **Contractor** (Section 1798.140(j)): Similar to service provider but must additionally **certify** that it understands the CCPA/CPRA restrictions and will comply. CPRA imposes this as a distinct category with certification requirements.
- **Third party** (Section 1798.140(ai)): Any person that is not the business collecting the information, a service provider, or a contractor. Receipt of personal information by a third party may constitute a "sale" or "sharing" requiring opt-out rights.
- **Consequence:** Contracts that fail to include required restrictive language render the recipient a "third party," potentially converting every disclosure into an unauthorized sale or sharing.

### Consumer Rights and Response Timelines

All rights apply to California residents (defined as "consumers"):

- **Right to know/access (Section 1798.100, 1798.110):** Consumers can request categories and specific pieces of personal information collected. Business must respond within **45 days** of receiving a verifiable request, extendable by an additional **45 days** (90 total) with notice. Must cover the 12-month period preceding the request. Under CPRA, consumers may request information beyond the 12-month lookback if the business held the data at that point.
- **Right to delete (Section 1798.105):** Consumers can request deletion of personal information. Business must respond within **45 days**, extendable to **90 days**. Must direct service providers and contractors to delete. Subject to 9 enumerated exceptions (e.g., complete a transaction, detect security incidents, comply with legal obligation, internal uses reasonably aligned with consumer expectations).
- **Right to correct (Section 1798.106):** CPRA addition. Consumers can request correction of inaccurate personal information, taking into account the nature and purposes of processing. Business must respond within **45 days**, extendable to **90 days**. Must direct service providers and contractors to correct.
- **Right to opt out of sale/sharing (Section 1798.120):** Business must provide a clear "Do Not Sell or Share My Personal Information" link. Must honor opt-out requests, including **Global Privacy Control (GPC)** and similar user-enabled opt-out preference signals. Must wait **at least 12 months** before requesting that a consumer who has opted out authorize the sale or sharing again.
- **Right to limit use of sensitive personal information (Section 1798.121):** CPRA addition. Consumers can direct the business to limit use and disclosure of sensitive PI to purposes necessary to perform the services or provide the goods reasonably expected by an average consumer. Sensitive PI includes SSN, financial account details, precise geolocation, racial/ethnic origin, religious beliefs, union membership, mail/email/text content (unless directed to the business), genetic data, biometric data, health data, and sex life/orientation data.
- **Right to non-discrimination (Section 1798.125):** Business cannot discriminate against consumers for exercising CCPA rights. Financial incentive programs are permitted with clear notice and opt-in consent.

### Privacy Notice Requirements (Section 1798.100(a), 1798.130)

At or before the point of collection, businesses must disclose:
- Categories of personal information collected and the purposes for each category.
- Whether the business sells or shares personal information, and the categories sold/shared.
- **Retention periods** for each category of personal information, or the criteria used to determine retention (CPRA addition).
- Consumer rights and how to exercise them.
- **Consequence:** Failure to provide adequate notice is a per-consumer violation. CPPA enforcement actions have specifically targeted inadequate privacy notices.

### Data Minimization (Section 1798.100(c))

CPRA addition: Collection, use, retention, and sharing of personal information must be **reasonably necessary and proportionate** to the purposes for which it was collected or another disclosed, compatible purpose. Businesses may not retain personal information longer than reasonably necessary for each disclosed purpose.

### Minors' Personal Information (Section 1798.120(c)-(d))

- Businesses with actual knowledge that a consumer is under **16** must obtain **affirmative authorization** (opt-in) before selling or sharing their personal information.
- For consumers under **13**, opt-in consent must come from the consumer's parent or guardian.
- **Consequence:** Violations involving minors' data carry treble penalties — **$7,500 per violation** rather than the standard $2,500.

### Reasonable Security (Section 1798.150)

While CCPA does not prescribe specific security measures, the private right of action for data breaches requires businesses to **implement and maintain reasonable security procedures and practices** appropriate to the nature of the personal information. The California AG has pointed to the CIS Critical Security Controls as a baseline for "reasonable security."

### Automated Decision-Making Technology (CPRA Section 1798.185(a)(16))

- **What:** The CPRA directs the CPPA to issue regulations governing businesses' use of automated decision-making technology, including profiling, particularly regarding decisions that produce legal or similarly significant effects on consumers.
- **Requirements (per CPPA rulemaking):** Businesses must provide consumers with information about the logic involved in automated decision-making processes, the intended output, and the right to opt out of automated decision-making for significant decisions. Pre-decision notice and access to information about the decision are required.
- **Consequence:** Violations enforced by the CPPA with standard penalty authority — **$2,500 per unintentional violation, $7,500 per intentional violation**.

### Cybersecurity Audits and Risk Assessments (CPRA Section 1798.185(a)(15))

- **What:** The CPPA is directed to issue regulations requiring businesses whose processing presents significant risk to consumer privacy or security to (a) perform annual **cybersecurity audits** and (b) submit regular **risk assessments** to the CPPA regarding their processing of personal information.
- **Threshold:** Applies to businesses whose processing of personal information presents "significant risk to consumers' privacy or security" — criteria defined by CPPA regulations.
- **Consequence:** Failure to perform required audits or submit risk assessments is an independent violation subject to CPPA enforcement.

### Data Broker Registration (Cal. Civ. Code 1798.99.80 et seq.)

- **What:** A "data broker" is a business that knowingly collects and sells the personal information of consumers with whom the business does not have a direct relationship. Data brokers must register with the CPPA annually.
- **Delete My Data:** The California Delete Act (SB 362, 2023) requires the CPPA to establish an accessible mechanism by **January 1, 2026** allowing consumers to submit a single verified request to all registered data brokers to delete their personal information.
- **Registration fee:** Annual fee determined by the CPPA.
- **Consequence:** Failure to register — **$200 per day** of violation. Penalties for failure to comply with delete requests assessed under standard CCPA enforcement.

### Response to Consumer Requests — Practical Requirements

- **Verification:** Businesses must verify the identity of consumers making requests. For requests to know specific pieces of personal information or requests to delete, businesses must verify to a **reasonably high degree of certainty** (matching at least 3 data points). For requests to know categories, verification to a **reasonable degree of certainty** (matching at least 2 data points) is sufficient.
- **Authorized agents:** Consumers may use an authorized agent. The business may require the agent to provide a signed, written authorization. For requests where the agent does not provide a power of attorney, the business may verify the consumer's identity directly.
- **Household requests:** Businesses must respond to household-level requests if all members of the household jointly request and the business can verify all members and their association.
- **Free of charge:** Businesses must fulfill requests free of charge. Businesses may charge a reasonable fee or refuse to act only if requests are **manifestly unfounded or excessive**, particularly if repetitive.

## Interaction with Other Areas

- **Data Privacy (GDPR):** Companies subject to both must harmonize data processing agreements, privacy notices, and rights fulfillment processes. GDPR's DPA and CCPA's service provider agreement can be combined but must satisfy both regimes. GDPR consent does not satisfy CCPA opt-out requirements (different mechanisms).
- **Consumer Protection:** CCPA's private right of action for data breaches intersects with broader consumer protection statutes. FTC enforcement on data security overlaps with CCPA reasonable security requirements. California's Unfair Competition Law (Bus. & Prof. Code 17200) provides an independent enforcement vehicle.
- **Employment:** CCPA applies to employee and job applicant personal information (post-exemption expiration January 1, 2023). HR data handling must comply with notice, access, deletion, and correction rights. Employee monitoring data is personal information.
- **IP and Technology:** SaaS and technology vendor agreements must address CCPA service provider requirements, including restrictions on using customer data for product improvement, model training, or cross-customer analytics. These uses may constitute "sale" or "sharing" if not properly restricted.
- **Financial Services:** GLBA-covered financial institutions are partially exempt, but the exemption applies at the data level (not entity level). Data not subject to GLBA held by a financial institution remains subject to CCPA. Careful scoping is required.
- **Data Privacy (COPPA):** For platforms directed to children, both COPPA and CCPA's minor consent provisions may apply concurrently. COPPA's verifiable parental consent standard is stricter than CCPA's opt-in requirement for under-13.
- **Data Privacy (US State Laws):** CCPA often serves as the benchmark for multi-state compliance. However, some state laws impose obligations not found in CCPA (e.g., mandatory universal opt-out recognition under Colorado and Connecticut). Compliance with CCPA alone does not guarantee compliance with other state laws.

### CPPA Enforcement Trends and Key Actions

The CPPA, which assumed full enforcement authority from the AG, has signaled enforcement priorities:

- **Opt-out signal enforcement:** The CPPA has prioritized ensuring that businesses honor Global Privacy Control and similar signals. Enforcement sweeps targeting non-compliance with GPC began in 2024.
- **Dark patterns:** The CPPA regulations specifically address the use of dark patterns in the exercise of consumer rights. Consent or opt-in obtained through a dark pattern is not valid consent. Dark patterns include confusing language, unnecessary steps, requiring consumers to read through unnecessary information, and using manipulative design.
- **Data broker oversight:** The CPPA has enforcement authority over data broker registration and the Delete My Data mechanism.
- **Service provider misuse:** Enforcement actions have targeted service providers that use personal information beyond the scope of contracted services, and businesses that fail to include required contractual restrictions.
- **Penalty escalation:** The CPPA has signaled willingness to pursue maximum penalties for intentional violations and violations involving minors' data. Per-consumer, per-violation calculation means aggregate penalties in enforcement actions can reach tens of millions of dollars.

## Sources

- [CCPA/CPRA Full Text — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5) — Cal. Civ. Code 1798.100-1798.199.100
- [CPPA Final Regulations](https://cppa.ca.gov/regulations/) — Implementing regulations from the California Privacy Protection Agency
- [California AG CCPA Enforcement](https://oag.ca.gov/privacy/ccpa) — Enforcement actions and guidance from the California Attorney General
- [CIS Critical Security Controls](https://www.cisecurity.org/controls) — Referenced as a baseline for "reasonable security" under CCPA

---
## Consent Mechanics

# Consent Mechanics

## Applicability

This sub-file addresses the legal requirements for valid consent as a basis for data processing across jurisdictions. Load when:

- A contract or agreement relies on consent as the lawful basis for processing personal data.
- Cookie consent, tracking consent, or marketing consent mechanisms are being reviewed or implemented.
- Consent language, consent flows, or consent management platforms (CMPs) are at issue.
- Opt-in vs. opt-out mechanisms are being evaluated for regulatory compliance.
- Granularity of consent or consent bundling is at issue.
- Withdrawal of consent procedures are being designed or reviewed.

## Key Requirements

### GDPR Consent (Article 7, Recitals 32, 42-43)

GDPR sets the global high-water mark for consent requirements:

- **Freely given:** Consent is not freely given if the data subject has no genuine or free choice, or is unable to refuse or withdraw consent without detriment. Consent is presumed NOT freely given if (a) consent is bundled with acceptance of terms and conditions, (b) performance of a contract is conditional on consent that is not necessary for that contract, or (c) there is a clear imbalance between the data subject and controller (e.g., employer-employee relationships).
- **Specific:** Consent must be given for each distinct processing purpose. Blanket consent for undefined or broadly described purposes is invalid. If data is processed for multiple purposes, consent must be given for each purpose separately.
- **Informed:** The data subject must be provided with at least the following before consenting: (a) identity of the controller, (b) purpose of each processing operation, (c) type of data collected, (d) right to withdraw consent, (e) information about automated decision-making (if applicable), (f) risks of cross-border transfers (if applicable).
- **Unambiguous indication:** Consent requires a clear affirmative act — a statement or active opt-in. **Pre-ticked boxes, silence, and inactivity do NOT constitute consent** (Recital 32). Scrolling or continuing to browse a website is NOT valid consent (EDPB guidance, Planet49 CJEU ruling C-673/17).
- **Withdrawal:** Must be as easy to withdraw consent as to give it (Art. 7(3)). The data subject must be informed of the right to withdraw before giving consent. Withdrawal does not affect the lawfulness of processing prior to withdrawal.
- **Burden of proof:** The controller bears the burden of demonstrating that the data subject consented (Art. 7(1)). Consent records must be maintained.
- **Children:** For information society services offered directly to a child, consent is valid only if given or authorized by the holder of parental responsibility. Default age threshold is **under 16** (member states may lower to **13**) (Art. 8).
- **Consequence:** Processing based on invalid consent lacks a lawful basis — a fundamental violation under Article 83(5), carrying fines up to **EUR 20 million or 4% of global annual turnover**.

### ePrivacy Directive (Directive 2002/58/EC) — Cookie Consent

- **What:** Storing information or gaining access to information on a user's terminal equipment (cookies, device fingerprinting, local storage) requires the user's **prior consent**, except for strictly necessary cookies (e.g., session management, shopping cart, load balancing).
- **Standard:** Consent must meet the GDPR standard (informed, specific, freely given, unambiguous). Cookie walls (blocking access unless all cookies are accepted) are generally considered non-compliant by most EU supervisory authorities (EDPB guidance), though enforcement varies by member state.
- **Analytics cookies:** Not considered "strictly necessary" — consent required even for first-party analytics under most supervisory authority interpretations.
- **Timeline:** The ePrivacy Directive is currently in force; the proposed ePrivacy Regulation (intended to replace the directive) remains in legislative process.
- **Consequence:** Violations enforced under national implementing laws with varying penalty structures. French CNIL has imposed fines of **EUR 150 million** (Google, 2022) for cookie consent violations.

### CCPA/CPRA Consent Model

CCPA follows a fundamentally different approach from GDPR:

- **Default: opt-out, not opt-in.** Businesses may collect and use personal information without prior consent, but must honor consumer opt-out requests for sale and sharing.
- **Opt-in required for:** (a) Sale or sharing of personal information of consumers **under 16** (parental consent for under 13); (b) use and disclosure of **sensitive personal information** beyond what is necessary to provide requested goods/services, if the consumer exercises the right to limit.
- **Global Privacy Control (GPC):** Businesses must treat GPC and similar user-enabled opt-out preference signals as valid opt-out requests. CPPA regulations confirm GPC must be honored.
- **Financial incentives:** Businesses offering financial incentives (discounts, loyalty programs) in exchange for personal information must obtain the consumer's **opt-in consent** and provide a clear notice of the material terms.
- **Consequence:** Failure to honor opt-out signals or obtain required opt-in consent is a per-consumer violation — **$2,500** (unintentional) or **$7,500** (intentional or involving minors).

### US State Law Consent Requirements

Most comprehensive US state privacy laws follow an opt-out model with targeted opt-in requirements:

- **Sensitive data:** All major state laws (Virginia, Colorado, Connecticut, Utah, Texas, Oregon, etc.) require **opt-in consent** for processing sensitive personal data. Definitions of "sensitive" vary by state (see `us-state-privacy.md`).
- **Universal opt-out mechanisms:** Colorado and Connecticut require businesses to recognize universal opt-out signals (e.g., GPC) for targeted advertising and sale opt-outs. Other states may adopt similar requirements.
- **Children's data:** Most state laws treat personal data of a **known child** as sensitive data requiring opt-in consent. Age thresholds vary (13 in most states, 16 in some contexts).
- **Targeted advertising opt-out:** All major state laws provide a right to opt out of targeted advertising, but this is an opt-out right (not prior consent) except where sensitive data is involved.

### Consent for Direct Marketing

- **US (CAN-SPAM Act):** Commercial email requires an opt-out mechanism but does NOT require prior opt-in consent (opt-out model). Must honor opt-out within **10 business days**.
- **US (TCPA):** Telephone calls and texts for marketing require **prior express written consent** for autodialed or prerecorded calls to mobile phones. Consent must be clear and conspicuous. Revocation must be honored promptly. Penalties of **$500 per violation** (trebled to **$1,500** for willful violations). Private right of action.
- **EU (ePrivacy Directive Art. 13):** Direct marketing by electronic mail requires **prior opt-in consent**, with a narrow exception for existing customer relationships (soft opt-in) where the marketing relates to similar products/services and the customer is given the opportunity to object at each message.
- **Canada (CASL):** Anti-Spam Legislation requires **express consent** (opt-in) for commercial electronic messages, with implied consent for existing business/non-business relationships (time-limited — 2 years for business, 6 months for inquiries). Penalties up to **CAD $10 million** per violation (corporations).

### International Consent Requirements

- **Brazil (LGPD):** Consent must be free, informed, and unambiguous, provided in writing or other means demonstrating the data subject's will. Consent for sensitive data must be specific and highlighted. Controller bears the burden of proof. Consent may be revoked at any time.
- **China (PIPL):** Consent must be informed, voluntary, and explicit. **Separate consent** required for: processing sensitive personal information, cross-border transfers, public disclosure of personal information, and provision to third parties. Consent must be re-obtained if the purpose, method, or type of processing changes.
- **Singapore (PDPA):** Consent may be express or deemed. Deemed consent applies where the individual voluntarily provides personal data for a reasonable purpose, or where the processing is reasonably necessary for a contract. The 2020 amendments introduced legitimate interests as a basis, reducing reliance on consent for certain business improvement purposes.
- **Canada (PIPEDA):** Meaningful consent requires that the individual understand the nature, purpose, and consequences of collection, use, or disclosure. Implied consent is acceptable for non-sensitive information where purposes are obvious. Express consent required for sensitive information. The OPC has issued guidance that lengthy, complex privacy policies do not satisfy the "meaningful" consent standard.
- **South Korea (PIPA):** Among the strictest consent regimes globally. Requires separate consent for collection/use, third-party provision, cross-border transfer, and marketing. Each consent must be clearly distinguished from the others in the consent form. Failure to obtain separate consents is a violation even if one blanket consent was obtained.

### Cross-Jurisdiction Consent Design Principles

When designing consent mechanisms for multi-jurisdiction compliance:

- **Granularity:** Present separate consent options for each processing purpose. Do not bundle consent for analytics, marketing, and functional purposes into a single acceptance. South Korea's requirement for separate consents represents the strictest standard.
- **Layered notice:** Provide a concise first layer with essential information and link to a detailed second layer. Both layers must be accessible at the time of consent.
- **Record-keeping:** Maintain records of who consented, when, what they were told, how they consented, and whether they withdrew. These records are the controller's evidence if consent validity is challenged.
- **No consent fatigue exploitation:** The EDPB has warned against designs that exploit user fatigue to obtain consent (e.g., repeated prompts after refusal, making refusal more difficult than acceptance).
- **Asymmetric nudging (dark patterns):** Designs that make consent easier to give than to refuse (e.g., larger "Accept" button, multiple steps to refuse) are increasingly targeted by regulators. The EDPB, CNIL, and FTC have all taken enforcement positions against dark patterns in consent interfaces.
- **Consent lifecycle management:** Consent should be treated as a living record — trackable, auditable, and revocable. Consent management platforms should support automatic expiration and re-consent for time-limited processing purposes.

## Interaction with Other Areas

- **Consumer Protection:** Consent dark patterns (deceptive design to obtain consent) are an active area of FTC enforcement under Section 5 (unfair or deceptive acts). The FTC has brought enforcement actions against companies using dark patterns in subscription sign-ups, cookie consent, and data collection flows.
- **Data Privacy (GDPR, CCPA):** Consent is one of multiple lawful bases under GDPR and is not always the most appropriate. Where consent is not freely given (e.g., employment context), controllers should consider alternative bases (legitimate interests, contract performance). CCPA generally does not rely on affirmative consent as a processing basis except for minors and sensitive data.
- **Employment:** Consent from employees is generally considered problematic under GDPR due to the power imbalance. The EDPB advises that employers should rely on other lawful bases (legal obligation, legitimate interests, contract performance) rather than employee consent for most HR processing.
- **IP and Technology:** Cookie consent and tracking consent directly affect advertising technology, analytics, and personalization features in technology products. Consent management platforms (CMPs) and the IAB Transparency & Consent Framework are key implementation tools.
- **Data Privacy (COPPA):** COPPA's verifiable parental consent is a heightened consent standard that goes beyond GDPR's parental authorization. For services directed to children, COPPA consent mechanisms must be used alongside any GDPR or state-law consent requirements. See `coppa.md` for approved VPC methods.

### Consent Enforcement Trends

Regulators across jurisdictions have increasingly focused on the validity of consent mechanisms:

- **EU enforcement:** Between 2020 and 2025, European supervisory authorities imposed over **EUR 1 billion** in fines related to consent and cookie consent violations. Major actions include CNIL v. Google (**EUR 150 million**, cookie consent, 2022), Irish DPC v. Meta (**EUR 390 million**, legal basis/consent for behavioral advertising, 2023), and Italian Garante enforcement actions against cookie consent practices.
- **FTC enforcement:** The FTC has brought multiple actions against companies for obtaining consent through dark patterns, particularly in subscription services (negative option marketing) and data collection contexts. The FTC's proposed Negative Option Rule would strengthen consent requirements for subscription services.
- **CCPA/CPPA enforcement:** The CPPA has focused enforcement on businesses that fail to honor GPC signals, treat GPC as a suggestion rather than a binding opt-out request, or use manipulative interfaces to discourage consumers from exercising opt-out rights.
- **Key takeaway:** Consent mechanisms are no longer a "check the box" compliance item. Regulators scrutinize the actual user experience, not just the language of consent forms. A technically present consent mechanism that is designed to maximize opt-ins rather than inform users is increasingly treated as non-compliant.

### Consent vs. Other Lawful Bases — Selection Framework

Under GDPR, consent is one of six lawful bases and is often not the most appropriate:

- **When consent is appropriate:** Genuinely optional processing where the data subject has a real choice (marketing communications, optional analytics, research participation, optional features).
- **When consent is NOT appropriate:** Processing where there is a power imbalance (employment), processing necessary for contract performance (use contract basis instead), processing required by law (use legal obligation basis), or processing where the controller cannot offer a genuine opt-out (consider legitimate interests with balancing test).
- **Consequence of choosing the wrong basis:** If a controller relies on consent but cannot meet the "freely given" requirement (e.g., because the service is conditional on consent), the processing lacks a valid lawful basis — regardless of whether the data subject clicked "agree."

## Sources

- [GDPR Articles 6-8 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Consent provisions in the General Data Protection Regulation
- [EDPB Guidelines 05/2020 on Consent](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en) — Authoritative guidance on GDPR consent
- [CJEU Planet49 Decision (C-673/17)](https://curia.europa.eu/juris/liste.jsf?num=C-673/17) — Pre-ticked boxes and cookie consent
- [CPPA Regulations on Opt-Out Preference Signals](https://cppa.ca.gov/regulations/) — GPC and opt-out signal requirements
- [FTC Dark Patterns Report](https://www.ftc.gov/reports/bringing-dark-patterns-light) — FTC guidance on deceptive design in consent

---
## Coppa

# COPPA (Children's Online Privacy Protection Act)

## Applicability

The Children's Online Privacy Protection Act (15 U.S.C. 6501-6506) and the FTC's COPPA Rule (16 C.F.R. Part 312) apply when ANY of the following are true:

- The website, online service, or mobile application is **directed to children under 13** (determined by subject matter, visual content, use of animated characters, child-oriented activities, age of models, presence of child celebrities, music or content appealing to children, or other characteristics).
- The operator has **actual knowledge** that it is collecting personal information from a child under 13, even if the site is not directed to children.
- The website or service has a **mixed audience** (directed to children and general audience) — COPPA applies to the child-directed portions and to any identified child user.
- A **plug-in, ad network, or third-party service** collects personal information through a child-directed site or service (the third party may be an independent "operator" under COPPA).

**Who is an "operator":** Any person who operates a website or online service and collects or maintains personal information from or about the users of such service. Includes website owners, app developers, and third parties (such as ad networks and analytics providers) that collect personal information through child-directed sites.

**Threshold age: Under 13.** Some states have extended protections to children under 16 or 18 through state laws (see `us-state-privacy.md`), and CCPA imposes opt-in requirements for consumers under 16 (see `ccpa-cpra.md`).

## Key Requirements

### Verifiable Parental Consent (VPC)

- **What:** Before collecting, using, or disclosing personal information from a child under 13, the operator must obtain **verifiable parental consent**. "Personal information" includes name, physical address, email address, phone number, SSN, photo/video/audio of the child, geolocation, persistent identifier (cookies, device ID) when used for purposes other than internal operations, and any combination of information that permits physical or online contacting.
- **Methods approved by the FTC:** (a) Signed consent form returned by mail, fax, or electronic scan; (b) credit card or other online payment transaction as verification; (c) toll-free telephone call or video conference with trained personnel; (d) government-issued ID checked against a database (with prompt deletion of the ID); (e) knowledge-based authentication; (f) facial recognition comparison of parent's photo ID to real-time selfie (with prompt deletion after verification); (g) any other method approved through the FTC's voluntary review process.
- **Sliding scale for internal use:** If personal information will only be used for internal purposes (not disclosed to third parties), a less rigorous method may suffice, such as email-plus (email to parent plus confirmation mechanism, with a delayed activation period).
- **Consequence:** Collection without VPC is a **per-child, per-incident violation**. FTC civil penalties up to **$51,744 per violation** (as adjusted for inflation, 2024 figure). Penalties are regularly adjusted; check current FTC penalty amounts.

### Direct Notice to Parents

- **What:** Before collecting personal information, the operator must provide **direct notice to the parent** (not just a posted privacy policy) that includes: (a) the operator's contact information; (b) the types of personal information collected; (c) how the information will be used; (d) whether information is disclosed to third parties; (e) the parent's right to refuse further collection and to request deletion; and (f) the specific consent mechanism.
- **Timeline:** Notice must be provided **before** any collection occurs.
- **Consequence:** Failure to provide adequate direct notice is an independent violation of the COPPA Rule.

### Privacy Policy Requirements

- **What:** Operators of child-directed sites or services must post a **clear, complete, and prominently placed** privacy policy that includes: all categories of personal information collected, how information is used, disclosure practices, name and contact information of all operators collecting information through the site, and a description of parental rights.
- **Accessibility:** The privacy policy link must be placed on the homepage and at each point where personal information is collected from children.
- **Consequence:** An inadequate or inaccessible privacy policy is an independent COPPA violation.

### Limitations on Collection and Use

- **Data minimization:** Operators must not condition a child's participation in a game, prize offering, or other activity on the disclosure of **more personal information than is reasonably necessary** for the activity.
- **Retention limitation:** Personal information collected from children must be retained only as long as reasonably necessary for the purpose collected. Must be **securely deleted** when no longer needed.
- **Third-party disclosure:** Operators cannot disclose children's personal information to third parties unless the disclosure is integral to the site's purpose, is reasonably necessary for the site's operation, or the parent has consented. The operator must ensure the third party maintains confidentiality and security.

### Ongoing Parental Rights

- **What:** Parents have the right to: (a) review personal information collected from their child; (b) direct the operator to delete the information; (c) refuse to permit further collection or use. The operator must not condition the child's participation on providing more information than reasonably necessary.
- **Timeline:** Operator must respond to parental requests **within a reasonable timeframe** (the FTC has indicated this should be prompt — no more than a few business days).
- **Consequence:** Failure to honor parental rights is a per-incident violation.

### Confidentiality and Security

- **What:** Operators must establish and maintain **reasonable procedures** to protect the confidentiality, security, and integrity of personal information collected from children. This includes limiting access to authorized personnel and ensuring service providers and third parties maintain equivalent protections.
- **Consequence:** A data breach involving children's personal information may trigger both COPPA enforcement and state breach notification obligations, with enhanced penalties.

### COPPA Safe Harbor Programs

- **What:** Industry groups or organizations may apply to the FTC for approval of self-regulatory guidelines (Safe Harbor programs) that implement COPPA protections. Participants in an approved Safe Harbor program are subject to the program's oversight and enforcement in lieu of direct FTC enforcement (though the FTC retains backup authority).
- **Approved programs:** Include CARU (Children's Advertising Review Unit), ESRB (Entertainment Software Rating Board), kidSAFE Seal Program, PRIVO, and others. The list is maintained on the FTC's COPPA Safe Harbor page.
- **Consequence:** Participation does not eliminate COPPA obligations — it provides an alternative enforcement pathway. The FTC can still bring enforcement actions against Safe Harbor participants for COPPA violations.

### Age Verification and Age-Gating

- **What:** COPPA does not mandate a specific age-verification mechanism, but operators must not collect personal information from children under 13 without VPC. Age gates (asking users to enter a date of birth) are commonly used to identify children. The FTC has stated that age gates must not be easily circumvented (e.g., must not allow users to simply reload the page and re-enter a different age).
- **Neutral age gate:** The FTC recommends a "neutral" age screen that does not indicate the age threshold for access, to discourage children from lying about their age.
- **Consequence:** An age gate that is easily circumvented may not be sufficient to avoid "actual knowledge" of child users.

### FTC Enforcement History and Key Precedents

The FTC has actively enforced COPPA, with escalating penalties over time:

- **Musical.ly/TikTok (2019):** **$5.7 million** settlement — largest COPPA fine at that time — for collecting personal information from children under 13 without parental consent on the Musical.ly platform.
- **Epic Games/Fortnite (2022):** **$275 million** COPPA penalty — the largest COPPA settlement in history — for violating children's privacy protections through default settings and voice/text communications in Fortnite.
- **Amazon/Alexa (2023):** **$25 million** settlement for retaining children's voice recordings and geolocation data without parental consent through Alexa and Ring services.
- **Key enforcement themes:** (a) Actual knowledge of child users combined with failure to obtain consent; (b) retention of children's data beyond what is reasonably necessary; (c) default settings that enable collection without adequate consent; (d) third-party tracking through child-directed properties.
- **Trend:** Penalties are increasing substantially. The FTC has signaled that it views children's privacy as a top enforcement priority.

### Third-Party Operators and Ad Networks

- **What:** An ad network, analytics provider, or plug-in that collects personal information from users of a child-directed site or service may itself be an "operator" under COPPA if it has actual knowledge that the site or service is child-directed.
- **Obligation:** Third-party operators must either obtain verifiable parental consent directly or rely on the website operator to do so on their behalf. If relying on the website operator, the third party must provide notice of its collection practices to the website operator.
- **Safe harbor:** Ad networks participating in CARU or similar COPPA Safe Harbor programs may satisfy their obligations through the program's framework, but must still ensure that their data collection through child-directed sites complies with COPPA requirements.
- **Consequence:** Third-party operators that collect personal information through child-directed sites without appropriate consent are independently liable for COPPA violations.

### Ed-Tech and Schools

- **School exception:** When a school or school district directs students to use an online educational service, the school may consent on behalf of parents for the collection of student personal information — but **only for the school-authorized educational purpose**. The operator may not use the information for any commercial purpose unrelated to the provision of the educational service.
- **FERPA interaction:** Student education records are also protected under FERPA. Where both COPPA and FERPA apply (e.g., ed-tech platforms used by schools), operators must comply with both frameworks. FERPA's "school official" exception permits disclosure to operators under certain conditions, but does not eliminate COPPA obligations for data collected directly from students.
- **FTC guidance:** The FTC has issued specific guidance on COPPA compliance for ed-tech providers, emphasizing that schools cannot consent to commercial uses of student data.

## Interaction with Other Areas

- **Data Privacy (CCPA/CPRA):** CCPA requires opt-in consent for sale/sharing of personal information of consumers under 16, with parental consent for those under 13. Where COPPA and CCPA both apply, COPPA's VPC requirement is the stricter standard and controls. Both must be independently satisfied.
- **Data Privacy (GDPR):** GDPR Article 8 requires parental consent for information society services offered directly to children under 16 (member states may lower to 13). If a US-based, child-directed service has EU users, both COPPA and GDPR child consent provisions apply. GDPR's age threshold may be higher (up to 16) in some member states.
- **Consumer Protection:** FTC enforcement of COPPA is an exercise of its Section 5 authority over unfair or deceptive acts. COPPA violations may also constitute unfair or deceptive practices under state consumer protection laws, enabling parallel state enforcement.
- **Employment/Education:** FERPA (Family Educational Rights and Privacy Act) governs student education records and may overlap with COPPA for ed-tech platforms. When a school directs a student to use a technology service, the school may consent on behalf of the parent under COPPA's "school exception," but only for the educational purpose — not for commercial purposes.
- **US State Privacy Laws:** Several states have enacted laws specifically addressing children's or teen data beyond COPPA's scope. California's Age-Appropriate Design Code Act (effective July 1, 2024) imposes DPIA requirements for online products likely to be accessed by children under 18, with penalties up to **$7,500 per affected child**. Other states are considering similar age-appropriate design legislation.

### Connected Toys, IoT, and Voice Assistants

- **What:** COPPA applies to internet-connected toys, smart speakers, and other IoT devices that collect personal information from children. Voice recordings, usage patterns, and associated account information are personal information under COPPA.
- **FTC enforcement:** The FTC has pursued enforcement actions against manufacturers of connected toys and voice assistant services for collecting voice recordings from children without VPC and retaining recordings longer than reasonably necessary.
- **Design obligations:** Connected devices directed to children must incorporate COPPA-compliant consent mechanisms before activating features that collect personal information. Default settings must minimize data collection.
- **Third-party SDKs:** If a child-directed app or device incorporates third-party software development kits (SDKs) that collect personal information (e.g., analytics, advertising), the app or device operator is responsible for ensuring COPPA compliance for that collection.

### State-Level Children's Privacy Laws

Beyond COPPA, several states have enacted additional children's privacy protections:

- **California (AADC):** Age-Appropriate Design Code Act requires data protection impact assessments for online services likely to be accessed by children under 18, default high-privacy settings, and age estimation mechanisms.
- **Utah, Arkansas, Texas, Ohio:** Have enacted laws requiring parental consent for minors' social media accounts, with varying age thresholds (typically under 16 or 18).
- **Interaction:** These state laws supplement COPPA. Where both COPPA (under 13, federal) and a state children's data law (under 18, state) apply, both must be satisfied. COPPA does not preempt stricter state laws that are consistent with its protections.

## Sources

- [COPPA Statute — Cornell LII](https://www.law.cornell.edu/uscode/text/15/chapter-91) — 15 U.S.C. 6501-6506
- [FTC COPPA Rule — eCFR](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312) — 16 C.F.R. Part 312
- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) — Comprehensive FTC guidance on COPPA compliance
- [FTC COPPA Safe Harbor Programs](https://www.ftc.gov/safe-harbor-program) — List of approved self-regulatory programs
- [FTC COPPA Enforcement Actions](https://www.ftc.gov/legal-library/browse/cases-proceedings?search_api_fulltext=coppa) — Published enforcement actions

---
## Cross Border Transfers

# Cross-Border Data Transfers

## Applicability

This sub-file covers the legal mechanisms and requirements for transferring personal data across national borders. Load when:

- Data flows cross national boundaries (e.g., EU to US, APAC to EU, intra-group transfers across countries).
- Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs), or other transfer mechanisms are referenced or required.
- Adequacy decisions or frameworks (EU-US Data Privacy Framework) are relied upon.
- Transfer Impact Assessments (TIAs) are being conducted or reviewed.
- Data localization requirements may apply (China, Russia, certain sectors in India).
- Cross-border transfer provisions in DPAs or service agreements are being drafted or reviewed.

## Key Requirements

### GDPR Cross-Border Transfer Framework (Articles 44-49)

The GDPR restricts transfers of personal data to countries outside the EEA unless adequate protection is ensured. The available mechanisms, in order of preference:

#### Adequacy Decisions (Article 45)

- **What:** The European Commission determines that a third country ensures an adequate level of data protection. Transfers to adequate countries are permitted without additional safeguards.
- **Current adequacy decisions (as of early 2026):** Andorra, Argentina, Canada (commercial activities under PIPEDA only), Faroe Islands, Guernsey, Isle of Man, Israel, Japan, Jersey, New Zealand, Republic of Korea, Switzerland, United Kingdom, Uruguay, and the **United States** (limited to organizations self-certified under the EU-US Data Privacy Framework).
- **EU-US Data Privacy Framework (DPF):** Adopted July 2023, replacing Privacy Shield (invalidated by Schrems II). Requires US organizations to self-certify with the Department of Commerce and commit to DPF Principles. Covers only transfers to self-certified US organizations. Includes redress mechanisms through the Data Protection Review Court.
- **Consequence:** Adequacy decisions are subject to periodic review and can be revoked. Reliance on an adequacy decision that is later invalidated may retroactively undermine the lawfulness of transfers.

#### Standard Contractual Clauses (Article 46(2)(c))

- **What:** Pre-approved contractual clauses adopted by the European Commission that provide appropriate data protection safeguards.
- **2021 SCCs (Commission Implementing Decision 2021/914):** Four modules:
  - **Module 1:** Controller to Controller
  - **Module 2:** Controller to Processor
  - **Module 3:** Processor to Processor
  - **Module 4:** Processor to Controller
- **Mandatory elements:** Data protection obligations, data subject rights (third-party beneficiary rights), sub-processor requirements, cooperation with supervisory authorities, termination and data return/deletion, governing law (must be an EU member state), and jurisdiction (EU courts).
- **Cannot be modified in substance:** Parties may add clauses or safeguards provided they do not contradict the SCCs or diminish data subject rights. The SCCs must be incorporated in their entirety.
- **Docking clause:** Additional parties may accede to the SCCs during the contract's lifetime.
- **Consequence:** Using outdated (pre-2021) SCCs does not provide a valid transfer mechanism. Failure to execute the correct module is a transfer violation under Article 83(5) — fines up to **EUR 20 million or 4% of global annual turnover**.

#### Binding Corporate Rules (Article 47)

- **What:** Internal policies adopted by a group of undertakings for intra-group cross-border transfers. Must be approved by the competent supervisory authority through the consistency mechanism.
- **Required content:** Legally binding obligations on all group members, data subject rights (including enforceable third-party beneficiary rights), organizational structure, data protection officer, complaint handling, cooperation with supervisory authorities, and training.
- **Approval process:** Lengthy — typically **12-24 months** for approval. Requires lead supervisory authority review and peer review by other concerned authorities.
- **Use case:** Appropriate for large multinational organizations with ongoing, high-volume intra-group data transfers. Not suitable for transfers to external third parties.

#### Derogations (Article 49)

- **What:** In the absence of an adequacy decision or appropriate safeguards, transfers may occur under specific derogations.
- **Available derogations:** (a) Explicit consent (after being informed of risks), (b) contract performance with the data subject, (c) pre-contractual measures at data subject's request, (d) contract performance in data subject's interest, (e) important reasons of public interest, (f) legal claims, (g) vital interests, (h) transfer from a public register.
- **Strict interpretation:** Derogations must be interpreted restrictively. Recital 111 clarifies that they are not intended to be the default mechanism for systematic, large-scale, or repeated transfers.
- **Consequence:** Reliance on derogations for ongoing, systematic transfers is a compliance risk. Supervisory authorities have objected to routine reliance on consent or contract necessity for large-scale transfers.

### Post-Schrems II Requirements

The CJEU's Schrems II decision (Case C-311/18, July 16, 2020) established additional obligations:

#### Transfer Impact Assessments (TIAs)

- **What:** Before relying on SCCs (or BCRs), the data exporter must assess whether the law of the destination country provides essentially equivalent protection to the GDPR, considering: (a) the specific circumstances of the transfer, (b) the legal framework of the destination country (including surveillance laws, government access powers, and rule of law), and (c) any supplementary measures.
- **Assessment factors (EDPB Recommendations 01/2020):** Nature of the data, purpose and context of transfer, whether the data may be accessed by public authorities in the destination country, and whether effective legal remedies exist for data subjects.
- **Documentation:** The TIA must be documented and available for the supervisory authority upon request.
- **Outcome:** If the TIA reveals that the destination country's laws impair the effectiveness of the SCCs and supplementary measures cannot close the gap, the transfer must be suspended or not commenced.

#### Supplementary Measures

The EDPB Recommendations 01/2020 identify three categories:

- **Technical measures:** End-to-end encryption (where the importer does not have the decryption key), pseudonymization (where the re-identification data remains in the EEA), split or multi-party processing, anonymization before transfer.
- **Contractual measures:** Enhanced audit rights, transparency obligations regarding government access requests, commitments to challenge disproportionate access orders, notification of inability to comply with SCCs.
- **Organizational measures:** Internal policies limiting data access, governance frameworks, ISO 27001 or equivalent certifications, transparency reports.
- **Effectiveness requirement:** Supplementary measures must effectively close any protection gap identified in the TIA. Technical measures that prevent the importer from accessing data in clear text are generally the most effective.

### UK Cross-Border Transfer Framework

- **UK adequacy bridge:** Following Brexit, the EU granted the UK an adequacy decision (June 2021) with a sunset clause of **4 years** (expiring June 2025, with potential extension). As of early 2026, check current status.
- **UK International Data Transfer Agreement (IDTA):** The UK's alternative to EU SCCs, adopted by the ICO. Available as a standalone agreement or as a UK Addendum to the EU SCCs.
- **UK Transfer Risk Assessments:** Similar to TIAs under EU GDPR. The ICO provides a Transfer Risk Assessment tool.
- **UK Extension to EU-US DPF:** The UK-US Data Bridge extends the EU-US DPF framework to UK personal data transfers to self-certified US organizations.

### China — PIPL Cross-Border Transfers (Articles 38-43)

- **Mechanisms:** Cross-border transfers of personal information require one of: (a) **CAC security assessment** (mandatory for CIIOs, processors of 1 million+ individuals' PI, or cumulative transfers exceeding thresholds), (b) **standard contract** filed with provincial CAC office, (c) **personal information protection certification**, or (d) other conditions per laws/regulations.
- **CAC security assessment thresholds:** Mandatory when: the data exporter is a CIIO; the data exporter processes personal information of **1 million+ individuals**; cumulative cross-border transfer since January 1 of the prior year involves PI of **100,000+ individuals** or sensitive PI of **10,000+ individuals**.
- **Standard contract:** For transfers below the security assessment thresholds, the standard contract published by the CAC may be used. Must be filed with the provincial CAC within **10 working days** of the contract taking effect.
- **Data localization:** CIIOs must store personal information within China. Cross-border provision requires a security assessment and must be necessary for business purposes.
- **Consequence:** Unauthorized cross-border transfer — fines up to **RMB 50 million or 5% of annual revenue** for serious violations. Suspension of cross-border data flows. Personal liability for responsible individuals.

### Brazil — LGPD Cross-Border Transfers (Articles 33-36)

- **Mechanisms:** Transfer permitted when the destination country provides adequate protection (as determined by the ANPD), under SCCs approved by the ANPD, BCRs, cooperation agreements between supervisory authorities, or with the data subject's specific and prominent consent.
- **Status:** As of early 2026, the ANPD has not yet finalized its adequacy assessment framework or approved SCCs. Specific consent and contractual clauses remain the primary mechanisms.

### Singapore — PDPA Cross-Border Transfers (Section 26)

- **Mechanism:** The transferring organization must ensure that the overseas recipient is bound by legally enforceable obligations to provide a comparable standard of protection. Achieved through contractual clauses, binding corporate rules, or assurance that the receiving jurisdiction's law provides comparable protection.
- **No adequacy framework:** Singapore does not maintain a formal adequacy list. Assessment is the responsibility of the transferring organization.

### APEC Cross-Border Privacy Rules (CBPR) System

- **What:** A voluntary, accountability-based cross-border data transfer framework among APEC member economies. Participating economies include the US, Japan, South Korea, Canada, Singapore, Australia, Chinese Taipei, Mexico, and the Philippines.
- **How it works:** Organizations self-certify compliance with the CBPR program requirements through APEC-recognized accountability agents. Certification demonstrates that the organization's data privacy practices are consistent with the APEC Privacy Framework.
- **Global CBPR Forum:** In 2022, the CBPR system was relaunched as the Global CBPR Forum, expanding beyond APEC to include the UK and other economies.
- **GDPR interaction:** The EDPB does not currently recognize CBPR certification as an adequate safeguard for GDPR transfers. CBPR may supplement but does not replace SCCs for EU data flows.

### Practical Transfer Mechanism Selection

| Scenario | Recommended Mechanism |
|----------|----------------------|
| EU to self-certified US company | EU-US Data Privacy Framework (verify certification on DPF list) |
| EU to non-DPF US company | SCCs (Module 2 or 3) + TIA + supplementary measures |
| EU to UK | EU adequacy decision (verify current status) |
| EU to Japan, South Korea | Adequacy decision |
| EU to China | SCCs + TIA + supplementary measures (significant compliance burden) |
| Intra-group multinational (EU HQ) | BCRs (if approved) or SCCs for each entity pair |
| China outbound | CAC security assessment (if thresholds met) or filed standard contract |
| US to any jurisdiction | Generally no US-law restriction on outbound transfers; comply with destination country's inbound requirements |

## Interaction with Other Areas

- **International Trade:** Data localization mandates (China, Russia, potentially India) interact with sanctions and export control regimes. US trade restrictions on Chinese entities may complicate CAC security assessment requirements. Data flow provisions in trade agreements (USMCA, EU-Japan EPA) may create additional rights.
- **Corporate:** Intra-group data transfers in multinational corporate structures require mapping of all entity-to-entity flows and ensuring each flow has a valid transfer mechanism. M&A due diligence must assess the target's cross-border data flows and transfer mechanisms.
- **IP and Technology:** Cloud service architecture determines data flow paths. Multi-region cloud deployments may create cross-border transfers even when data is "at rest" in the EEA if support or administration access occurs from outside the EEA.
- **Financial Services:** Financial regulators in some jurisdictions impose additional restrictions on cross-border transfer of financial data (e.g., India's RBI data localization mandate for payment data, China's PBOC restrictions on financial data).

## Sources

- [GDPR Articles 44-49 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Cross-border transfer provisions
- [2021 Standard Contractual Clauses — EUR-Lex](https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj) — Commission Implementing Decision 2021/914
- [EDPB Recommendations 01/2020 on Supplementary Measures](https://edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en) — Post-Schrems II transfer guidance
- [EU-US Data Privacy Framework](https://www.dataprivacyframework.gov/) — Self-certification portal and DPF participant list
- [CJEU Schrems II Decision (C-311/18)](https://curia.europa.eu/juris/liste.jsf?num=C-311/18) — Foundational ruling on cross-border transfers
- [UK International Data Transfer Agreement](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/) — ICO guidance and IDTA templates

---
## Data Processing Agreements

# Data Processing Agreements

## Applicability

This sub-file covers the mandatory contractual requirements for agreements governing the processing of personal data on behalf of another party (controller-processor, business-service provider). Load when:

- A data processing agreement (DPA), data protection addendum (DPA), or data processing exhibit is being drafted, reviewed, or negotiated.
- A service provider, contractor, or vendor agreement involves the handling of personal data.
- Sub-processor arrangements or sub-service-provider contracts need to be evaluated.
- Audit rights, data return/deletion obligations, or processor security requirements are at issue.
- Multiple privacy regimes apply and the DPA must satisfy all simultaneously.

## Key Requirements

### GDPR Article 28 — Mandatory DPA Provisions

Under GDPR Article 28(3), the contract between controller and processor must set out in writing (including electronic form):

#### Required Descriptive Elements

- **Subject matter and duration** of the processing.
- **Nature and purpose** of the processing (e.g., "hosting and processing customer data for the purpose of providing the SaaS platform").
- **Type of personal data** processed (e.g., names, email addresses, IP addresses, payment data).
- **Categories of data subjects** (e.g., controller's customers, employees, website visitors).
- **Controller's obligations and rights** with respect to the personal data.

#### Required Processor Obligations (Article 28(3)(a)-(h))

1. **(a) Documented instructions:** Process personal data only on documented instructions from the controller, including with regard to transfers to third countries. The processor must inform the controller if it believes an instruction infringes the GDPR.
2. **(b) Confidentiality:** Ensure that persons authorized to process have committed to confidentiality or are under an appropriate statutory obligation.
3. **(c) Security measures:** Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk (per Article 32). Specific measures should be described or referenced (encryption, access controls, incident response, business continuity).
4. **(d) Sub-processor conditions:** Not engage another processor (sub-processor) without prior **specific** or **general** written authorization of the controller. For general authorization, the processor must inform the controller of any intended additions or replacements, giving the controller the opportunity to **object**. Sub-processor contracts must impose the same data protection obligations as the main DPA.
5. **(e) Assistance with data subject rights:** Assist the controller, by appropriate technical and organizational measures, in fulfilling the obligation to respond to data subject rights requests (access, rectification, erasure, restriction, portability, objection).
6. **(f) Assistance with compliance obligations:** Assist the controller in ensuring compliance with Articles 32-36 (security, breach notification, DPIA, prior consultation), taking into account the nature of processing and information available to the processor.
7. **(g) Data return or deletion:** At the choice of the controller, delete or return all personal data after the end of services, and delete existing copies unless EU or member state law requires storage. The controller should specify its preference in the DPA.
8. **(h) Audit rights:** Make available to the controller all information necessary to demonstrate compliance, and allow for and contribute to audits, including inspections, by the controller or an auditor mandated by the controller. The processor must immediately inform the controller if an instruction would infringe the GDPR.

- **Consequence:** Processing without a compliant DPA is itself a violation under Article 83(4) — fines up to **EUR 10 million or 2% of global annual turnover**. Both the controller and processor can be held liable.

### GDPR Sub-Processor Requirements (Article 28(2), (4))

- **Prior authorization:** General written authorization requires the processor to notify the controller of any changes (additions or replacements) and allow the controller a reasonable opportunity to object.
- **Equivalent obligations:** The sub-processor contract must impose **the same data protection obligations** as the controller-processor contract, particularly regarding security measures and processor obligations.
- **Processor liability:** The initial processor remains **fully liable** to the controller for the performance of the sub-processor's obligations. If the sub-processor fails, the processor is responsible.
- **Practical requirement:** The DPA should specify: (a) whether authorization is specific or general, (b) the notification period for new sub-processors (commonly 15-30 days), (c) the objection mechanism and consequences (e.g., right to terminate if objection is not resolved), and (d) a current list of sub-processors (often maintained on a publicly accessible URL).

### CCPA Service Provider and Contractor Requirements

#### Service Provider Agreement (Section 1798.140(ag))

A service provider must have a written contract that:
- **Identifies** the specific business purpose for which the personal information is disclosed.
- **Prohibits** the service provider from: (a) selling or sharing the personal information; (b) retaining, using, or disclosing the personal information for any purpose other than performing the contracted services, including for the service provider's own commercial purposes; (c) retaining, using, or disclosing the information outside the direct business relationship with the business.
- **Requires** the service provider to comply with the CCPA and to notify the business if it determines it can no longer meet its CCPA obligations.
- **Grants** the business the right to take reasonable and appropriate steps to ensure the service provider uses the personal information in a manner consistent with the business's CCPA obligations (monitoring/audit right).

#### Contractor Agreement (Section 1798.140(j), CPRA Addition)

A contractor must have a written contract that includes all service provider requirements, **plus**:
- The contractor must **certify** that it understands the CCPA/CPRA restrictions and will comply with them.
- **Consequence:** Without proper restrictive language and certification, the recipient is classified as a "third party," and every disclosure may constitute a "sale" or "sharing" requiring consumer opt-out rights.

#### Sub-Service-Provider Flow-Down

- CCPA requires the service provider to enter into a binding contract with each sub-service-provider (subcontractor) that imposes the **same level of privacy protection** as the service provider agreement.
- The service provider must notify the business of new sub-service-providers (CPRA regulations).
- The business must be able to exercise rights with respect to sub-service-providers.

### US State Privacy Law DPA Requirements

Most comprehensive US state privacy laws require written contracts between controllers and processors that include:

| Requirement | VA (VCDPA) | CO (CPA) | CT (CTDPA) | TX (TDPSA) |
|-------------|-----------|----------|-----------|-----------|
| Processing instructions | Yes | Yes | Yes | Yes |
| Nature and purpose of processing | Yes | Yes | Yes | Yes |
| Data type and subject categories | Yes | Yes | Yes | Yes |
| Duration of processing | Yes | Yes | Yes | Yes |
| Confidentiality obligations | Yes | Yes | Yes | Yes |
| Sub-processor requirements | Yes | Yes | Yes | Yes |
| Data return/deletion | Yes | Yes | Yes | Yes |
| Audit/assessment cooperation | Yes | Yes | Yes | Yes |
| DPA cooperation | Yes | Yes | Yes | Yes |
| Demonstrate compliance on request | Yes | Yes | Yes | Yes |

- **Key variation:** Colorado and Virginia explicitly require the processor to assist with **data protection assessments**. Texas requires the processor to provide the controller with the information necessary to conduct and document a data protection assessment.
- **Sub-processor authorization:** Most state laws require the processor to give the controller an opportunity to object to sub-processor changes, mirroring the GDPR approach.

### Multi-Regime DPA Drafting Requirements

When a single DPA must satisfy multiple privacy frameworks simultaneously:

- **Highest common denominator:** Draft to the most restrictive standard across all applicable jurisdictions. GDPR Article 28 is typically the most prescriptive for DPA content.
- **Addendum approach:** Use a GDPR-compliant core DPA with jurisdiction-specific addenda for CCPA (service provider certification, sale/sharing prohibitions), UK GDPR (UK-specific governing law and supervisory authority), and state laws (DPA cooperation provisions).
- **SCCs integration:** When cross-border transfers are involved, SCCs should be incorporated as an annex to or separate from the DPA. The SCC modules must be correctly selected and cannot be modified in substance.
- **Jurisdictional triggers:** The DPA should include a provision stating which jurisdiction's requirements apply based on the data subjects' location or the applicable law of the personal data being processed.

### Common DPA Deficiencies

Contracts frequently fail on these points:

- **Vague processing descriptions:** "Vendor will process data as necessary to provide services" does not satisfy Article 28(3) or state law requirements. The subject matter, duration, nature, purpose, data types, and data subject categories must be specified.
- **Missing or permissive sub-processor terms:** Contracts that allow unlimited sub-processing without controller notification or objection rights are non-compliant under GDPR and most state laws.
- **Audit rights eliminated or unreasonably restricted:** "Annual third-party audit report" may not satisfy GDPR Article 28(3)(h) standing alone. The controller must have the right to conduct or mandate its own audits. Practical limitations (advance notice, NDA, cost allocation) are acceptable.
- **No data return/deletion provision:** Contracts that are silent on what happens to personal data at termination leave the controller unable to demonstrate compliance with storage limitation principles.
- **CCPA service provider language missing:** Contracts with CCPA-applicable service providers that lack explicit prohibitions on retaining, using, or disclosing personal information beyond contracted services — and that lack the contractor certification where applicable — fail to establish the service provider safe harbor.
- **Cross-border transfer mechanism gap:** DPAs that contemplate international data flows but do not incorporate SCCs or identify the applicable transfer mechanism leave the transfer without a valid legal basis.

### Processor Security Obligations (GDPR Article 32)

The DPA must address security measures, which under Article 32 must be appropriate to the risk, taking into account:

- **Pseudonymization and encryption** of personal data.
- **Ability to ensure** ongoing confidentiality, integrity, availability, and resilience of processing systems.
- **Ability to restore** availability and access in a timely manner following an incident.
- **Process for regularly testing** and evaluating the effectiveness of technical and organizational measures.
- The DPA should specify or reference particular security standards (ISO 27001, SOC 2, NIST CSF) and require ongoing compliance.

## Interaction with Other Areas

- **Data Privacy (GDPR):** DPA requirements are a core component of GDPR compliance. See `gdpr.md` for the broader controller-processor framework and `cross-border-transfers.md` for SCC integration requirements.
- **Data Privacy (CCPA/CPRA):** CCPA service provider agreements serve a different purpose than GDPR DPAs — they establish the "service provider" safe harbor to avoid having disclosures classified as "sales." See `ccpa-cpra.md` for detailed sale/sharing/business purpose distinctions.
- **IP and Technology:** SaaS and cloud service agreements almost always require a DPA. Technology vendor agreements must address specific concerns including data use for model training, product improvement, and cross-customer analytics — all of which may violate CCPA service provider restrictions and GDPR purpose limitation.
- **Financial Services:** Financial institutions subject to GLBA, PCI DSS, or banking regulations must ensure that DPAs also address sector-specific security and data handling requirements. The DPA should reference applicable financial regulatory frameworks.
- **Employment:** DPAs with HR technology vendors (HRIS, payroll, benefits platforms) must address employee personal data, which is subject to both general privacy laws and employment-specific data protection requirements in many jurisdictions.

## Sources

- [GDPR Article 28 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Controller-processor contract requirements
- [EDPB Guidelines 07/2020 on Controller and Processor](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en) — Guidance on controller-processor distinctions and DPA requirements
- [CCPA Service Provider Requirements — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.140.&lawCode=CIV) — Cal. Civ. Code 1798.140(ag), (j)
- [CPPA Regulations on Service Providers and Contractors](https://cppa.ca.gov/regulations/) — Implementing regulations on service provider and contractor obligations
- [VCDPA Processor Requirements — Virginia Law](https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/) — Va. Code 59.1-578

---
## Data Subject Rights

# Data Subject Rights

## Applicability

This sub-file covers the statutory rights of individuals (data subjects, consumers, data principals) to access, control, and manage their personal data across jurisdictions. Load when:

- A contract addresses consumer or data subject request handling, fulfillment procedures, or response timelines.
- Data subject access requests (DSARs) or consumer rights requests are at issue.
- A DPA or service agreement allocates responsibility for responding to rights requests.
- Product or service design must accommodate rights request fulfillment (right to deletion, portability, etc.).
- Exceptions or limitations to data subject rights are being evaluated.

## Key Requirements

### GDPR Data Subject Rights (Articles 15-22)

The GDPR provides the broadest set of individual rights among major privacy frameworks:

- **Right of access (Art. 15):** Data subjects may obtain confirmation of whether their data is being processed and, if so, a copy of the personal data and information about purposes, categories, recipients, retention periods, data source, and the existence of automated decision-making. **Response timeline: 1 month**, extendable by **2 additional months** for complex or numerous requests (3 months total), with notice to the data subject. First copy must be free; additional copies may incur a reasonable fee.
- **Right to rectification (Art. 16):** Correction of inaccurate personal data and completion of incomplete data. **Response timeline: without undue delay** (interpreted as within 1 month).
- **Right to erasure / "right to be forgotten" (Art. 17):** Deletion when: data is no longer necessary for the collected purpose; consent is withdrawn; the data subject objects under Art. 21; processing is unlawful; or erasure is required by EU/member state law. **Exceptions:** exercising freedom of expression, compliance with a legal obligation, public health, archiving in the public interest, or establishment/exercise/defense of legal claims. **Response timeline: without undue delay** (within 1 month).
- **Right to restriction of processing (Art. 18):** Data subject may require the controller to restrict processing (store but not further process) when accuracy is contested, processing is unlawful but erasure is not desired, data is needed for legal claims, or the data subject has objected pending verification. **Response timeline: without undue delay.**
- **Right to data portability (Art. 20):** Receive personal data in a structured, commonly used, machine-readable format and transmit to another controller. **Applies only** to data provided by the data subject and processed by automated means on the basis of consent or contract. Does not apply to processing based on legitimate interests, legal obligation, or other bases. **Response timeline: without undue delay** (within 1 month).
- **Right to object (Art. 21):** Object to processing based on legitimate interests (Art. 6(1)(f)) or public task (Art. 6(1)(e)). Controller must cease processing unless it demonstrates compelling legitimate grounds overriding the data subject's interests. **Absolute right to object** to processing for direct marketing — no balancing test; processing must cease immediately.
- **Rights related to automated decision-making (Art. 22):** Right not to be subject to decisions based solely on automated processing, including profiling, that produce legal or similarly significant effects. The data subject has the right to obtain human intervention, express their point of view, and contest the decision. **Exceptions:** contract performance, legal authorization, or explicit consent — each with safeguards.
- **Consequence:** Violation of data subject rights — fines up to **EUR 20 million or 4% of global annual turnover** (Art. 83(5)). Data subjects also have the right to compensation for material and non-material damage (Art. 82).

### CCPA/CPRA Consumer Rights (Cal. Civ. Code 1798.100-1798.125)

- **Right to know/access (1798.100, 1798.110):** Categories and specific pieces of personal information collected, sources, business/commercial purposes, and categories of third parties. **Response timeline: 45 days**, extendable by **45 additional days** (90 days total) with notice. Covers the **12-month period** preceding the request; CPRA permits requests beyond 12 months if the business held the data.
- **Right to delete (1798.105):** Deletion of personal information collected. Business must direct service providers and contractors to delete. **9 enumerated exceptions** (complete transaction, security, comply with law, internal uses aligned with expectations, etc.). **Response timeline: 45 days**, extendable to **90 days**.
- **Right to correct (1798.106):** CPRA addition. Correction of inaccurate personal information. Business must use commercially reasonable efforts to correct and direct service providers/contractors to correct. **Response timeline: 45 days**, extendable to **90 days**.
- **Right to opt out of sale/sharing (1798.120):** Must provide "Do Not Sell or Share My Personal Information" link. Must honor Global Privacy Control (GPC). No response timeline — must take effect upon request.
- **Right to limit use of sensitive personal information (1798.121):** CPRA addition. Limit use to purposes necessary for providing requested goods/services. Must provide "Limit the Use of My Sensitive Personal Information" link.
- **Right to non-discrimination (1798.125):** Cannot discriminate for exercising rights (no denial of goods/services, different pricing, different quality). Financial incentive programs are permitted with notice and consent.
- **Verification:** Businesses must verify the identity of the requestor using a reasonable method. For deletion and access to specific pieces, higher verification is required.
- **Authorized agents:** Consumers may designate an authorized agent. Business may require the agent to provide signed permission and may verify the consumer's identity directly.
- **Consequence:** AG enforcement — **$2,500 per unintentional violation, $7,500 per intentional violation**. CPPA enforcement with same penalty authority.

### US State Privacy Law Rights (Common Framework)

Most comprehensive US state privacy laws provide a core set of rights:

| Right | VA | CO | CT | UT | TX | OR |
|-------|----|----|----|----|----|----|
| Access | Yes | Yes | Yes | Yes | Yes | Yes |
| Correct | Yes | Yes | Yes | **No** | Yes | Yes |
| Delete | Yes | Yes | Yes | Yes | Yes | Yes |
| Portability | Yes | Yes | Yes | Yes | Yes | Yes |
| Opt out — targeted advertising | Yes | Yes | Yes | Yes | Yes | Yes |
| Opt out — sale | Yes | Yes | Yes | Yes | Yes | Yes |
| Opt out — profiling | Yes | Yes | Yes | No | Yes | Yes |
| List of third parties | No | No | No | No | No | **Yes** |
| Universal opt-out signal | No | **Required** | **Required** | No | No | No |

- **Response timelines:** Most states follow CCPA's **45-day** timeline, extendable by **45 days** with notice.
- **Appeal rights:** Virginia, Colorado, Connecticut, and several other states require businesses to provide an **appeal process** when a rights request is denied. The appeal must be decided within **60 days** (VA, CO, CT). If the appeal is denied, the consumer must be informed of how to file a complaint with the state AG.
- **Consequence:** AG enforcement — typically **$7,500 per violation**. No private right of action in any state (except Illinois BIPA for biometric data).

### International Rights Comparison

| Right | GDPR | CCPA/CPRA | LGPD (Brazil) | PIPL (China) | PIPEDA (Canada) | PDPA (Singapore) |
|-------|------|-----------|---------------|-------------|-----------------|------------------|
| Access | Yes (1 mo) | Yes (45 days) | Yes | Yes | Yes (30 days) | Yes (30 days) |
| Correction | Yes | Yes (CPRA) | Yes | Yes | Yes | Yes |
| Deletion | Yes (exceptions) | Yes (9 exceptions) | Yes | Yes | Yes (exceptions) | No general right |
| Portability | Yes (consent/contract only) | Yes (CPRA) | Yes | Yes (limited) | Limited | Yes (2020 amendment) |
| Object to processing | Yes | Opt out of sale/sharing | Limited | Yes | Withdraw consent | Withdraw consent |
| Restrict processing | Yes | Limit sensitive PI use | Limited | Yes | Limited | No |
| Automated decisions | Yes (Art. 22) | Limited (profiling opt-out) | Yes | Yes (Art. 24) | Limited | No |
| Non-discrimination | Limited (Art. 22) | Yes (1798.125) | No specific | No specific | No specific | No specific |

### Common Exceptions to Rights Across Jurisdictions

Most privacy laws recognize similar categories of exceptions:

- **Legal obligations:** Compliance with a legal obligation requiring retention or processing (all jurisdictions).
- **Legal claims:** Data needed for the establishment, exercise, or defense of legal claims (GDPR Art. 17(3)(e), most state laws).
- **Security:** Processing necessary for detecting security incidents or protecting against fraud (CCPA, state laws).
- **Free expression:** Exercising the right of freedom of expression and information (GDPR Art. 17(3)(a)).
- **Public health:** Processing for public health purposes (GDPR Art. 17(3)(c)).
- **Archiving/research:** Archiving in the public interest, scientific or historical research, or statistical purposes where erasure would render impossible or seriously impair the research (GDPR Art. 17(3)(d)).
- **Contractual necessity:** Completing a transaction or performing a contract with the consumer (CCPA exception 9).
- **Verification failure:** If the business cannot verify the requestor's identity, it may deny the request (all US jurisdictions).

### Processor/Service Provider Obligations for Rights Fulfillment

- **GDPR (Art. 28(3)(e)):** Processors must assist the controller in fulfilling data subject rights requests, taking into account the nature of processing.
- **CCPA (1798.105(c)):** Service providers must comply with the business's instruction to delete, and must notify their own service providers/contractors to delete.
- **Contractual allocation:** DPAs should specify: (a) who receives the request, (b) notification timelines between processor and controller, (c) cooperation obligations, (d) cost allocation for request fulfillment, and (e) technical capabilities for data retrieval, correction, deletion, and portability export.

### Manifestly Unfounded or Excessive Requests

Both GDPR and several US state laws allow controllers to refuse or charge a fee for requests that are manifestly unfounded or excessive:

- **GDPR (Art. 12(5)):** The controller may charge a reasonable fee or refuse to act when requests are manifestly unfounded or excessive, particularly where repetitive. The controller bears the burden of demonstrating that the request is manifestly unfounded or excessive.
- **CCPA/CPRA:** Businesses may deny requests that are manifestly unfounded or excessive. If denying, the business must inform the consumer and provide an explanation. There is no fee mechanism — businesses may only deny or fulfill.
- **Practical threshold:** Mere volume of requests from a single individual is not sufficient to establish "excessive." The controller must demonstrate that the requests are unreasonable in context. Regulators have been skeptical of excessive/unfounded claims.

### Identity Verification for Rights Requests

- **GDPR:** The controller may request additional information to confirm the data subject's identity when there are reasonable doubts. The controller must not collect more information than necessary for verification. If the controller cannot identify the data subject, it may refuse to act (but must inform the data subject and explain the reasons).
- **CCPA/CPRA:** Verification requirements are tiered: requests to know categories of PI require matching **at least 2 data points**; requests to know specific pieces or to delete require matching **at least 3 data points** to a "reasonably high degree of certainty." Password-protected accounts may use existing authentication.
- **US State Laws:** Most follow the CCPA model of reasonable verification. No state law requires a specific verification method, but the method must be proportionate to the sensitivity of the data and the nature of the request.

## Interaction with Other Areas

- **Employment:** Employee rights requests under GDPR and CCPA (post-exemption expiration) require HR-specific procedures. Employee data often spans multiple systems (HRIS, email, performance management), creating complex fulfillment challenges. Some jurisdictions exempt employee data or apply delayed timelines.
- **IP and Technology:** Data portability rights affect technology product design — systems must be capable of exporting personal data in structured, machine-readable formats. Deletion rights require the ability to identify and remove all instances of personal data across systems, backups, and archives.
- **Litigation:** Litigation holds may conflict with deletion requests. Under GDPR, the "legal claims" exception permits retention of data needed for ongoing or reasonably anticipated litigation. Under CCPA, a similar exception applies. Document retention policies must account for the intersection of deletion rights and litigation preservation obligations.
- **Consumer Protection:** The non-discrimination requirement under CCPA means that businesses cannot use differential pricing or service quality to penalize consumers who exercise their rights. Financial incentive programs must be genuinely optional and based on a good-faith estimate of the value of the consumer's data.

## Sources

- [GDPR Articles 15-22 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Data subject rights provisions
- [EDPB Guidelines on Data Subject Rights](https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en) — Including guidelines on right of access, right to erasure, and data portability
- [CCPA/CPRA Consumer Rights — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5) — Cal. Civ. Code 1798.100-1798.125
- [CPPA Regulations on Consumer Rights](https://cppa.ca.gov/regulations/) — Implementing regulations on verification, authorized agents, and request processing

---
## Gdpr

# GDPR (General Data Protection Regulation)

## Applicability

The EU General Data Protection Regulation (Regulation 2016/679) applies when ANY of the following are true:

- The data controller or processor is established in the EU/EEA, regardless of where processing takes place (Art. 3(1)).
- The organization offers goods or services to data subjects in the EU/EEA, whether or not payment is required (Art. 3(2)(a)).
- The organization monitors the behavior of data subjects within the EU/EEA (Art. 3(2)(b)).
- The UK GDPR (retained EU law post-Brexit, as amended by UK Data Protection Act 2018) applies separately to UK data subjects — requirements are substantively similar but enforced by the ICO under a separate regime.

Territorial scope is broad: a US-based SaaS company with EU customers is subject to GDPR. No establishment in the EU is required if the company targets or monitors EU individuals.

## Key Requirements

### Lawful Basis for Processing (Article 6)

Every processing activity must rely on exactly one of six lawful bases:
- **(a) Consent** — Freely given, specific, informed, and unambiguous. Must be as easy to withdraw as to give. Cannot be bundled with terms of service acceptance. See `consent-mechanics.md`.
- **(b) Contract performance** — Processing necessary for performance of a contract with the data subject, or to take pre-contractual steps at the data subject's request.
- **(c) Legal obligation** — Processing necessary to comply with a legal obligation to which the controller is subject (EU or member state law).
- **(d) Vital interests** — Processing necessary to protect the vital interests of the data subject or another person. Narrowly construed; rarely applicable in commercial contexts.
- **(e) Public task** — Processing necessary for a task carried out in the public interest or in the exercise of official authority. Primarily applicable to public bodies.
- **(f) Legitimate interests** — Processing necessary for the legitimate interests of the controller or a third party, unless overridden by the data subject's interests. Requires a documented balancing test. Not available to public authorities for their core tasks.

**Special categories (Article 9):** Processing of racial/ethnic origin, political opinions, religious/philosophical beliefs, trade union membership, genetic data, biometric data for identification, health data, or sex life/orientation requires an additional legal basis under Article 9(2), most commonly explicit consent or employment/social protection necessity.

### Controller vs. Processor Obligations

- **Controller** (Art. 4(7)): Determines the purposes and means of processing. Bears primary accountability for compliance, including lawful basis determination, privacy notices, DPIAs, and breach notification to supervisory authorities.
- **Processor** (Art. 4(8)): Processes personal data on behalf of the controller. Must act only on documented instructions. Must assist with data subject rights, breach notification, and DPIAs. Must delete or return data at end of services.
- **Joint controllers** (Art. 26): When two or more controllers jointly determine purposes and means, they must enter a transparent arrangement allocating GDPR responsibilities and designate a contact point for data subjects.

### Data Processing Agreements (Article 28)

Controllers must have a written contract with every processor, containing mandatory provisions:
- **What**: Subject matter, duration, nature and purpose of processing, types of personal data, categories of data subjects.
- **Processor obligations**: Process only on documented instructions; ensure personnel confidentiality; implement appropriate technical and organizational security measures; assist with data subject rights and breach notification; delete or return data on termination; make available all information necessary and allow audits.
- **Sub-processors**: Processor must obtain prior specific or general written authorization before engaging sub-processors; must impose equivalent obligations on sub-processors; remains fully liable for sub-processor compliance.
- **Consequence**: Processing without a compliant DPA is itself a violation, exposable to fines under Article 83(4) — up to EUR 10 million or 2% of global annual turnover.

See `data-processing-agreements.md` for full DPA clause requirements.

### Data Protection Impact Assessments (Article 35)

- **What**: A DPIA is mandatory before processing that is likely to result in a high risk to the rights and freedoms of individuals.
- **Threshold/Triggers**: Required for (a) systematic and extensive profiling with significant effects, (b) large-scale processing of special categories or criminal conviction data, (c) systematic monitoring of publicly accessible areas at large scale. National supervisory authorities publish lists of additional triggers.
- **Content**: Must describe the processing, assess necessity and proportionality, identify risks, and specify mitigation measures.
- **Consequence**: Failure to conduct a required DPIA is a violation under Article 83(4) — fines up to EUR 10 million or 2% of global annual turnover.
- **Prior consultation (Article 36)**: If the DPIA indicates high residual risk that the controller cannot mitigate, the controller must consult the supervisory authority before processing.

### Data Breach Notification (Articles 33-34)

- **What**: Controllers must notify the competent supervisory authority of a personal data breach.
- **Timeline**: Within 72 hours of becoming aware of the breach. If notification is delayed beyond 72 hours, the controller must provide reasons for the delay.
- **Content**: Nature of breach, categories and approximate number of data subjects and records, contact details of DPO, likely consequences, and measures taken or proposed.
- **Data subject notification (Art. 34)**: Required without undue delay when the breach is likely to result in a high risk to the rights and freedoms of individuals. Not required if the controller has applied effective encryption or other measures that render the data unintelligible, or has taken subsequent measures that eliminate the high risk.
- **Processor obligation**: Processors must notify the controller without undue delay after becoming aware of a breach.
- **Consequence**: Failure to notify is a violation under Article 83(4) — fines up to EUR 10 million or 2% of global annual turnover.

See `breach-notification.md` for cross-jurisdiction comparison.

### Data Subject Rights (Articles 15-22)

- **Right of access (Art. 15)**: Copy of personal data and information about processing. Response within 1 month, extendable by 2 months for complex requests.
- **Right to rectification (Art. 16)**: Correction of inaccurate data without undue delay.
- **Right to erasure / "right to be forgotten" (Art. 17)**: Deletion when data is no longer necessary, consent is withdrawn, the data subject objects, or processing is unlawful. Subject to exceptions for legal claims, public interest, and legal obligations.
- **Right to restriction (Art. 18)**: Marking of stored data to limit future processing in specified circumstances.
- **Right to data portability (Art. 20)**: Receive personal data in a structured, commonly used, machine-readable format and transmit to another controller. Applies only to data provided by the data subject and processed by automated means on the basis of consent or contract.
- **Right to object (Art. 21)**: Object to processing based on legitimate interests or public task. Controller must cease processing unless it demonstrates compelling legitimate grounds. Absolute right to object to direct marketing processing.
- **Automated decision-making (Art. 22)**: Right not to be subject to decisions based solely on automated processing, including profiling, that produce legal or similarly significant effects. Exceptions for contract performance, legal authorization, or explicit consent — with safeguards.
- **Consequence**: Violation of data subject rights is subject to fines under Article 83(5) — up to EUR 20 million or 4% of global annual turnover.

See `data-subject-rights.md` for cross-jurisdiction rights comparison.

### Records of Processing Activities (Article 30)

- **What**: Controllers must maintain written records documenting each processing activity, including purposes, data categories, recipients, transfers, retention periods, and security measures.
- **Threshold**: Mandatory for organizations with 250+ employees. Also mandatory for smaller organizations if processing is not occasional, includes special categories/criminal conviction data, or is likely to result in a risk to data subjects' rights.
- **Consequence**: Failure to maintain records is a violation under Article 83(4).

### Data Protection by Design and by Default (Article 25)

- **What**: Controllers must implement appropriate technical and organizational measures at the time of determining the means of processing and at the time of processing itself, to integrate data protection into processing activities.
- **By default**: Only personal data necessary for each specific purpose is processed. This applies to the amount collected, extent of processing, storage period, and accessibility.
- **Consequence**: Violation subject to fines under Article 83(4).

### Data Protection Officer (Article 37)

- **What**: Appointment of a DPO is mandatory for (a) public authorities and bodies, (b) organizations whose core activities consist of processing requiring regular and systematic monitoring of data subjects on a large scale, or (c) organizations whose core activities consist of large-scale processing of special categories or criminal conviction data.
- **Independence**: The DPO must not receive instructions regarding the exercise of their tasks, must not be dismissed or penalized for performing their tasks, and must report directly to the highest level of management.
- **Consequence**: Failure to appoint a required DPO is a violation under Article 83(4).

### Cross-Border Transfers (Articles 44-49)

- **What**: Transfers of personal data to countries outside the EEA are restricted unless an adequate level of protection is ensured.
- **Mechanisms**: Adequacy decision (Art. 45), Standard Contractual Clauses (Art. 46(2)(c)), Binding Corporate Rules (Art. 47), or derogations (Art. 49 — consent, contract necessity, legal claims, public interest, vital interests).
- **Post-Schrems II**: SCCs alone may be insufficient; controllers must conduct Transfer Impact Assessments and apply supplementary measures where the destination country's laws do not provide essentially equivalent protection.

See `cross-border-transfers.md` for detailed transfer mechanism guidance.

### Fines and Enforcement (Article 83)

Two tiers of administrative fines:
- **Lower tier (Art. 83(4))**: Up to EUR 10 million or 2% of total worldwide annual turnover, whichever is higher. Applies to violations of controller/processor obligations, DPO requirements, certification body obligations.
- **Upper tier (Art. 83(5))**: Up to EUR 20 million or 4% of total worldwide annual turnover, whichever is higher. Applies to violations of processing principles, lawful basis, consent conditions, data subject rights, and cross-border transfer rules.
- National supervisory authorities have investigative, corrective, and advisory powers (Art. 58), including ordering cessation of processing.
- Data subjects have the right to lodge complaints with supervisory authorities (Art. 77) and the right to an effective judicial remedy (Art. 79).
- Data subjects have the right to compensation for material and non-material damage resulting from GDPR violations (Art. 82).

## Interaction with Other Areas

- **Consumer Protection:** GDPR consent and transparency requirements overlap with unfair commercial practices when consumer data is involved in marketing or sales. Cookie consent under the ePrivacy Directive adds a separate layer.
- **Employment:** Employee data processing triggers GDPR obligations, including lawful basis for HR processing, employee monitoring rules, and works council consultation requirements in some member states.
- **IP and Technology:** SaaS and technology agreements almost always involve personal data processing, requiring DPA attachments and technical security measures. Open-source and AI model training involving personal data triggers purpose limitation analysis.
- **International Trade:** Data localization requirements and cross-border transfer restrictions may conflict with data flow provisions in trade agreements.
- **Financial Services:** GDPR interacts with financial services regulations (PSD2, AML directives) where both regimes apply to the same data. Anti-money laundering processing must still have a lawful basis and respect data minimization.
- **Data Privacy (CCPA/CPRA):** Companies subject to both must harmonize DPAs and privacy notices. GDPR's higher standard typically satisfies CCPA requirements, but the reverse is not always true.

## Sources

- [Regulation (EU) 2016/679 (GDPR) — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Full text of the GDPR
- [EDPB Guidelines and Recommendations](https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en) — Authoritative interpretive guidance
- [UK GDPR and Data Protection Act 2018](https://www.legislation.gov.uk/ukpga/2018/12/contents/enacted) — UK regime post-Brexit
- [CJEU Schrems II Decision (C-311/18)](https://curia.europa.eu/juris/liste.jsf?num=C-311/18) — Invalidation of Privacy Shield, SCC guidance

---
## International

# International Privacy Laws (Non-US, Non-EU)

## Applicability

This file covers comprehensive data protection laws outside the United States and European Union. Load when parties, data subjects, or data processing activities are located in or target individuals in the jurisdictions below. Each jurisdiction's law operates independently — compliance with GDPR or CCPA does not guarantee compliance with these regimes.

## Key Requirements

### Canada — PIPEDA and Provincial Laws

- **Statute:** Personal Information Protection and Electronic Documents Act (S.C. 2000, c. 5). Applies to private-sector organizations collecting, using, or disclosing personal information in the course of commercial activities across provincial or national borders, or within provinces without substantially similar legislation.
- **Provincial override:** Quebec's Law 25 (modernizing private-sector privacy law, fully effective September 2024), Alberta PIPA, and British Columbia PIPA are deemed "substantially similar" and apply in place of PIPEDA for intra-provincial commercial activities.
- **Consent:** Meaningful consent required — must be reasonable for the purpose, and individuals must understand what they are consenting to. Implied consent permitted for non-sensitive information where purposes would be obvious to a reasonable person. **Explicit consent** required for sensitive information (health, financial, children's data).
- **Breach notification:** Mandatory reporting to the **Privacy Commissioner of Canada** and notification to affected individuals when there is a **real risk of significant harm** (RROSH). Notification must be given **as soon as feasible** after the breach. Organizations must maintain records of all breaches for **24 months**.
- **Cross-border transfers:** No outright prohibition, but the transferring organization remains accountable. Must use contractual or other means to provide a comparable level of protection. Quebec Law 25 requires a **privacy impact assessment** before transferring personal information outside Quebec and prohibits transfers to jurisdictions without adequate protection unless contractual safeguards are in place.
- **Penalties:** Maximum fine of **CAD $100,000** per violation under PIPEDA. Quebec Law 25 penalties up to **CAD $25 million** or **4% of worldwide turnover**.
- **GDPR adequacy:** Canada has an EU adequacy decision for PIPEDA-covered transfers (commercial activities only; does not cover employee data or provincial-law-only processing).

### Brazil — LGPD

- **Statute:** Lei Geral de Proteção de Dados (Law No. 13,709/2018, effective September 2020). Enforced by the Autoridade Nacional de Proteção de Dados (ANPD).
- **Scope:** Applies to any processing of personal data carried out in Brazil, directed at individuals in Brazil, or where personal data was collected in Brazil — regardless of where the processor is located.
- **Lawful bases:** Ten legal bases including consent, legitimate interest, contract performance, legal/regulatory obligation, exercise of rights in judicial/administrative proceedings, protection of life, health protection, research, credit protection, and regular exercise of rights.
- **Data protection officer:** Appointment of a DPO (encarregado) is required for all controllers. The ANPD may establish complementary rules, including exemptions for small processing agents.
- **Breach notification:** Controllers must notify the ANPD and affected data subjects within a **reasonable timeframe** when the breach may cause relevant risk or damage. The ANPD recommends notification within **2 business days** of becoming aware of the breach.
- **Cross-border transfers:** Permitted to countries with adequate protection (as determined by the ANPD), under SCCs, BCRs, cooperation agreements, or with specific and prominent consent.
- **Penalties:** Administrative fines up to **2% of revenue in Brazil** per violation, capped at **BRL 50 million** (~USD 10 million) per violation. Also includes publicization of the infraction, blocking or deletion of data, and daily fines.
- **Data subject rights:** Confirmation of processing, access, correction, anonymization/blocking/deletion of unnecessary or excessive data, portability, information about sharing, revocation of consent, and the right to petition the ANPD.

### Singapore — PDPA

- **Statute:** Personal Data Protection Act 2012 (No. 26 of 2012), as amended in 2020. Enforced by the Personal Data Protection Commission (PDPC).
- **Consent:** Required for collection, use, and disclosure. Deemed consent provisions for reasonable expectations and contractual necessity (2020 amendments). Legitimate interests exception added in 2020 for business improvement, operational efficiency, and similar purposes (with conditions).
- **Do Not Call Registry:** Organizations must check the DNC Registry before sending marketing messages to Singapore telephone numbers.
- **Breach notification:** Mandatory notification to the PDPC within **3 calendar days** of assessing that the breach is notifiable (significant harm to individuals or affecting 500+ individuals). Must assess within **30 calendar days** of becoming aware of the breach. Affected individuals must be notified as soon as practicable.
- **Cross-border transfers:** Permitted if the recipient is bound by legally enforceable obligations (contractual or otherwise) to provide a comparable standard of protection. No adequacy framework — relies on contractual or binding corporate rules.
- **Penalties:** Financial penalties up to **SGD 1 million** or **10% of annual turnover** in Singapore (whichever is higher, for organizations with turnover exceeding SGD 10 million). Criminal liability for egregious mishandling of personal data.
- **Data protection officer:** Mandatory appointment of at least one DPO.

### China — PIPL

- **Statute:** Personal Information Protection Law (effective November 1, 2021). Administered by the Cyberspace Administration of China (CAC).
- **Scope:** Extraterritorial — applies to processing of personal information of individuals within China, even by organizations outside China, when processing is for the purpose of providing products/services to or analyzing/assessing behavior of individuals within China.
- **Consent:** Separate consent required for processing sensitive personal information, cross-border transfers, public disclosure, and provision to third parties. Consent must be informed, voluntary, and explicit for sensitive processing.
- **Cross-border transfers:** Require one of: (a) security assessment organized by the CAC (mandatory for critical information infrastructure operators and processors handling personal information of **1 million+ individuals** or transferring information of **100,000+ individuals** or **10,000+ individuals' sensitive PI** cumulatively since January 1 of the prior year), (b) personal information protection certification, (c) standard contract filed with the CAC, or (d) other conditions per laws/regulations.
- **Data localization:** Critical information infrastructure operators (CIIOs) and processors handling personal information reaching CAC-specified volume thresholds must store personal information within China. Cross-border transfer requires security assessment.
- **Breach notification:** Must immediately notify the relevant department and affected individuals when a breach occurs or is likely to occur. Notice must include the types of information involved, cause, potential harm, remedial measures, and contact information.
- **Penalties:** Fines up to **RMB 50 million** (~USD 7 million) or **5% of prior year's annual revenue** for serious violations. Responsible individuals may be fined **RMB 100,000 to 1 million** and prohibited from serving as director, supervisor, or senior manager. Business licenses may be revoked.
- **Data subject rights:** Right to know, decide, restrict, refuse, access, copy, correct, delete personal information, and request explanation of automated decision-making rules.

### Australia — Privacy Act 1988 / APPs

- **Statute:** Privacy Act 1988 (Cth), including the Australian Privacy Principles (APPs). Enforced by the Office of the Australian Information Commissioner (OAIC).
- **Scope:** Applies to Australian government agencies and organizations with annual turnover exceeding **AUD 3 million**. Also applies to smaller organizations in health services, trading in personal information, credit reporting, Commonwealth contracts, and employee records of organizations otherwise covered.
- **Consent:** Not always required — the APPs use a broader framework based on reasonable expectations and primary/related secondary purposes. Consent required for sensitive information (health, genetic, biometric, criminal record, race/ethnicity, political opinions, religion, sexual orientation, trade union membership).
- **Breach notification (Notifiable Data Breaches scheme):** Mandatory notification to the OAIC and affected individuals when an eligible data breach occurs — where unauthorized access or disclosure is **likely to result in serious harm**. Must notify **as soon as practicable** after becoming aware. Assessment must be completed within **30 days** of suspecting a breach.
- **Cross-border disclosure (APP 8):** Before disclosing personal information overseas, the disclosing entity must take **reasonable steps** to ensure the overseas recipient does not breach the APPs. The disclosing entity is accountable for breaches by the overseas recipient unless an exception applies (e.g., consent, legal requirement, Cloud Act).
- **Penalties:** Civil penalties up to **AUD 50 million**, or **3 times the benefit obtained**, or **30% of adjusted turnover** — whichever is greatest (2022 amendments).
- **Ongoing reform:** The Privacy Act Review Report (2023) proposes significant reforms including a statutory tort for serious invasions of privacy, expanded coverage to small businesses, and stronger enforcement. Monitor for legislative implementation.

### Japan — APPI

- **Statute:** Act on Protection of Personal Information (Act No. 57 of 2003, as amended 2020/2022). Enforced by the Personal Information Protection Commission (PPC).
- **Cross-border transfers:** Provision to a third party in a foreign country requires one of: (a) consent after informing the individual of the destination country's regime, (b) transfer to a country recognized by the PPC as having equivalent protections (EU/UK recognized), (c) transfer to a recipient with an equivalent system (BCR equivalent, APEC CBPR).
- **Breach notification:** Mandatory reporting to the PPC and notification to affected individuals when a breach involves sensitive personal information, involves potential property damage, involves wrongful intent, or affects **1,000+ individuals**. Must report **promptly** (preliminary) and within **30 days** (or 60 days for wrongful intent breaches).
- **Penalties:** Criminal penalties for database misuse — imprisonment up to **1 year** or fine up to **JPY 500,000** for individuals; fines up to **JPY 100 million** for corporations. Administrative orders backed by criminal penalties for non-compliance.
- **EU adequacy:** Mutual adequacy recognition between Japan and the EU (2019), with supplementary rules for data received from the EU.

### South Korea — PIPA

- **Statute:** Personal Information Protection Act (Act No. 16930, as amended 2023). Enforced by the Personal Information Protection Commission (PIPC).
- **Consent:** Strict consent requirements with specific disclosure obligations. Separate consent required for third-party provision, cross-border transfers, and processing beyond the collected purpose.
- **Breach notification:** Must notify affected individuals **without delay** and report to the PIPC when a breach affects **1,000+ individuals** or involves sensitive/unique identification information.
- **Cross-border transfers:** 2023 amendments permit transfers based on (a) consent, (b) transfer to countries/international organizations with adequate protections recognized by the PIPC, (c) contractual safeguards, or (d) PIPC-approved certification.
- **Penalties:** Fines up to **3% of related revenue** or **KRW 2 billion** (~USD 1.5 million). Criminal penalties including imprisonment up to **5 years** for certain violations.
- **EU adequacy:** South Korea received an EU adequacy decision in December 2021.

### India — DPDP Act 2023

- **Statute:** Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023). Enforced by the Data Protection Board of India (once constituted).
- **Scope:** Applies to processing of digital personal data within India, and to processing outside India if related to offering goods/services or profiling individuals in India.
- **Lawful basis:** Consent (free, specific, informed, unconditional, unambiguous, with clear affirmative action) or "legitimate uses" (specified purposes such as employment, medical emergency, state functions).
- **Consent manager:** A registered consent manager may manage consent on behalf of data principals (a new concept in global privacy law).
- **Cross-border transfers:** Permitted to all countries except those specifically restricted by the Central Government via notification. The government may blacklist specific countries but has not yet done so as of early 2026.
- **Breach notification:** Data fiduciaries must notify the Data Protection Board and affected data principals of any personal data breach. Timelines to be specified in rules (not yet finalized as of early 2026).
- **Penalties:** Fines up to **INR 250 crore** (~USD 30 million) per violation for failure to take reasonable security safeguards. Other violations carry fines up to **INR 50-200 crore** depending on the obligation breached. **No private right of action** — enforcement through the Data Protection Board only.
- **Significant data fiduciaries:** Entities designated by the government face additional obligations including DPO appointment, independent audit, and data protection impact assessments.

## Interaction with Other Areas

- **Data Privacy (GDPR):** EU adequacy decisions enable smoother data transfers to recognized jurisdictions (Japan, South Korea, Canada for commercial data, UK, New Zealand, etc.). Non-adequate jurisdictions require SCCs or other mechanisms even when local law is robust. PIPL and LGPD have structural similarities to GDPR but with significant differences in cross-border transfer mechanisms.
- **International Trade:** Data localization requirements (China, Russia, certain sectors in India/Vietnam) interact with trade agreements and sanctions. Cross-border data flows may implicate export control and sanctions considerations. US-China tech restrictions may affect data transfer architectures.
- **Corporate:** International corporate structures (subsidiaries, branches, joint ventures) must account for each jurisdiction's data protection requirements in intra-group data sharing agreements. PIPL and PIPA require specific contractual frameworks for intra-group transfers.
- **Financial Services:** Many jurisdictions impose sector-specific data protection requirements for financial institutions that layer on top of general privacy laws (e.g., Singapore's MAS guidelines, Japan's FSA requirements, India's RBI data localization for payments).
- **Employment:** Employee data handling across international operations must comply with local employment and privacy law intersections. In particular, Korean and Japanese laws have strict requirements for employee consent, and Chinese law requires separate consent for cross-border HR data transfers.

### International Breach Notification Comparison

| Jurisdiction | Authority Timeline | Individual Timeline | Harm Threshold |
|-------------|-------------------|-------------------|----------------|
| Canada (PIPEDA) | As soon as feasible | As soon as feasible | Real risk of significant harm |
| Brazil (LGPD) | Reasonable (2 biz days recommended) | Reasonable timeframe | Relevant risk or damage |
| Singapore (PDPA) | **3 calendar days** after assessment | As soon as practicable | Significant harm or 500+ individuals |
| Australia (APPs) | As soon as practicable | As soon as practicable | Likely serious harm |
| Japan (APPI) | Promptly + **30 days** full report | Promptly | Sensitive PI, 1,000+ individuals, or wrongful intent |
| South Korea (PIPA) | Without delay | Without delay | 1,000+ individuals or sensitive data |
| China (PIPL) | Immediately | Immediately | Any breach or likely breach |
| India (DPDP) | Per rules (TBD) | Per rules (TBD) | Any personal data breach |

### International Cross-Border Transfer Mechanisms

| Jurisdiction | Adequacy Framework | Contractual Mechanism | Other Mechanisms |
|-------------|-------------------|----------------------|------------------|
| Canada (PIPEDA) | No formal framework | Contractual accountability | Transferor remains accountable |
| Brazil (LGPD) | ANPD adequacy (pending) | SCCs (pending ANPD approval) | Specific and prominent consent |
| Singapore (PDPA) | No formal framework | Legally enforceable obligations | BCR equivalents |
| China (PIPL) | No outbound adequacy | CAC standard contract | Security assessment, certification |
| Japan (APPI) | PPC-recognized countries | Equivalent system at recipient | Consent with destination disclosure |
| South Korea (PIPA) | PIPC-recognized countries | Contractual safeguards | PIPC-approved certification |
| India (DPDP) | Blacklist model (all except restricted) | Not yet specified | Government restriction by notification |

## Sources

- [PIPEDA Full Text — Justice Laws, Canada](https://laws-lois.justice.gc.ca/eng/acts/P-8.6/) — Personal Information Protection and Electronic Documents Act
- [LGPD Full Text — Planalto, Brazil](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) — Lei Geral de Proteção de Dados (Portuguese)
- [PDPA Full Text — Singapore Statutes Online](https://sso.agc.gov.sg/Act/PDPA2012) — Personal Data Protection Act 2012
- [PIPL Full Text — NPC Observer](https://www.npcobserver.com/legislation/personal-information-protection-law/) — English translation of China's Personal Information Protection Law
- [Privacy Act 1988 — Federal Register of Legislation, Australia](https://www.legislation.gov.au/Details/C2023C00130) — Including Australian Privacy Principles
- [APPI — PPC Japan](https://www.ppc.go.jp/en/legal/) — Act on Protection of Personal Information (English)
- [PIPA — PIPC South Korea](https://www.pipc.go.kr/np/cop/bbs/selectBoardList.do?bbsId=BS074&mCode=C020010000) — Personal Information Protection Act
- [DPDP Act 2023 — India Code](https://www.indiacode.nic.in/handle/123456789/19833) — Digital Personal Data Protection Act

---
## Us State Privacy

# US State Privacy Laws (Non-California)

## Applicability

A growing number of US states have enacted comprehensive consumer privacy laws. These laws vary in scope, consumer rights, business obligations, and enforcement mechanisms, creating a patchwork of requirements. This file covers laws outside of California (see `ccpa-cpra.md` for CCPA/CPRA). As of early 2026, over 15 states have enacted comprehensive privacy legislation.

Load this sub-file when the company operates in, is incorporated in, or targets residents of states with comprehensive privacy laws, or when structuring multi-state compliance programs.

## Key Requirements

### Virginia — VCDPA (effective January 1, 2023)

- **Scope thresholds:** Entities conducting business in Virginia or targeting Virginia residents that (a) control or process personal data of **100,000+ consumers**, OR (b) control or process personal data of **25,000+ consumers** and derive **50%+ of gross revenue** from the sale of personal data.
- **Consumer rights:** Access, correct, delete, data portability, opt out of targeted advertising, opt out of sale, opt out of profiling in furtherance of decisions producing legal or similarly significant effects.
- **Sensitive data:** Requires **opt-in consent** for processing. Includes racial/ethnic origin, religious beliefs, mental/physical health diagnosis, sexual orientation, citizenship/immigration status, genetic or biometric data, children's data, and precise geolocation.
- **Data protection assessments:** Required for targeted advertising, sale of personal data, processing of sensitive data, profiling, and any processing presenting a heightened risk of harm.
- **Enforcement:** AG enforcement only. **No private right of action.** 30-day cure period (sunsets July 1, 2025). Civil penalties under the Virginia Consumer Protection Act — up to **$7,500 per violation**.
- **Processor contracts:** Controllers must enter into contracts with processors that set out processing instructions, nature and purpose, data type, duration, and rights/obligations. Processor must assist with DPAs, breach notification, and security. Must require sub-processor contracts with equivalent obligations.

### Colorado — CPA (effective July 1, 2023)

- **Scope thresholds:** Entities conducting business in Colorado or targeting Colorado residents that (a) control or process personal data of **100,000+ consumers** per year, OR (b) control or process personal data of **25,000+ consumers** and derive revenue or receive a discount from the sale of personal data.
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, opt out of sale, opt out of profiling. Notably includes a **right to opt out via universal opt-out mechanism** (e.g., Global Privacy Control) — mandatory recognition required.
- **Sensitive data:** Opt-in consent required. Includes racial/ethnic origin, religious beliefs, mental/physical health, sexual orientation, citizenship/immigration status, genetic data, biometric data, and personal data of a **known child**.
- **Data protection assessments:** Required for targeted advertising, sale, sensitive data processing, profiling, and processing presenting a heightened risk of harm.
- **Enforcement:** AG and District Attorneys. **No private right of action.** 60-day cure period (sunsets January 1, 2025).

### Connecticut — CTDPA (effective July 1, 2023)

- **Scope thresholds:** Entities conducting business in Connecticut or targeting Connecticut residents that (a) control or process personal data of **100,000+ consumers** (excluding data solely for payment transactions), OR (b) control or process personal data of **25,000+ consumers** and derive **25%+ of gross revenue** from sale of personal data.
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, sale, and profiling. Must recognize **universal opt-out mechanisms** effective January 1, 2025.
- **Sensitive data:** Opt-in consent required. Similar categories to Virginia plus **transgender/non-binary status** (as of 2023 amendments).
- **Enforcement:** AG enforcement only. **No private right of action.** 60-day cure period (sunsets December 31, 2024).

### Utah — UCPA (effective December 31, 2023)

- **Scope thresholds:** Entities conducting business in Utah or targeting Utah residents, with **annual revenue of $25 million or more**, AND either (a) control or process personal data of **100,000+ consumers** per year, OR (b) derive **50%+ of gross revenue** from sale of personal data and process data of **25,000+ consumers**.
- **Consumer rights:** Access, delete, portability, opt out of targeted advertising, opt out of sale. Notably **no right to correct**.
- **Sensitive data:** Opt-in consent required. Standard categories (racial/ethnic origin, religious beliefs, health, sexual orientation, citizenship, genetic, biometric, children's data, precise geolocation).
- **Data protection assessments:** **Not required** — Utah is the only major state law without this obligation.
- **Enforcement:** AG enforcement only. **No private right of action.** 30-day cure period (no sunset).

### Texas — TDPSA (effective July 1, 2024)

- **Scope thresholds:** **No revenue threshold.** Applies to any entity conducting business in Texas or targeting Texas residents that processes personal data and is **not a small business** as defined by the SBA. Notably broad applicability.
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, sale, and profiling.
- **Sensitive data:** Opt-in consent required. Broad definition including standard categories.
- **Enforcement:** AG enforcement with **30-day cure period**. Civil penalties up to **$7,500 per violation**. **No private right of action** (except for violations related to biometric data, which allows private action under the Texas CUBI Act).

### Oregon — OCPA (effective July 1, 2024)

- **Scope thresholds:** Entities conducting business in Oregon or targeting Oregon residents that (a) control or process personal data of **100,000+ consumers**, OR (b) control or process personal data of **25,000+ consumers** while deriving **25%+ of annual gross revenue** from selling personal data.
- **Notable distinction:** Applies to **non-profit organizations**, unlike most state privacy laws.
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, sale, and profiling. Also includes a **right to obtain a list of specific third parties** to whom data has been disclosed.
- **Sensitive data:** Opt-in consent required. Includes standard categories plus **transgender/non-binary status** and **precise geolocation data** (within 1,750 feet).
- **Enforcement:** AG enforcement. **No private right of action.** 30-day cure period (sunsets January 1, 2026).

### Additional Enacted State Laws

- **Montana (MCDPA, effective October 1, 2024):** Thresholds of 50,000 consumers (lower due to small population). AG enforcement, 60-day cure period.
- **Iowa (ICDPA, effective January 1, 2025):** Conservative approach — limited consumer rights (access, delete, opt out of sale/targeted advertising). 90-day cure period (no sunset).
- **Indiana (INCDPA, effective January 1, 2026):** Similar to VCDPA. AG enforcement with 30-day cure period.
- **Tennessee (TIPA, effective July 1, 2025):** Unique affirmative defense for businesses that substantially comply with NIST privacy framework. AG enforcement, 60-day cure period.
- **Delaware (DPDPA, effective January 1, 2025):** Applies to entities processing data of 35,000+ consumers (or 10,000+ if deriving 20%+ revenue from sale). Notably covers non-profits. No cure period after December 31, 2025.
- **New Hampshire, New Jersey, Nebraska, Minnesota, Maryland, Rhode Island:** Each with varying effective dates from 2025-2026, thresholds, and nuances.

### Comparison Matrix — Key Dimensions

| Dimension | VA | CO | CT | UT | TX | OR |
|-----------|----|----|----|----|----|----|
| Revenue threshold | No | No | No | $25M | No (non-small-business) | No |
| Consumer threshold | 100K or 25K+revenue | 100K or 25K+revenue | 100K or 25K+revenue | 100K or 25K+revenue | N/A | 100K or 25K+revenue |
| Right to correct | Yes | Yes | Yes | **No** | Yes | Yes |
| Universal opt-out | No | **Required** | **Required** | No | No | No |
| DPA required | Yes | Yes | Yes | Yes | Yes | Yes |
| Non-profits covered | No | No | No | No | No | **Yes** |
| Private right of action | No | No | No | No | No | No |
| Cure period | 30 days | 60 days | 60 days | 30 days | 30 days | 30 days |

### Common Requirements Across Most State Laws

- Right to access, delete, and portability (with varying exceptions).
- Opt-in consent for processing of sensitive personal data.
- Opt-out right for targeted advertising and sale of personal data.
- Written processor/controller contracts with restricted processing terms.
- Reasonable data security measures.
- Privacy notice disclosing categories of data collected, purposes, rights, and whether data is sold.
- Response timelines typically **45 days**, extendable by **45 days** with notice (mirroring CCPA).

## Interaction with Other Areas

- **Data Privacy (CCPA/CPRA, GDPR):** Companies subject to multiple state laws plus CCPA and GDPR must build compliance to the most restrictive standard. Colorado and Connecticut's universal opt-out requirements may be the most restrictive for adtech arrangements.
- **Consumer Protection:** State privacy laws supplement existing state consumer protection statutes. AG enforcement may draw on both privacy-specific and general consumer protection authority (e.g., Virginia Consumer Protection Act).
- **Employment:** Most state privacy laws exempt employee data or have delayed applicability to HR data. Virginia, Colorado, and Connecticut exempt employee data in the employment context. Texas does not exempt employee data. Counsel must verify exemptions state by state.
- **IP and Technology:** Technology vendor and SaaS agreements must be updated to reflect state-specific processor requirements, including data protection assessment cooperation and universal opt-out signal support. Tennessee's NIST framework affirmative defense creates an incentive for formal privacy framework adoption.

### Data Protection Assessments

Most state laws require controllers to conduct data protection assessments for specified high-risk processing activities. Key requirements:

- **Virginia:** Required for targeted advertising, sale of personal data, processing of sensitive data, profiling, and any processing that presents a heightened risk of harm. Must weigh the benefits of processing against the potential risks to consumer rights, considering the use of de-identification, consumer expectations, and the context of processing.
- **Colorado:** Same triggers as Virginia. Must be made available to the AG upon request. The AG has published guidance on assessment content and methodology.
- **Connecticut:** Same triggers as Virginia and Colorado. Assessment must identify and weigh benefits against risks and consider safeguards to address identified risks.
- **Texas:** Required for processing that presents a heightened risk of harm. The controller must identify and weigh benefits and potential risks. Assessments must be maintained for at least **3 years** after the processing ends.
- **Tennessee unique feature:** Tennessee's TIPA provides an **affirmative defense** to AG enforcement actions for businesses that have created and complied with a written privacy program that reasonably conforms to the **NIST Privacy Framework** or comparable published standards.

### Biometric Information Privacy

Several states have enacted specific biometric information privacy laws that layer on top of comprehensive privacy statutes:

- **Illinois (BIPA, 740 ILCS 14):** Requires written consent before collecting biometric identifiers (fingerprints, retina scans, facial geometry). Provides a **private right of action** with statutory damages of **$1,000 per negligent violation** and **$5,000 per intentional/reckless violation**. The only US biometric law with a private right of action, generating significant class action litigation.
- **Texas (CUBI Act, Tex. Bus. & Com. Code 503):** Requires consent before capturing biometric identifiers. AG enforcement only — no private right of action (except for TDPSA biometric provisions). Penalties up to **$25,000 per violation**.
- **Washington (RCW 19.375):** Requires notice and consent for commercial use of biometric identifiers. AG enforcement only.
- **Interaction with comprehensive state laws:** Where both a biometric-specific law and a comprehensive privacy law apply, both must be satisfied. BIPA's private right of action makes it the most significant litigation risk in the biometric data space.

## Sources

- [Virginia VCDPA — Virginia Law](https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/) — Va. Code 59.1-575 through 59.1-585
- [Colorado CPA — Colorado Legislature](https://leg.colorado.gov/bills/sb21-190) — C.R.S. 6-1-1301 through 6-1-1313
- [Connecticut CTDPA](https://www.cga.ct.gov/2022/act/Pa/pdf/2022PA-00015-R00SB-00006-PA.PDF) — Public Act 22-15
- [Texas TDPSA — Texas Legislature](https://capitol.texas.gov/BillLookup/History.aspx?LegSess=88R&Bill=HB4) — Tex. Bus. & Com. Code Ch. 541
- [Illinois BIPA — Illinois General Assembly](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004) — 740 ILCS 14
- [IAPP US State Privacy Legislation Tracker](https://iapp.org/resources/article/us-state-privacy-legislation-tracker/) — Comprehensive tracker of all state laws
