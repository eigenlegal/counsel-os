# SaaS and Technology Agreements

## Applicability

Load when the matter involves SaaS subscriptions, cloud computing agreements (IaaS, PaaS),
software licensing, technology procurement, custom software development, API/SDK agreements,
technology partnership agreements, SLA negotiation, source code escrow, or technology vendor management.

## Key Requirements

### SaaS vs. License Distinction

- **SaaS (access model)**:
  - Customer accesses hosted software remotely; no copy is delivered
  - Provider maintains and operates infrastructure
  - Typically subscription-based (monthly/annual fees)
  - Customer has no right to underlying code

- **On-premise license (delivery model)**:
  - Customer receives a copy installed on its own infrastructure
  - May be perpetual or term-based
  - Customer responsible for maintenance/updates (often purchased separately)

- **Legal significance**:
  - SaaS generally treated as **services** (not goods) — UCC Article 2 typically does not apply
  - Affects warranty, acceptance, and remedy frameworks
  - Bankruptcy: SaaS access rights may not be protected under 11 U.S.C. 365(n), which protects
    licensees of intellectual property — evolving area of law
  - Tax treatment differs (services tax vs. software license tax varies by jurisdiction)

### Service Level Agreements (SLAs)

- **Uptime targets and actual downtime**:
  - **99.9%** = up to **43.8 minutes** of downtime per month (8.77 hours/year)
  - **99.95%** = up to **21.9 minutes** of downtime per month (4.38 hours/year)
  - **99.99%** = up to **4.3 minutes** of downtime per month (52.6 minutes/year)
  - **99.999%** = up to **26 seconds** of downtime per month (5.26 minutes/year)

- **Measurement methodology — critical negotiation points**:
  - Measurement window: calendar month vs. billing period
  - Measurement point: provider infrastructure vs. customer endpoint
  - Whether uptime is measured per-region or globally
  - Partial degradation (slow response) vs. total outage — should be addressed separately

- **How vendors game SLA measurement**:
  - Excluding "scheduled maintenance" from calculations (negotiate caps: e.g., **max 4 hours/month**)
  - Measuring at infrastructure level rather than application level
  - Using annual rather than monthly periods (smooths out bad months)
  - Narrowly defining "outage" to exclude degraded performance
  - Counting only outages the customer formally reports within a short window
  - Aggregating across all customers rather than measuring per-customer experience

- **Service credits**:
  - Standard remedy: **5-30% of monthly fees** per SLA failure
  - Often capped at **100% of monthly fees** in a given month
  - Usually the **sole and exclusive remedy** for SLA failures
  - Negotiate termination rights for chronic failures (e.g., missing SLA for **3+ consecutive
    months** or **4+ months in any 12-month period**)

- **Escalation beyond credits**: For material failures, negotiate root-cause analysis within
  **5 business days**, corrective action plans, executive escalation, and fee reduction or
  termination for persistent failure.

### Security Certifications and Standards

- **SOC 2 Type I vs. Type II**:
  - Type I: evaluates the **design** of controls at a **point in time** (snapshot)
  - Type II: evaluates the **operating effectiveness** over at least **6 months** (typically 12)
  - **Type II is the meaningful standard** — Type I does not demonstrate consistent operation
  - Five Trust Services Criteria: security, availability, processing integrity, confidentiality, privacy
  - Insist on Type II covering all applicable criteria

- **ISO 27001**:
  - International standard for information security management systems (ISMS)
  - Certification requires independent audit by an accredited body
  - Renewed every **3 years** with annual surveillance audits
  - Comprehensive framework with flexibility in control selection

- **FedRAMP**:
  - Required for cloud services used by U.S. federal agencies
  - Three authorization levels: Low, Moderate, High (based on FIPS 199 impact levels)
  - Authorization process: **12-18+ months**, costs **$1-3M+**
  - FedRAMP Authorized status is a significant market differentiator

- **HITRUST CSF**:
  - Common for healthcare organizations
  - Incorporates HIPAA, NIST, ISO, and other standards
  - Validated assessment (r2): **6-12 months**, multi-year certification

