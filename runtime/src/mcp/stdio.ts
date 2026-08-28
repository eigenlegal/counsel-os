#!/usr/bin/env bun
// Serves the runtime's tools over MCP stdio. Used by the Codex harness
// (Codex cannot host an in-process MCP server). Env: COUNSEL_VAULT (required).
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FsVaultStore } from '../vault/fs-store';
import { vaultTools } from '../vault/vault-tools';
import { registerOnServer, toMcpTools } from './bridge';
import { ToolRegistry } from '../tools/registry';
import { builtinTools } from '../tools/builtin';
import { DEFAULT_TENANT } from '../core/types';

const vault = process.env.COUNSEL_VAULT;
if (!vault) {
  console.error('COUNSEL_VAULT is required');
  process.exit(2);
}

const store = new FsVaultStore(vault);
const repoRoot = resolve(import.meta.dir, '../../..');

const registry = new ToolRegistry();
for (const t of builtinTools({ vaultRoot: vault, repoRoot })) registry.register(t);

const specs = toMcpTools([...vaultTools(store), ...registry.available()], process.env.COUNSEL_TENANT ?? DEFAULT_TENANT);
const server = new McpServer({ name: 'counsel', version: '0.1.0' });
registerOnServer(server, specs);
await server.connect(new StdioServerTransport());
