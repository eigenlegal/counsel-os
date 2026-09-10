import { join } from 'node:path';
import type { StaticSource } from '../server/static';

/** Registered only by the generated workspace executable, never the plugin's
 * legacy binary. Paths name embedded Bun files, not a user's filesystem. */
export interface WorkspaceDistribution {
  ui: StaticSource;
  pdfResources: Record<string, string>;
  build: { id: string; sourceVersion: string; builtAt: string; target: string; bun: string };
}
let distribution: WorkspaceDistribution | null = null;
export function registerWorkspaceDistribution(value: WorkspaceDistribution): void {
  if (distribution) throw new Error('Workspace distribution already registered.');
  distribution = value;
}
export function workspaceDistribution(): WorkspaceDistribution | null { return distribution; }

const WORKERS = {
  extract: 'file-worker.ts',
  redline: 'redline-worker.ts',
  rounds: 'document-rounds-worker.ts',
  clean: 'clean-proposal-worker.ts',
  backup: 'backup-worker.ts',
} as const;
export type WorkspaceWorker = keyof typeof WORKERS;
export interface WorkerInvocation { kind: WorkspaceWorker; args: string[] }

export function parseWorkerInvocation(args: string[]): WorkerInvocation | null {
  if (args[0] !== '--internal-worker') return null;
  const kind = args[1];
  if (!kind || !Object.hasOwn(WORKERS, kind)) throw new Error('Unknown internal worker.');
  const rest = args.slice(2);
  if (kind === 'extract' ? rest.length !== 1 || !['pdf', 'docx'].includes(rest[0]!) : rest.length !== 0)
    throw new Error('Invalid internal worker arguments.');
  return { kind: kind as WorkspaceWorker, args: rest };
}

/** Both development and packaged paths retain the parent's existing stdin,
 * timeout, cancellation, temporary directory and scrubbed environment. */
export function workspaceWorkerCommand(kind: WorkspaceWorker, args: string[] = [],
  runtime = { executable: process.execPath, packaged: distribution !== null, sourceDirectory: import.meta.dir }): string[] {
  parseWorkerInvocation(['--internal-worker', kind, ...args]);
  return runtime.packaged ? [runtime.executable, '--internal-worker', kind, ...args]
    : [runtime.executable, join(runtime.sourceDirectory, WORKERS[kind]), ...args];
}
