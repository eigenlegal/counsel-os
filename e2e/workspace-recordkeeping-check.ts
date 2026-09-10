/** Only synthetic data; live mode explicitly consumes subscription usage. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import { seedPluginContext } from '../runtime/src/workspace/fixtures/plugin-context';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No calls made. Three synthetic checks: --live --allow-plan-usage --provider codex --model MODEL. No user workspace or real legal data.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-recordkeeping-check-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const ids = seedPluginContext(store), vendor = new WorkspaceCodexProvider(options.model);
  const chat = new WorkspaceChat(store, () => ({ id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(request) { yield* vendor.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) }); } }));
  try {
    console.log(`Synthetic workspace retained: ${store.databasePath}`);
    store.saveMatterBrief(ids.matters.aster!, { expectedRevisionId: null, status: 'on-hold', summary: 'Awaiting the HR notice; rollout is on hold.', questions: 'Has HR supplied the notice?', nextActions: 'Obtain the HR notice and review the policy.' });
    const matter = store.conversations.create({ scope: 'matter', matterId: ids.matters.aster! });
    const general = store.conversations.create({});
    const start = (id: string, message: string) => chat.start(id, { clientId: crypto.randomUUID(), message });
    const notes = start(matter.id, 'HR has now supplied the employee notice. We have not reviewed it yet, and rollout should remain on hold. What is the next step?');
    const change = start(general.id, 'Going forward, change our employee monitoring retention standard from 14 to 12 days. Keep the purpose and access-control requirements.');
    await chat.idle();
    const noted = store.conversations.turn(notes.id), changed = store.conversations.turn(change.id);
    const item = store.getKnowledge(ids.knowledge.position!);
    const initialChecks = { matterResponseComplete: noted.status === 'complete', automaticNotes: noted.state.briefProposal?.mode === 'automatic' && noted.state.briefProposal.review === 'applied', statusUnchanged: store.matterBrief(ids.matters.aster!)?.status === 'on-hold',
      practiceResponseComplete: changed.status === 'complete', updatedSameItem: changed.state.proposalIds.length === 1 && changed.state.proposalIds[0] === item.id,
      pendingNotApproved: item.latest.number === 2 && item.latest.status === 'pending' && item.active === null,
      noDuplicate: store.catalog().knowledge.length === 4,
      noUnrelatedMatter: !JSON.stringify([noted.state, changed.state]).match(/OUTSIDE-SCOPE-CANARY|PRIVATE-PROFILE/) };
    console.log(JSON.stringify({ checks: initialChecks, matterAnswer: noted.state.answer, brief: store.matterBrief(ids.matters.aster!), practiceAnswer: changed.state.answer, proposal: item.latest.body }, null, 2));
    let passed = Object.values(initialChecks).every(Boolean);
    if (initialChecks.pendingNotApproved && initialChecks.updatedSameItem) {
      // A synthetic human action, never an inference or an actual user approval.
      store.reviseKnowledge(item.id, item.latest.id, { title: item.latest.title, body: item.latest.body, status: 'approved', approvedBy: 'Synthetic Lawyer' });
      const active = store.getKnowledge(item.id).active!;
      const recall = start(store.conversations.create({}).id, 'What is our usual employee location retention position?');
      await chat.idle();
      const recalled = store.conversations.turn(recall.id);
      const checks = { complete: recalled.status === 'complete', citedNewVersion: recalled.state.citations.some(c => c.target.kind === 'knowledge' && c.target.revisionId === active.id), noNewProposal: recalled.state.proposalIds.length === 0 };
      console.log(JSON.stringify({ checks, answer: recalled.state.answer, citations: recalled.state.citations }, null, 2));
      passed &&= Object.values(checks).every(Boolean);
    }
    console.log(JSON.stringify({ passed, review: 'Manually check that HR receipt is distinguished from legal review, rollout stays on hold, and the 12-day standard preserves purpose/access requirements. Bounded workflow smoke, not legal-quality qualification.' }));
    if (!passed) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
