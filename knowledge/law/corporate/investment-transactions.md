---
counsel-os-type: law-area
content-version: "2026-04-08"
jurisdiction: [us-federal, us-state]
---
## Investment Transactions

# Investment Transactions

## Applicability

Load when any of the following arise: SAFE agreements, convertible notes, preferred stock financings, venture capital or angel investments, Series Seed or Series A+ rounds, preemptive rights or anti-dilution provisions, liquidation preference analysis, protective provisions negotiation, information rights, pro rata rights, or investor rights agreements.

## Key Requirements

### SAFE Agreements (Simple Agreement for Future Equity)

- **What**: A SAFE is an investment instrument that converts into equity upon a triggering event (typically a priced equity round, dissolution, or change of control). Post-money SAFEs (Y Combinator standard since 2018) calculate ownership based on a post-money valuation cap, giving investors a deterministic ownership percentage at the time of investment.
- **Threshold/Timeline**: Valuation cap sets the maximum price at which the SAFE converts. Discount rate (typically 15-25%) applies when conversion price at the triggering round exceeds the cap. Post-money SAFEs include the SAFE itself and all other converting securities in the post-money capitalization but exclude the new money in the priced round. No maturity date, no interest, no repayment obligation (unlike convertible notes).
- **Consequence**: SAFEs are not debt instruments and do not appear on the balance sheet as liabilities in most accounting treatments. However, multiple SAFEs with different caps can create complex capitalization scenarios. Post-money SAFEs cause dilution to founders (not to SAFE holders relative to each other) when additional SAFEs are issued at the same cap.

### Convertible Notes

- **What**: A debt instrument that converts into equity upon specified triggering events. Combines debt features (interest, maturity) with equity conversion mechanics.
- **Threshold/Timeline**: Interest rate: typically 2-8% (simple interest, not compounded). Maturity: 12-24 months. Conversion triggers: qualified financing (minimum raise threshold, typically $1M+), change of control, maturity. Valuation cap and discount (typically 15-25%) function similarly to SAFEs. At maturity, if no conversion event has occurred, the note is technically due and payable -- though parties typically extend or convert.
- **Consequence**: Convertible notes are debt -- they create creditor rights, appear as liabilities, and have priority over equity in dissolution. Failure to repay at maturity is an event of default. State usury laws may apply to the interest rate. Securities law compliance is required for issuance (typically Rule 506(b) or 506(c) under Regulation D).

### Preferred Stock -- Liquidation Preference

- **What**: The right of preferred stockholders to receive a specified return on their investment before common stockholders receive any distribution in a liquidation event (including deemed liquidation events such as M&A transactions and asset sales).
- **Threshold/Timeline**: 1x non-participating preferred is the current market standard for venture financings. This entitles the holder to the greater of (a) 1x their original investment amount or (b) their pro rata share of proceeds as if converted to common stock. Participating preferred (less common, more investor-favorable) receives 1x preference plus pro rata share of remaining proceeds. Participation may be capped (e.g., 3x return cap).
- **Consequence**: In down-round or modest-exit scenarios, liquidation preferences can eliminate or substantially reduce common stockholder (founder/employee) returns. Stacked preferences across multiple rounds compound this effect. Seniority among preferred series (standard: last-in, first-out / pari passu within a series) affects distribution waterfall.

### Anti-Dilution Protections

- **What**: Provisions that adjust the conversion price of preferred stock if the company issues equity at a price below the preferred stock's original conversion price (a "down round").
- **Threshold/Timeline**: Broad-based weighted average is the current market standard. It adjusts the conversion price using a formula that accounts for the number of new shares issued and the price reduction, weighted across all outstanding shares (on an as-converted basis). Narrow-based weighted average uses a smaller denominator (only outstanding preferred), resulting in greater adjustment. Full ratchet (rare, highly investor-favorable) adjusts the conversion price to the new lower price regardless of the number of shares issued.
- **Consequence**: Anti-dilution adjustments increase the number of common shares into which preferred stock converts, diluting common stockholders and other series without anti-dilution protection. Pay-to-play provisions (requiring investors to participate in down rounds to maintain anti-dilution protections) are a counterbalance mechanism.

### Protective Provisions

