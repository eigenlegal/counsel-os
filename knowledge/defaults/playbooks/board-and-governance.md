---
counsel-os-type: playbook
counsel-os-version: "0.3.1"
---

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
