import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { StepEvent, Tenant, ArtifactKind, ArtifactSummary } from '../core/types';

/**
 * Threads live under `<vaultRoot>/.counsel/threads/`, which `FsVaultStore.abs()`
 * deliberately rejects (that ban is on model-reachable tools). The runtime
 * itself is the intended writer of `.counsel/`, so this store talks to
 * `node:fs` directly instead of going through `VaultStore`.
 */
const THREADS_DIR = join('.counsel', 'threads');

// `tenant` and `id` both land directly in filesystem paths (`dir`/`headerPath`/
// `logPath`/`codexHomeFor`). Without validation a value like `../../etc` would
// escape the threads dir the same way `FsVaultStore` guards against for vault
// paths. Every public method validates both before touching disk.
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TENANT_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export interface ThreadHeader {
  id: string;
  title?: string;
  matter?: string;
  /** A task every step of this thread runs as, when the caller names none —
   * `retro` for a retro thread, whose system prompt carries the method and
   * the period's evidence. Absent for an ordinary conversation. */
  task?: string;
  createdAt: string;
  updatedAt: string;
  sessions: Record<string, string>;
}

export type ThreadEvent =
  | { t: 'user'; at: string; content: string }
  | { t: 'step'; at: string; runId: string; provider: string; task?: string; taskSource?: 'caller' | 'rule' | 'model' | 'default' | 'corrected' }
  // Spec §5's warning event: something the run recovered from, worth
  // showing in the transcript but not an `error` and not model output. The
  // resume-failure fallback is the first user — it records that the vendor
  // session was gone and the step replayed the history instead.
  | { t: 'warning'; at: string; message: string }
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
    }
  // A document the step produced (`apply_redlines`): where it was written,
  // what it was made from, and the counts the slip shows. Appended by the
  // tool itself, like a proposal; the loop synthesizes the matching
  // `artifact` StepEvent for live clients and never logs that one.
  | {
      t: 'artifact';
      at: string;
      id: string;
      kind: ArtifactKind;
      path: string;
      source: string;
      /** `docx-compare`: the revised document the source was compared against. */
      compared?: string;
      author: string;
      tracked: boolean;
      summary: ArtifactSummary;
    };

export interface ThreadStoreOptions {
  /** Overrides `~/.counsel-os/codex` for tests. */
  codexHomeRoot?: string;
}

/**
 * The title rule, server side: the first non-empty line, cut to 60
 * characters on a word boundary — the same rule the UI applies at creation
 * (`titleFor`, runtime/ui/src/v2/threads.ts; keep the two in step). It runs
 * at READ time for threads that never got a title: threads from before
 * titling existed (pre-v0.11) and threads other clients created bare, which
 * otherwise sit in the rail as `Untitled` rows forever (cou-88).
 */
const TITLE_MAX = 60;

