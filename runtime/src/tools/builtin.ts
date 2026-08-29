import { join, resolve } from 'node:path';
import { z } from 'zod';
import type { Tool } from '../core/types';
import { pythonScriptTool } from './subprocess';

/**
 * Builds the docket_sweep subprocess args. Extracted as a standalone function
 * (rather than left inline as `pythonScriptTool`'s `args` callback) so it has
 * direct unit coverage — `pythonScriptTool` does not expose the `args`
 * callback on the `Tool` it returns.
 */
export function docketSweepArgs(vaultRoot: string, days: number): string[] {
  return [join(vaultRoot, 'matters'), '--window', String(days), '--format', 'json'];
}

/** `check_document` always runs `--json` — the `read` primitive's `--qa` mode
 * consumes the machine-readable report, not the human-readable one. */
export function checkDocumentArgs(file: string): string[] {
  return [file, '--json'];
}

// Runs on all four platforms, same as docket_sweep — but reads/writes local
// .docx files, which a `hosted` deployment may not have direct filesystem
// access to. Recorded in each tool's description (below) rather than the
// platform set, since the constraint is about file transport, not the
// script itself.
const DOCX_SCRIPT_PLATFORMS = ['macos', 'linux', 'windows', 'hosted'] as const;

/**
 * Tools shared by every entry point that runs a model against a vault
 * (`cli.ts`'s in-process run, `mcp/stdio.ts`'s server for Codex). Kept in one
 * place so the tool's name/description/schema/args can't drift between them.
 */
export function builtinTools(opts: { vaultRoot: string; repoRoot: string }): Tool[] {
  return [
    pythonScriptTool({
      name: 'docket_sweep',
      description: 'Sweep the vault for upcoming deadlines (read-only). Reads matter markdown files under <vault>/matters.',
      script: resolve(opts.repoRoot, 'scripts/docket_sweep.py'),
      platforms: ['macos', 'linux', 'windows', 'hosted'],
      inputSchema: z.object({ days: z.number().int().positive().default(60) }),
      args: ({ days }) => docketSweepArgs(opts.vaultRoot, days),
      cwd: opts.repoRoot,
    }),
    pythonScriptTool({
      name: 'extract_redlines',
      description: 'Extract tracked changes and comments from a .docx file, as JSON. Reads a local file path — the docx must already be on disk.',
      script: resolve(opts.repoRoot, 'scripts/extract_redlines.py'),
      platforms: [...DOCX_SCRIPT_PLATFORMS],
      inputSchema: z.object({ docx: z.string().describe('Path to the .docx file to read tracked changes and comments from.') }),
      args: ({ docx }) => [docx],
      cwd: opts.repoRoot,
    }),
    pythonScriptTool({
      name: 'check_document',
      description: 'Deterministic mechanical QA for a contract draft: cross-references, defined terms, exhibits. Accepts .docx, .md, or .txt. Always run with --json. Reads a local file path — the document must already be on disk.',
      script: resolve(opts.repoRoot, 'scripts/check_document.py'),
      platforms: [...DOCX_SCRIPT_PLATFORMS],
      inputSchema: z.object({ file: z.string().describe('Path to the .docx, .md, or .txt document to check.') }),
      args: ({ file }) => checkDocumentArgs(file),
      cwd: opts.repoRoot,
    }),
    pythonScriptTool({
      name: 'clean_format',
      description: 'Clean up a drafted .docx file’s formatting against the house style template. Reads and writes local file paths.',
      script: resolve(opts.repoRoot, 'scripts/clean_format.py'),
      platforms: [...DOCX_SCRIPT_PLATFORMS],
      inputSchema: z.object({
        input: z.string().describe('Path to the .docx file to clean up.'),
        output: z.string().describe('Path to write the cleaned .docx file to.'),
      }),
      args: ({ input, output }) => [input, output],
      cwd: opts.repoRoot,
    }),
    pythonScriptTool({
      name: 'apply_redlines',
      description: 'Apply a list of edits (as JSON) to a .docx file, optionally as tracked changes. Reads and writes local file paths.',
      script: resolve(opts.repoRoot, 'scripts/apply_redlines.py'),
      platforms: [...DOCX_SCRIPT_PLATFORMS],
      inputSchema: z.object({
        original: z.string().describe('Path to the original .docx file.'),
        edits: z.string().describe('Path to the edits JSON file.'),
        output: z.string().describe('Path to write the resulting .docx file to.'),
        track: z.boolean().optional().describe('Apply the edits as tracked changes instead of direct replacements.'),
      }),
      args: ({ original, edits, output, track }) => (track ? ['--track', original, edits, output] : [original, edits, output]),
      cwd: opts.repoRoot,
    }),
    pythonScriptTool({
      name: 'word_compare',
      description: 'Use Microsoft Word to compare two .docx files and produce a tracked-changes document, revisions attributed to the given author. macOS only — requires Microsoft Word for Mac.',
      // `command` only: this is a shell script, so there is no `python3
      // <script>` default to fall back to and no second path to drift.
      command: ['bash', resolve(opts.repoRoot, 'scripts/word_compare.sh')],
      platforms: ['macos'],
      inputSchema: z.object({
        original: z.string().describe('Path to the original .docx file.'),
        modified: z.string().describe('Path to the modified .docx file.'),
        author: z.string().describe('Author name to attribute the tracked changes to.'),
        output: z.string().describe('Path to write the resulting tracked-changes .docx file to.'),
      }),
      args: ({ original, modified, author, output }) => [original, modified, author, output],
      cwd: opts.repoRoot,
    }),
  ];
}
