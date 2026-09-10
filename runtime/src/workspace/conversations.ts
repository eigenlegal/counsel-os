import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { z } from "zod";
import { WorkspaceDrafts } from './drafts';
import type { WorkspaceProfile } from "./profile";
import type { WorkOutput } from "./organization";
import { conversationState, conversationImpact, changeConversation, ConversationChange, type ConversationState } from './conversation-lifecycle';
import { requireActiveRecord } from './record-lifecycle';
import type { BriefProposal } from "./brief-proposals";
import type { PracticeTemplate } from "./templates";
import type { DiscoveryContext } from './record-discovery';
import type { GuideDescriptor, PracticeGuide } from './practice-guides';
import { WorkspaceClients, SelectedClientMatters, type ClientContext } from './clients';
import {
  ModelChoice,
  ModelPreference,
  ModelPreferenceInput,
} from "./model-choice";
import {
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  type EvidenceInput,
} from "./types";

const Id = z.string().uuid();
export const ConversationInput = z
  .object({
    title: z.string().trim().min(1).max(300).default("New conversation"),
    matterId: Id.nullable().default(null),
    clientId: Id.optional(),
    matterIds: SelectedClientMatters.optional(),
    scope: z
      .enum(["conversation", "matter", "workspace", "client", "matters"])
      .default("conversation"),
  })
  .strict()
  .refine(
    (v) => (v.scope === "matter") === (v.matterId !== null),
    "Choose a matter for matter-scoped conversations.",
  ).refine(v => v.scope === 'client' ? !!v.clientId && !!v.matterIds
    : v.scope === 'matters' ? v.clientId === undefined && !!v.matterIds
    : v.clientId === undefined && v.matterIds === undefined,
    'Select matters explicitly. A client is required only for client context.');
export const SendInput = z
  .object({
    clientId: Id,
    message: z.string().trim().min(1).max(30_000),
    attachments: z.array(Id).max(12).default([]),
    modelChoice: ModelChoice.optional(),
  })
  .strict();
