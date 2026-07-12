---
name: doctor
description: "Health check for a Counsel OS install: legal-root config, vault structure, plugin version vs latest, law-content currency, optional dependencies (pandoc, python-docx, bun, Playwright Chromium, qmd), browse daemon, backups, vault git, search-index freshness, vault consistency (standards ↔ library ↔ law floors), and matter-aware law impact (open matters whose law areas were refreshed after their last update) — one ✅/⚠️/❌ table with a one-line fix per finding. Pass --consistency to run only the consistency + law-impact checks (cheap pre-deal spot-check). Read-only: reports and recommends, never changes anything. Use monthly, after /counsel-os:update, or when something seems off."
---

# Doctor — Install Health Check

You are running a health check on the user's Counsel OS install. Run every check below, collect the results, and present them as ONE table at the end — do not dump raw command output between checks, and do not narrate each step. Doctor is **read-only**: it never writes to the vault, the plugin tree, the config, or the home directory. Every non-healthy row gets a one-line fix command instead.

Status meanings:

- ✅ healthy — nothing to do
- ⚠️ degraded or optional capability missing — Counsel OS works, but something is suboptimal or a feature is unavailable
- ❌ broken — core functionality is unavailable until fixed

A check that cannot run in the current runtime is reported with status `—` and the reason (see Cowork / no-shell runtimes at the end). Never guess a result for a check you could not run.

## Step 0: Capabilities and Plugin Root

Resolve the plugin root: `${CLAUDE_PLUGIN_ROOT}` is set by Claude Code on every plugin invocation — use it directly in shell commands. If it is unset, the plugin root is the directory containing this skill's parent `skills/` directory.

Determine what this session can do: shell access, home-directory reads, network access. Each check below states what it needs; degrade per the Cowork section rather than skipping silently.

## Step 1: Legal Root and Config (❌ on failure)

Run the canonical resolver:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolve_legal_root.sh"
```

Exit-code contract: `0` = exactly one marked root, stdout is the path; `1` = none found; `2` = multiple found (candidates on stderr).

- Exit `0` → Read `{legal_root}/config.md` and verify two things: it contains `counsel-os-config: true`, and its `legal_root:` value matches the resolved directory. Both good → ✅. Marker present but `legal_root:` points elsewhere (stale copied config) → ⚠️, fix: `edit {legal_root}/config.md so legal_root: matches its own directory`.
- Exit `1` → ❌, fix: `/counsel-os:setup`.
- Exit `2` → ⚠️, list the candidates from stderr in the detail, fix: `export COUNSEL_OS_LEGAL_ROOT=/path/to/the/right/one` (or remove the stray config.md).

If this check fails with ❌, still run checks 3, 5, and 6 (they don't need a legal root); report checks 2, 4, 7, 8, 9 as `—` blocked by check 1.

## Step 2: Vault Structure

**Read the overrides first.** `{legal_root}/config.md` may relocate matters and entities via `matters_path:` and `entities_path:` (paths relative to the legal root). Use the overridden paths in the check below — a vault with `entities_path: knowledge-base/companies` and no `entities/` directory is correctly configured, not missing anything.

Check the expected directories and count files per area:

```bash
LEGAL_ROOT="{legal_root}"
MATTERS_PATH=$(grep -m1 '^matters_path:' "$LEGAL_ROOT/config.md" | sed 's/^matters_path:[[:space:]]*//')
ENTITIES_PATH=$(grep -m1 '^entities_path:' "$LEGAL_ROOT/config.md" | sed 's/^entities_path:[[:space:]]*//')
for d in law practice/standards practice/methods practice/library practice/reference "${MATTERS_PATH:-matters}" memory "${ENTITIES_PATH:-entities}"; do
  if [ -d "$LEGAL_ROOT/$d" ]; then
    # index.md is a navigation aid (e.g. the standards Positions Index, the methods index), not content — exclude it so counts match the documented totals (standards 24, not 25)
    n=$(find "$LEGAL_ROOT/$d" -type f -name '*.md' ! -name 'index.md' | wc -l | tr -d ' ')
    echo "$d: $n md files"
  else
    echo "$d: MISSING"
  fi
