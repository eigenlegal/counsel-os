---
name: setup
description: "Guided onboarding: configure your legal root, seed content, and set up your practice profile. Run once to get started."
---

# Setup — Guided Onboarding

You are helping a user set up Counsel OS from scratch. This single skill handles everything: choosing where to store content, seeding the legal framework, and walking through practice profile configuration. The goal is to go from zero to a working Counsel OS in one session.


## Step 0: Detect Environment

Determine whether you're running in **Claude Code** (CLI) or **Cowork** (Claude Desktop):

- **Claude Code**: You have shell access (Bash tool), can write to external paths, and can detect optional tools (QMD, bun, pandoc). Follow the full setup flow below.
- **Cowork**: No shell access. Follow the same setup flow, but skip the browse binary build and pandoc check in Step 2. Everything else (path selection, content seeding, practice onboarding) works the same — content still lives in the user's vault.

To detect: try to use the Bash tool with a simple command like `echo ok`. If it works, you're in Claude Code. If it's unavailable, you're in Cowork.

## Step 1: Detect Optional Dependencies (Claude Code only)

Before writing config, detect what the user has installed. This determines how entity discovery is configured.

```bash
command -v qmd >/dev/null 2>&1 && echo "HAS_QMD: yes" || echo "HAS_QMD: no"
```

Record the result. You'll use it in Step 1b when writing `config.local.md`.

If QMD is missing, tell the user:
> I don't see QMD installed. QMD is a content-indexing tool that lets Counsel OS find counterparty and matter files anywhere in your vault — not just inside the legal root. Without it, entity files need to live under `{legal_root}/entities/` so they can be found via filesystem search.
>
> You can install QMD later (https://github.com/qmd-tools/qmd) and re-run `/counsel-os:setup` to switch. Want to proceed with filesystem discovery for now?

If they proceed: set `DISCOVERY_MODE=filesystem`. If they want to stop and install QMD first: pause setup.

## Step 1b: Determine Legal Root

Check if a legal root is already configured. **`config.local.md` is optional** — fresh installs only have `config.md` (the shipped default), and that's normal. Don't report `config.local.md` as missing; it's expected to be absent on first setup.

1. Read `config.local.md` from the plugin root *if present* (user-specific override). Skip silently if absent.
2. Read `config.md` from the plugin root (always present — shipped with the plugin).
3. Look for `legal_root:` value in whichever was found. If neither has a value, treat as unconfigured and ask the user where to put their legal root (see "If legal_root is empty or not configured" below).

### If legal_root is set and the directory exists:

Check if it's already populated (has law/, practice/, memory/ with content). If so, ask:
> Your Counsel OS is already set up at `{legal_root}`. Would you like to:
> (A) Review and update your existing profile
> (B) Start fresh (this will overwrite your current settings)
> (C) Just check that everything looks good

### If legal_root is set but the directory doesn't exist:

Confirm the path and proceed to seeding:
> I'll create the Counsel OS framework at `{legal_root}`. Does that look right?

### If legal_root is empty or not configured:

Ask the user where to store the framework content:
> Where should Counsel OS store its framework content? This folder will contain your law areas, default positions, practice profile, and memory.
>
> If you use Obsidian, a good choice is a top-level folder in your vault (e.g., `~/Documents/Obsidian Vault/Counsel OS`).
> If you don't use Obsidian, any folder works (e.g., `~/legal/counsel-os`).

After the user provides a path, detect whether it looks like an Obsidian vault:

```bash
[ -d "{user's path}/.obsidian" ] || [ -d "$(dirname '{user's path}')/.obsidian" ] && echo "IS_OBSIDIAN: yes" || echo "IS_OBSIDIAN: no"
```

Then write `config.local.md` with the discovery mode from Step 1. Pick ONE of the two templates below:

### If `DISCOVERY_MODE=qmd` (QMD is installed):

```markdown
# Counsel OS Configuration (Local Override)

## Legal Root
legal_root: {user's path}

## Entity Discovery
discovery: qmd
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect, matter]

## QMD Collection
collection: {obsidian if IS_OBSIDIAN=yes, otherwise ask the user what QMD collection to use}
```

### If `DISCOVERY_MODE=filesystem` (QMD is missing):

```markdown
# Counsel OS Configuration (Local Override)

## Legal Root
legal_root: {user's path}

## Entity Discovery
discovery: filesystem
entities_path: entities
# Relative to legal_root. Entity files (counterparties, vendors, customers, prospects)
# live under {legal_root}/entities/ and are discovered via filesystem grep on the
# counsel-os-type frontmatter field.
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect, matter]
```

Also create `{legal_root}/entities/` as part of Step 2 when in filesystem mode.

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

### Practice (from plugin `knowledge/practice-seed/` and `templates/practice/`)
Copy the full practice seed into `{legal_root}/practice/`:
- `knowledge/practice-seed/profile.md` → `practice/profile.md`
- `knowledge/practice-seed/standards/` → `practice/standards/` (24 position files, pre-filled with market standards)
- `knowledge/practice-seed/methods/` → `practice/methods/` (method files with integrated checklists)
- `knowledge/practice-seed/library/` → `practice/library/` (clause language categories)

All files should already have `counsel-os-type: practice` frontmatter from the seed.

### Matters directory
Create `{legal_root}/matters/` (empty — populated when substantive work begins).

### Entities directory (filesystem discovery only)
If `DISCOVERY_MODE=filesystem`, create `{legal_root}/entities/` (empty — populated when `/counsel` closes a matter and proposes an entity file).

### Memory (from plugin `templates/memory/`)
Copy patterns.md. Add frontmatter:
```yaml
---
counsel-os-type: memory-patterns
---
```

### Build browse binary
If the plugin has `browse/src/` but no `browse/dist/browse`, try to build it:
1. Check if `bun` is available: `command -v bun`
2. If yes: run `cd {plugin_root} && bun install && bun run build`
3. If no: note that the browse skill won't be available and suggest installing bun

### Pandoc check
Check if pandoc is installed (`command -v pandoc`). If not, note:
> pandoc is not installed. You'll need it to extract tracked changes from Word documents. Install with `brew install pandoc` (macOS) or `apt-get install pandoc` (Linux).

Report what was seeded and built:
> Counsel OS framework seeded at `{legal_root}`:
> - law/ — 26 legal area files
> - practice/ — profile template, 24 standards, methods, clause library
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
> This creates a private git repo in `{legal_root}` so you can see how your practice evolves over time. Every time you close a matter and update your knowledge, the changes are committed automatically.

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

1. **Files exist check:** Verify law/, practice/ (with profile.md, standards/, methods/, library/), matters/, memory/ are all present and populated
2. **Content check:** Verify profile.md has real content (not just template placeholders)
3. **Consistency check:** Verify positions don't conflict with each other or with law/ constraints
4. **Config check:** Verify `config.local.md` has the correct legal_root path

```
## Setup Complete

Your Counsel OS is configured:

- [x] Legal root: {legal_root}
- [x] profile.md — [organization name], [risk appetite], [tone], [thresholds]
- [x] standards/ — [N] positions customized, [M] using market defaults
- [x] methods/ — [N] reference guides seeded
- [x] library/ — clause library seeded
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
