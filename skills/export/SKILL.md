---
name: export
description: "Package the plugin as a zip for Cowork (Claude Desktop). Excludes seed content — only methodology, templates, and config."
---

# Export — Package for Cowork

Create a zip of the plugin for uploading to Claude Desktop's Cowork mode.

## What to do

**Important:** Run the export script from the **source repo** (e.g., `~/Desktop/counsel-os/`), not from the plugin cache. The script uses the directory name as the zip's root folder — running from the cache produces a folder named `0.3.2/` instead of `counsel-os/`, which breaks Cowork.

Find the source repo and run:

```bash
# Find the source repo
SOURCE_DIR=""
for dir in "$HOME/Desktop/counsel-os" "$HOME/counsel-os" "$HOME/dev/counsel-os" "$HOME/src/counsel-os"; do
  if [ -f "$dir/export" ]; then SOURCE_DIR="$dir"; break; fi
done

# Run export from source
cd "$SOURCE_DIR" && ./export
```

This creates `counsel-os-plugin.zip` in the parent directory of the source repo. The zip includes only what Cowork needs:
- Skills (methodology)
- Templates
- Browse tooling
- CLAUDE.md, config.local.md, config.md
- Top-level scripts and metadata

It excludes `knowledge/` (seed content — 170+ files that live in the vault, not the plugin).

Report the output path and file size to the user. Remind them:
> Upload this to Claude Desktop → Cowork → Customize → Browse plugins.
> If you have an old version installed, remove it first.
