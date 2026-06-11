---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Equity Compensation

Reference guide for equity grant mechanics and review — granting options and RSUs, maintaining the plan, and catching the errors that surface later in financings and exits. Use when approving a grant batch, choosing an instrument for a hire, reviewing plan capacity, handling a departing employee's equity, or cleaning up grant history for diligence. Tax detail lives in `law/tax/equity-compensation-tax.md`; securities mechanics (Rule 701) in `law/securities/equity-issuance.md`.

Equity errors are cheap to prevent and expensive to fix — a botched grant usually isn't discovered until a financing or acquisition, when the remediation options are worst.

## Instrument comparison

- **ISOs (incentive stock options)** — employees only:
  - No tax at grant or exercise for regular tax purposes, but the exercise spread is an AMT preference item — large exercises can trigger surprise AMT bills.
  - Capital gains treatment requires holding 2 years from grant AND 1 year from exercise; selling earlier is a disqualifying disposition taxed like an NSO.
  - Statutory limits: $100K of value vesting per year (excess becomes NSO automatically), 10-year term (5 for 10%+ holders, who also need a 110% strike), and the plan must be stockholder-approved.
- **NSOs (nonqualified options)** — anyone, including contractors, advisors, and directors:
  - Ordinary income on the exercise spread, with employer withholding for employees.
  - Simpler and more flexible than ISOs; the default for non-employees and for grants exceeding ISO limits.
