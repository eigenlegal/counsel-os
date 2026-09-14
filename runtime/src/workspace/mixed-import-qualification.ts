import type { ModelProvider, StepRequest } from '../core/types';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { MIXED_IMPORT, MIXED_DRAFT_ORIGINAL, MIXED_PROFILE_PATH, MIXED_COMPANY_PATH } from './fixtures/mixed-import';
import { ProfileFields } from './profile';
import type { ModelChoice } from './model-choice';

/** Shared acceptance scenario: scripted or opt-in live organization; actual import and
 * scoped follow-up reads. Only caller-created synthetic stores are accepted by convention.
 */
export async function qualifyMixedImport(store: WorkspaceStore, provider: ModelProvider, modelChoice: ModelChoice) {
  const nda=store.createMatter({title:'Project Starling NDA'}), employment=store.createMatter({title:'Northstar employment dispute'}), outside=store.createMatter({title:'Unrelated confidential matter'});
  const existing=await store.importDocument({name:'original.txt',base64:Buffer.from(MIXED_DRAFT_ORIGINAL).toString('base64'),matterId:nda.id});
  const created=store.imports.create({clientId:crypto.randomUUID(),label:'Synthetic mixed-folder migration',
    files:Object.entries(MIXED_IMPORT).map(([path,body])=>({path,byteCount:Buffer.byteLength(body)}))});
  for(const file of created.entries) if(file.status!=='skipped') store.imports.receive(created.id,file.id,Buffer.from(MIXED_IMPORT[file.path as keyof typeof MIXED_IMPORT]).toString('base64'));
  await store.imports.idle();
  const duplicates=store.imports.duplicates(created.id);
  store.imports.skipDuplicates(created.id,{expectedVersion:duplicates.expectedVersion,entryIds:duplicates.items.map(item=>item.entryId)});
  const prepared=store.imports.get(created.id), profileEntry=prepared.entries.find(item=>item.path===MIXED_PROFILE_PATH)!;
  const mapping=store.imports.inspect(created.id,profileEntry.id).profileMapping;
  const profile=ProfileFields.parse(mapping.suggestion);
  store.imports.edit(created.id,profileEntry.id,{expectedRevisionId:prepared.revisionId,choice:{...profileEntry.choice,profile}});
  const ready=store.imports.get(created.id), organizer=new WorkspaceChat(store,()=>provider);
  try {
    organizer.startImportOrganization(created.id,{requestId:crypto.randomUUID(),expectedRevisionId:ready.revisionId,modelChoice,shareForSuggestions:true});
    await organizer.idle();
    const job=store.imports.organization.get(created.id)!;
    const at=(path:string)=>job.suggestions.find(item=>item.path===path);
    const company=at(MIXED_COMPANY_PATH), ambiguous=at('Other/meeting.txt'), baseline=at('Counsel OS/practice/standards/confidentiality.md'), reference=at('Reading/article.md');
    const classified={complete:job.status==='complete',allAnalyzed:job.analyzed===8,
      existingMatters:at('Counsel OS/matters/2026/starling.md')?.choice.matterId===nda.id && at('Counsel OS/matters/2026/employment.md')?.choice.matterId===employment.id,
      sameDealAcrossRoots:['Loose Files/a17.txt','Downloads/final.txt'].every(path=>at(path)?.choice.matterId===nda.id && at(path)?.choice.destination==='source'),
      companyNotIdentity:company?.choice.destination==='source'&&!company.choice.matterId&&!company.choice.matterTitle&&company.choice.collection==='unfiled',
      uncertainUnfiled:ambiguous?.choice.destination==='source'&&!ambiguous.choice.matterId&&!ambiguous.choice.matterTitle,
      baselineSeparate:baseline?.choice.destination==='position'&&baseline.choice.collection==='practice'&&!baseline.choice.matterId&&!baseline.choice.matterTitle,
      externalSeparate:reference?.choice.destination==='source'&&reference.choice.collection==='external',
      noEarlyImport:store.catalog().sources.length===1&&store.catalog().knowledge.length===0&&store.getProfile()===null};
    if(Object.values(classified).some(value=>!value)) return {checks:classified,jobMessage:job.message,suggestions:job.suggestions.map(({path,choice,confidence})=>({path,choice,confidence}))};
    // Clear choices are already staged; this explicit qualification review also
    // accepts the uncertain synthetic row before the separate final import.
    store.imports.editChoices(created.id,{expectedRevisionId:store.imports.get(created.id).revisionId,changes:job.suggestions.map(item=>({entryId:item.entryId,choice:item.choice}))});
    const links=store.imports.links(created.id), shares=links.items.filter(item=>item.canShare&&item.targetId===company!.entryId);
    store.imports.applyLinks(created.id,{expectedRevisionId:links.revisionId,expectedVersion:links.expectedVersion,linkIds:shares.map(item=>item.id),confirmAccessChanges:true});
    const reviewed=store.imports.get(created.id), saved=store.imports.commit(created.id,{expectedRevisionId:reviewed.revisionId,profile});
    const itemAt=(path:string)=>saved.receipt!.items.find(item=>item.entryId===reviewed.entries.find(entry=>entry.path===path)!.id)!;
    const companyItem=itemAt(MIXED_COMPANY_PATH), source=store.getSource(companyItem.sourceId);
    const reader=new FakeModelProvider([{text:'Synthetic retrieval verification.'}]), chat=new WorkspaceChat(store,()=>reader);
    let context=false,profilePrivate=false;
    try {
      const conversation=store.conversations.create({scope:'matter',matterId:nda.id});
      const turn=chat.start(conversation.id,{clientId:crypto.randomUUID(),message:'What company history and former operating name do we have?'});await chat.idle();
      context=store.conversations.turn(turn.id).state.context.some(item=>item.id===companyItem.sourceRevisionId&&item.ranges.length>0);
      profilePrivate=!reader.lastRequest!.system.includes('PRIVATE_PROFILE_CANARY');
    } finally {chat.stop();await chat.idle();}
    return {checks:{...classified,companySharedTwice:source.matterIds.length===2&&source.matterIds.includes(nda.id)&&source.matterIds.includes(employment.id),
      missingLinkVisible:links.items.some(item=>item.href==='not-provided-executed'&&item.status==='missing'),
      noDuplicateMatters:store.catalog().matters.length===3,exactDuplicateSkipped:duplicates.items.length===1&&duplicates.items[0]!.sourceId===existing.id,
      changedDraftRetained:store.getSource(itemAt('Loose Files/a17.txt').sourceId).latest.body?.includes('Draft 2')===true,
      originalsIdentical:saved.receipt!.items.every(item=>store.originalFile(item.sourceRevisionId).bytes.equals(Buffer.from(MIXED_IMPORT[reviewed.entries.find(entry=>entry.id===item.entryId)!.path as keyof typeof MIXED_IMPORT]))),
      baselinePending:store.getKnowledge(itemAt('Counsel OS/practice/standards/confidentiality.md').practiceId!).active===null,
      profileMapped:store.getProfile()?.voice===profile.voice&&store.getProfile()?.principles===profile.principles&&!store.getProfile()?.applyToChats,
      unmappedReported:mapping.unmappedSections.includes('Word output'),settingsNotInferred:!store.getWorkingPreferences()&&!store.getEntityRegistry()&&!store.clients.list().length,
      companyNotPersonalProfile:!store.imports.isProfileSource(companyItem.sourceId),
      unsupportedVisible:reviewed.entries.some(item=>item.path.endsWith('.doc')&&item.status==='skipped'),context,profilePrivate,
      unrelatedExcluded:store.search({matterId:outside.id,query:'COMPANY_HISTORY_CANARY'}).hits.length===0},
      batchId:saved.id,companyId:companyItem.sourceId,jobCalls:job.calls};
  } finally {organizer.stop();await organizer.idle();}
}

/** Test oracle only, never production classification. */
export function scriptedMixedSuggestions(request: StepRequest) {
  const context=JSON.parse(request.system.split('Context:\n').at(-1)!);
  return {suggestions:context.files.map((file: {entryId:string;path:string;evidence:Array<{id:string;text:string}>})=>{
    const nda=/starling\.md$|a17\.txt$|final\.txt$/.test(file.path), dispute=file.path.endsWith('employment.md');
    return {entryId:file.entryId,destination:file.path.includes('/standards/')?'position':'source',
      collection:file.path.includes('/standards/')?'practice':file.path==='Reading/article.md'?'external':'unfiled',
      matterId:nda?context.candidateMatters.find((matter:{title:string})=>matter.title==='Project Starling NDA').id:dispute?context.candidateMatters.find((matter:{title:string})=>matter.title==='Northstar employment dispute').id:null,
      matterTitle:null,whenToUse:'',reason:'Synthetic oracle for application behavior, not classification quality.',confidence:file.path==='Other/meeting.txt'?'low':'high',evidenceRef:file.evidence[1]!.id};
  })};
}
