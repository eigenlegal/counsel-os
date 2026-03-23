## Overview

# Financial Services

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** financial services, banking, lending, loan, credit, fintech, payments, payment processing, payment facilitator, payfac, money transmission, money transmitter, stored value, prepaid, e-money, electronic funds transfer, ACH, wire transfer, credit card, debit card, merchant services, acquiring, issuing, interchange, PCI DSS, PCI compliance, financial institution, bank, credit union, neobank, banking as a service, BaaS, bank charter, bank partnership, deposit, FDIC, trust, fiduciary, investment adviser, broker-dealer, fund, hedge fund, private equity fund, venture capital fund, asset management, wealth management, robo-adviser, cryptocurrency, digital assets, blockchain, token, stablecoin, DeFi, decentralized finance, virtual currency, BSA, AML, anti-money laundering, KYC, know your customer, CDD, customer due diligence, SAR, suspicious activity report, CTR, currency transaction report, OFAC, sanctions screening, MSB, money services business, consumer lending, marketplace lending, BNPL, buy now pay later, earned wage access, BitLicense, Howey test, usury, APR, truth in lending, TILA, ECOA, fair lending, CFPB, de novo charter, capital requirements, Basel III, CRA, embedded finance, open banking, regulatory sandbox
**Clause types:** payment processing terms, merchant agreements, bank partnership agreement provisions, money transmission license requirements, lending terms (interest rate, APR, fees, repayment), truth in lending disclosures, deposit account terms, electronic fund transfer authorization, BSA/AML program requirements, vendor due diligence provisions for financial institutions, regulatory examination provisions, capital and liquidity requirements, third-party risk management provisions, PCI DSS compliance provisions, cryptocurrency custody terms, stablecoin reserve requirements, digital asset trading terms
**Regulatory references:** Bank Secrecy Act (BSA), USA PATRIOT Act, FinCEN regulations, OFAC SDN List, state money transmitter laws, Uniform Money Services Act, TILA (Truth in Lending Act), Regulation Z, ECOA (Equal Credit Opportunity Act), Regulation B, EFTA (Electronic Fund Transfer Act), Regulation E, FDCPA (Fair Debt Collection Practices Act), FCRA (Fair Credit Reporting Act), Regulation V, Dodd-Frank Act, CFPB regulations, state usury laws, state lending licenses, OCC guidance, FDIC guidance, Federal Reserve guidance, PCI DSS, NACHA Operating Rules, card network rules (Visa, Mastercard), state insurance regulations for fintech products, NY DFS BitLicense, FinCEN cryptocurrency guidance, Howey test, Commodity Exchange Act, Basel III, Community Reinvestment Act, Corporate Transparency Act
**Relationship patterns:** bank/fintech partner, payment processor/merchant, lender/borrower, fund manager/investor, broker-dealer/customer, money transmitter/customer, BaaS provider/fintech, acquiring bank/payment facilitator, issuer/cardholder, crypto exchange/user, stablecoin issuer/holder

## Sub-Files

- `payments-money-transmission.md` — Payment processing and money transmission regulation. Load when: payment services, money transmission, stored value, mobile payments, payment facilitation, marketplace payment flows, ACH/NACHA, or card network compliance are involved.
- `kyc-aml.md` — Know Your Customer and Anti-Money Laundering requirements. Load when: customer onboarding, identity verification, transaction monitoring, suspicious activity reporting, sanctions compliance, beneficial ownership, or BSA program requirements are involved.
- `banking-regulation.md` — Bank charters, supervision, and BaaS oversight. Load when: bank partnerships, BaaS arrangements, de novo bank formation, capital requirements, FDIC insurance, regulatory examinations, third-party risk management, or CRA obligations are involved.
- `lending.md` — Consumer and commercial lending regulation. Load when: loan origination, credit disclosures (TILA/Reg Z), fair lending (ECOA/Reg B), interest rates, usury, state lending licenses, CFPB authority, BNPL, earned wage access, or mortgage lending are involved.
- `fintech.md` — Fintech regulatory frameworks and bank-fintech partnerships. Load when: fintech regulatory strategy, special purpose charters, regulatory sandboxes, embedded finance, multi-state licensing, true lender issues, or open banking/data access are involved.
- `cryptocurrency.md` — Cryptocurrency and digital asset regulation. Load when: cryptocurrency, digital assets, blockchain tokens, stablecoins, DeFi, virtual currency exchanges, BitLicense, Howey test analysis, crypto custody, or Travel Rule compliance are involved.
- `pci-dss.md` — Payment Card Industry Data Security Standard. Load when: payment card processing, cardholder data storage or transmission, merchant PCI compliance, SAQ/QSA assessments, card network security rules, or payment data breach liability are involved.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- Money transmission without a license (or valid exemption) is a federal crime (18 U.S.C. 1960) and a violation of state money transmitter laws in virtually all states (49 states plus DC require licenses; Montana is exempt).
- BSA/AML compliance programs (including customer identification, transaction monitoring, suspicious activity reporting, and OFAC screening) are mandatory for financial institutions and money services businesses and cannot be delegated away by contract. Penalties reach $1M/day civil and $500K+10yr criminal.
- Truth in Lending Act disclosures (APR, finance charges, total of payments) must be provided to consumer borrowers and cannot be waived. Rescission rights (3 business days for secured consumer credit) are statutory.
- Equal Credit Opportunity Act prohibits discrimination on protected bases in any credit transaction. Adverse action notice required within 30 days.
- State usury limits impose maximum permissible interest rates that cannot be contractually overridden (though federal preemption applies to certain national banks and federal savings associations).
- PCI DSS compliance is required by payment card network rules for all entities that store, process, or transmit cardholder data; non-compliance can result in fines ($5K-$100K/month), increased transaction fees, and loss of card acceptance privileges.
- CFPB enforcement authority extends to unfair, deceptive, or abusive acts or practices (UDAAP) in consumer financial services, providing a standard that is broader than traditional UDAP.
- Convertible virtual currency exchange and transmission constitutes money transmission under federal law (FinCEN FIN-2019-G001) and requires MSB registration and state licensing.
- OFAC sanctions screening is a strict liability obligation — no minimum transaction threshold and no intent requirement for civil penalties.
- Banks must maintain minimum capital ratios under Basel III (4.5% CET1, 6% Tier 1, 8% Total Capital) with prompt corrective action for non-compliance.

---
## Banking Regulation

# Banking Regulation

## Applicability

Load when the matter involves bank charters, bank partnerships, Banking-as-a-Service (BaaS), de novo bank formation, capital requirements, deposit accounts, FDIC insurance, regulatory examinations, third-party risk management for banks, or Community Reinvestment Act obligations.

