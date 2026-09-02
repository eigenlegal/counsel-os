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
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import type { ArtifactSummary, Tenant, Tool, VaultStore } from '../core/types';
import { applyRedlines, checkDocx, checkText, compareDocuments, compareOutputName, detectFormat, diffRounds, docxToMarkdown, extractRedlines, isDocxPath, openDocx, redlineOutputName, roundsToMarkdown, type CompareResult, type RedlineItem, type RedlineResult, type RoundsResult } from '../docx';
import type { ThreadStore } from '../threads/store';
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

export interface DocxToolOptions {
  vaultRoot: string;
  /** Writes the redlined document through the store when given (history,
   * `wx` — never overwrites); otherwise straight onto the filesystem under
   * `vaultRoot` with the same never-overwrite flag. */
  vault?: VaultStore;
  /** The thread the step runs in: the `artifact` event is recorded there. */
  thread?: { store: ThreadStore; threadId: string; tenant: Tenant };
}

/** The redline JSON item, as the primitives specify it. `match` is kept
 * loose on purpose: the selectors are validated by `selectMatch`, whose
 * refusal strings the methodology quotes back to the model. */
const redlineItemSchema = z.object({
  current: z.string().describe('Exact text to find (from the accept-all view of the document).'),
  proposed: z.string().describe('Replacement text; empty to delete.'),
  comment: z.string().nullable().optional().describe('Rationale, written as a Word comment on the paragraph; null for none.'),
  author: z.string().optional().describe('Who the revision is attributed to; defaults to `author` on the call, else "Counsel OS".'),
  match: z.record(z.string(), z.unknown()).nullable().optional().describe('Disambiguator when `current` appears more than once: location, occurrence, paragraph_index, before, after, context.'),
});

export interface ApplyRedlinesInput {
  original: string;
  items?: RedlineItem[];
  edits?: string;
  output?: string;
  track?: boolean;
  author?: string;
}

export interface CompareOutput extends Omit<CompareResult, 'stats'> {
  kind: 'docx-compare';
  output: string;
  summary: ArtifactSummary;
  artifactId?: string;
}

export interface ApplyRedlinesOutput extends Omit<RedlineResult, 'stats'> {
  /** Vault-relative path of the document written. */
  output: string;
  summary: ArtifactSummary;
  /** Set when the call ran inside a thread and the artifact was recorded. */
  artifactId?: string;
}

/** The default name beside the source, or the caller's `output` — the first
 * name not yet taken (`-2`, `-3`, …). */
async function freeOutputPath(
  vaultRoot: string,
  original: string,
  wanted: string | undefined,
  now: Date,
  nameFor: (original: string, now: Date, n: number) => string = redlineOutputName,
): Promise<{ abs: string; rel: string }> {
  for (let n = 1; n < 1000; n += 1) {
    const candidate = wanted === undefined ? nameFor(original, now, n) : n === 1 ? wanted : wanted.replace(/(\.docx)?$/i, `-${n}$1`);
    const resolved = resolveVaultFile(vaultRoot, candidate);
    if (!(await Bun.file(resolved.abs).exists())) return resolved;
  }
  throw new VaultPathError(`no free output name beside ${original}`);
}

