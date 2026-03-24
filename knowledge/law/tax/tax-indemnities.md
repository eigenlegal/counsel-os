---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
---

## Tax Indemnities

# Tax Indemnities

## Applicability

Load when ANY of the following is present: gross-up provisions, tax indemnification clauses, withholding indemnification, tax representations and warranties, change-in-law tax provisions, tax equalization clauses, tax-free reorganization conditions (IRC 368), tax sharing agreements, tax receivable agreements (TRAs), pre-closing tax liabilities, or tax covenant provisions in M&A transactions.

Tax indemnities allocate economic responsibility for taxes between contracting parties. They are among the most heavily negotiated provisions in M&A transactions, financing agreements, and cross-border commercial contracts because they determine who bears the ultimate cost of tax obligations — often amounting to millions of dollars.

## Key Requirements

### Gross-Up Provisions

- **What**: A gross-up clause requires the payor to increase the payment amount so that after applicable withholding or deduction for taxes, the payee receives the full amount it would have received absent the tax. Gross-up provisions are standard in cross-border loan agreements, intercompany licensing, and service agreements.
- **Threshold/Timeline**: A typical gross-up covers withholding taxes imposed by the payor's jurisdiction.
  - Example: if a U.S. entity owes $100 to a foreign payee and 30% withholding applies, a gross-up requires the U.S. entity to pay approximately $142.86 so that after 30% withholding ($42.86), the payee receives $100 net.
  - Market standard in credit agreements (LMA/LSTA forms): gross-up is standard but typically excludes:
    - Taxes that the payee could have avoided by providing proper documentation (W-8BEN-E).
    - Taxes imposed because the payee is organized in or connected to the payor's jurisdiction.
    - FATCA withholding (each party manages its own FATCA compliance).
    - Taxes attributable to the payee's failure to comply with information-sharing requirements.
  - The gross-up formula must account for "grossing up the gross-up" — the additional payment itself may be subject to withholding, requiring an iterative calculation (standard formula: net amount / (1 - withholding rate)).
- **Consequence**: Without a gross-up, the payee bears the economic cost of withholding — a 30% reduction in effective payment. Poorly drafted gross-up provisions can create unintended circular calculations or liability for taxes the payee should bear. Change-in-law triggers (see below) determine who bears the risk of future rate increases.

### Tax Representations and Warranties

- **What**: Tax representations and warranties in M&A transactions allocate risk for the target's historical tax compliance and positions. They are a core component of the purchase agreement and the basis for post-closing indemnification claims.
- **Threshold/Timeline**: Standard tax representations include:
  - All tax returns have been timely filed and are true, correct, and complete in all material respects.
  - All taxes shown on returns have been timely paid.
  - No tax audits, assessments, or proceedings are pending or threatened.
  - No tax liens exist on any assets.
  - The target has complied with all withholding and reporting obligations.
  - No tax positions are inconsistent with prior filings or applicable law.
  - No tax sharing or tax indemnity agreements exist with third parties (or they have been terminated at closing).
  - The target is not a party to any listed transaction or reportable transaction (IRC 6707A).
  - No tax ruling requests are pending.
  - Survival period for tax representations: typically the statute of limitations plus 60-90 days (generally 3-4 years for income tax, 6 years for substantial omissions exceeding 25% of gross income, unlimited for fraud or failure to file).
  - Baskets and caps: tax indemnities are often carved out from general indemnity caps and subject to a separate (or no) cap, given the potentially large and long-tail nature of tax liabilities.
- **Consequence**: Inaccurate tax representations trigger indemnification claims. Sellers face post-closing exposure for pre-closing tax liabilities, often for years after the deal closes. Buyers who fail to negotiate adequate tax representations absorb unknown tax liabilities. Representation and warranty insurance (RWI) policies may exclude or limit coverage for known tax issues.

### Change-in-Law Provisions

- **What**: Change-in-law provisions allocate the risk that a change in tax law after contract execution will increase one party's tax burden on the contracted transaction. These are particularly important in long-term agreements and cross-border transactions.
- **Threshold/Timeline**: Key drafting considerations:
  - Whether "change in law" includes changes in official interpretation, administrative practice, or judicial decisions — not just enacted legislation.
  - Whether the provision covers changes in the payor's jurisdiction, the payee's jurisdiction, or both.
  - Whether the provision triggers a gross-up obligation, a termination right, or a renegotiation mechanism.
  - The baseline date (execution date, closing date, or effective date of the agreement).
  - In credit agreements, the standard LMA/LSTA form includes a "tax gross-up" that covers changes in law and a separate "increased costs" clause for regulatory changes affecting the lender's cost of funding.
  - Treaty override risk: certain jurisdictions may override treaty benefits through domestic legislation, creating unexpected withholding obligations.
- **Consequence**: Without a change-in-law provision, the party bearing the tax risk absorbs any increase. In cross-border financing, a new or increased withholding tax can fundamentally alter the economics of the transaction and may trigger prepayment or termination provisions.

### Tax-Free Reorganizations — IRC 368

