---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [eu]
last-reviewed: "2026-06-10"
authorities:
  - cite: "Regulation (EU) 2016/679"
    title: "General Data Protection Regulation"
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj"
  - cite: "Data (Use and Access) Act 2025 (c. 18)"
    title: "UK data protection reform act amending UK GDPR, DPA 2018, and PECR"
    url: "https://www.legislation.gov.uk/ukpga/2025/18"
  - cite: "European Commission adequacy decisions"
    title: "Adequacy decisions page, including the December 2025 UK adequacy renewal"
    url: "https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en"
  - cite: "ICO — Data (Use and Access) Act 2025"
    title: "ICO guidance on DUAA changes and commencement"
    url: "https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/"
  - cite: "Directive 2002/58/EC"
    title: "ePrivacy Directive (the proposed ePrivacy Regulation was withdrawn in 2025)"
    url: "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32002L0058"
---
# GDPR (General Data Protection Regulation)

## Source-First Use

For current US/EU privacy work, load `us-eu-core.md` before relying on this file. Use this file as a checklist for GDPR issues, then verify the current text of Regulation (EU) 2016/679, EDPB guidance, and any applicable member-state guidance before making a precise legal conclusion.

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

### Legitimate Interests Assessment (LIA) Framework

When relying on legitimate interests (Art. 6(1)(f)) as the lawful basis, controllers must conduct and document a three-part balancing test:

- **Step 1 — Purpose test:** Identify the legitimate interest pursued by the controller or a third party. The interest must be real and present (not speculative), lawful, and clearly articulated. Common legitimate interests for fintechs: fraud prevention and detection, network and information security, transaction monitoring for AML compliance, direct marketing to existing customers, and improving service quality.
- **Step 2 — Necessity test:** Is the processing necessary for the identified purpose? Could the purpose be achieved with less intrusive means? If the same objective can be accomplished with less personal data or with anonymized data, the processing fails this step.
- **Step 3 — Balancing test:** Weigh the controller's legitimate interests against the data subject's interests, rights, and freedoms. Factors include: reasonable expectations of the data subject (would they expect this processing?), nature of the data (special categories weigh heavily against the controller), impact on the data subject (what are the consequences?), relationship between the controller and the data subject (closer relationships support reasonable expectations), safeguards applied (pseudonymization, access controls, transparency), and whether the data subject is a child or vulnerable person.
- **Documentation:** The LIA must be documented in writing before processing begins and updated when circumstances change. Maintain the LIA alongside the RoPA entry for the processing activity. Be prepared to produce it on request from the supervisory authority.
- **EDPB guidance:** EDPB Guidelines 1/2024 on processing based on Article 6(1)(f) and the Article 29 Working Party Opinion 06/2014 provide the authoritative framework. The CJEU has consistently held that legitimate interests requires a case-by-case assessment.
- **Fintech-specific applications:** Fraud detection scoring is generally supported as a legitimate interest, but must be balanced against the individual's rights (especially Art. 22 if automated decisions produce legal effects). Transaction monitoring for AML is typically supported under Art. 6(1)(c) (legal obligation) rather than legitimate interests, but supplementary monitoring beyond legal requirements falls under 6(1)(f).

### Automated Decision-Making in Fintech Context (Article 22)

