# Matters Index

This file serves as a routing guide for matter-specific context. It helps Counsel OS find the right counterparty files, understand relationship categories, and locate deal-specific overrides.

## Counterparty Registry
[List your key counterparties and their context file locations]

Example:
> | Counterparty | File | Category | Notes |
> |-------------|------|----------|-------|
> | Stripe | counterparties/stripe.md | Payment vendor | Strategic partner, Tier 1 |
> | AWS | counterparties/aws.md | Infrastructure vendor | Tier 2, standard terms |
> | BigCo Inc. | counterparties/bigco.md | Enterprise customer | Tier 1, custom MSA |
> | Acme Startup | counterparties/acme-startup.md | SMB customer | Tier 3, standard template |

[YOUR COUNTERPARTY REGISTRY HERE]

## Relationship Categories
[Define how you categorize counterparties — this affects review depth and position flexibility]

Example:
> - **Customers (enterprise):** We're the vendor. Use our template. Moderate flexibility on liability and SLA terms. Protect IP and data provisions.
> - **Customers (SMB):** We're the vendor. Our template, minimal negotiation. Standard click-through where possible.
> - **Technology vendors:** We're the customer. Review their template against our positions. Focus on data protection, IP, and liability.
> - **Strategic partners:** Joint arrangements. Custom terms. Full review always.
> - **Professional services:** Consulting, legal, accounting. Our template or mutual negotiation. Focus on IP assignment, confidentiality.
> - **Resellers/channel:** Distribution agreements. Protect brand, pricing, territory.

[YOUR RELATIONSHIP CATEGORIES HERE]

## Active Deals
[Pointers to active deal files in deals/ subdirectory]

Example:
> | Deal | File | Status | Counterparty | Type |
> |------|------|--------|-------------|------|
> | Project Atlas | deals/project-atlas.md | Negotiating | BigCo Inc. | Enterprise license |
> | AWS Migration | deals/aws-migration.md | In review | AWS | Infrastructure SOW |

[YOUR ACTIVE DEALS HERE]

## Finding Context Files

When starting work on a matter, Counsel OS looks for context in this order:

1. **Counterparty file:** `counterparties/[name].md` — Contains relationship history, agreed positions, known preferences, and prior deal outcomes.
2. **Deal file:** `deals/[deal-name].md` — Contains deal-specific context, negotiation history, approved deviations, and stakeholder notes.
3. **This index:** Routing hints and category-level defaults.

### Counterparty File Format

Each counterparty file should follow this structure:

```markdown
# [Counterparty Name]

## Relationship
- Category: [customer/vendor/partner/etc.]
- Tier: [1/2/3/4]
- Primary contact: [name, role]
- Our relationship owner: [internal name, role]

## Agreed Positions
[Positions we've already negotiated and agreed to with this counterparty]
- Liability cap: [agreed position]
- Indemnification: [agreed position]

## History
[Prior deals, outcomes, negotiation patterns]

## Notes
[Anything else relevant — their typical pushback points, preferred negotiation style, etc.]
```

### Deal File Format

```markdown
# [Deal Name]

## Overview
- Counterparty: [name]
- Type: [contract type]
- Value: [dollar amount]
- Timeline: [key dates]
- Internal stakeholder: [name, role]

## Approved Deviations
[Positions where we've agreed to deviate from standard for this specific deal]

## Negotiation Notes
[Running log of negotiation points, calls, decisions]

## Open Issues
[Unresolved items]
```