done
test -f "$LEGAL_ROOT/practice/profile.md" && echo "practice/profile.md: present" || echo "practice/profile.md: MISSING"
```

- All present → ✅ with the per-area counts in the detail (e.g. `law 120 · standards 24 · methods 9 · library 8 · reference 1 · matters 14 · memory 3 · entities 11`). When an override is in play, show the overridden path in the detail (e.g. `entities@knowledge-base/companies 30`).
- `law/` or `practice/standards/` missing or empty → ❌, fix: `/counsel-os:setup` (re-seeding is safe — setup detects an existing install).
- Any other directory missing → ⚠️. For default `matters/`/`entities/` missing, first suggest the override fix if the user's files plausibly live elsewhere (`add entities_path: <relative/path> to {legal_root}/config.md`); otherwise `/counsel-os:setup`. Empty `matters/` or `entities/` with the directory present is normal on a fresh install — ✅, note "empty (fresh install)".

## Step 3: Plugin Version

Loaded version:

```bash
cat "${CLAUDE_PLUGIN_ROOT}/VERSION"
```

(Fallback: the `version` field of `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.)

Latest available — try in order:

1. `claude plugin list 2>/dev/null` and find the counsel-os entry (it shows the installed marketplace and any available update).
2. Read the marketplace clone's catalog: `ls ~/.claude/plugins/marketplaces/` to find the marketplace name, then Read `~/.claude/plugins/marketplaces/{marketplace}/.claude-plugin/marketplace.json` and take the counsel-os entry's `version`. Note: this catalog only advances when the marketplace is refreshed, so "current" here can still be behind the true upstream.
3. If `${CLAUDE_PLUGIN_ROOT}` is itself a git clone (dev install via `--plugin-dir`), compare against upstream instead: `git -C "${CLAUDE_PLUGIN_ROOT}" fetch --quiet origin && git -C "${CLAUDE_PLUGIN_ROOT}" rev-list --count HEAD..origin/main` (0 = current).

- Loaded == latest → ✅.
- Behind → ⚠️, fix: `/counsel-os:update`.
- Latest not determinable (no claude CLI, no readable catalog, no network) → ⚠️ with detail "loaded {version}; latest unknown", fix: `/counsel-os:update` (it refreshes the catalog and installs).

## Step 4: Law Currency

`scripts/validate_law_frontmatter.py` validates the **plugin's** shipped law only — its law root is hardcoded relative to the script; it does NOT accept a path argument. So this check has two parts:

**Part A — shipped baseline.** Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/validate_law_frontmatter.py" --details
```

This reports warnings and attestations due for the plugin-shipped law that `/counsel-os:update` syncs from.

**Part B — the vault's law dir.** Gather attestation data directly:

```bash
grep -r --include='*.md' '^last-reviewed:' "$LEGAL_ROOT/law" 2>/dev/null
grep -rL --include='*.md' '^last-reviewed:' "$LEGAL_ROOT/law" 2>/dev/null
grep -rl --include='*.md' '^managed-by: user' "$LEGAL_ROOT/law" 2>/dev/null | grep -v 'FRONTMATTER\.md'
```

Exclude `FRONTMATTER.md` from every Part B result: it is the frontmatter documentation file, not law content — it contains `managed-by: user` and `last-reviewed:` lines inside its own example snippets, so without the exclusion it shows up as a false "user-owned" or "never-attested" file.

Then Read `${CLAUDE_PLUGIN_ROOT}/knowledge/law/frontmatter-policy.json` for `review_cadence_months`. For each vault law file with a `last-reviewed` date, the attestation is stale when today is more than the area's cadence (months) past that date — the area is the first path segment under `law/` (use `default` for areas not in the policy, e.g. custom user areas). Files with no `last-reviewed` have never been attested.

Classify and summarize:

- All attested files current → ✅ with counts (e.g. "26 areas · 6 attested current · 0 stale").
- Stale or never-attested **user-owned** files (`managed-by: user`, custom areas, or `law_management: user` in config.md) → ⚠️, fix: `/counsel-os:law-refresh`.
- Stale or never-attested **plugin-managed** files → ⚠️ with detail "refreshed upstream", fix: `/counsel-os:update` (and report the Part A baseline so the user can see whether the staleness is already fixed upstream or upstream is stale too).

Keep the table row to a one-line summary; put per-area staleness in a short list under the table only if anything is stale.

## Step 5: Optional Dependencies (⚠️ only — never ❌)

```bash
for tool in pandoc python3 bun qmd; do
  command -v "$tool" >/dev/null 2>&1 && echo "$tool: ok" || echo "$tool: missing"
