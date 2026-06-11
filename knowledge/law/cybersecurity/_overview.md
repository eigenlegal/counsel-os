---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, industry-standard]
authorities:
  - cite: "17 CFR 229.106; Form 8-K Item 1.05"
    title: "SEC cybersecurity disclosure rules (Release No. 33-11216)"
    url: "https://www.law.cornell.edu/cfr/text/17/229.106"
  - cite: "DFARS 252.204-7012"
    title: "Safeguarding Covered Defense Information and Cyber Incident Reporting"
    url: "https://www.acquisition.gov/dfars/252.204-7012"
  - cite: "FR Doc. 2025-17359 (Sept. 10, 2025)"
    title: "DFARS final rule implementing CMMC contract requirements (DFARS Case 2019-D041)"
    url: "https://www.federalregister.gov/documents/2025/09/10/2025-17359/defense-federal-acquisition-regulation-supplement-assessing-contractor-implementation-of"
  - cite: "6 U.S.C. §§ 681-681g (CIRCIA)"
    title: "Cyber Incident Reporting for Critical Infrastructure Act of 2022 — CISA rulemaking page"
    url: "https://www.cisa.gov/topics/cyber-threats-and-advisories/information-sharing/cyber-incident-reporting-critical-infrastructure-act-2022-circia"
  - cite: "NIST CSF 2.0"
    title: "NIST Cybersecurity Framework 2.0"
    url: "https://www.nist.gov/cyberframework"
---
# Cybersecurity Law

## Trigger Conditions

Load this area when the matter involves:
- **Keywords**: cybersecurity, security breach, incident response, NIST, SOC 2, ISO 27001, CMMC, FedRAMP, penetration test, vulnerability
- **Document types**: security assessments, incident response plans, vendor security questionnaires, compliance certifications, cyber insurance policies, breach notification letters
- **Scenarios**: security incident response, compliance framework selection, vendor security diligence, government contractor security, SEC cyber disclosure, security certification requirements

## Sub-Topic Triggers

| Sub-Topic File | Load When |
|---|---|
| `nist-frameworks.md` | NIST CSF, 800-171, 800-53, federal security requirements, CUI |
| `sec-cyber-disclosure.md` | Public company cybersecurity, Form 8-K incident, 10-K risk management, board oversight |
| `cmmc.md` | DoD contracts, CMMC certification, FCI, CUI, defense industrial base |
| `state-breach-laws.md` | Data breach, state notification requirements, AG notification, personal information |
| `incident-response.md` | Security incident, breach response, forensic investigation, evidence preservation |
| `security-standards.md` | SOC 2, ISO 27001, FedRAMP, HITRUST, security certifications, audit |

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): breach notification, personal data protection, GDPR/CCPA intersection
- **Securities** (`securities/`): SEC cyber disclosure rules for public companies
- **Insurance** (`insurance/`): cyber insurance coverage, notification requirements
- **International Trade** (`international-trade/`): export controls on encryption and security technologies

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- Public companies must disclose material cybersecurity incidents on Form 8-K Item 1.05 within 4 business days of determining the incident is material; only a US Attorney General national-security/public-safety determination can delay filing. The rule remains in force as of June 2026 despite a pending industry petition to rescind Item 1.05.
- State breach notification duties attach by operation of law in every US state, DC, and the inhabited territories; they cannot be waived or shortened by contract, and the deadlines run from discovery of the breach.
- DFARS 252.204-7012 requires covered defense contractors to implement NIST SP 800-171 (Rev 2, per the May 2024 DoD class deviation) and to report cyber incidents to DoD within 72 hours of discovery; CMMC certification at the contract-specified level is a condition of DoD contract award under the phased rollout that began November 10, 2025.
- False or unsupportable cybersecurity attestations to the government (SPRS scores, CMMC affirmations, FedRAMP submissions) create False Claims Act exposure — $14,308–$28,619 per claim plus treble damages — actively pursued under DOJ's Civil Cyber-Fraud Initiative.
- Paying ransomware to a sanctioned person or embargoed jurisdiction is a strict-liability OFAC violation; sanctions screening before any payment is mandatory, and neither contract nor insurance excuses it.
- Once litigation or a government investigation is reasonably anticipated, evidence preservation duties attach; spoliation risks adverse-inference sanctions. Privilege over forensic investigation work survives only where counsel genuinely directs the work for a legal purpose.
- Parallel notification regimes (state AG, SEC, GDPR 72-hour, HIPAA, NYDFS 72-hour, contractual) run independently — satisfying one never satisfies another.
- CIRCIA's 72-hour covered-incident / 24-hour ransom-payment reporting is enacted but not yet operative: obligations attach only when CISA's final rule takes effect, and that rule was still pending as of June 2026.

---
