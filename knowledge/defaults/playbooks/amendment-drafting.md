---
counsel-os-type: playbook
content-version: "2026-04-08"
---
# Amendment Drafting Playbook

## When to Use
Use this playbook when modifying the terms of an existing agreement through a formal amendment, addendum, or change order. This applies to changes in scope, pricing, term, parties, or any substantive contract provisions.

## Prerequisites
- Access to the original agreement and all prior amendments. Assemble the complete contract lineage.
- Clear understanding of the changes requested by the business
- Business approval for the proposed changes
- Verification that the original agreement permits amendments (check the amendments clause for requirements such as written form, authorized signatories)
- Confirmation that the original agreement is still in effect (not expired or terminated)
- Check `the counterparty entity file (discovered via QMD)` for any relevant counterparty context

## Process

### Step 1: Review the Existing Agreement
Before drafting, build a complete picture of the current contract state:
- Read the original agreement in full
- Read all prior amendments in chronological order
- Identify the amendment/modification clause — note any procedural requirements:
  - Must amendments be in writing? (Almost always yes — if silent, assume written form required)
  - Must amendments be signed by authorized representatives of both parties?
  - Are there specific notice requirements for proposing amendments?
  - Does the agreement require board or management approval for certain changes?
  - Is there a "no oral modification" clause? (If yes, ensure strict written compliance)
- Map the current effective terms by incorporating all prior amendments. Create a consolidated view: for each provision being changed, document the current effective language (which may come from the original or a prior amendment).
- Identify any interdependencies between the provisions being changed and other provisions

**Version Control Best Practices:**
- Maintain a contract lineage document listing: Original Agreement (date) → Amendment No. 1 (date) → Amendment No. 2 (date) → etc.
- If there have been 3+ prior amendments, strongly consider whether an Amended and Restated Agreement would be cleaner than another point amendment. The threshold for recommending A&R: more than 30% of the original provisions have been modified across all amendments.
- Number amendments sequentially ("Amendment No. 3" not "Third Amendment") for clarity
- Each amendment should reference all prior amendments in its recitals to maintain a clear chain

**Decision — Amendment vs. Amended & Restated:**
- If the changes affect fewer than 5 provisions and there are fewer than 3 prior amendments → **point amendment**
- If the changes affect 5+ provisions, or there are already 3+ prior amendments, or the cumulative amendments make the contract difficult to read → **amended and restated agreement** (consolidates everything into one clean document)
- If the changes are purely administrative (address change, contact update, notice information) → **simple letter agreement or notice** per the contract's administrative provisions

### Step 2: Define the Changes
Document precisely what is changing:
- List each provision being modified, added, or deleted. Use a change tracking table:

| Section | Current Language | Proposed Language | Reason for Change |
|---|---|---|---|
| 4.1 (Term) | "12-month initial term" | "24-month initial term" | Business requests extension |
| 7.2 (Liability) | "Cap of $100,000" | "Cap equal to 12 months of fees" | Aligns with `positions/limitation-of-liability.md` |

- For modified provisions, prepare a comparison showing current language vs. proposed language
- Assess whether the changes require corresponding updates to other provisions:
  - Changing scope → may affect pricing, SLAs, liability cap, insurance requirements
  - Changing term → may affect pricing, renewal mechanics, termination notice periods
  - Changing data processing → may require DPA amendment; check `positions/data-protection.md`
  - Adding parties → may require assignment/novation analysis; check `positions/assignment-change-of-control.md`
- Determine whether the changes trigger any consent or notification requirements (e.g., notice to affected third parties, sub-processors, regulatory filings)
- Cross-reference each change against the relevant position file to ensure the amended term meets current standards

### Step 3: Draft the Amendment
Structure the amendment document:

**Header:**
- Title: "Amendment No. [X] to [Agreement Name]"
- Date of the amendment
- Reference to the original agreement (full title, date, parties)
- Reference to all prior amendments: "as previously amended by Amendment No. 1 dated [date], Amendment No. 2 dated [date]" (or "as previously amended, the 'Agreement'")

