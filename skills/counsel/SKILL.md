---
name: counsel
description: "Legal work across any practice area — data privacy, employment, IP, corporate, securities, financial services, litigation, antitrust, M&A, tax, real estate, healthcare, government contracts, AI and technology, insurance, international trade, consumer protection, bankruptcy, environmental, and more. Composes five primitives (read, research, evaluate, draft, remember) to handle any legal task: answering questions, researching law and past decisions, reviewing documents, analyzing positions, drafting memos and correspondence, managing matters and entities, and building institutional knowledge. Use PROACTIVELY for ANY legal, regulatory, or compliance request. Trigger phrases include: 'can we do [X]', 'is [X] legal/compliant/allowed', 'what's the law on [X]', 'research [regulation/doctrine/case]', 'what's our position on [X]', 'write a memo on [X]', 'draft a [policy/notice/letter/email/response]', 'review this [document]', 'look at this [contract/agreement/policy/NDA/MSA/SOW/DPA/BAA/LOI/term sheet/handbook/filing/complaint/demand letter/notice]', 'is this [clause/term/provision] ok', 'redline this', 'mark up this agreement', 'check [clause] against [regulation/standard]', 'does this comply with [GDPR/CCPA/HIPAA/SOC 2/SEC/PCI-DSS/FCPA/export controls/state law]', 'what did we agree with [counterparty]', 'pull up the [counterparty/vendor/customer] file', 'status of [matter]', 'close this matter', 'log this decision', 'update our standards on [topic]'. Also invoke whenever the user mentions: a specific legal/regulatory topic, a counterparty/vendor/customer/entity by name, a matter or deal, a clause or provision, a policy or governance document, an employment or HR issue, an IP asset, a dispute or claim, a filing or registration, a board or corporate action, or anything else that calls for legal judgment."
---

# Counsel OS

## How This System Works

Counsel OS is a legal practice system. The user says what they need — review a contract, check a clause, draft a response, look something up. You figure out how to do it using the primitives below. There are no phases, no pipeline, no slash commands for legal work. Just capabilities you compose based on the request.

### The 5 Primitives

These are your capabilities. For each request, decide which ones to use and in what combination. Read the full primitive file (`primitives/{name}.md`) when you need the detailed instructions for a mode.

```
read       — Understand a document. Extract structure, terms, parties, key provisions.
research   — Find context from the knowledge system. Law areas, positions, entities, matters, library.
evaluate   — Assess against standards and/or law. Per-issue, with rationale and citations.
draft      — Generate any output. Counter-language, memos, emails, summaries, redlines.
remember   — Persist state and propose knowledge updates. Matter files, entity files, practice.
```

### Intent Routing

Match the user's request to primitives. This is guidance, not rigid rules — use judgment.

| User says | Primitives |
|---|---|
| "Review this [document]" | read → research → evaluate → draft --summary → remember --matter |
| "Is this [clause] ok?" | research --position → evaluate |
| "What's our position on [topic]?" | research --position |
| "What did we agree with [counterparty]?" | research --entity |
| "Draft a response to [specific issue]" | research --entity --library → draft --counter-language |
| "Summarize this for [person/team]" | read (if needed) → draft --summary --for [audience] |
| "Create a redline" | read → research → evaluate → draft --redline → remember --matter |
| "Is this [document] compliant with [regulation]?" | read → research --law → evaluate --compliance |
| "Update the [counterparty] file" | remember --entity |
| "Close this matter" | remember --matter (stage → closed) → remember --entity → remember --knowledge |

**Full document reviews require coverage checking.** When the user asks to review an entire document (not just a single clause), load the relevant method file from `practice/methods/` (e.g., `contract-review.md` for contracts, `nda-triage.md` for NDAs). The method file is a coverage checklist — use it to verify you've evaluated all relevant clause types, run compliance checks, and checked for missing provisions. Don't present findings until you've verified coverage.

**Continuous learning.** As you work, proactively propose knowledge updates when you notice something worth capturing — a deviation from standard, effective counter-language, a counterparty pattern, a position gap. Don't wait for the user to ask or for the matter to close. Just mention it: "I noticed [observation]. Want me to update [file]?"

