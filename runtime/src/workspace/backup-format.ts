import { createHash } from 'node:crypto';
import { z } from 'zod';
import { WORKSPACE_SCHEMA_VERSION } from './database';

/** Length-delimited, uncompressed data. No archive paths or executable entries. */
export const BACKUP_MAGIC = Buffer.from('Counsel workspace backup v1\n', 'ascii');
export const BACKUP_MAX_BYTES = 10_000_000_000;
export const BACKUP_DATABASE_MAX_BYTES = 4_000_000_000;
// Compatibility helpers for small callers/tests remain bounded. Production uses files/streams.
export const BACKUP_MEMORY_MAX_BYTES = 250_000_000;
export const BACKUP_MANIFEST_MAX_BYTES = 16_000_000;
export const BACKUP_MEDIA_TYPE = 'application/vnd.counsel.workspace-backup';
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Count = z.number().int().nonnegative().max(10_000_000);
export const BackupManifest = z
  .object({
    format: z.literal(1),
    schemaVersion: z.union([z.literal(5), z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10), z.literal(11), z.literal(12), z.literal(13), z.literal(14), z.literal(15), z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(WORKSPACE_SCHEMA_VERSION)]),
    createdAt: z.string().datetime(),
    database: z
      .object({ hash: Hash, byteCount: z.number().int().min(512).max(BACKUP_DATABASE_MAX_BYTES) })
      .strict(),
    originals: z
      .array(z.object({ hash: Hash, byteCount: z.number().int().min(1).max(25_000_000) }).strict())
      .max(100_000),
    counts: z
      .object({
        matters: Count,
        conversations: Count,
        messages: Count,
        sources: Count,
        knowledge: Count,
        work: Count,
        wordFiles: Count,
        templates: Count.default(0),
        importBatches: Count.default(0),
        stagedFiles: Count.default(0),
      })
      .strict(),
  })
  .strict();
export type BackupManifest = z.infer<typeof BackupManifest>;
export const backupHash = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

export function encodeBackup(
  manifest: BackupManifest,
  database: Buffer,
  originals: Buffer[],
): Buffer {
  BackupManifest.parse(manifest);
  const json = Buffer.from(JSON.stringify(manifest));
  if (json.length > BACKUP_MANIFEST_MAX_BYTES) throw new Error('Backup manifest is too large.');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(json.length);
  const size =
    BACKUP_MAGIC.length +
    4 +
    json.length +
    database.length +
    originals.reduce((sum, b) => sum + b.length, 0);
  if (size > BACKUP_MEMORY_MAX_BYTES) throw new Error('Use file-backed backup creation for backups larger than 250 MB.');
  return Buffer.concat([BACKUP_MAGIC, length, json, database, ...originals], size);
}

export function decodeBackup(bytes: Buffer): {
  manifest: BackupManifest;
  database: Buffer;
  originals: Buffer[];
} {
  if (
    bytes.length > BACKUP_MEMORY_MAX_BYTES ||
    bytes.length < BACKUP_MAGIC.length + 4 ||
    !bytes.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)
  )
    throw new Error('Choose a Counsel .counsel-backup file of 250 MB or less.');
  const size = bytes.readUInt32BE(BACKUP_MAGIC.length);
  let offset = BACKUP_MAGIC.length + 4;
  if (!size || size > BACKUP_MANIFEST_MAX_BYTES || offset + size > bytes.length)
    throw new Error('The backup manifest is incomplete.');
  let manifest: BackupManifest;
  try {
    manifest = BackupManifest.parse(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset, offset + size)),
      ),
    );
  } catch {
    throw new Error(
      'This backup has an invalid or unsupported format/schema. Use the app version that created it.',
    );
  }
  offset += size;
  if (new Set(manifest.originals.map((f) => f.hash)).size !== manifest.originals.length)
    throw new Error('The backup contains duplicate original file identities.');
  const expected =
    offset +
    manifest.database.byteCount +
    manifest.originals.reduce((sum, f) => sum + f.byteCount, 0);
  if (expected !== bytes.length)
    throw new Error('The backup is truncated or contains unexpected data.');
  const parts = [manifest.database, ...manifest.originals].map((file) => {
    const part = bytes.subarray(offset, offset + file.byteCount);
    offset += file.byteCount;
    if (backupHash(part) !== file.hash)
      throw new Error('Backup integrity check failed. Use another copy of the backup.');
    return part;
  });
  return { manifest, database: parts[0]!, originals: parts.slice(1) };
}
