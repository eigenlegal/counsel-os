# Knowledge Foundation Expansion — Design Spec

## Overview

Expand and deepen the Counsel OS legal knowledge foundation from a shallow trigger-and-constraint system into a practitioner-ready general-purpose legal reference. This touches two product content layers: `knowledge/law/` (hard legal constraints) and `knowledge/defaults/` (market-standard positions, playbooks, checklists, clause library).

User content layers (`practice/`, `matters/`, `memory/`) and skills are not in scope.

## Current State

| Layer | Files | Avg Lines | Assessment |
|-------|-------|-----------|------------|
| Law/ | 43 files across 12 areas | 33 | Shallow — trigger conditions + constraint lists, no thresholds or procedures |
| Positions/ | 13 | 39 | Serviceable but vague qualitative terms, missing position types |
| Clause library/ | 6 | 73 | Strong but incomplete, missing 20+ clause types, no vendor-favorable variants |
| Checklists/ | 6 | 91 | Comprehensive but no priority tiers or materiality guidance |
| Playbooks/ | 11 | 103 | Strongest layer — genuine step-by-step processes, some tactical gaps |

## Target State

| Layer | Files | Avg Lines | Standard |
|-------|-------|-----------|----------|
| Law/ | ~188 files across 26 areas | 100-150 | Specific thresholds, timelines, consequences, source links |
| Positions/ | ~24 | 50-60 | Numeric classification guides, practical guidance, common traps |
| Clause library/ | ~14 | 80-100 | Standard/aggressive/vendor-favorable/minimum variants with actual language |
| Checklists/ | ~14 | 100-120 | Priority tiers (must-check / should-check / nice-to-check) |
| Playbooks/ | ~17 | 100-130 | Tactical sub-steps, cross-references to positions and checklists |

---

## Design Decisions

### Decompose & Deepen

Every law area is broken into specific, standalone sub-files. Each sub-file covers one legal topic (~100-150 lines) with thresholds, practical guidance, and source links. This matches the intake skill's auto-detection system: overview.md has trigger conditions, sub-files load based on sub-topic triggers. More granular sub-files = more precise loading = less noise in analysis.

### Law/ Is Purely Factual

The law/ layer contains only what the law requires — statutes, regulations, agency guidance, specific thresholds, timelines, and consequences. No positions, no judgment calls, no "our standard is X." This preserves the 5-layer precedence: law/ is the hard constraint that can never be overridden.

### Practical Guidance Lives in Defaults/Positions

Interpretive content — how the law plays out in contract review, what counterparties try, common pitfalls — lives in the defaults/positions/ files. This keeps law/ clean and puts the interpretive bridge where it's most useful: right next to the GREEN/YELLOW/RED classification.

### Source Links on Law/ Files Only

Every law/ file includes a `## Sources` section with links to official primary sources: Cornell LII (US Code), EUR-Lex (EU), eCFR (federal regulations), official agency sites. Focus on stable, free URLs. Accept that some will go stale — link maintenance is part of the `/counsel-os:update` cycle. Defaults/ files don't need source links since they express positions, not law.

### Existing Files: Deepen, Split, or Rename

- Files that cover one topic: deepened in place (same path, more content)
- Files that cover multiple topics: split into separate files, original deleted
- Files that need renaming: renamed and deepened (old file deleted)
- Overview.md files: updated to route to new sub-files
- No path changes for files that stay intact (avoids breaking references)

### Content Delineation Across Areas

When a topic spans multiple areas, each file covers the legal requirements relevant to that area's trigger context:
- `international-trade/anti-corruption.md` covers the statute: elements, safe harbors, books-and-records requirements
- `white-collar-investigations/fcpa-enforcement.md` covers enforcement procedure: DOJ/SEC cooperation, monitors, DPAs/NPAs
- `data-privacy/breach-notification.md` covers privacy breach notification obligations by jurisdiction
- `cybersecurity/state-breach-laws.md` covers security breach notification triggers, timelines, and AG reporting
- `consumer-protection/endorsements-testimonials.md` covers FTC enforcement standards for endorsements
- `advertising-media/influencer-disclosures.md` covers platform-specific rules and practical compliance

