---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
---

## Ccpa Cpra

# CCPA/CPRA (California Consumer Privacy Act / California Privacy Rights Act)

## Applicability

The California Consumer Privacy Act (Cal. Civ. Code 1798.100 et seq.), as amended by the California Privacy Rights Act (Proposition 24, effective January 1, 2023), applies to **for-profit entities** doing business in California that meet ANY of the following thresholds:

- **(a)** Annual gross revenue exceeding **$25 million** (adjusted for inflation by the CPPA) in the preceding calendar year.
- **(b)** Annually buys, sells, or shares the personal information of **100,000 or more** California residents, households, or devices.
- **(c)** Derives **50% or more** of annual revenue from selling or sharing consumers' personal information.

**Exemptions:** Non-profit entities are exempt. HIPAA-covered entities are exempt for PHI governed by HIPAA. GLBA-covered financial institutions are exempt at the data level (not entity level) for data governed by GLBA. Employee and B2B data exemptions expired January 1, 2023 under CPRA.

**Enforcement:** California Attorney General and the California Privacy Protection Agency (CPPA). The CPPA has rulemaking, investigative, and enforcement authority. Civil penalties up to **$2,500 per violation** (unintentional) or **$7,500 per intentional violation** or violation involving minors' data.

**Private right of action (Section 1798.150):** Limited to data breaches involving unauthorized access, theft, or disclosure of nonencrypted and nonredacted personal information resulting from a business's failure to implement and maintain reasonable security procedures. Statutory damages of **$100 to $750 per consumer per incident**, or actual damages, whichever is greater.

## Key Requirements

### Definitions: Sale vs. Sharing vs. Business Purpose Disclosure

Understanding these distinctions is critical for contract structuring:

- **Sale** (Section 1798.140(ad)): Selling, renting, releasing, disclosing, disseminating, making available, transferring, or otherwise communicating a consumer's personal information to a third party **for monetary or other valuable consideration**. Includes data exchanges where the business receives a benefit (e.g., improved analytics, audience matching).
- **Sharing** (Section 1798.140(ah)): Communicating a consumer's personal information to a third party for **cross-context behavioral advertising**, whether or not for monetary consideration. This captures most adtech, retargeting, and behavioral advertising data flows even where no money changes hands.
- **Business purpose disclosure** (Section 1798.140(e)): Disclosing personal information to a service provider or contractor for a disclosed business purpose under a written contract that restricts use. Not a "sale" or "sharing" if the contractual restrictions are in place.
- **Consequence:** Misclassifying a "sale" or "sharing" as a business purpose disclosure means the business has failed to provide required opt-out rights — a per-consumer, per-incident violation.

### Service Provider vs. Contractor vs. Third Party

- **Service provider** (Section 1798.140(ag)): Processes personal information on behalf of the business pursuant to a written contract that prohibits retaining, using, or disclosing the information for any purpose other than performing the contracted services. Must not sell or share the information. Must comply with the CCPA. Must notify the business if it can no longer meet its CCPA obligations.
- **Contractor** (Section 1798.140(j)): Similar to service provider but must additionally **certify** that it understands the CCPA/CPRA restrictions and will comply. CPRA imposes this as a distinct category with certification requirements.
- **Third party** (Section 1798.140(ai)): Any person that is not the business collecting the information, a service provider, or a contractor. Receipt of personal information by a third party may constitute a "sale" or "sharing" requiring opt-out rights.
- **Consequence:** Contracts that fail to include required restrictive language render the recipient a "third party," potentially converting every disclosure into an unauthorized sale or sharing.

### Consumer Rights and Response Timelines

All rights apply to California residents (defined as "consumers"):

