#!/usr/bin/env bun
// Serves the runtime's tools over MCP stdio. Used by the Codex harness
// (Codex cannot host an in-process MCP server), which is why this is a
// separate process and not a function call: everything it needs about the
// caller's run arrives as environment variables.
//
// Env:
//   COUNSEL_VAULT       (required) the vault root.
//   COUNSEL_TENANT      the tenant; defaults to `default`.
//   COUNSEL_PLUGIN_ROOT where `primitives/` and `scripts/` live; defaults to
//                       this file's own repo root, correct in a normal install.
//   COUNSEL_THREAD_ID   the thread a proposal belongs to. Without it there is
//                       nowhere to record one, so `propose_update` is not
//                       offered and the knowledge-system paths stay read-only
//                       for this run.
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FsVaultStore } from '../vault/fs-store';
import { guardedVaultTools } from '../vault/vault-tools';
import { readVaultConfig } from '../vault/resolve-root';
import { registerOnServer, toMcpTools } from './bridge';
import { ToolRegistry } from '../tools/registry';
import { builtinTools } from '../tools/builtin';
import { ThreadStore } from '../threads/store';
import { readPrimitiveTool } from '../loop/primitives';
import { proposeUpdateTool } from '../loop/proposals';
import { DEFAULT_TENANT, type ToolDef } from '../core/types';

const vault = process.env.COUNSEL_VAULT;
if (!vault) {
  console.error('COUNSEL_VAULT is required');
  process.exit(2);
}

const tenant = process.env.COUNSEL_TENANT ?? DEFAULT_TENANT;
const pluginRoot = process.env.COUNSEL_PLUGIN_ROOT ?? resolve(import.meta.dir, '../../..');
const threadId = process.env.COUNSEL_THREAD_ID;

const store = new FsVaultStore(vault);

const registry = new ToolRegistry();
for (const t of builtinTools({ vaultRoot: vault, repoRoot: pluginRoot })) registry.register(t);

// The same tool set the in-process loop assembles (`counsel-loop.ts`'s
// `stepTools`), so the Codex tier is not a second-class citizen: the guarded
// vault tools, `read_primitive`, and — when a thread is in play —
// `propose_update`, which is the only way through the `remember` gate.
const tools: ToolDef[] = [
  ...guardedVaultTools(store, readVaultConfig(vault)),
  readPrimitiveTool(pluginRoot) as ToolDef,
  ...(threadId ? [proposeUpdateTool(new ThreadStore(vault), store, threadId, tenant) as ToolDef] : []),
  ...registry.available(),
];

const specs = toMcpTools(tools, tenant);
const server = new McpServer({ name: 'counsel', version: '0.1.0' });
registerOnServer(server, specs);
await server.connect(new StdioServerTransport());
