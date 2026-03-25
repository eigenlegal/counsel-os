---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
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