- **Right to know/access (Section 1798.100, 1798.110):** Consumers can request categories and specific pieces of personal information collected. Business must respond within **45 days** of receiving a verifiable request, extendable by an additional **45 days** (90 total) with notice. Must cover the 12-month period preceding the request. Under CPRA, consumers may request information beyond the 12-month lookback if the business held the data at that point.
- **Right to delete (Section 1798.105):** Consumers can request deletion of personal information. Business must respond within **45 days**, extendable to **90 days**. Must direct service providers and contractors to delete. Subject to 9 enumerated exceptions (e.g., complete a transaction, detect security incidents, comply with legal obligation, internal uses reasonably aligned with consumer expectations).
- **Right to correct (Section 1798.106):** CPRA addition. Consumers can request correction of inaccurate personal information, taking into account the nature and purposes of processing. Business must respond within **45 days**, extendable to **90 days**. Must direct service providers and contractors to correct.
- **Right to opt out of sale/sharing (Section 1798.120):** Business must provide a clear "Do Not Sell or Share My Personal Information" link. Must honor opt-out requests, including **Global Privacy Control (GPC)** and similar user-enabled opt-out preference signals. Must wait **at least 12 months** before requesting that a consumer who has opted out authorize the sale or sharing again.
- **Right to limit use of sensitive personal information (Section 1798.121):** CPRA addition. Consumers can direct the business to limit use and disclosure of sensitive PI to purposes necessary to perform the services or provide the goods reasonably expected by an average consumer. Sensitive PI includes SSN, financial account details, precise geolocation, racial/ethnic origin, religious beliefs, union membership, mail/email/text content (unless directed to the business), genetic data, biometric data, health data, and sex life/orientation data.
- **Right to non-discrimination (Section 1798.125):** Business cannot discriminate against consumers for exercising CCPA rights. Financial incentive programs are permitted with clear notice and opt-in consent.

### Privacy Notice Requirements (Section 1798.100(a), 1798.130)

At or before the point of collection, businesses must disclose:
- Categories of personal information collected and the purposes for each category.
- Whether the business sells or shares personal information, and the categories sold/shared.
- **Retention periods** for each category of personal information, or the criteria used to determine retention (CPRA addition).
- Consumer rights and how to exercise them.
- **Consequence:** Failure to provide adequate notice is a per-consumer violation. CPPA enforcement actions have specifically targeted inadequate privacy notices.

### Data Minimization (Section 1798.100(c))

CPRA addition: Collection, use, retention, and sharing of personal information must be **reasonably necessary and proportionate** to the purposes for which it was collected or another disclosed, compatible purpose. Businesses may not retain personal information longer than reasonably necessary for each disclosed purpose.

### Minors' Personal Information (Section 1798.120(c)-(d))

- Businesses with actual knowledge that a consumer is under **16** must obtain **affirmative authorization** (opt-in) before selling or sharing their personal information.
- For consumers under **13**, opt-in consent must come from the consumer's parent or guardian.
- **Consequence:** Violations involving minors' data carry treble penalties — **$7,500 per violation** rather than the standard $2,500.

### Reasonable Security (Section 1798.150)

While CCPA does not prescribe specific security measures, the private right of action for data breaches requires businesses to **implement and maintain reasonable security procedures and practices** appropriate to the nature of the personal information. The California AG has pointed to the CIS Critical Security Controls as a baseline for "reasonable security."

### Automated Decision-Making Technology (CPRA Section 1798.185(a)(16))

- **What:** The CPRA directs the CPPA to issue regulations governing businesses' use of automated decision-making technology, including profiling, particularly regarding decisions that produce legal or similarly significant effects on consumers.
- **Requirements (per CPPA rulemaking):** Businesses must provide consumers with information about the logic involved in automated decision-making processes, the intended output, and the right to opt out of automated decision-making for significant decisions. Pre-decision notice and access to information about the decision are required.
- **Consequence:** Violations enforced by the CPPA with standard penalty authority — **$2,500 per unintentional violation, $7,500 per intentional violation**.

### Cybersecurity Audits and Risk Assessments (CPRA Section 1798.185(a)(15))

- **What:** The CPPA is directed to issue regulations requiring businesses whose processing presents significant risk to consumer privacy or security to (a) perform annual **cybersecurity audits** and (b) submit regular **risk assessments** to the CPPA regarding their processing of personal information.
- **Threshold:** Applies to businesses whose processing of personal information presents "significant risk to consumers' privacy or security" — criteria defined by CPPA regulations.
- **Consequence:** Failure to perform required audits or submit risk assessments is an independent violation subject to CPPA enforcement.

### Data Broker Registration (Cal. Civ. Code 1798.99.80 et seq.)

- **What:** A "data broker" is a business that knowingly collects and sells the personal information of consumers with whom the business does not have a direct relationship. Data brokers must register with the CPPA annually.
- **Delete My Data:** The California Delete Act (SB 362, 2023) requires the CPPA to establish an accessible mechanism by **January 1, 2026** allowing consumers to submit a single verified request to all registered data brokers to delete their personal information.
- **Registration fee:** Annual fee determined by the CPPA.
- **Consequence:** Failure to register — **$200 per day** of violation. Penalties for failure to comply with delete requests assessed under standard CCPA enforcement.

