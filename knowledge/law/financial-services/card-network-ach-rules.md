---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [network-rules, us-federal]
last-reviewed: "2026-06-10"
authorities:
  - cite: "Visa Core Rules and Visa Product and Service Rules"
    title: "Visa Rules (public edition)"
    url: "https://usa.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf"
  - cite: "Visa Acquirer Monitoring Program fact sheet (2025)"
    title: "Visa Acquirer Monitoring Program (VAMP)"
    url: "https://corporate.visa.com/content/dam/VCOM/corporate/visa-perspectives/security-and-trust/documents/visa-acquirer-monitoring-program-fact-sheet-2025.pdf"
  - cite: "Nacha Operating Rules — Risk Management Topics"
    title: "Fraud Monitoring Phase 1 (effective March 20, 2026) and Phase 2 (effective June 19, 2026)"
    url: "https://www.nacha.org/rules/risk-management-topics-fraud-monitoring-phase-1"
  - cite: "The Clearing House (Feb. 2025)"
    title: "RTP network transaction limit increase to $10 million"
    url: "https://www.theclearinghouse.org/payment-systems/Articles/2025/06/RTP-10m-Limit"
  - cite: "Federal Reserve Financial Services (Sept. 2025)"
    title: "FedNow Service Will Raise Transaction Limit to $10 Million"
    url: "https://www.frbservices.org/news/press-releases/090525-fednow-transaction-limit-increase"
---
# Card Network and ACH Operating Rules

## Applicability

Load when the matter involves Visa or Mastercard operating rules, payment facilitator (PayFac) registration or compliance, merchant acquiring, card network fines or assessments, chargeback and dispute resolution, NACHA operating rules, ACH origination, return rate monitoring, same-day ACH, third-party sender obligations, or real-time payment networks (RTP/FedNow).

These are contractual and industry-standard regimes, not statutes. They are binding on participants through network membership agreements and ODFI/RDFI agreements. For statutory payment regulation, see `federal-payments-regulation.md` and `payments-money-transmission.md`.

## Key Requirements

### Visa Core Rules — Key Provisions

- **PayFac Registration:** Visa requires registration for entities processing on behalf of sub-merchants under the PayFac's own merchant ID. PayFac obligations include: sub-merchant underwriting and due diligence, KYC/AML compliance, transaction monitoring, chargeback management, and ongoing risk assessment. Annual compliance validation required.
- **Merchant Monitoring:** Visa Global Brand Protection Program (GBPP) imposes ongoing monitoring for high-risk merchant categories (MCCs 5966, 5967, 7995, among others). Acquirers and PayFacs must maintain merchant risk monitoring programs with transaction velocity checks, content monitoring, and chargeback rate tracking.
- **Fraud and Dispute Monitoring — VAMP:** Effective April 1, 2025, the Visa Acquirer Monitoring Program (VAMP) consolidated Visa's prior fraud and dispute monitoring programs (including VFMP and VDMP) into a single program built on a combined fraud-plus-dispute "VAMP ratio," measured at acquirer-portfolio and merchant level. Per Visa's published 2025 fact sheet, an acquirer portfolio is "Above Standard" at a VAMP ratio of 50+ bps and "Excessive" at 70+ bps; merchant-level thresholds and enforcement phase in through 2026 (an advisory, non-enforcement period ran through September 30, 2025, with per-transaction enforcement fees thereafter). Thresholds tighten in stages — verify current figures in Visa's published VAMP materials before advising. The separate Visa Integrity Risk Program (VIRP) continues to govern illegal and brand-damaging activity in high-integrity-risk merchant categories.
- **Chargeback and Dispute Resolution:** Visa Claims Resolution (VCR) uses allocation and collaboration workflows. Timelines: 120 days from transaction date for most disputes, up to 540 days for certain fraud types. Compelling evidence requirements vary by dispute reason code. Pre-arbitration and arbitration available for unresolved disputes.
- **Data Security:** Visa Account Information Security (AIS) program supplements PCI DSS. Breach notification required to Visa within 24 hours of suspected compromise. Visa may impose forensic investigation requirements at merchant/processor expense.
- **Consequence:** Non-compliance fines range $25,000-$500,000+ per incident, with escalation for repeated violations. Loss of PayFac registration. Processing privilege revocation in severe cases.

