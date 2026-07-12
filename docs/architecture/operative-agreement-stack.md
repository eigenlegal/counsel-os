# Operative-Agreement Stack — Design

> **Date:** 2026-07-12
> **Status:** DESIGN PROPOSAL — not yet built. Scope of task cou-49 was design-only
> (settle the merge semantics + failure modes before any build). The build is a
> separate, later proposal once this design is accepted.
> **Relates to:** `direction.md` Open Question #2 (multi-document operations);
> roadmap #5 (clause-level precedent — adjacent but distinct).

---

## The gap

`read` and `evaluate` are single-document. There is no notion of a deal **family**, so the
most common in-house question —

> *"What do the current operative Acme terms say, as amended three times?"*

— has no answer. Entity files capture *history* ("we agreed a 24-month cap in the 2024 deal"),
not the *merged living contract*. A master agreement that has been amended three times and
carries two active SOWs is, legally, one set of operative terms scattered across six documents.
Today a lawyer reconstructs that by hand, every time.

This design adds a **operative-agreement stack**: an explicit, lawyer-confirmed, dated chain of
documents (base agreement + amendments + SOWs/DPAs/order forms) recorded in the entity file, plus
a merge that produces the **effective-terms view** — what is actually in force right now, with
provenance — that `evaluate` can then run against.

---

## Two "effective" computations — do not conflate them

Counsel OS already has an *effective* computation. The stack adds a second, on a different axis.

| | **Effective position** (exists) | **Effective terms** (this design) |
|---|---|---|
| Question | What *should* this clause say for this deal? | What *does* the contract actually say now? |
| Assembled from | `law → entity → practice → memory` (SKILL.md → Building the Effective Position) | base agreement + amendments + SOWs, merged by date + supersession |
| Axis | our judgment / target | the counterparty paper as amended |
| Owner | practice standards + entity overrides | the executed document chain |

