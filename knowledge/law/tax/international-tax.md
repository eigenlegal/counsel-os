---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
---

## International Tax

# International Tax

## Applicability

Load when ANY of the following is present: FIRPTA withholding, U.S. income tax treaty benefits, permanent establishment (PE) risk analysis, GILTI (Global Intangible Low-Taxed Income), BEAT (Base Erosion and Anti-Abuse Tax), Pillar Two / GloBE (Global Anti-Base Erosion) rules, Subpart F income, controlled foreign corporation (CFC), foreign tax credits, cross-border tax structuring, repatriation of offshore earnings, or outbound/inbound investment tax planning.

International tax rules determine how cross-border income is taxed, which country has taxing rights, and how double taxation is mitigated. These rules impose minimum tax regimes, anti-avoidance provisions, and withholding obligations that significantly affect the economics of international transactions.

## Key Requirements

### FIRPTA — Foreign Investment in Real Property Tax Act (IRC 897)

- **What**: FIRPTA subjects foreign persons to U.S. tax on gains from the disposition of U.S. real property interests (USRPIs), including direct real property sales and sales of stock in U.S. real property holding corporations (USRPHCs). The buyer is required to withhold and remit tax at the time of disposition.
- **Threshold/Timeline**: Withholding rate: 15% of the amount realized (gross sale price) on dispositions of USRPIs by foreign persons.
  - Reduced rate: 10% if the property will be used as a residence by the buyer and the amount realized is $1,000,000 or less.
  - Exemption: 0% withholding if the amount realized is $300,000 or less and the property will be used as a buyer's residence.
  - A USRPHC is any corporation in which the fair market value of USRPIs equals or exceeds 50% of the aggregate FMV of all worldwide real property interests plus business assets used in a trade or business.
  - FIRPTA does not apply to dispositions of stock in domestically controlled REITs (more than 50% held by U.S. persons during the testing period).
  - Publicly traded exception: FIRPTA does not apply to dispositions of stock in publicly traded corporations if the foreign seller held 5% or less of the stock at all times during the shorter of (a) the 5-year period ending on the disposition date, or (b) the holder's holding period.
  - The foreign seller may apply for a withholding certificate (Form 8288-B) to reduce or eliminate withholding if the expected tax liability is less than the statutory withholding amount.
  - FIRPTA withholding must be remitted within 20 days of disposition on Forms 8288 and 8288-A.
- **Consequence**: The buyer who fails to withhold becomes personally liable for the FIRPTA tax (up to the full 15% of the amount realized), plus penalties and interest. This is a strict liability obligation — the buyer cannot avoid liability by claiming ignorance of the seller's foreign status. FIRPTA applies regardless of whether the foreign seller has other U.S. filing obligations.

### Treaty Benefits and Limitation on Benefits (LOB)

- **What**: The U.S. has income tax treaties with approximately 65 countries that may reduce or eliminate withholding rates on dividends, interest, and royalties, and may provide exemptions for business profits absent a permanent establishment.
- **Threshold/Timeline**: Common treaty-reduced rates:
  - Dividends: 0-15% (often 5% for direct corporate shareholders owning 10%+ of voting stock — e.g., U.S.-UK treaty: 0% for 80%+ owners, 5% for 10%+ owners, 15% for others).
  - Interest: 0-15% (0% in many recent treaties, including with the UK, Japan, Germany, and the Netherlands).
  - Royalties: 0-15% (0% in several treaties, including with the UK and Japan).
  - Business profits: taxable only if attributable to a PE in the source country (see PE discussion below).
  - Capital gains: generally taxable only in the country of residence (except for real property — see FIRPTA — and certain PE-attributable gains).
  - LOB provisions: most U.S. treaties include Limitation on Benefits articles that deny treaty benefits to entities that are not "qualified residents" of the treaty country, targeting treaty shopping.
    - The 2016 U.S. Model Treaty LOB tests: publicly traded company, subsidiary of publicly traded company, active trade or business, derivative benefits, and discretionary competent authority determination.
    - Form W-8BEN-E requires the entity to identify which LOB provision it satisfies.
    - The Principal Purpose Test (PPT), adopted in BEPS Action 6, serves as an alternative or supplement to LOB in non-U.S. treaties.
- **Consequence**: Claiming treaty benefits without satisfying the LOB article exposes the payee to retroactive full-rate withholding, penalties, and interest. The IRS can challenge treaty claims on audit. Improper treaty positions may constitute fraud.

### Permanent Establishment (PE) Risk