### Mastercard Standards — Key Provisions

- **Payment Facilitator (PF) Program:** Mastercard requires PF registration through the sponsoring acquirer. PF must maintain sub-merchant underwriting standards, including identity verification, business legitimacy checks, and risk assessment. Sponsor bank retains ultimate responsibility for PF's sub-merchant portfolio.
- **Mastercard Registration Program (MRP):** High-risk merchant categories require registration with Mastercard — includes gambling (7995), adult content (5967), pharmaceuticals (5912/5122), debt collection, and others. $100 one-time registration fee per merchant. Acquirer responsible for registration and ongoing monitoring.
- **MATCH Database (Member Alert to Control High-risk Merchants):** Centralized database of terminated merchants. MATCH listing criteria include: fraud, excessive chargebacks, identity theft, illicit transactions, PCI DSS non-compliance, bankruptcy/liquidation/insolvency, and violation of Mastercard standards. Listing duration: 5 years. Acquirers must check MATCH before boarding new merchants.
- **Settlement and Funding:** Mastercard rules govern settlement timing, funding requirements for merchants/sub-merchants, and prohibited practices (delayed settlement beyond commercially reasonable periods, commingling of merchant funds with operating funds).
- **Consequence:** Mastercard assessments for non-compliance; escalating penalties; potential termination of acquirer or PF registration.

### Card Network Fines and Enforcement

