/** Two opt-in live checks on a fresh synthetic workspace. No user-database option. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import type { ModelProvider, StepEvent, StepRequest } from '../runtime/src/core/types';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No calls made. Use --live --allow-plan-usage --provider codex --model MODEL for two synthetic preference-loop checks.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-preference-loop-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const vendor = new WorkspaceCodexProvider(options.model);
  const provider: ModelProvider = { id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(request: StepRequest): AsyncIterable<StepEvent> {
      yield* vendor.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) });
    } };
  const chat = new WorkspaceChat(store, () => provider);
  try {
    console.log(`Synthetic preference loop retained: ${root}`);
    const baseline = store.saveWorkingPreferences({ expectedRevisionId: null, writingInstructions: 'Use concise prose.', ndaReview: 'Preserve acceptable wording.', authorMode: 'custom', customAuthor: 'Synthetic Avery', filenamePattern: '{document}_{variant}' });
    const first = chat.start(store.conversations.create({}).id, { clientId: crypto.randomUUID(), message:
      'For future NDA reviews, preserve acceptable counterparty language and explain material edits in short, practical comments. Save this as my NDA review approach; keep my other working preferences unchanged.' });
    await chat.idle();
    const turn = store.conversations.turn(first.id), proposal = turn.state.preferenceProposal;
    const checks = { completed: turn.status === 'complete', offeredReview: proposal?.review === 'pending',
      ndaOnly: JSON.stringify(Object.keys(proposal?.changes ?? {})) === JSON.stringify(['ndaReview']),
      unchangedBeforeReview: store.getWorkingPreferences()?.revisionId === baseline.revisionId,
      noPracticePositionCreated: store.catalog().knowledge.length === 0 };
    console.log(JSON.stringify({ phase: 'proposal', checks, answer: turn.state.answer, proposedInstructions: proposal?.changes, error: turn.state.error }, null, 2));
    if (Object.values(checks).some(value => !value) || !proposal) { process.exitCode = 1; }
    else {
      store.reviewPreferenceProposal(turn.id, { proposalId: proposal.id, action: 'apply' });
      const saved = store.getWorkingPreferences()!;
      const second = chat.start(store.conversations.create({}).id, { clientId: crypto.randomUUID(), message: 'How will you approach an NDA review for me?' });
      await chat.idle();
      const response = store.conversations.turn(second.id);
      const later = { completed: response.status === 'complete', exactSavedInstructionsSupplied: response.state.workingPreferences?.ndaReview === saved.ndaReview,
        noUnrequestedPreferenceChange: !response.state.preferenceProposal && store.getWorkingPreferences()?.revisionId === saved.revisionId,
        otherPreferencesPreserved: saved.writingInstructions === baseline.writingInstructions && saved.customAuthor === baseline.customAuthor && saved.filenamePattern === baseline.filenamePattern,
        earlierContextPreserved: store.conversations.turn(turn.id).state.workingPreferences?.ndaReview === baseline.ndaReview };
      console.log(JSON.stringify({ phase: 'later-chat', checks: later, answer: response.state.answer, error: response.state.error,
        manualReview: 'Check for preservation of acceptable language and short practical comments. This is bounded workflow evidence, not general provider qualification.' }, null, 2));
      if (Object.values(later).some(value => !value)) process.exitCode = 1;
    }
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
