import { parseWorkerInvocation, workspaceDistribution } from './distribution';

/** Dispatch before importing the launcher: worker execution must never open a
 * default workspace, initialize a provider, seed examples or start a server. */
export async function workspaceEntry(args = process.argv.slice(2)): Promise<void> {
  const worker = parseWorkerInvocation(args);
  if (worker) {
    switch (worker.kind) {
      case 'extract': return (await import('./file-worker')).runFileWorker(worker.args[0]!);
      case 'redline': return (await import('./redline-worker')).runRedlineWorker();
      case 'rounds': return (await import('./document-rounds-worker')).runRoundsWorker();
      case 'clean': return (await import('./clean-proposal-worker')).runCleanWorker();
      case 'backup': return (await import('./backup-worker')).runBackupWorker();
    }
  }
  if (args.length === 1 && args[0] === '--version') {
    console.log(JSON.stringify({ application: 'Counsel workspace', channel: 'local-unreleased', build: workspaceDistribution()?.build ?? null }));
    return;
  }
  await (await import('./launch')).launchWorkspace(args);
}
if (import.meta.main) workspaceEntry().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
