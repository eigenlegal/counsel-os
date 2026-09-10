import { createHash, randomUUID } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import type { z } from 'zod';
import { all, one } from './queries';
import { sourcePlacement } from './source-library';
import { WorkspaceConflictError } from './types';
import { UpkeepQuery, UpkeepDecision, type UpkeepFinding, type UpkeepKind, type UpkeepRun, type UpkeepStatus } from './upkeep-types';
import type { WorkspaceStore } from './store';
import { sourceLinkInventory, sourceLinkReview, type SourceLinkInventory } from './source-links';
import { QUEUE_SOURCE_LINK_REFRESH } from './source-links-schema';

const FOUR_HOURS = 4 * 60 * 60 * 1000;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const FINDING = 'kind,target_id AS targetId,code,version,title,detail,checked_at AS checkedAt';
const RUN = 'id,reason,started_at AS startedAt,completed_at AS completedAt,checked';
type Finding = Omit<UpkeepFinding, 'checkedAt'>;

/** Only derived organization findings change here. No provider, access, content or approval writes. */
export class WorkspaceUpkeep {
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = true;
  constructor(private db: Database, private store: WorkspaceStore, private now: () => string) {}

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    const tick = () => {
      if (this.stopped) return;
      // Give interactive work priority. Its transactionally queued checks survive the delay.
      if (!this.db.query("SELECT 1 FROM conversation_turns WHERE status='running' LIMIT 1").get()) {
        try { this.pulse(); } catch { /* Persisted queue survives transient database failures; next tick retries. */ }
      }
      this.timer = setTimeout(tick, 1500);
      this.timer.unref?.();
    };
    this.timer = setTimeout(tick, 250);
    this.timer.unref?.();
  }
  stop() { this.stopped = true; if (this.timer) clearTimeout(this.timer); this.timer = undefined; }

  /** Same queue for change events, periodic reconciliation and the explicit manual action. */
  request(reason: 'periodic' | 'manual' = 'manual') {
    this.db.transaction(() => {
      // Idempotent while a full check is underway; no duplicate runs or tasks.
      const running = one<UpkeepRun>(this.db, `SELECT ${RUN} FROM upkeep_runs WHERE completed_at IS NULL`);
      if (running && running.reason !== 'changes' && !this.count('SELECT count(*) AS n FROM upkeep_queue WHERE error IS NOT NULL')) return;
      this.db.run(`INSERT INTO upkeep_queue(kind,target_id,requested_at)
        SELECT 'source',id,? FROM sources WHERE true ON CONFLICT(kind,target_id) DO UPDATE SET error=NULL`, [this.now()]);
      this.db.run(`INSERT INTO upkeep_queue(kind,target_id,requested_at)
        SELECT 'import',id,? FROM import_batches WHERE true ON CONFLICT(kind,target_id) DO UPDATE SET error=NULL`, [this.now()]);
      // Includes resolved/deleted records so obsolete findings cannot linger.
      this.db.run(`INSERT INTO upkeep_queue(kind,target_id,requested_at)
        SELECT kind,target_id,? FROM upkeep_findings WHERE true ON CONFLICT(kind,target_id) DO UPDATE SET error=NULL`, [this.now()]);
      if (running) this.db.run('UPDATE upkeep_runs SET reason=? WHERE id=?', [reason, running.id]);
      else this.newRun(reason);
      this.finish();
    }).immediate();
  }
  pulse(limit = 25) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Check between 1 and 100 records at a time.');
    const latest = one<{ at: string }>(this.db, "SELECT started_at AS at FROM upkeep_runs WHERE reason!='changes' ORDER BY rowid DESC LIMIT 1");
    if (!latest || Date.parse(this.now()) - Date.parse(latest.at) >= FOUR_HOURS) this.request('periodic');
    this.db.transaction(() => {
      if (this.db.query('SELECT 1 FROM source_link_refresh').get()) {
        this.db.run(QUEUE_SOURCE_LINK_REFRESH, [this.now()]);
        this.db.run('DELETE FROM source_link_refresh');
      }
    }).immediate();
    const tasks = all<{ kind: UpkeepKind; targetId: string }>(this.db,
      'SELECT kind,target_id AS targetId FROM upkeep_queue WHERE error IS NULL ORDER BY rowid LIMIT ?', limit);
    if (tasks.length && !this.db.query('SELECT 1 FROM upkeep_runs WHERE completed_at IS NULL').get()) this.newRun('changes');
    const links = tasks.some(task => task.kind === 'source') ? sourceLinkInventory(this.db) : undefined;
    for (const task of tasks) {
      try {
        this.db.transaction(() => {
          this.sync(task.kind, task.targetId, links);
          this.db.run('DELETE FROM upkeep_queue WHERE kind=? AND target_id=?', [task.kind, task.targetId]);
          this.db.run('UPDATE upkeep_runs SET checked=checked+1 WHERE completed_at IS NULL');
        }).immediate();
      } catch {
        // Do not spin on a damaged/unsupported record or expose internal details/credentials.
        this.db.run('UPDATE upkeep_queue SET error=? WHERE kind=? AND target_id=?',
          ['This record could not be checked. Open it, then run Check now to retry.', task.kind, task.targetId]);
      }
    }
    this.finish();
    return tasks.length;
  }
  private newRun(reason: UpkeepRun['reason']) {
    this.db.run('INSERT INTO upkeep_runs(id,reason,started_at) VALUES (?,?,?)', [randomUUID(), reason, this.now()]);
  }
  private finish() {
    if (!this.count('SELECT count(*) AS n FROM upkeep_queue') && !this.count('SELECT count(*) AS n FROM source_link_refresh'))
      this.db.run('UPDATE upkeep_runs SET completed_at=? WHERE completed_at IS NULL', [this.now()]);
  }
  private count(sql: string, ...params: string[]) { return one<{ n: number }>(this.db, sql, ...params)!.n; }

  private inspect(kind: UpkeepKind, targetId: string, inventory?: SourceLinkInventory): Finding[] {
    if (kind === 'source') {
      const row = one<{ id: string; title: string; textStatus: string }>(this.db, `SELECT r.id,r.title,r.text_status AS textStatus
        FROM source_revisions r WHERE source_id=? AND NOT EXISTS
        (SELECT 1 FROM source_lifecycle sl WHERE sl.source_id=r.source_id AND sl.state='trashed') ORDER BY revision_no DESC LIMIT 1`, targetId);
      if (!row) return [];
      const placement = sourcePlacement(this.db, targetId);
      const matters = all<{ id: string }>(this.db, 'SELECT matter_id AS id FROM matter_sources WHERE source_id=? ORDER BY matter_id', targetId);
      const version = digest([row, placement, matters]);
      const base = { kind, targetId, version, title: row.title };
      const findings: Finding[] = [];
      if (placement.collection === 'unfiled') findings.push({ ...base, code: 'unfiled',
        detail: 'No matter or library location is assigned. Open this file to choose a location, or use Suggest filing below for AI help.' });
      if (row.textStatus !== 'ready') findings.push({ ...base, code: 'partial',
        detail: row.textStatus === 'partial' ? 'Only part of this document is readable. Review the extraction notes before relying on it; replace it with a fuller copy when available.'
          : 'Readable text is unavailable. Review the extraction notes and provide a text-readable copy; the original remains retained.' });
      const links = sourceLinkReview(this.db, targetId, inventory);
      if (links.unresolved || links.shareable || (links.truncated && links.path && /\.(md|txt)$/i.test(links.path)))
        findings.push({ ...base, version: links.expectedVersion, code: 'source-links', detail:
          `${links.unresolved} unresolved references; ${links.shareable} possible matter links in retained workspace files.${links.truncated ? ' Check coverage is incomplete.' : ''} Review document links. Nothing is fetched or shared automatically.` });
      return findings;
    }
    const batch = one<{ label: string; revision: string; status: string }>(this.db,
      'SELECT label,revision_id AS revision,status FROM import_batches WHERE id=?', targetId);
    if (!batch || batch.status !== 'review') return [];
    const counts = all<{ status: string; n: number }>(this.db,
      'SELECT status,count(*) AS n FROM import_entries WHERE batch_id=? GROUP BY status ORDER BY status', targetId);
    const pending = counts.find(item => item.status === 'pending')?.n ?? 0;
    const failed = counts.find(item => item.status === 'error')?.n ?? 0;
    const job = one<{ status: string; revision: string }>(this.db,
      "SELECT json_extract(state_json,'$.status') AS status,revision_id AS revision FROM import_organization_jobs WHERE batch_id=?", targetId);
    const queue = one<{ paused: number }>(this.db, 'SELECT paused FROM import_queue WHERE batch_id=?', targetId);
    const version = digest([batch, counts, job, queue]);
    const findings: Finding[] = [{ kind, targetId, version, title: batch.label, code: 'import-review',
      detail: failed ? `${failed} files need attention. Open the import to review extraction errors; completed work is retained.`
        : job?.status === 'paused' || job?.status === 'failed' ? 'AI organization is stopped. Open the import to review progress or explicitly resume; completed suggestions are retained.'
        : pending ? queue?.paused ? 'Import processing is paused. Open the import to continue.' : 'Some files are still uploading or processing. Open the import to see progress.'
        : job?.status === 'running' ? 'AI organization is working in the background. Its suggestions still need review before final import.'
        : 'Files are staged but not yet imported. Review their organization and confirm the import when ready.' }];
    if (!pending) {
      const links = this.store.imports.links(targetId, { view: 'all' });
      if (links.unresolved || links.shareable || links.truncated) findings.push({ kind, targetId, title: batch.label,
        version: links.expectedVersion, code: 'import-links', detail:
          `${links.unresolved} unresolved references; ${links.shareable} possible matter links.${links.truncated ? ' Link-check coverage is incomplete.' : ''} Open the import’s Linked documents review. No files are fetched or shared automatically.` });
    }
    return findings;
  }
  private sync(kind: UpkeepKind, targetId: string, inventory?: SourceLinkInventory) {
    const findings = this.inspect(kind, targetId, inventory);
    this.db.run('UPDATE upkeep_findings SET active=0 WHERE kind=? AND target_id=?', [kind, targetId]);
    for (const item of findings) this.db.run(`INSERT INTO upkeep_findings(kind,target_id,code,version,title,detail,active,checked_at)
      VALUES (?,?,?,?,?,?,1,?) ON CONFLICT(kind,target_id,code) DO UPDATE SET
      version=excluded.version,title=excluded.title,detail=excluded.detail,active=1,checked_at=excluded.checked_at`,
      [kind, targetId, item.code, item.version, item.title, item.detail, this.now()]);
  }
  decide(raw: z.input<typeof UpkeepDecision>) {
    const input = UpkeepDecision.parse(raw);
    return this.db.transaction(() => {
      // Check the actual record, not a possibly stale background finding.
      this.sync(input.kind, input.targetId);
      const current = one<{ version: string }>(this.db,
        'SELECT version FROM upkeep_findings WHERE kind=? AND target_id=? AND code=? AND active=1', input.kind, input.targetId, input.code);
      if (current?.version !== input.expectedVersion) throw new WorkspaceConflictError('This item changed or was resolved. Refresh the organization check before continuing.');
      this.db.run('UPDATE upkeep_findings SET dismissed_version=? WHERE kind=? AND target_id=? AND code=?',
        [input.action === 'dismiss' ? input.expectedVersion : null, input.kind, input.targetId, input.code]);
      return { saved: true };
    }).immediate();
  }
  status(raw: z.input<typeof UpkeepQuery> = {}): UpkeepStatus {
    const input = UpkeepQuery.parse(raw);
    return this.db.transaction(() => {
      const attention = this.count('SELECT count(*) AS n FROM upkeep_findings WHERE active=1 AND dismissed_version IS NOT version');
      const dismissed = this.count('SELECT count(*) AS n FROM upkeep_findings WHERE active=1 AND dismissed_version=version');
      return { pending: this.count('SELECT count(*) AS n FROM upkeep_queue WHERE error IS NULL') + this.count('SELECT count(*) AS n FROM source_link_refresh'),
        failed: this.count('SELECT count(*) AS n FROM upkeep_queue WHERE error IS NOT NULL'), attention, dismissed,
        total: input.view === 'attention' ? attention : dismissed, offset: input.offset,
        items: all<UpkeepFinding>(this.db, `SELECT ${FINDING} FROM upkeep_findings WHERE active=1
          AND dismissed_version ${input.view === 'attention' ? 'IS NOT' : '='} version ORDER BY kind,target_id,code LIMIT 50 OFFSET ?`, input.offset),
        history: all<UpkeepRun>(this.db, `SELECT ${RUN} FROM upkeep_runs ORDER BY rowid DESC LIMIT 10`),
        errors: all<{ kind: UpkeepKind; targetId: string; error: string }>(this.db,
          'SELECT kind,target_id AS targetId,error FROM upkeep_queue WHERE error IS NOT NULL ORDER BY rowid LIMIT 10'),
      };
    })();
  }
}
