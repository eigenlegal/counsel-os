import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { Database } from 'bun:sqlite';
import type { Tenant } from '../core/types';
import {
  assertThreadId,
  assertThreadTenant,
  titleFromThreadMessage,
  type ThreadEvent,
  type ThreadHeader,
  type ThreadRepository,
} from './store';

const SCHEMA_VERSION = 1;

interface ThreadRow {
  id: string;
  title: string | null;
  matter: string | null;
  task: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  provider_id: string;
  session_id: string;
}

interface EventRow {
  sequence: number;
  event_json: string;
}

export interface SqliteThreadStoreOptions {
  /** Overrides `~/.counsel-os/codex` for tests and alternate installs. */
  codexHomeRoot?: string;
  /** Overrides `<workspace>/.counsel/counsel.sqlite3`; `:memory:` is useful in tests. */
  databasePath?: string;
}

/**
 * Transactional conversation storage for the standalone application.
 *
 * It deliberately implements only the existing thread contract. Matter and
 * knowledge records still live in the filesystem until their own domain
 * repositories are extracted; putting Markdown strings in a generic SQL
 * key/value table would preserve the old storage model under a new filename.
 */
export class SqliteThreadStore implements ThreadRepository {
  readonly databasePath: string;
  private readonly db: Database;
  private readonly codexHomeRoot: string;