export function docxTools(opts: DocxToolOptions): Tool[] {
  const read = async (given: string): Promise<{ rel: string; bytes: Uint8Array }> => {
    const { abs, rel } = resolveVaultFile(opts.vaultRoot, given);
    return { rel, bytes: await readBytes(abs, given) };
  };

  const apply: Tool<ApplyRedlinesInput, ApplyRedlinesOutput> = {
    name: 'apply_redlines',
    description:
      'Apply a list of edits to a Word (.docx) document in the vault and write the result as a NEW file beside it (never overwriting): `<original>-redline-<date>.docx`. With `track: true` the edits are native Word tracked changes with the author and date on every revision, and each `comment` becomes a Word comment on its paragraph — the output IS the redline. Give the edits inline as `items` (the redline JSON array: current, proposed, comment, author, match) or as `edits`, the vault path of a JSON file. Returns the applied/skipped/warnings report and the output path.',
    platforms: new Set(ALL_PLATFORMS),
    inputSchema: z.object({
      original: z.string().describe('Vault-relative path to the source .docx.'),
      items: z.array(redlineItemSchema).optional().describe('The redline items, inline.'),
      edits: z.string().optional().describe('Vault-relative path of a JSON file holding the redline items (alternative to `items`).'),
      output: z.string().optional().describe('Vault-relative path to write; default `<original>-redline-<date>.docx` beside the source. Never overwrites.'),
      track: z.boolean().optional().describe('true = native tracked changes (a redline); false/omitted = silent replacement (an edited copy).'),
      author: z.string().optional().describe('Default author for items that name none.'),
    }) as unknown as z.ZodType<ApplyRedlinesInput>,
    async execute({ original, items, edits, output, track, author }, ctx) {
      if (!isDocxPath(original)) throw new VaultPathError(`apply_redlines edits .docx files only: ${original}`);
      const src = await read(original);
      let list: RedlineItem[];
      if (items !== undefined) {
        list = items;
      } else if (edits !== undefined) {
        const file = await read(edits);
        const parsed: unknown = JSON.parse(new TextDecoder('utf-8').decode(file.bytes));
        if (!Array.isArray(parsed)) throw new VaultPathError(`${edits}: expected a JSON array of redline items`);
        list = z.array(redlineItemSchema).parse(parsed) as RedlineItem[];
      } else {
        throw new VaultPathError('apply_redlines needs `items` (inline) or `edits` (a vault path to a JSON file)');
      }

      const now = new Date();
      const pkg = openDocx(src.bytes);
      const result = applyRedlines(pkg, list, { track: track === true, now, defaultAuthor: author ?? 'Counsel OS' });
      const bytes = pkg.save();
      const { abs, rel } = await freeOutputPath(opts.vaultRoot, src.rel, output, now);
      if (opts.vault?.writeBytes !== undefined) {
        await opts.vault.writeBytes(ctx.tenant, rel, bytes);
      } else {
        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, bytes, { flag: 'wx' });
      }

      const { stats, ...report } = result;
      const summary: ArtifactSummary = {
        changes: stats.regions,
        comments: stats.comments,
        applied: result.applied.length,
        skipped: result.skipped.length,
        clauses: stats.paragraphs,
        bytes: bytes.byteLength,
      };
      const out: ApplyRedlinesOutput = { ...report, output: rel, summary };
      if (opts.thread !== undefined) {
        const artifactId = randomUUID();
        await opts.thread.store.append(opts.thread.tenant, opts.thread.threadId, {
          t: 'artifact',
          at: now.toISOString(),
          id: artifactId,
          kind: 'docx-redline',
          path: rel,
          source: src.rel,
          author: author ?? list.find(i => i.author !== undefined)?.author ?? 'Counsel OS',
          tracked: track === true,
          summary,
        });
        out.artifactId = artifactId;
      }
      return out;
    },
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

  const writeOut = async (rel: string, abs: string, bytes: Uint8Array, tenant: Tenant): Promise<void> => {
    if (opts.vault?.writeBytes !== undefined) await opts.vault.writeBytes(tenant, rel, bytes);
    else {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, bytes, { flag: 'wx' });
    }
  };

  const compare: Tool<{ original: string; revised: string; output?: string; author?: string }, CompareOutput> = {
    name: 'docx_compare',
    description:
      'Compare two Word (.docx) documents that exist independently — the original and a revised draft with no edit list — and write a NEW document beside the original with the differences as native Word tracked changes attributed to `author`: `<original>-compare-<date>.docx`, never overwriting. Accepting all changes yields the revised text; rejecting them yields the original. Paragraphs are aligned by similarity; table cells compare in place but rows are never inserted or deleted (reported as skipped). Replaces Word Compare. Paths are vault-relative.',
    platforms: new Set(ALL_PLATFORMS),
    inputSchema: z.object({
      original: z.string().describe('Vault-relative path to the original .docx.'),
      revised: z.string().describe('Vault-relative path to the revised .docx to compare against it.'),
      output: z.string().optional().describe('Vault-relative path to write; default `<original>-compare-<date>.docx` beside the original. Never overwrites.'),
      author: z.string().optional().describe('Who the revision marks are attributed to; default "Counsel OS".'),
    }),
    async execute({ original, revised, output, author }, ctx) {
      if (!isDocxPath(original) || !isDocxPath(revised)) throw new VaultPathError('docx_compare compares .docx files only');
      const src = await read(original);
      const rev = await read(revised);
      const now = new Date();
      const pkg = openDocx(src.bytes);
      const result = compareDocuments(pkg, openDocx(rev.bytes), { author: author ?? 'Counsel OS', now });
      const bytes = pkg.save();
      const { abs, rel } = await freeOutputPath(opts.vaultRoot, src.rel, output, now, compareOutputName);
      await writeOut(rel, abs, bytes, ctx.tenant);
      const { stats, ...report } = result;
      const summary: ArtifactSummary = { changes: stats.regions, comments: 0, applied: result.applied.length, skipped: result.skipped.length, clauses: stats.paragraphs, bytes: bytes.byteLength };
      const out: CompareOutput = { ...report, kind: 'docx-compare', output: rel, summary };
      if (opts.thread !== undefined) {
        const artifactId = randomUUID();
        await opts.thread.store.append(opts.thread.tenant, opts.thread.threadId, {
          t: 'artifact',
          at: now.toISOString(),
          id: artifactId,
          kind: 'docx-compare',
          path: rel,
          source: src.rel,
          compared: rev.rel,
          author: author ?? 'Counsel OS',
          tracked: true,
          summary,
        });
        out.artifactId = artifactId;
      }
      return out;
    },
  };

  const rounds: Tool<{ ours: string; theirs: string; base?: string; format?: 'json' | 'markdown'; full_text?: boolean }, RoundsResult | { markdown: string }> = {
    name: 'diff_rounds',
    description:
      'Round-over-round negotiation comparison: `ours` is the version we sent (its accept-all text is our proposal), `theirs` the markup the counterparty returned. Classifies each of our counters ACCEPTED / REVERTED / MODIFIED / NEW / UNMATCHED_CHANGE. Pass `base` (the round N-1 document before our edits) whenever it exists — without it silent acceptances are invisible and unattributable edits are UNMATCHED_CHANGE. Returns the JSON report, or `{markdown}` with format "markdown". Paths are vault-relative.',
    platforms: new Set(ALL_PLATFORMS),
    inputSchema: z.object({
      ours: z.string().describe('Vault-relative path to the version we sent.'),
      theirs: z.string().describe('Vault-relative path to the markup they returned.'),
      base: z.string().optional().describe('Vault-relative path to the round N-1 baseline before our edits.'),
      format: z.enum(['json', 'markdown']).optional().describe('json (default) or markdown.'),
      full_text: z.boolean().optional().describe('markdown only: do not truncate excerpts.'),
    }),
    async execute({ ours, theirs, base, format, full_text }) {
      for (const p of [ours, theirs, ...(base === undefined ? [] : [base])]) if (!isDocxPath(p)) throw new VaultPathError(`diff_rounds compares .docx files only: ${p}`);
      const o = await read(ours);
      const t = await read(theirs);
      const b = base === undefined ? null : await read(base);
      const data = diffRounds({ ours: openDocx(o.bytes), theirs: openDocx(t.bytes), base: b === null ? null : openDocx(b.bytes), names: { ours: o.rel, theirs: t.rel, base: b === null ? null : b.rel } });
      return format === 'markdown' ? { markdown: roundsToMarkdown(data, full_text === true) } : data;
    },
  };

  return [docxRead as Tool, extract as Tool, check as Tool, apply as Tool, compare as Tool, rounds as Tool];
}
