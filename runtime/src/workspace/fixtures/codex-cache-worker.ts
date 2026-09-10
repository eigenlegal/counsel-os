/** Synthetic-only process-boundary lock probe. */
import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { acquireCodexCredentials } from '../codex-auth-cache';
const root = process.env.HOME!;
if (!basename(root).startsWith('counsel-cache-test-') || !existsSync(join(root, 'source', 'auth.json'))) throw new Error('Synthetic cache fixture required.');
const signal = process.argv.includes('--cancel') ? AbortSignal.timeout(100) : AbortSignal.timeout(3_000);
try {
  const lease = await acquireCodexCredentials(join(root, 'source'), signal);
  console.log('acquired');
  if (process.argv.includes('--hold')) await new Promise(() => {});
  lease.release();
} catch (error) {
  if (signal.aborted) console.log('cancelled'); else throw error;
}
