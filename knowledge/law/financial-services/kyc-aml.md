---
counsel-os-type: law-area
content-version: "2026-06-11"
jurisdiction: [us-federal, us-state, network-rules, industry-standard]
last-reviewed: "2026-06-10"
authorities:
  - cite: "31 C.F.R. 1010.230"
    title: "FinCEN Customer Due Diligence Rule"
    url: "https://www.law.cornell.edu/cfr/text/31/section-1010.230"
  - cite: "90 FR 13688 (Mar. 26, 2025)"
    title: "FinCEN interim final rule — Beneficial Ownership Information Reporting Requirement Revision and Deadline Extension"
    url: "https://www.federalregister.gov/documents/2025/03/26/2025-05199/beneficial-ownership-information-reporting-requirement-revision-and-deadline-extension"
  - cite: "FinCEN BOI program page"
    title: "Beneficial Ownership Information Reporting"
    url: "https://www.fincen.gov/boi"
  - cite: "90 FR 3687 (Jan. 15, 2025)"
    title: "OFAC final rule — Inflation Adjustment of Civil Monetary Penalties (2025 maximums, unchanged for 2026)"
    url: "https://www.federalregister.gov/documents/2025/01/15/2025-00786/inflation-adjustment-of-civil-monetary-penalties"
  - cite: "OFAC civil penalties page"
    title: "Civil Penalties and Enforcement Information"
    url: "https://ofac.treasury.gov/civil-penalties-and-enforcement-information"
---
# KYC/AML (Know Your Customer / Anti-Money Laundering)

## Applicability

Load when the matter involves customer onboarding, identity verification, transaction monitoring, suspicious activity reporting, sanctions compliance, beneficial ownership, correspondent banking, or any BSA/AML program requirements.

## Key Requirements

### BSA/AML Program — Five Pillars

- **What:** Every covered financial institution must maintain a written AML program with five mandatory components (31 C.F.R. 1020.210, 1022.210):
  1. **Internal policies, procedures, and controls** — risk-based, tailored to the institution's products, services, customers, and geographies
  2. **Designation of a BSA/AML compliance officer** — individual with sufficient authority and resources; responsible for day-to-day compliance
  3. **Ongoing employee training** — commensurate with employee responsibilities; must cover new typologies and regulatory changes
  4. **Independent testing (audit)** — annual for higher-risk institutions; may be every 18 months for lower-risk; must be conducted by qualified independent parties
  5. **Risk-based procedures for ongoing customer due diligence** — added by 2018 CDD Rule; includes beneficial ownership identification
- **Consequence:** Failure to maintain an adequate program subjects the institution to cease-and-desist orders, civil money penalties (up to $1,000,000 per day for willful violations under 31 U.S.C. 5321), and criminal penalties (up to $500,000 and 10 years imprisonment under 31 U.S.C. 5322).

### Customer Due Diligence (CDD) — Four Elements

- **What:** The 2018 CDD Rule (31 C.F.R. 1010.230) requires covered financial institutions to:
  1. **Identify and verify the customer** — Customer Identification Program (CIP) collecting name, date of birth, address, and identification number
  2. **Identify and verify beneficial owners** of legal entity customers
  3. **Understand the nature and purpose** of the customer relationship to develop a customer risk profile
  4. **Conduct ongoing monitoring** to identify suspicious transactions and update customer information on a risk basis
- **Threshold:** CIP verification must occur before or within a reasonable time of account opening. Risk profile must be established at onboarding and updated when triggered by events or on a periodic schedule.

### Enhanced Due Diligence (EDD)

- **What:** Deeper investigation required for higher-risk customers and relationships.
- **Mandatory EDD categories:** Foreign correspondent accounts (31 C.F.R. 1010.610), private banking accounts for non-US persons (31 C.F.R. 1010.620), politically exposed persons (PEPs), customers from FATF-identified high-risk jurisdictions, and MSBs.
- **EDD elements:** Source of funds investigation, source of wealth verification, senior management approval for relationship, enhanced transaction monitoring frequency, and periodic relationship review (typically annual or more frequent).
- **Consequence:** Inadequate EDD is a common basis for enforcement actions. FinCEN fines for EDD failures have ranged from $1M to $185M in recent actions.

### Suspicious Activity Reports (SARs)

- **What:** Financial institutions must file SARs with FinCEN for transactions the institution knows, suspects, or has reason to suspect involve funds from illegal activity, are designed to evade BSA requirements, or have no business or lawful purpose (31 C.F.R. 1020.320).
- **Threshold:** No fixed dollar threshold for suspicion — the obligation exists at any amount. However, the reporting threshold is $5,000 or more for banks and $2,000 or more for MSBs.
- **Timeline:** Initial SAR must be filed within 30 calendar days of detecting the suspicious activity (60 days if no suspect is identified and the institution needs additional time). Continuing activity SARs filed every 90 days.
- **Confidentiality:** SAR existence and contents are strictly confidential. Disclosure to the subject of the SAR (tipping off) is prohibited under 31 U.S.C. 5318(g)(2). Safe harbor protects filers from liability (31 U.S.C. 5318(g)(3)).
- **Consequence:** Failure to file SARs is among the most heavily penalized BSA violations. Civil penalties up to $1,000,000 per violation. Criminal penalties for willful failure.

