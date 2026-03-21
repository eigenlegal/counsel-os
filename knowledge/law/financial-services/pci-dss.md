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
