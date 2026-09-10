/** Queue writes share the originating transaction: rolled-back work cannot create tasks. */
export const UPKEEP_SCHEMA = `
CREATE TABLE upkeep_queue (
  kind TEXT NOT NULL CHECK(kind IN ('source','import')), target_id TEXT NOT NULL,
  requested_at TEXT NOT NULL, error TEXT,
  PRIMARY KEY(kind,target_id)
) STRICT;
CREATE TABLE upkeep_findings (
  kind TEXT NOT NULL CHECK(kind IN ('source','import')), target_id TEXT NOT NULL,
  code TEXT NOT NULL CHECK(code IN ('unfiled','partial','import-review','import-links')),
  version TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
  active INTEGER NOT NULL CHECK(active IN (0,1)), dismissed_version TEXT,
  checked_at TEXT NOT NULL, PRIMARY KEY(kind,target_id,code),
  CHECK((kind='source' AND code IN ('unfiled','partial')) OR (kind='import' AND code IN ('import-review','import-links')))
) STRICT;
CREATE INDEX upkeep_active ON upkeep_findings(active,kind,target_id);
CREATE TABLE upkeep_runs (
  id TEXT PRIMARY KEY, reason TEXT NOT NULL CHECK(reason IN ('changes','periodic','manual')),
  started_at TEXT NOT NULL, completed_at TEXT, checked INTEGER NOT NULL DEFAULT 0 CHECK(checked>=0)
) STRICT;
CREATE UNIQUE INDEX upkeep_one_run ON upkeep_runs((1)) WHERE completed_at IS NULL;
` + [
  ['source_revisions', 'source', 'source_id'],
  ['source_placements', 'source', 'source_id'],
  ['source_lifecycle', 'source', 'source_id'],
  ['matter_sources', 'source', 'source_id'],
  ['import_batches', 'import', 'id'],
  ['import_entries', 'import', 'batch_id'],
  ['import_queue', 'import', 'batch_id'],
  ['import_organization_jobs', 'import', 'batch_id'],
].flatMap(([table, kind, column]) => ['INSERT','UPDATE','DELETE'].map(action => {
  const row = action === 'DELETE' ? 'OLD' : 'NEW';
  return `CREATE TRIGGER upkeep_${table}_${action.toLowerCase()} AFTER ${action} ON ${table}
    BEGIN INSERT INTO upkeep_queue(kind,target_id,requested_at) VALUES ('${kind}',${row}.${column},strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ON CONFLICT(kind,target_id) DO UPDATE SET requested_at=excluded.requested_at,error=NULL; END;`;
})).join('\n');
