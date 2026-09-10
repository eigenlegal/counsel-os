import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { WorkspaceStore } from './store';
import { WorkingPreferenceFields } from './working-preferences';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

const roots: string[] = [], stores: WorkspaceStore[] = [];
function fixture() { const root = mkdtempSync(join(tmpdir(), 'counsel-drafts-')); roots.push(root); const path = join(root, 'workspace.sqlite3'); const store = new WorkspaceStore({databasePath:path}); stores.push(store); return {root,path,store}; }
afterEach(() => { stores.splice(0).forEach(s => s.close()); roots.splice(0).forEach(r => rmSync(r, {recursive:true,force:true})); });
const draft = () => ({message:'  Synthetic unsent draft\n', attachments:[], scope:'conversation', clientId:randomUUID()});
const write = (key: string, value: unknown, expectedRevisionId: string | null = null) => ({key,value,expectedRevisionId,writeId:randomUUID()});

test('drafts survive reopening, are not chats/practice/search, and preserve incomplete preferences', () => {
  const {store,path} = fixture(), key = `chat:new::${randomUUID()}`, value = draft();
  store.drafts.save(write(key,value));
  const fields = {...WorkingPreferenceFields.parse({}), filenamePattern:'', writingInstructions:'  unfinished  '};
  store.drafts.save(write('working-preferences',{fields,saved:null}));
  expect(store.conversations.list()).toHaveLength(0); expect(store.getWorkingPreferences()).toBeNull();
  expect(store.catalog().sources).toHaveLength(0);
  const reopened = new WorkspaceStore({databasePath:path}); stores.push(reopened);
  expect(reopened.drafts.get(key).value).toEqual(value);
  expect(reopened.drafts.get('working-preferences').value).toEqual({fields,saved:null});
  expect(reopened.drafts.list()).toHaveLength(2);
});
test('CAS conflicts preserve text; lost-response retry is idempotent; discards prevent stale recreation', () => {
  const {store} = fixture(), key = `chat:new::${randomUUID()}`, value = draft(), input = write(key,value);
  const first = store.drafts.save(input);
  expect(store.drafts.save(input)).toEqual(first);
  expect(() => store.drafts.save(write(key,{...value,message:'stale'}))).toThrow('another window');
  const discarded = store.drafts.save(write(key,null,first.revisionId));
  expect(store.drafts.list()).toEqual([]); expect(discarded.revisionId).not.toBe(first.revisionId);
  expect(() => store.drafts.save(input)).toThrow('another window');
});
test('accepted sends consume recovery in the same transaction and late autosaves cannot resurrect prompts', () => {
  const {store} = fixture(), chat = store.conversations.create({scope:'conversation'}), key = `chat:${chat.id}`, value = draft();
  const first = store.drafts.save(write(key,value));
  store.conversations.begin(chat.id,{message:value.message,attachments:[],clientId:value.clientId},'synthetic');
  const consumed = store.drafts.get(key); expect(consumed.value).toBeNull();
  expect(() => store.drafts.save(write(key,value,first.revisionId))).toThrow('another window');
  expect(store.drafts.save(write(key,value,consumed.revisionId)).value).toBeNull();
});
test('unknown keys, fields, credentials and unbounded data are rejected', () => {
  const {store} = fixture();
  expect(() => store.drafts.save(write('../../settings',draft()))).toThrow();
  expect(() => store.drafts.save(write('working-preferences',draft()))).toThrow();
  expect(() => store.drafts.save(write('chat:new::',{...draft(),apiKey:'not-a-real-key'}))).toThrow();
  expect(() => store.drafts.save(write('chat:new::',{...draft(),message:'x'.repeat(30001)}))).toThrow();
});
test('backups retain drafts without applying preferences or copying connection settings', async () => {
  const {store,path,root} = fixture(), value = draft();
  store.drafts.save(write('chat:new::',value));
  const backup = await createWorkspaceBackup(path);
  const archive = join(root,'drafts.counsel-backup'); writeFileSync(archive,backup.bytes);
  const restored = await restoreWorkspaceBackup(archive,join(root,'restored'));
  const reopened = new WorkspaceStore({databasePath:restored.databasePath}); stores.push(reopened);
  expect(reopened.drafts.get('chat:new::').value).toEqual(value);
  expect(reopened.getWorkingPreferences()).toBeNull(); expect(reopened.conversations.list()).toHaveLength(0);
});
