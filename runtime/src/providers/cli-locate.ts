/**
 * Where the vendor CLIs live on this machine (packaging spec §3.4). The
 * Claude tier runs the `claude` CLI and the ChatGPT tier the `codex` CLI;
 * neither is bundled into the binary (479 MB between them), so the runtime
 * finds what the user installed and hands the path to the SDK — which
 * otherwise resolves its own copy through `node_modules`, a directory a
 * compiled binary does not have.
 *
 * Order: `PATH`, then the places the vendors' installers put the binary
 * when the shell's PATH does not carry them (a GUI-launched app inherits a
 * minimal PATH). Cached per process: a serve resolves each CLI once.
 */
import { accessSync, constants, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

export type VendorCli = 'claude' | 'codex';

export interface LocateOptions {
  env?: NodeJS.ProcessEnv;
  home?: string;
  /** Tests: the executability check. */
  isExecutable?: (path: string) => boolean;
}

function executable(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The directories the vendors' installers use, in the order they are
 * tried after PATH. `~/.claude/local` is the native Claude installer's
 * home; the rest are Homebrew, the classic prefix, XDG's user bin, and
 * npm's global bin under the user's prefix. */
export function knownCliDirs(home: string, env: NodeJS.ProcessEnv): string[] {
  const dirs = [
    join(home, '.claude', 'local'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    join(home, '.local', 'bin'),
    join(home, '.npm-global', 'bin'),
    join(home, '.bun', 'bin'),
  ];
  if (env.NPM_CONFIG_PREFIX) dirs.push(join(env.NPM_CONFIG_PREFIX, 'bin'));
  return dirs;
}

/** Every directory to search, PATH first. */
export function searchDirs(opts: LocateOptions = {}): string[] {
  const env = opts.env ?? process.env;
  const home = opts.home ?? env.HOME ?? homedir();
  const fromPath = (env.PATH ?? '').split(delimiter).filter(d => d !== '');
  const out: string[] = [];
  for (const d of [...fromPath, ...knownCliDirs(home, env)]) if (!out.includes(d)) out.push(d);
  return out;
}

/** The CLI's absolute path, or `null` when it is not on this machine. */
export function locateCli(name: VendorCli, opts: LocateOptions = {}): string | null {
  const isExecutable = opts.isExecutable ?? executable;
  for (const dir of searchDirs(opts)) {
    const candidate = join(dir, name);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

const cache = new Map<VendorCli, string | null>();

/** `locateCli`, resolved once per process. `undefined` (not `null`) when
 * absent, so a caller can spread it straight into an SDK option. */
export function locatedCli(name: VendorCli): string | undefined {
  if (!cache.has(name)) cache.set(name, locateCli(name));
  return cache.get(name) ?? undefined;
}

/** Tests only. */
export function resetLocatedCliForTests(): void {
  cache.clear();
}
