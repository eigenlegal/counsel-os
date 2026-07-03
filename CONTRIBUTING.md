# Contributing to Counsel OS

Thanks for your interest. Counsel OS is a free, open-source legal operating
system for Claude — a set of skills, prompts, knowledge, and a small TypeScript
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

- `bun test` / `bun test browse/src` — unit + browse-server tests
- `bun run typecheck` — TypeScript typecheck for `browse/`
- `python3 scripts/validate_law_frontmatter.py` — validate `knowledge/` frontmatter

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
