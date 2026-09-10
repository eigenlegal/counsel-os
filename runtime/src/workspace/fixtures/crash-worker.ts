/** Child-process fault fixture; never opens a user's workspace or calls a model. */
import { Database } from 'bun:sqlite';
import { basename } from 'node:path';
import { WorkspaceStore } from '../store';
import { WorkspaceChat } from '../chat';
import { FakeModelProvider } from '../../core/fake-provider';
import { lockWorkspace } from '../lock';

const path = process.argv[2];
if (!path?.includes('counsel-crash-test-') || basename(path) !== 'workspace.sqlite3') throw new Error('Use an isolated crash-test workspace.');
lockWorkspace(path);
const store = new WorkspaceStore({ databasePath: path });
const matter = store.createMatter({ title: 'Synthetic crash matter' });
const practice = store.createKnowledge({ kind: 'position', revision: { title: 'Existing baseline', body: 'Preserve this baseline.', status: 'approved', approvedBy: 'Synthetic Avery' } });
const conversation = store.conversations.create({ scope: 'matter', matterId: matter.id });
const chat = new WorkspaceChat(store, () => new FakeModelProvider([{ text: 'Completed synthetic answer.' }]));
const completed = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Initial synthetic exchange.' });
await chat.idle();
const running = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'An unfinished exchange.' }, 'fixture').turn;
running.state.answer = 'Durable partial text.';
running.state.activity = [{ id: crypto.randomUUID(), name: 'counsel_read_record', label: 'Reading a saved passage', status: 'running', input: {} }];
store.conversations.save(running);
// Acknowledged before processing; reopening may process it but must not commit it.
const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Interrupted folder', files: [{ path: 'received.txt', byteCount: 3 }, { path: 'not-received.txt', byteCount: 3 }] });
store.imports.receive(batch.id, batch.entries[0]!.id, Buffer.from('one').toString('base64'));
store.imports.stop();
// Simulate power loss in the middle of a later database transaction. This
// connection never commits; SIGKILL, not graceful close, is the test boundary.
const db = new Database(path);
db.run('BEGIN IMMEDIATE');
db.run("INSERT INTO matters VALUES (?,?,?,?,?)", [crypto.randomUUID(), 'Uncommitted ghost', null, '', new Date().toISOString()]);
console.log(JSON.stringify({ matterId: matter.id, practiceId: practice.id, conversationId: conversation.id, completedId: completed.id,
  runningId: running.id, batchId: batch.id, entryId: batch.entries[0]!.id, clientId: running.clientId }));
setInterval(() => {}, 1000); // Deliberately stays alive until the parent sends SIGKILL.
await new Promise(() => {});