- **What**: IRC 368 provides for tax-free treatment of certain corporate reorganizations (mergers, stock-for-stock exchanges, asset acquisitions) if specific statutory requirements are met. Tax indemnities in M&A often address the risk that a transaction intended to qualify as tax-free is later recharacterized as taxable.
- **Threshold/Timeline**: Key requirements for common reorganization types:
  - **Type A (statutory merger)**: Must qualify as a merger under applicable state law. Continuity of interest (COI) — target shareholders must receive at least 40% equity consideration (IRS ruling guideline; case law may permit less). Continuity of business enterprise (COBE) — acquirer must continue the target's historic business or use a significant portion of its historic assets for at least 2 years.
  - **Type B (stock-for-stock)**: Solely for voting stock of the acquirer or its parent. No boot (cash or other property) permitted except for fractional shares cashed out. Must acquire at least 80% of target stock in the exchange.
  - **Type C (asset acquisition)**: "Substantially all" assets acquired (IRS guideline: 90% of fair market value of net assets, 70% of gross assets). Solely for voting stock with limited boot (up to 20% of total consideration, but only if voting stock represents at least 80%).
  - Both parties typically represent they have not taken and will not take actions that would jeopardize tax-free treatment, and indemnify for taxes resulting from breach.
  - Post-closing conduct covenants restrict actions that could jeopardize tax-free status, typically for 2 years following closing.
  - Tax opinions from counsel are typically required at closing, confirming the transaction qualifies under IRC 368.
- **Consequence**: Failure to qualify under IRC 368 results in a fully taxable transaction for the target's shareholders, potentially creating billions of dollars in unexpected tax liability. The indemnifying party (typically the party whose actions caused the failure) bears this exposure.

### Tax Sharing Agreements

- **What**: Tax sharing agreements allocate responsibility for consolidated or combined tax liabilities among members of an affiliated group, and govern rights to tax refunds, credits, and attributes.
- **Threshold/Timeline**: Consolidated return allocation: members of a U.S. consolidated group (80%+ owned by vote and value) file a single federal return; tax sharing agreements allocate the consolidated liability among members.
  - Common allocation methods: (1) separate return method — each member pays what it would owe on a stand-alone basis; (2) percentage allocation — pro rata based on taxable income; (3) benefits-for-losses — members generating losses receive payment from profitable members reflecting the tax benefit of those losses.
  - State combined/unitary reporting adds complexity, as state group definitions differ from federal.
  - In M&A: existing tax sharing agreements must be reviewed and typically terminated at closing. The target's pre-closing tax liabilities and attributes (NOLs, credits) are allocated through the tax sharing mechanism and addressed in the purchase agreement.
  - Tax receivable agreements (TRAs) are increasingly common in UP-C IPO structures, requiring the public company to share tax benefits from stepped-up basis with pre-IPO owners (typically 85/15 split).
- **Consequence**: Poorly drafted tax sharing agreements can result in disparate treatment of group members, windfall allocations, or disputes over refund entitlements. In M&A, failure to terminate pre-existing tax sharing agreements can create ongoing obligations to the seller group.

### Tax Equalization

- **What**: Tax equalization provisions ensure that an employee on international assignment pays approximately the same total tax as they would in their home country, with the employer absorbing any excess foreign tax burden.
- **Threshold/Timeline**: Common in international secondment agreements and executive employment agreements.
  - The employer calculates a "hypothetical tax" (what the employee would have paid in the home country) and deducts that amount from compensation.
  - The employer then pays all actual taxes in both the home and host jurisdictions.
  - Tax equalization applies to all forms of compensation including salary, bonus, equity compensation vesting during the assignment, and taxable benefits.
  - The process requires coordination between home and host country tax returns, typically managed by a global mobility tax provider.
  - Assignment letters should specify the equalization methodology, what income is covered, and the treatment of investment income and spousal income.
- **Consequence**: Without tax equalization, employees on assignment to high-tax jurisdictions face significantly higher effective tax rates, creating a disincentive for international mobility. Poorly managed equalization programs create employer exposure for miscalculated hypothetical taxes and unrecovered foreign tax credits.

## Interaction with Other Areas

- **Withholding**: Tax indemnities interact directly with withholding obligations — gross-up and indemnification clauses determine who bears the economic cost of withholding taxes (see `withholding.md`).
- **Corporate (M&A)**: Tax representations, indemnities, and sharing agreements are core M&A deal terms. IRC 368 qualification requirements shape deal structure. Pre-closing tax liabilities are a key diligence item.
- **Employment**: Tax equalization interacts with employment law requirements for international assignments, including payroll withholding, social security totalization agreements, and permanent establishment risk from employee presence.
- **International Tax**: FIRPTA withholding, treaty benefits, and GILTI/BEAT exposure all affect the tax indemnity analysis in cross-border transactions (see `international-tax.md`).
- **Securities**: Tax representations in connection with equity issuances (e.g., QSBS eligibility, 409A compliance) may be subject to indemnification.

## Sources

- [IRC Section 368 — Corporate Reorganizations (26 USC 368)](https://www.law.cornell.edu/uscode/text/26/368) — Tax-free reorganization requirements
- [Treasury Regulations 1.368 — Reorganizations (26 CFR 1.368)](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFR4c59ab4e5749f40) — Detailed reorganization rules
- [IRC Section 1502 — Consolidated Returns (26 USC 1502)](https://www.law.cornell.edu/uscode/text/26/1502) — Consolidated group taxation authority
- [IRS Revenue Ruling 99-58 — Continuity of Interest](https://www.irs.gov/pub/irs-drop/rr-99-58.pdf) — COI quantitative guidance for reorganizations
- [LMA/LSTA Model Credit Agreement Tax Provisions](https://www.lsta.org/) — Market-standard gross-up and tax indemnity language
