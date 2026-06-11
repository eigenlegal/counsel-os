---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state]
authorities:
  - cite: "42 U.S.C. 1320a-7b"
    title: "Anti-Kickback Statute"
    url: "https://www.law.cornell.edu/uscode/text/42/1320a-7b"
  - cite: "42 U.S.C. 1395nn"
    title: "Stark Law (physician self-referral)"
    url: "https://www.law.cornell.edu/uscode/text/42/1395nn"
  - cite: "45 CFR Parts 160, 162, 164"
    title: "HIPAA Administrative Simplification rules"
    url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C"
  - cite: "21 U.S.C. 301 et seq."
    title: "Federal Food, Drug, and Cosmetic Act"
    url: "https://www.law.cornell.edu/uscode/text/21/chapter-9"
  - cite: "21 U.S.C. 829(e)"
    title: "Ryan Haight Act telemedicine prescribing requirements"
    url: "https://www.law.cornell.edu/uscode/text/21/829"
  - cite: "CMS No Surprises Act implementation"
    title: "No Surprises Act rules and guidance"
    url: "https://www.cms.gov/nosurprises"
---
# Healthcare Law

## Trigger Conditions

Load this area when the matter involves ANY of:
- HIPAA, PHI (protected health information), BAA (business associate agreement)
- Healthcare providers, hospitals, health systems, clinics
- Medical devices, pharmaceuticals, biologics, FDA regulation
- Patient data, medical records, health information exchange
- Stark Law, self-referral, designated health services
- Anti-kickback, remuneration, referral arrangements
- Provider agreements, managed care, credentialing
- Telehealth, telemedicine, remote patient monitoring
- Clinical trials, IRB, informed consent

## Sub-File Triggers

| File | Load When |
|------|-----------|
| `hipaa-compliance.md` | PHI, BAA, breach notification, HITECH, OCR enforcement, privacy/security |
| `stark-law.md` | Physician self-referral, designated health services, in-office ancillary, FMV |
| `anti-kickback.md` | Referral arrangements, remuneration, safe harbors, OIG advisory opinions |
| `provider-agreements.md` | Managed care, capitation, credentialing, network participation, balance billing |
| `fda-regulation.md` | Medical devices, drugs, biologics, 510(k), PMA, clinical trials, labeling |
| `telehealth.md` | Telemedicine, remote monitoring, interstate licensure, prescribing, reimbursement |

## Interaction with Other Areas

- **data-privacy/**: HIPAA is the healthcare-specific privacy framework; overlaps with state privacy laws and GDPR for international health data
- **consumer-protection/**: Healthcare marketing subject to FTC Act; surprise billing protections under No Surprises Act
- **employment/**: Healthcare worker licensing, non-compete restrictions, OSHA bloodborne pathogen standards
- **corporate/**: Healthcare entity formation, corporate practice of medicine doctrine, nonprofit compliance

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- The Anti-Kickback Statute is a criminal statute; under the one purpose test, if even one purpose of remuneration is to induce or reward federal healthcare program referrals, the statute is violated — no contract term, FMV opinion, or business justification overrides this (42 U.S.C. 1320a-7b(b)).
- AKS safe harbors and Stark exceptions require strict compliance with every element; partial compliance provides no protection.
- The Stark Law is strict liability — a prohibited referral for designated health services violates the statute regardless of intent, and claims arising from it are not payable (42 U.S.C. 1395nn).
- A claim resulting from an AKS violation is automatically a false claim under the False Claims Act (ACA Section 6402(f)), exposing the arrangement to treble damages and per-claim penalties.
- Identified Medicare/Medicaid overpayments must be reported and returned within 60 days; retention beyond that creates False Claims Act liability (42 U.S.C. 1320a-7k(d)).
- PHI may not be shared with a vendor performing functions on a covered entity's behalf without a business associate agreement; the disclosure itself is a HIPAA violation (45 CFR 164.502(e)).
- Breach notification deadlines under the HIPAA Breach Notification Rule (60 days to individuals) are regulatory floors that cannot be extended by contract.
- Prescribing controlled substances via telemedicine without a prior in-person evaluation is a federal felony unless a statutory exception or current DEA telemedicine flexibility applies (21 U.S.C. 829(e)).
- Providers must hold a license in the state where the patient is located at the time of a telehealth encounter; unauthorized practice is a state criminal matter that no private agreement cures.
- Marketing a drug or device without required FDA approval or clearance is a prohibited act under FDCA Section 301; labeling and promotion must not be false or misleading.
- Balance billing patients for emergency services and certain out-of-network services at in-network facilities is prohibited under the No Surprises Act absent compliant notice and consent.

---
