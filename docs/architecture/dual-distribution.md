# Counsel OS — Earlier dual-distribution proposal

> **Date:** 2026-09-04
>
> **Status:** Superseded on 2026-09-04 by [Standalone legal workspace](standalone-workspace.md).
>
> **Historical context only:** The body below records the earlier proposal and does not govern new implementation.

The revised direction prioritizes the standalone app, allows a smaller plugin feature set, and does not require a shared core or storage parity. The first milestone covers matters, knowledge, references, automatic recordkeeping, reviewed learning, and content updates across research/advice, compliance or investigation, and document work. Qualify one reference model configuration first; Ollama is deferred.

Use the [current architecture](standalone-workspace.md) and [implementation plan](../superpowers/plans/2026-09-04-standalone-workspace.md) for new work.

## Decision

Counsel OS is one legal-work engine with two distributions, not two independently developed products:

1. **Agent plugin** for Claude Code and Codex. The host supplies the model and conversational interface. The user's Markdown vault remains authoritative.
2. **Standalone app** for people who want to install Counsel OS and work through an opinionated matter-and-document interface. Structured application state is authoritative in SQLite; source documents and generated artifacts remain ordinary files.

The distributions share legal methodology, domain types, document tooling, migrations, and evaluation fixtures. They do not share a UI, provider setup, or physical persistence format.

## Product boundary

| Concern | Agent plugin | Standalone app |
|---|---|---|
| Host | Claude Code or Codex | Counsel OS runtime and UI |
| Inference | Host model | Direct model provider |
| Primary interaction | Conversation and skills | Matter/document workflow |
| Structured state | Markdown vault | SQLite |
| Source documents and exports | Files | Files referenced by SQLite |
| Credentials | Host/environment | OS credential store; database holds references only |

The four axes must remain independent:

- **Host:** Claude Code, Codex, standalone.
- **Inference provider:** Anthropic API, OpenAI API, or a supported local runtime.
- **Persistence adapter:** Markdown or SQLite.
- **Interface:** agent conversation or standalone UI.

A host is not an inference provider. In particular, `claude-sub` and `codex-sub` are compatibility harnesses in the current runtime; they are not the implementation of Claude Code or Codex plugin support.

## Shared core

The shared core owns:

- the five legal primitives and their orchestration;
- the law/practice/entity/memory precedence rules;
- matter, document, finding, proposal, decision, deadline, and artifact domain types;
- deterministic DOCX/PDF tooling;
- provider-neutral prompts and tool contracts;
- evaluations and golden workflow fixtures.

The shared core must not import React, HTTP routes, `node:fs`, `bun:sqlite`, an AI-provider SDK, or a host-specific plugin API. Those belong in adapters.

Conceptually:

```text
shared core
  domain + workflows + content + document engine + evals
      |
      +-- agent adapters
      |     +-- Claude Code package
      |     +-- Codex package
      |     +-- Markdown persistence
      |
      +-- standalone adapters
            +-- local HTTP/application service
            +-- SQLite persistence
            +-- Anthropic / OpenAI providers
            +-- Ollama preview
            +-- standalone UI
```

This is a dependency rule, not an instruction to move every file immediately. Boundaries are extracted as the first standalone workflow needs them.

## Standalone provider scope

The first supported standalone release deliberately has a small matrix:

- **Supported:** Anthropic API and OpenAI API.
- **Preview:** Ollama, because model-specific tool and structured-output behavior varies.
- **Not offered in the product UI:** subscription CLI harnesses, arbitrary OpenAI-compatible endpoints, aggregators, additional hosted vendors, and enterprise cloud deployments.

Existing v0.15 provider configurations remain readable during migration so an upgrade does not destroy a working setup. Hidden adapters receive compatibility fixes, not product-level support or UI investment. They can be removed only after an export or migration path exists.

There is no task router or model scoreboard in the first standalone workflow. One configured model answers until the basic review workflow is reliable. Capability-based routing can return later as an advanced feature backed by actual evaluation evidence.

## Standalone persistence

SQLite is authoritative for structured application state:

