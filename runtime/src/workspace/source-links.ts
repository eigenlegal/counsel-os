import type { Database } from 'bun:sqlite';
import { z } from 'zod';
import { ImportChoice, ImportPath } from './import-types';
import { importLinkDigest, importLinkResolver, noteReferences, type LinkFile, type ResolvedImportLink } from './import-links';
import { all, one, required } from './queries';
import { COLLECTION_SQL } from './source-library';
import { WorkspaceConflictError } from './types';

export const SourceLinkQuery = z.object({ offset: z.coerce.number().int().min(0).max(10_000).default(0),
  view: z.enum(['all', 'sharing', 'unresolved']).default('all') }).strict();
export const SourceLinkApply = z.object({ expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
  linkIds: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(100).refine(ids => new Set(ids).size === ids.length),
  confirmAccessChanges: z.literal(true) }).strict();
type File = LinkFile & { namespace: string; revisionId: string; title: string; collection: string; placement: string | null;
  matters: Array<{ id: string; title: string }> };
export type SourceLinkItem = ResolvedImportLink & { targetTitle: string | null; targetRevisionId: string | null;
  matter: { id: string; title: string } | null; canShare: boolean; alreadyShared: boolean; note: string; crossImport: boolean };
export interface SourceLinkPreview {
  sourceId: string; title: string; path: string | null; expectedVersion: string; offset: number; total: number;
  matched: number; unresolved: number; shareable: number; truncated: boolean; items: SourceLinkItem[];
}
const LATEST = 'r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=s.id)';
const ACTIVE = "NOT EXISTS(SELECT 1 FROM source_lifecycle sl WHERE sl.source_id=s.id AND sl.state='trashed')";
const unresolved = (item: ResolvedImportLink) => item.status === 'missing' || item.status === 'ambiguous'
  || (item.status === 'outside' && !/^(?:https?:|mailto:|tel:)/i.test(item.href));

/** Saved provenance is a name, never permission to read a disk path or fetch a URL. */
export function sourceLinkPath(origin: string): { namespace: string; path: string } | null {
  const imported = /^import:([a-f0-9-]{36})\/(.+)$/i.exec(origin);
  const value = imported ? { namespace: imported[1]!, path: imported[2]! }
    : origin.startsWith('plugin:') ? { namespace: 'plugin', path: origin.slice(7) }
    : origin.startsWith('upload:') ? { namespace: 'uploads', path: origin.slice(7) } : null;
  return value && ImportPath.safeParse(value.path).success ? value : null;
}

/** One metadata inventory per upkeep pulse. Bodies are read only for the note being checked. */
export function sourceLinkInventory(db: Database) {
  const rows = all<{ id: string; revisionId: string; title: string; origin: string; collection: string; placement: string | null }>(db,
    `SELECT s.id,r.id AS revisionId,r.title,json_extract(r.provenance_json,'$.origin') AS origin,
    ${COLLECTION_SQL} AS collection,(SELECT revision_id FROM source_placements WHERE source_id=s.id) AS placement
    FROM sources s JOIN source_revisions r ON r.source_id=s.id AND ${LATEST} WHERE ${ACTIVE} ORDER BY s.id LIMIT 50001`);
  const truncated = rows.length > 50000;
  const matters = new Map<string, File['matters']>();
  for (const row of all<{ sourceId: string; id: string; title: string }>(db,
    'SELECT ms.source_id AS sourceId,m.id,m.title FROM matter_sources ms JOIN matters m ON m.id=ms.matter_id ORDER BY ms.source_id,m.id')) {
    const values = matters.get(row.sourceId) ?? []; values.push({ id: row.id, title: row.title }); matters.set(row.sourceId, values);
  }
  const files: File[] = rows.slice(0, 50000).flatMap(row => {
    const path = sourceLinkPath(row.origin); if (!path) return [];
    return [{ ...row, ...path, status: 'ready', choice: ImportChoice.parse({ title: row.title.slice(0, 200), destination: 'source' }), matters: matters.get(row.id) ?? [] }];
  });
  const byId = new Map(files.map(file => [file.id, file]));
  const resolve = importLinkResolver(files);
  const namespaces = new Map<string, ReturnType<typeof importLinkResolver>>();
  return { byId, truncated, resolve: (from: File, reference: Parameters<typeof resolve>[1]) => {
    if (!namespaces.has(from.namespace)) namespaces.set(from.namespace, importLinkResolver(files.filter(f => f.namespace === from.namespace)));
    const local = namespaces.get(from.namespace)!(from, reference);
    // Preserve same-import identity. Only an absent local target falls back to other retained files.
    return local.status === 'missing' ? resolve(from, reference) : local;
  } };
}
export type SourceLinkInventory = ReturnType<typeof sourceLinkInventory>;

