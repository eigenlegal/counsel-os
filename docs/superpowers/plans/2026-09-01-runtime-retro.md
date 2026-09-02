# Retro in the Runtime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The plugin's quarterly `/counsel-os:retro` has a runtime equivalent, so the practice's feedback loop survives without Claude Code: `POST /retro` and `counsel-os retro` open a retro THREAD whose steps carry the retro method and the runtime's own evidence for the period; every knowledge change the retro proposes lands as a proposal the founder approves in the docket; Home says when a retro is due; Settings runs one.

**Architecture:** A retro is a normal counsel thread with `task: 'retro'` stamped on its header. Nothing special happens in the loop except the system prompt: when a step's task is `retro`, `assembleSystemPrompt` appends two sections — the body of `skills/retro/SKILL.md` (now shipped content) and the runtime's evidence for the period, rendered as markdown by `runtime/src/retro/evidence.ts` from the thread store, the run records, the matter overview, the memory folder and the doctor. `runtime/src/retro/index.ts` owns the cadence rule (`retro_cadence_days` in `config.md`, default 90), the state file `.counsel/retro.json` (`lastRetroAt`, `threadId`, `period`), the "due" verdict, and `startRetro`, which creates the thread, writes the state and returns the short first message. The UI sends that message through the ordinary step path. Writes stay where they are: the model's promotions and the snapshot go through `propose_update`, never a direct write.

**Tech Stack:** Bun 1.3.x, TypeScript strict, `node:fs` for `.counsel/` (as the thread store), React 18 + happy-dom tests.

**Spec:** `skills/retro/SKILL.md` (the method — ported as prompt content, not as code), `primitives/remember.md` (why writes are proposals), `docs/superpowers/specs/2026-09-01-runtime-owned-setup-design.md` §7 (the doctor the evidence reuses).

## Global Constraints

- The retro never writes to the vault itself. Evidence is read-only; the only writes are `.counsel/retro.json` and the thread files. Knowledge changes are proposals through `propose_update`.
- `skills/retro/SKILL.md` joins `SHIPPED_ROOTS` so the compiled runtime carries it; the manifest is regenerated.
- The retro method's volume gate stands: the evidence names the counts and the system prompt tells the model to state which mode it runs (statistical vs. harvest) — it is the model's call, not the runtime's.
- Cadence: `retro_cadence_days` in `config.md` (default 90). Due when the last retro is older than the cadence, or when there has never been one and the vault has at least 3 matters or 10 threads.
- Every new route's first segment (`retro`) is in `API_PREFIXES` (the vite proxy reads that list).
- Tests never touch the real `~/.counsel-os` or a real vault.
- UI: set text, small-caps run-ins, no pills, no modals, no wizard.
- Commit prefixes `runtime:` / `ui:` / `docs:`; no trailers.

---

## File structure

```
runtime/src/
  retro/
    state.ts        read/write .counsel/retro.json
    evidence.ts     gatherRetroEvidence, renderRetroEvidence (pure over injected reads)
    index.ts        retroCadenceDays, retroStatus, startRetro, periodLabel
    *.test.ts
  threads/store.ts  ThreadHeader.task; create({ task })
  loop/run-record.ts listAllRuns(vaultRoot, tenant)
  loop/prompt.ts    AssembleSystemPromptOptions.sections (appended)
  loop/counsel-loop.ts  task from header when the step names none; retro sections
  content/source.ts SHIPPED_ROOTS += 'skills/retro'
  server/routes.ts  GET /retro, POST /retro; API_PREFIXES += 'retro'
  cli.ts            retro [--vault] [--since] [--provider]
runtime/ui/src/
  api/types.ts      RetroStatus, RetroStart, ThreadHeader.task
  v2/Shell.tsx      startRetro → select thread, initialAsk
  v2/home/HomePage.tsx   due line under the subline (onStartRetro)
  v2/settings/RetroAction.tsx  last run + "Run a retro" (Settings › Runtime)
  v2/settings/SettingsPage.tsx  mounts RetroAction (onStartRetro)
  styles.css        .v2-retro-due, .v2-retro
docs/superpowers/plans/2026-09-01-runtime-retro.md (this)
CHANGELOG.md, skills/retro/SKILL.md (one note)
```