For complex or unfamiliar requests, propose a plan before executing:
> "I'll read the document, check each clause against your positions and applicable law, and summarize the findings. Want me to focus on anything specific?"

### When to Load Primitive Files

- **Simple requests** (lookups, quick checks): You may not need the full primitive file. If you know how to run an entity lookup or check a position, just do it.
- **Substantive work** (full reviews, redlines, compliance checks): Read the relevant primitive files for the detailed mode-specific instructions. `evaluate.md` in particular has the full position-checking and compliance-checking methodology.
- **Document output** (.docx redlines, tracked changes): Read `draft.md` for the script pipeline instructions.

---

## The 4-Layer Knowledge System

Counsel OS uses a 4-layer knowledge hierarchy with explicit precedence. Apply these merge rules on every evaluation.

```
PRECEDENCE (highest to lowest):

1. law/                  — Hard constraints. NEVER override. If a practice
                           position or deal term conflicts with law/, flag
                           it and cite the specific regulation. Do not
                           suggest compliant alternatives that water down
                           the requirement.

2. Entity files          — Deal-specific overrides. If a counterparty file
                           says "accept 24-month liability cap", that beats
                           the practice default — but ONLY for that
                           counterparty/deal. Discovered via Entity and
                           Matter Lookup.

3. practice/             — All practice content — positions, methods,
                           library, and your professional profile. If
                           practice/standards/ defines your positions,
                           that is the authoritative source.

4. memory/               — Context for pattern recognition. Inform, don't
                           override. "We've accepted this 3 times before"
                           is useful context but doesn't change the standard.
```

