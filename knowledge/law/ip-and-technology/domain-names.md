---
counsel-os-type: law-area
content-version: "2026-04-08"
---
## Domain Names

# Domain Names

## Applicability

Load when the matter involves domain name registration, domain name disputes, cybersquatting,
typosquatting, UDRP proceedings, ACPA litigation, domain name portfolio management, domain
transfers, or ccTLD-specific policies.

## Key Requirements

### UDRP (Uniform Domain-Name Dispute-Resolution Policy)

- **Administered by**: WIPO Arbitration and Mediation Center, National Arbitration Forum (Forum),
  Asian Domain Name Dispute Resolution Centre, Czech Arbitration Court, among others.

- **Three required elements** (all must be proven by complainant):
  1. The domain name is **identical or confusingly similar** to a trademark or service mark in
     which the complainant has rights
  2. The registrant has **no rights or legitimate interests** in the domain name (burden shifts
     to registrant after complainant's prima facie case)
  3. The domain name was **registered and is being used in bad faith**

- **Bad faith indicators**:
  - Registered to sell to the trademark owner for more than out-of-pocket costs
  - Pattern of registering others' marks to prevent their use
  - Registered primarily to disrupt a competitor's business
  - Registered to attract users by creating likelihood of confusion for commercial gain
  - Passive holding of a domain may constitute bad faith use in certain circumstances (*Telstra v. Nuclear Marshmallows*, WIPO D2000-0003)

- **Legitimate interest indicators**:
  - Bona fide offering of goods/services before notice of the dispute
  - Commonly known by the domain name (even without trademark rights)
  - Legitimate noncommercial or fair use (criticism, commentary sites)

- **Timeline**:
  - Complaint filed; registrant has **20 days** to respond (extendable to **24 days** in limited cases)
  - Panel decision typically within **14 days** of panel appointment
  - Total process: approximately **45-60 days**

- **Remedies**: Transfer of the domain to complainant or cancellation. **No monetary damages** under UDRP.

- **Appeal**: Either party may file suit in a court of competent jurisdiction within **10 business days** of the decision.

### ACPA (Anticybersquatting Consumer Protection Act, 15 U.S.C. 1125(d))

- **Federal court action**: Available when a person registers, traffics in, or uses a domain name
  with **bad faith intent to profit** from a trademark.

- **Bad faith factors (9 non-exclusive)**:
  - Registrant's own trademark or other IP rights in the domain name
  - Whether the domain name is the registrant's legal name
  - Registrant's prior use of the domain name in connection with goods/services
  - Registrant's bona fide noncommercial or fair use
  - Intent to divert consumers from the mark owner's site for commercial gain
  - Offer to transfer the domain for financial gain without having used it
  - Providing false contact information when registering
  - Registration of multiple domain names that are confusingly similar to others' marks
  - Extent to which the mark is distinctive or famous

- **Statutory damages**: **$1,000 to $100,000 per domain name**, at the court's discretion,
  as an alternative to actual damages and profits. Makes ACPA significantly more powerful than
  UDRP for deterrence and compensation.

- **In rem jurisdiction (15 U.S.C. 1125(d)(2))**:
  - Available when the registrant cannot be found or is outside U.S. jurisdiction
  - Action brought against the domain name itself in the judicial district of the registrar
  - Remedies limited to transfer or cancellation (no monetary damages)

- **Advantages over UDRP**: Monetary damages, broader scope of relief, binding judgment, discovery
  rights, and ability to address patterns of cybersquatting comprehensively.

### ICANN Policies and Registration

- **60-day transfer lock**: ICANN prohibits transfer to a new registrar within **60 days** of
  initial registration or a prior transfer. Applies to gTLDs (.com, .net, .org, etc.).

- **Registrar transfer process**:
  - Requires authorization code (EPP/auth code) from current registrar
  - Confirmation from the registrant of record
  - **5-day window** for the losing registrar to approve or deny
  - Transfer includes remaining registration period (no loss of paid time)

- **WHOIS/RDAP**:
  - Registration data lookup service
  - Post-GDPR: many registrars redact personal data from public WHOIS for EU/EEA registrants
  - ICANN Registration Data Request Service (RDRS) provides mechanism for non-public data
    requests for legitimate purposes (trademark enforcement, law enforcement, legal proceedings)

- **New gTLDs**: ICANN's new gTLD program has introduced hundreds of new extensions (.app,
  .tech, .law, etc.). Each has its own registry agreement and potentially unique policies.
  Trademark holders should consider defensive registrations in relevant new gTLDs.

