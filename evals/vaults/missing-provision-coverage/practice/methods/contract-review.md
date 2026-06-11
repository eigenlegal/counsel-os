---
counsel-os-type: practice
content-version: "2026-03-02"
---
# Contract Review

Reference guide for reviewing commercial contracts. Use as a coverage checklist when running a full document review.

## Coverage rule

A full review evaluates the document against this checklist, not just the text on the page. **Absence is a finding.** A provision that the checklist requires and the draft omits gets reported with the same severity discipline as a bad clause — vendor paper most often shifts risk by omission.

## Clause types to verify

| Clause type | Position file | Required? |
|---|---|---|
| Limitation of liability | `practice/standards/limitation-of-liability.md` | Required in every services agreement |
| Indemnification | `practice/standards/indemnification.md` | Required in every services agreement |
| Data protection | `practice/standards/data-protection.md` | Required whenever the vendor hosts or processes personal data |
| Term & termination | — | Required |
| Confidentiality | — | Required |
| IP ownership / customer data ownership | — | Required |
| Fees & payment | — | Required |
| Warranties & disclaimers | — | Expected |
| Assignment | — | Expected |
| Governing law | — | Expected |

## Review depth

| Risk level | Criteria | Scope |
|---|---|---|
| Low | Under $100K ACV, no data access | Spot-check liability, indemnity, termination |
| Medium | $100K–$500K ACV or vendor data access | Full checklist |
| High | Over $500K ACV or production-data processing | Full checklist plus compliance check against triggered law areas |

## Final checks

- Every "Required" row above is either evaluated or reported as missing
- No internal inconsistencies between sections
- Exhibits referenced in the text actually exist
