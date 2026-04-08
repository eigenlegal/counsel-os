---
counsel-os-type: law-area
content-version: "2026-04-08"
---
## Financial Sector Privacy Regulators

# Financial Sector Privacy Regulators

## Applicability

Load when the matter involves financial institution data incident notification to banking regulators, NY DFS cybersecurity regulation (23 NYCRR 500), CFPB consumer financial data rights (Section 1033 / open banking), FinCEN record retention requirements and their interaction with privacy deletion rights, SEC Regulation S-P, or the multi-regulator privacy landscape facing a fintech or payment company. This file covers the regulatory overlay that applies specifically to financial institutions, on top of general data privacy laws.

For GLBA Privacy Rule and Safeguards Rule, see `glba-privacy.md`. For general breach notification, see `breach-notification.md` and `us-breach-notification-50-state.md`. For GDPR, CCPA, and other general privacy frameworks, see the other data-privacy sub-files.

## Key Requirements

### OCC/Fed/FDIC — Computer-Security Incident Notification (36-Hour Rule)

- **Authority:** Joint Final Rule: Computer-Security Incident Notification Requirements for Banking Organizations and Their Bank Service Providers (12 C.F.R. Part 53 (OCC), 12 C.F.R. Part 225 (Fed), 12 C.F.R. Part 304 (FDIC)), effective April 1, 2022.
- **Scope:** Banking organizations (national banks, federal savings associations, state member banks, state nonmember banks, insured branches of foreign banks, bank holding companies, savings and loan holding companies) AND their bank service providers (including payment processors, core banking providers, and technology service providers under the Bank Service Company Act).
- **Notification trigger — banking organizations:** Must notify their primary federal regulator within **36 hours** after determining that a "notification incident" has occurred. A notification incident is a computer-security incident that has materially disrupted or degraded, or is reasonably likely to materially disrupt or degrade, (1) the banking organization's ability to carry out banking operations, (2) a business line whose failure would result in a material loss of revenue, profit, or franchise value, or (3) operations whose failure would pose a threat to US financial stability.
- **Notification trigger — bank service providers:** Must notify each affected banking organization customer "as soon as possible" after experiencing a computer-security incident that has materially disrupted or degraded, or is reasonably likely to materially disrupt or degrade, covered services provided to the banking organization for four or more hours. No specific hour deadline for service providers, but "as soon as possible" is interpreted strictly.
- **What constitutes "determination":** The 36-hour clock starts when the banking organization has a good-faith belief that a notification incident has occurred — not when the investigation is complete. This is an aggressive trigger.
- **Form of notification:** No specific form required — may be made by email, telephone, or any other method the primary federal regulator has prescribed. The notification is an alert, not a detailed report. Detailed incident reports follow under separate examination processes.
- **Relationship to state breach notification:** This is a separate, additional obligation. It runs in parallel with state breach notification requirements. A banking organization may need to notify its federal regulator within 36 hours AND the state AG within 30-60 days AND affected consumers under state law timelines.
- **Impact on non-bank fintechs:** Non-bank fintechs are not directly subject to this rule. However, if a fintech is a "bank service provider" to a banking organization (common for payment processors, BaaS providers, core banking technology providers), it has the "as soon as possible" notification obligation to its bank partner. Bank partners will also contractually impose notification requirements (often 24-72 hours) in service agreements.
- **Consequence:** Failure to notify is a violation of federal banking regulations, subject to enforcement action by OCC, Fed, or FDIC. Enforcement includes cease-and-desist orders, civil money penalties, and individual liability for officers.
- **Sources:** [12 C.F.R. Part 53 (OCC)](https://www.law.cornell.edu/cfr/text/12/part-53) | [Joint Final Rule Federal Register](https://www.federalregister.gov/documents/2021/11/23/2021-25510/computer-security-incident-notification-requirements-for-banking-organizations-and-their-bank-service)

### NY DFS Cybersecurity Regulation — 23 NYCRR 500

- **Authority:** New York Department of Financial Services, 23 NYCRR Part 500 (originally effective March 1, 2017; significantly amended November 1, 2023, with phased compliance through November 2025).
- **Scope:** All entities licensed or regulated by NY DFS — includes banks, insurance companies, money transmitters, mortgage companies, licensed lenders, virtual currency businesses (BitLicense holders), and other regulated financial services companies. Applies to the entity's entire operations, not just its NY activities.
- **Cybersecurity event notification:** Must notify the DFS Superintendent **within 72 hours** of determining that a "cybersecurity event" has occurred that either (1) requires notification to any government body, self-regulatory agency, or any other supervisory body, OR (2) has a reasonable likelihood of materially harming normal operations. This is broader than the banking regulator 36-hour rule — it captures any event triggering any notification obligation anywhere.
- **Ransomware notification:** The 2023 amendments add a specific requirement to notify DFS within 72 hours of a ransomware event, AND within 24 hours of making an extortion payment. The covered entity must also provide a written explanation within 30 days of why the payment was necessary.
- **CISO requirement:** Must designate a Chief Information Security Officer (or equivalent). The CISO must report in writing at least annually to the senior governing body on the cybersecurity program.
- **2023 amendment key additions:**
  - **Class A companies** (≥$20M gross annual revenue from NY business + either ≥2,000 employees including affiliates OR >$1B gross annual revenue): Enhanced requirements including independent audit of the cybersecurity program, CISO with adequate authority and independence, privileged access management, and endpoint detection and response.
  - **Governance:** Board or equivalent must exercise oversight of cybersecurity risk, approve the cybersecurity policy at least annually, and ensure adequate resources for the program.
  - **Asset inventory:** Maintain a complete, accurate, and documented asset inventory including hardware, software, data, and external-facing systems.
  - **Business continuity and disaster recovery:** Written BCDR plan that is tested at least annually. Must address data backup, system restoration, and communication procedures.
  - **Encryption:** Encrypt NPI in transit and at rest. Compensating controls permitted if encryption is infeasible, but must be reviewed annually and approved by the CISO.
  - **MFA:** Required for remote access and for all privileged accounts. Extends to all access to the covered entity's internal network from an external network.
  - **Vulnerability management:** Written policy, timely remediation, and automated scanning.
- **Exemptions:** Limited exemptions for small entities: fewer than 20 employees including independent contractors, less than $5M gross annual revenue in each of the last 3 years from NY business, and less than $15M total assets. Exempt entities must still notify DFS of cybersecurity events and comply with core requirements.
- **Consequence:** DFS has broad enforcement authority: civil penalties, consent orders, license conditions, and license revocation. DFS has imposed multi-million-dollar penalties for cybersecurity regulation violations (e.g., $5M penalty against a title insurance company in 2024 for MFA failures).
- **Sources:** [23 NYCRR Part 500 (Current)](https://www.dfs.ny.gov/industry_guidance/cybersecurity) | [DFS 2023 Amendments](https://www.dfs.ny.gov/reports_and_publications/press_releases/pr202311011) | [DFS Cybersecurity Resource Center](https://www.dfs.ny.gov/industry_guidance/cybersecurity)

### CFPB — Personal Financial Data Rights (Section 1033)

- **Authority:** Dodd-Frank Act Section 1033 (12 U.S.C. 5533), implemented by the CFPB's Personal Financial Data Rights rule (finalized October 22, 2024). Also known as the "open banking" or "consumer-authorized data sharing" rule.
- **Scope:** Data providers include depository institutions (banks, credit unions) and non-depository financial institutions (card issuers, payment facilitators) that control or possess consumer financial data. Third parties that access consumer data on behalf of consumers (fintechs, aggregators, personal financial management apps) are "authorized third parties" subject to the rule's obligations.
- **Consumer right to access:** Consumers have the right to access their personal financial data held by covered data providers. Data providers must make this data available in a standardized, machine-readable format through a developer interface (API). Screen scraping is disfavored and data providers can block credential-based access once a compliant API is available.
- **Third-party authorization framework:** Authorized third parties may access consumer data only with the consumer's express informed consent. The authorization must specify: (1) the data to be accessed, (2) the purpose for which it will be used, (3) the duration of authorization (maximum 1 year, renewable). Third parties must provide a clear, conspicuous authorization disclosure.
- **Data use restrictions:** Authorized third parties may only use consumer data for the specific purpose authorized by the consumer. Prohibited uses include: targeted advertising (other than marketing the specific product the consumer authorized), cross-selling unrelated products, and selling the data to other parties. This is a significant restriction on data monetization.
- **Data minimization:** Third parties may only collect data reasonably necessary for the authorized purpose. Must limit the scope and duration of access.
- **Security requirements:** Third parties must maintain a comprehensive written information security program. Must certify compliance annually.
- **Revocation:** Consumers can revoke authorization at any time. Upon revocation, the third party must stop accessing data and delete previously obtained data within a commercially reasonable period.
- **Compliance timeline (phased):**
  - Largest depository institutions (>$250B assets) and largest non-depository institutions: April 1, 2026
  - Depository institutions >$10B assets: April 1, 2027
  - Depository institutions >$3B assets: April 1, 2028
  - Depository institutions >$1.5B assets: April 1, 2029
  - Depository institutions >$850M assets: April 1, 2030
  - Small depository institutions (≤$850M): exempt until further rulemaking
- **Impact on fintechs:** Fintechs that aggregate financial data (Plaid model) must transition from screen scraping to API-based access, obtain proper consumer authorization, limit data use to authorized purposes, and implement data minimization. This fundamentally restructures the data aggregation business model.
- **Consequence:** CFPB enforcement including civil penalties, restitution, and injunctive relief. The rule is subject to ongoing litigation (Bank Policy Institute challenged the rule; status should be verified).
- **Sources:** [CFPB Personal Financial Data Rights Rule](https://www.consumerfinance.gov/rules-policy/final-rules/personal-financial-data-rights/) | [12 U.S.C. 5533](https://www.law.cornell.edu/uscode/text/12/5533) | [CFPB Section 1033 Rulemaking Page](https://www.consumerfinance.gov/rules-policy/rules/required-rulemaking-personal-financial-data-rights/)

### FinCEN — Record Retention vs. Privacy Deletion Rights

- **The tension:** BSA/AML regulations require financial institutions (including money transmitters) to retain certain records for 5 years. GDPR's storage limitation principle (Art. 5(1)(e)) and the right to erasure (Art. 17), CCPA's deletion right, and state privacy law deletion rights create a direct conflict.
- **BSA retention requirements (31 C.F.R. Part 1010.430):** CTRs, SARs, and related records: 5 years from the date of filing. Records of each transaction involving $3,000+ in currency: 5 years. Records related to transmittals of funds of $3,000+: 5 years. Customer identification records: 5 years after account closure or last transaction.
- **SAR confidentiality:** SARs are confidential — a financial institution cannot disclose the existence of a SAR to the subject or any third party (with limited exceptions for FinCEN, law enforcement, and certain regulators). This means a DSAR response under GDPR or CCPA cannot include SAR-related data. The institution must assert the SAR confidentiality exemption.
- **GDPR reconciliation:** GDPR Art. 17(3)(b) provides that the right to erasure does not apply when processing is necessary for compliance with a legal obligation. BSA/AML retention requirements qualify as a legal obligation. The institution should: (1) retain BSA/AML-required data for the full 5-year period; (2) delete non-required personal data upon valid erasure request; (3) document the legal basis for retention in a retention schedule; (4) inform the data subject that certain data is retained pursuant to legal obligations (without revealing SAR existence).
- **CCPA reconciliation:** CCPA § 1798.105(d)(8) exempts from deletion data that the business is required to retain by law. BSA/AML requirements qualify. The institution should respond to a CCPA deletion request by: (1) deleting data not subject to legal retention requirements; (2) informing the consumer that certain data is retained pursuant to legal obligations.
- **Practical guidance:**
  - Maintain a detailed data retention schedule mapping each data category to its legal retention basis
  - Do not apply blanket retention — retain only what is legally required and delete the rest
  - For SAR-related data, assert confidentiality without revealing SAR existence (respond with: "certain data is retained pursuant to federal legal obligations that prevent us from providing further detail")
  - Train DSAR response teams on the BSA/AML exemption
  - Document all retention decisions for regulatory examination
- **Sources:** [31 C.F.R. Part 1010.430](https://www.law.cornell.edu/cfr/text/31/part-1010/subpart-D) | [FinCEN BSA Retention Requirements](https://www.fincen.gov/resources/statutes-and-regulations) | [GDPR Art. 17(3)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

### SEC — Regulation S-P (Privacy of Consumer Financial Information)

- **Authority:** SEC Regulation S-P (17 C.F.R. Part 248), substantially amended May 2024 (effective November 2025 for large entities, May 2026 for smaller entities).
- **Scope:** Broker-dealers, investment companies, registered investment advisers, transfer agents, and certain other SEC-regulated entities. Does not apply to non-SEC-regulated fintechs or payment processors, but relevant if the fintech has a registered broker-dealer or investment adviser affiliate.
- **2024 amendments — incident response:** For the first time, Reg S-P requires covered institutions to adopt written incident response programs for unauthorized access to or use of customer information. Must include: procedures for detecting, responding to, and recovering from incidents; notification to affected individuals "as soon as practicable" but no later than **30 days** after the entity becomes aware that unauthorized access or use has occurred or is reasonably likely to have occurred.
- **Privacy notice and opt-out:** Similar to GLBA Regulation P — initial and annual (if applicable) privacy notices, opt-out rights for sharing with nonaffiliated third parties.
- **Safeguards Rule:** Covered institutions must adopt written policies and procedures reasonably designed to safeguard customer records and information (similar to but separate from the FTC Safeguards Rule).
- **Disposal rule:** Proper disposal of consumer report information under the Fair Credit Reporting Act.
- **Consequence:** SEC enforcement including civil penalties, censure, suspension, and revocation of registration.
- **Sources:** [Regulation S-P (17 C.F.R. Part 248)](https://www.law.cornell.edu/cfr/text/17/part-248) | [SEC 2024 Amendments](https://www.sec.gov/rules/2024/05/regulation-s-p-privacy-consumer-financial-information-and-safeguarding-customer)

### CISA — Cyber Incident Reporting (CIRCIA)

- **Authority:** Cyber Incident Reporting for Critical Infrastructure Act of 2022 (CIRCIA), signed March 15, 2022. CISA published a Notice of Proposed Rulemaking (NPRM) on April 4, 2024. Final rule expected 2025-2026.
- **Scope (proposed):** Covered entities include entities in critical infrastructure sectors as designated by Presidential Policy Directive 21 — the financial services sector is explicitly included. Size thresholds and specific coverage criteria are defined in the proposed rule.
- **Reporting obligations (proposed):**
  - **Covered cyber incidents:** Report to CISA within **72 hours** of reasonably believing a covered cyber incident has occurred
  - **Ransom payments:** Report to CISA within **24 hours** of making a ransom payment
  - **Supplemental reports:** Submit if substantially new or different information becomes available
- **Covered cyber incident definition:** An incident that leads to substantial loss of confidentiality, integrity, or availability of an information system; serious impact on the safety or resiliency of operational systems or processes; disruption of the ability to engage in business or deliver services; or unauthorized access due to compromise of a third-party service provider.
- **Current status:** NPRM published; final rule pending. Until the final rule is effective, CIRCIA reporting is voluntary. However, CISA encourages voluntary reporting and many financial sector entities already report voluntarily.
- **Relationship to other obligations:** CIRCIA reporting is separate from and additional to banking regulator notification (36h), state breach notification, and NY DFS notification. CIRCIA includes provisions allowing entities to satisfy CIRCIA through reports made to other federal agencies (potential harmonization).
- **Consequence (once effective):** CISA can issue subpoenas for non-compliant entities. Information provided is protected from disclosure (cannot be used in civil litigation against the reporting entity). Criminal penalties for knowingly making false statements.
- **Sources:** [CIRCIA Text](https://www.congress.gov/bill/117th-congress/house-bill/2471) | [CISA CIRCIA NPRM](https://www.cisa.gov/topics/cyber-threats-and-advisories/information-sharing/cyber-incident-reporting-critical-infrastructure-act-2022-circia) | [CISA Official Site](https://www.cisa.gov/)

## Multi-Regulator Notification Timeline

For a fintech operating as a bank service provider with NY DFS licensure, a data breach can trigger the following cascade:

| Timeline | Obligation | Regulator |
|----------|-----------|-----------|
| ASAP | Notify bank partner(s) | Contractual (bank service provider rule) |
| 24 hours | Notify card networks (if payment card data) | Visa/Mastercard (contractual) |
| 24 hours | Report ransom payment (if applicable) | NY DFS + CISA (once effective) |
| 36 hours | Notify primary federal banking regulator | OCC/Fed/FDIC |
| 72 hours | Notify NY DFS Superintendent | 23 NYCRR 500 |
| 72 hours | Notify CISA (once CIRCIA effective) | CISA |
| 72 hours | Notify EU supervisory authority (if GDPR applies) | Lead SA |
| 30 days | Notify affected individuals (SEC entities) | SEC Reg S-P |
| 30-60 days | Notify affected consumers + state AGs | State breach notification laws |

## Interaction with Other Areas

- **Data Privacy (GLBA):** GLBA Privacy Rule and Safeguards Rule — the foundational federal privacy regime for financial institutions. See `glba-privacy.md`.
- **Data Privacy (Breach Notification):** General breach notification framework and international requirements. See `breach-notification.md`.
- **Data Privacy (50-State Breach):** State-by-state breach notification requirements running in parallel with financial regulator obligations. See `us-breach-notification-50-state.md`.
- **Data Privacy (GDPR):** GDPR 72-hour supervisory authority notification. See `gdpr.md`.
- **Data Privacy (Data Subject Rights):** DSAR fulfillment and the BSA/AML retention conflict. See `data-subject-rights.md`.
- **Financial Services (KYC/AML):** BSA/AML program requirements and SAR confidentiality. See `law/financial-services/kyc-aml.md`.
- **Financial Services (Federal Payments Regulation):** Federal regulatory landscape for payments companies. See `law/financial-services/federal-payments-regulation.md`.
- **Cybersecurity:** NIST frameworks, incident response, SEC cyber disclosure. See `law/cybersecurity/`.

## Sources

- [12 C.F.R. Part 53 — OCC Incident Notification](https://www.law.cornell.edu/cfr/text/12/part-53) — Banking organization 36-hour rule
- [23 NYCRR Part 500 — NY DFS Cybersecurity](https://www.dfs.ny.gov/industry_guidance/cybersecurity) — NY DFS cybersecurity regulation
- [CFPB Personal Financial Data Rights Rule](https://www.consumerfinance.gov/rules-policy/final-rules/personal-financial-data-rights/) — Section 1033 open banking
- [31 C.F.R. Part 1010 — BSA Recordkeeping](https://www.law.cornell.edu/cfr/text/31/part-1010/subpart-D) — FinCEN retention requirements
- [Regulation S-P (17 C.F.R. Part 248)](https://www.law.cornell.edu/cfr/text/17/part-248) — SEC privacy and incident response
- [CIRCIA — CISA Cyber Incident Reporting](https://www.cisa.gov/topics/cyber-threats-and-advisories/information-sharing/cyber-incident-reporting-critical-infrastructure-act-2022-circia) — Critical infrastructure reporting

---
