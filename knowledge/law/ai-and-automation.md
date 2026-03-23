## Overview

# AI & Automation

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** artificial intelligence, AI, machine learning, ML, algorithm, automated decision, automated decision-making, model, training data, neural network, large language model, LLM, generative AI, foundation model, deep learning, natural language processing, NLP, computer vision, deepfake, synthetic media, bias audit, AI governance, EU AI Act, algorithmic accountability, AI risk, model weights, fine-tuning, prompt engineering, AI-generated content, AI-assisted output, robotic process automation, chatbot, virtual assistant, recommendation engine, predictive analytics, facial recognition, emotion recognition

**Clause types:** AI use restrictions, model ownership and IP provisions, training data licenses, AI output ownership clauses, algorithmic transparency obligations, bias testing requirements, human oversight provisions, automated decision-making disclosures, AI indemnification clauses, AI warranty disclaimers, responsible AI provisions, model audit rights, AI acceptable use policies

**Regulatory references:** EU AI Act (Regulation 2024/1689), Colorado SB 24-205, Illinois AI Video Interview Act (AIVIVA), NYC Local Law 144, NIST AI Risk Management Framework, EEOC AI Guidance, FTC AI enforcement actions, Executive Order 14110 on Safe AI, GDPR Article 22, California AB 2013, Texas SB 2105, EU AI Act Article 50

**Relationship patterns:** AI vendor agreements, SaaS platforms using AI/ML features, AI model licensing, training data procurement, AI consulting or development agreements, employment screening tools using AI, consumer-facing AI products, AI-generated content licensing, AI-assisted professional services

## Sub-File Loading

| Sub-File | Load When |
|----------|-----------|
| `eu-ai-act.md` | Parties are in the EU/EEA, AI system is deployed or made available in the EU market, or the EU AI Act is referenced |
| `us-state-ai-laws.md` | AI system is deployed in the US, employment-related AI is used, or state-specific AI legislation is referenced |
| `algorithmic-accountability.md` | Bias testing, impact assessments, algorithmic auditing, transparency, or explainability obligations are at issue |
| `training-data.md` | AI model training, data licensing for ML, web scraping for training, synthetic data generation, or fair use of copyrighted works for training is involved |
| `model-ownership.md` | AI model IP ownership, AI-generated output copyright, fine-tuned model rights, or AI patentability is at issue |
| `deepfakes-synthetic-media.md` | Synthetic media generation, deepfake detection, AI-generated images/video/audio, or identity manipulation technology is involved |
| `automated-decision-making.md` | AI systems make or assist decisions about individuals in employment, credit, insurance, housing, or other consequential domains |

**Cross-area loading:** If personal data is used for training or inference, also load `data-privacy/`. If AI is used in employment screening, also load `employment/`. If AI-generated content raises IP questions, also load `ip-and-technology/`. If AI is used in consumer-facing products, also load `consumer-protection/`. If AI is used in financial decision-making, also load `financial-services/`.

## Quick Reference

- **eu-ai-act.md** — EU risk-based AI regulation: prohibited practices, high-risk system obligations, GPAI model rules, fines up to EUR 35M/7% turnover
- **us-state-ai-laws.md** — State-by-state AI legislation: Colorado bias testing, Illinois video interview consent, NYC bias audits, Texas deepfake laws
- **algorithmic-accountability.md** — Bias testing frameworks, impact assessments, NIST AI RMF, EEOC guidance, FTC enforcement on algorithmic fairness
- **training-data.md** — Copyright and fair use for training data, data licensing, web scraping legality, GDPR lawful basis, opt-out mechanisms
- **model-ownership.md** — AI output copyrightability, human authorship requirement, fine-tuned model IP, trade secret protection, patent eligibility
- **deepfakes-synthetic-media.md** — State deepfake laws, election interference prohibitions, non-consensual intimate images, EU AI Act disclosure rules
- **automated-decision-making.md** — GDPR Art. 22 rights, ECOA fair lending, EEOC Title VII, FCRA adverse action, state human-review mandates

---
## Algorithmic Accountability

# Algorithmic Accountability

## Applicability

This sub-topic is relevant when ANY of the following are true:

- An algorithm or AI system is used to make or substantially assist decisions that have legal or similarly significant effects on individuals.
- Bias testing, algorithmic auditing, or disparate impact analysis is required or contractually committed to.
- An impact assessment for an automated system is mandated by regulation, contract, or internal governance.
- Transparency or explainability obligations apply to algorithmic outputs.
- A vendor or counterparty represents or warrants that its AI system is fair, unbiased, or compliant with fairness standards.

## Key Requirements

### Bias Testing Standards

- **What**: Algorithmic bias testing evaluates whether an automated system produces discriminatory outcomes across protected classes (race, sex, age, disability, national origin, religion, and other categories under applicable law).
- **Four-fifths (80%) rule**: Originating from the EEOC Uniform Guidelines on Employee Selection Procedures (29 CFR 1607), this threshold holds that a selection rate for any protected group less than **80% (four-fifths)** of the rate for the group with the highest selection rate constitutes evidence of adverse impact. Widely applied by analogy to algorithmic hiring and credit tools.
- **Disparate impact analysis**: Under Title VII and ECOA, facially neutral algorithms that produce statistically significant disparate outcomes against a protected class are subject to disparate impact liability unless the employer or creditor can demonstrate the practice is job-related and consistent with business necessity (Title VII) or has a legitimate business justification (ECOA).
- **Intersectional analysis**: NYC Local Law 144 requires bias audits to examine impact rates not only by individual categories (sex, race/ethnicity) but also by intersectional categories (e.g., Hispanic female, Black male).
- **Consequence**: Failure to test for bias does not itself create liability, but absence of testing eliminates key defenses. Demonstrated disparate impact triggers burden-shifting under federal anti-discrimination frameworks.

### Impact Assessments

- **What**: A structured evaluation of an algorithmic system's potential effects on individuals, groups, and society, conducted before deployment and periodically thereafter.
- **Colorado SB 205**: Deployers of high-risk AI systems must complete an impact assessment before deployment and annually thereafter, documenting the purpose, intended use, known risks, categories of data inputs, performance metrics, and steps taken to mitigate identified risks.
- **NIST AI RMF**: Recommends impact assessments as part of the "Map" and "Measure" functions, evaluating societal and individual risks including bias, privacy, safety, and security.
- **EU AI Act (Art. 27)**: Deployers of high-risk AI systems that are public bodies or private entities providing public services must conduct a **fundamental rights impact assessment** before first use.
- **Threshold**: No single federal US mandate for AI impact assessments exists, but sectoral requirements (GDPR DPIAs, Colorado SB 205, EU AI Act fundamental rights assessments) impose overlapping obligations depending on jurisdiction and use case.
- **Consequence**: Failure to conduct a required impact assessment is a standalone violation under applicable statutes. Under Colorado SB 205, failure undermines the affirmative defense available to compliant deployers.

### Transparency and Explainability

