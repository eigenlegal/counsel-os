---
counsel-os-type: law-area
content-version: "2026-06-10"
jurisdiction: [us-federal, us-state, international]
---
# Equity Compensation Tax

## Applicability

Load when ANY of the following is present: Section 409A compliance, 409A valuation, 83(b) election, incentive stock option (ISO) tax treatment, nonqualified stock option (NSO/NQSO) tax treatment, restricted stock unit (RSU) taxation, alternative minimum tax (AMT) exposure from equity compensation, early exercise, disqualifying disposition, equity compensation structuring, deferred compensation, or cross-border equity compensation tax issues.

This file covers the tax rules governing equity compensation instruments. For securities law aspects of equity issuance (Rule 701, plan administration, QSBS), see `securities/equity-issuance.md`. The two files are complementary and should often be loaded together.

## Key Requirements

### Section 409A — Nonqualified Deferred Compensation (IRC 409A)

- **What**: Section 409A imposes strict requirements on the timing of deferral elections and distributions of nonqualified deferred compensation (NQDC). Stock options, SARs, RSUs, and other equity awards can constitute NQDC if they do not meet specific exemptions.
- **Threshold/Timeline**: Stock options and SARs are exempt from 409A if all of the following are met:
  - The exercise price is set at or above the fair market value of the underlying stock on the grant date.
  - The option covers "service recipient stock" (common stock of the employer, or the employer's parent in certain structures).
  - The option has a fixed expiration date (not later than 10 years from grant, by convention).
  - No other feature causes deferral (e.g., no reload feature, no deferral of income recognition beyond exercise).
  - If 409A applies (e.g., option granted below FMV), distributions are permitted only upon the following six permissible payment events:
    - (a) Separation from service (with a mandatory 6-month delay for "specified employees" of public companies).
    - (b) Disability (as defined in IRC 409A(a)(2)(C) — unable to engage in substantial gainful activity).
    - (c) Death.
    - (d) Change in control (as narrowly defined in Treas. Reg. 1.409A-3(i)(5) — asset sale, stock sale, or change in board composition meeting specific thresholds).
    - (e) Unforeseeable emergency (severe financial hardship — narrow standard).
    - (f) A fixed date or schedule specified at the time of the initial deferral election.
  - Safe harbor valuations for setting FMV:
    - **Independent appraisal**: Valuation by a qualified independent appraiser (person or firm with relevant experience who regularly performs business valuations), valid for up to 12 months unless a material event occurs (financing round, M&A activity, significant revenue milestone, key hire/departure, material customer win/loss).
    - **Illiquid startup safe harbor**: Valuation by a person with "significant knowledge and experience" in the industry, for companies with no publicly traded securities, no put/call rights tied to a formula, and less than 10 years from inception.
    - **Formula-based safe harbor**: A binding formula applied consistently for all compensatory and non-compensatory purposes — rarely used because of the consistency requirement.
    - Common valuation approaches: market approach (comparable public companies, precedent transactions), income approach (DCF), asset-based approach (net asset value), and backsolve method (deriving common stock value from a recent priced funding round).
- **Consequence**: Violation of 409A — whether from below-FMV pricing, impermissible distribution timing, or improper deferral elections:
  - Immediate income inclusion at vesting (not exercise).
  - 20% additional tax on the deferred amount.
  - Premium interest tax (federal underpayment rate plus 1%) calculated from the date of vesting.
  - Penalties fall on the option holder (not the company), but the company has withholding obligations and faces potential employee lawsuits and securities disclosure issues (material weakness in internal controls).
  - Each mispriced grant is a separate violation — the penalty is per award, not per plan.

### Section 83(b) Elections

- **What**: An 83(b) election allows a service provider who receives restricted property (stock subject to a substantial risk of forfeiture, such as vesting-based repurchase rights) to recognize ordinary income at the time of transfer based on the property's current FMV, rather than deferring income recognition until the restrictions lapse (vesting).
- **Threshold/Timeline**: The election must be filed with the IRS within 30 calendar days of the date the property is transferred.
  - This deadline is absolute — there is no extension, no late-filing relief, no equitable tolling, and no remedy for a missed deadline (even by one day).
  - Filing mechanics:
    - File a written statement with the IRS service center where the taxpayer files their return (certified mail with return receipt recommended for proof of timely mailing).
    - Provide a copy to the transferor (employer/company).
    - Attach a copy to the taxpayer's federal income tax return for the year of transfer.
  - The election is irrevocable once made — it cannot be revoked without IRS consent, which is granted only in extraordinary circumstances (not buyer's remorse or stock value decline).
  - Applies to:
    - Restricted stock awards subject to time-based or performance-based vesting.
    - Early-exercised stock options (where the purchased shares are subject to a company right of repurchase that lapses over the vesting schedule).
    - Profits interests in partnerships and LLCs (where an 83(b) election is standard practice to establish a zero-income inclusion at grant, avoiding ordinary income recognition at each vesting tranche).
- **Consequence**:
  - If the 83(b) election is filed: income is recognized at grant/purchase based on grant-date FMV (often near zero for early-stage startups), and all subsequent appreciation is taxed as capital gain at sale (long-term if held more than 1 year from the transfer date).
  - If the 83(b) election is missed: income is recognized at each vesting date based on then-current FMV, taxed as ordinary income — potentially at dramatically higher values if the company has appreciated.
  - If the recipient forfeits unvested shares after filing an 83(b) election (e.g., leaves the company before full vesting), the tax already paid on forfeited shares cannot be recovered — no deduction is allowed for the lost value.

### ISO Tax Treatment — IRC 422

- **What**: Incentive stock options provide tax-advantaged treatment — no ordinary income tax at exercise if all requirements are met. Gain is taxed entirely as long-term capital gain at sale if the required holding periods are satisfied.
- **Threshold/Timeline**: Eligibility: ISOs may only be granted to employees (not independent contractors, consultants, or non-employee directors).
  - Exercise price must equal or exceed FMV on the grant date (110% of FMV for 10%+ shareholders).
  - $100,000 annual limit: the aggregate FMV of shares (determined at grant date) for which ISOs first become exercisable in any calendar year cannot exceed $100,000. The excess is automatically treated as NSOs (applying the limit in grant-date order).
  - Maximum term: 10 years from grant (5 years for 10%+ shareholders).
  - Holding period for qualifying disposition: shares must be held for at least 2 years from the grant date AND at least 1 year from the exercise date.
  - Disqualifying disposition: sale before both holding periods are met converts the spread at exercise (or the gain, if less) to ordinary income; any remaining gain is capital gain.
  - Post-termination exercise: ISOs must be exercised within 90 days of employment termination to retain ISO status (1 year if termination is due to disability). After 90 days, the option is treated as an NSO.
  - The ISO must be granted under a stockholder-approved plan, within 10 years of the earlier of board adoption or stockholder approval.
- **Consequence**: AMT trap: the spread at exercise (FMV minus exercise price) is an AMT preference item under IRC 56(b)(3).
  - If the spread is large enough, the optionee may owe AMT even though no cash is received at exercise and the shares cannot be sold (especially problematic for pre-IPO exercises).
  - AMT paid may generate a minimum tax credit (IRC 53) usable against regular tax in future years, but the timing mismatch can create severe cash flow problems.
  - The company receives no income tax deduction for qualifying ISO exercises (but does receive a deduction for disqualifying dispositions equal to the ordinary income recognized by the employee).
  - Early exercise of ISOs combined with an 83(b) election can start both the ISO holding periods and the capital gains holding period simultaneously, but the AMT preference item applies at exercise regardless.

### NSO Tax Treatment

- **What**: Nonqualified stock options are taxed as ordinary income at exercise on the spread between the exercise price and the FMV of the shares received. NSOs may be granted to any service provider.
- **Threshold/Timeline**:
  - Available to employees, independent contractors, consultants, non-employee directors, and advisors.
  - No $100,000 annual limit on the value of exercisable options.
  - No statutory holding period for favorable tax treatment at exercise (but shares held for more than 1 year after exercise qualify for long-term capital gain treatment on subsequent appreciation).
  - Exercise price must be at or above FMV on the grant date to avoid Section 409A treatment.
  - Withholding at exercise (employer obligations):
    - Federal income tax: supplemental rate of 22% (37% for amounts exceeding $1 million in the calendar year).
    - Social Security: 6.2% up to the wage base ($176,100 for 2025).
    - Medicare: 1.45% (plus 0.9% additional Medicare tax on wages exceeding $200,000).
    - Applicable state and local income tax.
  - The company receives an income tax deduction equal to the ordinary income recognized by the recipient (IRC 83(h)), subject to the IRC 162(m) limitation ($1 million annual deduction cap) for "covered employees" of publicly traded companies.
- **Consequence**: NSO exercises create an immediate cash tax obligation for the recipient, even if the shares are not sold (cash-flow-negative exercise). Failure by the company to properly withhold at exercise creates employer liability for the unpaid withholding amounts. Recipients who exercise and hold bear the risk of the stock declining below the tax basis while still owing tax on the exercise spread.

### RSU Taxation

- **What**: Restricted stock units are a promise to deliver shares (or their cash equivalent) upon satisfaction of vesting conditions. Unlike restricted stock, no property is transferred at grant — the recipient has no ownership rights (no voting, no dividends) until settlement.
- **Threshold/Timeline**: Taxed as ordinary income upon delivery/settlement based on FMV at that time.
  - Section 409A treatment: RSUs are deferred compensation subject to 409A unless settled within the "short-term deferral" period — by March 15 of the year following the year in which the RSU vests (Treas. Reg. 1.409A-1(b)(4)).
  - Pre-IPO "double trigger" RSUs: for private companies, RSUs commonly vest on a time-based schedule but do not settle until a liquidity event (IPO, direct listing, or qualifying acquisition).
    - This structure avoids creating a tax liability when there is no liquid market to sell shares to cover the tax.
    - Double-trigger RSUs require careful 409A structuring — typically structured as a short-term deferral measured from the later of time-based vesting or the liquidity event.
    - The definition of "liquidity event" must be carefully drafted to satisfy 409A's change-in-control or specified-date rules.
  - Post-IPO: RSUs typically settle promptly upon vesting (same-day or next-day settlement) to stay within the short-term deferral exemption.
  - Withholding at settlement: federal income tax (supplemental rate), FICA (both employee and employer portions, including the employer FICA cost which falls on the company), and state/local income tax.
  - Withholding methods: sell-to-cover (most common — a portion of delivered shares is sold on the market to cover taxes), net settlement (company withholds shares equal to the tax obligation and remits cash), or same-day sale.
- **Consequence**: RSUs that defer settlement beyond the short-term deferral period without proper 409A structuring trigger 409A penalties (20% additional tax plus premium interest on the holder). Employees of pre-IPO companies with double-trigger RSUs face a large "tax bomb" at IPO when all previously vested RSUs settle simultaneously. Companies must plan for the employer FICA obligation at settlement, which is in addition to the employee's obligation.

### Cross-Border Equity Compensation

- **What**: Employees who receive equity compensation while working in multiple jurisdictions face allocation of income across jurisdictions, potential double taxation, and complex withholding obligations for the employer.
- **Threshold/Timeline**: Income allocation: most jurisdictions allocate equity compensation income based on the proportion of the vesting period (grant-to-vest) spent working in each jurisdiction.
  - Example: employee is granted options while working in the U.S., moves to the UK two years into a four-year vest — the UK may tax 50% of the exercise gain, and the U.S. may tax 100% with a foreign tax credit for UK taxes paid.
  - Treaty relief may be available under the dependent personal services (employment income) or specific stock option articles, but treaties vary significantly in their treatment of equity compensation.
  - Social security: totalization agreements between the U.S. and approximately 30 countries prevent dual social security taxation, but not all agreements explicitly address equity compensation income.
  - Employer withholding obligations: the employer may have withholding obligations in multiple jurisdictions for a single equity event, requiring split reporting and multi-jurisdiction payroll processing.
  - Country-specific rules: some jurisdictions (e.g., France) impose additional social charges or require specific equity plan registration. China and India have restrictions on cross-border equity plan participation.
  - Reporting: each jurisdiction has its own reporting requirements (e.g., U.S. Form W-2, UK Form 42 annual return, etc.).
- **Consequence**: Failure to properly allocate income and withhold in all applicable jurisdictions creates employer liability in each. Double taxation may occur where treaties do not provide full relief or where the employee's country of residence does not grant a credit for source-country taxes on equity compensation. Mobile employees receiving large equity awards face the most acute risk. Tax equalization provisions (see `tax-indemnities.md`) are often needed for internationally mobile employees.

## Interaction with Other Areas

- **Securities (Equity Issuance)**: The securities law requirements for equity issuance (Rule 701 exemptions, plan administration, blue sky filings, QSBS eligibility) apply in parallel with the tax rules described here. See `securities/equity-issuance.md` for cap table management, vesting mechanics, and acceleration provisions.
- **Employment**: Equity compensation terms must align with employment agreements, offer letters, and severance agreements. Change-in-control acceleration provisions have both tax (IRC 280G golden parachute — 20% excise on excess parachute payments exceeding 3x base amount) and employment law implications.
- **Corporate (M&A)**: Treatment of outstanding options and RSUs in M&A (assumption, substitution, acceleration, cash-out) requires coordinated tax, securities, and corporate analysis. 409A compliance is critical for post-closing treatment of assumed or rolled-over awards.
- **Tax Indemnities**: M&A tax indemnities should address 409A exposure in the target's equity compensation program, potential liabilities from historical option mispricing, and 280G parachute payment obligations (see `tax-indemnities.md`).
- **International Tax**: Cross-border equity compensation triggers PE risk (employees exercising options while on assignment abroad may create a PE), withholding in multiple jurisdictions, and treaty-based allocation issues (see `international-tax.md`).

## Sources

- [IRC Section 409A — Nonqualified Deferred Compensation (26 USC 409A)](https://www.law.cornell.edu/uscode/text/26/409A) — Deferred compensation timing and distribution rules
- [Treasury Regulations 1.409A — Nonqualified Deferred Compensation (26 CFR 1.409A)](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFRc280e685872e4fd) — Detailed 409A regulations including safe harbor valuations
- [IRC Section 83 — Property Transferred in Connection with Services (26 USC 83)](https://www.law.cornell.edu/uscode/text/26/83) — Restricted property and 83(b) elections
- [IRC Section 422 — Incentive Stock Options (26 USC 422)](https://www.law.cornell.edu/uscode/text/26/422) — ISO eligibility, limits, and holding period requirements
- [IRC Section 56(b)(3) — AMT Adjustments for ISOs (26 USC 56)](https://www.law.cornell.edu/uscode/text/26/56) — AMT preference item for ISO exercises
- [IRS Notice 2005-1 — Section 409A Guidance](https://www.irs.gov/irb/2005-02_IRB#NOT-2005-1) — Initial 409A interpretive guidance and transitional rules