- **The rule:** Data subjects have the right not to be subject to decisions based solely on automated processing, including profiling, that produce "legal effects" or "similarly significant effects."
- **What qualifies in fintech:** Credit application denial, account closure or restriction, fraud flag leading to transaction block or account freeze, automated KYC rejection, insurance premium determination, and algorithmic pricing that materially affects the individual. The EDPB considers denial of financial services to be a "similarly significant effect."
- **What does NOT qualify:** Automated suggestions or recommendations that a human reviews before acting, personalization of a user interface, and internal risk scoring that does not directly affect the individual without human intervention.
- **Exceptions (Art. 22(2)):** Automated decisions are permitted if (a) necessary for entering into or performing a contract, (b) authorized by EU or member state law, or (c) based on explicit consent. In all cases, the controller must implement "suitable measures to safeguard the data subject's rights and freedoms and legitimate interests, at least the right to obtain human intervention, to express their point of view, and to contest the decision."
- **Meaningful human review:** The exception for "contract performance" (common for credit decisions) requires meaningful human intervention — not a rubber stamp. The human reviewer must have authority to override the automated decision, access to the relevant data, and genuine ability to exercise judgment.
- **Transparency:** Art. 13(2)(f) and 14(2)(g) require controllers to inform data subjects about the existence of automated decision-making, meaningful information about the logic involved, and the significance and envisaged consequences. This does not require disclosing the algorithm, but must explain the factors considered and potential outcomes in understandable terms.

### UK GDPR Divergence

- **Current status:** The UK GDPR is retained EU law as amended by the UK Data Protection Act 2018 and, now, the **Data (Use and Access) Act 2025** (royal assent June 19, 2025). Post-Brexit, the UK regime is substantively similar but increasingly diverging.
- **Data (Use and Access) Act 2025 (DUAA):** The DUAA replaced the lapsed Data Protection and Digital Information Bill and amends the UK GDPR, the DPA 2018, and PECR. Key changes include a new lawful basis of **"recognised legitimate interests"** (no balancing test required for listed purposes), relaxed rules on automated decision-making outside special-category data, a "reasonable and proportionate search" standard for DSARs, broader research provisions, changes to cookie consent exceptions under PECR, and restructured regulator powers (including higher PECR penalties). Most of the data protection provisions were commenced **February 5, 2026**; commencement is phased, so verify which provisions are in force before advising.
- **Key divergences:**
  - **Transfer mechanisms:** The UK uses the International Data Transfer Agreement (IDTA) and UK Addendum to EU SCCs, replacing the EU SCC modules for UK transfers. The UK has its own adequacy assessment process (recast by the DUAA as a "data protection test") and has granted adequacy to additional countries not recognized by the EU.
  - **UK-US Data Bridge:** The UK established the UK Extension to the EU-US Data Privacy Framework, allowing UK-US transfers for DPF-certified organizations. Operationally similar to the EU-US DPF but legally distinct.
  - **ICO enforcement approach:** The ICO has taken a more risk-based, pragmatic approach to enforcement compared to some EU DPAs. ICO reprimand letters and enforcement notices are used more frequently than fines for first-time violations.
  - **Research exemption:** The UK has broader exemptions for scientific research processing, expanded further by the DUAA.
  - **Cookie consent:** The UK's Privacy and Electronic Communications Regulations (PECR) still require cookie consent, but the DUAA adds exceptions for certain low-risk purposes (e.g., statistical/analytics cookies with notice and an opt-out) and raises PECR fines to UK GDPR levels.
- **EU adequacy decision for the UK:** The European Commission granted the UK an adequacy decision effective June 28, 2021, extended it for six months in June 2025, and — after assessing the DUAA — **renewed it on December 19, 2025 for six years, through December 27, 2031**. Monitor for any challenge or review triggered by further UK divergence.
- **Practical approach:** Maintain compliance with both EU GDPR and UK GDPR as separate regimes. Use EU SCCs with UK Addendum for combined EU/UK transfers. Designate a UK representative if required (Art. 27 equivalent).

### ePrivacy Directive and Cookie Consent

