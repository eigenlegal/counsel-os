---
name: setup
description: "Guided onboarding: configure your legal root, seed content, and set up your practice profile. Run once to get started."
---

# Setup — Guided Onboarding

You are helping a user set up Counsel OS from scratch. This single skill handles everything: choosing where to store content, seeding the legal framework, and walking through practice profile configuration. The goal is to go from zero to a working Counsel OS in one session.


## Step 0: Detect Environment

Determine whether you're running in **Claude Code** (CLI) or **Cowork** (Claude Desktop):

- **Claude Code**: You have shell access (Bash tool), can write to external paths, and QMD is available for entity discovery. Follow the full setup flow below.
- **Cowork**: No shell access. Follow the same setup flow, but skip the browse binary build and pandoc check in Step 2. Everything else (path selection, content seeding, practice onboarding) works the same — content still lives in the user's vault.

To detect: try to use the Bash tool with a simple command like `echo ok`. If it works, you're in Claude Code. If it's unavailable, you're in Cowork.

## Step 1: Determine Legal Root (Claude Code only)

Check if a legal root is already configured:

1. Read `config.local.md` from the plugin root (if it exists)
2. Fall back to `config.md`
3. Look for `legal_root:` value

### If legal_root is set and the directory exists:

Check if it's already populated (has law/, defaults/, practice/, memory/ with content). If so, ask:
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

After the user provides a path, write it to `config.local.md`:

```markdown
# Counsel OS Configuration (Local Override)

## Legal Root
legal_root: {user's path}

## Entity Discovery
discovery: qmd
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect]

## QMD Collection
collection: obsidian
```

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

### Defaults (from plugin `knowledge/defaults/`)
Copy positions.md, playbooks.md, checklists.md, clause-library.md. Add frontmatter if not present.

### Practice (from plugin `templates/practice/`)
Copy identity.md, principles.md, positions.md, voice.md, thresholds.md. Add frontmatter:
```yaml
---
counsel-os-type: practice
---
```

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
> - defaults/ — positions, playbooks, checklists, clause library
> - practice/ — templates ready for configuration
> - memory/ — patterns log ready

## Step 3: Identity — `{legal_root}/practice/identity.md`

Walk through each section conversationally. Don't dump all questions at once — ask 2-3 at a time.

### Opening questions:
> Let's start with the basics about your organization.
> 1. What's your organization's full legal name?
> 2. What does your organization do? (Brief description — industry, products/services, stage)
> 3. Are you in-house counsel, outside counsel, or something else?

### Follow-up based on answers:
> Now let me understand your legal team:
> 4. Who's on the legal team? (Names, titles, and areas of responsibility)
> 5. Do you use outside counsel? If so, for what areas?
> 6. Who has signing authority, and at what thresholds?

### Entity and regulatory:
> A few more structural questions:
> 7. What legal entities does your organization operate through? (Jurisdictions, entity types)
> 8. What regulatory frameworks apply to your business? (SOC 2, HIPAA, GDPR, PCI, FedRAMP, etc.)
> 9. Any other business context that shapes your legal work? (Stage, funding, strategic priorities)

After gathering responses, write the completed `identity.md` file and show the user:
> Here's your identity profile. Anything you'd like to change?

## Step 4: Principles — `{legal_root}/practice/principles.md`

### Legal philosophy:
> Now let's calibrate your legal philosophy. This determines how I approach every matter.
>
> How would you describe your overall approach to legal work? For example:
> - "We're business enablers — find the path to yes while managing risk"
> - "We're protective — better to over-flag than miss something"
> - "We're pragmatic — focus energy on material issues, accept market terms on the rest"

### Risk appetite:
> On a spectrum from conservative to aggressive, where do you fall?
> - **Conservative:** Flag everything, prefer walking away over accepting risk
> - **Moderate:** Accept market-standard risk, push on material issues
> - **Aggressive:** Move fast, accept more risk for speed, only escalate true dealbreakers
>
> Most in-house teams are moderate. Where are you?

### Priorities:
> When you can't negotiate everything (which is most of the time), what do you fight for first?
> Rank these by priority for your practice, or tell me your own framework:
> - IP ownership and assignment
> - Data protection and privacy
> - Limitation of liability
> - Indemnification
> - Termination rights
> - Confidentiality
> - Warranty and representations
> - Governing law

### Negotiation and communication:
> Two more questions:
> 1. How do you prefer to negotiate? (Full redline, comments summary, call-first, etc.)
> 2. How do you communicate legal advice internally? (Memos, Slack, email, verbal, etc.)

Write the completed `principles.md` and confirm.

## Step 5: Positions — `{legal_root}/practice/positions.md`

This is the most detailed step. Walk through each default position and ask for overrides.

