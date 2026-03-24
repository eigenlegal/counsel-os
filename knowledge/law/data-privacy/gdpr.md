---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
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
