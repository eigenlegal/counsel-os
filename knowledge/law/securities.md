## Overview

# Securities

## Trigger Conditions

Load this area when the document or matter involves ANY of the following:

**Keywords:** securities, stock, shares, equity, preferred stock, common stock, convertible note, SAFE, Simple Agreement for Future Equity, warrant, option, stock option plan, equity incentive plan, restricted stock, RSU, restricted stock unit, vesting, capitalization, cap table, dilution, anti-dilution, liquidation preference, investment, fundraising, round, Series A, Series B, seed round, pre-seed, venture capital, angel investor, accredited investor, qualified purchaser, private placement, offering, prospectus, registration statement, exempt offering, blue sky, securities filing, Form D, Regulation D, Rule 506, Regulation A, Regulation CF, crowdfunding, Regulation S, IPO, initial public offering, SPAC, direct listing, secondary sale, Rule 144, restricted securities, control securities, legend, transfer restriction, stockholders agreement, investors rights agreement, right of first refusal, ROFR, co-sale, voting agreement, registration rights, drag-along, tag-along, QSBS, qualified small business stock, insider trading, MNPI, material nonpublic information, 10b5-1 plan, Section 16, short-swing profits, blackout period, Sarbanes-Oxley, SOX, 10-K, 10-Q, 8-K, proxy statement, Regulation FD, say-on-pay, audit committee, internal controls, state notice filing, NSMIA, merit review, NASAA, funding portal, Form C, investment adviser, RIA, Form ADV, fiduciary duty, custody rule, pay-to-play, exempt reporting adviser
**Clause types:** subscription agreement provisions, stock purchase agreement terms, convertible note terms (discount, cap, interest, maturity, conversion mechanics), SAFE terms (post-money vs. pre-money, valuation cap, discount), investor rights provisions (information rights, registration rights, preemptive rights, ROFR, co-sale), protective provisions/veto rights, anti-dilution provisions (broad-based weighted average, full ratchet), liquidation preference (participating vs. non-participating, multiple), pay-to-play provisions, lock-up agreements, transfer restriction provisions, insider trading policy provisions, 10b5-1 plan terms, CEO/CFO certification provisions, audit committee charter provisions, advisory agreement terms, custody provisions, clawback provisions
**Regulatory references:** Securities Act of 1933, Securities Exchange Act of 1934, Regulation D (Rules 501-508), Rule 506(b), Rule 506(c), Regulation A (Tier 1, Tier 2), Regulation CF, Regulation S, Rule 144, Rule 701, Form D, state blue sky laws, SEC Rule 10b-5, SEC Rule 10b5-1, SEC Regulation FD, JOBS Act, Jumpstart Our Business Startups Act, Investment Company Act of 1940, Investment Advisers Act of 1940, Regulation Best Interest, Sarbanes-Oxley Act of 2002, Dodd-Frank Act, Section 16 (Exchange Act), NSMIA, NASAA, Regulation 14A, Form ADV, Custody Rule (206(4)-2), Rule 10D-1 (Clawback)
**Relationship patterns:** company/investor (venture capital, angel, institutional), founder/company (equity grants), company/employee (equity compensation), underwriter/issuer, broker-dealer/customer, issuer/transfer agent, SPAC sponsor/investors, investment adviser/client, funding portal/issuer, public company/shareholder, insider/company

## Sub-Files

- `exemptions.md` — Securities registration exemptions for private offerings. Load when: private placements, Regulation D offerings, convertible notes, SAFEs, Rule 144 resales, Rule 701 compensatory issuances, Regulation A or Regulation S offerings, integration analysis, bad actor disqualification, or any issuance of securities without SEC registration is involved.
- `equity-issuance.md` — Equity compensation and capitalization matters. Load when: stock option plans (ISO/NSO), RSU grants, equity incentive plans, 409A valuations, 83(b) elections, vesting schedules, acceleration provisions, cap table management, QSBS analysis, or equity compensation structuring is involved.
- `blue-sky-laws.md` — State securities regulation and NSMIA preemption. Load when: state notice filings, state registration requirements, multi-state offerings, NSMIA preemption analysis, state-specific exemptions, NASAA coordinated review, or state enforcement actions are involved.
- `insider-trading.md` — Insider trading prohibitions and compliance. Load when: material nonpublic information (MNPI), trading restrictions, blackout periods, 10b5-1 trading plans, Section 16 reporting, short-swing profits, tipping allegations, whistleblower matters, or pre-clearance policies are involved.
- `public-company.md` — Public company reporting and governance obligations. Load when: SEC reporting (10-K, 10-Q, 8-K), Sarbanes-Oxley compliance, proxy solicitation, Regulation FD, say-on-pay, audit committee requirements, CEO/CFO certification, internal controls, clawback policies, or IPO readiness is involved.
- `crowdfunding.md` — Regulation CF crowdfunding. Load when: crowdfunding offerings, funding portal requirements, Form C filings, Reg CF investment limits, small community-based capital raises, or JOBS Act Title III matters are involved.
- `investment-advisers.md` — Investment Advisers Act requirements. Load when: investment adviser registration, advisory agreements, fiduciary duty analysis, Form ADV, exempt reporting advisers, venture capital fund advisers, custody of client assets, best execution, pay-to-play restrictions, or adviser compliance programs are involved.

## Key Constraints

These are non-overridable legal requirements from this area. They cannot be modified by practice/ or matters/ overrides.

- Securities must be registered with the SEC or qualify for an exemption before being offered or sold; no contractual provision can override this requirement (Section 5, Securities Act of 1933).
- Anti-fraud provisions (Rule 10b-5, Section 17(a)) apply to ALL securities transactions, including exempt offerings; material misstatements or omissions are prohibited regardless of contractual disclaimers.
- Accredited investor verification is required under Rule 506(c) for offerings using general solicitation; self-certification alone is insufficient.
- Form D must be filed with the SEC within 15 days of the first sale of securities in a Regulation D offering; state blue sky notice filings are required in states where securities are sold or offerees reside.
- Transfer restrictions on restricted securities (legends, stop-transfer instructions) are legally required and cannot be removed except upon registration, exemption, or Rule 144 compliance.
- Section 409A of the Internal Revenue Code imposes strict valuation and timing requirements on deferred compensation, including stock options with exercise prices below fair market value.
- Trading on material nonpublic information in breach of a duty of trust or confidence is prohibited under Rule 10b-5; criminal penalties of up to $5M and 20 years imprisonment for individuals.
- Section 83(b) elections must be filed within 30 calendar days of property transfer; this deadline is absolute with no extension or late-filing relief.
- Public company CEO and CFO certifications under SOX Sections 302 and 906 are personal obligations that cannot be delegated; willful false certification carries up to $5M fine and 20 years imprisonment.
- Regulation FD prohibits selective disclosure of MNPI by public companies to market professionals; intentional disclosure requires simultaneous public dissemination.
- Investment advisers owe a fiduciary duty to clients that cannot be waived by contract; hedge clauses purporting to limit fiduciary liability are void.
- Reg CF securities are subject to a mandatory 1-year resale restriction from the date of purchase.

---
## Blue Sky Laws

# Blue Sky Laws (State Securities Regulation)

## Applicability

Load when ANY of the following is present: state securities filing, state notice filing, state registration of securities, state exemption from registration, merit review, NSMIA preemption analysis, multi-state offering, state broker-dealer or investment adviser registration, state enforcement action, or any offering where investors or offerees reside in multiple states.

## Key Requirements

### NSMIA Preemption for Covered Securities

- **What**: The National Securities Markets Improvement Act of 1996 (NSMIA) preempts state registration and merit review for "covered securities," limiting states to notice filing requirements and anti-fraud enforcement.
- **Threshold/Timeline**: Covered securities include: (1) securities listed on NYSE, Nasdaq, or other national exchanges designated by SEC; (2) securities sold in Rule 506(b) or 506(c) offerings; (3) securities sold to "qualified purchasers" as defined by SEC; (4) securities offered under Regulation A Tier 2; (5) securities issued in certain exempt transactions under Section 18 of the Securities Act. Regulation A Tier 1, Regulation CF, and intrastate offerings are NOT covered securities and remain subject to full state regulation.
- **Consequence**: For covered securities, states may only require notice filings and collect filing fees — they cannot impose substantive conditions, merit review, or deny the offering. For non-covered securities, states retain full authority to require registration, conduct merit review, impose conditions, and deny offerings.

### State Notice Filing Requirements

- **What**: Even for preempted Rule 506 offerings, most states require notice filings, typically consisting of a copy of the federal Form D, a consent to service of process, and a state-specific filing fee.
- **Threshold/Timeline**: Filing deadlines vary by state — most require filing within 15 days of first sale to residents of that state, but some states (e.g., Connecticut, Maryland) require pre-sale filing. Filing fees range from $0 (e.g., New York for certain exempt offerings) to $750+ per filing. States where filings are commonly required: state of incorporation, state of principal office, and every state where investors or offerees reside. Late filing penalties vary: some states impose fines; New York may deny the state exemption for late filings; some states require "late fee" payments.
- **Consequence**: Failure to make required state filings can result in state enforcement actions, fines, rescission rights for investors in that state, and potential disqualification from future state exemptions. While failure to make a state notice filing does not void the federal Rule 506 exemption, it can create significant compliance exposure at the state level.

### State-Specific Exemptions (Non-Covered Securities)

