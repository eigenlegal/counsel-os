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
  ];
}
