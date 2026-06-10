---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [eu]
---
# EU AI Act (Regulation 2024/1689)

## Applicability

The EU AI Act applies when ANY of the following are true:

- The AI system provider is established in the EU/EEA, regardless of where the system is used (Art. 2(1)(a)).
- The AI system is placed on the market or put into service in the EU, regardless of where the provider is established (Art. 2(1)(b)).
- The AI system's output is used in the EU, even if the provider and deployer are established outside the EU (Art. 2(1)(c)).
- A deployer (user) of the AI system is established in or located within the EU (Art. 2(1)(a)).

Territorial scope is broad: a US-based AI company whose model is accessed by EU users or whose outputs affect EU persons is subject to the Act. Similar to GDPR's extraterritorial reach.

**Key definitions:**
- **AI system** (Art. 3(1)): A machine-based system designed to operate with varying levels of autonomy, that may exhibit adaptiveness, and that infers from input how to generate outputs (predictions, content, recommendations, decisions) that can influence physical or virtual environments.
- **Provider**: Develops or has an AI system developed and places it on the market or puts it into service under its own name or trademark.
- **Deployer**: Any natural or legal person using an AI system under its authority, except where the system is used in a personal non-professional activity.

## Key Requirements

### Risk Classification Framework

The Act establishes four risk tiers with escalating obligations:

#### Unacceptable Risk — Prohibited Practices (Art. 5)

The following AI practices are banned outright:
- **Subliminal manipulation**: AI systems that deploy subliminal, manipulative, or deceptive techniques to materially distort behavior, causing significant harm.
- **Exploitation of vulnerabilities**: AI systems exploiting vulnerabilities of specific groups (age, disability, social/economic situation) to materially distort behavior.
- **Social scoring**: AI systems by public authorities evaluating or classifying individuals based on social behavior or personal characteristics, leading to detrimental treatment disproportionate to context.
- **Predictive policing of individuals**: AI systems making risk assessments of natural persons to predict criminal offending based solely on profiling or personality traits (crime location-based predictive policing remains permitted).
- **Untargeted facial image scraping**: Creating or expanding facial recognition databases through untargeted scraping of facial images from the internet or CCTV.
- **Emotion recognition in workplace/education**: AI inferring emotions of persons in workplace and educational settings, except for medical or safety reasons.
- **Biometric categorization (sensitive attributes)**: AI systems categorizing individuals based on biometric data to infer race, political opinions, trade union membership, religious/philosophical beliefs, sex life, or sexual orientation (law enforcement exemptions narrowly defined).
- **Real-time remote biometric identification in public spaces** for law enforcement, except for narrowly defined exceptions (missing persons, imminent terrorist threat, serious criminal suspects) requiring judicial authorization.
- **Timeline**: Prohibitions effective **2 February 2025**.
- **Consequence**: Fines up to **EUR 35 million or 7% of total worldwide annual turnover**, whichever is higher (Art. 99(3)).

#### High-Risk AI Systems (Art. 6, Annex III)

AI systems in the following domains are classified as high-risk:
- **Biometric identification and categorization** of natural persons.
- **Critical infrastructure** management and operation (road traffic, water, gas, heating, electricity supply).
- **Education and vocational training**: Admission, assessment, monitoring of students; evaluation of learning outcomes.
- **Employment, worker management, and self-employment access**: Recruitment and selection, task allocation, performance monitoring, evaluation of employment relationships.
- **Essential private and public services**: Credit scoring, creditworthiness assessment, insurance risk assessment and pricing, emergency service dispatch.
- **Law enforcement**: Individual risk assessments, polygraphs, evidence reliability evaluation, profiling in criminal investigations.
- **Migration, asylum, and border control**: Polygraphs, risk assessments, document authentication, visa/residence applications.
- **Administration of justice and democratic processes**: AI assisting judicial authorities in researching and interpreting facts and law.

**Obligations for high-risk AI systems (Arts. 8-15):**
- **Risk management system** (Art. 9): Continuous iterative process throughout the AI system's lifecycle.
- **Data governance** (Art. 10): Training, validation, and testing data must be relevant, representative, and free from errors. Bias examination and mitigation required.
- **Technical documentation** (Art. 11): Detailed documentation before the system is placed on the market.
- **Record-keeping/logging** (Art. 12): Automatic logging of events throughout the system's lifecycle to ensure traceability.
- **Transparency** (Art. 13): Instructions for use enabling deployers to interpret outputs and use appropriately.
- **Human oversight** (Art. 14): Design must allow effective oversight by natural persons during use, including ability to override or interrupt.
- **Accuracy, robustness, cybersecurity** (Art. 15): Appropriate levels of accuracy, robustness, and cybersecurity throughout lifecycle.
- **Conformity assessment** (Art. 43): Self-assessment for most high-risk systems; third-party conformity assessment required for biometric identification systems. CE marking required.
- **EU database registration** (Art. 71): Registration in the EU public database before placing on market.
- **Timeline**: High-risk obligations effective **2 August 2026**.
- **Consequence**: Non-compliance fines up to **EUR 15 million or 3% of total worldwide annual turnover** (Art. 99(4)).

