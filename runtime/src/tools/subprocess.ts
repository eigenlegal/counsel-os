import type { ZodType } from 'zod';
import type { Platform, Tool } from '../core/types';

export interface SubprocessResult { stdout: string; stderr: string; exitCode: number }

export function pythonScriptTool<I>(opts: {
  name: string;
  description: string;
  script: string;                 // absolute path to the .py file
  platforms: Platform[];
  inputSchema: ZodType<I>;
  args: (input: I) => string[];
  cwd?: string;
  timeoutMs?: number;
  /** Overrides the spawned command; defaults to `['python3', script]`. Used
   * for non-Python scripts, e.g. `['bash', script]` for a `.sh` file. */
  command?: string[];
}): Tool<I, SubprocessResult> {
  return {
    name: opts.name,
    description: opts.description,
    inputSchema: opts.inputSchema,
    platforms: new Set(opts.platforms),
    async execute(input) {
      const proc = Bun.spawn([...(opts.command ?? ['python3', opts.script]), ...opts.args(input)], {
        cwd: opts.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const timer = setTimeout(() => proc.kill(), opts.timeoutMs ?? 120_000);
      try {
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
          proc.exited,
        ]);
        return { stdout, stderr, exitCode };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
