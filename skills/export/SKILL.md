---
name: export
description: "Package the plugin as a zip for Cowork (Claude Desktop). Excludes seed content — only methodology, templates, and config."
---

# Export — Package for Cowork

Create a zip of the plugin for uploading to Claude Desktop's Cowork mode.

## What to do

Run the export script:

```bash
./export
```

This creates `counsel-os-plugin.zip` in the parent directory of the plugin. The zip includes only what Cowork needs:
- Skills (methodology)
- Templates
- Browse tooling
- CLAUDE.md, config.local.md, config.md
- Top-level scripts and metadata

It excludes `knowledge/` (seed content — 170+ files that live in the vault, not the plugin).

Report the output path and file size to the user. Remind them:
> Upload this to Claude Desktop → Cowork → Customize → Browse plugins.
> If you have an old version installed, remove it first.
