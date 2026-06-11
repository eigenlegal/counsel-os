---
counsel-os-type: law-area
content-version: "2026-06-11"
last-reviewed: "2026-06-11"
jurisdiction: [us-federal, us-state, international]
authorities:
  - cite: "OSI Approved Licenses"
    title: "Open Source Initiative license list"
    url: "https://opensource.org/licenses/"
  - cite: "GNU license list"
    title: "FSF license compatibility guidance (GPL/LGPL/AGPL)"
    url: "https://www.gnu.org/licenses/license-list.html"
  - cite: "Exec. Order No. 14306 (June 2025)"
    title: "Sustaining Select Efforts to Strengthen the Nation's Cybersecurity — removed EO 14144 secure-software attestation/SBOM mandates"
    url: "https://www.federalregister.gov/executive-order/14306"
  - cite: "Software Freedom Conservancy v. Vizio, Inc. (Cal. Super. Ct., Orange Cty.)"
    title: "GPL third-party-beneficiary contract claims proceeding to trial (Aug. 2026) — SFC case page"
    url: "https://sfconservancy.org/copyleft-compliance/vizio.html"
---
# Open Source Software Licensing

## Applicability

Load when the matter involves open source components in products or services, open source license
compliance, copyleft obligations analysis, contributions to open source projects, open source due
diligence in M&A, dual licensing models, CLAs, or software composition analysis.

## Key Requirements

### Permissive Licenses

- **MIT License**:
  - Extremely short and simple
  - Permits use, modification, and redistribution (including in proprietary products)
  - Only two obligations: (1) preserve the copyright notice and (2) include the license text
  - No patent grant, no copyleft
  - Most popular OSS license by adoption

- **BSD Licenses (2-clause and 3-clause)**:
  - Similar to MIT in scope and obligations
  - 2-clause: copyright notice and license text required
  - 3-clause: adds prohibition on using project/contributor names for endorsement without permission
  - Original 4-clause BSD included an advertising clause (now deprecated; incompatible with GPL)

- **Apache License 2.0**:
  - Permissive but more comprehensive than MIT/BSD
  - **Express patent grant** from contributors covering the contribution
  - **Patent retaliation clause**: if a licensee initiates patent litigation alleging the software
    infringes, all patent licenses granted under Apache 2.0 for that software **terminate automatically**
  - Requires preservation of NOTICE file containing attribution information
  - Compatible with GPL v3 (but not GPL v2)

### Copyleft Licenses — Weak

- **LGPL (Lesser GPL) v2.1/v3**:
  - Modifications to LGPL-licensed code must be released under LGPL
  - **Allows linking with proprietary code** without triggering copyleft on proprietary portions
  - Dynamic linking is the standard approach
  - Static linking requires providing means for relinking (object files or equivalent)
  - Common choice for libraries intended for broad adoption

- **MPL 2.0 (Mozilla Public License)**:
  - **File-level copyleft**: modifications to MPL-licensed files must be released under MPL
  - New files in the same project may be proprietary
  - Includes secondary license provisions for GPL/LGPL/AGPL compatibility
  - Relatively business-friendly; popular for enterprise-oriented projects

- **EPL 2.0 (Eclipse Public License)**:
  - Module-level copyleft similar to MPL
  - Includes **patent grant** and patent retaliation clause
  - Permits secondary licensing under GPL 2.0

### Copyleft Licenses — Strong

- **GPL v2**:
  - Any **derivative work** distributed must be licensed under GPL v2 with source code available
  - The definition of "derivative work" is the central compliance question
  - Static linking **generally triggers copyleft**
  - Dynamic linking is **debated** (FSF says yes; others disagree)
  - GPL v2 may specify "v2 only" or "v2 or any later version" (the "or later" option)

- **GPL v3**:
  - Adds beyond GPL v2: anti-tivoization provisions (must allow installation of modified software
    on consumer devices)
  - Explicit patent grant from contributors
  - Patent retaliation clause
  - Improved compatibility with Apache 2.0
  - Clarifies scope of "conveying" (distributing)

- **AGPL v3 (Affero GPL)**:
  - Extends GPL v3 copyleft to **network use** (closes the "SaaS loophole")
  - If modified AGPL software provides a service over a network — even without distributing
    copies — source code must be made available to users of that service
  - **Critical for SaaS companies**: any use of AGPL components in a SaaS product may trigger
    source code disclosure obligations
  - Many organizations maintain blanket policies prohibiting AGPL in their codebases

### Copyleft Trigger: "Derivative Work"

- **Central question**: Whether combining proprietary code with copyleft-licensed code creates
  a "derivative work" triggering copyleft on the proprietary portion.
- **Generally triggers copyleft**: Static linking, copying substantial code, forking and modifying.
- **Generally does not trigger**: Separate programs communicating via pipes, sockets, command-line
  arguments, or standard APIs (the "mere aggregation" exception).
- **Dynamic linking**: Debated for GPL; generally accepted as non-triggering for LGPL (its
  designed purpose). No definitive case law.