### ccTLD Policies

- **Country-code TLDs** (.uk, .de, .cn, .jp, .eu, etc.): Each governed by its own national
  registry with distinct policies on eligibility, dispute resolution, and transfer.

- **Local presence requirements**:
  - Some ccTLDs require physical presence or legal entity in the country
  - Examples: .cn requires a Chinese entity; .eu requires EU/EEA establishment
  - .us requires a U.S. nexus (citizen, resident, or organization with bona fide U.S. presence)
  - Some allow registration through local agents/trustees

- **Alternative dispute resolution**:
  - .uk: DRS administered by Nominet
  - .eu: ADR administered by the Czech Arbitration Court
  - .au: auDRP administered by Resolution Institute
  - Procedures may differ significantly from UDRP in requirements and timelines

- **Regulatory risk**: ccTLD policies can change with government action, potentially affecting
  domain rights. Geopolitical considerations may affect reliability of certain ccTLDs.

### Premium and Aftermarket Domains

- **Premium domains**: Short, dictionary-word, or high-value domains. Registry premium pricing
  may impose ongoing elevated renewal fees (not just one-time purchase premium).

- **Aftermarket transactions**: Purchases through platforms (GoDaddy Auctions, Sedo, Afternic)
  or private sales. Due diligence should verify:
  - Clean title (no liens or encumbrances)
  - UDRP/ACPA history (check WIPO case database)
  - Trademark conflicts with the domain name
  - Prior use and reputation (SEO issues, spam blacklists)
  - Registration history (age, prior owners)

- **Escrow services**: Recommended for high-value transactions. Escrow.com and similar services
  hold funds until domain transfer is verified complete.

### Privacy and Proxy Services

- **Privacy services**: Replace registrant contact data in WHOIS with the service's information.
  Registrant retains domain ownership. Common for individuals and small businesses.

- **Proxy services**: The proxy service is listed as the actual registrant (holding domain on
  behalf of beneficial owner). More complex legal relationship.

- **ICANN requirements**: The 2013 RAA and subsequent specifications require disclosure of the
  beneficial owner's identity in response to legitimate UDRP/legal requests.

- **Litigation impact**: Privacy/proxy does not shield against UDRP or ACPA. Panels and courts
  can order disclosure. Use of proxy to hide identity may be treated as a bad faith indicator.

- **Corporate best practice**: Register domains under legal entity name (not through proxy) to
  clearly establish ownership, particularly for mission-critical and brand-associated domains.

### Domain Security

- **Registry lock**: Prevents unauthorized transfers, modifications, or deletions at the registry
  level. Requires manual verification to unlock. Essential for high-value domains.

- **DNSSEC**: DNS Security Extensions authenticate DNS responses, preventing spoofing and cache
  poisoning. Increasingly expected for enterprise and government domains.

- **Renewal management**: Accidental lapse can result in permanent loss.
  - Auto-renewal is the minimum protection
  - Grace periods: typically **0-45 days** depending on TLD
  - Redemption period: typically **30 days** after deletion (at elevated cost, often **$100-200+**)
  - After redemption: domain enters public availability and may be acquired by others

## Interaction with Other Areas

- **Trademarks**: Trademark rights are the foundation for UDRP and ACPA claims. Domain strategy
  should align with trademark portfolio strategy. Defensive registrations protect against squatting.
- **Data Privacy**: WHOIS redaction under GDPR affects ownership verification and enforcement.
  Privacy/proxy services interact with data protection requirements.
- **Consumer Protection**: Deceptive domain use (phishing, typosquatting) may violate consumer
  protection statutes in addition to trademark law.
- **International Trade**: ccTLD requirements may intersect with sanctions compliance and foreign
  business restrictions.
- **Corporate (M&A)**: Domain portfolios are key assets. Transfer should be explicitly addressed
  in asset purchase agreements alongside trademark assignments.

## Sources

- [ICANN UDRP Policy](https://www.icann.org/resources/pages/help/dndr/udrp-en)
- [WIPO Domain Name Dispute Resolution](https://www.wipo.int/amc/en/domains/)
- [ACPA (15 U.S.C. 1125(d)) - Cornell LII](https://www.law.cornell.edu/uscode/text/15/1125)
- [ICANN Registrar Resources](https://www.icann.org/resources/pages/registrars-0d-2012-02-25-en)
