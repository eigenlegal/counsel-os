import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openWorkspaceDatabase, WORKSPACE_SCHEMA_VERSION } from './database';
import { prepareWorkspaceUpgrade } from './upgrade-safety';
import { inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture(version: 18 | 19 | 20) {
  const root = mkdtempSync(join(tmpdir(), 'counsel-upgrade-test-')); roots.push(root);
  const memory = openWorkspaceDatabase(':memory:', version), path = join(root, 'workspace.sqlite3');
  writeFileSync(path, memory.serialize()); memory.close(); return { root, path };
}
test('verified pre-migration archive is recoverable; source stays at old schema until migration', async () => {
  const { root, path } = fixture(18);
  const saved = await prepareWorkspaceUpgrade(path); expect(saved?.fromSchema).toBe(18);
  expect((await inspectWorkspaceBackup(saved!.backupPath)).schemaVersion).toBe(18);
  const source = new Database(path, { readonly: true }); expect(source.query('PRAGMA user_version').get()).toEqual({ user_version: 18 }); source.close();
  const recovered = await restoreWorkspaceBackup(saved!.backupPath, root);
  expect(recovered.databasePath).not.toBe(path);
  const migrated = openWorkspaceDatabase(path); expect(migrated.query('PRAGMA user_version').get()).toEqual({ user_version: WORKSPACE_SCHEMA_VERSION }); migrated.close();
});
test('no archive needed for a new/current workspace; downgrade refused', async () => {
  const { root, path } = fixture(WORKSPACE_SCHEMA_VERSION);
  expect(await prepareWorkspaceUpgrade(join(root, 'new.sqlite3'))).toBeNull();
  expect(await prepareWorkspaceUpgrade(path)).toBeNull();
  await expect(prepareWorkspaceUpgrade(path, 18)).rejects.toThrow('newer Counsel OS');
  expect(readdirSync(root).filter(name => name.startsWith('before-upgrade-'))).toHaveLength(0);
});
test('non-workspace database is refused without schema changes', async () => {
  const { path } = fixture(19); const db = new Database(path); db.exec('PRAGMA application_id=123'); db.close();
  await expect(prepareWorkspaceUpgrade(path)).rejects.toThrow('Not a Counsel OS workspace');
});
test('a failed migration rolls back and leaves its earlier verified recovery archive intact', async () => {
  const { path } = fixture(18);
  const saved = await prepareWorkspaceUpgrade(path);
  // Force a collision after the backup, without weakening the real migrator.
  const db = new Database(path); db.exec('CREATE TABLE workspace_drafts (synthetic INTEGER)'); db.close();
  expect(() => openWorkspaceDatabase(path)).toThrow();
  const unchanged = new Database(path, { readonly: true });
  expect(unchanged.query('PRAGMA user_version').get()).toEqual({ user_version: 18 }); unchanged.close();
  expect((await inspectWorkspaceBackup(saved!.backupPath)).schemaVersion).toBe(18);
});
test('backup integrity failure prevents an upgrade without changing the original schema', async () => {
  const { root, path } = fixture(18);
  // A missing required table makes this unsuitable for a trustworthy backup.
  const db = new Database(path); db.exec('DROP TABLE work_exports'); db.close();
  await expect(prepareWorkspaceUpgrade(path)).rejects.toThrow();
  const unchanged = new Database(path, { readonly: true });
  expect(unchanged.query('PRAGMA user_version').get()).toEqual({ user_version: 18 }); unchanged.close();
  expect(readdirSync(root).filter(name => name.startsWith('before-upgrade-'))).toHaveLength(0);
});
