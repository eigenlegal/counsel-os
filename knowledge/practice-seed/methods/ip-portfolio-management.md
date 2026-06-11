---
counsel-os-type: practice
content-version: "2026-06-11"
---
# IP Portfolio Management

Reference guide for reviewing the company's intellectual property portfolio, preparing IP for due diligence, conducting licensing reviews, or developing IP protection strategy.

---

## IP Inventory Categories

For each IP category, capture the following fields:

### Patents and Patent Applications
- Issued patents: patent number, title, filing date, issue date, expiration date, jurisdiction, assignee
- Pending applications: application number, filing date, status (prosecution, appeal, abandoned), jurisdiction
- Provisional applications: filing date, expiration of provisional period (12 months from filing)
- Foreign filings: PCT applications, national phase entries, Paris Convention filings
- Classification: core product/technology vs. ancillary or defensive patents

### Trademarks
- Registered marks: registration number, mark, goods/services classes, filing date, registration date, renewal date, jurisdiction
- Pending applications: application number, mark, basis (use, intent-to-use, foreign filing), status
- Common law marks: marks used in commerce but not registered (assess registration priority)
- Foreign registrations: country, registration status, renewal dates
- Domain names: all registered domains, registrar, expiration dates, auto-renewal status

### Copyrights
- Registered copyrights: registration number, title, author, registration date
- Unregistered works: key software, documentation, creative works, marketing materials
- Work-for-hire documentation: verify all employee/contractor works have proper assignment
- Open-source components: list all open-source used in products, with license type (permissive, copyleft, AGPL)

### Trade Secrets
- Key trade secrets: algorithms, customer lists, pricing models, manufacturing processes, business methods
- Protection measures: NDAs, access controls, marking, employee awareness
- Trade secret identification and protection program documentation (required for DTSA and state UTSA claims)

### Licenses (Inbound and Outbound)
- Inbound licenses: technology licensed from third parties (scope, exclusivity, territory, term, fees, assignability)
- Outbound licenses: technology licensed to third parties (scope, exclusivity, territory, term, royalties, termination rights)
- Cross-licenses: mutual license arrangements
- Open-source licenses: compliance obligations for each license type

---

## Maintenance Deadlines

### Patent Maintenance (US)
| Milestone | Timing |
|---|---|
| First maintenance fee | 3.5 years from issue date |
| Second maintenance fee | 7.5 years from issue date |
| Third maintenance fee | 11.5 years from issue date |

- Foreign annuity payments vary by country, typically annual
- Identify patents approaching maintenance deadlines within the next 12 months

### Trademark Maintenance (US)
| Filing | Timing |
|---|---|
| Section 8 Declaration of Use | Between 5th-6th year after registration |
| Section 9 Renewal | Every 10 years from registration |

- Proof of use requirements vary by jurisdiction
- Foreign renewals vary by country (typically 10 years)
- Monitor for marks no longer in use — maintain or abandon based on future plans

### Domain Names
- Set auto-renewal for critical domains
- Distinguish defensive registrations from active use
- Monitor for typosquatting or cybersquatting of key brand domains

### Copyrights
- No maintenance fees required
- Monitor for infringement of key copyrighted works
- Ensure registration is current for works where statutory damages and attorney's fees may be needed

---

## Maintain-or-Abandon Decision Criteria

### Patents
Assess each patent approaching a fee deadline:
- Does this patent protect a current or planned product?
- Does it have licensing value?
- Is it defensive?
- If the answer to all is no, consider allowing it to lapse (cost savings)

### Trademarks
- If a mark has not been used in commerce for 3+ years and there are no plans to resume use, consider abandoning to reduce portfolio costs
- Exception: assess whether the mark has defensive value against competitors

---

## Open-Source License Risk Classification

| Risk Level | License Types | Approval Requirement |
|---|---|---|
| Low (Permissive) | MIT, Apache 2.0 | Auto-approve |
| Moderate (Weak Copyleft) | LGPL | Engineering lead approval |
| High (Strong Copyleft) | GPL, AGPL | Legal approval required |

Conduct periodic audits of open-source usage with scanning tools. Implement an open-source review process for all new dependencies.

---

## Filing Priority Framework

| Priority | Criteria |
|---|---|
| **File immediately** | Core product technology without patent protection; primary brand without trademark registration; any IP asset needed for upcoming licensing, fundraising, or M&A |
| **File within 6 months** | Secondary product features; expansion market trademarks; defensive filings |
| **Monitor only** | Ancillary technology with limited commercial value; marks with no current use plans |

---

## Protection Gap Checklist

- Core technology or products without patent protection — assess patentability
- Key brand names or logos without trademark registration — file applications
- Employee/contractor IP assignment gaps — remediate immediately
- Trade secrets without adequate protection measures — implement NDAs, access controls, exit interview procedures
- Software without copyright registration — register key software before any infringement claim (registration is prerequisite for statutory damages)

---

## Risk Assessment Categories

- **Third-party infringement risk:** Are any products potentially infringing third-party patents? (Freedom-to-operate analysis for key products)
- **Invalidity risk:** Are any key patents vulnerable to challenge? (Prior art analysis)
- **Trade secret exposure:** Have any trade secrets been disclosed without NDA protection?
- **Open-source contamination:** Have any copyleft-licensed components been incorporated into proprietary code in a way that triggers disclosure obligations?
- **Domain disputes:** Are any key domains at risk of challenge under UDRP?

---

## Diligence Preparation

### Sell-Side
- Organize the IP inventory into a diligence-ready format (spreadsheet with all registration details, status, and chain of title)
- Verify chain of title for all registered IP (assignments recorded with USPTO/WIPO)
- Collect all IP assignment agreements from employees and contractors
- Prepare a summary of all IP-related litigation (pending, threatened, settled)
- Identify any IP encumbrances (security interests, liens, exclusive licenses)
- Prepare an open-source audit report

### Buy-Side
- Request the target's complete IP inventory with registration details
- Verify ownership and chain of title for key assets
- Assess freedom-to-operate for the target's core products
- Review all inbound and outbound licenses for assignability and change-of-control provisions
- Identify any IP-related litigation or threatened claims
- Assess open-source usage and compliance
