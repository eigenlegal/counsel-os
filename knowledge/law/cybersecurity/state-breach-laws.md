---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, industry-standard]
---
# State Data Breach Notification Laws

## Applicability

Applies to any organization that owns, licenses, or maintains personal information of residents of any US state or territory. All 50 states, the District of Columbia, Guam, Puerto Rico, and the US Virgin Islands have enacted data breach notification laws. Triggers, timelines, and requirements vary significantly by jurisdiction.

## Key Requirements

### Trigger — Personal Information Definitions

- **Core Elements (Universal)** / First name or initial + last name combined with: Social Security number, driver's license/state ID number, financial account number with access code / **Consequence**: Breach of any core element triggers notification in virtually all states
- **Expanded Elements (Varies by State)** / Many states add: biometric data (IL, TX, WA, CA), medical/health information (CA, TX, MA), email + password credentials (CA, FL, OR), taxpayer ID, passport number, health insurance information / **Threshold**: Must analyze PI definition in each state where affected residents reside / **Consequence**: Broader definitions = more incidents trigger notification
- **Encryption Safe Harbor** / Most states exempt encrypted data if the encryption key was not also compromised / **Consequence**: Encrypted data breach may not trigger notification; but must demonstrate key was not accessed

### Notification Timelines

- **30 Days or Fewer** / Colorado (30 days), Florida (30 days), Washington (30 days) / **Consequence**: Among the most aggressive timelines; investigation and notification must be rapid
- **45 Days** / Ohio (45 days), Wisconsin (45 days), South Dakota (45 days) / **Consequence**: Moderate timeline; still requires prompt investigation
- **60 Days** / Connecticut (60 days), Maine (60 days), Texas (60 days), Vermont (60 days), Virginia (60 days) / **Consequence**: Most common middle-ground timeline
- **90 Days** / Maryland (45 days, up to 90 with AG extension) / **Consequence**: Extended timelines typically require justification
- **Most Expedient / Without Unreasonable Delay** / Many states (including New York, California, New Jersey) use "most expedient time possible" or "without unreasonable delay" standard / **Threshold**: Generally interpreted as 30-60 days; no bright-line rule / **Consequence**: Subjective standard invites regulatory scrutiny; document diligence
- **Law Enforcement Delay** / Most states permit delay if law enforcement determines notification would impede investigation / **Consequence**: Must obtain written request from law enforcement; delay is temporary

### Attorney General Notification

- **Threshold-Based AG Notice** / Many states require AG notification when breach affects a minimum number of residents: 500 (CA, ME, OR, VT, WA), 250 (IN, NC), 1,000 (NY, FL, IL, TX, MD) / **Timeline**: Same as or before individual notification / **Consequence**: Failure to notify AG = separate violation with additional penalties
- **Content of AG Notice** / Typically must include: nature of breach, types of information, number of affected residents, remediation steps, contact information, copy of notification letter / **Consequence**: Incomplete AG notice may trigger follow-up inquiry or enforcement action
- **No Threshold States** / Some states require AG notification for any breach regardless of number affected / **Consequence**: Must track AG notification requirements for each state

### Consumer Reporting Agency Notification

- **Threshold** / Most states require notification to consumer reporting agencies (CRAs) when breach affects 500-1,000+ residents of that state / **Consequence**: Failure to notify CRAs = separate violation; typically same timeline as individual notification

### Individual Notification Content

- **Required Elements (Typical)** / Description of the incident, types of information involved, steps taken to address, contact information for the organization, contact information for credit reporting agencies, recommendation to review financial statements / **Consequence**: Non-compliant notice = potential AG enforcement action; treated as if no notice provided
- **Credit Monitoring** / Some states require free credit monitoring or identity theft protection services (CT, CA, MA for SSN breaches; DE for SSN and financial account) / **Threshold**: 12-24 months typical required duration / **Consequence**: Failure to offer = separate violation; class action risk
- **Method of Notice** / Written notice (US mail) or electronic notice (if consistent with E-SIGN Act); substitute notice (website + media) permitted if cost exceeds $250K-$500K (varies) or affected class >250K-500K / **Consequence**: Must use compliant notice method for each state

### Private Right of Action

- **Limited States** / California (Civil Code 1798.150 — CCPA/CPRA private right of action: $100-$750 statutory damages per consumer per incident for failure to implement reasonable security), Massachusetts (93H), Louisiana / **Consequence**: Class action risk with statutory damages can be enormous; 1M affected consumers x $100 = $100M minimum
- **Most States** / No express private right of action in breach notification statute; but negligence, state consumer protection (UDAP), and breach of contract theories available / **Consequence**: Absence of statutory private right of action does not eliminate litigation risk

### Key State Variations

- **California** / Broadest PI definition; "most expedient time" timeline; private right of action under CCPA; must notify if encrypted data breached with key compromise / **Consequence**: Set national standard in many areas
- **New York** / SHIELD Act expanded PI definition (biometrics, email credentials); reasonable security requirement; AG enforcement; 250+ resident AG notification / **Consequence**: Imposes affirmative security program obligation beyond breach notification
- **Texas** / 60-day timeline; AG notification for 250+ residents; statutory penalties $100-$250K per violation / **Consequence**: AG actively enforces; significant penalty exposure
- **Illinois** / 500-resident AG threshold; BIPA intersection for biometric data (separate $1K-$5K per violation); no specific timeline (without unreasonable delay) / **Consequence**: Biometric breaches trigger both breach notification and BIPA obligations

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): state privacy laws (CCPA, CDPA, etc.) impose parallel obligations; breach notification is a subset of broader privacy compliance
- **Consumer Protection** (`consumer-protection/`): state UDAP statutes provide AG enforcement authority for breach-related unfair/deceptive practices
- Cross-reference: `data-privacy/breach-notification.md` for federal and international breach notification
- Cross-reference: `incident-response.md` for operational breach response procedures

## Sources

- [National Conference of State Legislatures — Security Breach Notification Laws](https://www.ncsl.org/technology-and-communication/security-breach-notification-laws)
- [California Civil Code 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82)
- [New York SHIELD Act (General Business Law 899-aa)](https://www.nysenate.gov/legislation/bills/2019/S5575)
- [IAPP US State Breach Notification Chart](https://iapp.org/resources/article/state-data-breach-notification-chart/)
