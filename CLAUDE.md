# Counsel OS — Developer Guide

This is the source repo for the Counsel OS plugin for Claude Code. It provides a primitives-based legal practice system.

## Architecture

5 primitives (read, research, evaluate, draft, remember) composed dynamically by the LLM based on user intent. No pipeline. The `/counsel-os:counsel` skill auto-invokes for legal work and contains the full orchestrator. See `docs/architecture/direction.md` for the design.

## Repository layout

```
primitives/          — The 5 instruction files the LLM follows
skills/              — Plugin skills (counsel, browse, retro, setup, update)
knowledge/law/       — 26 law area reference files (plugin-managed)
knowledge/practice-seed/  — Starting content seeded to user vaults
scripts/             — Automation (apply_redlines, clean_format, word_compare)
docs/                — Architecture documentation
templates/memory/    — Seed template for patterns.md
```

## Key files

- `skills/counsel/SKILL.md` — The main entry point. Contains primitive index, intent routing, 4-layer knowledge system, matter management. This is what loads when the plugin activates.
- `primitives/*.md` — Detailed instructions for each primitive, structured by mode.
- `knowledge/practice-seed/methods/` — Reference guides (not playbooks). Coverage checklists for different work types.
- `knowledge/practice-seed/standards/` — 24 position files with Our Position + Classification Guide.
- `config.md` (plugin) — documentation of the path-resolution model. Per-user config lives in the user's vault at `{legal_root}/config.md` (written by setup, discovered each session via the bootstrap procedure in `skills/counsel/SKILL.md`).

## Making changes

- **Primitives**: Edit `primitives/{name}.md`. These are the core instructions. Changes here affect all legal work.
- **Positions/methods/library**: Edit in `knowledge/practice-seed/`. Users get these via `/counsel-os:setup` (initial) and `/counsel-os:update` (sync). Practice content is user-owned — update offers suggestions, never overwrites.
- **Law areas**: Edit in `knowledge/law/`. These are plugin-managed — update overwrites the user's copies.
- **Scripts**: Python/bash in `scripts/`. Test locally before pushing.
- **Version**: Bump in VERSION, package.json, and .claude-plugin/plugin.json (all three).

## Testing

Install locally with `--plugin-dir .` or sync to the plugin cache at `~/.claude/plugins/cache/{marketplace}/counsel-os/{version}/` (marketplace is `eigenlegal` for the published plugin, or `jack-plugins` for local dev). Restart Claude Code after cache changes.

Test from a directory OTHER than this repo to verify the counsel skill activates via the plugin system (not project-level CLAUDE.md).
