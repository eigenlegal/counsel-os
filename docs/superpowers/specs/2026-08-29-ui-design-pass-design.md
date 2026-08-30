# UI design pass — design (build step 5)

Date: 2026-08-29
Status: approved in brainstorm (founder picked: answer-first turns with a streaming timeline;
diff proposal cards; workbench shell with a warm reading tone)
Parent: `2026-08-29-web-ui-design.md` (step 4 — the plain surfaces this pass restyles and
reorganizes). Founder rule from the step-3 spec §2 still binds: no gates, no flows, no
contract-shaped structure. This pass changes how the four surfaces read, not what counsel does.

> **2026-08-30 — the classic design (v1) was removed.** Founder decision, the same day the
> default flipped: "I don't think we need to keep the old design." The `ui` flag
> (`ui-flag.ts`, `localStorage['counsel-os.ui']`, `#/?ui=v1`), the Settings "New design"
> switch (`settings/DesignToggle.tsx`), the v1 `App` and its chat / vault / settings
> components, and the v1 e2e story are all gone; the `html[data-ui="v2"]` token scoping
> became unconditional. Everything below describes the rollout as it was designed and
> shipped — it is history, not the current state. The `.v2-*` class prefix stays as-is.

## 1. Goal

A lawyer opens the page and it reads like counsel, not a developer tool: the answer first, the
work counsel did one glance away, a proposal as a redline they can decide on in place, the vault
beside the thread. Shipped **behind a toggle** so the founder can compare it with the plain
surfaces before it becomes the default. That comparison happened: **v2 became the default on
2026-08-30**, and the toggle now turns it off rather than on.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Rollout | Shipped opt-in: `ui.v2` flag in `localStorage['counsel-os.ui']`, a Settings switch, `#/?ui=v2` in the fragment. **Default flipped to v2 on 2026-08-30 by founder decision**, after the comparison the toggle existed for. v1 stays reachable — the switch (now labelled "New design", on by default) and `ui=v1` in the fragment. Only the non-default choice is stored, so the key is `'v1'` or absent | Founder rule: ship redesigns as an opt-in toggle — then decide |
| Code layout | v2 is a second set of surfaces under `runtime/ui/src/v2/`, sharing `api/`, `chat/turns.ts`, `vault/sanitize.ts`, `vault/markdown.ts`, `settings/registry-form.ts`. v1 components untouched. `app.tsx` picks the shell by the flag | Both must keep passing their tests; no API change |
| Visual system | Tokens in `styles.css` under `[data-ui="v2"]`: warm paper (`--bg #fbfaf7`, `--fg #1f1d1a`, sunken `#f4f1ea`, border `#e8e3d9`), accent brown `#b45309` (proposals), status green `#2f7a3e` / amber `#b45309` / red `#b42318`; dark counterpart under `prefers-color-scheme: dark`; `--serif: "Iowan Old Style", Charter, Georgia, serif` for assistant prose only; `--sans` system; 4/8/12/16/24/32 px spacing; radius 8 px; one shadow | Warm tone chosen; no component library |
| Shell | Top bar (brand · Chat / Vault / Settings · vault path · active model). Left rail: threads. Main: chat. Right: **vault drawer**, 320 px, closable, opened by the nav "Vault" link inside chat, a step's file link, or a proposal's "open in vault"; it renders `Tree` + `FileView`. `#/vault` and `#/settings` full pages stay | Workbench chosen: check a file without leaving the thread |
| Thread titles | A thread is created on the **first send**, with `title` = the message's first line, trimmed to 60 chars. "New" opens a draft (no request). The list shows `title`, falling back to today's label | `POST /threads` already accepts `title`; no API change |
| Turn while streaming | Timeline: each `tool_call` renders one line `Reading <path>` / `Running <name>` (verb table below) with `· <ms>` when its result lands and a "show" toggle for input/result; text streams below the steps | Trust while waiting |
| Turn when finished | Steps collapse into one strip: status pill (`done` / `error` / `timed out`) · summary of what was read/run ("read 2 files, ran 1 tool") · provider · duration · tokens · chevron. Expanded: the full record — steps with show/hide, primitives read, proposals, model + usage + cost, run id | Answer-first reading |
| Verb table | `vault_read` → "Read", `vault_list` → "Listed", `vault_search`/`grep`-like → "Searched", `read_primitive` → "Consulted primitive", `propose_update` → "Proposed", `vault_write` → "Wrote", anything else → "Ran `<name>`" | One glance; no raw JSON by default |
| Error turn | Red strip + the message; the raw `error.text` fallback under "show answer" | Step-4 §4.3 kept |
| Proposal card | Brown-accent card: `PROPOSAL` tag · path · "open in vault" (drawer) · rationale · **unified diff** of the current vault file (`GET /vault/read`) vs the proposed `content` (client-side, `diff` npm package (`^8`, ships its own types) `diffLines`) · Approve / Reject · "based on version <7 chars>" · "preview" flip renders the proposed markdown through `sanitize.ts`. Approved/rejected cards show the state and keep the diff readable. 409 → footer becomes "file changed since — reload" (existing behavior) | Redline is the lawyer's idiom; deletions must be visible |
| Live proposal | The stream's `proposal` event has no `content`; the card shows path + rationale + "loading diff…" until the reload brings the content (existing `onReload` after the step) | No API change |
| Vault page + drawer | Same `Tree`/`FileView`, v2 tokens; file header with path + version; breadcrumb | |
| Settings page | Grouped: Design (toggle) · Default provider · Step timeout · Providers · Task routes · Test (confirm kept: "This uses one call on <id>.") | |
| Keyboard | ⌘⏎ / Ctrl⏎ sends; Esc closes the drawer | |
| Not built | Server-side titles/rename, mobile layout, editing vault files, multi-tenant, a live run record from the server (the strip is built from stream events + `GET /runs` after the step) | Step-4 deferred list unchanged |

