---
name: update
description: "Pull latest plugin and sync content updates to your vault. One command handles everything."
---

# Update — Pull Plugin + Sync Content

This skill handles both plugin updates (methodology) and content syncing (law areas, default positions) in one step. Run periodically to stay current.


## Step 0: Resolve Paths

Read `config.local.md` (if it exists) or `config.md` from the plugin root to get:

- **Legal root** (`{legal_root}`) — contains law/, defaults/, practice/, memory/
- **Plugin root** — where the plugin lives (the directory containing this skill)

## Step 1: Pull Plugin Update

This updates the plugin's methodology — skills, CLAUDE.md, scripts. Your vault content is not touched.

```bash
# Store current version
OLD_VERSION=$(cat VERSION)

# Pull latest
git fetch origin
git merge origin/main --no-edit

# Show new version
NEW_VERSION=$(cat VERSION)
```

If the plugin is not a git repo (installed via plugin cache), find the source repo and sync:
```bash
./update
```

Report what changed:
> **Plugin updated: v{old} → v{new}**
> - Skills: [list any changed skill files]
> - CLAUDE.md: [changed/unchanged]
> - Scripts: [list any changed scripts]

If already up to date:
> Plugin is current (v{version}). Checking content sync...

## Step 2: Compare Content

Now compare the plugin's seed content (`knowledge/law/` and `knowledge/defaults/`) against your vault copies (`{legal_root}/law/` and `{legal_root}/defaults/`).

For each content group (subdir of `knowledge/law/` and `knowledge/defaults/`):
1. Read the plugin's `content-version` date from any `.md` file's frontmatter in that group
2. Read the vault's `content-version` date from the corresponding file at `{legal_root}/law/{area}/` or `{legal_root}/defaults/{area}/`
3. If dates match → skip this group (unchanged)
4. If the vault file has `counsel-os-version` instead of `content-version` (pre-migration vault) → fall through to full content diff for that group
5. If dates differ or vault file is missing → compare file content (ignoring frontmatter) and classify as: **upstream updated** (plugin has newer content), **locally customized** (vault differs from seed but seed unchanged), or **both changed** (conflict)

Also check for **new files** — files in the plugin seed that don't exist in the vault.

## Step 3: Present Changes

Show the user what's different, organized by action needed:

### New content (not yet in your vault)
```
New files available:
- law/new-area.md — [brief description of what it covers]
- defaults/new-file.md — [brief description]
```

For each new file, ask: "Add this to your vault?"

### Updated content (upstream changed, you haven't customized)
```
Updated upstream (safe to apply):
- law/data-privacy.md — [summary of what changed]
- defaults/positions.md — [summary: added AI data use position, updated liability guidance]
```

For each, ask: "Apply this update to your vault?" Then overwrite the vault copy (preserving frontmatter).

### Conflicts (both upstream and local changes)
```
Conflicts (you customized, upstream also changed):
- law/financial-services.md
  Your changes: [summary of local modifications]
  Upstream changes: [summary of new content]
```

For each conflict, show a summary of both sides and ask:
> This file has both local customizations and upstream changes. Options:
> (A) Keep your version (skip upstream changes)
> (B) Take upstream version (lose your customizations)
> (C) Let me merge them — I'll combine your customizations with the upstream changes

If user picks (C), read both versions, merge intelligently (keep local customizations, add new upstream content), and show the merged result for approval before writing.

### Unchanged
Don't list these individually, just note:
> [N] files unchanged — your vault is current.

## Step 4: Apply Approved Changes

For each change the user approved:
1. Read the vault file to preserve any local frontmatter fields
2. Replace the content body with the new/merged content
3. Update `content-version` in frontmatter to match the plugin's `content-version` date for that group. Remove `counsel-os-version` if present (pre-migration field).
4. Write the file

For new files:
1. Copy from plugin seed to vault
2. Frontmatter should already contain `counsel-os-type` and `content-version` from the plugin seed
3. Write the file

## Step 5: Check Practice Impact

After syncing, check whether any updated defaults affect the user's practice:

### Position impact
For each updated section in `{legal_root}/defaults/positions.md`:
1. Check if `{legal_root}/practice/positions.md` has an override for this clause type
2. If the default changed underneath an existing override, flag it:
> **Heads up:** The default for [clause type] changed. Your practice override still applies, but you may want to review it against the new baseline.

### Law constraint impact
For each updated law area:
1. Check if any practice positions now conflict with new requirements
2. Flag urgently if so:
> **Action needed:** Updated [law area] introduces new requirements that affect your [clause type] position. Review before your next matter in this area.

## Step 6: Version Control Check

Check if `{legal_root}` is a git repo:

```bash
git -C {legal_root} rev-parse --is-inside-work-tree 2>/dev/null
```

### If NOT a git repo:

This is an existing user who set up before version control was available. Offer it once:

> **New in v0.4.0:** You can now version-control your legal knowledge base. This tracks changes to your positions, counterparty files, and decision history — so you can see how your practice evolves over time.
>
> Want me to set it up? (This initializes a git repo in your legal root. Optionally connects to a private GitHub repo for backup.)

If yes, follow the same flow as `/setup` Step 9 (git init, .gitignore, initial commit, optional remote).

If no, skip. Don't ask again on future updates.

### If already a git repo:

If content was synced in Steps 2-4, commit the changes:

```bash
cd {legal_root}
git add -A
git commit -m "Update: synced law/ and defaults/ to plugin v{new_version}"
```

If remote exists, offer to push.

## Step 7: Summary

```
## Update Complete

**Plugin:** v{old} → v{new} [or "already current"]
**Content synced:** [N] files updated, [N] new files added, [N] skipped

### Changes Applied
- law/data-privacy.md — updated
- law/new-area.md — added (new)
- defaults/positions.md — updated

### Skipped
- law/financial-services.md — kept your local version

### Practice Impact
- [N] practice positions to review (see above)
- [N] law constraint changes to be aware of
- [or] No practice impact — all updates are backward compatible

### Next Steps
1. [Review practice position X against updated default]
2. [or] No action needed — you're current
```
