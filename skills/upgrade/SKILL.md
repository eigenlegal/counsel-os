---
name: upgrade
description: "Upgrade Counsel OS to the latest version. Backs up your practice data, pulls latest product content, rebuilds browse binary if needed, and shows what changed."
---

# Upgrade Counsel OS

Upgrade to the latest version of Counsel OS. This backs up your data, pulls new product content, and shows what changed.

Works in two modes:
1. **Git repo** (development install) — `git pull` directly
2. **Plugin cache** (installed via registry) — finds the git source repo, pulls there, then syncs product content into the cache without touching user data

## Step 1: Find the Install

Find the Counsel OS directory. Check both the plugin cache and direct install locations:

```bash
# Check plugin cache first (most common for installed users)
CACHE_DIR="$(find "$HOME/.claude/plugins/cache" -path "*/counsel-os/*/VERSION" -exec dirname {} \; 2>/dev/null | head -1)"

# Then check common direct install locations
for dir in \
  "$HOME/Desktop/counsel-os" \
  "$HOME/counsel-os" \
  "$HOME/.claude/plugins/counsel-os"; do
  if [ -f "$dir/VERSION" ]; then
    DIRECT_DIR="$dir"
    break
  fi
done
```

Set `COUNSEL_DIR` to the found path. Prefer the plugin cache path if it exists (that's what Claude Code loads from). If not found, ask the user.

## Step 2: Run the Update Script

The `update` script handles both git-repo and plugin-cache modes automatically:

```bash
"$COUNSEL_DIR/update"
```

The script will:
- Detect whether it's in a git repo or plugin cache
- If git repo: `git fetch && git merge origin/main`
- If plugin cache: find the git source repo, pull there, then rsync product content (skills, knowledge/defaults, knowledge/law, templates, top-level files) into the cache
- Show what changed

User data lives in the Obsidian vault at `/Users/jackwang/Documents/Obsidian Vault/Counsel OS/` and is not affected by product updates.

If the script can't find the source repo in plugin-cache mode, it will print instructions for creating a `.source-repo` file pointing to the git clone.

## Step 3: Rebuild Browse Binary (if applicable)

If the browse source changed and Bun is installed:

```bash
if command -v bun &>/dev/null && [ -d "$COUNSEL_DIR/browse/src" ]; then
  cd "$COUNSEL_DIR" && bun install && bun run build
  echo "Browse binary rebuilt."
else
  echo "Browse binary not rebuilt (bun not installed or no source)."
fi
```

## Step 4: Verify User Content

After the update, verify user data in the Obsidian vault is intact:

```bash
USER_DATA="/Users/jackwang/Documents/Obsidian Vault/Counsel OS"
for dir in practice matters memory; do
  if [ -d "$USER_DATA/$dir" ]; then
    file_count=$(find "$USER_DATA/$dir" -type f ! -name '.gitkeep' | wc -l | tr -d ' ')
    echo "$dir/ — $file_count files"
  else
    echo "$dir/ — MISSING"
  fi
done
```

User data should not be affected by product updates (it lives outside the plugin cache). If anything is missing, restore from backup:

```bash
"$COUNSEL_DIR/restore"
```

## Step 5: Report

Tell the user:
- What version they're now on
- What changed (summary)
- That their practice data in the Obsidian vault is unaffected
- Whether the update ran in git-repo or plugin-cache mode
- Any action needed (e.g., "New position file added — run `/counsel-os:setup` to review")
