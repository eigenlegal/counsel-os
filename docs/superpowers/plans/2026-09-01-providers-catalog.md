# Providers step 1 — the vendor catalog — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** every provider the runtime can talk to is one record in a vendor catalog — Google Gemini, Mistral, Groq, xAI and OpenRouter join Anthropic, OpenAI, Ollama and the OpenAI-compatible shape — with a locality (local or cloud), the company that receives the text, and the AI SDK factory that builds the model from an explicit key. The router, `/health`, Settings, the switcher and the first-run screen read the catalog; nothing names a vendor by hand any more.

**Architecture:** `runtime/src/providers/vendors.ts` is the one table (`Vendor` records keyed by id prefix). `registry.ts` validates ids against it; `direct.ts` builds models through each vendor's `create…({ apiKey, baseURL })` factory; `Capabilities` gains an optional `locality` with `localityOf()` deriving it from `auth` when absent, so the thirteen existing capability literals in tests keep working while direct providers carry the derived value (an OpenAI-compatible loopback server is local). `/health` and `GET /settings` carry `locality` and `handles`; the UI mirrors the catalog's names and labels in `runtime/ui/src/v2/vendors.ts`.

**Tech Stack:** `@ai-sdk/google`, `@ai-sdk/mistral`, `@ai-sdk/groq`, `@ai-sdk/xai`, `@openrouter/ai-sdk-provider` on the installed `ai` 7 line; zod for the registry schema.

**Spec:** `docs/superpowers/specs/2026-09-01-providers-design.md` §3, §6, §11 step 1, §12.

## Global Constraints
- No network in tests: every factory is exercised with a fake key and base URL, never called.
- Keys still come from the environment (`apiKeyEnv`, or the vendor's default variable) this step; the factories already take an explicit key so step 2 only changes where it comes from.
- Copy never tells a lawyer to set an environment variable in the Runtime panel; say "key" and where it goes.
- Other builders own `router.resolve` (localOnly) and `counsel-loop.ts`; this step changes one line in `router.ts` (`satisfies` reads locality).
- No Co-Authored-By / Claude-Session trailers.

---

### Task 1: the catalog
**Files:** create `runtime/src/providers/vendors.ts`, `runtime/src/providers/vendors.test.ts`; modify `runtime/src/core/types.ts` (`locality?`), `package.json` (five deps).
- [ ] Test: every direct vendor builds a `LanguageModel` from `{ model, apiKey: 'k', baseURL }` without network; `localityFor('openai-compatible', 'http://127.0.0.1:1234/v1')` is `local`, a remote URL is `cloud`; `handles` names a company and an https terms URL for every cloud vendor; Anthropic's curated list has ids and context sizes; `vendorFor('nope')` is `undefined`.
- [ ] Implement the records and helpers; `bun add` the packages pinned.

### Task 2: registry and factories
**Files:** modify `runtime/src/providers/registry.ts`, `direct.ts`, `index.ts`; tests in `registry.test.ts`, `direct.test.ts`.
- [ ] Test: a file with `google/gemini-2.5-pro`, `mistral/…`, `groq/…`, `xai/…`, `openrouter/…` loads; an unknown prefix throws a message listing the known prefixes; the key comes from `apiKeyEnv`, else the vendor's default variable.
- [ ] `directProviderFromId` goes through `vendor.make`; anthropic/openai stop using the SDKs' module-level providers; capabilities carry `locality`.

### Task 3: the router reads locality
**Files:** modify `runtime/src/router/router.ts` (one line), `runtime/src/core/types.ts` (`localityOf`); test in `router.test.ts`.
- [ ] Test: an `openai-compatible` provider on a loopback base URL satisfies `allow_remote: false`; a cloud one does not.

### Task 4: `/health` and `/settings` carry locality and handles
**Files:** modify `runtime/src/server/settings.ts` (`ProviderView`), `routes.ts` (health), `setup-routes.ts` (setup-mode health unchanged: `providers: []`); tests in `routes.test.ts` / `settings.test.ts`; mirror `runtime/ui/src/api/types.ts`.
- [ ] Test: `/health.providers[]` has `locality` and `handles` (`null` for local).

### Task 5: the UI — names and the data-handling line
**Files:** create `runtime/ui/src/v2/vendors.ts` (+test); modify `plate.ts` (names from the mirror; `dataLine`), `ModelSwitcher.tsx` (second line), `settings/Health.tsx` (a Data column), `settings/SettingsPage.tsx` (guided starts for the five vendors; the data line under each provider row; copy), `settings/registry-form.ts` (`vendorKeyRow(prefix)`), `SetupPage.tsx` (the hints after the probes); tests beside each.
- [ ] Tests: plate names for `google/…`, `mistral/…`, `groq/…`, `xai/…`, `openrouter/…`; `dataLine` for local vs cloud (with the company); Settings shows "Add Google Gemini" … and prefills `google/` + `GOOGLE_GENERATIVE_AI_API_KEY`; a row's data line follows its id prefix; the first-run hints list the five vendors after the probes with OpenRouter's sentence.

### Task 6: docs
**Files:** `CHANGELOG.md` (Unreleased), `README.md` (Confidentiality and data flow: the providers now possible, what each receives), `CONFIGURATION.md` (a `providers.yaml` section with the prefixes, `apiKeyEnv` and the vendors' default variables, `baseURL` rule).
- [ ] Commit.

## Self-review
- Spec §3: catalog records, factories with explicit keys, `locality` on capabilities and in the router, `/health` + `/settings` shapes, the plate reads the catalog — covered by Tasks 1–5.
- Spec §6: the second line on rows and the switcher — Task 5.
- Spec §12: OpenRouter after Ollama on the first-run screen with one sentence — Task 5.
