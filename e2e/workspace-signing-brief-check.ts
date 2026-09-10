/** Two opt-in synthetic runs: signing-rule tools and read-only matter-brief drafting. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { EntityRegistryFields } from '../runtime/src/workspace/entities';
import { qualificationOptions } from '../runtime/src/workspace/qualification';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No model calls. Use --live --allow-plan-usage --provider codex --model MODEL for two synthetic checks.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-signing-brief-check-'));
  let store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const chat = new WorkspaceChat(store, () => new WorkspaceCodexProvider(options.model));
  try {
    console.log(`Synthetic qualification retained: ${root}`);
    const entityId = crypto.randomUUID(), nda = crypto.randomUUID(), vendor = crypto.randomUUID(), fallback = crypto.randomUUID();
    const registry = store.saveEntityRegistry({ expectedRevisionId: null, ...EntityRegistryFields.parse({
      availableToChats: true,
      entities: [{ id: entityId, name: 'Synthetic Willow LLC', noticeAddress: '123 Fictional Lane, Test City' }],
      signatories: [{ id: nda, name: 'Synthetic Alex' }, { id: vendor, name: 'Synthetic Blake' }, { id: fallback, name: 'Synthetic Casey' }],
      rules: [
        { id: crypto.randomUUID(), label: 'NDAs only', entityIds: [entityId], agreementKinds: ['nda'], signatoryId: nda },
        { id: crypto.randomUUID(), label: 'Vendor annual-spend limit', entityIds: [entityId], agreementKinds: ['vendor'], signatoryId: vendor,
          valueLimit: { maximum: '100000', currency: 'USD', basis: 'annual' } },
        { id: crypto.randomUUID(), label: 'Other known scenarios', entityIds: [entityId], agreementKinds: ['nda', 'vendor', 'other'], signatoryId: fallback, fallback: true },
      ],
    }) });
    store.saveWorkingPreferences({ expectedRevisionId: null, writingInstructions: 'Be concise. Distinguish saved facts from draft suggestions. Do not guess missing facts.' });
    const matter = store.createMatter({ title: 'Synthetic Willow consent', summary: 'Imported plugin note; details not yet summarized.' });
    const noteText = 'Synthetic history, June 3: Willow requested novation consent. June 10: the counterparty requested a financial statement and has not granted consent. Maya owns sending the statement. No signing or completion has been recorded.';
    const note = store.createSource({ kind: 'reference', matterIds: [matter.id], revision: {
      title: 'Imported Willow matter history', body: noteText, provenance: { origin: 'plugin:matters/synthetic-willow.md' },
    } });
    const advice = store.recordWork({ matterId: matter.id, title: 'Draft next-step advice', request: 'What could we do?',
      answer: 'Draft suggestion only: request a response after the financial statement is sent. No follow-up deadline or completion has been confirmed.' });
    const other = store.createMatter({ title: 'Unselected private matter' });
    const forbidden = 'OTHER-MATTER-ONLY-CANARY';
    store.createSource({ kind: 'reference', matterIds: [other.id], revision: {
      title: 'Unselected private history', body: forbidden, provenance: { origin: 'fixture:private' },
    } });
    const briefPromise = chat.draftBrief({ matterId: matter.id, expectedRevisionId: null,
      instruction: 'Use the imported matter history and draft advice to summarize where the novation consent stands, what is unresolved, and the next action. Do not save or close the matter.',
      draft: { status: 'open', summary: matter.summary, questions: '', nextActions: '' },
      modelChoice: { kind: 'codex', model: options.model } }, new AbortController().signal);
    const conversation = store.conversations.create({});
    const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), message:
      'Synthetic workflow test only. For Synthetic Willow LLC, tell me the recorded notice address and who the saved rules suggest should sign each of four separate scenarios: (1) an NDA; (2) a vendor agreement at exactly USD 100,000 annual spend; (3) a vendor agreement at USD 100,000.01 annual spend; (4) a vendor agreement with USD 90,000 total contract value but unknown annual spend. Do not infer the annual value from the total. Use the recorded rules, not legal research, and do not modify any records or execute anything.' });
    const [brief] = await Promise.all([briefPromise, chat.idle()]);
    const turn = store.conversations.turn(started.id), receipts = turn.state.signatoryChecks ?? [];
    const matching = (amount: string) => receipts.find(item => item.input.agreementKind === 'vendor' &&
      item.input.amount !== null && Number(item.input.amount) === Number(amount) && item.input.valueBasis === 'annual');
    const briefText = JSON.stringify(brief.draft);
    const checks = {
      signingComplete: turn.status === 'complete',
      entityRead: turn.state.entitiesRead?.includes(entityId) === true && turn.state.answer.includes('123 Fictional Lane'),
      ndaOnly: receipts.some(item => item.input.agreementKind === 'nda' && item.signatory?.id === nda),
      inclusiveAnnualLimit: matching('100000')?.signatory?.id === vendor,
      aboveAnnualLimit: matching('100000.01')?.signatory?.id === fallback,
      unknownAnnualNeedsInformation: receipts.some(item => item.input.agreementKind === 'vendor' &&
        (item.input.valueBasis === 'total' || item.input.valueBasis === null || item.input.amount === null) &&
        item.outcome === 'needs-information' && item.signatory === null),
      noRegistryChanges: store.getEntityRegistry()?.revisionId === registry.revisionId,
      historyActuallyRead: brief.records.some(item => item.id === note.latest.id && item.passages.some(passage => passage.text === noteText)),
      adviceActuallyRead: brief.records.some(item => item.id === advice.id),
      unresolvedConsentPreserved: brief.draft.status === 'open' && /consent/i.test(briefText) && /pending|not (?:yet )?(?:granted|received)|outstanding|await/i.test(briefText),
      concreteNextStep: /Maya/.test(briefText) && /financial statement/i.test(briefText),
      noOutOfScopeContext: !JSON.stringify(brief).includes(forbidden),
      noAutomaticBriefOrPracticeChange: store.matterBrief(matter.id) === null && store.getMatter(matter.id).summary === matter.summary && store.catalog().knowledge.length === 0,
    };
    await Bun.write(join(root, 'brief-result.json'), JSON.stringify(brief, null, 2));
    const savedState = JSON.stringify(turn.state);
    chat.stop(); await chat.idle(); store.close();
    store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
    const reopened = JSON.stringify(store.conversations.turn(turn.id).state) === savedState;
    console.log(JSON.stringify({ checks: { ...checks, exactReopen: reopened }, signingAnswer: turn.state.answer,
      signatoryChecks: receipts, brief: brief.draft }, null, 2));
    if (!reopened || Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
