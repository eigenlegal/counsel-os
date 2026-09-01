# Content Updates and Doctor in the Runtime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The runtime keeps a vault's shipped content current and checks the vault's health without the plugin: `counsel-os update-content`, `counsel-os doctor`, `GET /content/status`, `POST /content/apply`, `GET /doctor`, a Content group and a "Check the vault" action in Settings — porting the rules of `skills/update/SKILL.md` steps 4–7 and `skills/doctor/SKILL.md` steps 1, 2, 4B, 8, 10, 11 exactly, with the environment checks dropped.

**Architecture:** `runtime/src/content/update.ts` classifies every shipped file against the vault by frontmatter-stripped body hash — the shipped hash, the vault hash, and the hash the vault last received (`.counsel/content-state.json`, written by `runSetup`) — and applies only what the rules allow (law `update-available`/`missing`; practice `missing`; never a user-modified file, never a practice file the user has). Practice diffs are drawn against a snapshot of the last received seed (`.counsel/received/…`, written from this PR on) or, when there is none, against the vault copy with that stated. `runtime/src/doctor/` runs pure checks over the vault root, the content source, the law policy, and an injected git runner, and returns findings. Routes and CLI are thin; the UI renders ledgers in set text.

**Tech Stack:** Bun 1.3.x, TypeScript strict, `Bun.YAML` for frontmatter (as `overview.ts`), `node:crypto` hashing (`content/hash.ts`), a small in-repo line diff (no new dependency), React 18 + happy-dom tests for the UI.

**Spec:** `docs/superpowers/specs/2026-09-01-runtime-owned-setup-design.md` §6 (content updates), §7 (doctor), §10 steps 5–6.

## Global Constraints

- Law is plugin-managed by default; a file is user-owned when its frontmatter says `managed-by: user`, when `config.md` says `law_management: user`, or when its body differs from what the vault last received. **A user-owned file is never written.** Vault-only law areas are never touched.
- Practice seeds are user-owned. Never seed-vs-vault diffed as "updated guidance"; never overwritten. A practice file the vault lacks may be added. `## Our Position` is never touched by any automatic step.
- `auto_apply_law_updates: true` in `config.md` applies law `update-available` items at serve start, logs one line, and still never touches a user-owned file. Practice always needs a person.
- Doctor is read-only. Findings are `{ check, severity: 'ok' | 'warn' | 'error', message, detail?, paths? }`. No environment checks (pandoc, python, browse, qmd). Doctor never runs `git add/commit/push`.
- Every route that needs the token has its first segment in `API_PREFIXES` (`content`, `doctor`) and in `runtime/ui/vite.config.ts`'s proxy list.
- Tests never touch the real `~/.counsel-os` or a real vault: temp `COUNSEL_OS_HOME`, temp vaults, an injected git runner.
- Design language in the UI: set text, small-caps run-ins, dotted leaders, no pills, no modals.
- Commit prefixes `runtime:` / `ui:` / `docs:`; no `Co-Authored-By`, no `Claude-Session` trailers.

---

## File structure

```
runtime/src/
  vault/resolve-root.ts                 VaultConfig + autoApplyLawUpdates, lawManagement
  setup/run.ts                          export readContentState, PLACEMENTS; practice snapshots
  content/diff.ts (+ .test.ts)          unifiedDiff(a, b, labels) — line LCS, capped
  content/update.ts (+ .test.ts)        contentStatus, applyUpdates, autoApplyLawUpdates
  doctor/policy.ts                      LawPolicy loader (frontmatter-policy.json)
  doctor/checks.ts (+ .test.ts)         the six checks, pure over a vault root
  doctor/index.ts                       runDoctor → DoctorReport
  server/routes.ts (+ .test.ts)         GET /content/status, POST /content/apply, GET /doctor
  server/serve.ts (+ .test.ts)          auto-apply at start
  cli.ts                                update-content, doctor
runtime/ui/
  vite.config.ts                        + /content, /doctor
  src/api/types.ts                      ContentStatus, ContentItem, DoctorReport, DoctorFinding
  src/v2/settings/ContentGroup.tsx (+ .test.tsx)
  src/v2/settings/DoctorLedger.tsx (+ .test.tsx)
  src/v2/settings/SettingsPage.tsx      mounts both
  src/styles.css                        .v2-content-*, .v2-doctor-*
skills/update/SKILL.md, skills/doctor/SKILL.md   one line each
CHANGELOG.md                             Unreleased
```

