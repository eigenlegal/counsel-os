---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, technical-standard]
authorities:
  - cite: "42 U.S.C. 12181-12189"
    title: "ADA Title III — Public Accommodations (verified 2026-06-11)"
    url: "https://www.law.cornell.edu/uscode/text/42/12181"
  - cite: "42 U.S.C. 12205"
    title: "ADA attorney's fees and costs"
    url: "https://www.law.cornell.edu/uscode/text/42/12205"
  - cite: "Robles v. Domino's Pizza, LLC, 913 F.3d 898 (9th Cir. 2019), cert. denied"
    title: "Website/app as extension of place of public accommodation"
    url: "https://casetext.com/case/robles-v-dominos-pizza-llc-2"
  - cite: "Acheson Hotels, LLC v. Laufer, 601 U.S. 1 (2023)"
    title: "ADA tester standing vacated as moot; circuit split unresolved"
    url: "https://www.supremecourt.gov/opinions/23pdf/22-429_new_p8k0.pdf"
  - cite: "DOJ Title II web rule, 89 FR 31320 (Apr. 24, 2024); 28 CFR Part 35"
    title: "Accessibility of Web Information and Services of State and Local Government Entities"
    url: "https://www.ada.gov/resources/2024-03998/"
  - cite: "Extension of Compliance Dates IFR, eff. Apr. 20, 2026 (verified 2026-06-11)"
    title: "DOJ one-year extension of Title II web rule compliance dates"
    url: "https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web"
---
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
- **DOJ Position** / DOJ has consistently taken the position that ADA Title III applies to websites of public accommodations; April 2024 rulemaking establishes WCAG 2.1 AA standard for state and local government websites (Title II); no separate Title III web accessibility rule has been issued as of mid-2026 / **Consequence**: DOJ rulemaking for Title II signals likely Title III standard; businesses should prepare for WCAG 2.1 AA as de facto standard. A parallel HHS Section 504 rule (May 9, 2024) imposes WCAG 2.1 A/AA on recipients of HHS financial assistance — see `_overview.md` and `state-accessibility.md` for deadlines
- **Undue Burden Defense** / Entity not required to take actions that would result in undue burden (significant difficulty or expense) / **Threshold**: Case-by-case analysis considering: entity's resources, nature and cost of action required, impact on operations / **Consequence**: Defense rarely succeeds for large entities; small businesses may have stronger argument; must document burden analysis

### Standing Requirements

- **Article III Standing** / Plaintiff must demonstrate: (1) injury in fact (concrete and particularized); (2) traceable to defendant's conduct; (3) redressable by judicial relief / **Consequence**: Standing is frequently litigated in digital accessibility cases
- **Tester Plaintiffs** / Individuals who visit websites specifically to test accessibility and file suit; courts divided on whether testers have standing:
  - **Standing Found**: Where tester demonstrates intent to use goods/services and was deterred by inaccessibility
  - **Standing Denied**: Where tester cannot demonstrate genuine intent to use goods/services (Acheson Hotels, LLC v. Laufer, 601 U.S. 1 (Dec. 5, 2023), Supreme Court vacated as moot, expressly leaving the question unresolved) / **Consequence**: Tester standing remains unsettled as of mid-2026; the circuit split is "very much alive" — the 1st, 4th, and 11th Circuits have found tester standing while the 2nd, 5th, and 10th have rejected it; jurisdictional analysis critical
- **Deterrent Effect** / Plaintiff need not actually attempt to access the website if they were aware of barriers that deterred them / **Consequence**: Broadens potential plaintiff class; knowledge of inaccessibility alone may suffice

### Remedies and Penalties

- **Private Actions** / Individuals may bring suit for injunctive relief only (no monetary damages in private Title III actions under federal law) / **Consequence**: No damages = lower individual exposure; but attorney's fee awards can be substantial ($50K-$500K+); and state law claims may be joined for damages
- **DOJ Enforcement** / DOJ may bring civil actions seeking: injunctive relief, monetary damages for aggrieved individuals, and civil penalties / **Threshold**: First violation: up to $75,000; subsequent violations: up to $150,000 (adjusted for inflation) / **Consequence**: DOJ enforcement actions typically result in comprehensive consent decrees with ongoing monitoring
- **Attorney's Fees** / Prevailing plaintiff entitled to reasonable attorney's fees and costs under 42 U.S.C. 12205 / **Consequence**: Fee-shifting incentivizes plaintiff's attorneys; fees often exceed value of injunctive relief
- **State Law Claims** / Plaintiffs frequently join state claims (California Unruh, NY HRL) that provide monetary damages / **Consequence**: See `state-accessibility.md` for state-specific damages; combined federal/state claims increase exposure significantly

### DOJ Rulemaking — Title II (April 2024)

- **Scope** / Final rule for state and local government entities (Title II) requiring WCAG 2.1 Level AA conformance for web content and mobile applications (89 FR 31320, Apr. 24, 2024) / **Timeline**: DOJ extended the original deadlines by one year via an interim final rule effective April 20, 2026 — large entities (population 50K+) now must comply by April 26, 2027; smaller public entities and special district governments by April 26, 2028 / **Consequence**: First formal ADA web accessibility standard; the technical standard (WCAG 2.1 AA) is unchanged by the extension; expected to influence Title III enforcement and litigation standards. The extension applies only to Title II public entities — it does not move any private Title III obligation
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
- [DOJ Interim Final Rule — Extension of Title II Web Rule Compliance Dates (eff. April 20, 2026)](https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web)
- [DOJ Guidance on Web Accessibility and the ADA](https://www.ada.gov/resources/web-guidance/)

---
