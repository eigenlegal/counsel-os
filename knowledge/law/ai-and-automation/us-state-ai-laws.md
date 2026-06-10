---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-state]
last-reviewed: "2026-06-10"
authorities:
  - cite: "Colorado SB 26-189 (2026)"
    title: "Artificial Intelligence Consumer Protections — repeals and replaces SB 24-205"
    url: "https://leg.colorado.gov/bills/sb26-189"
  - cite: "Colorado SB 25B-004 (2025 Special Session)"
    title: "Delay of Colorado AI Act effective date to June 30, 2026"
    url: "https://leg.colorado.gov/bills/sb25b-004"
  - cite: "Connecticut Public Act 26-15 (SB 5)"
    title: "Connecticut Artificial Intelligence Responsibility and Transparency Act"
    url: "https://www.cga.ct.gov/2026/act/pa/pdf/2026PA-00015-R00SB-00005-PA.pdf"
  - cite: "Texas HB 149 (89R, 2025)"
    title: "Texas Responsible Artificial Intelligence Governance Act (TRAIGA)"
    url: "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149"
  - cite: "California SB 53 (2025)"
    title: "Transparency in Frontier Artificial Intelligence Act"
    url: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53"
  - cite: "California AB 853 (2025)"
    title: "California AI Transparency Act amendments (SB 942 delay to August 2, 2026)"
    url: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB853"
  - cite: "Illinois HB 3773 (2024), 775 ILCS 5"
    title: "Illinois Human Rights Act amendment on AI in employment decisions"
    url: "https://www.ilga.gov/ftp/legislation/103/BillStatus/HTML/10300HB3773.html"
  - cite: "820 ILCS 42"
    title: "Illinois Artificial Intelligence Video Interview Act"
    url: "https://www.ilga.gov/Legislation/ILCS/Articles?ActID=4015&ChapterID=68"
  - cite: "Texas SB 751 (86R, 2019), Tex. Elec. Code § 255.004"
    title: "Texas election deepfake criminal offense"
    url: "https://capitol.texas.gov/tlodocs/86R/billtext/pdf/SB00751F.pdf"
  - cite: "Executive Order of December 11, 2025"
    title: "Ensuring a National Policy Framework for Artificial Intelligence (state-law preemption initiative)"
    url: "https://www.whitehouse.gov/presidential-actions/2025/12/eliminating-state-law-obstruction-of-national-artificial-intelligence-policy/"
---
# US State AI Laws

## Applicability

This sub-topic is relevant when ANY of the following are true:

- An AI system or automated decision-making tool is deployed, offered, or used in the United States.
- An employer uses AI-powered tools for hiring, screening, or employment decisions in a jurisdiction with AI-specific employment laws.
- Automated employment decision tools (AEDTs) are used to evaluate candidates or employees in New York City.
- AI-generated content, deepfakes, or synthetic media are created or distributed in a state with relevant legislation.
- A developer or deployer of an AI system operates in a state with comprehensive AI governance legislation (Texas, Colorado, Connecticut, Utah) or develops frontier models touching California or Connecticut law.

State AI legislation is rapidly evolving. This file reflects enacted laws as of June 2026. Always verify current status of pending bills — and of enacted laws: Colorado's flagship AI Act was repealed and replaced before it ever took effect (see below).

**Federal preemption pressure (as of June 2026):** A December 11, 2025 executive order ("Ensuring a National Policy Framework for Artificial Intelligence") directed the Attorney General to establish an AI Litigation Task Force to challenge state AI laws, directed Commerce to identify "onerous" state AI laws, and conditioned certain federal funding. DOJ moved to intervene in *xAI v. Weiser* (D. Colo. 2026), the challenge to Colorado's AI Act. Before advising on any state AI law, check whether it is subject to a pending federal challenge or injunction.

## Key Requirements

### Colorado — SB 24-205 Repealed and Replaced by SB 26-189

