---
counsel-os-type: law-area
content-version: "2026-02-10"
jurisdiction: [us-federal, us-state]
---
# Financial Services

## Trigger Conditions

Load this area when a matter involves: payment processing, card payments, payment credentials, stored value, wallets, prepaid accounts, money movement, holding or transmitting user funds, ACH, refunds and chargebacks, payment vendors or processors.

## Key Constraints

- **PCI DSS flow-down (card network rules; PCI DSS Req. 12.8):** any vendor that stores, processes, or transmits cardholder data on our behalf must be a validated PCI DSS service provider, and the agreement must include a written acknowledgment that the vendor is responsible for the security of the cardholder data it possesses. Card network rules make us responsible for our service providers' compliance — the agreement needs PCI DSS compliance representations, annual AOC delivery, and breach/forensics cooperation.
- **EFTA / Regulation E — prepaid accounts (12 CFR 1005.18):** a parent-funded allowance wallet is a "prepaid account" under the CFPB's Prepaid Accounts Rule. Regulation E error-resolution, disclosure, and periodic-statement obligations attach to the program; the vendor agreement must allocate operational support for error investigation and resolution within Reg E timelines (10 business days provisional credit; 45/90-day investigation limits).
- **State money transmitter licensing:** a vendor that receives and holds consumer funds for later disbursement is engaged in money transmission in most states and must hold state money transmitter licenses (or operate under an agent-of-the-payee or bank-sponsorship exemption). Confirm the vendor's licensure or exemption basis and require it as an ongoing representation; unlicensed transmission exposes the program to state enforcement and federal exposure under 18 U.S.C. § 1960.

## Consequence

Card network fines and forced de-conversion for PCI failures; CFPB enforcement and private EFTA liability for Reg E violations; state cease-and-desist orders and criminal exposure for unlicensed money transmission.
