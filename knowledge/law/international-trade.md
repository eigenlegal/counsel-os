## Overview

# International Trade

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** sanctions, export controls, import controls, embargo, OFAC, SDN list, specially designated nationals, blocked persons, sectoral sanctions, comprehensive sanctions, trade compliance, trade restrictions, export license, deemed export, EAR, Export Administration Regulations, ITAR, International Traffic in Arms Regulations, Commerce Control List, CCL, ECCN, export classification, re-export, deemed re-export, end use, end user, diversion, customs, import duty, tariff, Harmonized Tariff Schedule, HTS, HS classification, country of origin, substantial transformation, free trade agreement, USMCA, customs broker, foreign trade zone, FTZ, duty drawback, antidumping, countervailing duty, AD/CVD, UFLPA, forced labor, antiboycott, boycott, anti-boycott, BIS-621, Arab League boycott, restricted party, denied party, entity list, military end use, dual use, munitions list, defense article, defense service, foreign military sales, CFIUS, FIRRMA, foreign investment, national security review, mandatory filing, TID, critical technology, critical infrastructure, sensitive personal data, mitigation agreement, FCPA, Foreign Corrupt Practices Act, anti-corruption, bribery, foreign official, UK Bribery Act, books and records, facilitating payment, controlled technology, encryption controls, deemed export rule, secondary sanctions, 50% rule, voluntary self-disclosure
**Clause types:** sanctions compliance representations and warranties, export control compliance provisions, restricted party screening obligations, end-use and end-user certifications, anti-diversion clauses, deemed export provisions in employment/contractor agreements, ITAR restrictions on foreign person access, customs and import compliance provisions, customs valuation and classification provisions, antiboycott representations, boycott certification refusals, CFIUS filing obligations, CFIUS closing conditions, reverse break fees (CFIUS), technology transfer restrictions, foreign ownership disclosure, anti-corruption representations and warranties, FCPA compliance covenants, third-party due diligence requirements, books-and-records obligations, anti-bribery certifications, adequate procedures provisions
**Regulatory references:** International Emergency Economic Powers Act (IEEPA), Trading with the Enemy Act (TWEA), OFAC regulations (31 C.F.R. Part 500-599), Export Administration Regulations (EAR, 15 C.F.R. Parts 730-774), International Traffic in Arms Regulations (ITAR, 22 C.F.R. Parts 120-130), Foreign Investment Risk Review Modernization Act (FIRRMA), CFIUS regulations (31 C.F.R. Part 800-802), Customs laws (19 U.S.C.), Tariff Act, 19 U.S.C. Section 1592 (customs penalties), 19 U.S.C. Section 1307 (forced labor imports), Uyghur Forced Labor Prevention Act (UFLPA), Trade Sanctions Reform Act, Antiboycott provisions (EAR Part 760, IRC Section 999), Foreign Corrupt Practices Act (15 U.S.C. Sections 78dd-1 to 78dd-3, 78m, 78ff), UK Bribery Act 2010, EU sanctions regulations, EU Dual-Use Regulation, UK sanctions, Wassenaar Arrangement, Missile Technology Control Regime (MTCR), Nuclear Suppliers Group, Enforce and Protect Act (EAPA)
**Relationship patterns:** US company/foreign counterparty, exporter/foreign buyer, technology licensor/foreign licensee, employer/foreign national employee (deemed export), investor/US company (CFIUS), US company/foreign subsidiary (intra-company transfers), logistics provider/shipper, customs broker/importer, company/foreign agent or distributor (anti-corruption), joint venture partner/state-owned enterprise, acquirer/foreign target with government-facing operations

## Sub-Files

- `sanctions.md` — US and international economic sanctions programs (OFAC). Load when: transactions involve sanctioned countries, blocked persons, SDN/50% Rule screening, sectoral sanctions programs, secondary sanctions exposure, or OFAC compliance frameworks.
- `export-controls.md` — Export control regulations (EAR and ITAR). Load when: controlled technology, software, or technical data is being exported, re-exported, or transferred to foreign persons; deemed export analysis is needed for foreign national employees; encryption classification is required; or Entity List/restricted party screening is at issue.
- `customs.md` — Customs and import compliance. Load when: goods are being imported into the US, HS classification or customs valuation is at issue, country of origin determination is needed, FTZs or duty drawback are being utilized, AD/CVD orders may apply, or UFLPA/forced labor supply chain risks exist.
- `anti-boycott.md` — Anti-boycott compliance (EAR Part 760). Load when: business involves countries maintaining unsanctioned boycotts (primarily Arab League boycott of Israel), letters of credit or commercial documents contain boycott-related language, or boycott participation requests have been received.
- `foreign-investment.md` — Foreign investment review (CFIUS/FIRRMA). Load when: a foreign person is acquiring or investing in a US business, mandatory CFIUS filing triggers may apply (critical technology, critical infrastructure, sensitive personal data), real estate near sensitive facilities is being acquired by foreign persons, or CFIUS mitigation agreements are in effect.
- `anti-corruption.md` — Anti-corruption (FCPA and UK Bribery Act). Load when: transactions involve payments or things of value to foreign government officials, foreign agents/intermediaries/distributors are being engaged, business involves state-owned enterprises, M&A targets have foreign government-facing operations, or anti-bribery compliance programs are being evaluated.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- **Sanctions strict liability**: OFAC sanctions violations are strict liability — transactions with blocked persons or sanctioned jurisdictions are prohibited regardless of knowledge or intent. Civil penalties up to $356,579 per violation (IEEPA); criminal penalties up to $1,000,000 and 20 years imprisonment per willful violation.
- **Export license requirement**: Export of controlled technology, software, or technical data without the required license or license exception is a federal crime under both EAR and ITAR. EAR civil penalties up to $364,992 per violation; ITAR civil penalties up to $1,216,326 per violation. Criminal penalties up to $1,000,000 and 20 years imprisonment.
- **ITAR no de minimis**: ITAR-controlled defense articles and technical data may not be shared with foreign persons (including foreign national employees in the US) without State Department authorization. ITAR has no de minimis exception — any defense article remains ITAR-controlled regardless of incorporation into a larger item.
- **CFIUS unwinding authority**: CFIUS has authority to block pending transactions and recommend the President unwind completed transactions that pose national security concerns, even after closing. Mandatory filings are required for certain transactions involving critical technology, critical infrastructure, or sensitive personal data. Closing without a required mandatory filing carries penalties up to the value of the transaction.
- **Anti-boycott reporting**: US persons must report receipt of requests to participate in unsanctioned foreign boycotts (Form BIS-621) regardless of whether they comply. Failure to report is an independent violation ($250,000 civil / $1,000,000 + 5 years criminal). Participation in prohibited boycott conduct carries the same penalties plus loss of foreign tax credits under IRC Section 999.
- **Deemed export rule**: Sharing controlled technology with foreign nationals within the US constitutes an export to that person's home country under both EAR and ITAR. This cannot be managed solely through employment agreements — actual export control analysis and licensing (if required) must be completed before access is granted.
- **FCPA anti-bribery**: Payments, offers, or promises of anything of value to foreign government officials to obtain or retain business are prohibited, with no minimum threshold. Criminal penalties up to $250,000/$2,000,000 per violation; civil penalties up to $16,000 per violation. Applies to US persons worldwide, SEC issuers worldwide, and any person taking acts in furtherance within the US.
- **FCPA books-and-records**: SEC issuers must maintain accurate books and records and adequate internal accounting controls for their worldwide operations. No materiality threshold — any inaccuracy can violate the provision. Criminal penalties up to $5,000,000/$25,000,000 per knowing violation.
- **Customs strict liability**: Importers of record bear ultimate responsibility for accurate classification, valuation, and country of origin declarations. Penalties under 19 U.S.C. Section 1592 range from 2x unpaid duties (negligence) to 4x (fraud). UFLPA creates a rebuttable presumption prohibiting imports connected to the Xinjiang region.

---
## Anti Boycott

# Anti-Boycott Compliance

## Applicability

Applies when any transaction, agreement, or business activity involves:

- Requests to refuse business with or discriminate against a boycotted country (currently Israel) or its nationals
- Requests to furnish information about business relationships with a boycotted country or blacklisted persons
- Contractual language requiring boycott compliance, boycott certifications, or boycott-related representations
- Letters of credit containing boycott-related conditions (e.g., "goods not of Israeli origin," "vessel must not call at Israeli ports")
- Business with countries maintaining unsanctioned boycotts (primarily Arab League member states participating in the boycott of Israel)
- Import/export transactions where shipping documents, tender documents, or purchase orders contain boycott-related language
- Operations or sales activities in the Middle East, North Africa, or other regions where boycott requests are common

## Key Requirements

### Prohibited Conduct Under EAR Part 760

- **What**: US persons are prohibited from taking or agreeing to take certain actions in support of, or in furtherance of, an unsanctioned foreign boycott. Six categories of prohibited conduct:
  1. **Refusing to do business**: Refusing, or agreeing to refuse, to do business with a boycotted country, or with nationals or residents of a boycotted country, or with any other person, pursuant to an agreement with or requirement of a boycotting country
  2. **Discriminating on the basis of protected characteristics**: Refusing to employ, or otherwise discriminating against, any US person on the basis of race, religion, sex, or national origin in order to comply with a boycott
  3. **Furnishing business relationship information**: Providing information about business relationships with a boycotted country or with blacklisted persons, whether or not the information is requested
  4. **Furnishing personal information**: Providing information about the race, religion, sex, or national origin of any US person
  5. **Implementing boycott-conditioned letters of credit**: Taking action to implement or support a restrictive trade practice or boycott imposed by a foreign country against another country friendly to the US
  6. **Paying, honoring, or confirming letters of credit**: Paying, honoring, confirming, or otherwise implementing letters of credit containing prohibited boycott conditions
