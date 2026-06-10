---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, eu, international]
last-reviewed: "2026-06-10"
authorities:
  - cite: "Regulation (EU) 2016/679, Articles 12-22"
    title: "GDPR data subject rights provisions"
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj"
  - cite: "Cal. Civ. Code §§ 1798.100-1798.125"
    title: "CCPA/CPRA consumer rights"
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5"
  - cite: "California Privacy Protection Agency regulations"
    title: "CPPA regulations on verification, authorized agents, and request processing"
    url: "https://cppa.ca.gov/regulations/"
---
# Data Subject Rights

## Applicability

This sub-file covers the statutory rights of individuals (data subjects, consumers, data principals) to access, control, and manage their personal data across jurisdictions. Load when:

- A contract addresses consumer or data subject request handling, fulfillment procedures, or response timelines.
- Data subject access requests (DSARs) or consumer rights requests are at issue.
- A DPA or service agreement allocates responsibility for responding to rights requests.
- Product or service design must accommodate rights request fulfillment (right to deletion, portability, etc.).
- Exceptions or limitations to data subject rights are being evaluated.

## Key Requirements

### GDPR Data Subject Rights (Articles 15-22)

The GDPR provides the broadest set of individual rights among major privacy frameworks:

- **Right of access (Art. 15):** Data subjects may obtain confirmation of whether their data is being processed and, if so, a copy of the personal data and information about purposes, categories, recipients, retention periods, data source, and the existence of automated decision-making. **Response timeline: 1 month**, extendable by **2 additional months** for complex or numerous requests (3 months total), with notice to the data subject. First copy must be free; additional copies may incur a reasonable fee.
- **Right to rectification (Art. 16):** Correction of inaccurate personal data and completion of incomplete data. **Response timeline: without undue delay** (interpreted as within 1 month).
- **Right to erasure / "right to be forgotten" (Art. 17):** Deletion when: data is no longer necessary for the collected purpose; consent is withdrawn; the data subject objects under Art. 21; processing is unlawful; or erasure is required by EU/member state law. **Exceptions:** exercising freedom of expression, compliance with a legal obligation, public health, archiving in the public interest, or establishment/exercise/defense of legal claims. **Response timeline: without undue delay** (within 1 month).
- **Right to restriction of processing (Art. 18):** Data subject may require the controller to restrict processing (store but not further process) when accuracy is contested, processing is unlawful but erasure is not desired, data is needed for legal claims, or the data subject has objected pending verification. **Response timeline: without undue delay.**
- **Right to data portability (Art. 20):** Receive personal data in a structured, commonly used, machine-readable format and transmit to another controller. **Applies only** to data provided by the data subject and processed by automated means on the basis of consent or contract. Does not apply to processing based on legitimate interests, legal obligation, or other bases. **Response timeline: without undue delay** (within 1 month).
- **Right to object (Art. 21):** Object to processing based on legitimate interests (Art. 6(1)(f)) or public task (Art. 6(1)(e)). Controller must cease processing unless it demonstrates compelling legitimate grounds overriding the data subject's interests. **Absolute right to object** to processing for direct marketing — no balancing test; processing must cease immediately.
- **Rights related to automated decision-making (Art. 22):** Right not to be subject to decisions based solely on automated processing, including profiling, that produce legal or similarly significant effects. The data subject has the right to obtain human intervention, express their point of view, and contest the decision. **Exceptions:** contract performance, legal authorization, or explicit consent — each with safeguards.
- **Consequence:** Violation of data subject rights — fines up to **EUR 20 million or 4% of global annual turnover** (Art. 83(5)). Data subjects also have the right to compensation for material and non-material damage (Art. 82).

### CCPA/CPRA Consumer Rights (Cal. Civ. Code 1798.100-1798.125)

