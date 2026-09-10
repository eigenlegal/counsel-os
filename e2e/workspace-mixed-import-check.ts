/** Opt-in real classification of fictional mixed roots; never accepts a personal database. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { WorkspaceCodexProvider } from '../runtime/src/workspace/codex';
import { WorkspaceClaudeCodeProvider } from '../runtime/src/workspace/claude-code';
import { qualificationOptions } from '../runtime/src/workspace/qualification';
import { qualifyMixedImport } from '../runtime/src/workspace/mixed-import-qualification';
const options=qualificationOptions(process.argv.slice(2));
if(options.mode!=='live') console.log('No model calls. Use --live --allow-plan-usage --provider codex|claude-code --model MODEL for a fictional mixed-folder migration check.');
else {
  const root=mkdtempSync(join(tmpdir(),'counsel-mixed-import-check-')),store=new WorkspaceStore({databasePath:join(root,'workspace.sqlite3')});
  try {
    const provider=options.provider==='codex'?new WorkspaceCodexProvider(options.model):new WorkspaceClaudeCodeProvider(options.model);
    const result=await qualifyMixedImport(store,provider,{kind:options.provider,model:options.model});
    console.log(JSON.stringify({root,...result,noUserData:true,followUpReads:'Scripted model, actual application preparation and boundary checks.'},null,2));
    if(Object.values(result.checks).some(value=>!value))process.exitCode=1;
  } finally {store.close();}
}
