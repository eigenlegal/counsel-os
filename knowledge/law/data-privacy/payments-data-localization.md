---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, eu, international]
last-reviewed: "2026-06-10"
authorities:
  - cite: "RBI Circular DPSS.CO.OD No.2785/06.08.005/2017-2018"
    title: "Storage of Payment System Data (India localization mandate)"
    url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11244"
  - cite: "Personal Information Protection Law of the PRC"
    title: "China PIPL (English translation, NPC)"
    url: "http://www.npc.gov.cn/englishnpc/c23934/202112/1abd8829788946ecab270e469b13c39c.shtml"
  - cite: "Law No. 91/2025/QH15 (Vietnam)"
    title: "Vietnam Law on Personal Data Protection (effective January 1, 2026)"
    url: "https://english.luatvietnam.vn/dan-su/law-on-personal-data-protection-law-no-91-2025-qh15-405135-d1.html"
---
# Payments Data Localization

## Applicability

Load when the matter involves cross-border payment data flows, payment data storage requirements in specific jurisdictions, data localization mandates for payment processors or financial institutions, payment gateway architecture decisions, SWIFT messaging data handling, or any transaction involving jurisdictions with sector-specific financial data residency rules. This file covers payment-specific localization requirements that go beyond general data privacy transfer rules.

For general cross-border data transfer mechanisms (SCCs, BCRs, adequacy decisions), see `cross-border-transfers.md`. For GDPR transfer requirements, see `gdpr.md`. For general international privacy laws, see `international.md`.

## Key Requirements

### India — RBI Payment Data Localization

