/**
 * The Word-document tools the model calls: `docx_read` (a `.docx` as
 * markdown), `extract_redlines`, `check_document`. All three run inside the
 * runtime — no Python, no pandoc — and read only files inside the vault.
 *
 * Paths: vault-relative is the contract (`matters/acme/nda.docx`). An
 * absolute path is accepted only when it resolves INSIDE the vault root, so
 * a methodology step that still hands over an absolute path keeps working
 * without opening the rest of the disk to the model.
 */
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import type { Tool } from '../core/types';
import { checkDocx, checkText, detectFormat, docxToMarkdown, extractRedlines, isDocxPath, openDocx } from '../docx';
import { RESERVED_DIR } from '../vault/fs-store';

const ALL_PLATFORMS = ['macos', 'linux', 'windows', 'hosted'] as const;

export class VaultPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultPathError';
  }
}

/**
 * The absolute file the model may read, or a `VaultPathError`. Same rules
 * as `FsVaultStore.abs`: no backslashes, nothing above the root, never the
 * runtime's own `.counsel/` (case-insensitively — APFS and NTFS fold case).
 */
export function resolveVaultFile(vaultRoot: string, given: string): { abs: string; rel: string } {
  if (given.trim() === '') throw new VaultPathError('a file path is required');
  if (given.includes('\\')) throw new VaultPathError(`backslashes are not allowed in a vault path: ${given}`);
  const root = resolve(vaultRoot);
  const abs = isAbsolute(given) ? resolve(given) : resolve(root, given);
  const rel = relative(root, abs);
  const head = rel.split(sep)[0];
  if (rel === '' || head === '..' || isAbsolute(rel)) throw new VaultPathError(`path outside vault: ${given}`);
  if (head?.toLowerCase() === RESERVED_DIR) throw new VaultPathError(`reserved path: ${given}`);
  return { abs, rel: rel.split(sep).join('/') };
}

async function readBytes(abs: string, given: string): Promise<Uint8Array> {
  const file = Bun.file(abs);
  if (!(await file.exists())) throw new VaultPathError(`no such file in the vault: ${given}`);
  return new Uint8Array(await file.arrayBuffer());
}

export interface DocxReadResult {
  path: string;
  markdown: string;
  warnings: string[];
}

export function docxTools(opts: { vaultRoot: string }): Tool[] {
  const read = async (given: string): Promise<{ rel: string; bytes: Uint8Array }> => {
    const { abs, rel } = resolveVaultFile(opts.vaultRoot, given);
    return { rel, bytes: await readBytes(abs, given) };
  };

  const docxRead: Tool<{ path: string; changes: 'all' | 'accept' | 'reject' }, DocxReadResult> = {
    name: 'docx_read',
    description:
      'Read a Word (.docx) document from the vault as markdown. Tracked changes appear inline as {++inserted++} and {--deleted--}, comments as {>>comment (author, date)<<}; Word numbering is rendered as text. Pass `changes: "accept"` for the clean accepted view. Path is vault-relative.',
    platforms: new Set(ALL_PLATFORMS),
    inputSchema: z.object({
      path: z.string().describe('Vault-relative path to the .docx file, e.g. matters/acme/nda.docx.'),
      changes: z.enum(['all', 'accept', 'reject']).default('all').describe('Which view: all (marked inline), accept, or reject.'),
    }),
    async execute({ path, changes }) {
      if (!isDocxPath(path)) throw new VaultPathError(`docx_read reads .docx files only; use vault_read for ${path}`);
      const { rel, bytes } = await read(path);
      const { markdown, warnings } = docxToMarkdown(openDocx(bytes), { changes });
      return { path: rel, markdown, warnings };
    },
  };

  const extract: Tool<{ docx: string }, unknown> = {
    name: 'extract_redlines',
    description: 'Extract tracked changes and comments from a .docx file in the vault, as JSON: per-paragraph original vs revised text, inserted/deleted fragments, authors, dates, section context, anchored comment ids, and the comments themselves. Path is vault-relative.',
    platforms: new Set(ALL_PLATFORMS),
    inputSchema: z.object({ docx: z.string().describe('Vault-relative path to the .docx file to read tracked changes and comments from.') }),
    async execute({ docx }) {
      if (!isDocxPath(docx)) throw new VaultPathError(`extract_redlines reads .docx files only: ${docx}`);
      const { rel, bytes } = await read(docx);
      return extractRedlines(openDocx(bytes), rel);
    },
  };

  const check: Tool<{ file: string }, unknown> = {
    name: 'check_document',
    description:
      'Deterministic mechanical QA for a contract draft: cross-references, defined terms, exhibits, party-name drift. Accepts a .docx (checked on its accept-all view), .md, or .txt file in the vault. Returns {file, format, summary, notes, findings}. Path is vault-relative.',
    platforms: new Set(ALL_PLATFORMS),
    inputSchema: z.object({ file: z.string().describe('Vault-relative path to the .docx, .md, or .txt document to check.') }),
    async execute({ file }) {
      const { rel, bytes } = await read(file);
      const fmt = detectFormat(file);
      if (fmt === 'docx') return checkDocx(openDocx(bytes), rel);
      return checkText(new TextDecoder('utf-8').decode(bytes), fmt, rel);
    },
  };

  return [docxRead as Tool, extract as Tool, check as Tool];
}