---

### Task 1: Config fields and content-state exports

**Files:** `runtime/src/vault/resolve-root.ts`, `resolve-root.test.ts`, `runtime/src/setup/run.ts`, `run.test.ts`

- [ ] Test: `readVaultConfig` returns `autoApplyLawUpdates: false`, `lawManagement: 'plugin'` by default; `true`/`'user'` when the lines are present (case as written; quoted values tolerated).
- [ ] Add the two fields. Export `readContentState`, `writeContentState`, `PLACEMENTS`, `RECEIVED_DIR` (`.counsel/received`) from `run.ts`; `runSetup` writes a snapshot of each PRACTICE seed it places under `.counsel/received/<vault path>` (law is not snapshotted — its baseline is its hash).
- [ ] Test: after `runSetup`, `.counsel/received/practice/standards/confidentiality.md` exists and equals the seed; law has no snapshot.
- [ ] Commit `runtime: config flags for law updates; practice seed snapshots beside the content state`.

### Task 2: Line diff

**Files:** `runtime/src/content/diff.ts`, `diff.test.ts`

- [ ] Test: identical → `''`; one changed line → a unified hunk with `-`/`+`; leading/trailing context of 3; inputs over 4000 lines → a one-line "diff too large" marker.
- [ ] Implement LCS over lines (O(n·m) with the cap), `unifiedDiff(a, b, { from, to })`.
- [ ] Commit `runtime: a small unified line diff for practice seed changes`.

### Task 3: Content update classification

**Files:** `runtime/src/content/update.ts`, `update.test.ts`

- [ ] Types: `ContentItem { path (vault), shipped, group: 'law' | 'practice', status, reason?, diff?, baseline?: 'received' | 'vault' }`, `ContentStatus { shippedVersion, vaultVersion, items, counts }`.
- [ ] `contentStatus(deps: { vaultRoot, content, shippedVersion, now? })`:
  - law: per shipped file → `current` / `update-available` / `user-modified` (`reason: 'managed-by' | 'law-management' | 'edited' | 'no-baseline'`) / `missing`; vault law files not shipped → `vault-only`. `law_management: user` marks every law file user-modified (reason `law-management`) and no law is ever applicable.
  - practice: shipped hash ≠ received hash → `upstream-changed` with `diff` (received snapshot vs shipped when the snapshot exists, else vault vs shipped, `baseline: 'vault'`); missing in vault → `missing`; else `current`. Cosmetic-only changes: a diff whose only changed lines are `content-version:` frontmatter lines is `current` with `reason: 'restamped'`.
  - counts per status.
- [ ] Tests: every classification; managed-by guard; law_management guard; practice never `update-available`; restamp filter; vault-only.
- [ ] `applyUpdates(deps, paths)`: refuses (throws `UpdateError`) a path that is not law `update-available`/`missing` or practice `missing`; writes the shipped text; updates content-state hashes and practice snapshots; returns `{ applied, skipped }`. Idempotent (second call → nothing to do).
- [ ] `autoApplyLawUpdates(deps)`: when `config.autoApplyLawUpdates`, applies every law `update-available`, returns the count (0 when off); never touches user-modified.
- [ ] Tests for both.
- [ ] Commit `runtime: content updates — classify shipped vs vault by hash, apply what the rules allow`.

### Task 4: Routes, serve, CLI

**Files:** `routes.ts`, `routes.test.ts`, `serve.ts`, `serve.test.ts`, `cli.ts`, `runtime/ui/vite.config.ts`

- [ ] `GET /content/status` → `ContentStatus`; `POST /content/apply` `{ paths }` → `{ applied, skipped }`, 400 with the refusal; `API_PREFIXES` + `'content'`, `'doctor'`.
- [ ] Tests: status on a seeded temp vault (one user-edited law file, one upstream change simulated by writing a different shipped file to the plugin root), apply happy path, apply refusal 400.
- [ ] `serve.ts`: after `buildApp`, if `readVaultConfig(vault).autoApplyLawUpdates`, run `autoApplyLawUpdates` and log `counsel-os runtime: applied N law updates`. Test in `serve.test.ts`.
- [ ] `cli.ts`: `update-content [--vault] [--yes] [--dry-run]` prints the ledger, applies law updates with `--yes` (else asks y/n), exits 0; `doctor [--vault]` prints the table, exit 0 (1 with any `error` finding). Vite proxy.
- [ ] Commit `runtime: /content/status, /content/apply, auto-apply at serve start, update-content CLI`.

