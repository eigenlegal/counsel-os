/** Creates a synthetic original and tests the real workspace redline pipeline. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { FakeModelProvider } from '../runtime/src/core/fake-provider';
import { qualificationOptions } from '../runtime/src/workspace/qualification';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'fixture' && !(options.mode === 'live' && options.provider === 'codex')) {
  console.log('No files or calls made. Use --fixture for a model-free native redline, or --live --allow-plan-usage --provider codex --model MODEL. Synthetic data only.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-redline-check-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const work = store.recordWork({ title: 'Synthetic notice agreement', request: 'Synthetic original for document verification',
    answer: '## Notices\n\nNotices may be given orally. The receiving party must acknowledge receipt.\n\n## Payment\n\nPayment is due within thirty days of receipt of an invoice. This provision is unchanged.\n\n## Contacts\n\n| Party | Contact |\n| --- | --- |\n| Aster | Designated business contact |\n| Boreal | Designated legal contact |' });
  const original = await store.exports.create(work.id);
  const bytes = store.exports.download(original.id).bytes;
  await Bun.write(join(root, 'original.docx'), bytes);
  const source = await store.importDocument({ name: 'Synthetic notice agreement.docx', base64: Buffer.from(bytes).toString('base64') });
  const fixture = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_prepare_redline', input: { sourceRevisionId: source.latest.id, edits: [{ current: 'orally', proposed: 'in writing', comment: 'Require written notice as instructed.' }] } }], text: 'Prepared the requested redline; original unchanged.' }]);
  const vendor = options.mode === 'live' ? new WorkspaceCodexProvider(options.model) : null;
  const chat = new WorkspaceChat(store, () => vendor ? { id: vendor.id, kind: vendor.kind, capabilities: vendor.capabilities,
    async *run(request) { yield* vendor.run({ ...request, signal: AbortSignal.any([request.signal!, AbortSignal.timeout(120_000)]) }); } } : fixture);
  try {
    console.log(`Synthetic files and database retained: ${root}`);
    const conversation = store.conversations.create({});
    const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), attachments: [source.latest.id],
      message: 'Please redline the attached agreement so notices must be in writing, and add a brief Word comment explaining that change. Leave the rest of the document unchanged.' });
    await chat.idle();
    const turn = store.conversations.turn(started.id), file = turn.state.redline?.file;
    if (file) await Bun.write(join(root, 'redline.docx'), store.exports.download(file.id).bytes);
    const passed = turn.status === 'complete' && turn.state.redline?.status === 'saved' && !!file
      && store.originalFile(source.latest.id).bytes.equals(Buffer.from(bytes)) && store.getSource(source.id).latest.id === source.latest.id;
    console.log(JSON.stringify({ passed, mode: options.mode, answer: turn.state.answer, redline: turn.state.redline,
      errors: turn.state.activity.filter(a => a.status === 'failed').map(a => a.output), next: 'Validate tracked changes and comment anchors; render original and redline and inspect every page. Passing workflow checks alone is not visual or legal-quality qualification.' }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally { chat.stop(); await chat.idle(); store.close(); }
}
