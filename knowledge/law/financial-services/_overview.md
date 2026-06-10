---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, network-rules, industry-standard]
last-reviewed: "2026-06-10"
---
# Financial Services

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** financial services, banking, lending, loan, credit, fintech, payments, payment processing, payment facilitator, payfac, money transmission, money transmitter, stored value, prepaid, e-money, electronic funds transfer, ACH, wire transfer, credit card, debit card, merchant services, acquiring, issuing, interchange, PCI DSS, PCI compliance, financial institution, bank, credit union, neobank, banking as a service, BaaS, bank charter, bank partnership, deposit, FDIC, trust, fiduciary, investment adviser, broker-dealer, fund, hedge fund, private equity fund, venture capital fund, asset management, wealth management, robo-adviser, cryptocurrency, digital assets, blockchain, token, stablecoin, DeFi, decentralized finance, virtual currency, BSA, AML, anti-money laundering, KYC, know your customer, CDD, customer due diligence, SAR, suspicious activity report, CTR, currency transaction report, OFAC, sanctions screening, MSB, money services business, consumer lending, marketplace lending, BNPL, buy now pay later, earned wage access, BitLicense, Howey test, usury, APR, truth in lending, TILA, ECOA, fair lending, CFPB, de novo charter, capital requirements, Basel III, CRA, embedded finance, open banking, regulatory sandbox
**Clause types:** payment processing terms, merchant agreements, bank partnership agreement provisions, money transmission license requirements, lending terms (interest rate, APR, fees, repayment), truth in lending disclosures, deposit account terms, electronic fund transfer authorization, BSA/AML program requirements, vendor due diligence provisions for financial institutions, regulatory examination provisions, capital and liquidity requirements, third-party risk management provisions, PCI DSS compliance provisions, cryptocurrency custody terms, stablecoin reserve requirements, digital asset trading terms
**Regulatory references:** Bank Secrecy Act (BSA), USA PATRIOT Act, FinCEN regulations, OFAC SDN List, state money transmitter laws, Uniform Money Services Act, TILA (Truth in Lending Act), Regulation Z, ECOA (Equal Credit Opportunity Act), Regulation B, EFTA (Electronic Fund Transfer Act), Regulation E, FDCPA (Fair Debt Collection Practices Act), FCRA (Fair Credit Reporting Act), Regulation V, Dodd-Frank Act, CFPB regulations, state usury laws, state lending licenses, OCC guidance, FDIC guidance, Federal Reserve guidance, PCI DSS, NACHA Operating Rules, card network rules (Visa, Mastercard), state insurance regulations for fintech products, NY DFS BitLicense, FinCEN cryptocurrency guidance, Howey test, Commodity Exchange Act, GENIUS Act, permitted payment stablecoin issuer, Basel III, Community Reinvestment Act, Corporate Transparency Act
**Relationship patterns:** bank/fintech partner, payment processor/merchant, lender/borrower, fund manager/investor, broker-dealer/customer, money transmitter/customer, BaaS provider/fintech, acquiring bank/payment facilitator, issuer/cardholder, crypto exchange/user, stablecoin issuer/holder

## Sub-Files

- `payments-money-transmission.md` — Payment processing and money transmission regulation (entry point). Load when: payment services, money transmission, stored value, mobile payments, payment facilitation, marketplace payment flows, or money transmission exemption analysis are involved. Routes to specialized sub-files for deep-dive requirements.
- `state-mtl-requirements.md` — State-by-state money transmitter licensing requirements (all 50 states + DC + territories). Load when: state-specific licensing analysis, multi-state licensing strategy, bond/net worth calculations, new-state expansion, state examination preparation, or MTMA adoption status are involved.
- `federal-payments-regulation.md` — Comprehensive federal regulatory requirements for payments companies (FinCEN/BSA, CFPB/Reg E, OFAC, 18 U.S.C. 1960, third-party risk management, FTC). Load when: federal compliance analysis, MSB program design, CFPB supervisory matters, OFAC screening, remittance transfer requirements, or federal criminal exposure assessment are involved.
- `card-network-ach-rules.md` — Card network operating rules (Visa, Mastercard) and ACH/NACHA requirements. Load when: PayFac compliance, merchant acquiring, card network fines, NACHA operating rules, ACH origination, return rates, same-day ACH, third-party sender obligations, or real-time payments (RTP/FedNow) are involved.
- `kyc-aml.md` — Know Your Customer and Anti-Money Laundering requirements. Load when: customer onboarding, identity verification, transaction monitoring, suspicious activity reporting, sanctions compliance, beneficial ownership, or BSA program requirements are involved.
- `banking-regulation.md` — Bank charters, supervision, and BaaS oversight. Load when: bank partnerships, BaaS arrangements, de novo bank formation, capital requirements, FDIC insurance, regulatory examinations, third-party risk management, or CRA obligations are involved.
- `lending.md` — Consumer and commercial lending regulation. Load when: loan origination, credit disclosures (TILA/Reg Z), fair lending (ECOA/Reg B), interest rates, usury, state lending licenses, CFPB authority, BNPL, earned wage access, or mortgage lending are involved.
- `fintech.md` — Fintech regulatory frameworks and bank-fintech partnerships. Load when: fintech regulatory strategy, special purpose charters, regulatory sandboxes, embedded finance, multi-state licensing, true lender issues, or open banking/data access are involved.
- `cryptocurrency.md` — Cryptocurrency and digital asset regulation. Load when: cryptocurrency, digital assets, blockchain tokens, stablecoins, the GENIUS Act / permitted payment stablecoin issuers, DeFi, virtual currency exchanges, BitLicense, Howey test analysis, crypto custody, or Travel Rule compliance are involved.
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
- Under the GENIUS Act (Pub. L. 119-27, enacted July 18, 2025; issuance restriction phases in by January 2027 with a service-provider transition to July 2028), issuing payment stablecoins in the US requires permitted-payment-stablecoin-issuer status (insured depository institution subsidiary, OCC-supervised federal qualified issuer, or certified state-qualified issuer), 1:1 high-quality liquid reserves, and monthly reserve disclosures. See `cryptocurrency.md` for effective-date mechanics.
- OFAC sanctions screening is a strict liability obligation — no minimum transaction threshold and no intent requirement for civil penalties.
- Banks must maintain minimum capital ratios under Basel III (4.5% CET1, 6% Tier 1, 8% Total Capital) with prompt corrective action for non-compliance.