Each file's `## Interaction with Other Areas` section must cross-reference related files in other areas.

### HIPAA Cross-Area Treatment

HIPAA currently appears in `data-privacy/overview.md` triggers. After this expansion:
- HIPAA privacy-specific requirements (Privacy Rule, data subject rights) remain referenced in `data-privacy/` triggers with a cross-reference to `healthcare/hipaa-compliance.md`
- The comprehensive HIPAA file (Privacy Rule, Security Rule, BAAs, enforcement) lives in `healthcare/hipaa-compliance.md`
- `data-privacy/overview.md` sub-file loading section adds: "If HIPAA applies → load `healthcare/hipaa-compliance.md`"

### Law/ Template Boundary

The law/ template's `## Key Requirements` section is limited to statutory and regulatory obligations. Do not include contract negotiation advice, counterparty tactics, or position recommendations — those belong in `defaults/positions/`. The test: "Could this sentence be cited to a statute or regulation?" If yes, it belongs in law/. If no, it belongs in defaults/.

---

## Law/ Structure — 26 Areas, ~188 Files

### File Template

```markdown
# [Topic Name]

## Applicability
When this sub-topic is relevant — specific triggers beyond the area overview.

## Key Requirements
The actual legal requirements with specific thresholds, timelines, and standards.

Each requirement follows this pattern:
- **What**: The obligation
- **Threshold/Timeline**: The specific number (72 hours, $25M, etc.)
- **Consequence**: What happens if violated (fine, private right of action, criminal)

## Interaction with Other Areas
Cross-references to other law/ areas that commonly co-apply.

## Sources
- [Official Name](stable-url) — brief description
```

### Overview.md Template

```markdown
# [Area Name]

## Trigger Conditions
Keywords, clause types, and patterns that indicate this area applies.

## Sub-File Loading
Which sub-files to load based on specific sub-triggers.

## Quick Reference
One-sentence summary of each sub-file for orientation.
```

### Complete File Tree

