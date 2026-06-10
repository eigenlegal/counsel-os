---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, network-rules, industry-standard]
last-reviewed: "2026-06-10"
authorities:
  - cite: "Pub. L. 119-27"
    title: "GENIUS Act (Guiding and Establishing National Innovation for U.S. Stablecoins Act of 2025)"
    url: "https://www.congress.gov/119/plaws/publ27/PLAW-119publ27.pdf"
  - cite: "FinCEN FIN-2019-G001"
    title: "Application of FinCEN's Regulations to Certain Business Models Involving Convertible Virtual Currencies"
    url: "https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models"
  - cite: "SEC Press Release 2025-47"
    title: "SEC Announces Dismissal of Civil Enforcement Action Against Coinbase"
    url: "https://www.sec.gov/newsroom/press-releases/2025-47"
  - cite: "SEC Division of Corporation Finance (May 29, 2025)"
    title: "Statement on Certain Protocol Staking Activities"
    url: "https://www.sec.gov/newsroom/speeches-statements/statement-certain-protocol-staking-activities-052925"
  - cite: "H.R. 3633, 119th Congress"
    title: "Digital Asset Market Clarity Act of 2025 (CLARITY Act) — pending, not enacted"
    url: "https://www.congress.gov/bill/119th-congress/house-bill/3633"
  - cite: "Pub. L. 119-5"
    title: "CRA disapproval of IRS DeFi broker reporting rule (H.J.Res. 25)"
    url: "https://www.congress.gov/bill/119th-congress/house-joint-resolution/25"
  - cite: "OCC Interpretive Letter 1183"
    title: "Permissibility of crypto-asset custody and certain stablecoin activities for national banks (March 2025)"
    url: "https://www.occ.gov/topics/charters-and-licensing/interpretations-and-decisions/2025/int1183.pdf"
  - cite: "23 NYCRR Part 200"
    title: "New York BitLicense regulation"
    url: "https://www.dfs.ny.gov/virtual_currency_businesses"
  - cite: "Cal. Fin. Code Division 24"
    title: "California Digital Financial Assets Law (DFPI licensing page)"
    url: "https://dfpi.ca.gov/regulated-industries/digital-financial-assets/"
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
- **Other states:** Most states apply existing money transmission frameworks to crypto. Some states (Wyoming, Montana) have enacted crypto-specific exemptions or frameworks. California's Digital Financial Assets Law (Cal. Fin. Code Div. 24) creates a BitLicense-style regime — licensure (or a pending application) is required to engage in digital financial asset business activity with California residents on or after July 1, 2026.
- **Consequence:** Operating without required state licenses subjects the entity to enforcement actions, civil penalties, and criminal prosecution. BitLicense violations carry penalties up to $5,000 per day.

### SEC — Securities Regulation

- **What:** The SEC applies the Howey test to determine whether a digital asset is a "security" (investment contract). Under Howey, a security exists when there is (1) an investment of money, (2) in a common enterprise, (3) with a reasonable expectation of profits, (4) derived from the efforts of others.
- **Threshold:** No de minimis threshold. Any offer or sale of a security must be registered under the Securities Act of 1933 or qualify for an exemption (Regulation D, Regulation A+, Regulation S, Regulation Crowdfunding).
- **Exchange registration:** Platforms that facilitate trading in digital asset securities must register as national securities exchanges or operate under an exemption (e.g., ATS).
- **Enforcement posture (as of mid-2026):** The registration-by-enforcement posture of 2021–2024 shifted materially in 2025. Beginning February 2025 the SEC dismissed its major exchange enforcement actions (including SEC v. Coinbase, dismissed February 27, 2025) and formed a Crypto Task Force to develop a regulatory framework. Howey remains the governing legal test, but current Commission policy favors rulemaking and guidance over registration-based enforcement against trading platforms. Verify the current posture before relying on either era's enforcement assumptions.
- **Staking and DeFi:** SEC staff statements (Division of Corporation Finance, May 29, 2025 on protocol staking; August 5, 2025 on liquid staking) take the view that covered protocol-staking activities on public, permissionless proof-of-stake networks are not securities transactions. These are staff views, not Commission rules; analysis remains fact-specific for staking-as-a-service arrangements and DeFi structures outside their scope.
- **Market-structure legislation:** The CLARITY Act (H.R. 3633), which would allocate digital-asset jurisdiction between the SEC and CFTC, passed the House in July 2025 but remains pending in the Senate as of June 2026. It is NOT law — do not rely on its framework until enacted.
- **Consequence:** Offering or selling unregistered securities carries civil penalties (disgorgement + interest + penalties), injunctions, and potential criminal referral.

### CFTC — Digital Commodities

- **What:** The CFTC has asserted jurisdiction over digital assets that qualify as "commodities" under the Commodity Exchange Act (CEA), particularly Bitcoin and Ether.
- **Threshold:** The CFTC has anti-fraud and anti-manipulation enforcement authority over commodity spot markets. Derivatives (futures, options, swaps) on digital assets require registration of trading platforms (DCMs, SEFs) and intermediaries (FCMs, CPOs, CTAs).
- **Retail commodity transactions:** Leveraged or margined digital asset transactions with retail customers may constitute retail commodity transactions subject to CFTC regulation unless actual delivery occurs within 28 days.
- **Consequence:** CFTC enforcement actions for fraud and manipulation in digital commodity markets have resulted in penalties exceeding $100M in individual cases.

### IRS — Tax Treatment