  constructor(workspaceRoot: string, opts: SqliteThreadStoreOptions = {}) {
    this.databasePath = opts.databasePath ?? join(workspaceRoot, '.counsel', 'counsel.sqlite3');
    this.codexHomeRoot = opts.codexHomeRoot ?? join(homedir(), '.counsel-os', 'codex');

    if (this.databasePath !== ':memory:') mkdirSync(dirname(this.databasePath), { recursive: true, mode: 0o700 });
    this.db = new Database(this.databasePath, { create: true, strict: true });
    if (this.databasePath !== ':memory:') chmodSync(this.databasePath, 0o600);

    try {
      this.db.exec('PRAGMA foreign_keys = ON');
      this.db.exec('PRAGMA busy_timeout = 5000');
      if (this.databasePath !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL');
      this.migrate();
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  private migrate(): void {
    const row = this.db.query('PRAGMA user_version').get() as { user_version: number };
    if (row.user_version > SCHEMA_VERSION) {
      throw new Error(`conversation database schema ${row.user_version} is newer than this runtime supports (${SCHEMA_VERSION})`);
    }
    if (row.user_version === SCHEMA_VERSION) return;

    this.db.transaction(() => {
      this.db.exec(`
        CREATE TABLE threads (
          tenant TEXT NOT NULL,
          id TEXT NOT NULL,
          title TEXT,
          matter TEXT,
          task TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (tenant, id)
        ) STRICT;

        CREATE TABLE thread_sessions (
          tenant TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          provider_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          PRIMARY KEY (tenant, thread_id, provider_id),
          FOREIGN KEY (tenant, thread_id) REFERENCES threads(tenant, id) ON DELETE CASCADE
        ) STRICT;

        CREATE TABLE thread_events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          event_json TEXT NOT NULL CHECK (json_valid(event_json)),
          FOREIGN KEY (tenant, thread_id) REFERENCES threads(tenant, id) ON DELETE CASCADE
        ) STRICT;

        CREATE INDEX thread_events_by_thread
          ON thread_events(tenant, thread_id, sequence);

        CREATE INDEX threads_by_created
          ON threads(tenant, created_at, id);
      `);
      this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    })();
  }

  private readRow(tenant: Tenant, id: string): ThreadRow {
    const row = this.db
      .query('SELECT id, title, matter, task, created_at, updated_at FROM threads WHERE tenant = ? AND id = ?')
      .get(tenant, id) as ThreadRow | null;
    if (row === null) throw new Error(`unknown thread: ${id}`);
    return row;
  }

  private sessions(tenant: Tenant, id: string): Record<string, string> {
    const rows = this.db
      .query('SELECT provider_id, session_id FROM thread_sessions WHERE tenant = ? AND thread_id = ? ORDER BY provider_id')
      .all(tenant, id) as SessionRow[];
    return Object.fromEntries(rows.map(row => [row.provider_id, row.session_id]));
  }

  private storedHeader(tenant: Tenant, id: string): ThreadHeader {
    const row = this.readRow(tenant, id);
    return {
      id: row.id,
      ...(row.title === null ? {} : { title: row.title }),
      ...(row.matter === null ? {} : { matter: row.matter }),
      ...(row.task === null ? {} : { task: row.task }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sessions: this.sessions(tenant, id),
    };
  }

  private readEvents(tenant: Tenant, id: string): ThreadEvent[] {
    const rows = this.db
      .query('SELECT sequence, event_json FROM thread_events WHERE tenant = ? AND thread_id = ? ORDER BY sequence')
      .all(tenant, id) as EventRow[];
    return rows.map(row => JSON.parse(row.event_json) as ThreadEvent);
  }

  private presentHeader(tenant: Tenant, header: ThreadHeader): ThreadHeader {
    if ((header.title ?? '').trim() !== '') return header;
    const row = this.db
      .query("SELECT event_json FROM thread_events WHERE tenant = ? AND thread_id = ? AND event_json ->> '$.t' = 'user' ORDER BY sequence LIMIT 1")
      .get(tenant, header.id) as Pick<EventRow, 'event_json'> | null;
    if (row === null) return header;
    const event = JSON.parse(row.event_json) as Extract<ThreadEvent, { t: 'user' }>;
    const title = titleFromThreadMessage(event.content);
    return title === '' ? header : { ...header, title };
  }

  async create(tenant: Tenant, init: { title?: string; matter?: string; task?: string } = {}): Promise<ThreadHeader> {
    assertThreadTenant(tenant);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      'INSERT INTO threads (tenant, id, title, matter, task, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenant, id, init.title ?? null, init.matter ?? null, init.task ?? null, now, now],
    );
    return {
      id,
      ...(init.title === undefined ? {} : { title: init.title }),
      ...(init.matter === undefined ? {} : { matter: init.matter }),
      ...(init.task === undefined ? {} : { task: init.task }),
      createdAt: now,
      updatedAt: now,
      sessions: {},
    };
  }

  async update(tenant: Tenant, id: string, patch: { title?: string; matter?: string | null }): Promise<ThreadHeader> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    const before = this.readRow(tenant, id);
    const title = patch.title === undefined ? before.title : patch.title === '' ? null : patch.title;
    const matter = patch.matter === undefined ? before.matter : patch.matter;
    this.db.run('UPDATE threads SET title = ?, matter = ? WHERE tenant = ? AND id = ?', [title, matter, tenant, id]);
    return this.presentHeader(tenant, this.storedHeader(tenant, id));
  }

  async header(tenant: Tenant, id: string, opts: { derive?: boolean } = {}): Promise<ThreadHeader> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    const header = this.storedHeader(tenant, id);
    return opts.derive === false ? header : this.presentHeader(tenant, header);
  }

  async get(tenant: Tenant, id: string): Promise<{ header: ThreadHeader; events: ThreadEvent[] }> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    const header = this.storedHeader(tenant, id);
    return { header: this.presentHeader(tenant, header), events: this.readEvents(tenant, id) };
  }

  async list(tenant: Tenant): Promise<ThreadHeader[]> {
    assertThreadTenant(tenant);
    const rows = this.db
      .query('SELECT id FROM threads WHERE tenant = ? ORDER BY created_at, id')
      .all(tenant) as Array<Pick<ThreadRow, 'id'>>;
    return rows.map(row => this.presentHeader(tenant, this.storedHeader(tenant, row.id)));
  }

