import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { chatTools } from './chat-tools';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-multi-matter-'));
  store = new WorkspaceStore({databasePath: join(root, 'workspace.sqlite3')});
});
afterEach(() => { store.close(); rmSync(root, {recursive: true, force: true}); });
const send = () => ({clientId: crypto.randomUUID(), message: 'Compare the status across these matters.'});
function fixture() {
  const matters = ['Employment advice', 'Policy review', 'OUTSIDE-CANARY'].map(title => store.createMatter({title}));
  const documents = matters.map(m => store.createSource({kind: 'reference', matterIds: [m.id],
    revision: {title: m.title, body: `Status: ${m.title}.`, provenance: {origin: 'synthetic'}}}));
  const chat = store.conversations.create({scope: 'matters', matterIds: matters.slice(0, 2).map(m => m.id)});
  return {matters, documents, chat};
}
test('multi-matter scope needs no client and rejects missing, duplicate, oversized or mixed selections atomically', () => {
  const f = fixture();
  expect(store.clients.list()).toEqual([]);
  expect(f.chat.scope).toBe('matters');
  expect(f.chat.matterId).toBeNull();
  expect(f.chat.selectedMatters).toEqual(f.matters.slice(0,2).map(({id,title}) => ({id,title})));
  const before = store.conversations.list().length;
  for (const input of [
    {scope:'matters'}, {scope:'matters', matterIds:[]},
    {scope:'matters', matterIds:[f.matters[0]!.id,f.matters[0]!.id]},
    {scope:'matters', matterIds:[f.matters[0]!.id,crypto.randomUUID()]},
    {scope:'matters', matterIds:Array.from({length:101},()=>crypto.randomUUID())},
    {scope:'matters', matterIds:[f.matters[0]!.id],clientId:crypto.randomUUID()},
    {scope:'matters', matterIds:[f.matters[0]!.id],matterId:f.matters[0]!.id},
    {scope:'workspace', matterIds:[f.matters[0]!.id]},
  ]) expect(() => store.conversations.create(input as never)).toThrow();
  expect(store.conversations.list()).toHaveLength(before);
  expect(store.conversations.list(f.matters[0]!.id).map(c=>c.id)).toContain(f.chat.id);
  expect(store.conversations.list(f.matters[1]!.id).map(c=>c.id)).toContain(f.chat.id);
  expect(store.conversations.list(f.matters[2]!.id)).toEqual([]);
});
test('selected union is enforced for discovery, search, reads, citations, and future matters', async () => {
  const f = fixture();
  const knowledge = f.matters.map(m => store.createKnowledge({kind:'position', matterId:m.id,
    revision:{title:m.title,body:`Status: ${m.title}.`,status:'approved',approvedBy:'Synthetic'}}));
  const works = f.matters.map(m=>store.recordWork({title:m.title,matterId:m.id,request:'Status',answer:`Status: ${m.title}.`}));
  const turn = store.conversations.begin(f.chat.id, send(), 'synthetic').turn;
  const bundle = chatTools({store,conversation:f.chat,turn,attachments:[],signal:new AbortController().signal,save:()=>{}});
  const call = (name:string,input:unknown)=>runToolDef(bundle.tools,name,input,'workspace');
  expect(JSON.stringify(bundle.discovery)).not.toContain('OUTSIDE-CANARY');
  for (const kind of ['source','knowledge','work']) {
    const result=await call('counsel_list_records',{kind});
    expect(result.isError).toBe(false); expect(JSON.stringify(result)).not.toContain('OUTSIDE-CANARY');
  }
  expect(JSON.stringify(await call('counsel_search_records',{query:'Status'}))).not.toContain('OUTSIDE-CANARY');
  for (let i=0;i<3;i++) for (const [kind,id] of [
    ['source',f.documents[i]!.latest.id],['knowledge',knowledge[i]!.latest.id],['work',works[i]!.id],
  ]) expect(!!(await call('counsel_read_record',{kind,id})).isError).toBe(i===2);
  expect(!!(await call('counsel_cite_passage',{kind:'source',id:f.documents[0]!.latest.id,quote:f.documents[0]!.latest.body,start:0})).isError).toBe(false);
  expect((await call('counsel_cite_passage',{kind:'source',id:f.documents[2]!.latest.id,quote:f.documents[2]!.latest.body,start:0})).isError).toBe(true);
  const future = store.createMatter({title:'FUTURE-CANARY'});
  expect(store.conversations.get(f.chat.id).selectedMatters?.map(m=>m.id)).not.toContain(future.id);
  expect(store.conversations.get(f.chat.id).selectedMatters).toHaveLength(2);
});
test('combined responses remain unfiled with frozen selection receipts across edits, reopen and backup', async () => {
  const f=fixture();
  const provider=new FakeModelProvider([{toolCalls:f.documents.slice(0,2).map(d=>({name:'counsel_read_record',input:{kind:'source',id:d.latest.id}})),text:'Synthetic combined answer.'}]);
  const app=new WorkspaceChat(store,()=>provider), turn=app.start(f.chat.id,send());
  await app.idle();
  const saved=store.conversations.turn(turn.id);
  expect(saved.status).toBe('complete');
  expect(saved.state.scopeContext?.selectedMatters).toEqual(f.chat.selectedMatters);
  expect(provider.lastRequest?.system).toContain('Employment advice');
  expect(provider.lastRequest?.system).not.toContain('OUTSIDE-CANARY');
  expect(store.getWork(saved.workId!).matterId).toBeNull();
  const db=new Database(store.databasePath);
  db.run('UPDATE matters SET title=? WHERE id=?',['Renamed synthetic matter',f.matters[0]!.id]); db.close();
  expect(store.conversations.get(f.chat.id).selectedMatters?.[0]?.title).toBe('Renamed synthetic matter');
  expect(store.conversations.turn(turn.id).state.scopeContext?.selectedMatters).toEqual(f.chat.selectedMatters);
  const backup=await createWorkspaceBackup(store.databasePath);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(20);
  const path=join(root,backup.name); writeFileSync(path,backup.bytes);
  const restored=await restoreWorkspaceBackup(path,root);
  const copy=new WorkspaceStore({databasePath:restored.databasePath});
  try { expect(copy.conversations.get(f.chat.id).scope).toBe('matters'); expect(copy.conversations.turn(turn.id)).toEqual(saved); }
  finally { copy.close(); }
});
test('schema 10 backups remain readable and migrate without changing single-matter conversations', async () => {
  const matter=store.createMatter({title:'Existing matter'});
  const chat=store.conversations.create({scope:'matter',matterId:matter.id});
  const path=store.databasePath; store.close();
  const previous=new Database(path); previous.exec(DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; PRAGMA user_version=10;'); previous.close();
  const backup=await createWorkspaceBackup(path);
  expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(10);
  store=new WorkspaceStore({databasePath:path});
  expect(store.conversations.get(chat.id)).toEqual(chat);
  const other=store.createMatter({title:'Another matter'});
  expect(store.conversations.create({scope:'matters',matterIds:[matter.id,other.id]}).selectedMatters).toHaveLength(2);
});
test('HTTP requires authentication, explicit selections and forbids filing a combined chat into one matter', async () => {
  const f=fixture(), origin='http://127.0.0.1:7432';
  const handler=workspaceHandler({store,token:'synthetic',origin,distDir:root,demo:true});
  const req=(path:string,body:unknown,auth=true)=>handler(new Request(origin+'/api/workspace'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(auth?{Authorization:'Bearer synthetic'}:{})},body:JSON.stringify(body)}));
  expect((await req('/conversations',{scope:'matters',matterIds:[f.matters[0]!.id]},false)).status).toBe(401);
  expect((await req('/conversations',{scope:'matters',matterIds:[]})).status).toBe(400);
  expect((await req('/conversations',{scope:'matters',matterIds:f.matters.slice(0,2).map(m=>m.id)})).ok).toBe(true);
  expect(() => store.organizeConversation(f.chat.id,{requestId:crypto.randomUUID(),matterId:f.matters[0]!.id,confirmShare:true})).toThrow();
});
