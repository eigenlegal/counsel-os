---
counsel-os-type: law-area
content-version: "2026-06-11"
jurisdiction: [us-state]
last-reviewed: "2026-06-11"
authorities:
  - cite: "Code of Virginia Chapter 53"
    title: "Virginia Consumer Data Protection Act"
    url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/"
  - cite: "Connecticut Public Act 25-113 (SB 1295)"
    title: "2025 amendments to the Connecticut Data Privacy Act (most provisions effective July 1, 2026)"
    url: "https://www.cga.ct.gov/2025/ACT/PA/PDF/2025PA-00113-R00SB-01295-PA.PDF"
  - cite: "Maryland Online Data Privacy Act of 2024"
    title: "Md. Code, Com. Law § 14-4601 et seq. (effective October 1, 2025)"
    url: "https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/sb0541?ys=2024RS"
  - cite: "Montana SB 297 (2025)"
    title: "2025 amendments to the Montana Consumer Data Privacy Act (effective October 1, 2025)"
    url: "https://leg.mt.gov/bills/2025/billpdf/SB0297.pdf"
  - cite: "Tex. Bus. & Com. Code Ch. 541"
    title: "Texas Data Privacy and Security Act"
    url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm"
  - cite: "740 ILCS 14"
    title: "Illinois Biometric Information Privacy Act"
    url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004"
---
# US State Privacy Laws (Non-California)

## Source-First Use

For current state privacy work, load `us-eu-core.md` before relying on this file. Treat the state summaries below as triage prompts only; verify the current official state statute or regulator page before applying a threshold, exemption, effective date, cure period, UOOM obligation, assessment trigger, or enforcement rule.

## Applicability

