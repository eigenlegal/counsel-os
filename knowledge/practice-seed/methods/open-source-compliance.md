---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Open Source Compliance

Reference guide for open source software issues in products, contracts, and diligence. Use when reviewing a product's OSS dependencies, answering customer or acquirer diligence questions, setting contribution policy, or negotiating OSS-related contract terms. The legal detail on specific licenses lives in `law/ip-and-technology/open-source.md` — this guide covers what to check and when to escalate.

The core question is always the same: what license obligations attach, and does our use trigger them? Most OSS problems are triggered by distribution, not use — so the analysis is (1) what licenses are in the codebase, and (2) is the code distributed.

## License families and what they obligate

- **Permissive (MIT, BSD, Apache-2.0, ISC)** — use, modify, and redistribute freely, including in proprietary products:
  - Obligations are mostly attribution: preserve copyright notices and license text in distributions.
  - Apache-2.0 adds an express patent grant with a defensive-termination clause (sue a contributor for patent infringement over the project, lose the license) and a requirement to note modifications.
  - Low risk; the compliance task is notice hygiene, not architecture.
- **Weak copyleft (LGPL, MPL-2.0, EPL)** — copyleft applies to the licensed component, not the whole product:
  - You can combine with proprietary code if you respect the boundary: MPL at the file level, LGPL at the library level.
  - Dynamic linking is the conventional LGPL safe harbor; static linking into a proprietary binary is contested — escalate rather than assume.
  - Obligations: provide source for the covered component including your modifications to it, and don't restrict users from modifying/relinking it (which matters for locked-down devices).
- **Strong copyleft (GPL-2.0, GPL-3.0)** — distributing a work based on GPL code obligates you to license the WHOLE derivative work under the GPL and provide complete corresponding source:
  - What counts as a "derivative work" (linking, plugins, IPC boundaries) is genuinely unsettled — treat any GPL code linked into a proprietary distributed product as a problem to resolve, not a judgment call to wave through.
  - GPL-2.0 and GPL-3.0 differ on patents, anti-tivoization, and termination/cure; "GPL-2.0-only" vs "GPL-2.0-or-later" matters for combining code.
  - GPL code used purely server-side or in internal tooling is generally fine — the trigger is distribution.
- **Network copyleft (AGPL-3.0)** — closes the SaaS loophole: users interacting with the software OVER A NETWORK trigger the source obligation, no distribution required:
  - AGPL in a server-side codebase is the single highest-priority finding in any scan.
  - Many companies prohibit AGPL outright; several large acquirers treat any AGPL dependency as a deal issue.
  - Common vector: AGPL databases and infrastructure (MongoDB pre-SSPL, Grafana, MinIO) pulled in by engineers as "just a backend component."
- **Watch the non-OSS lookalikes** — source-available licenses (SSPL, BUSL, Elastic License, "fair source" variants) read like OSS but carry commercial restrictions: no competing service, production-use limits, change dates after which the code becomes OSS. Scanners often misclassify them as benign. Read the actual license text, not the scanner's category.
- **Public domain / no license** — CC0 and Unlicense are usable (with patent-grant caveats); code with NO license at all is not. No license means no permission — default copyright applies.

## Inbound review — what's in the codebase

- **Dependency scanning** — run software composition analysis (SCA) in CI, not as a one-time audit. Point-in-time scans rot immediately; the goal is blocking a problematic license at the pull request, not finding it during diligence.
- **Scan depth** — transitive dependencies, not just direct ones; container base images; vendored/copied code (scanners catch declared dependencies easily and copy-pasted snippets poorly).
- **Policy tiers** — a workable default approval matrix:
  - Permissive licenses: auto-approved
  - Weak copyleft: allowed with boundary review for distributed products
  - Strong copyleft and AGPL: legal sign-off required, case by case
  - Source-available/lookalike licenses: legal sign-off required — the commercial restrictions are the issue, not copyleft
  - Unknown or unlicensed code: blocked until resolved
- **SBOM** — maintain a software bill of materials per product. Customers and regulators increasingly require one (federal procurement already does), and it is the artifact every diligence request starts from. Generate it from the build, in a standard format (SPDX or CycloneDX), rather than maintaining it by hand.
- **Notice file** — distribution in any form requires the attribution stack: a notices file or screen aggregating required copyright and license texts. Most companies generate this from the SBOM. Mobile apps need it in-app; devices need it in documentation or a settings screen.

## Outbound analysis — is it distributed?

Copyleft obligations (except AGPL) trigger on distribution, so classify each product:
- **Distribution includes:** shipped binaries and installers, mobile apps (every app store delivery is a distribution), on-prem and private-cloud deployments at customers, container images customers pull, firmware in devices, JavaScript served to browsers (the often-missed one — frontend bundles are distributed to every visitor), SDKs and CLI tools given to customers or partners.
- **Not distribution:** internal use by employees, and SaaS — running code on your own servers and exposing functionality over a network is not distribution under GPL-2.0/3.0. This is the "SaaS loophole," and it is why GPL code on the server side is usually fine.
- **The AGPL exception to the loophole:** AGPL triggers on network interaction. If users interact with AGPL-licensed code in your SaaS product, the source-provision obligation applies even with zero distribution.
- For each distributed product, confirm:
  - Copyleft components identified and mapped to the distribution channel
  - Derivative-work boundaries defended (dynamic linking, process separation) or the component removed
  - Notices and license texts included in the distributed artifact
  - Source-availability obligations satisfied where triggered (written offer or hosted source matching the shipped version — the "complete corresponding source" must actually build)
  - Modified copyleft components flagged — modifications are where notice-only compliance stops being enough

