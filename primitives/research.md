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
- Entity files — discovered via the Knowledge Base Search procedure in counsel/SKILL.md
- Matter files — discovered via the Knowledge Base Search procedure in counsel/SKILL.md

## Produces

The requested context, ready for use by evaluate, draft, or direct answer to the user.

---

## Core instructions

### Path resolution

Resolve `{legal_root}` via the Finding the Legal Root procedure in `skills/counsel/SKILL.md`. All practice content lives at `{legal_root}/` (with `law/`, `practice/`, `matters/`, `memory/`).

Entity and matter files are discovered via the Knowledge Base Search procedure in counsel/SKILL.md (runtime-detected: content-index MCP if connected, else filesystem).

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

1. **Scan trigger conditions.** If a content-index tool is connected, use Knowledge Base Search (counsel/SKILL.md) to query law-area files for content matching the document's keywords, clause types, and regulatory references — the index ranks relevance and returns the most likely matches. Otherwise, read each law area file at `{legal_root}/law/` and scan its Trigger Conditions section manually. Either way, evaluate every plausible match — don't stop at the first hit.

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

When `--position` is followed by `evaluate` or `draft`, assemble the **effective position** (practice → entity → law → memory) using the bottom-up procedure in `skills/counsel/SKILL.md` → Building the Effective Position. That section also defines the attribution format for reporting source layers.

---

## --entity \<name\>

Find counterparty context and history.

### Instructions

1. **Look up the entity.** Use the Knowledge Base Search procedure in counsel/SKILL.md to find a file matching the company name with `counsel-os-type` in [counterparty, vendor, customer, prospect].

2. **If found, read the entity file.** Extract:
   - Relationship overview and history
   - Agreed positions from prior deals
   - Commercial terms and patterns
   - Negotiation history and notes
   - Any flags or special handling instructions

3. **If not found,** report: "No entity file found for [name]. This appears to be a new counterparty." The system can offer to create one after the work is complete (via remember --entity).

4. **Check for related matters.** Look up matters via the same procedure with `counsel-os-type: matter` + the counterparty name. Report any open or closed matters for additional context.

---

## --matter

Find existing matter state.

### Instructions

1. **Look up the matter.** Use the Knowledge Base Search procedure in counsel/SKILL.md to find a file matching `counsel-os-type: matter` + the counterparty name (if known) or matter description.

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
