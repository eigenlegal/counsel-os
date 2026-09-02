/**
 * `counsel-os eval import <set>`: fetch a benchmark (or reuse the raw
 * download), build its fixtures, write the set's vault, and record the
 * license. The layout under `dest` (default `evals/benchmarks/`, which the
 * repo ignores):
 *
 *   <dest>/<set>/raw/…             the download, reused unless --refresh
 *   <dest>/<set>/fixtures/*.json   v2 fixtures, one per benchmark task
 *   <dest>/<set>/vaults/<set>/     the vault every fixture of the set runs in:
 *                                  a marked config.md, the practice seed,
 *                                  the documents under matters/<set>/
 *   <dest>/LICENSES.md             every imported set's license + attribution
 *
 * The fixtures directory and the vault are rebuilt on each import so a
 * smaller `--subset` never leaves stale files behind; the raw cache is not.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { ContentSource } from '../../content/source';
import { parseFixture, type FixtureSource } from '../fixture';
import type { BenchmarkFile, BenchmarkLoader } from './types';
import { NotRedistributableError } from './types';

export interface ImportOptions {
  loader: BenchmarkLoader;
  dest: string;
  subset?: number;
  tasks?: string[];
  refresh?: boolean;
  /** The shipped content, for the practice seed the vault carries. */
  content: ContentSource;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

export interface ImportReport {
  set: string;
  fixtures: number;
  /** `documents[]` entries across the set's fixtures. */
  items: number;
  /** Files written under the vault's `matters/`. */
  vaultDocuments: number;
  fixturesDir: string;
  vaultDir: string;
  licensesPath: string;
  fromCache: boolean;
}

const SEED = ['knowledge/practice-seed/profile.md', 'knowledge/practice-seed/standards', 'knowledge/practice-seed/methods', 'knowledge/practice-seed/library', 'knowledge/practice-seed/reference'];

function walk(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, base));
    else out.push(relative(base, p));
  }
  return out;
}

/** What a cached download covers, beside it. Without this, a later import
 * of MORE tasks reuses the narrower download and silently builds less. */
const CACHE_INDEX = '.import.json';

function readCache(rawDir: string, tasks: string[] | undefined): BenchmarkFile[] | null {
  if (!existsSync(rawDir)) return null;
  const files = walk(rawDir).filter(p => p !== CACHE_INDEX);
  if (files.length === 0) return null;
  let held: string[] | null = null;
  try {
    held = (JSON.parse(readFileSync(join(rawDir, CACHE_INDEX), 'utf8')) as { tasks: string[] | null }).tasks;
  } catch {
    // No index (an older cache): its coverage is unknown, so only a
    // download of everything can be reused for everything.
    return tasks === undefined ? null : null;
  }
  // `null` held means the download covered every task.
  if (held !== null && (tasks === undefined || tasks.some(t => !held!.includes(t)))) return null;
  return files.map(path => ({ path, bytes: new Uint8Array(readFileSync(join(rawDir, path))) }));
}

