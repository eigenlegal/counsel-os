## Overview

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

---
## Anti Kickback

# Anti-Kickback Statute (AKS)

## Applicability

Applies to any arrangement involving remuneration (direct or indirect, cash or in-kind) intended to induce or reward referrals of items or services payable by federal healthcare programs (Medicare, Medicaid, TRICARE, CHIP, VA). The Anti-Kickback Statute (42 U.S.C. 1320a-7b(b)) is a criminal statute with both criminal and civil enforcement mechanisms.

## Key Requirements

### Prohibition on Kickbacks

- **What**: Prohibits knowingly and willfully offering, paying, soliciting, or receiving anything of value to induce or reward referrals for items or services reimbursable by federal healthcare programs
- **Threshold/Timeline**: Applies to both sides of the transaction (offeror and recipient); covers referrals, purchases, leases, orders, recommendations, and arrangements for any item or service; no minimum dollar threshold — even nominal remuneration can violate AKS
- **Consequence**: Criminal penalties up to $100,000 per violation and 10 years imprisonment; civil monetary penalties up to $100,000 per violation under CMPL; exclusion from federal healthcare programs; treble damages under False Claims Act (ACA Section 6402(f) established that AKS violation is automatic FCA violation)

### One Purpose Test

- **What**: Under established case law, if even one purpose of a payment is to induce or reward referrals, the AKS is violated — the payment need not be solely or primarily for referrals
- **Threshold/Timeline**: Government need only prove that inducement of referrals was "one purpose" of the remuneration, not the primary or sole purpose; legitimate business purposes do not immunize arrangement if referral inducement is also present
- **Consequence**: The one purpose test makes AKS extremely broad; parties must affirmatively demonstrate compliance with a safe harbor or obtain an OIG advisory opinion; merely showing FMV compensation is necessary but not sufficient

### Safe Harbors (42 CFR 1001.952)

- **What**: Regulatory safe harbors provide immunity from AKS prosecution if all elements are met. Key safe harbors include:

  **Personal Services and Management Contracts**: Written agreement for at least 1 year specifying services; aggregate compensation set in advance, consistent with FMV, not based on volume/value of referrals; services do not involve counseling/promotion of unlawful activity

  **Investment Interests — Large Entity (60/40)**: Entity has 60+ investors, no more than 40% of investment interests held by investors who are in position to make or influence referrals, no more than 40% of revenue from referral-related investors, terms no different from non-investor terms

  **Investment Interests — Small Entity**: More restrictive requirements; at least 60% invested by those with no referral connection; no more than 40% of revenue from referral-connected investors; no loans/financing to investors

  **Electronic Health Records (EHR)**: Donation of interoperable EHR technology; recipient pays 15% of cost; not based on volume/value of referrals; arrangement in writing; no restriction on use with other payers

  **Value-Based Arrangements (2020)**: Three new safe harbors — (1) value-based arrangements with care coordination, (2) value-based arrangements with substantial downside financial risk, (3) value-based arrangements with full financial risk; graduated protection based on degree of risk-sharing

  **Cybersecurity Technology and Services (2020)**: Donation of cybersecurity technology and related services to protect electronic health records and personal health information; donor need not provide items at FMV; recipient may contribute less than cost if meeting small/rural practice criteria

  **Warranties**: Discounts and reductions on items/services properly disclosed and reflected in claims

  **Employee Exception**: Bona fide employment relationships exempt from AKS (most straightforward safe harbor)

- **Threshold/Timeline**: Safe harbors require strict compliance with every element; partial compliance provides no protection; safe harbors are voluntary — non-compliance does not mean violation, but does mean no immunity
- **Consequence**: Arrangements outside safe harbors evaluated under totality of circumstances; OIG may exercise prosecutorial discretion not to pursue arrangements with low abuse potential; advisory opinions available for specific fact patterns

### OIG Advisory Opinions

- **What**: Binding opinions from OIG on whether a specific arrangement constitutes grounds for sanctions under AKS; requestor-specific and fact-specific
- **Threshold/Timeline**: Processing typically 60-90 days after complete submission; $250 initial fee plus hourly fees; binding only on OIG and requesting party; may not be relied upon by third parties
- **Consequence**: Favorable advisory opinion provides significant practical protection; OIG publishes opinions publicly (redacted) providing guidance to industry; unfavorable opinions typically result in arrangement restructuring

### OIG Special Fraud Alerts and Advisory Bulletins

