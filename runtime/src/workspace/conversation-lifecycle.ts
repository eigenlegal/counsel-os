import { createHash } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { all, one, required } from './queries';
import { WorkspaceConflictError } from './types';
import { ACTIVE_WORK } from './record-lifecycle';

export const ConversationState = z.enum(['active', 'archived', 'trashed']);
export type ConversationState = z.infer<typeof ConversationState>;
export const ConversationChange = z.object({
  expectedVersion: z.string().length(64),
  action: z.enum(['rename', 'archive', 'trash', 'restore']),
  title: z.string().trim().min(1).max(300).optional(),
}).strict().refine(v => (v.action === 'rename') === (v.title !== undefined), 'Only renaming needs a title.');

/** SQL fragments always use the application-owned work_records alias w. */
export const SAVED_WORK = `(w.disposition = 'decision'
  OR EXISTS (SELECT 1 FROM work_outputs o WHERE o.work_id = w.id)
  OR EXISTS (SELECT 1 FROM work_exports x WHERE x.work_id = w.id))`;
export const TRASHED_WORK = `EXISTS (SELECT 1 FROM conversation_turns ct
  JOIN conversation_lifecycle cl ON cl.conversation_id = ct.conversation_id
  WHERE ct.work_id = w.id AND cl.state = 'trashed')`;
export const VISIBLE_WORK = `(${ACTIVE_WORK} AND (NOT ${TRASHED_WORK} OR ${SAVED_WORK}))`;

export interface ConversationImpact {
  id: string;
  title: string;
  state: ConversationState;
  running: boolean;
  version: string;
  messageCount: number;
  retained: Array<{ kind: 'work' | 'source' | 'knowledge' | 'matter'; id: string; title: string }>;
}

export function conversationState(db: Database, id: string): ConversationState {
  // Known older backup schemas are inspected without migrating them.
  if ((db.query('PRAGMA user_version').get() as { user_version: number }).user_version < 9) return 'active';
  return one<{ state: ConversationState }>(db, 'SELECT state FROM conversation_lifecycle WHERE conversation_id=?', id)?.state ?? 'active';
}

export function conversationImpact(db: Database, id: string): ConversationImpact {
  z.string().uuid().parse(id);
  const chat = required(one<{ title: string; updatedAt: string }>(db,
    'SELECT title, updated_at AS updatedAt FROM conversations WHERE id=?', id), 'conversation');
  const turns = all<{ id: string; status: string; state: string; attachments: string; workId: string | null }>(db,
    'SELECT id, status, state_json AS state, attachments_json AS attachments, work_id AS workId FROM conversation_turns WHERE conversation_id=? ORDER BY rowid', id);
  const retained = new Map<string, ConversationImpact['retained'][number]>();
  const add = (item: ConversationImpact['retained'][number]) => retained.set(`${item.kind}:${item.id}`, item);
  for (const work of all<{ id: string; title: string }>(db, `SELECT w.id, coalesce(o.title,w.title) AS title
    FROM work_records w LEFT JOIN work_outputs o ON o.work_id=w.id
    WHERE ${SAVED_WORK} AND EXISTS (SELECT 1 FROM conversation_turns t WHERE t.work_id=w.id AND t.conversation_id=?)`, id)) add({ kind: 'work', ...work });
  for (const turn of turns) {
    for (const revision of JSON.parse(turn.attachments) as string[]) {
      const source = one<{ id: string; title: string }>(db, 'SELECT source_id AS id,title FROM source_revisions WHERE id=?', revision);
      if (source) add({ kind: 'source', ...source });
    }
    const state = JSON.parse(turn.state);
    for (const itemId of state.proposalIds ?? []) {
      const item = one<{ id: string; title: string }>(db, 'SELECT knowledge_id AS id,title FROM knowledge_revisions WHERE knowledge_id=? ORDER BY revision_no DESC LIMIT 1', itemId);
      if (item) add({ kind: 'knowledge', ...item });
    }
    if (state.briefProposal?.appliedRevisionId) {
      const matter = one<{ id: string; title: string }>(db, 'SELECT id,title FROM matters WHERE id=?', state.briefProposal.matterId);
      if (matter) add({ kind: 'matter', ...matter });
    }
  }
  const state = conversationState(db, id);
  return { id, title: chat.title, state, running: turns.some(t => t.status === 'running'), messageCount: turns.length,
    retained: [...retained.values()],
    version: createHash('sha256').update(JSON.stringify([chat, state, turns, [...retained.values()]])).digest('hex') };
}

export function changeConversation(db: Database, id: string, raw: z.input<typeof ConversationChange>, now: () => string): ConversationImpact {
  const input = ConversationChange.parse(raw);
  return db.transaction(() => {
    const before = conversationImpact(db, id);
    if (before.running) throw new WorkspaceConflictError('Stop this response or wait for it to finish before managing this conversation.');
    if (before.version !== input.expectedVersion) throw new WorkspaceConflictError('This conversation or its saved items changed. Reopen the action to review it again.');
    if (input.action === 'rename') {
      if (before.state === 'trashed') throw new WorkspaceConflictError('Restore this conversation before renaming it.');
      db.run('UPDATE conversations SET title=?, updated_at=? WHERE id=?', [input.title!, now(), id]);
    } else {
      const state = { archive: 'archived', trash: 'trashed', restore: 'active' }[input.action];
      if (before.state === 'trashed' && input.action === 'archive') throw new WorkspaceConflictError('Restore this conversation first.');
      db.run(`INSERT INTO conversation_lifecycle VALUES (?,?,?) ON CONFLICT(conversation_id)
        DO UPDATE SET state=excluded.state, changed_at=excluded.changed_at`, [id, state, now()]);
      // Remove prompt text from the searchable copies of retained outputs. Original
      // records remain intact for restore; unsaved copies are excluded by VISIBLE_WORK.
      db.run(`UPDATE search_entries SET body = (SELECT CASE WHEN ? = 'trashed' THEN w.answer
        ELSE w.request || char(10) || w.answer END FROM work_records w WHERE w.id=search_entries.work_id),
        title = (SELECT coalesce(o.title, CASE WHEN ? = 'trashed' THEN 'Saved work' ELSE w.title END)
          FROM work_records w LEFT JOIN work_outputs o ON o.work_id=w.id WHERE w.id=search_entries.work_id)
        WHERE work_id IN (SELECT work_id FROM conversation_turns WHERE conversation_id=?)`, [state, state, id]);
    }
    return conversationImpact(db, id);
  }).immediate();
}
