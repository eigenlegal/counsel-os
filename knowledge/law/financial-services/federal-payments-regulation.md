---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal]
last-reviewed: "2026-06-10"
authorities:
  - cite: "31 C.F.R. Part 1022"
    title: "FinCEN rules for money services businesses"
    url: "https://www.law.cornell.edu/cfr/text/31/part-1022"
  - cite: "12 C.F.R. Part 1005"
    title: "Regulation E (Electronic Fund Transfers), including Remittance Transfer Rule subpart B"
    url: "https://www.law.cornell.edu/cfr/text/12/part-1005"
  - cite: "12 C.F.R. 1090.107"
    title: "CFPB larger-participant rule — international money transfer market"
    url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1090/subpart-B/section-1090.107"
  - cite: "90 FR 3687 (Jan. 15, 2025)"
    title: "OFAC final rule — Inflation Adjustment of Civil Monetary Penalties (2025 maximums, unchanged for 2026)"
    url: "https://www.federalregister.gov/documents/2025/01/15/2025-00786/inflation-adjustment-of-civil-monetary-penalties"
  - cite: "18 U.S.C. 1960"
    title: "Prohibition of unlicensed money transmitting businesses"
    url: "https://www.law.cornell.edu/uscode/text/18/1960"
  - cite: "16 C.F.R. 1.98"
    title: "FTC adjustment of civil monetary penalty amounts"
    url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-1/subpart-L/section-1.98"
---
# Federal Payments Regulation

## Applicability

Load when the matter involves federal compliance for payments companies, MSB registration or program design, CFPB supervisory matters, OFAC sanctions screening, remittance transfer requirements, Regulation E obligations, federal criminal exposure for unlicensed money transmission, or bank oversight of payment processor relationships.

For state-by-state licensing requirements, see `state-mtl-requirements.md`. For general money transmission definitions and exemption analysis, see `payments-money-transmission.md`. For general BSA/AML program framework, see `kyc-aml.md`.

## Key Requirements

### FinCEN / BSA — MSB Registration and Compliance

- **MSB Registration (31 C.F.R. 1010.100(ff)):** Money services businesses, including money transmitters, must register with FinCEN on Form 107 within 180 days of beginning operations. Renewal required every 2 years. Registration and state licensing are independent obligations — must have both. Failure to register violates 31 U.S.C. 5330 (civil penalties of $5,000/day statutory base, indexed annually for inflation; criminal penalties).
- **AML Program (31 C.F.R. 1022.210):** MSBs must establish and maintain an effective AML program with five pillars: (1) internal policies, procedures, and controls; (2) designation of a compliance officer; (3) ongoing employee training; (4) independent review/testing; (5) customer due diligence appropriate to risk. MSB programs must be risk-based and commensurate with the MSB's size, complexity, and nature of operations.
- **SAR Filing (31 C.F.R. 1022.320):** MSBs must file SARs for suspicious transactions of $2,000 or more (lower threshold than the $5,000 bank threshold). Filing deadline: 30 calendar days after initial detection. No tipping off — prohibited from disclosing SAR filing to the subject. Retain SAR and supporting documentation for 5 years.
- **CTR Filing (31 C.F.R. 1022.310):** Currency transaction reports required for cash transactions exceeding $10,000 in a single business day. Structuring (breaking transactions to avoid CTR threshold) is a federal crime. File within 15 calendar days.
- **Agent Supervision (31 C.F.R. 1022.380):** MSBs must maintain a list of all agents, including agent name, address, telephone number, and description of services. List must be updated annually and maintained for 5 years. The MSB is liable for agent violations of BSA requirements.
- **Travel Rule (31 C.F.R. 1010.410(f)):** For transmittals of funds of $3,000 or more, the transmittor's financial institution must include and pass along: transmittor name, address, account number, amount, execution date, identity of recipient's financial institution, and recipient information. 5-year recordkeeping.
- **Delegated Examination:** IRS has delegated examination authority for MSBs (not FinCEN directly). State regulators examine licensed money transmitters through NMLS-coordinated multistate examinations. BSA examination covers AML program adequacy, SAR filing, CTR filing, and recordkeeping.
- **Consequence:** BSA violations carry civil penalties up to $1,000,000 per day and criminal penalties of $500,000 fine and 10 years imprisonment for willful violations.

### CFPB — Consumer Protection for Payments

