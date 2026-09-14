import { Database } from "bun:sqlite";
import {
  chmodSync,
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  openWorkspaceDatabase,
  WORKSPACE_APPLICATION_ID,
  WORKSPACE_SCHEMA_VERSION,
} from "./database";
import { ConversationStore } from "./conversations";
import { WorkspaceProfile } from "./profile";
import { z } from "zod";
import { ModelPreference } from "./model-choice";
import { ImportCreate, ImportChoice, ImportCommit, IMPORT_MAX_BYTES, IMPORT_MAX_TEXT_BYTES } from "./import-types";
import { ExtractedFile } from "./files";
import { TemplateFields, WorkspaceTemplates } from "./templates";
import { ClientFields, SelectedClientMatters } from './clients';
import { WorkingPreferences } from './working-preferences';
import { PracticeDocument } from './practice-document';
import { EntityRegistry } from './entities';
import { validateNavigation } from './navigation';
import { OrganizationJobState, OrganizationSuggestion } from './import-organization-job-types';
import { UpkeepDecision } from './upkeep-types';
import { AutoFilingSettings, AutoFilingResult } from './auto-filing-types';
import { DraftWrite } from './draft-types';
import {
  BACKUP_DATABASE_MAX_BYTES,
  BACKUP_MAX_BYTES,
  BackupManifest,
  backupHash,
} from "./backup-format";
import { backupHeader, copyVerified, extractPart, fileIdentity, openRegular, readBackupHeader, requireDiskSpace, transferPart, writeAll } from './backup-stream';

