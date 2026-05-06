---
counsel-os-type: law-area
content-version: "2026-04-08"
jurisdiction: [us-state, international]
---
## Sales Tax Vat

# Sales Tax and VAT

## Applicability

Load when ANY of the following is present: sales tax collection obligation, use tax, economic nexus analysis, SaaS or digital goods taxability, marketplace facilitator laws, exemption certificate management, Streamlined Sales Tax, EU VAT registration, UK VAT post-Brexit, digital services tax, or cross-border indirect tax structuring.

Sales and use tax is a transaction-level tax imposed on the sale of tangible personal property and, increasingly, digital goods and services. VAT is a consumption tax applied at each stage of the supply chain. Both require sellers to register, collect, and remit — failure to do so creates uncapped historical liability.

## Key Requirements

### Economic Nexus — South Dakota v. Wayfair (2018)

- **What**: The U.S. Supreme Court in South Dakota v. Wayfair, Inc. (585 U.S. ___, 2018) eliminated the physical presence requirement for sales tax nexus, replacing it with an economic nexus standard based on sales volume or transaction count.
- **Threshold/Timeline**: The South Dakota model (adopted by most states) triggers nexus at $100,000 in gross sales OR 200 separate transactions in the state within the current or prior calendar year.
  - Some states have adopted only a dollar threshold: California ($500,000), Texas ($500,000), New York ($500,000 plus 100 transactions).
  - Thresholds are measured per state and must be monitored on a rolling basis.
  - Once nexus is established, the seller must register, collect, and remit — typically within 30-60 days.
  - As of 2025, 45 states plus DC impose sales tax, and all of them (plus territories) have adopted economic nexus standards.
- **Consequence**: Failure to register and collect after nexus is triggered exposes the seller to retroactive assessment of uncollected tax plus penalties (typically 5-25% of unpaid tax) and interest. Purchasers remain liable for use tax on untaxed purchases, but seller-side enforcement is the primary mechanism. Audit lookback periods typically reach 3-4 years, but can extend to 7 years for non-filers.

### SaaS and Digital Goods Taxability

- **What**: Taxability of software-as-a-service (SaaS), cloud computing, digital downloads, and streaming services varies dramatically by state. There is no federal framework governing SaaS taxability.
- **Threshold/Timeline**: Approximately half of U.S. states tax SaaS as either tangible personal property, a taxable service, or a specifically enumerated digital product.
  - States taxing SaaS include (as of 2025): Connecticut, Hawaii, Iowa, Massachusetts, New Mexico, New York, Ohio, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Washington, and West Virginia, among others.
  - States generally not taxing SaaS include: California, Colorado, Florida, Illinois, and Virginia (though this landscape changes frequently through legislation and administrative rulings).
  - Digital downloads (music, e-books, software) are taxed in roughly 30+ states.
  - Streaming services are increasingly taxed, often under "amusement" or "communications" tax frameworks.
  - Infrastructure-as-a-service (IaaS) and platform-as-a-service (PaaS) may be taxed differently from SaaS within the same state.
  - The distinction between a "taxable product" and a "non-taxable service" varies by state and is frequently litigated.
- **Consequence**: Misclassification of a SaaS product as non-taxable in a taxing state creates historical exposure from the date nexus was established. Due diligence in M&A must assess SaaS tax exposure — uncollected sales tax is a common diligence finding that can affect purchase price.

### Marketplace Facilitator Laws

- **What**: Marketplace facilitator laws shift the sales tax collection and remittance obligation from the individual seller to the marketplace platform (e.g., Amazon, Etsy, eBay) that facilitates the sale.
- **Threshold/Timeline**: As of 2025, 46 states plus DC and Puerto Rico have adopted marketplace facilitator laws.
  - The marketplace must collect and remit when the marketplace's aggregate sales into the state (across all sellers) exceed the state's economic nexus threshold.
  - Individual sellers making sales through a qualifying marketplace are generally relieved of their collection obligation for those sales.
  - Definition of "marketplace facilitator" typically requires the platform to facilitate the sale, collect payment, and either list products or provide the forum.