done
python3 -c "import docx" 2>/dev/null && echo "python-docx: ok" || echo "python-docx: missing"
ls "$HOME/Library/Caches/ms-playwright" "$HOME/.cache/ms-playwright" 2>/dev/null | grep -qi chromium && echo "playwright-chromium: ok" || echo "playwright-chromium: missing"
```

One table row per dependency. What each one unlocks, and its install one-liner as the fix:

| Dependency | Unlocks | Fix when missing |
|------------|---------|------------------|
| pandoc | Tracked-change extraction from .docx | `brew install pandoc` (macOS) / `apt-get install pandoc` (Linux) |
| python3 + python-docx | Redline pipeline (apply_redlines, clean_format, extract_redlines) | `python3 -m pip install python-docx` |
| bun | Building/running the browse binary | `curl -fsSL https://bun.sh/install \| bash` |
| Playwright Chromium | The browse skill's headless browser | `cd "${CLAUDE_PLUGIN_ROOT}" && bunx playwright install chromium` |
| qmd CLI | Vault index maintenance (`qmd update`; `qmd embed` is opt-in) | see https://github.com/tobi/qmd (optional — filesystem search is the fallback) |

All of these are ⚠️ when missing, never ❌ — core legal work runs without them.

## Step 6: Browse Daemon

Two sub-checks, one row.

**Build artifacts for THIS plugin root** (not the `find-browse` fallback locations — doctor reports on the loaded install):

```bash
test -x "${CLAUDE_PLUGIN_ROOT}/browse/dist/browse" && echo "binary: present" || echo "binary: missing"
```

**Daemon responsiveness.** The CLI writes a state file per instance at `~/.counsel-os/browse/browse-server*.json` containing `pid` and `port` (earlier releases wrote `/tmp/browse-server*.json` — scan both to catch a pre-upgrade daemon); the server exposes an unauthenticated `GET /health`:

```bash
for f in ~/.counsel-os/browse/browse-server*.json /tmp/browse-server*.json; do
  [ -f "$f" ] || continue
  port=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['port'])" "$f")
  echo "state file: $f (port $port)"
  curl -s --max-time 3 "http://127.0.0.1:${port}/health" || echo "port $port: not responding"
done
```

- Binary present, no state file → ✅, detail "built; daemon not running (starts on demand)".
- Binary present, daemon responds `"status": "healthy"` → ✅, include uptime/tabs in the detail.
- Binary missing → ⚠️, fix: `cd "${CLAUDE_PLUGIN_ROOT}" && bun install && bun run build` (requires bun — cross-reference check 5).
- State file present but the port doesn't respond, or `/health` reports unhealthy → ⚠️, fix: `kill {pid} 2>/dev/null; rm <state file>` — the next browse command starts a fresh daemon.
- State file found under `/tmp` → ⚠️, a daemon from an earlier release is still running; fix: `kill {pid} 2>/dev/null; rm /tmp/browse-server*.json` — the next browse command starts a fresh daemon that keeps its state under `~/.counsel-os/browse/`.

## Step 7: Backups

Backups live in `~/.counsel-os/backups/` (older installs wrote to `{plugin_root}/backups/` — check both, but the home location is current):

```bash
ls -1t ~/.counsel-os/backups/ 2>/dev/null | head -3
ls -1t "${CLAUDE_PLUGIN_ROOT}/backups/" 2>/dev/null | head -3
```

Backup directories are named `counsel-os-backup-YYYYMMDD-HHMMSS` — compute the newest backup's age from its name.

- Newest backup ≤ 30 days old → ✅ with the age in the detail.
- Backups exist but the newest is > 30 days old → ⚠️, fix: `bash "${CLAUDE_PLUGIN_ROOT}/backup"`.
- No backups anywhere → ⚠️, same fix. Soften to a note (still ⚠️) if check 8 shows the vault is a git repo with a remote — version control is the primary safety net; backups are belt-and-suspenders.
- Backups only in the legacy plugin-root location → ⚠️, detail "legacy location — new backups go to ~/.counsel-os/backups/; old ones remain restorable", fix: `bash "${CLAUDE_PLUGIN_ROOT}/backup"`.

