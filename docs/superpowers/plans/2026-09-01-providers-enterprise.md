# Providers step 5 — Azure OpenAI, AWS Bedrock, Google Vertex — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three enterprise vendors whose auth is not one API key join the catalog: fields instead of a key, the secret fields kept as ONE Keychain item, non-secret fields on the registry entry, the SDK's default credential chain honoured, discovery where the vendor lists.

**Architecture:** A `fields` list on the vendor record replaces the single key for `auth: 'azure' | 'sigv4' | 'gcp'`; `runtime/src/providers/enterprise.ts` resolves them (store JSON → environment → default chain) and validates a `PUT /providers/:id/key { fields }` body; `directProviderFromId` hands `extra` + `secrets` to the vendor's `make`; discovery gains an `azure` shape (deployments) and a `bedrock` shape (SigV4-signed ListFoundationModels via `aws4fetch`); Vertex is curated. Settings renders a field set under the row for these vendors.

**Tech Stack:** Bun, zod, `@ai-sdk/azure` 4.0.59, `@ai-sdk/amazon-bedrock` 5.0.72, `@ai-sdk/google-vertex` 5.0.74, `aws4fetch` 1.0.20, React + react-aria (existing UI).

**Spec:** `docs/superpowers/specs/2026-09-01-providers-design.md` §3, §5, §11 step 5, §12.

## Global Constraints
- Secrets never in `providers.yaml`, the vault, logs, or responses; one keychain item per provider id (`counsel-os/<id>`).
- `PUT /providers/:id/key` is the only route a secret travels on; 204 back.
- Every catalog record builds a model with no network from fake fields.
- No trailers on commits; suites and typechecks green.

---

### Task 1: Types and the field-set model
**Files:** `runtime/src/core/types.ts`, `runtime/src/providers/vendors.ts`, `runtime/src/providers/secrets.ts` (+tests)
- [x] `Capabilities.auth` gains `'azure' | 'sigv4' | 'gcp'`; `KeyState` gains `'default-chain'`.
- [x] `VendorField { name, label, secret, required, placeholder?, help?, default? }`; `Vendor.fields?`; `MakeOptions.extra?/secrets?`; `VendorGroup` gains `'enterprise'`.
- [x] `secrets.ts`: `readSecretFields(store, id)` / `writeSecretFields(store, id, fields)` — one JSON value `{ v: 1, fields }`; a non-JSON value reads as a plain key.
- [x] Tests: round trip, plain-key compatibility.

### Task 2: The three records and their factories
**Files:** `runtime/src/providers/vendors.ts`, `runtime/src/providers/direct.ts`, `package.json`
- [x] `azure` (createAzure: resourceName, apiVersion, apiKey, baseURL), `bedrock` (createAmazonBedrock: region, accessKeyId/secretAccessKey/sessionToken or apiKey), `vertex` (createVertex / createVertexAnthropic for `claude-*` ids: project, location, apiKey or googleAuthOptions.credentials from a service-account JSON). Handles: Microsoft / Amazon / Google Cloud with their enterprise terms.
- [x] `directProviderFromId` passes `extra` and `secrets`.
- [x] Tests: each builds from fake fields; a `claude-*` Vertex id routes to the Anthropic factory.

### Task 3: Resolution and validation — `enterprise.ts`
**Files:** `runtime/src/providers/enterprise.ts` (+test), `runtime/src/providers/registry.ts`
- [x] `resolveEnterprise(vendor, entry, { store, env, home })` → `{ extra, secrets, keyState }`: store JSON → env (per-vendor variable map; `AWS_PROFILE`/`~/.aws/credentials` parsed; `GOOGLE_APPLICATION_CREDENTIALS` read as JSON) → default chain (`'default-chain'` when the SDK can find its own: Bedrock, Vertex) → `false`.
- [x] `validateFields(vendor, fields)` per vendor: required secret fields, the Bedrock either/or, size caps; returns issues in zod-issue shape.
- [x] `Entry.extra: Record<string,string>` in the registry schema; `loadRegistry` uses `resolveEnterprise` for field vendors.
- [x] Tests: precedence, profile file, ADC, validation.

### Task 4: Routes
**Files:** `runtime/src/server/settings.ts`, `runtime/src/server/routes.ts` (+tests)
- [x] `KeyBody` = `{ value }` | `{ fields }`; `putProviderKey` stores JSON for field vendors (400 with issues on validation); `takesKey` covers the new auths; `keyStateFor` for field vendors via `resolveEnterprise`.
- [x] Discovery route resolves enterprise creds and passes them.
- [x] Tests: PUT fields per vendor, 400 shapes, keySet `'default-chain'`, never echoed.

### Task 5: Discovery shapes
**Files:** `runtime/src/providers/discovery.ts` (+test)
- [x] `azure`: `GET https://{resource}.openai.azure.com/openai/deployments?api-version=2023-03-15-preview` with `api-key`, parse `{ data: [{ id, model }] }`.
- [x] `bedrock`: `GET https://bedrock.{region}.amazonaws.com/foundation-models?byOutputModality=TEXT` signed with `aws4fetch`, parse `modelSummaries[].modelId`; curated fallback when no credentials.
- [x] `vertex`: curated (Gemini + Claude on Vertex).
- [x] Tests against fixtures with an injected fetch; the Bedrock request carries an `Authorization: AWS4-HMAC-SHA256` header.

### Task 6: UI
**Files:** `runtime/ui/src/api/types.ts`, `runtime/ui/src/api/client.ts`, `runtime/ui/src/v2/vendors.ts`, `runtime/ui/src/settings/registry-form.ts`, `runtime/ui/src/v2/settings/EnterpriseFields.tsx` (+test), `SettingsPage.tsx`, `KeyControl.tsx`, `styles.css`
- [x] Mirror types; `RegistryEntry.extra`; `ProviderRow.extra`; catalog rows for the three with `fields`, group `enterprise` ("Hosted API · enterprise"), setup links.
- [x] `EnterpriseFields`: non-secret fields bound to the row; secret fields masked, submitted via `setProviderFields`, never rendered after save; state line `set · replace · remove` / `default credentials on this machine` / `from the environment` / `not set`.
- [x] Tests: picker lists the group; masked inputs; value absent from the DOM after save; `extra` round trip.

### Task 7: Docs
- [x] CONFIGURATION.md enterprise section; CHANGELOG Unreleased; README providers sentence; spec §3 addendum.