- **Consequence**: Marketplaces face audit risk on behalf of all sellers. Sellers making sales both through marketplaces and through their own channels must track which sales are covered and which require direct collection. Errors in marketplace reporting can create dual-collection or non-collection gaps.

### Exemption Certificates

- **What**: Sales tax exemptions require the seller to obtain and retain valid exemption or resale certificates from the purchaser to avoid collection obligations.
- **Threshold/Timeline**: Certificates must be obtained at or before the time of sale (most states allow a reasonable "good faith" cure period of 90-120 days).
  - Certificates must be kept on file for the statute of limitations period (typically 3-4 years from the date of sale, longer in some states).
  - Multi-state sellers can use the Streamlined Sales Tax (SST) Exemption Certificate (SSTGB Form F0003) for member states, or the Multistate Tax Commission (MTC) Uniform Sales & Use Tax Exemption Certificate.
  - Common exemption types: resale, manufacturing, government, nonprofit, agricultural, and direct pay permits.
  - Sellers must verify certificates are fully completed, match the transaction, and are not expired.
- **Consequence**: Missing or invalid exemption certificates shift the tax liability back to the seller if challenged on audit. States increasingly reject blanket exemptions and require entity-specific and transaction-specific certificates. Over-reliance on customer certifications without reasonable validation is a significant audit risk.

### EU VAT

- **What**: Value-Added Tax is a consumption tax applied at each stage of the supply chain throughout the EU. VAT is charged on the supply of goods and services within EU member states, intra-community acquisitions, and imports.
- **Threshold/Timeline**: Standard VAT rates range from 17% (Luxembourg) to 27% (Hungary), with most member states between 19-25%.
  - Non-EU sellers supplying digital services (including SaaS, streaming, e-books) to EU consumers must register for and charge VAT in the consumer's member state, with no minimum threshold.
  - The One-Stop Shop (OSS) simplifies compliance by allowing a single VAT return for all EU digital service sales, filed in one member state.
  - Intra-community distance selling threshold: EUR 10,000 aggregate EU-wide (above which VAT is charged in the destination state).
  - B2B supplies of services are generally taxed where the business customer is established (reverse charge mechanism applies — the customer self-assesses VAT).
  - Reduced rates apply in many member states for specific categories (e.g., e-books at reduced rates in France and Germany).
  - VAT registration, invoicing, and record-keeping requirements vary by member state.
- **Consequence**: Failure to register for VAT in required jurisdictions exposes the seller to back-assessments, penalties (varies by member state, typically 10-30%), and interest. EU member states actively exchange information and are increasing enforcement against non-EU digital service providers.

### UK VAT Post-Brexit

- **What**: Following Brexit, the UK operates an independent VAT system separate from the EU. Non-UK sellers of goods valued at GBP 135 or less to UK consumers must register for UK VAT and charge it at point of sale. Online marketplaces are responsible for collecting UK VAT on goods sold by overseas sellers.
- **Threshold/Timeline**: Standard UK VAT rate: 20%. Reduced rate: 5% for certain supplies (home energy, children's car seats). Zero rate: 0% for essentials (most food, children's clothing, books).
  - Registration threshold for UK-established businesses: GBP 90,000 (as of 2024).
  - Non-UK businesses with no UK establishment have no registration threshold — they must register from the first taxable supply.
  - Digital services to UK consumers are subject to UK VAT regardless of volume.
  - Making Tax Digital (MTD) requires VAT-registered businesses to maintain digital records and submit returns through compatible software.
- **Consequence**: Non-compliance triggers HMRC assessment, penalties, and potential restriction on selling into the UK market. Businesses previously relying on EU VAT registrations must separately register in the UK.

### Streamlined Sales Tax (SST)

- **What**: The Streamlined Sales and Use Tax Agreement (SSUTA) is a multi-state compact designed to simplify and standardize sales tax administration across member states, reducing the compliance burden for sellers.
- **Threshold/Timeline**: 24 member states as of 2025.
  - SST provides uniform definitions (e.g., "food," "clothing," "digital goods"), a centralized registration system, simplified exemption administration, and technology-based compliance solutions (Certified Service Providers).
  - Sellers registering through SST may receive amnesty for prior uncollected tax in member states.
  - Certified Service Providers (CSPs) provide free tax calculation, filing, and remittance software for volunteer sellers.
  - Certified Automated Systems (CAS) provide tax calculation software that sellers can integrate into existing systems.
