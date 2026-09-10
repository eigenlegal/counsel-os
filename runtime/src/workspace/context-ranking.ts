import type { Database } from 'bun:sqlite';
import { all } from './queries';
import { workspaceRecordFilter, type SearchBoundary } from './search';
import { SearchInput, type SearchHit } from './types';
import type { AvailableRecord } from './record-discovery';

export { contextTerms, contextWindow } from './context-terms';

export interface RankedRecord extends AvailableRecord { status: SearchHit['status']; relevance: number; snippet: string; contentHash: string | null; matchTerms?: string[] }
/** Private application query. Scope/active versions are filtered before ranking and LIMIT.
 * An optional identity set NARROWS that boundary; it never grants permission to read a file.
 * Returns metadata only. A subsequent permission-checked tool read establishes evidence.
 */
export interface ContextRankingOptions {
  terms: string[];
  alternateTerms?: string[][];
  kinds?: AvailableRecord['kind'][];
  ids?: string[];
  matterNotes?: boolean;
  snippets?: boolean;
}
export function rankContextRecords(db: Database, options: ContextRankingOptions, boundary: SearchBoundary, limit = 12): RankedRecord[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 31) throw new Error('Invalid context result limit.');
  if (options.matterNotes || !options.alternateTerms?.length) return rankLexical(db,options,boundary,limit);
  // Fuse independently scoped rankings; no cross-matter candidate ever reaches this merge.
  const rankings = [rankLexical(db,options,boundary,31), ...options.alternateTerms.slice(0,3).map(terms => rankLexical(db,{...options,terms},boundary,31))];
  const scores = new Map<string,{record:RankedRecord;score:number;order:number;matchTerms:Set<string>}>();
  rankings.forEach((ranking,queryIndex)=>ranking.forEach((record,index)=>{
    const key=record.kind+':'+record.id, entry=scores.get(key)??{record,score:0,order:scores.size,matchTerms:new Set<string>()};
    if(queryIndex) for(const word of options.alternateTerms![queryIndex-1]!.slice(0,32)) entry.matchTerms.add(word);
    entry.score+=1/(20+index+1);scores.set(key,entry);
  }));
  return [...scores.values()].sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,limit).map(item=>({...item.record,relevance:-item.score,
    ...(item.matchTerms.size ? {matchTerms:[...item.matchTerms]} : {})}));
}
function rankLexical(db: Database, options: ContextRankingOptions, boundary: SearchBoundary, limit: number): RankedRecord[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 31) throw new Error('Invalid context result limit.');
  const words = options.terms.slice(0, 32).filter(word => word.length <= 80 && /^[\p{L}\p{N}]+$/u.test(word));
  const match = words.map(word => `"${word}"${word.length >= 4 ? '*' : ''}`).join(' OR ');
  if (!match && !options.matterNotes) return [];
  if (options.ids && !options.ids.length) return [];
  const filter = workspaceRecordFilter(SearchInput.parse({ query: '', kinds: options.kinds ?? ['source', 'knowledge', 'work'] }), boundary);
  // Notes are a recency fallback within selected matters, not an invitation to read
  // every imported matter from an unscoped chat or to trust a filename as evidence.
  const matters = boundary.matterIds ?? (boundary.matterId ? [boundary.matterId] : []);
  const useSearch = !options.matterNotes;
  return all<RankedRecord>(db, `
    SELECT e.kind, COALESCE(sr.id, kr.id, w.id) AS id,
      COALESCE(sr.source_id, kr.knowledge_id, w.id) AS recordId,
      COALESCE((SELECT title FROM work_outputs o WHERE o.work_id=w.id), e.title) AS title,
      COALESCE(sr.text_status, kr.status, w.disposition) AS status,
      COALESCE(sr.revision_no, kr.revision_no) AS version,
      COALESCE(sr.received_at, kr.received_at, w.recorded_at) AS recordedAt,
      COALESCE(sr.content_hash, kr.content_hash, w.content_hash) AS contentHash,
      ${useSearch && options.snippets ? "substr(snippet(workspace_search, 1, '', '', '…', 32), 1, 2000)" : "''"} AS snippet,
      ${useSearch ? 'bm25(workspace_search, 3.0, 1.0)' : '0'} AS relevance
    FROM ${useSearch ? 'workspace_search JOIN search_entries e ON e.id=workspace_search.rowid' : 'search_entries e'}
    LEFT JOIN source_revisions sr ON sr.id=e.source_revision_id
    LEFT JOIN knowledge_revisions kr ON kr.id=e.knowledge_revision_id
    LEFT JOIN knowledge_items ki ON ki.id=kr.knowledge_id
    LEFT JOIN work_records w ON w.id=e.work_id
    WHERE (${filter.branches.join(' OR ')})
      ${useSearch ? 'AND workspace_search MATCH ?' : `AND e.kind='source' AND json_extract(sr.provenance_json, '$.origin') LIKE 'plugin:matters/%'
        AND EXISTS (SELECT 1 FROM matter_sources ms WHERE ms.source_id=sr.source_id AND ms.matter_id IN (SELECT value FROM json_each(?)))`}
      ${options.ids ? 'AND COALESCE(sr.id, kr.id, w.id) IN (SELECT value FROM json_each(?))' : ''}
    ORDER BY ${useSearch ? 'relevance ASC,' : ''} e.id DESC LIMIT ?`,
    ...filter.bindings, useSearch ? match : JSON.stringify(matters),
    ...(options.ids ? [JSON.stringify(options.ids)] : []), limit);
}
