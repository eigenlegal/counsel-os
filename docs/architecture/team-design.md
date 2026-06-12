# Counsel OS — Team / Multi-Lawyer Design

> **Date:** 2026-06-11
> **Status:** Proposal — not yet implemented
> **Concrete case:** Jack Wang (Senior Counsel) + Leila Perkins (VP, Head of Legal & Compliance) at Lightspark. Must generalize to 2–10 lawyer teams.

---

## Problem statement

Counsel OS assumes one lawyer. One vault, one `profile.md`, one consent-giver, one author behind every decision log. With two lawyers, specific things break:

| What | How it breaks |
|---|---|
| `profile.md` is singular | Whose voice does `draft` use? Whose risk appetite calibrates `evaluate`? Jack and Leila do not have the same thresholds — that asymmetry is the org chart. |
| Escalation is a string, not a graph | Jack's content says "Escalate to Leila" (e.g. `practice/methods/vendor-infrastructure-playbook.md`). On Leila's install that instruction is self-referential. Her escalation targets are different — CEO, board, outside counsel. The system has no concept of *who is escalating*. |
| Matter attribution is implicit | The `## Decisions` format says "what was decided, by whom, why" but the author is always the vault owner. Two lawyers in one matters/ directory means "we accepted the 24-month cap" no longer identifies a decision-maker. Privilege review, retro, and plain accountability all need the name. |
| Concurrent edits | Two Claude sessions appending to the same matter or entity file. Today nothing arbitrates. Git is already in the stack (close-commits, pathspec discipline) but there is no pull-before-work or push convention. |
| Standards ownership | `remember --knowledge` asks "the user" before changing a position. Which user? If Jack approves a change to `limitation-of-liability.md`, Leila's next evaluation silently runs against Jack's position. Consent was designed for one consenter. |
| Retro conflates lawyers | Retro aggregates all matters and measures drift against one profile's thresholds. Two risk appetites pooled together turn drift analysis into noise: Jack's deviations measured against Leila's thresholds aren't deviations. |
| Confidentiality has no walls | One vault is one visibility domain. HR-sensitive matters, comp, board material — things Leila handles that Jack shouldn't read (or vice versa) — cannot live in a shared vault with any enforcement. |
| Config is per-vault, used per-person | `config.md` travels with the vault. Two people sharing it can't both be "the user" it implicitly describes. (It already carries a machine-absolute `legal_root:`, so it is per-clone in spirit — this becomes load-bearing below.) |

---

## Options

### A. One shared vault, one git repo

Both lawyers clone the same legal root. `practice/profile.md` becomes `practice/profiles/{slug}.md`; each clone's `config.md` gains `lawyer: {slug}` saying who is sitting at this keyboard. Standards, matters, entities, library, memory are shared. Git is the concurrency story — the pathspec-commit discipline from matter close already exists; add pull-at-session-start and push-on-close. Attribution is frontmatter (`owner:` on matters, named decision-log entries) with git blame as the backstop.

