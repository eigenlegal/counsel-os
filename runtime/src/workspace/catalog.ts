import type { Database } from 'bun:sqlite';
import { all, one, sourceMatterIds } from './queries';
import type { Knowledge, Matter, Source, Work } from './types';
import { VISIBLE_WORK, TRASHED_WORK } from './conversation-lifecycle';

export interface CatalogSource {
  id: string;
  kind: Source['kind'];
  title: string;
  preview: string;
  textStatus: Source['latest']['textStatus'];
  revisionId: string;
  updatedAt: string;
  matterIds: string[];
}
export interface CatalogKnowledge {
  importedOriginal?: { sourceId: string; revisionId: string };
  id: string;
  kind: Knowledge['kind'];
  title: string;
  preview: string;
  status: Knowledge['latest']['status'];
  revisionId: string;
  updatedAt: string;
  matterId: string | null;
  hasApprovedVersion: boolean;
}
export interface CatalogWork {
  id: string;
  title: string;
  preview: string;
  disposition: Work['disposition'];
  matterId: string | null;
  recordedAt: string;
  evidenceCount: number;
  outputKind: string | null;
  conversationId: string | null;
}
export interface CatalogMatter extends Matter {
  workCount: number;
}
export interface WorkspaceCatalog {
  matters: CatalogMatter[];
  sources: CatalogSource[];
  knowledge: CatalogKnowledge[];
  work: CatalogWork[];
  savedWork: CatalogWork[];
  totals: { matters: number; sources: number; knowledge: number; work: number; pending: number };
  limit: number;
}

/** A bounded catalog, not a dump of document bodies. Full records load on open. */
export function workspaceCatalog(db: Database, limit: number, matterId?: string): WorkspaceCatalog {
  const count = (table: string) => one<{ n: number }>(db, `SELECT count(*) AS n FROM ${table}`)!.n;
  const scope = matterId === undefined ? [] : [matterId];
  const sourceBoundary =
    matterId === undefined
      ? '1'
      : 'EXISTS (SELECT 1 FROM matter_sources ms WHERE ms.source_id = s.id AND ms.matter_id = ?)';
  const sourceScope = `NOT EXISTS (SELECT 1 FROM source_lifecycle sl WHERE sl.source_id=s.id AND sl.state='trashed') AND ${sourceBoundary}`;
  const knowledgeScope = matterId === undefined ? '1' : 'k.matter_id = ?';
  const workScope = `${VISIBLE_WORK} AND ${matterId === undefined ? '1' : 'w.matter_id = ?'}`;
  const savedScope = `${workScope} AND (EXISTS (SELECT 1 FROM work_outputs o WHERE o.work_id = w.id)
    OR EXISTS (SELECT 1 FROM work_exports x WHERE x.work_id = w.id)
    OR NOT EXISTS (SELECT 1 FROM conversation_turns t WHERE t.work_id = w.id))`;
  const workQuery = `SELECT w.id, COALESCE(o.title, CASE WHEN ${TRASHED_WORK} THEN 'Saved work' ELSE w.title END) AS title, substr(w.answer, 1, 220) AS preview,
    w.disposition, w.matter_id AS matterId, w.recorded_at AS recordedAt,
    COALESCE(o.kind, CASE WHEN w.disposition = 'draft' AND EXISTS (SELECT 1 FROM work_exports x WHERE x.work_id = w.id) THEN 'draft' END) AS outputKind,
    CASE WHEN ${TRASHED_WORK} THEN NULL ELSE (SELECT conversation_id FROM conversation_turns t WHERE t.work_id = w.id) END AS conversationId,
    (SELECT count(*) FROM evidence e WHERE e.work_id = w.id) AS evidenceCount
    FROM work_records w LEFT JOIN work_outputs o ON o.work_id = w.id`;
  const sources = all<Omit<CatalogSource, 'matterIds'>>(
    db,
    `SELECT s.id, s.kind, r.title,
    substr(COALESCE(r.body, ''), 1, 220) AS preview, r.text_status AS textStatus,
    r.id AS revisionId, r.received_at AS updatedAt FROM sources s JOIN source_revisions r ON r.source_id = s.id
    WHERE r.revision_no = (SELECT max(revision_no) FROM source_revisions WHERE source_id = s.id)
    AND ${sourceScope} ORDER BY r.received_at DESC, s.id LIMIT ?`,
    ...scope,
    limit,
  );
  const knowledge = all<
    Omit<CatalogKnowledge, 'hasApprovedVersion'> & { hasApprovedVersion: number }
  >(
    db,
    `SELECT k.id, k.kind, k.matter_id AS matterId, r.title, substr(r.body, 1, 220) AS preview,
    r.status, r.id AS revisionId, r.received_at AS updatedAt,
    EXISTS(SELECT 1 FROM knowledge_revisions a WHERE a.knowledge_id = k.id AND a.status = 'approved') AS hasApprovedVersion
    FROM knowledge_items k JOIN knowledge_revisions r ON r.knowledge_id = k.id
    WHERE r.revision_no = (SELECT max(revision_no) FROM knowledge_revisions WHERE knowledge_id = k.id)
    AND ${knowledgeScope} ORDER BY r.received_at DESC, k.id LIMIT ?`,
    ...scope,
    limit,
  );
  return {
    matters: all<CatalogMatter>(
      db,
      `SELECT m.id, m.title, m.kind, substr(COALESCE((SELECT summary FROM matter_briefs b WHERE b.matter_id = m.id ORDER BY revision_no DESC LIMIT 1), m.summary), 1, 220) AS summary, m.created_at AS createdAt,
      (SELECT count(*) FROM work_records w WHERE w.matter_id = m.id AND ${VISIBLE_WORK}) AS workCount
      FROM matters m ORDER BY m.created_at DESC, m.id LIMIT ?`,
      limit,
    ),
    sources: sources.map((s) => ({ ...s, matterIds: sourceMatterIds(db, s.id) })),
    knowledge: knowledge.map((k) => ({ ...k, hasApprovedVersion: Boolean(k.hasApprovedVersion) })),
    work: all<CatalogWork>(
      db,
      `${workQuery} WHERE ${workScope} ORDER BY w.recorded_at DESC, w.id LIMIT ?`,
      ...scope,
      limit,
    ),
    savedWork: all<CatalogWork>(
      db,
      `${workQuery} WHERE ${savedScope}
      ORDER BY w.recorded_at DESC, w.id LIMIT ?`,
      ...scope,
      limit,
    ),
    totals: {
      matters: count('matters'),
      sources: one<{ n: number }>(
        db,
        `SELECT count(*) AS n FROM sources s WHERE ${sourceScope}`,
        ...scope,
      )!.n,
      knowledge: one<{ n: number }>(
        db,
        `SELECT count(*) AS n FROM knowledge_items k WHERE ${knowledgeScope}`,
        ...scope,
      )!.n,
      work: one<{ n: number }>(
        db,
        `SELECT count(*) AS n FROM work_records w WHERE ${workScope}`,
        ...scope,
      )!.n,
      pending: one<{ n: number }>(
        db,
        `SELECT count(*) AS n FROM knowledge_revisions r WHERE status = 'pending'
        AND revision_no = (SELECT max(revision_no) FROM knowledge_revisions WHERE knowledge_id = r.knowledge_id)
        ${matterId === undefined ? '' : 'AND EXISTS (SELECT 1 FROM knowledge_items k WHERE k.id = r.knowledge_id AND k.matter_id = ?)'}`,
        ...scope,
      )!.n,
    },
    limit,
  };
}
