---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, network-rules, industry-standard]
---
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
