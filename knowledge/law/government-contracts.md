## Overview

# Government Contracts

## Trigger Conditions

Load this area when the matter involves ANY of:
- Government contract, federal contract, state/local procurement
- FAR (Federal Acquisition Regulation) or DFAR (Defense FAR Supplement)
- Procurement, federal acquisition, competitive bidding
- Bid protest (GAO, COFC)
- Set-aside programs (8(a), HUBZone, SDVOSB, WOSB)
- FOIA (Freedom of Information Act) requests or responses
- Sovereign immunity, Tucker Act, FTCA
- GSA Schedule, IDIQ, BPA

## Sub-File Triggers

| File | Load When |
|------|-----------|
| `far-dfar.md` | FAR/DFAR clauses, flowdown, CAS, TINA, IP/data rights |
| `procurement.md` | Bidding, solicitation, source selection, bid protests |
| `compliance-certifications.md` | SAM, debarment, OCI, mandatory disclosures, size standards |
| `foia.md` | FOIA request, Exemption 4, submitter notice, public records |
| `sovereign-immunity.md` | Claims against government, Tucker Act, FTCA, tribal immunity |
| `small-business.md` | 8(a), HUBZone, SDVOSB, WOSB, subcontracting plans, mentor-protege |

## Interaction with Other Areas

