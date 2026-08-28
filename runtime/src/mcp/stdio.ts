#!/usr/bin/env bun
// Serves the runtime's tools over MCP stdio. Used by the Codex harness
// (Codex cannot host an in-process MCP server). Env: COUNSEL_VAULT (required).
import { resolve, join } from 'node:path';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FsVaultStore } from '../vault/fs-store';
import { vaultTools } from '../vault/vault-tools';
import { registerOnServer, toMcpTools } from './bridge';
import { ToolRegistry } from '../tools/registry';
import { pythonScriptTool } from '../tools/subprocess';
import { DEFAULT_TENANT } from '../core/types';

const vault = process.env.COUNSEL_VAULT;
if (!vault) {
  console.error('COUNSEL_VAULT is required');
  process.exit(2);
}

const store = new FsVaultStore(vault);

const registry = new ToolRegistry();
registry.register(pythonScriptTool({
  name: 'docket_sweep',
  description: 'Sweep the vault for upcoming deadlines (read-only). Reads matter markdown files under <vault>/matters.',
  script: resolve(import.meta.dir, '../../../scripts/docket_sweep.py'),
  platforms: ['macos', 'linux', 'windows', 'hosted'],
  inputSchema: z.object({ days: z.number().int().positive().default(60) }),
  args: ({ days }) => [join(vault, 'matters'), '--window', String(days), '--format', 'json'],
  cwd: resolve(import.meta.dir, '../../..'),
}));

const specs = toMcpTools([...vaultTools(store), ...registry.available()], process.env.COUNSEL_TENANT ?? DEFAULT_TENANT);
const server = new McpServer({ name: 'counsel', version: '0.1.0' });
registerOnServer(server, specs);
await server.connect(new StdioServerTransport());
