# Providers step 3 — model discovery — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a provider row's model is picked from the vendor's own list (with context size beside it), not typed from memory; the first-run Ollama row offers its models the same way; a vendor with no list endpoint offers a curated list; a failed listing is a sentence on the row, never an empty picker.

**Architecture:** each catalog record gains a `discovery` descriptor (`shape` + optional `url`); `runtime/src/providers/discovery.ts` turns a descriptor plus credentials into `{ models, source, error? }` through one lister per response shape (OpenAI `/models`, Google `models.list`, OpenRouter, Ollama `/api/tags`, Cohere, Together). `GET /providers/:id/models` resolves the key the way the registry does (entry's `apiKeyEnv`, else the vendor's default variable), refuses to call a keyed vendor without a key, caches per vendor for ten minutes, and never throws. The UI's `ModelCombo` (react-aria combobox, same markup as `ProviderCombo`) feeds from that route on the Settings row and on the first-run Ollama row.

**Tech Stack:** Bun `fetch` with `AbortSignal.timeout`, react-aria combobox hooks, zod for the route's query.

**Spec:** `docs/superpowers/specs/2026-09-01-providers-design.md` §4, §9, §10, §11 step 3.

## Global Constraints
- No network in tests: every lister runs against recorded fixtures through an injected `fetch`.
- 3-second timeout per vendor call; a failure is `{ error: 'Could not list models: <reason>' }`.
- A keyed vendor is never called without a key: `{ models: [], error: 'No key for <Vendor> yet.' }`.
- Keys come from the environment this step (the secret store is step 2; another builder owns it).
- The Settings change is the MODEL field and its sentence; the switcher and task-route pickers are unchanged.
- No Co-Authored-By / Claude-Session trailers.

---

### Task 1: discovery descriptors on the catalog + the listers
**Files:** modify `runtime/src/providers/vendors.ts`; create `runtime/src/providers/discovery.ts`, `runtime/src/providers/discovery.test.ts`.
- [ ] Test: each shape parses its fixture (`openai` → ids; `google` → `models/`-stripped ids filtered to `generateContent`, `inputTokenLimit`; `openrouter` → `context_length` + pricing per 1M; `ollama` → names; `cohere` → chat models with `context_length`; `together` → array with `context_length`); a slow server → the timeout error; a non-2xx → the status in the error; a curated vendor returns `source: 'curated'` without calling fetch; a `models: 'none'` vendor returns an explanatory error.
- [ ] Implement `Discovery` on `Vendor` (`{ shape, url? }`), `discoverModels(vendor, { apiKey, baseURL, fetch, timeoutMs })`.

### Task 2: the route
**Files:** modify `runtime/src/server/routes.ts` (`API_PREFIXES` + `providers`), `runtime/src/server/routes.test.ts`.
- [ ] Test: `GET /providers/openai/models` with no key → `{ models: [], source: 'list', error: 'No key for OpenAI yet.' }`; with `OPENAI_API_KEY` in the injected env → the fixture's ids; a full id `openai/gpt-5.6` resolves the vendor; a registry entry's `apiKeyEnv` wins; `?baseURL=` (loopback or https only) reaches a local runner; the second call hits the cache (fetch called once) and `?refresh=1` calls again; unknown prefix → 404.
- [ ] Implement with `deps.discovery?: { fetch?, env?, now? }`.

### Task 3: the UI picker
**Files:** create `runtime/ui/src/settings/ModelCombo.tsx`, `ModelCombo.test.tsx`; modify `runtime/ui/src/v2/settings/SettingsPage.tsx`, `SettingsPage.test.tsx`, `runtime/ui/src/v2/SetupPage.tsx`, `SetupPage.test.tsx`, `runtime/ui/src/api/types.ts`, `runtime/ui/src/styles.css`.
- [ ] Test: the Settings row shows a Model picker beside Id when the id has a known prefix; it lists the route's models with context sizes, picking sets the id to `<prefix>/<model>`, a custom id is accepted, the route's error shows as the row's sentence with a `refresh` link; the first-run Ollama row lists its models in the picker and picking sets the provider id.
- [ ] Implement.

### Task 4: docs
- [ ] CHANGELOG Unreleased, CONFIGURATION.md note.
