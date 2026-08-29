import { z } from 'zod';
import type { ToolDef, VaultStore } from '../core/types';
import { isKnowledgePath, normalizeVaultPath } from './knowledge-paths';
import type { VaultConfig } from './resolve-root';

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

/** Vault-relative knowledge-system directories, for user-facing text (tool
 * descriptions, error messages) — the fixed three plus the configured
 * entities dir, matching `isKnowledgePath`'s own prefix list. */
function knowledgeDirsList(cfg: VaultConfig): string {
  return `practice/, memory/, law/, ${cfg.entitiesPath}/`;
}

/**
 * Same tools as `vaultTools`, except `vault_write` refuses knowledge-system
 * paths (`practice/`, `memory/`, `law/`, the configured entities dir — see
 * `isKnowledgePath`). The `remember` gate: those writes must go through
 * `propose_update` and founder/user approval; matter paths stay directly
 * writable.
 *
 * Every path argument (`vault_write`'s `path`, and — for consistency, since
 * a normalized path is what actually reaches the store — `vault_read`'s
 * `path` and `vault_list`'s `dir`) is run through `normalizeVaultPath` first,
 * so a spelling like `./practice/x.md` or `matters/../practice/x.md` can't
 * be used to dodge the knowledge-path check that a plain string-prefix test
 * would miss.
 */
export function guardedVaultTools(store: VaultStore, cfg: VaultConfig): ToolDef[] {
  return vaultTools(store).map(tool => {
    if (tool.name === 'vault_write') {
      const write = tool as ToolDef<{ path: string; content: string; expectedVersion?: string }, { version: string }>;
      return {
        ...write,
        description: `${write.description} Knowledge-system paths (${knowledgeDirsList(cfg)}) must go through propose_update instead.`,
        execute: async (input: { path: string; content: string; expectedVersion?: string }, ctx) => {
          const path = normalizeVaultPath(input.path);
          if (isKnowledgePath(path, cfg)) {
            throw new Error(`${path} is a knowledge-system path (${knowledgeDirsList(cfg)}) — use propose_update instead of vault_write.`);
          }
          return write.execute({ ...input, path }, ctx);
        },
      };
    }
    if (tool.name === 'vault_read') {
      const read = tool as ToolDef<{ path: string }, { content: string; version: string | null }>;
      return {
        ...read,
        execute: async (input: { path: string }, ctx) => read.execute({ ...input, path: normalizeVaultPath(input.path) }, ctx),
      };
    }
    if (tool.name === 'vault_list') {
      const list = tool as ToolDef<{ dir: string }, unknown>;
      return {
        ...list,
        execute: async (input: { dir: string }, ctx) => list.execute({ ...input, dir: normalizeVaultPath(input.dir) }, ctx),
      };
    }
    return tool;
  });
}