## Step 8: Vault Git

```bash
git -C "$LEGAL_ROOT" rev-parse --is-inside-work-tree 2>/dev/null
git -C "$LEGAL_ROOT" status --porcelain 2>/dev/null | wc -l
git -C "$LEGAL_ROOT" remote 2>/dev/null
git -C "$LEGAL_ROOT" log -1 --format='%ci %h' 2>/dev/null
```

- Repo + remote + uncommitted count under ~20 → ✅, detail like "repo · remote origin · 3 uncommitted · last commit {date}".
- Not a repo → ⚠️, fix: `git -C "$LEGAL_ROOT" init` (or `/counsel-os:setup` Step 6 for the guided version).
- Repo, no remote → ⚠️, detail "no remote — local-only history", fix: `gh repo create {name} --private && git -C "$LEGAL_ROOT" remote add origin {url}` — remind that legal vaults must use a **private** repo.
- Repo with a large uncommitted count (20+) → ⚠️, fix: `git -C "$LEGAL_ROOT" add law/ practice/ matters/ memory/ entities/ && git -C "$LEGAL_ROOT" commit -m "Vault checkpoint"` (pathspec-scoped — never suggest `git add -A` on a vault).

Doctor never runs `git add`, `commit`, or `push` itself.

## Step 9: Search Index Freshness (QMD)

Only meaningful when qmd is available (check 5). If the CLI is present:

```bash
qmd status
```

If the CLI is absent but a QMD MCP server is connected (a `status` tool is exposed), call that instead.

- Index present and no pending/unembedded documents → ✅ with collection and doc count in the detail.
- Index reports documents pending **update** → ⚠️, fix: `qmd update`.
- Index reports documents pending **embedding** → depends on whether the user opted into semantic embeddings, marked by the model cache (`[ -d ~/.cache/qmd/models ]`):
  - Cache present (embeddings enabled) → ⚠️, fix: `qmd embed`.
  - Cache absent (BM25-only install) → ✅, detail "embeddings not enabled — BM25 search in use (semantic search is opt-in: `qmd embed`, a one-time ~940MB local model download)". Never prescribe a bare `qmd embed` here — that download without consent is the exact thing setup promises not to do.
- qmd not installed and no MCP index → ✅, detail "no index configured — filesystem search in use (optional)". Absence of QMD is not a defect.

## Step 10: Vault Consistency (standards ↔ library ↔ law)

The eval suite tests that the *plugin* respects precedence; this check tests that the *user's vault* hasn't drifted into internal contradiction — after upstream merges, manual edits, or law refreshes. This is judgment work over file contents, not a script: read the files and compare the load-bearing numbers.

**Standards ↔ library.** For each `practice/standards/{topic}.md`, find the matching `practice/library/` file (names differ slightly — match by topic: `termination-renewal` ↔ `termination-and-renewal`, etc.; not every standard has a library file). Extract the numeric positions both sides state — deletion/return windows, breach-notification hours, notice and cure periods, cap amounts and multipliers, audit frequency, transition durations, insurance limits — and compare the standard's Our Position / GREEN band against the library's Standard and Minimum Acceptable variants.

- A library *Aggressive* variant stricter than the standard is normal (the opening ask). A library **Standard or Minimum Acceptable** variant that contradicts the standard's accept band is a finding — UNLESS the files' Notes explain the split deliberately. Report what diverges with both numbers and file paths; recommend aligning or documenting, never auto-fix.

**Practice ↔ law floors.** For standards whose topic is law-governed (breach notification, data deletion, noncompetes, auto-renewal mechanics, marketing claims), check the relevant `law/` area's Key Constraints: a standard whose *accept band* would permit violating a current legal floor is a finding (e.g., a 96-hour breach-notification accept band against a 72-hour statutory regime the practice is subject to). Use the vault's law copies; cite the specific constraint.

- No contradictions → ✅ with the pair count ("N standard/library pairs + M law floors checked").
- Findings → ⚠️ per divergence, one line each: `{topic}: standard says {X}, library Minimum Acceptable says {Y} — align or document`.

## Step 11: Matter-Aware Law Impact

Open matters carry a `Law areas:` field; law files carry `last-reviewed`. When law moved *after* the lawyer last touched a matter, the matter may be running on a stale understanding.

