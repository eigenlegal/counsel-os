/** Explicitly opted-in live publisher + synthetic Codex citation qualification. */
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';

const statute = process.argv.includes('--statute');
const options = qualificationOptions(process.argv.slice(2).filter(arg => arg !== '--statute'));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No network or model call. Use --live --allow-plan-usage --provider codex --model MODEL.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-authority-check-')), store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const provider = new WorkspaceCodexProvider(options.model);
  const chat = new WorkspaceChat(store, () => ({ id: provider.id, kind: provider.kind, capabilities: provider.capabilities,
    async *run(request) { yield* provider.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) }); } }));
  try {
    const conversation = store.conversations.create({});
    const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(),
      message: statute ? 'Workflow test, no client matter: retrieve 15 USC 7001 from the government publisher. Read the beginning AND its effective-date notes; give a one-sentence description with verified citations. Distinguish the publisher laws-in-effect date, its separate public-law update marker/date and today’s retrieval date. Do not claim comprehensive currency verification. No substantive legal opinion, saved output or practice update is needed.' : 'Workflow test, no client matter: look up the latest available 31 CFR 1010.100 from the government publisher. Read the beginning and give a one-sentence description with one verified citation. State the publisher version date and distinguish it from today’s retrieval. No substantive legal opinion, saved output or practice update is needed.' });
    await chat.idle();
    const saved = store.conversations.turn(turn.id), receipt = saved.state.authorityLookups?.[0];
    const source = receipt ? store.getSource(receipt.sourceId) : null;
    const checks = { completed: saved.status === 'complete', publisherRetrieved: receipt?.publication.publisher === (statute ? 'uscode' : 'ecfr'),
      originalRetained: !!source && store.originalFile(source.latest.id).bytes.length > 0,
      verifiedCitation: saved.state.citations.some(c => c.target.kind === 'source' && c.target.revisionId === receipt?.revisionId),
      versionDateExplained: !!receipt && [receipt.publication.versionDate,
        new Date(receipt.publication.versionDate + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })].some(date => saved.state.answer.includes(date)),
      statuteCurrencyExplained: !statute || (receipt?.publication.publisher === 'uscode' && saved.state.answer.includes(receipt.publication.currentThroughPublicLaw)),
      noPracticeChanges: !saved.state.proposalIds.length && !saved.state.preferenceProposal };
    console.log(JSON.stringify({ root, checks, receipt, answer: saved.state.answer, error: saved.state.error }, null, 2));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
