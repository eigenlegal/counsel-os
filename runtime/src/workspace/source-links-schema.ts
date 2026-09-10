/** Cross-import checks are derived, local work. One durable flag coalesces a large upload. */
export const SOURCE_LINKS_SCHEMA = `
ALTER TABLE upkeep_findings RENAME TO upkeep_findings_v16;
DROP INDEX upkeep_active;
CREATE TABLE upkeep_findings (
  kind TEXT NOT NULL CHECK(kind IN ('source','import')), target_id TEXT NOT NULL,
  code TEXT NOT NULL CHECK(code IN ('unfiled','partial','source-links','import-review','import-links')),
  version TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
  active INTEGER NOT NULL CHECK(active IN (0,1)), dismissed_version TEXT,
  checked_at TEXT NOT NULL, PRIMARY KEY(kind,target_id,code),
  CHECK((kind='source' AND code IN ('unfiled','partial','source-links')) OR (kind='import' AND code IN ('import-review','import-links')))
) STRICT;
INSERT INTO upkeep_findings SELECT * FROM upkeep_findings_v16;
DROP TABLE upkeep_findings_v16;
CREATE INDEX upkeep_active ON upkeep_findings(active,kind,target_id);
CREATE TABLE source_link_refresh (id INTEGER PRIMARY KEY CHECK(id=1)) STRICT;
INSERT INTO source_link_refresh VALUES (1);
` + ['source_revisions','source_placements','source_lifecycle','matter_sources','matters'].flatMap(table =>
  ['INSERT','UPDATE','DELETE'].map(action => `CREATE TRIGGER source_links_${table}_${action.toLowerCase()} AFTER ${action} ON ${table}
    BEGIN INSERT INTO source_link_refresh VALUES (1) ON CONFLICT DO NOTHING; END;`)).join('\n');

export const QUEUE_SOURCE_LINK_REFRESH = `INSERT INTO upkeep_queue(kind,target_id,requested_at)
  SELECT 'source',r.source_id,? FROM source_revisions r
  WHERE r.revision_no=(SELECT max(revision_no) FROM source_revisions WHERE source_id=r.source_id)
    AND (lower(json_extract(r.provenance_json,'$.origin')) LIKE '%.md' OR lower(json_extract(r.provenance_json,'$.origin')) LIKE '%.txt')
  ON CONFLICT(kind,target_id) DO UPDATE SET error=NULL`;
