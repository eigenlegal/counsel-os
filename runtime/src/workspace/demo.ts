import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';

/** An inspectable synthetic workspace, never an existing user's vault. */
if (import.meta.main) {
  const root = mkdtempSync(join(tmpdir(), 'counsel-workspace-demo-'));
  const databasePath = join(root, 'workspace.sqlite3');
  const seed: unknown = JSON.parse(readFileSync(join(import.meta.dir, 'fixtures/practice.json'), 'utf8'));
  let store = new WorkspaceStore({ databasePath });
  try {
    const receipt = store.importSeed(seed);
    const recorded = store.getWork(receipt.records.work.advice!);
    store.close();
    store = new WorkspaceStore({ databasePath });
    const recalled = store.getWork(recorded.id);
    if (JSON.stringify(recorded) !== JSON.stringify(recalled)) throw new Error('work or evidence changed after reopening');
    console.log('Workspace storage demo — synthetic records, no model calls.');
    console.log(`Database retained for inspection: ${databasePath}`);
    console.log(JSON.stringify({
      matters: store.listMatters().map(matter => ({ id: matter.id, title: matter.title, kind: matter.kind })),
      researchAndAdvice: store.search({ query: 'monitoring', matterId: receipt.records.matters.monitoring }).hits,
      investigation: store.search({ query: 'outstanding', matterId: receipt.records.matters.investigation }).hits,
      documentWork: store.search({ query: 'notices', matterId: receipt.records.matters.agreement }).hits,
      recalledEvidence: recalled.evidence,
      repeatImport: store.importSeed(seed).alreadyImported,
    }, null, 2));
  } finally {
    store.close();
  }
}
