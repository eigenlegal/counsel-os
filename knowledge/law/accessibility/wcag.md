---
counsel-os-type: law-area
content-version: "2026-04-08"
jurisdiction: [technical-standard, global, us-federal, us-state]
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
