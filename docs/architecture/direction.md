# Counsel OS — Architecture Direction

> **Date:** 2026-04-15
> **Status:** Active

---

## Design goal

**Lawyers should not have to think to use this system.**

A lawyer doesn't work sequentially. Sometimes they need to review a full contract. Sometimes they just want to know if one clause is ok. Sometimes they need to draft something, look something up, or update a file. The system should handle any of these without the user knowing what's happening underneath.

No pipeline phases. No slash commands for legal work. No workflow selection. The user says what they need. The system figures out the rest.

---

## Where we are

### What's built

**4-layer knowledge system** (v0.6.0)
```
1. law/          — Hard constraints. Never override.
2. Entity files  — Deal-specific overrides for a counterparty.
3. practice/     — User-owned: profile.md, standards/, methods/, library/
4. memory/       — Institutional learning. Inform, don't override.
```

**Matter files** (v0.6.0, tested v0.6.3)
- Persistent state per engagement, stored in `matters/`
- QMD-discoverable via frontmatter
- Validated end-to-end: intake creates, analyze resumes and updates

**Practice structure** (v0.6.0)
- `profile.md` — identity, principles, voice, thresholds
- `standards/` — 24 position files
- `methods/` — 29 reference guides for how to approach different types of legal work
- `library/` — 22 clause language categories

### What's wrong

The system is organized around a 5-phase pipeline (intake → analyze → negotiate → deliver → close). This forces lawyers to think in phases. It only works for contract review. It can't handle "is this clause ok?" or "draft me a response" or "what did we agree with Acme?" — requests that don't fit the pipeline.

Each skill file is a 200-400 line monolith that mixes extraction, position-checking, compliance, output generation, and state management together. Nothing is reusable across different types of work.

---

## Where we're going

### Three concepts

```
PRIMITIVES   — reusable operations the system knows how to do
PRACTICE/    — the judgment layer (done)
MATTERS      — persistent state (done)
```

**Primitives** are the system's capabilities — like CLI commands. Each one does one category of work. Flags/modes within each primitive control what specifically happens. The LLM selects and composes them based on what the user asks for.

**CLAUDE.md** is the orchestrator. It teaches the LLM what primitives are available and when to reach for each one. It replaces the pipeline with a primitive index and intent routing.

**The user just talks.** The LLM reads the request, picks the right primitives, executes them, and presents the result. A full contract review uses all 5 primitives. A quick "is this clause ok?" uses 1. The user didn't do anything differently.

---

## The 5 primitives

```
read       — Understand a document
research   — Find context from the knowledge system
evaluate   — Assess against standards and/or law
draft      — Generate any output (text, redlines, documents, summaries)
remember   — Persist state and propose knowledge updates
```

Each primitive is a .md file, structured by mode. The LLM reads the purpose and core instructions, then jumps to the section for the relevant mode. Fat files are fine — the structure means you only process what you need.

---

### read

Read and understand a document.

**When to use:** A document has been provided (file, URL, pasted text).

**What it does:**
- Detect format and read (.docx → pandoc with tracked changes, .pdf → Read tool, text → capture)
- Identify parties, defined terms, clause inventory, key dates, commercial terms
- Flag tracked changes and comments if present (count, authors)
- Report what was found as structured output

**No flags.** Input is a document, output is structured understanding. The simplest primitive.

---

### research

Find context from the knowledge system. One primitive, multiple targets.

**When to use:** Need context before or during work — applicable law, positions, counterparty history, existing matters, clause language, method guidance.

**Modes:**

| Mode | What it finds | How |
|---|---|---|
| `--law` | Applicable law areas | Scan trigger conditions in each law/ file |
| `--position <type>` | Standard on a clause type | Read practice/standards/{type}.md |
| `--entity <name>` | Counterparty context and history | QMD query for company + counsel-os-type |
| `--matter` | Existing matter state | QMD query for counsel-os-type: matter |
| `--library <category>` | Clause language variants | Read practice/library/{category}.md |
| `--method <type>` | Reference guide for this work type | Read practice/methods/{type}.md |

When no mode is specified, the LLM decides what to research based on context. "What did we agree with Acme?" → entity. "What law applies?" → law. "What's our standard on indemnification?" → position.

**Builds effective positions.** When evaluating a clause, research assembles the effective position: load practice/standards/ → overlay entity overrides → note law/ constraints. The 4-layer precedence is applied here.

---

### evaluate

Assess a clause or document against standards and/or law. Per-issue assessment with rationale.

**When to use:** Reviewing any clause, provision, or term against what it should be.

**Modes:**

| Mode | What it assesses against | Output |
|---|---|---|
| `--position` | practice/standards/ + entity overrides | Gap analysis: what the clause says vs. our standard. Classification with rationale. |
| `--compliance` | law/ constraints | Regulatory assessment with specific citations (e.g., "GDPR Article 33 requires 72 hours"). Law violations are always flagged — no negotiation. |
| *(no flag)* | Both position and compliance | Full assessment. Default for substantive review. |

