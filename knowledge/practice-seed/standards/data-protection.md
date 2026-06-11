---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Data Protection — Position

## Our Position
**Our standard:** GDPR-compliant DPA with all Article 28 requirements. Breach notification within 72 hours. Sub-processor list with 30+ days advance notice and right to object with termination right. Data return in portable format within 30 days; deletion from production within 30 days and from backups within 90 days, with certification. No AI/ML training on customer data.
**We'll accept:** Breach notification between 72-96 hours, 14-day sub-processor notice period, SOC 2 Type I only, data processed outside EEA with SCCs, or data return within 60 days, provided a DPA exists and basic sub-processor controls are in place.
**We won't accept:** No DPA offered, breach notification over 96 hours or undefined, vendor claiming rights to customer personal data, no sub-processor disclosure, data processed without adequate transfer mechanisms, or vendor using customer data for AI/ML training without authorization.
**Auto-escalate:** Vendor claims ownership of customer personal data; no DPA offered; breach notification exceeds 72 hours with no defined timeline; no sub-processor disclosure; no data localization commitments; no audit rights; no data deletion/return on termination; inadequate cross-border transfer mechanisms.

## Market Standard
Vendor processes customer personal data only on customer's documented instructions. A Data Processing Agreement (DPA) conforming to GDPR Article 28 requirements is executed. Vendor implements appropriate technical and organizational measures. Sub-processor use requires prior notice (30+ days) with customer right to object. Breach notification within 72 hours (aligned with GDPR Article 33). Data localization within EEA or approved jurisdictions with valid transfer mechanisms.

## Classification Guide
- **GREEN**: GDPR-compliant DPA with all Article 28 requirements; breach notification within 72 hours of discovery with detailed incident report within 5 days; sub-processor list published with 30+ days advance notice of changes and right to object and terminate; SOC 2 Type II or ISO 27001 certified; data processing within EEA or with SCCs and supplementary measures; data return in portable format within 30 days of termination; deletion from production within 30 days and from backups within 90 days, with certification; no AI/ML training on customer data.
- **YELLOW**: Breach notification between 72-96 hours; sub-processor list available but only 14 days advance notice of changes; SOC 2 Type I only; limited audit rights (once per year, third-party only); data processed outside EEA but with SCCs; vague AI/ML usage terms; data return within 60 days; no portable format requirement.
- **RED**: No DPA offered; breach notification over 96 hours or undefined; vendor claims rights to customer personal data; no sub-processor disclosure; no security certifications; data processed in jurisdictions without adequate protections or transfer mechanisms; vendor uses customer data for AI/ML training without explicit authorization; no data deletion upon termination; vendor retains data indefinitely.

## Escalate If
- Vendor claims ownership of or broad license to customer personal data.
- No DPA is offered or vendor refuses to sign a DPA.
- Breach notification exceeds 72 hours or has no defined timeline.
- Vendor refuses to disclose sub-processor list or changes.
- No data localization commitments and data may be processed in jurisdictions without adequate protections.
- Vendor refuses audit rights or independent certification.
- No data deletion/return obligations upon termination.
- Cross-border transfer mechanisms are absent or inadequate post-Schrems II.

## Practical Guidance
- GDPR, CCPA/CPRA, and emerging US state privacy laws impose specific processor obligations. A DPA is now table stakes, not a negotiation point.
- Post-Schrems II, SCCs alone may be insufficient. Require a Transfer Impact Assessment and supplementary technical measures (encryption, pseudonymization) for transfers to the US or other non-adequate jurisdictions.
- Sub-processor management is a growing regulatory focus. The right to object to new sub-processors is meaningless without a termination right if the objection is overruled.
- Breach notification timing starts "upon discovery" — watch for language that says "upon confirmation" or "upon completion of investigation," which delays the clock.
- AI/ML training on customer data is a rapidly evolving risk area. Any use of customer data for model training should require explicit opt-in, not just absence of opt-out.
- Data return format matters. Require a structured, commonly used, machine-readable format (CSV, JSON, API export), not proprietary formats that create lock-in.

## Key Negotiation Points
1. **Breach notification** — 72 hours from discovery is the standard; resist "without undue delay" without a defined outer limit.
2. **Sub-processor controls** — 30 days advance notice, right to object, right to terminate if objection is not accommodated.
3. **Audit rights** — at least annually; third-party audit reports (SOC 2 Type II) satisfy between on-site audits; on-site audit right preserved for cause.
4. **Data return/deletion** — return within 30 days in portable format; deletion from production within 30 days and from backups within 90 days, with written certification.
5. **Transfer mechanisms** — SCCs plus supplementary measures; Transfer Impact Assessment available on request.

## Common Traps
- **"Vendor will notify customer of a breach without undue delay"** — no defined timeline means potentially weeks of delay. Pin it to 72 hours.
- **"Sub-processors listed at [URL]"** — vendor can change sub-processors by updating a webpage. Require affirmative notice, not just URL monitoring.
- **"Customer may audit once per year upon 30 days notice at customer's expense"** — sounds reasonable, but combined with "during normal business hours" and "not to interfere with operations," it can be made practically impossible.
- **"Data will be deleted in accordance with vendor's standard retention policy"** — vendor's policy may retain data for years. Require deletion within a specific period (30 days from production, 90 days from backups) with certification.
- **"Vendor may use aggregated and anonymized data"** — if the anonymization is reversible or the aggregation is insufficient, this creates a backdoor to use personal data without restriction.
