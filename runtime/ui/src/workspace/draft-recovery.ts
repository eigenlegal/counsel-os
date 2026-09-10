import { request } from './api';
import type { SavedDraft } from '../../../src/workspace/draft-types';

type Value = SavedDraft['value'];
const writers = new Set<{ flush: () => Promise<boolean> }>();
declare global { interface Window { counselSaveDrafts?: () => Promise<boolean> } }
/** A web-only save hook. It exposes neither a token nor a native capability. */
export function installDraftRecovery() {
  window.counselSaveDrafts = async () => (await Promise.all([...writers].map(writer => writer.flush()))).every(Boolean);
}

/** Serial, revision-checked writes with an idempotent retry after lost responses. */
export class DraftRecovery<T extends Value> {
  value: T;
  ready = false;
  error = '';
  saving = false;
  private revision: string | null = null;
  private acknowledged: string;
  private pending: { key: string; expectedRevisionId: string | null; writeId: string; value: T } | null = null;
  private flight: Promise<boolean> | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private closed = false;
  private listeners = new Set<() => void>();
  constructor(readonly key: string, initial: T, private enabled: boolean, private legacyKey?: string,
    private call: typeof request = request, private empty: T = initial) {
    this.value = initial; this.acknowledged = JSON.stringify(initial);
    this.ready = !enabled;
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { for (const listener of this.listeners) listener(); }
  async open() {
    this.closed = false;
    if (!this.enabled) return;
    writers.add(this); installDraftRecovery();
    await this.load(this.value, true);
  }
  async load(fallback: T, migrate = false) {
    clearTimeout(this.timer);
    if (this.flight) await this.flight;
    this.ready = false; this.emit();
    try {
      const saved = await this.call<SavedDraft>(`/drafts?key=${encodeURIComponent(this.key)}`, undefined, AbortSignal.timeout(5000));
      if (this.closed) return;
      this.revision = saved.revisionId; this.pending = null; this.error = '';
      this.value = (saved.value ?? (migrate && saved.revisionId ? this.empty : fallback)) as T;
      this.acknowledged = JSON.stringify(this.value);
      this.ready = true;
      // A legacy tab draft is migrated only when no durable record (including a
      // discard tombstone) exists. It cannot overwrite another window's edit.
      let legacy = false;
      try { legacy = !!(migrate && !saved.revisionId && this.legacyKey && sessionStorage.getItem(this.legacyKey)); } catch { /* optional cache */ }
      const meaningful = this.value && ('message' in this.value ? this.value.message || this.value.attachments.length : true);
      if (legacy || (migrate && !saved.revisionId && meaningful)) { this.acknowledged = ''; this.schedule(); }
    } catch (e) { this.error = (e as Error).message; }
    this.emit();
  }
  reload() { return this.load(this.empty); }
  afterSend(empty: T) {
    clearTimeout(this.timer); this.value = empty; this.acknowledged = JSON.stringify(empty);
    this.pending = null; this.ready = false; this.emit(); return this.load(empty);
  }
  set(value: T | ((previous: T) => T)) {
    this.value = typeof value === 'function' ? value(this.value) : value;
    // This cache helps browser tabs recover failed writes; native durability is
    // provided only by an acknowledged workspace write.
    try { if (this.legacyKey) this.value === null ? sessionStorage.removeItem(this.legacyKey) : sessionStorage.setItem(this.legacyKey, JSON.stringify(this.value)); } catch { /* keep input in memory */ }
    this.schedule(); this.emit();
  }
  get dirty() { return this.enabled && JSON.stringify(this.value) !== this.acknowledged; }
  private schedule() {
    clearTimeout(this.timer);
    if (this.enabled && this.ready && this.dirty) {
      this.saving = true;
      this.timer = setTimeout(() => { void this.flush(); }, 250);
    }
  }
  async flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (!this.enabled) return true;
    if (!this.ready) return false;
    if (this.flight) { if (!await this.flight) return false; return this.flush(); }
    this.flight = this.write();
    const result = await this.flight; this.flight = null;
    return result;
  }
  private async write(): Promise<boolean> {
    try {
      while (this.pending || this.dirty) {
        this.saving = true; this.emit();
        this.pending ??= { key: this.key, expectedRevisionId: this.revision, writeId: crypto.randomUUID(), value: this.value };
        const sent = this.pending;
        const saved = await this.call<SavedDraft>('/drafts', sent, AbortSignal.timeout(5000));
        this.revision = saved.revisionId;
        this.acknowledged = JSON.stringify(sent.value); this.pending = null;
      }
      this.error = ''; return true;
    } catch (e) { this.error = (e as Error).message; return false; }
    finally { this.saving = false; this.emit(); if (this.closed && !this.dirty && !this.pending) writers.delete(this); }
  }
  close() {
    this.closed = true; clearTimeout(this.timer);
    void this.flush().then(ok => { if (ok || !this.ready) writers.delete(this); });
  }
}
