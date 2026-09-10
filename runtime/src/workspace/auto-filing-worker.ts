import type { WorkspaceStore } from './store';
import type { SourceOrganizationSuggest, SourceOrganizationSuggestions } from './source-organization';
import type { z } from 'zod';

/** Automatic analysis only; review is always a separate local command. */
export class AutoFilingWorker {
  private stopped = true;
  private timer?: ReturnType<typeof setTimeout>;
  private task?: Promise<void>;
  private abort?: AbortController;
  constructor(private store: WorkspaceStore,
    private run: (input: z.input<typeof SourceOrganizationSuggest>, signal: AbortSignal) => Promise<SourceOrganizationSuggestions>,
    private busy: () => boolean) {}
  start() {
    if (!this.stopped) return;
    this.stopped = false; this.store.autoFiling.recover(); this.wake();
  }
  wake() {
    if (this.stopped || this.task) return;
    if (this.timer) clearTimeout(this.timer); this.timer = undefined;
    this.task = this.loop().finally(() => {
      this.task = undefined;
      if (!this.stopped) { this.timer = setTimeout(() => this.wake(), 1500); this.timer.unref?.(); }
    });
  }
  pause() { this.abort?.abort(); }
  stop() { this.stopped = true; if (this.timer) clearTimeout(this.timer); this.timer = undefined; this.pause(); }
  async idle() { await this.task; }
  private async loop() {
    while (!this.stopped && !this.busy() && this.store.autoFiling.settings()?.mode === 'running') {
      const claim = this.store.autoFiling.claim();
      if (!claim) return;
      const abort = new AbortController(); this.abort = abort;
      try {
        const sourceIds = claim.files.map(file => file.sourceId);
        const expectedVersion = this.store.previewSourceOrganization({ sourceIds }).expectedVersion;
        const response = await this.run({ sourceIds, expectedVersion, modelChoice: claim.modelChoice,
          shareForSuggestions: true, instruction: claim.instruction }, abort.signal);
        abort.signal.throwIfAborted(); this.store.autoFiling.complete(claim, response);
      } catch (error) {
        this.store.autoFiling.fail(claim, abort.signal.aborted ? 'AI filing stopped or was interrupted.' : (error as Error).message);
        return;
      } finally { this.abort = undefined; }
    }
  }
}
