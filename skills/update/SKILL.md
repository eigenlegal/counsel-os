---
name: update
description: "Skill-first update: refresh plugin methodology through the install path, then review law and practice content changes for your vault."
---

# Update — Skill-First Sync

Counsel OS updates are LLM-orchestrated. The skill decides what is safe to do in the current runtime, explains each step, and asks before changing user-owned knowledge.

## Step 0: Resolve Plugin Root

Resolve the plugin root first: the directory containing this skill. You need this to distinguish plugin documentation from the user's legal root and to find shipped content.

## Step 1: Migrate Config If Needed

This is a one-time migration path for users upgrading from earlier Counsel OS versions. It is intentionally limited to `/counsel-os:update`; normal counsel/setup path discovery remains strict and does not silently accept legacy config.

### Current config format

A valid legal-root config is marked:

```markdown
counsel-os-config: true
legal_root: /absolute/path/to/legal/root
```

### Migration trigger

First try the Finding the Legal Root procedure in `skills/counsel/SKILL.md`.

- If it finds a marked config, skip this migration.
- If it finds no marked config, attempt the migration below.
- If it finds multiple marked configs, ask the user which one to use and skip migration.

### Migration sources

Check these sources in order. A source may be read only for this migration, not as a recurring fallback.

1. **Pointer file** at `~/.counsel-os/legal-root` if home-directory access is available. If it points to a directory that exists, treat that directory as the candidate legal root.
2. **Legacy plugin config** at `{plugin_root}/config.local.md`, if present. Read only `legal_root:`, `entities_path:`, `matters_path:`, and `entity_properties:` fields.
3. **User-provided path.** If no source is found, ask: "Where is your existing Counsel OS legal root?"

Do not scan arbitrary unmarked `config.md` files. That was the old failure mode: plugin documentation or unrelated project files could be mistaken for user config.

### Candidate validation

Before writing anything, validate the candidate legal root:

- The path is outside the plugin root.
- The directory exists, or the user approved creating it.
- Prefer candidates containing at least one Counsel OS directory: `law/`, `practice/`, `matters/`, `memory/`, or `entities/`.
- If the candidate has an existing `config.md`, preserve optional overrides from it only if it appears to be user config. Do not preserve unrelated prose or plugin docs.

### Write migrated config

Write `{legal_root}/config.md` in the current format:

```markdown
# Counsel OS Configuration

counsel-os-config: true
config_version: 1
legal_root: {resolved legal root}

# Optional overrides (defaults shown — uncomment to customize):
# entities_path: entities
# matters_path: matters
# auto_apply_law_updates: false   # true = update applies law content without per-area approval
# law_management: plugin          # 'user' = you own ALL law content; update stops syncing it (/counsel-os:law-refresh maintains it)
# entity_properties:
#   type_field: counsel-os-type
#   values: [counterparty, vendor, customer, prospect, matter]
```

If the legacy config had explicit `entities_path`, `matters_path`, or `entity_properties` overrides that differ from defaults, carry them forward below `legal_root:`. Discard legacy discovery/index configuration; knowledge search is runtime-detected.

If home-directory writes are available, update the pointer:

```bash
mkdir -p ~/.counsel-os
printf '%s' "{resolved legal root}" > ~/.counsel-os/legal-root
```

Report:

```markdown
Migrated Counsel OS config to the current marked format at {legal_root}/config.md.
```

## Step 2: Resolve Legal Root

Resolve `{legal_root}` via the Finding the Legal Root procedure in `skills/counsel/SKILL.md`.

Do not read unmarked legacy configs as a fallback. If no marked config is found, ask the user to run `/counsel-os:setup` or provide the legal root path so setup can write the current config format.

## Step 3: Refresh Plugin Methodology

Plugin methodology means skills, primitives, scripts, templates, and shipped knowledge. How it updates depends on install mode:

First classify the loaded plugin:

- **Local clone:** `{plugin_root}` itself contains `.git/`.
- **Claude Code marketplace cache:** `{plugin_root}` is under `~/.claude/plugins/cache/{marketplace}/counsel-os/{loaded_version}/`.
- **Other marketplace/runtime:** shell access is unavailable or the install layout is not readable.

Always report:

- loaded plugin root
- loaded version from `{plugin_root}/VERSION` or `{plugin_root}/.claude-plugin/plugin.json`
- install mode
- whether the currently running session can use updated skill files without restart

### Claude Code local clone

If shell access is available and the plugin root is a git repo, run:

  ```bash
  git -C "${CLAUDE_PLUGIN_ROOT}" fetch origin
  git -C "${CLAUDE_PLUGIN_ROOT}" merge --ff-only origin/main
  ```

If the local clone has uncommitted changes or a non-fast-forward update is needed, stop and explain the situation. Do not merge through conflicts inside the update skill.

### Claude Code marketplace cache

Do not try to edit the cache directory directly. The cache is a versioned snapshot, and the current session has already loaded these skill files into memory.

If shell access is available and the loaded path matches `~/.claude/plugins/cache/{marketplace}/counsel-os/{loaded_version}/`:

