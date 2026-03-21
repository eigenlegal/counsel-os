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
