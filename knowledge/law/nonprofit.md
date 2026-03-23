## Overview

# Nonprofit Law

## Trigger Conditions

Load this area when the matter involves:
- **Keywords**: nonprofit, 501(c)(3), tax-exempt, charity, foundation, donation, endowment, UBIT
- **Document types**: articles of incorporation (nonprofit), bylaws, gift agreements, grant agreements, fiscal sponsorship agreements, Form 990, fundraising contracts
- **Scenarios**: forming tax-exempt organization, charitable solicitation, endowment management, board governance, unrelated business income

## Sub-Topic Triggers

| Sub-Topic File | Load When |
|---|---|
| `tax-exempt-status.md` | Formation, 501(c)(3)/(c)(4)/(c)(6) status, Form 1023, Form 990, revocation risk |
| `charitable-solicitation.md` | Fundraising, donor solicitation, professional fundraiser, state registration |
| `donor-restrictions.md` | Gift agreements, restricted funds, endowment, UPMIFA, cy pres |
| `unrelated-business-income.md` | Revenue activities, UBIT, IRC 512-514, debt-financed income, SILO rules |
| `nonprofit-governance.md` | Board structure, conflicts of interest, executive compensation, intermediate sanctions |

## Interaction with Other Areas

- **Corporate**: entity formation, governance structures, fiduciary duties
- **Data Privacy**: donor data protection, fundraising platform compliance
- **Employment**: nonprofit-specific exemptions, ministerial exception
- **Securities**: charitable gift annuities, pooled income funds

---
## Charitable Solicitation

# Charitable Solicitation

## Applicability

Applies to any nonprofit organization soliciting charitable contributions from the public, including direct mail, telephone, online, and in-person solicitation. Covers state registration requirements, professional fundraiser obligations, and donor disclosure rules.

## Key Requirements

### State Registration

- **Registration Requirement** / 41 states plus DC require registration before soliciting contributions from residents of that state / **Consequence**: Soliciting without registration = cease and desist orders, civil penalties ($1K-$25K per violation depending on state), potential criminal penalties
- **Unified Registration Statement (URS)** / Accepted by approximately 37 states; streamlines multi-state registration / **Timeline**: Initial registration typically 30-60 days; annual renewal required
- **Exemptions** / Most states exempt religious organizations, organizations raising <$25K (threshold varies $5K-$50K by state), educational institutions, hospitals, and membership organizations soliciting only members / **Consequence**: Claiming exemption improperly = same penalties as failure to register
- **Financial Thresholds** / Some states require audited financials above certain revenue levels (e.g., NY: >$750K requires independent audit; CA: >$2M requires audit) / **Consequence**: Failure to file required financials = registration denial or revocation

### Solicitation Disclosure Requirements

- **State Disclosure Statements** / Many states require specific disclosure language in solicitation materials (e.g., financial information, registration number, percentage of contribution used for charitable purpose) / **Consequence**: Non-compliant solicitation materials = penalties and registration jeopardy
- **Online Solicitation** / Charleston Principles (NASCO): registration required if organization specifically targets residents of a state through its website or receives contributions from state residents on a repeated and ongoing basis / **Consequence**: Website solicitation subjects organization to multi-state registration

### Professional Fundraiser Requirements

- **Professional Fundraiser Registration** / Most states require separate registration for professional fundraisers (paid solicitors) and fundraising counsel / **Timeline**: Must register before commencing solicitation; bond required in many states ($5K-$50K)
- **Written Contract** / Many states require written contract between nonprofit and professional fundraiser, filed with the state / **Consequence**: Absence of contract = violation; some states void unregistered contracts
- **Percentage Disclosure** / Several states require disclosure to donors of the percentage of contribution retained by the professional fundraiser / **Consequence**: Failure to disclose = civil penalties; potential fraud claims

### Federal Disclosure Requirements

- **Quid Pro Quo Contributions** / Organization must provide written disclosure statement for any contribution >$75 where goods or services are provided in return; must inform donor that deduction is limited to amount exceeding fair market value of goods/services / **Consequence**: $10 penalty per contribution, up to $5K per fundraising event or mailing
- **Gift Acknowledgment** / Donors need contemporaneous written acknowledgment for any single contribution of $250 or more; must state whether goods/services were provided and their value / **Consequence**: Donor cannot claim charitable deduction without proper acknowledgment; no direct penalty to organization but reputational risk
- **Substantiation** / Organization must provide written substantiation for non-cash contributions >$250; Form 8283 (appraisal required for non-cash gifts >$5K) / **Consequence**: Donor deduction disallowed without proper substantiation
- **Form 990 Disclosure** / Schedule B (contributor information) must be filed but is not publicly disclosed for most organizations (except 527 political organizations and private foundations) / **Consequence**: Failure to file = incomplete return penalties

