# Counsel OS

A legal operating system for Claude. Review contracts, triage NDAs, negotiate redlines, assess compliance, and more — all grounded in your standards, your playbooks, and your judgment.

Built for solo practitioners, law firms, and in-house counsel.

## Installation

### Claude Code (CLI)

```bash
# Clone the repo
git clone https://github.com/jw2856/counsel-os.git ~/counsel-os
cd ~/counsel-os

# Run setup (copies templates, optionally builds browser)
./setup

# Start Claude Code
claude
```

The setup script:
- Copies template files into `knowledge/practice/`, `knowledge/matters/`, and `knowledge/memory/`
- If [Bun](https://bun.sh/) is installed, builds the headless browser binary for `/counsel-os:browse`
- Does not overwrite existing files if you've already customized

**Requirements:** Git. Bun is optional (only needed for the `/counsel-os:browse` browser skill).

### Claude Desktop (Cowork)

1. Download this repo as a `.zip` file (Code → Download ZIP on GitHub)
2. Open **Claude Desktop** → **Cowork** → **Customize** → **Browse plugins**
3. Upload the `.zip` file — it installs automatically
4. Start a **new conversation** in Cowork mode — the skills are now active

> **Note:** The `/counsel-os:browse` skill (headless browser) is not available in Cowork since it requires CLI access. All other skills work identically.

To edit files after installing in Cowork:
1. Go to **Cowork** → **Customize** and find the Counsel OS plugin
2. Click **Edit** to open the plugin editor
3. Navigate to `knowledge/practice/` and edit your profile files
4. Changes save automatically and take effect in your next conversation

### As a Claude Code Plugin

```bash
# If distributed via the plugin marketplace
claude plugin add counsel-os
```

Or symlink manually to use from any directory:
```bash
ln -s ~/counsel-os ~/.claude/plugins/counsel-os
```

### Install Into a Specific Project

```bash
cp -r ~/counsel-os /path/to/your/project/.claude/plugins/counsel-os
cd /path/to/your/project/.claude/plugins/counsel-os && ./setup
```

The skills are then available when you open Claude Code in that project.

---

## Setup

After installing, run the guided onboarding:

```
/counsel-os:setup
```

This walks you through 5 files interactively:

| File | What It Configures | Time |
|------|--------------------|------|
| `identity.md` | Your organization, entities, team, regulatory posture | ~3 min |
| `principles.md` | Legal philosophy, risk appetite, negotiation style | ~3 min |
| `positions.md` | Your standard clause positions (overrides to market defaults) | ~5 min |
| `voice.md` | Writing style, tone, formality by audience | ~2 min |
| `thresholds.md` | Escalation criteria, dollar tiers, auto-approval rules | ~2 min |

You can also edit these files directly in `knowledge/practice/`.

**Optional:** Provide 3-5 past contracts during setup and the system will analyze them to infer your actual positions — often more accurate than describing them in the abstract.

---

## Usage

### The Pipeline

Every legal matter flows through phases. Run them in order, or skip to what you need.

#### Phase 1: Intake

```
/counsel-os:intake path/to/contract.pdf
```

Or describe the matter:
```
/counsel-os:intake "NDA from Acme Corp, standard bilateral, they sent their paper, need it back by Friday"
```

Intake does:
- Accepts documents (PDF, DOCX, URL, pasted text, or plain description)
- Auto-detects which legal areas apply (data privacy, employment, IP, etc.)
- Classifies the matter type (contract review, NDA triage, compliance, etc.)
- Loads your effective positions (merging all 5 knowledge layers)
- Estimates complexity (simple/standard/complex)
- Recommends which phases to run next

#### Phase 2: Analyze

```
/counsel-os:analyze
```

- Runs the matching playbook (contract review, NDA triage, etc.)
- Clause-by-clause analysis against your effective positions
- Classifies each finding: **GREEN** (acceptable), **YELLOW** (negotiate), **RED** (escalate)
- Any conflict with `law/` is automatically RED regardless of other layers
- Produces risk assessment with severity and priority tiers

#### Phase 3: Negotiate

```
/counsel-os:negotiate
```

- For each YELLOW and RED finding: current language, proposed revision, rationale, fallback position
- Pulls proven counter-language from the clause library where available
- Prioritizes: Tier 1 (must-have), Tier 2 (strong preference), Tier 3 (nice-to-have)
- Builds a negotiation strategy: lead issues, concession candidates, sequencing

#### Phase 4: Deliver

```
/counsel-os:deliver
```

- Packages the output in the right format (memo, redline, analysis report)
- Applies your writing style from `voice.md`
- Posts to connected services (Slack, Google Drive, etc.) if configured

#### Phase 5: Close

```
/counsel-os:close
```

- Suggests knowledge updates based on the work just completed
- Logs decisions, exceptions, and patterns to `memory/`
- Creates or updates counterparty files in `matters/`
- Identifies gaps in your positions and suggests additions
- You approve each update before it's written

### Quick Workflows

Not every matter needs all 5 phases. Common shortcuts:

```bash
# Quick NDA triage — intake classifies and analyze runs the NDA checklist
/counsel-os:intake path/to/nda.pdf
/counsel-os:analyze

# Contract review with redlines
/counsel-os:intake path/to/agreement.pdf
/counsel-os:analyze
/counsel-os:negotiate

# Just need a legal memo
/counsel-os:intake "Can we do X under Y regulation?"
/counsel-os:analyze

# Full pipeline for a complex deal
/counsel-os:intake path/to/msa.pdf
/counsel-os:analyze
/counsel-os:negotiate
/counsel-os:deliver
/counsel-os:close
```

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
1. Automatically backs up your user content first
2. Pulls the latest `law/` and `defaults/` content
3. Shows what changed (new regulations, updated positions, new playbooks)
4. Verifies your `practice/`, `matters/`, and `memory/` are untouched

### Backup and Restore

```bash
# Back up your practice data
./backup

# Restore from the most recent backup
./restore

# Restore from a specific backup
./restore counsel-os-backup-20260313-143022
```

Backups are stored locally in `backups/` (gitignored). The update script automatically backs up before pulling new content.

---

## How It Works

### 5-Layer Knowledge System

```
knowledge/
├── law/          Layer 1 — Hard constraints (regulations, statutes)
├── defaults/     Layer 2 — Market-standard positions and playbooks
├── practice/     Layer 3 — YOUR judgment and standards
├── matters/      Layer 4 — Per-deal and per-counterparty overrides
└── memory/       Layer 5 — Accumulated decisions and patterns
```

**Precedence rules:**

| Priority | Layer | Can be overridden? | Who manages it |
|----------|-------|--------------------|----------------|
| Highest | `law/` | Never — hard legal constraints | Product updates |
| 2 | `matters/` | Per-deal only | You (through `/counsel-os:close`) |
| 3 | `practice/` | Your standards | You (through `/counsel-os:setup`) |
| 4 | `defaults/` | Market defaults | Product updates |
| Lowest | `memory/` | Context only — informs, doesn't override | Automatic (through `/counsel-os:close`) |

**Example:** Your standard liability cap is 12 months (`practice/`). The market default is also 12 months (`defaults/`). But for Acme Corp you've pre-approved 24 months (`matters/counterparties/acme-corp.md`). When reviewing an Acme contract, the system uses 24 months — but if GDPR requires a specific data processing provision (`law/`), that's non-negotiable regardless.

### Auto-Detection of Applicable Law

Each legal area in `knowledge/law/` has an `overview.md` with trigger conditions — keywords, clause types, and regulatory references that indicate when it applies. During intake, the system scans your document against all 12 areas and loads every match.

Current areas:

| Area | What It Covers |
|------|---------------|
| Data Privacy | GDPR, CCPA/CPRA, US state privacy, international transfers |
| Consumer Protection | FTC/UDAP, state consumer laws, auto-renewal |
| Corporate | Entity types, governance, M&A |
| Employment | At-will, contractor classification, non-competes |
| IP & Technology | Patents, trade secrets, SaaS, open source |
| Securities | Exemptions, equity issuance |
| Financial Services | Payments, licensing, KYC/AML |
| Litigation | Demand letters, subpoenas, regulatory inquiries, litigation holds |
| Antitrust | Competition law |
| Insurance | Coverage types and requirements |
| International Trade | Sanctions, export controls |
| Product Counseling | Product liability |

Multiple areas apply simultaneously and compound — a fintech SaaS contract triggers data privacy AND financial services AND consumer protection.

### What's Included

**Product content (updated by us):**
- 12 legal areas with auto-detection trigger conditions
- 13 market-standard clause positions
- 11 playbooks with step-by-step processes
- 6 checklists for completeness
- 6 clause library categories with standard/aggressive/minimum language

**You provide:**
- Your organization context
- Your legal principles and risk appetite
- Your standard positions (overrides to our defaults)
- Your counterparty context (built over time through use)

---

## Customization

### Adding Counterparty Context

After working with a counterparty, `/counsel-os:close` offers to create a context file:

```
knowledge/matters/counterparties/acme-corp.md
```

This file stores:
- Relationship history and notes
- Position overrides specific to this counterparty
- Past negotiation patterns ("Acme always pushes for 24-month caps")

Next time you review an Acme contract, these overrides load automatically.

### Updating Your Positions

As you work, the system learns. After each matter, close suggests updates:

- "Your positions don't cover most-favored-nation clauses — should I add one?"
- "You've accepted 24-month caps 3 times now — should I update your standard?"
- "This counter-language worked well — should I add it to the clause library?"

You approve each change. Over time, your positions reflect your actual practice.

### Adding New Legal Areas

Create a new directory in `knowledge/law/` with an `overview.md`:

```
knowledge/law/ai-and-automation/
  overview.md       ← trigger conditions for when this area applies
  eu-ai-act.md      ← specific regulation
  us-state-ai.md    ← state-level AI laws
```

The intake skill will automatically detect and load it — no other changes needed.

---

## License

MIT

---

## Built by Eigen Legal

Counsel OS is a free, open source tool built by [Eigen Legal](https://eigenlegal.com). We help law firms and in-house legal teams build custom AI workflows — trained on your standards, your playbooks, and your judgment.

Want a custom version built for your practice? [Book a free consultation](https://eigenlegal.com)