```
knowledge/law/

  data-privacy/                          EXISTING — DECOMPOSED
    overview.md                          trigger conditions + sub-file routing
    gdpr.md                              deepened: lawful basis, DPIAs, DPO, records, fines
    ccpa-cpra.md                         deepened: sale vs. sharing, thresholds, rights
    us-state-privacy.md                  deepened: state-by-state comparison matrix
    international.md                     deepened: PIPEDA, LGPD, PDPA, PIPL substantive reqs
    coppa.md                             NEW: children's data, parental consent, age gates
    consent-mechanics.md                 NEW: freely given, specific, informed, granular
    breach-notification.md               NEW: cross-jurisdiction timelines and procedures
    cross-border-transfers.md            NEW: SCCs, adequacy, Schrems II, TIAs
    data-subject-rights.md               NEW: access, deletion, portability, objection
    data-processing-agreements.md        NEW: mandatory DPA clauses by jurisdiction

  consumer-protection/                   EXISTING — DECOMPOSED
    overview.md
    ftc-udap.md                          deepened: materiality, deception analysis
    state-consumer-laws.md               deepened: key state differences
    auto-renewal.md                      deepened: ROSCA + state-specific
    tcpa.md                              NEW: calls, texts, ATDS, consent
    can-spam.md                          NEW: commercial email, opt-out, transactional
    magnuson-moss.md                     NEW: warranty act, disclaimers, remedies
    dark-patterns.md                     NEW: FTC enforcement, state laws, EU DSA
    endorsements-testimonials.md         NEW: FTC guides, influencer, material connections

  corporate/                             EXISTING — DECOMPOSED
    overview.md
    entity-formation.md                  was entity-types.md, deepened
    fiduciary-duties.md                  NEW: care, loyalty, business judgment rule
    governance.md                        deepened: boards, committees, D&O
    mergers-acquisitions.md              split from ma-investment.md, deepened
    investment-transactions.md           split from ma-investment.md (SAFEs, convertibles)
    shareholder-agreements.md            NEW: voting, drag-along, tag-along, ROFR
    dissolution-wind-down.md             NEW: voluntary, involuntary, procedures

  employment/                            EXISTING — DECOMPOSED
    overview.md
    at-will.md                           deepened: state exceptions, handbook risks
    contractor-classification.md         deepened: ABC test, economic reality, state rules
    non-competes.md                      deepened: state matrix, FTC rule, alternatives
    wage-and-hour.md                     NEW: FLSA, exempt/non-exempt, state minimums
    discrimination-harassment.md         NEW: Title VII, ADA, ADEA, state laws
    employee-benefits.md                 NEW: ERISA, 401k, health plans, COBRA
    severance.md                         NEW: OWBPA, release requirements, consideration
    workplace-safety.md                  NEW: OSHA, reporting, recordkeeping
    immigration.md                       NEW: H-1B, employment authorization, I-9

  ip-and-technology/                     EXISTING — DECOMPOSED
    overview.md
    patents.md                           split: prosecution, licensing, FTO, damages
    trademarks.md                        split: registration, enforcement, dilution
    copyrights.md                        split: ownership, work-for-hire, DMCA, fair use
    trade-secrets.md                     deepened: reasonable measures, DTSA, UTSA
    open-source.md                       deepened: license compatibility, compliance
    saas-technology.md                   deepened: SLA metrics, security frameworks
    domain-names.md                      NEW: UDRP, cybersquatting, transfers

  securities/                            EXISTING — DECOMPOSED
    overview.md
    exemptions.md                        deepened: Reg D, Reg S, Reg A, integration
    equity-issuance.md                   deepened: 409A, 83(b), option mechanics
    blue-sky-laws.md                     NEW: state exemptions, preemption
    insider-trading.md                   NEW: 10b-5, Rule 10b5-1, tipping
    public-company.md                    NEW: SOX, periodic reporting, proxy rules
    crowdfunding.md                      NEW: Reg CF, portals, limits
    investment-advisers.md               NEW: Advisers Act, registration, fiduciary

  financial-services/                    EXISTING — DECOMPOSED
    overview.md
    payments-money-transmission.md       deepened: state thresholds, bonding, timelines
    kyc-aml.md                           deepened: CDD/EDD, SAR/CTR, OFAC procedures
    banking-regulation.md                NEW: OCC, FDIC, state charters, BaaS
    lending.md                           NEW: TILA, ECOA, fair lending, usury
    fintech.md                           NEW: sandboxes, charters, embedded finance
    cryptocurrency.md                    NEW: FinCEN, state MSB, securities classification
    pci-dss.md                           NEW: compliance levels, SAQ, audit requirements

  litigation/                            EXISTING — DECOMPOSED
    overview.md
    demand-letters.md                    deepened: format, calculation, strategy
    subpoenas.md                         deepened: scope objections, privilege, cost-shifting
    regulatory-inquiries.md              deepened: agency timelines, cooperation strategy
    litigation-holds.md                  deepened: triggers, scope, procedures
    e-discovery.md                       NEW: TAR, privilege logs, proportionality, Rule 37
    settlement.md                        NEW: negotiation, release language, enforcement
    class-actions.md                     NEW: certification, defense, settlement
    arbitration.md                       NEW: AAA, JAMS, FAA, international (UNCITRAL)
    privilege.md                         NEW: attorney-client, work product, waiver, crime-fraud

  antitrust/                             EXISTING — DECOMPOSED
    overview.md
    horizontal-restraints.md             split: price-fixing, allocation, bid rigging, no-poach
    vertical-restraints.md               split: tying, RPM, exclusive dealing
    merger-review.md                     NEW: HSR filing, thresholds, timing, remedies
    monopolization.md                    NEW: Section 2, predatory pricing, refusal to deal
    state-antitrust.md                   NEW: state AG enforcement, divergence from federal

  insurance/                             EXISTING — DECOMPOSED
    overview.md
    commercial-general-liability.md      split from coverage-types.md
    professional-liability.md            split: E&O, malpractice
    cyber-liability.md                   split: first-party, third-party, exclusions
    directors-officers.md                split: Side A/B/C, exclusions
    employment-practices.md              split: EPLI scope, exclusions
    coverage-analysis.md                 NEW: claims-made vs. occurrence, tail, excess
    claims-procedures.md                 NEW: notice, defense, cooperation, subrogation

  international-trade/                   EXISTING — DECOMPOSED
    overview.md
    sanctions.md                         deepened: OFAC screening, programs, penalties
    export-controls.md                   deepened: EAR, ITAR, licensing, deemed exports
    customs.md                           NEW: classification, valuation, FTZs
    anti-boycott.md                      NEW: Arab League, reporting requirements
    foreign-investment.md                NEW: CFIUS, mandatory filing, national security
    anti-corruption.md                   NEW: FCPA, UK Bribery Act, books-and-records

  product-counseling/                    EXISTING — DECOMPOSED
    overview.md
    product-liability.md                 deepened: defect types, damages, restatement
    recalls.md                           NEW: CPSC, FDA, voluntary vs. mandatory
    warnings-labels.md                   NEW: adequacy, learned intermediary, state reqs
    consumer-product-safety.md           NEW: CPSIA, testing, certification, imports

  ai-and-automation/                     NEW AREA
    overview.md                          trigger conditions for AI-related matters
    eu-ai-act.md                         risk tiers, prohibited uses, conformity, fines
    us-state-ai-laws.md                  CO, IL, CT, TX — disclosure, bias audits
    algorithmic-accountability.md        bias testing, impact assessments, transparency
    training-data.md                     rights, licensing, scraping, fair use, opt-out
    model-ownership.md                   who owns the model, outputs, fine-tuned weights
    deepfakes-synthetic-media.md         disclosure requirements, election law, defamation
    automated-decision-making.md         GDPR Art 22, employment decisions, credit decisions

  tax/                                   NEW AREA
    overview.md
    sales-tax-vat.md                     nexus, SaaS taxability, marketplace facilitator
    withholding.md                       backup withholding, NRA withholding, W-8/W-9
    transfer-pricing.md                  arm's length, documentation, APAs
    tax-indemnities.md                   gross-up, tax representations, change-in-law
    international-tax.md                 FIRPTA, treaty benefits, PE, GILTI/BEAT
    equity-compensation-tax.md           409A, 83(b), ISO/NSO, AMT

  real-estate/                           NEW AREA
    overview.md
    commercial-leases.md                 rent, CAM, build-out, assignment, default
    zoning-land-use.md                   variances, conditional use, entitlements
    construction.md                      lien rights, bonding, AIA contracts, delays
    environmental-covenants.md           Phase I/II, CERCLA, brownfields, indemnities
    easements-encumbrances.md            access, utilities, title exceptions
    real-estate-transactions.md          due diligence, title, closing, representations

  environmental-esg/                     NEW AREA
    overview.md
    climate-disclosure.md                SEC rules, EU CSRD, California SB 253/261
    environmental-liability.md           CERCLA, RCRA, Clean Air, Clean Water
    esg-reporting.md                     frameworks (GRI, SASB, TCFD), mandatory vs. voluntary
    sustainability-representations.md    greenwashing, substantiation, contract clauses
    environmental-due-diligence.md       Phase I/II, compliance history, remediation

  bankruptcy-restructuring/              NEW AREA
    overview.md
    automatic-stay.md                    scope, relief, violations, penalties
    executory-contracts.md               assumption, rejection, assignment, cure
    preference-actions.md                elements, defenses, look-back periods
    ip-licenses-in-bankruptcy.md         Section 365(n), licensor/licensee protections
    safe-harbors.md                      financial contracts, securities, commodities
    creditor-rights.md                   secured vs. unsecured, priority, proof of claim

  government-contracts/                  NEW AREA
    overview.md
    far-dfar.md                          key clauses, flowdown, commercial item exception
    procurement.md                       sealed bidding, negotiated, sole source, protests
    compliance-certifications.md         representations, SAM, debarment, size standards
    foia.md                              exemptions, confidential business info, procedures
    sovereign-immunity.md                federal (Tucker Act), state (11th Amendment)
    small-business.md                    set-asides, SBA programs, subcontracting plans

  healthcare/                            NEW AREA
    overview.md
    hipaa-compliance.md                  Privacy Rule, Security Rule, BAAs, enforcement
    stark-law.md                         self-referral, exceptions, penalties
    anti-kickback.md                     safe harbors, OIG advisory opinions
    provider-agreements.md               managed care, participation, credentialing
    fda-regulation.md                    devices, drugs, 510(k), PMA, labeling
    telehealth.md                        state licensure, prescribing, reimbursement

  advertising-media/                     NEW AREA
    overview.md
    advertising-standards.md             substantiation, comparative, native, testimonials
    content-licensing.md                 rights grants, territory, exclusivity, residuals
    right-of-publicity.md               state laws, deceased, AI likenesses
    influencer-disclosures.md            FTC guidance, platform rules, enforcement
    defamation.md                        elements, defenses, Section 230, anti-SLAPP

  nonprofit/                             NEW AREA
    overview.md
    tax-exempt-status.md                 501(c)(3)/(4)/(6), application, maintenance
    charitable-solicitation.md           state registration, disclosures, fundraising
    donor-restrictions.md                restricted gifts, cy pres, endowment
    unrelated-business-income.md         UBIT triggers, exceptions, planning
    nonprofit-governance.md              board duties, conflicts, compensation

  cybersecurity/                         NEW AREA
    overview.md
    nist-frameworks.md                   NIST CSF, 800-171, 800-53
    sec-cyber-disclosure.md              incident reporting, risk management, governance
    cmmc.md                              DoD contractor requirements, levels, assessment
    state-breach-laws.md                 notification triggers, timelines, AG reporting
    incident-response.md                 containment, forensics, notification procedures
    security-standards.md                SOC 2, ISO 27001, FedRAMP, HITRUST

  white-collar-investigations/           NEW AREA
    overview.md
    internal-investigations.md           scope, privilege, Upjohn warnings, reporting
    whistleblower.md                     SOX 806, Dodd-Frank, qui tam, retaliation
    doj-cooperation.md                   cooperation credit, monitors, DPAs/NPAs
    corporate-compliance-programs.md     DOJ guidance, effective programs, culture
    fcpa-enforcement.md                  DOJ/SEC enforcement, penalties, declinations

  accessibility/                         NEW AREA
    overview.md
    ada-title-iii.md                     public accommodations, digital, standing
    section-508.md                       federal technology, procurement, ICT
    wcag.md                              2.1/2.2 standards, A/AA/AAA, testing
    website-accessibility.md             litigation trends, demand letters, settlement
    state-accessibility.md               California, NY, state-specific requirements

  franchise/                             NEW AREA
    overview.md
    ftc-franchise-rule.md                FDD requirements, timing, disclosure items
    state-franchise-laws.md              registration states, relationship laws, termination
    franchise-agreements.md              territory, fees, non-compete, transfer, renewal
    relationship-laws.md                 good cause termination, encroachment, sourcing

  labor-relations/                       NEW AREA
    overview.md
    nlra.md                              protected activity, unfair labor practices, elections
    collective-bargaining.md             mandatory subjects, duty to bargain, impasse
    union-organizing.md                  campaigns, neutrality agreements, card check
    strikes-lockouts.md                  economic vs. ULP strikes, replacements, picketing
```

