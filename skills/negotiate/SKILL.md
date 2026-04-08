---
name: negotiate
description: "Phase 3: Generate redlines with rationale, fallback positions, and negotiation strategy. Use after analyze."
---

# Negotiate — Phase 3

You are preparing a negotiation package based on the analysis from Phase 2. Your job is to generate specific proposed revisions, rationale suitable for the counterparty, fallback positions, and an overall negotiation strategy.


## Step 0: Resolve Paths

Read `config.local.md` (if it exists) or `config.md` from the plugin root to get:

- **Legal root** (`{legal_root}`) — contains law/, defaults/, practice/, memory/
- **Entity discovery** — QMD query on `counsel-os-type` frontmatter property
- **Specific entity lookup** — QMD search for company name + `counsel-os-type` value

All framework content (law areas, default positions, practice files, memory) is read from `{legal_root}/`. Entity files (companies, counterparties) are discovered via QMD queries — they can live anywhere in the user's vault.

## Prerequisites

Before starting negotiation preparation, verify:

1. **Analysis is complete.** You need the analysis report with clause-by-clause findings classified as GREEN/YELLOW/RED with priority tiers. If analysis hasn't been run, tell the user:
   > I need to complete the analysis first. Would you like me to run `/counsel-os:analyze`?

2. **Effective positions are loaded.** You need the merged positions to know what to propose.

3. **Voice preferences are loaded.** Redline comments and negotiation memos should match the user's preferred tone and style from `{legal_root}/practice/voice.md`.

## Step 0b: Load Matter File

Check for a matter file:

1. If the user referenced a specific matter ID, load it via QMD.
2. Otherwise, search QMD for `counsel-os-type: matter` + the counterparty name. Prefer matters with `stage: analyze` or `stage: negotiate`.
3. If found, read the matter file. The `## Findings` section contains the analysis results — use these as your negotiation inputs. The `## Effective Positions` section has the merged positions.
4. If no matter file exists, proceed using conversation context.

## Step 1: Identify Negotiation Items

From the analysis report, collect all YELLOW and RED findings. These are your negotiation items. For each item, you already have:

- The current clause language
- The effective position (what we want)
- The classification (YELLOW or RED)
- The priority tier (1, 2, or 3)
- The risk assessment (severity x likelihood)

Sort items by priority tier, then by risk score within each tier.

## Step 2: Generate Proposed Revisions

For each negotiation item, produce:

### 2a. Proposed Revision (Primary Position)

Draft the specific language change. This should be:
- **Precise:** Exact replacement language, not vague suggestions
- **Anchored to our effective position:** Propose what we actually want, not a pre-compromised middle ground
- **Legally sound:** Check against loaded law area requirements

Pull counter-language from `{legal_root}/defaults/clause-library.md` where available. The clause library contains proven language that has been accepted in past negotiations.

Format:
```
**Current:** "[exact current language from the document]"
**Proposed:** "[exact replacement language]"
```

### 2b. Rationale (Counterparty-Facing)

Write a brief rationale suitable for sharing with the counterparty. This should:
- Lead with **business justification**, not legal citation
- Frame the change as **mutually beneficial** where possible
- Be **professional and measured** — not adversarial
- Reference **market standards** when our position aligns with market practice
- Cite **regulatory requirements** when law mandates the change (this is your strongest argument)

Do NOT include:
- Internal strategy reasoning
- References to our risk appetite or thresholds
- Concession strategy or fallback positions
- Privileged attorney-client analysis

### 2c. Fallback Position

For each item, define what we'll accept if the counterparty pushes back on our primary position:

