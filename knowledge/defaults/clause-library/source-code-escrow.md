---
counsel-os-type: clause-library
counsel-os-version: "0.3.1"
---

## Source Code Escrow

# Source Code Escrow — Clause Library

## Escrow Deposit

### Standard
> Vendor shall deposit with the Escrow Agent, within thirty (30) days of the Effective Date and quarterly thereafter, a complete and current copy of: (a) the source code for the Software; (b) all build scripts, compilers, and tools necessary to compile the source code into executable form; (c) technical documentation sufficient for a reasonably skilled developer to understand, maintain, and modify the source code; and (d) a list of all third-party dependencies and libraries, together with applicable license terms. Each deposit shall be accompanied by a written description of changes since the prior deposit. Vendor represents and warrants that each deposit is complete and sufficient to build, deploy, and maintain the Software without reliance on Vendor.

### Aggressive (Customer-Favorable)
> Vendor shall deposit with the Escrow Agent, within fifteen (15) days of the Effective Date and monthly thereafter (or within five (5) business days of any major release, patch, or update), a complete and current copy of: (a) all source code for the Software, including all modules, libraries, APIs, and microservices; (b) all build scripts, makefiles, CI/CD configurations, container images, infrastructure-as-code templates, and tools required to compile, build, test, and deploy the Software; (c) comprehensive technical documentation including architecture diagrams, database schemas, API specifications, deployment guides, and administrator manuals; (d) all third-party dependencies, libraries, and components, together with applicable license agreements and evidence that such licenses permit Customer's use upon release; and (e) a complete copy of the test suite, including automated tests and test data. Vendor shall certify in writing with each deposit that the materials are complete and current and that the source code can be compiled into a fully functional version of the Software identical in all material respects to the production version. Failure to make timely or complete deposits shall constitute a material breach.

### Vendor-Favorable
> Vendor shall deposit with the Escrow Agent a copy of the source code for the Software within sixty (60) days of the Effective Date and semi-annually thereafter. The deposit shall include the source code and such documentation as Vendor determines, in its reasonable discretion, to be appropriate. Vendor shall not be required to deposit third-party components or tools that Vendor does not own or have the right to deposit. Deposits shall be made in a format determined by Vendor.

### Minimum Acceptable
> Vendor shall deposit with the Escrow Agent, within thirty (30) days of the Effective Date and quarterly thereafter, the source code for the Software and documentation reasonably necessary to compile and maintain the Software. Deposits shall include a list of material third-party dependencies.

### Notes
The critical gap in Vendor-Favorable language is the absence of third-party dependencies and build tooling — source code alone is useless if the customer cannot compile it. Always insist on build scripts and a dependency manifest at minimum. Monthly deposits (Aggressive) are appropriate for rapidly evolving SaaS platforms; quarterly is adequate for stable on-premise software. The certification of completeness is important because incomplete deposits are a common problem — pair this with verification rights.

## Release Conditions

### Standard
> The Escrow Agent shall release the deposited materials to Customer upon the occurrence of any of the following events (each a "Release Condition"): (a) Vendor files for bankruptcy, is adjudicated bankrupt, or makes a general assignment for the benefit of creditors; (b) a receiver, trustee, or liquidator is appointed for a substantial portion of Vendor's assets and is not dismissed within sixty (60) days; (c) Vendor materially breaches this Agreement and fails to cure within sixty (60) days of written notice; (d) Vendor discontinues the Software or ceases to provide maintenance and support for the Software; or (e) Vendor ceases to conduct business in the ordinary course. Customer shall deliver written notice to both Vendor and the Escrow Agent specifying the Release Condition. Vendor shall have thirty (30) days from receipt of such notice to dispute the release by providing written objection to the Escrow Agent, in which case the dispute shall be resolved in accordance with the Escrow Agreement's dispute resolution procedures. If Vendor does not timely dispute, the Escrow Agent shall release the deposited materials to Customer.

### Aggressive (Customer-Favorable)
> The Escrow Agent shall release the deposited materials to Customer upon written notice from Customer certifying the occurrence of any of the following: (a) Vendor files for or is subject to any insolvency, bankruptcy, receivership, or similar proceeding; (b) Vendor materially breaches this Agreement and fails to cure within thirty (30) days of notice; (c) Vendor discontinues the Software, announces end-of-life, or fails to provide a major update for twelve (12) consecutive months; (d) Vendor ceases to conduct business or is dissolved; (e) Vendor undergoes a change of control to a direct competitor of Customer (as identified in Exhibit [X] or as reasonably determined by Customer); or (f) Vendor fails to maintain the escrow deposit in accordance with Section [X]. Vendor shall have fifteen (15) days to dispute the release by delivering a written objection to the Escrow Agent. If Vendor disputes, the Escrow Agent shall release the materials into a neutral holding environment pending resolution. Under no circumstances shall a pending dispute delay release for more than sixty (60) days. The occurrence of a Release Condition and subsequent release shall not limit any other rights or remedies available to Customer.