## 3. Architecture

```
runtime/ui/src/
  app.tsx                 reads the flag → <App/> (v1) or <v2/Shell/>; sets data-ui on <html>
  ui-flag.ts              readUiFlag(), setUiFlag(), flag from fragment (?ui=v2)
  v2/
    Shell.tsx             top bar, rail, main, drawer; owns drawer state + hash routing (reuses parseHash)
    Rail.tsx              thread list (titles) + New (draft)
    Drawer.tsx            vault drawer (Tree + FileView), Esc/close
    chat/Chat.tsx         thread load/stream/lock logic COPIED from v1 Chat.tsx then trimmed; draft-create-on-send
    chat/Turn.tsx         user bubble / assistant turn = prose + Steps + Strip + ProposalCard
    chat/Steps.tsx        timeline lines (verb table), show/hide input/result
    chat/Strip.tsx        collapsed summary + expanded record (uses RunRecord when present)
    chat/ProposalCard.tsx diff card (fetches current file, diffLines), approve/reject via existing client calls
    chat/Composer.tsx     v2 composer (provider picker seeded from loaded list — keep step-4 S1 fix)
    vault/VaultPage.tsx   full page (tree + file) in v2 tokens
    settings/SettingsPage.tsx  grouped form + design toggle (reuses registry-form.ts, ProviderTest logic)
    verbs.ts              tool name → verb/object
    diff.ts               thin wrapper over `diff` (diffLines) → hunks for rendering
  styles.css              + [data-ui="v2"] tokens and v2 component styles (namespaced .v2-*)
```

Dependencies added: `diff` (^8.0.4) to `runtime/ui`. Nothing added to the runtime.

## 4. Interfaces

- `readUiFlag(): 'v1' | 'v2'` — fragment `?ui=v1` / `?ui=v2` wins for the load and is persisted; else `localStorage['counsel-os.ui'] === 'v1' ? 'v1' : 'v2'` (v2 is the default since 2026-08-30; only the `'v1'` opt-out is stored).
- `verbFor(tool: ToolCallView): { verb: string; object?: string }` — object is the `path` input when present.
- `summarize(tools: ToolCallView[]): string` — "read 2 files, ran 1 tool" / "no tools".
- `unifiedHunks(before: string, after: string): Hunk[]` where `Hunk = { kind: 'ctx' | 'add' | 'del'; text: string }[]`, 3 lines of context.
- The drawer is opened with `openDrawer(path: string | null)`; a proposal's "open in vault" calls it with the proposal path; a step line's path does too.
- Thread creation: `createThread({ title })` at first send; until then the composer works on a draft with no id.

## 5. Errors

Same as step 4: 401 page, stream `error` → red strip, 409 on approve → reload prompt, settings 400/422 inline. New: diff fetch failure → card shows the proposed content only with "could not load current file: <msg>"; toggle persistence failure (storage blocked) → the switch works for the session only and says so.

## 6. Testing

- Unit: `ui-flag` (fragment, storage, absent); `verbs` (table + fallback); `diff.ts` hunks; `Steps` (streaming lines, ms appears with result, show toggle); `Strip` (collapsed summary text; expanded record; error/timeout pills); `ProposalCard` v2 (diff renders del/add lines; preview flip goes through the sanitizer — script stripped; approve → status; 409 → reload prompt; fetch failure fallback); `Rail` titles; draft-create-on-send (one `POST /threads` with the title, then the step); Drawer open/close/Esc.
- Existing v1 tests unchanged and green.
- Playwright: the step-4 flow runs twice — v1 (`?ui=v1`, since the default flip) and v2 (the printed URL, no flag); v2 adds: proposal diff visible → approve → drawer opens the file → strip shows `done`.
- Screenshots of v2 (chat with strip expanded, proposal card, drawer, settings) under `docs/superpowers/spikes/img/` + a "## Step 5 — design pass" section in the spikes doc; one live Ollama step, no subscription calls.

## 7. Build order

1. Flag + tokens + shell skeleton (top bar, rail with titles + draft, main, drawer) routing to v2 pages that initially reuse v1 components.
2. Turn: Steps + Strip + verbs + v2 Chat (draft-create-on-send).
3. Proposal card with diff + preview.
4. Vault page/drawer + settings page in v2.
5. e2e v2 flow, screenshots, findings.