- **What**: OIG periodically issues Special Fraud Alerts identifying arrangement types of concern and Advisory Bulletins providing compliance guidance
- **Threshold/Timeline**: Recent focus areas include: speaker programs and consulting arrangements (2020 Special Fraud Alert), physician compensation arrangements above FMV, telehealth fraud schemes, laboratory arrangements
- **Consequence**: Arrangements matching patterns identified in Special Fraud Alerts face heightened scrutiny; not binding law but strong indication of enforcement priorities

### Civil Monetary Penalties Law (CMPL)

- **What**: Administrative enforcement mechanism allowing OIG to impose civil monetary penalties without criminal prosecution
- **Threshold/Timeline**: $100,000 per AKS violation; $50,000 per false/fraudulent claim; 3x damages; assessment based on OIG CMPL factors including nature/circumstances, degree of culpability, compliance history, and financial condition
- **Consequence**: CMPL actions are easier for government to prove than criminal cases (preponderance vs. beyond reasonable doubt); consent to exclusion frequently part of settlement; Corporate Integrity Agreements (CIAs) impose monitoring for 5 years

### False Claims Act Connection

- **What**: ACA Section 6402(f) established that claims resulting from AKS violations constitute false claims under the False Claims Act (31 U.S.C. 3729)
- **Threshold/Timeline**: FCA penalties of $11,665-$23,331 per false claim plus treble damages; 6-year statute of limitations (10 years under Wartime Suspension of Limitations Act for certain periods); qui tam relators entitled to 15-30% of recovery
- **Consequence**: FCA exposure dramatically increases financial risk of AKS violations; AKS-based FCA cases have resulted in settlements exceeding $1 billion; whistleblower incentives drive enforcement

## Interaction with Other Areas

