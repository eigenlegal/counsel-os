# Running Counsel OS Over Time

`/counsel-os:setup` gets you a working install. This page is the maintenance loop that keeps it working: current plugin and law content, a healthy vault, and early warning when something drifts.

## Cadences

| What | Command | When |
|------|---------|------|
| Pull plugin + content updates | `/counsel-os:update` | Weekly, or when notified of a release |
| Deadline sweep | `/counsel-os:docket` | Weekly, and before you go heads-down on other work |
| Health check | `/counsel-os:doctor` | Monthly, and after every update |
| Consistency spot-check | `/counsel-os:doctor --consistency` | Before significant negotiations, and after law refreshes or manual standards edits |
| Practice analytics + knowledge harvest | `/counsel-os:retro` | Quarterly, or every ~10 closed matters |
| Refresh user-owned law | `/counsel-os:law-refresh` | Per the cadence tiers below |
| Golden-matter evals | `bun runtime/src/cli.ts eval --all --save` | Before releases and when changing models — plugin developers only, not end users |

Notes on the loop:

- `update` is the only channel for plugin-managed law content and methodology; it never overwrites your practice files without approval.
- `doctor` is read-only — it reports one ✅/⚠️/❌ table with a fix command per finding, so it is safe to run on a schedule.
- `docket` is read-only too, and populated as you work: `read` proposes `deadlines:` entries when it extracts dates from a contract and `remember` records them, so the sweep is only as complete as the dates you've captured. It classifies overdue / due-soon / upcoming and surfaces malformed dates loudly rather than dropping them.
- `retro` needs volume to be useful; below ~10 matters its statistics are noise, but its knowledge harvest (Step 6) is valuable at any volume.
- Run `doctor` right after `update`: a failed or half-applied update is exactly what it catches.

## Law review cadence tiers

`knowledge/law/frontmatter-policy.json` sets a per-area review cadence (`review_cadence_months`). An area's `last-reviewed` attestation goes stale that many months after its date; doctor and `scripts/validate_law_frontmatter.py` both flag staleness from this same policy.

| Tier | Cadence | Areas |
|------|---------|-------|
| Fast-moving | 6 months | ai-and-automation, consumer-protection, cybersecurity, data-privacy, employment, environmental-esg, financial-services, healthcare, international-trade, labor-relations, securities |
| Default | 12 months | accessibility, advertising-media, antitrust, franchise, government-contracts, insurance, ip-and-technology, litigation, nonprofit, product-counseling, tax, white-collar-investigations — and any area not listed in the policy |
| Slow | 18 months | bankruptcy-restructuring, corporate |
| Slowest | 24 months | real-estate |

Who refreshes what:

- **Plugin-managed areas** are refreshed upstream and reach your vault through `/counsel-os:update`. You never refresh these yourself.
- **User-owned law** — custom areas you created, files marked `managed-by: user`, or the whole library when your config.md sets `law_management: user` — is yours to maintain with `/counsel-os:law-refresh` on the tier cadence. Quarterly is a sensible floor for fast-moving areas even where the policy allows six months.

## Automating with Claude Code

Any skill can run headlessly:

```bash
claude -p "/counsel-os:doctor"
```

cron example — doctor on the first of each month at 9am:

```
0 9 1 * * COUNSEL_OS_LEGAL_ROOT="$HOME/path/to/legal-root" claude -p "/counsel-os:doctor" >> ~/.counsel-os/doctor.log 2>&1
```

Practical notes for headless runs:

- Set `COUNSEL_OS_LEGAL_ROOT` (or run from a directory where the legal root resolves) so a non-interactive session never stalls on a discovery prompt.
- On macOS, a launchd LaunchAgent with `StartCalendarInterval` is the native alternative to cron and handles sleep/wake better than cron does.
- Append output to a log you will actually read — doctor's value is the ⚠️ rows, and an unread log file has none.
- Schedule `update` interactively rather than headlessly: it asks for approval before touching user-owned content, which a `-p` run cannot meaningfully give.

