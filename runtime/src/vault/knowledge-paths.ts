import { posix } from 'node:path';
import type { VaultConfig } from './resolve-root';

/**
 * Normalizes a vault-relative path the way `FsVaultStore` ultimately
 * resolves it, so a spelling like `./practice/x.md` or
 * `matters/../practice/x.md` can't be used to slip past a string-prefix
 * check (`isKnowledgePath`, the `vault_write` guard) that a plain
 * `path.startsWith(...)` would miss. Throws on anything that would escape
 * the vault root — absolute paths, or a path that still starts with `..`
 * after normalizing — mirroring `FsVaultStore.abs()`'s own escape check.
 */
export function normalizeVaultPath(path: string): string {
  let normalized = posix.normalize(path);
  if (normalized.startsWith('./')) normalized = normalized.slice(2);
  if (normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('path outside vault');
  }
  return normalized;
}

/** Vault-relative path prefixes that hold Counsel OS knowledge-system content,
 * as opposed to matter workspaces. `entities_path` is config-driven; the rest
 * are fixed. */
function knowledgePrefixes(cfg: VaultConfig): string[] {
  return ['practice/', 'memory/', 'law/', `${cfg.entitiesPath}/`];
}

/** True when `path` (vault-relative) falls under a knowledge-system directory:
 * `practice/`, `memory/`, `law/`, or the configured `{entitiesPath}/`. Path
 * spelling is normalized first (see `normalizeVaultPath`) so `./practice/x.md`
 * and `matters/../practice/x.md` are recognized the same as `practice/x.md`. */
export function isKnowledgePath(path: string, cfg: VaultConfig): boolean {
  const normalized = normalizeVaultPath(path);
  return knowledgePrefixes(cfg).some(prefix => normalized.startsWith(prefix));
}
