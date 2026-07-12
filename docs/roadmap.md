# Roadmap — Candidate Features

Forward-looking ideas, not commitments. Each entry records the observed gap that motivated it, so future design starts from a real scenario rather than a feature name. Sourced from live-vault dogfooding (2026-06-11/12 sessions); see git history and CHANGELOG for what those sessions already shipped.

Counsel OS is single-lawyer by decision (2026-06-11): a multi-lawyer design was drafted, reviewed, and declined — do not reintroduce per-person assignment fields or shared-vault assumptions here.

## 1. Deadline docket — SHIPPED (v1, 2026-07-12)

**Gap:** Matter files tracked `Next Action` but nothing time-based. Legal practice runs on dates — auto-renewal windows, termination notice deadlines, sub-processor objection periods, discovery response dates. Nothing warned when a window opened or closed.

**Shipped (cou-48):** a `deadlines:` frontmatter convention on matter files (`{date, action, type, source}`), `read` proposing entries when it extracts key dates from a contract and `remember` recording them, and a read-only `/counsel-os:docket` sweep (`scripts/docket_sweep.py`) that classifies every deadline as overdue / due-soon (default 60-day window) / upcoming and surfaces malformed dates loudly. Like doctor, it changes nothing.

**How the hold was resolved:** the hold reason was task-stack *coexistence* — users already run their own task systems (Obsidian Tasks, other Claude skills), and an emit-as-Obsidian-Tasks-syntax design was parked as too unilateral. The shipped v1 coexists by *not touching* any external task system: it is a self-contained read-only sweep over the vault's own markdown, emitting into nothing. Deliberately **not** a calendar sync — a reliable local sweep beats a flaky integration. A future iteration could optionally emit into a user-chosen task system, but only opt-in.

## 2. Reference distillation

**Gap:** `remember --reference` imports third-party collections and explicitly defers "distillation as a follow-up" — but no skill implements it. Imported form books sit as a quarry; the durable payoff is mining them.

**Shape:** a skill that takes a reference collection (e.g. a 47-chapter treatise), proposes clean-room re-expressions into `practice/library/` clause variants and `practice/methods/` checklists, drops stale citations, and lets current `law/` supply the legal claims. Always user-approved; copyright note in `remember.md` already sets the re-expression constraint.

## 3. Matter status one-pager — ON HOLD (2026-06-12)

**Gap:** No single view of the practice. Stage, `updated:`, and next actions live in per-matter frontmatter; seeing the whole desk requires opening files.

**Shape:** `/counsel-os:status` — one table: open matters, stage, days since update, next action, upcoming deadlines (once #1 exists). Read-only; pairs with retro (analytics over time) the way a dashboard pairs with a report.

**Hold reason:** parked alongside #1 — same task-stack-coexistence question.

## 4. Document QA (definitions, references, party names)

**Gap:** Mechanical contract defects survive careful review because checking them by eye is tedious: defined-but-never-used terms, used-but-never-defined terms, capitalization drift ("Confidential Information" vs "confidential information"), cross-references to sections that don't exist, exhibit lists that don't match the attached exhibits, inconsistent party names. Live evidence: a counterparty audit contract named three Lightspark entities that don't exist — caught only because a human happened to look (Decrypt matter, 2026-04).

**Shape:** a deterministic `scripts/check_document.py` (python-docx) producing a findings list, surfaced as a `read --qa` mode and run automatically as the last step of full document review. Zero judgment risk — pure tedium automation, the highest want-it-tomorrow item on this list.

## 5. Clause-level precedent pull

**Gap:** "What have we *actually signed* for this clause?" is answerable only at deal granularity today (entity files, matter history). At drafting time a lawyer wants clause granularity: every liability cap, every confidentiality survival term, as executed, side by side with the library's proposed variants and the reference quarry.

**Shape:** `research --precedent <clause-type>` — pulls the `practice/library/` variants, the closest as-executed language (knowledge-base search over entity files and imported executed agreements), and matching reference-collection samples into one comparison. Depends on executed agreements being in the searchable vault (import_reference covers this).

## 6. Negotiation prep brief + concession ledger

**Gap:** Walking into a negotiation call requires hand-assembling counterparty history, open asks, and — critically — the running give/get balance across rounds. `diff_rounds.py` classifies what *they* did to *our* asks; nothing tracks what *we* have conceded cumulatively, which is the number a negotiator needs before agreeing to the next give. Live evidence: the Bitso 5/27 call package was assembled by hand.

**Shape:** a prep mode (research or draft) that assembles: entity history and drift patterns, current round's open items, the concession ledger (maintained per-round in the matter file by `remember`), and pre-approved fallback positions annotated from the standards bands ("if they reject 12 months, YELLOW authorizes to 24"). Output is a one-page call brief.

## 7. House-template drift

**Gap:** Counsel reviews *counterparty* paper against current standards all day, but nothing checks the user's *own templates* when standards move. When a position changes (e.g. the 2026-06-11 deletion-window decision), house forms silently keep the old language — the inverse of contract review, and a classic in-house failure mode.

**Shape:** a template registry (frontmatter-marked files or a config list pointing at the house forms) plus a drift check — doctor-style or part of `--consistency` — comparing each template's numeric/positional terms against current `practice/standards/`: "your standards changed; these templates still carry the old position."

## 8. Execution package prep

**Gap:** The path from final redline to signature is manual: produce the accept-all clean copy, add signature blocks, check the deal value against the signing-authority matrix, verify exhibit completeness, sweep effective dates. Live evidence: the Decrypt matter required a manual signing-authority check (under-$100K threshold) and caught a contracting-entity mismatch late.

**Shape:** a draft mode: from the final tracked-changes .docx, generate the execution version (docx tooling already exists), insert signature blocks per the contracting entities, flag the signer per the vault's signing-authority matrix vs. deal value, and emit an execution checklist (exhibits present, dates filled, entity names consistent — reusing #4's checker).

## Shipped from this roadmap

- **Matter-aware law impact** — shipped v0.9.26 as doctor Step 11 (open matters whose law areas were refreshed after the matter's last update), rather than as an update-skill extension. An update-time variant (flag at the moment law changes, with the specific delta) remains a possible refinement.
- **Vault consistency lint** — shipped v0.9.26 as doctor Step 10 + the `--consistency` invocation mode; evaluate also gained an inline staleness flag for law cited past its review cadence.
