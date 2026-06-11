---
counsel-os-type: practice
content-version: "2026-06-11"
---
# Consumer-Facing Terms

Reference guide for reviewing or drafting consumer terms of service, EULAs, and subscription terms. Consumer terms differ from B2B contracts in kind, not degree: consumer-protection statutes set floors that drafting cannot waive, assent must be proven rather than assumed, and aggressive terms create enforcement and class-action exposure instead of mere negotiation friction. For B2B agreements, use `practice/methods/saas-agreement.md` and `practice/methods/contract-review.md` instead.

## Review Sequence

1. **Assent flow first.** Get screenshots of the live signup, checkout, and cancellation flows. If assent fails, nothing else in the document matters.
2. **Enforcement magnets second.** Auto-renewal, cancellation, arbitration, and unilateral amendment draw the regulators and the class bar — review these against the current law, not last year's template.
3. **Floors third.** Check disclaimers and caps against the statutory floors they cannot pierce.
4. **Consistency last.** Read the marketing, the help-center copy, and the checkout screens against the terms. The gap between promise and terms is the UDAP claim.

## Coverage Map

| Area | The check | Where the law lives |
|---|---|---|
| Assent | Clickwrap, conspicuous, records kept | caselaw via `law/litigation/arbitration.md` |
| Arbitration / class waiver | Fairness features, mass-arb exposure | `law/litigation/arbitration.md`, `law/litigation/class-actions.md` |
| Auto-renewal | Disclosure, consent, reminders | `law/consumer-protection/auto-renewal.md` |
| Cancellation / refunds | Click-to-cancel symmetry | `law/consumer-protection/auto-renewal.md` |
| Amendments | Notice + fresh assent, not posting | `law/consumer-protection/ftc-udap.md` |
| Disclaimers / caps | Statutory floors, conspicuousness | `law/consumer-protection/magnuson-moss.md` |
| Flow design | Dark patterns | `law/consumer-protection/dark-patterns.md` |
| Minors | COPPA, voidability, teen design laws | `law/data-privacy/coppa.md` |
| Accessibility | WCAG conformance of key flows | `law/accessibility/website-accessibility.md` |
| Catch-all | Net impression vs. marketing | `law/consumer-protection/ftc-udap.md`, `law/consumer-protection/state-consumer-laws.md` |

## Assent Architecture

Unenforceable assent makes every other clause academic — check this first.

- **Clickwrap** (user takes an affirmative action — checks a box or clicks "I agree" — with the terms presented or conspicuously hyperlinked at that moment) is reliably enforced. This is the standard to draft to.
- **Browsewrap** (terms linked in a footer, assent inferred from use) is routinely refused enforcement. If the flow relies on browsewrap, flag it as a structural defect, not a drafting nit.
- **Sign-in wrap** (notice near a signup button: "By signing up, you agree to...") is enforced when the notice is conspicuous and the link works — courts scrutinize screen layout, font size, and link placement. Get screenshots of the actual flow; review the flow, not just the document.
- Verify assent records are kept: who agreed, to which version, when. Arbitration motions fail for lack of proof of assent more than for the clause's content.
- Material changes need fresh assent — see Unilateral Amendments below.

## Arbitration and Class Waiver

- Mandatory arbitration with class waiver is generally enforceable under the FAA, but only on top of valid assent and basic fairness. Doctrine and drift in `law/litigation/arbitration.md`; class-action mechanics in `law/litigation/class-actions.md`.
- Check the fairness features courts and the FAA caselaw expect: company pays arbitration fees above a nominal filing fee, consumer-convenient venue or remote hearings, small-claims-court carve-out, no shortened limitations periods, no remedy stripping (statutory damages and attorney-fee rights preserved).
- **Mass-arbitration exposure:** the class waiver's historic payoff has a new cost — thousands of individual filings each carrying per-case fees. Check for batching/bellwether procedures and a pre-filing informal-resolution step; weigh whether arbitration still serves the company at its claim volume.
- Opt-out rights (30+ days, simple mechanism) strengthen enforceability and are required by some state caselaw to avoid unconscionability findings.
- Jury-trial waivers and venue clauses outside arbitration are state-sensitive; some states void them for consumers (`law/consumer-protection/state-consumer-laws.md`).
- Align with our default dispute posture in `practice/standards/dispute-resolution.md` — note where the consumer context forces departures from the B2B position.

## Auto-Renewal and Negative Option

The most actively enforced area of consumer terms. Requirements, state-by-state variations, and the FTC negative-option landscape live in `law/consumer-protection/auto-renewal.md` — check the current rule status there rather than assuming; the regime has been litigated heavily.

- Clear and conspicuous disclosure of renewal terms before checkout: price, billing frequency, renewal date, cancellation method — adjacent to the purchase button, not buried in the terms.
- Affirmative consent to the auto-renewal itself (a separate or clearly-inclusive consent, not just general terms acceptance).
- Post-purchase acknowledgment containing the renewal terms and cancellation instructions.
- Renewal reminders: several states require advance notice before renewal, especially for longer terms or after free trials converting to paid. Free-trial-to-paid conversion is the highest-enforcement pattern.

