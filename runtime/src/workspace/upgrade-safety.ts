import { Database } from 'bun:sqlite';
import { closeSync, copyFileSync, existsSync, fsyncSync, lstatSync, mkdtempSync, openSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createWorkspaceBackupFile, inspectWorkspaceBackup } from './backups';
import { WORKSPACE_APPLICATION_ID, WORKSPACE_SCHEMA_VERSION } from './database';

/** Call under the workspace lock, BEFORE opening a migrating store. An archive
 * failure refuses the upgrade; it never silently falls through to migration. */
export async function prepareWorkspaceUpgrade(databasePath: string, target = WORKSPACE_SCHEMA_VERSION) {
  if (!existsSync(databasePath)) return null;
  if (!lstatSync(databasePath).isFile() || lstatSync(databasePath).isSymbolicLink()) throw new Error('Workspace database must be a regular file.');
  const db = new Database(databasePath, { readonly: true, strict: true });
  let version: number;
  try {
    version = (db.query('PRAGMA user_version').get() as { user_version: number }).user_version;
    const application = (db.query('PRAGMA application_id').get() as { application_id: number }).application_id;
    if (application !== WORKSPACE_APPLICATION_ID) throw new Error('Not a Counsel OS workspace. No upgrade was attempted.');
    if (version > target) throw new Error('This workspace was opened by a newer Counsel OS version. Reinstall that version; do not downgrade this database.');
  } finally { db.close(); }
  if (version === target) return null;
  if (version < 5) throw new Error('This older development workspace needs an explicit migration before the desktop can open it. No files were changed.');
  const archive = await createWorkspaceBackupFile(databasePath);
  try {
    const folder = mkdtempSync(join(dirname(databasePath), 'before-upgrade-'));
    const temporary = join(folder, 'snapshot.partial'), destination = join(folder, 'workspace.counsel-backup');
    copyFileSync(archive.path, temporary);
    const fd = openSync(temporary, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
    const verified = await inspectWorkspaceBackup(temporary);
    if (verified.schemaVersion !== version) throw new Error('The pre-upgrade backup does not match this workspace.');
    renameSync(temporary, destination);
    writeFileSync(join(folder, 'recovery.json'), JSON.stringify({ format: 1, database: basename(databasePath), fromSchema: version, toSchema: target,
      backup: 'workspace.counsel-backup', createdAt: new Date().toISOString(), verified: true,
      recovery: 'Use File > Restore workspace from backup. Recovery creates a separate copy. Never open the upgraded database with an older app.' }, null, 2), { flag: 'wx', mode: 0o600 });
    const directory = openSync(folder, 'r'); try { fsyncSync(directory); } finally { closeSync(directory); }
    return { backupPath: destination, fromSchema: version, toSchema: target };
  } finally { archive.dispose(); }
}