#### Limited Risk — Transparency Obligations (Art. 50)

- AI systems interacting with natural persons must disclose that the person is interacting with an AI system (unless obvious from context).
- AI systems generating synthetic audio, image, video, or text content must mark the output as artificially generated or manipulated, in a machine-readable format.
- Deployers of emotion recognition or biometric categorization systems must inform affected persons.
- Deployers of AI systems generating deepfakes must disclose that content has been artificially generated or manipulated.
- **Timeline**: Transparency obligations effective **2 August 2025**.

#### Minimal Risk

All other AI systems (e.g., spam filters, AI-enabled video games) may be developed and used with no additional obligations beyond existing law. Voluntary codes of conduct encouraged (Art. 95).

### General-Purpose AI (GPAI) Models (Arts. 51-56)

- **All GPAI models**: Providers must maintain technical documentation, provide information and documentation to downstream providers integrating the model into AI systems, establish a policy to comply with EU copyright law (including Text and Data Mining opt-outs under Art. 4 of the DSM Directive), and publish a sufficiently detailed summary of training data content.
- **Systemic risk threshold**: GPAI models trained with cumulative compute exceeding **10^25 FLOPs** are presumed to have systemic risk (Art. 51(2)). The Commission may also designate models below this threshold based on other criteria.
- **Additional obligations for systemic risk models** (Art. 55): Perform model evaluations (including adversarial testing), assess and mitigate systemic risks, report serious incidents to the AI Office, ensure adequate cybersecurity protections.
- **Timeline**: GPAI obligations effective **2 August 2025**.
- **Consequence**: Fines up to **EUR 15 million or 3% of turnover** for GPAI providers; up to **EUR 7.5 million or 1% of turnover** for providing incorrect information (Art. 99(4)-(5)).

### Enforcement Architecture

- **AI Office** (within the European Commission): Exclusive competence for GPAI model oversight. Coordinates enforcement across member states.
- **National competent authorities**: Each member state designates a national supervisory authority (by 2 August 2025) and a market surveillance authority.
- **Codes of practice**: The AI Office facilitates codes of practice for GPAI providers (Art. 56), expected to be finalized by early 2025.
- **Right to explanation**: Affected persons have the right to an explanation of individual decisions made by high-risk AI systems (Art. 86).
- **Right to lodge complaints**: Any natural or legal person may lodge a complaint with the relevant market surveillance authority (Art. 85).

### Key Compliance Timeline

| Date | Milestone |
|------|-----------|
| 1 August 2024 | Entry into force |
| 2 February 2025 | Prohibited AI practices banned; AI literacy obligations apply |
| 2 August 2025 | GPAI model rules apply; transparency obligations apply; national authorities designated |
| 2 August 2026 | High-risk AI system obligations apply (Annex III) |
| 2 August 2027 | High-risk obligations for AI systems that are safety components of regulated products (Annex I) |

## Interaction with Other Areas

- **Data Privacy:** High-risk AI systems processing personal data must comply with GDPR simultaneously. DPIAs under GDPR and fundamental rights impact assessments under the AI Act may overlap but are distinct requirements. Training data governance under Art. 10 must respect GDPR data minimization and purpose limitation.
- **Consumer Protection:** AI systems in consumer-facing products trigger both AI Act transparency obligations and existing EU consumer protection directives (Unfair Commercial Practices Directive, Product Liability Directive).
- **Employment:** AI systems used in recruitment, performance monitoring, and task allocation are classified as high-risk. Deployers must conduct fundamental rights impact assessments and ensure human oversight. Works council notification may be required under member state law.
- **IP and Technology:** GPAI model providers must comply with EU copyright law, including respecting Text and Data Mining opt-outs. This intersects with open-source model distribution and SaaS agreements.
- **Financial Services:** AI systems used in credit scoring and insurance risk assessment are high-risk. Existing sectoral regulation (CRD, Solvency II) applies in parallel.

## Sources

- [Regulation (EU) 2024/1689 (EU AI Act) — EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689) — Full text of the AI Act
- [European AI Office](https://digital-strategy.ec.europa.eu/en/policies/ai-office) — Enforcement body and GPAI oversight
- [AI Act Annexes I and III](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689) — Regulated products list and high-risk use cases
- [EDPB-EDPS Joint Opinion 5/2021 on the AI Act Proposal](https://edpb.europa.eu/our-work-tools/our-documents/edpbedps-joint-opinion/edpb-edps-joint-opinion-52021-proposal_en) — Data protection interaction guidance

---
