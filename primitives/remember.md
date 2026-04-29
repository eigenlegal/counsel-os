# remember

Persist state and propose knowledge updates.

---

## When to use

- After substantive work — findings, decisions, or outputs need to be saved
- User asks to "update the file", "log this", "remember what we agreed", "close this matter"
- When a pattern emerges that might warrant updating practice standards
- When a new counterparty should be tracked

## Consults

- The current conversation — findings, decisions, outputs produced
- Existing matter file (if any) — to resume rather than create
- Existing entity file (if any) — to update rather than create
- `practice/standards/` — to detect position gaps or drift
- `practice/profile.md` — identity for attribution
- `{legal_root}/config.md` — for the matters path and other overrides (resolved via the Finding the Legal Root procedure in counsel/SKILL.md)

## Produces

- Updated or new matter file
- Proposed entity file updates (with user confirmation)
- Proposed practice/memory updates (with user confirmation)

---

## Core instructions

### The consent rule

**--matter is automatic.** The user expects their work state to be saved. Create or update the matter file without asking.

**--entity and --knowledge always ask first.** These change the knowledge system. The user must approve before anything is written.

Format proposals clearly:
```
I'll update the [counterparty] file with the outcome of this matter.

Proposed additions:
- [specific changes]

Proceed?
```

### Path resolution

Resolve `{legal_root}` and any path overrides via the Finding the Legal Root procedure in `skills/counsel/SKILL.md`. Matter files live at `{legal_root}/{matters_path}/` (default: `{legal_root}/matters/`).

---

## --matter

Create or update the matter file.

### When to create a new matter

Create a matter when:
- Substantive legal work is starting (document review, analysis, drafting)
- No existing matter for this counterparty/engagement is found

Do NOT create a matter for:
- Quick lookups ("what's our position on X?")
- General questions ("what does GDPR say about breach notification?")
- One-off research that doesn't involve a specific engagement

### Check for existing matters

Before creating, look up `counsel-os-type: matter` + the counterparty name using the Knowledge Base Search procedure in counsel/SKILL.md.

- **Active matter found** (stage is not `closed`): Resume it. Read the file, update with new context.
- **Only closed matters found:** Note the prior context. Create a new matter.
- **No matters found:** Create a new matter.

### Matter file format

```markdown
---
counsel-os-type: matter
matter-id: {YYYY-MM}-{counterparty-slug}-{type-slug}
type: {matter type}
stage: intake
counterparty: {name}
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
---

# {Counterparty} — {Description}

## Parties
- **Counterparty:** [[{Name}]] ({role})
- **Our entity:** {from profile.md}

## Documents
- {filename} (received {YYYY-MM-DD})

## Context
- **Our role:** {vendor/customer/etc.}
- **Law areas:** {applicable areas}

## Findings
{Populated by evaluate — per-issue assessments}

## Decisions
{Logged as decisions are made — what was decided, by whom, why, deviations from standard}

## Open Issues
- [ ] {Unresolved items}

## Next Action
{What needs to happen next}

## Generated Outputs
- {filename} ({YYYY-MM-DD})
```

### Matter ID format

`YYYY-MM-{counterparty-slug}-{type-slug}`
- counterparty-slug: lowercase, hyphenated (e.g., `acme-corp`). Use `internal` if no counterparty.
- type-slug: short form (e.g., `msa`, `nda`, `compliance`, `memo`, `advisory`)
- If collision: append `-2`, `-3`, etc.

### Stage management

| Stage | Meaning |
|---|---|
| `intake` | Matter being set up — parties, documents, initial context |
| `working` | Active legal work in progress |
| `closed` | Finalized — decisions logged, knowledge updated |

Advance from `intake` to `working` when substantive analysis or drafting begins. Advance to `closed` when the user says to close the matter or when work is complete.

### Updating an existing matter

When updating, preserve existing content and append:
- Add new findings to ## Findings
- Add new decisions to ## Decisions
- Update ## Open Issues (check off resolved, add new)
- Update ## Next Action
- Add new outputs to ## Generated Outputs
- Update `stage` and `updated` in frontmatter

---

## --entity

Propose updates to the counterparty file.

### What to capture

After working on a matter, look for entity-specific information worth preserving:

- **Agreed positions:** Terms that were negotiated and accepted — deviations from standard, compromises reached
- **Deal history:** What type of work, when, what the outcome was
- **Negotiation patterns:** Their style, what they push back on, how many rounds
- **Notable differences:** Where they differ from market standard or our standard (flag with "Exception")
- **Operational notes:** Contact information, signing authority, special handling
- **Flags:** Follow-up items, renewal dates, leverage points for next negotiation

### Finding the entity file

Look up the company name with `counsel-os-type` in [counterparty, vendor, customer, prospect] using the Knowledge Base Search procedure in counsel/SKILL.md.

**If found:** Propose additions to the existing file. Show exactly what will be added.

**If not found:** Propose creating a new entity file. Ask the user where to save it.

New entity file template:
```markdown
---
counsel-os-type: counterparty
---

# {Counterparty Name}

## Relationship
- Primary contact: {if known}
- Tier: {1/2/3/4}

## Agreed Positions
{positions from this matter}

## History
- {DATE}: {matter type} — {outcome}

## Notes
{negotiation style, preferences, observations}
```

### Always ask first

Show the proposed changes. Wait for confirmation. The user may want to adjust what's recorded or omit certain details.

---

## --knowledge

Propose updates to practice standards or institutional memory.

### Practice standards — practice/standards/

Look for:

1. **Position gaps.** Did this matter expose a clause type not covered in practice/standards/?
   ```
   Your standards don't cover [clause type], but it came up in this matter.
   Should I create practice/standards/{clause-type}.md?

   Suggested starting point:
   ## Our Position
   **Our standard:** [based on what you did in this matter]
   **We'll accept:** [based on flexibility shown]
   **We won't accept:** [based on RED flags identified]
   ```

2. **Position drift.** Did the user accept terms below their stated standard? Does this seem like a deliberate choice rather than a concession?
   ```
   You accepted [specific term] here, and your standard says [X].
   Should I update practice/standards/{clause-type}.md to reflect this?
   ```

3. **Effective counter-language.** Did clause language work well in negotiation?
   ```
   The counter-language for [clause type] was accepted. Should I add it to
   practice/library/{clause-type}.md?
   ```

### Institutional memory — memory/patterns.md

Look for cross-cutting observations that apply **across deals**, not just to one counterparty:

- Gaps in positions exposed by multiple deals
- Process improvements ("verify NDA entity matches contracting entity at intake")
- Market trends ("SLA credits as sole remedy is now standard for infrastructure vendors")
- Recurring pushback patterns across multiple counterparties

**Do NOT put here:** entity-specific decisions, negotiation history, or deal details — those belong in the entity file.

Propose entries:
```
### {DATE} — {Pattern Title}
**Category:** [clause gap / process / market trend]
**Observation:** [what you noticed]
**Evidence:** [specific examples]
**Implication:** [what this means for future work]
**Action:** [update positions / update process / monitor]
```

### Always ask first

Knowledge system changes need explicit consent. Show the proposed change, explain why, wait for approval.
