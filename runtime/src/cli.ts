#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
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
  description: 'Sweep the vault for upcoming deadlines (read-only). Reads matter markdown files under <vault>/matters.',
  script: resolve(import.meta.dir, '../../scripts/docket_sweep.py'),
  platforms: ['macos', 'linux', 'windows', 'hosted'],
  inputSchema: z.object({ days: z.number().int().positive().default(60) }),
  args: ({ days }) => [join(vaultRoot, 'matters'), '--window', String(days), '--format', 'json'],
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