## Key Requirements

### Federal Regulatory Framework

- **What:** US banking is regulated through a dual (federal/state) system with multiple federal regulators based on charter type:
  - **OCC (Office of the Comptroller of the Currency):** Primary regulator for national banks and federal savings associations
  - **FDIC (Federal Deposit Insurance Corporation):** Primary regulator for state-chartered banks not members of the Federal Reserve System; insures deposits at all member institutions
  - **Federal Reserve:** Primary regulator for state-chartered banks that are Federal Reserve members; regulator for bank holding companies and savings and loan holding companies
  - **State banking departments:** Primary regulators for state-chartered institutions (shared with FDIC or Fed depending on Fed membership)
- **Consequence:** Operating a deposit-taking institution without a charter is prohibited. Each regulator has examination, enforcement, and civil money penalty authority.

### De Novo Bank Charter

- **What:** Formation of a new (de novo) bank requires regulatory approval from the chartering authority (OCC for national, state banking department for state) and FDIC for deposit insurance.
- **Timeline:** Typically 2 to 3 years from application to approval. OCC targets 12-18 months for processing but complex applications take longer.
- **Requirements:** Detailed business plan, management team with banking experience, minimum capital (typically $20M–$50M+ depending on the business model and risk profile), 3-year financial projections, BSA/AML program, CRA plan, and IT/cybersecurity framework.
- **De novo period:** Enhanced supervisory oversight for the first 3 years (FDIC) or 7 years (OCC, for certain conditions). Higher capital ratios may be required during this period.
- **Consequence:** Failure to meet conditions or maintain safety and soundness during the de novo period may result in enforcement action or charter revocation.

### Capital Requirements (Basel III)

- **What:** US banking agencies adopted Basel III capital standards requiring banks to maintain minimum capital ratios.
- **Threshold:**
  - **Common Equity Tier 1 (CET1):** Minimum 4.5% of risk-weighted assets
  - **Tier 1 Capital:** Minimum 6% of risk-weighted assets
  - **Total Capital:** Minimum 8% of risk-weighted assets
  - **Capital Conservation Buffer:** Additional 2.5% CET1 (effectively 7% CET1 minimum to avoid dividend/bonus restrictions)
  - **Leverage Ratio:** Minimum 4% Tier 1 capital to total assets
- **Community bank leverage ratio (CBLR):** Banks under $10B in assets may opt into the CBLR framework — a single 9% leverage ratio in lieu of risk-based ratios.
- **Consequence:** Falling below minimums triggers prompt corrective action (PCA), ranging from restrictions on dividends and growth (undercapitalized) to mandatory receivership within 90 days (critically undercapitalized).

### Banking-as-a-Service (BaaS) and Bank Partnerships

- **What:** Fintech companies partner with chartered banks to offer banking products under the bank's charter and regulatory umbrella.
- **Regulatory scrutiny:** OCC, FDIC, and Federal Reserve have issued interagency guidance on third-party risk management (OCC Bulletin 2023-17). The bank must maintain meaningful oversight — a "passive participant" approach is subject to enforcement.
- **Key requirements:** The bank must conduct due diligence on the fintech partner, maintain contractual audit and examination rights, ensure compliance program adequacy, monitor the partner's activities, and have contingency plans for relationship termination.
- **True lender risk:** If the non-bank fintech is deemed the "true lender," it must hold its own lending licenses and cannot rely on the bank's charter. Courts examine economic substance including who holds predominant economic interest, who sets underwriting criteria, and who funds the loans.
- **Consequence:** Inadequate BaaS oversight has resulted in consent orders, civil money penalties ($1M–$50M+), and growth restrictions on partner banks. Multiple BaaS banks have received enforcement actions since 2022.

### Third-Party Risk Management

- **What:** Federal banking regulators require banks to manage risks from third-party relationships through a lifecycle approach (31 C.F.R.; OCC Bulletin 2023-17, FDIC FIL-44-2008, Federal Reserve SR 13-19/CA 13-21).
- **Requirements:** Planning (risk assessment), due diligence and third-party selection, contract negotiation (must include audit rights, compliance obligations, performance standards, business continuity, subcontracting controls, default/termination provisions), ongoing monitoring, and contingency planning.
- **Critical activities:** Relationships involving critical activities (significant bank functions, customer-facing services, material risk exposure) require enhanced oversight including board reporting.
- **Consequence:** Regulatory examination findings on third-party risk management deficiencies can lead to MRAs (Matters Requiring Attention), MRIAs (Matters Requiring Immediate Attention), consent orders, and civil money penalties.

### Community Reinvestment Act (CRA)

- **What:** CRA (12 U.S.C. 2901) requires insured depository institutions to meet the credit needs of their entire community, including low- and moderate-income neighborhoods, consistent with safe and sound operations.
- **Threshold:** CRA examinations and ratings apply to all insured depository institutions. Evaluation tests vary by asset size (small bank, intermediate small bank, large bank).
- **Timeline:** CRA performance evaluations conducted on a regular cycle (typically every 2-4 years). Final CRA modernization rule effective April 1, 2024 (implementation phased through 2026).
- **Consequence:** Unsatisfactory CRA ratings can result in denial or delay of applications for mergers, acquisitions, branch openings, and other expansion activities. CRA ratings are publicly available.

### Examination Cycle

- **What:** Federal and state regulators conduct regular safety and soundness examinations of all insured depository institutions.
- **Timeline:** Full-scope examination at least every 12 months for institutions with assets over $3B or with composite CAMELS ratings of 3, 4, or 5. Institutions under $3B with CAMELS 1 or 2 may be examined every 18 months.
- **Scope:** CAMELS rating system evaluates Capital adequacy, Asset quality, Management, Earnings, Liquidity, and Sensitivity to market risk. Separate IT, BSA/AML, Trust, and CRA examinations may also occur.
- **Consequence:** Adverse examination findings can lead to informal actions (board resolutions, MOUs) or formal enforcement actions (consent orders, cease-and-desist orders, civil money penalties, removal of officers/directors).

## Interaction with Other Areas

- **Financial Services (Payments):** Bank partnership structures may provide money transmission exemptions for fintech partners. See `payments-money-transmission.md`.
- **Financial Services (KYC/AML):** BSA/AML program adequacy is a key examination area for all banks. See `kyc-aml.md`.
- **Financial Services (Lending):** Banks must comply with consumer lending laws and fair lending requirements. See `lending.md`.
- **Financial Services (Fintech):** BaaS and fintech partnerships are a primary regulatory focus. See `fintech.md`.
- **Consumer Protection:** Banks with assets over $10B are subject to CFPB supervisory authority.
- **Data Privacy:** Banks are subject to GLBA Safeguards Rule and state privacy laws.

