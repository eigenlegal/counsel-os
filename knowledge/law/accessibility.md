## Overview

# Accessibility Law

## Trigger Conditions

Load this area when the matter involves:
- **Keywords**: accessibility, ADA, Section 508, WCAG, disability, assistive technology, screen reader, accommodation
- **Document types**: accessibility audits, VPAT/ACR, consent decrees, demand letters, website remediation agreements, procurement requirements, accommodation requests
- **Scenarios**: website/app accessibility compliance, digital product procurement, accessibility litigation defense, Section 508 federal contracting, state accessibility requirements, structured negotiation

## Sub-Topic Triggers

| Sub-Topic File | Load When |
|---|---|
| `ada-title-iii.md` | Public accommodation, website accessibility, digital ADA claims, DOJ rulemaking |
| `section-508.md` | Federal procurement, government contracts, ICT accessibility, VPAT |
| `wcag.md` | Web content accessibility, WCAG 2.1/2.2, conformance levels, technical criteria |
| `website-accessibility.md` | Litigation trends, demand letters, consent decrees, serial plaintiffs, settlement |
| `state-accessibility.md` | California Unruh, state disability laws, state procurement, state-specific requirements |

## Interaction with Other Areas

- **Consumer Protection** (`consumer-protection/`): deceptive practices claims for inaccessible products
- **Employment** (`employment/`): reasonable accommodation, ADA Title I workplace obligations
- **IP and Technology** (`ip-and-technology/`): SaaS accessibility requirements, software licensing
- **Data Privacy** (`data-privacy/`): accessible privacy notices and consent mechanisms

---
## Ada Title Iii

# ADA Title III — Public Accommodations

## Applicability

Applies to private entities that own, operate, lease, or lease to places of public accommodation. Title III of the Americans with Disabilities Act (42 U.S.C. 12181-12189) prohibits discrimination on the basis of disability in the full and equal enjoyment of goods, services, facilities, privileges, advantages, or accommodations. Increasingly applied to digital properties (websites, mobile apps).

## Key Requirements

### Public Accommodations — 12 Categories

- **Covered Entities** / Title III covers 12 categories of public accommodation: (1) lodging; (2) restaurants/bars; (3) entertainment; (4) public gathering; (5) sales/rental establishments; (6) service establishments; (7) transportation terminals; (8) public display; (9) recreation; (10) education; (11) social service centers; (12) exercise/recreation / **Consequence**: Virtually all businesses open to the public are covered; no minimum size or revenue threshold
- **Non-Discrimination Standard** / No individual shall be discriminated against on the basis of disability in the full and equal enjoyment of goods, services, facilities, privileges, advantages, or accommodations / **Consequence**: Must provide equal access; "separate but equal" accommodations are permissible only when necessary

### Digital Accessibility — Website and App Coverage

- **Circuit Split** / Courts are divided on whether websites must have a nexus to a physical place of public accommodation:
  - **Nexus Required**: Some circuits (notably 3rd, 6th, 9th pre-Robles) require website to have connection to physical location
  - **No Nexus Required**: Other courts (1st, 7th, and growing trend) treat websites as places of public accommodation regardless of physical presence
  - **Robles v. Domino's Pizza (9th Cir. 2019)**: Website and app that facilitated access to physical restaurant were extensions of a place of public accommodation; denial of certiorari by Supreme Court / **Consequence**: Trend is toward broader digital coverage; but circuit split creates uncertainty; analyze jurisdiction carefully
- **DOJ Position** / DOJ has consistently taken the position that ADA Title III applies to websites of public accommodations; April 2024 rulemaking establishes WCAG 2.1 AA standard for state and local government websites (Title II); Title III web accessibility rulemaking anticipated / **Consequence**: DOJ rulemaking for Title II signals likely Title III standard; businesses should prepare for WCAG 2.1 AA as de facto standard
- **Undue Burden Defense** / Entity not required to take actions that would result in undue burden (significant difficulty or expense) / **Threshold**: Case-by-case analysis considering: entity's resources, nature and cost of action required, impact on operations / **Consequence**: Defense rarely succeeds for large entities; small businesses may have stronger argument; must document burden analysis

### Standing Requirements

- **Article III Standing** / Plaintiff must demonstrate: (1) injury in fact (concrete and particularized); (2) traceable to defendant's conduct; (3) redressable by judicial relief / **Consequence**: Standing is frequently litigated in digital accessibility cases
- **Tester Plaintiffs** / Individuals who visit websites specifically to test accessibility and file suit; courts divided on whether testers have standing:
  - **Standing Found**: Where tester demonstrates intent to use goods/services and was deterred by inaccessibility
  - **Standing Denied**: Where tester cannot demonstrate genuine intent to use goods/services (Acheson Hotels v. Laufer, Supreme Court vacated as moot 2023, leaving question unresolved) / **Consequence**: Tester standing remains unsettled; jurisdictional analysis critical
