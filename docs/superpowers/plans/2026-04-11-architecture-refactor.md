# Counsel OS Architecture Refactor Plan

> **Status:** Proposed  
> **Date:** 2026-04-11  
> **Scope:** Repository architecture, file-model normalization, skill/runtime consistency, migration safety, validation, and maintainability  
> **Primary constraint:** Preserve Markdown-first, human-readable, Obsidian-native content as the system of record

## Executive Summary

Counsel OS has a strong conceptual architecture but a weak operational one. The intended product model is clear:

- `law/` contains hard legal constraints
- `practice/` contains user-owned standards, methods, library, and profile
- `matters/` contains persistent engagement state
- `memory/` contains institutional learning
- `skills/` orchestrate workflows over that file model
- `browse/` and `scripts/` provide executable tooling

The main problem is not complexity. It is drift. The repository currently contains multiple overlapping representations of the product model:

- the current 4-layer knowledge model in `CLAUDE.md`
- legacy `practice/identity.md`, `practice/positions.md`, and `practice/thresholds.md`
- current `practice-seed/profile.md`, `practice/standards/`, `practice/methods/`, `practice/library/`
- stale references to `defaults/`
- skills that disagree about law area layout and practice file layout
- scripts that target old content roots

The refactor should not move the system into a database or hide content behind an opaque runtime. The right outcome is a stricter file-based architecture:

- Markdown remains the source of truth
- frontmatter plus headings remain the primary structure
- a small shared runtime layer becomes the canonical interpreter of the file model
- skills stop duplicating path and schema rules
- validation tooling prevents future drift

This plan proposes a staged refactor that preserves backward compatibility where necessary, isolates legacy support behind migrations, and introduces a single canonical schema for the entire repo.

## Goals

1. Preserve the Obsidian-native, Markdown-first architecture.
2. Establish a single canonical content model for all code, skills, scripts, and docs.
3. Eliminate active references to retired layouts such as `defaults/` and consolidated `law/<area>.md`.
4. Introduce a shared runtime layer for path resolution, schema validation, content manifests, and migration logic.
5. Keep setup, update, backup, and restore safe for user-owned vault content.
6. Add structural validation so future content-model drift is caught automatically.
7. Improve local subsystem design where it is materially weak, especially `browse` log persistence.

## Non-Goals

1. Replacing Markdown files with a database.
2. Removing user ownership over `practice/`, `matters/`, or `memory/`.
3. Converting the workflow engine into a large compiled application.
4. Rewriting the entire repo in one pass.
5. Eliminating compatibility for existing user vaults without a migration path.

## Current-State Assessment

### Architecture Strengths

1. The high-level product model is coherent.
2. The repository already separates workflow prompts, executable tooling, and content reasonably well.
3. The `browse` subsystem is conventionally structured and easier to maintain than the workflow layer.
4. The repo is file-centric and portable, which is exactly right for the domain.
5. The content footprint is transparent and inspectable by users.

### Architecture Weaknesses

1. The canonical schema exists only as prose, not as a machine-checked contract.
2. Skills duplicate path, stage, and layout assumptions in multiple places.
3. Legacy and current content models coexist in active code paths.
4. Setup, update, backup, restore, and analytics do not target the same data model consistently.
5. Content versioning does not cover all active content roots.
6. There is no structural validation suite for skills, content packs, or migrations.
7. The repository is partially organized by implementation history rather than clear product boundaries.

### Principal Failure Modes

1. One phase reads from `practice/profile.md`, another phase reads from `practice/positions.md`, and another phase assumes both.
2. One skill expects `law/<area>/_overview.md`, another expects a consolidated `law/<area>.md`.
3. Update tooling changes one content root but version tooling only tracks another.
4. Backup and restore protect some directories but not the actual current product shape.
5. A future schema change requires touching many prompt files manually, causing repeated drift.

## Target Architecture

### Core Principle

The primary system of record remains Markdown files in the user’s vault. Code does not replace this model. Code standardizes how the model is interpreted.

### Canonical Data Model

The target data model is:

