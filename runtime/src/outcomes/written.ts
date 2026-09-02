/**
 * The written-file record (routing-and-evals spec §7, "lawyer edits"):
 * what counsel wrote into the matters folder, so a later change to the same
 * file can be read as the lawyer's edit. One entry per path in
 * `<vault>/.counsel/written.json` — the content hash, the text hash (a Word
 * file's accept-all text; the file itself for markdown), and a text
 * snapshot under `.counsel/written/<textHash>.txt` that the edit detector
 * diffs against. Owner-only files, like everything under `.counsel/`.
 *
 * Matters only: knowledge paths are the lawyer's to curate, and an edit
 * there says nothing about counsel's work. Off with `outcomes: off`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileAtomic } from '../core/atomic-write';
import { isDocxPath, modelOf, openDocx, textOf } from '../docx';
import type { VaultConfig } from '../vault/resolve-root';
import { outcomesEnabled } from './store';

export type WrittenKind = 'proposal' | 'artifact' | 'write';

export interface WrittenEntry {
  /** sha256 of the bytes on disk when counsel wrote them. */
  hash: string;
  /** sha256 of the text the detector compares (the snapshot's content). */
  textHash: string;
  format: 'text' | 'docx';
  kind: WrittenKind;
  at: string;
  runId?: string;
  threadId?: string;
  /** The UTC day (`YYYY-MM-DD`) an edit was last reported — once per file
   * per day. */
  editedOn?: string;
}

export interface WrittenFile {
  version: 1;
  files: Record<string, WrittenEntry>;
}

/** Above this a file is hashed, never snapshotted or diffed. */
export const SNAPSHOT_CAP_BYTES = 2 * 1024 * 1024;

export function writtenPath(vaultRoot: string): string {
  return join(vaultRoot, '.counsel', 'written.json');
}

export function snapshotPath(vaultRoot: string, textHash: string): string {
  return join(vaultRoot, '.counsel', 'written', `${textHash}.txt`);
}

export function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** The text the detector compares: a Word file's accept-all text, one
 * paragraph per line; anything else as UTF-8. */
export function textOfFile(bytes: Uint8Array, path: string): string {
  if (isDocxPath(path)) {
    const model = modelOf(openDocx(bytes));
    return model.paragraphs.map(p => textOf(p, 'accept')).join('\n') + (model.paragraphs.length > 0 ? '\n' : '');
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export function readWritten(vaultRoot: string): WrittenFile {
  const path = writtenPath(vaultRoot);
  if (!existsSync(path)) return { version: 1, files: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<WrittenFile>;
    if (parsed === null || typeof parsed !== 'object' || typeof parsed.files !== 'object' || parsed.files === null) return { version: 1, files: {} };
    return { version: 1, files: parsed.files };
  } catch {
    return { version: 1, files: {} };
  }
}

export function writeWritten(vaultRoot: string, file: WrittenFile): void {
  writeFileAtomic(writtenPath(vaultRoot), `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600, dirMode: 0o700 });
}

/** Whether `path` (vault-relative, forward slashes) sits under the matters folder. */
export function inMatters(cfg: Pick<VaultConfig, 'mattersPath'>, path: string): boolean {
  const base = cfg.mattersPath.replace(/\/+$/, '');
  return path === base || path.startsWith(`${base}/`);
}

export interface RecordWrittenInput {
  path: string;
  kind: WrittenKind;
  runId?: string;
  threadId?: string;
  at?: string;
}

/**
 * Records what is on disk at `path` right now as counsel's version. Returns
 * the entry, or `null` when nothing was recorded: the record is off, or the
 * file is not there.
 *
 * Every file counsel actually wrote is recorded, matter or knowledge. Only
 * three callers reach here — an approved proposal, a produced document, a
 * `vault_write` — so this can never sweep in a file the lawyer wrote alone;
 * and an approved standard is precisely counsel's text, so rewriting it
 * after approving it is the signal this record exists to keep.
 */
export function recordWritten(vaultRoot: string, cfg: Pick<VaultConfig, 'mattersPath' | 'outcomes'>, input: RecordWrittenInput): WrittenEntry | null {
  if (!outcomesEnabled(cfg)) return null;
  const abs = join(vaultRoot, input.path);
  if (!existsSync(abs)) return null;
  const bytes = readFileSync(abs);
  const entry = entryFor(bytes, input);
  const file = readWritten(vaultRoot);
  const previous = file.files[input.path];
  file.files[input.path] = entry;
  saveSnapshot(vaultRoot, bytes, input.path, entry);
  writeWritten(vaultRoot, file);
  if (previous !== undefined && previous.textHash !== entry.textHash) removeSnapshot(vaultRoot, file, previous.textHash);
  return entry;
}

export function entryFor(bytes: Uint8Array, input: RecordWrittenInput & { editedOn?: string }): WrittenEntry {
  const big = bytes.byteLength > SNAPSHOT_CAP_BYTES;
  const format = isDocxPath(input.path) ? 'docx' : 'text';
  const hash = sha256(bytes);
  const textHash = big ? hash : sha256(textOfFile(bytes, input.path));
  return {
    hash,
    textHash,
    format,
    kind: input.kind,
    at: input.at ?? new Date().toISOString(),
    ...(input.runId === undefined ? {} : { runId: input.runId }),
    ...(input.threadId === undefined ? {} : { threadId: input.threadId }),
    ...(input.editedOn === undefined ? {} : { editedOn: input.editedOn }),
  };
}

export function saveSnapshot(vaultRoot: string, bytes: Uint8Array, path: string, entry: WrittenEntry): void {
  if (bytes.byteLength > SNAPSHOT_CAP_BYTES) return;
  const target = snapshotPath(vaultRoot, entry.textHash);
  if (existsSync(target)) return;
  writeFileAtomic(target, textOfFile(bytes, path), { mode: 0o600, dirMode: 0o700 });
}

/** Removes a snapshot no remaining entry points at. */
export function removeSnapshot(vaultRoot: string, file: WrittenFile, textHash: string): void {
  if (Object.values(file.files).some(e => e.textHash === textHash)) return;
  rmSync(snapshotPath(vaultRoot, textHash), { force: true });
}

export function dropWritten(vaultRoot: string, path: string): void {
  const file = readWritten(vaultRoot);
  const entry = file.files[path];
  if (entry === undefined) return;
  delete file.files[path];
  writeWritten(vaultRoot, file);
  removeSnapshot(vaultRoot, file, entry.textHash);
}
