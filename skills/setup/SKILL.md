---
name: setup
description: "Guided onboarding: configure your legal root, seed content, and set up your practice profile. Run once to get started."
---

# Setup — Guided Onboarding

You are helping a user set up Counsel OS from scratch. This single skill handles everything: choosing where to store content, seeding the legal framework, and walking through practice profile configuration. The goal is to go from zero to a working Counsel OS in one session.


## Step 0: Detect Capabilities

Counsel OS setup is skill-first and capability-based. Do not assume only one host or operating system. First determine what this session can do:

- **File write access:** Can you create folders and files in the user's chosen legal root?
- **Shell access:** Can you run a simple shell command such as `echo ok`?
- **Home-directory access:** Can you write `~/.counsel-os/legal-root`?
- **Plugin-tree write access:** Can you build optional local binaries in the plugin directory?
- **External tooling:** Are `bun`, `pandoc`, `python3`, Microsoft Word, or other optional tools available?
- **Connected index/search tools:** Is a content-index `query` MCP tool (e.g. qmd's `query`) available this session? Secondarily, is the `qmd` CLI on PATH (`command -v qmd`)?

Adapt to the answers:

- If shell access is available, use it for detection, directory creation, copying seed files, and optional dependency checks.
- If shell access is unavailable but file tools are available, perform setup through those file tools and skip shell-only checks.
- If the environment is read-only except for a connected workspace, ask the user to choose a legal root inside that workspace.
- If no file write mechanism is available, prepare the exact files and paths the user should create, then stop after confirming what could not be written.

Claude Code is one capable host; Cowork is usually a file-tool host without shell. Other LLM environments should follow the same capability matrix rather than a hardcoded host branch.

## Step 0.5: Resume an interrupted Express run

Adding qmd (below) needs a session restart, so an Express run can be interrupted mid-way. Before anything else, if home-directory reads are available, check for a resume marker:

```bash
cat ~/.counsel-os/setup-resume 2>/dev/null
```

If the marker exists **and** a legal root is already configured (the Step 1 detection finds a marked `config.md`), the user is mid-Express — they installed qmd and restarted. **Resume Express; do not restart it, and do not fall into the returning-user Review/Start-fresh branch:**

1. Re-run the qmd detection in **Optional tool: faster local search with qmd** (Step 1). If qmd is now usable with no collection covering the vault, run its **Phase 2** indexing; otherwise just continue on the filesystem fallback.
2. Go straight to the **Express closing card** (Express phase 6). Identity (phase 2) and the practice question + seeding (phase 3) already completed before the restart — **do not re-ask them.**
3. Clear the marker: `rm -f ~/.counsel-os/setup-resume`.

If there's no marker (or no configured root yet), continue normally.

## Step 0.6: Choose a setup path

Offer the fork before asking anything else:

> How would you like to set up? I default to **Express** — about 3 minutes: where to keep your practice, a couple of identity basics, and one question about what you do, and I'll seed sensible starting positions you can edit anytime.
>
> - **Express** (default) — fastest path to a working practice.
> - **Custom** — a longer interview that walks every profile section and standard with you.

If the user doesn't express a preference, take **Express**. If they pick Custom, skip the **Express Setup** section entirely and run **Custom Setup** (Steps 1–7) unchanged.

---

# Express Setup (default, ~3 minutes)

Near-zero decisions: root, identity basics, one practice question. Everything seeded is a starting point the user edits later — never present it as final or as legal advice.

### Express phase 1 — Legal root
Run the root-selection logic in **Step 1: Determine Legal Root** (the Obsidian-vault detection that leads with a concrete suggestion, the placement question only if detection didn't settle it, and writing `{legal_root}/config.md` + the `~/.counsel-os/legal-root` pointer). Do **not** run the qmd offer yet — that's phase 4. If an existing populated root is found, this is a returning user: hand off to the **Step 1 → "If an existing legal root was found"** branch instead of Express.

### Express phase 2 — Identity basics
Ask exactly these, in one short prompt (not the full Custom interview):

> Three quick basics:
> 1. Your name?
> 2. Your organization / firm (and your role — in-house, outside counsel, solo)?
> 3. Primary jurisdiction?

Hold the answers for the profile you'll write in phase 3.

### Express phase 3 — One practice question, then seed defaults
Ask the single tailoring question:

> Last question: **what kind of law do you practice, and for what kind of organization or industry?** (e.g. "in-house GC at a B2B SaaS company," "employment law for small businesses," "commercial real estate.")

Then seed everything using the mechanics in **Step 2: Seed Content** (law areas, standards pack, methods, library, reference, `matters/`, `memory/`, `entities/`, browse binary + pandoc checks). Every seeded position file already carries a **"Starting point, not legal advice"** banner — don't add or restate it per-file; you'll point at it in the closing card.

Then write `{legal_root}/practice/profile.md` tailored to the answer — **do not** run the Custom profile interview:

- **In-house SaaS / software GC** (the answer is clearly in-house counsel at a SaaS/software company) → write the **deep tuned** profile:
  ```markdown
  ---
  counsel-os-type: practice
  ---
  # Practice Profile

  ## Identity
  {Name}, {role — e.g. General Counsel / Head of Legal} at {Organization}. In-house counsel for a SaaS / software company. {Any industry specifics from their answer.}

  ## Principles
  Business-enabler posture: find the path to yes while managing material risk. Pragmatic — spend energy on the terms that move the needle (liability, data protection, IP, term/termination) and accept market-standard terms on the rest. Prefer mutual positions.

  ## Voice
  Professional, plain-English. Lead with an executive summary and a clear recommendation; bullets over dense paragraphs. Direct internally, measured with counterparties.

  ## Escalation Thresholds
  - **GREEN (proceed):** mutual, market-standard terms within the seeded positions.
  - **YELLOW (one reviewer):** non-mutual liability caps, data-processing / privacy terms, IP assignment.
  - **RED (senior review):** uncapped liability, broad indemnities, source-code escrow, anything touching regulated or customer data at scale.

  _Emphasized law areas: data protection / privacy, IP ownership, commercial contracts, employment. These thresholds are starting points — set dollar triggers and adjust to your practice._
  ```
- **Any other answer** → write the **honest base-default** profile (fill Identity from their answer + phase 2; keep the rest as clearly-labeled general defaults):
  ```markdown
  ---
  counsel-os-type: practice
  ---
  # Practice Profile

  > These are general starting-point defaults, not tailored to your practice yet and not legal advice. Tell me how you actually work and I'll refine them.

  ## Identity
  {Name}, {role} at {Organization}. {Their practice-area / industry answer.} Primary jurisdiction: {jurisdiction}.

  ## Principles
  Pragmatic, market-standard defaults for now. Tell me your risk posture and what you fight for first, and I'll tailor this.

  ## Voice
  Professional, plain-English, executive-summary-first. Adjust anytime.

  ## Escalation Thresholds
  General defaults — escalate uncapped liability, broad indemnities, and anything touching regulated or customer data; add dollar thresholds when you're ready. Placeholders; edit to your practice.
  ```

Say plainly which one you seeded: for a non-SaaS-GC answer, tell the user the positions are common market defaults and the profile is a general starting point they should tune.

### Express phase 4 — qmd + Obsidian offers (unchanged)
Run the qmd offer exactly as in **Optional tool: faster local search with qmd** (Step 1) — proactive detect, offer, never block, never auto-install. **If the user opts to install qmd** (which requires a restart), first write the resume marker so the restart→re-run round-trip returns to Express instead of the returning-user branch:

```bash
mkdir -p ~/.counsel-os && printf 'express' > ~/.counsel-os/setup-resume
```

Then give them the Phase-1 install steps and continue to phase 5 on the filesystem fallback (qmd is never required to finish). On the next run, **Step 0.5** picks up the marker and resumes at the qmd indexing + closing card.

### Express phase 5 — Version control (one question)
```bash
[ -d "{legal_root}/.git" ] && echo "git present" || echo "no git"
```
- **git already present** → keep it silently; say nothing and move on.
- **no git** → one plain-language question, sensible default yes:
  > Want me to track your practice history with git, so you can see how your positions evolve? (Recommended — it stays local. I'll set it up.)

  If yes, run `git init`, add the `.gitignore` from **Step 6**, and make the initial commit. Skip the GitHub-remote offer in Express (that's a Custom / later step).

### Express phase 6 — Closing card
No ceremony, no exercises. Show:

> **You're set up.** Your practice lives at `{legal_root}` — law areas, standard positions, and your profile are all editable markdown files you own.
>
> - Every position is a starting point, not legal advice — open any file in `practice/standards/` to change it, **or just tell me** e.g. *"our data-deletion window is 30 days"* and I'll update it.
> - Want to see it work? Run **`/counsel-os:demo`**.

Then stop — Express is done.

---

# Custom Setup (full interview)

The remaining steps are the Custom path — the full guided interview. Run these only when the user chose **Custom** (or a returning user picked "Review and update"). Express uses Step 1's root logic and Step 2's seeding mechanics but does **not** run the Step 3–7 interview.

## Step 1: Determine Legal Root

Check if a legal root is already configured by running the **Finding the Legal Root** procedure in `skills/counsel/SKILL.md`. That procedure looks for an existing marked `config.md` containing both `counsel-os-config: true` and `legal_root:` near the working location and reports back what it finds.

**Do not** read `config.local.md` or plugin documentation files. Per-user configuration lives only in the user's vault at `{legal_root}/config.md`.

### If an existing legal root was found:

Check if it's already populated (has `law/`, `practice/`, `memory/` with content). If so, ask:
> Your Counsel OS is already set up at `{legal_root}`. Would you like to:
> (A) Review and update your existing profile
> (B) Start fresh (this will overwrite your current settings)
> (C) Just check that everything looks good

Whichever they pick, also run the qmd detection from **Optional tool: faster local search with qmd** (in Step 1, below): if qmd has become usable since first setup but no collection yet covers the vault, offer **Phase 2** to index it. This is the path for a user who installed qmd, restarted, and re-ran `/counsel-os:setup` to wire it — don't make them start fresh just to get indexed.

### If no existing legal root was found:

**First, a quick read-only detection** (skip silently if shell/file listing is unavailable). This lets setup lead with a concrete suggestion instead of asking blind. It NEVER installs anything and NEVER blocks — if nothing turns up, fall through to the questions below unchanged and don't mention the attempt.

```bash
# Is the Obsidian app present? (macOS / Linux desktop / flatpak locations)
ls -d /Applications/Obsidian.app "$HOME/Applications/Obsidian.app" 2>/dev/null \
  || ls -d "$HOME"/.local/share/applications/*obsidian* /var/lib/flatpak/app/md.obsidian.Obsidian 2>/dev/null

# Existing vaults: scan common roots for an .obsidian folder. This is more reliable
# than ~/Library/Application Support/obsidian/obsidian.json, which can report zero
# vaults even when some exist (iCloud vaults, newer Obsidian versions).
for root in "$HOME/Documents" "$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents" "$HOME/Dropbox" "$HOME"; do
  [ -d "$root" ] && find "$root" -maxdepth 3 -type d -name .obsidian -prune 2>/dev/null | sed 's:/\.obsidian$::'
done | sort -u | head
```

- **Vault(s) found** → lead with it: *"I see an Obsidian vault at `{path}` — want Counsel OS to live inside it (e.g. `{path}/Counsel OS`)? It'll show up in Obsidian automatically."* If the user agrees, use that as the path and skip the "do you use Obsidian?" question below — detection already answered it.
- **App present but no vault, or nothing found** → fall through to the questions below; do not report the miss.

If detection settled the path, skip ahead to writing the config. Otherwise, ask the user where to store the framework content:
> Where should Counsel OS store its framework content? This folder will contain your law areas, standard positions, practice profile, and memory.
>
> If you use Obsidian, a good choice is a top-level folder in your vault (e.g., `~/Documents/Obsidian Vault/Counsel OS`).
> If you don't use Obsidian, any folder works (e.g., `~/legal/counsel-os`).

Then, only if detection did not already settle it, ask one optional placement question:
> Do you already use Obsidian? If so, I can place Counsel OS inside your existing vault so it shows up there automatically. If not, a normal folder works fine — Obsidian is optional.

Do not block setup on Obsidian, and **never install it automatically**. If the user asks for install guidance, offer the host-appropriate one-liner for THEM to run — macOS `brew install --cask obsidian`, Windows `winget install Obsidian.Obsidian`, Linux `flatpak install flathub md.obsidian.Obsidian` (or the AppImage from obsidian.md) — then continue setup with the filesystem fallback unless the user explicitly pauses to install Obsidian.

### Optional tool: faster local search with qmd

qmd is a **separate, local, open-source Claude plugin** (works in Claude Code and Cowork) that gives Counsel OS fast on-device search and — most usefully — **entity discovery across your whole Obsidian vault by frontmatter**, so it finds a counterparty or precedent anywhere in the vault, not just under the legal root. It runs entirely on your machine and needs **no API key**. It is **not** an Obsidian-style app cask — qmd is a Claude plugin you add and then point at your vault. It is optional: without it, Counsel OS uses filesystem search, and qmd can be added anytime.

**Proactively detect whether qmd is usable** and surface this offer without waiting for the user to ask:

- **A content-index `query` MCP tool is available this session** (e.g. an `mcp__qmd__query`-style tool) → qmd is usable. Check whether a collection already covers the vault (`qmd collection list`). If one does, just say "qmd is wired" and continue — make no offer and create no duplicate collection. If none does, go to **Phase 2**.
- **The `qmd` CLI is on PATH (`command -v qmd`) but no `query` tool is connected** → installed but not wired to this client. Either point the user at the plugin install + restart (**Phase 1**), or — if they installed the CLI deliberately — have them register an MCP server `{"command":"qmd","args":["mcp"]}` and restart; then index (**Phase 2**).
- **Neither present** → offer **Phase 1**.

**Phase 1 — install (qmd absent).** A `/plugin` install plus a session restart is inherently user-driven, so give the user the steps to run themselves; never auto-run them:
> qmd would speed up search and let me find counterparties or precedents anywhere in your vault by frontmatter. It's a local, no-API-key Claude plugin — a few steps plus a restart, and skipping is totally fine (I'll use filesystem search). To add it:
> ```
> /plugin marketplace add tobi/qmd
> /plugin install qmd@qmd
> ```
> Then restart Claude so the qmd tools load and re-run `/counsel-os:setup` — I'll point qmd at your vault.

Then **continue setup to completion on the filesystem fallback** — qmd is never required to finish.

**Phase 2 — index the vault (qmd usable, no collection yet).** Only with an explicit yes for this step, run these — they are local, safe, and reversible:
```bash
qmd collection add <vault_root> --name counsel-os
qmd update
```
- `<vault_root>` = the **Obsidian vault root** that contains the legal root, so frontmatter entity discovery spans the whole vault. Resolve it by walking up from the configured `legal_root` to the nearest ancestor containing a `.obsidian/` folder; if there is no Obsidian vault, use the legal root's parent.
- `qmd update` builds the **BM25** index only — key-free, **no model download**.
- Confirm success with `qmd collection list` (or a trial `query`) and tell the user qmd is now wired.
- Mention, only as an **optional** follow-up the user can run later, `qmd embed` for semantic search — note it's a one-time ~940MB local model download. **Never run `qmd embed` during setup.**

**Consent & safety:** never auto-install the plugin; never run `collection add` / `update` / `embed` without an explicit yes for that step; every prompt has an obvious skip, and declining returns to normal setup on the filesystem fallback. Setup never blocks on qmd.

If shell or file listing is available, after the user provides a path, detect whether it looks like an Obsidian vault:

```bash
[ -d "{user's path}/.obsidian" ] || [ -d "$(dirname '{user's path}')/.obsidian" ] && echo "IS_OBSIDIAN: yes" || echo "IS_OBSIDIAN: no"
```

If that detection is unavailable, skip it; the legal root does not have to be an Obsidian vault.

Then write the user's config file at `{legal_root}/config.md`:

```markdown
# Counsel OS Configuration

counsel-os-config: true
config_version: 1
legal_root: {user's path}

# Optional overrides (defaults shown — uncomment to customize):
# entities_path: entities
# matters_path: matters
# auto_apply_law_updates: false   # true = update applies law content without per-area approval
# law_management: plugin          # 'user' = you own ALL law content; update stops syncing it (/counsel-os:law-refresh maintains it)
# entity_properties:
#   type_field: counsel-os-type
#   values: [counterparty, vendor, customer, prospect, matter]
```

This file is the authoritative source of per-user configuration. It travels with the user's vault (sync, git, machine swap), and both runtimes find it via the bootstrap procedure on subsequent sessions.

**Do not** write to plugin documentation files or to a `config.local.md` in the plugin tree. The plugin tree is read-only in some runtimes (Cowork) and shouldn't carry user state regardless.

**Also write the pointer file** if home-directory writes are available so subsequent sessions can skip the scan:

```bash
mkdir -p ~/.counsel-os
printf '%s' "{user's path}" > ~/.counsel-os/legal-root
```

The pointer is a per-machine performance cache; the vault's `config.md` is canonical. If home-directory writes are unavailable, skip this step.

Entity discovery is runtime-detected — if a content-index MCP tool is connected (QMD recommended; see CONNECTORS.md), it's used automatically and entity files can live anywhere in the vault. Otherwise the counsel skill falls back to grepping `{legal_root}/{entities_path}/`. No setup-time choice required.

Also create `{legal_root}/entities/` as part of Step 2 — it serves as the filesystem fallback location and is harmless to create regardless of whether the user later connects QMD.

## Step 2: Seed Content

Create the directory structure and seed all content from the plugin into `{legal_root}`:

### Law areas (from plugin `knowledge/law/`)
Copy all 26 law area directories with their files. Frontmatter is already present in the plugin seed files (including `counsel-os-type` and `content-version`). If frontmatter is missing for any reason, add:
```yaml
---
counsel-os-type: law-area
content-version: "{date from plugin's .content-versions.json for that group}"
---
```

### Practice (from plugin `knowledge/practice-seed/`)
Copy the full practice seed into `{legal_root}/practice/`:
- `knowledge/practice-seed/profile.md` → `practice/profile.md`
- `knowledge/practice-seed/standards/` → `practice/standards/` (24 position files, pre-filled with market standards)
- `knowledge/practice-seed/methods/` → `practice/methods/` (method files with integrated checklists)
- `knowledge/practice-seed/library/` → `practice/library/` (clause language categories)
- `knowledge/practice-seed/reference/` → `practice/reference/` (starts with just `_index.md` — the user's curated source-material area: example agreements, checklists, treatise excerpts; sits outside the precedence layers)

All files should already have `counsel-os-type` frontmatter from the seed (practice content uses `practice`; `reference/_index.md` uses `reference`).

### Matters directory
Create `{legal_root}/matters/` (empty — populated when substantive work begins).

### Entities directory
Create `{legal_root}/entities/` (empty — populated when `/counsel` closes a matter and proposes an entity file). Used as the filesystem fallback when no content-index tool is connected.

### Memory (from plugin `templates/memory/`)
Copy patterns.md. Add frontmatter:
```yaml
---
counsel-os-type: memory-patterns
---
```

### Build browse binary
If shell access and plugin-tree write access are available, and the plugin has `browse/src/` but no `browse/dist/browse`, try to build it:
1. Check if `bun` is available: `command -v bun`
2. If yes: run `cd "${CLAUDE_PLUGIN_ROOT}" && bun install && bun run build`
3. Check whether Playwright Chromium is installed. If shell and network access are available, run `cd "${CLAUDE_PLUGIN_ROOT}" && bunx playwright install chromium`. If network access is unavailable, tell the user the browse skill will prompt them to run that command before first use.
4. If Bun is unavailable: no action needed — `browse/bin/find-browse` downloads a prebuilt binary and the matching browser builds from the plugin's GitHub release on first browse use (~220MB, one time). Just mention that the first browse command will take a couple of minutes. `COUNSEL_OS_NO_DOWNLOAD=1` disables that fallback, in which case browse requires Bun.

If shell access or plugin-tree write access is unavailable, skip this step. The rest of Counsel OS still works.

### Pandoc check
If shell access is available, check if pandoc is installed (`command -v pandoc`). If not, note:
> pandoc is not installed. You'll need it to extract tracked changes from Word documents. Install with `brew install pandoc` (macOS) or `apt-get install pandoc` (Linux).

If shell access is unavailable, skip this check and tell the user `.docx` tracked-change extraction depends on pandoc in CLI-style environments.

Report what was seeded and built:
> Counsel OS framework seeded at `{legal_root}`:
> - law/ — 26 legal area files
> - practice/ — profile template, 24 standards, methods, clause library, reference/ (for curated source material)
> - matters/ — ready for intake
> - memory/ — patterns log ready

## Step 3: Practice Profile — `{legal_root}/practice/profile.md`

Walk through the profile conversationally. Don't dump all questions at once — ask 2-3 at a time. All answers go into sections of `practice/profile.md`.

### Identity (## Identity section):
> Let's start with the basics about your organization.
> 1. What's your organization's full legal name?
> 2. What does your organization do? (Brief description — industry, products/services, stage)
> 3. Are you in-house counsel, outside counsel, or something else?

Follow up:
> 4. Who's on the legal team? (Names, titles, and areas of responsibility)
> 5. What legal entities does your organization operate through?
> 6. What regulatory frameworks apply? (SOC 2, HIPAA, GDPR, PCI, etc.)

### Principles (## Principles section):
> Now let's calibrate your legal philosophy.
>
> How would you describe your overall approach? For example:
> - "We're business enablers — find the path to yes while managing risk"
> - "We're protective — better to over-flag than miss something"
> - "We're pragmatic — focus energy on material issues, accept market terms on the rest"

> On a spectrum from conservative to aggressive, where do you fall?
> When you can't negotiate everything, what do you fight for first?

### Voice (## Voice section):
> Let's set your writing style preferences.
> 1. **Tone:** How should legal work product sound? (e.g., "professional but approachable")
> 2. **Structure:** Bullets or paragraphs? Executive summary first?
> 3. **Formality by audience:** Different levels for internal vs. counterparty vs. board?
> 4. **Any language pet peeves?**

Optional: "If you have a memo or redline that represents your ideal style, share it and I'll calibrate from it."

### Escalation Thresholds (## Escalation Thresholds section):
> Last section: escalation thresholds.
> 1. **GREEN track (auto-approval):** What can proceed with minimal review?
> 2. **YELLOW track (single review):** What needs one reviewer?
> 3. **RED track (full review):** What needs senior/committee review?
> 4. **Dollar thresholds:** Under $X = auto-approve, etc.
> 5. **Always-escalate clauses:** Specific types that always trigger escalation?

After the user sets thresholds, cross-reference against `{legal_root}/law/` areas. Flag any conflicts where user thresholds would allow positions that violate law constraints.

Write the completed `profile.md` with all four sections and confirm:
> Here's your practice profile. Anything you'd like to change?

## Step 4: Standards — `{legal_root}/practice/standards/`

Walk through the key position files and let the user customize the `## Our Position` section.

### Approach:
> Your positions have been seeded with market standards. Let's walk through the
> key ones and adjust for your practice.
>
> For each clause type, the file has a starting position. I need to know:
> - **Your standard:** What you typically propose (may match the seed or differ)
> - **What you'll accept:** Your flexibility range
> - **What you won't accept:** Your hard limits
> - **Auto-escalate triggers:** What always gets flagged regardless

### Walk through key positions:

For each major clause type in `{legal_root}/practice/standards/`:
1. Read the seeded `## Our Position` section
2. Present a summary to the user
3. Ask: "Does this match your practice, or do you have different standards?"
4. If different: update the `## Our Position` section in the file
5. If same: confirm and move on

```
> **Limitation of Liability**
> Your starting position is: mutual cap at 12 months of fees, standard consequential
> damages exclusion, carve-outs for IP, data breach, confidentiality, and willful
> misconduct.
>
> Does this match your standard, or do you have different thresholds?
```

Prioritize the most impactful positions first (limitation of liability, indemnification, data protection, IP ownership, termination). The user can always refine others later.

After completing the walkthrough:
> Your positions are set. You can refine any of them later by editing the files
> in practice/standards/ directly.

## Step 5: Optional — Ingest Past Contracts

Offer to analyze past work product to auto-infer positions:

> Would you like me to analyze 3-5 of your past contracts to help refine your
> positions? I can look at:
> - Contracts you've signed (to see what you've actually accepted)
> - Redlines you've sent (to see what you typically push for)
> - Templates you use (to see your standard starting position)
>
> This is optional but can help calibrate positions based on actual practice
> rather than aspirational standards.

If the user provides past contracts:
1. Read each one (extract terms, parties, key provisions)
2. Evaluate the key clauses against the positions just configured
3. Flag any gaps: "Your signed contracts show you've accepted X, but your stated position is Y. Want to adjust?"
4. Offer to update positions based on findings

## Step 6: Version Control

Offer to set up git for the user's legal knowledge:

> Your legal knowledge — positions, counterparty history, decision patterns — is valuable and worth tracking. Want me to set up version control for your legal root?
>
> This creates a private git repo in `{legal_root}` so you can see how your practice evolves over time. When you close a matter, the files that closeout touched — the matter file plus any entity or knowledge updates — are committed automatically, scoped to just those paths; unrelated in-progress work in your vault is left alone.

### If yes:

```bash
cd {legal_root}
git init
```

Create `{legal_root}/.gitignore`:
```
.DS_Store
*.tmp
*~
```

Initial commit:
```bash
git add -A
git commit -m "Initial Counsel OS knowledge base"
```

Then ask:

> Want to connect this to a private GitHub repo for backup? This is optional — local git works fine on its own.
>
> **Important:** Your legal knowledge may contain privileged information. If you connect to GitHub, use a **private** repository.

### If they want a remote:

```bash
# If they have an existing repo:
git remote add origin {their-repo-url}
git push -u origin main

# If they want to create one:
gh repo create {repo-name} --private
git remote add origin {repo-url}
git push -u origin main
```

### If no:

Skip — no version control. The backup/restore scripts still work as a safety net.

## Step 7: Verification

Run a quick validation:

1. **Files exist check:** Verify law/, practice/ (with profile.md, standards/, methods/, library/, reference/), matters/, memory/ are all present and populated
2. **Content check:** Verify profile.md has real content (not just template placeholders)
3. **Consistency check:** Verify positions don't conflict with each other or with law/ constraints
4. **Config check:** Verify `{legal_root}/config.md` exists and contains `counsel-os-config: true` plus the correct `legal_root:` path

```
## Setup Complete

Your Counsel OS is configured:

- [x] Legal root: {legal_root}
- [x] profile.md — [organization name], [risk appetite], [tone], [thresholds]
- [x] standards/ — [N] positions customized, [M] using market defaults
- [x] methods/ — [N] reference guides seeded
- [x] library/ — clause library seeded
- [x] reference/ — ready for curated source material
- [x] law/ — [N] law areas seeded
- [x] matters/ — ready
- [x] memory/ — patterns log ready

You're ready to go. Just say what you need:
- "Review this contract"
- "Is this clause ok?"
- "What's our position on indemnification?"
- "Draft a response to their redline"

To update your profile later, edit the files in {legal_root}/practice/ or run `/counsel-os:setup` again.
To pull plugin updates, run `/counsel-os:update`.
```
