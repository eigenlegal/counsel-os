---
counsel-os-type: law-area
content-version: "2026-04-08"
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