---

### Task 1: Retro state + cadence + status

**Files:** create `runtime/src/retro/state.ts`, `runtime/src/retro/index.ts`, tests; modify `runtime/src/vault/resolve-root.ts` (`retroCadenceDays` on `VaultConfig`).

- [ ] Test: `readRetroState` on a vault with no file → `{}`; round-trip write/read; `retroCadenceDays` default 90 and override; `retroStatus` due rules (never run + 2 matters → not due; never run + 3 matters → due; last retro 89 days → not due; 91 → due; `daysSince`, `dueAt`).
- [ ] Implement; run `bun test runtime/src/retro`; commit `runtime: retro state, cadence and due rule`.

### Task 2: Evidence

**Files:** create `runtime/src/retro/evidence.ts` + test; modify `runtime/src/loop/run-record.ts` (`listAllRuns`).

- [ ] Test on a seeded temp vault: two threads (one in period, one before), step events with tasks/providers, a pending + an approved + a rejected proposal, an artifact event, run records (done, error, timeout), two matters (one touched in period), `memory/patterns.md` with 4 entries, one `memory/retro-2026-05-01.md`, an injected doctor report. Assert the counts and that `renderRetroEvidence` output matches a snapshot.
- [ ] Implement; commit `runtime: retro evidence — what the runtime knows about the period`.

### Task 3: The thread and the prompt

**Files:** modify `threads/store.ts` (`task` on header, `create({task})`), `loop/prompt.ts` (`sections`), `loop/counsel-loop.ts` (task fallback to header; retro sections), `content/source.ts` (+`skills/retro`), regenerate manifest; `runtime/src/retro/index.ts` (`startRetro`).

- [ ] Test: `startRetro` creates a thread titled `Retro · <period>` with `task: 'retro'`, writes state, returns the message; prompt test: with `sections` the prompt ends with them; loop test (fake provider): a step on a retro thread carries `task: 'retro'` on its `step` event without the caller naming it, and the fake provider's received system prompt contains "Retro evidence".
- [ ] Implement; `bun run content:manifest`; commit `runtime: a retro is a thread — task on the header, method + evidence in the system prompt`.

### Task 4: Routes + CLI

**Files:** `server/routes.ts`, `cli.ts`, tests.

- [ ] Test: `GET /retro` → status (401 without token); `POST /retro` → 201 `{ threadId, title, message, status }`, thread listed, state written; `since` honoured.
- [ ] CLI: `retro [--since]` creates the thread, prints the id and title, then runs the first step through `runStep` when a provider resolves from the registry (`--provider` overrides), streaming NDJSON like `step`; without a resolvable provider it prints the message and exits 0 with a line saying to open the thread in the app.
- [ ] Commit `runtime: GET/POST /retro and the retro command`.

### Task 5: UI

**Files:** `api/types.ts`, `v2/Shell.tsx`, `v2/home/HomePage.tsx`, `v2/settings/RetroAction.tsx`, `v2/settings/SettingsPage.tsx`, `styles.css`, tests.

- [ ] HomePage: fetch `/retro` with the other reads; when `due`, one line under the subline: "Last retro 94 days ago · run a retro" / "No retro yet · run a retro". Test: due → line + click calls `onStartRetro`; not due → nothing; a failed read → nothing.
- [ ] RetroAction in Settings › Runtime: "Last retro <date> (n days ago)" or "No retro yet", the cadence, and a "Run a retro" button → `onStartRetro`. Test.
- [ ] Shell: `startRetro` → `POST /retro` → select the thread, go to chat, send the returned message as the first step. Test: the step request goes to the new thread with the message.
- [ ] Commit `ui: a retro is one click — Home says when it is due, Settings runs it`.

### Task 6: Docs

- [ ] `skills/retro/SKILL.md`: one line that the runtime runs the same retro (`counsel-os retro`, Home, Settings) with the runtime's own evidence. `CHANGELOG.md` Unreleased. Commit `docs: retro in the runtime`.
