/** Opt-in synthetic subscription qualification; never opens a user's workspace. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import { openDocx } from '../runtime/src/docx/package';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live' || options.provider !== 'codex') {
  console.log('No model calls. Use --live --allow-plan-usage --provider codex --model MODEL for two synthetic checks.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-preferences-check-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const vendor = new WorkspaceCodexProvider(options.model);
  const chat = new WorkspaceChat(store, () => vendor);
  try {
    console.log(`Synthetic qualification retained: ${root}`);
    const result = await chat.draftPractice({ instruction: 'Turn these rough notes into a concise method for reviewing NDAs: preserve acceptable language, make surgical changes, explain material edits in comments. Do not add legal standards.',
      draft: { title: '', body: '', kind: 'method' }, matterId: null,
      modelChoice: { kind: 'codex', model: options.model } }, new AbortController().signal);
    if (result.question || !result.body || store.listWork().length || store.conversations.list().length || store.catalog().knowledge.length)
      throw new Error('Inline drafting failed or created a record.');
    console.log(JSON.stringify({ inlineDraft: result, noWorkspaceRecordsCreated: true }));
    store.saveWorkingPreferences({ expectedRevisionId: null, generalReview: 'Preserve the existing structure and make only requested edits.',
      ndaReview: 'For NDA work, begin each new Word comment with "Review note:" and briefly explain the change. Do not add comments to unchanged text.',
      authorMode: 'custom', customAuthor: 'Synthetic Avery', filenamePattern: '{document}_{variant}_{author}' });
    const work = store.recordWork({ title: 'Synthetic mutual NDA', request: 'Synthetic fixture only',
      answer: '# Synthetic mutual NDA\n\nThe parties will keep disclosed information confidential.\n\n## Notices\n\nNotices may be given orally.\n\n## Purpose\n\nThe parties are discussing a synthetic demonstration. No real parties or legal advice are involved.' });
    const original = await store.exports.create(work.id), bytes = store.exports.download(original.id).bytes;
    await Bun.write(join(root, 'original.docx'), bytes);
    const source = await store.importDocument({ name: 'Synthetic mutual NDA.docx', base64: Buffer.from(bytes).toString('base64') });
    const conversation = store.conversations.create({});
    const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), attachments: [source.latest.id],
      message: 'In the attached NDA, change "Notices may be given orally." to "Notices must be given in writing." and add one brief Word comment explaining this requested change. Leave everything else unchanged. This is a synthetic workflow test, not a request for legal research.' });
    await chat.idle();
    const turn = store.conversations.turn(started.id), file = turn.state.redline?.file;
    if (!file) throw new Error(`No redline saved: ${turn.state.error ?? turn.state.answer}`);
    const output = store.exports.download(file.id).bytes, pkg = openDocx(output);
    const checks = { complete: turn.status === 'complete', exactName: file.name === 'Synthetic mutual NDA_redline_Synthetic Avery.docx',
      changesAuthor: pkg.partText('word/document.xml').includes('w:author="Synthetic Avery"'),
      commentAuthor: pkg.partText('word/comments.xml').includes('w:author="Synthetic Avery"'),
      ndaPreferenceApplied: pkg.partText('word/comments.xml').includes('Review note:'),
      originalUnchanged: store.originalFile(source.latest.id).bytes.equals(Buffer.from(bytes)) };
    await Bun.write(join(root, 'redline.docx'), output);
    console.log(JSON.stringify({ checks, answer: turn.state.answer, preferences: turn.state.workingPreferences }, null, 2));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
