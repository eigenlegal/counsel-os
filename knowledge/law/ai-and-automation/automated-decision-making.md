---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, eu, international]
last-reviewed: "2026-06-10"
authorities:
  - cite: "Regulation (EU) 2016/679, Art. 22"
    title: "GDPR right against solely automated decisions"
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj"
  - cite: "15 U.S.C. § 1691; 12 CFR Part 1002"
    title: "Equal Credit Opportunity Act and Regulation B"
    url: "https://www.law.cornell.edu/uscode/text/15/1691"
  - cite: "CFPB withdrawal notice, FR Doc. 2025-08286 (May 12, 2025)"
    title: "Interpretive Rules, Policy Statements, and Advisory Opinions; Withdrawal (includes Circular 2022-03)"
    url: "https://www.federalregister.gov/documents/2025/05/12/2025-08286/interpretive-rules-policy-statements-and-advisory-opinions-withdrawal"
  - cite: "OMB Memorandum M-25-21 (April 3, 2025)"
    title: "Accelerating Federal Use of AI through Innovation, Governance, and Public Trust (rescinds M-24-10)"
    url: "https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf"
  - cite: "Executive Order 14281, 90 FR 17537 (Apr. 28, 2025)"
    title: "Restoring Equality of Opportunity and Meritocracy (disparate-impact enforcement deprioritization)"
    url: "https://www.federalregister.gov/documents/2025/04/28/2025-07378/restoring-equality-of-opportunity-and-meritocracy"
  - cite: "Colorado SB 26-189 (2026)"
    title: "Colorado ADMT framework replacing SB 24-205"
    url: "https://leg.colorado.gov/bills/sb26-189"
  - cite: "CPPA CCPA regulations (ADMT)"
    title: "California ADMT, risk assessment, and cybersecurity audit regulations"
    url: "https://cppa.ca.gov/regulations/ccpa_updates.html"
---
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
- **Adverse action notice requirements**: Regulation B (12 CFR 1002.9) requires creditors to provide specific reasons for adverse credit actions. Generic "the model said no" reasons do not satisfy the regulation; creditors must identify the actual factors relied upon, even if the model is complex. Note: CFPB Circular 2022-03, which articulated this position for AI/ML models, was **withdrawn on May 12, 2025** as part of a mass withdrawal of CFPB guidance — but the underlying Regulation B specificity requirement is regulatory text and remains binding.
- **Disparate impact**: Facially neutral algorithms that produce discriminatory outcomes are subject to disparate impact analysis. The creditor bears the burden of demonstrating business necessity for factors that produce disparate impact. **Enforcement posture caveat (as of June 2026)**: Executive Order 14281 (April 2025) directs federal agencies (DOJ, CFPB, EEOC, FTC) to deprioritize disparate-impact enforcement. The statutory and regulatory framework is unchanged, and private plaintiffs and state regulators continue to pursue disparate-impact theories — do not treat the federal posture shift as a change in the law.
- **Threshold**: Applies to all creditors using AI/algorithmic tools in any aspect of credit decision-making (origination, underwriting, pricing, servicing, collections).
- **Consequence**: ECOA violations: actual damages, punitive damages up to **$10,000 (individual) / $500,000 or 1% of net worth (class action)**, injunctive relief, and attorneys' fees. CFPB, DOJ, and prudential regulators all have enforcement authority. Pattern-or-practice discrimination referrals to DOJ.

### Title VII and Employment Decisions

- **What**: Title VII of the Civil Rights Act (42 U.S.C. Section 2000e) prohibits employment discrimination on the basis of race, color, religion, sex, or national origin. The EEOC's 2023 technical assistance confirmed that employers are liable for discriminatory outcomes of AI employment tools even when the tool is provided by a third-party vendor. **Status note (as of June 2026)**: the EEOC removed its AI guidance documents from its website in January 2025, and EO 14281 directs deprioritization of disparate-impact enforcement — but Title VII itself (including its codified disparate-impact provision, 42 U.S.C. § 2000e-2(k)) is unchanged, and private plaintiffs, state agencies, and state laws (e.g., Illinois HB 3773) still enforce these theories.
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

- **What**: A growing number of US states are enacting laws requiring meaningful human review of certain automated decisions, particularly in employment, privacy, and insurance contexts.
- **Colorado SB 26-189 (effective 1 January 2027)**: Colorado's replacement AI law (the original SB 24-205 was repealed in May 2026 without ever taking effect) requires deployers of automated decision-making technology to disclose adverse consequential decisions within 30 days, correct inaccurate personal data, and provide **meaningful human review and reconsideration** of adverse decisions. AG enforcement only, contingent on completed rulemaking.
- **California CCPA ADMT regulations (compliance by 1 January 2027)**: CPPA regulations finalized September 2025 require notice, opt-out (with exceptions), and access rights when a business uses automated decision-making technology to make a "significant decision" (financial/lending services, housing, education, employment, healthcare). Load `data-privacy/ccpa-cpra.md`.
- **Illinois AIVIVA**: Requires employer consent and notice for AI-analyzed video interviews, effectively imposing a human review checkpoint before AI analysis occurs.
- **Insurance AI governance**: The NAIC's Model Bulletin on insurers' use of AI (December 2023) — adopted by roughly half the states, including Washington (2024 bulletin) — sets governance, documentation, and unfair-discrimination expectations for AI in underwriting and rating, enforced through existing insurance unfair-trade-practices authority.
- **Maryland facial recognition in hiring (HB 1202)**: Prohibits employers from using facial recognition technology during job interviews without the applicant's written consent. Effective October 2020.
- **Threshold**: Human review requirements vary by jurisdiction and domain. Emerging consensus requires meaningful human oversight (not rubber-stamping) for high-impact automated decisions.
- **Consequence**: Varies by statute. Colorado SB 26-189: AG enforcement, no private right of action. State insurance regulation: regulatory action including cease-and-desist orders and license revocation.

