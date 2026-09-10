/** One opt-in synthetic filing-helper run. No existing workspace or user files. */
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No model call. Use --live --allow-plan-usage --provider codex --model MODEL for one synthetic check.');
} else {
  const store = new WorkspaceStore({ databasePath: ':memory:' }), chat = new WorkspaceChat(store, () => new WorkspaceCodexProvider(options.model));
  try {
    const matter = store.createMatter({ title: 'Northstar NDA', summary: 'Do not share the private matter body with the filing helper.' });
    const notes = store.createSource({ kind: 'document', revision: { title: 'Northstar NDA negotiation notes', body: 'Northstar NDA negotiation notes. We accepted a three-year term for this deal only. Our usual position is unchanged.', provenance: { origin: 'fixture:notes' } } });
    const research = store.createSource({ kind: 'document', revision: { title: 'External commentary', body: 'External commentary by a third-party publisher. A synthetic reference article, not the lawyer’s own standard or method.', provenance: { origin: 'fixture:research' } } });
    const sourceIds = [notes.id, research.id], before = store.previewSourceOrganization({ sourceIds });
    const result = await chat.organizeSources({ sourceIds, expectedVersion: before.expectedVersion, shareForSuggestions: true,
      instruction: 'Suggest filing for these synthetic test files, without changing our practice standards.', modelChoice: { kind: 'codex', model: options.model } }, new AbortController().signal);
    const noteChoice = result.suggestions.find(item => item.sourceId === notes.id)!, researchChoice = result.suggestions.find(item => item.sourceId === research.id)!;
    const checks = { matterMatched: noteChoice.target.collection === 'matter' && noteChoice.target.matterId === matter.id,
      externalClassified: researchChoice.target.collection === 'external',
      noAutomaticFiling: store.previewSourceOrganization({ sourceIds }).expectedVersion === before.expectedVersion,
      noPracticeOrChatChanges: !store.catalog().knowledge.length && !store.conversations.list().length };
    console.log(JSON.stringify({ checks, suggestions: result.suggestions }, null, 2));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