## M&A and customer diligence posture

What acquirers and enterprise customers ask, in rough order:
- Full dependency inventory with licenses (the SBOM) — and increasingly a third-party audit scan (Black Duck or similar) run against the actual codebase, which finds what your declared inventory misses
- Any GPL/AGPL in distributed or networked products, and the derivative-work analysis for each
- OSS policy, approval workflow, and evidence it's actually followed
- Contribution history: what employees have contributed to external projects, under what authority
- Any past compliance complaints, demands, or community escalations

Common remediation paths when a scan finds a problem:
- **Remove or replace** the component with a permissive-licensed alternative — the default answer for AGPL findings
- **Isolate** behind a process boundary (separate service, separate process, network API) so the derivative-work argument doesn't reach proprietary code
- **Buy a commercial license** — many copyleft projects dual-license; this is often the fast path during a deal timeline
- **Comply openly** — release the source; sometimes genuinely the cheapest option for non-differentiating code
- **Negotiate with the vendor** directly for lookalike licenses (BUSL/SSPL projects all sell commercial terms)

Budget remediation time before signing a deal that reps a clean scan — fixing findings under an acquirer's deadline is the most expensive way to do it.

## Contribution policy and CLAs

- **Outbound contributions** — set a default: employees may contribute to projects the company uses, with approval, from their work identity. Unauthorized contributions can leak proprietary code or create IP encumbrances. Remember the employer likely owns employee code under invention-assignment agreements, so "personal" contributions in the company's field are not cleanly personal — see the `ip-assignment` method.
- **CLA basics** — projects ask contributors to sign a Contributor License Agreement (individual or corporate) or use the lighter Developer Certificate of Origin (DCO). A corporate CLA is signed by the company and covers designated employees — route these to legal; they are license grants, sometimes with patent grants attached.
- **Open-sourcing company code** — a release decision, not an engineering decision: confirm the company owns everything in the release, pick the license deliberately (permissive for adoption, copyleft for protection, and consider trademark policy separately), and scrub history for secrets and third-party code.

## Contract clauses

Recurring OSS terms in commercial agreements — see `practice/standards/representations-warranties.md` and `practice/library/ip-and-confidentiality.md` for positions:
- **OSS warranty (vendor-side)** — customers ask vendors to warrant that the product contains no OSS that triggers copyleft against customer code, or to provide an OSS disclosure schedule. Giving the warranty is fine IF your scanning actually supports it; warrant to your SBOM, not to perfection.
- **No-copyleft-contamination rep** — a rep that nothing in the deliverables subjects the customer's software to copyleft obligations. Reasonable for delivered software; resist it for pure SaaS where no code is delivered.
- **Customer-side asks** — when buying software, request the OSS disclosure schedule, an IP indemnity that doesn't carve out OSS components entirely (a full OSS carve-out can swallow the indemnity), and SBOM delivery for on-prem products.
- **Development/consulting agreements** — confirm whether the developer may use OSS in deliverables, under what license constraints, and with disclosure.

## AI-generated code provenance

Flag, don't panic: AI coding assistants can reproduce licensed code from training data without attribution, and the copyright status of AI output is unsettled.
- Know which assistants engineering uses and whether provenance/duplication filters are enabled
- Treat substantial AI-generated blocks like any other inbound code — scan them; SCA snippet-matching catches verbatim reproduction
- Diligence questionnaires now ask about AI-assisted development policy — have a written one
- For ownership and training-data questions, see `law/ai-and-automation/model-ownership.md` and `law/ai-and-automation/training-data.md`

## Escalation triggers

- AGPL (or SSPL/BUSL misread as OSS) found in any product codebase
- GPL code linked into a distributed proprietary product, or any derivative-work boundary question
- A compliance demand, community complaint, or letter from a copyleft enforcement organization — these escalate publicly and fast; respond, never ignore
- A customer or acquirer scan that contradicts your declared inventory
- Open-sourcing any company code, or signing a corporate CLA
- A request to warrant a clean codebase that current scanning cannot support
- Discovery of unlicensed (no-license) third-party code in the product

## Cross-references

- `law/ip-and-technology/open-source.md` — license-by-license obligations, dual licensing, enforcement landscape
- `law/ip-and-technology/copyrights.md` — derivative works, ownership baseline
- `law/ip-and-technology/patents.md` — patent grants and retaliation clauses in OSS licenses
- `law/ai-and-automation/model-ownership.md`, `law/ai-and-automation/training-data.md` — AI-generated code issues
- Methods: `ip-assignment`, `due-diligence`, `saas-agreement`, `contract-review`
