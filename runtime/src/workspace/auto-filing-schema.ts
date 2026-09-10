export const AUTO_FILING_SCHEMA = `
CREATE TABLE auto_filing_settings (
  id INTEGER PRIMARY KEY CHECK(id=1), revision_id TEXT NOT NULL,
  state_json TEXT NOT NULL CHECK(json_valid(state_json))
) STRICT;
CREATE TABLE auto_filing_tasks (
  source_id TEXT PRIMARY KEY REFERENCES sources(id),
  state TEXT NOT NULL CHECK(state IN ('queued','running','complete','blocked','failed','protected')),
  generation INTEGER NOT NULL CHECK(generation>=1), run_id TEXT,
  message TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE auto_filing_protection (
  source_id TEXT PRIMARY KEY REFERENCES sources(id), reason TEXT NOT NULL
) STRICT;
CREATE TABLE auto_filing_results (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), fingerprint TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('ready','applied','dismissed','superseded')),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)), created_at TEXT NOT NULL,
  UNIQUE(source_id,fingerprint)
) STRICT;
CREATE INDEX auto_filing_results_state ON auto_filing_results(state,source_id);
` + ['source_revisions','source_lifecycle'].flatMap(table => ['INSERT','UPDATE','DELETE'].map(action => {
  const row = action === 'DELETE' ? 'OLD' : 'NEW';
  return `CREATE TRIGGER auto_filing_${table}_${action.toLowerCase()} AFTER ${action} ON ${table} BEGIN
    INSERT INTO auto_filing_tasks VALUES (${row}.source_id,'queued',1,NULL,'',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ON CONFLICT(source_id) DO UPDATE SET state='queued',generation=generation+1,run_id=NULL,message='',updated_at=excluded.updated_at;
    UPDATE auto_filing_results SET state='superseded' WHERE source_id=${row}.source_id AND state='ready'; END;`;
})).join('\n') + ['source_placements','matter_sources'].flatMap(table => ['INSERT','UPDATE','DELETE'].map(action => {
  const row = action === 'DELETE' ? 'OLD' : 'NEW';
  return `CREATE TRIGGER auto_filing_${table}_${action.toLowerCase()} AFTER ${action} ON ${table} BEGIN
    INSERT INTO auto_filing_protection VALUES (${row}.source_id,'An explicit filing or matter-link choice is preserved.') ON CONFLICT DO NOTHING;
    INSERT INTO auto_filing_tasks VALUES (${row}.source_id,'protected',1,NULL,'Your filing choice is preserved.',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ON CONFLICT(source_id) DO UPDATE SET state='protected',generation=generation+1,run_id=NULL,message=excluded.message,updated_at=excluded.updated_at;
    UPDATE auto_filing_results SET state='superseded' WHERE source_id=${row}.source_id AND state='ready'; END;`;
})).join('\n') + `
CREATE TRIGGER auto_filing_matters_insert AFTER INSERT ON matters BEGIN
  INSERT INTO auto_filing_tasks SELECT s.id,'queued',1,NULL,'',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM sources s
  WHERE NOT EXISTS(SELECT 1 FROM auto_filing_protection p WHERE p.source_id=s.id)
    AND NOT EXISTS(SELECT 1 FROM source_placements p WHERE p.source_id=s.id)
    AND NOT EXISTS(SELECT 1 FROM matter_sources m WHERE m.source_id=s.id)
  ON CONFLICT(source_id) DO UPDATE SET state='queued',generation=generation+1,run_id=NULL,message=''; END;
CREATE TRIGGER auto_filing_matters_update AFTER UPDATE OF title ON matters BEGIN
  INSERT INTO auto_filing_tasks SELECT s.id,'queued',1,NULL,'',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM sources s
  WHERE NOT EXISTS(SELECT 1 FROM auto_filing_protection p WHERE p.source_id=s.id)
    AND NOT EXISTS(SELECT 1 FROM source_placements p WHERE p.source_id=s.id)
    AND NOT EXISTS(SELECT 1 FROM matter_sources m WHERE m.source_id=s.id)
  ON CONFLICT(source_id) DO UPDATE SET state='queued',generation=generation+1,run_id=NULL,message=''; END;
`;
