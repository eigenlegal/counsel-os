# Changelog

All notable changes to Counsel OS are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Entries through 0.9.18 were
reconstructed from git history. New entries are prepended automatically by
`scripts/release.sh`.

## [0.9.23] — 2026-06-11

Zero-toolchain browse: find-browse downloads prebuilt binary + matching Chromium builds

- find-browse self-heals on machines without bun/node: downloads the prebuilt counsel-browse-{platform} from the release matching the plugin VERSION (fallback: latest), smoke-tests before installing, falls back to ~/.counsel-os/bin when the plugin tree is read-only, then fetches counsel-browse-{platform}-browsers.tar.gz into the ms-playwright cache when Chromium is absent. COUNSEL_OS_NO_DOWNLOAD=1 opts out
- release-binaries workflow now packages the exact chromium + headless-shell + ffmpeg builds each binary's playwright version expects and attaches them alongside the binaries
- Verified: the compiled daemon boots healthy from a bare directory with no node_modules - browser builds were the only missing runtime piece
- Docs: browse SKILL auto-download setup, README bun-now-optional, setup/update skills degrade to the download path when bun is missing

## [0.9.22] — 2026-06-11

Doctor + update-skill fixes from 0.9.20/0.9.21 dogfooding

- Doctor: exclude law/FRONTMATTER.md from Part B attestation/ownership greps — its documentation snippets contain managed-by: user and last-reviewed: lines, producing a false 'user-owned law file' (observed on a real vault).
- Update skill: practice-merge step now requires patch --no-backup-if-mismatch plus .orig/.rej cleanup before the Step 9 commit — patch backup litter inside the law/ practice/ pathspec was swept into a vault commit and had to be amended out. Failed hunks (.rej) mean hand-merge, never commit.
- Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

## [0.9.21] — 2026-06-11

Attestations to zero: Montana WDEA fix, Oklahoma + Alabama privacy laws, doctor override fix, auto-tagged releases

- Law library reaches ZERO attestations due (was 390): final 5 never-reviewed files verified and attested
- at-will.md: Montana WDEA probation corrected (2021 amendments - 12-month default/18-month max, file said 6 months); good-cause policy-violation prong added
- us-state-privacy.md: Oklahoma SB 546 (signed 3/20/2026, eff. 1/1/2027) and Alabama APDPA HB 351 (signed 4/16/2026, eff. 5/1/2027) added - 22 comprehensive state privacy laws
- doctor: vault-structure check now honors matters_path/entities_path config overrides before flagging directories missing
- release.sh: tags vX.Y.Z by default and pushes the tag, firing the release-binaries workflow (--no-tag to skip); the old --tag created counsel-os--vX.Y.Z which never matched the workflow trigger

## [0.9.20] — 2026-06-11

Law library fully attested (26 areas + 3 state tables), behavioral eval suite + per-model baselines

- Law refresh tranches 2-3 + dedicated state-table passes: every area source-verified against primary records and stamped; attestations due 390 -> 11
- Headline law now encoded: Learning Resources v. Trump (IEEPA tariffs invalidated, CBP refunds); OBBBA across tax/nonprofit/securities (NCTI/FDDEI, BEAT 10.5%, QSBS tiers, 4960 expansion, 1% remittance excise tax); GENIUS Act stablecoin exclusion; FinCEN RRE rule vacated (on appeal); 2025 HSR form vacated (pre-2025 form operative); SEC climate rescission proposed; NY FAIR Business Practices Act; DOJ Title II web deadlines extended to 2027/2028
- Errors killed at the gate: stale $50,120 FTC penalty x2 and false 'Congress restored 13(b)' claim; a fabricated $54,540 HSR penalty (no FTC 2026 adjustment exists - OMB M-26-11); 7 fabricated credit-monitoring mandates in the breach table; Utah missing from the MTL table; franchise $615 threshold misread; Cumis citation, Lloyd's LMA clause numbers, notice-prejudice split (insurance)
- Key Constraints sections added to 12 thin area overviews; authorities blocks now on every attested file
- Eval suite: 4 new behavioral fixtures (law-area trigger detection, redline round-trip, missing-provision coverage, GREEN/YELLOW/RED calibration) - all 1.0 on live generation; run_evals.py --save-baseline/--compare-baseline with regression gating; release.sh eval-freshness warning; first baseline claude-fable-5 @ 2026-06-11 mean 1.0

