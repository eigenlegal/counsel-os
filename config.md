# Counsel OS Configuration

## Legal Root
legal_root:

## Entity Discovery
discovery: qmd
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect]

## QMD Collection
collection: obsidian

## Path Resolution
- Legal framework (law/, defaults/, practice/, memory/) → read/write from legal_root
- Entity files (companies, counterparties) → discovered via QMD query on counsel-os-type frontmatter
- For a specific entity: QMD search for company name + counsel-os-type value
