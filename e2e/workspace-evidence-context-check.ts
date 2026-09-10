/** Synthetic two-round evidence-following qualification. Never opens a user database. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import type { ModelProvider } from '../runtime/src/core/types';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No model calls. Two synthetic evidence-following requests, including a source revision between chats. Run with --live --allow-plan-usage --provider codex --model MODEL.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-evidence-context-check-'));
  let store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const vendor = new WorkspaceCodexProvider(options.model);
  const provider: ModelProvider = { id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    run: request => vendor.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) }) };
  let chat = new WorkspaceChat(store, () => provider);
  const stop = () => chat.stop();
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try {
    const matter = store.createMatter({ title: 'Synthetic Aster transfer' });
    const outside = store.createMatter({ title: 'Excluded synthetic matter' });
    const privateFile = store.createSource({ kind: 'reference', matterIds: [outside.id], revision: {
      title: 'OUTSIDE-SCOPE-CANARY', body: 'OUTSIDE-SCOPE-CANARY', provenance: { origin: 'fixture' },
    } });
    const quote = 'Certificate ZX-14 remains unsigned. Obtain the lender’s signed certificate; no response date is recorded.';
    const source = store.createSource({ kind: 'reference', matterIds: [matter.id], revision: {
      title: 'Correspondence 17', body: 'Background notes.\n'.repeat(1500) + quote, provenance: { origin: 'fixture' },
    } });
    store.recordWork({ matterId: matter.id, title: 'Earlier transfer advice', request: 'Original question', answer: 'The transfer cannot proceed yet. This is draft advice, not a recorded human decision.', evidence: [
      { target: { kind: 'source', revisionId: source.latest.id }, start: source.latest.body!.indexOf(quote), quote },
      { target: { kind: 'source', revisionId: privateFile.latest.id }, start: 0, quote: 'OUTSIDE-SCOPE-CANARY' },
    ] });
    for (let i = 0; i < 35; i++) store.createSource({ kind: 'reference', matterIds: [matter.id], revision: {
      title: `Transfer background ${i}`, body: 'General transfer process. No individual outcome is recorded.', provenance: { origin: 'fixture' },
    } });
    console.log(`Synthetic database retained: ${store.databasePath}`);
    const reports = [];
    let expectedRevision = source.latest.id;
    for (const [index, prompt] of [
      'What is blocking the transfer, and what should I follow up on? Do not update the brief.',
      'Has anything changed since our earlier transfer advice? Do not update the brief.',
    ].entries()) {
      if (index) {
        const revised = store.reviseSource(source.id, source.latest.id, { title: 'Correspondence 17',
          body: 'Certificate ZX-14 has been signed and received. Closing approval has not been recorded.', provenance: { origin: 'fixture:update' } });
        expectedRevision = revised.id;
        chat.stop(); await chat.idle();
        const path = store.databasePath; store.close(); store = new WorkspaceStore({ databasePath: path });
        chat = new WorkspaceChat(store, () => provider);
      }
      const turn = chat.start(store.conversations.create({ scope: 'matter', matterId: matter.id }).id,
        { clientId: crypto.randomUUID(), message: prompt });
      await chat.idle();
      const saved = store.conversations.turn(turn.id);
      const checks = {
        complete: saved.status === 'complete',
        followedEvidence: saved.state.preparedContext?.retrieval?.evidenceReads?.some(item => item.id === expectedRevision && item.relation === (index ? 'newer-version' : 'cited-version')) === true,
        readUnderlyingSource: saved.state.context.some(item => item.id === expectedRevision && item.ranges.length > 0),
        citedUnderlyingSource: saved.state.citations.some(item => item.target.kind === 'source' && item.target.revisionId === expectedRevision && saved.state.answer.includes(`[${item.key}]`)),
        noPrivateLeak: !JSON.stringify(saved.state).includes('OUTSIDE-SCOPE-CANARY') && !JSON.stringify(saved.state).includes(privateFile.latest.id),
        noSilentHistoricalRead: !index || !saved.state.context.some(item => item.id === source.latest.id),
        noPracticeChange: store.catalog().knowledge.length === 0,
        noBriefChange: store.matterBrief(matter.id) === null,
      };
      reports.push({ prompt, checks, answer: saved.state.answer, error: saved.state.error });
      if (saved.status !== 'complete') break;
    }
    const passed = reports.length === 2 && reports.every(report => Object.values(report.checks).every(Boolean));
    console.log(JSON.stringify({ passed, reports, manualReview: 'First: unsigned certificate, lender follow-up, no invented date. Second: signed certificate received, not proof of closing approval. Earlier draft is not a decision. No excluded content or invented legal authority.' }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    chat.stop(); await chat.idle(); store.close();
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
  }
}