function schema(db: Database): string {
  return JSON.stringify(
    db
      .query(
        "SELECT type, name, tbl_name, sql FROM sqlite_schema ORDER BY type, name",
      )
      .all(),
  );
}
function expectedSchema(version: 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20): string {
  const db = openWorkspaceDatabase(":memory:", version);
  try {
    return schema(db);
  } finally {
    db.close();
  }
}
function counts(db: Database): BackupManifest["counts"] {
  const count = (table: string) =>
    (db.query(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
  const version = (
    db.query("PRAGMA user_version").get() as { user_version: number }
  ).user_version;
  return {
    matters: count("matters"),
    conversations: count("conversations"),
    messages: count("conversation_turns"),
    sources: count("sources"),
    knowledge: count("knowledge_items"),
    work: count("work_records"),
    wordFiles: count("work_exports"),
    templates:
      (db.query("PRAGMA user_version").get() as { user_version: number })
        .user_version >= 6
        ? count("practice_templates")
        : 0,
    importBatches: version >= 7 ? count("import_batches") : 0,
    stagedFiles:
      version >= 7
        ? (
            db
              .query(
                "SELECT count(*) AS n FROM import_entries WHERE bytes IS NOT NULL",
              )
              .get() as { n: number }
          ).n
        : 0,
  };
}
function originalIndex(db: Database): BackupManifest["originals"] {
  const rows = db
    .query(
      "SELECT DISTINCT hash, byte_count AS byteCount FROM source_originals ORDER BY hash",
    )
    .all();
  return BackupManifest.shape.originals.parse(rows);
}
function checkedDatabase(path: string): Database {
  const db = new Database(path, { readonly: true, strict: true });
  try {
    db.exec(
      "PRAGMA trusted_schema = OFF; PRAGMA query_only = ON; PRAGMA busy_timeout = 5000; PRAGMA cell_size_check = ON;",
    );
    const application = (
      db.query("PRAGMA application_id").get() as { application_id: number }
    ).application_id;
    const version = (
      db.query("PRAGMA user_version").get() as { user_version: number }
    ).user_version;
    // Never run database-supplied triggers, views, modules or migrations during restore.
    if (
      application !== WORKSPACE_APPLICATION_ID ||
      ![5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, WORKSPACE_SCHEMA_VERSION].includes(version) ||
      schema(db) !== expectedSchema(version as 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20)
    )
      throw new Error(
        "The backup database schema is not supported by this app version.",
      );
    const checks = db.query("PRAGMA integrity_check").all() as {
      integrity_check: string;
    }[];
    if (
      checks.length !== 1 ||
      checks[0]!.integrity_check !== "ok" ||
      db.query("PRAGMA foreign_key_check").all().length
    )
      throw new Error("The workspace database failed its integrity check.");
    if (version >= 19) {
      for (const row of db.query('SELECT key, revision_id AS expectedRevisionId, write_id AS writeId, value_json AS value FROM workspace_drafts').iterate() as Iterable<{ key: string; expectedRevisionId: string; writeId: string; value: string | null }>) {
        DraftWrite.parse({ ...row, value: row.value === null ? null : JSON.parse(row.value) });
        if (row.value && Buffer.byteLength(row.value) > 160_000) throw new Error('A recovery draft exceeds its size limit.');
      }
    }
    for (const row of db
      .query("SELECT key, value_json AS value FROM workspace_settings")
      .all() as {
      key: string;
      value: string;
    }[]) {
      retainedSetting(db, row.key, row.value);
    }
    for (const row of db
      .query(
        "SELECT content_hash AS hash, byte_count AS size, bytes FROM work_exports",
      )
      .iterate() as Iterable<{
      hash: string;
      size: number;
      bytes: Uint8Array;
    }>) {
      if (row.bytes.length !== row.size || backupHash(row.bytes) !== row.hash)
        throw new Error("A saved Word file failed its integrity check.");
    }
    for (const row of db
      .query(
        `SELECT body, content_hash AS hash FROM source_revisions WHERE body IS NOT NULL
      UNION ALL SELECT body, content_hash FROM knowledge_revisions
      UNION ALL SELECT answer, content_hash FROM work_records`,
      )
      .iterate() as Iterable<{ body: string; hash: string }>) {
      if (backupHash(Buffer.from(row.body)) !== row.hash)
        throw new Error("A saved record failed its content integrity check.");
    }
    for (const row of db
      .query(
        `SELECT e.quote, e.start_offset AS start, e.end_offset AS end,
      coalesce(s.body, k.body, w.answer) AS body FROM (${version >= 14 ? 'SELECT quote, start_offset, end_offset, source_revision_id, knowledge_revision_id, prior_work_id FROM evidence UNION ALL SELECT quote, start_offset, end_offset, source_revision_id, knowledge_revision_id, prior_work_id FROM knowledge_evidence' : 'SELECT * FROM evidence'}) e
      LEFT JOIN source_revisions s ON s.id = e.source_revision_id
      LEFT JOIN knowledge_revisions k ON k.id = e.knowledge_revision_id
      LEFT JOIN work_records w ON w.id = e.prior_work_id`,
      )
      .iterate() as Iterable<{
      quote: string;
      start: number;
      end: number;
      body: string | null;
    }>) {
      if (
        row.body?.slice(row.start, row.end) !== row.quote ||
        row.end - row.start !== row.quote.length
      )
        throw new Error(
          "A saved citation failed its evidence integrity check.",
        );
    }
    if (version >= 6) {
      const templates = new WorkspaceTemplates(db, () => "");
      if (templates.list().length > 200)
        throw new Error("The backup exceeds the template limit.");
      for (const row of db
        .query(
          "SELECT source_revision_id AS sourceRevisionId, title, when_to_use AS whenToUse, jurisdiction, available FROM template_revisions",
        )
        .iterate() as Iterable<Record<string, unknown>>) {
        TemplateFields.parse({
          ...row,
          available: row.available === 1,
          practiceWideUse: true,
        });
      }
    }
    if (version >= 7) validateStagedImports(db, version);
    if (version >= 8) {
      for (const row of db.query('SELECT name,summary FROM clients').all()) ClientFields.parse(row);
      for (const row of db.query(`SELECT cc.matter_ids_json AS ids,c.scope,c.matter_id AS matterId FROM conversation_clients cc
        JOIN conversations c ON c.id=cc.conversation_id`).all() as {ids:string;scope:string;matterId:string|null}[]) {
        if (row.scope !== 'conversation' || row.matterId !== null) throw new Error('Invalid client conversation boundary.');
        for (const id of SelectedClientMatters.parse(JSON.parse(row.ids)))
          if (!db.query('SELECT 1 FROM matters WHERE id=?').get(id)) throw new Error('Client conversation refers to a missing matter.');
      }
    }
    if (version >= 11) {
      const invalid = db.query(`SELECT 1 FROM conversation_matters cm JOIN conversations c ON c.id=cm.conversation_id
        WHERE c.scope!='conversation' OR c.matter_id IS NOT NULL
        OR EXISTS (SELECT 1 FROM conversation_clients cc WHERE cc.conversation_id=c.id) LIMIT 1`).get();
      if (invalid) throw new Error('Invalid multi-matter conversation boundary.');
    }
    if (version >= 15) {
      for (const row of db.query('SELECT revision_id,state_json FROM import_organization_jobs').iterate() as Iterable<{ revision_id: string; state_json: string }>) {
        z.string().uuid().parse(row.revision_id);
        OrganizationJobState.parse(JSON.parse(row.state_json));
      }
      for (const row of db.query(`SELECT r.entry_id,r.batch_id,r.result_json,e.path,e.batch_id AS actual_batch
        FROM import_organization_results r JOIN import_entries e ON e.id=r.entry_id`).iterate() as Iterable<{ entry_id: string; batch_id: string; actual_batch: string; path: string; result_json: string }>) {
        const result = OrganizationSuggestion.parse(JSON.parse(row.result_json));
        if (result.entryId !== row.entry_id || row.batch_id !== row.actual_batch || result.path !== row.path)
          throw new Error('An organization suggestion does not match its import file.');
      }
    }
    if (version >= 20) {
      for (const row of db.query(`SELECT f.*,e.batch_id AS actual_batch FROM import_organization_files f
        JOIN import_entries e ON e.id=f.entry_id`).iterate() as Iterable<{ entry_id: string; batch_id: string; actual_batch: string; attempts: number; issue: string | null; protected: number }>) {
        if (row.batch_id !== row.actual_batch) throw new Error('An organization retry does not match its import file.');
        z.number().int().min(0).max(2).parse(row.attempts);
        z.string().min(1).max(1000).nullable().parse(row.issue);
        if (row.issue && row.attempts === 0) throw new Error('Invalid organization retry state.');
      }
    }
    if (version >= 16) {
      const target = z.object({ kind: UpkeepDecision.shape.kind, targetId: z.string().uuid(), requestedAt: z.string().datetime(), error: z.string().max(2000).nullable() }).strict();
      for (const row of db.query('SELECT kind,target_id AS targetId,requested_at AS requestedAt,error FROM upkeep_queue').iterate()) target.parse(row);
      const finding = z.object({ kind: UpkeepDecision.shape.kind, targetId: z.string().uuid(), code: UpkeepDecision.shape.code,
        version: UpkeepDecision.shape.expectedVersion, title: z.string().max(1000), detail: z.string().max(4000),
        checkedAt: z.string().datetime(), dismissedVersion: UpkeepDecision.shape.expectedVersion.nullable() }).strict();
      for (const row of db.query('SELECT kind,target_id AS targetId,code,version,title,detail,checked_at AS checkedAt,dismissed_version AS dismissedVersion FROM upkeep_findings').iterate()) finding.parse(row);
      const run = z.object({ id: z.string().uuid(), startedAt: z.string().datetime(), completedAt: z.string().datetime().nullable() }).strict();
      for (const row of db.query('SELECT id,started_at AS startedAt,completed_at AS completedAt FROM upkeep_runs').iterate()) run.parse(row);
    }
    if (version >= 18) {
      for (const row of db.query('SELECT revision_id,state_json FROM auto_filing_settings').iterate() as Iterable<{revision_id: string; state_json: string}>) {
        z.string().uuid().parse(row.revision_id); AutoFilingSettings.parse(JSON.parse(row.state_json));
      }
      const task = z.object({ source_id: z.string().uuid(), state: z.enum(['queued','running','complete','blocked','failed','protected']),
        generation: z.number().int().positive(), run_id: z.string().uuid().nullable(), message: z.string().max(2000), updated_at: z.string().datetime() }).strict();
      for (const row of db.query('SELECT * FROM auto_filing_tasks').iterate()) task.parse(row);
      for (const row of db.query('SELECT * FROM auto_filing_protection').iterate())
        z.object({ source_id: z.string().uuid(), reason: z.string().max(2000) }).strict().parse(row);
      for (const row of db.query('SELECT * FROM auto_filing_results').iterate() as Iterable<{id: string; source_id: string; fingerprint: string; state: string; result_json: string; created_at: string}>) {
        z.string().uuid().parse(row.id); z.string().datetime().parse(row.created_at);
        z.enum(['ready','applied','dismissed','superseded']).parse(row.state);
        const result = AutoFilingResult.parse(JSON.parse(row.result_json));
        if (result.sourceId !== row.source_id || result.suggestion.sourceId !== row.source_id || result.fingerprint !== row.fingerprint)
          throw new Error('An AI filing suggestion does not match its saved file.');
      }
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
function durableWrite(path: string, bytes: string | Uint8Array): void {
  const fd = openSync(path, "wx", 0o600);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function syncDirectory(path: string): void {
  if (process.platform === "win32") return;
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/** Worker-only: live, consistent SQLite snapshot plus immutable referenced originals. */
export function buildBackup(
  databasePath: string,
  staging: string,
): { path: string; manifest: BackupManifest } {
  const sourceStat = lstatSync(databasePath);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink())
    throw new Error("The workspace database must be a regular file.");
  // Read/write open allows SQLite to initialize absent WAL sidecars on an idle
  // workspace. VACUUM INTO leaves source records unchanged; never copy WAL files.
  const source = new Database(databasePath, {
    readwrite: true,
    create: false,
    strict: true,
  });
  const snapshot = join(staging, "snapshot.sqlite3");
  try {
    source.exec("PRAGMA trusted_schema = OFF; PRAGMA busy_timeout = 5000;");
    const version = (
      source.query("PRAGMA user_version").get() as { user_version: number }
    ).user_version;
    if (
      (version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 && version !== 10 && version !== 11 && version !== 12 && version !== 13 && version !== 14 && version !== 15 && version !== 16 && version !== 17 && version !== 18 && version !== 19 && version !== 20) ||
      schema(source) !== expectedSchema(version)
    )
      throw new Error("The workspace schema is not supported for backup.");
    const pages = (
      source.query("PRAGMA page_count").get() as { page_count: number }
    ).page_count;
    const size = (
      source.query("PRAGMA page_size").get() as { page_size: number }
    ).page_size;
    const free = (source.query('PRAGMA freelist_count').get() as { freelist_count: number }).freelist_count;
    const estimatedBytes = (pages - free) * size;
    if (estimatedBytes > BACKUP_DATABASE_MAX_BYTES)
      throw new Error("The database exceeds the 4 GB backup limit.");
    requireDiskSpace(staging, estimatedBytes * 3 + originalIndex(source).reduce((n, file) => n + file.byteCount, 0));
    source.query("VACUUM INTO ?").run(snapshot);
  } finally {
    source.close();
  }
  chmodSync(snapshot, 0o600);
  const clean = new Database(snapshot, { strict: true });
  try {
    // Credentials live elsewhere. Exclude connection/setup metadata as well, and
    // vacuum the copy so deleted settings cannot remain in its free pages.
    clean.exec("PRAGMA journal_mode = DELETE; PRAGMA secure_delete = ON;");
    for (const row of clean
      .query("SELECT key, value_json AS value FROM workspace_settings")
      .all() as { key: string; value: string }[])
      if (!retainedSetting(clean, row.key, row.value))
        clean
          .query("DELETE FROM workspace_settings WHERE key = ?")
          .run(row.key);
    if ((clean.query('PRAGMA user_version').get() as {user_version: number}).user_version >= 18) {
      const row = clean.query('SELECT state_json FROM auto_filing_settings').get() as {state_json: string} | null;
      if (row) {
        const settings = AutoFilingSettings.parse(JSON.parse(row.state_json));
        clean.run('UPDATE auto_filing_settings SET state_json=?', [JSON.stringify({ ...settings, mode: 'paused', message: 'Restored AI filing is paused. Review the connection and resume explicitly.' })]);
      }
    }
    clean.exec("VACUUM;");
  } finally {
    clean.close();
  }
  const verified = checkedDatabase(snapshot);
  let manifest: BackupManifest;
  const database = fileIdentity(snapshot, BACKUP_DATABASE_MAX_BYTES);
  try {
    manifest = BackupManifest.parse({
      format: 1,
      schemaVersion: (
        verified.query("PRAGMA user_version").get() as { user_version: number }
      ).user_version,
      createdAt: new Date().toISOString(),
      database,
      originals: originalIndex(verified),
      counts: counts(verified),
    });
  } finally {
    verified.close();
  }
  if (
    database.byteCount + manifest.originals.reduce((n, f) => n + f.byteCount, 0) + backupHeader(manifest).length >
    BACKUP_MAX_BYTES
  )
    throw new Error("This workspace exceeds the 10 GB backup limit.");
  const originalsDir = join(
    dirname(databasePath),
    `${basename(databasePath)}.originals`,
  );
  if (
    manifest.originals.length &&
    (!lstatSync(originalsDir).isDirectory() ||
      lstatSync(originalsDir).isSymbolicLink())
  )
    throw new Error("The originals folder is missing or is a link.");
  const path = join(staging, "workspace.counsel-backup");
  const output = openSync(path, 'wx', 0o600);
  try {
    writeAll(output, backupHeader(manifest));
    copyVerified(snapshot, database, output);
    for (const file of manifest.originals) {
      try { copyVerified(join(originalsDir, file.hash), file, output); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT')
          throw new Error('An original document is missing or unreadable. Restore the original before creating a backup.');
        throw error;
      }
    }
    fsyncSync(output);
  } finally { closeSync(output); }
  return { path, manifest };
}

/** Worker-only. Validate before creating a destination; never restore into an existing workspace. */
export function readBackup(
  backupPath: string,
  staging: string,
): { manifest: BackupManifest; databasePath: string; originalsOffset: number } {
  const archive = openRegular(backupPath, BACKUP_MAX_BYTES);
  const path = join(staging, "verify.sqlite3");
  let manifest: BackupManifest, originalsOffset: number;
  try {
    const header = readBackupHeader(archive.fd, archive.size);
    manifest = header.manifest;
    requireDiskSpace(staging, manifest.database.byteCount);
    extractPart(archive.fd, header.offset, manifest.database, path);
    originalsOffset = header.offset + manifest.database.byteCount;
    let offset = originalsOffset;
    for (const file of manifest.originals) {
      if (transferPart(archive.fd, offset, file.byteCount) !== file.hash)
        throw new Error('Backup integrity check failed. Use another copy of the backup.');
      offset += file.byteCount;
    }
    if (fstatSync(archive.fd).size !== archive.size) throw new Error('The backup changed during verification.');
  } finally { closeSync(archive.fd); }
  const db = checkedDatabase(path);
  try {
    if (
      (db.query("PRAGMA user_version").get() as { user_version: number })
        .user_version !== manifest.schemaVersion ||
      JSON.stringify(counts(db)) !== JSON.stringify(manifest.counts) ||
      JSON.stringify(originalIndex(db)) !==
        JSON.stringify(manifest.originals)
    )
      throw new Error(
        "The backup manifest does not match its workspace records.",
      );
    for (const row of db
      .query("SELECT key, value_json AS value FROM workspace_settings")
      .all() as { key: string; value: string }[])
      if (!retainedSetting(db, row.key, row.value))
        throw new Error(
          "This backup contains unsupported connection or workspace settings.",
        );
  } finally {
    db.close();
  }
  return { manifest, databasePath: path, originalsOffset };
}

export function restoreBackup(
  backupPath: string,
  staging: string,
  parent: string,
): { databasePath: string; manifest: BackupManifest } {
  const verified = readBackup(backupPath, staging);
  const { manifest } = verified;
  const root = resolve(parent);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  if (!lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink())
    throw new Error("Choose a real folder for the restored workspace.");
  requireDiskSpace(root, manifest.database.byteCount * 2 + manifest.originals.reduce((n, file) => n + file.byteCount, 0));
  const destination = mkdtempSync(join(root, "recovered-"));
  try {
    durableWrite(
      join(destination, ".restore-in-progress"),
      "Restore has not finished. Do not open this folder as a workspace.\n",
    );
    const originalsDir = join(destination, "workspace.sqlite3.originals");
    mkdirSync(originalsDir, { mode: 0o700 });
    const archive = openRegular(backupPath, BACKUP_MAX_BYTES);
    try {
      let offset = verified.originalsOffset;
      for (const file of manifest.originals) {
        extractPart(archive.fd, offset, file, join(originalsDir, file.hash));
        offset += file.byteCount;
      }
    } finally { closeSync(archive.fd); }
    syncDirectory(originalsDir);
    const databasePath = join(destination, "workspace.sqlite3");
    const output = openSync(databasePath, 'wx', 0o600);
    try { copyVerified(verified.databasePath, manifest.database, output); fsyncSync(output); }
    finally { closeSync(output); }
    const db = new Database(databasePath, { strict: true });
    try {
      // No old model execution resumes; partial history remains inspectable.
      new ConversationStore(db, () => new Date().toISOString()).recover();
    } finally {
      db.close();
    }
    const fd = openSync(databasePath, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    syncDirectory(destination);
    unlinkSync(join(destination, ".restore-in-progress"));
    syncDirectory(destination);
    syncDirectory(root);
    return { databasePath, manifest };
  } catch (error) {
    // Only this invocation's newly allocated folder; never a preexisting path.
    rmSync(destination, { recursive: true, force: true });
    throw error;
  }
}
function retainedSetting(db: Database, key: string, value: string): boolean {
  if (key === 'workspace-navigation') { validateNavigation(db, JSON.parse(value)); return true; }
  if (key === 'working-preferences') { WorkingPreferences.parse(JSON.parse(value)); return true; }
  if (key === 'practice-document') { PracticeDocument.parse(JSON.parse(value)); return true; }
  if (key === 'entity-registry') { EntityRegistry.parse(JSON.parse(value)); return true; }
  if (key === "practice-profile") {
    WorkspaceProfile.parse(JSON.parse(value));
    return true;
  }
  if (!key.startsWith("conversation-model:")) return false;
  const id = z.string().uuid().parse(key.slice("conversation-model:".length));
  if (!db.query("SELECT id FROM conversations WHERE id = ?").get(id))
    throw new Error(
      "A chat model preference refers to a missing conversation.",
    );
  ModelPreference.parse(JSON.parse(value));
  return true;
}

function validateStagedImports(db: Database, version: number): void {
  let totalBytes = 0,
    totalText = 0;
  for (const batch of db
    .query("SELECT * FROM import_batches")
    .iterate() as Iterable<{
    id: string;
    input_json: string;
    status: string;
    revision_id: string;
    commit_input_json: string | null;
  }>) {
    z.string().uuid().parse(batch.id);
    z.string().uuid().parse(batch.revision_id);
    const manifest = ImportCreate.parse(JSON.parse(batch.input_json));
    if (batch.commit_input_json)
      ImportCommit.parse(JSON.parse(batch.commit_input_json));
    const inventory = new Map(manifest.files.map(file => [file.path, file.byteCount]));
    const count = (db.query('SELECT count(*) AS n FROM import_entries WHERE batch_id=?').get(batch.id) as { n: number }).n;
    if (count !== manifest.files.length) throw new Error("Import inventory does not match its staged files.");
    const entries = db
      .query("SELECT * FROM import_entries WHERE batch_id=? ORDER BY rowid")
      .iterate(batch.id) as Iterable<{
      id: string;
      path: string;
      byte_count: number;
      content_hash: string | null;
      status: string;
      choice_json: string;
      bytes: Uint8Array | null;
      extracted_json: string | null;
    }>;
    for (const entry of entries) {
      z.string().uuid().parse(entry.id);
      ImportChoice.parse(JSON.parse(entry.choice_json));
      if (
        inventory.get(entry.path) !== entry.byte_count
      )
        throw new Error("Import file metadata does not match its inventory.");
      if (entry.bytes) {
        totalBytes += entry.bytes.byteLength;
        if (
          entry.bytes.length !== entry.byte_count ||
          backupHash(entry.bytes) !== entry.content_hash ||
          batch.status !== "review"
        )
          throw new Error(
            "A staged import original failed its integrity check.",
          );
      }
      const metadata = version >= 13 ? db.query('SELECT * FROM import_entry_metadata WHERE entry_id=?').get(entry.id) as {
        extracted_byte_count: number; text_status: string; notes_json: string;
      } | null : null;
      if (entry.extracted_json) {
        totalText += Buffer.byteLength(entry.extracted_json);
        const extracted = ExtractedFile.parse(JSON.parse(entry.extracted_json));
        if (version >= 13 && (!metadata || metadata.extracted_byte_count !== Buffer.byteLength(entry.extracted_json)
          || metadata.text_status !== extracted.textStatus || metadata.notes_json !== JSON.stringify(extracted.extraction.notes)))
          throw new Error('Staged import metadata does not match its extraction.');
        if (!entry.bytes || batch.status !== "review")
          throw new Error("A staged extraction is missing its original.");
      } else if (metadata) throw new Error('Staged import metadata has no extraction.');
      if (
        batch.status === "review" &&
        entry.status === "ready" &&
        (!entry.bytes || !entry.extracted_json)
      )
        throw new Error("A ready import file is incomplete.");
    }
  }
  if (totalBytes > IMPORT_MAX_BYTES || totalText > IMPORT_MAX_TEXT_BYTES)
    throw new Error("Staged imports exceed their supported size.");
}
