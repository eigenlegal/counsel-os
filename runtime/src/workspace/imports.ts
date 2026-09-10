import { randomUUID, createHash } from "node:crypto";
import { dirname } from 'node:path';
import type { Database } from "bun:sqlite";
import { z } from "zod";
import { importDuplicates, DuplicateSkip, importUndoPreview, undoImport, ImportUndo } from './import-maintenance';
import type { WorkspaceStore } from "./store";
import { WorkspaceConflictError, WorkspaceNotFoundError } from "./types";
import {
  fileBytes,
  extractText,
  extractDocument,
  ExtractedFile,
  DocumentParserBusyError,
} from "./files";
import { ProfileFields } from "./profile";
import { mapImportProfile, type ImportProfileMapping } from './import-profile';
import { mapImportPreferences, combineImportPreferences, ImportPreferenceReview, type ImportPreferenceMapping } from './import-preferences';
import { WorkingPreferenceFields } from './working-preferences';
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_TEXT_BYTES,
  ImportQuery,
  IMPORT_LOCAL_POLICY,
  ImportCreate,
  ImportChoice,
  ImportEdit,
  ImportCommit,
  ImportQueueAction,
  ImportSelection, ImportBulkEdit, ImportChoiceEdits,
  importSkipReason,
  suggestImport,
  type ImportBatch,
  type ImportEntry,
  type ImportReceipt,
  type ImportProgress,
  type ImportListItem,
  type ImportUploadPlan,
} from "./import-types";
import { requireDiskSpace } from './backup-stream';
import { ImportOrganizationJobs } from './import-organization-jobs';
import { ImportLinkApply, ImportLinkQuery, importLinkDigest, importLinkResolver, noteReferences, sameImportMatter,
  type ImportLinkItem, type ImportLinkPreview, type LinkFile, type ResolvedImportLink } from './import-links';

const Id = z.string().uuid();
const hash = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
interface EntryRow {
  id: string;
  path: string;
  byte_count: number;
  content_hash: string | null;
  status: ImportEntry["status"];
  reason: string;
  choice_json: string;
  extracted_json: string | null;
  bytes?: Uint8Array | null;
}
interface BatchRow {
  id: string;
  label: string;
  revision_id: string;
  status: ImportBatch["status"];
  created_at: string;
  input_json: string;
  receipt_json: string | null;
  commit_input_json: string | null;
}

/** Local staging is deliberately outside search/chat tools. No provider or filesystem traversal. */
export class WorkspaceImports {
  readonly organization: ImportOrganizationJobs;
  private linkCache?: { id: string; revisionId: string; files: LinkFile[]; links: ResolvedImportLink[]; scannedFiles: number; omittedFiles: number; truncated: boolean };
  private active = new Set<string>();
  private stopped = false;
  private fault: string | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private task: Promise<void> | undefined;
  private parser = new AbortController();
  private idleWaiters: Array<() => void> = [];
  constructor(
    private db: Database,
    private store: WorkspaceStore,
    private now: () => string,
  ) { this.organization = new ImportOrganizationJobs(db, store, now); this.wake(); }