- **Authority:** Reserve Bank of India (RBI) Circular on Storage of Payment System Data (RBI/2017-18/153, April 6, 2018, effective October 15, 2018). Reinforced by RBI circular on Processing of e-mandate on recurring transactions (August 2022).
- **Scope:** All payment system operators and their service providers, intermediaries, third-party vendors, and other entities in the payment ecosystem. Applies to any entity authorized under the Payment and Settlement Systems Act, 2007 (PSS Act). Covers card networks (Visa, Mastercard, Amex, RuPay), payment aggregators, payment gateways, and payment processors operating in India.
- **Requirement:** The **entire payment data** (full end-to-end transaction details, information collected, carried, and processed as part of the message/payment instruction) must be stored in a system only in India — "data relating to payment systems operated by [authorized entities] shall be stored in a system only in India." This includes: card number (PAN), CVV, expiry date, transaction amount, transaction ID, merchant details, and customer details.
- **Cross-border processing permitted:** Data can be processed outside India during the transaction, but a copy must be brought back to India within one business day (the "store-back" requirement). The foreign copy must be deleted after processing, retaining only the Indian copy.
- **Audit and compliance:** RBI requires a Board-approved System Audit Report (SAR) confirming compliance, conducted by a CERT-IN empaneled auditor. Non-compliant entities face enforcement action including potential revocation of authorization.
- **Impact on architecture:** Payment processors must maintain India-based data centers or use cloud regions in India (AWS Mumbai, Azure Central India, GCP Mumbai). Cannot rely solely on US/EU-based infrastructure for Indian payment data. Mirror/replication architectures are common.
- **Card network impact:** Visa and Mastercard were required to localize Indian transaction data by October 2018. Both networks established India-based data centers. RBI restricted Mastercard from onboarding new customers in India from July 2021 to June 2022 for non-compliance, demonstrating enforcement severity.
- **Consequence:** Non-compliance can result in RBI restricting the entity from onboarding new customers, revoking payment system authorization, or imposing monetary penalties under the PSS Act.
- **Sources:** [RBI Circular on Storage of Payment System Data](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11244) | [PSS Act 2007](https://www.rbi.org.in/Scripts/OccasionalPublications.aspx?head=Payment%20and%20Settlement%20Systems%20Act)

### China — PBOC and CAC Financial Data Rules

- **Authority:** People's Bank of China (PBOC) regulations, Cyberspace Administration of China (CAC), and the Personal Information Protection Law (PIPL, effective November 1, 2021).
- **PIPL general framework:** Critical information infrastructure operators (CIIOs) and processors handling personal information above CAC-specified thresholds must store personal information collected in China domestically. Cross-border transfer requires one of: CAC security assessment, standard contractual clauses (China SCCs), or personal information protection certification.
- **CAC security assessment thresholds (effective September 1, 2022):** Mandatory government security assessment required if: (1) transferring "important data" abroad; (2) CIIO transferring any personal information abroad; (3) processor of 1 million+ individuals' personal information transferring any PI abroad; (4) cumulative transfer of 100,000+ individuals' PI or 10,000+ individuals' sensitive PI since January 1 of the current year.
- **PBOC payment-specific rules:** Financial institutions authorized by PBOC to process payments must store payment data in China. The PBOC treats payment transaction data as a category requiring heightened protection. Cross-border payment messaging (e.g., SWIFT) is permitted for transaction execution, but the complete payment data must reside in China.
- **Data classification:** Financial institutions must classify data into general, important, and core categories under the Data Security Law (DSL). Core financial data (customer identity, transaction records, account data) faces the strictest localization and transfer restrictions.
- **CIPS (Cross-Border Interbank Payment System):** China's alternative to SWIFT for RMB cross-border payments. CIPS messaging data is subject to PBOC oversight and localization requirements. Entities routing RMB transactions through CIPS must comply with CIPS operating rules on data handling.
- **Practical impact:** Foreign payment companies operating in China (including through JV structures) must maintain China-based infrastructure. UnionPay, Visa, Mastercard, and American Express all operate through China-domiciled entities with local data storage.
- **Consequence:** Violations of PIPL carry fines up to 50 million RMB or 5% of prior year's revenue. CAC can order suspension of data transfers. PBOC can restrict or revoke payment licenses.
- **Sources:** [PIPL Full Text (English)](http://www.npc.gov.cn/englishnpc/c23934/202112/1abd8829788946ecab270e469b13c39c.shtml) | [CAC Security Assessment Measures](http://www.cac.gov.cn/2022-07/07/c_1658811536396503.htm) | [PBOC Official Site](http://www.pbc.gov.cn/)

### Russia — Federal Law 152-FZ and Central Bank Rules

- **Authority:** Federal Law No. 152-FZ "On Personal Data" (as amended), Central Bank of Russia (CBR) regulations.
- **Requirement (152-FZ Art. 18):** Personal data of Russian citizens must be recorded, systematized, accumulated, stored, updated, and retrieved using databases located in Russia. This is a broad data localization mandate — not limited to financial data, but particularly enforced against financial institutions.
- **Cross-border transfer:** Permitted after initial localization in Russia (the "primary database" must be in Russia; copies can exist abroad). Cross-border transfer to "adequate" countries (Roskomnadzor maintains the list) is permitted; transfer to non-adequate countries requires consent or other legal basis.
- **CBR payment-specific rules:** The National Payment Card System (NSPK/Mir) requires all transaction data for domestic Russian card transactions to be processed and stored within Russia. After 2014 sanctions, Visa and Mastercard were required to route all domestic Russian transactions through NSPK. CBR imposes additional data handling requirements on payment system operators.
- **Sanctions context:** Since 2022, many Western payment companies have exited or been restricted in Russia. However, understanding the localization requirements remains relevant for: (1) companies with legacy data obligations, (2) entities processing through intermediaries, (3) OFAC licensing analysis for wind-down activities.
- **Consequence:** Roskomnadzor can block access to non-compliant services. Fines for 152-FZ localization violations: up to 18 million rubles for repeated violations, and subsequent amendments have continued to increase data-protection penalties. CBR can restrict payment system participation.
- **Sources:** [152-FZ Text](http://pravo.gov.ru/proxy/ips/?docbody=&nd=102108261) | [Roskomnadzor](https://rkn.gov.ru/) | [CBR Payment System Oversight](https://cbr.ru/eng/psystem/)

### Indonesia — OJK and Bank Indonesia Rules

- **Authority:** Otoritas Jasa Keuangan (OJK, Financial Services Authority), Bank Indonesia (BI), and Government Regulation No. 71/2019 on Electronic Systems and Transactions.
- **General requirement (GR 71/2019):** Electronic system operators that provide public services must manage, process, and store data in Indonesia. A 2024 implementing regulation (GR 17/2024) replaced GR 71 and provides for a risk-based classification of electronic systems.
- **BI payment-specific rules:** Bank Indonesia Regulation No. 23/6/PBI/2021 on Payment Service Providers requires payment transaction data to be stored in data centers and disaster recovery centers located in Indonesia. Payment service providers (including e-wallets, payment gateways, and card processors) must comply.
- **OJK fintech rules:** OJK Regulation No. 13/2018 on Digital Financial Innovation requires fintech operators to store data in Indonesia. Applies to P2P lending platforms, payment-adjacent fintech services, and digital financial products.
- **Data center requirements:** Data centers and disaster recovery sites must be physically located in Indonesia. Cloud infrastructure is permitted if the cloud region is in Indonesia (AWS Jakarta, Azure Southeast Asia, GCP Jakarta).
- **Consequence:** Non-compliance can result in license revocation, administrative sanctions, and operational restrictions imposed by BI or OJK.
- **Sources:** [Bank Indonesia Regulations](https://www.bi.go.id/en/publikasi/peraturan/default.aspx) | [OJK Official Site](https://www.ojk.go.id/en/) | [GR 71/2019](https://jdih.kominfo.go.id/)

### Vietnam — PDP Law 91/2025 (replacing Decree 13/2023) and SBV Rules

- **Authority:** Law on Personal Data Protection No. 91/2025/QH15 (effective January 1, 2026), replacing Ministry of Public Security (MPS) Decree 13/2023/ND-CP; State Bank of Vietnam (SBV) circulars.
- **General requirement (PDPL, carried over from Decree 13):** Data transferors sending personal data of Vietnamese citizens abroad must: (1) prepare a cross-border transfer impact assessment dossier; (2) satisfy the applicable consent/lawful-basis requirements; (3) file the dossier with the MPS within 60 days of the transfer (limited exemptions apply, including employee data stored on cloud services). The regime does not mandate localization per se but imposes onerous conditions on cross-border transfers; fines for cross-border violations can reach 5% of prior-year annual revenue.
- **SBV payment-specific rules:** The State Bank of Vietnam requires domestic payment data to be stored in Vietnam. E-wallet providers, intermediary payment service providers, and card processors operating in Vietnam must maintain local data infrastructure. SBV Circular 39/2014 and subsequent amendments govern payment intermediary services.
- **Practical impact:** Payment companies must maintain Vietnam-based servers or use compliant cloud infrastructure. The transfer impact assessment process adds significant administrative burden to any cross-border data flow.
- **Consequence:** Administrative fines under the PDPL (up to 5% of prior-year annual revenue for cross-border transfer violations). SBV can restrict or revoke payment intermediary licenses for non-compliance with data storage rules.
- **Sources:** [PDPL 91/2025/QH15 (English)](https://english.luatvietnam.vn/dan-su/law-on-personal-data-protection-law-no-91-2025-qh15-405135-d1.html) | [SBV Circular 39/2014](https://www.sbv.gov.vn/)

### Nigeria — CBN Guidelines

- **Authority:** Central Bank of Nigeria (CBN), Nigeria Data Protection Act (NDPA, 2023), Nigeria Data Protection Commission (NDPC).
- **CBN payment-specific rules:** CBN's Guidelines on Operations of Electronic Payment Channels require that all payment transaction data for Nigerian transactions be stored in data centers located in Nigeria. CBN's Framework for Regulatory Sandbox Operations further requires that fintech companies operating in the sandbox maintain Nigerian data storage.
- **NDPA general framework:** The Nigeria Data Protection Act 2023 (replacing the earlier NDPR 2019) requires data controllers to conduct transfer impact assessments before cross-border transfers. The NDPC maintains an adequacy list and can require specific safeguards.
- **Practical impact:** Payment processors and mobile money operators in Nigeria must maintain local infrastructure. Interswitch, Flutterwave, Paystack, and other processors operate Nigeria-based data centers.
- **Consequence:** CBN can impose fines, restrict operations, or revoke licenses. NDPA violations carry fines up to 2% of annual gross revenue or 10 million Naira, whichever is greater.
- **Sources:** [CBN Guidelines on E-Payment](https://www.cbn.gov.ng/) | [NDPA 2023](https://ndpc.gov.ng/) | [NDPC Official Site](https://ndpc.gov.ng/)

### Other Jurisdictions — Brief Reference

- **South Korea:** Financial Services Commission (FSC) and Financial Supervisory Service (FSS) require financial institutions to obtain prior approval before offshoring financial data processing. The Credit Information Use and Protection Act restricts cross-border transfer of credit information. See also `international.md` for PIPA framework.
- **Saudi Arabia:** Saudi Central Bank (SAMA) Outsourcing Regulations require that customer data of Saudi financial institutions be stored within Saudi Arabia or in a jurisdiction approved by SAMA. Cloud computing guidelines permit approved foreign cloud providers with conditions.
- **UAE:** Central Bank of the UAE requires financial institutions to store customer data within the UAE. The UAE Personal Data Protection Law (Federal Decree-Law No. 45/2021) provides a general data protection framework. DIFC and ADGM free zones have separate data protection regimes.
- **Brazil:** Central Bank of Brazil (BCB) requires payment institutions regulated under Law 12,865/2013 to maintain data infrastructure in Brazil. The LGPD provides the general data protection framework but does not mandate localization. See `international.md` for LGPD details.
- **Thailand:** Bank of Thailand (BOT) requires financial institutions to obtain BOT approval before using offshore IT outsourcing or cloud services for critical systems. The PDPA (2022) does not mandate localization but requires adequate safeguards for cross-border transfers.
- **Taiwan:** Financial Supervisory Commission (FSC) guidelines on cloud computing for financial institutions require that certain categories of customer data remain in Taiwan or in pre-approved offshore locations with equivalent protections.

## Architecture Implications

When designing payment infrastructure subject to data localization:

- **Multi-region deployment:** Maintain data centers or cloud regions in each jurisdiction with localization requirements. Minimum: India (mandatory), China (mandatory for RMB/UnionPay), Indonesia (mandatory for domestic payments).
- **Data residency by design:** Tag payment data with jurisdiction at ingestion. Route storage to the correct region before processing. Avoid a single global data lake for transaction data.
- **Processing vs. storage distinction:** Most jurisdictions permit cross-border processing during the transaction but require storage to reside locally. Design for "store-back" patterns (India model) where data can transit internationally but must settle domestically.
- **SWIFT and messaging:** SWIFT messages transit globally by nature. Jurisdictions generally permit this for transaction execution but require the complete transaction record (not just the message) to reside locally.
- **Disaster recovery:** Many jurisdictions require DR sites to also be domestic (India, Indonesia). Plan DR architecture per jurisdiction, not globally.

## Interaction with Other Areas

- **Data Privacy (Cross-Border Transfers):** General transfer mechanisms (SCCs, BCRs, adequacy) — localization requirements override or supplement these. See `cross-border-transfers.md`.
- **Data Privacy (International):** General privacy frameworks for each jurisdiction. See `international.md`.
- **Data Privacy (GDPR):** GDPR does not require localization but restricts transfers to non-adequate countries. See `gdpr.md`.
- **Financial Services (Payments/Money Transmission):** Licensing requirements that may include data handling conditions. See `law/financial-services/payments-money-transmission.md`.
- **Cybersecurity:** Data center security standards required by financial regulators. See `law/cybersecurity/`.

## Sources

- [RBI Circular on Storage of Payment System Data](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11244) — India localization mandate
- [China PIPL Full Text](http://www.npc.gov.cn/englishnpc/c23934/202112/1abd8829788946ecab270e469b13c39c.shtml) — China general privacy framework
- [CAC Outbound Data Transfer Security Assessment](http://www.cac.gov.cn/2022-07/07/c_1658811536396503.htm) — China cross-border transfer rules
- [Russia 152-FZ](http://pravo.gov.ru/proxy/ips/?docbody=&nd=102108261) — Russia data localization law
- [Bank Indonesia Payment Regulations](https://www.bi.go.id/en/publikasi/peraturan/default.aspx) — Indonesia payment data rules
- [Vietnam PDP Law 91/2025/QH15](https://english.luatvietnam.vn/dan-su/law-on-personal-data-protection-law-no-91-2025-qh15-405135-d1.html) — Vietnam personal data protection law (effective January 1, 2026, replacing Decree 13/2023)
- [CBN Nigeria — E-Payment Guidelines](https://www.cbn.gov.ng/) — Nigeria payment data requirements
- [DLA Piper Data Protection Laws of the World](https://www.dlapiperdataprotection.com/) — Comparative data localization tracker

---
