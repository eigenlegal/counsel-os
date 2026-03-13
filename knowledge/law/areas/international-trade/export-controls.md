# Export Controls

## Overview
US export control laws regulate the export, re-export, and transfer of controlled goods, software, technology, and technical data to foreign countries and foreign persons. The two primary regimes are the Export Administration Regulations (EAR), administered by the Bureau of Industry and Security (BIS) at the Department of Commerce, and the International Traffic in Arms Regulations (ITAR), administered by the Directorate of Defense Trade Controls (DDTC) at the Department of State. Violations carry severe civil and criminal penalties.

## Key Requirements
- **EAR (Export Administration Regulations, 15 C.F.R. Parts 730-774):**
  - Controls "dual-use" items (commercial items with potential military applications), certain purely commercial items, and less sensitive military items.
  - Export Classification: Items are classified by Export Control Classification Number (ECCN) on the Commerce Control List (CCL). Items not listed under a specific ECCN are designated EAR99 (generally eligible for export without a license to most destinations).
  - License requirements: Determined by cross-referencing the item's ECCN with the destination country on the Commerce Country Chart. Licenses may also be required based on end use, end user, or entity list restrictions.
  - License exceptions: Various license exceptions (e.g., TMP for temporary exports, TSR for technology and software under restriction, ENC for encryption) may permit exports without an individual license.
  - Entity List: BIS maintains a list of foreign entities subject to specific license requirements. Exports to Entity List parties require a license with a presumption of denial for many entries.
  - Military End Use/End User Rule: License required for exports to military end users or for military end uses in specified countries (China, Russia, Venezuela, Myanmar, etc.).
  - De minimis rule: Foreign-made items incorporating US-origin controlled content below specified thresholds (generally 25%, 10% for embargoed countries) may not be subject to EAR re-export controls.

- **ITAR (International Traffic in Arms Regulations, 22 C.F.R. Parts 120-130):**
  - Controls defense articles, defense services, and related technical data on the US Munitions List (USML).
  - All manufacturers, exporters, and brokers of defense articles must register with DDTC.
  - Any export or transfer of USML items to foreign persons (including foreign national employees in the US) requires prior DDTC authorization through a license, agreement (TAA or MLA), or exemption.
  - ITAR has NO de minimis exception — any defense article, regardless of how it is incorporated into a larger item, remains ITAR-controlled.
  - Brokering activities (facilitating sales of defense articles between foreign parties) are separately controlled.

- **Deemed exports/deemed re-exports:**
  - Under both EAR and ITAR, sharing controlled technology or technical data with a foreign national in the United States is considered an export to that person's home country (or countries of nationality/residence).
  - Employers must screen foreign national employees and contractors against export control requirements before providing access to controlled technology.
  - Fundamental research exclusion: Information arising from basic and applied research at accredited institutions is generally excluded from export controls if the research is ordinarily published and shared broadly, and there are no publication restrictions or access/dissemination controls.

- **Encryption controls (EAR Category 5, Part 2):**
  - Mass-market encryption products may be eligible for License Exception ENC with a one-time classification request and self-classification report.
  - Non-standard or proprietary encryption may require BIS review or an individual license depending on the algorithm strength, product functionality, and destination.
  - Open source encryption source code publicly available is generally outside the scope of EAR controls (though notification to BIS may be required).

- **Voluntary self-disclosure:** Both BIS and DDTC encourage voluntary self-disclosure of violations. Self-disclosure is a significant mitigating factor in penalty determinations.

## Common Contract Issues
- Technology licensing agreements that do not include export control compliance provisions or end-use/end-user restrictions.
- SaaS and cloud agreements that do not address deemed export risks from foreign national access to controlled technology.
- Employment and contractor agreements with foreign nationals that do not address deemed export screening or technology access restrictions.
- Joint development agreements that do not address export classification of jointly developed technology or allocation of export control compliance responsibilities.
- Distribution and resale agreements that do not include anti-diversion clauses, re-export restrictions, or end-user certificate requirements.
- ITAR-controlled programs that do not restrict foreign person access (including at subcontractor and supplier levels).
- Failure to address encryption export control requirements in software distribution agreements.
- Indemnification provisions that do not adequately address export control violation liability and remediation costs.
- M&A agreements missing export control representations, warranties, and due diligence regarding the target's export control compliance history and classified information access.

## Interaction with Other Areas
- **International Trade (Sanctions):** Export controls and sanctions are complementary regimes that may both apply to the same transaction. OFAC sanctions may prohibit a transaction that is permissible under export controls, and vice versa.
- **Employment:** Deemed export rules require export control screening of foreign national employees and contractors before providing access to controlled technology. Visa status alone does not determine export control obligations.
- **IP and Technology:** Software, source code, technical data, and technology are frequently export-controlled. SaaS providers must consider deemed export risks and geo-blocking for controlled items.
- **Corporate (M&A):** Export control due diligence is essential in technology and defense M&A. Acquirer must assess the target's export control compliance program, licensing history, and voluntary disclosure history.
- **Data Privacy:** Export control screening of employees involves processing personal data (nationality, immigration status) that must comply with employment privacy and data protection laws.
- **IP and Technology (Open Source):** Publicly available open source software and encryption source code have specific exclusions and exceptions under the EAR, but notification to BIS may still be required.