```text
{legal_root}/
  law/
    <area>/
      _overview.md
      <topic>.md
  practice/
    profile.md
    standards/
      <clause-type>.md
    methods/
      <matter-type>.md
    library/
      <category>.md
  matters/
    <matter-id>.md
  memory/
    patterns.md
    retro-*.md

{entity files anywhere in vault}/
  <entity>.md
```

### Target Repository Layers

The repo should be treated as four explicit layers:

1. `content/`
   Product-shipped content packs and templates.
2. `workflow/`
   Prompt assets and workflow definitions.
3. `runtime/`
   Shared code for schema interpretation, validation, path resolution, migration helpers, and content manifests.
4. `ops/`
   Update, setup, backup, export, restore, and maintenance entrypoints.

The existing repo does not need to be physically renamed to those exact directories immediately, but the refactor should move toward those boundaries.

### Source-of-Truth Hierarchy

The source-of-truth order should become:

1. Canonical schema definition
2. Shared runtime modules implementing the schema
3. Validation rules and migration rules
4. Skills and shell scripts consuming the schema
5. Human-facing docs describing the schema

Today the order is effectively reversed in many places.

## Refactor Principles

### 1. Markdown First

All primary domain records remain Markdown:

- law content
- practice content
- matters
- memory
- entity files

No opaque binary state is introduced for core functionality.

### 2. Schema as Code

The file model must be represented in a machine-readable format and a small runtime library. Documentation alone is not enough.

### 3. Prompts Are Consumers, Not Owners

Skills should stop redefining the architecture. They should consume it.

### 4. Legacy Support Is an Adapter

Compatibility for old vaults is necessary but must be isolated behind migration code and validation warnings.

### 5. Structural Testing Over Unit Testing Bias

For this repo, schema tests and drift tests are more important than classic algorithmic unit tests.

### 6. Incremental Migration

The refactor should happen in stages with compatibility windows, not in a single large breaking change.

## Proposed Repository Changes

## Workstream A: Canonical Schema

### Objective

Create a single canonical representation of the Counsel OS file model and workflow metadata.

### Deliverables

1. `runtime/schema/content-model.ts`
2. `runtime/schema/content-model.json`
3. `runtime/schema/frontmatter.ts`
4. `runtime/schema/stages.ts`
5. `docs/architecture/content-model.md`

### Required Definitions

The schema should define:

- allowed content roots
- law area folder shape
- practice folder shape
- matter file stage enum
- supported entity file types
- required and optional frontmatter keys
- content-pack metadata
- migration compatibility versions

### Recommended Types

At minimum:

```ts
type KnowledgeRoot = "law" | "practice" | "matters" | "memory";

type EntityType =
  | "counterparty"
  | "vendor"
  | "customer"
  | "prospect"
  | "matter";

type MatterStage =
  | "intake"
  | "analyze"
  | "negotiate"
  | "deliver"
  | "closed";

type CounselOsFileType =
  | "law-area"
  | "practice"
  | "matter"
  | "memory-patterns"
  | "counterparty"
  | "vendor"
  | "customer"
  | "prospect";
```

### Required Invariants

1. Every law area must be a directory.
2. Every law area must contain `_overview.md`.
3. `practice/profile.md` is the canonical profile file.
4. `practice/standards/`, `practice/methods/`, and `practice/library/` are canonical.
5. `matters/` files must use the matter stage enum.
6. `memory/patterns.md` is canonical for cross-cutting practice memory.
7. Legacy files may exist, but they are compatibility inputs, not canonical active state.

## Workstream B: Shared Runtime Layer

### Objective

Move common file-model logic out of skills and ad hoc shell scripts into a small shared code layer.

### Deliverables

1. `runtime/config/resolve-config.ts`
2. `runtime/content/discover-law-areas.ts`
3. `runtime/content/discover-practice-files.ts`
4. `runtime/content/manifests.ts`
5. `runtime/matters/stage-machine.ts`
6. `runtime/migrations/detect-legacy-layout.ts`
7. `runtime/migrations/plan-migration.ts`
8. `runtime/validation/validate-vault.ts`

