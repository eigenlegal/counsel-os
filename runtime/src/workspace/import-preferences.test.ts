import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { ImportChoice, ImportCommit, type ImportBatch } from './import-types';
import { mapImportPreferences, combineImportPreferences, ImportPreferenceChanges, type ImportPreferenceReview } from './import-preferences';
import { WorkingPreferenceFields, reviewInstructions, wordOutputFilename } from './working-preferences';
import { prepareSourceOrganization } from './source-organization';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

const body = '# Working preferences\n## Writing instructions\n### Memos\nPreserve **meaningful detail**.\n\n## NDA review instructions\nMake surgical edits; explain material changes.\n\n## Signing guidance\nMorgan may sign vendor agreements for Fictional Co up to and including $75,000 annual spend. Ask about unknown value or currency.\n\n## Word output\nword author: Synthetic Lawyer\nfilename pattern: "{document} ({variant} {date})"\nredline label: SL Redline\ndraft label: SL Draft\n\n## Entity directory\nNot an authority record.';

test('labeled working instructions and Word settings map verbatim, without executing or applying them', () => {
  const result = mapImportPreferences(body);
  expect(result.suggestion).toEqual({ writingInstructions: '### Memos\nPreserve **meaningful detail**.', ndaReview: 'Make surgical edits; explain material changes.',
    signingInstructions: 'Morgan may sign vendor agreements for Fictional Co up to and including $75,000 annual spend. Ask about unknown value or currency.',
    customAuthor: 'Synthetic Lawyer', filenamePattern: '{document} ({variant} {date})', redlineLabel: 'SL Redline', draftLabel: 'SL Draft' });
  expect(result.warnings).toEqual([]);expect(result.unmappedSections).toContain('Entity directory');
  expect(mapImportPreferences('## Filename pattern\n`{document}_{variant}`').suggestion.filenamePattern).toBe('{document}_{variant}');
});
test('no guessing, silent truncation, code extraction, conflicting selection or arbitrary token/path conversion', () => {
  const result = mapImportPreferences('```yaml\nword author: Malicious Name\n```\n## Team\nword author: Another Person\n## NDA review\nFirst version.\n## NDA preferences\nSecond version.\n## Signing guidance\n'+ 'x'.repeat(4001)+'\n## Word output\nfilename pattern: ../../{document}\nword author: me\nredline label: /path');
  expect(result.suggestion).toEqual({});expect(result.warnings).toHaveLength(5);
  expect(result.warnings.some(warning => warning.includes('conflicting'))).toBe(true);
  expect(mapImportPreferences('filename pattern: {client}_{document}').suggestion).toEqual({});
  expect(mapImportPreferences('nda_review: |\n  Keep this exact text.\n  And this line.').suggestion.ndaReview).toBe('Keep this exact text.\nAnd this line.');
});
test('partial settings have no defaults; author pairs, oversized fields and unknown properties are validated', () => {
  expect(ImportPreferenceChanges.parse({ ndaReview:'New instruction.' })).toEqual({ ndaReview:'New instruction.' });
  for (const value of [{}, {customAuthor:'A'}, {authorMode:'custom'}, {filenamePattern:'../bad'}, {signingInstructions:'x'.repeat(4001)}, {applyToChats:true}, {authorMode:'profile',customAuthor:'A'}])
    expect(ImportPreferenceChanges.safeParse(value).success).toBe(false);
  expect(ImportPreferenceChanges.parse({ndaReview:''})).toEqual({ndaReview:''});
  expect(ImportChoice.safeParse({title:'Settings',destination:'source',preferences:{expectedRevisionId:null,changes:{ndaReview:'No'}}}).success).toBe(false);
  expect(ImportCommit.parse({expectedRevisionId:crypto.randomUUID()})).not.toHaveProperty('preferences');
});
test('multi-file reviews combine nonoverlapping and identical fields, and reject conflicting values or review revisions', () => {
  const a={expectedRevisionId:null,changes:{ndaReview:'NDA defaults.'}};
  expect(combineImportPreferences([a,a,{expectedRevisionId:null,changes:{writingInstructions:'Plain words.'}}])).toMatchObject({files:3,conflicts:[],review:{changes:{ndaReview:'NDA defaults.',writingInstructions:'Plain words.'}}});
  const conflict=combineImportPreferences([a,{...a,changes:{ndaReview:'Different.'}}]);
  expect(conflict.review).toBeNull();expect(conflict.conflicts).toEqual(['NDA review instructions']);
  expect(combineImportPreferences([a,{...a,expectedRevisionId:crypto.randomUUID()}]).review).toBeNull();
});
async function staged(store: WorkspaceStore, files: Record<string,string>) {
  const batch=store.imports.create({clientId:crypto.randomUUID(),label:'Synthetic settings import',files:Object.entries(files).map(([path,text])=>({path,byteCount:Buffer.byteLength(text)}))});
  for (const entry of batch.entries) store.imports.receive(batch.id,entry.id,Buffer.from(files[entry.path]!).toString('base64'));
  await store.imports.idle();return store.imports.get(batch.id);
}
function select(store: WorkspaceStore, batch: ImportBatch, index: number, review: ImportPreferenceReview) {
  const entry=batch.entries[index]!;
  return store.imports.edit(batch.id,entry.id,{expectedRevisionId:batch.revisionId,choice:{...entry.choice,destination:'profile',profile:null,preferences:review}});
}
async function withStore(run:(store:WorkspaceStore,root:string)=>Promise<void>) {
  const root=mkdtempSync(join(tmpdir(),'counsel-import-settings-')), store=new WorkspaceStore({databasePath:join(root,'workspace.sqlite3')});
  try {await run(store,root);} finally {store.close();rmSync(root,{recursive:true,force:true});}
}
test('review and file import do not apply preferences without the separate confirmation', async()=>withStore(async store=>{
  let batch=await staged(store,{'Documents/review.md':body});
  expect(store.imports.inspect(batch.id,batch.entries[0]!.id).preferenceMapping.suggestion.ndaReview).toBeTruthy();
  batch=select(store,batch,0,{expectedRevisionId:null,changes:{ndaReview:'Reviewed but not applied.'}});
  expect(store.getWorkingPreferences()).toBeNull();
  const committed=store.imports.commit(batch.id,{expectedRevisionId:batch.revisionId});
  expect(store.getWorkingPreferences()).toBeNull();expect(committed.receipt?.workingPreferencesRevisionId).toBeUndefined();
  expect(store.originalFile(committed.receipt!.items[0]!.sourceRevisionId).bytes.toString()).toBe(body);
}));
test('atomic multi-file application preserves unrelated settings, profile, originals, baseline separation and backup replay', async()=>withStore(async(store,root)=>{
  const initial=store.saveWorkingPreferences({expectedRevisionId:null,writingInstructions:'Keep this writing style.',generalReview:'Keep general review.',signingInstructions:'Keep signing guidance.',ndaReview:'Old NDA instructions.',filenamePattern:'{document}_{variant}',authorMode:'custom',customAuthor:'Original Author'});
  let batch=await staged(store,{'Loose/NDA.md':'## NDA review\nSurgical edits.', 'Loose/Word.md':'## Word output\nword author: Synthetic Lawyer\nfilename pattern: {document} ({variant} {date})'});
  const ndaId=batch.entries.find(entry=>entry.path.endsWith('NDA.md'))!.id;
  batch=select(store,batch,batch.entries.findIndex(entry=>entry.id===ndaId),{expectedRevisionId:initial.revisionId,changes:{ndaReview:'Surgical edits.'}});
  batch=select(store,batch,batch.entries.findIndex(entry=>entry.id!==ndaId),{expectedRevisionId:initial.revisionId,changes:{authorMode:'custom',customAuthor:'Synthetic Lawyer',filenamePattern:'{document} ({variant} {date})',redlineLabel:'SL Redline'}});
  expect(store.getWorkingPreferences()).toEqual(initial);
  const input={expectedRevisionId:batch.revisionId,preferences:batch.selection.preferences!.review!};
  const committed=store.imports.commit(batch.id,input), prefs=store.getWorkingPreferences()!;
  expect(prefs).toMatchObject({...WorkingPreferenceFields.strip().parse(initial),...input.preferences.changes,version:2});
  expect(committed.receipt!.workingPreferencesRevisionId).toBe(prefs.revisionId);
  expect(reviewInstructions(store.workingPreferenceSnapshot())?.ndaReview).toBe('Surgical edits.');
  expect(wordOutputFilename(store.workingPreferenceSnapshot()!.word,{document:'Acme NDA',variant:'redline',date:'2026-09-09'})).toBe('Acme NDA (SL Redline 2026-09-09).docx');
  expect(store.getProfile()).toBeNull();expect(store.getEntityRegistry()).toBeNull();expect(store.catalog().knowledge).toHaveLength(0);
  expect(store.imports.commit(batch.id,input).receipt).toEqual(committed.receipt);expect(store.getWorkingPreferences()!.version).toBe(2);
  const source=store.getSource(committed.receipt!.items[0]!.sourceId);
  store.placeSource(source.id,{collection:'auto',expectedRevisionId:source.placement!.revisionId});
  expect(()=>prepareSourceOrganization(store,[source.id])).toThrow('profile originals');
  const backup=await createWorkspaceBackup(store.databasePath),path=join(root,backup.name);writeFileSync(path,backup.bytes);
  const restored=await restoreWorkspaceBackup(path,join(root,'restored'));const copy=new WorkspaceStore({databasePath:restored.databasePath});
  try {expect(copy.getWorkingPreferences()).toEqual(prefs);expect(copy.imports.get(batch.id).receipt).toEqual(committed.receipt);} finally {copy.close();}
}));
test('stale or forged confirmations cannot modify settings or partially import files; files-only fallback remains available', async()=>withStore(async store=>{
  let batch=await staged(store,{'profile.md':body});
  batch=select(store,batch,0,{expectedRevisionId:null,changes:{ndaReview:'Reviewed instructions.'}});
  expect(()=>store.imports.commit(batch.id,{expectedRevisionId:batch.revisionId,preferences:{expectedRevisionId:null,changes:{ndaReview:'Forged change.'}}})).toThrow('resolve conflicting');
  const current=store.saveWorkingPreferences({expectedRevisionId:null,ndaReview:'Changed in another window.'});
  expect(()=>store.imports.commit(batch.id,{expectedRevisionId:batch.revisionId,preferences:batch.selection.preferences!.review!})).toThrow('changed after');
  expect(store.catalog().sources).toHaveLength(0);expect(store.imports.get(batch.id).status).toBe('review');expect(store.getWorkingPreferences()).toEqual(current);
  store.imports.commit(batch.id,{expectedRevisionId:batch.revisionId});expect(store.getWorkingPreferences()).toEqual(current);
}));
test('conflicts block application; changing a reviewed file back to a source clears its settings patch', async()=>withStore(async store=>{
  let batch=await staged(store,{'one.md':'## NDA review\nFirst.','two.md':'## NDA review\nSecond.'});
  batch=select(store,batch,0,{expectedRevisionId:null,changes:{ndaReview:'First.'}});
  batch=select(store,batch,1,{expectedRevisionId:null,changes:{ndaReview:'Second.'}});
  expect(batch.selection.preferences!.conflicts).toEqual(['NDA review instructions']);
  expect(()=>store.imports.commit(batch.id,{expectedRevisionId:batch.revisionId,preferences:{expectedRevisionId:null,changes:{ndaReview:'First.'}}})).toThrow('resolve conflicting');
  batch=store.imports.bulkEdit(batch.id,{expectedRevisionId:batch.revisionId,entryIds:[batch.entries[1]!.id],patch:{destination:'source'}});
  expect(batch.selection.preferences).toMatchObject({files:1,conflicts:[],review:{changes:{ndaReview:'First.'}}});
}));
test('a late settings write failure rolls back the import; reviewed patches survive staged backup and reopen', async()=>withStore(async(store,root)=>{
  let batch=await staged(store,{'preferences.md':body});
  batch=select(store,batch,0,{expectedRevisionId:null,changes:{ndaReview:'Reviewed default.'}});
  const backup=await createWorkspaceBackup(store.databasePath),path=join(root,backup.name);writeFileSync(path,backup.bytes);
  const restored=await restoreWorkspaceBackup(path,join(root,'restored')), copy=new WorkspaceStore({databasePath:restored.databasePath});
  try {
    expect(copy.imports.get(batch.id).selection.preferences).toEqual(batch.selection.preferences);
    copy.imports.commit(batch.id,{expectedRevisionId:batch.revisionId,preferences:batch.selection.preferences!.review!});
    expect(copy.getWorkingPreferences()!.ndaReview).toBe('Reviewed default.');
  } finally {copy.close();}
  const faultDb = new Database(store.databasePath);
  try {
    faultDb.exec("CREATE TRIGGER reject_import_preferences BEFORE INSERT ON workspace_settings WHEN NEW.key='working-preferences' BEGIN SELECT RAISE(ABORT,'synthetic preference failure'); END");
    expect(()=>store.imports.commit(batch.id,{expectedRevisionId:batch.revisionId,preferences:batch.selection.preferences!.review!})).toThrow('synthetic preference failure');
    expect(store.getWorkingPreferences()).toBeNull();expect(store.catalog().sources).toHaveLength(0);
    expect(store.imports.get(batch.id).status).toBe('review');expect(store.imports.inspect(batch.id,batch.entries[0]!.id).body).toBe(body);
  } finally {faultDb.exec('DROP TRIGGER IF EXISTS reject_import_preferences');faultDb.close();}
  store.imports.commit(batch.id,{expectedRevisionId:batch.revisionId,preferences:batch.selection.preferences!.review!});
  expect(store.getWorkingPreferences()!.ndaReview).toBe('Reviewed default.');
}));