## Sources

- OCC: https://www.occ.treas.gov
- FDIC: https://www.fdic.gov
- Federal Reserve Supervision: https://www.federalreserve.gov/supervisionreg.htm
- OCC Bulletin 2023-17 (Third-Party Risk Management): https://www.occ.gov/news-issuances/bulletins/2023/bulletin-2023-17.html
- Basel III Capital Rules (12 C.F.R. Part 3): https://www.law.cornell.edu/cfr/text/12/part-3
- CRA (12 U.S.C. 2901): https://www.law.cornell.edu/uscode/text/12/2901

---
## Cryptocurrency

# Cryptocurrency and Digital Assets

## Applicability

Load when the matter involves cryptocurrency, digital assets, blockchain, tokens, stablecoins, DeFi (decentralized finance), virtual currency exchanges, NFTs with financial characteristics, crypto custody, or digital asset investment products.

## Key Requirements

### FinCEN — Money Transmission

- **What:** FinCEN treats convertible virtual currency (CVC) as "value that substitutes for currency" and applies money transmission regulations to persons who accept and transmit CVC (FIN-2019-G001).
- **Threshold:** Any person who accepts and transmits convertible virtual currency or buys or sells convertible virtual currency is a money transmitter under 31 C.F.R. 1010.100(ff)(5), unless an exemption applies.
- **MSB registration:** CVC exchangers and administrators must register with FinCEN as MSBs within 180 days of beginning operations.
- **BSA/AML obligations:** Full BSA/AML program requirements apply including CIP, CDD, transaction monitoring, SAR filing, and CTR filing for cash transactions.
- **Consequence:** Operating an unregistered CVC exchange is a violation of federal law. Criminal penalties under 18 U.S.C. 1960 (unlicensed money transmission). FinCEN enforcement actions have resulted in penalties exceeding $100M.

### State Licensing — BitLicense and Money Transmission

- **What:** Most states require money transmission licenses for cryptocurrency exchange and transmission activities. New York's BitLicense (23 NYCRR Part 200) is the most prominent state-specific crypto regulation.
- **BitLicense requirements:** Mandatory for any entity engaging in virtual currency business activity involving New York or New York residents. Requires application ($5,000 fee), detailed business plan, compliance program, capital requirements, cybersecurity program (23 NYCRR 500), and NYDFS ongoing supervision.
- **BitLicense scope:** Covers receiving, transmitting, storing, buying, selling, and issuing virtual currency, as well as controlling/administering virtual currency.
- **Other states:** Most states apply existing money transmission frameworks to crypto. Some states (Wyoming, Montana) have enacted crypto-specific exemptions or frameworks.
- **Consequence:** Operating without required state licenses subjects the entity to enforcement actions, civil penalties, and criminal prosecution. BitLicense violations carry penalties up to $5,000 per day.

### SEC — Securities Regulation

- **What:** The SEC applies the Howey test to determine whether a digital asset is a "security" (investment contract). Under Howey, a security exists when there is (1) an investment of money, (2) in a common enterprise, (3) with a reasonable expectation of profits, (4) derived from the efforts of others.
- **Threshold:** No de minimis threshold. Any offer or sale of a security must be registered under the Securities Act of 1933 or qualify for an exemption (Regulation D, Regulation A+, Regulation S, Regulation Crowdfunding).
- **Exchange registration:** Platforms that facilitate trading in digital asset securities must register as national securities exchanges or operate under an exemption (e.g., ATS). SEC has brought enforcement actions against unregistered crypto exchanges.
- **Staking and DeFi:** SEC has asserted that certain staking-as-a-service programs and DeFi protocols may involve securities. Analysis is fact-specific.
- **Consequence:** Offering or selling unregistered securities carries civil penalties (disgorgement + interest + penalties), injunctions, and potential criminal referral. SEC enforcement actions in crypto have resulted in penalties exceeding $1B in aggregate.

### CFTC — Digital Commodities

- **What:** The CFTC has asserted jurisdiction over digital assets that qualify as "commodities" under the Commodity Exchange Act (CEA), particularly Bitcoin and Ether.
- **Threshold:** The CFTC has anti-fraud and anti-manipulation enforcement authority over commodity spot markets. Derivatives (futures, options, swaps) on digital assets require registration of trading platforms (DCMs, SEFs) and intermediaries (FCMs, CPOs, CTAs).
- **Retail commodity transactions:** Leveraged or margined digital asset transactions with retail customers may constitute retail commodity transactions subject to CFTC regulation unless actual delivery occurs within 28 days.
- **Consequence:** CFTC enforcement actions for fraud and manipulation in digital commodity markets have resulted in penalties exceeding $100M in individual cases.

### IRS — Tax Treatment

- **What:** The IRS treats virtual currency as property for federal tax purposes (Notice 2014-21). Transactions involving virtual currency are subject to the same general tax principles as property transactions.
- **Threshold:** All virtual currency transactions are taxable events, including selling for fiat, exchanging one crypto for another, using crypto to pay for goods/services, and receiving crypto as compensation.
- **Reporting:** Broker reporting requirements (26 U.S.C. 6045) apply to digital asset transactions. Beginning in 2025, brokers (including exchanges and certain DeFi protocols) must issue Forms 1099-DA.
- **Consequence:** Failure to report cryptocurrency gains is tax evasion. IRS has obtained John Doe summonses from major exchanges. Penalties include accuracy-related penalties (20%), fraud penalties (75%), and criminal prosecution.

### Travel Rule

- **What:** FinCEN's Travel Rule (31 C.F.R. 1010.410(f)) requires financial institutions and MSBs to collect, retain, and transmit certain information for funds transfers.
- **Threshold:** Applies to funds transfers (including CVC transfers) of $3,000 or more. Required information includes originator name, account number, address, and beneficiary information.
- **Implementation challenges:** The decentralized and pseudonymous nature of blockchain transactions creates technical challenges for Travel Rule compliance. FATF Recommendation 16 imposes similar requirements internationally.
- **Consequence:** Failure to comply with the Travel Rule is a BSA violation subject to civil money penalties and criminal prosecution.

### Stablecoin Regulation

- **What:** Stablecoins (digital assets designed to maintain a stable value relative to a reference asset, typically USD) face evolving regulatory scrutiny.
- **Current framework:** No comprehensive federal stablecoin legislation as of the current date, though multiple bills have been proposed. Existing regulators apply current authority:
  - **OCC:** Interpretive letters permitting national banks to hold stablecoin reserves and use stablecoins for payment activities
  - **SEC:** May treat certain stablecoins as securities depending on structure
  - **State regulators:** NY DFS has issued guidance on stablecoin reserves and redemption requirements; other states apply money transmission frameworks