### Shared Capabilities

The runtime should provide:

- config loading with `config.local.md` override semantics
- current content layout detection
- legacy layout detection
- matter stage transition validation
- law area enumeration
- practice seed enumeration
- frontmatter parsing and normalization
- content manifest generation and comparison

### Why This Matters

Without this layer, each skill and script remains free to reinterpret the data model. That is the root cause of current drift.

## Workstream C: Content Packs and Manifests

### Objective

Treat shipped content as explicit versioned content packs instead of implicit folder trees.

### Deliverables

1. `content/law/manifest.json`
2. `content/practice-seed/manifest.json`
3. A manifest generator script
4. A manifest validation script

### Manifest Fields

Suggested fields:

- `pack_name`
- `pack_type`
- `schema_version`
- `content_version`
- `generated_at`
- `files`
- `compatibility`
- `description`

### Pack Types

1. `law`
2. `practice-seed`
3. optional future packs such as industry overlays or jurisdiction packs

### Benefits

1. Update tooling compares structured manifests instead of guessing from directories.
2. Setup can seed exact pack inventories.
3. Validation can assert pack completeness.
4. Version bump tooling can cover active content roots correctly.

## Workstream D: Skill Architecture Normalization

### Objective

Make skills consumers of the canonical model rather than parallel definitions of it.

### Deliverables

1. A shared skill fragment for path resolution and data model assumptions
2. Updated `skills/*/SKILL.md` files
3. A skill linter that rejects legacy path references in active skills

### Changes Required

1. Remove references to `defaults/` from active skills except migration-specific sections.
2. Remove references to `practice/positions.md`, `practice/identity.md`, `practice/thresholds.md` as current-state canonical files.
3. Normalize law area references to `law/<area>/_overview.md` plus topic files.
4. Normalize matter file discovery and stage handling.
5. Normalize update and setup language around `practice-seed`.

### Recommended Pattern

Each skill should have:

1. a minimal local phase-specific section
2. a common imported or generated section for:
   - path resolution
   - file layout assumptions
   - matter stage semantics
   - law area loading semantics
   - update/migration compatibility notes where relevant

### Enforcement

Add a validator that scans active skills for banned patterns:

- `defaults/`
- `knowledge/defaults`
- `practice/positions.md` as canonical source
- `practice/thresholds.md` as canonical source
- `law/<area>.md`

Migration-specific skills or sections can be exempted explicitly.

## Workstream E: Legacy Compatibility and Migration

### Objective

Preserve old vaults without allowing legacy layout to remain part of the active architecture indefinitely.

### Compatibility Policy

1. Detect legacy layouts automatically.
2. Provide a migration plan before writing changes.
3. Preserve old files during migration until user confirms.
4. Move legacy support into dedicated migration modules and migration-specific skill sections.
5. Stop active non-migration skills from relying on legacy files.

### Supported Legacy Inputs

1. `practice/identity.md`
2. `practice/principles.md`
3. `practice/voice.md`
4. `practice/thresholds.md`
5. `practice/positions.md`
6. `defaults/`

### Migration Deliverables

1. `runtime/migrations/v0_5_to_v0_6.ts`
2. `docs/migrations/v0.5-to-v0.6.md`
3. migration dry-run mode
4. migration report output

### Migration Behavior

1. Merge legacy profile fragments into `practice/profile.md`
2. Convert legacy position overrides into `practice/standards/*`
3. move or merge legacy defaults into the canonical structure where applicable
4. create `matters/` if missing
5. mark migrated vault schema version

### Migration Safety Rules

1. Never delete legacy files until the user confirms.
2. Always create a migration report.
3. Support dry-run output.
4. Backup should run before destructive migration steps.

## Workstream F: Setup, Update, Backup, Restore, Export

### Objective

Make operational scripts and skills align to the same current file model.

### Setup Refactor

Setup should:

1. resolve config
2. seed canonical content packs
3. detect legacy vault shape
4. migrate if needed
5. validate resulting structure
6. build optional runtime tooling
7. report exact seeded inventory

### Update Refactor