### Vendor-Favorable
> The Escrow Agent shall release the deposited materials to Customer only upon: (a) a final, non-appealable adjudication that Vendor is bankrupt; or (b) a final, non-appealable judgment or arbitral award confirming that Vendor has materially breached its maintenance and support obligations and failed to cure within ninety (90) days. No release shall occur based on Customer's unilateral assertion. Vendor shall have sixty (60) days to dispute any release request, during which time the Escrow Agent shall not release the materials. Vendor's discontinuation of the Software or cessation of any particular feature shall not constitute a Release Condition if Vendor offers a commercially reasonable replacement or migration path.

### Minimum Acceptable
> The Escrow Agent shall release the deposited materials to Customer upon: (a) Vendor's bankruptcy or insolvency; (b) Vendor's material breach that remains uncured for sixty (60) days after notice; or (c) Vendor's discontinuation of the Software without a reasonable migration alternative. Vendor shall have thirty (30) days to dispute any release request.

### Notes
The Vendor-Favorable language requiring "final, non-appealable" judgments before release effectively makes escrow useless — by the time litigation concludes, the customer has already suffered the harm escrow was designed to prevent. Insist on a notice-and-dispute mechanism with a reasonable (15-30 day) dispute window and a cap on how long disputes can delay release. Change of control to a competitor is an increasingly important trigger for technology companies. The dispute resolution mechanism in the escrow agreement itself (typically arbitration with a 30-60 day timeline) is critical — review the escrow agreement, not just the software license.

## License Upon Release

### Standard
> Upon release of the deposited materials, Customer shall have a non-exclusive, non-transferable, royalty-free license to use, compile, modify, and create derivative works of the source code solely for the purpose of maintaining, supporting, and operating the Software for Customer's internal business purposes. Customer shall not distribute, sublicense, or make the source code available to any third party, except to Customer's contractors who are bound by confidentiality obligations at least as protective as those in this Agreement and who require access solely to assist Customer with maintenance and support. This license shall survive termination of this Agreement.

### Aggressive (Customer-Favorable)
> Upon release, Customer shall have a perpetual, irrevocable, non-exclusive, worldwide, royalty-free, fully paid-up license to use, reproduce, compile, modify, enhance, and create derivative works of all deposited materials for any purpose related to Customer's use, maintenance, support, enhancement, or operation of the Software, including: (a) bug fixes and security patches; (b) modifications for compatibility with Customer's systems; (c) enhancements to add functionality; and (d) integration with Customer's other systems. Customer may engage third-party contractors to exercise these rights on Customer's behalf, provided such contractors are bound by confidentiality obligations. Customer may sublicense to its Affiliates for their internal use. This license shall be perpetual and irrevocable and shall not be affected by any subsequent termination or expiration of any agreement between the parties.

### Vendor-Favorable
> Upon release, Customer shall have a limited, non-exclusive, non-transferable, non-sublicensable license to use the source code solely to maintain the Software in its then-current form for Customer's internal business purposes. Customer shall not modify, enhance, or create derivative works of the source code, except for bug fixes necessary to maintain the Software's existing functionality. Customer shall not engage third parties to access the source code without Vendor's prior written consent. This license shall terminate three (3) years after the date of release.

### Minimum Acceptable
> Upon release, Customer shall have a non-exclusive, non-transferable, perpetual, royalty-free license to use, compile, and modify the source code solely for maintaining and operating the Software for Customer's internal business purposes. Customer may engage third-party contractors under appropriate confidentiality obligations.

### Notes
The Vendor-Favorable language prohibiting modifications beyond bug fixes and imposing a three-year time limit defeats the purpose of escrow — if the vendor has failed, the customer needs meaningful rights to keep the software running and adapt it over time. At minimum, insist on perpetual duration and the right to modify for maintenance purposes. The right to engage third-party contractors is essential since the customer's internal team may not have the skills to work with the code. Watch for third-party component licenses that may restrict Customer's rights upon release — the escrow should include evidence that embedded third-party licenses permit this use.

## Verification