`evaluate` compares the two: **effective terms** (what's in force) against **effective position**
(what we want). Today `evaluate` treats a *single document* as "what's in force." The stack
replaces that single-document assumption with the merged view for deal families. **The
effective-position procedure in SKILL.md is unchanged** — only the "what the document says" input
it consumes changes from one file to a merged, provenance-tagged inventory.

---

## Design principles (inherited, not invented)

These fall out of decisions already on record; the design honors them rather than relitigating.

1. **Lawyer-designated, tool-proposed.** The tool never silently infers a deal family from a
   folder of files. `remember` *proposes* stack entries (using dates/parties `read` extracted);
   the lawyer confirms. This is the entity-write consent rule (SKILL.md → Knowledge Updates) and
   the `diff_rounds` convention (the lawyer explicitly designates source vs revised; the tool does
   not untangle stacked markup on its own).
2. **Clean, executed inputs.** Each stack member is supplied as a clean/executed copy (tracked
   changes accepted), exactly as `diff_rounds` requires its baseline. The merge reasons over final
   contract text, never over nested unaccepted markup. (See CONTEXT.md, 2026-07-11 baseline
   convention.)
3. **Fail loud, never silently mis-merge.** Every ambiguity — conflicting same-date amendments,
   ambiguous supersession scope, a missing date, a dangling section reference — surfaces as a
   *flag*, not a guessed merge. Silent misclassification is the single prohibited outcome.
4. **Provenance always attached.** Every operative clause in the effective view cites its
   controlling document and section. No un-sourced merged text.
5. **Reliable beats clever.** The default deliverable is a *provenance map* (section → controlling
   document), which is cheap and safe. Full conformed-text reconstruction (splicing amendment
   language into base text) is a separate, opt-in, verify-required mode — or deferred. This mirrors
   the deadline-docket "a reliable sweep beats a flaky sync" ethos.
6. **Single-lawyer.** No per-person assignment fields (roadmap preamble, 2026-06-11).
7. **No new runtime dependencies.** Extraction reuses the existing pandoc / python-docx path; no
   undeclared pip deps on the hero document path (CONTEXT.md gotcha).

---

## Data shape — the agreement stack in the entity file

The stack lives in the **entity file** (Layer 2), because a deal family is per-counterparty and
the entity file already holds `## Agreed Positions` and `## History`. It is a human-readable,
git-diffable, lawyer-editable markdown body section — consistent with how entity files work today
(the LLM reads them; no script parses them). One entity may hold **multiple stacks** — a
counterparty can have more than one master relationship — so each stack is titled by its base
agreement.

```markdown
## Agreement Stack — MSA (Cloud Services)

Order of precedence (from MSA §14.3): MSA controls over any SOW except where an SOW
expressly cites the MSA section it modifies.

| # | Role | Document | Effective | Executed | Status | Changes |
|---|------|----------|-----------|----------|--------|---------|
| 1 | base | msa-2024-03.docx | 2024-03-01 | 2024-03-01 | active (evergreen, §12.1) | — |
| 2 | amendment | amd-1-2024-09.docx | 2024-09-15 | 2024-09-10 | active | §7.2 liability cap 12→24 mo |
| 3 | amendment | amd-2-2025-02.docx | 2025-02-01 | 2025-01-28 | active | §9 adds EU SCCs; §7.4 carve-out for data breach |
| 4 | amendment | amd-3-2025-11.docx | 2025-11-01 | 2025-10-30 | active | §7.2 liability cap 24→36 mo (supersedes Amd 1) |
| 5 | sow | sow-3-2025-06.docx | 2025-06-01 | 2025-05-25 | active (expires 2026-06-01) | scope + fees only; inherits MSA legal terms |
| 6 | dpa | dpa-2025-02.docx | 2025-02-01 | 2025-01-28 | active | processing terms; paired with Amd 2 |
```

Field semantics:

- **Role** — `base` | `amendment` | `sow` | `dpa` | `order-form`. Exactly one `base` per stack.
- **Effective** — the date the document's terms *take force*. The merge orders and resolves by
  this date, **not** the execution date (they routinely differ).
- **Executed** — signature date. Used only as a tie-breaker when two members share an effective
  date, and to catch entity/date anomalies.
- **Status** — `active` | `expired` | `terminated` | `superseded`. A member that has expired or
  been terminated is **out of the operative view** even if never formally superseded (an expired
  SOW no longer governs). Evergreen/auto-renew is noted here so the reader knows the base persists.
- **Changes** — a one-line, lawyer-confirmed summary of what this document does, with explicit
  section pointers. This is the spine of the merge: partial supersession is expressed here.

The `Order of precedence` line captures the base agreement's own order-of-precedence clause (most
MSAs have one). The merge **reads and honors it** rather than assuming MSA-over-SOW or the reverse.

**Why body-section, not frontmatter.** Entity files are consumed by the LLM, not parsed by
scripts, and lawyers edit them by hand. A markdown table is legible, diffs cleanly in git, and
needs no schema migration. If a future content-index wants to filter on stacks, a light
frontmatter mirror can be added then — but it is not needed to answer the driving question, and
adding a parser now would violate principle #5.

---

## Merge rules — building the effective-terms view

Given a stack, produce, for each section/clause of the base agreement, the **currently operative
language and its source**. Rules, applied in order:

1. **Scope, not wholesale.** An amendment supersedes only the sections it *names* (its `Changes`
   entry / its own text). Everything it does not touch remains governed by the base (or an earlier
   amendment). Partial supersession is the norm — replacing "12 months" with "24 months" in §7.2
   leaves the rest of §7.2 intact.
2. **Later effective date controls a conflict.** When two members touch the same section, the one
   with the later **effective** date wins. In the worked example, Amd 3 (2025-11) supersedes Amd 1
   (2024-09) on §7.2 → the operative cap is 36 months. Amd 2's §9 SCC addition stands (nothing
   later touches §9).