Update should split into two conceptual responsibilities:

1. product update
   - plugin code, skills, scripts, runtime
2. content sync
   - law packs
   - practice-seed recommendations

The implementation can still live behind one command, but the architecture should separate them.

### Backup Refactor

Backup should protect the actual current canonical model:

- `practice/`
- `memory/`
- `law/`
- `matters/`

Legacy-only paths should be included only when detected, and clearly labeled as legacy compatibility.

### Restore Refactor

Restore should:

1. understand canonical structure
2. restore `matters/` as first-class data
3. detect if restored content is legacy or canonical
4. run post-restore validation

### Export Refactor

Export should explicitly describe what is shipped:

- workflow layer
- runtime layer
- tooling layer
- content packs

It should also avoid shipping stale developer-only artifacts.

## Workstream G: Structural Validation Suite

### Objective

Add tests that validate architecture rather than only executable behavior.

### Deliverables

1. `scripts/validate_architecture.ts` or `.py`
2. `scripts/validate_skills.ts`
3. `scripts/validate_content_packs.ts`
4. `scripts/validate_vault_model.ts`
5. CI or local pre-release validation command

### Required Checks

#### Skill Checks

1. active skills do not reference banned legacy paths
2. stage names are valid
3. path examples match canonical layout
4. update/setup/migration instructions are internally consistent

#### Content Pack Checks

1. every law area has `_overview.md`
2. required frontmatter exists
3. `content-version` or pack-level manifest consistency is valid
4. practice-seed inventory is complete

#### Runtime Checks

1. stage transitions are valid
2. config resolution precedence works
3. migration detectors correctly classify sample vaults

#### Ops Checks

1. backup covers canonical paths
2. restore covers canonical paths
3. update targets active content roots

### Test Fixtures

Add fixtures for:

1. fresh canonical vault
2. legacy vault
3. partially migrated vault
4. malformed vault

## Workstream H: Browse Subsystem Improvements

### Objective

Preserve the existing modular design while fixing the most obvious maintenance and performance weakness.

### Current Strengths

1. thin CLI
2. persistent daemon model
3. separated browser lifecycle manager
4. clean command routing boundaries

### Current Weakness

Buffer flushing reads and rewrites whole log files on every interval.

### Required Changes

1. switch to append-only writes
2. introduce optional log rotation
3. separate persistence adapter from buffer flushing logic
4. add tests for large-log behavior if practical

### Optional Future Improvements

1. command registry abstraction
2. typed command definitions
3. request/response schema validation
4. pluggable persistence backends

These are secondary to the file-model refactor.

## Workstream I: Documentation Architecture

### Objective

Make docs reflect one model only.

### Deliverables

1. `docs/architecture/overview.md`
2. `docs/architecture/content-model.md`
3. `docs/architecture/runtime-model.md`
4. `docs/migrations/` docs
5. updates to `README.md` and `CLAUDE.md`

### Documentation Rules

1. `CLAUDE.md` describes behavior and precedence, not migration clutter.
2. `README.md` describes installation and user-facing workflow only.
3. architecture docs describe the canonical model.
4. migration docs describe old-to-new transitions.
5. historical specs remain historical and should be labeled as such.

## Recommended Directory Strategy

This can happen in one phase or multiple phases. A pragmatic target is:

```text
runtime/
  schema/
  config/
  content/
  matters/
  migrations/
  validation/

docs/
  architecture/
  migrations/
  superpowers/
    plans/
    specs/
```

The existing directories can remain during transition. The critical change is conceptual ownership and use, not immediate wholesale renaming.

## Canonical Frontmatter Proposal

### Law Area Files

```yaml
---
counsel-os-type: law-area
content-version: "YYYY-MM-DD"
law-area: data-privacy
topic: gdpr
schema-version: 1
---
```

### Practice Files

```yaml
---
counsel-os-type: practice
content-version: "YYYY-MM-DD"
practice-kind: standard
slug: limitation-of-liability
schema-version: 1
---
```

Possible `practice-kind` values:

- `profile`
- `standard`
- `method`
- `library`

