---
name: retro
description: "Practice analytics: matter and counterparty trends, knowledge-base health, and harvesting promotable knowledge from matters (archetype/corridor playbooks, proven clause language) — plus, at sufficient volume, position drift and exception-rate analysis. Use monthly."
---

# Retro — Practice Analytics

You are running a retrospective analysis of the user's legal practice. Your job is to analyze accumulated data in the memory and matters files, identify trends, and recommend improvements to positions, processes, and priorities.

**When to use:** Run monthly, or when the user wants insight into their practice patterns.

**Calibrate to the practice's shape before analyzing.** Two archetypes:

- **High-volume, homogeneous** (many similar contracts against the same positions): the statistical steps (3 and 5 — position effectiveness, exception rates) are meaningful. Run everything.
- **Low-volume, heterogeneous** (most solo/in-house practices: few matters, each structurally different): per-clause statistics are noise at n < ~10 per clause type. SKIP the statistical analysis in Steps 3 and 5 — treat deviations as individual case notes instead of trends — and make **Step 6 (Harvest)** the centerpiece. In these practices the durable knowledge is rarely clause-generic; it's deal-archetype and regulatory-posture knowledge (e.g., "how pay-ins work in jurisdiction X via partner Y"), which belongs in promoted playbooks, not position files.

State which mode you're running and why at the top of the report.


## Step 0: Resolve Paths

Resolve `{legal_root}` via the Finding the Legal Root procedure in `skills/counsel/SKILL.md`.

- **Legal root** (`{legal_root}`) — contains law/, practice/, matters/, memory/
- **Entity discovery** — enumerate and look up entity/matter files using the Knowledge Base Search procedure in counsel/SKILL.md

All framework content (law areas, standard positions, practice files, memory) is read from `{legal_root}/`. Entity files (companies, counterparties) are discovered via the Knowledge Base Search procedure — in qmd mode they can live anywhere in the vault; in filesystem mode they live under `{legal_root}/{entities_path}/`.

## Step 1: Gather Data

Read all available data sources:

### Memory Files
1. **`{legal_root}/memory/patterns.md`** — Cross-cutting practice-level observations and insights
2. **`{legal_root}/memory/retro-*.md`** — Previous retro snapshots for trend comparison

### Matter Files
3. **Enumerate all matter files** — Use the Knowledge Base Search procedure in counsel/SKILL.md to enumerate files with `counsel-os-type: matter` (filesystem fallback: `{legal_root}/{matters_path}/`). Matter files are the primary data source: frontmatter (stage, type, dates), `## Findings`, the `## Decisions` log (including deviations from standard), and `## Open Issues`.

### Entity Files
4. **Enumerate all entity files** — Use the Knowledge Base Search procedure in counsel/SKILL.md to enumerate files with `counsel-os-type` in [counterparty, vendor, customer, prospect]. These contain history, agreed positions, and notes.

