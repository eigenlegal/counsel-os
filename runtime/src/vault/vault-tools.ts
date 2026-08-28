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
