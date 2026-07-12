# Clean-Machine Install QA Runbook (cou-4)

The pre-launch install gate. A virgin-hardware pass through **both** install paths
(Claude Code marketplace + Claude Desktop / Cowork), the browse / Chromium first-run
download, and `/counsel-os:setup` — with the expected result spelled out for every step
so a "yes, it worked" is verifiable, not vibes.

> **Who runs this.** The pass itself is **founder-led on a genuinely fresh Mac** — install
> bugs were fixed only days before the launch window (v0.9.24–25), so a real clean-machine
> result is a hard gate before the loud launch. This document is the checklist the founder
> (or whoever holds fresh hardware) follows; engineering drafts and maintains it but does
> **not** mark the pass complete. Record the result in the cou-4 task on the eigen board.

## Why a fresh machine is non-negotiable

A development machine almost certainly already has Bun, Playwright Chromium, pandoc, a
populated plugin cache, and a configured legal root. Every one of those **masks** the path a
new user actually hits:

- **Bun + Playwright present** → the browse skill silently uses the from-source build and the
  ~250 MB prebuilt-download path (`browse/bin/find-browse`) is never exercised. That download
  path is what 99% of marketplace users get, and it is the most fragile surface.
- **Plugin cache populated** → marketplace cache-invalidation bugs don't reproduce.
- **Legal root already configured** → `/counsel-os:setup`'s "no root found" branch (the one
  every new user takes) never runs.

So: a **new macOS user account** or a **fresh VM/clone** is the minimum. A brand-new Mac is
ideal. Confirm the starting state is clean before you begin (Step 0).

## Scope of this pass

| In scope | Out of scope |
|----------|--------------|
| Claude Code marketplace install (Path A) | Load-testing, performance benchmarking |
| Claude Desktop / Cowork install (Path B) | Eval quality (covered by `scripts/run_evals.py`) |
| Browse binary + Chromium first-run download | Any real client matter or counterparty |
| `/counsel-os:setup` end-to-end | Publishing / release (founder-gated, separate) |
| qmd-offer flow in setup (install / index / decline) | Semantic search quality (`qmd embed` is opt-in, never run at setup) |
| One synthetic-NDA smoke test per path | |
| `/counsel-os:doctor` as the verification readout | |

**Data rule:** use a **synthetic NDA only** for the smoke test — never a real matter. Point
setup at a **throwaway legal root** (e.g. `~/cos-qa-vault`), **never** the firm's iCloud vault.

---

## Step 0 — Confirm the machine is actually virgin

Before installing anything, capture a baseline so you can prove the machine was clean and,
afterward, see exactly what the install supplied.

```bash
# Read-only probe — prints OS/toolchain state and any pre-existing Counsel OS artifacts.
# Ships in the repo; copy it over or run from a clone. Exits 1 if the machine is NOT clean.
bash scripts/qa/clean-machine-probe.sh
```

