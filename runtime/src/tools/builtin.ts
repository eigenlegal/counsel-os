import { resolve } from 'node:path';
import { z } from 'zod';
import { isCompiled } from '../core/embedded';
import type { Tenant, Tool, VaultStore } from '../core/types';
import type { ThreadStore } from '../threads/store';
import { docketSweepTool } from './docket-tool';
import { docxTools } from './docx-tools';
import { pythonScriptTool } from './subprocess';

// `clean_format` still runs on Python (spec §2: a formatting utility, not the
// hero path; it goes with a later port): all four platforms, but it
// reads/writes local .docx files, which a `hosted` deployment may not have
// direct filesystem access to. The compiled binary does not register it —
// there is no `scripts/` beside a binary and no Python to run it with
// (packaging spec §3.3).
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
  thread?: { store: ThreadStore; threadId: string; tenant: Tenant; outcome?: (line: { kind: 'artifact.produced'; path: string; detail: Record<string, unknown> }) => void };
  /** Tests: pretend to be (or not be) the compiled binary. */
  compiled?: boolean;
}

/**
 * Tools shared by every entry point that runs a model against a vault
 * (`cli.ts`'s in-process run, `mcp/stdio.ts`'s server for Codex). Kept in one
 * place so the tool's name/description/schema/args can't drift between them.
 *
 * The Word tools (`docx_read`, `extract_redlines`, `check_document`,
 * `apply_redlines`, `docx_compare`, `diff_rounds`) run in TypeScript inside
 * the runtime — `docxTools` — with no Python, no pandoc and no Word.
 */
export function builtinTools(opts: BuiltinToolOptions): Tool[] {
  const compiled = opts.compiled ?? isCompiled();
  return [
    docketSweepTool({ vaultRoot: opts.vaultRoot, ...(opts.vault === undefined ? {} : { vault: opts.vault }) }) as Tool,
    ...docxTools({ vaultRoot: opts.vaultRoot, ...(opts.vault === undefined ? {} : { vault: opts.vault }), ...(opts.thread === undefined ? {} : { thread: opts.thread }) }),
    ...(compiled ? [] : [cleanFormatTool(opts.repoRoot)]),
  ];
}

function cleanFormatTool(repoRoot: string): Tool {
  return pythonScriptTool({
      name: 'clean_format',
      description: 'Clean up a drafted .docx file’s formatting against the house style template. Reads and writes local file paths.',
      script: resolve(repoRoot, 'scripts/clean_format.py'),
      platforms: [...DOCX_SCRIPT_PLATFORMS],
      inputSchema: z.object({
        input: z.string().describe('Path to the .docx file to clean up.'),
        output: z.string().describe('Path to write the cleaned .docx file to.'),
      }),
      args: ({ input, output }) => [input, output],
      cwd: repoRoot,
    }) as Tool;
}
