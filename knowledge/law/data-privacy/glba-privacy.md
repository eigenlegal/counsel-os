---
counsel-os-type: law-area
content-version: "2026-06-11"
jurisdiction: [us-federal]
last-reviewed: "2026-06-10"
authorities:
  - cite: "15 U.S.C. Chapter 94"
    title: "Gramm-Leach-Bliley Act — disclosure of nonpublic personal information"
    url: "https://www.law.cornell.edu/uscode/text/15/chapter-94"
  - cite: "12 C.F.R. Part 1016"
    title: "Regulation P — Privacy of Consumer Financial Information"
    url: "https://www.law.cornell.edu/cfr/text/12/part-1016"
  - cite: "16 C.F.R. Part 314"
    title: "FTC Safeguards Rule — Standards for Safeguarding Customer Information"
    url: "https://www.law.cornell.edu/cfr/text/16/part-314"
  - cite: "88 FR 77499 (Nov. 13, 2023)"
    title: "Safeguards Rule amendment — breach notification to the FTC (effective May 13, 2024)"
    url: "https://www.federalregister.gov/documents/2023/11/13/2023-24412/standards-for-safeguarding-customer-information"
  - cite: "Cal. Civ. Code § 1798.145(e)"
    title: "CCPA GLBA exemption"
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.145.&lawCode=CIV"
---
# GLBA — Financial Privacy and Safeguards

## Applicability

Load when the matter involves a financial institution's privacy practices, consumer financial data sharing with affiliates or third parties, privacy notice requirements, the FTC Safeguards Rule, information security programs for non-bank financial institutions, or the interaction of GLBA with state privacy laws (particularly CCPA/CPRA exemptions). Also load when analyzing whether a fintech, payment processor, or money transmitter qualifies as a "financial institution" under GLBA.

For general data privacy frameworks (GDPR, CCPA), see the other data-privacy sub-files. For sector-specific financial regulators' privacy-related rules (OCC, CFPB, NY DFS), see `financial-sector-privacy-regulators.md`.

## Key Requirements

### Scope — Who Is a "Financial Institution"

- **Definition (15 U.S.C. 6809(3)):** Any institution the business of which is engaging in activities that are "financial in nature" as defined in Section 4(k) of the Bank Holding Company Act. This is broadly interpreted.
- **Covered entities include:** Banks, thrifts, credit unions, broker-dealers, insurance companies, investment advisers, mortgage lenders/brokers, loan servicers, financial advisors, tax preparers, check cashers, wire transfer services, money transmitters, collection agencies, credit counseling services, and real estate settlement services.
- **Fintechs and payment processors:** Companies that process payments, transmit money, provide lending services, aggregate financial accounts, or issue stored value/prepaid products are generally "financial institutions" under GLBA. The test is functional (what you do), not charter-based (what license you hold).
- **FTC vs. prudential regulator jurisdiction:** The FTC enforces GLBA's Safeguards Rule against non-bank financial institutions. Banks are supervised by OCC/Fed/FDIC. SEC-regulated entities follow Regulation S-P. State insurance commissioners enforce GLBA against insurers.
- **Consequence:** If you are a "financial institution" under GLBA, the Privacy Rule and Safeguards Rule apply regardless of whether you are also subject to state privacy laws. Misclassifying your entity as non-covered is an enforcement risk.

### Financial Privacy Rule (Regulation P / 12 C.F.R. Part 1016)

- **Annual privacy notice:** Financial institutions must provide clear, conspicuous notices describing their privacy policies and practices, including categories of NPI (nonpublic personal information) collected, categories of affiliates and nonaffiliated third parties to whom NPI is disclosed, and the institution's confidentiality and security policies. CFPB's 2014 model privacy notice form provides a safe harbor.
- **Initial notice timing:** Must be provided at the time of establishing a customer relationship (not merely a consumer relationship — the distinction matters). For lending: at consummation. For deposit accounts: at account opening.
- **Annual notice exception (2015 FAST Act amendment):** Institutions that (1) only share NPI under exceptions that don't trigger opt-out rights AND (2) have not changed their privacy practices since the last notice are exempt from the annual notice requirement. Most institutions now qualify for this exception.
- **Opt-out right:** Consumers must be given the right to opt out of sharing NPI with nonaffiliated third parties, with reasonable means to exercise the opt-out (toll-free number, reply form, or website). The opt-out must be available before any disclosure to nonaffiliated third parties.
- **Exceptions to opt-out:** No opt-out required for disclosures to process transactions requested by the consumer, to protect against fraud, for certain securitization purposes, to consumer reporting agencies, to comply with legal requirements, or to service providers under contractual restrictions.
- **Affiliate sharing and marketing:** GLBA permits sharing NPI with affiliates without opt-out (the Fair Credit Reporting Act separately gives consumers the right to opt out of affiliate marketing). Distinction: sharing data with affiliates is GLBA-permitted; affiliates using that data for marketing solicitations triggers FCRA opt-out rights.
- **Nonpublic personal information (NPI):** Personally identifiable financial information provided by a consumer, resulting from a transaction with the financial institution, or otherwise obtained by the financial institution. Includes account numbers, income, SSN, account balances, payment history, and credit/debit card numbers. Does NOT include publicly available information.
- **Consequence:** Privacy Rule violations enforced by CFPB (banks), FTC (non-banks), SEC (broker-dealers), and state insurance commissioners. Civil penalties, consent orders, and restitution.

