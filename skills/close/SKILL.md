---
name: close
description: "Phase 5: Log decisions, update knowledge base, suggest improvements. Use after delivering work product."
---

# Close — Phase 5

You are closing out a legal matter. Your job is to capture what was learned, update the knowledge base, and suggest improvements to positions and processes. This phase turns one-off work into institutional knowledge.


## Step 0: Resolve Paths

Read `config.local.md` (if it exists) or `config.md` from the plugin root to get:

- **Legal root** (`{legal_root}`) — contains law/, defaults/, practice/, memory/
- **Entity discovery** — QMD query on `counsel-os-type` frontmatter property
- **Specific entity lookup** — QMD search for company name + `counsel-os-type` value

All framework content (law areas, default positions, practice files, memory) is read from `{legal_root}/`. Entity files (companies, counterparties) are discovered via QMD queries — they can live anywhere in the user's vault.

## Prerequisites

This phase should run after the deliverable is complete (Phase 4). However, it can also be invoked independently to log decisions or update knowledge at any time.

## Step 1: Review the Matter

Summarize what was done in this matter:

- **Matter type:** [from intake]
- **Counterparty:** [if applicable]
- **Track:** [GREEN/YELLOW/RED]
- **Phases completed:** [intake, analyze, negotiate, deliver]
- **Key outcomes:** [what was the result — deal signed, redlines sent, memo delivered, etc.]
- **Duration:** [how long the matter took]

## Step 2: Identify Knowledge Updates

Review the work product and conversation for updates worth capturing. Route each update to the correct location. **Always ask for approval before writing anything.**

**Routing principle:** Entity-specific information goes in the entity's company file. Only cross-cutting practice-level insights go in memory/.

### 2a. Entity File Update — Decisions, Exceptions, and Deal History

Did the user make decisions, accept exceptions, or close a deal? These belong in the **entity's company file** (discovered via QMD), not in memory/.

Look for:
- Accepted terms that deviate from standard positions
- Chose between competing approaches
- Made a judgment call on risk
- Approved an exception or concession
- Negotiation outcomes and agreed positions

For each finding, propose an update to the entity file:

```
I'll update the [counterparty] file with the outcome of this matter.

Proposed additions:
- Agreed Positions: [new/updated positions from this deal]
- Notable Differences: [deviations from practice standards, with Exception flag]
- Negotiation Notes: [style, key wins, key concessions, rounds]
- History: [DATE] — [matter type] — [outcome summary]
- Flags: [any follow-up items, renewal leverage points, operational concerns]
```

This keeps all entity-specific context — decisions, exceptions, deal terms, negotiation history — in one place where it will be found automatically on the next matter with this counterparty.

### 2b. Practice Patterns — `{legal_root}/memory/patterns.md`

Did anything emerge that applies **across deals**, not just to this entity? These are practice-level insights.

Look for:
- Gaps in practice positions exposed by this deal (clause types with no standard)
- Process improvements (e.g., "verify NDA entity matches contracting entity at intake")
- Market trends (e.g., "SLA credits as sole remedy is market standard for infrastructure vendors")
- Recurring pushback patterns across multiple counterparties

