---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
---

## Withholding

# Withholding Tax

## Applicability

Load when ANY of the following is present: backup withholding, nonresident alien (NRA) withholding, FATCA withholding, W-8BEN, W-8BEN-E, W-8IMY, W-9, qualified intermediary (QI) agreement, state nonresident withholding, withholding agent obligations, treaty-reduced withholding rates, or cross-border payments subject to U.S. source taxation.

Withholding tax is a mechanism by which the payor deducts tax at source on payments to the payee and remits it to the government. In cross-border transactions, withholding is the primary enforcement tool for taxing non-U.S. persons on U.S.-source income.

## Key Requirements

### Backup Withholding — IRC 3406

- **What**: Backup withholding applies to certain U.S.-source payments (interest, dividends, rents, royalties, non-employee compensation, broker proceeds) when the payee fails to provide a correct Taxpayer Identification Number (TIN) or has been notified of under-reporting by the IRS.
- **Threshold/Timeline**: Rate: 24% of the payment amount (set by the Tax Cuts and Jobs Act of 2017).
  - Triggered when: (1) the payee fails to furnish a TIN on Form W-9; (2) the IRS notifies the payor that the TIN furnished is incorrect (CP2100/CP2100A notice — "B-notice"); (3) the payee fails to certify that they are not subject to backup withholding; or (4) the IRS notifies the payor that the payee has under-reported interest or dividends.
  - First B-notice requires solicitation of a corrected TIN within 30 business days.
  - Second B-notice within 3 years requires the payee to provide TIN certification from the IRS (not just a new W-9).
  - Backup withholding begins on the date the payor is notified and continues until a valid W-9 with correct TIN is received.
- **Consequence**: Failure to backup withhold when required makes the payor liable for the uncollected tax, plus penalties and interest. The payor reports backup withholding on Form 1099 and Form 945 (annual return of withheld federal income tax). Payees can credit backup withholding against their tax liability on their annual return.

### NRA Withholding — IRC 1441-1446

- **What**: Withholding agents must withhold U.S. federal income tax on payments of U.S.-source fixed or determinable annual or periodical (FDAP) income to nonresident aliens (NRAs) and foreign entities. FDAP income includes interest, dividends, rents, royalties, compensation, and certain other payments.
- **Threshold/Timeline**: Default rate: 30% of the gross payment amount.
  - Treaty-reduced rates: many U.S. income tax treaties reduce the withholding rate on specific categories of income.
    - Dividends: typically 0-15% (often 5% for direct corporate shareholders owning 10%+ of voting stock).
    - Interest: typically 0-15% (0% in many recent treaties, including with the UK, Japan, Germany).
    - Royalties: typically 0-15% (0% in several treaties).
  - To claim treaty benefits, the payee must provide a valid Form W-8BEN (individuals) or W-8BEN-E (entities) certifying treaty eligibility, including a valid U.S. or foreign TIN and limitation on benefits (LOB) analysis.
  - Capital gains are generally not FDAP income and are not subject to NRA withholding (but see FIRPTA for real property gains in `international-tax.md`).
  - Payments to foreign partnerships: withholding is generally done at the partner level, with the partnership providing a W-8IMY and withholding statement.
  - Effectively connected income (ECI): income that is effectively connected with a U.S. trade or business is not subject to withholding if the payee provides a Form W-8ECI; instead, the payee files a U.S. return and pays tax on net income.
- **Consequence**: Withholding agents who fail to withhold are liable for the tax, plus penalties (up to 100% of the amount that should have been withheld under IRC 1461) and interest. Over-withholding requires the payee to file a U.S. tax return to claim a refund (Form 1040-NR or 1120-F). Reporting: Forms 1042 (annual return), 1042-S (per-payee reporting), due March 15.

### W-8 Forms and Documentation

