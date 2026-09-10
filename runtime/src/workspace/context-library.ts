import type { Database } from "bun:sqlite";
import {
  all,
  latestKnowledge,
  sourceRevision,
  SOURCE_REVISION,
  type SourceRevisionRow,
} from "./queries";
import type { SeedReceipt } from "./types";
import { recordState } from './record-lifecycle';

export interface LibraryRecord {
  kind: "source" | "knowledge";
  id: string;
  recordId: string;
  title: string;
  category: string;
  path: string;
  version: number;
  practiceItemId?: string;
}
export interface ContextLibrary {
  records: LibraryRecord[];
  total: number;
  truncated: boolean;
  note: string;
}

function category(path: string): string | null {
  if (path === "practice/profile.md") return null; // The profile sharing switch is authoritative.
  if (path.startsWith("law/"))
    return "Imported law reference — currency not verified";
  if (path.startsWith("practice/standards/"))
    return "Imported practice baseline — not a new model proposal";
  if (path.startsWith("practice/methods/")) return "Practice working method";
  if (path.startsWith("practice/library/"))
    return "Practice clause library — starting language";
  if (path.startsWith("practice/"))
    return "Practice reference material — not a standard";
  if (path === "memory/patterns.md")
    return "Historical observations — do not change the baseline";
  return null;
}

/** Reusable files from the user-selected plugin snapshot, not arbitrary provenance strings.
 * Import receipts establish membership. Matter files, profile originals, unfiled uploads,
 * import inventories and other clients' records are never granted access by this catalog.
 * Browser placement alone remains organization, not a sharing/approval operation.
 */
export function contextLibrary(db: Database): ContextLibrary {
  const records = new Map<string, LibraryRecord>();
  const receipts = all<{ records: string }>(
    db,
    "SELECT records_json AS records FROM seed_imports WHERE seed_id GLOB 'plugin-v1-*'",
  );
  for (const receipt of receipts) {
    const imported = JSON.parse(receipt.records) as SeedReceipt["records"];
    for (const [key, sourceId] of Object.entries(imported.sources)) {
      const first = db
        .query(`${SOURCE_REVISION} WHERE id=?`)
        .get(imported.sourceRevisions[key]!) as SourceRevisionRow | null;
      if (!first || first.sourceId !== sourceId) continue;
      const original = sourceRevision(first);
      const path = original.provenance.origin.replace(/^plugin:/, "");
      if (
        !original.provenance.origin.startsWith("plugin:") ||
        path.split("/").some((p) => p === ".." || p === ".")
      )
        continue;
      const role = category(path);
      if (!role) continue;
      const knowledgeId = imported.knowledge[key];
      const approved = knowledgeId
        ? latestKnowledge(db, knowledgeId, true)
        : null;
      // Adoption supersedes the original. Rejecting the original's initial review
      // withdraws it; rejecting a later proposed EDIT leaves that baseline unchanged.
      if (approved) {
        records.set(approved.id, {
          kind: "knowledge",
          id: approved.id,
          recordId: knowledgeId!,
          title: approved.title,
          version: approved.number,
          path,
          category: path.startsWith("practice/standards/")
            ? "Approved practice baseline"
            : `Approved ${role.charAt(0).toLowerCase()}${role.slice(1)}`,
        });
        continue;
      }
      if (recordState(db, 'source', sourceId) === 'trashed') continue;
      const importedRevisionId = imported.knowledgeRevisions[key];
      const withdrawn = knowledgeId && importedRevisionId && db.query(`
        SELECT 1 FROM knowledge_revisions review
        JOIN knowledge_revisions original ON original.id = ? AND original.knowledge_id = review.knowledge_id
        WHERE review.knowledge_id = ? AND review.revision_no = original.revision_no + 1
          AND review.status = 'rejected'
      `).get(importedRevisionId, knowledgeId);
      if (withdrawn) continue;
      const row = db
        .query(
          `${SOURCE_REVISION} WHERE source_id=? ORDER BY revision_no DESC LIMIT 1`,
        )
        .get(sourceId) as SourceRevisionRow | null;
      if (!row) continue;
      records.set(row.id, {
        kind: "source",
        id: row.id,
        recordId: sourceId,
        title: row.title,
        version: row.number,
        path,
        category: role,
        ...(knowledgeId ? { practiceItemId: knowledgeId } : {}),
      });
    }
  }
  const sorted = [...records.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  return {
    records: sorted,
    total: sorted.length,
    truncated: false,
    note: "User-imported reusable library. Imported standards are the supplied baseline, not newly approved AI proposals. Approved replacements take priority. Rejecting the original withdraws it; rejecting a proposed edit keeps the baseline. Law files are saved research, not verified current law. Matter concessions and historical patterns never change standards. Profile originals are excluded; the saved profile sharing setting controls profile context.",
  };
}