- **Deterrent Effect** / Plaintiff need not actually attempt to access the website if they were aware of barriers that deterred them / **Consequence**: Broadens potential plaintiff class; knowledge of inaccessibility alone may suffice

### Remedies and Penalties

- **Private Actions** / Individuals may bring suit for injunctive relief only (no monetary damages in private Title III actions under federal law) / **Consequence**: No damages = lower individual exposure; but attorney's fee awards can be substantial ($50K-$500K+); and state law claims may be joined for damages
- **DOJ Enforcement** / DOJ may bring civil actions seeking: injunctive relief, monetary damages for aggrieved individuals, and civil penalties / **Threshold**: First violation: up to $75,000; subsequent violations: up to $150,000 (adjusted for inflation) / **Consequence**: DOJ enforcement actions typically result in comprehensive consent decrees with ongoing monitoring
- **Attorney's Fees** / Prevailing plaintiff entitled to reasonable attorney's fees and costs under 42 U.S.C. 12205 / **Consequence**: Fee-shifting incentivizes plaintiff's attorneys; fees often exceed value of injunctive relief
- **State Law Claims** / Plaintiffs frequently join state claims (California Unruh, NY HRL) that provide monetary damages / **Consequence**: See `state-accessibility.md` for state-specific damages; combined federal/state claims increase exposure significantly

### DOJ Rulemaking — Title II (April 2024)

- **Scope** / Final rule for state and local government entities (Title II) requiring WCAG 2.1 Level AA conformance for web content and mobile applications / **Timeline**: Large entities (population 50K+): compliance by April 2026; smaller entities: April 2027 / **Consequence**: First formal ADA web accessibility standard; expected to influence Title III enforcement and litigation standards
- **Covered Content** / All web content and mobile apps made available by a public entity; includes third-party content posted by the entity / **Consequence**: Third-party widgets, embedded content, and social media content controlled by entity must conform
- **Exceptions** / Archived content, content posted by third parties (not the entity), conventional electronic documents (transitional), password-protected class or course content (for education) / **Consequence**: Exceptions are narrow; most digital content must conform

### Compliance Best Practices

- **WCAG 2.1 Level AA** / De facto standard for ADA compliance; explicitly adopted in Title II rule and referenced in most consent decrees / **Consequence**: See `wcag.md` for detailed criteria
- **Accessibility Statement** / Publish accessibility statement describing: conformance level, known issues, contact information for accessibility feedback, remediation timeline / **Consequence**: Not legally required but demonstrates good faith; recommended by DOJ and W3C
- **Regular Auditing** / Conduct automated and manual accessibility testing at regular intervals; include user testing with assistive technology users / **Consequence**: Proactive testing and remediation reduces litigation risk and demonstrates reasonable accommodation effort

## Interaction with Other Areas

- **Employment** (`employment/`): ADA Title I workplace accommodations; employee-facing digital tools
- **Consumer Protection** (`consumer-protection/`): inaccessible products may constitute unfair practices
- Cross-reference: `wcag.md` for technical accessibility standards
- Cross-reference: `website-accessibility.md` for litigation trends and settlement patterns
- Cross-reference: `state-accessibility.md` for state-specific claims and damages

## Sources