### Donor Privacy and Data

- **Donor Lists** / Donor information is generally not public; organizations should protect donor data / **Consequence**: Unauthorized disclosure may violate state privacy laws and donor trust
- **Do Not Contact** / Must honor donor requests to cease solicitation; compliance with state and federal telemarketing rules (Telephone Consumer Protection Act, FTC Telemarketing Sales Rule) / **Consequence**: TCPA violations: $500-$1,500 per call; FTC penalties up to $50K per violation

### Internet and Social Media Fundraising

- **Platform Obligations** / Third-party fundraising platforms (GoFundMe, Facebook Fundraisers) may trigger registration requirements for the platform and/or the beneficiary nonprofit / **Consequence**: Registration obligations may shift depending on state law and platform structure
- **Crowdfunding** / Charitable crowdfunding may be subject to state charitable solicitation laws; distinction between charitable and non-charitable crowdfunding matters / **Consequence**: Mischaracterization may trigger consumer protection and fraud claims

## Interaction with Other Areas

- **Data Privacy** (`data-privacy/`): donor data collection and storage subject to CCPA, state privacy laws
- **Consumer Protection** (`consumer-protection/`): deceptive solicitation practices subject to FTC Act and state UDAP statutes
- Cross-reference: `tax-exempt-status.md` for Form 990 filing requirements
- Cross-reference: `donor-restrictions.md` for restricted gift handling

## Sources

