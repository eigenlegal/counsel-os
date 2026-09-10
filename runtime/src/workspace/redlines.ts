import { z } from 'zod';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RedlineResult } from '../docx/redline';
import type { WordExport } from './exports';
import { WorkspaceConflictError } from './types';
import { RevisionAuthor, type PreferenceSnapshot } from './working-preferences';
import { workspaceWorkerCommand } from './distribution';

export const RedlineEdits = z.array(z.object({
    current: z.string().min(1).max(4000),
    proposed: z.string().max(12_000),
    comment: z.string().trim().max(1000).optional(),
  }).strict()).max(40);
export const RedlineInsertions = z.array(z.object({
  anchor: z.string().trim().min(1).max(4000), position: z.enum(['before', 'after']),
  paragraphs: z.array(z.object({ text: z.string().trim().min(1).max(12_000).refine(text => !/[\r\n]/.test(text), 'Use one text value per paragraph.'),
    styleFrom: z.string().trim().min(1).max(4000) }).strict()).min(1).max(20),
  comment: z.string().trim().max(1000).optional(),
}).strict()).max(20);
export const RedlineInput = z.object({ sourceRevisionId: z.string().uuid(),
  edits: RedlineEdits.default([]), insertions: RedlineInsertions.optional(),
}).strict().refine(value => value.edits.length + (value.insertions?.length ?? 0) > 0 && value.edits.length + (value.insertions?.length ?? 0) <= 40,
  'Provide between one and 40 replacements or insertion groups.')
  .refine(value => (value.insertions ?? []).reduce((sum, item) => sum + item.paragraphs.length, 0) <= 60, 'Insert at most 60 paragraphs at a time.');
export type RedlineInput = z.infer<typeof RedlineInput>;
export interface PreparedRedline {
  input: RedlineInput;
  sourceTitle: string;
  sourceVersion: number;
  sourceHash: string;
  name: string;
  bytes: Uint8Array;
  report: RedlineResult;
  wordPreferences?: PreferenceSnapshot['word'];
}
export interface RedlineReceipt {
  sourceRevisionId: string;
  sourceTitle: string;
  sourceVersion: number;
  edits: RedlineInput['edits'];
  insertions?: RedlineInput['insertions'];
  status: 'saved' | 'source-changed';
  file?: WordExport;
}

let running = 0;
/** Isolated, bounded, cancellable original-document processing. No remote resources. */
export async function generateRedline(bytes: Uint8Array, input: RedlineInput, signal: AbortSignal, author = 'Counsel'): Promise<{ bytes: Uint8Array; report: RedlineResult }> {
  RevisionAuthor.parse(author);
  signal.throwIfAborted();
  if (bytes.length > 5_000_000) throw new WorkspaceConflictError('The initial redline editor supports originals up to 5 MB.');
  if (running >= 2) throw new WorkspaceConflictError('Two redlines are being prepared. Try again when one finishes.');
  const directory = mkdtempSync(join(tmpdir(), 'counsel-redline-'));
  running++;
  let child: ReturnType<typeof Bun.spawn> | undefined;
  const stop = () => { if (child?.exitCode === null) child.kill('SIGKILL'); };
  const timer = setTimeout(stop, 20_000);
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    child = Bun.spawn(workspaceWorkerCommand('redline'), {
      cwd: directory, env: { PATH: '/usr/bin:/bin', NODE_ENV: 'production' },
      stdin: new Blob([JSON.stringify({ bytes: Buffer.from(bytes).toString('base64'), input, author })]), stdout: 'pipe', stderr: 'ignore',
    });
    const chunks: Uint8Array[] = []; let size = 0;
    for await (const chunk of child.stdout as ReadableStream<Uint8Array>) {
      size += chunk.length;
      if (size > 8_000_000) { stop(); throw new WorkspaceConflictError('This redline is too large.'); }
      chunks.push(chunk);
    }
    const code = await child.exited;
    signal.throwIfAborted();
    if (code) throw new WorkspaceConflictError('Word editing stopped or timed out. The original is unchanged.');
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (result.error) throw new WorkspaceConflictError(String(result.error).slice(0, 2000));
    const output = Buffer.from(result.bytes, 'base64');
    if (!output.length || output.length > 5_000_000) throw new WorkspaceConflictError('Invalid or oversized redline output.');
    return { bytes: output, report: result.report as RedlineResult };
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', stop); stop();
    if (child) await child.exited;
    rmSync(directory, { recursive: true, force: true }); running--;
  }
}
