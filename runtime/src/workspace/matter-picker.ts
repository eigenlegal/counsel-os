import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import type { Matter } from './types';

export interface MatterOption extends Pick<Matter, 'id' | 'title' | 'kind' | 'createdAt'> {
  activityAt: string;
  status: 'open' | 'on-hold' | 'closed' | null;
}
export interface MatterMatches { items: MatterOption[]; total: number; }
const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const Query = z.string().trim().max(250).refine(value => value.split(/\s+/).length <= 16, 'Search with 16 words or fewer.');

/** Metadata-only lookup, independent of the library's display limit. Never invokes a model. */
export function findMatterOptions(db: Database, raw: string): MatterMatches {
  const terms = normalize(Query.parse(raw)).split(/\s+/).filter(Boolean);
  const rows = db.query<MatterOption, []>(`
    SELECT m.id, m.title, m.kind, m.created_at AS createdAt,
      max(m.created_at,
        coalesce((SELECT max(updated_at) FROM conversations WHERE matter_id=m.id), m.created_at),
        coalesce((SELECT max(recorded_at) FROM work_records WHERE matter_id=m.id), m.created_at),
        coalesce((SELECT max(recorded_at) FROM matter_briefs WHERE matter_id=m.id), m.created_at)
      ) AS activityAt,
      (SELECT status FROM matter_briefs WHERE matter_id=m.id ORDER BY revision_no DESC LIMIT 1) AS status
    FROM matters m
    ORDER BY activityAt DESC, m.title COLLATE NOCASE, m.id`).iterate();
  // Iterate metadata instead of materializing a whole collection; JS normalization
  // handles Unicode names and accents that SQLite's built-in lower() does not.
  const items: MatterOption[] = [];
  let total = 0;
  for (const row of rows) {
    const title = normalize(row.title);
    if (!terms.every(term => title.includes(term))) continue;
    total++;
    if (items.length < 50) items.push(row);
  }
  return { items, total };
}
