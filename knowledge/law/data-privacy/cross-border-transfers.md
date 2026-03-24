---
counsel-os-type: law-area
counsel-os-version: "0.3.1"
---

## Cross Border Transfers

# Cross-Border Data Transfers

## Applicability

This sub-file covers the legal mechanisms and requirements for transferring personal data across national borders. Load when:

- Data flows cross national boundaries (e.g., EU to US, APAC to EU, intra-group transfers across countries).
- Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs), or other transfer mechanisms are referenced or required.
- Adequacy decisions or frameworks (EU-US Data Privacy Framework) are relied upon.
- Transfer Impact Assessments (TIAs) are being conducted or reviewed.
- Data localization requirements may apply (China, Russia, certain sectors in India).
- Cross-border transfer provisions in DPAs or service agreements are being drafted or reviewed.

## Key Requirements

### GDPR Cross-Border Transfer Framework (Articles 44-49)

The GDPR restricts transfers of personal data to countries outside the EEA unless adequate protection is ensured. The available mechanisms, in order of preference:

#### Adequacy Decisions (Article 45)

- **What:** The European Commission determines that a third country ensures an adequate level of data protection. Transfers to adequate countries are permitted without additional safeguards.
- **Current adequacy decisions (as of early 2026):** Andorra, Argentina, Canada (commercial activities under PIPEDA only), Faroe Islands, Guernsey, Isle of Man, Israel, Japan, Jersey, New Zealand, Republic of Korea, Switzerland, United Kingdom, Uruguay, and the **United States** (limited to organizations self-certified under the EU-US Data Privacy Framework).
- **EU-US Data Privacy Framework (DPF):** Adopted July 2023, replacing Privacy Shield (invalidated by Schrems II). Requires US organizations to self-certify with the Department of Commerce and commit to DPF Principles. Covers only transfers to self-certified US organizations. Includes redress mechanisms through the Data Protection Review Court.
- **Consequence:** Adequacy decisions are subject to periodic review and can be revoked. Reliance on an adequacy decision that is later invalidated may retroactively undermine the lawfulness of transfers.

#### Standard Contractual Clauses (Article 46(2)(c))

- **What:** Pre-approved contractual clauses adopted by the European Commission that provide appropriate data protection safeguards.
- **2021 SCCs (Commission Implementing Decision 2021/914):** Four modules:
  - **Module 1:** Controller to Controller
  - **Module 2:** Controller to Processor
  - **Module 3:** Processor to Processor
  - **Module 4:** Processor to Controller
- **Mandatory elements:** Data protection obligations, data subject rights (third-party beneficiary rights), sub-processor requirements, cooperation with supervisory authorities, termination and data return/deletion, governing law (must be an EU member state), and jurisdiction (EU courts).
- **Cannot be modified in substance:** Parties may add clauses or safeguards provided they do not contradict the SCCs or diminish data subject rights. The SCCs must be incorporated in their entirety.
- **Docking clause:** Additional parties may accede to the SCCs during the contract's lifetime.
- **Consequence:** Using outdated (pre-2021) SCCs does not provide a valid transfer mechanism. Failure to execute the correct module is a transfer violation under Article 83(5) — fines up to **EUR 20 million or 4% of global annual turnover**.

#### Binding Corporate Rules (Article 47)

- **What:** Internal policies adopted by a group of undertakings for intra-group cross-border transfers. Must be approved by the competent supervisory authority through the consistency mechanism.
- **Required content:** Legally binding obligations on all group members, data subject rights (including enforceable third-party beneficiary rights), organizational structure, data protection officer, complaint handling, cooperation with supervisory authorities, and training.
- **Approval process:** Lengthy — typically **12-24 months** for approval. Requires lead supervisory authority review and peer review by other concerned authorities.
- **Use case:** Appropriate for large multinational organizations with ongoing, high-volume intra-group data transfers. Not suitable for transfers to external third parties.

#### Derogations (Article 49)

