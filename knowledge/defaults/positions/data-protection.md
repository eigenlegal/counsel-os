# Data Protection

## Market Standard

**Typical position:** Vendor processes customer personal data only on customer's documented instructions. A Data Processing Agreement (DPA) conforming to GDPR Article 28 requirements is executed. Vendor implements appropriate technical and organizational measures. Sub-processor use requires prior notice and customer right to object. Data breach notification within 72 hours (aligned with GDPR). Data localization commitments where required.

**Acceptable range:** Breach notification between 48-72 hours (without unreasonable delay). Sub-processor lists maintained online with notification of changes 30+ days in advance. Annual SOC 2 Type II or ISO 27001 certification. Data processing limited to the EEA/approved jurisdictions or with appropriate transfer mechanisms (SCCs, adequacy decisions). Customer audit rights (directly or via third-party auditor) at least annually.

**Escalate if:**
- Vendor claims ownership of or broad license to customer personal data
- No DPA is offered or vendor refuses to sign a DPA
- Breach notification exceeds 72 hours or has no defined timeline
- Vendor refuses to disclose sub-processor list
- No data localization commitments and data may be processed in jurisdictions without adequate protections
- Vendor refuses audit rights or independent certification
- No data deletion/return obligations upon termination
- Cross-border transfer mechanisms are absent or inadequate

## Key Considerations

- GDPR, CCPA/CPRA, and emerging US state privacy laws impose specific processor obligations
- Data transfer mechanisms (SCCs, BCRs, adequacy decisions) must be current and valid
- Sub-processor management is a growing regulatory focus — cascading obligations are essential
- Data breach response plans should be tested and documented
- Privacy impact assessments may be required for high-risk processing
- Consider sector-specific requirements (HIPAA for health data, PCI-DSS for payment data, GLBA for financial data)
- AI/ML training on customer data requires explicit authorization and raises significant regulatory concerns

## Related Law

- knowledge/law/areas/data-privacy/overview.md

## Classification Guide

**GREEN:** GDPR-compliant DPA with all Article 28 requirements; breach notification within 72 hours; sub-processor transparency with advance notice; SOC 2 Type II or ISO 27001 certified; data localization commitments; clear data return/deletion; adequate cross-border transfer mechanisms; no use of data for AI/ML training without consent.

**YELLOW:** Breach notification between 72-96 hours; sub-processor list available but no advance notice of changes; SOC 2 Type I only; limited audit rights; data processed outside preferred jurisdictions but with SCCs in place; vague AI/ML usage terms.

**RED:** No DPA offered; breach notification over 96 hours or undefined; vendor claims rights to customer data; no sub-processor disclosure; no security certifications; data processed in jurisdictions without adequate protections or transfer mechanisms; vendor uses customer data for AI/ML training without authorization; no data deletion upon termination.
