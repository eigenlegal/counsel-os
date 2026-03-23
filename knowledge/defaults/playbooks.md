## Ai Governance

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


---

## Amendment Drafting

# Amendment Drafting Playbook

## When to Use
Use this playbook when modifying the terms of an existing agreement through a formal amendment, addendum, or change order. This applies to changes in scope, pricing, term, parties, or any substantive contract provisions.

## Prerequisites
- Access to the original agreement and all prior amendments. Assemble the complete contract lineage.
- Clear understanding of the changes requested by the business
- Business approval for the proposed changes
- Verification that the original agreement permits amendments (check the amendments clause for requirements such as written form, authorized signatories)
- Confirmation that the original agreement is still in effect (not expired or terminated)
- Check `knowledge/matters/counterparties/<name>.md` for any relevant counterparty context

## Process

### Step 1: Review the Existing Agreement
Before drafting, build a complete picture of the current contract state:
- Read the original agreement in full
- Read all prior amendments in chronological order
- Identify the amendment/modification clause — note any procedural requirements:
  - Must amendments be in writing? (Almost always yes — if silent, assume written form required)
  - Must amendments be signed by authorized representatives of both parties?
  - Are there specific notice requirements for proposing amendments?
  - Does the agreement require board or management approval for certain changes?
  - Is there a "no oral modification" clause? (If yes, ensure strict written compliance)
- Map the current effective terms by incorporating all prior amendments. Create a consolidated view: for each provision being changed, document the current effective language (which may come from the original or a prior amendment).
- Identify any interdependencies between the provisions being changed and other provisions

**Version Control Best Practices:**
- Maintain a contract lineage document listing: Original Agreement (date) → Amendment No. 1 (date) → Amendment No. 2 (date) → etc.
- If there have been 3+ prior amendments, strongly consider whether an Amended and Restated Agreement would be cleaner than another point amendment. The threshold for recommending A&R: more than 30% of the original provisions have been modified across all amendments.
- Number amendments sequentially ("Amendment No. 3" not "Third Amendment") for clarity
- Each amendment should reference all prior amendments in its recitals to maintain a clear chain

**Decision — Amendment vs. Amended & Restated:**
- If the changes affect fewer than 5 provisions and there are fewer than 3 prior amendments → **point amendment**
- If the changes affect 5+ provisions, or there are already 3+ prior amendments, or the cumulative amendments make the contract difficult to read → **amended and restated agreement** (consolidates everything into one clean document)
- If the changes are purely administrative (address change, contact update, notice information) → **simple letter agreement or notice** per the contract's administrative provisions

### Step 2: Define the Changes
Document precisely what is changing:
- List each provision being modified, added, or deleted. Use a change tracking table:

| Section | Current Language | Proposed Language | Reason for Change |
|---|---|---|---|
| 4.1 (Term) | "12-month initial term" | "24-month initial term" | Business requests extension |
| 7.2 (Liability) | "Cap of $100,000" | "Cap equal to 12 months of fees" | Aligns with `positions/limitation-of-liability.md` |

- For modified provisions, prepare a comparison showing current language vs. proposed language
- Assess whether the changes require corresponding updates to other provisions:
  - Changing scope → may affect pricing, SLAs, liability cap, insurance requirements
  - Changing term → may affect pricing, renewal mechanics, termination notice periods
  - Changing data processing → may require DPA amendment; check `positions/data-protection.md`
  - Adding parties → may require assignment/novation analysis; check `positions/assignment-change-of-control.md`
- Determine whether the changes trigger any consent or notification requirements (e.g., notice to affected third parties, sub-processors, regulatory filings)
- Cross-reference each change against the relevant position file to ensure the amended term meets current standards

### Step 3: Draft the Amendment
Structure the amendment document:

**Header:**
- Title: "Amendment No. [X] to [Agreement Name]"
- Date of the amendment
- Reference to the original agreement (full title, date, parties)
- Reference to all prior amendments: "as previously amended by Amendment No. 1 dated [date], Amendment No. 2 dated [date]" (or "as previously amended, the 'Agreement'")

