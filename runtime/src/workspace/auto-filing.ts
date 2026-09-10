import { randomUUID } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import type { z } from 'zod';
import type { WorkspaceStore } from './store';
import { all, one } from './queries';
import { COLLECTION_SQL, sourcePlacement } from './source-library';
import { importLinkDigest } from './import-links';
import { prepareSourceOrganization, type SourceOrganizationSuggestions } from './source-organization';
import { WorkspaceConflictError } from './types';
import { AutoFilingEnable, AutoFilingControl, AutoFilingSettings, AutoFilingResult, AutoFilingReview, AutoFilingQuery,
  type AutoFilingStatus, type FilingResult } from './auto-filing-types';

type Settings = NonNullable<AutoFilingStatus['settings']>;
type Task = { sourceId: string; generation: number; runId: string | null; state: string };
export type FilingClaim = { runId: string; settingsRevision: string; modelChoice: Settings['modelChoice']; instruction: string;
  files: Array<{ sourceId: string; generation: number; sourceVersion: string; fingerprint: string }> };
const TASK = 'source_id AS sourceId,generation,run_id AS runId,state';
const stamp = () => new Date().toISOString();

/** Local durable work/proposals only. No provider calls and no inferred Practice changes. */
export class AutoFiling {
  constructor(private db: Database, private store: WorkspaceStore, private now = stamp) {}
  settings(): Settings | null {
    const row = one<{ revision: string; json: string }>(this.db, 'SELECT revision_id AS revision,state_json AS json FROM auto_filing_settings');
    return row ? { revisionId: row.revision, ...AutoFilingSettings.parse(JSON.parse(row.json)) } : null;
  }
  private save(value: z.infer<typeof AutoFilingSettings>) {
    this.db.run(`INSERT INTO auto_filing_settings VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET revision_id=excluded.revision_id,state_json=excluded.state_json`,
      [randomUUID(), JSON.stringify(AutoFilingSettings.parse({ ...value, updatedAt: this.now() }))]);
  }
  private change(mode: Settings['mode'], message: string) {
    const current = this.settings(); if (!current) return;
    const { revisionId, ...value } = current; this.save({ ...value, mode, message: message.slice(0,2000) });
  }
  private enqueue() {
    this.db.run(`INSERT INTO auto_filing_tasks SELECT s.id,'queued',1,NULL,'',? FROM sources s
      WHERE ${COLLECTION_SQL}='unfiled' AND NOT EXISTS(SELECT 1 FROM auto_filing_protection p WHERE p.source_id=s.id)
      AND NOT EXISTS(SELECT 1 FROM source_lifecycle l WHERE l.source_id=s.id AND l.state='trashed')
      ON CONFLICT(source_id) DO UPDATE SET state='queued',generation=generation+1,run_id=NULL,message='',updated_at=excluded.updated_at`, [this.now()]);
  }
  enable(raw: z.input<typeof AutoFilingEnable>) {
    const input = AutoFilingEnable.parse(raw);
    return this.db.transaction(() => {
      const before = this.settings();
      if ((before?.revisionId ?? null) !== input.expectedRevisionId) throw new WorkspaceConflictError('AI filing settings changed. Review the current setting before enabling.');
      this.save({ mode: 'running', activeRunId: before?.activeRunId ?? null, modelChoice: input.modelChoice, instruction: input.instruction, calls: before?.calls ?? 0,
        enabledAt: before?.enabledAt ?? this.now(), updatedAt: this.now(), message: 'Checking unfiled documents. All filing suggestions remain for your review.' });
      this.enqueue(); return this.settings();
    }).immediate();
  }
  control(raw: z.input<typeof AutoFilingControl>) {
    const input = AutoFilingControl.parse(raw);
    return this.db.transaction(() => {
      const current = this.settings();
      if (!current || (input.action !== 'pause' && current.revisionId !== input.expectedRevisionId)) throw new WorkspaceConflictError('AI filing changed. Refresh before continuing.');
      this.change(input.action === 'pause' ? 'paused' : input.action === 'resume' ? 'running' : current.mode,
        input.action === 'pause' ? 'Paused. Completed suggestions are retained.' : 'Checking new or changed unfiled documents.');
      if (input.action !== 'pause') this.enqueue();
      return this.settings();
    }).immediate();
  }
  recover() {
    this.db.transaction(() => {
      if (this.settings()?.activeRunId || this.db.query("SELECT 1 FROM auto_filing_tasks WHERE state='running' LIMIT 1").get()) {
        const current = this.settings();
        if (current) { const { revisionId, ...value } = current; this.save({ ...value, activeRunId: null, mode: 'paused', message: 'AI filing was interrupted. Completed suggestions are retained. Resume explicitly; an interrupted request may have used your plan.' }); }
        this.db.run("UPDATE auto_filing_tasks SET state='queued',generation=generation+1,run_id=NULL WHERE state='running'");
      }
    }).immediate();
  }
  private snapshot(sourceId: string) {
    if (this.db.query('SELECT 1 FROM auto_filing_protection WHERE source_id=?').get(sourceId)) throw new WorkspaceConflictError('Your explicit filing choice is preserved. Use manual filing help to reconsider it.');
    const context = prepareSourceOrganization(this.store, [sourceId]);
    const file = context.files[0]!;
    if (!file.text.trim()) throw new WorkspaceConflictError('No readable text is available. Provide a text-readable copy or organize this file manually.');
    const sourceVersion = context.before.expectedVersion;
    const fingerprint = importLinkDigest(['auto-filing-v1', sourceVersion, file.candidateMatters, this.settings()?.instruction ?? '']);
    return { sourceVersion, fingerprint, file };
  }
  claim(): FilingClaim | null {
    return this.db.transaction(() => {
      const settings = this.settings();
      if (settings?.mode !== 'running' || settings.activeRunId || this.db.query("SELECT 1 FROM conversation_turns WHERE status='running' LIMIT 1").get()) return null;
      const candidates = all<Task>(this.db, `SELECT ${TASK} FROM auto_filing_tasks WHERE state='queued' ORDER BY updated_at,source_id LIMIT 50`);
      const files: FilingClaim['files'] = [], runId = randomUUID();
      for (const task of candidates) {
        try {
          if (sourcePlacement(this.db, task.sourceId).collection !== 'unfiled' || this.db.query('SELECT 1 FROM auto_filing_protection WHERE source_id=?').get(task.sourceId)) {
            this.taskState(task.sourceId, 'protected', 'Your existing filing is preserved.'); continue;
          }
          const current = this.snapshot(task.sourceId);
          const existing = one<{ id: string }>(this.db, `SELECT id FROM auto_filing_results WHERE source_id=? AND
            (fingerprint=? OR (state='dismissed' AND json_extract(result_json,'$.sourceVersion')=?)) LIMIT 1`, task.sourceId, current.fingerprint, current.sourceVersion);
          if (existing) {
            this.db.run("UPDATE auto_filing_results SET state='ready' WHERE id=? AND fingerprint=? AND state='superseded'", [existing.id, current.fingerprint]);
            this.taskState(task.sourceId, 'complete', 'This version already has a retained filing review.'); continue;
          }
          this.db.run("UPDATE auto_filing_results SET state='superseded' WHERE source_id=? AND state='ready'", [task.sourceId]);
          this.db.run("UPDATE auto_filing_tasks SET state='running',run_id=?,message='',updated_at=? WHERE source_id=?", [runId, this.now(), task.sourceId]);
          files.push({ sourceId: task.sourceId, generation: task.generation, sourceVersion: current.sourceVersion, fingerprint: current.fingerprint });
          if (files.length === 8) break;
        } catch (error) { this.taskState(task.sourceId, 'blocked', (error as Error).message); }
      }
      if (!files.length) return null;
      const { revisionId, ...value } = settings;
      this.save({ ...value, activeRunId: runId, calls: value.calls + 1, message: 'Reading unfiled documents and preparing filing suggestions.' });
      return { runId, files, modelChoice: settings.modelChoice, instruction: settings.instruction, settingsRevision: this.settings()!.revisionId };
    }).immediate();
  }
  private taskState(sourceId: string, state: string, message = '') {
    this.db.run('UPDATE auto_filing_tasks SET state=?,run_id=NULL,message=?,updated_at=? WHERE source_id=?', [state, message.slice(0,2000), this.now(), sourceId]);
  }
  complete(claim: FilingClaim, response: SourceOrganizationSuggestions) {
    this.db.transaction(() => {
      if (this.settings()?.revisionId !== claim.settingsRevision || this.settings()?.mode !== 'running') {
        this.release(claim); this.finishRun(claim); return;
      }
      // Validate the complete response before retaining any per-file results.
      if (response.suggestions.length !== claim.files.length || new Set(response.suggestions.map(s => s.sourceId)).size !== claim.files.length
        || response.suggestions.some(s => !claim.files.some(f => f.sourceId === s.sourceId))) throw new WorkspaceConflictError('Incomplete AI filing results. No suggestions were retained from this request.');
      for (const file of claim.files) {
        const task = one<Task>(this.db, `SELECT ${TASK} FROM auto_filing_tasks WHERE source_id=?`, file.sourceId);
        if (task?.state !== 'running' || task.runId !== claim.runId || task.generation !== file.generation) continue;
        try {
          const current = this.snapshot(file.sourceId);
          if (current.fingerprint !== file.fingerprint) { this.taskState(file.sourceId, 'queued'); continue; }
          const { title, partial, ...suggestion } = response.suggestions.find(s => s.sourceId === file.sourceId)!;
          // Defense in depth: only exact supplied evidence and that file's candidates may be retained.
          if (!(current.file.title.includes(suggestion.evidenceQuote) || current.file.text.includes(suggestion.evidenceQuote)) ||
            (suggestion.target.collection === 'matter' && !current.file.candidateMatters.some(m => m.id === suggestion.target.matterId && m.title === suggestion.target.matterTitle)))
            throw new WorkspaceConflictError('The suggestion did not match this file’s evidence or candidate matters.');
          const result = AutoFilingResult.parse({ sourceId: file.sourceId, sourceVersion: file.sourceVersion, fingerprint: file.fingerprint,
            title: current.file.title, suggestion, partial: current.file.partial, candidateMatters: current.file.candidateMatters });
          this.db.run("INSERT INTO auto_filing_results VALUES (?,?,?,'ready',?,?) ON CONFLICT(source_id,fingerprint) DO NOTHING",
            [randomUUID(), file.sourceId, file.fingerprint, JSON.stringify(result), this.now()]);
          this.taskState(file.sourceId, 'complete');
        } catch (error) { this.taskState(file.sourceId, 'blocked', (error as Error).message); }
      }
      this.finishRun(claim, 'running', 'Completed suggestions are ready to review. New and changed unfiled files are checked while idle.');
    }).immediate();
  }
  private release(claim: FilingClaim) {
    this.db.run("UPDATE auto_filing_tasks SET state='queued',generation=generation+1,run_id=NULL WHERE run_id=? AND state='running'", [claim.runId]);
  }
  private finishRun(claim: FilingClaim, mode?: Settings['mode'], message?: string) {
    const current = this.settings(); if (!current || current.activeRunId !== claim.runId) return;
    const { revisionId, ...value } = current;
    this.save({ ...value, activeRunId: null, mode: mode ?? value.mode, message: (message ?? value.message).slice(0,2000) });
  }
  fail(claim: FilingClaim, message: string) {
    this.db.transaction(() => {
      this.release(claim);
      if (this.settings()?.revisionId === claim.settingsRevision) this.finishRun(claim, 'failed', `${message} Completed suggestions are kept. Resume to retry; this request may have used your plan.`);
      else this.finishRun(claim);
    }).immediate();
  }
  hasQueued() { return !!this.db.query("SELECT 1 FROM auto_filing_tasks WHERE state='queued' LIMIT 1").get(); }
  private stale(result: z.infer<typeof AutoFilingResult>) {
    try { return this.snapshot(result.sourceId).fingerprint !== result.fingerprint; } catch { return true; }
  }
  review(raw: z.input<typeof AutoFilingReview>) {
    const input = AutoFilingReview.parse(raw);
    return this.db.transaction(() => {
      const selected = input.items.map(item => {
        const row = one<{ result: string; state: string }>(this.db, 'SELECT result_json AS result,state FROM auto_filing_results WHERE id=?', item.id);
        if (!row || row.state !== 'ready') throw new WorkspaceConflictError('A selected suggestion is no longer awaiting review. Refresh first.');
        const result = AutoFilingResult.parse(JSON.parse(row.result));
        if (result.fingerprint !== item.fingerprint || this.stale(result)) throw new WorkspaceConflictError('A file, filing choice or matching matter changed. Keep the current filing or review the new suggestion.');
        if (input.action === 'apply' && result.suggestion.target.collection === 'unfiled') throw new WorkspaceConflictError('Uncertain files need a manual filing choice.');
        return { ...item, result };
      });
      for (const item of selected) {
        if (input.action === 'apply') this.store.organizeSources({ sourceIds: [item.result.sourceId], expectedVersion: item.result.sourceVersion,
          confirmAccessChanges: true, changes: [{ sourceId: item.result.sourceId, target: item.result.suggestion.target }] });
        this.db.run('UPDATE auto_filing_results SET state=? WHERE id=?', [input.action === 'apply' ? 'applied' : 'dismissed', item.id]);
      }
      return { changed: selected.length };
    }).immediate();
  }
  status(raw: z.input<typeof AutoFilingQuery> = {}): AutoFilingStatus {
    const input = AutoFilingQuery.parse(raw);
    return this.db.transaction(() => {
      const count = (sql: string) => one<{ n: number }>(this.db, sql)!.n;
      const ready = count("SELECT count(*) AS n FROM auto_filing_results WHERE state='ready'");
      const handled = count("SELECT count(*) AS n FROM auto_filing_results WHERE state!='ready'");
      const blocked = count("SELECT count(*) AS n FROM auto_filing_tasks WHERE state IN ('blocked','failed')");
      const rows = input.view === 'blocked' ? [] : all<{ id: string; state: FilingResult['state']; result: string; createdAt: string }>(this.db,
        `SELECT id,state,result_json AS result,created_at AS createdAt FROM auto_filing_results WHERE state ${input.view === 'ready' ? '=' : '!='}'ready' ORDER BY rowid DESC LIMIT 50 OFFSET ?`, input.offset);
      return { settings: this.settings(), queued: count("SELECT count(*) AS n FROM auto_filing_tasks WHERE state='queued'"),
        running: count("SELECT count(*) AS n FROM auto_filing_tasks WHERE state='running'"), ready, handled, blocked,
        protected: count("SELECT count(*) AS n FROM auto_filing_tasks WHERE state='protected'"), total: input.view === 'blocked' ? blocked : input.view === 'ready' ? ready : handled, offset: input.offset,
        items: rows.map(row => { const value = AutoFilingResult.parse(JSON.parse(row.result)); return { ...value, id: row.id, state: row.state, createdAt: row.createdAt, stale: row.state === 'ready' && this.stale(value) }; }),
        issues: input.view === 'blocked' ? all<AutoFilingStatus['issues'][number]>(this.db, `SELECT t.source_id AS sourceId,r.title,t.message FROM auto_filing_tasks t JOIN source_revisions r ON r.source_id=t.source_id
          AND r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=t.source_id) WHERE t.state IN ('blocked','failed') ORDER BY t.source_id LIMIT 50 OFFSET ?`, input.offset) : [],
      };
    })();
  }
}
