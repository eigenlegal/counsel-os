# Counsel OS

## Identity

[Your Name], [Your Title] at [Your Organization]. [1-2 sentence description of your legal philosophy]. Full principles in `practice/principles.md` (at your legal root).

[Brief description of your organization and what it does]. Full context in `practice/identity.md`.

---

## Operating Instructions

### The 5-Layer Knowledge System

Counsel OS uses a 5-layer knowledge hierarchy with explicit precedence. You MUST understand and apply these merge rules before any legal work.

```
PRECEDENCE (highest to lowest):

1. law/                  — Hard constraints. NEVER override. If a practice
                           position or deal term conflicts with law/, flag
                           it as RED and cite the specific regulation. Do
                           not suggest compliant alternatives that water
                           down the requirement.

2. Entity files          — Deal-specific overrides. If a counterparty file
                           says "accept 24-month liability cap", that beats
                           the practice default — but ONLY for that
                           counterparty/deal. Discovered via QMD query.

3. practice/             — The lawyer's standard positions. If
                           practice/positions.md says "our standard is
                           12-month cap", that beats defaults/.

4. defaults/             — Market-standard positions. Used when practice/
                           is silent on a topic.

5. memory/               — Context for pattern recognition. Inform, don't
                           override. "We've accepted this 3 times before"
                           is useful context but doesn't change the standard.
```