1. Derive `{marketplace}` and `{loaded_version}` from the cache path.
2. **Refresh Claude Code's marketplace catalog** so it actually discovers the new version. A raw `git pull` of the clone updates files on disk but NOT Claude Code's catalog metadata, so `/plugin install` keeps reporting "already installed." If the `claude` CLI is available, run:

   ```bash
   claude plugin marketplace update {marketplace}
   ```

3. Determine the now-available version (`claude plugin list`, or read `~/.claude/plugins/marketplaces/{marketplace}/.claude-plugin/marketplace.json`) and compare it against `{loaded_version}`.

4. **If a newer version is available, install it for the user** — no manual `/plugin` typing needed:

   ```bash
   claude plugin update counsel-os@{marketplace}
   ```

   This may prompt for command permission. If `claude plugin update` is unavailable, fall back to `claude plugin uninstall counsel-os@{marketplace}` followed by `claude plugin install counsel-os@{marketplace}`.

5. **Apply.** New skill files load only after a reload — the one step the skill cannot perform itself. Tell the user to run `/reload-plugins` (or start a new conversation; a full Cmd-Q restart is the safe fallback), and report the version delta applied.

   - If the versions already match, tell the user the install is current; a new conversation or `/reload-plugins` may still be needed for the running session to pick up changed skill files.

If the `claude` CLI or shell access is unavailable, tell the user to run, in order: `/plugin marketplace update {marketplace}` → `/plugin uninstall counsel-os@{marketplace}` → `/plugin install counsel-os@{marketplace}` → `/reload-plugins`, then fully restart if needed.

### Developer shortcut

If the user is actively developing Counsel OS from a source checkout, recommend launching Claude Code with the source repo:

```bash
claude --plugin-dir /path/to/counsel-os
```

This bypasses marketplace and cache layers. A new conversation is still needed to reload changed skill files.

### Other marketplace runtimes

For Claude Desktop / Cowork marketplace installs, tell the user to update or reinstall the plugin through the plugin marketplace, then start a new conversation or restart the host.

After updating methodology, tell the user whether a restart is needed. In most plugin runtimes, changed skill files load reliably only in a new conversation or after restarting the host.

### Rebuild the Browse Runtime

The browse daemon's compiled binary is built per cache directory, so a freshly installed version has no `browse/dist/browse`. `browse/bin/find-browse` self-heals on machines with network access — it downloads the prebuilt binary (and browser builds if missing) from the plugin's GitHub release on the next browse use — but a local build is faster to first use and required when downloads are disabled.

If the user uses `/counsel-os:browse`, shell access and bun are available, and the new version's plugin root lacks `browse/dist/browse`, rebuild there:

```bash
cd ~/.claude/plugins/cache/{marketplace}/counsel-os/{new_version}
bun install
bun run build
```

If bun is unavailable, no action needed — tell the user the first browse command after the update will download the prebuilt binary (one-time, ~1-2 minutes).

Notes:

- The Playwright Chromium browser is installed per-user and survives plugin updates; run `bunx playwright install chromium` only if it is missing.
- If a browse server from the old version is still running (`~/.counsel-os/browse/browse-server.json` exists — or `/tmp/browse-server.json` for daemons from earlier releases), run `browse/dist/browse restart` from the new root so the next browse use runs the new build. For a `/tmp`-era daemon, `kill` the PID from its state file and delete the `/tmp` file instead — the new CLI doesn't read the old location.
- Without shell access, tell the user to run `bun install && bun run build` from the new plugin root before their next browse use.

Skip silently if the user does not use browse.

## Step 4: Compare Vault Content

Compare the plugin's shipped content to the user's vault.

### Law areas: plugin-managed by default

**Ownership check first.** If `{legal_root}/config.md` sets `law_management: user`, skip the entire law comparison — the user owns their law library and maintains it with `/counsel-os:law-refresh`. Report that law sync was skipped and why.

Otherwise, compare `knowledge/law/` in the plugin root against `{legal_root}/law/`:

1. **Compare by CONTENT, not by `content-version` date.** Same-day releases produce identical dates with different content — date comparison silently misses them. With shell access, `diff -rq` each plugin area directory against the vault copy. Without shell, compare `content-version` dates but warn that same-day changes may be missed.
2. If the vault area is missing, classify as **new law content**. If content differs, classify as **upstream law update**. If identical, skip.
3. Vault-only areas (the user created them) are user-owned — never touch them.

Law areas are plugin-managed by default, so updates are safe to apply after user approval — or automatically, when the user's `{legal_root}/config.md` sets `auto_apply_law_updates: true`. **Exception: any vault law file whose frontmatter contains `managed-by: user` is permanently user-owned — never overwrite it, even under auto-apply.** When applying an area that contains marked files, copy file-by-file, skip the marked ones, and report them ("skipped N user-owned law files").

### Practice seed: user-owned

Practice files are user-owned and diverge from the seed by design — positions filled in, methods customized, local notes added. A direct seed-vs-vault diff therefore flags nearly every file and is pure noise. Never present raw seed-vs-vault differences as "updated guidance," and never overwrite practice files blindly.

