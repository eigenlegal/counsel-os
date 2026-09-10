/** Keep CLI-renewed credentials, not CLI history/config, across isolated turns.
 * The operator's login is read-only and remains the authority: logout, account
 * switch or a changed source file invalidates our cached generation. */
import { createHash } from 'node:crypto';
import { chmodSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const MAX_BYTES = 100_000;
function privateDirectory(path: string) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isDirectory() || (process.getuid && info.uid !== process.getuid())) throw new Error('Codex credential directory needs inspection.');
  chmodSync(path, 0o700);
}
function read(path: string): string {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isFile() || info.size > MAX_BYTES) throw new Error('Codex sign-in file needs inspection.');
  return readFileSync(path, 'utf8');
}
function credential(text: string): { auth_mode: 'chatgpt'; tokens: Record<string, unknown>; [key: string]: unknown } {
  const value = JSON.parse(text);
  if (value?.auth_mode !== 'chatgpt' || !value.tokens || typeof value.tokens !== 'object' || Array.isArray(value.tokens)) throw new Error('ChatGPT login required.');
  return value;
}
const sameAccount = (a: ReturnType<typeof credential>, b: ReturnType<typeof credential>) =>
  a.tokens.account_id === b.tokens.account_id;

/** Serialize this application's use of one login, including other workspaces.
 * SQLite's OS lock is released after host death; its inode is never replaced.
 * Waiting is cancellable and bounded. No auth data enters the lock database. */
export async function acquireCodexCredentials(sourceHome: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const canonical = realpathSync(sourceHome), sourcePath = join(canonical, 'auth.json');
  const base = join(process.env.HOME ?? homedir(), '.counsel', 'connections');
  privateDirectory(base);
  const directory = join(base, `codex-${hash(canonical).slice(0, 24)}`);
  privateDirectory(directory);
  const path = join(directory, 'credentials.json'), lock = join(directory, 'lease.sqlite3');
  try { closeSync(openSync(lock, 'wx', 0o600)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  read(lock); // Regular, bounded, non-symlink file before SQLite opens it.
  const db = new Database(lock, { create: false, readwrite: true });
  db.exec('PRAGMA busy_timeout=0');
  const deadline = Date.now() + 120_000;
  try {
    for (;;) {
      signal.throwIfAborted();
      try { db.exec('BEGIN EXCLUSIVE'); break; }
      catch (error) {
        if (!['SQLITE_BUSY', 'SQLITE_LOCKED'].includes((error as { code?: string }).code ?? '')) throw error;
        if (Date.now() >= deadline) throw new Error('Another response is using this Codex sign-in. Wait for it to finish, then retry.');
        await Bun.sleep(50);
      }
    }
    const discard = () => { if (existsSync(path)) { read(path); unlinkSync(path); } };
    let sourceText: string, sourceAuth: ReturnType<typeof credential>;
    try { sourceText = read(sourcePath); sourceAuth = credential(sourceText); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error instanceof Error && error.message === 'ChatGPT login required.')) discard();
      throw error;
    }
    const sourceHash = hash(sourceText);
    let selected = sourceText;
    if (existsSync(path)) {
      const cached = JSON.parse(read(path));
      if (cached.version === 1 && cached.sourceHash === sourceHash && typeof cached.auth === 'string') {
        const value = credential(cached.auth);
        if (sameAccount(sourceAuth, value)) selected = cached.auth;
        else discard();
      } else discard();
    }
    let lastHash = hash(selected), released = false;
    return {
      /** Only auth.json is seeded into each fresh, otherwise empty CLI home. */
      seed(home: string) { writeFileSync(join(home, 'auth.json'), selected, { mode: 0o600 }); chmodSync(join(home, 'auth.json'), 0o600); },
      /** Called at stream events and completion. Incomplete atomic CLI writes
       * are ignored until the next event. Never resurrect logout/account switch. */
      capture(home: string) {
        if (released) return;
        let text: string;
        try {
          text = read(join(home, 'auth.json'));
          const updated = credential(text);
          if (!sameAccount(sourceAuth, updated) || hash(read(sourcePath)) !== sourceHash || hash(text) === lastHash) return;
        } catch { return; }
        const temp = join(directory, `credentials-${crypto.randomUUID()}.tmp`);
        try {
          const file = openSync(temp, 'wx', 0o600);
          try { writeFileSync(file, JSON.stringify({ version: 1, sourceHash, auth: text })); fsyncSync(file); }
          finally { closeSync(file); }
          renameSync(temp, path);
          const folder = openSync(directory, 'r');
          try { fsyncSync(folder); } finally { closeSync(folder); }
          lastHash = hash(text);
        } finally { if (existsSync(temp)) unlinkSync(temp); }
      },
      release() { if (!released) { released = true; db.close(); } },
    };
  } catch (error) { db.close(); throw error; }
}
