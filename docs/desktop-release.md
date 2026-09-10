# Desktop qualification and release boundaries

The macOS desktop is currently a local-test product, not a notarized public release. Core workspace and document operations are bundled; external AI connections are configured separately. No user workspace, documents, credentials or signing material may enter the build.

The [packaging follow-through roadmap](desktop-roadmap.md) reconciles the older packaging proposal with the implemented app and orders the remaining onboarding, notice, clean-machine, and update work. The old Tauri/legacy-runtime proposal is not the current desktop architecture.

## Version ownership

- `desktop/release.json` owns desktop `version`, numeric `build` and `channel`.
- `desktop/macos/Info.plist` is a build template. Do not install the source folder directly.
- `desktop:build` validates the manifest, generates Info.plist, packages the engine and records the independent desktop version in its receipt.
- Only `local-test` is accepted today. Setting `stable` fails; it does not bypass release gates.
- Root `VERSION`, `package.json` and marketplace manifests remain the plugin/legacy product version. Do not use `scripts/release.sh` to publish the desktop or checkpoint arbitrary workspace changes: that older helper commits the working tree and pushes plugin release tags.

Future desktop release tags use `desktop-vX.Y.Z`; existing plugin releases keep `vX.Y.Z`. No new tags or releases are created by this setup.

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
bun e2e/workspace-package-check.ts /new/desktop/output/Counsel.app --browser-python "$(command -v python)"
bun e2e/workspace-desktop-check.ts /new/desktop/output/Counsel.app
bun run desktop:package --app /new/desktop/output/Counsel.app --outdir /new/package/output
```

The build does not overwrite `runtime/ui/dist`, install the app or open private data. The qualification fixtures use new synthetic workspaces. Optional `workspace:check --run --desktop-app /new/desktop/output/Counsel.app --python /path/to/python` additionally requires separately installed Codex and Claude CLIs for no-model transport probes. Those installed-CLI probes are not part of the credential-free CI jobs. Native Word rendering and actual model-account checks remain separate, explicitly authorized qualification steps.

## GitHub workflows

| Workflow | Trigger | Result |
| --- | --- | --- |
| `CI` | Pull requests and configured development/main pushes | Typechecks, repository path policy, backend/UI tests, eval self-tests and plugin/content checks |
| `Repository safety` | Pull requests and configured development/main pushes | Gitleaks scan of the committed tree, including hidden source files |
| `Desktop qualification` | Pull requests, configured development/main pushes, manual run, reusable call | macOS arm64 build; synthetic source, relocated worker/browser and native WebKit checks; verified local-test DMG |
| `Desktop local-test image` | Manual run only | Same qualification, then a seven-day Actions artifact containing only the DMG and two hash/build receipts |
| Existing `Release binaries` | Existing `v*` tags | Legacy browsing/plugin assets, not the new desktop |

The push triggers currently name `main` and `work/standalone-desktop`; pull requests are not branch-filtered. A local pass or workflow lint is not evidence that a hosted runner passed: inspect the checks for the exact pushed commit. GitHub requires a manually dispatched workflow to be present on the default branch before it can be dispatched. After merge, choose **Actions → Desktop local-test image → Run workflow** to request the development artifact; the normal pull-request checks retain no app image.

The desktop workflow uses the standard `macos-14` arm64 runner and also asserts its architecture. It receives no AI-provider or signing secrets and makes no live model calls. Native testing exercises the production WebKit/process classes with synthetic test delegates; it does not prove manual file panels, Finder drag/drop, or a real lawyer's clean-machine onboarding. Failures are not changed to skipped successes to produce an artifact.

Workflow tokens are read-only for repository contents; checkout does not retain credentials. Actions are pinned to full commit hashes and the Gitleaks binary to an archive checksum. Artifact uploads explicitly list the DMG and receipts, never entire temporary folders, test databases, bootstrap URLs or raw logs. These boundaries follow [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use); runner labels are documented in [GitHub's hosted-runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

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
