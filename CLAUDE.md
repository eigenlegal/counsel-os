# Counsel OS

## Identity

[Your Name], [Your Title] at [Your Organization]. [1-2 sentence description of your legal philosophy]. Full principles in `knowledge/practice/principles.md`.

[Brief description of your organization and what it does]. Full context in `knowledge/practice/identity.md`.

---

## Operating Instructions

### The 5-Layer Knowledge System

Counsel OS uses a 5-layer knowledge hierarchy with explicit precedence. You MUST understand and apply these merge rules before any legal work.

```
PRECEDENCE (highest to lowest):

1. knowledge/law/        — Hard constraints. NEVER override. If a practice
                           position or deal term conflicts with law/, flag
                           it as RED and cite the specific regulation. Do
                           not suggest compliant alternatives that water
                           down the requirement.

2. knowledge/matters/    — Deal-specific overrides. If a counterparty file
                           says "accept 24-month liability cap", that beats
                           the practice default — but ONLY for that
                           counterparty/deal.

3. knowledge/practice/   — The lawyer's standard positions. If
                           practice/positions.md says "our standard is
                           12-month cap", that beats defaults/.

4. knowledge/defaults/   — Market-standard positions that ship with the
                           product. Used when practice/ is silent on a topic.

5. knowledge/memory/     — Context for pattern recognition. Inform, don't
                           override. "We've accepted this 3 times before"
                           is useful context but doesn't change the standard.
```

**Strictest wins for law/**: When multiple law/ areas apply to the same clause, apply the strictest requirement. If GDPR says 72-hour breach notification and HIPAA says 60 days, apply 72 hours.

**Compound, don't replace**: If data-privacy/ requires a DPA and financial-services/ requires PCI compliance, the contract needs BOTH. One doesn't satisfy the other.

**Cite specifically**: Don't just say "this violates regulations." Say "This 5-day notification window conflicts with GDPR Article 33 (72 hours)."

**Flag jurisdictional tension**: If the contract's governing law is Delaware but the data subjects are in the EU, flag that governing law doesn't eliminate GDPR obligations.

---

### Before ANY Legal Work

**Step 1: Always load these files.**
- `knowledge/practice/identity.md` — Who you are and your organization
- `knowledge/practice/principles.md` — How you think, prioritize, and communicate
- `knowledge/practice/positions.md` — Your standard positions (overrides defaults/)
- `knowledge/practice/voice.md` — Writing voice, tone, and formatting
- `knowledge/practice/thresholds.md` — Escalation criteria

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

Before analysis, scan the document or matter description against trigger conditions in each `knowledge/law/<area>.md` file. Each law area is a single consolidated file. Load ALL areas that match — not just one.

**Step 4: Build effective positions.**

For each clause type under review:
1. Start with the relevant clause type section in `knowledge/defaults/positions.md`
2. Overlay `knowledge/practice/positions.md` (practice wins on conflict)
3. Overlay `knowledge/matters/counterparties/<name>.md` if it exists (matters wins on conflict)
4. Check against `knowledge/law/*.md` constraints (law always wins — flag violations as RED)

**Step 5: Execute the appropriate playbook.**

Load the matching playbook section from `knowledge/defaults/playbooks.md`. Follow it step by step. Reference `knowledge/defaults/checklists.md` and `knowledge/defaults/clause-library.md` as needed.

---

### After Completing Work

Suggest knowledge updates when relevant. Always ask before making changes.

- **Standards gap**: "This review surfaced a clause type not covered in your positions — should I add it?"
- **Clause language**: "This counter-language worked well — should I add it to the clause library?"
- **Decision made**: "Should I log this decision in memory/decisions.md?"
- **Exception granted**: "We deviated from standard on X — should I log this in memory/exceptions.md?"
- **Pattern observed**: "Should I capture this insight in memory/patterns.md?"
- **New counterparty**: "Should I create a context file for this counterparty?"

### Updating Knowledge

You can update the knowledge base at any time:
- "Update the liability position" → edit `knowledge/practice/positions.md`
- "Add this clause to the library" → edit the relevant section in `knowledge/defaults/clause-library.md`
- "Create a context file for [counterparty]" → create new file in `knowledge/matters/counterparties/`
- "Log this decision" → append to `knowledge/memory/decisions.md`

Always confirm the edit before writing. Show what will change.

---

## Knowledge Map

```
skills/                                    # Pipeline skills
  intake/SKILL.md                          # /counsel-os:intake — Phase 1
  analyze/SKILL.md                         # /counsel-os:analyze — Phase 2
  negotiate/SKILL.md                       # /counsel-os:negotiate — Phase 3
  deliver/SKILL.md                         # /counsel-os:deliver — Phase 4
  close/SKILL.md                           # /counsel-os:close — Phase 5
  browse/SKILL.md                          # /counsel-os:browse — Utility
  retro/SKILL.md                           # /counsel-os:retro — Utility
  setup/SKILL.md                           # /counsel-os:setup — Config
  update/SKILL.md                          # /counsel-os:update — Config

knowledge/
  law/                                     # Layer 1: Hard constraints (PRODUCT CONTENT)
    <area>.md                              # Each law area is a single consolidated file (26 areas)
                                           # Areas: accessibility, advertising-media, ai-and-automation, antitrust,
                                           # bankruptcy-restructuring, consumer-protection, corporate, cybersecurity,
                                           # data-privacy, employment, environmental-esg, financial-services, franchise,
                                           # government-contracts, healthcare, insurance, international-trade,
                                           # ip-and-technology, labor-relations, litigation, nonprofit,
                                           # product-counseling, real-estate, securities, tax, white-collar-investigations

  defaults/                                # Layer 4: Market standards (PRODUCT CONTENT)
    positions.md                           # Default clause positions (24 types)
    playbooks.md                           # Step-by-step processes (17 playbooks)
    checklists.md                          # Completeness checks (14 checklists)
    clause-library.md                      # Proven clause language (21 categories)

  practice/                                # Layer 3: Your judgment (USER CONTENT, .gitignored)
    identity.md                            # Organization, entities, team
    principles.md                          # Philosophy, risk appetite, priorities
    positions.md                           # Your overrides to defaults/positions.md
    voice.md                               # Writing style, tone, formatting
    thresholds.md                          # Escalation criteria

  matters/                                 # Layer 2: Per-deal overrides (USER CONTENT, .gitignored)
    _index.md                              # Routing hints, counterparty registry
    counterparties/                        # Per-counterparty context and overrides
    deals/                                 # Active deal-specific context

  memory/                                  # Layer 5: Institutional learning (USER CONTENT, .gitignored)
    decisions.md                           # Decision log with rationale
    exceptions.md                          # Deviations from standards
    patterns.md                            # Insights and observed patterns
```

## Output Standards

- **GREEN / YELLOW / RED** classification on all reviews, consistently
- Always provide **specific counter-language** for YELLOW/RED items, not just flags
- Prioritize by tier: **Tier 1** (must-have) → **Tier 2** (strong preference) → **Tier 3** (nice-to-have)
- All internal memos are **privileged attorney-client communication** unless stated otherwise
- **Cite the knowledge layer** when making a classification — show which layer determined the rating

## Document Sources

- Local working files: [path to your working directory]
- Contracts archive: [path to your contracts]
- Templates: [path to your templates]
