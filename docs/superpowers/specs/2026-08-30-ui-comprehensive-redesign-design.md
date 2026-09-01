# UI comprehensive redesign — design (build step 6)

Date: 2026-08-30
Status: approved in brainstorm. The founder asked for a comprehensive functionality + UI/UX
pass ("as beautiful as a modern web app, usable, and clean"), a home dashboard, and a vault
that is actually navigable/readable. Direction converged over two external critique loops plus
three founder rounds; final mockups: the session scratchpad `design/mock-{home,chat,vault}.html`
(also to be committed under `docs/superpowers/specs/img-redesign/` by the plan's Task 1).
Founder amendments during review: (1) **no left-accent-border panels / pill badges — the
"brief/ledger" motif is the design language** (double-rule dividers, dotted leaders, small-caps
run-in headings, statuses as set text); (2) **proposal diffs render as Word-style tracked
changes** (inline `del` strikethrough / `ins` underline in the document's own type), with
whole-document and line-diff views one click away.

**Amended 2026-08-30 (build step 6, Task 2 review F5/F6).** The §2 light status ramp is corrected:
the values first named measure below the 4.5:1 the row claims, so accent `#a8681f`→`#9a5d16`
(4.21:1 → 4.97:1) and amber `#996d10`→`#8a6210` (4.32:1 → 5.12:1), and the derived faint ink is
set to `#7a7061` (3.63:1 → 4.55:1). The dark ramp's `--fg-faint` was later lifted too — see the
2026-08-31 amendment below. `runtime/ui/src/tokens.test.ts` now measures every ink on every
build, so the row cannot drift from its own claim again.

Founder rules that bind: no gates/pipelines/wizards (primitives only; starter chips are
prompt-fills, never flows); this evolves the one workbench UI in place (v1 is gone; no toggle).

## 1. Goal

Three surfaces, one identity: a **Home** that shows the work itself (decisions waiting, matters
with next-actions/deadlines, conversations) behind one ask box; a **Chat** whose trust story is
inline source citations and document-slip proposals with tracked-changes redlines; a **Vault**
that is a real reading environment (humanized tree, junk filtered, wide measure, outline, ⌘K
search). Plus the small runtime additions that feed them honestly.

## 2. Design language (tokens + motifs)

| Element | Treatment |
|---|---|
| Palette (dark) | *(palette and type revised 2026-09-01, founder — the brown ramp is gone)* bg `#161615` / raised `#1d1d1b` / hover `#262624`; ink `#e8e7e2` / `#b0afa9` / `#8f8e88` (5.0:1 on bg, 4.6:1 on raised); hairline `#2b2b29`, strong `#383836`; accent teal `#6fc2bd` (on-accent `#0f1a1a`; brand-mark second stop `#a6dcd8`); green `#7fc292`, red `#e3877c`, gold `#e0b84f`; redline tints ins `#1c2e28` / del `#33241f`; body antialiased on the dark ground |
| Palette (light) | warm grey `#f6f5f2` (raised `#ffffff`, sunken `#efeeea`, hover `#eae9e4`), ink `#1f1f1d` / muted `#5b5b57` / faint `#6f6f6a` (4.9:1); hairline `#e2e1dc`, strong `#cfcec8`; accent deep teal `#1f6b6b` (5.6:1; brand-mark second stop `#3a8a86`), green `#2f7a4a`, gold `#7d5f00` (5.6:1), red `#b03a2e`; redline tints ins `#e1efe8` / del `#f4e4e0`, opaque never alpha. `runtime/ui/src/tokens.test.ts` measures every ink on every build. *(History: the 2026-08-30 paper/brown ramp — `#faf7f1` / `#241f19`, accent `#9a5d16`, dark `#171412` / accent `#d99a4e` — was retired 2026-09-01 after the founder's review of the live dark UI: "the brownish color and the thick font that looks bold".)* |
| Type | **Chrome is the system sans** (`-apple-system, Inter, Segoe UI, system-ui`) at 500 or lighter: rail, brand, home rows (matters, docket, conversations), settings copy, slips, notices. **Reading surfaces are Charter** (`Charter, "Iowan Old Style", Georgia`) at 400, 15.5px/1.65: chat prose and the vault reading pane; document h2 at 500 with a hairline beneath, h3 as a small-caps run-in — hierarchy by rules and caps, not weight. Serif stays for titles (document and thread titles at 500, the greeting at 400) and for the italic set-text statuses at 500. Mono for paths and filenames. Sub-14px UI sizes on a 13/12/11 ramp |
| Motifs | **Docket**: double rule + small-caps run-in (`DOCKET · 1 AWAITING YOUR DECISION`). **Dotted leaders** for every label→value row (matters…due, conversations…time, frontmatter…value). **Set-text statuses**: italic serif *pending* (accent), *✓ approved · time* (green) — never pills, never left-accent borders. **Document slips**: proposals bounded by a double rule top / hairline bottom, content on the page |
| Chrome | one strong container per screen (the ask box / composer); everything else rules + whitespace; radius 9–14px where boxes remain; one shadow token |

## 3. Surfaces

### 3.1 Shell
Left rail 216px: brand, nav (Home · Chat · Vault · Settings, outline icons), CONVERSATIONS
list (titled threads), footer `● <default model> · <auth>` from `/health`. On the Vault route the
rail collapses to a 56px icon rail. Routes `#/`, `#/chat`, `#/vault`, `#/settings` (chat moves
under `#/chat`; `#/` becomes Home; old `#/` deep-links land on Home — acceptable). The chat
workspace stays mounted across routes (keep-stream invariant from PR #28).

### 3.2 Home (`#/`)
Serif greeting (time-of-day) · italic serif subline stating counts honestly (from real data,
omitting what is zero). **Ask box**: textarea, `＋ attach from vault` (inserts a path chip into
the message), accent `Ask` → creates a thread (title from first line) and navigates to it.
**Docket**: pending proposals across all threads (path, title/rationale first line, age, source
thread) with `Review →` linking to the thread anchored at the card; hidden entirely when empty.
**Starter chips** (prompt-fills only): Review a contract · What's our position on… · Draft a
response · What changed this week?. **Matters** (left, wider): open matters sorted by deadline
then recency — serif name ⋯ due date (amber when ≤14 days), `next: <action> · touched <ago>`;
from matter frontmatter + mtime. **Conversations** (right): titled threads ⋯ relative time.
Empty vault → a quiet getting-started block (three lines + link to docs) in place of the grid.

### 3.3 Chat (`#/chat`, `#/chat?thread=<id>`)
Thread header: 20px serif title · `matter: <name>` chip when the thread's first read resolves to
a matter (best-effort, client-side) · date. Turn: one quiet work line ("Searched the vault ·
read `nda.md` `acme-nda.md` ⌄" — filename chips, expandable to the full step detail); serif
prose with **source chips** after vault-factual sentences (derived: the files the step actually
read, rendered by the client when the model's text names them; no prompt change in this step);
**proposal slips** in lifecycle order — approved ones collapsed (`✓ approved · 2:41 pm`,
`view change ⌄`), pending ones open with the **tracked-changes redline**: `diffWords(current,
proposed)` rendered inline (`del` strike red / `ins` underline green) inside the document's own
markdown styling, changed blocks only, with `whole document` and `line diff` views; Approve /
Reject; `against version <7>`. Strip stays one hairline line: `DONE · 3 sources · 1 proposal
pending · details ⌄` (full record behind the chevron). Composer: one box, `⌘⏎ to send`, Send.
Model picker moves out of the composer into the rail footer (click → Settings).

### 3.4 Vault (`#/vault`, `?path=`)
Tree pane ~300px: search field (⌘K focuses; Enter runs `vault_search`, results replace the tree
until cleared); groups **Matters** (from `matters_path`, humanized titles — frontmatter `title`
or first H1, fallback prettified filename; right-aligned quiet month from the filename date or
mtime), **Practice**, **Knowledge** (memory, law, entities), **Other files (n)** collapsed
(everything else the server still lists). Reading pane: mono crumbs, serif H1 (doc title),
`updated <ago> · version <7>`, frontmatter as a two-column dotted-leader block, markdown at
~68ch serif measure, an **outline** column (H2s, current highlighted) on wide viewports,
sticky `Ask counsel about this file ↵` (prefills the composer with the path and navigates to
chat). The in-chat drawer keeps this file view (minus outline) at 420px.

### 3.5 Settings
Restyle to the motif (dotted-leader facts, set-text statuses); grouping and behavior unchanged.

## 4. Runtime additions (all read-only, small)

| Endpoint | Returns | Source |
|---|---|---|
| `GET /vault/list?dir=` (extend) | entries + `{ mtimeMs, size }`; server now EXCLUDES dotfiles and known junk (`.DS_Store`, `.git*`, `node_modules`) from listings — same skip set as `fsSearch` | `fs-store.list` |
| `GET /vault/overview` (new) | `{ matters: [{ path, title, frontmatter: {stage?, nextAction?, deadline?, counterparty?, …}, mtimeMs }], groups: { practice: n, knowledge: n, other: n } }` — one call for home + tree top | walks `matters_path`, parses frontmatter (existing YAML dep) + first H1 |
| `GET /proposals?status=pending` (new) | pending proposals across threads: `{ threadId, threadTitle, id, path, rationale, at }` | scan thread logs (bounded: newest N threads) |
| `GET /vault/read` | unchanged (adds `mtimeMs`) | |

No writes, no new state, no model calls. Deadlines/next-actions come only from frontmatter the
plugin conventions already define — absent fields simply don't render.

## 5. Errors / empty states

Every list has a designed empty state (docket hides; matters → getting-started; search → "no
results for <q>" with a clear link). 401/stream/409 behaviors unchanged. `vault/overview` on a
vault with no `matters_path` returns `matters: []` (home still works).

## 6. Testing

Unit: overview endpoint (frontmatter parse, H1 fallback, junk exclusion, missing matters dir);
proposals endpoint (pending only, bounded scan, titles); list filtering; word-diff redline
rendering (ins/del from a real before/after, changed-blocks-only slicing, whole-doc view, the
sanitizer still the only HTML sink — redline built from text nodes, never innerHTML); home
(docket hidden when empty, matters sort, subline counts); tree grouping/humanization; ⌘K search
flow; existing suites stay green. e2e: extend the workbench story — land on Home, ask from the
ask box, see the thread created; open Vault, ⌘K search, open a file; approve from the docket.
Screenshots (dark + light) into the spikes doc. No subscription calls (fake + Ollama only).

## 7. Build order

1. Runtime reads: list filtering + `vault/overview` + `/proposals` (+ tests).
2. Design system: tokens/motif CSS (light + dark), shell (rail, routes, icon-collapse), Settings restyle.
3. Vault surface: tree (groups, humanized, Other files, search), reading pane (outline, leaders), drawer reuse.
4. Home: greeting/subline, ask box, docket, starters, matters, conversations, empty states.
5. Chat: thread header, work line, source chips, proposal slips with tracked-changes redline (+ whole-doc/line-diff views), strip, composer.
6. e2e + screenshots (dark/light) + findings.