- **Right to know/access (1798.100, 1798.110):** Categories and specific pieces of personal information collected, sources, business/commercial purposes, and categories of third parties. **Response timeline: 45 days**, extendable by **45 additional days** (90 days total) with notice. Covers the **12-month period** preceding the request; CPRA permits requests beyond 12 months if the business held the data.
- **Right to delete (1798.105):** Deletion of personal information collected. Business must direct service providers and contractors to delete. **9 enumerated exceptions** (complete transaction, security, comply with law, internal uses aligned with expectations, etc.). **Response timeline: 45 days**, extendable to **90 days**.
- **Right to correct (1798.106):** CPRA addition. Correction of inaccurate personal information. Business must use commercially reasonable efforts to correct and direct service providers/contractors to correct. **Response timeline: 45 days**, extendable to **90 days**.
- **Right to opt out of sale/sharing (1798.120):** Must provide "Do Not Sell or Share My Personal Information" link. Must honor Global Privacy Control (GPC). No response timeline — must take effect upon request.
- **Right to limit use of sensitive personal information (1798.121):** CPRA addition. Limit use to purposes necessary for providing requested goods/services. Must provide "Limit the Use of My Sensitive Personal Information" link.
- **Right to non-discrimination (1798.125):** Cannot discriminate for exercising rights (no denial of goods/services, different pricing, different quality). Financial incentive programs are permitted with notice and consent.
- **Verification:** Businesses must verify the identity of the requestor using a reasonable method. For deletion and access to specific pieces, higher verification is required.
- **Authorized agents:** Consumers may designate an authorized agent. Business may require the agent to provide signed permission and may verify the consumer's identity directly.
- **Consequence:** AG enforcement — **$2,500 per unintentional violation, $7,500 per intentional violation**. CPPA enforcement with same penalty authority.

### US State Privacy Law Rights (Common Framework)

Most comprehensive US state privacy laws provide a core set of rights:

| Right | VA | CO | CT | UT | TX | OR |
|-------|----|----|----|----|----|----|
| Access | Yes | Yes | Yes | Yes | Yes | Yes |
| Correct | Yes | Yes | Yes | **No** | Yes | Yes |
| Delete | Yes | Yes | Yes | Yes | Yes | Yes |
| Portability | Yes | Yes | Yes | Yes | Yes | Yes |
| Opt out — targeted advertising | Yes | Yes | Yes | Yes | Yes | Yes |
| Opt out — sale | Yes | Yes | Yes | Yes | Yes | Yes |
| Opt out — profiling | Yes | Yes | Yes | No | Yes | Yes |
| List of third parties | No | No | No | No | No | **Yes** |
| Universal opt-out signal | No | **Required** | **Required** | No | No | No |

- **Response timelines:** Most states follow CCPA's **45-day** timeline, extendable by **45 days** with notice.
- **Appeal rights:** Virginia, Colorado, Connecticut, and several other states require businesses to provide an **appeal process** when a rights request is denied. The appeal must be decided within **60 days** (VA, CO, CT). If the appeal is denied, the consumer must be informed of how to file a complaint with the state AG.
- **Consequence:** AG enforcement — typically **$7,500 per violation**. No private right of action in any state (except Illinois BIPA for biometric data).

### International Rights Comparison

| Right | GDPR | CCPA/CPRA | LGPD (Brazil) | PIPL (China) | PIPEDA (Canada) | PDPA (Singapore) |
|-------|------|-----------|---------------|-------------|-----------------|------------------|
| Access | Yes (1 mo) | Yes (45 days) | Yes | Yes | Yes (30 days) | Yes (30 days) |
| Correction | Yes | Yes (CPRA) | Yes | Yes | Yes | Yes |
| Deletion | Yes (exceptions) | Yes (9 exceptions) | Yes | Yes | Yes (exceptions) | No general right |
| Portability | Yes (consent/contract only) | Yes (CPRA) | Yes | Yes (limited) | Limited | Yes (2020 amendment) |
| Object to processing | Yes | Opt out of sale/sharing | Limited | Yes | Withdraw consent | Withdraw consent |
| Restrict processing | Yes | Limit sensitive PI use | Limited | Yes | Limited | No |
| Automated decisions | Yes (Art. 22) | Limited (profiling opt-out) | Yes | Yes (Art. 24) | Limited | No |
| Non-discrimination | Limited (Art. 22) | Yes (1798.125) | No specific | No specific | No specific | No specific |

### Common Exceptions to Rights Across Jurisdictions

Most privacy laws recognize similar categories of exceptions:

