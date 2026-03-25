---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
---

## Nist Frameworks

# NIST Cybersecurity Frameworks

## Applicability

Applies to organizations subject to federal cybersecurity requirements, handling Controlled Unclassified Information (CUI), operating federal information systems, or voluntarily adopting NIST frameworks as a security baseline. Covers CSF 2.0, SP 800-171, and SP 800-53.

## Key Requirements

### NIST Cybersecurity Framework (CSF) 2.0

- **Scope** / Voluntary framework applicable to all organizations; widely adopted as industry standard for cybersecurity risk management / **Consequence**: Increasingly referenced in contracts, insurance requirements, and regulatory guidance as baseline expectation
- **Six Core Functions** / (1) Govern — establish cybersecurity risk management strategy, expectations, and policy; (2) Identify — understand organizational context, assets, risks; (3) Protect — implement safeguards to manage risk; (4) Detect — find and analyze cybersecurity events; (5) Respond — take action regarding detected incidents; (6) Recover — restore capabilities and services after incidents / **Consequence**: Framework provides common language for security posture assessment; gaps against CSF used in litigation and regulatory proceedings
- **Implementation Tiers** / Tier 1 (Partial) through Tier 4 (Adaptive); describe rigor of cybersecurity risk management practices / **Consequence**: Tier self-assessment informs risk appetite; contractual partners may require minimum tier
- **Profiles** / Current profile vs. target profile; gap analysis drives remediation roadmap / **Consequence**: Documented gap analysis demonstrates good faith effort; absence of assessment may indicate negligence
- **CSF 2.0 Updates (2024)** / Added Govern function; expanded supply chain risk management; broadened applicability beyond critical infrastructure / **Consequence**: Organizations using CSF 1.1 should update to 2.0; contractual references may need updating

### NIST SP 800-171 — Protecting CUI

- **Scope** / Mandatory for non-federal organizations processing, storing, or transmitting CUI on behalf of federal agencies (primarily DoD contractors under DFARS 252.204-7012) / **Consequence**: Non-compliance = potential loss of federal contracts; False Claims Act liability; debarment
- **110 Security Controls** / Organized in 14 control families: Access Control, Awareness and Training, Audit and Accountability, Configuration Management, Identification and Authentication, Incident Response, Maintenance, Media Protection, Personnel Security, Physical Protection, Risk Assessment, Security Assessment, System and Communications Protection, System and Information Integrity / **Consequence**: All 110 controls must be implemented or documented in Plan of Action and Milestones (POA&M)
- **Self-Assessment** / Contractor self-assessment using NIST SP 800-171A methodology; score submitted to Supplier Performance Risk System (SPRS) / **Threshold**: Maximum score 110; each unimplemented control reduces score by 1-5 points / **Consequence**: Score below contracting officer's threshold = ineligible for award; false score = False Claims Act liability
- **Revision 3 (2024)** / Updated controls aligned with SP 800-53 Rev 5; increased from 110 to 117 controls; enhanced requirements for cloud, mobile, and supply chain / **Consequence**: DoD transition timeline applies; contractors must plan migration

### NIST SP 800-53 — Federal Information Systems

- **Scope** / Mandatory for federal information systems and organizations; basis for FedRAMP and other federal security programs / **Consequence**: Non-compliance = system Authority to Operate (ATO) denied or revoked
- **20 Control Families** / Access Control (AC), Awareness and Training (AT), Audit and Accountability (AU), Assessment/Authorization/Monitoring (CA), Configuration Management (CM), Contingency Planning (CP), Identification and Authentication (IA), Incident Response (IR), Maintenance (MA), Media Protection (MP), Physical and Environmental Protection (PE), Planning (PL), Program Management (PM), Personnel Security (PS), PII Processing and Transparency (PT), Risk Assessment (RA), System and Services Acquisition (SA), System and Communications Protection (SC), System and Information Integrity (SI), Supply Chain Risk Management (SR) / **Consequence**: Control selection based on system categorization (FIPS 199: Low, Moderate, High)
- **Control Baselines** / Low (approx. 130 controls), Moderate (approx. 325 controls), High (approx. 420 controls) / **Consequence**: Baseline selection drives compliance scope and cost
- **Continuous Monitoring** / Ongoing assessment of security controls rather than point-in-time compliance / **Threshold**: NIST SP 800-137 provides monitoring guidance; frequency varies by control / **Consequence**: ATO conditional on continuous monitoring program

### Interaction Between Frameworks

- **CSF to 800-53 Mapping** / NIST provides informative references mapping CSF categories to 800-53 controls / **Consequence**: Organizations can demonstrate CSF alignment through 800-53 implementation
- **800-171 to 800-53 Derivation** / 800-171 controls are derived from moderate baseline of 800-53, tailored for non-federal systems / **Consequence**: Organizations meeting 800-53 Moderate generally meet 800-171
- **Contractual References** / Federal contracts increasingly specify which NIST framework applies; commercial contracts may reference CSF / **Consequence**: Ensure contractual security requirements map to correct framework version

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): NIST Privacy Framework complements CSF; PII controls in 800-53
- **International Trade** (`international-trade/`): CUI handling may intersect with export controls (ITAR/EAR)
- Cross-reference: `cmmc.md` for DoD-specific implementation of 800-171
- Cross-reference: `security-standards.md` for commercial frameworks (SOC 2, ISO 27001)

## Sources

- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
- [NIST SP 800-171 Rev 3](https://csrc.nist.gov/publications/detail/sp/800-171/rev-3/final)
- [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [DFARS 252.204-7012](https://www.acquisition.gov/dfars/252.204-7012)

---
