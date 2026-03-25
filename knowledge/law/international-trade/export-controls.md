---
counsel-os-type: law-area
counsel-os-version: "0.3.2"
---

## Export Controls

# Export Controls

## Applicability

Applies when any transaction, agreement, or business activity involves:

- Export, re-export, or in-country transfer of goods, software, technology, or technical data to foreign countries or foreign persons
- Employment of or access by foreign nationals to controlled technology in the US (deemed export)
- Defense articles, defense services, or related technical data on the US Munitions List (ITAR)
- Dual-use items on the Commerce Control List or items subject to EAR jurisdiction (EAR)
- Encryption technology, source code, or products with encryption functionality
- Transactions with parties on BIS restricted party lists (Entity List, Denied Persons List, Unverified List)
- Cloud computing services or SaaS platforms accessible to foreign persons

## Key Requirements

### EAR Classification and Licensing (15 C.F.R. Parts 730-774)

- **What**: All items subject to EAR must be classified. Items on the Commerce Control List (CCL) receive an Export Control Classification Number (ECCN) formatted as [digit][letter][digit][digit][digit] (e.g., 3A001). Items not on the CCL are designated EAR99 (generally exportable without a license to most destinations)
- **Threshold/Timeline**: License requirement determined by cross-referencing the ECCN against the destination country on the Commerce Country Chart (Supplement No. 1 to Part 738). Additional license requirements apply based on end use (Section 744), end user, or list-based restrictions
- **Consequence**: Export without required license: civil penalties up to $364,992 per violation (adjusted annually); criminal penalties up to $1,000,000 and 20 years imprisonment per willful violation. Each shipment, transmission, or disclosure is a separate violation

### EAR License Exceptions

- **What**: Authorize exports without an individual license when specific conditions are met. Key exceptions include:
  - **TMP**: Temporary exports for servicing, exhibition, or testing
  - **TSR**: Technology and software under restriction (to certain destinations under specific conditions)
  - **ENC**: Encryption items (mass-market or with classification report)
  - **GOV**: Exports to US government agencies and personnel abroad
  - **RPL**: Servicing and replacement of parts and equipment
  - **APR**: Additional permissive re-exports (from Country Group A:1 to most destinations)
  - **STA**: Strategic Trade Authorization (to Country Group A:5 allies)
  - **CIV**: Civil end users (limited items to civilian end users in specified countries)
- **Threshold/Timeline**: Exporter self-determines eligibility; no BIS pre-approval. Conditions must be met at time of export. Some exceptions require advance notification to BIS. License exceptions may not be used when an order, denial, or other restriction applies
- **Consequence**: Relying on a license exception when conditions are not met constitutes an unlicensed export violation with full penalties

### ITAR Jurisdiction and Registration (22 C.F.R. Parts 120-130)

- **What**: Controls defense articles, defense services, and related technical data listed on the US Munitions List (USML, 22 C.F.R. Part 121, organized in 21 categories). All manufacturers, exporters, and brokers of defense articles must register with DDTC
- **Threshold/Timeline**: Registration required before any ITAR-controlled export activity. Registration fee: $2,250/year minimum. DDTC authorization required prior to any export — no retroactive licensing. Authorization types:
  - **DSP-5**: Permanent export license (single transaction)
  - **DSP-73**: Temporary export license
  - **TAA**: Technical Assistance Agreement (for defense services and technical data)
  - **MLA**: Manufacturing License Agreement (for foreign manufacture of defense articles)
- **Consequence**: AECA penalties: civil up to $1,216,326 per violation; criminal up to $1,000,000 and 20 years imprisonment. Debarment from defense trade (statutory debarment under ITAR Section 127.7). ITAR has NO de minimis exception — any defense article remains ITAR-controlled regardless of integration into a larger system

### Deemed Exports and Deemed Re-exports

- **What**: Sharing controlled technology or technical data with a foreign national in the US is deemed an export to that person's most recent country of citizenship or permanent residency. Sharing controlled technology with a third-country national in a foreign country is a deemed re-export to the third country
- **Threshold/Timeline**: Applies under both EAR and ITAR. Must be assessed before providing any access to controlled technology — including employment, consulting, academic research, plant tours, or facility visits. Assessment required at hiring, role change, or when technology access changes
- **Consequence**: Same penalties as physical exports. Employers are liable for unauthorized deemed exports. A Technology Control Plan (TCP) is recommended for organizations employing foreign nationals with access to controlled technology

