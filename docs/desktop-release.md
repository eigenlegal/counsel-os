# Desktop qualification and release boundaries

The macOS desktop is currently a local-test product, not a notarized public release. Core workspace and document operations are bundled; external AI connections are configured separately. No user workspace, documents, credentials or signing material may enter the build.

The [packaging follow-through roadmap](desktop-roadmap.md) reconciles the older packaging proposal with the implemented app and orders the remaining onboarding, notice, clean-machine, and update work. The old Tauri/legacy-runtime proposal is not the current desktop architecture.

## Version ownership

Iteration is browser-first: implement and test in the local HTML workspace, then batch accepted changes into a newly qualified desktop package. Never silently replace the installed app during browser development. Source/browser changes do not update an existing installer or installed app. Backend changes require a dev-server restart; UI-only changes can be deployed as new hashed assets without restarting active chats.

- `desktop/release.json` owns desktop `version`, numeric `build` and `channel`.
- `desktop/macos/Info.plist` is a build template. Do not install the source folder directly.
- `desktop:build` validates the manifest, generates Info.plist, packages the engine and records the independent desktop version in its receipt.
- Only `local-test` is accepted today. Setting `stable` fails; it does not bypass release gates.
- Root `VERSION`, `package.json` and marketplace manifests remain the plugin/legacy product version. Do not use `scripts/release.sh` to publish the desktop or checkpoint arbitrary workspace changes: that older helper commits the working tree and pushes plugin release tags.

Owner-approved desktop preview tags use `desktop-vX.Y.Z-preview.BUILD`; future stable desktop tags use `desktop-vX.Y.Z`. Existing plugin releases keep `vX.Y.Z`. Version/build, Settings release-note links, and package receipts derive their preview identity from the same manifest. The native About panel reads the generated Info.plist version/build. Browser Settings explicitly identify a development workspace, not an installed release.

On the owner's explicit request, a qualified local-test image may be attached to a **GitHub prerelease**, not marked latest. Tag the exact reviewed source commit; publish only the verified DMG, SHA-256 checksums, and public build/package receipts. Verify uploaded asset hashes. Do not include test workspaces, raw logs, bootstrap links, credentials, or private files. The notes must identify the ad-hoc signature, lack of Apple notarization, supported architecture, manual installation, and outstanding public-release gates. This does not approve a stable release, enable an updater, or claim full clean-machine/redistribution qualification. Routine builds and CI still never publish automatically.

## Local development qualification

