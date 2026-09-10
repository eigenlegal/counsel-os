import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { all, one } from './queries';
import { COLLECTION_SQL } from './source-library';
import { contextLibrary } from './context-library';

// Receipt-backed identity, never title matching. Original evidence remains immutable.
export const PRACTICE_ORIGINALS = `SELECT DISTINCT k.value AS practiceId,s.value AS sourceId
  FROM seed_imports i,json_each(i.records_json,'$.knowledge') k
  JOIN json_each(i.records_json,'$.sources') s ON s.key=k.key
  WHERE i.seed_id GLOB 'plugin-v1-*'
  UNION SELECT json_extract(j.value,'$.practiceId'),json_extract(j.value,'$.sourceId')
  FROM import_batches b,json_each(b.receipt_json,'$.items') j
  WHERE json_extract(j.value,'$.practiceId') IS NOT NULL`;

export function practiceOriginals(db: Database, id: string) {
  z.string().uuid().parse(id);
  return all<{ sourceId: string; revisionId: string; title: string; trashed: number }>(db, `
    WITH originals AS (${PRACTICE_ORIGINALS})
    SELECT s.id AS sourceId,r.id AS revisionId,r.title,
      EXISTS(SELECT 1 FROM source_lifecycle l WHERE l.source_id=s.id AND l.state='trashed') AS trashed
    FROM originals o JOIN sources s ON s.id=o.sourceId JOIN source_revisions r ON r.source_id=s.id
    WHERE o.practiceId=? AND r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=s.id)
    ORDER BY r.title,s.id`, id).map(row => ({ ...row, trashed: !!row.trashed }));
}

export const PracticeLibraryQuery = z.object({
  query: z.string().max(300).default(''), page: z.number().int().min(0).max(100_000).default(0),
  category: z.enum(['all', 'position', 'method', 'language', 'pattern', 'template', 'material']).default('all'),
  status: z.enum(['all', 'in-use', 'review', 'inactive']).default('all'),
}).strict();
export interface PracticeLibraryItem {
  id: string; recordKind: 'knowledge' | 'source' | 'template'; category: string;
  title: string; preview: string; updatedAt: string; revisionId: string;
  use: 'guidance' | 'baseline' | 'starting-point' | 'reference' | 'inactive' | 'proposed';
  needsReview: boolean; originalCount: number; matterId: string | null;
}
export interface PracticeLibraryPage { records: PracticeLibraryItem[]; total: number; page: number; hasMore: boolean }

export function practiceLibrary(db: Database, raw: z.input<typeof PracticeLibraryQuery>): PracticeLibraryPage {
  const input = PracticeLibraryQuery.parse(raw);
  const baselines = contextLibrary(db).records.filter(r => r.practiceItemId && r.kind === 'source').map(r => r.practiceItemId!);
  const cte = `WITH originals AS (${PRACTICE_ORIGINALS}), baseline AS (SELECT value AS id FROM json_each(?)),
    current_templates AS (SELECT t.*,sr.source_id FROM template_revisions t JOIN source_revisions sr ON sr.id=t.source_revision_id
      WHERE t.revision_no=(SELECT max(revision_no) FROM template_revisions WHERE template_id=t.template_id)),
    items AS (
      SELECT k.id,'knowledge' AS recordKind,k.kind AS category,r.title,
        substr(COALESCE((SELECT sr.body FROM originals o JOIN source_revisions sr ON sr.source_id=o.sourceId
          WHERE o.practiceId=k.id AND k.id IN (SELECT id FROM baseline) AND r.revision_no=1
          ORDER BY sr.revision_no DESC LIMIT 1),r.body),1,400) AS preview,r.received_at AS updatedAt,r.id AS revisionId,k.matter_id AS matterId,
        CASE WHEN EXISTS(SELECT 1 FROM knowledge_revisions a WHERE a.knowledge_id=k.id AND a.status='approved') THEN 'guidance'
          WHEN k.id IN (SELECT id FROM baseline) THEN 'baseline' WHEN r.status='pending' THEN 'proposed' ELSE 'inactive' END AS use,
        (r.status='pending' AND (r.revision_no>1 OR k.id NOT IN (SELECT id FROM baseline))) AS needsReview,
        (SELECT count(*) FROM originals o WHERE o.practiceId=k.id) AS originalCount
      FROM knowledge_items k JOIN knowledge_revisions r ON r.knowledge_id=k.id
      WHERE r.revision_no=(SELECT max(revision_no) FROM knowledge_revisions WHERE knowledge_id=k.id)
      UNION ALL SELECT s.id,'source','material',r.title,substr(COALESCE(r.body,''),1,220),r.received_at,r.id,NULL,'reference',0,1
      FROM sources s JOIN source_revisions r ON r.source_id=s.id
      WHERE r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=s.id) AND ${COLLECTION_SQL}='practice'
        AND NOT EXISTS(SELECT 1 FROM source_lifecycle l WHERE l.source_id=s.id AND l.state='trashed')
        AND NOT EXISTS(SELECT 1 FROM originals o JOIN knowledge_items k ON k.id=o.practiceId WHERE o.sourceId=s.id)
        AND NOT EXISTS(SELECT 1 FROM current_templates t WHERE t.source_id=s.id)
      UNION ALL SELECT t.template_id,'template','template',t.title,substr(t.when_to_use,1,220),t.recorded_at,t.source_revision_id,NULL,
        CASE WHEN t.available=1 AND NOT EXISTS(SELECT 1 FROM source_lifecycle l WHERE l.source_id=t.source_id AND l.state='trashed') THEN 'starting-point' ELSE 'inactive' END,0,1
      FROM current_templates t
    )`;
  const where = `instr(lower(title || ' ' || preview),lower(?))>0 AND (?='all' OR category=?)
    AND (?='all' OR (?='in-use' AND use IN ('guidance','baseline','starting-point')) OR (?='review' AND needsReview=1) OR (?='inactive' AND use='inactive'))`;
  const args = [JSON.stringify(baselines), input.query.trim(), input.category, input.category, input.status, input.status, input.status, input.status];
  const total = one<{ n: number }>(db, `${cte} SELECT count(*) AS n FROM items WHERE ${where}`, ...args)!.n;
  const records = all<Omit<PracticeLibraryItem, 'needsReview'> & { needsReview: number }>(db,
    `${cte} SELECT * FROM items WHERE ${where} ORDER BY updatedAt DESC,recordKind,id LIMIT 50 OFFSET ?`, ...args, input.page * 50)
    .map(row => ({ ...row, needsReview: !!row.needsReview }));
  return { records, total, page: input.page, hasMore: (input.page + 1) * 50 < total };
}
