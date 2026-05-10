# Proactive Upgrade UX — Design

**Status:** ON HOLD as of 2026-05-10 evening.

This spec solves a problem (out-of-date plugin notifications) for a user base that does not yet exist. Counsel OS has zero non-builder users today. A field test with the first prospective user is scheduled for Monday 2026-05-11; see `2026-05-10-yvonne-field-test.md`. Do not implement this spec until there is evidence that user-facing upgrade UX is the right thing to be working on, which we will not have until at least Tuesday.

**Original status:** Draft for review
**Date:** 2026-05-10
**Scope:** Make Counsel OS notice when it is out of date, prompt the user with sensible options, and apply state migrations safely across upgrades.

## Problem

Counsel OS currently relies on the user remembering to run `/counsel-os:update`. There is no proactive signal that a new version exists, no opt-in auto-upgrade, and no formal way to handle state-shape changes between versions. The existing one-off config-format migration is embedded inside `/counsel-os:update` as an ad-hoc branch, which does not scale to future breaking changes.

Out of scope (explicitly):
- Reducing the README's three-install-paths confusion.
- Splitting `/counsel-os:setup` into fast and deep paths.
- A `bin/bump-version` release script.
- Migrating away from the four-file version bump (VERSION, package.json, plugin.json, marketplace.json).

These are separate specs.

## Constraints

- **Must work in Cowork.** Cowork has no shell, no hooks, no background workers. Anything that fires "on session start" must do so inside a Counsel OS skill that the user has explicitly invoked.
- **Must work in Claude Code marketplace installs.** The plugin cache is host-owned; we cannot mutate `~/.claude/plugins/cache/{marketplace}/counsel-os/{version}/` directly. Upgrades there require the user to run `/plugin install` and fully restart with Cmd-Q.
- **Must work in local clones** (`claude --plugin-dir ~/counsel-os`), where we *can* `git pull`.
- **No double implementation.** One preflight procedure that all hosts run, not a hook-based variant plus an in-skill variant.

## Approach

Add a shared **Preflight** procedure to `skills/counsel/SKILL.md` (alongside the existing "Finding the Legal Root" procedure). Every Counsel OS skill references it as its first step. The procedure:

1. Decides whether to check (throttle, config opt-out, snooze).
2. Classifies install mode.
3. Reads remote version via per-mode dispatch.
4. Runs any pending migrations (always, regardless of remote check).
5. If remote > running, prompts the user via `AskUserQuestion` with Yes/Always/Not now/Never.
6. On "Yes" or `auto_upgrade: true`, executes the upgrade with the best action available for the install mode.

Migrations are markdown files under `migrations/v{version}.md` that the LLM executes. Their applied state is tracked in `{legal_root}/.counsel-os/migrations-applied`.

## File layout

```
counsel-os/
├── migrations/                                NEW
│   ├── README.md                              How to author a migration
│   └── v0.10.0.md                             First migration (lifts config-format migration out of /update)
│
├── skills/
│   ├── counsel/SKILL.md                       MODIFIED — add "Preflight" procedure
│   ├── setup/SKILL.md                         MODIFIED — call preflight first
│   ├── update/SKILL.md                        MODIFIED — call preflight, gain migration-runner step,
│   │                                                     drop the one-off config-migration branch
│   ├── browse/SKILL.md                        MODIFIED — call preflight first
│   └── retro/SKILL.md                         MODIFIED — call preflight first
│
└── docs/architecture/upgrade-ux.md            NEW — rationale + manual test matrix
```

State files (runtime, never shipped):

```
~/.counsel-os/                                 Per-machine; gracefully degraded if home write fails
├── last-update-check                          Unix timestamp of last successful check
├── update-snoozed                             "<version> <level> <epoch>" (level: 1=24h, 2=48h, 3+=1wk)
└── just-upgraded-from                         "<old_version>" — breadcrumb for next session

{legal_root}/.counsel-os/                      Per-vault; travels with the user
└── migrations-applied                         Newline-delimited list of applied migration versions
```

Config additions in `{legal_root}/config.md` (all optional, defaults shown):

```yaml
counsel-os-config: true
config_version: 1
legal_root: /path/to/vault
update_check: true        # set false = "Never ask again"
auto_upgrade: false       # set true = "Always keep me up to date"
```

## Preflight protocol

Referenced procedure in `skills/counsel/SKILL.md`. Every Counsel OS skill runs it first.

### Step 0 — Decide whether to check

Skip if any:
- `update_check: false` in `{legal_root}/config.md`.
- `~/.counsel-os/last-update-check` is less than 1 hour old.
- A snooze marker matches the current remote version and the snooze has not expired.

If shell/network checks fail, write the marker with a `skipped` sentinel so the preflight does not retry every turn.