- **data-privacy/**: Government contracts with data handling trigger FedRAMP, FISMA, CMMC
- **employment/**: Service Contract Act, Davis-Bacon Act for covered contracts
- **ip-and-technology/**: Government IP/data rights (FAR 52.227) override standard IP provisions
- **cybersecurity**: CMMC 2.0, DFARS 252.204-7012 (CUI protection)

---
## Compliance Certifications

# Compliance & Certifications

## Applicability

Applies to all entities seeking or performing government contracts. Covers registration requirements, responsibility determinations, organizational conflicts of interest, mandatory disclosure obligations, and affirmative action requirements.

## Key Requirements

### SAM Registration (System for Award Management)

- **What**: Mandatory registration in SAM.gov for all entities receiving federal contract awards; must maintain active registration throughout contract performance
- **Threshold/Timeline**: Registration must be renewed annually; initial registration can take 7-10 business days (longer for foreign entities); CAGE/NCAGE code and unique entity ID (UEI) assigned during registration
- **Consequence**: Contract cannot be awarded to unregistered entity; lapsed registration may delay payments and prevent new awards; misrepresentations in SAM are subject to False Claims Act liability

### Debarment and Suspension (FAR 9.4)

- **What**: Government-wide exclusion from receiving contracts based on serious misconduct (conviction, civil judgment, failure to perform, violation of law)
- **Threshold/Timeline**: Suspension is temporary (pending investigation, up to 18 months); debarment typically 3 years; agencies must check SAM.gov exclusions before award; FAR 52.209-5 certification required
- **Consequence**: Debarred/suspended parties ineligible for new contracts, subcontracts, and federal assistance government-wide; knowing award to excluded party violates FAR; affiliates may also be excluded

### Size Standards (SBA)

- **What**: Small Business Administration establishes size standards by NAICS code to determine small business eligibility for set-asides and preferences
- **Threshold/Timeline**: Size standards vary by industry — range from $9M to $47M in average annual receipts (services) or 100 to 1,500 employees (manufacturing); size determined as of date of initial offer including options; recertification required upon merger/acquisition, novation, or end of base term for long-term contracts
- **Consequence**: Size protests filed with SBA Area Office within 5 business days of notification of apparent awardee; adverse determination results in loss of small business status for that procurement; SBA OHA appeal within 15 calendar days; false size claims trigger False Claims Act and Program Fraud Civil Remedies Act ($11,665 per false claim)

### Organizational Conflicts of Interest (OCI) (FAR 9.5)

- **What**: Situations where a contractor's competing interests or unfair access to information may bias its judgment or provide unfair competitive advantage
- **Threshold/Timeline**: Three types — unequal access to information, biased ground rules, impaired objectivity; must be identified and mitigated before award; contracting officer has broad discretion
- **Consequence**: Failure to disclose OCI can result in contract voidance, disqualification from competition, and suspension/debarment; mitigation plans (firewalls, recusal, divestiture) may be acceptable if adequately implemented

### Mandatory Disclosures (FAR 52.203-13)

- **What**: Contractors must timely disclose credible evidence of violations of federal criminal law involving fraud, conflict of interest, bribery, or gratuity violations; violations of the civil False Claims Act; and significant overpayments
- **Threshold/Timeline**: Applies to contracts exceeding $6M and performance period exceeding 120 days; disclosure made to agency OIG and contracting officer; must establish internal ethics/compliance program and business ethics awareness training within 90 days of award
- **Consequence**: Failure to disclose is grounds for suspension or debarment; knowing failure may result in additional False Claims Act liability; voluntary disclosure may be considered mitigating factor in enforcement decisions; DOJ Voluntary Self-Disclosure Policy provides potential reduced penalties

### Affirmative Action (Executive Order 11246)

- **What**: Federal contractors and subcontractors must take affirmative action to ensure equal employment opportunity regardless of race, color, religion, sex, sexual orientation, gender identity, or national origin
- **Threshold/Timeline**: Applies to contractors with contracts exceeding $10K; written affirmative action plan (AAP) required for contractors with 50+ employees and contracts of $50K+; VETS-4212 reporting required for contracts of $150K+
- **Consequence**: OFCCP enforcement includes compliance reviews, complaint investigations; remedies include back pay, front pay, retroactive seniority; ultimate sanction is debarment from future contracts; annual EEO-1 reporting required

### Anti-Trafficking (FAR 52.222-50)

- **What**: Zero tolerance policy for trafficking in persons; applies to all contracts regardless of value or place of performance
- **Threshold/Timeline**: Compliance plan required for contracts exceeding $550K performed outside the US; annual certifications required for such contracts; contractor must inform employees of policy
- **Consequence**: Violations may result in contract termination, suspension, debarment; agency head must be notified of credible violations; applies to contractors, subcontractors, and their agents

### Contractor Code of Business Ethics (FAR 52.203-13/14)

- **What**: Requirement for written code of business ethics and conduct, internal control system, ethics training, and whistleblower protections
- **Threshold/Timeline**: Full compliance program required within 90 days of award for contracts exceeding $6M with performance period >120 days; must include hotline or mechanism for anonymous reporting
- **Consequence**: Contractor Employee Protection (FAR 52.203-17) prohibits retaliation against whistleblowers; violations subject to reprisal complaint to OIG; remedies include reinstatement, back pay, compensatory damages

## Interaction with Other Areas

- **employment/**: EO 11246 affirmative action overlaps with Title VII and OFCCP requirements; minimum wage (EO 14026, currently $17.20/hr for federal contractors) applies
- **data-privacy/**: SAM registration involves disclosure of personal information subject to Privacy Act
- **small-business/**: Size standard determinations interact with set-aside eligibility; affiliation rules (SBA 13 CFR 121.103) affect size calculations

## Sources

- [SAM.gov Registration](https://sam.gov)
- [FAR Subpart 9.4 — Debarment, Suspension, and Ineligibility](https://www.acquisition.gov/far/subpart-9.4)
- [SBA Size Standards Table](https://www.sba.gov/federal-contracting/contracting-guide/size-standards)
- [OFCCP Compliance Assistance](https://www.dol.gov/agencies/ofccp/compliance-assistance)

---
## Far Dfar

# FAR & DFAR Key Clauses

## Applicability

Applies to all contracts subject to the Federal Acquisition Regulation (FAR, 48 CFR) and the Defense Federal Acquisition Regulation Supplement (DFARS). FAR governs civilian agency procurement; DFARS adds requirements for Department of Defense contracts.

## Key Requirements

### Commercial Item Exception (FAR Part 12)

- **What**: FAR 52.212 series streamlines procurement of commercial items and commercially available off-the-shelf (COTS) items
- **Threshold/Timeline**: Commercial item determination allows exemption from many FAR clauses; contractor must demonstrate item is sold in substantial quantities to the general public
- **Consequence**: Misrepresentation of commercial item status can trigger False Claims Act liability ($11,665-$23,331 per claim plus treble damages)

### IP and Data Rights (FAR 52.227)

- **What**: Government receives varying rights in technical data and computer software depending on funding source
- **Threshold/Timeline**: Unlimited rights (government-funded), limited rights (contractor-funded technical data), restricted rights (contractor-funded software), government purpose rights (mixed funding — converts to unlimited after 5 years)
- **Consequence**: Failure to properly mark deliverables with restrictive legends within 6 years results in government receiving unlimited rights by default

### Subcontracting (FAR 52.244)

- **What**: Consent to subcontract requirements, flowdown of mandatory clauses to subcontractors
- **Threshold/Timeline**: Prime contractors must flow down applicable FAR/DFARS clauses; consent required for cost-reimbursement, time-and-materials, and labor-hour subcontracts
- **Consequence**: Non-compliance risks contract termination for default; subcontractor violations imputed to prime

### Flowdown Requirements

- **What**: Certain FAR/DFARS clauses must be included in subcontracts at all tiers
- **Threshold/Timeline**: Mandatory flowdowns include Equal Opportunity (52.222-26), anti-trafficking (52.222-50), CUI protection (DFARS 252.204-7012), and Buy American (52.225-1)
- **Consequence**: Prime contractor liability for subcontractor non-compliance; government audit rights extend to subcontractor records

### Cost Accounting Standards (CAS)

- **What**: Standards governing measurement, assignment, and allocation of costs to government contracts
- **Threshold/Timeline**: Modified CAS coverage for contracts $7.5M+; full CAS coverage when contractor receives $50M+ in CAS-covered contracts in prior cost accounting period
- **Consequence**: CAS noncompliance requires cost impact statement; contractor pays interest on overpayments; potential contract price adjustment

### Truth in Negotiations Act (TINA)

- **What**: Requirement to submit certified cost or pricing data for negotiated contracts
- **Threshold/Timeline**: Required for contracts exceeding $2M (adjusted periodically for inflation); exemptions for adequate price competition, commercial items, prices set by law/regulation
- **Consequence**: Defective pricing entitles government to price reduction plus interest; potential False Claims Act liability for knowingly submitting defective data

### Changes Clause (FAR 52.243)

- **What**: Government's unilateral right to direct changes within the general scope of the contract
- **Threshold/Timeline**: Contractor must continue performance pending resolution of equitable adjustment; claim must be submitted within time specified (typically 30 days of change direction)
- **Consequence**: Failure to timely assert rights may result in waiver; constructive changes doctrine applies to informal government actions that increase cost/time

### Termination for Convenience (FAR 52.249)

- **What**: Government's right to terminate contract for any reason (unique to government contracts)
- **Threshold/Timeline**: Recovery limited to costs incurred, profit on work performed, and settlement expenses; no anticipatory profits on unperformed work
- **Consequence**: Contractor must submit settlement proposal within 1 year (fixed-price) or 120 days (cost-reimbursement)

## Interaction with Other Areas

- **ip-and-technology/**: FAR 52.227 data rights provisions may conflict with standard commercial IP terms; government rights always take precedence in government contracts
- **data-privacy/**: DFARS 252.204-7012 imposes specific cybersecurity requirements (NIST SP 800-171) for controlled unclassified information (CUI)
- **employment/**: Service Contract Act (FAR 52.222-41) and Davis-Bacon Act (FAR 52.222-6) impose wage/benefit requirements

## Sources

- [Federal Acquisition Regulation (FAR)](https://www.acquisition.gov/far)
- [Defense Federal Acquisition Regulation Supplement (DFARS)](https://www.acquisition.gov/dfars)
- [CAS Board Standards (48 CFR 9900)](https://www.ecfr.gov/current/title-48/chapter-99)

---
## Foia

# Freedom of Information Act (FOIA)

## Applicability

Applies when a federal agency receives a FOIA request for records that may contain contractor information, when submitting information to the government that may be subject to future FOIA disclosure, and when seeking government records related to procurement or regulatory matters. Also applies to state-level open records laws with analogous requirements.

## Key Requirements

### FOIA Framework (5 U.S.C. 552)

- **What**: Federal agencies must disclose records upon request unless a specific exemption applies; presumption of openness applies
- **Threshold/Timeline**: Agencies must respond within 20 business days of receipt; 10-day extension available for unusual circumstances (voluminous records, consultation needed, multiple offices); expedited processing available where compelling need demonstrated (threat to life/safety, urgency to inform public)
- **Consequence**: Failure to respond within statutory timeline constitutes constructive denial; requester may file suit in federal district court; court may award attorney fees and litigation costs to substantially prevailing plaintiff

### Nine Exemptions

- **What**: FOIA provides nine categories of information exempt from mandatory disclosure:
  - **Exemption 1**: Classified national security information
  - **Exemption 2**: Internal personnel rules and practices (narrowed by Milner v. Dep't of Navy, 2011)
  - **Exemption 3**: Information exempt by other statute (e.g., 26 USC tax returns, 50 USC intelligence sources)
  - **Exemption 4**: Confidential commercial information (trade secrets and confidential business information)
  - **Exemption 5**: Inter-agency/intra-agency deliberative process, attorney-client, attorney work product
  - **Exemption 6**: Personal privacy (personnel, medical files)
  - **Exemption 7**: Law enforcement records (7 sub-exemptions, 7A-7F)
  - **Exemption 8**: Financial institution examination records
  - **Exemption 9**: Geological/geophysical well data
- **Threshold/Timeline**: Agency must review each record; exemptions are discretionary (agency may release exempt material); foreseeable harm standard requires agency to demonstrate specific identifiable harm
- **Consequence**: Improper withholding subject to judicial review de novo; agency bears burden of justifying withholding; Vaughn index required to itemize withheld documents in litigation

### Exemption 4 — Confidential Business Information

- **What**: Post-Food Marketing Institute v. Argus Leader Media (2019), information is "confidential" if it is both customarily and actually treated as private by its owner; no longer requires showing of competitive harm
- **Threshold/Timeline**: Submitters should mark confidential information at time of submission; marking is relevant but not dispositive; government evaluates independently
- **Consequence**: Disclosure of genuinely confidential business information exposes agency to reverse FOIA suit (submitter sues to prevent disclosure); no monetary damages against government but injunctive relief available

### Submitter Notice (Executive Order 12600)

- **What**: Agencies must notify commercial submitters before disclosing their information under FOIA, giving opportunity to object
- **Threshold/Timeline**: Agency must provide reasonable notice (typically 10 business days) to submitter before release; submitter must articulate specific objections to disclosure
- **Consequence**: Failure to provide submitter notice is procedural violation; submitter may seek emergency TRO/injunction to prevent disclosure; pre-submission FOIA protective markings strengthen objection position

### Fee Categories

- **What**: FOIA establishes four requester categories determining applicable fees:
  - **Commercial use**: Search, review, and duplication fees
  - **Educational/scientific/news media**: Duplication fees only (first 100 pages free)
  - **All others**: Search and duplication fees (first 2 hours search and 100 pages free)
- **Threshold/Timeline**: Fee waiver available when disclosure is in the public interest (contributes significantly to public understanding of government operations); agencies may not charge fees if they fail to meet response deadlines
- **Consequence**: Improper fee categorization is challengeable; fee waiver denials are reviewable in FOIA litigation

### FOIA Litigation

- **What**: Requesters may file suit in U.S. District Court (any district where requester resides, has principal place of business, where records are situated, or D.C.) after exhausting administrative remedies
- **Threshold/Timeline**: Administrative exhaustion requires filing request and appeal (or constructive exhaustion if agency misses deadlines); no statute of limitations but laches defense available; court reviews de novo
- **Consequence**: Court may order disclosure, award attorney fees to substantially prevailing plaintiff, and impose sanctions for bad faith withholding; agency must produce Vaughn index justifying each withholding; in camera review available for sensitive records

### State Open Records Laws

- **What**: All 50 states have open records/public records laws with varying exemptions, timelines, and enforcement mechanisms; many parallel FOIA but with significant differences
- **Threshold/Timeline**: Response deadlines vary (e.g., Texas 10 business days, California 10 days, New York 5 business days); exemption frameworks differ substantially from federal FOIA
- **Consequence**: State-level penalties may include per-day fines, attorney fees, and personal liability for officials who improperly withhold records

## Interaction with Other Areas

- **data-privacy/**: FOIA Exemption 6 (personal privacy) and Privacy Act (5 U.S.C. 552a) interact — records about individuals may be withheld under both
- **ip-and-technology/**: Trade secrets submitted to government agencies should be marked as Exemption 4 confidential at time of submission
- **procurement/**: Unsuccessful offerors frequently use FOIA to obtain competitor proposal information and evaluation documents post-award

## Sources

- [5 U.S.C. 552 — Freedom of Information Act](https://www.law.cornell.edu/uscode/text/5/552)
- [DOJ Office of Information Policy — FOIA Guide](https://www.justice.gov/oip/foia-guide)
- [Food Marketing Institute v. Argus Leader Media, 588 U.S. 427 (2019)](https://supreme.justia.com/cases/federal/us/588/427/)

---
## Procurement

# Procurement Methods & Bid Protests

## Applicability

Applies when engaging in federal procurement processes, responding to solicitations, competing for government contracts, or challenging contract award decisions. Covers the full lifecycle from solicitation through award and protest.

## Key Requirements

### Sealed Bidding (FAR Part 14)

- **What**: Formal procurement method using invitation for bids (IFB); award to lowest responsive, responsible bidder
- **Threshold/Timeline**: Preferred method when requirements are clearly defined, more than one responsible bidder expected, adequate time for bid preparation, and price-only evaluation is appropriate
- **Consequence**: Contracting officer must reject all nonresponsive bids; no discussions permitted with bidders; award is mechanical (lowest price wins)

### Competitive Negotiation (FAR Part 15)

- **What**: Procurement via Request for Proposals (RFP) with evaluation of technical and price factors; allows discussions and best and final offers (BAFOs)
- **Threshold/Timeline**: Source selection may use tradeoff process (best value) or lowest price technically acceptable (LPTA); competitive range determined after initial evaluation
- **Consequence**: Agency must document source selection rationale; evaluation must follow stated criteria and relative weights in solicitation; improper evaluation is primary grounds for sustained protests

### Sole Source Justification

- **What**: Contract awarded without full and open competition; requires written Justification and Approval (J&A) per FAR 6.302
- **Threshold/Timeline**: J&A approval levels: contracting officer (up to $750K), competition advocate ($750K-$15M), head of procuring activity ($15M-$100M), senior procurement executive/designee ($100M+)
- **Consequence**: Unauthorized sole source awards are subject to protest; agency may be required to re-compete; potential procurement integrity violations

### GSA Schedule (Federal Supply Schedule)

- **What**: Pre-negotiated government-wide contracts (Multiple Award Schedule) administered by GSA; agencies issue task/delivery orders against established schedule contracts
- **Threshold/Timeline**: Schedule contract term is 20 years (5-year base + three 5-year options); orders under $250K follow modified competition procedures; orders $250K+ require formal competition among schedule holders
- **Consequence**: Pricing must be consistent with Most Favored Customer (MFC) disclosure; Price Reductions Clause requires notification of commercial price decreases; CSP (Commercial Sales Practices) misrepresentations trigger False Claims Act risk

### Task and Delivery Orders (IDIQ)

- **What**: Indefinite-delivery/indefinite-quantity contracts establishing ceiling for orders; minimum guaranteed amount must be obligated
- **Threshold/Timeline**: Fair opportunity required for orders over micro-purchase threshold ($10K); exceptions for urgency, unique capability, logical follow-on, or minimum guarantee; minimum order guarantee must be more than nominal
- **Consequence**: Task order protests to GAO permitted for orders exceeding $10M (civilian) or $25M (DoD); protests below thresholds limited to agency-level

### GAO Bid Protests

- **What**: Challenge to contract award or solicitation terms filed with the Government Accountability Office
- **Threshold/Timeline**: Filing deadline is 10 calendar days after debriefing (for award protests) or before bid/proposal due date (for solicitation challenges); GAO decision within 100 calendar days; automatic stay of performance (CICA stay) triggered upon timely filing
- **Consequence**: Sustain rate approximately 12-15%; remedies include re-evaluation, re-solicitation, award to protester; agency may override stay with urgent/compelling finding (D&F); attorney fees recoverable under EAJA if protest sustained

### Court of Federal Claims (COFC) Protests

- **What**: Pre-award and post-award bid protests filed in the U.S. Court of Federal Claims under 28 U.S.C. 1491(b)
- **Threshold/Timeline**: No automatic stay — must seek temporary restraining order (TRO) or preliminary injunction; statute of limitations mirrors Blue & Gold rule (must raise patent defects before bid/proposal due date)
- **Consequence**: Standard of review is arbitrary and capricious (APA standard); no dollar threshold limitation; more extensive discovery available than GAO; appeal to Federal Circuit

### Procurement Integrity (41 U.S.C. 2101-2107)

- **What**: Prohibitions on obtaining/disclosing contractor bid/proposal information and source selection information during procurement
- **Threshold/Timeline**: Restrictions apply from solicitation issuance through award; 1-year post-government employment ban on compensation from awarded contractor (for certain officials on contracts >$10M)
- **Consequence**: Criminal penalties up to 5 years and $250K fine; civil penalties up to $100K individual/$1M organizational; contract voidance or modification

## Interaction with Other Areas

- **small-business/**: Set-aside determinations affect procurement method; small business status protests follow separate SBA procedures
- **compliance-certifications/**: SAM registration and representations/certifications are prerequisites to award
- **foia/**: Unsuccessful offerors may FOIA debriefing materials and evaluation documents after award

## Sources

- [FAR Part 14 — Sealed Bidding](https://www.acquisition.gov/far/part-14)
- [FAR Part 15 — Contracting by Negotiation](https://www.acquisition.gov/far/part-15)
- [GAO Bid Protest Regulations (4 CFR Part 21)](https://www.ecfr.gov/current/title-4/chapter-I/subchapter-B/part-21)

---
## Small Business

# Small Business Programs

## Applicability

Applies when government contracts involve small business set-asides, subcontracting plan requirements, mentor-protege relationships, or size standard determinations. The Small Business Act (15 U.S.C. 631 et seq.) establishes preferences and programs to ensure small business participation in federal procurement.

## Key Requirements

### 8(a) Business Development Program

- **What**: SBA program for small businesses owned by socially and economically disadvantaged individuals; provides access to sole-source and competitive set-aside contracts
- **Threshold/Timeline**: 9-year program (4-year developmental stage + 5-year transitional stage); sole-source awards up to $4.5M for services and $7M for manufacturing (including options); competitive 8(a) set-aside required above these thresholds when 2+ eligible firms expected; participants must meet size standards and demonstrate economic disadvantage (personal net worth <$850K at entry, <$400K adjusted after initial eligibility period excluding primary residence and business equity)
- **Consequence**: Graduation or early termination for exceeding size standards, failure to meet business development goals, or material misrepresentation; 8(a) status reviews conducted annually; improper 8(a) certification may result in criminal penalties (15 U.S.C. 645 — up to $500K fine and 10 years imprisonment)

### HUBZone Program

- **What**: Historically Underutilized Business Zone program for small businesses maintaining principal office and 35% of employees in qualified HUBZone areas
- **Threshold/Timeline**: Sole-source up to $4.5M (services) / $7M (manufacturing); competitive set-aside when 2+ eligible HUBZone firms expected; 10% price evaluation preference in full and open competition; recertification required every 3 years and upon option exercise
- **Consequence**: Decertification for failure to maintain HUBZone requirements; attempted HUBZone fraud subject to False Claims Act penalties; HUBZone map updated periodically by SBA

### Service-Disabled Veteran-Owned Small Business (SDVOSB)

- **What**: Set-aside program for small businesses owned and controlled by service-disabled veterans (51%+ ownership and management/daily operations)
- **Threshold/Timeline**: Sole-source up to $4.5M (services) / $7M (manufacturing); competitive set-aside when 2+ eligible SDVOSB firms expected; SBA certification required (transferred from VA in 2023 per Veterans Small Business Enhancement Act)
- **Consequence**: Misrepresentation of SDVOSB status subject to False Claims Act; SBA protest and appeal process for status challenges; disability must be service-connected (VA rating)

### Women-Owned Small Business (WOSB/EDWOSB)

- **What**: Set-aside program for women-owned small businesses (WOSB) and economically disadvantaged women-owned small businesses (EDWOSB) in industries where women are underrepresented or substantially underrepresented
- **Threshold/Timeline**: WOSB sole-source up to $4.5M (services) / $7M (manufacturing) in underrepresented industries; EDWOSB eligible in both underrepresented and substantially underrepresented industries; 51%+ women ownership and control required; SBA certification required
- **Consequence**: WOSB status challenges follow SBA protest procedures; annual certification verification; industries eligible for set-asides identified by NAICS code in SBA regulations

### Mentor-Protege Programs

- **What**: SBA All Small Mentor-Protege program allows small businesses to form joint ventures with larger or more experienced mentors for set-aside contracts; DOD and agency-specific programs also exist
- **Threshold/Timeline**: Mentor-protege agreement approved by SBA for up to 6 years (two 3-year terms); joint venture can qualify as small for any set-aside where protege qualifies; protege may have up to 2 mentors; mentor may have up to 3 proteges
- **Consequence**: SBA-approved joint ventures receive size exclusion for mentor (evaluated based on protege size alone); non-compliance with agreement results in termination; misuse of mentor-protege relationship for pass-through may trigger affiliation findings

### Subcontracting Plans (FAR 19.7)

- **What**: Large business prime contractors must submit subcontracting plans establishing goals for small business subcontracting participation
- **Threshold/Timeline**: Required for contracts exceeding $750,000 ($1.5M for construction); must include percentage goals for small business, 8(a), HUBZone, SDVOSB, WOSB, and small disadvantaged business categories; individual plans (per contract) or commercial plans (company-wide) permitted
- **Consequence**: Failure to make good faith effort to comply with subcontracting plan subjects contractor to liquidated damages (actual dollar amount of shortfall from goal); plan compliance assessed through Individual Subcontract Reports (ISR) and Summary Subcontract Reports (SSR) in eSRS; repeated failures may affect contractor's past performance rating and responsibility determination

### Good Faith Effort Requirements

- **What**: Prime contractors must demonstrate genuine efforts to meet subcontracting goals, not merely set goals and ignore them
- **Threshold/Timeline**: Evidence includes: outreach to small businesses, attendance at matchmaking events, use of SBA's SUBNet, breaking out work into smaller lots, providing adequate time for small business proposals, maintaining records of subcontracting activities
- **Consequence**: Contracting officer may assess liquidated damages for plan shortfalls absent good faith evidence; pattern of failure affects past performance evaluations; willful manipulation of subcontracting data may trigger False Claims Act liability

### Size Protests and Appeals

- **What**: Any interested party may protest the small business size status of an apparent awardee for a set-aside contract
- **Threshold/Timeline**: Protest filed with SBA Area Office within 5 business days of notification of apparent successful offeror; SBA Area Office decision within 15 business days; appeal to SBA Office of Hearings and Appeals (OHA) within 15 calendar days of size determination
- **Consequence**: Adverse size determination makes firm ineligible for that specific procurement as a small business; does not affect other active contracts; SBA OHA decision is final unless appealed to federal court (rare); affiliation rules (SBA 13 CFR 121.103) may aggregate revenue/employees of affiliated entities

## Interaction with Other Areas

- **compliance-certifications/**: Size standards determined by NAICS code registered in SAM; false size representations trigger mandatory disclosure obligations
- **procurement/**: Set-aside determinations made by contracting officer in coordination with SBA PCR (Procurement Center Representative); rule of two analysis required
- **far-dfar/**: FAR 19.502 governs set-aside procedures; DFARS adds specific DoD small business provisions

## Sources

- [Small Business Act (15 U.S.C. 631 et seq.)](https://www.law.cornell.edu/uscode/text/15/chapter-14A)
- [SBA Size Standards (13 CFR Part 121)](https://www.ecfr.gov/current/title-13/chapter-I/part-121)
- [FAR Part 19 — Small Business Programs](https://www.acquisition.gov/far/part-19)
- [SBA Mentor-Protege Program](https://www.sba.gov/federal-contracting/contracting-assistance-programs/sba-mentor-protege-program)

---
## Sovereign Immunity

# Sovereign Immunity

## Applicability

Applies when considering claims against or involving federal, state, or tribal governments. The United States, state governments, and tribal nations enjoy sovereign immunity from suit unless immunity has been expressly waived. This file covers the primary waivers and their limitations.

## Key Requirements

### Tucker Act (28 U.S.C. 1491)

- **What**: Waiver of sovereign immunity for monetary claims against the United States founded upon the Constitution, federal statute, regulation, or contract (including government contracts)
- **Threshold/Timeline**: U.S. Court of Federal Claims has exclusive jurisdiction for claims exceeding $10,000; 6-year statute of limitations from date claim accrues; no jury trial available
- **Consequence**: Recovery limited to money damages; no equitable relief except incident to monetary award; CDA (Contract Disputes Act) claims must first be submitted to contracting officer with a final decision before Tucker Act jurisdiction attaches; interest runs from date of claim submission

### Little Tucker Act (28 U.S.C. 1346(a)(2))

- **What**: Concurrent jurisdiction in federal district courts for monetary claims against the United States not exceeding $10,000
- **Threshold/Timeline**: Same 6-year statute of limitations; plaintiff chooses between district court and Court of Federal Claims; election of forum is binding once judgment rendered
- **Consequence**: District court may award money damages only; claims above $10,000 must be filed in Court of Federal Claims; no splitting of claims to meet threshold

### Contract Disputes Act (CDA) (41 U.S.C. 7101-7109)

- **What**: Primary vehicle for resolving disputes arising under or relating to government contracts; establishes mandatory claims process
- **Threshold/Timeline**: Contractor must submit written claim to contracting officer; claims over $100,000 must be certified; contracting officer decision required within 60 days (or reasonable time for claims >$100K); appeal to Board of Contract Appeals within 90 days or Court of Federal Claims within 12 months of contracting officer final decision
- **Consequence**: CDA interest at Treasury rate from date of claim; equal access to justice for small businesses (EAJA); failure to appeal within statutory deadlines results in final and conclusive contracting officer decision; fraudulent claims subject to forfeiture and $10,000 per-claim penalty

### Federal Tort Claims Act (FTCA) (28 U.S.C. 2671-2680)

- **What**: Limited waiver of sovereign immunity for tort claims arising from negligent or wrongful acts of federal employees acting within scope of employment
- **Threshold/Timeline**: Administrative claim must be filed with responsible agency within 2 years of accrual; agency has 6 months to respond; suit in federal district court within 6 months of denial (or 6 months after deemed denial); no jury trial
- **Consequence**: Liability determined under law of state where act/omission occurred; no punitive damages; no pre-judgment interest; specific exceptions preserve immunity: discretionary function exception (most litigated), intentional torts (assault, battery — except for law enforcement), combatant activities, foreign country exception (Hernandez v. Mesa limited extraterritorial application)

### Eleventh Amendment — State Sovereign Immunity

- **What**: States are immune from suit in federal court by private parties (and in their own courts under Alden v. Maine) unless immunity is waived or validly abrogated
- **Threshold/Timeline**: Waiver must be express and unequivocal (Atascadero State Hospital v. Scanlon); Congress may abrogate under Section 5 of the Fourteenth Amendment (but not Article I — Seminole Tribe); Ex parte Young doctrine permits prospective injunctive relief against state officers in their official capacity
- **Consequence**: Eleventh Amendment bars retrospective monetary relief from state treasury; does not protect political subdivisions (counties, cities — Mt. Healthy); state agencies and arms of the state are protected (factors: state funding, state control, ability to bind state treasury)

### Tribal Sovereign Immunity

- **What**: Federally recognized tribes possess inherent sovereign immunity from suit as separate sovereigns, extending to tribal entities and enterprises
- **Threshold/Timeline**: Immunity applies in federal, state, and tribal courts; waiver must be express and unequivocal; tribal council resolution typically required; commercial activity does not waive immunity (Kiowa Tribe v. Manufacturing Technologies)
- **Consequence**: Tribal immunity extends to governmental and commercial activities; tribal officials may be sued under Ex parte Young analogy for prospective relief; tribal enterprises (e.g., casinos) share tribal immunity unless waived; contracting parties must negotiate express waivers and consent to jurisdiction

### Waiver Requirements

- **What**: Sovereign immunity waivers are strictly construed against the claimant; any ambiguity resolved in favor of the sovereign
- **Threshold/Timeline**: Federal waivers must be statutory and cannot be implied from conduct; state waivers must be express and unequivocal; tribal waivers require authorization from governing body; contractual dispute resolution clauses do not inherently waive immunity
- **Consequence**: Practitioners must identify specific statutory waiver before bringing claims; absence of waiver results in dismissal for lack of subject matter jurisdiction (not on merits); jurisdictional defect cannot be waived by government's litigation conduct

### Foreign Sovereign Immunities Act (FSIA) (28 U.S.C. 1602-1611)

- **What**: Exclusive basis for jurisdiction over foreign states and their instrumentalities in U.S. courts; codifies restrictive theory of immunity
- **Threshold/Timeline**: Commercial activity exception (most common) requires commercial activity with U.S. nexus; other exceptions include waiver, expropriation, noncommercial tort in U.S., terrorism
- **Consequence**: Foreign sovereign immune from punitive damages; execution against foreign state property is extremely limited; prejudgment attachment generally unavailable; terrorism exception permits broader remedies

## Interaction with Other Areas

- **procurement/**: Contract disputes follow CDA administrative process before Tucker Act litigation; bid protests have separate jurisdictional paths (GAO, COFC)
- **foia/**: Sovereign immunity does not bar FOIA requests; FOIA provides its own waiver for judicial review of agency withholding decisions
- **employment/**: Title VII expressly waives state sovereign immunity for employment discrimination; FLSA does not (Alden v. Maine)

## Sources

- [28 U.S.C. 1491 — Tucker Act](https://www.law.cornell.edu/uscode/text/28/1491)
- [28 U.S.C. 2671-2680 — Federal Tort Claims Act](https://www.law.cornell.edu/uscode/text/28/part-VI/chapter-171)
- [41 U.S.C. 7101-7109 — Contract Disputes Act](https://www.law.cornell.edu/uscode/text/41/subtitle-III/chapter-71)