**Strictest wins for law/**: When multiple law/ areas apply to the same clause, apply the strictest requirement.

**Compound, don't replace**: If data-privacy/ requires a DPA and financial-services/ requires PCI compliance, the contract needs BOTH.

**Cite specifically**: Don't just say "this violates regulations." Say "This 5-day notification window conflicts with GDPR Article 33 (72 hours)."

**Flag jurisdictional tension**: If the contract's governing law is Delaware but the data subjects are in the EU, flag that governing law doesn't eliminate GDPR obligations.

---

## Building the Effective Position

Before evaluating a clause or proposing language, assemble the **effective position** — the layered answer to "what should this say for this deal?"

Walk the procedure bottom-up, from baseline to absolute constraint:

1. **Practice baseline.** Load `practice/standards/{clause-type}.md` → ## Our Position. This is the starting point: your default ask, your walk-aways, your escalation triggers.

2. **Entity overrides.** Look up the counterparty's entity file (Knowledge Base Search). If you've previously agreed to a non-default position with this counterparty, that becomes the effective position for this deal. Entity overrides supersede practice.

3. **Law constraints.** Cross-reference loaded `law/` areas for floors or ceilings (e.g., GDPR 72-hour breach notification, state employment minimums). Law always wins on conflict — see the precedence box above.

4. **Memory context.** Scan `memory/` for relevant patterns ("we've accepted this 3 times before," "this counterparty walked from a similar deal last quarter"). Memory informs your rationale, confidence, and fallback positions — but does not change the classification or override the layers above.

**Not part of the effective position:** `practice/reference/` is source material (example agreements, treatise excerpts), not a layer in this procedure. Consult it for issue-spotting and sample language only — it never sets or shifts a position, must be cite-checked against current `law/`, and is never lifted verbatim.

The procedure constructs bottom-up; the precedence box above resolves conflicts top-down. These are inverses on purpose — assembly starts from your default and progressively narrows; conflicts resolve from absolute constraint downward.

**Reporting the effective position.** When asked, attribute each layer:

```
Limitation of liability:
- Practice standard: mutual cap at 12 months of fees
  (practice/standards/limitation-of-liability.md)
- Entity override: Acme accepted 24-month cap in prior deal
  (Acme entity file)
- Law floor: data breach liability must be carved out
  (GDPR Art. 82)
- Memory context: yielded to 24-month caps for strategic accounts
  in 3 prior matters
- Effective position: 24-month cap with data breach carve-out
```

---

## Finding the Legal Root

The user's per-user configuration lives in their vault at `{legal_root}/config.md`. The plugin tree itself never carries user state. A valid config file MUST contain both:

```markdown
counsel-os-config: true
legal_root: /absolute/path/to/legal/root
```

Do not treat an unmarked `config.md` as Counsel OS config. To find `{legal_root}` on each session, use `scripts/resolve_legal_root.sh` as the canonical non-interactive implementation before doing any path-based work. The script owns the search order, validation rules, conventional vault paths, and exit-code contract.

**Claude Code procedure:**

`${CLAUDE_PLUGIN_ROOT}` is the absolute path to this plugin's installed root, set by Claude Code on every plugin invocation. Use it directly in shell commands — do NOT substitute it manually, do NOT replace it with a SKILL.md-relative path. Bash will resolve the env var to the correct absolute path.

1. Run the helper from the plugin root:
   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolve_legal_root.sh"
   ```
2. Interpret its exit code:
   - `0` → stdout is `{legal_root}`. Use that path.
   - `1` → no marked legal root was found, or `COUNSEL_OS_LEGAL_ROOT` points at an invalid root. Ask the user: *"I don't see a marked Counsel OS legal root config. Run `/counsel-os:setup` to set one up, or tell me where your existing legal root is."*
   - `2` → multiple marked legal roots were found. Read stderr for candidates and ask the user which one to use.
3. **Write the pointer file** after resolving by user choice or discovery. This caches the resolution for the next session so we don't re-scan:
   ```bash
   mkdir -p ~/.counsel-os
   echo "{resolved legal_root}" > ~/.counsel-os/legal-root
   ```
4. If shell execution is unavailable, follow the helper's documented algorithm rather than this skill carrying its own copy of the search paths. The only interaction-specific behavior here is user prompting on exit `1` or `2`.

**Cowork procedure:** shell and home-directory access may be unavailable. Scan the connected workspace for marked `config.md` files using the same validity rule. Ask the user on zero or multiple matches. Skip pointer-file caching.

5. **Read overrides from the resolved config.** After finding `{legal_root}/config.md`, read it for any optional overrides (`entities_path`, `matters_path`, `entity_properties`). Use defaults for anything not set.

6. **Cache for the session.** Once resolved, treat `{legal_root}` and the overrides as fixed for the rest of the session — don't re-run discovery on every primitive call.

**Defaults if not overridden:**
- `entities_path` → `entities`
- `matters_path` → `matters`
- `entity_properties.type_field` → `counsel-os-type`
- `entity_properties.values` → `[counterparty, vendor, customer, prospect, matter]`

**The plugin's own `CONFIGURATION.md`** is documentation only — never read it for values. The user's marked `{legal_root}/config.md` is the only authoritative source.

**Why the pointer file isn't the source of truth:** the pointer at `~/.counsel-os/legal-root` is a per-machine performance cache, not configuration. The vault's `config.md` is canonical. If they disagree (rare), trust the vault — and rewrite the pointer.

---

## Path Resolution

After resolving `{legal_root}` (above), framework paths are:

- `law/` → `{legal_root}/law/`
- `practice/` → `{legal_root}/practice/` (with `standards/`, `methods/`, `library/`, `reference/`, and `profile.md`)
- `memory/` → `{legal_root}/memory/`
- `matters/` → `{legal_root}/{matters_path}/`
- `entities/` (filesystem fallback) → `{legal_root}/{entities_path}/`

Knowledge-base search is runtime-detected — see **Knowledge Base Search** below.

---

## Knowledge Base Search

Whenever a primitive needs to find content in the user's vault — entity files, matters, past memos, prior decisions, related precedent, similar clause language — use this procedure. The same mechanism applies to every search; the primitive supplies the inputs (frontmatter type, name, free-text query), and this section defines **how** the search runs.

**Inputs (any combination):**
- `counsel-os-type` — `counterparty`, `vendor`, `customer`, `prospect`, `matter`, `practice`, `reference`, `law-area`, `memory-patterns`, `memory-decision`, etc.
- `name` — a specific identifier (company, matter, file)
- `query` — free-text or semantic search ("similar facts to...", "past redlines on indemnification")

**Output:** zero or more file paths, with optional ranked relevance. When looking up by name, may return `not found`.

**Use cases this covers:**
1. **Find a specific file by name + type** — e.g. find the Acme counterparty file (used by research/evaluate/remember when entering a matter)
2. **Enumerate by type** — list all files of a given type, no name filter (used by retro/analytics, by setup verification)
3. **Find related content** — search past matters, memos, decisions, drafts on similar facts/clauses (used by research before reading a law area, by evaluate to find precedent for a clause position, by draft to find similar past work product)

### Search mechanism

Pick at call time based on what's available in the session:

**If a content-index MCP tool is connected** (e.g. QMD's `query` / `get` / `multi_get` — typically exposed as `mcp__qmd__query` etc.), use it for every knowledge-base search. The index supports frontmatter filters, full-text query, and (with QMD) hybrid semantic ranking. It returns file paths from anywhere in the vault — content doesn't need to live under a fixed directory.

How to invoke (QMD's `query` tool):
- Lookup by name + type: filter on `counsel-os-type: {type}`, query `{name}`
- Enumerate: filter on `counsel-os-type: {type}`, no query
- Find related: filter on relevant types (e.g. `matter`, `memory-decision`), query free-text describing what you're looking for

After getting paths back, use the index's `get` / `multi_get` to retrieve content, or fall back to Read.

**Otherwise, fall back to filesystem search.** Use Grep on the relevant scope:
- `type: matter` → `{legal_root}/{matters_path}/`
- entity types → `{legal_root}/{entities_path}/`
- `practice`, `memory-*`, `law-area` → `{legal_root}/practice/`, `{legal_root}/memory/`, `{legal_root}/law/` respectively
- "Find related" use cases (no specific type) → grep across the whole legal root for keyword matches

For all filesystem searches, filter by frontmatter type when applicable, and by name/keyword in filename or content. If a directory doesn't exist, return empty.

The choice is not a configuration setting — check what tools are available in the current session and prefer the index whenever present. Both runtimes (Claude Code, Cowork) follow identical logic; the only difference is whether the user has connected QMD or another index.

### When to search vs read directly

If you already know the exact path of a file (e.g. you need `{legal_root}/law/employment.md` because the user is asking about employment law), just Read it. Knowledge Base Search is for cases where you need to **find** something — by type, by name, or by relatedness — not retrieve a known path.

### Not found

When looking up by name and no file matches, return `not found` cleanly — the entity, matter, or precedent simply hasn't been captured yet. Don't invent details. Downstream primitives can propose creating one via `remember`.

---

## Matters

Every substantive legal task lives inside a matter — a plain markdown file with `counsel-os-type: matter` frontmatter, stored in `{legal_root}/matters/`.

**When to create:** When the user starts substantive work involving a specific document or engagement. NOT for quick lookups, general questions, or one-off research.

**Discovery:** Look up by name + `counsel-os-type: matter` using the Knowledge Base Search procedure above. If a non-closed matter exists for the same counterparty, resume it rather than creating a new one.

**Stage:** `intake` → `working` → `closed`. Advance from intake to working when substantive analysis or drafting begins. Advance to closed when the user says to close or work is complete.

**Backwards compatible:** If no matter file exists, proceed using conversation context. The matter system enhances persistence, it doesn't gate functionality.

See `primitives/remember.md` for the full matter file format and management instructions.

---

## Practice Files

Load `practice/profile.md` at the start of any legal work. It contains:
- **## Identity** — who you represent, legal entities, signing authority
- **## Principles** — risk appetite, negotiation approach, prioritization framework
- **## Voice** — tone, structure, language preferences, formality by audience
- **## Escalation Thresholds** — what always gets flagged, dollar thresholds, review tracks

Other practice content loaded on demand by the primitives:
- `practice/standards/` — 24 position files (Our Position, Classification Guide, Practical Guidance)
- `practice/methods/` — Reference guides for approaching different types of work (not rigid workflows — guidance the LLM adapts based on the user's actual request)
- `practice/library/` — Clause language variants (standard, aggressive, vendor-favorable)
- `practice/reference/` — Third-party/source material the user curates: example agreements, checklists, treatise excerpts. **Source material, not positions** — it sits *outside* the precedence layers (informs issue-spotting and sample language, never governs). Always cite-check against `law/`; never lift verbatim. Files carry `counsel-os-type: reference` with provenance and date.

---

## Knowledge Updates

After completing work, the `remember` primitive proposes knowledge updates. The rules:

- **Matter state** updates automatically (the user sees the update)
- **Entity files** and **practice/standards/** changes always ask first — show what will change, wait for approval
- **Entity-specific info** (agreed positions, deal history, negotiation notes) goes in the entity file, not memory/
- **Cross-cutting patterns** (market trends, process improvements, position gaps across multiple deals) go in `memory/patterns.md`

You can update knowledge at any time, not just at close:
- "Update the liability position" → edit `practice/standards/limitation-of-liability.md`
- "Add this clause to the library" → edit `practice/library/`
- "Update the Acme file" → look up via Knowledge Base Search, propose changes
- Always confirm before writing.

---

## Knowledge Map

```
Plugin (methodology + tooling):
  primitives/                                  # The 5 capabilities
    read.md                                    # Understand a document
    research.md                                # Find context from the knowledge system
    evaluate.md                                # Assess against standards and/or law
    draft.md                                   # Generate any output
    remember.md                                # Persist state and propose knowledge updates
  skills/                                      # Utility skills
    browse/SKILL.md                            # /counsel-os:browse — Web extraction
    retro/SKILL.md                             # /counsel-os:retro — Practice analytics
    setup/SKILL.md                             # /counsel-os:setup — Guided onboarding
    update/SKILL.md                            # /counsel-os:update — Pull latest content
  scripts/                                     # Automation
    apply_redlines.py                          # Apply text replacements + comments to .docx
    clean_format.py                            # Reformat .docx to professional standards
    legal-template.docx                        # Style template for clean_format.py
    word_compare.sh                            # Drive Word Compare via AppleScript

User's vault (all knowledge — discovered via config + Knowledge Base Search):
  {legal_root}/
    law/                                       # Layer 1: Hard constraints (26 areas)
      <area>/                                  # One folder per law area
        _overview.md                           # Trigger conditions, key constraints
        <sub-topic>.md                         # Individual sub-topic files
    practice/                                  # Layer 3: Your practice (user-owned)
      profile.md                               # Identity, voice, principles, thresholds
      standards/                               # Positions and classification guides (24 topics)
      methods/                                 # Reference guides for different work types
      library/                                 # Clause language variants
      reference/                               # Source material (example agreements, checklists, etc.) — outside precedence; informs only
    matters/                                   # Persistent state per engagement
      {matter-id}.md                           # counsel-os-type: matter
    memory/                                    # Layer 4: Institutional learning
      patterns.md                              # Cross-cutting practice patterns
      retro-*.md                               # Practice analytics snapshots

  {anywhere in vault, or {legal_root}/entities/ when no index tool is available}/  # Layer 2: Entity-specific overrides
    <company>.md                               # counsel-os-type: counterparty | vendor | customer | prospect
                                               # Discovered via Knowledge Base Search (content index if connected, else filesystem)
```

## Output Standards

- Always provide **specific counter-language** for issues that need revision, not just flags
- Prioritize by tier: **Tier 1** (must-have) → **Tier 2** (strong preference) → **Tier 3** (nice-to-have)
- All internal memos are **privileged attorney-client communication** unless stated otherwise
- **Cite the knowledge layer** when making a classification — show which layer determined the rating
- **Word tracked changes:** When the user wants a .docx redline, the `draft --redline` mode handles capability detection and the script pipeline. Temp files must go alongside the original document (not `/tmp` — macOS sandbox blocks Word from `/tmp`).