- **Regulation E / EFTA (12 C.F.R. Part 1005):** Governs electronic fund transfers to and from consumer accounts. Key requirements: error resolution procedures (consumer has 60 days from statement to report; institution has 10 business days to investigate, with provisional credit); unauthorized transfer liability limits ($50 if reported within 2 business days, $500 within 60 days, unlimited after); initial disclosures of terms and conditions; change-in-terms notices.
- **Remittance Transfer Rule (Reg E Subpart B, 12 C.F.R. 1005.30-36):** Implements Dodd-Frank Section 1073. Applies to electronic transfers of $15+ sent by consumers to recipients in foreign countries. Requires pre-payment disclosures (exchange rate, fees, taxes, amount to be received in foreign currency). 30-minute cancellation right after payment. Error resolution within 180 days. Sender liability protections. Applies to remittance transfer providers sending 500+ remittances annually.
- **Prepaid Account Rule (12 C.F.R. 1005.18):** Requires short-form and long-form fee disclosures for prepaid accounts (payroll cards, government benefit cards, general-purpose reloadable cards). Error resolution protections apply. If prepaid account has credit feature, Regulation Z (TILA) applies to the credit component. Prepaid account issuers must register with CFPB.
- **UDAAP Authority (Dodd-Frank Section 1031):** CFPB enforces prohibition on unfair, deceptive, or abusive acts or practices in consumer financial services. Applies to payment processors — CFPB has taken action against processors facilitating fraud, imposing deceptive fees, or failing to honor error resolution obligations. Broader than FTC's UDAP standard (adds "abusive").
- **Supervisory Authority:** CFPB supervises nonbank participants in the international money transfer market with at least one million aggregate annual international money transfers (counting affiliates) under the larger participant rule (12 C.F.R. 1090.107). Supervision includes examination authority and the ability to require reports. The CFPB opened a rulemaking docket on this larger-participant rule in 2025 — verify the current threshold before advising.
- **Consequence:** CFPB civil penalties up to $1,000,000/day for knowing violations ($1M is the statutory base; tiers are indexed annually for inflation). Restitution, disgorgement, and injunctive relief. Individual liability for officers who participate in violations.

### OFAC — Sanctions Compliance for Payments

- **Screening Obligations:** All US persons and entities must screen transactions against OFAC's Specially Designated Nationals (SDN) List, Sectoral Sanctions Identifications (SSI) List, and other sanctions lists. 50% Rule: an entity owned 50% or more by a blocked person is itself blocked, even if not listed. Strict liability — no intent or knowledge required for civil penalties.
- **Payments-Specific Guidance:** OFAC has issued guidance on virtual currency sanctions compliance (requires IP address screening, geolocation tools, transaction monitoring). Cross-border wire transfers require originator and beneficiary screening. Correspondent banking relationships require enhanced due diligence for sanctions risk.
- **Blocking vs. Rejecting:** Blocked transactions (involving SDN-listed persons) must be placed in an interest-bearing account and reported to OFAC within 10 business days on a blocked property report. Rejected transactions (involving prohibited but not blocked parties) must be reported to OFAC annually.
- **Licensing and Exemptions:** General licenses authorize specific categories of otherwise prohibited transactions (e.g., humanitarian, informational materials, certain personal remittances). Specific licenses are case-by-case authorizations. Application process through OFAC's Licensing Division.
- **Consequence:** Civil penalties up to the IEEPA maximum per violation or twice the transaction value, whichever is greater. The maximum is indexed annually — $377,700 under OFAC's 2025 adjustment, which remains in effect for 2026 (no 2026 adjustment was issued); check OFAC's current figure rather than relying on a hardcoded number. Criminal penalties up to $1,000,000 and 20 years imprisonment for willful violations. No minimum transaction threshold — even de minimis transactions can trigger liability.

### Federal Criminal — 18 U.S.C. 1960

- **Elements of Offense:** It is a federal crime to knowingly conduct, control, manage, supervise, direct, or own all or part of an unlicensed money transmitting business. Three independent prongs: (1) operated without a state license where required; (2) failed to comply with FinCEN registration requirements; (3) involves funds the defendant knows were derived from a criminal offense or intended to promote or support unlawful activity.
- **Knowledge Requirement:** Requires the defendant "knowingly" operate a money transmitting business. Does NOT require knowledge that a state license was required — willful blindness doctrine applies. Prosecutors need only prove the defendant knew the business was transmitting money, not that the defendant knew it was unlicensed.
- **Consequence:** Up to 5 years imprisonment per count. Criminal forfeiture of all funds involved in the offense. Often charged alongside money laundering (18 U.S.C. 1956-1957) and wire fraud (18 U.S.C. 1343).
- **Enforcement Trends:** DOJ has prosecuted unlicensed crypto exchanges, hawala operators, peer-to-peer Bitcoin exchangers, and fintech companies operating without required state licenses. Increasing focus on companies that rely on exemptions that do not actually apply.

### OCC/Fed/FDIC — Third-Party Risk Management

