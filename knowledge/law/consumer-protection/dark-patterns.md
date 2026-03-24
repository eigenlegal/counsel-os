---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
---

## Dark Patterns

# Dark Patterns

## Applicability

This sub-file applies whenever a matter involves user interface design requirements for consumer-facing digital products, cancellation flow design, consent mechanisms (especially for data collection, subscriptions, or recurring charges), allegations of deceptive design or manipulative interfaces, checkout flow compliance, cookie consent and privacy choice architecture, or regulatory compliance reviews for digital products, mobile apps, or e-commerce platforms. Also applies when evaluating design and product requirements in technology vendor agreements.

## Key Requirements

### FTC Enforcement Against Dark Patterns

- **What**: The FTC has declared dark patterns to be unfair or deceptive acts or practices under FTC Act Section 5. The FTC defines dark patterns as design practices that "trick or manipulate consumers into making choices they would not otherwise have made and that may cause harm." The FTC issued a staff report, "Bringing Dark Patterns to Light" (September 2022), outlining its enforcement framework.
- **Threshold**: The FTC evaluates dark patterns under both the deception standard (is the design likely to mislead a reasonable consumer?) and the unfairness standard (does the design cause substantial injury not reasonably avoidable by consumers?). The FTC has identified specific categories of concern: (1) misleading consumers into purchasing products or services, (2) tricking consumers into disclosing personal information, (3) misleading consumers into agreeing to charges or terms, and (4) making it difficult to cancel subscriptions or memberships.
- **Consequence**: FTC enforcement actions have resulted in consent orders, civil penalties (up to $50,120+ per violation), consumer refunds, and injunctive relief requiring redesign of interfaces. Notable enforcement actions include Fortnite/Epic Games ($520 million total settlement in 2022, partly for dark pattern charges targeting children), Age of Empires/ABCmouse ($10 million for deceptive cancellation practices), and Credit Karma ($3 million for misleading "pre-approved" credit claims).

### Dark Pattern Categories (FTC Framework)

#### Nagging

- **What**: Repeated prompts, interruptions, or requests that pressure users into taking an action (e.g., repeated pop-ups asking users to enable notifications or upgrade to a paid plan).
- **Threshold**: Nagging becomes a legal issue when it interferes with the consumer's ability to use the product as intended, when it obscures or delays the consumer's desired action, or when the frequency makes the product effectively unusable without capitulating.
- **Consequence**: May constitute unfairness (substantial injury through interference) or deception (if nagging obscures material information or choices).

#### Obstruction

- **What**: Making a desired action (typically cancellation, opt-out, or account deletion) significantly more difficult than the corresponding sign-up action. Includes requiring phone calls to cancel when sign-up was online, multi-step cancellation flows, "save" offers that obscure the cancellation option, and timed delays.
- **Threshold**: The FTC Click-to-Cancel Rule (2024) establishes a bright-line test: cancellation must be at least as easy as sign-up. If sign-up required no phone call, cancellation cannot require a phone call. If sign-up was completed in 2 clicks, cancellation should not require 10 steps. Mandatory "retention" or "save" offers during cancellation are restricted — the consumer must be able to bypass them easily.
- **Consequence**: Violations of the Click-to-Cancel Rule subject sellers to civil penalties. Obstruction in cancellation flows is one of the most actively enforced dark pattern categories.

#### Sneaking

- **What**: Adding items to a consumer's cart without consent, hiding charges until checkout, presenting pre-selected add-ons, or using "drip pricing" to reveal the full cost only at the final stage of a transaction.
- **Threshold**: The FTC and state laws require that material costs be disclosed before the consumer provides payment information. Drip pricing — where mandatory fees are revealed incrementally — is the subject of an FTC proposed rule (2023) that would prohibit hiding mandatory fees from advertised prices. Pre-checked add-ons that increase the total cost are considered deceptive if not clearly and conspicuously disclosed.
- **Consequence**: FTC enforcement for deceptive pricing. State AG enforcement under UDAP statutes. Private class actions for deceptive pricing practices.

#### Forced Action

- **What**: Requiring consumers to take an unrelated action to access desired functionality. Includes requiring account creation to make a one-time purchase, requiring consent to marketing as a condition of service, or requiring personal data disclosure beyond what is necessary for the transaction.
- **Threshold**: Forced action becomes legally problematic when the required action involves: (1) consent that cannot lawfully be a condition of the transaction (e.g., TCPA prohibits requiring consent-to-call as a condition of purchase), (2) data collection that violates privacy law minimization requirements, or (3) terms that are substantively unconscionable under state contract law.
- **Consequence**: May violate the TCPA (consent bundling), GDPR (freely given consent requirement), state privacy laws (data minimization), or state consumer protection statutes (unconscionability).

#### Social Proof Manipulation and Confirmshaming

- **What**: Using fake or misleading social proof (fabricated reviews, fake urgency timers, false scarcity indicators) or "confirmshaming" language (e.g., "No, I don't want to save money") to manipulate consumer choices.
- **Threshold**: Fabricated reviews and fake social proof are deceptive practices under FTC Act Section 5. The FTC's proposed rule on fake reviews (2023) would specifically prohibit the creation, purchase, or dissemination of fake or misleading reviews. False urgency (countdown timers that reset) and false scarcity ("only 2 left!" when inventory is abundant) are deceptive if they do not reflect reality. Confirmshaming is not per se illegal but contributes to overall deceptive context.
- **Consequence**: FTC enforcement for fake reviews and false urgency/scarcity. State UDAP claims for deceptive practices. Platform terms of service may also restrict these practices.