  /** Stop dispatch and kill the local parser. Retained pending bytes resume on reopen. */
  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.parser.abort();
    if (!this.task) this.settle();
  }
  idle(): Promise<void> {
    if (!this.task && !this.timer) return Promise.resolve();
    return new Promise(resolve => this.idleWaiters.push(resolve));
  }
  private settle(): void {
    for (const resolve of this.idleWaiters.splice(0)) resolve();
  }
  private wake(delay = 0): void {
    if (this.stopped || this.fault || this.timer || this.task) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      let job: { id: string; batch_id: string } | null;
      try { job = this.db.query(`SELECT e.id, e.batch_id FROM import_entries e
        JOIN import_batches b ON b.id=e.batch_id
        LEFT JOIN import_queue q ON q.batch_id=b.id
        WHERE b.status='review' AND coalesce(q.paused,0)=0
          AND e.status='pending' AND e.bytes IS NOT NULL
          AND json_extract(e.choice_json,'$.destination') != 'skip'
        ORDER BY e.rowid LIMIT 1`).get() as typeof job; }
      catch {
        this.fault = 'Local import processing stopped. Check available disk space and retry processing. Received originals are kept.';
        this.settle();
        return;
      }
      if (!job) { this.settle(); return; }
      this.active.add(job.id);
      let retryDelay = 0;
      this.task = this.process(job.batch_id, job.id).then(delay => { retryDelay = delay; })
        .catch(() => { this.fault = 'Local import processing stopped. Check available disk space and retry processing. Received originals are kept.'; })
        .finally(() => {
          this.active.delete(job.id);
          this.task = undefined;
          if (this.stopped || this.fault) this.settle(); else this.wake(retryDelay);
        });
    }, delay);
  }
  private progress(id: string): ImportProgress {
    const result: ImportProgress = { paused: false, problem: this.fault, awaitingUpload: 0, queued: 0, processing: 0, ready: 0, errors: 0, excluded: 0 };
    result.paused = !!(this.db.query('SELECT paused FROM import_queue WHERE batch_id=?').get(id) as { paused: number } | null)?.paused;
    const rows = this.db.query(`SELECT id, status, bytes IS NOT NULL AS uploaded,
      json_extract(choice_json,'$.destination') AS destination FROM import_entries WHERE batch_id=?`).all(id) as Array<{ id: string; status: string; uploaded: number; destination: string }>;
    for (const entry of rows) {
      if (entry.status === 'skipped' || entry.destination === 'skip') result.excluded++;
      else if (entry.status === 'ready') result.ready++;
      else if (entry.status === 'error') result.errors++;
      else if (this.active.has(entry.id)) result.processing++;
      else if (entry.uploaded) result.queued++;
      else result.awaitingUpload++;
    }
    return result;
  }
  control(id: string, raw: z.input<typeof ImportQueueAction>): ImportBatch {
    const input = ImportQueueAction.parse(raw);
    this.db.transaction(() => {
      this.review(id);
      if (input.action === 'retry') {
        this.db.run(`UPDATE import_entries SET status='pending', reason='' WHERE batch_id=?
          AND status='error' AND bytes IS NOT NULL`, [id]);
      }
      this.db.run(`INSERT INTO import_queue VALUES (?,?) ON CONFLICT(batch_id)
        DO UPDATE SET paused=excluded.paused`, [id, input.action === 'pause' ? 1 : 0]);
      this.bump(id);
    }).immediate();
    this.fault = null;
    this.wake();
    return this.get(id);
  }
  list(): ImportListItem[] {
    return (
      this.db
        .query("SELECT id,label,revision_id,status,created_at FROM import_batches ORDER BY rowid DESC LIMIT 50")
        .all() as BatchRow[]
    ).map((row) => ({
      id: row.id,
      label: row.label,
      revisionId: row.revision_id,
      status: row.status,
      createdAt: row.created_at,
      progress: this.progress(row.id),
    }));
  }
  get(id: string, rawQuery?: z.input<typeof ImportQuery>): ImportBatch {
    const row = this.row(id);
    const query = rawQuery ? ImportQuery.parse(rawQuery) : null;
    const clauses = ['batch_id = ?'];
    const params: (string | number)[] = [id];
    if (query?.query) { clauses.push("instr(lower(path || ' ' || json_extract(choice_json,'$.title')), lower(?)) > 0"); params.push(query.query); }
    const excluded = "(status='skipped' OR json_extract(choice_json,'$.destination')='skip')";
    if (query?.status === 'excluded') clauses.push(excluded);
    else if (query && query.status !== 'all') {
      clauses.push(`NOT ${excluded}`);
      if (query.status === 'ready') clauses.push("status='ready'");
      if (query.status === 'waiting') clauses.push("status='pending'");
      if (query.status === 'attention') clauses.push("(status='error' OR (status='ready' AND m.text_status != 'ready'))");
    }
    const where = clauses.join(' AND ');
    const joined = 'import_entries LEFT JOIN import_entry_metadata m ON m.entry_id=import_entries.id';
    const total = (this.db.query(`SELECT count(*) AS n FROM ${joined} WHERE ${where}`).get(...params) as { n: number }).n;
    const pageSql = query ? ' LIMIT ? OFFSET ?' : '';
    const entries = (
      this.db
        .query(
          `SELECT id, path, byte_count, content_hash, status, reason, choice_json, bytes IS NOT NULL AS uploaded, m.text_status, m.notes_json FROM ${joined} WHERE ${where} ORDER BY import_entries.rowid${pageSql}`,
        )
        .all(...params, ...(query ? [query.limit, query.offset] : [])) as Array<
        EntryRow & {
          text_status: ImportEntry["textStatus"];
          notes_json: string | null;
          uploaded: number;
        }
      >
    ).map((entry) => {
      return {
        id: entry.id,
        path: entry.path,
        byteCount: entry.byte_count,
        hash: entry.content_hash,
        status: entry.status,
        reason: entry.reason,
        choice: ImportChoice.parse(JSON.parse(entry.choice_json)),
        textStatus: entry.text_status,
        notes: entry.notes_json ? JSON.parse(entry.notes_json) : [],
        phase: entry.status === 'pending'
          ? this.active.has(entry.id) ? 'processing' as const : entry.uploaded ? 'queued' as const : 'awaiting_upload' as const
          : entry.status,
      };
    });
    return {
      id,
      label: row.label,
      revisionId: row.revision_id,
      status: row.status,
      createdAt: row.created_at,
      entries,
      receipt: row.receipt_json ? JSON.parse(row.receipt_json) : null,
      progress: this.progress(id),
      total,
      offset: query?.offset ?? 0,
      selection: this.selection(id),
    };
  }
  private selection(id: string): ImportBatch['selection'] {
    const rows = this.db.query(`SELECT json_extract(choice_json,'$.destination') AS destination,
      json_extract(choice_json,'$.profile') AS profile, json_extract(choice_json,'$.preferences') AS preferences FROM import_entries
      WHERE batch_id=? AND status!='skipped' AND json_extract(choice_json,'$.destination')!='skip'`).iterate(id) as Iterable<{ destination: string; profile: string | null; preferences: string | null }>;
    const result: ImportBatch['selection'] = { included: 0, templates: 0, profiles: 0, profile: null };
    const preferences: ImportPreferenceReview[] = [];
    for (const row of rows) {
      result.included++;
      if (row.destination === 'template') result.templates++;
      if (row.destination === 'profile' && row.profile) {
        result.profiles++;
        if (!result.profile) result.profile = ProfileFields.parse(JSON.parse(row.profile));
      }
      if (row.destination === 'profile' && row.preferences) preferences.push(ImportPreferenceReview.parse(JSON.parse(row.preferences)));
    }
    if (preferences.length) result.preferences = combineImportPreferences(preferences);
    const linked = (this.db.query(`SELECT coalesce(sum(json_array_length(json_extract(choice_json,'$.linkedMatters'))),0) AS n
      FROM import_entries WHERE batch_id=? AND status!='skipped' AND json_extract(choice_json,'$.destination')='source'`).get(id) as { n: number }).n;
    if (linked) result.linkedMatters = linked;
    return result;
  }
  uploadPlan(id: string): ImportUploadPlan[] {
    this.review(id);
    return (this.db.query(`SELECT id,path,byte_count AS byteCount,status,bytes IS NOT NULL AS uploaded,
      json_extract(choice_json,'$.destination') AS destination FROM import_entries WHERE batch_id=? ORDER BY rowid`).all(id) as Array<{id:string;path:string;byteCount:number;status:ImportEntry['status'];uploaded:number;destination:string}>).map(entry => ({
      id: entry.id, path: entry.path, byteCount: entry.byteCount,
      skip: entry.status === 'skipped' || entry.destination === 'skip',
      phase: entry.status === 'pending' ? this.active.has(entry.id) ? 'processing' : entry.uploaded ? 'queued' : 'awaiting_upload' : entry.status,
    }));
  }
  private row(id: string): Omit<BatchRow, 'input_json'> {
    const row = this.db
      .query("SELECT id,label,revision_id,status,created_at,receipt_json,commit_input_json FROM import_batches WHERE id = ?")
      .get(Id.parse(id)) as Omit<BatchRow, 'input_json'> | null;
    if (!row) throw new WorkspaceNotFoundError("Import not found.");
    return row;
  }
  private review(id: string, revisionId?: string): Pick<BatchRow, 'status' | 'revision_id'> {
    const row = this.db.query('SELECT status,revision_id FROM import_batches WHERE id=?').get(Id.parse(id)) as Pick<BatchRow, 'status' | 'revision_id'> | null;
    if (!row) throw new WorkspaceNotFoundError('Import not found.');
    if (row.status !== "review")
      throw new WorkspaceConflictError(
        "This import is already finished. Start a new import for additional files.",
      );
    if (revisionId && row.revision_id !== revisionId)
      throw new WorkspaceConflictError(
        "This import changed in another window. Reload the review before continuing.",
      );
    return row;
  }
  private bump(id: string): void {
    this.db
      .query("UPDATE import_batches SET revision_id = ? WHERE id = ?")
      .run(randomUUID(), id);
  }
  create(raw: z.input<typeof ImportCreate>): ImportBatch {
    const input = ImportCreate.parse(raw);
    return this.db
      .transaction(() => {
        const previous = this.db
          .query("SELECT * FROM import_batches WHERE client_id = ?")
          .get(input.clientId) as BatchRow | null;
        if (previous) {
          if (previous.input_json !== JSON.stringify(input))
            throw new WorkspaceConflictError(
              "This import identifier belongs to a different selection.",
            );
          return this.get(previous.id);
        }
        if (
          (
            this.db
              .query(
                "SELECT count(*) AS n FROM import_batches WHERE status = 'review'",
              )
              .get() as { n: number }
          ).n >= 3
        )
          throw new WorkspaceConflictError(
            "Finish or discard a staged import before starting another. Three imports are already in review.",
          );
        const total = input.files
          .filter((file) => !importSkipReason(file.path, file.byteCount))
          .reduce((sum, file) => sum + file.byteCount, 0);
        const reserved = (
          this.db
            .query(
              "SELECT coalesce(sum(e.byte_count), 0) AS n FROM import_entries e JOIN import_batches b ON b.id=e.batch_id WHERE b.status='review' AND e.status != 'skipped'",
            )
            .get() as { n: number }
        ).n;
        if (total + reserved > IMPORT_MAX_BYTES)
          throw new WorkspaceConflictError(
            "Staged imports support 1 GB total. Finish or discard an earlier import, or choose fewer files.",
          );
        if (this.store.databasePath !== ':memory:') requireDiskSpace(dirname(this.store.databasePath), (total + reserved) * 3 + IMPORT_MAX_TEXT_BYTES);
        const id = randomUUID();
        this.db.run(
          "INSERT INTO import_batches VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)",
          [
            id,
            input.clientId,
            JSON.stringify(input),
            input.label,
            randomUUID(),
            "review",
            this.now(),
          ],
        );
        for (const file of input.files) {
          const reason = importSkipReason(file.path, file.byteCount);
          this.db.run(
            "INSERT INTO import_entries VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL)",
            [
              randomUUID(),
              id,
              file.path,
              file.byteCount,
              reason ? "skipped" : "pending",
              reason ?? "",
              JSON.stringify(suggestImport(file.path)),
            ],
          );
        }
        return this.get(id);
      })
      .immediate();
  }
  async upload(
    id: string,
    entryId: string,
    base64: string,
  ): Promise<ImportBatch> {
    this.receive(id, entryId, base64);
    return this.get(id);
  }
  receive(id: string, entryId: string, base64: string): { entryId: string; phase: ImportEntry['phase'] } {
    this.review(id);
    const entry = this.entry(id, entryId);
    if (entry.status === "skipped")
      throw new WorkspaceConflictError(entry.reason);
    const { bytes } = fileBytes({
      name: entry.path.split("/").at(-1)!,
      base64,
    });
    const digest = hash(bytes);
    if (
      bytes.length !== entry.byte_count ||
      (entry.content_hash && digest !== entry.content_hash)
    )
      throw new WorkspaceConflictError(
        "This file differs from the staged selection. Start another import for changed files.",
      );
    if (entry.status === "ready") return { entryId, phase: 'ready' };
    if (entry.bytes && entry.content_hash && entry.status === 'pending') return { entryId, phase: this.active.has(entryId) ? 'processing' : 'queued' };
    if ((this.db.query('SELECT paused FROM import_queue WHERE batch_id=?').get(id) as { paused: number } | null)?.paused)
      throw new WorkspaceConflictError('This import is paused. Resume it before uploading more files.');
    // Acknowledge only after the exact original and pending job are committed.
    // Parsing runs independently of this request and of the browser lifecycle.
    if (this.store.databasePath !== ':memory:') requireDiskSpace(dirname(this.store.databasePath), bytes.length * 3);
    this.db.transaction(() => {
      this.db.run("UPDATE import_entries SET bytes=?, content_hash=?, status='pending', reason='', extracted_json=NULL WHERE id=?",
        [bytes, digest, entryId]);
      this.db.run('DELETE FROM import_entry_metadata WHERE entry_id=?', [entryId]);
      this.bump(id);
    }).immediate();
    this.wake();
    return { entryId, phase: 'queued' };
  }
  private async process(id: string, entryId: string): Promise<number> {
    const entry = this.entry(id, entryId) as EntryRow & { bytes: Uint8Array };
    try {
      const bytes = entry.bytes;
      if (!bytes || bytes.length !== entry.byte_count || hash(bytes) !== entry.content_hash)
        throw new WorkspaceConflictError('The staged original failed its integrity check. Start a new import with the original file.');
      const extension = entry.path.split(".").at(-1)!.toLowerCase();
      const extracted =
        extension === "pdf" || extension === "docx"
          ? await extractDocument(bytes, extension, this.parser.signal)
          : extractText(bytes, entry.path);
      if (this.stopped) return 0;
      this.db
        .transaction(() => {
          this.review(id);
          // Preserve explicit local-only labels as a blocking state; this app cannot enforce them after indexing yet.
          const workspaceLocal =
            /^default_locality:[ \t]*["']?local["']?[ \t]*\r?$/im.test(
              extracted.body ?? "",
            );
          if (
            workspaceLocal ||
            /^stays_local:[ \t]*["']?(?:true|yes)["']?[ \t]*\r?$/im.test(
              extracted.body ?? "",
            )
          ) {
            this.db.run(
              "UPDATE import_entries SET status='skipped', reason=?, bytes=NULL, extracted_json=NULL WHERE id=?",
              [
                workspaceLocal
                  ? IMPORT_LOCAL_POLICY
                  : "Marked local-only. This workspace cannot preserve that inference policy yet; this file will not be indexed.",
                entryId,
              ],
            );
          } else {
            const textBytes = (
              this.db
                .query(
                  "SELECT coalesce(sum(extracted_byte_count),0) AS n FROM import_entry_metadata",
                )
                .get() as { n: number }
            ).n;
            const json = JSON.stringify(extracted);
            if (textBytes + Buffer.byteLength(json) > IMPORT_MAX_TEXT_BYTES)
              throw new WorkspaceConflictError(
                "Staged extracted text exceeds 250 MB. Finish another import or skip some files before importing.",
              );
            this.db.run(
              "UPDATE import_entries SET status='ready', reason='', extracted_json=? WHERE id=?",
              [json, entryId],
            );
            this.db.run('INSERT OR REPLACE INTO import_entry_metadata VALUES (?,?,?,?)',
              [entryId, Buffer.byteLength(json), extracted.textStatus, JSON.stringify(extracted.extraction.notes)]);
          }
          this.bump(id);
        })
        .immediate();
      return 0;
    } catch (error) {
      if (this.stopped) return 0;
      // Chat attachment parsing shares the bounded local parser pool. Queue
      // backpressure is not a failed file and should not require user retry.
      if (error instanceof DocumentParserBusyError) return 250;
      if (this.row(id).status === "review") {
        const reason =
          error instanceof Error
            ? error.message.slice(0, 1_000)
            : "This file could not be read.";
        this.db
          .transaction(() => {
            this.db.run(
              "UPDATE import_entries SET status='error', reason=? WHERE id=?",
              [reason, entryId],
            );
            this.bump(id);
          })
          .immediate();
        return 0;
      }
      return 0;
    }
  }
  private entry(id: string, entryId: string): EntryRow {
    const row = this.db
      .query("SELECT * FROM import_entries WHERE batch_id=? AND id=?")
      .get(Id.parse(id), Id.parse(entryId)) as EntryRow | null;
    if (!row) throw new WorkspaceNotFoundError("Import file not found.");
    return row;
  }
  inspect(
    id: string,
    entryId: string,
  ): { body: string | null; profileSuggestion: ProfileFields | null; profileMapping: ImportProfileMapping; preferenceMapping: ImportPreferenceMapping } {
    this.review(id);
    const row = this.entry(id, entryId);
    const extracted = row.extracted_json
      ? ExtractedFile.parse(JSON.parse(row.extracted_json))
      : null;
    const profileMapping = mapImportProfile(extracted?.body ?? '');
    return {
      body: extracted?.body ?? null,
      profileSuggestion: profileMapping.suggestion,
      profileMapping,
      preferenceMapping: mapImportPreferences(extracted?.body ?? ''),
    };
  }
  selectEntries(id: string, raw: z.input<typeof ImportSelection>): { revisionId: string; entryIds: string[] } {
    const query = ImportSelection.parse(raw);
    const row = this.review(id);
    const entryIds: string[] = [];
    // Page metadata only; do not materialize original bytes or extraction bodies.
    for (let offset = 0; ; offset += 100) {
      const page = this.get(id, { ...query, offset, limit: 100 });
      entryIds.push(...page.entries.filter(entry => entry.status !== 'skipped').map(entry => entry.id));
      if (offset + page.entries.length >= page.total) break;
    }
    return { revisionId: row.revision_id, entryIds };
  }
  /** Read-only helper input. Explicit IDs are checked against this batch before any model call. */
  organizationInput(id: string, revisionId: string, entryIds: string[], background = false) {
    this.review(id, Id.parse(revisionId));
    if (this.db.query('SELECT 1 FROM import_entries WHERE batch_id=? AND reason=? LIMIT 1').get(id, IMPORT_LOCAL_POLICY))
      throw new WorkspaceConflictError(IMPORT_LOCAL_POLICY);
    const progress = this.progress(id);
    if (progress.awaitingUpload || progress.queued || progress.processing || progress.errors)
      throw new WorkspaceConflictError('Finish uploading and processing this import before sharing selected files for AI organization.');
    return entryIds.map(entryId => {
      const row = this.db.query('SELECT id,path,status,choice_json,extracted_json FROM import_entries WHERE batch_id=? AND id=?')
        .get(Id.parse(id), Id.parse(entryId)) as EntryRow | null;
      if (!row) throw new WorkspaceNotFoundError('Import file not found.');
      const choice = ImportChoice.parse(JSON.parse(row.choice_json));
      if (row.status !== 'ready' || ['skip', 'profile'].includes(choice.destination))
        throw new WorkspaceConflictError('AI organization needs ready, included files. Review profile sources separately.');
      const extracted = ExtractedFile.parse(JSON.parse(row.extracted_json!));
      const body = extracted.body ?? '';
      const passages = background && body.length > 6000
        ? [body.slice(0, 3000), body.slice(Math.floor(body.length / 2), Math.floor(body.length / 2) + 1500), body.slice(-1500)]
        : [body.slice(0, background ? 6000 : 3000)];
      return { entryId: row.id, path: row.path, choice, passages,
        text: passages.join('\n[Omitted text]\n'), partial: extracted.textStatus !== 'ready' || body.length > (background ? 6000 : 3000) };
    });
  }
  bulkEdit(id: string, raw: z.input<typeof ImportBulkEdit>): ImportBatch {
    const input = ImportBulkEdit.parse(raw);
    return this.db.transaction(() => {
      this.review(id, input.expectedRevisionId);
      for (const entryId of input.entryIds) {
        const row = this.db.query('SELECT choice_json FROM import_entries WHERE batch_id=? AND id=?')
          .get(id, entryId) as Pick<EntryRow, 'choice_json'> | null;
        if (!row) throw new WorkspaceNotFoundError('Import file not found.');
        this.writeChoice(id, entryId, ImportChoice.parse({ ...JSON.parse(row.choice_json), ...input.patch,
          ...(input.patch.destination && input.patch.destination !== 'skip' ? { preferences: null } : {}) }));
      }
      this.bump(id); this.wake();
      return this.get(id, {});
    }).immediate();
  }
  editChoices(id: string, raw: z.input<typeof ImportChoiceEdits>): ImportBatch {
    const input = ImportChoiceEdits.parse(raw);
    return this.db.transaction(() => {
      this.review(id, input.expectedRevisionId);
      for (const change of input.changes) this.writeChoice(id, change.entryId, change.choice);
      this.bump(id); this.wake();
      return this.get(id, {});
    }).immediate();
  }
  private writeChoice(id: string, entryId: string, choice: ImportChoice): void {
    this.organization.assertEditable(id);
    const row = this.db.query('SELECT status FROM import_entries WHERE batch_id=? AND id=?')
      .get(id, entryId) as Pick<EntryRow, 'status'> | null;
    if (!row) throw new WorkspaceNotFoundError('Import file not found.');
    if (row.status === 'skipped' && choice.destination !== 'skip')
      throw new WorkspaceConflictError('An excluded file cannot be indexed by changing its destination.');
    if (choice.matterId) this.store.getMatter(choice.matterId);
    for (const matter of choice.linkedMatters ?? []) if (matter.matterId) this.store.getMatter(matter.matterId);
    this.db.run('UPDATE import_entries SET choice_json=? WHERE id=?', [JSON.stringify(choice), entryId]);
  }
  edit(
    id: string,
    entryId: string,
    raw: z.input<typeof ImportEdit>,
  ): ImportBatch {
    const input = ImportEdit.parse(raw);
    return this.db
      .transaction(() => {
        this.review(id, input.expectedRevisionId);
        const row = this.entry(id, entryId);
        this.organization.assertEditable(id);
        if (row.status === "skipped" && input.choice.destination !== "skip")
          throw new WorkspaceConflictError(
            "This file was excluded and cannot be indexed by changing its destination.",
          );
        this.writeChoice(id, entryId, input.choice);
        this.bump(id);
        this.wake();
        return this.get(id);
      })
      .immediate();
  }
  discard(id: string, revisionId: string): ImportBatch {
    return this.db
      .transaction(() => {
        const row = this.row(id);
        if (row.status === "discarded") return this.get(id);
        this.review(id, Id.parse(revisionId));
        this.organization.assertEditable(id);
        if (this.get(id).entries.some((entry) => this.active.has(entry.id)))
          throw new WorkspaceConflictError(
            "Wait for the current file to finish before discarding this import.",
          );
        this.db.run(
          "UPDATE import_batches SET status='discarded', revision_id=? WHERE id=?",
          [randomUUID(), id],
        );
        this.db.run(
          "UPDATE import_entries SET bytes=NULL, extracted_json=NULL WHERE batch_id=?",
          [id],
        );
        this.db.run('DELETE FROM import_entry_metadata WHERE entry_id IN (SELECT id FROM import_entries WHERE batch_id=?)', [id]);
        this.db.run('DELETE FROM import_organization_results WHERE batch_id=?', [id]);
        return this.get(id);
      })
      .immediate();
  }
  commit(id: string, raw: z.input<typeof ImportCommit>): ImportBatch {
    const input = ImportCommit.parse(raw);
    const newFiles = new Set<string>();
    try {
      return this.db
        .transaction(() => {
          const previous = this.row(id);
          if (previous.status === "committed") {
            if (previous.commit_input_json !== JSON.stringify(input))
              throw new WorkspaceConflictError(
                "This import was already committed with different choices.",
              );
            return this.get(id);
          }
          this.review(id, input.expectedRevisionId);
          this.organization.assertEditable(id);
          if (
            this.get(id).entries.some(
              (entry) => entry.reason === IMPORT_LOCAL_POLICY,
            )
          )
            throw new WorkspaceConflictError(IMPORT_LOCAL_POLICY);
          const entries = this.get(id).entries.filter(
            (entry) =>
              entry.status !== "skipped" && entry.choice.destination !== "skip",
          );
          if (!entries.length)
            throw new WorkspaceConflictError(
              "Choose at least one readable file to import.",
            );
          if (
            entries.some(
              (entry) => entry.status !== "ready" || this.active.has(entry.id),
            )
          )
            throw new WorkspaceConflictError(
              "Some files are not ready. Retry them or mark them Skip before importing.",
            );
          if (
            input.profile &&
            (!entries.some((entry) => entry.choice.destination === "profile") ||
              this.store.getProfile())
          )
            throw new WorkspaceConflictError(
              "Profile import requires a selected profile source and an empty workspace profile. Existing profiles are never replaced.",
            );
          if (input.profile) {
            const profiles = entries.filter(
              (entry) =>
                entry.choice.destination === "profile" && entry.choice.profile,
            );
            if (
              profiles.length !== 1 ||
              JSON.stringify(profiles[0]!.choice.profile) !==
                JSON.stringify(input.profile)
            )
              throw new WorkspaceConflictError(
                "Review exactly one profile source before applying its fields.",
              );
          }
          const receipt: ImportReceipt = {
            committedAt: this.now(),
            matterIds: [],
            items: [],
            profileRevisionId: null,
          };
          if (input.preferences) {
            const selected = this.selection(id).preferences;
            if (!selected?.review || JSON.stringify(selected.review) !== JSON.stringify(input.preferences))
              throw new WorkspaceConflictError('Review the working preferences in each selected file and resolve conflicting fields before applying them.');
            if ((this.store.getWorkingPreferences()?.revisionId ?? null) !== input.preferences.expectedRevisionId)
              throw new WorkspaceConflictError('Working preferences changed after your import review. Review the current values again or import only the files.');
          }
          const matters = new Map<string, string>();
          const resolveMatter = (reference: { matterId: string | null; matterTitle: string | null }) => {
            if (reference.matterId) { this.store.getMatter(reference.matterId); return reference.matterId; }
            if (!reference.matterTitle) return null;
            let matterId = matters.get(reference.matterTitle);
            if (!matterId) {
              matterId = this.store.createMatter({ title: reference.matterTitle,
                summary: 'Created from reviewed import choices. Read the linked sources; no status or deadlines were inferred.' }).id;
              matters.set(reference.matterTitle, matterId); receipt.matterIds.push(matterId);
            }
            return matterId;
          };
          for (const entry of entries) {
            const choice = entry.choice;
            const staged = this.db
              .query(
                "SELECT bytes, extracted_json FROM import_entries WHERE id=?",
              )
              .get(entry.id) as { bytes: Uint8Array; extracted_json: string };
            if (!staged.bytes || hash(staged.bytes) !== entry.hash)
              throw new WorkspaceConflictError(
                "A staged original failed its integrity check.",
              );
            const extracted = ExtractedFile.parse(
              JSON.parse(staged.extracted_json),
            );
            if (
              choice.destination !== "source" &&
              choice.destination !== "profile" &&
              !extracted.body?.trim()
            )
              throw new WorkspaceConflictError(
                `${choice.title} has no readable text. Keep it as a Source or skip it.`,
              );
            if (
              choice.destination === "template" &&
              (!input.allowPracticeWideTemplates || !choice.whenToUse)
            )
              throw new WorkspaceConflictError(
                "Templates require a when-to-use description and explicit practice-wide sharing confirmation.",
              );
            const matterId = resolveMatter(choice);
            const source = this.store.retainPreparedImport(
              {
                name: entry.path.split("/").at(-1)!,
                title: choice.title,
                bytes: Buffer.from(staged.bytes),
                extracted,
                matterId,
                origin: `import:${id}/${entry.path}`,
              },
              newFiles,
            );
            for (const reference of choice.linkedMatters ?? []) this.store.linkSource(resolveMatter(reference)!, source.id);
            const item: ImportReceipt["items"][number] = {
              entryId: entry.id,
              sourceId: source.id,
              sourceRevisionId: source.latest.id,
            };
            if (choice.destination !== 'source') this.store.placeSource(source.id, {
              collection: 'practice', expectedRevisionId: source.placement?.revisionId ?? null,
            });
            else if (choice.collection !== 'unfiled') this.store.placeSource(source.id, {
              collection: choice.collection, expectedRevisionId: source.placement?.revisionId ?? null,
            });
            if (
              ["position", "method", "language", "pattern"].includes(
                choice.destination,
              )
            )
              item.practiceId = this.store.createKnowledge({
                kind: choice.destination as
                  | "position"
                  | "method"
                  | "language"
                  | "pattern",
                ownership: "user",
                matterId,
                revision: {
                  title: choice.title,
                  body: extracted.body!,
                  status: "pending",
                },
              }).id;
            if (choice.destination === "template")
              item.templateId = this.store.templates.create({
                clientId: entry.id,
                sourceRevisionId: source.latest.id,
                title: choice.title,
                whenToUse: choice.whenToUse,
                jurisdiction: choice.jurisdiction,
                practiceWideUse: true,
              }).id;
            item.placementRevisionId = this.store.getSource(source.id).placement?.revisionId ?? null;
            receipt.items.push(item);
          }
          if (input.profile)
            receipt.profileRevisionId = this.store.saveProfile({
              ...input.profile,
              applyToChats: false,
              expectedRevisionId: null,
            }).revisionId;
          if (input.preferences) {
            const current = WorkingPreferenceFields.strip().parse(this.store.getWorkingPreferences() ?? {});
            receipt.workingPreferencesRevisionId = this.store.saveWorkingPreferences({ ...current,
              ...input.preferences.changes, expectedRevisionId: input.preferences.expectedRevisionId }).revisionId;
          }
          this.db.run(
            "UPDATE import_batches SET status='committed', revision_id=?, receipt_json=?, commit_input_json=? WHERE id=?",
            [randomUUID(), JSON.stringify(receipt), JSON.stringify(input), id],
          );
          this.db.run(
            "UPDATE import_entries SET bytes=NULL, extracted_json=NULL WHERE batch_id=?",
            [id],
          );
          this.db.run('DELETE FROM import_entry_metadata WHERE entry_id IN (SELECT id FROM import_entries WHERE batch_id=?)', [id]);
          return this.get(id);
        })
        .immediate();
    } catch (error) {
      this.store.discardUnregisteredImportFiles(newFiles);
      throw error;
    }
  }
  duplicates(id: string) { return importDuplicates(this.db, id); }
  /** The reviewed role survives renamed roots and later revisions. A provenance string
   * alone cannot impersonate a receipt or turn an ordinary company profile into personal data.
   */
  isProfileSource(sourceId: string): boolean {
    const first = this.db.query('SELECT provenance_json FROM source_revisions WHERE source_id=? AND revision_no=1').get(sourceId) as { provenance_json: string } | null;
    const origin = first ? JSON.parse(first.provenance_json).origin as string : '';
    const match = origin.match(/^import:([a-f0-9-]{36})\/(.+)$/i);
    if (!match) return false;
    return !!this.db.query(`SELECT 1 FROM import_entries e JOIN import_batches b ON b.id=e.batch_id
      WHERE b.id=? AND b.status='committed' AND e.path=? AND json_extract(e.choice_json,'$.destination')='profile'
      AND EXISTS (SELECT 1 FROM json_each(b.receipt_json,'$.items') item
        WHERE json_extract(item.value,'$.entryId')=e.id AND json_extract(item.value,'$.sourceId')=?) LIMIT 1`).get(match[1]!,match[2]!,sourceId);
  }
  /** Recomputed only when staged inputs/choices change. This is local metadata
   * maintenance, never an AI call or permission to open a referenced path. */
  private linkInventory(id: string) {
    const batch = this.review(id);
    const progress = this.progress(id);
    if (progress.awaitingUpload || progress.queued || progress.processing) throw new WorkspaceConflictError('Finish local file processing before checking document links.');
    if (this.linkCache?.id === id && this.linkCache.revisionId === batch.revision_id) return this.linkCache;
    const files = (this.db.query('SELECT id,path,status,choice_json FROM import_entries WHERE batch_id=? ORDER BY path,id').all(id) as Array<{ id: string; path: string; status: string; choice_json: string }>).
      map(row => ({ id: row.id, path: row.path, status: row.status, choice: ImportChoice.parse(JSON.parse(row.choice_json)) }));
    const resolve = importLinkResolver(files), byId = new Map(files.map(file => [file.id, file]));
    const links: ResolvedImportLink[] = [];
    let scannedFiles = 0, scannedBytes = 0, truncated = false;
    for (const row of this.db.query(`SELECT id,extracted_json FROM import_entries WHERE batch_id=? AND status='ready'
      AND json_extract(choice_json,'$.destination') NOT IN ('skip','profile') ORDER BY path,id`).iterate(id) as Iterable<{ id: string; extracted_json: string }>) {
      const file = byId.get(row.id)!;
      if (!/\.(md|txt)$/i.test(file.path)) continue;
      if (scannedFiles >= 1000 || scannedBytes + Buffer.byteLength(row.extracted_json) > 20_000_000 || links.length >= 10_000) { truncated = true; break; }
      const body = ExtractedFile.parse(JSON.parse(row.extracted_json)).body ?? '';
      scannedFiles++; scannedBytes += Buffer.byteLength(row.extracted_json);
      const found = noteReferences(body); truncated ||= found.truncated;
      for (const reference of found.items) {
        if (links.length >= 10_000) { truncated = true; break; }
        links.push(resolve(file, reference));
      }
    }
    this.linkCache = { id, revisionId: batch.revision_id, files, links, scannedFiles,
      omittedFiles: files.length - scannedFiles, truncated };
    return this.linkCache;
  }
  private linkReview(id: string) {
    const inventory = this.linkInventory(id), files = new Map(inventory.files.map(file => [file.id, file]));
    const names = new Map<string, string>();
    const titleOf = (matterId: string) => {
      if (!names.has(matterId)) names.set(matterId, this.store.getMatter(matterId).title);
      return names.get(matterId)!;
    };
    const items: ImportLinkItem[] = inventory.links.map(link => {
      const from = files.get(link.fromId)!, target = link.targetId ? files.get(link.targetId)! : null;
      const matter = from.choice.matterId || from.choice.matterTitle ? { matterId: from.choice.matterId, matterTitle: from.choice.matterTitle,
        title: from.choice.matterId ? titleOf(from.choice.matterId) : from.choice.matterTitle! } : null;
      const alreadyShared = !!(matter && target && (sameImportMatter(matter, target.choice) || target.choice.linkedMatters?.some(item => sameImportMatter(matter, item))));
      const canShare = link.status === 'matched' && !!matter && target?.choice.destination === 'source' && target.choice.collection === 'unfiled'
        && target.id !== from.id && !alreadyShared;
      const note = link.status === 'outside' ? 'Outside the selected inventory or an unsupported link format; nothing was opened or fetched.'
        : link.status === 'missing' ? 'Linked file not found among the selected files.'
        : link.status === 'ambiguous' ? 'More than one selected file matches; no target was chosen.'
        : link.status === 'excluded' ? 'The target is excluded, a profile source or not readable yet.'
        : alreadyShared ? 'Already included in this matter’s import choices.'
        : !matter ? 'File the referring note to a matter first, then review this association.'
        : !canShare ? 'Reference found. Reusable material and self-links are not automatically shared.'
        : target?.choice.matterId || target?.choice.matterTitle ? 'This file already has another matter. Adding this link shares one copy with both; it does not merge matters.'
        : 'This reference can make the linked file available in the referring note’s matter. Review before adding it.';
      return { ...link, matter, alreadyShared, canShare, note };
    });
    return { inventory, items, expectedVersion: importLinkDigest([inventory.revisionId, items]) };
  }
  links(id: string, raw: z.input<typeof ImportLinkQuery> = {}): ImportLinkPreview {
    const query = ImportLinkQuery.parse(raw), { inventory, items, expectedVersion } = this.linkReview(id);
    const filtered = items.filter(item => query.view === 'all' || (query.view === 'sharing' ? item.canShare : item.status !== 'matched'));
    return { revisionId: inventory.revisionId, expectedVersion, offset: query.offset, total: filtered.length,
      scannedFiles: inventory.scannedFiles, omittedFiles: inventory.omittedFiles, truncated: inventory.truncated,
      matched: items.filter(item => item.status === 'matched').length, unresolved: items.filter(item => item.status !== 'matched').length,
      shareable: items.filter(item => item.canShare).length, items: filtered.slice(query.offset, query.offset + 50) };
  }
  applyLinks(id: string, raw: z.input<typeof ImportLinkApply>) {
    const input = ImportLinkApply.parse(raw);
    return this.db.transaction(() => {
      this.review(id, input.expectedRevisionId); this.organization.assertEditable(id);
      const review = this.linkReview(id);
      if (review.expectedVersion !== input.expectedVersion) throw new WorkspaceConflictError('The links or matter names changed. Review the current associations.');
      const changes = new Map<string, ImportChoice>();
      for (const linkId of input.linkIds) {
        const link = review.items.find(item => item.id === linkId);
        if (!link?.canShare || !link.targetId || !link.matter) throw new WorkspaceConflictError('A selected link is unresolved or already shared. No choices were changed.');
        const choice = changes.get(link.targetId) ?? review.inventory.files.find(file => file.id === link.targetId)!.choice;
        const reference = { matterId: link.matter.matterId, matterTitle: link.matter.matterTitle };
        const existing = choice.linkedMatters ?? [];
        changes.set(link.targetId, ImportChoice.parse({ ...choice, linkedMatters: existing.some(item => sameImportMatter(reference, item)) ? existing : [...existing, reference] }));
      }
      return this.editChoices(id, { expectedRevisionId: input.expectedRevisionId, changes: [...changes].map(([entryId, choice]) => ({ entryId, choice })) });
    }).immediate();
  }
  skipDuplicates(id: string, raw: z.input<typeof DuplicateSkip>) {
    const input = DuplicateSkip.parse(raw);
    return this.db.transaction(() => {
      const preview = this.duplicates(id);
      if (preview.expectedVersion !== input.expectedVersion) throw new WorkspaceConflictError('The duplicate matches changed. Check them again.');
      const checked = new Set<string>();
      for (const entryId of input.entryIds) {
        const item = preview.items.find(item => item.entryId === entryId);
        if (!item) throw new WorkspaceConflictError('This file no longer matches an active original.');
        if (!checked.has(item.revisionId)) { this.store.originalFile(item.revisionId); checked.add(item.revisionId); }
      }
      return this.bulkEdit(id, { expectedRevisionId: preview.revisionId, entryIds: input.entryIds, patch: { destination: 'skip' } });
    }).immediate();
  }
  undoPreview(id: string) { return importUndoPreview(this.db, this.store, id); }
  undo(id: string, raw: z.input<typeof ImportUndo>) { return undoImport(this.db, this.store, id, raw, this.now); }
}
