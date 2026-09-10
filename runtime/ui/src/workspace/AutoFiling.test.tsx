import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor, userEvent } from '../test/dom';
import { AutoFiling } from './AutoFiling';
import type { Snapshot } from './api';
import type { AutoFilingStatus } from '../../../src/workspace/auto-filing-types';
const original=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=original;sessionStorage.clear();});
const data={connection:{ready:true,label:'Codex · ChatGPT subscription',config:{kind:'codex',model:'synthetic'}}} as Snapshot;
const settings={revisionId:'settings',activeRunId:null,mode:'running' as const,modelChoice:{kind:'codex' as const,model:'synthetic'},instruction:'',message:'Suggestions retained.',calls:2,enabledAt:'2026-09-09T00:00:00Z',updatedAt:'2026-09-09T00:00:00Z'};
const item={id:'result',sourceId:'file',sourceVersion:'version',fingerprint:'fingerprint',title:'Northstar notes',partial:true,candidateMatters:[{id:'matter',title:'Northstar NDA'}],createdAt:settings.updatedAt,state:'ready' as const,stale:false,
  suggestion:{sourceId:'file',target:{collection:'matter' as const,matterId:'matter',matterTitle:'Northstar NDA'},reason:'Matched the text.',evidenceQuote:'Northstar NDA correspondence.',confidence:'high' as const}};
function setup(options:{off?:boolean;stale?:boolean;uncertain?:boolean;many?:boolean;reject?:boolean}={}) {
  sessionStorage.setItem('counsel-os.token','fixture'); const calls:{path:string;body:any}[]=[];
  let current:AutoFilingStatus={settings:options.off?null:settings,queued:0,running:0,ready:1,handled:0,blocked:0,protected:0,total:options.many?51:1,offset:0,
    items:[{...item,stale:!!options.stale,...(options.uncertain?{suggestion:{...item.suggestion,confidence:'low',target:{collection:'unfiled',matterId:null,matterTitle:null}}}:{})}],issues:[]};
  globalThis.fetch=(async(url,init)=>{const path=String(url),body=init?.body?JSON.parse(init.body as string):undefined;calls.push({path,body});
    if(body){if(options.reject)return Response.json({error:'The file changed. Review again.'},{status:409});
      if(path.endsWith('/enable'))current={...current,settings}; if(path.endsWith('/control'))current={...current,settings:{...settings,mode:body.action==='pause'?'paused':'running'}};
      if(path.endsWith('/review'))current={...current,items:[],ready:0,handled:1,total:0};return Response.json({});}
    return Response.json(path.includes('view=history')?{...current,items:[],total:0}:path.includes('offset=50')?{...current,items:[{...item,id:'next',title:'Another file'}]}:current);
  }) as typeof fetch;
  render(<AutoFiling data={data}/>); return calls;
}
async function open(off=false){fireEvent.click(await screen.findByRole('button',{name:off?'Set up AI filing':'Review AI filing'}));await screen.findByRole('dialog',{name:'AI filing'});}
test('setup explains recurring sharing and cost; viewing is read-only, enabling pins the selected connection',async()=>{
  const calls=setup({off:true});await open(true);await screen.findByRole('button',{name:'Enable AI filing'});
  expect(calls.every(c=>!c.body)).toBe(true);expect(screen.getByText('Large queues can use substantial AI capacity.',{exact:false})).toBeTruthy();
  await userEvent.type(screen.getByRole('textbox',{name:'Background filing instructions'}),'Keep agreements with their matter.');
  fireEvent.click(screen.getByRole('button',{name:'Enable AI filing'}));await waitFor(()=>expect(calls.filter(c=>c.body)).toHaveLength(1));
  expect(calls.find(c=>c.body)!.body).toEqual({expectedRevisionId:null,shareForSuggestions:true,instruction:'Keep agreements with their matter.',modelChoice:{kind:'codex',model:'synthetic'}});
});
test('saved suggestions are unchecked, show exact evidence, and apply sends only selected identities with access confirmation',async()=>{
  const calls=setup();await open();const checkbox=await screen.findByRole('checkbox');expect((checkbox as HTMLInputElement).checked).toBe(false);
  expect(screen.getByText('Northstar NDA correspondence.')).toBeTruthy();expect(screen.getByText('Confidence: high · Partial excerpt')).toBeTruthy();
  fireEvent.click(checkbox);fireEvent.click(screen.getByRole('button',{name:'Apply 1 filing suggestion'}));
  await waitFor(()=>expect(calls.filter(c=>c.body)).toHaveLength(1));expect(calls.find(c=>c.body)!.body).toEqual({action:'apply',items:[{id:'result',fingerprint:'fingerprint'}],confirmAccessChanges:true});
});
test('uncertain suggestions can be left unfiled but not applied; stale results cannot be selected',async()=>{
  const calls=setup({uncertain:true});await open();fireEvent.click(await screen.findByRole('checkbox'));
  expect(screen.getByRole('button',{name:'Apply 1 filing suggestion'}).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Leave 1 unfiled'}));await waitFor(()=>expect(calls.find(c=>c.body)?.body.action).toBe('dismiss'));
  cleanup();setup({stale:true});await open();expect((await screen.findByRole('checkbox')).hasAttribute('disabled')).toBe(true);
});
test('pause is explicit and stale apply errors clear selections without disappearing on refresh',async()=>{
  const calls=setup();await open();fireEvent.click(await screen.findByRole('button',{name:'Pause AI filing'}));
  await waitFor(()=>expect(calls.find(c=>c.body)?.body).toEqual({action:'pause',expectedRevisionId:'settings'}));
  cleanup();setup({reject:true});await open();fireEvent.click(await screen.findByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Apply 1 filing suggestion'}));
  await screen.findByText('The file changed. Review again.');await waitFor(()=>expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false));
  expect(screen.queryByRole('button',{name:'Apply 1 filing suggestion'})).toBeNull();
});
test('pagination and history changes immediately discard old selections',async()=>{
  const calls=setup({many:true});await open();fireEvent.click(await screen.findByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Next'}));
  await screen.findByText('Another file');expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(calls.some(c=>c.path.includes('offset=50'))).toBe(true);fireEvent.click(screen.getByRole('button',{name:'History (0)'}));
  expect(screen.queryByRole('checkbox')).toBeNull();await screen.findByText('No completed filing reviews yet.');expect(calls.filter(c=>c.body)).toHaveLength(0);
});
