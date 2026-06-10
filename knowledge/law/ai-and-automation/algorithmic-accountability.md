---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, eu, international]
last-reviewed: "2026-06-10"
authorities:
  - cite: "29 CFR Part 1607"
    title: "Uniform Guidelines on Employee Selection Procedures (four-fifths rule)"
    url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1607"
  - cite: "NIST AI Risk Management Framework"
    title: "AI RMF 1.0 and resources"
    url: "https://www.nist.gov/artificial-intelligence/ai-risk-management-framework"
  - cite: "Executive Order 14281, 90 FR 17537 (Apr. 28, 2025)"
    title: "Restoring Equality of Opportunity and Meritocracy (disparate-impact enforcement deprioritization)"
    url: "https://www.federalregister.gov/documents/2025/04/28/2025-07378/restoring-equality-of-opportunity-and-meritocracy"
  - cite: "CFPB withdrawal notice, FR Doc. 2025-08286 (May 12, 2025)"
    title: "Withdrawal of CFPB guidance including Circular 2022-03"
    url: "https://www.federalregister.gov/documents/2025/05/12/2025-08286/interpretive-rules-policy-statements-and-advisory-opinions-withdrawal"
  - cite: "Colorado SB 26-189 (2026)"
    title: "Repeal and replacement of Colorado AI Act impact-assessment framework"
    url: "https://leg.colorado.gov/bills/sb26-189"
---
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
- **Federal enforcement posture (as of June 2026)**: Executive Order 14281 (April 2025) directs federal agencies to deprioritize disparate-impact enforcement, and the EEOC removed its AI guidance from its website in January 2025. The statutes are unchanged — Title VII's disparate-impact framework is codified at 42 U.S.C. § 2000e-2(k) — and private plaintiffs, state AGs, and state laws (Illinois HB 3773, NYC LL 144) continue to enforce. Bias testing remains the prudent baseline.
- **Consequence**: Failure to test for bias does not itself create liability, but absence of testing eliminates key defenses. Demonstrated disparate impact triggers burden-shifting under federal anti-discrimination frameworks.

### Impact Assessments

- **What**: A structured evaluation of an algorithmic system's potential effects on individuals, groups, and society, conducted before deployment and periodically thereafter.
- **Colorado (status change, June 2026)**: The impact-assessment mandate in Colorado's SB 24-205 **never took effect** — the law was repealed and replaced by SB 26-189 (signed May 2026, effective January 2027), which drops impact assessments and risk-management programs in favor of notice, adverse-decision disclosure, data correction, and human review. See `us-state-ai-laws.md`.
- **California CCPA risk assessments**: CPPA regulations finalized September 2025 require documented risk assessments for high-risk processing, including training and use of ADMT for significant decisions — load `data-privacy/ccpa-cpra.md` for thresholds and timing.
- **NIST AI RMF**: Recommends impact assessments as part of the "Map" and "Measure" functions, evaluating societal and individual risks including bias, privacy, safety, and security.
- **EU AI Act (Art. 27)**: Deployers of high-risk AI systems that are public bodies or private entities providing public services must conduct a **fundamental rights impact assessment** before first use (timing now tied to the delayed high-risk compliance date — see `eu-ai-act.md`).
- **Threshold**: No single federal US mandate for AI impact assessments exists, but sectoral requirements (GDPR DPIAs, CCPA risk assessments, EU AI Act fundamental rights assessments) impose overlapping obligations depending on jurisdiction and use case.
- **Consequence**: Failure to conduct a required impact assessment is a standalone violation under applicable statutes.

### Transparency and Explainability

