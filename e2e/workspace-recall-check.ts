/** Opt-in synthetic query-planning qualification. No user's files or workspace are read. */
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import { planRecall } from '../runtime/src/workspace/recall-plan';
import { contextTerms } from '../runtime/src/workspace/context-terms';
import { RECALL_CASES } from '../runtime/src/workspace/fixtures/recall-cases';
const options=qualificationOptions(process.argv.slice(2));
if(options.mode!=='live'||options.provider!=='codex') console.log('No model calls. Use --live --allow-plan-usage --provider codex --model MODEL for eight synthetic planning checks.');
else {
  const store=new WorkspaceStore({databasePath:':memory:'}), provider=new WorkspaceCodexProvider(options.model);
  try {
    const records=RECALL_CASES.map((item,index)=>store.createKnowledge({kind:'position',revision:{title:`Instruction ${index}`,body:item.body,status:'approved',approvedBy:'Synthetic Lawyer'}}));
    let recovered=0;
    for(const [index,item] of RECALL_CASES.entries()) {
      const boundary={all:false,matterId:null,sourceRevisionIds:[],workIds:[]},start=Date.now();
      const plan=await planRecall(provider,{request:item.prompt,previousRequests:[],attachmentTitles:[],matterTitles:[]},new AbortController().signal);
      const original=store.rankContext({terms:contextTerms(item.prompt)},boundary,3), expanded=store.rankContext({terms:contextTerms(item.prompt),alternateTerms:plan.terms},boundary,3);
      const found=expanded.some(r=>r.id===records[index]!.latest.id);if(found)recovered++;
      console.log(JSON.stringify({case:index+1,prompt:item.prompt,queries:plan.queries,status:plan.status,originalFound:original.some(r=>r.id===records[index]!.latest.id),expandedFound:found,elapsedMs:Date.now()-start}));
    }
    console.log(JSON.stringify({recovered,total:RECALL_CASES.length,noUserData:true}));if(recovered!==RECALL_CASES.length)process.exitCode=1;
  } finally {store.close();}
}
