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
- **Use your practice.** Keep positions, methods, templates, writing and document-review preferences, and your own entity/signatory details in Practice. External law, research, and Counsel OS guides live in Sources; deal documents belong with their matters.
- **Bring your files.** Drop supported files or folders into a durable import queue. Optional AI assistance suggests organization from filenames and extracted content; review the filing and supporting links before importing. Original files are retained.
- **Inspect the evidence.** Relevant permitted material is retrieved automatically. Response context distinguishes available records from passages actually read, and citations resolve to recorded versions.
- **Read linked public terms.** Counsel OS can retrieve relevant public pages and PDFs from URLs in your request or documents it reads, follow incorporated links, and retain source copies with retrieval receipts and exact citations. It does not use your browser login or send document text to those sites. Script-only, blocked or private pages may still need an upload.
- **Work on documents.** Extract text from PDF and Word files; produce supported Word edits, native tracked changes, comments, clean proposals, and comparison reports. Set the author shown on new changes and comments, plus your preferred output filenames.
- **Keep working records current.** Successful matter chats can update routine briefs with visible changes and undo. Practice-wide instructions and standards change through explicit requests and review—not by treating a concession on one deal as a new default.
- **Return without starting over.** Search and pin recent work, archive chats, recover items from Trash, and back up or restore the workspace. Local upkeep checks affected records and periodically reconciles while the app is running; AI filing assistance is separately controlled.

These are implemented workflows, not a promise that every request retrieves every relevant fact. Retrieval is bounded, document extraction can be partial, and unsupported document structures need review. Scanned-PDF OCR, comprehensive primary-source research, general web search, and automatic learning from every redline correction are not complete. Dedicated legal connectors cover specific U.S. Code and eCFR citations; public URL retrieval does not certify legal authority, currency or the version governing an agreement.

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

Development changes are tested in the local browser version first. Desktop installers are rebuilt in batches after those changes are reviewed and qualified; an existing installed package does not receive source or browser updates automatically.

The product name is **Counsel OS** in both distributions. New desktop builds are named **Counsel OS.app**. Earlier previews were named `Counsel.app`: quit the older app before opening the new one, and move only that old app bundle to Trash after installing the new copy to avoid launching the wrong version. The bundle identity, `~/.counsel` workspace paths, backup format and existing saved author names are unchanged; do not delete or rename your workspace folder.

For a personal workspace instead:

```sh
bun run workspace
```

Connect AI through setup or Settings before sending a request. The app supports separately configured connections, including installed/signed-in Codex or Claude CLIs and supported API providers; it does not bundle those CLIs or include model usage.

The default personal workspace is under `~/.counsel/workspaces/personal/`; the example workspace is under `~/.counsel/workspaces/demo/`. Data lives outside the source checkout and app bundle. Importing copies supported files into the workspace—it is not a live sync with the original folders, and it does not automatically port every plugin skill or instruction.

Developer launches rebuild the checkout's UI assets. Do not run one under another running workspace whose assets you want to leave unchanged; desktop builds below are isolated. See [Contributing](CONTRIBUTING.md) for dependencies and the full test recipe.

## Desktop builds and downloads

**The source and build tools are in this repository. Compiled apps and installers are not stored in Git.**