A growing number of US states have enacted comprehensive consumer privacy laws. These laws vary in scope, consumer rights, business obligations, and enforcement mechanisms, creating a patchwork of requirements. This file covers laws outside of California (see `ccpa-cpra.md` for CCPA/CPRA). As of mid-2026, **twenty-two states** have enacted comprehensive privacy legislation (counting Florida's narrower Digital Bill of Rights), and all but a handful are now in effect — Indiana, Kentucky, and Rhode Island took effect January 1, 2026. No new comprehensive law was enacted in 2025, but several states materially amended existing laws (notably Connecticut and Montana); the 2026 session then added two: **Oklahoma (SB 546, signed March 20, 2026, effective January 1, 2027)** and **Alabama (APDPA, HB 351, signed April 16, 2026, effective May 1, 2027)**.

Load this sub-file when the company operates in, is incorporated in, or targets residents of states with comprehensive privacy laws, or when structuring multi-state compliance programs.

## Key Requirements

### Virginia — VCDPA (effective January 1, 2023)

- **Scope thresholds:** Entities conducting business in Virginia or targeting Virginia residents that (a) control or process personal data of **100,000+ consumers**, OR (b) control or process personal data of **25,000+ consumers** and derive **50%+ of gross revenue** from the sale of personal data.
- **Consumer rights:** Access, correct, delete, data portability, opt out of targeted advertising, opt out of sale, opt out of profiling in furtherance of decisions producing legal or similarly significant effects.
- **Sensitive data:** Requires **opt-in consent** for processing. Includes racial/ethnic origin, religious beliefs, mental/physical health diagnosis, sexual orientation, citizenship/immigration status, genetic or biometric data, children's data, and precise geolocation.
- **Data protection assessments:** Required for targeted advertising, sale of personal data, processing of sensitive data, profiling, and any processing presenting a heightened risk of harm.
- **Enforcement:** AG enforcement only. **No private right of action.** 30-day cure period (permanent — no sunset). Civil penalties under the Virginia Consumer Protection Act — up to **$7,500 per violation**.
- **Processor contracts:** Controllers must enter into contracts with processors that set out processing instructions, nature and purpose, data type, duration, and rights/obligations. Processor must assist with DPAs, breach notification, and security. Must require sub-processor contracts with equivalent obligations.

### Colorado — CPA (effective July 1, 2023)

- **Scope thresholds:** Entities conducting business in Colorado or targeting Colorado residents that (a) control or process personal data of **100,000+ consumers** per year, OR (b) control or process personal data of **25,000+ consumers** and derive revenue or receive a discount from the sale of personal data.
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, opt out of sale, opt out of profiling. Notably includes a **right to opt out via universal opt-out mechanism** (e.g., Global Privacy Control) — mandatory recognition required.
- **Sensitive data:** Opt-in consent required. Includes racial/ethnic origin, religious beliefs, mental/physical health, sexual orientation, citizenship/immigration status, genetic data, biometric data, and personal data of a **known child**.
- **Data protection assessments:** Required for targeted advertising, sale, sensitive data processing, profiling, and processing presenting a heightened risk of harm.
- **Enforcement:** AG and District Attorneys. **No private right of action.** 60-day cure period expired January 1, 2025 — enforcement may now proceed without a cure opportunity.

### Connecticut — CTDPA (effective July 1, 2023; major amendments effective July 1, 2026)

- **Scope thresholds:** Entities conducting business in Connecticut or targeting Connecticut residents that (a) control or process personal data of **100,000+ consumers** (excluding data solely for payment transactions), OR (b) control or process personal data of **25,000+ consumers** and derive **25%+ of gross revenue** from sale of personal data.
- **2025 amendments (Public Act 25-113, SB 1295; most provisions effective July 1, 2026):** Cuts the applicability threshold to **35,000+ consumers** and removes the revenue-percentage prong; applies **regardless of volume** to entities that process sensitive data (beyond limited exceptions) or sell personal data. Tightens data minimization to "reasonably necessary **and proportionate**," prohibits selling minors' personal data or using it for targeted advertising regardless of consent, expands sensitive-data categories, and requires impact assessments for profiling that produces legal or similarly significant effects (for processing activities created or generated on or after August 1, 2026).
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, sale, and profiling. Must recognize **universal opt-out mechanisms** effective January 1, 2025.
- **Sensitive data:** Opt-in consent required. Similar categories to Virginia plus **transgender/non-binary status** (as of 2023 amendments); further expanded by the 2025 amendments.
- **Enforcement:** AG enforcement only. **No private right of action.** Guaranteed 60-day cure period expired December 31, 2024 — cure opportunities are now at the AG's discretion.

### Utah — UCPA (effective December 31, 2023)

- **Scope thresholds:** Entities conducting business in Utah or targeting Utah residents, with **annual revenue of $25 million or more**, AND either (a) control or process personal data of **100,000+ consumers** per year, OR (b) derive **50%+ of gross revenue** from sale of personal data and process data of **25,000+ consumers**.
- **Consumer rights:** Access, delete, portability, opt out of targeted advertising, opt out of sale. Notably **no right to correct**.
- **Sensitive data:** Opt-in consent required. Standard categories (racial/ethnic origin, religious beliefs, health, sexual orientation, citizenship, genetic, biometric, children's data, precise geolocation).
- **Data protection assessments:** **Not required** — Utah is the only major state law without this obligation.
- **Enforcement:** AG enforcement only. **No private right of action.** 30-day cure period (no sunset).

### Texas — TDPSA (effective July 1, 2024)

- **Scope thresholds:** **No revenue threshold.** Applies to any entity conducting business in Texas or targeting Texas residents that processes personal data and is **not a small business** as defined by the SBA. Notably broad applicability.
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, sale, and profiling.
- **Sensitive data:** Opt-in consent required. Broad definition including standard categories.
- **Universal opt-out:** Must recognize universal opt-out mechanisms (e.g., Global Privacy Control) effective **January 1, 2025**.
- **Enforcement:** AG enforcement with **30-day cure period**. Civil penalties up to **$7,500 per violation**. **No private right of action.** (Biometric data is separately regulated by the Texas CUBI Act, which is also AG-enforced.)

### Oregon — OCPA (effective July 1, 2024)

- **Scope thresholds:** Entities conducting business in Oregon or targeting Oregon residents that (a) control or process personal data of **100,000+ consumers**, OR (b) control or process personal data of **25,000+ consumers** while deriving **25%+ of annual gross revenue** from selling personal data.
- **Notable distinction:** Applies to **non-profit organizations**, unlike most state privacy laws.
- **Consumer rights:** Access, correct, delete, portability, opt out of targeted advertising, sale, and profiling. Also includes a **right to obtain a list of specific third parties** to whom data has been disclosed. Must recognize universal opt-out mechanisms effective **January 1, 2026**.
- **Sensitive data:** Opt-in consent required. Includes standard categories plus **transgender/non-binary status** and **precise geolocation data** (within 1,750 feet).
- **Enforcement:** AG enforcement. **No private right of action.** 30-day cure period expired January 1, 2026.

### Maryland — MODPA (effective October 1, 2025)

Maryland's Online Data Privacy Act is the strictest of the state laws and breaks from the Virginia model — treat it as a separate compliance ceiling, not a variant:

- **Scope thresholds:** Entities processing personal data of **35,000+ consumers** (excluding payment-only data), OR **10,000+ consumers** while deriving **20%+ of gross revenue** from the sale of personal data. Effective October 1, 2025 (applies to processing activities on or after April 1, 2026).
- **Strict data minimization:** Collection is limited to what is **reasonably necessary and proportionate to provide or maintain the specific product or service requested by the consumer** — a duty that applies regardless of consent and effectively prohibits collect-first/justify-later models.
- **Sensitive data:** May be collected or processed only when **strictly necessary** to provide a requested product or service. **Sale of sensitive data is flatly prohibited** — no consent exception. Sensitive data includes consumer health data, status as transgender or nonbinary, and national origin alongside the standard categories.
- **Minors:** Prohibits sale and targeted advertising using personal data of consumers under 18 (knowledge or willful disregard standard).
- **Enforcement:** Division of Consumer Protection / AG. No private right of action under the act itself. Discretionary cure opportunity (sunsets April 1, 2027).

### Additional Enacted State Laws

- **Montana (MCDPA, effective October 1, 2024; amended by SB 297 effective October 1, 2025):** Thresholds lowered by the 2025 amendments to **25,000 consumers** (or 15,000 + 25% of revenue from sale of personal data). SB 297 also **removed the 60-day cure period**, added a duty of care and processing restrictions for minors' data, narrowed exemptions, and expanded privacy notice requirements. Universal opt-out recognition required since January 1, 2025. AG enforcement.
- **Iowa (ICDPA, effective January 1, 2025):** Conservative approach — limited consumer rights (access, delete, opt out of sale/targeted advertising). 90-day cure period (no sunset).
- **Indiana (INCDPA, effective January 1, 2026):** Similar to VCDPA. AG enforcement with 30-day cure period.
- **Tennessee (TIPA, effective July 1, 2025):** Unique affirmative defense for businesses that substantially comply with NIST privacy framework. AG enforcement, 60-day cure period.
- **Delaware (DPDPA, effective January 1, 2025):** Applies to entities processing data of 35,000+ consumers (or 10,000+ if deriving 20%+ revenue from sale). Notably covers non-profits. No cure period after December 31, 2025.
- **Kentucky (KCDPA, effective January 1, 2026):** Virginia-model law. AG enforcement, 30-day cure period.
- **New Hampshire, New Jersey, Nebraska, Minnesota, Rhode Island:** All now in effect (New Hampshire, New Jersey, and Nebraska January 2025; Minnesota July 31, 2025; Rhode Island January 1, 2026), with varying thresholds and nuances — Minnesota adds a right to question profiling results; Nebraska follows the Texas non-small-business model.
- **Oklahoma (OCDPA, SB 546, signed March 20, 2026 — effective January 1, 2027):** Twentieth comprehensive state law after a seven-year legislative push. Virginia-model rights package; notably uses the narrow monetary-consideration-only definition of "sale." AG enforcement.
- **Alabama (APDPA, HB 351, signed April 16, 2026 — effective May 1, 2027):** Among the more business-friendly laws enacted to date. Distinctive "sale" definition: reaches monetary or other valuable consideration, but only where the controller receives a material benefit and the recipient is unrestricted in downstream use. AG enforcement.

### Comparison Matrix — Key Dimensions

| Dimension | VA | CO | CT | UT | TX | OR |
|-----------|----|----|----|----|----|----|
| Revenue threshold | No | No | No | $25M | No (non-small-business) | No |
| Consumer threshold | 100K or 25K+revenue | 100K or 25K+revenue | 100K or 25K+revenue (35K from July 2026) | 100K or 25K+revenue | N/A | 100K or 25K+revenue |
| Right to correct | Yes | Yes | Yes | **No** | Yes | Yes |
| Universal opt-out | No | **Required** | **Required** | No | **Required** (2025) | **Required** (2026) |
| DPA required | Yes | Yes | Yes | Yes | Yes | Yes |
| Non-profits covered | No | No | No | No | No | **Yes** |
| Private right of action | No | No | No | No | No | No |
| Cure period | 30 days | Expired 2025 | Discretionary (guaranteed period expired 2024) | 30 days | 30 days | Expired 2026 |

### Common Requirements Across Most State Laws

- Right to access, delete, and portability (with varying exceptions).
- Opt-in consent for processing of sensitive personal data.
- Opt-out right for targeted advertising and sale of personal data.
- Written processor/controller contracts with restricted processing terms.
- Reasonable data security measures.
- Privacy notice disclosing categories of data collected, purposes, rights, and whether data is sold.
- Response timelines typically **45 days**, extendable by **45 days** with notice (mirroring CCPA).

## Interaction with Other Areas

- **Data Privacy (CCPA/CPRA, GDPR):** Companies subject to multiple state laws plus CCPA and GDPR must build compliance to the most restrictive standard. Universal opt-out requirements (Colorado, Connecticut, Texas, Montana, Oregon, among others) may be the most restrictive for adtech arrangements; Maryland's minimization and sensitive-data rules are the most restrictive for data collection and monetization models.
- **Consumer Protection:** State privacy laws supplement existing state consumer protection statutes. AG enforcement may draw on both privacy-specific and general consumer protection authority (e.g., Virginia Consumer Protection Act).
- **Employment:** Most state privacy laws exempt employee data or have delayed applicability to HR data. Virginia, Colorado, and Connecticut exempt employee data in the employment context. Texas does not exempt employee data. Counsel must verify exemptions state by state.
- **IP and Technology:** Technology vendor and SaaS agreements must be updated to reflect state-specific processor requirements, including data protection assessment cooperation and universal opt-out signal support. Tennessee's NIST framework affirmative defense creates an incentive for formal privacy framework adoption.

### Data Protection Assessments

Most state laws require controllers to conduct data protection assessments for specified high-risk processing activities. Key requirements:

- **Virginia:** Required for targeted advertising, sale of personal data, processing of sensitive data, profiling, and any processing that presents a heightened risk of harm. Must weigh the benefits of processing against the potential risks to consumer rights, considering the use of de-identification, consumer expectations, and the context of processing.
- **Colorado:** Same triggers as Virginia. Must be made available to the AG upon request. The AG has published guidance on assessment content and methodology.
- **Connecticut:** Same triggers as Virginia and Colorado. Assessment must identify and weigh benefits against risks and consider safeguards to address identified risks.
- **Texas:** Required for processing that presents a heightened risk of harm. The controller must identify and weigh benefits and potential risks. Assessments must be maintained for at least **3 years** after the processing ends.
- **Tennessee unique feature:** Tennessee's TIPA provides an **affirmative defense** to AG enforcement actions for businesses that have created and complied with a written privacy program that reasonably conforms to the **NIST Privacy Framework** or comparable published standards.

### Biometric Information Privacy

Several states have enacted specific biometric information privacy laws that layer on top of comprehensive privacy statutes:

- **Illinois (BIPA, 740 ILCS 14):** Requires written consent before collecting biometric identifiers (fingerprints, retina scans, facial geometry). Provides a **private right of action** with statutory damages of **$1,000 per negligent violation** and **$5,000 per intentional/reckless violation**. The only US biometric law with a private right of action, generating significant class action litigation.
- **Texas (CUBI Act, Tex. Bus. & Com. Code 503):** Requires consent before capturing biometric identifiers. AG enforcement only — no private right of action. Penalties up to **$25,000 per violation**.
- **Washington (RCW 19.375):** Requires notice and consent for commercial use of biometric identifiers. AG enforcement only.
- **Interaction with comprehensive state laws:** Where both a biometric-specific law and a comprehensive privacy law apply, both must be satisfied. BIPA's private right of action makes it the most significant litigation risk in the biometric data space.

## Sources

- [Virginia VCDPA — Virginia Law](https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/) — Va. Code 59.1-575 through 59.1-585
- [Colorado CPA — Colorado Legislature](https://leg.colorado.gov/bills/sb21-190) — C.R.S. 6-1-1301 through 6-1-1313
- [Connecticut CTDPA](https://www.cga.ct.gov/2022/act/Pa/pdf/2022PA-00015-R00SB-00006-PA.PDF) — Public Act 22-15
- [Connecticut 2025 Amendments — Public Act 25-113](https://www.cga.ct.gov/2025/ACT/PA/PDF/2025PA-00113-R00SB-01295-PA.PDF) — SB 1295; most provisions effective July 1, 2026
- [Maryland MODPA — Maryland General Assembly](https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/sb0541?ys=2024RS) — SB 541 (2024); Md. Code, Com. Law § 14-4601 et seq.
- [Montana SB 297 (2025)](https://leg.mt.gov/bills/2025/billpdf/SB0297.pdf) — 2025 MCDPA amendments, effective October 1, 2025
- [Texas TDPSA — Texas Legislature](https://capitol.texas.gov/BillLookup/History.aspx?LegSess=88R&Bill=HB4) — Tex. Bus. & Com. Code Ch. 541
- [Illinois BIPA — Illinois General Assembly](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004) — 740 ILCS 14
- [IAPP US State Privacy Legislation Tracker](https://iapp.org/resources/article/us-state-privacy-legislation-tracker/) — Comprehensive tracker of all state laws
