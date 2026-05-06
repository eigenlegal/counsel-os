---
counsel-os-type: law-area
content-version: "2026-04-08"
jurisdiction: [us-federal, us-state, network-rules, industry-standard]
---
## Fintech

# Fintech Regulation

## Applicability

Load when the matter involves fintech company regulatory strategy, bank-fintech partnerships, BaaS arrangements, regulatory sandboxes, special purpose charters, embedded finance, multi-state licensing strategy, or open banking/data access.

## Key Requirements

### OCC Special Purpose National Bank Charter

- **What:** The OCC has authority to grant special purpose national bank (SPNB) charters, including to fintech companies. The charter would allow nationwide operation without state-by-state licensing for certain activities.
- **Threshold:** Applicants must meet the same core requirements as traditional national banks: capital adequacy, a comprehensive business plan, experienced management, compliance infrastructure, and CRA commitments.
- **Status:** The OCC fintech charter has faced legal challenges (Conference of State Bank Supervisors v. OCC). The program's availability remains uncertain, and no fintech company has successfully obtained a SPNB charter as of the current date.
- **Industrial Loan Company (ILC):** Alternative path — certain states (notably Utah, Nevada) charter ILCs that provide FDIC-insured deposit-taking ability without being subject to Federal Reserve bank holding company oversight. Several fintech companies have obtained ILC charters.
- **Consequence:** Operating as an unlicensed fintech providing banking services without a charter or valid partnership arrangement exposes the company to state enforcement actions.

### Regulatory Sandboxes

- **What:** Several US states and some federal agencies have established regulatory sandbox programs allowing companies to test innovative financial products with temporary, reduced regulatory requirements.
- **Threshold:** Participation typically requires application, consumer protection commitments, reporting obligations, and time/customer limits.
- **State programs:** Arizona (first US sandbox, 2018), Utah, Wyoming, Nevada, West Virginia, Kentucky, and others have enacted sandbox legislation. Scope and eligibility vary significantly.
- **Federal:** CFPB no-action letter policy and compliance assistance sandbox (status has fluctuated with administration changes). OCC responsible innovation framework.
- **Consequence:** Sandbox participation does not eliminate all regulatory obligations. Companies must plan for full compliance at sandbox expiration.

### Embedded Finance and BaaS

- **What:** Embedded finance integrates financial services (payments, lending, insurance, banking) into non-financial platforms and products via APIs and bank partnerships.
- **BaaS regulatory model:** The fintech provides the customer interface and technology; the bank provides the charter, regulatory infrastructure, and (in theory) compliance oversight.
- **Regulatory expectations:** Regulators require the bank to maintain meaningful control over the customer relationship, compliance programs, and risk management — not merely serve as a "charter rental." The bank must be able to demonstrate it controls underwriting, pricing, and compliance for programs offered through its charter.
- **Middleware providers:** BaaS middleware/infrastructure companies that sit between banks and fintechs are increasingly subject to regulatory scrutiny. Banks must ensure they have visibility through middleware layers.
- **Consequence:** Enforcement actions against BaaS banks have included consent orders requiring program wind-downs, growth restrictions, civil money penalties, and in some cases de facto prohibition on new fintech partnerships until compliance concerns are resolved.

### Multi-State Licensing

- **What:** Non-bank fintech companies offering lending, money transmission, or other regulated financial services must obtain licenses in each state where they operate.
- **NMLS (Nationwide Multistate Licensing System):** Centralized platform for license applications, renewals, and reporting. Used for money transmission, mortgage, and certain consumer lending licenses.
- **Timeline:** Full multi-state licensing (all 50 states) typically takes 12 to 24 months. Some states have processing backlogs exceeding 12 months.
- **Cost:** Total multi-state licensing costs (application fees, bonds, legal, compliance) typically range from $500,000 to $2,000,000+ depending on the license types needed.
- **Uniformity efforts:** MSB licensing harmonization through NMLS has improved but significant state-by-state variation remains in definitions, exemptions, and examination practices.
- **Consequence:** Operating without required state licenses subjects the company to cease-and-desist orders, civil penalties, and potential criminal liability. License applications may require disclosure of prior unlicensed activity.

### True Lender and Predominant Economic Interest

- **What:** In bank-fintech lending partnerships, regulators and courts examine whether the bank or the fintech is the "true lender" of the loans originated through the program.
- **Key factors:** Which entity funds the loans, which entity holds the predominant economic interest (including through immediate purchase agreements), which entity sets underwriting criteria and pricing, and which entity markets to borrowers.
- **OCC true lender rule:** The OCC issued a rule (12 C.F.R. 7.1031) providing that a national bank is the true lender if it is named as lender in the loan agreement or funds the loan. This rule was overturned by Congressional Review Act resolution in June 2021.
- **State actions:** Multiple state AGs have challenged bank-fintech lending partnerships, arguing the fintech is the true lender and therefore subject to state usury and licensing laws.
- **Consequence:** If the fintech is deemed the true lender, it loses the benefit of bank charter preemption for usury and licensing. Loans may be subject to state usury caps, potentially rendering them void or requiring interest refunds.

### No US Open Banking Mandate

- **What:** Unlike the EU (PSD2/PSD3) and UK (Open Banking), the US does not have a comprehensive federal open banking mandate requiring banks to share customer data with third parties via APIs.
- **CFPB Section 1033:** Dodd-Frank Section 1033 grants consumers the right to access their financial data. The CFPB finalized its Personal Financial Data Rights rule in 2024, establishing standards for data sharing, but implementation is phased and scope is narrower than PSD2.
- **Screen scraping:** In the absence of a mandate, fintech companies have relied on screen scraping (credential-based data access). Banks have pushed back, citing security concerns. The industry is transitioning toward tokenized API access.
- **Consequence:** Data access disputes between banks and fintechs remain common. The evolving regulatory framework creates uncertainty for business models reliant on account data aggregation.

## Interaction with Other Areas

- **Financial Services (Banking Regulation):** Bank partnerships and charter options are central to fintech regulatory strategy. See `banking-regulation.md`.
- **Financial Services (Lending):** Bank-fintech lending partnerships must comply with TILA, ECOA, fair lending, and state usury laws. See `lending.md`.
- **Financial Services (Payments):** Fintech payment products may require money transmission licenses. See `payments-money-transmission.md`.
- **Financial Services (Cryptocurrency):** Crypto-fintech products face layered regulatory requirements. See `cryptocurrency.md`.
- **Consumer Protection:** Fintech consumer products are subject to CFPB UDAAP authority and state consumer protection laws.
- **Data Privacy:** Data aggregation, screen scraping, and open banking raise GLBA, CCPA, and FCRA issues.

## Sources

- OCC Responsible Innovation: https://www.occ.treas.gov/topics/responsible-innovation/index-responsible-innovation.html
- FDIC: https://www.fdic.gov/regulations
- CFPB Fintech: https://www.consumerfinance.gov/data-research/research-reports/?topics=fintech
- NMLS: https://www.nmls.org
- CFPB Section 1033 Rulemaking: https://www.consumerfinance.gov/rules-policy/rules/required-rulemaking-personal-financial-data-rights/

---
