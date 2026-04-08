---
counsel-os-type: law-area
content-version: "2026-04-08"
---
## Hipaa Compliance

# HIPAA Compliance

## Applicability

Applies to covered entities (health plans, healthcare clearinghouses, healthcare providers who transmit health information electronically) and their business associates. The Health Insurance Portability and Accountability Act (HIPAA), as amended by HITECH, establishes national standards for protecting individually identifiable health information.

## Key Requirements

### Protected Health Information (PHI) Definition

- **What**: Individually identifiable health information transmitted or maintained in any form (electronic, paper, oral) that relates to past, present, or future health condition, provision of healthcare, or payment for healthcare
- **Threshold/Timeline**: PHI includes 18 identifiers: names, dates (except year), phone/fax numbers, email addresses, SSN, medical record numbers, health plan beneficiary numbers, account numbers, certificate/license numbers, vehicle identifiers, device identifiers, URLs, IP addresses, biometric identifiers, full-face photographs, and any other unique identifying number
- **Consequence**: Unauthorized use or disclosure of PHI triggers breach notification obligations and potential civil/criminal penalties; de-identified data (Safe Harbor method removing all 18 identifiers or Expert Determination method) is not PHI

### Privacy Rule (45 CFR Part 164 Subpart E)

- **What**: Establishes standards for use and disclosure of PHI; requires minimum necessary standard (limit PHI access to what is needed for the purpose); patient rights to access, amend, and receive accounting of disclosures
- **Threshold/Timeline**: Covered entities must provide Notice of Privacy Practices at first encounter; patient access to records within 30 days of request (one 30-day extension); individual right to request restrictions on disclosures; required disclosures limited to individual access requests and HHS investigations
- **Consequence**: Privacy Rule violations enforced by OCR; patients may file complaints within 180 days of knowledge of violation; no private right of action under HIPAA directly, but state attorneys general may bring actions and state laws may provide additional remedies

### Security Rule (45 CFR Part 164 Subpart C)

- **What**: Requires administrative, physical, and technical safeguards to protect electronic PHI (ePHI)
- **Threshold/Timeline**: Administrative safeguards — risk analysis (required, not addressable), workforce training, security officer designation, access management; Physical safeguards — facility access controls, workstation security, device/media disposal; Technical safeguards — access controls, audit controls, integrity controls, transmission security (encryption addressable but effectively required)
- **Consequence**: Security Rule violations are independently enforceable; failure to conduct risk analysis is the most frequently cited violation in OCR enforcement actions; "addressable" specifications require implementation or documented alternative — they are not optional

### Breach Notification Rule (45 CFR Part 164 Subpart D)

- **What**: Requires notification following discovery of a breach of unsecured PHI (PHI not rendered unusable through encryption or destruction)
- **Threshold/Timeline**: Individual notification within 60 days of discovery; notification to HHS within 60 days for breaches affecting 500+ individuals (simultaneously with individual notice) or within 60 days of end of calendar year for breaches affecting fewer than 500; notification to prominent media outlet in the state for breaches affecting 500+ residents; breach "discovered" when known or should have been known through reasonable diligence
- **Consequence**: Failure to provide timely breach notification is a separate HIPAA violation; HHS maintains public breach portal ("Wall of Shame") for breaches affecting 500+; presumption that impermissible acquisition, access, use, or disclosure is a breach unless low probability of compromise demonstrated through 4-factor risk assessment

### Business Associate Agreements (BAA)

- **What**: Written contract required before covered entity shares PHI with business associate; must include specific provisions mandated by HITECH Section 13401
- **Threshold/Timeline**: BAA must specify permitted uses/disclosures, require safeguards, require breach reporting, require return/destruction of PHI at termination, and mandate subcontractor BAAs; business associates directly liable for HIPAA compliance since HITECH (2009)
- **Consequence**: Sharing PHI without a BAA is itself a HIPAA violation; covered entity liable for business associate violations if it knew of violation pattern and failed to act; BAA does not create agency relationship; downstream subcontractors require their own BAAs

### OCR Enforcement and Penalties

- **What**: HHS Office for Civil Rights (OCR) enforces HIPAA through complaint investigations, compliance reviews, and resolution agreements
- **Threshold/Timeline**: Four penalty tiers based on culpability:
  - Tier 1 (did not know/could not have known): $100-$50,000 per violation
  - Tier 2 (reasonable cause, not willful neglect): $1,000-$50,000 per violation
  - Tier 3 (willful neglect, corrected within 30 days): $10,000-$50,000 per violation
  - Tier 4 (willful neglect, not corrected): $50,000 per violation
  - Annual cap: $1.5M per identical provision violated per year (adjusted for inflation, currently approximately $2.07M)
- **Consequence**: Criminal penalties enforced by DOJ: $50K/1 year (knowing), $100K/5 years (false pretenses), $250K/10 years (intent to sell/use for commercial advantage or malicious harm); state attorneys general may bring civil actions under HITECH Section 13410(e) seeking damages on behalf of residents

### HITECH Act Enhancements

- **What**: Health Information Technology for Economic and Clinical Health Act (2009) strengthened HIPAA enforcement, extended direct liability to business associates, and established breach notification requirements
- **Threshold/Timeline**: Business associates directly subject to Security Rule and certain Privacy Rule provisions; increased penalty amounts; state AG enforcement authority; mandatory penalties for willful neglect; voluntary compliance programs and corrective action plans encouraged
- **Consequence**: HITECH's "wall of shame" public breach reporting requirement significantly increased reputational risk; recognized security practices (RSP) provision under 2021 HIPAA Safe Harbor Act requires HHS to consider entity's adoption of recognized security frameworks (NIST, HITRUST) as mitigating factor

### Patient Right of Access

- **What**: Individuals have the right to access and obtain copies of their PHI maintained in designated record sets
- **Threshold/Timeline**: Response within 30 days (one 30-day extension with written explanation); fees limited to reasonable cost-based amounts for labor, supplies, and postage; electronic format if maintained electronically; OCR Right of Access Initiative launched 2019 with active enforcement
- **Consequence**: OCR has settled 45+ cases under Right of Access Initiative with penalties ranging from $3,500 to $240,000; failure to provide timely access is a standalone violation regardless of other compliance posture

## Interaction with Other Areas

- **data-privacy/**: HIPAA preempts less protective state laws but preserves more stringent state privacy protections; HIPAA does not preempt GDPR for EU data subjects; California CMIA provides additional protections for medical information
- **consumer-protection/**: FTC Health Breach Notification Rule applies to non-HIPAA-covered entities handling health information (health apps, wearables)
- **employment/**: HIPAA Privacy Rule limits employer access to employee health information obtained through group health plan; ADA and GINA impose additional restrictions on health-related employee information

## Sources

- [HIPAA Administrative Simplification (45 CFR Parts 160, 162, 164)](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164)
- [HHS OCR HIPAA Enforcement](https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/index.html)
- [HHS Breach Portal](https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf)

---
