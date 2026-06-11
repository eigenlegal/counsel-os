# Counsel OS — Developer Guide

This is the source repo for the Counsel OS plugin for Claude Code. It provides a primitives-based legal practice system.

## Architecture

5 primitives (read, research, evaluate, draft, remember) composed dynamically by the LLM based on user intent. No pipeline. The `/counsel-os:counsel` skill auto-invokes for legal work and contains the full orchestrator. See `docs/architecture/direction.md` for the design.

## Repository layout

```
primitives/          — The 5 instruction files the LLM follows
skills/              — Plugin skills (counsel, browse, retro, setup, update, law-refresh)
knowledge/law/       — 26 law area reference files (plugin-managed)
knowledge/practice-seed/  — Starting content seeded to user vaults
scripts/             — Automation (redline pipeline: apply_redlines, word_compare, clean_format, extract_redlines; import_reference; resolve_legal_root; release/lint tooling)
docs/                — Architecture documentation
templates/memory/    — Seed template for patterns.md
```

## Key files

- `skills/counsel/SKILL.md` — The main entry point. Contains primitive index, intent routing, 4-layer knowledge system, matter management. This is what loads when the plugin activates.
- `primitives/*.md` — Detailed instructions for each primitive, structured by mode.
- `knowledge/practice-seed/methods/` — Reference guides (not playbooks). Coverage checklists for different work types.
- `knowledge/practice-seed/standards/` — 24 position files with Our Position + Classification Guide.
- `CONFIGURATION.md` (plugin) — documentation of the path-resolution model. Per-user config lives in the user's vault at `{legal_root}/config.md` and must contain `counsel-os-config: true` plus `legal_root:` (written by setup, discovered each session via the bootstrap procedure in `skills/counsel/SKILL.md`).

## Making changes

- **Primitives**: Edit `primitives/{name}.md`. These are the core instructions. Changes here affect all legal work.
- **Positions/methods/library**: Edit in `knowledge/practice-seed/`. Users get these via `/counsel-os:setup` (initial) and `/counsel-os:update` (sync). Practice content is user-owned — update offers suggestions, never overwrites.
- **Law areas**: Edit in `knowledge/law/`. These are plugin-managed — update overwrites the user's copies.
- **Scripts**: Python/bash in `scripts/`. Test locally before pushing.
- **Version / release**: Run `scripts/release.sh <X.Y.Z> -m "subject" [-b "body"]` — bumps all four manifests (VERSION, package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json), prepends the CHANGELOG entry, runs the knowledge lint + version-sync check, commits the working tree as one release commit, tags `vX.Y.Z` (fires the release-binaries workflow), and pushes commit + tag. `--no-tag` skips tagging.

## Testing

Install locally with `--plugin-dir .` or sync to the plugin cache at `~/.claude/plugins/cache/{marketplace}/counsel-os/{version}/` (marketplace is `eigenlegal` for the published plugin, or `jack-plugins` for local dev). Restart Claude Code after cache changes.

Test from a directory OTHER than this repo to verify the counsel skill activates via the plugin system (not project-level CLAUDE.md).

CI (`.github/workflows/ci.yml`) runs typecheck, bun tests, the eval scorer self-test, law frontmatter validation, the knowledge-conventions lint, and manifest version sync on every push and PR.

## GBrain Search Guidance (configured by /sync-gbrain)
<!-- gstack-gbrain-search-guidance:start -->

GBrain is set up and synced on this machine. The agent should prefer gbrain
over Grep when the question is semantic or when you don't know the exact
identifier yet.

**This worktree is pinned to a worktree-scoped code source** via the
`.gbrain-source` file in the repo root (kubectl-style context). Any
`gbrain code-def`, `code-refs`, `code-callers`, `code-callees`, or `query`
call from anywhere under this worktree routes to that source by default —
no `--source` flag needed. Conductor sibling worktrees of the same repo
each have their own pin and their own indexed pages, so semantic results
match the actual code on disk in this worktree.

Two indexed corpora available via the `gbrain` CLI:
- This worktree's code (auto-pinned via `.gbrain-source`).
- `~/.gstack/` curated memory (registered as `gstack-brain-<user>` source via
  the existing federation pipeline).

Prefer gbrain when:
- "Where is X handled?" / semantic intent, no exact string yet:
    `gbrain search "<terms>"` or `gbrain query "<question>"`
- "Where is symbol Y defined?" / symbol-based code questions:
    `gbrain code-def <symbol>` or `gbrain code-refs <symbol>`
- "What calls Y?" / "What does Y depend on?":
    `gbrain code-callers <symbol>` / `gbrain code-callees <symbol>`
- "What did we decide last time?" / past plans, retros, learnings:
    `gbrain search "<terms>" --source gstack-brain-<user>`

Grep is still right for known exact strings, regex, multiline patterns, and
file globs. Run `/sync-gbrain` after meaningful code changes; for ongoing
auto-sync across all worktrees, run `gbrain autopilot --install` once per
machine — gbrain's daemon handles incremental refresh on a schedule.

<!-- gstack-gbrain-search-guidance:end -->