### Step 1 — Classify install mode

- `local-clone` — `{plugin_root}/.git` exists.
- `marketplace-claude-code` — `{plugin_root}` is under `~/.claude/plugins/cache/{marketplace}/counsel-os/{version}/`.
- `cowork-or-unknown` — neither.

### Step 2 — Read remote version (per-mode dispatch)

- **local-clone:** `git -C {plugin_root} fetch --quiet origin && git -C {plugin_root} show origin/main:VERSION`.
- **marketplace-claude-code:** refresh `~/.claude/plugins/marketplaces/{marketplace}` with `git fetch && git merge --ff-only origin/main`, then read the Counsel OS version from `.claude-plugin/marketplace.json` (or `.claude-plugin/plugin.json`).
- **cowork-or-unknown:** `WebFetch https://raw.githubusercontent.com/eigenlegal/counsel-os/main/VERSION`. If WebFetch is also unavailable, write the `skipped` sentinel and return.

Compare against `{plugin_root}/VERSION`.

### Step 3 — Run pending migrations (always)

1. List `{plugin_root}/migrations/v*.md`, parse `migration-version` from frontmatter, sort by semver.
2. Read `{legal_root}/.counsel-os/migrations-applied`. Create the file if missing. Filter out applied versions.
3. For each remaining migration where `migration-version` is less than or equal to the running plugin VERSION:
   - Tell the user, one line: "Running migration v{version} — {one-line summary}."
   - If `requires-shell: true` and shell is unavailable, print a "manual steps needed" notice and skip. Do not mark as applied.
   - Execute the Detection block. If it returns skip, append the version to applied and continue.
   - Execute Steps. On any failure, run Rollback, do not mark applied, abort the remaining queue.
   - Execute Verification. On success, append `v{version}\n` to applied.
4. If any migration was skipped or failed, surface a single-line summary at the end of preflight.

### Step 4 — If remote is newer, prompt

`AskUserQuestion` with four options:

| Option | Action |
|---|---|
| Yes, upgrade now | Run Step 5. |
| Always keep me up to date | Set `auto_upgrade: true` in `config.md`. Run Step 5. |
| Not now | Write or escalate snooze marker (24h → 48h → 1 week). Continue with user's task. |
| Never ask again | Set `update_check: false`. Tell user how to re-enable. Continue with user's task. |

If `auto_upgrade: true` is already set, skip the prompt. Show a one-line "Auto-upgrading…" notice and go to Step 5.

### Step 5 — Execute upgrade per install mode

#### local-clone

1. Refuse if `git status --porcelain` is non-empty: "Local clone at {plugin_root} has uncommitted changes. Commit, stash, or revert before upgrading."
2. Refuse if `git rev-list --count origin/main..HEAD` is non-zero: user has local commits not on main; fast-forward is unsafe.
3. `git merge --ff-only origin/main`. On failure, surface stderr and stop.
4. Tell user: "Upgraded to v{new}. Skill text reloads on the next conversation. Pending migrations will run then."
5. Write `~/.counsel-os/just-upgraded-from` with the old version.
6. Continue with the user's original request using the old, already-loaded skill text. Do not attempt hot-reload.

**Rationale:** running migrations immediately after `git merge` is unsafe because the running skills are still the old ones; migrations may reference procedures only in the new skills.

#### marketplace-claude-code

1. Refresh `~/.claude/plugins/marketplaces/{marketplace}` (done in Step 2 already).
2. Tell user:
   > Counsel OS v{new} is available. Refreshed the marketplace clone.
   > To finish the upgrade:
   > 1. Run `/plugin install counsel-os@{marketplace}` in this Claude Code session.
   > 2. Quit fully with **Cmd-Q** (closing the window is not enough — Claude Code caches plugin manifests in memory).
   > 3. Reopen Claude Code. Migrations will run on first invocation.
3. Write `~/.counsel-os/just-upgraded-from`.
4. Continue with the user's request.

**Failure cases:** if the marketplace clone has uncommitted changes (unusual) or fetch fails, fall back to "instructions only" without the refresh step.

#### cowork-or-unknown

1. Tell user:
   > Counsel OS v{new} is available.
   > To upgrade in Claude Desktop:
   > 1. Open **Cowork → Customize → Plugins**.
   > 2. Find Counsel OS and click **Update**.
   > 3. Restart Claude Desktop.
   > Pending migrations will run automatically next time you ask for legal work.
2. Write breadcrumb if home-dir writes work. Otherwise skip; next session detects via version comparison alone.
3. Continue with the user's request.

No auto-execute path here. Silently doing nothing while claiming "upgraded" would be worse than honest instructions.

**Note on `auto_upgrade: true` in Cowork:** we still cannot drive the host's plugin manager. The flag suppresses the prompt; the instructions still appear. Worth documenting alongside the config keys.