- **What**: Colorado's 2024 AI Act (SB 24-205), the first comprehensive state law on "high-risk AI systems" and algorithmic discrimination, **never took effect**. Its effective date was pushed from 1 February 2026 to 30 June 2026 (SB 25B-004, August 2025 special session); a stipulated stay of enforcement was entered in *xAI v. Weiser* (D. Colo., 27 April 2026); and the legislature then repealed and replaced it with **SB 26-189**, signed 14 May 2026.
- **SB 26-189 framework**: A much narrower regime aimed at "automated decision-making technology" (ADMT) that processes personal data to materially influence a "consequential decision." It drops the old law's developer/deployer risk management programs, annual impact assessments, and duty of reasonable care to prevent algorithmic discrimination. In their place: (1) notify consumers when they are interacting with AI, (2) disclose to a consumer within 30 days of an adverse consequential decision made using ADMT, (3) correct inaccurate personal data on request, and (4) provide meaningful human review and reconsideration of adverse decisions.
- **Threshold/Timeline**: SB 26-189 takes effect **1 January 2027**, with enforcement contingent on the Attorney General completing rulemaking. The AG has stated he does not intend to enforce SB 24-205 or its replacement until rulemaking concludes.
- **Consequence**: Enforced exclusively by the Colorado Attorney General. No private right of action.
- **Practice note (as of June 2026)**: Older summaries describing Colorado impact-assessment, risk-management, and NIST-AI-RMF-affirmative-defense obligations describe the repealed SB 24-205 and are no longer operative. Verify the current text of SB 26-189 and the AG's rulemaking status before advising.

### Illinois Artificial Intelligence Video Interview Act (AIVIVA) (820 ILCS 42)

- **What**: Requires employers using AI to analyze video interviews of applicants to: (1) notify the applicant before the interview that AI will be used and explain how it works, (2) obtain the applicant's written consent before the interview, and (3) comply with destruction and sharing limitations.
- **Threshold/Timeline**: Effective since **1 January 2020**. Applies to all employers using AI video interview analysis in Illinois, regardless of employer size.
- **Data obligations**: Employers must delete video interviews within 30 days of an applicant's request. Videos may only be shared with persons whose expertise is necessary to evaluate the applicant.
- **Consequence**: The Act itself specifies no penalties and designates no enforcement agency — a frequently noted gap. Practical exposure runs through adjacent statutes: BIPA (if facial/voice analysis captures biometric identifiers) and, from 1 January 2026, the Illinois Human Rights Act AI amendment (HB 3773, below).

### Illinois HB 3773 — Human Rights Act AI Amendment

- **What**: Amends the Illinois Human Rights Act (775 ILCS 5) to make it a civil rights violation for an employer to use AI that has the effect of discriminating on the basis of a protected class in recruitment, hiring, promotion, selection for training, discharge, discipline, tenure, or terms/privileges/conditions of employment — and to use zip codes as a proxy for protected classes.
- **Notice**: Employers must provide notice when AI is used for the covered employment decisions. The Illinois Department of Human Rights' implementing notice rules were still in rulemaking as of mid-2026 — verify current status before advising on notice mechanics.
- **Threshold/Timeline**: Effective **1 January 2026**. Covers AI broadly (machine-based systems inferring outputs such as predictions, recommendations, or decisions from inputs), including generative AI.
- **Consequence**: Standard IHRA enforcement — IDHR charge process, with actual damages, civil penalties, attorneys' fees, and equitable relief available.

### NYC Local Law 144 — Automated Employment Decision Tools (AEDTs)

- **What**: Employers and employment agencies in New York City using an AEDT to screen candidates or employees for employment decisions must: (1) subject the tool to an independent **bias audit** no more than one year prior to use, (2) publish the audit results on their website, and (3) provide notice to candidates at least **10 business days** before use.
- **Bias audit requirements**: Must assess the tool's disparate impact on candidates by sex, race/ethnicity, and intersectional categories. Uses selection rate or scoring rate comparisons. Must be conducted by an independent auditor.
- **Threshold/Timeline**: Effective since **5 July 2023**. Applies to employers and employment agencies in NYC. An AEDT is defined as a computational process derived from machine learning, statistical modeling, data analytics, or AI that issues a simplified output (score, classification, or recommendation) used to substantially assist or replace discretionary decision-making.
- **Consequence**: Civil penalties of **$500 per violation for first offense**, **$500-$1,500 per subsequent violation**. Each day of non-compliance may be a separate violation. Enforced by the NYC Department of Consumer and Worker Protection (DCWP).

### Connecticut Public Act 26-15 (SB 5, 2026) — CART Act