- **What:** In the absence of an adequacy decision or appropriate safeguards, transfers may occur under specific derogations.
- **Available derogations:** (a) Explicit consent (after being informed of risks), (b) contract performance with the data subject, (c) pre-contractual measures at data subject's request, (d) contract performance in data subject's interest, (e) important reasons of public interest, (f) legal claims, (g) vital interests, (h) transfer from a public register.
- **Strict interpretation:** Derogations must be interpreted restrictively. Recital 111 clarifies that they are not intended to be the default mechanism for systematic, large-scale, or repeated transfers.
- **Consequence:** Reliance on derogations for ongoing, systematic transfers is a compliance risk. Supervisory authorities have objected to routine reliance on consent or contract necessity for large-scale transfers.

### Post-Schrems II Requirements

The CJEU's Schrems II decision (Case C-311/18, July 16, 2020) established additional obligations:

#### Transfer Impact Assessments (TIAs)

- **What:** Before relying on SCCs (or BCRs), the data exporter must assess whether the law of the destination country provides essentially equivalent protection to the GDPR, considering: (a) the specific circumstances of the transfer, (b) the legal framework of the destination country (including surveillance laws, government access powers, and rule of law), and (c) any supplementary measures.
- **Assessment factors (EDPB Recommendations 01/2020):** Nature of the data, purpose and context of transfer, whether the data may be accessed by public authorities in the destination country, and whether effective legal remedies exist for data subjects.
- **Documentation:** The TIA must be documented and available for the supervisory authority upon request.
- **Outcome:** If the TIA reveals that the destination country's laws impair the effectiveness of the SCCs and supplementary measures cannot close the gap, the transfer must be suspended or not commenced.

#### Supplementary Measures

The EDPB Recommendations 01/2020 identify three categories:

- **Technical measures:** End-to-end encryption (where the importer does not have the decryption key), pseudonymization (where the re-identification data remains in the EEA), split or multi-party processing, anonymization before transfer.
- **Contractual measures:** Enhanced audit rights, transparency obligations regarding government access requests, commitments to challenge disproportionate access orders, notification of inability to comply with SCCs.
- **Organizational measures:** Internal policies limiting data access, governance frameworks, ISO 27001 or equivalent certifications, transparency reports.
- **Effectiveness requirement:** Supplementary measures must effectively close any protection gap identified in the TIA. Technical measures that prevent the importer from accessing data in clear text are generally the most effective.

### UK Cross-Border Transfer Framework

- **UK adequacy bridge:** Following Brexit, the EU granted the UK an adequacy decision (June 2021) with a sunset clause of **4 years** (expiring June 2025, with potential extension). As of early 2026, check current status.
- **UK International Data Transfer Agreement (IDTA):** The UK's alternative to EU SCCs, adopted by the ICO. Available as a standalone agreement or as a UK Addendum to the EU SCCs.
- **UK Transfer Risk Assessments:** Similar to TIAs under EU GDPR. The ICO provides a Transfer Risk Assessment tool.
- **UK Extension to EU-US DPF:** The UK-US Data Bridge extends the EU-US DPF framework to UK personal data transfers to self-certified US organizations.

### China — PIPL Cross-Border Transfers (Articles 38-43)

