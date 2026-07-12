# Counsel OS — Architecture Direction

> **Date:** 2026-04-15, updated 2026-06-11
> **Status:** Current as of v0.9.19 (June 2026)

---

## Design goal

**Lawyers should not have to think to use this system.**

A lawyer doesn't work sequentially. Sometimes they need to review a full contract. Sometimes they just want to know if one clause is ok. Sometimes they need to draft something, look something up, or update a file. The system should handle any of these without the user knowing what's happening underneath.

No pipeline phases. No slash commands for legal work. No workflow selection. The user says what they need. The system figures out the rest.

---

## Architecture

### Three concepts

```
PRIMITIVES   — reusable operations the system knows how to do
PRACTICE/    — the judgment layer
MATTERS      — persistent state
```

**Primitives** are the system's capabilities — like CLI commands. Each one does one category of work. Flags/modes within each primitive control what specifically happens. The LLM selects and composes them based on what the user asks for.

**The user just talks.** The LLM reads the request, picks the right primitives, executes them, and presents the result. A full contract review uses all 5 primitives. A quick "is this clause ok?" uses 1. The user didn't do anything differently.

### Activation

The `/counsel-os:counsel` skill auto-invokes when the user's request matches legal work. Its description covers: contract review, clause checking, legal drafting, position lookups, compliance checking, practice management. The Claude Code plugin system matches user intent to skill descriptions and invokes automatically — no slash command needed.

The skill's SKILL.md contains the full orchestrator: primitive index, intent routing, 4-layer knowledge system, matter management, output standards. When invoked, all of this loads into context.

### Utility skills

| Skill | Purpose |
|---|---|
| `/counsel-os:browse` | Web extraction — data rooms, portals, legal research |
| `/counsel-os:retro` | Practice analytics — calibrated to practice shape; statistics only at volume, knowledge harvest always |
| `/counsel-os:setup` | Guided onboarding — configure vault, seed content |
| `/counsel-os:update` | Sync — pull latest plugin, sync law/ and practice-seed/ |
| `/counsel-os:law-refresh` | Refresh USER-OWNED law content — custom areas, `managed-by: user` files |

The update skill is hardened against three field failures: law changes are detected by content diff, not `content-version` date (same-day releases produce identical dates with different content); practice-seed changes are detected by diffing the new seed against the *previously installed version's* seed, not seed-vs-vault (which flags every customized file as a "change"); vault commits are staged by pathspec, never `git add -A` (a pre-loaded index once swept unrelated vault work into an update commit).

---

## The 5 primitives

```
read       — Understand a document
research   — Find context from the knowledge system
evaluate   — Assess against standards and/or law
draft      — Generate any output (text, redlines, documents, summaries)
remember   — Persist state and propose knowledge updates
```

Each primitive is a .md file in `primitives/`, structured by mode. Fat files, organized so the LLM reads only the section it needs.

### read

Read and understand a document. Handles .docx (pandoc with tracked changes), .pdf, pasted text. Produces: parties, terms, clause inventory, dates, commercial terms. Reports tracked changes and comments. Mode: `--redline` — when a counterparty returns a .docx markup, `scripts/extract_redlines.py` extracts every tracked change and comment into structured records (original vs revised text per paragraph, inserted/deleted fragments, author, date, anchored comments) for a change-by-change assessment.

### research

Find context from the knowledge system. Modes: `--law` (trigger conditions), `--position` (practice/standards/), `--entity` (entity lookup), `--matter` (existing state), `--library` (clause language), `--method` (reference guide). Builds effective positions by merging the 4 knowledge layers; consults `practice/reference/` as source material outside the merge. All knowledge-base searches go through one runtime-detected mechanism defined in `skills/counsel/SKILL.md` (Knowledge Base Search): if a content-index MCP tool (e.g. QMD) is connected in the session, use it for vault-wide search; otherwise fall back to filesystem grep. No `discovery:` config setting — the choice is per-session, not per-install.

### evaluate

Assess against standards and/or law. Modes: `--position` (gap analysis against practice/standards/), `--compliance` (regulatory check with specific citations), or both (default for full reviews). Per-issue assessment with rationale and priority tiers. Escalation check against profile.md thresholds. For full reviews, loads the method file as a coverage checklist.