## Cancellation and Refunds

- **Click-to-cancel symmetry:** cancellation must be at least as easy as signup — online signup means online cancellation, no retention-call gauntlet. State analogs to the federal rule impose this independently (`law/consumer-protection/auto-renewal.md`, `law/consumer-protection/state-consumer-laws.md`).
- Retention offers ("save flows") are permitted but cannot obstruct: one offer, then immediate cancellation.
- Refund policy must be disclosed pre-purchase and honored as written; "no refunds" terms yield to state cooling-off rights and UDAP claims where the service fails. Map terms against `practice/standards/termination-renewal.md` for the company default and consumer-specific departures.

## Unilateral Amendments

- "We may change these terms at any time, effective on posting" is doubly defective: courts find it illusory (undermining the entire contract, including the arbitration clause), and continued-use-as-assent fails for material changes.
- Draft for: advance notice of material changes (email or in-product, not just a website update), prospective effect only, and fresh affirmative assent for changes to dispute resolution, pricing, or core rights.
- Preserve version history — which user accepted which version is the question in every enforcement fight.

## Liability Disclaimers Against Consumer Floors

- Warranty disclaimers hit statutory floors: Magnuson-Moss restricts implied-warranty disclaimers for consumer products with written warranties (`law/consumer-protection/magnuson-moss.md`), and some states bar or limit implied-warranty disclaimers outright.
- Liability caps and consequential-damages exclusions do not reach personal injury, gross negligence, willful misconduct, or non-waivable statutory remedies — and some states require specific conspicuousness or void caps for consumers entirely.
- Include a savings clause ("to the maximum extent permitted by law" plus a jurisdiction-specific severability provision), but do not rely on it to launder an overreaching clause — facially unconscionable terms invite UDAP claims on their own. Calibrate against `practice/standards/limitation-of-liability.md` and `practice/standards/warranties-disclaimers.md`, noting consumer departures from the B2B positions.

## Dark Patterns

Review the flow alongside the terms — regulators treat manipulative design as an unfair/deceptive practice regardless of what the document says. Taxonomy and enforcement patterns in `law/consumer-protection/dark-patterns.md`.

- Pre-checked boxes for paid add-ons or consents, hidden costs revealed late in checkout (drip pricing), countdown timers and false scarcity, confirm-shaming, and obstruction of cancellation are the recurring enforcement targets.
- Consent obtained through a dark pattern is treated as no consent — this can retroactively undo auto-renewal consent and privacy consent (`law/data-privacy/consent-mechanics.md`).

## Minors and COPPA

- If the service is directed to children under 13 or there is actual knowledge of under-13 users, COPPA applies and the terms cannot fix it — verifiable parental consent and data-practice changes are required (`law/data-privacy/coppa.md`).
- "You must be 13/16/18" eligibility clauses are necessary but not sufficient where the service plausibly attracts minors; check whether age screening is real or decorative.
- Contracts with minors are voidable in most states — relevant to paid subscriptions and virtual goods marketed to teens. Several states are layering on minor-specific design and consent rules; flag teen-facing products for a current-law check.

## Accessibility

- Consumer-facing flows (signup, checkout, cancellation, the terms themselves) face ADA Title III and state-law accessibility claims; WCAG conformance is the de facto standard. See `law/accessibility/website-accessibility.md`, `law/accessibility/ada-title-iii.md`, and `law/accessibility/wcag.md`.
- An inaccessible cancellation flow is both an accessibility problem and a click-to-cancel violation — the same fix serves both.

## Privacy Policy Interface

- Decide deliberately whether the privacy policy is incorporated into the terms. Incorporation makes privacy promises contract terms (adding breach-of-contract exposure to the regulatory exposure) and drags the privacy policy into the amendment-and-assent rules above. Most companies are better served keeping it a separate notice — but be consistent; half-incorporation by stray cross-reference is the common defect.
- Consent collected in the signup flow (marketing, cookies, data sharing) must meet the consent standards in `law/data-privacy/consent-mechanics.md` independently of terms acceptance — bundled "agree to everything" checkboxes fail under GDPR and several state regimes.
- Verify the terms do not contradict the privacy policy (e.g., terms claim a license to user data the privacy policy says is never shared).

## UDAP Exposure

The catch-all: state UDAP statutes and FTC Act § 5 reach any term or flow that is deceptive in practice, even if each clause is individually lawful. Framework in `law/consumer-protection/ftc-udap.md` and `law/consumer-protection/state-consumer-laws.md`.

- Test the terms against the marketing: if ads promise "cancel anytime" and the terms impose a notice period, the gap is the violation.
- Watch for terms that misstate the law ("we are not liable for anything", "all sales final") — facially false statements of consumer rights are independently actionable in several states.

## Escalation Triggers

- Any flow relying on browsewrap or inferred assent
- Free-trial-to-paid conversion or negative-option billing in a new product or state
- Arbitration clause changes (mass-arbitration settlements have turned on amendment validity)
- Product directed to or knowingly used by minors
- Regulator inquiry, AG CID, or demand letter referencing the terms or signup flow
- Marketing claims that contradict the terms
- Material-terms change planned without a fresh-assent mechanism
