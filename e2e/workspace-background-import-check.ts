/** Opt-in live test: two bounded calls on synthetic text, never personal files. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { WorkspaceClaudeCodeProvider } from '../runtime/src/workspace/claude-code';
import { qualificationOptions } from '../runtime/src/workspace/qualification';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live') {
  console.log('No model call. Use --live --allow-plan-usage --provider codex|claude-code --model MODEL for a synthetic background-import check.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-background-import-check-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const vendor = options.provider === 'codex' ? new WorkspaceCodexProvider(options.model) : new WorkspaceClaudeCodeProvider(options.model);
  const chat = new WorkspaceChat(store, () => vendor);
  try {
    const employment = store.createMatter({ title: 'Northstar employment dispute', summary: 'Synthetic unrelated employment matter; never share this body with the importer.' });
    const files: Record<string, string> = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`Loose/2026/a${i}.txt`,
      `Synthetic negotiation note ${i}. Project Starling is our mutual NDA with Northstar Robotics. This note concerns the same Project Starling NDA negotiation, not Northstar's unrelated employment dispute. We accepted a three-year confidentiality term for this deal only; our practice baseline is unchanged.`]));
    files['Other folder/b.txt'] = 'Synthetic matter note: Northstar employment dispute. The employee interview remains outstanding. This is unrelated to Project Starling, which is a separate NDA negotiation.';
    files['z.txt'] = 'Synthetic company background: Northstar Robotics makes industrial robots. This is a company directory note, not a client engagement, signing-authority record, standard position or a specific deal.';
    const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Synthetic arbitrary-layout import',
      files: Object.entries(files).map(([path, body]) => ({ path, byteCount: Buffer.byteLength(body) })) });
    for (const entry of batch.entries) store.imports.receive(batch.id, entry.id, Buffer.from(files[entry.path]!).toString('base64'));
    await store.imports.idle();
    const ready = store.imports.get(batch.id);
    chat.startImportOrganization(batch.id, { requestId: crypto.randomUUID(), expectedRevisionId: ready.revisionId,
      modelChoice: { kind: options.provider, model: options.model }, shareForSuggestions: true });
    await chat.idle();
    const job = store.imports.organization.get(batch.id)!;
    const nda = job.suggestions.filter(item => item.path.startsWith('Loose/'));
    const dispute = job.suggestions.find(item => item.path === 'Other folder/b.txt');
    const background = job.suggestions.find(item => item.path === 'z.txt');
    const checks = { complete: job.status === 'complete', allAnalyzed: job.analyzed === 11, twoCalls: job.calls === 2,
      ndaGrouped: nda.length === 9 && !!nda[0]!.choice.matterTitle && new Set(nda.map(item => item.choice.matterTitle)).size === 1,
      noDealPromotion: nda.every(item => item.choice.destination === 'source' && item.choice.collection !== 'practice' && !item.choice.matterId),
      existingDispute: dispute?.choice.matterId === employment.id && !dispute.choice.matterTitle,
      companyNotForced: !!background && !background.choice.matterId && !background.choice.matterTitle && background.choice.destination === 'source',
      noPrematureChanges: store.imports.get(batch.id).revisionId === ready.revisionId && !store.catalog().sources.length && !store.catalog().knowledge.length };
    console.log(JSON.stringify({ root, checks, message: job.message,
      suggestions: job.suggestions.map(({ path, choice, confidence, reason }) => ({ path, choice, confidence, reason })) }, null, 2));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
