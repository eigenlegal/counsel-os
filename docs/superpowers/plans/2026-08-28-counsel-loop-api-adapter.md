# Counsel Loop + HTTP/SSE API + Plugin Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent threads, the counsel loop with the real methodology prompt and the `remember` gate, a local HTTP/SSE server (`counsel-os serve`), a providers registry with retry, and a plugin adapter that uses the server when present.

**Architecture:** Threads live under `.counsel/threads/` in the vault (model-unwritable). A step resolves a provider, resumes the vendor session when one exists (Claude `resume`, Codex `resumeThread` from a persistent per-thread isolated home) or replays the windowed log (direct tier), streams `StepEvent`s, and appends them to the thread. The server exposes threads/steps/approve/vault over loopback with a bearer token and writes `~/.counsel-os/runtime.json` for the plugin adapter to find.

**Tech Stack:** Bun 1.3.x, TypeScript, `bun test`, zod 4, `@anthropic-ai/claude-agent-sdk` 0.3.x, `@openai/codex-sdk` 0.150.x, `ai` 7.x, `@ai-sdk/openai-compatible` (new), existing `runtime/` from PR #21.

**Spec:** `docs/superpowers/specs/2026-08-28-counsel-loop-api-adapter-design.md` (parent: `2026-08-28-runtime-and-web-ui-design.md`)

## Global Constraints

- Providers yield `StepEvent`s and never throw. Harnesses stay restricted to the runtime's tools (do not loosen anything in `buildQueryOptions` / `buildCodexConfig`).
- Threads, proposals, and run logs live under `.counsel/` and are written only by the runtime, never by a model tool.
- `vault_write` refuses knowledge-system paths (`practice/**`, `memory/**`, `law/**`, `{entities_path}/**`); those go through `propose_update` + approval. `{matters_path}/**` stays directly writable.
- Server binds `127.0.0.1` only; every route except none requires `Authorization: Bearer <token>`; `runtime.json` is mode 0600 and removed on exit.
- SSE never drops a connection without a terminal event (`done` or `error`).
- Markdown under `skills/`, `primitives/`, `knowledge/` is unchanged except the one adapter paragraph in `skills/counsel/SKILL.md`.
- Imports: only `ai`, `@ai-sdk/*`, `ai-sdk-ollama` for models. Tests beside source. Commit messages `runtime: <what>` (adapter task: `plugin: <what>`).
- Live model calls only where a step says so (they cost subscription credit).

---

## File structure

```
runtime/src/
  core/types.ts               + StepRequest.session, done.sessionId (modify)
  providers/
    claude-harness.ts         + resume, capture session_id from init (modify)
    codex-harness.ts          + resumeThread, persistent home option, capture thread_id (modify)
    registry.ts               built-ins + ~/.counsel-os/providers.yaml → providers + router
    registry.test.ts
    retry.ts                  withRetry(provider)
    retry.test.ts
    direct.ts                 + openai-compatible/* (modify)
  vault/
    resolve-root.ts           port of scripts/resolve_legal_root.sh
    resolve-root.test.ts
    knowledge-paths.ts        isKnowledgePath(path, cfg)
  threads/
    store.ts, store.test.ts   ThreadStore
    window.ts, window.test.ts history windowing
  loop/
    prompt.ts, prompt.test.ts assembleSystemPrompt
    primitives.ts             read_primitive tool
    proposals.ts, proposals.test.ts
    counsel-loop.ts, counsel-loop.test.ts   runStep
    run-log.ts                runs/<runId>.log.jsonl
  tools/builtin.ts            + script tools (modify) 
  server/
    auth.ts, sse.ts, sse.test.ts, routes.ts, routes.test.ts, serve.ts
  cli.ts                      + `serve` command (modify)
scripts/runtime_step.sh
skills/counsel/SKILL.md       + adapter paragraph (modify)
```

---

### Task 1: Provider session hook (Claude resume, Codex resumeThread + persistent home)

**Files:**
- Modify: `runtime/src/core/types.ts`
- Modify: `runtime/src/providers/claude-harness.ts`, `runtime/src/providers/claude-harness.test.ts`
- Modify: `runtime/src/providers/codex-harness.ts`, `runtime/src/providers/codex-harness.test.ts`

**Interfaces:**
- Consumes: existing `StepRequest`, `StepEvent`, `buildQueryOptions`, `buildThreadOptions`, `prepareIsolatedHome`, `cleanupIsolatedHome`, `mapClaudeMessage`, `mapCodexEvent`.
- Produces: `StepRequest.session?: { id?: string }`; `StepEvent` `done` gains `sessionId?: string`; `mapClaudeMessage` yields `{ type: 'session', id }` for the `system/init` message; `CodexHarnessProvider` constructor gains `homeDir?: string` (persistent isolated home; when set, `run()` neither creates nor removes it); `mapCodexEvent` yields `{ type: 'session', id }` for `thread.started`. New `StepEvent` variant: `{ type: 'session'; id: string }` (internal; the loop stores it and does not forward it to clients).