- **Authority:** Directive 2002/58/EC (ePrivacy Directive), as amended by Directive 2009/136/EC. Implemented through national laws of each EU member state (e.g., UK PECR, German TTDSG, French Loi Informatique et Libertés).
- **Scope:** Covers the processing of personal data in the electronic communications sector. Most relevant provisions: cookie consent (Art. 5(3)) and direct marketing (Art. 13).
- **Cookie consent rule (Art. 5(3)):** Storing information or accessing information already stored on a user's terminal equipment (cookies, tracking pixels, device fingerprinting, local storage) requires prior informed consent — UNLESS the storage/access is strictly necessary for the provision of a service explicitly requested by the user. This is separate from GDPR consent — both must be satisfied.
- **Strictly necessary exemption:** Session cookies for authentication, shopping cart cookies, load balancing cookies, and first-party analytics cookies configured to minimize data collection are generally considered strictly necessary. Advertising cookies, third-party tracking, and cross-site analytics are NOT strictly necessary and require consent.
- **ePrivacy Regulation (withdrawn):** The proposed ePrivacy Regulation, under negotiation since 2017, was **withdrawn by the European Commission** — announced in the 2025 Commission work programme (February 2025) and formalized in the Official Journal in October 2025 — on the ground that no co-legislator agreement was foreseeable. The ePrivacy Directive and its national implementing laws remain in force; any replacement would come through a future digital-rules package.
- **Interaction with GDPR:** ePrivacy provides lex specialis (specific rules) for electronic communications. Where ePrivacy applies, it takes precedence over GDPR's general provisions. Where ePrivacy is silent, GDPR applies. Cookie consent (ePrivacy) and lawful basis for processing the collected data (GDPR) are separate requirements.

### EDPB One-Stop-Shop and Lead Supervisory Authority

- **One-stop-shop mechanism (Art. 56):** For cross-border processing, a single "lead supervisory authority" (LSA) coordinates enforcement across all EU/EEA member states where the controller or processor operates. The LSA is determined by the location of the controller's "main establishment" — the place of central administration, or (if processing decisions are made elsewhere) the establishment where those decisions are made.
- **Determining the LSA:** If a company has its EU headquarters in Ireland, the Irish Data Protection Commission (DPC) is likely the LSA. If a company has separate entities making independent processing decisions in multiple member states, multiple LSAs may apply to different processing activities.
- **Cooperation procedure (Art. 60):** The LSA must cooperate with "concerned" supervisory authorities (CSAs) in other member states where data subjects are substantially affected. The LSA drafts a decision, shares it with CSAs, and CSAs may raise "relevant and reasoned objections." If objections cannot be resolved, the dispute goes to the EDPB for a binding decision (Art. 65).
- **Practical impact:** The one-stop-shop simplifies enforcement but does not eliminate interaction with multiple DPAs. Data subjects can still complain to their local DPA (Art. 77). Local DPAs can take urgent action (Art. 66). The LSA determination can be contested. For a fintech with EU operations, proactively establishing the main establishment and engaging with the LSA is advisable.
- **Notable enforcement:** The EDPB dispute resolution mechanism has been used in significant cases, including overriding the Irish DPC's proposed penalties for Meta (resulting in substantially higher fines). The mechanism demonstrates that the LSA does not have unchecked discretion.

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
- [Data (Use and Access) Act 2025](https://www.legislation.gov.uk/ukpga/2025/18) — 2025 UK reform act; most data protection provisions commenced February 5, 2026
- [ICO — Data (Use and Access) Act 2025](https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/) — ICO guidance on DUAA changes and commencement
- [CJEU Schrems II Decision (C-311/18)](https://curia.europa.eu/juris/liste.jsf?num=C-311/18) — Invalidation of Privacy Shield, SCC guidance
- [Art. 29 WP Opinion 06/2014 on Legitimate Interests](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2014/wp217_en.pdf) — Authoritative LIA framework
- [EDPB Guidelines on Automated Decision-Making and Profiling](https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en) — Art. 22 interpretation
- [ICO UK GDPR Guidance](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/) — UK-specific guidance and divergence
- [ePrivacy Directive 2002/58/EC](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32002L0058) — Cookie consent and electronic communications
- [EDPB Art. 65 Dispute Resolution Decisions](https://edpb.europa.eu/our-work-tools/consistency-findings/binding-decisions_en) — One-stop-shop dispute outcomes
