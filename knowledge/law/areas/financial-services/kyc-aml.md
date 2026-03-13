# KYC/AML (Know Your Customer / Anti-Money Laundering)

## Overview
The Bank Secrecy Act (BSA) and its implementing regulations require financial institutions and money services businesses to establish anti-money laundering (AML) programs that include customer identification, customer due diligence, transaction monitoring, suspicious activity reporting, and sanctions compliance. These requirements are enforced by FinCEN, federal banking regulators, and state regulators.

## Key Requirements
- **BSA/AML program (31 C.F.R. 1020.210, 1022.210):** Every covered financial institution must establish a written AML program that includes: (1) internal policies, procedures, and controls, (2) designation of a BSA/AML compliance officer, (3) ongoing employee training, and (4) independent testing (audit) of the program.
- **Customer Identification Program (CIP, 31 C.F.R. 1020.220):** Banks must collect identifying information from customers (name, date of birth, address, identification number) before opening an account and verify identity through documentary or non-documentary methods within a reasonable time.
- **Customer Due Diligence (CDD) Rule (31 C.F.R. 1010.230):** Requires covered financial institutions to: (1) identify and verify the identity of beneficial owners of legal entity customers (25%+ ownership or a single individual with significant management responsibility), (2) understand the nature and purpose of customer relationships, and (3) conduct ongoing monitoring to identify and report suspicious transactions and update customer information.
- **Enhanced Due Diligence (EDD):** Required for higher-risk customers including foreign correspondent accounts, private banking accounts for non-US persons, politically exposed persons (PEPs), and customers from high-risk jurisdictions. Requires deeper investigation into source of funds, source of wealth, and ongoing enhanced monitoring.
- **Suspicious Activity Reports (SARs, 31 C.F.R. 1020.320):** Financial institutions must file SARs with FinCEN for transactions of $5,000 or more that the institution knows, suspects, or has reason to suspect involve funds from illegal activity, are designed to evade BSA requirements, or have no business or lawful purpose. SAR filing is confidential — disclosure of SAR existence to the subject is prohibited.
- **Currency Transaction Reports (CTRs, 31 C.F.R. 1010.311):** Financial institutions must file CTRs for cash transactions exceeding $10,000 in a single day. Structuring (breaking up transactions to avoid CTR filing) is a federal crime.
- **OFAC sanctions screening:** All US persons and entities must comply with OFAC sanctions programs. Financial institutions must screen customers, transactions, and counterparties against the SDN (Specially Designated Nationals) List and other OFAC lists. Blocked transactions must be reported to OFAC within 10 days.
- **Recordkeeping requirements:** BSA requires retention of records including CTRs (5 years), SARs (5 years), CIP records (5 years after account closure), and transaction records for funds transfers over $3,000 (5 years).
- **FinCEN beneficial ownership reporting (Corporate Transparency Act):** Beginning January 1, 2024, most US companies must report beneficial ownership information directly to FinCEN (separate from CDD requirements for financial institutions). Existing companies have specified deadlines; new companies must report within 90 days of formation.

## Common Contract Issues
- Third-party agreements (fintech partnerships, agent arrangements) that do not clearly allocate AML program responsibilities or provide for adequate oversight of the third party's AML procedures.
- Customer-facing terms of service that do not include adequate identity verification consent, information accuracy representations, or cooperation obligations.
- Vendor agreements for AML technology (transaction monitoring, sanctions screening, identity verification) that do not include accuracy warranties, service levels, regulatory compliance representations, and data handling provisions.
- Correspondent banking agreements that lack adequate provisions for due diligence on the respondent bank, information sharing, and compliance with FinCEN's correspondent banking rules.
- Missing or inadequate provisions for data sharing and information access needed to fulfill AML obligations across affiliated entities and third-party relationships.
- Confidentiality provisions that conflict with SAR filing obligations (SAR filing cannot be contractually restricted).
- Indemnification provisions that attempt to shift AML compliance responsibility to parties that cannot legally bear it.

## Interaction with Other Areas
- **Financial Services (Payments):** Payment processors and money transmitters are MSBs subject to FinCEN registration and BSA/AML program requirements.
- **Financial Services (Compliance/Licensing):** AML program requirements are a condition of licensing for money transmitters and other financial services providers.
- **Data Privacy:** KYC/AML data collection and retention must be reconciled with data minimization and retention limitation requirements under GDPR, CCPA, and other privacy laws.
- **International Trade:** OFAC sanctions compliance intersects with export controls and international trade restrictions. Sanctions screening must cover all OFAC programs (country-based, list-based, and sector-based).
- **Corporate:** Corporate Transparency Act beneficial ownership reporting obligations apply to most US entities and must be incorporated into entity formation and maintenance procedures.
- **Litigation:** SAR filings are confidential and protected by safe harbor (31 U.S.C. 5318(g)(3)); litigation involving AML matters must carefully navigate SAR confidentiality requirements.
