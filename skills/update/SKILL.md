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

This updates the plugin's methodology — skills, primitives, scripts. Your vault content is not touched.

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
> - Primitives: [list any changed primitive files]
> - Scripts: [list any changed scripts]

If already up to date:
> Plugin is current (v{version}). Checking content sync...

### Sync plugin cache (if version changed)

If the version changed, update the Claude Code plugin cache so skills load from the new version:

```bash
# Find the cache directory — works for any marketplace name (eigen-legal, jack-plugins, etc.)
CACHE_BASE=$(ls -d "$HOME/.claude/plugins/cache/"*/counsel-os 2>/dev/null | head -1)

if [ -z "$CACHE_BASE" ]; then
  echo "Plugin cache not found — skill may be running outside a plugin install. Skipping cache sync."
else
  # Remove old version caches
  for dir in "$CACHE_BASE"/*/; do
    version=$(basename "$dir")
    if [ "$version" != "$NEW_VERSION" ]; then
      rm -rf "$dir"
    fi
  done

  # Copy current plugin to new versioned cache
  mkdir -p "$CACHE_BASE/$NEW_VERSION"
  cp -R {plugin_root}/* "$CACHE_BASE/$NEW_VERSION/"
fi
```

Then update `~/.claude/plugins/installed_plugins.json` — find the `counsel-os@*` entry (marketplace name varies: `eigen-legal` for end users, `jack-plugins` for the maintainer) and set:
- `installPath` → the new cache path
- `version` → the new version
- `lastUpdated` → today's date

Tell the user:
> Plugin cache updated to v{new}. Restart Claude Code to load the new skills.

## Step 1b: Migrate from v0.5.x → v0.6.1 (one-time)

Check if the vault has the old structure. If ALL of these are true, run the migration:
- `{legal_root}/defaults/` exists
- `{legal_root}/practice/standards/` does NOT exist

If migration is not needed (already on the new structure), skip to Step 2.

### Migration overview

Tell the user:
> Your vault uses the old 5-layer structure (defaults/ + separate practice files). v0.6.1 consolidates everything into practice/. I'll migrate your vault now — your customizations are preserved.

### 1b-a. Consolidate practice profile

Read these files and merge into a single `{legal_root}/practice/profile.md`:
- `{legal_root}/practice/identity.md` → `## Identity` section
- `{legal_root}/practice/principles.md` → `## Principles` section
- `{legal_root}/practice/voice.md` → `## Voice` section
- `{legal_root}/practice/thresholds.md` → `## Escalation Thresholds` section

Write the merged file with frontmatter:
```yaml
---
counsel-os-type: practice
---
```

Keep the old files until the user confirms the migration looks good.

### 1b-b. Seed practice/standards/ from defaults/positions/

Copy every file from `{legal_root}/defaults/positions/` → `{legal_root}/practice/standards/`. These become user-owned.

Update frontmatter in each: `counsel-os-type: default-positions` → `counsel-os-type: practice`.

### 1b-c. Merge user position overrides into standards/

Read `{legal_root}/practice/positions.md` (the old override file). For each `## Clause Type` section that has real content (not just `[TO BE DEVELOPED]` placeholders):

1. Find the matching file in `{legal_root}/practice/standards/` by clause type name
2. If the standards file has an `## Our Position` section, replace it with the user's override content
3. If not, add `## Our Position` at the top (after the title) with the user's content

Format the merged section:
```markdown
## Our Position
**Our standard:** [from user's positions.md]
**We'll accept:** [from user's positions.md]
**We won't accept:** [from user's positions.md]
**Auto-escalate:** [from user's positions.md]

[Any additional notes the user had under this clause type]
```

### 1b-d. Seed practice/methods/ from defaults/playbooks/ + defaults/checklists/

Copy playbook files from `{legal_root}/defaults/playbooks/` → `{legal_root}/practice/methods/`.

For checklists:
- If a checklist matches a playbook name (contract-review, due-diligence, vendor-onboarding), append the checklist content to the corresponding method file with a `---` separator
- If a checklist has no matching playbook, copy it as a standalone file to `{legal_root}/practice/methods/`

Update frontmatter in all: `counsel-os-type: playbook` or `counsel-os-type: checklist` → `counsel-os-type: practice`.

### 1b-e. Seed practice/library/ from defaults/clause-library/

Copy `{legal_root}/defaults/clause-library/` → `{legal_root}/practice/library/`.

Update frontmatter: `counsel-os-type: clause-library` → `counsel-os-type: practice`.

### 1b-f. Create matters/ directory

```bash
mkdir -p "{legal_root}/matters"
```

### 1b-g. Report and confirm

Show the user a summary:
```
## Migration Complete (v0.5.x → v0.6.1)

Practice profile:
- [x] profile.md created — consolidated from identity.md, principles.md, voice.md, thresholds.md

Standards (practice/standards/):
- [x] {N} position files migrated from defaults/positions/
- [x] {M} user overrides merged from practice/positions.md

Methods (practice/methods/):
- [x] {N} playbook files migrated
- [x] {M} checklists merged or added

Library (practice/library/):
- [x] {N} clause library files migrated

Old files preserved:
- defaults/ — still exists (will be removed after confirmation)
- practice/identity.md, principles.md, voice.md, thresholds.md, positions.md — still exist
```

Ask: "Everything look good? Can I remove the old defaults/ directory and the old separate practice files?"

If yes:
```bash
rm -rf "{legal_root}/defaults"
rm "{legal_root}/practice/identity.md" "{legal_root}/practice/principles.md" "{legal_root}/practice/voice.md" "{legal_root}/practice/thresholds.md" "{legal_root}/practice/positions.md"
```

If no: keep everything, let the user fix issues manually.

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
