# Open Source Software Licensing

## Overview
Open source software (OSS) is distributed under licenses that grant users the right to use, modify, and distribute the software, subject to license-specific conditions. OSS compliance is critical because violations can result in loss of license rights, injunctive relief, and forced disclosure of proprietary source code. Understanding the spectrum from permissive to copyleft licenses is essential for managing legal risk in software development and distribution.

## Key Requirements
- **Permissive licenses (MIT, BSD, Apache 2.0):** Allow use, modification, and redistribution (including in proprietary products) with minimal obligations — typically limited to preserving copyright notices and license text. Apache 2.0 includes an express patent grant and patent retaliation clause.
- **Weak copyleft licenses (LGPL, MPL 2.0, EPL):** Require that modifications to the licensed code be released under the same license, but allow linking/combining with proprietary code without triggering copyleft obligations on the proprietary portions, subject to specific technical requirements (e.g., LGPL dynamic linking requirement).
- **Strong copyleft licenses (GPL v2, GPL v3, AGPL v3):**
  - GPL v2/v3: Require that any derivative work distributed must be licensed under the GPL with source code made available. The scope of "derivative work" is a critical and often debated question — static linking generally triggers copyleft, dynamic linking is debated.
  - AGPL v3: Extends GPL copyleft to network use — if modified AGPL software is used to provide a service over a network (without distribution), the source code must still be made available to users of that service.
- **SaaS and copyleft:** Traditional GPL copyleft is triggered only by "distribution" — providing SaaS access without distributing software copies may avoid GPL obligations (the "SaaS loophole"). AGPL closes this gap. Companies must carefully analyze whether their deployment model triggers distribution.
- **License compatibility:** Not all open source licenses are compatible with each other. Combining GPL-licensed code with code under incompatible licenses (e.g., certain BSD variants, GPL v2-only with Apache 2.0 in some interpretations) can create irreconcilable conflicts. Compatibility analysis is required when combining components.
- **Contributor license agreements (CLAs):** Projects may require contributors to sign CLAs granting the project broad rights to contributions (including the right to relicense). CLAs facilitate license changes and commercial dual-licensing strategies.
- **Dual licensing:** Some projects are available under both an open source license (typically copyleft) and a commercial license. Users who cannot comply with copyleft obligations can purchase a commercial license. Common model for companies like MySQL/Oracle, MongoDB (SSPL), and Elastic.
- **Compliance program:** Organizations should maintain: (1) an inventory of all OSS components used, (2) license identification for each component, (3) compliance procedures for each license type, (4) review process before introducing new OSS components, (5) distribution procedures ensuring required notices, license texts, and source code availability, and (6) contribution policies for employee contributions to external OSS projects.

## Common Contract Issues
- Software development agreements that do not require the developer to disclose OSS components used in deliverables or to ensure license compatibility with the customer's intended use.
- Representations and warranties that the deliverable does not contain any OSS — often overbroad and impractical; better to require disclosure and compatibility.
- Indemnification for IP infringement that does not address OSS license violation scenarios.
- M&A representations regarding OSS compliance — target company may have undisclosed OSS in its codebase creating copyleft obligations that affect the value or usability of the technology.
- SaaS agreements where the provider's use of AGPL-licensed components may require source code disclosure to customers.
- Vendor agreements where the vendor incorporates OSS with licenses incompatible with the customer's intended distribution or licensing model.
- OSS contribution policies that do not address who owns contributions, what licenses are acceptable for inbound contributions, and how contributions are reviewed for IP contamination.
- Failure to comply with notice and attribution requirements even under permissive licenses, which can technically terminate the license grant.

## Interaction with Other Areas
- **IP and Technology (Patents):** Some OSS licenses include patent grants (Apache 2.0) or patent retaliation clauses (Apache 2.0, GPL v3). Using OSS in products may affect patent enforcement strategies.
- **IP and Technology (SaaS/Technology):** SaaS providers must carefully evaluate whether their deployment model triggers copyleft obligations for GPL/LGPL-licensed components and whether AGPL obligations apply.
- **IP and Technology (Trade Secrets):** Copyleft obligations can force disclosure of source code, potentially undermining trade secret protection for proprietary code that is combined with copyleft OSS.
- **Corporate (M&A):** OSS due diligence is critical in technology acquisitions; undisclosed copyleft code in a product can significantly affect deal value and post-closing operations.
- **Employment:** Employee contributions to external OSS projects should be governed by clear policies addressing IP assignment, employer approval, and license compatibility.
- **Data Privacy:** Some OSS tools used for data processing may have license obligations that interact with data handling requirements.