- **RSUs** — no purchase price, no exercise decision:
  - Ordinary income at settlement on full share value, with withholding — there is no way to elect out of it (83(b) doesn't apply to RSUs because no property transfers at grant).
  - Standard at later-stage companies where strike prices are high enough that options lose their appeal.
  - Private-company RSUs usually add a liquidity-event condition to the time condition (double-trigger vesting) so tax doesn't hit while shares are illiquid — check the settlement deadline and award-expiration mechanics on these carefully.
- **Restricted stock** — actual shares issued at grant, subject to forfeiture/repurchase until vested:
  - Practical mainly when share value is very low (founders, very early hires) because the grantee pays or is taxed on full share value at grant.
  - This is the instrument where the 83(b) election does the most work — see below.
- **Early-exercise options** — options exercisable before vesting, delivering restricted stock; combines option mechanics with the 83(b) deadline. Confirm the plan permits it and the repurchase right is papered.
- **83(b) elections — the 30-day hard deadline.** Anyone receiving stock subject to vesting (restricted stock, early-exercised options) must file an 83(b) election with the IRS within 30 days of the transfer to be taxed on grant-date value instead of at each vest. The deadline is jurisdictional — no extensions, no relief, no fix. A missed 83(b) on founder stock converts every future vesting date into an ordinary-income event at the then-current value. Make filing-confirmation (with proof of mailing or the IRS online submission receipt) part of the closing checklist for any vesting-stock issuance, and keep the proof in the equity files.

## 409A valuations

- Options must be granted at no less than fair market value on the grant date, or Section 409A imposes immediate taxation plus a 20% penalty on the grantee as the option vests. The safe harbor for private companies is an independent appraisal.
- **A 409A valuation is good for 12 months — or until a material event, whichever comes first.** Material events include a financing term sheet or closing, significant revenue or forecast changes, a major commercial milestone, secondary sales at a different price, and M&A interest.
- **Refresh discipline:** calendar the 12-month expiry; pause grant approvals when a financing is in motion (a signed term sheet generally stales the old valuation — grants priced on the old number in the gap are the classic error); re-order the sequence so the new 409A exists before the post-financing grant batch.
- RSUs don't have a strike price but still need a supportable FMV for income measurement at settlement, and 409A design rules govern their settlement timing.
- Full mechanics and exemption details: `law/tax/equity-compensation-tax.md`.

## Board approval hygiene

- **Every grant needs board (or authorized committee) approval before it exists.** An offer letter promises equity; only the board action grants it. The grant date is the date of board action — not the start date, not the offer letter date.
- **No backdating.** Choosing an earlier "effective" grant date to capture a lower strike is the fact pattern behind option-backdating enforcement. The grant date is the approval date, full stop.
- **Consent discipline** — a written consent is effective when the LAST signature arrives. A consent that sits half-signed for three weeks moves the grant date (and possibly past a 409A staleness event). Use a regular grant cadence (e.g., monthly or per-board-meeting batches) so approvals don't straggle.
- **Approval contents** — recipient, share count, instrument type, strike/price, vesting schedule and start date, and any non-standard terms. "Equity as discussed" in a consent is a cleanup project waiting to happen.
- Delegation to officers (where state law permits, e.g., DGCL 152/157) must stay within board-set parameters — total shares, price floor, recipient class. Audit delegated grants against the resolution.
- See `law/corporate/governance.md` for consent and committee mechanics.

## Plan limits and share reserve

- **Track the reserve continuously** — grants outstanding plus shares issued cannot exceed the plan reserve, and the reserve cannot exceed what the charter authorizes. Grants exceeding the reserve are void or voidable; this surfaces in every financing's diligence.
- Know the plan's counting rules: do forfeited and expired grants recycle to the pool? Do net-settled shares?
- ISO grants additionally draw against the plan's stated ISO limit, and the plan must be stockholder-approved within 12 months of adoption for ISOs to qualify at all.
- **Rule 701** — private-company compensatory grants rely on the Rule 701 exemption, which has annual mathematical caps and triggers expanded financial disclosure to grantees above $10M in a 12-month period. Track 701 usage annually; exceeding the disclosure threshold without delivering disclosures is a rescission-risk problem. See `law/securities/equity-issuance.md`.
- Don't forget state blue sky exemptions for grants to residents of states that require notice filings — see `law/securities/blue-sky-laws.md`.

## Vesting and acceleration

- **Standard schedule** — 4 years, 1-year cliff, monthly thereafter. Deviations (no cliff, front-loaded, milestone-based) deserve a reason in the approval.
- **Single trigger** (vesting accelerates on change of control alone) — rare and disfavored; it makes the team more expensive to acquire and acquirers negotiate against it.
- **Double trigger** (change of control PLUS involuntary termination within a protection window, typically 12 months) — the market standard for executives; increasingly common for broader populations at a partial percentage.
- Check the interaction set: what counts as "cause" and "good reason," treatment of unvested equity on termination without cause, post-termination exercise windows (90 days is standard; extended windows convert ISOs to NSOs after the statutory period), and repurchase rights on vested shares if the company uses them.
- Golden-parachute math: large executive acceleration can trigger IRC 280G excise taxes in an acquisition — flag any executive package with significant acceleration for 280G analysis before a deal, not during one. See `law/tax/equity-compensation-tax.md`.

## International grantees

Granting US-plan equity to non-US employees or contractors imports each country's tax, securities, labor, and exchange-control rules — there is no generic answer. Flag for local advice whenever a grant crosses a border. Recurring issues:
- Local securities filings or prospectus exemptions for employee offerings
- Tax at grant rather than exercise in some jurisdictions; employer withholding and social-charge obligations that exceed US analogues
- Local sub-plans or country addenda required for tax-favored treatment (or to disclaim local employment-law entitlements — in some jurisdictions vesting equity can count toward severance)
- Contractors and entities without a local employer-of-record complicate withholding further
- Cross-border moves mid-vesting create trailing-liability allocation between countries
- See `law/tax/international-tax.md` and `law/tax/withholding.md`; engage local counsel per country rather than improvising.

## Tender offers and secondaries

- A company-organized buyback or third-party purchase from multiple holders is likely a tender offer requiring a compliant process (20-business-day window, equal treatment, disclosure document). One-off individual secondary sales are simpler but still need transfer-restriction, ROFR, and securities-exemption checks.
- Secondary sale prices are a 409A input — a secondary at a premium to the current 409A value can stale the valuation.
- Insider-trading exposure exists in private-company secondaries too: the company and insiders trading with material nonpublic information (an unannounced acquisition offer, a financing) face real liability. See `law/securities/insider-trading.md`.
- Coordinate with the cap table: ROFR waivers, board approval of transfers, and updated ledger entries.

## Common errors to screen for

These are the findings that recur in financing and M&A diligence:
- **Expired 83(b)s** — vesting stock issued without a timely election, or no proof of filing retained
- **Grants priced on a stale 409A** — especially grants approved between term sheet and closing
- **Missing board consents** — equity promised in offer letters but never approved, or consents signed after the stated grant date
- **Reserve overruns** — grants exceeding the plan pool or charter-authorized shares
- **ISO violations** — $100K limit not tracked, ISOs granted to contractors, plan never stockholder-approved
- **Rule 701 disclosure threshold crossed silently**
- **Post-termination lapses** — terminated employees' grants never cancelled in the ledger, or exercises accepted after expiration
- **Acceleration promises in offer letters that the plan documents don't reflect**

Remediation is fact-specific and usually requires board action (ratification, regrant, or repricing analysis) — escalate rather than papering over.

## Escalation triggers

- Any grant batch proposed while a financing term sheet is outstanding
- A missed 83(b) deadline or unverifiable filing proof
- Discovery of backdating or approval-after-the-fact patterns
- ISO/NSO misclassification or $100K-limit breaches affecting multiple grantees
- First grant into a new country
- Any organized secondary, tender offer, or repurchase program
- Executive packages with acceleration needing 280G analysis
- Option repricing or exchange proposals — tax, accounting, and (if 500+ holders) tender-offer rules all apply

## Cross-references

- `law/tax/equity-compensation-tax.md` — 409A, 83(b), ISO/NSO/RSU tax treatment, AMT, 280G
- `law/tax/withholding.md`, `law/tax/international-tax.md` — withholding and cross-border grant taxation
- `law/securities/equity-issuance.md` — Rule 701, issuance mechanics, QSBS
- `law/securities/blue-sky-laws.md` — state filings for grants
- `law/securities/insider-trading.md` — secondaries and MNPI
- `law/corporate/governance.md` — board approvals, consents, delegation
- `law/employment/employee-benefits.md` — plan administration and benefits interaction
- Methods: `financing-round`, `employment-agreement`, `board-and-governance`
