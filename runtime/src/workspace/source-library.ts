import type { Database } from "bun:sqlite";
import { z } from "zod";
import { all, one, required, sourceMatterIds } from "./queries";
import { WorkspaceConflictError } from "./types";
import type { CatalogSource } from "./catalog";

export const SourceCollection = z.enum([
  "external",
  "practice",
  "matter",
  "unfiled",
]);
export type SourceCollection = z.infer<typeof SourceCollection>;
export interface SourcePlacement {
  collection: SourceCollection;
  revisionId: string | null;
  reason: string;
}
export const PlacementInput = z
  .object({
    collection: z.enum(["external", "practice", "auto"]),
    expectedRevisionId: z.string().nullable(),
  })
  .strict();
export const LibraryQuery = z
  .object({
    collection: SourceCollection,
    query: z.string().max(300).default(""),
    page: z.number().int().min(0).max(100_000).default(0),
  })
  .strict();
export interface SourceLibraryPage {
  records: CatalogSource[];
  total: number;
  page: number;
  hasMore: boolean;
}
export const COLLECTION_SQL = `COALESCE((SELECT collection FROM source_placements p WHERE p.source_id=s.id),
  CASE WHEN EXISTS (SELECT 1 FROM matter_sources ms WHERE ms.source_id=s.id) THEN 'matter' ELSE 'unfiled' END)`;

/** A location in the browser, never an approval or a model-access grant. */
export function sourcePlacement(
  db: Database,
  sourceId: string,
): SourcePlacement {
  return required(
    one<SourcePlacement>(
      db,
      `SELECT ${COLLECTION_SQL} AS collection,
    (SELECT revision_id FROM source_placements p WHERE p.source_id=s.id) AS revisionId,
    COALESCE((SELECT reason FROM source_placements p WHERE p.source_id=s.id), 'Not classified as external or reusable practice material.') AS reason
    FROM sources s WHERE s.id=?`,
      sourceId,
    ),
    "Source not found.",
  );
}
export function placeSource(
  db: Database,
  sourceId: string,
  raw: z.input<typeof PlacementInput>,
) {
  const input = PlacementInput.parse(raw),
    current = sourcePlacement(db, sourceId);
  if (current.revisionId !== input.expectedRevisionId)
    throw new WorkspaceConflictError(
      "This file’s location changed. Reopen it before organizing.",
    );
  if (input.collection === "auto")
    db.run("DELETE FROM source_placements WHERE source_id=?", [sourceId]);
  else
    db.run(
      `INSERT INTO source_placements VALUES (?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET
    collection=excluded.collection, revision_id=excluded.revision_id, reason=excluded.reason`,
      [
        sourceId,
        input.collection,
        crypto.randomUUID(),
        "Library organization only. Location does not approve content or change chat access.",
      ],
    );
  return sourcePlacement(db, sourceId);
}
export function sourceLibrary(
  db: Database,
  raw: z.input<typeof LibraryQuery>,
): SourceLibraryPage {
  const input = LibraryQuery.parse(raw),
    where = `NOT EXISTS (SELECT 1 FROM source_lifecycle sl WHERE sl.source_id=s.id AND sl.state='trashed') AND ${COLLECTION_SQL}=? AND instr(lower(r.title), lower(?))>0`;
  const from = `FROM sources s JOIN source_revisions r ON r.source_id=s.id AND r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=s.id)`;
  const total = one<{ n: number }>(
    db,
    `SELECT count(*) AS n ${from} WHERE ${where}`,
    input.collection,
    input.query.trim(),
  )!.n;
  const records = all<Omit<CatalogSource, "matterIds">>(
    db,
    `SELECT s.id,s.kind,r.title,substr(COALESCE(r.body,''),1,220) AS preview,
    r.text_status AS textStatus,r.id AS revisionId,r.received_at AS updatedAt ${from} WHERE ${where}
    ORDER BY s.rowid DESC LIMIT 50 OFFSET ?`,
    input.collection,
    input.query.trim(),
    input.page * 50,
  ).map((record) => ({ ...record, matterIds: sourceMatterIds(db, record.id) }));
  return {
    records,
    total,
    page: input.page,
    hasMore: (input.page + 1) * 50 < total,
  };
}
