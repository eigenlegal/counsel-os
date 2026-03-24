---
name: upgrade
description: "Alias for /counsel-os:update — pull latest plugin, sync content to vault, rebuild browse binary."
---

# Upgrade

This is an alias for `/counsel-os:update`. Run that skill instead — it handles everything:

1. Pulls the latest plugin (skills, CLAUDE.md, scripts)
2. Compares seed content against your vault and walks you through syncing changes
3. Rebuilds the browse binary if bun is available and source changed
4. Checks for practice impacts

Just run `/counsel-os:update`.