- [ADA Title III (42 U.S.C. 12181-12189)](https://www.law.cornell.edu/uscode/text/42/12181)
- [Robles v. Domino's Pizza, LLC, 913 F.3d 898 (9th Cir. 2019)](https://casetext.com/case/robles-v-dominos-pizza-llc-2)
- [DOJ Final Rule — Accessibility of Web Information and Services of State and Local Government Entities (April 2024)](https://www.ada.gov/resources/2024-03998/)
- [DOJ Guidance on Web Accessibility and the ADA](https://www.ada.gov/resources/web-guidance/)

---
## Section 508

# Section 508 — Federal ICT Accessibility

## Applicability

Applies to federal agencies and contractors providing Information and Communications Technology (ICT) to the federal government. Section 508 of the Rehabilitation Act (29 U.S.C. 794d) requires that electronic and information technology developed, procured, maintained, or used by federal agencies be accessible to people with disabilities.

## Key Requirements

### Scope and Coverage

- **Federal Agencies** / All federal departments and agencies must ensure ICT is accessible when developing, procuring, maintaining, or using technology / **Consequence**: Inaccessible ICT = Section 508 violation; agency may be subject to complaint, investigation, or lawsuit
- **Federal Contractors** / Companies selling ICT products or services to federal agencies must meet Section 508 standards; accessibility requirements flowed down through procurement / **Consequence**: Non-compliant products may be excluded from federal procurement; contractor may lose contract or be ineligible for future awards
- **ICT Definition** / Information and Communications Technology: software, hardware, electronic content, telecommunications equipment, web-based information and applications, multimedia, and support documentation / **Consequence**: Broad definition covers virtually all technology procured by federal government

### 2017 Refresh — ICT Standards

- **WCAG 2.0 Level AA Incorporation** / 2017 refresh incorporated WCAG 2.0 Level AA success criteria for web content, electronic documents, and software / **Consequence**: Federal standard aligned with internationally recognized web accessibility guidelines; WCAG 2.0 AA is the minimum
- **Functional Performance Criteria** / Where technical standards do not address a particular ICT function, functional performance criteria apply: (1) without vision; (2) with limited vision; (3) without perception of color; (4) without hearing; (5) with limited hearing; (6) without speech; (7) with limited manipulation; (8) with limited reach and strength; (9) with limited language, cognitive, and learning abilities / **Consequence**: Catch-all criteria ensure accessibility even for novel technologies not specifically addressed by technical standards
- **Hardware Standards** / Requirements for physical ICT: operable with one hand, no tight grasping/twisting, labeled controls, tactile discernibility / **Consequence**: Kiosks, printers, copiers, phones, and other physical ICT must meet hardware accessibility requirements
- **Support Documentation and Services** / Help desks, call centers, training, and documentation must be accessible / **Consequence**: Accessible product with inaccessible support = Section 508 violation

### VPAT (Voluntary Product Accessibility Template)

- **Purpose** / VPAT is a document that vendors complete to describe how their product conforms to Section 508 standards; produces an Accessibility Conformance Report (ACR) / **Consequence**: Most federal procurement requires VPAT/ACR submission; absence = product may be excluded from consideration
- **VPAT Versions** / VPAT 2.5 (current): supports WCAG 2.2, Section 508, EN 301 549 (EU), and combinations; prior versions supported WCAG 2.0/2.1 / **Consequence**: Must use appropriate VPAT version for the applicable standard; federal procurement typically requires Section 508 edition
- **Conformance Levels** / For each criterion: Supports, Partially Supports, Does Not Support, Not Applicable / **Consequence**: "Partially Supports" requires explanation of deficiency; "Does Not Support" = known gap that agency must evaluate
- **Accuracy** / VPAT is self-reported; no independent verification required, but agencies may test / **Consequence**: Inaccurate VPAT = False Claims Act risk; material misrepresentation of accessibility = fraud in procurement

### Procurement Requirements (E202)

- **Market Research** / Agencies must conduct market research to identify accessible ICT solutions / **Consequence**: Procurement without accessibility evaluation = procedural violation
- **Solicitation Requirements** / Section 508 requirements must be included in solicitations (RFPs, RFQs); evaluation criteria must include accessibility / **Threshold**: Accessibility requirements should be specific and testable, not generic statements / **Consequence**: Failure to include = protest risk; winning vendor without accessibility evaluation = potential challenge
- **Best Meets Standard** / When no fully conformant product is available, agency selects the product that best meets the standard / **Consequence**: Agency must document evaluation and rationale for selection; cannot simply waive accessibility requirement

### Undue Burden Exception

- **Standard** / Agency head (or designee) may determine that conformance would impose an undue burden (significant difficulty or expense) / **Threshold**: Must consider: agency resources, impact on operations, nature and cost of conformance / **Consequence**: Exception is narrow; must be documented in writing; must still provide accessible alternative means of access
- **Alternative Means** / When undue burden is claimed, agency must provide alternative access that allows individuals with disabilities to use the information or service / **Consequence**: Exception from ICT standard ≠ exception from accessibility obligation; must still ensure access through other means

### Enforcement

- **Administrative Complaints** / Individuals may file complaints with the agency or with the US Access Board / **Timeline**: No specific filing deadline in Section 508; but agencies must have complaint process / **Consequence**: Agency must investigate and respond; Access Board provides technical assistance
- **Lawsuits** / Section 508 incorporates remedies of Section 504 of the Rehabilitation Act; individuals may file suit in federal court / **Consequence**: Remedies include injunctive relief; attorney's fees; compensatory damages may be available in some circuits
- **Congressional Reporting** / Agencies must report Section 508 compliance to Congress; GSA monitors government-wide compliance / **Consequence**: Non-compliance = negative congressional reporting; GSA dashboard publicly identifies agency compliance status

### Equivalent Facilitation

- **Alternative Compliance** / ICT may use designs or technologies different from those specified in Section 508 if they provide substantially equivalent or greater access / **Consequence**: Innovation in accessibility is permitted; but burden of demonstrating equivalence is on the entity claiming it
- **Testing** / Equivalent facilitation must be tested with individuals with disabilities to validate effectiveness / **Consequence**: Self-declared equivalence without user testing is insufficient

## Interaction with Other Areas

- **IP and Technology** (`ip-and-technology/`): software licensing, SaaS procurement, technology development
- **Consumer Protection** (`consumer-protection/`): accessible product obligations beyond federal procurement
- Cross-reference: `wcag.md` for underlying WCAG technical standards incorporated by reference
- Cross-reference: `ada-title-iii.md` for non-federal accessibility obligations

## Sources

- [Section 508 of the Rehabilitation Act (29 U.S.C. 794d)](https://www.law.cornell.edu/uscode/text/29/794d)
- [ICT Standards and Guidelines (36 CFR Part 1194)](https://www.access-board.gov/ict/)
- [Section508.gov — GSA Government-wide IT Accessibility Program](https://www.section508.gov/)
- [VPAT Template — ITI (Information Technology Industry Council)](https://www.itic.org/policy/accessibility/vpat)

---
## State Accessibility

# State Accessibility Laws

## Applicability

Applies to organizations subject to state disability discrimination and accessibility laws, which often provide broader protections and greater monetary exposure than federal ADA claims. Covers key state statutes, statutory damages provisions, procurement requirements, and state-specific website accessibility laws.

## Key Requirements

### California — Unruh Civil Rights Act

- **Scope** / California Civil Code Section 51: prohibits discrimination by business establishments on the basis of disability (and other protected categories); applies to any business with a connection to California / **Consequence**: Broadest state accessibility statute; applies to online businesses accessible to California residents regardless of physical presence
- **Statutory Damages** / $4,000 minimum statutory damages per violation per occurrence (each visit to an inaccessible website may constitute separate occurrence) / **Threshold**: No intent required; actual damages or $4,000 statutory minimum, whichever is greater; plus attorney's fees / **Consequence**: Aggregate exposure enormous: 100 website visits x $4,000 = $400K; class actions multiply exposure
- **ADA Violation = Unruh Violation** / Violation of ADA constitutes a per se violation of the Unruh Civil Rights Act (Civil Code Section 51(f)) / **Consequence**: Federal ADA claim automatically creates state Unruh claim with monetary damages; plaintiff need not prove independent state violation
- **Independent Unruh Claims** / Unruh claims can also be brought without ADA violation; broader "arbitrary discrimination" standard / **Consequence**: Conduct not reaching ADA violation may still violate Unruh; lower threshold for liability
- **Statute of Limitations** / 2 years for damages; 3 years for injunctive relief / **Consequence**: Multiple visits over limitation period each generate separate damages claims

### New York Human Rights Law (NYHRL)

- **Scope** / Executive Law Section 296: prohibits disability discrimination in places of public accommodation; construed broadly to include websites accessible to New York residents / **Consequence**: Combined with high volume of filings in NY federal courts, creates significant exposure for any business with online presence
- **Damages** / Compensatory damages, injunctive relief, attorney's fees, civil penalties / **Consequence**: No statutory minimum like California, but compensatory damages (including emotional distress) available; attorney's fees can be substantial
- **NYC Human Rights Law** / NYC Administrative Code Section 8-107: even broader protections; independently actionable; punitive damages available; one of the broadest disability discrimination statutes in the country / **Consequence**: Entities doing business in NYC face city, state, and federal claims simultaneously; NYC HRL construed liberally in favor of plaintiff

### Illinois — Biometric Information Privacy Act (BIPA) Intersection

- **Accessibility and Biometrics** / When accessibility features involve biometric data (facial recognition for authentication, voice recognition for navigation), BIPA requirements apply / **Threshold**: Collection of biometric identifiers (fingerprint, face geometry, voiceprint, iris scan) requires: (1) written notice; (2) written consent; (3) data retention and destruction policy / **Consequence**: BIPA private right of action: $1,000 per negligent violation, $5,000 per intentional/reckless violation; class action risk
- **Intersection** / Accessible authentication using biometrics must comply with both accessibility standards and biometric privacy laws / **Consequence**: Design choice to improve accessibility may create biometric privacy liability if BIPA requirements not met

### State Procurement Requirements

- **California** / State agencies must ensure ICT accessibility; incorporates Section 508 standards; vendors must provide VPATs / **Consequence**: Non-accessible products excluded from state procurement; applies to state-funded entities
- **New York** / State Technology Law requires ICT accessibility for state agencies; adopts WCAG 2.0 AA as standard / **Consequence**: State procurement contracts require accessibility conformance; vendors must demonstrate compliance
- **Texas** / Administrative Code Title 1, Section 206 and 213: state agencies must comply with accessibility standards derived from Section 508 / **Consequence**: Applies to all state agency websites and applications; periodic compliance monitoring
- **Massachusetts** / AAB (Architectural Access Board) extends physical accessibility requirements; web accessibility addressed through policy and state procurement standards / **Consequence**: State contracts require WCAG conformance; enforcement through procurement oversight
- **General Trend** / Growing number of states adopting IT accessibility procurement requirements; most reference Section 508 or WCAG 2.0/2.1 AA / **Consequence**: Vendors selling to state and local governments must maintain accessibility conformance across multiple jurisdictions

### State-Specific Website Accessibility Laws

- **Colorado** / HB 21-1110: state and local government websites must conform to WCAG 2.1 Level AA; effective July 2024 / **Threshold**: Applies to all state and local government entities / **Consequence**: Specific WCAG version codified in state law; compliance is mandatory, not aspirational
- **Connecticut** / Public Act 23-141: requires compliance with WCAG 2.1 Level AA for state agency websites and mobile applications / **Consequence**: One of the most specific state web accessibility mandates
- **Maryland** / Maryland IT Accessibility Standards: state agencies must conform to WCAG 2.1 AA; vendors must provide conformance documentation / **Consequence**: Applies to both agency-developed and vendor-provided technology
- **Minnesota** / Minnesota Statutes Section 16E.03: accessible technology requirement for state agencies; references Section 508 and WCAG / **Consequence**: Long-standing state accessibility mandate; model for other states

### Key State Damages Comparison

| State | Statute | Damages Available | Key Feature |
|---|---|---|---|
| California | Unruh Civil Rights Act | $4,000 minimum per occurrence + actual + attorney's fees | Per-visit damages; no intent required |
| New York | NY Executive Law 296 | Compensatory + attorney's fees | Broad construction; high filing volume |
| NYC | NYC Admin Code 8-107 | Compensatory + punitive + attorney's fees | Most liberal construction; punitive damages |
| Illinois | BIPA (for biometric intersection) | $1,000-$5,000 per violation | Per-scan damages; biometric authentication |
| Florida | Florida Civil Rights Act | Compensatory + injunctive | Pre-suit notice required (120 days) |
| Massachusetts | Mass. Gen. Laws Ch. 272, 98 | Up to $5,000 + injunctive + attorney's fees | Strong enforcement history |

### Preemption Issues

- **No Federal Preemption** / ADA does not preempt state disability discrimination laws that provide equal or greater protection / **Consequence**: Plaintiffs may bring both federal ADA and state law claims; state claims typically provide monetary damages not available under federal ADA Title III
- **Stacking** / Plaintiff may recover under both federal and state law (to extent not duplicative); federal injunctive relief + state monetary damages is common pattern / **Consequence**: Total exposure = federal remediation obligations + state monetary damages + attorney's fees under both statutes

## Interaction with Other Areas

- **Consumer Protection** (`consumer-protection/`): state UDAP statutes may provide additional theories for inaccessible products/services
- **Data Privacy** (`data-privacy/`): BIPA and state privacy laws interact with biometric accessibility features
- Cross-reference: `ada-title-iii.md` for federal ADA framework that operates alongside state laws
- Cross-reference: `website-accessibility.md` for litigation trends and settlement patterns
- Cross-reference: `wcag.md` for technical standards referenced by state laws

## Sources

- [California Unruh Civil Rights Act (Civil Code Section 51)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=51.)
- [New York Human Rights Law (Executive Law Section 296)](https://www.nysenate.gov/legislation/laws/EXC/296)
- [NYC Human Rights Law (Admin Code Section 8-107)](https://www.nyc.gov/site/cchr/law/the-law.page)
- [Illinois Biometric Information Privacy Act (740 ILCS 14)](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004)
- [Colorado HB 21-1110](https://leg.colorado.gov/bills/hb21-1110)

---
## Wcag

# WCAG — Web Content Accessibility Guidelines

## Applicability

Applies to web content, electronic documents, software, and mobile applications subject to accessibility requirements under ADA, Section 508, state laws, or contractual obligations. WCAG is published by the World Wide Web Consortium (W3C) Web Accessibility Initiative (WAI) and serves as the globally recognized technical standard for digital accessibility.

## Key Requirements

### WCAG Versions

- **WCAG 2.0 (2008)** / Original widely adopted standard; incorporated into Section 508 (2017 refresh), EN 301 549 (EU), and many national standards / **Consequence**: Minimum baseline for most legal requirements; still the formal Section 508 standard
- **WCAG 2.1 (2018)** / Added 17 new success criteria addressing mobile accessibility, low vision, and cognitive disabilities / **Consequence**: Adopted in DOJ Title II rulemaking (April 2024); increasingly the standard referenced in litigation and consent decrees; backward compatible with 2.0
- **WCAG 2.2 (2023)** / Added 9 new success criteria; removed one from 2.1 (4.1.1 Parsing); enhanced focus on cognitive accessibility, authentication, and consistent help / **Consequence**: Latest version; not yet widely adopted in legal standards but represents current best practice; backward compatible with 2.1

### Four Principles (POUR)

- **Perceivable** / Information and user interface components must be presentable to users in ways they can perceive / **Consequence**: Content that cannot be perceived by users with visual, auditory, or other sensory disabilities fails this principle
- **Operable** / User interface components and navigation must be operable / **Consequence**: Interactive elements that require specific physical abilities (mouse only, time-dependent actions) without alternatives fail this principle
- **Understandable** / Information and the operation of the user interface must be understandable / **Consequence**: Content or interaction patterns that are confusing, unpredictable, or error-prone without guidance fail this principle
- **Robust** / Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies / **Consequence**: Content that works in browsers but fails with screen readers or other assistive technology fails this principle

### Three Conformance Levels

- **Level A** / Minimum level; addresses the most critical barriers (25 criteria in WCAG 2.1) / **Consequence**: Failure to meet Level A = severe accessibility barriers; content essentially unusable for some disability groups
- **Level AA** / Standard level; the legal standard for most requirements (13 additional criteria in WCAG 2.1) / **Consequence**: Required by ADA consent decrees, Section 508 (via WCAG 2.0), DOJ Title II rule, EU EN 301 549, and most private settlements; this is the target
- **Level AAA** / Enhanced level; highest accessibility (23 additional criteria in WCAG 2.1) / **Consequence**: Not required by any legal standard for entire sites (some criteria may be required for specific contexts); recommended where feasible

### Key Success Criteria — Most Litigated

- **1.1.1 Non-Text Content (A)** / All non-text content (images, icons, charts) must have text alternatives that serve the equivalent purpose / **Threshold**: Alt text must be meaningful, not just present (e.g., "photo of product X" not "image123.jpg") / **Consequence**: Most commonly cited accessibility failure; affects screen reader users directly
- **1.2.2 Captions (Prerecorded) (A)** / Captions must be provided for all prerecorded audio content in synchronized media / **Consequence**: Uncaptioned video content = barrier for deaf/hard-of-hearing users; auto-generated captions may not meet accuracy requirements
- **1.4.3 Contrast (Minimum) (AA)** / Text must have a contrast ratio of at least 4.5:1 against its background (3:1 for large text — 18pt or 14pt bold) / **Consequence**: Low contrast affects users with low vision; automated testing tools can detect this reliably
- **2.1.1 Keyboard (A)** / All functionality must be operable through a keyboard interface without requiring specific timings / **Consequence**: Mouse-only interactions exclude users who cannot use a mouse (motor disabilities, screen reader users); keyboard traps are critical failures
- **2.4.4 Link Purpose (In Context) (A)** / The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined context / **Consequence**: "Click here" or "Read more" links without context are failures; affects screen reader navigation
- **3.3.1 Error Identification (A)** / When an input error is automatically detected, the item in error must be identified and the error described to the user in text / **Consequence**: Form validation that only uses color to indicate errors fails this criterion
- **4.1.2 Name, Role, Value (A)** / For all user interface components, the name and role can be programmatically determined; states, properties, and values can be programmatically set / **Consequence**: Custom widgets (dropdowns, sliders, modals) without proper ARIA attributes are invisible to assistive technology

### WCAG 2.2 New Criteria (Selected)

- **2.4.11 Focus Not Obscured (Minimum) (AA)** / When a user interface component receives keyboard focus, it is not entirely hidden by author-created content / **Consequence**: Sticky headers, cookie banners, and chat widgets that obscure focused elements fail this criterion
- **2.5.8 Target Size (Minimum) (AA)** / Interactive targets must be at least 24x24 CSS pixels (with exceptions for inline, user agent, essential, and spacing alternatives) / **Consequence**: Small touch/click targets create barriers for users with motor disabilities
- **3.3.7 Redundant Entry (A)** / Information previously entered by or provided to the user that is required to be entered again is either auto-populated or available for selection / **Consequence**: Requiring re-entry of previously provided information creates unnecessary cognitive burden
- **3.3.8 Accessible Authentication (Minimum) (AA)** / Authentication process must not rely on cognitive function tests (memory, puzzle-solving) unless an alternative method is provided or mechanism is provided to assist / **Consequence**: CAPTCHAs and complex authentication without alternatives create barriers

### Conformance Requirements

- **Full Page Conformance** / Conformance is for full web pages; cannot claim partial conformance for portions of a page / **Consequence**: Single failure on a page means the page does not conform; must address all criteria
- **Complete Process Conformance** / When a web page is part of a process (e.g., checkout, registration), all pages in the process must conform / **Consequence**: Accessible homepage with inaccessible checkout = non-conforming process
- **Non-Interference** / Even for content that does not need to conform, it must not interfere with accessibility of conforming content (no keyboard traps, no seizure-inducing content, no movement without user control) / **Consequence**: Third-party ads, widgets, or embeds that interfere = accessibility failure for the host page
- **Accessibility-Supported Technologies** / Content must be implemented using technologies that are accessibility-supported (work with assistive technologies) / **Consequence**: Custom JavaScript widgets must be tested with screen readers and other AT; functionality must not depend on AT-incompatible technology

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): privacy notices and consent mechanisms must be accessible
- **Consumer Protection** (`consumer-protection/`): inaccessible e-commerce may constitute unfair practice
- Cross-reference: `ada-title-iii.md` for ADA legal framework that references WCAG
- Cross-reference: `section-508.md` for federal procurement incorporating WCAG
- Cross-reference: `website-accessibility.md` for litigation applying WCAG as standard

## Sources

- [WCAG 2.1 (W3C Recommendation)](https://www.w3.org/TR/WCAG21/)
- [WCAG 2.2 (W3C Recommendation)](https://www.w3.org/TR/WCAG22/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [W3C WAI — Web Accessibility Initiative](https://www.w3.org/WAI/)

---
## Website Accessibility

# Website Accessibility Litigation

## Applicability

Applies to organizations facing or seeking to prevent accessibility litigation related to their websites, mobile applications, and digital properties. Covers litigation trends, demand letter practices, settlement patterns, structured negotiation, consent decree terms, and the serial plaintiff dynamic.

## Key Requirements

### Litigation Trends

- **Filing Volume** / Over 10,000 digital accessibility lawsuits filed annually in federal court (4,000+ ADA Title III web cases in 2023); additional thousands of demand letters that never reach court / **Consequence**: Digital accessibility litigation is high-volume and growing; any business with a website is a potential target
- **Jurisdictional Concentration** / Approximately 80% of filings concentrated in New York (Southern and Eastern Districts), California (Central and Northern Districts), and Florida (Southern District) / **Consequence**: Filing jurisdiction affects available claims (state law overlay), standing analysis, and settlement dynamics
- **Industry Targets** / E-commerce/retail (largest category), food service, travel/hospitality, entertainment, financial services, healthcare / **Consequence**: Industries with significant online transactions face highest risk; but any web presence is potentially subject to suit
- **Growth Drivers** / Remote commerce acceleration, expanded case law supporting digital accessibility claims, plaintiff attorney fee incentives, automated testing tools lowering cost of identifying defendants / **Consequence**: Filing volume expected to continue increasing; compliance is the most effective risk mitigation

### Demand Letter Practices

- **Pre-Suit Demand** / Many accessibility claims begin with demand letter identifying alleged WCAG violations and seeking settlement; typically 30-60 day response deadline / **Consequence**: Demand letter represents opportunity to resolve without litigation; but also signals potential serial plaintiff
- **Typical Demand Content** / Identifies specific accessibility barriers (often from automated scan), cites ADA Title III and state law, demands: (1) monetary payment ($5K-$25K), (2) commitment to remediate to WCAG 2.1 AA, (3) attorney's fees / **Consequence**: Even if settlement amount is modest, remediation commitment creates ongoing obligation
- **Response Strategy** / (1) Evaluate legitimacy of claims through independent audit; (2) assess standing and jurisdictional issues; (3) determine cost of remediation vs. settlement; (4) consider proactive remediation as defense / **Consequence**: Ignoring demand letters typically leads to lawsuit; engaging early often reduces total cost

### Settlement Patterns

- **Monetary Range** / Typical settlement: $5,000-$50,000 for standard demand/lawsuit (no class certification); complex class actions or DOJ consent decrees significantly higher ($100K-$5M+) / **Consequence**: Per-case cost is manageable, but repeat targeting and attorney's fees inflate total exposure
- **Attorney's Fees** / Prevailing plaintiff entitled to reasonable attorney's fees; fees in accessibility cases often $20K-$100K+ even for modest injunctive relief / **Consequence**: Fee-shifting makes even low-damages cases economically viable for plaintiffs; fee exposure often exceeds monetary settlement
- **Remediation Commitments** / Nearly all settlements require: (1) conformance with WCAG 2.1 Level AA; (2) remediation timeline (6-18 months); (3) annual third-party audits (1-3 years); (4) accessibility policy publication; (5) staff training / **Consequence**: Remediation is the primary settlement obligation; must budget for ongoing compliance costs

### Structured Negotiation

- **Alternative to Litigation** / Collaborative dispute resolution process developed in accessibility law; plaintiff's counsel and defendant negotiate without litigation / **Consequence**: Lower cost than litigation; avoids public complaint filing; results in same remediation outcomes
- **Process** / (1) Opening letter identifying barriers; (2) agreement to negotiate; (3) independent accessibility evaluation; (4) negotiated remediation plan; (5) written agreement; (6) monitoring period / **Consequence**: Structured negotiation results typically equivalent to consent decree terms; process is less adversarial
- **Precedent** / Used successfully with major financial institutions, retailers, healthcare companies, and government entities (Bank of America, CVS, Walmart) / **Consequence**: Structured negotiation is recognized and respected by courts and regulators as effective resolution method

### Consent Decree Terms (Typical)

- **WCAG Conformance** / Conformance with WCAG 2.1 Level AA for all public-facing web content and mobile applications / **Timeline**: Initial remediation: 12-18 months; full conformance: 18-24 months / **Consequence**: Non-conformance after deadline = contempt of court
- **Third-Party Auditing** / Annual or semi-annual accessibility audit by independent qualified auditor / **Timeline**: Duration of consent decree (typically 3-5 years) / **Consequence**: Audit reports shared with plaintiff's counsel; identified issues must be remediated within specified timeframe (30-90 days typical)
- **Accessibility Coordinator** / Designation of internal accessibility coordinator or team responsible for ongoing compliance / **Consequence**: Must have authority to implement changes; must be identified by name/role in consent decree
- **Training** / Accessibility training for web developers, content creators, designers, QA staff, and customer service personnel / **Consequence**: Training must be documented; frequency specified (typically annual minimum)
- **Accessibility Statement** / Publication of accessibility statement on website including: conformance target, known issues, feedback mechanism, contact information / **Consequence**: Must be kept current; outdated statement = consent decree violation
- **Reporting** / Regular reporting to plaintiff's counsel on remediation progress, audit results, complaint handling / **Consequence**: Failure to report = consent decree violation; may trigger enforcement motion

### Serial Plaintiff Issue

- **Pattern** / Small number of individuals and law firms file hundreds or thousands of accessibility claims; some plaintiffs file 100+ cases per year / **Consequence**: Creates perception of litigation as shakedown; but underlying accessibility barriers are real
- **Standing Challenges** / Defendants increasingly challenge standing of serial plaintiffs: (1) no genuine intent to use goods/services; (2) no actual injury; (3) manufactured standing / **Consequence**: Acheson Hotels v. Laufer (2023) — Supreme Court vacated as moot without resolving tester standing; issue remains unsettled
- **Judicial Scrutiny** / Some judges have sanctioned serial plaintiffs for abuse of process; others have limited fee awards for high-volume filers / **Consequence**: Judicial attitudes vary significantly; serial plaintiff status does not automatically defeat claim; underlying barriers must still be addressed
- **Legislative Response** / Some states have enacted pre-suit notice requirements to reduce abusive filings (e.g., Florida HB 613 requiring 120-day pre-suit notice with detailed barrier description) / **Consequence**: Pre-suit notice gives businesses opportunity to remediate; but does not eliminate liability

### Risk Mitigation

- **Proactive Compliance** / Implement WCAG 2.1 AA conformance program before receiving demand / **Consequence**: Most effective risk mitigation; compliance effort is defense to litigation; demonstrates good faith
- **Regular Testing** / Combination of automated testing (identifies ~30-40% of issues) and manual testing (keyboard, screen reader, cognitive review) / **Consequence**: Automated only = incomplete; must include manual testing with assistive technology
- **Accessibility Roadmap** / Documented plan showing remediation timeline, resource allocation, and progress / **Consequence**: Courts view active remediation efforts favorably; demonstrates good faith even if full conformance not yet achieved

## Interaction with Other Areas

- **Consumer Protection** (`consumer-protection/`): state UDAP claims may accompany accessibility litigation
- **IP and Technology** (`ip-and-technology/`): third-party software/platforms contributing to accessibility barriers
- Cross-reference: `ada-title-iii.md` for underlying ADA legal framework
- Cross-reference: `wcag.md` for technical standards referenced in settlements and consent decrees
- Cross-reference: `state-accessibility.md` for state-specific damages that increase monetary exposure

## Sources

- [UsableNet Annual ADA Web Accessibility Lawsuit Report](https://blog.usablenet.com/web-accessibility-lawsuits)
- [Seyfarth Shaw ADA Title III Lawsuit Tracker](https://www.adatitleiii.com/)
- [Acheson Hotels, LLC v. Laufer, 601 U.S. ___ (2023)](https://www.supremecourt.gov/opinions/23pdf/22-429_new_p8k0.pdf)
- [Structured Negotiation — Lainey Feingold](https://www.lflegal.com/negotiations/)
