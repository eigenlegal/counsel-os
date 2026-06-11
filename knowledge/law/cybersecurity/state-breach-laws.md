---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, industry-standard]
authorities:
  - cite: "Cal. Civ. Code § 1798.82"
    title: "California breach notification statute"
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82"
  - cite: "N.Y. Gen. Bus. Law § 899-aa"
    title: "New York breach notification statute (as amended Dec. 2024 / Feb. 2025)"
    url: "https://www.nysenate.gov/legislation/laws/GBS/899-AA"
  - cite: "Tex. Bus. & Com. Code § 521.053"
    title: "Texas breach notification statute"
    url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.521.htm"
  - cite: "10 M.R.S. § 1348"
    title: "Maine security breach notice requirements"
    url: "https://legislature.maine.gov/legis/statutes/10/title10sec1348.html"
  - cite: "NCSL Security Breach Notification Laws"
    title: "National Conference of State Legislatures 50-state tracker"
    url: "https://www.ncsl.org/technology-and-communication/security-breach-notification-laws"
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

- **30 Days or Fewer** / Colorado (30 days), Florida (30 days), Maine (30 days), New York (30 days — Dec. 2024 amendment), Washington (30 days) / **Consequence**: Among the most aggressive timelines; investigation and notification must be rapid
- **45 Days** / Maryland (45 days), Ohio (45 days), Vermont (45 days), Wisconsin (45 days) / **Consequence**: Moderate timeline; still requires prompt investigation
- **60 Days** / Connecticut (60 days), South Dakota (60 days), Texas (60 days) / **Consequence**: Most common middle-ground outer limit; "without unreasonable delay" still governs inside the cap
- **Most Expedient / Without Unreasonable Delay (no fixed cap)** / Many states (including California, New Jersey, Virginia) use "most expedient time possible" or "without unreasonable delay" with no statutory day count / **Threshold**: Generally interpreted as 30-60 days; no bright-line rule / **Consequence**: Subjective standard invites regulatory scrutiny; document diligence. Day counts change by amendment (New York moved to 30 days in December 2024) — confirm the current statute for each affected state
- **Law Enforcement Delay** / Most states permit delay if law enforcement determines notification would impede investigation / **Consequence**: Must obtain written request from law enforcement; delay is temporary

### Attorney General Notification

- **Threshold-Based AG Notice** / Many states require AG (or equivalent regulator) notification when a breach affects a minimum number of residents — e.g., 500 (CA, WA, FL, IL), 250 (TX — within 30 days; OR; SD) / **Timeline**: Same as or before individual notification unless the statute sets its own clock / **Consequence**: Failure to notify AG = separate violation with additional penalties; thresholds shift by amendment, so confirm the current statute per state
- **Content of AG Notice** / Typically must include: nature of breach, types of information, number of affected residents, remediation steps, contact information, copy of notification letter / **Consequence**: Incomplete AG notice may trigger follow-up inquiry or enforcement action
- **No Threshold States** / Some states require regulator notification for any breach regardless of number affected — e.g., New York (AG, Department of State, and State Police whenever NY residents are notified) and Vermont (AG within 14 business days of discovery) / **Consequence**: Must track AG notification requirements for each state

### Consumer Reporting Agency Notification

- **Threshold** / Most states require notification to consumer reporting agencies (CRAs) when breach affects 500-1,000+ residents of that state / **Consequence**: Failure to notify CRAs = separate violation; typically same timeline as individual notification

### Individual Notification Content

- **Required Elements (Typical)** / Description of the incident, types of information involved, steps taken to address, contact information for the organization, contact information for credit reporting agencies, recommendation to review financial statements / **Consequence**: Non-compliant notice = potential AG enforcement action; treated as if no notice provided
- **Credit Monitoring** / Some states require free credit monitoring or identity theft protection for SSN breaches: CT (24 months), MA (18 months; 42 months if the breached entity is a consumer reporting agency), DE (12 months); California does not mandate an offer but requires any monitoring offered for SSN/driver's license breaches to run at least 12 months / **Consequence**: Failure to offer where required = separate violation; class action risk
- **Method of Notice** / Written notice (US mail) or electronic notice (if consistent with E-SIGN Act); substitute notice (website + media) permitted if cost exceeds $250K-$500K (varies) or affected class >250K-500K / **Consequence**: Must use compliant notice method for each state

### Private Right of Action

- **Limited States** / California (Civil Code 1798.150 — CCPA/CPRA private right of action: $100-$750 statutory damages per consumer per incident for failure to implement reasonable security), Massachusetts (93H), Louisiana / **Consequence**: Class action risk with statutory damages can be enormous; 1M affected consumers x $100 = $100M minimum
- **Most States** / No express private right of action in breach notification statute; but negligence, state consumer protection (UDAP), and breach of contract theories available / **Consequence**: Absence of statutory private right of action does not eliminate litigation risk
- **Safe Harbor / Affirmative Defense Statutes** / A growing set of states (Ohio 2018, Utah 2021, Connecticut 2021, Iowa 2023, Tennessee 2024, Texas 2025 (SB 2610 — exemplary-damages shield for businesses with fewer than 250 employees), Oklahoma eff. Jan. 1, 2026 (SB 626)) limit punitive/exemplary damages or civil penalties, or supply an affirmative defense, for entities maintaining a written cybersecurity program conforming to a recognized framework (NIST CSF/800-171/800-53, CIS Controls, ISO 27001, SOC 2, PCI-DSS) / **Consequence**: Documented framework conformance has direct litigation value in breach suits, not just compliance value

### Key State Variations

- **California** / Broadest PI definition; "most expedient time" timeline; private right of action under CCPA; must notify if encrypted data breached with key compromise / **Consequence**: Set national standard in many areas
- **New York** / SHIELD Act expanded PI definition (biometrics, email credentials) and imposed a reasonable-security requirement; December 2024 amendments added a 30-day individual notification deadline (effective immediately) and required DFS-regulated entities to also notify NYDFS; PI definition expanded again to include medical and health insurance information effective March 21, 2025; AG, Department of State, and State Police notice required for any breach / **Consequence**: Affirmative security program obligation plus one of the tighter notification clocks
- **Texas** / 60-day individual timeline; AG notification within 30 days for breaches affecting 250+ residents (electronic submission; AG posts reported breaches publicly); statutory penalties $100-$250K per violation / **Consequence**: AG actively enforces; significant penalty exposure; public posting adds reputational and follow-on litigation risk
- **Illinois** / 500-resident AG threshold; BIPA intersection for biometric data (separate $1K-$5K per violation); no specific timeline (without unreasonable delay) / **Consequence**: Biometric breaches trigger both breach notification and BIPA obligations

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): state privacy laws (CCPA, CDPA, etc.) impose parallel obligations; breach notification is a subset of broader privacy compliance
- **Consumer Protection** (`consumer-protection/`): state UDAP statutes provide AG enforcement authority for breach-related unfair/deceptive practices
- Cross-reference: `data-privacy/breach-notification.md` for federal and international breach notification
- Cross-reference: `incident-response.md` for operational breach response procedures

## Sources

- [National Conference of State Legislatures — Security Breach Notification Laws](https://www.ncsl.org/technology-and-communication/security-breach-notification-laws)
- [California Civil Code 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82)
- [New York General Business Law § 899-aa (as amended)](https://www.nysenate.gov/legislation/laws/GBS/899-AA)
- [Texas Business & Commerce Code § 521.053](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.521.htm)
- [IAPP US State Breach Notification Chart](https://iapp.org/resources/article/state-data-breach-notification-chart/)