### Government Use of Automated Decision-Making

- **What**: Federal and state governments increasingly use AI for benefits administration, fraud detection, child welfare risk scoring, criminal sentencing, and immigration decisions. Constitutional due process requires notice and an opportunity to be heard before deprivation of liberty or property interests.
- **Due process concerns**: Automated denial of government benefits (Medicaid, SNAP, unemployment) without adequate notice, explanation, or human appeal may violate the Due Process Clause of the 14th Amendment. Courts have struck down automated benefit denial systems (*K.W. v. Armstrong*, 9th Cir. 2015 — Medicaid budget reductions via algorithm without adequate notice).
- **Federal agency guidance**: OMB Memorandum **M-25-21** (April 3, 2025) — which rescinded and replaced M-24-10 pursuant to Executive Order 14179 — governs federal agency AI use as of June 2026. It retains Chief AI Officers, agency AI governance structures, and minimum risk-management practices for "high-impact AI" (a narrower successor to the rights-/safety-impacting categories), while emphasizing AI adoption and innovation. Companion memo M-25-22 governs federal AI procurement. Do not cite M-24-10 as current.
- **Threshold**: Any government use of AI for decisions affecting individual rights or benefits triggers due process analysis.
- **Consequence**: Constitutional challenges may result in injunctive relief halting the use of the system, retroactive reinstatement of benefits, and damages under 42 U.S.C. Section 1983.

## Interaction with Other Areas

- **Data Privacy:** GDPR Art. 22 is the primary EU-level automated decision-making provision. CCPA and state privacy laws also provide opt-out rights that may apply to profiling and automated decisions. Load `data-privacy/gdpr.md` for Art. 22 details and `data-privacy/us-state-privacy.md` for state-level profiling rights.
- **Employment:** AI in employment decisions is governed jointly by this area, Title VII, the ADA, ADEA, and state employment laws. The Uniform Guidelines still apply; the EEOC's AI-specific guidance was withdrawn from its website in 2025, so lean on the statutes and state law (Illinois HB 3773, NYC LL 144). Load `employment/` for employment discrimination frameworks.
- **Financial Services:** AI in credit, lending, and insurance decisions triggers ECOA, FCRA, and state insurance regulations simultaneously. Fair lending compliance programs must account for algorithmic risk. Load `financial-services/` for sectoral requirements.
- **Consumer Protection:** FTC enforcement on algorithmic decision-making, CFPB adverse action guidance, and state UDAP laws overlap with automated decision-making obligations. Load `consumer-protection/` for enforcement frameworks.
- **Algorithmic Accountability:** This file addresses the legal rights and obligations arising from automated decisions. `algorithmic-accountability.md` addresses the testing, auditing, and governance frameworks to ensure those obligations are met. Load both for comprehensive coverage.

## Sources

- [GDPR Article 22 and Recitals 71-72 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Right against solely automated decisions
- [EDPB Guidelines on Automated Individual Decision-Making and Profiling (WP251rev.01)](https://ec.europa.eu/newsroom/article29/items/612053) — Interpretive guidance on Art. 22
- [Regulation B, 12 CFR Part 1002 — eCFR](https://www.ecfr.gov/current/title-12/chapter-X/part-1002) — ECOA adverse action notice requirements (CFPB Circular 2022-03 was withdrawn May 12, 2025; the regulation remains binding)
- [CFPB guidance withdrawal notice (May 12, 2025) — Federal Register](https://www.federalregister.gov/documents/2025/05/12/2025-08286/interpretive-rules-policy-statements-and-advisory-opinions-withdrawal) — Withdrawal of 67 guidance documents including Circular 2022-03
- [OMB Memorandum M-25-21 (April 3, 2025)](https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf) — Federal agency AI governance (rescinds M-24-10)
- [Executive Order 14281, 90 FR 17537 (Apr. 28, 2025)](https://www.federalregister.gov/documents/2025/04/28/2025-07378/restoring-equality-of-opportunity-and-meritocracy) — Disparate-impact enforcement deprioritization
- [Colorado SB 26-189 — Colorado General Assembly](https://leg.colorado.gov/bills/sb26-189) — ADMT adverse-decision disclosure and human review
- [CPPA CCPA regulations — ADMT](https://cppa.ca.gov/regulations/ccpa_updates.html) — California automated decision-making technology rules

---
