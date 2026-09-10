import { createHash, randomUUID } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { all, one, required } from './queries';
import { WorkspaceConflictError } from './types';

export const ManagedRecord = z.enum(['source', 'work']);
export type ManagedRecord = z.infer<typeof ManagedRecord>;
export const RecordChange = z.object({ action: z.enum(['trash', 'restore']), expectedVersion: z.string().length(64), confirm: z.literal(true) }).strict();
export const RecordTrashQuery = z.object({ kind: ManagedRecord, query: z.string().max(300).default(''), page: z.number().int().min(0).max(100_000).default(0) }).strict();
export const ACTIVE_SOURCE = `NOT EXISTS (SELECT 1 FROM source_lifecycle sl WHERE sl.source_id=sr.source_id AND sl.state='trashed')`;
export const ACTIVE_WORK = `NOT EXISTS (SELECT 1 FROM work_lifecycle wl WHERE wl.work_id=w.id AND wl.state='trashed')`;
export function recordState(db: Database, kind: ManagedRecord, id: string): 'active' | 'trashed' {
  if ((db.query('PRAGMA user_version').get() as { user_version: number }).user_version < 10) return 'active';
  return one<{ state: 'active' | 'trashed' }>(db, `SELECT state FROM ${kind}_lifecycle WHERE ${kind}_id=?`, id)?.state ?? 'active';
}
export function requireActiveRecord(db: Database, kind: ManagedRecord, id: string) {
  if (recordState(db, kind, id) === 'trashed') throw new WorkspaceConflictError('This record is in Trash. Restore it before using or changing it.');
}
export interface RecordImpact {
  kind: ManagedRecord; id: string; title: string; state: 'active' | 'trashed'; version: string;
  retained: Array<{ kind: 'matter' | 'work' | 'conversation' | 'knowledge' | 'template'; id: string; title: string }>;
  inUse: boolean; fileCount: number;
}
export function recordImpact(db: Database, kind: ManagedRecord, id: string): RecordImpact {
  ManagedRecord.parse(kind); z.string().uuid().parse(id);
  const record = kind === 'source'
    ? required(one<{ title: string }>(db, 'SELECT title,id,content_hash FROM source_revisions WHERE source_id=? ORDER BY revision_no DESC LIMIT 1', id), 'source')
    : required(one<{ title: string }>(db, 'SELECT w.id,coalesce(o.title,w.title) AS title,w.content_hash FROM work_records w LEFT JOIN work_outputs o ON o.work_id=w.id WHERE w.id=?', id), 'work');
  const retained = new Map<string, RecordImpact['retained'][number]>();
  const add = (value: RecordImpact['retained'][number]) => retained.set(`${value.kind}:${value.id}`, value);
  let inUse = false;
  const turns = all<{ conversationId: string; title: string; status: string; attachments: string; state: string; workId: string | null }>(db,
    `SELECT c.id AS conversationId,c.title,t.status,t.attachments_json AS attachments,t.state_json AS state,t.work_id AS workId
    FROM conversation_turns t JOIN conversations c ON c.id=t.conversation_id`);
  const revisions = kind === 'source' ? new Set(all<{ id: string }>(db, 'SELECT id FROM source_revisions WHERE source_id=?', id).map(r => r.id)) : new Set<string>();
  for (const turn of turns) {
    const state = JSON.parse(turn.state);
    const attached = kind === 'source' && (JSON.parse(turn.attachments) as string[]).some(ref => revisions.has(ref));
    const read = (state.context ?? []).some((ref: { kind: string; id: string; ranges: unknown[] }) => ref.kind === kind && (kind === 'source' ? revisions.has(ref.id) : ref.id === id) && ref.ranges?.length);
    if (attached || read || (kind === 'work' && turn.workId === id)) {
      add({ kind: 'conversation', id: turn.conversationId, title: turn.title });
      if (turn.status === 'running') inUse = true;
    }
  }
  if (kind === 'source') {
    for (const matter of all<{ id: string; title: string }>(db, 'SELECT m.id,m.title FROM matters m JOIN matter_sources ms ON ms.matter_id=m.id WHERE ms.source_id=?', id)) add({ kind: 'matter', ...matter });
    for (const template of all<{ id: string; title: string }>(db, `SELECT t.template_id AS id,t.title FROM template_revisions t JOIN source_revisions sr ON sr.id=t.source_revision_id
      WHERE sr.source_id=? AND t.revision_no=(SELECT max(revision_no) FROM template_revisions WHERE template_id=t.template_id)`, id)) add({ kind: 'template', ...template });
    for (const receipt of all<{ value: string }>(db, "SELECT records_json AS value FROM seed_imports WHERE seed_id GLOB 'plugin-v1-*'")) {
      const imported = JSON.parse(receipt.value);
      for (const [key, sourceId] of Object.entries(imported.sources ?? {})) if (sourceId === id && imported.knowledge?.[key]) {
        const item = one<{ id: string; title: string }>(db, 'SELECT knowledge_id AS id,title FROM knowledge_revisions WHERE knowledge_id=? ORDER BY revision_no DESC LIMIT 1', imported.knowledge[key]);
        if (item) add({ kind: 'knowledge', ...item });
      }
    }
    for (const item of all<{ id: string; title: string }>(db, `SELECT DISTINCT k.knowledge_id AS id,k.title
      FROM import_batches b,json_each(b.receipt_json,'$.items') j JOIN knowledge_revisions k ON k.knowledge_id=json_extract(j.value,'$.practiceId')
      WHERE json_extract(j.value,'$.sourceId')=? AND k.revision_no=(SELECT max(revision_no) FROM knowledge_revisions WHERE knowledge_id=k.knowledge_id)`, id)) add({ kind: 'knowledge', ...item });
  } else {
    const matter = one<{ id: string; title: string }>(db, 'SELECT m.id,m.title FROM matters m JOIN work_records w ON w.matter_id=m.id WHERE w.id=?', id);
    if (matter) add({ kind: 'matter', ...matter });
  }
  for (const work of all<{ id: string; title: string }>(db, `SELECT DISTINCT w.id,coalesce(o.title,w.title) AS title FROM work_records w LEFT JOIN work_outputs o ON o.work_id=w.id
    JOIN evidence e ON e.work_id=w.id WHERE ${kind === 'source' ? 'e.source_revision_id IN (SELECT id FROM source_revisions WHERE source_id=?)' : 'e.prior_work_id=?'}`, id)) add({ kind: 'work', ...work });
  const lifecycle = one(db, `SELECT * FROM ${kind}_lifecycle WHERE ${kind}_id=?`, id);
  const fileCount = one<{ n: number }>(db, kind === 'source' ? 'SELECT count(*) AS n FROM source_originals WHERE revision_id IN (SELECT id FROM source_revisions WHERE source_id=?)' : 'SELECT count(*) AS n FROM work_exports WHERE work_id=?', id)!.n;
  return { kind, id, title: record.title, state: recordState(db, kind, id), inUse, fileCount, retained: [...retained.values()],
    version: createHash('sha256').update(JSON.stringify([record, lifecycle, [...retained.values()], inUse, fileCount])).digest('hex') };
}
export function changeRecord(db: Database, kind: ManagedRecord, id: string, raw: z.input<typeof RecordChange>, now: () => string) {
  const input = RecordChange.parse(raw);
  return db.transaction(() => {
    const before = recordImpact(db, kind, id);
    if (before.version !== input.expectedVersion) throw new WorkspaceConflictError('This record or its connections changed. Reopen the action to review it again.');
    if (before.inUse) throw new WorkspaceConflictError('A response is using this record. Wait for it to finish or stop that response before managing the record.');
    db.run(`INSERT INTO ${kind}_lifecycle VALUES (?,?,?,?) ON CONFLICT(${kind}_id) DO UPDATE SET state=excluded.state,revision_id=excluded.revision_id,changed_at=excluded.changed_at`,
      [id, input.action === 'trash' ? 'trashed' : 'active', randomUUID(), now()]);
    return recordImpact(db, kind, id);
  }).immediate();
}
export interface RecordTrashPage { records: Array<{ id: string; title: string; changedAt: string }>; total: number; hasMore: boolean }
export function recordTrash(db: Database, raw: z.input<typeof RecordTrashQuery>): RecordTrashPage {
  const input = RecordTrashQuery.parse(raw);
  const from = input.kind === 'source'
    ? `FROM source_lifecycle l JOIN source_revisions r ON r.source_id=l.source_id AND r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=l.source_id)`
    : `FROM work_lifecycle l JOIN work_records r ON r.id=l.work_id LEFT JOIN work_outputs o ON o.work_id=r.id`;
  const title = input.kind === 'source' ? 'r.title' : 'coalesce(o.title,r.title)';
  const where = `l.state='trashed' AND instr(lower(${title}),lower(?))>0`;
  const total = one<{ n: number }>(db, `SELECT count(*) AS n ${from} WHERE ${where}`, input.query)!.n;
  return { total, hasMore: (input.page + 1) * 50 < total, records: all(db,
    `SELECT l.${input.kind}_id AS id,${title} AS title,l.changed_at AS changedAt ${from} WHERE ${where} ORDER BY l.changed_at DESC,l.${input.kind}_id LIMIT 50 OFFSET ?`, input.query, input.page * 50) };
}
