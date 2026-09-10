import { createHash, randomUUID } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { ImportEntryIds, type ImportReceipt } from './import-types';
import type { WorkspaceStore } from './store';
import { WorkspaceConflictError } from './types';
import { all, required, one } from './queries';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const DuplicateSkip = z.object({ expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), entryIds: ImportEntryIds }).strict();
export const ImportUndo = DuplicateSkip.extend({ requestId: z.string().uuid() }).strict();
export interface ImportDuplicates {
  expectedVersion: string; revisionId: string;
  items: Array<{ entryId: string; path: string; sourceId: string; revisionId: string; title: string; version: number; matchingSources: number }>;
}
export interface ImportUndoPreview {
  expectedVersion: string;
  undone: ImportReceipt['undo'] | null;
  items: Array<{ entryId: string; sourceId: string; title: string; canUndo: boolean; reasons: string[]; practiceId?: string; templateId?: string }>;
  retainedMatterIds: string[];
  profileRetained: boolean;
}
function batch(db: Database, id: string) {
  z.string().uuid().parse(id);
  return required(one<{ status: string; revisionId: string; receiptJson: string | null }>(db,
    'SELECT status, revision_id AS revisionId, receipt_json AS receiptJson FROM import_batches WHERE id=?', id), 'import');
}

/** Exact ORIGINAL bytes, not filename or similar prose. Only active latest
 * originals count; an earlier version of a changed document is not a duplicate. */
export function importDuplicates(db: Database, id: string): ImportDuplicates {
  const current = batch(db, id);
  if (current.status !== 'review') throw new WorkspaceConflictError('Only a staged import can be checked for duplicates.');
  const rows = all<ImportDuplicates['items'][number]>(db, `WITH matches AS (
    SELECT e.id AS entryId,e.path,sr.source_id AS sourceId,sr.id AS revisionId,sr.title,sr.revision_no AS version,
      count(*) OVER (PARTITION BY e.id) AS matchingSources,
      row_number() OVER (PARTITION BY e.id ORDER BY sr.received_at,sr.id) AS selected
    FROM import_entries e JOIN source_originals o ON o.hash=e.content_hash AND o.byte_count=e.byte_count
    JOIN source_revisions sr ON sr.id=o.revision_id
    WHERE e.batch_id=? AND e.status='ready' AND json_extract(e.choice_json,'$.destination')!='skip'
      AND sr.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=sr.source_id)
      AND NOT EXISTS (SELECT 1 FROM source_lifecycle l WHERE l.source_id=sr.source_id AND l.state='trashed')
  ) SELECT entryId,path,sourceId,revisionId,title,version,matchingSources FROM matches WHERE selected=1 ORDER BY entryId`, id);
  return { items: rows, revisionId: current.revisionId, expectedVersion: digest([current.revisionId, rows]) };
}

/** Safe undo is deliberately narrower than deleting all imported records:
 * untouched originals and unadopted derived items only. Matters and identity
 * remain available. Every original and historical revision is recoverable. */