### Standard
> Customer shall have the right, no more than once per year, to request that the Escrow Agent (or a mutually agreed independent technical expert) verify that the deposited materials are complete and can be compiled into a functional version of the Software. Verification shall be conducted at Customer's expense, unless the verification reveals a material deficiency, in which case Vendor shall bear the cost of the verification and shall cure the deficiency within thirty (30) days. Vendor shall cooperate with the verification process and provide reasonable technical assistance.

### Aggressive (Customer-Favorable)
> Customer may request verification of the deposited materials at any time, and no less than once per year. Verification shall be conducted by an independent technical expert selected by Customer (and reasonably acceptable to Vendor) and shall confirm that: (a) the deposited source code is complete and corresponds to the current production version of the Software; (b) the source code can be compiled into a fully functional executable; (c) all third-party dependencies are included and properly licensed; and (d) the documentation is sufficient for a competent developer unfamiliar with the Software to understand, build, and maintain it. All verification costs shall be borne by Vendor. If verification reveals any deficiency, Vendor shall cure within fifteen (15) days, and Customer may re-verify at Vendor's expense. Repeated verification failures (two or more within any twelve-month period) shall constitute a material breach.

### Vendor-Favorable
> Customer may request the Escrow Agent to confirm that a deposit has been received, but shall have no right to inspect, test, compile, or otherwise access the deposited materials prior to a valid release. Any technical verification must be mutually agreed in writing and shall be conducted at Customer's sole expense by a technical expert acceptable to Vendor.

### Minimum Acceptable
> Customer may request annual verification by the Escrow Agent (or an independent technical expert) to confirm that the deposited materials are complete and can be compiled. Verification costs are borne by Customer unless material deficiencies are found, in which case Vendor bears the cost and cures deficiencies within thirty (30) days.

### Notes
Vendor-Favorable language prohibiting any pre-release verification is a serious red flag — numerous escrow disputes have revealed that deposits were incomplete, outdated, or entirely non-functional. Annual verification is the market standard and should be non-negotiable. The cost allocation approach (customer pays unless deficient) is fair and widely accepted. For mission-critical software, consider requiring Vendor to conduct an internal build test with each deposit and certify success.

## Escrow Agent

### Standard
> The parties shall engage [Iron Mountain Intellectual Property Management / EscrowTech / a nationally recognized escrow agent mutually agreed by the parties] as the Escrow Agent. The parties shall enter into a three-party escrow agreement substantially in the form attached as Exhibit [X] (the "Escrow Agreement"). Escrow Agent fees shall be shared equally between Vendor and Customer. If the Escrow Agent ceases to provide escrow services or is unable to perform, the parties shall cooperate in good faith to select a replacement within thirty (30) days.

### Aggressive (Customer-Favorable)
> The parties shall engage an escrow agent selected by Customer from among the following: Iron Mountain Intellectual Property Management, EscrowTech, or another nationally recognized escrow agent with at least five (5) years of experience in software escrow. Vendor shall pay all Escrow Agent fees, including initial setup, annual maintenance, and deposit fees. The Escrow Agreement shall be in a form reasonably acceptable to Customer and shall include, at minimum: (a) verification rights as set forth herein; (b) dispute resolution with a sixty (60) day maximum timeline; (c) the Escrow Agent's obligation to maintain deposits in a secure, geographically redundant facility; and (d) the Escrow Agent's obligation to notify Customer if Vendor fails to make a scheduled deposit. Customer shall be named as the beneficiary and shall have a direct contractual relationship with the Escrow Agent.

### Vendor-Favorable
> Vendor shall select and engage an escrow agent at Vendor's discretion. Customer shall pay all Escrow Agent fees. The terms of the Escrow Agreement shall be Vendor's standard form. Vendor may change the Escrow Agent at any time with thirty (30) days' notice to Customer.

### Minimum Acceptable
> The parties shall engage a mutually agreed, nationally recognized escrow agent. Escrow Agent fees shall be shared equally. The Escrow Agreement shall include verification rights and a dispute resolution mechanism with a defined timeline not to exceed ninety (90) days.

### Notes
The choice of escrow agent matters less than the terms of the escrow agreement itself — always review the three-party agreement carefully. Vendor-Favorable language giving Vendor sole discretion over agent selection and agreement terms creates a conflict of interest since the escrow exists to protect Customer. At minimum, insist on mutual agreement on the agent and the form of escrow agreement. Fee-splitting is the market norm; Vendor-paid is appropriate when escrow was a Customer requirement during negotiations. Ensure the escrow agreement addresses what happens if the agent itself goes out of business.
