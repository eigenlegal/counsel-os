/**
 * The `webServer` Playwright starts for `bun run e2e`. Run with Bun, never
 * Node — the runtime is Bun-only.
 *
 * It is a wrapper rather than a bare `bun runtime/src/cli.ts serve …` because
 * two things must happen before the flow can run, and Playwright starts
 * `webServer` BEFORE `globalSetup` (the web server is a runner plugin, and
 * plugin setup runs first — see `createGlobalSetupTasks` in the runner). So
 * the seeding belongs to whoever owns the server, which is this file:
 *
 *  1. A throwaway `COUNSEL_OS_HOME` and a throwaway marked vault, so the run
 *     never touches the developer's real `~/.counsel-os` or their practice.
 *  2. A built UI. `serve` serves `runtime/ui/dist`; with no build there is no
 *     page to open, so `bun run e2e` from a clean checkout builds it here
 *     rather than relying on the reader to remember a second command.
 *
 * Then it runs the real CLI, flags and all: the point of the flow is that
 * `serve --fake --fake-script` works, so the test drives the command an
 * operator would type rather than calling `startServer` behind its back.
 */
import { join, resolve } from 'node:path';
import { BASE_URL, HOME_DIR, PORT, ROOT, seedVault, VAULT_DIR } from './paths';

seedVault();

const built = Bun.spawnSync(['bun', 'run', 'ui:build'], { cwd: ROOT, stdout: 'inherit', stderr: 'inherit' });
if (built.exitCode !== 0) {
  console.error(`ui:build failed with exit code ${built.exitCode}`);
  process.exit(1);
}

const child = Bun.spawn(
  [
    'bun',
    join(ROOT, 'runtime', 'src', 'cli.ts'),
    'serve',
    '--port',
    String(PORT),
    '--vault',
    VAULT_DIR,
    '--fake',
    '--fake-script',
    resolve(ROOT, 'e2e', 'fake-script.json'),
  ],
  {
    cwd: ROOT,
    // `COUNSEL_OS_HOME` decides where `runtime.json` lands, and the spec
    // reads the bearer token out of it.
    env: { ...process.env, COUNSEL_OS_HOME: HOME_DIR },
    // Piped, not inherited, so the ONE line `serve` prints — the page URL
    // with the bearer token in its fragment — never reaches the test log.
    // Playwright relays this process's stdout into the runner output, and a
    // token belongs in no log, however short its life.
    stdout: 'pipe',
    stderr: 'inherit',
  },
);

/** Everything the server says, except the line that carries the token. That
 * one becomes an address with no credential in it. */
async function relay(): Promise<void> {
  const decoder = new TextDecoder();
  let rest = '';
  for await (const chunk of child.stdout) {
    const lines = (rest + decoder.decode(chunk as Uint8Array, { stream: true })).split('\n');
    rest = lines.pop() ?? '';
    for (const line of lines) {
      console.log(line.includes('#token=') ? `counsel-os runtime on ${BASE_URL} (token withheld)` : line);
    }
  }
  if (rest !== '') console.log(rest.includes('#token=') ? `counsel-os runtime on ${BASE_URL} (token withheld)` : rest);
}
void relay();

// Playwright kills the whole process group, so this is belt and braces — but
// a wrapper that dies and leaves a listener behind would wedge the NEXT run
// on a port that is already taken, which is a confusing way to fail.
const stop = (): void => {
  child.kill();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
process.on('exit', stop);

process.exit(await child.exited);
