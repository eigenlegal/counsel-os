# Runtime-Owned Setup — Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The runtime carries the knowledge content and can create a Counsel OS vault by itself: a content source the prompt and primitives read through, `runSetup` + `counsel-os init`, and a serve that starts in setup mode (with the setup API) instead of exiting when no legal root exists.

**Architecture:** `runtime/src/content/` is one flat namespace of shipped files keyed by repo-relative path (`knowledge/law/…`, `knowledge/practice-seed/…`, `templates/memory/…`, `primitives/…`, `skills/counsel/SKILL.md`) behind a `ContentSource` (`list`, `read`, `has`). A generated `manifest.ts` records per-file SHA-256 of the frontmatter-stripped body and per-group hashes with the exact algorithm of `scripts/bump_content_versions.py`. `repo.ts` reads the checkout; the embedded source for the compiled binary is a named seam (`contentSourceFor`) and a generator flag, not wired yet. `runtime/src/setup/` owns the setup plan, the profile templates, `runSetup` (idempotent, adopt-never-overwrite), and the machine-side probes (`detectLocations`, `probeProviders`). `serve.ts` composes two handlers: the setup app (health + `/setup/*` + 409 for everything else) and the real app, swapping to the real one on `POST /setup` without a restart.

**Tech Stack:** Bun 1.3.x, TypeScript strict, zod, `bun test`; UI React 18 + happy-dom for the one placeholder page.

**Spec:** `docs/superpowers/specs/2026-09-01-runtime-owned-setup-design.md` (§3, §4, §8, §9, §10 steps 1–2, §11 decisions)

## Global Constraints

- **No behaviour change for the running loop:** `assembleSystemPrompt` and `readPrimitiveTool` keep their current signatures and semantics; the content source is an additive option. `prompt.test.ts` and `primitives`-related tests pass unchanged.
- **Hashes agree with `.content-versions.json`:** group hash = SHA-256 over `--- <name> ---\n` + frontmatter-stripped body for each top-level `*.md` in the group dir, sorted by name; frontmatter regex `^---\s*\n(.*?\n)---\s*\n` (DOTALL). A test compares at least two groups against the JSON.
- **`runSetup` writes exactly what `skills/setup/SKILL.md` writes** (config.md marker + the commented overrides block verbatim; `<home>/legal-root` pointer; `law/<26 areas>/` 196 files; `practice/{profile,standards,methods,library,reference}`; `memory/patterns.md` with `counsel-os-type: memory-patterns` frontmatter; empty `matters/` and `entities/`; `.gitignore` with `.DS_Store`, `*.tmp`, `*~`; `git init` + `Initial Counsel OS knowledge base` commit when git is on PATH). Adopts an existing marked root; never overwrites an existing file; refuses a path inside the plugin tree or a path it cannot write.
- **Setup mode never leaks:** in setup mode every API path other than `health` and `setup` answers `409 { error: 'setup-required' }`; static serving and the bearer check are unchanged; `API_PREFIXES` gains `'setup'` (the source-scan test enforces it).
- **Nothing touches the developer's real home or serves:** every test uses `COUNSEL_OS_HOME=<tmp>` and temp vaults; no server binds a fixed port.
- Commit prefixes `runtime:` / `ui:` / `docs:`; no `Co-Authored-By`, no `Claude-Session` trailers.

---

## File structure