In-session recurrence:

- `/loop` re-runs a prompt or skill on an interval inside a live session (e.g. `/loop 30m /counsel-os:doctor` while babysitting a large migration).
- `/schedule` creates recurring cloud agents on a cron schedule — useful for a monthly doctor or a weekly update check that does not depend on your laptop being awake.

## Evals (plugin developers only)

The runtime's eval runner (`runtime/src/evals/`) runs golden-matter fixtures (expected catches, expected citations, false-positive guards) through the loop on a provider and scores the answers:

```bash
bun runtime/src/cli.ts eval --all --save                       # every runnable fixture on your default provider
bun runtime/src/cli.ts eval --all --provider anthropic/X       # when evaluating a model change
bun runtime/src/cli.ts eval --fixture law-beats-practice       # a single fixture
```

Run before cutting a release and whenever the underlying model changes — scoring is deterministic, so regressions are attributable to the content or the model, not the harness. End users never need this; CI runs the scorer self-test on every push.

`--save` appends each line to `<vault>/.counsel/evals/results.jsonl`. The scoreboard folds that record per task and provider:

```bash
bun runtime/src/cli.ts eval --scoreboard            # the ledger: task, then a line per fixture set, a row per provider
bun runtime/src/cli.ts eval --scoreboard --json     # the same board as JSON (GET /evals/scoreboard serves it)
```

Three rules hold everywhere the board appears (the CLI, `GET /evals/scoreboard`, Settings › Models): the latest line per fixture wins, so a re-run replaces rather than accumulates; the `practice`, `shipped` and `benchmark` sets are never averaged together; a `score: null` line is a failed cell with its reason, never a zero in the mean. Each row carries how many fixtures it scored, the sample size (every line behind it), the median latency, the mean cost per run and how many days old it is.

The shipped fixtures and their mini-vaults (`evals/fixtures`, `evals/vaults`) ship through the content source like the law areas do, so the compiled binary lists and runs the same suite as a checkout. The practice's own fixtures live under `<vault>/practice/evals/` and never ship.

### Public benchmarks

Four public legal benchmarks import into the same fixture format, so the runner scores them exactly as it scores everything else:

```bash
bun runtime/src/cli.ts eval import                       # what can be imported, and each set's license
bun runtime/src/cli.ts eval import cuad --subset 20      # 20 items per task, into evals/benchmarks/ (git-ignored)
bun runtime/src/cli.ts eval import legalbench --tasks cuad_governing_law
bun runtime/src/cli.ts eval --set benchmark --all --save # run what is imported
```

An import writes `<dest>/<set>/fixtures/*.json`, one vault under `<dest>/<set>/vaults/`, the raw downloads under `<dest>/<set>/raw/` (reused unless `--refresh`), and the set's license into `<dest>/LICENSES.md`. The default destination is git-ignored: benchmark text is downloaded, never committed.

| Set | License | Notes |
|---|---|---|
| LegalBench | CC BY 4.0 (per task; `definition_classification` is CC BY-SA 4.0) | the per-task license line is recorded on each fixture |
| CUAD | CC BY 4.0 | 510 contracts × 41 clause categories, as extraction fixtures |
| MAUD | CC BY 4.0 | merger-agreement questions, as classification fixtures |
| ContractNLI | CC BY 4.0 | 123 NDAs × 17 hypotheses, as classification fixtures |
| BigLaw Bench | not published | refuses at import with the reason and where to ask Harvey |

Benchmarks score under the `benchmark` set, which the scoreboard keeps apart from the practice's own fixtures and never routes on: a public set says how a model does at the benchmark's task, not at yours.

In the app, Settings › Models shows the board with the three sets as tabs. Each cell's *score* (or *retry* / *again*) asks once — how many fixtures, roughly what it costs, or *cost unknown* when the vendor publishes no price the runtime knows — then runs `POST /evals/run` with `save: true` and reports progress on the same line.