- **Setup:** smallest. One new setup branch: "join an existing team vault" (clone, pick/create your profile, write per-clone config).
- **Consent:** softened, not solved. Any lawyer can change a standard; the change is attributed and surfaced to the team, not gated. Fine at n=2 with a manager in the loop; a 10-lawyer firm may want an approval rule (see open questions).
- **Staleness/conflicts:** real but small. Matter files are mostly append-only sections; markdown merges are manageable. Worst case is two sessions on the *same* matter in the same hour — at n=2 that's a Slack message, not a locking protocol.
- **Privilege:** none. Everyone with the clone reads everything. A `visibility:` frontmatter hint would be theater — git cannot enforce partial visibility within one repo. Sensitive matters stay out of the shared vault by convention (a personal side root), which is honest but unenforced.
- **Skill delta:** counsel bootstrap (resolve lawyer → profile), remember (attribution), evaluate/draft (load *session lawyer's* profile), retro (group by owner), setup (join path). Update unchanged — practice-seed diffing and law sync don't care how many profiles exist.

### B. Per-lawyer vaults + a shared layer

Each lawyer keeps their own vault for matters/, memory/, and profile. A second shared repo (subtree, submodule, or sibling clone) holds standards/, library/, entities/, and optionally law/. `config.md` gains `shared_root:`; the 4-layer merge and Knowledge Base Search span two roots.

- **Setup:** two repos per lawyer, two sync states, and a precedence story that crosses roots. Every skill is touched: bootstrap resolves two roots, search merges two scopes (and two QMD collections), remember must *route* writes (matter → private, entity → shared), update must decide which root owns law/.
- **Consent:** cleaner in theory — shared-repo changes are visibly "team" changes — but the mechanism is the same git-and-convention as A.
- **Staleness:** worse. The shared layer goes stale in whichever clone wasn't pulled; an evaluation against a stale standard is a silent correctness bug, not a merge conflict you'd notice.
- **Privilege:** the real win. Private matters are private by default; sharing is an explicit act (move the file to the shared repo). This is the only option with an actual wall.
- **Retro:** per-lawyer is trivial; team retro now requires assembling N vaults, which only the manager would realistically run.
- **Hidden cost:** entity files must be shared (Acme's history comes from both lawyers' matters), but the matters that *generated* that history are split. "What did we agree with Acme" works; "show me the matter where we agreed it" may not. The knowledge loop — close matter → harvest entity/library/memory — now writes across a repo boundary on every close.

### C. Defer to a sync service

Wait for (or build on) a hosted shared store — claude.ai team features, or an MCP-backed entity/standards service. What we'd want from it: identity (who is asking, attested, not self-declared in config), per-matter ACLs, consistency without manual pulls, an audit log. Why not now: it doesn't exist in usable form; it inverts the local-first, plain-markdown, no-telemetry posture the README commits to; and a two-lawyer team gets nothing from it that git doesn't already give. The right move is to keep the file formats service-shaped — attribution in frontmatter, slugs not prose names — so a future service can adopt them as its schema. C is a direction, not an option for this year.

### Weighing

| Dimension | A: shared vault | B: split vaults | C: service |
|---|---|---|---|
| Setup complexity | Low (clone + profile) | High (2 repos, routed writes) | N/A today |
| Consent semantics | Attributed, ungated | Same mechanism, clearer optics | Could be enforced |
| Staleness / conflicts | Occasional, visible (merge) | Frequent, silent (stale standards) | Solved |
| Privilege / visibility | None — convention only | Real default-private wall | Real ACLs |
| Retro | Team + per-lawyer from one corpus | Per-lawyer easy, team hard | Easy |
| Skill delta | 5 files, modest edits | Every skill + search + update | Unknown |
| Fits n=2 today | Yes | Overweight | No |
| Fits n=10 later | Strains on consent + privilege | Better | Best |

---

## Recommendation: A, with B's escape hatch named

Option A for v1. Smallest delta, git is already in the stack, and a two-lawyer in-house team rarely needs hard visibility walls — Jack and Leila's actual boundary problem (HR/board matters) is better solved by *keeping those files out of the shared root* than by building ACLs into a markdown plugin. If the team grows past the point where convention holds, B's shared-layer split is the upgrade path, and nothing in A's design blocks it (a shared vault can be split later; merging split vaults is much harder — start joined).

**Explicit non-goals for v1:** no per-matter ACLs; no real-time co-editing or locking; no enforced approval workflow on standards (attribution + visibility, not gates); no identity attestation (`lawyer:` is self-declared).

**One Lightspark-specific precondition:** the shared repo must be the *legal root only*. Jack's legal root currently sits inside his personal Obsidian vault — daily notes, 1-1 notes about Leila, journals. Sharing means carving `{legal_root}` out as its own git repo (or repo root), and accepting that entity notes living *outside* the legal root (discovered via QMD today) are not shared. Entity files that matter to the team move inside.

### v1 change list

| Change | Where | Notes |
|---|---|---|
| `lawyer: {profile-slug}` in config | `CONFIGURATION.md`, setup Step 1 | Per-clone, like `legal_root:` already is. Join path writes it; solo installs omit it. |
| `practice/profiles/{slug}.md` | counsel SKILL.md (Practice Files), setup | Resolution rule: if `lawyer:` is set, load `practice/profiles/{lawyer}.md`; else fall back to `practice/profile.md`. Zero migration for every existing solo install. |
| Escalation as a chain | profile seed, evaluate.md | Each profile's `## Escalation Thresholds` names its target by profile slug where one exists (`escalate to: profiles/leila`) or by prose where it leaves the system ("outside counsel", "CEO"). Leila's profile answers what her install does with "escalate to Leila": her targets are upward, not reflexive. |
| `owner: {slug}` on matters | remember.md (matter format) | Set to session lawyer at creation. Resuming another lawyer's matter is allowed and logged, not blocked. |
| Attributed decision log | remember.md | Decision entries carry `({slug}, {date})`. Cheap, greppable, feeds retro and git blame agrees with it. |
| Session profile everywhere | evaluate.md, draft.md | Escalation checks run against the *session lawyer's* thresholds; voice comes from their profile. One-line edits where `profile.md` is referenced today. |
| Consent rewording | remember.md | "The user" → "the session lawyer." Standards changes append an attributed change note; the proposal text tells the approver the change is team-visible. |
| Retro: team + per-lawyer | retro SKILL.md | Group matters by `owner:`. Drift measured against the *deciding* lawyer's profile. Team totals first, per-lawyer sections after. Unowned matters (pre-v1) pool into the solo lawyer's bucket. |
| Setup join path | setup SKILL.md | New Step 1 branch: "Joining an existing team vault?" → clone, run discovery, pick or create `profiles/{you}.md` (profile interview already exists — reuse Steps 3 verbatim), write per-clone `config.md` + pointer. Add pull-at-session-start / push-on-close guidance to the git section. |
| Doctor check | doctor SKILL.md | `lawyer:` resolves to an existing profile file; warn if profiles/ exists but `lawyer:` is unset. |
| Eval fixture | evals/ | A two-profile mini-vault where the correct behavior is decisive: same clause, session lawyer = jack escalates to Leila; session lawyer = leila escalates outward. |

**Scope estimate:** ~10 files, all markdown plus one eval vault. No new scripts; `resolve_legal_root.sh` untouched (config discovery already works per-clone). The profile-resolution rule and setup join path are the only pieces with real design surface; the rest is attribution plumbing. Roughly 2–3 working days including the eval and a doc pass on direction.md.

---

## Open questions for Jack + Leila

These are user decisions, not architecture decisions. Each has a default; none blocks the change list above except #1, which sizes it.

1. **Does Leila want an install at all?** If she'd rather receive escalations by email/Slack and never run Counsel OS, `profiles/leila.md` shrinks to an escalation-target descriptor (name, what she wants flagged, how she wants it packaged) and the join path ships later. This halves v1.
2. **One matters list?** Default yes — shared matters/ with `owner:` — but if Leila's matters (board, comp, HR) are mostly ones Jack shouldn't see, her work may never enter the shared vault, and the "team" is really "Jack's vault + Leila as escalation target."
3. **memory/patterns.md — merged or per-lawyer?** Default: one shared file with attributed entries; cross-cutting patterns are team knowledge by definition. Revisit if their observations start contradicting.
4. **Standards changes — unilateral or routed?** Default: either lawyer edits with attribution. Alternative: changes to `## Our Position` route to Leila for sign-off. At n=2 with a weekly legal sync, attribution probably suffices.
5. **Where do sensitive matters live?** Default: a personal side root, by convention. Is that acceptable, or is it a reason to revisit option B sooner?
6. **Carving out the legal root** — is Jack willing to split `Counsel OS/` out of his personal Obsidian vault into its own repo, and which existing entity/company notes move in with it?