```
runtime/src/content/
  hash.ts           (+ hash.test.ts)      stripFrontmatter, bodyHash, groupHash — the Python algorithm
  manifest.ts                              GENERATED: MANIFEST { version, files: {path: {hash}}, groups }
  generate.ts       (+ generate.test.ts)   walks the shipped roots, writes manifest.ts (and embedded.ts with --embedded)
  source.ts                                ContentSource interface, SHIPPED_ROOTS, contentSourceFor(seam)
  repo.ts           (+ repo.test.ts)       repoContentSource(pluginRoot, { readFile? })
scripts/gen_content_manifest.ts            thin runner for generate.ts
runtime/src/loop/prompt.ts, primitives.ts  read the skill/primitives through a ContentSource (option; default = repo)
runtime/src/setup/
  plan.ts           (+ plan.test.ts)       SetupPlan zod schema, profile templates, isSaasInHouse
  run.ts            (+ run.test.ts)        runSetup(plan, deps) → SetupResult
  detect.ts         (+ detect.test.ts)     detectLocations, probeProviders (injectable fs/which/fetch)
  init.ts           (+ init.test.ts)       parseInitArgs, runInit (stdin prompts when not --yes)
runtime/src/cli.ts                         `init` command
runtime/src/server/setup-routes.ts (+test) createSetupApp: health(setup:true), /setup/detect|providers, POST /setup, 409s
runtime/src/server/serve.ts                setup mode + live switch; health gains `setup: false` in the real app
runtime/src/server/routes.ts               API_PREFIXES + 'setup'; health.setup
runtime/ui/src/api/types.ts                Health.setup?, vault: string | null
runtime/ui/src/v2/SetupRequired.tsx (+test) placeholder page
runtime/ui/src/v2/Shell.tsx (+test)        renders SetupRequired when health.setup
CHANGELOG.md, docs/roadmap.md, package.json (content:manifest script)
```

---

### Task 1: Content hashing that agrees with the Python

**Files:** Create `runtime/src/content/hash.ts`, `runtime/src/content/hash.test.ts`.

- [ ] Write the failing test: `groupHash(join(root,'knowledge/law/corporate'))` equals `.content-versions.json['law/corporate'].hash`; same for `practice-seed/standards`; `stripFrontmatter` on a file with and without frontmatter; `bodyHash` stable.
- [ ] Implement `stripFrontmatter(text)` with the exact regex, `bodyHash(text)`, `groupHash(dir)` (top-level `*.md`, sorted, `--- name ---\n` + body).
- [ ] Run `bun test runtime/src/content/hash.test.ts` → PASS. Commit `runtime: content hashing that agrees with bump_content_versions.py`.

### Task 2: Content source + generated manifest

**Files:** Create `source.ts`, `repo.ts`, `generate.ts`, `manifest.ts` (generated), tests; `scripts/gen_content_manifest.ts`; package.json `content:manifest`.

- [ ] Test: `repoContentSource(repoRoot).list('knowledge/law')` has 196 files and no `FRONTMATTER.md`/`frontmatter-policy.json`; `read('skills/counsel/SKILL.md')` starts with `---`; `has` false for `../x`; generator output for a temp tree round-trips through `import`; `MANIFEST` in the repo matches a fresh generation (regeneration guard).
- [ ] Implement; `generate.ts --embedded <out>` also emits an `embedded.ts` with `import … with { type: 'file' }` lines (not wired; documented seam `contentSourceFor({ compiled })`).
- [ ] Run tests, `bun run content:manifest`, commit `runtime: content source over the shipped knowledge, with a generated manifest`.

### Task 3: Prompt and primitives read through the source

**Files:** Modify `runtime/src/loop/prompt.ts`, `primitives.ts`; `counsel-loop.ts` passes `deps.content` when present.

- [ ] Test: `assembleSystemPrompt({ content: fakeSource, … })` uses the source's `skills/counsel/SKILL.md`; `readPrimitiveTool(fakeSource)` lists and reads from the source; existing tests unchanged.
- [ ] Implement additive options; default path builds `repoContentSource(pluginRoot, { readFile })`.
- [ ] Run `bun run test` → green. Commit `runtime: prompt and primitives load the shipped content through the content source`.

### Task 4: Setup plan + profile templates

**Files:** Create `runtime/src/setup/plan.ts`, `plan.test.ts`.

- [ ] Test: `SetupPlan.parse` rejects a relative vault, an unknown role, an empty name; `isSaasInHouse` true for role in-house + "SaaS"/"software", false otherwise; `profileFor(plan)` renders the tuned vs general template with the identity filled.
- [ ] Implement with the two literal templates from `skills/setup/SKILL.md`.
- [ ] Commit `runtime: setup plan and the two Express profile templates`.