- **Reserve requirements:** Regulators generally expect stablecoins to be backed by high-quality liquid assets (cash, Treasury securities) with regular attestation.
- **Consequence:** Regulatory uncertainty creates compliance risk. Stablecoin issuers may face enforcement from multiple regulators simultaneously.

## Interaction with Other Areas

- **Financial Services (KYC/AML):** Crypto exchanges and CVC transmitters must maintain full BSA/AML programs. See `kyc-aml.md`.
- **Financial Services (Payments):** CVC transmission is a form of money transmission. See `payments-money-transmission.md`.
- **Financial Services (Fintech):** Crypto companies face the same bank partnership and licensing challenges as other fintechs. See `fintech.md`.
- **Securities:** Token offerings may constitute securities offerings. SEC registration or exemption analysis required.
- **International Trade:** OFAC sanctions apply to cryptocurrency transactions. Sanctions screening must cover blockchain addresses on the SDN list.
- **Data Privacy:** Blockchain immutability creates tension with GDPR right to erasure and data minimization principles.

## Sources

- FinCEN Virtual Currency Guidance (FIN-2019-G001): https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models
- SEC Framework for Digital Assets: https://www.sec.gov/corpfin/framework-investment-contract-analysis-digital-assets
- CFTC Digital Assets: https://www.cftc.gov/digitalassets
- IRS Notice 2014-21: https://www.irs.gov/irb/2014-16_IRB#NOT-2014-21
- NY BitLicense (23 NYCRR Part 200): https://www.law.cornell.edu/regulations/new-york/23-NYCRR-Pt-200
- FATF Virtual Assets Guidance: https://www.fatf-gafi.org/en/topics/virtual-assets.html

---
## Fintech

# Fintech Regulation

## Applicability

Load when the matter involves fintech company regulatory strategy, bank-fintech partnerships, BaaS arrangements, regulatory sandboxes, special purpose charters, embedded finance, multi-state licensing strategy, or open banking/data access.

## Key Requirements

### OCC Special Purpose National Bank Charter

- **What:** The OCC has authority to grant special purpose national bank (SPNB) charters, including to fintech companies. The charter would allow nationwide operation without state-by-state licensing for certain activities.
- **Threshold:** Applicants must meet the same core requirements as traditional national banks: capital adequacy, a comprehensive business plan, experienced management, compliance infrastructure, and CRA commitments.
- **Status:** The OCC fintech charter has faced legal challenges (Conference of State Bank Supervisors v. OCC). The program's availability remains uncertain, and no fintech company has successfully obtained a SPNB charter as of the current date.
- **Industrial Loan Company (ILC):** Alternative path — certain states (notably Utah, Nevada) charter ILCs that provide FDIC-insured deposit-taking ability without being subject to Federal Reserve bank holding company oversight. Several fintech companies have obtained ILC charters.
- **Consequence:** Operating as an unlicensed fintech providing banking services without a charter or valid partnership arrangement exposes the company to state enforcement actions.

### Regulatory Sandboxes

- **What:** Several US states and some federal agencies have established regulatory sandbox programs allowing companies to test innovative financial products with temporary, reduced regulatory requirements.
- **Threshold:** Participation typically requires application, consumer protection commitments, reporting obligations, and time/customer limits.
- **State programs:** Arizona (first US sandbox, 2018), Utah, Wyoming, Nevada, West Virginia, Kentucky, and others have enacted sandbox legislation. Scope and eligibility vary significantly.
- **Federal:** CFPB no-action letter policy and compliance assistance sandbox (status has fluctuated with administration changes). OCC responsible innovation framework.
- **Consequence:** Sandbox participation does not eliminate all regulatory obligations. Companies must plan for full compliance at sandbox expiration.

### Embedded Finance and BaaS

- **What:** Embedded finance integrates financial services (payments, lending, insurance, banking) into non-financial platforms and products via APIs and bank partnerships.
- **BaaS regulatory model:** The fintech provides the customer interface and technology; the bank provides the charter, regulatory infrastructure, and (in theory) compliance oversight.
- **Regulatory expectations:** Regulators require the bank to maintain meaningful control over the customer relationship, compliance programs, and risk management — not merely serve as a "charter rental." The bank must be able to demonstrate it controls underwriting, pricing, and compliance for programs offered through its charter.
- **Middleware providers:** BaaS middleware/infrastructure companies that sit between banks and fintechs are increasingly subject to regulatory scrutiny. Banks must ensure they have visibility through middleware layers.
- **Consequence:** Enforcement actions against BaaS banks have included consent orders requiring program wind-downs, growth restrictions, civil money penalties, and in some cases de facto prohibition on new fintech partnerships until compliance concerns are resolved.

### Multi-State Licensing

- **What:** Non-bank fintech companies offering lending, money transmission, or other regulated financial services must obtain licenses in each state where they operate.
- **NMLS (Nationwide Multistate Licensing System):** Centralized platform for license applications, renewals, and reporting. Used for money transmission, mortgage, and certain consumer lending licenses.
- **Timeline:** Full multi-state licensing (all 50 states) typically takes 12 to 24 months. Some states have processing backlogs exceeding 12 months.
- **Cost:** Total multi-state licensing costs (application fees, bonds, legal, compliance) typically range from $500,000 to $2,000,000+ depending on the license types needed.
- **Uniformity efforts:** MSB licensing harmonization through NMLS has improved but significant state-by-state variation remains in definitions, exemptions, and examination practices.
- **Consequence:** Operating without required state licenses subjects the company to cease-and-desist orders, civil penalties, and potential criminal liability. License applications may require disclosure of prior unlicensed activity.

### True Lender and Predominant Economic Interest

- **What:** In bank-fintech lending partnerships, regulators and courts examine whether the bank or the fintech is the "true lender" of the loans originated through the program.
- **Key factors:** Which entity funds the loans, which entity holds the predominant economic interest (including through immediate purchase agreements), which entity sets underwriting criteria and pricing, and which entity markets to borrowers.
- **OCC true lender rule:** The OCC issued a rule (12 C.F.R. 7.1031) providing that a national bank is the true lender if it is named as lender in the loan agreement or funds the loan. This rule was overturned by Congressional Review Act resolution in June 2021.
- **State actions:** Multiple state AGs have challenged bank-fintech lending partnerships, arguing the fintech is the true lender and therefore subject to state usury and licensing laws.
- **Consequence:** If the fintech is deemed the true lender, it loses the benefit of bank charter preemption for usury and licensing. Loans may be subject to state usury caps, potentially rendering them void or requiring interest refunds.

### No US Open Banking Mandate