- **What**: The Connecticut Artificial Intelligence Responsibility and Transparency Act, signed 27 May 2026 (per the CGA bill record for SB 5). (Connecticut's earlier SB 2 (2024) passed the Senate but died in the House and was **never enacted** — discard any summary describing it as law.) The CART Act is an omnibus statute covering automated employment-related decision systems, consumer AI chatbots/companions, frontier-model developer safety and whistleblower duties, generative-AI provenance/watermarking, online platforms used by minors, and AI-subscription consumer disclosures, with healthcare carveouts and innovation programs (AI Policy Office, learning laboratory, sandbox-style initiatives).
- **Threshold/Timeline**: Staggered effective dates beginning **1 October 2026**. Reported milestones include: frontier-developer anti-retaliation duties from 1 October 2026; AI-companion requirements and large-frontier-developer anonymous reporting channels from 1 January 2027; employment ADT obligations applying to systems deployed on or after 1 October 2027.
- **Consequence**: Enforcement mechanics vary by chapter; verify against the public act text (PA 26-15) before advising on remedies or which agency enforces a given provision.

### Texas HB 149 (2025) — Responsible AI Governance Act (TRAIGA)

- **What**: Comprehensive (but intent-based and developer-friendly) AI statute, signed 22 June 2025, effective **1 January 2026** — now in force. Applies to anyone developing or deploying AI systems in Texas or offering AI products/services to Texas residents.
- **Prohibitions**: Developing/deploying AI systems intentionally designed to incite self-harm, violence, or criminal activity; AI systems developed or deployed with the intent to unlawfully discriminate against protected classes (the statute targets intentional discrimination, not disparate impact alone); AI-generated CSAM and certain sexually explicit content; government social scoring; and government biometric identification from scraped media without consent where it would infringe rights. State agencies (not private businesses) must disclose to consumers that they are interacting with AI.
- **Innovation provisions**: 36-month regulatory sandbox and an AI advisory council.
- **Consequence**: Exclusive Texas Attorney General enforcement; no private right of action; 60-day cure period; civil penalties scale with curability and intent.

### Texas Deepfake Laws — SB 751 (2019) and Penal Code § 21.165

- **What**: Texas Election Code § 255.004 (added by **SB 751**, 2019) criminalizes creating and publishing a deepfake video intended to injure a candidate or influence an election within **30 days** of the election. Separately, Texas Penal Code § 21.165 (SB 1361, 2023; amended 2025 to cover "sexually explicit media") criminalizes knowingly producing or distributing deepfake intimate imagery without the depicted person's consent.
- **Threshold/Timeline**: Election provision effective 1 September 2019; intimate-imagery offense effective 1 September 2023, expanded in 2025.
- **Consequence**: Election deepfakes: **Class A misdemeanor** (up to 1 year in jail, $4,000 fine). Non-consensual intimate deepfakes: Class A misdemeanor, elevated to a **third-degree felony** for repeat offenses or where the depicted person is a minor.

### California AI Legislation

- **SB 53 (2025) — Transparency in Frontier Artificial Intelligence Act**: Signed 29 September 2025, effective **1 January 2026** — now in force. Applies to "frontier developers" (models trained with >10^26 FLOPs, including cumulative fine-tuning compute); "large frontier developers" (annual revenue over $500M) face the heaviest duties. Requires published frontier AI frameworks (catastrophic-risk governance, aligned to standards such as NIST AI RMF or ISO/IEC 42001), pre-deployment transparency reports, critical-safety-incident reporting to the California Office of Emergency Services within 15 days, and whistleblower protections. AG enforcement; civil penalties up to **$1 million per violation**.
- **AB 2013 (2024)**: Requires developers of generative AI systems to publish on their website a high-level summary of training data, including sources, whether it includes copyrighted material, personal information, or aggregate information about data. Effective **1 January 2026** — now in force.
- **SB 942 (2024, as amended by AB 853 (2025)) — California AI Transparency Act**: AI-detection tools plus manifest/latent provenance disclosures for covered generative AI providers (1M+ monthly users). AB 853 **delayed the operative date to 2 August 2026** (aligning with the EU AI Act) and extended obligations to GenAI hosting platforms and large online platforms on later phase-in dates (hosting-platform duties from 1 January 2027).
- **AB 2655 (2024)**: Required large online platforms to label or remove deceptive AI-generated election content. **Permanently enjoined** — *X Corp. v. Bonta* (E.D. Cal. 2025) held it preempted by Section 230 as applied to platforms; appeal pending as of June 2026. Companion statute AB 2839 was separately struck on First Amendment grounds (*Kohls v. Bonta*, E.D. Cal. 2025). Do not advise compliance with either as if operative without checking current appellate status.

### State Comparison Matrix

| State/Jurisdiction | Scope | Key Obligation | Effective | Enforcement |
|-------------------|-------|----------------|-----------|-------------|
| Colorado (SB 26-189) | ADMT in consequential decisions | AI-interaction notice, adverse-decision disclosure, data correction, human review | Jan 2027 (post-rulemaking) | AG only |
| Texas (TRAIGA) | AI systems generally | Intent-based prohibitions; government disclosure and biometric limits | Jan 2026 | AG only |
| Illinois (AIVIVA) | AI video interviews | Notice, consent, data deletion | Jan 2020 | None specified |
| Illinois (HB 3773) | AI in employment decisions | Discrimination prohibition, notice, no zip-code proxies | Jan 2026 | IDHR / IHRA |
| NYC | Employment AEDTs | Annual bias audit, publication, notice | Jul 2023 | DCWP |
| Connecticut (PA 26-15) | Employment ADT, chatbots, frontier models, provenance, minors | Staggered transparency, safety, and provenance duties | Oct 2026 - Oct 2027 | Varies by chapter |
| California (SB 53) | Frontier models (>10^26 FLOPs) | Safety frameworks, transparency reports, incident reporting | Jan 2026 | AG; up to $1M/violation |
| California (AB 2013) | GenAI training data | Training data summary disclosure | Jan 2026 | AG / civil |
| California (SB 942/AB 853) | GenAI provenance | Detection tool, manifest/latent disclosures | Aug 2026 | Civil penalties |
| Texas (Elec. Code, Penal Code) | Deepfakes | Criminal prohibitions (elections, NCII) | Sep 2019 / Sep 2023 | Criminal |
| Maryland | Facial recognition in hiring | Applicant consent required | Oct 2020 | Civil action |
| Washington | AI in insurance | NAIC AI Model Bulletin adopted (governance expectations for insurers) | 2024 | Insurance Comm. |

## Interaction with Other Areas

- **Employment:** State AI employment laws (Illinois AIVIVA and HB 3773, NYC LL 144, Connecticut PA 26-15) directly regulate AI in hiring and workforce management. These interact with federal employment discrimination law (Title VII, ADA) — noting that federal enforcement posture shifted in 2025 (see `automated-decision-making.md`). Load `employment/` for overlapping obligations.
- **Data Privacy:** AI systems processing personal data in California, Colorado, Connecticut, and other states with comprehensive privacy laws trigger both AI-specific and general privacy obligations. California's CCPA ADMT regulations (compliance by 1 January 2027) and Colorado SB 26-189 both regulate automated decision-making through a privacy lens.
- **Consumer Protection:** Colorado's SB 26-189 and Texas TRAIGA are structured as consumer protection statutes. State UDAP laws may independently reach deceptive AI practices. Load `consumer-protection/` for overlapping enforcement risk.
- **Data Privacy (Biometric):** Illinois BIPA, Texas CUBI, and Washington's biometric privacy law apply when AI systems process biometric identifiers, creating parallel compliance obligations alongside AI-specific statutes.

## Sources

- [Colorado SB 26-189 — Colorado General Assembly](https://leg.colorado.gov/bills/sb26-189) — Repeals and replaces the Colorado AI Act (SB 24-205)
- [Colorado SB 25B-004 — Colorado General Assembly](https://leg.colorado.gov/bills/sb25b-004) — 2025 special-session delay of SB 24-205
- [Connecticut Public Act 26-15 (SB 5)](https://www.cga.ct.gov/2026/act/pa/pdf/2026PA-00015-R00SB-00005-PA.pdf) — CART Act full text
- [Texas HB 149 (TRAIGA) — Texas Legislature](https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149) — Texas Responsible AI Governance Act
- [California SB 53 — California Legislative Information](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53) — Transparency in Frontier Artificial Intelligence Act
- [Illinois HB 3773 — Illinois General Assembly](https://www.ilga.gov/ftp/legislation/103/BillStatus/HTML/10300HB3773.html) — IHRA AI amendment
- [Illinois AIVIVA (820 ILCS 42) — Illinois General Assembly](https://www.ilga.gov/Legislation/ILCS/Articles?ActID=4015&ChapterID=68) — AI Video Interview Act
- [NYC Local Law 144 — NYC Council](https://legistar.council.nyc.gov/LegislationDetail.aspx?ID=4344524) — AEDT bias audit requirements
- [DCWP Rules on AEDTs](https://rules.cityofnewyork.us/rule/automated-employment-decision-tools-702/) — Implementing regulations for LL 144
- [Texas SB 751 (2019) — Texas Legislature](https://capitol.texas.gov/tlodocs/86R/billtext/pdf/SB00751F.pdf) — Election deepfake law (Tex. Elec. Code § 255.004)
- [California AB 2013 (2024)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB2013) — GenAI training data transparency
- [Executive Order of Dec. 11, 2025 — White House](https://www.whitehouse.gov/presidential-actions/2025/12/eliminating-state-law-obstruction-of-national-artificial-intelligence-policy/) — National AI policy framework / state-law challenges
