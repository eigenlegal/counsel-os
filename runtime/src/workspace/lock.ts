import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { Database } from 'bun:sqlite';

const alreadyRunning = 'This workspace is already running. Use its existing browser link or stop it before opening another server.';

/** A dedicated SQLite file supplies an OS-backed exclusive lock. It is never
 * unlinked: replacing its inode would let two launchers lock different files.
 * This transaction holds no workspace records and releases on process death.
 * https://www.sqlite.org/lang_transaction.html#deferred_immediate_and_exclusive_transactions */
function launcherMutex(path: string): Database {
  try { closeSync(openSync(path, 'wx', 0o600)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Workspace launcher lock needs inspection: ${path}`);
  const db = new Database(path, { create: false, readwrite: true });
  try { db.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE'); return db; }
  catch (error) {
    db.close();
    if (['SQLITE_BUSY', 'SQLITE_LOCKED'].includes((error as { code?: string }).code ?? '')) throw new Error(alreadyRunning);
    throw error;
  }
}

/** Prevent a second launcher recovering/interfering with live responses. */
export function lockWorkspace(databasePath: string): () => void {
  if (existsSync(join(dirname(databasePath), '.restore-in-progress')))
    throw new Error(
      'This restored folder is incomplete. Restore the backup again to create a new, verified copy.',
    );
  const path = `${databasePath}.lock`;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  // Serialize stale-PID recovery before inspecting or removing the legacy PID
  // file. PID-only read/probe/unlink races could otherwise erase a new owner.
  const mutex = launcherMutex(`${databasePath}.launcher-lock.sqlite3`);
  try {
  for (let attempt = 0; attempt < 2; attempt++) {
    let fd: number;
    try {
      fd = openSync(path, 'wx', 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error(`Workspace lock needs inspection: ${path}`);
      const pid = Number(readFileSync(path, 'utf8'));
      if (!Number.isInteger(pid) || pid <= 0)
        throw new Error(`Workspace lock needs inspection: ${path}`);
      try {
        process.kill(pid, 0);
      } catch (probe) {
        if ((probe as NodeJS.ErrnoException).code === 'ESRCH') {
          unlinkSync(path);
          continue;
        }
      }
      throw new Error(alreadyRunning);
    }
    try {
      writeFileSync(fd, String(process.pid));
    } finally {
      closeSync(fd);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      try {
        if (existsSync(path) && !lstatSync(path).isSymbolicLink() && readFileSync(path, 'utf8') === String(process.pid)) unlinkSync(path);
      } finally { mutex.close(); }
    };
  }
  throw new Error('Could not acquire the workspace lock.');
  } catch (error) { mutex.close(); throw error; }
}