export function importUndoPreview(db: Database, store: WorkspaceStore, id: string): ImportUndoPreview {
  const current = batch(db, id);
  if (current.status !== 'committed' || !current.receiptJson) throw new WorkspaceConflictError('This import has not completed.');
  const receipt = JSON.parse(current.receiptJson) as ImportReceipt;
  // Read dependency inventories once, not once per imported file. This avoids
  // rescanning a 10,000-entry import receipt 10,000 times during a preview.
  const citedSources = new Set(all<{ id: string }>(db, `SELECT DISTINCT sr.source_id AS id FROM evidence e
    JOIN source_revisions sr ON sr.id=e.source_revision_id`).map(row => row.id));
  const supportedSources = new Set(all<{ id: string }>(db, `SELECT DISTINCT sr.source_id AS id FROM knowledge_evidence e
    JOIN source_revisions sr ON sr.id=e.source_revision_id`).map(row => row.id));
  const usedKnowledge = new Set(all<{ id: string }>(db, `SELECT knowledge_revision_id AS id FROM evidence WHERE knowledge_revision_id IS NOT NULL
    UNION SELECT knowledge_revision_id AS id FROM knowledge_evidence WHERE knowledge_revision_id IS NOT NULL`).map(row => row.id));
  const conversationSources = new Set<string>(), runningSources = new Set<string>(), usedTemplates = new Set<string>();
  const sourceIds = new Map(all<{ id: string; sourceId: string }>(db, 'SELECT id,source_id AS sourceId FROM source_revisions').map(row => [row.id, row.sourceId]));
  for (const turn of all<{ attachments: string; state: string; status: string }>(db,
    'SELECT attachments_json AS attachments,state_json AS state,status FROM conversation_turns')) {
    const state = JSON.parse(turn.state);
    const revisions = new Set<string>(JSON.parse(turn.attachments));
    for (const record of state.context ?? []) {
      if (record.kind === 'source') revisions.add(record.id);
      if (record.kind === 'knowledge') usedKnowledge.add(record.id);
    }
    for (const lookup of state.authorityLookups ?? []) revisions.add(lookup.revisionId);
    for (const document of state.documentRound?.documents ?? []) revisions.add(document.revisionId);
    if (state.redline?.sourceRevisionId) revisions.add(state.redline.sourceRevisionId);
    for (const template of state.templateContext ?? []) { usedTemplates.add(template.id); revisions.add(template.sourceRevisionId); }
    for (const revisionId of revisions) {
      const sourceId = sourceIds.get(revisionId);
      if (sourceId) { conversationSources.add(sourceId); if (turn.status === 'running') runningSources.add(sourceId); }
    }
  }
  const templatesBySource = new Map<string, string[]>();
  for (const template of store.templates.list()) {
    const sourceId = sourceIds.get(template.sourceRevisionId);
    if (sourceId) templatesBySource.set(sourceId, [...(templatesBySource.get(sourceId) ?? []), template.id]);
  }
  const choices = new Map(all<{ id: string; value: string }>(db, 'SELECT id,choice_json AS value FROM import_entries WHERE batch_id=?', id)
    .map(row => [row.id, JSON.parse(row.value)]));
  const versions: unknown[] = [];
  const items = receipt.items.map(item => {
    const source = store.getSource(item.sourceId);
    const reasons: string[] = [];
    const ownMatters = new Set(receipt.matterIds);
    const intended = choices.get(item.entryId);
    if (intended?.matterId) ownMatters.add(intended.matterId);
    for (const reference of intended?.linkedMatters ?? []) if (reference.matterId) ownMatters.add(reference.matterId);
    if (source.latest.id !== item.sourceRevisionId) reasons.push('The original has a newer saved version.');
    if (source.lifecycle === 'trashed') reasons.push('This original is already in Trash.');
    if (source.matterIds.some(matterId => !ownMatters.has(matterId))) reasons.push('The file was linked to another matter.');
    if (intended?.destination === 'profile') reasons.push('The profile and its source are managed separately.');
    if (runningSources.has(item.sourceId)) reasons.push('A response is currently using this file.');
    if (conversationSources.has(item.sourceId) || citedSources.has(item.sourceId) ||
      templatesBySource.get(item.sourceId)?.some(templateId => templateId !== item.templateId))
      reasons.push('This file is used by a chat, saved work, or another practice item.');
    // Supporting passages may be attached without the source appearing in a chat.
    if (supportedSources.has(item.sourceId))
      reasons.push('This file supports saved practice material.');
    const practice = item.practiceId ? store.getKnowledge(item.practiceId) : null;
    if (practice && (practice.latest.number !== 1 || practice.latest.status !== 'pending'))
      reasons.push('The practice item has been edited or reviewed.');
    if (practice && usedKnowledge.has(practice.latest.id))
      reasons.push('The practice item is used by saved work or a conversation.');
    const template = item.templateId ? store.templates.get(item.templateId) : null;
    if (template && template.number !== 1) reasons.push('The template has been edited since import.');
    if (template && usedTemplates.has(template.id))
      reasons.push('The template has been included in a conversation.');
    const initialPlacement = item.placementRevisionId;
    if (initialPlacement === undefined) reasons.push('This earlier import has no organization snapshot. Manage it individually.');
    if (initialPlacement !== undefined && (source.placement?.revisionId ?? null) !== initialPlacement)
      reasons.push('The file’s library location has changed.');
    versions.push([source.latest.id, source.lifecycle, source.matterIds, practice?.latest.id, template?.revisionId, source.placement?.revisionId]);
    return { entryId: item.entryId, sourceId: item.sourceId, title: source.latest.title, canUndo: !reasons.length && !receipt.undo,
      reasons, ...(item.practiceId ? { practiceId: item.practiceId } : {}), ...(item.templateId ? { templateId: item.templateId } : {}) };
  });
  return { expectedVersion: digest([current.revisionId, items, versions]), undone: receipt.undo ?? null, items,
    retainedMatterIds: receipt.matterIds, profileRetained: !!receipt.profileRevisionId };
}