### Response to Consumer Requests — Practical Requirements

- **Verification:** Businesses must verify the identity of consumers making requests. For requests to know specific pieces of personal information or requests to delete, businesses must verify to a **reasonably high degree of certainty** (matching at least 3 data points). For requests to know categories, verification to a **reasonable degree of certainty** (matching at least 2 data points) is sufficient.
- **Authorized agents:** Consumers may use an authorized agent. The business may require the agent to provide a signed, written authorization. For requests where the agent does not provide a power of attorney, the business may verify the consumer's identity directly.
- **Household requests:** Businesses must respond to household-level requests if all members of the household jointly request and the business can verify all members and their association.
- **Free of charge:** Businesses must fulfill requests free of charge. Businesses may charge a reasonable fee or refuse to act only if requests are **manifestly unfounded or excessive**, particularly if repetitive.

## Interaction with Other Areas

- **Data Privacy (GDPR):** Companies subject to both must harmonize data processing agreements, privacy notices, and rights fulfillment processes. GDPR's DPA and CCPA's service provider agreement can be combined but must satisfy both regimes. GDPR consent does not satisfy CCPA opt-out requirements (different mechanisms).
- **Consumer Protection:** CCPA's private right of action for data breaches intersects with broader consumer protection statutes. FTC enforcement on data security overlaps with CCPA reasonable security requirements. California's Unfair Competition Law (Bus. & Prof. Code 17200) provides an independent enforcement vehicle.
- **Employment:** CCPA applies to employee and job applicant personal information (post-exemption expiration January 1, 2023). HR data handling must comply with notice, access, deletion, and correction rights. Employee monitoring data is personal information.
- **IP and Technology:** SaaS and technology vendor agreements must address CCPA service provider requirements, including restrictions on using customer data for product improvement, model training, or cross-customer analytics. These uses may constitute "sale" or "sharing" if not properly restricted.
- **Financial Services:** GLBA-covered financial institutions are partially exempt, but the exemption applies at the data level (not entity level). Data not subject to GLBA held by a financial institution remains subject to CCPA. Careful scoping is required.
- **Data Privacy (COPPA):** For platforms directed to children, both COPPA and CCPA's minor consent provisions may apply concurrently. COPPA's verifiable parental consent standard is stricter than CCPA's opt-in requirement for under-13.
- **Data Privacy (US State Laws):** CCPA often serves as the benchmark for multi-state compliance. However, some state laws impose obligations not found in CCPA (e.g., mandatory universal opt-out recognition under Colorado and Connecticut). Compliance with CCPA alone does not guarantee compliance with other state laws.

### CPPA Enforcement Trends and Key Actions

The CPPA, which assumed full enforcement authority from the AG, has signaled enforcement priorities:

- **Opt-out signal enforcement:** The CPPA has prioritized ensuring that businesses honor Global Privacy Control and similar signals. Enforcement sweeps targeting non-compliance with GPC began in 2024.
- **Dark patterns:** The CPPA regulations specifically address the use of dark patterns in the exercise of consumer rights. Consent or opt-in obtained through a dark pattern is not valid consent. Dark patterns include confusing language, unnecessary steps, requiring consumers to read through unnecessary information, and using manipulative design.
- **Data broker oversight:** The CPPA has enforcement authority over data broker registration and the Delete My Data mechanism.
- **Service provider misuse:** Enforcement actions have targeted service providers that use personal information beyond the scope of contracted services, and businesses that fail to include required contractual restrictions.
- **Penalty escalation:** The CPPA has signaled willingness to pursue maximum penalties for intentional violations and violations involving minors' data. Per-consumer, per-violation calculation means aggregate penalties in enforcement actions can reach tens of millions of dollars.

## Sources

- [CCPA/CPRA Full Text — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5) — Cal. Civ. Code 1798.100-1798.199.100
- [CPPA Final Regulations](https://cppa.ca.gov/regulations/) — Implementing regulations from the California Privacy Protection Agency
- [California AG CCPA Enforcement](https://oag.ca.gov/privacy/ccpa) — Enforcement actions and guidance from the California Attorney General
- [CIS Critical Security Controls](https://www.cisecurity.org/controls) — Referenced as a baseline for "reasonable security" under CCPA
