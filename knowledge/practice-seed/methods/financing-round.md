---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Financing Round

Reference guide for supporting a company-side venture financing — from term sheet through closing. Use when the company is raising a priced equity round, a SAFE or convertible note round, or reviewing a term sheet from an investor. This is a coverage checklist, not a deal script: depth scales with round size, investor sophistication, and how far the term sheet deviates from market.

Company counsel represents the company, not the founders. Keep that distinction visible throughout — see the conflicts section below.

## Scaling the review

- **SAFE/note round with standard YC or NVCA instruments** — verify the instrument is actually unmodified, confirm the securities compliance steps, model the dilution. Hours, not weeks.
- **Seed priced round on NVCA forms** — full term sheet review, light definitive-document negotiation, standard diligence prep. The disclosure schedule is most of the work.
- **Series A and later** — everything below applies in full. Lead-investor counsel will run a real diligence process; get ahead of it with the readiness section.
- **Down round or inside round** — heightened fiduciary scrutiny (interested-director approvals, possibly a rights offering to cleanse), plus anti-dilution math on existing preferred. Escalate early; process protections must be designed before the term sheet, not after.

## Term sheet review priorities

The term sheet sets 90% of the economics and control terms. Definitive documents rarely walk back what the term sheet concedes, so spend the negotiating capital here.

**Economics:**
- **Valuation mechanics** — confirm whether the price is pre-money or post-money and what the share count includes:
  - The option pool increase is usually baked into the pre-money ("option pool shuffle"), which shifts the dilution to existing holders. Negotiate the pool size against an actual hiring plan, not a default percentage.
  - Confirm whether outstanding SAFEs and notes convert inside or outside the stated valuation — this materially changes the per-share price.
  - Model the fully diluted cap table both ways before agreeing to anything.
- **Liquidation preference** — 1x non-participating is market. Flag participating preferred, multiples above 1x, or seniority stacks over existing preferred; each shifts exit proceeds away from common.
- **Anti-dilution** — broad-based weighted average is market. Full ratchet is a RED-level deviation; narrow-based weighted average warrants pushback.
- **Pro-rata rights** — standard for major investors. Check the "major investor" threshold and whether rights are capped at maintaining (not increasing) ownership. Super pro-rata rights constrain future rounds.
- **Dividends** — non-cumulative, when-as-if-declared is market. Cumulative dividends are a disguised preference increase.
- **Redemption rights** — investor put rights forcing the company to buy back shares after a period. Increasingly rare and rarely exercised, but they create a debt-like overhang and can complicate later financings — resist, or push the trigger far out with board discretion on payment schedule.
- **Pay-to-play** — penalizes investors who don't participate in future down rounds (conversion to common or loss of rights). Generally company-favorable; know what it does to your existing investor base before agreeing either way.

**Control:**
- **Board composition** — count the votes post-closing: founder seats, investor seats, independents. A board the investors control is a fundamentally different governance posture than a founder-controlled board; make sure the client understands which one they're agreeing to.
- **Protective provisions** — the standard NVCA list (charter amendments, new senior stock, sale of the company, debt thresholds, dividends, redemptions) is acceptable. Flag operational vetoes (budget approval, hiring, ordinary-course contracts) — those belong to the board, not a stockholder class vote.
- **Drag-along** — confirm the trigger (board + preferred majority + common majority is common) and that dragged holders get the same terms, no-fault reps only, and liability capped at proceeds.
- **Founder vesting and acceleration** — investors often ask founders to re-vest some portion. Check the credit for time served, the vesting schedule going forward, and acceleration (single vs. double trigger). This term is where company counsel and founder interests visibly diverge — say so out loud.

