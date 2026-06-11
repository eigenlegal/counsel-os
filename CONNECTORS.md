# Connectors

Counsel OS ships no MCP servers and no connector configuration — its `.mcp.json` is empty, and there is no placeholder or customization system. The plugin uses whatever tools are connected in your Claude session, detected at runtime.

Three integrations matter in practice:

## Content index (QMD) — recommended

[QMD](https://github.com/tobi/qmd) is a local content-index MCP server, installed separately as its own Claude plugin (works in Claude Code and Cowork). When it's connected, every knowledge-base search — entity lookup, matter discovery, related-precedent search — goes through the index, and entity files are discovered anywhere in your vault by `counsel-os-type` frontmatter instead of a fixed directory layout. Any MCP server exposing an equivalent `query` tool over markdown frontmatter works the same way.

Without an index, Counsel OS falls back to filesystem search: entity files must live under `{legal_root}/entities/` and matters under `{legal_root}/matters/`.

Detection is per-session and automatic — there is no configuration setting. See "Knowledge Base Search" in `skills/counsel/SKILL.md` for the exact procedure.

## Other connected MCP servers

If your session has other tools connected — cloud storage, chat, email, project trackers — Counsel OS can use them opportunistically when a task calls for it (pulling a contract from a connected drive, posting a summary to a channel), the same way any Claude session uses connected tools. Nothing is required, pre-configured, or assumed.

## The browse skill

For web portals that need a real browser — data rooms, e-signature platforms, government filing sites — `/counsel-os:browse` runs a local headless Chromium (Claude Code only). This is a bundled skill, not a connector. See `skills/browse/SKILL.md`.
