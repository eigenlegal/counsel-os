import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_STEP_TIMEOUT_MS } from '../loop/counsel-loop';
import {
  browserCommand,
  counselHome,
  openUrl,
  runtimeFilePath,
  startServer,
  type RunningServer,
  type RuntimeFile,
} from './serve';

let running: RunningServer | undefined;

afterEach(async () => {
  await running?.stop();
  running = undefined;
});

function fixture(): { vault: string; pluginRoot: string; env: NodeJS.ProcessEnv } {
  const vault = mkdtempSync(join(tmpdir(), 'serve-vault-'));
  const pluginRoot = mkdtempSync(join(tmpdir(), 'serve-plugin-'));
  mkdirSync(join(pluginRoot, 'skills', 'counsel'), { recursive: true });
  writeFileSync(join(pluginRoot, 'skills', 'counsel', 'SKILL.md'), '---\nname: counsel\n---\n\nBODY.\n', 'utf8');
  const home = mkdtempSync(join(tmpdir(), 'serve-home-'));
  return { vault, pluginRoot, env: { ...process.env, COUNSEL_OS_HOME: home } };
}

describe('startServer', () => {
  test('binds loopback, publishes runtime.json 0600, and cleans it up on stop', async () => {
    const { vault, pluginRoot, env } = fixture();
    running = await startServer({
      vault,
      pluginRoot,
      port: 0,
      env,
      registryFile: join(vault, 'no-such-providers.yaml'),
    });

    const file = runtimeFilePath(env);
    expect(counselHome(env)).toBe(env.COUNSEL_OS_HOME!);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).mode & 0o777).toBe(0o600);

    const contents = JSON.parse(readFileSync(file, 'utf8')) as RuntimeFile;
    expect(contents.port).toBe(running.port);
    expect(contents.token).toBe(running.token);
    expect(contents.vault).toBe(vault);
    expect(contents.pid).toBe(process.pid);
    expect(Number.isNaN(Date.parse(contents.startedAt))).toBe(false);

    // The published token is the one the server actually accepts, and it is
    // required.
    const health = await fetch(`${running.url}/health`, {
      headers: { authorization: `Bearer ${contents.token}` },
    });
    expect(health.status).toBe(200);
    expect(((await health.json()) as { vault: string }).vault).toBe(vault);
    expect((await fetch(`${running.url}/health`)).status).toBe(401);

    await running.stop();
    running = undefined;
    expect(existsSync(file)).toBe(false);
  });

  test('COUNSEL_OS_HOME redirects the codex homes and the provider registry', async () => {
    const { vault, pluginRoot, env } = fixture();
    const home = env.COUNSEL_OS_HOME!;
    // No `registryFile`: this is the whole point — the DEFAULT registry path
    // has to follow the override, not the developer's real home.
    writeFileSync(join(home, 'providers.yaml'), 'default: ollama/gemma4:e4b\n', 'utf8');

    running = await startServer({ vault, pluginRoot, port: 0, env });

    // Each thread's Codex home holds a copy of `auth.json`, so it must land
    // under the home the operator pointed at, not under the real `$HOME`.
    const threadId = '11111111-2222-4333-8444-555555555555';
    expect(running.store.codexHomeFor(threadId)).toBe(join(home, 'codex', threadId));

    const health = await fetch(`${running.url}/health`, {
      headers: { authorization: `Bearer ${running.token}` },
    });
    expect(health.status).toBe(200);
    expect(((await health.json()) as { default: string }).default).toBe('ollama/gemma4:e4b');
  });

  test('/health reports the step timeout: option beats providers.yaml beats the default', async () => {
    const stepTimeout = async (server: RunningServer): Promise<number> => {
      const res = await fetch(`${server.url}/health`, { headers: { authorization: `Bearer ${server.token}` } });
      expect(res.status).toBe(200);
      return ((await res.json()) as { stepTimeoutMs: number }).stepTimeoutMs;
    };

    const base = fixture();
    running = await startServer({ ...base, port: 0, registryFile: join(base.vault, 'none.yaml') });
    expect(await stepTimeout(running)).toBe(DEFAULT_STEP_TIMEOUT_MS);
    await running.stop();

    const configured = fixture();
    writeFileSync(join(configured.env.COUNSEL_OS_HOME!, 'providers.yaml'), 'stepTimeoutMs: 120000\n', 'utf8');
    running = await startServer({ ...configured, port: 0 });
    expect(await stepTimeout(running)).toBe(120_000);
    await running.stop();

    // The same file, plus an explicit option: the option wins.
    running = await startServer({ ...configured, port: 0, stepTimeoutMs: 30_000 });
    expect(await stepTimeout(running)).toBe(30_000);
  });

  test('a busy default port falls through to an OS-assigned one', async () => {
    const a = fixture();
    const b = fixture();
    // No explicit port: the first takes DEFAULT_PORT (unless something else
    // already holds it, in which case both fall through), the second must
    // land somewhere else rather than failing to start.
    const first = await startServer({ vault: a.vault, pluginRoot: a.pluginRoot, env: a.env, registryFile: join(a.vault, 'none.yaml') });
    const second = await startServer({ vault: b.vault, pluginRoot: b.pluginRoot, env: b.env, registryFile: join(b.vault, 'none.yaml') });
    try {
      expect(second.port).not.toBe(first.port);
      const health = await fetch(`${second.url}/health`, { headers: { authorization: `Bearer ${second.token}` } });
      expect(health.status).toBe(200);
    } finally {
      await first.stop();
      await second.stop();
    }
  });

  test('a runtime.json another process now owns survives stop()', async () => {
    const { vault, pluginRoot, env } = fixture();
    running = await startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml') });
    const file = runtimeFilePath(env);

    // A second `serve` took over the handshake: the file now points at that
    // server. This one shutting down must not delete the live server's file
    // and leave the adapter with nothing to read.
    const theirs = { port: 9999, token: 'theirs', vault, pid: process.pid + 1, startedAt: new Date().toISOString() };
    writeFileSync(file, JSON.stringify(theirs), 'utf8');

    await running.stop();
    running = undefined;
    expect(existsSync(file)).toBe(true);
    expect((JSON.parse(readFileSync(file, 'utf8')) as RuntimeFile).token).toBe('theirs');
  });

  test('a leftover world-readable runtime.json ends up 0600', async () => {
    const { vault, pluginRoot, env } = fixture();
    const file = runtimeFilePath(env);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, '{"stale":true}', 'utf8');
    chmodSync(file, 0o644);

    running = await startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml') });

    // writeFileSync's mode applies only on create, so an overwrite in place
    // would have kept 0644 and published the token to every local account.
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect((JSON.parse(readFileSync(file, 'utf8')) as RuntimeFile).token).toBe(running.token);
  });

  test('a fresh token per process', async () => {
    const a = fixture();
    const b = fixture();
    const first = await startServer({ vault: a.vault, pluginRoot: a.pluginRoot, port: 0, env: a.env, registryFile: join(a.vault, 'none.yaml') });
    const second = await startServer({ vault: b.vault, pluginRoot: b.pluginRoot, port: 0, env: b.env, registryFile: join(b.vault, 'none.yaml') });
    try {
      expect(first.token).not.toBe(second.token);
      expect(first.port).not.toBe(second.port);
      // One server's token is no good at the other.
      const crossed = await fetch(`${second.url}/health`, { headers: { authorization: `Bearer ${first.token}` } });
      expect(crossed.status).toBe(401);
    } finally {
      await first.stop();
      await second.stop();
    }
  });
});