- **What:** Unlike the EU (PSD2/PSD3) and UK (Open Banking), the US does not have a comprehensive federal open banking mandate requiring banks to share customer data with third parties via APIs.
- **CFPB Section 1033:** Dodd-Frank Section 1033 grants consumers the right to access their financial data. The CFPB finalized its Personal Financial Data Rights rule in 2024, establishing standards for data sharing, but implementation is phased and scope is narrower than PSD2.
- **Screen scraping:** In the absence of a mandate, fintech companies have relied on screen scraping (credential-based data access). Banks have pushed back, citing security concerns. The industry is transitioning toward tokenized API access.
- **Consequence:** Data access disputes between banks and fintechs remain common. The evolving regulatory framework creates uncertainty for business models reliant on account data aggregation.

## Interaction with Other Areas

- **Financial Services (Banking Regulation):** Bank partnerships and charter options are central to fintech regulatory strategy. See `banking-regulation.md`.
- **Financial Services (Lending):** Bank-fintech lending partnerships must comply with TILA, ECOA, fair lending, and state usury laws. See `lending.md`.
- **Financial Services (Payments):** Fintech payment products may require money transmission licenses. See `payments-money-transmission.md`.
- **Financial Services (Cryptocurrency):** Crypto-fintech products face layered regulatory requirements. See `cryptocurrency.md`.
- **Consumer Protection:** Fintech consumer products are subject to CFPB UDAAP authority and state consumer protection laws.
- **Data Privacy:** Data aggregation, screen scraping, and open banking raise GLBA, CCPA, and FCRA issues.

## Sources

- OCC Responsible Innovation: https://www.occ.treas.gov/topics/responsible-innovation/index-responsible-innovation.html
- FDIC: https://www.fdic.gov/regulations
- CFPB Fintech: https://www.consumerfinance.gov/data-research/research-reports/?topics=fintech
- NMLS: https://www.nmls.org
- CFPB Section 1033 Rulemaking: https://www.consumerfinance.gov/rules-policy/rules/required-rulemaking-personal-financial-data-rights/

---
## Kyc Aml

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
- **Consequence:** Civil penalties under a strict liability standard up to the greater of $356,579 (adjusted annually) or twice the transaction value. Criminal penalties up to $1,000,000 and 20 years imprisonment for willful violations.

### Beneficial Ownership

- **What:** Financial institutions must identify and verify the identity of beneficial owners of legal entity customers at account opening.
- **Threshold:** Individuals with 25% or more equity ownership interest, PLUS one individual with significant management responsibility (e.g., CEO, CFO, managing member), regardless of ownership percentage.
- **CDD Rule scope:** Applies to legal entity customers (corporations, LLCs, partnerships, trusts other than statutory trusts). Exemptions for publicly traded companies, regulated financial institutions, government entities, and certain others.
- **Corporate Transparency Act (CTA):** Separate requirement — most US entities must report beneficial ownership information directly to FinCEN (25%+ ownership or substantial control). Existing companies and new companies have specified filing deadlines.

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
- **Corporate:** CTA beneficial ownership reporting applies to most US entities separate from financial institution CDD obligations.
- **Litigation:** SAR filings are confidential and protected by safe harbor; litigation must navigate SAR confidentiality requirements.

## Sources

- FinCEN BSA Regulations: https://www.fincen.gov/resources/statutes-and-regulations
- FinCEN CDD Rule (31 C.F.R. 1010.230): https://www.law.cornell.edu/cfr/text/31/section-1010.230
- 31 U.S.C. 5311–5332 (BSA): https://www.law.cornell.edu/uscode/text/31/subtitle-IV/chapter-53/subchapter-II
- OFAC SDN List and Sanctions Programs: https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists
- FFIEC BSA/AML Examination Manual: https://bsaaml.ffiec.gov/manual
- Corporate Transparency Act: https://www.fincen.gov/boi

---
## Lending

# Lending Regulation

## Applicability

Load when the matter involves consumer or commercial lending, loan origination, loan servicing, credit disclosures, interest rates, fair lending, adverse action, mortgage lending, BNPL products, earned wage access, student lending, or CFPB supervisory matters.

## Key Requirements

### Truth in Lending Act (TILA) / Regulation Z

- **What:** TILA (15 U.S.C. 1601 et seq.) and its implementing Regulation Z (12 C.F.R. Part 1026) require creditors to provide uniform credit cost disclosures to consumers before consummation of a credit transaction.
- **Key disclosures:** Annual Percentage Rate (APR), finance charge, amount financed, total of payments, payment schedule, and late payment fees. For open-end credit: periodic statements, APR, fees, and billing rights.
- **Right of rescission:** For consumer credit transactions secured by the borrower's principal dwelling (excluding purchase-money mortgages), the borrower has a 3-business-day right to rescind after consummation, receipt of material disclosures, and receipt of rescission notice. Failure to provide proper disclosures extends rescission right to 3 years.
- **Threshold:** TILA applies to consumer credit (personal, family, or household purposes). Exempt: business/commercial/agricultural credit over $69,500 (adjusted annually), securities-secured credit, and public utility credit.
- **Consequence:** Statutory damages of $500–$4,000 (individual) or lesser of $1,000,000 or 1% of net worth (class action). Actual damages. Extended rescission rights. CFPB enforcement.

### Equal Credit Opportunity Act (ECOA) / Regulation B

- **What:** ECOA (15 U.S.C. 1691 et seq.) and Regulation B (12 C.F.R. Part 1002) prohibit discrimination in any aspect of a credit transaction.
- **Prohibited bases:** Race, color, religion, national origin, sex (including sexual orientation and gender identity per CFPB), marital status, age (provided the applicant has the capacity to contract), receipt of public assistance income, and good faith exercise of rights under the Consumer Credit Protection Act.
- **Adverse action notice:** Creditors must provide written notice of adverse action within 30 days of receiving a completed application (or 30 days after taking action on an incomplete application). Notice must include specific reasons for the action or the applicant's right to request reasons.
- **Threshold:** Applies to all creditors and all types of credit (consumer, commercial, agricultural). No minimum loan amount.
- **Consequence:** Actual damages, punitive damages up to $10,000 (individual) or lesser of $500,000 or 1% of net worth (class action). DOJ pattern-or-practice authority. CFPB enforcement.

### Fair Lending

- **What:** Fair lending encompasses ECOA, Fair Housing Act (for mortgage lending), and CFPB/DOJ enforcement against discriminatory lending practices.
- **Theories of liability:** Disparate treatment (intentional discrimination), disparate impact (facially neutral policy with discriminatory effect), and reverse redlining (targeting protected classes with predatory terms).
- **Algorithmic lending:** CFPB has affirmed that use of AI/ML models in credit underwriting does not eliminate fair lending obligations. Models must be tested for disparate impact and adverse action reasons must be specific and actionable.
- **Consequence:** DOJ consent decrees have required remediation payments of $10M–$200M+ in fair lending cases.

