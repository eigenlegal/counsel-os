---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
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