- **Mechanisms:** Cross-border transfers of personal information require one of: (a) **CAC security assessment** (mandatory for CIIOs, processors of 1 million+ individuals' PI, or cumulative transfers exceeding thresholds), (b) **standard contract** filed with provincial CAC office, (c) **personal information protection certification**, or (d) other conditions per laws/regulations.
- **CAC security assessment thresholds:** Mandatory when: the data exporter is a CIIO; the data exporter processes personal information of **1 million+ individuals**; cumulative cross-border transfer since January 1 of the prior year involves PI of **100,000+ individuals** or sensitive PI of **10,000+ individuals**.
- **Standard contract:** For transfers below the security assessment thresholds, the standard contract published by the CAC may be used. Must be filed with the provincial CAC within **10 working days** of the contract taking effect.
- **Data localization:** CIIOs must store personal information within China. Cross-border provision requires a security assessment and must be necessary for business purposes.
- **Consequence:** Unauthorized cross-border transfer — fines up to **RMB 50 million or 5% of annual revenue** for serious violations. Suspension of cross-border data flows. Personal liability for responsible individuals.

### Brazil — LGPD Cross-Border Transfers (Articles 33-36)

- **Mechanisms:** Transfer permitted when the destination country provides adequate protection (as determined by the ANPD), under SCCs approved by the ANPD, BCRs, cooperation agreements between supervisory authorities, or with the data subject's specific and prominent consent.
- **Status:** As of early 2026, the ANPD has not yet finalized its adequacy assessment framework or approved SCCs. Specific consent and contractual clauses remain the primary mechanisms.

### Singapore — PDPA Cross-Border Transfers (Section 26)

- **Mechanism:** The transferring organization must ensure that the overseas recipient is bound by legally enforceable obligations to provide a comparable standard of protection. Achieved through contractual clauses, binding corporate rules, or assurance that the receiving jurisdiction's law provides comparable protection.
- **No adequacy framework:** Singapore does not maintain a formal adequacy list. Assessment is the responsibility of the transferring organization.

### APEC Cross-Border Privacy Rules (CBPR) System

- **What:** A voluntary, accountability-based cross-border data transfer framework among APEC member economies. Participating economies include the US, Japan, South Korea, Canada, Singapore, Australia, Chinese Taipei, Mexico, and the Philippines.
- **How it works:** Organizations self-certify compliance with the CBPR program requirements through APEC-recognized accountability agents. Certification demonstrates that the organization's data privacy practices are consistent with the APEC Privacy Framework.
- **Global CBPR Forum:** In 2022, the CBPR system was relaunched as the Global CBPR Forum, expanding beyond APEC to include the UK and other economies.
- **GDPR interaction:** The EDPB does not currently recognize CBPR certification as an adequate safeguard for GDPR transfers. CBPR may supplement but does not replace SCCs for EU data flows.

### Practical Transfer Mechanism Selection

| Scenario | Recommended Mechanism |
|----------|----------------------|
| EU to self-certified US company | EU-US Data Privacy Framework (verify certification on DPF list) |
| EU to non-DPF US company | SCCs (Module 2 or 3) + TIA + supplementary measures |
| EU to UK | EU adequacy decision (verify current status) |
| EU to Japan, South Korea | Adequacy decision |
| EU to China | SCCs + TIA + supplementary measures (significant compliance burden) |
| Intra-group multinational (EU HQ) | BCRs (if approved) or SCCs for each entity pair |
| China outbound | CAC security assessment (if thresholds met) or filed standard contract |
| US to any jurisdiction | Generally no US-law restriction on outbound transfers; comply with destination country's inbound requirements |

## Interaction with Other Areas

- **International Trade:** Data localization mandates (China, Russia, potentially India) interact with sanctions and export control regimes. US trade restrictions on Chinese entities may complicate CAC security assessment requirements. Data flow provisions in trade agreements (USMCA, EU-Japan EPA) may create additional rights.
- **Corporate:** Intra-group data transfers in multinational corporate structures require mapping of all entity-to-entity flows and ensuring each flow has a valid transfer mechanism. M&A due diligence must assess the target's cross-border data flows and transfer mechanisms.
- **IP and Technology:** Cloud service architecture determines data flow paths. Multi-region cloud deployments may create cross-border transfers even when data is "at rest" in the EEA if support or administration access occurs from outside the EEA.
- **Financial Services:** Financial regulators in some jurisdictions impose additional restrictions on cross-border transfer of financial data (e.g., India's RBI data localization mandate for payment data, China's PBOC restrictions on financial data).

## Sources

- [GDPR Articles 44-49 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) — Cross-border transfer provisions
- [2021 Standard Contractual Clauses — EUR-Lex](https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj) — Commission Implementing Decision 2021/914
- [EDPB Recommendations 01/2020 on Supplementary Measures](https://edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en) — Post-Schrems II transfer guidance
- [EU-US Data Privacy Framework](https://www.dataprivacyframework.gov/) — Self-certification portal and DPF participant list
- [CJEU Schrems II Decision (C-311/18)](https://curia.europa.eu/juris/liste.jsf?num=C-311/18) — Foundational ruling on cross-border transfers
- [UK International Data Transfer Agreement](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/) — ICO guidance and IDTA templates
