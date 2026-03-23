---
name: setup
description: "Guided onboarding: set up your practice profile, positions, and preferences. Run once to get started."
---

# Setup — Guided Onboarding

You are helping a new user set up their Counsel OS practice profile. Walk them through each configuration file interactively, asking questions and filling in their responses. The goal is to create a personalized practice profile that calibrates all future legal work.

## Step 1: Check Existing Setup

Check whether the user's content directories already exist:

1. **`knowledge/practice/`** — Does it exist? Are the files populated or empty templates?
2. **`knowledge/matters/`** — Does it exist? Is `_index.md` populated?
3. **`knowledge/memory/`** — Does it exist? Are the log files created?

### If directories don't exist:

Copy from templates:
```
templates/practice/ → knowledge/practice/
templates/matters/  → knowledge/matters/
templates/memory/   → knowledge/memory/
```

Run the setup script if available:
```bash
./setup
```

### If directories exist but files are unpopulated:

The files exist but contain only template placeholders. Proceed with the interactive walkthrough below.

### If directories exist and files are populated:

The user has already completed setup. Ask:
> Your practice profile is already configured. Would you like to:
> (A) Review and update your existing profile
> (B) Start fresh (this will overwrite your current settings)
> (C) Just check that everything looks good

## Step 2: Identity — `knowledge/practice/identity.md`

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

## Step 3: Principles — `knowledge/practice/principles.md`

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

## Step 4: Positions — `knowledge/practice/positions.md`

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

For each clause type section in `knowledge/defaults/positions.md`:
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

## Step 5: Voice — `knowledge/practice/voice.md`

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

## Step 6: Thresholds — `knowledge/practice/thresholds.md`

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

After the user sets their thresholds, cross-reference against loaded `knowledge/law/` areas. Law constraints create hard floors that override user thresholds — for example, if law/ requires 72-hour breach notification, a threshold that accepts 5-day notification windows is invalid regardless of deal value.

Flag any conflicts:
> **Note:** Your threshold for [X] would allow positions that conflict with
> [law area] requirements. The law constraint sets a hard floor of [Y] that
> overrides this threshold. I've adjusted accordingly.

Write the completed `thresholds.md` and confirm.

## Step 7: Optional — Ingest Past Contracts

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

## Step 8: Verification

Run a quick validation to make sure everything is properly configured:

1. **Files exist check:** Verify all practice/, matters/, and memory/ files are present
2. **Content check:** Verify each file has content (not just template placeholders)
3. **Consistency check:** Verify positions don't conflict with each other or with law/ constraints
4. **Quick test:** Run a mini intake on a sample scenario to verify the system works end-to-end

```
## Setup Complete

Your Counsel OS practice profile is configured:

- [x] identity.md — [organization name], [team size] team members
- [x] principles.md — [risk appetite] risk appetite, [priority framework summary]
- [x] positions.md — [N] position overrides, [M] using defaults
- [x] voice.md — [tone summary]
- [x] thresholds.md — GREEN under $[X], RED over $[Y]
- [x] _index.md — matters routing configured
- [x] memory files — decision, exception, and pattern logs ready

You're ready to go. Start with `/counsel-os:intake` on your next contract or matter.

To update your profile later, you can either:
- Edit the files directly in knowledge/practice/
- Run `/counsel-os:setup` again to walk through the guided process
```