- **Practical approach**: Risk assessment is context-specific. Conservative organizations treat
  any GPL integration as potentially triggering copyleft.

### GPL Compatibility Matrix

- **Compatible with GPL v3**: Apache 2.0, MIT, BSD (2/3-clause), LGPL v2.1+, MPL 2.0
  (via secondary license provisions), ISC, Artistic 2.0, Zlib.
- **Incompatible with GPL v2**: Apache 2.0 (patent retaliation clause conflict), original BSD
  4-clause (advertising clause), certain Creative Commons licenses (NC, ND variants).
- **AGPL v3 + GPL v3**: AGPL v3 code can be combined with GPL v3 code; the combined work
  is governed by AGPL v3 (the more restrictive license).
- **Practical rule**: When combining components under different licenses, the resulting work must
  comply with **all applicable license terms simultaneously**. If terms conflict irreconcilably,
  the combination is not permissible.

### Patent Grants and Retaliation

- **Apache 2.0 patent grant**: Each contributor grants a perpetual, worldwide, non-exclusive,
  royalty-free patent license for their contribution. **Terminates** if the licensee initiates
  patent litigation alleging the software infringes.
- **GPL v3 patent grant**: Contributors cannot impose further patent restrictions on recipients.
  Includes non-aggression commitment for patents covering the contribution.
- **Impact on patent portfolios**: Companies with large patent portfolios must evaluate retaliation
  risk before adopting OSS with retaliation clauses. Initiating patent litigation related to the
  software terminates the licensee's rights under these licenses.

### Contributor License Agreements (CLAs)

- **Purpose**: Grant the project maintainer (or entity) broad rights to contributions, including
  sublicensing and relicensing rights. Enable dual licensing and license changes.
- **Types**: Individual CLAs (for individual contributors) and Corporate CLAs (for organizations
  whose employees contribute). Apache-style CLAs are widely used.
- **Developer Certificate of Origin (DCO)**: Lightweight alternative. Contributors certify (via
  sign-off on commits) they have the right to submit under the project's license. Used by the
  Linux kernel and many projects.
- **Risk**: Overly broad CLAs may discourage community contributions. Some view CLAs as enabling
  "bait and switch" relicensing (open source to proprietary).

### Compliance Program

- **Software Composition Analysis (SCA)**: Automated tools (Snyk, Black Duck, FOSSA, Mend,
  Dependabot) scan codebases to identify OSS components, licenses, and vulnerabilities.
  Should be integrated into CI/CD pipelines for continuous monitoring.

- **SBOM (Software Bill of Materials)**:
  - Inventory of all software components in a product
  - Executive Order 14028 (2021) drove federal SBOM adoption, but the 2025-26 policy reset
    (EO 14306, June 2025, and OMB M-26-05, January 2026, rescinding M-22-18/M-23-16) replaced
    government-wide secure-software attestation/SBOM mandates with agency-by-agency, risk-based
    requirements — federal SBOM obligations now arise mainly from individual agency contracts
  - Standard formats: SPDX, CycloneDX
  - Increasingly required by enterprise customers and regulators

- **Compliance workflow**:
  1. Inventory all OSS components and dependencies (including transitive)
  2. Identify the license for each component
  3. Assess compatibility with intended use and distribution model
  4. Fulfill obligations (notices, source code availability, NOTICE files)
  5. Review and approve before introducing new OSS components
  6. Monitor for license changes in dependencies and upstream projects

## Interaction with Other Areas

- **Patents**: OSS licenses with patent grants (Apache 2.0) or retaliation clauses (GPL v3) can
  restrict patent enforcement against users. Patent strategy must account for OSS usage.
- **Trade Secrets**: Strong copyleft can force source code disclosure, potentially undermining
  trade secret protection for proprietary code combined with copyleft-licensed OSS.
- **SaaS/Technology**: AGPL closes the SaaS loophole. SaaS agreements should address OSS
  disclosure. Providers must evaluate copyleft triggers for their deployment model.
- **Copyrights**: OSS licenses are copyright licenses. Violation terminates the grant, making
  continued use copyright infringement. Enforcement actions are typically copyright infringement
  claims, but GPL terms may also be enforced in **contract**: in *SFC v. Vizio* (Cal. Super. Ct.,
  Orange Cty.), the court allowed an end-user recipient to pursue GPL source-availability claims
  as a third-party beneficiary, surviving preemption arguments; trial set for August 2026.
- **Corporate (M&A)**: OSS due diligence is critical in technology acquisitions. Undisclosed
  copyleft code can affect deal value, post-closing operations, and distribution strategies.
- **Employment**: Employee contributions to external OSS projects should be governed by clear
  policies addressing IP assignment, employer approval, and license compatibility.

## Sources

- [Open Source Initiative (OSI) — Approved Licenses](https://opensource.org/licenses/)
- [GNU Project License List and Compatibility](https://www.gnu.org/licenses/license-list.html)
- [SPDX License List](https://spdx.org/licenses/)
- [Linux Foundation OpenChain (ISO 5230)](https://www.openchainproject.org/)
