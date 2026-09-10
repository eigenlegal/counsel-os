/** Synthetic original-package insertion workflow; artifacts retained for native Word QA. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { FakeModelProvider } from '../runtime/src/core/fake-provider';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import { openDocx } from '../runtime/src/docx/package';
import { modelOf, textOf, descendants, isW, attr } from '../runtime/src/docx/model';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'fixture' && !(options.mode === 'live' && options.provider === 'codex')) {
  console.log('No files or calls. Use --fixture or --live --allow-plan-usage --provider codex --model MODEL.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-insertion-check-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const work = store.recordWork({ title: 'Synthetic cooperation agreement', request: 'Synthetic document verification only.',
    answer: '# Cooperation agreement\n\nSynthetic verification document. No real parties are involved.\n\n## Purpose\n\nThe parties will evaluate a possible collaboration.\n\n## Notices\n\nNotices must be given in writing.\n\n## Signatures\n\nThe parties may sign below.' });
  const original = await store.exports.create(work.id), bytes = store.exports.download(original.id).bytes;
  await Bun.write(join(root, 'original.docx'), bytes);
  const source = await store.importDocument({ name: 'Synthetic cooperation agreement.docx', base64: Buffer.from(bytes).toString('base64') });
  store.saveWorkingPreferences({ expectedRevisionId: null, authorMode: 'custom', customAuthor: 'Synthetic Avery', filenamePattern: '{document} ({variant})' });
  const insertions = [{ anchor: 'Signatures', position: 'before', paragraphs: [
    { text: 'Electronic copies', styleFrom: 'Notices' },
    { text: 'The parties may exchange electronic copies of this agreement.', styleFrom: 'Notices must be given in writing.' },
  ], comment: 'Adds the requested electronic-copy provision.' }];
  const fixture = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_prepare_redline', input: { sourceRevisionId: source.latest.id, insertions } }], text: 'Prepared the requested new section with native tracked changes.' }]);
  const vendor = options.mode === 'live' ? new WorkspaceCodexProvider(options.model) : null;
  const chat = new WorkspaceChat(store, () => vendor ? { id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(request) { yield* vendor.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) }); } } : fixture);
  try {
    console.log(`Synthetic insertion artifacts: ${root}`);
    const conversation = store.conversations.create({});
    const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), attachments: [source.latest.id],
      message: 'Add a new section immediately before Signatures. Heading: "Electronic copies". Body: "The parties may exchange electronic copies of this agreement." Match the existing heading and body formatting, make the whole addition native tracked changes, and add a short Word comment explaining the addition. Leave existing text unchanged. This is a synthetic test, not a request for legal research.' });
    await chat.idle();
    const turn = store.conversations.turn(started.id), file = turn.state.redline?.file;
    if (!file) throw new Error(`No insertion file: ${JSON.stringify(turn.state.activity.filter(item => item.status === 'failed'))}`);
    const output = store.exports.download(file.id).bytes;
    await Bun.write(join(root, 'inserted.docx'), output);
    const pkg = openDocx(output), paras = modelOf(pkg).paragraphs, baseline = modelOf(openDocx(bytes)).paragraphs;
    const additions = paras.filter(p => textOf(p, 'accept').startsWith('Electronic copies') || textOf(p, 'accept').startsWith('The parties may exchange'));
    const marks = [...descendants(pkg.part('word/document.xml').documentElement!)].filter(el => isW(el, 'ins'));
    const checks = { completed: turn.status === 'complete', twoNewParagraphs: additions.length === 2,
      originalTextUnchanged: JSON.stringify(paras.map(p => textOf(p, 'reject')).filter(Boolean)) === JSON.stringify(baseline.map(p => textOf(p, 'reject')).filter(Boolean)),
      allFourRevisionMarksAttributed: marks.length === 4 && marks.every(el => attr(el, 'author') === 'Synthetic Avery'),
      commentAttributed: pkg.partText('word/comments.xml').includes('w:author="Synthetic Avery"'),
      originalBytesUnchanged: store.originalFile(source.latest.id).bytes.equals(Buffer.from(bytes)),
      insertedBeforeSignatures: paras.findIndex(p => textOf(p, 'accept') === 'Electronic copies') < paras.findIndex(p => textOf(p, 'accept') === 'Signatures') };
    console.log(JSON.stringify({ checks, output: file.name, answer: turn.state.answer }, null, 2));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