### Currency Transaction Reports (CTRs)

- **What:** Financial institutions must file CTRs for cash transactions exceeding the reporting threshold in a single business day (31 C.F.R. 1010.311).
- **Threshold:** $10,000 in cash (currency) per customer per day. Multiple transactions must be aggregated.
- **Timeline:** CTR must be filed within 15 calendar days of the transaction.
- **Structuring:** Deliberately breaking up transactions to avoid the CTR threshold is a federal crime (31 U.S.C. 5324). Penalties: up to $500,000 fine and 10 years imprisonment.
- **Exemptions:** Certain customers may be exempted from CTR filing (Phase I: banks, government agencies; Phase II: listed companies, certain established customers meeting specific criteria).
- **Consequence:** Failure to file CTRs carries civil penalties of $25,000–$100,000+ per violation.

### OFAC Sanctions Screening

- **What:** All US persons and entities must comply with OFAC sanctions programs. Financial institutions must screen customers, transactions, and counterparties against the SDN (Specially Designated Nationals and Blocked Persons) List and other OFAC lists (Sectoral Sanctions, Non-SDN lists).
- **Threshold:** Strict liability — no minimum transaction amount or materiality threshold. A 50% ownership rule applies (entities owned 50%+ by blocked persons are also blocked).
- **Timeline:** Blocked property must be reported to OFAC within 10 business days. Rejected transactions must be reported within 10 business days.
- **Consequence:** Civil penalties under a strict liability standard up to the greater of the IEEPA maximum per violation or twice the transaction value. The maximum is indexed annually — $377,700 under the 2025 adjustment, which remains in effect for 2026 (no 2026 adjustment was issued); check OFAC's current figure rather than relying on a hardcoded number. Criminal penalties up to $1,000,000 and 20 years imprisonment for willful violations.

### Beneficial Ownership

- **What:** Financial institutions must identify and verify the identity of beneficial owners of legal entity customers at account opening.
- **Threshold:** Individuals with 25% or more equity ownership interest, PLUS one individual with significant management responsibility (e.g., CEO, CFO, managing member), regardless of ownership percentage.
- **CDD Rule scope:** Applies to legal entity customers (corporations, LLCs, partnerships, trusts other than statutory trusts). Exemptions for publicly traded companies, regulated financial institutions, government entities, and certain others.
- **Corporate Transparency Act (CTA):** Separate from financial-institution CDD, and substantially narrowed in 2025. Under FinCEN's interim final rule (90 FR 13688, March 26, 2025), all entities formed in the United States (formerly "domestic reporting companies") and US persons are exempt from BOI reporting. Only foreign-formed entities registered to do business in a US state ("foreign reporting companies") must report, and they need not report US-person beneficial owners. FinCEN has stated it intends to finalize the rule; verify current scope at fincen.gov/boi before advising.

### Recordkeeping Requirements

- **What:** BSA imposes specific retention periods for various records.
- **Timeline:** CTRs: 5 years. SARs: 5 years from filing date. CIP records: 5 years after account closure. Funds transfer records (over $3,000): 5 years. Beneficial ownership records: 5 years after account closure.
- **Consequence:** Failure to maintain required records: civil penalties up to $100,000 per violation.

## Interaction with Other Areas

- **Financial Services (Payments):** Payment processors and money transmitters are MSBs subject to FinCEN registration and BSA/AML program requirements. See `payments-money-transmission.md`.
- **Financial Services (Banking Regulation):** AML program adequacy is a key examination focus. See `banking-regulation.md`.
- **Financial Services (Cryptocurrency):** Virtual currency businesses have specific BSA/AML obligations including the Travel Rule. See `cryptocurrency.md`.
- **Data Privacy:** KYC/AML data collection and retention must be reconciled with data minimization requirements under GDPR, CCPA, and other privacy laws. BSA recordkeeping may override privacy deletion requests.
- **International Trade:** OFAC sanctions compliance intersects with export controls. Sanctions screening must cover all OFAC programs.
- **Corporate:** CTA beneficial ownership reporting now applies only to foreign reporting companies (per FinCEN's March 2025 interim final rule), separate from financial institution CDD obligations.
- **Litigation:** SAR filings are confidential and protected by safe harbor; litigation must navigate SAR confidentiality requirements.

## Sources

- FinCEN BSA Regulations: https://www.fincen.gov/resources/statutes-and-regulations
- FinCEN CDD Rule (31 C.F.R. 1010.230): https://www.law.cornell.edu/cfr/text/31/section-1010.230
- 31 U.S.C. 5311–5332 (BSA): https://www.law.cornell.edu/uscode/text/31/subtitle-IV/chapter-53/subchapter-II
- OFAC SDN List and Sanctions Programs: https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists
- FFIEC BSA/AML Examination Manual: https://bsaaml.ffiec.gov/manual
- Corporate Transparency Act: https://www.fincen.gov/boi

---