### Matter Files

```yaml
---
counsel-os-type: matter
matter-id: matter-2026-001
stage: intake
type: contract-review
counterparty: Acme Corp
created: "2026-04-11"
updated: "2026-04-11"
schema-version: 1
---
```

### Memory Files

```yaml
---
counsel-os-type: memory-patterns
schema-version: 1
---
```

### Entity Files

```yaml
---
counsel-os-type: counterparty
entity-name: Acme Corp
schema-version: 1
---
```

## Phase Plan

## Phase 0: Freeze the Model

### Purpose

Stop further drift before broader refactoring.

### Tasks

- [ ] Declare the current canonical model explicitly in a new architecture doc
- [ ] Identify and list banned legacy references in active skills/scripts
- [ ] Mark migration-specific legacy references as allowed exceptions

### Exit Criteria

1. There is a written canonical model.
2. There is a list of known incompatible references.

## Phase 1: Add the Schema and Runtime Skeleton

### Tasks

- [ ] Create `runtime/schema/*`
- [ ] Create config and content discovery helpers
- [ ] Create frontmatter parser/validator
- [ ] Define matter stage machine

### Exit Criteria

1. Shared runtime can resolve current file layout without skills re-defining it.

## Phase 2: Normalize Content Packs

### Tasks

- [ ] Create law and practice-seed manifests
- [ ] update content-version tooling to target active content roots
- [ ] validate pack inventories

### Exit Criteria

1. Shipped content has explicit manifests.
2. Version tooling covers actual active packs.

## Phase 3: Refactor Active Skills

### Tasks

- [ ] Update intake
- [ ] Update analyze
- [ ] Update negotiate
- [ ] Update deliver
- [ ] Update close
- [ ] Update setup
- [ ] Update update
- [ ] Update retro

### Exit Criteria

1. No active skill relies on legacy paths for current-state behavior.
2. All active skills align to the same law and practice layout.

## Phase 4: Refactor Ops Layer

### Tasks

- [ ] Update setup flow
- [ ] Update update flow
- [ ] Update backup
- [ ] Update restore
- [ ] Update export

### Exit Criteria

1. All operational entrypoints target canonical paths.
2. Legacy behavior is isolated behind migration checks.

## Phase 5: Add Migration Runtime

### Tasks

- [ ] Implement legacy layout detection
- [ ] Implement dry-run migration reports
- [ ] implement reversible migration steps where practical
- [ ] document the migration flow

### Exit Criteria

1. A legacy vault can be analyzed and migrated safely.

## Phase 6: Add Validation Suite

### Tasks

- [ ] Add architecture validator
- [ ] Add skill validator
- [ ] Add content pack validator
- [ ] Add sample-vault fixtures

### Exit Criteria

1. Drift becomes test-detectable.

## Phase 7: Improve Browse Logging

### Tasks

- [ ] switch to append-only log writes
- [ ] add rotation or truncation policy
- [ ] isolate persistence concerns

### Exit Criteria

1. browse logs no longer incur repeated full-file rewrites.

## Phase 8: Documentation Cleanup

### Tasks

- [ ] update README
- [ ] update CLAUDE.md
- [ ] add architecture docs
- [ ] label or archive outdated historical assumptions

### Exit Criteria

1. Docs, code, and skills describe the same model.

## Detailed Execution Order

The safest execution order is:

1. write canonical architecture docs
2. create schema/runtime skeleton
3. build validation tooling
4. update content manifests/versioning
5. update active skills
6. update operational scripts
7. add migration logic
8. clean up legacy references and docs
9. optimize browse logging

This order minimizes the period where runtime and prompts diverge.

## Recommended File Changes

### New Files