- **Legal obligations:** Compliance with a legal obligation requiring retention or processing (all jurisdictions).
- **Legal claims:** Data needed for the establishment, exercise, or defense of legal claims (GDPR Art. 17(3)(e), most state laws).
- **Security:** Processing necessary for detecting security incidents or protecting against fraud (CCPA, state laws).
- **Free expression:** Exercising the right of freedom of expression and information (GDPR Art. 17(3)(a)).
- **Public health:** Processing for public health purposes (GDPR Art. 17(3)(c)).
- **Archiving/research:** Archiving in the public interest, scientific or historical research, or statistical purposes where erasure would render impossible or seriously impair the research (GDPR Art. 17(3)(d)).
- **Contractual necessity:** Completing a transaction or performing a contract with the consumer (CCPA exception 9).
- **Verification failure:** If the business cannot verify the requestor's identity, it may deny the request (all US jurisdictions).

### Processor/Service Provider Obligations for Rights Fulfillment

- **GDPR (Art. 28(3)(e)):** Processors must assist the controller in fulfilling data subject rights requests, taking into account the nature of processing.
- **CCPA (1798.105(c)):** Service providers must comply with the business's instruction to delete, and must notify their own service providers/contractors to delete.
- **Contractual allocation:** DPAs should specify: (a) who receives the request, (b) notification timelines between processor and controller, (c) cooperation obligations, (d) cost allocation for request fulfillment, and (e) technical capabilities for data retrieval, correction, deletion, and portability export.

### Manifestly Unfounded or Excessive Requests

Both GDPR and several US state laws allow controllers to refuse or charge a fee for requests that are manifestly unfounded or excessive:

- **GDPR (Art. 12(5)):** The controller may charge a reasonable fee or refuse to act when requests are manifestly unfounded or excessive, particularly where repetitive. The controller bears the burden of demonstrating that the request is manifestly unfounded or excessive.
- **CCPA/CPRA:** Businesses may deny requests that are manifestly unfounded or excessive. If denying, the business must inform the consumer and provide an explanation. There is no fee mechanism — businesses may only deny or fulfill.
- **Practical threshold:** Mere volume of requests from a single individual is not sufficient to establish "excessive." The controller must demonstrate that the requests are unreasonable in context. Regulators have been skeptical of excessive/unfounded claims.

### Identity Verification for Rights Requests

- **GDPR:** The controller may request additional information to confirm the data subject's identity when there are reasonable doubts. The controller must not collect more information than necessary for verification. If the controller cannot identify the data subject, it may refuse to act (but must inform the data subject and explain the reasons).
- **CCPA/CPRA:** Verification requirements are tiered: requests to know categories of PI require matching **at least 2 data points**; requests to know specific pieces or to delete require matching **at least 3 data points** to a "reasonably high degree of certainty." Password-protected accounts may use existing authentication.
- **US State Laws:** Most follow the CCPA model of reasonable verification. No state law requires a specific verification method, but the method must be proportionate to the sensitivity of the data and the nature of the request.

## Interaction with Other Areas

- **Employment:** Employee rights requests under GDPR and CCPA (post-exemption expiration) require HR-specific procedures. Employee data often spans multiple systems (HRIS, email, performance management), creating complex fulfillment challenges. Some jurisdictions exempt employee data or apply delayed timelines.
- **IP and Technology:** Data portability rights affect technology product design — systems must be capable of exporting personal data in structured, machine-readable formats. Deletion rights require the ability to identify and remove all instances of personal data across systems, backups, and archives.
- **Litigation:** Litigation holds may conflict with deletion requests. Under GDPR, the "legal claims" exception permits retention of data needed for ongoing or reasonably anticipated litigation. Under CCPA, a similar exception applies. Document retention policies must account for the intersection of deletion rights and litigation preservation obligations.
- **Consumer Protection:** The non-discrimination requirement under CCPA means that businesses cannot use differential pricing or service quality to penalize consumers who exercise their rights. Financial incentive programs must be genuinely optional and based on a good-faith estimate of the value of the consumer's data.

## Sources

- [GDPR Articles 15-22 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Data subject rights provisions
- [EDPB Guidelines on Data Subject Rights](https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en) — Including guidelines on right of access, right to erasure, and data portability
- [CCPA/CPRA Consumer Rights — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5) — Cal. Civ. Code 1798.100-1798.125
- [CPPA Regulations on Consumer Rights](https://cppa.ca.gov/regulations/) — Implementing regulations on verification, authorized agents, and request processing