### draft

Generate any output. Modes: `--counter-language`, `--memo`, `--email`, `--summary`, `--clause`, `--redline`. Audience parameter: `--for` (business team, executive, counterparty, internal legal). Voice from profile.md. Script pipeline for .docx tracked changes (apply_redlines.py → word_compare.sh); redline hygiene rules live in `primitives/redline-output.md`.

### remember

Persist state and propose knowledge updates. Modes: `--matter` (automatic — create/update matter file), `--entity` (ask first — propose counterparty file updates), `--knowledge` (ask first — propose practice/memory updates), `--reference` (ask first — import third-party material into practice/reference/ with provenance frontmatter, via import_reference.sh). Matter staging: intake → working → closed.

**Lifecycle hygiene:** when listing or resuming matters, non-closed matters that look stale (~30 days untouched, or next action already done) earn one bundled close-or-update proposal per session, never blocking the actual request. Closing is where entity, library, and knowledge harvests happen — stale-open matters starve the learning loop.

---

## How it works — examples

```
"Review this MSA from Acme"
  read → research → evaluate → draft --summary → remember --matter

"Is this indemnification clause ok?"
  research --position → evaluate

"What's our position on liability?"
  research --position

"What did we agree with Acme?"
  research --entity

"Draft a response to their redline on section 5"
  research --entity --library → draft --counter-language

"Summarize this for David"
  read (if needed) → draft --summary --for executive

"Create a redline"
  read → research → evaluate → draft --redline → remember --matter

"Opposing counsel sent back a markup — what did they change?"
  read --redline → research → evaluate → draft --counter-language → remember --matter

"Is this DPA GDPR-compliant?"
  read → research --law → evaluate --compliance → draft --summary

"Import this folder of form agreements as reference"
  remember --reference

"Update the Acme file"
  remember --entity

"Close this matter"
  remember --matter (stage → closed) → remember --entity → remember --knowledge
```

### The confidence gradient

| Situation | Behavior |
|---|---|
| High confidence, familiar task | Run primitives automatically. Show progress. |
| Ambiguous scope | Propose a plan. Ask what to focus on. |
| Missing context | Ask: "Which matter?" or "Which counterparty?" |
| High risk finding | Flag immediately, don't bury it. |

---

## The 4-layer knowledge system

```
PRECEDENCE (highest to lowest):

1. law/          — Hard constraints. Never override. Cite specifically.
2. Entity files  — Deal-specific overrides. Discovered via entity lookup (qmd or filesystem).
3. practice/     — User's standards, methods, library, profile.
4. memory/       — Institutional learning. Inform, don't override.
```

Strictest wins for law/. Compound, don't replace. Flag jurisdictional tension.

**practice/reference/ sits outside the precedence stack.** Curated source material — imported form agreements, checklists, treatise excerpts — that informs issue-spotting and sample language but never sets or shifts a position. Cite-check against law/, never lift verbatim. Files carry `counsel-os-type: reference` with provenance and date; imported via `remember --reference` / `scripts/import_reference.sh`.

**These rules are tested, not just stated.** See Safety-rule evals below.

---

## Law content ownership

law/ files are physical copies in the user's vault, **plugin-managed by default**: maintainers refresh shipped content upstream against primary sources (verify-and-patch with dated `last-reviewed` attestations and cited authorities — method in `docs/law-refresh-runbook.md`), and `/counsel-os:update` syncs the result into the vault.

Ownership is a dial, not a switch:

| Setting | Effect |
|---|---|
| (default) | Update syncs shipped law areas after approval; `auto_apply_law_updates: true` in config.md skips per-update prompts |
| Custom area the user created | User-owned automatically — update never touches areas it doesn't ship; `/counsel-os:law-refresh` maintains it |
| `managed-by: user` in a file's frontmatter | Update permanently skips that file, even under auto-apply |
| `law_management: user` in config.md | Update stops syncing law entirely; the user owns the whole library |

`/counsel-os:law-refresh` runs the same verify-and-patch method on user-owned content only: extract perishable claims, verify against primary sources, patch the deltas, attest after supervised review. Plugin-managed areas are excluded — those arrive refreshed via update.

---

## Safety-rule evals

