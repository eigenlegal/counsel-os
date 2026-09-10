/** Opt-in synthetic import helper check. Never opens an existing workspace or user file. */
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import type { ModelProvider } from '../runtime/src/core/types';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No model call. Use --live --allow-plan-usage --provider codex --model MODEL for one synthetic check.');
} else {
  const store = new WorkspaceStore({ databasePath: ':memory:' });
  const vendor = new WorkspaceCodexProvider(options.model);
  const provider: ModelProvider = { id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(request) {
      for await (const event of vendor.run(request)) {
        if (event.type === 'done' || event.type === 'error') console.log(JSON.stringify({ syntheticProviderResult: event }));
        yield event;
      }
    } };
  const chat = new WorkspaceChat(store, () => provider);
  try {
    const matter = store.createMatter({ title: 'Northstar NDA', summary: 'PRIVATE MATTER BODY: do not share with import helper.' });
    const texts: Record<string, string> = {
      'Northstar/negotiation-notes.txt': 'Northstar NDA negotiation notes. We accepted a three-year term for this deal only. Our usual position is unchanged.',
      'research/external-commentary.txt': 'External commentary by a third-party publisher. A synthetic reference article about negotiation techniques; not the lawyer’s own standard or method.',
    };
    const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Synthetic organization check',
      files: Object.entries(texts).map(([path, body]) => ({ path, byteCount: Buffer.byteLength(body) })) });
    for (const entry of batch.entries) store.imports.receive(batch.id, entry.id, Buffer.from(texts[entry.path]!).toString('base64'));
    await store.imports.idle();
    const before = store.imports.get(batch.id);
    const result = await chat.organizeImport(batch.id, { expectedRevisionId: before.revisionId,
      entryIds: before.entries.map(entry => entry.id), shareForSuggestions: true,
      instruction: 'Help me organize these files. This is a synthetic workflow test.',
      modelChoice: { kind: 'codex', model: options.model } }, new AbortController().signal);
    const notes = result.suggestions.find(item => item.path.includes('negotiation-notes'))!, research = result.suggestions.find(item => item.path.includes('external-commentary'))!;
    const checks = { matterMatched: notes.choice.matterId === matter.id, noPracticePromotion: notes.choice.destination === 'source' && notes.choice.collection !== 'practice',
      externalClassified: research.choice.destination === 'source' && research.choice.collection === 'external' && !research.choice.matterId && !research.choice.matterTitle,
      choicesUnchanged: store.imports.get(batch.id).revisionId === before.revisionId,
      nothingImported: !store.catalog().sources.length && !store.catalog().knowledge.length && !store.conversations.list().length };
    console.log(JSON.stringify({ checks, suggestions: result.suggestions }, null, 2));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