Detect genuine upstream changes by diffing the new seed against the PREVIOUSLY INSTALLED version's seed:

1. Locate the prior version's seed. Marketplace cache installs keep old versions on disk: `~/.claude/plugins/cache/{marketplace}/counsel-os/{prior_version}/knowledge/practice-seed/`. For local clones, use `git diff {prior_ref} -- knowledge/practice-seed/`.
2. `diff -rq` the prior seed against the new seed. Only files changed or added upstream are candidates — everything else is either already reconciled or user-customized, and is skipped.
3. Filter out purely cosmetic upstream changes (version-stamp bumps, formatting cleanups). Report them as "N seed files re-stamped upstream, no content changes" rather than offering merges.
4. If no prior seed exists on disk (cache cleaned, fresh machine), fall back to seed-vs-vault comparison — but say so explicitly, and frame differences as "may be your edits or may be upstream changes — review before merging."

For each candidate file:
1. If the vault file is missing, offer it as **new practice content**.
2. If the vault file exists, show the upstream delta and offer a reviewable merge that preserves the user's `## Our Position` section and local edits.

## Step 5: Present Changes

Show a concise change list:

```markdown
## Update Review

Plugin methodology:
- [current status]

Law updates:
- law/data-privacy/ — updated upstream

Practice suggestions:
- practice/standards/data-protection.md — updated guidance available; user position will be preserved

Unchanged:
- [N] files already current
```

Ask what to apply. Apply law updates only after approval — unless `auto_apply_law_updates: true` is set in `{legal_root}/config.md`, in which case apply them directly and report what changed. Practice suggestions ALWAYS require approval after showing exactly what will change, regardless of the flag.

## Step 6: Apply Approved Changes

For approved law updates:
1. Copy the plugin law file or directory into `{legal_root}/law/` — skipping any vault file marked `managed-by: user` (copy file-by-file when an area contains marked files).
2. Preserve no other local edits unless the user explicitly says they customized law content and wants a merge — and when they say that, offer the durable fix: mark the file `managed-by: user` so future updates skip it automatically and `/counsel-os:law-refresh` maintains it.

For approved practice updates:
1. Preserve user-owned sections, especially `## Our Position`.
2. Update reference sections from the seed.
3. Write only the approved files.
4. If you apply deltas with `patch`, pass `--no-backup-if-mismatch` and clean up afterward: `find {legal_root}/practice -name '*.orig' -delete -o -name '*.rej' -delete`. `patch` drops `.orig` backups (and `.rej` rejects on failed hunks) next to the files it touches, and the Step 9 pathspec commit will happily sweep them into the vault history. A hunk that fails entirely means the vault file diverged too far for a textual merge — fall back to applying the upstream change by hand, don't commit the `.rej`.

For new practice files:
1. Copy from `knowledge/practice-seed/`.
2. Explain that the user can edit them directly later.

## Step 7: Check Impact

After applying law updates, check whether any updated law constraints affect the user's standards in `{legal_root}/practice/standards/`.

Flag conflicts clearly:

```markdown
Action needed: updated data-privacy law guidance affects practice/standards/data-protection.md. Review breach notification timing before the next DPA.
```

## Step 8: Reindex

If a content index is connected (e.g. QMD) and law or practice files were written, refresh it so the new content is retrievable immediately:

```bash
qmd update
[ -d ~/.cache/qmd/models ] && qmd embed
```

The index does not watch the vault — without this step, knowledge-base searches keep returning pre-update content. Skip silently when no index tool is available.

Run `qmd embed` **only** behind the model-cache check shown above: the cache exists only if the user has already opted into semantic embeddings, and a bare `qmd embed` on a BM25-only install triggers a surprise ~940MB one-time model download — a consent violation (setup promises embeddings stay opt-in). BM25 (`qmd update`) keeps search working either way.

## Step 9: Version Control

If `{legal_root}` is a git repo and changes were applied, offer to commit — scoped to what this update actually touched, never `git add -A`:

1. Check `git -C {legal_root} status --short` first. Vaults routinely carry unrelated in-progress work (staged matter files, profile edits, untracked notes); a blanket `add -A` — or a bare `git commit` against a pre-loaded index — sweeps it into the update commit. Merge-tool litter (`*.orig`, `*.rej`) inside the pathspec gets swept too — confirm Step 6's cleanup ran before staging.
2. Stage and commit by pathspec so only update-touched paths land, regardless of what else is staged:

```bash
git -C {legal_root} add law/ practice/
git -C {legal_root} commit -m "Update Counsel OS law and practice content" -- law/ practice/
```

Narrow the pathspec to the directories actually written this run.

If it is not a git repo, mention that version control is available but do not push it. The user can ask `/counsel-os:setup` to configure it.

## Step 10: Summary

End with:

```markdown
## Update Complete

Plugin methodology: [current/updated/restart needed]
Config migration: [not needed/migrated/user action needed]
Vault content: [N] law files updated, [N] practice files added/merged, [N] skipped
Next steps: [specific review items or "none"]
```