### FTC Safeguards Rule (16 C.F.R. Part 314) — 2023 Amendments

- **Scope:** Applies to non-bank financial institutions subject to FTC jurisdiction. The 2023 amendments (effective June 9, 2023) transformed this from a principles-based rule into a detailed, prescriptive cybersecurity regulation.
- **Qualified Individual:** Must designate a single "Qualified Individual" responsible for overseeing the information security program. Can be an employee or outsourced, but the institution retains responsibility. Must report in writing to the board or equivalent at least annually.
- **Written information security program:** Must include:
  - Risk assessment that identifies reasonably foreseeable internal and external risks and assesses the sufficiency of existing safeguards — must be written, updated periodically
  - Access controls: implement and periodically review access privileges (least privilege principle)
  - Asset inventory: identify and manage data, personnel, devices, systems, and facilities
  - Encryption: encrypt all customer information in transit and at rest (or, if infeasible, secure it via effective alternative controls approved by the Qualified Individual in writing)
  - Multi-factor authentication (MFA): required for any individual accessing customer information on any information system — MFA or reasonably equivalent or more secure method
  - Application security: procedures for evaluating, assessing, or testing the security of internally developed applications that transmit, access, or store customer information
  - Secure disposal: procedures for secure disposal of customer information no later than 2 years after last use (unless retention required by law or necessary for a legitimate business purpose)
  - Change management: procedures to evaluate and adjust the information security program in response to changes in operations, threat landscape, or technology
  - Monitoring: implement continuous monitoring or annual penetration testing + semi-annual vulnerability assessments
  - Security awareness training: for all personnel, and specialized training for security personnel
  - Service provider oversight: select and retain service providers capable of maintaining appropriate safeguards, require contractual provisions, and periodically assess based on risk
  - Incident response plan: written plan covering goals, internal processes, roles and responsibilities, communications and information sharing, remediation, documentation, and revision
- **Small institution exception:** Institutions maintaining customer information of fewer than 5,000 consumers are exempt from certain requirements: written risk assessment, incident response plan, and annual reporting to the board.
- **Breach notification to the FTC (effective May 13, 2024):** A 2023 amendment to the Safeguards Rule requires covered institutions to report any "notification event" — unauthorized acquisition of unencrypted customer information involving **500 or more consumers** — to the FTC **as soon as possible, and no later than 30 days** after discovery. Reports are submitted through the FTC's online portal and must describe the event, the types of information involved, the number of consumers affected or potentially affected, and the date or date range of the event. The FTC makes these reports publicly available. This federal reporting obligation is separate from, and additional to, state breach notification laws.
- **Annual board reporting:** The Qualified Individual must report in writing at least annually to the board of directors or equivalent governing body, covering the overall status of the information security program, compliance with the Safeguards Rule, material security events, and recommendations for changes.
- **Consequence:** FTC enforcement via Section 5 and the Safeguards Rule. Consent orders, civil penalties, and required third-party auditing. The FTC has been increasingly aggressive in enforcement against non-bank financial institutions.

### GLBA–CCPA/CPRA Interaction

