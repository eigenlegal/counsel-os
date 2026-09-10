import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { z } from "zod";
import { all, one, required } from "./queries";
import { WorkspaceConflictError } from "./types";

const Id = z.string().uuid();
export const ClientFields = z
  .object({
    name: z.string().trim().min(1).max(200),
    summary: z.string().max(4_000).default(""),
  })
  .strict();
export const ClientCreate = ClientFields.extend({ id: Id });
export const ClientUpdate = ClientFields.extend({ expectedRevisionId: Id });
export const ClientAssignment = z
  .object({ clientId: Id.nullable(), expectedRevisionId: Id.nullable() })
  .strict();
export const SelectedClientMatters = z
  .array(Id)
  .min(1)
  .max(100)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Choose each matter once.",
  );
export interface Client {
  id: string;
  name: string;
  summary: string;
  revisionId: string;
  createdAt: string;
  matterCount: number;
}
export interface ClientLink {
  clientId: string | null;
  revisionId: string | null;
}
export interface ClientContext {
  id: string;
  name: string;
  summary: string;
  revisionId: string;
  matters: { id: string; title: string }[];
}
const CLIENT = `SELECT c.id,c.name,c.summary,c.revision_id AS revisionId,c.created_at AS createdAt,
  (SELECT count(*) FROM matter_clients mc WHERE mc.client_id=c.id) AS matterCount FROM clients c`;

/** Optional grouping, not tenancy, billing, or an ethical-wall implementation. */
export class WorkspaceClients {
  constructor(
    private db: Database,
    private now: () => string,
  ) {}
  list(): Client[] {
    return all<Client>(
      this.db,
      `${CLIENT} ORDER BY c.name COLLATE NOCASE,c.id`,
    );
  }
  get(id: string): Client {
    return required(
      one<Client>(this.db, `${CLIENT} WHERE c.id=?`, Id.parse(id)),
      "Client not found.",
    );
  }
  create(raw: z.input<typeof ClientCreate>): Client {
    const input = ClientCreate.parse(raw);
    return this.db
      .transaction(() => {
        const existing = one<Client>(
          this.db,
          `${CLIENT} WHERE c.id=?`,
          input.id,
        );
        if (existing) {
          if (
            existing.name === input.name &&
            existing.summary === input.summary
          )
            return existing;
          throw new WorkspaceConflictError(
            "This create identifier was already used.",
          );
        }
        if (this.list().length >= 500)
          throw new WorkspaceConflictError(
            "This version supports up to 500 clients.",
          );
        this.db.run("INSERT INTO clients VALUES (?,?,?,?,?)", [
          input.id,
          input.name,
          input.summary,
          randomUUID(),
          this.now(),
        ]);
        return this.get(input.id);
      })
      .immediate();
  }
  update(id: string, raw: z.input<typeof ClientUpdate>): Client {
    const input = ClientUpdate.parse(raw);
    return this.db
      .transaction(() => {
        if (this.get(id).revisionId !== input.expectedRevisionId)
          throw new WorkspaceConflictError(
            "This client changed in another window. Reopen before editing.",
          );
        this.db.run(
          "UPDATE clients SET name=?,summary=?,revision_id=? WHERE id=?",
          [input.name, input.summary, randomUUID(), id],
        );
        return this.get(id);
      })
      .immediate();
  }
  link(matterId: string): ClientLink {
    required(
      one(this.db, "SELECT id FROM matters WHERE id=?", Id.parse(matterId)),
      "Matter not found.",
    );
    return (
      one<ClientLink>(
        this.db,
        "SELECT client_id AS clientId,revision_id AS revisionId FROM matter_clients WHERE matter_id=?",
        matterId,
      ) ?? { clientId: null, revisionId: null }
    );
  }
  assign(matterId: string, raw: z.input<typeof ClientAssignment>): ClientLink {
    const input = ClientAssignment.parse(raw);
    return this.db
      .transaction(() => {
        const current = this.link(matterId);
        if (current.revisionId !== input.expectedRevisionId)
          throw new WorkspaceConflictError(
            "This matter’s client changed. Reopen before editing.",
          );
        if (input.clientId) this.get(input.clientId);
        if (current.clientId === input.clientId) return current;
        if (
          one(
            this.db,
            `SELECT 1 FROM conversation_turns t JOIN conversation_clients cc ON cc.conversation_id=t.conversation_id
        WHERE t.status='running' AND EXISTS (SELECT 1 FROM json_each(cc.matter_ids_json) WHERE value=?)`,
            matterId,
          )
        )
          throw new WorkspaceConflictError(
            "Wait for client-wide responses using this matter to finish before changing its client.",
          );
        this.db.run(
          `INSERT INTO matter_clients VALUES (?,?,?) ON CONFLICT(matter_id) DO UPDATE SET client_id=excluded.client_id,revision_id=excluded.revision_id`,
          [matterId, input.clientId, randomUUID()],
        );
        return this.link(matterId);
      })
      .immediate();
  }
  matters(id: string): { id: string; title: string; kind: string | null }[] {
    this.get(id);
    return all(
      this.db,
      `SELECT m.id,m.title,m.kind FROM matters m JOIN matter_clients mc ON mc.matter_id=m.id WHERE mc.client_id=? ORDER BY m.title COLLATE NOCASE,m.id`,
      id,
    );
  }
  context(id: string, rawIds: string[]): ClientContext {
    const ids = SelectedClientMatters.parse(rawIds),
      client = this.get(id);
    const available = new Map(this.matters(id).map((m) => [m.id, m.title]));
    if (ids.some((m) => !available.has(m)))
      throw new WorkspaceConflictError(
        "A selected matter no longer belongs to this client. Start a new chat with the current matter selection; earlier chats keep their original context.",
      );
    return {
      id,
      name: client.name,
      summary: client.summary,
      revisionId: client.revisionId,
      matters: ids.map((m) => ({ id: m, title: available.get(m)! })),
    };
  }
}