- **What**: The W-8 series of forms are used by foreign persons to certify their foreign status and, where applicable, claim reduced withholding rates under a tax treaty or exemption.
- **Threshold/Timeline**:
  - **Form W-8BEN** (individuals): certifies foreign status, claims treaty benefits. Requires name, country of citizenship, foreign TIN (or explanation if not available), U.S. TIN (if applicable), treaty article, and rate.
  - **Form W-8BEN-E** (entities): certifies foreign status, entity classification (corporation, partnership, disregarded entity, etc.), Chapter 3 status, FATCA (Chapter 4) status, and treaty benefits. Includes LOB article specification and rate.
  - **Form W-8IMY**: for foreign intermediaries, flow-through entities, and certain U.S. branches. Used with an accompanying withholding statement allocating payments to beneficial owners.
  - **Form W-8ECI**: for income effectively connected with a U.S. trade or business. Payee certifies ECI status and files a U.S. income tax return.
  - **Form W-9**: for U.S. persons. Provides TIN and certifications for backup withholding purposes.
  - Validity: W-8 forms are generally valid for 3 calendar years from the date of signing (through December 31 of the third year), unless a change in circumstances makes information on the form incorrect.
  - Forms must be renewed before expiration. Withholding agents must have systems to track expiration dates and solicit timely renewals.
- **Consequence**: Payments made without valid W-8 documentation must be withheld at the full 30% default rate. Expired or incomplete forms are treated as missing. The IRS has increased examination of withholding agent documentation practices.

### FATCA Withholding — IRC 1471-1474

- **What**: The Foreign Account Tax Compliance Act (FATCA) imposes a 30% withholding tax on certain U.S.-source payments to foreign financial institutions (FFIs) that do not comply with FATCA reporting requirements, and to non-financial foreign entities (NFFEs) that do not certify their substantial U.S. owners.
- **Threshold/Timeline**: Rate: 30% on withholdable payments (U.S.-source FDAP income). Gross proceeds withholding has been deferred indefinitely by IRS notice.
  - FFIs must either: (1) enter into an FFI Agreement with the IRS to identify and report U.S. account holders; (2) be covered by an intergovernmental agreement (IGA) between their jurisdiction and the U.S. — Model 1 (FFI reports to local government, which exchanges with IRS) or Model 2 (FFI reports directly to IRS with government consent); or (3) qualify for an exemption (deemed-compliant FFI categories including retirement funds, non-reporting IGAs, and certain small local banks).
  - NFFEs must certify on W-8BEN-E either that they have no substantial U.S. owners (>10% ownership) or disclose the identity of such owners (name, address, TIN).
  - Over 110 jurisdictions have signed IGAs with the U.S. as of 2025.
  - Global Information Exchange Number (GIIN) is assigned to FFIs that register with the IRS and is used to verify compliance status.
- **Consequence**: Payments to non-participating FFIs or non-compliant NFFEs are subject to 30% FATCA withholding with no treaty override. FATCA withholding is in addition to any NRA withholding that applies. Non-compliance by FFIs results in effective exclusion from the U.S. financial system.

### Common Reporting Standard (CRS)

- **What**: CRS is the OECD's global standard for automatic exchange of financial account information between tax authorities, modeled on FATCA. Over 100 jurisdictions have committed to CRS.
- **Threshold/Timeline**: Financial institutions in participating jurisdictions must identify accounts held by tax residents of other participating jurisdictions and report account balances, interest, dividends, and gross proceeds to their local tax authority.
  - CRS does not impose withholding (unlike FATCA) — it is purely an information exchange mechanism.
  - Due diligence procedures require financial institutions to collect self-certifications of tax residency and validate them against documentary evidence.
  - Reportable accounts include both individual and entity accounts, with look-through requirements for passive entities.
- **Consequence**: CRS dramatically increases transparency of offshore accounts. Tax authorities use CRS data to identify unreported foreign income and assets. Non-compliance by financial institutions triggers domestic penalties in their jurisdiction.

### Qualified Intermediary (QI) Agreements

