import type { Database, SQLQueryBindings } from 'bun:sqlite';
import {
  WorkspaceNotFoundError,
  type KnowledgeRevision,
  type SourceRevision,
  type Work,
} from './types';

export function one<T>(db: Database, sql: string, ...args: SQLQueryBindings[]): T | null {
  return db.query(sql).get(...args) as T | null;
}
export function all<T>(db: Database, sql: string, ...args: SQLQueryBindings[]): T[] {
  return db.query(sql).all(...args) as T[];
}
export function required<T>(value: T | null, label: string): T {
  if (value === null) throw new WorkspaceNotFoundError(`unknown ${label}`);
  return value;
}
export const SOURCE_REVISION = `SELECT id, source_id AS sourceId, revision_no AS number, title, body,
  text_status AS textStatus, content_hash AS contentHash, provenance_json AS provenanceJson, received_at AS receivedAt
  FROM source_revisions`;
export type SourceRevisionRow = Omit<SourceRevision, 'provenance'> & { provenanceJson: string };
export function sourceRevision(row: SourceRevisionRow): SourceRevision {
  const { provenanceJson, ...rest } = row;
  return { ...rest, provenance: JSON.parse(provenanceJson) as SourceRevision['provenance'] };
}
export const KNOWLEDGE_REVISION = `SELECT id, knowledge_id AS knowledgeId, revision_no AS number, title, body,
  content_hash AS contentHash, status, approved_by AS approvedBy, approved_at AS approvedAt, received_at AS receivedAt
  FROM knowledge_revisions`;
export const WORK = `SELECT id, title, request, answer, matter_id AS matterId, disposition,
  decision_by AS decisionBy, recorded_at AS recordedAt, content_hash AS contentHash FROM work_records`;
export type WorkRow = Omit<Work, 'evidence' | 'output' | 'origin'>;
export function sourceMatterIds(db: Database, sourceId: string): string[] {
  return all<{ id: string }>(
    db,
    'SELECT matter_id AS id FROM matter_sources WHERE source_id = ? ORDER BY matter_id',
    sourceId,
  ).map((r) => r.id);
}
export function latestKnowledge(
  db: Database,
  id: string,
  approvedOnly = false,
): KnowledgeRevision | null {
  return one<KnowledgeRevision>(
    db,
    `${KNOWLEDGE_REVISION} WHERE knowledge_id = ? ${approvedOnly ? "AND status = 'approved'" : ''} ORDER BY revision_no DESC LIMIT 1`,
    id,
  );
}
