## Overview

# Litigation

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** litigation, lawsuit, complaint, summons, answer, counterclaim, cross-claim, motion, discovery, deposition, interrogatories, request for production, subpoena, subpoena duces tecum, trial, hearing, judgment, settlement, settlement agreement, release, dispute, claim, cause of action, damages, injunction, restraining order, TRO, preliminary injunction, arbitration, mediation, ADR, alternative dispute resolution, demand letter, cease and desist, notice of claim, pre-litigation, threat of suit, investigation, regulatory inquiry, CID, civil investigative demand, enforcement action, consent decree, consent order, class action, multidistrict litigation, MDL, appeal, post-judgment, litigation hold, document preservation, e-discovery, forensic, evidence, witness, expert witness, forum selection, jurisdiction, venue, statute of limitations, tolling, privilege, attorney-client privilege, work product, waiver, clawback, privilege log, spoliation, sanctions, proportionality, TAR, predictive coding, Wells notice, consent judgment, mass arbitration, class waiver, CAFA, ascertainability, certification

**Clause types:** dispute resolution clauses (arbitration, mediation, litigation), forum selection and venue provisions, choice of law provisions, jury trial waivers, class action waivers, limitation of liability provisions, indemnification and defense obligations, insurance coverage triggers, notice of claim provisions, statute of limitations contractual modifications, prevailing party attorney's fees provisions, liquidated damages clauses, limitation on remedies, release and settlement provisions, confidentiality of settlement, arbitration clause drafting, delegation clauses, mass arbitration protocols, compelled disclosure carve-outs in NDAs

**Regulatory references:** Federal Rules of Civil Procedure (FRCP), Federal Rules of Evidence (FRE), Federal Arbitration Act (FAA), state arbitration acts, Uniform Arbitration Act, state civil procedure rules, state evidence rules, CPLR (New York), CCP (California), JAMS rules, AAA rules, ICC rules, UNCITRAL rules, Class Action Fairness Act (CAFA), state class action statutes, Electronic Discovery Reference Model (EDRM), Federal Rule 37(e) (ESI spoliation), FRE 502 (privilege waiver), FRE 408 (settlement offers), New York Convention (foreign arbitral awards), Hague Evidence Convention

**Relationship patterns:** plaintiff/defendant, claimant/respondent (arbitration), company/regulator (enforcement), company/third party (pre-litigation dispute), insured/insurer (coverage dispute), indemnitor/indemnitee, client/outside counsel, class representative/class member, joint defense group members

## Sub-Files

- `demand-letters.md` — Pre-litigation demands, cease-and-desist communications, and statutory notice requirements. Load when: demand letters, cease-and-desist letters, notice-of-claim requirements, pre-suit negotiation, or statutory demand prerequisites are involved.
- `subpoenas.md` — Subpoena compliance, response, and objection. Load when: subpoenas (document or testimony), third-party discovery requests, CIDs, grand jury subpoenas, or compelled disclosure are received.
- `regulatory-inquiries.md` — Government investigations, regulatory examinations, and enforcement. Load when: government investigations, regulatory examinations, enforcement actions, consent decrees, Wells notices, voluntary disclosure, or agency inquiries are involved.
- `litigation-holds.md` — Document preservation and litigation holds. Load when: litigation is anticipated or pending, document preservation obligations arise, spoliation risk exists, or data retention policies need review.
- `e-discovery.md` — Electronic discovery, ESI production, and proportionality. Load when: e-discovery planning, meet-and-confer (FRCP 26(f)), TAR/predictive coding, privilege review in production, production format, cost allocation, or cross-border discovery issues arise.
- `settlement.md` — Settlement agreements, releases, and enforcement. Load when: settlement negotiations, release language, consent judgments, tax treatment of settlement proceeds, class action settlements, or FRE 408 protections are involved.
- `class-actions.md` — Class certification, CAFA, and class action waivers. Load when: class action lawsuits, class certification (FRCP 23), CAFA jurisdiction, MDL, mass arbitration, or class/collective action waiver enforceability are involved.
- `arbitration.md` — Arbitration agreements, proceedings, and enforcement. Load when: arbitration clause drafting, motions to compel, AAA/JAMS/ICC proceedings, class arbitration, unconscionability challenges, international arbitration, or confirmation/vacatur of awards are involved.
- `privilege.md` — Attorney-client privilege, work product, and waiver. Load when: privilege analysis, corporate privilege (Upjohn), work product doctrine, waiver (voluntary or inadvertent), FRE 502, crime-fraud exception, common interest doctrine, or in-house counsel dual-role issues arise.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- Document preservation obligations arise when litigation is reasonably anticipated, threatened, or pending; failure to preserve relevant documents can result in spoliation sanctions including adverse inference instructions (for intentional conduct under FRCP 37(e)(2)), curative measures, monetary sanctions, or default judgment.
- Subpoena compliance deadlines are court-ordered and must be met or formally challenged through a motion to quash or modify; ignoring a subpoena can result in contempt of court. Federal objections must be served within 14 days of service (FRCP 45(d)(2)(B)).
- Regulatory inquiry responses must comply with applicable statutory deadlines and procedures (SEC Wells: 30 days; FTC CID: typically 30-60 days); failure to respond can result in default findings, penalties, or adverse inferences.
- Statutes of limitations are jurisdictional and substantive; contractual provisions shortening limitation periods may be enforceable but cannot be assumed valid without jurisdiction-specific analysis.
- Privileged communications (attorney-client privilege, work product doctrine) must be actively protected during discovery; inadvertent disclosure may waive privilege absent FRE 502(b) protections (reasonable steps + prompt remedial action) or a FRE 502(d) court order.
- Settlement agreements releasing claims must satisfy specific requirements for certain claim types (ADEA/OWBPA for age discrimination, FLSA for wage claims, Title VII for discrimination claims). General releases must address California Civil Code 1542 and similar state statutes protecting unknown claims.
- Class action settlements require court approval under FRCP 23(e), including notice to the class and a fairness hearing; premature implementation is not permitted.
- Arbitration agreements are presumptively enforceable under the FAA; class action waivers in arbitration are enforceable (Epic Systems, Concepcion); but vacatur grounds are extremely narrow (FAA Section 10).
- The crime-fraud exception overrides both attorney-client privilege and work product protection for communications made in furtherance of ongoing or planned criminal or fraudulent activity.

---
## Arbitration

# Arbitration

## Applicability

Load when any matter involves arbitration agreements, arbitration clause drafting, motions to compel arbitration, arbitration proceedings (AAA, JAMS, ICC, UNCITRAL), class arbitration, unconscionability challenges, confirmation or vacatur of arbitration awards, or international commercial arbitration. Also load when evaluating dispute resolution clauses in contracts.

## Key Requirements

### Federal Arbitration Act (FAA) Framework

- **Strong federal policy favoring arbitration** / **Threshold**: FAA (9 U.S.C. 1-16) establishes that arbitration agreements "shall be valid, irrevocable, and enforceable" (Section 2) / **Consequence**: Courts must enforce arbitration agreements according to their terms; doubts resolved in favor of arbitration (*Moses H. Cone Memorial Hospital v. Mercury Construction*)
- **Commerce requirement** / **Threshold**: FAA applies to contracts "involving commerce" -- broadly interpreted to reach the full extent of Congress's Commerce Clause power / **Consequence**: Virtually all commercial contracts are covered; purely local transactions may fall outside FAA but are rare
- **Section 2 savings clause** / **Threshold**: Arbitration agreements are enforceable "save upon such grounds as exist at law or in equity for the revocation of any contract" / **Consequence**: General contract defenses (fraud, duress, unconscionability) may invalidate arbitration clauses, but defenses that target arbitration specifically are preempted (*Concepcion*)
- **Delegation clauses** / **Threshold**: Parties may delegate threshold arbitrability questions to the arbitrator ("who decides") by clear and unmistakable evidence / **Consequence**: Incorporation of AAA or JAMS rules that grant arbitrator jurisdiction over arbitrability constitutes delegation (*Henry Schein v. Archer & White Sales*)

### Major Arbitral Institutions and Rules

- **AAA (American Arbitration Association)**: Commercial Arbitration Rules (general commercial), Consumer Arbitration Rules (consumer contracts with $75K+ threshold for in-person hearing), Employment Arbitration Rules
- **JAMS**: Comprehensive Arbitration Rules; Streamlined Rules for claims under $250K; Employment Rules; known for retired judges as arbitrators
- **ICC (International Chamber of Commerce)**: Rules of Arbitration for international commercial disputes; ICC Court administers but does not decide; higher administrative fees
- **UNCITRAL**: Ad hoc arbitration rules (no administering institution); widely used in investor-state and international commercial arbitration; UNCITRAL Model Law adopted by 80+ jurisdictions

### Arbitration Clause Drafting

Essential elements for an enforceable, effective clause:
- **Scope**: Broad ("any dispute arising out of or relating to this agreement") vs. narrow (specific categories only)
- **Institution and rules**: Specify the administering institution and applicable rules (AAA Commercial, JAMS Comprehensive, ICC, etc.)
- **Seat/venue**: The legal "seat" determines the procedural law governing the arbitration and the courts with supervisory jurisdiction
- **Number of arbitrators**: One (faster, cheaper) vs. three (larger disputes, greater procedural protections); specify selection mechanism
- **Governing law**: Separate from the contract's governing law; the arbitration clause may be governed by different law (separability doctrine)
- **Discovery limitations**: Specify scope of pre-hearing discovery (document exchange only, limited depositions, etc.)
- **Confidentiality**: Arbitration is private but not automatically confidential; must include explicit confidentiality provision
- **Provisional relief**: Carve-out permitting parties to seek injunctive relief from courts without waiving right to arbitrate the merits
- **Appeal mechanism**: AAA Optional Appellate Rules or JAMS Optional Appeal procedure if parties want appellate review

