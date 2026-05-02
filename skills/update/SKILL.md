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

- **Claude Desktop / Cowork marketplace:** tell the user to update/reinstall the plugin through the plugin marketplace, then start a new conversation.
- **Claude Code marketplace:** tell the user to update/reinstall through Claude's plugin installer and fully restart Claude Code if the old manifest remains cached.
- **Claude Code local clone:** if shell access is available and the plugin root is a git repo, run:

  ```bash
  git -C {plugin_root} fetch origin
  git -C {plugin_root} merge --ff-only origin/main
  ```

If the local clone has uncommitted changes or a non-fast-forward update is needed, stop and explain the situation. Do not merge through conflicts inside the update skill.

After updating methodology, tell the user whether a restart is needed. In most plugin runtimes, changed skill files load reliably only in a new conversation or after restarting the host.

## Step 4: Compare Vault Content

Compare the plugin's shipped content to the user's vault.

### Law areas: plugin-managed

Compare `knowledge/law/` in the plugin root against `{legal_root}/law/`.

For each law area:
1. Read the plugin file's `content-version`.
2. Read the vault file's `content-version`.
3. If the vault file is missing, classify as **new law content**.
4. If the plugin version is newer, classify as **upstream law update**.
5. If versions match, skip.

Law areas are plugin-managed, so these are safe to apply after user approval.

### Practice seed: user-owned

Compare `knowledge/practice-seed/` in the plugin root against `{legal_root}/practice/`.

Practice files are user-owned. Never overwrite them blindly.

For each seed file:
1. If the vault file is missing, offer it as **new practice content**.
2. If the vault file exists, compare content while preserving the user's `## Our Position` section where applicable.
3. If the seed has new reference guidance, offer a reviewable merge.

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

Ask what to apply. Apply law updates only after approval. Apply practice suggestions only after showing exactly what will change.

## Step 6: Apply Approved Changes

For approved law updates:
1. Copy the plugin law file or directory into `{legal_root}/law/`.
2. Preserve no local edits unless the user explicitly says they customized law content and wants a merge.

For approved practice updates:
1. Preserve user-owned sections, especially `## Our Position`.
2. Update reference sections from the seed.
3. Write only the approved files.

For new practice files:
1. Copy from `knowledge/practice-seed/`.
2. Explain that the user can edit them directly later.

## Step 7: Check Impact

After applying law updates, check whether any updated law constraints affect the user's standards in `{legal_root}/practice/standards/`.

Flag conflicts clearly:

```markdown
Action needed: updated data-privacy law guidance affects practice/standards/data-protection.md. Review breach notification timing before the next DPA.
```

## Step 8: Version Control

If `{legal_root}` is a git repo and changes were applied, offer to commit:

```bash
git -C {legal_root} add -A
git -C {legal_root} commit -m "Update Counsel OS law and practice content"
```

If it is not a git repo, mention that version control is available but do not push it. The user can ask `/counsel-os:setup` to configure it.

## Step 9: Summary

End with:

```markdown
## Update Complete

Plugin methodology: [current/updated/restart needed]
Config migration: [not needed/migrated/user action needed]
Vault content: [N] law files updated, [N] practice files added/merged, [N] skipped
Next steps: [specific review items or "none"]
```
