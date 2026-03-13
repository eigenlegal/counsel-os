---
name: retro
description: "Practice analytics: analyze decision history, exception patterns, position drift, and counterparty trends. Use weekly or monthly."
---

# Retro — Practice Analytics

You are running a retrospective analysis of the user's legal practice. Your job is to analyze accumulated data in the memory and matters files, identify trends, and recommend improvements to positions, processes, and priorities.

**When to use:** Run weekly or monthly, or when the user wants insight into their practice patterns.

## Step 1: Gather Data

Read all available data sources:

### Memory Files
1. **`knowledge/memory/decisions.md`** — All logged decisions with rationale and outcomes
2. **`knowledge/memory/exceptions.md`** — All deviations from standard positions
3. **`knowledge/memory/patterns.md`** — Previously captured observations and insights

### Matter Files
4. **All files in `knowledge/matters/counterparties/`** — Counterparty history, agreed positions, and notes
5. **All files in `knowledge/matters/deals/`** — Deal-specific context and outcomes (if any remain from active matters)
6. **`knowledge/matters/_index.md`** — Counterparty registry and relationship categories

### Practice Files (for comparison)
7. **`knowledge/practice/positions.md`** — Current standard positions (to compare against actual decisions)
8. **`knowledge/practice/thresholds.md`** — Current escalation criteria (to assess if thresholds are calibrated correctly)

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

If timestamps are available in the logs:
- Average time from intake to close, by track
- Compare against turnaround expectations in thresholds.md
- Identify bottlenecks

## Step 3: Analyze — Clause Patterns

### Most-Negotiated Clauses

From decisions and exceptions logs:
- Which clause types appear most frequently in YELLOW and RED findings?
- Which clause types are most often negotiated?
- Which clause types lead to the most exceptions?

### Position Effectiveness

For each position in `practice/positions.md`:
- How often was the standard position accepted without modification?
- How often was it negotiated down to the fallback position?
- How often was an exception granted?
- Is any position consistently overridden? (This may indicate the standard is too aggressive or unrealistic.)

### Clause Drift

Compare actual accepted terms against stated positions:
- Are you consistently accepting terms below your stated standard?
- Are there positions that have informally shifted?
- Has your risk appetite changed in practice even if positions.md hasn't been updated?

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

- How many exceptions were granted in the period?
- Which clause types have the most exceptions?
- Are exceptions trending up or down?

### Exception-to-Standard Pipeline

The most important analysis: **Are your exceptions telling you something about your standards?**

For any clause type where exceptions exceed 30% of matters:
- Your standard may be too aggressive for the current market
- Consider whether the standard should be updated to reflect actual practice
- Flag: "You've granted [N] exceptions on [clause type] out of [M] matters. Consider updating your standard position."

### One-Time vs. Precedent

From the "one-time or precedent" field in exceptions:
- Are "one-time" exceptions being repeated? (If so, they're becoming precedent whether or not the position is updated.)
- How many exceptions were marked as precedent-setting?

## Step 6: Compare Against Previous Retro

If a previous retro snapshot exists:
- Compare metrics (volume, distribution, turnaround, exception rate)
- Identify improvements and regressions
- Check if previous retro recommendations were implemented
- Track trend lines over time

## Step 7: Generate Recommendations

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

## Step 8: Save Retro Snapshot

Offer to save the retro results for future comparison:

```
Should I save this retro snapshot? It will be stored in knowledge/memory/ for trend
tracking in future retros.

Proposed file: knowledge/memory/retro-[YYYY-MM-DD].md
```

The snapshot should include:
- Date and period covered
- Key metrics (volume, distribution, exception rate, turnaround)
- Recommendations made
- Status of previous recommendations

## Step 9: Output the Retro Report

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