- **What**: Obligations to disclose the use of algorithmic decision-making and to provide meaningful explanations of how the system reaches its outputs.
- **EEOC AI Guidance (May 2023)**: Employers using algorithmic tools must ensure applicants and employees receive adequate notice when such tools are used, particularly when reasonable accommodations under the ADA may be implicated. The EEOC treats AI tools as "selection procedures" subject to existing anti-discrimination rules.
- **FCRA requirements**: If an AI system constitutes or contributes to a "consumer report" under the FCRA, the user must provide adverse action notices disclosing the use of the report, the identity of the consumer reporting agency, and the consumer's right to dispute.
- **ECOA/Regulation B**: Creditors using AI in credit decisions must provide specific adverse action reasons to applicants. Generic reasons like "based on our model" are insufficient. The CFPB has stated that creditors cannot avoid adverse action notice requirements by using opaque algorithms.
- **Threshold**: Varies by context. Employment (EEOC), credit (ECOA, FCRA), and housing (FHA) all impose context-specific transparency requirements when algorithmic tools are involved.
- **Consequence**: Failure to provide required adverse action notices is a violation under FCRA (statutory damages of **$100-$1,000 per consumer**, plus actual damages and attorneys' fees in private actions) and ECOA (actual damages, punitive damages up to **$10,000 individual / $500,000 or 1% of net worth class action**).

### NIST AI Risk Management Framework (AI RMF 1.0)

- **What**: Voluntary framework published by NIST in January 2023, providing a structured approach to managing AI risks. Organized around four core functions: **Govern**, **Map**, **Measure**, and **Manage**.
- **Govern**: Establish AI governance structures, policies, roles, and accountability mechanisms.
- **Map**: Understand the context of the AI system, its intended and foreseeable uses, and potential impacts on individuals and groups.
- **Measure**: Employ quantitative and qualitative methods to assess AI system trustworthiness characteristics (validity, reliability, safety, fairness, bias, transparency, explainability, privacy, security).
- **Manage**: Allocate resources and implement responses to identified risks, including monitoring and continuous improvement.
- **Legal relevance**: While voluntary, Colorado SB 205 explicitly provides an affirmative defense for organizations that "substantially comply" with NIST AI RMF or equivalent frameworks. Adoption strengthens defensibility across jurisdictions.

### FTC Enforcement on Algorithmic Fairness

- **What**: The FTC has asserted authority under Section 5 (unfair or deceptive acts or practices) to address discriminatory and deceptive algorithmic practices.
- **Key enforcement actions**: FTC has brought enforcement actions requiring companies to **delete algorithms and models** trained on improperly collected data (e.g., Everalbum/Paravision 2021, Weight Watchers/Kurbo 2022). FTC has also challenged deceptive AI claims (e.g., misrepresenting AI capabilities).
- **Algorithmic disgorgement**: FTC has ordered companies to destroy not just improperly collected data but also the algorithms and models derived from that data — a powerful remedy that destroys significant business value.
- **Threshold**: Applies whenever an algorithm or AI system involves consumer data, consumer-facing decisions, or marketing claims about AI capabilities.
- **Consequence**: FTC consent orders with ongoing compliance monitoring. Civil penalties of up to **$51,744 per violation per day** (2024 adjusted amount) for violations of consent orders. No statutory cap on equitable remedies including algorithmic disgorgement.

### EEOC AI Guidance

- **What**: In May 2023, the EEOC issued guidance on the application of Title VII to employers' use of algorithmic decision-making tools, and separately addressed AI and the ADA.
- **Key positions**: (1) Employers are liable for discriminatory outcomes of AI tools even when the tool is provided by a third-party vendor. (2) AI tools used in hiring, firing, promotion, or other employment decisions are "selection procedures" subject to the Uniform Guidelines. (3) The four-fifths rule applies to AI-driven selection. (4) Employers must provide reasonable accommodations for disabilities that affect interaction with AI screening tools.
- **Threshold**: Applies to all employers covered by Title VII (15+ employees) using AI in any employment decision.
- **Consequence**: Standard Title VII remedies: back pay, front pay, compensatory damages, punitive damages (capped at **$50,000-$300,000** depending on employer size), injunctive relief, and attorneys' fees.

## Interaction with Other Areas

- **Employment:** Algorithmic accountability in employment is governed jointly by this area and employment anti-discrimination law. The EEOC guidance makes clear that Title VII, ADA, and ADEA apply fully to AI-driven employment decisions. Load `employment/` for discrimination frameworks.
- **Data Privacy:** Bias testing and impact assessments may require processing sensitive personal data (race, gender, disability status), creating tension with data minimization principles under GDPR and US state privacy laws. GDPR Art. 22 and DPIA requirements overlap with algorithmic accountability obligations.
- **Consumer Protection:** FTC enforcement on algorithmic fairness falls under consumer protection authority. Deceptive claims about AI accuracy or fairness are actionable under Section 5. Load `consumer-protection/ftc-udap.md`.
- **Financial Services:** AI in credit, insurance, and lending decisions triggers overlapping obligations under ECOA, FCRA, and state insurance regulations. Algorithmic accountability requirements compound with existing fair lending compliance. Load `financial-services/`.

## Sources

- [NIST AI Risk Management Framework (AI RMF 1.0)](https://www.nist.gov/artificial-intelligence/ai-risk-management-framework) — Voluntary governance framework
- [EEOC Technical Assistance: AI and Title VII](https://www.eeoc.gov/laws/guidance/select-issues-assessing-adverse-impact-software-algorithms-and-artificial) — May 2023 guidance on algorithmic selection procedures
- [EEOC Technical Assistance: AI and the ADA](https://www.eeoc.gov/laws/guidance/americans-disabilities-act-and-use-software-algorithms-and-artificial-intelligence) — Disability accommodation and AI
- [FTC Blog: Aiming for Truth, Fairness, and Equity in AI](https://www.ftc.gov/business-guidance/blog/2021/04/aiming-truth-fairness-equity-your-companys-use-ai) — FTC enforcement posture on AI
- [CFPB Circular 2022-03: Adverse Action Notification and AI](https://www.consumerfinance.gov/compliance/circulars/circular-2022-03-adverse-action-notification-requirements-in-connection-with-credit-decisions-based-on-complex-algorithms/) — CFPB position on AI in credit decisions

---
## Automated Decision Making

# Automated Decision-Making

## Applicability

This sub-topic is relevant when ANY of the following are true:

- An AI or algorithmic system makes or substantially assists decisions that produce legal effects or similarly significant effects on individuals (employment, credit, insurance, housing, healthcare, education, benefits).
- GDPR Article 22 rights against solely automated decision-making are invoked or at issue.
- A creditor uses algorithmic tools in credit decisions subject to the Equal Credit Opportunity Act (ECOA) or Fair Credit Reporting Act (FCRA).
- An employer uses AI in hiring, firing, promotion, or other employment decisions subject to Title VII or the ADA.
- A government agency uses AI to determine eligibility for public benefits or services.
- A contract requires or restricts automated decision-making about individuals.

## Key Requirements

### GDPR Article 22 — Right Against Solely Automated Decisions

- **What**: Data subjects have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects or similarly significant effects concerning them.
- **Scope of "solely automated"**: The decision must be made without meaningful human involvement. If a human reviewer merely rubber-stamps an automated recommendation without genuine discretion, the decision may still be treated as "solely automated" (EDPB Guidelines on Profiling, WP251rev.01).
- **"Legal or similarly significant effects"**: Includes decisions affecting legal rights (contract denial, benefit eligibility), financial access (loan, insurance), employment status, and other effects of a comparable nature (health services, educational admission).
- **Exceptions (Art. 22(2))**: Solely automated decision-making is permitted if: (a) necessary for entering into or performing a contract, (b) authorized by EU or member state law, or (c) based on explicit consent. Even where exceptions apply, the controller must implement suitable safeguards, including the right to obtain human intervention, express one's point of view, and contest the decision.
- **Threshold**: Applies whenever a GDPR-subject controller uses solely automated processing for decisions with legal or similarly significant effects on EU/EEA data subjects.
- **Consequence**: Violation of Art. 22 is subject to fines under Art. 83(5) — up to **EUR 20 million or 4% of total worldwide annual turnover**. Data subjects also have the right to compensation under Art. 82.

### ECOA and Fair Lending (Regulation B)

- **What**: The Equal Credit Opportunity Act (15 U.S.C. Section 1691) prohibits discrimination in credit transactions on the basis of race, color, religion, national origin, sex, marital status, age, receipt of public assistance, or good faith exercise of rights under the Consumer Credit Protection Act. Algorithmic credit decisions must comply with both disparate treatment and disparate impact prohibitions.
- **Adverse action notice requirements**: Regulation B (12 CFR 1002.9) requires creditors to provide specific reasons for adverse credit actions. The CFPB has issued guidance (Circular 2022-03) confirming that creditors using AI/ML models must provide accurate and specific reasons — not merely state that a "model" denied the application. Creditors must identify the actual factors relied upon, even if the model is complex.
- **Disparate impact**: Facially neutral algorithms that produce discriminatory outcomes are subject to disparate impact analysis. The creditor bears the burden of demonstrating business necessity for factors that produce disparate impact.
- **Threshold**: Applies to all creditors using AI/algorithmic tools in any aspect of credit decision-making (origination, underwriting, pricing, servicing, collections).
- **Consequence**: ECOA violations: actual damages, punitive damages up to **$10,000 (individual) / $500,000 or 1% of net worth (class action)**, injunctive relief, and attorneys' fees. CFPB, DOJ, and prudential regulators all have enforcement authority. Pattern-or-practice discrimination referrals to DOJ.

### Title VII and Employment Decisions

- **What**: Title VII of the Civil Rights Act (42 U.S.C. Section 2000e) prohibits employment discrimination on the basis of race, color, religion, sex, or national origin. The EEOC has confirmed that employers are liable for discriminatory outcomes of AI employment tools even when the tool is provided by a third-party vendor.
- **Selection procedures**: AI tools used in hiring, promotion, termination, or other employment decisions are "selection procedures" under the Uniform Guidelines on Employee Selection Procedures (29 CFR 1607). The four-fifths rule applies to measure adverse impact.
- **Vendor liability**: Employers cannot delegate Title VII compliance to AI vendors. An employer using a vendor's AI screening tool is the entity making the "employment practice" and bears full responsibility for discriminatory impact.
- **ADA interaction**: The EEOC's 2023 guidance on AI and the ADA emphasizes that employers must provide reasonable accommodations for applicants whose disabilities affect their ability to interact with AI screening tools (e.g., speech recognition systems for applicants with speech disabilities).
- **Threshold**: Applies to all employers with **15+ employees** (Title VII) or **20+ employees** (ADEA) using AI in employment decisions.
- **Consequence**: Title VII remedies: back pay, front pay, compensatory damages, punitive damages (capped at **$50,000-$300,000** depending on employer size), injunctive relief, and attorneys' fees. EEOC may investigate, conciliate, and litigate. DOJ has authority for pattern-or-practice cases against public employers.

### FCRA and Consumer Reports

- **What**: If an AI system's output constitutes a "consumer report" under the Fair Credit Reporting Act (15 U.S.C. Section 1681), the provider is a "consumer reporting agency" (CRA) and the user is subject to FCRA obligations.
- **AI as consumer reports**: AI tools that assemble or evaluate consumer information from multiple sources to produce a score or recommendation used for credit, employment, insurance, or housing decisions may meet the FCRA's definition of a consumer report. The FTC and CFPB have indicated that AI-powered background check tools and tenant screening tools are subject to FCRA.
- **Adverse action obligations**: When an AI system contributes to an adverse decision (denial of credit, employment, insurance, or housing), the user must provide the consumer with: (1) notice of the adverse action, (2) identification of the CRA that furnished the report, (3) the consumer's right to obtain a free copy of the report, and (4) the consumer's right to dispute the accuracy of information.
- **Accuracy obligations (Section 1681e(b))**: CRAs must follow reasonable procedures to assure maximum possible accuracy of consumer reports. AI systems generating inaccurate scores or recommendations may violate this requirement.
- **Threshold**: Applies whenever AI output is used for a purpose enumerated in FCRA Section 1681b (credit, employment, insurance, housing, government benefits) and the AI system meets the definition of a consumer report or consumer reporting agency.
- **Consequence**: Statutory damages of **$100-$1,000 per consumer** for willful violations, actual damages for negligent violations, plus attorneys' fees and costs. Class action exposure is significant. Willful violations may also carry criminal penalties (fines and up to **2 years imprisonment**).

### State Laws Requiring Human Review

- **What**: A growing number of US states are enacting laws requiring meaningful human review of certain automated decisions, particularly in employment and insurance contexts.
- **Colorado SB 205 (2026)**: Deployers of high-risk AI systems must provide consumers with the right to appeal a consequential decision to a human reviewer who has the authority to overturn the AI system's determination.
- **Illinois AIVIVA**: Requires employer consent and notice for AI-analyzed video interviews, effectively imposing a human review checkpoint before AI analysis occurs.
- **Washington insurance AI**: The Washington Office of the Insurance Commissioner has issued regulations requiring insurers to ensure that AI/algorithmic tools used in underwriting and rating do not produce unfairly discriminatory outcomes, with human oversight requirements.
- **Maryland facial recognition in hiring (HB 1202)**: Prohibits employers from using facial recognition technology during job interviews without the applicant's written consent. Effective October 2020.
- **Threshold**: Human review requirements vary by jurisdiction and domain. Emerging consensus requires meaningful human oversight (not rubber-stamping) for high-impact automated decisions.
- **Consequence**: Varies by statute. Colorado SB 205: AG enforcement, no private right of action. State insurance regulations: regulatory action including cease-and-desist orders and license revocation.

### Government Use of Automated Decision-Making

- **What**: Federal and state governments increasingly use AI for benefits administration, fraud detection, child welfare risk scoring, criminal sentencing, and immigration decisions. Constitutional due process requires notice and an opportunity to be heard before deprivation of liberty or property interests.
- **Due process concerns**: Automated denial of government benefits (Medicaid, SNAP, unemployment) without adequate notice, explanation, or human appeal may violate the Due Process Clause of the 14th Amendment. Courts have struck down automated benefit denial systems (*K.W. v. Armstrong*, 9th Cir. 2015 — Medicaid budget reductions via algorithm without adequate notice).
- **Federal agency guidance**: OMB Memorandum M-24-10 (March 2024) requires federal agencies to implement safeguards for AI used in rights-impacting and safety-impacting contexts, including impact assessments, human oversight, and notice to affected individuals.
- **Threshold**: Any government use of AI for decisions affecting individual rights or benefits triggers due process analysis.
- **Consequence**: Constitutional challenges may result in injunctive relief halting the use of the system, retroactive reinstatement of benefits, and damages under 42 U.S.C. Section 1983.

## Interaction with Other Areas

- **Data Privacy:** GDPR Art. 22 is the primary EU-level automated decision-making provision. CCPA and state privacy laws also provide opt-out rights that may apply to profiling and automated decisions. Load `data-privacy/gdpr.md` for Art. 22 details and `data-privacy/us-state-privacy.md` for state-level profiling rights.
- **Employment:** AI in employment decisions is governed jointly by this area, Title VII, the ADA, ADEA, and state employment laws. The EEOC's AI guidance and the Uniform Guidelines apply directly. Load `employment/` for employment discrimination frameworks.
- **Financial Services:** AI in credit, lending, and insurance decisions triggers ECOA, FCRA, and state insurance regulations simultaneously. Fair lending compliance programs must account for algorithmic risk. Load `financial-services/` for sectoral requirements.
- **Consumer Protection:** FTC enforcement on algorithmic decision-making, CFPB adverse action guidance, and state UDAP laws overlap with automated decision-making obligations. Load `consumer-protection/` for enforcement frameworks.
- **Algorithmic Accountability:** This file addresses the legal rights and obligations arising from automated decisions. `algorithmic-accountability.md` addresses the testing, auditing, and governance frameworks to ensure those obligations are met. Load both for comprehensive coverage.

## Sources

- [GDPR Article 22 and Recitals 71-72 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Right against solely automated decisions
- [EDPB Guidelines on Automated Individual Decision-Making and Profiling (WP251rev.01)](https://ec.europa.eu/newsroom/article29/items/612053) — Interpretive guidance on Art. 22
- [CFPB Circular 2022-03 — Adverse Action and AI](https://www.consumerfinance.gov/compliance/circulars/circular-2022-03-adverse-action-notification-requirements-in-connection-with-credit-decisions-based-on-complex-algorithms/) — ECOA adverse action notice requirements for AI
- [EEOC: Select Issues — Assessing Adverse Impact in AI (May 2023)](https://www.eeoc.gov/laws/guidance/select-issues-assessing-adverse-impact-software-algorithms-and-artificial) — Title VII and AI employment tools
- [OMB Memorandum M-24-10 (March 2024)](https://www.whitehouse.gov/omb/briefing-room/) — Federal agency AI governance requirements

---
## Deepfakes Synthetic Media

# Deepfakes and Synthetic Media

## Applicability

This sub-topic is relevant when ANY of the following are true:

- An AI system generates, manipulates, or alters images, video, audio, or text that could be mistaken for authentic content depicting real persons or events.
- A contract involves platforms, tools, or services that create or distribute synthetic media.
- Deepfake detection, labeling, or watermarking technology is being procured or deployed.
- Non-consensual intimate images generated by AI are at issue.
- AI-generated content is used in or proximate to elections or political campaigns.
- Content provenance, authentication, or disclosure obligations apply to AI-generated media.

## Key Requirements

### State Deepfake Laws — Election Interference

- **What**: A growing number of US states have enacted laws specifically targeting AI-generated deepfakes used to influence elections.
- **Texas SB 2105 (2019)**: Creates a criminal offense for publishing a deepfake video intended to injure a candidate or influence an election within **30 days** of the election. Applies to video that is created with AI and appears to depict a real person performing an action that did not occur, with the intent to deceive and influence the election.
- **California AB 730 (2019, amended by AB 2655 in 2024)**: Prohibited distribution of materially deceptive audio or visual media of a candidate within **60 days** of an election. AB 2655 expanded obligations to require large online platforms to block or label deceptive AI-generated election content.
- **Minnesota HF 1370 (2023)**: Prohibits dissemination of deepfake media depicting a candidate within **90 days** of an election without a clear and conspicuous disclosure that the media is AI-generated.
- **Threshold**: State laws vary in their temporal windows (30-90 days pre-election), intent requirements, and disclosure safe harbors. At least 15 states had enacted deepfake election laws by early 2026.
- **Consequence**: Texas: **Class A misdemeanor** (up to 1 year imprisonment, $4,000 fine). California: Injunctive relief and damages; platforms face penalties for failure to label. Minnesota: Gross misdemeanor (up to 1 year, $3,000 fine).

### Non-Consensual Intimate Images (NCII)

- **What**: AI-generated intimate imagery depicting real individuals without their consent is increasingly addressed by both existing revenge porn statutes and new AI-specific legislation.
- **Federal DEFIANCE Act (proposed/enacted 2024-2025)**: Creates a federal civil cause of action for individuals depicted in non-consensual, AI-generated intimate images, allowing victims to sue creators and distributors.
- **State laws**: Over 45 states have revenge porn laws; a growing subset explicitly cover AI-generated content. Texas expanded its deepfake law to cover non-consensual intimate images. Virginia's revenge porn statute (Va. Code Section 18.2-386.2) was amended to explicitly include AI-generated ("falsely created") images. Illinois and California have similarly expanded coverage.
- **Threshold**: Creating or distributing AI-generated intimate images of an identifiable person without their consent triggers criminal and/or civil liability in a growing majority of US jurisdictions.
- **Consequence**: Varies by state. Criminal penalties range from misdemeanors to felonies. Civil remedies include actual damages, statutory damages (California provides **minimum $1,500 per violation**), injunctive relief, and attorneys' fees.

### EU AI Act — Transparency for Synthetic Media (Art. 50)

- **What**: The EU AI Act imposes transparency obligations specifically targeting synthetic media.
- **Disclosure to users (Art. 50(2))**: Providers of AI systems that generate synthetic audio, image, video, or text content must ensure that the outputs are marked as artificially generated or manipulated, in a machine-readable format. This applies to all such systems, regardless of risk tier.
- **Disclosure by deployers (Art. 50(4))**: Deployers of AI systems that generate deepfakes must disclose that the content has been artificially generated or manipulated. Exceptions exist for AI-generated content that is part of a manifestly artistic, creative, satirical, or fictional work, provided the disclosure does not impede display or enjoyment.
- **Emotion recognition and biometric categorization (Art. 50(3))**: Deployers must inform persons that they are being subjected to emotion recognition or biometric categorization systems.
- **Timeline**: Transparency obligations effective **2 August 2025**.
- **Consequence**: Non-compliance subject to fines up to **EUR 15 million or 3% of total worldwide annual turnover** (Art. 99(4)).

### Platform Responsibilities

- **What**: Online platforms face increasing legal obligations regarding AI-generated and deepfake content.
- **Section 230 limitations**: Section 230 of the Communications Decency Act provides immunity for platforms as intermediaries for user-generated content. However, courts have not definitively resolved whether Section 230 protects platforms that actively generate or recommend deepfake content, and there is legislative momentum to create carve-outs for AI-generated harmful content.
- **EU Digital Services Act (DSA)**: Very large online platforms (VLOPs, 45M+ EU monthly users) must assess and mitigate systemic risks, including those from AI-generated disinformation. Requires notice-and-action mechanisms for illegal deepfake content.
- **Voluntary commitments**: Major platforms (Meta, Google, Microsoft, TikTok) have signed the **AI Elections Accord** and **C2PA content provenance standards**, committing to label AI-generated content and support content authentication.
- **Threshold**: Platforms hosting, distributing, or recommending synthetic media must assess obligations under platform liability law, election law, and sector-specific AI regulations in each jurisdiction.
- **Consequence**: DSA non-compliance: fines up to **6% of global turnover** for VLOPs. Failure to remove illegal deepfake content may result in loss of safe harbor protections.

### DMCA and Content Provenance

- **What**: The Digital Millennium Copyright Act (17 U.S.C. Section 512) provides a notice-and-takedown framework that may be applied to AI-generated content that infringes copyright, but does not specifically address deepfakes.
- **Content provenance**: Technical standards like **C2PA (Coalition for Content Provenance and Authenticity)** provide cryptographic metadata binding content to its origin and editing history. California AB 3211 (2024) and similar bills propose mandating C2PA-compatible provenance metadata for AI-generated content.
- **Threshold**: DMCA takedown is available only for copyright-infringing content, not for non-infringing deepfakes. Content provenance mandates are emerging but not yet widely enacted.
- **Consequence**: DMCA: Standard safe harbor framework. Failure to implement provenance requirements where mandated may result in penalties under state or EU law.

### FTC Enforcement

- **What**: The FTC has signaled aggressive enforcement against deceptive AI-generated content under Section 5 of the FTC Act.
- **Proposed rule on AI impersonation (2024)**: The FTC proposed extending its Government and Business Impersonation Rule to cover AI-generated impersonation of individuals, making it an unfair practice to use AI-generated deepfakes to deceive consumers. Final rule expected 2025-2026.
- **Deceptive advertising**: Using deepfakes or AI-generated testimonials in advertising without disclosure is actionable as a deceptive practice under Section 5 and the updated FTC Endorsement Guides (2023).
- **Threshold**: Any commercial use of synthetic media that could deceive a reasonable consumer triggers FTC scrutiny.
- **Consequence**: FTC consent orders, injunctive relief, civil penalties of up to **$51,744 per violation per day** (2024 adjusted) for consent order violations, and potential disgorgement.

## Interaction with Other Areas

- **Data Privacy:** Deepfake generation using individuals' biometric data (face, voice) triggers biometric privacy laws (BIPA, CUBI, WA biometric law) and GDPR obligations regarding biometric data processing. Load `data-privacy/` for biometric data requirements.
- **IP and Technology:** AI-generated deepfakes may infringe right of publicity (state law), copyright in underlying works, and trademarks if brands or logos are replicated. Load `ip-and-technology/` for IP frameworks.
- **Consumer Protection:** Deceptive deepfakes in advertising and marketing are actionable under FTC Section 5 and state UDAP statutes. Load `consumer-protection/ftc-udap.md`.
- **Employment:** Deepfake detection tools used in employment contexts (e.g., video interview authentication) must comply with employee privacy laws and AI employment regulations.

## Sources

- [Texas SB 2105 — Texas Legislature](https://capitol.texas.gov/BillLookup/History.aspx?LegSess=86R&Bill=SB2105) — Deepfake election interference law
- [California AB 2655 (2024)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB2655) — Platform obligations for deceptive AI election content
- [EU AI Act Art. 50 — EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689) — Transparency obligations for synthetic media
- [FTC Proposed Rule on AI Impersonation (2024)](https://www.ftc.gov/legal-library/browse/federal-register-notices/trade-regulation-rule-impersonation-individuals) — Extending impersonation rules to AI
- [C2PA Technical Specification](https://c2pa.org/specifications/specifications/2.0/specs/C2PA_Specification.html) — Content provenance standards

---
## Eu Ai Act

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
## Model Ownership

# Model Ownership and AI-Generated Content IP

## Applicability

This sub-topic is relevant when ANY of the following are true:

- Ownership of an AI model, its weights, or its architecture is at issue in a contract or dispute.
- A party claims copyright or other IP protection in AI-generated outputs (text, images, code, music, video).
- Fine-tuning, transfer learning, or adaptation of a pre-existing model raises questions about derivative work status or ownership of the resulting model.
- AI-generated inventions or AI-assisted inventions are subject to patent applications.
- Trade secret protection is claimed over model weights, training methodologies, hyperparameters, or proprietary datasets.
- A contract governs the development, licensing, or transfer of AI models or their outputs.

## Key Requirements

### Copyright in AI-Generated Works

- **What**: The US Copyright Office requires that copyrightable works be created by a human author. Works generated autonomously by AI without meaningful human creative control are not eligible for copyright registration.
- **Thaler v. Perlmutter (D.D.C. 2023)**: Held that an image created autonomously by the AI system DABUS (with no human creative input beyond activating the system) is not copyrightable. The court affirmed the Copyright Office's refusal to register the work, stating that "human authorship is a bedrock requirement of copyright."
- **Zarya of the Dawn (Copyright Office, Feb. 2023)**: Partially registered a graphic novel containing both human-authored text and AI-generated images (via Midjourney). The Office registered the human-authored elements and the human-selected arrangement but denied registration for individual AI-generated images, holding that the user's text prompts did not constitute sufficient creative control over the visual output.
- **Copyright Office guidance (Federal Register, 88 FR 16190, March 2023)**: Works with AI-generated components must be examined on a case-by-case basis. Applicants must disclose AI involvement. Copyright protection extends only to human-authored elements. The degree of human creative control is the key inquiry.
- **Threshold**: Copyright attaches only to elements reflecting human authorship. AI-generated content without meaningful human creative direction is in the public domain under current US law.
- **Consequence**: Relying on copyright protection for purely AI-generated works is legally unsupported. Competitors may freely copy unprotectable AI-generated outputs. Failure to disclose AI involvement in registration applications may constitute fraud on the Copyright Office.

### AI-Assisted Works and Human Authorship

- **What**: When a human uses AI as a tool — providing substantial creative direction, selecting and arranging outputs, and making meaningful editorial choices — the resulting work may be copyrightable as to the human-authored elements.
- **Contractual treatment**: Agreements should specify (1) whether AI tools will be used in creating deliverables, (2) the expected degree of human creative involvement, (3) allocation of risk if output is found uncopyrightable, and (4) representations regarding originality.
- **Work-for-hire considerations**: AI-generated works cannot be works made for hire because AI is not an "employee" or "independent contractor" under copyright law. However, works created by human employees using AI tools as part of their employment may qualify as works for hire to the extent the human contributions are copyrightable.
- **Threshold**: The line between copyrightable AI-assisted works and uncopyrightable AI-generated works depends on the degree of human creative control — a fact-intensive inquiry with no bright-line rule.
- **Consequence**: Contracts relying on copyright assignment or work-for-hire provisions for AI-generated deliverables may convey less than expected. Representations of ownership should be carefully scoped.

### Fine-Tuned Model Ownership

- **What**: Fine-tuning a pre-existing base model on proprietary data creates a derivative model. Ownership of the fine-tuned model depends on the base model license terms, the nature of the fine-tuning, and the contractual relationship between the parties.
- **Base model license restrictions**: Open-source and commercial base model licenses may restrict how fine-tuned derivatives are used, distributed, or commercialized. For example, Meta's Llama license permits commercial use but imposes restrictions on users exceeding **700 million monthly active users** and requires compliance with an acceptable use policy.
- **Contractual provisions**: Fine-tuning agreements should address (1) ownership of the fine-tuned weights (delta weights vs. full model), (2) license-back rights to the base model provider, (3) restrictions on distribution of the fine-tuned model, (4) representations about the training data used for fine-tuning, and (5) survival of base model license obligations.
- **Threshold**: Any fine-tuning of a third-party model requires review of the base model license and a written agreement governing ownership of the resulting model.
- **Consequence**: Violation of base model license terms may result in license termination, loss of rights to use the fine-tuned model, and breach of contract claims.

### AI Output Ownership in Commercial Contracts

- **What**: Contracts for AI-powered services must clearly allocate ownership of the outputs generated by the AI system. Without clear contractual terms, ownership disputes are likely.
- **Key issues**: (1) Whether the AI provider or the customer owns outputs generated from customer inputs. (2) Whether the provider may use customer inputs and outputs to train or improve its models. (3) Whether outputs are subject to copyright protection at all. (4) Whether outputs could infringe third-party IP (regurgitation of training data).
- **Market practice**: Leading AI providers (OpenAI, Anthropic, Google) generally assign output ownership to the customer in their terms of service, while retaining rights to use inputs and outputs for model improvement unless opted out. However, these assignments may convey less than expected given the uncertain copyright status of AI-generated content.
- **Threshold**: Every AI service agreement should contain explicit output ownership provisions, IP indemnification for training data infringement, and model improvement rights clauses.
- **Consequence**: Absent clear terms, disputes over output ownership can result in both parties claiming rights or neither party having enforceable rights if the output is uncopyrightable.

### Trade Secret Protection for AI Models

- **What**: Model architecture, training methodologies, hyperparameter configurations, proprietary datasets, and learned weights may qualify for trade secret protection under the Defend Trade Secrets Act (18 U.S.C. Section 1836) and state trade secret laws (Uniform Trade Secrets Act, adopted in 48 states).
- **Requirements**: (1) The information must derive independent economic value from not being generally known or readily ascertainable. (2) The owner must take reasonable measures to keep the information secret (access controls, NDAs, encryption, employee training).
- **Model weights**: Proprietary model weights are strong trade secret candidates — they are expensive to create, difficult to reverse-engineer, and provide competitive advantage. However, open-sourcing any model version may undermine trade secret status for the architecture.
- **Threshold**: Trade secret protection requires affirmative and ongoing secrecy measures. Release of model weights (even under restrictive licenses) may constitute public disclosure depending on the terms.
- **Consequence**: Trade secret misappropriation remedies include injunctive relief, actual damages, unjust enrichment, and exemplary damages up to **2x actual damages** for willful and malicious misappropriation. Criminal penalties under DTSA include fines and imprisonment up to **10 years**.

### Patent Eligibility for AI Inventions

- **What**: US patent law requires a human inventor. AI systems cannot be listed as inventors on patent applications.
- **Thaler v. Vidal (Fed. Cir. 2022)**: Affirmed the USPTO's refusal to accept patent applications listing DABUS (an AI system) as the sole inventor. The Federal Circuit held that under the Patent Act, an "inventor" must be a natural person.
- **AI-assisted inventions**: Inventions conceived by humans with AI assistance may be patentable, provided a natural person contributed to the conception of the invention. The key question is whether a human made an "inventive contribution" — the USPTO issued guidance in February 2024 clarifying that AI-assisted inventions are not categorically unpatentable, but at least one human must have made a significant contribution to each claim.
- **Threshold**: Patent applications must identify human inventors who made significant contributions to the claimed invention. Purely AI-generated inventions are not patentable in the US, UK, EU, or Australia under current law.
- **Consequence**: Patent applications listing AI as an inventor will be rejected. Failure to name the correct human inventor(s) may render a patent unenforceable.

## Interaction with Other Areas

- **IP and Technology:** Model ownership questions are deeply intertwined with copyright, patent, and trade secret law. Load `ip-and-technology/copyrights.md` for copyright fundamentals, `ip-and-technology/patents.md` for patent eligibility, `ip-and-technology/trade-secrets.md` for trade secret protection, and `ip-and-technology/open-source.md` for open-source model licensing implications.
- **Data Privacy:** Model training on personal data may give rise to data subject rights that persist in or affect the model itself (e.g., GDPR right to erasure and its applicability to learned model weights — "machine unlearning"). Load `data-privacy/` for privacy obligations.
- **Employment:** Work-for-hire and invention assignment provisions in employment agreements must be updated to address AI-assisted work product. Pre-existing IP exclusions should clarify AI tool use. Load `employment/` for employment IP issues.
- **Consumer Protection:** Misrepresenting AI output ownership or copyrightability in consumer-facing terms may constitute deceptive practices under FTC Section 5.

## Sources

- [Thaler v. Perlmutter, No. 1:22-cv-01564 (D.D.C. Aug. 18, 2023)](https://www.copyright.gov/ai/) — AI authorship and copyright
- [US Copyright Office, Copyright Registration Guidance: Works Containing Material Generated by AI, 88 FR 16190 (March 16, 2023)](https://www.federalregister.gov/documents/2023/03/16/2023-05321/copyright-registration-guidance-works-containing-material-generated-by-artificial-intelligence) — Registration policy
- [Thaler v. Vidal, 43 F.4th 1207 (Fed. Cir. 2022)](https://cafc.uscourts.gov/opinions-orders/21-2347.OPINION.8-5-2022_1988142.pdf) — AI inventorship and patents
- [USPTO Guidance on AI-Assisted Inventions (Feb. 2024)](https://www.uspto.gov/subscription-center/2024/guidance-ai-assisted-inventions) — AI-assisted patent eligibility
- [Defend Trade Secrets Act, 18 U.S.C. Section 1836](https://www.law.cornell.edu/uscode/text/18/1836) — Federal trade secret protection

---
## Training Data

# Training Data

## Applicability

This sub-topic is relevant when ANY of the following are true:

- An AI model is being trained or fine-tuned on data, and the legal rights to that data are at issue.
- A contract involves licensing, procuring, or providing data for the purpose of machine learning training.
- Web scraping or data collection for AI training purposes is being conducted or contracted for.
- Fair use of copyrighted works for AI training is at issue.
- A counterparty's terms of service address AI training or text/data mining restrictions.
- Synthetic data generation is being used to supplement or replace real-world training data.
- GDPR or other privacy law obligations apply to personal data used in model training.

## Key Requirements

### Copyright and Fair Use

- **What**: The use of copyrighted works to train AI models raises fundamental copyright questions. No definitive US federal statute addresses AI training specifically. Analysis proceeds under the four-factor fair use test (17 U.S.C. Section 107) and evolving case law.
- **Fair use four factors**: (1) Purpose and character of the use — commercial vs. nonprofit, transformative use. (2) Nature of the copyrighted work — factual vs. creative. (3) Amount and substantiality of the portion used — whether the entire work is ingested. (4) Effect on the potential market — whether the model's outputs substitute for the original.
- **Authors Guild v. Google (2d Cir. 2015)**: Established that digitizing entire books for a searchable index is fair use where the output (snippet view) is transformative and does not substitute for the original. Frequently cited by AI developers as supporting training on copyrighted text.
- **Thomson Reuters v. Ross Intelligence (D. Del. 2025)**: Found that copying of headnotes to train a legal AI search tool was not fair use, emphasizing the commercial nature and market substitution in the legal research market.
- **NYT v. OpenAI (S.D.N.Y., filed Dec. 2023)**: Ongoing litigation alleging that training GPT models on New York Times articles constitutes copyright infringement. The Times alleges the models can reproduce near-verbatim copies. Outcome will significantly shape training data law. No final ruling as of early 2026.
- **Threshold**: Every use of copyrighted material for training requires a fair use analysis or a license. Fair use is a fact-specific, case-by-case determination. No blanket safe harbor for AI training exists under current US law.
- **Consequence**: Copyright infringement damages include actual damages and profits, or statutory damages of **$750-$30,000 per work infringed** (up to **$150,000 per work** for willful infringement) under 17 U.S.C. Section 504. Injunctive relief may halt model distribution.

### Text and Data Mining (TDM) Under EU Law

- **What**: The EU DSM Directive (2019/790) provides two TDM exceptions: (1) Art. 3 — TDM for scientific research by research organizations and cultural heritage institutions (no opt-out possible), and (2) Art. 4 — TDM for any purpose, including commercial AI training, unless the rightsholder has expressly reserved rights ("opted out") in a machine-readable manner.
- **Opt-out mechanism**: Under Art. 4, rightsholders may opt out of TDM by expressing a reservation in a machine-readable way (e.g., robots.txt, metadata, terms of service). AI developers must respect these opt-outs.
- **EU AI Act interaction**: GPAI model providers must comply with EU copyright law, including TDM opt-outs, and must publish a sufficiently detailed summary of training data content (EU AI Act Art. 53(1)(c)-(d)).
- **Threshold**: Applies to all commercial AI training using content from EU rightsholders or content accessible in the EU.
- **Consequence**: Copyright infringement under member state law. Fines under the EU AI Act for GPAI providers failing to comply with copyright obligations.

### Data Licensing for AI Training

- **What**: Licensing agreements for training data must address scope of permitted use (training only vs. training and inference), exclusivity, output ownership, model weight ownership, sublicensing to downstream users, and data retention post-training.
- **Key contractual provisions**: (1) Permitted use scope — training, fine-tuning, evaluation, benchmarking. (2) Restrictions on use — prohibition on reverse-engineering training data from model outputs, prohibition on training competing models. (3) Representations and warranties — data ownership, absence of third-party IP claims, lawful collection. (4) Indemnification — for IP infringement claims arising from training data. (5) Audit rights — to verify training data use and deletion.
- **Threshold**: Any commercial procurement of data for AI training should be governed by a written license. Reliance on publicly available data without a license creates legal risk.
- **Consequence**: Breach of data license terms exposes the licensee to contract damages, injunctive relief, and potential loss of rights to models trained on the licensed data.

### Web Scraping for AI Training

- **What**: Automated collection of publicly available web content for AI training raises legal issues under the Computer Fraud and Abuse Act (CFAA), website terms of service, copyright law, and state trespass-to-chattels theories.
- **CFAA (18 U.S.C. Section 1030)**: After *Van Buren v. United States* (2021), the Supreme Court narrowed CFAA's scope — accessing publicly available information generally does not violate the CFAA even if it violates terms of service. However, circumventing technical access barriers (CAPTCHAs, rate limits, IP blocks) may still constitute unauthorized access.
- **hiQ Labs v. LinkedIn (9th Cir. 2022)**: Affirmed that scraping publicly available data (LinkedIn public profiles) likely does not violate the CFAA. However, this does not resolve copyright, privacy, or contractual claims.
- **Terms of service**: Many websites prohibit scraping in their ToS. While ToS violations alone may not constitute CFAA violations post-*Van Buren*, they may support breach of contract or tortious interference claims.
- **Threshold**: Web scraping for AI training requires analysis of CFAA exposure, ToS compliance, copyright fair use, and applicable privacy laws for each data source.
- **Consequence**: CFAA criminal penalties (up to **5 years imprisonment** for first offense, **10 years** for repeat) and civil damages. Contract damages for ToS violations. Copyright infringement for scraped copyrighted content.

### Right of Publicity and Personal Data

- **What**: Training AI models on individuals' names, likenesses, voices, or other identity elements may violate state right of publicity laws. Using personal data for training may violate GDPR, CCPA, and other privacy laws.
- **Right of publicity**: Over 30 US states recognize a right of publicity (statutory or common law). Key states include California (Cal. Civ. Code Section 3344), New York (NY Civ. Rights Law Sections 50-51), and Tennessee (which extended protection to voice in the ELVIS Act, 2024).
- **GDPR lawful basis for training**: Processing personal data for AI model training requires a lawful basis under GDPR Art. 6. Legitimate interest (Art. 6(1)(f)) is the most commonly asserted basis, but requires a documented balancing test weighing the organization's interest against data subjects' rights. Consent may be required for sensitive data. Data subjects have the right to object to processing for AI training under Art. 21.
- **Threshold**: Any training dataset containing identifiable individuals' data, likeness, voice, or name triggers right of publicity and privacy analysis.
- **Consequence**: Right of publicity damages vary by state — California allows the greater of **$750 or actual damages** plus profits, and punitive damages for knowing violations. GDPR fines up to **EUR 20 million or 4%** of turnover for violations of processing principles.

### Synthetic Data

- **What**: Artificially generated data that mimics the statistical properties of real-world data without containing actual personal data or copyrighted content. Used to augment training datasets, address bias, and reduce privacy and IP risk.
- **Legal advantages**: Properly generated synthetic data avoids copyright infringement (no copyrighted works reproduced), reduces privacy risk (no personal data if generation is truly de-identified), and can be freely licensed.
- **Legal risks**: If synthetic data is generated from real data that was improperly collected, derivative data arguments may apply. Synthetic data that too closely mirrors protected content or individuals may still infringe. Quality and bias in synthetic data can introduce new fairness issues.
- **Threshold**: Synthetic data is a risk-mitigation strategy, not a safe harbor. The lawfulness of the underlying source data and the fidelity of the generation process must both be evaluated.

## Interaction with Other Areas

- **IP and Technology:** Training data copyright questions are fundamentally IP issues. Fair use analysis, licensing, and copyright ownership all intersect with `ip-and-technology/copyrights.md`. Open-source model licenses may impose obligations on training data — load `ip-and-technology/open-source.md`.
- **Data Privacy:** Personal data in training datasets triggers GDPR, CCPA, and state privacy law obligations including lawful basis, data subject rights (including deletion from models), and cross-border transfer restrictions. Load `data-privacy/` for comprehensive coverage.
- **Consumer Protection:** Deceptive claims about training data provenance (e.g., claiming models are trained on licensed data when they are not) may constitute unfair or deceptive practices under FTC Section 5.
- **Employment:** Training data sourced from employee communications, performance records, or workplace monitoring triggers employment privacy obligations and potential works council consultation requirements.

## Sources

- [17 U.S.C. Section 107 — Fair Use](https://www.copyright.gov/title17/92chap1.html#107) — US Copyright Act fair use provision
- [EU Directive 2019/790 (DSM Directive) — EUR-Lex](https://eur-lex.europa.eu/eli/dir/2019/790/oj) — Text and Data Mining exceptions (Arts. 3-4)
- [US Copyright Office: Copyright and AI — Part 1: Digital Replicas (2025)](https://www.copyright.gov/ai/) — Copyright Office AI initiatives
- [Van Buren v. United States, 593 U.S. 374 (2021)](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf) — CFAA scope narrowing
- [hiQ Labs v. LinkedIn, 31 F.4th 1180 (9th Cir. 2022)](https://law.justia.com/cases/federal/appellate-courts/ca9/17-16783/17-16783-2022-04-18.html) — Web scraping and CFAA

---
## Us State Ai Laws

# US State AI Laws

## Applicability

This sub-topic is relevant when ANY of the following are true:

- An AI system or automated decision-making tool is deployed, offered, or used in the United States.
- An employer uses AI-powered tools for hiring, screening, or employment decisions in a jurisdiction with AI-specific employment laws.
- Automated employment decision tools (AEDTs) are used to evaluate candidates or employees in New York City.
- AI-generated content, deepfakes, or synthetic media are created or distributed in a state with relevant legislation.
- A developer or deployer of a "high-risk AI system" operates in Colorado or another state with comprehensive AI governance legislation.

State AI legislation is rapidly evolving. This file reflects enacted laws as of early 2026. Always verify current status of pending bills.

## Key Requirements

### Colorado SB 24-205 — AI Consumer Protection Act

- **What**: Comprehensive AI governance law imposing obligations on both developers and deployers of "high-risk AI systems" — AI systems that make or are a substantial factor in making "consequential decisions" affecting consumers in education, employment, financial services, government services, healthcare, housing, insurance, and legal services.
- **Developer obligations**: Provide deployers with documentation including known limitations, intended uses, training data descriptions, bias evaluation results, and risk mitigation steps. Publish a statement on the developer's website describing the types of high-risk AI systems developed and how risks are managed.
- **Deployer obligations**: Implement a risk management policy and program. Complete an impact assessment before deployment and annually thereafter. Provide consumers with notice that AI is being used for a consequential decision. Provide a right to opt out of AI-driven decisions where feasible, and a right to appeal with human review.
- **Threshold/Timeline**: Effective **1 February 2026**. Applies to developers and deployers doing business in Colorado. No revenue or size threshold — applies broadly.
- **Consequence**: Enforced exclusively by the Colorado Attorney General under the Colorado Consumer Protection Act. No private right of action. Civil penalties per violation. AG must provide 60-day cure notice before enforcement through 1 February 2027.
- **Affirmative defense**: Deployers and developers who comply with recognized AI risk management frameworks (such as NIST AI RMF) or substantially equivalent standards may assert compliance as an affirmative defense.

### Illinois Artificial Intelligence Video Interview Act (AIVIVA) (820 ILCS 42)

- **What**: Requires employers using AI to analyze video interviews of applicants to: (1) notify the applicant before the interview that AI will be used and explain how it works, (2) obtain the applicant's written consent before the interview, and (3) comply with destruction and sharing limitations.
- **Threshold/Timeline**: Effective since **1 January 2020**. Applies to all employers using AI video interview analysis in Illinois, regardless of employer size.
- **Data obligations**: Employers must delete video interviews within 30 days of an applicant's request. Videos may only be shared with persons whose expertise is necessary to evaluate the applicant.
- **Consequence**: Enforced by the Illinois Department of Labor. Violations subject to civil penalties of up to **$1,000 for first offense** and **$5,000 for subsequent offenses**.

### NYC Local Law 144 — Automated Employment Decision Tools (AEDTs)

- **What**: Employers and employment agencies in New York City using an AEDT to screen candidates or employees for employment decisions must: (1) subject the tool to an independent **bias audit** no more than one year prior to use, (2) publish the audit results on their website, and (3) provide notice to candidates at least **10 business days** before use.
- **Bias audit requirements**: Must assess the tool's disparate impact on candidates by sex, race/ethnicity, and intersectional categories. Uses selection rate or scoring rate comparisons. Must be conducted by an independent auditor.
- **Threshold/Timeline**: Effective since **5 July 2023**. Applies to employers and employment agencies in NYC. An AEDT is defined as a computational process derived from machine learning, statistical modeling, data analytics, or AI that issues a simplified output (score, classification, or recommendation) used to substantially assist or replace discretionary decision-making.
- **Consequence**: Civil penalties of **$500 per violation for first offense**, **$500-$1,500 per subsequent violation**. Each day of non-compliance may be a separate violation. Enforced by the NYC Department of Consumer and Worker Protection (DCWP).

### Connecticut SB 2 — AI Governance Act

- **What**: Requires developers and deployers of high-risk AI systems to conduct impact assessments, maintain risk management frameworks, and provide transparency disclosures. Similar in scope to Colorado SB 205 but with certain distinctions in enforcement mechanisms.
- **Threshold/Timeline**: Signed into law in 2024. Phased implementation with key obligations taking effect in **2026**. Applies to entities deploying high-risk AI systems affecting Connecticut residents.
- **Consequence**: Enforced by the Connecticut Attorney General. No private right of action.

### Texas SB 2105 — Deepfake Legislation

- **What**: Creates a criminal offense for creating and distributing deepfake videos intended to influence an election within **30 days** of the election. Also addresses non-consensual deepfake intimate images.
- **Threshold/Timeline**: Effective since **1 September 2019** (election provisions). Amendments expanding coverage to intimate images effective 2023.
- **Consequence**: Creating a deceptive deepfake video to influence an election is a **Class A misdemeanor** (up to 1 year in jail, $4,000 fine). Non-consensual intimate deepfakes carry felony charges.

### California AI Legislation

- **AB 2013 (2024)**: Requires developers of generative AI systems to publish on their website a high-level summary of training data, including sources, whether it includes copyrighted material, personal information, or aggregate information about data. Effective **1 January 2026**.
- **AB 2655 (2024)**: Requires large online platforms to label or remove deceptive AI-generated content related to elections during specified periods around elections.
- **AB 1008 / SB 942 (AI transparency)**: Various bills requiring disclosure when AI is used in consumer-facing interactions.

### State Comparison Matrix

| State/Jurisdiction | Scope | Key Obligation | Effective | Enforcement |
|-------------------|-------|----------------|-----------|-------------|
| Colorado | High-risk AI systems | Impact assessments, risk management, consumer notice | Feb 2026 | AG only |
| Illinois | AI video interviews | Notice, consent, data deletion | Jan 2020 | Dept. of Labor |
| NYC | Employment AEDTs | Annual bias audit, publication, notice | Jul 2023 | DCWP |
| Connecticut | High-risk AI systems | Impact assessments, risk management | 2026 | AG only |
| Texas | Deepfakes | Criminal prohibition near elections | Sep 2019 | Criminal |
| California | GenAI training data | Training data summary disclosure | Jan 2026 | AG / civil |
| Maryland | Facial recognition in hiring | Applicant consent required | Oct 2020 | Civil action |
| Washington | AI in insurance | Fairness testing for AI in underwriting | 2025+ | Insurance Comm. |

## Interaction with Other Areas

- **Employment:** State AI employment laws (Illinois AIVIVA, NYC LL 144, Colorado SB 205) directly regulate AI in hiring and workforce management. These interact with federal employment discrimination law (Title VII, ADA) and EEOC AI guidance. Load `employment/` for overlapping obligations.
- **Data Privacy:** AI systems processing personal data in California, Colorado, Connecticut, and other states with comprehensive privacy laws trigger both AI-specific and general privacy obligations. Colorado SB 205 explicitly references data protection impact assessments.
- **Consumer Protection:** Colorado SB 205 is structured as a consumer protection statute. State UDAP laws may independently reach deceptive AI practices. Load `consumer-protection/` for overlapping enforcement risk.
- **Data Privacy (Biometric):** Illinois BIPA, Texas CUBI, and Washington's biometric privacy law apply when AI systems process biometric identifiers, creating parallel compliance obligations alongside AI-specific statutes.

## Sources

- [Colorado SB 24-205 — Colorado General Assembly](https://leg.colorado.gov/bills/sb24-205) — Colorado AI Consumer Protection Act
- [Illinois AIVIVA (820 ILCS 42) — Illinois General Assembly](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=4015) — AI Video Interview Act
- [NYC Local Law 144 — NYC Council](https://legistar.council.nyc.gov/LegislationDetail.aspx?ID=4344524) — AEDT bias audit requirements
- [DCWP Rules on AEDTs](https://rules.cityofnewyork.us/rule/automated-employment-decision-tools-702/) — Implementing regulations for LL 144
- [Texas SB 2105 — Texas Legislature](https://capitol.texas.gov/BillLookup/History.aspx?LegSess=86R&Bill=SB2105) — Deepfake election interference law
- [California AB 2013 (2024)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB2013) — GenAI training data transparency
