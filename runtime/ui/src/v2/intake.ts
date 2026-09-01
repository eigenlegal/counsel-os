/**
 * Document intake (docx spec §6): a Word file dropped on Home's ask box or
 * the chat composer goes into the vault — the matter's folder when the
 * thread is linked to one, `matters/inbox/` otherwise (§10) — and lands in
 * the message as a path chip, like "＋ attach from vault" does. The pure
 * parts live here so both surfaces say the same things the same way.
 */
import { ApiError, uploadFile, type Uploaded } from '../api/client';

/** Where a matter's documents live. A matter that is its own folder
 * (`matters/acme/matter.md`) keeps them beside it; a flat matter file
 * (`matters/acme.md`) gets a folder named after it (`matters/acme/`). */
export function matterFolderOf(matterPath: string, mattersDir = 'matters'): string {
  const cut = matterPath.lastIndexOf('/');
  const dir = cut === -1 ? '' : matterPath.slice(0, cut);
  if (dir !== mattersDir && dir !== '') return dir;
  const base = matterPath.slice(cut + 1).replace(/\.[^.]+$/, '');
  return `${mattersDir}/${base}`;
}

export function inboxFolder(mattersDir = 'matters'): string {
  return `${mattersDir}/inbox`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isDocxName(name: string): boolean {
  return /\.docx$/i.test(name);
}

/** The result line: "Added Acme-NDA.docx to matters/inbox · 41 KB". */
export function addedLine(up: Uploaded): { name: string; folder: string; text: string } {
  const name = up.path.slice(up.path.lastIndexOf('/') + 1);
  const folder = up.path.slice(0, up.path.lastIndexOf('/'));
  return { name, folder, text: `Added ${name} to ${folder} · ${formatSize(up.size)}` };
}

/** The one-sentence refusal for a file that cannot be added. */
export function refusalFor(name: string, err: unknown): string {
  if (!isDocxName(name)) {
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    const hint = ext === 'pages' ? ' Export it from Pages as Word and drop it again.' : ext === 'pdf' ? ' A PDF cannot be redlined; ask for the Word version.' : '';
    return `Could not add ${name}: only Word documents (.docx) can be added for now.${hint}`;
  }
  if (err instanceof ApiError) {
    if (err.status === 413) return `Could not add ${name}: it is larger than the 25 MB limit.`;
    if (err.status === 422) return `Could not add ${name}: the file was refused — it carries a document type declaration a safe reader cannot accept.`;
    if (err.status === 415) return `Could not add ${name}: it is not a Word document.`;
    return `Could not add ${name}: ${err.message}`;
  }
  return `Could not add ${name}: ${err instanceof Error ? err.message : String(err)}`;
}

/** Fired on `globalThis` when an upload lands a file in the vault, so the
 * Shell refreshes its path index without a prop through every page. */
export const VAULT_CHANGED_EVENT = 'counsel:vault-changed';

export type IntakeStatus = { kind: 'busy'; text: string } | { kind: 'done'; up: Uploaded; text: string } | { kind: 'error'; text: string };

/** The files a drop carried, Word documents first (so a mixed drop adds
 * the one that can be added and refuses the rest by name). */
export function droppedFiles(transfer: DataTransfer | null): File[] {
  if (transfer === null) return [];
  return Array.from(transfer.files ?? []);
}

/** True when the drag carries files at all — a dragged text selection or
 * a link must not light the drop zone. */
export function carriesFiles(transfer: DataTransfer | null): boolean {
  if (transfer === null) return false;
  return Array.from(transfer.types ?? []).includes('Files');
}

/**
 * Uploads one dropped file and reports each state through `onStatus`;
 * resolves with the upload on success, `null` on refusal. One file per
 * drop for now — the first Word document wins, the others are named.
 */
export async function intake(files: File[], dest: string | undefined, onStatus: (s: IntakeStatus) => void): Promise<Uploaded | null> {
  const file = files.find(f => isDocxName(f.name)) ?? files[0];
  if (file === undefined) return null;
  if (!isDocxName(file.name)) {
    onStatus({ kind: 'error', text: refusalFor(file.name, null) });
    return null;
  }
  onStatus({ kind: 'busy', text: `Adding ${file.name}…` });
  try {
    const up = await uploadFile(file, dest);
    onStatus({ kind: 'done', up, text: addedLine(up).text });
    globalThis.dispatchEvent(new Event(VAULT_CHANGED_EVENT));
    return up;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    onStatus({ kind: 'error', text: refusalFor(file.name, err) });
    return null;
  }
}
