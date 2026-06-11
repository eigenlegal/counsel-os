---
counsel-os-type: law-area
content-version: "2026-06-11"
jurisdiction: [us-federal, us-state, technical-standard]
authorities:
  - cite: "29 U.S.C. 794d (verified 2026-06-11)"
    title: "Section 508 of the Rehabilitation Act"
    url: "https://www.law.cornell.edu/uscode/text/29/794d"
  - cite: "36 CFR Part 1194 (2017 ICT Refresh; incorporates WCAG 2.0 Level AA)"
    title: "U.S. Access Board ICT Standards and Guidelines"
    url: "https://www.access-board.gov/ict/"
  - cite: "GSA Section508.gov program"
    title: "Government-wide IT Accessibility Program"
    url: "https://www.section508.gov/"
---
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
