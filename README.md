# Counsel OS

A free, open-source legal operating system for Claude. Review contracts, triage NDAs, negotiate redlines, assess compliance, and more, all grounded in your own standards, methods, and judgment, running locally over your own markdown vault.

Built for solo practitioners, law firms, and in-house counsel. MIT-licensed. No telemetry.

## Quickstart

Counsel OS runs inside **Claude Code** (terminal) or **Claude Desktop / Cowork** (no terminal). Same skills either way.

**1. Install** (Claude Code marketplace, the recommended path):

```
/plugin marketplace add eigenlegal/counsel-os
/plugin install counsel-os@eigenlegal
```

**2. Set up your practice.** Start a new session and run:

```
/counsel-os:setup
```

Express setup takes about **3 minutes**: it picks a folder in your vault, asks a few identity basics and one question about the kind of law you practice, and seeds a working practice profile plus a full set of clause positions. (A Custom path with the full interview is one keystroke away.)

**3. See it work:**

```
/counsel-os:demo
```

The demo shows you what Counsel OS can do (each capability with the exact command to try it), then offers one live run: it reviews a bundled **synthetic** NDA against *your own* seeded positions and produces a verdict plus a redline. Nothing is written to your vault.

That's the whole loop: install, then `/counsel-os:setup` (3 min), then `/counsel-os:demo`. The rest of this README is reference.

