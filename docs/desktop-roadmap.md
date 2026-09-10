# Desktop packaging follow-through

Status: [PR #90](https://github.com/eigenlegal/counsel-os/pull/90) is merged; the follow-through implementation below distinguishes working code from unperformed release qualification. This document carries forward the useful requirements from [the earlier packaging proposal, PR #58](https://github.com/eigenlegal/counsel-os/pull/58), without adopting its obsolete runtime or shell design. The app remains a local-test product.

The product goal remains: a lawyer downloads the app, opens it, connects an AI account, brings in files, and starts working without deploying services or installing a development toolchain. Optional practice setup must not block reading and organizing local files.

## Reconciliation with the earlier proposal

| Earlier proposal | Current decision / remaining work |
| --- | --- |
| One compiled legacy `counsel-os` runtime with embedded UI/content | The current app bundles the separate `counsel-workspace` engine, UI, PDF resources, and fixed document-worker modes. Keep the legacy distribution independent. |
| Thin Tauri/Rust shell | Superseded by the implemented Swift/AppKit/WebKit shell in `desktop/macos/`. No shell rewrite is needed to finish packaging. |
| Startup token read from `runtime.json` | Superseded by the desktop's private parent/engine pipe, per-launch capability, origin checks, and parent-lifetime handling. Do not reintroduce a persistent bootstrap-token file. |
| No bundled provider CLIs; help users connect them | Retained. Explicit install/sign-in commands, native confirmation/Terminal hand-off, local sign-in checks and consented model tests are implemented. Actual clean-machine provider onboarding remains to qualify. |
| The app never handles any vendor credentials | Do not preserve this as an absolute promise. Current connections have provider-specific credential boundaries; selected context also reaches the chosen provider. Keep credentials out of app artifacts, workspace backups, and logs, and describe the actual integration. |
| Signed drag-to-Applications DMG | Local-test DMG creation and verification are implemented. Developer ID signing, notarization, final redistribution notices, and clean-machine qualification remain release gates. |
| Self-update, Homebrew, curl installer, plugin hand-off | Not shipped for the new desktop. Prioritize one qualified Mac download first; additional channels must consume that same verified release process rather than create parallel installers. |
| Daily automatic update checks | Not enabled. Manual-check/download code is implemented but unavailable while the channel is disabled. Owner-approved identity, keys and release qualification are prerequisites; no automatic replacement is implemented. |
| Signing team and credentials named in the old draft | Not authority to use them. The owner must confirm the final release identity, bundle identifier, and protected credential setup. Never copy credentials or assumed account details from a historical spec. |
| Linux parity and Intel support | Separate qualification decisions. The current hosted desktop job targets Apple silicon macOS; do not infer Intel support from Rosetta or treat a legacy Linux binary as a qualified desktop app. |

The old PR remains an accessible historical record after closure. Its requirements have been reconciled here; merging its draft into the current docs would create competing instructions.

## Implementation and remaining gates

### 1. Artifact contents and redistribution notices

Implemented: actual compiler-input inventory for the engine and interface, locked version checks, package and PDF font/map notice texts, explicit upstream notice provenance for known omissions, the pinned Bun license/inventory, and packaging digest checks. The unused Claude Agent SDK is no longer pulled into this desktop graph through its event mapper. Provider CLIs remain separate.

Open: complete Bun linked-library notices and source/relinking-obligation review. The generated inventory marks this unresolved; public distribution is not approved. An automated inventory is not redistribution clearance.

### 2. Guided AI connection setup

Implemented: optional first-run setup, local checks distinct from configured status, progressive installation/sign-in guidance, fixed native Terminal actions with confirmation, copyable official commands and retry instructions. Explicit model-access tests show the saved connection and require consent, send a fixed prompt without practice content/tools, and support cancellation. UI tests cover no automatic calls and cancelled consent.

Open: actual installation/account tests on a clean Mac. A CLI sign-in can affect other projects' account selection; the interface discloses this rather than promising no side effects. Codex requires file-backed authentication. Use only authorized accounts and synthetic files for live qualification.

### 3. Clean-machine and manual native acceptance

Implemented: isolated packaged-engine/browser and native WebKit qualification, file/save delegate tests, draft recovery, abrupt-parent shutdown, and native backup inspection/separate restore/reopen tests. The app has File-menu restore/open/personal-workspace actions and remembers the last successful selection.

Open: [manual clean-machine acceptance](desktop-manual-acceptance.md), including Finder install, downloaded-app trust, real chooser/drop interactions, live account setup, Word inspection and app replacement. Record the exact artifact, machine, outcomes and failures. Scripted tests do not count as those manual checks.

### 4. Signed-artifact qualification

Prepared, not live-qualified: a strict owner-identity validator, separate signed-test build script, hardened-runtime entitlements, nested signing/notarization/stapling checks and a manual read-only workflow that retains test artifacts. It never publishes or installs. Synthetic tests reject absent or mismatched owner identity.

Open: owner-confirmed Apple publisher/team/bundle ID, protected environment/reviewers/credentials, actual signing/notarization and hardened-runtime/manual qualification. None is inferred from the old proposal. See [signed-test preparation](desktop-release.md#preparing-a-signed-test--owner-action-required).

### 5. Safe updates, public promotion, and later install channels

Implemented: explicit update-check/download controls, Ed25519 metadata verification, identity/channel/expiry/build/OS checks, bounded downloads with exact hash/size verification, and single-use download tickets. The channel is disabled with no key or endpoint. Pre-migration backups are verified before schema changes; tests cover successful recovery, integrity failure, failed-migration rollback and downgrade refusal. Installation remains manual after saving and quitting.

Open: owner-approved channel/hosting/key custody, feed signing/publishing, hosted-channel/key-rotation qualification, promotion of the exact accepted image and release rollback procedures. Signed no-update behavior is covered by synthetic tests, not a live service. A disabled verifier is not a working update service. Additional channels such as Homebrew or plugin hand-off come after one qualified Mac release, not alongside competing installers.

## Available now: development hand-off

The [Desktop local-test image workflow](https://github.com/eigenlegal/counsel-os/actions/workflows/desktop-preview.yml) builds and qualifies the current app, then retains only the DMG and build/hash receipts for seven days. It uses no signing secrets or live model accounts. It does not publish a GitHub Release, install the app, or enable updates.

Keep the run URL and source commit with the downloaded image. In the extracted artifact directory, run `shasum -a 256 Counsel-local-test-arm64.dmg` and compare the result with the `sha256` field in the downloaded packaging receipt named `package.json`—not the repository's root package manifest. Developer test images are ad-hoc signed and may be refused by macOS. They must remain labeled as such.
