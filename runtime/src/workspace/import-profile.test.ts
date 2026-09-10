import { expect, test } from 'bun:test';
import { mapImportProfile } from './import-profile';
import { suggestImport } from './import-types';
import { WorkspaceStore } from './store';
import { prepareSourceOrganization } from './source-organization';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('company profiles are ordinary documents; only bare/known practice profile paths suggest personal setup', () => {
  for (const path of ['Companies/Acme/profile.md', 'Acme/profile.md', 'Inbox/People/profile.txt', 'matters/Acme/profile.md'])
    expect(suggestImport(path).destination).toBe('source');
  for (const path of ['profile.md', 'Counsel OS/practice/profile.md', 'Practice/profile.txt']) expect(suggestImport(path).destination).toBe('profile');
});
test('explicit identity and complete labeled preferences map without rewriting their Markdown or granting sharing', () => {
  const result = mapImportProfile('# My practice\nfull_name: "Synthetic Lawyer"\nrole: Counsel\ncompany: Fictional firm\npractice_areas: Advice\njurisdictions: Testland\n\n## Business Context\nAn independent practice.\n\n## Philosophy\n- Keep **proportionality**.\n\n## Voice\n### Tone\nPlain language.\n\n## Escalation Triggers\nConsult on uncertainty.\n\n## Word output\nUse custom names.');
  expect(result.suggestion).toMatchObject({ name:'Synthetic Lawyer', role:'Counsel', organization:'Fictional firm', practiceAreas:'Advice', jurisdictions:'Testland',
    organizationContext:'An independent practice.', principles:'- Keep **proportionality**.', voice:'### Tone\nPlain language.', escalationThresholds:'Consult on uncertainty.', applyToChats:false });
  expect(result.mapped).toHaveLength(9);expect(result.warnings).toHaveLength(0);expect(result.unmappedSections).toEqual(['Word output']);
});
test('no roster identity or code instructions; missing names leave an editable draft, not a guessed lawyer', () => {
  const result = mapImportProfile('# Practice Profile\n```yaml\nname: Impersonated Person\n```\n## Team\nname: Other Lawyer\nrole: Partner\n## Philosophy\nPractical advice.');
  expect(result.suggestion?.name).toBe('');expect(result.suggestion?.role).toBe('');
  expect(result.suggestion?.principles).toBe('Practical advice.');expect(result.warnings.join(' ')).toContain('Enter your name');
  expect(result.unmappedSections).toEqual(['Team']);
  expect(mapImportProfile('## Team\nname: Other Lawyer').suggestion).toBeNull();
});
test('conflicting and overlong fields are not silently picked or shortened; labeled multiline text is preserved', () => {
  const result = mapImportProfile('name: First\nname: Second\norganization_context: |\n  First line.\n  Second line.\nprinciples: >\n  Keep the words.\n  Do not summarize.\nvoice: '+ 'x'.repeat(2001));
  expect(result.suggestion).toMatchObject({name:'',organizationContext:'First line.\nSecond line.', principles:'Keep the words.\nDo not summarize.',voice:''});
  expect(result.warnings.some(warning=>warning.includes('conflicting'))).toBe(true);
  expect(result.warnings.some(warning=>warning.includes('not shortened'))).toBe(true);
  expect(mapImportProfile('name: A\n## Name\nA').warnings).toHaveLength(0);
});
test('reviewed profile fields apply only at commit, with sharing off; existing profiles and originals stay protected', async () => {
  const root=mkdtempSync(join(tmpdir(),'counsel-profile-mapping-'));
  const store = new WorkspaceStore({databasePath:join(root,'workspace.sqlite3')});
  try {
    const body='name: Synthetic Lawyer\n## Voice\nKeep it concise.\n## Signing rules\nUnmapped authority text.';
    const batch=store.imports.create({clientId:crypto.randomUUID(),label:'Profile test',files:[{path:'Arbitrary root/practice/profile.md',byteCount:Buffer.byteLength(body)}]});
    store.imports.receive(batch.id,batch.entries[0]!.id,Buffer.from(body).toString('base64'));await store.imports.idle();
    const entry=store.imports.get(batch.id).entries[0]!, mapping=store.imports.inspect(batch.id,entry.id);
    expect(mapping.profileMapping.unmappedSections).toEqual(['Signing rules']);expect(store.getProfile()).toBeNull();
    const reviewed=store.imports.edit(batch.id,entry.id,{expectedRevisionId:store.imports.get(batch.id).revisionId,choice:{...entry.choice,profile:mapping.profileSuggestion}});
    expect(store.getProfile()).toBeNull();expect(store.catalog().sources).toHaveLength(0);
    const committed=store.imports.commit(batch.id,{expectedRevisionId:reviewed.revisionId,profile:mapping.profileSuggestion});
    expect(store.getProfile()).toMatchObject({name:'Synthetic Lawyer',voice:'Keep it concise.',applyToChats:false});
    expect(store.originalFile(committed.receipt!.items[0]!.sourceRevisionId).bytes.toString()).toBe(body);
    const profileSourceId=committed.receipt!.items[0]!.sourceId;
    expect(store.imports.isProfileSource(profileSourceId)).toBe(true);
    store.placeSource(profileSourceId,{collection:'auto',expectedRevisionId:store.getSource(profileSourceId).placement!.revisionId});
    expect(()=>prepareSourceOrganization(store,[profileSourceId])).toThrow('profile originals');
    const updated=await store.updateSourceFile(profileSourceId,{expectedRevisionId:committed.receipt!.items[0]!.sourceRevisionId,name:'Renamed.txt',base64:Buffer.from(body+'\nUpdated.').toString('base64')});
    expect(store.imports.isProfileSource(updated.id)).toBe(true);
    expect(()=>prepareSourceOrganization(store,[updated.id])).toThrow('profile originals');
    expect(store.getWorkingPreferences()).toBeNull();expect(store.getEntityRegistry()).toBeNull();
    const again=store.imports.create({clientId:crypto.randomUUID(),label:'Again',files:[{path:'profile.md',byteCount:Buffer.byteLength(body)}]});
    store.imports.receive(again.id,again.entries[0]!.id,Buffer.from(body).toString('base64'));await store.imports.idle();
    const ready=store.imports.get(again.id);
    expect(()=>store.imports.commit(again.id,{expectedRevisionId:ready.revisionId,profile:mapping.profileSuggestion})).toThrow('Existing profiles');
    store.imports.commit(again.id,{expectedRevisionId:ready.revisionId,profile:null});
    expect(store.getProfile()!.voice).toBe('Keep it concise.');
  } finally {store.close();rmSync(root,{recursive:true,force:true});}
});
