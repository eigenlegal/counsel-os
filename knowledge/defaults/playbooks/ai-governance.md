---
counsel-os-type: playbook
counsel-os-version: "0.3.1"
---

# AI Governance Playbook

## When to Use
Use this playbook when evaluating AI vendors, building an internal AI/ML acceptable use policy, assessing AI-related risk for existing deployments, or preparing for regulatory compliance with AI-specific laws (EU AI Act, state AI legislation, sector-specific AI guidance). This applies to both AI systems developed in-house and AI services procured from third-party vendors.

## Prerequisites
- Inventory of current and planned AI systems (or intent to build one)
- Load `knowledge/law/ai-and-automation/` — all applicable sub-files
- Load `knowledge/law/data-privacy/` — AI systems invariably involve personal data processing
- Load `knowledge/law/employment/` — if AI is used in hiring, performance management, or workforce decisions
- Load `knowledge/law/consumer-protection/` — if AI is used in consumer-facing products or automated decisions affecting consumers
- Executive sponsor for AI governance identified
- Technical team available to provide system documentation (model cards, training data descriptions, performance metrics)

## Process

### Step 1: Inventory AI Systems
Conduct a comprehensive inventory of all AI/ML systems used or planned across the organization:

**For Each AI System, Document:**
- **System name and vendor** (or internal team if built in-house)
- **Function:** What does the system do? (Content generation, recommendation, classification, prediction, decision-making, automation)
- **Domain:** Where is it deployed? (HR/recruiting, customer service, marketing, product features, fraud detection, underwriting, content moderation)
- **Data inputs:** What data does the system ingest? (Personal data, proprietary data, public data, customer content)
- **Data outputs:** What does the system produce? (Recommendations, scores, decisions, content, classifications)
- **Decision impact:** Does the system make or materially influence decisions affecting individuals? (Employment, credit, insurance, housing, education, access to services)
- **Human oversight:** Is there human review before decisions take effect? (Fully automated, human-in-the-loop, human-on-the-loop)
- **Deployment status:** Production, pilot, development, planned

**Decision — Scope of Governance:**
- **In scope (full governance):** Any system that uses machine learning, neural networks, large language models, or automated decision-making that affects individuals or processes personal data
- **In scope (light governance):** Rule-based automation, simple algorithms, statistical models without learning capability — document but apply lighter review
- **Out of scope:** Basic software automation (macros, workflow tools, RPA) that follows deterministic rules without data-driven learning

### Step 2: Classify Risk Tier
For each AI system, assess the risk level. Use the EU AI Act risk classification as the baseline framework (even if the EU AI Act does not yet apply — it represents the emerging global standard):

**Prohibited Practices (Do Not Deploy):**
- Social scoring by public authorities (or on their behalf)
- Real-time remote biometric identification in publicly accessible spaces (limited law enforcement exceptions)
- Exploitation of vulnerabilities of specific groups (age, disability)
- Subliminal manipulation causing harm
- Emotion recognition in workplaces or educational institutions (with limited exceptions)

**High Risk (Full Governance Framework Required):**
- AI used in hiring, recruitment, or employment decisions (resume screening, interview assessment, performance evaluation)
- AI used in credit scoring, loan underwriting, or insurance pricing
- AI used in educational admission or assessment
- AI used in law enforcement, border control, or administration of justice
- AI used in medical device/diagnostic contexts
- AI used in critical infrastructure management
- Any AI system that autonomously makes decisions with legal or similarly significant effects on individuals

**Limited Risk (Transparency Obligations):**
- Chatbots and conversational AI (must disclose AI interaction to users)
- AI-generated content (deepfakes, synthetic media — must label as AI-generated)
- Emotion recognition systems (must inform subjects)
- Biometric categorization systems (must inform subjects)

**Minimal Risk (Basic Documentation):**
- AI-powered spam filters, search optimization, content recommendations (non-consequential)
- Internal productivity tools (AI writing assistance, summarization, code generation)
- AI analytics for business intelligence (no individual impact)