Use Bun 1.3.14, Python 3.12, the Xcode command-line tools and a new output directory on an Apple silicon Mac. Python is test tooling, not an application dependency. Run the [complete source-check recipe](../CONTRIBUTING.md#development), including the separate pre-push secret scan, before the desktop-specific checks below. Replace `/new/desktop/output` and `/new/package/output` with fresh, writable paths you choose; they are placeholders, not directories to create at the filesystem root.

```sh
bun install --frozen-lockfile
(cd runtime/ui && bun install --frozen-lockfile)
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
bun run repo:check
bun run test
bun run ui:test
bun run typecheck
bun run typecheck:runtime
bun run typecheck:ui
bun run desktop:build --outdir /new/desktop/output
bun e2e/workspace-package-check.ts "/new/desktop/output/Counsel OS.app" --browser-python "$(command -v python)"
bun e2e/workspace-desktop-check.ts "/new/desktop/output/Counsel OS.app"
bun run desktop:package --app "/new/desktop/output/Counsel OS.app" --outdir /new/package/output
```

The build does not overwrite `runtime/ui/dist`, install the app or open private data. The qualification fixtures use new synthetic workspaces. Optional `workspace:check --run --desktop-app "/new/desktop/output/Counsel OS.app" --python /path/to/python` additionally requires separately installed Codex and Claude CLIs for no-model transport probes. Those installed-CLI probes are not part of the credential-free CI jobs. Native Word rendering and actual model-account checks remain separate, explicitly authorized qualification steps.

## GitHub workflows

| Workflow | Trigger | Result |
| --- | --- | --- |
| `CI` | Pull requests and configured development/main pushes | Typechecks, repository path policy, backend/UI tests, eval self-tests and plugin/content checks |
| `Repository safety` | Pull requests and configured development/main pushes | Gitleaks scan of the committed tree, including hidden source files |
| `Desktop qualification` | Pull requests, configured development/main pushes, manual run, reusable call | macOS arm64 build; synthetic source, relocated worker/browser and native WebKit checks; verified local-test DMG |
| `Desktop local-test image` | Manual run only | Same qualification, then a seven-day Actions artifact containing only the DMG and two hash/build receipts |
| `Desktop signed test (owner approval required)` | Manual run on `main`, with owner-confirmed identity and protected credentials | Builds a separate Developer ID-signed, notarized test image, checks it, retains named test artifacts only; never publishes |
| Existing `Release binaries` | Existing `v*` tags | Legacy browsing/plugin assets, not the new desktop |

The push triggers currently name `main` and `work/standalone-desktop`; pull requests are not branch-filtered. A local pass or workflow lint is not evidence that a hosted runner passed: inspect the checks for the exact pushed commit. The local-test image workflow is on the default branch: choose **Actions → Desktop local-test image → Run workflow** to request the development artifact; normal pull-request checks retain no app image. A newly added workflow, including signed-test preparation, becomes manually dispatchable only after its own merge to the default branch.

The ordinary desktop qualification workflow uses the standard `macos-14` arm64 runner and also asserts its architecture. It receives no AI-provider or signing secrets and makes no live model calls. Native testing exercises the production WebKit/process classes with synthetic test delegates, including backup inspection, separate restore, reopening the recovered records and the fixed native-action allowlist. It does not prove manual file panels, Finder drag/drop, or a real lawyer's clean-machine onboarding. Failures are not changed to skipped successes to produce an artifact.

Workflow tokens are read-only for repository contents; checkout does not retain credentials. Actions are pinned to full commit hashes and the Gitleaks binary to an archive checksum. Artifact uploads explicitly list the DMG and receipts, never entire temporary folders, test databases, bootstrap URLs or raw logs. These boundaries follow [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use); runner labels are documented in [GitHub's hosted-runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

## Guided AI setup

Setup remains optional. Local reading, import and manual organization work without AI. Choose a connection, use **Check local sign-in**, and expand **Install or sign in** if needed. In the desktop, the Terminal action first shows its fixed command and asks for confirmation. Copyable commands and official instructions are also available. If you need to cancel the provider command, press Control-C in Terminal. After installing/signing in, return to Counsel OS, recheck, select the intended model/billing method and choose **Save connection** before **Test saved connection**.

The commands follow the [Codex CLI installation guide](https://learn.chatgpt.com/docs/codex/cli), [Codex authentication guide](https://learn.chatgpt.com/docs/auth), and [Claude Code setup guide](https://code.claude.com/docs/en/setup). Counsel OS does not bundle those executables or silently reinstall them. Signing into their CLI can change the account used by other projects. Codex currently requires file-backed ChatGPT credentials; its setup command explicitly selects that store. A Keychain-only login does not work with this adapter. Claude billing must match the selected subscription or Console account; there is no silent paid fallback.

**Configured**, **local sign-in found**, and **model tested** mean different things. Saving a connection and checking local sign-in make no model inference call; the latter does not prove entitlement or token freshness. **Test saved connection** asks separately before sending a fixed, tiny prompt using the displayed saved provider/model/billing choice. It sends no workspace content or tools. Success means the model answered, not that its legal analysis or document performance is qualified. Cancellation cannot reverse usage already incurred. Credentials and raw sign-in output are not shown in diagnostics or saved into workspace records.

Model choices load automatically for subscription connections, refresh after a local sign-in check, and preserve the selected model. API lists load after their key is saved. Listing models sends no prompt: Codex uses its installed catalog, Claude Code exposes CLI aliases rather than account entitlements, and API connections request metadata from their official endpoints. Failed discovery can be retried without waiting for the catalog cache to expire.

Preview build 10 corrects a Mac-app launch issue where a missing `USER` environment value caused Claude Code to miss an existing Keychain sign-in. The shell supplies the OS username and the restricted adapter has a fallback for other GUI launches. This does not copy credentials, inherit ambient API keys, change sign-in, or infer the lawyer's document-author identity from their operating-system account. An existing valid Claude Code login does not need repeating for this fix.

## Imported practice review in preview build 12

**Practice → Review imported material** includes unchanged, practice-wide positions, methods, reusable language and lessons from ordinary file imports. Select and explicitly confirm up to 50 items per page. After a successful approval the dialog refreshes with the remaining material and clears the selection and confirmation. An empty queue shows a close action rather than disabled approval controls.

Approvals use the existing review path, pin the selected revisions and saved profile identity, and fail the entire batch if a selected item is stale or no longer eligible. Each category retains its role in future context. Revised proposals, matter-specific items and direct plugin baselines are outside this shortcut. Original files and prior responses remain unchanged. Display-only cleanup removes verified export ID suffixes from titles and moves old export metadata out of substantive previews; the saved text is retained intact.

## Bundled dependency notices

Every new package includes `Contents/Resources/THIRD-PARTY-NOTICES.txt` and `dependency-inventory.json`. Inventory inputs are the actual Bun engine and Vite interface graphs, their locked package versions, and copied PDF fonts/maps. Development-only packages and separately installed provider CLIs are distinguished. License text omissions fail the build unless an exact, documented upstream notice is supplied. Packaging verifies the notice digest. The pure Claude message mapper no longer brings the unused Agent SDK into the desktop merely to translate events.

This is not complete redistribution clearance. The pinned Bun 1.3.14 license includes its linked-library inventory, but full linked-library notices and corresponding source/relinking obligations still require review. The inventory records those outstanding items and `publicDistributionApproved: false`. Changing Bun requires reviewing its notices again. Do not erase review flags or label the local artifact publicly cleared because an automated inventory passed.

## Recovery and updates

Use **File → Restore workspace from backup…**, also linked from Settings, to inspect a saved archive and recover into a newly created `recovered-*` directory. Opening that copy stops requests in the old workspace and asks before switching; saved work in the old workspace is retained. Chat and working-preference drafts are flushed before switching; other unsaved forms are not promised recovery. AI configuration is deliberately not restored from a backup. Cancelling a restore can leave an incomplete directory, marked so it cannot be opened as a valid workspace. The last successfully opened database is remembered; the File menu also opens the default personal workspace or another explicitly selected database. Keep a selected database with its originals folder.

Before migrating an existing supported database to a newer schema, the launcher holds its workspace lock, creates a full backup, verifies it, and retains `before-upgrade-*/workspace.counsel-backup` with a recovery receipt beside the database. These archives contain confidential workspace data and are not encrypted by this feature. If backup or verification fails, migration does not start. New/current databases do not need a migration archive. Failed schema changes roll back transactionally; automatic backup creation does not itself guarantee every future migration is correct. Backup size/disk-space limits still apply. Workspaces older than schema 5 require an explicit development migration; newer-than-supported schemas are refused.

Recover into a separate workspace using the retained archive. **Never point an older app at an upgraded database as a rollback.** In-place upgrades retain connection configuration; recovered copies intentionally require reconnecting. Keep archives until the upgraded workspace is accepted, then manage retention deliberately rather than silently deleting recovery points.

The default database is `~/.counsel/workspaces/personal/workspace.sqlite3`; its recovery archives are inside that same `personal` directory. A recovered/explicitly selected database uses its own containing directory instead. In Finder, **Go → Go to Folder…** can open `~/.counsel/workspaces/` to locate the archive. The File menu remains available when the workspace engine fails to open, so a database/startup failure need not prevent native restore. If the app itself cannot launch, keep all data and archives intact and use a known-qualified replacement that supports the backup's schema; exact binary/version rollback remains a release qualification gate, not a promise that any older app is safe. Backups cover retained records, originals, saved outputs, staged imports and saved recovery drafts, excluding AI credentials/configuration and text not yet autosaved. Current limits are 10 GB per archive and 4 GB for the database, plus available-disk-space checks.

The Settings update panel performs no automatic external polling. This build's `desktop/update-channel.json` is disabled and has no endpoint/key/identity. The implemented verifier accepts only bounded Ed25519-signed metadata with matching channel, publisher identities, platform, OS requirement, validity period and monotonic build number. Downloads reject redirects and verify exact size and SHA-256 before offering a one-shot file download; interrupted/invalid downloads are discarded. Nothing installs or replaces a running app. The highest observed version is retained locally; this is not protection against a user deliberately rolling back the entire workspace state.

Before enabling a channel, the owner must approve the HTTPS feed and artifact origin, provision signing keys in protected storage, embed the public key and final identity, qualify the hosted feed and key-rotation behavior, and finish public promotion controls. Signed current-version metadata is handled as no update, while expired/tampered metadata and older-than-observed builds remain errors. No update-feed signer/publisher, key rotation, or automatic app replacement is shipped. A disabled, tested verifier is not a live update service. Under the current roadmap, the first public release requires a qualified authenticated manual-update path; testing the disabled state is appropriate only for these development candidates, not a waiver of that gate.

## Preparing a signed test — owner action required

`desktop/release-identity.json` intentionally contains no assumed publisher, team or final bundle identifier. The historical packaging proposal is not signing authority. Have the owner confirm these values, then set `confirmed: true` in a reviewed change. The certificate must exactly match `Developer ID Application: <publisher> (<teamId>)`; the team must be ten uppercase letters/digits and the bundle identifier must be the final reverse-DNS identity, not the local-test one.

The signing script takes an already verified source-matching app and creates a **separate**, unpublished signed test app/DMG. It signs the nested engine and app with hardened runtime and explicit entitlements, checks the Apple signing identity, notarizes, rejects reported notary issues, staples and validates the app and image, and writes hash/source/identity receipts. The engine's minimal JIT entitlement and the shell's user-confirmed Terminal automation require live hardened-runtime qualification. This tooling has not been run against an owner identity. Its workflow mirrors [Apple's notarization sequence](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow); a script existing is not proof Apple accepted an artifact.

For GitHub, create and protect environment **`counsel-desktop-signing`** with required reviewers, prevent self-review, and restrict deployments to `main` before supplying credentials. Naming the environment in YAML does **not** configure those protections. Set environment variables `COUNSEL_SIGNING_READY=true` and `COUNSEL_SIGNING_IDENTITY` only after this review. Add environment secrets `COUNSEL_CERTIFICATE_BASE64` (exported Developer ID certificate/private key), `COUNSEL_CERTIFICATE_PASSWORD`, `COUNSEL_APPLE_ID`, and `COUNSEL_NOTARY_PASSWORD` (app-specific password). Do not paste secrets into a chat, commit them, or store them as repository variables. The workflow uses a temporary runner keychain and removes it; it has no release-publishing permission. No environment or credentials have been provisioned by this source change.

For an explicitly provisioned local keychain, the equivalent is:

```sh
bun run desktop:sign-test --app "/verified/build/Counsel OS.app" --outdir /new/signed-test \
  --identity "Developer ID Application: Confirmed Publisher (TEAMID1234)" \
  --notary-profile your-provisioned-profile
```

These are placeholders. Do not substitute the publisher from an old proposal. Keep the signed test private until the remaining distribution review permits sharing. The [manual acceptance checklist](desktop-manual-acceptance.md) must be completed against the exact final image, not a developer build with the same version label.

## Public release gate — still closed

The preview workflow cannot create a GitHub Release, Developer ID-sign or notarize an app, register an updater, or publish an update feed. An ad-hoc signature and a valid DMG checksum do not make a downloaded app a trusted public release. macOS may refuse it.

Before adding a public desktop release workflow, complete:

1. The owner's Apple Developer release identity and final bundle identifier.
2. Full dependency/third-party redistribution-notice review.
3. Developer ID signing, hardened-runtime compatibility, notarization and stapling with verification of the final distributed bytes.
4. Clean-machine/manual native UI, provider installation/account and supported-OS qualification.
5. Authenticated update manifests/artifacts, explicit channel/version handling and safe migration backup/rollback rules. Never run older code against a newer database as an assumed rollback.
6. A protected release environment and explicit promotion of the exact qualified artifact. Preview builds must not silently become public releases.

Keep signing credentials in the release system's protected secret storage, not the repository or a developer-supplied file committed alongside the app. The source branch can be reviewed and merged independently of these release credentials.