### Task 5: Doctor

**Files:** `runtime/src/doctor/policy.ts`, `checks.ts`, `checks.test.ts`, `index.ts`, `routes.ts`, `cli.ts`

- [ ] `checks.ts`, each `(ctx) => Finding[]`:
  - `root-config`: `config.md` has the marker and `legal_root:` equals the root (realpath both) → ok; marker but elsewhere → warn; missing → error.
  - `structure`: law, practice/{standards,methods,library,reference}, matters (override), memory, entities (override), profile.md; counts of `*.md` minus `index.md`; law or standards missing/empty → error; others missing → warn; empty matters/entities → ok "empty (fresh install)".
  - `law-currency`: per vault law file: `last-reviewed` + `review_cadence_months[area] ?? default` (calendar month add as the Python) vs now; stale/never → warn, split user-owned vs plugin-managed in the message; skip `FRONTMATTER.md`.
  - `git`: injected runner; not a repo → warn; no remote → warn; ≥20 uncommitted → warn; else ok with the detail line.
  - `consistency`: standards ↔ library numeric divergence (see decisions) → warn per divergence; ok with the pair count.
  - `law-impact`: open matters (`stage: intake|working`) with `updated:` and law areas (frontmatter `law_areas`/`law-areas`, or a body line `**Law areas:** …`); area's newest `last-reviewed` after `updated` → warn listing them.
- [ ] Tests on seeded temp vaults: a stale area, a user-managed stale file, a matter behind its area, a divergent pair, a clean vault.
- [ ] `runDoctor(deps)` → `{ at, vault, findings, verdict }`; `GET /doctor`; `counsel-os doctor`.
- [ ] Commit `runtime: doctor — the vault checks of /counsel-os:doctor, read-only`.

### Task 6: Settings UI

**Files:** `runtime/ui/src/api/types.ts`, `v2/settings/ContentGroup.tsx` (+ test), `DoctorLedger.tsx` (+ test), `SettingsPage.tsx`, `styles.css`

- [ ] `ContentGroup`: purpose line; "Shipped X · vault received Y"; summary line "N law areas have updates · review" (or "Everything is current"); the list: rows `path ···· status` with `apply` on `update-available`/`missing`, "user-modified — left alone" text, practice `show diff` toggling a `<pre>`; "apply all updates" when any applicable; errors inline; re-reads status after apply.
- [ ] `DoctorLedger`: "Check the vault" → `GET /doctor` → rows `check ···· severity` (set text: `ok` green, `warn` amber, `error` red) with message and paths; verdict line.
- [ ] Mount: ContentGroup as its own `.v2-group` after Test; DoctorLedger inside the Runtime group under `Health`.
- [ ] Tests with fetch mocks: status render, apply → POST body → re-read, show diff, doctor rows and verdict, error lines.
- [ ] Commit `ui: Settings — the Content group and Check the vault`.

### Task 7: Docs

- [ ] `skills/update/SKILL.md`, `skills/doctor/SKILL.md`: one line each; `CHANGELOG.md` Unreleased; commit `docs: content updates and doctor in the runtime`.

## Decisions recorded up front

- The consistency check is mechanical where the skill is judgment: for each standard ↔ library pair (name map below), numbers with a unit (hours, days, months, years, %, ×) are collected from the standard's `## Our Position` block (`Our standard` + `We'll accept` lines) and from the library's `### Standard` and `### Minimum Acceptable` blocks; a Minimum Acceptable number for a unit that is stricter than every number the standard accepts, or looser than all of them, is reported as a *possible* divergence with both numbers. Law floors are not compared mechanically (no machine-readable floors exist); the finding says so.
- Name map for pairs: same stem, plus `ai-data-use↔ai-and-data-use`, `assignment-change-of-control↔assignment-and-change-of-control`, `termination-renewal↔termination-and-renewal`, `service-levels↔sla-and-performance`, `indemnification`/`limitation-of-liability↔liability-and-indemnification`, `ip-ownership`/`confidentiality↔ip-and-confidentiality`, `compliance-certifications↔compliance-regulatory`.
- Backups (doctor step 7) are out of this PR: the runtime has no backup command yet.
