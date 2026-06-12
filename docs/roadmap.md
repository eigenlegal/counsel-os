# Roadmap — Candidate Features

Forward-looking ideas, not commitments. Each entry records the observed gap that motivated it, so future design starts from a real scenario rather than a feature name. Sourced from live-vault dogfooding (2026-06-11 session); see git history for the fixes that session already shipped.

Counsel OS is single-lawyer by decision (2026-06-11): a multi-lawyer design was drafted, reviewed, and declined — do not reintroduce per-person assignment fields or shared-vault assumptions here.

## 1. Deadline docket

**Gap:** Matter files track `Next Action` but nothing time-based. Legal practice runs on dates — auto-renewal windows, termination notice deadlines, sub-processor objection periods, discovery response dates. Nothing in the system warns when a window opens or closes.

**Shape:** `remember` extracts obligations-with-dates into matter/entity frontmatter (e.g. `deadlines: [{date: 2026-07-15, action: "renewal notice due", source: "MSA §9.2"}]`) at the moments deadlines become known — contract execution, matter close, returned redlines. A `/counsel-os:docket` skill sweeps the vault and reports what's due, overdue, and upcoming. Read-only sweep like doctor.

**Why first:** highest practice value of anything on this list; pure frontmatter-plus-skill, no new infrastructure.

## 2. Reference distillation

**Gap:** `remember --reference` imports third-party collections and explicitly defers "distillation as a follow-up" — but no skill implements it. Imported form books sit as a quarry; the durable payoff is mining them.

**Shape:** a skill that takes a reference collection (e.g. a 47-chapter treatise), proposes clean-room re-expressions into `practice/library/` clause variants and `practice/methods/` checklists, drops stale citations, and lets current `law/` supply the legal claims. Always user-approved; copyright note in `remember.md` already sets the re-expression constraint.

## 3. Matter-aware law impact

**Gap:** Update's Step 7 checks new law against `practice/standards/` only. When a law refresh changes something operational (e.g. a state breach-notification deadline), no one asks whether any *matter in flight* is affected — even though matter files carry a `Law areas` field.

**Shape:** extend Step 7: for each law file that changed, find non-closed matters whose law areas intersect, and flag them with the specific delta ("NY breach window is now 30 days — affects {matter}'s open DPA negotiation").

## 4. Vault consistency lint

**Gap:** The eval suite tests that the *plugin* respects precedence invariants, but nothing checks the *user's vault* for internal contradictions. After upstream merges or manual edits, a standard can drift from its matching library clause, or permit what an updated law file forbids — silently.

**Shape:** `doctor --consistency` (or a standalone skill): cross-reference `practice/standards/` ↔ `practice/library/` ↔ `law/` constraints and report divergences. Example class: a numeric position (deletion window, cap multiplier, notice period) stated differently in standard vs. library vs. law floor.

## 5. Matter status one-pager

**Gap:** No single view of the practice. Stage, `updated:`, and next actions live in per-matter frontmatter; seeing the whole desk requires opening files.

**Shape:** `/counsel-os:status` — one table: open matters, stage, days since update, next action, upcoming deadlines (once #1 exists). Read-only; pairs with retro (analytics over time) the way a dashboard pairs with a report.