### Task 5: runSetup

**Files:** Create `runtime/src/setup/run.ts`, `run.test.ts`.

- [ ] Tests (temp home + temp vault, repo content source): fresh run writes the counts (196 law, 25 standards, 36 methods, 22 library, 1 reference, profile, patterns, matters/, entities/, .gitignore, config.md marker lines, pointer file, `.counsel/content-state.json` with hashes); rerun is a no-op (`skipped` = written count, no file mtime changes); adoption of a pre-existing marked root with a user-edited profile keeps the profile; refuses a path inside `pluginRoot`, a non-writable parent, an unmarked existing `config.md`; git initialized when available (`.git/HEAD`), `git: 'unavailable'` when `which` says no.
- [ ] Implement with injectable `git` runner and `now`.
- [ ] Commit `runtime: runSetup — seed a vault the way the setup skill does, idempotently`.

### Task 6: `counsel-os init`

**Files:** Create `runtime/src/setup/init.ts`, `init.test.ts`; modify `runtime/src/cli.ts`.

- [ ] Tests: `parseInitArgs` maps flags to a plan with the default vault `~/Documents/Counsel OS`; `--yes` without `--name` fails with a sentence; subprocess `bun runtime/src/cli.ts init --yes --vault <tmp> --name … --org … --role solo --jurisdiction … --practice …` with `COUNSEL_OS_HOME=<tmp>` exits 0 and seeds.
- [ ] Implement prompts with `node:readline` when not `--yes`.
- [ ] Commit `runtime: counsel-os init`.

### Task 7: Machine probes

**Files:** Create `runtime/src/setup/detect.ts`, `detect.test.ts`; export `findMarkedRoots` from `vault/resolve-root.ts`.

- [ ] Tests: `detectLocations` on a temp HOME with a planted `.obsidian` dir, a marked root, and nothing at the default path → three candidates with kinds `obsidian-vault`, `existing-root`, `new` (default preselected); `probeProviders` with injected `which`/`exists`/`fetch` → claude installed+signed-in, codex not installed, ollama running with 3 models.
- [ ] Implement (read-only; 1.5 s Ollama timeout; no model calls).
- [ ] Commit `runtime: setup probes — vault locations and reachable providers`.

### Task 8: Setup mode in serve

**Files:** Create `runtime/src/server/setup-routes.ts`, `setup-routes.test.ts`; modify `serve.ts`, `routes.ts`, `serve.test.ts`, `routes.test.ts`.

- [ ] Tests: setup app answers `/health` `{ setup: true, vault: null, … }`, 409 for `/threads`, `/vault/list`, `/settings`, 401 without token, static still served; `GET /setup/detect`, `GET /setup/providers`; `POST /setup` bad body 400, refusal 400, success 200 then the SAME server answers `/health` with `setup: false` and `/vault/list` 200 and `runtime.json` names the vault; real app's `/health` reports `setup: false`; `API_PREFIXES` includes `setup`; `startServer` with no root and no `--vault` starts in setup mode instead of exiting (multiple roots still exit 2).
- [ ] Implement: `resolveVaultOrSetup`, `createSetupApp`, `startServer` handler swap, `runtime.json` rewrite on switch.
- [ ] Commit `runtime: serve starts in setup mode when no legal root exists; the setup API`.

### Task 9: UI placeholder

**Files:** Modify `runtime/ui/src/api/types.ts`, `Shell.tsx`, `Shell.test.tsx`; create `v2/SetupRequired.tsx`, `SetupRequired.test.tsx`; `styles.css`.

- [ ] Test: health with `setup: true` renders "Set up counsel-os." with the `init` command and no rail; "check again" refetches health; `setup: false` renders Home as before.
- [ ] Implement; Shell skips thread/index/matter loads in setup mode.
- [ ] Commit `ui: a setup-required page while the runtime has no vault`.

### Task 10: Docs

- [ ] CHANGELOG `Unreleased` entry; roadmap §9 note; `bun run test`, `bun run ui:test`, both typechecks; push; PR.
