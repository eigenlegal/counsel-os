---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, international]
authorities:
  - cite: "9 U.S.C. §§ 1-16"
    title: "Federal Arbitration Act"
    url: "https://www.law.cornell.edu/uscode/text/9/chapter-1"
  - cite: "Smith v. Spizzirri, 601 U.S. 472 (2024)"
    title: "FAA § 3 requires a stay, not dismissal, when a dispute is arbitrable and a stay is requested"
    url: "https://www.supremecourt.gov/opinions/23pdf/22-1218_5357.pdf"
  - cite: "Coinbase, Inc. v. Suski, 602 U.S. 143 (2024)"
    title: "Court, not arbitrator, decides which of two conflicting contracts governs arbitrability"
    url: "https://www.supremecourt.gov/opinions/23pdf/23-3_879d.pdf"
  - cite: "Jules v. Andre Balazs Properties, No. 25-83 (U.S. May 14, 2026)"
    title: "Court that stays a case under FAA § 3 retains jurisdiction over later §§ 9-10 motions"
    url: "https://www.supremecourt.gov/opinions/25pdf/25-83_3e04.pdf"
  - cite: "AAA Mass Arbitration Supplementary Rules and Fee Schedule"
    title: "AAA mass arbitration rules (effective Jan. 15, 2024; amended Apr. 1, 2024)"
    url: "https://www.adr.org/rules-forms-and-fees/mass-arbitration/"
  - cite: "JAMS Mass Arbitration Procedures and Guidelines"
    title: "JAMS mass arbitration procedures and fee schedule (effective May 1, 2024)"
    url: "https://www.jamsadr.com/mass-arbitration-procedures"
---
# Arbitration

## Applicability

Load when any matter involves arbitration agreements, arbitration clause drafting, motions to compel arbitration, arbitration proceedings (AAA, JAMS, ICC, UNCITRAL), class arbitration, unconscionability challenges, confirmation or vacatur of arbitration awards, or international commercial arbitration. Also load when evaluating dispute resolution clauses in contracts.

## Key Requirements

### Federal Arbitration Act (FAA) Framework

- **Strong federal policy favoring arbitration** / **Threshold**: FAA (9 U.S.C. 1-16) establishes that arbitration agreements "shall be valid, irrevocable, and enforceable" (Section 2) / **Consequence**: Courts must enforce arbitration agreements according to their terms; doubts resolved in favor of arbitration (*Moses H. Cone Memorial Hospital v. Mercury Construction*)
- **Commerce requirement** / **Threshold**: FAA applies to contracts "involving commerce" -- broadly interpreted to reach the full extent of Congress's Commerce Clause power / **Consequence**: Virtually all commercial contracts are covered; purely local transactions may fall outside FAA but are rare
- **Section 2 savings clause** / **Threshold**: Arbitration agreements are enforceable "save upon such grounds as exist at law or in equity for the revocation of any contract" / **Consequence**: General contract defenses (fraud, duress, unconscionability) may invalidate arbitration clauses, but defenses that target arbitration specifically are preempted (*Concepcion*)
- **Delegation clauses** / **Threshold**: Parties may delegate threshold arbitrability questions to the arbitrator ("who decides") by clear and unmistakable evidence / **Consequence**: Incorporation of AAA or JAMS rules that grant arbitrator jurisdiction over arbitrability constitutes delegation (*Henry Schein v. Archer & White Sales*); but where parties have multiple agreements that conflict on arbitrability, a court -- not the arbitrator -- decides which contract governs, even if the earlier contract contains a delegation clause (*Coinbase, Inc. v. Suski*, 602 U.S. 143 (2024))
- **Stay, not dismissal (FAA Section 3)** / **Threshold**: When a dispute is arbitrable and a party requests a stay, the court must stay the action; it lacks discretion to dismiss (*Smith v. Spizzirri*, 601 U.S. 472 (2024)) / **Consequence**: The stayed court retains jurisdiction, including over later motions to confirm or vacate the award under Sections 9-10 without an independent jurisdictional basis (*Jules v. Andre Balazs Properties*, No. 25-83 (U.S. May 14, 2026))

### Major Arbitral Institutions and Rules

- **AAA (American Arbitration Association)**: Commercial Arbitration Rules (general commercial), Consumer Arbitration Rules (amended effective May 1, 2025 -- claims of $25,000 or less are decided on documents only unless the arbitrator decides a hearing is necessary), Employment Arbitration Rules, Mass Arbitration Supplementary Rules
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
- **Mass arbitration** / **Threshold**: When class waivers channel thousands of individual claims into separate arbitrations / **Consequence**: Per-case fees make mass filings a strategic tool for plaintiffs. AAA Mass Arbitration Supplementary Rules (effective Jan. 15, 2024; amended Apr. 1, 2024) replace up-front per-case fees with a flat initiation fee ($3,125 claimant share / $8,125 business share), counsel attestation requirements, and a process arbitrator who vets claims before per-case fees attach. JAMS Mass Arbitration Procedures (effective May 1, 2024) use a $7,500 initiation fee (company pays at least $5,000) and a Process Administrator, but apply only if the parties' agreement adopts them. Bespoke mass-arbitration protocols are not immune from unconscionability review -- *Heckman v. Live Nation Entertainment* (9th Cir. 2024) held a New Era ADR batching/precedent protocol unconscionable (cert. denied 2025)

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

- **Consumer arbitration**: AAA Consumer Rules and JAMS Consumer Arbitration Minimum Standards cap the consumer's share of fees (AAA: $225 filing fee cap; JAMS: $250 filing fee); the business bears the remaining administrative and arbitrator fees
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
- *Smith v. Spizzirri*, 601 U.S. 472 (2024): https://www.supremecourt.gov/opinions/23pdf/22-1218_5357.pdf
- *Jules v. Andre Balazs Properties*, No. 25-83 (U.S. May 14, 2026): https://www.supremecourt.gov/opinions/25pdf/25-83_3e04.pdf
- AAA Mass Arbitration Rules and Fees: https://www.adr.org/rules-forms-and-fees/mass-arbitration/
- JAMS Mass Arbitration Procedures: https://www.jamsadr.com/mass-arbitration-procedures
- New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards (1958): https://www.newyorkconvention.org
- AAA Rules and Procedures: https://www.adr.org/Rules
- UNCITRAL Model Law on International Commercial Arbitration: https://uncitral.un.org/en/texts/arbitration/modellaw/commercial_arbitration
