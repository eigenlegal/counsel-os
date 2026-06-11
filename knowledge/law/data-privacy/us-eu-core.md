---
counsel-os-type: law-area
content-version: "2026-06-11"
jurisdiction: [us-federal, us-state, eu]
last-reviewed: "2026-05-07"
authorities:
  - cite: "Regulation (EU) 2016/679"
    title: "General Data Protection Regulation"
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679"
  - cite: "EDPB Guidelines 07/2020"
    title: "Guidelines on the concepts of controller and processor in the GDPR"
    url: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en"
  - cite: "European Commission SCC publications"
    title: "Standard Contractual Clauses for international transfers and controller-processor relationships"
    url: "https://commission.europa.eu/publications/standard-contractual-clauses-international-transfers_en"
  - cite: "EDPB Recommendations 01/2020"
    title: "Supplementary measures for international transfers"
    url: "https://www.edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en"
  - cite: "California Civil Code Title 1.81.5"
    title: "California Consumer Privacy Act of 2018"
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?article=&chapter=&division=3.&lawCode=CIV&part=4.&title=1.81.5."
  - cite: "California Privacy Protection Agency"
    title: "CCPA laws and regulations"
    url: "https://cppa.ca.gov/regulations/"
  - cite: "FTC COPPA Rule"
    title: "Children's Online Privacy Protection Rule"
    url: "https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa"
  - cite: "FTC Safeguards Rule"
    title: "Standards for Safeguarding Customer Information"
    url: "https://www.ftc.gov/legal-library/browse/rules/safeguards-rule"
  - cite: "Code of Virginia Chapter 53"
    title: "Virginia Consumer Data Protection Act"
    url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/"
  - cite: "Colorado Attorney General"
    title: "Universal Opt-Out and the Colorado Privacy Act"
    url: "https://coag.gov/opt-out/"
  - cite: "Texas Department of Information Resources"
    title: "Texas Data Privacy and Security Act"
    url: "https://dir.texas.gov/technology-legislation/texas-data-privacy-and-security-act"
---
# US/EU Data Privacy Core Source Map

## Source-First Rule

Use this file as the first stop for US and EU/GDPR privacy questions. It intentionally avoids restating every statutory requirement. Treat the bullets below as routing and legal-floor prompts, then open the linked authority before making a current-law conclusion.

If a linked source has changed, is unavailable, or the matter depends on a precise threshold, date, exception, definition, or regulator position, mark the answer `SOURCE CHECK NEEDED` and verify the current authority before relying on the prose in any data privacy sub-file.

## When to Load

Load this file when a matter involves:

- EU/EEA data subjects, an EU/EEA establishment, GDPR, SCCs, DPAs, EU-US transfers, or EU privacy rights.
- California residents, CCPA/CPRA, sale or sharing, sensitive personal information, service provider or contractor restrictions, ADMT, cybersecurity audits, risk assessments, or data broker obligations.
- US consumer privacy obligations outside California, including state privacy laws, universal opt-out mechanisms, sensitive data consent, processor contracts, or data protection assessments.
- US federal sectoral privacy issues that commonly appear with commercial privacy work, including COPPA and GLBA Safeguards Rule issues.

## Authority Map

| Issue | Start With | Then Load |
|-------|------------|-----------|
| GDPR scope, definitions, principles, lawful basis, special categories | GDPR Articles 3-6 and 9 | `gdpr.md`, `consent-mechanics.md` |
| GDPR controller, processor, joint controller roles | GDPR Articles 4, 26, 28; EDPB Guidelines 07/2020 | `gdpr.md`, `data-processing-agreements.md` |
| GDPR transparency and data subject rights | GDPR Articles 12-22 | `data-subject-rights.md` |
| GDPR security, breach, DPIA, prior consultation | GDPR Articles 32-36 | `breach-notification.md`, `gdpr.md` |
| GDPR international transfers | GDPR Articles 44-49; SCCs; EDPB Recommendations 01/2020 | `cross-border-transfers.md` |
| EU-US transfers | European Commission DPF adequacy materials; DPF participant list; SCCs if recipient is not DPF-covered | `cross-border-transfers.md` |
| CCPA/CPRA scope and duties | Cal. Civ. Code Title 1.81.5; CPPA regulations page | `ccpa-cpra.md` |
| CCPA notice, minimization, rights, sale/sharing, sensitive PI | Cal. Civ. Code Sections 1798.100, 1798.105, 1798.106, 1798.110, 1798.115, 1798.120, 1798.121, 1798.130, 1798.135 | `ccpa-cpra.md`, `data-subject-rights.md` |
| CCPA vendor, contractor, third-party data transfers | Cal. Civ. Code Sections 1798.100(d), 1798.140; CPPA regulations | `data-processing-agreements.md`, `ccpa-cpra.md` |
| CCPA enforcement, private right of action, rulemaking | Cal. Civ. Code Sections 1798.150, 1798.185, 1798.199; CPPA rulemaking pages | `ccpa-cpra.md`, `breach-notification.md` |
| Children under 13 in online services | FTC COPPA Act and Rule | `coppa.md` |
| Financial institution safeguards | FTC Safeguards Rule; GLBA sources | `glba-privacy.md`, `financial-sector-privacy-regulators.md` |
| US state comprehensive privacy laws | Official state code or regulator page for each state | `us-state-privacy.md` |
| US state breach notification | Official state breach statute for each affected state | `us-breach-notification-50-state.md`, `breach-notification.md` |