---

## Defaults/ Structure

### Positions/ — 13 existing + 11 new = ~24 files

#### File Template

```markdown
# [Clause Type] — Position

## Market Standard
What the typical position looks like, with specific parameters.

## Classification Guide
- **GREEN**: [specific criteria — numbers, not adjectives]
- **YELLOW**: [specific criteria]
- **RED**: [specific criteria]

## Escalate If
Bright-line triggers for escalation — no judgment required.

## Practical Guidance
How the underlying law plays out in contracts:
- What to look for
- Common pitfalls
- How counterparties try to shift risk

## Key Negotiation Points
The 3-5 things that actually get negotiated on this clause type.

## Common Traps
Language that looks acceptable but creates hidden risk.
```

#### Existing Files (Deepened)

All 13 existing position files are deepened to match the new template:

- `assignment-change-of-control.md`
- `confidentiality.md`
- `data-protection.md`
- `dispute-resolution.md`
- `fees-payment.md`
- `force-majeure.md`
- `indemnification.md`
- `insurance-requirements.md`
- `ip-ownership.md`
- `limitation-of-liability.md`
- `representations-warranties.md`
- `service-levels.md`
- `termination-renewal.md`

Key changes to existing files:
- Classification guides use specific numbers instead of qualitative terms
- Add "Practical Guidance" section (moved from law/ template)
- Add "Common Traps" section
- Add "Key Negotiation Points" section