describe('serve --fake', () => {
  test('registers fake/fake and makes it the default', async () => {
    const { vault, pluginRoot, env } = fixture();
    running = await startServer({
      vault,
      pluginRoot,
      port: 0,
      env,
      registryFile: join(vault, 'none.yaml'),
      fake: [{ text: 'This is the fake provider.' }],
    });

    const res = await fetch(`${running.url}/health`, { headers: { authorization: `Bearer ${running.token}` } });
    const health = (await res.json()) as { default: string; providers: Array<{ id: string }> };
    expect(health.default).toBe('fake/fake');
    expect(health.providers.map(p => p.id)).toContain('fake/fake');
  });

  test('the fake answers a step, so no model is ever called', async () => {
    const { vault, pluginRoot, env } = fixture();
    running = await startServer({
      vault,
      pluginRoot,
      port: 0,
      env,
      registryFile: join(vault, 'none.yaml'),
      fake: [{ text: 'This is the fake provider.' }],
    });
    const auth = { authorization: `Bearer ${running.token}` };

    const created = await fetch(`${running.url}/threads`, { method: 'POST', headers: auth });
    const { id } = (await created.json()) as { id: string };
    const step = await fetch(`${running.url}/threads/${id}/steps`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    expect(step.status).toBe(200);
    expect(await step.text()).toContain('This is the fake provider.');
  });
});

describe('the printed line', () => {
  test('is the token URL, exactly once, and nothing else prints the token', async () => {
    const { vault, pluginRoot, env } = fixture();
    const logged: string[] = [];
    const log = spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    try {
      running = await startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml') });
    } finally {
      log.mockRestore();
    }

    expect(logged).toEqual([
      `counsel-os runtime on http://127.0.0.1:${running.port}/#token=${running.token} (vault: ${vault})`,
    ]);
    expect(logged[0]).toContain('#token=');
    expect(running.tokenUrl).toBe(`http://127.0.0.1:${running.port}/#token=${running.token}`);
  });
});

describe('serving the UI', () => {
  test('the shell loads with no token while /health still needs one', async () => {
    const { vault, pluginRoot, env } = fixture();
    const dist = mkdtempSync(join(tmpdir(), 'serve-dist-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>counsel-os</title>\n', 'utf8');
    running = await startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml'), distDir: dist });

    const page = await fetch(`${running.url}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('counsel-os');
    expect((await fetch(`${running.url}/health`)).status).toBe(401);
  });

  test('an unbuilt UI serves the placeholder rather than failing', async () => {
    const { vault, pluginRoot, env } = fixture();
    running = await startServer({
      vault,
      pluginRoot,
      port: 0,
      env,
      registryFile: join(vault, 'none.yaml'),
      distDir: join(tmpdir(), 'serve-no-such-dist'),
    });
    const page = await fetch(`${running.url}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('bun run ui:build');
  });
});

describe('--open', () => {
  test('uses the platform opener, and never one on Windows', () => {
    expect(browserCommand('darwin')).toBe('open');
    expect(browserCommand('linux')).toBe('xdg-open');
    expect(browserCommand('win32')).toBeNull();
    expect(browserCommand('freebsd' as NodeJS.Platform)).toBeNull();
  });

  test('spawns the opener detached, and does not spawn at all on Windows', () => {
    const calls: Array<{ cmd: string[]; opts: Record<string, unknown> }> = [];
    let unrefs = 0;
    const spawn = (cmd: string[], opts: Record<string, unknown>) => {
      calls.push({ cmd, opts });
      return { unref: () => { unrefs += 1; } };
    };

    expect(openUrl('http://127.0.0.1:7431/#token=abc', { platform: 'darwin', spawn })).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.cmd).toEqual(['open', 'http://127.0.0.1:7431/#token=abc']);
    // Nothing of the child's is inherited: the token is in argv, and a child
    // writing to this process's stdout would print it a second time.
    expect(calls[0]!.opts.stdio).toEqual(['ignore', 'ignore', 'ignore']);
    expect(unrefs).toBe(1);

    expect(openUrl('http://127.0.0.1:7431/#token=abc', { platform: 'win32', spawn })).toBe(false);
    expect(calls).toHaveLength(1);
  });

  test('a failing opener does not take the server down', () => {
    const spawn = (): never => {
      throw new Error('no such file or directory: open');
    };
    expect(openUrl('http://127.0.0.1:7431/', { platform: 'darwin', spawn })).toBe(false);
  });
});

describe('the --dist guard', () => {
  test('refuses a dist directory that is the vault, or inside it, or contains it', async () => {
    const { vault, pluginRoot, env } = fixture();
    mkdirSync(join(vault, 'sub'), { recursive: true });
    const opts = { vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml') };

    // Everything under `distDir` is served with NO token. Pointing it at the
    // vault would publish the practice's files to anything that can reach
    // the port.
    for (const distDir of [vault, join(vault, 'sub')]) {
      await expect(startServer({ ...opts, distDir })).rejects.toThrow(/--dist|dist directory/i);
    }
    // And the other direction: a dist that CONTAINS the vault serves it too.
    const parent = mkdtempSync(join(tmpdir(), 'serve-parent-'));
    const nested = join(parent, 'vault');
    mkdirSync(nested, { recursive: true });
    await expect(startServer({ ...opts, vault: nested, distDir: parent })).rejects.toThrow(/--dist|dist directory/i);
  });

  test('accepts a dist directory unrelated to the vault', async () => {
    const { vault, pluginRoot, env } = fixture();
    const dist = mkdtempSync(join(tmpdir(), 'serve-dist-ok-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>counsel-os</title>\n', 'utf8');
    running = await startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml'), distDir: dist });
    expect((await fetch(`${running.url}/`)).status).toBe(200);
  });

  test('the guard follows symlinks, so a link into the vault is refused too', async () => {
    const { vault, pluginRoot, env } = fixture();
    const link = join(mkdtempSync(join(tmpdir(), 'serve-link-')), 'dist');
    symlinkSync(vault, link);
    await expect(
      startServer({ vault, pluginRoot, port: 0, env, registryFile: join(vault, 'none.yaml'), distDir: link }),
    ).rejects.toThrow(/--dist|dist directory/i);
  });
});