- [ ] **Step 1: Types.** In `runtime/src/core/types.ts` add to `StepRequest`: `session?: { id?: string };` and to the `StepEvent` union: `| { type: 'session'; id: string }`. Extend `done`: `| { type: 'done'; output: unknown; usage: Usage; sessionId?: string }`.

- [ ] **Step 2: Failing tests (Claude).** Append to `claude-harness.test.ts`:
```ts
describe('sessions', () => {
  test('system/init → session event with the session id', () => {
    expect(mapClaudeMessage({ type: 'system', subtype: 'init', session_id: 'sess-1', cwd: '/x' })).toEqual([{ type: 'session', id: 'sess-1' }]);
  });
  test('buildQueryOptions passes resume when a session id is given, omits it otherwise', () => {
    const base = { tenant: 'default', system: 's', messages: [], tools: [] };
    expect(buildQueryOptions({ ...base, session: { id: 'sess-1' } }, 'm', {}, '/tmp/x', { PATH: '/p', HOME: '/h', USER: 'u' }).resume).toBe('sess-1');
    expect(buildQueryOptions(base, 'm', {}, '/tmp/x', { PATH: '/p', HOME: '/h', USER: 'u' }).resume).toBeUndefined();
  });
});
```
Run: `bun test runtime/src/providers/claude-harness.test.ts` → FAIL.

- [ ] **Step 3: Implement (Claude).** In `mapClaudeMessage`, before the `assistant|user` branch: `if (msg.type === 'system' && msg.subtype === 'init' && typeof msg.session_id === 'string') return [{ type: 'session', id: msg.session_id }];`. In `buildQueryOptions` add `...(req.session?.id ? { resume: req.session.id } : {})`. In `run()`, when a `session` event is mapped, remember it in a local `sessionId` and, when yielding `done`, spread `sessionId` in: replace the inner loop with
```ts
let sessionId: string | undefined;
for await (const msg of stream) {
  for (const ev of mapClaudeMessage(msg, req.outputSchema)) {
    if (ev.type === 'session') { sessionId = ev.id; yield ev; continue; }
    yield ev.type === 'done' && sessionId ? { ...ev, sessionId } : ev;
  }
}
```
Run the test → PASS. Note: when `resume` is set, the loop sends only the new user message as `prompt` (the caller decides; see Task 6).

- [ ] **Step 4: Failing tests (Codex).** Append to `codex-harness.test.ts`:
```ts
describe('sessions', () => {
  test('thread.started → session event with the thread id', () => {
    expect(mapCodexEvent({ type: 'thread.started', thread_id: 'th-1' })).toEqual([{ type: 'session', id: 'th-1' }]);
  });
  test('a persistent homeDir is used as CODEX_HOME and is not removed by run()', async () => {
    const home = mkdtempSync(join(tmpdir(), 'persist-home-'));
    const p = new CodexHarnessProvider({ model: 'm', vaultRoot: '/v', homeDir: home });
    expect(p.homeDir).toBe(home);
    // run() is not executed here (live); the contract is asserted via the exported helper:
    expect(resolveCodexHome({ homeDir: home, realHome: '/real' })).toEqual({ isolatedHome: home, ephemeral: false });
    expect(resolveCodexHome({ realHome: '/real' }).ephemeral).toBe(true);
  });
});
```
(import `mkdtempSync`, `tmpdir`, `join`, `CodexHarnessProvider`, `resolveCodexHome`.) Run → FAIL.

- [ ] **Step 5: Implement (Codex).** In `mapCodexEvent` add: `if (ev.type === 'thread.started' && typeof ev.thread_id === 'string') return [{ type: 'session', id: ev.thread_id }];`. Add and export:
```ts
export function resolveCodexHome(opts: { homeDir?: string; realHome: string }): { isolatedHome: string; ephemeral: boolean } {
  if (opts.homeDir) {
    if (opts.homeDir === opts.realHome) throw new Error('homeDir must not be the real CODEX_HOME');
    mkdirSync(opts.homeDir, { recursive: true, mode: 0o700 });
    const authSrc = join(opts.realHome, 'auth.json');
    if (existsSync(authSrc) && !existsSync(join(opts.homeDir, 'auth.json'))) copyFileSync(authSrc, join(opts.homeDir, 'auth.json'));
    return { isolatedHome: opts.homeDir, ephemeral: false };
  }
  return { isolatedHome: prepareIsolatedHome(opts.realHome), ephemeral: true };
}
```
Constructor: `constructor(private readonly opts: { model: string; vaultRoot: string; id?: string; homeDir?: string })` with `readonly homeDir = opts.homeDir`. In `run()`: `const { isolatedHome, ephemeral } = resolveCodexHome({ homeDir: this.opts.homeDir, realHome })` inside the try; thread = `req.session?.id ? codex.resumeThread(req.session.id, buildThreadOptions(...)) : codex.startThread(buildThreadOptions(...))`; track `sessionId` from `session` events and spread into `done` as in Claude; in `finally`, `if (ephemeral && isolatedHome) cleanupIsolatedHome(isolatedHome)`. Run tests → PASS. `bun run typecheck:runtime` clean.

