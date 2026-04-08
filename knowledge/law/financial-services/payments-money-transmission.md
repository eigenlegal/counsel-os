---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
---

## Payments Money Transmission

# Payments and Money Transmission

## Applicability

Load when the matter involves payment processing, money transmission, stored value, mobile payments, payment facilitation, marketplace payment flows, ACH/wire transfers, card network compliance, or NACHA rules. This file provides foundational definitions and exemption analysis. For detailed requirements, load the specialized sub-files referenced below.

## Key Requirements

### Money Transmission Definition

- **What:** Receiving money or monetary value for the purpose of transmitting it to another location or person by any means. Definitions vary significantly by state.
- **Federal definition:** FinCEN defines a money transmitter as a person who provides money transmission services or any person engaged in the transfer of funds (31 C.F.R. 1010.100(ff)(5)).
- **State variation:** Some states use "money transmission," others "money services business." Key definitional differences include whether holding funds alone qualifies, whether payment processing is included, and the scope of exemptions. See `state-mtl-requirements.md` for state-by-state detail.
- **Consequence:** Unlicensed money transmission is a federal felony under 18 U.S.C. 1960 (up to 5 years imprisonment) and a violation of state law in virtually all states. State penalties include civil fines up to $25,000 per violation and criminal prosecution.

### State Licensing Landscape

- **Threshold:** License required in 49 states plus DC, Puerto Rico, and USVI. Montana does not require a money transmission license.
- **MTMA standardization:** 30+ states have adopted the CSBS Money Transmission Modernization Act (MTMA), establishing uniform standards for net worth, surety bonds, and permissible investments. See `state-mtl-requirements.md` for MTMA framework and per-state requirements.
- **NMLS:** Nationwide Multistate Licensing System centralizes multi-state applications. Not all states participate fully.
- **Consequence:** Operating without required licenses subjects the company to cease-and-desist orders, civil penalties, criminal prosecution, and potential disgorgement of revenues.

### Federal Regulatory Requirements

- **What:** Money transmitters are subject to multiple federal regulatory regimes: FinCEN/BSA (MSB registration, AML program, SAR/CTR filing), CFPB (Regulation E, Remittance Transfer Rule, Prepaid Account Rule, UDAAP), OFAC (sanctions screening), and federal criminal law (18 U.S.C. 1960).
- **Deep dive:** See `federal-payments-regulation.md` for comprehensive federal requirements.

### Agent and Processor Exemptions

- **Agent exemption:** Operating as an agent of a licensed entity (bank or licensed transmitter) may avoid the need for a separate money transmission license. Requirements vary by state but generally require: (1) written agency agreement, (2) principal's supervision and control, (3) agent does not independently hold customer funds, (4) customer knows the principal.
- **Payment processor exemption:** FinCEN exempts entities that facilitate fund transfers through a bank on behalf of the sender or receiver. State recognition varies significantly — some states (e.g., Texas, Illinois) do not recognize a broad payment processor exemption.
- **Consequence:** Improperly relying on an exemption that does not apply subjects the entity to unlicensed activity penalties. Always verify exemption applicability on a state-by-state basis using `state-mtl-requirements.md`.

### Payment Facilitation (PayFac) Model

- **What:** Payment facilitators are registered with card networks (Visa, Mastercard) through a sponsoring acquiring bank and onboard sub-merchants under the PayFac's own merchant ID.
- **Threshold:** Visa requires PayFac registration for entities processing on behalf of sub-merchants. Mastercard imposes similar requirements with specific transaction volume thresholds.
- **Obligations:** PayFacs bear responsibility for sub-merchant underwriting and due diligence, KYC/AML compliance, transaction monitoring, chargeback management, and ongoing risk assessment.
- **Deep dive:** See `card-network-ach-rules.md` for detailed card network operating rules, PayFac compliance, and chargeback programs.
- **Consequence:** Non-compliance with card network rules may result in fines ($25,000–$500,000+ per incident), loss of PayFac registration, and processing privilege revocation.

### Marketplace and Platform Payment Flows

- **What:** Two-sided marketplaces facilitating payments between buyers and sellers must analyze money transmission risk.
- **Key factors:** Whether the platform holds funds in a segregated account, controls timing of disbursement, exercises discretion over fund movement, and has the ability to redirect funds.
- **Settlement timing:** Holding funds for extended periods (beyond commercially reasonable settlement) increases money transmission risk. Immediate pass-through with no discretion reduces risk.
- **Consequence:** A marketplace deemed to be engaged in money transmission must obtain licenses in all required states or restructure its payment flow.

### Stored Value and Prepaid Products

- **What:** Issuing stored value (prepaid cards, digital wallets with stored balances, gift cards) may constitute money transmission depending on product structure.
- **Closed-loop vs. open-loop:** Closed-loop gift cards (redeemable only at issuer) generally exempt from money transmission. Open-loop cards (network-branded, widely redeemable) more likely to trigger licensing.
- **Deep dive:** See `federal-payments-regulation.md` for Regulation E prepaid account requirements and CFPB oversight.

### ACH and Card Network Rules

- **What:** NACHA Operating Rules govern ACH transactions. Card networks (Visa, Mastercard) impose operating rules on all participants.
- **Deep dive:** See `card-network-ach-rules.md` for comprehensive NACHA rules (WEB/TEL entries, return rate monitoring, same-day ACH, third-party sender obligations) and card network requirements (PayFac programs, chargeback thresholds, fines).

## Interaction with Other Areas

- **Financial Services (State MTL Requirements):** State-by-state licensing detail — statutes, regulators, bonds, net worth, exemptions. See `state-mtl-requirements.md`.
- **Financial Services (Federal Payments Regulation):** Comprehensive federal requirements — FinCEN/BSA, CFPB, OFAC, 18 U.S.C. 1960, third-party risk management. See `federal-payments-regulation.md`.
- **Financial Services (Card Networks/ACH):** Card network operating rules and NACHA requirements. See `card-network-ach-rules.md`.
- **Financial Services (KYC/AML):** BSA/AML program requirements for money transmitters as MSBs. See `kyc-aml.md`.
- **Financial Services (Banking Regulation):** Bank partnership and BaaS arrangements may provide alternatives to direct money transmission licensing. See `banking-regulation.md`.
- **Financial Services (PCI DSS):** Any entity storing, processing, or transmitting payment card data must comply with PCI DSS. See `pci-dss.md`.
- **Consumer Protection:** Payment services to consumers must comply with EFTA/Regulation E and state consumer protection laws.
- **Data Privacy:** Payment processing involves personal and financial data subject to GLBA, PCI DSS, and general data privacy laws.
- **International Trade:** Cross-border payment services must comply with OFAC sanctions screening and foreign jurisdiction licensing requirements.

## Sources

- [FinCEN MSB Registration](https://www.fincen.gov/msb-registrant-search)
- [NMLS](https://www.nmls.org)
- [CSBS MTMA](https://www.csbs.org/csbs-money-transmission-modernization-act-mtma)
- [31 C.F.R. Part 1010 — BSA Implementing Regulations](https://www.law.cornell.edu/cfr/text/31/part-1010)
- [18 U.S.C. 1960 — Unlicensed Money Transmission](https://www.law.cornell.edu/uscode/text/18/1960)
- [Regulation E (12 C.F.R. Part 1005)](https://www.law.cornell.edu/cfr/text/12/part-1005)
- [NACHA Operating Rules](https://www.nacha.org/rules)

---
