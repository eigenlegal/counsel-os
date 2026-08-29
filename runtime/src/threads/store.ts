import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { StepEvent, Tenant } from '../core/types';

/**
 * Threads live under `<vaultRoot>/.counsel/threads/`, which `FsVaultStore.abs()`
 * deliberately rejects (that ban is on model-reachable tools). The runtime
 * itself is the intended writer of `.counsel/`, so this store talks to
 * `node:fs` directly instead of going through `VaultStore`.
 */
const THREADS_DIR = join('.counsel', 'threads');

export interface ThreadHeader {
  id: string;
  title?: string;
  matter?: string;
  createdAt: string;
  updatedAt: string;
  sessions: Record<string, string>;
}

export type ThreadEvent =
  | { t: 'user'; at: string; content: string }
  | { t: 'step'; at: string; runId: string; provider: string; task?: string }
  | (StepEvent & { at: string })
  | {
      t: 'proposal';
      at: string;
      id: string;
      path: string;
      content: string;
      rationale: string;
      status: 'pending' | 'approved' | 'rejected';
      expectedVersion: string | null;
    };

export interface ThreadStoreOptions {
  /** Overrides `~/.counsel-os/codex` for tests. */
  codexHomeRoot?: string;
}

export class ThreadStore {
  private readonly root: string;
  private readonly codexHomeRoot: string;

  constructor(root: string, opts: ThreadStoreOptions = {}) {
    this.root = root;
    this.codexHomeRoot = opts.codexHomeRoot ?? join(homedir(), '.counsel-os', 'codex');
  }

  private dir(tenant: Tenant): string {
    return join(this.root, THREADS_DIR, tenant);
  }

  private headerPath(tenant: Tenant, id: string): string {
    return join(this.dir(tenant), `${id}.json`);
  }

  private logPath(tenant: Tenant, id: string): string {
    return join(this.dir(tenant), `${id}.jsonl`);
  }

  private readHeader(tenant: Tenant, id: string): ThreadHeader {
    return JSON.parse(readFileSync(this.headerPath(tenant, id), 'utf8')) as ThreadHeader;
  }

  private writeHeader(tenant: Tenant, header: ThreadHeader): void {
    writeFileSync(this.headerPath(tenant, header.id), JSON.stringify(header, null, 2), 'utf8');
  }

  private readEvents(tenant: Tenant, id: string): ThreadEvent[] {
    const text = readFileSync(this.logPath(tenant, id), 'utf8');
    return text
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as ThreadEvent);
  }

  async create(tenant: Tenant, init: { title?: string; matter?: string } = {}): Promise<ThreadHeader> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const header: ThreadHeader = {
      id,
      title: init.title,
      matter: init.matter,
      createdAt: now,
      updatedAt: now,
      sessions: {},
    };
    mkdirSync(this.dir(tenant), { recursive: true });
    this.writeHeader(tenant, header);
    writeFileSync(this.logPath(tenant, id), '', 'utf8');
    return header;
  }

  async get(tenant: Tenant, id: string): Promise<{ header: ThreadHeader; events: ThreadEvent[] }> {
    return { header: this.readHeader(tenant, id), events: this.readEvents(tenant, id) };
  }

  async list(tenant: Tenant): Promise<ThreadHeader[]> {
    const dir = this.dir(tenant);
    if (!existsSync(dir)) return [];
    const headers = readdirSync(dir)
      .filter(name => name.endsWith('.json'))
      .map(name => this.readHeader(tenant, name.slice(0, -'.json'.length)));
    headers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return headers;
  }

  async append(tenant: Tenant, id: string, ev: ThreadEvent): Promise<void> {
    writeFileSync(this.logPath(tenant, id), JSON.stringify(ev) + '\n', { flag: 'a' });
    const header = this.readHeader(tenant, id);
    header.updatedAt = new Date().toISOString();
    this.writeHeader(tenant, header);
  }

  async setSession(tenant: Tenant, id: string, providerId: string, sessionId: string): Promise<void> {
    const header = this.readHeader(tenant, id);
    header.sessions[providerId] = sessionId;
    header.updatedAt = new Date().toISOString();
    this.writeHeader(tenant, header);
  }

  async updateProposal(
    tenant: Tenant,
    id: string,
    proposalId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<void> {
    const events = this.readEvents(tenant, id).map(ev =>
      't' in ev && ev.t === 'proposal' && ev.id === proposalId ? { ...ev, status } : ev
    );
    const logPath = this.logPath(tenant, id);
    const tmpPath = `${logPath}.tmp`;
    writeFileSync(tmpPath, events.map(ev => JSON.stringify(ev) + '\n').join(''), 'utf8');
    renameSync(tmpPath, logPath);

    const header = this.readHeader(tenant, id);
    header.updatedAt = new Date().toISOString();
    this.writeHeader(tenant, header);
  }

  async remove(tenant: Tenant, id: string): Promise<void> {
    rmSync(this.headerPath(tenant, id), { force: true });
    rmSync(this.logPath(tenant, id), { force: true });
    rmSync(this.codexHomeFor(id), { recursive: true, force: true });
  }

  codexHomeFor(id: string): string {
    return join(this.codexHomeRoot, id);
  }
}