### Step 3: Assess Bias and Fairness
For High Risk and Limited Risk AI systems, conduct a bias and fairness assessment:

**Bias Assessment Framework:**
- **Training data audit:** Is the training data representative of the population the system will serve? Are there known biases in the data (historical discrimination, underrepresentation, label bias)?
- **Protected characteristics:** Does the system directly or indirectly use protected characteristics (race, gender, age, disability, religion, national origin) as inputs or proxies?
- **Disparate impact testing:** Test system outputs across demographic groups. Apply the 4/5ths (80%) rule: if the selection/approval rate for any protected group is less than 80% of the rate for the highest-selected group, disparate impact is indicated.
- **Fairness metrics:** Define and measure appropriate fairness metrics for the use case (demographic parity, equalized odds, predictive parity, individual fairness)

**Decision — Bias Findings:**
- If disparate impact is detected AND the system is used for employment, credit, housing, or insurance decisions → do not deploy until bias is remediated. These are high-enforcement-risk areas (EEOC, CFPB, HUD, state AGs).
- If bias is detected in lower-risk applications → document the findings, implement mitigation measures, and monitor ongoing performance. Bias monitoring should be continuous, not a one-time assessment.

### Step 4: Evaluate Training Data Rights
Assess the legal basis for the data used to train, fine-tune, or operate the AI system:

**For In-House Models:**
- What data was used for training? Is it owned, licensed, or publicly available?
- If personal data was used: was there a valid legal basis for this processing purpose? (Consent, legitimate interest, contract performance)
- If copyrighted works were used: does a fair use / text-and-data-mining exception apply? (Varies by jurisdiction — US fair use is fact-specific; EU TDM exception in DSM Directive Article 4)
- If customer data was used: do the terms of service permit this use? Is it consistent with the privacy policy disclosures?
- Was synthetic data used? If so, what was the source data for generating it?

**For Third-Party AI Vendors:**
- Request the vendor's documentation on training data provenance
- Review the vendor's terms of service: does the vendor use your inputs (prompts, data) to train or improve their models? If yes, is this acceptable?
- Assess the vendor's IP indemnification for AI outputs (does the vendor indemnify against infringement claims arising from AI-generated content?)
- Review the vendor's DPA and data processing terms: where is data processed? Who has access? How long is data retained?

**Decision — Data Rights Red Flags:**
- Vendor uses customer inputs for model training without clear opt-out → negotiate opt-out or select a different vendor
- Training data includes scraped copyrighted content with no fair use analysis → legal risk for infringement; document risk acceptance or seek alternative training approach
- Personal data used for training without adequate legal basis → remediate (obtain consent, conduct legitimate interest assessment, or anonymize)

### Step 5: Draft AI Acceptable Use Policy
Create an internal policy governing the use of AI across the organization. Follow `playbooks/policy-drafting.md` for the drafting process.

**Policy Content:**
- **Approved AI tools:** List of AI systems approved for use, with any restrictions (e.g., "ChatGPT approved for drafting assistance; not approved for processing confidential data or personal data")
- **Prohibited uses:** Uses that are not permitted under any circumstances (generating deepfakes of real people, using AI for decisions in prohibited categories, inputting highly confidential or privileged information into third-party AI systems)
- **Data input restrictions:** What types of data may and may not be input into AI systems (personal data, trade secrets, attorney-client privileged information, source code, financial data)
- **Output review requirements:** All AI-generated content intended for external use must be reviewed by a human before publication/distribution
- **Disclosure requirements:** When AI involvement must be disclosed (customer interactions, generated content, automated decisions)
- **Procurement requirements:** New AI vendors must go through the standard vendor onboarding process (`playbooks/vendor-onboarding.md`) with additional AI-specific assessments
- **Incident reporting:** How to report AI failures, biased outputs, or unexpected behaviors

### Step 6: Implement Human Oversight
For High Risk AI systems, establish human oversight mechanisms:

