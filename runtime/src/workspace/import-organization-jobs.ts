import type { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { WorkspaceStore } from './store';
import { ImportChoice } from './import-types';
import { contextTerms } from './context-terms';
import { WorkspaceConflictError } from './types';
import { OrganizationJobStart, OrganizationJobControl, OrganizationJobApply, OrganizationJobState,
  OrganizationSuggestion, type OrganizationJob } from './import-organization-job-types';

type JobRow = { revision_id: string; state_json: string };
type ResultRow = { entry_id: string; result_json: string; applied: number; choice_json: string };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Durable proposals only. No provider, automatic filing, or new retrieval grants. */
export class ImportOrganizationJobs {
  constructor(private db: Database, private store: WorkspaceStore, private now: () => string) {}
  private state(id: string) {
    const row = this.db.query('SELECT revision_id,state_json FROM import_organization_jobs WHERE batch_id=?').get(id) as JobRow | null;
    return row ? { revisionId: row.revision_id, ...OrganizationJobState.parse(JSON.parse(row.state_json)) } : null;
  }
  private save(id: string, state: z.infer<typeof OrganizationJobState>) {
    this.db.run(`INSERT INTO import_organization_jobs VALUES (?,?,?) ON CONFLICT(batch_id)
      DO UPDATE SET revision_id=excluded.revision_id,state_json=excluded.state_json`,
    [id, randomUUID(), JSON.stringify(OrganizationJobState.parse({ ...state, updatedAt: this.now() }))]);
  }
  private review(id: string) {
    const batch = this.store.imports.get(id, {});
    if (batch.status !== 'review') throw new WorkspaceConflictError('This import is already finished.');
    return batch;
  }
  assertEditable(id: string) {
    if (this.state(id)?.status === 'running') throw new WorkspaceConflictError('Pause AI organization before changing or importing these files. Completed suggestions are kept.');
  }
  start(id: string, raw: z.input<typeof OrganizationJobStart>): OrganizationJob {
    const input = OrganizationJobStart.parse(raw);
    return this.db.transaction(() => {
      const batch = this.review(id), previous = this.state(id);
      if (previous) {
        if (same(previous.request, input)) return this.get(id)!;
        throw new WorkspaceConflictError('This import already has an organization job. Resume it or review the retained suggestions.');
      }
      if (batch.revisionId !== input.expectedRevisionId) throw new WorkspaceConflictError('This import changed. Reload before starting organization.');
      if (this.running()) throw new WorkspaceConflictError('Another import is being organized. Pause it or wait for it to finish.');
      this.save(id, { request: input, status: 'running', message: 'Waiting for local file processing.', calls: 0, createdAt: this.now(), updatedAt: this.now() });
      return this.get(id)!;
    }).immediate();
  }
  running(): string | null {
    return (this.db.query(`SELECT j.batch_id FROM import_organization_jobs j JOIN import_batches b ON b.id=j.batch_id
      WHERE b.status='review' AND json_extract(j.state_json,'$.status')='running' ORDER BY j.rowid LIMIT 1`).get() as { batch_id: string } | null)?.batch_id ?? null;
  }
  recover() {
    // A disconnected browser is harmless; an interrupted application must not
    // silently replay an uncertain paid request on reopen or backup restore.
    for (const row of this.db.query(`SELECT batch_id FROM import_organization_jobs WHERE json_extract(state_json,'$.status')='running'`).all() as Array<{ batch_id: string }>)
      this.change(row.batch_id, 'paused', 'Organization was interrupted. Completed suggestions are kept. Resume to continue; an interrupted model request may have used your plan.');
  }
  change(id: string, status: z.infer<typeof OrganizationJobState>['status'], message: string) {
    const state = this.state(id);
    if (!state) throw new WorkspaceConflictError('Start organization first.');
    const { revisionId: _, ...value } = state;
    this.save(id, { ...value, status, message: message.slice(0, 4000) });
  }
  control(id: string, raw: z.input<typeof OrganizationJobControl>) {
    const input = OrganizationJobControl.parse(raw);
    return this.db.transaction(() => {
      this.review(id);
      const state = this.state(id);
      if (!state || (input.action !== 'pause' && state.revisionId !== input.expectedRevisionId)) throw new WorkspaceConflictError('Organization changed. Reload its progress before continuing.');
      // Progress can advance between polling and a pause click. Pausing this
      // fixed batch is always safe; a completed job stays complete.
      if (input.action === 'pause' && state.status !== 'running') return this.get(id)!;
      if (input.action === 'resume' && this.running() && this.running() !== id) throw new WorkspaceConflictError('Another import is being organized.');
      this.change(id, input.action === 'pause' ? 'paused' : 'running', input.action === 'pause'
        ? 'Paused. Completed suggestions are kept.' : 'Continuing with files not yet analyzed.');
      return this.get(id)!;
    }).immediate();
  }
  next(id: string) {
    const batch = this.review(id);
    const waiting = batch.progress.awaitingUpload + batch.progress.queued + batch.progress.processing;
    if (waiting) return { waiting: true as const, entries: [] as string[], revisionId: batch.revisionId };
    if (batch.progress.errors) throw new WorkspaceConflictError('Some files could not be processed. Retry them or mark them Skip before AI analysis. No failed file was silently omitted.');
    const entries = (this.db.query(`SELECT e.id FROM import_entries e LEFT JOIN import_organization_results r ON r.entry_id=e.id
      WHERE e.batch_id=? AND e.status='ready' AND json_extract(e.choice_json,'$.destination') NOT IN ('skip','profile')
      AND r.entry_id IS NULL ORDER BY e.path COLLATE NOCASE,e.id LIMIT 8`).all(id) as Array<{ id: string }>).map(row => row.id);
    return { waiting: false as const, entries, revisionId: batch.revisionId };
  }
  beginCall(id: string) {
    const state = this.state(id)!;
    const { revisionId: _, ...value } = state;
    if (state.status !== 'running') throw new WorkspaceConflictError('Organization is paused.');
    this.save(id, { ...value, calls: value.calls + 1, message: 'Reading files and proposing their organization.' });
    return this.state(id)!;
  }
  groups(id: string, pathsAndText: string) {
    const terms = contextTerms(pathsAndText, 30);
    if (!terms.length) return [];
    const score = terms.map(() => '(instr(lower(title || \' \' || evidence),lower(?))>0)').join('+');
    return this.db.query(`SELECT title,min(evidence) AS evidence FROM (
      SELECT CASE WHEN r.applied=1 OR json(e.choice_json)!=json_extract(r.result_json,'$.before')
          THEN json_extract(e.choice_json,'$.matterTitle') ELSE json_extract(r.result_json,'$.choice.matterTitle') END AS title,
        CASE WHEN r.applied=1 OR json(e.choice_json)!=json_extract(r.result_json,'$.before') THEN 'Reviewed filing: ' ELSE 'Proposed filing: ' END
          || e.path || ': ' || json_extract(r.result_json,'$.evidenceQuote') AS evidence
      FROM import_organization_results r JOIN import_entries e ON e.id=r.entry_id
      WHERE r.batch_id=? AND json_extract(e.choice_json,'$.destination') NOT IN ('skip','profile')
        AND (json_extract(r.result_json,'$.confidence')!='low' OR r.applied=1 OR json(e.choice_json)!=json_extract(r.result_json,'$.before'))
    ) WHERE title IS NOT NULL GROUP BY title HAVING max(${score})>0 ORDER BY max(${score}) DESC,title LIMIT 40`)
      .all(id, ...terms, ...terms) as Array<{ title: string; evidence: string }>;
  }
  saveResults(id: string, revisionId: string, results: OrganizationSuggestion[]) {
    this.db.transaction(() => {
      const state = this.state(id);
      if (!state || state.status !== 'running' || state.revisionId !== revisionId) throw new WorkspaceConflictError('Organization changed while the model was working. Completed earlier suggestions are kept.');
      for (const raw of results) {
        const result = OrganizationSuggestion.parse(raw);
        const entry = this.db.query('SELECT choice_json FROM import_entries WHERE batch_id=? AND id=?').get(id, result.entryId) as { choice_json: string } | null;
        if (!entry || !same(JSON.parse(entry.choice_json), result.before)) throw new WorkspaceConflictError('A file changed during organization.');
        this.db.run('INSERT INTO import_organization_results(entry_id,batch_id,result_json) VALUES (?,?,?)', [result.entryId, id, JSON.stringify(result)]);
      }
      const { revisionId: _, ...value } = state;
      this.save(id, value);
    }).immediate();
  }
  private results(id: string): ResultRow[] {
    return this.db.query(`SELECT r.entry_id,r.result_json,r.applied,e.choice_json FROM import_organization_results r
      JOIN import_entries e ON e.id=r.entry_id WHERE r.batch_id=? ORDER BY e.path COLLATE NOCASE,e.id`).all(id) as ResultRow[];
  }
  get(id: string, offset = 0, attentionOnly = false): OrganizationJob | null {
    this.store.imports.get(id, { limit: 1 }); // Resolve identity even when no job exists.
    const state = this.state(id);
    if (!state) return null;
    const counts = this.db.query(`SELECT count(*) AS total,
      sum(status='ready' AND json_extract(choice_json,'$.destination') NOT IN ('skip','profile')) AS eligible,
      sum(status='pending' AND json_extract(choice_json,'$.destination')!='skip') AS waiting
      FROM import_entries WHERE batch_id=?`).get(id) as { total: number; eligible: number; waiting: number };
    const joined = 'import_organization_results r JOIN import_entries e ON e.id=r.entry_id';
    const clear = "(json_extract(r.result_json,'$.confidence')='high' AND json(e.choice_json)=json_extract(r.result_json,'$.before'))";
    const totals = this.db.query(`SELECT count(*) AS analyzed,coalesce(sum(r.applied),0) AS applied,
      coalesce(sum(r.applied=0 AND ${clear}),0) AS high,
      coalesce(sum(r.applied=0 AND NOT ${clear}),0) AS attention FROM ${joined} WHERE r.batch_id=?`).get(id) as { analyzed: number; applied: number; high: number; attention: number };
    const rows = (this.db.query(`SELECT r.entry_id,r.result_json,r.applied,e.choice_json FROM ${joined} WHERE r.batch_id=?
      ${attentionOnly ? `AND r.applied=0 AND NOT ${clear}` : ''} ORDER BY e.path COLLATE NOCASE,e.id LIMIT 50 OFFSET ?`).all(id, offset) as ResultRow[]).map(row => {
      const result = OrganizationSuggestion.parse(JSON.parse(row.result_json));
      return { ...result, applied: !!row.applied, stale: !same(JSON.parse(row.choice_json), row.applied ? result.choice : result.before) };
    });
    return { ...state, ...totals, eligible: counts.eligible ?? 0,
      skipped: counts.total - (counts.eligible ?? 0) - (counts.waiting ?? 0),
      waiting: counts.waiting ?? 0, total: attentionOnly ? totals.attention : totals.analyzed, offset, suggestions: rows };
  }
  apply(id: string, raw: z.input<typeof OrganizationJobApply>) {
    const input = OrganizationJobApply.parse(raw);
    return this.db.transaction(() => {
      this.assertEditable(id);
      const state = this.state(id), batch = this.review(id);
      if (!state || state.revisionId !== input.expectedRevisionId || batch.revisionId !== input.expectedBatchRevisionId)
        throw new WorkspaceConflictError('This review changed. Reload before applying suggestions.');
      const selected = new Set(input.entryIds ?? []);
      const rows = this.results(id).filter(row => {
        const result = OrganizationSuggestion.parse(JSON.parse(row.result_json));
        return !row.applied && (input.selection === 'high'
          ? result.confidence === 'high' && same(JSON.parse(row.choice_json), result.before) : selected.has(row.entry_id));
      });
      if (!rows.length || (input.selection === 'selected' && rows.length !== selected.size)) throw new WorkspaceConflictError('Select unapplied suggestions from this import.');
      const changes = rows.map(row => {
        const result = OrganizationSuggestion.parse(JSON.parse(row.result_json));
        if (!same(JSON.parse(row.choice_json), result.before)) throw new WorkspaceConflictError('A selected file was edited after analysis. Keep your current choice or review it manually.');
        return { entryId: row.entry_id, choice: ImportChoice.parse(result.choice) };
      });
      this.store.imports.editChoices(id, { expectedRevisionId: batch.revisionId, changes });
      for (const row of rows) this.db.run('UPDATE import_organization_results SET applied=1 WHERE entry_id=?', [row.entry_id]);
      const { revisionId: _, ...value } = state;
      this.save(id, value);
      return this.get(id)!;
    }).immediate();
  }
}
