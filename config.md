# Counsel OS Configuration

## Legal Root
legal_root:

## Entity Discovery
# Two modes:
# - qmd: entity files discovered via QMD content search (can live anywhere in the vault)
# - filesystem: entity files live under {legal_root}/{entities_path}, discovered via grep
# Setup auto-selects based on whether the `qmd` CLI is installed.
discovery: qmd
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect, matter]

## QMD Collection
# Only used when discovery: qmd
collection: obsidian

## Entities Path
# Only used when discovery: filesystem. Relative to legal_root.
entities_path: entities

## Matters
matters_path: matters
# Relative to legal_root. New matter files are created here during intake.

## Practice Seed
practice_seed: knowledge/practice-seed
# Relative to plugin root. Used by setup to seed practice/ and by update to offer new content.

## Path Resolution
- Legal framework (law/, practice/, memory/) → read/write from legal_root
- Entity files (companies, counterparties):
  - discovery: qmd → QMD query on counsel-os-type frontmatter (anywhere in vault)
  - discovery: filesystem → grep {legal_root}/{entities_path}/ for counsel-os-type frontmatter
- For a specific entity: search for company name + counsel-os-type value
