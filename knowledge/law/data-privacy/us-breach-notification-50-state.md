---
counsel-os-type: law-area
content-version: "2026-06-11"
jurisdiction: [us-state]
last-reviewed: "2026-06-11"
authorities:
  - cite: "Cal. Civ. Code §§ 1798.29, 1798.82"
    title: "California breach notification statute (checked 2026-06-11)"
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.82.&lawCode=CIV"
  - cite: "N.Y. Gen. Bus. Law § 899-aa"
    title: "New York breach notification statute, as amended December 2024 (checked 2026-06-11)"
    url: "https://www.nysenate.gov/legislation/laws/GBS/899-AA"
  - cite: "Tex. Bus. & Com. Code § 521.053"
    title: "Texas breach notification statute, as amended 2023 (checked 2026-06-11)"
    url: "https://statutes.capitol.texas.gov/GetStatute.aspx?Code=BC&Value=521.053"
  - cite: "10 M.R.S. § 1348"
    title: "Maine security breach notice requirements (checked 2026-06-11)"
    url: "https://legislature.maine.gov/statutes/10/title10sec1348.html"
  - cite: "815 ILCS 530/10"
    title: "Illinois PIPA — AG notice when more than 500 residents notified (checked 2026-06-11)"
    url: "https://www.ilga.gov/legislation/ilcs/fulltext.asp?DocName=081505300K10"
  - cite: "Utah Code § 13-44-202"
    title: "Utah breach disclosure — AG and Utah Cyber Center notice at 500 residents, SB 127 (2023) (checked 2026-06-11)"
    url: "https://le.utah.gov/xcode/Title13/Chapter44/13-44-S202.html"
  - cite: "Okla. SB 626 (2025), amending Okla. Stat. tit. 24, §§ 161-166"
    title: "Oklahoma breach notification overhaul, effective January 1, 2026 (checked 2026-06-11)"
    url: "https://www.oklegislature.gov/cf_pdf/2025-26%20ENR/SB/SB626%20ENR.PDF"
  - cite: "Pa. Act 33 of 2024 (SB 824), amending 73 P.S. § 2301 et seq."
    title: "Pennsylvania breach amendments — AG notice at 500, credit monitoring mandate, effective September 26, 2024 (checked 2026-06-11)"
    url: "https://www.legis.state.pa.us/cfdocs/legis/li/uconsCheck.cfm?yr=2024&sessInd=0&act=33"
  - cite: "S.D. Codified Laws § 22-40-20"
    title: "South Dakota breach notice — 60 days; AG notice when breach exceeds 250 residents (checked 2026-06-11)"
    url: "https://sdlegislature.gov/Statutes/22-40-20"
  - cite: "Tenn. Code Ann. § 29-34-215 (HB 2434, 2024)"
    title: "Tennessee cybersecurity-event class action safe harbor (checked 2026-06-11)"
    url: "https://www.thompsonhine.com/insights/tennessee-enacts-data-breach-class-action-safe-harbor/"
  - cite: "88 FR 77499 (Nov. 13, 2023)"
    title: "FTC Safeguards Rule breach-notification amendment (effective May 13, 2024)"
    url: "https://www.federalregister.gov/documents/2023/11/13/2023-24412/standards-for-safeguarding-customer-information"
  - cite: "Perkins Coie Security Breach Notification Chart"
    title: "50-state tracker used for cross-checks (checked 2026-06-11)"
    url: "https://perkinscoie.com/insights/publication/security-breach-notification-chart"
  - cite: "IAPP US State Data Breach Notification Chart"
    title: "50-state tracker used for cross-checks (checked 2026-06-11)"
    url: "https://iapp.org/resources/article/state-data-breach-notification-chart/"
  - cite: "NCSL Security Breach Notification Laws"
    title: "50-state statutory citation index (checked 2026-06-11)"
    url: "https://www.ncsl.org/technology-and-communication/security-breach-notification-laws"
---
# US Breach Notification — 50-State Reference

## Applicability

Load this sub-file when:

- A data breach has occurred affecting individuals in multiple US states and notification obligations must be assessed state by state.
- Contract negotiations involve breach notification timelines and the parties need to understand the strictest applicable deadlines.
- Incident response planning requires a comprehensive reference for notification triggers, timelines, AG reporting thresholds, and content requirements across all US jurisdictions.
- A DPA or vendor agreement specifies breach notification obligations and the downstream state-law obligations must be mapped.
- Compliance programs are being designed for multi-state operations and breach response playbooks must account for jurisdictional variation.

## Overview

All 50 US states, the District of Columbia, Guam, Puerto Rico, and the US Virgin Islands have enacted data breach notification laws. There is no general federal breach notification statute (sector-specific federal laws such as HIPAA and GLBA impose separate obligations on covered entities). This creates a patchwork of requirements that vary on every key dimension: what triggers notification, what constitutes "personal information," how quickly notice must be given, who must be notified, what the notice must contain, and whether exemptions apply.

Key landscape themes:

- **No federal floor.** Each state's law operates independently. A single breach affecting residents of all 50 states may require compliance with 50+ separate notification regimes.
- **Trend toward shorter deadlines.** States have been moving from vague "without unreasonable delay" standards to specific numeric deadlines (30, 45, or 60 days). As of 2026, roughly 25 states impose a specific numeric deadline.
- **Expanding definitions of personal information.** States increasingly include biometric data, medical information, email credentials, taxpayer identification numbers, and health insurance information alongside the traditional SSN/DL/financial-account baseline.
- **AG notification is now common.** The majority of states require notification to the state Attorney General or another state agency, often with a threshold based on the number of affected residents.
- **Encryption safe harbor is nearly universal** but has nuances — some states exclude encrypted data only if the encryption key was not also compromised.
- **Risk of harm exemption is a critical distinction.** Some states allow an entity to forgo notification if it determines the breach does not create a reasonable likelihood of harm. Other states (notably California) do not provide this exemption.

## Key Definitions

### Personal Information (Common Baseline)

Most state breach notification laws define "personal information" as an individual's first name or first initial and last name, in combination with one or more of the following data elements (when not encrypted or redacted):

- Social Security number (SSN)
- Driver's license number or state identification card number
- Financial account number, credit card number, or debit card number, in combination with any required security code, access code, or password that would permit access to the account

### Expanded Definitions (State Variations)

Many states have expanded beyond this baseline to include one or more of:

- **Medical/health information** — diagnosis, treatment, health insurance policy numbers
- **Biometric data** — fingerprints, retina scans, voiceprints, facial geometry
- **Email address + password/security question** — login credentials (standalone, without requiring a name element in some states)
- **Taxpayer identification number** — federal or state tax ID
- **Passport number**
- **Military ID number**
- **DNA profile / genetic data**
- **Health insurance information** — policy number, subscriber ID
- **Student ID / education records** (in some states)

### What Constitutes a "Breach"

States differ on the trigger standard:

- **Unauthorized acquisition** — most common. Notification is required when personal information is acquired by an unauthorized person.
- **Unauthorized access** — broader. Some states trigger notification on unauthorized access to (not just acquisition of) personal information, even if data was not demonstrably exfiltrated.
- **Unauthorized acquisition or access** — some states use both terms, creating the broadest trigger.
- **Reasonable belief of acquisition** — some states trigger on a reasonable belief that unauthorized acquisition has occurred.

## State-by-State Requirements

### Alabama