- `runtime/schema/content-model.ts`
- `runtime/schema/content-model.json`
- `runtime/schema/frontmatter.ts`
- `runtime/schema/stages.ts`
- `runtime/config/resolve-config.ts`
- `runtime/content/discover-law-areas.ts`
- `runtime/content/discover-practice-files.ts`
- `runtime/content/manifests.ts`
- `runtime/matters/stage-machine.ts`
- `runtime/migrations/detect-legacy-layout.ts`
- `runtime/migrations/plan-migration.ts`
- `runtime/validation/validate-vault.ts`
- `docs/architecture/overview.md`
- `docs/architecture/content-model.md`
- `docs/architecture/runtime-model.md`
- `docs/migrations/v0.5-to-v0.6.md`
- `scripts/validate_architecture.ts`
- `scripts/validate_skills.ts`
- `scripts/validate_content_packs.ts`

### Existing Files to Refactor

- `README.md`
- `CLAUDE.md`
- `config.md`
- `skills/intake/SKILL.md`
- `skills/analyze/SKILL.md`
- `skills/negotiate/SKILL.md`
- `skills/deliver/SKILL.md`
- `skills/close/SKILL.md`
- `skills/setup/SKILL.md`
- `skills/update/SKILL.md`
- `skills/retro/SKILL.md`
- `scripts/bump_content_versions.py`
- `backup`
- `restore`
- `update`
- `export`
- `browse/src/server.ts`

## Acceptance Criteria

The architecture refactor is complete when all of the following are true:

1. There is a machine-readable canonical schema.
2. All active skills align to that schema.
3. Setup, update, backup, and restore target the same canonical structure.
4. Legacy support exists only in migration-specific logic.
5. Content pack versioning covers `law` and `practice-seed`.
6. Structural validators catch schema drift.
7. `README.md`, `CLAUDE.md`, and architecture docs describe the same file model.
8. The Obsidian-native Markdown-first workflow remains intact.

## Risks and Mitigations

### Risk: Breaking Existing Vaults

Mitigation:

- detect legacy layouts explicitly
- support dry-run migration
- preserve old files until confirmation
- require backup before destructive migration

### Risk: Prompt Regressions During Skill Updates

Mitigation:

- add skill validators before broad skill rewrites
- update one workflow phase at a time
- compare old vs new prompts for lost operational detail

### Risk: Over-Engineering the Runtime

Mitigation:

- keep runtime narrow
- use it only for canonical shared logic
- do not build a large application framework

### Risk: Content Authors Bypassing Schema

Mitigation:

- keep schema lightweight
- validate rather than over-constrain
- provide templates and manifest generators

### Risk: User Confusion During Transition

Mitigation:

- document canonical vs legacy clearly
- keep migration messaging explicit
- distinguish setup, update, and migrate responsibilities cleanly

## Open Design Questions

1. Should the schema be authored in TypeScript and emitted to JSON, or authored in JSON and wrapped in TypeScript types?
2. Should content manifests live alongside content roots or under a centralized `runtime/content/` directory?
3. Should skill shared fragments be generated at build time or maintained manually as includes?
4. Should `knowledge/practice/` remain as historical starter material, or be fully retired once `practice-seed/` is canonical?
5. Should `matters/` and `memory/` starter templates gain their own manifest support?

## Recommended Decisions

1. Author schema in TypeScript and emit JSON for tooling portability.
2. Keep manifests adjacent to content roots.
3. Start with manual shared fragments or templated generation only if needed.
4. Treat `knowledge/practice/` as legacy migration source, not active canonical seed content.
5. Keep matters and memory templates simple for now; add manifests later only if operationally useful.

## Immediate Next Steps

If this plan is approved, the first implementation tranche should be:

- [ ] Create the `runtime/schema` and `runtime/config` modules
- [ ] Write `docs/architecture/content-model.md`
- [ ] Refactor `scripts/bump_content_versions.py` to include active content packs
- [ ] Add `scripts/validate_skills.ts` with banned-pattern detection
- [ ] Update `skills/intake`, `skills/retro`, `skills/setup`, and `skills/update` to the canonical model

That tranche addresses the highest-risk drift first without forcing a full repo rewrite.

## Summary

Counsel OS should remain a vault-first legal operating system whose truth lives in Markdown files. The architectural refactor is about making that model explicit, shared, validated, and migration-safe. The repo does not need a heavier platform. It needs a sharper contract and fewer independent interpretations of it.