### Approach:
> Now let's set your standard positions. I'll show you each default market-standard
> position and you can tell me if your standard differs.
>
> For each clause type, I need to know:
> - **Your standard:** What you typically propose
> - **What you'll accept:** Your flexibility range
> - **What you won't accept:** Your hard limits
> - **Auto-escalate triggers:** What always gets flagged regardless

### Walk through each default position:

For each clause type section in `{legal_root}/defaults/positions.md`:
1. Read the default position
2. Present a summary to the user
3. Ask: "Does this match your practice, or do you have different standards?"
4. If different: capture their position in the override format
5. If same: note that defaults apply (no override needed)

```
> **Limitation of Liability**
> The market default is: mutual cap at 12 months of fees, standard consequential
> damages exclusion, carve-outs for IP, data breach, confidentiality, and willful
> misconduct.
>
> Does this match your standard, or do you have different thresholds?
```

Repeat for each clause type. Only write overrides for positions where the user differs from defaults.

After completing all positions:
> Here are your position overrides. For any clause type not listed, the market-standard
> default will apply. Want to adjust anything?

## Step 6: Voice — `{legal_root}/practice/voice.md`

### Quick calibration:
> Let's set your writing style preferences. These affect how I draft memos,
> redlines, and communications.
>
> 1. **Tone:** How should legal work product sound? (e.g., "professional but
>    approachable," "formal and precise," "direct and concise")
> 2. **Structure:** Bullets or paragraphs? Executive summary first? How do you
>    prefer findings organized?
> 3. **Formality by audience:** Different levels for internal vs. counterparty
>    vs. board? Walk me through it.
> 4. **Any language pet peeves?** Words or phrases you love or hate?

### Optional — style by example:
> If you have a memo or redline that represents your ideal style, share it and
> I'll calibrate from it. This is often easier than describing your preferences
> in the abstract.

Write the completed `voice.md` and confirm.

## Step 7: Thresholds — `{legal_root}/practice/thresholds.md`

### Review tracks:
> Last major section: escalation thresholds. These determine which matters I flag
> for review and at what level.
>
> 1. **GREEN track (auto-approval):** What types of matters can proceed with
>    minimal review? (e.g., mutual NDAs, standard templates under $X)
> 2. **YELLOW track (single review):** What needs one reviewer? (e.g., counterparty
>    paper under $X, first deal with new counterparty)
> 3. **RED track (full review):** What needs senior/committee review? (e.g., deals
>    over $X, strategic partnerships, government contracts)

### Dollar thresholds:
> What are your dollar-based escalation tiers?
> Example: Under $25K = auto-approve, $25K-$100K = single reviewer, etc.

### Always-escalate clauses:
> Are there specific clause types that always trigger escalation regardless of
> deal value? (e.g., unlimited liability, non-competes, exclusivity)

### Law constraint floors:

After the user sets their thresholds, cross-reference against loaded `{legal_root}/law/` areas. Law constraints create hard floors that override user thresholds — for example, if law/ requires 72-hour breach notification, a threshold that accepts 5-day notification windows is invalid regardless of deal value.

Flag any conflicts:
> **Note:** Your threshold for [X] would allow positions that conflict with
> [law area] requirements. The law constraint sets a hard floor of [Y] that
> overrides this threshold. I've adjusted accordingly.

Write the completed `thresholds.md` and confirm.

## Step 8: Optional — Ingest Past Contracts

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
1. Run `/counsel-os:intake` on each one (abbreviated — classification and position extraction only)
2. Compare extracted positions against the positions just configured
3. Flag any gaps: "Your signed contracts show you've accepted X, but your stated position is Y. Want to adjust?"
4. Offer to update positions based on findings

## Step 9: Version Control

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

## Step 10: Verification

Run a quick validation:

1. **Files exist check:** Verify law/, defaults/, practice/, memory/ are all present and populated
2. **Content check:** Verify practice files have real content (not just template placeholders)
3. **Consistency check:** Verify positions don't conflict with each other or with law/ constraints
4. **Config check:** Verify `config.local.md` has the correct legal_root path

```
## Setup Complete

Your Counsel OS is configured:

- [x] Legal root: {legal_root}
- [x] identity.md — [organization name], [team size] team members
- [x] principles.md — [risk appetite] risk appetite, [priority framework summary]
- [x] positions.md — [N] position overrides, [M] using defaults
- [x] voice.md — [tone summary]
- [x] thresholds.md — GREEN under $[X], RED over $[Y]
- [x] law/ — [N] law areas seeded
- [x] defaults/ — positions, playbooks, checklists, clause library seeded
- [x] memory/ — patterns log ready

You're ready to go. Start with `/counsel-os:intake` on your next contract or matter.

To update your profile later, you can either:
- Edit the files directly in {legal_root}/practice/
- Run `/counsel-os:setup` again to walk through the guided process
```