#### New Position Files

- `audit-rights.md` — frequency, scope, cost allocation, remediation rights
- `subcontractors-subprocessors.md` — approval, flowdown, liability, notification
- `acceptable-use.md` — restrictions, enforcement, consequences, carve-outs
- `compliance-certifications.md` — regulatory representations, ongoing obligations
- `warranties-disclaimers.md` — AS-IS, implied warranty exclusions, limitation
- `ai-data-use.md` — training restrictions, model ownership, output rights
- `most-favored-nation.md` — pricing parity, scope, verification, duration
- `non-solicitation.md` — employees, customers, duration, geographic scope
- `transition-assistance.md` — post-termination, data return, cooperation, fees
- `source-code-escrow.md` — triggers, verification, maintenance, release conditions
- `notices.md` — methods, addresses, effectiveness, electronic delivery

### Clause Library/ — 6 existing + 8 new = ~14 files

#### File Template

```markdown
# [Clause Category]

## [Clause Type 1]

### Standard
[Actual clause language]

### Aggressive (Customer-Favorable)
[Actual clause language]

### Vendor-Favorable
[Actual clause language]

### Minimum Acceptable
[Actual clause language]

### Notes
When to use each variant. What to watch for.
```

#### Existing Files (Deepened)

- `data-protection.md` — add vendor-favorable variants
- `dispute-resolution.md` — FIXED: add actual clause language (currently references position file)
- `ip-and-confidentiality.md` — add vendor-favorable variants, joint development
- `liability-and-indemnification.md` — add vendor-favorable variants
- `sla-and-performance.md` — add vendor-favorable variants, RPO/RTO
- `termination-and-renewal.md` — add vendor-favorable variants, transition