**Per-issue assessment.** Each issue gets its own classification and rationale. The lawyer sees individual findings and makes their own judgment about the whole picture — the system doesn't impose a holistic risk score.

**Escalation.** If a finding exceeds thresholds from profile.md (## Escalation Thresholds), flag it. This happens inline during evaluation, not as a separate step.

**Informed by method files.** When doing a full document review, the LLM consults the relevant practice/methods/ file for guidance on what to prioritize. "For contract reviews, make sure you check these 13 clause types." The method is a checklist, not a script — the LLM adapts based on what the user actually asked for.

---

### draft

Generate any output. Text, redlines, documents, summaries — all modes of one primitive.

**When to use:** The user needs something written — counter-language, a memo, an email, a summary, a redline, formatted output.

**Modes:**

| Mode | What it produces |
|---|---|
| `--counter-language` | Specific alternative clause language with rationale and fallback positions |
| `--memo` | Internal analysis document (privileged, structured) |
| `--email` | External communication to counterparty or business team |
| `--summary` | Findings packaged for a specific audience |
| `--clause` | New clause language from scratch |
| `--redline` | Tracked changes against the original document |

**Audience parameter:** `--for <audience>` adjusts depth, format, and language:

| Audience | Adaptation |
|---|---|
| Business team | Plain-language summary, risk level, action items |
| Executive | 3-bullet brief, decision needed, deadline |
| Counterparty | Professional redline with rationale |
| Internal legal | Full analysis with citations, privilege marked |

**Voice.** All modes consult practice/profile.md ## Voice for tone, structure, and language preferences.

**Document output.** When the output format is .docx:
- `--redline` invokes the existing script pipeline (apply_redlines.py → word_compare.sh) to produce tracked changes
- Clean formatting uses clean_format.py
- Temp files go alongside the original document (not /tmp — macOS sandbox constraint)

**Clause library.** `--counter-language` and `--clause` modes consult practice/library/ for reference language and proven variants.

---

### remember

Persist state and propose knowledge updates.

**When to use:** After substantive work — findings need to be saved, decisions logged, knowledge updated.

**Modes:**

| Mode | What it does | Confirmation |
|---|---|---|
| `--matter` | Create or update the matter file. Add findings, decisions, outputs, advance stage. | Automatic — the user sees the update. |
| `--entity` | Propose updates to the counterparty file (agreed positions, deal history, exceptions). | Always asks: "Update Acme's file with this?" |
| `--knowledge` | Propose updates to practice/standards/ or memory/. "You've accepted net-60 three times. Your standard says net-30. Update?" | Always asks. |

**Matter management:**
- If no matter exists and the work is substantive (not a quick lookup), create one.
- If a matter exists for this counterparty/engagement, resume it.
- Stage enum: `intake` → `working` → `closed`.
- Quick lookups and one-off questions don't need a matter.

**The key constraint:** `--matter` is mechanical and automatic. `--entity` and `--knowledge` involve judgment and always confirm before writing. Matter state is live working state. Knowledge system changes need consent.

---

## How it works — examples

### Full contract review

```
User: "Review this MSA from Acme"

LLM:
  read       — pull the document structure
  research   — --entity Acme, --law, --method contract-review
  evaluate   — each clause against positions and law (guided by method file)
  draft      — --summary of findings
  remember   — --matter (create/update matter with findings)
```

### Quick clause check

```
User: "Is this indemnification clause ok?"

LLM:
  research   — --position indemnification (maybe --entity if counterparty known)
  evaluate   — this clause against position and law
  [answer directly — no matter needed, no draft needed]
```

### Research

```
User: "What did we agree with Acme on liability caps?"

LLM:
  research   — --entity Acme
  [answer directly from the entity file]
```

### Drafting

```
User: "Draft a response to their redline on section 5"

LLM:
  research   — --entity, --library (for clause language)
  draft      — --counter-language --for counterparty
  remember   — --matter (if matter exists)
```

### Summarize for audience

```
User: "Summarize this for David"

LLM:
  read       — (if not already done)
  draft      — --summary --for executive
```

### Full redline delivery

```
User: "Create a redline of this contract"

LLM:
  read       — pull the document
  research   — --entity, --law, --position (all relevant)
  evaluate   — full clause-by-clause review
  draft      — --redline (invokes script pipeline for .docx tracked changes)
  remember   — --matter
```

### Knowledge update

```
User: "Update the Acme file with what we agreed"

LLM:
  remember   — --entity (proposes changes, asks for confirmation)
```

### Non-contract work

```
User: "Is our DPA template GDPR-compliant?"

LLM:
  read       — pull the DPA
  research   — --law (data privacy area)
  evaluate   — --compliance (against GDPR requirements)
  draft      — --summary of compliance gaps
```

### The confidence gradient

| Situation | Behavior |
|---|---|
| High confidence, familiar task | Run primitives automatically. Show progress. |
| Ambiguous scope | Propose: "I'll evaluate all clauses against your positions and applicable law. Want me to focus on anything specific?" |
| Missing context | Ask: "Which matter? I see open matters with Acme and MSCL." |
| High risk finding | Flag immediately, don't bury it in a report. |

---

## practice/methods/ — new role

Method files are **reference guides**, not rigid workflows. They tell the LLM what to prioritize for a given type of work:

- "For contract reviews, check these 13 clause types. Don't miss: limitation of liability, indemnification, data protection, IP ownership, termination."
- "For NDAs, focus on: scope of confidential information, term, residuals clause, non-solicitation, governing law."
- "For advisory work, structure as: question → analysis → recommendation."

The LLM consults the relevant method when it recognizes the work type. A full review follows the method closely. A targeted question skips most of it. The method is a checklist and reference, not a script.

---

## Matter staging — simplified

| Old (pipeline) | New |
|---|---|
| intake → analyze → negotiate → deliver → closed | intake → working → closed |

- **intake** — matter being set up (parties, documents, initial context)
- **working** — active legal work (any combination of primitives)
- **closed** — finalized, decisions logged, knowledge updated

---

## CLAUDE.md — the orchestrator

Replaces the pipeline phase table with:

### 1. Primitive index

```
read       — Understand a document
research   — Find context from the knowledge system
evaluate   — Assess against standards and/or law
draft      — Generate any output (text, redlines, documents, summaries)
remember   — Persist state and propose knowledge updates
```

### 2. Intent routing

Guidance for matching user requests to primitives. Not rigid rules — the LLM uses judgment.

### 3. Matter management

When to create, resume, or skip matters. Lightweight requests don't need a matter. Substantive work does.

### 4. Knowledge system

The 4-layer precedence rules, path resolution, and the "always ask before writing to practice/" constraint. Unchanged from today.

---

## Target repository structure

```
counsel-os/
  primitives/                    # The instruction set (5 files)
    read.md
    research.md
    evaluate.md
    draft.md
    remember.md

  knowledge/                     # Shipped content
    law/                         # Hard constraints (26 areas)
    practice-seed/               # Starting practice content
      profile.md
      standards/                 # 24 position files
      methods/                   # 29 reference guides
      library/                   # 22 clause language categories

  skills/                        # Utility skills only
    browse/                      # Web extraction
    setup/                       # Onboarding
    update/                      # Sync

  scripts/                       # Automation (clean_format, apply_redlines, word_compare)
  docs/                          # Architecture docs
  CLAUDE.md                      # The orchestrator
```

Five primitive files. No workflow directory. No pipeline skills. The LLM composes dynamically.

---

## Execution plan

### Phase 1: Build the 5 primitives

Extract instructions from the existing skill files into 5 structured primitive files. Each one has: purpose, modes, consults, produces, and instructions organized by mode.

- [ ] `primitives/read.md` — from intake Step 1
- [ ] `primitives/research.md` — from intake Steps 3/5, analyze Step 0b, all entity/law discovery
- [ ] `primitives/evaluate.md` — from analyze Steps 3a-3f, the core position/compliance logic
- [ ] `primitives/draft.md` — from negotiate (counter-language), deliver (formatting, voice, scripts), analyze Step 6 (report)
- [ ] `primitives/remember.md` — from all skills' matter/entity/knowledge update steps

### Phase 2: Rewrite CLAUDE.md

Replace the pipeline with the primitive index and intent routing.

- [ ] Primitive index (5 lines)
- [ ] Intent routing guidance
- [ ] Matter management (when to create/resume/skip)
- [ ] Keep the 4-layer knowledge system unchanged

### Phase 3: Test on real work

- [ ] Full contract review
- [ ] Quick clause check
- [ ] Research query
- [ ] Drafting task
- [ ] Non-contract matter (advisory, compliance)
- [ ] Redline delivery (.docx output)

### Phase 4: Clean up

- [ ] Archive pipeline skill files (intake, analyze, negotiate, deliver, close)
- [ ] Update setup/update skills for new structure
- [ ] Update direction doc to reflect final state

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

### 1. Primitive loading
Does the LLM read primitive files on every request? Or does CLAUDE.md embed enough of the essentials that primitives only get loaded for complex operations? For "what's our position on liability?" the LLM might not need to read research.md — it just does a QMD query. For a full contract review, it reads evaluate.md for the detailed instructions.

### 2. Method file evolution
practice/methods/ currently has detailed step-by-step playbooks written for the pipeline. They need to be adapted into reference guides that inform primitive composition. How much rewriting is needed?

### 3. Continuous learning thresholds
The `remember --knowledge` mode detects patterns ("you've accepted this 3 times"). What are the thresholds? How does it avoid being annoying? Deferred until the core primitives are solid.
