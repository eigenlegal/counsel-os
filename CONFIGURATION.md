# Counsel OS — Configuration Model

This file is documentation, not configuration. The plugin doesn't carry per-user
values; it describes how Counsel OS resolves paths and detects capabilities at
runtime.

This file is intentionally named `CONFIGURATION.md`, not `config.md`, so it can
never be mistaken for a user's Counsel OS configuration.

## Per-user config lives in the user's vault

After running `/counsel-os:setup`, the user's configuration lives in a marked
file at the top of their legal root:

```
{legal_root}/config.md
```

That file is created by setup, editable by the user, and travels with the vault
(via sync, git, machine swap). The plugin tree itself is never written to —
which keeps Counsel OS fully functional in runtimes where the plugin tree is
read-only (e.g. Cowork).

## Finding the legal root

Each session, the counsel skill discovers `legal_root` by looking for a
`config.md` file containing both `counsel-os-config: true` and a `legal_root:`
line. If no marked candidate is found, it asks the user. The full procedure is
in `skills/counsel/SKILL.md` ("Finding the Legal Root").

## What goes in `{legal_root}/config.md`

Required (these two markers are what discovery validates):

```markdown
counsel-os-config: true
legal_root: /full/path/to/legal/root
```

Recommended (informational — not checked by discovery):

```markdown
config_version: 1
```

Optional overrides (defaults shown):

```markdown
entities_path: entities
matters_path: matters
auto_apply_law_updates: false
law_management: plugin
default_locality: any
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect, matter]
```

`auto_apply_law_updates: true` lets `/counsel-os:update` apply plugin-managed law
content without per-area approval (one-time consent instead of every-update
prompts). Practice content always requires approval regardless of this flag.

`law_management: user` makes the ENTIRE law library user-owned: update stops
syncing law content entirely, and `/counsel-os:law-refresh` maintains it instead.
For per-file ownership, set `managed-by: user` in an individual law file's
frontmatter — update skips marked files (even under auto-apply) and law-refresh
maintains them. Custom law areas the user creates are user-owned automatically.

`default_locality: local` keeps every matter on this machine: a step for any
matter runs only on a local model (Ollama, LM Studio, another loopback
server), never on a cloud provider. A matter opts out with `stays_local: false`
in its frontmatter, and any matter can opt in alone with `stays_local: true`
(a folder matter's `matter.md` governs everything in its folder). The policy is
decided before the first model call — from the conversation's linked matter,
else a matter document attached to the message, else this default — and is
never downgraded silently: with no local model loaded the step does not run
and the app says so.

## Documents in matters

A matter's documents live beside it. A matter that is its own folder
(`{matters_path}/acme/matter.md`) keeps its Word documents in that folder; a
flat matter file (`{matters_path}/acme.md`) gets a folder named after it
(`{matters_path}/acme/`) the first time a document is added.

A document added with no matter chosen — dropped on Home's ask box, say —
lands in **`{matters_path}/inbox/`**. The inbox is a holding folder, not a
matter: nothing reads it as one, and the runtime offers "move to a matter"
right after the drop. Uploaded files are never overwritten; a second
`nda.docx` in the same folder becomes `nda-2.docx`. Only Word documents
(`.docx`) can be added this way for now; the size limit is 25 MB.

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