#### New Clause Library Files

- `warranties-disclaimers.md` — express, implied, AS-IS, limitation of remedies
- `governing-law-jurisdiction.md` — choice of law, venue, consent to jurisdiction
- `boilerplate.md` — entire agreement, severability, waiver, counterparts, amendment
- `compliance-regulatory.md` — FCPA, export, sanctions, ADA, anti-corruption
- `ai-and-data-use.md` — training restrictions, output ownership, algorithmic clauses
- `force-majeure.md` — post-COVID expanded triggers, mitigation, termination rights
- `audit-rights.md` — frequency, scope, cost allocation, remediation
- `notices.md` — methods, deemed receipt, electronic delivery

### Checklists/ — 6 existing + 8 new = ~14 files

#### File Template

```markdown
# [Checklist Name]

## [Section Name]

### Must-Check (Tier 1)
- [ ] Item — [why this matters]

### Should-Check (Tier 2)
- [ ] Item

### Nice-to-Check (Tier 3)
- [ ] Item
```

#### Existing Files (Deepened)

All 6 existing checklists get priority tiers added:

- `contract-review.md`
- `due-diligence.md`
- `litigation-hold.md`
- `nda-screening.md`
- `partner-terms.md`
- `vendor-onboarding.md`

#### New Checklists

- `employment-agreement.md` — offer letter, restrictive covenants, benefits, termination
- `ip-assignment.md` — invention assignment, work-for-hire, moral rights, pre-existing IP
- `saas-agreement.md` — dedicated SaaS-specific review (distinct from general contract review)
- `ma-transaction.md` — signing-to-closing, conditions, representations, integration
- `privacy-dpa.md` — DPA completeness, GDPR Article 28, transfers, sub-processors
- `government-contract.md` — FAR compliance, certifications, flowdowns, set-asides
- `healthcare-baa.md` — HIPAA BAA requirements, subcontractors, breach procedures
- `real-estate-lease.md` — commercial lease review items, CAM, build-out, default

