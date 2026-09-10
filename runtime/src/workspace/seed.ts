import { createHash } from 'node:crypto';
import type { Database } from 'bun:sqlite';
import type { WorkspaceStore } from './store';
import { one } from './queries';
import { WorkspaceConflictError, WorkspaceSeed, type EvidenceInput, type SeedReceipt } from './types';

/** Object key order is not content. Array order is preserved, including the
 * order in which work records may refer to earlier work in the seed. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function resolveKey(map: Record<string, string>, key: string, kind: string): string {
  if (!Object.hasOwn(map, key)) throw new Error(`unknown seed ${kind} key: ${key}`);
  return map[key]!;
}

/** Called inside the workspace's transaction. Each dataset is imported once;
 * changed or newer input is refused rather than merging over user edits. */
export function importWorkspaceSeed(db: Database, store: WorkspaceStore, raw: unknown, now: string): SeedReceipt {
  const seed = WorkspaceSeed.parse(raw);
  for (const [kind, rows] of Object.entries({ matters: seed.matters, sources: seed.sources, knowledge: seed.knowledge, work: seed.work })) {
    const keys = rows.map(row => row.key);
    if (new Set(keys).size !== keys.length) throw new Error(`duplicate seed ${kind} key`);
  }
  const hash = createHash('sha256').update(canonical(seed)).digest('hex');
  const previous = one<{ version: number; hash: string; importedAt: string; recordsJson: string }>(db,
    'SELECT version, hash, imported_at AS importedAt, records_json AS recordsJson FROM seed_imports WHERE seed_id = ?', seed.id);
  if (previous !== null) {
    if (previous.version !== seed.version || previous.hash !== hash) {
      throw new WorkspaceConflictError('seed already imported with different content or version; use a reviewed migration');
    }
    return { seedId: seed.id, version: seed.version, hash, importedAt: previous.importedAt,
      records: JSON.parse(previous.recordsJson) as SeedReceipt['records'], alreadyImported: true };
  }
  const records: SeedReceipt['records'] = {
    matters: Object.create(null), sources: Object.create(null), sourceRevisions: Object.create(null),
    knowledge: Object.create(null), knowledgeRevisions: Object.create(null), work: Object.create(null),
  };
  for (const { key, ...input } of seed.matters) records.matters[key] = store.createMatter(input).id;
  for (const { key, matterKeys, ...input } of seed.sources) {
    const source = store.createSource({ ...input, matterIds: matterKeys.map(k => resolveKey(records.matters, k, 'matter')) });
    records.sources[key] = source.id;
    records.sourceRevisions[key] = source.latest.id;
  }
  for (const { key, matterKey, ...input } of seed.knowledge) {
    const knowledge = store.createKnowledge({ ...input, matterId: matterKey === undefined ? null : resolveKey(records.matters, matterKey, 'matter') });
    records.knowledge[key] = knowledge.id;
    records.knowledgeRevisions[key] = knowledge.latest.id;
  }
  for (const { key, matterKey, evidence, ...input } of seed.work) {
    const citations: EvidenceInput[] = evidence.map(({ target, ...citation }) => ({
      ...citation,
      target: target.kind === 'source' ? { kind: 'source', revisionId: resolveKey(records.sourceRevisions, target.key, 'source') }
        : target.kind === 'knowledge' ? { kind: 'knowledge', revisionId: resolveKey(records.knowledgeRevisions, target.key, 'knowledge') }
        : { kind: 'work', workId: resolveKey(records.work, target.key, 'earlier work') },
    }));
    records.work[key] = store.recordWork({ ...input, evidence: citations,
      matterId: matterKey === undefined ? null : resolveKey(records.matters, matterKey, 'matter') }).id;
  }
  db.run('INSERT INTO seed_imports (seed_id, version, hash, imported_at, records_json) VALUES (?, ?, ?, ?, ?)',
    [seed.id, seed.version, hash, now, JSON.stringify(records)]);
  return { seedId: seed.id, version: seed.version, hash, importedAt: now, records, alreadyImported: false };
}
