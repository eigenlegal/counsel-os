---
name: update
description: "Pull latest plugin and sync content updates to your vault. One command handles everything."
---

# Update — Pull Plugin + Sync Content

This skill handles both plugin updates (methodology) and content syncing (law areas and practice seed content) in one step. Run periodically to stay current.


## Step 0: Resolve Paths

Read `config.local.md` (if it exists) or `config.md` from the plugin root to get:

- **Legal root** (`{legal_root}`) — contains law/, practice/, matters/, memory/
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

Compare content from two sources:

### Law areas (plugin-managed, safe to overwrite)
Compare `knowledge/law/` against `{legal_root}/law/`. Law areas are plugin-managed — users don't customize them.

For each law area:
1. Read the plugin's `content-version` date from the area's files
2. Read the vault's `content-version` date from the corresponding files
3. If dates match → skip (unchanged)
4. If dates differ or vault file is missing → classify as **upstream updated** or **new**

### Practice seed content (user-owned, suggest only)
Compare `knowledge/practice-seed/` against `{legal_root}/practice/` (standards/, methods/, library/). Practice content is user-owned — never overwrite without asking.

For each file in the seed:
1. If the file doesn't exist in the vault → offer as **new content**: "New standard/method/clause available. Add to your practice?"
2. If the file exists → compare content (ignoring frontmatter). If the seed has new sections or updated guidance, offer as a **suggestion**: "The market guidance for [topic] has been updated. Want to review the changes?"
3. Never auto-overwrite practice files — always ask.

## Step 3: Present Changes

Show the user what's different, organized by action needed:

### New law areas
```
New law areas available:
- law/new-area/ — [brief description of what it covers]
```
For each, ask: "Add this to your vault?" Law areas are plugin-managed, so these are safe to add.

### Updated law areas
```
Updated upstream (safe to apply):
- law/data-privacy/ — [summary of what changed]
```
For each, ask: "Apply this update?" Then overwrite the vault copy.

### New practice content (suggestions)
```
New practice content available:
- practice/standards/new-topic.md — [brief description]
- practice/methods/new-method.md — [brief description]
```
For each, ask: "Add this to your practice?" Copy from seed to vault.

### Updated practice seed (suggestions only)
```
Updated guidance available for:
- practice/standards/data-protection.md — [summary: updated classification guide for new regulations]
```
For each, show what changed in the seed and ask: "Want to review the updated guidance? Your position is preserved — only the reference sections (Classification Guide, Practical Guidance, etc.) have changed."

If the user wants to apply, merge carefully: preserve their `## Our Position` section, update the reference sections.

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

## Step 5: Check Law Impact on Practice

After syncing law areas, check whether any updates affect the user's practice:

### Law constraint impact
For each updated law area:
1. Check if any positions in `{legal_root}/practice/standards/` now conflict with new requirements
2. Flag urgently if so:
> **Action needed:** Updated [law area] introduces new requirements that affect your [clause type] position in practice/standards/. Review before your next matter in this area.

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

If yes, follow the same flow as `/setup` Step 6 (git init, .gitignore, initial commit, optional remote).

If no, skip. Don't ask again on future updates.

### If already a git repo:

If content was synced in Steps 2-4, commit the changes:

```bash
cd {legal_root}
git add -A
git commit -m "Update: synced law/ and practice/ to plugin v{new_version}"
```

If remote exists, offer to push.

## Step 7: Summary

```
## Update Complete

**Plugin:** v{old} → v{new} [or "already current"]
**Content synced:** [N] files updated, [N] new files added, [N] skipped

### Changes Applied
- law/data-privacy/ — updated
- law/new-area/ — added (new)
- practice/standards/new-topic.md — added (new)

### Skipped
- practice/standards/data-protection.md — user declined update

### Law Impact
- [N] law constraint changes to review against your practice
- [or] No law impact — all updates are backward compatible

### Next Steps
1. [Review practice/standards/X against updated law requirements]
2. [or] No action needed — you're current
```