### Playbooks/ — 11 existing + 6 new = ~17 files

#### Existing Files (Deepened)

All 11 existing playbooks get:
- Tactical sub-steps where current steps are vague
- Cross-references to which position files and checklists to load at each step
- Decision points (if X, do Y; if Z, do W)

Files:
- `amendment-drafting.md`
- `board-and-governance.md`
- `compliance-assessment.md`
- `contract-review.md`
- `dispute-response.md`
- `due-diligence.md`
- `legal-memo.md`
- `nda-triage.md`
- `negotiation.md`
- `policy-drafting.md`
- `vendor-onboarding.md`

#### New Playbooks

- `regulatory-response.md` — investigation, subpoena, enforcement action response
- `ip-portfolio-management.md` — prosecution, maintenance, licensing, enforcement
- `employment-termination.md` — involuntary, RIF, WARN Act, separation agreements
- `ma-integration.md` — post-closing, contract novation, entity merge, integration
- `privacy-compliance-program.md` — building/auditing a privacy program
- `ai-governance.md` — risk assessment, policy development, vendor AI review

---

## Handling Existing Files

### Files That Get Deepened In Place (same path, more content)

All files that cover a single topic stay at their current path and get expanded to meet the new depth standard. Examples:
- `law/data-privacy/gdpr.md` — 32 lines → ~120 lines
- `law/employment/non-competes.md` — 39 lines → ~130 lines
- `defaults/positions/limitation-of-liability.md` — 35 lines → ~55 lines

### Files That Get Split (original deleted after redistribution)

- `law/ip-and-technology/patents-copyrights-trademarks.md` → split into `patents.md`, `trademarks.md`, `copyrights.md`
- `law/corporate/ma-investment.md` → split into `mergers-acquisitions.md`, `investment-transactions.md`
- `law/antitrust/competition-law.md` → split into `horizontal-restraints.md`, `vertical-restraints.md`, `monopolization.md`
- `law/insurance/coverage-types.md` → split into `commercial-general-liability.md`, `professional-liability.md`, `cyber-liability.md`, `directors-officers.md`, `employment-practices.md`
- `law/financial-services/compliance-licensing.md` → split into `banking-regulation.md`, `lending.md`, `fintech.md`
- `law/consumer-protection/state-consumer-laws.md` — deepened in place (not split, but content significantly expanded with state-by-state comparison)

### Files That Get Renamed (old file deleted)

- `law/corporate/entity-types.md` → renamed to `entity-formation.md` and deepened

### Overview.md Files Updated

