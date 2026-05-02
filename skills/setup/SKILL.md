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
- **Connected index/search tools:** Is a content-index MCP tool such as QMD connected?

Adapt to the answers:

- If shell access is available, use it for detection, directory creation, copying seed files, and optional dependency checks.
- If shell access is unavailable but file tools are available, perform setup through those file tools and skip shell-only checks.
- If the environment is read-only except for a connected workspace, ask the user to choose a legal root inside that workspace.
- If no file write mechanism is available, prepare the exact files and paths the user should create, then stop after confirming what could not be written.

Claude Code is one capable host; Cowork is usually a file-tool host without shell. Other LLM environments should follow the same capability matrix rather than a hardcoded host branch.

## Step 1: Determine Legal Root

Check if a legal root is already configured by running the **Finding the Legal Root** procedure in `skills/counsel/SKILL.md`. That procedure looks for an existing marked `config.md` containing both `counsel-os-config: true` and `legal_root:` near the working location and reports back what it finds.

**Do not** read `config.local.md` or plugin documentation files. Per-user configuration lives only in the user's vault at `{legal_root}/config.md`.

### If an existing legal root was found:

Check if it's already populated (has `law/`, `practice/`, `memory/` with content). If so, ask:
> Your Counsel OS is already set up at `{legal_root}`. Would you like to:
> (A) Review and update your existing profile
> (B) Start fresh (this will overwrite your current settings)
> (C) Just check that everything looks good

### If no existing legal root was found:

Ask the user where to store the framework content:
> Where should Counsel OS store its framework content? This folder will contain your law areas, default positions, practice profile, and memory.
>
> If you use Obsidian, a good choice is a top-level folder in your vault (e.g., `~/Documents/Obsidian Vault/Counsel OS`).
> If you don't use Obsidian, any folder works (e.g., `~/legal/counsel-os`).

Then ask one optional tooling question:
> Do you already use Obsidian or a content-index tool like QMD?
>
> - If yes, I can place Counsel OS inside your existing vault and use any connected index automatically.
> - If no, we can continue with a normal folder. Obsidian and QMD are optional.
> - If you'd like, I can give you install/connect instructions for Obsidian or QMD after core setup is done.

Do not block setup on Obsidian or QMD. If the user wants install guidance, give concise instructions appropriate to the host, but continue setup with the filesystem fallback unless the user explicitly pauses to install/connect a tool.

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

### Practice (from plugin `knowledge/practice-seed/` and `templates/practice/`)
Copy the full practice seed into `{legal_root}/practice/`:
- `knowledge/practice-seed/profile.md` → `practice/profile.md`
- `knowledge/practice-seed/standards/` → `practice/standards/` (24 position files, pre-filled with market standards)
- `knowledge/practice-seed/methods/` → `practice/methods/` (method files with integrated checklists)
- `knowledge/practice-seed/library/` → `practice/library/` (clause language categories)

All files should already have `counsel-os-type: practice` frontmatter from the seed.

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
2. If yes: run `cd {plugin_root} && bun install && bun run build`
3. If no: note that the browse skill won't be available and suggest installing bun

If shell access or plugin-tree write access is unavailable, skip this step. The rest of Counsel OS still works.

### Pandoc check
If shell access is available, check if pandoc is installed (`command -v pandoc`). If not, note:
> pandoc is not installed. You'll need it to extract tracked changes from Word documents. Install with `brew install pandoc` (macOS) or `apt-get install pandoc` (Linux).

If shell access is unavailable, skip this check and tell the user `.docx` tracked-change extraction depends on pandoc in CLI-style environments.

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
4. **Config check:** Verify `{legal_root}/config.md` exists and contains `counsel-os-config: true` plus the correct `legal_root:` path

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