### State Usury Laws

- **What:** Each state sets maximum permissible interest rates for various types of loans. Rates and structures vary dramatically.
- **Threshold:** State usury caps range from 5% to 36%+ for consumer loans, with many states having different limits for different loan types (installment, revolving, small dollar, mortgage). Some states (e.g., Utah, South Dakota, Delaware) have no general usury cap or very high caps.
- **Federal preemption:** National banks may export their home state's interest rate to borrowers in other states (12 U.S.C. 85; Marquette National Bank v. First of Omaha Service Corp.). FDIC-insured state banks have similar authority under 12 U.S.C. 1831d.
- **Madden issue:** Madden v. Midland Funding (2nd Cir. 2015) created uncertainty about whether non-bank assignees of bank-originated loans retain rate exportation benefits. OCC "valid when made" rule (12 C.F.R. 7.4001) and FDIC rule (12 C.F.R. 331.4) address this, but state challenges continue.
- **Consequence:** Loans exceeding usury limits may be void or voidable, with penalties including forfeiture of all interest, treble damages, and criminal penalties in some states.

### State Lending Licenses

- **What:** Consumer lending, commercial lending, mortgage lending, and loan servicing each require separate state licenses in most jurisdictions.
- **Threshold:** Licensing triggers vary by state. Some require licenses based on the number of loans made, dollar volume, or simply making one loan to a state resident. Finance lender, installment lender, small loan, and industrial loan company licenses are common.
- **NMLS:** Nationwide Multistate Licensing System centralizes multi-state applications for mortgage and certain consumer lending licenses.
- **Timeline:** 3 to 12 months per state depending on the license type and state processing times.
- **Consequence:** Unlicensed lending may result in loan voidability, borrower defenses to repayment, civil penalties, and criminal prosecution.

### CFPB Authority

- **What:** The Consumer Financial Protection Bureau has supervisory authority over banks with assets exceeding $10 billion and over non-bank entities in designated markets.
- **Threshold:** Non-bank supervision extends to mortgage companies (origination, servicing, modification), payday lenders, private education lenders, and larger participants in consumer financial markets (defined by rule based on annual receipts).
- **UDAAP:** Broad authority to prohibit unfair, deceptive, or abusive acts or practices in consumer financial services (12 U.S.C. 5531). "Abusive" is a standard unique to Dodd-Frank, broader than traditional UDAP.
- **Section 1071 (Small Business Lending Data Collection):** Requires financial institutions to collect and report data on credit applications from small businesses, including women-owned and minority-owned businesses. Phased implementation based on lending volume.
- **Consequence:** CFPB enforcement orders have included penalties exceeding $100M and restitution exceeding $1B in individual matters.

### Specific Lending Products

- **BNPL (Buy Now, Pay Later):** CFPB has interpreted BNPL as subject to TILA Regulation Z (billing rights, dispute resolution, refunds). State licensing requirements vary and are evolving.
- **Earned Wage Access (EWA):** Regulatory treatment varies. Some states treat EWA as lending requiring licensing; CFPB advisory opinion (2020) provides conditions under which employer-integrated EWA may not constitute credit.
- **Mortgage lending:** Subject to extensive additional requirements including RESPA/Regulation X, TILA-RESPA Integrated Disclosure (TRID), Ability-to-Repay/Qualified Mortgage (ATR/QM) rule, HMDA reporting, and state mortgage licensing (MLO licensing through NMLS).

## Interaction with Other Areas

- **Financial Services (Banking Regulation):** Bank charter preemption affects usury and licensing. See `banking-regulation.md`.
- **Financial Services (Fintech):** Bank-fintech lending partnerships raise true lender issues. See `fintech.md`.
- **Financial Services (KYC/AML):** Lending institutions must maintain BSA/AML programs. See `kyc-aml.md`.
- **Consumer Protection:** UDAAP, state UDAP, and auto-renewal laws apply to consumer lending products.
- **Data Privacy:** Credit application data, credit reports (FCRA), and financial data (GLBA) have specific privacy requirements.

## Sources

- TILA (15 U.S.C. 1601): https://www.law.cornell.edu/uscode/text/15/chapter-41/subchapter-I
- Regulation Z (12 C.F.R. Part 1026): https://www.law.cornell.edu/cfr/text/12/part-1026
- ECOA (15 U.S.C. 1691): https://www.law.cornell.edu/uscode/text/15/1691
- Regulation B (12 C.F.R. Part 1002): https://www.law.cornell.edu/cfr/text/12/part-1002
- CFPB: https://www.consumerfinance.gov
- NMLS: https://www.nmls.org

---
## Payments Money Transmission

# Payments and Money Transmission

## Applicability

Load when the matter involves payment processing, money transmission, stored value, mobile payments, payment facilitation, marketplace payment flows, ACH/wire transfers, card network compliance, or NACHA rules.

## Key Requirements

### Money Transmission Definition

- **What:** Receiving money or monetary value for the purpose of transmitting it to another location or person by any means. Definitions vary significantly by state.
- **Federal definition:** FinCEN defines a money transmitter as a person who provides money transmission services or any person engaged in the transfer of funds (31 C.F.R. 1010.100(ff)(5)).
- **State variation:** Some states use "money transmission," others "money services business." Key definitional differences include whether holding funds alone qualifies, whether payment processing is included, and the scope of exemptions.
- **Consequence:** Unlicensed money transmission is a federal felony under 18 U.S.C. 1960 (up to 5 years imprisonment) and a violation of state law in virtually all states. State penalties include civil fines up to $25,000 per violation and criminal prosecution.

### State Licensing Requirements

- **Threshold:** License required in 49 states plus DC, Puerto Rico, and USVI. Montana does not require a money transmission license.
- **Bonding requirements:** Range from $25,000 to $7,000,000+ depending on the state and transaction volume. Many states use a tiered structure based on annual transmission volume.
- **Net worth requirements:** Typically $100,000 to $1,000,000+ depending on state and activity scope.
- **Application timeline:** 6 to 18 months per state. Some states have expedited processes; others have significant backlogs.
- **NMLS:** Nationwide Multistate Licensing System centralizes multi-state applications. Not all states participate fully.
- **Ongoing obligations:** Annual renewal, audited financial statements, call reports, examination cooperation, change-of-control notifications, and permissible investment requirements for customer funds.
- **Consequence:** Operating without required licenses subjects the company to cease-and-desist orders, civil penalties, criminal prosecution, and potential disgorgement of revenues.

### Federal MSB Registration

