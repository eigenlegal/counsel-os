import { posix } from 'node:path';
import type { VaultConfig } from './resolve-root';

/**
 * Normalizes a vault-relative path the way `FsVaultStore` ultimately
 * resolves it, so a spelling like `./practice/x.md` or
 * `matters/../practice/x.md` can't be used to slip past a string-prefix
 * check (`isKnowledgePath`, the `vault_write` guard) that a plain
 * `path.startsWith(...)` would miss. Throws on anything that would escape
 * the vault root — absolute paths, or a path that still starts with `..`
 * after normalizing.
 *
 * Vault paths are forward-slash only, on every host OS: a backslash is
 * rejected outright, before `posix.normalize` gets a chance to treat it as
 * one opaque path segment (which would hide `practice\x.md` from the
 * `practice/` prefix check here, while `FsVaultStore.abs()` on a Windows
 * host — using `path.win32` — resolves the very same string *inside*
 * `practice/`). This function and `FsVaultStore.abs()` enforce that
 * backslash rule independently, in the same words, so the two can never
 * disagree about which path is inside the vault.
 */
export function normalizeVaultPath(path: string): string {
  if (path.includes('\\')) throw new Error('path outside vault: backslashes are not allowed');
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
  // Case-insensitively, for the same reason `FsVaultStore.abs()` treats
  // `.Counsel` as reserved: APFS and NTFS are case-insensitive, so
  // `Practice/standards/x.md` IS `practice/standards/x.md` on the hosts this
  // runs on. A case-sensitive prefix test would let a model spell its way
  // around the `remember` gate and write a knowledge file with `vault_write`.
  const normalized = normalizeVaultPath(path).toLowerCase();
  return knowledgePrefixes(cfg).some(prefix => normalized.startsWith(prefix.toLowerCase()));
}
