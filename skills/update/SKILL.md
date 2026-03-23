---
name: update
description: "Pull latest product content (law/ and defaults/) without touching your practice data. Run periodically."
---

# Update — Pull Latest Content

You are updating the Counsel OS product content (law areas, default positions, playbooks, checklists, and clause library) to the latest version without touching the user's practice data, matters, or memory.

**When to use:** Run periodically (weekly or monthly) to get the latest legal content updates — new law areas, updated regulatory guidance, improved default positions, new playbooks.

## Step 1: Check Current Version

Read the current `VERSION` file:

```bash
cat VERSION
```

Note the current version for comparison after the update.

## Step 2: Run the Update Script

Execute the update script:

```bash
./update
```

The update script will:
1. Pull the latest changes from the remote repository
2. Show which files changed in `knowledge/law/` and `knowledge/defaults/`
3. Verify that `knowledge/practice/`, `knowledge/matters/`, and `knowledge/memory/` were not modified

If the update script doesn't exist or fails, perform the update manually:

```bash
# Store current version
OLD_VERSION=$(cat VERSION)

# Pull latest changes
git fetch origin
git merge origin/main --no-edit

# Show new version
NEW_VERSION=$(cat VERSION)
echo "Updated from $OLD_VERSION to $NEW_VERSION"

# Show changed files in product content directories
git diff --name-only $OLD_VERSION..$NEW_VERSION -- knowledge/law/ knowledge/defaults/
```

## Step 3: Show What Changed

Present a clear changelog to the user:

### New Law Areas
If any new directories were added under `knowledge/law/`:
```
New law areas added:
- antitrust/ — Competition law, merger review, market allocation
- insurance/ — Coverage types, claims, policy review
```

### Updated Law Areas
If existing law area files were modified:
```
Updated law areas:
- data-privacy/ccpa-cpra.md — Updated for 2026 CPRA enforcement changes
- data-privacy/overview.md — Added new trigger conditions for health data
- employment/non-competes.md — Updated for FTC non-compete rule
```

### New Default Positions
If new position sections were added to `knowledge/defaults/positions.md`:
```
New default positions:
- [filename].md — [description of what positions it covers]
```

### Updated Default Positions
If existing position files were modified:
```
Updated default positions:
- limitation-of-liability.md — Updated classification guide for data breach carve-outs
- indemnification.md — Added new market-standard counter-language
```

### New or Updated Playbooks, Checklists, Clause Library

For each category, list new or changed files with a brief description. Pay attention to:
- **New clause library categories** — new sections in `knowledge/defaults/clause-library.md` represent entirely new clause types with standard language and vendor-favorable variants.
- **Priority tier additions to checklists** — if `knowledge/defaults/checklists.md` gained priority tier guidance (Tier 1/2/3), note this as a structural change that affects how the analyze phase assigns priority.
- **New playbooks** — new sections in `knowledge/defaults/playbooks.md` mean new matter types can now be handled with step-by-step guidance.

```
New playbooks:
- [filename].md — [description]

Updated checklists:
- [filename].md — [what changed, e.g., "Added priority tier guidance"]

New clause library entries:
- [filename].md — [clause types covered]
```

### Version Change
```
Version: 0.1.0 → 0.2.0
```

## Step 4: Check for Practice Impacts

This is the critical step. Review whether any updated defaults affect the user's practice positions.

### Position Conflict Check

For each updated section in `knowledge/defaults/positions.md`:
1. Read the updated default position
2. Check if `knowledge/practice/positions.md` has an override for this clause type
3. If yes: compare the practice override against the new default
4. Flag if the update changes the baseline that the practice position was built on

```
Impact check:
- limitation-of-liability.md was updated. Your practice override exists for this
  clause type. Review the changes to ensure your override still makes sense against
  the new default.

  Default changed: Added "AI-generated output liability" as a new carve-out category.
  Your override: Silent on AI output liability.
  Recommendation: Consider adding an AI output liability position to your practice overrides.
```

### Law Constraint Check

For each updated file in `knowledge/law/`:
1. Check if the update introduces new constraints
2. Check if any practice positions now conflict with updated law requirements
3. Flag any conflicts as urgent — law always wins

```
URGENT: Updated data-privacy/ccpa-cpra.md introduces new requirements for
AI-generated profiling decisions. Your current data protection position in
practice/positions.md does not address this. Review and update your position
before your next matter involving California consumer data.
```

### New Content Review

For each new file (not just updated):
1. Summarize what was added
2. Note if it's relevant to the user's practice (based on their identity and matter history)
3. Suggest reviewing if relevant

## Step 5: Safety Verification

Verify that user content was not modified:

```bash
# These directories should have NO changes from the update
git diff --name-only HEAD~1..HEAD -- knowledge/practice/ knowledge/matters/ knowledge/memory/
```

If any user content files were modified, **alert the user immediately:**

```
WARNING: The update modified files in your practice data:
- knowledge/practice/positions.md was changed

This should NOT happen. Your practice data is protected from product updates.
Please review the changes and restore from backup if needed:
  git checkout HEAD~1 -- knowledge/practice/positions.md
```

## Step 6: Output the Update Summary

```
## Update Summary

**Previous version:** [old version]
**Current version:** [new version]
**Date:** [date]

### Changes
- [N] law area files updated
- [N] new law areas added
- [N] default positions updated
- [N] new playbooks/checklists/clause library entries

### Practice Impact
- [N] practice positions may need review (see details above)
- [N] new law constraints to be aware of
- No conflicts detected / [N] conflicts require attention

### User Content Status
- [x] knowledge/practice/ — untouched
- [x] knowledge/matters/ — untouched
- [x] knowledge/memory/ — untouched

### Recommended Actions
1. [Review updated position X against your practice override]
2. [Consider adding a position for new clause type Y]
3. [No action needed — all updates are backward compatible]
```