function titleFrom(message: string): string {
  const first = message.split('\n').find(line => line.trim() !== '') ?? '';
  const line = first.trim();
  if (line.length <= TITLE_MAX) return line;
  const cut = line.slice(0, TITLE_MAX);
  const space = cut.lastIndexOf(' ');
  // A cut title says it was cut: "…and" read as a sentence that ends there.
  return `${(space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export class ThreadStore {
  private readonly root: string;
  private readonly codexHomeRoot: string;

  constructor(root: string, opts: ThreadStoreOptions = {}) {
    this.root = root;
    this.codexHomeRoot = opts.codexHomeRoot ?? join(homedir(), '.counsel-os', 'codex');
  }

  private validateTenant(tenant: Tenant): void {
    if (!TENANT_RE.test(tenant)) throw new Error('invalid tenant');
  }

  private validateId(id: string): void {
    if (!ID_RE.test(id)) throw new Error('invalid thread id');
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

  // `readHeader`/`writeHeader` are paired for read-modify-write updates in
  // `append`/`setSession`/`updateProposal`. That safety depends on those call
  // sites staying fully synchronous between the read and the write — no
  // `await` in between — since there is no per-thread lock and an interleaved
  // async update could otherwise clobber a concurrent one.
  private readHeader(tenant: Tenant, id: string): ThreadHeader {
    return JSON.parse(readFileSync(this.headerPath(tenant, id), 'utf8')) as ThreadHeader;
  }

  private writeHeader(tenant: Tenant, header: ThreadHeader): void {
    writeFileSync(this.headerPath(tenant, header.id), JSON.stringify(header, null, 2), 'utf8');
  }

  /**
   * The header as a reader should see it: an untitled thread borrows the
   * first line of its first user message as its title. Derived, never
   * written back — `append`/`setSession` do synchronous read-modify-writes
   * of the header, and a write from a `list` in flight could clobber one.
   * A thread with no user message at all stays untitled.
   */
  private presentHeader(tenant: Tenant, header: ThreadHeader): ThreadHeader {
    if ((header.title ?? '').trim() !== '') return header;
    let title = '';
    try {
      // Line-by-line, stopping at the first user event, so presenting a long
      // legacy transcript does not parse the whole log.
      for (const line of readFileSync(this.logPath(tenant, header.id), 'utf8').split('\n')) {
        if (line === '') continue;
        const ev = JSON.parse(line) as ThreadEvent;
        if ('t' in ev && ev.t === 'user') {
          title = titleFrom(ev.content);
          break;
        }
      }
    } catch {
      // A missing or corrupt log must not take the whole list down; the row
      // shows as Untitled and opening the thread reports the real error.
      return header;
    }
    return title === '' ? header : { ...header, title };
  }

  private readEvents(tenant: Tenant, id: string): ThreadEvent[] {
    const text = readFileSync(this.logPath(tenant, id), 'utf8');
    return text
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as ThreadEvent);
  }

  async create(tenant: Tenant, init: { title?: string; matter?: string; task?: string } = {}): Promise<ThreadHeader> {
    this.validateTenant(tenant);
    const id = randomUUID();
    const now = new Date().toISOString();
    const header: ThreadHeader = {
      id,
      title: init.title,
      matter: init.matter,
      ...(init.task === undefined ? {} : { task: init.task }),
      createdAt: now,
      updatedAt: now,
      sessions: {},
    };
    mkdirSync(this.dir(tenant), { recursive: true });
    this.writeHeader(tenant, header);
    writeFileSync(this.logPath(tenant, id), '', 'utf8');
    return header;
  }

  /**
   * Rename or re-link a thread. `updatedAt` is deliberately left alone: it
   * orders the rail by conversation activity, and housekeeping — a better
   * name, the right matter — is not a turn and must not jump the row to
   * the top. A `title` of `''` clears the name, so the thread falls back to
   * the derived one (`presentHeader`); `matter: null` unlinks.
   */
  async update(tenant: Tenant, id: string, patch: { title?: string; matter?: string | null }): Promise<ThreadHeader> {
    this.validateTenant(tenant);
    this.validateId(id);
    const header = this.readHeader(tenant, id);
    if (patch.title !== undefined) {
      if (patch.title === '') delete header.title;
      else header.title = patch.title;
    }
    if (patch.matter !== undefined) {
      if (patch.matter === null) delete header.matter;
      else header.matter = patch.matter;
    }
    this.writeHeader(tenant, header);
    return this.presentHeader(tenant, header);
  }

  /** The header alone, presented — for a caller that needs the thread's
   * matter or task before it has any reason to read the log. */
  async header(tenant: Tenant, id: string): Promise<ThreadHeader> {
    this.validateTenant(tenant);
    this.validateId(id);
    return this.presentHeader(tenant, this.readHeader(tenant, id));
  }

  async get(tenant: Tenant, id: string): Promise<{ header: ThreadHeader; events: ThreadEvent[] }> {
    this.validateTenant(tenant);
    this.validateId(id);
    return { header: this.presentHeader(tenant, this.readHeader(tenant, id)), events: this.readEvents(tenant, id) };
  }

  async list(tenant: Tenant): Promise<ThreadHeader[]> {
    this.validateTenant(tenant);
    const dir = this.dir(tenant);
    if (!existsSync(dir)) return [];
    const headers = readdirSync(dir)
      .filter(name => name.endsWith('.json'))
      .map(name => this.presentHeader(tenant, this.readHeader(tenant, name.slice(0, -'.json'.length))));
    headers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return headers;
  }

  async append(tenant: Tenant, id: string, ev: ThreadEvent): Promise<void> {
    this.validateTenant(tenant);
    this.validateId(id);
    // Read the header first — it doubles as the existence check for the
    // thread, so a missing/unknown thread throws before the log write below,
    // and never leaves behind an orphan `.jsonl`.
    const header = this.readHeader(tenant, id);
    writeFileSync(this.logPath(tenant, id), JSON.stringify(ev) + '\n', { flag: 'a' });
    header.updatedAt = new Date().toISOString();
    this.writeHeader(tenant, header);
  }

  async setSession(tenant: Tenant, id: string, providerId: string, sessionId: string): Promise<void> {
    this.validateTenant(tenant);
    this.validateId(id);
    const header = this.readHeader(tenant, id);
    header.sessions[providerId] = sessionId;
    header.updatedAt = new Date().toISOString();
    this.writeHeader(tenant, header);
  }

  /**
   * Forgets this thread's vendor session for `providerId` — the resume-failure
   * fallback (spec §5): when a vendor reports the session/thread is gone, the
   * loop drops the dead id and replays the log for that step instead. A
   * provider with no stored session is left untouched.
   */
  async clearSession(tenant: Tenant, id: string, providerId: string): Promise<void> {
    this.validateTenant(tenant);
    this.validateId(id);
    const header = this.readHeader(tenant, id);
    if (!(providerId in header.sessions)) return;
    delete header.sessions[providerId];
    header.updatedAt = new Date().toISOString();
    this.writeHeader(tenant, header);
  }

  async updateProposal(
    tenant: Tenant,
    id: string,
    proposalId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<void> {
    this.validateTenant(tenant);
    this.validateId(id);
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

  /** Rewrites one step event's task (a correction by the lawyer, spec §7)
   * the way `updateProposal` rewrites a proposal's status. */
  async updateStep(tenant: Tenant, id: string, runId: string, patch: { task: string; taskSource: 'corrected' }): Promise<boolean> {
    this.validateTenant(tenant);
    this.validateId(id);
    let found = false;
    const events = this.readEvents(tenant, id).map(ev => {
      if ('t' in ev && ev.t === 'step' && ev.runId === runId) {
        found = true;
        return { ...ev, ...patch };
      }
      return ev;
    });
    if (!found) return false;
    const logPath = this.logPath(tenant, id);
    const tmpPath = `${logPath}.tmp`;
    writeFileSync(tmpPath, events.map(ev => JSON.stringify(ev) + '\n').join(''), 'utf8');
    renameSync(tmpPath, logPath);
    return true;
  }

  async remove(tenant: Tenant, id: string): Promise<void> {
    this.validateTenant(tenant);
    this.validateId(id);
    rmSync(this.headerPath(tenant, id), { force: true });
    rmSync(this.logPath(tenant, id), { force: true });
    rmSync(this.codexHomeFor(id), { recursive: true, force: true });
  }

  codexHomeFor(id: string): string {
    this.validateId(id);
    return join(this.codexHomeRoot, id);
  }
}