export function undoImport(db: Database, store: WorkspaceStore, id: string, raw: z.input<typeof ImportUndo>, now: () => string): ImportUndoPreview {
  const input = ImportUndo.parse(raw);
  return db.transaction(() => {
    const current = batch(db, id), receipt = JSON.parse(current.receiptJson ?? 'null') as ImportReceipt | null;
    if (!receipt) throw new WorkspaceConflictError('This import has not completed.');
    if (receipt.undo) {
      if (receipt.undo.requestId !== input.requestId || digest(receipt.undo.entryIds) !== digest(input.entryIds))
        throw new WorkspaceConflictError('This import cleanup has already been applied. Manage any remaining items individually.');
      return importUndoPreview(db, store, id);
    }
    const preview = importUndoPreview(db, store, id);
    if (preview.expectedVersion !== input.expectedVersion) throw new WorkspaceConflictError('These imported items or their connections changed. Review the cleanup again.');
    const chosen = input.entryIds.map(entryId => preview.items.find(item => item.entryId === entryId));
    if (chosen.some(item => !item?.canUndo)) throw new WorkspaceConflictError('Select only unused, unchanged additions from this import.');
    for (const item of chosen) {
      if (item!.practiceId) {
        const practice = store.getKnowledge(item!.practiceId);
        // Explicit batch withdrawal, not an invented human approval/decision.
        store.reviseKnowledge(practice.id, practice.latest.id, { title: practice.latest.title, body: practice.latest.body,
          status: 'rejected', supportingEvidence: store.knowledgeEvidence(practice.latest.id) });
      }
      if (item!.templateId) {
        const template = store.templates.get(item!.templateId);
        store.templates.update(template.id, { baseRevisionId: template.revisionId, sourceRevisionId: template.sourceRevisionId,
          title: template.title, whenToUse: template.whenToUse, jurisdiction: template.jurisdiction, available: false, practiceWideUse: true });
      }
      // The full dependency inventory was checked in this same transaction.
      db.run(`INSERT INTO source_lifecycle VALUES (?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET state=excluded.state,revision_id=excluded.revision_id,changed_at=excluded.changed_at`,
        [item!.sourceId, 'trashed', randomUUID(), now()]);
    }
    receipt.undo = { requestId: input.requestId, entryIds: input.entryIds, completedAt: now(),
      sourceIds: chosen.map(item => item!.sourceId), practiceIds: chosen.flatMap(item => item!.practiceId ? [item!.practiceId] : []),
      templateIds: chosen.flatMap(item => item!.templateId ? [item!.templateId] : []) };
    db.run('UPDATE import_batches SET receipt_json=? WHERE id=?', [JSON.stringify(receipt), id]);
    return importUndoPreview(db, store, id);
  }).immediate();
}
