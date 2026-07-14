# Contributing to Counsel OS

Thanks for your interest. Counsel OS is a free, open-source legal operating
system for Claude: a set of skills, prompts, knowledge, and a small TypeScript
browse helper, all MIT-licensed.

## Development

Counsel OS runs as a Claude Code plugin. To hack on it from a checkout:

```bash
git clone https://github.com/eigenlegal/counsel-os
cd counsel-os
bun install                 # browse helper + tooling deps
bun test                    # the test suite
python3 scripts/run_evals.py --self-test   # eval-harness self-test
```

Useful scripts (see `package.json`):

- `bun test` / `bun test browse/src`: unit + browse-server tests
- `bun run typecheck`: TypeScript typecheck for `browse/`
- `python3 scripts/validate_law_frontmatter.py`: validate `knowledge/` frontmatter

## Maintainer scripts

These are only relevant if you are developing Counsel OS itself. Users never run them.

| Script | What it does | When |
|--------|-------------|------|
| `scripts/release.sh <X.Y.Z> -m "subject" [-b "body"] [--no-tag] [--no-push]` | One-command release: bumps all four version manifests, prepends the CHANGELOG entry, runs the lint + version-sync gate, commits the working tree, tags `vX.Y.Z` (fires the release-binaries workflow), pushes commit + tag. | Every release. Never bump the four manifests by hand. |
| `scripts/lint_knowledge.py [--check-versions]` | Lints `knowledge/` conventions (no checkboxes, no H2-before-H1, frontmatter present) and, with the flag, verifies the four manifests agree. Runs in CI. | Before committing knowledge content changes. |
| `scripts/bump_content_versions.py [--date YYYY-MM-DD]` | Hashes each content group and bumps `content-version` frontmatter for groups that changed. This is what lets `/counsel-os:update` detect upstream law/practice changes. | After editing anything under `knowledge/law/` or `knowledge/practice-seed/`. |
| `scripts/validate_law_frontmatter.py` | Validates law-area frontmatter against `knowledge/law/frontmatter-policy.json`; reports attestations coming due. Runs in CI. | After editing law frontmatter; periodically to see attestation debt. |
| `scripts/run_evals.py [--generate] [--model <id>] [--only <fixture>] [--self-test] [--save-baseline <id>] [--compare-baseline <id>]` | Scores eval outputs in `evals/`; `--generate` runs the counsel agent headlessly against each fixture's mini-vault first (costs API tokens); `--self-test` validates the scorer (free, runs in CI); baselines snapshot per-model scores and gate on regressions. | Full generate+score before releases and when qualifying a new model; see `evals/README.md`. |
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
