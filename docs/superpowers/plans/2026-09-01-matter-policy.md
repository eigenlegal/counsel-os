# Matter privacy policy — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a matter marked `stays_local: true` (or a vault whose default locality is `local`) never has a step run on a cloud provider — decided before the first call, enforced by the runtime, shown in the UI, never downgraded silently.

**Architecture:** one pure policy module (`runtime/src/vault/policy.ts`) reads the declaration; the router gains a `localOnly` path with an `isLocal(caps)` helper; the counsel loop evaluates the policy right after the thread header, before the user turn is appended and before the provider is resolved; the step route pre-flights the same check and answers 409 without streaming; `GET /threads/:id` reports the header-derived policy so the UI can show it.

**Tech stack:** Bun/TypeScript runtime, React UI, bun test + happy-dom.

**Spec:** `docs/superpowers/specs/2026-09-01-providers-design.md` §7, §9–§11 step 4.

## Global constraints
- `isLocal(caps)` = `caps.auth === 'local'` today; step 1 of the providers track switches it to `caps.locality`. One helper, one comment.
- An inferred matter never sets policy.
- No new pills, modals, or banners: set text in the existing notice/line slots.
- No edits to Settings/first-run provider rows beyond the one checkbox.

## Tasks
1. [x] `VaultConfig.defaultLocality` from `default_locality` in config.md (resolve-root) — test.
2. [x] `vault/policy.ts`: `matterFor(path)`, `matterPolicy`, `policyForStep` (explicit link → attachment chips → vault default; folder matters; `stays_local: false` beats a local vault default) — tests.
3. [x] Router: `isLocal`, `resolve(task, { localOnly })`, `MatterStaysLocalError` — tests (best local; prefer honoured when local; explicit cloud refused by the loop; none → typed error).
4. [x] Loop: policy computed after the header, provider resolved BEFORE the user append; run record carries `policy: 'stays-local'`; exports `policyForOptions` + `resolveStepProvider` for the route — tests.
5. [x] Routes: `POST /threads/:id/steps` pre-flight → 409 `{ error: 'matter-stays-local', message }`; `GET /threads/:id` carries `policy` — tests.
6. [x] Setup: `staysLocalDefault` in the plan → `default_locality: local` in config.md — tests; CONFIGURATION.md.
7. [x] UI: thread `policy` type; header `· stays local` and the "link it" offer for an inferred `stays_local` matter; composer policy notice; 409 shown without Retry; switcher greys cloud rows; reader facts `stays local · yes`; first-run checkbox — tests.
