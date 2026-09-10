# Desktop packaging follow-through

Status: remaining work after [PR #89](https://github.com/eigenlegal/counsel-os/pull/89). This document carries forward the useful requirements from [the September 1 packaging proposal, PR #58](https://github.com/eigenlegal/counsel-os/pull/58), without adopting its obsolete runtime or shell design. It is a roadmap, not a claim that these features have shipped.

The product goal remains: a lawyer downloads the app, opens it, connects an AI account, brings in files, and starts working without deploying services or installing a development toolchain. Optional practice setup must not block reading and organizing local files.

## Reconciliation with the earlier proposal

| Earlier proposal | Current decision / remaining work |
| --- | --- |
| One compiled legacy `counsel-os` runtime with embedded UI/content | The current app bundles the separate `counsel-workspace` engine, UI, PDF resources, and fixed document-worker modes. Keep the legacy distribution independent. |
| Thin Tauri/Rust shell | Superseded by the implemented Swift/AppKit/WebKit shell in `desktop/macos/`. No shell rewrite is needed to finish packaging. |
| Startup token read from `runtime.json` | Superseded by the desktop's private parent/engine pipe, per-launch capability, origin checks, and parent-lifetime handling. Do not reintroduce a persistent bootstrap-token file. |
| No bundled provider CLIs; help users connect them | Retained. Existing connections can be selected now; guided installation/sign-in and clean-machine verification remain work. Do not bundle or modify vendor binaries as a shortcut. |
| The app never handles any vendor credentials | Do not preserve this as an absolute promise. Current connections have provider-specific credential boundaries; selected context also reaches the chosen provider. Keep credentials out of app artifacts, workspace backups, and logs, and describe the actual integration. |
| Signed drag-to-Applications DMG | Local-test DMG creation and verification are implemented. Developer ID signing, notarization, final redistribution notices, and clean-machine qualification remain release gates. |
| Self-update, Homebrew, curl installer, plugin hand-off | Not shipped for the new desktop. Prioritize one qualified Mac download first; additional channels must consume that same verified release process rather than create parallel installers. |
| Daily automatic update checks | Undecided, not enabled. Choose user-visible channel and check behavior when authenticated updates and migration recovery are implemented. |
| Signing team and credentials named in the old draft | Not authority to use them. The owner must confirm the final release identity, bundle identifier, and protected credential setup. Never copy credentials or assumed account details from a historical spec. |
| Linux parity and Intel support | Separate qualification decisions. The current hosted desktop job targets Apple silicon macOS; do not infer Intel support from Rosetta or treat a legacy Linux binary as a qualified desktop app. |

The old PR remains an accessible historical record after closure. Its requirements have been reconciled here; merging its draft into the current docs would create competing instructions.

## Remaining work, in order

### 1. Artifact contents and redistribution notices

- Produce an inventory tied to the actual dependency lockfiles and packaged resources, including transitive code, Bun's runtime, PDF fonts/maps, and their licenses/notices.
- Distinguish production-bundled components from test/development tooling and separately installed provider executables.
- Bundle the required notice texts and fail qualification when a packaged component lacks an accounted-for notice or review decision.
- Test the final app/image contents and receipts. An automated inventory assists review; it is not by itself redistribution clearance.

This can be developed without an Apple signing identity. The current short-lived development image is not a substitute for this public-release gate.

### 2. Guided AI connection setup

- Distinguish missing CLI, installed but signed out, configured connection, and successfully checked account access. A model appearing in a picker is not proof of entitlement.
- Offer an explicit install/sign-in action, explain what will run and which provider receives data, and use the vendor's supported flow. Never install software merely because setup was opened.
- Preserve existing accounts/configuration, support cancellation and retry, and re-detect after completion. Keep sensitive terminal output and credentials out of durable UI logs.
- Make any connection-test model call explicit, with its account/billing mode shown. No silent paid fallback.
- Keep local import, organization, and reading available without connecting AI. AI-assisted filing is a separate disclosed action.

Provider commands, SDK support, billing behavior, and installed-account isolation need current verification before implementation. Use synthetic documents for qualification; do not test against a user's client files by default.

### 3. Clean-machine and manual native acceptance

- Start without a source checkout, development toolchain, existing app data, or preconfigured provider connection.
- Exercise first open, optional profile setup, manual file/folder selection, Finder drag/drop, document downloads, provider connection, a synthetic review/redline, quit/reopen, and recovery from an interrupted operation.
- Verify Word output in native readers, without treating one successful fixture as coverage of arbitrary documents.
- Replace the app while retaining its external workspace, verify a backup, and restore into a separate recovered workspace.
- Record the tested OS/architecture, exact artifact hash, steps, and failures. Scripted WebKit tests alone do not satisfy manual file-panel or downloaded-app trust checks.

### 4. Signed-artifact qualification

- Confirm release identity and bundle identifier; configure a protected release environment with approval.
- Sign the final nested executables and app correctly, notarize and staple, and verify the exact distributed DMG on a clean machine.
- Prepare promotion of the exact qualified artifact with provenance and receipts, but do not publish it before all release gates—including the update/migration work below—are satisfied. A source version bump or successful preview must not silently create a public release.

This phase requires owner-provided release authority. See the [release gates](desktop-release.md#public-release-gate--still-closed).

### 5. Safe updates, public promotion, and later install channels

- Authenticate update metadata and artifact bytes; define channels, compatibility, interrupted-download behavior, and downgrade rejection.
- Create and verify a pre-migration backup. Test failed migrations and recovery without running an older binary against a newer database.
- Preserve provider connections, workspace data, drafts, and explicit preferences; communicate what an update will change and when restart is needed.
- Complete the release guide's update/migration gate before approving public promotion. A signed test artifact from step 4 is still not a public release.
- Add Homebrew or plugin hand-off only once the signed release path works. A website download link must point to qualified desktop assets, not the legacy runtime's `latest` release.

## Available now: development hand-off

The [Desktop local-test image workflow](https://github.com/eigenlegal/counsel-os/actions/workflows/desktop-preview.yml) builds and qualifies the current app, then retains only the DMG and build/hash receipts for seven days. It uses no signing secrets or live model accounts. It does not publish a GitHub Release, install the app, or enable updates.

Keep the run URL and source commit with the downloaded image. In the extracted artifact directory, run `shasum -a 256 Counsel-local-test-arm64.dmg` and compare the result with the `sha256` field in the downloaded packaging receipt named `package.json`—not the repository's root package manifest. Developer test images are ad-hoc signed and may be refused by macOS. They must remain labeled as such.
