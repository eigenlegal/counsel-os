# Counsel OS — Configuration Model

This file is documentation, not configuration. The plugin doesn't carry per-user
values; it describes how Counsel OS resolves paths and detects capabilities at
runtime.

## Per-user config lives in the user's vault

After running `/counsel-os:setup`, the user's configuration lives in a file at
the top of their legal root:

```
{legal_root}/config.md
```

That file is created by setup, editable by the user, and travels with the vault
(via sync, git, machine swap). The plugin tree itself is never written to —
which keeps Counsel OS fully functional in runtimes where the plugin tree is
read-only (e.g. Cowork).

## Finding the legal root

Each session, the counsel skill discovers `legal_root` by looking for a
`config.md` file (containing a `legal_root:` line) near the user's working
location, then reading it. If no candidate is found, it asks the user. The full
procedure is in `skills/counsel/SKILL.md` ("Finding the Legal Root").

## What goes in `{legal_root}/config.md`

Required:

```markdown
legal_root: /full/path/to/legal/root
```

Optional overrides (defaults shown):

```markdown
entities_path: entities
matters_path: matters
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect, matter]
```

## Path resolution

Legal framework (`law/`, `practice/`, `memory/`) reads from `{legal_root}`.

Knowledge-base search (entity files, matters, past memos, related precedent)
is runtime-detected:

- If a content-index MCP tool is connected (e.g. [QMD](https://github.com/tobi/qmd)
  exposing `query` / `get` / `multi_get`), it's used to search the entire vault by
  frontmatter and content.
- Otherwise, search falls back to filesystem grep within
  `{legal_root}/{entities_path}/` and `{legal_root}/{matters_path}/`.

The choice is per-session, not per-install. See `skills/counsel/SKILL.md`
("Knowledge Base Search") for the full procedure.

## Plugin-internal constants

These aren't user-configurable; they're baked into the plugin:

- `practice_seed: knowledge/practice-seed` (relative to plugin root) — used by
  setup to seed `{legal_root}/practice/` and by update to surface new content.
