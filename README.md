# Counsel OS

A legal operating system for Claude. Review contracts, triage NDAs, negotiate redlines, assess compliance, and more — all grounded in your standards, your methods, and your judgment.

Built for solo practitioners, law firms, and in-house counsel.

## Installation

Counsel OS runs in **Claude Desktop (Cowork)** for lawyers and in **Claude Code** for developers. Pick the path that matches the tool you already use.

### Claude Desktop / Cowork — recommended for lawyers

No terminal required.

1. Open **Claude Desktop** → **Cowork** → **Customize** → **Plugins** → **Add marketplace**
2. Paste `https://github.com/eigenlegal/counsel-os` and confirm
3. Install **Counsel OS** from the new marketplace
4. Start a **new conversation** and run `/counsel-os:setup`

The setup skill walks you through choosing a folder for your legal content, seeds the 26 law areas and practice content into it, and configures your practice profile through chat. No file editing, no terminal commands.

> **Note:** Three features require Claude Code's CLI access and aren't available in Cowork:
> - **`/counsel-os:browse`** — headless browser for portals and document extraction
> - **Native Word `.docx` redlines with tracked changes** — counsel can produce a real Microsoft Word file with tracked changes attributed to you and counterparty-facing comments, ready to drop into your Review/Accept workflow. Requires python-docx + AppleScript driving Word's Compare. Cowork produces markdown redlines instead — same edits, different format.
> - **Structured markup ingestion** — when a counterparty returns a `.docx` with tracked changes, counsel extracts every change and comment into a change-by-change assessment (`read --redline`, via `scripts/extract_redlines.py`). In Cowork, share the returned redline as text or markdown instead.
>
> All other skills work identically.

### Claude Code with local install — recommended for developers

```bash
git clone https://github.com/eigenlegal/counsel-os.git ~/counsel-os
claude --plugin-dir ~/counsel-os
```

The `--plugin-dir` flag loads the plugin directly from the cloned directory — no marketplace, no cache layer to invalidate. Make it stick by adding an alias to `~/.zshrc` (or `~/.bashrc`):

```bash
alias claude='claude --plugin-dir ~/counsel-os'
```

Then start a new Claude Code session and run:

```
/counsel-os:setup
```

Counsel OS is skill-first: setup is written as an `.md` skill so Claude can adapt it to your vault, permissions, shell environment, and connected tools. The repo's shell scripts are only narrow mechanical helpers for deterministic tasks.

