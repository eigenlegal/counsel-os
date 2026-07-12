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
- `{legal_root}/config.md` — the marked Counsel OS config file for the matters path and other overrides (resolved via the Finding the Legal Root procedure in counsel/SKILL.md)

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
deadlines:                                     # optional — omit if none known yet
  - date: {YYYY-MM-DD}
    action: {what is due}
    type: {renewal|notice|objection|milestone|filing}   # optional
    source: {clause the date comes from, e.g. "MSA §9.2"}  # optional
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
- ALWAYS set `updated:` to today in frontmatter on every write — staleness detection and retro turnaround analytics depend on it. Update `stage` when it advanced.

### Deadlines

Legal practice runs on dates — auto-renewal windows, termination-notice deadlines, sub-processor objection periods, filing and milestone dates. Missing one is the practice's #1 malpractice vector. Capture time-based obligations as structured `deadlines:` frontmatter on the matter file so the `/counsel-os:docket` sweep can report what's due across all matters.

**When to record.** Whenever a date-bearing obligation becomes known — contract execution, a returned redline, matter intake, or when `read` extracts key dates from a document (see `primitives/read.md`). `read` proposes the entries; you persist them here as part of the normal `--matter` write. Don't ask separately — fold them into the matter update, but do tell the user which deadlines you captured.

**Format.** Each entry is a list item under `deadlines:`:

```yaml
deadlines:
  - date: 2026-07-15          # required, YYYY-MM-DD
    action: "renewal notice due"
    type: renewal              # optional: renewal | notice | objection | milestone | filing
    source: "MSA §9.2"         # optional: the clause the date comes from
    done: false                # optional: true drops it from the sweep, kept for the audit trail
```

Rules:
- `date` must be `YYYY-MM-DD`. A missing or malformed date is surfaced by the sweep as `MALFORMED`, never silently dropped — so get it right.
- **Don't delete a satisfied deadline** — set `done: true`. The record stays for the audit trail and drops out of the default sweep.
- **A deadline can outlive its matter.** Renewal windows and confidentiality-survival dates often fall after a matter closes, so keep them on the (closed) matter file; the sweep still surfaces them, tagged `[closed]`.
- Deadlines belong on the **matter** file (single-lawyer, matter-scoped by design). Do not add per-person assignment or shared-vault fields.

Docket is a read-only *reporter*; recording and updating deadlines is always this primitive's job, and always at the user's confirmation for anything beyond the automatic matter write.

### Version control on close

When a matter's stage advances to `closed` and `{legal_root}` is a git repo (`git -C {legal_root} rev-parse --is-inside-work-tree` succeeds), commit the files this closeout actually touched — the matter file plus any entity, practice, or memory files written as part of the close. Stage and commit by pathspec, never `git add -A` — vaults routinely carry unrelated in-progress work that must not be swept into the closeout commit:

```bash
git -C {legal_root} add <touched paths>
git -C {legal_root} commit -m "Close matter: {matter-id}" -- <touched paths>
```

Skip silently when `{legal_root}` is not a git repo.

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
   the matching practice/library/ file (see _index.md)?
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

---

## --reference

Import third-party source material — sample agreements, form books, checklists, treatise excerpts — into `practice/reference/` so it becomes searchable during real work. Reference is source material OUTSIDE the precedence layers: it informs issue-spotting and sample language, never governs, and is always cite-checked against current `law/`.

### When to use

The user says "import these agreements / this form book / this folder as reference," or shares material worth keeping as a quarry rather than as positions.

### Instructions

1. **Confirm scope and attribution.** Collection name (kebab-case slug), source attribution and vintage (e.g., "Corporate Partnering Manual, Villeneuve et al., c. 2007"). Vintage matters — it drives how aggressively future cite-checking hedges.
2. **With shell access**, run the deterministic helper — it handles conversion (.docx via pandoc, legacy .doc via textutil, .md/.txt pass-through), frontmatter, the provenance banner, and index registration:
   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/import_reference.sh" <source-dir> <collection-slug> --source "<attribution, vintage>"
   ```
   Conversion note baked into the script: pandoc's `markdown` flavor with raw HTML stripped, never `gfm` — with raw HTML disabled, gfm collapses complex tables to a bare "[TABLE]" placeholder, while the `markdown` flavor keeps them as grid tables. (Plain `gfm` preserves tables only by embedding raw HTML, which defeats the clean-markdown goal.)
3. **Without shell (Cowork):** ask the user for markdown/text versions, then create the files by hand following the same convention: `counsel-os-type: reference` + `reference-collection` + `source` + `imported` + `caution` frontmatter, the "⚠️ Reference only" banner as the first body line, an `_index.md` per collection, and a line in `practice/reference/_index.md`.
4. **Reindex** if a content index is connected, so the material is retrievable in the next matter: `qmd update`, then `[ -d ~/.cache/qmd/models ] && qmd embed` — embed only behind that check (the cache exists only after the user opted into semantic embeddings; a bare `qmd embed` on a BM25-only install triggers a surprise ~940MB model download).
5. **Offer distillation as a follow-up, not a default.** The raw import is a quarry. The durable upgrade is mining it later: clause language re-expressed into `practice/library/` variants, checklists into `practice/methods/` — clean-room re-expression, with stale citations dropped and current law supplied by `law/`.

**Copyright note:** imported third-party material stays in the user's private vault. Never propose promoting its text into shareable/plugin content — distillations must be re-expressions.

---

### Always ask first

Knowledge system changes need explicit consent. Show the proposed change, explain why, wait for approval.
