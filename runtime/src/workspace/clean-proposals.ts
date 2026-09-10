import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { WorkspaceConflictError } from './types';
import { workspaceWorkerCommand } from './distribution';

export const CleanProposalRequest = z.object({ expectedContentHash: z.string().regex(/^[a-f0-9]{64}$/), confirmProposal: z.literal(true) }).strict();
let running = 0;
export async function generateCleanProposal(original: Uint8Array, redline: Uint8Array, author: string, signal: AbortSignal) {
  signal.throwIfAborted();
  if (original.length > 5_000_000 || redline.length > 5_000_000) throw new WorkspaceConflictError('Clean proposals support Word files up to 5 MB.');
  if (running >= 2) throw new WorkspaceConflictError('Two clean proposals are being prepared. Try again when one finishes.');
  const directory = mkdtempSync(join(tmpdir(), 'counsel-clean-proposal-'));
  running++;
  let child: ReturnType<typeof Bun.spawn> | undefined;
  const stop = () => { if (child?.exitCode === null) child.kill('SIGKILL'); };
  const timer = setTimeout(stop, 20_000);
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    child = Bun.spawn(workspaceWorkerCommand('clean'), {
      cwd: directory, env: { PATH: '/usr/bin:/bin', NODE_ENV: 'production' },
      stdin: new Blob([JSON.stringify({ original: Buffer.from(original).toString('base64'), redline: Buffer.from(redline).toString('base64'), author })]), stdout: 'pipe', stderr: 'ignore',
    });
    const chunks: Uint8Array[] = []; let size = 0;
    for await (const chunk of child.stdout as ReadableStream<Uint8Array>) {
      size += chunk.length;
      if (size > 8_000_000) { stop(); throw new WorkspaceConflictError('This clean proposal is too large.'); }
      chunks.push(chunk);
    }
    const code = await child.exited;
    signal.throwIfAborted();
    if (code) throw new WorkspaceConflictError('Clean proposal preparation stopped or timed out. Saved files are unchanged.');
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (result.error) throw new WorkspaceConflictError(String(result.error).slice(0, 2000));
    const bytes = Buffer.from(result.bytes, 'base64');
    if (!bytes.length || bytes.length > 5_000_000) throw new WorkspaceConflictError('Invalid or oversized clean proposal output.');
    const report = z.object({ revisionsApplied: z.number().int().positive(), commentsRetained: z.boolean() }).strict().parse(result.report);
    return { bytes, report };
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', stop); stop();
    if (child) await child.exited;
    rmSync(directory, { recursive: true, force: true }); running--;
  }
}