- **Threshold/Timeline**: Applies to "US persons" — citizens, residents, domestic concerns, and controlled-in-fact foreign subsidiaries of US companies — in connection with transactions in the "interstate or foreign commerce of the United States." No minimum transaction value. Agreement need not be written — oral agreements and conduct demonstrating compliance are covered
- **Consequence**: Civil penalties up to $250,000 per violation under BIS enforcement; criminal penalties up to $1,000,000 and 5 years imprisonment per willful violation. Each prohibited act (each refusal, each furnishing of information, each letter of credit) is a separate violation

### Reporting Requirements (15 C.F.R. Section 760.5)

- **What**: US persons who receive a request to participate in, comply with, further, or support an unsanctioned foreign boycott must report the request to BIS, regardless of whether they comply with or reject the request. Reportable requests include:
  - Written requests in contracts, purchase orders, letters of credit, bid/tender documents, and shipping instructions
  - Oral requests from business counterparts or government officials in boycotting countries
  - Boycott-related terms in standard form documents (even if the counterparty does not specifically direct compliance)
  - Negative certificates of origin ("goods not of Israeli origin" or "not containing Israeli-origin components")
  - Shipping restrictions ("vessel has not called at Israeli ports within the last 6 months")
  - Blacklist certifications ("manufacturer/supplier is not on the [country's] blacklist")
- **Threshold/Timeline**: Reports filed on Form BIS-621 (Single Transaction Report) or BIS-6051 (Multiple Transaction Report). Filing deadline: end of the month following the calendar quarter in which the request was received. Example: request received January 15 must be reported by April 30
- **Consequence**: Failure to report a boycott request is an independent violation carrying the same penalty structure as engaging in prohibited conduct ($250,000 civil / $1,000,000 + 5 years criminal). Many enforcement actions are based primarily on failure to report rather than substantive boycott compliance. BIS audits specifically test reporting compliance

### Tax Penalties (IRC Section 999)

- **What**: Separate from BIS enforcement penalties, the Internal Revenue Code imposes tax consequences on US taxpayers who participate in or cooperate with an international boycott. Section 999 creates a two-part framework:
  - **Disclosure**: IRS Form 5713 (International Boycott Report) must be filed with the annual tax return by any US person with operations in, or related to, a boycotting country
  - **Penalty**: Three categories of tax benefit denial, proportional to the degree of boycott participation:
    1. Loss of foreign tax credit under IRC Section 908
    2. Loss of tax deferral on earnings of controlled foreign corporations under IRC Section 952
    3. Loss of IC-DISC benefits under IRC Section 995
- **Threshold/Timeline**: Form 5713 due with annual tax return. "Operations" is broadly defined to include sales, purchases, employment, and licensing in boycotting countries. Even companies that reject all boycott requests must report operations in boycotting countries if the operations meet the threshold. Boycotting countries listed annually in IRS guidance
- **Consequence**: Tax penalties often exceed BIS civil penalties in economic impact. Loss of foreign tax credits can be substantial for companies with significant international operations. Double penalty exposure — BIS civil/criminal plus IRS tax penalties — makes anti-boycott compliance uniquely costly when violated

### Exceptions to Prohibited Conduct (EAR Section 760.3)

- **What**: Certain actions are excepted from the anti-boycott prohibitions even if boycott-related:
  1. **Compliance with local law of boycotting country**: A US person physically present in a boycotting country may comply with that country's laws as applied to activities within that country's territory. Does not extend to extraterritorial compliance (e.g., directing US operations to comply from a boycotting country)
  2. **Unilateral selection of suppliers/vendors**: A US person may refuse to do business with any person for legitimate business reasons (quality, price, delivery) so long as the refusal is not pursuant to a boycott agreement or request
  3. **Compliance with import requirements**: Furnishing information regarding the country of origin of goods, or the identity of the manufacturer, supplier, or shipper, is generally permitted when required for customs or regulatory compliance in the boycotting country
  4. **Compliance with shipping document requirements**: Providing certain information in shipping documents (vessel flag, route, origin of goods) as required by the boycotting country for import clearance
- **Threshold/Timeline**: Exceptions are narrowly construed by BIS. The burden is on the US person to demonstrate that the exception applies. Contemporaneous documentation of the business justification for any action that could be perceived as boycott-related is essential
- **Consequence**: Incorrectly relying on an exception constitutes a violation with full penalties. When in doubt, report the request and reject the boycott-related condition

### Common Boycott Request Scenarios and Red Flags

- **What**: Practitioners should be alert to boycott language that commonly appears in:
  - **Letters of credit**: Negative origin certificates, blacklist compliance, vessel routing restrictions
  - **Tender/bid documents**: Requirements to certify compliance with a country's boycott laws or to provide information about subcontractor nationality
  - **Purchase orders and contracts**: Representations that the seller has no business relationships with boycotted countries or persons
  - **Questionnaires and supplier registration forms**: Questions about business operations in boycotted countries, ownership by nationals of boycotted countries, or blacklist status
  - **Shipping instructions**: Vessel restrictions, port call restrictions, boycott-compliant routing requirements
- **Threshold/Timeline**: Each instance is a separately reportable request. Companies in industries with significant Middle East exposure (construction, defense, energy, consumer goods) should implement automated scanning of commercial documents for boycott-related keywords
- **Consequence**: Systematic failure to identify and report boycott requests across multiple transactions constitutes a pattern of violations — aggravating factor in enforcement

### Compliance Program Best Practices

- **What**: Given the unique dual-penalty structure (BIS civil/criminal + IRS tax penalties) and the reporting-focused enforcement approach, anti-boycott compliance requires specific program elements beyond general trade compliance:
  - **Document screening**: Automated scanning of all incoming commercial documents (letters of credit, purchase orders, tender documents, shipping instructions) for boycott-related keywords and phrases. Key terms: "boycott," "blacklist," "Israel," "Arab League," negative origin certificates, vessel routing restrictions
  - **Employee training**: All personnel who review or process commercial documents, letters of credit, or shipping instructions must be trained to recognize boycott requests. Trade finance, procurement, sales, and logistics functions require targeted training
  - **Reporting infrastructure**: Centralized system for collecting, tracking, and reporting boycott requests to BIS. Quarterly reporting deadlines require advance preparation. Maintain records of all reported and unreported requests with compliance analysis
  - **Response protocols**: Pre-approved language for rejecting prohibited boycott conditions in contracts and letters of credit. Standard contract language that proactively addresses anti-boycott requirements in Middle East-facing agreements
  - **Tax coordination**: Ensure IRS Form 5713 is filed timely and consistently with BIS reports. Coordinate between trade compliance and tax departments to avoid inconsistent reporting
- **Threshold/Timeline**: Program should be documented, tested annually, and updated when boycott landscape changes. BIS conducts audits that specifically test screening, reporting, and training adequacy
- **Consequence**: A documented compliance program is a mitigating factor in BIS enforcement. Absence of a program, or a program that exists only on paper, is an aggravating factor. Companies with Middle East operations that lack boycott screening procedures face particularly high enforcement risk

### State Anti-Boycott Laws

- **What**: Several US states have enacted their own anti-boycott laws, some of which prohibit boycotts of Israel beyond the scope of federal law. These state laws may:
  - Prohibit state agencies from contracting with companies that boycott Israel (anti-BDS laws)
  - Require companies bidding on state contracts to certify they are not boycotting Israel
  - Create state-level causes of action for boycott-related discrimination
- **Threshold/Timeline**: Over 35 states have enacted some form of anti-BDS legislation. Requirements vary significantly by state. Companies bidding on state government contracts must check applicable state law requirements
- **Consequence**: Loss of state contract eligibility for companies that participate in boycotts of Israel. State penalties vary but primarily affect government contracting eligibility. First Amendment challenges to some state laws are ongoing in federal courts

## Interaction with Other Areas

