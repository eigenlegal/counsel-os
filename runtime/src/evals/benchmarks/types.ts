/**
 * Public legal benchmarks as eval fixtures (routing-and-evals spec §8).
 *
 * A loader knows one benchmark: where it lives, what license it carries,
 * how to fetch its files, and how to turn them into v2 fixtures — one
 * fixture per benchmark task, one `documents[]` entry per item, every
 * fixture of a set sharing one vault. The import (`import.ts`) owns the
 * disk: raw cache, fixture files, the vault, `LICENSES.md`. Nothing here
 * ships benchmark text with the repo; the import writes under a
 * git-ignored directory and records the license next to it.
 */
import type { FixtureSource } from '../fixture';

export type BenchmarkId = 'legalbench' | 'cuad' | 'maud' | 'contract-nli' | 'biglaw-bench';

/** One downloaded file, named by its path under the set's raw cache. */
export interface BenchmarkFile {
  path: string;
  bytes: Uint8Array;
}

export interface FetchOptions {
  /** Which of the loader's tasks to fetch; all of them by default. */
  tasks?: string[];
  /** The `fetch` to use — tests pass a scripted one. */
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

export interface ToFixturesOptions {
  /** Keep the first `subset` items of each task (contracts, rows, NDAs). */
  subset?: number;
  /** Which of the loader's tasks to build; all present in the files by default. */
  tasks?: string[];
  /** Where a loader says what it skipped and why. */
  log?: (line: string) => void;
}

/** What a loader produces: fixture records (validated by `parseFixture`
 * before they are written) plus the files their tasks read from the vault,
 * keyed by vault-relative path. */
export interface BenchmarkFixtures {
  fixtures: Record<string, unknown>[];
  documents: Record<string, string>;
}

export interface BenchmarkLoader {
  id: BenchmarkId;
  name: string;
  url: string;
  /** The license as published; `null` when the publisher grants none. */
  license: string | null;
  attribution: string;
  /** Whether the license lets an import keep a local copy. A loader that
   * says `false` fetches nothing and explains why (`reason`). */
  redistributable: boolean;
  reason?: string;
  /** The tasks the loader can build — benchmark task names, categories, or
   * hypotheses; `fetch`/`toFixtures` accept a subset of these. */
  tasks: string[];
  /** `false` for a set that imports whole and cannot be narrowed: `--tasks`
   * is then refused rather than accepted and ignored. */
  tasksSelectable?: boolean;
  /** `true` when `fetch` pulls the whole set whatever `tasks` says — the
   * raw cache then covers every task, however narrow the request was. */
  downloadsWholeSet?: boolean;
  fetch(opts?: FetchOptions): Promise<BenchmarkFile[]>;
  toFixtures(files: BenchmarkFile[], opts?: ToFixturesOptions): BenchmarkFixtures;
}

/** Raised by a loader whose benchmark may not be copied. The message is
 * what the CLI prints: the reason and where to ask. */
export class NotRedistributableError extends Error {
  constructor(
    readonly loader: Pick<BenchmarkLoader, 'id' | 'name' | 'url' | 'reason'>,
  ) {
    super(`${loader.name} cannot be imported: ${loader.reason ?? 'its license does not permit a local copy'}. See ${loader.url}.`);
    this.name = 'NotRedistributableError';
  }
}

export function sourceOf(loader: BenchmarkLoader, license?: string): FixtureSource {
  return {
    kind: 'benchmark',
    name: loader.name,
    url: loader.url,
    ...(license === undefined ? loader.license === null ? {} : { license: loader.license } : { license }),
    attribution: loader.attribution,
  };
}

/** A fixture id part: lowercase, dashes, nothing else. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** FNV-1a, so a cut id keeps something of what was cut. */
function mark(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 4);
}

/**
 * A fixture id that fits: `<set>-<part>`, the part cut at `max` on a dash.
 *
 * A CUT id carries four characters of the whole part. Two MAUD questions in
 * one category ("Fiduciary exception: Board determination standard" and
 * "… trigger (No Shop)") slug to the same 60 characters, and an id is a
 * filename: the second import would have written over the first and
 * reported a count that included both.
 */
export function fixtureId(set: string, part: string, max = 60): string {
  const full = slug(part);
  let p = full;
  if (p.length > max) {
    const cut = p.lastIndexOf('-', max);
    p = `${p.slice(0, cut > 20 ? cut : max).replace(/-+$/, '')}-${mark(full)}`;
  }
  return p === '' ? set : `${set}-${p}`;
}

export function textOf(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

export function fileNamed(files: BenchmarkFile[], path: string): BenchmarkFile | undefined {
  return files.find(f => f.path === path);
}

export async function download(url: string, opts: FetchOptions = {}): Promise<Uint8Array> {
  const f = opts.fetchImpl ?? fetch;
  opts.log?.(`fetching ${url}`);
  const res = await f(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
