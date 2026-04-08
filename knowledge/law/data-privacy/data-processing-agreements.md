---
counsel-os-type: law-area
content-version: "2026-04-08"
---
## Data Processing Agreements

# Data Processing Agreements

## Applicability

This sub-file covers the mandatory contractual requirements for agreements governing the processing of personal data on behalf of another party (controller-processor, business-service provider). Load when:

- A data processing agreement (DPA), data protection addendum (DPA), or data processing exhibit is being drafted, reviewed, or negotiated.
- A service provider, contractor, or vendor agreement involves the handling of personal data.
- Sub-processor arrangements or sub-service-provider contracts need to be evaluated.
- Audit rights, data return/deletion obligations, or processor security requirements are at issue.
- Multiple privacy regimes apply and the DPA must satisfy all simultaneously.

## Key Requirements

### GDPR Article 28 — Mandatory DPA Provisions

Under GDPR Article 28(3), the contract between controller and processor must set out in writing (including electronic form):

#### Required Descriptive Elements

- **Subject matter and duration** of the processing.
- **Nature and purpose** of the processing (e.g., "hosting and processing customer data for the purpose of providing the SaaS platform").
- **Type of personal data** processed (e.g., names, email addresses, IP addresses, payment data).
- **Categories of data subjects** (e.g., controller's customers, employees, website visitors).
- **Controller's obligations and rights** with respect to the personal data.

#### Required Processor Obligations (Article 28(3)(a)-(h))

1. **(a) Documented instructions:** Process personal data only on documented instructions from the controller, including with regard to transfers to third countries. The processor must inform the controller if it believes an instruction infringes the GDPR.
2. **(b) Confidentiality:** Ensure that persons authorized to process have committed to confidentiality or are under an appropriate statutory obligation.
3. **(c) Security measures:** Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk (per Article 32). Specific measures should be described or referenced (encryption, access controls, incident response, business continuity).
4. **(d) Sub-processor conditions:** Not engage another processor (sub-processor) without prior **specific** or **general** written authorization of the controller. For general authorization, the processor must inform the controller of any intended additions or replacements, giving the controller the opportunity to **object**. Sub-processor contracts must impose the same data protection obligations as the main DPA.
5. **(e) Assistance with data subject rights:** Assist the controller, by appropriate technical and organizational measures, in fulfilling the obligation to respond to data subject rights requests (access, rectification, erasure, restriction, portability, objection).
6. **(f) Assistance with compliance obligations:** Assist the controller in ensuring compliance with Articles 32-36 (security, breach notification, DPIA, prior consultation), taking into account the nature of processing and information available to the processor.
7. **(g) Data return or deletion:** At the choice of the controller, delete or return all personal data after the end of services, and delete existing copies unless EU or member state law requires storage. The controller should specify its preference in the DPA.
8. **(h) Audit rights:** Make available to the controller all information necessary to demonstrate compliance, and allow for and contribute to audits, including inspections, by the controller or an auditor mandated by the controller. The processor must immediately inform the controller if an instruction would infringe the GDPR.

- **Consequence:** Processing without a compliant DPA is itself a violation under Article 83(4) — fines up to **EUR 10 million or 2% of global annual turnover**. Both the controller and processor can be held liable.

### GDPR Sub-Processor Requirements (Article 28(2), (4))

- **Prior authorization:** General written authorization requires the processor to notify the controller of any changes (additions or replacements) and allow the controller a reasonable opportunity to object.
- **Equivalent obligations:** The sub-processor contract must impose **the same data protection obligations** as the controller-processor contract, particularly regarding security measures and processor obligations.
- **Processor liability:** The initial processor remains **fully liable** to the controller for the performance of the sub-processor's obligations. If the sub-processor fails, the processor is responsible.
- **Practical requirement:** The DPA should specify: (a) whether authorization is specific or general, (b) the notification period for new sub-processors (commonly 15-30 days), (c) the objection mechanism and consequences (e.g., right to terminate if objection is not resolved), and (d) a current list of sub-processors (often maintained on a publicly accessible URL).

### CCPA Service Provider and Contractor Requirements

#### Service Provider Agreement (Section 1798.140(ag))

A service provider must have a written contract that:
- **Identifies** the specific business purpose for which the personal information is disclosed.
- **Prohibits** the service provider from: (a) selling or sharing the personal information; (b) retaining, using, or disclosing the personal information for any purpose other than performing the contracted services, including for the service provider's own commercial purposes; (c) retaining, using, or disclosing the information outside the direct business relationship with the business.
- **Requires** the service provider to comply with the CCPA and to notify the business if it determines it can no longer meet its CCPA obligations.
- **Grants** the business the right to take reasonable and appropriate steps to ensure the service provider uses the personal information in a manner consistent with the business's CCPA obligations (monitoring/audit right).

#### Contractor Agreement (Section 1798.140(j), CPRA Addition)

A contractor must have a written contract that includes all service provider requirements, **plus**:
- The contractor must **certify** that it understands the CCPA/CPRA restrictions and will comply with them.
- **Consequence:** Without proper restrictive language and certification, the recipient is classified as a "third party," and every disclosure may constitute a "sale" or "sharing" requiring consumer opt-out rights.

#### Sub-Service-Provider Flow-Down

- CCPA requires the service provider to enter into a binding contract with each sub-service-provider (subcontractor) that imposes the **same level of privacy protection** as the service provider agreement.
- The service provider must notify the business of new sub-service-providers (CPRA regulations).
- The business must be able to exercise rights with respect to sub-service-providers.

### US State Privacy Law DPA Requirements

Most comprehensive US state privacy laws require written contracts between controllers and processors that include:

| Requirement | VA (VCDPA) | CO (CPA) | CT (CTDPA) | TX (TDPSA) |
|-------------|-----------|----------|-----------|-----------|
| Processing instructions | Yes | Yes | Yes | Yes |
| Nature and purpose of processing | Yes | Yes | Yes | Yes |
| Data type and subject categories | Yes | Yes | Yes | Yes |
| Duration of processing | Yes | Yes | Yes | Yes |
| Confidentiality obligations | Yes | Yes | Yes | Yes |
| Sub-processor requirements | Yes | Yes | Yes | Yes |
| Data return/deletion | Yes | Yes | Yes | Yes |
| Audit/assessment cooperation | Yes | Yes | Yes | Yes |
| DPA cooperation | Yes | Yes | Yes | Yes |
| Demonstrate compliance on request | Yes | Yes | Yes | Yes |

- **Key variation:** Colorado and Virginia explicitly require the processor to assist with **data protection assessments**. Texas requires the processor to provide the controller with the information necessary to conduct and document a data protection assessment.
- **Sub-processor authorization:** Most state laws require the processor to give the controller an opportunity to object to sub-processor changes, mirroring the GDPR approach.

### Multi-Regime DPA Drafting Requirements

When a single DPA must satisfy multiple privacy frameworks simultaneously:

- **Highest common denominator:** Draft to the most restrictive standard across all applicable jurisdictions. GDPR Article 28 is typically the most prescriptive for DPA content.
- **Addendum approach:** Use a GDPR-compliant core DPA with jurisdiction-specific addenda for CCPA (service provider certification, sale/sharing prohibitions), UK GDPR (UK-specific governing law and supervisory authority), and state laws (DPA cooperation provisions).
- **SCCs integration:** When cross-border transfers are involved, SCCs should be incorporated as an annex to or separate from the DPA. The SCC modules must be correctly selected and cannot be modified in substance.
- **Jurisdictional triggers:** The DPA should include a provision stating which jurisdiction's requirements apply based on the data subjects' location or the applicable law of the personal data being processed.

### Common DPA Deficiencies

Contracts frequently fail on these points:

- **Vague processing descriptions:** "Vendor will process data as necessary to provide services" does not satisfy Article 28(3) or state law requirements. The subject matter, duration, nature, purpose, data types, and data subject categories must be specified.
- **Missing or permissive sub-processor terms:** Contracts that allow unlimited sub-processing without controller notification or objection rights are non-compliant under GDPR and most state laws.
- **Audit rights eliminated or unreasonably restricted:** "Annual third-party audit report" may not satisfy GDPR Article 28(3)(h) standing alone. The controller must have the right to conduct or mandate its own audits. Practical limitations (advance notice, NDA, cost allocation) are acceptable.
- **No data return/deletion provision:** Contracts that are silent on what happens to personal data at termination leave the controller unable to demonstrate compliance with storage limitation principles.
- **CCPA service provider language missing:** Contracts with CCPA-applicable service providers that lack explicit prohibitions on retaining, using, or disclosing personal information beyond contracted services — and that lack the contractor certification where applicable — fail to establish the service provider safe harbor.
- **Cross-border transfer mechanism gap:** DPAs that contemplate international data flows but do not incorporate SCCs or identify the applicable transfer mechanism leave the transfer without a valid legal basis.

### Processor Security Obligations (GDPR Article 32)

The DPA must address security measures, which under Article 32 must be appropriate to the risk, taking into account:

- **Pseudonymization and encryption** of personal data.
- **Ability to ensure** ongoing confidentiality, integrity, availability, and resilience of processing systems.
- **Ability to restore** availability and access in a timely manner following an incident.
- **Process for regularly testing** and evaluating the effectiveness of technical and organizational measures.
- The DPA should specify or reference particular security standards (ISO 27001, SOC 2, NIST CSF) and require ongoing compliance.

## Interaction with Other Areas

- **Data Privacy (GDPR):** DPA requirements are a core component of GDPR compliance. See `gdpr.md` for the broader controller-processor framework and `cross-border-transfers.md` for SCC integration requirements.
- **Data Privacy (CCPA/CPRA):** CCPA service provider agreements serve a different purpose than GDPR DPAs — they establish the "service provider" safe harbor to avoid having disclosures classified as "sales." See `ccpa-cpra.md` for detailed sale/sharing/business purpose distinctions.
- **IP and Technology:** SaaS and cloud service agreements almost always require a DPA. Technology vendor agreements must address specific concerns including data use for model training, product improvement, and cross-customer analytics — all of which may violate CCPA service provider restrictions and GDPR purpose limitation.
- **Financial Services:** Financial institutions subject to GLBA, PCI DSS, or banking regulations must ensure that DPAs also address sector-specific security and data handling requirements. The DPA should reference applicable financial regulatory frameworks.
- **Employment:** DPAs with HR technology vendors (HRIS, payroll, benefits platforms) must address employee personal data, which is subject to both general privacy laws and employment-specific data protection requirements in many jurisdictions.

## Sources

- [GDPR Article 28 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Controller-processor contract requirements
- [EDPB Guidelines 07/2020 on Controller and Processor](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en) — Guidance on controller-processor distinctions and DPA requirements
- [CCPA Service Provider Requirements — California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.140.&lawCode=CIV) — Cal. Civ. Code 1798.140(ag), (j)
- [CPPA Regulations on Service Providers and Contractors](https://cppa.ca.gov/regulations/) — Implementing regulations on service provider and contractor obligations
- [VCDPA Processor Requirements — Virginia Law](https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/) — Va. Code 59.1-578