- [ ] **Step 6: Live spike (two subscription calls, authorized).** Temp vault with `acme.md`. Claude: run the CLI step "Remember the word pineapple." then a second `step` passing the captured session id — add `--session <id>` to `cli.ts` `step` (parse option, pass `session: { id }`) — asking "What word did I ask you to remember?"; expect "pineapple". Codex: same, with `--codex-home $(mktemp -d)` option threaded to `homeDir`. Record both transcripts in `docs/superpowers/spikes/2026-08-28-runtime-spikes.md` under a new "Step 2 — resume" section. If Claude resume fails because the temp cwd differs, try `--session` again with the same cwd (add a `--cwd` debug option) and record which is needed.

- [ ] **Step 7: Commit.** `git commit -m "runtime: provider session hook — Claude resume, Codex resumeThread with persistent home"`

---

### Task 2: Providers registry, openai-compatible, retry

**Files:**
- Create: `runtime/src/providers/registry.ts`, `registry.test.ts`, `retry.ts`, `retry.test.ts`
- Modify: `runtime/src/providers/direct.ts`, `runtime/src/providers/index.ts`
- Modify: `package.json` (`bun add @ai-sdk/openai-compatible`)

**Interfaces:**
- Produces: `loadRegistry(opts: { file?: string; vaultRoot: string; env?: NodeJS.ProcessEnv }): { providers: ModelProvider[]; router: Router; defaultId: string }`; `RegistryFile` zod schema; `withRetry(p: ModelProvider, opts?: { tries?: number; baseMs?: number; sleep?: (ms)=>Promise<void> }): ModelProvider`; `directProviderFromId(id, reg?: { baseURL?: string; apiKeyEnv?: string; capabilities?: Partial<Capabilities> })`.

- [ ] **Step 1: Failing registry test.**
```ts
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { loadRegistry, BUILTIN_DEFAULT } from './registry';

describe('loadRegistry', () => {
  test('no file → built-ins with the built-in default', () => {
    const r = loadRegistry({ file: '/nonexistent/providers.yaml', vaultRoot: '/v' });
    expect(r.defaultId).toBe(BUILTIN_DEFAULT);
    expect(r.providers.map(p => p.id)).toContain('claude-sub/claude-opus-5');
    expect(r.router.resolve().id).toBe(BUILTIN_DEFAULT);
  });
  test('file adds openai-compatible providers and overrides default + tasks', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `default: openai-compatible/groq\nproviders:\n  - id: openai-compatible/groq\n    baseURL: https://api.groq.com/openai/v1\n    apiKeyEnv: GROQ_API_KEY\n    capabilities: { contextTokens: 128000 }\ntasks:\n  classify: { prefer: openai-compatible/groq }\n`);
    const r = loadRegistry({ file: f, vaultRoot: '/v', env: { GROQ_API_KEY: 'k' } });
    const groq = r.providers.find(p => p.id === 'openai-compatible/groq')!;
    expect(groq.capabilities.contextTokens).toBe(128000);
    expect(groq.capabilities.auth).toBe('apikey');
    expect(r.router.resolve('classify').id).toBe('openai-compatible/groq');
  });
  test('unknown id prefix fails at load time', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `providers:\n  - id: nope/x\n`);
    expect(() => loadRegistry({ file: f, vaultRoot: '/v' })).toThrow(/unknown provider/);
  });
});
```
Run → FAIL.

- [ ] **Step 2: Implement.** `bun add @ai-sdk/openai-compatible`. In `direct.ts` extend `directProviderFromId(id, reg = {})`: if vendor is `openai-compatible`, `const model = createOpenAICompatible({ name, baseURL: reg.baseURL!, apiKey: reg.apiKey })(name)` (import `createOpenAICompatible` from `@ai-sdk/openai-compatible`; require `baseURL` else throw `unknown provider`); merge `reg.capabilities` over the vendor's defaults. `registry.ts`:
```ts
import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os'; import { join } from 'node:path';
import type { Capabilities, ModelProvider } from '../core/types';
import { Router, parseRouterConfig, type RouterConfig } from '../router/router';
import { buildProviders } from './index';
import { directProviderFromId } from './direct';