- **What**: Contractual veto rights granted to preferred stockholders (typically voting as a separate class) over specified corporate actions, regardless of the preferred holders' ownership percentage.
- **Threshold/Timeline**: Standard protective provisions (per NVCA model documents) cover: (a) amendment of charter or bylaws adversely affecting preferred rights, (b) authorization or issuance of senior or pari passu securities, (c) redemption or repurchase of equity (other than repurchases at cost from departing employees), (d) declaration of dividends, (e) change in board size, (f) incurrence of debt above a threshold, (g) liquidation, dissolution, or deemed liquidation events. Thresholds for investor consent typically require a majority of the outstanding preferred (or a specific series).
- **Consequence**: Protective provisions give minority investors effective veto power over fundamental corporate decisions. Overly broad protective provisions can create governance deadlocks and impede the company's operational flexibility.

### Information Rights

- **What**: Contractual rights of investors (typically major investors above a specified ownership threshold) to receive periodic financial and operational information from the company.
- **Threshold/Timeline**: Standard information rights (per NVCA model) include: annual audited financial statements (within 120 days of fiscal year end), quarterly unaudited financial statements (within 45 days of quarter end), annual budget and business plan (within 30 days of fiscal year start), and monthly financial statements for larger investors. "Major investor" threshold is typically defined as holders of a specified number of shares (e.g., 500,000 shares) or a percentage of preferred stock.
- **Consequence**: Information rights typically terminate upon an IPO (when public reporting obligations commence). Failure to provide required information can be a breach of the investor rights agreement but is rarely the basis for material legal claims absent other issues.

### Preemptive Rights (Pro Rata Rights)

- **What**: The right of existing investors to participate in future equity issuances to maintain their ownership percentage.
- **Threshold/Timeline**: Typically granted to major investors. The right to purchase a pro rata share of new securities (based on fully diluted ownership) in subsequent rounds. Standard exceptions: employee equity incentive issuances, strategic partner issuances, equipment financing, and acquisitions. Exercise period typically 10-20 days from notice.
- **Consequence**: Preemptive rights can complicate future financings by requiring notice to and participation by existing investors. "Super pro rata" rights (right to invest more than pro rata) are increasingly common in competitive rounds. Rights typically terminate upon IPO.

### Drag-Along and Tag-Along Rights

- **What**: Drag-along rights allow a specified majority to compel all stockholders to participate in a sale. Tag-along rights allow minority holders to participate in a sale on the same terms as the selling majority.
- **Threshold/Timeline**: Drag-along typically requires approval of (a) the board, (b) a majority of preferred stock, and (c) a majority of common stock. Tag-along is triggered when a specified percentage of shares (often 50%+) is being sold to a third party. Tag-along holders have the right to include their shares pro rata.
- **Consequence**: Drag-along prevents minority holdout problems in M&A exits. Tag-along protects minority holders from being left behind in a change-of-control transaction at a less favorable price or without liquidity.

## Interaction with Other Areas

- **Securities**: All investment instruments (SAFEs, convertible notes, preferred stock) are securities. Issuance must comply with federal registration requirements or exemptions (Regulation D Rule 506(b)/506(c), Regulation A, Regulation CF) and state blue sky laws. Accredited investor verification required for Rule 506(c).
- **Corporate (Governance)**: Protective provisions, board composition rights, and voting agreements affect corporate governance. Charter amendments for new preferred series require board and stockholder approval.
- **Corporate (Fiduciary Duties)**: Board must exercise fiduciary duties in approving investment terms, particularly when existing investors lead or participate in rounds (potential conflicts).
- **Employment**: Equity incentive plans, option pools (typically 10-20% of fully diluted shares), and Section 409A valuation requirements for common stock options interact with investment round pricing.
- **Data Privacy**: Investor due diligence may involve disclosure of personal data, requiring compliance with applicable privacy laws.

## Sources

- [Y Combinator SAFE Documents](https://www.ycombinator.com/documents) -- standard post-money SAFE templates and guidance
- [NVCA Model Legal Documents](https://nvca.org/model-legal-documents/) -- industry-standard venture financing documents (term sheet, stock purchase agreement, investor rights agreement, voting agreement, ROFR and co-sale agreement)
- [SEC Regulation D (17 CFR 230.501-508)](https://www.ecfr.gov/current/title-17/chapter-II/part-230/subject-group-ECFRb08764c4afb0640) -- private placement exemption rules
- [IRS Section 409A Regulations](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFR3cd8f1a498fb282/section-1.409A-1) -- deferred compensation rules affecting equity compensation valuation

---