- **Statute:** Ala. Code §§ 8-38-1 to 8-38-12 (Alabama Data Breach Notification Act of 2018)
- **Trigger:** Unauthorized acquisition of covered data that is reasonably likely to cause substantial harm to the individual
- **Personal information definition:** Name + SSN, DL, financial account number, tax ID, medical information, health insurance information, email + password/security question. Also includes username/email + password when it would permit access to an online account.
- **Notification timeline:** As expeditiously as possible and without unreasonable delay, but no later than **45 days** from determination that a breach has occurred
- **AG notification:** Required if breach affects **more than 1,000 individuals**; must notify AG within 45 days
- **Consumer notification content:** Must include date range of breach, description of breached information, toll-free numbers for credit reporting agencies, and steps the entity is taking
- **Credit monitoring:** Not specifically mandated by statute
- **Risk of harm exemption:** Yes — notification not required if, after a good-faith and prompt investigation, the entity reasonably determines that the breach is not reasonably likely to cause substantial harm
- **Encryption safe harbor:** Yes — encrypted data is excluded unless the encryption key or security credential was also acquired
- **Notable:** One of the newer state laws (2018); includes specific security program requirements (reasonable security measures); AG can bring action under the Deceptive Trade Practices Act; no private right of action
- **Source:** [Ala. Code § 8-38-1 et seq.](https://law.justia.com/codes/alabama/title-8/chapter-38/)

### Alaska

- **Statute:** Alaska Stat. §§ 45.48.010 to 45.48.090
- **Trigger:** Unauthorized acquisition, or reasonable belief of unauthorized acquisition, of personal information that compromises the security, confidentiality, or integrity of the information
- **Personal information definition:** Name + SSN, DL, financial account number with access code/password. Also includes employer-assigned ID in combination with other authentication data.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not required by statute (no mandatory AG notification provision)
- **Consumer notification content:** Must include a description of the incident in general terms, the type of information subject to the breach, contact information for the entity, and the toll-free numbers for the major credit reporting agencies
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Partial — the trigger itself requires compromise of "security, confidentiality, or integrity," which functions as a threshold assessment
- **Encryption safe harbor:** Yes — applies to personal information that is encrypted
- **Notable:** Among the simpler state statutes; no AG notification requirement; no private right of action; relatively narrow PI definition
- **Source:** [Alaska Stat. § 45.48.010 et seq.](https://www.akleg.gov/basis/statutes.asp#45.48.010)

### Arizona

- **Statute:** Ariz. Rev. Stat. §§ 18-551 to 18-552
- **Trigger:** Unauthorized acquisition of and access to unencrypted or unredacted computerized personal information that materially compromises the security or confidentiality of the information and that causes or is reasonably likely to cause substantial economic loss to an individual
- **Personal information definition:** Name + SSN, DL or government-issued ID, financial account number with access code, health insurance ID, medical information, passport number, taxpayer ID, unique biometric data. Standalone: username/email + password/security question.
- **Notification timeline:** **45 days** from determination that a breach has occurred
- **AG notification:** Required within 45 days if breach affects **more than 1,000 individuals**
- **Consumer notification content:** Must include a general description, type of PI, approximate date of breach, toll-free contact numbers for credit bureaus, and the entity's contact information
- **Credit monitoring:** Not specifically mandated by statute
- **Risk of harm exemption:** Yes — built into the trigger (must be "reasonably likely to cause substantial economic loss")
- **Encryption safe harbor:** Yes — encrypted and redacted data are excluded from the definition
- **Notable:** Expanded PI definition in 2018 amendments to include biometric data, health insurance ID, passport, and taxpayer ID; strong risk-of-harm threshold built into the trigger; penalties up to $500,000 for a series of breaches involving the same type of PI
- **Source:** [Ariz. Rev. Stat. § 18-551](https://www.azleg.gov/ars/18/00551.htm)

### Arkansas

- **Statute:** Ark. Code §§ 4-110-101 to 4-110-108 (Personal Information Protection Act)
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL, financial account number with access code. Relatively narrow baseline definition.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute
- **Consumer notification content:** General notification requirements; no highly prescriptive content mandates
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Partial — the trigger requires compromise of "security, confidentiality, or integrity," which implies a threshold
- **Encryption safe harbor:** Yes — encrypted data is excluded
- **Notable:** Among the simpler statutes; no AG notification requirement; no specific numeric deadline; no private right of action
- **Source:** [Ark. Code § 4-110-103](https://law.justia.com/codes/arkansas/title-4/subtitle-7/chapter-110/)

### California

- **Statute:** Cal. Civ. Code §§ 1798.29, 1798.82 (breach notification); CCPA § 1798.150 (private right of action)
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information. No risk-of-harm exception.
- **Personal information definition:** Name + SSN, DL/state ID, financial account/credit/debit card number with access code, medical information, health insurance information, unique biometric data (DNA, fingerprint, retina, iris image, etc.). Standalone trigger: username/email + password/security question.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline). In practice, the AG has scrutinized delays beyond 30-45 days.
- **AG notification:** Required if breach affects **more than 500 California residents**; notification must be submitted electronically to the AG
- **Consumer notification content:** Prescriptive content requirements: name and contact of notifying entity, list of categories of PI involved, estimated date of breach, description of incident, whether notification was delayed due to law enforcement, available remedies including toll-free numbers for credit bureaus and the FTC. Must be written in plain language and formatted to be conspicuous. The AG has published a recommended notification template.
- **Credit monitoring:** Offering is not mandated. But if the breached entity was the source of the breach and the breach involved SSN, driver's license, or California ID card numbers, any identity theft prevention and mitigation services offered must be provided at no cost for at least 12 months (Cal. Civ. Code § 1798.82(d)(2)(G)). Offering remains de facto expected in practice.
- **Risk of harm exemption:** **No** — California does not have a risk-of-harm exemption. If PI is acquired without authorization, notification is required regardless of whether harm is likely.
- **Encryption safe harbor:** Yes — encrypted data is excluded from the definition of personal information, unless the encryption key or security credential was also acquired
- **Notable:** CCPA § 1798.150 provides a **private right of action** for breaches involving nonencrypted/nonredacted PI resulting from failure to maintain reasonable security measures. Statutory damages of **$100-$750 per consumer per incident**, plus actual damages. No cap on aggregate damages. The AG's enforcement record is aggressive. California's definition of PI is among the broadest. No risk-of-harm exemption makes California one of the strictest notification regimes.
- **Source:** [Cal. Civ. Code § 1798.29](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.29.&lawCode=CIV), [Cal. Civ. Code § 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.82.&lawCode=CIV), [CCPA § 1798.150](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.150.&lawCode=CIV)

### Colorado

- **Statute:** Colo. Rev. Stat. §§ 6-1-716, 6-1-716.5
- **Trigger:** Unauthorized acquisition of unencrypted computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/ID, financial account number with access code, medical information, health insurance ID, biometric data. Standalone trigger: username/email + password/security question.
- **Notification timeline:** **30 days** after determination that a security breach occurred — one of the shortest specific deadlines nationwide
- **AG notification:** Required within 30 days if breach affects **500 or more Colorado residents**
- **Consumer notification content:** Date of breach (estimated), description of PI involved, contact information for credit reporting agencies, and contact information for the entity
- **Credit monitoring:** Not mandated by statute
- **Risk of harm exemption:** Partial — the trigger itself involves compromise of security/confidentiality/integrity, but no separate risk-of-harm exemption after a breach is determined
- **Encryption safe harbor:** Yes — encrypted data is excluded unless the encryption key was also compromised
- **Notable:** One of the most aggressive numeric deadlines at **30 days**; the Colorado Privacy Act (CPA) adds additional data protection obligations beyond breach notification; applies to any entity that maintains, owns, or licenses computerized data including PI of Colorado residents
- **Source:** [Colo. Rev. Stat. § 6-1-716](https://law.justia.com/codes/colorado/title-6/article-1/part-7/section-6-1-716/)

### Connecticut

- **Statute:** Conn. Gen. Stat. § 36a-701b (as amended through 2021)
- **Trigger:** Unauthorized access to or unauthorized acquisition of electronic files, media, databases, or computerized data containing personal information when access to the personal information has not been secured by encryption or by any other method or technology
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, taxpayer ID, passport number, military ID. Individual health insurance policy number or subscriber ID in combination with unique identifier. Medical information, biometric data. Standalone trigger: username/email + password/security question.
- **Notification timeline:** **60 days** after discovery of the breach (not after determination — the clock starts at discovery)
- **AG notification:** Required for **any number** of Connecticut residents affected — no minimum threshold. AG must be notified no later than the time individuals are notified.
- **Consumer notification content:** Must include description of incident, type of information, steps taken, contact information, toll-free numbers for credit bureaus, and identity theft prevention/mitigation information
- **Credit monitoring:** Required to offer **free credit monitoring** for a minimum of **24 months** when SSNs or taxpayer identification numbers are compromised
- **Risk of harm exemption:** Yes — notification not required if, after an appropriate investigation and consultation with law enforcement, the entity reasonably determines that the breach will not likely result in harm to the affected individuals
- **Encryption safe harbor:** Yes — encrypted data is excluded from the trigger
- **Notable:** AG notification for any number of affected residents (no threshold) is stricter than most states; 24-month credit monitoring requirement for SSN breaches is among the longest; amendments in 2018 and 2021 significantly expanded the law (24-month monitoring, 60-day clock, broader PI definition); no private right of action but AG enforcement powers are broad
- **Source:** [Conn. Gen. Stat. § 36a-701b](https://www.cga.ct.gov/current/pub/chap_669.htm#sec_36a-701b)

### Delaware

- **Statute:** Del. Code tit. 6, §§ 12B-101 to 12B-104
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Also: employee ID combined with password/security data, DNA profile, passport number, taxpayer ID, health insurance information, medical information, biometric data. Standalone trigger: username/email + password/security question.
- **Notification timeline:** **60 days** after determination of breach
- **AG notification:** Required if breach affects **more than 500 Delaware residents**; AG must be notified no later than the time notice is provided to the individuals
- **Consumer notification content:** Description of the breach, type of PI involved, steps taken, contact information for the entity, and contact information for the FTC and major credit bureaus
- **Credit monitoring:** Required to offer **free credit monitoring for 1 year** when SSNs are compromised
- **Risk of harm exemption:** Yes — notification not required if, after an appropriate investigation, the entity reasonably determines that the breach is unlikely to result in harm
- **Encryption safe harbor:** Yes — encrypted data excluded unless encryption key was also acquired
- **Notable:** 2017 amendments significantly expanded the law, broadening the PI definition and adding specific content requirements; requires entities to provide notice to the AG before notifying individuals
- **Source:** [Del. Code tit. 6, § 12B-101 et seq.](https://delcode.delaware.gov/title6/c012b/index.html)

### District of Columbia

- **Statute:** D.C. Code §§ 28-3851 to 28-3853 (as amended by the Security Breach Protection Amendment Act of 2020)
- **Trigger:** Unauthorized acquisition of computerized or other electronic data, or any equipment or device storing such data, that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/ID, credit/debit card number, financial account number with access code, medical information, genetic information, health insurance information, biometric data, taxpayer ID, military ID. Standalone trigger: email/username + password/security question.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline); must not exceed that which is reasonable under the circumstances
- **AG notification:** Required for **any number** of DC residents — must notify the AG and provide information about the breach concurrently with or before notifying affected individuals
- **Consumer notification content:** Description of PI involved, contact information for the entity, toll-free numbers for credit bureaus, the FTC, and the DC AG's office
- **Credit monitoring:** Required to offer **free identity theft protection** for 18 months when SSNs are involved (under 2020 amendments)
- **Risk of harm exemption:** Yes — notification not required if, after a reasonable investigation, the entity reasonably determines that the breach will not likely result in harm
- **Encryption safe harbor:** Yes — encrypted data is excluded unless the encryption key was also compromised
- **Notable:** The 2020 amendments significantly expanded the law: broadened PI definition, added identity theft protection requirements, required notification to the DC AG for any number of affected residents; requires entities that experience a breach affecting 50+ DC residents to submit a detailed written report to the AG
- **Source:** [D.C. Code § 28-3851 et seq.](https://code.dccouncil.gov/us/dc/council/code/sections/28-3851)

### Florida

- **Statute:** Fla. Stat. §§ 501.171 (Florida Information Protection Act of 2014, "FIPA")
- **Trigger:** Unauthorized access of data in electronic form containing personal information
- **Personal information definition:** Name + SSN, DL/ID, financial account number with access code, medical information, health insurance information. Also includes: username/email + password/security question (standalone). Cross-reference usernames or email addresses in combination with any element that would permit access to an online account.
- **Notification timeline:** **30 days** after determination of breach or reason to believe a breach occurred — one of the strictest numeric deadlines
- **AG notification:** Required within 30 days if breach affects **500 or more individuals**; entities must provide the AG with detailed written information about the breach
- **Consumer notification content:** Must include a description of the incident in general terms, the type of information subject to unauthorized access, remedial actions taken, and contact information for credit bureaus
- **Credit monitoring:** Not mandated by FIPA — the statute does not require credit monitoring or identity theft services. Entities commonly offer them voluntarily, and the notice may describe any services offered.
- **Risk of harm exemption:** Yes — notification not required if, after an appropriate investigation and consultation with law enforcement, the entity reasonably determines that the breach has not and will not likely result in identity theft or any other financial harm
- **Encryption safe harbor:** Yes — encrypted data is excluded unless the encryption key was also accessed or acquired
- **Notable:** Among the strictest state laws: 30-day deadline with fines of $1,000/day for the first 30 days after violation and $50,000/day thereafter (up to $500,000); applies to "covered entities" broadly defined to include government entities and third-party agents; FIPA requires entities to take reasonable measures to protect data
- **Source:** [Fla. Stat. § 501.171](http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.171.html)

### Georgia

- **Statute:** Ga. Code §§ 10-1-910 to 10-1-912
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, password, medical/health insurance information (added by amendment). Relatively standard definition.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute
- **Consumer notification content:** Basic notice requirements; no highly prescriptive content mandates
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Partial — the trigger standard (compromise of "security, confidentiality, or integrity") provides an implicit threshold
- **Encryption safe harbor:** Yes — encrypted data is excluded
- **Notable:** Among the simpler statutes; no AG notification requirement; no private right of action; relatively narrow compared to newer state laws
- **Source:** [Ga. Code § 10-1-912](https://law.justia.com/codes/georgia/title-10/chapter-1/article-34/)

### Hawaii

- **Statute:** Haw. Rev. Stat. §§ 487N-1 to 487N-4
- **Trigger:** Unauthorized access to and acquisition of unencrypted or unredacted records or data containing personal information where illegal use of the personal information has occurred, or is reasonably likely to occur, and that creates a risk of harm to a person
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Also: government-issued ID and any access code required to access a financial account.
- **Notification timeline:** Without unreasonable delay, consistent with the legitimate needs of law enforcement and consistent with any measures necessary to determine the scope of the breach and restore integrity (no specific numeric deadline)
- **AG notification:** Office of Consumer Protection (not the AG) must be notified in writing, without unreasonable delay, when notice is provided to **more than 1,000 persons** at one time; nationwide CRAs must be notified at the same threshold (Haw. Rev. Stat. § 487N-2(f))
- **Consumer notification content:** Description of the incident, type of PI, steps the individual can take, contact information for the entity
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — built into the trigger (requires "risk of harm" and "illegal use has occurred or is reasonably likely to occur")
- **Encryption safe harbor:** Yes — unencrypted/unredacted data only
- **Notable:** Relatively narrow trigger requiring both unauthorized access AND acquisition plus a risk-of-harm/illegal-use standard; Office of Consumer Protection notice applies only at the more-than-1,000-person threshold; includes credit and debit card data in the financial account category
- **Source:** [Haw. Rev. Stat. § 487N-2](https://www.capitol.hawaii.gov/hrscurrent/Vol11_Ch0476-0490/HRS0487N/HRS_0487N-0002.htm)

### Idaho

- **Statute:** Idaho Code §§ 28-51-104 to 28-51-107
- **Trigger:** Unauthorized acquisition of computerized data that materially compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Standard baseline definition.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Public agencies only — an Idaho public agency must notify the AG within **24 hours** of discovery of a breach; commercial entities are not required to notify the AG (Idaho Code § 28-51-105(1))
- **Consumer notification content:** General notice; no highly prescriptive content mandates beyond basic information about the breach
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — the trigger requires "material" compromise, and notification to the AG is tied to "reasonably likely to have resulted in misuse"
- **Encryption safe harbor:** Yes — encrypted data is excluded
- **Notable:** The 24-hour AG notification applies only to public agencies (one of the shortest regulator deadlines anywhere); private entities face no AG-notice requirement and no specific individual-notice deadline; narrow PI definition
- **Source:** [Idaho Code § 28-51-105](https://legislature.idaho.gov/statutesrules/idstat/Title28/T28CH51/)

### Illinois

- **Statute:** 815 ILCS 530/ (Personal Information Protection Act); also 740 ILCS 14/ (Biometric Information Privacy Act — BIPA)
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, medical information, health insurance information, unique biometric data. Standalone trigger: username/email + password/security question.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required when notice must be given to **more than 500 Illinois residents** from a single breach; AG notice in the most expedient time possible and no later than when individuals are notified (815 ILCS 530/10)
- **Consumer notification content:** Must include information about the breach, the type of PI, what the entity is doing, and contact information for credit bureaus
- **Credit monitoring:** Not specifically mandated under the breach notification statute; however, offering credit monitoring is considered a best practice and may be factored into enforcement decisions
- **Risk of harm exemption:** Partial — trigger standard involves "compromise" of security/confidentiality/integrity
- **Encryption safe harbor:** Yes — encrypted data is excluded
- **Notable:** Illinois's **BIPA** provides a **private right of action** for violations involving biometric data (fingerprints, retina scans, voiceprints, etc.) with statutory damages of **$1,000 per negligent violation and $5,000 per intentional/reckless violation**. BIPA is among the most actively litigated privacy statutes in the US. The breach notification statute itself does not have a private right of action. AG notification applies at the more-than-500-resident threshold.
- **Source:** [815 ILCS 530/](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=2702), [740 ILCS 14/ (BIPA)](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004)

### Indiana

- **Statute:** Ind. Code §§ 24-4.9-1-1 to 24-4.9-5-1
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** Without unreasonable delay, but not more than **45 days** after discovery of the breach (HB 1351, effective July 1, 2022)
- **AG notification:** Required — must notify the AG of any breach. No specific minimum threshold for individual notification, but the AG must be notified.
- **Consumer notification content:** Must include a description of the breach, the type of PI, and contact information for credit bureaus and the FTC
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification to individuals is not required if, after an appropriate investigation, the entity determines that the breach will not likely result in identity deception, identity theft, or fraud
- **Encryption safe harbor:** Yes — encrypted data is excluded unless the encryption key was also acquired
- **Notable:** Relatively straightforward statute; AG must be notified without a threshold; narrow PI definition compared to more modern statutes; no private right of action
- **Source:** [Ind. Code § 24-4.9](https://iga.in.gov/laws/2024/ic/titles/24#24-4.9)

### Iowa

- **Statute:** Iowa Code §§ 715C.1 to 715C.2
- **Trigger:** Unauthorized acquisition of personal information that is reasonably believed to have caused or will cause loss or injury to any resident of Iowa
- **Personal information definition:** Name + SSN, DL or other government-issued unique identification number, financial account/credit/debit card number with required access code, unique electronic identifier or routing code with required access code, unique biometric data (fingerprint, retina/iris image, or other unique physical/digital representation)
- **Notification timeline:** In the most expeditious manner possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — written notice to the Consumer Protection Division of the AG's office within **5 business days** of giving notice to consumers, when the breach requires notification of **more than 500 Iowa residents**
- **Consumer notification content:** Must include description of breach, type of PI, steps taken, and contact information for credit bureaus
- **Credit monitoring:** Not specifically mandated by statute
- **Risk of harm exemption:** Yes — built into the trigger (must be "reasonably believed to have caused or will cause loss or injury")
- **Encryption safe harbor:** Yes — encrypted data is excluded unless the encryption key was also compromised
- **Notable:** The loss/injury trigger is a meaningful risk-of-harm standard; no numeric deadline for individual notice; Iowa's comprehensive privacy law (ICDPA, effective January 1, 2025) operates alongside but does not rewrite the breach statute; violations are unlawful practices enforceable by the AG
- **Source:** [Iowa Code § 715C.2](https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=715C)

### Kansas

- **Statute:** Kan. Stat. §§ 50-7a01 to 50-7a04
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Standard narrow baseline.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after a reasonable investigation, the entity determines that the breach will not likely result in misuse of information
- **Encryption safe harbor:** Yes — encrypted data is excluded
- **Notable:** Among the simpler statutes; no AG notification requirement; no specific numeric deadline; narrow PI definition; no private right of action
- **Source:** [Kan. Stat. § 50-7a02](https://www.ksrevisor.org/statutes/chapters/ch50/050_007a_0002.html)

### Kentucky

- **Statute:** Ky. Rev. Stat. §§ 365.720 to 365.734
- **Trigger:** Unauthorized acquisition of unencrypted, unredacted computerized data that compromises the security, confidentiality, or integrity of personally identifiable information and that actually causes, or leads the entity to reasonably believe has caused or will cause, identity theft or fraud against a Kentucky resident
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Standard narrow baseline.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not required for private entities under KRS 365.732 — no AG or regulator notice. Nationwide CRAs must be notified when more than 1,000 persons are notified at one time. State and local government agencies are subject to a separate regime (KRS 61.931 et seq.) requiring notice to the AG, Kentucky State Police, and Auditor of Public Accounts within 72 hours.
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after a reasonable and prompt investigation, the entity determines that the breach will not likely result in the misuse of PI
- **Encryption safe harbor:** Yes — encrypted data is excluded
- **Notable:** One of the minority of states with no regulator notification for private entities; the identity theft/fraud causation element narrows the trigger; the statute creates no penalties or new cause of action, though KRS 446.070 supplies a general damages theory for statutory violations
- **Source:** [Ky. Rev. Stat. § 365.732](https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=53998)

### Louisiana

- **Statute:** La. Rev. Stat. §§ 51:3071 to 51:3077 (Database Security Breach Notification Law)
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, passport number, biometric data. Standalone trigger: username/email + password/security question.
- **Notification timeline:** **60 days** after discovery of the breach (amended to add a numeric deadline)
- **AG notification:** Required — written notice to the Consumer Protection Section of the AG's office within **10 days** of distributing notice to Louisiana residents (La. Rev. Stat. § 51:3074(I)). No minimum threshold.
- **Consumer notification content:** Description of breach, type of PI involved, steps taken, toll-free contact numbers for credit bureaus, and the entity's contact information
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if after a reasonable investigation the entity determines that there is no reasonable likelihood of harm to the affected individuals
- **Encryption safe harbor:** Yes — encrypted data excluded unless encryption key was also compromised
- **Notable:** Amended multiple times; AG notification required regardless of the number of affected individuals; includes biometric data and passport in PI definition; penalties include actual damages and attorney's fees through AG enforcement
- **Source:** [La. Rev. Stat. § 51:3074](https://www.legis.la.gov/legis/Law.aspx?d=322030)

### Maine

- **Statute:** Me. Rev. Stat. tit. 10, §§ 1346 to 1350-B
- **Trigger:** Unauthorized acquisition, release, or use of an individual's computerized data containing personal information that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, account passwords/PINs, health insurance information, medical information. Standalone trigger: username/email + password/security question.
- **Notification timeline:** As expediently as possible and without unreasonable delay, but not to exceed **30 days** after the entity becomes aware of the breach and identifies its scope (10 M.R.S. § 1348) — among the shortest specific deadlines
- **AG notification:** Required for **any number** of Maine residents — entities regulated by the Department of Professional and Financial Regulation notify the appropriate regulators within that department; all others notify the AG
- **Consumer notification content:** Description of incident, type of PI, steps taken by the entity, general description of actions to protect against further breaches, toll-free numbers for credit bureaus, and advice to remain vigilant
- **Credit monitoring:** Not mandated by statute
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines that the breach will not likely result in misuse of PI
- **Encryption safe harbor:** Yes — encrypted data excluded unless encryption key was also acquired
- **Notable:** One of the shortest deadlines at 30 days; regulator/AG notification for any number of residents; CRA notice required when more than 1,000 persons are notified at one time; law-enforcement delay is capped at 7 business days after clearance
- **Source:** [Me. Rev. Stat. tit. 10, § 1348](https://legislature.maine.gov/statutes/10/title10sec1348.html)

### Maryland

- **Statute:** Md. Code, Com. Law §§ 14-3501 to 14-3508 (Maryland Personal Information Protection Act)
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, taxpayer ID, health information, health insurance information, biometric data, passport/government ID. Standalone trigger: username/email + password/security question.
- **Notification timeline:** As soon as reasonably practicable, but not later than **45 days** after discovery of the breach
- **AG notification:** Required — must notify the AG before notifying consumers. If breach affects **more than 1,000 individuals**, must also notify consumer reporting agencies.
- **Consumer notification content:** Description of breach, type of PI, contact information for entity, contact information for FTC and credit bureaus, advice on credit monitoring and fraud alerts
- **Credit monitoring:** Not mandated by statute
- **Risk of harm exemption:** Yes — notification not required if, after a good-faith investigation, the entity reasonably determines that the breach will not likely result in harm to the individual
- **Encryption safe harbor:** Yes — encrypted data excluded unless encryption key was also compromised
- **Notable:** Expanded significantly over time; 45-day deadline from discovery; AG must be notified before individuals; broad PI definition including biometric data, genetic information, and taxpayer ID
- **Source:** [Md. Code, Com. Law § 14-3504](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-3504)

### Massachusetts

- **Statute:** Mass. Gen. Laws ch. 93H, §§ 1-6
- **Trigger:** Unauthorized acquisition or unauthorized use of unencrypted data or encrypted electronic data and the confidential process or key that is capable of compromising the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Relatively narrow baseline, though Massachusetts has separate comprehensive data security regulations (201 CMR 17.00).
- **Notification timeline:** As soon as practicable and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the AG **and** the Director of Consumer Affairs and Business Regulation. Must notify both **at the same time** as notifying individuals. No minimum threshold.
- **Consumer notification content:** Prescriptive requirements: right to obtain a police report, how to request a credit freeze, contact information for credit bureaus, and information about the entity's consumer response. Must use a specific form designated by the AG.
- **Credit monitoring:** Required to offer **18 months of free credit monitoring** when SSNs are compromised (one of the longest mandated periods)
- **Risk of harm exemption:** No explicit risk-of-harm exemption — the statute requires notification when PI is acquired or used without authorization. However, the "compromises security, confidentiality, or integrity" language provides some threshold.
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** Must use the AG's designated notification form; **18-month credit monitoring** requirement for SSN breaches is among the longest; must notify both the AG and the Director of Consumer Affairs simultaneously with individuals; separate data security regulation (201 CMR 17.00) requires a comprehensive written information security program (WISP); no private right of action in the breach notification statute but Chapter 93A unfair practices claims are available
- **Source:** [Mass. Gen. Laws ch. 93H](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXV/Chapter93H)

### Michigan

- **Statute:** Mich. Comp. Laws §§ 445.63, 445.72 (Michigan Identity Theft Protection Act)
- **Trigger:** Unauthorized access to and acquisition of data that compromises the security or confidentiality of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, demand deposit account, savings account, or other financial account number. Narrow baseline.
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute (no mandatory AG notification provision)
- **Consumer notification content:** Description of the breach, type of PI, and remedial actions
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Partial — requires both unauthorized access AND acquisition, which narrows the trigger somewhat; also requires that the breach "compromises the security or confidentiality"
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** Requires both access AND acquisition (not just one or the other), which is a narrower trigger than many states; no AG notification requirement; no specific numeric deadline; relatively narrow PI definition; no private right of action
- **Source:** [Mich. Comp. Laws § 445.72](https://www.legislature.mi.gov/(S(m1sfqk4bm0lxdmrqcytlkm34))/mileg.aspx?page=GetObject&objectname=mcl-445-72)

### Minnesota

- **Statute:** Minn. Stat. §§ 325E.61, 325E.64
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute for general breaches; however, notification to consumer reporting agencies is required if more than 500 individuals are affected
- **Consumer notification content:** Basic notice; no highly prescriptive requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after an investigation, the entity determines in good faith that the breach will not likely result in harm
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** Includes specific provisions for notification in the event of a breach of card account numbers — must notify the card issuer; this makes Minnesota significant for financial institution and merchant breach obligations; otherwise a relatively straightforward statute
- **Source:** [Minn. Stat. § 325E.61](https://www.revisor.mn.gov/statutes/cite/325E.61)

### Mississippi

- **Statute:** Miss. Code §§ 75-24-29
- **Trigger:** Unauthorized acquisition of electronic files, media, databases, or computerized data containing personal information that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the AG within the same timeframe as individual notification. No minimum threshold specified.
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity reasonably determines that the breach does not create a material risk of harm
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** Enacted in 2010, it was among the last states to pass a breach notification law; relatively simple statute; AG notification with no threshold; narrow PI definition
- **Source:** [Miss. Code § 75-24-29](https://law.justia.com/codes/mississippi/title-75/chapter-24/in-general/section-75-24-29/)

### Missouri

- **Statute:** Mo. Rev. Stat. § 407.1500
- **Trigger:** Unauthorized acquisition of personal information that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL or other government-created unique ID number, financial account/credit/debit card number with required access code, unique electronic identifier or routing code with required access code, medical information, health insurance information
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required only when notice is provided to **more than 1,000 consumers** at one time — notify the AG's office and nationwide CRAs of the timing, distribution, and content of the notice
- **Consumer notification content:** Description of breach, type of PI, contact information for entity, contact information for credit bureaus, and steps the individual can take
- **Credit monitoring:** Not mandated by statute
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines that the breach will not likely result in misuse of information
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** PI definition includes medical and health insurance information; the AG has exclusive enforcement authority, with civil penalties up to **$150,000** per breach (or series of similar breaches discovered in a single investigation); no numeric deadline for individual notice
- **Source:** [Mo. Rev. Stat. § 407.1500](https://revisor.mo.gov/main/OneSection.aspx?section=407.1500)

### Montana

- **Statute:** Mont. Code §§ 30-14-1701 to 30-14-1705
- **Trigger:** Unauthorized acquisition of computerized data that materially compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, medical record information, taxpayer ID, military ID. Standalone trigger: username/email + password/security question.
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the AG. No minimum threshold specified. AG must be notified at the same time as individuals.
- **Consumer notification content:** Description of the incident, type of PI, entity contact information, and toll-free numbers for credit bureaus
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — the trigger requires "material" compromise, which serves as a risk threshold
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** "Material" compromise standard in the trigger is a meaningful risk threshold; AG notification with no minimum threshold; expanded PI definition to include medical records, taxpayer ID, military ID; no private right of action
- **Source:** [Mont. Code § 30-14-1704](https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0170/section_0040/0300-0140-0170-0040.html)

### Nebraska

- **Statute:** Neb. Rev. Stat. §§ 87-801 to 87-808
- **Trigger:** Unauthorized acquisition of unencrypted computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, unique biometric data, username + password. Standalone trigger for credentials.
- **Notification timeline:** As soon as possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the AG concurrently with or before notice to affected residents. No minimum threshold.
- **Consumer notification content:** Description of the breach, type of PI, toll-free numbers for credit bureaus, contact information for the entity
- **Credit monitoring:** Not specifically mandated
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines that the breach will not likely result in harm
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** Updated to include biometric data and standalone credential triggers; AG notification required for any number of affected residents (added 2016)
- **Source:** [Neb. Rev. Stat. § 87-803](https://nebraskalegislature.gov/laws/statutes.php?statute=87-803)

### Nevada

- **Statute:** Nev. Rev. Stat. §§ 603A.010 to 603A.920
- **Trigger:** Unauthorized acquisition of computerized data that materially compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, medical identification number, health insurance ID. Standalone trigger: username/email + password/security question.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute for general breaches (data collectors notifying individuals must also offer to notify the AG on the individual's behalf, but there is no mandatory direct AG notification provision)
- **Consumer notification content:** Description of the breach, toll-free numbers for credit bureaus, and advice on placing fraud alerts
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — the trigger requires "material" compromise
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Notable:** Nevada has a separate opt-out right for the sale of personal information (Nev. Rev. Stat. § 603A.345), making it an early mover on privacy beyond breach notification; the "material" compromise standard provides a meaningful threshold; no private right of action for breach notification
- **Source:** [Nev. Rev. Stat. § 603A.220](https://www.leg.state.nv.us/nrs/NRS-603A.html#NRS603ASec220)

### New Hampshire

- **Statute:** N.H. Rev. Stat. §§ 359-C:19 to 359-C:21
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security or confidentiality of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** As soon as possible (no specific numeric deadline)
- **AG notification:** Required — must notify the AG **as soon as possible** and **prior to** notifying individuals
- **Consumer notification content:** Must include a description of the incident, approximate date, type of PI, toll-free numbers for credit bureaus, and steps the individual can take
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines that misuse of the information has not occurred and is not reasonably likely to occur
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** AG must be notified before individuals; no minimum threshold for AG notification; relatively narrow PI definition; the pre-notification requirement to the AG is significant for breach response timelines
- **Source:** [N.H. Rev. Stat. § 359-C:20](https://www.gencourt.state.nh.us/rsa/html/XXXI/359-C/359-C-20.htm)

### New Jersey

- **Statute:** N.J. Stat. §§ 56:8-161 to 56:8-166
- **Trigger:** Unauthorized access to electronic files, media, or databases containing personal information that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Also: dissociated data that could be assembled to read as PI. Standalone trigger: username/email + password/security question.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the Division of State Police **before** notifying individuals. No minimum threshold.
- **Consumer notification content:** Must include the type of PI breached, identity theft prevention information, and contact information for the entity and credit bureaus
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** No explicit risk-of-harm exemption. The standard is broad: unauthorized access that "compromises" the data triggers notification.
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also accessed
- **Notable:** Must notify the Division of State Police (not just the AG) before notifying individuals; the inclusion of "dissociated data that could be assembled" is unusually broad; no explicit risk-of-harm exemption makes New Jersey stricter than many states; no private right of action but CFA (Consumer Fraud Act) claims may be available
- **Source:** [N.J. Stat. § 56:8-163](https://law.justia.com/codes/new-jersey/title-56/section-56-8-163/)

### New Mexico

- **Statute:** N.M. Stat. §§ 57-12C-1 to 57-12C-12 (Data Breach Notification Act of 2017)
- **Trigger:** Unauthorized acquisition of unencrypted computerized data, or encrypted computerized data and the encryption key, that compromises the security, confidentiality, or integrity of personal identifying information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, biometric data, health information, health insurance information. Standalone trigger: username/email + password/security question.
- **Notification timeline:** **45 days** after discovery of the breach
- **AG notification:** Required within 45 days if breach affects **more than 1,000 New Mexico residents**; must also notify consumer reporting agencies
- **Consumer notification content:** Description of the breach, type of PI, date or range of dates, contact information for credit bureaus, entity contact, and steps the individual can take
- **Credit monitoring:** Not specifically mandated
- **Risk of harm exemption:** Yes — notification not required if, after a reasonable investigation, the entity determines that the breach does not give rise to a significant risk of identity theft or fraud
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Notable:** Enacted in 2017 (one of the later states); 45-day deadline; includes biometric data and health information in PI definition; covers government entities; AG notification at the 1,000-resident threshold
- **Source:** [N.M. Stat. § 57-12C-6](https://nmonesource.com/nmos/nmsa/en/item/4403/index.do#!b/57-12C-6)

### New York

- **Statute:** N.Y. Gen. Bus. Law § 899-aa; N.Y. State Tech. Law § 208 (government entities); SHIELD Act (Stop Hacks and Improve Electronic Data Security Act, 2019); December 2024 amendments
- **Trigger:** Unauthorized acquisition or access of computerized data that compromises the security, confidentiality, or integrity of private information. The SHIELD Act broadened the trigger from "unauthorized acquisition" to include "unauthorized access."
- **Personal information definition:** Expansive under the SHIELD Act. Name + SSN, DL/state ID, financial account number with access code, biometric data, username/email + password/security question. Also: **any of the following standing alone** (no name required): SSN, DL number, financial account number with access code, biometric data, username/email + password/security question. The SHIELD Act also added: credit/debit card number without a required security code (the number alone is sufficient). 2024 amendments added **medical information and health insurance information** to the definition (effective March 21, 2025).
- **Notification timeline:** In the most expedient time possible and without unreasonable delay, but no later than **30 days** after discovery of the breach (December 2024 amendment, effective December 21, 2024)
- **AG notification:** Required — must notify the AG, the Department of State (Division of Consumer Protection), and the Division of State Police. Must notify all three agencies for **any number** of affected New York residents. NY DFS-regulated entities must **also notify the Department of Financial Services** (December 2024 amendment, as clarified February 2025). If breach affects **more than 5,000 New York residents**, must also notify consumer reporting agencies.
- **Consumer notification content:** Must include contact information for the entity, telephone numbers and websites of the major credit reporting agencies, and the FTC and AG's office
- **Credit monitoring:** Not specifically mandated by statute, but the AG has strongly recommended it and enforcement actions have included credit monitoring as part of settlements
- **Risk of harm exemption:** No explicit risk-of-harm exemption under the SHIELD Act. If PI is accessed or acquired without authorization and security/confidentiality/integrity is compromised, notification is required.
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also accessed or acquired
- **Notable:** The **SHIELD Act** (2019) is among the most significant state-level expansions. It (1) broadened PI to include biometric data and standalone data elements (SSN alone, without a name), (2) broadened the trigger from "acquisition" to "access," (3) imposed **reasonable security requirements** on any entity holding private information of New York residents (administrative, technical, and physical safeguards). The **December 2024 amendments** added a hard 30-day consumer notification deadline, expanded PI to medical and health insurance information, and added DFS notification for DFS-regulated entities. No private right of action, but the AG has broad enforcement powers and has been aggressive. Must notify **three separate state agencies** (four for DFS-regulated entities). The broad definitions mean more incidents qualify as notifiable breaches.
- **Source:** [N.Y. Gen. Bus. Law § 899-aa](https://www.nysenate.gov/legislation/laws/GBS/899-AA), [SHIELD Act (S.5575B)](https://www.nysenate.gov/legislation/bills/2019/s5575)

### North Carolina

- **Statute:** N.C. Gen. Stat. §§ 75-61, 75-65
- **Trigger:** Unauthorized acquisition of unencrypted and unredacted records or data containing personal information where illegal use of the personal information has occurred or is reasonably likely to occur, or that creates a material risk of harm to a consumer
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, employer-assigned ID with authentication data, digital signature, biometric data, fingerprints. Standalone trigger: email + password/security question.
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the AG's Consumer Protection Division within the same timeframe. No minimum threshold.
- **Consumer notification content:** Description of incident, type of PI, general acts taken, toll-free numbers for credit bureaus, and contact information for AG and FTC
- **Credit monitoring:** Not mandated by statute (bills proposing a credit monitoring mandate have not been enacted)
- **Risk of harm exemption:** Yes — built into the trigger (must be "reasonably likely" to result in illegal use or create "material risk of harm")
- **Encryption safe harbor:** Yes — encrypted and redacted data excluded
- **Notable:** Trigger requires either illegal use or material risk of harm; AG (Consumer Protection Division) notification with no threshold; CRA notice when more than 1,000 persons are notified; includes digital signature and biometric data
- **Source:** [N.C. Gen. Stat. § 75-65](https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_75/GS_75-65.html)

### North Dakota

- **Statute:** N.D. Cent. Code §§ 51-30-01 to 51-30-07
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, DOB (in combination with name and another element), health insurance information, medical information, employee ID with authentication data. Standalone trigger: username/email + password/security question.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the AG if breach affects **250 or more North Dakota residents** (one of the lower thresholds)
- **Consumer notification content:** Description of breach, type of PI, and contact information for credit bureaus
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines that the breach is not likely to cause a significant risk of harm
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Notable:** Lower AG notification threshold (250 residents) than most states; includes DOB as a PI element; expanded definition includes health insurance and medical information; no private right of action
- **Source:** [N.D. Cent. Code § 51-30-02](https://www.ndlegis.gov/cencode/t51c30.pdf)

### Ohio

- **Statute:** Ohio Rev. Code §§ 1349.19, 1349.191, 1349.192
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security or confidentiality of personal information and that causes or is reasonably believed to cause a material risk of identity theft or other fraud
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** **45 days** after discovery or notification of the breach (whichever is earlier)
- **AG notification:** Not specifically required by statute for general breaches; however, must notify consumer reporting agencies if breach affects **more than 1,000 individuals**
- **Consumer notification content:** Description of breach, type of PI, and toll-free numbers for credit bureaus
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — built into the trigger (must cause or be "reasonably believed to cause a material risk of identity theft or other fraud")
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** The Ohio Data Protection Act (Ohio Rev. Code § 1354.01 et seq.) provides an affirmative defense to tort claims for entities that maintain a cybersecurity program conforming to recognized frameworks (NIST, ISO 27001, etc.); 45-day deadline; risk-of-harm standard in the trigger; narrow PI definition
- **Source:** [Ohio Rev. Code § 1349.19](https://codes.ohio.gov/ohio-revised-code/section-1349.19)

### Oklahoma

- **Statute:** Okla. Stat. tit. 24, §§ 161 to 166 (Oklahoma Security Breach Notification Act, substantially amended by SB 626, effective January 1, 2026)
- **Trigger:** Unauthorized access and acquisition of unencrypted and unredacted computerized data that causes, or that the entity reasonably believes has caused or will cause, identity theft or other fraud to a resident
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, unique biometric data (fingerprints, retinal scans, and similar identifiers — added by SB 626). Standalone-credential element: electronic identification number or email address in combination with a password or security question that permits access to an online account (added by SB 626).
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required when **500 or more Oklahoma residents** must be notified — notify the AG without unreasonable delay and no later than **60 days** after providing notice to residents (SB 626; before January 1, 2026 there was no AG-notice requirement). Credit bureaus must be notified when a breach involves more than 1,000 residents.
- **Consumer notification content:** General notice; no highly prescriptive content mandates
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — the identity theft/fraud causation element in the trigger functions as a risk-of-harm threshold
- **Encryption safe harbor:** Yes — encrypted and redacted data excluded
- **Notable:** SB 626 (effective January 1, 2026) overhauled the law: expanded PI definition (biometrics, online account credentials), first-time AG notice at the 500-resident threshold, credit bureau notice above 1,000 residents, and an **affirmative defense in civil actions** for entities maintaining "reasonable safeguards" (risk assessments, layered technical and physical defenses, employee training, an incident response plan); no private right of action
- **Source:** [Okla. Stat. tit. 24, § 163](https://law.justia.com/codes/oklahoma/title-24/section-24-163/)

### Oregon

- **Statute:** Or. Rev. Stat. §§ 646A.600 to 646A.628 (Oregon Consumer Identity Theft Protection Act)
- **Trigger:** Unauthorized acquisition of computerized data that materially compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, passport number, financial account number with access code, biometric data, health insurance information, medical information. Standalone trigger: username/email + password/security question. Also includes data that would be sufficient to enable a person to commit identity theft against a consumer.
- **Notification timeline:** **45 days** after discovery or notification that a breach has occurred
- **AG notification:** Required within 45 days if breach affects **more than 250 Oregon residents** (one of the lowest AG notification thresholds)
- **Consumer notification content:** Description of the incident, type of PI, contact information for the entity, contact information for the FTC and credit bureaus, advice on placing fraud alerts and credit freezes
- **Credit monitoring:** Not specifically mandated, but if SSNs are breached, the AG has recommended it
- **Risk of harm exemption:** Partial — the trigger requires "material" compromise, which serves as a threshold
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Notable:** One of the **lowest AG notification thresholds (250 residents)** in the country; 45-day deadline; broad PI definition including passport, biometric data, and health information; applies to entities that own, maintain, or otherwise possess PI of Oregon consumers; no private right of action but AG enforcement
- **Source:** [Or. Rev. Stat. § 646A.604](https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html)

### Pennsylvania

- **Statute:** 73 Pa. Stat. §§ 2301 to 2329 (Breach of Personal Information Notification Act, as amended by Act 151 of 2022 (effective May 2023) and Act 33 of 2024/SB 824 (effective September 26, 2024))
- **Trigger:** Unauthorized access and acquisition of computerized data that materially compromises the security or confidentiality of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, medical information, health insurance information. Standalone trigger: username/email + password/security question (expansions added by Act 151 of 2022).
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline for private entities; shorter fixed deadlines apply to state agencies, contractors, and political subdivisions)
- **AG notification:** Required when **more than 500 Pennsylvania residents** must be notified — notice to the AG concurrent with individual notice, submitted through the AG's online breach-reporting portal (Act 33 of 2024). If breach affects **more than 1,000 individuals**, must also notify consumer reporting agencies.
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Required — **12 months of free credit monitoring** plus access to one free independent credit report when the breach involves a name combined with SSN, driver's license/state ID number, or bank account number (Act 33 of 2024; first state to extend a monitoring mandate to driver's license and bank account breaches)
- **Risk of harm exemption:** Yes — the trigger requires that the breach "materially compromises" security/confidentiality, and the statute requires both access AND acquisition
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** Requires both "access and acquisition" (not just one), which narrows the trigger; "materially compromises" standard also provides a threshold; the 2022-2024 amendments modernized a formerly minimal statute — expanded PI definition, AG notice at the 500-resident threshold, and a novel credit monitoring/credit report mandate; still no numeric deadline for private-entity individual notice
- **Source:** [73 Pa. Stat. § 2303](https://www.legis.state.pa.us/cfdocs/legis/LI/uconsCheck.cfm?txtType=HTM&yr=2005&sessInd=0&smthLwInd=0&act=094)

### Rhode Island

- **Statute:** R.I. Gen. Laws §§ 11-49.3-1 to 11-49.3-6 (Identity Theft Protection Act of 2015)
- **Trigger:** Unauthorized acquisition of unencrypted computerized data, or encrypted data with the encryption key, that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, medical information, health insurance information, email + password/security question (standalone).
- **Notification timeline:** **45 days** after confirmation of the breach and determination of affected individuals
- **AG notification:** Required within 45 days if breach affects **more than 500 Rhode Island residents**
- **Consumer notification content:** Must include dates of the breach and discovery, description of PI, toll-free numbers for credit bureaus, and contact information for the entity
- **Credit monitoring:** Not mandated — but the individual notice must include a clear description of any remediation services offered (including credit monitoring, if offered)
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Risk of harm exemption:** No explicit risk-of-harm exemption — if PI is acquired without authorization and security is compromised, notification is required
- **Notable:** 2015 act significantly modernized Rhode Island's breach notification requirements; 45-day deadline; no explicit risk-of-harm exemption makes it stricter than many states; expanded PI definition; AG and CRA notification at the more-than-500-resident threshold, without delaying notice to residents
- **Source:** [R.I. Gen. Laws § 11-49.3-4](https://law.justia.com/codes/rhode-island/title-11/chapter-11-49.3/)

### South Carolina

- **Statute:** S.C. Code §§ 39-1-90 (South Carolina breach notification law); also S.C. Code § 38-99-10 et seq. (Insurance Data Security Act)
- **Trigger:** Unauthorized acquisition of unencrypted, unredacted computerized data containing personal identifying information, when illegal use of the information has occurred or is reasonably likely to occur, or when use of the information creates a material risk of harm to the resident
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Also includes data elements that would be sufficient to commit identity theft. Narrow baseline for general statute; Insurance Data Security Act has additional requirements for insurers.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** No AG notice. When notice is provided to **more than 1,000 persons** at one time, must notify the Consumer Protection Division of the SC Department of Consumer Affairs and nationwide CRAs, without unreasonable delay.
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated by statute
- **Risk of harm exemption:** Yes — built into the trigger (illegal use occurred/likely or material risk of harm)
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** Regulator notice runs to the Department of Consumer Affairs (not the AG) and only at the more-than-1,000-person threshold; knowing and willful violations carry administrative fines of $1,000 per affected resident; separate Insurance Data Security Act imposes additional requirements on insurers and insurance licensees
- **Source:** [S.C. Code § 39-1-90](https://www.scstatehouse.gov/code/t39c001.php)

### South Dakota

- **Statute:** S.D. Codified Laws §§ 22-40-19 to 22-40-26
- **Trigger:** Unauthorized acquisition of unencrypted computerized data or encrypted computerized data and the encryption key that materially compromises the security, confidentiality, or integrity of personal or protected information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, health information, employee ID with authentication data, biometric data. Standalone trigger: username/email + password/security question.
- **Notification timeline:** **60 days** after discovery of the breach
- **AG notification:** Required if breach affects **more than 250 South Dakota residents** (one of the lower thresholds); disclosure to the AG by mail or email
- **Consumer notification content:** Must include a description of the breach, type of PI, remedial actions, contact information for the entity, and toll-free numbers for credit bureaus
- **Credit monitoring:** Not specifically mandated
- **Risk of harm exemption:** Yes — notification to residents not required if, following an appropriate investigation **and notice to the AG**, the entity reasonably determines the breach will not likely result in harm (the harm exemption itself requires AG notice)
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Notable:** South Dakota was one of the last two states (with Alabama) to enact a breach notification law (2018); 60-day deadline; lower AG notification threshold (more than 250 residents); includes biometric data and health information; no private right of action
- **Source:** [S.D. Codified Laws § 22-40-21](https://sdlegislature.gov/Statutes/22-40-21)

### Tennessee

- **Statute:** Tenn. Code §§ 47-18-2107 (Tennessee Identity Theft Deterrence Act)
- **Trigger:** Unauthorized acquisition of computerized data that materially compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Also: health insurance information, medical information, taxpayer ID. Standalone trigger: username/email + password/security question (added by amendment).
- **Notification timeline:** **45 days** after discovery of the breach (amended to add numeric deadline)
- **AG notification:** Not specifically required by statute for general breaches; however, must notify consumer reporting agencies if breach affects **more than 1,000 individuals**
- **Consumer notification content:** Description of breach, type of PI, toll-free numbers for credit bureaus, and contact information for the entity
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — the "materially compromises" standard serves as a threshold
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** 45-day deadline (added by amendment); "material" compromise standard; expanded PI definition to include health insurance, medical information, and taxpayer ID; no private right of action under the notification statute — and a separate 2024 law (Tenn. Code Ann. § 29-34-215, HB 2434) bars class actions arising from a cybersecurity event unless caused by the entity's gross negligence or willful and wanton misconduct
- **Source:** [Tenn. Code § 47-18-2107](https://law.justia.com/codes/tennessee/title-47/chapter-18/part-21/section-47-18-2107/)

### Texas

- **Statute:** Tex. Bus. & Com. Code §§ 521.002, 521.053
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of sensitive personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, health insurance information, medical information. Standalone trigger: information that identifies an individual and relates to physical or mental health, provision of or payment for healthcare, or an individual's health insurance. Also: username/email + password/security question.
- **Notification timeline:** As quickly as possible and without unreasonable delay, but no later than **60 days** after determination of the breach
- **AG notification:** Required **as soon as practicable and not later than 30 days** after determination (shortened from 60 days by SB 768, effective September 1, 2023) if breach affects **250 or more Texas residents** (one of the lower thresholds); must be submitted via the electronic form on the AG's website
- **Consumer notification content:** Description of the circumstances, type of PI, steps the entity has taken, advice on monitoring credit reports, and contact information for credit bureaus
- **Credit monitoring:** Not mandated by statute, but the AG has frequently included credit monitoring in enforcement settlements
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines that the breach will not likely result in harm
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** 60-day consumer deadline (30-day AG deadline) with penalties of **$100 to $250,000 per violation**; lower AG notification threshold of 250 residents; the AG publishes reported breaches on a public website; the Texas CUBI Act (Tex. Bus. & Com. Code § 503.001) provides AG enforcement for biometric identifier violations; AG has been active in enforcement; applies to any entity conducting business in Texas, regardless of size
- **Source:** [Tex. Bus. & Com. Code § 521.053](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.521.htm)

### Utah

- **Statute:** Utah Code §§ 13-44-101 to 13-44-301 (Protection of Personal Information Act)
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — when a breach affects **500 or more Utah residents**, must notify the Office of the Attorney General and the **Utah Cyber Center** (SB 127, 2023). Notification to credit reporting agencies is required if breach affects 1,000 or more residents.
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines in good faith that the breach will not likely result in harm
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** Narrow PI definition; 2023 amendments (SB 127) added AG and Utah Cyber Center reporting at the 500-resident threshold; Utah's Cybersecurity Affirmative Defense Act (2021) gives entities with a written cybersecurity program conforming to a recognized framework an affirmative defense to breach-related tort claims; the Utah Consumer Privacy Act (UCPA, effective December 2023) adds comprehensive privacy obligations but does not modify the breach notification statute significantly; no private right of action
- **Source:** [Utah Code § 13-44-202](https://le.utah.gov/xcode/Title13/Chapter44/13-44-S202.html)

### Vermont

- **Statute:** Vt. Stat. tit. 9, §§ 2430, 2435 (Security Breach Notice Act)
- **Trigger:** Unauthorized acquisition of electronic data or a reasonable belief that electronic data has been acquired by an unauthorized person, that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, login credentials for an online account. Also includes: any of the following when connected to an identifiable individual: passport number, military ID, taxpayer ID, biometric data, health records, health insurance information, genetic information.
- **Notification timeline:** **45 days** after discovery or notification of the breach
- **AG notification:** Required within **14 business days** after discovery or notification if breach affects **any number** of Vermont residents — one of the most aggressive AG notification timelines in the country
- **Consumer notification content:** Description of breach, type of PI, dates, toll-free numbers for credit bureaus, and contact information for the entity
- **Credit monitoring:** Not specifically mandated
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity reasonably concludes that the breach will not result in harm
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Notable:** **14-business-day AG notification deadline** is one of the shortest in the country and is independent of the 45-day individual notification deadline; AG notification required for any number of residents; "reasonable belief" trigger (not just actual acquisition) is broader than many states; includes passport, military ID, taxpayer ID, biometric data, health records, and genetic information; Vermont AG has been active in breach enforcement
- **Source:** [Vt. Stat. tit. 9, § 2435](https://legislature.vermont.gov/statutes/section/09/062/02435)

### Virginia

- **Statute:** Va. Code §§ 18.2-186.6 (breach notification); Va. Code § 32.1-127.1:05 (health records)
- **Trigger:** Unauthorized acquisition of unencrypted and unredacted computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, passport number, military ID. Standalone trigger: username/email + password/security question.
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Required — must notify the AG. If breach affects **more than 1,000 Virginia residents**, must also notify consumer reporting agencies.
- **Consumer notification content:** Description of the incident, type of PI, general description of protective actions, and contact information for the entity
- **Credit monitoring:** Not mandated by statute
- **Risk of harm exemption:** Yes — notification not required if, after a reasonable investigation, the entity reasonably believes that the breach will not cause undue harm or identity theft
- **Encryption safe harbor:** Yes — encrypted and redacted data excluded
- **Notable:** Includes passport and military ID in PI definition; separate health records breach notification provisions; the Virginia Consumer Data Protection Act (VCDPA) adds comprehensive privacy obligations but does not fundamentally alter the breach notification framework; AG notification with no threshold
- **Source:** [Va. Code § 18.2-186.6](https://law.lis.virginia.gov/vacode/title18.2/chapter6/section18.2-186.6/)

### Washington

- **Statute:** Wash. Rev. Code §§ 19.255.010, 19.255.020 (as amended 2019)
- **Trigger:** Unauthorized acquisition of data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, full date of birth, health insurance ID/subscriber number, medical/health information, biometric data, student/military/passport number. Standalone trigger: username/email + password/security question.
- **Notification timeline:** **30 days** after discovery of the breach — one of the shortest deadlines
- **AG notification:** Required within 30 days if breach affects **more than 500 Washington residents**; must submit a written notification to the AG including a list of the types of PI affected, timeframe, and steps taken
- **Consumer notification content:** Must include name and contact information for the entity, a list of the types of PI breached, the timeframe of exposure, a summary of steps taken, advice on monitoring credit, and toll-free numbers for credit bureaus
- **Credit monitoring:** Not specifically mandated by statute
- **Risk of harm exemption:** Yes — notification not required if, after a prompt investigation, the entity reasonably determines that the breach will not result in harm to the individuals
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also acquired
- **Notable:** 2019 amendments significantly expanded the law: **30-day deadline from discovery** is among the shortest; very broad PI definition including full DOB, student ID, military ID, passport number, biometric data, and health information; requires the entity to maintain detailed breach records; AG has been active in enforcement; no private right of action but AG enforcement is robust
- **Source:** [Wash. Rev. Code § 19.255.010](https://app.leg.wa.gov/RCW/default.aspx?cite=19.255.010)

### West Virginia

- **Statute:** W. Va. Code §§ 46A-2A-101 to 46A-2A-105
- **Trigger:** Unauthorized access and acquisition of unencrypted and unredacted computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** Without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — notification not required if, after investigation, the entity determines that the breach will not likely result in harm
- **Encryption safe harbor:** Yes — encrypted and redacted data excluded
- **Notable:** Requires both unauthorized access AND acquisition (not just one), which is a narrower trigger than many states; narrow PI definition; no AG notification requirement; relatively simple statute; no private right of action
- **Source:** [W. Va. Code § 46A-2A-102](https://www.wvlegislature.gov/WVCODE/code.cfm?chap=46a&art=2A)

### Wisconsin

- **Statute:** Wis. Stat. § 134.98
- **Trigger:** Unauthorized acquisition of personal information that materially compromises the security, confidentiality, or integrity of the information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, DNA profile, unique biometric data. Also: employee ID with authentication data.
- **Notification timeline:** **45 days** after the entity learns of the breach (amended to add specific deadline)
- **AG notification:** Not specifically required by statute, but if breach affects more than 1,000 individuals, consumer reporting agencies must be notified
- **Consumer notification content:** Description of the breach, type of PI, the period during which the information was in the entity's custody, contact information for the entity, and toll-free numbers for credit bureaus
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — "materially compromises" standard provides a threshold
- **Encryption safe harbor:** Yes — the statute applies only if the data has not been encrypted
- **Notable:** 45-day deadline; includes DNA profile and unique biometric data in PI definition; "material" compromise standard is a meaningful threshold; no AG notification requirement; no private right of action
- **Source:** [Wis. Stat. § 134.98](https://docs.legis.wisconsin.gov/statutes/statutes/134/98)

### Wyoming

- **Statute:** Wyo. Stat. §§ 40-12-501 to 40-12-502
- **Trigger:** Unauthorized acquisition of computerized data that materially compromises the security, confidentiality, or integrity of personal identifying information
- **Personal information definition:** Name + SSN, DL/state ID, financial account number with access code, tribal ID, federal/state government-issued ID, health insurance ID, medical information, biometric data, username/email + password/security question, shared secrets/security tokens for authentication. Also includes: individual taxpayer ID number, passport number.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required by statute
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Yes — "materially compromises" standard provides a threshold
- **Encryption safe harbor:** Yes — encrypted data excluded unless the encryption key was also compromised
- **Notable:** Broad PI definition for a less-populated state: includes tribal ID, health insurance ID, medical information, biometric data, shared secrets, and security tokens; "materially compromises" standard; no AG notification requirement; no private right of action
- **Source:** [Wyo. Stat. § 40-12-502](https://law.justia.com/codes/wyoming/title-40/chapter-12/article-5/section-40-12-502/)

### Guam

- **Statute:** 9 Guam Code Ann. §§ 48.10 to 48.80
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/ID, financial account number with access code. Narrow baseline modeled on early state statutes.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay
- **AG notification:** Not specifically required
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Partial — trigger standard involves "compromise" of security/confidentiality/integrity
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** Follows the framework of early mainland state statutes; narrow definition; limited enforcement infrastructure
- **Source:** [9 GCA § 48.30](https://law.justia.com/codes/guam/title-9/division-4/chapter-48/)

### Puerto Rico

- **Statute:** P.R. Laws tit. 10, §§ 4051 to 4055 (Citizen Information on Data Banks Security Act)
- **Trigger:** Unauthorized access to and acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information maintained by the entity
- **Personal information definition:** Name + SSN, DL/ID, financial account number with access code, tax identification number, passport. Includes government-issued ID broadly.
- **Notification timeline:** As expeditiously as possible and without unreasonable delay (no specific numeric deadline)
- **AG notification:** Not specifically required; however, the Puerto Rico Department of Consumer Affairs (DACO) may assert jurisdiction under consumer protection authority
- **Consumer notification content:** General notice requirements; notice must be written in both English and Spanish where appropriate
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Partial — trigger requires both access AND acquisition that "compromises" the data
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** Requires both access AND acquisition; includes passport and tax ID; notice may need to be bilingual (English/Spanish); enforcement through DACO and general consumer protection authority; limited case law and enforcement history
- **Source:** [P.R. Laws tit. 10, § 4051 et seq.](https://bvirtualogp.pr.gov/)

### US Virgin Islands

- **Statute:** V.I. Code tit. 14, §§ 2208 to 2212
- **Trigger:** Unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of personal information
- **Personal information definition:** Name + SSN, DL/ID, financial account number with access code. Narrow baseline.
- **Notification timeline:** In the most expedient time possible and without unreasonable delay
- **AG notification:** Not specifically required by statute
- **Consumer notification content:** General notice requirements
- **Credit monitoring:** Not mandated
- **Risk of harm exemption:** Partial — trigger standard involves compromise of security/confidentiality/integrity
- **Encryption safe harbor:** Yes — encrypted data excluded
- **Notable:** Modeled on early mainland state statutes; narrow definition; limited enforcement activity
- **Source:** [V.I. Code tit. 14, § 2209](https://law.justia.com/codes/virgin-islands/title-14/)

## Financial Sector Overlay

Financial institutions face ADDITIONAL notification obligations beyond state breach notification laws. These sector-specific requirements operate independently of and concurrently with state law:

- **OCC / Federal Reserve / FDIC — Computer-Security Incident Notification Rule (2022):** Banking organizations must notify their primary federal regulator within **36 hours** of determining that a "computer-security incident" has occurred that has materially disrupted or degraded, or is reasonably likely to materially disrupt or degrade, banking operations, business lines, or the stability of the financial sector. This is a notification to the regulator, not to customers.
- **NY DFS — 23 NYCRR 500 (Cybersecurity Regulation):** Covered entities regulated by the New York Department of Financial Services must notify DFS within **72 hours** of determining a "cybersecurity event" has occurred that either (a) requires notice to any government or supervisory body, (b) has a reasonable likelihood of materially harming the normal operation of the entity, or (c) involves the deployment of ransomware within a material part of the entity's information systems. The 2023 amendments strengthened these requirements.
- **PCI DSS — Card Brand Notification:** Card brands (Visa, Mastercard, Amex, Discover) require notification within approximately **24 hours** of an entity becoming aware of a suspected breach involving cardholder data. The specific timelines and procedures vary by card brand. A PCI Forensic Investigator (PFI) must be engaged for the investigation.
- **GLBA Safeguards Rule (as amended by FTC 2023, effective May 13, 2024):** Financial institutions subject to the FTC's Safeguards Rule must notify the FTC **as soon as possible, and no later than 30 days** after discovery of a notification event involving the unencrypted information of **500 or more consumers**. The notification must include a description of the event, the types of information involved, the number of consumers affected or potentially affected, and the date or date range of the event; the FTC makes the reports publicly available.
- **SEC — Cybersecurity Incident Disclosure (2023):** Public companies must disclose material cybersecurity incidents on **Form 8-K within 4 business days** of determining that an incident is material. Registrants must also describe their cybersecurity risk management, strategy, and governance in annual reports on Form 10-K.

Cross-reference: `financial-sector-privacy-regulators.md` (if available), `banking-regulation.md`, `pci-dss.md` in `law/financial-services/`.

## Interaction with Other Areas

- **breach-notification.md** (same directory) — provides the framework-level view of breach notification across jurisdictions including GDPR, HIPAA, and international regimes. This 50-state file provides the US state-by-state detail that supplements the framework view.
- **ccpa-cpra.md** — California's private right of action under CCPA § 1798.150 for data breaches is a key overlay on the state breach notification statute. Review both files when assessing California breach exposure.
- **us-state-privacy.md** — comprehensive state privacy laws (VCDPA, CPA, CTDPA, etc.) impose additional data protection obligations beyond breach notification. A breach at an entity subject to a comprehensive privacy law may trigger both breach notification obligations and privacy law enforcement risk.
- **law/financial-services/banking-regulation.md** — the 36-hour federal banking regulator notification rule.
- **law/financial-services/pci-dss.md** — PCI DSS breach notification and forensic investigation requirements for payment card data breaches.
- **law/cybersecurity/** — cybersecurity area files covering security standards, incident response frameworks, and regulatory expectations for cybersecurity programs. Breach notification obligations often depend on whether the entity maintained "reasonable security," which is defined by these standards.

## Sources

- [NCSL Security Breach Notification Laws](https://www.ncsl.org/technology-and-communication/security-breach-notification-laws) — National Conference of State Legislatures tracker; most comprehensive free 50-state comparison
- [IAPP US State Data Breach Notification Chart](https://iapp.org/resources/article/state-data-breach-notification-chart/) — International Association of Privacy Professionals comparison chart
- [Perkins Coie Security Breach Notification Chart](https://www.perkinscoie.com/en/news-insights/security-breach-notification-chart.html) — Regularly updated law firm 50-state chart
- [Baker Hostetler State Data Breach Notification Laws](https://www.bakerlaw.com/services/privacy-and-data-protection/state-breach-notification-statutes/) — State-by-state statutory citations and summaries
- [DLA Piper Data Protection Laws of the World](https://www.dlapiperdataprotection.com/) — Global data protection law comparison including US states
- [Husch Blackwell State Data Security Laws Tracker](https://www.bytebacklaw.com/) — Interactive state-by-state data breach law comparison
- [OCC Computer-Security Incident Notification Final Rule](https://www.occ.gov/news-issuances/news-releases/2021/nr-occ-2021-119.html) — 36-hour banking regulator notification rule
- [NY DFS Cybersecurity Regulation (23 NYCRR 500)](https://www.dfs.ny.gov/industry_guidance/cybersecurity) — New York Department of Financial Services cybersecurity and breach notification requirements
- [SEC Cybersecurity Disclosure Rules](https://www.sec.gov/rules/final/2023/33-11216.pdf) — SEC Form 8-K materiality-based incident disclosure

---