- **Interagency Guidance (2023):** OCC Bulletin 2023-17, Fed SR 23-4, and FDIC FIL-29-2023 establish comprehensive third-party risk management expectations for banks. Directly impacts non-bank payments companies because bank partners must comply.
- **Bank Oversight Requirements:** Banks must assess criticality of all third-party relationships, with enhanced requirements for "critical activities" (including payment processing). Due diligence must cover: financial condition, compliance programs, information security, business continuity, insurance, subcontracting practices.
- **Implications for Non-Bank Payments Companies:** Bank partners will require: SOC 2 Type II reports, audited financial statements, BSA/AML program documentation, information security assessments, business continuity/disaster recovery plans, insurance certificates (E&O, cyber, general liability), and contractual rights to audit and examine.
- **Subcontracting Restrictions:** Banks may contractually restrict payment processor's use of subcontractors, require prior notification and approval for material subcontracting, and mandate flow-down of compliance obligations to subcontractors.
- **Consequence:** Bank regulators can take enforcement action against the bank for inadequate third-party risk management, which creates downstream pressure on payments companies to maintain robust compliance programs. MRA (Matter Requiring Attention) or MRIA (Matter Requiring Immediate Attention) findings can force banks to terminate processor relationships.

### FTC — Section 5 Authority Over Payments

- **FTC Act Section 5:** Prohibits unfair or deceptive acts or practices in or affecting commerce. Applies to non-bank payment processors. FTC has concurrent jurisdiction with CFPB for entities outside CFPB's supervisory authority.
- **Telemarketing Sales Rule (16 C.F.R. Part 310):** Restricts payment methods in telemarketing transactions. Payment processors can be liable for assisting and facilitating TSR violations by merchant clients, particularly when the processor knew or consciously avoided knowing about the violations.
- **Enforcement Precedent:** FTC has brought enforcement actions against payment processors for: continuing to process for merchants with high chargeback rates and known fraud indicators; failing to conduct adequate due diligence on merchants; facilitating deceptive billing practices. Consent orders typically require enhanced merchant monitoring programs.
- **Consequence:** FTC can seek injunctive relief, consumer redress, disgorgement of profits, and civil penalties for knowing violations up to the indexed maximum per violation ($53,088 under the FTC's 2025 adjustment, in effect as of mid-2026; see 16 C.F.R. 1.98 for the current figure).

## Interaction with Other Areas

- **Financial Services (KYC/AML):** General BSA/AML program framework, CDD/beneficial ownership requirements, and enhanced due diligence standards. See `kyc-aml.md`.
- **Financial Services (Payments/Money Transmission):** Overview of money transmission definitions, exemptions, and state licensing landscape. See `payments-money-transmission.md`.
- **Financial Services (State MTL Requirements):** State-by-state licensing requirements. See `state-mtl-requirements.md`.
- **Financial Services (Card Networks/ACH):** Card network operating rules and NACHA requirements. See `card-network-ach-rules.md`.
- **Financial Services (PCI DSS):** Payment card data security standards. See `pci-dss.md`.
- **Financial Services (Cryptocurrency):** Virtual currency-specific federal guidance (FinCEN FIN-2019-G001, OFAC virtual currency FAQ). See `cryptocurrency.md`.
- **Consumer Protection:** State UDAP/UDAAP statutes supplement federal CFPB and FTC authority.
- **Data Privacy:** GLBA financial privacy requirements (Regulation P) for customer financial data.

## Sources

- [FinCEN MSB Registration](https://www.fincen.gov/msb-registrant-search)
- [31 C.F.R. Part 1022 — MSB Rules](https://www.law.cornell.edu/cfr/text/31/part-1022)
- [31 C.F.R. Part 1010 — General BSA](https://www.law.cornell.edu/cfr/text/31/part-1010)
- [18 U.S.C. 1960 — Unlicensed Money Transmission](https://www.law.cornell.edu/uscode/text/18/1960)
- [Regulation E (12 C.F.R. Part 1005)](https://www.law.cornell.edu/cfr/text/12/part-1005)
- [CFPB Remittance Transfer Rule](https://www.consumerfinance.gov/rules-policy/regulations/1005/30/)
- [CFPB Prepaid Account Rule](https://www.consumerfinance.gov/rules-policy/final-rules/prepaid-accounts-under-electronic-fund-transfer-act-regulation-e-and-truth-lending-act-regulation-z/)
- [OFAC SDN Search](https://sanctionssearch.ofac.treas.gov/)
- [OFAC Framework for Compliance Commitments](https://ofac.treasury.gov/media/16331/download)
- [OCC Bulletin 2023-17 — Third-Party Risk Management](https://www.occ.treas.gov/news-issuances/bulletins/2023/bulletin-2023-17.html)
- [FTC Telemarketing Sales Rule](https://www.law.cornell.edu/cfr/text/16/part-310)
- [CFPB Larger Participant Rule — Money Transmission](https://www.law.cornell.edu/cfr/text/12/part-1090/subpart-B)

---