### Step 6 — On failure, roll back and warn

- **local-clone:** if `git merge --ff-only` fails, leave the repo untouched, surface stderr.
- **marketplace clone refresh:** same.
- **marketplace cache itself:** we never touch it, so no rollback to do.

### Step 7 — Write `last-update-check` and continue

The preflight never replaces the user's task. After it finishes (success, snooze, refused, or error), continue with whatever the user originally asked for.

### Cross-cutting: the "just upgraded" breadcrumb

When the preflight detects that `{plugin_root}/VERSION` is newer than the version it saw last time:

1. Show a one-line "Upgraded to v{new} since last session" notice.
2. Run Step 3 (migrations) before Step 4 (remote check). Migrations have priority over checking for the next upgrade.
3. Delete `~/.counsel-os/just-upgraded-from` and `~/.counsel-os/update-snoozed` after success.

This handles "user updated through Cowork's plugin manager and restarted" without the preflight knowing who triggered the upgrade.

## Migration format

Markdown files at `{plugin_root}/migrations/v{version}.md`. Markdown rather than shell because (a) Cowork has no shell and (b) the skill-first architecture means the LLM executes migration steps, allowing judgment calls ("if the user customized this file, ask before overwriting").

```markdown
---
migration-version: "v0.10.0"    # matches filename and the entry written to migrations-applied
requires-shell: false           # true = skip in no-shell hosts with a notice
idempotent: true                # author's claim that re-running is safe
---

# Migration: v0.10.0 — Marked config format

## What this migrates
One-line summary shown to the user before running.

## Detection
How to tell if this migration is needed beyond the version comparison.

## Steps
Numbered, imperative. Each step is something the LLM can do with file tools.

## Rollback
What to do if a step fails. Snapshot first for destructive migrations.

## Verification
How to confirm success.
```

### Authoring rule for the project

Any release that requires user-state changes (config schema bump, file rename, knowledge restructure) ships a migration file. Caught at code-review time. Documented in `migrations/README.md` and in `CLAUDE.md`.

### What migrations are NOT for

- Refreshing law content — that is `/counsel-os:update`'s job, user-approved per file.
- Updating practice seed — also `/counsel-os:update`'s job; user owns practice content.
- Generic content sync — only state-shape changes the user cannot reasonably do by hand.

### Known edges

- **`idempotent` is author-claimed, not enforced.** The applied-marker means we never re-run on purpose. Re-running only happens if the marker is lost or the user deliberately forces it. No `--force` story in v1.
- **Downgrade is not supported.** We never apply migrations newer than the running version. If a user downgrades, newer migrations remain marked applied; if they re-upgrade, those migrations are skipped. Acceptable default.

## Testing

### Migration runner — automated

`scripts/test_migrations.py` (or `.sh`):

- Create a temp `migrations/` with fixture files and a temp `migrations-applied` marker.
- Verify filter + sort + apply logic produces the expected order and final marker state.
- Cover: empty migrations, all applied, mixed applied, missing marker file, malformed frontmatter (skip with warning), `requires-shell: true` in no-shell mode.

### Install-mode classification — automated

Lift existing classification logic from `/counsel-os:update` into `scripts/classify_install.py`. Fixture-based tests: given a pretend `{plugin_root}` path, return the expected mode. Catches regressions when paths change.

### Preflight behavior — manual matrix

Documented in `docs/architecture/upgrade-ux.md`:

| Install mode | Remote = local | Remote > local |
|---|---|---|
| local-clone | preflight silent | prompts → `git pull` works |
| marketplace | preflight silent | prompts → marketplace clone refreshes, instructions shown |
| cowork | preflight silent | prompts → instructions shown |

Each cell gets a manual repro recipe. Run before each release; capture results in the release PR.

## Rollout

1. **v0.10.0** — ship the framework with `update_check: false` as the default. Preflight runs and applies migrations but does not prompt for upgrades. Shake out runner bugs before adding the prompting surface. First migration is the config-format one, lifted out of `/counsel-os:update`.
2. **v0.10.1** — flip default to `update_check: true`. Real proactive notifications go live.
3. **v0.11+** — author migrations as needed. `migrations/README.md` and a `CLAUDE.md` checklist item keep this consistent.

## Backwards compatibility

- Existing installs with no `{legal_root}/.counsel-os/` directory: created lazily on first preflight; treated as "no migrations applied yet."
- Existing installs without `update_check`/`auto_upgrade` in `config.md`: defaults apply (check on after v0.10.1, auto off).
- Existing `/counsel-os:update`: its Step 1 (config migration) is deleted and reappears as `migrations/v0.10.0.md`. Steps 2+ (content sync) are unchanged.