- **stark-law/**: Arrangements must independently comply with both AKS and Stark; AKS safe harbor compliance does not satisfy Stark exceptions; compensation arrangements involving referrals must be analyzed under both statutes
- **provider-agreements/**: Managed care arrangements, recruitment incentives, and referral relationships must comply with AKS safe harbors
- **fda-regulation/**: Pharmaceutical and device manufacturer relationships with prescribers and providers are primary AKS enforcement targets (speaker programs, consulting, free samples)

## Sources

- [42 U.S.C. 1320a-7b — Anti-Kickback Statute](https://www.law.cornell.edu/uscode/text/42/1320a-7b)
- [42 CFR 1001.952 — Safe Harbors](https://www.ecfr.gov/current/title-42/chapter-V/subchapter-B/part-1001/subpart-C/section-1001.952)
- [OIG Advisory Opinions](https://oig.hhs.gov/compliance/advisory-opinions/)

---
## Fda Regulation

# FDA Regulation

## Applicability

Applies to matters involving medical devices, pharmaceuticals, biologics, food, dietary supplements, cosmetics, and tobacco products regulated by the U.S. Food and Drug Administration under the Federal Food, Drug, and Cosmetic Act (FDCA, 21 U.S.C. 301 et seq.) and Public Health Service Act (PHSA, 42 U.S.C. 262).

## Key Requirements

### Medical Device Classification (21 CFR Parts 860-892)

- **What**: FDA classifies medical devices into three classes based on risk level, each with different regulatory requirements:
  - **Class I** (low risk): General controls only (registration, listing, labeling, GMP); most exempt from 510(k); examples: bandages, tongue depressors, manual stethoscopes
  - **Class II** (moderate risk): General controls plus special controls (performance standards, post-market surveillance, specific labeling); most require 510(k) clearance; examples: powered wheelchairs, pregnancy tests, infusion pumps
  - **Class III** (high risk): General/special controls plus premarket approval (PMA); life-sustaining, life-supporting, or substantial importance; examples: pacemakers, heart valves, deep brain stimulators
- **Threshold/Timeline**: 510(k) review target 90 days (FDA decision); PMA review target 180 days (often longer); De Novo classification for novel low/moderate risk devices without predicate (review target 150 days)
- **Consequence**: Marketing a device without required clearance/approval is a prohibited act under FDCA Section 301; FDA enforcement includes warning letters, injunctions, seizures, civil monetary penalties, and criminal prosecution

### 510(k) Substantial Equivalence

- **What**: Premarket notification demonstrating that a new device is substantially equivalent to a legally marketed predicate device in intended use and technological characteristics
- **Threshold/Timeline**: Submission required at least 90 days before marketing; FDA issues Substantially Equivalent (SE) or Not Substantially Equivalent (NSE) determination; traditional 510(k), Special 510(k) (modifications by original submitter), and Abbreviated 510(k) (reliance on guidance/special controls) pathways available
- **Consequence**: NSE determination requires De Novo petition or PMA application; 510(k) clearance is not "approval" (important distinction for marketing claims); predicate device selection critical — "predicate creep" concern when chaining to distant predicates

### Premarket Approval (PMA)

- **What**: Most stringent premarket requirement; requires demonstration of safety and effectiveness through valid scientific evidence (typically clinical trials)
- **Threshold/Timeline**: PMA review target 180 days from filing; often requires FDA advisory committee review; total development timeline typically 3-7 years including clinical trials; PMA supplements required for manufacturing changes, labeling changes, and new indications
- **Consequence**: PMA approval provides significant preemption of state tort claims (Riegel v. Medtronic, 2008); PMA is device-specific and facility-specific; annual reports required; modifications may require PMA supplement (vs. 30-day notice or annual report)

### Drug Approval Pathways

- **What**: New drugs require FDA approval before marketing through the following pathways:
  - **NDA (New Drug Application)**: Full application with safety/efficacy data from clinical trials; standard or priority review
  - **ANDA (Abbreviated New Drug Application)**: Generic drugs demonstrating bioequivalence to approved reference listed drug; no new clinical trials required; Hatch-Waxman framework (Paragraph IV certifications for patent challenges)
  - **Biosimilar (BPCIA)**: Abbreviated pathway for biological products demonstrated to be "highly similar" with "no clinically meaningful differences" from reference product; 351(k) application
- **Threshold/Timeline**: Standard NDA review 10 months; priority review 6 months (for serious conditions with unmet need); breakthrough therapy designation accelerates development; accelerated approval based on surrogate endpoints with post-market confirmatory studies; REMS (Risk Evaluation and Mitigation Strategy) required for certain drugs
- **Consequence**: Marketing unapproved drug is criminal violation; off-label promotion prohibited (but off-label prescribing is permissible); FDA approval does not preempt state tort claims for drugs (Wyeth v. Levine, 2009, unlike PMA devices)

### Labeling Requirements (FDCA Section 502)

- **What**: Devices and drugs must bear labeling that is not false or misleading; must include adequate directions for use; promotional materials constitute labeling
- **Threshold/Timeline**: Drug labeling must follow structured format (Physician Labeling Rule); device labeling must include adequate directions, contraindications, warnings; Unique Device Identification (UDI) required for most devices; promotional materials reviewed by FDA OPDP (drugs) or CDRH (devices)
- **Consequence**: Misbranded product subject to seizure, injunction, and criminal prosecution; off-label promotion enforcement through DOJ (criminal) and OIG (civil); warning letters for promotional violations typically require response within 15 business days; FTC has concurrent jurisdiction over advertising (FDA regulates labeling)

### Post-Market Surveillance

- **What**: Ongoing obligations after product reaches market:
  - **MDR (Medical Device Reporting)**: Manufacturers must report deaths, serious injuries, and malfunctions to FDA; facilities report deaths and serious injuries; importers report both
  - **FAERS (FDA Adverse Event Reporting System)**: Drug manufacturers must submit 15-day expedited reports for serious/unexpected adverse events; periodic safety reports quarterly/annually
  - **Post-Market Studies**: FDA may require Section 522 studies for devices or post-market commitments for drugs
- **Threshold/Timeline**: MDR reports due within 30 calendar days of becoming aware (5 days for events requiring remedial action); drug expedited reports within 15 calendar days for serious unexpected events; periodic reports on schedule established in application; failure to report is independent violation
- **Consequence**: Failure to comply with MDR/FAERS results in warning letters, consent decrees, and potential criminal prosecution; recalls classified as Class I (reasonable probability of serious adverse health consequences or death), Class II (temporary or medically reversible), or Class III (unlikely to cause adverse health consequences); FDA does not technically "order" recalls for devices (except under mandatory recall authority) but expects voluntary compliance

### Clinical Trials (IND Framework)

- **What**: Investigational New Drug (IND) application required before clinical trials of drugs and certain devices (IDE — Investigational Device Exemption for significant risk devices); IRB (Institutional Review Board) approval required for all human subjects research
- **Threshold/Timeline**: IND becomes effective 30 days after FDA receipt if no clinical hold; Phase I (safety, 20-80 subjects), Phase II (efficacy, 100-300 subjects), Phase III (confirmatory, 1,000-3,000+ subjects); IDE required for significant risk devices; non-significant risk devices require IRB approval only (abbreviated IDE); informed consent requirements (21 CFR 50) — voluntary, adequate information, comprehension, documented
- **Consequence**: Clinical hold suspends trials; FDA may impose partial or complete hold; violations of informed consent or GCP (Good Clinical Practice) may result in investigator disqualification, institutional debarment, and criminal prosecution; data integrity violations (fraud) result in application integrity policy proceedings

### Emergency Use Authorization (EUA)

- **What**: FDA may authorize unapproved medical products during declared public health emergencies when no adequate alternatives exist
- **Threshold/Timeline**: Requires HHS declaration of emergency or threat; FDA determines product "may be effective" (lower standard than approval); conditions of authorization imposed; duration tied to emergency declaration; EUA products must include fact sheets for providers and recipients
- **Consequence**: EUA is not approval — marketing after emergency ends requires standard pathway; PREP Act provides liability immunity for covered countermeasures under EUA; manufacturers must continue collecting safety/efficacy data during EUA; transition to full approval expected where appropriate

## Interaction with Other Areas

- **anti-kickback/**: Manufacturer relationships with prescribers/providers (speaker programs, consulting, grants) are primary enforcement focus; samples regulated under PDMA (Prescription Drug Marketing Act)
- **ip-and-technology/**: Hatch-Waxman patent exclusivities (5-year NCE, 3-year clinical data, 180-day generic), Orange Book listing, BPCIA patent dance for biosimilars
- **advertising-media/**: FDA regulates labeling (including promotional materials); FTC regulates advertising; Division of jurisdiction: FDA for prescription drugs/devices, FTC for OTC drugs, dietary supplements, and devices marketed directly to consumers

## Sources

- [Federal Food, Drug, and Cosmetic Act (21 U.S.C. 301 et seq.)](https://www.law.cornell.edu/uscode/text/21/chapter-9)
- [FDA Device Classification Database](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpcd/classification.cfm)
- [FDA Drug Approval Process](https://www.fda.gov/drugs/development-approval-process-drugs)

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
## Provider Agreements

# Provider Agreements

## Applicability

Applies to agreements between healthcare providers and payers, health systems and physicians, managed care organizations and network participants, and credentialing/contracting arrangements. Covers participation agreements, managed care contracting models, credentialing standards, and patient billing restrictions.

## Key Requirements

### Participation Agreements (Medicare/Medicaid)

- **What**: Agreements between healthcare providers and CMS (or state Medicaid agencies) establishing terms of participation in federal healthcare programs; providers agree to accept program rates and comply with Conditions of Participation (CoPs)
- **Threshold/Timeline**: Medicare enrollment through PECOS (Provider Enrollment, Chain, and Ownership System); revalidation every 3-5 years depending on risk category (high, moderate, limited); Medicaid enrollment varies by state; application screening fees ($632 for institutional providers)
- **Consequence**: Participation requires acceptance of Medicare assignment (accepting Medicare-approved amount as full payment); non-participating providers limited to 115% of Medicare fee schedule for non-assigned claims; termination from program for cause results in exclusion; billing beneficiaries for covered services above program rates prohibited

### Managed Care Contracting Models

- **What**: Three primary reimbursement models govern managed care relationships:

  **Fee-for-Service (FFS)**: Provider paid per encounter/procedure at negotiated rate; volume-driven; rates typically percentage of Medicare or commercial fee schedule

  **Capitation**: Fixed per-member-per-month (PMPM) payment regardless of utilization; provider assumes financial risk for covered services; requires adequate panel size for actuarial soundness (typically minimum 5,000-10,000 lives for full professional capitation)

  **Value-Based Arrangements**: Shared savings, bundled payments, performance-based incentives; quality metrics tied to compensation; CMS Innovation Center models (ACOs, BPCI-A, Primary Care First); require data sharing and care coordination infrastructure

- **Threshold/Timeline**: Contract terms typically 1-3 years with auto-renewal; termination without cause typically 90-180 days notice; term negotiation critical for capitated arrangements; rate escalators (CPI-M or fixed percentage) standard in multi-year contracts
- **Consequence**: Capitated arrangements shift financial risk to provider — insufficient actuarial analysis can result in losses; stop-loss/reinsurance provisions critical for outlier claims; value-based arrangements require compliance with Stark/AKS exceptions for value-based purposes

### Credentialing (NCQA Standards)

- **What**: Process of verifying healthcare provider qualifications, including education, licensure, board certification, malpractice history, DEA registration, and work history; NCQA (National Committee for Quality Assurance) standards are industry benchmark
- **Threshold/Timeline**: Initial credentialing before provider sees patients; recredentialing every 3 years; primary source verification required (medical school, licensing board, NPDB, DEA); CAQH ProView is standard universal application; credentialing committee must include peer physicians; timeline from application to approval typically 60-120 days
- **Consequence**: Failure to properly credential can result in NCQA accreditation loss for health plan; liability exposure for negligent credentialing (hospital vicariously liable if it knew or should have known of provider's incompetence); delegated credentialing arrangements must include audit rights and oversight

### Any Willing Provider Laws

- **What**: State laws requiring health plans to accept any qualified provider willing to meet the plan's terms and conditions; approximately 30 states have some form of AWP law
- **Threshold/Timeline**: Scope varies significantly by state — some apply only to pharmacies, others to all provider types; typically apply to network plans (PPO, HMO); Kentucky v. UnitedHealthcare (2003) upheld state AWP laws against ERISA preemption challenge for insured (not self-funded) plans
- **Consequence**: AWP laws limit plan's ability to create narrow/tiered networks; exempt from plans not subject to state insurance regulation (self-funded ERISA plans, federal employee plans); compliance required before excluding willing providers

### Assignment of Benefits

- **What**: Patient's authorization for insurer to pay benefits directly to the provider rather than to the patient
- **Threshold/Timeline**: Anti-assignment clauses in plan documents may restrict provider's ability to enforce claims against insurer; state laws may prohibit anti-assignment clauses (varies by state); assignment typically requires written patient authorization
- **Consequence**: Without valid assignment, provider must collect from patient and patient seeks reimbursement from plan; assignment gives provider standing to appeal claims denials in many jurisdictions; ERISA plans may enforce anti-assignment provisions absent state law prohibition

### Balance Billing Restrictions

- **What**: Limitations on provider's ability to bill patients for the difference between billed charges and the amount paid by insurer
- **Threshold/Timeline**: No Surprises Act (2022) — prohibits balance billing for emergency services at out-of-network facilities and for non-emergency services at in-network facilities by out-of-network providers (unless patient provides written consent with specific disclosure requirements at least 72 hours prior); independent dispute resolution (IDR) process for payment disputes between providers and plans; qualifying payment amount (QPA) based on median in-network rate
- **Consequence**: Balance billing violations under No Surprises Act subject to $10,000 per violation; state surprise billing laws may impose additional restrictions (28+ states had laws pre-NSA); IDR process timelines: open negotiation (30 days), IDR entity selection (3 business days), IDR decision (30 days); IDR initiation fee approximately $50 per party per dispute

### Network Adequacy

- **What**: Requirements that health plans maintain sufficient numbers and types of providers to ensure covered persons have reasonable access to healthcare services
- **Threshold/Timeline**: State standards vary — typically specify maximum distance/drive time by provider type and geographic area (e.g., 30 minutes/30 miles for primary care in urban areas); appointment wait time standards (e.g., urgent care within 48 hours, routine within 30 days); CMS network adequacy standards for Medicare Advantage and Exchange plans; annual network adequacy reviews
- **Consequence**: Failure to meet network adequacy standards may result in enforcement action by state DOI, CMS sanctions for MA/Exchange plans, or requirement to provide out-of-network coverage at in-network rates; provider directory accuracy requirements (updated within specified timeframes, typically 30-90 days)

## Interaction with Other Areas

- **stark-law/**: Physician compensation models in provider agreements must satisfy applicable Stark exceptions; productivity bonuses, quality incentives, and ancillary service revenue sharing require careful structuring
- **anti-kickback/**: Managed care arrangements must fit within AKS safe harbors (personal services, FMV, managed care); recruitment incentives subject to AKS analysis
- **employment/**: Employed physician arrangements subject to both employment law and healthcare-specific requirements (corporate practice of medicine, non-compete enforceability varies by state)

## Sources

- [CMS Provider Enrollment](https://www.cms.gov/Medicare/Provider-Enrollment-and-Certification)
- [No Surprises Act Implementation](https://www.cms.gov/nosurprises)
- [NCQA Credentialing Standards](https://www.ncqa.org/programs/health-plans/credentials-verification-organization-cvo/)

---
## Stark Law

# Stark Law (Physician Self-Referral)

## Applicability

Applies when a physician (or immediate family member) has a financial relationship with an entity and refers Medicare/Medicaid patients to that entity for designated health services (DHS). The Stark Law (42 U.S.C. 1395nn) is a strict liability statute — no intent to violate is required.

## Key Requirements

### Self-Referral Prohibition

- **What**: A physician who has a financial relationship (ownership/investment interest or compensation arrangement) with an entity may not refer patients to that entity for designated health services payable by Medicare or Medicaid, unless an exception applies
- **Threshold/Timeline**: Prohibition is absolute — applies regardless of whether the referral was clinically appropriate or the arrangement was fair; "referral" interpreted broadly to include any request for, or ordering of, a DHS item or service
- **Consequence**: Claims for DHS rendered pursuant to prohibited referral are not payable by Medicare; entity must refund amounts collected; penalties of $15,000 per claim submitted, assessment of up to 3 times the amount claimed; CMP of up to $100,000 for circumvention schemes; exclusion from federal healthcare programs

### Designated Health Services (10 Categories)

- **What**: Stark applies only to referrals for the following DHS categories:
  1. Clinical laboratory services
  2. Physical therapy, occupational therapy, and outpatient speech-language pathology
  3. Radiology and certain other imaging services
  4. Radiation therapy services and supplies
  5. Durable medical equipment and supplies
  6. Parenteral and enteral nutrients, equipment, and supplies
  7. Prosthetics, orthotics, and prosthetic devices and supplies
  8. Home health services
  9. Outpatient prescription drugs
  10. Inpatient and outpatient hospital services
- **Threshold/Timeline**: DHS status determined by billing code (CPT/HCPCS); CMS publishes annual list of DHS codes
- **Consequence**: Non-DHS services are not subject to Stark, even if financial relationship exists; mixed arrangements involving both DHS and non-DHS must be structured to comply for the DHS component

### Financial Relationship Types

- **What**: Two categories trigger Stark: (1) ownership/investment interest (equity, debt, other) in the DHS entity, and (2) compensation arrangement (direct or indirect) with the entity
- **Threshold/Timeline**: Direct compensation — between physician and entity; indirect compensation — through one or more intermediary entities; both require exception compliance; "stands in the shoes" rule — physician organization's financial relationships attributed to member physicians
- **Consequence**: Even nominal financial relationships trigger the prohibition; must satisfy a specific exception or referral is prohibited; burden on parties to demonstrate exception compliance

### Key Exceptions

- **What**: Stark provides numerous exceptions that, if fully satisfied, permit referrals notwithstanding a financial relationship. Key exceptions include:

  **In-Office Ancillary Services Exception**: DHS provided personally by referring physician, another physician in the group practice, or individual supervised by physician in group; provided in same building as physician practice or centralized building; billed by the group practice

  **Fair Market Value Exception**: Arrangement is in writing, signed, and specifies services; term of at least 1 year (or holdover provisions); compensation is FMV and not based on volume/value of referrals; commercially reasonable even absent referrals

  **Bona Fide Employment Exception**: Employment relationship; compensation is FMV for services actually provided; not based on volume/value of referrals (productivity bonuses permissible if not directly tied to referrals); commercially reasonable

  **Electronic Health Records Exception**: Donation of EHR items/services; donor does not take into account volume/value of referrals; receiving physician pays 15% of donor's cost; arrangement in writing for minimum 1 year; interoperability requirement; sunset extended through regulation

  **Cybersecurity Technology Exception (2021)**: Donation of cybersecurity technology and related services; substantially similar requirements to EHR exception; no sunset provision; recipient must contribute 15% of cost (may be waived for small/rural practices)

  **Value-Based Arrangements (2021)**: Three new exceptions for value-based purpose arrangements, value-based arrangements with meaningful downside risk, and full financial risk arrangements; align with AKS value-based safe harbors

- **Threshold/Timeline**: Each exception has specific requirements — all elements must be met; failure on any single element voids the entire exception; "commercially reasonable" and "fair market value" are the most frequently disputed elements
- **Consequence**: Partial compliance is insufficient — strict liability means missing one element of an exception provides no protection; periodic FMV updates required (typically every 3 years); documentation must be maintained for 6 years after arrangement terminates

### Strict Liability Standard

- **What**: Unlike the Anti-Kickback Statute, Stark does not require proof of intent; violation occurs upon prohibited referral regardless of the parties' state of mind
- **Threshold/Timeline**: No scienter requirement — "innocent" violations are treated identically to intentional violations; self-disclosure through CMS SRDP (Self-Referral Disclosure Protocol) available to reduce potential penalties
- **Consequence**: Strict liability makes structural compliance essential; parties cannot rely on good faith or reasonable interpretation; CMS SRDP settlements have been as low as 1-1.5x the amount at issue for timely self-disclosures (compared to up to 3x through OIG)

### Enforcement Mechanisms

- **What**: Stark is enforced through Medicare claims denial, CMP actions, False Claims Act qui tam suits, and CMS self-referral disclosure protocol
- **Threshold/Timeline**: False Claims Act treble damages ($11,665-$23,331 per claim plus 3x damages) for submitting claims for DHS furnished pursuant to prohibited referral; 6-year statute of limitations for FCA; 60-day repayment obligation under ACA Section 6402 once overpayment identified
- **Consequence**: Stark violations frequently surface through whistleblower (qui tam) suits; FCA relators entitled to 15-30% of recovery; largest Stark settlements have exceeded $100M; violation also triggers exclusion authority

## Interaction with Other Areas

- **anti-kickback/**: Arrangements must comply with both Stark and AKS independently; AKS safe harbor compliance does not guarantee Stark exception compliance and vice versa
- **provider-agreements/**: Physician compensation models in provider agreements must be structured to satisfy Stark exceptions
- **corporate/**: Healthcare entity formation (e.g., physician-owned ambulatory surgery centers) must account for Stark ownership exceptions

## Sources

- [42 U.S.C. 1395nn — Stark Law](https://www.law.cornell.edu/uscode/text/42/1395nn)
- [CMS Physician Self-Referral Information](https://www.cms.gov/Medicare/Fraud-and-Abuse/PhysicianSelfReferral)
- [CMS Self-Referral Disclosure Protocol](https://www.cms.gov/Medicare/Fraud-and-Abuse/PhysicianSelfReferral/Self_Referral_Disclosure_Protocol)

---
## Telehealth

# Telehealth

## Applicability

Applies to the delivery of healthcare services via telecommunications technology, including synchronous video visits, asynchronous (store-and-forward) consultations, remote patient monitoring (RPM), and audio-only encounters. Covers state licensure, prescribing restrictions, reimbursement parity, and HIPAA considerations specific to telehealth delivery.

## Key Requirements

### State Licensure Requirements

- **What**: Physicians and other licensed providers must generally hold a license in the state where the patient is physically located at the time of the telehealth encounter, not where the provider is located
- **Threshold/Timeline**: Interstate Medical Licensure Compact (IMLC) — 40+ member states offering expedited pathway for physicians to obtain licenses in multiple states; compact license is not a national license — physician still receives individual state licenses through expedited process; Nurse Licensure Compact (NLC) covers 40+ states for RNs and LPNs; Psychology Interjurisdictional Compact (PSYPACT) covers 40+ states
- **Consequence**: Practicing without a license in the patient's state constitutes unauthorized practice of medicine; penalties vary by state (misdemeanor to felony); some states have limited telemedicine-specific exceptions for consultations or follow-up care; state medical board enforcement; malpractice insurance must cover states where patients are located

### Prescribing via Telehealth (Ryan Haight Act)

- **What**: The Ryan Haight Online Pharmacy Consumer Protection Act (21 U.S.C. 829(e)) requires at least one in-person medical evaluation before prescribing controlled substances via telemedicine, unless an exception applies
- **Threshold/Timeline**: In-person evaluation required before initial prescription of Schedule II-V controlled substances; exceptions: DEA-registered telemedicine practitioners, public health emergency declarations, Indian Health Service, Veterans Health Administration, practitioners in DEA-registered hospitals/clinics with patient present at registered facility; DEA COVID-era flexibilities allowed prescribing without in-person visit during public health emergency — DEA proposed permanent rule requiring at least one in-person visit for Schedule II prescriptions and initial 30-day telemedicine prescription for Schedule III-V with follow-up in-person within 6 months
- **Consequence**: Violation of Ryan Haight Act is a federal felony (same penalties as illegal distribution of controlled substances); state prescribing laws may impose additional requirements; practitioners must verify patient identity and location; electronic prescribing of controlled substances (EPCS) requires two-factor authentication

### Reimbursement Parity

- **What**: State parity laws require private insurers to reimburse telehealth services at the same rate as equivalent in-person services; coverage parity requires covering telehealth if in-person equivalent is covered
- **Threshold/Timeline**: 43+ states and D.C. have some form of telehealth parity law; parity types vary: coverage parity only (must cover), payment parity (must pay same rate), both, or neither; Medicare telehealth reimbursement historically limited to rural originating sites — expanded significantly during COVID (many expansions extended through legislation); Medicaid telehealth coverage varies by state (all states cover some telehealth)
- **Consequence**: Parity laws typically apply to state-regulated fully insured plans; self-funded ERISA plans exempt from state parity requirements; Medicare telehealth reimbursement rates generally equal to in-person rates for covered services; audio-only reimbursement increasingly recognized (many states and Medicare now cover); cost-sharing for telehealth may not be waived unless plan specifically provides

### Originating Site and Modality Requirements

- **What**: Payer rules may restrict where the patient must be located (originating site) and what technology modalities qualify for reimbursement
- **Threshold/Timeline**: Traditional Medicare required originating site in rural HPSA or non-MSA county (expanded during and after COVID — home now permitted for many services through at least 2024 legislation); Medicaid increasingly permits home as originating site; three primary modalities: synchronous (real-time audio/video), asynchronous/store-and-forward (transmission of recorded data), and remote patient monitoring (RPM, continuous or intermittent device-transmitted data)
- **Consequence**: Services delivered via non-qualifying modality may not be reimbursable; documentation must reflect modality used; place of service codes (POS 02 for telehealth, POS 10 for patient home) affect reimbursement rates; some payers apply facility/non-facility rate differentials to telehealth

### Remote Patient Monitoring (RPM)

- **What**: Collection and interpretation of physiologic data (blood pressure, glucose, weight, pulse oximetry, etc.) digitally transmitted from patient to provider
- **Threshold/Timeline**: Medicare RPM codes (99453, 99454, 99457, 99458) require: FDA-cleared device, initial setup and patient education, minimum 16 days of data transmission per 30-day period, 20 minutes of clinical staff time per month; established patient relationship required; separate from Chronic Care Management (CCM) but may be furnished concurrently
- **Consequence**: RPM billing requires documentation of device, data transmission days, and time spent; improper RPM billing is a growing enforcement target (OIG identified RPM as fraud risk area); state laws vary on whether RPM requires physician supervision or can be delegated; data security requirements apply to transmitted health data

### HIPAA Telehealth Flexibilities

- **What**: HIPAA Security Rule applies to all electronic transmission of PHI during telehealth encounters; HHS OCR exercised enforcement discretion during COVID regarding telehealth platforms
- **Threshold/Timeline**: During public health emergency, OCR announced it would not impose penalties for good faith use of non-public-facing communication platforms for telehealth (e.g., Zoom, FaceTime); enforcement discretion has ended as COVID emergency declarations expired; BAAs required with telehealth platform vendors; encryption required for ePHI transmission (effectively required despite "addressable" designation)
- **Consequence**: Post-COVID, providers must use HIPAA-compliant platforms with BAAs; public-facing platforms (Facebook Live, TikTok) never permissible; platform must support access controls, audit logs, encryption in transit and at rest; patient consent for telehealth communication should address privacy risks specific to remote encounters; recording of telehealth sessions requires separate consent in most states

### Informed Consent for Telehealth

- **What**: Many states require specific informed consent for telehealth services beyond standard medical informed consent; requirements vary significantly by jurisdiction
- **Threshold/Timeline**: Approximately 40 states have telehealth-specific consent requirements; elements may include: explanation of telehealth modality, risks specific to remote care (e.g., technology failure, limitations of remote examination), privacy/security protections, right to refuse telehealth and seek in-person care, provider credentials, documentation requirements (written vs. verbal consent, retention)
- **Consequence**: Failure to obtain required telehealth consent may affect malpractice defense; some states require consent before each encounter, others once per episode or annually; consent documentation should be maintained in medical record; state-specific requirements must be followed for each patient's location

### Standard of Care

- **What**: The standard of care for telehealth services is generally the same as for in-person services; providers must practice within their scope and deliver care meeting professional standards regardless of modality
- **Threshold/Timeline**: AMA, specialty societies, and state medical boards have issued telehealth practice guidelines; malpractice carriers may have specific telehealth endorsement requirements; documentation must support clinical decision-making despite remote evaluation
- **Consequence**: Telehealth does not create a lower standard of care; failure to recommend in-person evaluation when clinically appropriate may constitute malpractice; malpractice jurisdiction typically where patient is located; malpractice insurance must cover telehealth services in applicable states

## Interaction with Other Areas

- **hipaa-compliance/**: PHI transmitted during telehealth encounters subject to full HIPAA Privacy and Security Rule requirements; BAA required with platform vendors
- **data-privacy/**: State consumer privacy laws (CCPA, etc.) may apply to health data collected through consumer-facing telehealth platforms not subject to HIPAA
- **fda-regulation/**: RPM devices may be FDA-regulated medical devices; software as a medical device (SaMD) guidance applies to clinical decision support tools used in telehealth

## Sources

- [Interstate Medical Licensure Compact](https://www.imlcc.org/)
- [Ryan Haight Act (21 U.S.C. 829(e))](https://www.law.cornell.edu/uscode/text/21/829)
- [CMS Telehealth Services](https://www.cms.gov/Medicare/Medicare-General-Information/Telehealth)
- [HHS Telehealth Policy](https://telehealth.hhs.gov/)
