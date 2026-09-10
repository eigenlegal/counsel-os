import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { planRecall, type RecallInput } from './recall-plan';
import { contextTerms } from './context-terms';
import { RECALL_CASES } from './fixtures/recall-cases';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let root:string,store:WorkspaceStore;let chats:WorkspaceChat[]=[];
beforeEach(()=>{root=mkdtempSync(join(tmpdir(),'counsel-recall-'));store=new WorkspaceStore({databasePath:join(root,'workspace.sqlite3')});chats=[];});
afterEach(async()=>{for(const chat of chats){chat.stop();await chat.idle();}store.close();rmSync(root,{recursive:true,force:true});});
const input=(request:string):RecallInput=>({request,previousRequests:[],attachmentTitles:[],matterTitles:[]});
const boundary={all:false,matterId:null,sourceRevisionIds:[],workIds:[]};
const position=(body:string,title='Instruction')=>store.createKnowledge({kind:'position',revision:{title,body,status:'approved',approvedBy:'Synthetic Lawyer'}});

test('eight vocabulary-gap cases miss lexical-only search and reach exact approved passages through planned queries and ordinary citation checks',async()=>{
  for(const [index,fixture] of RECALL_CASES.entries()) {
    const record=position(fixture.body,`Instruction ${index}`);
    expect(store.rankContext({terms:contextTerms(fixture.prompt),ids:[record.latest.id]},boundary)).toEqual([]);
    const provider=new FakeModelProvider([{output:{queries:[fixture.query]}},{toolCalls:[{name:'counsel_cite_passage',input:{kind:'knowledge',id:record.latest.id,quote:fixture.body}}],text:'The saved instruction says so. [S1]'}]);
    const chat=new WorkspaceChat(store,()=>provider,{recallPlanner:planRecall});chats.push(chat);
    const conversation=store.conversations.create({});const turn=chat.start(conversation.id,{clientId:crypto.randomUUID(),message:fixture.prompt});await chat.idle();
    const saved=store.conversations.turn(turn.id);
    expect(saved.status).toBe('complete');expect(saved.state.preparedContext?.retrieval?.method).toBe('scoped-query-fusion-v3');
    expect(saved.state.context.some(r=>r.id===record.latest.id&&r.ranges.length)).toBe(true);
    expect(saved.state.citations[0]?.quote).toBe(fixture.body);expect(provider.lastRequest!.system).toContain(fixture.body);
    expect(store.getKnowledge(record.id).latest).toEqual(record.latest);
  }
});
test('planning sees bounded user prompts and allowed titles, never saved profiles, file bodies, unrelated matters or tool capabilities',async()=>{
  const provider=new FakeModelProvider([{output:{queries:['nonsolicitation','nonsolicitation','recruit employees']}}]);
  const plan=await planRecall(provider,{request:'Can they recruit our employees?',previousRequests:['z'.repeat(2000)],attachmentTitles:['a'.repeat(300)],matterTitles:[]},new AbortController().signal);
  expect(plan.queries).toEqual(['nonsolicitation']);expect(plan.limited).toBe(true);
  expect(provider.lastRequest!.tools).toEqual([]);expect(provider.lastRequest!.messages[0]!.content.length).toBeLessThan(2000);
  expect(provider.lastRequest!.system).toContain('never evidence');
  const greeting=new FakeModelProvider([]);expect((await planRecall(greeting,input('Thanks!'),new AbortController().signal)).status).toBe('unchanged');expect(greeting.lastRequest).toBeUndefined();
});
test('live-observed query modifiers and hyphenated spellings do not hide the core concept',async()=>{
  const examples=[['non-solicitation','Nonsolicitation is excluded.'],['cross-border data transfer','Cross-border transfers require assessment.'],
    ['indemnification obligations','Indemnification addresses defense control.'],['right of publicity','Publicity releases identify channels.']];
  for(const [query,body] of examples){const target=position(body!);const plan=await planRecall(new FakeModelProvider([{output:{queries:[query]}}]),input('How does this work?'),new AbortController().signal);
    expect(store.rankContext({terms:[],alternateTerms:plan.terms},boundary,3).some(r=>r.id===target.latest.id)).toBe(true);}
});
test('planning deadline returns a safe fallback instead of blocking the response or replaying the request',async()=>{
  const timeout=AbortSignal.timeout;AbortSignal.timeout=()=>timeout.call(AbortSignal,1);
  try {const result=await planRecall(new FakeModelProvider([{output:{queries:['nonsolicitation']},delayMs:20}]),input('Can they recruit our employees?'),new AbortController().signal);
    expect(result.status).toBe('unavailable');expect(result.note).toContain('timed out');expect(result.queries).toEqual([]);
  }finally{AbortSignal.timeout=timeout;}
});
test('unknown fields, long output and provider failures fall back without leaking raw error text; user cancellation never starts an answer',async()=>{
  for(const result of [{queries:['x'.repeat(121)]},{queries:['nonsolicitation'],readAll:true},'not JSON']) {
    const plan=await planRecall(new FakeModelProvider([{output:result}]),input('Recruit staff?'),new AbortController().signal);
    expect(plan).toMatchObject({status:'unavailable',queries:[],terms:[]});
  }
  const provider=new FakeModelProvider([{error:'SECRET_TOKEN /private/path'}]);const plan=await planRecall(provider,input('Recruit staff?'),new AbortController().signal);
  expect(JSON.stringify(plan)).not.toContain('SECRET_TOKEN');
  const abort=new AbortController();abort.abort();await expect(planRecall(provider,input('Recruit staff?'),abort.signal)).rejects.toThrow();
  const slow=new FakeModelProvider([{output:{queries:['nonsolicitation']},delayMs:25},{text:'Must never answer'}]);
  const chat=new WorkspaceChat(store,()=>slow,{recallPlanner:planRecall});chats.push(chat);const conversation=store.conversations.create({});
  const turn=chat.start(conversation.id,{clientId:crypto.randomUUID(),message:'Recruit staff?'});chat.cancel(conversation.id,turn.id);await chat.idle();
  expect(store.conversations.turn(turn.id).status).toBe('cancelled');expect(store.listWork()).toEqual([]);
});
test('fallback still uses the original prepared context and exposes its planning status, without treating invented queries as evidence',async()=>{
  const record=position('Recruiting restrictions are recorded here.');
  const provider=new FakeModelProvider([{error:'Synthetic planner failure'},{text:'Synthetic answer.'}]);
  const chat=new WorkspaceChat(store,()=>provider,{recallPlanner:planRecall});chats.push(chat);const c=store.conversations.create({});
  const turn=chat.start(c.id,{clientId:crypto.randomUUID(),message:'What recruiting restrictions apply?'});await chat.idle();const saved=store.conversations.turn(turn.id);
  expect(saved.status).toBe('complete');expect(saved.state.preparedContext?.retrieval?.plan?.status).toBe('unavailable');
  expect(saved.state.context.some(r=>r.id===record.latest.id)).toBe(true);expect(saved.state.citations).toEqual([]);
});
test('fused ranking excludes foreign matters, unapproved/replaced practice and Trash before limits; explicit historical attachments remain exact',()=>{
  const a=store.createMatter({title:'A'}), b=store.createMatter({title:'B'});
  const source=(matterId:string,body:string)=>store.createSource({kind:'reference',matterIds:[matterId],revision:{title:'File',body,provenance:{origin:'fixture'}}});
  const allowed=source(a.id,'Nonsolicitation terms.');const old=source(a.id,'Nonsolicitation historical text.');
  store.reviseSource(old.id,old.latest.id,{title:'Changed',body:'Billing schedule.',provenance:{origin:'fixture'}});
  const pending=store.createKnowledge({kind:'position',revision:{title:'Nonsolicitation',body:'Pending proposal.'}});
  const replaced=position('Nonsolicitation baseline.');store.reviseKnowledge(replaced.id,replaced.latest.id,{title:'Replacement',body:'Billing only.',status:'approved',approvedBy:'Synthetic Lawyer'});
  let outside=allowed;for(let i=0;i<45;i++)outside=source(b.id,'Nonsolicitation terms.');
  const scoped={...boundary,matterId:a.id},opts={terms:contextTerms('Can they recruit our employees?'),alternateTerms:[['nonsolicitation']]};
  expect(store.rankContext(opts,scoped,1).map(r=>r.id)).toEqual([allowed.latest.id]);
  expect(store.rankContext({...opts,ids:[outside.latest.id,old.latest.id,pending.latest.id,replaced.latest.id]},scoped)).toEqual([]);
  expect(store.rankContext({...opts,ids:[old.latest.id]},{...scoped,sourceRevisionIds:[old.latest.id]}).map(r=>r.id)).toEqual([old.latest.id]);
  store.changeRecord('source',allowed.id,{action:'trash',expectedVersion:store.recordImpact('source',allowed.id).version,confirm:true});
  expect(store.rankContext(opts,scoped)).toEqual([]);
});
test('fused ranking does not let a crowded original-word match list erase an alternate concept; deep Unicode excerpts retain exact offsets',async()=>{
  const target=position('Employees recruit candidates. 🧭\n'.repeat(1800)+'Nonsolicitation is excluded.\n'+'Unrelated text.\n'.repeat(50),'Long instruction');
  for(let i=0;i<40;i++)position('Employees recruit candidates for routine hiring.',`Recruiting ${i}`);
  const opts={terms:contextTerms('Can they recruit our employees?'),alternateTerms:[['nonsolicitation']]};
  expect(store.rankContext(opts,boundary,2).some(r=>r.id===target.latest.id)).toBe(true);
  const provider=new FakeModelProvider([{output:{queries:['nonsolicitation']}},{toolCalls:[{name:'counsel_cite_passage',input:{kind:'knowledge',id:target.latest.id,quote:'Nonsolicitation is excluded.'}}],text:'Recorded instruction. [S1]'}]);
  const chat=new WorkspaceChat(store,()=>provider,{recallPlanner:planRecall});chats.push(chat);const c=store.conversations.create({});
  const turn=chat.start(c.id,{clientId:crypto.randomUUID(),message:'Can they recruit our employees?'});await chat.idle();const saved=store.conversations.turn(turn.id);
  const citation=saved.state.citations[0]!;expect(citation.quote).toBe('Nonsolicitation is excluded.');expect(target.latest.body.slice(citation.start,citation.start+citation.quote.length)).toBe(citation.quote);
  expect(saved.state.preparedContext!.retrieval!.characters).toBeLessThanOrEqual(64_000);
});
test('plan and exact reads survive backup/reopen; retrying the same send does not consume another model request',async()=>{
  position('Nonsolicitation is excluded.');let resolves=0;
  const provider=new FakeModelProvider([{output:{queries:['nonsolicitation']}},{text:'Saved instruction.'}]);
  const chat=new WorkspaceChat(store,()=>{resolves++;return provider;},{recallPlanner:planRecall});chats.push(chat);const c=store.conversations.create({});
  const send={clientId:crypto.randomUUID(),message:'Can they recruit our employees?'};const turn=chat.start(c.id,send);await chat.idle();
  const saved=store.conversations.turn(turn.id);expect(chat.start(c.id,send)).toEqual(saved);expect(resolves).toBe(1);
  const backup=await createWorkspaceBackup(store.databasePath),path=join(root,'recall.counsel-backup');writeFileSync(path,backup.bytes);
  const restored=await restoreWorkspaceBackup(path,root),copy=new WorkspaceStore({databasePath:restored.databasePath});
  try{expect(copy.conversations.turn(turn.id).state.preparedContext).toEqual(saved.state.preparedContext);}finally{copy.close();}
});