3. **Ties break by executed date, then by stack order.** Equal effective dates → later signature
   wins; still equal → the later stack row. But an *unresolved* same-date conflict on the *same
   section* is a **flag** (§Failure modes #1), not an automatic tie-break, because same-effective-
   date edits to one section usually signal a drafting error, not intent.
4. **SOWs inherit; they do not amend.** An SOW is a work order *under* the master, not an amendment
   *to* it. Its effective terms = **MSA (as amended) legal terms + the SOW's own commercial terms**
   (scope, fees, deliverables, term). An SOW term that conflicts with the MSA is resolved by the
   `Order of precedence` line — by default the MSA controls unless the SOW expressly cites the MSA
   section it modifies.
5. **Respect term and status.** Rule 2 only ranks *active* members. A `superseded`, `expired`, or
   `terminated` member is excluded from the operative view (but retained in the stack for history).
6. **Provenance is the output.** The merge's primary product is a **provenance map**: section →
   `{operative source doc, section}`, e.g. `§7.2 → Amendment 3 §2 (36-month cap)`. It does **not**,
   by default, emit spliced conformed text.

### What `read` / `research` produces

A new mode — call it `research --operative <entity>` (or `read --stack`) — assembles the stack,
runs the merge, and emits the effective-terms view at one of two granularities:

- **Provenance map (default).** A table: base section → operative language summary → controlling
  document → any flags. Cheap, always safe, and enough to answer "what's the current liability cap
  / notice period / governing law?" A "conformed copy" at section granularity.
- **Conformed text (opt-in, verify-required).** Actually splices amendment language into the base
  to produce a single readable document. Expensive, error-prone (mirrors the `diff_rounds`
  no-auto-reconstruction lesson), and every output is labeled *"tool-assembled from the stack —
  verify against source documents before relying."* Recommended **deferred** to a later build slice,
  or gated behind an explicit flag.

### What `evaluate` consumes

`evaluate` today loads a single document's clause inventory. With a stack, it loads the
**effective-terms clause inventory** (the operative language per the provenance map). The
per-clause `evaluate` logic and the effective-**position** assembly are unchanged; only the input
"what the document says" is now the merged view. So an amended 36-month cap is evaluated as 36
months, with the finding citing both layers:

```
Limitation of liability (§7.2) — cap exceeds our accepted ceiling
Current language: 36-month cap  [operative: Amendment 3 §2, eff. 2025-11-01]
Our position: 24-month cap accepted for Acme (entity override); 12-month practice standard
Gap: operative cap is 12 months above the entity-agreed ceiling
Priority: Tier 1
```

The provenance line (`operative: Amendment 3 §2`) is what the stack adds — the finding now says
*which document in the family* controls the term, not just the term.

---

## Failure modes

The heart of the design. Each is handled by a **flag**, never a silent guess (principle #3).

1. **Conflicting amendments, same section.** Two active amendments touch the same section.
   Different effective dates → later controls (rule 2). **Same effective date → FLAG** ("§7.2
   amended by Amd 1 and Amd 2, both eff. 2024-09-15 — which controls?") and ask the lawyer to
   designate. Never tie-break a same-date same-section conflict silently.
2. **Partial supersession / over-application.** An amendment edits a *subsection* or a single term.
   Risk: the merge treats a targeted edit as a whole-section replacement and drops the untouched
   remainder. Mitigation: follow the amendment's explicit scope; when the scope language is
   ambiguous ("Section 7 is amended as follows…" without pinpointing 7.2 vs 7.4), FLAG rather than
   guess the boundary.
3. **Ambiguous supersession language.** "The Agreement is hereby amended to reflect the parties'
   intent regarding liability" — no section named. Not deterministically mergeable → FLAG for human
   designation; record the lawyer's designation in the `Changes` cell so it is durable.
4. **Undated / mis-dated documents.** No effective date, or an effective date *before* the base
   agreement. → FLAG; ask the lawyer to supply/confirm; never invent an order.
5. **Missing base agreement.** Stack has amendments but no `base` member on file. → the view is
   incomplete; label it **"amendments only — base not in stack; effective view partial"** and never
   present it as complete.
6. **Order-of-precedence conflict (SOW vs MSA).** An SOW term conflicts with the MSA and the
   `Order of precedence` line says the MSA controls. → the SOW term is inoperative for legal
   purposes; surface *both* the SOW text and the controlling MSA text with the precedence basis, so
   the lawyer sees the tension rather than a silently-dropped term.
7. **Restore-after-delete.** A later amendment restores a term an earlier one deleted. Handled
   correctly by rule 2 *if* effective dates are right; the provenance map shows the final
   controller. Called out because it is a common reviewer error by hand.
8. **Dangling section reference.** An amendment amends "§18.4" but the base has no §18.4
   (renumbering / drafting error). → FLAG as an unresolved supersession pointer. (Overlaps roadmap
   #4 document-QA cross-reference checking — reuse that checker when it lands.)
9. **Contracting-entity mismatch.** An amendment or SOW is executed by a *different* legal entity
   than the base (an affiliate). → FLAG: the chain may not be one family, and the operative view may
   be wrong. (Live evidence: the Decrypt matter's Lightspark entity mismatch, roadmap #4/#8.)
10. **Expired/terminated but not superseded.** Handled by `Status` (rule 5), but flagged at merge
    time if a member's own `expires` date has passed while its status still reads `active` — status
    drift, prompt the lawyer to update.

A run of the operative view therefore always ends with a **flags block**: the sections whose
operative source could not be resolved deterministically, each with the specific question the
lawyer must answer. A clean stack yields an empty flags block; a messy one degrades gracefully into
"here's what I could resolve, here's what needs your call" — it never fabricates certainty.

---

## How the stack gets populated (`remember` integration)

Consistent with the consent rule, the stack is built by proposal + confirmation:

- When `read` extracts a document's parties, effective date, and type, and an existing entity file
  is in play, `remember --entity` proposes a stack row: *"This looks like Amendment 2 to the Acme
  MSA (eff. 2025-02-01, amends §9). Add it to the Agreement Stack?"* The lawyer confirms, edits the
  `Changes` summary, or declines.
- The lawyer can also author/edit the stack table by hand at any time — it is just markdown.
- The tool never scans a directory and auto-assembles a stack. Designation is the lawyer's
  (principle #1).

---

## Recommended build phasing (for the *next* proposal)

Design-only task; this is guidance for how to slice the eventual build, smallest safe unit first.

- **Phase 1 — data + provenance (the whole answer at section granularity).** The `## Agreement
  Stack` entity-file convention + `remember` proposing rows + the `research --operative` provenance
  map with the full flags block. No text splicing. This alone answers the driving question and is
  low-risk (it reports sources, it does not rewrite contract text).
- **Phase 2 — evaluate integration.** `evaluate` consumes the effective-terms inventory instead of
  a single document. Reuses the unchanged effective-position machinery.
- **Phase 3 — conformed text (optional, maybe never).** Splice a single readable consolidated copy,
  explicitly verify-required. High effort, high risk; defer until a real user asks and Phase 1 has
  proven the model.

---

## Relationship to adjacent work

- **Roadmap #5 (clause-level precedent pull)** — distinct. #5 pulls *one clause type across many
  deals* side by side (a comparison quarry). This is *the merged effective view of one deal family*.
  They share the entity-file substrate but answer different questions.
- **cou-47 (batch review)** — the *other* multi-document model: a loop over independent single-doc
  reviews (12 unrelated NDAs). The stack is the *dependent* multi-document model (six documents that
  compose into one contract). Together they resolve `direction.md` Open Question #2's two cases.
- **Roadmap #1 (deadline docket)** — synergistic. Renewal/notice windows often live in an amendment,
  not the base; a docket sweep should read effective terms, not just the base agreement. Not a
  dependency in either direction, but they compound.
