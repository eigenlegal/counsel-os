import { closeSync, fsyncSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { BackupManifest, BACKUP_MAX_BYTES, BACKUP_MEMORY_MAX_BYTES, BACKUP_MANIFEST_MAX_BYTES } from './backup-format';
import { requireDiskSpace, writeAll } from './backup-stream';
import { WorkspaceConflictError } from './types';
import { workspaceWorkerCommand } from './distribution';
export type { BackupManifest } from './backup-format';

let active = false;
let activeChild: ReturnType<typeof Bun.spawn> | undefined;
let idle = Promise.resolve();
const retained = new Set<() => void>();
export async function stopWorkspaceBackups(): Promise<void> {
  if (activeChild?.exitCode === null) activeChild.kill('SIGKILL');
  await idle;
  for (const dispose of retained) dispose();
}
export interface WorkspaceBackupFile {
  path: string; name: string; byteCount: number; manifest: BackupManifest; dispose: () => void;
}
async function run<T>(
  action: 'create' | 'inspect' | 'restore',
  path: string | Buffer | ReadableStream<Uint8Array>,
  finish: (result: Record<string, unknown>, staging: string) => T,
  parent?: string,
  keepCreatedFile = false,
): Promise<T> {
  if (active)
    throw new WorkspaceConflictError(
      'A backup operation is already running. Wait for it to finish and try again.',
    );
  active = true;
  let settled!: () => void;
  idle = new Promise<void>(resolve => { settled = resolve; });
  let keep = false;
  let staging: string | undefined, child: ReturnType<typeof Bun.spawn> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    staging = mkdtempSync(join(tmpdir(), 'counsel-workspace-backup-'));
    if (Buffer.isBuffer(path)) {
      if (path.length > BACKUP_MEMORY_MAX_BYTES)
        throw new WorkspaceConflictError('Use a file or stream for backups larger than 250 MB.');
      const upload = join(staging, 'input.counsel-backup');
      writeFileSync(upload, path, { flag: 'wx', mode: 0o600 });
      path = upload;
    }
    if (typeof path !== 'string') {
      const upload = join(staging, 'input.counsel-backup');
      const output = openSync(upload, 'wx', 0o600);
      const reader = path.getReader();
      let size = 0, checkedAt = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.length;
          if (size > BACKUP_MAX_BYTES) throw new WorkspaceConflictError('Choose a backup file of 10 GB or less.');
          if (!checkedAt || size - checkedAt >= 32_000_000) { requireDiskSpace(staging, 32_000_000); checkedAt = size; }
          writeAll(output, chunk.value);
        }
        fsyncSync(output);
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      finally { reader.releaseLock(); closeSync(output); }
      path = upload;
    }
    child = Bun.spawn(workspaceWorkerCommand('backup'), {
      cwd: staging,
      env: { PATH: '/usr/bin:/bin', NODE_ENV: 'production' },
      stdin: new Blob([JSON.stringify({ action, path, staging, ...(parent ? { parent } : {}) })]),
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const proc = child;
    activeChild = child;
    timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, 600_000);
    const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > BACKUP_MANIFEST_MAX_BYTES + 100_000) {
        proc.kill('SIGKILL');
        throw new WorkspaceConflictError('The backup response is too large.');
      }
      chunks.push(next.value);
    }
    const code = await proc.exited;
    if (timedOut)
      throw new WorkspaceConflictError(
        'Backup processing timed out. No existing workspace was changed. Check disk space and try again.',
      );
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new WorkspaceConflictError(
        'Backup processing stopped unexpectedly. No existing workspace was changed.',
      );
    }
    if (code || result.error)
      throw new WorkspaceConflictError(
        typeof result.error === 'string' ? result.error : 'Backup processing failed.',
      );
    // The worker may return only its known output path, not an arbitrary file.
    if (action === 'create' && result.path !== join(staging, 'workspace.counsel-backup'))
      throw new WorkspaceConflictError('The backup output could not be verified.');
    const value = finish(result, staging);
    keep = keepCreatedFile;
    return value;
  } finally {
    if (timeout) clearTimeout(timeout);
    if (child && child.exitCode === null) {
      child.kill('SIGKILL');
      await child.exited;
    }
    try {
      if (staging && !keep) rmSync(staging, { recursive: true, force: true });
    } finally {
      activeChild = undefined;
      active = false;
      settled();
    }
  }
}

export function createWorkspaceBackup(
  databasePath: string,
): Promise<{ bytes: Buffer; manifest: BackupManifest; name: string }> {
  return run('create', databasePath, (result) => {
    const manifest = BackupManifest.parse(result.manifest);
    if (statSync(z.string().parse(result.path)).size > BACKUP_MEMORY_MAX_BYTES)
      throw new WorkspaceConflictError('Use createWorkspaceBackupFile for backups larger than 250 MB.');
    return {
      bytes: readFileSync(z.string().parse(result.path)),
      manifest,
      name: `counsel-${manifest.createdAt.replace(/[:.]/g, '-')}.counsel-backup`,
    };
  });
}
/** Caller disposes the private file after download; archive bytes never enter app memory. */
export function createWorkspaceBackupFile(databasePath: string): Promise<WorkspaceBackupFile> {
  if (retained.size >= 2) throw new WorkspaceConflictError('Finish the current backup downloads before preparing another.');
  return run('create', databasePath, (result, staging) => {
    const manifest = BackupManifest.parse(result.manifest);
    const path = z.string().parse(result.path);
    const byteCount = statSync(path).size;
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      retained.delete(dispose);
      rmSync(staging, { recursive: true, force: true });
    };
    retained.add(dispose);
    return { path, manifest, byteCount, name: `counsel-${manifest.createdAt.replace(/[:.]/g, '-')}.counsel-backup`, dispose };
  }, undefined, true);
}
export function inspectWorkspaceBackup(path: string | Buffer | ReadableStream<Uint8Array>): Promise<BackupManifest> {
  return run('inspect', path, (result) => BackupManifest.parse(result.manifest));
}
export function restoreWorkspaceBackup(
  path: string,
  parent: string,
): Promise<{ databasePath: string; manifest: BackupManifest }> {
  return run(
    'restore',
    path,
    (result) => ({
      databasePath: z.string().min(1).parse(result.databasePath),
      manifest: BackupManifest.parse(result.manifest),
    }),
    parent,
  );
}
