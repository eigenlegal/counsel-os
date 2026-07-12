/**
 * Counsel OS browse — runtime file locations (state file, rolling logs)
 *
 * These live in a per-user 0700 directory (~/.counsel-os/browse) instead of
 * world-writable /tmp. The state file carries the daemon's bearer token: a
 * predictable /tmp path lets any other local user pre-create the file (or a
 * symlink) and read the token after the daemon truncates-and-writes into it,
 * then replay it against /command to exfiltrate imported session cookies.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PORT_OFFSET = 45600;

export function browsePort(env: NodeJS.ProcessEnv = process.env): number {
  return env.CONDUCTOR_PORT
    ? parseInt(env.CONDUCTOR_PORT, 10) - PORT_OFFSET
    : parseInt(env.BROWSE_PORT || '0', 10); // 0 = auto-scan
}

// Suffix isolates parallel instances (Conductor worktrees pin distinct ports).
export function instanceSuffix(env: NodeJS.ProcessEnv = process.env): string {
  const port = browsePort(env);
  return port ? `-${port}` : '';
}

export function runtimeDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.BROWSE_RUNTIME_DIR || path.join(os.homedir(), '.counsel-os', 'browse');
}

/**
 * Create the runtime dir owner-only. mkdirSync's mode applies only on
 * creation, so an existing dir is re-tightened to 0700 explicitly.
 */
export function ensureRuntimeDir(env: NodeJS.ProcessEnv = process.env): string {
  const dir = runtimeDir(env);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  return dir;
}

export function stateFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.BROWSE_STATE_FILE || path.join(runtimeDir(env), `browse-server${instanceSuffix(env)}.json`);
}

export function logFilePath(
  kind: 'console' | 'network' | 'dialog',
  env: NodeJS.ProcessEnv = process.env,
): string {
  return path.join(runtimeDir(env), `browse-${kind}${instanceSuffix(env)}.log`);
}

/**
 * Write `contents` to `filePath` such that the data only ever lands in a file
 * this process created with mode 0600: any pre-existing file or symlink at the
 * path is removed first, and the create is exclusive ('wx' fails instead of
 * following a symlink planted between the unlink and the open).
 */
export function writeFileExclusive(filePath: string, contents: string): void {
  try { fs.unlinkSync(filePath); } catch {}
  fs.writeFileSync(filePath, contents, { mode: 0o600, flag: 'wx' });
}