  async append(tenant: Tenant, id: string, event: ThreadEvent): Promise<void> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    this.db.transaction(() => {
      this.readRow(tenant, id);
      this.db.run('INSERT INTO thread_events (tenant, thread_id, event_json) VALUES (?, ?, ?)', [tenant, id, JSON.stringify(event)]);
      this.db.run('UPDATE threads SET updated_at = ? WHERE tenant = ? AND id = ?', [new Date().toISOString(), tenant, id]);
    })();
  }

  async setSession(tenant: Tenant, id: string, providerId: string, sessionId: string): Promise<void> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    this.db.transaction(() => {
      this.readRow(tenant, id);
      this.db.run(
        `INSERT INTO thread_sessions (tenant, thread_id, provider_id, session_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (tenant, thread_id, provider_id) DO UPDATE SET session_id = excluded.session_id`,
        [tenant, id, providerId, sessionId],
      );
      this.db.run('UPDATE threads SET updated_at = ? WHERE tenant = ? AND id = ?', [new Date().toISOString(), tenant, id]);
    })();
  }

  async clearSession(tenant: Tenant, id: string, providerId: string): Promise<void> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    this.readRow(tenant, id);
    const existing = this.db
      .query('SELECT 1 AS found FROM thread_sessions WHERE tenant = ? AND thread_id = ? AND provider_id = ?')
      .get(tenant, id, providerId) as { found: number } | null;
    if (existing === null) return;
    this.db.transaction(() => {
      this.db.run('DELETE FROM thread_sessions WHERE tenant = ? AND thread_id = ? AND provider_id = ?', [tenant, id, providerId]);
      this.db.run('UPDATE threads SET updated_at = ? WHERE tenant = ? AND id = ?', [new Date().toISOString(), tenant, id]);
    })();
  }

  async updateProposal(
    tenant: Tenant,
    id: string,
    proposalId: string,
    status: 'pending' | 'approved' | 'rejected',
  ): Promise<void> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    this.readRow(tenant, id);
    const rows = this.db
      .query('SELECT sequence, event_json FROM thread_events WHERE tenant = ? AND thread_id = ? ORDER BY sequence')
      .all(tenant, id) as EventRow[];
    this.db.transaction(() => {
      for (const row of rows) {
        const event = JSON.parse(row.event_json) as ThreadEvent;
        if ('t' in event && event.t === 'proposal' && event.id === proposalId) {
          this.db.run('UPDATE thread_events SET event_json = ? WHERE sequence = ?', [JSON.stringify({ ...event, status }), row.sequence]);
        }
      }
      this.db.run('UPDATE threads SET updated_at = ? WHERE tenant = ? AND id = ?', [new Date().toISOString(), tenant, id]);
    })();
  }

  async updateStep(
    tenant: Tenant,
    id: string,
    runId: string,
    patch: { task: string; taskSource: 'corrected' },
  ): Promise<boolean> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    this.readRow(tenant, id);
    const rows = this.db
      .query('SELECT sequence, event_json FROM thread_events WHERE tenant = ? AND thread_id = ? ORDER BY sequence')
      .all(tenant, id) as EventRow[];
    const matches: Array<{ sequence: number; event: Extract<ThreadEvent, { t: 'step' }> }> = [];
    for (const row of rows) {
      const event = JSON.parse(row.event_json) as ThreadEvent;
      if ('t' in event && event.t === 'step' && event.runId === runId) matches.push({ sequence: row.sequence, event });
    }
    if (matches.length === 0) return false;
    this.db.transaction(() => {
      for (const match of matches) {
        this.db.run('UPDATE thread_events SET event_json = ? WHERE sequence = ?', [JSON.stringify({ ...match.event, ...patch }), match.sequence]);
      }
    })();
    return true;
  }

  async remove(tenant: Tenant, id: string): Promise<void> {
    assertThreadTenant(tenant);
    assertThreadId(id);
    this.db.run('DELETE FROM threads WHERE tenant = ? AND id = ?', [tenant, id]);
    rmSync(this.codexHomeFor(id), { recursive: true, force: true });
  }

  codexHomeFor(id: string): string {
    assertThreadId(id);
    return join(this.codexHomeRoot, id);
  }

  close(): void {
    this.db.close();
  }
}
