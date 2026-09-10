/** Developer entry point. Preview by default; --apply is an explicit local migration. */
import { lstatSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { planPluginImport } from './plugin-import';
import { createWorkspaceBackup, inspectWorkspaceBackup } from './backups';
import { WorkspaceStore } from './store';

if (import.meta.main) {
  let archivePath: string | undefined;
  try {
    const { values } = parseArgs({ args: process.argv.slice(2), strict: true, options: {
      root: { type: 'string' }, database: { type: 'string' },
      'profile-name': { type: 'string' }, apply: { type: 'boolean', default: false },
    } });
    if (!values.root || !values.database)
      throw new Error('Use --root /configured/plugin/root --database /existing/workspace.sqlite3 [--profile-name NAME] [--apply].');
    const databasePath = resolve(values.database);
    if (lstatSync(databasePath).isSymbolicLink() || !lstatSync(databasePath).isFile())
      throw new Error('Choose an existing workspace database, not a symlink.');
    const snapshot = await planPluginImport(values.root, values['profile-name']);
    const summary = {
      mode: values.apply ? 'apply' : 'preview', databasePath, root: snapshot.root,
      fingerprint: snapshot.fingerprint,
      files: snapshot.archive.length, indexedOriginals: snapshot.originals.length,
      matters: snapshot.seed.matters!.length, pendingPractice: snapshot.seed.knowledge!.length,
      archiveOnly: snapshot.archive.filter(file => !file.imported).map(file => file.path),
      excluded: snapshot.skipped.filter(file => !snapshot.archive.some(item => item.path === file.path)),
      profile: snapshot.profile ? { name: snapshot.profile.name, organization: snapshot.profile.organization,
        sharing: 'off until reviewed', existingProfile: 'never overwritten' } : 'full source retained; no structured profile mapping requested',
      modelCalls: 0,
      limitations: 'One-time snapshot, not continuous sync. No link following or external deal documents. Practice entries remain pending. Law content is not refreshed. Existing records, chats and connection settings remain unchanged.',
    };
    if (!values.apply) { console.log(JSON.stringify(summary, null, 2)); }
    else {
      // A live SQLite snapshot is safe while the app is open; never copy just
      // its DB file or run conversation crash recovery from an import process.
      const backup = await createWorkspaceBackup(databasePath);
      await inspectWorkspaceBackup(backup.bytes);
      archivePath = mkdtempSync(join(dirname(databasePath), 'plugin-import-'));
      writeFileSync(join(archivePath, 'before.counsel-backup'), backup.bytes, { flag: 'wx', mode: 0o600 });
      for (const file of snapshot.archive) {
        const target = join(archivePath, 'plugin-originals', file.path);
        mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
        writeFileSync(target, file.bytes, { flag: 'wx', mode: 0o600 });
      }
      writeFileSync(join(archivePath, 'inventory.json'), JSON.stringify({ ...summary,
        files: snapshot.archive.map(({ path, hash, imported }) => ({ path, hash, imported })),
      }, null, 2), { flag: 'wx', mode: 0o600 });
      const store = new WorkspaceStore({ databasePath });
      try {
        const result = store.importPluginSnapshot(snapshot);
        // Verify retained bytes through the same reader used by authenticated downloads.
        for (const original of snapshot.originals) {
          const revisionId = result.receipt.records.sourceRevisions[original.key]!;
          if (!store.originalFile(revisionId).bytes.equals(original.bytes))
            throw new Error('Retained-original verification failed.');
        }
        const report = { ...summary, archivePath, alreadyImported: result.receipt.alreadyImported,
          profileCreated: result.profileCreated, records: result.receipt.records, originalsVerified: true };
        writeFileSync(join(archivePath, 'receipt.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ ...summary, archivePath, alreadyImported: result.receipt.alreadyImported,
          profileCreated: result.profileCreated, originalsVerified: true }, null, 2));
      } finally { store.close(); }
    }
  } catch (error) {
    console.error((error as Error).message);
    if (archivePath) console.error(`Pre-import backup and original snapshot retained at: ${archivePath}`);
    process.exitCode = 1;
  }
}
