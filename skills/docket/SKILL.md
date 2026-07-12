---
name: docket
description: "Read-only deadline sweep across your open matters: reads the deadlines: frontmatter on every matter file and reports what's overdue, due within a window (default 60 days), and upcoming — auto-renewal windows, termination-notice deadlines, sub-processor objection periods, filing and milestone dates. One sorted table; changes nothing. Missed dates are the practice's #1 malpractice vector. Use weekly, or whenever you ask 'what's due', 'what deadlines are coming up', 'anything expiring', 'what do I owe across my matters'."
---

# Docket — Deadline Sweep

You are running a read-only sweep of the user's matter files for time-based obligations — renewal windows, notice deadlines, objection periods, filing dates, milestones. Present ONE table sorted by urgency. **Docket never writes** to the vault, the config, or anywhere else: it reports and recommends only. To *record* a deadline, that's `remember` (see "Recording deadlines" below), not this skill.

## Step 0: Plugin root

Resolve the plugin root: `${CLAUDE_PLUGIN_ROOT}` is set by Claude Code on every plugin invocation — use it directly. If unset, it's the directory containing this skill's parent `skills/` directory.

## Step 1: Resolve the legal root and matters path

Run the canonical resolver:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolve_legal_root.sh"
```

Exit-code contract: `0` = one marked root, stdout is the path; `1` = none found (tell the user to run `/counsel-os:setup`, then stop); `2` = multiple found (list the stderr candidates, ask which, or have them set `COUNSEL_OS_LEGAL_ROOT`).

Matters may be relocated by the config. Read the override (default `matters`):

```bash
LEGAL_ROOT="{resolved legal root}"
MATTERS_PATH=$(grep -m1 '^matters_path:' "$LEGAL_ROOT/config.md" | sed 's/^matters_path:[[:space:]]*//')
MATTERS_DIR="$LEGAL_ROOT/${MATTERS_PATH:-matters}"
```

If `$MATTERS_DIR` does not exist, tell the user there are no matters yet and stop.

## Step 2: Run the sweep

The date arithmetic is deterministic, so a helper does it — don't eyeball dates by hand:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/docket_sweep.py" "$MATTERS_DIR"
```

Useful flags:
- `--window N` — look-ahead window in days (default `60`). The user may ask for a different horizon ("what's due in the next 90 days" → `--window 90`).
- `--format json` — structured output if you want to reason over it before presenting.
- `--include-done` — also show deadlines marked `done:` (hidden by default; kept in the file for audit).
- `--today YYYY-MM-DD` — override "now" (testing only).

The script needs only Python 3 stdlib — no pandoc, python-docx, or PyYAML.

## Step 3: Present the result

Show the sweep as one table, grouped and sorted the way the script emits it:

- **OVERDUE** — the date has passed and the deadline is not marked done. Lead with these; they're the malpractice exposure.
- **DUE WITHIN {window} DAYS** — the actionable horizon.
- **UPCOMING** — beyond the window, for awareness (summarize the count rather than dumping every far-future row unless asked).
- **MALFORMED** — entries with a missing or unparseable `date:`. Surface them loudly with the exact fix ("`{matter}` has `date: not-a-date` — set it to `YYYY-MM-DD`"). A silently dropped deadline is the one failure mode this feature exists to prevent, so never hide these.

Notes on interpretation:
- **Closed matters still surface.** A deadline can outlive its matter — an auto-renewal window or a confidentiality-survival date often falls after close. Closed-matter rows are tagged `[closed]`; treat them as real unless the user confirms they're moot.
- Each row shows the date, relative timing, the action, the source clause (if recorded), and the matter. Offer to open any matter file the user wants to act on.
- This is a read-only report. If a deadline is stale or already handled, offer to have `remember` mark it `done:` or update it — but only on the user's say-so, and that write happens through `remember`, not here.

## Recording deadlines (how entries get here)

Docket reads a `deadlines:` frontmatter block on matter files. The convention (full spec in `primitives/remember.md`):

```yaml
deadlines:
  - date: 2026-07-15          # YYYY-MM-DD (required)
    action: "renewal notice due"
    type: renewal              # optional: renewal | notice | objection | milestone | filing
    source: "MSA §9.2"         # optional: the clause the date comes from
    done: false                # optional: true drops it from the sweep, kept for audit
```

`read` proposes these entries whenever it extracts key dates from a contract, and `remember --matter` persists them. If a user's matters have no `deadlines:` blocks yet, the sweep comes back empty — tell them the feature captures dates as `read` encounters them, and offer to backfill a matter's known dates now.

## Cowork / no-shell runtimes

If shell is unavailable, resolve the legal root and matters path from the conversation/config as `doctor` does, read the matter files directly, and do the date comparison yourself against today's date — same three groupings. Report the runtime limitation rather than guessing.