## Legal Floors

### GDPR

- Do not analyze EU personal data processing without identifying the GDPR territorial hook, controller/processor role, processing purpose, data categories, lawful basis, and any special-category basis.
- A processor relationship needs Article 28-compliant processing terms. Use the EDPB controller/processor guidance when role allocation is disputed.
- A controller must be able to satisfy transparency and data subject rights obligations; timing, exceptions, and identity verification issues should be checked against the current article text and regulator guidance.
- Personal data breaches require a GDPR risk analysis. Supervisory-authority notice is tied to the Article 33 standard and timing; data subject notice is tied to the Article 34 high-risk standard.
- EU/EEA-to-third-country transfers need a Chapter V mechanism. Adequacy can apply only within its scope; SCC-based transfers require the correct SCCs and a transfer-risk/supplementary-measures analysis where needed.

### California

- Start from the current CCPA statute and CPPA regulations, not older summaries. As of this source pass, the CPPA regulations page lists CCPA statute and regulation materials effective January 1, 2026.
- At collection, confirm notice content, purpose limits, retention disclosures or criteria, and the data minimization/proportionality rule.
- For vendors, contractors, service providers, and third parties, verify that the written contract contains the current statutory and regulatory restrictions before treating the disclosure as outside sale/sharing.
- For sale, sharing, sensitive personal information, minors' data, ADMT, cybersecurity audit, risk assessment, and data broker issues, use the statute and the CPPA rulemaking package before relying on summarized thresholds.
- For breach-related exposure, load both CCPA private right of action analysis and state breach-notification law.

### Other US States

- Do not rely on a static state-law matrix for current advice. Use the matrix in `us-state-privacy.md` only as a triage checklist, then open the official state source.
- State laws commonly vary on scope thresholds, nonprofit coverage, employee-data treatment, sensitive-data consent, universal opt-out mechanisms, profiling rights, data protection assessments, cure periods, and enforcement authority.
- Colorado-specific UOOM/GPC obligations should be checked against the Colorado Attorney General's UOOM page before advising on opt-out signal handling.
- Texas applicability should be checked against the Texas Data Privacy and Security Act source before assuming a revenue threshold applies.

## Routing

- EU/EEA personal data or GDPR mention: load `gdpr.md`.
- California resident data, sale/sharing, sensitive PI, CCPA, CPRA, CPPA, ADMT, risk assessments, cybersecurity audits, or data brokers: load `ccpa-cpra.md`.
- Other US comprehensive privacy laws: load `us-state-privacy.md` and the official state source.
- Vendor, processor, service provider, contractor, sub-processor, or audit terms: load `data-processing-agreements.md`.
- International transfer, SCCs, adequacy, DPF, TIA, BCRs, or data localization: load `cross-border-transfers.md`.
- Access, deletion, correction, opt-out, portability, objection, or appeal requests: load `data-subject-rights.md`.
- Breach, incident, security event, notification, or regulator notice: load `breach-notification.md` and, for US matters, `us-breach-notification-50-state.md`.
- Children under 13 or child-directed online service: load `coppa.md`.

## Maintenance Notes

- Prefer primary law and regulator pages over tracker sites. Trackers can be used to find a source, but the law file should cite the official source.
- Add `last-reviewed` and `authorities` to a detailed sub-file only after that specific file has been checked against the linked sources.
- Avoid hard-coding long state-by-state tables unless the table has a review owner, review date, and cited official sources for each row.
