---
counsel-os-type: practice
content-version: "2026-04-08"
---
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
- Load `methods/litigation-hold.md` for document preservation
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
Immediately upon receipt. Load `methods/litigation-hold.md`:
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
- Post-resolution: implement any agreed compliance enhancements; conduct a lessons-learned review; consider updating the entity file (via QMD discovery) and `knowledge/memory/patterns.md`

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