export function sourceLinkReview(db: Database, sourceId: string, inventory = sourceLinkInventory(db)): SourceLinkPreview {
  z.string().uuid().parse(sourceId);
  const row = required(one<{ id: string; title: string; body: string; origin: string; bodyLength: number }>(db,
    `SELECT r.id,r.title,substr(COALESCE(r.body,''),1,500000) AS body,length(COALESCE(r.body,'')) AS bodyLength,
    json_extract(r.provenance_json,'$.origin') AS origin FROM sources s JOIN source_revisions r ON r.source_id=s.id AND ${LATEST}
    WHERE s.id=? AND ${ACTIVE}`, sourceId), 'Source not available.');
  const from = inventory.byId.get(sourceId), path = sourceLinkPath(row.origin);
  const readable = path && /\.(md|txt)$/i.test(path.path);
  const references = readable ? noteReferences(row.body) : { items: [], truncated: false };
  let truncated = references.truncated || (readable && row.bodyLength > 500000) || inventory.truncated;
  const items: SourceLinkItem[] = [], targetVersions: unknown[] = [];
  if (from) for (const reference of references.items) {
    const resolved = inventory.resolve(from, reference), target = resolved.targetId ? inventory.byId.get(resolved.targetId)! : null;
    targetVersions.push(target ? [target.id, target.revisionId, target.collection, target.placement, target.matters] : null);
    // A practice/source-library note is not a vehicle for broadening matter access.
    const contexts = !['practice','external'].includes(from.collection) && from.matters.length ? from.matters : [null];
    for (const matter of contexts) {
      if (items.length >= 10000) { truncated = true; break; }
      const alreadyShared = !!(matter && target?.matters.some(m => m.id === matter.id));
      const canShare = !inventory.truncated && !!matter && resolved.status === 'matched' && !!target
        && !['practice','external'].includes(target.collection) && target.id !== sourceId && !alreadyShared;
      const crossImport = !!target && target.namespace !== from.namespace;
      const note = resolved.status === 'outside' ? 'External URL, absolute path or path outside the retained folder layout. Nothing was opened or fetched.'
        : resolved.status === 'missing' ? 'This reference has no match in retained files. Import the supporting folder or link the correct document manually.'
        : resolved.status === 'ambiguous' ? 'Several retained files match. Open the documents and choose the correct one manually; no match was selected.'
        : inventory.truncated ? 'The retained-file inventory exceeds this check’s coverage. A unique target cannot be confirmed.'
        : alreadyShared ? 'Already available to this matter.'
        : !matter ? 'Assign the referring note to a matter before adding matter access from its references.'
        : !canShare ? 'Reusable library material or a self-reference. No matter access change is proposed.'
        : target!.matters.length ? 'Add this document to another matter. Its existing matter links and library location stay unchanged.'
        : 'Make this retained document available to the referring note’s matter. The original stays in place.';
      items.push({ ...resolved, id: importLinkDigest([resolved.id, matter?.id ?? null]), targetTitle: target?.title ?? null,
        targetRevisionId: target?.revisionId ?? null, matter, canShare, alreadyShared, crossImport, note });
    }
  }
  const expectedVersion = importLinkDigest([row.id, from?.collection, from?.placement, from?.matters, items, targetVersions, truncated]);
  return { sourceId, title: row.title, path: path?.path ?? null, expectedVersion, offset: 0, total: items.length,
    matched: items.filter(i => i.status === 'matched').length, unresolved: items.filter(unresolved).length,
    shareable: items.filter(i => i.canShare).length, truncated: !!truncated, items };
}
export function sourceLinks(db: Database, sourceId: string, raw: z.input<typeof SourceLinkQuery> = {}) {
  const query = SourceLinkQuery.parse(raw), review = sourceLinkReview(db, sourceId);
  const filtered = review.items.filter(i => query.view === 'all' || (query.view === 'sharing' ? i.canShare : unresolved(i)));
  return { ...review, offset: query.offset, total: filtered.length, items: filtered.slice(query.offset, query.offset + 50) };
}
export function applySourceLinks(db: Database, sourceId: string, raw: z.input<typeof SourceLinkApply>) {
  const input = SourceLinkApply.parse(raw), review = sourceLinkReview(db, sourceId);
  if (review.expectedVersion !== input.expectedVersion) throw new WorkspaceConflictError('The note, matching files or matter access changed. Check the links again before applying.');
  const selected = input.linkIds.map(id => review.items.find(item => item.id === id));
  if (selected.some(item => !item?.canShare || !item.targetId || !item.matter))
    throw new WorkspaceConflictError('A selected reference cannot be shared. No matter links were changed.');
  const pairs = new Map(selected.map(item => [`${item!.matter!.id}:${item!.targetId}`, item!]));
  for (const item of pairs.values()) db.run('INSERT INTO matter_sources(matter_id,source_id) VALUES (?,?) ON CONFLICT DO NOTHING', [item.matter!.id, item.targetId!]);
  return { added: pairs.size };
}
