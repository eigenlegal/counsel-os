/** Natural requests against a fictional imported practice. Never opens a user workspace. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import { seedPluginContext } from '../runtime/src/workspace/fixtures/plugin-context';
import type { Turn } from '../runtime/src/workspace/conversations';

const lawOnly = process.argv.includes('--law-only');
const options = qualificationOptions(process.argv.slice(2).filter(arg => arg !== '--law-only'));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No calls made. Five synthetic context checks: --live --allow-plan-usage --provider codex --model MODEL. No user data, real legal claims, settings changes or automatic reruns.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-context-qualification-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const ids = seedPluginContext(store);
  const vendor = new WorkspaceCodexProvider(options.model);
  const chat = new WorkspaceChat(store, () => ({ id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(request) { yield* vendor.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) }); } }));
  const stop = () => chat.stop();
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  const reports: unknown[] = [];
  try {
    console.log(`Synthetic database retained: ${store.databasePath}`);
    const matter = store.conversations.create({ scope: 'matter', matterId: ids.matters.aster });
    const general = store.conversations.create({});
    const cite = (turn: Turn, id: string) => turn.state.citations.some(c => c.target.kind === 'source' && c.target.revisionId === id);
    const baseChecks = (turn: Turn) => ({ complete: turn.status === 'complete',
      noOutsideLeak: !JSON.stringify(turn.state).match(/OUTSIDE-SCOPE-CANARY|PRIVATE-PROFILE/),
      noUnrequestedPracticeChange: turn.state.proposalIds.every(id => store.getKnowledge(id).matterId !== null) });
    const capture = (label: string, turn: Turn, checks: Record<string, boolean>) => {
      const report = { label, checks: { ...baseChecks(turn), ...checks }, answer: turn.state.answer,
        error: turn.state.error, automaticallyPrepared: turn.state.preparedContext?.records.length ?? 0,
        reads: turn.state.context.filter(c => c.ranges.length).map(c => ({ title: c.title, category: c.category })),
        citations: turn.state.citations.map(c => ({ title: c.title, quote: c.quote })) };
      reports.push(report); console.log(JSON.stringify(report, null, 2));
      return Object.values(report.checks).every(Boolean);
    };
    const begin = (id: string, message: string) => chat.start(id, { clientId: crypto.randomUUID(), message });
    const review = begin(matter.id, 'Can we approve the proposed employee monitoring policy? Give me a concise recommendation.');
    const baseline = lawOnly ? null : begin(general.id, 'What is our usual position on employee location retention?');
    await chat.idle();
    let passed = true;
    const reviewed = store.conversations.turn(review.id);
    passed = capture('Policy assessment without tool instructions', reviewed, {
      citedMatter: cite(reviewed, ids.sourceRevisions.note!),
      citedPractice: cite(reviewed, ids.sourceRevisions.position!),
      citedLaw: cite(reviewed, ids.sourceRevisions.employment!) || cite(reviewed, ids.sourceRevisions.privacy!),
      readMethod: reviewed.state.context.some(c => c.id === ids.sourceRevisions.method && c.ranges.length > 0),
    }) && passed;
    if (!lawOnly) {
    const position = store.conversations.turn(baseline!.id);
    passed = capture('Baseline without choosing a matter or attaching practice files', position, {
      citedBaseline: cite(position, ids.sourceRevisions.position!),
      didNotShareMatter: !JSON.stringify(position.state).includes(ids.sourceRevisions.note!),
      unchangedStandard: store.getKnowledge(ids.knowledge.position!).active === null,
    }) && passed;
    const status = begin(matter.id, 'Where are we, and what should I follow up on?');
    await chat.idle();
    const statusTurn = store.conversations.turn(status.id);
    passed = capture('Historical status follow-up', statusTurn, { citedUnderlyingNote: cite(statusTurn, ids.sourceRevisions.note!) }) && passed;
    const exception = begin(matter.id, 'We accepted 30 days on this deal. Does that change our usual position?');
    await chat.idle();
    const exceptionTurn = store.conversations.turn(exception.id);
    passed = capture('Concession does not become a standard', exceptionTurn, {
      citedBaseline: cite(exceptionTurn, ids.sourceRevisions.position!),
      baselineUnchanged: store.getKnowledge(ids.knowledge.position!).active === null,
    }) && passed;
    // Explicit synthetic human change, not a model inference or update to user data.
    const previous = store.getKnowledge(ids.knowledge.position!);
    store.reviseKnowledge(previous.id, previous.latest.id, { title: previous.latest.title,
      body: 'Our updated standard is a 12-day maximum for employee location retention.', status: 'approved', approvedBy: 'Synthetic Lawyer' });
    const active = store.getKnowledge(previous.id).active!;
    const changed = begin(store.conversations.create({}).id, 'What is our usual position on employee location retention?');
    await chat.idle();
    const changedTurn = store.conversations.turn(changed.id);
    passed = capture('A new chat uses the explicitly updated baseline', changedTurn, {
      citedNewBaseline: changedTurn.state.citations.some(c => c.target.kind === 'knowledge' && c.target.revisionId === active.id),
      oldBaselineNotAutomaticallyShared: !changedTurn.state.contextLibrary?.records.some(c => c.id === ids.sourceRevisions.position),
    }) && passed;
    }
    console.log(JSON.stringify({ passed, responses: reports.length,
      manualReview: 'Check 14-day baseline versus 30-day proposal, missing HR notice and on-hold rollout; saved Fictionland law is explicitly synthetic/unverified. Concession must not change baseline. Last answer must use the explicit 12-day replacement, not old clause language. Structural passing is not full legal-work qualification.' }));
    if (!passed) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}