- **Excessive Chargeback Programs:**
  - **Visa:** The legacy Visa Dispute Monitoring Program (VDMP) and Visa Fraud Monitoring Program (VFMP) were retired into VAMP effective April 1, 2025 — see the VAMP entry above for current thresholds and enforcement fees.
  - **Mastercard Excessive Chargeback Program (ECP):** Threshold: 100 chargebacks + 1.0% chargeback-to-transaction ratio for 2 consecutive months. Excessive: 300 chargebacks + 1.5% ratio. Assessments: $1,000-$200,000/month depending on tier and duration. (Mastercard program tiers and figures are set in Mastercard's standards, which are not fully public — confirm current criteria with the acquirer/sponsor before advising.)
- **Acquirer-Level Consequences:** Pattern of non-compliance across merchant portfolio can trigger acquirer-level fines, enhanced monitoring requirements, and restrictions on new merchant boarding.
- **Termination:** Networks can require acquirer to terminate a merchant relationship. MATCH/VMAS listing effectively prevents the merchant from obtaining processing through any acquirer for 5 years.

### NACHA Operating Rules — ACH Requirements

- **ACH Network Governance:** NACHA is the rule-making body for the ACH network. Rules are binding on all ACH participants through ODFI (Originating Depository Financial Institution) and RDFI (Receiving Depository Financial Institution) agreements. Annual rule changes effective each year.
- **WEB Entry Requirements:** Consumer internet-initiated debits require: written authorization (electronic consent compliant with E-Sign Act), commercially reasonable fraudulent transaction detection system, and account validation using a commercially reasonable method. Account validation mandate effective since 2022.
- **TEL Entry Requirements:** Telephone-initiated consumer debits require oral authorization — either recorded call or written confirmation sent before settlement. Recording must capture: consumer identity, authorization language, amount, date, and payee.
- **Return Rate Monitoring:** NACHA monitors return rates on a rolling 60-day basis. Thresholds: overall return rate 15%; unauthorized return rate 0.5%; administrative return rate 3%. Exceeding thresholds triggers NACHA enforcement process, including potential fines and suspension.
- **Fraud Monitoring Rules (2026):** Nacha's risk management rules require risk-based processes to identify entries initiated due to fraud. Phase 1 (effective March 20, 2026) applies to all ODFIs and to non-consumer Originators, Third-Party Service Providers, and Third-Party Senders with 2023 origination volume of 6 million+ entries; RDFIs with 2023 receipt volume of 10 million+ must monitor incoming ACH credits for fraud. Phase 2 (effective June 19, 2026) removes the volume threshold for originating parties.
- **Same-Day ACH:** Per-payment limit of $1,000,000. Three processing windows daily (10:30 AM, 2:45 PM, 4:45 PM ET). Same-day ACH fee (currently ~$0.026/entry, declining over time). Available for credits and debits.
- **Third-Party Sender (TPS) Rules:** TPS must identify itself to its ODFI and register with NACHA. ODFI retains ultimate responsibility for TPS-originated entries. TPS must be audited. Nested TPS arrangements (TPS using another TPS) are prohibited without ODFI knowledge and agreement.
- **Micro-Entry Rules:** Used for account verification — limited to $0.01-$0.99 range. Must withdraw micro-entries within 2 banking days. Security requirements mandate encryption of micro-entry data and fraud monitoring.
- **Consequence:** NACHA Rules Enforcement Panel can impose fines up to $100,000 per violation plus $1,000/day for continuing violations. Suspension of ACH origination privileges. ODFI liability for all entries originated through it, including TPS-originated entries.

### RTP and FedNow — Real-Time Payments

- **RTP Network (The Clearing House):** Launched 2017. $10,000,000 per-transaction limit (raised from $1,000,000 effective February 9, 2025). 24/7/365 availability. Credit-push only (no debit pull). Irrevocable — no recalls, only request-for-return (which the receiving institution may decline). Participating-institution counts change frequently — see TCH for the current figure.
- **FedNow (Federal Reserve):** Launched July 2023. Network per-transaction limit of $10,000,000 as of November 2025 (raised from $500,000 to $1,000,000 earlier in 2025, then to $10,000,000); each participating institution sets its own limits within the network ceiling. 24/7/365. Credit-push only. 1,000+ participating institutions (see Federal Reserve Financial Services for the current count). Request for Payment (RfP) feature allows payees to request funds from payers.
- **Regulatory Considerations:** Irrevocability creates elevated fraud risk — particularly authorized push payment (APP) fraud and social engineering. No chargeback mechanism exists for real-time payments. Regulation E still applies to consumer unauthorized electronic fund transfers via these networks. BSA/AML obligations apply to instant payment facilitators. Fraud detection must operate in real-time (sub-second decision window).
- **Consequence:** Once a real-time payment settles, it cannot be reversed without the receiving party's cooperation. This shifts fraud risk significantly compared to ACH (which allows returns) and card networks (which allow chargebacks).

## Interaction with Other Areas

- **Financial Services (Payments/Money Transmission):** Money transmission licensing and exemption analysis for payment facilitators. See `payments-money-transmission.md`.
- **Financial Services (Federal Payments Regulation):** Federal regulatory requirements including Regulation E consumer protections and CFPB authority over payment disputes. See `federal-payments-regulation.md`.
- **Financial Services (PCI DSS):** Payment card data security standards required by both Visa and Mastercard as a condition of processing. See `pci-dss.md`.
- **Financial Services (KYC/AML):** BSA/AML obligations for ACH originators, third-party senders, and payment facilitators. See `kyc-aml.md`.
- **Consumer Protection:** Consumer dispute resolution rights under state law supplement network dispute processes and Regulation E protections.

## Sources

- [Visa Core Rules and Product Programs](https://usa.visa.com/support/merchant/library/visa-rules.html)
- [Mastercard Rules](https://www.mastercard.us/en-us/business/overview/support/rules.html)
- [NACHA Operating Rules](https://www.nacha.org/rules)
- [NACHA ACH Network Risk and Enforcement](https://www.nacha.org/content/ach-network-risk-and-enforcement-topics)
- [The Clearing House RTP Network](https://www.theclearinghouse.org/payment-systems/rtp)
- [FedNow Service](https://www.frbservices.org/financial-services/fednow)
- [Visa Integrity Risk Program](https://usa.visa.com/support/merchant/risk-management/fraud-monitoring-programs.html)
- [MATCH Database / Mastercard Alert](https://www.mastercard.us/en-us/business/overview/support/rules.html)

---