- **What**: Each state has its own set of registration exemptions for securities not preempted by NSMIA, often modeled on the Uniform Securities Act but with significant state-by-state variation.
- **Threshold/Timeline**: Common state exemptions include: (1) limited offering exemptions (varying dollar caps and investor number limits); (2) accredited investor exemptions (some states have their own accredited investor definitions); (3) isolated transaction exemptions (one-time, non-recurring sales); (4) institutional buyer exemptions; (5) intrastate offering exemptions (Rule 147/147A at federal level, plus state-specific requirements). Filing requirements, investor suitability standards, disclosure requirements, and dollar limits differ materially across states.
- **Consequence**: Multi-state offerings relying on state-specific exemptions require a state-by-state compliance matrix. A single non-compliant state can create rescission liability and enforcement exposure in that jurisdiction without affecting the offering in compliant states.

### NASAA Coordinated Review Program

- **What**: The North American Securities Administrators Association (NASAA) coordinates multi-state review of securities offerings that require state registration, including Regulation A Tier 1 offerings and certain direct participation programs.
- **Threshold/Timeline**: Coordinated review process: one lead examiner state reviews the filing on behalf of all participating states, reducing duplicative review. Review period is typically 20-30 business days for initial comments. States participating in coordinated review agree to accept the lead state's review subject to limited state-specific conditions. NASAA also publishes model rules and statements of policy that many states adopt, promoting (but not achieving) uniformity.
- **Consequence**: Offerings that must undergo state merit review without using the coordinated review process face individual review timelines and requirements in each state, significantly increasing time and cost.

### State Enforcement and Anti-Fraud Authority

- **What**: States retain full anti-fraud authority over all securities transactions within their borders, including covered securities preempted from registration requirements.
- **Threshold/Timeline**: State securities administrators (typically the Secretary of State, Attorney General, or a dedicated securities commissioner) can investigate fraud, issue cease-and-desist orders, impose civil penalties, seek injunctions, and refer matters for criminal prosecution. State penalties vary but can include: rescission orders requiring return of investor funds, civil fines up to $10,000+ per violation, disgorgement of profits, and criminal penalties including imprisonment. Statute of limitations varies by state (typically 2-5 years from discovery of the violation).
- **Consequence**: State enforcement actions can proceed even when the SEC has not taken action, and state remedies are in addition to (not preempted by) federal remedies. Multiple states can bring parallel enforcement actions for multi-state offerings.

## Common Contract Issues

- Offering documents that fail to identify all states where notice filings are required based on investor and offeree locations.
- Reliance on NSMIA preemption for offerings that do not qualify (e.g., Reg A Tier 1, intrastate offerings, offerings not conducted under Rule 506).
- Late state notice filings creating compliance gaps, especially in states with pre-sale filing requirements.
- Multi-state offerings using state-specific exemptions without a comprehensive state compliance matrix.
- Subscription agreements that do not capture investor state of residence for blue sky compliance tracking.
- Failure to account for state-level suitability requirements that may be more restrictive than federal requirements.

## Interaction with Other Areas

- **Securities (Exemptions)**: Rule 506 offerings are covered securities under NSMIA with state preemption, but Reg A Tier 1, Reg CF, and state-only offerings require full state compliance; integration analysis must account for state-level rules.
- **Securities (Crowdfunding)**: Reg CF is not preempted from state regulation, though most states have adopted exemptions or streamlined filing processes for Reg CF offerings.
- **Corporate (Entity Formation)**: State of incorporation and state of principal office determine primary blue sky filing obligations; multi-entity structures may implicate multiple state filings.
- **Consumer Protection**: State consumer protection statutes may provide additional remedies for defrauded investors beyond state securities laws.

## Sources