- **What:** The IRS treats virtual currency as property for federal tax purposes (Notice 2014-21). Transactions involving virtual currency are subject to the same general tax principles as property transactions.
- **Threshold:** All virtual currency transactions are taxable events, including selling for fiat, exchanging one crypto for another, using crypto to pay for goods/services, and receiving crypto as compensation.
- **Reporting:** Broker reporting requirements (26 U.S.C. 6045) apply to digital asset transactions. Custodial brokers (e.g., exchanges) must report digital asset sales on Form 1099-DA for transactions occurring on or after January 1, 2025. The separate December 2024 rule that would have extended broker reporting to certain DeFi participants (T.D. 10021) was nullified under the Congressional Review Act (Pub. L. 119-5, April 10, 2025) and is treated as if it never took effect — DeFi protocols are not currently subject to 1099-DA reporting.
- **Consequence:** Failure to report cryptocurrency gains is tax evasion. IRS has obtained John Doe summonses from major exchanges. Penalties include accuracy-related penalties (20%), fraud penalties (75%), and criminal prosecution.

### Travel Rule

- **What:** FinCEN's Travel Rule (31 C.F.R. 1010.410(f)) requires financial institutions and MSBs to collect, retain, and transmit certain information for funds transfers.
- **Threshold:** Applies to funds transfers (including CVC transfers) of $3,000 or more. Required information includes originator name, account number, address, and beneficiary information.
- **Implementation challenges:** The decentralized and pseudonymous nature of blockchain transactions creates technical challenges for Travel Rule compliance. FATF Recommendation 16 imposes similar requirements internationally.
- **Consequence:** Failure to comply with the Travel Rule is a BSA violation subject to civil money penalties and criminal prosecution.

### Stablecoin Regulation — GENIUS Act

- **What:** The GENIUS Act (Pub. L. 119-27, signed July 18, 2025) is the first comprehensive federal regime for "payment stablecoins" — digital assets issued for payment or settlement and redeemable at a predetermined fixed amount. Once the regime is fully effective, only "permitted payment stablecoin issuers" may issue payment stablecoins in the United States.
- **Permitted issuers — three pathways:** (1) subsidiaries of insured depository institutions; (2) federal-qualified nonbank issuers approved and supervised by the OCC; (3) state-qualified issuers under state regimes certified as substantially similar to the federal framework (the state pathway is generally available only to issuers with up to $10B outstanding; larger issuers must transition to federal oversight — confirm the threshold mechanics against the Act).
- **Reserves, disclosure, and conduct:** 1:1 reserve backing in cash, insured deposits, short-term Treasuries, and similar high-quality liquid assets; monthly public disclosure of reserve composition with executive certification; redemption requirements; permitted issuers may not pay interest or yield to stablecoin holders; permitted issuers are treated as financial institutions under the BSA.
- **Not securities or commodities:** Payment stablecoins issued by permitted issuers are excluded from the definitions of "security" and "commodity," removing SEC/CFTC jurisdiction over compliant issuance.
- **Effective date / transition (as of June 2026):** The issuance restriction takes effect on the earlier of January 18, 2027 (18 months after enactment) or 120 days after the primary federal regulators issue final implementing rules; most implementing regulations are due by July 18, 2026. Rulemaking is in progress (Treasury ANPRM, Sept. 2025; OCC NPRM, 2026) — verify current rulemaking status and any triggered effective date before advising. Digital asset service providers may continue offering stablecoins of non-permitted issuers until July 18, 2028 (three-year safe harbor).
- **Other authorities still relevant:** OCC Interpretive Letter 1183 (March 2025) confirms crypto-asset custody and certain stablecoin activities are permissible for national banks and rescinds the prior supervisory non-objection requirement (IL 1179). NYDFS stablecoin guidance (reserves/redemption) continues to apply to DFS-regulated issuers, and state money transmission frameworks continue to apply pending full GENIUS Act effectiveness.
- **Consequence:** After the effective date, issuing payment stablecoins without permitted-issuer status is unlawful and subject to federal enforcement; exchanges and custodians face the 2028 restriction on offering non-permitted-issuer stablecoins.

## Interaction with Other Areas

- **Financial Services (KYC/AML):** Crypto exchanges and CVC transmitters must maintain full BSA/AML programs. See `kyc-aml.md`.
- **Financial Services (Payments):** CVC transmission is a form of money transmission. See `payments-money-transmission.md`.
- **Financial Services (Fintech):** Crypto companies face the same bank partnership and licensing challenges as other fintechs. See `fintech.md`.
- **Securities:** Token offerings may constitute securities offerings. SEC registration or exemption analysis required.
- **International Trade:** OFAC sanctions apply to cryptocurrency transactions. Sanctions screening must cover blockchain addresses on the SDN list.
- **Data Privacy:** Blockchain immutability creates tension with GDPR right to erasure and data minimization principles.

## Sources

- GENIUS Act (Pub. L. 119-27): https://www.congress.gov/119/plaws/publ27/PLAW-119publ27.pdf
- OCC Interpretive Letter 1183 (crypto custody and stablecoin activities): https://www.occ.gov/topics/charters-and-licensing/interpretations-and-decisions/2025/int1183.pdf
- FinCEN Virtual Currency Guidance (FIN-2019-G001): https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models
- SEC Framework for Digital Assets: https://www.sec.gov/corpfin/framework-investment-contract-analysis-digital-assets
- CFTC Digital Assets: https://www.cftc.gov/digitalassets
- IRS Notice 2014-21: https://www.irs.gov/irb/2014-16_IRB#NOT-2014-21
- NY BitLicense (23 NYCRR Part 200): https://www.law.cornell.edu/regulations/new-york/23-NYCRR-Pt-200
- FATF Virtual Assets Guidance: https://www.fatf-gafi.org/en/topics/virtual-assets.html

---