### Practice Files (for comparison)
5. **`{legal_root}/practice/standards/`** — Current standard positions (to compare against actual decisions)
6. **`{legal_root}/practice/profile.md`** — Current escalation criteria (## Escalation Thresholds section)

If any files are empty or don't exist, note the gap but continue with available data. The retro is most valuable when there's enough data to identify patterns (typically after 10+ matters).

## Step 2: Analyze — Matters Overview

### Volume and Distribution

Count and categorize:
- **Total matters** in the review period (or all-time if this is the first retro)
- **By type:** contract review, NDA, negotiation, compliance, etc.
- **By complexity:** GREEN, YELLOW, RED track
- **By counterparty tier:** Tier 1/2/3/4
- **By outcome:** completed, in progress, escalated, declined

### Turnaround

If timestamps are available (matter frontmatter `created`/`updated` dates):
- Average time from intake to close, by track
- Compare against turnaround expectations in profile.md (## Escalation Thresholds section)
- Identify bottlenecks

## Step 3: Analyze — Clause Patterns

### Most-Negotiated Clauses

From the `## Findings` and `## Decisions` sections of matter files:
- Which clause types appear most frequently in YELLOW and RED findings?
- Which clause types are most often negotiated?
- Which clause types lead to the most exceptions?

### Position Effectiveness

**Volume gate:** only compute acceptance/fallback/exception rates for clause types with roughly 10+ comparable matters in the period. Below that, list notable deviations as case notes with their rationale — do not present percentages from tiny samples as trends.

For each position file in `{legal_root}/practice/standards/`:
- How often was the standard position accepted without modification?
- How often was it negotiated down to the fallback position?
- How often was an exception granted?
- Is any position consistently overridden? (This may indicate the standard is too aggressive or unrealistic.)

### Clause Drift

Compare actual accepted terms against stated positions:
- Are you consistently accepting terms below your stated standard?
- Are there positions that have informally shifted?
- Has your risk appetite changed in practice even if your standards haven't been updated?

## Step 4: Analyze — Counterparty Trends

### Pushback Patterns

From counterparty files and negotiation history:
- Which counterparties push back the hardest?
- On which specific clauses?
- Are there counterparty-specific patterns (e.g., "Big Tech vendors always refuse our data breach notification timeline")?

### Relationship Health

For counterparties with multiple interactions:
- Is the relationship getting easier or harder over time?
- Are agreed positions being honored in subsequent deals?
- Are there counterparties that should be re-tiered (moved to a higher or lower tier)?

### New Counterparty Velocity

- How many new counterparties entered the system?
- What's the typical first-deal pattern? (How long, how many issues, how much effort?)

## Step 5: Analyze — Exception Patterns

### Exception Frequency

An *exception* is a decision that accepted terms outside the practice standard. There is no separate exceptions log — find them in matter `## Decisions` entries (deviations from standard) and in entity-file agreed positions that differ from `practice/standards/`.

- How many exceptions were granted in the period?
- Which clause types have the most exceptions?
- Are exceptions trending up or down?

### Exception-to-Standard Pipeline

The most important analysis: **Are your exceptions telling you something about your standards?**

For any clause type where exceptions exceed 30% of matters (only meaningful with ~10+ matters of a comparable type — see the volume gate in Step 3):
- Your standard may be too aggressive for the current market
- Consider whether the standard should be updated to reflect actual practice
- Flag: "You've granted [N] exceptions on [clause type] out of [M] matters. Consider updating your standard position."

### One-Time vs. Precedent

Where decisions were framed as one-time vs. precedent-setting (in matter `## Decisions` entries or entity files):
- Are "one-time" exceptions being repeated? (If so, they're becoming precedent whether or not the position is updated.)
- How many exceptions were marked as precedent-setting?

## Step 6: Harvest Promotable Knowledge

The highest-value step for low-volume practices. Sweep matter files (working and closed) and entity files for knowledge that has outgrown its container and should be **promoted**:

1. **Deal-archetype / corridor playbooks → `practice/methods/`.** When 2+ matters share a structure (a payment corridor, a partner architecture, a deal type like "vendor infrastructure purchase"), the accumulated knowledge — regulatory architecture, who confirmed what and when, agreed structures, reusable instruments, open gaps — belongs in a method file the next matter can start from, not buried across matter files. This is the knowledge object between a clause position (too generic) and a matter file (too specific).
2. **Proven negotiated language → `practice/library/`.** Counter-language that was accepted in a real negotiation, with a note on the context it won in. Harvest verbatim from the executed documents or redlines where possible; mark anything reconstructed from matter notes as reconstructed.
3. **Regulatory-posture notes → entity files.** Partner- or regulator-specific posture confirmed during a matter (license scope, filing positions, comfort levels) that future deals with that entity will need.
4. **Process rules → `memory/patterns.md`** (cross-cutting only, per the remember primitive's rules).

For each candidate, present: source (matter/entity file), what would be promoted, destination, and a draft or outline. Promotion writes to user-owned practice content — ALWAYS get approval before writing.

## Step 7: Compare Against Previous Retro

If a previous retro snapshot exists:
- Compare metrics (volume, distribution, turnaround, exception rate)
- Identify improvements and regressions
- Check if previous retro recommendations were implemented
- Track trend lines over time

## Step 8: Generate Recommendations

Based on the analysis, produce specific, actionable recommendations:

### Position Updates
```
Recommendation: Update [clause type] standard position
Reason: You've accepted [fallback position] in [X] of [Y] matters (Z%).
Your stated standard of [standard] is effectively aspirational, not operational.
Suggested new standard: [based on actual practice]
```

### Threshold Adjustments
```
Recommendation: Adjust [threshold type]
Reason: [evidence from the data]
Suggested change: [specific adjustment]
```

### Process Improvements
```
Recommendation: [process change]
Reason: [evidence]
Expected impact: [what would improve]
```

### Knowledge Gaps
```
Recommendation: Add [missing content]
Reason: [gap identified during the period]
Priority: [high/medium/low]
```

### Archetype Playbooks (from Step 6 harvest)
```
Recommendation: Promote [matter/entity knowledge] into practice/methods/[playbook].md
Reason: [N] matters share this structure; the knowledge currently lives only in matter files
Contents: [regulatory architecture / agreed structures / reusable instruments / open gaps]
```

## Step 9: Knowledge Base Health Audit

The retro audits the health of the knowledge base but does NOT perform maintenance directly. Flag issues here; the user can fix them by asking to update entity files or practice standards (the `remember` primitive handles this).

### Log Bloat
- Count entries in `patterns.md`
- If patterns.md exceeds 30 entries, flag: "Patterns log has [N] entries. Consider pruning entries that have been acted on (positions updated, process changed)."

### Counterparty File Size
- Check line counts on all counterparty files
- If any executed counterparty file exceeds ~100 lines, flag: "[Counterparty] file is [N] lines with no active deals. Consider compressing and moving detailed history to the deal folder."

### Missing Agreement Summaries
- For each counterparty marked "Executed," check if the user has a detailed agreement summary in their deal folder
- If not, flag: "No detailed agreement summary found for [counterparty]. Consider generating one."

### Stale Entity Metadata
- Enumerate all entity files (Knowledge Base Search) and check for counterparties still marked as "Negotiating" that may have been executed or abandoned
- Flag any mismatches in status metadata, where the user tracks it (e.g., a `counsel-os-status` property — optional, not written by default)

## Step 10: Save Retro Snapshot

Offer to save the retro results for future comparison:

```
Should I save this retro snapshot? It will be stored in memory/ for trend
tracking in future retros.

Proposed file: memory/retro-[YYYY-MM-DD].md
```

The snapshot should include:
- Date and period covered
- Key metrics (volume, distribution, exception rate, turnaround)
- Recommendations made
- Status of previous recommendations

## Step 11: Output the Retro Report

```
## Practice Retro — [Period]

**Date:** [date]
**Period covered:** [start] to [end]
**Data sources:** [list of files analyzed]

### Executive Summary
[3-5 sentences: overall practice health, key trends, top recommendations]

### Volume & Distribution
| Metric | This Period | Previous | Trend |
|--------|-----------|----------|-------|
| Total matters | [N] | [N] | [up/down/flat] |
| GREEN track | [N] | [N] | |
| YELLOW track | [N] | [N] | |
| RED track | [N] | [N] | |
| Avg turnaround | [days] | [days] | |

### Most-Negotiated Clauses
| Clause Type | Times Raised | Negotiated | Exceptions | Acceptance Rate |
|------------|-------------|-----------|------------|----------------|
| [type] | [N] | [N] | [N] | [%] |

### Counterparty Insights
[Key counterparty patterns and trends]

### Harvest — Promotable Knowledge
| Source | What | Destination | Status |
|--------|------|-------------|--------|
| [matter/entity] | [archetype playbook / proven language / posture note] | [methods/library/entity/patterns] | [proposed/approved/written] |

### Exception Analysis
- Total exceptions: [N]
- Exception rate: [%] of matters
- Top exception areas: [clause types]
- Standards at risk: [positions that may need updating]

### Recommendations
1. **[HIGH]** [Recommendation with evidence]
2. **[MEDIUM]** [Recommendation with evidence]
3. **[LOW]** [Recommendation with evidence]

### Previous Retro Follow-up
| Recommendation | Status |
|---------------|--------|
| [prior rec] | [implemented/in progress/not started/declined] |
```
