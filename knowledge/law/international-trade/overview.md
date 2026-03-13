# International Trade

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** sanctions, export controls, import controls, embargo, OFAC, SDN list, specially designated nationals, blocked persons, sectoral sanctions, comprehensive sanctions, trade compliance, trade restrictions, export license, deemed export, EAR, Export Administration Regulations, ITAR, International Traffic in Arms Regulations, Commerce Control List, CCL, ECCN, export classification, re-export, deemed re-export, end use, end user, diversion, customs, import duty, tariff, Harmonized Tariff Schedule, HTS, country of origin, free trade agreement, USMCA, customs broker, foreign trade zone, antiboycott, boycott, restricted party, denied party, entity list, military end use, dual use, munitions list, defense article, defense service, foreign military sales, CFIUS, foreign investment, national security, controlled technology, encryption controls, deemed export rule
**Clause types:** sanctions compliance representations and warranties, export control compliance provisions, restricted party screening obligations, end-use and end-user certifications, anti-diversion clauses, deemed export provisions in employment/contractor agreements, ITAR restrictions on foreign person access, customs and import compliance provisions, antiboycott representations, CFIUS filing obligations, technology transfer restrictions, foreign ownership disclosure
**Regulatory references:** International Emergency Economic Powers Act (IEEPA), Trading with the Enemy Act (TWEA), OFAC regulations (31 C.F.R. Part 500-599), Export Administration Regulations (EAR, 15 C.F.R. Parts 730-774), International Traffic in Arms Regulations (ITAR, 22 C.F.R. Parts 120-130), Foreign Investment Risk Review Modernization Act (FIRRMA), CFIUS regulations (31 C.F.R. Part 800-802), Customs laws (19 U.S.C.), Tariff Act, Trade Sanctions Reform Act, Antiboycott provisions (EAR Part 760, IRC Section 999), EU sanctions regulations, EU Dual-Use Regulation, UK sanctions, Wassenaar Arrangement, Missile Technology Control Regime (MTCR), Nuclear Suppliers Group
**Relationship patterns:** US company/foreign counterparty, exporter/foreign buyer, technology licensor/foreign licensee, employer/foreign national employee (deemed export), investor/US company (CFIUS), US company/foreign subsidiary (intra-company transfers), logistics provider/shipper, customs broker/importer

## Sub-Files

- `sanctions.md` — US and international economic sanctions programs. Load when: transactions involve sanctioned countries, blocked persons, sectoral sanctions programs, or OFAC compliance is at issue.
- `export-controls.md` — Export control regulations (EAR and ITAR). Load when: controlled technology, software, or technical data is being exported, re-exported, or transferred to foreign persons, or when export classification is needed.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- OFAC sanctions are strict liability — transactions with blocked persons or sanctioned jurisdictions are prohibited regardless of knowledge or intent. Penalties can exceed $300,000 per violation (civil) and include criminal penalties of up to $1M and 20 years imprisonment per willful violation.
- Export of controlled technology, software, or technical data without the required license or license exception is a federal crime under the EAR and ITAR, with penalties including imprisonment and substantial fines.
- ITAR-controlled defense articles and technical data may not be shared with foreign persons (including foreign national employees in the US) without State Department authorization. This cannot be waived by contract.
- CFIUS has authority to unwind completed transactions that pose national security concerns, even after closing. Mandatory filings are required for certain transactions involving critical technology, critical infrastructure, or sensitive personal data.
- Antiboycott compliance is required — US persons must report requests to participate in unsanctioned foreign boycotts and are prohibited from complying with certain boycott-related requests.
- "Deemed export" rules apply to sharing controlled technology with foreign nationals within the US, including employees; this cannot be managed solely through employment agreements.