export type ConversationScope = z.infer<typeof ConversationInput>["scope"];
export interface Conversation {
  lifecycle?: ConversationState;
  id: string;
  title: string;
  matterId: string | null;
  scope: ConversationScope;
  createdAt: string;
  updatedAt: string;
  clientContext?: ClientContext;
  selectedMatters?: Array<{ id: string; title: string }>;
}
export interface ConversationSummary extends Conversation {
  running: boolean;
  turnCount: number;
  lastStatus: Turn["status"] | null;
}
export interface ContextRecord {
  kind: "source" | "knowledge" | "work";
  id: string;
  title: string;
  category: string;
  version: number | null;
  status: string;
  newerVersionAvailable?: boolean;
  hasNewerCitedSources?: boolean;
  ranges: { start: number; end: number }[];
}
export interface ChatCitation extends EvidenceInput {
  key: string;
  title: string;
  category: string;
  version: number | null;
}
export interface Activity {
  id: string;
  name: string;
  label: string;
  status: "running" | "complete" | "failed";
  input: unknown;
  output?: unknown;
}
export interface TurnState {
  entityRegistry?: import('./entities').EntityRegistry | null;
  entitiesRead?: string[];
  signatoryChecks?: import('./entities').SignatoryCheck[];
  workingPreferences?: import('./working-preferences').PreferenceSnapshot | null;
  preferenceProposal?: import('./preference-proposals').PreferenceProposal;
  redline?: import('./redlines').RedlineReceipt;
  documentRound?: import('./document-rounds').DocumentRoundReport;
  authorityLookups?: import('./authority-types').AuthorityReceipt[];
  /** Pins the proposed version, so an old chat cannot approve a newer unseen edit. */
  proposalRevisions?: Record<string, string>;
  practiceUpdateConflicts?: Array<{ id: string; title: string }>;
  /** Exact reusable library versions made available for this response. Names alone are not reads. */
  contextLibrary?: import('./context-library').ContextLibrary;
  preparedContext?: {
    records: Array<{ kind: ContextRecord['kind']; id: string }>; note: string;
    retrieval?: { method: 'scoped-full-text-v1' | 'scoped-evidence-v2' | 'scoped-query-fusion-v3'; requestTerms: string[]; supplementalTerms: string[]; limited: boolean; characters: number;
      plan?: import('./recall-plan').RecallPlan;
      evidenceReads?: Array<{ kind: ContextRecord['kind']; id: string; from: { kind: ContextRecord['kind']; id: string }; relation: 'cited-version' | 'newer-version' }>;
      unavailableLinks?: number; omittedLinks?: number; selectedMatters?: number; matterNotesRead?: number };
  };
  guideCatalog?: GuideDescriptor[];
  guidesRead?: PracticeGuide[];
  /** Metadata supplied to discover records, not evidence of a content read. */
  discoveryContext?: DiscoveryContext;
  /** Explicit request identity; omitted on earlier turns and legacy clients. */
  requestedModelChoice?: ModelChoice;
  templateContext?: PracticeTemplate[];
  briefProposal?: BriefProposal;
  scopeContext?: { scope: ConversationScope; matterId: string | null; clientContext?: ClientContext; selectedMatters?: Array<{ id: string; title: string }> };
  output?: WorkOutput | null;
  /** Undefined only on pre-profile turns. Snapshot, never a live profile lookup. */
  profileContext?: WorkspaceProfile | null;
  profileStatus?: "included" | "disabled" | "not-set";
  answer: string;
  model: string;
  activity: Activity[];
  context: ContextRecord[];
  citations: ChatCitation[];
  proposalIds: string[];
  error: string | null;
  historyTurns: number;
  omittedHistoryTurns: number;
  matterContext?: {
    id: string;
    title: string;
    summary: string;
    truncated: boolean;
    briefRevisionId?: string;
    status?: string;
    questions?: string;
    nextActions?: string;
  } | null;
}
export interface Turn {
  id: string;
  conversationId: string;
  clientId: string;
  request: string;
  attachments: string[];
  status: "running" | "complete" | "failed" | "cancelled" | "interrupted";
  createdAt: string;
  finishedAt: string | null;
  workId: string | null;
  state: TurnState;
}
interface TurnRow extends Omit<Turn, "attachments" | "state"> {
  attachmentsJson: string;
  stateJson: string;
}
const TURN = `SELECT id, conversation_id AS conversationId, client_id AS clientId, request,
  attachments_json AS attachmentsJson, state_json AS stateJson, status, created_at AS createdAt,
  finished_at AS finishedAt, work_id AS workId FROM conversation_turns`;
const CONVERSATION = `SELECT id, title, matter_id AS matterId, scope, created_at AS createdAt, updated_at AS updatedAt FROM conversations`;
function decode(row: TurnRow): Turn {
  const { attachmentsJson, stateJson, ...rest } = row;
  return {
    ...rest,
    attachments: JSON.parse(attachmentsJson),
    state: JSON.parse(stateJson),
  };
}

