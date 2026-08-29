import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * The runtime's own state directory: `~/.counsel-os`, or `COUNSEL_OS_HOME`
 * when the operator points somewhere else (what the tests use so they never
 * touch the developer's real home).
 *
 * It lives in `core/` rather than in `server/serve.ts`, where it started,
 * because everything that writes under this directory has to agree on it —
 * `runtime.json`, the per-thread Codex homes (which hold a copy of
 * `auth.json`), and `providers.yaml`. The provider registry cannot import it
 * from the server without dragging the whole HTTP layer in, and a second
 * `join(homedir(), '.counsel-os')` spelled out somewhere else is exactly how
 * the override came to be honored in one place and ignored in two.
 */
export function counselHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.COUNSEL_OS_HOME ?? join(homedir(), '.counsel-os');
}
