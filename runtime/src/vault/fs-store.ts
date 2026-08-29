import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, appendFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { Entry, Hit, Tenant, VaultStore, Version } from '../core/types';
import { VaultConflictError } from '../core/types';

export type SearchFn = (query: string, root: string) => Promise<Hit[]>;

/** The store's own directory inside the vault root: version history, and
 * anything the runtime adds later. Not reachable through the public API. */
const RESERVED_DIR = '.counsel';

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
    if (head === RESERVED_DIR) throw new Error(`reserved path: ${path}`);
    return full;
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
      if (name === RESERVED_DIR) continue;
      const s = await stat(join(full, name));
      out.push({ path: join(dir, name), kind: s.isDirectory() ? 'dir' : 'file' });
    }
    return out;
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