**Expected:** verdict `CLEAN — no Counsel OS artifacts found`, and the toolchain section shows
the optional dependencies you intend to test *missing* (at minimum `bun: missing` and
`playwright-chromium: missing`, so the browse download path runs, and `qmd: missing` with **no**
`qmd counsel-os collection`, so setup's qmd install-offer fires — see Step Q). If the probe
reports existing artifacts, this is not a clean machine — use a fresh account/VM.

Note for later: the probe is worth re-running **after** the pass — it then shows the binary,
Chromium cache, and plugin cache the install created (a second confirmation the download path
fired).

---

## Path A — Claude Code marketplace (recommended path)

This is the path the README leads with and the one most users take. Run it first.

| # | Action | Expected result |
|---|--------|-----------------|
| A1 | In Claude Code: `/plugin marketplace add eigenlegal/counsel-os` | Marketplace added; a clone appears at `~/.claude/plugins/marketplaces/eigenlegal`; `counsel-os` shows in the catalog. |
| A2 | `/plugin install counsel-os@eigenlegal` | Install succeeds; cache populated at `~/.claude/plugins/cache/eigenlegal/counsel-os/{version}/`; `{version}` equals the latest GitHub release (`cat ~/.claude/plugins/cache/eigenlegal/counsel-os/*/VERSION`). |
| A3 | Quit and reopen Claude Code (**Cmd-Q**, not just the window), start a **new session** | Plugin loads clean. |
| A4 | Type `/counsel-os:` and inspect the skill list | All seven skills present: `setup`, `counsel`, `browse`, `doctor`, `retro`, `update`, `law-refresh`. |
| A5 | Run `/counsel-os:doctor` (before setup) | Runs and returns its table. Check 1 (Legal root) is **❌ — run /counsel-os:setup** (expected: no vault yet). The plugin itself loaded, which is what A5 proves. |

**Known failure mode — cache invalidation on older Claude Code builds.** If A2 fails or hangs,
or A4 shows stale/missing skills:

```bash
cd ~/.claude/plugins/marketplaces/eigenlegal && git pull   # refresh the marketplace clone
# Then fully quit Claude Code with Cmd-Q (closing the window is not enough — Claude Code holds
# the manifest in memory) and retry the install.
```

If it still fails, the local-clone path (`claude --plugin-dir`) is the documented fallback —
note it in results but a marketplace failure on a clean machine is a **launch blocker**, not a
"document the workaround."

→ Now run **Step S (setup)**, **Step B-browse (browse)**, and **Step T (smoke test)** under
this install, then come back for Path B.

---

## Path B — Claude Desktop / Cowork (no terminal)

The no-terminal path. Cowork is a file-tool host with no shell, so a few CLI-only features are
expected to be absent — that's correct behavior, not a bug.

| # | Action | Expected result |
|---|--------|-----------------|
| B1 | Claude Desktop → **Cowork** → **Customize** → **Plugins** → **Add marketplace** | Add-marketplace dialog opens. |
| B2 | Paste `https://github.com/eigenlegal/counsel-os` and confirm | New marketplace appears with Counsel OS available. |
| B3 | Install **Counsel OS** | Installs without error. |
| B4 | Start a **new conversation**, run `/counsel-os:setup` | Setup activates and runs through file tools (no shell). |
| B5 | Confirm CLI-only features degrade gracefully | `/counsel-os:browse` unavailable; redlines come back as **markdown** (not native `.docx` tracked changes); structured `.docx` markup ingestion unavailable — each should be explained, not error. |

**Cowork-specific check:** `/counsel-os:doctor` in Cowork reports shell-dependent checks (5, 6,
7, 8, 9) as `—` "not checkable in this runtime (no shell)" and still runs the file-based checks
(1, 2, 3, 4, 10, 11). That `—`-not-❌ behavior is the expected, correct degradation.

→ Run **Step S (setup)** and **Step T (smoke test)** under Cowork too (browse is skipped here).

---

## Step S — `/counsel-os:setup`

Run once per install path. Point it at a **throwaway** legal root. Setup opens with a fork —
**Express** (default, ~3 min) vs **Custom** (full interview). Walk **Express** here (it's what a
new user takes); spot-check Custom once via S-custom.

### S-express — Express path (default)

| # | Action | Expected result |
|---|--------|-----------------|
| S1 | Run `/counsel-os:setup` | Detects capabilities; offers the **Express (default) vs Custom** fork; on a clean machine reports no existing legal root and asks where to store content (after an optional read-only Obsidian probe — it must **never** install Obsidian). |
| S2 | Take Express; give a throwaway path, e.g. `~/cos-qa-vault` (not the iCloud vault) | Writes `{root}/config.md` containing `counsel-os-config: true` and `legal_root: ~/cos-qa-vault`; writes the pointer `~/.counsel-os/legal-root`. |
| S3 | Answer the **three identity basics** (name, org/role, jurisdiction) and the **one practice question** | Only those ~4 decisions are asked — **no** full profile/standards interview. Seeds content: `law/` has **26** area directories; `practice/` has `profile.md`, `standards/` (**24** files), `methods/`, `library/`, `reference/`; `matters/`, `memory/`, `entities/` created. |
| S4 | Inspect the seeded pack | Every file in `practice/standards/` carries a **"Starting point, not legal advice"** banner under its title. `profile.md` is tailored to the practice answer — a **deep** variant for in-house SaaS GC, an **honest base-default** (clearly labeled "general starting-point defaults") for any other answer, with the identity fields filled in. |
| S5 | Reach the closing card | One git question (or silent if git already present); qmd offer (Step Q); closing card names where the practice lives, that positions are editable markdown, and points at **`/counsel-os:demo`**. Whole Express run is roughly **3 minutes**. |
| S6 | Verify | `/counsel-os:doctor` Check 1 now ✅ (marked config) and Check 2 ✅ with per-area counts (`law … · standards 24 · …`). |

**S-express-resume — the qmd restart round-trip.** If you accept the qmd install offer during
Express (Step Q-accept), setup writes `~/.counsel-os/setup-resume`, gives the install steps, and
finishes on the filesystem fallback. After you restart and re-run `/counsel-os:setup`, it must
**resume Express** — pick up qmd indexing (Phase 2) and show the Express closing card — **not**
re-ask identity/the practice question and **not** drop into the returning-user Review/Start-fresh
branch. The marker is cleared afterward (`~/.counsel-os/setup-resume` gone).

### S-custom — Custom path (spot-check once)

| # | Action | Expected result |
|---|--------|-----------------|
| SC1 | Re-run on a second throwaway root, pick **Custom** | Runs the full interview (Steps 1–7): profile sections (Identity/Principles/Voice/Escalation) and the standards walkthrough, unchanged from before. |
| SC2 | Walk a couple of prompts | `profile.md` gets real content; standards walkthrough updates `## Our Position` where you change something. |

Re-running setup on an already-seeded root must be **safe** — it offers Review / Start-fresh /
Check rather than blindly overwriting. Spot-check that branch once.

> Setup's optional-tools beat also proactively offers **qmd** (the on-device content index).
> Walk that under **Step Q** below — it has its own three-branch flow and a session restart.

---

## Step Q — qmd offer in setup (optional local search)

`/counsel-os:setup` **proactively** detects whether qmd — the optional on-device content index
that powers fast search and **entity discovery across the whole vault by frontmatter** — is
usable, and if not, offers to install and index it. The offer must be correct (qmd is a Claude
**plugin**, *not* an Obsidian-style `brew --cask`), never auto-install, always skippable, and
leave the filesystem fallback intact. This step exercises all three branches.

**On a clean machine qmd is absent** (Step 0 shows `qmd: missing`, no `qmd counsel-os
collection`), so the natural first run hits the **install offer**. The order below lets one
clean machine cover every branch in sequence: decline first (cheap), then accept → install →
index, then re-run to confirm the already-wired branch. If the probe shows qmd already present
or a `counsel-os` collection, you are **not** on a clean qmd surface — note it and prefer a
fresh account.

### Q-decline — user declines the offer (filesystem fallback)

| # | Action | Expected result |
|---|--------|-----------------|
| Q1 | During `/counsel-os:setup` (qmd absent), reach the optional-tools beat | Setup surfaces a short qmd offer **without being asked**: states the value (faster local search + entity discovery across the whole vault by frontmatter), calls it a **separate, local, open-source Claude plugin** that runs on-device with **no API key**, says it's **a few steps + a restart**, and that **skipping is completely fine**. It must **not** present qmd as a `brew --cask` (that's Obsidian's path). |
| Q2 | Decline / skip the offer | Setup continues and **completes** on filesystem search. **No** `/plugin` command and **no** `qmd` command runs. |
| Q3 | Verify nothing was created | Re-run `bash scripts/qa/clean-machine-probe.sh` → still `qmd counsel-os collection: none/n-a`; `~/.cache/qmd/models/` absent. The decline left zero qmd artifacts. |
| Q4 | Verify counsel-os still works | A counsel ask (e.g. Step T's "Review this NDA") works via filesystem search — qmd absence is not a blocker. |
| Q5 | doctor stays green | `/counsel-os:doctor`: Check **5e** (qmd CLI) **⚠️ missing** — an acceptable optional dep, **never ❌**; Check **9** (search-index freshness) **✅** "no index configured — filesystem search in use (optional)." A missing/declined qmd is **not a defect**. |

### Q-accept — user accepts (install → restart → index)

Two phases: Phase 1 is user-run (a `/plugin` install + restart is inherently user-driven);
Phase 2 runs only with explicit per-step consent.

| # | Action | Expected result |
|---|--------|-----------------|
| QA1 | Accept the offer | Setup shows **Phase 1** commands to run **yourself** — exactly `/plugin marketplace add tobi/qmd` then `/plugin install qmd@qmd` (**not** a `brew --cask` line) — then says to **restart Claude and re-run `/counsel-os:setup`**, and **continues setup to completion on the filesystem fallback** (qmd is not required to finish). |
| QA2 | Run the two `/plugin` commands | qmd plugin installs and registers its MCP server. |
| QA3 | **Cmd-Q**, reopen, new session, re-run `/counsel-os:setup` | The qmd `query` MCP tool is now connected. Setup detects qmd usable but **no collection yet** → offers **Phase 2** (index the vault). It does not make you start setup over. |
| QA4 | Consent to Phase 2 | **Only after your explicit yes**, setup runs `qmd collection add <vault_root> --name counsel-os` then `qmd update`. `<vault_root>` is the **Obsidian vault root** containing the legal root (or the legal root's parent if there's no vault) — so frontmatter entity discovery spans the whole vault. |
| QA5 | Confirm BM25-only, no model download | `qmd update` builds the **BM25** index only — **key-free, no model download**. During setup, **no** ~940MB grab into `~/.cache/qmd/models/`. A trial `query` returns vault hits; setup confirms qmd is **wired**. |
| QA6 | Confirm `qmd embed` is only *mentioned* | Setup mentions `qmd embed` as an **optional** later step (one-time ~940MB local model download) but **does not run it**. `~/.cache/qmd/models/` stays absent. |
| QA7 | doctor reflects it | Check **5e** (qmd CLI) **✅ found**; Check **9** **✅** — on a BM25-only install (no `~/.cache/qmd/models/`), pending-embedding is reported ✅ with an "embeddings not enabled — opt-in" detail, **not** ⚠️, and doctor must **not** prescribe a bare `qmd embed`. Never ❌. |

### Q-wired — re-run when already present + indexed (idempotency)

| # | Action | Expected result |
|---|--------|-----------------|
| QW1 | With qmd installed and the `counsel-os` collection present (the end state of Q-accept), run `/counsel-os:setup` **again** | Setup sees the `query` tool **and** an existing collection covering the vault → simply reports **"qmd is wired"** and continues. **No offer**, and it does **not** create a duplicate collection. |
| QW2 | Confirm no duplicate | `qmd collection list` shows a **single** `counsel-os` collection, not two. |

**Reading the result.** On a minimal clean install, qmd absent is the **expected** state, and a
deliberate decline must leave doctor green (5e ⚠️, 9 ✅) — that is a **pass**, not a blocker.
Defects are: a hard **❌** on a qmd check; the offer mis-presenting qmd as an Obsidian
`brew --cask`; `qmd embed` or any model download firing **during setup**; a **duplicate**
collection on re-run; or setup **blocking** on qmd instead of completing on the fallback.

---

## Step B-browse — Browse binary + Chromium first-run (Claude Code only)

**The single most important clean-machine step.** On a machine with **no Bun and no Playwright
Chromium** (confirm via Step 0), the first browse call must download everything it needs from
the GitHub release and end up working. This is the path the from-source dev build hides.

| # | Action | Expected result |
|---|--------|-----------------|
| BR1 | Run `/counsel-os:browse`, then ask it to navigate somewhere simple, e.g. `Go to example.com and tell me the heading` | First call triggers the download (`browse/bin/find-browse`). On stderr you should see, in order: `downloading prebuilt counsel-browse-… (~65-100MB)`, `playwright runtime not installed — downloading … (~5MB)`, `Playwright Chromium not installed — downloading … (~250MB, one time)`. Then the daemon starts (~3 s) and returns the page heading. |
| BR2 | Confirm where it landed | Binary at `~/.claude/plugins/cache/eigenlegal/counsel-os/{version}/browse/dist/browse`, **or** `~/.counsel-os/browse/dist/browse` if the plugin tree wasn't writable. Chromium under `~/Library/Caches/ms-playwright/chromium-*`. |
| BR3 | Second browse call | Fast (~100 ms) — daemon already warm, no re-download. |
| BR4 | Verify via doctor | Check 6 (Browse daemon) ✅ "binary present, daemon healthy"; Check 5d (Playwright Chromium) flips to ✅. |
| BR5 | **Negative test** — disable the download fallback: start a session with `COUNSEL_OS_NO_DOWNLOAD=1` on a machine with no prior binary | Browse fails fast with `ERROR: browse binary not found. Run /counsel-os:setup or build with: bun run build` — confirms the airgapped/offline guard works. (Run this on a second clean profile, or after deleting the downloaded binary, so it actually has nothing to fall back to.) |

If BR1's download fails or the smoke test (`browse --help`) fails after download, `find-browse`
removes the bad binary and reports it — capture the stderr verbatim; this is a launch blocker.

---

## Step T — Synthetic-NDA smoke test

One real end-to-end exercise per install path. **Synthetic NDA only.**

| # | Action | Expected result |
|---|--------|-----------------|
| T1 | Drop a synthetic NDA into the session and say "Review this NDA" | `/counsel-os:counsel` auto-activates (no slash command needed); auto-detects applicable law areas; loads positions; returns a structured assessment grounded in the seeded standards. |
| T2 | Ask a position question, e.g. "Is a 36-month liability cap acceptable?" | Answers against `practice/standards/` (the seeded limitation-of-liability position), not generic market intuition. |
| T3 | **(Claude Code, if pandoc + python-docx + Word for Mac present)** "Create a redline of this NDA" | Produces a native `.docx` with tracked changes attributed to the user + margin comments; opens in Word's Review pane. If those deps are absent, expect a clean fallback to markdown redline, explained — not an error. |
| T4 | **(Cowork)** Same redline ask | Returns a **markdown** redline (same edits, different format) — expected, not a defect. |

T3 is optional and dependency-gated; note in results which deps were present. A missing pandoc /
python-docx / Word is a ⚠️ (markdown fallback), not a fail.

---

## Step V — Final verification readout

`/counsel-os:doctor` is the single source of truth for install health — run it last on each
path and attach the table to the results.

**A healthy clean-machine readout looks like:**

- Check 1 Legal root ✅ · Check 2 Vault structure ✅ (`law 26-area · standards 24 · …`)
- Check 3 Plugin version ✅ (loaded == latest release)
- Check 5 optional deps: ✅ for whatever you installed, ⚠️ for what you deliberately left out
  (e.g. `bun ⚠️ missing`, `pandoc ⚠️ missing`) — these are **acceptable** ⚠️s on a minimal install
- Check 6 Browse daemon ✅ (Claude Code) / `—` (Cowork)
- No ❌ rows.

Any ❌ on a clean machine after a clean install is a **launch blocker**. A ⚠️ that's just an
uninstalled optional dependency is fine and expected.

---

## Results & sign-off

Record per install path. The pass is **green only when every box is checked on a confirmed
clean machine** and the founder signs off — engineering does not mark cou-4's pass done.

```
Tester: ____________________   Date: __________   Machine: fresh Mac / new account / VM (circle)
Plugin version under test: v________   (must equal latest release)

Step 0  Clean-machine probe → CLEAN .......................... [ ]
Path A  Marketplace install A1–A5 ........................... [ ]
Path B  Cowork install B1–B5 ................................ [ ]
Step S  Setup: Express S1–S6 + resume round-trip; Custom spot-check [ ]
Step Q  qmd offer: decline + accept/index + re-run wired .... [ ]
Step BR Browse download BR1–BR4 + negative BR5 .............. [ ]
Step T  Synthetic-NDA smoke test (both paths) ............... [ ]
Step V  doctor readout: no ❌ rows (both paths) ............. [ ]

Blockers found: ____________________________________________
Notes / stderr captured: ___________________________________
Founder sign-off: __________________________________________
```

When green, set the cou-4 task to the launch-ready state on the eigen board and note the tested
version + machine. If anything blocks, file each blocker as its own backlog task for the Lead
and leave cou-4 with the specific blocker in its notes — never mark the pass done with an open ❌.

---

## Quick reference — paths this pass touches

| Thing | Location |
|-------|----------|
| Marketplace clone | `~/.claude/plugins/marketplaces/eigenlegal` |
| Plugin cache | `~/.claude/plugins/cache/eigenlegal/counsel-os/{version}/` |
| Downloaded browse binary | `…/{version}/browse/dist/browse` or `~/.counsel-os/browse/dist/browse` |
| Playwright Chromium cache | `~/Library/Caches/ms-playwright/chromium-*` |
| Legal-root pointer | `~/.counsel-os/legal-root` |
| User config (canonical) | `{legal_root}/config.md` |
| Disable browse download | `COUNSEL_OS_NO_DOWNLOAD=1` |
| qmd collections (read-only list) | `qmd collection list` |
| qmd semantic-model cache | `~/.cache/qmd/models/` (must stay absent after a BM25-only `qmd update`) |
