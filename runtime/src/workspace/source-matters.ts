import { createHash } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { all, one, required } from './queries';
import { WorkspaceConflictError } from './types';

export const SourceMatterChange = z.object({
  action: z.enum(['link', 'unlink']), matterId: z.string().uuid(),
  expectedVersion: z.string().length(64), confirm: z.literal(true),
}).strict();
export interface SourceMatters {
  sourceId: string; version: string;
  matters: Array<{ id: string; title: string }>;
}
export function sourceMatters(db: Database, sourceId: string): SourceMatters {
  z.string().uuid().parse(sourceId);
  required(one(db, 'SELECT id FROM sources WHERE id=?', sourceId), 'source');
  const matters = all<{ id: string; title: string }>(db, `SELECT m.id,m.title FROM matter_sources ms
    JOIN matters m ON m.id=ms.matter_id WHERE ms.source_id=? ORDER BY m.id`, sourceId);
  const latest = one(db, 'SELECT id FROM source_revisions WHERE source_id=? ORDER BY revision_no DESC LIMIT 1', sourceId);
  return { sourceId, matters, version: createHash('sha256').update(JSON.stringify([sourceId, latest, matters])).digest('hex') };
}
export function changeSourceMatter(db: Database, sourceId: string, raw: z.input<typeof SourceMatterChange>): SourceMatters {
  const input = SourceMatterChange.parse(raw);
  return db.transaction(() => {
    const before = sourceMatters(db, sourceId);
    required(one(db, 'SELECT id FROM matters WHERE id=?', input.matterId), 'matter');
    if (before.version !== input.expectedVersion) throw new WorkspaceConflictError('This document or its matter links changed. Reopen the action before saving.');
    if (input.action === 'link') db.run('INSERT INTO matter_sources VALUES (?,?) ON CONFLICT DO NOTHING', [input.matterId, sourceId]);
    else db.run('DELETE FROM matter_sources WHERE matter_id=? AND source_id=?', [input.matterId, sourceId]);
    return sourceMatters(db, sourceId);
  }).immediate();
}