The owner-approved [Counsel OS 0.1.0 preview, build 10](https://github.com/eigenlegal/counsel-os/releases/tag/desktop-v0.1.0-preview.10) provides an Apple silicon Mac installer as a GitHub Release asset. This build fixes Claude Code sign-in detection from the Mac app and automatically loads model choices during connection setup. This is an experimental, ad-hoc-signed preview, **not Apple-notarized**; macOS may refuse a downloaded copy. It is not the production release or an automatic update channel. See its release notes for installation, verification, and known limitations.

Find the app version at the top of **Settings** or in **Counsel OS → About Counsel OS**. Preview tags use `desktop-v<version>-preview.<build>` and point to the exact source commit used for the installer. Plugin releases keep their separate `v<version>` tags.

The Mac build bundles the native shell, workspace engine, browser interface, document worker modes, and required PDF resources. Lawyers do not need to run separate worker services. The packaged document operations do not require a separate Bun or Python installation; external AI connections remain a separate setup step.

On an Apple silicon Mac with Bun, the Xcode command-line tools, and the locked dependencies installed above:

```sh
# Build a local Counsel OS.app; prints its new output directory.
bun run desktop:build

# Or build and package a fresh app into a verified local-test DMG.
bun run desktop:package
```

Both commands use fresh output directories by default and do not install/open the app, overwrite the running browser UI, or include an existing user's workspace. Advanced output and qualification options are in the [desktop release guide](docs/desktop-release.md).

### Get a GitHub Actions test image

The workflow is on `main`. A repository maintainer can open **Actions → [Desktop local-test image](https://github.com/eigenlegal/counsel-os/actions/workflows/desktop-preview.yml) → Run workflow**. A successful run retains the DMG and two build/hash receipts in its **Artifacts** section for seven days. Ordinary pull-request checks build and test the app but do not retain a downloadable image. If you are not a maintainer, ask one for the exact test run and artifact; there is not yet a general lawyer-facing download channel.

This is an **ad-hoc-signed development build**, not a Developer ID-signed or notarized installer. macOS may refuse downloaded copies. No automatic updater or production desktop release is connected; the owner-approved GitHub prerelease above is a separate manual preview download. The app now includes dependency inventories/notices, guided AI connection setup, native backup restore, and verified pre-upgrade recovery backups. Signing/notarization tooling is prepared but has not been run; Bun's linked-library redistribution review and clean-machine/manual qualification remain open.

For authorized developer testing, extract the Actions artifact, compare the DMG's SHA-256 with the downloaded `package.json` receipt, open the DMG, and drag **Counsel OS.app** into **Applications**. Quit any older Counsel OS app before replacing it; then eject the DMG and open the installed copy. If macOS refuses the image, stop and use an approved signed test image when available; do not disable Gatekeeper. Current builds target Apple silicon and macOS 13 or later, but that deployment target is **not** a tested support matrix. These images are development candidates, not cleared for general redistribution.

### Bring your practice into the desktop

Open Counsel OS and either connect AI or choose **Explore without AI**. Setup and Settings offer explicit provider installation/sign-in actions and an optional model-access test; nothing installs or spends a model call merely because setup is opened. Provider executables are installed separately. The native actions open Terminal after confirmation; provider authentication stays in the provider's own flow.

- **Move an existing app workspace:** save a `.counsel-backup` in the old workspace's Settings, then use **File → Restore workspace from backup…** in the desktop. Inspect the summary, restore, and choose **Open workspace**. Recovery creates a separate copy with its records, links, retained originals and saved drafts; it does not overwrite or merge your old workspace. Reconnect AI afterward. Counsel OS remembers the last successfully opened workspace. **File → Open personal workspace** returns to the default one.
- **Start from plugin folders or ordinary files:** use **Import files**. Drop your practice folders and company/matter documents, review the proposed organization, then import. AI assistance uses your chosen account and requires consent; imported instructions and practice positions still need review. This is file intake, not a silent migration of a plugin's executable skills or provider credentials.

On the same computer, the non-demo developer launcher and desktop share the default personal-workspace location; the developer demo uses a separate folder. The backup/restore route is recommended when you want an independent test copy. Opening the original database instead uses the same data, not a copy, and only one process can hold it open. File import adds to the currently selected workspace rather than creating a clone; inspect the destination and duplicate/organization choices before committing. Reconnecting a recovered workspace can reuse an already installed, compatible signed-in CLI—you need not sign in again unless the local check says otherwise.

Desktop workspaces live outside the app, initially under `~/.counsel/workspaces/personal/`. Replacing the app does not replace that folder. Keep a verified backup before an app update. [Recovery, update behavior and release limits](docs/desktop-release.md#recovery-and-updates) describe the exact boundaries.

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
- [Packaging follow-through](docs/desktop-roadmap.md): implementation status and remaining release decisions.
- [Manual Mac acceptance](docs/desktop-manual-acceptance.md): the clean-machine checklist still required before public release.
- [Workspace implementation notes](runtime/src/workspace/README.md): detailed current and historical checkpoints, including limits.
- [Agent plugin guide](docs/plugin-guide.md): published plugin installation and reference.
- [Security policy](SECURITY.md): reporting a vulnerability.

The desktop shell is in `desktop/macos/`, the engine and worker entry points in `runtime/src/workspace/`, the workspace UI in `runtime/ui/src/workspace/`, and reusable Word tools in `runtime/src/docx/`. Plugin entry points remain at their existing root paths. No directory migration is implied by the proposed repository layout.

## License and project

MIT. See [LICENSE](LICENSE). Counsel OS is built by [Eigen Legal](https://eigenlegal.com). It is software for supporting a lawyer's work, not a substitute for professional judgment.
