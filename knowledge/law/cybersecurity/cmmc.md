---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
---

## Cmmc

# Cybersecurity Maturity Model Certification (CMMC)

## Applicability

Applies to contractors and subcontractors in the Defense Industrial Base (DIB) handling Federal Contract Information (FCI) or Controlled Unclassified Information (CUI). CMMC establishes tiered cybersecurity certification requirements as a condition of DoD contract award. Final rule published October 2024; phased implementation begins 2025.

## Key Requirements

### CMMC Levels

- **Level 1 — Foundational** / 15 basic cyber hygiene practices derived from FAR 52.204-21; applies to organizations handling FCI only / **Assessment**: Annual self-assessment by senior official affirmation / **Consequence**: Failure to self-assess and affirm = ineligible for contracts requiring Level 1; false affirmation = False Claims Act liability
- **Level 2 — Advanced** / 110 security practices aligned with NIST SP 800-171 Rev 2; applies to organizations handling CUI / **Assessment**: Triennial third-party assessment by CMMC Third-Party Assessment Organization (C3PAO) for critical programs; self-assessment permitted for select programs / **Consequence**: Failure to achieve Level 2 certification = ineligible for CUI contracts; assessment costs $50K-$300K+ depending on scope
- **Level 3 — Expert** / 110+ practices from NIST SP 800-171 plus additional requirements from NIST SP 800-172 (enhanced security); applies to highest-priority CUI programs / **Assessment**: Government-led assessment by DCMA DIBCAC / **Consequence**: Failure to achieve = ineligible for the most sensitive DoD programs; limited number of contractors expected to require Level 3

### FCI vs. CUI Scope

- **Federal Contract Information (FCI)** / Information not intended for public release, provided by or generated for the government under contract (excluding simple transactions) / **Threshold**: Any non-public information exchanged under a federal contract / **Consequence**: Minimum Level 1 required
- **Controlled Unclassified Information (CUI)** / Information requiring safeguarding or dissemination controls per law, regulation, or government-wide policy (CUI Registry maintained by NARA) / **Threshold**: CUI markings or identification in contract; includes technical data, export-controlled, ITAR, PII, PHI in government context / **Consequence**: Minimum Level 2 required; Level 3 for critical programs designated by DoD

### Assessment Process

- **Self-Assessment (Level 1 and select Level 2)** / Organization conducts internal assessment; senior official provides annual affirmation of compliance in Supplier Performance Risk System (SPRS) / **Consequence**: False or misleading affirmation = potential False Claims Act liability ($13K-$27K per false claim, plus treble damages)
- **Third-Party Assessment (Level 2)** / C3PAO conducts assessment; must be accredited by Cyber AB (formerly CMMC Accreditation Body) / **Timeline**: Assessment typically 1-2 weeks on-site; results valid for 3 years / **Consequence**: Conditional certification possible with POA&M for limited deficiencies (must close within 180 days)
- **Government Assessment (Level 3)** / DCMA Defense Industrial Base Cybersecurity Assessment Center (DIBCAC) conducts assessment / **Timeline**: Government scheduling; potentially lengthy wait / **Consequence**: No conditional status; must fully meet all requirements

### Plan of Action and Milestones (POA&M)

- **Eligibility** / Limited POA&Ms permitted for Level 2 and Level 3; not permitted for Level 1 / **Threshold**: No more than 20% of assessed controls may be on POA&M; certain critical controls cannot be on POA&M (access control, incident response, risk assessment) / **Consequence**: Exceeding POA&M limits = assessment failure
- **Closure Timeline** / POA&M items must be closed within 180 days of conditional certification / **Consequence**: Failure to close = loss of certification; contract eligibility revoked

### Subcontractor Flowdown

- **Requirement** / Prime contractors must flow down CMMC requirements to subcontractors based on the type of information shared / **Threshold**: Subcontractors handling CUI = Level 2 minimum; subcontractors handling FCI only = Level 1 / **Consequence**: Prime responsible for ensuring subcontractor compliance; non-compliant subcontractors = contract performance risk
- **Scope Limitation** / Subcontractor level need not exceed what is required for the information they handle / **Consequence**: Can limit CUI flow to reduce subcontractor certification burden

### Phased Rollout

- **Phase 1 (2025)** / Level 1 self-assessment and Level 2 self-assessment required in applicable solicitations / **Consequence**: Contractors must have SPRS scores posted
- **Phase 2 (2026)** / Level 2 C3PAO certification required for applicable contracts / **Consequence**: Third-party certification becomes mandatory for CUI contracts in critical programs
- **Phase 3 (2027)** / Level 3 government assessment for applicable contracts / **Consequence**: Full implementation of all three levels
- **Phase 4 (2028)** / CMMC required in all applicable DoD contracts; option period exercises included / **Consequence**: No DoD contract with CUI/FCI without CMMC certification

### Cost and Preparation

- **Level 1** / Minimal cost; primarily documentation and self-assessment effort / **Consequence**: Small businesses can typically achieve with internal resources
- **Level 2 Preparation** / Typically 12-18 months to achieve compliance from scratch; costs include technology upgrades, managed security services, documentation, assessment fees / **Threshold**: Assessment fees $50K-$300K+; implementation costs $100K-$1M+ depending on organization size and current posture / **Consequence**: Organizations should begin preparation well before contract deadlines
- **Enclave Strategy** / Organizations may limit CUI handling to a defined enclave to reduce assessment scope / **Consequence**: Reduces cost but requires strict boundary controls and data handling procedures

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): CUI may include PII; privacy controls overlap
- **International Trade** (`international-trade/`): CUI often includes export-controlled technical data (ITAR/EAR)
- Cross-reference: `nist-frameworks.md` for underlying NIST SP 800-171 and 800-53 requirements
- Cross-reference: `security-standards.md` for complementary certifications (FedRAMP, SOC 2)

## Sources

- [CMMC Final Rule (48 CFR Part 204)](https://www.federalregister.gov/documents/2024/10/15/2024-22905/cybersecurity-maturity-model-certification-cmmc-program)
- [NIST SP 800-171 Rev 2](https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final)
- [Cyber AB (CMMC Accreditation Body)](https://cyberab.org/)
- [DoD CIO CMMC Website](https://dodcio.defense.gov/CMMC/)

---