- **What:** Money services businesses, including money transmitters, must register with FinCEN on Form 107.
- **Timeline:** Must register within 180 days of beginning operations. Renewal required every 2 years.
- **Scope:** Applies regardless of whether the MSB is licensed at the state level; registration and licensing are independent obligations.
- **Consequence:** Failure to register is a violation of 31 U.S.C. 5330, carrying civil penalties up to $5,000 per day and criminal penalties.

### Payment Facilitation (PayFac) Model

- **What:** Payment facilitators are registered with card networks (Visa, Mastercard) through a sponsoring acquiring bank and onboard sub-merchants under the PayFac's own merchant ID.
- **Threshold:** Visa requires PayFac registration for entities processing on behalf of sub-merchants. Mastercard imposes similar requirements with specific transaction volume thresholds.
- **Obligations:** PayFacs bear responsibility for sub-merchant underwriting and due diligence, KYC/AML compliance, transaction monitoring, chargeback management, and ongoing risk assessment.
- **Consequence:** Non-compliance with card network rules may result in fines ($25,000–$500,000+ per incident), loss of PayFac registration, and processing privilege revocation.

### Agent and Processor Exemptions

- **Agent exemption:** Operating as an agent of a licensed entity (bank or licensed transmitter) may avoid the need for a separate money transmission license. Requirements vary by state but generally require: (1) written agency agreement, (2) principal's supervision and control, (3) agent does not independently hold customer funds, (4) customer knows the principal.
- **Payment processor exemption:** FinCEN exempts entities that facilitate fund transfers through a bank on behalf of the sender or receiver. State recognition varies significantly — some states (e.g., Texas, Illinois) do not recognize a broad payment processor exemption.
- **Consequence:** Improperly relying on an exemption that does not apply subjects the entity to unlicensed activity penalties.

### Marketplace and Platform Payment Flows

- **What:** Two-sided marketplaces facilitating payments between buyers and sellers must analyze money transmission risk.
- **Key factors:** Whether the platform holds funds in a segregated account, controls timing of disbursement, exercises discretion over fund movement, and has the ability to redirect funds.
- **Settlement timing:** Holding funds for extended periods (beyond commercially reasonable settlement) increases money transmission risk. Immediate pass-through with no discretion reduces risk.
- **Consequence:** A marketplace deemed to be engaged in money transmission must obtain licenses in all required states or restructure its payment flow.

### Stored Value and Prepaid Products

- **What:** Issuing stored value (prepaid cards, digital wallets with stored balances, gift cards) may constitute money transmission depending on product structure.
- **Threshold:** Regulation E (12 C.F.R. 1005.20) applies to prepaid accounts including payroll cards, government benefit cards, and general-purpose reloadable cards. Initial disclosures and periodic statements required.
- **Closed-loop vs. open-loop:** Closed-loop gift cards (redeemable only at issuer) generally exempt from money transmission. Open-loop cards (network-branded, widely redeemable) more likely to trigger licensing.
- **Consequence:** Non-compliance with Regulation E subjects the issuer to CFPB enforcement and consumer liability protections.

### NACHA Rules and ACH Transactions

- **What:** National Automated Clearing House Association (NACHA) Operating Rules govern ACH transactions. Binding on all ACH participants through their ODFIs (Originating Depository Financial Institutions).
- **Threshold:** Rules apply to all ACH transactions regardless of amount. Same-day ACH available for transactions up to $1,000,000 per payment.
- **Key obligations:** WEB entry authorization requirements (consumer internet-initiated), account validation for WEB debits, return rate monitoring (overall return rate threshold: 15%; unauthorized return rate threshold: 0.5%), and fraud detection.
- **Consequence:** NACHA rules violations may result in fines ($100,000+), suspension of ACH origination privileges, and increased monitoring requirements.

## Interaction with Other Areas

- **Financial Services (KYC/AML):** Money transmitters and payment processors are MSBs subject to FinCEN registration and BSA/AML program requirements. See `kyc-aml.md`.
- **Financial Services (Banking Regulation):** Bank partnership and BaaS arrangements may provide alternatives to direct money transmission licensing. See `banking-regulation.md`.
- **Financial Services (PCI DSS):** Any entity storing, processing, or transmitting payment card data must comply with PCI DSS. See `pci-dss.md`.
- **Consumer Protection:** Payment services to consumers must comply with EFTA/Regulation E and state consumer protection laws.
- **Data Privacy:** Payment processing involves personal and financial data subject to GLBA, PCI DSS, and general data privacy laws.
- **International Trade:** Cross-border payment services must comply with OFAC sanctions screening and foreign jurisdiction licensing requirements.

## Sources

- FinCEN MSB Registration: https://www.fincen.gov/msb-registrant-search
- NMLS: https://www.nmls.org
- 31 C.F.R. Part 1010 (BSA implementing regulations): https://www.law.cornell.edu/cfr/text/31/part-1010
- 18 U.S.C. 1960 (unlicensed money transmission): https://www.law.cornell.edu/uscode/text/18/1960
- Regulation E (12 C.F.R. Part 1005): https://www.law.cornell.edu/cfr/text/12/part-1005
- NACHA Operating Rules: https://www.nacha.org/rules
- CFPB Prepaid Accounts Rule: https://www.consumerfinance.gov/rules-policy/final-rules/prepaid-accounts-under-electronic-fund-transfer-act-regulation-e-and-truth-lending-act-regulation-z/

---
## Pci Dss

# PCI DSS (Payment Card Industry Data Security Standard)

## Applicability

Load when the matter involves payment card processing, cardholder data storage or transmission, merchant compliance, payment application security, PCI assessments, card network rules, or data breach liability in payment card contexts.

## Key Requirements

### PCI DSS 4.0 Overview

- **What:** PCI DSS is a set of security standards established by the PCI Security Standards Council (PCI SSC), founded by Visa, Mastercard, American Express, Discover, and JCB. PCI DSS 4.0 became mandatory on March 31, 2025, replacing PCI DSS 3.2.1.
- **Scope:** Applies to all entities that store, process, or transmit cardholder data (CHD) or sensitive authentication data (SAD), and all entities that could affect the security of the cardholder data environment (CDE).
- **Cardholder data:** Primary Account Number (PAN), cardholder name, expiration date, and service code. Sensitive authentication data (full track data, CVV/CVC, PINs) must never be stored after authorization.
- **Consequence:** PCI DSS compliance is mandated by card network operating regulations. Non-compliance can result in fines, increased transaction fees, and loss of card acceptance privileges.

### Four Compliance Levels

