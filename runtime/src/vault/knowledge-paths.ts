import type { VaultConfig } from './resolve-root';

/** Vault-relative path prefixes that hold Counsel OS knowledge-system content,
 * as opposed to matter workspaces. `entities_path` is config-driven; the rest
 * are fixed. */
function knowledgePrefixes(cfg: VaultConfig): string[] {
  return ['practice/', 'memory/', 'law/', `${cfg.entitiesPath}/`];
}

/** True when `path` (vault-relative) falls under a knowledge-system directory:
 * `practice/`, `memory/`, `law/`, or the configured `{entitiesPath}/`. */
export function isKnowledgePath(path: string, cfg: VaultConfig): boolean {
  return knowledgePrefixes(cfg).some(prefix => path.startsWith(prefix));
}