**Oversight Model Selection:**
- **Human-in-the-loop:** A human reviews and approves every AI output before it takes effect. Required for: employment decisions, credit decisions, medical diagnoses, legal determinations.
- **Human-on-the-loop:** A human monitors AI outputs in real time and can intervene. Appropriate for: fraud detection, content moderation, customer service escalation.
- **Human-over-the-loop:** A human sets parameters and reviews aggregate performance periodically. Appropriate for: recommendation engines, search ranking, marketing optimization.

**Oversight Implementation:**
- Document which oversight model applies to each High Risk system
- Train human reviewers on: how the AI system works, known limitations, when to override, how to escalate
- Establish override authority: who can override an AI decision, under what circumstances, and how is the override documented
- Create an escalation path for AI decisions that are challenged by affected individuals
- Maintain audit logs of all AI decisions and human overrides

**Decision — Automation Level:**
- If applicable law requires human review (e.g., EEOC guidance on AI in hiring, ECOA/Reg B for credit decisions) → implement human-in-the-loop as a mandatory control
- If no specific legal requirement but the decision significantly affects individuals → implement human-in-the-loop as a best practice
- If the decision is low-impact and high-volume → human-on-the-loop or human-over-the-loop with statistical monitoring

### Step 7: Establish Ongoing Monitoring
Create a continuous monitoring program for AI systems:

**Monitoring Framework:**
| Monitoring Activity | Frequency | Responsible Party |
|---|---|---|
| Performance metrics review (accuracy, precision, recall) | Monthly | Data science / engineering |
| Bias and fairness audit | Quarterly | Legal + data science |
| Data drift detection (input data distribution changes) | Monthly (automated) | Engineering |
| Model drift detection (output quality degradation) | Monthly (automated) | Engineering |
| Regulatory landscape scan (new AI laws, guidance, enforcement) | Quarterly | Legal |
| Vendor compliance review (terms changes, incident reports) | Semi-annually | Legal + procurement |
| AI inventory update (new systems, retired systems) | Quarterly | All business units |
| Human override analysis (frequency, reasons, patterns) | Quarterly | Legal + business unit |
| Incident review (failures, complaints, bias reports) | As needed + quarterly aggregate | Legal + engineering |

**Regulatory Monitoring:**
- Track the EU AI Act implementation timeline and delegated acts
- Monitor US state AI legislation (Colorado AI Act, Illinois BIPA, NYC Local Law 144, and emerging state laws)
- Monitor sector-specific guidance: EEOC on AI in employment, CFPB on AI in lending, FDA on AI/ML in medical devices, SEC on AI in financial services
- Monitor executive orders and agency rulemaking on AI
- Update the AI governance framework when new laws or material guidance are issued

**Documentation and Record-Keeping:**
- Maintain AI system documentation (model cards, data sheets, risk assessments) per EU AI Act requirements (even before mandatory compliance dates — this is emerging best practice)
- Retain records of all bias assessments, monitoring results, and remediation actions
- Document all AI-related incidents and the response taken
- Maintain an AI governance log for audit and regulatory inquiry purposes

## Output Format
1. **AI System Inventory:** Comprehensive register of all AI systems with classification, risk tier, and status
2. **Risk Assessment Report:** Per-system risk classification with bias/fairness findings and data rights analysis
3. **AI Acceptable Use Policy:** Internal policy document ready for stakeholder review and adoption
4. **Human Oversight Framework:** Documentation of oversight models, reviewer training, and override procedures
5. **Monitoring Plan:** Ongoing monitoring schedule with metrics, responsibilities, and escalation triggers
6. **Regulatory Compliance Map:** Matrix of applicable AI laws and regulations with compliance status

## Calibration
- **Simple:** Company uses a few third-party AI tools (chatbots, writing assistants, analytics) with no High Risk applications. Target: policy and initial assessment in 2-4 weeks.
- **Standard:** Company uses AI in customer-facing products or internal decision-making with some High Risk applications. Target: full governance framework in 6-10 weeks.
- **Complex:** Company develops AI/ML products, uses AI in regulated decisions (employment, credit, healthcare), operates in the EU, or is subject to sector-specific AI requirements. Target: comprehensive governance program in 3-6 months. Engage specialized AI counsel and consider appointing an AI governance officer.
