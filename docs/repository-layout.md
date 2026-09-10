# Repository layout and product boundaries

Status: accepted direction; directory migration is incremental. The standalone app is the primary product. The existing agent plugin remains supported with its own release lifecycle and may have a smaller feature set.

## One repository, distinct products

Keep the desktop shell, workspace engine, browser interface, document tools and plugin in this repository. These are source boundaries, not separate network services. The desktop distribution continues to bundle one engine with its fixed worker modes. It must not require a lawyer to deploy services or install a development toolchain.

Share a module only when there is an actual common consumer and a stable contract. Plugin and app orchestration, storage and feature sets do not have to match. Do not rebuild a universal core merely to make the directories look symmetrical.

## Where code lives now

| Responsibility | Current source |
| --- | --- |
| Native macOS window, startup, menus and lifecycle | `desktop/macos/` |
| Independent desktop version and build number | `desktop/release.json` |
| Workspace service, SQLite, retrieval, imports, recordkeeping and worker entry points | `runtime/src/workspace/` |
| Lawyer-facing workspace interface | `runtime/ui/src/workspace/` |
| Document manipulation primitives | `runtime/src/docx/` |
| Provider adapters and legacy runtime | Other modules under `runtime/src/` |
| Plugin entry points and legal methodology | `.claude-plugin/`, `skills/`, `primitives/` |
| Shipped legal references and practice defaults | `knowledge/law/`, `knowledge/practice-seed/`, `templates/` |
| Unit tests | Beside the code they test |
| Synthetic end-to-end fixtures and qualification | `e2e/`, `evals/` |
| Build and release automation | `scripts/`, `.github/workflows/` |

The legacy browser interface still lives alongside the new workspace UI. Do not remove it or migrate an existing user's data as a side effect of reorganizing code.

## Target layout

```text
apps/
  desktop/             native shells and desktop product metadata
  workspace-ui/        current lawyer-facing interface
packages/
  workspace/           application service and worker dispatch
  documents/           reusable extraction/editing/comparison tools
  providers/           reusable connection adapters
plugins/
  counsel-os/          plugin-specific entry points and integration
content/               shipped guides and defaults, not user material
tests/
  e2e/                 cross-component qualification
  fixtures/            synthetic test inputs
  evals/               scored synthetic scenarios
scripts/               build, qualification and release tools
docs/                  architecture, contribution and release guidance
```

This is a target, not a claim that these directories already exist. Keep unit tests beside their modules. Do not create empty packages or introduce a monorepo framework just to match this tree.

Move one boundary per follow-up change, after a committed checkpoint. Update imports, test paths, build embeddings, source fingerprints, developer commands and clean-checkout qualification together. Preserve root plugin discovery/marketplace paths until a tested packaging step provides compatibility; moving the plugin folders without that step breaks existing installations. Preserve the legacy runtime until its retirement is a separate, explicit decision. No directory move is part of the initial checkpoint/CI change.

## Source control and user data

Commit implementation, tests, synthetic fixtures, lockfiles and public documentation. Review prose as well as code for private matter details and machine-specific records before pushing to this public repository.

Do not commit workspace databases, imported client documents, personal practice profiles, backups, provider credentials, signing keys, generated evaluation runs or installers. Workspace data belongs outside the checkout. Generated build products go in ignored output folders; qualified distributable assets belong in release storage, not Git history.

`bun run repo:check` examines the index, including staged additions, for known private/generated path classes. Gitleaks independently scans tracked content using default rules and narrowly scoped exceptions for existing public legal-reference strings. Neither replaces human review for confidential prose. Do not add broad directory exceptions to make a scan pass.

Use a topic branch and explicit file staging, not an indiscriminate `git add -A`. A code checkpoint is not a release. Keep bulk mechanical directory changes separate from product behavior changes so review and rollback remain tractable.

## Releases

The plugin retains its existing root `VERSION`, root package/marketplace versions and `vX.Y.Z` tags. The desktop uses `desktop/release.json`; the build renders its version/build into the app's Info.plist and records them in build/package receipts. The engine's `sourceVersion` remains source provenance from the root package, not the desktop product version.

Reserve `desktop-vX.Y.Z` for future qualified desktop releases. This prefix does not match the legacy `v*` release trigger. No desktop release tags are created by the current workflows, and changing the desktop manifest cannot enable a stable channel. See [Desktop qualification and release boundaries](desktop-release.md).