/** Shares the workspace transaction/connection. No global 'current chat'. */
export class ConversationStore {
  constructor(
    private db: Database,
    private now: () => string,
  ) {}
  create(raw: z.input<typeof ConversationInput>): Conversation {
    const value = ConversationInput.parse(raw);
    return this.db.transaction(() => {
    if (
      value.matterId &&
      !this.db.query("SELECT id FROM matters WHERE id = ?").get(value.matterId)
    )
      throw new WorkspaceNotFoundError("Matter not found.");
    const id = randomUUID();
    const now = this.now();
    this.db.run("INSERT INTO conversations VALUES (?, ?, ?, ?, ?, ?)", [
      id,
      value.title,
      value.matterId,
      value.scope === 'client' || value.scope === 'matters' ? 'conversation' : value.scope,
      now,
      now,
    ]);
    if (value.scope === 'client') {
      new WorkspaceClients(this.db, this.now).context(value.clientId!, value.matterIds!);
      this.db.run('INSERT INTO conversation_clients VALUES (?,?,?)', [id,value.clientId!,JSON.stringify(value.matterIds)]);
    }
    if (value.scope === 'matters') {
      value.matterIds!.forEach((matterId, ordinal) => {
        if (!this.db.query('SELECT id FROM matters WHERE id=?').get(matterId))
          throw new WorkspaceNotFoundError('Selected matter not found.');
        this.db.run('INSERT INTO conversation_matters VALUES (?,?,?)', [id, matterId, ordinal]);
      });
    }
    return this.get(id);
    }).immediate();
  }
  get(id: string): Conversation {
    const row = this.db
      .query(`${CONVERSATION} WHERE id = ?`)
      .get(Id.parse(id)) as Conversation | null;
    if (!row) throw new WorkspaceNotFoundError("Conversation not found.");
    return this.withScope(row);
  }
  private withScope<T extends Conversation>(row: T): T {
    row = { ...row, lifecycle: conversationState(this.db, row.id) };
    const selectedMatters = this.db.query(`SELECT m.id,m.title FROM conversation_matters cm
      JOIN matters m ON m.id=cm.matter_id WHERE cm.conversation_id=? ORDER BY cm.ordinal`).all(row.id) as Array<{ id: string; title: string }>;
    if (selectedMatters.length) return { ...row, scope: 'matters', selectedMatters };
    const selection = this.db.query('SELECT client_id AS clientId,matter_ids_json AS matterIds FROM conversation_clients WHERE conversation_id=?')
      .get(row.id) as { clientId: string; matterIds: string } | null;
    if (!selection) return row;
    const client = new WorkspaceClients(this.db, this.now).get(selection.clientId);
    const ids = SelectedClientMatters.parse(JSON.parse(selection.matterIds));
    // Historical chats stay readable after reassignment. begin() blocks new sends.
    const matters = ids.map(id => ({ id, title: (this.db.query('SELECT title FROM matters WHERE id=?').get(id) as { title: string } | null)?.title ?? 'Unavailable matter' }));
    return { ...row, scope: 'client', clientContext: { id: client.id, name: client.name, summary: client.summary, revisionId: client.revisionId, matters } };
  }
  modelPreference(id: string): ModelPreference {
    this.get(id);
    const row = this.db
      .query("SELECT value_json AS value FROM workspace_settings WHERE key = ?")
      .get(`conversation-model:${id}`) as { value: string } | null;
    return row
      ? ModelPreference.parse(JSON.parse(row.value))
      : { revisionId: null, choice: null };
  }
  saveModelPreference(
    id: string,
    raw: z.input<typeof ModelPreferenceInput>,
  ): ModelPreference {
    const input = ModelPreferenceInput.parse(raw);
    return this.db
      .transaction(() => {
        const previous = this.modelPreference(id);
        // An identical retry is harmless, including after a lost HTTP response.
        if (JSON.stringify(previous.choice) === JSON.stringify(input.choice))
          return previous;
        if (previous.revisionId !== input.expectedRevisionId)
          throw new WorkspaceConflictError(
            "This chat’s model choice changed in another window. Reopen the model picker to see the saved choice.",
          );
        const next: ModelPreference = {
          revisionId: randomUUID(),
          choice: input.choice,
        };
        this.db.run(
          "INSERT INTO workspace_settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
          [`conversation-model:${id}`, JSON.stringify(next)],
        );
        return next;
      })
      .immediate();
  }
  impact(id: string) { return conversationImpact(this.db, id); }
  change(id: string, input: z.input<typeof ConversationChange>) { return changeConversation(this.db, id, input, this.now); }
  list(matterId?: string, clientId?: string, state: ConversationState = 'active'): ConversationSummary[] {
    return (
      this.db
        .query(
          `SELECT c.id, c.title, c.matter_id AS matterId, c.scope, c.created_at AS createdAt, c.updated_at AS updatedAt,
      EXISTS(SELECT 1 FROM conversation_turns t WHERE t.conversation_id = c.id AND t.status = 'running') AS running,
      (SELECT count(*) FROM conversation_turns t WHERE t.conversation_id = c.id) AS turnCount,
      (SELECT status FROM conversation_turns t WHERE t.conversation_id = c.id ORDER BY t.rowid DESC LIMIT 1) AS lastStatus
      FROM conversations c WHERE coalesce((SELECT state FROM conversation_lifecycle cl WHERE cl.conversation_id=c.id),'active') = ?
      ${matterId ? `AND (c.matter_id = ? OR EXISTS (SELECT 1 FROM conversation_matters cm WHERE cm.conversation_id=c.id AND cm.matter_id=?)
        OR EXISTS (SELECT 1 FROM conversation_clients cc,json_each(cc.matter_ids_json) j WHERE cc.conversation_id=c.id AND j.value=?))`
        : clientId ? 'AND EXISTS (SELECT 1 FROM conversation_clients cc WHERE cc.conversation_id=c.id AND cc.client_id=?)' : ""} ORDER BY c.updated_at DESC, c.rowid DESC LIMIT 200`,
        )
        .all(state, ...(matterId ? [Id.parse(matterId), matterId, matterId] : clientId ? [Id.parse(clientId)] : [])) as Array<
        Omit<ConversationSummary, "running"> & { running: number }
      >
    ).map((row) => this.withScope({ ...row, running: !!row.running }));
  }
  turns(id: string): Turn[] {
    this.get(id);
    return (
      this.db
        .query(`${TURN} WHERE conversation_id = ? ORDER BY rowid`)
        .all(id) as TurnRow[]
    ).map(decode);
  }
  turn(id: string): Turn {
    const row = this.db
      .query(`${TURN} WHERE id = ?`)
      .get(Id.parse(id)) as TurnRow | null;
    if (!row) throw new WorkspaceNotFoundError("Message not found.");
    return decode(row);
  }
  /** Retried submissions resolve to the same turn, including after a disconnect. */
  begin(
    conversationId: string,
    raw: z.input<typeof SendInput>,
    model: string,
    profile: WorkspaceProfile | null = null,
  ): { turn: Turn; created: boolean } {
    const input = SendInput.parse(raw);
    return this.db
      .transaction(() => {
        const conversation = this.get(conversationId);
        if (conversation.lifecycle !== 'active') throw new WorkspaceConflictError('Restore this conversation before sending another message.');
        const previous = this.db
          .query(`${TURN} WHERE conversation_id = ? AND client_id = ?`)
          .get(conversationId, input.clientId) as TurnRow | null;
        if (previous) {
          const turn = decode(previous);
          if (
            turn.request !== input.message ||
            JSON.stringify(turn.state.requestedModelChoice) !==
              JSON.stringify(input.modelChoice) ||
            JSON.stringify(turn.attachments) !==
              JSON.stringify(input.attachments)
          )
            throw new WorkspaceConflictError(
              "This send identifier was already used for another message.",
            );
          return { turn, created: false };
        }
        const clientContext = conversation.clientContext
          ? new WorkspaceClients(this.db, this.now).context(conversation.clientContext.id, conversation.clientContext.matters.map(m => m.id))
          : undefined;
        if (
          this.db
            .query(
              "SELECT id FROM conversation_turns WHERE conversation_id = ? AND status = 'running'",
            )
            .get(conversationId)
        )
          throw new WorkspaceConflictError(
            "This conversation is still working. Start another chat or stop this response first.",
          );
        for (const id of input.attachments) {
          const source = this.db.query('SELECT source_id AS sourceId FROM source_revisions WHERE id=?').get(id) as { sourceId: string } | null;
          if (source) requireActiveRecord(this.db, 'source', source.sourceId);
          if (
            !this.db
              .query("SELECT id FROM source_revisions WHERE id = ?")
              .get(id)
          )
            throw new WorkspaceNotFoundError("Attached version not found.");
        }
        const id = randomUUID();
        const now = this.now();
        const state: TurnState = {
          ...(input.modelChoice
            ? { requestedModelChoice: input.modelChoice }
            : {}),
          scopeContext: {
            scope: conversation.scope,
            matterId: conversation.matterId,
            ...(clientContext ? { clientContext } : {}),
            ...(conversation.selectedMatters ? { selectedMatters: conversation.selectedMatters } : {}),
          },
          profileContext: profile?.applyToChats ? profile : null,
          profileStatus: profile
            ? profile.applyToChats
              ? "included"
              : "disabled"
            : "not-set",
          answer: "",
          model,
          activity: [],
          context: [],
          citations: [],
          proposalIds: [],
          error: null,
          historyTurns: 0,
          omittedHistoryTurns: 0,
        };
        this.db.run(
          `INSERT INTO conversation_turns (id, conversation_id, client_id, request, attachments_json, state_json, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'running', ?)`,
          [
            id,
            conversationId,
            input.clientId,
            input.message,
            JSON.stringify(input.attachments),
            JSON.stringify(state),
            now,
          ],
        );
        this.db.run(
          "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
          [
            conversation.title === "New conversation"
              ? input.message.slice(0, 100)
              : conversation.title,
            now,
            conversationId,
          ],
        );
        new WorkspaceDrafts(this.db, this.now).consumeChat(input.clientId);
        return { turn: this.turn(id), created: true };
      })
      .immediate();
  }
  save(turn: Turn): void {
    const changed = this.db.run(
      `UPDATE conversation_turns SET state_json = ?, status = ?, finished_at = ?, work_id = ?
      WHERE id = ? AND status = 'running'`,
      [
        JSON.stringify(turn.state),
        turn.status,
        turn.finishedAt,
        turn.workId,
        turn.id,
      ],
    );
    if (changed.changes !== 1)
      throw new WorkspaceConflictError("This response is no longer running.");
    if (turn.status !== "running")
      this.db.run("UPDATE conversations SET updated_at = ? WHERE id = ?", [
        this.now(),
        turn.conversationId,
      ]);
  }
  atomic<T>(action: () => T): T {
    return this.db.transaction(action).immediate();
  }
  /** Change only review metadata on a completed response, never its saved answer or context. */
  recordBriefReview(
    id: string,
    receipt: Pick<
      BriefProposal,
      "id" | "review" | "reviewedAt" | "appliedRevisionId"
    >,
  ): void {
    z.enum(["applied", "dismissed"]).parse(receipt.review);
    z.string().datetime().parse(receipt.reviewedAt);
    if (receipt.review === "applied") Id.parse(receipt.appliedRevisionId);
    else if (receipt.appliedRevisionId !== null)
      throw new WorkspaceConflictError(
        "A dismissed proposal cannot name an applied revision.",
      );
    const changed = this.db.run(
      `UPDATE conversation_turns SET state_json = json_set(state_json,
      '$.briefProposal.review', ?, '$.briefProposal.reviewedAt', ?, '$.briefProposal.appliedRevisionId', ?)
      WHERE id = ? AND status = 'complete' AND json_extract(state_json, '$.briefProposal.id') = ?
      AND json_extract(state_json, '$.briefProposal.review') = 'pending'`,
      [
        receipt.review,
        receipt.reviewedAt,
        receipt.appliedRevisionId,
        Id.parse(id),
        Id.parse(receipt.id),
      ],
    );
    if (changed.changes !== 1)
      throw new WorkspaceConflictError(
        "This matter suggestion has already changed.",
      );
  }

  /** Only called after the launcher has acquired exclusive workspace ownership. */
  recover(): void {
    for (const row of this.db
      .query(`${TURN} WHERE status = 'running'`)
      .all() as TurnRow[]) {
      const turn = decode(row);
      turn.status = "interrupted";
      turn.finishedAt = this.now();
      turn.state.error =
        "The workspace stopped before this response finished. Partial text is retained; no completed work or knowledge was saved.";
      for (const activity of turn.state.activity)
        if (activity.status === "running") activity.status = "failed";
      this.save(turn);
    }
  }
}