**Recitals:**
- Identify the parties (matching the original agreement's party definitions)
- Reference the original agreement and all prior amendments
- Brief statement of the parties' desire to amend ("The parties wish to amend the Agreement to [brief description of purpose]")
- Context for the amendment (optional but helpful for interpretation — e.g., "in connection with the expansion of services to include [new scope]")

**Operative Provisions:**
- For each change, use precise language:
  - **Modification:** "Section [X] of the Agreement is hereby amended and restated in its entirety as follows: [new text]" (preferred for clarity) or "Section [X] is hereby amended by replacing '[old text]' with '[new text]'" (for surgical edits)
  - **Addition:** "The following new Section [X] is hereby added to the Agreement: [new text]"
  - **Deletion:** "Section [X] of the Agreement is hereby deleted in its entirety."
- **Ratification clause** (required): "Except as expressly modified by this Amendment, all terms and conditions of the Agreement remain in full force and effect and are hereby ratified and confirmed."
- **Conflict clause** (required): "In the event of any conflict between this Amendment and the Agreement, this Amendment shall control."
- **Counterparts clause:** "This Amendment may be executed in counterparts, each of which shall be deemed an original."
- **Defined terms:** "Capitalized terms used but not defined in this Amendment shall have the meanings assigned to them in the Agreement."

**Signature Blocks:**
- Match the original agreement's signature format (party names, title lines, date lines)
- Ensure signatories have appropriate authority per the delegation of authority matrix
- Include witness/notarization lines if the original agreement required them

### Step 4: Internal Review
Before sending to the counterparty:
- Verify all changes are accurately reflected by comparing the amendment against the change tracking table from Step 2
- Confirm no unintended consequences on other provisions. Specifically check:
  - Does the change affect any defined terms used elsewhere?
  - Does the change affect any calculation or formula (liability cap, fees, SLAs)?
  - Does the change conflict with any provision not being amended?
- Check that defined terms are used consistently with the original agreement
- Run through applicable position files to ensure the amended terms meet current standards
- Obtain internal business and legal approval
- Verify signing authority for both parties

**Decision — Legal Review Depth:**
- **Simple changes** (term extension, pricing update, administrative): self-review sufficient. Target: 1-2 hours.
- **Moderate changes** (scope expansion, new SLAs, party changes): peer review recommended. Target: 4-8 hours.
- **Material changes** (liability restructuring, new data processing, material commercial terms): senior counsel review required. Target: 1-3 days.

### Step 5: Negotiate and Execute
- Share the draft amendment with the counterparty with a cover note explaining the changes and business rationale
- Track any counterparty changes through the negotiation process — apply the negotiation playbook (`playbooks/negotiation.md`) if the counterparty proposes material counter-edits
- Once agreed, execute with wet or electronic signatures per the original agreement's requirements
- Verify the effective date: is the amendment effective upon signing, or on a specified future date?
- File the executed amendment with the original agreement in the contract management system. Update the contract lineage document.
- Update any internal tracking systems (CRM, finance, procurement) to reflect the new terms
- Notify affected internal stakeholders (e.g., if SLAs changed, notify operations; if pricing changed, notify finance)
- If the amendment represents a deviation from standard positions, consider updating the entity file with the deviation

## Output Format
A formal amendment document containing:
1. Header identifying the amendment number, underlying agreement, and all prior amendments
2. Recitals providing context for the amendment
3. Operative provisions with precise modification language for each change
4. Ratification clause confirming unchanged terms remain in effect
5. Conflict clause establishing amendment priority
6. Signature blocks with dates matching the original agreement's format

Supporting materials:
- Change tracking table (Section | Current | Proposed | Rationale)
- Contract lineage document (if multiple prior amendments exist)

## Calibration
- **Simple:** Single provision change (e.g., term extension, pricing update, address change). Target: 1-2 hours.
- **Standard:** Multiple provision changes with some interdependencies. Target: 4-8 hours.
- **Complex:** Substantial restructuring, scope changes with cascading effects on multiple provisions, multi-party amendments. Target: 1-3 days. Consider whether an amended and restated agreement is more appropriate than a point amendment.