**Do NOT log here:**
- Entity-specific negotiation behaviors (goes in the entity file's Negotiation Notes)
- This deal's specific decisions or exceptions (goes in the entity file)

For each pattern found, propose an entry:

```
I noticed [observation]. Should I capture this as a practice pattern?

Proposed entry:
### [DATE] — [Pattern Title]
**Category:** [clause gap / process / market trend]
**Observation:** [what you noticed]
**Evidence:** [specific examples]
**Implication:** [what this means for future work]
**Action:** [update positions / update intake process / monitoring]
```

### 2d. New Counterparty Entity

Is this a counterparty we haven't dealt with before? Use a QMD query to check for an existing entity file.

If no entity file exists, propose creating one. Ask the user where to save the file:

```
This is our first matter with [counterparty]. Should I create an entity file?

Where should I save it? (e.g., a folder in your vault for this company)

Proposed file content:

---
counsel-os-type: counterparty
counsel-os-tier: [1/2/3/4]
counsel-os-category: [customer/vendor/partner]
---

# [Counterparty Name]

## Relationship
- Primary contact: [if known]
- Our relationship owner: [if known]

## Agreed Positions
[positions negotiated in this matter]

## History
- [DATE]: [matter type] — [outcome summary]

## Notes
[negotiation style, known preferences, pushback patterns]
```

If an entity file already exists (found via QMD), propose updates:

```
Should I update the entity file for [name] with the outcome of this matter?

Proposed additions:
- History: [new entry]
- Agreed positions: [any new positions established]
- Notes: [any new observations]
```

### 2e. Position Gap — `{legal_root}/practice/positions.md`

Did this matter expose a clause type not covered in the user's positions?

```
Your positions don't cover [clause type], but it came up in this matter.
Should I add a position entry for it?

Suggested starting point:
## [Clause Type]
**Our standard:** [based on what you did in this matter]
**We'll accept:** [based on flexibility shown]
**We won't accept:** [based on RED flags identified]
**Auto-escalate:** [suggested triggers]
```

### 2f. Clause Language — `{legal_root}/defaults/clause-library.md`

Did any particularly effective clause language emerge?

Look for:
- Counter-language that was accepted by the counterparty
- Compromise language that resolved a deadlock
- Well-drafted provisions from the counterparty's paper

```
The counter-language we used for [clause type] was accepted. Should I add it to the clause library?

Proposed addition to [clause-library file]:
## [Clause Variant Name]
**Use when:** [situation description]
**Language:**
> [the clause text]
**Source:** [matter name, date]
```

## Step 3: Write Approved Updates

For each update the user approves:

1. Read the target file
2. Show the exact content that will be added
3. Append or create the content
4. Confirm the write was successful

**Important:**
- Append to existing files (patterns.md, retros) — never overwrite
- Update entity files in place (add sections, update history)
- Create new files for new counterparties
- Edit existing files for position updates and clause library additions
- Always show the diff before writing

## Step 4: Commit Knowledge Updates

After writing all approved updates, check if `{legal_root}` is a git repo:

```bash
git -C {legal_root} rev-parse --is-inside-work-tree 2>/dev/null
```

### If it's a git repo:

Stage and commit all changes with a descriptive message:

```bash
cd {legal_root}
git add -A
git commit -m "Close: [matter name] — [brief summary of updates]"
```

The commit message should reflect what changed, e.g.:
- `"Close: Acme MSA — updated liability position, logged data processing exception"`
- `"Close: Vendor NDA triage — created BigCo entity file, added MFN pattern"`

If a remote is configured, offer to push:

> Knowledge updates committed. Want me to push to your remote backup?

Only push if they confirm. Do not auto-push.

### If it's not a git repo:

Skip silently. The user chose not to use version control during setup.

## Step 5: Output the Close Summary

```
## Close Summary

**Matter:** [matter name]
**Closed:** [date]
**Duration:** [time from intake to close]

### Knowledge Updates
- [x] Entity file updated: [counterparty] — agreed positions, deal history, flags
- [ ] Pattern captured: [title] → declined by user
- [x] Entity file created: [name] → [user-specified path]
- [ ] Position gap: [clause type] → user will add manually later

### Matter Statistics
- Findings: [X] GREEN, [Y] YELLOW, [Z] RED
- Items negotiated: [count]
- Items conceded: [count]
- Items escalated: [count]

### Suggested Follow-ups
- [Any pending items, future review dates, or process improvements]
```

## Step 6: Scale Management

As matters accumulate, the knowledge base needs to stay lean enough for Claude to load efficiently. Run these checks at the end of every close.

### 5a. Prune Decision and Exception Logs

Review `patterns.md` for entries that are no longer load-bearing:

- **Superseded decisions:** A later decision on the same clause type with the same counterparty replaces the earlier one. Remove the older entry.
- **Non-precedent exceptions:** Entries marked as low precedent risk that haven't been cited in any subsequent matter can be removed after 6 months.
- **Duplicate patterns:** If a pattern entry in `patterns.md` restates something already captured in a counterparty file's negotiation notes, remove the pattern entry.

For each proposed removal, show the entry and explain why it's safe to remove. Always ask before deleting.

### 5b. Compress Executed Counterparty Files

When marking a counterparty as executed with no active deals:

1. Check if the counterparty file exceeds ~100 lines
2. If so, offer to move detailed negotiation history (round-by-round notes, drafting details, tactical observations) to a summary document in the user's deal folder
3. Keep only the **operating summary** in the counterparty file: relationship metadata, entity map, agreement structure, agreed positions table, key flags, and negotiation style notes

```
The Turnkey counterparty file is [N] lines. Want me to move the detailed
negotiation history to your deal folder and keep just the operating summary here?

Counterparty file keeps: entity map, agreement structure, agreed positions, flags
Deal folder gets: full negotiation history, round-by-round notes, tactical details
```

### 5c. Detailed Agreement Summary & Negotiation History

After marking a matter as executed, offer to generate a comprehensive deal summary for the deal folder. This is separate from the counterparty file's operating summary — it's the full record.

```
Want me to generate a detailed deal summary for the deal folder? This includes:
1. Negotiation history — how we got here
2. Full agreement summary — what the executed agreement says
```

If yes, generate a single document with two parts:

**Part 1: Negotiation History**

Review all available redline versions, conversation context, and the decisions/exceptions logged for this matter. Produce a chronological account:

- Timeline of rounds (dates, who sent what)
- Key issues raised at each round and how they were resolved
- What we asked for, what we got, what we conceded, and why
- Turning points — where leverage shifted or positions changed
- Final open items and how they closed

This is the institutional memory of *how* the deal got done — useful for renewals, similar future negotiations, and onboarding anyone who needs context.

**Part 2: Executed Agreement Summary**

Full clause-by-clause walkthrough of the final executed agreement:

- Section-by-section summary of what each provision says (plain language, not just restating the legal text)
- Flag any non-standard or unusual provisions
- Note where the agreement deviates from practice positions
- Cross-reference to exceptions log entries where applicable
- Highlight any time-sensitive obligations (notice periods, renewal deadlines, reporting requirements)

Ask the user where to save the summary:

```
Where should I save the deal summary?
- Current directory: [show current working directory]
- Legal root: {legal_root}/deals/[counterparty-name]/
- Other: specify a path
```

Default suggestion is the current working directory. Save to wherever the user specifies. The entity file keeps only the operating summary.

### 5d. Entity Health Audit

Run a QMD query for all files with `counsel-os-type` frontmatter to audit entity status:
- Are all entity statuses current? (Check `counsel-os-status` values)
- Are there entities marked as "Negotiating" that should be "Executed" or "Archived"?
- Are there entity files missing required frontmatter properties (`counsel-os-type`, `counsel-os-tier`)?
- Flag any entities with stale or inconsistent metadata.

## Running Close Independently

The close skill can also be invoked outside the pipeline to:

- **Log a decision:** "Log that we accepted X in the Y deal"
- **Record an exception:** "We deviated from standard on Z, record it"
- **Capture a pattern:** "I'm noticing that vendors keep pushing back on A"
- **Create/update a counterparty file:** "Create a file for Acme Corp"

In these cases, skip the matter review steps and go directly to the relevant knowledge update.
