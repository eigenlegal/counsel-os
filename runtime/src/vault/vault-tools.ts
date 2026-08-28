import { z } from 'zod';
import type { ToolDef, VaultStore } from '../core/types';

// Every vault path is relative to the vault root, and an absolute-looking one
// is rejected by `FsVaultStore`. Models do not infer that: both Codex spike
// runs opened with `vault_list {"dir": "/"}` and burned a tool call recovering
// from `path outside vault: /` (spike 9.3-D/9.3-F). Say it in the description
// instead of paying for the recovery.
const RELATIVE = 'Path is relative to the vault root; use `.` for the root.';

export function vaultTools(store: VaultStore): ToolDef[] {
  const read: ToolDef<{ path: string }, { content: string; version: string | null }> = {
    name: 'vault_read',
    description: `Read a file from the vault. Returns its content and current version. ${RELATIVE}`,
    inputSchema: z.object({ path: z.string().describe(RELATIVE) }),
    execute: async ({ path }, { tenant }) => ({
      content: await store.read(tenant, path),
      version: await store.version(tenant, path),
    }),
  };
  const write: ToolDef<{ path: string; content: string; expectedVersion?: string }, { version: string }> = {
    name: 'vault_write',
    description: `Write a file in the vault. Pass expectedVersion (from vault_read) to avoid overwriting concurrent edits. ${RELATIVE}`,
    inputSchema: z.object({
      path: z.string().describe(RELATIVE),
      content: z.string(),
      expectedVersion: z.string().optional(),
    }),
    execute: async ({ path, content, expectedVersion }, { tenant }) => ({
      version: await store.write(tenant, path, content, { expectedVersion }),
    }),
  };
  const list: ToolDef<{ dir: string }, unknown> = {
    name: 'vault_list',
    description: `List files and directories under a vault directory. ${RELATIVE}`,
    inputSchema: z.object({ dir: z.string().describe(RELATIVE) }),
    execute: async ({ dir }, { tenant }) => store.list(tenant, dir),
  };
  const search: ToolDef<{ query: string }, unknown> = {
    name: 'vault_search',
    description: 'Search the vault. Returns paths with snippets, relative to the vault root.',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }, { tenant }) => store.search(tenant, query),
  };
  return [read, write, list, search] as ToolDef[];
}
