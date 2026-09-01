import { join, resolve } from 'node:path';
import { z } from 'zod';
import type { Tenant, Tool, VaultStore } from '../core/types';
import type { ThreadStore } from '../threads/store';
import { docxTools } from './docx-tools';
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

// `clean_format` still runs on Python (spec §2: a formatting utility, not the
// hero path; it goes with stage 2's second PR or a later decision): all four
// platforms, but it reads/writes local .docx files, which a `hosted`
// deployment may not have direct filesystem access to.
const DOCX_SCRIPT_PLATFORMS = ['macos', 'linux', 'windows', 'hosted'] as const;

export interface BuiltinToolOptions {
  vaultRoot: string;
  repoRoot: string;
  /** The vault store, when the caller has one: `apply_redlines` writes the
   * redlined document through it (history, never-overwrite). Without it the
   * tool writes the file directly under `vaultRoot`. */
  vault?: VaultStore;
  /** The thread a step runs in: `apply_redlines` records its `artifact`
   * event there. Absent outside a thread (the CLI's one-shot run). */
  thread?: { store: ThreadStore; threadId: string; tenant: Tenant };
}

/**
 * Tools shared by every entry point that runs a model against a vault
 * (`cli.ts`'s in-process run, `mcp/stdio.ts`'s server for Codex). Kept in one
 * place so the tool's name/description/schema/args can't drift between them.
 *
 * The Word tools (`docx_read`, `extract_redlines`, `check_document`,
 * `apply_redlines`) run in TypeScript inside the runtime — `docxTools` —
 * with no Python or pandoc.
 */
export function builtinTools(opts: BuiltinToolOptions): Tool[] {
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
    ...docxTools({ vaultRoot: opts.vaultRoot, ...(opts.vault === undefined ? {} : { vault: opts.vault }), ...(opts.thread === undefined ? {} : { thread: opts.thread }) }),
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