function writeFile(path: string, data: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

/** The practice seed under `practice/`, the way `init` lays it out. */
export function writePracticeSeed(vaultDir: string, content: ContentSource): number {
  let n = 0;
  for (const root of SEED) {
    for (const path of content.list(root)) {
      const rel = path.replace(/^knowledge\/practice-seed\//, '');
      writeFile(join(vaultDir, 'practice', rel), content.read(path));
      n += 1;
    }
  }
  return n;
}

export async function importBenchmark(opts: ImportOptions): Promise<ImportReport> {
  const { loader } = opts;
  const log = opts.log ?? (() => {});
  if (!loader.redistributable) throw new NotRedistributableError(loader);
  const setDir = join(opts.dest, loader.id);
  const rawDir = join(setDir, 'raw');
  const fixturesDir = join(setDir, 'fixtures');
  const vaultDir = join(setDir, 'vaults', loader.id);

  // `--tasks` names tasks THIS loader has. It reaches a file path in the raw
  // cache, so an unknown value is refused before anything is fetched or
  // written, and a set that ignores the flag says so rather than quietly
  // importing everything.
  if (opts.tasks !== undefined && opts.tasks.length > 0) {
    // The set that cannot be narrowed says so first: "no such task" would
    // be a true but unhelpful answer to `--tasks governing_law` on CUAD.
    if (loader.tasksSelectable === false) throw new Error(`${loader.name} imports as one set; --tasks does not apply to it.`);
    const unknown = opts.tasks.filter(t => !loader.tasks.includes(t));
    if (unknown.length > 0) throw new Error(`${loader.name}: no such task${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);
  }

  let files = opts.refresh === true ? null : readCache(rawDir, opts.tasks);
  const fromCache = files !== null;
  if (files === null) {
    files = await loader.fetch({ ...(opts.tasks === undefined ? {} : { tasks: opts.tasks }), ...(opts.fetchImpl === undefined ? {} : { fetchImpl: opts.fetchImpl }), log });
    rmSync(rawDir, { recursive: true, force: true });
    for (const f of files) {
      // A downloaded file names its own path. Same guard as the vault write
      // below: nothing lands outside the cache.
      if (f.path.startsWith('/') || f.path.split('/').some(seg => seg === '..' || seg === '')) throw new Error(`${loader.name}: refusing to cache outside ${rawDir}: ${f.path}`);
      writeFile(join(rawDir, f.path), f.bytes);
    }
    writeFile(join(rawDir, CACHE_INDEX), `${JSON.stringify({ tasks: opts.tasks ?? null })}\n`);
    log(`cached ${files.length} file${files.length === 1 ? '' : 's'} under ${rawDir}`);
  } else {
    log(`using the cached download under ${rawDir} (pass --refresh to fetch again)`);
  }

  const built = loader.toFixtures(files, { ...(opts.subset === undefined ? {} : { subset: opts.subset }), ...(opts.tasks === undefined ? {} : { tasks: opts.tasks }) });
  const fixtures = built.fixtures.map(raw => parseFixture(raw, `${loader.id} fixture ${String((raw as { id?: unknown }).id ?? '?')}`));
  if (fixtures.length === 0) throw new Error(`${loader.name}: nothing to import${opts.tasks === undefined ? '' : ` for tasks ${opts.tasks.join(', ')}`}`);
  for (const f of fixtures) if (f.vault !== loader.id) throw new Error(`${loader.name}: fixture ${f.id} names vault ${String(f.vault)}, expected ${loader.id}`);

  rmSync(fixturesDir, { recursive: true, force: true });
  for (const f of fixtures) writeFile(join(fixturesDir, `${f.id}.json`), `${JSON.stringify(f, null, 2)}\n`);

  rmSync(vaultDir, { recursive: true, force: true });
  writeFile(join(vaultDir, 'config.md'), '# Counsel OS Configuration\n\ncounsel-os-config: true\nconfig_version: 1\nlegal_root: __VAULT_PATH__\n');
  writePracticeSeed(vaultDir, opts.content);
  mkdirSync(join(vaultDir, 'matters'), { recursive: true });
  mkdirSync(join(vaultDir, 'memory'), { recursive: true });
  for (const [path, text] of Object.entries(built.documents)) {
    if (path.startsWith('/') || path.split('/').some(s => s === '..' || s === '')) throw new Error(`${loader.name}: refusing to write outside the vault: ${path}`);
    writeFile(join(vaultDir, path), text);
  }

  const licensesPath = writeLicenses(opts.dest);
  const items = fixtures.reduce((n, f) => n + (f.documents?.length ?? 0), 0);
  return { set: loader.id, fixtures: fixtures.length, items, vaultDocuments: Object.keys(built.documents).length, fixturesDir, vaultDir, licensesPath, fromCache };
}

interface LicenseEntry {
  set: string;
  fixtures: number;
  items: number;
  licenses: string[];
  source?: FixtureSource;
}

/** What sits under `dest` now, read from the fixtures themselves so the
 * file reflects what is on disk, not what was asked for. */
export function importedSets(dest: string): LicenseEntry[] {
  if (!existsSync(dest)) return [];
  const out: LicenseEntry[] = [];
  for (const set of readdirSync(dest).sort()) {
    const dir = join(dest, set, 'fixtures');
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const entry: LicenseEntry = { set, fixtures: 0, items: 0, licenses: [] };
    for (const name of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      const f = parseFixture(JSON.parse(readFileSync(join(dir, name), 'utf8')), `${set}/fixtures/${name}`);
      entry.fixtures += 1;
      entry.items += f.documents?.length ?? 0;
      if (entry.source === undefined && f.source !== undefined) entry.source = f.source;
      if (f.source?.license !== undefined && !entry.licenses.includes(f.source.license)) entry.licenses.push(f.source.license);
    }
    if (entry.fixtures > 0) out.push(entry);
  }
  return out;
}

export function renderLicenses(entries: LicenseEntry[], now = new Date()): string {
  const lines = [
    '# Imported benchmarks — licenses and attribution',
    '',
    `Generated by \`counsel-os eval import\` on ${now.toISOString().slice(0, 10)}. Nothing under this directory is part of Counsel OS; each set is a local copy of a public benchmark under its own license, listed here so it travels with the data. The directory is git-ignored.`,
    '',
  ];
  if (entries.length === 0) lines.push('No benchmark is imported.', '');
  for (const e of entries) {
    lines.push(`## ${e.source?.name ?? e.set} (\`${e.set}\`)`, '');
    if (e.source?.url !== undefined) lines.push(`- Source: ${e.source.url}`);
    lines.push(`- License: ${e.licenses.length === 0 ? 'not recorded' : e.licenses.join('; ')}`);
    if (e.source?.attribution !== undefined) lines.push(`- Attribution: ${e.source.attribution}`);
    lines.push(`- Imported: ${e.fixtures} fixture${e.fixtures === 1 ? '' : 's'}, ${e.items} item${e.items === 1 ? '' : 's'}`, '');
  }
  return lines.join('\n');
}

export function writeLicenses(dest: string, now = new Date()): string {
  const path = join(dest, 'LICENSES.md');
  writeFile(path, renderLicenses(importedSets(dest), now));
  return path;
}
