# Connectors

## How tool references work

Plugin files use `~~category` as a placeholder for whatever tool the user connects in that category. For example, `~~cloud storage` might mean Google Drive, Box, or any other storage provider with an MCP server.

Plugins are **tool-agnostic** — they describe workflows in terms of categories rather than specific products. The `.mcp.json` pre-configures specific MCP servers, but any MCP server in that category works.

## Connectors for this plugin

| Category | Placeholder | Recommended | Other options |
|----------|-------------|-------------|---------------|
| Chat | `~~chat` | — (use native connection) | Slack, Microsoft Teams |
| Cloud storage | `~~cloud storage` | — (use native connection) | Google Drive, Box, Dropbox, SharePoint |
| Office suite | `~~office suite` | — (use native connection) | Microsoft 365, Google Workspace |
| Content index | `~~content index` | [QMD](https://github.com/tobi/qmd) | Any MCP server exposing `query` over markdown frontmatter |

All connectors use whatever is natively connected in your environment (Claude Desktop, Claude Code, etc.) rather than plugin-managed MCP servers.

## How connectors are used

- **~~chat**: Receive contract review requests, post results and summaries to channels, notify stakeholders
- **~~cloud storage**: Access agreements stored in cloud drives, pull contracts for review, save outputs
- **~~office suite**: Read and edit Word documents for redlining, access email for context, calendar for deadlines
- **~~content index**: Discover counterparty, vendor, customer, prospect, and matter files anywhere in your vault by querying frontmatter (`counsel-os-type`) instead of relying on a fixed directory layout. Without it, Counsel OS falls back to filesystem grep under `{legal_root}/entities/` and `{legal_root}/matters/`.