- [National Securities Markets Improvement Act of 1996 (NSMIA), Section 18 of the Securities Act](https://www.law.cornell.edu/uscode/text/15/77r)
- [NASAA — North American Securities Administrators Association](https://www.nasaa.org/)
- [Uniform Securities Act (2002)](https://www.uniformlaws.org/committees/community-home?CommunityKey=0d3652a4-48be-4779-a94e-1b2a893e29d0)
- [SEC Rule 506 and State Blue Sky Laws — Investor.gov](https://www.investor.gov/introduction-investing/investing-basics/glossary/blue-sky-laws)

---
## Crowdfunding

# Regulation CF — Crowdfunding

## Applicability

Load when ANY of the following is present: crowdfunding offering, Regulation CF, funding portal, JOBS Act Title III, Form C filing, community-based capital raise, small offering to non-accredited investors via online platform, or any reference to SEC-registered crowdfunding portal.

## Key Requirements

### Regulation CF Offering Limits

- **What**: Regulation CF permits issuers to raise up to $5M in a 12-month period through SEC-registered intermediaries (funding portals or broker-dealers), with individual investment limits based on investor income and net worth.
- **Threshold/Timeline**: Maximum offering amount: $5M in any 12-month period (raised from $1.07M by 2020 amendments). Individual investment limits per 12-month period across ALL Reg CF offerings: if either annual income or net worth is less than $124,000, the greater of $2,500 or 5% of the lesser of annual income or net worth; if both annual income and net worth are $124,000 or more, 10% of the lesser of annual income or net worth, up to a maximum of $124,000. Investors self-certify compliance with investment limits; intermediaries must have a reasonable basis to believe limits are met.
- **Consequence**: Exceeding the $5M offering limit voids the Reg CF exemption for the excess amount, creating Section 5 liability. Issuer is responsible for ensuring the offering limit is respected even though the intermediary tracks individual investment limits.

### Portal and Intermediary Requirements

- **What**: All Reg CF offerings must be conducted exclusively through a single SEC-registered funding portal or registered broker-dealer. Funding portals are a distinct registration category created by the JOBS Act.
- **Threshold/Timeline**: Funding portal registration: must register with both the SEC (on Form Funding Portal) and FINRA. Portals must: (1) provide educational materials about crowdfunding risks; (2) take measures to reduce fraud risk (background checks on officers, directors, and 20%+ owners of the issuer); (3) provide communication channels for investors; (4) disclose compensation and relationships with issuers; (5) not offer investment advice or make recommendations; (6) not solicit transactions; (7) not hold investor funds (must use a qualified third-party custodian or escrow agent). Offerings must remain open for a minimum of 21 days.
- **Consequence**: Conducting a Reg CF offering outside of a registered intermediary voids the exemption entirely. Portal violations of registration requirements can result in SEC and FINRA enforcement, including revocation of registration. Issuer liability is not eliminated by using a portal — the issuer retains primary liability for material misstatements in offering materials.

### Form C Disclosure Requirements

- **What**: Issuers must file Form C with the SEC and provide it to investors and the intermediary, containing specified disclosures about the company, offering terms, and financial condition.
- **Threshold/Timeline**: Required disclosures include: business description, officer/director information and compensation, ownership structure and capital structure, intended use of proceeds, offering terms (security type, price, target and maximum amounts), related-party transactions, risk factors, and financial statements. Financial statement requirements based on amount offered: (1) up to $124,000: financial statements certified by principal executive officer and most recent tax return; (2) $124,001 to $618,000: financial statements reviewed by independent public accountant; (3) over $618,000: audited financial statements (for first-time Reg CF issuers offering $618,001 to $1,235,000, reviewed statements are acceptable). Form C-U (progress update) required within 5 business days of reaching the target offering amount. Annual report on Form C-AR due within 120 days of fiscal year end for as long as securities are outstanding.
- **Consequence**: Material misstatements or omissions in Form C create issuer liability under Section 4A(c) of the Securities Act — purchasers may sue for rescission or damages. Failure to file required annual reports may disqualify the issuer from future Reg CF offerings.

### Resale Restrictions

- **What**: Securities purchased in Reg CF offerings are subject to a 1-year resale restriction from the date of purchase.
- **Threshold/Timeline**: 1-year holding period during which securities may only be transferred to: (1) the issuer; (2) an accredited investor; (3) a family member (spouse, parent, child, sibling, or their spouses); (4) in connection with death or divorce; or (5) in a registered offering. After 1 year, securities may be freely resold subject to any transfer restrictions in the issuer's organizational documents or shareholder agreements. No Rule 144 safe harbor specifically applies to Reg CF securities (Rule 144 applies to Reg D and other restricted securities).
- **Consequence**: Violating the resale restriction is a securities law violation for both the seller and any knowing facilitator. Issuers should include transfer restriction legends on Reg CF securities and implement stop-transfer instructions with their transfer agent.

### State Preemption

- **What**: Securities sold under Regulation CF are "covered securities" under NSMIA Section 18(b)(4)(C), preempting state registration requirements.
- **Threshold/Timeline**: States may NOT require registration or qualification of Reg CF offerings or impose conditions on the offering (e.g., merit review, additional disclosures, investor suitability requirements). States RETAIN authority to: (1) require notice filings and collect fees; (2) enforce anti-fraud provisions; (3) investigate and bring enforcement actions for fraud. Some states have adopted complementary intrastate crowdfunding exemptions that allow offerings to in-state investors outside the federal Reg CF framework, with varying limits and requirements.
- **Consequence**: Issuers should verify state notice filing requirements in states where they operate or where investors reside. State anti-fraud enforcement can proceed independently of federal compliance.

### Eligible Issuers and Exclusions

- **What**: Certain types of issuers are ineligible to use Regulation CF.
- **Threshold/Timeline**: Excluded issuers: (1) non-US companies; (2) SEC reporting companies; (3) investment companies (or companies that would be investment companies but for exclusions under the Investment Company Act); (4) companies that have failed to comply with Reg CF annual reporting requirements in the previous 2 years; (5) companies with no specific business plan or that indicate their business plan is to merge with an unidentified company; (6) companies that are disqualified under the bad actor provisions (same disqualifying events as Rule 506(d)). Special purpose vehicles (SPVs) and co-investment vehicles: permitted under 2020 amendments to Reg CF, allowing a single-purpose fund to invest in a single Reg CF issuer.
- **Consequence**: An offering by an excluded issuer under Reg CF is void — no valid exemption exists, creating Section 5 liability and rescission rights for all investors.

## Common Contract Issues

- Subscription agreements that do not reference the 1-year resale restriction or include required legends.
- Offering materials on funding portals containing material misstatements or omitting required risk disclosures.
- Issuers conducting marketing and solicitation activities outside the registered portal (which must be limited to "tombstone" notices directing potential investors to the portal).
- SAFE or convertible note terms in Reg CF offerings that fail to address valuation cap, discount, and conversion mechanics clearly enough for retail investors.
- Failure to file Form C-U progress updates or annual reports on Form C-AR.
- Co-investment or SPV structures that do not comply with the 2020 amendments permitting such vehicles.
- Integration risk when conducting concurrent Reg CF and Reg D offerings — Rule 152 safe harbors apply but require careful structuring.

## Interaction with Other Areas

- **Securities (Exemptions)**: Integration analysis under Rule 152 required when running concurrent Reg CF and Reg D or Reg A offerings; each exemption's conditions must be independently satisfied.
- **Securities (Blue Sky Laws)**: Reg CF securities are covered securities under NSMIA, preempting state registration but not state notice filings or anti-fraud authority.
- **Consumer Protection**: Retail investor protections in Reg CF (investment limits, disclosure requirements, portal obligations) reflect consumer protection principles; FTC jurisdiction may apply to deceptive marketing of crowdfunding offerings.
- **Financial Services**: Funding portals must register with FINRA and comply with FINRA rules; broker-dealer intermediaries are subject to full FINRA regulation.
- **Corporate (Governance)**: Reg CF offerings to potentially hundreds of small investors create shareholder management complexity; issuers should consider transfer restrictions, drag-along rights, and communication obligations.

## Sources

- [Regulation CF (17 CFR 227.100-503)](https://www.ecfr.gov/current/title-17/chapter-II/part-227)
- [Securities Act Section 4(a)(6) — Crowdfunding Exemption (15 USC 77d(a)(6))](https://www.law.cornell.edu/uscode/text/15/77d)
- [SEC Regulation Crowdfunding — Final Rules and Amendments](https://www.sec.gov/rules/final/2020/33-10884.pdf)
- [FINRA Funding Portal Rules](https://www.finra.org/rules-guidance/key-topics/crowdfunding)
- [SEC Investor Bulletin: Crowdfunding for Investors](https://www.sec.gov/oiea/investor-alerts-and-bulletins/ib_crowdfunding)

---
## Equity Issuance

# Equity Compensation and Capitalization

## Applicability

Load when ANY of the following is present: stock option grant, equity incentive plan, restricted stock award, RSU grant, 409A valuation, 83(b) election, vesting schedule, acceleration provisions, ISO/NSO tax treatment, cap table management, QSBS analysis, equity compensation structuring, early exercise, post-termination exercise period, or clawback provisions.

## Key Requirements

### Incentive Stock Options (ISOs) — Section 422

- **What**: Tax-advantaged stock options available only to employees (not contractors, consultants, or non-employee directors). No ordinary income tax at exercise if holding period requirements are met; gain taxed as long-term capital gains at sale.
- **Threshold/Timeline**: Exercise price must be at or above FMV on grant date (110% of FMV for 10%+ shareholders). $100K annual vesting limit — the aggregate FMV (determined at grant) of shares for which ISOs first become exercisable in any calendar year cannot exceed $100K; excess is automatically treated as NSOs. Maximum 10-year term (5 years for 10%+ shareholders). Holding period: shares must be held for at least 2 years from grant date AND 1 year from exercise date to qualify for capital gains treatment. Must be granted under a stockholder-approved plan within 10 years of earlier of board adoption or stockholder approval.
- **Consequence**: Disqualifying disposition (sale before holding periods are met) converts the gain to ordinary income at exercise spread. AMT trap: the spread at exercise (FMV minus exercise price) is an AMT preference item, potentially triggering Alternative Minimum Tax liability even though no cash is received. Company receives no tax deduction for ISO exercises (but does receive a deduction for disqualifying dispositions).

### Non-Qualified Stock Options (NSOs/NQSOs)

- **What**: Stock options taxed as ordinary income at exercise on the spread between exercise price and FMV. Available to all service providers (employees, contractors, directors, advisors).
- **Threshold/Timeline**: No $100K annual limit. No statutory holding period requirement. Exercise price must be at or above FMV on grant date to avoid Section 409A issues. No maximum term imposed by tax law (but 409A requires a fixed expiration date, typically 10 years). Employer withholding required at exercise (federal income tax, FICA, state).
- **Consequence**: Failure to set exercise price at FMV triggers Section 409A treatment: 20% additional tax plus interest penalty on the option holder. Company must withhold and report income at exercise; failure to withhold creates employer tax liability. Company receives a tax deduction equal to the ordinary income recognized by the recipient.

### Section 409A Compliance

- **What**: IRC Section 409A imposes strict requirements on nonqualified deferred compensation, including stock options priced below FMV. Requires FMV determination at grant through a "409A valuation."
- **Threshold/Timeline**: Independent appraisal safe harbor: valuation by a qualified independent appraiser (someone with relevant experience who regularly performs valuations), valid for 12 months unless a material event occurs (financing round, revenue milestone, M&A activity, significant customer win/loss). Illiquid startup safe harbor: valuation by a person with "significant knowledge and experience" in the company's industry and performing valuations, for companies with no publicly traded securities, no class of equity with put/call rights tied to a formula, less than 10 years old. Formula-based safe harbor: rarely used, requires formula applied consistently for all compensatory and non-compensatory transactions. Common valuation methods: market approach (comparable public companies, precedent transactions), income approach (DCF analysis), asset-based approach (net asset value). Backsolve method commonly used after a priced funding round.
- **Consequence**: Options granted below FMV without a valid 409A valuation: holder owes ordinary income tax at vesting (not exercise) plus 20% additional tax plus interest from vesting date. The penalty falls on the option holder, not the company, but the company has withholding obligations and may face employee claims. Penalties are per option, not per plan — each mispriced grant is a separate violation.

### Section 83(b) Elections

- **What**: Election to recognize taxable income on restricted property (typically restricted stock or early-exercised options) at the time of transfer rather than at vesting, based on the value at grant/purchase rather than the (presumably higher) value at vesting.
- **Threshold/Timeline**: Must be filed with the IRS within 30 calendar days of the property transfer (grant date for restricted stock; exercise date for early-exercised options). This deadline is absolute — there is no extension, no late filing, and no relief for missed deadlines. Filing method: mail to IRS service center with copy to employer; retain proof of mailing (certified mail recommended). Must also attach copy to the taxpayer's federal income tax return for the year of transfer.
- **Consequence**: Missed 83(b) election: income recognized at each vesting tranche based on then-current FMV (which may be substantially higher than grant date value), taxed as ordinary income. If the recipient forfeits unvested shares (e.g., leaves the company), they cannot recover taxes paid under the 83(b) election — the tax paid on forfeited shares is lost. For early-stage restricted stock where current FMV is near zero, the 83(b) election is almost always advantageous.

### Vesting Schedules

- **What**: Time-based or milestone-based schedules governing when equity awards become non-forfeitable.
- **Threshold/Timeline**: Standard: 4-year vesting with 1-year cliff (25% vests at 1 year, remainder monthly or quarterly over 3 years). Common variations: 3-year vesting for senior hires; back-loaded vesting (e.g., 10/20/30/40 over 4 years) used by some large tech companies; performance-based vesting tied to milestones. Cliff period ensures minimum commitment before any equity vests; departure before cliff results in zero vesting.
- **Consequence**: Overly aggressive vesting (short schedules, no cliff) may create retention problems and stockholder dilution. Unclear vesting language (e.g., ambiguous treatment of partial months, leaves of absence, or part-time transitions) leads to disputes.

### Acceleration Provisions

- **What**: Provisions that accelerate vesting upon specified trigger events, most commonly change of control (CoC) and/or termination.
- **Threshold/Timeline**: Single trigger: all or a portion of unvested equity accelerates immediately upon a change of control event, regardless of whether the holder continues employment. Double trigger: acceleration requires BOTH a change of control AND a qualifying termination (typically involuntary termination without cause or resignation for good reason) within a specified window (commonly 12-18 months after the CoC). Some plans provide partial acceleration (e.g., 50% on single trigger, 100% on double trigger).
- **Consequence**: Single trigger acceleration can reduce acquisition price (acquirer pays for fully vested equity with no retention incentive) and is disfavored by investors and acquirers. Double trigger is market standard for most equity plans. Failure to define "change of control" and "good reason" precisely leads to disputes. Acceleration may trigger Section 280G "golden parachute" excise tax (20% excise on excess parachute payments exceeding 3x base amount) for C-corporation employees.

### RSU Taxation and Structure

- **What**: Promise to deliver shares (or cash equivalent) upon satisfaction of vesting conditions. No shares issued until settlement.
- **Threshold/Timeline**: Taxed as ordinary income at delivery/settlement based on FMV at that time. Subject to Section 409A unless settled within the "short-term deferral" period (generally by March 15 of the year following vesting). Pre-IPO companies: "double trigger" RSUs common (vest on time-based schedule but do not settle until a liquidity event — IPO, direct listing, or acquisition — to avoid creating a tax liability with no liquid shares to cover it). Post-IPO: RSUs typically settle promptly upon vesting. Employer must withhold income tax and FICA at settlement.
- **Consequence**: RSUs that defer settlement beyond the short-term deferral period without 409A-compliant provisions trigger 409A penalties (20% additional tax plus interest). Pre-IPO double-trigger RSUs require careful 409A structuring. Employees may face liquidity problems if RSUs vest and settle before a public market exists.

### QSBS — Qualified Small Business Stock (Section 1202)

- **What**: Federal capital gains exclusion for stock in qualifying C corporations held for more than 5 years.
- **Threshold/Timeline**: Exclusion: up to the greater of $10M or 10x adjusted basis in gain from federal taxation (for stock acquired after September 27, 2010). Requirements: (1) stock issued by a domestic C corporation; (2) corporation's aggregate gross assets did not exceed $50M at any time before or immediately after issuance; (3) corporation uses at least 80% of assets (by value) in active conduct of one or more qualified trades or businesses; (4) stock acquired at original issuance in exchange for money, property, or services. Excluded industries: professional services (health, law, engineering, accounting, consulting, financial services, performing arts, athletics), banking/insurance/leasing/financing, farming, mining/oil/gas, hotels/motels/restaurants. 5-year holding period is mandatory; no partial credit for shorter holding.
- **Consequence**: Failure to maintain QSBS eligibility (e.g., S-corp election, asset test failure, exceeding $50M gross assets) eliminates the exclusion retroactively for all stockholders. Stock received in conversion of convertible notes or SAFEs may not qualify as "original issuance" — structure matters. Some states (e.g., California) do not conform to the federal QSBS exclusion.

### Cap Table Management

- **What**: Accurate tracking of all outstanding equity on a fully diluted basis including common stock, preferred stock, options (vested and unvested), warrants, convertible notes, and SAFEs.
- **Threshold/Timeline**: Must reconcile cap table before any financing round, M&A transaction, or material equity grant. Fully diluted share count must account for: all outstanding options (including unvested), unexercised warrants, convertible note conversion shares (at applicable discount/cap), SAFE conversion shares, and any authorized but unissued option pool shares. 409A valuations depend on accurate cap table data.
- **Consequence**: Cap table errors can result in incorrect ownership percentages, mispriced 409A valuations, inaccurate investor disclosures (triggering anti-fraud liability), and failed closing conditions in financing or M&A transactions.

## Common Contract Issues

- Option agreements with exercise prices below 409A FMV, creating deferred compensation tax exposure.
- Missing or late Section 83(b) elections — the 30-day deadline has no remedy.
- Vesting schedules that do not address acceleration upon termination or change of control.
- Ambiguous definitions of "cause," "good reason," and "change of control" in acceleration provisions.
- Failure to update 409A valuations after material events, creating mispricing risk for subsequent grants.
- Pre-IPO RSU structures that fail to comply with Section 409A short-term deferral or double-trigger requirements.
- Equity incentive plans with insufficient share reserves requiring frequent stockholder approval.
- QSBS eligibility assumptions not validated against the $50M gross asset test or active business requirement.
- Section 280G golden parachute analysis not performed before change-of-control transactions.
- Post-termination exercise periods that are too short (less than 90 days) or too long (triggering ISO-to-NSO conversion after 90 days for ISOs).

## Interaction with Other Areas

- **Securities (Exemptions)**: All equity issuances are securities transactions requiring Rule 701 or another exemption analysis; option exercises at conversion may trigger additional issuance requirements.
- **Securities (Insider Trading)**: Officers, directors, and 10%+ holders receiving equity compensation are subject to Section 16 reporting and short-swing profit rules; 10b5-1 plans should be considered for planned dispositions.
- **Corporate (Governance)**: Board and stockholder approval required for equity incentive plans; protective provisions may give investors veto over option pool changes.
- **Corporate (M&A)**: Treatment of outstanding options, RSUs, and restricted stock in M&A is a key deal term — assumption, substitution, acceleration, or cash-out must be specified.
- **Employment**: Equity compensation terms must coordinate with offer letters, severance agreements, and termination provisions; non-compete and clawback provisions may affect equity rights.
- **Data Privacy**: Cap table platforms and equity administration systems contain sensitive personal and financial information subject to data protection requirements.

## Sources

- [IRC Section 409A — Nonqualified Deferred Compensation (26 USC 409A)](https://www.law.cornell.edu/uscode/text/26/409A)
- [IRC Section 422 — Incentive Stock Options (26 USC 422)](https://www.law.cornell.edu/uscode/text/26/422)
- [IRC Section 83 — Property Transferred in Connection with Services (26 USC 83)](https://www.law.cornell.edu/uscode/text/26/83)
- [IRC Section 1202 — Qualified Small Business Stock (26 USC 1202)](https://www.law.cornell.edu/uscode/text/26/1202)
- [Rule 701 — Compensatory Securities Exemption (17 CFR 230.701)](https://www.ecfr.gov/current/title-17/chapter-II/part-230/section-230.701)
- [SEC Staff Guidance on 409A Valuations](https://www.sec.gov/divisions/corpfin/guidance/valuationguidance.htm)

---
## Exemptions

# Securities Registration Exemptions

## Applicability

Load when ANY of the following is present: private placement, Regulation D offering, convertible note, SAFE, warrant issuance, secondary sale of restricted securities, offshore offering, mini-IPO, crowdfunding reference, finder's fee arrangement, Rule 144 resale, or any issuance of securities without SEC registration.

## Key Requirements

### Regulation D — Rule 506(b) (Most Common Private Placement)

- **What**: Unlimited capital raise to accredited investors plus up to 35 sophisticated non-accredited investors, with no general solicitation or general advertising permitted.
- **Threshold/Timeline**: No dollar cap. 35 non-accredited investor limit (rarely used in practice due to information delivery burden). Self-certification questionnaire acceptable for accredited investor verification. Form D filing within 15 calendar days of first sale. State blue sky notice filings required in each state where securities are sold or offerees reside.
- **Consequence**: General solicitation (demo days, social media announcements, public pitch events) destroys 506(b) eligibility retroactively. Failure to file Form D does not void the exemption but may result in SEC enforcement action, state penalties, and a potential bar on future Regulation D reliance in certain states (e.g., New York).

### Regulation D — Rule 506(c) (General Solicitation Permitted)

- **What**: Unlimited capital raise with general solicitation permitted, but ALL purchasers must be verified accredited investors. Self-certification alone is insufficient.
- **Threshold/Timeline**: No dollar cap. 100% accredited investors required. Issuer must take "reasonable steps to verify" status using: (1) tax returns for prior 2 years showing $200K individual/$300K joint income with reasonable expectation of same; (2) bank/brokerage statements showing $1M+ net worth excluding primary residence; (3) written confirmation from registered broker-dealer, SEC-registered investment adviser, licensed CPA, or attorney; or (4) existing investor re-verification via certification of continued status.
- **Consequence**: A single non-accredited purchaser, or failure to verify accredited status through reasonable steps, voids the 506(c) exemption for the entire offering. The issuer may face rescission liability to all investors.

### Accredited Investor Definition (Rule 501(a))

- **What**: Natural persons and entities meeting SEC wealth, income, or professional credential thresholds.
- **Threshold/Timeline**: Natural persons: (1) $200K individual income or $300K joint with spouse/partner in each of the 2 most recent years, with reasonable expectation of same; (2) $1M individual or joint net worth excluding primary residence; (3) holders of Series 7, Series 65, or Series 82 licenses in good standing; (4) "knowledgeable employees" of private funds. Entities: (1) $5M in assets; (2) all equity owners are accredited; (3) SEC/state-registered investment advisers and exempt reporting advisers; (4) rural business investment companies; (5) family offices with $5M+ AUM.
- **Consequence**: Misclassifying a non-accredited investor as accredited voids the exemption and creates rescission rights for all investors in the offering.

### Regulation A (Mini-IPO)

- **What**: Qualified offering statement filed with SEC, allowing public solicitation and sale to non-accredited investors.
- **Threshold/Timeline**: Tier 1: up to $20M in a 12-month period; state blue sky compliance required; no ongoing SEC reporting. Tier 2: up to $75M in a 12-month period; state blue sky laws preempted; ongoing SEC reporting required (annual on Form 1-K, semiannual on Form 1-SA, current on Form 1-U). Non-accredited investors in Tier 2 limited to 10% of greater of annual income or net worth per offering. Available to US and Canadian issuers only; not available to SEC reporting companies, blank check companies, or certain regulated industries.
- **Consequence**: Failure to qualify the offering statement before sales results in Section 5 violation. Tier 2 ongoing reporting failures can result in SEC suspension of the offering and enforcement action.

### Regulation S (Offshore Offerings)

- **What**: Exempts offers and sales made outside the United States to non-US persons with no directed selling efforts in the US.
- **Threshold/Timeline**: Category 1 (foreign private issuers with no US market): no distribution compliance period. Category 2 (SEC reporting issuers, certain debt): 40-day distribution compliance period with offering restrictions and transactional restrictions. Category 3 (US equity issuers): 1-year distribution compliance period (6 months for SEC reporting issuers) with enhanced restrictions including certifications, legends, and stop-transfer instructions. Flowback into US markets during compliance period voids the exemption.
- **Consequence**: Directed selling efforts in the US (targeting US persons via US media, roadshows, or websites accessible to US persons without access controls) destroy the exemption. Securities resold into the US during the distribution compliance period lose Reg S status and must be registered or qualify for a separate exemption.

### Rule 701 (Compensatory Issuances)

- **What**: Exempts securities issued under written compensatory benefit plans to employees, directors, general partners, trustees, officers, consultants, and advisors.
- **Threshold/Timeline**: 12-month aggregate limit: greatest of $1M, 15% of issuer's total assets, or 15% of outstanding securities of the class. Enhanced disclosure (financial statements, risk factors, plan summary) required if aggregate sales price or amount sold exceeds $10M in any 12-month period. Disclosure must be provided a reasonable time before sale or exercise.
- **Consequence**: Exceeding the Rule 701 limits without another available exemption is a Section 5 violation. The issuer faces rescission liability and potential SEC enforcement.

### Integration Doctrine and Safe Harbors

- **What**: SEC may treat multiple offerings as a single integrated offering, potentially disqualifying exemption reliance if the combined offering violates conditions of the claimed exemption.
- **Threshold/Timeline**: Rule 152 safe harbors: (1) offerings separated by more than 30 days are generally not integrated (for Reg D, Reg A, Reg CF, Reg S); (2) completed offerings are not integrated with subsequent offerings; (3) Rule 506(b) offering will not be integrated with prior offering that allowed general solicitation if 506(b) purchasers were not solicited through general solicitation; (4) separate offerings to different groups (employees vs. investors) generally not integrated. Legacy 6-month safe harbor still referenced in practice but largely superseded by Rule 152.
- **Consequence**: Integration collapses two offerings into one, potentially exceeding dollar limits, investor number limits, or mixing general solicitation with non-solicitation offerings — voiding the exemption for both.

### Bad Actor Disqualification (Rule 506(d))

- **What**: Rule 506 exemptions are unavailable if the issuer or any "covered person" (directors, officers, 20%+ equity holders, promoters, compensated solicitors, general partners, managing members) has specified disqualifying events.
- **Threshold/Timeline**: Disqualifying events include: felony or misdemeanor convictions in connection with securities transactions (within 10 years for felonies, 5 years for misdemeanors), SEC/CFTC disciplinary orders, final orders of state securities/banking/insurance/credit union regulators, SEC cease-and-desist orders, SEC stop orders, US Postal Service false representation orders, and court injunctions involving securities. Pre-existing events (before September 23, 2013) require disclosure but do not disqualify.
- **Consequence**: Failure to conduct bad actor due diligence and selling securities when a disqualification exists voids the Rule 506 exemption, creating Section 5 liability and rescission rights.

### Form D Filing Requirements

- **What**: Notice filing with SEC for Regulation D offerings on Form D.
- **Threshold/Timeline**: Initial filing within 15 calendar days of first sale. Amendments required for material changes and annually if the offering is ongoing. State notice filings typically due within 15 days of first sale in that state, but deadlines vary by state (some require pre-sale filing). Filing fees range from $0 to $750+ depending on state and amount raised.
- **Consequence**: Late Form D filing does not automatically void the federal exemption, but certain states (notably New York) may deny the state exemption for late filings. SEC may bring enforcement actions for failure to file. Pattern of non-filing may be considered in future exemption reliance.

### Rule 144 (Resale of Restricted and Control Securities)

- **What**: Safe harbor for public resale of restricted securities (acquired in unregistered offerings) and control securities (held by affiliates of the issuer).
- **Threshold/Timeline**: Restricted securities of SEC reporting issuers: 6-month holding period (must hold and fully pay for shares for 6 months from acquisition). Restricted securities of non-reporting issuers: 1-year holding period. After holding period: non-affiliates of reporting issuers may sell freely after 6 months (with current public information available) or after 1 year (without conditions). Affiliates: volume limitation of greater of 1% of outstanding shares or average weekly trading volume over preceding 4 weeks; manner of sale requirements (broker transactions or market maker); current public information must be available; Form 144 filing required if sale exceeds 5,000 shares or $50,000 in any 3-month period.
- **Consequence**: Selling restricted securities without meeting Rule 144 conditions or another exemption is a Section 5 violation. Broker-dealers facilitating such sales face liability as statutory underwriters.

## Common Contract Issues

- Subscription agreements lacking adequate accredited investor representations or 506(c) verification documentation.
- Convertible notes and SAFEs that do not address securities law compliance at conversion — conversion is a separate issuance requiring its own exemption.
- General solicitation activities (demo days, AngelList postings, social media) disqualifying Rule 506(b) reliance.
- Missing or late Form D filings and state blue sky notice filings.
- Finder's fee arrangements with unregistered broker-dealers jeopardizing the exemption.
- Side letters creating different economic terms that may constitute a separate offering requiring separate exemption analysis.
- Failure to conduct bad actor diligence on covered persons under Rule 506(d).
- Transfer restriction legends missing or inconsistent with applicable holding periods.
- Offering materials containing material misstatements or omissions (anti-fraud liability applies to ALL offerings, including exempt ones).
- Integration risk from concurrent or closely-timed offerings to different investor groups.

## Interaction with Other Areas

- **Securities (Equity Issuance)**: Equity compensation grants are securities requiring Rule 701 or another exemption; option exercises may trigger additional issuance analysis.
- **Securities (Blue Sky Laws)**: Rule 506 offerings benefit from NSMIA preemption of state merit review but still require state notice filings; Reg A Tier 1 and non-covered offerings require full state compliance.
- **Securities (Crowdfunding)**: Reg CF has separate integration analysis under Rule 152; concurrent Reg D and Reg CF offerings require careful integration planning.
- **Corporate (Governance)**: Investor rights negotiated in exempt offerings (board seats, protective provisions, information rights) create ongoing governance obligations.
- **Financial Services**: Finder's fee and broker-dealer registration issues arise frequently; unregistered broker activity can jeopardize the offering exemption.
- **International Trade**: Regulation S offerings require coordination with local securities laws and careful management of distribution compliance periods.

## Sources

- [Securities Act of 1933, Section 5 — Registration Requirement](https://www.law.cornell.edu/uscode/text/15/77e)
- [Regulation D, Rules 501-508 (17 CFR 230.501-508)](https://www.ecfr.gov/current/title-17/chapter-II/part-230/subject-group-ECFR6e651a4c86c0174)
- [Rule 152 — Integration Safe Harbors (17 CFR 230.152)](https://www.ecfr.gov/current/title-17/chapter-II/part-230/section-230.152)
- [Rule 144 — Resale of Restricted Securities (17 CFR 230.144)](https://www.ecfr.gov/current/title-17/chapter-II/part-230/section-230.144)
- [SEC Regulation D Compliance and Disclosure Interpretations](https://www.sec.gov/divisions/corpfin/guidance/securitiesactrules-interps.htm)
- [SEC Accredited Investor Definition — Investor Bulletin](https://www.sec.gov/oiea/investor-alerts-and-bulletins/accredited-investor-bulletin)

---
## Insider Trading

# Insider Trading

## Applicability

Load when ANY of the following is present: insider trading allegation or risk, material nonpublic information (MNPI), trading restrictions, blackout periods, 10b5-1 trading plans, Section 16 reporting, short-swing profits (Section 16(b)), tipping allegations, confidentiality agreements involving securities-related information, pre-clearance policies, or whistleblower matters involving securities fraud.

## Key Requirements

### Rule 10b-5 — Prohibition on Fraud in Securities Transactions

- **What**: SEC Rule 10b-5 (under Section 10(b) of the Securities Exchange Act of 1934) prohibits any person from employing any device, scheme, or artifice to defraud, making material misstatements or omissions, or engaging in any act that operates as fraud in connection with the purchase or sale of any security.
- **Threshold/Timeline**: Elements of a 10b-5 insider trading violation: (1) trading in securities (buying or selling, including derivatives); (2) while in possession of material nonpublic information (MNPI); (3) in breach of a duty of trust or confidence owed to the source of the information. "Material" information: information a reasonable investor would consider important in making an investment decision (e.g., mergers, earnings surprises, FDA approvals, significant contracts, cybersecurity breaches). "Nonpublic": information not yet disseminated to the investing public through established channels; information becomes public only after sufficient time for market absorption (typically 1-2 full trading days after public announcement).
- **Consequence**: Criminal penalties: up to $5M fine and 20 years imprisonment for individuals; up to $25M fine for entities. Civil penalties: disgorgement of profits plus civil penalty up to 3x the profit gained or loss avoided (under the Insider Trading Sanctions Act of 1984 and Insider Trading and Securities Fraud Enforcement Act of 1988). SEC may also seek injunctions, officer/director bars, and industry bars.

### Classical Theory vs. Misappropriation Theory

- **What**: Two legal theories under which insider trading liability arises, each based on a different relationship and duty of trust.
- **Threshold/Timeline**: Classical theory: corporate insiders (officers, directors, employees) and temporary insiders (attorneys, accountants, consultants with access to MNPI) trade on MNPI in breach of their fiduciary duty to the corporation and its shareholders. Misappropriation theory (established in United States v. O'Hagan, 1997): any person who misappropriates confidential information for securities trading purposes, in breach of a duty owed to the source of the information. Applies even when the trader has no relationship with the company whose securities are traded — the duty runs to the source of the information (e.g., employer, client, family member).
- **Consequence**: Both theories carry identical criminal and civil penalties. The misappropriation theory significantly expanded insider trading liability beyond traditional corporate insiders to anyone who obtains MNPI through a relationship of trust and confidence and trades on it.

### Tipper-Tippee Liability

- **What**: Liability extends beyond the person who trades to those who "tip" MNPI and those who receive tips and trade on them.
- **Threshold/Timeline**: Tipper liability: a person who tips MNPI is liable if the tip was made in breach of a duty and the tipper received a "personal benefit" (direct or indirect) from the tip. Personal benefit test (Dirks v. SEC, 1983): includes pecuniary gain, reputational benefit, or gift of information to a trading relative or friend — a relationship "suggesting a quid pro quo" or "an intention to benefit" the tippee suffices (Salman v. United States, 2016). Tippee liability: the tippee is liable if the tippee knew or should have known that the tipper breached a duty and received a personal benefit. Chain tipping: liability extends through chains of tippees — each downstream tippee who knew or should have known of the original breach is liable.
- **Consequence**: Tippers face the same criminal and civil penalties as direct traders. Tippees face liability for their own trading profits/losses avoided. Control person liability under Section 20A: employers and controlling persons may be jointly and severally liable for insider trading by their employees or controlled persons if they knew or recklessly disregarded the violation.

### Rule 10b5-1 Trading Plans

- **What**: Pre-established written trading plans that provide an affirmative defense to insider trading liability when properly adopted and followed.
- **Threshold/Timeline**: Requirements (as amended, effective February 27, 2023): (1) plan adopted in good faith when the person did not possess MNPI; (2) mandatory cooling-off period before first trade: for officers and directors, the later of 90 days after adoption or 2 business days after filing the Form 10-Q or 10-K covering the fiscal quarter of adoption (up to 120 days maximum); for other persons, 30 days after adoption; (3) director/officer certification that they are not aware of MNPI and that the plan is adopted in good faith; (4) no overlapping plans; (5) limit of one single-trade plan per 12-month period; (6) plan must specify amount, price, and date of trades or include a formula or algorithm, or delegate to a third party who does not possess MNPI.
- **Consequence**: Plans that do not meet the requirements do not provide the affirmative defense, leaving the trader exposed to 10b-5 liability. Plans adopted while in possession of MNPI, or plans modified while in possession of MNPI, are void. Frequent plan modifications or terminations raise inference of manipulation and may lead to SEC scrutiny. Companies must disclose 10b5-1 plans in quarterly reports (Item 408 of Regulation S-K).

### Section 16 — Reporting and Short-Swing Profits

- **What**: Section 16 of the Exchange Act imposes reporting obligations and disgorgement of short-swing profits on officers, directors, and 10%+ beneficial owners of registered equity securities.
- **Threshold/Timeline**: Section 16(a) reporting: Form 3 (initial statement of beneficial ownership) within 10 days of becoming an insider; Form 4 (changes in ownership) within 2 business days of the transaction; Form 5 (annual statement) within 45 days of fiscal year end for transactions not previously reported. Section 16(b) short-swing profits: any profit realized from any purchase and sale (or sale and purchase) of the issuer's equity securities within any 6-month period must be disgorged to the company. Profit calculation uses a "lowest-in, highest-out" matching method to maximize disgorgeable profit. No intent to trade on MNPI is required — Section 16(b) is a strict liability provision.
- **Consequence**: Late Section 16(a) filings must be disclosed in the company's annual proxy statement. Section 16(b) disgorgement is enforceable by the company or by any stockholder on behalf of the company (derivative action). No statute of limitations defense if the violation is not disclosed — the 2-year limitations period runs from the date of the last transaction in the matched pair.

### Whistleblower Protections (Dodd-Frank Section 21F)

- **What**: SEC whistleblower program provides monetary awards and anti-retaliation protections for individuals who report securities law violations to the SEC.
- **Threshold/Timeline**: Monetary awards: 10% to 30% of sanctions collected in SEC enforcement actions resulting in monetary sanctions exceeding $1M. Awards apply to related actions by other agencies (DOJ, state AGs) as well. Anti-retaliation: employers may not discharge, demote, suspend, threaten, harass, or discriminate against whistleblowers; retaliation claims carry a 6-year statute of limitations (or 3 years from when facts were known, up to 10 years total). Internal reporting: reporting to the company's compliance or legal department can qualify if the employee also reports to the SEC within 120 days.
- **Consequence**: Since inception through 2024, the SEC has awarded over $2B to whistleblowers. Confidentiality agreements and separation agreements cannot require waiver of whistleblower rights — provisions purporting to waive the right to report to the SEC or receive a whistleblower award are void and may themselves constitute a securities violation. The SEC has brought enforcement actions against companies whose agreements impede whistleblowing.

## Common Contract Issues

- Employment and consulting agreements lacking insider trading policy acknowledgments and trading restrictions.
- Confidentiality/NDA provisions that do not expressly address obligations regarding MNPI and securities trading restrictions.
- Separation agreements containing overly broad non-disparagement or confidentiality clauses that impede SEC whistleblower rights.
- 10b5-1 plans adopted without proper cooling-off periods or during MNPI possession windows.
- M&A transaction documents without adequate "wall-crossing" procedures for sharing MNPI with potential counterparties.
- Insider trading policies that do not cover temporary insiders (outside counsel, accountants, consultants).
- Pre-clearance procedures that fail to account for derivative securities (options, warrants, swaps).
- Blackout period policies that are not coordinated with Section 16 reporting obligations.

## Interaction with Other Areas

- **Securities (Public Company)**: Regulation FD, periodic reporting obligations, and proxy disclosures intersect with MNPI management; Section 16 reporting applies only to public company insiders.
- **Securities (Equity Issuance)**: Equity compensation recipients who are insiders must coordinate exercises and sales with trading windows and 10b5-1 plans; Section 16 implications for option exercises.
- **Employment**: Insider trading policies are typically part of employee handbooks; termination provisions must address post-termination trading restrictions and return of MNPI.
- **Data Privacy**: Monitoring employee trading activity and communications for insider trading compliance implicates employee privacy rights and data protection obligations.
- **Litigation**: SEC enforcement actions, DOJ criminal prosecutions, and private securities fraud actions (Section 10(b) and Section 20A) are primary litigation vectors.

## Sources

- [Securities Exchange Act of 1934, Section 10(b) (15 USC 78j(b))](https://www.law.cornell.edu/uscode/text/15/78j)
- [SEC Rule 10b-5 (17 CFR 240.10b-5)](https://www.ecfr.gov/current/title-17/chapter-II/part-240/subpart-A/subject-group-ECFRb26aborOctf5b/section-240.10b-5)
- [SEC Rule 10b5-1 Trading Plans (17 CFR 240.10b5-1)](https://www.ecfr.gov/current/title-17/chapter-II/part-240/subpart-A/subject-group-ECFRb26aborOctf5b/section-240.10b5-1)
- [Section 16 — Short-Swing Profits (15 USC 78p)](https://www.law.cornell.edu/uscode/text/15/78p)
- [SEC Whistleblower Program — Office of the Whistleblower](https://www.sec.gov/whistleblower)
- [Dirks v. SEC, 463 U.S. 646 (1983)](https://supreme.justia.com/cases/federal/us/463/646/)

---
## Investment Advisers

# Investment Advisers Act

## Applicability

Load when ANY of the following is present: investment adviser registration, advisory agreement, fiduciary duty to clients, Form ADV, SEC-registered investment adviser (RIA), state-registered adviser, exempt reporting adviser, venture capital fund adviser, private fund adviser, custody of client assets, best execution obligations, pay-to-play restrictions, solicitation arrangements, performance-based fees, or adviser compliance program.

## Key Requirements

### Registration Thresholds — SEC vs. State

- **What**: The Investment Advisers Act of 1940 requires persons who meet the definition of "investment adviser" to register with either the SEC or their home state, depending on assets under management (AUM).
- **Threshold/Timeline**: SEC registration required: AUM of $100M or more (may register between $100M and $110M; must register at $110M). State registration required: AUM under $100M (registered in adviser's principal office state and each state where adviser has a place of business or exceeds de minimis client thresholds — typically 5 or fewer clients in a state without a place of business). Exceptions to state allocation: advisers in states that do not examine advisers (currently Wyoming and New York) may register with SEC regardless of AUM. Multi-state advisers with a place of business in 15+ states may register with SEC. Foreign private advisers (no US place of business, fewer than 15 US clients/investors, less than $25M US AUM) are exempt from registration.
- **Consequence**: Operating as an unregistered adviser is a federal or state securities violation. SEC enforcement actions can include cease-and-desist orders, disgorgement, civil penalties, and industry bars. State violations carry similar remedies plus potential criminal penalties.

### Fiduciary Duty (Duty of Care and Duty of Loyalty)

- **What**: Investment advisers owe a fiduciary duty to their clients, encompassing both a duty of care and a duty of loyalty, arising from the relationship of trust and confidence.
- **Threshold/Timeline**: Duty of care: (1) duty to provide advice in the client's best interest based on the client's objectives, taking into account the client's financial situation, risk tolerance, and investment goals; (2) duty to seek best execution of client transactions; (3) duty to provide advice and monitoring over the course of the relationship. Duty of loyalty: (1) full and fair disclosure of all material facts, including conflicts of interest; (2) duty not to subordinate clients' interests to the adviser's own interests; (3) duty to eliminate or at least disclose and mitigate conflicts of interest. Informed consent: disclosure of a conflict alone is insufficient — the client must provide informed consent, which requires the adviser to provide sufficiently specific disclosure that the client can understand the conflict and its implications.
- **Consequence**: Breach of fiduciary duty is an independent basis for SEC enforcement, state enforcement, and private claims by clients. Penalties include disgorgement of advisory fees, compensatory damages, punitive damages (in some jurisdictions), and SEC enforcement sanctions. Fiduciary duty cannot be waived by contract — hedge clauses purporting to waive fiduciary obligations are void.

### Form ADV Disclosure Requirements

- **What**: Registered investment advisers must file Form ADV with the SEC (or state) and deliver a brochure (Part 2A) and relationship summary (Part 3/Form CRS) to clients and prospective clients.
- **Threshold/Timeline**: Form ADV Part 1A: filed electronically through IARD; updated annually within 90 days of fiscal year end and promptly for material changes. Part 2A (brochure): narrative disclosure of advisory services, fees, conflicts of interest, disciplinary history, code of ethics, and other material information; delivered to new clients before or at the time of entering an advisory agreement and offered annually thereafter. Part 2B (brochure supplement): information about supervised persons who provide advisory services. Form CRS (Part 3): 2-page relationship summary for retail investors; delivered to new and prospective retail clients. Material changes require prompt amendment and delivery to affected clients.
- **Consequence**: Failure to file or update Form ADV is an independent violation of the Advisers Act. Material omissions or misstatements in Form ADV are fraud under Section 206. Failure to deliver brochures to clients creates a rescission right — clients may void the advisory agreement within 5 business days of receiving the brochure (48 hours for contracts entered at the adviser's principal office).

### Exempt Reporting Advisers (ERAs)

- **What**: Certain advisers who are exempt from SEC registration but must file reports with the SEC as "exempt reporting advisers."
- **Threshold/Timeline**: Venture capital fund advisers: advisers solely to venture capital funds (as defined in Rule 203(l)-1: privately offered funds that do not borrow or leverage more than 15% of capital, do not offer redemption rights, represent themselves as venture capital funds, and invest primarily in qualifying investments — equity of qualifying portfolio companies). Private fund advisers: advisers solely to private funds with US AUM under $150M. ERAs must file Form ADV (abbreviated — Parts 1A and certain items of Part 2A) through IARD. ERAs are subject to SEC anti-fraud provisions, examination authority, and recordkeeping requirements, but are not subject to the full compliance program requirements of registered advisers.
- **Consequence**: Loss of ERA exemption (e.g., by advising non-qualifying funds, exceeding AUM thresholds, or managing a fund that does not qualify as a venture capital fund) requires registration within 90 days. Operating without registration or ERA status is a violation of the Advisers Act.

### Custody Rule (Rule 206(4)-2)

- **What**: Investment advisers with custody of client funds or securities must comply with safeguarding requirements to protect client assets.
- **Threshold/Timeline**: "Custody" includes: holding client funds/securities, having authority to obtain possession (e.g., deducting advisory fees from client accounts), or acting in any capacity that gives the adviser legal ownership or access to client funds/securities. Requirements: (1) maintain client assets with a "qualified custodian" (bank, broker-dealer, futures commission merchant, or foreign financial institution meeting specified conditions); (2) provide or arrange for quarterly account statements to clients; (3) undergo annual surprise examination by an independent public accountant to verify client assets. Exception for pooled investment vehicles: advisers to pooled vehicles (funds) may comply by having the fund audited annually by a PCAOB-registered independent auditor, with audited financial statements delivered to investors within 120 days of fiscal year end (180 days for fund-of-funds).
- **Consequence**: Custody violations are a common SEC enforcement priority. Unauthorized access to client funds is fraud. Failure to maintain assets with a qualified custodian or failure to undergo surprise examinations can result in enforcement actions, civil penalties, and adviser registration revocation.

### Best Execution

- **What**: Advisers have a duty to seek the most favorable terms reasonably available under the circumstances for client securities transactions.
- **Threshold/Timeline**: Best execution is not defined as the lowest possible commission or price — it requires evaluation of the full range of factors including: execution price, commission rate, market impact, speed of execution, reliability, confidentiality, and the broker-dealer's financial stability and back-office capabilities. Soft dollar arrangements (receiving research or brokerage services in exchange for directing client transactions) are permitted under Section 28(e) safe harbor if: (1) the adviser determines in good faith that commissions are reasonable in relation to the value of research and brokerage services received; (2) the services provide lawful and appropriate assistance in the adviser's investment decision-making. Disclosure of soft dollar practices is required in Form ADV Part 2A.
- **Consequence**: Failure to seek best execution is a breach of fiduciary duty. Excessive commissions paid to affiliates or brokers providing inadequate services support SEC fraud charges. Undisclosed soft dollar arrangements are fraud under Section 206.

### Pay-to-Play (Rule 206(4)-5)

- **What**: Restricts investment advisers from receiving compensation for advisory services to government clients within 2 years after the adviser or certain covered associates make political contributions to government officials who can influence the selection of the adviser.
- **Threshold/Timeline**: 2-year "time out": no compensation for advisory services to a government entity for 2 years after a political contribution by the adviser, covered associates (including solicitors), or PACs controlled by the adviser. De minimis exception: contributions of $350 or less to candidates for whom the contributor is eligible to vote, and $150 or less to other candidates. "Covered associates" include: any general partner, managing member, executive officer, or person with similar status or function; any employee who solicits government entities; and any person who supervises such solicitors. Look-back applies: contributions made within 2 years before the date the advisory agreement begins trigger the prohibition.
- **Consequence**: Violation of pay-to-play results in a 2-year fee forfeiture — the adviser must serve the government client for 2 years without compensation. SEC has brought enforcement actions imposing disgorgement, civil penalties, and compliance undertakings. No intent requirement — the rule is strict liability.

## Common Contract Issues

- Advisory agreements that contain impermissible hedge clauses purporting to limit the adviser's fiduciary liability.
- Custody arrangements where the adviser has signatory authority over client bank accounts without complying with the Custody Rule.
- Performance-based fee arrangements that do not comply with the "qualified client" requirement ($1.1M AUM or $2.2M net worth, adjusted periodically).
- Solicitation and referral arrangements that fail to comply with the amended marketing rule (Rule 206(4)-1) regarding testimonials, endorsements, and third-party ratings.
- Sub-advisory agreements that do not clearly allocate fiduciary responsibilities between the primary adviser and sub-adviser.
- Form ADV disclosures that do not adequately describe conflicts of interest, including proprietary products, affiliate transactions, and revenue sharing.
- Private fund LPAs that purport to waive the adviser's fiduciary duty through broad exculpation and indemnification provisions.
- Compliance programs that lack annual review by the chief compliance officer as required by Rule 206(4)-7.

## Interaction with Other Areas

- **Securities (Exemptions)**: Investment advisers often structure private fund offerings under Reg D; adviser status affects integration analysis and Form D filing obligations.
- **Securities (Public Company)**: SEC-registered advisers with publicly traded parent companies face additional disclosure obligations; proxy advisory firms intersect with adviser regulation.
- **Financial Services**: Dual registrants (adviser and broker-dealer) must manage conflicts between fiduciary duty and suitability standards; Regulation Best Interest applies to broker-dealer recommendations.
- **Data Privacy**: Advisers collect and maintain sensitive client financial information subject to Regulation S-P (privacy of consumer financial information), GDPR (for EU clients), and state data protection laws.
- **Employment**: Adviser compliance programs must include personal trading policies, code of ethics requirements, and supervision procedures for supervised persons.

## Sources

- [Investment Advisers Act of 1940 (15 USC 80b-1 et seq.)](https://www.law.cornell.edu/uscode/text/15/chapter-2D/subchapter-II)
- [SEC Rules Under the Advisers Act (17 CFR Part 275)](https://www.ecfr.gov/current/title-17/chapter-II/part-275)
- [Form ADV — Uniform Application for Investment Adviser Registration](https://www.sec.gov/about/forms/formadv.pdf)
- [SEC Interpretation Regarding Standard of Conduct for Investment Advisers (IA-5248)](https://www.sec.gov/rules/interp/2019/ia-5248.pdf)
- [Custody Rule (17 CFR 275.206(4)-2)](https://www.ecfr.gov/current/title-17/chapter-II/part-275/section-275.206(4)-2)

---
## Public Company

# Public Company Obligations

## Applicability

Load when ANY of the following is present: SEC reporting company, public company governance, Sarbanes-Oxley (SOX) compliance, periodic reporting (10-K, 10-Q, 8-K), proxy solicitation, Regulation FD, say-on-pay, audit committee requirements, CEO/CFO certification, internal controls over financial reporting, stock exchange listing standards, or IPO readiness assessment.

## Key Requirements

### Sarbanes-Oxley Act — Officer Certifications (Section 302)

- **What**: CEO and CFO must personally certify each annual (10-K) and quarterly (10-Q) report filed with the SEC, attesting to the accuracy of financial statements and effectiveness of disclosure controls and procedures.
- **Threshold/Timeline**: Certification required with every 10-K and 10-Q filing. Certifying officers must attest that: (1) they have reviewed the report; (2) it does not contain material misstatements or omissions; (3) financial statements fairly present the company's financial condition; (4) they are responsible for establishing and maintaining disclosure controls and procedures and internal controls over financial reporting; (5) they have disclosed any material changes in internal controls and any fraud involving management or employees with a significant role in internal controls. Applies to all SEC reporting companies regardless of size.
- **Consequence**: False certification: civil liability under Section 302 (no specific statutory penalty but forms basis for SEC enforcement and private securities fraud claims). The certification creates personal accountability and cannot be delegated.

### Sarbanes-Oxley Act — Internal Controls (Section 404)

- **What**: Management must assess and report on the effectiveness of internal controls over financial reporting (ICFR). For larger companies, the external auditor must also attest to management's assessment.
- **Threshold/Timeline**: Section 404(a) — management assessment: required for ALL SEC reporting companies; management must include an internal control report in the annual 10-K. Section 404(b) — auditor attestation: required for "accelerated filers" (public float $75M+) and "large accelerated filers" (public float $700M+); smaller reporting companies (public float below $75M or revenues below $100M with public float below $250M) and emerging growth companies (EGCs) are exempt from auditor attestation. EGC status: available for up to 5 years after IPO for companies with less than $1.235B in annual revenue, subject to other thresholds.
- **Consequence**: Material weaknesses in ICFR must be disclosed and may trigger restatements, SEC comment letters, shareholder lawsuits, and negative market reaction. Auditor attestation adds significant cost ($500K-$2M+ annually for mid-size companies).

### Sarbanes-Oxley Act — Criminal Penalties (Section 906)

- **What**: Criminal certification requirement — CEO and CFO certify that periodic reports fully comply with Exchange Act requirements and that financial statements fairly present the company's financial condition.
- **Threshold/Timeline**: Required with every 10-K and 10-Q filing. Separate from and in addition to Section 302 civil certification. Knowing violation: fine up to $1M and/or imprisonment up to 10 years. Willful violation: fine up to $5M and/or imprisonment up to 20 years.
- **Consequence**: These are personal criminal penalties on the certifying officers, not on the company. The distinction between "knowing" and "willful" determines penalty severity. Officers cannot delegate the certification obligation.

### Periodic Reporting Obligations

- **What**: SEC reporting companies must file periodic reports disclosing financial results, material events, and other information required by SEC rules.
- **Threshold/Timeline**: Form 10-K (annual report): due 60 days after fiscal year end for large accelerated filers, 75 days for accelerated filers, 90 days for all other filers (non-accelerated filers). Form 10-Q (quarterly report): due 40 days after fiscal quarter end for large accelerated and accelerated filers, 45 days for all other filers. Form 8-K (current report): due within 4 business days of triggering event for most items. Triggering events include: entry into or termination of material agreements, completion of acquisition/disposition, creation of financial obligations, defaults, bankruptcy, changes in auditors, director/officer changes, amendments to charter/bylaws, and financial results (Item 2.02 earnings releases). Regulation S-K prescribes the content requirements; Regulation S-X prescribes financial statement requirements.
- **Consequence**: Late filings result in loss of eligibility for short-form registration statements (Form S-3), potential delisting notices from stock exchanges, SEC enforcement action, and investor lawsuits. Delinquent filers may be subject to SEC administrative proceedings and revocation of registration.

### Proxy Rules (Regulation 14A)

- **What**: Rules governing the solicitation of proxies from shareholders for annual and special meetings, including disclosure requirements for proxy statements.
- **Threshold/Timeline**: Proxy statement (Schedule 14A): must be filed with the SEC and delivered to shareholders at least 20 business days before the shareholder meeting (40 days for contested elections). Required disclosures include: executive compensation (including CD&A for larger companies), director nominees and independence, related-party transactions, audit committee report, and any matters to be voted on. Rule 14a-8 shareholder proposals: shareholders owning at least $2,000 of securities for at least 3 years (or $15,000 for 2 years, or $25,000 for 1 year) may submit proposals for inclusion in the company's proxy statement. Company may exclude proposals under specified grounds (13 exclusion bases including ordinary business operations, violations of law, personal grievance). Submission deadline: typically 120 days before the anniversary of the prior year's proxy mailing date.
- **Consequence**: Proxy statement deficiencies can result in SEC comment letters, delays in holding shareholder meetings, and private lawsuits challenging the adequacy of proxy disclosures. Failure to comply with proxy rules may void shareholder votes taken at the meeting.

### Regulation FD (Fair Disclosure)

- **What**: Prohibits selective disclosure of material nonpublic information by public companies to securities market professionals and shareholders who may trade on the information.
- **Threshold/Timeline**: When a covered person (officer, director, IR professional, or other authorized spokesperson) discloses MNPI to a securities analyst, institutional investor, or shareholder likely to trade: if intentional, simultaneous public disclosure is required (via Form 8-K or press release disseminated through broadly accessible channels); if unintentional, public disclosure must be made "promptly" (within 24 hours or before the next trading session, whichever is later). Exceptions: disclosures to persons who owe a duty of trust or confidence (attorneys, auditors, investment bankers under NDA), disclosures to credit rating agencies, and disclosures made in connection with registered securities offerings.
- **Consequence**: Regulation FD violations can result in SEC enforcement actions (cease-and-desist orders, civil penalties) against both the company and the individual who made the selective disclosure. While Reg FD violations do not create a private right of action directly, they can support fraud-on-the-market claims in class action securities litigation.

### Say-on-Pay and Executive Compensation (Dodd-Frank)

- **What**: Dodd-Frank Act requires periodic advisory shareholder votes on executive compensation and golden parachute arrangements.
- **Threshold/Timeline**: Say-on-pay: non-binding advisory vote on executive compensation at least every 3 years (most companies hold annually). Say-on-frequency: non-binding advisory vote on how often to hold say-on-pay votes (every 1, 2, or 3 years), held at least every 6 years. Say-on-golden-parachutes: non-binding advisory vote on golden parachute compensation arrangements in connection with M&A transactions requiring shareholder approval. Pay vs. performance: companies must disclose the relationship between executive compensation actually paid and the company's financial performance (Item 402(v) of Reg S-K). Pay ratio disclosure: companies must disclose the ratio of CEO annual total compensation to the median employee's annual total compensation. Clawback policy: SEC Rule 10D-1 and exchange listing standards require companies to adopt and enforce policies for recovery of erroneously awarded incentive-based compensation following accounting restatements.
- **Consequence**: While say-on-pay votes are advisory and non-binding, negative votes (less than 70% support) attract negative proxy adviser recommendations, media attention, shareholder activism, and potential litigation. Failure to adopt a compliant clawback policy results in delisting.

### Audit Committee Independence and Requirements

- **What**: Public company audit committees must be composed entirely of independent directors with specified financial expertise, and must directly oversee the external audit relationship.
- **Threshold/Timeline**: SOX Section 301 and exchange listing standards: all audit committee members must be independent (no affiliation with the company other than as a director, no consulting or advisory fees). At least one member must be an "audit committee financial expert" as defined by SEC rules (understanding of GAAP, financial statements, internal controls, and audit committee functions). Audit committee must: directly appoint, compensate, and oversee the external auditor; pre-approve all audit and permitted non-audit services; establish procedures for receiving and addressing complaints regarding accounting, internal controls, and auditing matters (whistleblower procedures); have authority to retain independent legal, accounting, and other advisors.
- **Consequence**: Non-compliance with audit committee requirements can result in delisting, SEC enforcement, and increased litigation risk. Auditor independence failures (prohibited non-audit services, personal relationships) can result in restatements and SEC sanctions against both the auditor and the company.

## Common Contract Issues

- IPO-readiness assessments underestimating the time and cost to achieve SOX 404 compliance (12-18 months typical).
- Employment agreements and equity plans lacking compliant clawback provisions required by Rule 10D-1.
- Insider trading policies not updated for amended Rule 10b5-1 requirements (cooling-off periods, plan limitations).
- Earnings guidance practices creating Regulation FD exposure through selective analyst briefings.
- Director and officer indemnification agreements not coordinated with SOX certification obligations and D&O insurance.
- Shareholder agreements with information rights that conflict with Regulation FD and selective disclosure prohibitions.
- M&A agreements failing to address target's ongoing SEC reporting obligations during the pre-closing period.
- Executive compensation arrangements not structured to comply with Section 280G, Section 162(m), and clawback requirements.

## Interaction with Other Areas

- **Securities (Insider Trading)**: Regulation FD, Section 16, and trading policies are core intersections; blackout periods must coordinate with periodic reporting schedules.
- **Securities (Equity Issuance)**: Public company equity plans require Form S-8 registration; Section 16 applies to officer and director equity compensation; 10b5-1 plans needed for insider dispositions.
- **Securities (Exemptions)**: Public companies may use Form S-3 for shelf registrations (subject to eligibility tied to timely filing); private placements require Form D filing in addition to 8-K disclosure.
- **Corporate (Governance)**: Board composition, committee structure, and independence requirements are driven by SOX, exchange listing standards, and state corporate law together.
- **Employment**: Executive compensation, severance, and change-of-control arrangements must comply with proxy disclosure, say-on-pay, clawback, and Section 280G requirements.
- **Litigation**: Securities class actions (Section 10(b)/Rule 10b-5), derivative actions, and proxy contest litigation are primary litigation risks for public companies.

## Sources

- [Sarbanes-Oxley Act of 2002 (15 USC 7201 et seq.)](https://www.law.cornell.edu/uscode/text/15/chapter-98)
- [SEC Regulation S-K — Disclosure Requirements (17 CFR Part 229)](https://www.ecfr.gov/current/title-17/chapter-II/part-229)
- [Regulation FD (17 CFR 243.100-103)](https://www.ecfr.gov/current/title-17/chapter-II/part-243)
- [SEC Rule 10D-1 — Clawback (17 CFR 240.10D-1)](https://www.ecfr.gov/current/title-17/chapter-II/part-240/subpart-A/subject-group-ECFR53bf57d5765085a/section-240.10D-1)
- [SEC Proxy Rules — Regulation 14A (17 CFR 240.14a)](https://www.ecfr.gov/current/title-17/chapter-II/part-240/subpart-A/subject-group-ECFRd51a62de5765085/section-240.14a-1)
- [Dodd-Frank Wall Street Reform Act — Title IX (Public Law 111-203)](https://www.law.cornell.edu/topn/dodd-frank_wall_street_reform_and_consumer_protection_act)