- [IRS Publication 1771 — Charitable Contributions: Substantiation and Disclosure](https://www.irs.gov/publications/p1771)
- [National Association of State Charities Officials (NASCO)](https://www.nasconet.org/)
- [Unified Registration Statement](https://www.multistatefiling.org/)
- [FTC Telemarketing Sales Rule](https://www.ftc.gov/legal-library/browse/rules/telemarketing-sales-rule)

---
## Donor Restrictions

# Donor Restrictions

## Applicability

Applies to nonprofit organizations receiving restricted gifts, managing endowments, and navigating donor intent. Governs the legal framework for restricted vs. unrestricted contributions, endowment spending, and modification of donor restrictions.

## Key Requirements

### Classification of Contributions

- **Unrestricted Gifts** / Donor imposes no limitations on use; organization has full discretion / **Consequence**: Must still be used for exempt purposes; misuse = potential loss of tax-exempt status
- **Temporarily Restricted** / Donor specifies purpose or time restriction (e.g., "for scholarships in 2026") / **Consequence**: Organization must honor restriction; use for other purposes = breach of fiduciary duty, potential fraud
- **Permanently Restricted (Endowment)** / Donor intends principal to be maintained in perpetuity; only income/appreciation may be spent per donor terms / **Consequence**: Spending principal without authorization = breach of donor restriction; potential AG enforcement action
- **Implied Restrictions** / Solicitation materials may create implied restrictions even absent formal gift agreement / **Consequence**: Courts may enforce restrictions based on how funds were solicited (e.g., "donate to our building fund")

### UPMIFA — Uniform Prudent Management of Institutional Funds Act

- **Adoption** / Enacted in 49 states plus DC (Pennsylvania has not adopted; uses its own statute) / **Consequence**: Governs endowment management for charities in adopting jurisdictions
- **Prudent Spending Standard** / Institution must act in good faith, with care of an ordinarily prudent person, considering: (1) duration and preservation of the fund, (2) purposes of the institution, (3) general economic conditions, (4) possible effect of inflation/deflation, (5) expected total return, (6) other resources, (7) investment policy / **Consequence**: Imprudent spending = personal liability for board members; AG enforcement
- **7% Presumptive Ceiling** / Appropriation of more than 7% of fair market value (using a 3-year trailing average or longer) is presumed imprudent; rebuttable presumption / **Consequence**: Board bears burden of proving prudence for distributions exceeding 7%
- **Spending Below 7%** / Spending at or below 7% is not automatically prudent — board must still consider the 7 factors / **Consequence**: Even spending within the presumption requires documented analysis
- **Release or Modification of Restrictions** / Donor consent (preferred); if donor unavailable, court approval required for funds with restrictions; for small/old funds (<$25K and >20 years in many states), institution may modify with 60-day notice to AG / **Consequence**: Unauthorized modification = breach; AG standing to enforce

### Cy Pres Doctrine

- **Application** / When a donor's original charitable purpose becomes impossible, impracticable, or wasteful, court may redirect funds to a similar charitable purpose / **Threshold**: Must demonstrate original purpose cannot be fulfilled; general charitable intent by donor / **Consequence**: Court-ordered modification; AG typically must be notified and may participate
- **Near Cy Pres (Administrative Deviation)** / Court may modify administrative terms (investment restrictions, distribution methods) without changing charitable purpose / **Threshold**: Changed circumstances making original terms impractical / **Consequence**: Easier standard than full cy pres; does not require impossibility

### Variance Power

- **Community Foundation Variance Power** / Community foundations may retain variance power allowing them to redirect restricted funds if original purpose becomes unnecessary, incapable of fulfillment, or inconsistent with charitable needs / **Consequence**: Enables community foundations to maintain public charity status; donors relinquish ultimate control
- **Donor-Advised Funds** / Donors may make recommendations but cannot exercise legal control; sponsoring organization has legal discretion / **Consequence**: Donor advisory privilege only; excessive donor control may jeopardize fund's tax treatment (IRC 4966-4967)

### Donor Standing and Enforcement

- **Donor Standing** / Historically, donors lack standing to enforce gift restrictions (only AG has standing); trend toward expanded donor standing in some jurisdictions / **Consequence**: Donors may include express standing provisions in gift agreements
- **Attorney General Oversight** / State AG has parens patriae authority to enforce charitable trusts and restricted gifts / **Consequence**: AG may investigate, sue for accounting, seek removal of fiduciaries, or obtain injunctive relief
- **Gift Agreement Best Practices** / Clear written agreements specifying: purpose, spending authority, variance provisions, reporting obligations, standing provisions / **Consequence**: Ambiguous terms invite litigation; court construes ambiguity against organization in some jurisdictions

### Accounting Standards

- **ASC 958 (FASB)** / Contributions classified as with donor restrictions or without donor restrictions (eliminated "temporarily" and "permanently" restricted categories as of 2018) / **Consequence**: Financial statements must properly classify; misclassification = audit findings, potential fraud
- **Release of Restrictions** / Restrictions released when purpose is fulfilled or time restriction expires; must be reported in financial statements / **Consequence**: Premature release = misstated financials; potential breach of donor intent

## Interaction with Other Areas

- **Corporate** (`corporate/`): board fiduciary duties in managing restricted funds
- **Securities** (`securities/`): pooled income funds and charitable remainder trusts may implicate securities law
- Cross-reference: `tax-exempt-status.md` for endowment-related Form 990 disclosures
- Cross-reference: `nonprofit-governance.md` for board duties in fund management

## Sources

- [Uniform Prudent Management of Institutional Funds Act (UPMIFA)](https://www.uniformlaws.org/committees/community-home?CommunityKey=043b9067-a7a0-4320-8066-e3a80f5e51cf)
- [FASB ASC 958 — Not-for-Profit Entities](https://asc.fasb.org/topic&trid=2175466)
- [Restatement (Third) of Trusts — Charitable Trusts](https://www.ali.org/publications/show/trusts/)
- [IRS IRC Section 4966-4967 — Donor-Advised Funds](https://www.law.cornell.edu/uscode/text/26/4966)

---
## Nonprofit Governance

# Nonprofit Governance

## Applicability

Applies to the governance of nonprofit organizations, including board fiduciary duties, conflicts of interest, executive compensation, and regulatory oversight. Governs the legal obligations of directors, officers, and key employees under state nonprofit corporation statutes and federal tax law.

## Key Requirements

### Fiduciary Duties

- **Duty of Care** / Directors must act in good faith, with the care an ordinarily prudent person in a like position would exercise under similar circumstances; entitled to rely on information and opinions from officers, counsel, and committees / **Consequence**: Breach = personal liability for resulting losses; business judgment rule provides protection for informed, good-faith decisions
- **Duty of Loyalty** / Directors must act in the interest of the organization, not their own personal or financial interest; must disclose all material conflicts / **Consequence**: Breach = transactions voidable by organization; personal liability for profits obtained; potential removal
- **Duty of Obedience** / Directors must ensure the organization acts in accordance with its mission, charter, bylaws, and applicable law / **Consequence**: Breach = AG enforcement action; court-ordered compliance; potential dissolution in extreme cases
- **Enhanced Scrutiny** / Transactions involving self-dealing, mergers, dissolution, or transfer of substantially all assets may trigger enhanced scrutiny beyond business judgment / **Consequence**: Board must demonstrate entire fairness or obtain independent approval

### Conflicts of Interest

- **Policy Requirement** / Form 990 asks whether organization has a written conflicts of interest policy (Part VI, Line 12a); while not legally mandated by IRS, absence raises red flags / **Consequence**: No policy = increased IRS scrutiny; potential issues with state regulators and donors
- **Disclosure Obligation** / Directors and officers must disclose any financial interest in transactions involving the organization / **Threshold**: Interest is "material" if a reasonable person would consider it important in deciding how to vote / **Consequence**: Failure to disclose = voidable transaction; personal liability; removal from board
- **Recusal** / Conflicted director must recuse from deliberation and vote on the conflicted transaction / **Consequence**: Participation in vote = presumption of self-dealing; transaction may be voidable
- **Annual Disclosure Statements** / Best practice (and required by many state AGs): annual written disclosure of all interests, relationships, and affiliations that could create conflicts / **Consequence**: Creates documented record; protects organization in enforcement actions

### Executive Compensation — Intermediate Sanctions (IRC 4958)

- **Excess Benefit Transaction** / Transaction in which an economic benefit provided to a disqualified person (officers, directors, key employees, substantial contributors, family members, controlled entities) exceeds the value of consideration received by the organization / **Threshold**: Compensation exceeding what comparable organizations pay for similar services / **Consequence**: Excise taxes on the disqualified person (not the organization)
- **Initial Excise Tax** / 25% of the excess benefit amount, imposed on the disqualified person who received the excess benefit / **Timeline**: Tax imposed per transaction; self-assessed on Form 4720
- **Additional Excise Tax** / 200% of the excess benefit if not corrected within the taxable period (from date of transaction to earlier of: date of deficiency notice, date assessed, or date corrected) / **Consequence**: Disqualified person must return the excess benefit plus interest
- **Organization Manager Tax** / 10% of the excess benefit (up to $20K per transaction) on any organization manager who knowingly participated in the transaction / **Consequence**: Joint and several liability among participating managers
- **Rebuttable Presumption of Reasonableness** / Compensation is presumed reasonable if: (1) approved by independent board/committee (no conflict of interest), (2) based on appropriate comparability data (compensation surveys, IRS Form 990 data from comparable organizations), (3) contemporaneously documented (within 60 days of decision) / **Consequence**: Shifts burden of proof to IRS to demonstrate excess benefit; strongest available protection

### Board Independence and Composition

- **Independent Directors** / Best practice: majority of board should be independent (no financial interest, employment, or family relationship with organization or its officers) / **Consequence**: IRS and state regulators scrutinize board independence; lack of independence = heightened scrutiny of transactions
- **Board Size** / Minimum set by state law (typically 1-3 directors minimum); best practice: 7-15 members for operating nonprofits / **Consequence**: Too small = governance risk and lack of oversight; too large = difficulty achieving quorum and effective deliberation
- **Term Limits** / Not legally required but recommended by governance standards; typical: 2-3 consecutive terms of 3 years each / **Consequence**: Perpetual boards without rotation face stagnation and increased conflict risk
- **Committees** / Audit committee, compensation committee, and governance/nominating committee recommended; Form 990 asks about committees / **Consequence**: Absence of appropriate committees = governance weakness flagged in Form 990

### State Attorney General Oversight

- **Parens Patriae Authority** / State AG has authority to oversee charitable organizations and enforce charitable trusts on behalf of the public / **Consequence**: AG may investigate, demand accountings, sue for breach of fiduciary duty, seek removal of officers/directors, or petition for dissolution
- **Registration and Reporting** / Most states require charitable organizations to register and file annual reports with the AG's office / **Consequence**: Failure to register/report = penalties, loss of solicitation authority, potential involuntary dissolution
- **Merger/Dissolution Approval** / Many states require AG notification or approval for merger, dissolution, or transfer of substantially all assets of a charitable corporation / **Timeline**: Notice requirements vary (30-60 days typical) / **Consequence**: Transaction without required AG approval may be void or voidable
- **Cy Pres Proceedings** / AG must be notified and may participate in any cy pres proceeding to modify charitable restrictions / **Consequence**: Court will not modify restrictions without AG involvement

### Sarbanes-Oxley Provisions Applicable to Nonprofits

- **Whistleblower Protection** / SOX Section 1107 (retaliation against whistleblowers) applies to all organizations, including nonprofits / **Consequence**: Criminal penalties for retaliation: fines and/or up to 10 years imprisonment
- **Document Retention/Destruction** / SOX Section 802 (document destruction in federal investigation) applies to all entities / **Consequence**: Criminal penalties: fines and/or up to 20 years imprisonment
- **Voluntary Adoption** / Many governance provisions (audit committee, internal controls, codes of ethics) adopted voluntarily as best practice / **Consequence**: Increasingly expected by major funders, accreditors, and state regulators

## Interaction with Other Areas

- **Corporate** (`corporate/`): fiduciary duties, governance structures, D&O insurance
- **Employment** (`employment/`): executive compensation, employment agreements
- **Securities** (`securities/`): compensation disclosure for organizations with publicly traded debt
- Cross-reference: `tax-exempt-status.md` for Form 990 governance disclosures
- Cross-reference: `unrelated-business-income.md` for board oversight of commercial activities

## Sources

- [IRC Section 4958 — Intermediate Sanctions](https://www.law.cornell.edu/uscode/text/26/4958)
- [IRS Form 990 Instructions — Governance Section](https://www.irs.gov/forms-pubs/about-form-990)
- [Revised Model Nonprofit Corporation Act (2008)](https://www.uniformlaws.org/)
- [IRS Governance and Related Topics — 501(c)(3) Organizations](https://www.irs.gov/charities-non-profits/governance-and-related-topics-501c3-organizations)
- [Panel on the Nonprofit Sector — Principles for Good Governance](https://www.independentsector.org/resource/principles-for-good-governance-and-ethical-practice/)

---
## Tax Exempt Status

# Tax-Exempt Status

## Applicability

Applies to organizations seeking or maintaining federal tax-exempt status under IRC Section 501(c), including 501(c)(3) charitable, 501(c)(4) social welfare, and 501(c)(6) trade associations. Governs formation, application, ongoing compliance, and revocation risk.

## Key Requirements

### 501(c)(3) — Charitable Organizations

- **Organizational Test** / Must be organized exclusively for exempt purposes (charitable, religious, educational, scientific, literary, public safety, amateur sports, prevention of cruelty) / **Consequence**: Failure to meet = denial of exemption or revocation
- **Operational Test** / Must be operated exclusively for exempt purposes; no substantial part of activities may be carrying on propaganda or attempting to influence legislation / **Consequence**: Violation triggers loss of exempt status
- **Private Inurement Prohibition** / No part of net earnings may inure to the benefit of any private shareholder or individual / **Consequence**: Loss of exemption; excise taxes under IRC 4958 (intermediate sanctions)
- **Lobbying Limitation** / Lobbying must not be a "substantial part" of activities; safe harbor under 501(h) election limits lobbying to 5-20% of exempt purpose expenditures (sliding scale: 20% of first $500K, 15% of next $500K, 10% of next $500K, 5% thereafter; $1M absolute cap) / **Consequence**: Exceeding limits = 25% excise tax on excess; flagrant violation = loss of exemption
- **Political Campaign Prohibition** / Absolute prohibition on participating or intervening in any political campaign for or against a candidate for public office / **Consequence**: Loss of exemption; 10% excise tax on political expenditures (IRC 4955), 100% if not corrected

### 501(c)(4) — Social Welfare Organizations

- **Primary Purpose** / Must be operated exclusively for promotion of social welfare (community benefit) / **Consequence**: Denial or revocation if primary purpose is not social welfare
- **Political Activity** / Permitted if not the primary activity; must be related to social welfare mission / **Consequence**: IRC 527(f) tax on political expenditures; potential loss of status if political activity becomes primary
- **Lobbying** / Unlimited lobbying permitted if in furtherance of social welfare purposes / No expenditure limitations apply

### 501(c)(6) — Trade Associations and Business Leagues

- **Common Business Interest** / Must be devoted to improvement of business conditions for one or more lines of commerce / **Consequence**: Denial if primarily performing services for individual members
- **No Profit Motive** / Net earnings cannot inure to any private shareholder or individual / **Consequence**: Same as 501(c)(3) inurement rules
- **Lobbying** / Permitted but dues attributable to lobbying are non-deductible to members; must notify members of non-deductible portion / **Consequence**: Proxy tax under IRC 6033(e)(2) if notification not provided

### Application Process

- **Form 1023** / Full application for 501(c)(3) status / **Fee**: $600 / **Timeline**: 3-6 months (up to 12+ months if complex)
- **Form 1023-EZ** / Streamlined application for organizations with gross receipts ≤$50K and assets ≤$250K / **Fee**: $275 / **Timeline**: 2-4 weeks typical
- **Filing Deadline** / Must file within 27 months of formation to receive retroactive exemption to date of formation / **Consequence**: Late filing = exemption effective only from application date

### Ongoing Compliance — Form 990

- **Annual Filing** / Form 990 (gross receipts >$200K or assets >$500K), 990-EZ ($50K-$200K), 990-N (e-Postcard, ≤$50K) / **Due**: 15th day of 5th month after fiscal year end
- **Public Disclosure** / Form 990 and Form 1023/determination letter must be made available for public inspection / **Consequence**: $20/day penalty for failure to disclose (max $10K per return)
- **Automatic Revocation** / Failure to file for 3 consecutive years results in automatic revocation of tax-exempt status / **Consequence**: Must reapply; retroactive reinstatement limited (reasonable cause within 15 months)

### State Requirements

- **State Incorporation** / Must file articles of incorporation with state; nonprofit corporation statutes vary / **Consequence**: No legal entity without state filing
- **State Tax Exemption** / Federal exemption does not automatically confer state tax exemption; separate application typically required / **Consequence**: State income, sales, and property tax liability if not obtained

## Interaction with Other Areas

- **Corporate** (`corporate/`): nonprofit governance overlaps with corporate fiduciary duties
- **Employment** (`employment/`): ministerial exception for religious organizations; FLSA exemptions for certain nonprofits
- **Data Privacy** (`data-privacy/`): donor data subject to privacy regulations
- Cross-reference: `nonprofit-governance.md` for intermediate sanctions detail

## Sources

- [IRC Section 501(c)(3)](https://www.law.cornell.edu/uscode/text/26/501)
- [IRS Publication 557 — Tax-Exempt Status for Your Organization](https://www.irs.gov/publications/p557)
- [IRS Form 1023 Instructions](https://www.irs.gov/forms-pubs/about-form-1023)
- [IRC Section 4955 — Political Expenditures](https://www.law.cornell.edu/uscode/text/26/4955)
- [IRC Section 501(h) — Lobbying Election](https://www.law.cornell.edu/uscode/text/26/501)

---
## Unrelated Business Income

# Unrelated Business Income

## Applicability

Applies to tax-exempt organizations generating income from activities not substantially related to their exempt purpose. Governs the unrelated business income tax (UBIT) under IRC Sections 512-514, including exceptions, SILO rules, and debt-financed income.

## Key Requirements

### Three-Part Test (IRC 512)

All three elements must be present for income to be classified as unrelated business taxable income (UBTI):

- **Trade or Business** / Activity carried on for the production of income from the sale of goods or performance of services / **Consequence**: Broadly defined; virtually any revenue-generating activity qualifies
- **Regularly Carried On** / Activity conducted with frequency and continuity comparable to commercial enterprises / **Threshold**: Seasonal activities (e.g., annual fundraiser) generally not regularly carried on; year-round activities are / **Consequence**: Irregularly carried on activities excluded from UBTI even if otherwise unrelated
- **Not Substantially Related** / Activity does not contribute importantly to accomplishment of the organization's exempt purpose (apart from generating revenue) / **Consequence**: Income from unrelated activities taxed at corporate rates (21% federal); state taxes may also apply

### Statutory Exceptions (IRC 512(b))

- **Volunteer Labor** / Substantially all work performed by unpaid volunteers / **Consequence**: Income excluded from UBTI regardless of relatedness
- **Donated Goods** / Sale of donated merchandise (e.g., thrift store operations) / **Consequence**: Income excluded; organization need not track cost basis
- **Convenience Exception** / Activity carried on primarily for the convenience of members, students, patients, officers, or employees (e.g., hospital cafeteria, university bookstore) / **Consequence**: Income excluded even if activity generates substantial revenue
- **Qualified Sponsorship Payments** / Payments where sponsor receives no substantial return benefit other than use or acknowledgment of name/logo (no qualitative language, endorsement, or inducement to purchase) / **Threshold**: "Substantial return benefit" = advertising; acknowledgment vs. advertising distinction is critical / **Consequence**: Qualified payments excluded; advertising component is UBTI

### Passive Income Exclusions (IRC 512(b))

- **Dividends and Interest** / Investment income from dividends, interest, and annuities / **Consequence**: Excluded from UBTI unless debt-financed (see below)
- **Royalties** / Payments for use of intangible property (trademarks, copyrights, patents) / **Consequence**: Excluded; but if organization provides services beyond licensing, may be reclassified as non-royalty income
- **Rent from Real Property** / Rental income from real property / **Consequence**: Excluded unless (1) more than 50% of rent is from personal property, (2) rent depends on tenant's income/profits, or (3) organization provides significant services to tenants
- **Capital Gains** / Gains from sale of property (other than inventory) / **Consequence**: Excluded from UBTI

### SILO Rules (IRC 512(a)(6))

- **Separate Computation** / Each unrelated trade or business must be separately identified (NAICS 6-digit code on Form 990-T); losses from one unrelated business cannot offset income from another / **Threshold**: Enacted in Tax Cuts and Jobs Act 2017; IRS proposed regulations published 2020 / **Consequence**: Prevents organizations from using losses in one activity to shelter income in another; each "silo" computed independently
- **De Minimis Exception** / Activities generating less than $1,000 gross income from an unrelated business may be aggregated / **Consequence**: Simplifies reporting for minor revenue streams
- **Investment Activities** / Investment income treated as a single trade or business for SILO purposes / **Consequence**: Investment losses can offset investment gains

### Debt-Financed Income (IRC 514)

- **Debt-Financed Property** / Income from property acquired or improved with borrowed funds / **Threshold**: Proportion of income included in UBTI = average acquisition indebtedness / average adjusted basis / **Consequence**: Even otherwise excluded passive income (rent, interest, capital gains) becomes partially taxable if debt-financed
- **Neighborhood Land Rule** / Exemption for land acquired with intent to use for exempt purposes within 10 years (churches: 15 years) / **Consequence**: Debt-financed income excluded during the exemption period if intent demonstrated
- **Acquisition Indebtedness** / Debt incurred to acquire or improve property; includes assumption of existing debt / **Consequence**: Refinancing existing acquisition debt remains acquisition indebtedness

### Filing Requirements

- **Form 990-T** / Must be filed if gross unrelated business income is $1,000 or more / **Timeline**: Due on the 15th day of the 5th month after the end of the tax year (same as Form 990) / **Consequence**: Failure to file = penalties; estimated tax payments required if UBTI expected to be $500+
- **Estimated Tax** / Quarterly estimated payments required if tax liability expected to be $500 or more / **Consequence**: Underpayment penalties apply

### Common UBIT Scenarios

- **Advertising Income** / Advertising in exempt organization publications (journals, newsletters) is UBTI; editorial/readership costs may offset / **Consequence**: Net advertising income taxable; fragmentation rule allows separating advertising from exempt publishing
- **Fitness/Recreation Facilities** / If open to general public for a fee beyond members = potential UBIT / **Consequence**: Convenience exception may apply if primarily for members/students
- **Parking and Transportation** / Pre-TCJA 2017 provision (IRC 512(a)(7)) taxing qualified transportation fringe benefits repealed in 2020 / **Consequence**: No longer a UBIT issue for most organizations

## Interaction with Other Areas

- **Corporate** (`corporate/`): corporate tax rate applies to UBTI
- **Financial Services** (`financial-services/`): investment income treatment, debt-financed property analysis
- Cross-reference: `tax-exempt-status.md` for risk that excessive UBIT indicates non-exempt primary purpose
- Cross-reference: `nonprofit-governance.md` for board oversight of commercial activities

## Sources

- [IRC Sections 512-514](https://www.law.cornell.edu/uscode/text/26/512)
- [IRS Publication 598 — Tax on Unrelated Business Income of Exempt Organizations](https://www.irs.gov/publications/p598)
- [IRS Form 990-T Instructions](https://www.irs.gov/forms-pubs/about-form-990-t)
- [IRS Proposed Regulations on SILO Rules (REG-106864-18)](https://www.federalregister.gov/documents/2020/04/24/2020-08826)
