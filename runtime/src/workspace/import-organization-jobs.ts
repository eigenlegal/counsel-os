import type { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { WorkspaceStore } from './store';
import { ImportChoice } from './import-types';
import { contextTerms } from './context-terms';
import { WorkspaceConflictError } from './types';
import { OrganizationJobStart, OrganizationJobControl, OrganizationJobApply, OrganizationJobState,
  OrganizationSuggestion, type OrganizationJob, type OrganizationFailure, type ImportFilingSummary } from './import-organization-job-types';

type JobRow = { revision_id: string; state_json: string };
type ResultRow = { entry_id: string; result_json: string; applied: number; choice_json: string };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Durable analysis and reversible staged choices. Never commits files or grants access. */
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
      if (input.action === 'resume') this.prepareClear(id);
      return this.get(id)!;
    }).immediate();
  }
  next(id: string) {
    const batch = this.review(id);
    const waiting = batch.progress.awaitingUpload + batch.progress.queued + batch.progress.processing;
    if (waiting) return { waiting: true as const, entries: [] as string[], revisionId: batch.revisionId };
    if (batch.progress.errors) throw new WorkspaceConflictError('Some files could not be processed. Retry them or mark them Skip before AI analysis. No failed file was silently omitted.');
    const entries = (this.db.query(`SELECT e.id FROM import_entries e LEFT JOIN import_organization_results r ON r.entry_id=e.id
      LEFT JOIN import_organization_files f ON f.entry_id=e.id
      WHERE e.batch_id=? AND e.status='ready' AND json_extract(e.choice_json,'$.destination') NOT IN ('skip','profile')
      AND r.entry_id IS NULL AND coalesce(f.protected,0)=0 AND coalesce(f.attempts,0)=0
      ORDER BY e.path COLLATE NOCASE,e.id LIMIT 8`).all(id) as Array<{ id: string }>).map(row => row.id);
    // Do fresh work first, then give each failed file one isolated repair attempt.
    const retry = !entries.length ? this.db.query(`SELECT e.id,f.issue FROM import_entries e
      JOIN import_organization_files f ON f.entry_id=e.id LEFT JOIN import_organization_results r ON r.entry_id=e.id
      WHERE e.batch_id=? AND e.status='ready' AND json_extract(e.choice_json,'$.destination') NOT IN ('skip','profile')
        AND f.protected=0 AND f.attempts=1 AND r.entry_id IS NULL ORDER BY e.path COLLATE NOCASE,e.id LIMIT 1`).get(id) as { id: string; issue: string } | null : null;
    return { waiting: false as const, entries: retry ? [retry.id] : entries, revisionId: batch.revisionId, retryReason: retry?.issue };
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
        CASE WHEN f.protected=1 THEN 'Reviewed filing: ' WHEN r.applied=1 THEN 'Prepared filing: ' ELSE 'Proposed filing: ' END
          || e.path || ': ' || json_extract(r.result_json,'$.evidenceQuote') AS evidence
      FROM import_organization_results r JOIN import_entries e ON e.id=r.entry_id
        LEFT JOIN import_organization_files f ON f.entry_id=e.id
      WHERE r.batch_id=? AND json_extract(e.choice_json,'$.destination') NOT IN ('skip','profile')
        AND (json_extract(r.result_json,'$.confidence')!='low' OR r.applied=1 OR json(e.choice_json)!=json_extract(r.result_json,'$.before'))
    ) WHERE title IS NOT NULL GROUP BY title HAVING max(${score})>0 ORDER BY max(${score}) DESC,title LIMIT 40`)
      .all(id, ...terms, ...terms) as Array<{ title: string; evidence: string }>;
  }
  saveResults(id: string, revisionId: string, results: OrganizationSuggestion[], failures: OrganizationFailure[] = []) {
    this.db.transaction(() => {
      const state = this.state(id);
      if (!state || state.status !== 'running' || state.revisionId !== revisionId) throw new WorkspaceConflictError('Organization changed while the model was working. Completed earlier suggestions are kept.');
      for (const raw of results) {
        const result = OrganizationSuggestion.parse(raw);
        const entry = this.db.query('SELECT choice_json FROM import_entries WHERE batch_id=? AND id=?').get(id, result.entryId) as { choice_json: string } | null;
        if (!entry || !same(JSON.parse(entry.choice_json), result.before)) throw new WorkspaceConflictError('A file changed during organization.');
        this.db.run('INSERT INTO import_organization_results(entry_id,batch_id,result_json) VALUES (?,?,?)', [result.entryId, id, JSON.stringify(result)]);
        this.db.run('DELETE FROM import_organization_files WHERE entry_id=? AND protected=0', [result.entryId]);
      }
      for (const failure of failures) {
        const entry = this.db.query('SELECT choice_json FROM import_entries WHERE batch_id=? AND id=?').get(id, failure.entryId) as { choice_json: string } | null;
        if (!entry || !same(JSON.parse(entry.choice_json), failure.before)) throw new WorkspaceConflictError('A file changed during organization.');
        this.db.run(`INSERT INTO import_organization_files(entry_id,batch_id,attempts,issue) VALUES (?,?,1,?)
          ON CONFLICT(entry_id) DO UPDATE SET attempts=min(2,attempts+1),issue=excluded.issue`, [failure.entryId, id, failure.reason.slice(0, 1000)]);
      }
      this.prepareClear(id);
      const { revisionId: _, ...value } = state;
      this.save(id, value);
    }).immediate();
  }
  /** Also stages retained, unapplied results from older builds when explicitly resumed. */
  private prepareClear(id: string) {
    const pending = this.db.query(`SELECT r.entry_id,r.result_json,r.applied,e.choice_json FROM import_organization_results r
      JOIN import_entries e ON e.id=r.entry_id LEFT JOIN import_organization_files f ON f.entry_id=e.id
      WHERE r.batch_id=? AND r.applied=0 AND json_extract(r.result_json,'$.confidence')='high' AND coalesce(f.protected,0)=0`).all(id) as ResultRow[];
    const changes = pending.filter(row => {
      const result = OrganizationSuggestion.parse(JSON.parse(row.result_json));
      return same(JSON.parse(row.choice_json), result.before);
    }).map(row => ({ entryId: row.entry_id, choice: OrganizationSuggestion.parse(JSON.parse(row.result_json)).choice }));
    if (!changes.length) return;
    this.store.imports.stageOrganizationChoices(id, this.store.imports.get(id, { limit: 1 }).revisionId, changes);
    for (const change of changes) this.db.run('UPDATE import_organization_results SET applied=1 WHERE entry_id=?', [change.entryId]);
  }

  summary(id: string): ImportFilingSummary {
    const rows = this.db.query(`SELECT e.choice_json,m.title AS matter_name,count(*) AS files FROM import_entries e
      LEFT JOIN matters m ON m.id=json_extract(e.choice_json,'$.matterId')
      WHERE e.batch_id=? AND e.status!='skipped' AND json_extract(e.choice_json,'$.destination')!='skip'
      GROUP BY json_extract(e.choice_json,'$.destination'),json_extract(e.choice_json,'$.collection'),
        json_extract(e.choice_json,'$.matterId'),json_extract(e.choice_json,'$.matterTitle')`).all(id) as Array<{ choice_json: string; matter_name: string | null; files: number }>;
    const summary: ImportFilingSummary = { matters: 0, practice: 0, external: 0, unfiled: 0, profiles: 0, groups: [], groupCount: 0 };
    const groups = new Map<string, ImportFilingSummary['groups'][number]>();
    for (const row of rows) {
      const choice = ImportChoice.parse(JSON.parse(row.choice_json));
      if (choice.destination === 'profile') summary.profiles += row.files;
      else if (choice.matterId || choice.matterTitle) {
        summary.matters += row.files;
        const key = choice.matterId ?? `new:${choice.matterTitle}`;
        const group = groups.get(key) ?? { title: row.matter_name ?? choice.matterTitle!, files: 0, isNew: !choice.matterId };
        group.files += row.files; groups.set(key, group);
      } else if (choice.destination !== 'source' || choice.collection === 'practice') summary.practice += row.files;
      else if (choice.collection === 'external') summary.external += row.files;
      else summary.unfiled += row.files;
    }
    summary.groupCount = groups.size;
    summary.groups = [...groups.values()].sort((a, b) => b.files - a.files || a.title.localeCompare(b.title)).slice(0, 20);
    return summary;
  }
  private results(id: string): ResultRow[] {
    return this.db.query(`SELECT r.entry_id,r.result_json,r.applied,e.choice_json FROM import_organization_results r
      JOIN import_entries e ON e.id=r.entry_id WHERE r.batch_id=? ORDER BY e.path COLLATE NOCASE,e.id`).all(id) as ResultRow[];
  }
  get(id: string, offset = 0, attentionOnly = false): OrganizationJob | null {
    this.store.imports.get(id, { limit: 1 }); // Resolve identity even when no job exists.
    const state = this.state(id);
    if (!state) return null;
    const joined = `import_entries e LEFT JOIN import_organization_results r ON r.entry_id=e.id
      LEFT JOIN import_organization_files f ON f.entry_id=e.id`;
    // A file discovered as practice context by this job remains visible in its
    // completed results. Sources designated before analysis still stay excluded.
    const eligible = "e.status='ready' AND json_extract(e.choice_json,'$.destination')!='skip' AND (json_extract(e.choice_json,'$.destination')!='profile' OR r.entry_id IS NOT NULL)";
    const counts = this.db.query(`SELECT count(*) AS total,sum(${eligible}) AS eligible,
      sum(e.status='pending' AND json_extract(e.choice_json,'$.destination')!='skip') AS waiting
      FROM ${joined} WHERE e.batch_id=?`).get(id) as { total: number; eligible: number; waiting: number };
    const clear = "(json_extract(r.result_json,'$.confidence')='high' AND json(e.choice_json)=json_extract(r.result_json,'$.before'))";
    const failed = 'r.entry_id IS NULL AND f.attempts=2 AND f.issue IS NOT NULL AND f.protected=0';
    const attention = `(coalesce(f.protected,0)=0 AND ((r.applied=0 AND NOT ${clear}) OR (${failed})))`;
    const totals = this.db.query(`SELECT count(r.entry_id) AS analyzed,
      coalesce(sum(r.applied=1 AND json(e.choice_json)=json_extract(r.result_json,'$.choice')),0) AS applied,
      coalesce(sum(r.applied=0 AND coalesce(f.protected,0)=0 AND ${clear}),0) AS high,
      coalesce(sum(${attention}),0) AS attention,coalesce(sum(${failed}),0) AS failed,
      coalesce(sum(r.entry_id IS NULL AND f.attempts=1 AND f.protected=0),0) AS retrying,
      coalesce(sum(r.entry_id IS NULL AND f.protected=1),0) AS reviewed
      FROM ${joined} WHERE e.batch_id=? AND ${eligible}`).get(id) as {
        analyzed: number; applied: number; high: number; attention: number; failed: number; retrying: number; reviewed: number;
      };
    const rows = this.db.query(`SELECT e.id AS entry_id,e.path,r.result_json,r.applied,e.choice_json,f.issue,f.attempts,coalesce(f.protected,0) AS protected
      FROM ${joined} WHERE e.batch_id=? AND ${eligible}
      AND ${attentionOnly ? attention : '(r.entry_id IS NOT NULL OR (f.issue IS NOT NULL AND f.protected=0))'}
      ORDER BY e.path COLLATE NOCASE,e.id LIMIT 50 OFFSET ?`).all(id, offset) as Array<ResultRow & { path: string; issue: string | null; attempts: number; protected: number }>;
    const suggestions: OrganizationJob['suggestions'] = [], failures: OrganizationJob['failures'] = [];
    for (const row of rows) {
      if (row.result_json) {
        const result = OrganizationSuggestion.parse(JSON.parse(row.result_json));
        suggestions.push({ ...result, applied: !!row.applied, reviewed: !!row.protected,
          stale: !same(JSON.parse(row.choice_json), row.applied ? result.choice : result.before) });
      } else failures.push({ entryId: row.entry_id, path: row.path, before: ImportChoice.parse(JSON.parse(row.choice_json)),
        reason: row.issue!, attempts: row.attempts, protected: !!row.protected });
    }
    return { ...state, ...totals, eligible: counts.eligible ?? 0,
      skipped: counts.total - (counts.eligible ?? 0) - (counts.waiting ?? 0),
      waiting: counts.waiting ?? 0, total: attentionOnly ? totals.attention : totals.analyzed + totals.failed + totals.retrying,
      remaining: Math.max(0, (counts.eligible ?? 0) + (counts.waiting ?? 0) - totals.analyzed - totals.failed - totals.reviewed),
      offset, suggestions, failures, summary: this.summary(id) };
  }
  apply(id: string, raw: z.input<typeof OrganizationJobApply>) {
    const input = OrganizationJobApply.parse(raw);
    return this.db.transaction(() => {
      this.assertEditable(id);
      const state = this.state(id), batch = this.review(id);
      if (!state || state.revisionId !== input.expectedRevisionId || batch.revisionId !== input.expectedBatchRevisionId)
        throw new WorkspaceConflictError('This review changed. Reload before applying suggestions.');
      if (input.selection === 'unfiled') {
        const entries = this.db.query(`SELECT e.id,e.choice_json FROM import_entries e
          LEFT JOIN import_organization_results r ON r.entry_id=e.id LEFT JOIN import_organization_files f ON f.entry_id=e.id
          WHERE e.batch_id=? AND e.status='ready' AND json_extract(e.choice_json,'$.destination') NOT IN ('skip','profile')
            AND coalesce(f.protected,0)=0 AND ((r.applied=0 AND json_extract(r.result_json,'$.confidence')!='high'
              AND json(e.choice_json)=json_extract(r.result_json,'$.before')) OR (r.entry_id IS NULL AND f.attempts=2))`).all(id) as Array<{ id: string; choice_json: string }>;
        if (!entries.length) throw new WorkspaceConflictError('There are no unresolved files to leave unfiled.');
        this.store.imports.editChoices(id, { expectedRevisionId: batch.revisionId, changes: entries.map(entry => ({
          entryId: entry.id, choice: ImportChoice.parse({ ...JSON.parse(entry.choice_json), destination: 'source', collection: 'unfiled',
            matterId: null, matterTitle: null, linkedMatters: [], preferences: null }),
        })) });
        const { revisionId: _, ...value } = state; this.save(id, value);
        return this.get(id)!;
      }
      const selected = new Set(input.entryIds ?? []);
      const rows = this.results(id).filter(row => {
        const result = OrganizationSuggestion.parse(JSON.parse(row.result_json));
        return !row.applied && !this.db.query('SELECT 1 FROM import_organization_files WHERE entry_id=? AND protected=1').get(row.entry_id) && (input.selection === 'high'
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
