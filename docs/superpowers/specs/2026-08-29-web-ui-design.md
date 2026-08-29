# Local web UI — design (build step 4)

Date: 2026-08-29
Status: approved in brainstorm
Parent spec: `2026-08-28-runtime-and-web-ui-design.md` §6, as re-read by the step-3 spec §2
(chat + vault + run record + settings; **no review screen**). Step 5 = one design pass.

## 1. Goal

A lawyer opens one local page and uses counsel-os the way the plugin works, with what the
plugin cannot show: streamed answers with tool activity, proposals they approve or reject in
place, the run record for every request, the vault, and the model settings. Four surfaces,
functional styling, all of them; polish is a later, separate pass.

Also: the typed-answer follow-up recorded in the step-3 spec §5 (an unparsable structured
answer keeps the model's raw text).

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Stack | Vite + React + TypeScript under `runtime/ui/`; `bun run ui:build` → `runtime/ui/dist`; `counsel-os serve` serves it at `/` (SPA fallback) | Parent spec: no Next.js, no server rendering |
| Auth from the browser | `serve` prints `http://127.0.0.1:<port>/#token=<token>`; `--open` launches it; the page moves the token from the URL fragment into `sessionStorage` and strips the fragment; static assets need no token, every `/api` call does | The page cannot read `runtime.json`; a fragment is never sent to the server or logged |
| API prefix | Existing routes stay where they are; the UI calls them directly (same origin) | No proxy, no CORS |
| Streaming in the page | `fetch` + `ReadableStream` SSE parser (not `EventSource` — it cannot send a bearer header or POST) | |
| Chat surface | Thread list · chat (streamed text, tool cards, proposal cards with approve/reject, warnings) · composer with a provider picker (default from `/health`) | One screen a lawyer lives in |
| Run record surface | Per-step collapsible panel under the assistant turn (status, provider, primitives read, tools with ms, proposals, cost, duration), populated from `GET /runs?thread=` on thread open and again when a step ends; while a step runs, the live stream shows text, tool cards and proposals, and no panel — a live status panel is deferred to the step-5 design pass | Spec-3 run record made visible |
| Vault surface | Read-only tree (`/vault/list`) + file view (markdown rendered, `.counsel/` never shown) ; a proposal card links to its path | No write path from the UI except approving a proposal |
| Settings surface | Shows `/health`; edits `providers.yaml` through a new `GET/PUT /settings` (default, providers, tasks, stepTimeoutMs); `POST /settings/test { provider }` runs a one-message step on a scratch thread and reports usage; the page says a test costs one call | Long-tail providers are config; the UI owns that config |
| Registry reload | `PUT /settings` validates with `RegistryFile`, writes the YAML, rebuilds providers + router in place; PUTs are serialized; restore-on-failure is byte-exact | No restart to add a model |
| Provider `baseURL` bound | `https://…` only, except `http://` to a loopback host (`127.0.0.1`, `localhost`, `[::1]`) for local servers such as Ollama/vLLM; anything else is 400 | A transport floor: a configured API key is never sent in cleartext. It is NOT an exfiltration bound — an authenticated client can still point `apiKeyEnv` at any https host. Decision: the single-operator loopback runtime trusts the holder of the bearer token with the operator's environment; a host allowlist is deferred until the runtime serves more than one person |
| Fake provider for tests | `serve --fake` registers `fake/fake` (`FakeModelProvider` with a canned script from `--fake-script <json>`) and makes it the default | Playwright and screenshots without a model |
| Typed-answer fallback | `StepEvent` `error` gains `text?: string`; providers fill it on structured-output failure (direct: the streamed deltas; Claude: `result`; Codex: `finalResponse`); run record stores it; SSE forwards it; under a schema the server does not forward raw `text` deltas (the log keeps them) | Step-3 spec §5 decision; defect 2 |
| Not built | Design pass, mobile layout, multi-tenant, editing vault files, a review screen | Step 5 / never |

## 3. Architecture

```
runtime/ui/                  Vite app (React 18, TS), own package.json (devDeps only)
  index.html, vite.config.ts (dev proxy /api-ish paths → runtime port), src/
    api/client.ts            token, fetchJson, streamStep (SSE parser → StepEvent[])
    api/types.ts             mirrors runtime StepEvent/ThreadEvent/RunRecord (copied, not imported)
    app.tsx                  router: /, /vault, /settings
    chat/                    ThreadList, Chat, Composer, TurnView, ToolCard, ProposalCard, RunPanel
    vault/                   Tree, FileView (markdown via `marked`)
    settings/                Health, ProvidersForm, TestButton
    styles.css               tokens (light/dark via prefers-color-scheme), layout
runtime/src/server/
    static.ts                serve dist with SPA fallback (no token)
    settings.ts              GET/PUT /settings, POST /settings/test, registry reload
    serve.ts                 --open, --fake, --fake-script, prints the token URL
runtime/src/providers/registry.ts   + writeRegistry(file, RegistryFile), reload seam
```

## 4. Interfaces

### 4.1 Settings API
| Method | Path | Body → Response |
|---|---|---|
| GET | `/settings` | `{ file, registry: RegistryFile, effective: { default, stepTimeoutMs, providers:[{id,kind,auth,capabilities}] } }` |
| PUT | `/settings` | `RegistryFile` → 200 same shape as GET (400 on validation error; 422 if a provider fails to construct, e.g. missing `baseURL`) |
| POST | `/settings/test` | `{ provider }` → `{ ok, usage?, error?, ms }` — creates a scratch thread titled `settings-test`, runs one step "Reply with the single word OK." with `timeoutMs: 60_000`, deletes the thread |

### 4.2 Static + bootstrap
`GET /` and any non-API path without a token → `dist/index.html`; `/assets/*` → files. `serve` output line becomes: `counsel-os runtime on http://127.0.0.1:<port>/#token=<token> (vault: …)`. `--open` runs `open`/`xdg-open` on it.

### 4.3 Typed-answer fallback
`{ type:'error'; message; text?: string }`. Run record `error` field keeps the message; a new `errorText?: string` keeps the text. SSE: when the step was typed, `text` frames are not sent (a `note` comment frame `: typed` is sent once so clients know).

### 4.4 UI ↔ API contract (what the page depends on)
`GET /health`, `GET/POST /threads`, `GET/DELETE /threads/:id`, `POST /threads/:id/steps` (SSE), `POST /threads/:id/approve`, `GET /runs?thread=`, `GET /vault/list|read`, `GET/PUT /settings`, `POST /settings/test`. Nothing else.

## 5. Errors
401 → page shows "token missing or stale — restart `counsel-os serve` and open the printed URL". Stream `error` → red turn with the message (+ raw text when present). 409 on approve → card shows both versions' hashes and offers "reload". Settings 400/422 → inline field errors.

## 6. Testing
- Server: `static.ts` (fallback, no token, `.counsel` unreachable through `/`), `settings.ts` routes (GET/PUT roundtrip, validation, reload takes effect in `/health`, test endpoint with the fake), fake provider wiring, typed-answer fallback in all three providers (unit) + SSE suppression.
- UI: component tests with `bun test` + `happy-dom` + `@testing-library/react` for the SSE parser, ProposalCard state, RunPanel rendering; one Playwright flow against `serve --fake`: open URL → new thread → send → see streamed text + tool card + proposal → approve → vault file view shows the change → run panel shows status `done` → settings page loads.
- Live: one Ollama step through the UI, screenshots in the spikes doc; no subscription calls.

## 7. Build order
1. Typed-answer fallback (providers, record, SSE suppression).
2. Fake provider + `--open` + token URL + static serving.
3. Settings API + registry write/reload.
4. UI scaffold + API client + chat surface + run panel.
5. Vault + settings surfaces.
6. Playwright flow, live Ollama screenshot, findings.