- workspaces and matters;
- documents and document versions;
- conversations and events;
- review runs and findings;
- proposals, decisions, and outcomes;
- deadlines and citations;
- provider accounts, endpoints, model deployments, and credential references;
- schema and content versions.

Original uploads and generated DOCX/PDF artifacts stay in a workspace file directory. The database records their relative path, content hash, media type, size, provenance, and relationships. Binary document bodies and credentials do not live in SQLite.

Shipped legal content remains authored as reviewable Markdown in this repository. The standalone build compiles it into a versioned content bundle and seeds or migrates SQLite from that bundle. This keeps one source for the plugin and app without making Markdown the standalone runtime database.

Each installation has one authoritative persistence adapter. There is no continuous Markdown/SQLite dual write. Interoperability is explicit:

- Markdown workspace → standalone import;
- standalone workspace → portable export;
- database migrations are forward-only and transactional;
- every import/export records the source format and schema version.

## Provider identity

The standalone provider model separates:

- `ProviderAccount`: one account or local installation;
- `Endpoint`: the exact API or local server address;
- `ModelDeployment`: the selectable remote model at that endpoint;
- `CredentialRef`: an opaque reference to the OS credential store;
- `Capabilities`: tools, structured output, vision, context, streaming, and locality.

Every request is routed by `ModelDeployment.id`. Credentials belong to one account or endpoint and must never be selected by vendor prefix alone.

## First vertical slice

The first standalone milestone is complete only when a new user can:

1. install and launch Counsel OS;
2. configure one supported provider;
3. create a matter;
4. add a DOCX;
5. run one full contract review;
6. inspect prioritized findings and proposed language;
7. approve and export a redline;
8. quit, reopen, and recover the matter, review, and decision from SQLite.

Anything that does not make that path more reliable is deferred. In particular: broad provider discovery, per-task routing, public benchmark browsing, retro analytics, and UI customization are not part of the slice.

## Implementation sequence

### 1. Establish compatibility baselines

- Treat v0.9.43 behavior as the plugin compatibility contract.
- Run the same core legal and document fixtures against the current plugin before extracting code.
- Add a Codex package from the same provider-neutral skills; do not fork the skill corpus.

### 2. Introduce persistence ports

- Define interfaces for conversations, matters, documents, outcomes, and runs.
- Keep current filesystem implementations as the Markdown/plugin adapters.
- Add SQLite implementations beside them and run shared contract tests against both.
- Do not switch existing installs yet.

### 3. Repair provider identity

- Replace vendor/model-string identity with account, endpoint, deployment, and credential-reference records.
- Migrate Anthropic and OpenAI first.
- Add Ollama as a preview adapter only after the same provider contract tests pass.
- Stop exposing the rest of the catalog in first-run and Settings while retaining read compatibility.

### 4. Switch new standalone workspaces to SQLite

- Create a versioned schema and migration runner.
- Import existing standalone Markdown/JSON/JSONL state once, with a dry-run report and backup.
- Leave plugin workspaces untouched.

### 5. Build the golden workflow UI

- Home: recent matters and one clear “review a document” action.
- Workspace: source document, findings/proposals, and assistant activity.
- Completion: approve, export, and retain the decision.
- Put provider diagnostics and experimental features behind an Advanced area.

### 6. Remove obsolete paths

Only after migration telemetry and fixtures demonstrate parity:

- remove unsupported provider dependencies from the packaged binary;
- retire compatibility harnesses from the standalone runtime;
- remove JSON/JSONL stores after their final supported importer ships;
- delete UI surfaces that do not serve the golden workflow.

## Release model

The plugin and standalone app are separate artifacts with independent versions and release notes. A shared-core/content schema version records compatibility between them. A release may update one distribution without forcing a release of the other.

## Invariants

1. A legal-methodology change is authored once and evaluated on both distributions.
2. No model/provider code imports a persistence implementation.
3. No UI component owns legal workflow rules.
4. One installation has one authoritative store.
5. Credentials are scoped to an account or endpoint, never a vendor name.
6. Existing data is never silently converted, dual-written, or deleted.
7. Unsupported providers are not advertised as working merely because an adapter remains in the tree.
