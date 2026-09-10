# Counsel OS

An open-source, local-first workspace for lawyers. Work through chat with your documents, matter history, and practice instructions in context.

Built for solo practitioners, law firms, and in-house counsel. MIT-licensed, with no Counsel OS subscription or telemetry. AI usage runs through the connection you choose and is subject to that provider's charges and terms.

## Choose your starting point

| Product | Current status | Start here |
| --- | --- | --- |
| **Standalone workspace** | Primary development focus: chat-first app with local SQLite storage, documents, and practice preferences | [Try from source](#try-the-workspace-from-source) |
| **Native macOS app** | Buildable local-test app and disk image; not a notarized public release | [Build the desktop](#desktop-builds-and-downloads) |
| **Agent plugin** | Published plugin for Claude Code / Claude Desktop / Cowork, using a Markdown vault | [Plugin quickstart](#plugin-quickstart) |

The native app wraps the same workspace engine and interface. The plugin has its own storage, integrations, and release cycle; installing one does not migrate data from the other.

## What the workspace does

- **Work through chat.** Ask questions, review agreements, prepare drafts, or pick up a matter. Select one or more matters, or an optional client scope. Context stays within that selection and documents explicitly shared with the chat.
- **Use your practice.** Keep positions, methods, templates, writing and document-review preferences, and your own entity/signatory details in Practice. External law, research, and Counsel guides live in Sources; deal documents belong with their matters.
- **Bring your files.** Drop supported files or folders into a durable import queue. Optional AI assistance suggests organization from filenames and extracted content; review the filing and supporting links before importing. Original files are retained.
- **Inspect the evidence.** Relevant permitted material is retrieved automatically. Response context distinguishes available records from passages actually read, and citations resolve to recorded versions.
- **Work on documents.** Extract text from PDF and Word files; produce supported Word edits, native tracked changes, comments, clean proposals, and comparison reports. Set the author shown on new changes and comments, plus your preferred output filenames.
- **Keep working records current.** Successful matter chats can update routine briefs with visible changes and undo. Practice-wide instructions and standards change through explicit requests and review—not by treating a concession on one deal as a new default.
- **Return without starting over.** Search and pin recent work, archive chats, recover items from Trash, and back up or restore the workspace. Local upkeep checks affected records and periodically reconciles while the app is running; AI filing assistance is separately controlled.

These are implemented workflows, not a promise that every request retrieves every relevant fact. Retrieval is bounded, document extraction can be partial, and unsupported document structures need review. Scanned-PDF OCR, comprehensive primary-source research, and automatic learning from every redline correction are not complete. Current primary-source connectors cover specific U.S. Code and eCFR citations, not all jurisdictions or case law.

<a id="installation"></a>

## Try the workspace from source

This is the developer/testing route. Use **Bun 1.3.14**. The native desktop is currently qualified locally on Apple silicon macOS; this source command is not a claim of full Windows or Linux qualification.

```sh
git clone https://github.com/eigenlegal/counsel-os.git
cd counsel-os
bun install --frozen-lockfile
(cd runtime/ui && bun install --frozen-lockfile)
bun run workspace --demo
```

The launcher builds the interface, opens a browser, and prints a private launch link. Keep the terminal running and do not share that link. The example workspace is separate and persistent: files you add are not reset on restart.

For a personal workspace instead:

```sh
bun run workspace
```

Connect AI through setup or Settings before sending a request. The app supports separately configured connections, including installed/signed-in Codex or Claude CLIs and supported API providers; it does not bundle those CLIs or include model usage.

The default personal workspace is under `~/.counsel/workspaces/personal/`; the example workspace is under `~/.counsel/workspaces/demo/`. Data lives outside the source checkout and app bundle. Importing copies supported files into the workspace—it is not a live sync with the original folders, and it does not automatically port every plugin skill or instruction.

Developer launches rebuild the checkout's UI assets. Do not run one under another running workspace whose assets you want to leave unchanged; desktop builds below are isolated. See [Contributing](CONTRIBUTING.md) for dependencies and the full test recipe.

## Desktop builds and downloads

**The source and build tools are in this repository. Compiled apps and installers are not stored in Git.**

The Mac build bundles the native shell, workspace engine, browser interface, document worker modes, and required PDF resources. Lawyers do not need to run separate worker services. The packaged document operations do not require a separate Bun or Python installation; external AI connections remain a separate setup step.

On an Apple silicon Mac with Bun, the Xcode command-line tools, and the locked dependencies installed above:

```sh
# Build a local Counsel.app; prints its new output directory.
bun run desktop:build

# Or build and package a fresh app into a verified local-test DMG.
bun run desktop:package
```

Both commands use fresh output directories by default and do not install/open the app, overwrite the running browser UI, or include an existing user's workspace. Advanced output and qualification options are in the [desktop release guide](docs/desktop-release.md).

### Get a GitHub Actions test image

After these workflows are on `main`, a repository maintainer can open **Actions → [Desktop local-test image](https://github.com/eigenlegal/counsel-os/actions/workflows/desktop-preview.yml) → Run workflow**. A successful run retains the DMG and two build/hash receipts in its **Artifacts** section for seven days. Ordinary pull-request checks build and test the app but do not retain a downloadable image.

This is an **ad-hoc-signed development build**, not a Developer ID-signed or notarized installer. macOS may refuse downloaded copies. No automatic updater or public desktop release is connected. Signing/notarization, redistribution notices, and clean-machine/manual qualification remain release gates.

<a id="standalone-binary-preview"></a>

The existing `counsel-os-darwin-arm64` / `counsel-os-linux-x64` files on GitHub Releases are the **older runtime**, not this desktop app. Their instructions remain in the [legacy runtime guide](docs/plugin-guide.md#legacy-standalone-runtime-preview). Desktop version/build metadata lives in `desktop/release.json`; the root version and `v*` tags retain the plugin/legacy release lifecycle.

## Confidentiality and data flow

**Local storage does not mean every AI operation is offline.** Requests and selected context go to the configured model connection. Optional AI import organization and drafting assistance also use that connection and its usage allowance. Research connectors contact external publishers. Provider retention and access terms depend on your account.

Workspace records and retained originals stay in local storage unless you export, back up, sync, or otherwise share them. Credentials are stored separately and are not bundled with the app or included in workspace backups. The plugin instead uses the Markdown vault you select; its [data-flow guide](docs/plugin-guide.md#confidentiality-and-data-flow) describes that path.

Never commit client files, workspace databases, personal practice settings, credentials, or backups to this public repository. The repository includes source, public content, and synthetic fixtures—not your practice. Trash is recoverable storage, not permanent erasure of every historical excerpt.

<a id="quickstart"></a>

## Plugin quickstart

For the published Claude Code plugin:

```text
/plugin marketplace add eigenlegal/counsel-os
/plugin install counsel-os@eigenlegal
```

Start a new session, run `/counsel-os:setup`, then `/counsel-os:demo`. For Claude Desktop / Cowork, local plugin development, vault customization, legal content, and platform-specific capabilities, use the [agent plugin guide](docs/plugin-guide.md).

The plugin continues to work independently. Its slash commands, Markdown-vault layout, and update procedure are not required to operate the standalone workspace.

## Development and documentation

- [Contributing](CONTRIBUTING.md): setup, source checks, and privacy review before pushing.
- [Repository layout](docs/repository-layout.md): current paths and incremental target structure.
- [Desktop qualification and releases](docs/desktop-release.md): build steps, CI, artifacts, and public-release gates.
- [Packaging follow-through](docs/desktop-roadmap.md): remaining onboarding, dependency notices, clean-machine, and update work.
- [Workspace implementation notes](runtime/src/workspace/README.md): detailed current and historical checkpoints, including limits.
- [Agent plugin guide](docs/plugin-guide.md): published plugin installation and reference.
- [Security policy](SECURITY.md): reporting a vulnerability.

The desktop shell is in `desktop/macos/`, the engine and worker entry points in `runtime/src/workspace/`, the workspace UI in `runtime/ui/src/workspace/`, and reusable Word tools in `runtime/src/docx/`. Plugin entry points remain at their existing root paths. No directory migration is implied by the proposed repository layout.

## License and project

MIT. See [LICENSE](LICENSE). Counsel OS is built by [Eigen Legal](https://eigenlegal.com). It is software for supporting a lawyer's work, not a substitute for professional judgment.