### EU Digital Services Act (DSA) — Dark Pattern Provisions

- **What**: The EU DSA (Regulation 2022/2065), effective February 2024, explicitly prohibits online platforms from using dark patterns in their interfaces. Article 25 states that providers of online platforms "shall not design, organise or operate their online interfaces in a way that deceives or manipulates the recipients of their service or in a way that otherwise materially distorts or impairs the ability of the recipients of their service to make free and informed decisions."
- **Threshold**: The DSA prohibition applies to all "online platforms" (as defined under the DSA) serving EU users. It covers interface design that: (1) gives undue prominence to certain choices, (2) repeatedly requests users to make a choice where they have already made one, (3) makes the procedure for cancellation more difficult than sign-up, or (4) makes certain choices more difficult or time-consuming than others through deceptive design. Very Large Online Platforms (VLOPs — those with 45M+ monthly EU active users) face additional transparency and compliance obligations.
- **Consequence**: Fines of up to 6% of global annual turnover for DSA violations. National Digital Services Coordinators enforce the DSA in each member state. The European Commission has direct enforcement authority over VLOPs.

### California Dark Pattern Provisions (CCPA/CPRA)

- **What**: California regulations under the CPRA define "dark patterns" and provide that consent obtained through dark patterns does not constitute valid consent. Cal. Civ. Code § 1798.140(l): "Agreement obtained through use of dark patterns does not constitute consent."
- **Threshold**: The CPRA regulations define a "dark pattern" as "a user interface designed or manipulated with the substantial effect of subverting or impairing user autonomy, decision-making, or choice." If a company uses dark patterns to obtain consumer "consent" for data practices, that consent is not legally valid — the data practices are treated as non-consensual.
- **Consequence**: Data practices based on consent obtained through dark patterns are treated as violations of the CCPA/CPRA, subject to enforcement by the California AG and California Privacy Protection Agency (CPPA). Penalties of $2,500 per violation or $7,500 per intentional violation. Private right of action for data breach claims.

### Colorado Privacy Act — Dark Pattern Definition

- **What**: The Colorado Privacy Act (CPA) similarly defines dark patterns and provides that consent obtained through dark patterns is not valid consent.
- **Threshold**: The CPA defines "dark pattern" as "a user interface designed or manipulated with the substantial effect of subverting or impairing user autonomy, decisionmaking, or choice." Consent for data processing obtained through dark patterns is not valid under the CPA.
- **Consequence**: AG enforcement with civil penalties up to $20,000 per violation.

### Enforcement Trends

- **What**: Dark pattern enforcement is intensifying across all levels — federal (FTC), state (AGs and privacy regulators), and international (EU DSA). Enforcement actions are increasingly targeting specific design choices rather than just overall deceptive marketing.
- **Threshold**: Recent enforcement trends focus on: (1) cancellation flow obstruction (most frequently targeted), (2) consent mechanism design (pre-checked boxes, confusing toggle defaults), (3) pricing transparency (drip pricing, hidden fees), (4) children's interfaces (heightened scrutiny under COPPA), and (5) privacy choice architecture (making "accept all cookies" prominent while burying "reject all").
- **Consequence**: Regulators are increasingly requiring prospective design compliance — not just monetary penalties but court-ordered redesign of interfaces and pre-approval of UI changes.

## Interaction with Other Areas

- **Consumer Protection — Auto-Renewal**: Dark pattern prohibitions in cancellation flows directly implement ROSCA and the FTC Click-to-Cancel Rule. Obstruction patterns in cancellation are the most actively enforced category. See `auto-renewal.md`.
- **Consumer Protection — FTC/UDAP**: Dark patterns are enforced under the existing FTC Act Section 5 deception and unfairness framework. No new statute is required — the FTC treats dark patterns as applications of existing law. See `ftc-udap.md`.
- **Consumer Protection — State Laws**: State UDAP statutes provide private rights of action for dark pattern practices that the FTC Act does not. California, Massachusetts, and other states with broad unfairness coverage are particularly active. See `state-consumer-laws.md`.
- **Data Privacy**: Dark pattern definitions in CCPA/CPRA and Colorado Privacy Act specifically invalidate consent obtained through manipulative design. Cookie consent interfaces are a primary enforcement focus. Dark pattern restrictions intersect with privacy-by-design requirements under GDPR.
- **Consumer Protection — CAN-SPAM**: Opt-out mechanisms that use dark patterns (multi-step unsubscribe, guilt-tripping language) may violate CAN-SPAM's simple opt-out requirement.

## Sources

- [FTC "Bringing Dark Patterns to Light" Report (2022)](https://www.ftc.gov/reports/bringing-dark-patterns-light) — FTC staff report on dark pattern enforcement framework and categories.
- [FTC Click-to-Cancel Rule (2024)](https://www.ftc.gov/legal-library/browse/federal-register-notices/negative-option-rule) — FTC rule requiring cancellation at least as easy as sign-up.
- [EU Digital Services Act — Regulation 2022/2065, Article 25](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065) — EU prohibition on dark patterns by online platforms.
- [Cal. Civ. Code § 1798.140(l) — CCPA/CPRA Dark Pattern Definition](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.140.&lawCode=CIV) — California statutory definition invalidating consent via dark patterns.
- [Colorado Privacy Act — C.R.S. § 6-1-1303(9)](https://leg.colorado.gov/sites/default/files/2021a_190_signed.pdf) — Colorado dark pattern definition.
