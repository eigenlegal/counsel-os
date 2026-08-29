import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider } from '../runtime/src/core/fake-provider';
import { Router } from '../runtime/src/router/router';
import { createApp, type App, type ServerDeps } from '../runtime/src/server/routes';
import { ThreadStore } from '../runtime/src/threads/store';
import { FsVaultStore } from '../runtime/src/vault/fs-store';

const TOKEN = 'test-token-0123456789';
const SCRIPT = join(import.meta.dir, 'runtime_step.sh');

type BunServer = ReturnType<typeof Bun.serve>;

let servers: BunServer[] = [];

afterEach(() => {
  for (const server of servers) server.stop(true);
  servers = [];
});

/** Serves `createApp(...)` on a random loopback port — no `startServer`, so
 * no live provider ever gets a chance to run. */
function serveFake(script: ConstructorParameters<typeof FakeModelProvider>[0]): { url: string; token: string } {
  const vaultRoot = mkdtempSync(join(tmpdir(), 'runtime-step-vault-'));
  const pluginRoot = mkdtempSync(join(tmpdir(), 'runtime-step-plugin-'));
  mkdirSync(join(pluginRoot, 'skills', 'counsel'), { recursive: true });
  writeFileSync(join(pluginRoot, 'skills', 'counsel', 'SKILL.md'), '---\nname: counsel\n---\n\nBODY.\n', 'utf8');
  mkdirSync(join(pluginRoot, 'primitives'), { recursive: true });
  writeFileSync(join(pluginRoot, 'primitives', 'draft.md'), 'DRAFT.\n', 'utf8');

  const provider = new FakeModelProvider(script);
  const deps: ServerDeps = {
    token: TOKEN,
    tenant: 'default',
    vaultRoot,
    pluginRoot,
    vault: new FsVaultStore(vaultRoot),
    store: new ThreadStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'runtime-step-codex-')) }),
    providers: [provider],
    router: new Router({ default: provider.id }, [provider]),
    platform: 'macos',
  };
  const app: App = createApp(deps);
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app });
  servers.push(server);
  return { url: `http://127.0.0.1:${server.port}`, token: TOKEN };
}

/** Writes a fresh `COUNSEL_OS_HOME` with `runtime.json` pointing at `url`
 * (or an arbitrary dead port when `url` is omitted). Returns the dir to use
 * as both `COUNSEL_OS_HOME` and `TMPDIR` for the spawned script, so the
 * thread-id cache file lives inside it too. */
function homeFor(opts: { url?: string; token?: string } = {}): string {
  const home = mkdtempSync(join(tmpdir(), 'runtime-step-home-'));
  const port = opts.url ? Number(new URL(opts.url).port) : 1; // port 1: nothing listens there
  writeFileSync(
    join(home, 'runtime.json'),
    JSON.stringify({ port, token: opts.token ?? TOKEN, vault: home, pid: process.pid, startedAt: new Date().toISOString() }),
    'utf8',
  );
  return home;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function run(env: Record<string, string | undefined>, request = 'what is a force majeure clause?'): Promise<RunResult> {
  const proc = Bun.spawn(['bash', SCRIPT, request], {
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe('runtime_step.sh', () => {
  test('relays the fake provider text to stdout and exits 0', async () => {
    const { url } = serveFake([{ text: 'a force majeure clause excuses non-performance.' }]);
    const home = homeFor({ url });

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.stdout).toContain('a force majeure clause excuses non-performance.');
    expect(result.exitCode).toBe(0);
  });

  test('no runtime.json means exit 3 with empty stdout', async () => {
    const home = mkdtempSync(join(tmpdir(), 'runtime-step-home-'));

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe('');
  });

  test('a runtime.json pointing at a dead port means exit 3', async () => {
    const home = homeFor(); // no server started at all — the port is unreachable

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe('');
  });

  test('a provider error exits 1 and prints a warning to stderr', async () => {
    const { url } = serveFake([{ error: 'model exploded' }]);
    const home = homeFor({ url });

    const result = await run({ COUNSEL_OS_HOME: home, TMPDIR: home });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('⚠');
    expect(result.stderr).toContain('model exploded');
  });

  test('a second run reuses the cached thread', async () => {
    const { url } = serveFake([{ text: 'first answer' }, { text: 'second answer' }]);
    const home = homeFor({ url });

    const first = await run({ COUNSEL_OS_HOME: home, TMPDIR: home }, 'first question');
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toContain('first answer');

    const second = await run({ COUNSEL_OS_HOME: home, TMPDIR: home }, 'second question');
    expect(second.exitCode).toBe(0);
    expect(second.stdout).toContain('second answer');

    const listRes = await fetch(`${url}/threads`, { headers: { authorization: `Bearer ${TOKEN}` } });
    const threads = (await listRes.json()) as Array<{ id: string }>;
    expect(threads.length).toBe(1);

    const oneRes = await fetch(`${url}/threads/${threads[0]!.id}`, { headers: { authorization: `Bearer ${TOKEN}` } });
    const one = (await oneRes.json()) as { events: Array<Record<string, unknown>> };
    const userEvents = one.events.filter(ev => ev['t'] === 'user');
    expect(userEvents.length).toBe(2);
    expect(userEvents.map(ev => ev['content'])).toEqual(['first question', 'second question']);
  });
});