**Other term sheet items to check:** no-shop/exclusivity duration (30-45 days is typical), expense reimbursement cap, binding vs. non-binding provisions (confidentiality and no-shop bind; the rest shouldn't), and any conditions to closing that hide diligence outs.

## Diligence readiness

Run this before the investor's diligence list arrives — finding the problem first is always cheaper.

- **Cap table hygiene** — every issuance traceable to a board consent and a signed instrument; ledger matches the stock plan and the charter's authorized shares; no handshake equity promises floating in offer letters or emails.
- **IP assignment chain** — every founder, employee, and contractor who touched the product has a signed invention assignment with present-tense assignment language. Founders' pre-incorporation work is the classic gap — confirm it was assigned to the company. See the `ip-assignment` method.
- **409A currency** — a valuation that is current (within 12 months and no intervening material event) supports the option grants on the books. A stale 409A is both a diligence flag and a tax problem; see the `equity-compensation` method.
- **Employee paperwork** — offer letters, CIIAs, and contractor agreements on file for everyone; contractor classification defensible; any equity promised in writing actually granted.
- **Corporate records** — charter and bylaws as currently in effect, board and stockholder consents complete and signed, qualified to do business where required, franchise taxes current.
- **Material contracts** — anything with a change-of-control or assignment trigger, exclusivity, or MFN that an investor will ask about. Prior SAFEs and notes especially: know the conversion math before the investor runs it.

## Definitive documents

For priced rounds, the NVCA model documents are the baseline: Stock Purchase Agreement, Amended & Restated Certificate of Incorporation, Investors' Rights Agreement, Right of First Refusal & Co-Sale Agreement, and Voting Agreement. Deviation from the models is what you review for — ask investor counsel to flag changes from the current NVCA forms.

What's actually negotiated at the definitive-document stage:
- Reps and warranties scope, knowledge qualifiers, and the disclosure schedule
- Registration rights mechanics (rarely matter pre-IPO, but check lockup and S-3 thresholds)
- Information and inspection rights thresholds
- ROFR/co-sale carve-outs (estate planning transfers, small-percentage transfers)
- Legal opinion scope, if one is required at all
- Indemnification agreements for the new directors

The disclosure schedule is company counsel's main work product. Under-disclosure creates rep breaches; treat schedule preparation as a diligence exercise, not a formality.

## Securities compliance

- **Exemption** — most rounds rely on Rule 506(b) of Regulation D: accredited investors only as a practical matter, no general solicitation. Confirm nothing in the fundraise looked like general solicitation (demo day pitches, social posts, press) — that can force the round into 506(c) with its verification burden. See `law/securities/exemptions.md`.
- **Bad-actor check** — Rule 506(d) disqualifies the offering if covered persons (the company, directors, certain officers, 20% holders, and the investors themselves) have disqualifying events. Collect bad-actor questionnaires before closing, not after.
- **Form D** — file within 15 days of first sale.
- **Blue sky** — state notice filings (typically Form D notice plus fee) in each state where investors reside. See `law/securities/blue-sky-laws.md` for state-by-state mechanics and traps (New York in particular).
- **Accreditation** — collect investor questionnaires; self-certification suffices for 506(b).

## SAFE and convertible note rounds

Lighter process, but the instruments still have terms worth reading:
- **Valuation cap vs. discount** — confirm which applies and whether the SAFE is pre- or post-money (post-money is the current Y Combinator standard and dilutes founders more than many expect — model it).
- **MFN provisions** — an MFN SAFE inherits better terms given to later investors; track who holds one before issuing new instruments.
- **Notes only:** maturity date and what happens at maturity (extension, conversion, repayment demand), interest rate, and whether the note is secured (it shouldn't be, for a standard seed note).
- **Stacking risk** — multiple SAFEs at different caps convert together at the next priced round. Maintain a running pro forma so the founders see cumulative dilution before signing the next one, not at conversion.
- The same Reg D, bad-actor, Form D, and blue sky analysis applies — SAFEs and notes are securities.

## Closing mechanics

- **Sequencing** — the order matters: board consent approving the round and authorizing the charter → stockholder consent adopting the charter and any waivers → charter filed and ACCEPTED by the state → SPA and ancillaries signed → wires → shares issued. Shares issued before the charter is effective are shares of a class that doesn't exist yet.
- **Approvals inventory** — beyond board and stockholder consents, check what the existing documents require: preferred class votes under the current charter's protective provisions, ROFR and pre-emptive right waivers from existing investors, and any contractual consent rights (lender consents under credit facilities are the commonly missed one).
- **Conditions and deliverables** — conditions to closing satisfied or waived in writing; closing checklist circulated and confirmed by both counsel; good standing certificates and officer certificates dated correctly.
- **Funds flow** — confirmed against the SPA schedule; wires received before stock certificates or book entries issue; any payoff of bridge notes or transaction expenses documented in the flow.
- **Post-closing calendar** — Form D (15 days from first sale), blue sky filings (deadlines vary by state), updated cap table to investors, stock ledger entries, new-director indemnification agreements and D&O coverage confirmation, 83(b)-style cleanup if any founder re-vesting was imposed (see the `equity-compensation` method), and a fresh 409A valuation before the next option grant batch.

## Company counsel vs. founder counsel

Recurring conflict points — name them early rather than discovering them mid-negotiation:
- **Founder re-vesting and acceleration** — company counsel cannot advise founders on terms that pit them against the company. Recommend separate counsel when re-vesting, secondary sales, or founder employment terms are on the table.
- **Founder secondary sales** in the round (founders taking money off the table) — disclosure, pricing, and tax issues run personal to the founder.
- **Who is the client** — say it explicitly at the start of the engagement, especially in founder-led companies where the founders treat company counsel as their own.

## Escalation triggers

- Full-ratchet anti-dilution, participating preferred, or preference above 1x in the term sheet
- Any indication of general solicitation during the raise
- A bad-actor questionnaire that comes back with a disqualifying event
- Investor demands for operational vetoes or board control inconsistent with the stage
- Founder secondary or re-vesting negotiations — separate counsel conversation
- Broken IP assignment chain or material cap table discrepancy discovered in diligence prep
- Non-US investors at ownership or governance levels that could trigger CFIUS review — see `law/international-trade/foreign-investment.md`

## Cross-references

- `law/securities/exemptions.md` — Reg D 506(b)/506(c), Form D, bad-actor rules
- `law/securities/blue-sky-laws.md` — state notice filings
- `law/securities/equity-issuance.md` — issuance mechanics, Rule 701, QSBS
- `law/corporate/investment-transactions.md` — financing structures and deal terms
- `law/corporate/governance.md` — board approvals and consent mechanics
- `law/corporate/shareholder-agreements.md` — voting, ROFR/co-sale, drag-along
- Methods: `ip-assignment`, `equity-compensation`, `due-diligence`, `board-and-governance`
