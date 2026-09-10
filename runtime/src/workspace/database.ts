import { Database } from "bun:sqlite";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  chmodSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { UPKEEP_SCHEMA } from './upkeep-schema';
import { SOURCE_LINKS_SCHEMA } from './source-links-schema';
import { AUTO_FILING_SCHEMA } from './auto-filing-schema';
import { DRAFT_SCHEMA } from './draft-types';

export const WORKSPACE_APPLICATION_ID = 0x434f5357; // COSW; distinct from the legacy thread prototype.
export const WORKSPACE_SCHEMA_VERSION = 19;

/** One schema owner for the workspace. No host sessions or legacy vault IO. */
export function openWorkspaceDatabase(
  path: string,
  targetVersion: 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 = WORKSPACE_SCHEMA_VERSION,
): Database {
  if (![5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].includes(targetVersion))
    throw new Error("Unsupported schema target.");
  // Older schemas are instantiated only in memory to verify known backup schemas.
  if (targetVersion !== WORKSPACE_SCHEMA_VERSION && path !== ":memory:")
    throw new Error(
      "Older schema targets are only supported for in-memory verification.",
    );
  if (path !== ":memory:") {
    if (existsSync(join(dirname(path), ".restore-in-progress")))
      throw new Error(
        "This restored folder is incomplete. Restore the backup again to create a new, verified copy.",
      );
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    try {
      closeSync(openSync(path, "wx", 0o600));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
    if (!lstatSync(path).isFile())
      throw new Error("workspace database must be a regular file");
  }
  const db = new Database(path, { create: true, strict: true });
  try {
    db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    db.transaction(() => {
      const application = (
        db.query("PRAGMA application_id").get() as { application_id: number }
      ).application_id;
      const version = (
        db.query("PRAGMA user_version").get() as { user_version: number }
      ).user_version;
      const objects = db
        .query("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'")
        .all();
      if (
        application !== WORKSPACE_APPLICATION_ID &&
        (application !== 0 || version !== 0 || objects.length > 0)
      ) {
        throw new Error(
          "not a Counsel OS workspace database; legacy data requires an explicit importer",
        );
      }
      if (version > WORKSPACE_SCHEMA_VERSION)
        throw new Error(
          `workspace schema ${version} is newer than supported ${WORKSPACE_SCHEMA_VERSION}`,
        );
      if (version === targetVersion) return;
      if (version === 0) {
        if (objects.length > 0)
          throw new Error("unrecognized workspace schema");
        db.exec(SCHEMA_V1);
      } else if (
        version !== 1 &&
        version !== 2 &&
        version !== 3 &&
        version !== 4 &&
        version !== 5 &&
        version !== 6 &&
        version !== 7 &&
        version !== 8 &&
        version !== 9 &&
        version !== 10 &&
        version !== 11 &&
        version !== 12 &&
        version !== 13 &&
        version !== 14 &&
        version !== 15 &&
        version !== 16 &&
        version !== 17 && version !== 18
      )
        throw new Error("unrecognized workspace schema");
      if (version < 2) db.exec(SCHEMA_V2);
      if (version < 3) db.exec(SCHEMA_V3);
      if (version < 4) db.exec(SCHEMA_V4);
      if (version < 5) db.exec(SCHEMA_V5);
      if (version < 6 && targetVersion >= 6) db.exec(SCHEMA_V6);
      if (version < 7 && targetVersion >= 7) db.exec(SCHEMA_V7);
      if (version < 8 && targetVersion >= 8) db.exec(SCHEMA_V8);
      if (version < 9 && targetVersion >= 9) db.exec(SCHEMA_V9);
      if (version < 10 && targetVersion >= 10) db.exec(SCHEMA_V10);
      if (version < 11 && targetVersion >= 11) db.exec(SCHEMA_V11);
      if (version < 12 && targetVersion >= 12) db.exec(SCHEMA_V12);
      if (version < 13 && targetVersion >= 13) db.exec(SCHEMA_V13);
      if (version < 14 && targetVersion >= 14) db.exec(SCHEMA_V14);
      if (version < 15 && targetVersion >= 15) db.exec(SCHEMA_V15);
      if (version < 16 && targetVersion >= 16) db.exec(UPKEEP_SCHEMA);
      if (version < 17 && targetVersion >= 17) db.exec(SOURCE_LINKS_SCHEMA);
      if (version < 18 && targetVersion >= 18) db.exec(AUTO_FILING_SCHEMA);
      if (version < 19 && targetVersion >= 19) db.exec(DRAFT_SCHEMA);
      db.exec(
        `PRAGMA application_id = ${WORKSPACE_APPLICATION_ID}; PRAGMA user_version = ${targetVersion};`,
      );
    }).immediate();
    if (path !== ":memory:") {
      chmodSync(path, 0o600);
      db.exec("PRAGMA journal_mode = WAL;");
    }
    return db;
  } catch (err) {
    db.close();
    throw err;
  }
}

const SCHEMA_V15 = `
CREATE TABLE import_organization_jobs (
  batch_id TEXT PRIMARY KEY REFERENCES import_batches(id),
  revision_id TEXT NOT NULL,
  state_json TEXT NOT NULL CHECK(json_valid(state_json))
) STRICT;
CREATE TABLE import_organization_results (
  entry_id TEXT PRIMARY KEY REFERENCES import_entries(id),
  batch_id TEXT NOT NULL REFERENCES import_organization_jobs(batch_id),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  applied INTEGER NOT NULL DEFAULT 0 CHECK(applied IN (0,1))
) STRICT;
CREATE INDEX import_organization_batch ON import_organization_results(batch_id);
`;

const SCHEMA_V14 = `
CREATE TABLE knowledge_evidence (
  revision_id TEXT NOT NULL REFERENCES knowledge_revisions(id), position INTEGER NOT NULL,
  source_revision_id TEXT REFERENCES source_revisions(id), knowledge_revision_id TEXT REFERENCES knowledge_revisions(id),
  prior_work_id TEXT REFERENCES work_records(id), quote TEXT NOT NULL CHECK(length(quote) > 0),
  start_offset INTEGER NOT NULL CHECK(start_offset >= 0), end_offset INTEGER NOT NULL CHECK(end_offset > start_offset), locator TEXT,
  PRIMARY KEY(revision_id, position),
  CHECK((source_revision_id IS NOT NULL) + (knowledge_revision_id IS NOT NULL) + (prior_work_id IS NOT NULL) = 1),
  CHECK(knowledge_revision_id IS NULL OR knowledge_revision_id != revision_id)
) STRICT;
CREATE INDEX knowledge_evidence_source ON knowledge_evidence(source_revision_id);
CREATE INDEX knowledge_evidence_knowledge ON knowledge_evidence(knowledge_revision_id);
CREATE INDEX knowledge_evidence_work ON knowledge_evidence(prior_work_id);
CREATE INDEX evidence_source ON evidence(source_revision_id);
CREATE INDEX evidence_knowledge ON evidence(knowledge_revision_id);
CREATE INDEX evidence_work ON evidence(prior_work_id);
`;

const SCHEMA_V13 = `
CREATE INDEX import_queue_pending ON import_entries(status, batch_id);
CREATE TABLE import_entry_metadata (
  entry_id TEXT PRIMARY KEY REFERENCES import_entries(id),
  extracted_byte_count INTEGER NOT NULL CHECK(extracted_byte_count >= 0),
  text_status TEXT NOT NULL CHECK(text_status IN ('ready','partial','unavailable')),
  notes_json TEXT NOT NULL CHECK(json_valid(notes_json))
) STRICT;
INSERT INTO import_entry_metadata
  SELECT id,length(CAST(extracted_json AS BLOB)),json_extract(extracted_json,'$.textStatus'),json_extract(extracted_json,'$.extraction.notes')
  FROM import_entries WHERE extracted_json IS NOT NULL;
`;

const SCHEMA_V12 = `
-- Pending entries with retained bytes are durable extraction jobs. An interrupted
-- parser leaves them pending, so reopening safely picks up the same original.
CREATE TABLE import_queue (
  batch_id TEXT PRIMARY KEY REFERENCES import_batches(id),
  paused INTEGER NOT NULL CHECK(paused IN (0,1))
) STRICT;
`;

const SCHEMA_V10 = `
CREATE TABLE source_lifecycle (
  source_id TEXT PRIMARY KEY REFERENCES sources(id),
  state TEXT NOT NULL CHECK(state IN ('active','trashed')), revision_id TEXT NOT NULL, changed_at TEXT NOT NULL
) STRICT;
CREATE TABLE work_lifecycle (
  work_id TEXT PRIMARY KEY REFERENCES work_records(id),
  state TEXT NOT NULL CHECK(state IN ('active','trashed')), revision_id TEXT NOT NULL, changed_at TEXT NOT NULL
) STRICT;
`;

const SCHEMA_V9 = `
CREATE TABLE conversation_lifecycle (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id),
  state TEXT NOT NULL CHECK(state IN ('active', 'archived', 'trashed')),
  changed_at TEXT NOT NULL
) STRICT;
`;

const SCHEMA_V1 = `
CREATE TABLE matters (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT, summary TEXT NOT NULL, created_at TEXT NOT NULL
) STRICT;
CREATE TABLE sources (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('reference','document','authority')), created_at TEXT NOT NULL
) STRICT;
CREATE TABLE source_revisions (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), revision_no INTEGER NOT NULL CHECK(revision_no > 0),
  title TEXT NOT NULL, body TEXT, text_status TEXT NOT NULL CHECK(text_status IN ('ready','partial','unavailable')),
  content_hash TEXT, provenance_json TEXT NOT NULL CHECK(json_valid(provenance_json)), received_at TEXT NOT NULL,
  UNIQUE(source_id, revision_no),
  CHECK((text_status = 'unavailable' AND body IS NULL AND content_hash IS NULL) OR
        (text_status != 'unavailable' AND body IS NOT NULL AND content_hash IS NOT NULL))
) STRICT;
CREATE TABLE matter_sources (
  matter_id TEXT NOT NULL REFERENCES matters(id), source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(matter_id, source_id)
) STRICT;
CREATE INDEX matter_sources_by_source ON matter_sources(source_id, matter_id);
CREATE TABLE knowledge_items (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('position','method','language','pattern')),
  ownership TEXT NOT NULL CHECK(ownership IN ('user','maintained')), matter_id TEXT REFERENCES matters(id), created_at TEXT NOT NULL
) STRICT;
CREATE TABLE knowledge_revisions (
  id TEXT PRIMARY KEY, knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id), revision_no INTEGER NOT NULL CHECK(revision_no > 0),
  title TEXT NOT NULL, body TEXT NOT NULL, content_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), approved_by TEXT, approved_at TEXT, received_at TEXT NOT NULL,
  UNIQUE(knowledge_id, revision_no),
  CHECK((status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status != 'approved' AND approved_by IS NULL AND approved_at IS NULL))
) STRICT;
CREATE INDEX approved_knowledge ON knowledge_revisions(knowledge_id, status, revision_no);
CREATE TABLE work_records (
  id TEXT PRIMARY KEY, matter_id TEXT REFERENCES matters(id), title TEXT NOT NULL, request TEXT NOT NULL, answer TEXT NOT NULL,
  disposition TEXT NOT NULL CHECK(disposition IN ('draft','decision')), decision_by TEXT, recorded_at TEXT NOT NULL, content_hash TEXT NOT NULL,
  CHECK((disposition = 'decision' AND decision_by IS NOT NULL) OR (disposition = 'draft' AND decision_by IS NULL))
) STRICT;
CREATE INDEX work_by_matter ON work_records(matter_id, recorded_at, id);
CREATE TABLE evidence (
  id TEXT PRIMARY KEY, work_id TEXT NOT NULL REFERENCES work_records(id), position INTEGER NOT NULL,
  source_revision_id TEXT REFERENCES source_revisions(id), knowledge_revision_id TEXT REFERENCES knowledge_revisions(id),
  prior_work_id TEXT REFERENCES work_records(id), quote TEXT NOT NULL CHECK(length(quote) > 0),
  start_offset INTEGER NOT NULL CHECK(start_offset >= 0), end_offset INTEGER NOT NULL CHECK(end_offset > start_offset), locator TEXT,
  UNIQUE(work_id, position),
  CHECK((source_revision_id IS NOT NULL) + (knowledge_revision_id IS NOT NULL) + (prior_work_id IS NOT NULL) = 1),
  CHECK(prior_work_id IS NULL OR prior_work_id != work_id)
) STRICT;
CREATE TABLE search_entries (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('source','knowledge','work')),
  source_revision_id TEXT UNIQUE REFERENCES source_revisions(id), knowledge_revision_id TEXT UNIQUE REFERENCES knowledge_revisions(id),
  work_id TEXT UNIQUE REFERENCES work_records(id), title TEXT NOT NULL, body TEXT NOT NULL,
  CHECK((kind = 'source' AND source_revision_id IS NOT NULL AND knowledge_revision_id IS NULL AND work_id IS NULL) OR
        (kind = 'knowledge' AND source_revision_id IS NULL AND knowledge_revision_id IS NOT NULL AND work_id IS NULL) OR
        (kind = 'work' AND source_revision_id IS NULL AND knowledge_revision_id IS NULL AND work_id IS NOT NULL))
) STRICT;
CREATE VIRTUAL TABLE workspace_search USING fts5(title, body, content='search_entries', content_rowid='id', tokenize='unicode61');
CREATE TRIGGER search_insert AFTER INSERT ON search_entries BEGIN
  INSERT INTO workspace_search(rowid, title, body) VALUES (new.id, new.title, new.body);
END;
CREATE TRIGGER search_delete AFTER DELETE ON search_entries BEGIN
  INSERT INTO workspace_search(workspace_search, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
END;
CREATE TRIGGER search_update AFTER UPDATE ON search_entries BEGIN
  INSERT INTO workspace_search(workspace_search, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
  INSERT INTO workspace_search(rowid, title, body) VALUES (new.id, new.title, new.body);
END;
CREATE TABLE seed_imports (
  seed_id TEXT PRIMARY KEY, version INTEGER NOT NULL, hash TEXT NOT NULL, imported_at TEXT NOT NULL,
  records_json TEXT NOT NULL CHECK(json_valid(records_json))
) STRICT;
`;

const SCHEMA_V2 = `
CREATE TABLE workspace_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL CHECK(json_valid(value_json))) STRICT;
CREATE TABLE source_originals (
  revision_id TEXT PRIMARY KEY REFERENCES source_revisions(id), name TEXT NOT NULL,
  hash TEXT NOT NULL, byte_count INTEGER NOT NULL
) STRICT;
CREATE TABLE conversations (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, matter_id TEXT REFERENCES matters(id),
  scope TEXT NOT NULL CHECK(scope IN ('conversation','matter','workspace')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  CHECK((scope = 'matter') = (matter_id IS NOT NULL))
) STRICT;
CREATE TABLE conversation_turns (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), client_id TEXT NOT NULL,
  request TEXT NOT NULL, attachments_json TEXT NOT NULL CHECK(json_valid(attachments_json)),
  state_json TEXT NOT NULL CHECK(json_valid(state_json)),
  status TEXT NOT NULL CHECK(status IN ('running','complete','failed','cancelled','interrupted')),
  created_at TEXT NOT NULL, finished_at TEXT, work_id TEXT REFERENCES work_records(id),
  UNIQUE(conversation_id, client_id)
) STRICT;
CREATE UNIQUE INDEX one_running_turn_per_conversation ON conversation_turns(conversation_id) WHERE status = 'running';
CREATE INDEX conversation_turn_order ON conversation_turns(conversation_id, created_at, id);
`;

const SCHEMA_V3 = `
CREATE TABLE work_outputs (
  work_id TEXT PRIMARY KEY REFERENCES work_records(id), title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('memo','assessment','email','chronology','draft','other')),
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE matter_briefs (
  id TEXT PRIMARY KEY, matter_id TEXT NOT NULL REFERENCES matters(id),
  revision_no INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('open','on-hold','closed')),
  summary TEXT NOT NULL, questions TEXT NOT NULL, next_actions TEXT NOT NULL, recorded_at TEXT NOT NULL,
  UNIQUE(matter_id, revision_no)
) STRICT;
CREATE INDEX turn_by_work ON conversation_turns(work_id);
`;

const SCHEMA_V4 = `CREATE TABLE source_extractions (
  revision_id TEXT PRIMARY KEY REFERENCES source_revisions(id), details_json TEXT NOT NULL CHECK(json_valid(details_json))
) STRICT;`;

const SCHEMA_V5 = `CREATE TABLE work_exports (
  id TEXT PRIMARY KEY, work_id TEXT NOT NULL REFERENCES work_records(id), name TEXT NOT NULL,
  created_at TEXT NOT NULL, template TEXT NOT NULL, input_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL, byte_count INTEGER NOT NULL CHECK(byte_count > 0 AND byte_count <= 5000000),
  warnings_json TEXT NOT NULL CHECK(json_valid(warnings_json)),
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)), bytes BLOB NOT NULL,
  UNIQUE(work_id, input_hash), CHECK(length(bytes) = byte_count)
) STRICT;`;

const SCHEMA_V6 = `
CREATE TABLE practice_templates (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL UNIQUE,
  input_json TEXT NOT NULL CHECK(json_valid(input_json)), created_at TEXT NOT NULL
) STRICT;
CREATE TABLE template_revisions (
  id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES practice_templates(id),
  revision_no INTEGER NOT NULL CHECK(revision_no > 0), source_revision_id TEXT NOT NULL REFERENCES source_revisions(id),
  title TEXT NOT NULL, when_to_use TEXT NOT NULL, jurisdiction TEXT NOT NULL,
  available INTEGER NOT NULL CHECK(available IN (0,1)), recorded_at TEXT NOT NULL,
  UNIQUE(template_id, revision_no)
) STRICT;
CREATE INDEX templates_by_source_version ON template_revisions(source_revision_id);
`;

const SCHEMA_V7 = `
CREATE TABLE import_batches (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL UNIQUE, input_json TEXT NOT NULL CHECK(json_valid(input_json)),
  label TEXT NOT NULL, revision_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('review','committed','discarded')),
  created_at TEXT NOT NULL, receipt_json TEXT CHECK(receipt_json IS NULL OR json_valid(receipt_json)),
  commit_input_json TEXT CHECK(commit_input_json IS NULL OR json_valid(commit_input_json))
) STRICT;
CREATE TABLE import_entries (
  id TEXT PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES import_batches(id), path TEXT NOT NULL,
  byte_count INTEGER NOT NULL CHECK(byte_count >= 0), content_hash TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','ready','error','skipped')), reason TEXT NOT NULL,
  choice_json TEXT NOT NULL CHECK(json_valid(choice_json)),
  bytes BLOB, extracted_json TEXT CHECK(extracted_json IS NULL OR json_valid(extracted_json)),
  UNIQUE(batch_id, path)
) STRICT;
CREATE INDEX import_entries_by_batch ON import_entries(batch_id);
`;

// Organization is separate from immutable evidence and from retrieval permission.
// Existing records, originals, citations and approvals are not rewritten.
const SCHEMA_V11 = `
-- Explicit immutable multi-matter scopes, independent of optional clients.
-- The base conversation stays unfiled; combined answers are not copied to each matter.
CREATE TABLE conversation_matters (
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  matter_id TEXT NOT NULL REFERENCES matters(id),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0 AND ordinal < 100),
  PRIMARY KEY (conversation_id, matter_id), UNIQUE (conversation_id, ordinal)
) STRICT;
CREATE INDEX conversations_by_selected_matter ON conversation_matters(matter_id, conversation_id);
`;

const SCHEMA_V8 = `
CREATE TABLE source_placements (
  source_id TEXT PRIMARY KEY REFERENCES sources(id),
  collection TEXT NOT NULL CHECK(collection IN ('external','practice')),
  revision_id TEXT NOT NULL, reason TEXT NOT NULL
) STRICT;
INSERT INTO source_placements
  SELECT s.id, CASE WHEN json_extract(r.provenance_json, '$.origin') LIKE 'plugin:law/%' THEN 'external' ELSE 'practice' END,
    'migration-8:' || s.id, 'Imported folder organization; not content approval or legal verification.'
  FROM sources s JOIN source_revisions r ON r.source_id = s.id AND r.revision_no = 1
  WHERE json_extract(r.provenance_json, '$.origin') LIKE 'plugin:practice/%'
    OR json_extract(r.provenance_json, '$.origin') LIKE 'plugin:memory/%'
    OR json_extract(r.provenance_json, '$.origin') LIKE 'plugin:law/%';
INSERT INTO source_placements
  SELECT DISTINCT r.source_id, 'practice', 'migration-8:' || r.source_id, 'Original of a practice template.'
  FROM template_revisions t JOIN source_revisions r ON r.id = t.source_revision_id
  WHERE NOT EXISTS (SELECT 1 FROM source_placements p WHERE p.source_id = r.source_id);
INSERT INTO source_placements
  SELECT DISTINCT json_extract(i.value, '$.sourceId'), 'practice', 'migration-8:' || json_extract(i.value, '$.sourceId'),
    'Original retained for the reviewed practice import destination; not approval.'
  FROM import_batches b, json_each(b.receipt_json, '$.items') i
  JOIN import_entries e ON e.id = json_extract(i.value, '$.entryId') AND e.batch_id = b.id
  WHERE b.status = 'committed' AND json_extract(e.choice_json, '$.destination') IN ('position','method','language','pattern','template','profile')
  AND NOT EXISTS (SELECT 1 FROM source_placements p WHERE p.source_id = json_extract(i.value, '$.sourceId'));
CREATE TABLE clients (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, summary TEXT NOT NULL, revision_id TEXT NOT NULL, created_at TEXT NOT NULL
) STRICT;
CREATE TABLE matter_clients (
  matter_id TEXT PRIMARY KEY REFERENCES matters(id), client_id TEXT REFERENCES clients(id), revision_id TEXT NOT NULL
) STRICT;
CREATE INDEX matters_by_client ON matter_clients(client_id, matter_id);
-- An additive scope extension: legacy conversation storage remains unchanged.
-- A client chat has base scope 'conversation' and this explicit, immutable selection.
CREATE TABLE conversation_clients (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id), client_id TEXT NOT NULL REFERENCES clients(id),
  matter_ids_json TEXT NOT NULL CHECK(json_valid(matter_ids_json) AND json_type(matter_ids_json) = 'array')
) STRICT;
`;