**Optional dependencies:**
- **[Bun](https://bun.sh/)** plus Playwright Chromium (`bunx playwright install chromium`) — only for building the `/counsel-os:browse` browser skill from source. Without them, browse downloads a prebuilt binary and matching browser builds from the GitHub release automatically on first use (set `COUNSEL_OS_NO_DOWNLOAD=1` to disable)
- **pandoc** — for extracting tracked changes from Word documents
- **[QMD](https://github.com/tobi/qmd)** — content-index MCP server for entity discovery across your whole vault. Install separately as its own Claude plugin (works in Claude Code and Cowork). Without it, entity files live under `{legal_root}/entities/` and are found via filesystem search.

The setup skill auto-detects what you have and configures accordingly.

### Claude Code marketplace — experimental

Claude Code's plugin marketplace is the "official" install path. On current Claude Code builds, updates flow cleanly through `/counsel-os:update` followed by `/reload-plugins`. On older builds the cache invalidation is fragile — installs can get stuck on old manifests, and updates can require a full Cmd-Q restart. If your install gets stuck, the local-install path above is the reliable fallback.

```
/plugin marketplace add eigenlegal/counsel-os
/plugin install counsel-os@eigenlegal
```

Once installed, Claude Code caches the plugin under `~/.claude/plugins/cache/eigenlegal/counsel-os/{version}/` and updates flow through `/counsel-os:update`.

If install fails or seems stuck:

```bash
# Refresh the marketplace clone
cd ~/.claude/plugins/marketplaces/eigenlegal && git pull

# Then fully restart Claude Code (Cmd-Q — closing the window isn't enough,
# Claude Code holds the manifest in memory). Retry the install.
```

If that still doesn't work, fall back to the local install above — same content, same skills, no marketplace layer.

---

## Setup

After installing, run `/counsel-os:setup` (Cowork or Claude Code) — it walks you through the full configuration in chat:

| Step | What It Configures | Time |
|------|--------------------|------|
| Legal root | Where Counsel OS stores law areas, practice content, and memory in your vault | ~1 min |
| Optional tools | Whether you want to use a plain folder, Obsidian, QMD, or filesystem fallback | ~1 min |
| `profile.md` | Your organization, legal philosophy, risk appetite, writing style, escalation criteria | ~5 min |
| Standards customization | Review and adjust the 24 standard clause positions for your practice | ~10 min |

Claude Code users get the same flow plus optional environment checks (Bun, pandoc).

You can edit any of these files directly in `{legal_root}/practice/` later.

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
> Opposing counsel sent back a markup — assess the changes
> Import this folder of form agreements as reference
> Is this compliant with GDPR?
> Close this matter
```

The counsel skill handles intake, analysis, negotiation language, delivery, and closeout as one continuous conversation. It auto-detects applicable law areas, loads your effective positions (merging law → entity → practice → memory), and proposes knowledge updates as it works.

**Word tracked-changes redlines (Claude Code only).** When you ask counsel to redline a contract, it produces a native Microsoft Word `.docx` with tracked changes attributed to you, plus counterparty-facing comments explaining the rationale for each edit. Opens straight into Word's Review pane — Accept, Reject, and reply work like any other tracked-changes file from a colleague. The pipeline uses python-docx to apply edits and AppleScript driving Word's Compare to produce the final tracked-changes document. Memos, summaries, and emails come back as formatted markdown. Cowork users get markdown redlines instead.

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

Analyzes your matter history and produces insights, calibrated to the shape of your practice:

- **High-volume practices** (many similar contracts against the same positions) get the full statistical pass: most-negotiated clauses, acceptance and exception rates, counterparties that push back hardest, standards that keep getting overridden (maybe the standard is wrong?), and trends compared to previous retros. Per-clause statistics only run where there are roughly 10+ comparable matters — below that, deviations are reported as case notes, not percentages.
- **Low-volume, heterogeneous practices** (most solo and in-house work) skip the statistics and center on **harvesting promotable knowledge**: sweeping matter and entity files for deal-archetype playbooks, regulatory-posture notes, and proven clause language that has outgrown its matter and belongs in `practice/`.

Run monthly to calibrate your practice.

#### Update — Pull Latest Content

```
/counsel-os:update
```

This:
1. Helps update plugin methodology through your install path (marketplace or local git clone)
2. Shows what changed in law/ upstream and offers new practice content for your review
3. Lets you decide what to apply to your vault — the plugin never overwrites practice content without approval

When upgrading from an older Counsel OS install, `/counsel-os:update` also performs a one-time migration to the current marked config format:

```markdown
counsel-os-config: true
config_version: 1
legal_root: /path/to/your/legal/root
```

#### Doctor — Health Check

```
/counsel-os:doctor
```

Read-only diagnostic: verifies legal-root resolution and config, vault structure, plugin version vs latest, law-content currency, optional dependencies (pandoc, python-docx, bun, Playwright, QMD), browse daemon build, backup freshness, and vault git hygiene — one ✅/⚠️/❌ table with a fix command per row. Run monthly and after every update. See `docs/operations.md` for recommended cadences across all the maintenance skills.

### Backup and Restore

```bash
# Back up your legal root (law, practice, matters, memory, entities)
./backup

# Restore from the most recent backup
./restore

# Restore from a specific backup
./restore counsel-os-backup-20260313-143022
```

Backups are stored in `~/.counsel-os/backups/` — outside the plugin directory, so they survive plugin updates and reinstalls. Backups created by older versions inside the plugin's `backups/` folder are migrated automatically the next time `./backup` runs, and `./restore` still finds them in the meantime. For routine use, prefer your vault's normal backup or version-control workflow; these scripts are local Claude Code helpers.

### Scripts Reference

Everything in `scripts/` is a narrow, deterministic helper. The document-pipeline scripts are normally driven *by counsel* during a redline — you rarely need to run them yourself, but they work standalone when you do.

#### Document pipeline (Claude Code + macOS)

| Script | What it does | When to run it yourself |
|--------|-------------|------------------------|
| `scripts/apply_redlines.py <original.docx> <redlines.json> <output.docx>` | Applies text replacements and margin comments to a `.docx` (python-docx). Sees text inside hyperlinks and tracked insertions; refuses ambiguous matches until disambiguated. | Re-applying an edited redline spec without redoing the analysis; debugging why a specific replacement didn't land (it reports found/skipped per item). |
| `scripts/word_compare.sh <original.docx> <modified.docx> <author> <output.docx>` | Drives Microsoft Word's Compare via AppleScript to produce a native tracked-changes `.docx` attributed to `<author>`. Requires Word for Mac; paths must be user-accessible (not `/tmp`). | Regenerating the tracked-changes file after hand-editing the modified version; producing a redline between any two documents outside a counsel session. |
| `scripts/clean_format.py <input.docx> <output.docx> [--template <path>]` | Rebuilds a messy `.docx` against the professional style template (`scripts/legal-template.docx`): consistent heading numbering, list formatting, smart quotes. Warns on content controls and merged cells. | A counterparty draft is too mangled to redline cleanly; normalizing a doc before comparison. |
| `scripts/import_reference.sh <source-dir> <collection> [--source "attribution"]` | Imports third-party material (sample agreements, form books, checklists — .docx/.doc/.md) into `practice/reference/<collection>/` with provenance frontmatter, the reference-only banner, and index registration. | Adding a form book or agreement set to your searchable reference quarry. Or just tell counsel: "import this folder as reference." |
| `scripts/extract_redlines.py <input.docx> [--format markdown]` | Extracts tracked changes and comments into structured records: per changed paragraph, original vs revised text, inserted/deleted fragments, author, date, section context, anchored comments. | A counterparty returned a markup — counsel uses this for the change-by-change assessment (`read --redline`); run it directly for a quick review table. |

The redline flow counsel runs for you: analysis → `apply_redlines.py` (edits + comments on a copy) → `word_compare.sh` (real tracked changes) — see `primitives/draft.md` and `primitives/redline-output.md`.

#### Diagnostics

| Script | What it does | When |
|--------|-------------|------|
| `scripts/resolve_legal_root.sh` | Canonical legal-root discovery. Prints the marked root and exits 0; exits 1 if none found, 2 if multiple (candidates on stderr). | Debugging "I don't see a marked Counsel OS legal root" — run it directly to see what discovery sees. Honors `COUNSEL_OS_LEGAL_ROOT` and the `~/.counsel-os/legal-root` pointer cache. |

#### Maintainer / contributor scripts

Only relevant if you're developing Counsel OS itself:

| Script | What it does | When |
|--------|-------------|------|
| `scripts/release.sh <X.Y.Z> -m "subject" [-b "body"] [--no-tag] [--no-push]` | One-command release: bumps all four version manifests, prepends the CHANGELOG entry, runs the lint + version-sync gate, commits the working tree, tags `vX.Y.Z` (fires the release-binaries workflow), pushes commit + tag. | Every release. Never bump the four manifests by hand. |
| `scripts/lint_knowledge.py [--check-versions]` | Lints `knowledge/` conventions (no checkboxes, no H2-before-H1, frontmatter present) and, with the flag, verifies the four manifests agree. Runs in CI. | Before committing knowledge content changes. |
| `scripts/bump_content_versions.py [--date YYYY-MM-DD]` | Hashes each content group and bumps `content-version` frontmatter for groups that changed — this is what lets `/counsel-os:update` detect upstream law/practice changes. | After editing anything under `knowledge/law/` or `knowledge/practice-seed/`. |
| `scripts/validate_law_frontmatter.py` | Validates law-area frontmatter against `knowledge/law/frontmatter-policy.json`; reports attestations coming due. Runs in CI. | After editing law frontmatter; periodically to see attestation debt. |
| `scripts/run_evals.py [--generate] [--model <id>] [--only <fixture>] [--self-test]` | Scores golden-matter eval outputs in `evals/`; `--generate` runs the counsel agent headlessly against each fixture's mini-vault first (costs API tokens); `--self-test` validates the scorer itself (free, runs in CI). | Full generate+score before releases and when qualifying a new model; see `evals/README.md`. |

---

## Confidentiality & Data Flow

Counsel OS handles client material. Know where data goes before pointing it at privileged or confidential documents.

**What leaves your machine:**

- Conversation content, and the contents of any file Claude reads — contracts, matter files, vault notes — go to the Anthropic API (or whichever model provider your Claude installation is configured to use) for processing. This is how Claude works; the plugin neither adds to it nor can remove it.
- Web research sends your queries and visited URLs to search engines and the sites being fetched.
- Retention of API traffic is governed by your Anthropic plan and organization settings, not by this plugin. Check your organization's AI usage policy and its API data-retention configuration before processing privileged material — no retention promises are made here, because retention is a property of your account, not of Counsel OS.

**What stays local:**

- **Your vault.** All law, practice, matter, entity, and memory content is plain markdown in a folder you chose. It is mirrored elsewhere only if you put the vault somewhere synced (iCloud, Dropbox, a git remote).
- **The QMD search index**, if installed, is built and queried locally.
- **The browse skill** runs a local headless Chromium; its daemon binds to 127.0.0.1 only, and pages it visits are fetched directly from your machine, like any browser you run.
- **Backups** (`./backup`) are written to `~/.counsel-os/backups/` on your machine — never to the plugin directory, a remote, or anywhere synced unless your home folder is.

**Git history is permanent.** If you version your vault with git (recommended), closed matters and deleted files persist in history: deleting a file removes it from the working tree, not from past commits. Keep vault remotes private. The only true deletion is rewriting history (`git filter-repo` or equivalent, then a force-push) — and even that does not reach clones that already exist.

**Browser cookie hygiene.** The browse skill's `cookie-import` command reads cookie JSON files you export from your browser; the skill expects them under `/tmp` or the working directory. Those files contain live session credentials and stay on disk until you delete them — delete them after import. `cookie-import-browser` decrypts cookies directly from a local Chromium browser's store into the running session without writing an export file. Imported cookies live in the headless browser's memory and are discarded when the daemon exits (it auto-stops after 30 minutes idle); the daemon's `/tmp/browse-server*.json` state file holds only a port, PID, and local auth token — no cookies. If you use a third-party cookie-export tool, check where it writes its files.

**No telemetry.** The plugin makes no network calls of its own — no analytics, no phone-home, no external services beyond the model API and the sites you ask it to research or browse.

---

## How It Works

### Architecture

Counsel OS separates **methodology** (how to do legal work) from **knowledge** (what you know).

**The plugin provides methodology + tooling:**
- 6 skills: `counsel` (the orchestrator), `browse`, `retro`, `setup`, `update`, `law-refresh`
- 5 primitives (read, research, evaluate, draft, remember) that `counsel` composes dynamically based on intent
- Headless browser for document extraction
- Narrow deterministic helpers for backup/restore, Word redlines, formatting, and browser automation

**Your vault provides all knowledge:**
- Legal framework (law areas)
- Practice profile, standards, methods, and clause library
- Matter state (persistent per-engagement files)
- Institutional memory (decisions, exceptions, patterns)
- Entity files (companies, counterparties) — wherever you keep them

The plugin discovers content through two mechanisms:

1. **Legal root** — A configured folder in your vault where Counsel OS manages framework content: `law/`, `practice/`, `matters/`, `memory/`.

2. **Entity lookup** — When you ask about a counterparty, vendor, or matter, Counsel OS finds the relevant note from your vault and merges it into the legal context. The mechanism is auto-detected at runtime based on what's connected in your session:

   - **With a content-index connector (recommended)** — pulls from your existing notes wherever they live.

     If [QMD](https://github.com/tobi/qmd) (or any MCP server exposing a `query` tool over markdown frontmatter) is connected, Counsel OS finds notes by frontmatter, **anywhere in your Obsidian vault** — not just inside the legal root. Tag any note as a counterparty:

     ```yaml
     ---
     counsel-os-type: counterparty
     ---
     ```

     Now when you ask *"what did we agree with Acme?"*, counsel pulls in your Acme note from wherever it lives — `Companies/Acme.md`, `Clients/2025/Acme.md`, scattered across your vault, doesn't matter. Your existing meeting notes, deal history, and counterparty research stay where you already keep them, and get pulled into legal work automatically. The legal root stays small and focused; the relationship knowledge lives in your vault, organized your way.

     Supported types: `counterparty`, `vendor`, `customer`, `prospect`, `matter`.

     QMD ships as its own Claude plugin — install separately, no extra Counsel OS configuration needed. Works in both Claude Code and Cowork.

   - **Filesystem fallback (when no index tool is connected)** — entity files live at a fixed location, `{legal_root}/entities/`, discovered via grep on the same `counsel-os-type` frontmatter. Same metadata, less structural flexibility — you have to put files in the entities folder for them to be found.

### 4-Layer Knowledge System

```
{legal_root}/
├── law/          Layer 1 — Hard constraints (regulations, statutes)
├── practice/     Layer 3 — YOUR standards, methods, library, and profile
│   └── reference/  Curated source material (not a precedence layer — informs, never governs)
├── matters/      Persistent state per engagement (not a precedence layer)
└── memory/       Layer 4 — Accumulated decisions and patterns

{anywhere in your vault, or {legal_root}/entities/ when no index tool is connected}/
└── <company>.md  Layer 2 — Per-deal and per-counterparty overrides (discovered via entity lookup)
```

**Precedence rules:**

| Priority | Layer | Can be overridden? | Who manages it |
|----------|-------|--------------------|----------------|
| Highest | `law/` | Never — hard legal constraints | Seeded by plugin, customizable by you |
| 2 | Entity files | Per-deal only | You (via `remember`, proposed by counsel at close) |
| 3 | `practice/` | Your standards | You (through `/counsel-os:setup` or direct edits) |
| Lowest | `memory/` | Context only — informs, doesn't override | Automatic (via `remember` when counsel proposes) |

**Example:** Your standard liability cap is 12 months (`practice/standards/`). But for Acme Corp you've pre-approved 24 months (in your Acme Corp entity file). When reviewing an Acme contract, the system uses 24 months — but if GDPR requires a specific data processing provision (`law/`), that's non-negotiable regardless.

**These rules are tested, not just stated.** The repo ships safety-rule evals (`evals/`) — live agent runs against fixture vaults engineered to tempt each failure: a practice standard that permits what law forbids, a reference form presented as "our position," another counterparty's concession offered as precedent, and an always-escalate threshold under sign-today deal pressure. All four must pass before release. See `evals/README.md`.

### Continuous Learning

Counsel OS gets smarter as you use it. The `remember` primitive watches your work and proposes updates to your knowledge base — not just at the end of a matter, but whenever it notices something worth capturing.

What gets proposed, when:

- **Mid-matter, opportunistically** — *"You're accepting a 24-month liability cap here, but your standard is 12 months. Want me to flag this as a deal-specific override on the Acme entity file?"*
- **When a pattern emerges** — *"You've accepted 24-month caps with this counterparty 3 times now. Want to update your standard for them, or update your practice default?"*
- **When a gap shows up** — *"Your standards don't cover most-favored-nation clauses, but this contract has one. Want me to add a position to `practice/standards/`?"*
- **When language works** — *"This counter-language landed cleanly. Want me to add it to `practice/library/` as a vendor-favorable variant?"*
- **At matter close** — proposes a counterparty file with deal history, position overrides, and negotiation notes you can refer to next time.

You approve every change. Nothing gets written to your knowledge without consent. Over time, your `practice/` reflects your actual practice, your entity files capture relationship-specific context, and your `memory/patterns.md` accumulates cross-cutting observations that inform future work.

This is the loop that makes Counsel OS valuable beyond a one-shot review: every matter you close makes the next one a little sharper.

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
- A `practice/reference/` area for curated source material you import (example agreements, checklists, treatise excerpts) — outside the precedence layers, mined for issue-spotting and sample language

Once seeded, you own all of this content. Customize law areas, rewrite methods, add your own clause language — it's your vault.

**You provide:**
- Your practice profile (organization, philosophy, risk appetite, voice, escalation criteria)
- Customizations to the seeded standards for your practice
- Your counterparty context (built over time through use)

---

## Customization

### Adding Counterparty Context

After working with a counterparty, counsel proposes creating an entity file (via `remember`). With a content-index connector (e.g. QMD) you choose where to save it — Counsel OS discovers it wherever it lives. Without one, entity files go under `{legal_root}/entities/`.

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

You can edit `practice/standards/` and `practice/library/` files directly any time — they're plain markdown in your vault. But you usually won't need to: counsel proactively suggests updates as it works (see [Continuous Learning](#continuous-learning) above for how this loop runs).

### Law Content: Who Maintains What

Law files are physical copies in your vault, but by default they're **plugin-managed**: the maintainers refresh the shipped content against primary sources (with dated `last-reviewed` attestations and cited authorities), and `/counsel-os:update` syncs the results into your vault. You get currency without doing the maintenance.

Ownership is a dial, not a switch:

| You want | Do this | Then |
|----------|---------|------|
| Batteries included (default) | Nothing | Law arrives via `/counsel-os:update`; set `auto_apply_law_updates: true` in `config.md` to skip per-update prompts |
| Add your own law area | Create `{legal_root}/law/your-area/` (or a single `.md`) with trigger conditions at the top | It's yours automatically — update never touches areas it doesn't ship; the `research` primitive auto-detects it; `/counsel-os:law-refresh` keeps it current |
| Customize one shipped file and keep your edits | Add `managed-by: user` to that file's frontmatter | Update permanently skips it (even with auto-apply); `/counsel-os:law-refresh` maintains it. You own its currency from then on |
| Own the whole law library | Set `law_management: user` in `config.md` | Update stops syncing law entirely; `/counsel-os:law-refresh` is your maintenance tool |

**`/counsel-os:law-refresh`** runs the same verify-and-patch method the maintainers use upstream — extract perishable claims, verify against primary sources, patch the deltas, and stamp attestations after your review — but only on content *you* own. Run it quarterly for fast-moving custom areas.

**The responsibility line, plainly:** Counsel OS ships law content with dated, source-cited attestations — but it is not legal advice, attestations are point-in-time, and nothing here replaces a lawyer's professional duty to verify current law before relying on it. Content you take ownership of is yours to keep current.

---

## License

MIT

---

## Built by Eigen Legal

Counsel OS is a free, open source tool built by [Eigen Legal](https://eigenlegal.com). We help law firms and in-house legal teams build custom AI workflows — trained on your standards, your methods, and your judgment.

Want a custom version built for your practice? [Book a free consultation](https://eigenlegal.com)
