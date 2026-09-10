/** Two bounded subscription checks, no client facts, no user workspace or automatic reruns. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import type { StepEvent, StepRequest } from '../runtime/src/core/types';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No calls made. Run two synthetic guide-selection checks with --live --allow-plan-usage --provider codex --model MODEL. No legal-source verification is measured.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-guide-selection-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const vendor = new WorkspaceCodexProvider(options.model);
  const chat = new WorkspaceChat(store, () => ({ id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(req: StepRequest): AsyncIterable<StepEvent> {
      yield* vendor.run({ ...req, signal: AbortSignal.any([req.signal!, AbortSignal.timeout(120_000)]) });
    },
  }));
  const stop = () => chat.stop();
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try {
    console.log(`Synthetic database retained: ${store.databasePath}`);
    const reports = [];
    for (const question of [
      { prompt: 'We are considering location tracking on staff work phones. Draft a short plan for evaluating it before any rollout. Locations and vendors are undecided. Do not reach a conclusion about legality.', expected: ['employment', 'privacy'] },
      { prompt: 'Hi there.', expected: [] },
    ]) {
      const conversation = store.conversations.create({});
      const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: question.prompt });
      await chat.idle();
      const turn = store.conversations.turn(started.id);
      const loaded = turn.state.guidesRead?.map(guide => guide.id).sort() ?? [];
      const checks = { complete: turn.status === 'complete', selectedExpectedGuides: JSON.stringify(loaded) === JSON.stringify(question.expected),
        guidesNotCitedAsEvidence: turn.state.citations.length === 0 && turn.state.context.length === 0,
        scopeUnchanged: store.conversations.get(conversation.id).scope === 'conversation',
        noApprovalOrMatterUpdate: !turn.state.proposalIds.length && !turn.state.briefProposal };
      reports.push({ prompt: question.prompt, checks, loaded, answer: turn.state.answer, error: turn.state.error });
      if (turn.status !== 'complete') break;
    }
    const passed = reports.length === 2 && reports.every(report => Object.values(report.checks).every(Boolean));
    console.log(JSON.stringify({ passed, reports, manualReview: 'Confirm no module choice requested, no claim of visiting source-map links or verifying current law, and no invented jurisdiction or client facts.' }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    chat.stop(); await chat.idle(); store.close();
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
  }
}
