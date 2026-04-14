# research

Find context from the knowledge system.

---

## When to use

- Before evaluating — need to load positions, law areas, entity context
- User asks "what's our position on X?", "what did we agree with Y?", "what does the law say about Z?"
- Starting work on a new document or matter — need to gather all relevant context
- Looking for clause language, method guidance, or prior matter history

## Consults

- `practice/standards/` — position files
- `practice/methods/` — reference guides for approaching different work types
- `practice/library/` — clause language variants
- `practice/profile.md` — identity, principles, voice, thresholds
- `law/` — hard legal constraints with trigger conditions
- Entity files — discovered via QMD query (can live anywhere in the vault)
- Matter files — discovered via QMD query in `matters/`

## Produces

The requested context, ready for use by evaluate, draft, or direct answer to the user.

---

## Core instructions

### Path resolution

Read `config.local.md` (if it exists) or `config.md` from the plugin root to find:
- **Legal root** (`{legal_root}`) — contains law/, practice/, matters/, memory/
- **Entity discovery** — QMD queries on `counsel-os-type` frontmatter

All practice content is at `{legal_root}/`. Entity files are discovered via QMD — they can live anywhere in the vault.

### The knowledge layers

When researching context, always be aware of which layer you're querying:

1. **law/** — Hard constraints. Regulatory requirements, statutory obligations, compliance floors.
2. **Entity files** — Deal-specific. What was agreed with this counterparty, their history, their positions.
3. **practice/** — User's standards. How they operate, what they accept, their methods and library.
4. **memory/** — Institutional learning. Patterns, retro snapshots. Informs but doesn't override.

---

## --law

Find which law areas apply and load their requirements.

### Instructions

1. **Scan trigger conditions.** Read each law area file at `{legal_root}/law/`. Each area has a Trigger Conditions section with keywords, clause types, regulatory references, and relationship patterns.

2. **Match against the document or matter.** Check the document text (or matter description) against each area's triggers. A SaaS agreement might trigger data-privacy, ip-and-technology, and consumer-protection simultaneously. Load ALL that match — not just the most obvious one.

3. **Document what matched and why.**
   ```
   Applicable law areas:
   - data-privacy — keywords: "personal data", "data processing"; sub-topics: gdpr, ccpa-cpra
   - ip-and-technology — clause types: "license grant", "IP ownership"
   ```

4. **Load the relevant sub-topics.** Within each matching area, load the sections relevant to the specific triggers. Don't dump the entire area — focus on what applies.

**Important:** Law areas are organized as folders (`law/{area}/`) with `_overview.md` and sub-topic files, OR as single consolidated files (`law/{area}.md`). Check which structure exists and read accordingly.

---

## --position \<type\>

Load the standard for a specific clause type.

### Instructions

1. **Read the position file.** Load `{legal_root}/practice/standards/{clause-type}.md`.

2. **Extract the key sections:**
   - **## Our Position** — our standard, what we'll accept, what we won't accept, auto-escalate triggers
   - **## Classification Guide** — GREEN/YELLOW/RED criteria for this clause type
   - **## Practical Guidance** — negotiation context and common issues
   - **## Common Traps** — what to watch for

3. **If the clause type doesn't have a position file,** note the gap. Assess against general market standards. Suggest creating a position file after the matter closes.

### Building effective positions

When research is followed by evaluate, assemble the **effective position** by merging layers:

1. Load practice/standards/{clause-type}.md — the baseline
2. Query QMD for the counterparty's entity file. If found, check for deal-specific overrides. Entity overrides supersede practice for this deal.
3. Note any law/ constraints that set a floor or ceiling. Law always wins.

Report the effective position with source attribution:
```
Limitation of liability:
- Practice standard: mutual cap at 12 months of fees (practice/standards/limitation-of-liability.md)
- Entity override: Acme accepted 24-month cap in prior deal (Acme entity file)
- Law floor: data breach liability must be carved out (GDPR Art. 82)
- Effective position: 24-month cap with data breach carve-out
```

---

## --entity \<name\>

Find counterparty context and history.

### Instructions

1. **Query QMD.** Search for the company name with `counsel-os-type` in [counterparty, vendor, customer, prospect].

2. **If found, read the entity file.** Extract:
   - Relationship overview and history
   - Agreed positions from prior deals
   - Commercial terms and patterns
   - Negotiation history and notes
   - Any flags or special handling instructions

3. **If not found,** report: "No entity file found for [name]. This appears to be a new counterparty." The system can offer to create one after the work is complete (via remember --entity).

4. **Check for related matters.** Query QMD for `counsel-os-type: matter` + the counterparty name. Report any open or closed matters for additional context.

---

## --matter

Find existing matter state.

### Instructions

1. **Query QMD.** Search for `counsel-os-type: matter` + the counterparty name (if known) or matter description.

2. **Prefer active matters.** Look for matters with stage `intake` or `working`. If found:
   - Read the matter file
   - Report what's there: parties, documents, findings, decisions, open issues, next action
   - The LLM should resume this matter rather than starting fresh

3. **If only closed matters exist,** note the prior context but don't reopen. The user may want a new matter.

4. **If no matters found,** report that. The system may create one via remember --matter if the work is substantive.

---

## --library \<category\>

Find clause language variants.

### Instructions

1. **Read the library file.** Load `{legal_root}/practice/library/{category}.md`.

2. **Extract the relevant variants.** Library files typically contain:
   - **Standard** — balanced, market-standard language
   - **Aggressive** — favorable to our side
   - **Vendor-favorable** — what counterparties typically propose
   - Specific clauses for different scenarios

3. **Use for drafting.** The library provides proven language that draft can reference when generating counter-language or new clauses.

---

## --method \<type\>

Find the reference guide for a type of legal work.

### Instructions

1. **Read the method file.** Load `{legal_root}/practice/methods/{type}.md`.

2. **Use as guidance, not a script.** Method files tell the LLM what to prioritize for this work type:
   - What clause types or issues to check
   - What order to approach them in
   - What's most important not to miss
   - Any checklists for completeness

3. **Adapt to the user's request.** A full review follows the method closely. A targeted question ("just check the indemnification") skips most of it. The method informs — it doesn't constrain.

4. **If no method file exists for this work type,** proceed with general judgment. Note the gap for future content development.
