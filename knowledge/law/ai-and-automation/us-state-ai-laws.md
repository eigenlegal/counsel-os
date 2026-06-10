---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-state]
---
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
