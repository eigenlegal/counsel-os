import { z } from 'zod';
import { buildBackup, readBackup, restoreBackup } from './backup-core';

// Local parsing/IO only, with a scrubbed environment. Parent owns the timeout,
// concurrency limit and the temporary directory. No provider or model imports.
export async function runBackupWorker(): Promise<void> {
try {
  const input = z
    .object({
      action: z.enum(['create', 'inspect', 'restore']),
      path: z.string().min(1),
      staging: z.string().min(1),
      parent: z.string().optional(),
    })
    .strict()
    .parse(JSON.parse(await Bun.stdin.text()));
  const result =
    input.action === 'create'
      ? buildBackup(input.path, input.staging)
      : input.action === 'restore'
        ? restoreBackup(input.path, input.staging, z.string().min(1).parse(input.parent))
        : { manifest: readBackup(input.path, input.staging).manifest };
  console.log(JSON.stringify(result));
} catch (error) {
  // Filesystem exceptions can contain private paths. Return actionable categories.
  const code = (error as NodeJS.ErrnoException).code;
  const message =
    code === 'ENOSPC'
      ? 'There is not enough disk space. Free some space and try again.'
      : code === 'ENOENT'
        ? 'A required file is missing. Check the backup and original documents.'
        : code === 'EACCES' || code === 'EPERM'
          ? 'Counsel OS cannot access that file or folder. Choose an accessible location.'
          : error instanceof Error && !(error instanceof z.ZodError)
            ? error.message.slice(0, 500)
            : 'The backup contains invalid workspace records.';
  console.log(JSON.stringify({ error: message }));
  process.exitCode = 1;
}
}
if (import.meta.main) await runBackupWorker();