- **Penetration testing requirements**:
  - Require annual third-party penetration testing
  - Results (or summary) shared with the customer
  - Customer right to conduct own testing (or receive provider's results)
  - Remediation timelines: **critical: 24-48 hours**, **high: 30 days**, **medium: 90 days**

### Data Rights at Termination

- **Data retrieval period**:
  - Negotiate minimum **30-90 days** post-termination for data export
  - Standard, machine-readable formats (CSV, JSON, XML, or native format via API)
  - Some vendors default to as little as **7 days** — insufficient for enterprise migration
  - Include right to extend retrieval period at reasonable cost if needed

- **Data deletion**:
  - After retrieval period, provider certifies **deletion of all customer data** (including backups)
  - Deletion timeline: **30-60 days** post-retrieval period
  - Written certification from an authorized officer
  - Address retention required by law (provider should identify specific legal requirements)

- **Data format and portability**:
  - Specify export formats upfront in the agreement
  - Proprietary formats create lock-in — require open/standard formats
  - API access for bulk data export
  - Include metadata, configurations, customizations, and workflow definitions

- **Transition assistance**:
  - For critical systems: **90-180 days** of transition services at reasonable rates
  - Knowledge transfer, documentation, and migration support
  - Defined scope and staffing commitments

### Vendor Lock-In Mitigation

- **Technical lock-in**: Proprietary data formats, custom integrations, non-standard APIs, and
  platform-specific configurations create high switching costs. Mitigate with open/standard
  formats, documented APIs, data portability testing, and architecture reviews.

- **Contractual lock-in**: Long-term commitments, high early termination fees, auto-renewal with
  long notice periods, and restrictive terms. Negotiate reasonable termination for convenience,
  manageable fees, adequate renewal notice periods, and right to reduce scope.

- **Operational lock-in**: Institutional knowledge and training investment. Mitigate by requiring
  comprehensive documentation and ensuring staff develop expertise to manage transitions.

### Acceptance Testing

- **Custom development**: Define acceptance criteria **before development begins** — functional
  specifications, performance benchmarks, compatibility requirements, and security standards.

- **Testing period**: Typically **15-30 business days** from delivery. Allow for multiple rounds
  of testing and remediation.

- **Rejection and cure**: Developer must cure deficiencies within **15-30 days**. After **2-3
  failed cure attempts**, customer has right to terminate and receive refund for rejected deliverable.

- **Deemed acceptance**: Provisions deeming deliverable accepted if no written rejection within
  testing period. Ensure period is adequate and deemed acceptance does not apply when customer
  provides timely notice of deficiencies.

### IP Ownership in Custom Development

- **Customer-owned (preferred for bespoke work)**: All custom deliverables assigned to customer.
  Provider retains pre-existing IP, tools, and frameworks (licensed to customer for use with
  deliverables). Clear delineation of pre-existing vs. new IP.

- **Provider-owned with license**: Provider owns all deliverables, grants customer a license.
  Common for productized solutions reused across customers.

- **Joint ownership (generally disfavored)**: Either party can exploit without accounting (patent
  default) or neither can license without consent (varies by IP type). If used, governance terms
  must be explicit and comprehensive.

### Warranties

- **Functionality**: Software performs materially as described in documentation for **60-90 days**
  from acceptance/go-live. Remedies: repair, replace, or refund.
- **Non-infringement**: Provider warrants no third-party IP infringement. Backed by indemnification.
- **Compliance-with-law**: Provider warrants operation in compliance with applicable laws.
- **Standard disclaimers**: Fitness for particular purpose disclaimed. Implied warranties under
  UCC Article 2 disclaimed (to extent applicable).

## Interaction with Other Areas

- **Data Privacy**: SaaS involving personal data requires DPAs. Security measures must satisfy
  GDPR Article 32, CCPA service provider requirements, and state privacy laws. Data localization
  requirements may restrict hosting location.
- **Consumer Protection**: Consumer SaaS must comply with auto-renewal laws (California ARL requires
  clear disclosure and easy cancellation), warranty requirements, and consumer protection statutes.
- **Open Source**: AGPL components may trigger source code disclosure even without distribution.
  Agreements should address OSS disclosure to customers.
- **Trade Secrets**: Must protect provider's proprietary technology while keeping customer data
  confidential. Source code escrow must address trade secret implications.
- **Employment**: Technology assignment agreements must ensure employee code is properly assigned.
  Contractor agreements must address work-for-hire and assignment.
- **Financial Services**: Regulated SaaS must address regulatory examination rights (OCC, FDIC),
  business continuity/DR, data residency, and subcontractor oversight.

## Sources

- [NIST Cloud Computing Reference Architecture (SP 500-292)](https://www.nist.gov/publications/nist-cloud-computing-reference-architecture)
- [SOC 2 Trust Services Criteria - AICPA](https://www.aicpa.org/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)
- [FedRAMP](https://www.fedramp.gov/)
- [ISO/IEC 27001 - ISO](https://www.iso.org/standard/27001)