### Fundamental Research Exclusion

- **What**: Information arising from basic and applied research at accredited institutions of higher learning is generally excluded from export controls if the research is ordinarily published and shared broadly. The exclusion does not apply when: (a) the institution accepts publication restrictions, (b) the research is funded under a contract with access/dissemination controls, or (c) the research involves specific items on the CCL or USML
- **Threshold/Timeline**: Exclusion status determined at the project level. University technology control officers should review each project before foreign national access is granted
- **Consequence**: Loss of the fundamental research exclusion converts academic collaboration into a regulated export, potentially requiring individual licenses for each foreign national participant

### Encryption Controls (EAR Category 5, Part 2)

- **What**: Encryption items classified under ECCN 5A002, 5D002, 5E002 and related ECCNs. Mass-market encryption products (meeting Note 3 to Category 5, Part 2 criteria) eligible for License Exception ENC with self-classification
- **Threshold/Timeline**: Mass-market path: one-time self-classification report to BIS (crypt@bis.doc.gov and enc@nsa.gov) before export, then semi-annual sales reporting. Non-mass-market: may require ENC classification request (30-day BIS review period) or individual license depending on algorithm strength, product functionality, and destination
- **Consequence**: Unauthorized export of encryption items carries standard EAR penalties. Open source encryption source code publicly available is generally outside EAR scope if notification to BIS is provided (Section 742.15(b)). Proprietary encryption without proper classification is a common enforcement target

### Restricted Party Screening (Entity List, Denied Persons List, Unverified List)

- **What**: BIS maintains multiple restricted party lists with different consequences:
  - **Entity List** (Supplement No. 4 to Part 744): License requirements with specified review policies (often presumption of denial). Over 600 entities as of 2025
  - **Denied Persons List**: Absolute bar on all export transactions — no license available
  - **Unverified List** (UVL): Enhanced due diligence required; no license exceptions available. UVL parties have 60 days to resolve status or face Entity List addition
  - **Military End User List** (MEU): License required for items in Supplement No. 2 to Part 744 to listed military end users
- **Threshold/Timeline**: Screen all parties — buyer, consignee, intermediate consignee, end user, and any other party to the transaction. Screen at each transaction. Lists updated via Federal Register notices
- **Consequence**: Export to denied person: per se violation, full penalties. Export to Entity List party without license: standard violation. Failure to perform UVL due diligence: loss of license exception eligibility and potential violation

### De Minimis Rule (EAR Section 734.4)

- **What**: Foreign-made items incorporating US-origin controlled content below a specified percentage may not be subject to EAR re-export controls
  - Standard threshold: 25% US-controlled content by value
  - Lower threshold: 10% for exports/re-exports to embargoed countries (Cuba, Iran, North Korea, Syria, Crimea) and for items controlled for specified reasons (e.g., 9x515 and "600 series" items)
- **Threshold/Timeline**: Calculation: fair market value of controlled US-origin content as a percentage of fair market value of the foreign-made item. Must be recalculated at each re-export. Only controlled content counts (EAR99 US-origin content is excluded from numerator)
- **Consequence**: Exceeding the threshold subjects the foreign-made item to full EAR jurisdiction. Miscalculating de minimis is an independent violation. ITAR has no de minimis exception whatsoever

### Voluntary Self-Disclosure (VSD)

- **What**: Both BIS (for EAR violations) and DDTC (for ITAR violations) encourage voluntary self-disclosure. Effective October 2023, DOJ National Security Division requires VSD for willful export control violations or face aggravated treatment
- **Threshold/Timeline**:
  - BIS: File initial VSD promptly upon discovery; full narrative submission within 180 days. Include root cause, scope, remedial measures, and all affected transactions
  - DDTC: File initial notification within 60 days of discovery; final submission within additional time as negotiated. Include corrective actions and compliance program enhancements
- **Consequence**: VSD is the most significant mitigating factor. BIS dual-track: non-egregious VSDs generally resolved with no-action letter or warning letter. DDTC: VSD reduces penalty and likelihood of debarment. DOJ NSD: failure to self-disclose willful violations is an aggravating factor and may result in criminal prosecution

