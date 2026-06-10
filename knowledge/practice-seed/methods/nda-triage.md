---
counsel-os-type: practice
content-version: "2026-06-10"
---
# NDA Triage

Reference guide for triaging NDAs. NDAs are high-volume — this guide enables rapid assessment to determine if the NDA can be signed, needs minor edits, or requires full review.

## Template check

Before detailed review, determine if the NDA is:
- **Our template:** If unmodified, approve immediately. No further review needed.
- **Industry standard** (Bonterms, NVCA model): Verify unmodified, expedite review.
- **Counterparty template:** Proceed to the critical checks below.

If the counterparty template has 3+ critical issues, propose substituting our template instead of redlining.

## Six critical checks

Run these against `practice/standards/confidentiality.md`:

**1. Mutual vs. One-Way**
- GREEN: Mutual NDA, or one-way matching our disclosure direction
- YELLOW: One-way but we may also need to disclose
- RED: One-way protecting only the counterparty when we are also disclosing

**2. Duration**
- GREEN: 2-5 years with trade secret carve-out for perpetual protection
- YELLOW: 1-2 years or 5-7 years
- RED: Under 1 year, over 7 years, or no trade secret carve-out

**3. Definition of Confidential Information**
- GREEN: Covers oral, written, and electronic; reasonable marking exception for oral (follow-up within 30 days)
- YELLOW: Requires marking/labeling but has reasonable exceptions
- RED: Requires written marking of ALL information with no exceptions

**4. Permitted Use**
- GREEN: Limited to a defined business purpose
- YELLOW: Broad but commercially reasonable purpose statement
- RED: Undefined, overly broad, or permits use beyond the relationship

**5. Residuals Clause**
- GREEN: No residuals clause
- YELLOW: Limited to general knowledge/experience (not specific information)
- RED: Broad residuals permitting use of "ideas, concepts, or techniques" retained in unaided memory — this guts protections

**6. Non-Standard Provisions** — flag provisions that don't belong in a standard NDA:
- Non-solicitation / non-compete → RED unless time-limited and customary for the deal type
- Standstill provisions → RED unless M&A context
- Exclusivity → RED
- Broad IP assignment or license grants → RED
- Indemnification → YELLOW (unusual but sometimes acceptable)
- Liquidated damages → RED

## Classification

**FAST TRACK** (all must be met):
- All six checks are GREEN
- No non-standard provisions
- Standard commercial purpose (not M&A, not competitive intelligence)
- Recognized commercial entity (not an individual, not a foreign government)
- NDA term is 2 years or less
→ Approve for signature. Under 10 minutes.

**MINOR EDITS:**
- Zero RED flags
- 1-3 YELLOW flags addressable with standard counter-language from `practice/library/ip-and-confidentiality.md`
- No non-standard provisions beyond a reasonable non-solicitation
→ Make targeted edits and send back. 30-60 minutes.

**FULL REVIEW** (any one triggers):
- Any RED flag
- 4+ YELLOW flags
- Non-standard provisions (exclusivity, IP assignment, liquidated damages)
- M&A, competitive intelligence, or government counterparty context
- Entity file flags special handling
→ Full clause-by-clause evaluation. 2-4 hours.

## Special contexts

**M&A NDAs:** Also check for standstill provisions, representatives/affiliates scope, securities law disclaimers, non-solicitation of employees, and return/destruction obligations. These are standard in M&A NDAs — don't flag as unusual.

**Competitive sensitivity:** If the NDA involves a competitor, require: strict permitted-use limitation, named authorized recipients, no residuals clause, return/destruction upon request (not just expiration). Escalate to senior counsel.
