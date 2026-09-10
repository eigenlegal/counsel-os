import { randomUUID } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import { ChatDraft, DraftKey, DraftWrite, type SavedDraft, type DraftSummary } from './draft-types';
import { WorkspaceConflictError } from './types';

/** Local recovery only. No model tool, search entry, or practice-setting mutation. */
export class WorkspaceDrafts {
  constructor(private db: Database, private now: () => string) {}
  get(key: string): SavedDraft {
    DraftKey.parse(key);
    const row = this.db.query('SELECT revision_id AS revisionId, write_id AS writeId, value_json AS value, updated_at AS updatedAt FROM workspace_drafts WHERE key=?')
      .get(key) as { revisionId: string; writeId: string; value: string | null; updatedAt: string } | null;
    return row ? { key, ...row, value: row.value === null ? null : JSON.parse(row.value) } : { key, revisionId: null, writeId: null, value: null, updatedAt: null };
  }
  list(): DraftSummary[] {
    return (this.db.query('SELECT key FROM workspace_drafts WHERE value_json IS NOT NULL ORDER BY updated_at DESC, key LIMIT 1000').all() as {key: string}[])
      .map(({key}) => this.get(key)).map(row => ({ key: row.key, revisionId: row.revisionId!, updatedAt: row.updatedAt!,
        title: row.key === 'working-preferences' ? 'Unsaved working preferences' : (row.value as ChatDraft).message.trim().slice(0, 120) || 'Documents ready for a new chat' }));
  }
  save(raw: unknown): SavedDraft {
    const input = DraftWrite.parse(raw);
    if (Buffer.byteLength(JSON.stringify(input)) > 160_000) throw new WorkspaceConflictError('This draft is too large to recover automatically. Shorten it before closing.');
    return this.db.transaction(() => {
      const previous = this.get(input.key);
      // Retrying an acknowledged-or-lost response is harmless, not a second edit.
      if (previous.writeId === input.writeId) return previous;
      if (previous.revisionId !== input.expectedRevisionId)
        throw new WorkspaceConflictError('This draft changed in another window. Your text is still here. Copy it before loading the saved draft.');
      let value = input.value;
      if (value && input.key.startsWith('chat:')) {
        const chat = ChatDraft.parse(value);
        // A late autosave must not resurrect a message after successful submission.
        if (this.db.query('SELECT 1 FROM conversation_turns WHERE client_id=?').get(chat.clientId)
          || (!chat.message && !chat.attachments.length)) value = null;
      }
      if (value && !previous.value && (this.db.query('SELECT count(*) AS n FROM workspace_drafts WHERE value_json IS NOT NULL').get() as {n: number}).n >= 1000)
        throw new WorkspaceConflictError('There are 1,000 recovered drafts. Discard an unused draft in Chats before saving another.');
      this.db.run('INSERT INTO workspace_drafts VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET revision_id=excluded.revision_id, write_id=excluded.write_id, value_json=excluded.value_json, updated_at=excluded.updated_at',
        [input.key, randomUUID(), input.writeId, value === null ? null : JSON.stringify(value), this.now()]);
      return this.get(input.key);
    }).immediate();
  }
  consumeChat(clientId: string) {
    // Called inside begin-turn's transaction: accepted requests and draft removal
    // commit together, even when the window never receives the HTTP response.
    this.db.run(`UPDATE workspace_drafts SET value_json=NULL, revision_id=?, updated_at=?
      WHERE key LIKE 'chat:%' AND json_extract(value_json,'$.clientId')=?`, [randomUUID(), this.now(), clientId]);
  }
}
