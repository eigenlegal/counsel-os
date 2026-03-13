# Payments and Money Transmission

## Overview
Payment processing and money transmission are heavily regulated activities at both the federal and state level. Any business that receives, transmits, or holds funds on behalf of third parties must analyze whether its activities constitute money transmission requiring licensure. Payment facilitators, marketplaces, and fintech companies face particular scrutiny in this area.

## Key Requirements
- **Money transmission definition:** Generally, receiving money or monetary value for the purpose of transmitting it to another location or person by any means. Definitions vary by state. FinCEN defines a money transmitter as a person who provides money transmission services or any person engaged in the transfer of funds (31 C.F.R. 1010.100(ff)(5)).
- **State licensing requirements:** Money transmission requires a license in virtually every US state (47 states plus DC, Puerto Rico, and USVI). Each state has its own application process, bonding requirements ($25K-$7M+), net worth requirements, examination schedules, and renewal procedures. NMLS (Nationwide Multistate Licensing System) streamlines multi-state applications.
- **Federal registration:** Money services businesses (MSBs), including money transmitters, must register with FinCEN (Form 107) and renew every two years. BSA/AML program requirements apply.
- **Payment facilitation (PayFac) model:** Payment facilitators (sub-merchant facilitators) are registered with card networks through a sponsoring bank and onboard sub-merchants under their own merchant ID. PayFacs bear responsibility for sub-merchant underwriting, compliance, and risk management. Card network rules (Visa, Mastercard) impose specific obligations.
- **Agent/exempt models:** Some businesses avoid money transmission licensing by operating as agents of licensed entities (banks, licensed transmitters). The agent exemption varies by state and requires a written agency agreement, the principal's supervision, and the agent not holding customer funds independently.
- **Payment processor exemption:** FinCEN exempts payment processors that facilitate fund transfers through a bank on behalf of the sender or receiver. State exemptions for payment processing vary significantly; some states do not recognize a payment processor exemption.
- **Marketplace and platform models:** Two-sided marketplaces that facilitate payments between buyers and sellers must analyze whether they are engaged in money transmission. Key factors include whether the platform holds funds, controls timing of disbursement, and exercises discretion over fund movement.
- **Stored value and prepaid products:** Issuing stored value (prepaid cards, digital wallets with stored balances, gift cards) may constitute money transmission depending on the product structure and applicable state law. Regulation E applies to prepaid accounts.
- **PCI DSS compliance:** Any entity that stores, processes, or transmits payment card data must comply with PCI DSS. Compliance levels (1-4) depend on transaction volume. Requirements include encryption, access controls, network security, vulnerability management, and regular testing.

## Common Contract Issues
- Payment processing agreements that do not clearly allocate responsibility for chargebacks, refunds, and fraudulent transactions.
- Agent agreements that fail to establish the supervision and control elements required for the agent exemption from money transmission licensing.
- Marketplace terms of service that do not adequately describe the funds flow, creating ambiguity about whether the platform engages in money transmission.
- Payment facilitator agreements that do not address sub-merchant underwriting standards, monitoring obligations, or liability for sub-merchant violations.
- Missing or inadequate provisions for regulatory examination cooperation, audit rights, and compliance reporting.
- Fund hold and reserve provisions that are ambiguous about when and how merchant funds are released.
- Indemnification provisions that attempt to shift regulatory compliance responsibility in ways that are not recognized by regulators.
- Contracts that do not address PCI DSS compliance obligations, breach notification, and liability for payment card data compromises.

## Interaction with Other Areas
- **Financial Services (KYC/AML):** Money transmitters and payment processors must maintain BSA/AML compliance programs, including customer identification, transaction monitoring, and suspicious activity reporting.
- **Financial Services (Compliance/Licensing):** Money transmission licensing is a prerequisite for lawful operation; bank partnership and BaaS arrangements may provide alternatives to direct licensing.
- **Consumer Protection:** Payment services to consumers must comply with EFTA/Regulation E (electronic fund transfers), TILA/Regulation Z (if credit features are included), and state consumer protection laws.
- **Data Privacy:** Payment processing involves personal and financial data subject to GLBA, PCI DSS, and general data privacy laws.
- **International Trade:** Cross-border payment services must comply with OFAC sanctions screening, FinCEN regulations on international transfers, and foreign jurisdiction licensing requirements.
- **IP and Technology:** Payment technology platforms, APIs, and integrations require technology agreements addressing security, uptime, and liability for processing errors.