- **What**: A QI agreement allows a foreign intermediary to assume primary withholding and reporting responsibilities on behalf of its account holders, simplifying the documentation chain for U.S. withholding agents.
- **Threshold/Timeline**: QI agreements are entered into with the IRS (Revenue Procedure 2022-43 for the current QI agreement cycle).
  - QIs must implement a compliance program including periodic review (every 3 years) by an external reviewer or the QI's responsible officer.
  - QIs can pool reporting for non-U.S. persons receiving the same type of income at the same withholding rate, reducing the number of Forms 1042-S required.
  - QIs cannot assume primary withholding responsibility for U.S. persons — they must provide U.S. payor documentation upstream.
  - Qualified derivatives dealers (QDDs) may assume primary withholding on dividend equivalent payments under a specialized QI arrangement.
- **Consequence**: QI status simplifies cross-border payment flows but creates significant compliance obligations. Failure to comply with the QI agreement can result in revocation of QI status, retroactive withholding liability, and penalties. The IRS has increased QI enforcement in recent years.

### State Nonresident Withholding

- **What**: Many U.S. states require withholding on payments of state-source income to nonresident individuals and entities, including wages, rents, royalties, and distributions from pass-through entities.
- **Threshold/Timeline**: Rates and thresholds vary by state. Examples:
  - California: 7% withholding on payments of California-source income exceeding $1,500 to nonresidents (Form 592).
  - New York: requires withholding on wages and certain non-wage income to nonresidents.
  - Many states require pass-through entity withholding on nonresident partners' and members' shares of income (typically at the state's highest marginal rate, e.g., 13.3% in California, 10.9% in New York).
  - Composite returns may be filed as an alternative to withholding in some states, allowing the entity to pay tax on behalf of all nonresident owners on a single return.
  - Real estate withholding: several states require withholding on the sale of real property by nonresidents (e.g., California at 3.33% of sale price).
- **Consequence**: Failure to withhold at the state level creates payor liability for the tax plus penalties. State withholding obligations are separate from and in addition to federal withholding. Multi-state businesses with nonresident owners or service providers must track state-by-state requirements.

## Interaction with Other Areas

- **International Tax**: NRA withholding interacts directly with treaty benefits (see `international-tax.md`), FIRPTA withholding on real property dispositions, and FATCA obligations. Withholding is the primary mechanism for collecting U.S. tax on foreign persons.
- **Employment**: Employer withholding on wages (income tax, FICA, FUTA) is a separate regime from the NRA and backup withholding discussed here, but cross-border employees may be subject to both employer withholding and NRA withholding depending on their status and visa type.
- **Transfer Pricing**: Related-party payments (royalties, management fees, interest) between affiliates in different jurisdictions are subject to both withholding tax and transfer pricing scrutiny, creating dual compliance requirements (see `transfer-pricing.md`).
- **Securities**: Dividend and interest payments on securities are subject to NRA withholding and FATCA; custodians, broker-dealers, and paying agents are withholding agents.
- **Tax Indemnities**: Gross-up and withholding indemnification clauses allocate the economic burden of withholding between contractual parties (see `tax-indemnities.md`).

## Sources

- [IRC Sections 1441-1446 — Withholding on Nonresident Aliens (26 USC 1441)](https://www.law.cornell.edu/uscode/text/26/1441) — NRA withholding statutory framework
- [IRC Sections 1471-1474 — FATCA (26 USC 1471)](https://www.law.cornell.edu/uscode/text/26/1471) — FATCA withholding and reporting
- [IRC Section 3406 — Backup Withholding (26 USC 3406)](https://www.law.cornell.edu/uscode/text/26/3406) — Backup withholding requirements
- [IRS Publication 515 — Withholding of Tax on Nonresident Aliens](https://www.irs.gov/publications/p515) — Comprehensive NRA withholding guidance
- [Revenue Procedure 2022-43 — Qualified Intermediary Agreement](https://www.irs.gov/irb/2023-02_IRB#REV-PROC-2022-43) — Current QI agreement terms
- [OECD Common Reporting Standard](https://www.oecd.org/tax/automatic-exchange/common-reporting-standard/) — Global information exchange framework
