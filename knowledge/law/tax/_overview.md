---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, international]
---
# Tax

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** tax, sales tax, use tax, VAT, value-added tax, withholding, backup withholding, NRA withholding, FATCA, CRS, transfer pricing, arm's length, FIRPTA, 409A, 83(b), gross-up, tax indemnity, nexus, economic nexus, AMT, alternative minimum tax, ISO, NSO, RSU, equity compensation tax, tax-free reorganization, IRC 368, tax sharing, tax equalization, GILTI, BEAT, Pillar Two, GloBE, Subpart F, permanent establishment, PE, treaty benefits, withholding agent, W-8BEN, W-9, CbCR, country-by-country reporting, BEPS, digital services tax, marketplace facilitator, Wayfair, Streamlined Sales Tax

**Clause types:** tax indemnification provisions, gross-up clauses, withholding provisions, tax representations and warranties, tax-sharing agreements, tax equalization clauses, change-in-law provisions, transfer pricing arrangements, intercompany agreements, tax-free reorganization conditions, FIRPTA withholding provisions, tax covenant clauses, sales tax collection obligations, VAT provisions

**Regulatory references:** Internal Revenue Code (IRC), Treasury Regulations, OECD Transfer Pricing Guidelines, OECD BEPS Actions, EU VAT Directive, South Dakota v. Wayfair (2018), IRC 482, IRC 368, IRC 897 (FIRPTA), IRC 1441-1446 (NRA withholding), IRC 3406 (backup withholding), FATCA (IRC 1471-1474), Pillar Two Model Rules (GloBE), Streamlined Sales and Use Tax Agreement (SSUTA)

**Relationship patterns:** buyer/seller (sales tax collection), employer/employee (withholding and equity comp), related-party affiliates (transfer pricing), cross-border counterparties (treaty withholding, FIRPTA), acquirer/target (tax-free reorgs, tax indemnities), multinational parent/subsidiary (GILTI, Subpart F, Pillar Two)

## Sub-File Loading

| Sub-File | Load When |
|----------|-----------|
| `sales-tax-vat.md` | Sales tax nexus, SaaS taxability, marketplace facilitator obligations, digital goods taxation, EU VAT, exemption certificates, or Wayfair compliance is involved |
| `withholding.md` | Backup withholding, NRA withholding, FATCA, W-8/W-9 forms, qualified intermediary agreements, or state nonresident withholding is involved |
| `transfer-pricing.md` | Intercompany transactions, arm's length pricing, transfer pricing documentation, APAs, country-by-country reporting, or BEPS compliance is involved |
| `tax-indemnities.md` | Gross-up provisions, tax representations, withholding indemnification, tax-free reorganization conditions, tax sharing agreements, or change-in-law clauses are involved |
| `international-tax.md` | FIRPTA withholding, treaty benefits, permanent establishment risk, GILTI, BEAT, Pillar Two, Subpart F, or cross-border tax structuring is involved |
| `equity-compensation-tax.md` | 409A valuations, 83(b) elections, ISO vs. NSO tax treatment, RSU taxation, AMT exposure, or equity compensation structuring is involved |

**Cross-area loading:** If equity compensation is involved, also load `securities/equity-issuance.md`. If employment tax or worker classification matters arise, also load `employment/`. If cross-border data flows create PE risk, flag interaction with `international-trade/`.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- Section 83(b) elections must be filed with the IRS within 30 calendar days of property transfer; this deadline is absolute with no extension or late-filing relief.
- Section 409A imposes a 20% additional tax plus premium interest on nonqualified deferred compensation that does not meet timing and distribution requirements; penalties fall on the service provider.
- Stock options with exercise prices below fair market value at grant constitute deferred compensation under 409A unless a correction program is applied.
- FIRPTA requires the buyer to withhold 15% of the amount realized on dispositions of U.S. real property interests by foreign persons; failure to withhold is strict liability on the buyer.
- Transfer pricing between related parties must satisfy the arm's length standard (IRC 482, OECD Guidelines); penalties of 20-40% apply to adjustments when documentation is inadequate.
- FATCA imposes 30% withholding on payments to non-participating foreign financial institutions with no treaty override.
- The Pillar Two global minimum tax (15% effective rate) applies to MNE groups with EUR 750M+ consolidated revenue.
