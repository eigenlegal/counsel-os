import type { Database } from 'bun:sqlite';
import type { ReferenceChange } from './source-updates';
import { VISIBLE_WORK } from './conversation-lifecycle';

export interface DependencyNode { kind: 'source' | 'knowledge' | 'work'; id: string; }
export interface ReferenceImpact {
  changes: ReferenceChange[];
  coverage: { visitedRecords: number; unlinkedRecords: number; truncated: boolean };
}
type Edge = { source_revision_id: string | null; knowledge_revision_id: string | null; prior_work_id: string | null };
const target = (row: Edge): DependencyNode => row.source_revision_id ? { kind: 'source', id: row.source_revision_id }
  : row.knowledge_revision_id ? { kind: 'knowledge', id: row.knowledge_revision_id } : { kind: 'work', id: row.prior_work_id! };
const key = (node: DependencyNode) => `${node.kind}:${node.id}`;

/** Bounded, cycle-safe traversal of explicit immutable evidence only. Never infers
 * a dependency from a filename, a shared matter, or a later approval decision. */
export function referenceImpact(db: Database, root: DependencyNode): ReferenceImpact {
  const queue: Array<{ node: DependencyNode; via: DependencyNode[]; depth: number }> = [{ node: root, via: [], depth: 0 }];
  const seen = new Set([key(root)]), changes: ReferenceChange[] = [];
  let unlinkedRecords = 0, truncated = false;
  for (let i = 0; i < queue.length; i++) {
    const { node, via, depth } = queue[i]!;
    if (node.kind !== 'work') {
      const isSource = node.kind === 'source';
      const table = isSource ? 'source_revisions' : 'knowledge_revisions', recordId = isSource ? 'source_id' : 'knowledge_id';
      const change = db.query(`SELECT ? AS kind, old.${recordId} AS recordId, current.title,
        old.id AS citedRevisionId, old.revision_no AS citedVersion, current.id AS currentRevisionId, current.revision_no AS currentVersion
        FROM ${table} old JOIN ${table} current ON current.${recordId} = old.${recordId}
        AND current.revision_no = (SELECT max(revision_no) FROM ${table} WHERE ${recordId} = old.${recordId}${isSource ? '' : " AND status = 'approved'"})
        WHERE old.id = ? AND current.revision_no > old.revision_no${isSource ? '' : " AND old.status = 'approved'"}`).get(node.kind, node.id) as ReferenceChange | null;
      if (change) changes.push({ ...change, ...(via.length ? { via, ...(depth > 9 ? { viaTruncated: true } : {}) } : {}) });
      if (isSource) continue;
    }
    const table = node.kind === 'work' ? 'evidence' : 'knowledge_evidence', owner = node.kind === 'work' ? 'work_id' : 'revision_id';
    const edges = db.query(`SELECT source_revision_id, knowledge_revision_id, prior_work_id FROM ${table} WHERE ${owner} = ? ORDER BY position`).all(node.id) as Edge[];
    if (!edges.length) unlinkedRecords++;
    for (const edge of edges) {
      const next = target(edge);
      if (seen.has(key(next))) continue;
      if (seen.size >= 1000) { truncated = true; continue; }
      seen.add(key(next));
      queue.push({ node: next, via: key(node) === key(root) ? [] : [...via, node].slice(0, 8), depth: depth + 1 });
    }
  }
  return { changes: changes.sort((a, b) => a.title.localeCompare(b.title) || a.citedVersion - b.citedVersion),
    coverage: { visitedRecords: seen.size, unlinkedRecords, truncated } };
}

/** Reverse traversal uses UNION identities (not UNION ALL paths) to terminate
 * even if a corrupt/imported graph contains a cycle. No record content is read. */
export function affectedWorkQuery(): string {
  return `WITH RECURSIVE edges(from_kind, from_id, to_kind, to_id) AS (
    SELECT 'work', work_id, CASE WHEN source_revision_id IS NOT NULL THEN 'source' WHEN knowledge_revision_id IS NOT NULL THEN 'knowledge' ELSE 'work' END,
      coalesce(source_revision_id, knowledge_revision_id, prior_work_id) FROM evidence
    UNION ALL SELECT 'knowledge', revision_id, CASE WHEN source_revision_id IS NOT NULL THEN 'source' WHEN knowledge_revision_id IS NOT NULL THEN 'knowledge' ELSE 'work' END,
      coalesce(source_revision_id, knowledge_revision_id, prior_work_id) FROM knowledge_evidence
  ), affected(kind, id) AS (
    SELECT 'source', id FROM source_revisions WHERE source_id = ? AND revision_no < (SELECT max(revision_no) FROM source_revisions WHERE source_id = ?)
    UNION SELECT e.from_kind, e.from_id FROM edges e JOIN affected a ON a.kind = e.to_kind AND a.id = e.to_id
  ), affected_work AS (SELECT w.* FROM work_records w JOIN affected a ON a.kind = 'work' AND a.id = w.id WHERE ${VISIBLE_WORK})`;
}
