import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile, appendFile, lstat, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { Entry, Hit, Tenant, VaultStore, Version } from '../core/types';
import { VaultConflictError } from '../core/types';

export type SearchFn = (query: string, root: string) => Promise<Hit[]>;

/** The store's own directory inside the vault root: version history, and
 * anything the runtime adds later. Not reachable through the public API. */
export const RESERVED_DIR = '.counsel';

/** Directory entries that are never a user's knowledge: the runtime's own
 * `.counsel/` (any casing), dotfiles and dotdirs (`.DS_Store`, `.git*`,
 * `.obsidian`), and `node_modules`. ONE predicate, used by both `list()` and
 * `fsSearch`'s walk, so the tree and the search can never disagree about
 * what a vault holds (redesign spec §4). */
export function isJunkName(name: string): boolean {
  return name.startsWith('.') || name.toLowerCase() === RESERVED_DIR || name === 'node_modules';
}

export function hashContent(content: string): Version {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export class FsVaultStore implements VaultStore {
  private readonly root: string;
  private readonly searchFn: SearchFn;

  constructor(root: string, opts: { search?: SearchFn } = {}) {
    this.root = resolve(root);
    this.searchFn = opts.search ?? (async () => []);
  }

  // Local runtime has one tenant; the parameter is threaded for hosted later.
  private abs(_tenant: Tenant, path: string): string {
    // Vault paths are forward-slash only, on every host OS — see
    // `normalizeVaultPath` in `knowledge-paths.ts`, which enforces the same
    // rule so a knowledge-path check can never disagree with what this store
    // actually resolves. On a Windows host, `resolve`/`relative` below use
    // `path.win32` and would otherwise treat `practice\x.md` as a path
    // *inside* `practice/`, silently reinterpreting a backslash as a
    // directory separator that the guard never saw.
    if (path.includes('\\')) throw new Error(`path outside vault: backslashes are not allowed: ${path}`);
    const full = resolve(this.root, path);
    const rel = relative(this.root, full);
    const head = rel.split(sep)[0];
    // Comparing the first *segment* is the whole escape check. The former
    // `rel.startsWith('..')` clause added nothing to it and was wrong on its
    // own terms: it rejected legitimate root files whose name merely begins
    // with two dots, e.g. `..foo.md`.
    if (head === '..') throw new Error(`path outside vault: ${path}`);
    // `.counsel/` is the store's own bookkeeping (version history). It is
    // inside the vault root, so the escape check above does not cover it, and
    // a model that can write there can rewrite or erase the audit trail its
    // own writes are recorded in. `list` already hides it; this closes read
    // and write too. `historyFile` builds its paths directly and so is
    // unaffected.
    // Case-insensitively: APFS and NTFS are case-INsensitive, so `.Counsel/`
    // and `.counsel/` are the same directory on the hosts this actually runs
    // on. A case-sensitive compare would let `.Counsel/history/...` through
    // to rewrite the very audit trail this ban exists to protect. Rejecting
    // `.Counsel` on a case-sensitive filesystem too is a harmless
    // over-rejection — nothing legitimate lives there.
    if (head?.toLowerCase() === RESERVED_DIR) throw new Error(`reserved path: ${path}`);
    this.assertInsideRealRoot(full, path);
    return full;
  }

  /**
   * The lexical check above proves the *spelling* stays inside the vault; it
   * says nothing about where the filesystem actually points. A symlink at
   * `matters/acme/notes.md` → `~/.ssh/id_rsa` spells clean and reads
   * someone's key. So the resolved path is checked again against the real
   * root, following links.
   *
   * A path that does not exist yet (every new write) has no real path of its
   * own, so the nearest existing ancestor is checked instead — that is the
   * directory the file would be created in, and a symlinked directory is the
   * escape that matters for writes.
   *
   * The `.counsel/` ban is re-applied here for the same reason. The lexical
   * check in `abs()` only sees the path's FIRST segment, so a symlink at
   * `matters/x` → `../.counsel/threads` spells clean and still lands the read
   * or write squarely on the audit trail the ban exists to protect. Landing
   * inside the vault is not enough; it has to land outside `.counsel/` too.
   */
  private assertInsideRealRoot(full: string, path: string): void {
    let realRoot: string;
    try {
      realRoot = realpathSync(this.root);
    } catch {
      // No vault root on disk: nothing can be inside it, and every real
      // operation is about to fail with ENOENT anyway. The lexical check
      // stands on its own.
      return;
    }
    let existing = full;
    while (!existsSync(existing)) {
      const parent = dirname(existing);
      if (parent === existing) return;
      existing = parent;
    }
    const real = realpathSync(existing);
    if (real !== realRoot && !real.startsWith(realRoot + sep)) {
      throw new Error(`path outside vault (symlink): ${path}`);
    }
    // Case-insensitively, like `abs()`: on APFS and NTFS `.Counsel` and
    // `.counsel` are the same directory, and only this path's own segments
    // vary in case — `realRoot` is a shared literal prefix on both sides, so
    // lowercasing the whole string cannot make two different roots collide.
    const reserved = join(realRoot, RESERVED_DIR).toLowerCase();
    const lowered = real.toLowerCase();
    if (lowered === reserved || lowered.startsWith(reserved + sep)) {
      throw new Error(`reserved path (symlink): ${path}`);
    }
  }

  private historyFile(tenant: Tenant, path: string): string {
    return join(this.root, RESERVED_DIR, 'history', tenant, `${path}.jsonl`);
  }

  async read(tenant: Tenant, path: string): Promise<string> {
    return readFile(this.abs(tenant, path), 'utf8');
  }

  async version(tenant: Tenant, path: string): Promise<Version | null> {
    try {
      return hashContent(await this.read(tenant, path));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async write(tenant: Tenant, path: string, content: string, opts: { expectedVersion?: Version | null } = {}): Promise<Version> {
    const full = this.abs(tenant, path);
    if (opts.expectedVersion !== undefined) {
      const actual = await this.version(tenant, path);
      if (opts.expectedVersion === null) {
        // The proposal was made against a path that didn't exist yet; a
        // write in the meantime — by anyone — is a conflict too.
        if (actual !== null) throw new VaultConflictError(path, 'missing', actual);
      } else if (actual !== opts.expectedVersion) {
        throw new VaultConflictError(path, opts.expectedVersion, actual ?? 'missing');
      }
    }
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, 'utf8');
    const v = hashContent(content);
    const hf = this.historyFile(tenant, path);
    await mkdir(dirname(hf), { recursive: true });
    await appendFile(hf, JSON.stringify({ version: v, at: new Date().toISOString() }) + '\n', 'utf8');
    return v;
  }

  async list(tenant: Tenant, dir: string): Promise<Entry[]> {
    const full = this.abs(tenant, dir);
    const names = await readdir(full);
    const out: Entry[] = [];
    for (const name of names) {
      if (isJunkName(name)) continue;
      // `lstat`, and per-entry: exactly what `fsSearch`'s walk does, for the
      // same reasons. `stat` FOLLOWS a link, so one dangling symlink threw
      // ENOENT and failed the whole listing — which `vaultOverview` then read
      // as "the directory is empty", so a vault with matters reported none.
      // EACCES, EPERM and ELOOP (a self-referential link) failed identically.
      // One bad entry must cost that entry, never the directory.
      let s;
      try {
        s = await lstat(join(full, name));
      } catch {
        continue;
      }
      // A symlink is skipped outright, so `list` and `fsSearch` agree about
      // what the vault holds. Listing one leaked the TARGET's `mtimeMs` and
      // `size` into the tree even when the target sat outside the vault —
      // reading through it was already blocked, but the metadata was not.
      if (s.isSymbolicLink()) continue;
      out.push({
        path: join(dir, name),
        kind: s.isDirectory() ? 'dir' : 'file',
        mtimeMs: s.mtimeMs,
        size: s.size,
      });
    }
    return out;
  }

  async mtime(tenant: Tenant, path: string): Promise<number | null> {
    try {
      return (await stat(this.abs(tenant, path))).mtimeMs;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async search(tenant: Tenant, query: string): Promise<Hit[]> {
    void tenant;
    return this.searchFn(query, this.root);
  }

  async history(tenant: Tenant, path: string): Promise<Version[]> {
    this.abs(tenant, path); // Validate path against vault root
    try {
      const text = await readFile(this.historyFile(tenant, path), 'utf8');
      return text.trim().split('\n').filter(Boolean).map(l => (JSON.parse(l) as { version: Version }).version).reverse();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }
}
