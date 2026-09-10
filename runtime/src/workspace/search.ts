import type { Database, SQLQueryBindings } from 'bun:sqlite';
import { all, one, required, sourceMatterIds } from './queries';
import { SearchInput, type SearchHit, type SearchResult } from './types';
import { VISIBLE_WORK } from './conversation-lifecycle';
import { ACTIVE_SOURCE } from './record-lifecycle';

/** Plain words, not caller-supplied FTS syntax. Quotes, boolean operators and
 * punctuation cannot change scope or turn into SQL/FTS expressions. */
export function matchTerms(query: string): string | null {
  const words = query.normalize('NFKC').match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (words.length > 64) throw new Error('search accepts at most 64 words');
  return words.length === 0 ? null : words.map((word) => `"${word}"`).join(' AND ');
}

const LATEST_SOURCE =
  'sr.revision_no = (SELECT MAX(r.revision_no) FROM source_revisions r WHERE r.source_id = sr.source_id)';
const ACTIVE_KNOWLEDGE = `kr.status = 'approved' AND kr.revision_no =
  (SELECT MAX(r.revision_no) FROM knowledge_revisions r WHERE r.knowledge_id = kr.knowledge_id AND r.status = 'approved')`;

interface HitRow extends Omit<SearchHit, 'matterIds'> {
  matterId: string | null;
}
export interface SearchBoundary {
  all: boolean;
  matterId: string | null;
  /** Application-owned union for an explicitly selected client context. */
  matterIds?: string[];
  sourceRevisionIds: string[];
  workIds: string[];
}

/** Shared by lexical search and metadata browsing. Never filter scope after LIMIT. */
export function workspaceRecordFilter(
  input: ReturnType<typeof SearchInput.parse>,
  boundary?: SearchBoundary,
): { branches: string[]; bindings: SQLQueryBindings[]; sourceClause: string; sourceBindings: SQLQueryBindings[] } {
  const scoped = input.matterId !== undefined;
  const allowedMatters = boundary ? boundary.matterIds ?? (boundary.matterId ? [boundary.matterId] : []) : [];

  // Scope and active-revision filters apply BEFORE ranking/limiting, so a
  // high-ranking document from another matter cannot crowd out valid hits.
  const branches: string[] = [];
  const bindings: SQLQueryBindings[] = [];
  const scopedSourceClause = boundary
    ? `(sr.id IN (SELECT value FROM json_each(?)) OR (${LATEST_SOURCE} AND ${boundary.all ? '1' : 'EXISTS (SELECT 1 FROM matter_sources ms WHERE ms.source_id = sr.source_id AND ms.matter_id IN (SELECT value FROM json_each(?)))'}))`
    : `${input.includeHistory ? '1' : LATEST_SOURCE}${scoped ? ' AND EXISTS (SELECT 1 FROM matter_sources ms WHERE ms.source_id = sr.source_id AND ms.matter_id = ?)' : ''}`;
  const sourceClause = `(${ACTIVE_SOURCE} AND (${scopedSourceClause}))`;
  const sourceBindings: SQLQueryBindings[] = boundary
    ? [
        JSON.stringify(boundary.sourceRevisionIds),
        ...(!boundary.all ? [JSON.stringify(allowedMatters)] : []),
      ]
    : scoped
      ? [input.matterId!]
      : [];
  if (input.kinds.includes('source')) {
    branches.push(`(e.kind = 'source' AND ${sourceClause})`);
    bindings.push(...sourceBindings);
  }
  if (input.kinds.includes('knowledge')) {
    const knowledgeScope = boundary
      ? boundary.all
        ? ''
        : 'AND (ki.matter_id IS NULL OR ki.matter_id IN (SELECT value FROM json_each(?)))'
      : scoped
        ? 'AND (ki.matter_id IS NULL OR ki.matter_id = ?)'
        : '';
    branches.push(
      `(e.kind = 'knowledge' ${input.includeHistory && !boundary ? '' : `AND ${ACTIVE_KNOWLEDGE}`} ${knowledgeScope})`,
    );
    if (boundary ? !boundary.all : scoped)
      bindings.push(boundary ? JSON.stringify(allowedMatters) : input.matterId!);
  }
  if (input.kinds.includes('work')) {
    const workScope = boundary
      ? `AND (w.id IN (SELECT value FROM json_each(?)) OR ${boundary.all ? '1' : 'w.matter_id IN (SELECT value FROM json_each(?))'})`
      : scoped
        ? 'AND w.matter_id = ?'
        : '';
    branches.push(`(e.kind = 'work' AND ${VISIBLE_WORK} ${workScope})`);
    if (boundary) bindings.push(JSON.stringify(boundary.workIds));
    if (boundary ? !boundary.all : scoped)
      bindings.push(boundary ? JSON.stringify(allowedMatters) : input.matterId!);
  }
  return { branches, bindings, sourceClause, sourceBindings };
}

export function searchWorkspace(db: Database, raw: SearchInput, boundary?: SearchBoundary): SearchResult {
  const input = SearchInput.parse(raw);
  if (input.matterId !== undefined)
    required(one(db, 'SELECT id FROM matters WHERE id = ?', input.matterId), `matter: ${input.matterId}`);
  const match = matchTerms(input.query);
  const { branches, bindings, sourceClause, sourceBindings } = workspaceRecordFilter(input, boundary);
  const rows =
    match === null
      ? []
      : all<HitRow>(
          db,
          `
    SELECT e.kind,
      COALESCE(sr.source_id, kr.knowledge_id, w.id) AS recordId,
      COALESCE(sr.id, kr.id) AS revisionId, COALESCE((SELECT title FROM work_outputs o WHERE o.work_id = w.id), e.title) AS title,
      snippet(workspace_search, 1, '', '', '…', 32) AS snippet,
      COALESCE(sr.content_hash, kr.content_hash, w.content_hash) AS contentHash,
      COALESCE(sr.text_status, kr.status, w.disposition) AS status,
      COALESCE(ki.matter_id, w.matter_id) AS matterId
    FROM workspace_search
    JOIN search_entries e ON e.id = workspace_search.rowid
    LEFT JOIN source_revisions sr ON sr.id = e.source_revision_id
    LEFT JOIN knowledge_revisions kr ON kr.id = e.knowledge_revision_id
    LEFT JOIN knowledge_items ki ON ki.id = kr.knowledge_id
    LEFT JOIN work_records w ON w.id = e.work_id
    WHERE workspace_search MATCH ? AND (${branches.join(' OR ')})
    ORDER BY bm25(workspace_search, 2.0, 1.0), e.id
    LIMIT ?`,
          match,
          ...bindings,
          input.limit + 1,
        );

  const gaps = !input.kinds.includes('source')
    ? []
    : all<SearchResult['coverage']['gaps'][number]>(
        db,
        `
    SELECT sr.source_id AS sourceId, sr.id AS revisionId, sr.title, sr.text_status AS textStatus
    FROM source_revisions sr WHERE sr.text_status != 'ready'
      AND ${sourceClause}
    ORDER BY sr.source_id, sr.revision_no`,
        ...sourceBindings,
      );

  return {
    hits: rows.slice(0, input.limit).map(({ matterId, ...row }) => ({
      ...row,
      matterIds:
        row.kind === 'source'
          ? sourceMatterIds(db, row.recordId)
          : matterId === null
            ? []
            : [matterId],
    })),
    truncated: rows.length > input.limit,
    coverage: { complete: gaps.length === 0, gaps },
  };
}
