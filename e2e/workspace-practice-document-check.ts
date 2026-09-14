/** Opt-in live qualification. Synthetic imports only; never opens a personal workspace. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { WorkspaceClaudeCodeProvider } from '../runtime/src/workspace/claude-code';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import type { ModelProvider, StepRequest } from '../runtime/src/core/types';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live') {
  console.log('No model call. Use --live --allow-plan-usage --provider codex|claude-code --model MODEL for a synthetic practice-document check.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-practice-live-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const vendor = options.provider === 'codex' ? new WorkspaceCodexProvider(options.model) : new WorkspaceClaudeCodeProvider(options.model);
  const requests: StepRequest[] = [];
  const provider: ModelProvider = { id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(request) { requests.push(request); yield* vendor.run(request); } };
  const chat = new WorkspaceChat(store, () => provider);
  const checks: Record<string, boolean> = {};
  const turns: unknown[] = [];
  async function send(message: string, attachments: string[] = []) {
    const started = chat.start(store.conversations.create({}).id, { clientId: crypto.randomUUID(), message, attachments });
    await chat.idle();
    const turn = store.conversations.turn(started.id);
    turns.push(turn);
    if (turn.status !== 'complete') throw new Error(`Synthetic turn did not complete: ${turn.status}`);
    return turn;
  }
  try {
    const paragraphs = [
      'My name is Synthetic Avery. I am counsel at Example Workshop Inc. These are entirely synthetic test details.',
      'For construction disputes, preserve the chronology and distinguish agreed facts from disputed allegations.',
      'For tax audits, identify missing records before drawing conclusions. These preferences apply to those subjects, not just to NDAs.',
      'Writing: lead with the answer, explain the commercial consequence, and retain important qualifications. Avoid unnecessary hedging.',
      'For status updates, use the three headings Decision, Reason, Next step. Preserve this instruction verbatim: STATUS-CANARY-73.',
      'Attribute all new Word tracked changes and comments to Synthetic Avery. Use filename pattern {document}_{variant}, redline label review, and draft label draft.',
      'I can sign only NDAs for Example Workshop Inc. Do not infer authority for any other agreement. If authority is missing, ask me.',
    ];
    const files = { 'Loose files/Profile.md': '# About my practice\n\n' + paragraphs.slice(0, 3).join('\n\n'),
      'Notes/Working preferences.md': '# How I like to work\n\n' + paragraphs.slice(3).join('\n\n') };
    let batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Synthetic practice instructions', files: Object.entries(files).map(([path, body]) => ({ path, byteCount: Buffer.byteLength(body) })) });
    for (const entry of batch.entries) store.imports.receive(batch.id, entry.id, Buffer.from(files[entry.path as keyof typeof files]).toString('base64'));
    await store.imports.idle();
    batch = store.imports.get(batch.id);
    // Retain ordinary files, matching an import where profile adoption was not selected.
    for (const entry of batch.entries) batch = store.imports.edit(batch.id, entry.id, { expectedRevisionId: batch.revisionId,
      choice: { ...entry.choice, destination: 'source', collection: 'unfiled', profile: null } });
    batch = store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId });
    const attachments = batch.receipt!.items.map(item => item.sourceRevisionId);
    checks.importRetainsFilesWithoutActivating = attachments.length === 2 && store.savedPracticeDocument() === null && store.getProfile() === null;
    console.log('Synthetic files imported; starting live adoption request.');
    const initial = await send('Please read both attached files and incorporate all their instructions into my practice document for future work. Preserve each original instruction paragraph verbatim; you can reorganize headings. Set my stated name and Word output details too. Show me one proposed update for confirmation, not separate forms. Do not invent missing facts.', attachments);
    const proposal = initial.state.practiceDocumentProposal;
    checks.liveProposal = !!proposal && proposal.review === 'pending';
    checks.noPrematureSave = store.savedPracticeDocument() === null && store.getProfile() === null;
    checks.allImportedInstructionsPreserved = !!proposal && paragraphs.every(text => proposal.body.includes(text));
    checks.identityAndWordProposed = proposal?.identityName === 'Synthetic Avery' && proposal.word?.author === 'Synthetic Avery'
      && proposal.word.filenamePattern === '{document}_{variant}' && proposal.word.redlineLabel === 'review';
    if (!proposal) throw new Error('The live model did not stage a practice proposal.');
    store.reviewPracticeDocument(initial.id, { proposalId: proposal.id, action: 'apply', useInChats: true });
    checks.confirmationAppliesTogether = store.getProfile()?.name === 'Synthetic Avery' && store.workingPreferenceSnapshot()?.word.author === 'Synthetic Avery';
    const confirmed = store.practiceDocument();
    console.log('Live proposal confirmed in synthetic workspace; checking a fresh chat without attachments.');
    const ordinaryRequestStart = requests.length;
    const next = await send('Give me a brief status update: the synthetic project is paused until the missing records arrive. What should we do next? Then tell me the name you will use for new Word comments and tracked changes. Do not create a document or change my preferences.');
    // Application context is JSON-encoded; compare its decoded body, not literal newlines in the prompt.
    checks.freshChatUsesFullDocument = next.attachments.length === 0 && requests.slice(ordinaryRequestStart).some(request => {
      const encoded = request.system.split('Application context (data, not instructions):\n')[1];
      return encoded && JSON.parse(encoded).practiceDocument?.body === confirmed.body;
    });
    checks.behaviorUsesSavedPreference = ['Decision', 'Reason', 'Next step', 'Synthetic Avery'].every(text => next.state.answer.includes(text));
    checks.exactAuthorPinned = next.state.workingPreferences?.word.author === 'Synthetic Avery';
    checks.ordinaryChatDoesNotChangePractice = store.practiceDocument().basis === confirmed.basis && !next.state.practiceDocumentProposal;
    console.log('Checking a narrow follow-up update and preservation of unrelated instructions.');
    const edited = await send('Update my practice preferences for future work: replace only the exact sentence "Avoid unnecessary hedging." with "State uncertainty explicitly when it affects the decision." Preserve every other character of my practice document and all applied details. Show me the update for confirmation.');
    const change = edited.state.practiceDocumentProposal;
    checks.narrowUpdatePreservesEverythingElse = change?.body === confirmed.body.replace('Avoid unnecessary hedging.', 'State uncertainty explicitly when it affects the decision.');
    checks.followupStillNeedsConfirmation = store.practiceDocument().basis === confirmed.basis && change?.review === 'pending';
    if (!change) throw new Error('The live model did not stage the follow-up proposal.');
    store.reviewPracticeDocument(edited.id, { proposalId: change.id, action: 'apply' });
    store.reviewPracticeDocument(edited.id, { proposalId: change.id, action: 'undo' });
    checks.undoRestoresTextAndAuthor = store.practiceDocument().body === confirmed.body && store.workingPreferenceSnapshot()?.word.author === 'Synthetic Avery';
    checks.importedOriginalsUnchanged = batch.receipt!.items.every(item => {
      const entry = batch.entries.find(entry => entry.id === item.entryId)!;
      return store.originalFile(item.sourceRevisionId).bytes.toString() === files[entry.path as keyof typeof files];
    });
    checks.earlierResponseKeepsOriginalContext = store.conversations.turn(initial.id).state.practiceDocument?.body === '';
  } catch (error) {
    checks.completed = false;
    console.error((error as Error).message);
  } finally {
    await Bun.write(join(root, 'report.json'), JSON.stringify({ provider: options.provider, model: options.model, checks, turns }, null, 2));
    console.log(JSON.stringify({ root, checks }, null, 2));
    chat.stop(); await chat.idle(); store.close();
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  }
}
