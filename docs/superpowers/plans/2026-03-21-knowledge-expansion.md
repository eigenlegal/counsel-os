# Knowledge Foundation Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Counsel OS legal knowledge foundation from 79 files across 12 law areas to ~257 files across 26 areas, with practitioner-ready depth (~100-150 lines per law/ file), specific legal thresholds, and source links.

**Architecture:** Pure content expansion across two layers: `knowledge/law/` (hard legal constraints) and `knowledge/defaults/` (positions, clause library, checklists, playbooks). No code changes. Each law/ file follows a standardized template with Applicability, Key Requirements (with thresholds/timelines/consequences), Interaction with Other Areas, and Sources sections. Each defaults/ file type has its own template defined in the spec.

**Spec:** `docs/superpowers/specs/2026-03-21-knowledge-expansion-design.md`

**Key constraints:**
- Law/ files are purely factual — no positions, no negotiation advice. Test: "Could this sentence be cited to a statute or regulation?"
- Source links use stable, free primary sources (Cornell LII, EUR-Lex, eCFR, official agency sites)
- Existing file content should be preserved and expanded, not rewritten from scratch
- Cross-area references must be bidirectional (if A references B, B references A)

---

## Phase 1: Deepen Existing Law/ Areas (12 areas)

Each task in this phase handles one existing law area: update the overview.md to route to new sub-files, deepen existing sub-files, and split files that cover multiple topics. Tasks are independent and can be parallelized.

**Quality criteria for every law/ file (from spec):**
- At least 3 specific requirements with numeric thresholds or timelines
- At least 2 primary source links in `## Sources`
- At least 1 cross-reference in `## Interaction with Other Areas`
- Specific consequences for violation (fine amounts, private right of action, criminal penalty)
- No position recommendations or contract negotiation advice
- 100-150 lines per sub-file, 30-40 lines per overview.md

**File template for sub-files:**
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

**File template for overview.md:**
```markdown
# [Area Name]

## Trigger Conditions
Keywords, clause types, and patterns that indicate this area applies.

## Sub-File Loading
Which sub-files to load based on specific sub-triggers.

## Quick Reference
One-sentence summary of each sub-file for orientation.
```

---

### Task 1: Data Privacy (existing — deepen + 7 new sub-files)

**Files:**
- Modify: `knowledge/law/data-privacy/overview.md` — update sub-file routing for 7 new files, add HIPAA cross-reference to healthcare/
- Modify: `knowledge/law/data-privacy/gdpr.md` — deepen from ~32 to ~130 lines
- Modify: `knowledge/law/data-privacy/ccpa-cpra.md` — deepen from ~33 to ~130 lines
- Modify: `knowledge/law/data-privacy/us-state-privacy.md` — deepen from ~29 to ~130 lines (state-by-state comparison)
- Modify: `knowledge/law/data-privacy/international.md` — deepen from ~31 to ~130 lines (substantive reqs per jurisdiction)
- Create: `knowledge/law/data-privacy/coppa.md` — children's data, parental consent, age verification
- Create: `knowledge/law/data-privacy/consent-mechanics.md` — freely given, specific, informed, granular consent
- Create: `knowledge/law/data-privacy/breach-notification.md` — cross-jurisdiction timelines and procedures
- Create: `knowledge/law/data-privacy/cross-border-transfers.md` — SCCs, adequacy decisions, Schrems II, TIAs
- Create: `knowledge/law/data-privacy/data-subject-rights.md` — access, deletion, portability, objection by jurisdiction
- Create: `knowledge/law/data-privacy/data-processing-agreements.md` — mandatory DPA clauses by jurisdiction

**Content guidance:**
- `gdpr.md`: Add specific thresholds — 72-hour breach notification (Art 33), 4% global turnover or EUR 20M fines (Art 83), DPIA required for systematic monitoring/large-scale special categories (Art 35). Add lawful basis details (6 bases under Art 6), processor vs. controller distinction, DPO requirement triggers.
- `ccpa-cpra.md`: Add applicability thresholds — $25M revenue, 100K+ consumers/households, or 50%+ revenue from selling/sharing. Distinguish "sale" vs. "sharing" vs. "use". Add specific consumer rights with response timelines (45 days, extendable to 90). Add CPRA-specific additions (sensitive data, right to correct, right to limit use).
- `us-state-privacy.md`: Structure as comparison matrix — Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), Texas, Oregon, Montana, etc. Key dimensions: scope thresholds, consumer rights, enforcement (private right of action vs. AG-only), sensitive data definition, opt-out mechanisms.
- `international.md`: Substantive requirements for PIPEDA (Canada), LGPD (Brazil), PDPA (Singapore), PIPL (China), APP (Australia), APPI (Japan), PIPA (South Korea), DPDP Act (India). Include breach notification timelines and cross-border transfer mechanisms for each.
- `coppa.md`: Age threshold (under 13), verifiable parental consent, operator obligations, FTC enforcement, penalties ($50K+ per violation). Reference COPPA Safe Harbor programs.
- `consent-mechanics.md`: GDPR consent requirements (freely given, specific, informed, unambiguous — Art 7), granularity requirements, withdrawal rights, cookie consent (ePrivacy Directive), US state consent models.
- `breach-notification.md`: Comparative table — GDPR 72 hours, CCPA "most expedient time possible" (no fixed deadline), state laws (30-90 days typical), HIPAA 60 days, sectoral requirements. AG notification thresholds by state.
- `cross-border-transfers.md`: Post-Schrems II landscape, SCCs (2021 version), adequacy decisions (current list), supplementary measures, Transfer Impact Assessments, APEC CBPR, binding corporate rules.
- `data-subject-rights.md`: Access, deletion, portability, objection, restriction, rectification — by jurisdiction. Response timelines: GDPR 30 days (extendable to 90), CCPA 45 days (extendable to 90). Exceptions and limitations.
- `data-processing-agreements.md`: GDPR Article 28 mandatory provisions, CCPA service provider addendum requirements, state-law DPA requirements. Sub-processor notification and approval mechanics.
- `overview.md`: Update trigger conditions to include new sub-files. Add: "If HIPAA applies → load `healthcare/hipaa-compliance.md`"

- [ ] **Step 1:** Read all 5 existing files in `knowledge/law/data-privacy/` to understand current content
- [ ] **Step 2:** Deepen `gdpr.md` to ~130 lines following template and content guidance above
- [ ] **Step 3:** Deepen `ccpa-cpra.md` to ~130 lines
- [ ] **Step 4:** Deepen `us-state-privacy.md` to ~130 lines with state-by-state comparison matrix
- [ ] **Step 5:** Deepen `international.md` to ~130 lines with per-jurisdiction substantive requirements
- [ ] **Step 6:** Create `coppa.md` (~120 lines)
- [ ] **Step 7:** Create `consent-mechanics.md` (~120 lines)
- [ ] **Step 8:** Create `breach-notification.md` (~130 lines)
- [ ] **Step 9:** Create `cross-border-transfers.md` (~130 lines)
- [ ] **Step 10:** Create `data-subject-rights.md` (~120 lines)
- [ ] **Step 11:** Create `data-processing-agreements.md` (~120 lines)
- [ ] **Step 12:** Update `overview.md` — add routing for all new sub-files, add HIPAA cross-reference
- [ ] **Step 13:** Validate all files meet quality criteria (3+ thresholds, 2+ sources, 1+ cross-reference, consequences listed)
- [ ] **Step 14:** Commit: `git add knowledge/law/data-privacy/ && git commit -m "Deepen data-privacy law area: 7 new sub-files, all files to practitioner depth"`

---

### Task 2: Consumer Protection (existing — deepen + 5 new sub-files)

**Files:**
- Modify: `knowledge/law/consumer-protection/overview.md` — update routing
- Modify: `knowledge/law/consumer-protection/ftc-udap.md` — deepen
- Modify: `knowledge/law/consumer-protection/state-consumer-laws.md` — deepen with state-by-state
- Modify: `knowledge/law/consumer-protection/auto-renewal.md` — deepen with ROSCA + state-specific
- Create: `knowledge/law/consumer-protection/tcpa.md`
- Create: `knowledge/law/consumer-protection/can-spam.md`
- Create: `knowledge/law/consumer-protection/magnuson-moss.md`
- Create: `knowledge/law/consumer-protection/dark-patterns.md`
- Create: `knowledge/law/consumer-protection/endorsements-testimonials.md`