### Class Arbitration

- **Epic Systems Corp. v. Lewis (2018)** / **Threshold**: Class and collective action waivers in employment arbitration agreements enforceable under FAA / **Consequence**: Individual arbitration can be required; NLRA Section 7 does not override FAA
- **AT&T Mobility v. Concepcion (2011)** / **Threshold**: FAA preempts state rules conditioning arbitration enforcement on class procedure availability / **Consequence**: State unconscionability doctrines cannot be used to invalidate class waivers in arbitration
- **Lamps Plus v. Varela (2019)** / **Threshold**: Ambiguous arbitration clauses cannot be construed to authorize class arbitration; consent to class arbitration must be clear / **Consequence**: Silence or ambiguity on class arbitration means individual arbitration only
- **Mass arbitration** / **Threshold**: When class waivers channel thousands of individual claims into separate arbitrations / **Consequence**: Companies face enormous filing fees ($1,500-$3,500 per case); mass arbitration has become a strategic tool for plaintiffs; new AAA mass arbitration procedures address fee and process issues

### Unconscionability Challenges

- **Two-part test**: Most states require both **procedural unconscionability** (unfairness in the formation -- take-it-or-leave-it, fine print, unequal bargaining power) AND **substantive unconscionability** (unfairness in the terms -- one-sided provisions, unreasonable limitations)
- **Sliding scale**: Many jurisdictions apply a sliding scale -- more of one type compensates for less of the other
- **Common substantive challenges**: One-sided arbitration obligations (only employee must arbitrate), excessive costs/fees imposed on consumer/employee, unreasonably short statutes of limitations, limitations on remedies or damages, overly restrictive discovery, biased arbitrator selection
- **Severing unconscionable terms** / **Threshold**: Courts may sever unconscionable provisions and enforce the remainder (unless permeated with unconscionability) / **Consequence**: Drafting tip: include severability clause; avoid multiple unconscionable terms that could lead to voiding the entire clause

### International Commercial Arbitration

- **New York Convention (1958)** / **Threshold**: Over 170 contracting states; requires courts to recognize and enforce foreign arbitral awards / **Consequence**: Foreign arbitral awards are enforceable in signatory states with very limited grounds for refusal (Article V)
- **UNCITRAL Model Law** / **Threshold**: Adopted by 80+ jurisdictions as basis for domestic arbitration statutes / **Consequence**: Provides uniform procedural framework; U.S. has not adopted the Model Law at federal level but several states have
- **ICC arbitration** / **Threshold**: ICC Rules require Terms of Reference (summary of claims and issues) and case management conference / **Consequence**: More structured process; ICC Court scrutinizes draft awards before issuance
- **Seat vs. venue** / **Threshold**: The "seat" (juridical seat) determines the procedural law and supervisory courts; "venue" is the physical location of hearings / **Consequence**: Seat selection is a critical strategic decision; hearings can occur anywhere regardless of seat
- **Enforcement**: Awards enforced under New York Convention (international) or FAA Chapter 2 (U.S.); grounds for refusal are narrow (due process violation, excess of authority, public policy)

### Confirmation and Vacatur (FAA Sections 9-11)

- **Confirmation (FAA Section 9)** / **Timeline**: Motion to confirm must be filed within **1 year** after award / **Consequence**: Court must confirm unless grounds for vacatur exist; confirmation converts award to enforceable judgment
- **Vacatur grounds (FAA Section 10)** / **Threshold**: (1) Award procured by corruption, fraud, or undue means; (2) evident partiality or corruption of arbitrators; (3) arbitrator misconduct (refusing to hear material evidence, other prejudicial conduct); (4) arbitrators exceeded their powers / **Consequence**: Grounds are extremely narrow; courts do not review the merits; "manifest disregard of the law" is debated post-*Hall Street Associates v. Mattel* (552 U.S. 576 (2008))
- **Modification (FAA Section 11)**: Court may modify or correct for evident material miscalculation, award on matters not submitted, or imperfect form not affecting merits
- **Judicial review expansion** / **Threshold**: *Hall Street* held that FAA Sections 10-11 provide the **exclusive** statutory grounds for vacatur; parties cannot contractually expand judicial review / **Consequence**: "Manifest disregard" may survive only as a judicial gloss on Section 10, not as an independent ground

### Cost Allocation in Arbitration

- **Consumer arbitration**: AAA Consumer Rules and JAMS Consumer Rules cap consumer's share of fees (AAA: filing fee only for claims under $75K; JAMS: $250 filing fee for claims under $250K)
- **Employment arbitration**: Employer typically must bear all unique costs of arbitration (*Green Tree Financial v. Randolph*, 531 U.S. 79 (2000) -- prohibitive cost may render agreement unenforceable)
- **Commercial arbitration**: Parties typically split filing fees and arbitrator compensation; prevailing party provisions may shift costs
- **Fee-splitting provisions** / **Threshold**: Provisions requiring consumers or employees to split arbitration costs may render agreement unconscionable or unenforceable / **Consequence**: Draft to comply with applicable consumer/employment arbitration rules

## Interaction with Other Areas

- **Litigation (Class Actions)**: Class waiver enforceability is the critical intersection; *Epic Systems*, *Concepcion*, *Lamps Plus*; see `class-actions.md`
- **Litigation (Settlement)**: Arbitration awards may be settled before, during, or after proceedings; settlement of arbitrated claims follows same principles
- **Litigation (Privilege)**: Attorney-client privilege and work product apply in arbitration; arbitral confidentiality provides additional protection
- **Employment**: Employment arbitration agreements subject to heightened scrutiny; EEOC retains independent enforcement authority regardless of arbitration agreement (*EEOC v. Waffle House*)
- **Consumer Protection**: Consumer arbitration clauses subject to AAA/JAMS consumer rules and unconscionability review
- **International Trade**: International arbitration clauses in cross-border contracts; New York Convention enforcement; seat selection and governing law

## Sources

- Federal Arbitration Act, 9 U.S.C. 1-16: https://www.law.cornell.edu/uscode/text/9/chapter-1
- *Hall Street Associates, L.L.C. v. Mattel, Inc.*, 552 U.S. 576 (2008): https://www.law.cornell.edu/supremecourt/text/06-989
- *Epic Systems Corp. v. Lewis*, 584 U.S. 497 (2018): https://www.law.cornell.edu/supremecourt/text/16-285
- New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards (1958): https://www.newyorkconvention.org
- AAA Rules and Procedures: https://www.adr.org/Rules
- UNCITRAL Model Law on International Commercial Arbitration: https://uncitral.un.org/en/texts/arbitration/modellaw/commercial_arbitration

---
## Class Actions

# Class Actions

## Applicability

Load when any matter involves class action lawsuits, class certification, class action waivers, multidistrict litigation (MDL), mass arbitration, Class Action Fairness Act (CAFA) jurisdiction, or collective actions. Also load when evaluating class action waiver provisions in consumer or employment contracts or assessing class certification risk.

## Key Requirements

### FRCP 23(a) Prerequisites

All four must be satisfied for class certification:

- **Numerosity (23(a)(1))** / **Threshold**: Class so numerous that joinder of all members is impracticable / **Consequence**: No hard numerical threshold; courts generally find numerosity at 40+ members, but context matters (*General Telephone Co. v. Falcon*)
- **Commonality (23(a)(2))** / **Threshold**: Questions of law or fact common to the class; post-*Wal-Mart v. Dukes* (564 U.S. 338, 2011), must demonstrate that common questions generate **common answers** apt to drive resolution / **Consequence**: Heightened standard after *Dukes*; individualized determinations on key issues defeat commonality
- **Typicality (23(a)(3))** / **Threshold**: Named plaintiffs' claims are typical of the class -- arising from the same course of conduct and based on the same legal theory / **Consequence**: Unique defenses against named plaintiff (e.g., statute of limitations, release) may defeat typicality
- **Adequacy (23(a)(4))** / **Threshold**: Named plaintiffs and class counsel will fairly and adequately protect class interests; no conflicts of interest / **Consequence**: Intra-class conflicts (e.g., present vs. future claimants) may defeat adequacy or require subclasses

### FRCP 23(b) Class Types

- **23(b)(1)**: Risk of inconsistent adjudications or adjudications that would impair others' interests (limited fund)
- **23(b)(2)**: Defendant acted on grounds generally applicable to the class, making injunctive or declaratory relief appropriate for the class as a whole (civil rights, employment discrimination)
- **23(b)(3) (most common for damages)** / **Threshold**: Common questions **predominate** over individual questions AND class action is **superior** to other methods of adjudication / **Consequence**: Must satisfy both predominance and superiority; this is the most contested class type

### Certification Standards

