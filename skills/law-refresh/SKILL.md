---
name: law-refresh
description: "Refresh USER-OWNED law content in the vault against current law: custom law areas you created, files marked managed-by: user, or the entire law library when config.md sets law_management: user. Verify-and-patch with primary-source citations, supervised review, and dated last-reviewed attestations. Plugin-managed law areas are excluded — those are refreshed upstream and arrive via /counsel-os:update. Use when your own law files are stale, after adding a custom law area, or on a periodic (e.g., quarterly) cadence."
---

# Law Refresh — User-Owned Content

You are refreshing the legal currency of law files the USER owns. This skill never touches plugin-managed law content — that is refreshed upstream by the plugin maintainers (see `docs/law-refresh-runbook.md` in the plugin repo) and reaches the vault through `/counsel-os:update`.

The method is **verify-and-patch**, not rewrite: find perishable claims, verify them against primary sources, patch only what changed, and attest what was reviewed. Calibrated on the upstream refresh pipeline (2026-06).

## Step 0: Resolve Paths and Scope

1. Resolve `{legal_root}` via the Finding the Legal Root procedure in `skills/counsel/SKILL.md`.
2. Read `{legal_root}/config.md` for `law_management:`.
3. Classify every file under `{legal_root}/law/`:
   - **User-owned** if ANY of: (a) `law_management: user` is set in config.md (everything is user-owned); (b) the file's frontmatter contains `managed-by: user`; (c) the file's area does not exist in the plugin's `knowledge/law/` (a custom area the user created).
   - **Plugin-managed** otherwise.
4. **Scope = user-owned files only.** If the user asks to refresh a plugin-managed area, decline and explain: it is refreshed upstream with source verification and arrives via `/counsel-os:update`. If they want to own it anyway, the deliberate fork is: add `managed-by: user` to the file's frontmatter — update will stop syncing it permanently, and this skill will maintain it from then on. Make sure they understand the trade (they take over its maintenance forever).
5. If nothing is user-owned, say so and stop — the user's whole library is maintained upstream.

Report the scope before doing any work: N user-owned files in M areas, and why each is in scope.

## Step 1: Extract Perishable Claims

For each in-scope file, extract the claims that can go stale: effective dates, dollar thresholds and penalty figures, rule statuses (proposed / final / enjoined / vacated / rescinded), case postures, "no law yet" / "pending" assertions, named-bill statuses, agency-guidance citations.

## Step 2: Verify Against Primary Sources

Verify each claim via web research. **Primary sources only for load-bearing changes** — statute text, the Federal Register, regulator pages, legislature bill records, court opinions. Practical access notes (learned upstream):

- federalregister.gov bot-walls direct fetches — use the JSON API instead: `https://www.federalregister.gov/api/v1/documents/{document-number}.json?fields[]=title&fields[]=type&fields[]=abstract&fields[]=publication_date&fields[]=citation`
- govinfo.gov serves statute and public-law text directly (`/content/pkg/PLAW-.../html/...`)
- Many agency sites (ftc.gov) block all automated fetches — use the Wayback Machine (`archive.org/wayback/available?url=...`) or the `/counsel-os:browse` skill as fallbacks
- Court opinions: fetch the PDF and read it; CourtListener for dockets
- Law-firm alerts may help you FIND developments but never carry a load-bearing change alone — and they get details wrong (an upstream refresh caught a signing date that every firm alert had wrong; the legislature's bill record was right)

**Flag, don't guess:** any claim you cannot confirm against a primary source stays unchanged and goes in the report as uncertain.

## Step 3: Patch Minimally

- Patch only the deltas. Preserve structure, voice, and everything still correct.
- Hedge volatile items explicitly ("as of {date}"; "indexed annually — check {source}"; pending matters stated as NOT law).
- Add or update an `authorities` frontmatter block (two-space-indented `cite`/`title`/`url` entries — see `knowledge/law/FRONTMATTER.md` for the format) for each file you verified.
- Conventions: no checkboxes, no H2 before the first H1, don't touch `content-version`.

## Step 4: The Supervised Gate — then Attest

Attestation requires review (`FRONTMATTER.md`: "a human or explicitly supervised legal-content process"). The user is the attesting reviewer:

1. Present the per-file change list — each change with its primary source URL — plus the uncertain/flagged list.
2. Wait for the user's approval (spot-checking sources is their call; encourage it for the boldest claims).
3. Only after approval, stamp `last-reviewed: "{today}"` on the files that were actually source-verified. Never stamp a file that wasn't reviewed this pass; never add empty attestation fields.

## Step 5: Finish

1. Reindex if a content index is connected (`qmd update && qmd embed`).
2. If `{legal_root}` is a git repo, offer to commit (note: some vaults gitignore `law/` because plugin-managed content is regenerable — a user-owned area is NOT regenerable, so suggest un-ignoring it: `git add -f` or a `.gitignore` exception).
3. Report: files refreshed, changes made, files attested, uncertain items, and dated watch items (upcoming effective dates, pending rulemakings) worth a calendar entry.

## Cadence

Staleness is real: unrefreshed law content decays into confidently-stated stale law — the most dangerous failure mode for an LLM consumer. Suggest a quarterly cadence for fast-moving areas (AI, financial services, privacy) and semi-annual for slow ones. The user can schedule this skill with their host's scheduling facility if available.

## Cowork / no-shell runtimes

Research through whatever web tools the session has; make edits with file tools following the same conventions; skip git/qmd steps and tell the user what was skipped.