**Content guidance:**
- `ftc-udap.md`: Section 5 deception standard (representation, material, likely to mislead reasonable consumer). Unfairness standard (substantial injury, not outweighed by benefits, not reasonably avoidable). FTC enforcement powers — consent orders, civil penalties ($50K+ per violation post-2021). Endorsement Guides (16 CFR Part 255).
- `auto-renewal.md`: ROSCA (Restore Online Shoppers' Confidence Act) — clear disclosure, affirmative consent, easy cancellation. FTC negative option rule (2024). State laws stricter than ROSCA: California ARL (specific cancellation mechanism), New York, Illinois, Oregon, Virginia. Dark pattern prohibitions in cancellation flows.
- `state-consumer-laws.md`: Key state consumer protection statutes — California (UCL, FAL, CLRA), New York (GBL 349/350), Massachusetts (93A), Illinois (ICFA), Texas (DTPA). Treble damages availability. Private right of action vs. AG-only. Fee-shifting provisions.
- `tcpa.md`: Telephone Consumer Protection Act — ATDS definition (post-Facebook v. Duguid), prior express written consent for marketing, prior express consent for informational, $500-$1,500 per violation. DNC registry. State mini-TCPA laws (Florida, Oklahoma, Washington). Exemptions.
- `can-spam.md`: CAN-SPAM requirements — truthful headers, non-deceptive subject lines, identification as ad, opt-out mechanism (10 business days to process), physical address. $50K+ per violation. Preemption of state laws. Transactional message exemption.
- `magnuson-moss.md`: Written warranty requirements, full vs. limited warranty, anti-tying provision, implied warranty protections, FTC enforcement. Interaction with UCC warranty provisions.
- `dark-patterns.md`: FTC enforcement actions, EU DSA dark pattern prohibitions, state laws (California, Colorado). Categories: nagging, obstruction, sneaking, forced action, social proof manipulation. Penalties and enforcement trends.
- `endorsements-testimonials.md`: FTC Endorsement Guides (16 CFR 255) — material connections, typical results, expert endorsements, consumer endorsements. Influencer disclosure requirements ("#ad", clear and conspicuous). Platform-specific rules. Cross-reference: `advertising-media/influencer-disclosures.md` for platform compliance.

- [ ] **Step 1:** Read all 4 existing files in `knowledge/law/consumer-protection/`
- [ ] **Step 2:** Deepen `ftc-udap.md` to ~130 lines
- [ ] **Step 3:** Deepen `state-consumer-laws.md` to ~130 lines
- [ ] **Step 4:** Deepen `auto-renewal.md` to ~130 lines
- [ ] **Step 5:** Create `tcpa.md` (~120 lines)
- [ ] **Step 6:** Create `can-spam.md` (~110 lines)
- [ ] **Step 7:** Create `magnuson-moss.md` (~110 lines)
- [ ] **Step 8:** Create `dark-patterns.md` (~120 lines)
- [ ] **Step 9:** Create `endorsements-testimonials.md` (~120 lines)
- [ ] **Step 10:** Update `overview.md` — add routing for 5 new sub-files
- [ ] **Step 11:** Validate all files meet quality criteria
- [ ] **Step 12:** Commit: `git add knowledge/law/consumer-protection/ && git commit -m "Deepen consumer-protection law area: 5 new sub-files, all files to practitioner depth"`

---

### Task 3: Corporate (existing — deepen, split, rename + 3 new sub-files)

**Files:**
- Modify: `knowledge/law/corporate/overview.md` — update routing
- Delete + Create: `knowledge/law/corporate/entity-types.md` → rename to `knowledge/law/corporate/entity-formation.md` and deepen
- Modify: `knowledge/law/corporate/governance.md` — deepen
- Delete: `knowledge/law/corporate/ma-investment.md` — split into two files below
- Create: `knowledge/law/corporate/mergers-acquisitions.md` — from ma-investment.md M&A content
- Create: `knowledge/law/corporate/investment-transactions.md` — from ma-investment.md investment content
- Create: `knowledge/law/corporate/fiduciary-duties.md`
- Create: `knowledge/law/corporate/shareholder-agreements.md`
- Create: `knowledge/law/corporate/dissolution-wind-down.md`

**Content guidance:**
- `entity-formation.md`: LLC vs. corporation vs. partnership comparison. Formation requirements by state (Delaware, California, New York focus). Check-the-box election (IRS default rules). S-corp election requirements and limitations. Series LLCs. Professional entities (PLLC, PC). Tax treatment comparison.
- `governance.md`: Board composition requirements, quorum rules, written consent. Officer authority (actual vs. apparent). Annual meeting requirements. Record-keeping obligations. State-specific variations (Delaware DGCL as baseline). D&O indemnification and advancement (DGCL 145).
- `fiduciary-duties.md`: Duty of care (informed decision standard), duty of loyalty (no self-dealing, corporate opportunity). Business judgment rule (presumption, rebuttal). Entire fairness test (fair dealing + fair price). Revlon duties (sale context). Caremark duties (oversight). State variations.
- `mergers-acquisitions.md`: From existing ma-investment.md M&A content + deepening. Merger types (forward, reverse, triangular). Asset vs. stock acquisition. Representations and warranties (survival periods: 12-18 months typical, fundamental reps longer). Indemnification mechanics (baskets, caps, escrow: 5-15% typical). MAC/MAE clauses. Closing conditions. HSR filing thresholds ($119.5M for 2024, adjusted annually). CFIUS review.
- `investment-transactions.md`: From existing ma-investment.md investment content. SAFE (Simple Agreement for Future Equity) — post-money vs. pre-money, valuation cap, discount. Convertible notes — interest rate, maturity, conversion mechanics. Preferred stock — liquidation preference (1x non-participating as standard), anti-dilution (broad-based weighted average), protective provisions. Information rights, preemptive rights, drag-along/tag-along.
- `shareholder-agreements.md`: Voting agreements, voting trusts. Buy-sell provisions (cross-purchase vs. redemption). ROFR/ROFO mechanics. Tag-along and drag-along rights. Deadlock resolution. Transfer restrictions. Shotgun/Texas shootout provisions.
- `dissolution-wind-down.md`: Voluntary dissolution (board + shareholder approval). Certificate of dissolution. Winding up procedures. Creditor notification and claims bar. Asset distribution order (creditors → preferred → common). Administrative dissolution and revival. State-specific timelines.

- [ ] **Step 1:** Read all 4 existing files in `knowledge/law/corporate/`
- [ ] **Step 2:** Read `ma-investment.md` carefully — identify content split between M&A and investment
- [ ] **Step 3:** Create `entity-formation.md` (~130 lines) incorporating content from `entity-types.md` + new depth
- [ ] **Step 4:** Delete `entity-types.md`
- [ ] **Step 5:** Deepen `governance.md` to ~130 lines
- [ ] **Step 6:** Create `mergers-acquisitions.md` (~140 lines) with M&A content from `ma-investment.md` + new depth
- [ ] **Step 7:** Create `investment-transactions.md` (~130 lines) with investment content from `ma-investment.md` + new depth
- [ ] **Step 8:** Delete `ma-investment.md`
- [ ] **Step 9:** Create `fiduciary-duties.md` (~120 lines)
- [ ] **Step 10:** Create `shareholder-agreements.md` (~120 lines)
- [ ] **Step 11:** Create `dissolution-wind-down.md` (~110 lines)
- [ ] **Step 12:** Update `overview.md` — route to all new/renamed files
- [ ] **Step 13:** Validate all files meet quality criteria
- [ ] **Step 14:** Commit: `git add knowledge/law/corporate/ && git commit -m "Deepen corporate law area: split ma-investment, rename entity-types, 3 new sub-files"`

---

### Task 4: Employment (existing — deepen + 6 new sub-files)

**Files:**
- Modify: `knowledge/law/employment/overview.md`
- Modify: `knowledge/law/employment/at-will.md` — deepen
- Modify: `knowledge/law/employment/contractor-classification.md` — deepen
- Modify: `knowledge/law/employment/non-competes.md` — deepen
- Create: `knowledge/law/employment/wage-and-hour.md`
- Create: `knowledge/law/employment/discrimination-harassment.md`
- Create: `knowledge/law/employment/employee-benefits.md`
- Create: `knowledge/law/employment/severance.md`
- Create: `knowledge/law/employment/workplace-safety.md`
- Create: `knowledge/law/employment/immigration.md`

**Content guidance:**
- `at-will.md`: At-will presumption and 3 exception categories (implied contract, public policy, good faith). State-specific: Montana (Wrongful Discharge from Employment Act — only state without at-will presumption), California (broad public policy exceptions), implied contract states. Handbook as contract risk. Termination documentation best practices as legal requirement context.
- `contractor-classification.md`: Three tests — ABC test (California AB5, Massachusetts, New Jersey), economic reality test (DOL, FLSA), common law/right-to-control test (IRS). State-by-state analysis of which test applies. Penalties: back taxes, benefits, penalties (up to $50/worker for willful IRS misclassification). Safe harbor (Section 530).
- `non-competes.md`: State enforceability matrix — California (void per B&P 16600), Oklahoma (void), North Dakota (void), Colorado ($123,750+ threshold, 2024), Illinois ($75K threshold), Massachusetts (garden leave required, 12-month cap), Washington ($116,593 threshold + 18-month cap, 2024). FTC Non-Compete Rule (2024 — status, scope, exceptions for senior executives). Blue pencil doctrine. Choice-of-law issues (California courts won't enforce under any law for California employees).
- `wage-and-hour.md`: FLSA exempt/non-exempt — salary threshold ($35,568 minimum for exempt, DOL proposed $55,068), duties tests (executive, administrative, professional, computer, outside sales). Overtime (1.5x after 40 hours/week). State variations: California (daily overtime after 8 hours, higher minimum wage), New York, Washington. Meal and rest break requirements by state. Penalties: liquidated damages (double back wages), willful violation (3-year statute vs. 2-year).
- `discrimination-harassment.md`: Title VII (race, color, religion, sex, national origin — 15+ employees). ADA (disability, reasonable accommodation — 15+ employees). ADEA (age 40+ — 20+ employees). Pregnancy Discrimination Act. GINA. State laws with lower thresholds and broader categories. Hostile work environment standard. Disparate treatment vs. disparate impact. EEOC charge process (180/300 day filing deadline).
- `employee-benefits.md`: ERISA preemption and fiduciary duties. 401(k) safe harbor requirements. Health plan requirements (ACA employer mandate: 50+ FTEs, $2,880/employee penalty for 2024). COBRA (20+ employees, 18/36 month continuation, 60-day election). HIPAA portability. State-specific continuation laws.
- `severance.md`: OWBPA (Older Workers Benefit Protection Act) — 21-day consideration period (individual), 45 days (group), 7-day revocation. Release requirements for ADEA claims. Consideration requirement (must provide something of value beyond what already owed). WARN Act (60-day notice for 100+ employees, state mini-WARN). Non-disparagement and cooperation clauses. Tax treatment (FICA + income tax on severance per Quality Stores).
- `workplace-safety.md`: OSHA general duty clause, specific standards by industry. Recordkeeping (300 log for 10+ employees). Reporting (fatality: 8 hours, hospitalization/amputation/eye loss: 24 hours). Penalties: up to $16,131/serious violation, $161,323/willful (2024). State OSHA plans. Whistleblower protection (Section 11(c) — 30-day filing deadline).
- `immigration.md`: H-1B (specialty occupation, $60K salary or prevailing wage, 85K annual cap, 6-year max). L-1 (intracompany transfer). O-1 (extraordinary ability). E-2 (treaty investor). I-9 compliance (3 business days to complete, re-verification timing). E-Verify requirements (federal contractors, state mandates). Penalties: $252-$2,507 per I-9 violation (2024), criminal penalties for pattern/practice.

- [ ] **Step 1:** Read all 4 existing files in `knowledge/law/employment/`
- [ ] **Step 2:** Deepen `at-will.md` to ~120 lines
- [ ] **Step 3:** Deepen `contractor-classification.md` to ~130 lines
- [ ] **Step 4:** Deepen `non-competes.md` to ~140 lines (already strongest file, add FTC rule status and choice-of-law)
- [ ] **Step 5:** Create `wage-and-hour.md` (~140 lines)
- [ ] **Step 6:** Create `discrimination-harassment.md` (~130 lines)
- [ ] **Step 7:** Create `employee-benefits.md` (~120 lines)
- [ ] **Step 8:** Create `severance.md` (~120 lines)
- [ ] **Step 9:** Create `workplace-safety.md` (~120 lines)
- [ ] **Step 10:** Create `immigration.md` (~120 lines)
- [ ] **Step 11:** Update `overview.md` — add routing for 6 new sub-files
- [ ] **Step 12:** Validate all files meet quality criteria
- [ ] **Step 13:** Commit: `git add knowledge/law/employment/ && git commit -m "Deepen employment law area: 6 new sub-files, all files to practitioner depth"`

---

### Task 5: IP & Technology (existing — deepen, split + 1 new sub-file)

**Files:**
- Modify: `knowledge/law/ip-and-technology/overview.md`
- Delete: `knowledge/law/ip-and-technology/patents-copyrights-trademarks.md` — split into 3
- Create: `knowledge/law/ip-and-technology/patents.md`
- Create: `knowledge/law/ip-and-technology/trademarks.md`
- Create: `knowledge/law/ip-and-technology/copyrights.md`
- Modify: `knowledge/law/ip-and-technology/trade-secrets.md` — deepen
- Modify: `knowledge/law/ip-and-technology/open-source.md` — deepen
- Modify: `knowledge/law/ip-and-technology/saas-technology.md` — deepen
- Create: `knowledge/law/ip-and-technology/domain-names.md`

**Content guidance:**
- `patents.md`: Patent types (utility, design, plant). Prosecution timeline (~24 months average). Patent term (20 years from filing for utility). Provisional applications (12-month window). Patent licensing (exclusive, non-exclusive, field-of-use). Freedom-to-operate analysis. Patent infringement (literal, doctrine of equivalents). Damages (lost profits, reasonable royalty, enhanced for willful — up to 3x). Inter partes review (IPR) at PTAB. State invention assignment statutes (California Labor Code 2870, similar in 8+ states). Patent marking requirements (false marking penalties).
- `trademarks.md`: Federal registration (USPTO, use in commerce requirement). State registration. Common law rights. Classification (Nice Classification, 45 classes). Strength hierarchy (fanciful > arbitrary > suggestive > descriptive > generic). Infringement standard (likelihood of confusion — Polaroid/Sleekcraft factors). Dilution (famous marks — blurring, tarnishment). Lanham Act Section 43(a) (false advertising). Maintenance (Sections 8/9 filings at years 5-6 and 9-10). Cancellation proceedings. Domain name disputes (UDRP — cross-reference domain-names.md).
- `copyrights.md`: Subject matter (original works fixed in tangible medium). Registration (required for statutory damages and attorney fees). Work for hire (scope of employment test vs. commissioned works — 9 categories). Copyright term (life + 70 years for individuals, 95/120 years for works for hire). Fair use (4 factors — purpose, nature, amount, market effect). DMCA safe harbor (512(a)-(d) — notice and takedown, counter-notification, 10-14 business day putback). AI-generated content (Copyright Office guidance — human authorship required). Moral rights (VARA — limited to visual art). International (Berne Convention, no formalities required).
- `trade-secrets.md`: DTSA (Defend Trade Secrets Act, 2016) — federal claim, ex parte seizure. UTSA (Uniform Trade Secrets Act) — 48 states adopted. Trade secret elements: derives value from secrecy, reasonable measures to maintain secrecy. "Reasonable measures" examples: NDAs, access controls, marking, exit interviews, need-to-know basis. Misappropriation: acquisition by improper means, disclosure/use. Remedies: injunction, damages (actual loss + unjust enrichment), exemplary damages (up to 2x for willful), attorney fees. DTSA whistleblower immunity provision. Inevitable disclosure doctrine (minority of states). Employee mobility vs. trade secret tension.
- `open-source.md`: License categories — permissive (MIT, BSD, Apache 2.0) vs. copyleft (GPL v2, GPL v3, LGPL, AGPL, MPL). Copyleft trigger: when is a work a "derivative work"? GPL compatibility matrix (MIT+Apache=OK, GPL+proprietary=NO, LGPL allows dynamic linking). AGPL (network use triggers copyleft — critical for SaaS). License compliance obligations: attribution, source code availability, license text inclusion. Due diligence: SCA tools (Black Duck, Snyk, FOSSA). Patent grants in Apache 2.0. Patent retaliation clauses. Contributor license agreements (Apache CLA, DCO).
- `saas-technology.md`: SaaS contract vs. license distinction (access vs. ownership). SLA metrics: uptime (99.9% = 43.8 min/month, 99.95% = 21.9 min, 99.99% = 4.3 min), response time, resolution time. Measurement methodology (how vendors game it — excluding planned maintenance, measuring at edge not application layer). Security frameworks: SOC 2 Type I vs. Type II (Type II = 6+ month audit period), ISO 27001, FedRAMP (government), HITRUST (healthcare). Data rights at termination (portability, format, timeline — 30-90 days typical). Vendor lock-in risk factors. Acceptance testing (10-30 day UAT typical, deemed acceptance).
- `domain-names.md`: UDRP (Uniform Domain-Name Dispute-Resolution Policy) — 3 elements: identical/confusingly similar, no rights or legitimate interests, registered and used in bad faith. ACPA (Anticybersquatting Consumer Protection Act) — $1K-$100K statutory damages. ccTLD policies. Domain transfers (ICANN 60-day lock). Premium and aftermarket domains. Domain privacy/proxy services.

- [ ] **Step 1:** Read all 5 existing files in `knowledge/law/ip-and-technology/`
- [ ] **Step 2:** Read `patents-copyrights-trademarks.md` — identify content for each split file
- [ ] **Step 3:** Create `patents.md` (~130 lines) incorporating relevant content from split file + new depth
- [ ] **Step 4:** Create `trademarks.md` (~130 lines)
- [ ] **Step 5:** Create `copyrights.md` (~140 lines)
- [ ] **Step 6:** Delete `patents-copyrights-trademarks.md`
- [ ] **Step 7:** Deepen `trade-secrets.md` to ~130 lines
- [ ] **Step 8:** Deepen `open-source.md` to ~130 lines
- [ ] **Step 9:** Deepen `saas-technology.md` to ~140 lines
- [ ] **Step 10:** Create `domain-names.md` (~110 lines)
- [ ] **Step 11:** Update `overview.md` — route to patents.md, trademarks.md, copyrights.md (replacing single file), add domain-names.md
- [ ] **Step 12:** Validate all files meet quality criteria
- [ ] **Step 13:** Commit: `git add knowledge/law/ip-and-technology/ && git commit -m "Deepen ip-and-technology law area: split patents/trademarks/copyrights, 1 new sub-file"`

---

### Task 6: Securities (existing — deepen + 5 new sub-files)

**Files:**
- Modify: `knowledge/law/securities/overview.md`
- Modify: `knowledge/law/securities/exemptions.md` — deepen
- Modify: `knowledge/law/securities/equity-issuance.md` — deepen
- Create: `knowledge/law/securities/blue-sky-laws.md`
- Create: `knowledge/law/securities/insider-trading.md`
- Create: `knowledge/law/securities/public-company.md`
- Create: `knowledge/law/securities/crowdfunding.md`
- Create: `knowledge/law/securities/investment-advisers.md`

**Content guidance:**
- `exemptions.md`: Reg D — 506(b) (no general solicitation, up to 35 non-accredited), 506(c) (general solicitation OK, accredited only, reasonable steps to verify). Accredited investor definition ($200K income/$300K joint or $1M net worth excluding primary residence, or licensed Series 7/65/82). Reg S (offshore transactions, category 1/2/3). Reg A (Tier 1: $20M max, Tier 2: $75M max, state preemption for Tier 2 only). Integration doctrine (safe harbor: separate offerings 6+ months apart). Bad actor disqualification (Rule 506(d)). Form D filing (15 days after first sale). Resale restrictions (Rule 144: 6-month/1-year holding period, volume limitations).
- `equity-issuance.md`: Option grants — ISOs vs. NSOs (tax treatment: ISO no income tax at exercise if holding period met, NSO taxed at exercise as ordinary income). 409A valuation requirement (FMV at grant date, 409(A) safe harbors: independent appraisal, formula, binding formula). 83(b) election (30-day deadline from grant, irrevocable, no extension). Vesting schedules (4-year with 1-year cliff as standard). Acceleration (single trigger vs. double trigger). AMT exposure on ISO exercise. RSU taxation (taxed at vesting as ordinary income). Option repricing and exchange implications.
- `blue-sky-laws.md`: State securities registration requirements. NSMIA preemption for "covered securities" (listed on national exchange, Rule 506, Section 18 exemptions). State notice filing requirements even for preempted offerings. State-specific exemptions that differ from federal. Coordinated review through NASAA.
- `insider-trading.md`: Rule 10b-5 (material nonpublic information, breach of duty). Classical theory (corporate insider) vs. misappropriation theory (outsider). Tipper-tippee liability (Dirks test: personal benefit). Rule 10b5-1 trading plans (affirmative defense — adopted in good faith, no subsequent influence). Blackout periods. Penalties: up to $5M individual / $25M entity (criminal), 3x profit or loss avoided (civil). SEC whistleblower program (10-30% of sanctions over $1M).
- `public-company.md`: SOX key provisions — Section 302 (CEO/CFO certification), Section 404 (internal controls), Section 906 (criminal certification penalties up to $5M/20 years). Periodic reporting (10-K annual, 10-Q quarterly, 8-K current events — filing deadlines by filer category). Proxy rules (Schedule 14A, shareholder proposals Rule 14a-8). Regulation FD (fair disclosure). Dodd-Frank say-on-pay. Audit committee independence requirements.
- `crowdfunding.md`: Reg CF — $5M annual limit, investment limits based on income/net worth (greater of $2,500 or 5% if income or net worth <$124K, 10% if both >$124K). Portal requirements (registered with SEC and FINRA). Required disclosures (Form C). Resale restrictions (1-year holding). State preemption.
- `investment-advisers.md`: Investment Advisers Act of 1940. Registration thresholds (SEC: $100M+ AUM, state: below $100M). Fiduciary duty (duty of care + duty of loyalty). Form ADV Part 1/Part 2. Exempt reporting advisers (VC fund advisers, private fund advisers under $150M). Custody Rule (qualified custodian, surprise examination). Best execution. Pay-to-play rules.

- [ ] **Step 1:** Read all 3 existing files in `knowledge/law/securities/`
- [ ] **Step 2:** Deepen `exemptions.md` to ~140 lines
- [ ] **Step 3:** Deepen `equity-issuance.md` to ~130 lines
- [ ] **Step 4:** Create `blue-sky-laws.md` (~110 lines)
- [ ] **Step 5:** Create `insider-trading.md` (~130 lines)
- [ ] **Step 6:** Create `public-company.md` (~140 lines)
- [ ] **Step 7:** Create `crowdfunding.md` (~110 lines)
- [ ] **Step 8:** Create `investment-advisers.md` (~120 lines)
- [ ] **Step 9:** Update `overview.md` — add routing for 5 new sub-files
- [ ] **Step 10:** Validate all files meet quality criteria
- [ ] **Step 11:** Commit: `git add knowledge/law/securities/ && git commit -m "Deepen securities law area: 5 new sub-files, all files to practitioner depth"`

---

### Task 7: Financial Services (existing — deepen, split + 4 new sub-files)

**Files:**
- Modify: `knowledge/law/financial-services/overview.md`
- Modify: `knowledge/law/financial-services/payments-money-transmission.md` — deepen
- Modify: `knowledge/law/financial-services/kyc-aml.md` — deepen
- Delete: `knowledge/law/financial-services/compliance-licensing.md` — split into banking-regulation, lending, fintech
- Create: `knowledge/law/financial-services/banking-regulation.md`
- Create: `knowledge/law/financial-services/lending.md`
- Create: `knowledge/law/financial-services/fintech.md`
- Create: `knowledge/law/financial-services/cryptocurrency.md`
- Create: `knowledge/law/financial-services/pci-dss.md`

**Content guidance:**
- `payments-money-transmission.md`: Money transmission definition (receiving money for transmission). State licensing — 49 states require licenses (Montana exempt), bonding amounts ($25K-$7M+ depending on state and volume), application timelines (6-18 months). Federal: FinCEN MSB registration (within 180 days of establishment). PayFac model (payment facilitator as master merchant). Agent/payment processor exemption (acting on behalf of licensed entity). Marketplace payment flows (when does a marketplace "hold" funds?). Stored value and prepaid access. NACHA Operating Rules for ACH.
- `kyc-aml.md`: Bank Secrecy Act compliance program (5 pillars: internal controls, compliance officer, training, independent testing, risk assessment). Customer Due Diligence (CDD) — 4 elements: identify, verify, understand nature/purpose, ongoing monitoring. Enhanced Due Diligence (EDD) — for high-risk customers (PEPs, high-risk jurisdictions, unusual activity). CTR filing ($10K+ cash, within 15 days). SAR filing (no fixed threshold for suspicious activity, within 30 days of detection). OFAC SDN screening (real-time for transactions, batch for customer base). Beneficial ownership identification (25%+ equity or significant management control). Penalties: up to $1M per violation (civil), $500K + 10 years (criminal).
- `banking-regulation.md`: From compliance-licensing.md content + deepening. Regulatory framework: OCC (national banks), FDIC (state non-member banks), Federal Reserve (state member banks, BHCs). State banking departments. BaaS model (bank partner + fintech — regulatory expectations). De novo bank charter process (2-3 years). Capital and liquidity requirements (Basel III). Community Reinvestment Act. Examination cycle (12-18 months for well-rated banks).
- `lending.md`: From compliance-licensing.md content + deepening. TILA (Truth in Lending Act) — APR disclosure, right of rescission (3 days for home-secured), Regulation Z. ECOA (Equal Credit Opportunity Act) — prohibited bases, adverse action notice requirements (30 days). Fair lending (disparate treatment and disparate impact). Usury limits by state. State lending license requirements. CFPB enforcement authority. Small business lending (Section 1071 data collection).
- `fintech.md`: From compliance-licensing.md content + deepening. Fintech charter options (OCC special purpose charter — contested, state fintech licenses). Regulatory sandboxes (Arizona, Utah, others). Embedded finance (BaaS partnerships, regulatory responsibility allocation). State money transmitter license requirements for fintech models. Multi-state licensing through NMLS. API and open banking (no US regulatory mandate, contrast with EU PSD2). Regulatory evolution and uncertainty.
- `cryptocurrency.md`: FinCEN guidance (convertible virtual currency is money transmission). State money transmitter applicability (BitLicense in New York, varied elsewhere). SEC classification (Howey test for investment contracts — when is a token a security?). CFTC jurisdiction (digital commodity). IRS treatment (property, not currency — capital gains). Exchange registration requirements. Stablecoin regulation (pending legislation). Travel Rule (transmitters must share sender/recipient info for transfers >$3K).
- `pci-dss.md`: PCI DSS 4.0 (effective March 2025). Four compliance levels based on transaction volume (Level 1: 6M+ transactions/year — requires QSA audit). SAQ types (A, A-EP, B, B-IP, C, C-VT, D, P2PE). 12 requirements organized in 6 goals. Key requirements: encrypt cardholder data, maintain firewalls, implement access controls. Penalties: $5K-$100K/month from card brands. Liability shift for non-compliant merchants. Breach notification obligations.

- [ ] **Step 1:** Read all 4 existing files in `knowledge/law/financial-services/`
- [ ] **Step 2:** Read `compliance-licensing.md` — identify content for banking-regulation, lending, fintech
- [ ] **Step 3:** Deepen `payments-money-transmission.md` to ~140 lines
- [ ] **Step 4:** Deepen `kyc-aml.md` to ~140 lines
- [ ] **Step 5:** Create `banking-regulation.md` (~130 lines) incorporating content from compliance-licensing.md
- [ ] **Step 6:** Create `lending.md` (~130 lines) incorporating content from compliance-licensing.md
- [ ] **Step 7:** Create `fintech.md` (~120 lines) incorporating content from compliance-licensing.md
- [ ] **Step 8:** Delete `compliance-licensing.md`
- [ ] **Step 9:** Create `cryptocurrency.md` (~130 lines)
- [ ] **Step 10:** Create `pci-dss.md` (~120 lines)
- [ ] **Step 11:** Update `overview.md` — route to new files, remove compliance-licensing reference
- [ ] **Step 12:** Validate all files meet quality criteria
- [ ] **Step 13:** Commit: `git add knowledge/law/financial-services/ && git commit -m "Deepen financial-services law area: split compliance-licensing, 4 new sub-files"`

---

### Task 8: Litigation (existing — deepen + 5 new sub-files)

**Files:**
- Modify: `knowledge/law/litigation/overview.md`
- Modify: `knowledge/law/litigation/demand-letters.md` — deepen
- Modify: `knowledge/law/litigation/subpoenas.md` — deepen
- Modify: `knowledge/law/litigation/regulatory-inquiries.md` — deepen
- Modify: `knowledge/law/litigation/litigation-holds.md` — deepen
- Create: `knowledge/law/litigation/e-discovery.md`
- Create: `knowledge/law/litigation/settlement.md`
- Create: `knowledge/law/litigation/class-actions.md`
- Create: `knowledge/law/litigation/arbitration.md`
- Create: `knowledge/law/litigation/privilege.md`

**Content guidance:**
- `demand-letters.md`: Purpose (preserve claims, trigger response obligations, create record). Required elements by type (pre-suit, statutory notice, cease-and-desist). Statutory demand requirements (California Rosenthal Act, FDCPA for debt collection). Tone and strategy (preserve claims without waiving defenses). Response timeline conventions (10-30 days typical). Demand calculation methodology. Preservation of privilege.
- `subpoenas.md`: Types — trial subpoena, deposition subpoena, subpoena duces tecum, administrative subpoena. Service requirements (FRCP 45). Geographic limits (100-mile rule for trial, nationwide for federal administrative). Objection procedures (14-day written objection for FRCP 45). Privilege assertions (privilege log requirements). Cost-shifting (FRCP 45(d)(1) — undue burden). Third-party subpoenas (compliance obligations, motion to quash). State civil investigation demands (CIDs).
- `regulatory-inquiries.md`: Types — informal request, formal investigation, subpoena, CID. Agency timelines: SEC Wells notice (30-day response), DOJ (varies), FTC (varies, but typically 30-60 days for CID). Cooperation vs. adversarial positioning. Privilege in regulatory context (Upjohn, selective waiver debate). Parallel criminal/civil proceedings. Voluntary disclosure programs. Consent decrees and settlements. SEC whistleblower cooperation credit.
- `litigation-holds.md`: Trigger events (reasonable anticipation of litigation — not just filing). Duty to preserve (Zubulake line of cases). Scope determination (custodians, data sources, timeframe). Implementation procedures (written notice, acknowledgment, IT coordination). Technology systems (email, Slack/Teams, cloud, personal devices, backup tapes). Sanctions for spoliation (FRCP 37(e): curative measures for negligent loss, adverse inference/default for intent to deprive). Regular review and release.
- `e-discovery.md`: FRCP 26(f) meet-and-confer (discuss ESI protocols). Proportionality (FRCP 26(b)(1) — needs of the case, importance of issues, amount in controversy). Technology-assisted review (TAR/predictive coding — courts increasingly accept, Rio Tinto). Search terms and methodology (cooperation with opposing counsel). Privilege logs (FRCP 26(b)(5) — describe nature without revealing content). Production format (native vs. TIFF/PDF, metadata). Cost allocation (producing party bears cost, exceptions for inaccessible ESI). FRCP 37(e) safe harbor for routine, good-faith operation of systems. International considerations (GDPR restrictions on cross-border discovery).
- `settlement.md`: Settlement authority and negotiation. Structured settlements. Release language (general vs. specific, known vs. unknown claims, California Civil Code 1542 waiver). Confidentiality provisions. Non-disparagement clauses. Enforcement mechanisms (consent judgment vs. contract). Tax treatment (physical injury = excludable, emotional distress = taxable, attorney fees). Class settlement approval requirements (FRCP 23(e)). Mediator selection and process. Settlement privilege (FRE 408).
- `class-actions.md`: FRCP 23 requirements — (a) numerosity, commonality, typicality, adequacy; (b)(1)/(b)(2)/(b)(3) categories. Certification standard (Wal-Mart v. Dukes — common questions must predominate). Ascertainability requirement (circuit split). Discovery before certification. Settlement class certification. Class counsel selection (FRCP 23(g)). Cy pres distribution. Multidistrict litigation (MDL — 28 USC 1407). CAFA jurisdiction ($5M + minimal diversity). Arbitration clauses and class waiver (Epic Systems, AT&T v. Concepcion).
- `arbitration.md`: Federal Arbitration Act (FAA) — strong policy favoring arbitration. AAA and JAMS rules (commercial, employment, consumer). Arbitration clause drafting (scope, rules, location, number of arbitrators, discovery limits, appeal rights). Class arbitration (opt-in required after Epic Systems). Unconscionability challenges (procedural + substantive). International arbitration (UNCITRAL, ICC, ICSID). Confirmation and vacatur (FAA Section 10 — very limited grounds: corruption, evident partiality, exceeding powers, imperfect execution). Cost allocation. Arbitrator selection.
- `privilege.md`: Attorney-client privilege (elements: attorney, client, communication, for purpose of legal advice, in confidence). Corporate privilege (Upjohn — control group test vs. subject matter test). Work product doctrine (FRCP 26(b)(3) — ordinary vs. opinion work product). Waiver (voluntary disclosure, inadvertent disclosure — FRE 502, clawback agreements). Crime-fraud exception. Common interest doctrine (joint defense agreements). Privilege log obligations. In-house counsel dual role (business vs. legal advice — Kellogg).

- [ ] **Step 1:** Read all 5 existing files in `knowledge/law/litigation/`
- [ ] **Step 2:** Deepen `demand-letters.md` to ~120 lines
- [ ] **Step 3:** Deepen `subpoenas.md` to ~130 lines
- [ ] **Step 4:** Deepen `regulatory-inquiries.md` to ~130 lines
- [ ] **Step 5:** Deepen `litigation-holds.md` to ~130 lines
- [ ] **Step 6:** Create `e-discovery.md` (~140 lines)
- [ ] **Step 7:** Create `settlement.md` (~130 lines)
- [ ] **Step 8:** Create `class-actions.md` (~130 lines)
- [ ] **Step 9:** Create `arbitration.md` (~130 lines)
- [ ] **Step 10:** Create `privilege.md` (~130 lines)
- [ ] **Step 11:** Update `overview.md` — add routing for 5 new sub-files
- [ ] **Step 12:** Validate all files meet quality criteria
- [ ] **Step 13:** Commit: `git add knowledge/law/litigation/ && git commit -m "Deepen litigation law area: 5 new sub-files, all files to practitioner depth"`

---

### Task 9: Antitrust (existing — split + 3 new sub-files)

**Files:**
- Modify: `knowledge/law/antitrust/overview.md`
- Delete: `knowledge/law/antitrust/competition-law.md` — split into 3
- Create: `knowledge/law/antitrust/horizontal-restraints.md`
- Create: `knowledge/law/antitrust/vertical-restraints.md`
- Create: `knowledge/law/antitrust/monopolization.md`
- Create: `knowledge/law/antitrust/merger-review.md`
- Create: `knowledge/law/antitrust/state-antitrust.md`

**Content guidance:**
- `horizontal-restraints.md`: Sherman Act Section 1 — per se illegal: price-fixing, bid rigging, market allocation, group boycotts. No-poach agreements (DOJ criminal enforcement since 2016). Wage-fixing agreements. Per se vs. rule of reason standard. Penalties: up to $100M corporate / $1M individual (criminal), treble damages (private). Leniency program (first to report gets immunity from criminal prosecution). Statute of limitations: 4 years (private), 5 years (criminal).
- `vertical-restraints.md`: Rule of reason analysis (Leegin, 2007 — overturned per se for RPM). Resale price maintenance (minimum RPM analyzed under rule of reason, maximum RPM per se legal). Exclusive dealing (rule of reason — substantial foreclosure test). Tying arrangements (per se if market power in tying product + separate products + forced purchase + anticompetitive effects). Territorial restrictions (rule of reason). Refusal to deal (limited duty under Aspen Skiing, Trinko).
- `monopolization.md`: Sherman Act Section 2 — monopolization (monopoly power + willful acquisition/maintenance) and attempted monopolization (specific intent + dangerous probability). Monopoly power: typically 70%+ market share (but market definition is key). Predatory pricing (below-cost pricing + dangerous probability of recoupment — Brooke Group). Exclusive dealing as monopolization. Essential facilities doctrine (controversial, limited application). Unilateral refusal to deal.
- `merger-review.md`: HSR Act — filing thresholds (adjusted annually: $119.5M for 2024, size-of-persons test). Filing requirements (HSR Form, timing). Waiting period (30 days initial, extendable via Second Request — average 6-12 months for Second Request investigations). DOJ vs. FTC allocation. Merger analysis framework (Clayton Act Section 7: substantially lessen competition). HHI market concentration (unconcentrated <1500, moderate 1500-2500, concentrated >2500). Remedies: structural (divestiture), behavioral (consent decree). Gun-jumping (closing before clearance — penalties up to $50K/day).
- `state-antitrust.md`: State AG enforcement authority (parens patriae under Clayton Act Section 4C). State antitrust statutes (often broader than federal — California Cartwright Act allows per se condemnation of vertical restraints). Multi-state AG investigations. State merger review (handful of states have separate merger notification). Relationship between state and federal enforcement. Illinois Brick indirect purchaser exception (many states reject, allowing indirect purchaser suits).

- [ ] **Step 1:** Read all 2 existing files in `knowledge/law/antitrust/`
- [ ] **Step 2:** Read `competition-law.md` — identify content split among 3 new files
- [ ] **Step 3:** Create `horizontal-restraints.md` (~130 lines) incorporating relevant content
- [ ] **Step 4:** Create `vertical-restraints.md` (~120 lines) incorporating relevant content
- [ ] **Step 5:** Create `monopolization.md` (~120 lines)
- [ ] **Step 6:** Delete `competition-law.md`
- [ ] **Step 7:** Create `merger-review.md` (~130 lines)
- [ ] **Step 8:** Create `state-antitrust.md` (~110 lines)
- [ ] **Step 9:** Update `overview.md` — route to new split files + 2 new files
- [ ] **Step 10:** Validate all files meet quality criteria
- [ ] **Step 11:** Commit: `git add knowledge/law/antitrust/ && git commit -m "Deepen antitrust law area: split competition-law into 3, add merger-review and state-antitrust"`

---

### Task 10: Insurance (existing — split + 2 new sub-files)

**Files:**
- Modify: `knowledge/law/insurance/overview.md`
- Delete: `knowledge/law/insurance/coverage-types.md` — split into 5
- Create: `knowledge/law/insurance/commercial-general-liability.md`
- Create: `knowledge/law/insurance/professional-liability.md`
- Create: `knowledge/law/insurance/cyber-liability.md`
- Create: `knowledge/law/insurance/directors-officers.md`
- Create: `knowledge/law/insurance/employment-practices.md`
- Create: `knowledge/law/insurance/coverage-analysis.md`
- Create: `knowledge/law/insurance/claims-procedures.md`

**Content guidance:**
- `commercial-general-liability.md`: CGL (ISO form CG 00 01). Coverage A (bodily injury, property damage — occurrence-based). Coverage B (personal/advertising injury). Coverage C (medical payments). Key exclusions: expected/intended injury, contractual liability (exception for insured contract), pollution, professional services, auto, workers' comp. Additional insured endorsements (CG 20 10, CG 20 37). Occurrence vs. claims-made. Per-occurrence and aggregate limits. Duty to defend vs. duty to indemnify.
- `professional-liability.md`: E&O coverage (claims-made basis, typically). Technology E&O (software failures, SaaS outages, data loss). Medical malpractice. Legal malpractice. Key features: retroactive date, extended reporting period (tail), consent to settle. Prior acts coverage. Defense costs (inside vs. outside limits). Network security coverage overlap with cyber.
- `cyber-liability.md`: First-party coverage (breach response costs, business interruption, data recovery, ransomware/extortion). Third-party coverage (regulatory defense, PCI fines, media liability). Key exclusions: unencrypted devices, known vulnerabilities, infrastructure failure, war/terrorism. Sub-limits (common for ransomware, PCI fines). Retroactive date importance. Typical limits ($1M-$10M for mid-market). Notable exclusions and carve-backs. Tower/excess coverage for large programs.
- `directors-officers.md`: Side A (direct coverage when company can't indemnify — bankruptcy scenario). Side B (reimburses company for indemnification of D&Os). Side C (entity coverage for securities claims — public companies). Key exclusions: fraud/dishonesty (final adjudication), prior/pending litigation, insured vs. insured. Severability of exclusions. Allocation issues (covered vs. uncovered claims/parties). Drop-down provisions. Independent director liability policies.
- `employment-practices.md`: EPLI coverage: discrimination, harassment, wrongful termination, retaliation, failure to promote, wage and hour (often excluded or sub-limited). Claims-made basis. Third-party coverage (claims by customers/vendors). Wage and hour exclusion (some carriers now offering limited coverage). Key considerations: prior acts, pending claims, retroactive date. Defense obligation. Typical retention/deductible.
- `coverage-analysis.md`: Claims-made vs. occurrence policies (trigger, tail, retroactive date). Excess/umbrella coverage (following form, drop-down, gap coverage). Aggregate limits (general vs. per-project/per-location). Subrogation and waiver of subrogation (contractual requirements). Additional insured (primary vs. excess, ongoing vs. completed operations). Certificate of insurance (what it does and doesn't prove). Self-insured retention vs. deductible (legal distinction). Coordination of benefits. Priority of coverage (other insurance clauses).
- `claims-procedures.md`: Notice requirements (claims-made: notice during policy period or extended reporting period — late notice can void coverage). Cooperation clause (duty to cooperate, consequences of breach). Defense counsel selection (duty to defend states: insurer selects; some states allow insured to select when conflict of interest). Reservation of rights letters. Coverage litigation. Subrogation rights and timing. Settlement authority (consent-to-settle provisions, hammer clauses). Proof of loss requirements.

- [ ] **Step 1:** Read all 2 existing files in `knowledge/law/insurance/`
- [ ] **Step 2:** Read `coverage-types.md` — identify content for each of the 5 split files
- [ ] **Step 3:** Create `commercial-general-liability.md` (~130 lines)
- [ ] **Step 4:** Create `professional-liability.md` (~120 lines)
- [ ] **Step 5:** Create `cyber-liability.md` (~130 lines)
- [ ] **Step 6:** Create `directors-officers.md` (~120 lines)
- [ ] **Step 7:** Create `employment-practices.md` (~110 lines)
- [ ] **Step 8:** Delete `coverage-types.md`
- [ ] **Step 9:** Create `coverage-analysis.md` (~130 lines)
- [ ] **Step 10:** Create `claims-procedures.md` (~130 lines)
- [ ] **Step 11:** Update `overview.md` — route to 7 new files
- [ ] **Step 12:** Validate all files meet quality criteria
- [ ] **Step 13:** Commit: `git add knowledge/law/insurance/ && git commit -m "Deepen insurance law area: split coverage-types into 5, add coverage-analysis and claims-procedures"`

---

### Task 11: International Trade (existing — deepen + 4 new sub-files)

**Files:**
- Modify: `knowledge/law/international-trade/overview.md`
- Modify: `knowledge/law/international-trade/sanctions.md` — deepen
- Modify: `knowledge/law/international-trade/export-controls.md` — deepen
- Create: `knowledge/law/international-trade/customs.md`
- Create: `knowledge/law/international-trade/anti-boycott.md`
- Create: `knowledge/law/international-trade/foreign-investment.md`
- Create: `knowledge/law/international-trade/anti-corruption.md`

**Content guidance:**
- `sanctions.md`: OFAC administration. SDN List screening (real-time for transactions). Sanctions programs: comprehensive (Cuba, Iran, North Korea, Syria, Crimea/DNR/LNR) vs. targeted (Russia sectoral, Venezuela, Myanmar). 50% Rule (entity owned 50%+ by blocked person is also blocked). General licenses and specific licenses. Penalties: up to $356,579 per violation (civil, IEEPA) or $1M and 20 years (criminal). Voluntary self-disclosure (VSDs — significant mitigation). Compliance frameworks (OFAC Framework for Compliance Commitments). Sanctions screening tools and best practices.
- `export-controls.md`: EAR (Commerce/BIS) — Commerce Control List (CCL), ECCN classification, EAR99 (no license required for most destinations). ITAR (State/DDTC) — US Munitions List (USML), stricter than EAR, registration required. License types: individual validated, general, exceptions. Deemed export rule (disclosure of controlled technology to foreign nationals in US). Encryption controls (Category 5 Part 2, License Exception ENC). Entity List, Denied Persons List, Unverified List. Penalties: EAR up to $364,992 per violation (civil) or $1M and 20 years (criminal). End-use and end-user restrictions. De minimis rule (US-origin content thresholds: 25% for most, 10% for E:1/E:2 countries).
- `customs.md`: Harmonized System (HS) classification. Customs valuation (transaction value method as primary). Country of origin (substantial transformation test). Free Trade Zones. Customs bonds. Duty drawback. First Sale Rule. Customs broker requirements. Penalties for misclassification. Forced labor import prohibition (UFLPA — Xinjiang). Antidumping and countervailing duties.
- `anti-boycott.md`: EAR anti-boycott provisions (Part 760) — prohibit US persons from participating in/supporting unsanctioned foreign boycotts (primarily Arab League boycott of Israel). Prohibited conduct: furnishing boycott-related information, refusing to do business with boycotted country, discriminating based on race/religion/sex/national origin. Reporting requirements (Form BIS-621 — within 30 days of receipt of boycott request). Tax penalties (IRC 999 — loss of foreign tax credit, deferral). Penalties: $250K per violation (civil), $1M and 5 years (criminal).
- `foreign-investment.md`: CFIUS (Committee on Foreign Investment in the US). FIRRMA (2018) expanded jurisdiction. Mandatory filing triggers: critical technology + US government customer, critical infrastructure, sensitive personal data of 1M+ US persons. Voluntary filing (safe harbor from future review). Review timeline: 45-day review, 45-day investigation, 15-day presidential decision. Mitigation agreements (security agreements, board observers, technology carve-outs). Penalties for failure to file: up to transaction value. National security factors.
- `anti-corruption.md`: FCPA — anti-bribery provisions (prohibit payments to foreign government officials to obtain/retain business) and books-and-records provisions (accurate books, adequate internal controls). Jurisdiction: US persons, issuers, agents acting within US. Exceptions: facilitating payments (but many companies prohibit), reasonable bona fide expenditures. Penalties: up to $250K individual / $2M entity per violation (criminal bribery), $16,000 per violation (civil books-and-records). UK Bribery Act (broader — includes private commercial bribery, no facilitating payment exception, "adequate procedures" defense). DOJ FCPA Corporate Enforcement Policy (presumption of declination for voluntary self-disclosure + cooperation + remediation). Cross-reference: `white-collar-investigations/fcpa-enforcement.md` for enforcement procedure.

- [ ] **Step 1:** Read all 3 existing files in `knowledge/law/international-trade/`
- [ ] **Step 2:** Deepen `sanctions.md` to ~140 lines
- [ ] **Step 3:** Deepen `export-controls.md` to ~140 lines
- [ ] **Step 4:** Create `customs.md` (~120 lines)
- [ ] **Step 5:** Create `anti-boycott.md` (~120 lines)
- [ ] **Step 6:** Create `foreign-investment.md` (~130 lines)
- [ ] **Step 7:** Create `anti-corruption.md` (~140 lines)
- [ ] **Step 8:** Update `overview.md` — add routing for 4 new sub-files
- [ ] **Step 9:** Validate all files meet quality criteria
- [ ] **Step 10:** Commit: `git add knowledge/law/international-trade/ && git commit -m "Deepen international-trade law area: 4 new sub-files, all files to practitioner depth"`

---

### Task 12: Product Counseling (existing — deepen + 3 new sub-files)

**Files:**
- Modify: `knowledge/law/product-counseling/overview.md`
- Modify: `knowledge/law/product-counseling/product-liability.md` — deepen
- Create: `knowledge/law/product-counseling/recalls.md`
- Create: `knowledge/law/product-counseling/warnings-labels.md`
- Create: `knowledge/law/product-counseling/consumer-product-safety.md`

**Content guidance:**
- `product-liability.md`: Three theories: design defect (risk-utility test vs. consumer expectations test — varies by state), manufacturing defect (deviation from intended design — strict liability), failure to warn (adequacy of warnings, learned intermediary doctrine for prescription products). Restatement (Third) of Torts: Products Liability. Strict liability vs. negligence (most states apply strict liability for manufacturing defects). Comparative fault and assumption of risk. Damages: economic (repair/replacement, lost profits), personal injury (medical, pain and suffering), punitive (gross negligence or willful misconduct — some states cap at 3-4x compensatory). Statute of repose (varies by state: 6-15 years from sale). Class certification for product cases.
- `recalls.md`: Voluntary vs. mandatory recalls. CPSC authority (Consumer Product Safety Act Section 15). FDA recalls (Class I: serious health consequences, Class II: temporary/reversible, Class III: unlikely adverse health). NHTSA vehicle recalls. Recall process: investigation, determination, notification, remedy. Costs (manufacturer bears). Reporting obligations (CPSC Section 15(b) — 24-hour reporting for serious injury/death). Product liability implications of recall. Insurance coverage for recall costs. Public notification requirements.
- `warnings-labels.md`: Adequacy of warnings (content, prominence, comprehensibility). State-of-the-art defense (warnings sufficient based on knowledge at time of sale). Post-sale duty to warn (Restatement Third, Section 10). Learned intermediary doctrine (prescription drugs/medical devices — warning to prescriber sufficient). Bilingual requirements (state-specific). Prop 65 (California — specific warning language, $2,500/day penalty, bounty hunter enforcement). OSHA hazard communication (SDS requirements). Product-specific labeling requirements (food, cosmetics, chemicals).
- `consumer-product-safety.md`: CPSA (Consumer Product Safety Act). CPSIA (Consumer Product Safety Improvement Act, 2008) — lead and phthalate limits for children's products, testing and certification, tracking labels. Third-party testing requirements. General Certificate of Conformity (GCC) for non-children's products. Children's Product Certificate (CPC). Import requirements (filing with CPSC). Substantial product hazard reporting (Section 15(b)). Civil penalties up to $120K per violation, $17.15M cap. Criminal penalties for knowing violations.

- [ ] **Step 1:** Read all 2 existing files in `knowledge/law/product-counseling/`
- [ ] **Step 2:** Deepen `product-liability.md` to ~140 lines
- [ ] **Step 3:** Create `recalls.md` (~120 lines)
- [ ] **Step 4:** Create `warnings-labels.md` (~120 lines)
- [ ] **Step 5:** Create `consumer-product-safety.md` (~120 lines)
- [ ] **Step 6:** Update `overview.md` — add routing for 3 new sub-files
- [ ] **Step 7:** Validate all files meet quality criteria
- [ ] **Step 8:** Commit: `git add knowledge/law/product-counseling/ && git commit -m "Deepen product-counseling law area: 3 new sub-files, all files to practitioner depth"`

---

## Phase 2: Create New Law/ Areas (14 new areas)

Each task creates a complete new area from scratch: overview.md + all sub-files. Tasks are independent and can be parallelized. Use the same templates and quality criteria as Phase 1.

---

### Task 13: AI & Automation (new area — 8 files)

**Files:**
- Create: `knowledge/law/ai-and-automation/overview.md`
- Create: `knowledge/law/ai-and-automation/eu-ai-act.md`
- Create: `knowledge/law/ai-and-automation/us-state-ai-laws.md`
- Create: `knowledge/law/ai-and-automation/algorithmic-accountability.md`
- Create: `knowledge/law/ai-and-automation/training-data.md`
- Create: `knowledge/law/ai-and-automation/model-ownership.md`
- Create: `knowledge/law/ai-and-automation/deepfakes-synthetic-media.md`
- Create: `knowledge/law/ai-and-automation/automated-decision-making.md`

**Content guidance:**
- `overview.md`: Trigger on: AI, artificial intelligence, machine learning, algorithm, automated decision, model, training data, neural network, LLM, generative AI, deepfake, synthetic media, bias audit, AI governance, EU AI Act, algorithmic accountability.
- `eu-ai-act.md`: Risk tiers — Unacceptable (banned: social scoring, real-time biometric ID in public spaces with exceptions), High-risk (Annex III: biometrics, critical infrastructure, education, employment, credit scoring, law enforcement, migration, justice — conformity assessment, risk management system, data governance, transparency, human oversight, accuracy/robustness), Limited risk (transparency obligations only — chatbots, deepfakes, emotion recognition), Minimal risk (voluntary codes of conduct). General-purpose AI models (systemic risk threshold: 10^25 FLOPs). Fines: up to EUR 35M or 7% global turnover (banned practices), EUR 15M or 3% (other violations). Timeline: prohibitions effective Feb 2025, high-risk obligations Aug 2026.
- `us-state-ai-laws.md`: Colorado AI Act (SB 205, 2024) — developers and deployers of high-risk AI systems, bias testing, impact assessments, consumer notification. Illinois AI Video Interview Act (employer disclosure, consent). Connecticut (disclosure for automated employment decisions). Texas (deepfake disclosure). NYC Local Law 144 (automated employment decision tools — annual bias audit, public summary). State-by-state comparison matrix.
- `algorithmic-accountability.md`: Bias testing frameworks (disparate impact analysis, four-fifths rule from EEOC). Impact assessments (scope, methodology, frequency). Transparency requirements (explainability, right to explanation). Audit requirements (internal vs. third-party). NIST AI Risk Management Framework. EEOC guidance on AI in employment (May 2023). FTC enforcement actions on AI claims.
- `training-data.md`: Copyright and training data — fair use analysis (Authors Guild v. Google, Thomson Reuters v. ROSS, NYT v. OpenAI). Opt-out mechanisms (robots.txt, meta tags, contractual). Data licensing for training. Web scraping legality (CFAA, state computer access laws, ToS enforcement). Right of publicity implications. GDPR lawful basis for training (legitimate interest, consent). Synthetic data as alternative.
- `model-ownership.md`: Copyright Office guidance (human authorship required for registration — Thaler v. Perlmutter). Work-for-hire for AI-assisted outputs (human direction/selection). Fine-tuned model ownership (base model license vs. fine-tuned weights). Model-as-a-service vs. model ownership. Output ownership in commercial contracts. Trade secret protection for models. Patent eligibility for AI inventions (Thaler v. Vidal — AI cannot be named inventor).
- `deepfakes-synthetic-media.md`: Federal: no comprehensive law (as of 2024). State laws: Texas, California, Virginia, others — targeting election interference, non-consensual intimate images. Disclosure requirements for political ads (several states). Platform responsibilities. DMCA applicability. Defamation liability for synthetic media. FTC enforcement (deceptive practices). EU AI Act transparency requirement for deepfakes (Art 50).
- `automated-decision-making.md`: GDPR Article 22 — right not to be subject to solely automated decisions with legal/significant effects, exceptions (contract, law, explicit consent), safeguards (human intervention, right to contest). ECOA and fair lending (algorithmic credit decisions). EEOC and Title VII (AI in employment — disparate impact). FCRA (consumer reporting, adverse action notice when using algorithmic scoring). State laws requiring human review of automated decisions.

- [ ] **Step 1:** Create directory `knowledge/law/ai-and-automation/`
- [ ] **Step 2:** Create `overview.md` with trigger conditions and sub-file routing
- [ ] **Step 3:** Create `eu-ai-act.md` (~140 lines)
- [ ] **Step 4:** Create `us-state-ai-laws.md` (~130 lines)
- [ ] **Step 5:** Create `algorithmic-accountability.md` (~120 lines)
- [ ] **Step 6:** Create `training-data.md` (~130 lines)
- [ ] **Step 7:** Create `model-ownership.md` (~120 lines)
- [ ] **Step 8:** Create `deepfakes-synthetic-media.md` (~120 lines)
- [ ] **Step 9:** Create `automated-decision-making.md` (~130 lines)
- [ ] **Step 10:** Validate all files meet quality criteria
- [ ] **Step 11:** Commit: `git add knowledge/law/ai-and-automation/ && git commit -m "Add ai-and-automation law area: 8 files covering EU AI Act, state laws, training data, model ownership"`

---

### Task 14: Tax (new area — 7 files)

**Files:**
- Create: `knowledge/law/tax/overview.md`
- Create: `knowledge/law/tax/sales-tax-vat.md`
- Create: `knowledge/law/tax/withholding.md`
- Create: `knowledge/law/tax/transfer-pricing.md`
- Create: `knowledge/law/tax/tax-indemnities.md`
- Create: `knowledge/law/tax/international-tax.md`
- Create: `knowledge/law/tax/equity-compensation-tax.md`

**Content guidance:**
- `overview.md`: Trigger on: tax, sales tax, VAT, withholding, transfer pricing, FIRPTA, 409A, 83(b), gross-up, tax indemnity, nexus, tax exemption, AMT, equity compensation, ISO, NSO, RSU.
- `sales-tax-vat.md`: Economic nexus (South Dakota v. Wayfair, 2018) — $100K revenue or 200 transactions threshold (varies by state). SaaS taxability (state-by-state: taxable in ~half of states as of 2024). Marketplace facilitator laws (marketplace collects and remits). Digital goods/services taxation. VAT in EU (standard rates 17-27%, reverse charge for B2B cross-border). UK VAT post-Brexit. Exemptions and exemption certificates. Streamlined Sales Tax Agreement.
- `withholding.md`: Backup withholding (24% on non-exempt payments when no TIN). NRA withholding (30% default, reduced by treaty). W-8BEN and W-8BEN-E (treaty benefits, Chapter 3 and Chapter 4). W-9 (TIN certification). FATCA (Foreign Account Tax Compliance Act — 30% withholding on withholdable payments to non-participating FFIs). QI (Qualified Intermediary) agreements. State withholding requirements for non-resident service providers.
- `transfer-pricing.md`: Arm's length standard (IRC 482, OECD Guidelines). Methods: CUP, resale price, cost plus, TNMM, profit split. Documentation requirements (contemporaneous, master file, local file, CbCR for MNEs with EUR 750M+ revenue). Advance Pricing Agreements (APAs — unilateral, bilateral, multilateral). Penalties: 20-40% penalty on transfer pricing adjustments if undocumented. OECD BEPS Actions 8-10. Intercompany services, loans, and intangibles.
- `tax-indemnities.md`: Gross-up provisions (if tax is imposed, payer increases payment so recipient receives full amount net of tax). Tax representations (US tax status, treaty eligibility, FATCA compliance). Change-in-law clauses (allocation of risk if tax laws change). Withholding tax indemnification. Tax equalization (expatriate assignments). Tax-free reorganization conditions (IRC 368). Tax sharing agreements.
- `international-tax.md`: FIRPTA (Foreign Investment in Real Property Tax Act — 15% withholding on disposition by foreign person). Treaty benefits (reduced withholding rates, PE avoidance). Permanent establishment risk (fixed place of business, agent PE, service PE). GILTI (Global Intangible Low-Taxed Income — 10.5% minimum tax on foreign earnings). BEAT (Base Erosion and Anti-Abuse Tax — 10% of modified taxable income). Pillar Two (global minimum tax 15% — GloBE rules). Subpart F income.
- `equity-compensation-tax.md`: Section 409A — nonqualified deferred compensation. Compliance requirements: fixed payment date or permissible payment event (separation from service, change in control, disability, death, unforeseeable emergency, set time). FMV at grant date requirement (penalties: 20% additional tax + premium interest if non-compliant). 409A valuation safe harbors: independent appraisal (12-month validity), formula-based (not available to public companies). Section 83(b) election — 30-day irrevocable deadline from grant, no extension, file with IRS + copy to employer. ISO vs. NSO tax treatment: ISO (no income tax at exercise if holding period met: 2 years from grant + 1 year from exercise, but AMT adjustment), NSO (ordinary income at exercise on spread). RSU taxation (ordinary income at vesting). Cross-reference: `securities/equity-issuance.md` for securities law aspects.

- [ ] **Step 1:** Create directory `knowledge/law/tax/`
- [ ] **Step 2:** Create `overview.md` with trigger conditions
- [ ] **Step 3:** Create `sales-tax-vat.md` (~130 lines)
- [ ] **Step 4:** Create `withholding.md` (~120 lines)
- [ ] **Step 5:** Create `transfer-pricing.md` (~130 lines)
- [ ] **Step 6:** Create `tax-indemnities.md` (~110 lines)
- [ ] **Step 7:** Create `international-tax.md` (~130 lines)
- [ ] **Step 8:** Create `equity-compensation-tax.md` (~140 lines)
- [ ] **Step 9:** Validate all files meet quality criteria
- [ ] **Step 10:** Commit: `git add knowledge/law/tax/ && git commit -m "Add tax law area: 7 files covering sales tax, withholding, transfer pricing, international, equity comp"`

---

### Task 15: Real Estate (new area — 7 files)

Create `knowledge/law/real-estate/` with: `overview.md`, `commercial-leases.md`, `zoning-land-use.md`, `construction.md`, `environmental-covenants.md`, `easements-encumbrances.md`, `real-estate-transactions.md`

Follow the same pattern as Tasks 13-14 with content guidance covering: commercial lease structures (NNN, gross, modified gross, CAM, build-out, TI allowances, assignment/subletting, default/cure), zoning (use classifications, variances, conditional use permits, nonconforming use, spot zoning), construction (mechanic's liens by state, Miller Act, payment/performance bonds, AIA contract forms, delay claims, change orders), environmental (CERCLA liability, Phase I/II assessments, brownfields, environmental indemnities), easements (appurtenant vs. in gross, creation, termination, utility easements, title exceptions), and real estate transactions (title insurance, surveys, due diligence periods, representations, closing conditions, recording requirements).

- [ ] **Step 1:** Create directory and all 7 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 16: Environmental & ESG (new area — 6 files)

Create `knowledge/law/environmental-esg/` with: `overview.md`, `climate-disclosure.md`, `environmental-liability.md`, `esg-reporting.md`, `sustainability-representations.md`, `environmental-due-diligence.md`

Content covers: SEC climate disclosure rules (Scope 1/2/3, material impact), EU CSRD (Corporate Sustainability Reporting Directive), California SB 253/261, CERCLA (strict, joint and several, retroactive liability), RCRA, Clean Air Act/Clean Water Act permitting, GRI/SASB/TCFD/ISSB frameworks, greenwashing enforcement (FTC Green Guides, EU Green Claims Directive), Phase I/II environmental site assessments (ASTM E1527-21), environmental insurance, remediation cost allocation.

- [ ] **Step 1:** Create directory and all 6 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 17: Bankruptcy & Restructuring (new area — 7 files)

Create `knowledge/law/bankruptcy-restructuring/` with: `overview.md`, `automatic-stay.md`, `executory-contracts.md`, `preference-actions.md`, `ip-licenses-in-bankruptcy.md`, `safe-harbors.md`, `creditor-rights.md`

Content covers: automatic stay (362 — scope, relief motions, willful violation penalties), executory contracts (365 — assumption/rejection/assignment, cure amounts, 60-day deadline in Chapter 7), preference actions (547 — 90-day look-back, 1 year for insiders, ordinary course defense, contemporaneous exchange defense), Section 365(n) (IP licensee protections — retain rights if licensor rejects), financial contract safe harbors (546(e), 555-561 — securities, commodities, swap agreements, repos), creditor rights (proof of claim, secured vs. unsecured, priority claims under 507, adequate protection).

- [ ] **Step 1:** Create directory and all 7 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 18: Government Contracts (new area — 7 files)

Create `knowledge/law/government-contracts/` with: `overview.md`, `far-dfar.md`, `procurement.md`, `compliance-certifications.md`, `foia.md`, `sovereign-immunity.md`, `small-business.md`

Content covers: FAR/DFAR key clauses (52.212 commercial items, 52.227 IP, 52.244 subcontracting), flowdown requirements, CAS (Cost Accounting Standards), procurement methods (sealed bidding, competitive negotiation, sole source), GAO bid protests, certifications (SAM registration, debarment, size standards), FOIA (Exemption 4 confidential business information, submitter notice), Tucker Act (Court of Federal Claims), 11th Amendment sovereign immunity, small business set-asides (8(a), HUBZone, SDVOSB, WOSB, SBA mentor-protege).

- [ ] **Step 1:** Create directory and all 7 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 19: Healthcare (new area — 7 files)

Create `knowledge/law/healthcare/` with: `overview.md`, `hipaa-compliance.md`, `stark-law.md`, `anti-kickback.md`, `provider-agreements.md`, `fda-regulation.md`, `telehealth.md`

Content covers: HIPAA (Privacy Rule covered entities/BAs, minimum necessary, PHI definition, Security Rule safeguards, Breach Notification Rule — 60-day deadline, BAA requirements, OCR enforcement — penalties $100-$50K per violation up to $1.5M/year per category), Stark Law (self-referral prohibition, designated health services, exceptions — in-office ancillary, fair market value, bona fide employment), Anti-Kickback Statute (42 USC 1320a-7b — $100K per violation, 10 years criminal, safe harbors — investment interests, personal services, employee), provider agreements (participation agreements, credentialing, managed care contracting, reimbursement), FDA (510(k) vs. PMA pathway, drug approval NDA/ANDA, labeling requirements, post-market surveillance), telehealth (state licensure requirements, interstate compacts, Ryan Haight Act for prescribing, reimbursement parity laws).

- [ ] **Step 1:** Create directory and all 7 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 20: Advertising & Media (new area — 6 files)

Create `knowledge/law/advertising-media/` with: `overview.md`, `advertising-standards.md`, `content-licensing.md`, `right-of-publicity.md`, `influencer-disclosures.md`, `defamation.md`

Content covers: advertising substantiation (FTC "reasonable basis"), comparative advertising (Lanham Act 43(a)), native advertising disclosure, content licensing (rights grants — exclusive/non-exclusive, territory, term, residuals, union requirements SAG-AFTRA), right of publicity (state-by-state — California Civil Code 3344, New York Civil Rights Law 50/51, deceased personality rights, AI-generated likenesses), influencer disclosures (FTC Endorsement Guides 2023, material connection disclosure, clear and conspicuous standard, platform-specific rules, enforcement actions), defamation (elements: false statement of fact, publication, fault, damages; defenses: truth, opinion, privilege; Section 230 immunity for platforms — but not for content created by the platform; anti-SLAPP statutes by state).

Cross-references: `consumer-protection/endorsements-testimonials.md` for FTC enforcement standards.

- [ ] **Step 1:** Create directory and all 6 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 21: Nonprofit (new area — 6 files)

Create `knowledge/law/nonprofit/` with: `overview.md`, `tax-exempt-status.md`, `charitable-solicitation.md`, `donor-restrictions.md`, `unrelated-business-income.md`, `nonprofit-governance.md`

Content covers: 501(c)(3) requirements (organized and operated exclusively for exempt purposes, no private inurement, no substantial lobbying, no political campaign intervention), 501(c)(4) social welfare, 501(c)(6) trade associations, application (Form 1023/1023-EZ), annual reporting (Form 990 — public disclosure), state charitable solicitation registration (41 states require, unified registration statement), donor restrictions (restricted vs. unrestricted, cy pres doctrine, endowment management — UPMIFA), UBIT (IRC 512-514 — regularly carried on trade/business substantially unrelated to exempt purpose, exceptions — volunteer labor, donated goods, convenience), nonprofit governance (duty of care/loyalty/obedience, conflicts of interest policy, executive compensation — intermediate sanctions IRC 4958, rebuttable presumption of reasonableness).

- [ ] **Step 1:** Create directory and all 6 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 22: Cybersecurity (new area — 7 files)

Create `knowledge/law/cybersecurity/` with: `overview.md`, `nist-frameworks.md`, `sec-cyber-disclosure.md`, `cmmc.md`, `state-breach-laws.md`, `incident-response.md`, `security-standards.md`

Content covers: NIST CSF 2.0 (Govern, Identify, Protect, Detect, Respond, Recover), NIST 800-171 (CUI protection — 110 controls, DoD contractors), NIST 800-53 (federal systems), SEC cybersecurity disclosure rules (2023 — Form 8-K for material incidents within 4 business days, annual Form 10-K disclosure of risk management/strategy/governance), CMMC (Cybersecurity Maturity Model Certification — Level 1: 15 practices/self-assessment, Level 2: 110 practices/third-party assessment, Level 3: 110+ practices/government assessment), state breach notification (all 50 states + DC/territories — trigger definitions vary, notification timelines 30-90 days, AG notification thresholds, private right of action availability), incident response procedures (containment, eradication, recovery, post-incident — legal obligations at each stage), security standards (SOC 2 Type I vs Type II, ISO 27001 certification, FedRAMP authorization levels, HITRUST CSF).

Cross-references: `data-privacy/breach-notification.md` for privacy-specific breach obligations.

- [ ] **Step 1:** Create directory and all 7 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 23: White Collar & Investigations (new area — 6 files)

Create `knowledge/law/white-collar-investigations/` with: `overview.md`, `internal-investigations.md`, `whistleblower.md`, `doj-cooperation.md`, `corporate-compliance-programs.md`, `fcpa-enforcement.md`

Content covers: internal investigations (scope, privilege preservation — Upjohn warnings, document holds, reporting obligations, investigation reports — oral vs. written), whistleblower protections (SOX Section 806 — 180-day filing, Dodd-Frank — SEC whistleblower program 10-30% of sanctions >$1M, qui tam under False Claims Act — relator share 15-30%, anti-retaliation), DOJ cooperation (DOJ Corporate Enforcement Policy — cooperation credit for voluntary self-disclosure, full cooperation, timely remediation; monitors; DPAs and NPAs; individual accountability), corporate compliance programs (DOJ evaluation criteria — June 2020 guidance: well-designed, adequately resourced, works in practice; culture of compliance; risk assessment; training; reporting mechanisms; third-party management), FCPA enforcement (DOJ and SEC dual enforcement, declinations, pilot program, recent enforcement trends, coordinated international enforcement).

Cross-references: `international-trade/anti-corruption.md` for FCPA/UK Bribery Act substantive law.

- [ ] **Step 1:** Create directory and all 6 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 24: Accessibility (new area — 6 files)

Create `knowledge/law/accessibility/` with: `overview.md`, `ada-title-iii.md`, `section-508.md`, `wcag.md`, `website-accessibility.md`, `state-accessibility.md`

Content covers: ADA Title III (public accommodations, "places of public accommodation" — courts split on whether websites are covered independently or must have physical nexus, standing requirements, injunctive relief only for private plaintiffs, DOJ enforcement), Section 508 (federal agencies and contractors, ICT standards, VPAT requirements, procurement obligations, 2017 refresh — incorporated WCAG 2.0 AA), WCAG (Web Content Accessibility Guidelines — 2.1 and 2.2, four principles: perceivable/operable/understandable/robust, three levels: A/AA/AAA, AA as de facto legal standard, key criteria: alt text, keyboard navigation, color contrast 4.5:1, captions), website accessibility litigation (demand letter mills, high-volume filing in NY and CA, settlement patterns $5K-$50K typical, structured negotiation, consent decree terms), state laws (California Unruh Civil Rights Act — $4K minimum statutory damages, New York City Human Rights Law, state-specific requirements that exceed ADA).

- [ ] **Step 1:** Create directory and all 6 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 25: Franchise (new area — 5 files)

Create `knowledge/law/franchise/` with: `overview.md`, `ftc-franchise-rule.md`, `state-franchise-laws.md`, `franchise-agreements.md`, `relationship-laws.md`

Content covers: FTC Franchise Rule (16 CFR 436 — Franchise Disclosure Document 23 items, 14-day waiting period before signing/payment, no registration requirement), state franchise laws (registration states: 15 states require FDD registration before offering, review timelines 30-90 days, material change amendments), franchise agreements (territory — exclusive vs. non-exclusive, fees — initial franchise fee + ongoing royalties 4-8% typical, non-compete — scope and duration, transfer rights, renewal conditions, system standards), franchise relationship laws (good cause termination requirement, notice and cure periods — 30-90 days typical, encroachment protection, sourcing requirements, impact laws — California, Iowa, New Jersey, others).

- [ ] **Step 1:** Create directory and all 5 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

### Task 26: Labor Relations (new area — 5 files)

Create `knowledge/law/labor-relations/` with: `overview.md`, `nlra.md`, `collective-bargaining.md`, `union-organizing.md`, `strikes-lockouts.md`

Content covers: NLRA (National Labor Relations Act — Section 7 protected concerted activity, Section 8(a) employer ULPs, Section 8(b) union ULPs, NLRB jurisdiction — $500K annual revenue for non-retail, $50K for retail, coverage excludes supervisors/managers/agricultural workers/independent contractors), collective bargaining (mandatory subjects — wages, hours, terms and conditions; permissive subjects — internal union affairs, management rights; duty to bargain in good faith; impasse procedures; successor employer obligations — Burns v. Fall River), union organizing (representation elections — petition requires 30% showing of interest, RC/RD/RM petitions, election timeline — NLRB quickie election rule, employer speech — Gissel bargaining orders for ULPs, voluntary recognition — card check, neutrality agreements), strikes and lockouts (economic strikes — permanent replacement permitted, ULP strikes — no permanent replacement, sympathy strikes, partial strikes — unprotected, lockouts — offensive vs. defensive, picketing — primary vs. secondary — Section 8(b)(4) prohibition on secondary boycotts, ally doctrine exception).

Cross-references: `employment/` for individual employment law (as opposed to collective labor law).

- [ ] **Step 1:** Create directory and all 5 files following law/ template
- [ ] **Step 2:** Validate all files meet quality criteria
- [ ] **Step 3:** Commit

---

## Phase 3: Deepen Existing Defaults/ Files

Phase 3 and 4 depend on law/ being substantially complete (positions reference law/ requirements). Tasks within Phase 3 and 4 can be parallelized.

---

### Task 27: Deepen All 13 Existing Position Files

**Files:** All 13 files in `knowledge/defaults/positions/`

**Position file template:**
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

For each file: read current content, expand to match template (adding Practical Guidance, Key Negotiation Points, Common Traps sections), replace qualitative GREEN/YELLOW/RED criteria with specific numbers. Target: 50-60 lines per file.

- [ ] **Step 1:** Read all 13 existing position files
- [ ] **Step 2:** Deepen `limitation-of-liability.md` — make GREEN/YELLOW/RED specific (e.g., GREEN: "mutual cap at 12+ months fees paid or payable", not just "reasonable cap")
- [ ] **Step 3:** Deepen `indemnification.md`
- [ ] **Step 4:** Deepen `confidentiality.md`
- [ ] **Step 5:** Deepen `data-protection.md`
- [ ] **Step 6:** Deepen `ip-ownership.md`
- [ ] **Step 7:** Deepen `termination-renewal.md`
- [ ] **Step 8:** Deepen `dispute-resolution.md`
- [ ] **Step 9:** Deepen `force-majeure.md`
- [ ] **Step 10:** Deepen `representations-warranties.md`
- [ ] **Step 11:** Deepen `service-levels.md`
- [ ] **Step 12:** Deepen `fees-payment.md`
- [ ] **Step 13:** Deepen `insurance-requirements.md`
- [ ] **Step 14:** Deepen `assignment-change-of-control.md`
- [ ] **Step 15:** Validate all 13 files meet template and have numeric classification criteria
- [ ] **Step 16:** Commit: `git add knowledge/defaults/positions/ && git commit -m "Deepen all 13 position files: numeric classification, practical guidance, common traps"`

---

### Task 28: Create 11 New Position Files

**Files:** Create in `knowledge/defaults/positions/`:
- `audit-rights.md`
- `subcontractors-subprocessors.md`
- `acceptable-use.md`
- `compliance-certifications.md`
- `warranties-disclaimers.md`
- `ai-data-use.md`
- `most-favored-nation.md`
- `non-solicitation.md`
- `transition-assistance.md`
- `source-code-escrow.md`
- `notices.md`

Each file follows the position template. Target: 50-60 lines per file.

- [ ] **Step 1:** Create all 11 position files following template
- [ ] **Step 2:** Validate all files have numeric GREEN/YELLOW/RED criteria and all template sections
- [ ] **Step 3:** Commit: `git add knowledge/defaults/positions/ && git commit -m "Add 11 new position files: audit rights, AI data use, warranties, escrow, and more"`

---

### Task 29: Deepen 6 Existing Clause Library Files + Fix Dispute Resolution

**Files:** All 6 files in `knowledge/defaults/clause-library/`

**Clause library template:**
```markdown
# [Clause Category]

## [Clause Type]

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

For each file: read current content, add Vendor-Favorable variants, ensure all clause types have actual language (not just descriptions). Fix `dispute-resolution.md` which currently references the position file instead of providing clause language. Target: 80-100 lines per file.

- [ ] **Step 1:** Read all 6 existing clause library files
- [ ] **Step 2:** Fix `dispute-resolution.md` — add actual arbitration/mediation/litigation clause language
- [ ] **Step 3:** Deepen `liability-and-indemnification.md` — add vendor-favorable variants
- [ ] **Step 4:** Deepen `data-protection.md` — add vendor-favorable variants
- [ ] **Step 5:** Deepen `ip-and-confidentiality.md` — add vendor-favorable variants, joint development
- [ ] **Step 6:** Deepen `sla-and-performance.md` — add vendor-favorable variants, RPO/RTO
- [ ] **Step 7:** Deepen `termination-and-renewal.md` — add vendor-favorable variants, transition
- [ ] **Step 8:** Validate all files have 4 variants per clause type and actual language
- [ ] **Step 9:** Commit: `git add knowledge/defaults/clause-library/ && git commit -m "Deepen 6 clause library files: vendor-favorable variants, fix dispute-resolution"`

---

### Task 30: Create 8 New Clause Library Files

**Files:** Create in `knowledge/defaults/clause-library/`:
- `warranties-disclaimers.md`
- `governing-law-jurisdiction.md`
- `boilerplate.md`
- `compliance-regulatory.md`
- `ai-and-data-use.md`
- `force-majeure.md`
- `audit-rights.md`
- `notices.md`

Each file follows the clause library template with standard/aggressive/vendor-favorable/minimum variants. Target: 80-100 lines per file.

- [ ] **Step 1:** Create all 8 clause library files following template with actual clause language
- [ ] **Step 2:** Validate all files have 4 variants per clause type
- [ ] **Step 3:** Commit: `git add knowledge/defaults/clause-library/ && git commit -m "Add 8 new clause library files: warranties, governing law, boilerplate, compliance, AI, force majeure"`

---

### Task 31: Deepen 6 Existing Checklists with Priority Tiers

**Files:** All 6 files in `knowledge/defaults/checklists/`

**Checklist template:**
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

For each file: read current content, reorganize items into three priority tiers, add brief rationale to Must-Check items. Target: 100-120 lines per file.

- [ ] **Step 1:** Read all 6 existing checklist files
- [ ] **Step 2:** Deepen `contract-review.md` with priority tiers
- [ ] **Step 3:** Deepen `due-diligence.md` with priority tiers
- [ ] **Step 4:** Deepen `nda-screening.md` with priority tiers
- [ ] **Step 5:** Deepen `vendor-onboarding.md` with priority tiers
- [ ] **Step 6:** Deepen `partner-terms.md` with priority tiers
- [ ] **Step 7:** Deepen `litigation-hold.md` with priority tiers
- [ ] **Step 8:** Validate all files have 3 priority tiers with rationale on Tier 1 items
- [ ] **Step 9:** Commit: `git add knowledge/defaults/checklists/ && git commit -m "Add priority tiers to all 6 existing checklists"`

---

### Task 32: Create 8 New Checklists

**Files:** Create in `knowledge/defaults/checklists/`:
- `employment-agreement.md`
- `ip-assignment.md`
- `saas-agreement.md`
- `ma-transaction.md`
- `privacy-dpa.md`
- `government-contract.md`
- `healthcare-baa.md`
- `real-estate-lease.md`

Each file follows the checklist template with 3 priority tiers. Target: 100-120 lines per file.

- [ ] **Step 1:** Create all 8 checklist files following template with priority tiers
- [ ] **Step 2:** Validate all files have 3 priority tiers
- [ ] **Step 3:** Commit: `git add knowledge/defaults/checklists/ && git commit -m "Add 8 new checklists: employment, IP assignment, SaaS, M&A, DPA, government, healthcare, lease"`

---

### Task 33: Deepen 11 Existing Playbooks

**Files:** All 11 files in `knowledge/defaults/playbooks/`

For each file: read current content, add tactical sub-steps where current steps are vague, add cross-references to which position files and checklists to load at each step, add decision points (if X, do Y; if Z, do W). Target: 100-130 lines per file.

- [ ] **Step 1:** Read all 11 existing playbook files
- [ ] **Step 2:** Deepen `contract-review.md` — add position file references per step, decision points
- [ ] **Step 3:** Deepen `nda-triage.md`
- [ ] **Step 4:** Deepen `negotiation.md` — add deadlock-breaking, walk-away criteria
- [ ] **Step 5:** Deepen `due-diligence.md` — add workstream-level sub-steps
- [ ] **Step 6:** Deepen `compliance-assessment.md`
- [ ] **Step 7:** Deepen `dispute-response.md`
- [ ] **Step 8:** Deepen `legal-memo.md`
- [ ] **Step 9:** Deepen `amendment-drafting.md`
- [ ] **Step 10:** Deepen `policy-drafting.md`
- [ ] **Step 11:** Deepen `board-and-governance.md`
- [ ] **Step 12:** Deepen `vendor-onboarding.md`
- [ ] **Step 13:** Validate all files have cross-references and decision points
- [ ] **Step 14:** Commit: `git add knowledge/defaults/playbooks/ && git commit -m "Deepen all 11 playbooks: tactical sub-steps, position references, decision points"`

---

### Task 34: Create 6 New Playbooks

**Files:** Create in `knowledge/defaults/playbooks/`:
- `regulatory-response.md` — investigation, subpoena, enforcement action response
- `ip-portfolio-management.md` — prosecution, maintenance, licensing, enforcement
- `employment-termination.md` — involuntary, RIF, WARN Act, separation agreements
- `ma-integration.md` — post-closing, contract novation, entity merge
- `privacy-compliance-program.md` — building/auditing a privacy program
- `ai-governance.md` — risk assessment, policy development, vendor AI review

Each file follows the existing playbook format (when to use → prerequisites → step-by-step → output format → calibration). Target: 100-130 lines per file.

- [ ] **Step 1:** Create all 6 playbook files following existing format
- [ ] **Step 2:** Validate all files have cross-references to position files and checklists
- [ ] **Step 3:** Commit: `git add knowledge/defaults/playbooks/ && git commit -m "Add 6 new playbooks: regulatory response, IP portfolio, employment termination, M&A integration, privacy, AI governance"`

---

## Phase 4: Cross-Reference Validation & Cleanup

---

### Task 35: Validate Cross-Area References

After all content is written, verify that cross-references are bidirectional and accurate.

- [ ] **Step 1:** For each cross-area delineation pair listed in the spec (anti-corruption ↔ fcpa-enforcement, breach-notification ↔ state-breach-laws, endorsements-testimonials ↔ influencer-disclosures, etc.), verify both files reference each other
- [ ] **Step 2:** Verify HIPAA cross-reference: `data-privacy/overview.md` routes to `healthcare/hipaa-compliance.md`
- [ ] **Step 3:** Verify `securities/equity-issuance.md` cross-references `tax/equity-compensation-tax.md` and vice versa
- [ ] **Step 4:** Spot-check 10 random law/ files for quality criteria compliance (3+ thresholds, 2+ sources, 1+ cross-reference)
- [ ] **Step 5:** Fix any missing or broken cross-references
- [ ] **Step 6:** Commit any fixes: `git commit -m "Fix cross-area references and quality gaps"`

---

### Task 36: Delete Obsolete Files

Clean up files that were split or renamed in earlier tasks. Verify they were actually deleted.

- [ ] **Step 1:** Verify these files no longer exist (should have been deleted in their respective tasks):
  - `knowledge/law/ip-and-technology/patents-copyrights-trademarks.md`
  - `knowledge/law/corporate/ma-investment.md`
  - `knowledge/law/corporate/entity-types.md`
  - `knowledge/law/antitrust/competition-law.md`
  - `knowledge/law/insurance/coverage-types.md`
  - `knowledge/law/financial-services/compliance-licensing.md`
- [ ] **Step 2:** Delete any that still exist
- [ ] **Step 3:** Commit if needed: `git commit -m "Remove obsolete files replaced by granular sub-files"`

---

### Task 37: Final File Count Validation

Verify the expansion matches spec targets.

- [ ] **Step 1:** Count law/ files: `find knowledge/law -name "*.md" | wc -l` — expect ~188
- [ ] **Step 2:** Count positions: `ls knowledge/defaults/positions/*.md | wc -l` — expect ~24
- [ ] **Step 3:** Count clause library: `ls knowledge/defaults/clause-library/*.md | wc -l` — expect ~14
- [ ] **Step 4:** Count checklists: `ls knowledge/defaults/checklists/*.md | wc -l` — expect ~14
- [ ] **Step 5:** Count playbooks: `ls knowledge/defaults/playbooks/*.md | wc -l` — expect ~17
- [ ] **Step 6:** Report totals and flag any discrepancies from spec
- [ ] **Step 7:** If all counts match, commit: `git commit --allow-empty -m "Knowledge expansion complete: 26 law areas, ~257 files, practitioner-ready depth"`
