import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readSync, statfsSync, writeSync } from 'node:fs';
import { BACKUP_MAGIC, BACKUP_MAX_BYTES, BACKUP_MANIFEST_MAX_BYTES, BackupManifest } from './backup-format';

export const COPY_CHUNK_BYTES = 1_048_576;
const DISK_RESERVE = 500_000_000;

/** Disk-space checks are advisory; every write still handles ENOSPC atomically. */
export function requireDiskSpace(directory: string, needed: number): void {
  const disk = statfsSync(directory);
  if (disk.bavail * disk.bsize < needed + DISK_RESERVE)
    throw new Error('There is not enough free disk space for this operation and its recovery copies. Free some space and try again.');
}

export function openRegular(path: string, maximum: number): { fd: number; size: number } {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > maximum)
    throw new Error('Backup data must be bounded regular files, not links.');
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const actual = fstatSync(fd);
    if (!actual.isFile() || actual.ino !== before.ino || actual.dev !== before.dev || actual.size !== before.size)
      throw new Error('A backup file changed while it was being opened.');
    return { fd, size: actual.size };
  } catch (error) { closeSync(fd); throw error; }
}

export function writeAll(fd: number, bytes: Uint8Array): void {
  for (let offset = 0; offset < bytes.length;) {
    const written = writeSync(fd, bytes, offset, Math.min(COPY_CHUNK_BYTES, bytes.length - offset));
    if (!written) throw new Error('The backup could not be written completely.');
    offset += written;
  }
}

/** Hash/copy a bounded slice, retaining at most one 1-MB chunk. */
export function transferPart(fd: number, start: number, size: number, output?: number): string {
  const chunk = Buffer.allocUnsafe(Math.min(COPY_CHUNK_BYTES, size));
  const hash = createHash('sha256');
  for (let offset = 0; offset < size;) {
    const n = readSync(fd, chunk, 0, Math.min(chunk.length, size - offset), start + offset);
    if (!n) throw new Error('The backup is truncated or changed during reading.');
    const bytes = chunk.subarray(0, n);
    hash.update(bytes);
    if (output !== undefined) writeAll(output, bytes);
    offset += n;
  }
  return hash.digest('hex');
}

export function fileIdentity(path: string, maximum: number): { hash: string; byteCount: number } {
  const { fd, size } = openRegular(path, maximum);
  try {
    const hash = transferPart(fd, 0, size);
    if (fstatSync(fd).size !== size) throw new Error('A file changed during backup. Try again.');
    return { hash, byteCount: size };
  } finally { closeSync(fd); }
}

export function copyVerified(path: string, expected: { hash: string; byteCount: number }, output: number): void {
  const { fd, size } = openRegular(path, expected.byteCount);
  try {
    if (size !== expected.byteCount || transferPart(fd, 0, size, output) !== expected.hash || fstatSync(fd).size !== size)
      throw new Error('An original document failed its integrity check. No backup was created.');
  } finally { closeSync(fd); }
}

export function backupHeader(manifest: BackupManifest): Buffer {
  const json = Buffer.from(JSON.stringify(BackupManifest.parse(manifest)));
  if (json.length > BACKUP_MANIFEST_MAX_BYTES) throw new Error('Backup manifest is too large.');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(json.length);
  return Buffer.concat([BACKUP_MAGIC, length, json]);
}

function readExactly(fd: number, offset: number, size: number): Buffer {
  const bytes = Buffer.allocUnsafe(size);
  for (let done = 0; done < size;) {
    const n = readSync(fd, bytes, done, size - done, offset + done);
    if (!n) throw new Error('The backup manifest is incomplete.');
    done += n;
  }
  return bytes;
}

export function readBackupHeader(fd: number, size: number): { manifest: BackupManifest; offset: number } {
  if (size > BACKUP_MAX_BYTES || size < BACKUP_MAGIC.length + 4)
    throw new Error('Choose a supported Counsel .counsel-backup file.');
  const header = readExactly(fd, 0, BACKUP_MAGIC.length + 4);
  if (!header.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC))
    throw new Error('Choose a Counsel .counsel-backup file.');
  const length = header.readUInt32BE(BACKUP_MAGIC.length);
  const offset = header.length + length;
  if (!length || length > BACKUP_MANIFEST_MAX_BYTES || offset > size)
    throw new Error('The backup manifest is incomplete.');
  let manifest: BackupManifest;
  try { manifest = BackupManifest.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readExactly(fd, header.length, length)))); }
  catch { throw new Error('This backup has an invalid or unsupported format/schema. Use the app version that created it.'); }
  if (new Set(manifest.originals.map(file => file.hash)).size !== manifest.originals.length)
    throw new Error('The backup contains duplicate original file identities.');
  if (offset + manifest.database.byteCount + manifest.originals.reduce((n, file) => n + file.byteCount, 0) !== size)
    throw new Error('The backup is truncated or contains unexpected data.');
  return { manifest, offset };
}

export function extractPart(fd: number, offset: number, expected: { hash: string; byteCount: number }, destination: string): void {
  const output = openSync(destination, 'wx', 0o600);
  try {
    if (transferPart(fd, offset, expected.byteCount, output) !== expected.hash)
      throw new Error('Backup integrity check failed. Use another copy of the backup.');
    fsyncSync(output);
  } finally { closeSync(output); }
}
