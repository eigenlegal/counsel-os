---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Trade Compliance Screening

Reference guide for export controls and sanctions screening in deals, vendor onboarding, and customer relationships. Use when evaluating a new counterparty, reviewing a cross-border transaction, assessing whether a product or technical data can be shared with a foreign person, or building screening into a contract. Trade compliance is strict-liability territory — "we didn't know" is not a defense, but a documented, risk-based screening program is the strongest mitigation.

## Who and when to screen

Screen before the relationship starts, not after the contract signs:
- **Counterparties** — customers, vendors, distributors, resellers, channel partners, investors, acquisition targets, and joint venture partners
- **End users and end uses** — for products, software, or technical data, the contracting party is not always the user. Distributors and resellers warrant the most scrutiny because they put distance between you and the actual end user.
- **Beneficial owners** — screen the entity AND its significant owners. Under OFAC's 50% rule, an entity owned 50% or more (individually or in the aggregate) by blocked persons is itself blocked even if it appears on no list. A clean list check on the entity name is not enough for higher-risk jurisdictions; ask who owns it.
- **Individuals** — directors, signatories, and key contacts for higher-risk relationships
- **Banks and payment routes** — a permitted counterparty paying through a sanctioned bank is still a problem

Re-screen at renewal, on assignment or change of control, and when lists update for relationships touching higher-risk jurisdictions.

## Quick decision path

For a routine counterparty check, the sequence is:

1. **Jurisdiction check** — is the counterparty (or its delivery destination, bank, or parent) in or connected to an embargoed or high-risk jurisdiction? Embargoed → stop. High-risk → enhanced diligence including beneficial ownership.
2. **List screening** — run the entity, known owners, and key individuals against the consolidated lists. Clean → document and proceed. Potential match → resolve per the escalation procedure before any commitment.
3. **Ownership check** — for non-routine or higher-risk counterparties, identify beneficial owners and apply the 50% rule. Ownership data is the gap in name-only screening.
4. **Item/classification check** — only if goods, software, or technical data will move: what is the item (EAR99 or ECCN), where is it going, who will use it, for what end use?
5. **Red-flag review** — anything in the deal pattern that doesn't fit? Unresolved red flags stop the transaction regardless of clean list results.

Steps 1-3 apply to every relationship including pure services and investment; steps 4-5 add on when products or technology are involved.

## The two regimes — keep them straight

- **OFAC sanctions** (Treasury) regulate WHO you can deal with and WHERE: blocked persons (SDN List), sectoral restrictions, and embargoed jurisdictions. They apply to all transactions by US persons, not just exports — a sanctions problem can arise from a payment, an investment, or a service with no goods moving at all.
- **BIS export controls under the EAR** (Commerce) regulate WHAT you can ship, transmit, or disclose and to whom: commodities, software, and technology. The question is classification (what is it?) plus destination, end user, and end use.
- A transaction can fail either regime independently. Clear the counterparty under OFAC and still need an export license from BIS — or vice versa.
- Defense articles and services fall under ITAR (State Department) — a separate, stricter regime. If anything touches the US Munitions List, escalate immediately; do not analogize from EAR experience.

See `law/international-trade/sanctions.md` and `law/international-trade/export-controls.md` for the legal detail.

## Restricted-party screening mechanics

- Screen against the consolidated lists at minimum: OFAC SDN and non-SDN lists, BIS Entity List, Denied Persons List, Unverified List, and Military End User List. The government's free Consolidated Screening List covers the main US lists; commercial tools add fuzzy matching, ownership data, and audit trails.
- **Name matching is the hard part** — transliteration variants, abbreviations, and aliases defeat exact-match searches. Use fuzzy matching and resolve potential hits rather than dismissing near-misses.
- A list hit is not automatically a dead end — some list entries restrict only certain items or require a license rather than prohibiting outright. But resolution of any hit is a legal call, not a sales call.
- Document every screen: who was screened, against which lists, on what date, with what result, and how any potential matches were resolved.

## Embargoed jurisdictions

Comprehensive embargoes (currently Cuba, Iran, North Korea, Syria, and the covered regions of Ukraine) prohibit virtually all dealings. Practical handling:
- Block these at the screening layer — no orders, no downloads, no support, no payments
- Watch for indirect exposure: a distributor reselling into an embargoed market creates liability for you
- Partial and sectoral programs (Russia, Belarus, Venezuela, and others) change frequently — check current program status in `law/international-trade/sanctions.md` rather than relying on memory
- Geo-blocking and IP filtering are evidence of a compliance program, not a complete defense — pair them with contractual restrictions and red-flag monitoring

## Classification basics — EAR99 vs. ECCN

