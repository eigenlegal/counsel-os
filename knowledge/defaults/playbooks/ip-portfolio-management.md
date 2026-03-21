# IP Portfolio Management Playbook

## When to Use
Use this playbook when reviewing the company's intellectual property portfolio, preparing IP for due diligence (buy-side or sell-side), conducting a licensing review, or developing a comprehensive IP protection strategy. This covers patents, trademarks, copyrights, trade secrets, and domain names.

## Prerequisites
- Access to IP registration records (USPTO, WIPO, domain registrars, copyright office)
- Current IP inventory or asset register (if one exists)
- Load `knowledge/law/ip-and-technology/` sub-files for the relevant IP types
- IP counsel (internal or outside patent/trademark counsel) available for specialized questions
- Budget and business strategy context (which products/markets are priorities?)
- Employee and contractor IP assignment agreements on file
- Open-source usage inventory (if applicable)

## Process

### Step 1: Inventory All IP Assets
Conduct a comprehensive inventory across all IP categories:

**Patents and Patent Applications:**
- Issued patents: patent number, title, filing date, issue date, expiration date, jurisdiction, assignee
- Pending applications: application number, filing date, status (prosecution, appeal, abandoned), jurisdiction
- Provisional applications: filing date, expiration of provisional period (12 months from filing)
- Foreign filings: PCT applications, national phase entries, Paris Convention filings
- Identify patents covering core products/technology vs. ancillary or defensive patents

**Trademarks:**
- Registered marks: registration number, mark, goods/services classes, filing date, registration date, renewal date, jurisdiction
- Pending applications: application number, mark, basis (use, intent-to-use, foreign filing), status
- Common law marks: marks used in commerce but not registered. Assess registration priority.
- Foreign registrations: country, registration status, renewal dates
- Domain names: all registered domains, registrar, expiration dates, auto-renewal status

**Copyrights:**
- Registered copyrights: registration number, title, author, registration date
- Unregistered works: key software, documentation, creative works, marketing materials
- Work-for-hire documentation: verify all employee/contractor works have proper assignment
- Open-source components: list all open-source used in products, with license type (permissive, copyleft, AGPL)

**Trade Secrets:**
- Identify key trade secrets: algorithms, customer lists, pricing models, manufacturing processes, business methods
- Assess protection measures: NDAs, access controls, marking, employee awareness
- Document trade secret identification and protection program (required for DTSA and state UTSA claims)

**Licenses (Inbound and Outbound):**
- Inbound licenses: technology licensed from third parties (scope, exclusivity, territory, term, fees, assignability)
- Outbound licenses: technology licensed to third parties (scope, exclusivity, territory, term, royalties, termination rights)
- Cross-licenses: mutual license arrangements
- Open-source licenses: compliance obligations for each license type

### Step 2: Assess Maintenance Obligations
For each registered IP asset, verify maintenance is current:

**Patent Maintenance:**
- Maintenance fee schedule: 3.5 years, 7.5 years, 11.5 years from issue date (US)
- Foreign annuity payments: vary by country, typically annual
- Identify patents approaching maintenance deadlines within the next 12 months
- **Decision — Maintain or Abandon:** For each patent approaching a fee deadline, assess: Does this patent protect a current or planned product? Does it have licensing value? Is it defensive? If the answer to all is no, consider allowing it to lapse (cost savings).

**Trademark Maintenance:**
- Section 8 Declaration of Use: due between 5th-6th year after registration (US)
- Section 9 Renewal: due every 10 years from registration (US)
- Proof of use requirements: varies by jurisdiction
- Foreign renewals: vary by country (typically 10 years)
- Monitor for marks that are no longer in use — maintain or abandon based on future plans
- **Decision — Maintain or Abandon:** If a mark has not been used in commerce for 3+ years and there are no plans to resume use, consider abandoning to reduce portfolio costs. But assess whether the mark has defensive value against competitors.

**Domain Name Maintenance:**
- Renewal dates for all domains (set auto-renewal for critical domains)
- Identify domains that are defensive registrations vs. active use
- Monitor for typosquatting or cybersquatting of key brand domains

**Copyright Maintenance:**
- No maintenance fees required for copyrights
- Monitor for infringement of key copyrighted works
- Ensure registration is current for works where statutory damages and attorney's fees may be needed

### Step 3: Evaluate Licensing Revenue and Exposure
Assess the financial dimension of the IP portfolio:

**Licensing Revenue:**
- Total annual licensing revenue by asset/program
- License compliance: are licensees meeting their obligations (royalty reporting, usage limits, territory restrictions)?
- Audit rights: exercise audit rights for material licenses where compliance is uncertain
- Identify under-monetized assets: patents or trademarks that could be licensed but are not

**Licensing Exposure:**
- Total annual licensing expense (inbound licenses)
- Identify licenses approaching expiration or renewal — negotiate early
- Assess assignability of key inbound licenses (critical for M&A scenarios). Load `positions/assignment-change-of-control.md`.
- Identify any "change of control" triggers in inbound licenses that would affect an acquisition
- Open-source compliance exposure: identify any copyleft-licensed components in proprietary products that could create forced disclosure obligations

