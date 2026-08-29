import type { ZodType } from 'zod';
import type { Platform, Tool } from '../core/types';

export interface SubprocessResult { stdout: string; stderr: string; exitCode: number }

export function pythonScriptTool<I>(opts: {
  name: string;
  description: string;
  /** Absolute path to the .py file. Optional only when `command` supplies the
   * whole argv itself — otherwise there is nothing for `python3` to run. */
  script?: string;
  platforms: Platform[];
  inputSchema: ZodType<I>;
  args: (input: I) => string[];
  cwd?: string;
  timeoutMs?: number;
  /** Overrides the spawned command; defaults to `['python3', script]`. Used
   * for non-Python scripts, e.g. `['bash', script]` for a `.sh` file. When
   * this is given, `script` is not consulted at all — passing both invited a
   * caller to keep two paths in sync while only one of them ran. */
  command?: string[];
}): Tool<I, SubprocessResult> {
  // One of the two has to name something to execute. Checked at construction
  // (`builtinTools()` runs on every step) rather than at spawn time, so a
  // miswired tool fails where it is defined, not mid-model-turn.
  const command = opts.command ?? (opts.script === undefined ? undefined : ['python3', opts.script]);
  if (command === undefined || command.length === 0) {
    throw new Error(`${opts.name}: pythonScriptTool needs a script or a command`);
  }
  return {
    name: opts.name,
    description: opts.description,
    inputSchema: opts.inputSchema,
    platforms: new Set(opts.platforms),
    async execute(input) {
      const proc = Bun.spawn([...command, ...opts.args(input)], {
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
