import type { Database } from "bun:sqlite";
import { z } from "zod";
import { SearchInput } from "./types";
import { workspaceRecordFilter, type SearchBoundary } from "./search";
import { all, one } from "./queries";

export const RecordListInput = z
  .object({
    kind: z
      .enum(["source", "knowledge", "work"])
      .default("source")
      .describe(
        "Sources include imported matter notes/documents. Knowledge is approved Practice. Work is prior saved advice and decisions.",
      ),
    before: z
      .number()
      .int()
      .positive()
      .nullable()
      .default(null)
      .describe(
        "Use nextBefore from the previous page, or null for the newest records.",
      ),
  })
  .strict();
export interface AvailableRecord {
  kind: "source" | "knowledge" | "work";
  id: string;
  recordId: string;
  title: string;
  status: string;
  version: number | null;
  recordedAt: string;
}
export interface RecordPage {
  kind: AvailableRecord["kind"];
  records: AvailableRecord[];
  total: number;
  nextBefore: number | null;
}
export interface DiscoveryContext {
  pages: RecordPage[];
  note: string;
}

/** Metadata only. The boundary is supplied by application code, never a model argument. */
export function listWorkspaceRecords(
  db: Database,
  raw: z.input<typeof RecordListInput>,
  boundary: SearchBoundary,
  limit = 20,
): RecordPage {
  const input = RecordListInput.parse(raw);
  z.number().int().min(1).max(30).parse(limit);
  const filter = workspaceRecordFilter(
    SearchInput.parse({ query: "", kinds: [input.kind] }),
    boundary,
  );
  const from = `FROM search_entries e
    LEFT JOIN source_revisions sr ON sr.id = e.source_revision_id
    LEFT JOIN knowledge_revisions kr ON kr.id = e.knowledge_revision_id
    LEFT JOIN knowledge_items ki ON ki.id = kr.knowledge_id
    LEFT JOIN work_records w ON w.id = e.work_id
    WHERE (${filter.branches.join(" OR ")})`;
  const total = one<{ n: number }>(
    db,
    `SELECT count(*) AS n ${from}`,
    ...filter.bindings,
  )!.n;
  const rows = all<AvailableRecord & { cursor: number }>(
    db,
    `SELECT e.id AS cursor, e.kind,
    COALESCE(sr.id, kr.id, w.id) AS id, COALESCE(sr.source_id, kr.knowledge_id, w.id) AS recordId,
    COALESCE((SELECT title FROM work_outputs o WHERE o.work_id = w.id), e.title) AS title,
    COALESCE(sr.text_status, kr.status, w.disposition) AS status,
    COALESCE(sr.revision_no, kr.revision_no) AS version,
    COALESCE(sr.received_at, kr.received_at, w.recorded_at) AS recordedAt
    ${from} ${input.before === null ? "" : "AND e.id < ?"} ORDER BY e.id DESC LIMIT ?`,
    ...filter.bindings,
    ...(input.before === null ? [] : [input.before]),
    limit + 1,
  );
  return {
    kind: input.kind,
    total,
    records: rows
      .slice(0, limit)
      .map(({ cursor: _cursor, ...record }) => record),
    nextBefore: rows.length > limit ? rows[limit - 1]!.cursor : null,
  };
}