### Step 4: Identify Gaps and Risks
Assess portfolio completeness against the company's products, technology, and business strategy:

**Protection Gaps:**
- Core technology or products without patent protection — assess patentability and filing priority
- Key brand names or logos without trademark registration — file applications for priority marks
- Employee/contractor IP assignment gaps — any employees or contractors who have not signed IP assignment agreements? Remediate immediately.
- Trade secrets without adequate protection measures — implement or strengthen NDAs, access controls, exit interview procedures
- Software without copyright registration — register key software before any infringement claim arises (registration is a prerequisite for statutory damages)

**Risk Assessment:**
- Third-party infringement risk: are any of our products potentially infringing third-party patents? (Freedom-to-operate analysis for key products)
- Invalidity risk: are any of our key patents vulnerable to challenge? (Prior art analysis)
- Trade secret exposure: have any trade secrets been disclosed without NDA protection?
- Open-source contamination: have any copyleft-licensed components been incorporated into proprietary code in a way that triggers disclosure obligations?
- Domain disputes: are any of our key domains at risk of challenge under UDRP?

**Decision — Filing Priority:**
- **File immediately:** Core product technology without patent protection; primary brand without trademark registration; any IP asset needed for upcoming licensing, fundraising, or M&A
- **File within 6 months:** Secondary product features; expansion market trademarks; defensive filings
- **Monitor only:** Ancillary technology with limited commercial value; marks with no current use plans

### Step 5: Develop Protection Strategy
Based on the inventory and gap analysis, build a forward-looking IP strategy:

**Patent Strategy:**
- Identify invention disclosures in the pipeline and assess patentability
- Prioritize filings based on: commercial value, defensive value, enforceability, cost
- Establish an invention disclosure program (regular engineering reviews, incentives for disclosures)
- Consider design patents for distinctive product UI/UX elements
- Establish a foreign filing strategy based on key markets and competitor locations

**Trademark Strategy:**
- Register core marks in all active markets and planned expansion markets
- Monitor trademark clearance for new product/feature names before launch
- Implement a trademark watch service for key marks (monitor new applications that may conflict)
- Enforce against infringers: demand letters, TTAB opposition, UDRP complaints for domain disputes

**Trade Secret Strategy:**
- Implement or strengthen a trade secret protection program:
  - Classification system for confidential information
  - Access controls (physical and electronic)
  - NDA requirements for all employees, contractors, and business partners
  - Exit interview procedures including trade secret reminders
  - Regular employee training on trade secret obligations
- Document the protection measures (required for enforcement under DTSA)

**Open-Source Strategy:**
- Implement an open-source review process for all new dependencies
- Classify licenses by risk: permissive (MIT, Apache 2.0 — low risk), weak copyleft (LGPL — moderate risk), strong copyleft (GPL, AGPL — high risk)
- Establish approval requirements: permissive (auto-approve), weak copyleft (engineering lead approval), strong copyleft (legal approval required)
- Conduct periodic audits of open-source usage with scanning tools

### Step 6: Prepare for Diligence (If Applicable)
If the IP review is in preparation for M&A due diligence or financing:

**Sell-Side Preparation:**
- Organize the IP inventory into a diligence-ready format (spreadsheet with all registration details, status, and chain of title)
- Verify chain of title for all registered IP (assignments recorded with USPTO/WIPO)
- Collect all IP assignment agreements from employees and contractors
- Prepare a summary of all IP-related litigation (pending, threatened, settled)
- Identify any IP encumbrances (security interests, liens, exclusive licenses)
- Prepare an open-source audit report

**Buy-Side Review:**
- Request the target's complete IP inventory with registration details
- Verify ownership and chain of title for key assets
- Assess freedom-to-operate for the target's core products
- Review all inbound and outbound licenses for assignability and change-of-control provisions
- Identify any IP-related litigation or threatened claims
- Assess open-source usage and compliance
- Reference `playbooks/due-diligence.md` for the complete DD process

## Output Format
1. **IP Inventory Report:** Comprehensive list of all IP assets by category, with registration details, status, and maintenance dates
2. **Maintenance Calendar:** All upcoming deadlines for the next 12 months (fees, renewals, filings)
3. **Gap Analysis:** Identified protection gaps with priority ratings and recommended actions
4. **Risk Assessment:** Third-party infringement risk, invalidity risk, open-source exposure
5. **IP Strategy Memo:** Forward-looking protection strategy with budget estimates and timeline
6. **Diligence Package:** (If applicable) Organized materials ready for disclosure

## Calibration
- **Simple:** Periodic portfolio review for a small company (<20 registered assets). Target: 1-2 weeks.
- **Standard:** Portfolio review with gap analysis and strategy development for a mid-sized company (20-100 registered assets). Target: 3-6 weeks.
- **Complex:** Full portfolio review in preparation for M&A, IPO, or major licensing program. Large portfolio (100+ registered assets), cross-border filings, open-source audit required. Target: 2-3 months. Engage outside IP counsel for specialized analysis.