**Strictest wins for law/**: When multiple law/ areas apply to the same clause, apply the strictest requirement. If GDPR says 72-hour breach notification and HIPAA says 60 days, apply 72 hours.

**Compound, don't replace**: If data-privacy/ requires a DPA and financial-services/ requires PCI compliance, the contract needs BOTH. One doesn't satisfy the other.

**Cite specifically**: Don't just say "this violates regulations." Say "This 5-day notification window conflicts with GDPR Article 33 (72 hours)."

**Flag jurisdictional tension**: If the contract's governing law is Delaware but the data subjects are in the EU, flag that governing law doesn't eliminate GDPR obligations.

---

### Path Resolution

Read `config.local.md` (if it exists) or `config.md` from the plugin root to find:

- **Legal root** — The folder where Counsel OS manages framework content (law/, defaults/, practice/, memory/). All paths below are relative to this root.
- **Entity discovery** — Company/counterparty files are discovered via QMD queries on `counsel-os-type` frontmatter properties. Entity files can live anywhere in the user's vault.

### Before ANY Legal Work

**Step 1: Load practice files from `{legal_root}/practice/`.**
- `practice/identity.md` — Who you are and your organization
- `practice/principles.md` — How you think, prioritize, and communicate
- `practice/positions.md` — Your standard positions (overrides defaults/)
- `practice/voice.md` — Writing voice, tone, and formatting
- `practice/thresholds.md` — Escalation criteria

**Step 2: Identify the phase and load the matching skill.**

| Skill | Phase | What It Does |
|-------|-------|-------------|
| `/counsel-os:intake` | Phase 1 | Classify matter, load context, detect applicable law, estimate complexity |
| `/counsel-os:analyze` | Phase 2 | Deep review against effective positions (merged from all layers) |
| `/counsel-os:negotiate` | Phase 3 | Generate redlines with rationale, fallback positions, and strategy |
| `/counsel-os:deliver` | Phase 4 | Package output, apply voice styling, post to connected services |
| `/counsel-os:close` | Phase 5 | Log decisions, update knowledge, suggest improvements |
| `/counsel-os:browse` | Utility | Document extraction from portals via headless browser |
| `/counsel-os:retro` | Utility | Practice analytics from decision history |
| `/counsel-os:setup` | Config | Guided onboarding for new users |
| `/counsel-os:update` | Config | Pull latest product content (law/ + defaults/) |

**Step 3: Auto-detect applicable law areas.**

Before analysis, scan the document or matter description against trigger conditions in each `{legal_root}/law/<area>/_overview.md` file. Each law area is a folder containing `_overview.md` (trigger conditions, sub-file loading rules, key constraints) and individual sub-topic files. All files use `counsel-os-type: law-area` frontmatter. Load ALL areas that match — not just one.

**Step 4: Build effective positions.**

For each clause type under review:
1. Start with the relevant clause type section in `{legal_root}/defaults/positions.md`
2. Overlay `{legal_root}/practice/positions.md` (practice wins on conflict)
3. Query QMD for the counterparty's entity file (search for company name + `counsel-os-type` in [counterparty, vendor, customer]). If found, overlay any agreed positions from that file (entity overrides win on conflict with practice)
4. Check against `{legal_root}/law/<area>/_overview.md` constraints (law always wins — flag violations as RED)

**Step 5: Execute the appropriate playbook.**

Load the matching playbook section from `{legal_root}/defaults/playbooks.md`. Follow it step by step. Reference `{legal_root}/defaults/checklists.md` and `{legal_root}/defaults/clause-library.md` as needed.

---

### After Completing Work

Suggest knowledge updates when relevant. Always ask before making changes. Use QMD to discover the correct file to update.

- **Standards gap**: "This review surfaced a clause type not covered in your positions — should I add it?"
- **Clause language**: "This counter-language worked well — should I add it to the clause library?"
- **Deal outcomes**: "Should I update the [counterparty] file with the agreed positions, decisions, and exceptions from this deal?" → Discover entity file via QMD, update in place.
- **Practice pattern**: "Should I capture this insight in memory/patterns.md?" → Only for cross-cutting practice-level observations, not entity-specific details.
- **New counterparty**: "Should I create a context file for this counterparty?" → Ask the user where to save it and add `counsel-os-type` frontmatter.

### Updating Knowledge

You can update the knowledge base at any time:
- "Update the liability position" → edit `{legal_root}/practice/positions.md`
- "Add this clause to the library" → edit `{legal_root}/defaults/clause-library.md`
- "Create a context file for [counterparty]" → ask user for save location, create file with `counsel-os-type` frontmatter
- "Update [counterparty] file" → discover via QMD, update in place
- "Log this decision" → update the entity file via QMD discovery

Always confirm the edit before writing. Show what will change.

---

## Knowledge Map

```
Plugin (methodology + tooling):
  skills/                                    # Pipeline skills
    intake/SKILL.md                          # /counsel-os:intake — Phase 1
    analyze/SKILL.md                         # /counsel-os:analyze — Phase 2
    negotiate/SKILL.md                       # /counsel-os:negotiate — Phase 3
    deliver/SKILL.md                         # /counsel-os:deliver — Phase 4 (includes Step 3b: Word tracked changes)
    close/SKILL.md                           # /counsel-os:close — Phase 5
    browse/SKILL.md                          # /counsel-os:browse — Utility
    retro/SKILL.md                           # /counsel-os:retro — Utility
    setup/SKILL.md                           # /counsel-os:setup — Config
    update/SKILL.md                          # /counsel-os:update — Config
  scripts/                                   # Automation scripts
    apply_redlines.py                        # Apply text replacements + comments to .docx via python-docx
    word_compare.sh                          # Drive Word Compare via AppleScript for tracked changes

User's vault (all knowledge — discovered via config.md + QMD):
  {legal_root}/
    law/                                     # Layer 1: Hard constraints (26 areas)
      <area>/                                # One folder per law area
        _overview.md                         # Trigger conditions, sub-file rules, key constraints
        <sub-topic>.md                       # Individual sub-topic files (counsel-os-type: law-area)
    defaults/                                # Layer 4: Market standards
      positions.md                           # counsel-os-type: default-positions (24 types)
      playbooks.md                           # counsel-os-type: playbook (17 playbooks)
      checklists.md                          # counsel-os-type: checklist (14 checklists)
      clause-library.md                      # counsel-os-type: clause-library (21 categories)
    practice/                                # Layer 3: Your judgment
      identity.md                            # counsel-os-type: practice
      principles.md                          # counsel-os-type: practice
      positions.md                           # counsel-os-type: practice
      voice.md                               # counsel-os-type: practice
      thresholds.md                          # counsel-os-type: practice
    memory/                                  # Layer 5: Institutional learning
      patterns.md                            # counsel-os-type: memory-patterns
      retro-*.md                             # Practice analytics snapshots

  {anywhere in vault}/                       # Layer 2: Entity-specific overrides
    <company>.md                             # counsel-os-type: counterparty | vendor | customer | prospect
                                             # Discovered via QMD query, not folder paths
```

## Output Standards

- **GREEN / YELLOW / RED** classification on all reviews, consistently
- Always provide **specific counter-language** for YELLOW/RED items, not just flags
- Prioritize by tier: **Tier 1** (must-have) → **Tier 2** (strong preference) → **Tier 3** (nice-to-have)
- All internal memos are **privileged attorney-client communication** unless stated otherwise
- **Cite the knowledge layer** when making a classification — show which layer determined the rating
- **Word tracked changes:** When delivering negotiation redlines on a .docx source, `/deliver` Step 3b auto-detects Word + python-docx and offers tracked changes output attributed to the user. Temp files must go alongside the original document (not `/tmp` — macOS sandbox blocks Word from `/tmp`).

## Document Sources

- Local working files: [path to your working directory]
- Contracts archive: [path to your contracts]
- Templates: [path to your templates]