```bash
grep -l -E '^stage: (intake|working)' "$LEGAL_ROOT"/{matters_path:-matters}/*.md
```

For each open matter: read its `Law areas` and `updated:` frontmatter. For each named area, find the newest `last-reviewed` across `law/{area}/*.md`. If the area was reviewed **after** the matter's `updated:` date, the matter predates the law refresh.

- No open matter behind any of its law areas → ✅.
- Otherwise → ⚠️ with the count in the table row, and a short list under the table: `{matter} (updated {date}) — law/{area} refreshed {date}: review the area's recent changes before the next action`. Where the refresh's dated watch items are at hand (CHANGELOG, area frontmatter), name the specific development rather than just the date.

## Invocation Modes

- **Bare `/counsel-os:doctor`** — run every step.
- **`--consistency`** — run ONLY Steps 10 and 11 and report just those rows plus a verdict. This is the cheap pre-deal spot-check between full monthly runs: "is my vault internally coherent and are my open matters current with the law layer?"

## Step 12: Report

Output exactly one table, then a verdict. Keep every Detail and Fix to one line.

```markdown
## Counsel OS Health — {YYYY-MM-DD}

Runtime: {Claude Code / Cowork / other} · Plugin root: {path} · Legal root: {path or "unresolved"}

| # | Check | Status | Detail | Fix |
|---|-------|--------|--------|-----|
| 1 | Legal root & config | ✅ | {path}, marked config | — |
| 2 | Vault structure | ✅ | law 120 · standards 24 · ... | — |
| 3 | Plugin version | ⚠️ | loaded 0.9.8, latest 0.9.9 | /counsel-os:update |
| 4 | Law currency | ⚠️ | 2 user-owned areas stale | /counsel-os:law-refresh |
| 5a | pandoc | ✅ | found | — |
| 5b | python3 + python-docx | ✅ | found | — |
| 5c | bun | ⚠️ | missing | curl -fsSL https://bun.sh/install \| bash |
| 5d | Playwright Chromium | ⚠️ | missing | bunx playwright install chromium |
| 5e | qmd CLI | ✅ | found | — |
| 6 | Browse daemon | ✅ | built; not running (on demand) | — |
| 7 | Backups | ⚠️ | newest 47 days old | bash "${CLAUDE_PLUGIN_ROOT}/backup" |
| 8 | Vault git | ✅ | repo · remote · 2 uncommitted | — |
| 9 | Search index | ✅ | 1287 docs, current | — |
| 10 | Vault consistency | ⚠️ | 1 divergence: deletion window (standard 90d vs library 30d) | align or document the split |
| 11 | Matter law impact | ⚠️ | 2 open matters behind refreshed law areas | review listed areas before next action |

**Verdict:** {one line — "healthy", "N warnings — fix X first", or "broken: {what} — run {fix} before doing legal work"}
```

After the table, add at most three short follow-ups when warranted: a per-area staleness list from check 4, the per-matter law-impact list from check 11, and a "skipped in this runtime" list. Order the verdict's recommendations ❌ first, then ⚠️ by impact. Do not offer to apply fixes wholesale; the user runs them (or asks for a specific one).

## Cowork / no-shell runtimes

Without shell access, run the file-based checks through Read/list/search tools and mark the rest skipped — say explicitly which ones and why:

- **Check 1** — follow the Cowork procedure in the Finding the Legal Root section of `skills/counsel/SKILL.md`: scan the connected workspace for a marked `config.md` with file tools.
- **Check 2** — list directories and count files with file tools.
- **Check 3** — Read `{plugin_root}/VERSION` for the loaded version; report "latest unknown in this runtime" (⚠️) with fix `/counsel-os:update`.
- **Check 4** — Part A is shell-only (skip it); Part B works: Read `frontmatter-policy.json`, extract `last-reviewed:` and `managed-by:` lines from vault law files with whatever search tool exists, and do the cadence comparison yourself.
- **Checks 10 and 11** — fully file-based: both work in Cowork via Read/search tools (slower, same results). `--consistency` mode is therefore fully Cowork-capable.
- **Checks 5, 6, 7, 8, 9** — shell- or home-directory-dependent: report status `—` with detail "not checkable in this runtime (no shell)". Do not infer their state.
