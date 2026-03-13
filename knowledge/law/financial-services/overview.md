# Financial Services

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** financial services, banking, lending, loan, credit, fintech, payments, payment processing, payment facilitator, payfac, money transmission, money transmitter, stored value, prepaid, e-money, electronic funds transfer, ACH, wire transfer, credit card, debit card, merchant services, acquiring, issuing, interchange, PCI DSS, PCI compliance, financial institution, bank, credit union, neobank, banking as a service, BaaS, bank charter, bank partnership, deposit, FDIC, trust, fiduciary, investment adviser, broker-dealer, fund, hedge fund, private equity fund, venture capital fund, asset management, wealth management, robo-adviser, cryptocurrency, digital assets, blockchain, token, stablecoin, DeFi, decentralized finance, virtual currency, BSA, AML, anti-money laundering, KYC, know your customer, CDD, customer due diligence, SAR, suspicious activity report, CTR, currency transaction report, OFAC, sanctions screening, MSB, money services business, consumer lending, marketplace lending, BNPL, buy now pay later, earned wage access
**Clause types:** payment processing terms, merchant agreements, bank partnership agreement provisions, money transmission license requirements, lending terms (interest rate, APR, fees, repayment), truth in lending disclosures, deposit account terms, electronic fund transfer authorization, BSA/AML program requirements, vendor due diligence provisions for financial institutions, regulatory examination provisions, capital and liquidity requirements, third-party risk management provisions
**Regulatory references:** Bank Secrecy Act (BSA), USA PATRIOT Act, FinCEN regulations, OFAC SDN List, state money transmitter laws, Uniform Money Services Act, TILA (Truth in Lending Act), Regulation Z, ECOA (Equal Credit Opportunity Act), Regulation B, EFTA (Electronic Fund Transfer Act), Regulation E, FDCPA (Fair Debt Collection Practices Act), FCRA (Fair Credit Reporting Act), Regulation V, Dodd-Frank Act, CFPB regulations, state usury laws, state lending licenses, OCC guidance, FDIC guidance, Federal Reserve guidance, PCI DSS, NACHA Operating Rules, card network rules (Visa, Mastercard), state insurance regulations for fintech products, NY DFS BitLicense, FinCEN cryptocurrency guidance
**Relationship patterns:** bank/fintech partner, payment processor/merchant, lender/borrower, fund manager/investor, broker-dealer/customer, money transmitter/customer, BaaS provider/fintech, acquiring bank/payment facilitator, issuer/cardholder

## Sub-Files

- `payments-money-transmission.md` — Payment processing and money transmission regulation. Load when: payment services, money transmission, stored value, mobile payments, or payment facilitation are involved.
- `compliance-licensing.md` — Financial services licensing and regulatory compliance frameworks. Load when: state or federal licensing requirements, bank partnerships, BaaS arrangements, or regulatory compliance programs are at issue.
- `kyc-aml.md` — Know Your Customer and Anti-Money Laundering requirements. Load when: customer onboarding, identity verification, transaction monitoring, suspicious activity reporting, or sanctions compliance is involved.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- Money transmission without a license (or valid exemption) is a federal crime (18 U.S.C. 1960) and a violation of state money transmitter laws in virtually all states.
- BSA/AML compliance programs (including customer identification, transaction monitoring, suspicious activity reporting, and OFAC screening) are mandatory for financial institutions and money services businesses and cannot be delegated away by contract.
- Truth in Lending Act disclosures (APR, finance charges, total of payments) must be provided to consumer borrowers and cannot be waived.
- State usury limits impose maximum permissible interest rates that cannot be contractually overridden (though federal preemption applies to certain national banks and federal savings associations).
- PCI DSS compliance is required by payment card network rules for all entities that store, process, or transmit cardholder data; non-compliance can result in fines, increased transaction fees, and loss of card acceptance privileges.
- CFPB enforcement authority extends to unfair, deceptive, or abusive acts or practices (UDAAP) in consumer financial services, providing a standard that is broader than traditional UDAP.
