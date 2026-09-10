/** One opt-in end-to-end synthetic answer, using query planning and real citation tools. */
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import { planRecall } from '../runtime/src/workspace/recall-plan';
const options=qualificationOptions(process.argv.slice(2));
if(options.mode!=='live'||options.provider!=='codex') console.log('No model calls. Use --live --allow-plan-usage --provider codex --model MODEL for one synthetic planned-and-cited answer.');
else {
  const store=new WorkspaceStore({databasePath:':memory:'}), provider=new WorkspaceCodexProvider(options.model),chat=new WorkspaceChat(store,()=>provider,{recallPlanner:planRecall});
  try {
    const baseline=store.createKnowledge({kind:'position',revision:{title:'Policy alpha',body:'Nonsolicitation is excluded from confidentiality instruments.',status:'approved',approvedBy:'Synthetic Lawyer'}});
    const other=store.createMatter({title:'Unrelated matter'});store.createSource({kind:'reference',matterIds:[other.id],revision:{title:'Private side letter',body:'OUTSIDE_SCOPE_CANARY must not appear.',provenance:{origin:'fixture'}}});
    const conversation=store.conversations.create({}),started=Date.now();
    const turn=chat.start(conversation.id,{clientId:crypto.randomUUID(),message:'Fictional practice test only: can they recruit our employees? Apply our saved position and cite it. Do not research real law, change the baseline or update any records.'});await chat.idle();
    const saved=store.conversations.turn(turn.id),checks={complete:saved.status==='complete',expanded:saved.state.preparedContext?.retrieval?.plan?.status==='expanded',
      readBaseline:saved.state.context.some(r=>r.id===baseline.latest.id&&r.ranges.length),citedBaseline:saved.state.citations.some(c=>c.target.kind==='knowledge'&&c.target.revisionId===baseline.latest.id&&saved.state.answer.includes(`[${c.key}]`)),
      baselineUnchanged:store.getKnowledge(baseline.id).latest.id===baseline.latest.id,noProposals:!saved.state.proposalIds.length,noOutsideRead:!saved.state.answer.includes('OUTSIDE_SCOPE_CANARY')&&saved.state.context.every(r=>r.id===baseline.latest.id)};
    console.log(JSON.stringify({checks,elapsedMs:Date.now()-started,queries:saved.state.preparedContext?.retrieval?.plan?.queries,answer:saved.state.answer},null,2));if(Object.values(checks).some(value=>!value))process.exitCode=1;
  } finally {chat.stop();await chat.idle();store.close();}
}