- Every item subject to the EAR is either classified under an ECCN on the Commerce Control List or is EAR99 (the residual category for items not specifically listed).
- **EAR99** items move license-free to most destinations — but EAR99 is not a free pass. Embargoed destinations, restricted parties, and prohibited end uses (WMD, military intelligence) still block EAR99 shipments.
- **ECCN-classified** items need a destination-by-destination license analysis using the Commerce Country Chart and available license exceptions.
- Classification is a product-team-plus-legal exercise. Self-classify with documented reasoning, or request a formal classification (CCATS) from BIS when the answer is unclear or the stakes are high.
- Most commercial software with encryption lands in ECCN 5D002 but qualifies for License Exception ENC. Mass-market encryption typically requires a one-time self-classification report or, for some items, a classification request. Confirm whether your products have been self-classified and the annual report filed — this is the most commonly missed filing at software companies.

## Deemed exports

Releasing controlled technology or source code to a foreign national IN the US is an export to that person's home country. Triggers to watch:
- Hiring foreign nationals into roles with access to controlled technology — coordinate with immigration counsel; the I-129 form asks about deemed export licensing directly
- Vendors or contractors abroad (or foreign-national staff of US vendors) getting repository, infrastructure, or documentation access
- Demos, plant tours, and technical discussions with foreign visitors
- EAR99 technology and published/publicly available information generally do not trigger deemed export licensing — classification of the technology, not the software product, drives this analysis

## Red flags

Treat these as stop-and-resolve signals, not paperwork notes — proceeding in the face of an unresolved red flag is itself a violation ("knowledge" includes conscious avoidance):
- Customer is evasive about end use or end user, or refuses standard compliance reps
- Shipping or delivery address inconsistent with the customer's stated business, or routed through a known transshipment hub
- Freight forwarder listed as the final customer
- Payment from an unrelated third party or an unusual jurisdiction
- Order size or product mix inconsistent with the customer's business
- Customer willing to pay above market for no apparent reason, or unconcerned with normal commercial terms (warranties, support)
- Requests to omit or falsify documentation, split shipments below reporting thresholds, or route around geo-blocks

## Screening cadence and recordkeeping

- **Cadence** — at onboarding for everyone; continuous or periodic re-screening (commercial tools do this automatically) for active relationships; event-driven re-screening on renewals, assignments, and major list updates
- **Records** — keep screening results, classification analyses, license determinations, end-user statements, and shipping documents for at least five years (the EAR and OFAC recordkeeping floor; OFAC's statute of limitations is now ten years for some programs, so longer retention is prudent)
- **Escalation path** — a documented procedure for who resolves potential matches and who can approve proceeding; screening without a resolution process is theater

## Contract clauses

Build trade compliance into the paper — see `practice/library/compliance-regulatory.md` for clause language:
- **Compliance reps** — mutual representation of compliance with export control and sanctions laws, plus an ongoing covenant (not just a closing-date snapshot)
- **Restricted-party warranty** — counterparty warrants it is not listed, not owned 50%+ by listed persons, and not located in an embargoed jurisdiction
- **End-use/end-user restrictions** — no resale, re-export, or diversion contrary to US law; flow-down obligation for distributors and resellers
- **Termination right** — immediate termination without liability if the counterparty becomes a restricted party or a transaction would violate sanctions; this is the clause that lets you exit cleanly when a list changes mid-term
- **Anti-boycott** — refuse contract language requiring participation in unsanctioned boycotts (typically Israel-related in Middle East deals); these clauses trigger reporting obligations even when refused. See `law/international-trade/anti-boycott.md`.
- **Audit and information rights** — for distributors: records of onward sales and the right to verify

## Escalation triggers

- Any confirmed or unresolved restricted-party match
- Any touch with an embargoed jurisdiction, however indirect
- Anything potentially ITAR — defense, space, or military-adjacent items or customers
- An unresolved red flag the business wants to proceed past
- Discovery of a past violation — voluntary self-disclosure decisions (to OFAC or BIS) substantially mitigate penalties but are time-sensitive and need senior counsel plus, usually, outside counsel
- Foreign investment in the company from sanctioned-jurisdiction-adjacent or state-owned investors — CFIUS analysis, see `law/international-trade/foreign-investment.md`
- A government inquiry, subpoena, or outreach from BIS, OFAC, or CBP — see the `regulatory-response` method

## Cross-references

- `law/international-trade/export-controls.md` — EAR, ECCN classification, deemed exports, encryption, ITAR boundary
- `law/international-trade/sanctions.md` — OFAC programs, SDN list, 50% rule, embargo status
- `law/international-trade/anti-boycott.md` — boycott-clause reporting obligations
- `law/international-trade/foreign-investment.md` — CFIUS
- `law/international-trade/customs.md` — import-side compliance
- Methods: `vendor-onboarding` (screening as part of vendor intake), `regulatory-response`, `due-diligence`