- **Sanctions**: Anti-boycott rules are distinct from OFAC sanctions. OFAC administers US-imposed sanctions; anti-boycott rules prohibit participation in foreign-imposed boycotts that are not sanctioned by the US. A country may be both a boycotting country and subject to US sanctions (e.g., Syria — subject to both US comprehensive sanctions and participant in the Arab League boycott)
- **Export Controls**: Anti-boycott provisions are housed within the EAR (Part 760) and enforced by BIS Office of Antiboycott Compliance alongside BIS export control enforcement. A single transaction may trigger export control licensing, sanctions screening, and anti-boycott reporting obligations simultaneously
- **Financial Services**: Letters of credit with boycott conditions are a primary vector for anti-boycott issues. Banks must train trade finance, letter of credit, and documentary collections staff to identify boycott language and refuse prohibited conditions. Bank compliance must coordinate with both OFAC and BIS requirements
- **Corporate (International Operations)**: Companies with subsidiaries or operations in boycotting countries face heightened compliance obligations. "Controlled-in-fact" foreign subsidiaries of US companies are subject to the full scope of anti-boycott prohibitions. Joint ventures with boycotting-country partners create particular risk
- **Employment**: Requests for information about the race, religion, sex, or national origin of employees in connection with a boycott are prohibited and reportable, intersecting with Title VII and employment discrimination law
- **Customs**: Import documentation (certificates of origin, shipping manifests) may contain boycott-related language. Customs compliance personnel should be trained to identify and report boycott requests that appear in trade documentation
- **Anti-Corruption**: Companies operating in boycotting countries may face pressure from government officials to comply with boycott requirements. Such pressure does not create a defense to the anti-boycott prohibitions (the local law exception applies only to activities conducted within the boycotting country's territory)

### Key Distinctions from Sanctions

Anti-boycott compliance is frequently confused with sanctions compliance, but they are distinct regimes:

| Feature | Anti-Boycott (EAR Part 760) | Sanctions (OFAC) |
|---------|---------------------------|-------------------|
| **Purpose** | Prohibit US person participation in foreign-imposed boycotts | Implement US foreign policy through trade restrictions |
| **Enforcing agency** | BIS (Commerce Dept.) | OFAC (Treasury Dept.) |
| **Primary obligation** | Report boycott requests + refuse prohibited conduct | Screen and block transactions with sanctioned targets |
| **Target** | Currently: Arab League boycott of Israel | Multiple country and list-based programs |
| **Strict liability** | No (intent/knowledge element for criminal) | Yes (civil penalties are strict liability) |

## Sources

- BIS Anti-Boycott Regulations: 15 C.F.R. Part 760 (EAR Part 760)
- BIS Office of Antiboycott Compliance: https://www.bis.gov/enforcement/oac
- BIS Anti-Boycott Guidelines and FAQs: https://www.bis.gov/enforcement/oac/anti-boycott-compliance-frequently-asked-questions
- IRS Form 5713 Instructions (International Boycott Report): https://www.irs.gov/forms-pubs/about-form-5713
- IRC Sections 908 (foreign tax credit denial), 952 (CFC deferral denial), 995 (IC-DISC denial), 999 (boycott reporting)
- BIS Annual Report on Anti-Boycott Activities: https://www.bis.gov/enforcement/oac/annual-reports

---
## Anti Corruption

# Anti-Corruption

## Applicability

Applies when any transaction, agreement, or business activity involves:

- Payments, gifts, entertainment, travel, or anything of value to foreign government officials, political parties, or candidates for foreign political office
- Use of agents, intermediaries, consultants, distributors, or joint venture partners in foreign markets who may interact with government officials
- Joint ventures, teaming arrangements, or partnerships with state-owned enterprises or government-connected entities
- M&A transactions involving targets with foreign government-facing operations or operations in high-corruption-risk jurisdictions
- Companies subject to US jurisdiction (US persons, SEC-reporting issuers, or persons taking acts in furtherance within the US) doing business internationally
- Operations in countries with high corruption risk scores (Transparency International Corruption Perceptions Index)
- Companies with UK commercial presence (UK Bribery Act jurisdiction)
- Government procurement, licensing, permitting, or regulatory approval processes in foreign countries

## Key Requirements

### FCPA Anti-Bribery Provisions (15 U.S.C. Sections 78dd-1 to 78dd-3)

- **What**: Prohibit the corrupt payment, offer, promise, or authorization of anything of value to a foreign government official, foreign political party or official thereof, candidate for foreign political office, or official of a public international organization for the purpose of:
  - Influencing any act or decision in the official's capacity
  - Inducing the official to do or omit any act in violation of lawful duty
  - Securing any improper advantage
  - Inducing the official to use influence with a foreign government or instrumentality
  All for the purpose of obtaining or retaining business
- **Threshold/Timeline**: No minimum dollar threshold — any payment, gift, or thing of value can violate the statute. "Anything of value" interpreted broadly: cash, gifts, meals, travel, entertainment, internships or jobs for officials' family members, charitable donations at an official's direction, political/campaign contributions, and below-market transactions. "Foreign official" includes employees of state-owned enterprises (SOEs), sovereign wealth funds, public international organizations (World Bank, UN agencies), and state-controlled universities or hospitals
- **Consequence**: Criminal penalties: individuals up to $250,000 and 5 years imprisonment per violation; entities up to $2,000,000 per violation (or alternatively, twice the gross gain or loss under 18 U.S.C. Section 3571, which often yields substantially higher fines). Civil penalties: up to $16,000 per violation (SEC enforcement, adjusted for inflation). Disgorgement of profits and pre-judgment interest are standard in SEC settlements. Average corporate FCPA resolution has exceeded $100 million in recent years

### FCPA Books-and-Records and Internal Controls (15 U.S.C. Section 78m)

- **What**: Two distinct but related requirements applicable to SEC-reporting "issuers" and their consolidated subsidiaries worldwide:
  - **Books and records**: Make and keep books, records, and accounts which, in reasonable detail, accurately and fairly reflect the transactions and dispositions of assets. "Reasonable detail" means the level of detail that would satisfy prudent officials in the conduct of their own affairs
  - **Internal accounting controls**: Devise and maintain a system of internal accounting controls sufficient to provide reasonable assurances that: (a) transactions are executed in accordance with management's general or specific authorization, (b) transactions are recorded as necessary to permit preparation of financial statements and maintain accountability for assets, (c) access to assets is permitted only with management authorization, (d) recorded accountability for assets is compared with existing assets at reasonable intervals
- **Threshold/Timeline**: No materiality threshold — any inaccuracy in books and records can violate the provision, even if immaterial to the financial statements. Applies to the entire worldwide operations of the issuer and all consolidated subsidiaries, regardless of where located. Internal controls must be designed, implemented, periodically tested, and updated
- **Consequence**: Criminal penalties for knowing circumvention or knowing falsification: individuals up to $5,000,000 and 20 years imprisonment; entities up to $25,000,000. Civil penalties: SEC can seek up to $16,000 per violation plus disgorgement. Books-and-records charges require a lower burden of proof than anti-bribery charges (no need to prove corrupt intent) and are frequently brought alongside or as an alternative to anti-bribery charges

### FCPA Jurisdictional Reach

- **What**: Three categories of persons subject to the FCPA, each with different jurisdictional scope:
  1. **Issuers** (Section 78dd-1): Any company with securities registered under Section 12 or required to file reports under Section 15(d) of the Securities Exchange Act. Applies to conduct anywhere in the world. Officers, directors, employees, agents, and stockholders acting on behalf of issuers are covered
  2. **Domestic concerns** (Section 78dd-2): US citizens, nationals, residents, and any entity organized under US law or with its principal place of business in the US. Applies to conduct anywhere in the world
  3. **Territorial jurisdiction** (Section 78dd-3): Any person (including foreign nationals and entities with no other US nexus) who takes any act in furtherance of a corrupt payment while in the territory of the US — including a single email routed through a US server, a wire transfer through a US correspondent bank, or a phone call from or to the US
- **Threshold/Timeline**: Territorial jurisdiction is expansively interpreted. DOJ has successfully prosecuted foreign nationals who never set foot in the US based on use of the US financial system or electronic communications infrastructure. Parent companies liable for subsidiaries' conduct under agency, conspiracy, aiding-and-abetting, or books-and-records theories
- **Consequence**: Full criminal and civil penalties apply regardless of jurisdictional basis. Conspiracy (18 U.S.C. Section 371) and aiding-and-abetting (18 U.S.C. Section 2) liability further extend reach

### FCPA Exceptions and Affirmative Defenses

- **What**: Two narrow provisions that may protect otherwise-covered conduct:
  1. **Facilitating payments exception**: Payments to foreign officials to expedite or secure the performance of "routine governmental action" — non-discretionary, ministerial acts such as processing visas, scheduling inspections, providing mail/telephone service, loading/unloading cargo, providing police protection. NOT available for any act involving the exercise of discretion, including awarding contracts, granting licenses, or making enforcement decisions
  2. **Bona fide expenditure affirmative defense**: Payments that are reasonable and bona fide expenditures directly related to: (a) the promotion, demonstration, or explanation of products or services, or (b) the execution or performance of a contract with a foreign government or agency. Examples: factory tours for evaluation purposes, travel to product demonstration sites, training on purchased equipment
- **Threshold/Timeline**: Facilitating payments exception is narrowly construed and increasingly disfavored by DOJ. Many companies have eliminated facilitating payments as a matter of policy (and the UK Bribery Act has NO facilitating payment exception). Bona fide expenditure defense requires that the expenditure be reasonable in amount, directly connected to a legitimate business purpose, properly recorded in books and records, and not a pretext for corrupt payments
- **Consequence**: Burden of proof for the affirmative defense (bona fide expenditure) is on the defendant. Over-reliance on the facilitating payments exception is risky — DOJ has stated it will scrutinize claimed facilitating payments closely

### UK Bribery Act 2010

- **What**: Broader than the FCPA in several significant respects:
  - **Section 1**: Active bribery of any person (public or private — covers commercial/private-to-private bribery)
  - **Section 2**: Being bribed (receiving or agreeing to receive a bribe)
  - **Section 6**: Bribery of foreign public officials (similar to FCPA anti-bribery)
  - **Section 7**: "Failure to prevent bribery" — a strict liability corporate offense where a "relevant commercial organisation" is guilty if a person "associated" with it bribes another person to obtain or retain business or an advantage. The ONLY defense is proving "adequate procedures" were in place to prevent bribery
- **Threshold/Timeline**: No minimum value threshold. "Relevant commercial organisation" includes any body corporate or partnership that "carries on a business, or part of a business" in the UK — interpreted broadly to include even minimal UK commercial presence. "Associated person" includes employees, agents, subsidiaries, joint venture partners, and any person performing services for or on behalf of the organization
- **Consequence**: Unlimited fines for corporate offenses (Section 7). Individuals: up to 10 years imprisonment and unlimited fines. Deferred Prosecution Agreements (DPAs) available in the UK for corporate offenders. The "adequate procedures" defense is evaluated against six Ministry of Justice principles: (1) proportionate procedures, (2) top-level commitment, (3) risk assessment, (4) due diligence, (5) communication and training, (6) monitoring and review

### DOJ Corporate Enforcement Policy (CEP)

- **What**: DOJ's framework (formalized in the Justice Manual, Section 9-47.120) provides significant incentives for voluntary self-disclosure, cooperation, and remediation in FCPA matters:
  - **Voluntary self-disclosure (VSD)**: Companies that voluntarily disclose FCPA violations, fully cooperate, and timely remediate receive a presumption of declination (no prosecution) absent aggravating factors (executive involvement, significant profits, recidivism)
  - **Full cooperation**: Disclosure of all relevant facts, identification of all individuals substantially involved, making witnesses available, providing foreign evidence, attributing facts to specific sources
  - **Timely remediation**: Root cause analysis, discipline of responsible personnel, compensation clawback from wrongdoers, compliance program enhancements, selection of compliance monitors (if appropriate)
- **Threshold/Timeline**: VSD must be made before the company has an imminent threat of disclosure or an ongoing government investigation. Cooperation must be ongoing and complete. DOJ expects companies to identify and disclose individual wrongdoers — "individual accountability" is a cornerstone of the policy
- **Consequence**: VSD + full cooperation + timely remediation: presumption of declination, or at minimum a 50%+ reduction below the low end of the US Sentencing Guidelines fine range. No VSD: fine within or above the Guidelines range. Compliance monitors imposed for 2-3 years in many resolutions. DOJ's Whistleblower Awards Pilot Program (August 2024) further incentivizes reporting through financial awards to individual whistleblowers

### Compliance Program Expectations (DOJ/SEC Evaluation Framework)

- **What**: DOJ and SEC evaluate the effectiveness of corporate compliance programs in every FCPA enforcement action using a detailed, three-part framework (updated in DOJ's "Evaluation of Corporate Compliance Programs" guidance):
  - **Part 1 — Design**: Is the program well-designed? Key elements: risk assessment, policies and procedures (gifts/entertainment, travel, third-party management, M&A due diligence, charitable giving, political contributions), code of conduct, training, reporting mechanisms (hotline, non-retaliation policy)
  - **Part 2 — Implementation**: Is the program being applied earnestly and in good faith? Key elements: senior/middle management commitment, autonomy and resources of compliance function, incentive structure, disciplinary enforcement consistency, third-party due diligence execution, data analytics and monitoring
  - **Part 3 — Effectiveness**: Does it work in practice? Key elements: testing and auditing (by compliance, internal audit, or external), continuous improvement based on lessons learned, investigation response protocols, root cause analysis of violations
- **Threshold/Timeline**: Programs evaluated both at the time of the misconduct and at the time of resolution. DOJ guidance (updated March 2023) specifically asks whether the company invests in compliance technology, uses data analytics, and tests its systems. Compliance function must be "adequately resourced and empowered to function effectively"
- **Consequence**: An effective compliance program at the time of misconduct is a significant mitigating factor and can result in declination. A paper program that is not implemented provides no mitigation. Compliance monitors (typically 2-3 year term) may be imposed as part of resolutions when the existing program is deemed insufficient

### Third-Party Risk Management

- **What**: Third parties (agents, consultants, distributors, JV partners, subcontractors) are the vehicle for the majority of FCPA violations. DOJ/SEC expect robust third-party risk management including:
  - Risk-based due diligence before engagement (background checks, beneficial ownership, government connections, anti-corruption track record)
  - Written contracts with anti-corruption representations, audit rights, compliance obligations, and termination rights for violations
  - Ongoing monitoring of third-party activities and payments
  - Periodic re-diligence based on risk level
- **Threshold/Timeline**: Due diligence scope should be proportional to corruption risk (country, industry, government touchpoints, compensation structure). Red flags requiring enhanced diligence: unusual commission structures, cash payment requests, politically-exposed persons as beneficial owners, intermediary is in a different country than end customer, intermediary has no apparent expertise in the relevant industry
- **Consequence**: Companies are liable for corrupt payments made by third parties acting on their behalf, even without actual knowledge, under theories of conscious avoidance, willful blindness, or respondeat superior. Failure to conduct adequate third-party due diligence is an aggravating factor in enforcement

### Other International Anti-Corruption Frameworks

- **What**: Beyond the FCPA and UK Bribery Act, companies operating internationally face anti-corruption obligations under multiple additional frameworks:
  - **OECD Anti-Bribery Convention**: 44 signatory countries with implementing legislation. Requires criminalization of foreign official bribery. OECD Working Group on Bribery monitors compliance
  - **France Sapin II Law (2016)**: Requires companies with 500+ employees and EUR 100M+ revenue to implement anti-corruption compliance programs. French Anti-Corruption Agency (AFA) conducts compliance audits
  - **Brazil Clean Company Act (2014)**: Strict liability for corruption. Existence of a compliance program is a mitigating factor. Leniency agreements available
  - **Local anti-corruption laws**: Virtually every country has domestic anti-bribery laws. Enforcement quality varies, but multi-jurisdictional cooperation (through MLAT, OECD, and informal channels) is increasing
- **Threshold/Timeline**: Companies must comply with all applicable anti-corruption laws in every jurisdiction of operation. Compliance programs should be designed to meet the highest applicable standard (typically UK Bribery Act Section 7 "adequate procedures" standard)
- **Consequence**: Multi-jurisdictional enforcement is increasingly common — the same conduct may result in parallel investigations and penalties in the US, UK, France, Brazil, and other countries. Coordination of global resolutions (through DOJ, SFO, PNF, and other authorities) is now standard practice. Total penalties in coordinated resolutions routinely exceed $1 billion

### Gifts, Entertainment, and Travel

- **What**: Providing gifts, meals, entertainment, or travel to foreign officials requires careful analysis under both the FCPA and local anti-corruption laws. Key considerations:
  - **Business purpose**: Must have a legitimate business connection (product demonstration, contract execution, relationship building)
  - **Reasonable value**: Must be reasonable in the local context. Lavish or extravagant entertainment raises red flags even if there is a business purpose
  - **Transparency**: Must be openly provided and accurately recorded in books and records. No cash or cash equivalents
  - **Approval**: Pre-approval required under most compliance programs. Escalation thresholds should be set by policy (e.g., meals over $150, gifts over $100, any travel)
  - **Frequency**: Repeated provision to the same official raises concerns regardless of individual amounts
  - **Timing**: Gifts/entertainment near a pending government decision (contract award, license renewal, regulatory approval) carry heightened risk
- **Threshold/Timeline**: Company policy should set specific dollar thresholds and approval processes. All gifts, meals, entertainment, and travel provided to government officials must be recorded in a centralized tracking system. DOJ/SEC evaluate the specific facts and circumstances — no safe harbor dollar amount
- **Consequence**: Even small payments can violate the FCPA if made with corrupt intent. Books-and-records violations apply to any inaccurately recorded payment regardless of amount. UK Bribery Act has no value threshold for any offense

## Interaction with Other Areas

- **Sanctions**: Anti-corruption and sanctions frequently overlap — government officials in sanctioned countries may solicit improper payments. Payments to sanctioned persons who are also government officials create dual FCPA and OFAC liability. FCPA-related payments may also violate money laundering statutes
- **Financial Services (KYC/AML)**: Corrupt payments often flow through the financial system. BSA/AML suspicious activity reporting obligations may apply. Bank Secrecy Act SARs frequently trigger FCPA investigations. Politically exposed person (PEP) screening intersects with FCPA compliance
- **Corporate (M&A)**: FCPA successor liability attaches — an acquirer inherits the target's FCPA exposure for pre-acquisition conduct. DOJ expects pre-acquisition anti-corruption due diligence and post-acquisition integration of compliance programs within a reasonable timeframe (12-18 months is common expectation). Failure to conduct FCPA due diligence is an aggravating factor
- **Employment**: Whistleblower protections under Dodd-Frank (SEC) and SOX apply to FCPA reports. Non-retaliation policies are a required compliance program element. DOJ expects compensation clawback from individual wrongdoers. Individual accountability policy means employees face personal criminal liability
- **Data Privacy**: FCPA third-party due diligence and employee monitoring involves processing personal data subject to GDPR and other privacy regimes. Legitimate interest or legal obligation basis typically applies but requires documentation. Cross-border data transfer mechanisms needed for investigations
- **Export Controls**: Companies in regulated industries face both export control and FCPA risk — foreign government end users of controlled technology create dual compliance obligations. ITAR-registered companies with foreign government customers face particularly high FCPA risk
- **International Trade (Customs)**: Payments to foreign customs officials to facilitate clearance, reduce duties, or avoid inspection may constitute FCPA violations. "Facilitating payments" exception is narrow and does not cover payments to influence discretionary customs decisions
- **Consumer Protection**: Corrupt procurement of government contracts may also implicate fraud statutes, False Claims Act liability (for US government contracts), and debarment from government contracting
- **International Trade (Foreign Investment)**: CFIUS review may uncover corruption risks at the target company. Anti-corruption due diligence findings can affect CFIUS national security analysis, particularly when the target has government contracts or security clearances

## Sources

- DOJ FCPA Resource Guide (2020, updated): https://www.justice.gov/criminal/criminal-fraud/fcpa-guidance
- SEC FCPA Enforcement Actions: https://www.sec.gov/enforcement/fcpa-cases
- DOJ Evaluation of Corporate Compliance Programs: https://www.justice.gov/criminal/criminal-fraud/evaluation-corporate-compliance-programs
- DOJ Corporate Enforcement Policy (Justice Manual Section 9-47.120): https://www.justice.gov/criminal/criminal-fraud/corporate-enforcement-policy
- UK Bribery Act 2010 and Ministry of Justice Guidance on Adequate Procedures: https://www.legislation.gov.uk/ukpga/2010/23
- Transparency International Corruption Perceptions Index: https://www.transparency.org/cpi
- FCPA (15 U.S.C. Sections 78dd-1, 78dd-2, 78dd-3, 78m, 78ff)
- DOJ Whistleblower Awards Pilot Program (2024): https://www.justice.gov/criminal/criminal-fraud/whistleblower-awards

---
## Customs

# Customs and Import Compliance

## Applicability

Applies when any transaction, agreement, or business activity involves:

- Importation of goods into the US (including temporary imports, returns, and samples)
- Classification of goods under the Harmonized Tariff Schedule of the United States (HTSUS)
- Determination of customs value, country of origin, or marking requirements
- Use of Foreign Trade Zones (FTZs), duty drawback, or preferential trade agreements (USMCA, etc.)
- Antidumping/countervailing duty (AD/CVD) orders on imported merchandise
- Supply chains with potential exposure to the Uyghur Forced Labor Prevention Act (UFLPA)
- Use of licensed customs brokers for import transactions
- Bonded warehouse or in-transit shipments through the US

## Key Requirements

### HS Classification (19 U.S.C. Section 1484)

- **What**: All imported merchandise must be classified under the Harmonized Tariff Schedule (HTSUS), a 10-digit classification system based on the international Harmonized System (HS). Classification determines the applicable duty rate, quota eligibility, trade agreement preferences, statistical reporting, and applicability of other regulatory requirements (FDA, CPSC, EPA, etc.)
- **Threshold/Timeline**: Classification must be declared at the time of entry filing. Importer of record bears ultimate responsibility for correct classification even when using a customs broker. Binding classification rulings available from CBP via ruling request (typically 30-120 days processing)
- **Consequence**: Misclassification resulting in underpayment: duties owed plus interest, penalties under 19 U.S.C. Section 1592 — negligence: up to 2x the loss of revenue; gross negligence: up to 4x the loss of revenue; fraud: the domestic value of the merchandise. Criminal penalties for fraudulent classification: up to $10,000 and 2 years imprisonment per entry

### Customs Valuation (19 U.S.C. Section 1401a)

- **What**: Customs value is the basis for ad valorem duty calculation. Six valuation methods in order of preference:
  1. **Transaction value**: Price actually paid or payable (primary method, used in ~95% of entries)
  2. **Transaction value of identical merchandise**
  3. **Transaction value of similar merchandise**
  4. **Deductive value**: US selling price minus deductions
  5. **Computed value**: Cost of production plus profit and general expenses
  6. **Fallback method**: Reasonable adjustment of methods 1-5
- **Threshold/Timeline**: Additions to transaction value required for: assists (materials, tools, engineering provided free or below cost by the buyer), royalties and license fees related to imported goods, proceeds of subsequent resale accruing to the seller, packing costs, and selling commissions. Deductions allowed for: international freight (if CIF terms), insurance, and post-importation costs
- **Consequence**: Undervaluation penalties under Section 1592 (same framework as misclassification). CBP Focused Assessment audits frequently target valuation. Transfer pricing between related parties receives heightened scrutiny — must demonstrate arm's-length pricing or use alternative valuation methods

### First Sale Rule

- **What**: When goods pass through one or more middlemen before reaching the US importer, the importer may use the price of the first arm's-length sale (rather than the last sale to the importer) as the transaction value for duty calculation, potentially reducing the dutiable value significantly
- **Threshold/Timeline**: Must demonstrate: (a) the first sale was a bona fide arm's-length transaction, (b) the goods were clearly destined for the US at the time of the first sale, and (c) the first sale price is verifiable. Documentation requirements are substantial — purchase orders, invoices, proof of destination, evidence of separate profit at each level
- **Consequence**: Improper reliance on First Sale Rule: recovery of duty differential plus Section 1592 penalties. CBP closely scrutinizes First Sale claims during audits

### Country of Origin (19 C.F.R. Part 134)

- **What**: Determines applicable duty rates, trade agreement eligibility, marking requirements, and AD/CVD applicability. Two origin frameworks:
  - **Non-preferential origin**: Substantial transformation test — goods must undergo a change in name, character, or use in the country of origin
  - **Preferential origin** (FTAs): Specific rules of origin under each agreement. USMCA requires tariff shift analysis, regional value content calculations, or both depending on the product
- **Threshold/Timeline**: Origin declared at entry. All goods of foreign origin must be marked in English with the country of origin on the article itself (or outermost container if article cannot be marked). USMCA origin certifications: self-certification by importer, exporter, or producer; retain supporting records for minimum 5 years
- **Consequence**: Incorrect origin marking: 10% ad valorem penalty under 19 U.S.C. Section 1304 plus re-delivery or re-marking at importer's expense. False origin claims for FTA preferences: loss of preferential treatment, recovery of full duty differential, plus Section 1592 penalties

### Foreign Trade Zones (19 U.S.C. Sections 81a-81u)

- **What**: Designated areas within the US where foreign and domestic merchandise may be admitted without formal customs entry or duty payment. Key benefits:
  - **Duty deferral**: Duties not owed until goods enter US commerce
  - **Duty elimination**: No duties on goods re-exported from the FTZ
  - **Inverted tariff**: Pay the lower duty rate on finished goods rather than higher rate on components (if components have higher rates)
  - **Quota avoidance**: Quota-restricted goods may be held in FTZ until quota opens
- **Threshold/Timeline**: Must be authorized by the Foreign-Trade Zones Board (Dept. of Commerce). Annual reporting to CBP required. Merchandise admitted under proper FTZ status: privileged foreign, non-privileged foreign, zone-restricted, or domestic
- **Consequence**: Non-compliance with FTZ procedures: potential revocation of FTZ activation, duty liability on all merchandise, and Section 1592 penalties

### Customs Bonds (19 C.F.R. Part 113)

- **What**: Surety bonds guaranteeing payment of duties, taxes, and fees to CBP. Two types:
  - **Single-entry bond**: Covers one import transaction (bond amount = entered value + duties/taxes/fees)
  - **Continuous bond**: Covers all import activity for 12-month period. Required for any importer making more than occasional entries
- **Threshold/Timeline**: Continuous bond amount: generally 10% of duties, taxes, and fees paid in prior 12 months (minimum $50,000). Bond must be in place before goods are released. CBP reviews bond sufficiency periodically and may demand increased bond amounts
- **Consequence**: Insufficient bond: CBP may hold merchandise at the port, require increased bond before release, or refuse entry. Bond claims by CBP for duty shortfalls, liquidated damages for regulatory violations (e.g., failure to redeliver merchandise), or marking violations

### Duty Drawback (19 U.S.C. Section 1313)

- **What**: Refund of up to 99% of duties, taxes, and fees paid on imported merchandise that is subsequently exported or destroyed. Three main types:
  - **Manufacturing drawback**: Imported goods used in US manufacture of exported goods
  - **Unused merchandise drawback**: Imported goods exported in same condition (unused)
  - **Substitution drawback**: Commercially interchangeable goods substituted for the imported goods
- **Threshold/Timeline**: Claims must be filed within 5 years of import date. Must link specific import entries to specific export entries. Claims filed electronically via ACE. TFTEA (2015) simplified drawback calculations and expanded substitution eligibility
- **Consequence**: Failure to document import-export linkage: denial of claim. False or fraudulent drawback claims: treble the drawback amount plus Section 1592 penalties and potential criminal prosecution

### Uyghur Forced Labor Prevention Act (UFLPA)

- **What**: Creates a rebuttable presumption that goods mined, produced, or manufactured wholly or in part in the Xinjiang Uyghur Autonomous Region (XUAR) of China, or by entities on the UFLPA Entity List, are produced with forced labor and prohibited from US importation under 19 U.S.C. Section 1307
- **Threshold/Timeline**: Effective June 21, 2022. Applies to goods with any connection to XUAR supply chains — not just direct imports from XUAR. Includes downstream products containing XUAR-sourced inputs. Burden on the importer to provide "clear and convincing" evidence to rebut the presumption, including complete supply chain mapping and traceability documentation
- **Consequence**: Detention and exclusion of merchandise at the border. Priority enforcement sectors: cotton/textiles, polysilicon/solar panels, tomato products, PVC/plastics, electronics components, and metals/minerals. Release from detention requires substantial documentation that CBP may reject. Rebuttal success rate is low

### Antidumping and Countervailing Duties (AD/CVD) (19 U.S.C. Sections 1673-1677n)

- **What**: Additional duties imposed on imported goods sold in the US at less than fair value (antidumping/AD) or benefiting from foreign government subsidies (countervailing duties/CVD). Initiated by petition from domestic industry or self-initiated by Commerce Department. Final determination by ITA (Commerce) and ITC (injury determination)
- **Threshold/Timeline**: AD/CVD rates can exceed 200%+ on certain products (e.g., Chinese solar cells, steel products). Cash deposits required at the time of entry at the estimated duty rate. Annual administrative reviews may adjust rates retroactively — liquidation of entries may be delayed years while reviews are pending
- **Consequence**: Failure to declare AD/CVD merchandise or pay required cash deposits: Section 1592 penalties. Evasion (e.g., transshipment through third countries to avoid AD/CVD): additional penalties under EAPA (Enforce and Protect Act) — CBP determines evasion within 300 days, with interim measures (suspension of liquidation, cash deposits) within 90 days. Criminal prosecution possible for willful evasion

### Customs Broker Requirements (19 U.S.C. Section 1641)

- **What**: Only licensed customs brokers may conduct customs business on behalf of importers. Brokers owe a duty of care to clients for accurate classification, valuation, and entry. Broker must exercise "responsible supervision and control" over all customs business
- **Threshold/Timeline**: License requires passing a broker examination (pass rate ~10-15%) and background investigation. Brokers must maintain records for 5 years. Power of attorney required from importer to act on its behalf
- **Consequence**: Broker license revocation or suspension for violations. However, using a broker does NOT shift the importer of record's ultimate liability for duties, penalties, or accuracy of entries — importer bears final responsibility

### Reasonable Care Standard (19 U.S.C. Section 1484)

- **What**: Importers must exercise "reasonable care" in making entry, classification, valuation, and other determinations. CBP evaluates reasonable care based on:
  - Importer's familiarity with the nature and characteristics of the imported merchandise
  - Whether the importer obtained and followed competent professional advice (customs broker, trade counsel)
  - Whether the importer maintained adequate records and documentation
  - Whether the importer timely corrected known errors through prior disclosure
- **Threshold/Timeline**: Reasonable care is an ongoing obligation. Importers must stay current with tariff changes, CBP rulings, and regulatory developments. Annual import compliance reviews are a best practice. Prior disclosure of errors (19 U.S.C. Section 1592(c)(4)) before CBP discovery can significantly reduce penalties
- **Consequence**: Meeting the reasonable care standard is a mitigating factor in penalty assessments. Failure to exercise reasonable care supports negligence-level penalties at minimum. Prior disclosure can reduce penalties to 1x the unpaid duty (vs. 2x for negligence or 4x for gross negligence)

## Interaction with Other Areas

- **Export Controls**: HS classification for import purposes differs from ECCN classification for export control purposes; both must be independently determined. Temporary imports under carnet or other programs may trigger re-export obligations under EAR/ITAR
- **Sanctions**: Imports from comprehensively sanctioned countries are prohibited by OFAC regardless of customs treatment. AD/CVD evasion through sanctioned-country transshipment creates dual liability
- **Anti-Corruption**: Payments to foreign customs officials to reduce duties or expedite clearance may violate the FCPA
- **Corporate (Supply Chain)**: UFLPA compliance requires supply chain mapping and traceability, affecting procurement contracts, supplier agreements, and due diligence obligations
- **Financial Services**: Customs bonds involve surety instruments subject to financial regulatory requirements. Duty payments and refunds are significant cash-flow items in international trade
- **Consumer Protection**: Country of origin marking requirements intersect with FTC country-of-origin labeling rules. "Made in USA" claims must satisfy both CBP and FTC standards

## Sources

- CBP Rulings Online Search System (CROSS): https://rulings.cbp.gov
- Harmonized Tariff Schedule (USITC): https://hts.usitc.gov
- UFLPA Strategy and Entity List: https://www.cbp.gov/trade/forced-labor/UFLPA
- CBP Informed Compliance Publications: https://www.cbp.gov/trade/rulings/informed-compliance-publications
- 19 U.S.C. Sections 1304 (marking), 1401a (valuation), 1484 (entry), 1592 (penalties), 1307 (forced labor), 1313 (drawback)
- AD/CVD Orders and Reviews (ITA): https://www.trade.gov/enforcement-and-compliance

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

---
## Foreign Investment

# Foreign Investment Review (CFIUS/FIRRMA)

## Applicability

Applies when any transaction, agreement, or business activity involves:

- Acquisition of a US business by a foreign person (including mergers, asset purchases, stock purchases, and joint ventures)
- Foreign investment in a US business that produces critical technology, operates critical infrastructure, or maintains sensitive personal data of US citizens
- Any transaction that could result in foreign control of a US business
- Non-controlling investments that afford a foreign person access to material non-public technical information, board membership or observer rights, or involvement in substantive decision-making at a TID (technology, infrastructure, data) US business
- Real estate transactions near military installations or other sensitive US government facilities
- Changes in rights of an existing foreign investor that could result in control or expanded access

## Key Requirements

### CFIUS Jurisdiction (50 U.S.C. Sections 4565 et seq.; 31 C.F.R. Parts 800-802)

- **What**: The Committee on Foreign Investment in the United States (CFIUS), an interagency committee chaired by Treasury, reviews transactions that could result in foreign control of, or certain non-controlling foreign investments in, a US business for national security implications. FIRRMA (2018) expanded jurisdiction to include:
  - Controlling acquisitions of any US business by a foreign person
  - Non-controlling investments in TID US businesses where the investor gains specified access rights
  - Real estate transactions near sensitive US government facilities
  - Changes in existing foreign investor rights that trigger new jurisdiction
- **Threshold/Timeline**: No minimum transaction value or ownership percentage threshold for jurisdiction over controlling acquisitions — any level of foreign control triggers review authority. "US business" is broadly defined: any entity engaged in interstate commerce in the US, including startups with no revenue
- **Consequence**: CFIUS can block pending transactions, impose mitigation conditions, or recommend presidential action to unwind completed transactions. Presidential authority is largely unreviewable by courts

### Mandatory Declaration Triggers (31 C.F.R. Section 800.401)

- **What**: Three categories of transactions require a mandatory short-form declaration (approximately 5 pages) before closing:
  1. **Critical technology + US government nexus**: Foreign investment in a US business that produces, designs, tests, manufactures, fabricates, or develops critical technology, where the US business requires or has a license, contract, or other arrangement with a US government agency involving the critical technology
  2. **Critical technology + export control nexus**: Investment where the US business produces critical technology that would require US export authorization (under EAR, ITAR, or other regimes) for the foreign acquirer or its country
  3. **Substantial interest by a foreign government**: A foreign government holds a "substantial interest" (25%+ direct/indirect voting interest) in the foreign acquirer, and the acquirer will obtain a 25%+ voting interest in a TID US business
- **Threshold/Timeline**: Mandatory declaration must be filed at least 30 days before the completion date (closing). "Critical technology" defined by reference to export control lists: ECCN items, USML items, nuclear regulatory items, select agents/toxins, and emerging/foundational technologies designated by Commerce. CFIUS has 30 days to respond to a declaration with one of four outcomes: request a full notice, initiate a unilateral review, inform parties that review is concluded (clearance), or notify that it is unable to conclude review based on the declaration
- **Consequence**: Closing a mandatory-filing transaction without the required declaration: civil penalty up to the value of the transaction. CFIUS retains authority to review the transaction and impose conditions or recommend unwinding retroactively

### Voluntary Notice and Safe Harbor

- **What**: For transactions not subject to mandatory filing, parties may voluntarily file either:
  - **Short-form declaration** (5 pages): Faster, less detailed; CFIUS may request conversion to a full notice
  - **Written notice** (20-50+ pages): Full submission with detailed information about the parties, the transaction, the US business, and national security considerations
- **Threshold/Timeline**: No filing deadline for voluntary submissions. Review timeline for a notice:
  - 45-day initial review period (starts upon acceptance of the notice)
  - 45-day investigation period (if CFIUS identifies unresolved national security concerns)
  - 15-day presidential decision period (if the matter is escalated)
  - CFIUS may withdraw and refile to restart the clock (adds another 45+45 days)
  - Total process: 3-9 months in practice depending on complexity and negotiation of mitigation
- **Consequence**: Voluntary filing provides a "safe harbor" — once CFIUS completes review and concludes action, it generally cannot re-open review of the same transaction absent material misstatement, omission, or changed circumstances. Without the safe harbor, CFIUS retains authority to review and potentially unwind at any point — even years after closing

### Control Analysis

- **What**: "Control" is broadly defined as the power, direct or indirect, whether exercised or not, to determine, direct, or decide important matters affecting a US business. Factors evaluated include:
  - Majority or substantial minority equity ownership
  - Board seats, board observer rights, or board appointment/veto rights
  - Veto or approval rights over key matters (budget, senior management, IP, strategy, dissolution)
  - Contractual rights providing operational decision-making authority (management agreements, license agreements)
  - Debt with equity conversion features or covenants providing functional control
- **Threshold/Timeline**: No bright-line ownership threshold — 10% equity with board seats and strategic veto rights may constitute control, while 45% passive equity without governance rights may not. Assessed case-by-case based on totality of rights. Negative control (veto rights over key decisions) is sufficient to trigger jurisdiction
- **Consequence**: Mischaracterizing a transaction as non-covered when it results in foreign control can lead to post-closing review, mandatory divestiture, and civil penalties up to the transaction value

### TID Non-Controlling Investment Jurisdiction

- **What**: FIRRMA extended CFIUS jurisdiction to certain non-controlling investments in US businesses involved in:
  - **Technology**: Production, design, testing, manufacturing, fabrication, or development of "critical technologies"
  - **Infrastructure**: Ownership, operation, manufacturing, supply, or servicing of "critical infrastructure" (as defined in 31 C.F.R. Part 800 Appendix A — includes telecommunications, energy, water, financial services, and transportation)
  - **Data**: Maintenance or collection of "sensitive personal data" of US citizens
- **Threshold/Timeline**: Jurisdiction triggered when the foreign investor gains at least one of: (a) access to material non-public technical information (MNPTI), (b) a board seat or observer right, or (c) involvement in substantive decision-making regarding the TID business. Sensitive personal data threshold: identifiable data on 1,000,000+ persons, or certain categories (genetic, biometric, financial, health, precise geolocation, government-issued IDs) on any number of persons
- **Consequence**: Non-controlling TID investments are subject to the same review process and remedies as controlling acquisitions — including blocking, mitigation, and unwinding authority

### Mitigation Agreements

- **What**: CFIUS conditions approval on the parties executing a National Security Agreement (NSA), Network Security Agreement, or other mitigation agreement. Common mitigation provisions include:
  - Board composition requirements (US citizen independent directors with security clearances)
  - Appointment of a Security Director/Officer (US citizen, security-cleared)
  - Technology and information firewalls between the US business and foreign parent
  - Data protection and localization requirements
  - Restrictions on facility access for foreign persons
  - Supply chain continuity and US government priority supply obligations
  - US government audit and inspection rights
  - Annual compliance reporting to CFIUS monitoring agencies
- **Threshold/Timeline**: Negotiated during the review/investigation period. Must typically be executed before CFIUS concludes its review. Compliance is ongoing and monitored (usually by DOJ, DOD, or DHS depending on the industry). Mitigation agreements can remain in effect indefinitely
- **Consequence**: Breach of a mitigation agreement: civil penalties up to $250,000 per violation or the value of the transaction (whichever is greater), injunctive relief, or recommendation for presidential action to unwind. CFIUS has increasingly pursued enforcement for mitigation breaches

### Excepted Investors and Transactions

- **What**: Foreign investors from designated "excepted foreign states" (currently Australia, Canada, New Zealand, United Kingdom) may qualify for exceptions from mandatory declaration requirements and non-controlling TID investment jurisdiction, provided the investor meets criteria:
  - Not subject to relevant foreign government direction
  - No relevant compliance violations in the prior 10 years
  - 75%+ of board seats and 75%+ of voting interest held by nationals of excepted foreign states or the US
- **Threshold/Timeline**: Exception applies only to non-controlling TID investments and mandatory declarations — controlling acquisitions remain fully reviewable regardless of investor nationality. Exception status must be verified at the time of the transaction
- **Consequence**: Incorrectly claiming excepted investor status does not create safe harbor and the transaction remains subject to full CFIUS jurisdiction. The excepted foreign state list is reviewed periodically and can change

### Real Estate Transactions (31 C.F.R. Part 802)

- **What**: Foreign purchases, leases (with a term exceeding a specified duration), or concessions of certain US real estate near sensitive government facilities. Covered sites listed in 31 C.F.R. Part 802 Appendix A include military installations, intelligence community facilities, and ranges/testing areas
- **Threshold/Timeline**: Proximity thresholds vary by site and are defined in the regulations. Certain exceptions apply: urbanized areas near airports (with some exceptions), single housing units, commercial office space leases under certain conditions, and real estate in FTZs. Leases under 2 years are generally exempt
- **Consequence**: Same remedies as other covered transactions: blocking, mitigation, presidential unwinding. Real estate CFIUS reviews are less common but increasing in national security-sensitive areas

### Penalties and Enforcement

- **What**: CFIUS enforcement has increased significantly since FIRRMA. Key penalty authorities:
  - **Failure to file mandatory declaration**: Civil penalty up to the value of the transaction
  - **Material misstatement or omission**: Civil penalty up to $250,000 per violation. Intentional or grossly negligent material misstatements may void the safe harbor, allowing CFIUS to re-open review
  - **Breach of mitigation agreement**: Civil penalty up to $250,000 per violation or the value of the transaction (whichever is greater). Injunctive relief available. CFIUS may recommend presidential action
  - **Violation of presidential order**: Civil penalty up to $250,000 per violation. Criminal penalties available for willful violations
  - **Interim measures**: CFIUS can require a standstill during review (no integration, no access to sensitive assets)
- **Threshold/Timeline**: DOJ enforces CFIUS penalties on behalf of Treasury. Statute of limitations not established — CFIUS retains authority indefinitely absent safe harbor. Enforcement actions have increased since 2020 with dedicated DOJ resources
- **Consequence**: Beyond monetary penalties, CFIUS enforcement results in forced divestiture (the most severe remedy), operational restrictions, and reputational harm. Companies that fail to file or violate mitigation agreements face existential business risk

### Practical Considerations for Transaction Structuring

- **What**: Several transaction structuring approaches can mitigate CFIUS risk or simplify the review process:
  - **Governance limitations**: Structuring the investment so the foreign person has no board seat, no MNPTI access, and no substantive decision-making authority may avoid TID jurisdiction for non-controlling investments
  - **Passive investment**: Truly passive investments (under 10% voting interest with no additional governance rights) in non-TID businesses are generally not covered
  - **Carve-outs**: Divesting or segregating TID-sensitive assets before the transaction may reduce CFIUS concerns
  - **Pre-filing engagement**: Informal consultation with CFIUS staff before filing can help identify potential issues and structure the filing for efficient review
  - **Reverse break fees**: Appropriate allocation of regulatory risk through reverse break fees protects the seller if CFIUS blocks the transaction
- **Threshold/Timeline**: Pre-filing engagement is informal and non-binding but can significantly reduce review time. Transaction agreements should allocate sufficient time for CFIUS review (minimum 75-90 days; 6+ months for complex cases with mitigation negotiation)
- **Consequence**: Thoughtful transaction structuring can make the difference between CFIUS clearance and blocking. However, structuring specifically designed to evade CFIUS jurisdiction (e.g., nominee arrangements, staged acquisitions) may be treated as evasion and subject to enhanced scrutiny

## Interaction with Other Areas

- **Corporate (M&A)**: CFIUS is a critical closing condition in cross-border M&A. Transaction agreements should address: CFIUS filing obligations and cooperation covenants, regulatory timeline accommodations, reverse break fees for CFIUS-blocked transactions, interim operating covenants during review, and allocation of mitigation costs
- **Export Controls**: Critical technology triggering mandatory CFIUS filing is defined by export control classifications. Post-closing, foreign person access to controlled technology at the acquired US business may require deemed export licenses independent of CFIUS clearance
- **Sanctions**: Foreign acquirers from sanctioned countries or with sanctioned beneficial owners face near-certain CFIUS blocking. Sanctions screening is a prerequisite to any CFIUS analysis
- **Data Privacy**: Sensitive personal data of US citizens (1,000,000+ persons, or specified categories) triggers TID jurisdiction. Data security and localization provisions in mitigation agreements intersect with GDPR, state privacy laws, and sector-specific data regulations
- **IP and Technology**: Technology transfer to foreign parent post-closing may constitute deemed exports requiring licenses. Mitigation agreements typically include technology firewall provisions restricting foreign parent access to the US subsidiary's most sensitive technology
- **Securities**: CFIUS filing may trigger SEC disclosure obligations. Material CFIUS risk should be disclosed in public company filings (10-K risk factors, 8-K material events). HSR Act filing is a separate requirement that often runs concurrently with CFIUS review

## Sources

- CFIUS Regulations (31 C.F.R. Parts 800-802): https://home.treasury.gov/policy-issues/international/the-committee-on-foreign-investment-in-the-united-states-cfius
- FIRRMA (Foreign Investment Risk Review Modernization Act of 2018): 50 U.S.C. Sections 4565 et seq.
- CFIUS Filing Guidance and FAQs: https://home.treasury.gov/policy-issues/international/the-committee-on-foreign-investment-in-the-united-states-cfius/cfius-filing-guidance
- CFIUS Annual Reports to Congress: https://home.treasury.gov/policy-issues/international/the-committee-on-foreign-investment-in-the-united-states-cfius/cfius-reports
- DOJ CFIUS Enforcement and Penalty Guidelines: https://www.justice.gov/nsd/cfius
- Treasury CFIUS Case Studies and Precedent: Published presidential orders (e.g., Ralls Corp., Aixtron, Qualcomm/Broadcom)

---
## Sanctions

# US and International Sanctions

## Applicability

Applies when any party to a transaction, agreement, or business relationship has a nexus to:

- Countries or regions subject to comprehensive US sanctions (Cuba, Iran, North Korea, Syria, Crimea/Donetsk/Luhansk)
- Countries or regions subject to targeted/sectoral US sanctions (Russia, Venezuela, Belarus, Myanmar, others)
- Persons or entities on OFAC restricted party lists (SDN, SSI, NS-MBS, FSE, CAPTA, NS-PLC)
- Transactions involving the US financial system, US-origin goods, or US persons (including US companies and their foreign branches)
- Non-US companies with US touchpoints (secondary sanctions exposure)
- Financial institutions processing US-dollar-denominated transactions

## Key Requirements

### Comprehensive Sanctions Programs

- **What**: Prohibit virtually all transactions with the sanctioned country/region, including imports, exports, financial transactions, investment, and services. Current comprehensive programs: Cuba (TWEA-based), Iran, North Korea, Syria, and Crimea/Donetsk/Luhansk regions of Ukraine
- **Threshold/Timeline**: Zero tolerance — any transaction involving a comprehensively sanctioned jurisdiction is prohibited absent a specific or general license. No de minimis value exception
- **Consequence**: Civil penalties up to $356,579 per violation under IEEPA (adjusted annually for inflation); criminal penalties up to $1,000,000 and 20 years imprisonment per willful violation under IEEPA; $90,895 per violation under TWEA (Cuba)

### SDN List and Targeted Sanctions

- **What**: Block all property and interests in property of Specially Designated Nationals; prohibit all transactions with SDNs. Other lists impose more targeted restrictions: Sectoral Sanctions Identifications (SSI) List, Non-SDN Menu-Based Sanctions (NS-MBS) List, Foreign Sanctions Evaders (FSE) List, Non-SDN Palestinian Legislative Council (NS-PLC) List, CAPTA List
- **Threshold/Timeline**: Strict liability — no intent or knowledge required. Property must be blocked (frozen) immediately upon identification. US financial institutions must file a blocked property report with OFAC within 10 business days
- **Consequence**: Same IEEPA penalties as comprehensive programs. Each transaction or failure to block is a separate violation. Pattern of violations demonstrates systemic compliance failure

### 50% Rule

- **What**: An entity that is 50% or more owned, directly or indirectly, by one or more SDNs is itself considered blocked, even if the entity is not separately listed on the SDN list. Ownership interests of multiple SDNs are aggregated
- **Threshold/Timeline**: 50% ownership threshold. Must trace both direct and indirect ownership. If SDN A owns 30% and SDN B owns 25%, the entity is blocked (55% aggregate). Applies to ownership at every level of the corporate chain
- **Consequence**: Transacting with a 50%-owned entity carries the same penalties as transacting directly with an SDN. Compliance programs must include beneficial ownership analysis, not just list screening

### Sectoral Sanctions (e.g., Russia SSI List)

- **What**: Prohibit specific categories of transactions rather than blocking all property. Russia program (E.O. 13662) operates through four Directives:
  - Directive 1: New debt >14 days maturity and new equity for specified financial sector entities
  - Directive 2: New debt >60 days maturity for specified energy sector entities
  - Directive 3: New debt >30 days maturity for specified defense/intelligence sector entities
  - Directive 4: Provision of goods, services, or technology for deepwater, Arctic offshore, or shale projects for specified energy sector entities
- **Threshold/Timeline**: Restrictions apply to new transactions only (not pre-existing obligations, unless separately sanctioned). Debt tenor measured from issuance, not maturity
- **Consequence**: Same IEEPA penalties. Sectoral violations are assessed under the same enforcement framework

### General and Specific Licenses

- **What**: OFAC authorizes otherwise-prohibited transactions through two mechanisms:
  - General licenses: Self-executing authorizations published in regulations for defined categories of transactions. No application required. Examples: GL for personal remittances to Cuba, GL for certain informational materials, wind-down GLs after new designations
  - Specific licenses: Case-by-case authorizations granted upon application to OFAC. Required when no general license covers the transaction
- **Threshold/Timeline**: Specific license processing: 90-120 days typical; no statutory timeline. General licenses effective immediately upon publication. License conditions must be strictly followed
- **Consequence**: Engaging in a transaction outside the scope of a license (including violating any license condition) constitutes an unauthorized transaction with full penalties

### Screening Obligations

- **What**: No express statutory mandate to screen, but OFAC's strict liability framework creates a de facto obligation. Screen all counterparties, customers, vendors, beneficial owners, and transaction parties against OFAC's Consolidated Screening List (CSL)
- **Threshold/Timeline**: Screen at onboarding, at each transaction, periodically during the relationship, and within 24-48 hours of any OFAC list update. Automated screening recommended for high-volume operations. Manual review required for potential matches (fuzzy matching, aliases, alternate transliterations)
- **Consequence**: Failure to screen does not mitigate liability — strict liability attaches regardless. However, absence of a screening program is an aggravating factor under the OFAC Enforcement Guidelines. Presence of a risk-based screening program is a mitigating factor

### Voluntary Self-Disclosure (VSD)

- **What**: OFAC strongly encourages voluntary self-disclosure of apparent violations. Effective October 2023 policy update: OFAC may pursue "aggravated" treatment for non-egregious cases where a VSD was not filed when warranted
- **Threshold/Timeline**: No express deadline, but prompt disclosure upon discovery is expected. VSD should include: description of the apparent violation, root cause analysis, internal investigation findings, remedial measures taken, and value of transactions involved. Delays weaken the mitigating value
- **Consequence**: VSD is the most significant mitigating factor — can reduce civil monetary penalties by up to 50%. Non-disclosure when warranted is now an aggravating factor. Criminal referrals are less likely when VSD is filed

### OFAC Compliance Framework (Framework for OFAC Compliance Commitments)

- **What**: OFAC expects five essential components in a sanctions compliance program:
  1. **Management commitment**: Senior leadership support, adequate resourcing, authority for compliance function
  2. **Risk assessment**: Identification and evaluation of sanctions risk based on customers, products, services, and geographies
  3. **Internal controls**: Policies, procedures, and processes to identify, interdict, escalate, and report potentially prohibited transactions
  4. **Testing and auditing**: Independent testing of the compliance program, including screening system validation
  5. **Training**: Role-based training for all relevant personnel, updated regularly
- **Threshold/Timeline**: No formal certification required. Risk assessment should be updated annually and upon material business changes. Training frequency should be commensurate with risk
- **Consequence**: Root cause of violations assessed against these five pillars. Systemic deficiencies in any component are aggravating factors. Robust programs are significant mitigating factors in penalty calculations

### Secondary Sanctions

- **What**: Certain programs impose sanctions risk on non-US persons for engaging in specified transactions with sanctioned targets, even without a US nexus. Key secondary sanctions regimes:
  - Iran: CISADA, IFCA, E.O. 13846 — target non-US financial institutions, petroleum transactions, and other sectors
  - Russia: CAATSA Sections 228-235 — target defense/intelligence transactions, energy pipelines, and other sectors
  - North Korea: NKSPEA — target significant transactions with North Korean persons
- **Threshold/Timeline**: Non-US persons may be designated as SDNs or face restrictions on US correspondent/payable-through accounts. No safe harbor threshold — assessment is based on significance of the transaction
- **Consequence**: Loss of access to US financial system. Potential SDN designation of the non-US person. Non-US banks face particular risk due to dollar-clearing exposure

### EU, UK, and Multilateral Sanctions

- **What**: Separate regimes with different scope, targets, and administration:
  - EU sanctions: Implemented via Council Regulations, directly applicable in all member states. Enforced by national competent authorities
  - UK sanctions: Administered by OFSI (Office of Financial Sanctions Implementation) under the Sanctions and Anti-Money Laundering Act 2018
  - UN sanctions: Binding on all member states, though implementation varies
  - EU Blocking Statute (Regulation 2271/96): Prohibits EU persons from complying with certain extraterritorial US sanctions (creates direct conflict)
- **Threshold/Timeline**: EU and UK list updates may diverge from OFAC. Entities operating across jurisdictions must screen against all applicable regimes independently
- **Consequence**: UK OFSI civil penalties up to the greater of GBP 1,000,000 or 50% of the estimated breach value. EU penalties set by member states (vary widely). EU Blocking Statute non-compliance penalties also set by member states

### Penalty Calculation Framework (OFAC Enforcement Guidelines)

- **What**: OFAC applies a structured penalty framework considering:
  - **Base penalty**: Determined by whether the case is "egregious" or "non-egregious" based on factors including willfulness/recklessness, awareness of conduct, harm to sanctions program objectives, individual characteristics of the violator (commercial sophistication, compliance program), and cooperation with OFAC
  - **General factors**: Aggravating factors include willful or reckless conduct, concealment, pattern of violations, management involvement, and causing significant harm. Mitigating factors include VSD, compliance program, cooperation, remediation, and no prior violations
  - **Economic benefit**: OFAC considers the economic benefit to the violator from the prohibited transactions
- **Threshold/Timeline**: Non-egregious cases: penalty capped at the statutory maximum or the applicable schedule amount (based on transaction value), whichever is lower. Egregious cases: penalty can reach the statutory maximum. OFAC may also issue cautionary letters, finding of violation (no monetary penalty), or no-action letters for minor apparent violations
- **Consequence**: Understanding the penalty framework is critical for VSD cost-benefit analysis and enforcement defense. The difference between egregious and non-egregious classification, combined with VSD credit, can reduce penalties by 75% or more

### Common Contract Provisions

- **What**: Key sanctions-related contract provisions that should be addressed in international agreements:
  - Sanctions compliance representations and warranties (not an SDN, not 50%-or-more owned by SDNs, not located in sanctioned jurisdictions)
  - Ongoing screening and compliance covenants requiring counterparties to maintain compliance programs
  - Notification obligations upon sanctions designation or material change in sanctions exposure
  - Termination rights triggered by sanctions designation of counterparty or changes in sanctions programs
  - Anti-diversion and end-use clauses preventing goods/services from reaching sanctioned destinations
  - Payment routing provisions requiring use of compliant channels through the US financial system
  - Sanctions carve-outs in force majeure provisions (sanctions compliance is a legal obligation, not a force majeure event)
  - Indemnification provisions addressing sanctions-related losses (noting that compliance with sanctions cannot be indemnified against)
- **Threshold/Timeline**: Representations should be given at signing, closing, and on an ongoing/periodic basis. Screening obligations should specify frequency and scope. Termination rights should be exercisable without penalty
- **Consequence**: Absence of adequate sanctions provisions in commercial agreements creates regulatory risk and may impair the ability to terminate or modify relationships when sanctions change

## Interaction with Other Areas

- **Export Controls**: Sanctions and export controls are distinct regimes. A BIS export license does not satisfy OFAC requirements, and vice versa. Both must be cleared independently for any transaction
- **Financial Services (KYC/AML)**: OFAC screening is a mandatory component of BSA/AML compliance for financial institutions. SARs may be required for transactions with a sanctions nexus even if ultimately permitted
- **Corporate (M&A)**: Sanctions due diligence in cross-border M&A must cover historical dealings, current counterparty exposure, 50% Rule ownership analysis, and target's compliance program adequacy
- **Data Privacy**: Screening personal data against sanctions lists must comply with GDPR and other privacy laws; legitimate interest or legal obligation basis typically applies but requires DPIA documentation
- **Anti-Corruption**: Sanctions and anti-corruption intersect when government officials of sanctioned countries are involved; FCPA analysis may also be required
- **IP and Technology**: Technology licensing and SaaS agreements must include sanctions compliance provisions and may require geo-blocking for comprehensively sanctioned jurisdictions
- **Employment**: Foreign national employees from sanctioned jurisdictions may require OFAC licenses for certain employment-related transactions. Sanctions screening must be applied to all new hires and vendors
- **Anti-Boycott**: Sanctions and anti-boycott are distinct regimes with separate enforcement agencies (OFAC vs. BIS). A country may be subject to both US sanctions and be a participant in a foreign boycott (e.g., Syria). Both regimes must be analyzed independently

## Sources

- OFAC Sanctions Programs and Information: https://ofac.treasury.gov/sanctions-programs-and-information
- OFAC Enforcement Guidelines (31 C.F.R. Part 501, Appendix A): https://ofac.treasury.gov/civil-penalties-and-enforcement-information
- OFAC Framework for Compliance Commitments (May 2019): https://ofac.treasury.gov/media/16331/download
- OFAC Consolidated Sanctions List: https://ofac.treasury.gov/consolidated-sanctions-list-non-sdn-lists
- IEEPA (50 U.S.C. Sections 1701-1706)
- OFAC FAQs on the 50% Rule: https://ofac.treasury.gov/faqs/topic/1526
- EU Consolidated Sanctions List: https://www.sanctionsmap.eu
