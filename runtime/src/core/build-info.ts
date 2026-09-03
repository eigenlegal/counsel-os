/**
 * What this PROCESS is running — not what is on disk.
 *
 * The distinction is the whole point. `serve` loads its code once, at
 * startup, so a server left running while the source moves under it goes on
 * answering with the catalog it was born with. That is exactly what
 * happened: a serve from the previous afternoon reported "ChatGPT does not
 * publish a model list" hours after that had been fixed, while handing the
 * browser a freshly built UI — new page, old runtime, and nothing on screen
 * to say so.
 *
 * A version number alone would not have caught it: both were 0.14.0. So
 * this reports when the process STARTED and, from a source checkout, the
 * commit it read — the two facts that actually differ.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { isCompiled } from './embedded';

export interface BuildInfo {
  /** The release this build belongs to. */
  version: string;
  /** ISO 8601. How old the running process is, which is how stale its code
   * may be. */
  startedAt: string;
  /** `binary` runs what it was compiled with and cannot drift; `source`
   * reads the checkout at startup and can. */
  source: 'binary' | 'source';
  /** The commit this process READ, from a source checkout. Absent for a
   * binary, and absent when the checkout is not a git repository. */
  commit?: string;
}

/**
 * The real git directory. In a WORKTREE, `.git` is a file holding
 * `gitdir: <path>` — the common case while this is being developed, and the
 * one where a stale process is most likely.
 */
function resolveGitDir(root: string): string | null {
  const dotGit = join(root, '.git');
  if (!existsSync(dotGit)) return null;
  if (statSync(dotGit).isDirectory()) return dotGit;
  const pointer = readFileSync(dotGit, 'utf8').trim();
  if (!pointer.startsWith('gitdir:')) return null;
  const target = pointer.slice('gitdir:'.length).trim();
  return isAbsolute(target) ? target : join(root, target);
}

/** Frozen at module load, which is the moment the code was read. */
const STARTED_AT = new Date().toISOString();

/** The repo root, for a checkout. `import.meta.dir` is `runtime/src/core`. */
function repoRoot(): string {
  return join(import.meta.dir, '..', '..', '..');
}

function readVersion(): string {
  // Bundled into the binary by the compile step; read from the checkout
  // otherwise. `release.sh` keeps this in step with the other manifests.
  try {
    const file = join(repoRoot(), 'VERSION');
    if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  } catch {
    // A version we cannot read is not a reason to fail to start.
  }
  return 'unknown';
}

function readCommit(): string | undefined {
  // Read from `.git` rather than shelling out: `git rev-parse` would report
  // the checkout's head NOW, which is the thing this is meant to detect
  // drifting away from.
  try {
    const gitDir = resolveGitDir(repoRoot());
    if (gitDir === null) return undefined;
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    const ref = head.startsWith('ref: ') ? head.slice(5).trim() : null;
    // Detached: HEAD is the commit itself.
    if (ref === null) return head.slice(0, 7);
    // A worktree keeps its own HEAD but shares the refs. Try its own
    // directory, then the shared one, then the packed file — which is where
    // the loose ref goes once `git gc` has run.
    const commonFile = join(gitDir, 'commondir');
    const common = existsSync(commonFile) ? join(gitDir, readFileSync(commonFile, 'utf8').trim()) : gitDir;
    for (const dir of [gitDir, common]) {
      const refFile = join(dir, ref);
      if (existsSync(refFile)) return readFileSync(refFile, 'utf8').trim().slice(0, 7);
    }
    const packed = readFileSync(join(common, 'packed-refs'), 'utf8');
    const line = packed.split('\n').find(l => l.endsWith(` ${ref}`));
    return line?.slice(0, 7);
  } catch {
    return undefined;
  }
}

let cached: BuildInfo | null = null;

export function buildInfo(): BuildInfo {
  if (cached !== null) return cached;
  const compiled = isCompiled();
  const commit = compiled ? undefined : readCommit();
  cached = {
    version: readVersion(),
    startedAt: STARTED_AT,
    source: compiled ? 'binary' : 'source',
    ...(commit === undefined ? {} : { commit }),
  };
  return cached;
}

/** Tests pin the values; a real process reads them once. */
export function resetBuildInfoForTests(): void {
  cached = null;
}
