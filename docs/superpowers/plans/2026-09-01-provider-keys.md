# Provider keys (providers step 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API keys are entered in the app and kept in the macOS Keychain (libsecret on Linux when present, else a 0600 file), resolved at registry load ahead of environment variables, and never written to `providers.yaml`, the vault, a log, or a response.

**Architecture:** one `SecretStore` interface with three implementations behind `openSecretStore(env)`; `loadRegistry` takes the store and asks it before `env[apiKeyEnv]`; two routes (`PUT`/`DELETE /providers/:id/key`) under the settings lock; `/health` and `GET /settings` report `keySet` per provider and `secrets.where`, never a value; Settings rows get a key control and the Runtime ledger a "Keys" fact.

**Tech Stack:** Bun, the `security` CLI (macOS), `secret-tool` (Linux), the repo's atomic-write primitive, React + happy-dom tests.

**Spec:** docs/superpowers/specs/2026-09-01-providers-design.md §5, §9, §10, §11 step 2, §12.

## Global Constraints
- The key travels once, in the `PUT` body over loopback. It never appears in `providers.yaml`, the vault, a log line, an error message, `/health`, or `GET /settings`.
- The stores are exercised only against a temporary keychain (tests) or a temp home; never the login keychain.
- The `providers-catalog` branch is the base; the catalog's `make({ apiKey })` factories are the seam.

---

### Task 1: `secrets.ts` — the three stores and the chooser
**Files:** create `runtime/src/providers/secrets.ts`, test `runtime/src/providers/secrets.test.ts`.
- [ ] Failing tests: file store round trip at 0600; keychain store against a temp keychain (macOS only, skipped elsewhere); libsecret store over an injected runner; `openSecretStore` picks by platform/availability and honours `COUNSEL_OS_SECRETS=file`; `redact` never leaks a value.
- [ ] Implement; run `bun test runtime/src/providers/secrets.test.ts`.
- [ ] Commit.

### Task 2: registry resolution
**Files:** `runtime/src/providers/registry.ts`, `registry.test.ts`.
- [ ] Failing test: with a fake store holding a key for `google/gemini-x`, the provider builds with it even when the env is empty; env still works with no store; `key: keychain` in the file parses and is ignored.
- [ ] `loadRegistry({ secrets })`: key = `secrets?.get(id) ?? env[keyEnv]`; `Entry.key` optional literal.
- [ ] Commit.

### Task 3: routes and views
**Files:** `runtime/src/server/settings.ts`, `routes.ts`, `serve.ts`, `settings.test.ts`.
- [ ] Failing tests: `PUT /providers/:id/key` 204 stores and reloads; empty/oversize 400; unknown prefix / non-key vendor 404; `DELETE` 204 (idempotent); `GET /settings` and `/health` carry `keySet` (`true | false | 'env'`) and `secrets.where`, never the value; responses never contain the key text.
- [ ] Implement `keyStateFor`, `SettingsDeps.secrets` + `env`, the two routes under `SETTINGS_LOCK`, `providers` in `API_PREFIXES`; `serve.ts` opens the store once.
- [ ] Commit.

### Task 4: UI
**Files:** `runtime/ui/src/api/types.ts`, `api/client.ts`, `v2/settings/KeyControl.tsx` (+test), `v2/settings/SettingsPage.tsx` (+test), `settings/Health.tsx` (+test), `styles.css`.
- [ ] Failing tests: key control states (`not set · paste a key` with the vendor link; `set · replace · remove`); paste → PUT with the value, then the field is empty and the value is nowhere in the DOM; remove → DELETE; Runtime ledger "Keys · Keychain" / "Keys · file (…)"; purpose copy no longer says "environment variable" except the headless sentence.
- [ ] Implement; `bun run ui:test`, `typecheck:ui`.
- [ ] Commit.

### Task 5: docs
- [ ] CONFIGURATION.md keys section; CHANGELOG Unreleased; README providers paragraph. Commit.
