import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { all, one } from './queries';
import { practiceDisplayTitle } from './practice-library';
import { practicePreview } from './practice-presentation';

export const AdoptStandards = z.object({
  selections: z.array(z.object({ id: z.string().uuid(), expectedRevisionId: z.string().uuid() }).strict()).min(1).max(50)
    .refine(items => new Set(items.map(item => item.id)).size === items.length, 'Select each item only once.'),
  expectedProfileRevisionId: z.string().uuid(),
  confirm: z.literal(true),
}).strict();
export interface ImportedStandard { id: string; revisionId: string; title: string; preview: string; category: 'position' | 'method' | 'language' | 'pattern' }
export interface ImportedStandardsPage { records: ImportedStandard[]; total: number; page: number; hasMore: boolean }

// Ordinary completed imports only. Direct plugin baselines already have their own
// use policy. Matter concessions, maintained content and later edits are never
// eligible for this shortcut. Match the actual imported body, not a path claim.
const CANDIDATES = `WITH receipts AS (
  SELECT json_extract(j.value,'$.practiceId') AS practiceId,json_extract(j.value,'$.sourceRevisionId') AS sourceRevisionId
  FROM import_batches b,json_each(b.receipt_json,'$.items') j
  WHERE b.status='committed'
), candidates AS (
  SELECT DISTINCT k.id,r.id AS revisionId,r.title,substr(r.body,1,8192) AS preview,k.kind AS category
  FROM receipts i JOIN knowledge_items k ON k.id=i.practiceId
  JOIN knowledge_revisions r ON r.knowledge_id=k.id
  JOIN source_revisions s ON s.id=i.sourceRevisionId
  WHERE k.kind IN ('position','method','language','pattern') AND k.ownership='user' AND k.matter_id IS NULL
    AND r.revision_no=1 AND r.status='pending' AND r.body=s.body
    AND NOT EXISTS(SELECT 1 FROM knowledge_revisions n WHERE n.knowledge_id=k.id AND n.revision_no>1)
    AND NOT EXISTS(SELECT 1 FROM source_revisions n WHERE n.source_id=s.source_id AND n.revision_no>s.revision_no)
    AND NOT EXISTS(SELECT 1 FROM source_lifecycle l WHERE l.source_id=s.source_id AND l.state='trashed')
)`;

export function importedStandards(db: Database, page = 0): ImportedStandardsPage {
  z.number().int().min(0).max(100_000).parse(page);
  const total = one<{ n: number }>(db, `${CANDIDATES} SELECT count(*) AS n FROM candidates`)!.n;
  const records = all<ImportedStandard>(db, `${CANDIDATES} SELECT * FROM candidates ORDER BY title,id LIMIT 50 OFFSET ?`, page * 50)
    .map(item => ({ ...item, title: practiceDisplayTitle(db, item.id, item.title), preview: practicePreview(item.preview) }));
  return { records, total, page, hasMore: (page + 1) * 50 < total };
}

export function canAdoptStandard(db: Database, id: string, revisionId: string): boolean {
  return !!one(db, `${CANDIDATES} SELECT 1 FROM candidates WHERE id=? AND revisionId=?`, id, revisionId);
}