- **What**: Obligations to disclose the use of algorithmic decision-making and to provide meaningful explanations of how the system reaches its outputs.
- **EEOC AI Guidance (May 2023; withdrawn from eeoc.gov January 2025)**: The guidance treated AI tools as "selection procedures" subject to existing anti-discrimination rules and required adequate notice, particularly where ADA accommodations are implicated. Although the documents were pulled in 2025, the underlying Title VII/ADA obligations they described are statutory and remain enforceable, including by private plaintiffs.
- **FCRA requirements**: If an AI system constitutes or contributes to a "consumer report" under the FCRA, the user must provide adverse action notices disclosing the use of the report, the identity of the consumer reporting agency, and the consumer's right to dispute.
- **ECOA/Regulation B**: Creditors using AI in credit decisions must provide specific adverse action reasons to applicants. Generic reasons like "based on our model" are insufficient under Regulation B itself. (CFPB Circular 2022-03, which said the same for complex algorithms, was withdrawn in May 2025 — rely on the regulation, not the circular.)
- **Threshold**: Varies by context. Employment (EEOC), credit (ECOA, FCRA), and housing (FHA) all impose context-specific transparency requirements when algorithmic tools are involved.
- **Consequence**: Failure to provide required adverse action notices is a violation under FCRA (statutory damages of **$100-$1,000 per consumer**, plus actual damages and attorneys' fees in private actions) and ECOA (actual damages, punitive damages up to **$10,000 individual / $500,000 or 1% of net worth class action**).

### NIST AI Risk Management Framework (AI RMF 1.0)

- **What**: Voluntary framework published by NIST in January 2023, providing a structured approach to managing AI risks. Organized around four core functions: **Govern**, **Map**, **Measure**, and **Manage**.
- **Govern**: Establish AI governance structures, policies, roles, and accountability mechanisms.
- **Map**: Understand the context of the AI system, its intended and foreseeable uses, and potential impacts on individuals and groups.
- **Measure**: Employ quantitative and qualitative methods to assess AI system trustworthiness characteristics (validity, reliability, safety, fairness, bias, transparency, explainability, privacy, security).
- **Manage**: Allocate resources and implement responses to identified risks, including monitoring and continuous improvement.
- **Legal relevance**: Voluntary, but referenced as a compliance benchmark in enacted law — e.g., California SB 53 (2025) points frontier developers to NIST AI RMF/ISO 42001-aligned frameworks. (The NIST-based affirmative defense in Colorado's SB 24-205 was repealed with that law in May 2026 before taking effect.) Adoption still strengthens defensibility across jurisdictions.

### FTC Enforcement on Algorithmic Fairness

- **What**: The FTC has asserted authority under Section 5 (unfair or deceptive acts or practices) to address discriminatory and deceptive algorithmic practices.
- **Key enforcement actions**: FTC has brought enforcement actions requiring companies to **delete algorithms and models** trained on improperly collected data (e.g., Everalbum/Paravision 2021, Weight Watchers/Kurbo 2022). FTC has also challenged deceptive AI claims (e.g., misrepresenting AI capabilities).
- **Algorithmic disgorgement**: FTC has ordered companies to destroy not just improperly collected data but also the algorithms and models derived from that data — a powerful remedy that destroys significant business value.
- **Threshold**: Applies whenever an algorithm or AI system involves consumer data, consumer-facing decisions, or marketing claims about AI capabilities. (Enforcement emphasis as of June 2026 leans toward deceptive AI claims rather than algorithmic-fairness theories, consistent with EO 14281 — but Section 5 deception authority is unchanged.)
- **Consequence**: FTC consent orders with ongoing compliance monitoring. Civil penalties of up to **$53,088 per violation per day** (2025-adjusted amount, carried into 2026) for violations of consent orders. No statutory cap on equitable remedies including algorithmic disgorgement.

### EEOC AI Guidance (Withdrawn — Statutes Unchanged)

- **What**: In May 2023, the EEOC issued guidance on the application of Title VII to employers' use of algorithmic decision-making tools, and separately addressed AI and the ADA. **The EEOC removed these documents from its website in January 2025**, and EO 14281 (April 2025) directs deprioritization of federal disparate-impact enforcement.
- **Key positions (still sound as statutory analysis)**: (1) Employers are liable for discriminatory outcomes of AI tools even when the tool is provided by a third-party vendor. (2) AI tools used in hiring, firing, promotion, or other employment decisions are "selection procedures" subject to the Uniform Guidelines. (3) The four-fifths rule applies to AI-driven selection. (4) Employers must provide reasonable accommodations for disabilities that affect interaction with AI screening tools.
- **Threshold**: Title VII (15+ employees) and the ADA apply to AI-driven employment decisions regardless of the guidance's withdrawal; private plaintiffs and state/local enforcers (Illinois HB 3773, NYC LL 144) carry the practical risk as of June 2026.
- **Consequence**: Standard Title VII remedies: back pay, front pay, compensatory damages, punitive damages (capped at **$50,000-$300,000** depending on employer size), injunctive relief, and attorneys' fees.

## Interaction with Other Areas

- **Employment:** Algorithmic accountability in employment is governed jointly by this area and employment anti-discrimination law. Title VII, the ADA, and the ADEA apply fully to AI-driven employment decisions (the EEOC's withdrawn 2023 guidance described how). Load `employment/` for discrimination frameworks.
- **Data Privacy:** Bias testing and impact assessments may require processing sensitive personal data (race, gender, disability status), creating tension with data minimization principles under GDPR and US state privacy laws. GDPR Art. 22 and DPIA requirements overlap with algorithmic accountability obligations.
- **Consumer Protection:** FTC enforcement on algorithmic fairness falls under consumer protection authority. Deceptive claims about AI accuracy or fairness are actionable under Section 5. Load `consumer-protection/ftc-udap.md`.
- **Financial Services:** AI in credit, insurance, and lending decisions triggers overlapping obligations under ECOA, FCRA, and state insurance regulations. Algorithmic accountability requirements compound with existing fair lending compliance. Load `financial-services/`.

## Sources

- [NIST AI Risk Management Framework (AI RMF 1.0)](https://www.nist.gov/artificial-intelligence/ai-risk-management-framework) — Voluntary governance framework
- [Uniform Guidelines on Employee Selection Procedures, 29 CFR Part 1607 — eCFR](https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1607) — Four-fifths rule and selection-procedure validation
- [Executive Order 14281, 90 FR 17537 (Apr. 28, 2025)](https://www.federalregister.gov/documents/2025/04/28/2025-07378/restoring-equality-of-opportunity-and-meritocracy) — Disparate-impact enforcement deprioritization
- [CFPB guidance withdrawal notice (May 12, 2025) — Federal Register](https://www.federalregister.gov/documents/2025/05/12/2025-08286/interpretive-rules-policy-statements-and-advisory-opinions-withdrawal) — Withdrawal of Circular 2022-03 and other guidance
- [Colorado SB 26-189 — Colorado General Assembly](https://leg.colorado.gov/bills/sb26-189) — Repeal/replacement of the SB 24-205 impact-assessment regime
- [FTC Blog: Aiming for Truth, Fairness, and Equity in AI](https://www.ftc.gov/business-guidance/blog/2021/04/aiming-truth-fairness-equity-your-companys-use-ai) — FTC enforcement posture on AI (2021; emphasis has since shifted)

---
