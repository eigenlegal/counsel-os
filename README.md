# Counsel OS

A legal operating system for Claude Code. Review contracts, triage NDAs, negotiate redlines, assess compliance, and more — all grounded in your standards, your playbooks, and your judgment.

Built for solo practitioners, law firms, and in-house counsel.

## How It Works

### 5-Layer Knowledge System

Counsel OS uses a layered knowledge architecture with explicit precedence rules:

```
law/        → Hard constraints (regulations, statutes) — NEVER overridden
matters/    → Deal-specific overrides — beat your defaults for that deal
practice/   → Your judgment (standards, philosophy) — beat market defaults
defaults/   → Market-standard positions — used when you haven't specified
memory/     → Institutional learning — informs but doesn't override
```

`law/` and `defaults/` ship with the product and are updated by us. `practice/`, `matters/`, and `memory/` are yours — never touched by product updates.

### Pipeline Skills

Every legal matter flows through phases, not one-off tasks:

| Skill | Phase | What It Does |
|-------|-------|-------------|
| `/counsel-os:intake` | 1 | Classify matter, auto-detect applicable law, load context |
| `/counsel-os:analyze` | 2 | Deep review against your effective positions |
| `/counsel-os:negotiate` | 3 | Generate redlines with strategy and fallback positions |
| `/counsel-os:deliver` | 4 | Package output, post to Slack/Drive/Office |
| `/counsel-os:close` | 5 | Log decisions, update knowledge, learn |

Plus utilities:

| Skill | What It Does |
|-------|-------------|
| `/counsel-os:browse` | Extract documents from portals via headless browser |
| `/counsel-os:retro` | Practice analytics from your decision history |
| `/counsel-os:setup` | Guided onboarding |
| `/counsel-os:update` | Pull latest law/ and defaults/ content |

### Auto-Detection of Applicable Law

You don't need to specify which regulations apply. The intake phase scans your document against trigger conditions for 12 legal areas (data privacy, consumer protection, employment, IP, securities, etc.) and loads all matching areas automatically. Multiple areas can apply simultaneously — they compound, not replace.

## Quick Start

### Option A: Claude Code (CLI)

```bash
git clone <repo-url> ~/counsel-os
cd ~/counsel-os
./setup
claude
```

### Option B: Claude Desktop (Cowork)

1. Download the plugin as a `.zip` file
2. Open Claude Desktop → Cowork → Customize → Browse plugins
3. Upload the `.zip` — it installs automatically
4. Start a new conversation in Cowork mode

### Option C: Claude Code Plugin

```bash
claude plugin add counsel-os
```

### Personalize (5 files)

| File | What to Fill In | Priority |
|------|----------------|----------|
| `knowledge/practice/identity.md` | Your organization, entities, team, regulatory posture | Required |
| `knowledge/practice/principles.md` | Legal philosophy, risk appetite, priorities, negotiation style | Required |
| `knowledge/practice/positions.md` | Your standard positions for each clause type | Required (build over time) |
| `knowledge/practice/voice.md` | Writing voice, tone, formatting preferences | Recommended |
| `knowledge/practice/thresholds.md` | Escalation criteria and auto-approval rules | Recommended |

Run `/counsel-os:setup` to fill these in interactively, or edit them directly.

### Start Using It

```
/counsel-os:intake path/to/contract.pdf
/counsel-os:analyze
/counsel-os:negotiate
/counsel-os:deliver
/counsel-os:close
```

Or for quick tasks:
```
/counsel-os:intake "NDA from Acme Corp, standard bilateral, need it back by Friday"
```

## What's Included

**Product content (updated by us):**
- 12 legal areas with auto-detection trigger conditions
- 13 market-standard clause positions
- 11 playbooks with step-by-step processes
- 6 checklists for completeness
- 6 clause library categories

**You provide:**
- Your organization context
- Your legal principles and risk appetite
- Your standard positions (overrides to our defaults)
- Your counterparty context (built over time)

## Updating

```
/counsel-os:update
```

Pulls the latest `law/` and `defaults/` content. Your `practice/`, `matters/`, and `memory/` are never touched.

## License

MIT

---

## Built by Eigen Legal

Counsel OS is a free, open source tool built by [Eigen Legal](https://eigenlegal.com). We help law firms and in-house legal teams build custom AI workflows — trained on your standards, your playbooks, and your judgment.

Want a custom version built for your practice? [Book a free consultation](https://eigenlegal.com)
