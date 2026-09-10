import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { z } from "zod";
import { all, one, required } from "./queries";
import { WorkspaceConflictError } from "./types";
import { recordState, requireActiveRecord } from './record-lifecycle';

const Id = z.string().uuid();
export const TemplateFields = z
  .object({
    sourceRevisionId: Id,
    title: z.string().trim().min(1).max(300),
    whenToUse: z.string().trim().min(1).max(2000),
    jurisdiction: z.string().trim().max(500).default(""),
    available: z.boolean().default(true),
    // An explicit UI choice, not inferred from uploading or linking a document.
    practiceWideUse: z.literal(true),
  })
  .strict();
export const TemplateCreate = TemplateFields.extend({ clientId: Id }).strict();
export const TemplateUpdate = TemplateFields.extend({
  baseRevisionId: Id,
}).strict();
export interface PracticeTemplate {
  id: string;
  revisionId: string;
  number: number;
  sourceRevisionId: string;
  title: string;
  whenToUse: string;
  jurisdiction: string;
  available: boolean;
  recordedAt: string;
}
type TemplateRow = Omit<PracticeTemplate, "available"> & { available: number };
const SELECT = `SELECT t.template_id AS id, t.id AS revisionId, t.revision_no AS number,
  t.source_revision_id AS sourceRevisionId, t.title, t.when_to_use AS whenToUse, t.jurisdiction,
  t.available, t.recorded_at AS recordedAt FROM template_revisions t`;
const LATEST =
  "t.revision_no = (SELECT max(revision_no) FROM template_revisions WHERE template_id = t.template_id)";
const decode = (row: TemplateRow): PracticeTemplate => ({
  ...row,
  available: !!row.available,
});

/** A curated starting point pins a source version; it is not an approved legal position. */
export class WorkspaceTemplates {
  constructor(
    private db: Database,
    private now: () => string,
  ) {}
  list(): PracticeTemplate[] {
    return all<TemplateRow>(
      this.db,
      `${SELECT} WHERE ${LATEST} ORDER BY t.recorded_at DESC, t.id`,
    ).map(row => {
      const source = one<{ sourceId: string }>(this.db, 'SELECT source_id AS sourceId FROM source_revisions WHERE id=?', row.sourceRevisionId);
      return { ...decode(row), ...(source && recordState(this.db, 'source', source.sourceId) === 'trashed' ? { available: false } : {}) };
    });
  }
  get(id: string): PracticeTemplate {
    return decode(
      required(
        one<TemplateRow>(
          this.db,
          `${SELECT} WHERE t.template_id = ? AND ${LATEST}`,
          Id.parse(id),
        ),
        "template",
      ),
    );
  }
  history(id: string): PracticeTemplate[] {
    this.get(id);
    return all<TemplateRow>(
      this.db,
      `${SELECT} WHERE t.template_id = ? ORDER BY t.revision_no DESC LIMIT 50`,
      id,
    ).map(decode);
  }
  private checkSource(id: string) {
    const origin = required(one<{ sourceId: string }>(this.db, 'SELECT source_id AS sourceId FROM source_revisions WHERE id=?', id), 'template source version');
    requireActiveRecord(this.db, 'source', origin.sourceId);
    const source = required(
      one<{ body: string | null }>(
        this.db,
        "SELECT body FROM source_revisions WHERE id = ?",
        id,
      ),
      "template source version",
    );
    if (!source.body?.trim())
      throw new WorkspaceConflictError(
        "A template needs readable text. Keep the original as a source until extraction is available.",
      );
  }
  private insert(
    id: string,
    number: number,
    input: z.infer<typeof TemplateFields>,
  ) {
    this.checkSource(input.sourceRevisionId);
    this.db.run(`INSERT INTO source_placements (source_id,collection,revision_id,reason)
      SELECT source_id,'practice',?,'Original of a user-curated practice template.' FROM source_revisions WHERE id=?
      ON CONFLICT(source_id) DO NOTHING`, [randomUUID(), input.sourceRevisionId]);
    this.db.run(
      "INSERT INTO template_revisions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        randomUUID(),
        id,
        number,
        input.sourceRevisionId,
        input.title,
        input.whenToUse,
        input.jurisdiction,
        Number(input.available),
        this.now(),
      ],
    );
    return this.get(id);
  }
  create(raw: z.input<typeof TemplateCreate>): PracticeTemplate {
    const input = TemplateCreate.parse(raw);
    return this.db
      .transaction(() => {
        const previous = one<{ id: string; input: string }>(
          this.db,
          "SELECT id, input_json AS input FROM practice_templates WHERE client_id = ?",
          input.clientId,
        );
        if (previous) {
          if (previous.input !== JSON.stringify(input))
            throw new WorkspaceConflictError(
              "This template save identifier was already used.",
            );
          return this.get(previous.id);
        }
        if (this.list().length >= 200)
          throw new WorkspaceConflictError(
            "This workspace currently supports 200 templates.",
          );
        const id = randomUUID();
        this.db.run("INSERT INTO practice_templates VALUES (?, ?, ?, ?)", [
          id,
          input.clientId,
          JSON.stringify(input),
          this.now(),
        ]);
        return this.insert(id, 1, input);
      })
      .immediate();
  }
  update(id: string, raw: z.input<typeof TemplateUpdate>): PracticeTemplate {
    const input = TemplateUpdate.parse(raw);
    return this.db
      .transaction(() => {
        const current = this.get(id);
        const same = [
          "sourceRevisionId",
          "title",
          "whenToUse",
          "jurisdiction",
          "available",
        ].every(
          (key) =>
            current[key as keyof PracticeTemplate] ===
            input[key as keyof typeof input],
        );
        const base = one<{ number: number }>(
          this.db,
          "SELECT revision_no AS number FROM template_revisions WHERE id = ? AND template_id = ?",
          input.baseRevisionId,
          id,
        );
        if (
          same &&
          base &&
          (base.number === current.number || base.number + 1 === current.number)
        )
          return current;
        if (current.revisionId !== input.baseRevisionId)
          throw new WorkspaceConflictError(
            "This template changed. Reopen it before saving another version.",
          );
        return this.insert(id, current.number + 1, input);
      })
      .immediate();
  }
}

/** Search only the frozen, permitted template descriptors; no source or scope widening. */
export function matchingTemplates(
  templates: PracticeTemplate[],
  query: string,
): PracticeTemplate[] {
  const words =
    query
      .normalize("NFKC")
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (!words.length) return [];
  return templates.filter((item) => {
    const text = `template ${item.title} ${item.whenToUse} ${item.jurisdiction}`
      .normalize("NFKC")
      .toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}
