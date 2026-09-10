# Contributing to Counsel OS

Counsel OS includes the standalone legal workspace and an existing agent
plugin, under the repository's MIT license. Standalone development is the
current priority. See the [repository map](docs/repository-layout.md) for
current paths, product boundaries and the incremental target layout.

## Development

Use Bun 1.3.14 and Python 3.12 for the development checks. Python and browser
dependencies below are test tooling, not requirements for the packaged app.

```bash
git clone https://github.com/eigenlegal/counsel-os
cd counsel-os
bun install --frozen-lockfile
(cd runtime/ui && bun install --frozen-lockfile)
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
bun run repo:check          # indexed file-path policy, not a secret scan
bun run typecheck
bun run typecheck:runtime
bun run typecheck:ui
bun run test                # backend, document and tooling tests
bun run ui:test             # both interfaces
bun run evals:self-test     # eval scorer self-test
bun run evals:runner-test
bun run law:frontmatter
python scripts/lint_knowledge.py --check-versions
python scripts/gen_browse_reference.py --check
python -m py_compile scripts/*.py
for counsel_script in scripts/*.sh backup restore setup update; do bash -n "$counsel_script"; done
```

This is the complete local source-check recipe corresponding to the general
CI job. It does not build/qualify the native desktop or run the independent
secret scan. For a pre-push secret check, install the official Gitleaks CLI
(CI pins 8.30.1), then scan an export of the exact index rather than your
ignored working files:

```bash
counsel_scan_dir=$(mktemp -d)
git checkout-index --all --prefix="$counsel_scan_dir/"
gitleaks dir "$counsel_scan_dir" --config "$counsel_scan_dir/.gitleaks.toml" --redact=100 --no-banner --log-level error
```

Review private prose manually as well. This index export is local; do not
upload it or scanner reports. Desktop-specific checks are listed separately
in the desktop guide.

For the browser development workspace, `bun run workspace --demo` opens
synthetic examples; `bun run workspace` opens the personal workspace.
These launchers may build the development UI. Do not rebuild those assets
under an already-running browser workspace you intend to leave unchanged.
The [desktop build/qualification commands](docs/desktop-release.md) use an
isolated build instead and never open an existing private workspace.

The plugin continues to use the existing root marketplace/skill paths.
Install it from a checkout using the host's plugin-directory option and
test outside the repository so project instructions do not mask plugin
discovery. Do not move plugin entry points as part of an app-only change.

## Checkpoints and release boundaries

Use a topic branch, inspect `git status`, review changed text for confidential
matter details or credentials, and stage explicit paths. `repo:check` also
checks force-added private/generated file classes. CI runs a separate
Gitleaks scan; neither check establishes that all prose is safe to publish.
Keep imported documents, workspace databases, backups, personal preferences,
signing keys, generated eval runs and installers out of Git.

The desktop version lives in `desktop/release.json`; root/plugin versions
retain their existing lifecycle. Desktop test images come from the manual
**Desktop local-test image** workflow after it reaches the default branch.
They are Actions artifacts, not public releases. No signing secrets or AI
accounts are needed for the standard CI checks.

Useful scripts (see `package.json`):

- `bun test` / `bun test browse/src`: unit + browse-server tests
- `bun run typecheck`: TypeScript typecheck for `browse/`
- `python3 scripts/validate_law_frontmatter.py`: validate `knowledge/` frontmatter

## Maintainer scripts

These are only relevant if you are developing Counsel OS itself. Users never run them.
The older `release.sh` helper below is for the plugin/legacy distribution:
it commits the working tree and pushes release tags. Never use it to
checkpoint the desktop branch or publish a desktop preview.

| Script | What it does | When |
|--------|-------------|------|
| `scripts/release.sh <X.Y.Z> -m "subject" [-b "body"] [--no-tag] [--no-push]` | Plugin/legacy release: bumps all four legacy version manifests, prepends the CHANGELOG entry, runs the lint + version-sync gate, commits the working tree, tags `vX.Y.Z` (fires the release-binaries workflow), pushes commit + tag. | Plugin/legacy releases only. Never use for desktop checkpoints or previews. |
| `bun run build:runtime [--target bun-darwin-arm64\|bun-linux-x64] [--out <file>]` | Builds the standalone `counsel-os` binary: runs `ui:build` if needed, generates `runtime/src/generated/{ui-embed,content-embed,entry}.ts` (git-ignored; the checkout never imports them), and compiles the generated entry. | Before a release; CI runs it per platform. |
| `scripts/lint_knowledge.py [--check-versions]` | Lints `knowledge/` conventions (no checkboxes, no H2-before-H1, frontmatter present) and, with the flag, verifies the four manifests agree. Runs in CI. | Before committing knowledge content changes. |
| `scripts/bump_content_versions.py [--date YYYY-MM-DD]` | Hashes each content group and bumps `content-version` frontmatter for groups that changed. This is what lets `/counsel-os:update` detect upstream law/practice changes. | After editing anything under `knowledge/law/` or `knowledge/practice-seed/`. |
| `scripts/validate_law_frontmatter.py` | Validates law-area frontmatter against `knowledge/law/frontmatter-policy.json`; reports attestations coming due. Runs in CI. | After editing law frontmatter; periodically to see attestation debt. |
| `bun runtime/src/cli.ts eval (--fixture <id> \| --task <task> \| --all) [--provider <id>] [--save]` | Runs the eval fixtures in `evals/` (and the practice's own under `<vault>/practice/evals/`) through the runtime on one provider and scores them; `--save` appends the lines to `<vault>/.counsel/evals/results.jsonl`. `bun run evals:self-test` scores the committed sample outputs (free, runs in CI). | Full run before releases and when qualifying a new model; see `evals/README.md`. |
| `scripts/gen_browse_reference.py [--check]` | Regenerates the browse skill's command reference from the source command registry; `--check` fails on drift instead of rewriting. CI regenerates and fails on any resulting `git diff`. | After adding or changing a browse CLI command. |

## Ground rules

- **Keep it local and private-by-default.** No telemetry, no phone-home, no
  bundled client data. Never commit a real practice profile, client document,
  or secret.
- **Legal knowledge must be sourced and honest.** Content in `knowledge/`
  should be accurate, jurisdiction-aware, and carry the required frontmatter.
  Counsel OS assists a licensed practitioner; it does not replace one.
- Add or update tests/evals for behavior changes; keep the suite green.
- Keep the diff focused and explain the "why" in the PR description.

## Reporting bugs / requesting features

Open an issue with steps to reproduce (for bugs) or the problem you're trying to
solve (for features). For security issues, see [SECURITY.md](SECURITY.md).
