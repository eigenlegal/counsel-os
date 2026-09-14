/** Opt-in live visual qualification; only the synthetic browser-test screenshot. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { WorkspaceClaudeCodeProvider } from '../runtime/src/workspace/claude-code';
import { qualificationOptions } from '../runtime/src/workspace/qualification';

const options = qualificationOptions(process.argv.slice(2));
if (options.mode !== 'live') {
  console.log('No model call. Run the image browser smoke first, then use --live --allow-plan-usage --provider codex|claude-code --model MODEL.');
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-images-live-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const provider = options.provider === 'codex' ? new WorkspaceCodexProvider(options.model) : new WorkspaceClaudeCodeProvider(options.model);
  const chat = new WorkspaceChat(store, () => provider);
  const checks: Record<string, boolean> = {}; const answers: string[] = [];
  try {
    const bytes = readFileSync(resolve(import.meta.dir, '.tmp/workspace/image-visual-fixture.png'));
    const file = await store.importDocument({ name: 'Screen.png', base64: bytes.toString('base64') });
    const conversation = store.conversations.create({});
    const first = chat.start(conversation.id, { clientId: crypto.randomUUID(), attachments: [file.latest.id], message: 'Describe the main rectangle’s color and transcribe the large words and numbers in this screenshot. Use the image, not a guessed transcript. Do not modify records.' });
    await chat.idle(); let turn = store.conversations.turn(first.id); answers.push(turn.state.answer);
    checks.completed = turn.status === 'complete';
    checks.pixelsRead = /violet\s+lantern\s+482/i.test(turn.state.answer) && /purple|violet/i.test(turn.state.answer);
    checks.noOCR = file.latest.body === null;
    checks.visualReceipt = turn.state.visualContext?.[0]?.id === file.latest.id;
    checks.originalPreserved = store.originalFile(file.latest.id).bytes.equals(bytes);
    if (!checks.completed || !checks.pixelsRead) throw new Error(`Image interpretation failed: ${turn.status}; ${turn.state.error ?? 'unexpected visual answer'}`);
    const next = chat.start(conversation.id, { clientId: crypto.randomUUID(), attachments: [], message: 'Look at the same screenshot again. What number is printed in its main rectangle? Answer with the number only.' });
    await chat.idle(); turn = store.conversations.turn(next.id); answers.push(turn.state.answer);
    checks.followUp = turn.status === 'complete' && /482/.test(turn.state.answer) && turn.state.visualContext?.[0]?.id === file.latest.id;
    checks.noPracticeChanges = store.savedPracticeDocument() === null;
    if (Object.values(checks).some(value => !value)) throw new Error('A visual qualification check failed.');
    console.log(`PASS: ${options.provider} visual input and follow-up; ${Object.keys(checks).length} synthetic checks. Report: ${join(root, 'report.json')}`);
  } finally {
    chat.stop(); await chat.idle();
    writeFileSync(join(root, 'report.json'), JSON.stringify({ provider: options.provider, model: options.model, checks, answers }, null, 2));
    store.close();
  }
}
