# Counsel OS — Architecture Direction

> **Date:** 2026-04-15
> **Status:** Implemented (v0.7.x)

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
| `/counsel-os:retro` | Practice analytics — decision patterns, position drift |
| `/counsel-os:setup` | Guided onboarding — configure vault, seed content |
| `/counsel-os:update` | Sync — pull latest plugin, sync law/ and practice-seed/ |

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

Read and understand a document. Handles .docx (pandoc with tracked changes), .pdf, pasted text. Produces: parties, terms, clause inventory, dates, commercial terms. Reports tracked changes and comments. No flags — input is a document, output is structured understanding.

### research

Find context from the knowledge system. Modes: `--law` (trigger conditions), `--position` (practice/standards/), `--entity` (entity lookup), `--matter` (existing state), `--library` (clause language), `--method` (reference guide). Builds effective positions by merging the 4 knowledge layers. All knowledge-base searches go through one runtime-detected mechanism defined in `skills/counsel/SKILL.md` (Knowledge Base Search): if a content-index MCP tool (e.g. QMD) is connected in the session, use it for vault-wide search; otherwise fall back to filesystem grep. No `discovery:` config setting — the choice is per-session, not per-install.

### evaluate

Assess against standards and/or law. Modes: `--position` (gap analysis against practice/standards/), `--compliance` (regulatory check with specific citations), or both (default for full reviews). Per-issue assessment with rationale and priority tiers. Escalation check against profile.md thresholds. For full reviews, loads the method file as a coverage checklist.

### draft

Generate any output. Modes: `--counter-language`, `--memo`, `--email`, `--summary`, `--clause`, `--redline`. Audience parameter: `--for` (business team, executive, counterparty, internal legal). Voice from profile.md. Script pipeline for .docx tracked changes (apply_redlines.py → word_compare.sh).

### remember

Persist state and propose knowledge updates. Modes: `--matter` (automatic — create/update matter file), `--entity` (ask first — propose counterparty file updates), `--knowledge` (ask first — propose practice/memory updates). Matter staging: intake → working → closed.

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

"Is this DPA GDPR-compliant?"
  read → research --law → evaluate --compliance → draft --summary

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

  skills/                        # Plugin skills
    counsel/                     # Auto-invoked for all legal work
    browse/                      # Web extraction
    retro/                       # Practice analytics
    setup/                       # Onboarding
    update/                      # Content sync

  knowledge/                     # Shipped content
    law/                         # 26 law areas
    practice-seed/               # Starting practice content
      profile.md
      standards/                 # 24 position files
      methods/                   # 29 reference guides
      library/                   # 22 clause language categories

  scripts/                       # Automation
    apply_redlines.py            # .docx text replacements + comments
    clean_format.py              # .docx professional formatting
    word_compare.sh              # Word Compare via AppleScript
    legal-template.docx          # Style template

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
The architecture supports any matter type — advisory, compliance, governance, regulatory. Method files exist for 29 types. But real-world testing has focused on contract review. Needs validation on other types.

### 2. Multi-document operations
"Review all 12 contracts in this data room." Is this a loop over single reviews, or a different execution model? Not yet designed.