- **Primary position:** [What we proposed — our opening]
- **Fallback position:** [What we'd accept as a compromise]
- **Walk-away point:** [Where we stop negotiating — RED line]

For Tier 1 items: The fallback position may be narrow or identical to the primary. Some positions are non-negotiable.

For Tier 3 items: These are concession candidates. The fallback position may be "accept as drafted" — meaning we'll use these as bargaining chips.

### 2d. Related Law Constraints

If any law area creates a floor or ceiling for this clause, note it:
- "GDPR Art. 33 requires 72-hour breach notification. We cannot accept anything longer, regardless of negotiation."
- This helps the user and counterparty understand which positions are legal requirements vs. business preferences.

## Step 3: Build Negotiation Strategy

Synthesize the individual items into a coherent negotiation approach:

### 3a. Lead Issues
Identify 2-4 issues to lead with. These should be:
- High-priority (Tier 1)
- Easy to justify (strong market standard or regulatory basis)
- Likely to set the tone for the negotiation

### 3b. Concession Candidates
Identify items you're prepared to concede. These should be:
- Lower priority (Tier 3)
- Items where the counterparty's position is still acceptable (YELLOW, not RED)
- Items that give the counterparty visible "wins" without material cost

### 3c. Sequencing
Recommend the order of discussion:
- Start with the easiest items to build momentum and goodwill
- Move to the hardest items after establishing a collaborative dynamic
- Save concession candidates for strategic moments
- Group related items (e.g., negotiate all data protection provisions together)

### 3d. Trade Opportunities
Identify potential trades:
- "If they won't move on [Tier 1 item], we could offer flexibility on [Tier 3 item]"
- "Their strong position on [X] might be offset by our gain on [Y]"

## Step 4: Output the Negotiation Package

Present the package in the user's preferred format. Two main formats:

### Format A: Redline Package (for sending to counterparty)

For each item, structured for direct use in a redline or comments:

```
## Redline Package

### Item 1: [Clause Name] — [RED/YELLOW] — Tier [1/2/3]

**Section:** [document section reference]

**Current language:**
> [exact current text]

**Proposed revision:**
> [exact replacement text]

**Comment for counterparty:**
> [rationale — suitable for sharing externally]

---

[Repeat for each item]
```

### Format B: Negotiation Memo (internal strategy document)

For internal use, includes strategy and fallback positions:

```
## Negotiation Memo — PRIVILEGED AND CONFIDENTIAL

**Matter:** [matter name]
**Date:** [date]
**Prepared by:** [user's name from identity.md]

### Strategy Overview
[2-3 paragraph summary of the negotiation approach, lead issues, and overall posture]

### Issue-by-Issue Analysis

#### 1. [Clause Name] — Tier [1/2/3] — [RED/YELLOW]
**Current:** [summary of counterparty's position]
**Our primary position:** [what we're proposing]
**Fallback:** [what we'd accept]
**Walk-away:** [where we stop]
**Rationale (internal):** [full reasoning including risk analysis]
**Rationale (external):** [what to tell the counterparty]
**Law constraints:** [any regulatory floors/ceilings]
**Concession value:** [how much it costs us to concede this]

[Repeat for each item]

### Trade Matrix
| We Give | We Get | Net Assessment |
|---------|--------|---------------|
| [concession] | [gain] | [favorable/neutral/unfavorable] |

### Sequencing Recommendation
1. [First issue to raise and why]
2. [Second issue]
3. ...

### Risk Summary
- **If we get everything we want:** [risk profile]
- **If we get our fallback on everything:** [risk profile]
- **If we have to walk away:** [impact assessment]
```

## Step 5: Confirm Output Format

Ask the user which format they prefer:
> Would you like me to produce:
> (A) A **redline package** with proposed revisions and counterparty-facing comments — ready to send or paste into the document?
> (B) An **internal negotiation memo** with strategy, fallback positions, and trade analysis — privileged and confidential?
> (C) **Both** — the internal memo for your strategy, plus a clean redline for the counterparty?

If the user has already indicated a preference (e.g., "give me redlines"), proceed with that format.

## Step 6: Update Matter File

If a matter file was loaded in Step 0b, update it:

1. **Update frontmatter:** Set `stage: negotiate` and `updated: {today's date}`.

2. **Add a `## Negotiation` section** after `## Findings` (or update it if resuming):

```markdown
## Negotiation

### Items Proposed
| # | Clause | Tier | Primary Position | Fallback |
|---|--------|------|-----------------|----------|
| 1 | {clause name} | {1/2/3} | {one-line summary} | {one-line summary} |

### Strategy
- **Lead issues:** {list}
- **Concession candidates:** {list}
- **Sequencing:** {brief approach}
```

3. **Update `## Next Action`:** `Awaiting counterparty response. After resolution, proceed to /counsel-os:deliver.`

4. **Log any user decisions** to `## Decisions` with date stamp and deviation notes.

If no matter file exists, skip this step.

## After Negotiation

Once the user has completed the negotiation:
- If revisions were accepted: Proceed to `/counsel-os:deliver` to package the final output
- If further negotiation is needed: Update the analysis with new counterparty positions and iterate
- After the deal closes: Run `/counsel-os:close` to log decisions and update knowledge

### Prompt for Deliver

If the source document was a .docx file, prompt the user after outputting the redline package:

> The source is a Word document. Would you like me to continue to `/counsel-os:deliver` to generate a Word file with tracked changes? I can also apply professional formatting if the source document needs cleanup.
