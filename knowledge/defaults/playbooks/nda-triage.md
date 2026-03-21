# NDA Triage Playbook

## When to Use
Use this playbook when receiving or initiating a Non-Disclosure Agreement (NDA). NDAs are high-volume, and this playbook enables rapid triage to determine whether the NDA can be signed on template, requires minor edits, or needs full legal review.

## Prerequisites
- Load position file: `knowledge/defaults/positions/confidentiality.md`
- Load clause library: `knowledge/defaults/clause-library/ip-and-confidentiality.md`
- Load screening checklist: `knowledge/defaults/checklists/nda-screening.md`
- Identify the business purpose for the NDA (vendor evaluation, partnership discussion, M&A, employment)
- Determine the direction of disclosure: mutual, one-way (disclosing), or one-way (receiving)
- Confirm whether we have a standard NDA template to propose as an alternative
- Check `knowledge/matters/counterparties/<name>.md` for any prior NDA history or standing instructions

## Process

### Step 1: Template Check
Determine if the NDA is:
- **Our template:** Verify it has not been modified. Compare against the current template version. If unmodified, approve immediately — skip all remaining steps.
- **Counterparty template:** Proceed to Step 2 for triage review.
- **Industry standard (e.g., Bonterms mutual NDA, NVCA model NDA):** Verify version and that no modifications were made, then expedite review — go directly to Step 2 with heightened speed expectation.

**Decision — Template Substitution:**
- If the counterparty template has significant issues (3+ RED flags), propose our template instead. This is faster than negotiating a heavily marked-up counterparty form.

### Step 2: Rapid Triage (5-Minute Assessment)
Run through the following six critical checks against `positions/confidentiality.md`:

1. **Mutual vs. One-Way:** Is the NDA mutual? If one-way, does the direction match our needs?
   - **GREEN:** Mutual NDA, or one-way matching our disclosure direction
   - **YELLOW:** One-way but we may also need to disclose
   - **RED:** One-way protecting only the counterparty when we are also disclosing

2. **Duration:** Is the confidentiality period between 2-5 years?
   - **GREEN:** 2-5 years with trade secret carve-out for perpetual protection
   - **YELLOW:** 1-2 years or 5-7 years
   - **RED:** Under 1 year, over 7 years, or no trade secret carve-out

3. **Definition of Confidential Information:** Is the definition reasonably broad?
   - **GREEN:** Covers oral, written, and electronic; includes a reasonable marking exception for oral disclosures (follow-up in writing within 30 days)
   - **YELLOW:** Requires marking/labeling but has reasonable exceptions
   - **RED:** Requires written marking of ALL information with no exceptions

4. **Permitted Use:** Is use limited to the stated business purpose?
   - **GREEN:** Limited to a defined business purpose
   - **YELLOW:** Broad but commercially reasonable purpose statement
   - **RED:** Undefined, overly broad, or permits use beyond the relationship

5. **Residuals Clause:** Does the NDA contain a residuals clause?
   - **GREEN:** No residuals clause
   - **YELLOW:** Residuals clause limited to general knowledge/experience (not specific information)
   - **RED:** Broad residuals clause permitting use of "ideas, concepts, or techniques" retained in unaided memory — this can gut protections

6. **Non-Standard Provisions:** Flag provisions that do not belong in a standard NDA:
   - Non-solicitation / non-compete clauses → **RED** unless time-limited and customary for the deal type
   - Standstill provisions → **RED** unless M&A context
   - Exclusivity obligations → **RED**
   - Broad IP assignment or license grants → **RED**
   - Indemnification obligations → **YELLOW** (unusual but sometimes acceptable)
   - Liquidated damages → **RED**

### Step 3: FAST TRACK Classification
Based on the triage, classify the NDA:

**FAST TRACK Criteria (all must be met):**
- All six checks are GREEN (zero RED, zero YELLOW)
- No non-standard provisions present
- Standard commercial purpose (not M&A, not competitive intelligence)
- Counterparty is a recognized commercial entity (not an individual, not a foreign government entity)
- NDA term is 2 years or less
→ **Approve for signature with no further review.** Total time: under 10 minutes.

**MINOR EDITS Criteria:**
- Zero RED flags
- 1-3 YELLOW flags that are addressable with standard counter-language from `clause-library/ip-and-confidentiality.md`
- No non-standard provisions beyond a reasonable non-solicitation
→ **Make targeted edits and send back.** Do not escalate. Total time: 30-60 minutes.

**FULL REVIEW Criteria (any one triggers):**
- Any RED flag
- 4+ YELLOW flags
- Non-standard provisions present (exclusivity, IP assignment, liquidated damages)
- M&A, competitive intelligence, or government counterparty context
- Counterparty file in `knowledge/matters/counterparties/` flags special handling
→ **Proceed to Step 4 for detailed review.** Total time: 2-4 hours.

### Step 4: Full Review (If Required)
Apply the complete confidentiality position file analysis:
- Compare all provisions against `positions/confidentiality.md` classification guide, item by item
- Draft a redline using counter-language from `clause-library/ip-and-confidentiality.md`
- For each RED item, provide: (1) the issue, (2) the risk, (3) specific alternative language
- Flag any provisions that require business input (e.g., non-solicitation period, standstill scope)
- If the counterparty's NDA is significantly non-standard (5+ issues), propose substituting our template

**Decision — M&A NDAs:**
- If the NDA is for M&A due diligence, also check for: standstill provisions, representatives/affiliates scope, securities law disclaimers, non-solicitation of employees, and return/destruction obligations. These are standard in M&A NDAs and should not be flagged as unusual.

**Decision — Competitive Sensitivity:**
- If the NDA involves a competitor, require: (1) strict permitted-use limitation, (2) named authorized recipients, (3) no residuals clause, (4) return/destruction upon request (not just expiration). Escalate to senior counsel.

### Step 5: Execution
- Route for signature per the signing authority matrix
- Verify the signatory has appropriate authority for the counterparty (officer, authorized representative)
- Log the NDA in the contract management system with key metadata:
  - Parties, effective date, expiration date, direction (mutual/one-way)
  - Any non-standard provisions accepted (with brief rationale)
  - Business owner and stated purpose
  - FAST TRACK / MINOR EDITS / FULL REVIEW classification
- Set a calendar reminder for expiration date (if the relationship may continue beyond the NDA term)

## Output Format
- **FAST TRACK:** Brief confirmation to business owner: "NDA reviewed against screening checklist, approved for signature. No deviations from standard."
- **MINOR EDITS:** Redlined NDA with cover note explaining 1-3 changes and rationale. Reference the specific position file standard for each edit.
- **FULL REVIEW:** Issues list with RED/YELLOW/GREEN classifications, proposed redline, and negotiation strategy (which items to concede if pushed back).

## Calibration
- **Simple (FAST TRACK):** Mutual NDA on a recognized template or our paper, all checks GREEN. Target: under 10 minutes.
- **Standard (MINOR EDITS):** Counterparty template with 1-3 YELLOW issues. Target: 30-60 minutes.
- **Complex (FULL REVIEW):** NDA with RED flags, non-standard provisions, M&A context, or competitive sensitivity. Target: 2-4 hours.
