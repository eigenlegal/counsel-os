import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import type { StepRequest, StepEvent } from '../core/types';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';
import { DROP_AUTO_FILING } from './fixtures/legacy-upkeep';
import { Database } from 'bun:sqlite';

let root: string, store: WorkspaceStore, chats: WorkspaceChat[];
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-auto-filing-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); chats = []; });
afterEach(async () => { for (const chat of chats) { chat.stop(); await chat.idle(); } store.close(); rmSync(root, { recursive: true, force: true }); });
const choice = { kind: 'codex' as const, model: 'synthetic' };
function source(title = 'scan.txt', body = 'Northstar NDA correspondence.', origin = 'fixture:file') {
  return store.createSource({ kind: 'document', revision: { title, body, provenance: { origin } } });
}
class FilingModel extends FakeModelProvider {
  requests: StepRequest[] = []; gate?: Promise<void>; failure = false;
  constructor() { super([]); }
  override async *run(req: StepRequest): AsyncIterable<StepEvent> {
    this.requests.push(req); if (this.gate) await this.gate;
    if (this.failure) { yield { type: 'error', message: 'Synthetic provider unavailable' }; return; }
    const { files } = JSON.parse(req.system.split('Context:\n')[1]!);
    yield { type: 'done', output: { suggestions: files.map((f: any) => {
      const matter = f.candidateMatters.find((m: any) => m.title === 'Northstar NDA');
      return { sourceId: f.sourceId, target: { collection: matter ? 'matter' : 'unfiled', matterId: matter?.id ?? null, matterTitle: matter?.title ?? null },
        reason: 'The text identifies the matching matter.', evidenceQuote: f.text.slice(0,28), confidence: matter ? 'high' : 'low' };
    }) }, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
function setup(model = new FilingModel()) {
  const choices: unknown[] = []; const chat = new WorkspaceChat(store, selected => { choices.push(selected); return model; }); chats.push(chat);
  return { chat, model, choices };
}
async function run(chat: WorkspaceChat) { chat.autoOrganizer.start(); chat.autoOrganizer.wake(); await chat.autoOrganizer.idle(); }
function enable(chat: WorkspaceChat) { chat.enableAutoFiling({ expectedRevisionId: store.autoFiling.settings()?.revisionId ?? null, modelChoice: choice, shareForSuggestions: true }); }
function items() { return store.autoFiling.status().items.map(({id,fingerprint}) => ({id,fingerprint})); }

test('one-time enable analyzes across batches, body text matches generic filenames, persists results, and review alone grants matter access', async () => {
  const matter = store.createMatter({ title: 'Northstar NDA', summary: 'PRIVATE MATTER BODY' });
  const files = Array.from({ length: 11 }, (_, i) => source(`scan-${i}.txt`, 'Northstar NDA correspondence. ' + 'x'.repeat(3000) + 'PRIVATE TAIL'));
  store.saveProfile({ name: 'PRIVATE PROFILE', expectedRevisionId: null });
  const { chat, model, choices } = setup(); await run(chat); expect(model.requests).toHaveLength(0);
  enable(chat); await chat.autoOrganizer.idle();
  expect(model.requests).toHaveLength(2); expect(choices).toEqual([choice,choice]);
  expect(store.autoFiling.status()).toMatchObject({ ready: 11, queued: 0, running: 0 });
  for (const req of model.requests) { expect(req.tools).toEqual([]); for (const secret of ['PRIVATE TAIL','PRIVATE MATTER BODY','PRIVATE PROFILE']) expect(req.system).not.toContain(secret); }
  for (const file of files) expect(store.getSource(file.id).matterIds).toEqual([]);
  chat.autoOrganizer.wake(); await chat.autoOrganizer.idle(); expect(model.requests).toHaveLength(2);
  expect(store.autoFiling.review({ action: 'apply', items: items(), confirmAccessChanges: true }).changed).toBe(11);
  for (const file of files) { expect(store.getSource(file.id).matterIds).toEqual([matter.id]); expect(store.getSource(file.id).latest.id).toBe(file.latest.id); }
  expect(store.catalog().knowledge).toEqual([]); expect(store.autoFiling.status({ view: 'history' }).items.every(i => i.state === 'applied')).toBe(true);
});
test('reviewed filing feeds real prepared chat context, while another matter remains isolated', async () => {
  const matter=store.createMatter({title:'Northstar NDA'}), other=store.createMatter({title:'Unrelated'});
  const file=source('scan.txt','Northstar NDA correspondence. RECALLMARKER: the return deadline is ten days.');
  const {chat}=setup(); enable(chat); await chat.autoOrganizer.idle();
  expect(store.search({matterId:matter.id,query:'RECALLMARKER'}).hits).toHaveLength(0);
  store.autoFiling.review({action:'apply',items:items(),confirmAccessChanges:true});
  expect(store.search({matterId:other.id,query:'RECALLMARKER'}).hits).toHaveLength(0);
  const provider=new FakeModelProvider([{text:'Synthetic grounded response.'}]), answering=new WorkspaceChat(store,()=>provider);chats.push(answering);
  const conversation=store.conversations.create({scope:'matter',matterId:matter.id});
  const turn=answering.start(conversation.id,{clientId:crypto.randomUUID(),message:'What return deadline appears in the Northstar correspondence?'});await answering.idle();
  expect(store.conversations.turn(turn.id).status).toBe('complete');expect(provider.lastRequest!.system).toContain('RECALLMARKER');
  expect(store.conversations.turn(turn.id).state.context.some(r=>r.id===file.latest.id && r.ranges.length)).toBe(true);
});
test('background analysis waits for an active chat without losing queued documents', async () => {
  source();const conversation=store.conversations.create({});
  store.conversations.begin(conversation.id,{clientId:crypto.randomUUID(),message:'Synthetic active chat'},'fixture');
  const {chat,model}=setup();enable(chat);await chat.autoOrganizer.idle();expect(model.requests).toEqual([]);expect(store.autoFiling.status().queued).toBe(1);
  store.conversations.recover();await run(chat);expect(model.requests).toHaveLength(1);
});
test('unchanged candidates do not repeat paid work; new matching matter and new source text do', async () => {
  const file = source(); const { chat, model } = setup(); enable(chat); await chat.autoOrganizer.idle();
  expect(model.requests).toHaveLength(1); expect(store.autoFiling.status().items[0]!.suggestion.target.collection).toBe('unfiled');
  store.createMatter({ title: 'Unrelated lawsuit' }); await run(chat); expect(model.requests).toHaveLength(1);
  store.createMatter({ title: 'Northstar NDA' }); await run(chat); expect(model.requests).toHaveLength(2);
  expect(store.autoFiling.status().items[0]!.suggestion.target.collection).toBe('matter');
  const revision = store.getSource(file.id).latest;
  store.reviseSource(file.id, revision.id, { title: revision.title, body: 'Northstar NDA correspondence. Updated.', provenance: revision.provenance });
  await run(chat); expect(model.requests).toHaveLength(3); expect(store.autoFiling.status().ready).toBe(1);
});
test('leave unfiled persists across catalog changes and only new file content reopens it', async () => {
  const file = source(); const { chat, model } = setup(); enable(chat); await chat.autoOrganizer.idle();
  store.autoFiling.review({ action: 'dismiss', items: items() }); store.createMatter({ title: 'Northstar NDA' });
  await run(chat); expect(model.requests).toHaveLength(1); expect(store.autoFiling.status().ready).toBe(0);
  store.reviseSource(file.id, file.latest.id, { title: file.latest.title, body: 'Northstar NDA updated correspondence.', provenance: file.latest.provenance });
  await run(chat); expect(model.requests).toHaveLength(2);
});
test('explicit filing, even when later removed, is protected; stale multi-file review is all or nothing', async () => {
  store.createMatter({ title: 'Northstar NDA' }); const first = source('first'), second = source('second');
  const { chat, model } = setup(); enable(chat); await chat.autoOrganizer.idle(); const selected = items();
  const placement = store.placeSource(second.id, { collection: 'external', expectedRevisionId: null });
  expect(() => store.autoFiling.review({ action: 'apply', items: selected, confirmAccessChanges: true })).toThrow();
  expect(store.getSource(first.id).matterIds).toEqual([]);
  store.placeSource(second.id, { collection: 'auto', expectedRevisionId: placement.revisionId });
  await run(chat); expect(model.requests).toHaveLength(1); expect(store.autoFiling.status().protected).toBe(1);
});
test('local-only, imported profiles and unreadable files are blocked before resolving a provider', async () => {
  source('Private', 'locality: local\nPrivate content'); source('Profile', 'Profile secrets', 'import:other/profile.md'); source('Empty', '');
  const { chat, model, choices } = setup(); enable(chat); await chat.autoOrganizer.idle();
  expect(choices).toEqual([]); expect(model.requests).toEqual([]); expect(store.autoFiling.status({view:'blocked'}).blocked).toBe(3);
});
test('pause during inference discards late suggestions, and failures wait for explicit resume', async () => {
  source(); const { chat, model } = setup(); let release!: () => void; model.gate = new Promise(resolve => { release = resolve; });
  enable(chat); await Promise.resolve();
  chat.controlAutoFiling({ action: 'pause', expectedRevisionId: store.autoFiling.settings()!.revisionId }); release(); await chat.autoOrganizer.idle();
  expect(store.autoFiling.status()).toMatchObject({ ready:0, settings:{mode:'paused'} });
  model.gate = undefined; model.failure = true;
  chat.controlAutoFiling({ action:'resume', expectedRevisionId: store.autoFiling.settings()!.revisionId }); await chat.autoOrganizer.idle();
  expect(store.autoFiling.settings()!.mode).toBe('failed'); const calls = model.requests.length;
  await run(chat); expect(model.requests.length).toBe(calls);
  model.failure = false; chat.controlAutoFiling({ action:'resume', expectedRevisionId:store.autoFiling.settings()!.revisionId }); await chat.autoOrganizer.idle();
  expect(store.autoFiling.status().ready).toBe(1);
});
test('file changes while inference runs cannot overwrite a manual filing choice', async () => {
  const file = source(); const {chat,model} = setup(); let release!: () => void; model.gate = new Promise(resolve => { release = resolve; });
  enable(chat); await Promise.resolve(); store.placeSource(file.id, {collection:'practice',expectedRevisionId:null}); release(); await chat.autoOrganizer.idle();
  expect(store.autoFiling.status().ready).toBe(0); expect(store.sourceLibrary({collection:'practice'}).total).toBe(1);
});
test('restart recovers completed results but pauses uncertain in-flight calls; backup copies pause without changing the live setting', async () => {
  source(); const { chat } = setup(); enable(chat); await chat.autoOrganizer.idle(); chat.stop(); await chat.idle();
  source('new file'); store.autoFiling.control({ action:'resume', expectedRevisionId:store.autoFiling.settings()!.revisionId });
  expect(store.autoFiling.claim()).not.toBeNull(); store.close(); store = new WorkspaceStore({ databasePath:join(root,'workspace.sqlite3') });
  const recovered = setup(); await run(recovered.chat); expect(recovered.model.requests).toEqual([]);
  expect(store.autoFiling.status()).toMatchObject({ready:1,settings:{mode:'paused'}});
  store.autoFiling.control({ action:'resume',expectedRevisionId:store.autoFiling.settings()!.revisionId });
  const backup = await createWorkspaceBackup(store.databasePath); expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(19);
  expect(store.autoFiling.settings()!.mode).toBe('running');
  const path=join(root,'saved.counsel-backup'); writeFileSync(path,backup.bytes); const restored=await restoreWorkspaceBackup(path,root);
  const copy = new WorkspaceStore({databasePath:restored.databasePath}); try { expect(copy.autoFiling.status()).toMatchObject({ready:1,settings:{mode:'paused'}}); } finally {copy.close();}
});
test('schema 17 upgrades without enabling AI or changing saved records', async () => {
  const file=source(); const path=store.databasePath; store.close(); const db=new Database(path); db.exec(DROP_AUTO_FILING+'PRAGMA user_version=17;'); db.close();
  expect((await inspectWorkspaceBackup((await createWorkspaceBackup(path)).bytes)).schemaVersion).toBe(17);
  store=new WorkspaceStore({databasePath:path}); expect(store.getSource(file.id)).toEqual(file); expect(store.autoFiling.settings()).toBeNull();
});
test('a source change that requeues an in-flight task cannot erase the interrupted-request marker', () => {
  const file=source(); store.autoFiling.enable({expectedRevisionId:null,modelChoice:choice,shareForSuggestions:true});
  const claim=store.autoFiling.claim(); expect(claim).not.toBeNull();
  store.reviseSource(file.id,file.latest.id,{title:file.latest.title,body:'Updated Northstar notes.',provenance:file.latest.provenance});
  expect(store.autoFiling.status().running).toBe(0); expect(store.autoFiling.settings()!.activeRunId).toBe(claim!.runId);
  store.close(); store=new WorkspaceStore({databasePath:join(root,'workspace.sqlite3')}); store.autoFiling.recover();
  expect(store.autoFiling.settings()).toMatchObject({mode:'paused',activeRunId:null}); expect(store.autoFiling.claim()).toBeNull();
});
test('auto-filing routes require auth, strict input and consent; viewing never enables AI', async () => {
  const {chat,model}=setup(); const handler=workspaceHandler({store,chat,distDir:'/tmp',token:'fixture',origin:'http://127.0.0.1:7432',demo:true});
  const call=(path:string,body?:unknown,token='fixture')=>handler(new Request('http://127.0.0.1:7432/api/workspace/auto-filing'+path,{method:body?'POST':'GET',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
  expect((await call('',undefined,'wrong')).status).toBe(401); expect((await call('?all=true')).status).toBe(400);
  expect((await call('/enable',{expectedRevisionId:null,modelChoice:choice})).status).toBe(400);
  expect((await call('')).status).toBe(200); expect(store.autoFiling.settings()).toBeNull(); expect(model.requests).toEqual([]);
  expect((await call('/review',{action:'apply',items:[{id:crypto.randomUUID(),fingerprint:'a'.repeat(64)}]})).status).toBe(400);
});
