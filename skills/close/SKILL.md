---
name: close
description: "Phase 5: Log decisions, update knowledge base, suggest improvements. Use after delivering work product."
---

# Close — Phase 5

You are closing out a legal matter. Your job is to capture what was learned, update the knowledge base, and suggest improvements to positions and processes. This phase turns one-off work into institutional knowledge.

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

Review the work product and conversation for updates worth capturing. For each potential update, determine the category and show what would change. **Always ask for approval before writing anything.**

### 2a. Decisions — `knowledge/memory/decisions.md`

Did the user make a significant legal decision during this matter?

Look for:
- Accepted terms that deviate from standard positions
- Chose between competing approaches
- Made a judgment call on risk
- Approved an exception

For each decision found, propose an entry:

```
I noticed you accepted [specific term]. Should I log this decision?

Proposed entry:
### [DATE] — [Brief Decision Title]
**Matter:** [counterparty/deal]
**Decision:** [what was decided]
**Rationale:** [why]
**Risk accepted:** [any risk consciously accepted]
**Decided by:** [who]
```

### 2b. Exceptions — `knowledge/memory/exceptions.md`

Did the user deviate from their standard positions?

Look for:
- Accepted terms below the practice standard
- Agreed to terms normally marked as RED
- Made a one-time concession
- Overrode a default position for a specific reason

For each exception found, propose an entry:

```
You deviated from your standard on [clause type] — accepting [what] instead of [standard].
Should I log this as an exception?

Proposed entry:
### [DATE] — [Brief Exception Title]
**Matter:** [counterparty/deal]
**Standard position:** [what the standard says]
**What we accepted:** [the actual term]
**Why:** [justification]
**One-time or precedent:** [assessment]
```

### 2c. Patterns — `knowledge/memory/patterns.md`

Did anything notable emerge that's worth tracking?

Look for:
- Counterparty negotiation behaviors worth remembering
- Clause types that keep coming up
- Market trends observed
- Process insights (what worked well or poorly)
- Recurring pushback on specific positions

For each pattern found, propose an entry:

```
I noticed [observation]. Should I capture this as a pattern?

Proposed entry:
### [DATE] — [Pattern Title]
**Category:** [negotiation/counterparty/clause/process/market trend]
**Observation:** [what you noticed]
**Evidence:** [specific examples]
**Implication:** [what it means for future work]
```

### 2d. New Counterparty — `knowledge/matters/counterparties/`

Is this a counterparty we haven't dealt with before?

If no counterparty file exists, propose creating one:

```
This is our first matter with [counterparty]. Should I create a counterparty file?

Proposed file: knowledge/matters/counterparties/[name].md

# [Counterparty Name]

## Relationship
- Category: [customer/vendor/partner]
- Tier: [1/2/3/4]
- Primary contact: [if known]
- Our relationship owner: [if known]

## Agreed Positions
[positions negotiated in this matter]

## History
- [DATE]: [matter type] — [outcome summary]

## Notes
[negotiation style, known preferences, pushback patterns]
```

If a counterparty file already exists, propose updates:

```
Should I update the counterparty file for [name] with the outcome of this matter?

Proposed additions:
- History: [new entry]
- Agreed positions: [any new positions established]
- Notes: [any new observations]
```

### 2e. Position Gap — `knowledge/practice/positions.md`

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

### 2f. Clause Language — `knowledge/defaults/clause-library.md`

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
- Append to existing files (decisions.md, exceptions.md, patterns.md) — never overwrite
- Create new files for new counterparties
- Edit existing files for position updates and clause library additions
- Always show the diff before writing

## Step 4: Output the Close Summary

```
## Close Summary

**Matter:** [matter name]
**Closed:** [date]
**Duration:** [time from intake to close]

### Knowledge Updates
- [x] Decision logged: [title] → memory/decisions.md
- [x] Exception logged: [title] → memory/exceptions.md
- [ ] Pattern captured: [title] → declined by user
- [x] Counterparty file created: [name] → matters/counterparties/[name].md
- [ ] Position gap: [clause type] → user will add manually later

### Matter Statistics
- Findings: [X] GREEN, [Y] YELLOW, [Z] RED
- Items negotiated: [count]
- Items conceded: [count]
- Items escalated: [count]

### Suggested Follow-ups
- [Any pending items, future review dates, or process improvements]
```

## Step 5: Scale Management

As matters accumulate, the knowledge base needs to stay lean enough for Claude to load efficiently. Run these checks at the end of every close.

### 5a. Prune Decision and Exception Logs

Review `decisions.md` and `exceptions.md` for entries that are no longer load-bearing:

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

Save the combined document to the user's deal folder (not in the knowledge base). The counterparty file in `knowledge/matters/counterparties/` keeps only the operating summary.

### 5d. Index Health Check

Check `_index.md`:
- Are all counterparty statuses current?
- Are there counterparties listed as "Negotiating" that should be "Executed" or "Archived"?
- Is the active deals table accurate?
- Flag if the index exceeds 100 lines and suggest consolidating inactive counterparties.

## Running Close Independently

The close skill can also be invoked outside the pipeline to:

- **Log a decision:** "Log that we accepted X in the Y deal"
- **Record an exception:** "We deviated from standard on Z, record it"
- **Capture a pattern:** "I'm noticing that vendors keep pushing back on A"
- **Create/update a counterparty file:** "Create a file for Acme Corp"

In these cases, skip the matter review steps and go directly to the relevant knowledge update.
