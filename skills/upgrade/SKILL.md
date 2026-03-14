---
name: upgrade
description: "Upgrade Counsel OS to the latest version. Backs up your practice data, pulls latest product content, rebuilds browse binary if needed, and shows what changed."
---

# Upgrade Counsel OS

Upgrade to the latest version of Counsel OS. This backs up your data, pulls new product content, and shows what changed.

## Step 1: Find the Install

Determine where Counsel OS is installed:

```bash
# Check common locations
for dir in \
  ".claude/plugins/counsel-os" \
  "$HOME/counsel-os" \
  "$HOME/Desktop/counsel-os" \
  "$HOME/.claude/plugins/counsel-os"; do
  if [ -f "$dir/VERSION" ]; then
    echo "FOUND: $dir"
    break
  fi
done
```

Set `COUNSEL_DIR` to the found path. If not found, ask the user where it's installed.

## Step 2: Show Current Version

```bash
cat "$COUNSEL_DIR/VERSION"
```

## Step 3: Back Up User Content

```bash
"$COUNSEL_DIR/backup"
```

This snapshots `knowledge/practice/`, `knowledge/matters/`, and `knowledge/memory/` with a timestamp. If the backup script reports "Nothing to back up," that's fine — the user hasn't set up yet.

## Step 4: Pull Latest

```bash
cd "$COUNSEL_DIR" && git fetch origin && git merge origin/main
```

If there are merge conflicts, stop and tell the user. Do not force-reset.

## Step 5: Show What Changed

```bash
# Compare versions
OLD_VERSION=$(cat "$COUNSEL_DIR/VERSION")
echo "Updated to: $OLD_VERSION"

# Show changed product content
cd "$COUNSEL_DIR" && git log --oneline ORIG_HEAD..HEAD
```

Summarize the changes for the user in plain language:
- New legal areas added
- Updated positions or playbooks
- New skills
- Bug fixes

## Step 6: Rebuild Browse Binary (if applicable)

If the browse source changed and Bun is installed:

```bash
if command -v bun &>/dev/null && [ -d "$COUNSEL_DIR/browse/src" ]; then
  cd "$COUNSEL_DIR" && bun install && bun run build
  echo "Browse binary rebuilt."
else
  echo "Browse binary not rebuilt (bun not installed or no source)."
fi
```

## Step 7: Verify and Restore User Content

After the pull, check whether user content is still intact:

```bash
for dir in practice matters memory; do
  if [ -d "$COUNSEL_DIR/knowledge/$dir" ]; then
    file_count=$(find "$COUNSEL_DIR/knowledge/$dir" -type f ! -name '.gitkeep' | wc -l | tr -d ' ')
    echo "knowledge/$dir/ — $file_count files"
  else
    echo "knowledge/$dir/ — MISSING"
  fi
done
```

If any user content directory is missing or empty (0 files, excluding .gitkeep), **restore from the backup created in Step 3**:

```bash
"$COUNSEL_DIR/restore"
```

This restores `knowledge/practice/`, `knowledge/matters/`, and `knowledge/memory/` from the backup taken before the upgrade. Tell the user what was restored.

If all directories are present and have files, confirm that user content was not modified — no restore needed.

## Step 8: Report

Tell the user:
- What version they're now on
- What changed (summary)
- That their practice data is safe (or was restored from backup)
- If a backup was created and where it is
- Any action needed (e.g., "New position file added for AI/ML clauses — run `/counsel-os:setup` to review")
