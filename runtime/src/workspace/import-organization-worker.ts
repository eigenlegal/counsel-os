import type { WorkspaceStore } from './store';
import type { ModelChoice } from './model-choice';
import type { ImportOrganizeInput, ImportOrganizationResult } from './import-organization';
import type { z } from 'zod';

type Run = (id: string, input: z.input<typeof ImportOrganizeInput>, signal: AbortSignal,
  groups: Array<{ title: string; evidence: string }>, retryReason?: string) => Promise<ImportOrganizationResult>;

/** One serial, app-owned dispatcher. Browser requests only start/control it. */
export class ImportOrganizationWorker {
  private task?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private abort?: AbortController;
  private stopped = false;
  private again = false;
  private activeBatch?: string;
  constructor(private store: WorkspaceStore, private run: Run) {}
  recover() { this.store.imports.organization.recover(); }
  wake() {
    if (this.stopped || this.timer) return;
    if (this.task) { this.again = true; return; }
    this.task = this.loop().finally(() => { this.task = undefined; if (this.again) { this.again = false; this.wake(); } });
  }
  pause(batchId?: string) { if (!batchId || batchId === this.activeBatch) this.abort?.abort(); }
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (!this.task && !this.timer) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    const id = this.store.imports.organization.running();
    if (id) this.store.imports.organization.change(id, 'paused', 'The application stopped. Completed suggestions are kept; resume when ready.');
    this.pause();
  }
  async idle() { await this.task; }
  private async loop() {
    const jobs = this.store.imports.organization;
    while (!this.stopped) {
      const id = jobs.running();
      if (!id) return;
      this.activeBatch = id;
      let callRevision: string | undefined;
      try {
        const next = jobs.next(id);
        if (next.waiting) {
          this.timer = setTimeout(() => { this.timer = undefined; this.wake(); }, 1000);
          return;
        }
        if (!next.entries.length) { jobs.change(id, 'complete', 'Clear filing choices are prepared. Any uncertain or unsuccessful files are set aside for review. Nothing has been imported or shared with a matter yet.'); continue; }
        // Includes the whole-batch locality/processing check before any provider resolution.
        const files = this.store.imports.organizationInput(id, next.revisionId, next.entries, true);
        const groups = jobs.groups(id, files.map(file => `${file.path} ${file.text}`).join('\n'));
        const state = jobs.beginCall(id);
        callRevision = state.revisionId;
        const abort = new AbortController(); this.abort = abort;
        const result = await this.run(id, { expectedRevisionId: next.revisionId, entryIds: next.entries,
          instruction: state.request.instruction, modelChoice: state.request.modelChoice as ModelChoice,
          shareForSuggestions: true }, abort.signal, groups, next.retryReason);
        abort.signal.throwIfAborted();
        const returned = [...result.suggestions, ...(result.failures ?? [])].map(item => item.entryId);
        if (result.revisionId !== next.revisionId || returned.length !== next.entries.length || new Set(returned).size !== returned.length
          || returned.some(entryId => !next.entries.includes(entryId))) throw new Error('The organization response did not match the selected files.');
        jobs.saveResults(id, state.revisionId, result.suggestions.map(item => ({ ...item, sharedMatters: result.sharedMatters, sharedGroups: groups })), result.failures);
      } catch (error) {
        if (!this.stopped && jobs.running() === id && (!callRevision || jobs.get(id)?.revisionId === callRevision))
          jobs.change(id, 'failed', `${(error as Error).message} Completed suggestions are kept. Resume when ready; the interrupted request may have used your plan.`);
        return;
      } finally { this.abort = undefined; this.activeBatch = undefined; }
    }
  }
}
