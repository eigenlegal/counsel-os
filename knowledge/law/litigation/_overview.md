---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
---

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
