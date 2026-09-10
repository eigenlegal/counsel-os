/** Opt-in, synthetic negotiation-round qualification. No real workspace or documents. */
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildDocx } from '../runtime/src/docx/test/builder';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No model call. Use --live --allow-plan-usage --provider codex --model MODEL.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-rounds-check-')), store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const provider = new WorkspaceCodexProvider(options.model);
  const chat = new WorkspaceChat(store, () => ({ id: provider.id, kind: provider.kind, capabilities: provider.capabilities,
    async *run(request) { yield* provider.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) }); } }));
  try {
    const sources = [];
    for (const [name, text] of [['Baseline.docx', 'Payment net 30.'], ['Sent.docx', 'Payment net 45.'], ['Returned.docx', 'Payment net 60.']]) {
      const bytes = buildDocx({ blocks: [{ runs: [text!] }, { runs: ['Notices must be in writing.'] }] });
      sources.push(await store.importDocument({ name: name!, base64: Buffer.from(bytes).toString('base64') }));
    }
    const conversation = store.conversations.create({});
    const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), attachments: sources.map(s => s.latest.id),
      message: 'The counterparty returned Returned.docx in response to Sent.docx. Baseline.docx is the version before our edits. What happened to our payment edit? Compare the rounds and cite the returned payment text. Do not update practice preferences or treat the returned draft as an agreement. This is synthetic workflow testing, not legal research.' });
    await chat.idle();
    const saved = store.conversations.turn(turn.id), report = saved.state.documentRound;
    const checks = { completed: saved.status === 'complete', usedComparison: !!report,
      correctRoles: report?.documents.find(d => d.role === 'sent')?.revisionId === sources[1]!.latest.id && report?.documents.find(d => d.role === 'returned')?.revisionId === sources[2]!.latest.id,
      baselineUsed: report?.documents.find(d => d.role === 'baseline')?.revisionId === sources[0]!.latest.id,
      modifiedPayment: report?.findings.some(f => f.our_text === 'Payment net 45.' && f.their_revised === 'Payment net 60.' && f.classification === 'MODIFIED'),
      exactReturnedCitation: saved.state.citations.some(c => c.target.kind === 'source' && c.target.revisionId === sources[2]!.latest.id && c.quote.includes('Payment net 60.')),
      noPracticeUpdates: saved.state.proposalIds.length === 0 && !saved.state.preferenceProposal,
      originalsUnchanged: sources.every(s => store.getSource(s.id).latest.id === s.latest.id) };
    console.log(JSON.stringify({ root, checks, answer: saved.state.answer }, null, 2));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
