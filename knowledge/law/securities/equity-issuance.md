---
counsel-os-type: law-area
content-version: "2026-04-08"
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