## [0.9.19] — 2026-06-11

Doctor skill, 7 new methods, cross-round redline diffing, durable backups, ops + confidentiality docs

- /counsel-os:doctor read-only health check skill; docs/operations.md cadence guide
- 7 new seed methods: security-incident-response, consumer-facing-terms, marketing-ad-review, financing-round, trade-compliance-screening, open-source-compliance, equity-compensation (methods index 28 -> 35)
- scripts/diff_rounds.py: round-over-round redline comparison (ACCEPTED/REVERTED/MODIFIED/NEW) + read --redline round-comparison instructions
- Backups relocated to ~/.counsel-os/backups/ (survive plugin updates); full-root backup honors matters_path/entities_path overrides; restore rewrites legal_root + pointer on relocation; root ./update ff-merge guarded (branch/dirty/ancestor checks)
- Matter-close auto-commit implemented in remember --matter (pathspec-scoped, never add -A); setup promise corrected to match
- README: new Confidentiality & Data Flow section; backup paths corrected; doctor documented. CONNECTORS.md rewritten to describe real integrations. direction.md refreshed to current architecture
- browse: SKILL.md command reference now generated from commands.ts (51 commands, was 26; diff semantics fixed) via scripts/gen_browse_reference.py + CI drift check; update skill gains browse rebuild step
- Prebuilt browse binaries: release-binaries.yml builds darwin-arm64/darwin-x64/linux-x64 on v* tags
- CHANGELOG.md added (0.9.0-0.9.18 reconstructed from git history); release.sh now auto-inserts each release's entry
- Deletion-timeline position aligned across standards + library: 30 days production / 90 days backups, with certification

## [0.9.18] — 2026-06-11

Update-skill hardening + docs refresh.

- Update skill: commit by pathspec instead of `git add -A` (a pre-loaded index could sweep unrelated vault work into an update commit); detect practice-seed changes by diffing against the previously installed version's seed; reindex the content index (QMD) after applying content.
- import_reference.sh: per-file source attribution; gfm table-loss comment made precise.
- lint_knowledge.py: lint git-tracked files only — gitignored leftovers under knowledge/ were failing the release gate on older checkouts.
- README: 6 skills incl. law-refresh; retro section rewritten for volume-calibrated analysis + knowledge harvest; usage examples for reference import and read --redline; marketplace update flow modernized. CLAUDE.md layout refreshed.
- Documented the safety-rule eval suite in both READMEs (main README trust story; evals/README fixture-authoring lessons).

## [0.9.17] — 2026-06-10

Complete the safety-rule eval suite: all four invariants tested, all green.

- Three new vault fixtures join the law-beats-practice pilot: reference-never-governs, entity-override-scoping, escalation-trigger — each scored 1.0 on live headless runs against the working tree.
- Harness fixes: `--strict-mcp-config` on generation runs (prevents a connected content index from hijacking Knowledge Base Search and leaking real vault entities into fixtures); alias lists must allow vault-internal paths and canonical real-world authorities so correct lawyering isn't punished as fabrication.
- Sample outputs added for all three fixtures so CI's self-test covers the full 8-fixture suite.

## [0.9.16] — 2026-06-10

Safety-rule eval harness: vault fixtures + headless generation; law-beats-practice pilot green.

- New fixture shape: a `vault` field names a mini legal root under evals/vaults/ (config.md placeholder, law/, practice/, matters/, memory/) plus a `task` prompt.
- run_evals.py `--generate`: copies the mini-vault to a temp dir and runs `claude -p` with `--plugin-dir <repo>` and `COUNSEL_OS_LEGAL_ROOT` pointed at the temp vault, so the entire knowledge system reads the fixture; `--model` and `--only` flags added.
- Pilot fixture law-beats-practice scored 1.0 on first live run (RED on the clause citing GDPR Art. 33 and flagged the practice standard itself as conflicting with law).
- evals/README.md documents vault fixtures, generation, and the flakiness policy.

## [0.9.15] — 2026-06-10

