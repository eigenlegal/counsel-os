---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, international]
authorities:
  - cite: "Fed. R. Civ. P. 45"
    title: "Subpoena issuance, service, objection, and cost-shifting"
    url: "https://www.law.cornell.edu/rules/frcp/rule_45"
  - cite: "Fed. R. Crim. P. 6(e)"
    title: "Grand jury secrecy"
    url: "https://www.law.cornell.edu/rules/frcrmp/rule_6"
  - cite: "18 U.S.C. §§ 2701-2712"
    title: "Stored Communications Act restrictions on provider disclosure"
    url: "https://www.law.cornell.edu/uscode/text/18/part-I/chapter-121"
  - cite: "Braswell v. United States, 487 U.S. 99 (1988)"
    title: "Entity custodians cannot resist document production on Fifth Amendment grounds"
    url: "https://www.law.cornell.edu/supremecourt/text/487/99"
---
# Subpoenas

## Applicability

Load when any matter involves subpoenas (document or testimony), third-party discovery requests, civil investigative demands (CIDs), grand jury subpoenas, administrative subpoenas, or compelled disclosure in any proceeding. Also load when drafting subpoena compliance provisions in contracts or evaluating compelled-disclosure carve-outs in NDAs.

## Key Requirements

### Types of Subpoenas

- **Subpoena ad testificandum**: Compels testimony at deposition, hearing, or trial
- **Subpoena duces tecum**: Compels production of documents, ESI, or tangible things
- **Combined subpoena**: Testimony and document production together
- **Administrative subpoena**: Issued by federal agencies (SEC, FTC, IRS, OSHA) under statutory authority without court involvement
- **Civil Investigative Demand (CID)**: Agency-specific compulsory process (FTC Act 20, DOJ Antitrust CIDs, CFPB CIDs) — functionally equivalent to subpoenas but with distinct procedural rules
- **Grand jury subpoena**: Criminal process; secrecy obligations under Fed. R. Crim. P. 6(e); recipient generally may disclose receipt unless under sealing order

### FRCP Rule 45 Framework (Federal)

- **Issuance** / **Requirement**: Any party may issue; must be from the court where the action is pending or where compliance is required / **Consequence**: Subpoena from wrong court is defective
- **Service** / **Requirement**: May be served anywhere in the United States (FRCP 45(b)(2)); personal service required for testimony / **Consequence**: Defective service is grounds for non-compliance
- **100-mile rule** / **Threshold**: Testimony subpoena cannot compel attendance more than 100 miles from where the person resides, is employed, or regularly transacts business (FRCP 45(c)(1)) / **Consequence**: Subpoena subject to quashal; does not apply to party witnesses (party must attend trial anywhere in district)
- **14-day objection window** / **Timeline**: Written objections must be served before the earlier of compliance date or 14 days after service (FRCP 45(d)(2)(B)) / **Consequence**: Failure to timely object may waive objections (though courts have discretion)
- **Motion to quash or modify** / **Timeline**: Must be filed "timely" (before compliance date); filed in the court where compliance is required / **Consequence**: Failure to move to quash while also failing to comply risks contempt

### Objection Grounds

- Undue burden or expense (FRCP 45(d)(3)(A)(iv))
- Privilege: attorney-client, work product, trade secrets
- Overbreadth or lack of relevance
- Improper service or jurisdictional defect
- Compliance requires disclosure of unretained expert opinion (FRCP 45(d)(3)(B)(ii))
- Conflict with existing protective order

### Privilege Logs

- **Requirement**: Documents withheld on privilege grounds must be identified in a privilege log sufficient to enable the requesting party to assess the claim (FRCP 45(e)(2))
- **Elements**: Date, author, all recipients, subject matter description (without revealing privileged content), privilege asserted
- **Timeline**: Must be produced within a reasonable time; courts increasingly require categorical logs for voluminous withholdings
- **Consequence**: Failure to produce a timely, adequate privilege log may result in waiver of privilege (*Burlington Northern v. U.S. District Court*)

### Cost-Shifting

- **FRCP 45(d)(1)** / **Threshold**: Party issuing subpoena to non-party must take reasonable steps to avoid undue burden or expense / **Consequence**: Court must enforce this duty and may impose sanctions
- **Non-party cost recovery** / **Threshold**: Non-parties are entitled to recover "significant expense" of compliance (FRCP 45(d)(2)(B)(ii)) / **Consequence**: Issuing party may be required to bear reasonable costs of collection, review, and production
- **Commercial data** / **Threshold**: When subpoena seeks confidential commercial information, court may require the requesting party to compensate the producing party / **Consequence**: Courts have broad discretion on cost allocation

### Third-Party Compliance Obligations

- Non-parties must comply with properly served subpoenas but are entitled to heightened protection from burden
- Non-parties should notify affected customers/clients when subpoenaed for their records (unless prohibited by court order, gag order, or statute)
- Non-parties may not be held in contempt without opportunity to be heard
- Service providers receiving subpoenas for customer data should review terms of service, applicable privacy laws, and Stored Communications Act (18 U.S.C. 2701) restrictions

### Criminal and Grand Jury Subpoenas

- Grand jury subpoenas carry secrecy obligations (Fed. R. Crim. P. 6(e)) — witnesses generally not bound unless under specific order
- Fifth Amendment privilege against self-incrimination applies to testimony (not document production by entities — *Braswell v. United States*)
- Negotiation of scope is possible but requires experienced criminal counsel
- Non-compliance may result in contempt and incarceration

## Interaction with Other Areas

- **Litigation (Litigation Holds)**: Receipt of a subpoena triggers immediate preservation obligations for all potentially responsive materials
- **Litigation (Privilege)**: Privilege review and logging are mandatory before any production; FRE 502(d) orders should be sought proactively
- **Litigation (E-Discovery)**: Large-scale document subpoenas require e-discovery protocols (search terms, date ranges, custodians, format)
- **Data Privacy**: Subpoenas for personal data may conflict with GDPR, CCPA, or sector-specific privacy laws; cross-border discovery requires Hague Convention or MLAT analysis
- **IP and Technology (Trade Secrets)**: Trade secrets produced under subpoena must be protected by stipulated protective order to maintain trade secret status under DTSA/UTSA
- **Employment**: Employee records subpoenaed require review for state employee privacy protections
- **Insurance**: Subpoenas received in insured matters should be tendered to carriers with notice of potential defense obligations

## Sources

- Federal Rules of Civil Procedure, Rule 45: https://www.law.cornell.edu/rules/frcp/rule_45
- Federal Rules of Criminal Procedure, Rule 6(e): https://www.law.cornell.edu/rules/frcrmp/rule_6
- Stored Communications Act, 18 U.S.C. 2701-2712: https://www.law.cornell.edu/uscode/text/18/part-I/chapter-121
- *Braswell v. United States*, 487 U.S. 99 (1988): entity act-of-production doctrine
- U.S. Courts, Subpoena guidance: https://www.uscourts.gov/forms/subpoena
