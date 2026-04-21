# Counsel OS

A legal operating system for Claude. Review contracts, triage NDAs, negotiate redlines, assess compliance, and more — all grounded in your standards, your methods, and your judgment.

Built for solo practitioners, law firms, and in-house counsel.

## Installation

### Claude Code (CLI)

```bash
# Clone the repo
git clone https://github.com/jw2856/counsel-os.git ~/counsel-os
cd ~/counsel-os

# Run setup (seeds knowledge into your vault, optionally builds browser)
./setup

# Start Claude Code
claude
```

The setup script:
- Seeds legal framework content (law areas) and practice content (standards, methods, clause library) into your configured legal root
- Copies practice profile template and memory logs
- If [Bun](https://bun.sh/) is installed, builds the headless browser binary for `/counsel-os:browse`
- Does not overwrite existing files if you've already customized

**Requirements:** Git. Optional tools:
- **Bun** — for the `/counsel-os:browse` browser skill
- **pandoc** — for extracting tracked changes from Word documents
- **QMD** — for entity discovery across your whole vault. Without QMD, entity files live under `{legal_root}/entities/` and are discovered via filesystem search. Setup auto-detects what you have and configures accordingly.

### Claude Desktop (Cowork)

1. Download this repo as a `.zip` file (Code → Download ZIP on GitHub)
2. Open **Claude Desktop** → **Cowork** → **Customize** → **Browse plugins**
3. Upload the `.zip` file — it installs automatically
4. Start a **new conversation** in Cowork mode — the skills are now active

> **Note:** The `/counsel-os:browse` skill (headless browser) is not available in Cowork since it requires CLI access. All other skills work identically.

### As a Claude Code Plugin

In Claude Code, add this repo as a marketplace and install:

```
/plugin marketplace add jw2856/counsel-os
/plugin install counsel-os@eigen-legal
```

Claude Code caches the plugin under `~/.claude/plugins/cache/eigen-legal/counsel-os/{version}/` and loads its skills automatically. Updates flow through `/counsel-os:update`.

---

## Setup

After installing, configure `config.md` in the plugin root to point to your legal root — the folder where Counsel OS manages its framework content:

```markdown
legal_root: /path/to/your/vault/Counsel OS
```

Then run the guided onboarding:

```
/counsel-os:setup
```

This walks you through setup interactively:

| Step | What It Configures | Time |
|------|--------------------|------|
| `profile.md` | Your organization, legal philosophy, risk appetite, writing style, escalation criteria | ~5 min |
| Standards customization | Review and adjust the 24 standard clause positions for your practice | ~10 min |

You can also edit these files directly in `{legal_root}/practice/`.

**Optional:** Provide 3-5 past contracts during setup and the system will analyze them to infer your actual positions — often more accurate than describing them in the abstract.

---

## Usage

### Legal Work

There is no pipeline and no slash-command-per-phase. You describe what you need in plain language and the `/counsel-os:counsel` skill auto-activates. It composes five primitives — `read`, `research`, `evaluate`, `draft`, `remember` — based on your intent.

```
> Review this NDA: path/to/nda.pdf
> Is a 36-month liability cap acceptable?
> What did we agree with Acme last time?
> Draft a response to section 7.3 — they want uncapped indemnity
> Summarize this MSA for the CFO
> Create a redline of this agreement
> Is this compliant with GDPR?
> Close this matter
```

The counsel skill handles intake, analysis, negotiation language, delivery, and closeout as one continuous conversation. It auto-detects applicable law areas, loads your effective positions (merging law → entity → practice → memory), and proposes knowledge updates as it works.

For document outputs (redlines, memos), it runs scripts to produce `.docx` with tracked changes or formatted markdown as appropriate.

### Utility Skills

#### Browse — Document Extraction (CLI only)

```
/counsel-os:browse
```

Headless browser for extracting documents from portals, checking entity status, pulling SEC filings, and taking evidence screenshots. First call starts the browser (~3 seconds), subsequent calls are ~100ms.

Examples:
```
> Go to the Delaware Division of Corporations and check Acme Corp's standing
> Pull the latest 10-K from EDGAR for $TICKER
> Screenshot the terms of service at example.com
> Navigate to our data room and download the latest draft
```

For authenticated portals, import your browser cookies first:
```
/counsel-os:browse
> Import cookies from Chrome for docusign.com
```

#### Retro — Practice Analytics

```
/counsel-os:retro
```

Analyzes your decision history and produces insights:
- Matters closed by type and complexity
- Most-negotiated clauses (where you're spending energy)
- Counterparties that push back hardest
- Standards that keep getting overridden (maybe the standard is wrong?)
- Trends compared to previous retros

Run weekly or monthly to calibrate your practice.

#### Update — Pull Latest Content

```
/counsel-os:update
```

Or from the command line:
```bash
./update
```

This:
1. Pulls the latest plugin methodology (skills, primitives, scripts)
2. Shows what changed in law/ upstream and offers new practice content for your review
3. You decide what to apply to your vault — the plugin never overwrites your content

### Backup and Restore

```bash
# Back up your legal root (law, practice, matters, memory)
./backup

# Restore from the most recent backup
./restore

# Restore from a specific backup
./restore counsel-os-backup-20260313-143022
```

Backups are stored locally in `backups/` (gitignored). Entity files (company/counterparty files) are part of your vault and should be backed up via your vault's own backup mechanism (Obsidian Sync, git, etc.).

---

## How It Works

### Architecture

Counsel OS separates **methodology** (how to do legal work) from **knowledge** (what you know).

**The plugin provides methodology + tooling:**
- 6 skills: `counsel` (the orchestrator), `browse`, `retro`, `setup`, `update`, `export`
- 5 primitives (read, research, evaluate, draft, remember) that `counsel` composes dynamically based on intent
- Headless browser for document extraction
- Shell scripts for setup, backup, restore, update

**Your vault provides all knowledge:**
- Legal framework (law areas)
- Practice profile, standards, methods, and clause library
- Matter state (persistent per-engagement files)
- Institutional memory (decisions, exceptions, patterns)
- Entity files (companies, counterparties) — wherever you keep them

The plugin discovers content through two mechanisms:
1. **Legal root** — A configured path where Counsel OS manages framework content
2. **Entity lookup** — Two modes, auto-selected at setup:
   - **QMD mode** (preferred): entity files are found by content search and can live anywhere in your vault
   - **Filesystem mode** (fallback when QMD isn't installed): entity files live under `{legal_root}/entities/` and are discovered via grep

With QMD the plugin works with any vault structure — organize files however you want, and the skills find them. Without QMD you trade that flexibility for zero setup dependencies.

### 4-Layer Knowledge System

```
{legal_root}/
├── law/          Layer 1 — Hard constraints (regulations, statutes)
├── practice/     Layer 2 — YOUR standards, methods, library, and profile
├── matters/      Persistent state per engagement
└── memory/       Layer 4 — Accumulated decisions and patterns

{anywhere in your vault, or {legal_root}/entities/ without QMD}/
└── <company>.md  Layer 3 — Per-deal and per-counterparty overrides (discovered via entity lookup)
```

**Precedence rules:**

| Priority | Layer | Can be overridden? | Who manages it |
|----------|-------|--------------------|----------------|
| Highest | `law/` | Never — hard legal constraints | Seeded by plugin, customizable by you |
| 2 | Entity files | Per-deal only | You (via `remember`, proposed by counsel at close) |
| 3 | `practice/` | Your standards | You (through `/counsel-os:setup` or direct edits) |
| Lowest | `memory/` | Context only — informs, doesn't override | Automatic (via `remember` when counsel proposes) |

**Example:** Your standard liability cap is 12 months (`practice/standards/`). But for Acme Corp you've pre-approved 24 months (in your Acme Corp entity file). When reviewing an Acme contract, the system uses 24 months — but if GDPR requires a specific data processing provision (`law/`), that's non-negotiable regardless.

### Auto-Detection of Applicable Law

Each legal area in `law/` has trigger conditions — keywords, clause types, and regulatory references that indicate when it applies. When you bring a document to counsel, the `research` primitive scans it against all 26 areas and loads every match.

Current areas:

| Area | What It Covers |
|------|---------------|
| Data Privacy | GDPR, CCPA/CPRA, COPPA, state privacy, international, breach notification, transfers, DPAs |
| Consumer Protection | FTC/UDAP, TCPA, CAN-SPAM, auto-renewal, dark patterns, endorsements, Magnuson-Moss |
| Corporate | Entity formation, fiduciary duties, governance, M&A, investment transactions, shareholder agreements |
| Employment | At-will, contractors, non-competes, wage-and-hour, discrimination, benefits, severance, immigration |
| IP & Technology | Patents, trademarks, copyrights, trade secrets, SaaS, open source, domain names |
| Securities | Exemptions, equity issuance, blue sky laws, insider trading, public company, crowdfunding |
| Financial Services | Payments, KYC/AML, banking, lending, fintech, cryptocurrency, PCI DSS |
| Litigation | Demand letters, subpoenas, e-discovery, settlement, class actions, arbitration, privilege |
| Antitrust | Horizontal/vertical restraints, monopolization, merger review, state antitrust |
| Insurance | CGL, professional liability, cyber, D&O, EPLI, coverage analysis, claims procedures |
| International Trade | Sanctions, export controls, customs, anti-boycott, CFIUS, anti-corruption (FCPA) |
| Product Counseling | Product liability, recalls, warnings/labels, consumer product safety |
| AI & Automation | EU AI Act, US state AI laws, algorithmic accountability, training data, model ownership |
| Tax | Sales tax/VAT, withholding, transfer pricing, international tax, equity compensation |
| Real Estate | Commercial leases, zoning, construction, environmental covenants, easements, transactions |
| Environmental & ESG | Climate disclosure, environmental liability, ESG reporting, sustainability, due diligence |
| Bankruptcy & Restructuring | Automatic stay, executory contracts, preferences, IP in bankruptcy, safe harbors |
| Government Contracts | FAR/DFAR, procurement, compliance certifications, FOIA, sovereign immunity |
| Healthcare | HIPAA, Stark Law, Anti-Kickback, provider agreements, FDA, telehealth |
| Advertising & Media | Advertising standards, content licensing, right of publicity, influencer, defamation |
| Nonprofit | Tax-exempt status, charitable solicitation, donor restrictions, UBIT, governance |
| Cybersecurity | NIST frameworks, SEC cyber disclosure, CMMC, state breach laws, incident response |
| White Collar & Investigations | Internal investigations, whistleblower, DOJ cooperation, compliance programs |
| Accessibility | ADA Title III, Section 508, WCAG, website accessibility litigation, state laws |
| Franchise | FTC Franchise Rule, state franchise laws, franchise agreements, relationship laws |
| Labor Relations | NLRA, collective bargaining, union organizing, strikes and lockouts |

Multiple areas apply simultaneously and compound — a fintech SaaS contract triggers data privacy AND financial services AND consumer protection.

### What's Included

**Seed content (seeded into your vault on first setup):**
- 26 legal areas with auto-detection trigger conditions
- 24 standard clause positions (in `practice/standards/`)
- Method files with integrated checklists (in `practice/methods/`)
- 21 clause library categories with standard/aggressive/vendor-favorable/minimum language (in `practice/library/`)

Once seeded, you own all of this content. Customize law areas, rewrite methods, add your own clause language — it's your vault.

**You provide:**
- Your practice profile (organization, philosophy, risk appetite, voice, escalation criteria)
- Customizations to the seeded standards for your practice
- Your counterparty context (built over time through use)

---

## Customization

### Adding Counterparty Context

After working with a counterparty, counsel proposes creating an entity file (via `remember`). With QMD you choose where to save it — Counsel OS discovers it wherever it lives. Without QMD, entity files go under `{legal_root}/entities/`.

The entity file stores:
- Relationship history and notes
- Position overrides specific to this counterparty
- Past negotiation patterns ("Acme always pushes for 24-month caps")

For Counsel OS to discover entity files, add frontmatter:

```yaml
---
counsel-os-type: counterparty
counsel-os-category: Partner
counsel-os-tier: 1
counsel-os-status: executed
---
```

Next time you review a contract from that counterparty, the overrides load automatically.

### Updating Your Positions

As you work, the system learns. Counsel proactively suggests updates mid-matter and at close:

- "Your standards don't cover most-favored-nation clauses — should I add one to `practice/standards/`?"
- "You've accepted 24-month caps 3 times now — should I update your standard?"
- "This counter-language worked well — should I add it to `practice/library/`?"

You approve each change. Over time, your standards reflect your actual practice.

### Adding New Legal Areas

Create a new `.md` file in `{legal_root}/law/`:

```
{legal_root}/law/new-area.md
```

Include trigger conditions at the top. The `research` primitive will automatically detect and load it — no other changes needed.

### Structure-Agnostic Design

Counsel OS doesn't impose a folder structure on your vault. The plugin needs two things:

1. **A legal root path** (in `config.md`) — where it manages framework content (law/, practice/, matters/, memory/)
2. **Frontmatter on entity files** — so the entity lookup can discover them

With QMD, entity files can live anywhere — keep companies in `Companies/`, `Clients/`, or scattered across your vault. Without QMD, entity files live under `{legal_root}/entities/`. Either way, as long as files have `counsel-os-type` frontmatter, the skills will find them.

---

## License

MIT

---

## Built by Eigen Legal

Counsel OS is a free, open source tool built by [Eigen Legal](https://eigenlegal.com). We help law firms and in-house legal teams build custom AI workflows — trained on your standards, your methods, and your judgment.

Want a custom version built for your practice? [Book a free consultation](https://eigenlegal.com)
