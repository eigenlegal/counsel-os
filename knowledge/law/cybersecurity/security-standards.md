---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, industry-standard]
authorities:
  - cite: "AICPA Trust Services Criteria (2017, revised points of focus 2022)"
    title: "AICPA & CIMA — System and Organization Controls (SOC) Suite of Services"
    url: "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2"
  - cite: "ISO/IEC 27001:2022"
    title: "Information security, cybersecurity and privacy protection — Information security management systems — Requirements"
    url: "https://www.iso.org/standard/27001"
  - cite: "FedRAMP Authorization Act, 44 U.S.C. § 3609"
    title: "FedRAMP program (GSA) — authorization paths and FedRAMP 20x"
    url: "https://www.fedramp.gov/"
  - cite: "HITRUST CSF"
    title: "HITRUST Alliance — HITRUST CSF framework"
    url: "https://hitrustalliance.net/hitrust-csf/"
---
# Security Standards and Certifications

## Applicability

Applies to organizations seeking, maintaining, or contractually required to hold security certifications and audit reports. Covers SOC 2, ISO 27001, FedRAMP, and HITRUST — the primary commercial and government security frameworks used in vendor due diligence, procurement, and regulatory compliance.

## Key Requirements

### SOC 2 (Service Organization Control 2)

- **Scope** / AICPA framework for service organizations; assesses controls relevant to security, availability, processing integrity, confidentiality, and/or privacy (five Trust Services Criteria) / **Consequence**: Widely required in SaaS contracts, vendor assessments, and enterprise procurement; absence = disqualification from many enterprise deals
- **Type I vs. Type II** / Type I: point-in-time assessment of control design at a specific date; Type II: assessment of control design and operating effectiveness over a period (minimum 6 months, typically 12 months) / **Consequence**: Type II is the market standard; Type I accepted only for newly implemented controls or first-year audits
- **Five Trust Services Criteria** / (1) Security (common criteria — required for all SOC 2 reports); (2) Availability (uptime, disaster recovery); (3) Processing Integrity (completeness, accuracy); (4) Confidentiality (data protection); (5) Privacy (PII handling per AICPA privacy criteria) / **Consequence**: Security is mandatory; other criteria selected based on services and customer expectations
- **Report Distribution** / Restricted use report; distributed under NDA to customers and prospects / **Consequence**: Not publicly available; organization controls distribution; misuse of reports = breach of restricted use terms
- **Exceptions and Qualifications** / Auditor may note exceptions (control failures) or issue qualified/adverse opinion / **Threshold**: Material exceptions may result in qualified opinion; pervasive failures = adverse opinion / **Consequence**: Qualified or adverse opinion = customer concern; may be contractual breach; remediation expected before next audit period
- **Complementary User Entity Controls (CUECs)** / Controls the service organization expects the customer to implement / **Consequence**: Customer must implement CUECs for full control environment; failure = gap in security posture

### ISO/IEC 27001

- **Scope** / International standard for Information Security Management Systems (ISMS); published by ISO and IEC / **Consequence**: Globally recognized; required in many international contracts and government procurements
- **Certification Cycle** / 3-year certification cycle: (1) Stage 1 — documentation review; (2) Stage 2 — full audit; (3) Annual surveillance audits in years 2 and 3; (4) Recertification in year 3 / **Timeline**: Initial certification typically 3-6 months preparation + audit / **Consequence**: Lapsed certification = loss of status; must recertify
- **Annex A Controls** / 93 controls in 4 themes (ISO 27001:2022): Organizational (37), People (8), Physical (14), Technological (34) / **Consequence**: Statement of Applicability (SoA) documents which controls apply and justifies exclusions; the 2013-to-2022 transition window closed October 31, 2025, so any certificate still on ISO 27001:2013 is no longer valid
- **Risk-Based Approach** / Must conduct formal risk assessment (ISO 27005 methodology recommended); controls selected based on identified risks / **Consequence**: Prescriptive control implementation without risk assessment = non-conformity
- **Continuous Improvement** / PDCA (Plan-Do-Check-Act) cycle; management review; internal audit required / **Consequence**: Surveillance audit findings must be addressed; failure to demonstrate improvement = non-conformity or certification suspension

### FedRAMP (Federal Risk and Authorization Management Program)