- **Predominance** / **Threshold**: Common issues must predominate over individual issues; damages can be common-issue if measurable on a class-wide basis (*Comcast Corp. v. Behrend*, 569 U.S. 27 (2013)) / **Consequence**: Individual damages calculations do not necessarily defeat predominance, but individual liability questions typically do
- **Wal-Mart v. Dukes standard** / **Threshold**: Rigorous analysis required at certification; court must resolve factual disputes relevant to certification even if they overlap with the merits / **Consequence**: Certification denied for 1.5 million Wal-Mart employees due to lack of common policy producing common injury
- **Ascertainability (circuit split)** / **Threshold**: Third Circuit requires administratively feasible mechanism to identify class members (*Byrd v. Aaron's Inc.*); other circuits (Second, Sixth, Seventh, Ninth) reject a heightened ascertainability requirement / **Consequence**: In Third Circuit, claims with no reliable records identifying class members (e.g., retail purchasers without receipts) face certification barriers
- **Expert evidence at certification**: *Daubert* analysis applies to expert evidence offered to support or oppose certification (*In re Hydrogen Peroxide*, 3d Cir.)

### Class Action Fairness Act (CAFA)

- **Federal jurisdiction** / **Threshold**: Amount in controversy exceeds **$5 million** (aggregated across all class members) + **minimal diversity** (any class member diverse from any defendant) + class of **100+ members** / **Consequence**: Defendant may remove to federal court; eliminates home-state plaintiff advantage
- **Local controversy exception** / **Threshold**: Court must decline jurisdiction if more than two-thirds of class members and primary defendants are citizens of the forum state / **Consequence**: True local disputes remain in state court
- **Home-state exception** / **Threshold**: Court must decline jurisdiction if two-thirds or more of class members are citizens of the forum state and primary defendants are also citizens / **Consequence**: Similar to local controversy; protects genuinely local class actions
- **Removal timing** / **Threshold**: 30 days after receipt of initial pleading or amended pleading that reveals CAFA jurisdiction; no 1-year cap on CAFA removal / **Consequence**: CAFA cases can be removed even years into state court litigation

### Arbitration Class Waivers

- **Epic Systems Corp. v. Lewis (584 U.S. 497, 2018)** / **Threshold**: Class action waivers in employment arbitration agreements are enforceable under the FAA; NLRA does not override FAA / **Consequence**: Employers may require individual arbitration, foreclosing class and collective actions
- **AT&T Mobility v. Concepcion (563 U.S. 333, 2011)** / **Threshold**: FAA preempts state laws that condition arbitration enforcement on availability of class procedures / **Consequence**: California's *Discover Bank* rule (unconscionability of class waivers) preempted; class waiver in consumer arbitration agreements enforceable
- **Exceptions**: PAGA claims in California may not be waivable (*Viking River Cruises v. Moriana*, 596 U.S. 639 (2022) -- partially; individual PAGA claims must be arbitrated but non-individual claims status is evolving under state law); SEC anti-waiver provision (Securities Act Section 14, Exchange Act Section 29(a)) may limit waivers in securities context
- **Mass arbitration risk** / **Threshold**: When class waivers push thousands of individual claims into arbitration, companies face massive filing fees (AAA: $1,500-$2,200 per consumer case) / **Consequence**: Mass arbitration can cost defendants more than class litigation; drafting must account for this risk

### Multidistrict Litigation (MDL)

- **28 U.S.C. 1407** / **Threshold**: Civil actions involving common questions of fact pending in different districts may be transferred to a single district for coordinated pretrial proceedings / **Consequence**: JPML transfers for pretrial only; cases remanded for trial (though most settle during MDL)
- **Bellwether trials**: MDL courts select representative cases for trial to establish settlement value and test legal theories
- **MDL vs. class action**: MDL consolidates individual cases; no class certification required; each plaintiff retains individual claims but coordinated discovery and pretrial

## Interaction with Other Areas

- **Litigation (Settlement)**: Class settlements require FRCP 23(e) approval, notice to class, and fairness hearing; see `settlement.md`
- **Litigation (E-Discovery)**: Class actions generate massive e-discovery obligations; proportionality particularly important
- **Litigation (Arbitration)**: Class waiver enforceability (*Epic Systems*, *Concepcion*) is the critical intersection; see `arbitration.md`
- **Consumer Protection**: Consumer class actions frequently arise under state UDAP statutes, TCPA, FCRA, and FDCPA
- **Employment**: Wage-and-hour collective actions under FLSA 216(b) use opt-in (not opt-out) mechanism; distinct from Rule 23 class actions
- **Data Privacy**: Data breach class actions face Article III standing challenges (*TransUnion v. Ramirez*, 594 U.S. 413 (2021) -- concrete harm required)

## Sources

- Federal Rules of Civil Procedure, Rule 23: https://www.law.cornell.edu/rules/frcp/rule_23
- Class Action Fairness Act, 28 U.S.C. 1332(d): https://www.law.cornell.edu/uscode/text/28/1332
- *Wal-Mart Stores, Inc. v. Dukes*, 564 U.S. 338 (2011): https://www.law.cornell.edu/supremecourt/text/10-277
- *Epic Systems Corp. v. Lewis*, 584 U.S. 497 (2018): https://www.law.cornell.edu/supremecourt/text/16-285
- *AT&T Mobility LLC v. Concepcion*, 563 U.S. 333 (2011): https://www.law.cornell.edu/supremecourt/text/09-893
- 28 U.S.C. 1407 (MDL): https://www.law.cornell.edu/uscode/text/28/1407

---
## Demand Letters

# Demand Letters and Pre-Litigation Communications

## Applicability

Load when any matter involves demand letters, cease-and-desist communications, pre-suit notice requirements, notice-of-claim obligations, or pre-litigation negotiation strategy. Also load when evaluating contractual notice-of-claim provisions or statutory demand prerequisites.

## Key Requirements

### Purpose and Strategic Function

Demand letters serve multiple litigation and business purposes:
- **Preserve claims**: Satisfy statutory pre-suit notice requirements that are conditions precedent to filing
- **Trigger obligations**: Put the recipient on formal notice, starting contractual and statutory clocks
- **Create the record**: Establish a contemporaneous written record of the dispute, demand, and refusal
- **Test the case**: Gauge the opposing party's position and defenses before committing to litigation
- **Support fee-shifting**: In jurisdictions with offer-of-judgment rules or fee-shifting statutes, a rejected reasonable demand can support attorney's fees recovery

### Required Elements by Type

- **General civil demand** / Elements: factual basis, legal theory, specific relief sought, response deadline (typically 10-30 days), reservation of rights / **Consequence**: Omitting required elements may fail to satisfy pre-suit notice requirements
- **Cease-and-desist (IP)** / Elements: identification of rights (registration numbers, dates), specific infringing activity, demand to cease and destroy, deadline / **Consequence**: Overly aggressive letters may create declaratory judgment jurisdiction in recipient's forum (*SanDisk Corp. v. STMicroelectronics*)
- **Government tort claim** / **Timeline**: Federal Tort Claims Act requires administrative claim within 2 years of accrual; agency has 6 months to respond / **Consequence**: Failure to file timely administrative claim bars suit entirely (28 U.S.C. 2675)
- **UCC breach of warranty** / **Timeline**: Buyer must notify seller of breach within a reasonable time after discovery (UCC 2-607(3)(a)) / **Consequence**: Failure to provide timely notice bars all remedies for breach
- **Insurance proof of loss** / **Timeline**: Policy-specific, typically 60-90 days after loss / **Consequence**: Late notice may void coverage depending on jurisdiction (notice-prejudice vs. strict compliance states)

### Statutory Demand Requirements

- **California Rosenthal Fair Debt Collection Practices Act (Cal. Civ. Code 1788-1788.33)** / **Threshold**: Applies to consumer debt collection by original creditors (broader than FDCPA) / **Consequence**: Statutory damages of $100-$1,000 per violation plus actual damages and attorney's fees
- **Fair Debt Collection Practices Act (15 U.S.C. 1692)** / **Threshold**: Initial communication must include 30-day validation notice with amount of debt, creditor name, and dispute rights / **Consequence**: Statutory damages up to $1,000 per action, class damages to $500,000, plus attorney's fees
- **Massachusetts Chapter 93A** / **Threshold**: 30-day demand letter required before filing consumer protection suit; must describe unfair act and injury / **Consequence**: Failure to send 30-day demand letter bars treble damages
- **Construction defect statutes** / **Threshold**: Many states (e.g., California SB 800, Texas RCLA) require pre-suit notice with opportunity to inspect and repair / **Consequence**: Failure to comply may bar or limit recovery

### Response Timelines

- **Standard contractual demand** / **Timeline**: 10-30 days (as specified in contract or letter) / **Consequence**: Expiration without response supports filing
- **FTCA administrative claim** / **Timeline**: 6 months for agency to respond before suit is permitted / **Consequence**: Premature filing subject to dismissal
- **FDCPA validation** / **Timeline**: Consumer has 30 days to dispute; collector must cease collection during verification / **Consequence**: Continuing collection during dispute period violates FDCPA
- **State consumer protection** / **Timeline**: 30 days typical (MA 93A, others vary) / **Consequence**: Reasonable offer during cure period may limit damages

### Tone, Strategy, and Ethics

- Demand letters must comply with Rules of Professional Conduct (particularly Rule 4.1 truthfulness, Rule 8.4 misconduct)
- **Prohibited**: Threatening criminal prosecution to gain advantage in a civil matter (violates ethics rules in most jurisdictions)
- **Prohibited**: Misrepresenting facts or legal authority in demand communications
- Settlement demand letters are generally protected by FRE 408 (offers to compromise), but the demand letter itself may not be if it contains factual admissions independent of the offer
- Statements in demand letters can constitute party admissions under FRE 801(d)(2) if not carefully drafted

### Preservation of Privilege

- Demand letters sent to opposing parties are not privileged communications (they are disclosed to adversaries)
- Internal strategy memoranda analyzing whether and how to send a demand letter are protected work product
- Draft demand letters shared only with the client are privileged; once sent, the sent version is not
- Include explicit reservation-of-rights language: "Nothing in this letter shall be construed as a waiver of any rights, claims, or defenses"

## Interaction with Other Areas

- **Litigation (Litigation Holds)**: Sending or receiving a demand letter may trigger preservation obligations when litigation becomes reasonably anticipated
- **Litigation (Privilege)**: Internal analysis of demand strategy is protected work product; sent letters are not privileged
- **IP and Technology**: Cease-and-desist letters for patent infringement require particular care to avoid creating DJ jurisdiction; *MedImmune v. Genentech* lowered the threshold for DJ standing
- **Employment**: EEOC charge filing is a prerequisite to Title VII claims (180/300 days); demand letters do not substitute for charge filing
- **Consumer Protection**: State-specific pre-suit demand requirements (MA 93A, CA Rosenthal) are mandatory conditions precedent
- **Insurance**: Demand letters received should be promptly tendered to applicable insurance carriers; late tender may prejudice coverage

## Sources

- Federal Rules of Evidence, Rule 408 (compromise offers and negotiations): https://www.law.cornell.edu/rules/fre/rule_408
- Federal Tort Claims Act, 28 U.S.C. 2675: https://www.law.cornell.edu/uscode/text/28/2675
- Fair Debt Collection Practices Act, 15 U.S.C. 1692: https://www.law.cornell.edu/uscode/text/15/chapter-41/subchapter-V
- UCC 2-607 (buyer's notice of breach): https://www.law.cornell.edu/ucc/2/2-607
- ABA Model Rules of Professional Conduct, Rule 4.1: https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_4_1_truthfulness_in_statements_to_others/

---
## E Discovery

# E-Discovery

## Applicability

Load when any matter involves electronic discovery, ESI production, discovery planning, meet-and-confer obligations, technology-assisted review, predictive coding, privilege review in document production, production format disputes, cross-border discovery, or proportionality analysis. Also load when evaluating data retention, legal hold technology, or cloud service agreements that must support e-discovery.

## Key Requirements

### FRCP 26(f) Meet-and-Confer

- **Timing** / **Threshold**: Parties must confer at least 21 days before the scheduling conference or scheduling order deadline (FRCP 26(f)(1)) / **Consequence**: Failure to participate in good faith may result in sanctions and waiver of objections to discovery plan
- **Required topics**: Preservation obligations, ESI sources and formats, search methodology, privilege review protocol, production format (native vs. TIFF/PDF), cost allocation, phased discovery plan, clawback agreement
- **Discovery plan**: Must be submitted to the court within 14 days after the Rule 26(f) conference (FRCP 26(f)(2))
- **Early attention to ESI**: Courts increasingly expect parties to address ESI issues at the earliest stage; failure to raise format or scope issues early may constitute waiver

### Proportionality (FRCP 26(b)(1))

The 2015 amendments elevated proportionality to a central discovery principle. Discovery must be:

- **Relevant to any party's claim or defense** AND **proportional to the needs of the case**
- **Six proportionality factors**: (1) importance of the issues at stake, (2) amount in controversy, (3) parties' relative access to relevant information, (4) parties' resources, (5) importance of discovery in resolving the issues, (6) whether burden or expense outweighs likely benefit
- **Burden of proof** / **Threshold**: Requesting party must show relevance; producing party must show disproportionate burden with specificity / **Consequence**: Conclusory assertions of burden are insufficient (*Eramo v. Rolling Stone*, E.D. Va. 2016)
- **Not a shield for large parties**: The "parties' resources" factor does not automatically excuse wealthy parties from broad discovery; it cuts both ways

### Technology-Assisted Review (TAR) and Predictive Coding

- **Court acceptance** / **Threshold**: TAR accepted as a reasonable and defensible review methodology since *Da Silva Moore v. Publicis Groupe* (S.D.N.Y. 2012) / **Consequence**: Parties cannot be forced to use TAR but courts increasingly endorse it as proportional to manual review
- **Rio Tinto standard** / **Threshold**: *Rio Tinto PLC v. Vale S.A.* (S.D.N.Y. 2015) -- court held requesting party could not dictate producing party's review methodology as long as results are defensible / **Consequence**: Producing party has discretion to choose TAR workflow; transparency about methodology and validation may be required
- **Validation**: Courts expect statistical validation of TAR results (recall and precision metrics); seed set disclosure may be required in TAR 1.0 (but not TAR 2.0 continuous active learning)
- **Quality control**: Random sampling of non-responsive set to validate recall; document quality control (QC) protocols should be documented

### Privilege Review and Logs (FRCP 26(b)(5))

- **Privilege log requirement** / **Threshold**: Party withholding documents on privilege grounds must describe them sufficiently to enable assessment without revealing privileged content (FRCP 26(b)(5)(A)) / **Consequence**: Failure to produce timely, adequate privilege log may result in waiver (*Burlington Northern*)
- **Log elements**: Date, author, all recipients, general subject matter, privilege asserted (attorney-client, work product, or both)
- **Categorical logs**: Courts increasingly permit categorical logging for voluminous privilege withholdings (grouping similar communications)
- **FRE 502(d) orders**: Stipulated or court-ordered protection against inadvertent privilege waiver; should be sought at the outset of every case -- provides case-specific and cross-case protection
- **Clawback agreements** / **Threshold**: FRE 502(b) provides default inadvertent waiver analysis (reasonable steps + prompt remedial action); FRE 502(d) court order provides stronger protection / **Consequence**: Without 502(d) order, inadvertent production may waive privilege if reasonable steps were not taken

### Production Format

- **Native format**: Preserves metadata, functionality, and formatting; preferred for spreadsheets, databases, and complex ESI
- **TIFF/PDF with load files**: Industry standard for document review platforms; Bates-stamped; extracted text and metadata in load files (.dat)
- **Default rule** / **Threshold**: FRCP 34(b)(2)(E) -- if no format specified, produce in form ordinarily maintained or reasonably usable form / **Consequence**: Producing in deliberately degraded format (e.g., non-searchable TIFF without OCR) may warrant re-production order
- **Reasonably usable**: Must include searchable text (OCR or extracted), relevant metadata, and sufficient information to identify the document
- **De-duplication**: Global or custodian-level de-duplication is standard practice; methodology should be disclosed

### Cost Allocation

- **Presumptive rule**: Producing party bears its own costs of production (unless cost-shifting is warranted)
- **Cost-shifting factors** (*Zubulake I*, 217 F.R.D. 309): (1) extent to which request is tailored, (2) availability from other sources, (3) cost of production, (4) ability to pay, (5) importance to the issues, (6) relative benefit, (7) total cost relative to amount in controversy
- **Third-party production**: Issuing party presumptively bears non-party's significant production costs (FRCP 45(d))
- **Proportionality-based allocation**: Post-2015 amendments, courts use Rule 26(b)(1) proportionality factors to assess cost-shifting

### FRCP 37(e) Safe Harbor

- **Safe harbor for routine operations**: FRCP 37(e) addresses only ESI lost when a party "failed to take reasonable steps to preserve"; if reasonable steps were taken, no sanctions even if some ESI is lost
- **Reasonable steps standard**: Issuing a litigation hold, identifying key custodians, suspending auto-deletion, collecting or preserving in place; perfection is not required
- See `litigation-holds.md` for detailed sanctions framework

### International Cross-Border Discovery

- **GDPR conflict** / **Threshold**: EU data protection law restricts transfer of personal data outside the EU/EEA; U.S. discovery requests may conflict with GDPR / **Consequence**: Producing party must implement safeguards (SCCs, anonymization, pseudonymization); *Aerotel v. Huawei* and similar cases address the tension
- **Hague Evidence Convention** / **Threshold**: Some countries (notably France, Germany, China) have blocking statutes that prohibit direct discovery compliance; Hague Convention letters rogatory may be required / **Consequence**: Courts balance comity against domestic litigation needs (*Societe Nationale Industrielle Aerospatiale v. U.S. District Court*, 482 U.S. 522 (1987))
- **French Blocking Statute (Loi de Blocage)** / **Threshold**: Prohibits production of documents located in France for use in foreign proceedings without government authorization / **Consequence**: Fines and criminal penalties; U.S. courts have generally held it does not bar discovery but weigh it as a comity factor
- **Data localization**: Some jurisdictions require data to remain in-country; discovery compliance may require in-country review with only responsive, non-personal data exported

## Interaction with Other Areas

- **Litigation (Litigation Holds)**: Preservation is the first phase of EDRM; preservation failures undermine the entire e-discovery process
- **Litigation (Privilege)**: FRE 502(d) orders, clawback agreements, and privilege logging are integral to e-discovery
- **Litigation (Subpoenas)**: Third-party subpoenas for ESI trigger e-discovery obligations and cost-shifting analysis
- **Data Privacy**: GDPR cross-border discovery conflicts require transfer mechanism analysis; anonymization and pseudonymization as mitigation
- **IP and Technology**: Source code discovery requires special protocols (clean room, outside-counsel-eyes-only, limited-access provisions)

## Sources

- Federal Rules of Civil Procedure, Rule 26: https://www.law.cornell.edu/rules/frcp/rule_26
- Federal Rules of Civil Procedure, Rule 34: https://www.law.cornell.edu/rules/frcp/rule_34
- Federal Rules of Evidence, Rule 502: https://www.law.cornell.edu/rules/fre/rule_502
- *Da Silva Moore v. Publicis Groupe*, 287 F.R.D. 182 (S.D.N.Y. 2012): TAR approval
- *Societe Nationale Industrielle Aerospatiale v. U.S. District Court*, 482 U.S. 522 (1987): https://www.law.cornell.edu/supremecourt/text/482/522
- The Sedona Conference, Principles for Electronic Document Production (Third Edition): https://thesedonaconference.org

---
## Litigation Holds

# Litigation Holds and Document Preservation

## Applicability

Load when litigation is anticipated, threatened, or pending; when document preservation obligations arise; when e-discovery issues are involved; when evaluating spoliation risk; or when reviewing data retention policies in light of litigation. Also load when negotiating cloud service, SaaS, or vendor agreements that must support legal hold functionality.

## Key Requirements

### Trigger: Reasonable Anticipation of Litigation

The duty to preserve arises when litigation is "reasonably anticipated" -- not merely when a complaint is filed. This is the critical threshold.

- **Demand letter received or sent** / **Threshold**: Litigation is reasonably foreseeable when a specific claim is asserted / **Consequence**: Duty to preserve attaches immediately upon receipt or sending
- **Complaint filed** / **Threshold**: Duty unambiguously attaches / **Consequence**: Failure to issue hold promptly is per se unreasonable
- **Government investigation** / **Threshold**: Receipt of CID, subpoena, or regulatory inquiry / **Consequence**: Preservation duty covers scope of inquiry plus reasonably related materials
- **Internal discovery of wrongdoing** / **Threshold**: When a reasonable party would anticipate litigation from the discovered facts / **Consequence**: Pre-suit destruction after this point constitutes spoliation
- **Media reports or whistleblower complaints** / **Threshold**: When reports suggest claims likely to be asserted / **Consequence**: Courts look at the totality of circumstances; subjective awareness plus objective reasonableness

### Zubulake Duties

The *Zubulake v. UBS Warburg* line of decisions (S.D.N.Y. 2003-2004) established the foundational framework:

- **Zubulake IV (220 F.R.D. 212)**: Counsel must issue written litigation hold, communicate directly with key custodians, ensure preservation of relevant documents
- **Zubulake V (229 F.R.D. 422)**: Counsel has affirmative duty to monitor compliance with litigation hold; periodic reminders required; counsel must become familiar with client's document retention practices and data systems
- **Ongoing obligation**: Litigation hold is not "set and forget" -- requires active monitoring, periodic reissuance, and updating as issues and custodians evolve

### Scope of Preservation

- **Custodians**: All individuals likely to possess relevant information -- current and former employees, executives, board members, contractors, relevant third parties
- **Data sources**: Email, text messages, chat/Slack/Teams messages, documents (paper and electronic), databases, cloud storage (Google Drive, Dropbox, OneDrive, SharePoint), CRM systems, financial systems, HR systems, engineering repositories (Git, JIRA), social media, voicemail, metadata
- **Timeframe**: Relevant time period for the claims plus reasonable buffer; preservation scope should be defined and documented
- **Ephemeral messaging** / **Threshold**: Signal, disappearing messages, auto-delete features / **Consequence**: Failure to disable auto-delete for relevant custodians is a preservation failure; *WeChat* and similar platforms increasingly scrutinized
- **Backup tapes** / **Threshold**: Generally not required to preserve unless they are the only source of relevant information (*Zubulake I*) / **Consequence**: Routine recycling of backup tapes may continue if information is preserved from accessible sources

### Implementation Steps

1. **Identify and document**: Identify the matter, potential claims, relevant time period, key custodians, and relevant data sources
2. **Issue written hold notice**: Direct custodians to preserve all potentially relevant information; describe what must be preserved; instruct suspension of auto-delete policies; provide contact for questions
3. **Suspend routine destruction**: Disable auto-delete on email, messaging, and document management systems for affected custodians
4. **Interview key custodians**: Understand their data practices, devices, storage locations, and any unique data sources
5. **Collect or preserve in place**: Either collect copies of relevant data or implement technical holds (in-place preservation via eDiscovery platforms)
6. **Confirm receipt and compliance**: Obtain acknowledgments from all custodians; follow up on non-responses
7. **Monitor and reissue**: Send periodic reminders (quarterly minimum); update hold as new custodians or issues are identified; document all compliance monitoring

### Technology Systems

- **Legal hold platforms**: Relativity Legal Hold, Exterro, Zapproved, Hanzo -- automate notice, acknowledgment tracking, and reminders
- **In-place preservation**: Microsoft Purview (Office 365), Google Vault, Slack Enterprise Grid legal hold -- preserve data without collection
- **BYOD challenges**: Personal devices used for work may contain relevant data; must balance preservation with employee privacy; MDM solutions may enable targeted preservation
- **Cloud providers**: SaaS agreements must include legal hold support, data export capabilities, and cooperation provisions

### FRCP 37(e) Sanctions Framework

- **Threshold requirement**: ESI that should have been preserved in anticipation of litigation was lost because a party failed to take reasonable steps to preserve it
- **Curative measures (37(e)(1))** / **Threshold**: ESI lost, cannot be restored or replaced, and another party is prejudiced / **Consequence**: Court may order measures "no greater than necessary to cure the prejudice" -- additional discovery, cost-shifting, jury instructions on the loss (but NOT adverse inference under (e)(1))
- **Severe sanctions (37(e)(2))** / **Threshold**: Party acted with **intent to deprive** another party of the ESI / **Consequence**: Court may (A) presume lost information was unfavorable, (B) instruct jury it may or must presume unfavorable, or (C) dismiss action or enter default judgment
- **Key distinction**: Negligent failure triggers only curative measures; intentional destruction triggers severe sanctions including adverse inference -- *GN Netcom v. Plantronics* (D. Del. 2016) is leading post-amendment case
- **State law variation**: Many states have not adopted the 2015 federal amendments; some states still apply inherent authority sanctions for negligent spoliation; jurisdiction-specific analysis required

### Hold Release

- Litigation holds should be formally released when the matter concludes (settlement, judgment, expiration of appeals period)
- Document the release decision and communicate to all custodians
- Resume normal retention/destruction policies for the affected data
- Retained collections should be disposed of in accordance with retention policy unless needed for other matters

## Interaction with Other Areas

- **Litigation (Subpoenas)**: Receipt of a subpoena triggers immediate preservation for all materials within scope
- **Litigation (Regulatory Inquiries)**: Regulatory investigations trigger preservation obligations; scope defined by the inquiry
- **Litigation (Demand Letters)**: Sending or receiving a demand letter may trigger duty to preserve when litigation becomes reasonably foreseeable
- **Litigation (E-Discovery)**: Litigation hold is the first step in the EDRM; preservation failures cascade into e-discovery sanctions
- **Data Privacy**: Litigation hold obligations override routine deletion but create tension with GDPR right to erasure and CCPA deletion rights; legal hold takes priority but requires documented justification
- **IP and Technology**: SaaS and cloud providers must support legal hold functionality; technology agreements should address preservation cooperation
- **Employment**: Departing employees require exit preservation procedures; devices and accounts must be preserved before deprovisioning

## Sources

- Federal Rules of Civil Procedure, Rule 37(e): https://www.law.cornell.edu/rules/frcp/rule_37
- *Zubulake v. UBS Warburg LLC*, 220 F.R.D. 212 (S.D.N.Y. 2003): foundational litigation hold duties
- *Zubulake v. UBS Warburg LLC*, 229 F.R.D. 422 (S.D.N.Y. 2004): counsel's affirmative monitoring obligations
- The Sedona Conference, Commentary on Legal Holds (2019): https://thesedonaconference.org/publication/Commentary_on_Legal_Holds
- *GN Netcom, Inc. v. Plantronics, Inc.*, 2016 WL 3792833 (D. Del. 2016): leading 37(e) intent analysis

---
## Privilege

# Privilege

## Applicability

Load when any matter involves attorney-client privilege, work product doctrine, privilege review, privilege logs, inadvertent disclosure, waiver analysis, crime-fraud exception, common interest doctrine, joint defense agreements, in-house counsel dual-role issues, or FRE 502 protections. Also load when structuring communications to preserve privilege or evaluating clawback provisions.

## Key Requirements

### Attorney-Client Privilege Elements

The attorney-client privilege protects confidential communications between a client and an attorney made for the purpose of obtaining or providing legal advice. All elements must be present:

- **Attorney-client relationship** / **Threshold**: Communication must be with a licensed attorney (or agent of the attorney) acting in a legal capacity / **Consequence**: Communications with attorneys acting in business (not legal) capacity are not privileged
- **Communication** / **Threshold**: Oral or written communication (including electronic) between attorney and client / **Consequence**: Underlying facts are never privileged -- only the communication itself; client cannot shield facts by communicating them to counsel
- **Confidentiality** / **Threshold**: Communication must be made in confidence and kept confidential; presence of third parties (other than agents necessary to facilitate communication) destroys privilege / **Consequence**: Copying non-essential third parties on attorney communications waives privilege for that communication
- **Purpose of obtaining legal advice** / **Threshold**: The dominant purpose of the communication must be seeking or providing legal advice (not business advice) / **Consequence**: Mixed-purpose communications are evaluated under the "primary purpose" test in most circuits; *In re Kellogg Brown & Root* (D.C. Cir. 2014) applied a "significant purpose" test (more protective)

### Corporate Attorney-Client Privilege (Upjohn)

- **Upjohn Co. v. United States (449 U.S. 383, 1981)** / **Threshold**: Privilege extends to communications between corporate counsel and **any employee** (not just the "control group") when: (1) communication was made at the direction of corporate superiors, (2) for the purpose of obtaining legal advice for the corporation, (3) concerning matters within the employee's corporate duties / **Consequence**: Rejected the narrow "control group" test; all employee communications with counsel for legal purposes are potentially privileged
- **The privilege belongs to the corporation**, not to the individual employee; corporation can waive privilege over employee communications
- **Former employees**: Communications with former employees about matters during their employment may be privileged (circuit split; *Peralta v. Cendant Corp.* supports coverage)
- **Subsidiaries and affiliates**: Privilege may extend to communications with counsel for parent/affiliated entities when a reasonable expectation of common legal interest exists

### Work Product Doctrine (FRCP 26(b)(3))

- **Ordinary work product** / **Threshold**: Documents and tangible things prepared **in anticipation of litigation** by or for a party or its representative / **Consequence**: Discoverable only upon showing of **substantial need** and inability to obtain the substantial equivalent without **undue hardship**
- **Opinion work product** / **Threshold**: Mental impressions, conclusions, opinions, or legal theories of an attorney / **Consequence**: Virtually **absolute protection** -- discoverable only in extraordinary circumstances (rare); some courts say never discoverable
- **"In anticipation of litigation" test** / **Threshold**: Document must be prepared "because of" existing or expected litigation (*United States v. Adlman*, 2d Cir. 1998 -- "because of" test predominates over the narrower "primary purpose" test) / **Consequence**: Documents prepared in the ordinary course of business are not work product even if litigation is ongoing
- **Who can create work product**: Not limited to attorneys; includes work product prepared by consultants, investigators, and other agents acting at the direction of counsel in anticipation of litigation
- **Dual-purpose documents**: Documents serving both litigation and business purposes are analyzed under the jurisdiction's applicable test ("because of" vs. "primary motivating purpose")

### Waiver of Privilege

- **Voluntary disclosure** / **Threshold**: Intentional disclosure to a third party outside the privilege waives the privilege for the disclosed communication / **Consequence**: Waiver may extend to the **subject matter** of the disclosure (subject matter waiver), not just the specific document disclosed
- **Inadvertent disclosure (FRE 502(b))** / **Threshold**: Inadvertent disclosure does **not** waive privilege if: (1) disclosure was inadvertent, (2) holder took **reasonable steps** to prevent disclosure, and (3) holder took **prompt remedial measures** (including invoking FRE 502(b)) / **Consequence**: Reasonable steps include privilege review, quality control, and use of technology tools; prompt remedial measures include immediate notification and request for return/destruction
- **FRE 502(d) court orders** / **Threshold**: Court order that privilege is not waived by disclosure in the litigation / **Consequence**: Provides the strongest protection -- binds all persons and entities (including non-parties) and is effective in other federal and state proceedings; should be sought in **every** case involving substantial document production
- **FRE 502(e) party agreements** / **Threshold**: Parties may agree that disclosure does not waive privilege / **Consequence**: Binds the parties to the agreement but does **not** bind third parties (unlike a 502(d) order); less protective than a court order
- **Selective waiver** / **Threshold**: Disclosing privileged material to a government agency while claiming privilege against private parties / **Consequence**: Not recognized in most circuits (only 8th Circuit); disclosure to SEC/DOJ likely waives privilege as to all parties in most jurisdictions

### Crime-Fraud Exception

- **Standard** / **Threshold**: Privilege does not protect communications made in furtherance of a crime, fraud, or other misconduct (past crimes are protected; ongoing/future crimes are not) / **Consequence**: Court conducts in camera review; if crime-fraud exception applies, the communications are fully discoverable
- **Prima facie showing** / **Threshold**: Party seeking to invoke exception must make a prima facie showing that (1) the client was engaged in or planning criminal or fraudulent activity, and (2) the communications were in furtherance of that activity (*Clark v. United States*; *In re Grand Jury Subpoena*) / **Consequence**: Low threshold -- does not require proof of actual crime; reasonable basis to believe is sufficient
- **Scope**: Exception applies to both attorney-client privilege and work product doctrine; strips protection from all communications furthering the misconduct

### Common Interest Doctrine

- **Standard** / **Threshold**: Allows parties with a common legal interest to share privileged communications without waiving privilege; requires (1) common legal interest (not just commercial interest), (2) communications made in furtherance of the common legal interest, (3) confidentiality maintained within the group / **Consequence**: Shared communications remain privileged as to outsiders
- **Joint defense agreements**: Formalize common interest arrangements; specify scope, participants, and procedures for sharing; recommended but not always required
- **Litigation vs. transactional context**: Some circuits limit common interest doctrine to litigation contexts (*In re Santa Fe International*); others extend to transactional contexts (trend is toward expansion)
- **Withdrawal**: When common interest ends, parties retain privilege over their own communications but may not use communications received from former allies

### In-House Counsel Dual Role

- **Kellogg Brown & Root (D.C. Cir. 2014)** / **Threshold**: In-house counsel often serve dual business and legal functions; communications are privileged when a **significant purpose** is obtaining or providing legal advice / **Consequence**: More protective than "primary purpose" test; but communications that are purely business are not privileged regardless of the sender being in-house counsel
- **Business vs. legal advice** / **Threshold**: Advice on business strategy, commercial terms, or operational decisions is not privileged even from in-house counsel / **Consequence**: In-house lawyers must clearly distinguish legal advice from business advice; best practice is to label legal advice communications and limit distribution
- **Investigation context**: When in-house counsel conducts internal investigations, communications are privileged if investigation is conducted for legal (not business) purposes; document the legal purpose clearly at the outset (Upjohn warning to employees)
- **European limitations**: EU and some other jurisdictions do not extend privilege to in-house counsel (*Akzo Nobel v. Commission*, CJEU 2010); in-house communications may not be privileged in EU competition proceedings

## Interaction with Other Areas

- **Litigation (E-Discovery)**: Privilege review and FRE 502 protections are core e-discovery concerns; see `e-discovery.md` for privilege log requirements and clawback mechanisms
- **Litigation (Regulatory Inquiries)**: Upjohn protections, selective waiver risks, and DOJ privilege policy govern regulatory investigation privilege strategy; see `regulatory-inquiries.md`
- **Litigation (Subpoenas)**: Privilege is the primary basis for withholding documents in response to subpoenas; privilege logs required for all withholdings
- **Litigation (Settlement)**: FRE 408 (settlement privilege) is distinct from attorney-client privilege but provides parallel protection for negotiation communications
- **Data Privacy**: Engagement of outside counsel for data breach response helps establish privilege over investigation findings (*In re Capital One Data Breach Litigation* -- privilege denied where report was for business purposes)
- **Employment**: Upjohn warnings to employees in internal investigations; employee's right to personal counsel; clarifying that corporate counsel represents the entity, not the individual

## Sources

- Federal Rules of Evidence, Rule 502: https://www.law.cornell.edu/rules/fre/rule_502
- Federal Rules of Civil Procedure, Rule 26(b)(3) (work product): https://www.law.cornell.edu/rules/frcp/rule_26
- *Upjohn Co. v. United States*, 449 U.S. 383 (1981): https://www.law.cornell.edu/supremecourt/text/449/383
- *In re Kellogg Brown & Root, Inc.*, 756 F.3d 754 (D.C. Cir. 2014): "significant purpose" test for in-house counsel
- *United States v. Adlman*, 134 F.3d 1194 (2d Cir. 1998): "because of" test for work product
- Restatement (Third) of the Law Governing Lawyers, Sections 68-93 (privilege): https://www.law.cornell.edu

---
## Regulatory Inquiries

# Regulatory Inquiries and Government Investigations

## Applicability

Load when any matter involves government investigations, regulatory examinations, enforcement actions, consent decrees, agency subpoenas or CIDs, Wells notices, voluntary self-disclosure, cooperation agreements, or parallel proceedings (civil/criminal/regulatory). Also load when evaluating regulatory cooperation provisions in contracts or D&O/regulatory liability insurance coverage.

## Key Requirements

### Types of Regulatory Proceedings

- **Informal inquiries**: Voluntary information requests, interview requests, informal examinations; nominally voluntary but non-cooperation typically escalates to formal process
- **Civil Investigative Demands (CIDs)**: Formal compulsory process from FTC, DOJ (Antitrust Division), CFPB, state AGs; require document production, interrogatory answers, or oral testimony under oath
- **Formal investigations/subpoenas**: SEC formal orders of investigation, IRS summonses, CFTC subpoenas, EPA information requests (CERCLA 104(e)), agency-specific compulsory process
- **Regulatory examinations**: Scheduled or for-cause examinations by banking regulators (OCC, FDIC, Fed), SEC (registered entities), FINRA, state insurance departments
- **Enforcement actions**: Administrative proceedings, civil actions filed in court, cease-and-desist orders, referrals to DOJ for criminal prosecution

### Agency-Specific Timelines

- **SEC Wells process** / **Timeline**: After staff completes investigation, issues Wells notice; target has **30 days** to submit Wells submission arguing against enforcement / **Consequence**: Failure to submit Wells response waives opportunity to persuade staff before Commissioners vote on enforcement action
- **DOJ Corporate Enforcement Policy** / **Timeline**: Voluntary self-disclosure should occur "reasonably promptly" after discovery; no fixed deadline but delay undermines credit / **Consequence**: Timely voluntary disclosure with full cooperation can result in declination of prosecution
- **FTC CIDs** / **Timeline**: Typically 30-60 days to comply; 20 days to file petition to quash with the FTC / **Consequence**: Failure to comply may result in FTC enforcement action in federal court; court may impose civil penalties up to $50,120/day
- **CFPB CIDs** / **Timeline**: Compliance deadline set in CID (typically 30-45 days); petition to modify or set aside within 20 days of service / **Consequence**: Non-compliance may result in enforcement petition in federal district court
- **State AG investigations** / **Timeline**: Varies by state; typically 30-60 days for document requests / **Consequence**: Non-compliance may result in civil contempt, penalties, or escalation to enforcement action

### Cooperation vs. Adversarial Strategy

**Cooperation benefits** (when appropriate):
- DOJ: Presumption of declination under Corporate Enforcement Policy for voluntary self-disclosure + full cooperation + timely remediation
- SEC: Cooperation credit may reduce sanctions; Seaboard Report (Release No. 34-44969) framework evaluates self-policing, self-reporting, remediation, cooperation
- DPAs and NPAs: Available only when company demonstrates genuine cooperation
- Reduced monitoring obligations and penalty amounts

**Adversarial posture** (when appropriate):
- When Fifth Amendment concerns exist for individuals
- When parallel criminal investigation creates self-incrimination risk
- When the agency's legal theory is legally unsupported
- When cooperation would require waiver of privilege with no commensurate benefit

### Privilege Considerations

- **Upjohn Co. v. United States (449 U.S. 383, 1981)** / **Threshold**: Attorney-client privilege in corporate context extends to communications between counsel and all employees (not just "control group") when made for purpose of obtaining legal advice / **Consequence**: Properly protected Upjohn communications are immune from compelled disclosure
- **Selective waiver** / **Threshold**: Disclosing privileged material to a government agency may waive privilege as to all other parties; selective waiver recognized in very few circuits (8th Circuit only, *Diversified Industries*) / **Consequence**: Disclosure to SEC/DOJ likely waives privilege in subsequent private litigation in most jurisdictions
- **DOJ policy (revised)** / **Threshold**: DOJ policy states it will not request privilege waiver as a condition of cooperation credit / **Consequence**: Companies can cooperate by disclosing facts without disclosing privileged communications, but the line between facts and privileged communications requires careful management

### Parallel Proceedings

- Regulatory investigations may run simultaneously with criminal investigations (DOJ), private civil litigation, and multi-agency investigations
- **Stay of civil proceedings**: Courts may stay civil discovery pending resolution of parallel criminal investigation to protect Fifth Amendment rights (*SEC v. Dresser Industries*)
- **Cross-agency information sharing**: Agencies share information under MOUs; information provided to one agency may reach another
- **Strategic sequencing**: Statements to one agency may be used by another; coordinate across all proceedings before making any disclosure

### Voluntary Disclosure and Self-Reporting

- **Mandatory self-reporting**: Some regimes require it (e.g., OFAC sanctions violations, SOX Section 302 certifications, banking SARs)
- **Voluntary self-reporting programs**: DOJ Corporate Enforcement Policy, SEC cooperation framework, FCPA Pilot Program (now permanent), antitrust leniency program (first-in-the-door immunity)
- **Cost-benefit analysis**: Weigh potential benefits (declination, reduced penalties) against risks (creating a roadmap for enforcement, waiving privilege, private litigation exposure)

### Consent Decrees and Consent Orders

- **Enforcement** / **Threshold**: Consent decrees are judicially enforceable; consent orders are agency-enforceable / **Consequence**: Violation triggers contempt (consent decree) or additional penalties and enhanced enforcement (consent order)
- **Duration** / **Threshold**: Typically 5-20 years; some are indefinite / **Consequence**: Long-tail compliance obligations affecting business operations and M&A transactions
- **Ongoing obligations**: Compliance programs, independent monitors, periodic reporting, audit rights, injunctive terms
- **Successors and assigns**: Consent decree obligations typically bind successors; must be analyzed in M&A due diligence

## Interaction with Other Areas

- **Litigation (Litigation Holds)**: Any regulatory inquiry triggers immediate document preservation obligations
- **Litigation (Subpoenas)**: CIDs and regulatory subpoenas follow agency-specific procedural rules distinct from FRCP 45
- **Litigation (Privilege)**: Upjohn protections, selective waiver risks, and DOJ privilege policy must be managed throughout
- **Consumer Protection**: FTC and state AG consumer protection investigations typically begin as CIDs before escalating to enforcement
- **Financial Services**: Banking regulatory examinations are ongoing compliance obligations; examination findings can escalate to enforcement
- **Data Privacy**: Data protection authority investigations (GDPR supervisory authorities, FTC privacy enforcement) follow sector-specific frameworks
- **Antitrust**: DOJ Antitrust Division and FTC competition investigations use CIDs; leniency program offers first-in immunity
- **Securities**: SEC investigations follow formal order process, Wells procedure, and administrative/civil enforcement pathways

## Sources

- SEC Seaboard Report, Release No. 34-44969 (cooperation framework): https://www.sec.gov/litigation/investreport/34-44969.htm
- DOJ Corporate Enforcement Policy (Justice Manual 9-47.120): https://www.justice.gov/jm/jm-9-47000-corporate-fraud
- *Upjohn Co. v. United States*, 449 U.S. 383 (1981): https://www.law.cornell.edu/supremecourt/text/449/383
- FTC Act Section 20 (CID authority): https://www.law.cornell.edu/uscode/text/15/57b-1
- Federal Rules of Criminal Procedure, Rule 6(e) (grand jury secrecy): https://www.law.cornell.edu/rules/frcrmp/rule_6

---
## Settlement

# Settlement

## Applicability

Load when any matter involves settlement negotiations, release agreements, settlement agreements, consent judgments, structured settlements, class action settlements, mediation, or compromise of claims. Also load when evaluating FRE 408 protections, tax treatment of settlement proceeds, or confidentiality provisions in settlement agreements.

## Key Requirements

### Settlement Authority

- **Corporate authority** / **Threshold**: Verify that the individual negotiating has actual authority to bind the entity; board or committee approval may be required for material settlements / **Consequence**: Settlement agreement may be voidable if signed without proper corporate authority
- **Insurance carrier consent** / **Threshold**: Most liability policies require insurer consent to settle; settlement without consent may void coverage / **Consequence**: Insurer may deny coverage for settlement made without its approval (consent-to-settle clause)
- **Government settlements** / **Threshold**: Settlement with government entities may require specific approvals (DOJ approval for federal claims, legislative approval for some state/municipal settlements exceeding statutory thresholds) / **Consequence**: Agreement is not binding until required governmental approval is obtained

### Release Language

- **General release** / **Threshold**: Releases all claims -- known and unknown -- between the parties arising from the subject matter / **Consequence**: Bars all future claims including those not yet discovered; extremely broad
- **Specific/limited release** / **Threshold**: Releases only specifically identified claims or categories of claims / **Consequence**: Unreleased claims survive; preferred when settling less than all disputes
- **California Civil Code Section 1542** / **Threshold**: California law provides that a general release does not extend to claims unknown at the time of execution; parties must **expressly waive** Section 1542 for a general release to be effective / **Consequence**: Failure to include a 1542 waiver in California settlements may render the general release ineffective as to unknown claims
- **Similar statutes**: Multiple states have similar protections (e.g., South Dakota, Montana, North Dakota); conduct jurisdiction-specific analysis
- **Mutual vs. one-way release**: Evaluate whether both parties release claims or only the claimant; mutual releases are standard in negotiated settlements
- **Carve-outs**: Standard carve-outs include obligations arising under the settlement agreement itself, indemnification obligations, and any ongoing contractual obligations that survive

### Confidentiality

- **Confidentiality provisions** / **Threshold**: Most commercial settlements include confidentiality clauses restricting disclosure of terms and existence / **Consequence**: Breach may trigger liquidated damages or clawback of settlement consideration
- **Limitations on confidentiality**: Cannot prevent disclosure required by law, regulation, or court order; SEC whistleblower rules (Rule 21F-17) prohibit agreements that impede reporting to the SEC; EEOC guidance discourages confidentiality in harassment/discrimination settlements
- **Public interest exception**: Courts may refuse to seal settlement agreements involving public safety or government entities
- **Tax reporting**: Settlement amounts must be reported to the IRS regardless of confidentiality provisions (Forms 1099, W-2)

### Enforcement Mechanisms

- **Consent judgment** / **Threshold**: Settlement incorporated into a court order or judgment / **Consequence**: Enforceable through contempt proceedings; provides immediate enforcement mechanism without new lawsuit
- **Contract enforcement** / **Threshold**: Settlement agreement as a private contract / **Consequence**: Breach requires new lawsuit for enforcement; subject to contract defenses
- **Stipulated dismissal with right to reopen** / **Threshold**: Court retains jurisdiction to enforce settlement terms / **Consequence**: Non-compliance allows motion to reopen and enforce; courts typically retain jurisdiction for 60-90 days or as specified
- **Prevailing party provisions**: Include attorney's fees and costs provision for enforcement of settlement terms

### Tax Treatment of Settlement Proceeds

- **Physical injury/sickness (IRC 104(a)(2))** / **Threshold**: Damages received on account of **personal physical injuries or physical sickness** / **Consequence**: Excludable from gross income (not taxable) -- but only the compensatory portion; punitive damages are always taxable
- **Emotional distress** / **Threshold**: Damages for emotional distress **not** attributable to physical injury or sickness / **Consequence**: Taxable as ordinary income; medical expenses for emotional distress may be excluded
- **Lost wages/profits** / **Threshold**: Back pay, front pay, lost profits / **Consequence**: Taxable as ordinary income; subject to employment taxes if wages (FICA)
- **Interest** / **Threshold**: Pre-judgment and post-judgment interest / **Consequence**: Always taxable as ordinary income regardless of underlying claim type
- **Punitive damages** / **Threshold**: Any punitive damages component / **Consequence**: Always taxable as ordinary income (*O'Gilvie v. United States*, 519 U.S. 79 (1996))
- **Allocation in settlement agreement**: The allocation of settlement proceeds among claim types in the agreement is the starting point for tax analysis but is not binding on the IRS if it lacks economic substance (*Robinson v. Commissioner*)

### Class Action Settlement (FRCP 23(e))

- **Court approval required** / **Threshold**: Settlement of a certified class action requires court approval under FRCP 23(e) / **Consequence**: Settlement is not effective until the court grants final approval; premature implementation is reversible
- **Preliminary approval**: Court reviews whether the settlement is within the range of possible approval; grants preliminary approval and orders notice to class
- **Notice to class members** / **Threshold**: Must provide "the best notice that is practicable under the circumstances" (FRCP 23(c)(2)(B)) / **Consequence**: Inadequate notice may invalidate settlement; must include opt-out rights, objection procedures, hearing date
- **Fairness hearing** / **Threshold**: Court evaluates whether settlement is "fair, reasonable, and adequate" (FRCP 23(e)(2)) / **Consequence**: Factors include adequacy of representation, arm's-length negotiation, relief adequacy, equitable treatment of class members
- **Objectors and opt-outs**: Class members may object to the settlement or opt out; significant opt-out rates may allow defendant to void the settlement
- **Attorney's fees**: Must be approved by court; typically 25-33% of common fund or reasonable lodestar with multiplier

### FRE 408 Protection

- **Scope** / **Threshold**: Offers to compromise, acceptance of offers, and conduct or statements made during compromise negotiations regarding a disputed claim / **Consequence**: Inadmissible to prove or disprove the validity or amount of a disputed claim or to impeach by prior inconsistent statement
- **Limitations**: FRE 408 does not exclude evidence offered for other purposes (proving bias, negating a contention of undue delay, or proving an effort to obstruct criminal investigation)
- **Pre-dispute communications**: FRE 408 applies only when there is a "disputed claim" -- pre-dispute statements may not be protected
- **State variations**: Some states have narrower or broader protections than FRE 408; California Evidence Code 1152 covers offers and similar broader protections

## Interaction with Other Areas

- **Litigation (Privilege)**: Settlement negotiation communications are protected by FRE 408 but may be discoverable for non-liability purposes; mediation communications have additional protections
- **Litigation (Class Actions)**: Class settlements require FRCP 23(e) approval process with notice and fairness hearing
- **Employment**: ADEA/OWBPA settlements require specific knowing-and-voluntary waiver provisions (21-day consideration, 7-day revocation); FLSA settlements require DOJ or court approval; Title VII settlements have EEOC notice requirements
- **Data Privacy**: Settlement of data breach claims may require notification to regulators and affected individuals; settlement terms must not conflict with ongoing compliance obligations
- **Consumer Protection**: FTC and state AG settlements often take the form of consent decrees with ongoing compliance obligations and monitoring
- **Insurance**: Carriers must consent to settlement; settlement triggers coverage obligations and may affect future premiums

## Sources

- Federal Rules of Evidence, Rule 408: https://www.law.cornell.edu/rules/fre/rule_408
- Federal Rules of Civil Procedure, Rule 23(e): https://www.law.cornell.edu/rules/frcp/rule_23
- Internal Revenue Code, Section 104(a)(2): https://www.law.cornell.edu/uscode/text/26/104
- California Civil Code Section 1542: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1542&lawCode=CIV
- *O'Gilvie v. United States*, 519 U.S. 79 (1996): https://www.law.cornell.edu/supremecourt/text/519/79

---
## Subpoenas

# Subpoenas

## Applicability

Load when any matter involves subpoenas (document or testimony), third-party discovery requests, civil investigative demands (CIDs), grand jury subpoenas, administrative subpoenas, or compelled disclosure in any proceeding. Also load when drafting subpoena compliance provisions in contracts or evaluating compelled-disclosure carve-outs in NDAs.

## Key Requirements

### Types of Subpoenas

- **Subpoena ad testificandum**: Compels testimony at deposition, hearing, or trial
- **Subpoena duces tecum**: Compels production of documents, ESI, or tangible things
- **Combined subpoena**: Testimony and document production together
- **Administrative subpoena**: Issued by federal agencies (SEC, FTC, IRS, OSHA) under statutory authority without court involvement
- **Civil Investigative Demand (CID)**: Agency-specific compulsory process (FTC Act 20, DOJ Antitrust CIDs, CFPB CIDs) — functionally equivalent to subpoenas but with distinct procedural rules
- **Grand jury subpoena**: Criminal process; secrecy obligations under Fed. R. Crim. P. 6(e); recipient generally may disclose receipt unless under sealing order

### FRCP Rule 45 Framework (Federal)

- **Issuance** / **Requirement**: Any party may issue; must be from the court where the action is pending or where compliance is required / **Consequence**: Subpoena from wrong court is defective
- **Service** / **Requirement**: May be served anywhere in the United States (FRCP 45(b)(2)); personal service required for testimony / **Consequence**: Defective service is grounds for non-compliance
- **100-mile rule** / **Threshold**: Testimony subpoena cannot compel attendance more than 100 miles from where the person resides, is employed, or regularly transacts business (FRCP 45(c)(1)) / **Consequence**: Subpoena subject to quashal; does not apply to party witnesses (party must attend trial anywhere in district)
- **14-day objection window** / **Timeline**: Written objections must be served before the earlier of compliance date or 14 days after service (FRCP 45(d)(2)(B)) / **Consequence**: Failure to timely object may waive objections (though courts have discretion)
- **Motion to quash or modify** / **Timeline**: Must be filed "timely" (before compliance date); filed in the court where compliance is required / **Consequence**: Failure to move to quash while also failing to comply risks contempt

### Objection Grounds

- Undue burden or expense (FRCP 45(d)(3)(A)(iv))
- Privilege: attorney-client, work product, trade secrets
- Overbreadth or lack of relevance
- Improper service or jurisdictional defect
- Compliance requires disclosure of unretained expert opinion (FRCP 45(d)(3)(B)(ii))
- Conflict with existing protective order

### Privilege Logs

- **Requirement**: Documents withheld on privilege grounds must be identified in a privilege log sufficient to enable the requesting party to assess the claim (FRCP 45(e)(2))
- **Elements**: Date, author, all recipients, subject matter description (without revealing privileged content), privilege asserted
- **Timeline**: Must be produced within a reasonable time; courts increasingly require categorical logs for voluminous withholdings
- **Consequence**: Failure to produce a timely, adequate privilege log may result in waiver of privilege (*Burlington Northern v. U.S. District Court*)

### Cost-Shifting

- **FRCP 45(d)(1)** / **Threshold**: Party issuing subpoena to non-party must take reasonable steps to avoid undue burden or expense / **Consequence**: Court must enforce this duty and may impose sanctions
- **Non-party cost recovery** / **Threshold**: Non-parties are entitled to recover "significant expense" of compliance (FRCP 45(d)(2)(B)(ii)) / **Consequence**: Issuing party may be required to bear reasonable costs of collection, review, and production
- **Commercial data** / **Threshold**: When subpoena seeks confidential commercial information, court may require the requesting party to compensate the producing party / **Consequence**: Courts have broad discretion on cost allocation

### Third-Party Compliance Obligations

- Non-parties must comply with properly served subpoenas but are entitled to heightened protection from burden
- Non-parties should notify affected customers/clients when subpoenaed for their records (unless prohibited by court order, gag order, or statute)
- Non-parties may not be held in contempt without opportunity to be heard
- Service providers receiving subpoenas for customer data should review terms of service, applicable privacy laws, and Stored Communications Act (18 U.S.C. 2701) restrictions

### Criminal and Grand Jury Subpoenas

- Grand jury subpoenas carry secrecy obligations (Fed. R. Crim. P. 6(e)) — witnesses generally not bound unless under specific order
- Fifth Amendment privilege against self-incrimination applies to testimony (not document production by entities — *Braswell v. United States*)
- Negotiation of scope is possible but requires experienced criminal counsel
- Non-compliance may result in contempt and incarceration

## Interaction with Other Areas

- **Litigation (Litigation Holds)**: Receipt of a subpoena triggers immediate preservation obligations for all potentially responsive materials
- **Litigation (Privilege)**: Privilege review and logging are mandatory before any production; FRE 502(d) orders should be sought proactively
- **Litigation (E-Discovery)**: Large-scale document subpoenas require e-discovery protocols (search terms, date ranges, custodians, format)
- **Data Privacy**: Subpoenas for personal data may conflict with GDPR, CCPA, or sector-specific privacy laws; cross-border discovery requires Hague Convention or MLAT analysis
- **IP and Technology (Trade Secrets)**: Trade secrets produced under subpoena must be protected by stipulated protective order to maintain trade secret status under DTSA/UTSA
- **Employment**: Employee records subpoenaed require review for state employee privacy protections
- **Insurance**: Subpoenas received in insured matters should be tendered to carriers with notice of potential defense obligations

## Sources

- Federal Rules of Civil Procedure, Rule 45: https://www.law.cornell.edu/rules/frcp/rule_45
- Federal Rules of Criminal Procedure, Rule 6(e): https://www.law.cornell.edu/rules/frcrmp/rule_6
- Stored Communications Act, 18 U.S.C. 2701-2712: https://www.law.cornell.edu/uscode/text/18/part-I/chapter-121
- *Braswell v. United States*, 487 U.S. 99 (1988): entity act-of-production doctrine
- U.S. Courts, Subpoena guidance: https://www.uscourts.gov/forms/subpoena