- **What**: A permanent establishment is a fixed place of business through which an enterprise carries on business in a foreign jurisdiction, creating a taxable presence and subjecting the enterprise to local income tax on profits attributable to the PE.
- **Threshold/Timeline**: Under the OECD Model Tax Convention (Article 5), a PE includes:
  - A fixed place of business: place of management, branch, office, factory, workshop, or mine/quarry/natural resource extraction site.
  - A building site or construction/installation project if it lasts more than 12 months (6 months in some treaties).
  - A dependent agent who habitually exercises authority to conclude contracts on behalf of the enterprise (agency PE).
  - Post-BEPS Action 7: the PE definition was expanded to cover commissionnaire arrangements and artificial avoidance of PE status through fragmentation of activities (the anti-fragmentation rule).
  - Services PE (in some treaties): presence exceeding 183 days in any 12-month period for the performance of services.
  - The U.S. Model Treaty uses "fixed place of business" as the primary test and does not include a services PE provision.
  - Common PE triggers: employees traveling to client sites, home office arrangements of foreign employees, server locations, warehouses, dependent agents, and long-term project sites.
- **Consequence**: An inadvertent PE triggers local income tax filing obligations, potential historical tax assessments (from the date PE status was established), local transfer pricing requirements for attributing profits to the PE, and possible penalties for failure to file. PE risk is one of the most frequently underappreciated cross-border tax risks.

### GILTI — Global Intangible Low-Taxed Income (IRC 951A)

- **What**: GILTI imposes a current U.S. tax on the income of controlled foreign corporations (CFCs) that exceeds a routine return on tangible assets, targeting income shifted to low-tax jurisdictions. Enacted by the Tax Cuts and Jobs Act of 2017.
- **Threshold/Timeline**: GILTI = net CFC tested income minus net deemed tangible income return (DTIR).
  - DTIR = 10% of qualified business asset investment (QBAI — the average adjusted tax basis of depreciable tangible property used in a trade or business).
  - Effective minimum tax rate: approximately 10.5% for C-corporation shareholders (after 50% deduction under IRC 250, applicable through 2025).
  - After 2025: the IRC 250 deduction decreases to 37.5%, increasing the effective GILTI rate to approximately 13.125%.
  - Foreign tax credits (FTCs) are available against GILTI but limited to 80% of foreign taxes paid and subject to a separate GILTI FTC basket (no cross-crediting with other income categories).
  - Individual CFC shareholders do not receive the IRC 250 deduction unless they make an election under IRC 962 to be taxed as a corporation on CFC inclusions.
  - High-tax exclusion: CFC income taxed at an effective rate exceeding 90% of the U.S. corporate rate (currently 18.9%) may be excluded from GILTI by election (Treas. Reg. 1.951A-2(c)(7)).
- **Consequence**: GILTI eliminates the benefit of deferring offshore income in low-tax jurisdictions. Companies with significant foreign IP income and limited tangible assets abroad (high GILTI, low QBAI) face substantial inclusions. GILTI interacts with Pillar Two — companies may face both regimes.

### BEAT — Base Erosion and Anti-Abuse Tax (IRC 59A)

- **What**: BEAT is a minimum tax that applies to large U.S. corporations making significant deductible payments to foreign related parties (base erosion payments), ensuring a minimum level of U.S. tax regardless of deductions.
- **Threshold/Timeline**: Applies to U.S. corporations (or groups) with:
  - Average annual gross receipts of $500 million or more over the prior 3 tax years; AND
  - A "base erosion percentage" of 3% or more (2% for certain banks and securities dealers).
  - Base erosion payments include: deductible amounts paid to foreign related parties (25%+ ownership) for services, royalties, interest, rents, and certain reinsurance premiums.
  - Excluded from base erosion payments: cost of goods sold (except for certain cost sharing payments post-2018), payments subject to full NRA withholding, and qualified derivative payments.
  - BEAT rate: 10% for tax years beginning after 2018; 12.5% for tax years beginning after 2025.
  - The BEAT tax = excess of (BEAT rate x modified taxable income) over (regular tax liability reduced by certain credits other than R&D credits).
  - Modified taxable income = regular taxable income computed without deductions for base erosion payments and without the base erosion percentage of any NOL deduction.
- **Consequence**: BEAT effectively disallows a portion of deductions for payments to foreign affiliates when the resulting U.S. tax is too low. Companies with large intercompany royalty, service, or interest payments to offshore entities are most affected. BEAT planning requires modeling the interaction between base erosion payments, regular tax, and FTCs.

### Pillar Two — GloBE Rules (Global Anti-Base Erosion)

