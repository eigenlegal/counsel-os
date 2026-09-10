import { z } from 'zod';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { RoundsResult } from '../docx/rounds';
import { WorkspaceConflictError } from './types';
import { workspaceWorkerCommand } from './distribution';

export const DocumentRoundInput = z.object({
  sentRevisionId: z.string().uuid().describe('Retained version we sent, including our tracked revisions if available.'),
  returnedRevisionId: z.string().uuid().describe('Retained version returned by the counterparty.'),
  baselineRevisionId: z.string().uuid().optional().describe('Original before our edits. Omit if unavailable; do not invent a baseline.'),
}).strict().refine(input => new Set(Object.values(input)).size === Object.values(input).length, 'Select distinct document versions.');
export type DocumentRoundInput = z.infer<typeof DocumentRoundInput>;
export interface RoundDocument { role: 'sent' | 'returned' | 'baseline'; revisionId: string; title: string; version: number; contentHash: string; }
export interface DocumentRoundReport {
  documents: RoundDocument[];
  summary: RoundsResult['summary']; findings: RoundsResult['findings']; comments: RoundsResult['comments'];
  limited: boolean; warnings: string[];
}
let running = 0;
/** Read-only, isolated comparison; originals are never modified or promoted to Practice. */
export async function compareDocumentRounds(documents: Array<RoundDocument & { bytes: Uint8Array }>, signal: AbortSignal): Promise<DocumentRoundReport> {
  signal.throwIfAborted();
  if (documents.length < 2 || documents.length > 3 || documents.some(doc => doc.bytes.length > 5_000_000))
    throw new WorkspaceConflictError('Compare two or three retained Word files, each up to 5 MB.');
  if (running >= 2) throw new WorkspaceConflictError('Two Word comparisons are running. Try again when one finishes.');
  const directory = mkdtempSync(join(tmpdir(), 'counsel-rounds-'));
  running++;
  let child: ReturnType<typeof Bun.spawn> | undefined;
  const stop = () => { if (child?.exitCode === null) child.kill('SIGKILL'); };
  const timer = setTimeout(stop, 20_000);
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    child = Bun.spawn(workspaceWorkerCommand('rounds'), {
      cwd: directory, env: { PATH: '/usr/bin:/bin', NODE_ENV: 'production' },
      stdin: new Blob([JSON.stringify(documents.map(({ bytes, ...doc }) => ({ ...doc, bytes: Buffer.from(bytes).toString('base64') })))]),
      stdout: 'pipe', stderr: 'ignore',
    });
    const chunks: Uint8Array[] = []; let size = 0;
    for await (const chunk of child.stdout as ReadableStream<Uint8Array>) {
      size += chunk.length;
      if (size > 1_000_000) { stop(); throw new WorkspaceConflictError('The comparison report is too large.'); }
      chunks.push(chunk);
    }
    const code = await child.exited;
    signal.throwIfAborted();
    if (code) throw new WorkspaceConflictError('Word comparison stopped or timed out. The originals are unchanged.');
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (result.error) throw new WorkspaceConflictError(String(result.error).slice(0, 2000));
    return result as DocumentRoundReport;
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', stop); stop();
    if (child) await child.exited;
    rmSync(directory, { recursive: true, force: true }); running--;
  }
}
