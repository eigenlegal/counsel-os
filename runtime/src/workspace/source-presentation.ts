import type { Database } from 'bun:sqlite';
import { one } from './queries';
import { importedPracticeTitle } from './practice-presentation';

/** Presentation only; an actual intake receipt must identify the original. */
export function sourceDisplayTitle(db: Database, id: string, title: string): string {
  if (!/[\s-][a-f0-9]{8}$/i.test(title)) return title;
  const original = one<{ title: string; body: string; origin: string }>(db, `SELECT r.title,substr(COALESCE(r.body,''),1,8192) AS body,
    COALESCE(json_extract(r.provenance_json,'$.origin'),'') AS origin FROM source_revisions r
    WHERE r.source_id=? AND r.revision_no=1 AND EXISTS(SELECT 1 FROM import_batches b,json_each(b.receipt_json,'$.items') j
      WHERE b.status='committed' AND json_extract(j.value,'$.sourceId')=r.source_id)`, id);
  return original ? importedPracticeTitle(title, original) : title;
}