- **Consequence**: SST registration may waive prior period liabilities in member states, providing a compliance on-ramp. However, SST does not cover all states — notably absent: California, New York, Texas, Illinois, Florida, and Pennsylvania.

### Digital Services Taxes (DSTs)

- **What**: Several countries have implemented or proposed unilateral digital services taxes targeting revenue from digital activities (online advertising, digital marketplaces, data monetization) by large technology companies, pending resolution of the OECD Pillar One framework.
- **Threshold/Timeline**: Examples: France (3% on revenue from targeted advertising and digital intermediation, for companies with global revenue exceeding EUR 750M and French revenue exceeding EUR 25M), UK (2% on revenue from social media platforms, search engines, and online marketplaces, for companies with global revenue exceeding GBP 500M and UK revenue exceeding GBP 25M), Italy (3%, similar scope), India (2% equalization levy on e-commerce supply of services).
  - DSTs are generally levied on gross revenue, not profit — making them particularly burdensome for low-margin businesses.
  - The OECD Pillar One framework, if fully implemented, would replace unilateral DSTs with a multilateral reallocation of taxing rights.
- **Consequence**: DSTs create double taxation risk because they are not creditable against income tax in most jurisdictions. The U.S. has threatened retaliatory tariffs against countries imposing DSTs on U.S. companies. Companies must track DST obligations on a country-by-country basis.

## Common Contract Issues

- SaaS agreements that do not address sales tax collection responsibility or pass-through to the customer.
- Failure to include tax-exclusive pricing language, leading to disputes about whether the stated price includes or excludes sales tax.
- Contracts with no mechanism for the seller to pass through newly applicable sales tax after contract execution (change-in-law exposure).
- Missing exemption certificate management procedures in high-volume B2B agreements.
- Marketplace agreements that do not clearly allocate facilitator vs. seller collection responsibilities.
- Cross-border SaaS contracts that do not address EU VAT, UK VAT, or other foreign indirect tax obligations.
- Bundled agreements (SaaS + professional services + hardware) where taxability differs by component but no allocation is provided.
- M&A purchase agreements that do not include sales tax exposure as a specific diligence item or indemnified liability.

## Interaction with Other Areas

- **Consumer Protection**: Sales tax must be separately stated from the advertised price in most U.S. jurisdictions; bundling tax into a "total price" without disclosure may violate state consumer protection laws and UDAP statutes.
- **Data Privacy**: EU VAT compliance for digital services requires collecting and retaining customer location data (IP address, billing address), which interacts with GDPR data minimization principles.
- **International Trade**: Import duties and customs duties are separate from VAT but are often assessed together at the border; cross-border e-commerce triggers both regimes simultaneously.
- **Financial Services**: Many financial services are exempt from VAT in the EU and from sales tax in U.S. states, but the scope of the exemption varies — payment processing fees, for example, may or may not qualify.
- **International Tax**: Digital services taxes interact with Pillar One (reallocation of taxing rights) and Pillar Two (minimum tax) frameworks (see `international-tax.md`).
- **Tax Indemnities**: Sales tax indemnification in asset purchase agreements allocates responsibility for pre-closing uncollected sales tax between buyer and seller (see `tax-indemnities.md`).

## Sources

- [South Dakota v. Wayfair, Inc., 585 U.S. ___ (2018)](https://www.law.cornell.edu/supremecourt/text/17-494) — Economic nexus landmark decision
- [Streamlined Sales Tax Governing Board — SSUTA](https://www.streamlinedsalestax.org/) — Multi-state compact and registration
- [EU VAT Directive 2006/112/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006L0112) — EU VAT framework
- [UK HMRC VAT Guidance](https://www.gov.uk/guidance/vat-guide-notice-700) — UK VAT registration and compliance
- [OECD — Tax Challenges Arising from the Digitalisation of the Economy](https://www.oecd.org/tax/beps/beps-actions/action1/) — Pillar One and DST context