All 12 existing overview.md files get updated to route to new sub-files. 14 new overview.md files created for new areas.

---

## What Is NOT In Scope

- **Skills/** — no changes to the pipeline code (intake, analyze, negotiate, deliver, close)
- **Practice/** — user content, not touched
- **Matters/** — user content, not touched
- **Memory/** — user content, not touched
- **5-layer architecture** — no changes to precedence rules or merge logic

---

## Implementation Sequence

Work proceeds in four phases with clear dependencies:

### Phase 1: Deepen existing law/ files and update overview.md routing
- Update all 12 existing overview.md files first (they define trigger routing for new sub-files)
- Deepen existing law/ sub-files to meet the new depth standard
- Split files that cover multiple topics (patents-copyrights-trademarks.md, etc.)
- This phase is prerequisite for Phase 2 since new sub-files need routing in overview.md

### Phase 2: Create new sub-files within existing law/ areas
- Add new sub-files to existing areas (e.g., coppa.md in data-privacy, wage-and-hour.md in employment)
- Can be parallelized across areas — each area is independent

### Phase 3: Create new law/ areas
- Write overview.md with trigger conditions first for each new area
- Then write sub-files
- Can be parallelized across areas

### Phase 4: Deepen and create defaults/ files
- Depends on law/ being substantially complete (positions reference law/ requirements)
- Deepen existing position, clause library, checklist, and playbook files
- Create new defaults/ files
- Can be parallelized across file types (positions, clause library, checklists, playbooks are independent)

Within each phase, work can be parallelized across areas since areas are independent of each other.

---

## Quality Validation

Each file must meet these acceptance criteria before being considered complete:

### Law/ files
- At least 3 specific requirements with numeric thresholds or timelines
- At least 2 primary source links in `## Sources`
- At least 1 cross-reference in `## Interaction with Other Areas`
- Specific consequences for violation (fine amounts, private right of action, criminal penalty)
- No position recommendations or contract negotiation advice (those belong in defaults/)
- 100-150 lines

### Overview.md files
- Trigger conditions cover keywords, clause types, and regulatory references
- Sub-file loading rules map specific triggers to specific sub-files
- Quick reference covers every sub-file in the area
- 30-40 lines

### Position files
- GREEN/YELLOW/RED classification uses specific numbers, not qualitative terms
- At least 2 escalation triggers that require no judgment
- Practical Guidance section references specific law/ requirements
- Common Traps section with at least 2 examples
- 50-60 lines

### Clause library files
- Actual clause language for all variants (standard, aggressive, vendor-favorable, minimum)
- Notes explaining when to use each variant
- 80-100 lines

### Checklists
- Every item assigned to a priority tier (Must-Check, Should-Check, Nice-to-Check)
- Must-Check items include brief rationale
- 100-120 lines

### Playbooks
- Cross-references to which position files and checklists to load at each step
- Decision points where the process branches
- 100-130 lines

---

## Follow-On Tasks

These are out of scope for this spec but must happen after implementation:

1. **Update CLAUDE.md Knowledge Map** — the Knowledge Map section lists area descriptions and file paths that will be stale after this expansion. Must reflect all 26 areas and new defaults/ files.
2. **Update templates/** — setup templates should match the new knowledge structure so new users get the right scaffolding.
3. **Update intake skill routing** — the intake skill scans overview.md files for triggers. Verify it correctly discovers and loads all 26 areas, especially new areas and cross-area references (e.g., HIPAA routing from data-privacy to healthcare).

---

## Summary

| What | From | To |
|------|------|----|
| Law areas | 12 | 26 |
| Law files (including overview.md) | 43 | ~188 |
| Position files | 13 | ~24 |
| Clause library files | 6 | ~14 |
| Checklist files | 6 | ~14 |
| Playbook files | 11 | ~17 |
| **Total files** | **79** | **~257** |
| Avg law/ file depth | 33 lines | 100-150 lines |
| Source links | None | Every law/ file |
