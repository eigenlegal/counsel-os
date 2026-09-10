import { z } from 'zod';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceConflictError } from './types';
import { workspaceWorkerCommand } from './distribution';

export const FILE_MAX_BYTES = 25_000_000;
// Base64 transport plus bounded JSON metadata. Other routes keep a smaller limit.
export const FILE_MAX_REQUEST_BYTES = Math.ceil(FILE_MAX_BYTES / 3) * 4 + 2000;
export const FileInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(
        /^[^/\\\x00-\x1f\x7f]+\.(txt|md|docx|pdf)$/i,
        'Choose a .docx, .pdf, .txt or .md file. Convert legacy .doc files to .docx first.',
      ),
    base64: z.string().max(Math.ceil(FILE_MAX_BYTES / 3) * 4),
    matterId: z.string().uuid().nullable().optional(),
  })
  .strict();
export const Extraction = z
  .object({
    parser: z.string().max(100),
    notes: z.array(z.string().max(1000)).max(100),
    pages: z.number().int().positive().optional(),
    sections: z
      .array(
        z
          .object({
            label: z.string().max(100),
            start: z.number().int().nonnegative(),
            end: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(500),
  })
  .strict();
export type Extraction = z.infer<typeof Extraction>;
export const ExtractedFile = z
  .object({
    body: z.string().max(1_000_000).nullable(),
    textStatus: z.enum(['ready', 'partial', 'unavailable']),
    mediaType: z.enum([
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),
    extraction: Extraction,
  })
  .strict();
export type ExtractedFile = z.infer<typeof ExtractedFile>;
export function fileBytes(raw: z.input<typeof FileInput>): {
  input: z.infer<typeof FileInput>;
  bytes: Buffer;
} {
  const input = FileInput.parse(raw);
  const bytes = Buffer.from(input.base64, 'base64');
  const limit = /\.(txt|md)$/i.test(input.name) ? 500_000 : FILE_MAX_BYTES;
  if (!bytes.length || bytes.toString('base64') !== input.base64 || bytes.length > limit)
    throw new WorkspaceConflictError(
      `Choose a nonempty file of ${limit === 500_000 ? '500 KB' : '25 MB'} or less.`,
    );
  return { input, bytes };
}
export function extractText(bytes: Uint8Array, name: string): ExtractedFile {
  let body: string;
  try {
    body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new WorkspaceConflictError('This file is not valid UTF-8 text.');
  }
  if (body.includes('\0'))
    throw new WorkspaceConflictError('Binary files are not supported by this text importer.');
  return {
    body: body.trim() ? body : null,
    textStatus: body.trim() ? 'ready' : 'unavailable',
    mediaType: name.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain',
    extraction: {
      parser: 'utf8-v1',
      notes: body.trim() ? [] : ['This file contains no readable text.'],
      sections: [],
    },
  };
}

let extracting = 0;
export class DocumentParserBusyError extends WorkspaceConflictError {}
/** Separate killable parser process. No model calls, external URLs or user CLI configuration. */
export async function extractDocument(
  bytes: Uint8Array,
  extension: 'pdf' | 'docx',
  signal?: AbortSignal,
): Promise<ExtractedFile> {
  signal?.throwIfAborted();
  if (extracting >= 2)
    throw new DocumentParserBusyError(
      'Two documents are being imported. Wait for one to finish and try again.',
    );
  extracting++;
  let directory: string | undefined;
  let child: ReturnType<typeof Bun.spawn> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const abort = () => { if (child?.exitCode === null) child.kill('SIGKILL'); };
  try {
    directory = mkdtempSync(join(tmpdir(), 'counsel-document-parser-'));
    child = Bun.spawn(workspaceWorkerCommand('extract', [extension]), {
      cwd: directory,
      env: { PATH: '/usr/bin:/bin', NODE_ENV: 'production' },
      stdin: new Blob([new Uint8Array(bytes)]),
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const proc = child;
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, 20_000);
    const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 8_000_000) {
        proc.kill('SIGKILL');
        throw new WorkspaceConflictError(
          'The extracted document is too large. Import a smaller document.',
        );
      }
      chunks.push(next.value);
    }
    const code = await proc.exited;
    signal?.throwIfAborted();
    if (timedOut)
      throw new WorkspaceConflictError(
        'Document extraction timed out. Try a smaller or simplified copy.',
      );
    if (code !== 0)
      throw new WorkspaceConflictError(
        'The document parser stopped. Try a smaller or simplified copy.',
      );
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (result.error) throw new WorkspaceConflictError(String(result.error).slice(0, 1000));
    return ExtractedFile.parse(result);
  } finally {
    signal?.removeEventListener('abort', abort);
    if (timeout) clearTimeout(timeout);
    try {
      if (child) {
        if (child.exitCode === null) child.kill('SIGKILL');
        await child.exited;
      }
    } finally {
      extracting--;
      if (directory) rmSync(directory, { recursive: true, force: true });
    }
  }
}