- **What:** Compliance validation requirements are tiered based on annual transaction volume:
  - **Level 1:** Over 6 million transactions annually (any card brand) OR any merchant that has experienced a data breach OR any merchant designated Level 1 by a card brand. Requires annual on-site assessment by a Qualified Security Assessor (QSA) and quarterly network scans by an Approved Scanning Vendor (ASV).
  - **Level 2:** 1 million to 6 million transactions annually. Requires annual Self-Assessment Questionnaire (SAQ) completed by an Internal Security Assessor (ISA) or QSA, and quarterly ASV scans.
  - **Level 3:** 20,000 to 1 million e-commerce transactions annually. Requires annual SAQ and quarterly ASV scans.
  - **Level 4:** Fewer than 20,000 e-commerce transactions or up to 1 million total transactions annually. Requires annual SAQ and quarterly ASV scans (requirements may vary by acquirer).
- **Service providers:** Have separate levels — Level 1 (over 300,000 transactions) requires QSA assessment; Level 2 (under 300,000) requires SAQ.

### Self-Assessment Questionnaire (SAQ) Types

- **What:** SAQ types correspond to the entity's payment processing method and determine the scope of self-assessment:
  - **SAQ A:** Card-not-present merchants that fully outsource cardholder data processing (e.g., redirect to payment processor). Shortest questionnaire (~30 questions).
  - **SAQ A-EP:** E-commerce merchants that partially outsource but whose website affects transaction security.
  - **SAQ B:** Merchants using imprint machines or standalone dial-out terminals only.
  - **SAQ B-IP:** Merchants using standalone PTS-approved payment terminals with IP connection.
  - **SAQ C:** Merchants with payment application systems connected to the internet.
  - **SAQ C-VT:** Merchants using web-based virtual terminals.
  - **SAQ D:** All other merchants and all service providers. Most comprehensive (~300+ questions).
- **Consequence:** Completing the wrong SAQ type can result in a false sense of compliance and increased liability in the event of a breach.

### 12 Requirements / 6 Goals

- **What:** PCI DSS is organized into 6 goals and 12 requirements:
  1. **Build and Maintain a Secure Network and Systems:** (1) Install and maintain network security controls; (2) Apply secure configurations to all system components
  2. **Protect Account Data:** (3) Protect stored account data; (4) Protect cardholder data with strong cryptography during transmission over open public networks
  3. **Maintain a Vulnerability Management Program:** (5) Protect all systems and networks from malicious software; (6) Develop and maintain secure systems and software
  4. **Implement Strong Access Control Measures:** (7) Restrict access to system components and cardholder data by business need to know; (8) Identify users and authenticate access to system components; (9) Restrict physical access to cardholder data
  5. **Regularly Monitor and Test Networks:** (10) Log and monitor all access to system components and cardholder data; (11) Test security of systems and networks regularly
  6. **Maintain an Information Security Policy:** (12) Support information security with organizational policies and programs
- **PCI DSS 4.0 key changes:** Customized approach (alternative to defined approach), expanded multi-factor authentication requirements, targeted risk analyses replacing some prescriptive requirements, and enhanced requirements for e-commerce (anti-skimming protections).

### Penalties and Enforcement

- **What:** PCI DSS is enforced through card network operating regulations, not directly by law (though some states have incorporated PCI DSS into statute).
- **Non-compliance fines:** Card networks may impose fines of $5,000 to $100,000 per month on acquiring banks for merchants that fail to achieve compliance. Acquirers typically pass these fines through to merchants.
- **Data breach liability:** In the event of a compromise, non-compliant entities face:
  - **Forensic investigation costs:** $50,000–$500,000+ for PCI Forensic Investigator (PFI) engagement
  - **Card reissuance costs:** $3–$10+ per compromised card, passed to the merchant by card-issuing banks
  - **Fraud losses:** Liability for fraudulent transactions on compromised cards
  - **Fines:** Up to $500,000 per incident from card networks
  - **Increased processing rates:** Non-compliant merchants may face higher interchange rates
- **Liability shift:** For card-present transactions, liability for counterfeit fraud shifts to the party (merchant or issuer) that has not adopted EMV chip technology. For e-commerce, 3D Secure (3DS) authentication provides a liability shift to the issuer.

### Contractual Requirements

- **What:** PCI DSS compliance obligations flow through the payment processing chain via contracts.
- **Merchant agreements:** Acquiring banks require merchants to maintain PCI DSS compliance, cooperate with forensic investigations, and indemnify the acquirer for breach-related losses.
- **Service provider agreements:** Entities using third-party service providers that access cardholder data must: (1) maintain a list of all service providers, (2) ensure written agreements establishing PCI DSS compliance responsibilities, (3) monitor service provider compliance status at least annually.
- **Attestation of Compliance (AOC):** The formal document certifying PCI DSS compliance. Merchants and service providers should request and review AOCs from their counterparties.
- **Consequence:** Contractual non-compliance may result in termination of processing agreements, acceleration of indemnification obligations, and loss of card acceptance.

### Scope Reduction Strategies

- **What:** Reducing PCI DSS scope decreases compliance burden and risk exposure.
- **Tokenization:** Replacing cardholder data with tokens that cannot be reversed without the tokenization system. Properly implemented tokenization can remove systems from PCI DSS scope.
- **Point-to-point encryption (P2PE):** PCI-validated P2PE solutions encrypt cardholder data at the point of interaction and decrypt only in the secure decryption environment. Reduces merchant PCI DSS scope significantly.
- **Network segmentation:** Isolating the cardholder data environment from other networks. Not required by PCI DSS but strongly recommended to reduce the scope and cost of compliance.
- **Consequence:** Improper scope reduction (claiming systems are out of scope when they are not) creates compliance gaps and increased breach liability.

## Interaction with Other Areas

- **Financial Services (Payments):** PCI DSS applies to all entities in the payment card processing chain. See `payments-money-transmission.md`.
- **Financial Services (Banking Regulation):** Banks and card issuers have PCI DSS obligations as part of their regulatory compliance. See `banking-regulation.md`.
- **Data Privacy:** Cardholder data is personal data under GDPR, CCPA, and state privacy laws. PCI DSS breach may trigger privacy breach notification obligations.
- **Consumer Protection:** FTC has brought actions for inadequate data security practices involving payment card data.
- **IP and Technology:** Technology agreements for payment processing systems must address PCI DSS compliance, security testing, and vulnerability management.

## Sources

- PCI Security Standards Council: https://www.pcisecuritystandards.org
- PCI DSS 4.0: https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0.pdf
- PCI SSC Document Library: https://www.pcisecuritystandards.org/document_library
- Visa Merchant Compliance: https://usa.visa.com/support/small-business/security-compliance.html
- Mastercard Site Data Protection: https://www.mastercard.us/en-us/business/overview/safety-and-security/security-recommendations/site-data-protection-PCI.html
