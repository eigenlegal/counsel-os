#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { FsVaultStore } from './vault/fs-store';
import { guardedVaultTools } from './vault/vault-tools';
import { readVaultConfig } from './vault/resolve-root';
import { ToolRegistry } from './tools/registry';
import { builtinTools } from './tools/builtin';
import { Router, parseRouterConfig } from './router/router';
import { buildProviders } from './providers/index';
import { DEFAULT_TENANT, isTerminal, type ModelProvider } from './core/types';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    vault: { type: 'string' },
    provider: { type: 'string' },
    task: { type: 'string' },
    schema: { type: 'string' },
    system: { type: 'string', default: 'You are counsel. Use the vault tools to answer. Be brief.' },
    session: { type: 'string' },      // resume a prior session/thread by id (Claude `resume` / Codex `resumeThread`)
    'codex-home': { type: 'string' }, // persistent CODEX_HOME so a resumed thread's isolated home survives across steps
    cwd: { type: 'string' },          // debug: pin the Claude harness's cwd (see docs/superpowers/spikes/2026-08-28-runtime-spikes.md, Step 2 — resume)
  },
});

const [cmd, ...rest] = positionals;
if (cmd !== 'step' || !values.vault || !values.provider || rest.length === 0) {
  console.error('usage: bun runtime/src/cli.ts step --vault <dir> --provider <id> [--task <name>] [--schema <json>] [--session <id>] [--codex-home <dir>] [--cwd <dir>] "<prompt>"');
  process.exit(2);
}

const vaultRoot = resolve(values.vault);
const repoRoot = resolve(import.meta.dir, '../..');
const store = new FsVaultStore(vaultRoot);
const registry = new ToolRegistry();
for (const t of builtinTools({ vaultRoot, repoRoot })) registry.register(t);

let provider: ModelProvider;
let outputSchema: z.ZodType | undefined;
try {
  const providers = buildProviders({
    ids: [values.provider],
    vaultRoot,
    ...(values.cwd ? { claudeCwd: resolve(values.cwd) } : {}),
    ...(values['codex-home'] ? { codexHomeDir: resolve(values['codex-home']) } : {}),
  });
  const router = new Router(parseRouterConfig(`default: ${values.provider}\n`), providers);
  // --task only has effect once a `tasks:` block exists in the router config;
  // this CLI always builds a bare `default: <provider>` config, so today it's a no-op.
  provider = router.resolve(values.task);
  outputSchema = values.schema
    ? z.fromJSONSchema(JSON.parse(readFileSync(values.schema, 'utf8')) as Record<string, unknown>)
    : undefined;
} catch (err) {
  console.log(JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
}

const tools = [...guardedVaultTools(store, readVaultConfig(vaultRoot)), ...registry.available()];
let exit = 1;
for await (const ev of provider.run({
  tenant: DEFAULT_TENANT,
  system: values.system!,
  messages: [{ role: 'user', content: rest.join(' ') }],
  tools,
  ...(outputSchema ? { outputSchema } : {}),
  ...(values.session ? { session: { id: values.session } } : {}),
})) {
  console.log(JSON.stringify(ev));
  if (isTerminal(ev)) exit = ev.type === 'done' ? 0 : 1;
}
process.exit(exit);