Inbound redline ingestion (read --redline + extract_redlines.py); matter lifecycle nudges.

- scripts/extract_redlines.py: walks a returned .docx for tracked changes and comments; emits per-paragraph original vs revised text, inserted/deleted fragments, author, date, section context, and anchored comments — JSON for the agent, `--format markdown` for humans. Handles moves, tables, and content controls; validated against synthetic fixtures and two real negotiation documents.
- primitives/read.md gains `--redline` mode: extract → classify every change against the effective position (ACCEPT/COUNTER/ESCALATE/CLARIFY) → hunt silent movers → delta report ordered Tier 1 first → log the round to the matter → feed counters into the outbound pipeline. New intent-routing row in counsel/SKILL.md.
- Matter lifecycle nudges: counsel proposes closing or refreshing matters that look finished or stale (>30 days or Next Action done) — bundled, at most once per session, never blocking. remember --matter now always sets `updated:` on every write.

## [0.9.14] — 2026-06-10

Law ownership model + /counsel-os:law-refresh + maintainer runbook; fix same-day law-sync blindness.

- Law content ownership becomes a dial: default stays plugin-managed; `managed-by: user` frontmatter marks permanent per-file ownership; `law_management: user` config flag stops law sync entirely; custom areas remain user-owned automatically.
- New /counsel-os:law-refresh skill maintains user-owned law content via the verify-and-patch pipeline (perishable-claim extraction, primary-source verification, minimal patches, flag-don't-guess, supervised attestation gate).
- Maintainer procedure for plugin-managed areas documented at docs/law-refresh-runbook.md.
- Fix: update compared law by content-version date, so same-day releases with different content were silently skipped — comparison is now by content (`diff -rq`), date method only as no-shell fallback.
- README gains a "Law Content: Who Maintains What" section; setup/update config templates document the new flag.

## [0.9.13] — 2026-06-10

remember --reference mode + import_reference.sh: first-class reference imports.

- primitives/remember.md gains `--reference` mode: confirm scope/attribution, run the deterministic helper (or manual file-tool path in Cowork), reindex, offer distillation as a follow-up; includes the copyright rule (imports stay vault-private; distillations must be clean-room re-expressions).
- scripts/import_reference.sh: .docx via pandoc, legacy .doc via textutil→pandoc (markdown flavor, never gfm — gfm silently drops complex tables), .md/.txt pass-through; provenance frontmatter + reference-only banner; per-collection and area-index registration; idempotent (`--force` to overwrite); bash-3.2 safe.
- Deliberately not a new skill: importing is an intent counsel already catches; the procedure lives in the remember primitive.

## [0.9.12] — 2026-06-10

Retro skill: calibrate to practice shape, volume-gate statistics, add knowledge-harvest step.

- Retro opens by calibrating to the practice's shape and states which mode it's running.
- Statistical steps (acceptance/fallback/exception rates) volume-gated at ~10+ comparable matters; deviations below that are case notes, not statistics.
- New Step 6 "Harvest Promotable Knowledge": sweeps matters/entities for deal-archetype and corridor playbooks (→ practice/methods/), proven negotiated language (→ practice/library/), regulatory-posture notes (→ entity files), and process rules (→ memory/patterns.md), always with approval before writing.
- Archetype Playbooks recommendation template and Harvest table added to the report format.

## [0.9.11] — 2026-06-10

Law refresh tranche 1: data-privacy, AI, corporate, consumer-protection, employment verified current as of 2026-06-10.

- Five areas through the verify-and-patch pipeline: ~190 substantive changes across 48 files, every load-bearing change source-verified; boldest post-cutoff claims independently confirmed against primary records.
- Headlines: removed a fabricated CT SB 2 enactment; CO AI Act repealed/replaced (SB 26-189); DGCL SB 21 Section 144 safe harbors integrated; 2026 HSR thresholds + form-vacatur note; Click-to-Cancel consistently stated as vacated; FTC non-compete rule confirmed dead; WA 2027 near-total non-compete ban; amended COPPA Rule binding; UK adequacy renewed to 2031; CPPA ADMT/audit regs final; VA cure-sunset and CUBI private-right errors fixed.
- 46 files stamped `last-reviewed: 2026-06-10` with authorities blocks; files not source-reviewed deliberately left unstamped. Known gaps flagged: 47-state MTL table, state-consumer-laws.md, advertising-media.

## [0.9.10] — 2026-06-10

Law refresh: financial-services verified current as of 2026-06-10.

- First area through the verify-and-patch pipeline: 37 source-verified changes across 11 files.
- Headlines: GENIUS Act stablecoin regime replaces the "no federal stablecoin law" section; CTA BOI reporting corrected to foreign-reporting-companies-only; SEC crypto enforcement posture updated; Section 1071 final rule; BNPL interpretive rule withdrawal; CFPB larger-participant test corrected; VAMP replaces VDMP/VFMP; RTP/FedNow $10M limits; Nacha 2026 fraud-monitoring phases; PCI DSS v4.0.1; TX money-transmission recodification; indexed-penalty hedges throughout.
- All 11 files carry authorities blocks and `last-reviewed` stamps; the ~47 unverified state-MTL entries flagged for a dedicated pass.

## [0.9.9] — 2026-06-10

Scripts reference in README; fix restore rollback data-loss path; align library with positions.

- README: new Scripts Reference section covering the document pipeline, diagnostics, and maintainer tooling with exact CLIs.
- restore: the ERR-trap rollback crashed on bash 3.2 via unguarded empty-array expansion under `set -u`, after which EXIT cleanup could delete the only copy of pre-restore vault data. The work directory is now preserved fail-safe-first; all three array expansions carry the bash-3.2 guard.
- practice-seed library aligned with position files: Excluded Claims now leaves fraud/willful misconduct expressly uncapped (was inside the 2x super-cap); Term and Auto-Renewal renews in one-year terms.
- CI: root helpers (backup/restore/setup/update) added to shell syntax checks.
- word_compare.sh save format live-verified against real Word 16.109.3 (tracked insertions/deletions correctly attributed).

## [0.9.8] — 2026-06-10

Browse daemon + docx script fixes; release/CI automation.

- browse daemon: classify Bun error shapes so timeout and crash auto-restart actually fire; stop/restart respond before exiting; adopt popup/window.open pages into the tab map; fix @ref nth() misalignment under -d/-c filters; per-request cwd for path resolution; fix the flush-cursor log race; viewport restore, output-path validation, scroll-offset annotate overlays, and misc hardening.
- docx scripts: separate numbering definitions for headings vs lists; unwrap w:sdt content controls with warnings; tighter list-prefix matching; style-inherited bold recognized for headings; merged-cell dedupe; run-boundary-aware smart quotes; find/replace sees text inside hyperlinks and w:ins; word_compare wraps Word in a 600s AppleScript timeout.
- Release/CI: scripts/release.sh (one-command four-manifest bump + lint + commit + push, bash-3.2 safe); scripts/lint_knowledge.py wired into CI alongside python/shell syntax checks; /counsel-os:update honors `auto_apply_law_updates: true` in config.md.

## [0.9.7] — 2026-06-10

Hygiene release: fix legal-root discovery on stock macOS bash, seed reference/, strip 240 bogus slug headings.

- resolve_legal_root.sh: guard the empty-array expansion that crashed bash 3.2 under `set -u` — fresh-install discovery was dead on every stock Mac.
- setup: seed practice/reference/ and verify it; remove the ghost templates/practice/ reference.
- knowledge: strip the H2-slug-before-H1 heading from the remaining 240 law/standards/library files; regenerate methods/index.md (28 methods); normalize seed index types; bump content-versions; drop empty knowledge/defaults/.
- counsel skill: trim description to fit the 1,024-char cap (was 1,844, truncated in listings); move trigger phrases to when_to_use; honor matters_path; add reference scope and knowledge-map entries.
- retro rebuilt on the current data model (matter-file gathering, exceptions defined as matter Decisions deviations).
- run_evals.py anchors default paths to the repo root and exits 2 when nothing was scored (was a silent false-green from any other cwd).

## [0.9.6] — 2026-06-05

Automate plugin self-update in /counsel-os:update via the claude plugin CLI.

- The marketplace-cache branch previously did a raw git pull (which never refreshes Claude Code's catalog) and pointed users at a no-op /plugin install. It now runs `claude plugin marketplace update` and `claude plugin update`; the only manual step left is /reload-plugins. Manual command fallback when the CLI or shell is unavailable.

## [0.9.5] — 2026-06-05

Add practice/reference/ as a first-class, out-of-precedence source.

- Recognize `counsel-os-type: reference` for curated third-party material (example agreements, checklists, treatise excerpts). It lives under practice/ for ownership but sits outside the 4-layer precedence — it informs issue-spotting and sample language, never governs; always cite-checked, never lifted verbatim.
- Wired into research.md and counsel/SKILL.md (path model, search types, effective-position carve-out, knowledge map).

## [0.9.4] — 2026-05-20

Manifest-only bump releasing the work since v0.9.3.

- Replace `{plugin_root}` placeholders with `${CLAUDE_PLUGIN_ROOT}` in all executable shell commands (8 invocations across 4 files) — some sessions resolved the placeholder relative to skills/counsel/ and got a wrong path to resolve_legal_root.sh.
- Consolidate the effective-position algorithm into counsel/SKILL.md as the single canonical statement (was duplicated with wording drift across evaluate.md and research.md); memory is explicitly step 4, "informs but does not override".
- Fix the H2-before-H1 heading anomaly in 11 method files (corrupted section-boundary inference during coverage checks).
- Move redline-output methodology from practice seed into plugin core (core methodology tied to apply_redlines.py, not a per-vault position).
- Repo docs: upgrade-UX design spec (on hold), field-test plan, gbrain search guidance in CLAUDE.md.

## [0.9.3] — 2026-05-15

Upstream redline-output method to practice seed.

- Adds practice/methods/redline-output.md covering section-numbering integrity, run-level formatting inheritance, character-set matching, and post-replacement cleanup; draft --redline points at it so the methodology loads before redline JSON is drafted.
- Also since 0.9.2: source-backed US/EU privacy law map.

## [0.9.2] — 2026-05-06

Use HTTPS source in marketplace.json.

- The github source type defaults to SSH cloning, which fails for users without GitHub SSH keys. Switched to the url source type with an explicit HTTPS clone URL so /plugin update works for all installs.

## [0.9.1] — 2026-05-06

Improve marketplace update guidance.

- Expanded the marketplace update instructions in skills/update/SKILL.md.

## [0.9.0] — 2026-05-06

Hardening and test-infrastructure batch (manifest-only bump releasing the work since v0.8.9).

- Add law frontmatter schema validator.
- Add golden matter eval harness.
- Add browse server tests, typecheck, and CI.
- Make the legal root resolver canonical.
- Refuse ambiguous redline matches in apply_redlines.
- Harden restore rollback handling.
- Repo cleanup fixes.

## [0.8.x and earlier]

Pre-0.9.0 history, collapsed. Highlights:

- 0.8.0–0.8.9 (2026-04-28 – 2026-05-02): migrate to the eigenlegal org and invert install order; drop the zip-export install path (marketplace install becomes the single supported method); vault-side config, runtime QMD detection, bootstrap pointer; skill-first setup; browse server packaging fixes.
- 0.7.x (2026-04-14 – 2026-04-24): primitives architecture (read, research, evaluate, draft, remember) replaces the pipeline skills; /counsel-os:counsel auto-invoked entry point; methods rewritten as reference guides; repo made self-installable as a marketplace; entity discovery abstracted.
- 0.6.x (2026-04-08 – 2026-04-14): eliminate the defaults layer, consolidate practice/; plugin cache sync in /update; document formatting (Times New Roman 11pt, smart quotes).
- 0.5.0 (2026-04-08): persistent matter state across all pipeline skills.
- 0.4.x (2026-04-05 – 2026-04-08): Word tracked-changes redline pipeline; knowledge-base version control and per-area content versioning; payments and data-privacy expansion for law/financial-services.
- 0.3.x (2026-03-24): vault integration and structure-agnostic discovery; law/ standardized to 26 areas as directories.
- 0.2.x (2026-03-21 – 2026-03-23): expanded knowledge base; user data moved to the Obsidian vault.
- 0.1.0 (2026-03-13): initial skeleton.