### Multilateral Export Control Regimes

- **What**: US export controls are informed by multilateral regimes establishing control lists harmonized among member states:
  - **Wassenaar Arrangement**: Conventional arms and dual-use goods/technologies (43 participating states)
  - **MTCR**: Missile Technology Control Regime (rockets, UAVs, related technology)
  - **Nuclear Suppliers Group**: Nuclear materials, equipment, and technology
  - **Australia Group**: Chemical and biological weapons-related items
- **Threshold/Timeline**: Multilateral lists inform but do not replace US control lists. US lists are often more expansive than multilateral baselines (unilateral controls)
- **Consequence**: Items controlled multilaterally are generally subject to more favorable licensing policies than unilaterally controlled items. License exceptions may be available for multilaterally controlled items but not for unilateral controls

### Common Contract Provisions

- **What**: Key export-control-related provisions that should be addressed in technology, software, and defense-related agreements:
  - Export control compliance representations (both parties will comply with all applicable export control laws)
  - End-use and end-user restrictions (goods/technology will not be used for proliferation activities or diverted to restricted end users)
  - Re-export restrictions (recipient will not re-export without proper authorization)
  - ITAR flowdown requirements (for defense-related subcontracts — foreign person access restrictions, DDTC notification obligations)
  - Technology access restrictions (physical and logical access controls for controlled technology)
  - Deemed export provisions in employment and consulting agreements (acknowledgment of export control obligations, cooperation with screening)
  - License cooperation clauses (parties will cooperate in obtaining necessary export licenses and provide required documentation)
  - Encryption classification responsibilities (allocation of responsibility for EAR encryption classification between licensor and distributor)
  - Termination rights for export control violations or changes in export control status
  - Indemnification for export control violations (typically mutual, covering each party's own violations)
- **Threshold/Timeline**: Export control provisions should be included in all technology licensing, distribution, SaaS, employment/consulting (with foreign nationals), joint development, and defense-related agreements. Flowdown requirements under ITAR are mandatory — failure to include required provisions in subcontracts is itself a violation
- **Consequence**: Absence of export control provisions in relevant agreements does not excuse violations — both parties remain independently liable. However, contractual provisions allocate risk, facilitate compliance, and provide termination rights when a counterparty's conduct creates export control exposure

## Interaction with Other Areas

- **Sanctions**: Export controls and sanctions are complementary regimes. A BIS license does not authorize a transaction prohibited by OFAC, and vice versa. Both clearances needed independently
- **Employment**: Deemed export rules require nationality-based screening of employees and contractors before granting access to controlled technology. Must be implemented consistently with anti-discrimination laws (coordinate with HR/employment counsel)
- **IP and Technology**: Software, source code, technical data, and proprietary technology are frequently export-controlled. SaaS providers must consider deemed export risks, geo-blocking, and cloud access controls for controlled items
- **Corporate (M&A)**: Export control due diligence must assess target's classification history, licensing portfolio, VSD history, ITAR registration status, Technology Control Plans, and any pending enforcement matters
- **Data Privacy**: Employee screening for deemed export purposes involves processing nationality and immigration data, which must comply with employment privacy requirements and GDPR for EU-based personnel
- **International Trade (Customs)**: Export classification affects customs reporting obligations. Electronic Export Information (EEI) filing via AES required for exports valued over $2,500 or requiring a license
- **International Trade (Foreign Investment)**: Critical technology producing US businesses trigger mandatory CFIUS filing requirements when foreign investment provides specified access rights

## Sources

- BIS Export Administration Regulations: https://www.bis.gov/regulations/export-administration-regulations-ear
- Commerce Control List (CCL): Supplement No. 1 to Part 774 of the EAR
- BIS Entity List: Supplement No. 4 to Part 744 of the EAR
- DDTC ITAR Regulations: https://www.pmddtc.state.gov/ddtc_public
- BIS Encryption Controls: https://www.bis.gov/policy-guidance/encryption
- BIS VSD Guidelines: https://www.bis.gov/enforcement/oee/voluntary-self-disclosure
- DOJ National Security Division VSD Policy (October 2023): https://www.justice.gov/nsd/nsd-vsd-policy
- Wassenaar Arrangement Control Lists: https://www.wassenaar.org/control-lists/