- **The exemption:** CCPA/CPRA exempts "personal information collected, processed, sold, or disclosed pursuant to" GLBA (Cal. Civ. Code § 1798.145(e)). This is the single most important carve-out for fintech companies under CCPA.
- **Entity-level vs. data-level:** The GLBA-CCPA exemption is **data-level**, not entity-level. A financial institution is not exempt from CCPA entirely — only the specific data elements that are subject to GLBA are exempt. Data collected outside the GLBA relationship (e.g., website browsing data, marketing data, data about non-customers) remains subject to CCPA.
- **Practical implications for fintechs:**
  - NPI collected in the course of providing financial services → GLBA-exempt from CCPA
  - Marketing data, device identifiers, IP addresses, cookies, browsing history → NOT exempt, even if collected by a GLBA-covered entity
  - Data about individuals who are "consumers" (one-time transaction) vs. "customers" (ongoing relationship) under GLBA may have different exemption scope
  - Employee data is not GLBA-covered and follows CCPA rules
- **Other state privacy laws:** Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), and most other state privacy laws also exempt GLBA-covered data. However, the precise scope varies:
  - Virginia, Colorado, Connecticut: entity-level exemption — the entire financial institution is exempt if subject to GLBA
  - Texas (TDPSA): data-level exemption, matching CCPA's approach
  - Check each state's specific exemption language
- **Consequence:** A fintech must map its data flows to determine which data is GLBA-subject (and thus state-privacy-exempt) and which is not. Overly broad reliance on the GLBA exemption is an enforcement risk.

### GLBA–GDPR Interaction

- **No exemption:** GDPR does not recognize GLBA or provide any exemption for financial institutions. All GDPR obligations apply fully to the personal data of EU/EEA data subjects, regardless of GLBA status.
- **Conflict areas:**
  - GLBA permits affiliate sharing without opt-out; GDPR requires a lawful basis (typically legitimate interests with a balancing test) for any data sharing
  - GLBA's NPI definition is narrower than GDPR's personal data definition — data that is not NPI under GLBA may still be personal data under GDPR
  - GLBA does not require data minimization; GDPR's data minimization principle (Art. 5(1)(c)) applies regardless
  - GLBA retention requirements may conflict with GDPR's storage limitation principle — document the legal basis for retention
- **Practical approach:** Apply GDPR as the baseline for EU-facing operations and layer GLBA requirements on top for US consumer financial data. Do not assume GLBA compliance satisfies GDPR.

## Interaction with Other Areas

- **Data Privacy (CCPA/CPRA):** GLBA data-level exemption from CCPA. See `ccpa-cpra.md`.
- **Data Privacy (US State Privacy Laws):** GLBA exemption scope varies by state (entity-level vs. data-level). See `us-state-privacy.md`.
- **Data Privacy (GDPR):** No GLBA exemption — full GDPR applies to EU data subjects. See `gdpr.md`.
- **Data Privacy (Breach Notification):** GLBA Safeguards Rule incident response plan is separate from state breach notification obligations. See `breach-notification.md` and `us-breach-notification-50-state.md`.
- **Data Privacy (Financial Sector Regulators):** Banking regulators impose additional privacy-related requirements beyond GLBA. See `financial-sector-privacy-regulators.md`.
- **Financial Services (KYC/AML):** BSA/AML record retention requirements interact with GLBA and create tension with privacy deletion rights. See `law/financial-services/kyc-aml.md`.
- **Cybersecurity:** FTC Safeguards Rule is effectively a cybersecurity regulation for non-bank financial institutions. See `law/cybersecurity/`.

## Sources

- [15 U.S.C. Chapter 94 — Financial Privacy](https://www.law.cornell.edu/uscode/text/15/chapter-94) — GLBA statutory text
- [Regulation P (12 C.F.R. Part 1016)](https://www.law.cornell.edu/cfr/text/12/part-1016) — CFPB Privacy of Consumer Financial Information
- [FTC Safeguards Rule (16 C.F.R. Part 314)](https://www.law.cornell.edu/cfr/text/16/part-314) — Standards for Safeguarding Customer Information
- [FTC Safeguards Rule Compliance Guide](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know) — Plain-language FTC guidance on 2023 amendments
- [Safeguards Rule Breach Notification Amendment — Federal Register](https://www.federalregister.gov/documents/2023/11/13/2023-24412/standards-for-safeguarding-customer-information) — 88 FR 77499; FTC notice within 30 days for events involving 500+ consumers (effective May 13, 2024)
- [CFPB Model Privacy Notice Form](https://www.consumerfinance.gov/policy-compliance/guidance/privacy-guidance/) — Safe harbor privacy notice template
- [SEC Regulation S-P (17 C.F.R. Part 248)](https://www.law.cornell.edu/cfr/text/17/part-248) — Privacy of consumer financial information for SEC-regulated entities
- [CCPA GLBA Exemption — Cal. Civ. Code § 1798.145(e)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.145.&lawCode=CIV) — CCPA financial data exemption

---