**Recitals:**
- Identify the parties (matching the original agreement's party definitions)
- Reference the original agreement and all prior amendments
- Brief statement of the parties' desire to amend ("The parties wish to amend the Agreement to [brief description of purpose]")
- Context for the amendment (optional but helpful for interpretation — e.g., "in connection with the expansion of services to include [new scope]")

**Operative Provisions:**
- For each change, use precise language:
  - **Modification:** "Section [X] of the Agreement is hereby amended and restated in its entirety as follows: [new text]" (preferred for clarity) or "Section [X] is hereby amended by replacing '[old text]' with '[new text]'" (for surgical edits)
  - **Addition:** "The following new Section [X] is hereby added to the Agreement: [new text]"
  - **Deletion:** "Section [X] of the Agreement is hereby deleted in its entirety."
- **Ratification clause** (required): "Except as expressly modified by this Amendment, all terms and conditions of the Agreement remain in full force and effect and are hereby ratified and confirmed."
- **Conflict clause** (required): "In the event of any conflict between this Amendment and the Agreement, this Amendment shall control."
- **Counterparts clause:** "This Amendment may be executed in counterparts, each of which shall be deemed an original."
- **Defined terms:** "Capitalized terms used but not defined in this Amendment shall have the meanings assigned to them in the Agreement."

**Signature Blocks:**
- Match the original agreement's signature format (party names, title lines, date lines)
- Ensure signatories have appropriate authority per the delegation of authority matrix
- Include witness/notarization lines if the original agreement required them

### Step 4: Internal Review
Before sending to the counterparty:
- Verify all changes are accurately reflected by comparing the amendment against the change tracking table from Step 2
- Confirm no unintended consequences on other provisions. Specifically check:
  - Does the change affect any defined terms used elsewhere?
  - Does the change affect any calculation or formula (liability cap, fees, SLAs)?
  - Does the change conflict with any provision not being amended?
- Check that defined terms are used consistently with the original agreement
- Run through applicable position files to ensure the amended terms meet current standards
- Obtain internal business and legal approval
- Verify signing authority for both parties

**Decision — Legal Review Depth:**
- **Simple changes** (term extension, pricing update, administrative): self-review sufficient. Target: 1-2 hours.
- **Moderate changes** (scope expansion, new SLAs, party changes): peer review recommended. Target: 4-8 hours.
- **Material changes** (liability restructuring, new data processing, material commercial terms): senior counsel review required. Target: 1-3 days.

### Step 5: Negotiate and Execute
- Share the draft amendment with the counterparty with a cover note explaining the changes and business rationale
- Track any counterparty changes through the negotiation process — apply the negotiation playbook (`playbooks/negotiation.md`) if the counterparty proposes material counter-edits
- Once agreed, execute with wet or electronic signatures per the original agreement's requirements
- Verify the effective date: is the amendment effective upon signing, or on a specified future date?
- File the executed amendment with the original agreement in the contract management system. Update the contract lineage document.
- Update any internal tracking systems (CRM, finance, procurement) to reflect the new terms
- Notify affected internal stakeholders (e.g., if SLAs changed, notify operations; if pricing changed, notify finance)
- If the amendment represents a deviation from standard positions, consider logging in `knowledge/memory/exceptions.md`

## Output Format
A formal amendment document containing:
1. Header identifying the amendment number, underlying agreement, and all prior amendments
2. Recitals providing context for the amendment
3. Operative provisions with precise modification language for each change
4. Ratification clause confirming unchanged terms remain in effect
5. Conflict clause establishing amendment priority
6. Signature blocks with dates matching the original agreement's format

Supporting materials:
- Change tracking table (Section | Current | Proposed | Rationale)
- Contract lineage document (if multiple prior amendments exist)

## Calibration
- **Simple:** Single provision change (e.g., term extension, pricing update, address change). Target: 1-2 hours.
- **Standard:** Multiple provision changes with some interdependencies. Target: 4-8 hours.
- **Complex:** Substantial restructuring, scope changes with cascading effects on multiple provisions, multi-party amendments. Target: 1-3 days. Consider whether an amended and restated agreement is more appropriate than a point amendment.


---

## Board And Governance

# Board & Governance Playbook

## When to Use
Use this playbook when supporting board of directors meetings, committee meetings, governance matters, or corporate actions requiring board or shareholder approval. This includes preparing board materials, managing corporate minutes, handling written consents, and advising on fiduciary duties.

## Prerequisites
- Corporate governance documents (certificate of incorporation, bylaws, shareholder agreements)
- Board and committee charters
- Current board composition and committee assignments
- Meeting schedule and upcoming agenda items
- Prior board minutes and resolutions
- D&O insurance policy details
- Delegation of authority matrix
- Load `law/corporate/` for governance requirements
- Load `law/securities/` if the company has public reporting obligations

## Process

### Step 1: Identify the Governance Requirement
Determine what triggers the governance action:
- **Regular Board Meeting:** Quarterly or as scheduled per the bylaws
- **Special Board Meeting:** Urgent matter requiring board action between regular meetings
- **Committee Meeting:** Audit, compensation, nominating/governance, or other committee
- **Written Consent:** Board action without a meeting (verify bylaws permit this)
- **Shareholder Action:** Annual meeting, special meeting, or written consent
- **Corporate Action:** Merger, acquisition, financing, equity issuance, officer appointment, material contract

Verify the governance requirements for the specific action:

| Action Type | Typical Approval Required | Reference |
|---|---|---|
| Material contract (above DOA threshold) | Board approval | Delegation of authority matrix |
| Equity issuance (options, warrants, shares) | Board approval + stockholder approval if >20% dilution | `law/securities/`, certificate of incorporation |
| M&A transaction | Board approval + stockholder approval | `law/corporate/`, DGCL Section 251/271 |
| Officer appointment/removal | Board approval | Bylaws |
| Annual budget | Board approval | Bylaws or board practice |
| Related-party transaction | Disinterested director/committee approval | `law/corporate/` |
| Dividend declaration | Board approval | Certificate of incorporation, loan covenants |
| Bylaw amendment | Board or stockholder approval | Bylaws, certificate of incorporation |

Check:
- Is board approval required? (Check bylaws, delegation of authority, shareholder agreements, loan covenants)
- Is committee approval or recommendation required first?
- Is shareholder approval required?
- Are there contractual consent requirements (e.g., investor consent rights under a voting agreement or investor rights agreement)?
- What are the quorum requirements? (Typically majority of directors, but check bylaws)
- What vote threshold is required (majority of quorum, majority of full board, supermajority, unanimous)?

### Step 2: Prepare the Meeting

**Meeting Preparation Timeline:**
| Deadline | Task |
|---|---|
| T-30 days | Set meeting date, confirm director availability, draft preliminary agenda |
| T-21 days | Finalize agenda with chair and CEO; identify materials needed for each agenda item |
| T-14 days | Draft board materials: management reports, financial packages, resolutions, legal memos |
| T-10 days | Internal review of all board materials (legal, finance, executive team) |
| T-7 days | Distribute board package to all directors (minimum — earlier is better) |
| T-3 days | Confirm attendance, quorum, and any conflicts of interest |
| T-1 day | Final logistics: room setup, dial-in/video details, printed materials (if needed) |

**Notice:**
- Review bylaws for notice requirements (timing, form, content). Delaware default: oral or written notice not less than 2 days before the meeting.
- Prepare and distribute notice within the required timeframe
- Include date, time, location (or virtual meeting details), and agenda
- For special meetings, state the purpose(s) for which the meeting is called — actions taken at a special meeting are limited to the stated purposes

**Board Package:**
Standard board package includes:
- Agenda (organized by: consent items, discussion items, action items)
- Prior meeting minutes for approval
- CEO/management report
- Financial statements and KPIs (quarterly P&L, balance sheet, cash flow, budget variance)
- Committee reports (audit, compensation, nominating/governance)
- Matters requiring board action with supporting memoranda
- Draft resolutions for each action item

**Resolution Drafting:**
For each matter requiring formal board action, draft a resolution:
- Include "WHEREAS" recitals providing context and rationale (these support the business judgment rule)
- State the action being authorized clearly: "RESOLVED, that the Board of Directors hereby approves..."
- Include delegation of authority for implementation: "RESOLVED FURTHER, that any officer of the Company is hereby authorized to execute and deliver any documents and take any actions necessary to effectuate the foregoing resolution"
- For transactions: include specific terms (price, counterparty, material conditions)
- Prepare separate resolutions for each distinct action item
- If approving a conflicted transaction, document the disinterested director analysis and the process followed (Entire Fairness or safe harbor under DGCL Section 144)

### Step 3: Support the Meeting
During the meeting:
- Confirm quorum is present (in person or by valid remote participation per bylaws)
- Note attendance with arrival and departure times (for quorum throughout the meeting)
- Record all actions taken and votes (including dissents and abstentions — these matter for director liability)
- Flag any conflicts of interest. Conflicted directors should:
  1. Disclose the conflict on the record
  2. Recuse from discussion and vote on the interested matter
  3. Leave the room (physically or virtually) during discussion
  4. Re-enter only after the matter is concluded
- Ensure proper handling of executive sessions (non-management directors only, no minutes of executive session unless specifically directed)
- If legal advice is provided during the meeting, note on the record: "Counsel advised the Board regarding [topic]" — this establishes privilege
- Note all follow-up items with assigned responsibilities and deadlines

### Step 4: Prepare Minutes
Draft minutes within 5 business days of the meeting:
- Minutes should be a **summary of actions taken**, not a transcript. Over-detailed minutes create litigation risk; under-detailed minutes fail to support the business judgment rule.
- Include: date, time, location, attendees (with titles), quorum confirmation
- Record each matter discussed and the action taken (approved, tabled, deferred, no action required)
- Record vote results for each action item: "Upon motion duly made, seconded, and unanimously approved" or note specific dissents/abstentions
- Note conflicts of interest and recusals with the process followed
- Record any delegations of authority granted
- Reference (but do not attach verbatim) materials presented — "Management presented the quarterly financial report, a copy of which is attached as Exhibit A"
- Do NOT include: detailed discussion of legal advice, individual director comments attributable by name (unless dissenting), negotiation strategy, or speculative business projections

**Minutes Review Process:**
1. Draft within 5 business days
2. Circulate draft to chair and corporate secretary for review within 10 business days
3. Incorporate corrections
4. Present minutes for formal approval at the next regular meeting
5. File approved minutes in the corporate minute book

### Step 5: Handle Written Consents
When action is taken by written consent instead of a meeting:
- Verify bylaws and applicable law permit action by written consent (Delaware default: permitted for corporations, unless the certificate of incorporation prohibits it)
- For Delaware corporations: Written consent must be signed by the minimum number of votes required for the action at a meeting at which all directors entitled to vote were present (typically majority of the full board, not just a quorum)
- Draft the written consent document:
  - Title: "Unanimous Written Consent of the Board of Directors" (or "Action by Written Consent" if not unanimous)
  - Recitals establishing authority and context
  - Resolutions (same format as meeting resolutions)
  - Waiver of notice provision
  - Signature lines for each director
- Circulate to all directors (not just those signing) with context and supporting materials
- Collect signatures (wet ink, DocuSign, or other e-signature permitted under applicable law)
- Record the effective date (when the required number of signatures is obtained, not when the last signature is collected if not unanimous)
- File the executed consent with corporate records in the minute book
- If any director declines to sign, document the reason and consider whether a meeting is more appropriate

### Step 6: Annual Governance Review
Conduct a comprehensive governance review annually:
- Review and update the delegation of authority matrix (check spending limits, hiring authority, contract signing authority)
- Verify D&O insurance coverage and limits (adequate for company stage and risk profile)
- Review board and committee charters annually — update for any changes in composition, mandate, or regulatory requirements
- Assess board composition: independence (majority independent for public companies), expertise gaps, diversity, succession planning
- Review all related-party transactions from the past year
- Update corporate records: entity registrations, good standing certificates, registered agent information
- File required annual reports and franchise tax payments. Calendar deadlines:
  - Delaware franchise tax: March 1
  - Annual report deadlines: vary by state of incorporation
- Review compliance with governance-related contractual obligations (investor rights agreements, loan covenants, joint venture agreements)
- Assess whether governance practices align with the company's current stage and complexity

## Output Format
1. **Meeting Notice:** Formal notice per bylaws requirements
2. **Board Package:** Agenda, prior minutes, management reports, financial statements, resolutions, and supporting memoranda
3. **Resolutions:** Formal resolutions with recitals for all actions requiring board approval
4. **Minutes:** Approved minutes filed in the corporate minute book
5. **Written Consents:** Executed consents filed in the corporate records
6. **Governance Calendar:** Annual schedule of meetings, filings, reviews, and deadlines

## Calibration
- **Simple:** Routine board meeting with standard agenda items (financials, management update, routine approvals). Target: 3-5 days preparation.
- **Standard:** Board meeting with material transactions requiring approval (significant contract, financing round, key hire). Target: 1-2 weeks preparation.
- **Complex:** Board meeting involving M&A, major litigation, restructuring, or contested matters. Target: 2-4 weeks preparation. Engage outside counsel for transaction-specific advice. Prepare detailed memoranda on fiduciary duty considerations (duty of care, duty of loyalty, Revlon duties if applicable).


---

## Compliance Assessment

# Compliance Assessment Playbook

## When to Use
Use this playbook when evaluating whether a product, service, process, or business initiative complies with applicable laws, regulations, and internal policies. Common triggers include new product launches, entry into new markets, regulatory changes, and periodic compliance reviews.

## Prerequisites
- Clear description of the product, service, or initiative being assessed
- Identification of applicable jurisdictions
- Relevant regulatory frameworks identified from `knowledge/law/`
- Internal policies and compliance standards gathered
- Stakeholder interviews scheduled or completed
- Prior audit findings or compliance assessments reviewed

## Process

### Step 1: Scope Definition
Define the boundaries of the assessment:
- **Subject:** What product, service, process, or initiative is being assessed?
- **Jurisdictions:** Which countries, states, or regions are in scope?
- **Regulatory Domains:** Which areas of law apply? (Use the decision tree in Step 2 to identify.)
- **Standards:** Which internal policies and external standards apply (SOC 2, ISO 27001, HIPAA, PCI-DSS)?
- **Timeline:** Point-in-time assessment or ongoing monitoring?
- **Materiality:** What is the threshold for flagging an issue (any non-compliance, or only material gaps)?

### Step 2: Regulatory Mapping — Law Area Identification
Scan the subject against trigger conditions to identify which `knowledge/law/` areas to load. Use this decision tree:

**Decision Tree by Subject Type:**

| Subject Characteristic | Law Areas to Load |
|---|---|
| Collects or processes personal data | `law/data-privacy/` (always), `law/cybersecurity/` |
| Consumer-facing product or service | `law/consumer-protection/`, `law/advertising-media/` |
| Handles financial transactions or payments | `law/financial-services/` |
| Healthcare data or services | `law/healthcare/` |
| Employee-related processes | `law/employment/`, `law/labor-relations/` |
| Uses AI/ML or automated decision-making | `law/ai-and-automation/` |
| International operations or customers | `law/international-trade/`, `law/data-privacy/` (cross-border) |
| Government contracts or public sector | `law/government-contracts/` |
| Securities issuance or equity matters | `law/securities/` |
| Environmental impact or ESG reporting | `law/environmental-esg/` |
| Franchise or distribution model | `law/franchise/` |
| IP-intensive product or technology | `law/ip-and-technology/` |

**Decision Tree by Industry:**
- **SaaS / Technology:** `law/data-privacy/`, `law/cybersecurity/`, `law/ip-and-technology/`, `law/ai-and-automation/` (if applicable)
- **Financial Services / Fintech:** `law/financial-services/`, `law/data-privacy/`, `law/consumer-protection/`, `law/securities/`
- **Healthcare / Life Sciences:** `law/healthcare/`, `law/data-privacy/`, `law/product-counseling/`
- **E-commerce / Retail:** `law/consumer-protection/`, `law/data-privacy/`, `law/advertising-media/`, `law/international-trade/`
- **Manufacturing:** `law/environmental-esg/`, `law/employment/`, `law/product-counseling/`, `law/international-trade/`

For each identified law area, load the `overview.md` file and then load specific sub-files based on the sub-topic triggers described in each overview.

Map applicable regulations to the subject:
- Identify all applicable statutes and regulations
- Determine which regulatory bodies have oversight
- Map specific requirements to business functions and processes
- Identify any exemptions or safe harbors that may apply
- Note upcoming regulatory changes that may affect compliance (effective dates within 12 months)
- Cross-reference with `knowledge/law/` for detailed requirements

### Step 3: Gap Analysis
Compare current state against requirements:
- Document current controls, policies, and procedures for each regulatory requirement
- Identify gaps between current state and requirements
- Classify gaps by severity:
  - **Critical:** Immediate legal exposure; active enforcement risk; must remediate before launch/continuation. Examples: processing personal data without legal basis, operating without a required license.
  - **High:** Significant non-compliance; remediation required within 30 days. Examples: privacy policy does not disclose data sharing, missing required contractual provisions.
  - **Medium:** Partial compliance; remediation required within 90 days. Examples: training not current, documentation gaps, sub-optimal but not violative controls.
  - **Low:** Best practice gaps; remediate within 6 months. Examples: no formal policy documented for an internally followed practice, minor process improvements.
- Assess the likelihood and impact of each gap being discovered or exploited

**Decision — Stop-Ship Assessment:**
- If any **Critical** gap is identified for a new product/launch: recommend hold on launch until remediated. Provide estimated remediation timeline and interim risk mitigation options.
- If only **High** gaps: launch may proceed with a documented remediation plan and executive risk acceptance sign-off.

### Step 4: Evidence Collection
Gather evidence of compliance:
- Review documentation (policies, procedures, training records, certifications)
- Examine technical controls (access controls, encryption, logging, data flow diagrams)
- Interview process owners and operators — document interviews with date, attendee, and key findings
- Review third-party certifications and audit reports (SOC 2, ISO 27001, HITRUST, PCI)
- Test controls where possible (sampling, walkthroughs, tabletop exercises)
- Document evidence gathered and any limitations on the assessment

### Step 5: Risk Assessment
Evaluate the overall risk profile:
- Aggregate gap findings into a risk heat map (severity vs. likelihood)
- Consider the regulatory enforcement environment — is the relevant regulator actively enforcing?
- Assess the likelihood of regulatory inquiry or audit in the next 12 months
- Evaluate potential penalties: fines (calculate statutory ranges), sanctions, license revocation, injunctive relief
- Consider reputational risk and customer impact
- Benchmark against industry peers where possible (use public enforcement actions as reference)

**Decision — Risk Tolerance:**
- If aggregate risk is **High/Critical:** escalate to executive leadership and general counsel with a written risk assessment. Recommend remediation before proceeding.
- If aggregate risk is **Medium:** proceed with documented risk acceptance from the business owner and a time-bound remediation plan.
- If aggregate risk is **Low:** proceed with standard monitoring.

### Step 6: Remediation Plan
Develop a prioritized remediation roadmap:
- For each gap, propose specific remediation actions with measurable completion criteria
- Assign ownership (individual name, not department) and deadlines
- Estimate resource requirements (budget, personnel, technology)
- Sequence by priority: Critical gaps first, then High, then Medium, then Low
- Identify quick wins (achievable within 1-2 weeks) vs. long-term structural changes
- Define interim risk mitigation measures for gaps that cannot be immediately resolved
- Establish metrics and milestones for tracking progress

### Step 7: Report and Monitor
Deliver findings and establish ongoing compliance:
- Present findings to stakeholders and leadership with the risk heat map
- Obtain executive sign-off on the remediation plan (including risk acceptance for any gaps not immediately remediated)
- Establish a monitoring cadence based on risk level:
  - **Critical/High risk areas:** Monthly monitoring until remediated, then quarterly
  - **Medium risk areas:** Quarterly monitoring
  - **Low risk areas:** Semi-annual or annual check
- Integrate compliance requirements into existing business processes and product development workflows
- Set up alerts for regulatory changes affecting the assessment scope (monitor Federal Register, state legislatures, EU regulatory bodies)
- Schedule follow-up assessments to verify remediation completion

## Output Format
1. **Executive Summary:** Scope, overall risk rating, critical findings count, and headline recommendation
2. **Regulatory Map:** Matrix of applicable regulations, regulatory bodies, and specific requirements
3. **Gap Analysis:** Detailed findings with severity classifications and evidence references
4. **Risk Assessment:** Heat map and narrative risk analysis with enforcement context
5. **Remediation Plan:** Prioritized actions with owners, deadlines, resources, and success criteria
6. **Appendices:** Evidence inventory, regulatory references, interview summaries, benchmarking data

## Calibration
- **Simple:** Single jurisdiction, established regulatory framework, periodic refresh. Target: 1-2 weeks.
- **Standard:** Multiple jurisdictions or regulatory domains, new product or market. Target: 3-6 weeks.
- **Complex:** Heavily regulated industry, multiple jurisdictions, novel regulatory questions, enforcement action response. Target: 2-3 months. Consider engaging outside counsel or specialized compliance consultants.


---

## Contract Review

# Contract Review Playbook

## When to Use
Use this playbook when reviewing any commercial contract (SaaS, services, licensing, procurement) received from a counterparty or drafted internally. This is the primary workflow for evaluating contract risk and producing a redline or issues list.

## Prerequisites
- Load applicable position files from `knowledge/defaults/positions.md`
- Load relevant legal area files from `knowledge/law/`
- Load `checklists/contract-review.md` for completeness tracking
- Identify the contract type and counterparty relationship (vendor, customer, partner)
- Obtain any prior correspondence or term sheets that inform the deal context
- Confirm the business owner and their priorities
- Check `knowledge/matters/counterparties/` for any existing counterparty context file

## Process

### Step 1: Initial Classification
Classify the contract by type, value, and risk tier:
- **Type:** SaaS, Professional Services, License, Procurement, Partnership, Reseller, etc.
- **Value:** Annual contract value (ACV) and total contract value (TCV)
- **Risk Tier:** Low (<$100K ACV, standard terms), Medium ($100K-$1M ACV or non-standard terms), High (>$1M ACV, strategic relationship, or significant data processing)

**Decision — Depth of Review:**
- If **Low Risk AND standard contract type** (simple SaaS subscription, routine procurement): skip Steps 2-3, go directly to Step 4 with abbreviated review. Focus only on the five highest-impact position files: `positions/limitation-of-liability.md`, `positions/data-protection.md`, `positions/indemnification.md`, `positions/termination-renewal.md`, `positions/ip-ownership.md`. Target: 1-2 hours.
- If **Medium Risk**: complete all steps. Full position-file comparison. Target: 4-8 hours.
- If **High Risk**: complete all steps with deep analysis. Cross-reference `knowledge/law/` areas. Engage subject-matter experts. Consider board/executive approval requirements. Target: 1-3 days.

### Step 2: Structural Review
Verify the contract contains all necessary components. Load `checklists/contract-review.md` and check each item:
- Parties correctly identified (legal entity names, jurisdiction of incorporation). Verify against public records if unfamiliar counterparty.
- Recitals/background accurately describe the relationship
- Definitions section is complete and internally consistent. Flag defined terms that are used but not defined, or defined but not used.
- Exhibits, schedules, and order forms are attached and referenced. Confirm page/section references are accurate.
- Signature blocks match the parties. Verify signing authority per your delegation of authority matrix.
- Effective date and term are clearly stated
- Order of precedence clause addresses conflicts between main agreement and exhibits

**Decision — Structural Deficiency:**
- If the contract is missing key structural elements (no defined term, no exhibits referenced): return to the counterparty with a structural issues list before conducting substantive review. Do not redline an incomplete document.

### Step 3: Commercial Terms Review
Evaluate core commercial terms against business requirements:
- Scope of services/license matches what was negotiated. Compare against any proposal, SOW, or term sheet.
- Pricing, payment terms, and fee structure align with the proposal. Load `positions/fees-payment.md` for payment term standards.
- Term length and renewal mechanics are acceptable. Load `positions/termination-renewal.md` for auto-renewal and notice period standards.
- SLAs and performance standards meet operational requirements. Load `positions/service-levels.md` for SLA benchmarks.
- Acceptance criteria for deliverables are defined (for services/development contracts)
- Change order process is workable and requires mutual written agreement

### Step 4: Risk Assessment — Apply Position Files
For each major clause category, load the specific position file, compare the contract language against it, and assign a GREEN/YELLOW/RED classification:

| Clause Category | Position File to Load | Clause Library Reference |
|---|---|---|
| Limitation of Liability | `positions/limitation-of-liability.md` | `clause-library/liability-and-indemnification.md` |
| Indemnification | `positions/indemnification.md` | `clause-library/liability-and-indemnification.md` |
| Termination & Renewal | `positions/termination-renewal.md` | `clause-library/termination-and-renewal.md` |
| Data Protection | `positions/data-protection.md` | `clause-library/data-protection.md` |
| Confidentiality | `positions/confidentiality.md` | `clause-library/ip-and-confidentiality.md` |
| IP Ownership | `positions/ip-ownership.md` | `clause-library/ip-and-confidentiality.md` |
| Dispute Resolution | `positions/dispute-resolution.md` | `clause-library/dispute-resolution.md` |
| Assignment & Change of Control | `positions/assignment-change-of-control.md` | — |
| Force Majeure | `positions/force-majeure.md` | — |
| Insurance Requirements | `positions/insurance-requirements.md` | — |
| Representations & Warranties | `positions/representations-warranties.md` | — |
| Fees & Payment | `positions/fees-payment.md` | — |
| Service Levels | `positions/service-levels.md` | `clause-library/sla-and-performance.md` |

**For each clause:** (1) Read the contract language, (2) compare against the position file classification guide, (3) assign GREEN/YELLOW/RED, (4) if YELLOW or RED, pull recommended counter-language from the clause library.

**Decision — Overlay Practice Positions:**
- After loading default positions, check `knowledge/practice/positions.md` for any overrides. Practice positions supersede defaults.
- Check `knowledge/matters/counterparties/<name>.md` for deal-specific overrides. Counterparty overrides supersede practice positions.

### Step 5: Legal Compliance Check
Scan the contract against applicable legal requirements. Auto-detect which `knowledge/law/` areas apply:

| Trigger | Law Area to Load |
|---|---|
| Personal data processing | `law/data-privacy/` |
| International counterparty or services | `law/international-trade/` |
| Government payments or officials | `law/white-collar-investigations/` |
| Financial services or payments | `law/financial-services/` |
| Healthcare data (PHI) | `law/healthcare/` |
| AI/ML services | `law/ai-and-automation/` |
| Consumer-facing product | `law/consumer-protection/` |
| Employment-related services | `law/employment/` |

Verify:
- Data protection / privacy law compliance (GDPR, CCPA, etc.) — is a DPA required?
- Export control and sanctions provisions — are restricted countries/persons involved?
- Anti-corruption / anti-bribery provisions — does the counterparty interact with government?
- Industry-specific regulatory requirements
- Governing law and jurisdiction appropriateness. Flag if governing law is in an unfamiliar or adverse jurisdiction.

### Step 6: Produce Issues List or Redline
For each identified issue:
1. State the clause reference (section number) and quote the current language
2. Identify the risk classification (RED/YELLOW/GREEN) and cite which layer determined it (law/, practice/, defaults/, or matters/)
3. Explain the concern in plain language
4. Propose specific alternative language from `clause-library/` or draft custom language
5. Assign priority tier: Tier 1 (must-have), Tier 2 (strong preference), Tier 3 (nice-to-have)

**Tactical sub-steps for preparing the redline:**
- Use track changes (not clean edits) so the counterparty can see every modification
- Add margin comments explaining the rationale for each change — this builds credibility and speeds negotiation
- Group related changes together (e.g., all liability-related changes)
- Do not over-mark: accept acceptable provisions explicitly to show good faith

### Step 7: Internal Alignment
- Share the issues list with the business owner. Walk through RED items first, then YELLOW.
- Identify which issues are Tier 1 (must-have) vs. Tier 2/3 (negotiation leverage)
- Agree on the negotiation strategy before sending the redline
- Document any business-approved deviations from standard positions. If a deviation is approved, note it for potential logging in `knowledge/memory/exceptions.md`.
- If the contract is High Risk, confirm executive approval before sending the redline.

## Output Format
Produce a structured issues list or memorandum with:
1. **Executive Summary:** Contract type, counterparty, value, risk tier, overall assessment (1-2 paragraphs)
2. **Issues Table:** Clause | Section | Risk Level | Knowledge Layer | Issue | Proposed Resolution | Priority Tier
3. **Redline:** If applicable, marked-up contract with track changes and comments
4. **Recommendation:** Approve, approve with conditions, or reject — with clear rationale

## Calibration
- **Simple (Low Risk):** Focus on Steps 1, 4 (abbreviated), and 6. Spot-check five key position files. Target: 1-2 hours.
- **Standard (Medium Risk):** Complete all steps. Full position-file comparison across all 13 categories. Target: 4-8 hours.
- **Complex (High Risk):** Complete all steps with deep analysis. Cross-reference all triggered `knowledge/law/` areas. Engage subject-matter experts. Consider board/executive approval requirements. Target: 1-3 days.


---

## Dispute Response

# Dispute Response Playbook

## When to Use
Use this playbook when the company receives a demand letter, threat of litigation, notice of breach, regulatory inquiry, or any formal or informal dispute communication from a counterparty, regulatory body, or third party.

## Prerequisites
- The dispute communication (demand letter, notice, complaint, inquiry)
- Relevant contracts and agreements with the counterparty
- Load position files: `positions/dispute-resolution.md`, `positions/limitation-of-liability.md`, `positions/indemnification.md`
- Load clause library: `clause-library/dispute-resolution.md`
- Internal facts gathered from the business team
- Insurance policies reviewed for potential coverage (CGL, E&O, D&O, cyber)
- Litigation hold assessment completed or in progress (see `checklists/litigation-hold.md`)
- Outside counsel identified (if needed)

## Process

### Step 1: Triage and Classify
Assess the dispute immediately upon receipt. Complete within 24 hours of receiving the communication.

**Severity Classification:**
- **Critical:** Lawsuit filed, regulatory enforcement action, injunction/TRO sought, significant financial exposure (>$500K), or criminal referral. **Response: Same-day assessment. Engage outside counsel within 24 hours.**
- **High:** Formal demand letter with litigation threat, regulatory inquiry or CID, breach notice with termination threat, class action threat. **Response: Assessment within 48 hours.**
- **Medium:** Informal complaint, fee dispute, performance issue, warranty claim, individual consumer complaint. **Response: Assessment within 5 business days.**
- **Low:** Customer complaint, minor contractual disagreement, invoice dispute (<$25K). **Response: Assessment within 10 business days.**

**Deadline Identification:**
- Answer to complaint: typically 20-30 days from service (check jurisdiction-specific rules)
- Cure periods: per the contract's breach/termination provisions
- Regulatory response dates: per the specific inquiry or subpoena
- TRO/preliminary injunction: may require response within days — check court order

**Privilege Assessment:**
- If litigation is reasonably anticipated (demand letter received, complaint filed, regulatory investigation opened), mark all internal communications "PRIVILEGED AND CONFIDENTIAL — ATTORNEY WORK PRODUCT" from this point forward
- Engage outside counsel early to establish attorney-client privilege
- Do not forward the dispute communication broadly — limit distribution to need-to-know

### Step 2: Preserve Evidence
Immediately upon identifying a potential dispute. Load `checklists/litigation-hold.md`:
- Issue a litigation hold notice to all relevant custodians within 24 hours
- Identify custodians: anyone who may have relevant documents or communications (business owners, technical staff, executives)
- Preserve all relevant documents, communications, and electronic records
- Suspend any document retention/destruction schedules for relevant materials
- Preserve electronic data: email, Slack/Teams, shared drives, databases, backup tapes
- Document the preservation steps taken (date, scope, custodians notified)

**Decision — Scope of Hold:**
- **Critical/High severity:** Broad litigation hold. All custodians who interacted with the counterparty or the subject matter. Preserve email, messaging, documents, and system logs.
- **Medium severity:** Targeted hold. Primary business contacts and their direct reports. Preserve email and contract files.
- **Low severity:** Document preservation reminder to the primary business contact. No formal hold required unless the dispute escalates.

### Step 3: Gather Facts
Conduct an internal investigation:
- Interview relevant business stakeholders. Document each interview: date, attendee, key facts, documents referenced. Mark interview notes as privileged.
- Collect and review relevant contracts, correspondence, and records
- Establish a timeline of key events in chronological order
- Identify favorable facts (compliance with contract, timely performance, counterparty fault)
- Identify unfavorable facts (late deliveries, quality issues, missed obligations). Do not ignore these — they must be factored into the strategy.
- Assess the credibility and strength of the counterparty's claims
- Identify potential counterclaims or set-off rights

### Step 4: Legal Analysis
Analyze the dispute on the merits. Load `positions/dispute-resolution.md` and relevant `law/litigation/` files:
- Review the applicable contract provisions: breach definition, cure rights, remedies, dispute resolution mechanism, notice requirements
- Identify applicable legal theories and defenses (statute of limitations, waiver, estoppel, failure to mitigate)
- Assess the counterparty's likely damages claim and our maximum exposure
- Evaluate the strength of our defenses on a scale: Strong (>70% likelihood of prevailing), Moderate (40-70%), Weak (<40%)
- Identify potential counterclaims and quantify their value
- Review the dispute resolution clause — determine the required forum and process (negotiation → mediation → arbitration → litigation)
- Check insurance coverage: does the policy cover defense costs? Indemnity? Is there a duty to defend vs. duty to reimburse? Notify the insurer promptly.
- Assess whether indemnification obligations apply (ours to indemnify, or counterparty to indemnify us under upstream contracts)

**Decision — Litigation vs. Settlement Threshold:**
- **Settle if:** (1) Exposure exceeds $250K AND defense strength is Weak (<40%), OR (2) the cost of defense (legal fees + management time) exceeds 60% of the demand, OR (3) the dispute threatens a critical business relationship worth more than the settlement amount, OR (4) reputational risk of public litigation outweighs the settlement cost.
- **Defend if:** (1) Defense strength is Strong (>70%), OR (2) the claim is without merit and settling would create a precedent for future claims, OR (3) insurance covers defense costs with no impact on premiums, OR (4) a counterclaim has significant value.
- **Hybrid approach:** Defend on the merits while simultaneously exploring settlement through the contractual dispute resolution process.

### Step 5: Develop Response Strategy
Determine the approach:
- **Resolve:** The claim has merit or the cost-benefit favors settlement. Negotiate a resolution (settlement, cure, commercial accommodation). Prepare settlement authority range.
- **Defend:** The claim lacks merit. Prepare a formal response disputing the allegations. Engage outside counsel for Critical/High matters.
- **Defer:** More information needed. Respond acknowledging receipt, reserving all rights, without admitting or conceding. Request clarification of the claim.
- **Escalate:** Critical exposure (>$1M), potential criminal liability, or board-level risk. Notify executive leadership and/or board within 48 hours. Brief D&O insurer.

For each approach, document the analysis:
- Cost of resolution vs. cost of defense (estimated legal fees, management distraction, business impact)
- Business relationship implications (can the relationship survive the dispute?)
- Precedent-setting concerns (will settling invite similar claims?)
- Reputational impact (is there media exposure risk?)
- Insurance coverage implications (will the insurer consent to the strategy?)

**Escalation Timeline:**
- **Day 1:** Triage, classify, initiate litigation hold (Critical/High)
- **Day 2-3:** Fact gathering, preliminary legal analysis
- **Day 5:** Strategy recommendation to senior counsel / GC
- **Day 7-10:** Response drafted and reviewed
- **Day 14:** Response sent (or per contractual/legal deadlines if sooner)

### Step 6: Draft Response
Prepare the formal response:
- **Tone:** Professional and measured. Do not escalate. Do not make admissions. Do not use inflammatory language.
- **Content:**
  - Acknowledge receipt of the communication (but not the merits)
  - Reserve all rights and defenses explicitly ("without waiving any rights or defenses")
  - If disputing: state the grounds clearly with reference to specific contract provisions and facts
  - If seeking cure: outline the cure plan, timeline, and verification method
  - If settling: propose terms without admitting liability; use "without prejudice" or "for settlement purposes only"
  - Reference the dispute resolution clause and invoke the required procedures (e.g., "The Agreement requires mediation before litigation; we propose scheduling mediation within 30 days")
- **Review:** Senior counsel review required for all Critical/High responses. Peer review for Medium.
- **Delivery:** Send via the method specified in the contract's notice provisions (certified mail, email to designated contact, overnight courier). Retain proof of delivery.

### Step 7: Manage to Resolution
Track the dispute through resolution:
- Maintain a dispute log: Date | Event | Action Taken | Next Step | Deadline | Owner
- Calendar all deadlines (response dates, cure periods, statute of limitations, discovery deadlines)
- Report status to leadership: weekly for Critical, biweekly for High, monthly for Medium
- Document settlement negotiations and all offers/counteroffers (mark as privileged; notify insurer of any settlement discussions)
- If the dispute escalates to formal proceedings, engage outside counsel and transition to a litigation management framework
- Post-resolution: conduct a lessons-learned review. Consider logging the outcome in `knowledge/memory/decisions.md` and updating `knowledge/memory/patterns.md` if the dispute reveals a systemic issue.

## Output Format
1. **Triage Assessment:** Severity, exposure estimate (range), response deadline, privilege designation, insurance coverage status
2. **Fact Summary:** Chronological timeline and key facts (favorable and unfavorable)
3. **Legal Analysis:** Merits assessment with defense strength percentage, defenses available, exposure range, counterclaim potential
4. **Strategy Recommendation:** Resolve/Defend/Defer/Escalate with detailed rationale and cost-benefit analysis
5. **Draft Response:** Formal response letter ready for senior review
6. **Action Items:** Next steps with individual owners, deadlines, and escalation triggers

## Calibration
- **Simple:** Low-severity dispute (invoice disagreement, minor service complaint). Target: initial response within 2-3 business days.
- **Standard:** Medium-severity dispute (breach notice, warranty claim, regulatory inquiry). Target: initial response within 5-10 business days; strategy developed within 2 weeks.
- **Complex:** High/Critical-severity dispute (litigation, regulatory enforcement, significant exposure). Target: engage outside counsel within 24-48 hours; preservation notice within 24 hours; initial strategy within 1 week.


---

## Due Diligence

# Due Diligence Playbook

## When to Use
Use this playbook when conducting legal due diligence on a target company in connection with a potential acquisition, merger, investment, or strategic partnership. Also applicable to vendor due diligence for critical/strategic vendor relationships.

## Prerequisites
- Signed NDA with the target/counterparty (see `playbooks/nda-triage.md` — use M&A NDA review criteria)
- Access to the data room or document repository
- Due diligence checklist prepared: load `checklists/due-diligence.md`
- Deal team identified (legal, finance, tax, HR, IT, operations)
- Timeline and key milestones established (signing, closing, long-stop date)
- Materiality thresholds defined with the deal team (e.g., contracts >$100K, litigation >$250K exposure)
- Outside counsel engaged (if applicable)
- Letter of intent or term sheet available for reference

## Process

### Step 1: Organize the Review
Set up the due diligence framework. Assign workstream leads and load the relevant checklists and legal area files for each:

| Workstream | Checklist / Reference | Key Law Areas |
|---|---|---|
| Corporate/Governance | `checklists/due-diligence.md` §Corporate | `law/corporate/` |
| Contracts | `checklists/due-diligence.md` §Contracts | `positions/assignment-change-of-control.md` |
| IP | `checklists/due-diligence.md` §IP | `law/ip-and-technology/` |
| Litigation & Disputes | `checklists/due-diligence.md` §Litigation | `law/litigation/` |
| Employment | `checklists/due-diligence.md` §Employment | `law/employment/` |
| Regulatory/Compliance | `checklists/due-diligence.md` §Regulatory | Varies by industry |
| Data Privacy & Security | `checklists/due-diligence.md` §Privacy | `law/data-privacy/`, `law/cybersecurity/` |
| Real Estate & Assets | `checklists/due-diligence.md` §Assets | `law/real-estate/` |
| Tax | `checklists/due-diligence.md` §Tax | `law/tax/` |
| Insurance | `checklists/due-diligence.md` §Insurance | `law/insurance/` |
| Environmental | `checklists/due-diligence.md` §Environmental | `law/environmental-esg/` |

Operational setup:
- Create a document request list organized by workstream, referencing `checklists/due-diligence.md` line items
- Establish a tracking system for documents requested, received, and reviewed (spreadsheet or deal management tool)
- Set up regular deal team check-ins (at least 2x/week during active diligence)
- Assign a single point of contact for data room access requests

**Decision — Scope by Deal Type:**
- **Full Acquisition:** All workstreams active. Load complete `checklists/due-diligence.md`.
- **Minority Investment:** Focus on Corporate/Governance, Contracts (material only), IP, Litigation, Financial. Skip Employment deep-dive unless the target has significant workforce issues.
- **Vendor Due Diligence:** Focus on Data Privacy, Security, Contracts, Financial stability, Insurance. Use `checklists/vendor-onboarding.md` instead of full DD checklist.
- **Asset Purchase:** Focus on the specific assets being acquired. Emphasize IP chain-of-title, contract assignability, and environmental (if physical assets).

### Step 2: Document Collection
Manage the information gathering process:
- Submit the initial document request list to the target within 48 hours of data room access
- Track responses using a request log: Item | Requested Date | Received Date | Reviewed By | Status
- Follow up on missing documents at each deal team check-in. Escalate persistent gaps to deal counsel.
- Organize received documents by workstream in a structured folder system mirroring the checklist
- Flag documents that are incomplete, redacted, or raise immediate concerns — create a "red flag" tracker
- Request management presentations and Q&A sessions for key areas (IP, litigation, regulatory)
- Conduct site visits if applicable (manufacturing, data centers, offices)

### Step 3: Substantive Review
For each workstream, conduct a thorough review. Load the corresponding law area files and position files.

**Corporate/Governance:** (Load `law/corporate/`)
- Verify entity structure and good standing in all jurisdictions of qualification
- Review organizational documents for unusual provisions (super-majority requirements, drag-along, tag-along, veto rights)
- Review board and shareholder minutes for undisclosed commitments, disputes, or side agreements
- Verify capitalization table against the company's records and any 409A valuations
- Identify any outstanding options, warrants, convertible instruments, or anti-dilution provisions

**Contracts:** (Load `positions/assignment-change-of-control.md`)
- Identify all material contracts (by value, strategic importance, or risk) — apply the materiality threshold
- Review change of control / assignment provisions: will the deal trigger consents?
- Identify contracts with termination-on-change-of-control provisions — quantify revenue at risk
- Review customer concentration risk (any customer >10% of revenue)
- Identify any most-favored-nation, exclusivity, or non-compete provisions that could constrain the buyer

**IP:** (Load `law/ip-and-technology/`)
- Verify ownership chain-of-title for all key IP assets (patents, trademarks, copyrights)
- Review IP assignment agreements from all employees and contractors — flag any gaps
- Assess open-source usage and license compliance (copyleft risk for proprietary software)
- Identify any IP litigation, infringement claims, or opposition proceedings
- Review key technology licenses (inbound and outbound) for assignability and scope

**Litigation & Disputes:** (Load `law/litigation/`)
- Catalog all pending and threatened claims with estimated exposure
- Assess potential exposure for each matter: best case, likely case, worst case
- Review settlement agreements for ongoing obligations (non-competes, compliance commitments, ongoing payments)
- Identify patterns suggesting systemic issues (repeated claims of same type)
- Request litigation counsel's assessment for any matter with exposure exceeding the materiality threshold

**Employment:** (Load `law/employment/`)
- Review key employee agreements, non-competes, and non-solicitation provisions
- Assess retention risk for critical personnel — identify key-person dependencies
- Review benefit plans for unfunded liabilities (pension, deferred compensation)
- Identify any employment disputes, EEOC charges, labor board matters, or wage/hour claims
- Assess WARN Act applicability if headcount reductions are contemplated post-closing

**Data Privacy & Security:** (Load `law/data-privacy/`, `law/cybersecurity/`)
- Assess data processing activities and legal bases for processing
- Review privacy policies and consent mechanisms for adequacy
- Evaluate security posture: SOC 2, ISO 27001, breach history, pen test results
- Identify cross-border data transfer issues (EU-US, China, etc.)
- Review sub-processor relationships and DPA coverage
- Assess GDPR/CCPA compliance maturity

### Step 4: Risk Assessment
Synthesize findings into an actionable risk analysis:
- Categorize findings by severity:
  - **Deal-Breaker:** Issues that could prevent the transaction (material undisclosed liabilities, fatal IP deficiency, uncurable regulatory violation)
  - **Significant:** Issues requiring purchase price adjustment, specific indemnification, or escrow (>$500K estimated exposure)
  - **Moderate:** Issues requiring post-closing remediation within 90 days
  - **Low:** Noted but manageable issues with no material financial impact
- Quantify financial exposure where possible — use ranges (low/likely/high)
- Identify issues requiring specific rep/warranty/indemnity coverage in the acquisition agreement
- Map each finding to a deal protection mechanism: rep & warranty, special indemnity, escrow, price adjustment, closing condition, or post-closing covenant

**Decision — Deal-Breaker Assessment:**
- If any Deal-Breaker issue is identified, immediately escalate to deal leadership with a written assessment before continuing other workstreams. The deal team should decide whether to (1) terminate, (2) renegotiate structure, or (3) accept with enhanced protections.

### Step 5: Diligence Report
Prepare the due diligence report:
- Executive summary (2-3 pages): key findings, deal-breakers, overall recommendation, top 10 risks
- Workstream-by-workstream detailed findings with severity classifications
- Risk matrix: severity (x-axis) vs. likelihood (y-axis) heat map
- Deal protection memo: specific reps, warranties, indemnities, escrow recommendations tied to each finding
- Consent list: all third-party consents required to close, with estimated timeline and risk of refusal
- Post-closing integration items: matters requiring attention within 30/60/90 days after close
- Open items list: outstanding document requests and unresolved questions

### Step 6: Deal Protection
Translate diligence findings into deal terms:
- Draft specific representations and warranties addressing each identified risk
- Recommend indemnification provisions: special indemnities for known issues, general indemnity basket and cap for unknown issues
- Propose escrow or holdback amounts tied to quantified risks (typically 10-15% of purchase price for 12-18 months)
- Identify conditions precedent to closing (consents obtained, no material adverse change, regulatory approvals)
- Draft disclosure schedule items with specificity tied to diligence findings
- Recommend post-closing covenants for remediation items (e.g., "Seller shall cure all identified data privacy gaps within 90 days post-closing")

## Output Format
1. **Executive Summary:** 2-3 pages covering key findings, deal-breakers, and overall recommendation
2. **Detailed Report:** Workstream-by-workstream analysis with findings, risk ratings, and supporting references
3. **Risk Matrix:** Heat map of all identified risks by severity and likelihood
4. **Deal Points Memo:** Recommended deal protections mapped to specific findings
5. **Open Items List:** Outstanding requests and unresolved questions
6. **Consent List:** All third-party consents required for closing with timeline and risk assessment

## Calibration
- **Simple:** Vendor due diligence or small acquisition (<$5M), limited scope. Target: 2-4 weeks.
- **Standard:** Mid-market acquisition ($5M-$100M), standard scope. Target: 4-8 weeks.
- **Complex:** Large acquisition (>$100M), cross-border, regulated industry, carve-out transaction. Target: 8-16 weeks. Dedicated deal team with outside counsel support. Weekly deal team calls, daily workstream check-ins during peak review period.


---

## Employment Termination

# Employment Termination Playbook

## When to Use
Use this playbook when handling involuntary termination of an individual employee, a reduction in force (RIF), or negotiation of an executive separation. This covers the legal analysis, documentation, and process to minimize litigation risk and ensure compliance with employment law.

## Prerequisites
- Employee personnel file, including offer letter, employment agreement, equity agreements, and any restrictive covenant agreements
- Performance documentation (reviews, PIPs, disciplinary records, warnings)
- Company policies: employee handbook, separation/severance policy, PTO payout policy
- Load `knowledge/law/employment/` — specifically sub-files on wrongful termination, severance, non-competes, and WARN Act
- HR business partner identified and aligned on the termination decision
- Benefits administration team available for COBRA, equity vesting, and benefit continuation questions
- Signing authority for the separation agreement confirmed

## Process

### Step 1: Assess the Basis for Termination
Before proceeding, evaluate the legal sufficiency of the termination basis:

**Termination Type and Legal Framework:**

| Type | Basis | Key Legal Considerations |
|---|---|---|
| For Cause | Policy violation, misconduct, insubordination, fraud | Verify "cause" definition in employment agreement (if any). Ensure investigation was conducted. Document evidence. |
| Performance-Based | Failure to meet expectations, PIP failure | Verify progressive discipline was followed. Review performance documentation. Check for recent protected activity. |
| Position Elimination | Restructuring, role redundancy, business need | Document legitimate business reason. Check for pretext risk. Assess adverse impact. |
| RIF / Layoff | Budget cuts, business downturn, reorganization | WARN Act analysis. Adverse impact analysis. Selection criteria documentation. |
| Executive Separation | Strategic decision, leadership change | Review employment agreement terms. Negotiate separation agreement. |

**Decision — Proceed or Hold:**
- **Hold if:** (1) The employee has engaged in recent protected activity (filed complaint, EEOC charge, workers' comp claim, FMLA leave, whistleblower report) within the past 6 months — consult employment counsel before proceeding. (2) The employee is a member of a protected class AND the termination documentation is weak — strengthen documentation first. (3) The employee is on active medical leave, FMLA, military leave, or workers' compensation leave — assess whether the termination can legally proceed.
- **Proceed with enhanced documentation if:** The termination basis is sound but there are risk factors (protected class, proximity to protected activity, long tenure). Ensure the separation package is fair and the release is comprehensive.
- **Proceed standard if:** Clear basis, adequate documentation, no heightened risk factors.

### Step 2: Check Restrictive Covenants and Contractual Obligations
Review the employee's agreements for post-termination obligations:

**Non-Compete Agreements:** Load `law/employment/` non-compete provisions.
- Is the non-compete enforceable in the employee's jurisdiction? (Many states have enacted bans or restrictions — California, Colorado, Illinois, Minnesota, New York, Oregon, Washington, and the FTC rule if in effect)
- Is the scope reasonable? (Duration: typically 6-12 months. Geography: limited to relevant markets. Activity: limited to competing business)
- Does the non-compete require continued compensation during the restricted period (garden leave)?
- **Decision:** If the non-compete is unenforceable in the jurisdiction, do not rely on it. If enforceable, include a reminder and affirmation in the separation agreement.

**Non-Solicitation Agreements:**
- Does the employee have a non-solicitation of employees and/or customers?
- Is it enforceable under applicable state law?
- Include affirmation in the separation agreement.

**Confidentiality and IP Assignment:**
- Review confidentiality obligations — these survive termination
- Verify all IP assignments were executed during employment
- Address in the separation agreement: ongoing confidentiality obligations, return of company materials, IP assignment confirmation

**Equity and Compensation:**
- Review equity agreements: vesting schedule, post-termination exercise period (typically 90 days for ISOs, may be longer for NSOs)
- Unvested equity: forfeited upon termination (unless acceleration in separation agreement)
- Accrued but unused PTO: check state law requirements for payout (California, Illinois, Massachusetts, and others require payout)
- Unpaid commissions or bonuses: check the commission/bonus plan for post-termination payment obligations
- Deferred compensation (Section 409A): ensure separation payment timing complies with 409A

### Step 3: WARN Act Analysis (If RIF or Position Elimination)
If the termination is part of a broader action, assess WARN Act obligations:

**Federal WARN Act** (Worker Adjustment and Retraining Notification Act):
- Applies to employers with 100+ employees
- Triggered by: plant closing (50+ employees at a single site) or mass layoff (50+ employees constituting 33% of site workforce, or 500+ employees regardless of percentage)
- Requires: 60 days written notice to affected employees, state dislocated worker unit, and local government
- Exceptions: faltering company, unforeseeable business circumstances, natural disaster

**State Mini-WARN Acts:**
- Many states have lower thresholds (California: 75 employees; New York: 25 employees; Illinois: 75 employees; New Jersey: 100 employees)
- Some states require longer notice periods (New York: 90 days)
- Check the specific state(s) where affected employees are located

**Decision — WARN Triggered:**
- If WARN is triggered → provide the required notice period before the effective date of termination. If 60-day notice is not feasible, assess whether an exception applies. If no exception, the employer is liable for back pay and benefits for the notice period shortfall.
- If WARN is not triggered → document the analysis showing why not (number of employees, percentage calculations, exclusions).

### Step 4: Adverse Impact Analysis (If RIF)
For any group termination, assess whether the selection criteria produce a discriminatory impact:

- Identify the selection criteria used (performance, skills, seniority, position elimination)
- Run an adverse impact analysis comparing termination rates by protected category (age, race, gender, disability, national origin)
- Apply the 4/5ths (80%) rule: if the selection rate for any protected group is less than 80% of the rate for the highest-selected group, adverse impact is indicated
- If adverse impact is found: (1) review selection criteria for legitimate business justification, (2) consider adjusting the selection to eliminate disparate impact, (3) consult employment counsel
- Document the analysis and results — this is a privileged work product

**Decision — Age-Based Analysis:**
- If ANY employee age 40+ is being terminated: the Older Workers Benefit Protection Act (OWBPA) imposes specific requirements on the release (see Step 5). If the RIF involves a group termination, the OWBPA also requires disclosure of the decisional unit, selection criteria, and the ages and job titles of all employees in the decisional unit who were and were not selected.

### Step 5: Draft Separation Agreement
Prepare the separation agreement and general release:

**Standard Components:**
- Separation date and last day of work (may differ)
- Severance payment: amount, schedule, and tax treatment
- Benefit continuation: COBRA period, employer-subsidized coverage period (if any)
- Equity treatment: vesting acceleration (if any), exercise period extension (if any)
- PTO payout per applicable state law
- General release of claims (federal, state, and local) — must be knowing and voluntary
- Carve-outs from release: workers' compensation claims, COBRA rights, vested benefits, unemployment insurance, claims arising after the execution date, and non-waivable statutory rights
- Non-disparagement (mutual if possible)
- Cooperation obligation (reasonable — for litigation, regulatory matters)
- Confidentiality of the separation terms
- Reaffirmation of restrictive covenants (if enforceable)
- Return of company property (including all equipment, documents, access credentials)
- Reference: neutral reference policy or agreed-upon language

**OWBPA Requirements (Employees Age 40+):**
- Must specifically reference waiver of ADEA claims
- Must advise the employee in writing to consult an attorney
- Must provide consideration beyond what the employee is already entitled to
- **Individual termination:** 21-day consideration period + 7-day revocation period
- **Group termination (RIF):** 45-day consideration period + 7-day revocation period, plus disclosure of: (a) the class, unit, or group covered by the program, (b) eligibility factors, (c) time limits, (d) job titles and ages of all individuals eligible or selected for the program in the decisional unit, and (e) ages of all individuals in the same job classification or organizational unit who are not eligible or selected

**Severance Calculation:**
- Reference company severance policy (if one exists) for the baseline
- Consider: tenure, position level, risk factors, market practice
- Market range: 1-2 weeks per year of service for non-executives; 3-12 months for executives
- Additional considerations: signing bonus clawback, relocation repayment, tuition reimbursement repayment

### Step 6: Coordinate IT and Access Termination
Work with IT and Security to ensure proper offboarding:
- Disable all system access on the effective termination date (or earlier if employee is placed on administrative leave)
- Revoke: email, VPN, cloud services, building access, code repositories, internal tools, shared drives
- Preserve the employee's email and files for the litigation hold period (if applicable) before deletion
- Recover company equipment: laptop, phone, access badge, keys, credit card
- Remove the employee from distribution lists, shared accounts, and authorized signatory lists
- If the employee had access to sensitive data or trade secrets: conduct enhanced offboarding with Security oversight

### Step 7: Conduct Exit Process
Execute the termination meeting and follow-up:

**Termination Meeting:**
- Attendees: the employee's manager and HR business partner (minimum). Legal counsel should not attend unless the situation is high-risk.
- Deliver the message clearly, concisely, and respectfully. State the decision as final.
- Provide the separation agreement and review the key terms (do not pressure the employee to sign immediately)
- Explain the consideration and revocation periods
- Provide COBRA notice, final paycheck information, and benefits continuation details
- Collect company property
- Offer outplacement services (if provided)

**Post-Meeting:**
- Send written confirmation of the termination with the separation agreement package
- Process final paycheck per state law requirements (California: same day; most other states: next regular payday)
- File necessary notifications: unemployment insurance, benefits carriers, equity plan administrator
- If the employee signs the release: process severance payment after the revocation period expires
- If the employee does not sign the release within the consideration period: assess whether to extend the offer, increase severance, or proceed without a release
- Document the termination in the personnel file
- Consider logging the decision in `knowledge/memory/decisions.md` if the termination involved unusual circumstances or deviations from standard practice

## Output Format
1. **Termination Assessment Memo:** Basis, risk factors, restrictive covenant analysis, WARN/adverse impact analysis (privileged)
2. **Separation Agreement:** Complete agreement with general release, OWBPA compliance (if applicable), and all required exhibits
3. **Severance Calculation:** Breakdown of all payments and benefits
4. **WARN Analysis:** (If applicable) Written assessment of WARN applicability with calculations
5. **Adverse Impact Analysis:** (If RIF) Statistical analysis with conclusions (privileged)
6. **Offboarding Checklist:** IT access revocation, property recovery, benefits notifications

## Calibration
- **Simple:** Individual termination, clear basis, no heightened risk factors, non-executive. Target: 2-5 business days for preparation.
- **Standard:** Individual termination with risk factors (protected class, proximity to protected activity, executive level) or small group termination (5-20 employees). Target: 1-2 weeks. Outside employment counsel recommended.
- **Complex:** Large RIF (20+ employees), WARN-triggering event, executive separation with significant equity and contractual complexity. Target: 2-4 weeks. Outside employment counsel required. Board or compensation committee approval may be needed for executive separations.


---

## Ip Portfolio Management

# IP Portfolio Management Playbook

## When to Use
Use this playbook when reviewing the company's intellectual property portfolio, preparing IP for due diligence (buy-side or sell-side), conducting a licensing review, or developing a comprehensive IP protection strategy. This covers patents, trademarks, copyrights, trade secrets, and domain names.

## Prerequisites
- Access to IP registration records (USPTO, WIPO, domain registrars, copyright office)
- Current IP inventory or asset register (if one exists)
- Load `knowledge/law/ip-and-technology/` sub-files for the relevant IP types
- IP counsel (internal or outside patent/trademark counsel) available for specialized questions
- Budget and business strategy context (which products/markets are priorities?)
- Employee and contractor IP assignment agreements on file
- Open-source usage inventory (if applicable)

## Process

### Step 1: Inventory All IP Assets
Conduct a comprehensive inventory across all IP categories:

**Patents and Patent Applications:**
- Issued patents: patent number, title, filing date, issue date, expiration date, jurisdiction, assignee
- Pending applications: application number, filing date, status (prosecution, appeal, abandoned), jurisdiction
- Provisional applications: filing date, expiration of provisional period (12 months from filing)
- Foreign filings: PCT applications, national phase entries, Paris Convention filings
- Identify patents covering core products/technology vs. ancillary or defensive patents

**Trademarks:**
- Registered marks: registration number, mark, goods/services classes, filing date, registration date, renewal date, jurisdiction
- Pending applications: application number, mark, basis (use, intent-to-use, foreign filing), status
- Common law marks: marks used in commerce but not registered. Assess registration priority.
- Foreign registrations: country, registration status, renewal dates
- Domain names: all registered domains, registrar, expiration dates, auto-renewal status

**Copyrights:**
- Registered copyrights: registration number, title, author, registration date
- Unregistered works: key software, documentation, creative works, marketing materials
- Work-for-hire documentation: verify all employee/contractor works have proper assignment
- Open-source components: list all open-source used in products, with license type (permissive, copyleft, AGPL)

**Trade Secrets:**
- Identify key trade secrets: algorithms, customer lists, pricing models, manufacturing processes, business methods
- Assess protection measures: NDAs, access controls, marking, employee awareness
- Document trade secret identification and protection program (required for DTSA and state UTSA claims)

**Licenses (Inbound and Outbound):**
- Inbound licenses: technology licensed from third parties (scope, exclusivity, territory, term, fees, assignability)
- Outbound licenses: technology licensed to third parties (scope, exclusivity, territory, term, royalties, termination rights)
- Cross-licenses: mutual license arrangements
- Open-source licenses: compliance obligations for each license type

### Step 2: Assess Maintenance Obligations
For each registered IP asset, verify maintenance is current:

**Patent Maintenance:**
- Maintenance fee schedule: 3.5 years, 7.5 years, 11.5 years from issue date (US)
- Foreign annuity payments: vary by country, typically annual
- Identify patents approaching maintenance deadlines within the next 12 months
- **Decision — Maintain or Abandon:** For each patent approaching a fee deadline, assess: Does this patent protect a current or planned product? Does it have licensing value? Is it defensive? If the answer to all is no, consider allowing it to lapse (cost savings).

**Trademark Maintenance:**
- Section 8 Declaration of Use: due between 5th-6th year after registration (US)
- Section 9 Renewal: due every 10 years from registration (US)
- Proof of use requirements: varies by jurisdiction
- Foreign renewals: vary by country (typically 10 years)
- Monitor for marks that are no longer in use — maintain or abandon based on future plans
- **Decision — Maintain or Abandon:** If a mark has not been used in commerce for 3+ years and there are no plans to resume use, consider abandoning to reduce portfolio costs. But assess whether the mark has defensive value against competitors.

**Domain Name Maintenance:**
- Renewal dates for all domains (set auto-renewal for critical domains)
- Identify domains that are defensive registrations vs. active use
- Monitor for typosquatting or cybersquatting of key brand domains

**Copyright Maintenance:**
- No maintenance fees required for copyrights
- Monitor for infringement of key copyrighted works
- Ensure registration is current for works where statutory damages and attorney's fees may be needed

### Step 3: Evaluate Licensing Revenue and Exposure
Assess the financial dimension of the IP portfolio:

**Licensing Revenue:**
- Total annual licensing revenue by asset/program
- License compliance: are licensees meeting their obligations (royalty reporting, usage limits, territory restrictions)?
- Audit rights: exercise audit rights for material licenses where compliance is uncertain
- Identify under-monetized assets: patents or trademarks that could be licensed but are not

**Licensing Exposure:**
- Total annual licensing expense (inbound licenses)
- Identify licenses approaching expiration or renewal — negotiate early
- Assess assignability of key inbound licenses (critical for M&A scenarios). Load `positions/assignment-change-of-control.md`.
- Identify any "change of control" triggers in inbound licenses that would affect an acquisition
- Open-source compliance exposure: identify any copyleft-licensed components in proprietary products that could create forced disclosure obligations

### Step 4: Identify Gaps and Risks
Assess portfolio completeness against the company's products, technology, and business strategy:

**Protection Gaps:**
- Core technology or products without patent protection — assess patentability and filing priority
- Key brand names or logos without trademark registration — file applications for priority marks
- Employee/contractor IP assignment gaps — any employees or contractors who have not signed IP assignment agreements? Remediate immediately.
- Trade secrets without adequate protection measures — implement or strengthen NDAs, access controls, exit interview procedures
- Software without copyright registration — register key software before any infringement claim arises (registration is a prerequisite for statutory damages)

**Risk Assessment:**
- Third-party infringement risk: are any of our products potentially infringing third-party patents? (Freedom-to-operate analysis for key products)
- Invalidity risk: are any of our key patents vulnerable to challenge? (Prior art analysis)
- Trade secret exposure: have any trade secrets been disclosed without NDA protection?
- Open-source contamination: have any copyleft-licensed components been incorporated into proprietary code in a way that triggers disclosure obligations?
- Domain disputes: are any of our key domains at risk of challenge under UDRP?

**Decision — Filing Priority:**
- **File immediately:** Core product technology without patent protection; primary brand without trademark registration; any IP asset needed for upcoming licensing, fundraising, or M&A
- **File within 6 months:** Secondary product features; expansion market trademarks; defensive filings
- **Monitor only:** Ancillary technology with limited commercial value; marks with no current use plans

### Step 5: Develop Protection Strategy
Based on the inventory and gap analysis, build a forward-looking IP strategy:

**Patent Strategy:**
- Identify invention disclosures in the pipeline and assess patentability
- Prioritize filings based on: commercial value, defensive value, enforceability, cost
- Establish an invention disclosure program (regular engineering reviews, incentives for disclosures)
- Consider design patents for distinctive product UI/UX elements
- Establish a foreign filing strategy based on key markets and competitor locations

**Trademark Strategy:**
- Register core marks in all active markets and planned expansion markets
- Monitor trademark clearance for new product/feature names before launch
- Implement a trademark watch service for key marks (monitor new applications that may conflict)
- Enforce against infringers: demand letters, TTAB opposition, UDRP complaints for domain disputes

**Trade Secret Strategy:**
- Implement or strengthen a trade secret protection program:
  - Classification system for confidential information
  - Access controls (physical and electronic)
  - NDA requirements for all employees, contractors, and business partners
  - Exit interview procedures including trade secret reminders
  - Regular employee training on trade secret obligations
- Document the protection measures (required for enforcement under DTSA)

**Open-Source Strategy:**
- Implement an open-source review process for all new dependencies
- Classify licenses by risk: permissive (MIT, Apache 2.0 — low risk), weak copyleft (LGPL — moderate risk), strong copyleft (GPL, AGPL — high risk)
- Establish approval requirements: permissive (auto-approve), weak copyleft (engineering lead approval), strong copyleft (legal approval required)
- Conduct periodic audits of open-source usage with scanning tools

### Step 6: Prepare for Diligence (If Applicable)
If the IP review is in preparation for M&A due diligence or financing:

**Sell-Side Preparation:**
- Organize the IP inventory into a diligence-ready format (spreadsheet with all registration details, status, and chain of title)
- Verify chain of title for all registered IP (assignments recorded with USPTO/WIPO)
- Collect all IP assignment agreements from employees and contractors
- Prepare a summary of all IP-related litigation (pending, threatened, settled)
- Identify any IP encumbrances (security interests, liens, exclusive licenses)
- Prepare an open-source audit report

**Buy-Side Review:**
- Request the target's complete IP inventory with registration details
- Verify ownership and chain of title for key assets
- Assess freedom-to-operate for the target's core products
- Review all inbound and outbound licenses for assignability and change-of-control provisions
- Identify any IP-related litigation or threatened claims
- Assess open-source usage and compliance
- Reference `playbooks/due-diligence.md` for the complete DD process

## Output Format
1. **IP Inventory Report:** Comprehensive list of all IP assets by category, with registration details, status, and maintenance dates
2. **Maintenance Calendar:** All upcoming deadlines for the next 12 months (fees, renewals, filings)
3. **Gap Analysis:** Identified protection gaps with priority ratings and recommended actions
4. **Risk Assessment:** Third-party infringement risk, invalidity risk, open-source exposure
5. **IP Strategy Memo:** Forward-looking protection strategy with budget estimates and timeline
6. **Diligence Package:** (If applicable) Organized materials ready for disclosure

## Calibration
- **Simple:** Periodic portfolio review for a small company (<20 registered assets). Target: 1-2 weeks.
- **Standard:** Portfolio review with gap analysis and strategy development for a mid-sized company (20-100 registered assets). Target: 3-6 weeks.
- **Complex:** Full portfolio review in preparation for M&A, IPO, or major licensing program. Large portfolio (100+ registered assets), cross-border filings, open-source audit required. Target: 2-3 months. Engage outside IP counsel for specialized analysis.


---

## Legal Memo

# Legal Memo Playbook

## When to Use
Use this playbook when a business stakeholder or executive requests legal analysis on a specific question, risk, or proposed course of action. Legal memos document the analysis and recommendation for the record and may be subject to attorney-client privilege.

## Prerequisites
- Clear articulation of the question or issue to be analyzed
- Identification of the requesting party and audience (business leader, board, executive team)
- Understanding of the business context and urgency
- Relevant facts gathered from stakeholders
- Applicable law identified from `knowledge/law/`
- Privilege considerations assessed (mark as privileged and confidential if appropriate)

## Process

### Step 1: Define the Question
Articulate the precise legal question(s) to be answered:
- Restate the business question as a legal question. The business asks "Can we do X?" — the legal question is "Under [jurisdiction] law, does X comply with [statute/regulation], and what are the risks if it does not?"
- Identify the relevant jurisdiction(s)
- Confirm scope: narrow question (single issue, clear law) vs. comprehensive analysis (multiple issues, ambiguous law)
- Confirm timeline: when does the business need the answer?
- Check whether this is a recurring issue — search `knowledge/memory/decisions.md` for prior analysis on the same or similar topic

**Decision — Memo Type:**
- **Quick-Turn Advice:** Single question, clear answer, low complexity. Skip formal memo format; deliver as a structured email. Target: 2-4 hours.
- **Standard Memo:** Moderate complexity, multiple considerations. Full IRAC format. Target: 1-2 days.
- **Comprehensive Analysis:** Novel issue, multiple jurisdictions, significant business impact. Deep research required. Target: 3-7 days. Consider engaging outside counsel for specialized expertise.

### Step 2: Gather Facts
Collect and document all relevant facts using the IRAC framework's fact-gathering discipline:
- Interview the business stakeholder. Ask: "What exactly are you trying to do? What constraints are you operating under? What is the timeline?"
- Review relevant contracts, correspondence, and internal documents
- Identify factual assumptions that the analysis will rely on — list these explicitly so the reader knows the analysis depends on them
- Note facts that are uncertain or disputed — flag how the analysis would change if these facts differ
- Document the source of each material fact (interview, document, public record)

### Step 3: Research Applicable Law
Conduct legal research following this source hierarchy:

**Research Source Hierarchy (highest authority to lowest):**
1. **Binding authority:** Statutes, regulations, and case law in the governing jurisdiction
2. **Counsel OS law files:** `knowledge/law/` area files (synthesized legal frameworks)
3. **Regulatory guidance:** Agency interpretations, no-action letters, advisory opinions, FAQ documents
4. **Persuasive authority:** Case law from other jurisdictions, Restatements, treatises
5. **Internal precedent:** Prior memos in `knowledge/memory/decisions.md`, established internal positions in `knowledge/practice/positions.md`
6. **Secondary sources:** Law review articles, practice guides, CLE materials
7. **Industry practice:** Market surveys, peer company approaches, industry association guidance

For each key legal principle, note:
- The jurisdiction and source
- Whether the authority is binding or persuasive
- The date (to assess currency)
- Any pending legislation or regulatory changes that could alter the analysis

Load the relevant `knowledge/law/` sub-files based on the subject matter. Use the trigger conditions in each area's `overview.md` to determine which specific sub-files to load.

### Step 4: Analyze — Apply IRAC Structure
Apply the law to the facts using the IRAC (Issue, Rule, Application, Conclusion) framework for each question:

**I — Issue:** State the specific legal issue. Frame it as a question. ("Whether the Company's proposed data sharing arrangement constitutes a 'sale' under CCPA.")

**R — Rule:** State the applicable legal rule(s). Cite the source. Identify any split of authority or ambiguity. ("Under Cal. Civ. Code Section 1798.140(ad), a 'sale' means...")

**A — Application:** Apply the rule to the specific facts. This is the core of the analysis.
- Consider multiple interpretations and explain why one is stronger
- Address counterarguments explicitly: "A counterparty or regulator might argue that... However, this argument is [weak/moderate/strong] because..."
- Distinguish unfavorable precedent rather than ignoring it
- Quantify risk where possible using a consistent scale:
  - **Remote** (<10% likelihood of adverse outcome)
  - **Low** (10-25%)
  - **Moderate** (25-50%)
  - **Substantial** (50-75%)
  - **High** (>75%)

**C — Conclusion:** State the conclusion clearly. Do not hedge without reason. If the answer is uncertain, say so directly and quantify the uncertainty.

**Decision — Depth of Analysis:**
- If the law is clear and the facts are straightforward: brief application (1-2 paragraphs per issue)
- If there is ambiguity or split authority: extended analysis with arguments for and against each interpretation
- If the issue is novel or high-stakes: full analysis with analogy to related areas, policy considerations, and multiple scenarios

### Step 5: Formulate Recommendation
Develop a clear, actionable recommendation:
- State the conclusion directly at the top — do not bury the lead
- Quantify risk: likelihood (Remote/Low/Moderate/Substantial/High) and severity (financial, operational, reputational)
- Propose concrete next steps with specific actions
- Identify risk mitigation measures that can reduce exposure without abandoning the business objective
- Flag any areas requiring further analysis, expert consultation, or factual development
- Present alternatives if the primary recommendation is not feasible (Option A: lowest risk; Option B: moderate risk with mitigation; Option C: highest risk)

### Step 6: Draft the Memo
Write the memo following the IRAC-based output format below.

**Key drafting principles:**
- Lead with the conclusion — busy executives read the top first
- Use plain language — avoid unnecessary legal jargon. If a legal term is necessary, define it.
- Be precise about certainty levels ("likely," "probably," "unclear," "remote risk")
- Separate legal analysis from business judgment. The memo provides legal risk assessment; the business decides risk tolerance.
- Include relevant caveats and limitations (factual assumptions, jurisdiction limitations, areas not analyzed)
- Mark as "PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION" if appropriate
- Keep the memo to the minimum length needed for thoroughness. Simple memos: 1-2 pages. Standard: 3-6. Complex: 8-15.

### Step 7: Review and Deliver
- Self-review: check for logical gaps, unsupported conclusions, internal consistency, and typos
- Peer review: required for Standard and Complex memos
- Senior counsel review: required for Complex memos or those with board-level visibility
- Deliver to the requesting party with an offer to discuss. Verbal walk-through is recommended for Complex memos.
- File in the legal department's knowledge management system
- Calendar any follow-up actions or deadlines identified in the memo
- Consider logging the key decision in `knowledge/memory/decisions.md` for future reference

## Output Format
```
PRIVILEGED AND CONFIDENTIAL — ATTORNEY-CLIENT COMMUNICATION

LEGAL MEMORANDUM

TO:      [Requesting party]
FROM:    [Legal team]
DATE:    [Date]
RE:      [Subject — concise description]

1. EXECUTIVE SUMMARY
   [2-3 sentence summary: question, conclusion, key risk level]

2. QUESTION PRESENTED
   [Precise legal question(s) framed in IRAC "Issue" format]

3. SHORT ANSWER
   [Direct answer in 1-2 paragraphs with risk quantification]

4. FACTS
   [Relevant facts, sources, and assumptions the analysis relies on]

5. ANALYSIS
   [IRAC-structured analysis for each question:
    Issue → Rule (with citations) → Application → Conclusion]

6. CONCLUSION & RECOMMENDATION
   [Actionable recommendation with risk level, alternatives, and mitigation]

7. NEXT STEPS
   [Concrete actions with owners, deadlines, and decision points]
```

## Calibration
- **Simple (Quick-Turn):** Narrow question, clear law, established internal position. Deliver as structured email. Target: 1-2 pages, 2-4 hours.
- **Standard:** Moderate complexity, multiple considerations, some ambiguity. Full IRAC memo. Target: 3-6 pages, 1-2 days.
- **Complex:** Novel issue, multiple jurisdictions, significant business impact, board-level visibility. Deep IRAC analysis with multiple scenarios. Target: 8-15 pages, 3-7 days. Consider engaging outside counsel.


---

## Ma Integration

# M&A Integration Playbook

## When to Use
Use this playbook for post-closing legal integration following a completed acquisition, merger, or significant asset purchase. This covers the legal workstreams required to integrate the acquired entity or assets into the buyer's operations, compliance programs, and corporate structure.

## Prerequisites
- Executed acquisition agreement (merger agreement, stock purchase agreement, or asset purchase agreement)
- Due diligence report and findings: load `playbooks/due-diligence.md` output
- Closing deliverables and consents tracker
- Post-closing covenants and obligations from the acquisition agreement
- Integration team identified (legal, HR, IT, Finance, Operations, Compliance)
- Integration timeline and milestones from the deal team
- Load `knowledge/law/corporate/` for entity structure matters
- Load `checklists/due-diligence.md` for reference to open items

## Process

### Step 1: Identify Contracts Requiring Consent or Novation
The most time-sensitive post-closing legal workstream. Begin within the first week after closing.

**Consent Analysis:**
- From the due diligence report, extract all contracts with change-of-control, assignment, or consent provisions triggered by the transaction
- Classify each contract by priority:
  - **Critical (Day 1-30):** Contracts where failure to obtain consent could result in termination, material breach, or loss of rights. Includes: key customer agreements, critical vendor/supplier contracts, technology licenses essential to operations, facility leases.
  - **Important (Day 31-90):** Contracts where consent is required but the counterparty is unlikely to terminate. Includes: non-critical vendor agreements, partnership agreements, distribution agreements.
  - **Administrative (Day 91-180):** Contracts requiring notice only, or where consent is a technical requirement with no practical enforcement risk.

**Consent Process:**
- Prepare consent request letters for each counterparty, customized by relationship importance
- For Critical contracts: personal outreach from the relationship owner (business development, account manager) before sending the formal consent letter
- Track consents in a log: Contract | Counterparty | Consent Status | Follow-Up Date | Risk if Refused
- If consent is refused: assess remedies (negotiate, find alternative supplier/partner, invoke dispute resolution)

**Decision — Anti-Assignment Clauses:**
- If the transaction was a stock purchase/merger (not an asset purchase): many anti-assignment clauses are not triggered because the contracting entity has not changed. But some clauses specifically cover "change of control" — read each clause carefully.
- If the transaction was an asset purchase: virtually all contracts require assignment consent. Prioritize based on business criticality.

### Step 2: Assess Change-of-Control Triggers Beyond Contracts
Identify non-contractual change-of-control implications:

**Regulatory Approvals and Licenses:**
- Government contracts: may require novation or re-certification. Load `law/government-contracts/`.
- Regulated industry licenses: banking, insurance, healthcare, securities, telecommunications — may require regulatory approval for change of control. Some approvals must be obtained pre-closing; others are post-closing notifications.
- Export control licenses: specific licenses may not transfer automatically. Load `law/international-trade/`.
- Data privacy registrations: DPA registrations, GDPR representative appointments, CCPA service provider notifications.

**Employee Agreements:**
- Executive employment agreements with change-of-control provisions (acceleration of vesting, severance triggers, golden parachute payments)
- Retention agreements and stay bonuses tied to the transaction
- Non-compete agreements: assess enforceability post-acquisition (does the buyer's broader business scope make the non-compete unreasonable?)

**Financial Instruments:**
- Loan agreements and credit facilities with change-of-control provisions (may trigger mandatory prepayment or default)
- Bond indentures with change-of-control put rights
- Lease agreements with change-of-control consent requirements

### Step 3: Merge Entity Structures
Rationalize the corporate structure post-closing:

**Entity Consolidation Assessment:**
- Map the pre-acquisition entity structure of both buyer and target
- Identify redundant entities (two entities in the same jurisdiction performing similar functions)
- Assess which entities can be merged, dissolved, or converted
- Consider tax implications of each restructuring option (consult tax counsel)
- Prioritize: eliminate dormant entities first, then consolidate operating entities

**Entity Actions:**
- File articles of merger for entity consolidations
- File certificates of dissolution for entities being wound down
- Update entity registrations (registered agents, officers, directors) to reflect new ownership
- Qualify the acquired entities to do business in the buyer's jurisdictions (or vice versa)
- Update good standing certificates and annual report filings
- Update EIN/tax registrations, bank accounts, and signing authorities

**Decision — Integration Speed:**
- **Rapid integration (0-90 days):** Appropriate for bolt-on acquisitions where the target's operations will be fully absorbed. Merge entities quickly. Consolidate contracts. Terminate redundant employees.
- **Phased integration (3-12 months):** Appropriate for larger acquisitions where operational continuity requires maintaining separate structures temporarily. Keep the target as a subsidiary initially; integrate in stages.
- **Maintain as subsidiary (indefinite):** Appropriate when regulatory requirements mandate a separate entity, the target has a distinct brand, or there are liability isolation benefits.

### Step 4: Integrate Compliance Programs
Harmonize the compliance and governance frameworks:

**Compliance Program Merger:**
- Compare the buyer's and target's compliance programs across all key areas:
  - Anti-corruption / anti-bribery (FCPA, UK Bribery Act). Load `law/white-collar-investigations/`.
  - Data privacy (GDPR, CCPA, sector-specific). Load `law/data-privacy/`.
  - Antitrust/competition. Load `law/antitrust/`.
  - Export controls and sanctions. Load `law/international-trade/`.
  - Industry-specific compliance (healthcare, financial services, government contracts)
- Identify the higher standard for each area and adopt it as the unified standard
- Extend the buyer's code of conduct and key policies to the acquired entity
- Conduct compliance training for all acquired employees (within 90 days of closing)
- Integrate the target into the buyer's compliance monitoring and reporting systems

**Decision — Compliance Gap Remediation:**
- If the due diligence report identified compliance gaps in the target: remediate within the timeframes specified in the acquisition agreement's post-closing covenants. If no timeframes were specified, use: Critical gaps within 30 days, High gaps within 90 days, Medium gaps within 180 days.
- If the target had no formal compliance program: implement the buyer's program immediately. Prioritize: code of conduct rollout, anti-corruption training, data privacy assessment.

### Step 5: Harmonize Employment Terms
Align employment arrangements across the combined entity:

**Employment Integration Checklist:** Load `law/employment/`.
- Review all acquired employee offer letters and employment agreements for: at-will status, non-competes, non-solicitation, IP assignment, severance provisions
- Determine whether employees will receive new employment agreements with the buyer or continue under existing terms
- Harmonize compensation structures: salary bands, bonus programs, commission plans
- Harmonize benefits: health insurance, retirement plans (401(k) merger or parallel plans), PTO policies, equity plans
- Assess WARN Act implications if any workforce reductions are planned (see `playbooks/employment-termination.md`)
- Address immigration status: verify work authorization for all acquired employees; assess H-1B transfer requirements
- Conduct employee communication: explain changes, timelines, and points of contact

**Decision — Employment Agreement Approach:**
- **Assumption of existing agreements:** Lower disruption, faster integration. But may result in inconsistent terms across the combined workforce.
- **New agreement rollout:** More disruptive but creates uniform terms. Requires consent from each employee (offer continued employment conditional on signing new agreement).
- **Hybrid approach:** Assume existing agreements for most employees; issue new agreements for executives and key employees with updated terms.

### Step 6: Consolidate IP Portfolio
Integrate the intellectual property assets. Cross-reference `playbooks/ip-portfolio-management.md`:

**IP Integration Actions:**
- Record assignments of all acquired IP with the relevant registries (USPTO, WIPO, Copyright Office)
- Update trademark ownership records and specimens of use
- Transfer domain name registrations to the buyer's registrar
- Consolidate patent portfolios: identify overlapping patents, assess cross-licensing opportunities
- Review the target's open-source usage and integrate into the buyer's open-source compliance program
- Assess whether any acquired IP conflicts with the buyer's existing licenses or obligations
- Update IP insurance coverage to include acquired assets

**Employee IP Assignments:**
- Verify that all acquired employees have executed IP assignment agreements in favor of the target
- If any gaps exist: obtain IP assignment agreements from the employees as part of the new employment agreement rollout
- For key inventors: confirm that prior inventions are properly excluded and all company inventions are assigned

### Step 7: Post-Closing Obligations and Monitoring
Track and fulfill all post-closing obligations from the acquisition agreement:

**Post-Closing Covenants:**
- Create a comprehensive tracker of all post-closing obligations: Obligation | Source (Agreement Section) | Deadline | Owner | Status
- Common obligations: tax filings, regulatory notifications, employee benefit transitions, non-competition covenants, indemnification claims process, earnout milestones, working capital adjustment
- Calendar all deadlines with advance reminders (30-day and 7-day warnings)

**Integration Monitoring:**
- Conduct integration status reviews: weekly for the first 90 days, biweekly for days 91-180, monthly thereafter
- Track integration milestones against the integration plan
- Escalate delays or issues to the integration steering committee
- Document all integration decisions for the record

**Indemnification Management:**
- Monitor for indemnification claims (from buyer against seller, or third-party claims against the acquired business)
- Track claim notification deadlines and procedures per the acquisition agreement
- Manage escrow/holdback releases per the agreed schedule

## Output Format
1. **Integration Tracker:** Master spreadsheet of all integration workstreams, tasks, owners, deadlines, and status
2. **Consent Log:** Status of all required third-party consents with risk assessment for any that are refused
3. **Entity Structure Plan:** Pre- and post-integration entity charts with timeline for consolidation
4. **Compliance Integration Plan:** Gap remediation tasks with owners and deadlines
5. **Employment Transition Memo:** Summary of employment terms harmonization with employee communication plan
6. **Post-Closing Obligations Tracker:** All covenants, deadlines, and compliance status

## Calibration
- **Simple:** Small bolt-on acquisition, single jurisdiction, limited contracts, no regulatory complexity. Target: integration complete within 90 days.
- **Standard:** Mid-market acquisition, multiple jurisdictions, moderate contract portfolio, some regulatory considerations. Target: integration substantially complete within 6 months.
- **Complex:** Large acquisition, cross-border operations, heavily regulated industry, significant contract portfolio requiring consents, workforce integration with WARN implications. Target: integration substantially complete within 12 months. Dedicated integration management office recommended.


---

## Nda Triage

# NDA Triage Playbook

## When to Use
Use this playbook when receiving or initiating a Non-Disclosure Agreement (NDA). NDAs are high-volume, and this playbook enables rapid triage to determine whether the NDA can be signed on template, requires minor edits, or needs full legal review.

## Prerequisites
- Load position file: `knowledge/defaults/positions.mdconfidentiality.md`
- Load clause library: `knowledge/defaults/clause-library.mdip-and-confidentiality.md`
- Load screening checklist: `knowledge/defaults/checklists.mdnda-screening.md`
- Identify the business purpose for the NDA (vendor evaluation, partnership discussion, M&A, employment)
- Determine the direction of disclosure: mutual, one-way (disclosing), or one-way (receiving)
- Confirm whether we have a standard NDA template to propose as an alternative
- Check `knowledge/matters/counterparties/<name>.md` for any prior NDA history or standing instructions

## Process

### Step 1: Template Check
Determine if the NDA is:
- **Our template:** Verify it has not been modified. Compare against the current template version. If unmodified, approve immediately — skip all remaining steps.
- **Counterparty template:** Proceed to Step 2 for triage review.
- **Industry standard (e.g., Bonterms mutual NDA, NVCA model NDA):** Verify version and that no modifications were made, then expedite review — go directly to Step 2 with heightened speed expectation.

**Decision — Template Substitution:**
- If the counterparty template has significant issues (3+ RED flags), propose our template instead. This is faster than negotiating a heavily marked-up counterparty form.

### Step 2: Rapid Triage (5-Minute Assessment)
Run through the following six critical checks against `positions/confidentiality.md`:

1. **Mutual vs. One-Way:** Is the NDA mutual? If one-way, does the direction match our needs?
   - **GREEN:** Mutual NDA, or one-way matching our disclosure direction
   - **YELLOW:** One-way but we may also need to disclose
   - **RED:** One-way protecting only the counterparty when we are also disclosing

2. **Duration:** Is the confidentiality period between 2-5 years?
   - **GREEN:** 2-5 years with trade secret carve-out for perpetual protection
   - **YELLOW:** 1-2 years or 5-7 years
   - **RED:** Under 1 year, over 7 years, or no trade secret carve-out

3. **Definition of Confidential Information:** Is the definition reasonably broad?
   - **GREEN:** Covers oral, written, and electronic; includes a reasonable marking exception for oral disclosures (follow-up in writing within 30 days)
   - **YELLOW:** Requires marking/labeling but has reasonable exceptions
   - **RED:** Requires written marking of ALL information with no exceptions

4. **Permitted Use:** Is use limited to the stated business purpose?
   - **GREEN:** Limited to a defined business purpose
   - **YELLOW:** Broad but commercially reasonable purpose statement
   - **RED:** Undefined, overly broad, or permits use beyond the relationship

5. **Residuals Clause:** Does the NDA contain a residuals clause?
   - **GREEN:** No residuals clause
   - **YELLOW:** Residuals clause limited to general knowledge/experience (not specific information)
   - **RED:** Broad residuals clause permitting use of "ideas, concepts, or techniques" retained in unaided memory — this can gut protections

6. **Non-Standard Provisions:** Flag provisions that do not belong in a standard NDA:
   - Non-solicitation / non-compete clauses → **RED** unless time-limited and customary for the deal type
   - Standstill provisions → **RED** unless M&A context
   - Exclusivity obligations → **RED**
   - Broad IP assignment or license grants → **RED**
   - Indemnification obligations → **YELLOW** (unusual but sometimes acceptable)
   - Liquidated damages → **RED**

### Step 3: FAST TRACK Classification
Based on the triage, classify the NDA:

**FAST TRACK Criteria (all must be met):**
- All six checks are GREEN (zero RED, zero YELLOW)
- No non-standard provisions present
- Standard commercial purpose (not M&A, not competitive intelligence)
- Counterparty is a recognized commercial entity (not an individual, not a foreign government entity)
- NDA term is 2 years or less
→ **Approve for signature with no further review.** Total time: under 10 minutes.

**MINOR EDITS Criteria:**
- Zero RED flags
- 1-3 YELLOW flags that are addressable with standard counter-language from `clause-library/ip-and-confidentiality.md`
- No non-standard provisions beyond a reasonable non-solicitation
→ **Make targeted edits and send back.** Do not escalate. Total time: 30-60 minutes.

**FULL REVIEW Criteria (any one triggers):**
- Any RED flag
- 4+ YELLOW flags
- Non-standard provisions present (exclusivity, IP assignment, liquidated damages)
- M&A, competitive intelligence, or government counterparty context
- Counterparty file in `knowledge/matters/counterparties/` flags special handling
→ **Proceed to Step 4 for detailed review.** Total time: 2-4 hours.

### Step 4: Full Review (If Required)
Apply the complete confidentiality position file analysis:
- Compare all provisions against `positions/confidentiality.md` classification guide, item by item
- Draft a redline using counter-language from `clause-library/ip-and-confidentiality.md`
- For each RED item, provide: (1) the issue, (2) the risk, (3) specific alternative language
- Flag any provisions that require business input (e.g., non-solicitation period, standstill scope)
- If the counterparty's NDA is significantly non-standard (5+ issues), propose substituting our template

**Decision — M&A NDAs:**
- If the NDA is for M&A due diligence, also check for: standstill provisions, representatives/affiliates scope, securities law disclaimers, non-solicitation of employees, and return/destruction obligations. These are standard in M&A NDAs and should not be flagged as unusual.

**Decision — Competitive Sensitivity:**
- If the NDA involves a competitor, require: (1) strict permitted-use limitation, (2) named authorized recipients, (3) no residuals clause, (4) return/destruction upon request (not just expiration). Escalate to senior counsel.

### Step 5: Execution
- Route for signature per the signing authority matrix
- Verify the signatory has appropriate authority for the counterparty (officer, authorized representative)
- Log the NDA in the contract management system with key metadata:
  - Parties, effective date, expiration date, direction (mutual/one-way)
  - Any non-standard provisions accepted (with brief rationale)
  - Business owner and stated purpose
  - FAST TRACK / MINOR EDITS / FULL REVIEW classification
- Set a calendar reminder for expiration date (if the relationship may continue beyond the NDA term)

## Output Format
- **FAST TRACK:** Brief confirmation to business owner: "NDA reviewed against screening checklist, approved for signature. No deviations from standard."
- **MINOR EDITS:** Redlined NDA with cover note explaining 1-3 changes and rationale. Reference the specific position file standard for each edit.
- **FULL REVIEW:** Issues list with RED/YELLOW/GREEN classifications, proposed redline, and negotiation strategy (which items to concede if pushed back).

## Calibration
- **Simple (FAST TRACK):** Mutual NDA on a recognized template or our paper, all checks GREEN. Target: under 10 minutes.
- **Standard (MINOR EDITS):** Counterparty template with 1-3 YELLOW issues. Target: 30-60 minutes.
- **Complex (FULL REVIEW):** NDA with RED flags, non-standard provisions, M&A context, or competitive sensitivity. Target: 2-4 hours.


---

## Negotiation

# Negotiation Playbook

## When to Use
Use this playbook when preparing for and conducting contract negotiations with a counterparty. This applies to both initial deal negotiations and renegotiations of existing agreements.

## Prerequisites
- Completed contract review (see `playbooks/contract-review.md`)
- Issues list with prioritized items (RED/YELLOW/GREEN with tier assignments)
- Business owner alignment on must-haves vs. nice-to-haves
- Understanding of the deal dynamics: leverage, alternatives, timeline, relationship importance
- Knowledge of counterparty's likely positions and constraints
- Load relevant position files from `knowledge/defaults/positions.md`
- Load relevant clause library files from `knowledge/defaults/clause-library.md`
- Check `knowledge/matters/counterparties/<name>.md` for prior negotiation history and known counterparty patterns

## Process

### Step 1: Pre-Negotiation Strategy
Prepare the negotiation framework:
- **BATNA (Best Alternative to Negotiated Agreement):** What happens if we walk away? Quantify the cost of no-deal (delay, alternative vendor, lost revenue).
- **Reservation Price:** The worst acceptable outcome on each key issue. Document this before the negotiation begins — do not let it shift under pressure.
- **Target:** The ideal outcome on each key issue
- **Trade-offs:** Which concessions can we make in exchange for what we need? Map dependencies (e.g., "We can accept a lower liability cap if they agree to a broader termination right").
- **Sequencing:** Order issues from easiest to hardest to build momentum

Create a concession tracker:

| Issue | Our Opening Position | Fallback Position | Walk-Away Point | Counterparty Position | Current Status |
|---|---|---|---|---|---|
| Liability Cap | 12-month fees | 18-month fees | 24-month fees | Unlimited | Open |
| _[populate for each open issue]_ | | | | | |

**Decision — Walk-Away Threshold:**
- Before starting negotiations, define the specific combination of terms that would make the deal unacceptable. A deal is a walk-away if: (1) any single Tier 1 item hits the walk-away point, OR (2) three or more Tier 2 items hit their walk-away points simultaneously. Document this threshold and get business owner sign-off.

### Step 2: Issue Prioritization
Categorize all open issues into tiers. Load position files for classification guidance:
- **Tier 1 — Must Have:** Deal-breakers if not resolved. Non-negotiable legal or business requirements.
  - Examples: liability cap within acceptable range (`positions/limitation-of-liability.md`), data protection compliance (`positions/data-protection.md`), IP ownership of custom work (`positions/ip-ownership.md`)
  - These are non-negotiable. If the counterparty cannot accept any Tier 1 item, escalate to senior leadership before conceding.
- **Tier 2 — Important:** Strong preference but room for creative solutions.
  - Examples: SLA levels (`positions/service-levels.md`), termination convenience rights (`positions/termination-renewal.md`), indemnification scope (`positions/indemnification.md`)
  - Fallback positions are available from the position files.
- **Tier 3 — Nice to Have:** Preferred but expendable as trade currency.
  - Examples: governing law preference (`positions/dispute-resolution.md`), audit frequency, notice periods, force majeure breadth (`positions/force-majeure.md`)
  - These are concession chips. Plan which ones to concede and in what order.

### Step 3: Draft the Redline
Prepare the redline with a strategic approach:
- Include all Tier 1 and Tier 2 positions in the initial redline
- Include selected Tier 3 positions as negotiation currency — plan to concede 2-3 of these early to build goodwill
- Pull proposed language from `clause-library/` files where available. Use proven language rather than drafting from scratch.
- Add comments explaining the rationale for significant changes. Frame in terms of mutual benefit or market standard, not "our policy requires."

**Tactical sub-steps for preparing the redline:**
1. Work section by section through the contract, marking changes in track changes
2. For each RED item: propose complete replacement language from `clause-library/`; add a comment citing the specific concern
3. For each YELLOW item: propose targeted edits (not full rewrites); add a comment with a brief rationale
4. Accept GREEN items explicitly — showing acceptance builds credibility
5. Review the redline in full before sending. Verify that your changes do not create internal inconsistencies (e.g., changing a definition in one place but not another).
6. Avoid over-marking — excessive redlines (more than 40% of provisions changed) signal inexperience or bad faith. If the contract needs that much revision, consider proposing your template instead.

### Step 4: Conduct the Negotiation
Follow these principles during negotiation calls or exchanges:

**Opening:**
- Summarize areas of agreement first to establish common ground
- Present the redline thematically (commercial terms, risk allocation, compliance) rather than page-by-page
- State the number of open issues and your expectation for resolution timeline

**During:**
- Lead with rationale before stating positions ("Given that your product will process our customer PII, we need...")
- Use objective standards to justify positions (market practice, regulatory requirements, industry benchmarks)
- Make concessions conditional ("We can accept X if you agree to Y")
- Take notes on all agreements and commitments in real time
- If stuck, propose alternatives rather than repeating the same position

**Deadlock-Breaking Strategies:**
- **Reframe:** Move from positions to interests ("What are you trying to protect against?")
- **Bracket:** Propose a range and negotiate within it ("Can we agree the cap is somewhere between 12 and 24 months?")
- **Unbundle:** Split a bundled issue into components and negotiate each separately
- **Defer with a trigger:** "Let's use X for now, and if Y happens, we revisit" (sunset clauses, step-ups)
- **Escalate jointly:** If counsel-to-counsel is stuck, propose a joint business-owner call to reset priorities
- **Objective benchmark:** Cite specific market data, survey results, or regulatory requirements to depersonalize the disagreement

**Closing:**
- Summarize all agreed points before ending the session. Read them back for confirmation.
- Confirm next steps, deadlines, and who will prepare the next draft
- Document any oral agreements immediately in a follow-up email ("Per our call, we agreed to...")

### Step 5: Track and Close
After each negotiation session, update the concession tracker:
- Record what was offered, what was accepted, what remains open
- Flag any positions where we have moved past the fallback and are approaching the walk-away point
- Circulate a summary of agreed/open points to the internal team
- Prepare the next draft incorporating agreed changes. Turn on track changes from the prior version so the counterparty can see only the new changes.
- Identify remaining open issues and develop strategies for resolution
- Escalate unresolved Tier 1 issues to senior leadership with a specific recommendation (accept counterparty position / hold firm / propose creative alternative)

**Decision — Escalation Triggers:**
- Any Tier 1 issue unresolved after 2 rounds of negotiation → escalate to senior counsel or business leadership
- Negotiation has exceeded 4 rounds with no material progress → assess whether to (1) escalate to executive-level discussion, (2) propose a term sheet reset, or (3) walk away
- Counterparty introduces new material issues after round 2 → flag as bad-faith risk; reassess deal dynamics

### Step 6: Final Review
Before execution, conduct a final verification pass:
- Verify all negotiated changes are accurately reflected in the final draft. Compare against the concession tracker line by line.
- Confirm no provisions were inadvertently changed or omitted during turn-tracking
- Conduct a final read-through for internal consistency (defined terms, cross-references, exhibit alignment)
- Run the contract through `checklists/contract-review.md` one final time
- Obtain necessary internal approvals per the signing authority matrix
- Verify signing authority for the counterparty (officer, authorized representative)
- If the final terms deviate from standard positions, document the deviations for potential logging in `knowledge/memory/exceptions.md`

## Output Format
1. **Negotiation Prep Memo:** Summary of strategy, priorities, BATNA, and walk-away threshold
2. **Redline:** Marked-up contract with comments, organized by theme
3. **Concession Tracker:** Running log of offers, counteroffers, agreements, and remaining walk-away room
4. **Session Notes:** Summary of each negotiation session (date, attendees, agreements, open items)
5. **Final Issues List:** Remaining open items with specific recommendations and escalation path

## Calibration
- **Simple:** Few open issues, low value, standard terms. Single exchange of redlines. Target: 1-3 rounds over 1-2 weeks.
- **Standard:** Moderate number of issues, medium value. 2-4 rounds of negotiation. Target: 2-4 weeks.
- **Complex:** Many issues, high value, strategic relationship, multiple stakeholders. 4+ rounds with live negotiation sessions. Target: 4-12 weeks. Consider appointing a lead negotiator and maintaining a separate internal strategy document.


---

## Policy Drafting

# Policy Drafting Playbook

## When to Use
Use this playbook when creating or substantially revising an internal company policy. This includes compliance policies, operational policies, HR policies, information security policies, and any formalized standard operating procedures that require legal review and approval.

## Prerequisites
- Clear understanding of the policy objective and the problem it addresses
- Identification of the policy sponsor (executive owner)
- Relevant legal and regulatory requirements identified from `knowledge/law/`
- Existing related policies reviewed for consistency and overlap
- Input gathered from key stakeholders (HR, IT, Compliance, Operations, etc.)
- Benchmark examples from peer companies or industry standards (if available)

## Process

### Step 1: Define the Policy Objective
Before drafting, clearly establish:
- **Problem Statement:** What gap, risk, or regulatory requirement does this policy address?
- **Scope:** Who does this policy apply to (employees, contractors, subsidiaries, affiliates, third parties)?
- **Jurisdiction:** Where does this policy apply (global, US-only, specific regions)?
- **Authority:** What legal or regulatory authority mandates this policy (if any)?
- **Related Policies:** What existing policies intersect, and how does this policy fit into the policy hierarchy?

**Decision — Policy vs. Other Document:**
- **Policy:** Establishes mandatory rules and standards. Requires executive approval. Has enforcement consequences.
- **Standard/Guideline:** Provides recommended approaches. Does not require executive approval. No enforcement consequences.
- **Procedure:** Step-by-step operational instructions implementing a policy. May be updated by the process owner without executive approval.
- If the content is purely operational and does not create enforceable obligations, draft a procedure or guideline instead of a policy.

### Step 2: Research Requirements
Gather all requirements that must be reflected in the policy:

**Legal and regulatory requirements** — Load relevant `knowledge/law/` areas:
| Policy Type | Law Areas to Load |
|---|---|
| Data privacy / data handling | `law/data-privacy/`, `law/cybersecurity/` |
| Information security | `law/cybersecurity/`, `law/data-privacy/` |
| Anti-corruption / ethics | `law/white-collar-investigations/` |
| Employment / HR policies | `law/employment/`, `law/labor-relations/` |
| Financial controls | `law/financial-services/`, `law/securities/` |
| AI / acceptable use | `law/ai-and-automation/` |
| Insider trading | `law/securities/` |
| Environmental / sustainability | `law/environmental-esg/` |
| Whistleblower / reporting | `law/employment/`, `law/securities/` |

**Additional requirements:**
- Industry standards and best practices (ISO 27001, NIST CSF, SOC 2, HIPAA, PCI-DSS)
- Contractual obligations to customers or partners (review key contracts for policy commitments)
- Board directives or management mandates
- Insurance requirements (some policies are required to maintain coverage)
- Prior audit findings or remediation commitments
- Peer company benchmarks

### Step 3: Outline the Policy Structure
Use a consistent policy template. Every policy should contain these sections:
1. **Title and Version** (e.g., "Data Privacy Policy v2.0")
2. **Effective Date** and **Last Reviewed Date**
3. **Policy Owner** (executive sponsor by name and title)
4. **Purpose** (why the policy exists — 2-3 sentences)
5. **Scope** (who and what it covers — be specific about inclusions and exclusions)
6. **Definitions** (key terms used in the policy)
7. **Policy Statement** (the core requirements — the heart of the policy)
8. **Roles and Responsibilities** (who does what — use a RACI matrix for complex policies)
9. **Procedures** (how to comply — step-by-step or reference a separate procedure document)
10. **Exceptions** (how to request an exception — who approves, what documentation is required, how long exceptions last)
11. **Enforcement and Consequences** (what happens if violated — range from warning to termination)
12. **Related Policies and References** (cross-references to other policies, standards, and regulations)
13. **Revision History** (date, version, author, description of changes)

### Step 4: Draft the Policy
Drafting best practices:
- Use clear, direct language accessible to the target audience. Read level should be appropriate for the broadest audience in scope.
- Avoid legalese — policies should be understandable by non-lawyers
- Use modal verbs consistently: "must" for mandatory requirements, "should" for strong recommendations, "may" for optional actions. Never use "shall" (ambiguous in a policy context).
- Be specific about obligations — vague policies are unenforceable and create confusion. Bad: "Employees should handle data carefully." Good: "Employees must encrypt all files containing personal data before transmitting via email."
- Include practical examples where they aid understanding, especially for ambiguous concepts
- Define all technical or legal terms in the definitions section
- Ensure consistency with existing policies and the employee handbook. If this policy conflicts with an existing policy, resolve the conflict before publishing.
- Consider translation requirements for global policies
- For each mandatory requirement, ensure there is a corresponding procedure explaining how to comply

### Step 5: Stakeholder Review
Circulate the draft for input using the stakeholder approval matrix:

| Stakeholder | Review Type | Required For |
|---|---|---|
| Legal | Regulatory compliance, legal accuracy | All policies |
| HR | Employment law, handbook consistency | Any policy affecting employees |
| IT / Security | Technical feasibility, system requirements | Policies with technical controls |
| Business unit leads | Operational practicality, workflow impact | Policies affecting their teams |
| Compliance | Alignment with compliance program | Compliance-related policies |
| Privacy / DPO | Personal data processing, DPIA | Policies involving personal data |
| Finance | Budget impact, financial controls | Policies with cost implications |
| Executive sponsor | Strategic alignment, final authority | All policies |

**Review Process:**
1. Distribute the draft with a review deadline (5-10 business days depending on complexity)
2. Collect written feedback from each stakeholder
3. Hold a consolidation meeting if feedback conflicts across stakeholders
4. Resolve conflicting input — the executive sponsor makes final calls on business judgment; legal makes final calls on legal compliance
5. Produce a final draft incorporating approved feedback
6. Circulate the final draft for sign-off (not further substantive review)

### Step 6: Approval and Adoption
Formalize the policy:
- Obtain executive sponsor sign-off (written approval)
- Obtain legal sign-off (written approval)
- If required, obtain board or committee approval (document in minutes/consent)

**Decision — Approval Level:**
- **Board approval required:** policies mandated by regulation that the board must oversee (insider trading, code of conduct, anti-corruption, whistleblower)
- **Executive committee approval:** company-wide policies with material operational impact (information security, acceptable use, remote work)
- **Department head approval:** department-specific policies or procedures

Post-approval:
- Assign a version number and effective date (allow at least 30 days between publication and enforcement for new policies)
- Publish in the policy repository / intranet
- Communicate to all affected individuals via email, town hall, or manager cascade
- Conduct training sessions if the policy introduces new obligations
- Obtain acknowledgment of receipt from affected personnel (electronic acknowledgment through HR system or policy management tool)

### Step 7: Maintenance
Establish a lifecycle management plan:

**Review Cycle Cadence:**
- **Annual review** (minimum): All policies must be reviewed at least once per year, even if no changes are needed. Document the review ("Reviewed [date], no changes required").
- **Triggered review:** Immediately upon: (1) regulatory change affecting the policy, (2) audit finding, (3) material incident, (4) organizational change (M&A, new product line, new jurisdiction)
- **Sunset review:** If a policy has not been triggered or updated in 3 years, assess whether it is still needed.

Ongoing maintenance:
- Monitor for regulatory changes that require policy updates — set alerts for relevant regulatory bodies
- Track exception requests: if the same exception is granted 3+ times, consider updating the policy to reflect the actual practice
- Track policy violation trends: if a provision is routinely violated, assess whether the requirement is impractical (update the policy) or whether training/enforcement is inadequate
- Maintain a complete revision history in the document
- When updating, issue a change notice explaining what changed and why

## Output Format
1. **Policy Document:** Formatted per the template in Step 3
2. **Regulatory Mapping:** Matrix showing which legal/regulatory requirements the policy addresses
3. **Stakeholder Sign-Off Record:** Approvals obtained with dates
4. **Communication Plan:** How the policy will be rolled out, to whom, and by what date
5. **Training Materials:** If required, key points and FAQs for training
6. **Acknowledgment Form:** Template for personnel to acknowledge receipt and understanding

## Calibration
- **Simple:** Minor policy update or low-complexity operational policy. Target: 1-2 weeks from draft to adoption.
- **Standard:** New policy in a moderately regulated area (information security, acceptable use, travel). Target: 3-6 weeks.
- **Complex:** Highly regulated area (anti-corruption, whistleblower, data privacy, insider trading), global scope, board approval required. Target: 2-3 months. Consider engaging outside counsel for regulatory review.


---

## Privacy Compliance Program

# Privacy Compliance Program Playbook

## When to Use
Use this playbook when building a new privacy compliance program from the ground up, auditing an existing program, or significantly expanding a program to address new jurisdictions or data processing activities. This provides a comprehensive framework for achieving and maintaining compliance with data privacy laws.

## Prerequisites
- Executive sponsor for the privacy program identified (DPO, CPO, General Counsel, or CISO)
- Inventory of business units and products/services that process personal data
- Identification of applicable jurisdictions where the company operates or has data subjects
- Load `knowledge/law/data-privacy/` — load all sub-files relevant to the applicable jurisdictions
- Load `knowledge/law/cybersecurity/` for security requirements
- Load `positions/data-protection.md` for contractual data protection standards
- Budget and staffing plan for the privacy program
- Current state assessment: what privacy measures exist today (if any)?

## Process

### Step 1: Data Inventory and Mapping
Build a comprehensive understanding of what personal data the company processes:

**Data Inventory:**
For each business unit/product/service, document:
- **Categories of data subjects:** customers, employees, job applicants, website visitors, business contacts, minors
- **Categories of personal data:** names, email, phone, address, payment data, health data, biometric data, device identifiers, browsing behavior, geolocation
- **Sensitive/special category data:** racial/ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, sex life/orientation, criminal records
- **Sources of data:** directly from data subjects, third-party data providers, automated collection (cookies, SDKs), publicly available sources
- **Purposes of processing:** service delivery, marketing, analytics, HR administration, fraud prevention, legal compliance
- **Legal basis for each processing activity:** consent, contract performance, legitimate interest, legal obligation, vital interest, public task (GDPR Article 6 basis)

**Data Flow Mapping:**
- Map how data moves through systems: collection → storage → processing → sharing → deletion
- Identify all systems/databases where personal data resides
- Identify all third parties who receive personal data (vendors, partners, affiliates, government)
- Identify cross-border data transfers: which data leaves the country/region of collection? Where does it go?
- Document data retention periods for each data category and system

**Decision — DPIA Requirement:**
- If any processing activity involves: (1) systematic and extensive profiling with significant effects, (2) large-scale processing of sensitive data, (3) systematic monitoring of a publicly accessible area, OR (4) new technology with high risk to individuals → conduct a Data Protection Impact Assessment (DPIA) before the processing begins. This is mandatory under GDPR Article 35 and recommended as best practice in all jurisdictions.

### Step 2: Assess Legal Obligations
Determine which privacy laws apply and what they require:

**Jurisdiction Identification:**
| Trigger | Law/Regulation | Key Requirements |
|---|---|---|
| EU/EEA data subjects | GDPR | Full compliance framework required: legal basis, DPO, DPIA, 72-hour breach notification, data subject rights, cross-border transfer mechanisms |
| UK data subjects | UK GDPR | Similar to EU GDPR; separate ICO registration; UK adequacy determinations |
| California residents | CCPA/CPRA | Notice at collection, opt-out of sale/sharing, data subject rights, service provider contracts |
| Other US states (CO, CT, VA, etc.) | State privacy laws | Vary by state; generally: notice, opt-out, data subject rights; check effective dates |
| Canadian data subjects | PIPEDA / provincial laws | Consent framework, accountability principle, breach notification |
| Brazilian data subjects | LGPD | Legal basis, DPO, data subject rights, ANPD registration |
| Children under 13 (US) | COPPA | Verifiable parental consent, limited collection, FTC enforcement |
| Health data (US) | HIPAA | BAAs, minimum necessary, breach notification, administrative/physical/technical safeguards |
| Financial data (US) | GLBA | Privacy notices, opt-out rights, safeguards rule |

Load the relevant `knowledge/law/data-privacy/` sub-files for each applicable law. Within each sub-file, identify the specific requirements that apply based on the data inventory.

**Decision — Compliance Standard:**
- **Single jurisdiction:** Comply with that jurisdiction's requirements.
- **Multiple jurisdictions:** Assess whether to build to the highest standard (usually GDPR) and apply uniformly, or maintain jurisdiction-specific compliance programs. Recommendation: build to GDPR standard as the baseline and layer on jurisdiction-specific requirements (e.g., CCPA opt-out, HIPAA BAAs).

### Step 3: Draft or Update Privacy Policy
Prepare a privacy policy (external-facing) that meets all applicable legal requirements:

**Required Disclosures (GDPR + CCPA combined for maximum coverage):**
- Identity and contact details of the controller/business
- DPO contact information (if appointed)
- Categories of personal data collected
- Purposes of processing and legal basis for each purpose
- Categories of recipients (third parties who receive the data)
- Cross-border transfers and the safeguards in place (SCCs, adequacy decisions, BCRs)
- Retention periods (or criteria for determining retention)
- Data subject rights and how to exercise them
- Right to lodge a complaint with a supervisory authority
- Whether providing data is a statutory/contractual requirement
- Automated decision-making and profiling (if applicable)
- CCPA-specific: categories of data sold or shared; right to opt out; do-not-sell link; financial incentive programs
- CCPA-specific: metrics on data subject requests (if >10M consumers)

**Drafting Guidelines:**
- Use clear, plain language (GDPR requires language that is "concise, transparent, intelligible and easily accessible")
- Layer the policy: executive summary at the top, detailed disclosures below
- Use a table of contents for policies exceeding 2 pages
- Include a "Last Updated" date
- Make the policy accessible: prominent website link, mobile-friendly format
- If the company processes children's data: maintain a separate children's privacy policy

### Step 4: Implement Data Subject Rights Process
Build an operational process for responding to data subject requests:

**Rights to Support:**
| Right | GDPR | CCPA | Response Deadline |
|---|---|---|---|
| Access / Right to Know | Yes (Art. 15) | Yes | GDPR: 30 days. CCPA: 45 days. |
| Deletion / Erasure | Yes (Art. 17) | Yes | GDPR: 30 days. CCPA: 45 days. |
| Correction / Rectification | Yes (Art. 16) | Yes | GDPR: 30 days. CCPA: 45 days. |
| Portability | Yes (Art. 20) | Limited | GDPR: 30 days. |
| Opt-Out of Sale/Sharing | No | Yes | CCPA: 15 business days. |
| Restriction of Processing | Yes (Art. 18) | No | GDPR: 30 days. |
| Object to Processing | Yes (Art. 21) | No | GDPR: 30 days. |

**Operational Requirements:**
- Establish intake channels: web form, email address (privacy@company.com), toll-free number (CCPA)
- Implement identity verification process (verify the requestor is the data subject — prevent unauthorized disclosure)
- Build fulfillment workflows: who receives the request, who searches the systems, who compiles the response, who reviews and sends
- Automate where possible: data subject access request portals, automated data retrieval from key systems
- Train customer support and front-line staff to recognize and route data subject requests
- Track all requests: Date Received | Type | Requestor | Verification Status | Systems Searched | Response Date | Outcome

**Decision — Exception Handling:**
- If a request would adversely affect the rights of others → partial fulfillment with explanation
- If a request is manifestly unfounded or excessive → may refuse or charge a reasonable fee (GDPR); must still respond within the deadline explaining the refusal
- If the company cannot verify the requestor's identity → request additional verification; do not extend beyond 90 days total response time

### Step 5: Establish Breach Response Plan
Create a documented incident response plan for personal data breaches:

**Breach Response Process:**
1. **Detection and Reporting (Hour 0-4):** Any employee who discovers a potential breach reports to the privacy/security team immediately. Establish a clear reporting channel (security@company.com, hotline, Slack channel).
2. **Initial Assessment (Hour 4-24):** Determine: Is personal data involved? What categories of data? How many data subjects are affected? Is the breach ongoing or contained?
3. **Containment (Hour 0-72):** Stop the breach (revoke access, patch vulnerability, isolate affected systems). Preserve forensic evidence.
4. **Notification Assessment (Hour 24-48):** Determine whether notification obligations are triggered:
   - **GDPR:** Notify supervisory authority within 72 hours of becoming aware, unless unlikely to result in risk to individuals. Notify data subjects without undue delay if high risk.
   - **CCPA:** Notify affected California residents if unencrypted personal information is breached.
   - **State breach notification laws:** Check all states where affected individuals reside (notification timelines vary: 30-90 days).
   - **HIPAA:** Notify HHS within 60 days (or 60 days from discovery if <500 individuals; immediately if 500+). Notify affected individuals within 60 days.
   - **Contractual obligations:** Check customer and partner contracts for breach notification requirements (often 24-72 hours).
5. **Notification Execution (Hour 48-72 for authorities; within required period for individuals):** Prepare and send notifications per applicable requirements.
6. **Remediation (Week 1-4):** Fix the root cause. Implement additional safeguards. Update policies and training.
7. **Post-Incident Review (Week 4-8):** Conduct a lessons-learned review. Update the breach response plan. Report to leadership.

### Step 6: Vendor DPA Audit
Ensure all vendors processing personal data have adequate contractual protections:

**DPA Audit Process:** Load `positions/data-protection.md`.
- From the data inventory (Step 1), identify all vendors/sub-processors who process personal data on the company's behalf
- For each vendor, verify: (1) a DPA or equivalent data protection terms exist in the contract, (2) the DPA meets the requirements of the applicable law (GDPR Article 28, CCPA service provider provisions)
- For GDPR: verify the DPA includes: subject matter and duration of processing, nature and purpose, types of personal data, categories of data subjects, controller's obligations and rights, processor's obligations (security, sub-processors, cooperation, deletion/return, audit)
- For cross-border transfers: verify adequate transfer mechanisms (Standard Contractual Clauses, adequacy decision, BCRs, or approved derogation)
- For HIPAA: verify Business Associate Agreements are in place for all vendors handling PHI

**Decision — DPA Gap Remediation:**
- If a vendor processes personal data without a DPA → highest priority. Execute DPA within 30 days or cease data sharing.
- If a DPA exists but is incomplete (missing required GDPR Article 28 provisions) → update within 60 days.
- If cross-border transfers lack a valid mechanism → assess risk and implement SCCs or other mechanism within 90 days.

### Step 7: Training Program
Implement a privacy awareness and training program:

**Training Requirements:**
| Audience | Training Type | Frequency |
|---|---|---|
| All employees | General privacy awareness | Annually + at onboarding |
| Product/engineering teams | Privacy by design, data minimization | Semi-annually |
| Customer support | Data subject request handling | Quarterly refresher |
| Marketing | Consent management, opt-out handling, CAN-SPAM | Semi-annually |
| HR | Employee data privacy, background checks | Annually |
| Executive team | Privacy governance, breach response, regulatory risk | Annually |
| Privacy team | Regulatory updates, enforcement trends | Ongoing |

**Training Content:**
- Company's privacy policy and data handling practices
- How to recognize and report a data breach
- Data subject rights and how to route requests
- Cross-border data transfer restrictions
- Secure data handling practices (encryption, access controls, clean desk)
- Role-specific requirements

### Step 8: Ongoing Monitoring
Establish continuous compliance monitoring:

- **Quarterly:** Review data subject request metrics; review breach log; update data inventory for new products/services
- **Semi-annually:** Review and update privacy policy; re-assess vendor DPA coverage; review consent mechanisms
- **Annually:** Full program audit against all applicable laws; training effectiveness assessment; regulatory landscape update; update DPIA for high-risk processing
- **Triggered:** Regulatory change (new law or significant amendment); new product/service launch; M&A activity; data breach; regulatory inquiry

Document all monitoring activities and findings. Report to the executive sponsor and board (or audit committee) at least annually.

## Output Format
1. **Data Inventory and Flow Map:** Comprehensive data processing record (GDPR Article 30 Record of Processing Activities)
2. **Legal Obligations Matrix:** Applicable laws, specific requirements, and compliance status for each
3. **Privacy Policy:** Drafted or updated external-facing privacy policy
4. **Data Subject Rights Procedures:** Documented workflows for each right type
5. **Breach Response Plan:** Documented incident response plan with notification decision tree
6. **Vendor DPA Tracker:** Status of DPAs for all vendors processing personal data
7. **Training Plan:** Training schedule, content, and completion tracking
8. **Program Maturity Assessment:** Current state vs. target state with remediation roadmap

## Calibration
- **Simple:** Small company, single jurisdiction (US-only or EU-only), limited data processing. Target: initial program build in 4-8 weeks.
- **Standard:** Mid-sized company, multiple jurisdictions (US + EU), moderate data processing, some vendor relationships. Target: initial program build in 2-4 months.
- **Complex:** Large company, global operations, heavy data processing, regulated industry (healthcare, financial services), significant vendor ecosystem. Target: initial program build in 4-8 months. Engage specialized privacy counsel and consider appointing a dedicated DPO.


---

## Regulatory Response

# Regulatory Response Playbook

## When to Use
Use this playbook when the company receives a regulatory investigation notice, subpoena, civil investigative demand (CID), enforcement action, consent order, or any formal communication from a government regulatory body requiring a response. This includes inquiries from the SEC, FTC, DOJ, state attorneys general, data protection authorities, OSHA, EPA, and sector-specific regulators.

## Prerequisites
- The regulatory communication (subpoena, CID, inquiry letter, enforcement notice, consent decree)
- Identification of the issuing regulatory body and the specific statute or regulation cited
- Load relevant `knowledge/law/` areas based on the regulatory body and subject matter:
  - SEC/FINRA → `law/securities/`, `law/financial-services/`
  - FTC → `law/consumer-protection/`, `law/advertising-media/`
  - DOJ → `law/white-collar-investigations/`, `law/antitrust/`
  - Data protection authority (GDPR, CCPA) → `law/data-privacy/`
  - State AG → varies by subject (consumer protection, privacy, antitrust)
  - OSHA → `law/employment/`
  - EPA → `law/environmental-esg/`
- Load `checklists/litigation-hold.md` for document preservation
- Outside counsel identified and available (specialized regulatory counsel strongly recommended for all but routine inquiries)
- D&O insurance and regulatory investigation coverage reviewed
- Board notification requirements assessed

## Process

### Step 1: Assess Scope and Urgency
Within 24 hours of receiving the communication, conduct an initial assessment:

**Classification:**
- **Formal Investigation / Enforcement Action:** Subpoena, CID, formal order of investigation, Wells notice, complaint. **Response: Engage outside counsel immediately. Board notification within 48 hours. Litigation hold within 24 hours.**
- **Informal Inquiry:** Voluntary information request, regulatory audit, routine examination. **Response: Assess scope within 48 hours. Outside counsel engagement recommended but not mandatory for routine matters.**
- **Consent / Settlement:** Proposed consent order, assurance of voluntary compliance, settlement offer. **Response: Engage outside counsel. Strategic assessment within 1 week.**

**Deadline Identification:**
- Subpoena compliance date (federal grand jury subpoenas: typically 14-21 days; CIDs: 30-60 days; regulatory subpoenas: varies)
- Response deadlines (Wells notice response: typically 30 days; SEC comment letters: 10 business days)
- Identify whether extensions are available and customary for this regulator

**Scope Assessment:**
- What time period does the inquiry cover?
- What subject matter or conduct is at issue?
- Which business units, products, or individuals are implicated?
- Is this a company-specific inquiry or an industry-wide sweep?
- Are there parallel proceedings (e.g., DOJ criminal investigation alongside SEC civil investigation)?

**Decision — Parallel Proceedings:**
- If there is any indication of a parallel criminal investigation (DOJ involvement, grand jury subpoena, FBI contact): immediately engage white-collar defense counsel. Do not respond to any inquiry — civil or criminal — without coordinated counsel advice. The Fifth Amendment and joint defense considerations become critical.

### Step 2: Preserve Documents
Immediately upon receipt. Load `checklists/litigation-hold.md`:
- Issue a litigation hold notice to all potentially relevant custodians within 24 hours
- Scope the hold broadly initially — it can be narrowed later, but spoliation cannot be undone
- Preserve all potentially relevant documents, communications, and electronic records
- Suspend document retention/destruction schedules for all relevant materials
- Preserve specific categories: email, Slack/Teams, documents, databases, system logs, backup tapes, mobile devices
- For regulated industries: preserve regulatory filings, compliance records, audit trail data
- Document all preservation steps taken (date, scope, custodians, systems preserved)
- Engage e-discovery counsel or vendor if the data volume is significant

**Decision — Preservation Scope:**
- If the inquiry is narrowly scoped (specific product, specific time period): issue a targeted hold to custodians directly involved
- If the inquiry is broad or unclear: issue a company-wide hold to all employees who may have relevant information, plus IT systems administrators
- When in doubt, preserve broadly. The cost of over-preservation is far less than sanctions for spoliation.

### Step 3: Engage Counsel and Assemble Response Team
- Engage outside regulatory counsel with specific expertise in the relevant regulatory area
- Form an internal response team: General Counsel, business unit leader, compliance officer, IT/document management, communications/PR
- Establish a clear chain of command for response decisions and communications
- Set up a privileged communication channel (separate email group, dedicated Slack channel marked privileged)
- Brief the CEO and board (or audit committee) per the company's notification requirements:
  - Formal investigations: board notification typically required within 48 hours
  - Insurance carriers: notify D&O and regulatory investigation carriers promptly to preserve coverage

**Decision — Individual vs. Company Counsel:**
- If any individual employee may be personally at risk (named in the inquiry, potential witness, potential target): advise them of their right to personal counsel at company expense (per D&O policy and indemnification obligations). Do not assume the company's counsel represents individuals.
- If there are potential conflicts between the company's interests and individual officers/directors: separate counsel is mandatory.

### Step 4: Evaluate Cooperation Strategy
Determine the company's posture toward the investigation:

**Cooperation vs. Adversarial — Decision Framework:**
- **Full Cooperation:** Appropriate when: (1) the company has no or minimal culpability, (2) the conduct was by rogue individuals not acting in the company's interest, (3) the company self-reported the issue, (4) cooperation credit is significant (DOJ cooperation guidelines, SEC cooperation credit). Benefits: reduced penalties, deferred/non-prosecution agreement eligibility, favorable settlement terms.
- **Selective Cooperation:** Appropriate when: (1) some culpability exists but is limited, (2) cooperation on some topics but not others serves the company's interest, (3) the company wants to maintain privilege over internal investigation findings. Approach: comply fully with document requests; cooperate on facts while reserving legal arguments.
- **Adversarial Defense:** Appropriate when: (1) the company believes the regulatory theory is legally wrong, (2) the facts strongly favor the company, (3) the penalties for settlement are disproportionate, (4) precedent-setting concerns outweigh the cost of defense. Approach: comply with compulsory process; challenge overreach; assert privileges vigorously.

**Key Factors:**
- Severity of potential penalties (monetary, injunctive, license revocation, criminal referral)
- Strength of the company's factual and legal position
- Regulatory enforcement history and negotiation tendencies of the specific agency
- Reputational impact of the investigation and potential resolution
- Impact on ongoing business operations and relationships
- Insurance coverage for fines, penalties, and defense costs

### Step 5: Draft the Response
Prepare the response according to the regulatory requirements:

**For Document Subpoenas / CIDs:**
- Parse the document requests item by item. For each request: identify the scope, time period, and relevant custodians.
- Raise objections where appropriate (overbreadth, undue burden, privilege, attorney work product, relevance). Objections should be specific, not boilerplate.
- Negotiate the scope before producing — most regulators expect a meet-and-confer before production
- Prepare a privilege log for all withheld documents (date, author, recipient, subject, privilege basis)
- Produce documents in the format specified (or negotiate format: native, PDF, TIFF, load file)

**For Interrogatories / Written Questions:**
- Draft responses under oath, reviewed by counsel
- Use precise language — every word in a sworn response can be used later
- Object where appropriate but avoid blanket objections
- Distinguish between facts the company knows and facts it has investigated

**For Testimony / Depositions:**
- Prepare witnesses thoroughly with counsel (review documents, conduct mock examination)
- Instruct witnesses to answer only the question asked, truthfully and concisely
- Assert privilege where appropriate during testimony

**For Settlement / Consent Negotiations:**
- Assess the regulatory "ask" against the company's risk assessment
- Evaluate monetary penalties, injunctive relief, compliance commitments, and monitoring requirements
- Draft counterproposals with specific, measurable compliance commitments the company can actually fulfill
- Avoid admissions of liability where possible (neither admit nor deny)

### Step 6: Negotiate Timeline and Process
- Request reasonable extensions if the initial deadline is insufficient (most regulators will grant one extension for good cause)
- Propose a rolling production schedule for large document sets
- Negotiate the scope of production to eliminate clearly irrelevant or disproportionate requests
- Establish a point of contact at the regulatory agency and maintain professional, responsive communication
- Document all communications with the regulator (date, participants, topics discussed, commitments made)
- Comply with all agreed deadlines — missed deadlines severely damage credibility and cooperation credit

### Step 7: Monitor and Resolve
Track the investigation through resolution:
- Maintain a matter log: Date | Event | Action | Deadline | Owner | Status
- Calendar all deadlines and intermediate milestones
- Report status to the board/audit committee on a regular cadence (monthly for active investigations)
- Monitor for parallel proceedings, related litigation (class actions often follow regulatory actions), and media coverage
- Reassess the cooperation strategy as facts develop
- Negotiate resolution (consent order, settlement, no-action, closing letter) with counsel's guidance
- Post-resolution: implement any agreed compliance enhancements; conduct a lessons-learned review; consider updating `knowledge/memory/decisions.md` and `knowledge/memory/patterns.md`

## Output Format
1. **Initial Assessment Memo:** Classification, scope, urgency, deadline, regulatory body profile, parallel proceedings check
2. **Preservation Notice:** Litigation hold with custodian list and scope
3. **Cooperation Strategy Memo:** Recommended posture (cooperate/selective/adversarial) with rationale and cost-benefit analysis
4. **Response Documents:** Objections, document productions, written responses, privilege log
5. **Status Reports:** Regular updates to board/audit committee with timeline, exposure assessment, and strategy updates
6. **Resolution Summary:** Final outcome, compliance commitments, lessons learned

## Calibration
- **Simple:** Routine regulatory audit or informal inquiry (SEC comment letter, state examination). Target: initial response within 10-15 business days.
- **Standard:** Formal investigation or CID with moderate scope. Outside counsel engaged. Target: initial response within 30 days; full cooperation/response over 2-4 months.
- **Complex:** Multi-agency investigation, parallel criminal proceedings, industry-wide sweep, significant financial exposure. Full defense team engaged. Target: initial assessment within 48 hours; response strategy within 1 week; active management for 6-18 months.


---

## Vendor Onboarding

# Vendor Onboarding Playbook

## When to Use
Use this playbook when engaging a new vendor or renewing/expanding a relationship with an existing vendor. This covers the end-to-end process from initial assessment through contract execution and ongoing management.

## Prerequisites
- Business case for the vendor engagement approved
- Budget allocated and procurement process initiated
- Vendor identified and initial discussions completed
- Vendor onboarding checklist prepared: load `checklists/vendor-onboarding.md`
- Risk tier determined based on data access, spend, and business criticality
- Check `knowledge/matters/counterparties/<name>.md` for any prior vendor relationship history

## Process

### Step 1: Vendor Risk Assessment
Classify the vendor by risk tier using the following criteria matrix:

**Risk Tier Classification:**

| Factor | Tier 1 (Critical) | Tier 2 (Important) | Tier 3 (Routine) |
|---|---|---|---|
| Data Access | Accesses, processes, or stores sensitive/personal data (PII, PHI, financial) | Moderate data access (business data, non-sensitive employee data) | No data access or only publicly available data |
| Annual Spend | >$500K | $100K-$500K | <$100K |
| Business Criticality | Business-critical service; outage directly impacts revenue or operations | Significant but non-critical; workarounds exist | Commodity service; easily replaceable |
| Regulatory Impact | Vendor's services are subject to specific regulation (HIPAA, PCI, SOX) | Some regulatory touchpoints | No regulatory considerations |
| Replaceability | Few alternatives; high switching cost; 3+ month transition | Moderate alternatives; 1-3 month transition | Many alternatives; <1 month transition |

**Scoring:** If ANY factor qualifies as Tier 1 → classify as Tier 1. If any factor is Tier 2 and none are Tier 1 → classify as Tier 2. Otherwise → Tier 3.

Additional risk factors to evaluate:
- Geographic location and cross-border considerations (data residency requirements, sanctions screening)
- Vendor's financial stability and going-concern risk
- Concentration risk: does this vendor already provide other services? What is total spend across all engagements?
- Fourth-party risk: does the vendor rely on sub-processors or subcontractors for material portions of the service?

**Decision — Risk Tier Drives Process Depth:**
- **Tier 1:** Full process, all steps. Target: 6-12 weeks. Requires Legal, Security, Privacy, and executive approval.
- **Tier 2:** Standard process, Steps 1-5 with abbreviated Step 2. Target: 3-6 weeks. Requires Legal and Security approval.
- **Tier 3:** Streamlined process, abbreviated Steps 1-3 and Step 5. Target: 1-2 weeks. Legal review of contract terms only.

### Step 2: Security and Compliance Assessment
Based on the risk tier, conduct the appropriate level of diligence:

**Tier 1 — Full Assessment:**
- Security questionnaire (SIG Lite, CAIQ, or custom). Review all responses; follow up on any incomplete answers.
- Review SOC 2 Type II report (or ISO 27001 certification). Read the full report, not just the opinion letter. Flag any qualified opinions, exceptions, or noted deficiencies.
- Penetration test results (within last 12 months). Verify critical/high findings have been remediated.
- Business continuity and disaster recovery plans. Confirm RTO/RPO align with your requirements.
- Data processing assessment: types of data processed, processing purposes, data retention schedule, deletion procedures, sub-processor list
- Sub-processor review: who are the vendor's material sub-processors? Where do they process data? Are they contractually bound to equivalent protections?
- Insurance coverage verification: commercial general liability, professional liability/E&O, cyber liability. Confirm coverage limits meet your minimum requirements per `positions/insurance-requirements.md`.
- Financial stability assessment: D&B report, annual report, or financial statements
- Reference checks: contact 2-3 existing customers in similar industry/use case
- On-site or virtual assessment (for vendors handling highly sensitive data or providing critical infrastructure)

**Tier 2 — Standard Assessment:**
- Security questionnaire (abbreviated — focus on top 20 questions covering encryption, access control, incident response, data handling)
- SOC 2 Type II report or ISO 27001 certification (review opinion letter and exceptions summary)
- Privacy policy review and DPA adequacy assessment. Load `positions/data-protection.md`.
- Insurance certificate confirming adequate coverage
- Basic financial assessment (public information, D&B rating)

**Tier 3 — Basic Assessment:**
- Self-certification or attestation (vendor confirms compliance with your minimum security standards)
- Standard contract terms review (see Step 3)
- Insurance certificate (if the vendor provides professional services or accesses any company systems)

**Decision — Assessment Blockers:**
- If a Tier 1 vendor refuses to complete the security questionnaire or provide a SOC 2 report → escalate to the business owner. Recommend either (1) selecting an alternative vendor, or (2) proceeding with enhanced contractual protections and a right-to-audit clause. Document the risk acceptance.
- If a Tier 1 vendor's security assessment reveals critical deficiencies → do not proceed until the vendor provides a remediation plan with timeline. Re-assess after remediation.

### Step 3: Contract Review and Negotiation
Execute the appropriate contract(s). The contract package varies by tier:

**Tier 1 Contract Package:**
- NDA (if not already in place — see `playbooks/nda-triage.md`)
- Master Services Agreement (MSA) or SaaS Agreement — apply `playbooks/contract-review.md` with full position-file review
- Data Processing Agreement (DPA) — required if personal data is processed. Load `positions/data-protection.md`.
- Order Form / Statement of Work — specific scope, pricing, SLAs, and deliverables
- Business Associate Agreement (BAA) — required if HIPAA applies. Load `law/healthcare/`.
- SLA Exhibit — with measurable uptime, response time, and remedies. Load `positions/service-levels.md`.

**Tier 2 Contract Package:**
- NDA (if needed)
- MSA or SaaS Agreement — apply `playbooks/contract-review.md` with standard review depth
- DPA (if personal data is involved)
- Order Form / SOW

**Tier 3 Contract Package:**
- Review vendor's standard terms (click-through or order form)
- Focus review on: limitation of liability (`positions/limitation-of-liability.md`), data handling, auto-renewal terms (`positions/termination-renewal.md`), and governing law (`positions/dispute-resolution.md`)
- NDA only if confidential information will be shared

**Key focus areas for all vendor contracts** (load corresponding position files):
| Provision | Position File | Priority by Tier |
|---|---|---|
| Data protection & security | `positions/data-protection.md` | Tier 1: Critical. Tier 2: High. Tier 3: If applicable. |
| Limitation of liability | `positions/limitation-of-liability.md` | All tiers: High. Ensure carve-outs for data breaches and IP infringement. |
| Indemnification | `positions/indemnification.md` | Tier 1: Critical. Tier 2: High. Tier 3: Standard. |
| Termination rights | `positions/termination-renewal.md` | All tiers: High. Ensure convenience termination and transition assistance. |
| Service levels | `positions/service-levels.md` | Tier 1: Critical. Tier 2: High. Tier 3: N/A. |
| Insurance requirements | `positions/insurance-requirements.md` | Tier 1: Critical. Tier 2: Standard. Tier 3: If applicable. |
| Audit rights | — | Tier 1: Required. Tier 2: Recommended. Tier 3: N/A. |
| Sub-contracting restrictions | — | Tier 1: Required (prior written consent). Tier 2: Notice required. Tier 3: N/A. |

### Step 4: Internal Approvals
Obtain necessary approvals before execution. Approval requirements vary by tier:

| Approver | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Business owner | Required | Required | Required |
| Legal | Required (senior counsel) | Required | Review only |
| Information Security | Required | Required | Not required |
| Privacy / DPO | Required (if personal data) | Required (if personal data) | Not required |
| Procurement | Required | Required | Required |
| Finance | Required (budget confirmation) | Required | Required |
| Executive (per DOA matrix) | Required (if above threshold) | If above threshold | Not required |

**Decision — Approval Escalation:**
- If any approver raises a material concern (e.g., Security flags critical deficiency, Privacy identifies GDPR violation) → do not proceed to execution. Return to Step 2 or Step 3 to address the concern.
- If approvers disagree (e.g., Business wants to proceed, Security recommends against) → escalate to the executive sponsor for a documented risk acceptance decision.

### Step 5: Onboarding Execution
Complete the operational onboarding:
- Execute contracts and file in the contract management system with metadata tags: vendor name, tier, contract dates, data processing flag
- Set up the vendor in financial systems (payment terms, banking details, tax documentation)
- Configure technical access and integrations with IT/Security oversight:
  - Tier 1: Formal access provisioning with Security review, SSO integration where possible, monitoring enabled
  - Tier 2: Standard access provisioning with Security notification
  - Tier 3: Self-service or standard procurement process
- Establish communication channels and escalation contacts (primary contact, escalation contact, executive sponsor for Tier 1)
- Document the vendor in the vendor registry with key metadata:
  - Contract dates (start, end, renewal notification date)
  - Risk tier and classification rationale
  - Data processing summary (data types, purposes, sub-processors)
  - Key contacts (internal business owner, vendor contacts)
  - SLA commitments and measurement method
  - Insurance expiration dates
  - Next assessment due date
- Set up calendar reminders for key dates: renewal notice deadline (typically 60-90 days before auto-renewal), insurance certificate expiry, annual/biennial security reassessment

### Step 6: Ongoing Management
Establish a vendor management cadence by tier:

**Tier 1 — Continuous Oversight:**
- Quarterly business reviews (QBRs) with vendor: performance, SLAs, roadmap, issues
- Annual security reassessment (request updated SOC 2, re-issue security questionnaire)
- Annual DPA review (sub-processor changes, DPIA updates)
- Continuous SLA monitoring with monthly reporting
- Incident tracking and post-incident review for any service disruption or security event
- Annual contract review: are the terms still market-appropriate? Load current position files and compare.

**Tier 2 — Periodic Oversight:**
- Semi-annual business reviews
- Biennial security reassessment
- SLA monitoring (monthly or quarterly depending on criticality)
- Annual contract renewal review

**Tier 3 — Light-Touch Oversight:**
- Annual check-in with business owner: is the vendor still needed? Still performing?
- Contract renewal review: check auto-renewal terms, price increases
- Re-tier if the vendor's scope or data access has changed

**Decision — Re-Tiering Triggers:**
- Vendor begins processing personal data or sensitive data → upgrade to Tier 1
- Vendor's annual spend exceeds tier threshold → upgrade tier
- Vendor becomes business-critical (e.g., sole-source for a key function) → upgrade to Tier 1
- Vendor scope decreases or contract value drops → consider downgrading tier
- Vendor experiences a security breach or material service failure → reassess tier and consider enhanced monitoring or replacement

## Output Format
1. **Vendor Risk Assessment:** Tier classification with scoring matrix and supporting rationale
2. **Security Assessment Summary:** Key findings, conditions for approval, and any risk acceptances
3. **Contract Package:** Executed agreements filed in contract management system
4. **Approval Record:** Sign-offs from all required approvers with dates
5. **Vendor Registry Entry:** Complete metadata record for ongoing management
6. **Onboarding Checklist:** Completed `checklists/vendor-onboarding.md` confirming all steps are done

## Calibration
- **Simple (Tier 3):** Routine vendor, no data access, low spend. Abbreviated process. Target: 1-2 weeks.
- **Standard (Tier 2):** Moderate risk vendor, some data access or significant spend. Standard process. Target: 3-6 weeks.
- **Complex (Tier 1):** Critical vendor, sensitive data access, high spend, regulatory implications. Full process with all assessments. Target: 6-12 weeks.


