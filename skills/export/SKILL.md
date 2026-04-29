---
name: export
description: "Package the plugin as a zip for Cowork (Claude Desktop). Excludes seed content — only methodology, templates, and config."
---

# Export — Package for Cowork

Create a zip of the plugin for uploading to Claude Desktop's Cowork mode.

## What to do

**Important:** Run the export script from the **source repo** (e.g., `~/Desktop/counsel-os/`), not from the plugin cache. Running from the cache may package an incomplete or version-specific snapshot.

The script zips the plugin contents at the archive root (matching Anthropic's official `cowork-plugin-customizer` recipe — Cowork expects `.claude-plugin/plugin.json` at the zip root, not nested inside a wrapper directory).

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

This creates `counsel-os-plugin.zip` in the parent directory of the source repo.

**Cowork direct-upload status (April 2026):** Direct upload to Cowork is currently broken on Anthropic's side — see open issues [#40414](https://github.com/anthropics/claude-code/issues/40414) (`.plugin` extension rejected) and [#40772](https://github.com/anthropics/claude-code/issues/40772) (both `.zip` and `.plugin` fail). The supported install path is **marketplace add**: in Cowork → Customize → Plugins, paste `https://github.com/eigenlegal/counsel-os` as a marketplace source. The export zip is still useful for offline/air-gapped distribution. The zip includes only what Cowork needs:
- Skills (methodology)
- Primitives
- Templates
- Browse tooling
- `config.md` (plugin documentation; per-user config lives in the user's vault, not in the plugin)
- Plugin manifest, top-level scripts, knowledge seed content

Report the output path and file size to the user. Remind them:
> Upload this to Claude Desktop → Cowork → Customize → Browse plugins.
> If you have an old version installed, remove it first.
