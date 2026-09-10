import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { all, one, required } from './queries';
import { conversationState, VISIBLE_WORK } from './conversation-lifecycle';
import { WorkspaceConflictError } from './types';

const Ref = z.object({ kind: z.enum(['matter', 'conversation']), id: z.string().uuid() }).strict();
const Visit = Ref.extend({ at: z.iso.datetime() });
const Section = z.enum(['pinned', 'chats', 'matters']);
const unique = (values: Array<{ kind: string; id: string }>) => new Set(values.map(v => `${v.kind}:${v.id}`)).size === values.length;
export const NavigationState = z.object({
  version: z.literal(1),
  pins: z.array(Ref).max(24).refine(unique, 'Duplicate navigation pin.'),
  visits: z.array(Visit).max(128).refine(unique, 'Duplicate navigation visit.'),
  collapsed: z.object({ pinned: z.boolean(), chats: z.boolean(), matters: z.boolean() }).strict(),
}).strict();
export const NavigationChange = z.discriminatedUnion('action', [
  Ref.extend({ action: z.literal('visit') }),
  Ref.extend({ action: z.literal('pin'), pinned: z.boolean() }),
  z.object({ action: z.literal('collapse'), section: Section, collapsed: z.boolean() }).strict(),
]);
export type NavigationChange = z.infer<typeof NavigationChange>;
export interface NavigationItem { kind: 'matter' | 'conversation'; id: string; title: string; running?: boolean; lastStatus?: string | null }
export interface NavigationSnapshot {
  pinned: NavigationItem[];
  recentChats: NavigationItem[];
  recentMatters: NavigationItem[];
  collapsed: z.infer<typeof NavigationState>['collapsed'];
}
const KEY = 'workspace-navigation';
const activeChat = "coalesce((SELECT state FROM conversation_lifecycle cl WHERE cl.conversation_id=c.id),'active')='active'";
const chatFields = `c.id,c.title,
  EXISTS(SELECT 1 FROM conversation_turns t WHERE t.conversation_id=c.id AND t.status='running') AS running,
  (SELECT status FROM conversation_turns t WHERE t.conversation_id=c.id ORDER BY t.rowid DESC LIMIT 1) AS lastStatus`;
const same = (a: { kind: string; id: string }, b: { kind: string; id: string }) => a.kind === b.kind && a.id === b.id;

/** User navigation only. No legal record, retrieval boundary, approval or model changes.
 * Atomic per-item commands merge across tabs; GET never marks a record visited.
 */
export class WorkspaceNavigation {
  constructor(private db: Database, private now: () => string) {}
  private state(): z.infer<typeof NavigationState> {
    const row = one<{ value: string }>(this.db, 'SELECT value_json AS value FROM workspace_settings WHERE key=?', KEY);
    return row ? NavigationState.parse(JSON.parse(row.value)) : { version: 1, pins: [], visits: [], collapsed: { pinned: false, chats: false, matters: false } };
  }
  snapshot(): NavigationSnapshot {
    return this.db.transaction(() => {
      const state = this.state();
      const pinned = state.pins.flatMap<NavigationItem>(ref => {
        if (ref.kind === 'matter') {
          const row = one<{ id: string; title: string }>(this.db, 'SELECT id,title FROM matters WHERE id=?', ref.id);
          return row ? [{ kind: 'matter' as const, ...row }] : [];
        }
        const row = one<{ id: string; title: string; running: number; lastStatus: string | null }>(this.db, `SELECT ${chatFields} FROM conversations c WHERE c.id=? AND ${activeChat}`, ref.id);
        return row ? [{ kind: 'conversation' as const, ...row, running: !!row.running }] : [];
      });
      // Full tables, not the bounded catalog: older pinned/visited matters stay reachable.
      const visits = JSON.stringify(state.visits);
      const chats = all<{ id: string; title: string; running: number; lastStatus: string | null }>(this.db, `
        SELECT ${chatFields} FROM conversations c WHERE ${activeChat}
        ORDER BY max(c.updated_at,coalesce((SELECT json_extract(v.value,'$.at') FROM json_each(?) v
          WHERE json_extract(v.value,'$.kind')='conversation' AND json_extract(v.value,'$.id')=c.id),'')) DESC,c.rowid DESC LIMIT 30`, visits);
      const matters = all<{ id: string; title: string; usedAt: string }>(this.db, `
        SELECT m.id,m.title,max(coalesce((SELECT json_extract(v.value,'$.at') FROM json_each(?) v
          WHERE json_extract(v.value,'$.kind')='matter' AND json_extract(v.value,'$.id')=m.id),''),
          coalesce((SELECT max(w.recorded_at) FROM work_records w WHERE w.matter_id=m.id AND ${VISIBLE_WORK}),'')) AS usedAt
        FROM matters m WHERE usedAt<>'' ORDER BY usedAt DESC,m.rowid DESC LIMIT 28`, visits);
      return { pinned,
        recentChats: chats.map(row => ({ ...row, kind: 'conversation' as const, running: !!row.running })).filter(ref => !pinned.some(p => same(p, ref))).slice(0, 6),
        recentMatters: matters.map(({ usedAt: _, ...row }) => ({ ...row, kind: 'matter' as const })).filter(ref => !pinned.some(p => same(p, ref))).slice(0, 4),
        collapsed: state.collapsed };
    })();
  }
  change(raw: unknown): NavigationSnapshot {
    const input = NavigationChange.parse(raw);
    this.db.transaction(() => {
      const state = this.state();
      if (input.action === 'collapse') state.collapsed[input.section] = input.collapsed;
      else {
        const record = required(one<{ matterId: string | null }>(this.db, input.kind === 'matter'
          ? 'SELECT NULL AS matterId FROM matters WHERE id=?' : 'SELECT matter_id AS matterId FROM conversations WHERE id=?', input.id), input.kind);
        const ref = { kind: input.kind, id: input.id };
        const active = input.kind === 'matter' || conversationState(this.db, input.id) === 'active';
        if (input.action === 'pin') {
          if (input.pinned && !active) throw new WorkspaceConflictError('Restore this chat before pinning it.');
          if (input.pinned && !state.pins.some(p => same(p, ref))) {
            if (state.pins.length >= 24) throw new WorkspaceConflictError('Keep up to 24 pins. Unpin an item to add another.');
            state.pins.push(ref);
          } else if (!input.pinned) state.pins = state.pins.filter(p => !same(p, ref));
        } else if (active) {
          const visit = (target: typeof ref) => {
            state.visits = [{ ...target, at: this.now() }, ...state.visits.filter(v => !same(v, target))].slice(0, 128);
          };
          visit(ref);
          // Opening a single-matter chat is genuine use of that matter. Do not
          // imply that opening a cross-matter chat visits every selected matter.
          if (input.kind === 'conversation' && record.matterId) visit({ kind: 'matter', id: record.matterId });
        }
      }
      this.db.run('INSERT INTO workspace_settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json', [KEY, JSON.stringify(NavigationState.parse(state))]);
    }).immediate();
    return this.snapshot();
  }
}

/** Called by backup verification, not by model tools. Navigation contains IDs,
 * timestamps and display preferences only; it cannot carry credentials or content. */
export function validateNavigation(db: Database, value: unknown): void {
  const state = NavigationState.parse(value);
  for (const ref of [...state.pins, ...state.visits]) {
    const found = db.query(ref.kind === 'matter' ? 'SELECT id FROM matters WHERE id=?' : 'SELECT id FROM conversations WHERE id=?').get(ref.id);
    if (!found) throw new Error('Navigation refers to a missing workspace record.');
  }
}