- **What**: The OECD/G20 Inclusive Framework's Pillar Two establishes a global minimum effective tax rate of 15% on the profits of large multinational enterprises (MNEs), regardless of where profits are booked. As of 2025, over 40 jurisdictions have enacted or are enacting Pillar Two legislation.
- **Threshold/Timeline**: Scope: MNE groups with consolidated annual revenue of EUR 750 million or more in at least 2 of the 4 preceding fiscal years.
  - Effective tax rate (ETR) is calculated on a jurisdictional basis (not entity-by-entity) using GloBE income (financial accounting income with specific adjustments for timing differences, stock-based compensation, and policy disallowances) as the base.
  - If the ETR in any jurisdiction is below 15%, a "top-up tax" is imposed to bring the effective rate to 15%.
  - Charging rules (in order of priority): (1) Qualified Domestic Minimum Top-Up Tax (QDMTT) — the low-tax jurisdiction itself imposes the top-up; (2) Income Inclusion Rule (IIR) — the parent jurisdiction imposes top-up tax on low-taxed subsidiaries; (3) Undertaxed Profits Rule (UTPR) — a backstop that denies deductions or imposes equivalent adjustments.
  - Substance-based income exclusion (SBIE): a portion of income equal to 5% of tangible assets and 5% of payroll costs in each jurisdiction is excluded from the GloBE base (after a transition period through 2032 with higher percentages).
  - Transitional safe harbors (through 2026): simplified calculations based on CbCR data for jurisdictions meeting specified revenue, profit, and ETR thresholds.
- **Consequence**: Pillar Two fundamentally changes international tax planning by eliminating the benefit of tax incentives and low-tax regimes below the 15% floor. MNEs must model jurisdiction-by-jurisdiction ETRs and assess exposure to top-up taxes. Compliance requires significant new data collection and computation infrastructure.

### Subpart F Income — IRC 951-964

- **What**: Subpart F requires U.S. shareholders of controlled foreign corporations (CFCs) to include certain categories of passive and highly mobile income in their current U.S. taxable income, regardless of whether the income is distributed.
- **Threshold/Timeline**: CFC = a foreign corporation in which U.S. shareholders (each owning 10%+ by vote or value) collectively own more than 50% of total voting power or value.
  - Subpart F income categories: (1) foreign base company sales income — income from buying/selling property involving a related party where the property is manufactured and sold outside the CFC's country; (2) foreign base company services income — income from services performed for a related party outside the CFC's country; (3) foreign personal holding company income — dividends, interest, royalties, rents, annuities, and certain property gains; (4) insurance income from insuring risks outside the CFC's country; (5) certain oil-related income.
  - High-tax exception: Subpart F income taxed at a rate exceeding 90% of the maximum U.S. corporate rate (currently 18.9%) may be excluded by election.
  - De minimis rule: Subpart F income is not included if it is less than the lesser of 5% of gross income or $1 million.
  - Full inclusion rule: if Subpart F income exceeds 70% of gross income, the entire gross income is treated as Subpart F.
  - Income included under Subpart F is excluded from the GILTI computation to avoid double inclusion.
- **Consequence**: Subpart F eliminates deferral for passive and related-party income earned through CFCs. Planning must consider both Subpart F and GILTI together, as they apply to different categories of CFC income with different effective tax rates and credit mechanisms.

## Interaction with Other Areas

- **Withholding**: FIRPTA withholding, NRA withholding, and treaty-reduced rates are enforced through the withholding regime (see `withholding.md`). International tax planning and withholding compliance are inseparable.
- **Transfer Pricing**: GILTI, BEAT, and Subpart F inclusions are all functions of how intercompany transactions are priced (see `transfer-pricing.md`). Transfer pricing determines which jurisdiction earns the income; international tax rules determine the minimum tax on that income.
- **Corporate (M&A)**: Inbound and outbound acquisitions require FIRPTA analysis, treaty benefit assessment, and CFC structuring. Post-acquisition integration must address GILTI, BEAT, and Pillar Two implications.
- **Tax Indemnities**: Cross-border M&A tax indemnities must address FIRPTA withholding, treaty benefit representations, and the risk of GILTI/BEAT/Subpart F exposure (see `tax-indemnities.md`).
- **Securities**: Foreign investors in U.S. companies must consider FIRPTA implications on exit, particularly for USRPHCs. Treaty benefits may affect the taxation of dividends and gains.

## Sources

- [IRC Section 897 — FIRPTA (26 USC 897)](https://www.law.cornell.edu/uscode/text/26/897) — Foreign investment in real property tax
- [IRC Section 951A — GILTI (26 USC 951A)](https://www.law.cornell.edu/uscode/text/26/951A) — Global intangible low-taxed income
- [IRC Section 59A — BEAT (26 USC 59A)](https://www.law.cornell.edu/uscode/text/26/59A) — Base erosion and anti-abuse tax
- [IRC Sections 951-964 — Subpart F (26 USC 951)](https://www.law.cornell.edu/uscode/text/26/951) — CFC income inclusion rules
- [OECD Pillar Two Model Rules (GloBE)](https://www.oecd.org/tax/beps/pillar-two-model-rules.htm) — Global minimum tax framework
- [IRS Publication 519 — U.S. Tax Guide for Aliens](https://www.irs.gov/publications/p519) — NRA and FIRPTA guidance
- [U.S. Model Income Tax Convention (2016)](https://home.treasury.gov/policy-issues/tax-policy/treaties) — U.S. treaty policy and LOB provisions