export const BUILTIN_DEFAULT = 'claude-sub/claude-opus-5';
export const BUILTIN_IDS = ['claude-sub/claude-opus-5', 'codex-sub/gpt-5.6-terra', 'ollama/gemma4:e4b'];
export const DEFAULT_REGISTRY_FILE = join(homedir(), '.counsel-os', 'providers.yaml');

const Entry = z.object({ id: z.string(), baseURL: z.string().optional(), apiKeyEnv: z.string().optional(),
  capabilities: z.object({ tools: z.boolean(), caching: z.boolean(), thinking: z.boolean(), contextTokens: z.number(), auth: z.enum(['subscription','apikey','local']) }).partial().optional() });
export const RegistryFile = z.object({ default: z.string().optional(), providers: z.array(Entry).optional(), tasks: z.record(z.string(), z.any()).optional() });

export function loadRegistry(opts: { file?: string; vaultRoot: string; env?: NodeJS.ProcessEnv }) {
  const file = opts.file ?? DEFAULT_REGISTRY_FILE; const env = opts.env ?? process.env;
  const raw = existsSync(file) ? RegistryFile.parse(Bun.YAML.parse(readFileSync(file, 'utf8'))) : {};
  const providers: ModelProvider[] = buildProviders({ ids: BUILTIN_IDS, vaultRoot: opts.vaultRoot });
  for (const e of raw.providers ?? []) {
    const [vendor] = e.id.split('/');
    if (vendor === 'claude-sub' || vendor === 'codex-sub') { providers.push(...buildProviders({ ids: [e.id], vaultRoot: opts.vaultRoot })); continue; }
    if (!['anthropic','openai','ollama','openai-compatible'].includes(vendor ?? '')) throw new Error(`unknown provider id prefix: ${e.id}`);
    providers.push(directProviderFromId(e.id, { baseURL: e.baseURL, apiKey: e.apiKeyEnv ? env[e.apiKeyEnv] : undefined, capabilities: e.capabilities as Partial<Capabilities> }));
  }
  const defaultId = raw.default ?? BUILTIN_DEFAULT;
  const cfg: RouterConfig = { default: defaultId, tasks: raw.tasks };
  return { providers, router: new Router(cfg, providers), defaultId };
}
```
(`buildProviders` must not throw for `codex-sub/gpt-5.6-terra` without a live login — it does not; construction is lazy.) Run → PASS.

- [ ] **Step 3: Failing retry test.**
```ts
import { describe, expect, test } from 'bun:test';
import { withRetry } from './retry';
import type { ModelProvider, StepEvent } from '../core/types';
function flaky(fails: number, msg: string): ModelProvider & { calls: number } {
  const p = { id: 'x/y', kind: 'direct' as const, calls: 0, capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1, auth: 'apikey' as const },
    async *run(): AsyncIterable<StepEvent> { p.calls++; if (p.calls <= fails) { yield { type: 'error', message: msg }; return; } yield { type: 'done', output: 'ok', usage: { inputTokens: 0, outputTokens: 0 } }; } };
  return p;
}
async function last(it: AsyncIterable<StepEvent>) { let e: StepEvent | undefined; for await (const x of it) e = x; return e!; }
const req = { tenant: 'default', system: '', messages: [], tools: [] };
describe('withRetry', () => {
  test('retries a 429/5xx-shaped error and succeeds', async () => {
    const p = flaky(2, 'HTTP 429 rate limited'); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    expect((await last(r.run(req))).type).toBe('done'); expect(p.calls).toBe(3);
  });
  test('does not retry other errors', async () => {
    const p = flaky(5, 'structured output failed validation'); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    expect((await last(r.run(req))).type).toBe('error'); expect(p.calls).toBe(1);
  });
  test('gives up after tries and yields the last error', async () => {
    const p = flaky(5, 'HTTP 503'); const r = withRetry(p, { tries: 3, sleep: async () => {} });
    expect((await last(r.run(req))).type).toBe('error'); expect(p.calls).toBe(3);
  });
});
```
Run → FAIL.

- [ ] **Step 4: Implement `retry.ts`.**
```ts
import type { ModelProvider, StepEvent, StepRequest } from '../core/types';
const RETRYABLE = /\b(429|5\d\d|rate limit|overloaded|ECONNRESET|ETIMEDOUT)\b/i;
export function withRetry(p: ModelProvider, opts: { tries?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {}): ModelProvider {
  const tries = opts.tries ?? 3, baseMs = opts.baseMs ?? 500, sleep = opts.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  return { id: p.id, kind: p.kind, capabilities: p.capabilities,
    async *run(req: StepRequest): AsyncIterable<StepEvent> {
      for (let attempt = 1; ; attempt++) {
        const buffered: StepEvent[] = []; let failed: StepEvent | undefined;
        for await (const ev of p.run(req)) { if (ev.type === 'error') { failed = ev; break; } buffered.push(ev); if (buffered.length > 1 || ev.type !== 'session') break; }
        // Retry only if the error arrived before any user-visible output (so nothing is duplicated).
        if (failed && attempt < tries && RETRYABLE.test(failed.message) && buffered.every(e => e.type === 'session')) { await sleep(baseMs * 2 ** (attempt - 1)); continue; }
        for (const e of buffered) yield e;
        if (failed) { yield failed; return; }
        // Not failed and not finished: continue draining the same iterator is impossible after break —
        // so re-run without buffering when the first event was not an error:
        for await (const ev of p.run(req)) yield ev; return;
      }
    } };
}
```
Hmm — that double-runs on success. Replace the body with a single pass that buffers only until the first non-`session` event:
```ts
      for (let attempt = 1; ; attempt++) {
        const it = p.run(req)[Symbol.asyncIterator]();
        const head: StepEvent[] = []; let first = await it.next();
        while (!first.done && first.value.type === 'session') { head.push(first.value); first = await it.next(); }
        if (!first.done && first.value.type === 'error' && attempt < tries && RETRYABLE.test(first.value.message)) { await sleep(baseMs * 2 ** (attempt - 1)); continue; }
        for (const e of head) yield e;
        if (first.done) return;
        yield first.value;
        if (first.value.type === 'error') return;
        for (let n = await it.next(); !n.done; n = await it.next()) yield n.value;
        return;
      }
```
Use this second version only. Run → PASS. Wire: `loadRegistry` wraps every `kind === 'direct'` provider with `withRetry`.

- [ ] **Step 5: Commit.** `runtime: providers registry (providers.yaml, openai-compatible) and retry wrapper`

---

### Task 3: Vault root resolution and knowledge paths

**Files:**
- Create: `runtime/src/vault/resolve-root.ts`, `resolve-root.test.ts`, `knowledge-paths.ts`, `knowledge-paths.test.ts`

**Interfaces:**
- Produces: `resolveLegalRoot(opts: { env?: NodeJS.ProcessEnv; cwd?: string; home?: string; conventional?: string[] }): { ok: true; root: string } | { ok: false; code: 1 | 2; candidates: string[] }` — same search order as `scripts/resolve_legal_root.sh` (read the script first; a "marked root" is a dir whose `config.md` contains both `counsel-os-config: true` and a `legal_root:` line). `readVaultConfig(root): { entitiesPath: string; mattersPath: string }` (defaults `entities`, `matters`; overrides `entities_path:` / `matters_path:` in `config.md` frontmatter). `isKnowledgePath(path, cfg): boolean` true for `practice/`, `memory/`, `law/`, `${entitiesPath}/` prefixes.

- [ ] **Step 1: Failing tests.** Build fixture dirs with `mkdtempSync`: (a) `COUNSEL_OS_LEGAL_ROOT` set to a marked dir → ok; set to an unmarked dir → `{ok:false, code:1}`; (b) pointer file `<home>/.counsel-os/legal-root` → ok; (c) cwd three levels below a marked root → ok; four levels → not found; (d) two marked roots in the conventional list → `{ok:false, code:2, candidates:[both]}`. Plus `readVaultConfig` with and without overrides, and `isKnowledgePath('practice/standards/x.md')` true / `'matters/acme/notes.md'` false / `'clients/acme.md'` true when `entitiesPath: 'clients'`.

- [ ] **Step 2: Implement** by transcribing the script's algorithm (read `scripts/resolve_legal_root.sh` in full first; keep its conventional-paths list verbatim and its depth limits). Sync `readFileSync`; no shell.

- [ ] **Step 3: Run, typecheck, commit.** `runtime: vault root resolution (port of resolve_legal_root.sh) and knowledge-path classifier`

---

### Task 4: ThreadStore and history window

**Files:**
- Create: `runtime/src/threads/store.ts`, `store.test.ts`, `window.ts`, `window.test.ts`

**Interfaces:**
- Consumes: `VaultStore` — but threads are under `.counsel/`, which `FsVaultStore.abs()` rejects. The store therefore takes the vault **root path** and uses `node:fs` directly (it is runtime-owned, not model-reachable). Codex per-thread homes live at `join(homedir(), '.counsel-os', 'codex', id)`; `remove()` deletes that dir too (`opts.codexHomeRoot` injectable for tests).
- Produces: `ThreadHeader`, `ThreadEvent` (as in spec §4.1), `class ThreadStore { constructor(root: string, opts?: { codexHomeRoot?: string }); create(tenant, init); get(tenant, id); list(tenant); append(tenant, id, ev); setSession(tenant, id, providerId, sessionId); updateProposal(tenant, id, proposalId, status); remove(tenant, id); codexHomeFor(id): string }`. Ids: `crypto.randomUUID()`. Header file `<root>/.counsel/threads/<tenant>/<id>.json`, log `<id>.jsonl`. `window(events, budgetTokens, estimate = s => Math.ceil(s.length / 4)): Message[]` — converts `user`/`text` events to `Message`s (consecutive `text` events merged into one assistant message; tool events skipped), then drops oldest pairs until under budget, always keeping the last user message.

- [ ] **Step 1: Failing tests** covering: create → list → get (header + empty events); append three events → get returns them in order; setSession persists into the header; updateProposal flips status of the matching `proposal` event (rewrite the log); remove deletes both files and the codex home dir; ids of two creates differ; `window` merges consecutive text, drops oldest first, keeps the last user message even when over budget.

- [ ] **Step 2: Implement; run; typecheck; commit.** `runtime: ThreadStore under .counsel/threads and history windowing`

---

### Task 5: Prompt assembly, `read_primitive`, proposals, builtin script tools

**Files:**
- Create: `runtime/src/loop/prompt.ts`, `prompt.test.ts`, `primitives.ts`, `proposals.ts`, `proposals.test.ts`
- Modify: `runtime/src/tools/builtin.ts`, `builtin.test.ts`; `runtime/src/vault/vault-tools.ts`, `vault-tools.test.ts`

**Interfaces:**
- Produces:
  - `assembleSystemPrompt(opts: { pluginRoot: string; vaultRoot: string; matterPath?: string; platform: Platform; toolNames: string[] }): string` = `HOST_PREAMBLE(toolNames, platform)` + body of `skills/counsel/SKILL.md` (frontmatter removed) + `\n\n## Practice profile\n` + `practice/profile.md` if present + `\n\n## Current matter\n` + matter file if present. Pure given file contents (read via injected `readFile = readFileSync`).
  - `HOST_PREAMBLE`: states the host is the counsel-os runtime; `{legal_root}` is already resolved (do not run `resolve_legal_root.sh`); where the methodology says `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/X.py" …` call tool `X` with the same arguments as named fields; where it says read `primitives/{name}.md`, call `read_primitive {name}`; knowledge-system writes go through `propose_update`, matter writes through `vault_write`; list the tools available on this platform and which are unavailable and why.
  - `readPrimitiveTool(pluginRoot): ToolDef<{ name: string }, string>` — allowlist = files in `<pluginRoot>/primitives/*.md`; unknown name → error.
  - `proposeUpdateTool(store: ThreadStore, vault: VaultStore, threadId, tenant): ToolDef<{ path; content; rationale }, { proposalId }>` — appends a `proposal` event with `expectedVersion = await vault.version(tenant, path)`.
  - `guardedVaultTools(vault, cfg): ToolDef[]` — same as `vaultTools` but `vault_write` returns an error result `use propose_update for knowledge-system paths` when `isKnowledgePath(path, cfg)`.
  - `applyProposal(store, vault, tenant, threadId, proposalId, decision): Promise<{ status; version?; conflict?: { expected; actual } }>`.
  - `builtinTools({ vaultRoot, repoRoot })` adds `extract_redlines {docx}`, `check_document {docx}`, `clean_format {input, output}`, `apply_redlines {original, edits, output, track?}`, `word_compare {original, modified, author, output}` (macOS only), each via `pythonScriptTool` (`word_compare` via a bash wrapper with the same `Tool` shape: reuse `pythonScriptTool`'s spawn logic by adding `command?: string[]` option defaulting to `['python3', script]`).

- [ ] **Step 1: Failing tests:** snapshot of `assembleSystemPrompt` with a fixture plugin root (tiny SKILL.md with frontmatter, one primitive) and fixture vault (profile + matter) — assert frontmatter absent, preamble present, profile and matter sections present, `read_primitive` mentioned; changing the fixture primitive does not change the output. `readPrimitiveTool`: known name returns content; unknown → error via `runToolDef`. Proposals: `vault_write` to `practice/standards/x.md` → isError with /propose_update/; `vault_write` to `matters/a.md` → ok; `propose_update` appends a `proposal` event with `expectedVersion`; `applyProposal(approve)` writes and returns version; approve after an external edit → conflict; reject → status rejected, nothing written. `builtin.test.ts`: five new tools present with the expected platform sets; `word_compare` only macOS.

- [ ] **Step 2: Implement; run; typecheck; commit.** `runtime: prompt assembly from SKILL.md + profile + matter, read_primitive, propose_update gate, script tools`

---

### Task 6: Counsel loop and run logs

**Files:**
- Create: `runtime/src/loop/counsel-loop.ts`, `counsel-loop.test.ts`, `run-log.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `runStep(deps: { tenant; vaultRoot; pluginRoot; vault: VaultStore; store: ThreadStore; providers: ModelProvider[]; router: Router; platform?: Platform }, opts: { threadId; message; task?; providerId?; outputSchema? }): AsyncIterable<StepEvent & { runId: string }>` — behavior per spec §4.3; `session` events are consumed (stored via `setSession`) and not yielded; `text` events are appended to the log as-is (coalescing is the server's job); `done` appended with `provider`, `runId`. `writeRunLog(vaultRoot, tenant, runId, entries)` → `<root>/.counsel/runs/<tenant>/<runId>.log.jsonl` with `{ at, provider, task, inputTokens, outputTokens, costUsd, durationMs, toolCalls: [{name, ms, isError}] }`.
- Codex providers get `homeDir: store.codexHomeFor(threadId)` — construct per-thread Codex providers via a `providerFor(id, threadId)` helper that clones a `codex-sub/*` registry entry with `homeDir` set (add `withHome(dir)` method to `CodexHarnessProvider` returning a new instance).

- [ ] **Step 1: Failing tests** with `FakeModelProvider` and a temp vault/plugin fixture: (a) first step appends `user`, `step`, events, `done`; the request seen by the fake has `messages` from the window and no `session`; (b) a fake that yields `{type:'session', id:'s1'}` then `done` → header `sessions['fake/fake'] === 's1'` and the `session` event is not yielded to the caller; (c) second step on the same thread with that provider → request has `session.id === 's1'` and `messages` = only the new message; (d) a run log file exists with tokens and one tool call; (e) unknown thread → yields a single `error`; (f) router hard error (task requirement unsatisfiable) → single `error`, nothing appended except the `user` event.

(For (a)–(c) make `FakeModelProvider` record `lastRequest` — add a public field in `core/fake-provider.ts`.)

- [ ] **Step 2: Implement; run; typecheck; commit.** `runtime: counsel loop — threads, sessions, proposals, run logs`

---

### Task 7: Server (auth, SSE, routes, serve)

**Files:**
- Create: `runtime/src/server/auth.ts`, `sse.ts`, `sse.test.ts`, `routes.ts`, `routes.test.ts`, `serve.ts`
- Modify: `runtime/src/cli.ts` (add `serve [--port N] [--vault DIR]`)

**Interfaces:**
- `createApp(deps): (req: Request) => Promise<Response>` — a plain fetch handler (testable without a socket) implementing spec §4.5; `deps = { token, tenant, vaultRoot, pluginRoot, vault, store, providers, router, platform }`.
- `sseFromEvents(events: AsyncIterable<StepEvent>, opts?: { coalesceMs?: number; maxChars?: number }): Response` — `text/event-stream`; `text` deltas buffered and flushed at `coalesceMs` (default 50) or `maxChars` (200); every other event flushes the buffer first; the stream always ends with `done` or `error` (if the source ends without one, emit `error: "provider ended without a terminal event"`).
- `serve.ts`: resolve vault (`resolveLegalRoot` → 503-style exit with the script's messages on 1/2, `--vault` overrides), `loadRegistry`, pick a free port (default 7431, else OS-assigned), `Bun.serve({ hostname: '127.0.0.1', port, fetch: createApp(...) })`, write `~/.counsel-os/runtime.json` (`{ port, token, vault, pid, startedAt }`, mode 0600), remove on SIGINT/SIGTERM/exit, print one line `counsel-os runtime on http://127.0.0.1:<port> (vault: …)`.
- `pluginRoot` = repo root (`resolve(import.meta.dir, '../..')` from `server/`), or `COUNSEL_PLUGIN_ROOT` env override for installed-plugin layouts.

- [ ] **Step 1: Failing SSE test:** feed events `text 'a'`, `text 'b'`, `tool_call`, `text 'c'`, `done` with `coalesceMs: 0` (flush only on non-text) → parsed SSE frames are `text 'ab'`, `tool_call`, `text 'c'`, `done`; a source that ends early → last frame is `error`. Write a tiny `parseSse(text)` helper in the test.

- [ ] **Step 2: Failing routes test** via `createApp` with the fake provider and temp fixtures: 401 without/with wrong token; `GET /health` lists providers and default; `POST /threads` → 201 header; `GET /threads` lists it; `POST /threads/:id/steps` → `text/event-stream`, frames end with `done`, `x-run-id` header present; `GET /threads/:id` shows the appended events; `POST …/approve` on a pending proposal (seed via the fake's tool call to `propose_update`) → approved and the vault file written; 404 unknown thread; 422 unknown provider id; `GET /vault/read?path=../x` → 400.

- [ ] **Step 3: Implement** `auth.ts` (constant-time compare), `sse.ts`, `routes.ts` (hand-rolled router on `new URL(req.url).pathname` + method; JSON bodies parsed with zod schemas per route), `serve.ts`, and the `serve` subcommand in `cli.ts` (parse `--port`, `--vault`; call `serve.ts`'s exported `startServer(opts)` which returns `{ port, stop }`).

- [ ] **Step 4: Run all, typecheck; manual smoke:** `bun runtime/src/cli.ts serve --vault <temp marked vault>` in the background, `curl -H "Authorization: Bearer $(jq -r .token ~/.counsel-os/runtime.json)" localhost:<port>/health`, then a step with `--provider ollama/gemma4:e4b` via curl (`-N` to stream). Kill the server; confirm `runtime.json` is gone.

- [ ] **Step 5: Commit.** `runtime: local HTTP/SSE server (threads, steps, approve, vault) and \`counsel-os serve\``

---

### Task 8: Plugin adapter

**Files:**
- Create: `scripts/runtime_step.sh`, `scripts/runtime_step.test.ts` (Bun test that spawns the script against `createApp` served on a random port)
- Modify: `skills/counsel/SKILL.md` (one paragraph in the "How This System Works" section, before "The 5 Primitives")

**Interfaces:**
- `scripts/runtime_step.sh "<request>"`: exit 3 (silently) if `~/.counsel-os/runtime.json` missing, unreadable, or `curl -sf --max-time 1 /health` fails; otherwise thread id from `${TMPDIR:-/tmp}/counsel-os-thread-${CLAUDE_SESSION_ID:-$PPID}` (create via `POST /threads` if absent), `POST /threads/<id>/steps` with `curl -sN`, parse SSE lines with a small `awk`: print `text` payloads verbatim, print `→ tool <name>` lines for tool calls to stderr, print `⚠ <message>` and exit 1 on `error`, exit 0 on `done`. Dependencies: `curl`, `jq` (fall back to exit 3 if `jq` is missing — the skill then proceeds normally).

- [ ] **Step 1: Failing test:** start `createApp` with the fake provider on a random port and a temp `HOME` whose `.counsel-os/runtime.json` points at it; run the script with `HOME` set → stdout contains the fake's text, exit 0; with no `runtime.json` → exit 3 and empty stdout; with a dead port → exit 3.

- [ ] **Step 2: Write the script and the SKILL.md paragraph:**
> **Runtime hand-off (Claude Code only).** Before any other step, run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/runtime_step.sh" "<the user's request, verbatim>"`. Exit 0 means the local counsel-os runtime handled the request: relay its output to the user and stop. Exit 3 means no runtime is running: continue with this skill exactly as below. Exit 1 means the runtime hit an error: show the message and continue with this skill.

- [ ] **Step 3: Run, commit.** `plugin: hand off to the local runtime when it is running (scripts/runtime_step.sh)`

---

### Task 9: Live smokes and findings

**Files:**
- Modify: `docs/superpowers/spikes/2026-08-28-runtime-spikes.md` (append "Step 2 — server + resume")

- [ ] **Step 1:** With `counsel-os serve` on a temp marked vault (seed `config.md`, `practice/profile.md`, `matters/acme.md`, `practice/standards/nda.md`): (a) Claude: two steps on one thread; second must recall the first (resume). (b) Codex: same. (c) Ollama: one step that calls `vault_read`. (d) Any provider: ask it to update `practice/standards/nda.md` → expect a `proposal` event, not a write; approve via the API → file changed with the proposal content. Record transcripts (abridged), token usage, wall-clock, and any defect found. Authorized cost: ~4 subscription calls.

- [ ] **Step 2: Commit.** `runtime: step-2 live findings — resume, proposals, server`

---

## Self-review

**Spec coverage:** §4.1 threads → T4; §4.2 session hook → T1; §4.3 loop → T6; §4.4 proposals → T5/T7; §4.5 API → T7; §4.6 registry → T2; §4.7 adapter → T8; §5 errors → T2 (retry), T6 (f), T7 (SSE terminal guarantee, status codes); §6 tests → per task; resume spikes → T1 step 6, T9. Vault discovery port → T3.

**Placeholder scan:** Task 2 step 4 shows a rejected first draft explicitly followed by the version to use — implementers use the second block only. No TBDs.

**Type consistency:** `StepEvent` `session` variant defined in T1 and consumed in T2 (retry buffers it), T6 (stores it). `ThreadStore.codexHomeFor(id)` (T4) used in T6. `isKnowledgePath(path, cfg)` (T3) used in T5. `createApp(deps)` deps mirror `runStep` deps (T6) plus `token`.
