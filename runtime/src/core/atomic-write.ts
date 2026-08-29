import { chmodSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface AtomicWriteOptions {
  /** The file's permissions. Always applied, never left to the umask: every
   * caller here writes something whose readership matters. */
  mode: number;
  /** The parent directory's permissions, when this call has to create it. */
  dirMode?: number;
}

/**
 * Writes `file` so a reader never sees a partial one, and never sees the
 * wrong mode.
 *
 * Atomic: a temp file plus `rename`, which is atomic within a directory, so
 * a concurrent reader gets either the old file or the new one. This matters
 * for everything under `<counselHome>` — the plugin adapter reads
 * `runtime.json` on every skill invocation, and a reload reads
 * `providers.yaml` while the server that owns it may be rewriting it.
 *
 * Mode-exact: `writeFileSync`'s `mode` applies only when it CREATES the
 * file, so a leftover temp file from a crashed run would keep its old
 * permissions and quietly publish the contents. `chmod` after the write
 * closes that, and writing a fresh inode and renaming over the destination
 * means the destination's own stale mode is replaced too.
 *
 * `data` is a `Buffer` or a string: a caller restoring a file it read must
 * be able to put the exact bytes back, without a decode/encode round trip
 * that would mangle anything not valid UTF-8.
 */
export function writeFileAtomic(file: string, data: Buffer | string, opts: AtomicWriteOptions): void {
  mkdirSync(dirname(file), { recursive: true, ...(opts.dirMode === undefined ? {} : { mode: opts.dirMode }) });
  // Named for this process: two writers must not share a temp file.
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, data, { mode: opts.mode });
  chmodSync(tmp, opts.mode);
  renameSync(tmp, file);
}
