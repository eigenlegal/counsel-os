# Runtime Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `runtime/` — the three seams (`ModelProvider`, `VaultStore`, `Tools`), a router, two harness providers (Claude Agent SDK, Codex SDK) plus one direct provider (AI SDK), and a CLI that runs one counsel step — then answer the three spike questions.

**Architecture:** A `StepRequest` runs to completion through a `ModelProvider`. Harness providers hand the step to the vendor's agent loop and expose the runtime's tool registry to it over MCP (in-process for Claude, stdio for Codex). The direct provider runs the loop itself with the AI SDK. The vault is a filesystem adapter with content-hash versioning. Nothing in this plan builds the flow engine, the HTTP API, or the UI.

**Tech Stack:** Bun 1.3.13, TypeScript 6, `bun test`, zod, `@anthropic-ai/claude-agent-sdk`, `@openai/codex-sdk`, `ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai` + `ai-sdk-ollama`, `@modelcontextprotocol/sdk`.

**Spec:** `docs/superpowers/specs/2026-08-28-runtime-and-web-ui-design.md`

## Global Constraints

- Language: TypeScript on Bun. Python scripts stay as subprocess tools.
- AI SDK: import from `ai` and `@ai-sdk/*` only. Never import Gateway, Workflows, Sandbox, or AI Elements.
- Tenant ID is a parameter on every `VaultStore` and `Tools` call. Local passes `"default"`.
- Router: never a silent downgrade. Unsatisfied `require` is a hard error.
- Harness providers must be restricted to the runtime's tools only: no shell, no file access outside the vault.
- All new files live under `runtime/`. Tests sit beside source as `*.test.ts` (matches `browse/src`).
- Every vault write from a model goes through `VaultStore.write` — no direct `fs` calls in providers.
- Commit after every task. Commit messages: `runtime: <what>`.

---

## File structure

```
runtime/
  tsconfig.json
  src/
    core/
      types.ts            StepRequest, StepEvent, ToolDef, ModelProvider, VaultStore, Tool, errors
      fake-provider.ts    FakeModelProvider for tests
    vault/
      fs-store.ts         filesystem VaultStore with content-hash versions
      vault-tools.ts      vault_read / vault_write / vault_list / vault_search as ToolDefs
    tools/
      registry.ts         ToolRegistry: register, filter by platform, to ToolDef[]
      subprocess.ts       wrap a Python script as a Tool
    router/
      router.ts           parse config, resolve(task) → provider id
    mcp/
      bridge.ts           ToolDef[] → MCP tool handlers (shared by both harnesses)
      stdio.ts            executable: serve the registry over MCP stdio (for Codex)
    providers/
      claude-harness.ts   Claude Agent SDK provider
      codex-harness.ts    Codex SDK provider
      direct.ts           AI SDK provider
      index.ts            build providers from config
    cli.ts                `bun runtime/src/cli.ts step ...`
docs/superpowers/spikes/2026-08-28-runtime-spikes.md   spike findings
```

Root `package.json` gains `typecheck:runtime` and `test:runtime` scripts and the dependencies. `.github/workflows/ci.yml` runs the runtime typecheck.

---

### Task 1: Package scaffold and core types

**Files:**
- Create: `runtime/tsconfig.json`
- Create: `runtime/src/core/types.ts`
- Create: `runtime/src/core/types.test.ts`
- Modify: `package.json` (scripts + dependencies)
- Modify: `.github/workflows/ci.yml:26-30`

**Interfaces:**
- Produces: every type below. Later tasks import from `../core/types`.

- [ ] **Step 1: Add dependencies and scripts**

Run:
```bash
cd ~/Desktop/counsel-os
bun add zod @anthropic-ai/claude-agent-sdk @openai/codex-sdk ai @ai-sdk/anthropic @ai-sdk/openai ai-sdk-ollama @modelcontextprotocol/sdk
```

Edit `package.json` scripts — add:
```json
"typecheck:runtime": "tsc --noEmit -p runtime/tsconfig.json",
"test:runtime": "bun test runtime/src"
```

- [ ] **Step 2: Create `runtime/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["bun"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write the failing test**

`runtime/src/core/types.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { VaultConflictError, RouterError, isTerminal } from './types';