- **Scope** / Mandatory for cloud service providers (CSPs) offering services to federal agencies / **Consequence**: No FedRAMP authorization = cannot sell cloud services to federal government; growing adoption by state/local governments
- **Impact Levels** / (1) Li-SaaS (Low Impact SaaS — self-attestation for low-risk SaaS); (2) Low (categorized per FIPS 199); (3) Moderate (most common — approx. 325 controls from NIST 800-53); (4) High (highest sensitivity — approx. 420 controls) / **Consequence**: Impact level determines control baseline, assessment rigor, and cost
- **Authorization Path** / Single path: Agency Authorization (federal agency sponsors and authorizes; other agencies reuse). The Joint Authorization Board (JAB) path was discontinued in 2024, replaced by the FedRAMP Board under the FedRAMP Authorization Act of 2022 / **Timeline**: Agency path: 6-12 months typical / **Consequence**: Authorization requires 3PAO assessment; continuous monitoring thereafter
- **FedRAMP 20x Modernization (2025-2027)** / GSA's phased overhaul replacing static document review with machine-readable (OSCAL-based) key security indicators and automated validation; pilots for Low and Moderate ran 2025-2026, with consolidated 20x requirements being finalized and broader application intake expected late FY2026 / **Consequence**: The legacy "Rev 5" agency-authorization process sunsets at the end of FY2027 (September 30, 2027); CSPs starting now should evaluate 20x readiness rather than building to the outgoing process
- **3PAO Assessment** / Third-Party Assessment Organization (accredited by A2LA) conducts independent security assessment / **Consequence**: 3PAO must be independent; assessment costs $200K-$1M+ depending on impact level and system complexity
- **Continuous Monitoring** / Monthly vulnerability scanning, annual assessment, ongoing POA&M management, significant change reporting / **Consequence**: Failure to maintain continuous monitoring = authorization revocation; agency must stop using service
- **FedRAMP Authorization Act (2022)** / Codified FedRAMP into law; established FedRAMP Board; presumption of adequacy for authorized CSPs across agencies / **Consequence**: Once authorized, other agencies can reuse authorization with limited additional review

### HITRUST CSF (Health Information Trust Alliance)

- **Scope** / Risk-based framework integrating requirements from HIPAA, NIST, ISO 27001, PCI-DSS, and other standards; predominantly used in healthcare / **Consequence**: Widely accepted by healthcare organizations as comprehensive security assessment; increasingly accepted by non-healthcare as integrated framework
- **Assessment Types** / (1) e1 (Essentials, 1-year) — 44 controls, verified assessment for lower-risk organizations; (2) i1 (Implemented, 1-year) — 182 controls, moderate assurance; (3) r2 (Risk-based, 2-year) — comprehensive, risk-based selection of controls / **Consequence**: r2 is gold standard; e1 and i1 provide stepping stones; some organizations require r2 specifically
- **Certification** / HITRUST reviews validated assessment report and issues certification / **Timeline**: Assessment: 2-4 months; HITRUST QA review: 4-8 weeks; total 4-8 months / **Consequence**: Certification demonstrates comprehensive compliance; valid for 1 year (e1/i1) or 2 years (r2) with interim assessment
- **Inheritance** / Controls can be inherited from cloud/hosting providers with HITRUST certification / **Consequence**: Reduces assessment scope; provider must maintain valid certification
- **Cost** / Assessment and certification costs $50K-$200K+ depending on scope and type / **Consequence**: Significant investment; but can satisfy multiple framework requirements simultaneously

### Contractual Considerations

- **Right to Audit** / Many contracts include customer right-to-audit clauses; SOC 2 or ISO 27001 reports often accepted in lieu of direct audit / **Consequence**: Negotiate report acceptance as alternative to on-site audit to reduce audit fatigue
- **Certification Requirements** / Contracts may require specific certifications; ensure alignment between contractual language and achievable certifications / **Consequence**: Mismatched requirements (e.g., requiring SOC 2 Type II before first audit year complete) = compliance gap
- **Subservice Organizations** / SOC 2 addresses subservice providers through carve-out (excluded from scope) or inclusive (included in scope) method / **Consequence**: Carve-out requires customer to assess subservice provider independently; inclusive provides more comprehensive assurance

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): SOC 2 Privacy criteria, ISO 27701 (privacy extension), HITRUST privacy controls
- **Financial Services** (`financial-services/`): PCI-DSS requirements may intersect; FFIEC expectations for vendor security
- Cross-reference: `nist-frameworks.md` for underlying NIST controls in FedRAMP and CMMC
- Cross-reference: `cmmc.md` for DoD-specific certification requirements

## Sources

- [AICPA & CIMA — SOC Suite of Services](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)
- [AICPA 2017 Trust Services Criteria (revised points of focus 2022)](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [FedRAMP (program site, authorization paths, FedRAMP 20x)](https://www.fedramp.gov/)
- [HITRUST CSF](https://hitrustalliance.net/hitrust-csf/)

---
