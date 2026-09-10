import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { FakeModelProvider } from '../core/fake-provider';
import type { StepRequest } from '../core/types';
import { qualifyMixedImport, scriptedMixedSuggestions } from './mixed-import-qualification';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { MIXED_IMPORT, MIXED_COMPANY_PATH } from './fixtures/mixed-import';

test('mixed roots qualify organization, separate company/matter/profile identity, reviewed links, real recall and backup', async () => {
  const root=mkdtempSync(join(tmpdir(),'counsel-mixed-import-'));const store=new WorkspaceStore({databasePath:join(root,'workspace.sqlite3')});
  const requests:StepRequest[]=[];
  const provider=new FakeModelProvider([]);
  provider.run=async function*(request){requests.push(request);yield {type:'done',output:scriptedMixedSuggestions(request),usage:{inputTokens:0,outputTokens:0}};};
  try {
    const result=await qualifyMixedImport(store,provider,{kind:'codex',model:'synthetic'});
    expect(Object.entries(result.checks).filter(([,pass])=>!pass)).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests.every(request=>!request.tools.length&&!request.system.includes('PRIVATE_PROFILE_CANARY')&&!request.system.includes('EMBEDDED_CODE_INSTRUCTION_CANARY'))).toBe(true);
    if(!('batchId' in result)) throw new Error('Qualification failed before import.');
    const profile=store.getProfile(), source=store.getSource(result.companyId!);
    const backup=await createWorkspaceBackup(store.databasePath),path=join(root,backup.name);writeFileSync(path,backup.bytes);
    const restored=await restoreWorkspaceBackup(path,join(root,'restored'));const copy=new WorkspaceStore({databasePath:restored.databasePath});
    try {
      expect(copy.getProfile()).toEqual(profile);expect(copy.getSource(source.id)).toEqual(source);
      expect(copy.originalFile(source.latest.id).bytes.toString()).toBe(MIXED_IMPORT[MIXED_COMPANY_PATH]);
      const repeat=copy.imports.create({clientId:crypto.randomUUID(),label:'Repeated folder selection',files:[{path:'Renamed/company.md',byteCount:Buffer.byteLength(MIXED_IMPORT[MIXED_COMPANY_PATH])}]});
      copy.imports.receive(repeat.id,repeat.entries[0]!.id,Buffer.from(MIXED_IMPORT[MIXED_COMPANY_PATH]).toString('base64'));await copy.imports.idle();
      expect(copy.imports.duplicates(repeat.id).items[0]!.sourceId).toBe(source.id);
    } finally {copy.close();}
  } finally {store.close();rmSync(root,{recursive:true,force:true});}
});
