# Counsel OS Configuration

## Legal Root
legal_root:

## Entity Discovery
discovery: qmd
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect, matter]

## QMD Collection
collection: obsidian

## Matters
matters_path: matters
# Relative to legal_root. New matter files are created here during intake.

## Practice Seed
practice_seed: knowledge/practice-seed
# Relative to plugin root. Used by setup to seed practice/ and by update to offer new content.

## Path Resolution
- Legal framework (law/, practice/, memory/) → read/write from legal_root
- Entity files (companies, counterparties) → discovered via QMD query on counsel-os-type frontmatter
- For a specific entity: QMD search for company name + counsel-os-type value