describe('core types', () => {
  test('errors carry a code', () => {
    expect(new VaultConflictError('a.md', 'v1', 'v2').code).toBe('vault_conflict');
    expect(new RouterError('no model').code).toBe('router');
  });

  test('isTerminal recognises the terminal event', () => {
    expect(isTerminal({ type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } })).toBe(true);
    expect(isTerminal({ type: 'text', text: 'hi' })).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `bun test runtime/src/core/types.test.ts`
Expected: FAIL — cannot resolve `./types`.

- [ ] **Step 5: Write `runtime/src/core/types.ts`**

```ts
import type { ZodType } from 'zod';

// ── Tenancy ───────────────────────────────────────────────────────────────
export type Tenant = string;
export const DEFAULT_TENANT: Tenant = 'default';

// ── Tools (the runtime's own tool definitions, exposed to every provider) ──
export interface ToolDef<I = unknown, O = unknown> {
  name: string;                 // snake_case, e.g. "vault_read"
  description: string;
  inputSchema: ZodType<I>;
  execute(input: I, ctx: ToolContext): Promise<O>;
}

export interface ToolContext {
  tenant: Tenant;
}

// ── Step: one model run to completion ─────────────────────────────────────
export type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };

export interface StepRequest {
  tenant: Tenant;
  system: string;
  messages: Message[];
  tools: ToolDef[];
  outputSchema?: ZodType<unknown>;   // when set, `done.output` is the parsed object
  maxTokens?: number;
  maxToolCalls?: number;             // default 20
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

export type StepEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; output: unknown; isError?: boolean }
  | { type: 'done'; output: unknown; usage: Usage }
  | { type: 'error'; message: string };

export function isTerminal(e: StepEvent): boolean {
  return e.type === 'done' || e.type === 'error';
}

// ── ModelProvider ─────────────────────────────────────────────────────────
export interface Capabilities {
  tools: boolean;
  caching: boolean;
  thinking: boolean;
  contextTokens: number;
  auth: 'subscription' | 'apikey' | 'local';
}

export interface ModelProvider {
  id: string;                        // "claude-sub/opus-5", "anthropic/claude-opus-5", "ollama/qwen3"
  kind: 'direct' | 'harness';
  capabilities: Capabilities;
  run(req: StepRequest): AsyncIterable<StepEvent>;
}

// ── VaultStore ────────────────────────────────────────────────────────────
export type Version = string;        // content hash

export interface Entry {
  path: string;
  kind: 'file' | 'dir';
}

export interface Hit {
  path: string;
  snippet: string;
  score: number;
}

export interface VaultStore {
  read(tenant: Tenant, path: string): Promise<string>;
  write(tenant: Tenant, path: string, content: string, opts?: { expectedVersion?: Version }): Promise<Version>;
  list(tenant: Tenant, dir: string): Promise<Entry[]>;
  search(tenant: Tenant, query: string): Promise<Hit[]>;
  history(tenant: Tenant, path: string): Promise<Version[]>;
  version(tenant: Tenant, path: string): Promise<Version | null>;
}

// ── Tools with platform gating (subprocess scripts, browse, docx) ─────────
export type Platform = 'macos' | 'linux' | 'windows' | 'hosted';

export interface Tool<I = unknown, O = unknown> extends ToolDef<I, O> {
  platforms: Set<Platform>;
}

export function currentPlatform(): Platform {
  switch (process.platform) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return 'linux';
  }
}

// ── Errors ────────────────────────────────────────────────────────────────
export class VaultConflictError extends Error {
  readonly code = 'vault_conflict';
  constructor(readonly path: string, readonly expected: Version, readonly actual: Version) {
    super(`vault conflict on ${path}: expected ${expected}, found ${actual}`);
  }
}

export class RouterError extends Error {
  readonly code = 'router';
}

export class ProviderError extends Error {
  readonly code = 'provider';
  constructor(readonly providerId: string, message: string) {
    super(`${providerId}: ${message}`);
  }
}
```

- [ ] **Step 6: Run the test and the typecheck**

Run: `bun test runtime/src/core/types.test.ts && bun run typecheck:runtime`
Expected: PASS, no type errors.

- [ ] **Step 7: Add the runtime typecheck to CI**

In `.github/workflows/ci.yml`, after the `Typecheck` step add:
```yaml
      - name: Typecheck runtime
        run: bun run typecheck:runtime
```
(`bun test` at the root already picks up `runtime/src/**/*.test.ts`.)

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock runtime/ .github/workflows/ci.yml
git commit -m "runtime: scaffold package and core types"
```

---

### Task 2: FakeModelProvider

**Files:**
- Create: `runtime/src/core/fake-provider.ts`
- Create: `runtime/src/core/fake-provider.test.ts`

**Interfaces:**
- Consumes: `ModelProvider`, `StepRequest`, `StepEvent` from `./types`.
- Produces: `class FakeModelProvider implements ModelProvider` with constructor `(script: FakeScript[])`. A `FakeScript` is `{ toolCalls?: Array<{ name: string; input: unknown }>; text?: string; output?: unknown }`. The fake executes each scripted tool call against `req.tools` for real, then emits `text`, then `done`.

- [ ] **Step 1: Write the failing test**

`runtime/src/core/fake-provider.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { FakeModelProvider } from './fake-provider';
import type { StepEvent, ToolDef } from './types';

const echo: ToolDef<{ s: string }, string> = {
  name: 'echo',
  description: 'echo',
  inputSchema: z.object({ s: z.string() }),
  execute: async ({ s }) => `echo:${s}`,
};

async function collect(it: AsyncIterable<StepEvent>) {
  const out: StepEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe('FakeModelProvider', () => {
  test('runs scripted tool calls against real tools and finishes with done', async () => {
    const p = new FakeModelProvider([{ toolCalls: [{ name: 'echo', input: { s: 'x' } }], text: 'ok', output: { a: 1 } }]);
    const events = await collect(p.run({ tenant: 'default', system: '', messages: [], tools: [echo] }));
    expect(events.map(e => e.type)).toEqual(['tool_call', 'tool_result', 'text', 'done']);
    expect((events[1] as any).output).toBe('echo:x');
    expect((events[3] as any).output).toEqual({ a: 1 });
  });

  test('unknown tool yields an error tool_result, not a throw', async () => {
    const p = new FakeModelProvider([{ toolCalls: [{ name: 'nope', input: {} }] }]);
    const events = await collect(p.run({ tenant: 'default', system: '', messages: [], tools: [] }));
    expect((events[1] as any).isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test runtime/src/core/fake-provider.test.ts`
Expected: FAIL — cannot resolve `./fake-provider`.

- [ ] **Step 3: Write `runtime/src/core/fake-provider.ts`**

```ts
import type { Capabilities, ModelProvider, StepEvent, StepRequest, ToolDef } from './types';

export interface FakeScript {
  toolCalls?: Array<{ name: string; input: unknown }>;
  text?: string;
  output?: unknown;
}

export async function runToolDef(tools: ToolDef[], name: string, input: unknown, tenant: string):
  Promise<{ output: unknown; isError: boolean }> {
  const tool = tools.find(t => t.name === name);
  if (!tool) return { output: `unknown tool: ${name}`, isError: true };
  const parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) return { output: `invalid input for ${name}: ${parsed.error.message}`, isError: true };
  try {
    return { output: await tool.execute(parsed.data, { tenant }), isError: false };
  } catch (err) {
    return { output: err instanceof Error ? err.message : String(err), isError: true };
  }
}

export class FakeModelProvider implements ModelProvider {
  readonly id = 'fake/fake';
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities = { tools: true, caching: false, thinking: false, contextTokens: 1_000_000, auth: 'local' };
  private calls = 0;

  constructor(private readonly script: FakeScript[]) {}

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const s = this.script[this.calls++] ?? {};
    let n = 0;
    for (const call of s.toolCalls ?? []) {
      const id = `fake-${this.calls}-${n++}`;
      yield { type: 'tool_call', id, name: call.name, input: call.input };
      const r = await runToolDef(req.tools, call.name, call.input, req.tenant);
      yield { type: 'tool_result', id, name: call.name, output: r.output, isError: r.isError };
    }
    if (s.text) yield { type: 'text', text: s.text };
    yield { type: 'done', output: s.output ?? null, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test runtime/src/core/fake-provider.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add runtime/src/core/fake-provider.ts runtime/src/core/fake-provider.test.ts
git commit -m "runtime: FakeModelProvider for deterministic tests"
```

---

### Task 3: Filesystem VaultStore

**Files:**
- Create: `runtime/src/vault/fs-store.ts`
- Create: `runtime/src/vault/fs-store.test.ts`

**Interfaces:**
- Consumes: `VaultStore`, `Version`, `Entry`, `Hit`, `VaultConflictError` from `../core/types`.
- Produces: `class FsVaultStore implements VaultStore` with constructor `(root: string, opts?: { search?: (query: string, root: string) => Promise<Hit[]> })`. Versions are `sha256(content)` hex. `history` returns versions recorded in `<root>/.counsel/history/<path>.jsonl`, newest first. Paths are vault-relative; any path escaping `root` throws.

- [ ] **Step 1: Write the failing test**

`runtime/src/vault/fs-store.test.ts`:
```ts
import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { VaultConflictError } from '../core/types';

let root: string;
let store: FsVaultStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'vault-'));
  store = new FsVaultStore(root);
});

describe('FsVaultStore', () => {
  test('write then read round-trips and returns a content-hash version', async () => {
    const v = await store.write('default', 'matters/acme/notes.md', '# Acme\n');
    expect(v).toMatch(/^[0-9a-f]{64}$/);
    expect(await store.read('default', 'matters/acme/notes.md')).toBe('# Acme\n');
    expect(await store.version('default', 'matters/acme/notes.md')).toBe(v);
  });

  test('write with a stale expectedVersion throws VaultConflictError', async () => {
    const v1 = await store.write('default', 'a.md', 'one');
    await store.write('default', 'a.md', 'two');
    await expect(store.write('default', 'a.md', 'three', { expectedVersion: v1 })).rejects.toBeInstanceOf(VaultConflictError);
    expect(await store.read('default', 'a.md')).toBe('two');
  });

  test('write with the current expectedVersion succeeds', async () => {
    const v1 = await store.write('default', 'a.md', 'one');
    const v2 = await store.write('default', 'a.md', 'two', { expectedVersion: v1 });
    expect(v2).not.toBe(v1);
  });

  test('list returns files and dirs, history is newest first', async () => {
    await store.write('default', 'd/x.md', '1');
    await store.write('default', 'd/x.md', '2');
    await store.write('default', 'd/sub/y.md', 'y');
    const entries = await store.list('default', 'd');
    expect(entries.map(e => `${e.kind}:${e.path}`).sort()).toEqual(['dir:d/sub', 'file:d/x.md']);
    const h = await store.history('default', 'd/x.md');
    expect(h).toHaveLength(2);
    expect(h[0]).toBe(await store.version('default', 'd/x.md'));
  });

  test('paths that escape the root are rejected', async () => {
    await expect(store.read('default', '../etc/passwd')).rejects.toThrow(/outside vault/);
  });

  test('version of a missing file is null', async () => {
    expect(await store.version('default', 'missing.md')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test runtime/src/vault/fs-store.test.ts`
Expected: FAIL — cannot resolve `./fs-store`.

- [ ] **Step 3: Write `runtime/src/vault/fs-store.ts`**

```ts
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, appendFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { Entry, Hit, Tenant, VaultStore, Version } from '../core/types';
import { VaultConflictError } from '../core/types';

export type SearchFn = (query: string, root: string) => Promise<Hit[]>;

export function hashContent(content: string): Version {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export class FsVaultStore implements VaultStore {
  private readonly root: string;
  private readonly searchFn: SearchFn;

  constructor(root: string, opts: { search?: SearchFn } = {}) {
    this.root = resolve(root);
    this.searchFn = opts.search ?? (async () => []);
  }

  // Local runtime has one tenant; the parameter is threaded for hosted later.
  private abs(_tenant: Tenant, path: string): string {
    const full = resolve(this.root, path);
    const rel = relative(this.root, full);
    if (rel.startsWith('..') || rel.split(sep)[0] === '..') throw new Error(`path outside vault: ${path}`);
    return full;
  }

  private historyFile(tenant: Tenant, path: string): string {
    return join(this.root, '.counsel', 'history', tenant, `${path}.jsonl`);
  }

  async read(tenant: Tenant, path: string): Promise<string> {
    return readFile(this.abs(tenant, path), 'utf8');
  }

  async version(tenant: Tenant, path: string): Promise<Version | null> {
    try {
      return hashContent(await this.read(tenant, path));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async write(tenant: Tenant, path: string, content: string, opts: { expectedVersion?: Version } = {}): Promise<Version> {
    const full = this.abs(tenant, path);
    if (opts.expectedVersion !== undefined) {
      const actual = await this.version(tenant, path);
      if (actual !== opts.expectedVersion) {
        throw new VaultConflictError(path, opts.expectedVersion, actual ?? 'missing');
      }
    }
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, 'utf8');
    const v = hashContent(content);
    const hf = this.historyFile(tenant, path);
    await mkdir(dirname(hf), { recursive: true });
    await appendFile(hf, JSON.stringify({ version: v, at: new Date().toISOString() }) + '\n', 'utf8');
    return v;
  }

  async list(tenant: Tenant, dir: string): Promise<Entry[]> {
    const full = this.abs(tenant, dir);
    const names = await readdir(full);
    const out: Entry[] = [];
    for (const name of names) {
      if (name === '.counsel') continue;
      const s = await stat(join(full, name));
      out.push({ path: join(dir, name), kind: s.isDirectory() ? 'dir' : 'file' });
    }
    return out;
  }

  async search(tenant: Tenant, query: string): Promise<Hit[]> {
    void tenant;
    return this.searchFn(query, this.root);
  }

  async history(tenant: Tenant, path: string): Promise<Version[]> {
    try {
      const text = await readFile(this.historyFile(tenant, path), 'utf8');
      return text.trim().split('\n').filter(Boolean).map(l => (JSON.parse(l) as { version: Version }).version).reverse();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test runtime/src/vault/fs-store.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add runtime/src/vault/
git commit -m "runtime: filesystem VaultStore with content-hash versions and conflict detection"
```

---

### Task 4: Vault tools (the standard tool set every provider gets)

**Files:**
- Create: `runtime/src/vault/vault-tools.ts`
- Create: `runtime/src/vault/vault-tools.test.ts`

**Interfaces:**
- Consumes: `VaultStore`, `ToolDef` from `../core/types`.
- Produces: `vaultTools(store: VaultStore): ToolDef[]` returning four tools: `vault_read {path}` → `{content, version}`; `vault_write {path, content, expectedVersion?}` → `{version}`; `vault_list {dir}` → `Entry[]`; `vault_search {query}` → `Hit[]`. A conflict on `vault_write` throws `VaultConflictError` (the provider turns it into an error `tool_result`, via `runToolDef`).

- [ ] **Step 1: Write the failing test**

`runtime/src/vault/vault-tools.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { vaultTools } from './vault-tools';
import { runToolDef } from '../core/fake-provider';

describe('vault tools', () => {
  test('exposes four tools and round-trips through runToolDef', async () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'vt-')));
    const tools = vaultTools(store);
    expect(tools.map(t => t.name).sort()).toEqual(['vault_list', 'vault_read', 'vault_search', 'vault_write']);

    const w = await runToolDef(tools, 'vault_write', { path: 'a.md', content: 'hi' }, 'default');
    expect(w.isError).toBe(false);
    const r = await runToolDef(tools, 'vault_read', { path: 'a.md' }, 'default');
    expect((r.output as any).content).toBe('hi');
    expect((r.output as any).version).toBe((w.output as any).version);

    const stale = await runToolDef(tools, 'vault_write', { path: 'a.md', content: 'x', expectedVersion: 'deadbeef' }, 'default');
    expect(stale.isError).toBe(true);
    expect(String(stale.output)).toMatch(/conflict/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test runtime/src/vault/vault-tools.test.ts`
Expected: FAIL — cannot resolve `./vault-tools`.

- [ ] **Step 3: Write `runtime/src/vault/vault-tools.ts`**

```ts
import { z } from 'zod';
import type { ToolDef, VaultStore } from '../core/types';

export function vaultTools(store: VaultStore): ToolDef[] {
  const read: ToolDef<{ path: string }, { content: string; version: string | null }> = {
    name: 'vault_read',
    description: 'Read a file from the vault. Returns its content and current version.',
    inputSchema: z.object({ path: z.string() }),
    execute: async ({ path }, { tenant }) => ({
      content: await store.read(tenant, path),
      version: await store.version(tenant, path),
    }),
  };
  const write: ToolDef<{ path: string; content: string; expectedVersion?: string }, { version: string }> = {
    name: 'vault_write',
    description: 'Write a file in the vault. Pass expectedVersion (from vault_read) to avoid overwriting concurrent edits.',
    inputSchema: z.object({ path: z.string(), content: z.string(), expectedVersion: z.string().optional() }),
    execute: async ({ path, content, expectedVersion }, { tenant }) => ({
      version: await store.write(tenant, path, content, { expectedVersion }),
    }),
  };
  const list: ToolDef<{ dir: string }, unknown> = {
    name: 'vault_list',
    description: 'List files and directories under a vault directory.',
    inputSchema: z.object({ dir: z.string() }),
    execute: async ({ dir }, { tenant }) => store.list(tenant, dir),
  };
  const search: ToolDef<{ query: string }, unknown> = {
    name: 'vault_search',
    description: 'Search the vault. Returns paths with snippets.',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }, { tenant }) => store.search(tenant, query),
  };
  return [read, write, list, search] as ToolDef[];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test runtime/src/vault/vault-tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add runtime/src/vault/vault-tools.ts runtime/src/vault/vault-tools.test.ts
git commit -m "runtime: vault_read/write/list/search tool set"
```

---

### Task 5: Tool registry with platform gating, and a subprocess tool

**Files:**
- Create: `runtime/src/tools/registry.ts`
- Create: `runtime/src/tools/registry.test.ts`
- Create: `runtime/src/tools/subprocess.ts`
- Create: `runtime/src/tools/subprocess.test.ts`

**Interfaces:**
- Consumes: `Tool`, `ToolDef`, `Platform`, `currentPlatform` from `../core/types`.
- Produces: `class ToolRegistry { register(tool: Tool): void; available(platform?: Platform): ToolDef[]; unavailable(platform?: Platform): Array<{ name: string; needs: Platform[] }> }` and `pythonScriptTool(opts: { name; description; script: string; platforms: Platform[]; inputSchema: ZodType; args: (input) => string[] }): Tool` which runs `python3 <script> ...args` with `cwd` = repo root and returns `{ stdout, stderr, exitCode }`.

- [ ] **Step 1: Write the failing registry test**

`runtime/src/tools/registry.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { ToolRegistry } from './registry';
import type { Tool } from '../core/types';

function t(name: string, platforms: Tool['platforms']): Tool {
  return { name, description: name, inputSchema: z.object({}), platforms, execute: async () => name };
}

describe('ToolRegistry', () => {
  test('available filters by platform; unavailable explains what is needed', () => {
    const r = new ToolRegistry();
    r.register(t('docx', new Set(['macos'])));
    r.register(t('sweep', new Set(['macos', 'linux', 'windows', 'hosted'])));
    expect(r.available('linux').map(x => x.name)).toEqual(['sweep']);
    expect(r.unavailable('linux')).toEqual([{ name: 'docx', needs: ['macos'] }]);
    expect(r.available('macos').map(x => x.name).sort()).toEqual(['docx', 'sweep']);
  });

  test('duplicate names are rejected', () => {
    const r = new ToolRegistry();
    r.register(t('a', new Set(['linux'])));
    expect(() => r.register(t('a', new Set(['linux'])))).toThrow(/duplicate/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test runtime/src/tools/registry.test.ts`
Expected: FAIL — cannot resolve `./registry`.

- [ ] **Step 3: Write `runtime/src/tools/registry.ts`**

```ts
import type { Platform, Tool, ToolDef } from '../core/types';
import { currentPlatform } from '../core/types';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) throw new Error(`duplicate tool: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  available(platform: Platform = currentPlatform()): ToolDef[] {
    return [...this.tools.values()].filter(t => t.platforms.has(platform));
  }

  unavailable(platform: Platform = currentPlatform()): Array<{ name: string; needs: Platform[] }> {
    return [...this.tools.values()]
      .filter(t => !t.platforms.has(platform))
      .map(t => ({ name: t.name, needs: [...t.platforms] }));
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun test runtime/src/tools/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing subprocess test**

`runtime/src/tools/subprocess.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pythonScriptTool } from './subprocess';

describe('pythonScriptTool', () => {
  test('runs a script with args and returns stdout/exit code', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'py-'));
    const script = join(dir, 'hello.py');
    writeFileSync(script, 'import sys; print("hello " + sys.argv[1]); sys.exit(3)\n');
    const tool = pythonScriptTool({
      name: 'hello', description: 'hello', script, platforms: ['macos', 'linux'],
      inputSchema: z.object({ who: z.string() }),
      args: ({ who }) => [who],
    });
    const r = await tool.execute({ who: 'world' }, { tenant: 'default' });
    expect(r.stdout.trim()).toBe('hello world');
    expect(r.exitCode).toBe(3);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `bun test runtime/src/tools/subprocess.test.ts`
Expected: FAIL — cannot resolve `./subprocess`.

- [ ] **Step 7: Write `runtime/src/tools/subprocess.ts`**

```ts
import type { ZodType } from 'zod';
import type { Platform, Tool } from '../core/types';

export interface SubprocessResult { stdout: string; stderr: string; exitCode: number }

export function pythonScriptTool<I>(opts: {
  name: string;
  description: string;
  script: string;                 // absolute path to the .py file
  platforms: Platform[];
  inputSchema: ZodType<I>;
  args: (input: I) => string[];
  cwd?: string;
  timeoutMs?: number;
}): Tool<I, SubprocessResult> {
  return {
    name: opts.name,
    description: opts.description,
    inputSchema: opts.inputSchema,
    platforms: new Set(opts.platforms),
    async execute(input) {
      const proc = Bun.spawn(['python3', opts.script, ...opts.args(input)], {
        cwd: opts.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const timer = setTimeout(() => proc.kill(), opts.timeoutMs ?? 120_000);
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      clearTimeout(timer);
      return { stdout, stderr, exitCode };
    },
  };
}
```

- [ ] **Step 8: Run to verify it passes, then typecheck**

Run: `bun test runtime/src/tools && bun run typecheck:runtime`
Expected: PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add runtime/src/tools/
git commit -m "runtime: tool registry with platform gating and python subprocess tool"
```

---

### Task 6: Router

**Files:**
- Create: `runtime/src/router/router.ts`
- Create: `runtime/src/router/router.test.ts`

**Interfaces:**
- Consumes: `Capabilities`, `ModelProvider`, `RouterError` from `../core/types`.
- Produces: `interface RouterConfig { default: string; tasks?: Record<string, { prefer: string; require?: Partial<Pick<Capabilities,'tools'|'caching'|'thinking'|'contextTokens'>>; allow_remote?: boolean }> }`, `parseRouterConfig(yamlText: string): RouterConfig` (uses `Bun.YAML.parse`), and `class Router { constructor(cfg: RouterConfig, providers: ModelProvider[]); resolve(task?: string): ModelProvider }`.

Resolution rules (from spec §4.4): task row → `prefer` if present and its capabilities satisfy `require` (and `allow_remote:false` means `auth === 'local'`) → else `default` if it satisfies `require` → else `RouterError`. Never a silent downgrade.

- [ ] **Step 1: Write the failing test**

`runtime/src/router/router.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { Router, parseRouterConfig } from './router';
import { RouterError } from '../core/types';
import type { ModelProvider } from '../core/types';

function p(id: string, caps: Partial<ModelProvider['capabilities']> = {}): ModelProvider {
  return {
    id, kind: 'direct',
    capabilities: { tools: true, caching: false, thinking: false, contextTokens: 200_000, auth: 'apikey', ...caps },
    async *run() { yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } }; },
  };
}

const yaml = `
default: anthropic/claude-opus-5
tasks:
  long_read: { prefer: anthropic/claude-opus-5, require: { contextTokens: 200000 } }
  classify:  { prefer: anthropic/claude-haiku-4-5 }
  privacy:   { prefer: ollama/qwen3, allow_remote: false }
  huge:      { prefer: ollama/qwen3, require: { contextTokens: 1000000 } }
`;

describe('Router', () => {
  const providers = [
    p('anthropic/claude-opus-5'),
    p('anthropic/claude-haiku-4-5', { contextTokens: 100_000 }),
    p('ollama/qwen3', { auth: 'local', contextTokens: 32_000 }),
  ];
  const router = new Router(parseRouterConfig(yaml), providers);

  test('no task → default', () => expect(router.resolve().id).toBe('anthropic/claude-opus-5'));
  test('task with satisfiable prefer → prefer', () => expect(router.resolve('classify').id).toBe('anthropic/claude-haiku-4-5'));
  test('unknown task → default', () => expect(router.resolve('nope').id).toBe('anthropic/claude-opus-5'));
  test('privacy requires a local provider', () => expect(router.resolve('privacy').id).toBe('ollama/qwen3'));
  test('unsatisfiable require is a hard error, no silent downgrade', () => {
    expect(() => router.resolve('huge')).toThrow(RouterError);
  });
  test('missing default provider is a hard error', () => {
    expect(() => new Router({ default: 'x/y' }, providers).resolve()).toThrow(RouterError);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test runtime/src/router/router.test.ts`
Expected: FAIL — cannot resolve `./router`.

- [ ] **Step 3: Write `runtime/src/router/router.ts`**

```ts
import type { Capabilities, ModelProvider } from '../core/types';
import { RouterError } from '../core/types';

export type Require = Partial<Pick<Capabilities, 'tools' | 'caching' | 'thinking' | 'contextTokens'>>;

export interface TaskRoute {
  prefer: string;
  require?: Require;
  allow_remote?: boolean;
}

export interface RouterConfig {
  default: string;
  tasks?: Record<string, TaskRoute>;
}

export function parseRouterConfig(yamlText: string): RouterConfig {
  const raw = Bun.YAML.parse(yamlText) as unknown;
  if (!raw || typeof raw !== 'object' || typeof (raw as RouterConfig).default !== 'string') {
    throw new RouterError('router config needs a string `default`');
  }
  return raw as RouterConfig;
}

function satisfies(caps: Capabilities, req: Require | undefined, allowRemote: boolean): boolean {
  if (!allowRemote && caps.auth !== 'local') return false;
  if (!req) return true;
  if (req.tools !== undefined && caps.tools !== req.tools) return false;
  if (req.caching !== undefined && caps.caching !== req.caching) return false;
  if (req.thinking !== undefined && caps.thinking !== req.thinking) return false;
  if (req.contextTokens !== undefined && caps.contextTokens < req.contextTokens) return false;
  return true;
}

export class Router {
  private readonly byId = new Map<string, ModelProvider>();

  constructor(private readonly cfg: RouterConfig, providers: ModelProvider[]) {
    for (const p of providers) this.byId.set(p.id, p);
  }

  resolve(task?: string): ModelProvider {
    const route = task ? this.cfg.tasks?.[task] : undefined;
    const allowRemote = route?.allow_remote ?? true;

    if (route) {
      const preferred = this.byId.get(route.prefer);
      if (preferred && satisfies(preferred.capabilities, route.require, allowRemote)) return preferred;
    }
    const def = this.byId.get(this.cfg.default);
    if (!def) throw new RouterError(`default provider not configured: ${this.cfg.default}`);
    if (route && !satisfies(def.capabilities, route.require, allowRemote)) {
      throw new RouterError(
        `task "${task}" requires ${JSON.stringify(route.require ?? {})}${allowRemote ? '' : ' and a local model'}; ` +
        `neither ${route.prefer} nor default ${def.id} satisfies it`,
      );
    }
    return def;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun test runtime/src/router/router.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add runtime/src/router/
git commit -m "runtime: router with per-task preference, hard requirements, no silent downgrade"
```

---

### Task 7: MCP bridge and stdio server

**Files:**
- Create: `runtime/src/mcp/bridge.ts`
- Create: `runtime/src/mcp/bridge.test.ts`
- Create: `runtime/src/mcp/stdio.ts`

**Interfaces:**
- Consumes: `ToolDef` from `../core/types`; `runToolDef` from `../core/fake-provider`.
- Produces: `toMcpTools(tools: ToolDef[], tenant: string): McpToolSpec[]` where `McpToolSpec = { name; description; inputSchema: JsonSchema; handler(input): Promise<{ content: [{type:'text', text}], isError?: boolean }> }`; and `registerOnServer(server: McpServer, specs: McpToolSpec[])`. `stdio.ts` is an executable that builds `FsVaultStore` from `COUNSEL_VAULT`, registers `vaultTools` + the registry, and serves on stdio. Tool results are JSON-stringified text.

- [ ] **Step 1: Write the failing test**

`runtime/src/mcp/bridge.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { toMcpTools } from './bridge';
import type { ToolDef } from '../core/types';

const add: ToolDef<{ a: number; b: number }, number> = {
  name: 'add', description: 'add', inputSchema: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ a, b }) => a + b,
};

describe('toMcpTools', () => {
  test('converts zod to JSON schema and wraps results as text content', async () => {
    const [spec] = toMcpTools([add], 'default');
    expect(spec!.inputSchema).toMatchObject({ type: 'object', properties: { a: { type: 'number' } } });
    const r = await spec!.handler({ a: 1, b: 2 });
    expect(r.content[0]!.text).toBe('3');
    expect(r.isError).toBeUndefined();
  });

  test('tool errors become isError results', async () => {
    const [spec] = toMcpTools([add], 'default');
    const r = await spec!.handler({ a: 'x' });
    expect(r.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test runtime/src/mcp/bridge.test.ts`
Expected: FAIL — cannot resolve `./bridge`.

- [ ] **Step 3: Write `runtime/src/mcp/bridge.ts`**

```ts
import { z } from 'zod';
import type { ToolDef } from '../core/types';
import { runToolDef } from '../core/fake-provider';

export interface McpToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler(input: unknown): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>;
}

export function toMcpTools(tools: ToolDef[], tenant: string): McpToolSpec[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: z.toJSONSchema(t.inputSchema) as Record<string, unknown>,
    async handler(input) {
      const r = await runToolDef(tools, t.name, input, tenant);
      const text = typeof r.output === 'string' ? r.output : JSON.stringify(r.output);
      return r.isError ? { content: [{ type: 'text', text }], isError: true } : { content: [{ type: 'text', text }] };
    },
  }));
}
```

(`z.toJSONSchema` is zod 4. If `bun pm ls zod` shows zod 3, run `bun add zod@^4`.)

- [ ] **Step 4: Run to verify it passes**

Run: `bun test runtime/src/mcp/bridge.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `runtime/src/mcp/stdio.ts`**

```ts
#!/usr/bin/env bun
// Serves the runtime's tools over MCP stdio. Used by the Codex harness
// (Codex cannot host an in-process MCP server). Env: COUNSEL_VAULT (required).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FsVaultStore } from '../vault/fs-store';
import { vaultTools } from '../vault/vault-tools';
import { toMcpTools } from './bridge';
import { DEFAULT_TENANT } from '../core/types';

const vault = process.env.COUNSEL_VAULT;
if (!vault) {
  console.error('COUNSEL_VAULT is required');
  process.exit(2);
}

const store = new FsVaultStore(vault);
const specs = toMcpTools(vaultTools(store), process.env.COUNSEL_TENANT ?? DEFAULT_TENANT);
const server = new McpServer({ name: 'counsel', version: '0.1.0' });
for (const s of specs) {
  server.registerTool(s.name, { description: s.description, inputSchema: s.inputSchema as never }, s.handler as never);
}
await server.connect(new StdioServerTransport());
```

- [ ] **Step 6: Smoke the stdio server by hand**

Run:
```bash
COUNSEL_VAULT=$(mktemp -d) bun runtime/src/mcp/stdio.ts <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
EOF
```
Expected: two JSON responses; the second lists `vault_read`, `vault_write`, `vault_list`, `vault_search`. If `registerTool`'s `inputSchema` rejects a JSON schema object in the installed SDK version, pass the zod shape instead: change `toMcpTools` to also carry `zodSchema: t.inputSchema` and register with `{ inputSchema: (s.zodSchema as z.ZodObject<any>).shape }`.

- [ ] **Step 7: Typecheck and commit**

Run: `bun run typecheck:runtime`
```bash
git add runtime/src/mcp/
git commit -m "runtime: MCP bridge for tool defs + stdio server for external harnesses"
```

---

### Task 8: Claude harness provider

**Files:**
- Create: `runtime/src/providers/claude-harness.ts`
- Create: `runtime/src/providers/claude-harness.test.ts`

**Interfaces:**
- Consumes: `ModelProvider`, `StepRequest`, `StepEvent`, `ProviderError` from `../core/types`; `toMcpTools` from `../mcp/bridge`.
- Produces: `class ClaudeHarnessProvider implements ModelProvider` with constructor `(opts: { model: string; id?: string })`, and the pure function `mapClaudeMessage(msg: unknown, outputSchema?: ZodType): StepEvent[]` (tested without a live call).

Design notes for the implementer:
- Use `query({ prompt, options })` from `@anthropic-ai/claude-agent-sdk`.
- `systemPrompt` is a plain string (NOT the `claude_code` preset — that prompt is for coding).
- `mcpServers: { counsel: createSdkMcpServer({ name: 'counsel', tools: [...] }) }`, where each tool is built with the SDK's `tool(name, description, zodShape, handler)`.
- Restrict to our tools: `allowedTools: ['mcp__counsel__*']`, `disallowedTools: ['Bash','Read','Write','Edit','MultiEdit','Glob','Grep','WebFetch','WebSearch','Task','NotebookEdit','TodoWrite']`, `permissionMode: 'bypassPermissions'` (no interactive prompts; safety comes from the tool restriction), `strictMcpConfig: true`, `cwd` = an empty temp dir so no project files leak in.
- Structured output: when `req.outputSchema` is set, pass `outputFormat: { type: 'json_schema', schema: z.toJSONSchema(req.outputSchema) }` and read `message.output` on the `result` message. Validate with `outputSchema.safeParse`; failure → `error` event.
- `maxTurns: req.maxToolCalls ?? 20`.

- [ ] **Step 1: Write the failing test (message mapper only)**

`runtime/src/providers/claude-harness.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { mapClaudeMessage } from './claude-harness';

describe('mapClaudeMessage', () => {
  test('assistant text → text event', () => {
    const ev = mapClaudeMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'hello' }] } });
    expect(ev).toEqual([{ type: 'text', text: 'hello' }]);
  });

  test('assistant tool_use → tool_call with the mcp prefix stripped', () => {
    const ev = mapClaudeMessage({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'mcp__counsel__vault_read', input: { path: 'a.md' } }] } });
    expect(ev).toEqual([{ type: 'tool_call', id: 't1', name: 'vault_read', input: { path: 'a.md' } }]);
  });

  test('user tool_result → tool_result event', () => {
    const ev = mapClaudeMessage({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: '{"x":1}' }], is_error: false }] } });
    expect(ev).toEqual([{ type: 'tool_result', id: 't1', name: '', output: '{"x":1}', isError: false }]);
  });

  test('result with valid structured output → done', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', output: { a: 1 }, usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.01 }, z.object({ a: z.number() }));
    expect(ev).toEqual([{ type: 'done', output: { a: 1 }, usage: { inputTokens: 10, outputTokens: 5, costUsd: 0.01 } }]);
  });

  test('result with invalid structured output → error', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'success', output: { a: 'no' }, usage: {} }, z.object({ a: z.number() }));
    expect(ev[0]!.type).toBe('error');
  });

  test('result error subtype → error', () => {
    const ev = mapClaudeMessage({ type: 'result', subtype: 'error_max_turns', usage: {} });
    expect(ev[0]!.type).toBe('error');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test runtime/src/providers/claude-harness.test.ts`
Expected: FAIL — cannot resolve `./claude-harness`.

- [ ] **Step 3: Write `runtime/src/providers/claude-harness.ts`**

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z, type ZodType } from 'zod';
import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { toMcpTools } from '../mcp/bridge';

const MCP_PREFIX = 'mcp__counsel__';
const BUILTIN_TOOLS = ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit', 'TodoWrite'];

type AnyMsg = { type: string; [k: string]: unknown };

export function mapClaudeMessage(raw: unknown, outputSchema?: ZodType<unknown>): StepEvent[] {
  const msg = raw as AnyMsg;
  const out: StepEvent[] = [];
  if (msg.type === 'assistant' || msg.type === 'user') {
    const content = ((msg.message as { content?: unknown[] })?.content ?? []) as Array<Record<string, unknown>>;
    for (const block of content) {
      if (block.type === 'text' && typeof block.text === 'string') out.push({ type: 'text', text: block.text });
      else if (block.type === 'tool_use') {
        const name = String(block.name);
        out.push({ type: 'tool_call', id: String(block.id), name: name.startsWith(MCP_PREFIX) ? name.slice(MCP_PREFIX.length) : name, input: block.input });
      } else if (block.type === 'tool_result') {
        const parts = Array.isArray(block.content) ? block.content as Array<{ type: string; text?: string }> : [];
        const text = parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
        out.push({ type: 'tool_result', id: String(block.tool_use_id), name: '', output: text || block.content, isError: Boolean(block.is_error) });
      }
    }
    return out;
  }
  if (msg.type === 'result') {
    const usage = (msg.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    const u = { inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0, ...(typeof msg.total_cost_usd === 'number' ? { costUsd: msg.total_cost_usd } : {}) };
    if (msg.subtype !== 'success') return [{ type: 'error', message: `claude harness: ${String(msg.subtype)}` }];
    if (outputSchema) {
      const parsed = outputSchema.safeParse(msg.output);
      if (!parsed.success) return [{ type: 'error', message: `structured output failed validation: ${parsed.error.message}` }];
      return [{ type: 'done', output: parsed.data, usage: u }];
    }
    return [{ type: 'done', output: typeof msg.result === 'string' ? msg.result : null, usage: u }];
  }
  return out;
}

export class ClaudeHarnessProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'harness' as const;
  readonly capabilities: Capabilities = { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' };

  constructor(private readonly opts: { model: string; id?: string }) {
    this.id = opts.id ?? `claude-sub/${opts.model}`;
  }

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const specs = toMcpTools(req.tools, req.tenant);
    const sdkTools = specs.map(s => {
      const def = req.tools.find(t => t.name === s.name)!;
      const shape = (def.inputSchema as z.ZodObject<z.ZodRawShape>).shape;
      return tool(s.name, s.description, shape, async (input: unknown) => s.handler(input));
    });
    const server = createSdkMcpServer({ name: 'counsel', version: '0.1.0', tools: sdkTools });
    const prompt = req.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const stream = query({
      prompt,
      options: {
        model: this.opts.model,
        systemPrompt: req.system,
        mcpServers: { counsel: server },
        strictMcpConfig: true,
        allowedTools: [`${MCP_PREFIX}*`],
        disallowedTools: BUILTIN_TOOLS,
        permissionMode: 'bypassPermissions',
        maxTurns: req.maxToolCalls ?? 20,
        cwd: mkdtempSync(join(tmpdir(), 'counsel-cwd-')),
        ...(req.outputSchema ? { outputFormat: { type: 'json_schema' as const, schema: z.toJSONSchema(req.outputSchema) as Record<string, unknown> } } : {}),
      },
    });

    for await (const msg of stream) {
      for (const ev of mapClaudeMessage(msg, req.outputSchema)) yield ev;
    }
  }
}
```

If the installed SDK types reject an option name (the SDK moves fast — `0.3.x` at the time of writing), run `bun run typecheck:runtime`, open `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`, and use the current name for the same option. Do not drop the tool restriction to make types pass.

- [ ] **Step 4: Run to verify the mapper test passes**

Run: `bun test runtime/src/providers/claude-harness.test.ts && bun run typecheck:runtime`
Expected: PASS (6 tests), no type errors.

- [ ] **Step 5: Commit**

```bash
git add runtime/src/providers/claude-harness.ts runtime/src/providers/claude-harness.test.ts
git commit -m "runtime: Claude Agent SDK harness provider (subscription auth, in-process MCP tools, structured output)"
```

---

### Task 9: Codex harness provider

**Files:**
- Create: `runtime/src/providers/codex-harness.ts`
- Create: `runtime/src/providers/codex-harness.test.ts`

**Interfaces:**
- Consumes: `ModelProvider`, `StepRequest`, `StepEvent` from `../core/types`.
- Produces: `class CodexHarnessProvider implements ModelProvider` with constructor `(opts: { model: string; vaultRoot: string; id?: string })`, and pure `mapCodexEvent(ev: unknown, outputSchema?: ZodType): StepEvent[]`.

Design notes:
- `new Codex({ config: { mcp_servers: { counsel: { command: 'bun', args: [<abs path to runtime/src/mcp/stdio.ts>], env: { COUNSEL_VAULT: vaultRoot } } } } })`. The stdio server from Task 7 is the tool surface; Codex cannot host in-process tools.
- `startThread({ model, sandboxMode: 'read-only', workingDirectory: <empty temp dir>, skipGitRepoCheck: true })`. Read-only sandbox blocks file writes outside our MCP tools; the empty cwd keeps project files out.
- Prompt = `req.system` + a blank line + the transcript (Codex has no separate system-prompt option in `run`).
- `runStreamed(prompt, { outputSchema: z.toJSONSchema(req.outputSchema) })` when a schema is set; parsed result is `JSON.parse(turn.finalResponse)` on `turn.completed`.
- Events: `item.completed` with `item.type === 'agent_message'` → `text`; `item.type === 'mcp_tool_call'` → `tool_call` + `tool_result` (Codex reports both on completion; `item.server`/`item.tool`/`item.arguments`/`item.result`); `turn.completed` → `done` with `usage`; `turn.failed`/`error` → `error`.

- [ ] **Step 1: Write the failing test (event mapper only)**

`runtime/src/providers/codex-harness.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { mapCodexEvent } from './codex-harness';

describe('mapCodexEvent', () => {
  test('agent_message → text', () => {
    expect(mapCodexEvent({ type: 'item.completed', item: { type: 'agent_message', text: 'hi' } })).toEqual([{ type: 'text', text: 'hi' }]);
  });

  test('mcp_tool_call → tool_call + tool_result', () => {
    const ev = mapCodexEvent({ type: 'item.completed', item: { id: 'c1', type: 'mcp_tool_call', server: 'counsel', tool: 'vault_read', arguments: { path: 'a.md' }, result: { content: [{ type: 'text', text: '{"x":1}' }] }, status: 'completed' } });
    expect(ev).toEqual([
      { type: 'tool_call', id: 'c1', name: 'vault_read', input: { path: 'a.md' } },
      { type: 'tool_result', id: 'c1', name: 'vault_read', output: '{"x":1}', isError: false },
    ]);
  });

  test('turn.completed with schema parses finalResponse', () => {
    const ev = mapCodexEvent({ type: 'turn.completed', usage: { input_tokens: 3, output_tokens: 4 } }, z.object({ a: z.number() }), '{"a":1}');
    expect(ev).toEqual([{ type: 'done', output: { a: 1 }, usage: { inputTokens: 3, outputTokens: 4 } }]);
  });

  test('turn.failed → error', () => {
    expect(mapCodexEvent({ type: 'turn.failed', error: { message: 'boom' } })[0]!.type).toBe('error');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test runtime/src/providers/codex-harness.test.ts`
Expected: FAIL — cannot resolve `./codex-harness`.

- [ ] **Step 3: Write `runtime/src/providers/codex-harness.ts`**

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { z, type ZodType } from 'zod';
import { Codex } from '@openai/codex-sdk';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';

const STDIO_SERVER = resolve(import.meta.dir, '../mcp/stdio.ts');

type AnyEv = { type: string; [k: string]: unknown };

export function mapCodexEvent(raw: unknown, outputSchema?: ZodType<unknown>, finalResponse?: string): StepEvent[] {
  const ev = raw as AnyEv;
  if (ev.type === 'item.completed') {
    const item = ev.item as Record<string, unknown>;
    if (item.type === 'agent_message') return [{ type: 'text', text: String(item.text ?? '') }];
    if (item.type === 'mcp_tool_call') {
      const id = String(item.id);
      const name = String(item.tool);
      const parts = ((item.result as { content?: Array<{ type: string; text?: string }> })?.content ?? []);
      const text = parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
      return [
        { type: 'tool_call', id, name, input: item.arguments },
        { type: 'tool_result', id, name, output: text || item.result, isError: item.status === 'failed' },
      ];
    }
    return [];
  }
  if (ev.type === 'turn.completed') {
    const usage = (ev.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    const u = { inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0 };
    if (!outputSchema) return [{ type: 'done', output: finalResponse ?? null, usage: u }];
    let json: unknown;
    try { json = JSON.parse(finalResponse ?? ''); } catch { return [{ type: 'error', message: 'structured output was not JSON' }]; }
    const parsed = outputSchema.safeParse(json);
    if (!parsed.success) return [{ type: 'error', message: `structured output failed validation: ${parsed.error.message}` }];
    return [{ type: 'done', output: parsed.data, usage: u }];
  }
  if (ev.type === 'turn.failed' || ev.type === 'error') {
    const e = ev.error as { message?: string } | undefined;
    return [{ type: 'error', message: `codex harness: ${e?.message ?? ev.type}` }];
  }
  return [];
}

export class CodexHarnessProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'harness' as const;
  readonly capabilities: Capabilities = { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'subscription' };

  constructor(private readonly opts: { model: string; vaultRoot: string; id?: string }) {
    this.id = opts.id ?? `codex-sub/${opts.model}`;
  }

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const codex = new Codex({
      config: {
        mcp_servers: {
          counsel: { command: 'bun', args: [STDIO_SERVER], env: { COUNSEL_VAULT: this.opts.vaultRoot, COUNSEL_TENANT: req.tenant } },
        },
      },
    });
    const thread = codex.startThread({
      model: this.opts.model,
      sandboxMode: 'read-only',
      workingDirectory: mkdtempSync(join(tmpdir(), 'counsel-cwd-')),
      skipGitRepoCheck: true,
    });
    const transcript = req.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    const prompt = `${req.system}\n\n${transcript}`;
    const { events } = await thread.runStreamed(prompt, req.outputSchema ? { outputSchema: z.toJSONSchema(req.outputSchema) } : {});

    let lastText = '';
    for await (const ev of events) {
      const e = ev as AnyEv;
      if (e.type === 'item.completed' && (e.item as { type?: string })?.type === 'agent_message') {
        lastText = String((e.item as { text?: string }).text ?? '');
      }
      for (const out of mapCodexEvent(ev, req.outputSchema, lastText)) yield out;
    }
  }
}
```

Note for the implementer: the Codex harness only sees tools that the *stdio server* registers. Task 7's server registers the vault tools; `req.tools` beyond those are not visible to Codex until the stdio server also loads the registry (done in Task 10's CLI by passing `COUNSEL_TOOLS` — see there). Also confirm the exact `mcp_tool_call` item field names against `node_modules/@openai/codex-sdk/dist/*.d.ts` and adjust the mapper + test together if they differ.

- [ ] **Step 4: Run to verify the mapper test passes**

Run: `bun test runtime/src/providers/codex-harness.test.ts && bun run typecheck:runtime`
Expected: PASS (4 tests), no type errors.

- [ ] **Step 5: Commit**

```bash
git add runtime/src/providers/codex-harness.ts runtime/src/providers/codex-harness.test.ts
git commit -m "runtime: Codex SDK harness provider (ChatGPT login, stdio MCP tools, read-only sandbox)"
```

---

### Task 10: Direct provider (AI SDK)

**Files:**
- Create: `runtime/src/providers/direct.ts`
- Create: `runtime/src/providers/direct.test.ts`

**Interfaces:**
- Consumes: `ModelProvider`, `StepRequest`, `StepEvent` from `../core/types`; `runToolDef` from `../core/fake-provider`.
- Produces: `class DirectProvider implements ModelProvider` with constructor `(opts: { id: string; model: LanguageModel; capabilities: Capabilities })` and `function directProviderFromId(id: string): DirectProvider` supporting `anthropic/<model>`, `openai/<model>`, `ollama/<model>`.

Design notes:
- `streamText({ model, system, messages, tools, stopWhen: stepCountIs(req.maxToolCalls ?? 20), output: req.outputSchema ? Output.object({ schema }) : undefined })`.
- Each `ToolDef` → `tool({ description, inputSchema, execute: (input) => runToolDef(req.tools, name, input, req.tenant) })`. Return `{ output, isError }` so the model sees tool failures as data.
- Map `fullStream` parts: `text-delta` → `text`; `tool-call` → `tool_call`; `tool-result` → `tool_result`; `finish` → `done` (with `usage` and the parsed `output` when a schema is set); `error` → `error`.
- The AI SDK is at **7.x**; part names above are from the 7.x docs. If a name differs in the installed version, check `node_modules/ai/dist/index.d.ts` for `TextStreamPart` and update the mapper and the test together.

- [ ] **Step 1: Write the failing test**

`runtime/src/providers/direct.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { z } from 'zod';
import { DirectProvider } from './direct';
import type { StepEvent } from '../core/types';

async function collect(it: AsyncIterable<StepEvent>) {
  const out: StepEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe('DirectProvider', () => {
  test('streams text and finishes with done + usage', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: '1' },
            { type: 'text-delta', id: '1', delta: 'hello' },
            { type: 'text-end', id: '1' },
            { type: 'finish', finishReason: 'stop', usage: { inputTokens: 5, outputTokens: 2, totalTokens: 7 } },
          ],
        }),
      }),
    });
    const p = new DirectProvider({ id: 'mock/m', model, capabilities: { tools: true, caching: false, thinking: false, contextTokens: 1000, auth: 'apikey' } });
    const events = await collect(p.run({ tenant: 'default', system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [] }));
    expect(events.filter(e => e.type === 'text').map(e => (e as any).text).join('')).toBe('hello');
    const done = events.at(-1) as any;
    expect(done.type).toBe('done');
    expect(done.usage).toEqual({ inputTokens: 5, outputTokens: 2 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test runtime/src/providers/direct.test.ts`
Expected: FAIL — cannot resolve `./direct`. (If the failure is instead "MockLanguageModelV3 is not exported", run `ls node_modules/ai/dist` and `grep -o 'MockLanguageModelV[0-9]' node_modules/ai/test/dist/index.d.ts | sort -u`; use the exported name in the test.)

- [ ] **Step 3: Write `runtime/src/providers/direct.ts`**

```ts
import { Output, stepCountIs, streamText, tool, type LanguageModel } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { ollama } from 'ai-sdk-ollama';
import type { Capabilities, ModelProvider, StepEvent, StepRequest } from '../core/types';
import { runToolDef } from '../core/fake-provider';

export class DirectProvider implements ModelProvider {
  readonly id: string;
  readonly kind = 'direct' as const;
  readonly capabilities: Capabilities;
  private readonly model: LanguageModel;

  constructor(opts: { id: string; model: LanguageModel; capabilities: Capabilities }) {
    this.id = opts.id;
    this.model = opts.model;
    this.capabilities = opts.capabilities;
  }

  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const tools = Object.fromEntries(req.tools.map(t => [
      t.name,
      tool({
        description: t.description,
        inputSchema: t.inputSchema,
        execute: async (input: unknown) => runToolDef(req.tools, t.name, input, req.tenant),
      }),
    ]));

    const result = streamText({
      model: this.model,
      system: req.system,
      messages: req.messages,
      tools,
      stopWhen: stepCountIs(req.maxToolCalls ?? 20),
      ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
      ...(req.outputSchema ? { output: Output.object({ schema: req.outputSchema }) } : {}),
    });

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          yield { type: 'text', text: part.text };
          break;
        case 'tool-call':
          yield { type: 'tool_call', id: part.toolCallId, name: part.toolName, input: part.input };
          break;
        case 'tool-result': {
          const r = part.output as { output: unknown; isError: boolean };
          yield { type: 'tool_result', id: part.toolCallId, name: part.toolName, output: r.output, isError: r.isError };
          break;
        }
        case 'error':
          yield { type: 'error', message: String(part.error) };
          return;
        case 'finish': {
          const usage = part.totalUsage;
          const output = req.outputSchema ? await result.output : await result.text;
          yield { type: 'done', output, usage: { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 } };
          break;
        }
        default:
          break;
      }
    }
  }
}

const CAPS: Record<string, Capabilities> = {
  anthropic: { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'apikey' },
  openai:    { tools: true, caching: true, thinking: true, contextTokens: 200_000, auth: 'apikey' },
  ollama:    { tools: true, caching: false, thinking: false, contextTokens: 32_000, auth: 'local' },
};

export function directProviderFromId(id: string): DirectProvider {
  const [vendor, ...rest] = id.split('/');
  const name = rest.join('/');
  const caps = CAPS[vendor ?? ''];
  if (!caps || !name) throw new Error(`unknown direct provider id: ${id}`);
  const model = vendor === 'anthropic' ? anthropic(name) : vendor === 'openai' ? openai(name) : ollama(name);
  return new DirectProvider({ id, model, capabilities: caps });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun test runtime/src/providers/direct.test.ts && bun run typecheck:runtime`
Expected: PASS, no type errors. If `part.text` / `part.totalUsage` / `part.input` are named differently in the installed `ai` version, read `TextStreamPart` in `node_modules/ai/dist/index.d.ts` and fix the mapper (not the test's intent).

- [ ] **Step 5: Commit**

```bash
git add runtime/src/providers/direct.ts runtime/src/providers/direct.test.ts
git commit -m "runtime: direct AI SDK provider (anthropic/openai/ollama) with tool loop and structured output"
```

---

### Task 11: Provider factory and `step` CLI

**Files:**
- Create: `runtime/src/providers/index.ts`
- Create: `runtime/src/providers/index.test.ts`
- Create: `runtime/src/cli.ts`
- Modify: `runtime/src/mcp/stdio.ts` (load registry tools too)

**Interfaces:**
- Consumes: everything above.
- Produces: `buildProviders(opts: { ids: string[]; vaultRoot: string }): ModelProvider[]` — `claude-sub/<model>` → `ClaudeHarnessProvider`, `codex-sub/<model>` → `CodexHarnessProvider`, else `directProviderFromId`. And the CLI: `bun runtime/src/cli.ts step --vault <dir> --provider <id> [--task <name>] [--schema <json-file>] "<prompt>"` which prints events as JSON lines and exits 0 on `done`, 1 on `error`.

- [ ] **Step 1: Write the failing factory test**

`runtime/src/providers/index.test.ts`:
```ts
import { describe, expect, test } from 'bun:test';
import { buildProviders } from './index';

describe('buildProviders', () => {
  test('routes ids to the right provider class', () => {
    const ps = buildProviders({ ids: ['claude-sub/opus', 'codex-sub/gpt-5', 'ollama/qwen3'], vaultRoot: '/tmp/v' });
    expect(ps.map(p => `${p.id}:${p.kind}:${p.capabilities.auth}`)).toEqual([
      'claude-sub/opus:harness:subscription',
      'codex-sub/gpt-5:harness:subscription',
      'ollama/qwen3:direct:local',
    ]);
  });
  test('unknown vendor throws', () => {
    expect(() => buildProviders({ ids: ['nope/x'], vaultRoot: '/tmp/v' })).toThrow(/unknown/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test runtime/src/providers/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write `runtime/src/providers/index.ts`**

```ts
import type { ModelProvider } from '../core/types';
import { ClaudeHarnessProvider } from './claude-harness';
import { CodexHarnessProvider } from './codex-harness';
import { directProviderFromId } from './direct';

export function buildProviders(opts: { ids: string[]; vaultRoot: string }): ModelProvider[] {
  return opts.ids.map(id => {
    const [vendor, ...rest] = id.split('/');
    const model = rest.join('/');
    if (vendor === 'claude-sub') return new ClaudeHarnessProvider({ model, id });
    if (vendor === 'codex-sub') return new CodexHarnessProvider({ model, vaultRoot: opts.vaultRoot, id });
    return directProviderFromId(id);
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun test runtime/src/providers/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `runtime/src/cli.ts`**

```ts
#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { FsVaultStore } from './vault/fs-store';
import { vaultTools } from './vault/vault-tools';
import { ToolRegistry } from './tools/registry';
import { pythonScriptTool } from './tools/subprocess';
import { Router, parseRouterConfig } from './router/router';
import { buildProviders } from './providers/index';
import { DEFAULT_TENANT, isTerminal } from './core/types';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    vault: { type: 'string' },
    provider: { type: 'string' },
    task: { type: 'string' },
    schema: { type: 'string' },
    system: { type: 'string', default: 'You are counsel. Use the vault tools to answer. Be brief.' },
  },
});

const [cmd, ...rest] = positionals;
if (cmd !== 'step' || !values.vault || !values.provider || rest.length === 0) {
  console.error('usage: bun runtime/src/cli.ts step --vault <dir> --provider <id> [--task <name>] [--schema <json>] "<prompt>"');
  process.exit(2);
}

const vaultRoot = resolve(values.vault);
const store = new FsVaultStore(vaultRoot);
const registry = new ToolRegistry();
registry.register(pythonScriptTool({
  name: 'docket_sweep',
  description: 'Sweep the vault for upcoming deadlines (read-only).',
  script: resolve(import.meta.dir, '../../scripts/docket_sweep.py'),
  platforms: ['macos', 'linux', 'windows', 'hosted'],
  inputSchema: z.object({ days: z.number().int().positive().default(60) }),
  args: ({ days }) => ['--root', vaultRoot, '--days', String(days)],
  cwd: resolve(import.meta.dir, '../..'),
}));

const providers = buildProviders({ ids: [values.provider], vaultRoot });
const router = new Router(parseRouterConfig(`default: ${values.provider}\n`), providers);
const provider = router.resolve(values.task);

const outputSchema = values.schema
  ? z.fromJSONSchema(JSON.parse(readFileSync(values.schema, 'utf8')) as Record<string, unknown>)
  : undefined;

const tools = [...vaultTools(store), ...registry.available()];
let exit = 1;
for await (const ev of provider.run({
  tenant: DEFAULT_TENANT,
  system: values.system!,
  messages: [{ role: 'user', content: rest.join(' ') }],
  tools,
  ...(outputSchema ? { outputSchema } : {}),
})) {
  console.log(JSON.stringify(ev));
  if (isTerminal(ev)) exit = ev.type === 'done' ? 0 : 1;
}
process.exit(exit);
```

Check `scripts/docket_sweep.py --help` for its real flag names and adjust `args` to match (`--root`/`--days` are the intent; the script's `argparse` block at `scripts/docket_sweep.py:238` is the source of truth). If zod 4 in the installed version lacks `z.fromJSONSchema`, replace the `--schema` handling with `z.any()` and validate the JSON schema on the harness side only; note it in the spike doc.

- [ ] **Step 6: Extend `runtime/src/mcp/stdio.ts` so Codex sees the same `docket_sweep` tool**

Replace the `const specs = …` line with:
```ts
import { ToolRegistry } from '../tools/registry';
import { pythonScriptTool } from '../tools/subprocess';
import { z } from 'zod';
import { resolve } from 'node:path';

const registry = new ToolRegistry();
registry.register(pythonScriptTool({
  name: 'docket_sweep',
  description: 'Sweep the vault for upcoming deadlines (read-only).',
  script: resolve(import.meta.dir, '../../../scripts/docket_sweep.py'),
  platforms: ['macos', 'linux', 'windows', 'hosted'],
  inputSchema: z.object({ days: z.number().int().positive().default(60) }),
  args: ({ days }) => ['--root', vault, '--days', String(days)],
  cwd: resolve(import.meta.dir, '../../..'),
}));
const specs = toMcpTools([...vaultTools(store), ...registry.available()], process.env.COUNSEL_TENANT ?? DEFAULT_TENANT);
```
(Move the imports to the top of the file.)

- [ ] **Step 7: Smoke with the fake-free path: Ollama or an API key if available; otherwise skip to Task 12**

Run (any one that you have credentials for):
```bash
V=$(mktemp -d); echo "# Acme NDA\nTerm: 2 years" > "$V/acme.md"
bun runtime/src/cli.ts step --vault "$V" --provider claude-sub/claude-opus-5 "List the files in the vault root and summarise acme.md"
```
Expected: JSON lines including a `tool_call` for `vault_list`, a `tool_result`, text, and a final `{"type":"done",…}`; exit 0.

- [ ] **Step 8: Typecheck and commit**

Run: `bun run typecheck:runtime && bun test runtime/src`
```bash
git add runtime/src/providers/index.ts runtime/src/providers/index.test.ts runtime/src/cli.ts runtime/src/mcp/stdio.ts
git commit -m "runtime: provider factory and \`step\` CLI"
```

---

### Task 12: Spikes 9.1–9.3 (findings document)

**Files:**
- Create: `docs/superpowers/spikes/2026-08-28-runtime-spikes.md`

These are experiments, not features. Each one uses the Task 11 CLI. Record what you ran, what happened, and a one-line verdict. Anything built for a spike that is not already part of Tasks 1–11 is throwaway.

- [ ] **Step 1: Spike 9.3 — harness tier viability (Claude, then Codex)**

For each of `claude-sub/claude-opus-5` and `codex-sub/gpt-5` (use the current model names `claude --help`/`codex --help` accept), run three prompts against a temp vault seeded with two markdown files:
1. `"List the vault root and read acme.md"` — expect `vault_list` + `vault_read` tool calls.
2. `--schema` pointing at `{"type":"object","properties":{"files":{"type":"array","items":{"type":"string"}}},"required":["files"]}` and prompt `"Return the file names in the vault root"` — expect `done.output.files` to be an array.
3. `"Run the shell command 'ls /' and tell me what you see"` — expect NO shell execution: no `Bash` tool use in Claude's events; Codex must report it cannot (read-only sandbox, no shell tool). If either harness runs a shell, that is a failed spike — record it and stop.

Record: pass/fail for (a) tools attach, (b) typed output, (c) restriction holds; token usage from `done.usage`; wall-clock.

- [ ] **Step 2: Spike 9.2 — Ollama tool reliability**

With Ollama running and a tool-capable model pulled (try `qwen3:8b` first, then `llama3.1:8b`), run prompt 1 above five times each via `--provider ollama/<model>`. Record how many runs produced a correct `vault_list` → `vault_read` sequence. Verdict: ≥4/5 = viable privacy tier; otherwise record "not viable with <model>; needs a larger model or a constrained flow."

- [ ] **Step 3: Spike 9.1 — prompt caching and thinking through the AI SDK (direct tier)**

With `ANTHROPIC_API_KEY` set, run prompt 1 twice via `--provider anthropic/claude-opus-5` with a `--system` of ~3,000 words (paste `primitives/evaluate.md` content). Check `done.usage`; then temporarily add `console.error(JSON.stringify(part))` for the `finish` part in `direct.ts` to see whether `providerMetadata.anthropic.cacheReadInputTokens` appears on the second run. Record whether caching is exposed and whether `providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: 2048 } } }` on `streamText` is accepted by the installed provider. Remove the debug line afterwards.

- [ ] **Step 4: Write the findings**

`docs/superpowers/spikes/2026-08-28-runtime-spikes.md` with three sections (9.3, 9.2, 9.1), each: commands run, observations, verdict, and what the next plan (counsel loop + HTTP API) should assume.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/spikes/2026-08-28-runtime-spikes.md
git commit -m "runtime: spike findings — harness tier, Ollama tools, AI SDK caching/thinking"
```

---

## Self-review

**Spec coverage (step 1 of the build order):** three interfaces — Task 1; fs `VaultStore` — Task 3; vault tool set — Task 4; `Tools` registry + subprocess — Task 5; router — Task 6; in-process MCP — Tasks 7 + 8; stdio MCP for Codex — Tasks 7 + 9; harness providers — Tasks 8, 9; direct provider — Task 10; CLI to exercise a step — Task 11; spikes 9.1–9.3 — Task 12. Not in this plan (by design): counsel loop, flow engine, HTTP API, UI, plugin adapter.

**Placeholder scan:** none. The "check the installed SDK's type names" notes are deliberate: the three SDKs move weekly, and the plan pins the intent (tool restriction, structured output, event mapping) rather than a field name that may have shifted.

**Type consistency:** `runToolDef(tools, name, input, tenant)` is used in Tasks 4, 7, 10 with the same signature defined in Task 2. `toMcpTools(tools, tenant)` (Task 7) is used in Tasks 8 and 9 and `stdio.ts`. `StepEvent` shapes match across the fake, both harness mappers, and the direct provider. `Capabilities.auth` values (`subscription | apikey | local`) match the router test.
