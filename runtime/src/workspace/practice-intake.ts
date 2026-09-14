import { z } from 'zod';
import type { Database } from 'bun:sqlite';
import { ACTIVE_SOURCE } from './record-lifecycle';
import { practiceIntakeHint } from './practice-intake-hints';

export const PracticeSourceQuery = z.object({
  batch: z.string().uuid().optional(), query: z.string().trim().max(200).default(''),
  all: z.enum(['true', 'false']).default('false'), offset: z.coerce.number().int().min(0).max(100_000).default(0),
}).strict();

export interface PracticeSourcePage {
  items: Array<{ sourceId: string; revisionId: string; title: string; reason: string; partial: boolean }>;
  scanned: number; nextOffset: number | null;
}
export function practiceSources(db: Database, raw: z.input<typeof PracticeSourceQuery>): PracticeSourcePage {
  const input = PracticeSourceQuery.parse(raw);
  // Page bounded excerpts, never original bytes or referenced paths. A query
  // searches saved text as well as titles, including arbitrarily named files.
  const rows = db.query(`SELECT sr.id AS revisionId,sr.source_id AS sourceId,sr.title,
    substr(sr.body,1,12000)||char(10)||substr(sr.body,-4000) AS sample,sr.text_status AS textStatus,
    EXISTS (SELECT 1 FROM import_batches b,json_each(b.receipt_json,'$.items') item JOIN import_entries e ON e.id=json_extract(item.value,'$.entryId')
      WHERE b.status='committed' AND e.batch_id=b.id AND json_extract(item.value,'$.sourceId')=sr.source_id
      AND json_extract(e.choice_json,'$.destination')='profile') AS designated
    FROM source_revisions sr WHERE ${ACTIVE_SOURCE}
    AND sr.revision_no=(SELECT max(r.revision_no) FROM source_revisions r WHERE r.source_id=sr.source_id)
    AND sr.body IS NOT NULL AND length(trim(sr.body))>0
    AND (?='' OR instr(lower(sr.title||char(10)||sr.body),lower(?))>0)
    AND (? IS NULL OR EXISTS (SELECT 1 FROM import_batches b,json_each(b.receipt_json,'$.items') item
      WHERE b.id=? AND b.status='committed' AND json_extract(item.value,'$.sourceId')=sr.source_id))
    ORDER BY sr.received_at DESC,sr.id LIMIT 201 OFFSET ?`).all(input.query, input.query, input.batch ?? null, input.batch ?? null, input.offset) as Array<{
      revisionId: string; sourceId: string; title: string; sample: string; textStatus: string; designated: number;
    }>;
  const scanned = rows.slice(0, 200);
  return { items: scanned.flatMap(row => {
    const hint = row.designated ? 'Identified during import as a possible practice setup source.' : practiceIntakeHint(row.sample, row.title);
    return hint || input.all === 'true' || input.query ? [{ sourceId: row.sourceId, revisionId: row.revisionId, title: row.title,
      reason: hint ?? 'Choose this file if it describes your practice or preferences.', partial: row.textStatus !== 'ready' }] : [];
  }), scanned: scanned.length, nextOffset: rows.length > 200 ? input.offset + 200 : null };
}