The precedence rules ship with live agent tests. Fixtures in `evals/fixtures/` may carry a mini-vault (`evals/vaults/{name}/` — a tiny, self-contained marked legal root) engineered so the correct behavior is decisive: a practice standard that permits what law forbids, a reference form presented as "our position," another counterparty's concession offered as precedent, an always-escalate threshold under sign-today deal pressure.

`scripts/run_evals.py --generate` copies each mini-vault to a temp dir, points `COUNSEL_OS_LEGAL_ROOT` at it, and runs the counsel agent headlessly (`claude -p --plugin-dir <repo>`) against the working tree. Scoring is deterministic (anchor terms per expected catch). All four layer invariants must pass before release; CI runs the scorer's free self-test on every push.

---

## practice/methods/ — role

Method files are **reference guides**, not workflows. They tell the LLM what to prioritize for a given type of work — clause types to check, common traps, checklists for coverage. The LLM consults them for full reviews, adapts or skips for targeted requests.

---

## Repository structure

```
counsel-os/
  primitives/                    # The 5 instruction files
    read.md
    research.md
    evaluate.md
    draft.md
    remember.md
    redline-output.md            # Redline hygiene rules (loaded by draft --redline)

  skills/                        # Plugin skills
    counsel/                     # Auto-invoked for all legal work
    browse/                      # Web extraction (local headless Chromium daemon)
    retro/                       # Practice analytics
    setup/                       # Onboarding
    update/                      # Content sync
    law-refresh/                 # Refresh user-owned law content

  knowledge/                     # Shipped content
    law/                         # 26 law areas (attested frontmatter, validated in CI)
    practice-seed/               # Starting practice content
      profile.md
      standards/                 # 24 position files
      methods/                   # 29 reference guides
      library/                   # 21 clause language categories
      reference/                 # Seeded reference area (user fills via imports)

  evals/                         # Golden-matter + safety-rule evals
    fixtures/ vaults/ outputs/ sample-outputs/

  scripts/                       # Automation
    apply_redlines.py            # .docx text replacements + comments
    extract_redlines.py          # Inbound tracked-changes extraction (read --redline)
    clean_format.py              # .docx professional formatting
    word_compare.sh              # Word Compare via AppleScript
    legal-template.docx          # Style template
    import_reference.sh          # Third-party material → practice/reference/
    resolve_legal_root.sh        # Canonical legal-root discovery (exit 0/1/2)
    release.sh                   # One-command release (4 manifests + lint gate)
    lint_knowledge.py            # knowledge/ conventions + version sync (CI)
    bump_content_versions.py     # content-version bumps for changed groups
    validate_law_frontmatter.py  # Law attestation policy check (CI)
    run_evals.py                 # Eval scorer + headless generation

  docs/law-refresh-runbook.md    # Maintainer law-refresh method
  templates/memory/              # Seed template for patterns.md
  CONFIGURATION.md               # Plugin config docs (per-user config lives at {legal_root}/config.md in the user's vault)
```

---

## Principles

1. **Lawyers don't think.** The system handles decomposition. The user states outcomes.
2. **Markdown first.** Primitives are .md files. No compiled runtime.
3. **Fat primitives, structured by mode.** Read the section you need, skip the rest.
4. **Practice/ applies judgment.** Primitives consult practice/ — they don't embed judgment.
5. **Matters hold state.** Substantive work persists. Quick questions don't.
6. **Always ask before writing knowledge.** Matter state is automatic. Practice/entity/memory changes need consent.

---

## Open questions

### 1. Non-contract matter types
The architecture supports any matter type — advisory, compliance, governance, regulatory. Method files exist for 29 types, and retro now calibrates to practice shape rather than assuming contract volume. But real-world testing still centers on contract review. Needs validation on other types.

### 2. Multi-document operations
Two distinct cases. **(a) Independent** — "Review all 12 contracts in this data room" — a loop over single reviews (proposed as batch review, cou-47). **(b) Dependent** — "What do the current operative Acme terms say, as amended three times?" — a merge of a deal family (base + amendments + SOWs) into one effective-terms view; designed in `operative-agreement-stack.md` (cou-49, design accepted pending). Case (a)'s execution model (cap + resume over a folder) is still open.
