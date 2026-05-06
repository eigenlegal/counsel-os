# Law Frontmatter Schema

Law files use frontmatter for routing, freshness checks, and source-backed review status. Do not add fields that imply legal review unless that review actually happened.

## Field Classes

### Derivable Fields

These may be added mechanically because they do not claim that a lawyer reviewed the file:

```yaml
counsel-os-type: law-area
content-version: "2026-05-06"
jurisdiction: [us-federal, us-state]
```

- `counsel-os-type` identifies the file type.
- `content-version` is release/content synchronization metadata.
- `jurisdiction` is broad routing metadata derived from path and topic. It is not an attestation that the file comprehensively covers every listed jurisdiction.

Jurisdiction values are listed in `frontmatter-policy.json`. Prefer broad values for mechanically derived metadata. Use more specific values like `ca`, `ny`, or `delaware` only after a human content pass confirms that specificity is useful.

### Attestation Fields

These must be added only after source-level review:

```yaml
last-reviewed: "2026-05-06"
authorities:
  - cite: "15 U.S.C. § 57b-1"
    title: "FTC civil investigative demand authority"
    url: "https://www.law.cornell.edu/uscode/text/15/57b-1"
```

- `last-reviewed` means a human or explicitly supervised legal-content process checked the file against current authorities on that date.
- `authorities` means the cited statute, rule, case, regulator page, or other source was verified for this file.
- Do not add empty `last-reviewed:` or `authorities: []`. Empty attestation fields create a false signal.

## Staleness Policy

Do not mass-add per-file `stale-after`. Staleness is computed from `last-reviewed` plus the per-area cadence in `frontmatter-policy.json`.

Example: if `knowledge/law/data-privacy/gdpr.md` has `last-reviewed: "2026-05-06"` and `data-privacy` has a six-month cadence, the validator treats it as stale after 2026-11-06.

## Validator

Run:

```bash
python3 scripts/validate_law_frontmatter.py
```

The validator is warning-only by default. It reports missing attestation fields without failing. Use `--strict` only when a review project wants to fail on warnings.

To apply only mechanically derived fields:

```bash
python3 scripts/validate_law_frontmatter.py --write-derived
```