> On **Claude Desktop / Cowork** (no terminal), install via the in-app marketplace instead (see [Installation](#installation)), then run the same `/counsel-os:setup` and `/counsel-os:demo` in a new conversation.

---

## What It Does

You describe what you need in plain language; the `/counsel-os:counsel` skill auto-activates and composes five primitives (`read`, `research`, `evaluate`, `draft`, `remember`) based on your intent. There is no pipeline and no slash-command-per-phase.

- **Review a contract** against your positions → clause-by-clause verdicts (green/yellow/red) with rationale and citations.
- **Redline it** → a marked-up document with your edits and counterparty-facing comments (native Word tracked changes on macOS Claude Code; markdown elsewhere).
- **Assess compliance** → auto-detects applicable law across 26 areas (GDPR, CCPA, HIPAA, SEC, FCPA, and more) and flags gaps.
- **Ingest a returned markup** → extracts every tracked change and comment into a change-by-change assessment.
- **Recall and remember** → "what did we agree with Acme?"; counsel proposes knowledge updates as it works, and you approve every one.
- **Draft** memos, policies, notices, and correspondence in your voice.
- **Maintain** your practice with `/counsel-os:retro` (analytics), `/counsel-os:doctor` (health check), and `/counsel-os:update` (content sync).

Everything is grounded in a vault you own: plain markdown files you can read, edit, and version-control.

### Platform Matrix

The full methodology, all 26 law areas, and your vault work everywhere. A few capabilities depend on Claude Code's CLI access, and native Word output additionally needs macOS:

| Capability | Claude Code — macOS | Claude Code — Linux / Windows | Claude Desktop / Cowork |
|------------|:---:|:---:|:---:|
| `counsel` + 5 primitives, 26 law areas, your vault | ✅ | ✅ | ✅ |
| Contract review, compliance assessment, memos, recall | ✅ | ✅ | ✅ |
| Redline **output** as a native Word `.docx` (tracked changes) | ✅ | markdown redline | markdown redline |
| **Ingest** a counterparty's `.docx` markup (change-by-change) | ✅ | ✅ | share as text / markdown |
| `/counsel-os:browse` (headless browser for portals, EDGAR) | ✅ | ✅ | not available |

Native Word redlines use python-docx to apply edits and AppleScript driving Word's Compare, which is why they need macOS and Word for Mac. On every other platform, counsel returns those edits as a markdown redline instead. Memos, summaries, and emails come back as formatted markdown everywhere.

---

## Installation

Counsel OS runs in **Claude Code** (terminal) or **Claude Desktop (Cowork)** (no terminal), the same skills either way. Pick by the app you already use:

- **Claude Code → marketplace** (recommended): the most automated path (versioned, self-updating, no build toolchain)
- **Claude Desktop → Cowork**: no terminal required
- **Claude Code → local clone**: only if you're developing the plugin itself

### Claude Code marketplace (recommended)

The plugin marketplace is the official install path and the most automated one: versioned releases, updates through `/counsel-os:update` followed by `/reload-plugins`, and no build toolchain required. The browse skill downloads its prebuilt binary and browser builds from the GitHub release on first use.

```
/plugin marketplace add eigenlegal/counsel-os
/plugin install counsel-os@eigenlegal
```

Then start a **new session** and run `/counsel-os:setup`. Claude Code caches the plugin under `~/.claude/plugins/cache/eigenlegal/counsel-os/{version}/`, and updates flow through `/counsel-os:update`.

On older Claude Code builds, cache invalidation can be fragile. If install fails or seems stuck:

```bash
# Refresh the marketplace clone
cd ~/.claude/plugins/marketplaces/eigenlegal && git pull

# Then fully restart Claude Code (Cmd-Q — closing the window isn't enough,
# Claude Code holds the manifest in memory). Retry the install.
```

If that still doesn't work, fall back to the local clone below. Same content, same skills, no marketplace layer.

**Optional dependencies** (Claude Code; the setup skill auto-detects what you have):
- **pandoc**, for extracting tracked changes from Word documents
- **[QMD](https://github.com/tobi/qmd)**, a content-index MCP server for entity discovery across your whole vault. Install separately as its own Claude plugin (works in Claude Code and Cowork). Without it, entity files live under `{legal_root}/entities/` and are found via filesystem search.
- **[Bun](https://bun.sh/)** plus Playwright Chromium (`bunx playwright install chromium`), only if you want to build the `/counsel-os:browse` skill from source. Without them, browse downloads a prebuilt binary and matching browser builds from the GitHub release automatically on first use (set `COUNSEL_OS_NO_DOWNLOAD=1` to disable). Prebuilt browse binaries are published for **Apple-Silicon macOS** and **Linux-x64**; on **Intel Macs** browse builds from source, so those users need Bun installed. (Everything else in Counsel OS — the full methodology, all 26 law areas, your vault — runs on Intel Macs with no extra tooling.)

### Claude Desktop / Cowork (no terminal required)

1. Open **Claude Desktop** → **Cowork** → **Customize** → **Plugins** → **Add marketplace**
2. Paste `https://github.com/eigenlegal/counsel-os` and confirm
3. Install **Counsel OS** from the new marketplace
4. Start a **new conversation** and run `/counsel-os:setup`

The setup skill walks you through choosing a folder for your legal content, seeds the 26 law areas and practice content into it, and configures your practice profile through chat. No file editing, no terminal commands.

> **Note:** Three features require Claude Code's CLI access and aren't available in Cowork:
> - **`/counsel-os:browse`**: headless browser for portals and document extraction
> - **Native Word `.docx` redlines with tracked changes**: counsel can produce a real Microsoft Word file with tracked changes attributed to you and counterparty-facing comments, ready to drop into your Review/Accept workflow. Requires python-docx plus AppleScript driving Word's Compare. Cowork produces a markdown redline with the same edits.
> - **Structured markup ingestion**: when a counterparty returns a `.docx` with tracked changes, counsel extracts every change and comment into a change-by-change assessment (`read --redline`, via `scripts/extract_redlines.py`). In Cowork, share the returned redline as text or markdown instead.
>
> All other skills work identically.

### Claude Code local install (for plugin development)

If you're developing Counsel OS itself, load the plugin straight from a clone, with no marketplace and no cache layer to invalidate:

```bash
git clone https://github.com/eigenlegal/counsel-os.git ~/counsel-os
claude --plugin-dir ~/counsel-os
```

Make it stick with an alias in `~/.zshrc` (or `~/.bashrc`):

```bash
alias claude='claude --plugin-dir ~/counsel-os'
```

Then start a new Claude Code session and run `/counsel-os:setup`. Counsel OS is skill-first: setup is written as an `.md` skill so Claude adapts it to your vault, permissions, shell environment, and connected tools. The repo's shell scripts are only narrow mechanical helpers for deterministic tasks.

---

## Setup

After installing, run `/counsel-os:setup` (Cowork or Claude Code). It opens with a fork:

- **Express (~3 minutes, default):** near-zero decisions. Root selection (leads with a detected Obsidian vault if it finds one), a few identity basics (name, entity/firm, jurisdiction), and **one** question: what kind of law you practice, or what industry. From that it seeds a tailored `profile.md` and a full set of clause positions. An in-house SaaS GC gets a deeply tuned profile; every other answer gets honest, clearly labeled base defaults you refine over time. Optional-tool offers (QMD, Obsidian, git) are one plain-language question each and never block.
- **Custom:** the full interview, unchanged: legal root, optional tools, `profile.md`, and a walk through the standard clause positions.

Every seeded position carries a **"Starting point, not legal advice; edit to your practice"** banner. Nothing seeded is a substitute for your judgment; it's a scaffold you own and edit.

| Step (Express) | What It Configures | Time |
|------|--------------------|------|
| Legal root | Where Counsel OS stores law areas, practice content, and memory in your vault | ~1 min |
| Identity basics | Name, entity/firm, jurisdiction | ~1 min |
| Practice question | One question → seeded profile + clause positions tailored to your practice | ~1 min |

After setup, run `/counsel-os:demo` to see it work on a synthetic NDA. You can edit anything under `{legal_root}/practice/` later, or just tell counsel *"our deletion window is 30 days"* and it updates the file for you.

**Optional:** In the Custom flow, provide 3-5 past contracts during setup and the system will analyze them to infer your actual positions, often more accurate than describing them in the abstract.

---

## Usage

### The Demo

```
/counsel-os:demo
```

A first look at Counsel OS: a capability guide (each thing it does, with the exact command to try it) plus one offered live run that reviews a **bundled synthetic mutual NDA** against your own seeded confidentiality position, ending in a verdict and a redline. It writes **nothing** to your vault (artifacts go to a disposable scratch folder), uses a synthetic document only, and, if you haven't set up a legal root yet, points you at `/counsel-os:setup` first.

### Legal Work

You describe what you need in plain language and the `/counsel-os:counsel` skill auto-activates. It composes five primitives (`read`, `research`, `evaluate`, `draft`, `remember`) based on your intent.

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

**Word tracked-changes redlines (Claude Code + macOS).** When you ask counsel to redline a contract, it produces a native Microsoft Word `.docx` with tracked changes attributed to you, plus counterparty-facing comments explaining the rationale for each edit. It opens straight into Word's Review pane, where Accept, Reject, and reply work like any other tracked-changes file from a colleague. The pipeline uses python-docx to apply edits and AppleScript driving Word's Compare to produce the final tracked-changes document. Memos, summaries, and emails come back as formatted markdown. On Linux, Windows, and Cowork you get a markdown redline with the same edits.

### Utility Skills

#### Browse: document extraction (CLI only)

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

#### Retro: practice analytics

```
/counsel-os:retro
```

Analyzes your matter history and produces insights, calibrated to the shape of your practice:

- **High-volume practices** (many similar contracts against the same positions) get the full statistical pass: most-negotiated clauses, acceptance and exception rates, counterparties that push back hardest, standards that keep getting overridden (maybe the standard is wrong?), and trends compared to previous retros. Per-clause statistics only run where there are roughly 10+ comparable matters; below that, deviations are reported as case notes, not percentages.
- **Low-volume, heterogeneous practices** (most solo and in-house work) skip the statistics and center on **harvesting promotable knowledge**: sweeping matter and entity files for deal-archetype playbooks, regulatory-posture notes, and proven clause language that has outgrown its matter and belongs in `practice/`.

Run monthly to calibrate your practice.

#### Update: pull latest content

```
/counsel-os:update
```

This:
1. Helps update plugin methodology through your install path (marketplace or local git clone)
2. Shows what changed in law/ upstream and offers new practice content for your review
3. Lets you decide what to apply to your vault; the plugin never overwrites practice content without approval

When upgrading from an older Counsel OS install, `/counsel-os:update` also performs a one-time migration to the current marked config format:

```markdown
counsel-os-config: true
config_version: 1
legal_root: /path/to/your/legal/root
```

#### Doctor: health check

```
/counsel-os:doctor
```

Read-only diagnostic: verifies legal-root resolution and config, vault structure, plugin version vs latest, law-content currency, optional dependencies (pandoc, python-docx, bun, Playwright, QMD), browse daemon build, backup freshness, vault git hygiene, **vault consistency** (numeric positions compared across standards ↔ library ↔ law floors, which catches a standard that drifted from its clause bank or now permits what updated law forbids), and **matter-aware law impact** (open matters whose law areas were refreshed after the matter's last update). The result is one ✅/⚠️/❌ table with a fix command per row. `--consistency` runs only the last two as a cheap pre-deal spot-check. Run monthly and after every update. See `docs/operations.md` for recommended cadences across all the maintenance skills.

### Backup and Restore

```bash
# Back up your legal root (law, practice, matters, memory, entities)
./backup

# Restore from the most recent backup
./restore

# Restore from a specific backup
./restore counsel-os-backup-20260313-143022
```

Backups are stored in `~/.counsel-os/backups/`, outside the plugin directory, so they survive plugin updates and reinstalls. Backups created by older versions inside the plugin's `backups/` folder are migrated automatically the next time `./backup` runs, and `./restore` still finds them in the meantime. For routine use, prefer your vault's normal backup or version-control workflow; these scripts are local Claude Code helpers.

### Scripts Reference

Everything in `scripts/` is a narrow, deterministic helper. The document-pipeline scripts are normally driven *by counsel* during a redline, so you rarely need to run them yourself, but they work standalone when you do.

#### Document pipeline (Claude Code + macOS)

| Script | What it does | When to run it yourself |
|--------|-------------|------------------------|
| `scripts/apply_redlines.py <original.docx> <redlines.json> <output.docx>` | Applies text replacements and margin comments to a `.docx` (python-docx). Sees text inside hyperlinks and tracked insertions; refuses ambiguous matches until disambiguated. | Re-applying an edited redline spec without redoing the analysis; debugging why a specific replacement didn't land (it reports found/skipped per item). |
| `scripts/word_compare.sh <original.docx> <modified.docx> <author> <output.docx>` | Drives Microsoft Word's Compare via AppleScript to produce a native tracked-changes `.docx` attributed to `<author>`. Requires Word for Mac; paths must be user-accessible (not `/tmp`). | Regenerating the tracked-changes file after hand-editing the modified version; producing a redline between any two documents outside a counsel session. |
| `scripts/clean_format.py <input.docx> <output.docx> [--template <path>]` | Rebuilds a messy `.docx` against the professional style template (`scripts/legal-template.docx`): consistent heading numbering, list formatting, smart quotes. Warns on content controls and merged cells. | A counterparty draft is too mangled to redline cleanly; normalizing a doc before comparison. |
| `scripts/import_reference.sh <source-dir> <collection> [--source "attribution"]` | Imports third-party material (sample agreements, form books, checklists — .docx/.doc/.md) into `practice/reference/<collection>/` with provenance frontmatter, the reference-only banner, and index registration. | Adding a form book or agreement set to your searchable reference quarry. Or just tell counsel: "import this folder as reference." |
| `scripts/extract_redlines.py <input.docx> [--format markdown]` | Extracts tracked changes and comments into structured records: per changed paragraph, original vs revised text, inserted/deleted fragments, author, date, section context, anchored comments. | A counterparty returned a markup — counsel uses this for the change-by-change assessment (`read --redline`); run it directly for a quick review table. |
| `scripts/diff_rounds.py --ours <sent.docx> --theirs <returned.docx> [--base <docx>]` | Round-over-round negotiation comparison: classifies what happened to each of your counters — ACCEPTED, REVERTED, MODIFIED, or NEW changes they introduced. `--base` (the pre-redline baseline) sharpens the classification. | Round 2+ of a negotiation — counsel runs it inside `read --redline` when a prior round exists; run directly to see what survived. |

The redline flow counsel runs for you: analysis → `apply_redlines.py` (edits + comments on a copy) → `word_compare.sh` (real tracked changes). See `primitives/draft.md` and `primitives/redline-output.md`.

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
| `scripts/run_evals.py [--generate] [--model <id>] [--only <fixture>] [--self-test] [--save-baseline <id>] [--compare-baseline <id>]` | Scores eval outputs in `evals/`; `--generate` runs the counsel agent headlessly against each fixture's mini-vault first (costs API tokens); `--self-test` validates the scorer (free, runs in CI); baselines snapshot per-model scores and gate on regressions. | Full generate+score before releases and when qualifying a new model; see `evals/README.md`. |
| `scripts/gen_browse_reference.py [--check]` | Regenerates the browse skill's command reference from the source command registry; `--check` fails on drift (runs in CI). | After adding or changing a browse CLI command. |

---

## Confidentiality & Data Flow

Counsel OS handles client material. Know where data goes before pointing it at privileged or confidential documents.

**What leaves your machine:**

- Conversation content, and the contents of any file Claude reads (contracts, matter files, vault notes) go to the Anthropic API (or whichever model provider your Claude installation is configured to use) for processing. This is how Claude works; the plugin neither adds to it nor can remove it.
- Web research sends your queries and visited URLs to search engines and the sites being fetched.
- Retention of API traffic is governed by your Anthropic plan and organization settings, not by this plugin. Check your organization's AI usage policy and its API data-retention configuration before processing privileged material. No retention promises are made here, because retention is a property of your account, not of Counsel OS.

**What stays local:**

- **Your vault.** All law, practice, matter, entity, and memory content is plain markdown in a folder you chose. It is mirrored elsewhere only if you put the vault somewhere synced (iCloud, Dropbox, a git remote).
- **The QMD search index**, if installed, is built and queried locally.
- **The browse skill** runs a local headless Chromium; its daemon binds to 127.0.0.1 only, and pages it visits are fetched directly from your machine, like any browser you run.
- **Backups** (`./backup`) are written to `~/.counsel-os/backups/` on your machine, never to the plugin directory, a remote, or anywhere synced unless your home folder is.

**Git history is permanent.** If you version your vault with git (recommended), closed matters and deleted files persist in history: deleting a file removes it from the working tree, not from past commits. Keep vault remotes private. The only true deletion is rewriting history (`git filter-repo` or equivalent, then a force-push), and even that does not reach clones that already exist.

**Browser cookie hygiene.** The browse skill's `cookie-import` command reads cookie JSON files you export from your browser; the skill expects them under `/tmp` or the working directory. Those files contain live session credentials and stay on disk until you delete them, so delete them after import. `cookie-import-browser` decrypts cookies directly from a local Chromium browser's store into the running session without writing an export file. Imported cookies live in the headless browser's memory and are discarded when the daemon exits (it auto-stops after 30 minutes idle); the daemon's `/tmp/browse-server*.json` state file holds only a port, PID, and local auth token, no cookies. If you use a third-party cookie-export tool, check where it writes its files.

**No telemetry.** The plugin makes no network calls of its own: no analytics, no phone-home, no external services beyond the model API and the sites you ask it to research or browse.

---

## How It Works

### Architecture

Counsel OS separates **methodology** (how to do legal work) from **knowledge** (what you know).

**The plugin provides methodology + tooling:**
- 8 skills: `counsel` (the orchestrator), `demo`, `browse`, `retro`, `setup`, `update`, `law-refresh`, `doctor`
- 5 primitives (read, research, evaluate, draft, remember) that `counsel` composes dynamically based on intent
- Headless browser for document extraction
- Narrow deterministic helpers for backup/restore, Word redlines, formatting, and browser automation

**Your vault provides all knowledge:**
- Legal framework (law areas)
- Practice profile, standards, methods, and clause library
- Matter state (persistent per-engagement files)
- Institutional memory (decisions, exceptions, patterns)
- Entity files (companies, counterparties), wherever you keep them

The plugin discovers content through two mechanisms:

1. **Legal root.** A configured folder in your vault where Counsel OS manages framework content: `law/`, `practice/`, `matters/`, `memory/`.

2. **Entity lookup.** When you ask about a counterparty, vendor, or matter, Counsel OS finds the relevant note from your vault and merges it into the legal context. The mechanism is auto-detected at runtime based on what's connected in your session:

   - **With a content-index connector (recommended):** pulls from your existing notes wherever they live.

     If [QMD](https://github.com/tobi/qmd) (or any MCP server exposing a `query` tool over markdown frontmatter) is connected, Counsel OS finds notes by frontmatter **anywhere in your Obsidian vault**, not just inside the legal root. Tag any note as a counterparty:

     ```yaml
     ---
     counsel-os-type: counterparty
     ---
     ```

     Now when you ask *"what did we agree with Acme?"*, counsel pulls in your Acme note from wherever it lives. `Companies/Acme.md`, `Clients/2025/Acme.md`, scattered across your vault: it doesn't matter. Your existing meeting notes, deal history, and counterparty research stay where you already keep them and get pulled into legal work automatically. The legal root stays small and focused; the relationship knowledge lives in your vault, organized your way.

     Supported types: `counterparty`, `vendor`, `customer`, `prospect`, `matter`.

     QMD ships as its own Claude plugin. Install it separately, restart Claude, then point it at your vault with a one-time index (`qmd collection add <vault> --name counsel-os && qmd update`, which uses BM25 and no API key). `/counsel-os:setup` offers to walk you through all of this; no Counsel OS configuration is needed. Works in both Claude Code and Cowork.

   - **Filesystem fallback (when no index tool is connected):** entity files live at a fixed location, `{legal_root}/entities/`, discovered via grep on the same `counsel-os-type` frontmatter. Same metadata, less structural flexibility, since you have to put files in the entities folder for them to be found.

### Built on five primitives

The methodology isn't one monolithic prompt or a fixed sequence of slash commands. It's decomposed into five verbs, and everything counsel does is some combination of them:

| Primitive | What it does |
|-----------|-------------|
| `read` | Understand a document: parties, defined terms, clause inventory, key dates, whether it carries tracked changes |
| `research` | Pull the relevant context from your vault and law areas: positions, methods, clause language, entity history, applicable law |
| `evaluate` | Assess a clause or document against your standards and the law, with a classification and a cited source for each finding |
| `draft` | Produce output in your voice: counter-language, a memo, an email, a summary, or a tracked-changes redline |
| `remember` | Persist matter state and propose updates to your standards, library, and entity files (you approve each one) |

Each primitive is a plain markdown file in `primitives/` that you can read and edit. `counsel` reads your request, decides which primitives it needs and in what order, and runs them. A full contract review usually flows `read → research → evaluate → draft → remember`, but nothing enforces that order: a quick "what's our position on indemnity?" is just `research`, and "close this matter" is just `remember`. There is no pipeline to step through and no command to memorize per phase; the composition is chosen at runtime from the intent.

This is also how the system stays small and extensible. New capability is a new mode on an existing primitive rather than a new top-level workflow, and because the primitives read from your vault rather than hard-coding legal knowledge, the same five verbs cover every practice area.

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

**Example:** Your standard liability cap is 12 months (`practice/standards/`). But for Acme Corp you've pre-approved 24 months (in your Acme Corp entity file). When reviewing an Acme contract, the system uses 24 months. If GDPR requires a specific data-processing provision (`law/`), though, that's non-negotiable regardless.

**These rules are tested, not just stated.** The repo ships eight live-run eval fixtures (`evals/`): agent runs against mini-vaults engineered to tempt each failure. Four test the safety rules (a practice standard that permits what law forbids, a reference form presented as "our position," another counterparty's concession offered as precedent, an always-escalate threshold under sign-today pressure) and four test behavior (detecting the right law areas from an unlabeled scenario, classifying a returned redline round, flagging *absent* provisions, and grading clauses against deliberately non-market vault standards rather than market intuition). Per-model baselines gate regressions when the underlying model changes. See `evals/README.md`.

### Continuous Learning

Your knowledge base grows as you use it. The `remember` primitive watches your work and proposes updates, not just at the end of a matter but whenever it notices something worth capturing.

What gets proposed, when:

- **Mid-matter, opportunistically:** *"You're accepting a 24-month liability cap here, but your standard is 12 months. Want me to flag this as a deal-specific override on the Acme entity file?"*
- **When a pattern emerges:** *"You've accepted 24-month caps with this counterparty 3 times now. Want to update your standard for them, or update your practice default?"*
- **When a gap shows up:** *"Your standards don't cover most-favored-nation clauses, but this contract has one. Want me to add a position to `practice/standards/`?"*
- **When language works:** *"This counter-language landed cleanly. Want me to add it to `practice/library/` as a vendor-favorable variant?"*
- **At matter close:** it proposes a counterparty file with deal history, position overrides, and negotiation notes you can refer to next time.

You approve every change. Nothing gets written to your knowledge without consent. Over time, your `practice/` reflects your actual practice, your entity files capture relationship-specific context, and your `memory/patterns.md` accumulates cross-cutting observations that inform future work.

That's what makes Counsel OS more than a one-shot review: the positions it checks against are the ones you've actually taken.

### Auto-Detection of Applicable Law

Each legal area in `law/` has trigger conditions: keywords, clause types, and regulatory references that indicate when it applies. When you bring a document to counsel, the `research` primitive scans it against all 26 areas and loads every match.

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

Multiple areas apply simultaneously and compound: a fintech SaaS contract triggers data privacy AND financial services AND consumer protection.

### What's Included

**Seed content (seeded into your vault on first setup):**
- 26 legal areas with auto-detection trigger conditions
- 24 standard clause positions (in `practice/standards/`)
- Method files with integrated checklists (in `practice/methods/`)
- 21 clause library categories with standard/aggressive/vendor-favorable/minimum language (in `practice/library/`)
- A `practice/reference/` area for curated source material you import (example agreements, checklists, treatise excerpts), which sits outside the precedence layers and is mined for issue-spotting and sample language

Once seeded, you own all of this content. Customize law areas, rewrite methods, add your own clause language; it's your vault.

**You provide:**
- Your practice profile (organization, philosophy, risk appetite, voice, escalation criteria)
- Customizations to the seeded standards for your practice
- Your counterparty context (built over time through use)

---

## FAQ

**Is it really free?** Yes. Counsel OS is MIT-licensed and open source; the whole plugin is in this repository. You run it on your own Claude installation, and there's no Counsel OS subscription, account, or server.

**Do I need to be a programmer?** No. The Claude Desktop / Cowork path needs no terminal; install from the in-app marketplace and drive everything through chat. Claude Code (terminal) unlocks a few extra capabilities (see the [platform matrix](#platform-matrix)), but the core practice works either way.

**Where does my data go? Is it private?** Your vault (all law, practice, matter, and memory content) stays on your machine as plain markdown. But this is a Claude plugin, so the documents and conversations you bring to it are sent to the Anthropic API for processing, and web research sends your queries and visited URLs to the search engines and sites involved. In short: the things that leave are the ones you ask it to work on, and your vault stays local. It is local-*first*, not a local model. Read [Confidentiality & Data Flow](#confidentiality--data-flow) in full before pointing it at privileged material, and check your Anthropic plan's data-retention settings.

**Is this legal advice?** No. Counsel OS is software, and the content it seeds is a starting point, not legal advice; every seeded position says so and is yours to edit. It doesn't replace a lawyer's professional judgment or the duty to verify current law before relying on it. Using it does not create an attorney-client relationship with Eigen Legal.

**Do I need an API key or extra accounts?** Not for the plugin itself. It uses whatever model your Claude installation is already configured with. Optional tools are self-contained too: QMD indexes locally with BM25 (no API key), and the browse skill downloads its prebuilt browser on first use.

**Can I use my existing Obsidian vault?** Yes. Setup can place the legal root inside a vault you already have, and with a content-index connector like QMD, Counsel OS finds counterparty notes anywhere in that vault, not just inside the legal root.

**How do I keep the law content current?** `/counsel-os:update` syncs refreshed, source-cited law content into your vault (you approve what applies), and `/counsel-os:doctor` flags what's stale. You can also take ownership of any area and maintain it yourself with `/counsel-os:law-refresh`.

**The marketplace install seems stuck.** On older Claude Code builds the plugin cache can be fragile. Refresh the marketplace clone and fully quit Claude Code (Cmd-Q). See [the troubleshooting steps](#claude-code-marketplace-recommended) above.

---

## Documentation

Full documentation (per-platform install, core concepts, workflow guides, the law-library reference, and troubleshooting) lives at **[eigenlegal.com/docs](https://eigenlegal.com/docs?utm_source=counsel-os&utm_medium=readme&utm_campaign=docs)**.

---

## Customization

### Adding Counterparty Context

After working with a counterparty, counsel proposes creating an entity file (via `remember`). With a content-index connector (e.g. QMD) you choose where to save it, and Counsel OS discovers it wherever it lives. Without one, entity files go under `{legal_root}/entities/`.

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

You can edit `practice/standards/` and `practice/library/` files directly any time; they're plain markdown in your vault. But you usually won't need to: counsel proactively suggests updates as it works (see [Continuous Learning](#continuous-learning) above for how this loop runs).

### Law Content: Who Maintains What

Law files are physical copies in your vault, but by default they're **plugin-managed**: the maintainers refresh the shipped content against primary sources (with dated `last-reviewed` attestations and cited authorities), and `/counsel-os:update` syncs the results into your vault. You get currency without doing the maintenance yourself.

Ownership is a dial, not a switch:

| You want | Do this | Then |
|----------|---------|------|
| Batteries included (default) | Nothing | Law arrives via `/counsel-os:update`; set `auto_apply_law_updates: true` in `config.md` to skip per-update prompts |
| Add your own law area | Create `{legal_root}/law/your-area/` (or a single `.md`) with trigger conditions at the top | It's yours automatically — update never touches areas it doesn't ship; the `research` primitive auto-detects it; `/counsel-os:law-refresh` keeps it current |
| Customize one shipped file and keep your edits | Add `managed-by: user` to that file's frontmatter | Update permanently skips it (even with auto-apply); `/counsel-os:law-refresh` maintains it. You own its currency from then on |
| Own the whole law library | Set `law_management: user` in `config.md` | Update stops syncing law entirely; `/counsel-os:law-refresh` is your maintenance tool |

**`/counsel-os:law-refresh`** runs the same verify-and-patch method the maintainers use upstream (extract perishable claims, verify against primary sources, patch the deltas, and stamp attestations after your review), but only on content *you* own. Run it quarterly for fast-moving custom areas.

**The responsibility line, plainly:** Counsel OS ships law content with dated, source-cited attestations, but it is not legal advice, attestations are point-in-time, and nothing here replaces a lawyer's professional duty to verify current law before relying on it. Content you take ownership of is yours to keep current.

---

## License

MIT

---

## Built by Eigen Legal

Counsel OS is a free, open source tool built by [Eigen Legal](https://eigenlegal.com?utm_source=counsel-os&utm_medium=readme&utm_campaign=upgrade-path). We help law firms and in-house legal teams build custom AI workflows, trained on your own standards, methods, and judgment.

Want a custom version built for your practice? [Book a free consultation](https://eigenlegal.com?utm_source=counsel-os&utm_medium=readme&utm_campaign=upgrade-path)
